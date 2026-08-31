'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProductCard from './ProductCard';
import { ChevronLeft, ChevronRight, Loader2, TriangleAlert, RefreshCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { resolveProductImageUrl } from '@/lib/media';

type BackendVariant = {
  id: string;
  name: string;
  price: number;
  stockCount: number;
};

type BackendProduct = {
  id: string;
  slug: string;
  name: string;
  category?: {
    id: number;
    name: string;
    slug: string;
    parentId?: number | null;
    parentName?: string | null;
    parentSlug?: string | null;
    description?: string | null;
    parentDescription?: string | null;
  } | null;
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
  badge?: string | null;
  variants?: BackendVariant[];
};

type CategoryMeta = {
  name: string;
  slug: string;
  description?: string | null;
  subCategories?: CategoryMeta[] | null;
};

function resolveVisibilityFlag(value: boolean | number | null | undefined, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 0;
}

function getImageUrl(thumbnail?: string | null, images?: string[] | null) {
  return resolveProductImageUrl(thumbnail, images);
}

function getMinPrice(variants?: BackendVariant[]) {
  if (!variants || variants.length === 0) return 0;
  return variants.reduce((min, variant) => (variant.price < min ? variant.price : min), variants[0].price);
}

function slugToTitle(slug?: string) {
  if (!slug) return 'Tất cả sản phẩm';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function findCategoryBySlug(items: CategoryMeta[], slug?: string): CategoryMeta | null {
  if (!slug) return null;

  for (const item of items) {
    if (item.slug === slug) return item;
    const childMatch = findCategoryBySlug(item.subCategories || [], slug);
    if (childMatch) return childMatch;
  }

  return null;
}

const ProductList = ({
  categorySlug,
  searchQuery,
  onServiceUnavailableChange,
}: {
  categorySlug?: string;
  searchQuery?: string;
  onServiceUnavailableChange?: (value: boolean) => void;
}) => {
  const router = useRouter();
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [canScrollFeaturedLeft, setCanScrollFeaturedLeft] = useState(false);
  const [canScrollFeaturedRight, setCanScrollFeaturedRight] = useState(false);
  const loadingRef = useRef(false);
  const serviceUnavailableRef = useRef(false);
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const featuredTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    serviceUnavailableRef.current = serviceUnavailable;
  }, [serviceUnavailable]);

  useEffect(() => {
    onServiceUnavailableChange?.(serviceUnavailable);
  }, [onServiceUnavailableChange, serviceUnavailable]);

  const updateFeaturedControls = useCallback(() => {
    const node = featuredTrackRef.current;
    if (!node) {
      setCanScrollFeaturedLeft(false);
      setCanScrollFeaturedRight(false);
      return;
    }

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollFeaturedLeft(node.scrollLeft > 8);
    setCanScrollFeaturedRight(maxScrollLeft - node.scrollLeft > 8);
  }, []);

  const [randomSeed] = useState(() => Math.floor(Math.random() * 1000000));

  const fetchProducts = useCallback(
    async (pageNum: number) => {
      if (loadingRef.current || serviceUnavailableRef.current) return;
      setLoading(true);
      setError('');
      try {
        let url = `/products?page=${pageNum}&limit=20&seed=${randomSeed}`;
        if (categorySlug) {
          url += `&category=${encodeURIComponent(categorySlug)}`;
        }
        if (searchQuery) {
          url += `&q=${encodeURIComponent(searchQuery)}`;
        }

        const resp = await apiFetch<{ data: BackendProduct[] }>(url);
        const newProducts = resp.data || [];

        setProducts((prev) => {
          const existingIds = new Set(prev.map((product) => product.id));
          const filtered = newProducts.filter((product: BackendProduct) => !existingIds.has(product.id));
          return pageNum === 1 ? newProducts : [...prev, ...filtered];
        });

        setHasMore(newProducts.length >= 20);
      } catch (err: any) {
        const status = err?.status ?? 0;
        const isBackendDown = status === 0 || status >= 500 || err?.code === 'NETWORK_ERROR';

        if (isBackendDown) {
          setServiceUnavailable(true);
          setHasMore(false);
          setError('');
          return;
        }

        setError(err.message || 'Không thể tải sản phẩm');
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    },
    [categorySlug, searchQuery, randomSeed]
  );

  useEffect(() => {
    setProducts([]);
    setCategoryMeta(null);
    setPage(1);
    setHasMore(true);
    setServiceUnavailable(false);
    setInitializing(true);
    fetchProducts(1);
  }, [categorySlug, searchQuery, fetchProducts]);

  useEffect(() => {
    if (!categorySlug || searchQuery) {
      setCategoryMeta(null);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        const response = await apiFetch<{ data?: CategoryMeta[] }>('/categories');
        if (!isMounted) return;
        setCategoryMeta(findCategoryBySlug(response.data || [], categorySlug));
      } catch {
        if (isMounted) {
          setCategoryMeta(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [categorySlug, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchProducts(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, fetchProducts]);

  const featured = useMemo(() => products.slice(0, 5), [products]);

  useEffect(() => {
    updateFeaturedControls();
    const node = featuredTrackRef.current;
    if (!node) return;

    const handleScroll = () => updateFeaturedControls();
    node.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      node.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [featured, updateFeaturedControls]);

  const scrollFeatured = useCallback((direction: 'prev' | 'next') => {
    const node = featuredTrackRef.current;
    if (!node) return;

    const amount = Math.max(node.clientWidth * 0.8, 280);
    node.scrollBy({
      left: direction === 'next' ? amount : -amount,
      behavior: 'smooth',
    });
  }, []);

  const listTitle = useMemo(() => {
    if (searchQuery) return `Kết quả cho "${searchQuery}"`;
    if (categoryMeta?.name) return categoryMeta.name;
    if (categorySlug && products.length > 0) {
      const product = products[0];
      if (product.category?.slug === categorySlug) return product.category.name;
      if (product.category?.parentSlug === categorySlug) return product.category.parentName;
      return slugToTitle(categorySlug);
    }
    if (categorySlug) return slugToTitle(categorySlug);
    return 'Tất cả sản phẩm';
  }, [categoryMeta?.name, categorySlug, searchQuery, products]);

  const categoryDescription = useMemo(() => {
    if (searchQuery) return `Tìm thấy ${products.length} sản phẩm phù hợp`;
    if (categoryMeta?.description) return categoryMeta.description;
    if (categorySlug && products.length > 0) {
      const product = products[0];
      if (product.category?.slug === categorySlug && product.category.description) return product.category.description;
      if (product.category?.parentSlug === categorySlug && product.category.parentDescription) return product.category.parentDescription;
    }
    return 'Khám phá các thiết bị công nghệ phù hợp với bạn';
  }, [categoryMeta?.description, categorySlug, searchQuery, products]);

  if (serviceUnavailable) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-2xl rounded-3xl border border-border bg-card/80 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur md:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <TriangleAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">Tạm bảo trì hệ thống</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
            Chúng tôi đang gặp sự cố kết nối đến máy chủ hoặc đang bảo trì. Vui lòng thử lại sau vài phút.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => {
                setServiceUnavailable(false);
                setInitializing(true);
                fetchProducts(1);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <RefreshCcw className="h-4 w-4" />
              Thử lại
            </button>
            <button
              onClick={() => router.push('/contact')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Liên hệ hỗ trợ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background pb-8 md:pb-10">
      <div className="mx-auto max-w-6xl px-4">
        {false && !categorySlug && products.length > 0 && (
          <section className="mb-14">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-primary text-xs font-bold uppercase tracking-[0.1em]">Gợi ý hôm nay</span>
                <h2 className="text-3xl font-bold text-foreground md:text-4xl">Dành riêng cho bạn</h2>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <button
                  type="button"
                  onClick={() => scrollFeatured('prev')}
                  disabled={!canScrollFeaturedLeft}
                  className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#1d2947] bg-[#071126] text-slate-200 transition-all hover:border-[#31466f] hover:bg-[#0a1730] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Xem sản phẩm trước"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollFeatured('next')}
                  disabled={!canScrollFeaturedRight}
                  className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[#1d2947] bg-[#071126] text-slate-200 transition-all hover:border-[#31466f] hover:bg-[#0a1730] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Xem thêm sản phẩm"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div
              ref={featuredTrackRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((product) => (
                <div
                  key={`featured-${product.id}`}
                  className="min-w-[62%] snap-start sm:min-w-[260px] lg:min-w-[calc((100%-32px)/3)] xl:min-w-[calc((100%-48px)/4)]"
                >
                  <ProductCard
                    id={product.id}
                    slug={product.slug}
                    title={product.name}
                    category={product.category?.name || 'Sản phẩm'}
                    price={getMinPrice(product.variants)}
                    rating={product.rating ?? null}
                    reviewCount={Number(product.review_count || 0)}
                    soldCount={product.users != null ? Number(product.users) : null}
                    showRating={resolveVisibilityFlag(product.showRating ?? product.show_rating, product.rating != null)}
                    showSoldCount={resolveVisibilityFlag(product.showSoldCount ?? product.show_sold_count, product.users != null)}
                    imageUrl={getImageUrl(product.thumbnail, product.images)}
                    compact
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className={`mb-8 ${categorySlug ? 'border-t border-border pt-12' : ''}`}>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">{listTitle}</h2>
              <p className="text-xs font-medium text-muted-foreground">{categoryDescription}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {error && (
              <div className="col-span-full rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                title={product.name}
                category={product.category?.name || 'Sản phẩm'}
                price={getMinPrice(product.variants)}
                rating={product.rating ?? null}
                reviewCount={Number(product.review_count || 0)}
                soldCount={product.users != null ? Number(product.users) : null}
                showRating={resolveVisibilityFlag(product.showRating ?? product.show_rating, product.rating != null)}
                showSoldCount={resolveVisibilityFlag(product.showSoldCount ?? product.show_sold_count, product.users != null)}
                imageUrl={getImageUrl(product.thumbnail, product.images)}
              />
            ))}

            {loading &&
              products.length > 0 &&
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`skeleton-more-${index}`}
                  className="overflow-hidden rounded-2xl border border-border bg-card animate-pulse"
                >
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="space-y-2 p-3">
                    <div className="h-3 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
          </div>

          <div ref={observerTarget} className="mt-4 flex h-12 items-center justify-center">
            {loading && products.length > 0 && <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />}
            {initializing && products.length === 0 && !serviceUnavailable && (
              <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductList;
