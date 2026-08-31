'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import { resolveMediaUrl } from '@/lib/media';

type Category = {
  id: number;
  name: string;
  slug: string;
  icon: string;
};

type HomeBanner = {
  id?: number;
  slot_key: string;
  slot_name: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  image_url: string;
  image_url_mobile?: string;
  target_url?: string;
  alt_text?: string;
  overlay_preset: 'dark-left' | 'dark-soft' | 'accent-red' | 'accent-blue' | 'none';
  text_align: 'left' | 'center';
  text_color: 'light' | 'dark';
  desktop_image_position?: 'left' | 'center' | 'right';
  mobile_image_position?: 'left' | 'center' | 'right';
  sort_order: number;
  is_active: boolean;
  slides?: BannerSlide[];
};

type BannerSlide = {
  title: string;
  subtitle?: string;
  badge_text?: string;
  image_url: string;
  image_url_mobile?: string;
  target_url?: string;
  alt_text?: string;
  overlay_preset: 'dark-left' | 'dark-soft' | 'accent-red' | 'accent-blue' | 'none';
  text_align: 'left' | 'center';
  text_color: 'light' | 'dark';
  desktop_image_position?: 'left' | 'center' | 'right';
  mobile_image_position?: 'left' | 'center' | 'right';
  sort_order: number;
  is_active: boolean;
};

function resolveImageUrl(url?: string | null) {
  return resolveMediaUrl(url);
}

function getObjectPositionClass(position: 'left' | 'center' | 'right' = 'center') {
  switch (position) {
    case 'left':
      return 'object-left';
    case 'right':
      return 'object-right';
    case 'center':
    default:
      return 'object-center';
  }
}

function BannerImage({
  desktopUrl,
  mobileUrl,
  alt,
  className,
  desktopPosition = 'center',
  mobilePosition = 'center',
}: {
  desktopUrl?: string | null;
  mobileUrl?: string | null;
  alt: string;
  className: string;
  desktopPosition?: 'left' | 'center' | 'right';
  mobilePosition?: 'left' | 'center' | 'right';
}) {
  const desktopSrc = resolveImageUrl(desktopUrl);
  const mobileSrc = resolveImageUrl(mobileUrl || desktopUrl);
  const positionClass = `${getObjectPositionClass(mobilePosition)} md:${getObjectPositionClass(desktopPosition)}`;

  return (
    <picture className="block h-full w-full">
      <source media="(max-width: 767px)" srcSet={mobileSrc} />
      <img src={desktopSrc} alt={alt} className={`${className} ${positionClass}`} />
    </picture>
  );
}

function getOverlayClass(preset: HomeBanner['overlay_preset']) {
  switch (preset) {
    case 'accent-red':
      return 'bg-gradient-to-r from-red-600/45 via-red-600/15 to-transparent';
    case 'accent-blue':
      return 'bg-gradient-to-r from-blue-600/45 via-blue-600/15 to-transparent';
    case 'dark-soft':
      return 'bg-gradient-to-r from-black/50 via-black/15 to-transparent';
    case 'none':
      return 'bg-transparent';
    case 'dark-left':
    default:
      return 'bg-gradient-to-r from-black/65 via-black/25 to-transparent';
  }
}

