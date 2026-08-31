import type { Metadata } from 'next';
import Hero from "@/components/Hero";
import HomePersonalizedList from "@/components/HomePersonalizedList";

export const metadata: Metadata = {
  title: 'Trang chủ',
  description: 'Khám phá laptop, điện thoại và thiết bị điện tử chính hãng với giá tốt tại VEXTRO.',
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <HomePersonalizedList />
    </main>
  );
}
