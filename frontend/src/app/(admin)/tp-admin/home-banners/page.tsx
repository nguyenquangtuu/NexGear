'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Images,
  Link2,
  RefreshCcw,
  Save,
  Sparkles,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import CropModal from '../products/_components/CropModal';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

type Banner = {
  id?: number;
  slot_key: string;
  slot_name: string;
  title: string;
  subtitle: string;
  badge_text: string;
  image_url: string;
  image_url_mobile: string;
  target_url: string;
  alt_text: string;
  overlay_preset: 'dark-left' | 'dark-soft' | 'accent-red' | 'accent-blue' | 'none';
  text_align: 'left' | 'center';
  text_color: 'light' | 'dark';
  desktop_image_position: 'left' | 'center' | 'right';
  mobile_image_position: 'left' | 'center' | 'right';
  sort_order: number;
  is_active: boolean;
  slides?: BannerSlide[];
};

type BannerSlide = {
  title: string;
  subtitle: string;
  badge_text: string;
  image_url: string;
  image_url_mobile: string;
  target_url: string;
  alt_text: string;
  overlay_preset: 'dark-left' | 'dark-soft' | 'accent-red' | 'accent-blue' | 'none';
  text_align: 'left' | 'center';
  text_color: 'light' | 'dark';
  desktop_image_position: 'left' | 'center' | 'right';
  mobile_image_position: 'left' | 'center' | 'right';
  sort_order: number;
  is_active: boolean;
};

const SLOT_META: Record<string, { label: string; description: string; desktopAspectRatio: number; mobileAspectRatio: number }> = {
  hero_main: {
    label: 'Banner chính giữa',
    description: 'Banner lớn nhất ở giữa hero. Hợp cho chiến dịch chính, flash sale, sản phẩm nổi bật.',
    desktopAspectRatio: 662 / 315,
    mobileAspectRatio: 21 / 9, 
  },
  hero_side_top: {
    label: 'Banner phải trên',
    description: 'Ô nhỏ bên phải phía trên. Hợp cho nhóm sản phẩm phụ hoặc campaign ngắn.',
    desktopAspectRatio: 1.35,
    mobileAspectRatio: 1.35,
  },
  hero_side_bottom: {
    label: 'Banner phải dưới',
    description: 'Ô nhỏ bên phải phía dưới. Hợp cho phụ kiện, khuyến mãi hoặc thiết bị điện tử hot.',
    desktopAspectRatio: 1.35,
    mobileAspectRatio: 1.35,
  },
  hero_bottom_1: {
    label: 'Banner hàng dưới 1',
    description: 'Banner ngang hàng dưới, vị trí đầu tiên từ trái sang phải.',
    desktopAspectRatio: 2.5,
    mobileAspectRatio: 2.5,
  },
  hero_bottom_2: {
    label: 'Banner hàng dưới 2',
    description: 'Banner ngang hàng dưới, vị trí thứ hai.',
    desktopAspectRatio: 2.5,
    mobileAspectRatio: 2.5,
  },
  hero_bottom_3: {
    label: 'Banner hàng dưới 3',
    description: 'Banner ngang hàng dưới, vị trí thứ ba.',
    desktopAspectRatio: 2.5,
    mobileAspectRatio: 2.5,
  },
  hero_bottom_4: {
    label: 'Banner hàng dưới 4',
    description: 'Banner ngang hàng dưới, vị trí cuối cùng bên phải.',
    desktopAspectRatio: 2.5,
    mobileAspectRatio: 2.5,
  },
};

const EMPTY_FORM: Banner = {
  slot_key: 'hero_main',
  slot_name: SLOT_META.hero_main.label,
  title: '',
  subtitle: '',
  badge_text: '',
  image_url: '',
  image_url_mobile: '',
  target_url: '',
  alt_text: '',
  overlay_preset: 'dark-left',
  text_align: 'left',
  text_color: 'light',
  desktop_image_position: 'center',
  mobile_image_position: 'center',
  sort_order: 1,
  is_active: true,
  slides: [],
};

function resolveImageUrl(url?: string | null) {
  return resolveMediaUrl(url, '');
}

