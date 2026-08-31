import { ImageResponse } from 'next/og';
import { fetchProductMetadata, getProductFallbackImage, resolveProductMediaUrl } from '@/lib/product-metadata';

export const runtime = 'nodejs';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

type ParamsInput = { slug?: string } | Promise<{ slug?: string }>;

type ProductOgImageProps = {
  params?: ParamsInput;
};

async function resolveSlug(params?: ParamsInput) {
  if (!params) return '';
  const resolved = await Promise.resolve(params);
  return resolved?.slug || '';
}

export default async function ProductOgImage({ params }: ProductOgImageProps) {
  const slug = await resolveSlug(params);
  const product = await fetchProductMetadata(slug);
  const title = product?.seo?.ogTitle || product?.seo?.title || product?.name || 'VEXTRO';
  const imageUrl = resolveProductMediaUrl(getProductFallbackImage(product));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          color: '#0f172a',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif',
          padding: '44px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'radial-gradient(circle at top right, rgba(59,130,246,0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(15,23,42,0.08), transparent 30%)',
          }}
        />
        <div
          style={{
            width: '100%',
            maxWidth: '900px',
            height: '100%',
            maxHeight: '542px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(148,163,184,0.28)',
            borderRadius: '28px',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
            overflow: 'hidden',
            padding: '34px',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              width={680}
              height={552}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
                color: '#1d4ed8',
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: '-0.03em',
              }}
            >
              VEXTRO
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
