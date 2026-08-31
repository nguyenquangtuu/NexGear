import 'server-only';

type ProductSeo = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
};

export type ProductMetadataRecord = {
  name?: string;
  description?: string | null;
  thumbnail?: string | null;
  images?: string[];
  seo?: ProductSeo | null;
};

type ProductResponse = {
  data?: ProductMetadataRecord;
};

const FRONTEND_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://nexgear.vn').replace(/\/+$/, '');
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || API_BASE.replace(/\/api$/, '')).replace(/\/+$/, '');

export function getFrontendUrl() {
  return FRONTEND_URL;
}

export function resolveProductMediaUrl(src?: string | null) {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;

  const normalizedPath = src.startsWith('/') ? src : `/${src}`;
  if (normalizedPath.startsWith('/api/uploads/') || normalizedPath.startsWith('/uploads/')) {
    return `${BACKEND_URL}${normalizedPath}`;
  }

  return `${FRONTEND_URL}${normalizedPath}`;
}

export function getProductFallbackImage(product?: ProductMetadataRecord | null) {
  if (!product) return undefined;

  const gallery = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  return product.thumbnail || gallery[0] || undefined;
}

export async function fetchProductMetadata(slug: string) {
  if (!slug) return null;

  try {
    const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`, {
      method: 'GET',
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as ProductResponse;
    return json?.data || null;
  } catch {
    return null;
  }
}
