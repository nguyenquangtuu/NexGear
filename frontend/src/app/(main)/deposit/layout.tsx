import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chuyển hướng',
  description: 'Trang này không còn được sử dụng.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DepositLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