function getOverlayPreviewClass(preset: Banner['overlay_preset']) {
  switch (preset) {
    case 'accent-red':
      return 'bg-gradient-to-r from-red-600/45 via-red-600/15 to-transparent';
    case 'accent-blue':
      return 'bg-gradient-to-r from-blue-600/45 via-blue-600/15 to-transparent';
    case 'dark-soft':
      return 'bg-gradient-to-r from-black/55 via-black/25 to-transparent';
    case 'none':
      return 'bg-transparent';
    case 'dark-left':
    default:
      return 'bg-gradient-to-r from-black/72 via-black/30 to-transparent';
  }
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

type UploadTarget = {
  device: 'desktop' | 'mobile';
  scope: 'banner' | 'slide';
};

export default function AdminHomeBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('hero_main');
  const [form, setForm] = useState<Banner>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string; target: UploadTarget } | null>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/admin/home-banners');
      const rows = (response.data || []) as Banner[];
      setBanners(rows);
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải banner trang chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const bannersBySlot = useMemo(
    () => Object.fromEntries(banners.map((banner) => [banner.slot_key, banner])),
    [banners]
  );

  useEffect(() => {
    const existing = bannersBySlot[selectedSlot];
    const meta = SLOT_META[selectedSlot];

    if (existing) {
      setForm({
        ...existing,
        desktop_image_position: existing.desktop_image_position || 'center',
        mobile_image_position: existing.mobile_image_position || 'center',
        slides: existing.slides || [],
      });
      setEditingSlideIndex(selectedSlot === 'hero_main' && (existing.slides || []).length ? 0 : null);
      return;
    }

    setForm({
      ...EMPTY_FORM,
      slot_key: selectedSlot,
      slot_name: meta.label,
      sort_order: Object.keys(SLOT_META).indexOf(selectedSlot) + 1,
      slides:
        selectedSlot === 'hero_main'
          ? [
              {
                title: '',
                subtitle: '',
                badge_text: '',
                image_url: '',
                image_url_mobile: '',
                target_url: '',
                alt_text: '',
                overlay_preset: 'dark-left',
                text_align: 'left',
                text_color: 'light',
                desktop_image_position: 'center',
                mobile_image_position: 'center',
                sort_order: 1,
                is_active: true,
              },
            ]
          : [],
    });
    setEditingSlideIndex(selectedSlot === 'hero_main' ? 0 : null);
  }, [selectedSlot, bannersBySlot]);

  const currentMeta = SLOT_META[selectedSlot];

  const handleImageUpload = (file: File, target: UploadTarget) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn, vui lòng chọn file dưới 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropSource({ src: reader.result as string, fileName: file.name, target });
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (base64Data: string) => {
    if (!cropSource) return;

    setCropSource(null);
    setUploading(true);
    try {
      const response = await apiFetch('/upload/base64', {
        method: 'POST',
        body: JSON.stringify({
          base64Data,
          fileName: `home_banner_${form.slot_key}_${Date.now()}.png`,
        }),
      });

      if (response.success) {
        const targetField = cropSource.target.device === 'mobile' ? 'image_url_mobile' : 'image_url';

        if (cropSource.target.scope === 'slide' && editingSlideIndex != null) {
          setForm((prev) => ({
            ...prev,
            slides: (prev.slides || []).map((slide, index) =>
              index === editingSlideIndex ? { ...slide, [targetField]: response.url } : slide
            ),
          }));
        } else {
          setForm((prev) => ({ ...prev, [targetField]: response.url }));
        }
        toast.success('Đã tải ảnh banner lên');
      }
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải ảnh banner');
    } finally {
      setUploading(false);
    }
  };

  const normalizeSlidesForSave = (slides: BannerSlide[]) =>
    slides.map((slide, index) => ({
      ...slide,
      title: slide.title.trim(),
      subtitle: slide.subtitle.trim(),
      badge_text: slide.badge_text.trim(),
      image_url: slide.image_url.trim(),
      image_url_mobile: slide.image_url_mobile.trim(),
      target_url: slide.target_url.trim(),
      alt_text: slide.alt_text.trim(),
      desktop_image_position: slide.desktop_image_position,
      mobile_image_position: slide.mobile_image_position,
      sort_order: index + 1,
    }));

  const saveBanner = async () => {
    let payload: Banner;

    if (form.slot_key === 'hero_main') {
      const normalizedSlides = normalizeSlidesForSave(form.slides || []);
      const incompleteSlideIndex = normalizedSlides.findIndex((slide) => {
        const hasAnyContent =
          Boolean(slide.title) ||
          Boolean(slide.subtitle) ||
          Boolean(slide.badge_text) ||
          Boolean(slide.image_url) ||
          Boolean(slide.image_url_mobile) ||
          Boolean(slide.target_url) ||
          Boolean(slide.alt_text);

        return hasAnyContent && !slide.image_url;
      });

      if (incompleteSlideIndex >= 0) {
        toast.error(`Slide ${incompleteSlideIndex + 1} cần có ảnh trước khi lưu`);
        return;
      }

      const validSlides = normalizedSlides.filter((slide) => slide.image_url);
      if (!validSlides.length) {
        toast.error('Banner chính cần ít nhất một slide có ảnh');
        return;
      }

      const leadSlide = validSlides[0];
      payload = {
        ...form,
        slot_name: form.slot_name.trim() || currentMeta.label,
        title: leadSlide.title || form.title || '',
        subtitle: leadSlide.subtitle,
        badge_text: leadSlide.badge_text,
        image_url: leadSlide.image_url,
        image_url_mobile: leadSlide.image_url_mobile,
        target_url: leadSlide.target_url,
        alt_text: leadSlide.alt_text,
        overlay_preset: leadSlide.overlay_preset,
        text_align: leadSlide.text_align,
        text_color: leadSlide.text_color,
        slides: validSlides,
      };
    } else {
      payload = {
        ...form,
        slot_name: form.slot_name.trim() || currentMeta.label,
      };
    }

    setSubmitting(true);
    try {
      if (form.id) {
        await apiFetch(`/admin/home-banners/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Đã cập nhật banner');
      } else {
        await apiFetch('/admin/home-banners', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Đã tạo banner mới');
      }

      await fetchBanners();
    } catch (error: any) {
      toast.error(error.message || 'Không thể lưu banner');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBanner = bannersBySlot[selectedSlot];
  const currentSlides = form.slides || [];
  const currentSlide =
    form.slot_key === 'hero_main' && editingSlideIndex != null ? currentSlides[editingSlideIndex] : null;
  const currentDesktopImage = form.slot_key === 'hero_main' ? currentSlide?.image_url || '' : form.image_url;
  const currentMobileImage = form.slot_key === 'hero_main' ? currentSlide?.image_url_mobile || '' : form.image_url_mobile;

  const updateCurrentSlide = (patch: Partial<BannerSlide>) => {
    if (editingSlideIndex == null) return;
    setForm((prev) => ({
      ...prev,
      slides: (prev.slides || []).map((slide, index) =>
        index === editingSlideIndex ? { ...slide, ...patch } : slide
      ),
    }));
  };

  const addSlide = () => {
    const nextSlide: BannerSlide = {
      title: '',
      subtitle: '',
      badge_text: '',
      image_url: '',
      image_url_mobile: '',
      target_url: '',
      alt_text: '',
      overlay_preset: 'dark-left',
      text_align: 'left',
      text_color: 'light',
      desktop_image_position: 'center',
      mobile_image_position: 'center',
      sort_order: currentSlides.length + 1,
      is_active: true,
    };

    setForm((prev) => ({
      ...prev,
      slides: [...(prev.slides || []), nextSlide],
    }));
    setEditingSlideIndex(currentSlides.length);
  };

  const removeSlide = (indexToRemove: number) => {
    const nextSlides = currentSlides
      .filter((_, index) => index !== indexToRemove)
      .map((slide, index) => ({ ...slide, sort_order: index + 1 }));

    setForm((prev) => ({ ...prev, slides: nextSlides }));
    setEditingSlideIndex(nextSlides.length ? Math.max(0, Math.min(indexToRemove, nextSlides.length - 1)) : null);
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= currentSlides.length) return;

    const nextSlides = [...currentSlides];
    [nextSlides[index], nextSlides[target]] = [nextSlides[target], nextSlides[index]];
    const normalized = nextSlides.map((slide, idx) => ({ ...slide, sort_order: idx + 1 }));
    setForm((prev) => ({ ...prev, slides: normalized }));
    setEditingSlideIndex(target);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Banner trang chủ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý đầy đủ ảnh, text, badge, link, alt text, kiểu phủ màu và trạng thái hiển thị cho toàn bộ hero homepage.
          </p>
        </div>

        <button
          onClick={fetchBanners}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <RefreshCcw size={16} />
          Tải lại dữ liệu
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Images size={20} />
            </div>
            <div>
              <h3 className="font-bold">Các vị trí banner</h3>
              <p className="text-xs text-muted-foreground">Chọn đúng slot để sửa nhanh mà không sợ lệch bố cục trang chủ.</p>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(SLOT_META).map(([slotKey, meta]) => {
              const banner = bannersBySlot[slotKey];
              const isSelected = slotKey === selectedSlot;

              return (
                <button
                  key={slotKey}
                  type="button"
                  onClick={() => setSelectedSlot(slotKey)}
                  className={`w-full rounded-2xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border bg-background hover:border-primary/30 hover:bg-secondary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/30">
                      {banner?.image_url ? (
                        <img src={resolveImageUrl(banner.image_url)} alt={banner.alt_text || meta.label} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-foreground">{meta.label}</p>
                        {banner?.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            <Eye size={10} /> Hiện
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            <EyeOff size={10} /> Ẩn
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta.description}</p>
                      <p className="mt-1 truncate text-[11px] font-medium text-foreground/80">
                        {banner?.title || 'Chưa có nội dung cho vị trí này'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-bold">{currentMeta.label}</h3>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{currentMeta.description}</p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Sparkles size={14} />
                Desktop {currentMeta.desktopAspectRatio.toFixed(2)} : 1 | Mobile {currentMeta.mobileAspectRatio.toFixed(2)} : 1
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tên quản trị</span>
                    <input
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                      value={form.slot_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, slot_name: e.target.value }))}
                      placeholder="Ví dụ: Banner chính giữa"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Thứ tự hiển thị</span>
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                      value={form.sort_order}
                      onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value || 0) }))}
                    />
                  </label>
                </div>

                {form.slot_key === 'hero_main' ? (
                  <div className="space-y-4 rounded-3xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">Slides banner chính</p>
                        <p className="text-xs text-muted-foreground">Có thể thêm nhiều slide, mỗi slide có ảnh, text và link riêng để ngoài trang chủ tự trượt.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addSlide}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white"
                      >
                        Thêm slide
                      </button>
                    </div>

                    <div className="space-y-2">
                      {currentSlides.map((slide, index) => (
                        <div
                          key={`${index}-${slide.sort_order}`}
                          onClick={() => setEditingSlideIndex(index)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setEditingSlideIndex(index);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                            editingSlideIndex === index ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/40'
                          }`}
                        >
                          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/30">
                            {slide.image_url ? (
                              <img src={resolveImageUrl(slide.image_url)} alt={slide.alt_text || `Slide ${index + 1}`} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageIcon size={14} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{slide.title || `Slide ${index + 1}`}</p>
                            <p className="truncate text-xs text-muted-foreground">{slide.subtitle || 'Chưa có dòng phụ'}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveSlide(index, -1); }} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary">
                              <ChevronUp size={14} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); moveSlide(index, 1); }} className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-secondary">
                              <ChevronDown size={14} />
                            </button>
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeSlide(index); }} className="rounded-lg border border-border p-2 text-red-500 hover:bg-red-500/10">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {currentSlide ? (
                      <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                        <p className="text-sm font-bold text-foreground">Nội dung slide {editingSlideIndex! + 1}</p>

                        <label className="space-y-2">
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <Type size={14} /> Tiêu đề slide
                          </span>
                          <textarea
                            className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                            value={currentSlide.title}
                            onChange={(e) => updateCurrentSlide({ title: e.target.value })}
                            placeholder={'Ví dụ:\nSTEAM\nOFFLINE MODE'}
                          />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Badge nhỏ</span>
                            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.badge_text} onChange={(e) => updateCurrentSlide({ badge_text: e.target.value })} placeholder="Ví dụ: CHỈ TỪ 49K" />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dòng phụ</span>
                            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.subtitle} onChange={(e) => updateCurrentSlide({ subtitle: e.target.value })} placeholder="Ví dụ: SIÊU TỐI ƯU" />
                          </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              <Link2 size={14} /> Link click slide
                            </span>
                            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.target_url} onChange={(e) => updateCurrentSlide({ target_url: e.target.value })} placeholder="/search?q=steam hoặc https://..." />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alt text ảnh</span>
                            <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.alt_text} onChange={(e) => updateCurrentSlide({ alt_text: e.target.value })} placeholder="Mô tả ảnh slide" />
                          </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overlay</span>
                            <select className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.overlay_preset} onChange={(e) => updateCurrentSlide({ overlay_preset: e.target.value as BannerSlide['overlay_preset'] })}>
                              <option value="dark-left">Tối đậm từ trái</option>
                              <option value="dark-soft">Tối nhẹ</option>
                              <option value="accent-red">Ánh đỏ</option>
                              <option value="accent-blue">Ánh xanh</option>
                              <option value="none">Không phủ màu</option>
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Canh chữ</span>
                            <select className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.text_align} onChange={(e) => updateCurrentSlide({ text_align: e.target.value as BannerSlide['text_align'] })}>
                              <option value="left">Canh trái</option>
                              <option value="center">Canh giữa</option>
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Màu chữ</span>
                            <select className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none" value={currentSlide.text_color} onChange={(e) => updateCurrentSlide({ text_color: e.target.value as BannerSlide['text_color'] })}>
                              <option value="light">Chữ sáng</option>
                              <option value="dark">Chữ tối</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vị trí ảnh desktop</span>
                            <select
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                              value={currentSlide.desktop_image_position}
                              onChange={(e) => updateCurrentSlide({ desktop_image_position: e.target.value as BannerSlide['desktop_image_position'] })}
                            >
                              <option value="left">Ưu tiên bên trái</option>
                              <option value="center">Giữa khung</option>
                              <option value="right">Ưu tiên bên phải</option>
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vị trí ảnh mobile</span>
                            <select
                              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                              value={currentSlide.mobile_image_position}
                              onChange={(e) => updateCurrentSlide({ mobile_image_position: e.target.value as BannerSlide['mobile_image_position'] })}
                            >
                              <option value="left">Ưu tiên bên trái</option>
                              <option value="center">Giữa khung</option>
                              <option value="right">Ưu tiên bên phải</option>
                            </select>
                          </label>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                          <input type="checkbox" checked={currentSlide.is_active} onChange={(e) => updateCurrentSlide({ is_active: e.target.checked })} />
                          <span className="text-sm font-medium text-foreground">Hiển thị slide này trong carousel</span>
                        </label>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        Chưa có slide nào. Bấm <span className="font-semibold text-foreground">Thêm slide</span> để tạo banner trượt đầu tiên.
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <label className="space-y-2">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Type size={14} /> Tiêu đề chính
                      </span>
                      <textarea
                        className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder={'Ví dụ:\nSTEAM\nOFFLINE MODE'}
                      />
                      <p className="text-xs text-muted-foreground">Có thể xuống dòng bằng phím Enter để tạo layout chữ như banner hiện tại.</p>
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Badge nhỏ / nhãn nổi</span>
                        <input
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.badge_text}
                          onChange={(e) => setForm((prev) => ({ ...prev, badge_text: e.target.value }))}
                          placeholder="Ví dụ: CHỈ TỪ 49K"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dòng phụ / pill phụ</span>
                        <input
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.subtitle}
                          onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                          placeholder="Ví dụ: SIÊU TỐI ƯU"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          <Link2 size={14} /> Link khi click banner
                        </span>
                        <input
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.target_url}
                          onChange={(e) => setForm((prev) => ({ ...prev, target_url: e.target.value }))}
                          placeholder="/category/ai-tri-tue-nhan-tao hoặc https://..."
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alt text cho ảnh</span>
                        <input
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.alt_text}
                          onChange={(e) => setForm((prev) => ({ ...prev, alt_text: e.target.value }))}
                          placeholder="Mô tả ngắn để SEO và trợ năng"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kiểu overlay</span>
                        <select
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.overlay_preset}
                          onChange={(e) => setForm((prev) => ({ ...prev, overlay_preset: e.target.value as Banner['overlay_preset'] }))}
                        >
                          <option value="dark-left">Tối đậm từ trái</option>
                          <option value="dark-soft">Tối nhẹ</option>
                          <option value="accent-red">Ánh đỏ</option>
                          <option value="accent-blue">Ánh xanh</option>
                          <option value="none">Không phủ màu</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Canh chữ</span>
                        <select
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.text_align}
                          onChange={(e) => setForm((prev) => ({ ...prev, text_align: e.target.value as Banner['text_align'] }))}
                        >
                          <option value="left">Canh trái</option>
                          <option value="center">Canh giữa</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Màu chữ</span>
                        <select
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.text_color}
                          onChange={(e) => setForm((prev) => ({ ...prev, text_color: e.target.value as Banner['text_color'] }))}
                        >
                          <option value="light">Chữ sáng</option>
                          <option value="dark">Chữ tối</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vị trí ảnh desktop</span>
                        <select
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.desktop_image_position}
                          onChange={(e) => setForm((prev) => ({ ...prev, desktop_image_position: e.target.value as Banner['desktop_image_position'] }))}
                        >
                          <option value="left">Ưu tiên bên trái</option>
                          <option value="center">Giữa khung</option>
                          <option value="right">Ưu tiên bên phải</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vị trí ảnh mobile</span>
                        <select
                          className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                          value={form.mobile_image_position}
                          onChange={(e) => setForm((prev) => ({ ...prev, mobile_image_position: e.target.value as Banner['mobile_image_position'] }))}
                        >
                          <option value="left">Ưu tiên bên trái</option>
                          <option value="center">Giữa khung</option>
                          <option value="right">Ưu tiên bên phải</option>
                        </select>
                      </label>
                    </div>
                  </>
                )}

                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Hiển thị banner này ngoài trang chủ</p>
                    <p className="text-xs text-muted-foreground">Tắt đi nếu muốn ẩn tạm slot mà vẫn giữ nguyên nội dung để sửa sau.</p>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ảnh banner</span>
                  <div className="overflow-hidden rounded-3xl border border-border bg-secondary/20">
                    <div className="relative" style={{ aspectRatio: String(currentMeta.desktopAspectRatio) }}>
                      {currentDesktopImage ? (
                        <>
                          <img
                            src={resolveImageUrl(currentDesktopImage)}
                            alt={(form.slot_key === 'hero_main' ? currentSlide?.alt_text : form.alt_text) || currentMeta.label}
                            className={`h-full w-full object-cover ${
                              form.slot_key === 'hero_main' && currentSlide
                                ? getObjectPositionClass(currentSlide.desktop_image_position)
                                : getObjectPositionClass(form.desktop_image_position)
                            }`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/35 opacity-0 transition-opacity hover:opacity-100">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900">
                              {uploading ? (
                                <RefreshCcw size={16} className="animate-spin text-primary" />
                              ) : (
                                <Upload size={16} />
                              )}
                              Đổi ảnh
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], { device: 'desktop', scope: form.slot_key === 'hero_main' ? 'slide' : 'banner' })} />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (form.slot_key === 'hero_main' && editingSlideIndex != null) {
                                  updateCurrentSlide({ image_url: '' });
                                } else {
                                  setForm((prev) => ({ ...prev, image_url: '' }));
                                }
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                            >
                              <X size={16} />
                              Gỡ ảnh
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3">
                          {uploading ? <RefreshCcw className="animate-spin text-primary" size={26} /> : <Upload className="text-muted-foreground" size={26} />}
                          <span className="text-sm font-semibold text-muted-foreground">Tải ảnh banner lên</span>
                          <span className="text-xs text-muted-foreground">Ảnh nên đúng tỉ lệ để dễ căn chữ và không bị cắt xấu.</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], { device: 'desktop', scope: form.slot_key === 'hero_main' ? 'slide' : 'banner' })} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ảnh mobile</span>
                  <div className="overflow-hidden rounded-3xl border border-border bg-secondary/20">
                    <div className="relative" style={{ aspectRatio: String(currentMeta.mobileAspectRatio) }}>
                      {currentMobileImage ? (
                        <>
                          <img
                            src={resolveImageUrl(currentMobileImage)}
                            alt={(form.slot_key === 'hero_main' ? currentSlide?.alt_text : form.alt_text) || `${currentMeta.label} mobile`}
                            className={`h-full w-full object-cover ${
                              form.slot_key === 'hero_main' && currentSlide
                                ? getObjectPositionClass(currentSlide.mobile_image_position)
                                : getObjectPositionClass(form.mobile_image_position)
                            }`}
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/35 opacity-0 transition-opacity hover:opacity-100">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900">
                              {uploading ? (
                                <RefreshCcw size={16} className="animate-spin text-primary" />
                              ) : (
                                <Upload size={16} />
                              )}
                              Đổi ảnh
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], { device: 'mobile', scope: form.slot_key === 'hero_main' ? 'slide' : 'banner' })} />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (form.slot_key === 'hero_main' && editingSlideIndex != null) {
                                  updateCurrentSlide({ image_url_mobile: '' });
                                } else {
                                  setForm((prev) => ({ ...prev, image_url_mobile: '' }));
                                }
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                            >
                              <X size={16} />
                              Gỡ ảnh
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3">
                          {uploading ? <RefreshCcw className="animate-spin text-primary" size={26} /> : <Upload className="text-muted-foreground" size={26} />}
                          <span className="text-sm font-semibold text-muted-foreground">Tải ảnh mobile lên</span>
                          <span className="text-xs text-muted-foreground">Ảnh mobile sẽ được cắt theo tỉ lệ riêng để hiển thị tối ưu trên điện thoại.</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], { device: 'mobile', scope: form.slot_key === 'hero_main' ? 'slide' : 'banner' })} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">Preview nhanh</p>
                    {form.target_url ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <ExternalLink size={12} />
                        Có link đính kèm
                      </span>
                    ) : null}
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card" style={{ aspectRatio: String(currentMeta.desktopAspectRatio) }}>
                    {currentDesktopImage ? (
                      <img
                        src={resolveImageUrl(currentDesktopImage)}
                        alt={(form.slot_key === 'hero_main' ? currentSlide?.alt_text : form.alt_text) || currentMeta.label}
                        className={`h-full w-full object-cover ${
                          form.slot_key === 'hero_main' && currentSlide
                            ? getObjectPositionClass(currentSlide.desktop_image_position)
                            : getObjectPositionClass(form.desktop_image_position)
                        }`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/40 text-muted-foreground">
                        <ImageIcon size={28} />
                      </div>
                    )}

                    <div
                      className={`absolute inset-0 ${getOverlayPreviewClass(
                        form.slot_key === 'hero_main' && currentSlide ? currentSlide.overlay_preset : form.overlay_preset
                      )}`}
                    />

                    <div
                      className={`absolute inset-0 flex flex-col justify-center gap-2 p-5 ${
                        (form.slot_key === 'hero_main' && currentSlide ? currentSlide.text_align : form.text_align) === 'center'
                          ? 'items-center text-center'
                          : 'items-start text-left'
                      } ${(form.slot_key === 'hero_main' && currentSlide ? currentSlide.text_color : form.text_color) === 'light' ? 'text-white' : 'text-slate-950'}`}
                    >
                      {(form.slot_key === 'hero_main' ? currentSlide?.badge_text : form.badge_text) ? (
                        <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          {form.slot_key === 'hero_main' ? currentSlide?.badge_text : form.badge_text}
                        </span>
                      ) : null}
                      <div className="space-y-0.5">
                        {(form.slot_key === 'hero_main' ? currentSlide?.title || '' : form.title).split('\n').filter(Boolean).map((line, index) => (
                          <p key={`${line}-${index}`} className="text-lg font-black leading-none md:text-xl">
                            {line}
                          </p>
                        ))}
                      </div>
                      {(form.slot_key === 'hero_main' ? currentSlide?.subtitle : form.subtitle) ? (
                        <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] backdrop-blur-sm">
                          {form.slot_key === 'hero_main' ? currentSlide?.subtitle : form.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveBanner}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                  {form.id ? 'Lưu cập nhật banner' : 'Tạo banner cho slot này'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="text-base font-bold">Checklist nội dung để dễ edit về sau</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                'Tên quản trị nên mô tả đúng vị trí để team dễ tìm khi sửa.',
                'Tiêu đề có thể xuống dòng, rất hữu ích với banner chính và banner phải.',
                'Alt text nên mô tả nội dung ảnh để hỗ trợ SEO và trợ năng.',
                'Link click nên là slug nội bộ nếu muốn dẫn người dùng sang category/sản phẩm.',
                'Overlay giúp chữ dễ đọc khi ảnh nền nhiều chi tiết.',
                'Có thể tắt hiển thị tạm thời bằng checkbox thay vì xóa dữ liệu.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                  <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {cropSource ? (
        <CropModal
          imageSrc={cropSource.src}
          onCrop={handleCropConfirm}
          onClose={() => setCropSource(null)}
          aspectRatio={cropSource.target.device === 'mobile' ? currentMeta.mobileAspectRatio : currentMeta.desktopAspectRatio}
          outputWidth={cropSource.target.device === 'mobile' ? 1200 : 2400}
          title={`Cắt ảnh ${currentMeta.label} ${cropSource.target.device === 'mobile' ? 'mobile' : 'desktop'}`}
        />
      ) : null}
    </div>
  );
}
