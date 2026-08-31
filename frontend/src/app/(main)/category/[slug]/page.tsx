'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProductList from '@/components/ProductList';

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <main className="flex-1 pt-8">
      <ProductList categorySlug={slug} />
    </main>
  );
}
