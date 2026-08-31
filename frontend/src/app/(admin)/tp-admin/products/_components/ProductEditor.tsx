'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bold,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Italic,
  Plus,
  Save,
  Tag,
  Trash2,
  Upload,
  XCircle,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

import CropModal from './CropModal';
import RichTextEditor from '../../_components/RichTextEditor';

type VariantStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'HIDDEN';

type Variant = {
  id?: number | string;
  name: string;
  price: number;
  cost_price: number;
  stock_count: number;
  status: VariantStatus;
  attribute_values: Record<string, string>;
  delivery_type: 'AUTO' | 'MANUAL';
  max_per_order: number;
  required_inputs: { id: string; label: string; type: 'text' | 'textarea'; required: boolean; placeholder: string }[];
};

type Attribute = {
  name: string;
  values: string[];
};

type Category = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  subCategories?: Category[];
};

type ProductForm = {
  name: string;
  slug: string;
  category_id: number | null;
  thumbnail: string;
  images: string[];
  description: string;
  tagline: string;
  internal_note: string;
  info_html: string;
  is_active: boolean;
  show_rating: boolean;
  show_sold_count: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  schema_brand: string;
  schema_sku: string;
  schema_gtin: string;
  schema_mpn: string;
  attributes: Attribute[];
  variants: Variant[];
  features: { text: string; type: 'check' | 'cross' }[];
};

type Tab = 'info' | 'content' | 'seo';

const emptyForm: ProductForm = {
  name: '',
  slug: '',
  category_id: null,
  thumbnail: '',
  images: [],
  description: '',
  tagline: '',
  internal_note: '',
  info_html: '',
  is_active: true,
  show_rating: true,
  show_sold_count: true,
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  canonical_url: '',
  og_title: '',
  og_description: '',
  og_image: '',
  schema_brand: '',
  schema_sku: '',
  schema_gtin: '',
  schema_mpn: '',
  attributes: [],
  variants: [],
  features: [],
};

const getFullUrl = (url: string) => {
  return resolveMediaUrl(url, '');
};

