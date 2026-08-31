'use client';

import ProductCard from '@/components/ProductCard';
import { Flame } from 'lucide-react';

type SampleProduct = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  imageUrl: string;
  soldCount: number;
};

const SAMPLE_GOLDEN_HOUR_PRODUCTS: SampleProduct[] = [
  {
    id: 'sample-golden-1',
    slug: 'mau-sieu-sale-gio-vang-1',
    title: 'MacBook Air M2 13 inch (Mau)',
    category: 'Laptop',
    price: 21990000,
    imageUrl: 'https://images.unsplash.com/photo-1517336714739-489689fd1ca8?q=80&w=1200&auto=format&fit=crop',
    soldCount: 34,
  },
  {
    id: 'sample-golden-2',
    slug: 'mau-sieu-sale-gio-vang-2',
    title: 'iPhone 15 128GB (Mau)',
    category: 'Dien thoai',
    price: 18990000,
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop',
    soldCount: 51,
  },
  {
    id: 'sample-golden-3',
    slug: 'mau-sieu-sale-gio-vang-3',
    title: 'iPad Air Wi-Fi 256GB (Mau)',
    category: 'May tinh bang',
    price: 16490000,
    imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=1200&auto=format&fit=crop',
    soldCount: 28,
  },
  {
    id: 'sample-golden-4',
    slug: 'mau-sieu-sale-gio-vang-4',
    title: 'Tai nghe Sony WH-1000XM5 (Mau)',
    category: 'Am thanh',
    price: 7990000,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop',
    soldCount: 87,
  },
  {
    id: 'sample-golden-5',
    slug: 'mau-sieu-sale-gio-vang-5',
    title: 'Man hinh LG UltraGear 27 inch (Mau)',
    category: 'Man hinh',
    price: 6290000,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=1200&auto=format&fit=crop',
    soldCount: 43,
  },
];

export default function GoldenHourSale() {
  return (
    <section className="bg-background pb-8 pt-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-500">
              <Flame className="h-3.5 w-3.5" />
              Sieu sale gio vang
            </div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">Deal mau cho thiet bi dien tu</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
              Dang hien thi du lieu mau theo nganh laptop, dien thoai va phu kien.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SAMPLE_GOLDEN_HOUR_PRODUCTS.map((item) => (
            <ProductCard
              key={item.id}
              id={item.id}
              slug={item.slug}
              title={item.title}
              category={item.category}
              price={item.price}
              rating={4.9}
              reviewCount={128}
              soldCount={item.soldCount}
              showRating
              showSoldCount
              imageUrl={item.imageUrl}
              discount={30}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
