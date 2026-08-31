'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { getHistory, subscribeHistory } from '@/lib/history';
import { resolveMediaUrl } from '@/lib/media';

const EMPTY_HISTORY: ReturnType<typeof getHistory> = [];
const getServerSnapshot = () => EMPTY_HISTORY;

function getImageUrl(thumbnail?: string | null) {
  return resolveMediaUrl(thumbnail);
}

const RecentlyViewed = () => {
  const history = useSyncExternalStore(subscribeHistory, getHistory, getServerSnapshot);

  if (history.length === 0) return null;

  return (
    <div className="mt-6 bg-background py-10 pb-16 md:pb-12">
      <div className="mx-auto max-w-6xl border-t border-border px-4 pt-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Sản phẩm vừa xem</h2>
            <p className="text-xs font-medium text-muted-foreground">Lịch sử xem gần đây của bạn</p>
          </div>
          <Link
            href="/products"
            className="group hidden items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary sm:flex"
          >
            Xem tất cả
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {history.slice(0, 10).map((item) => (
            <ProductCard
              key={item.id}
              id={String(item.id)}
              slug={item.slug}
              title={item.name}
              category="Sản phẩm"
              price={Number(item.price || 0)}
              rating={0}
              reviewCount={0}
              soldCount={0}
              showRating={false}
              showSoldCount={false}
              imageUrl={getImageUrl(item.thumbnail)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentlyViewed;
