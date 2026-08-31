import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Blog & Hướng dẫn',
    description: 'Cập nhật những thông tin mới nhất, hướng dẫn sử dụng và mẹo bảo mật tài khoản từ VEXTRO.',
    path: '/blog',
    keywords: ['blog VEXTRO', 'hướng dẫn VEXTRO', 'mẹo bảo mật tài khoản'],
  });
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
