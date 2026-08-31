'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { Globe, Image as ImageIcon, RefreshCcw, Save, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

type SiteSettings = {
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

const EMPTY_SETTINGS: SiteSettings = {
  site_name: '',
  site_title: '',
  site_description: '',
  site_keywords: '',
  og_title: '',
  og_description: '',
  og_image_url: '',
  favicon_url: '',
  deposit_enabled: true,
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Kh\u00f4ng th\u1ec3 \u0111\u1ecdc t\u1ec7p'));
    reader.readAsDataURL(file);
  });
}

export default function AdminSeoPage() {
  const { setSettings } = useSiteSettings();
  const [form, setForm] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'og_image_url' | 'favicon_url' | ''>('');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ data: SiteSettings }>('/admin/site-settings');
      const nextSettings = response.data || EMPTY_SETTINGS;
      setForm(nextSettings);
      setSettings((prev) => ({ ...prev, ...nextSettings }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh SEO');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, field: 'og_image_url' | 'favicon_url') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploadingField(field);
      const base64Data = await fileToBase64(file);
      const response = await apiFetch<{ url: string; success: boolean }>('/upload/base64', {
        method: 'POST',
        body: JSON.stringify({
          base64Data,
          fileName: `${field}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
        }),
      });

      setForm((prev) => ({ ...prev, [field]: response.url }));
      toast.success('\u0110\u00e3 t\u1ea3i \u1ea3nh l\u00ean');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c \u1ea3nh');
    } finally {
      setUploadingField('');
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await apiFetch<{ data: SiteSettings }>('/admin/site-settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      const nextSettings = response.data || form;
      setForm(nextSettings);
      setSettings((prev) => ({ ...prev, ...nextSettings }));
      toast.success('\u0110\u00e3 l\u01b0u c\u1ea5u h\u00ecnh SEO');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c c\u1ea5u h\u00ecnh SEO');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">SEO website</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {'Qu\u1ea3n l\u00fd title, description, keywords, \u1ea3nh chia s\u1ebb li\u00ean k\u1ebft v\u00e0 favicon cho to\u00e0n b\u1ed9 website.'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadSettings}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          <RefreshCcw size={16} />
          {'T\u1ea3i l\u1ea1i'}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6 rounded-3xl border border-border bg-card p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{'T\u00ean website'}</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.site_name}
                onChange={(e) => setForm((prev) => ({ ...prev, site_name: e.target.value }))}
                placeholder="VEXTRO"
                disabled={loading}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{'Title m\u1eb7c \u0111\u1ecbnh'}</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.site_title}
                onChange={(e) => setForm((prev) => ({ ...prev, site_title: e.target.value }))}
                placeholder={'VEXTRO - Ch\u1ee3 s\u1ea3n ph\u1ea9m s\u1ed1...'}
                disabled={loading}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meta description</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              value={form.site_description}
              onChange={(e) => setForm((prev) => ({ ...prev, site_description: e.target.value }))}
              disabled={loading}
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Keywords</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              value={form.site_keywords}
              onChange={(e) => setForm((prev) => ({ ...prev, site_keywords: e.target.value }))}
              placeholder={'vextro, t\u00e0i kho\u1ea3n premium, ...'}
              disabled={loading}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">OG title</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.og_title}
                onChange={(e) => setForm((prev) => ({ ...prev, og_title: e.target.value }))}
                disabled={loading}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Favicon URL</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.favicon_url}
                onChange={(e) => setForm((prev) => ({ ...prev, favicon_url: e.target.value }))}
                disabled={loading}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">OG description</span>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              value={form.og_description}
              onChange={(e) => setForm((prev) => ({ ...prev, og_description: e.target.value }))}
              disabled={loading}
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">OG image URL</span>
            <input
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
              value={form.og_image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, og_image_url: e.target.value }))}
              disabled={loading}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
              {uploadingField === 'og_image_url' ? (
                <RefreshCcw size={16} className="animate-spin text-primary" />
              ) : (
                <ImageIcon size={16} />
              )}
              {uploadingField === 'og_image_url' ? '\u0110ang t\u1ea3i OG image...' : 'T\u1ea3i OG image'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'og_image_url')} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
              {uploadingField === 'favicon_url' ? (
                <RefreshCcw size={16} className="animate-spin text-primary" />
              ) : (
                <Globe size={16} />
              )}
              {uploadingField === 'favicon_url' ? '\u0110ang t\u1ea3i favicon...' : 'T\u1ea3i favicon'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'favicon_url')} />
            </label>
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
            <div>
              <p className="text-sm font-semibold">{'Bật nạp tiền'}</p>
              <p className="text-xs text-muted-foreground">
                {'Khi tắt, người dùng không thể nạp thêm nhưng vẫn dùng được số dư hiện có.'}
              </p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={!!form.deposit_enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, deposit_enabled: e.target.checked }))}
              disabled={loading}
            />
          </label>

          <button
            type="button"
            onClick={saveSettings}
            disabled={loading || saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {'L\u01b0u c\u1ea5u h\u00ecnh SEO'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{'Xem tr\u01b0\u1edbc k\u1ebft qu\u1ea3 t\u00ecm ki\u1ebfm'}</h3>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-lg font-medium text-blue-600 line-clamp-2">{form.site_title || form.site_name}</p>
              <p className="mt-1 text-xs text-green-700">{process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://vextro.vn'}</p>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-4">
                {form.site_description || 'Meta description c\u1ee7a website s\u1ebd hi\u1ec3n th\u1ecb t\u1ea1i \u0111\u00e2y.'}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{'Xem tr\u01b0\u1edbc chia s\u1ebb li\u00ean k\u1ebft'}</h3>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="aspect-[1.91/1] bg-secondary/30">
                {form.og_image_url ? (
                  <img src={resolveMediaUrl(form.og_image_url)} alt={form.og_title || form.site_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">{'Ch\u01b0a c\u00f3 OG image'}</div>
                )}
              </div>
              <div className="space-y-2 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{form.site_name || 'Website'}</p>
                <p className="text-base font-bold text-foreground">{form.og_title || form.site_title || 'OG title'}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {form.og_description || form.site_description || 'OG description s\u1ebd hi\u1ec3n th\u1ecb t\u1ea1i \u0111\u00e2y.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <h3 className="text-base font-bold">{'L\u01b0u \u00fd'}</h3>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>{'OG image l\u00e0 \u1ea3nh thumbnail khi chia s\u1ebb li\u00ean k\u1ebft website l\u00ean Facebook, Zalo, Discord...'}</p>
              <p>{'Keywords n\u00ean \u0111\u01b0\u1ee3c nh\u1eadp b\u1eb1ng d\u1ea5u ph\u1ea9y \u0111\u1ec3 gi\u1eef c\u1ea5u tr\u00fac r\u00f5 r\u00e0ng.'}</p>
              <p>{'N\u1ebfu b\u1ecf tr\u1ed1ng OG title ho\u1eb7c OG description, frontend s\u1ebd t\u1ef1 d\u00f9ng title v\u00e0 description ch\u00ednh.'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
