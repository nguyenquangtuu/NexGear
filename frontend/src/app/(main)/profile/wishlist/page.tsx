'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useRouter } from 'next/navigation';
import {
  Heart,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { resolveProductImageUrl } from '@/lib/media';

const getMinPrice = (variants?: any[]) => {
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

const WishlistPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { wishlist } = useWishlist();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWishlistItems();
    }
  }, [user, wishlist]);

  const fetchWishlistItems = async () => {
    if (wishlist.length === 0) {
      setWishlistItems([]);
      return;
    }
    setWishlistLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch(`/products/by-ids?ids=${wishlist.join(',')}`);
      if (res.success) {
        setWishlistItems(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch wishlist items', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="px-4 md:px-0 space-y-6 animate-fade-in pb-10">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 py-3 bg-card border-b border-border sticky top-0 z-10 -mx-4 px-4">
        <button
          onClick={() => router.push('/profile')}
          className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-black">Sản phẩm yêu thích</h2>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm mt-4 md:mt-0">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black">Sản phẩm yêu thích</h3>
            <p className="mt-1 text-xs text-muted-foreground">Quản lý nhanh các sản phẩm bạn đã lưu để mua sau.</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center border border-pink-500/10">
            <Heart className="h-5 w-5 text-pink-500 fill-pink-500/20" />
          </div>
        </div>

        {wishlistLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-[4/5] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-secondary/30 p-6 rounded-full">
              <Heart className="h-10 w-10 text-muted-foreground opacity-20" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">Chưa có sản phẩm yêu thích</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Hãy nhấn ❤️ vào sản phẩm bạn quan tâm!</p>
            </div>
            <Link href="/" className="px-8 py-2.5 bg-primary text-white text-xs font-black rounded-xl shadow-lg shadow-primary/20">
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {wishlistItems.map((product) => {
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
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
