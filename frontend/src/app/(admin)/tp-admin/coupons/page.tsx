'use client';

import { useState, useEffect } from 'react';
import { Ticket, Plus, Edit, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Coupon {
  id: number;
  code: string;
  name: string;
  discount_type: 'PERCENT' | 'AMOUNT';
  discount_value: number;
  used_count: number;
  usage_limit_total: number;
  is_active: boolean;
  ends_at: string | null;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/coupons');
      if (res.success) {
        setCoupons(res.data);
      }
    } catch (error) {
      console.error('Failed to load coupons', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mã giảm giá này?')) return;
    try {
      const res = await apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' });
      if (res.success) {
        setCoupons(coupons.filter(c => c.id !== id));
      } else {
        alert(res.message || 'Lỗi khi xóa mã');
      }
    } catch (error) {
      alert('Lỗi kết nối khi xóa mã');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Mã giảm giá</h2>
          <p className="text-muted-foreground text-sm">Quản lý các chương trình khuyến mãi và mã giảm giá</p>
        </div>
        <Link 
          href="/tp-admin/coupons/create"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
          Tạo mã mới
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-secondary/30 text-xs text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Tên chương trình</th>
                <th className="px-6 py-4 font-semibold">Mã</th>
                <th className="px-6 py-4 font-semibold">Giảm giá</th>
                <th className="px-6 py-4 font-semibold text-center">Đã dùng</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-secondary/50 rounded w-full"></div></td>
                  </tr>
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
                        <Ticket size={32} className="text-muted-foreground" />
                      </div>
                      <p>Chưa có mã giảm giá nào được tạo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-bold">{coupon.name}</td>
                    <td className="px-6 py-4"><code className="bg-primary/10 text-primary px-2 py-1 rounded font-bold">{coupon.code}</code></td>
                    <td className="px-6 py-4 text-sm font-bold">
                      {coupon.discount_type === 'PERCENT' ? `${coupon.discount_value}%` : `${Number(coupon.discount_value).toLocaleString()}đ`}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      {coupon.used_count} / {coupon.usage_limit_total || '∞'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${coupon.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {coupon.is_active ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/tp-admin/coupons/${coupon.id}`} className="p-2 hover:bg-primary/10 text-primary rounded-lg cursor-pointer transition-colors"><Edit size={16} /></Link>
                        <button onClick={() => handleDelete(coupon.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg cursor-pointer transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
