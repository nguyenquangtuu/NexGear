'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { AsyncMultiSelect } from './AsyncMultiSelect';

interface CouponModalProps {
  couponId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CouponModal({ couponId, onClose, onSuccess }: CouponModalProps) {
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
  const [initialLoading, setInitialLoading] = useState(!!couponId);
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
        onSuccess();
      } else {
        alert(res.message || 'Lỗi khi lưu mã giảm giá');
      }
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-card border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30 shrink-0">
          <h3 className="font-bold text-lg">{couponId ? 'Chi tiết mã giảm giá' : 'Tạo mã giảm giá mới'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg">
            <X size={20} />
          </button>
        </div>

        {couponId && (
          <div className="flex px-6 pt-4 gap-4 border-b border-border shrink-0">
            <button 
              onClick={() => setActiveTab('edit')} 
              className={`pb-3 font-bold text-sm border-b-2 px-2 flex items-center gap-2 ${activeTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Tag size={16} /> Chỉnh sửa
            </button>
            <button 
              onClick={() => setActiveTab('usage')} 
              className={`pb-3 font-bold text-sm border-b-2 px-2 flex items-center gap-2 ${activeTab === 'usage' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Clock size={16} /> Lịch sử sử dụng
            </button>
          </div>
        )}

        {initialLoading ? (
          <div className="p-12 text-center text-muted-foreground font-bold">Đang tải dữ liệu...</div>
        ) : activeTab === 'edit' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto hidden-scroll">
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Thông tin cơ bản</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Tên chương trình *</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Khuyến mãi mùa hè" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Mã Code *</label>
                  <input required type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="VD: SUMMER50" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none uppercase" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">Mô tả chương trình</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Chi tiết khuyến mãi..." className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none min-h-[60px]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">Loại giảm giá *</label>
                  <select value={formData.discount_type} onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none">
                    <option value="PERCENT">% Phần trăm</option>
                    <option value="AMOUNT">Giá tiền (VNĐ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Mức giảm *</label>
                  <input required type="number" min="0" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder="VD: 50" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Giảm tối đa (VNĐ)</label>
                  <input type="number" min="0" value={formData.max_discount_amount} onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })} placeholder="0 = Bỏ qua" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-bold text-muted-foreground w-full py-2 hover:text-foreground transition-colors"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                Cấu hình nâng cao (Giới hạn, Điều kiện áp dụng, Thời gian)
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Hạn mức sử dụng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">Đơn hàng tối thiểu (VNĐ)</label>
                        <input type="number" min="0" value={formData.min_order_amount} onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })} placeholder="VD: 50000" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Tổng lượt dùng tối đa</label>
                        <input type="number" min="0" value={formData.usage_limit_total} onChange={(e) => setFormData({ ...formData, usage_limit_total: e.target.value })} placeholder="0 = Không giới hạn" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Số lần dùng / 1 User</label>
                        <input type="number" min="0" value={formData.usage_limit_per_user} onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })} placeholder="0 = Tùy ý" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Thời gian áp dụng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">Từ ngày</label>
                        <input type="datetime-local" value={formData.starts_at} onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Đến ngày</label>
                        <input type="datetime-local" value={formData.ends_at} onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Điều kiện áp dụng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                        <label className="block text-xs font-bold mb-1">Giới hạn Sản phẩm</label>
                        <AsyncMultiSelect 
                          endpoint="/admin/products"
                          value={formData.productIds}
                          onChange={(val) => setFormData({...formData, productIds: val})}
                          placeholder="Có thể tìm và chọn nhiều"
                          labelKey="name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Giới hạn Danh mục</label>
                        <AsyncMultiSelect 
                          endpoint="/admin/categories"
                          value={formData.categoryIds}
                          onChange={(val) => setFormData({...formData, categoryIds: val})}
                          placeholder="Có thể tìm và chọn nhiều"
                          labelKey="name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Giới hạn Phân loại Variant (ID)</label>
                        <AsyncMultiSelect 
                          endpoint={formData.productIds ? `/admin/variants?productIds=${formData.productIds}` : '/admin/variants'}
                          value={formData.variantIds}
                          onChange={(val) => setFormData({...formData, variantIds: val})}
                          placeholder={formData.productIds ? "Chỉ hiển thị Variant thuộc SP đã chọn" : "Tất cả Variant (Khuyên dùng chọn SP trước)"}
                          labelKey="name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Giới hạn Người dùng</label>
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

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input type="checkbox" id="isActive" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-border" />
              <label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Kích hoạt mã ngay</label>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-2 shrink-0">
              <button type="button" onClick={onClose} className="px-5 py-2.5 hover:bg-secondary rounded-xl font-bold transition-colors">
                Hủy
              </button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-colors">
                {loading ? 'Đang lưu...' : 'Lưu mã giảm giá'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 overflow-y-auto hidden-scroll">
            {usageHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground border border-border border-dashed rounded-xl">
                Chưa có đơn hàng nào sử dụng mã này
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-secondary/30 text-xs text-muted-foreground tracking-wider uppercase border-b border-border">
                  <tr>
                    <th className="p-3">Mã đơn hàng</th>
                    <th className="p-3">Người dùng</th>
                    <th className="p-3 text-right">Tổng thanh toán</th>
                    <th className="p-3 text-right">Giảm giá</th>
                    <th className="p-3 text-right">Ngày dùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usageHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/10">
                      <td className="p-3 font-bold">{item.order_code}</td>
                      <td className="p-3">{item.user_email}</td>
                      <td className="p-3 text-right text-primary font-bold">{Number(item.total_amount).toLocaleString()}đ</td>
                      <td className="p-3 text-right text-green-500 font-bold">-{Number(item.discount_amount).toLocaleString()}đ</td>
                      <td className="p-3 text-right text-muted-foreground">
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
