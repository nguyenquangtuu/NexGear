import { buildPageMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Tất cả sản phẩm',
    description: 'Khám phá laptop, điện thoại và thiết bị điện tử chính hãng với giá tốt tại VEXTRO.',
    path: '/products',
    keywords: ['laptop', 'điện thoại', 'thiết bị điện tử', 'chính hãng'],
  });
}

export default function ProductsLayout({ 
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
