'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye } from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { formatVND } from '@/lib/currency';

import AdminPagination from '../components/AdminPagination';

interface Order {
  id: number;
  order_code: string;
  user_name: string;
  user_email: string;
  product_name: string | null;
  variant_name: string | null;
  quantity: number | null;
  total_amount: number;
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'SHIPPING' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  created_at: string;
}

const statusMap = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'yellow' },
  PROCESSING: { label: 'Đang chuẩn bị hàng', color: 'blue' },
  SHIPPING: { label: 'Đang vận chuyển', color: 'purple' },
  DELIVERING: { label: 'Đang giao hàng', color: 'purple' },
  COMPLETED: { label: 'Hoàn thành', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'red' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/admin/orders?page=${page}&search=${search}&status=${statusFilter}`);
      if (res.success) {
        setOrders(res.data.orders);
        setTotalPages(res.data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold">Quản lý đơn hàng</h2>
          <p className="text-sm text-muted-foreground">Quản lý tất cả đơn hàng đã phát sinh</p>
        </div>

        <div className="flex w-full gap-4 md:w-auto">
          <div className="relative flex-1 md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Mã đơn, email..."
              className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-4 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_PAYMENT">Chờ thanh toán</option>
            <option value="PROCESSING">Đang chuẩn bị hàng</option>
            <option value="SHIPPING">Đang vận chuyển</option>
            <option value="DELIVERING">Đang giao hàng</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="REFUNDED">Đã hoàn tiền</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-semibold">Mã đơn hàng</th>
                <th className="px-6 py-4 font-semibold">Khách hàng</th>
                <th className="px-6 py-4 font-semibold">Sản phẩm</th>
                <th className="px-6 py-4 font-semibold">Thành tiền</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold">Thời gian</th>
                <th className="px-6 py-4 text-right font-semibold">Chi tiết</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8">
                      <div className="h-4 w-full rounded bg-secondary/50" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.order_code} className="group transition-colors hover:bg-secondary/10">
                    <td className="px-6 py-4 font-mono text-xs font-bold">{order.order_code}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{order.user_name}</div>
                      <div className="text-xs text-muted-foreground">{order.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{order.product_name || '-'}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.variant_name || '-'}
                        {order.quantity ? ` • SL: ${order.quantity}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{formatVND(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        order.status === 'COMPLETED'
                          ? 'bg-green-500/10 text-green-500'
                          : order.status === 'PROCESSING'
                            ? 'bg-blue-500/10 text-blue-500'
                            : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                              ? 'bg-red-500/10 text-red-500'
                              : order.status === 'SHIPPING' || order.status === 'DELIVERING'
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {statusMap[order.status].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/tp-admin/orders/${order.id}`}
                        className="inline-flex rounded-lg p-2 transition-colors hover:bg-secondary"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} className="text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
