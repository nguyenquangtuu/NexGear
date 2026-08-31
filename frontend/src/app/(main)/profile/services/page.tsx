'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, TimerReset, TriangleAlert, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';

type Service = {
  id: number;
  productName: string;
  variantName: string;
  quantity: number;
  durationDays: number;
  allowRenewal: boolean;
  thumbnail?: string;
  latestOrderId?: number;
  latestOrderCode: string;
  guideLink: string;
  startedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | null;
  statusLabel: string | null;
  canRenew: boolean;
  actionText: string | null;
  message: string | null;
};

const statusMap = {
  ACTIVE: {
    icon: ShieldCheck,
    className: 'bg-green-500/10 text-green-600',
  },
  EXPIRING_SOON: {
    icon: TriangleAlert,
    className: 'bg-amber-500/10 text-amber-600',
  },
  EXPIRED: {
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600',
  },
} as const;

export default function ProfileServicesPage() {
  const searchParams = useSearchParams();
  const serviceIdParam = searchParams.get('serviceId');
  const orderIdParam = searchParams.get('orderId');

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState<number | null>(null);

  const selectedServiceId = serviceIdParam ? Number(serviceIdParam) : null;
  const selectedOrderId = orderIdParam ? Number(orderIdParam) : null;

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/orders/services/my');
      if (res.success) {
        setServices(res.data || []);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách dịch vụ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleRenew = async (serviceId: number) => {
    setRenewingId(serviceId);
    try {
      const res = await apiFetch(`/orders/services/${serviceId}/renew`, { method: 'POST' });
      if (res.success) {
        if (res.data?.paymentRequired && res.data?.checkoutUrl) {
          window.location.href = res.data.checkoutUrl;
          return;
        }
        toast.success('Đã gửi yêu cầu gia hạn');
        await fetchServices();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể gia hạn dịch vụ'));
    } finally {
      setRenewingId(null);
    }
  };

  const filteredServices = services.filter((service) => {
    if (selectedServiceId && service.id !== selectedServiceId) return false;
    if (selectedOrderId && service.latestOrderId !== selectedOrderId) return false;
    return true;
  });

  const isScopedView = Boolean(selectedServiceId || selectedOrderId);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-black">Quản lý dịch vụ</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi thời hạn các dịch vụ bạn đã mua và gia hạn khi còn hỗ trợ.
            </p>
          </div>
          {isScopedView && (
            <Link href="/profile/orders" className="text-sm font-black text-primary hover:underline">
              Quay lại đơn hàng
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Đang tải dịch vụ...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <TimerReset className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-semibold">
            {isScopedView ? 'Không tìm thấy dịch vụ tương ứng với đơn hàng này.' : 'Bạn chưa có dịch vụ nào có hạn sử dụng.'}
          </p>
          <Link href={isScopedView ? '/profile/orders' : '/'} className="mt-3 inline-block text-sm font-bold text-primary hover:underline">
            {isScopedView ? 'Quay lại đơn hàng' : 'Mua gói mới'}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((service) => {
            const statusConfig = service.status ? statusMap[service.status] : null;
            const StatusIcon = statusConfig?.icon || TimerReset;

            return (
              <div key={service.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-secondary">
                      <img
                        src={resolveMediaUrl(service.thumbnail)}
                        alt={service.productName}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base font-black">{service.productName}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{service.variantName}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Chu kỳ {service.durationDays} ngày, số lượng x{service.quantity}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Đơn gần nhất: {service.latestOrderCode}</p>
                    </div>
                  </div>

                  {statusConfig && (
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${statusConfig.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {service.statusLabel}
                    </span>
                  )}
                </div>

                <div className="grid gap-4 border-t border-border/50 bg-secondary/10 p-5 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Bắt đầu</p>
                    <p className="mt-1 text-sm font-semibold">{new Date(service.startedAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Hết hạn</p>
                    <p className="mt-1 text-sm font-semibold">{new Date(service.expiresAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Chính sách</p>
                    <p className="mt-1 text-sm font-semibold">{service.allowRenewal ? 'Cho phép gia hạn' : 'Chỉ mua mới'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/50 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{service.message}</p>
                    {service.guideLink ? (
                      <a
                        href={service.guideLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-black text-primary hover:underline"
                      >
                        Mở hướng dẫn sử dụng
                      </a>
                    ) : null}
                  </div>

                  {service.canRenew ? (
                    <button
                      onClick={() => handleRenew(service.id)}
                      disabled={renewingId === service.id}
                      className="rounded-xl bg-primary px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {renewingId === service.id ? 'Đang gửi...' : 'Gia hạn dịch vụ'}
                    </button>
                  ) : (
                    <Link
                      href="/"
                      className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-black text-foreground transition-all hover:bg-secondary"
                    >
                      {service.actionText || 'Mua mới'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
