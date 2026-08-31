'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { Search, ShieldCheck, TriangleAlert, XCircle, Pencil, Loader2, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AdminPagination from '../components/AdminPagination';

type ServiceStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';

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

const statusMap: Record<ServiceStatus, { label: string; className: string; icon: typeof ShieldCheck }> = {
  ACTIVE: {
    label: 'Đang hoạt động',
    className: 'bg-green-500/10 text-green-600',
    icon: ShieldCheck,
  },
  EXPIRING_SOON: {
    label: 'Sắp hết hạn',
    className: 'bg-amber-500/10 text-amber-600',
    icon: TriangleAlert,
  },
  EXPIRED: {
    label: 'Đã hết hạn',
    className: 'bg-red-500/10 text-red-600',
    icon: XCircle,
  },
};

function toInputDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function formatDateCompact(dateStr: string) {
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return `${time} ${date}`;
}

export default function AdminServicesPage() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<AdminService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/services?search=${encodeURIComponent(search)}&status=${statusFilter}&page=${page}`);
      if (res.success) {
        setServices(res.data.services || []);
        setTotalPages(res.data.pagination.pages || 1);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không thể tải danh sách dịch vụ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    fetchServices();
  }, [search, statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý dịch vụ</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi hạn dùng theo quản lý dịch vụ. Tìm kiếm bằng mã dịch vụ, khách hàng, email, mã đơn hoặc tên gói.
          </p>
        </div>

        <div className="flex w-full gap-3 md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã dịch vụ, email, đơn hàng, sản phẩm..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="EXPIRING_SOON">Sắp hết hạn</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-4">Mã DV</th>
                <th className="px-5 py-4">Khách hàng</th>
                <th className="px-5 py-4">Dịch vụ</th>
                <th className="px-5 py-4">Đơn gần nhất</th>
                <th className="px-5 py-4">Thời hạn</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={7} className="px-5 py-6">
                      <div className="h-4 rounded bg-secondary/50" />
                    </td>
                  </tr>
                ))
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Chưa có dịch vụ nào có hạn sử dụng.
                  </td>
                </tr>
              ) : (
                services.map((service) => {
                  const statusConfig = statusMap[service.computed_status];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={service.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-5 py-4 text-xs font-mono text-muted-foreground">#{service.id}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold">{service.user_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-medium">{service.user_email}</div>
                      </td>
                      <td className="px-5 py-4 max-w-[280px]">
                        <div className="text-sm font-black text-primary truncate" title={service.product_name}>{service.product_name}</div>
                        <div className="text-[11px] text-muted-foreground font-medium truncate" title={service.variant_name}>{service.variant_name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.5 bg-secondary rounded-md font-bold uppercase">{service.duration_days} ngày</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-secondary rounded-md font-bold uppercase">x{service.quantity}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono whitespace-nowrap text-muted-foreground">
                        {service.latest_order_code ? (
                          <span className="px-2 py-1 bg-secondary/50 rounded-lg">{service.latest_order_code}</span>
                        ) : '--'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-[10px] font-medium text-muted-foreground tabular-nums">
                          {formatDateCompact(service.started_at)}
                        </div>
                        <div className="text-[11px] font-black tabular-nums">
                          {formatDateCompact(service.expires_at)}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-tight ${statusConfig.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/tp-admin/services/${service.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
