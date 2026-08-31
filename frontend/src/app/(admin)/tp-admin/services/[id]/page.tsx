'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { 
  ChevronLeft, 
  User, 
  Calendar, 
  Clock, 
  Package, 
  History, 
  Save, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  TriangleAlert,
  XCircle,
  CreditCard,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type ServiceStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

interface OrderHistoryItem {
  order_id: number;
  order_code: string;
  order_status: string;
  order_date: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  total_price: number;
  service_action: string;
}

interface ServiceDetail extends AdminService {
  user_balance: number;
  order_history: OrderHistoryItem[];
}

type AdminService = {
  id: number;
  user_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  latest_order_code: string;
  expires_at: string;
  started_at: string;
  quantity: number;
  duration_days: number;
  allow_renewal: number;
  computed_status: ServiceStatus;
};

const statusMap: Record<ServiceStatus, { label: string; className: string; icon: any }> = {
  ACTIVE: {
    label: 'Đang hoạt động',
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: ShieldCheck,
  },
  EXPIRING_SOON: {
    label: 'Sắp hết hạn',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: TriangleAlert,
  },
  EXPIRED: {
    label: 'Đã hết hạn',
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: XCircle,
  },
};

export default function ServiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [productName, setProductName] = useState('');
  const [variantName, setVariantName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [allowRenewal, setAllowRenewal] = useState(false);

  const fetchServiceDetail = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/services/${id}`);
      if (res.success) {
        const data = res.data as ServiceDetail;
        setService(data);
        
        // Init form
        setProductName(data.product_name || '');
        setVariantName(data.variant_name || '');
        setQuantity(String(data.quantity || 1));
        setDurationDays(String(data.duration_days || 0));
        setStartedAt(toInputDateTime(data.started_at));
        setExpiresAt(toInputDateTime(data.expires_at));
        setAllowRenewal(Number(data.allow_renewal) === 1);
      } else {
        toast.error(res.message || 'Không thể tải thông tin dịch vụ');
        router.push('/tp-admin/services');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Lỗi khi tải chi tiết dịch vụ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchServiceDetail();
  }, [id]);

  function toInputDateTime(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/admin/services/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          product_name: productName,
          variant_name: variantName,
          quantity: Number(quantity),
          duration_days: Number(durationDays),
          started_at: startedAt,
          expires_at: expiresAt,
          allow_renewal: allowRenewal,
        }),
      });

      if (res.success) {
        toast.success('Đã cập nhật dịch vụ');
        fetchServiceDetail(); // Refresh
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể cập nhật dịch vụ'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) return null;

  const statusConfig = statusMap[service.computed_status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black">Chi tiết dịch vụ #{service.id}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{service.latest_order_code}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><User size={14} /> {service.user_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${statusConfig.className}`}>
            <StatusIcon className="h-4 w-4" />
            {statusConfig.label}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition-all shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={18} />}
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Form & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Edit Form */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
            <div className="mb-6 flex items-center gap-2 border-b border-border/60 pb-4">
               <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Package size={20} />
               </div>
               <h3 className="font-bold text-lg">Cấu hình dịch vụ</h3>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Sản phẩm</label>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                  placeholder="Tên sản phẩm..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Phân loại</label>
                <input
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                  placeholder="Tên biến thể..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Số lượng</label>
                <div className="relative">
                   <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Chu kỳ (ngày)</label>
                <div className="relative">
                   <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <input
                    type="number"
                    min="0"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Ngày bắt đầu</label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <input
                    type="datetime-local"
                    value={startedAt}
                    onChange={(e) => setStartedAt(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground ml-1">Ngày hết hạn</label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                   <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-background pl-11 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-background/50 px-5 py-4 transition-all hover:bg-secondary/30">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${allowRenewal ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'}`}>
                    {allowRenewal && <Save size={14} className="stroke-[3]" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={allowRenewal}
                    onChange={(e) => setAllowRenewal(e.target.checked)}
                    className="hidden"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm">Cho phép gia hạn</div>
                    <div className="text-[11px] text-muted-foreground uppercase font-black">Người dùng có thể bấm gia hạn cho dịch vụ này</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order History */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
               <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                      <History size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Lịch sử kích hoạt & gia hạn</h3>
               </div>
               <span className="text-xs font-black bg-secondary px-3 py-1 rounded-full uppercase text-muted-foreground">
                  {service.order_history.length} bản ghi
               </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                    <th className="pb-3 pr-4 font-black">Mã đơn</th>
                    <th className="pb-3 pr-4 font-black">Thời gian</th>
                    <th className="pb-3 pr-4 font-black text-center">Hành động</th>
                    <th className="pb-3 pr-4 font-black text-right">Thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {service.order_history.map((order) => (
                    <tr key={order.order_id} className="group hover:bg-secondary/10 transition-colors">
                      <td className="py-3 pr-4">
                        <Link 
                          href={`/tp-admin/orders/${order.order_id}`}
                          className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:underline"
                        >
                          {order.order_code}
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs font-medium">{new Date(order.order_date).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(order.order_date).toLocaleTimeString('vi-VN')}</div>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                          order.service_action === 'RENEWAL' ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'
                        }`}>
                          {order.service_action === 'RENEWAL' ? 'Gia hạn' : 'Mua mới'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="text-xs font-black tabular-nums">{order.total_price.toLocaleString('vi-VN')}đ</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-primary rotate-12 pointer-events-none">
                <User size={120} />
            </div>

            <div className="mb-6 flex items-center gap-2 border-b border-border/60 pb-4">
               <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                  <User size={20} />
               </div>
               <h3 className="font-bold text-lg">Khách hàng</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 text-xl font-black shadow-inner">
                  {service.user_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-black text-lg leading-tight">{service.user_name}</div>
                  <div className="text-sm text-muted-foreground">{service.user_email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-6">
                 <div className="space-y-1">
                    <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">ID Khách hàng</div>
                    <div className="font-mono text-sm font-bold">#{service.user_id}</div>
                 </div>
                 <div className="space-y-1 text-right">
                    <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Số dư ví</div>
                    <div className="font-bold text-green-500 flex items-center justify-end gap-1">
                        <CreditCard size={14} />
                        {service.user_balance.toLocaleString('vi-VN')}đ
                    </div>
                 </div>
              </div>

              <Link
                href={`/tp-admin/users/${service.user_id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm font-bold hover:bg-secondary transition-all"
              >
                Xem hồ sơ khách hàng
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>

          {/* Quick Stats or Helper Box */}
          <div className="rounded-3xl bg-indigo-600 p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
             <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
             <div className="absolute -top-6 -left-6 h-24 w-24 bg-white/5 rounded-full blur-xl" />
             
             <h4 className="font-bold mb-4 flex items-center gap-2">
                <ShieldCheck size={20} />
                Lưu ý vận hành
             </h4>
             <ul className="space-y-3 text-xs text-indigo-50/80 leading-relaxed font-medium">
                <li className="flex gap-2">
                   <span className="shrink-0">•</span>
                   <span>Dịch vụ sẽ tự động hiển thị mốc nhắc gia hạn dựa trên ngày hết hạn bạn cấu hình.</span>
                </li>
                <li className="flex gap-2">
                   <span className="shrink-0">•</span>
                   <span>Thay đổi ngày hết hạn sẽ làm reset trạng thái đã gửi thông báo nhắc gia hạn.</span>
                </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
