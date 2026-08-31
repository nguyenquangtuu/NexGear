'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Eye, EyeOff, Link2, Image as ImageIcon,
  Bold, Italic, Link as LinkIcon, FileText, Upload, X, RefreshCcw
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { resolveMediaUrl } from '@/lib/media';
import CropModal from '../../products/_components/CropModal';
import RichTextEditor from '../../_components/RichTextEditor';

interface PostForm {
  title: string;
  slug: string;
  content: string;
  thumbnail: string;
  status: 'PUBLIC' | 'LINK_ONLY' | 'HIDDEN';
  showThumbnailInContent: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

interface PostEditorProps {
  initialData?: PostForm;
  isEdit?: boolean;
  postId?: string;
}

export default function PostEditor({ initialData, isEdit, postId }: PostEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string } | null>(null);

  const [formData, setFormData] = useState<PostForm>({
    title: initialData?.title ?? '',
    slug: initialData?.slug ?? '',
    content: initialData?.content ?? '',
    thumbnail: initialData?.thumbnail ?? '',
    status: initialData?.status ?? 'PUBLIC',
    showThumbnailInContent: initialData?.showThumbnailInContent ?? false,
    seoTitle: initialData?.seoTitle ?? '',
    seoDescription: initialData?.seoDescription ?? '',
    seoKeywords: initialData?.seoKeywords ?? '',
    canonicalUrl: initialData?.canonicalUrl ?? '',
    ogTitle: initialData?.ogTitle ?? '',
    ogDescription: initialData?.ogDescription ?? '',
    ogImage: initialData?.ogImage ?? '',
  });

