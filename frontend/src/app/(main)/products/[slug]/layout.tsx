import type { Metadata } from 'next';
import {
  fetchProductMetadata,
  getFrontendUrl,
  getProductFallbackImage,
  resolveProductMediaUrl,
} from '@/lib/product-metadata';

type ParamsInput = { slug?: string } | Promise<{ slug?: string }>;

type ProductLayoutProps = {
  children: React.ReactNode;
  params?: ParamsInput;
};

function slugToTitle(slug?: string) {
  if (!slug) return 'Chi tiết sản phẩm';

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

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const slug = await resolveSlug(params);
  if (!slug) {
    return {
      title: 'Chi tiết sản phẩm',
      description: 'Xem chi tiết sản phẩm số tại VEXTRO với thông tin đầy đủ và mua hàng nhanh chóng.',
      alternates: {
        canonical: '/products',
      },
    };
  }

  const fallbackName = slugToTitle(slug);
  const frontendUrl = getFrontendUrl();

  try {
    const product = await fetchProductMetadata(slug);
    if (product) {
      const productName = product.seo?.title || product.name?.trim() || fallbackName;
      const desc =
        product.seo?.description ||
        product.description?.trim() ||
        `Mua ${productName} tại VEXTRO với quy trình thanh toán nhanh, hỗ trợ tận tâm và giao hàng đúng cam kết.`;
      const seoOgImage = resolveProductMediaUrl(product.seo?.ogImage);
      const fallbackImage = getProductFallbackImage(product);
      const image = seoOgImage || (fallbackImage ? `${frontendUrl}/products/${slug}/opengraph-image` : undefined);
      let canonical = product.seo?.canonicalUrl;

      if (!canonical || canonical.startsWith('/')) {
        canonical = `${frontendUrl}/products/${slug}`;
      }

      return {
        title: productName,
        description: desc,
        keywords: product.seo?.keywords || undefined,
        alternates: {
          canonical,
        },
        openGraph: {
          title: product.seo?.ogTitle || productName,
          description: product.seo?.ogDescription || desc,
          url: `${frontendUrl}/products/${slug}`,
          images: image
            ? [{ url: image, width: 1200, height: 630, alt: product.seo?.ogTitle || productName }]
            : undefined,
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: product.seo?.ogTitle || productName,
          description: product.seo?.ogDescription || desc,
          images: image ? [image] : undefined,
        },
      };
    }
  } catch {
    // fallback metadata below
  }

  return {
    title: fallbackName,
    description: `Mua ${fallbackName} tại VEXTRO với quy trình thanh toán nhanh, hỗ trợ tận tâm và giao hàng đúng cam kết.`,
    alternates: {
      canonical: `/products/${slug}`,
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
