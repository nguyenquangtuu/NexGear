'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

type RevenuePeriod = 'day' | 'week' | 'month' | 'year';

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  totalCost: number;
  totalRevenue: number;
  completedOrders: number;
  activePeriod: RevenuePeriod;
  revenueChange: number;
}

interface DashboardData {
  stats: Stats;
  recentOrders: Array<{
    order_code: string;
    user_name: string;
    user_email: string;
    total_amount: number;
    status: string;
  }>;
  recentTransactions: Array<{
    transaction_code: string;
    type: string;
    amount: number;
    created_at: string;
  }>;
  revenueStats: Array<{
    key: string;
    label: string;
    sales: number;
    cost: number;
    revenue: number;
  }>;
}

interface DashboardResponse {
  success: boolean;
  data: DashboardData;
  reference?: string;
}

const PERIOD_LABELS: Record<RevenuePeriod, string> = {
  day: 'Ngày',
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
};

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}d`;
}

function getOrderStatusLabel(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'PENDING':
      return 'Chờ xử lý';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

function getTransactionTypeLabel(type: string) {
  switch (type) {
    case 'DEPOSIT':
      return 'Nạp tiền';
    case 'WITHDRAW':
      return 'Rút tiền';
    default:
      return type;
  }
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getWeekReference(date: Date) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay() || 7;
  current.setDate(current.getDate() - day + 1);
  const jan4 = new Date(current.getFullYear(), 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);
  const weekNo = Math.floor((current.getTime() - firstMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${current.getFullYear()}-W${pad(weekNo)}`;
}

function getDefaultReference(period: RevenuePeriod) {
  const now = new Date();
  if (period === 'day') return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (period === 'week') return getWeekReference(now);
  if (period === 'month') return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  return String(now.getFullYear());
}