function BannerWrapper({
  href,
  className,
  children,
}: {
  href?: string;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return <div className={className}>{children}</div>;
  }

  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

const Hero = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bannerMap, setBannerMap] = useState<Record<string, HomeBanner>>({});
  const [bannerFetchDone, setBannerFetchDone] = useState(false);
  const [activeMainSlide, setActiveMainSlide] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiFetch('/categories');
        if (resp.success) {
          setCategories(resp.data.slice(0, 10));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await apiFetch('/home-banners');
        if (resp.success) {
          setBannerMap(resp.data?.bySlot || {});
        }
      } catch {
        setBannerMap({});
      } finally {
        setBannerFetchDone(true);
      }
    })();
  }, []);

  const getBannerBySlot = useMemo(() => {
    return (slotKey: string) => bannerMap[slotKey] || null;
  }, [bannerMap]);

  const mainBanner = getBannerBySlot('hero_main');
  const mainSlides = (mainBanner?.slides || [])
    .filter((slide) => slide.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((slide) => slide.image_url);

  const sideBannerSkeletonCount = 2;
  const bottomBannerSkeletonCount = 4;
  const sideBanners = ['hero_side_top', 'hero_side_bottom']
    .map((key) => getBannerBySlot(key))
    .filter(Boolean) as HomeBanner[];
  const bottomBanners = ['hero_bottom_1', 'hero_bottom_2', 'hero_bottom_3', 'hero_bottom_4']
    .map((key) => getBannerBySlot(key))
    .filter(Boolean) as HomeBanner[];

  useEffect(() => {
    setActiveMainSlide(0);
  }, [mainSlides.length]);

  useEffect(() => {
    if (mainSlides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveMainSlide((prev) => (prev + 1) % mainSlides.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, [mainSlides.length]);

  const currentMainSlide = mainSlides[activeMainSlide] || mainSlides[0] || null;
  const isBannerLoading = !bannerFetchDone;

  return (
    <div className="relative overflow-hidden bg-background pb-12 pt-6">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-2 flex flex-col gap-2 lg:grid lg:grid-cols-[210px_minmax(0,1fr)_160px] lg:items-stretch xl:grid-cols-[230px_minmax(0,1fr)_180px]">
          <div className="hidden h-full rounded-xl border border-border bg-card p-2 shadow-sm lg:block">
            <nav className="flex h-full flex-col gap-0.5 py-1">
              {categories.length > 0
                ? categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-primary"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground transition-colors group-hover:text-primary">
                          {React.createElement(getCategoryIcon(cat.icon), { className: 'h-4 w-4' })}
                        </span>
                        {cat.name}
                      </div>
                      <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))
                : Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="mb-1 h-8 w-full animate-pulse rounded-lg bg-muted/20" />
                  ))}
            </nav>
          </div>

          {isBannerLoading ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm aspect-[21/9] lg:aspect-[662/315]">
              <div className="h-full w-full animate-pulse bg-muted/30" />
            </div>
          ) : mainBanner && currentMainSlide ? (
            <BannerWrapper
              href={currentMainSlide.target_url || mainBanner.target_url}
              className="group relative overflow-hidden rounded-xl border border-border shadow-sm aspect-[21/9] lg:aspect-[662/315]"
            >
              <BannerImage
                desktopUrl={currentMainSlide.image_url}
                mobileUrl={currentMainSlide.image_url_mobile}
                alt={currentMainSlide.alt_text || mainBanner.slot_name}
                desktopPosition={currentMainSlide.desktop_image_position || 'right'}
                mobilePosition={currentMainSlide.mobile_image_position || 'center'}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className={`absolute inset-0 ${getOverlayClass(currentMainSlide.overlay_preset)}`} />
              <div
                className={`absolute inset-0 flex flex-col justify-center px-8 lg:px-12 ${
                  currentMainSlide.text_align === 'center' ? 'items-center text-center' : 'items-start text-left'
                } ${currentMainSlide.text_color === 'light' ? 'text-white' : 'text-slate-950'}`}
              >
                {currentMainSlide.badge_text ? (
                  <span className="mb-4 w-fit rounded-md bg-primary px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                    {currentMainSlide.badge_text}
                  </span>
                ) : null}
                <div className="space-y-1">
                  {currentMainSlide.title.split('\n').filter(Boolean).map((line, index) => (
                    <h2 key={`${line}-${index}`} className="text-2xl font-black leading-tight lg:text-4xl">
                      {line}
                    </h2>
                  ))}
                </div>
              {mainSlides.length > 1 ? (
                <div className="absolute bottom-4 left-6 z-10 flex gap-2 overflow-hidden md:bottom-5 md:left-8 lg:bottom-6 lg:left-12">
                  {mainSlides.map((slide, index) => (
                    <button
                      key={`${slide.sort_order}-${index}`}
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveMainSlide(index);
                      }}
                      className={`rounded-full transition-all ${
                        index === activeMainSlide ? 'h-1.5 w-8 bg-primary' : 'h-1.5 w-2 bg-white/30'
                      }`}
                      aria-label={`Chuyển đến banner ${index + 1}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="absolute bottom-4 left-6 z-10 flex gap-2 overflow-hidden md:bottom-5 md:left-8 lg:bottom-6 lg:left-12">
                  <div className="h-1.5 w-8 rounded-full bg-primary" />
                </div>
              )}
              </div>
            </BannerWrapper>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm aspect-[21/9] lg:aspect-[662/315]">
              <div className="h-full w-full animate-pulse bg-muted/30" />
            </div>
          )}

          {isBannerLoading ? (
            <div className="hidden h-full gap-2 lg:grid lg:grid-rows-2">
              {Array.from({ length: sideBannerSkeletonCount }).map((_, index) => (
                <div
                  key={`hero-side-skeleton-${index}`}
                  className="h-full animate-pulse rounded-xl border border-border bg-muted/30 shadow-sm"
                />
              ))}
            </div>
          ) : sideBanners.length > 0 ? (
            <div className="hidden min-h-0 h-full gap-2 lg:grid lg:grid-rows-2">
              {sideBanners.map((banner) => (
                <BannerWrapper
                  key={banner.slot_key}
                  href={banner.target_url}
                  className="group relative min-h-0 h-full overflow-hidden rounded-xl border border-border shadow-sm"
                >
                  <BannerImage
                    desktopUrl={banner.image_url}
                    mobileUrl={banner.image_url_mobile}
                    alt={banner.alt_text || banner.slot_name}
                    desktopPosition={banner.desktop_image_position || 'center'}
                    mobilePosition={banner.mobile_image_position || 'center'}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className={`absolute inset-0 ${getOverlayClass(banner.overlay_preset)} transition-colors`} />
                  <div
                    className={`absolute inset-0 flex flex-col justify-start p-4 ${
                      banner.text_align === 'center' ? 'items-center text-center' : 'items-start text-left'
                    } ${banner.text_color === 'light' ? 'text-white' : 'text-slate-950'}`}
                  >
                    <div className="space-y-0.5">
                      {banner.title.split('\n').filter(Boolean).map((line, index) => (
                        <p key={`${banner.slot_key}-${index}`} className="text-sm font-black uppercase leading-tight">
                          <span className={index === banner.title.split('\n').filter(Boolean).length - 1 ? 'text-xl' : ''}>
                            {line}
                          </span>
                        </p>
                      ))}
                    </div>
                    {banner.subtitle ? (
                      <span className="mt-2 inline-block rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                        {banner.subtitle}
                      </span>
                    ) : null}
                  </div>
                </BannerWrapper>
              ))}
            </div>
          ) : (
            <div className="hidden h-full gap-2 lg:grid lg:grid-rows-2">
              {Array.from({ length: sideBannerSkeletonCount }).map((_, index) => (
                <div
                  key={`hero-side-empty-${index}`}
                  className="h-full animate-pulse rounded-xl border border-border bg-muted/30 shadow-sm"
                />
              ))}
            </div>
          )}
        </div>

        {isBannerLoading ? (
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: bottomBannerSkeletonCount }).map((_, index) => (
              <div
                key={`hero-bottom-skeleton-${index}`}
                className="aspect-[2.5/1] animate-pulse rounded-xl border border-border bg-muted/30 shadow-sm"
              />
            ))}
          </div>
        ) : bottomBanners.length > 0 ? (
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {bottomBanners.map((banner) => (
              <BannerWrapper
                key={banner.slot_key}
                href={banner.target_url}
                className="group relative aspect-[2.5/1] overflow-hidden rounded-xl border border-border shadow-sm"
              >
                <BannerImage
                  desktopUrl={banner.image_url}
                  mobileUrl={banner.image_url_mobile}
                  alt={banner.alt_text || banner.slot_name}
                  desktopPosition={banner.desktop_image_position || 'center'}
                  mobilePosition={banner.mobile_image_position || 'center'}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className={`absolute inset-0 ${getOverlayClass(banner.overlay_preset)} transition-colors`} />
                <div
                  className={`absolute inset-0 flex flex-col justify-center px-4 ${
                    banner.text_align === 'center' ? 'items-center text-center' : 'items-start text-left'
                  } ${banner.text_color === 'light' ? 'text-white' : 'text-slate-950'}`}
                >
                  <p className="text-[10px] font-black uppercase leading-tight lg:text-xs">{banner.title}</p>
                  {banner.subtitle ? (
                    <span className="mt-1 w-fit rounded-md border border-white/30 bg-white/20 px-1.5 py-0.5 text-[9px] font-bold lg:text-[10px]">
                      {banner.subtitle}
                    </span>
                  ) : null}
                </div>
              </BannerWrapper>
            ))}
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: bottomBannerSkeletonCount }).map((_, index) => (
              <div
                key={`hero-bottom-empty-${index}`}
                className="aspect-[2.5/1] animate-pulse rounded-xl border border-border bg-muted/30 shadow-sm"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hero;
