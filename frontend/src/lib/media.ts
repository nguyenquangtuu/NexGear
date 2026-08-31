const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || API_URL.replace(/\/api$/, '')).replace(/\/+$/, '');

export function resolveMediaUrl(src?: string | null, fallback = '/file.svg') {
  if (!src) return fallback;
  if (/^https?:\/\//i.test(src)) return src;

  const path = src.startsWith('/') ? src : `/${src}`;

  if ((path.startsWith('/api/uploads/') || path.startsWith('/uploads/')) && BACKEND_URL) {
    return `${BACKEND_URL}${path}`;
  }

  return path;
}

export function resolveProductImageUrl(thumbnail?: string | null, images?: string[] | null, fallback = '/file.svg') {
  const galleryImage = Array.isArray(images) ? images.find(Boolean) : null;
  return resolveMediaUrl(thumbnail || galleryImage || null, fallback);
}

export function transformHtmlContent(html?: string | null) {
  if (!html || !BACKEND_URL) return html || '';

  const FRONTEND_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || '').replace(/\/+$/, '');
  
  let transformed = html;

  // Replace absolute frontend paths first if they exist
  if (FRONTEND_URL && FRONTEND_URL !== BACKEND_URL) {
    const escapedFrontend = FRONTEND_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const absoluteRegex = new RegExp(`(src|href)="${escapedFrontend}(\\/(?:api\\/)?uploads\\/[^"]+)"`, 'g');
    transformed = transformed.replace(absoluteRegex, (match, attr, path) => `${attr}="${BACKEND_URL}${path}"`);
  }
  
  // Replace relative paths
  return transformed.replace(
    /(src|href)="(\/(?:api\/)?uploads\/[^"]+)"/g,
    (match, attr, path) => `${attr}="${BACKEND_URL}${path}"`
  );
}
