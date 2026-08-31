import type { Metadata } from 'next';
import Script from 'next/script';
import PostDetailClient from './PostDetailClient';
import { buildPageMetadata, toAbsoluteUrl } from '@/lib/seo';

type ParamsInput = { slug?: string } | Promise<{ slug?: string }>;

type PostDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  thumbnail: string;
  status: 'PUBLIC' | 'LINK_ONLY' | 'HIDDEN';
  createdAt: string;
  updatedAt?: string;
  viewCount: number;
  showThumbnailInContent?: boolean | number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
};

type ApiResponse = {
  success?: boolean;
  data?: PostDetail;
};

async function resolveSlug(params?: ParamsInput) {
  if (!params) return '';
  const resolved = await Promise.resolve(params);
  return resolved?.slug || '';
}

async function fetchPost(slug: string) {
  if (!slug) return null;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

  try {
    const response = await fetch(`${apiBase}/posts/slug/${encodeURIComponent(slug)}`, {
      method: 'GET',
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiResponse;
    return payload.success && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params?: ParamsInput;
}): Promise<Metadata> {
  const slug = await resolveSlug(params);
  const post = await fetchPost(slug);

  if (!post) {
    return buildPageMetadata({
      title: 'Bài viết không tồn tại',
      description: 'Bài viết bạn đang tìm kiếm hiện không khả dụng trên VEXTRO.',
      path: slug ? `/blog/${slug}` : '/blog',
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.title,
    path: post.canonicalUrl || `/blog/${post.slug}`,
    keywords: post.seoKeywords,
    ogTitle: post.ogTitle || post.seoTitle || post.title,
    ogDescription: post.ogDescription || post.seoDescription || post.title,
    ogImage: post.ogImage || post.thumbnail,
    type: 'article',
    publishedTime: post.createdAt,
    modifiedTime: post.updatedAt || post.createdAt,
  });
}

export default async function PostDetailPage({
  params,
}: {
  params?: ParamsInput;
}) {
  const slug = await resolveSlug(params);
  const post = await fetchPost(slug);

  return (
    <>
      {post ? (
        <Script
          id={`blog-post-jsonld-${post.id}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.seoTitle || post.title,
              description: post.seoDescription || post.title,
              datePublished: post.createdAt,
              dateModified: post.updatedAt || post.createdAt,
              mainEntityOfPage: toAbsoluteUrl(post.canonicalUrl || `/blog/${post.slug}`),
              image: post.ogImage ? [toAbsoluteUrl(post.ogImage)] : post.thumbnail ? [toAbsoluteUrl(post.thumbnail)] : [],
              author: {
                '@type': 'Organization',
                name: 'VEXTRO',
              },
              publisher: {
                '@type': 'Organization',
                name: 'VEXTRO',
              },
            }),
          }}
        />
      ) : null}
      <PostDetailClient post={post} />
    </>
  );
}
