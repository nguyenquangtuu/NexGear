'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  Plus, Search, Edit, Trash2, FolderTree, RefreshCcw, 
  Upload, Image as ImageIcon, X, 
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { resolveMediaUrl } from '@/lib/media';
import { availableCategoryIcons } from '@/lib/category-icons';
import CropModal from '../products/_components/CropModal';

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  icon?: string | null;
  thumbnail?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
  children?: Category[];
}

function sortCategoryTree(items: Category[]): Category[] {
  return [...items]
    .sort((a, b) => {
      const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name);
    })
    .map((item) => ({
      ...item,
      children: item.children?.length ? sortCategoryTree(item.children) : item.children,
    }));
}

const emptyForm = {
  name: '',
  slug: '',
  parent_id: '',
  icon: '',
  thumbnail: '',
  description: '',
  sort_order: 0,
  is_active: true,
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<{ src: string; fileName: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        body: JSON.stringify({ base64Data, fileName: `cat_${Date.now()}_${fileName.split('.')[0]}.jpg` }),
      }) as { success?: boolean; url?: string };
      if (res.success && res.url) {
        setForm(p => ({ ...p, thumbnail: res.url ?? '' }));
        toast.success('Đã tải lên ảnh');
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/admin/categories') as { data?: Category[] };
      setCategories(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const flatCategories = useMemo(() => {
    const result: Category[] = [];
    const sortedCategories = sortCategoryTree(categories);
    const walk = (items: Category[], level = 0) => {
      items.forEach((item) => {
        result.push({ ...item, name: `${'— '.repeat(level)}${item.name}` });
        if (item.children?.length) walk(item.children, level + 1);
      });
    };
    walk(sortedCategories);
    return result;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flatCategories;
    return flatCategories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [flatCategories, search]);

  const parentCategoryOptions = useMemo(() => {
    return sortCategoryTree(categories).filter((category) => {
      if (category.parent_id !== null) return false;
      if (editingId && category.id === editingId) return false;
      return true;
    });
  }, [categories, editingId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      };

      if (editingId) {
        await apiFetch(`/admin/categories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Đã cập nhật danh mục');
      } else {
        await apiFetch('/admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Đã tạo danh mục mới');
      }

      await fetchCategories();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name.replace(/^[— ]+/, ''),
      slug: cat.slug,
      parent_id: cat.parent_id ? String(cat.parent_id) : '',
      icon: cat.icon || '',
      thumbnail: cat.thumbnail || '',
      description: cat.description || '',
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active,
    });
    setIsModalOpen(true);
  };

  const onDelete = async (id: number) => {
    if (!confirm('Xóa danh mục này?')) return;
    try {
      await apiFetch(`/admin/categories/${id}`, { method: 'DELETE' });
      await fetchCategories();
      toast.success('Đã xóa danh mục');
    } catch (err: any) {
      setError(err.message || 'Không thể xóa danh mục');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản lý danh mục</h2>
          <p className="text-muted-foreground text-sm">Tạo danh mục cha, danh mục con và chỉnh sửa cấu trúc sản phẩm</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchCategories} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-sm font-medium">
            <RefreshCcw size={16} /> Tải lại
          </button>
          <button onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold">
            <Plus size={16} /> Danh mục mới
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 outline-none" placeholder="Tìm danh mục..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground"><FolderTree size={16} /> {filtered.length} danh mục</div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-9 rounded-lg bg-secondary/50 overflow-hidden border border-border shrink-0">
                    {cat.thumbnail ? (
                              <img src={resolveMediaUrl(cat.thumbnail)} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon size={14} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{cat.name}</div>
                    <div className="text-xs text-muted-foreground">/{cat.slug} • {cat.is_active ? 'Hiện' : 'Ẩn'} • Thứ tự: {cat.sort_order}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(cat)} className="p-2 rounded-lg border border-border hover:bg-secondary"><Edit size={16} /></button>
                  <button onClick={() => onDelete(cat.id)} className="p-2 rounded-lg border border-border hover:bg-red-500/10 text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {!filtered.length && <div className="text-sm text-muted-foreground py-8 text-center">Không có danh mục nào.</div>}
          </div>
        )}
      </div>

      {/* Category Creation/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border p-6 sticky top-0 bg-card z-20">
              <h3 className="text-xl font-bold">{editingId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</h3>
              <button onClick={resetForm} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Tên danh mục</label>
                  <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary/50 transition-all" placeholder="Tên danh mục..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground ml-1">Slug (Đường dẫn)</label>
                  <input className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary/50 transition-all" placeholder="slug-danh-muc" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Danh mục cha</label>
                <select className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary/50 transition-all" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                  <option value="">Không có danh mục cha</option>
                  {parentCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {!form.parent_id && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Icon đại diện</label>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-4 rounded-2xl border border-border bg-secondary/20">
                    {availableCategoryIcons.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setForm({ ...form, icon: item.name })}
                        className={`relative flex items-center justify-center p-2.5 rounded-xl border transition-all ${
                          form.icon === item.name 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 ring-2 ring-primary/25 ring-offset-2 ring-offset-card' 
                            : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                        }`}
                        title={item.label}
                      >
                        <item.icon size={20} />
                        {form.icon === item.name && (
                          <div className="absolute right-1 top-1 bg-white text-primary rounded-full p-0.5 shadow-sm border border-primary">
                            <Check size={10} strokeWidth={4} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground flex items-center gap-2 ml-1">
                    <ImageIcon size={14} /> Ảnh đại diện
                  </label>
                  <div className="relative group aspect-video">
                    <div className="w-full h-full rounded-2xl border-2 border-dashed border-border overflow-hidden bg-secondary/20 flex items-center justify-center transition-colors group-hover:border-primary/50">
                      {form.thumbnail ? (
                        <>
                    <img src={resolveMediaUrl(form.thumbnail)} alt="Thumbnail" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="p-2 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer backdrop-blur-sm">
                              {uploading ? (
                                <RefreshCcw size={18} className="animate-spin text-white" />
                              ) : (
                                <Upload size={18} className="text-white" />
                              )}
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                            </label>
                            <button onClick={() => setForm({ ...form, thumbnail: '' })} className="p-2 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm">
                              <X size={18} className="text-white" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="flex flex-col items-center gap-2 cursor-pointer w-full h-full justify-center">
                          {uploading ? <RefreshCcw className="animate-spin text-primary" size={24} /> : <Upload className="text-muted-foreground" size={24} />}
                          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Tải ảnh lên</span>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground ml-1">Thứ tự sắp xếp</label>
                    <input type="number" className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary/50 transition-all" placeholder="0, 1, 2..." value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-muted-foreground ml-1">Mô tả ngắn</label>
                    <textarea className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none focus:border-primary/50 transition-all min-h-[90px]" placeholder="Nhập mô tả..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex cursor-pointer items-center gap-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${form.is_active ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'}`}>
                    {form.is_active && <Check size={14} strokeWidth={4} />}
                  </div>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="hidden" />
                  <span className="text-sm font-bold">Kích hoạt danh mục</span>
                </label>
                
                {error && <p className="text-xs font-bold text-red-500 uppercase tracking-tight">{error}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border p-6 sticky bottom-0 bg-card z-20">
              <button onClick={resetForm} className="px-6 py-3 rounded-2xl border border-border font-bold hover:bg-secondary transition-colors text-sm">
                Hủy bỏ
              </button>
              <button onClick={submit} disabled={submitting} className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-60 transition-all shadow-lg shadow-primary/20 text-sm">
                {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật ngay' : 'Tạo danh mục'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cropSource && (
        <CropModal 
          imageSrc={cropSource.src} 
          onCrop={handleCropConfirm} 
          onClose={() => setCropSource(null)} 
          aspectRatio={16/9}
          title="Cắt ảnh danh mục (16:9)"
        />
      )}
    </div>
  );
}
