'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSyncExternalStore } from 'react';
import ProductCard from '@/components/ProductCard';
import { apiFetch } from '@/lib/api';
import { getHistory, HistoryItem, subscribeHistory } from '@/lib/history';
import { resolveProductImageUrl } from '@/lib/media';

type Variant = {
  id: string;
  name: string;
  price: number;
};

type ProductItem = {
  id: string;
  slug: string;
  name: string;
  category?: {
    name?: string | null;
    parentName?: string | null;
  } | null;
  thumbnail?: string | null;
  images?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  sold_count?: number | null;
  users?: string | null;
  showRating?: boolean | null;
  showSoldCount?: boolean | null;
  show_rating?: boolean | number | null;
  show_sold_count?: boolean | number | null;
  variants?: Variant[];
  created_at?: string;
  createdAt?: string;
};

type OrderItem = {
  product_name?: string | null;
};

type RankedProduct = ProductItem & {
  score: number;
  isPurchased: boolean;
};

const EMPTY_HISTORY: HistoryItem[] = [];
const getServerSnapshot = () => EMPTY_HISTORY;

function getImageUrl(thumbnail?: string | null, images?: string[] | null) {
  return resolveProductImageUrl(thumbnail, images);
}

function getMinPrice(variants?: Variant[]) {
  if (!Array.isArray(variants) || variants.length === 0) return 0;
  return variants.reduce((min, item) => (item.price < min ? item.price : min), variants[0].price);
}

function parseDate(value?: string) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function parseUserCount(users?: string | null, soldCount?: number | null) {
  if (typeof soldCount === 'number' && Number.isFinite(soldCount)) return soldCount;
  if (!users) return 0;
  const n = Number(String(users).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function resolveVisibilityFlag(value: boolean | number | null | undefined, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 0;
}

function normalizeRecency(createdTs: number, minCreatedTs: number, maxCreatedTs: number) {
  if (!createdTs) return 0.3;
  const range = Math.max(1, maxCreatedTs - minCreatedTs);
  const normalized = (createdTs - minCreatedTs) / range;
  return Math.max(0.2, Math.min(1, normalized));
}

export default function HomePersonalizedList() {
  const history = useSyncExternalStore(subscribeHistory, getHistory, getServerSnapshot);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [purchasedNames, setPurchasedNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [productsResp, ordersResp] = await Promise.allSettled([
          apiFetch('/products?page=1&limit=80'),
          apiFetch('/orders/my'),
        ]);

        if (!active) return;

        if (productsResp.status === 'fulfilled') {
          setProducts(Array.isArray(productsResp.value.data) ? productsResp.value.data : []);
        } else {
          setProducts([]);
        }

        if (ordersResp.status === 'fulfilled') {
          const orders = Array.isArray(ordersResp.value.data) ? (ordersResp.value.data as OrderItem[]) : [];
          const bought = new Set<string>();
          orders.forEach((order) => {
            if (!order.product_name) return;
            bought.add(normalizeText(order.product_name));
          });
          setPurchasedNames(bought);
        } else {
          setPurchasedNames(new Set());
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const recommended = useMemo(() => {
    if (products.length === 0) return [];

    const recentHistory = history.slice(0, 12);
    const historyIds = new Set(recentHistory.map((item) => String(item.id)));

    const tokenWeights = new Map<string, number>();
    recentHistory.forEach((item, index) => {
      const weight = Math.max(1, 12 - index);
      tokenize(item.name).forEach((token) => {
        tokenWeights.set(token, (tokenWeights.get(token) || 0) + weight);
      });
    });

    const createdTsList = products
      .map((item) => parseDate(item.created_at || item.createdAt))
      .filter((value) => value > 0);
    const maxCreatedTs = createdTsList.length > 0 ? Math.max(...createdTsList) : 0;
    const minCreatedTs = createdTsList.length > 0 ? Math.min(...createdTsList) : 0;

    const userCounts = products.map((item) => parseUserCount(item.users, item.sold_count));
    const maxUserCount = userCounts.length > 0 ? Math.max(...userCounts) : 0;

    const ranked: RankedProduct[] = products.map((item) => {
      const createdTs = parseDate(item.created_at || item.createdAt);
      const freshnessScore = normalizeRecency(createdTs, minCreatedTs, maxCreatedTs);

      const textBag = [item.name, item.category?.name || '', item.category?.parentName || ''].join(' ');
      const productTokens = tokenize(textBag);

      let interestRaw = 0;
      productTokens.forEach((token) => {
        interestRaw += tokenWeights.get(token) || 0;
      });
      const interestScore = Math.min(1, interestRaw / 30);

      const exactViewedBoost = historyIds.has(String(item.id)) ? 1 : 0;
      const popularityRaw = parseUserCount(item.users, item.sold_count);
      const popularityScore = maxUserCount > 0 ? Math.min(1, popularityRaw / maxUserCount) : 0;

      const isPurchased = purchasedNames.has(normalizeText(item.name));
      const purchaseAdjust = isPurchased ? -0.35 : 0.2;

      const scoreWithHistory =
        interestScore * 0.45 + exactViewedBoost * 0.2 + popularityScore * 0.2 + freshnessScore * 0.15 + purchaseAdjust;
      const scoreWithoutHistory = popularityScore * 0.7 + freshnessScore * 0.3 + purchaseAdjust;

      return {
        ...item,
        isPurchased,
        score: recentHistory.length > 0 ? scoreWithHistory : scoreWithoutHistory,
      };
    });

    ranked.sort((a, b) => b.score - a.score);

    const notPurchased = ranked.filter((item) => !item.isPurchased);
    const purchased = ranked.filter((item) => item.isPurchased);
    return [...notPurchased, ...purchased].slice(0, 10);
  }, [history, products, purchasedNames]);

  if (!loading && recommended.length === 0) return null;

  return (
    <section className="bg-background pb-16 pt-6">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={`personalized-loading-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}

          {!loading &&
            recommended.map((item) => (
              <ProductCard
                key={item.id}
                id={String(item.id)}
                slug={item.slug}
                title={item.name}
                category={item.category?.name || 'San pham'}
                price={getMinPrice(item.variants)}
                rating={item.rating ?? null}
                reviewCount={Number(item.review_count || 0)}
                soldCount={item.users != null ? parseUserCount(item.users, item.sold_count) : null}
                showRating={resolveVisibilityFlag(item.showRating ?? item.show_rating, item.rating != null)}
                showSoldCount={resolveVisibilityFlag(item.showSoldCount ?? item.show_sold_count, item.users != null)}
                imageUrl={getImageUrl(item.thumbnail, item.images)}
              />
            ))}
        </div>
      </div>
    </section>
  );
}
