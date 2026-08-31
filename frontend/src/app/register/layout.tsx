import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản NEXGEAR để mua laptop, lưu yêu thích và theo dõi đơn hàng tiện lợi.',
  alternates: {
    canonical: '/register',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
