'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, Tag, ArrowLeft, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { AsyncMultiSelect } from '../AsyncMultiSelect';

export default function EditCouponPage() {
  const params = useParams();
  const router = useRouter();
  const idParam = params?.id as string;
  const isCreate = idParam === 'create';
  const couponId = isCreate ? null : Number(idParam);

  const [activeTab, setActiveTab] = useState<'edit' | 'usage'>('edit');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discount_type: 'PERCENT',
    discount_value: '',
    max_discount_amount: '',
    min_order_amount: '',
    usage_limit_total: '',
    usage_limit_per_user: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
    productIds: '',
    categoryIds: '',
    variantIds: '',
    userIds: ''
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!isCreate);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);

  useEffect(() => {
    if (couponId) {
      const fetchData = async () => {
        try {
          const [couponRes, usageRes] = await Promise.all([
            apiFetch(`/admin/coupons/${couponId}`),
            apiFetch(`/admin/coupons/${couponId}/usage`)
          ]);
          
          if (couponRes.success) {
            const data = couponRes.data;
            const formatDateTime = (dtStr: string) => {
              if (!dtStr) return '';
              const date = new Date(dtStr);
              date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
              return date.toISOString().slice(0, 16);
            };

            setFormData({
              name: data.name || '',
              code: data.code || '',
              description: data.description || '',
              discount_type: data.discount_type || 'PERCENT',
              discount_value: data.discount_value || '',
              max_discount_amount: data.max_discount_amount || '',
              min_order_amount: data.min_order_amount || '',
              usage_limit_total: data.usage_limit_total || '',
              usage_limit_per_user: data.usage_limit_per_user || '',
              starts_at: formatDateTime(data.starts_at),
              ends_at: formatDateTime(data.ends_at),
              is_active: !!data.is_active,
              productIds: data.productIds || '',
              categoryIds: data.categoryIds || '',
              variantIds: data.variantIds || '',
              userIds: data.userIds || ''
            });
            setShowAdvanced(true);
          }
          if (usageRes.success) {
            setUsageHistory(usageRes.data);
          }
        } catch (err) {
          alert('Không thể tải thông tin mã giảm giá');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchData();
    }
  }, [couponId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        discount_value: Number(formData.discount_value),
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        min_order_amount: formData.min_order_amount ? Number(formData.min_order_amount) : 0,
        usage_limit_total: formData.usage_limit_total ? Number(formData.usage_limit_total) : 0,
        usage_limit_per_user: formData.usage_limit_per_user ? Number(formData.usage_limit_per_user) : 0,
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
      };

      const res = await apiFetch(couponId ? `/admin/coupons/${couponId}` : '/admin/coupons', {
        method: couponId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        alert(couponId ? 'Cập nhật mã giảm giá thành công' : 'Tạo mã giảm giá thành công');
        router.push('/tp-admin/coupons');
      } else {
        alert(res.message || 'Lỗi khi lưu mã giảm giá');
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="p-12 text-center text-muted-foreground font-bold">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tp-admin/coupons" className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">{isCreate ? 'Tạo mã giảm giá mới' : 'Chi tiết mã giảm giá'}</h2>
            <p className="text-muted-foreground text-sm">
              {isCreate ? 'Tạo chương trình khuyến mãi mới' : `Chỉnh sửa mã ${formData.code}`}
            </p>
          </div>
        </div>
        {!isCreate && (
          <div className="flex bg-secondary/30 rounded-lg p-1 border border-border">
            <button 
              onClick={() => setActiveTab('edit')} 
              className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'edit' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Tag size={16} /> Chỉnh sửa
            </button>
            <button 
              onClick={() => setActiveTab('usage')} 
              className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'usage' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Clock size={16} /> Lịch sử sử dụng
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {activeTab === 'edit' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* THÔNG TIN CƠ BẢN */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">1</span>
                Thông tin cơ bản
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/10 p-6 rounded-xl border border-border/50">
                <div>
                  <label className="block text-sm font-bold mb-2">Tên chương trình *</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Khuyến mãi mùa hè" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Mã Code *</label>
                  <input required type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="VD: SUMMER50" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none uppercase transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2">Mô tả chương trình</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Chi tiết khuyến mãi..." className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none min-h-[80px] transition-colors" />
                </div>
              </div>
            </div>

            {/* MỨC GIẢM GIÁ */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">2</span>
                Mức giảm giá
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-secondary/10 p-6 rounded-xl border border-border/50">
                <div>
                  <label className="block text-sm font-bold mb-2">Loại giảm giá *</label>
                  <select value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors">
                    <option value="PERCENT">% Phần trăm</option>
                    <option value="AMOUNT">Giá tiền (VNĐ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Mức giảm *</label>
                  <input required type="number" min="0" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder="VD: 50" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Giảm tối đa (VNĐ)</label>
                  <input type="number" min="0" value={formData.max_discount_amount} onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })} placeholder="0 = Bỏ qua" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                </div>
              </div>
            </div>

            {/* CẤU HÌNH NÂNG CAO */}
            <div className="pt-2">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors"
              >
                <span className="font-bold">Cấu hình nâng cao (Giới hạn, Điều kiện áp dụng, Thời gian)</span>
                {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {showAdvanced && (
                <div className="mt-6 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Hạn mức sử dụng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-secondary/10 p-6 rounded-xl border border-border/50">
                      <div>
                        <label className="block text-sm font-bold mb-2">Đơn hàng tối thiểu (VNĐ)</label>
                        <input type="number" min="0" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} placeholder="VD: 50000" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Tổng lượt dùng tối đa</label>
                        <input type="number" min="0" value={formData.usage_limit_total} onChange={(e) => setFormData({ ...formData, usage_limit_total: e.target.value })} placeholder="0 = Không giới hạn" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Số lần dùng / 1 User</label>
                        <input type="number" min="0" value={formData.usage_limit_per_user} onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })} placeholder="0 = Tùy ý" className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Thời gian áp dụng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/10 p-6 rounded-xl border border-border/50">
                      <div>
                        <label className="block text-sm font-bold mb-2">Từ ngày</label>
                        <input type="datetime-local" value={formData.starts_at} onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Đến ngày</label>
                        <input type="datetime-local" value={formData.ends_at} onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })} className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Điều kiện áp dụng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/10 p-6 rounded-xl border border-border/50">
                       <div>
                        <label className="block text-sm font-bold mb-2">Giới hạn Sản phẩm</label>
                        <AsyncMultiSelect 
                          endpoint="/admin/products"
                          value={formData.productIds}
                          onChange={(val) => setFormData({...formData, productIds: val})}
                          placeholder="Có thể tìm và chọn nhiều"
                          labelKey="name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Giới hạn Danh mục</label>
                        <AsyncMultiSelect 
                          endpoint="/admin/categories"
                          value={formData.categoryIds}
                          onChange={(val) => setFormData({...formData, categoryIds: val})}
                          placeholder="Có thể tìm và chọn nhiều"
                          labelKey="name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Giới hạn Phân loại Variant (ID)</label>
                        <AsyncMultiSelect 
                          endpoint={formData.productIds ? `/admin/variants?productIds=${formData.productIds}` : '/admin/variants'}
                          value={formData.variantIds}
                          onChange={(val) => setFormData({...formData, variantIds: val})}
                          placeholder={formData.productIds ? "Chỉ hiển thị Variant thuộc SP đã chọn" : "Tất cả Variant (Khuyên dùng chọn SP trước)"}
                          labelKey="name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Giới hạn Người dùng</label>
                        <AsyncMultiSelect 
                          endpoint="/admin/users"
                          value={formData.userIds}
                          onChange={(val) => setFormData({...formData, userIds: val})}
                          placeholder="Tìm theo email hoặc tên"
                          labelKey="email"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <input type="checkbox" id="isActive" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-5 w-5 rounded border-border text-primary focus:ring-primary" />
              <label htmlFor="isActive" className="text-base font-bold cursor-pointer text-primary">Kích hoạt mã giảm giá này ngay lập tức</label>
            </div>

            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <Link href="/tp-admin/coupons" className="px-6 py-3 hover:bg-secondary rounded-xl font-bold transition-colors">
                Hủy bỏ
              </Link>
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-colors shadow-lg shadow-primary/20">
                <Save size={20} />
                {loading ? 'Đang lưu...' : 'Lưu mã giảm giá'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-0">
            {usageHistory.length === 0 ? (
              <div className="text-center p-16 text-muted-foreground">
                <Clock size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-bold text-lg">Chưa có lượt sử dụng nào</p>
                <p className="text-sm mt-1">Mã giảm giá này chưa được khách hàng nào sử dụng.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-secondary/30 text-xs text-muted-foreground tracking-wider uppercase">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Mã đơn hàng</th>
                    <th className="px-6 py-4 font-semibold">Người dùng</th>
                    <th className="px-6 py-4 font-semibold text-right">Tổng thanh toán</th>
                    <th className="px-6 py-4 font-semibold text-right">Giảm giá</th>
                    <th className="px-6 py-4 font-semibold text-right">Ngày dùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usageHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-6 py-4 font-bold">{item.order_code}</td>
                      <td className="px-6 py-4">{item.user_email}</td>
                      <td className="px-6 py-4 text-right text-primary font-bold">{Number(item.total_amount).toLocaleString()}đ</td>
                      <td className="px-6 py-4 text-right text-green-500 font-bold">-{Number(item.discount_amount).toLocaleString()}đ</td>
                      <td className="px-6 py-4 text-right text-muted-foreground text-sm">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
