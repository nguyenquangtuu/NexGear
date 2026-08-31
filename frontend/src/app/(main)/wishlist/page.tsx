'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Heart, Loader2, ShoppingBag } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useWishlist } from '@/contexts/WishlistContext';
import { apiFetch } from '@/lib/api';
import { resolveProductImageUrl } from '@/lib/media';

type WishlistProduct = {
  id?: string | number;
  _id?: string | number;
  slug?: string;
  name: string;
  thumbnail?: string | null;
  images?: string[] | null;
  category?: { name?: string | null } | null;
  variants?: Array<{ price?: string | number }>;
  rating?: number | null;
  users?: string | null;
  showRating?: boolean | null;
  showSoldCount?: boolean | null;
  show_rating?: boolean | number | null;
  show_sold_count?: boolean | number | null;
};

const getMinPrice = (variants?: WishlistProduct['variants']) => {
  if (!Array.isArray(variants) || variants.length === 0) return 0;
  return variants.reduce((min, variant) => {
    const rawPrice = variant.price ?? 0;
    const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : rawPrice;
    return Number.isFinite(price) && price < min ? price : min;
  }, Number(variants[0].price || 0));
};

const resolveVisibilityFlag = (value: boolean | number | null | undefined, fallback: boolean) => {
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 0;
};

export default function WishlistPage() {
  const { wishlist } = useWishlist();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (wishlist.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchWishlistProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          wishlist.map(async (id) => {
            try {
              const cleanId = String(id).trim();
              if (!cleanId) return null;
              const response = await apiFetch(`/products/${cleanId}`);
              const productData = response?.data || response;
              return productData && (productData.id || productData._id) ? (productData as WishlistProduct) : null;
            } catch {
              return null;
            }
          })
        );

        if (isMounted) setProducts(results.filter(Boolean) as WishlistProduct[]);
      } catch {
        if (isMounted) setError('Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWishlistProducts();

    return () => {
      isMounted = false;
    };
  }, [wishlist]);

  const isEmpty = !loading && products.length === 0;

  return (
    <main className="bg-background pb-20 lg:pb-14">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Sản phẩm yêu thích</span>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-3 md:p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0 border border-pink-500/10">
                <Heart className="h-5 w-5 text-pink-500 fill-pink-500/20" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-tight">Sản phẩm yêu thích</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {wishlist.length > 0
                    ? `Bạn đang có ${wishlist.length} sản phẩm trong danh sách`
                    : 'Lưu trữ những sản phẩm bạn quan tâm để mua sau'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4">
        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-60" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <h3 className="text-sm font-bold text-foreground">{error}</h3>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Thử lại
            </button>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {products.map((product) => {
              const productId = product.id || product._id;
              return (
                <ProductCard
                  key={String(productId)}
                  id={String(productId)}
                  slug={product.slug || String(productId)}
                  title={product.name}
                  category={product.category?.name || 'Sản phẩm'}
                  price={getMinPrice(product.variants)}
                  rating={product.rating ?? null}
                  reviewCount={0}
                  soldCount={product.users != null ? Number(String(product.users).replace(/[^\d]/g, '')) : null}
                  showRating={resolveVisibilityFlag(product.showRating ?? product.show_rating, product.rating != null)}
                  showSoldCount={resolveVisibilityFlag(product.showSoldCount ?? product.show_sold_count, product.users != null)}
                  imageUrl={resolveProductImageUrl(product.thumbnail, product.images)}
                />
              );
            })}
          </div>
        ) : (
          isEmpty && (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 px-4 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Danh sách còn trống</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-muted-foreground">
                Bạn chưa có sản phẩm yêu thích nào. Hãy khám phá và lưu lại những sản phẩm bạn quan tâm.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <ShoppingBag className="h-4 w-4" /> Khám phá sản phẩm
              </Link>
            </div>
          )
        )}
      </div>
    </main>
  );
}
