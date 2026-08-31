'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, Plus, Edit, Tag, Box, ShoppingCart } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';

interface ProductVariant {
  id?: number;
  name: string;
  price: number;
  stock_count: number;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'HIDDEN';
}

interface Product {
  id: number;
  name: string;
  slug: string;
  seo_title?: string;
  category: {
    name: string;
    slug: string;
  };
  thumbnail: string;
  is_active: boolean;
  sold_count: number;
  created_at: string;
  variants: ProductVariant[];
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const limit = 12;
      const res = await apiFetch(`/admin/products?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`);
      if (res.success) {
        setProducts(res.data.products || []);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotalItems(res.data.pagination?.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const statusCount = useMemo(() => ({
    ACTIVE: products.filter((p) => p.is_active).length,
    INACTIVE: products.filter((p) => !p.is_active).length,
  }), [products]);

  const getVariantStatusLabel = (status: ProductVariant['status']) => {
    if (status === 'ACTIVE') return 'Hoạt động';
    if (status === 'OUT_OF_STOCK') return 'Hết hàng';
    return 'Ẩn';
  };

  const getVariantStatusClass = (status: ProductVariant['status']) => {
    if (status === 'ACTIVE') return 'bg-green-500/10 text-green-500';
    if (status === 'OUT_OF_STOCK') return 'bg-yellow-500/10 text-yellow-500';
    return 'bg-zinc-500/10 text-zinc-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Quản lý sản phẩm</h2>
          <p className="text-muted-foreground text-sm">Thêm mới, chỉnh sửa và quản lý SEO sản phẩm</p>
          <div className="text-xs text-muted-foreground mt-1">
            Hiển thị: {statusCount.ACTIVE} • Ẩn: {statusCount.INACTIVE}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Tìm sản phẩm..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link
            href="/tp-admin/products/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Plus size={20} />
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-80 animate-pulse" />
          ))
        ) : products.map((product) => (
          <div key={product.id} className="bg-card border border-border rounded-2xl overflow-hidden group hover:border-primary/50 transition-all flex flex-col">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary/20 p-3">
              <img
                src={resolveMediaUrl(product.thumbnail, '/placeholder.png')}
                alt={product.name}
                className="max-h-full max-w-full rounded-xl object-contain"
              />
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${product.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {product.is_active ? 'Hiển thị' : 'Ẩn'}
                </span>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Tag size={12} />
                <span className="text-[10px] font-black uppercase">{product.category?.name || 'Không có danh mục'}</span>
              </div>
              <h4 className="font-bold text-sm line-clamp-1">{product.name}</h4>
              <div className="text-[11px] text-muted-foreground line-clamp-1">SEO: {product.seo_title || 'Chưa cấu hình'}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><ShoppingCart size={14} /><span>Đã bán: {product.sold_count}</span></div>
                <div className="flex items-center gap-1"><Box size={14} /><span>PL: {product.variants?.length || 0}</span></div>
              </div>
              <div className="mt-2 space-y-1">
                {product.variants?.slice(0, 2).map((variant, idx) => (
                  <div key={variant.id || idx} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 flex-1 truncate">{variant.name}</span>
                    <span className={`shrink-0 whitespace-nowrap px-2 py-0.5 rounded ${getVariantStatusClass(variant.status)}`}>{getVariantStatusLabel(variant.status)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                <Link href={`/tp-admin/products/${product.id}/edit`} className="flex items-center justify-center gap-2 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-xs font-bold transition-colors">
                  <Edit size={14} /> Sửa SP
                </Link>
                <Link href={`/tp-admin/products/${product.id}/variants`} className="flex items-center justify-center gap-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors">
                  <Box size={14} /> Biến thể
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="p-6 border border-border rounded-2xl flex justify-between items-center bg-card">
          <span className="text-sm text-muted-foreground">Trang {page} / {totalPages} • {totalItems.toLocaleString()} sản phẩm</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50">Trước</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-secondary disabled:opacity-50">Sau</button>
          </div>
        </div>
      )}
    </div>
  );
}
