'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Star } from 'lucide-react';

import { useWishlist } from '@/contexts/WishlistContext';

interface ProductCardProps {
  id: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  rating?: number | null;
  reviewCount?: number;
  soldCount?: number | null;
  showRating?: boolean;
  showSoldCount?: boolean;
  imageUrl: string;
  discount?: number;
  compact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  category,
  price,
  rating,
  soldCount,
  showRating,
  showSoldCount,
  imageUrl,
  discount,
  slug,
  compact = false,
}) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isFavorite = isInWishlist(id);
  const canShowRating = showRating ?? rating != null;
  const canShowSoldCount = showSoldCount ?? soldCount != null;

  return (
    <Link
      href={`/products/${encodeURIComponent(slug)}`}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 ${
        compact ? 'origin-top scale-[0.96]' : ''
      }`}
    >
      <div className={`product-card-media relative overflow-hidden ${compact ? 'aspect-[1.08/1]' : 'aspect-[4/3]'}`}>
        <img
          src={imageUrl}
          alt={title}
          className="product-card-media__image h-full w-full transition-transform duration-500 group-hover:scale-[1.05]"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/file.svg';
          }}
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(id);
          }}
          className={`absolute right-3 top-3 rounded-full border p-2 backdrop-blur-md transition-all ${
            isFavorite
              ? 'border-pink-500/50 bg-pink-500/10 text-pink-500 opacity-100 shadow-sm shadow-pink-500/20'
              : 'border-white/10 bg-background/50 text-foreground opacity-0 hover:border-pink-500/50 hover:bg-pink-500/20 hover:text-pink-500 group-hover:opacity-100'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-pink-500' : ''}`} />
        </button>

        <div className={`absolute ${compact ? 'bottom-2 left-2' : 'bottom-3 left-3'}`}>
          <span
            className={`type-eyebrow rounded-lg bg-primary/90 text-white backdrop-blur-sm ${
              compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
            }`}
          >
            {category}
          </span>
        </div>

        {discount ? (
          <div className="type-button-sm absolute left-3 top-3 rounded-lg bg-red-500 px-2 py-1 text-white shadow-lg">
            -{discount}%
          </div>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-1.5 p-2.5' : 'gap-2 p-3'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-yellow-500">
            {rating != null && canShowRating ? (
              <>
                <Star className="h-3 w-3 fill-current" />
                <span className="type-label-sm text-foreground">{Number(rating).toFixed(1)}</span>
              </>
            ) : null}
            {soldCount != null && canShowSoldCount ? (
              <span
                className={`text-[10px] font-medium leading-4 text-muted-foreground ${
                  rating != null && canShowRating ? 'ml-1 border-l border-border pl-1' : ''
                }`}
              >
                Đã bán {soldCount}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-end">
            {discount ? (
              <span className="text-[10px] font-medium leading-4 text-muted-foreground line-through">
                {(price / (1 - discount / 100)).toLocaleString('vi-VN')}đ
              </span>
            ) : null}
            <span className={`${compact ? 'text-sm' : 'type-price'} font-bold text-primary`}>
              {price.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        <h3
          className={`line-clamp-2 font-semibold leading-5 text-foreground transition-colors group-hover:text-primary ${
            compact ? 'h-[40px] text-xs' : 'h-[40px] text-sm'
          }`}
        >
          {title}
        </h3>

        <div className="mt-auto flex items-center gap-1.5">
          <button
            className={`type-button-sm flex-1 rounded-lg bg-primary text-white shadow-md shadow-primary/10 transition-all hover:opacity-90 active:scale-95 ${
              compact ? 'py-1.5' : 'py-2'
            }`}
          >
            Mua ngay
          </button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
