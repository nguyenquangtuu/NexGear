import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sản phẩm yêu thích',
  description: 'Xem và quản lý danh sách sản phẩm yêu thích để mua nhanh hơn trên VEXTRO.',
  alternates: {
    canonical: '/wishlist',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
