'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductList from '@/components/ProductList';
import { Loader2 } from 'lucide-react';

const ProductsContent = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || undefined;

  return (
    <main className="min-h-screen pt-8">
      <div className="max-w-6xl mx-auto px-4 pb-8 border-b border-border/50 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          {query ? 'Kết quả tìm kiếm' : 'Tất cả sản phẩm'}
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">
          {query ? `Khám phá các sản phẩm phù hợp với từ khóa "${query}"` : 'Khám phá kho tàng sản phẩm số đa dạng'}
        </p>
      </div>
      <ProductList searchQuery={query} />
    </main>
  );
};

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
