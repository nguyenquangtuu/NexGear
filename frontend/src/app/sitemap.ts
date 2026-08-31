import type { MetadataRoute } from "next";

type SitemapEntry = MetadataRoute.Sitemap[number];

type ApiListResponse<T> = {
  success?: boolean;
  data?: T[];
};

type Product = {
  slug?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type Post = {
  slug?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type Category = {
  slug?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  subCategories?: Category[] | null;
};

const FRONTEND_URL = (process.env.NEXT_PUBLIC_FRONTEND_URL || "https://nexgear.vn").replace(/\/+$/, "");
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const staticRoutes: Array<{
  path: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.95 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "weekly", priority: 0.6 },
  { path: "/help-center", changeFrequency: "weekly", priority: 0.65 },
  { path: "/huong-dan-mua-hang", changeFrequency: "monthly", priority: 0.65 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.4 },
  { path: "/refund-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/delivery-policy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/license", changeFrequency: "yearly", priority: 0.3 },
];

function toAbsoluteUrl(path: string) {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${FRONTEND_URL}${path}`;
}

function toValidDate(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function createEntry(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
  lastModified?: string | Date | null,
): SitemapEntry {
  const normalizedDate = lastModified instanceof Date ? lastModified : toValidDate(lastModified);

  return {
    url: toAbsoluteUrl(path),
    changeFrequency,
    priority,
    lastModified: normalizedDate || new Date(),
  };
}

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function flattenCategories(categories: Category[] = []): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(Array.isArray(category.subCategories) ? category.subCategories : []),
  ]);
}

async function fetchProductEntries(): Promise<SitemapEntry[]> {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const response = await fetchJson<{ data?: Product[] }>(`/products?page=${page}&limit=100`);
    const products = Array.isArray(response?.data) ? response.data : [];

    if (products.length === 0) {
      break;
    }

    for (const product of products) {
      const slug = product.slug?.trim();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      entries.push(createEntry(`/products/${encodeURIComponent(slug)}`, "weekly", 0.85, product.updatedAt || product.createdAt));
    }

    if (products.length < 100) {
      break;
    }
  }

  return entries;
}

async function fetchPostEntries(): Promise<SitemapEntry[]> {
  const response = await fetchJson<ApiListResponse<Post>>("/posts/public");
  const posts = Array.isArray(response?.data) ? response.data : [];

  return posts
    .map((post) => {
      const slug = post.slug?.trim();
      if (!slug) return null;
      return createEntry(`/blog/${encodeURIComponent(slug)}`, "weekly", 0.7, post.updatedAt || post.createdAt);
    })
    .filter((entry): entry is SitemapEntry => entry !== null);
}

async function fetchCategoryEntries(): Promise<SitemapEntry[]> {
  const response = await fetchJson<ApiListResponse<Category>>("/categories");
  const categories = flattenCategories(Array.isArray(response?.data) ? response.data : []);
  const seen = new Set<string>();

  return categories
    .map((category) => {
      const slug = category.slug?.trim();
      if (!slug || seen.has(slug)) return null;
      seen.add(slug);
      return createEntry(`/category/${encodeURIComponent(slug)}`, "weekly", 0.75, category.updatedAt || category.createdAt);
    })
    .filter((entry): entry is SitemapEntry => entry !== null);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productEntries, postEntries, categoryEntries] = await Promise.all([
    fetchProductEntries(),
    fetchPostEntries(),
    fetchCategoryEntries(),
  ]);

  return [
    ...staticRoutes.map((route) => createEntry(route.path, route.changeFrequency, route.priority)),
    ...categoryEntries,
    ...productEntries,
    ...postEntries,
  ];
}
