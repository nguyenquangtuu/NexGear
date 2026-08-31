'use client';

import { useState } from 'react';
import Hero from '@/components/Hero';
import ProductList from '@/components/ProductList';

const HomeContent = () => {
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  return (
    <main className="flex-grow min-h-screen">
      <h1 className="sr-only">
        VEXTRO - Hệ thống bán lẻ laptop, điện thoại và thiết bị điện tử chính hãng
      </h1>
      {!serviceUnavailable ? <Hero /> : null}
      <ProductList onServiceUnavailableChange={setServiceUnavailable} />
    </main>
  );
};

export default HomeContent;
