import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

type ParamsInput = { slug?: string } | Promise<{ slug?: string }>;

type CategoryLayoutProps = {
  children: React.ReactNode;
  params?: ParamsInput;
};

function slugToTitle(slug?: string) {
  if (!slug) return 'Sản phẩm';

  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function resolveSlug(params?: ParamsInput) {
  if (!params) return '';
  const resolved = await Promise.resolve(params);
  return resolved?.slug || '';
}

export async function generateMetadata({ params }: CategoryLayoutProps): Promise<Metadata> {
  const slug = await resolveSlug(params);
  const categoryName = slugToTitle(slug);

  return buildPageMetadata({
    title: `Danh mục ${categoryName}`,
    description: `Khám phá các sản phẩm số trong danh mục ${categoryName} tại VEXTRO với mức giá cạnh tranh và hỗ trợ nhanh chóng.`,
    path: slug ? `/category/${slug}` : '/category',
    keywords: [categoryName, `${categoryName} VEXTRO`, `mua ${categoryName}`],
  });
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