export default function ProductEditor({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as Tab;
      if (tab === 'info' || tab === 'content' || tab === 'seo') return tab;
    }
    return 'info';
  });
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<{ src: string; field: keyof ProductForm | 'gallery'; fileName: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activeTab === 'info') url.searchParams.delete('tab');
    else url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiFetch('/categories');
        if (res.success) setCategories(res.data || []);
      } catch {}
    };

    loadCategories();
  }, []);

  const hierarchicalCategories = useMemo(() => {
    const result: { id: number; name: string; isChild: boolean; hasChildren: boolean }[] = [];

    const flatten = (items: Category[], level = 0) => {
      items.forEach((cat) => {
        result.push({
          id: cat.id,
          name: cat.name,
          isChild: level > 0,
          hasChildren: Boolean(cat.subCategories?.length),
        });
        if (cat.subCategories?.length) flatten(cat.subCategories, level + 1);
      });
    };

    flatten(categories);
    return result;
  }, [categories]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/admin/products/${productId}`);
        if (!res.success || cancelled) return;

        const product = res.data;
        setForm({
          ...emptyForm,
          ...product,
          internal_note: product.internal_note || '',
          is_active: Boolean(product.is_active),
          show_rating: product.show_rating !== false && product.show_rating !== 0,
          show_sold_count: product.show_sold_count !== false && product.show_sold_count !== 0,
          images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
          attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : [],
          features: product.features
            ? typeof product.features === 'string'
              ? JSON.parse(product.features)
              : Array.isArray(product.features)
                ? product.features
                : []
            : [],
          variants: Array.isArray(product.variants)
            ? product.variants.map((variant: Record<string, unknown>) => ({
                ...variant,
                price: Number(variant.price || 0),
                cost_price: Number(variant.cost_price || 0),
                stock_count: Number(variant.stock_count || 0),
                max_per_order: Number(variant.max_per_order || 0),
                delivery_type: variant.delivery_type === 'MANUAL' ? 'MANUAL' : 'AUTO',
                required_inputs: Array.isArray(variant.required_inputs) ? variant.required_inputs : [],
                attribute_values:
                  typeof variant.attribute_values === 'string'
                    ? JSON.parse(variant.attribute_values)
                    : (variant.attribute_values as Record<string, string>) || {},
              }))
            : [],
        });
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Không thể tải sản phẩm');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleImageUpload = (file: File, field: keyof ProductForm | 'gallery') => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn, tối đa 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropSource({ src: reader.result as string, field, fileName: file.name });
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (base64Data: string) => {
    if (!cropSource) return;

    const { field, fileName } = cropSource;
    setCropSource(null);
    setUploading(field);

    try {
      const res = await apiFetch('/upload/base64', {
        method: 'POST',
        body: JSON.stringify({ base64Data, fileName: `cropped_${fileName.split('.')[0]}.png` }),
      });

      if (!res.success) return;

      if (field === 'gallery') {
        setForm((prev) => ({ ...prev, images: [...prev.images, res.url] }));
      } else {
        setForm((prev) => ({ ...prev, [field]: res.url }));
      }

      toast.success('Đã tải lên ảnh');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi upload ảnh');
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Vui lòng nhập tên và slug sản phẩm');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        attributes: form.attributes
          .map((attribute) => ({
            ...attribute,
            values: attribute.values.map((value) => value.trim()).filter(Boolean),
          }))
          .filter((attribute) => attribute.name.trim() || attribute.values.length > 0),
      };

      if (isEdit) {
        await apiFetch(`/admin/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Cập nhật thành công');
      } else {
        await apiFetch('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Tạo sản phẩm thành công');
      }

      router.push('/tp-admin/products');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lưu sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-card" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  const variantCount = form.variants.length;

  const tabClass = (tab: Tab) =>
    `flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${
      activeTab === tab
        ? 'border-primary bg-primary/5 text-primary'
        : 'border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
    } -mb-[1px]`;

  return (
    <>
      <div className="">
        <div className="flex overflow-hidden rounded-t-2xl border-x border-t border-border bg-card shadow-sm">
          <button onClick={() => setActiveTab('info')} className={tabClass('info')}>
            <Info size={18} /> Thông tin chung
          </button>
          <button onClick={() => setActiveTab('content')} className={tabClass('content')}>
            <FileText size={18} /> Nội dung
          </button>
          <button onClick={() => setActiveTab('seo')} className={tabClass('seo')}>
            <Globe size={18} /> SEO & Schema
          </button>
        </div>

        <div className="min-h-[400px] rounded-b-2xl border border-border bg-card p-6 shadow-sm">
          {activeTab === 'info' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Tên sản phẩm *</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
                    placeholder="Ví dụ: MacBook Air M2 13 inch..."
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">Slug (URL) *</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-xs outline-none transition-all focus:ring-2 focus:ring-primary/20"
                    placeholder="vi-du-slug-san-pham"
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Danh mục sản phẩm</label>
                  <select
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-medium outline-none transition-all focus:ring-2 focus:ring-primary/20"
                    value={form.category_id || ''}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, category_id: event.target.value ? Number(event.target.value) : null }))
                    }
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {hierarchicalCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                        disabled={category.hasChildren}
                        className={category.isChild ? 'pl-4 italic' : 'font-bold'}
                      >
                        {category.isChild ? '-> ' : ''}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">Ảnh đại diện (Thumbnail)</label>
                  <div className="flex gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-2">
                      {form.thumbnail ? (
                        <>
                          <img
                            src={getFullUrl(form.thumbnail)}
                            alt="thumb"
                            className="h-full w-full rounded-xl object-contain"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, thumbnail: '' }))}
                              className="rounded-lg bg-red-500 p-1.5 text-white"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center transition-colors hover:bg-primary/5">
                          {uploading === 'thumbnail' ? (
                            <RefreshCcw size={20} className="animate-spin text-primary" />
                          ) : (
                            <Plus size={20} className="text-muted-foreground" />
                          )}
                          <span className="mt-1 text-[10px] font-bold text-muted-foreground">
                            {uploading === 'thumbnail' ? 'UPLOADING' : 'UPLOAD'}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0], 'thumbnail')}
                          />
                        </label>
                      )}
                    </div>

                    <input
                      className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-xs outline-none transition-all focus:ring-2 focus:ring-primary/10"
                      placeholder="Link anh..."
                      value={form.thumbnail}
                      onChange={(event) => setForm((prev) => ({ ...prev, thumbnail: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <label className="text-sm font-bold">Phân loại / biến thể</label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isEdit
                        ? `Đang có ${variantCount} biến thể. Quản lý giá, kho và thiết lập bán hàng ở trang riêng.`
                        : 'Sau khi tạo sản phẩm, bạn có thể vào trang biến thể để thêm giá, kho và các tùy chọn muốn bán.'}
                    </p>
                  </div>

                  {isEdit ? (
                    <Link
                      href={`/tp-admin/products/${productId}/variants`}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90"
                    >
                      Quản lý biến thể
                    </Link>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-xl border border-dashed border-border px-4 py-2.5 text-xs font-bold text-muted-foreground">
                      Cần lưu sản phẩm trước
                    </span>
                  )}
                </div>
              </div>


              <div className="space-y-4 border-t border-border pt-6">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <CheckCircle2 size={16} /> Đặc điểm & tiện ích
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {form.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const nextFeatures = [...form.features];
                          nextFeatures[index].type = nextFeatures[index].type === 'check' ? 'cross' : 'check';
                          setForm((prev) => ({ ...prev, features: nextFeatures }));
                        }}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          feature.type === 'check' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {feature.type === 'check' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      </button>

                      <input
                        className="flex-1 rounded-xl border border-border bg-background px-4 py-2 text-sm outline-none"
                        value={feature.text}
                        onChange={(event) => {
                          const nextFeatures = [...form.features];
                          nextFeatures[index].text = event.target.value;
                          setForm((prev) => ({ ...prev, features: nextFeatures }));
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, features: prev.features.filter((_, featureIndex) => featureIndex !== index) }))}
                        className="p-2 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, features: [...prev.features, { text: '', type: 'check' }] }))}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2 text-xs font-black text-muted-foreground transition-all hover:text-primary"
                  >
                    <Plus size={16} /> THÊM ĐẶC ĐIỂM
                  </button>
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <ImageIcon size={16} /> Bộ sưu tập ảnh
                </label>
                <div className="flex flex-wrap gap-4">
                  {form.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-border bg-secondary/20 p-2">
                      <img
                        src={getFullUrl(image)}
                        alt={`gallery-${index}`}
                        className="h-full w-full rounded-xl object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, images: prev.images.filter((_, imageIndex) => imageIndex !== index) }))}
                          className="rounded-lg bg-red-500 p-1.5 text-white"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-all hover:bg-primary/5 hover:text-primary">
                    {uploading === 'gallery' ? (
                      <RefreshCcw size={20} className="animate-spin text-primary" />
                    ) : (
                      <Upload size={20} />
                    )}
                    <span className="mt-1 text-[10px] font-bold">{uploading === 'gallery' ? 'UPLOADING' : 'ADD'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => event.target.files?.[0] && handleImageUpload(event.target.files[0], 'gallery')}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <label className="text-sm font-bold">Tagline</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-black uppercase tracking-wider text-primary outline-none"
                  value={form.tagline}
                  onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Ghi chú nội bộ cho admin</label>
                <textarea
                  className="min-h-28 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 outline-none"
                  placeholder="Ghi chú riêng cho admin. Phần này không hiển thị cho user."
                  value={form.internal_note}
                  onChange={(event) => setForm((prev) => ({ ...prev, internal_note: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Chỉ admin thấy trong trang quản trị sản phẩm.</p>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-6 w-6 cursor-pointer rounded-md border-border text-primary"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                  />
                  <span className="flex items-center gap-2 text-sm font-bold transition-colors group-hover:text-primary">
                    {form.is_active ? <Eye size={18} className="text-green-500" /> : <EyeOff size={18} className="text-red-500" />}
                    Hiển thị sản phẩm công khai
                  </span>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer rounded-md border-border text-primary"
                      checked={form.show_rating}
                      onChange={(event) => setForm((prev) => ({ ...prev, show_rating: event.target.checked }))}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold transition-colors group-hover:text-primary">Hiển thị số sao</p>
                      <p className="text-xs text-muted-foreground">Ẩn/hiện điểm đánh giá trên trang sản phẩm</p>
                    </div>
                  </label>

                  <label className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer rounded-md border-border text-primary"
                      checked={form.show_sold_count}
                      onChange={(event) => setForm((prev) => ({ ...prev, show_sold_count: event.target.checked }))}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold transition-colors group-hover:text-primary">Hiển thị lượt bán</p>
                      <p className="text-xs text-muted-foreground">Ẩn/hiện số lượng đã bán trên trang sản phẩm</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <FileText size={16} /> Mô tả tóm tắt
                </label>
                <textarea
                  className="min-h-24 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 shadow-inner outline-none focus:border-primary/50 transition-all"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>

               <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <Tag size={16} /> Nội dung chi tiết
                  </label>

                  <div className="flex gap-1 rounded-xl border border-border bg-secondary/50 p-1">
                    <button
                      type="button"
                      onClick={() => setEditorMode('visual')}
                      className={`rounded-md px-4 py-1.5 text-[10px] font-black transition-all ${
                        editorMode === 'visual' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      VISUAL (SOẠN THẢO)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('code')}
                      className={`rounded-md px-4 py-1.5 text-[10px] font-black transition-all ${
                        editorMode === 'code' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      CODE (MÃ NGUỒN HTML)
                    </button>
                  </div>
                </div>

                {editorMode === 'visual' ? (
                  <RichTextEditor 
                    content={form.info_html} 
                    onChange={(html) => setForm({ ...form, info_html: html })} 
                  />
                ) : (
                  <textarea
                    id="info_html_area"
                    className="min-h-[400px] w-full rounded-xl border border-border bg-background px-4 py-4 font-mono text-sm leading-relaxed shadow-inner outline-none focus:border-primary/50 transition-all"
                    value={form.info_html}
                    onChange={(event) => setForm((prev) => ({ ...prev, info_html: event.target.value }))}
                    placeholder="Nhập mã nguồn HTML..."
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">SEO Title</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                    value={form.seo_title}
                    onChange={(event) => setForm((prev) => ({ ...prev, seo_title: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">SEO Keywords</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                    value={form.seo_keywords}
                    onChange={(event) => setForm((prev) => ({ ...prev, seo_keywords: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">SEO Description</label>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                  value={form.seo_description}
                  onChange={(event) => setForm((prev) => ({ ...prev, seo_description: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Canonical URL</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                    value={form.canonical_url}
                    onChange={(event) => setForm((prev) => ({ ...prev, canonical_url: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">OG Image</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                    value={form.og_image}
                    onChange={(event) => setForm((prev) => ({ ...prev, og_image: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">OG Title</label>
                  <input
                    className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                    value={form.og_title}
                    onChange={(event) => setForm((prev) => ({ ...prev, og_title: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">OG Description</label>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                    value={form.og_description}
                    onChange={(event) => setForm((prev) => ({ ...prev, og_description: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-border bg-secondary/10 p-5">
                <div>
                  <h3 className="text-sm font-bold">Schema / Structured Data</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bổ sung thông tin thương hiệu và mã định danh để tạo rich result tốt hơn.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Brand</label>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                      value={form.schema_brand}
                      onChange={(event) => setForm((prev) => ({ ...prev, schema_brand: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">SKU</label>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                      value={form.schema_sku}
                      onChange={(event) => setForm((prev) => ({ ...prev, schema_sku: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">GTIN</label>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                      value={form.schema_gtin}
                      onChange={(event) => setForm((prev) => ({ ...prev, schema_gtin: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">MPN</label>
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-2 outline-none"
                      value={form.schema_mpn}
                      onChange={(event) => setForm((prev) => ({ ...prev, schema_mpn: event.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm mt-6">
          <button onClick={() => router.back()} className="rounded-xl px-6 py-2.5 font-bold transition-all hover:bg-secondary">
            HỦY BỎ
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-10 py-2.5 font-black text-white shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Save className="animate-spin" size={20} /> : <Save size={20} />}
            {isEdit ? 'LƯU THAY ĐỔI' : 'TẠO SẢN PHẨM'}
          </button>
        </div>
      </div>

      {cropSource && <CropModal imageSrc={cropSource.src} onCrop={handleCropConfirm} onClose={() => setCropSource(null)} />}
    </>
  );
}
