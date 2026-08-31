'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
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
  thumbnail?: string | null;
  images?: string[] | null;
  rating?: number | null;
  review_count?: number | null;
  sold_count?: number | null;
  users?: string | null;
  showRating?: boolean;
  showSoldCount?: boolean;
  show_rating?: boolean | number | null;
  show_sold_count?: boolean | number | null;
  category?: {
    name?: string | null;
    slug?: string | null;
    parentName?: string | null;
    parentSlug?: string | null;
  } | null;
  variants?: Variant[];
};

function getImageUrl(thumbnail?: string | null, images?: string[] | null) {
  return resolveProductImageUrl(thumbnail, images);
}

function getMinPrice(variants?: Variant[]) {
  if (!Array.isArray(variants) || variants.length === 0) return 0;
  return variants.reduce((min, v) => (v.price < min ? v.price : min), variants[0].price);
}

function parseSoldCount(users?: string | null, soldCount?: number | null) {
  if (typeof soldCount === 'number' && Number.isFinite(soldCount)) return soldCount;
  if (!users) return 0;
  const n = Number(String(users).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function resolveVisibilityFlag(value: boolean | number | null | undefined, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 0;
}

export default function PersonalizedNewArrivals({
  currentProductId,
  currentCategorySlug,
  currentParentCategorySlug,
}: {
  currentProductId?: string | null;
  currentCategorySlug?: string | null;
  currentParentCategorySlug?: string | null;
}) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      try {
        const merged: ProductItem[] = [];
        const seenIds = new Set<string>();

        const appendProducts = (items: ProductItem[]) => {
          items.forEach((item) => {
            const id = String(item.id);
            if (seenIds.has(id)) return;
            if (currentProductId && id === String(currentProductId)) return;
            seenIds.add(id);
            merged.push(item);
          });
        };

        if (currentCategorySlug) {
          const response = await apiFetch(`/products?page=1&limit=12&category=${encodeURIComponent(currentCategorySlug)}`);
          appendProducts(Array.isArray(response.data) ? response.data : []);
        }

        if (currentParentCategorySlug && merged.length < 10) {
          const response = await apiFetch(`/products?page=1&limit=12&category=${encodeURIComponent(currentParentCategorySlug)}`);
          appendProducts(Array.isArray(response.data) ? response.data : []);
        }

        if (merged.length < 10) {
          const response = await apiFetch('/products?page=1&limit=20');
          appendProducts(Array.isArray(response.data) ? response.data : []);
        }

        if (!active) return;
        setProducts(merged.slice(0, 10));
      } catch {
        if (!active) return;
        setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [currentProductId, currentCategorySlug, currentParentCategorySlug]);

  const visibleProducts = useMemo(() => products.slice(0, 10), [products]);

  if (!loading && visibleProducts.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Sản phẩm khác</h2>
          <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
            Các sản phẩm liên quan trong cùng danh mục, hiển thị theo kiểu danh sách ở trang chủ.
          </p>
        </div>
        <Link
          href="/products"
          className="group hidden shrink-0 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary sm:inline-flex"
        >
          Xem tất cả
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {loading &&
          Array.from({ length: 5 }).map((_, index) => (
            <div key={`related-loading-${index}`} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[4/3] animate-pulse bg-muted" />
              <div className="space-y-2 p-3">
                <div className="h-3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}

        {!loading &&
          visibleProducts.map((item) => (
            <ProductCard
              key={item.id}
              id={String(item.id)}
              slug={item.slug}
              title={item.name}
              category={item.category?.name || 'Sản phẩm'}
              price={getMinPrice(item.variants)}
              rating={item.rating ?? null}
              reviewCount={Number(item.review_count || 0)}
              soldCount={item.users != null ? parseSoldCount(item.users, item.sold_count) : null}
              showRating={resolveVisibilityFlag(item.showRating ?? item.show_rating, item.rating != null)}
              showSoldCount={resolveVisibilityFlag(item.showSoldCount ?? item.show_sold_count, item.users != null)}
              imageUrl={getImageUrl(item.thumbnail, item.images)}
            />
          ))}
      </div>
    </section>
  );
}
