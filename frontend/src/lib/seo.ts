import 'server-only';

import type { Metadata } from 'next';
import { getSiteSettings } from './site-settings';

const SITE_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://nexgear.vn').replace(/\/+$/, '');
const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || API_URL.replace(/\/api$/, '')).replace(/\/+$/, '');

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string | string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
};

function uniqueKeywords(input: Array<string | undefined | null>) {
  return [...new Set(input.map((item) => String(item || '').trim()).filter(Boolean))];
}

export function getSiteUrl() {
  return SITE_URL;
}

export function toAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if ((normalizedPath.startsWith('/api/uploads/') || normalizedPath.startsWith('/uploads/')) && BACKEND_URL) {
    return `${BACKEND_URL}${normalizedPath}`;
  }

  return `${SITE_URL}${normalizedPath}`;
}

export async function buildPageMetadata(options: PageMetadataOptions): Promise<Metadata> {
  const settings = await getSiteSettings();
  const pageKeywords = Array.isArray(options.keywords)
    ? options.keywords
    : String(options.keywords || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  const siteKeywords = settings.site_keywords
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const keywords = uniqueKeywords([...pageKeywords, ...siteKeywords]);
  const imageUrl = options.ogImage || settings.og_image_url;
  const absoluteImageUrl = imageUrl ? toAbsoluteUrl(imageUrl) : undefined;
  const canonicalUrl = options.path;

  return {
    metadataBase: new URL(SITE_URL),
    title: options.title,
    description: options.description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: options.type || 'website',
      locale: 'vi_VN',
      url: toAbsoluteUrl(canonicalUrl),
      siteName: settings.site_name,
      title: options.ogTitle || options.title,
      description: options.ogDescription || options.description,
      images: absoluteImageUrl
        ? [
            {
              url: absoluteImageUrl,
              width: 1200,
              height: 630,
              alt: options.ogTitle || options.title,
            },
          ]
        : undefined,
      publishedTime: options.publishedTime,
      modifiedTime: options.modifiedTime,
    },
    twitter: {
      card: 'summary_large_image',
      title: options.ogTitle || options.title,
      description: options.ogDescription || options.description,
      images: absoluteImageUrl ? [absoluteImageUrl] : undefined,
    },
    robots: options.noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : undefined,
  };
}