function stepReference(period: RevenuePeriod, reference: string, delta: number) {
  const now = new Date();

  if (period === 'day') {
    const base = new Date(`${reference}T00:00:00`);
    base.setDate(base.getDate() + delta);
    return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
  }

  if (period === 'week') {
    const matched = reference.match(/^(\d{4})-W(\d{2})$/);
    const year = matched ? Number(matched[1]) : now.getFullYear();
    const week = matched ? Number(matched[2]) : 1;
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - jan4Day + 1 + ((week - 1 + delta) * 7));
    return getWeekReference(monday);
  }

  if (period === 'month') {
    const matched = reference.match(/^(\d{4})-(\d{2})$/);
    const base = new Date(
      matched ? Number(matched[1]) : now.getFullYear(),
      matched ? Number(matched[2]) - 1 : now.getMonth(),
      1
    );
    base.setMonth(base.getMonth() + delta);
    return `${base.getFullYear()}-${pad(base.getMonth() + 1)}`;
  }

  return String(Number(reference || now.getFullYear()) + delta);
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<RevenuePeriod>('month');
  const [reference, setReference] = useState<string>(() => getDefaultReference('month'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({ period, reference });
        const res = await apiFetch<DashboardResponse>(`/admin/stats?${params.toString()}`);
        if (res.success) {
          setData(res.data);
          setError(null);
          return;
        }

        setError('Không thể tải thống kê bảng điều khiển.');
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError(err instanceof Error ? err.message : 'Không thể tải thống kê bảng điều khiển.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [period, reference]);

  if (loading) {
    return (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Đang tải bảng điều khiển...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {error || 'Không thể tải thống kê bảng điều khiển.'}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Người dùng',
      value: data.stats.totalUsers.toLocaleString('vi-VN'),
      icon: Users,
      iconClassName: 'bg-sky-500/10 text-sky-600',
      meta: `${data.stats.completedOrders.toLocaleString('vi-VN')} đơn đã hoàn tất`,
    },
    {
      label: 'Sản phẩm',
      value: data.stats.totalProducts.toLocaleString('vi-VN'),
      icon: Package,
      iconClassName: 'bg-violet-500/10 text-violet-600',
      meta: `${data.stats.totalOrders.toLocaleString('vi-VN')} tổng đơn hàng`,
    },
    {
      label: 'Tổng bán ra',
      value: formatCurrency(data.stats.totalSales),
      icon: Wallet,
      iconClassName: 'bg-amber-500/10 text-amber-600',
      meta: `Tổng giá vốn ${formatCurrency(data.stats.totalCost)}`,
    },
    {
      label: 'Doanh thu',
      value: formatCurrency(data.stats.totalRevenue),
      icon: TrendingUp,
      iconClassName: 'bg-emerald-500/10 text-emerald-600',
      meta: `${data.stats.revenueChange >= 0 ? '+' : ''}${data.stats.revenueChange.toFixed(1)}% so với kỳ trước`,
    },
  ];

  const chartPoints = data.revenueStats;
  const chartHeight = 240;
  const chartWidth = Math.max(chartPoints.length * 96, 560);
  const maxRevenue = Math.max(...chartPoints.map((point) => point.revenue), 0);
  const minRevenue = Math.min(...chartPoints.map((point) => point.revenue), 0);
  const range = Math.max(maxRevenue - minRevenue, 1);
  const zeroY = (maxRevenue / range) * chartHeight;
  const chartPaddingX = 36;
  const stepX = chartPoints.length > 1 ? (chartWidth - chartPaddingX * 2) / (chartPoints.length - 1) : 0;
  const getPointY = (value: number) => chartHeight - (((value - minRevenue) / range) * chartHeight);
  const chartPath = chartPoints
    .map((point, index) => {
      const x = chartPaddingX + (index * stepX);
      const y = getPointY(point.revenue);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
  const guideLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: ratio * chartHeight,
    value: maxRevenue - (ratio * range),
  }));
  const referenceInputType = period === 'day' ? 'date' : period === 'week' ? 'week' : period === 'month' ? 'month' : 'number';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bảng điều khiển</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi nhanh tình hình kinh doanh, đơn hàng và giao dịch gần đây.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <h3 className="mt-2 text-3xl font-bold">{card.value}</h3>
              </div>
              <div className={`rounded-xl p-3 transition-transform group-hover:scale-110 ${card.iconClassName}`}>
                <card.icon size={24} />
              </div>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">{card.meta}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="flex items-center gap-2 font-bold">
              <BarChart3 size={20} className="text-primary" />
              Biểu đồ doanh thu
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Doanh thu = tổng giá bán - tổng giá vốn trên các đơn đã hoàn thành.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'year'] as RevenuePeriod[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setPeriod(option);
                  setReference(getDefaultReference(option));
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  period === option
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background hover:bg-secondary'
                }`}
              >
                {PERIOD_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setReference((prev) => stepReference(period, prev, -1))}
                className="flex h-10 w-10 items-center justify-center border-r border-border bg-background hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type={referenceInputType}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="h-10 min-w-[160px] bg-background px-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setReference((prev) => stepReference(period, prev, 1))}
                className="flex h-10 w-10 items-center justify-center border-l border-border bg-background hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-600">
              Cao nhất: {formatCurrency(maxRevenue)}
            </div>
            <div className="rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1.5 font-semibold text-slate-600">
              Thấp nhất: {formatCurrency(minRevenue)}
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-semibold text-primary">
              Kỳ hiện tại: {formatCurrency(chartPoints[chartPoints.length - 1]?.revenue || 0)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 52}`} className="min-w-[560px]">
              {guideLines.map((line) => (
                <g key={`guide-${line.y}`}>
                  <line
                    x1={chartPaddingX}
                    y1={line.y}
                    x2={chartWidth - chartPaddingX}
                    y2={line.y}
                    stroke="currentColor"
                    className={`${Math.abs(line.value) < 1 ? 'text-primary/40' : 'text-border/70'}`}
                    strokeWidth="1"
                    strokeDasharray={Math.abs(line.value) < 1 ? '0' : '4 6'}
                  />
                  <text
                    x="0"
                    y={line.y + 4}
                    fill="currentColor"
                    className="text-[11px] text-muted-foreground"
                  >
                    {formatCurrency(line.value)}
                  </text>
                </g>
              ))}

              <path
                d={chartPath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {chartPoints.map((point, index) => {
                const x = chartPaddingX + (index * stepX);
                const y = getPointY(point.revenue);

                return (
                  <g key={point.key}>
                    <circle cx={x} cy={y} r="5" fill={point.revenue >= 0 ? '#2563eb' : '#f43f5e'} stroke="white" strokeWidth="2" />
                    <text
                      x={x}
                      y={chartHeight + 28}
                      textAnchor="middle"
                      fill="currentColor"
                      className="text-[11px] text-muted-foreground"
                    >
                      {point.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="flex items-center gap-2 font-bold">
              <Clock size={20} className="text-primary" />
              Đơn hàng gần đây
            </h3>
            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Xem tất cả <ExternalLink size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Số tiền</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentOrders.map((order) => (
                  <tr key={order.order_code} className="transition-colors hover:bg-secondary/20">
                    <td className="px-6 py-4 font-mono text-sm">{order.order_code}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{order.user_name}</div>
                      <div className="text-xs text-muted-foreground">{order.user_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{formatCurrency(order.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-500/10 text-green-500'
                            : order.status === 'PROCESSING'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-6">
            <h3 className="flex items-center gap-2 font-bold">
              <ShoppingCart size={20} className="text-primary" />
              Giao dịch mới nhất
            </h3>
            <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Xem tất cả <ExternalLink size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Mã GD</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Loại</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Số tiền</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.transaction_code} className="transition-colors hover:bg-secondary/20">
                    <td className="px-6 py-4 font-mono text-sm">{tx.transaction_code}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          tx.type === 'DEPOSIT' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {getTransactionTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-bold ${tx.type === 'DEPOSIT' ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