  // The RichTextEditor handles internal content sync now.

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title ?? '',
        slug: initialData.slug ?? '',
        content: initialData.content ?? '',
        thumbnail: initialData.thumbnail ?? '',
        status: initialData.status ?? 'PUBLIC',
        showThumbnailInContent: initialData.showThumbnailInContent ?? false,
        seoTitle: initialData.seoTitle ?? '',
        seoDescription: initialData.seoDescription ?? '',
        seoKeywords: initialData.seoKeywords ?? '',
        canonicalUrl: initialData.canonicalUrl ?? '',
        ogTitle: initialData.ogTitle ?? '',
        ogDescription: initialData.ogDescription ?? '',
        ogImage: initialData.ogImage ?? '',
      });
    }
  }, [initialData]);

  const generateSlug = (title: string) => {
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/([^0-9a-z-\s])/g, '')
      .replace(/(\s+)/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({ ...prev, title, slug }));
  };

  // Deprecated manual commands removed.

  const handleImageUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ảnh quá lớn (tối đa 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource({ src: reader.result as string, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (base64Data: string) => {
    if (!cropSource) return;
    const { fileName } = cropSource;
    setCropSource(null);
    setUploading(true);
    try {
      const res = await apiFetch('/upload/base64', {
        method: 'POST',
        body: JSON.stringify({ base64Data, fileName: `post_${Date.now()}_${fileName.split('.')[0]}.jpg` }),
      });
      if (res.success) {
        setFormData((prev) => ({ ...prev, thumbnail: res.url }));
        toast.success('Đã tải lên ảnh');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  // Deprecated manual HTML insertion removed.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isEdit ? `/posts/${postId}` : '/posts';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...formData,
          ogImage: formData.ogImage || formData.thumbnail,
          ogTitle: formData.ogTitle || formData.seoTitle || formData.title,
        }),
      });
      if (res.success) {
        router.push('/tp-admin/posts');
      }
    } catch (error) {
      console.error('Failed to save post', error);
      alert('Lỗi khi lưu bài viết. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/tp-admin/posts"
            className="p-2.5 bg-card border border-border hover:bg-secondary rounded-xl text-muted-foreground transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black">{isEdit ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</h1>
            <p className="text-sm text-muted-foreground">{isEdit ? 'Cập nhật nội dung bài viết.' : 'Tạo bài viết mới cho blog.'}</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Save size={20} /> {loading ? 'Đang lưu...' : isEdit ? 'Cập nhật bài viết' : 'Lưu bài viết'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="space-y-2">
              <label className="text-sm font-bold px-1">Tiêu đề bài viết</label>
              <input 
                type="text"
                required
                placeholder="Nhập tiêu đề..."
                value={formData.title}
                onChange={(e) => generateSlug(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold px-1">Đường dẫn (Slug)</label>
              <div className="flex items-center gap-2 bg-secondary/30 border border-border/50 px-4 py-3 rounded-xl">
                <span className="text-muted-foreground text-xs font-medium">/blog/</span>
                <input 
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 bg-transparent border-none p-0 text-sm focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold px-1">Nội dung bài viết</label>
                <div className="flex bg-secondary/50 p-1 rounded-xl gap-1 border border-border">
                  <button 
                    type="button"
                    onClick={() => setEditorMode('visual')} 
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${editorMode === 'visual' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    CHẾ ĐỘ SOẠN THẢO (VISUAL)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditorMode('code')} 
                    className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${editorMode === 'code' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    XEM MÃ NGUỒN (HTML)
                  </button>
                </div>
              </div>

              {editorMode === 'visual' ? (
                <RichTextEditor 
                  content={formData.content} 
                  onChange={(html) => setFormData({ ...formData, content: html })} 
                />
              ) : (
                <textarea 
                  className="w-full px-6 py-4 border border-border rounded-xl bg-background min-h-[500px] outline-none font-mono text-sm leading-relaxed shadow-inner resize-none focus:border-primary/50 transition-all"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập mã nguồn HTML..."
                />
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-primary">{"SEO & Chia sẻ mạng xã hội"}</h2>
                <p className="text-sm text-muted-foreground">{"Tối ưu tiêu đề, mô tả và hình ảnh hiển thị khi chia sẻ bài viết."}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold px-1">SEO Title</label>
                <input
                  type="text"
                  value={formData.seoTitle ?? ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, seoTitle: e.target.value }))}
                  className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Tiêu đề SEO riêng"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold px-1">Canonical URL</label>
                <input
                  type="url"
                  value={formData.canonicalUrl ?? ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
                  className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="https://your-domain.com/blog/slug"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold px-1">SEO Description</label>
              <textarea
                value={formData.seoDescription ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, seoDescription: e.target.value }))}
                className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-24"
                placeholder="Mô tả ngắn tối ưu tìm kiếm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold px-1">SEO Keywords</label>
              <input
                type="text"
                value={formData.seoKeywords ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, seoKeywords: e.target.value }))}
                className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="keyword 1, keyword 2, keyword 3"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold px-1">OG Title</label>
                <input
                  type="text"
                  value={formData.ogTitle ?? ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ogTitle: e.target.value }))}
                  className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="Tiêu đề khi chia sẻ"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold px-1">OG Image</label>
                <input
                  type="url"
                  value={formData.ogImage ?? ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ogImage: e.target.value }))}
                  className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold px-1">OG Description</label>
              <textarea
                value={formData.ogDescription ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ogDescription: e.target.value }))}
                className="w-full bg-secondary/50 border border-border/50 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-24"
                placeholder="Mô tả khi chia sẻ mạng xã hội"
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6 sticky top-24 shadow-sm">
            <div className="space-y-3">
              <label className="text-sm font-bold px-1">Trạng thái hiển thị</label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'PUBLIC' })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    formData.status === 'PUBLIC' 
                      ? 'bg-green-500/10 border-green-500 text-green-600 shadow-sm' 
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Eye size={18} />
                  <div className="text-left">
                    <p className="text-xs font-black">Công khai</p>
                    <p className="text-[10px] opacity-70">Ai cũng có thể thấy</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'LINK_ONLY' })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    formData.status === 'LINK_ONLY' 
                      ? 'bg-blue-500/10 border-blue-500 text-blue-600 shadow-sm' 
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Link2 size={18} />
                  <div className="text-left">
                    <p className="text-xs font-black">Chỉ người có link</p>
                    <p className="text-[10px] opacity-70">Không hiện trên danh sách</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'HIDDEN' })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    formData.status === 'HIDDEN' 
                      ? 'bg-red-500/10 border-red-500 text-red-600 shadow-sm' 
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <EyeOff size={18} />
                  <div className="text-left">
                    <p className="text-xs font-black">Ẩn bài viết</p>
                    <p className="text-[10px] opacity-70">Chỉ Admin mới có thể thấy</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <label className="text-sm font-bold px-1">Ảnh bìa (Thumbnail URL)</label>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-secondary/20 flex items-center justify-center shrink-0 relative group">
                    {formData.thumbnail ? (
                      <>
                        <img src={resolveMediaUrl(formData.thumbnail)} alt="Thumbnail" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button type="button" onClick={() => setFormData((prev) => ({ ...prev, thumbnail: '' }))} className="p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm">
                            <X size={16} className="text-white" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary">
                        {uploading ? <RefreshCcw className="animate-spin" size={20} /> : <Upload size={20} />}
                        <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={formData.thumbnail}
                        onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail: e.target.value }))}
                        className="w-full bg-secondary/50 border border-border/50 pl-11 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Có thể dán URL hoặc upload ảnh rồi tự động lấy đường dẫn.</p>
                  </div>
                </div>
                {formData.thumbnail && (
                  <div className="aspect-video rounded-xl overflow-hidden border border-border">
                    <img src={resolveMediaUrl(formData.thumbnail)} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer group rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-md border-border text-primary cursor-pointer"
                  checked={formData.showThumbnailInContent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, showThumbnailInContent: e.target.checked }))}
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold group-hover:text-primary transition-colors">Hiển thị ảnh bìa trong chi tiết bài viết</p>
                  <p className="text-xs text-muted-foreground">Tắt nếu không muốn ảnh bìa xuất hiện ở đầu nội dung bài viết.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>

      {cropSource && (
        <CropModal 
          imageSrc={cropSource.src} 
          onCrop={handleCropConfirm} 
          onClose={() => setCropSource(null)} 
          aspectRatio={16 / 9}
          title="Cắt ảnh bìa (16:9)"
        />
      )}
    </div>
  );
}
