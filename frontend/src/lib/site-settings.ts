import "server-only";
import { cache } from "react";

export type SiteSettings = {
  site_name: string;
  site_title: string;
  site_description: string;
  site_keywords: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  favicon_url: string;
  deposit_enabled: boolean;
};

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'no'].includes(normalized)) return false;
  }

  return fallback;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  `${(process.env.NEXT_PUBLIC_FRONTEND_URL || "https://nexgear.vn").replace(/\/+$/, "")}/api`
).replace(/\/+$/, "");

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: "NEXGEAR",
  site_title: "NEXGEAR - Hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng",
  site_description:
    "NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp.",
  site_keywords:
    "nexgear, laptop, linh kiện máy tính, thiết bị công nghệ, chính hãng, giá tốt, bảo hành, dịch vụ chuyên nghiệp",
  og_title: "NEXGEAR - Hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng",
  og_description:
    "NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp.",
  og_image_url: "/images/brand/logo-dark.png",
  favicon_url: "/images/brand/favicon.png",
  deposit_enabled: true,
};

function normalizeLegacyVietnamese(settings: SiteSettings): SiteSettings {
  return {
    ...settings,
    deposit_enabled: normalizeBoolean(
      settings.deposit_enabled,
      DEFAULT_SITE_SETTINGS.deposit_enabled
    ),
    site_title:
      settings.site_title === "VEXTRO - Cho san pham so, tai khoan Premium va phan mem ban quyen"
        ? "NEXGEAR - Hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng"
        : settings.site_title,
    site_description:
      settings.site_description ===
      "Mua tai khoan Premium, phan mem ban quyen, cong cu AI, game va dich vu so gia tot tai VEXTRO voi quy trinh nhanh, an toan va ho tro ro rang."
        ? "NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp."
        : settings.site_description,
    site_keywords:
      settings.site_keywords ===
      "vextro, mua tai khoan premium, tai khoan premium, phan mem ban quyen, dich vu so, cong cu AI, steam offline, microsoft office ban quyen, shop san pham so"
        ? "nexgear, laptop, linh kiện máy tính, thiết bị công nghệ, chính hãng, giá tốt, bảo hành, dịch vụ chuyên nghiệp"
        : settings.site_keywords,
    og_title:
      settings.og_title === "VEXTRO - Cho san pham so, tai khoan Premium va phan mem ban quyen"
        ? "NEXGEAR - Hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng"
        : settings.og_title,
    og_description:
      settings.og_description ===
      "Mua tai khoan Premium, phan mem ban quyen, cong cu AI, game va dich vu so gia tot tai VEXTRO voi quy trinh nhanh, an toan va ho tro ro rang."
        ? "NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp."
        : settings.og_description,
  };
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const response = await fetch(`${API_URL}/site-settings`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return DEFAULT_SITE_SETTINGS;
    }

    const payload = (await response.json()) as { data?: Partial<SiteSettings> };
    return normalizeLegacyVietnamese({
      ...DEFAULT_SITE_SETTINGS,
      ...(payload.data || {}),
    });
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
});
