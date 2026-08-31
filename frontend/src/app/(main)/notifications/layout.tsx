import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Thông báo',
    description: 'Xem các thông báo mới nhất về tài khoản, đơn hàng và dịch vụ của bạn trên VEXTRO.',
    path: '/notifications',
    noIndex: true,
  });
}

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
