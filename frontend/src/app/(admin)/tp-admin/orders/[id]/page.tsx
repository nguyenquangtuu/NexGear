'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiFetch } from '@/lib/api';
import { formatVND } from '@/lib/currency';
import { resolveMediaUrl } from '@/lib/media';

type RequiredInputDef = {
  id?: string;
  label?: string;
};

type ServiceInfo = {
  id: number;
  action?: string | null;
  hasExpiry?: boolean;
  durationDays?: number;
  allowRenewal?: boolean;
  startedAt?: string | null;
  expiresAt?: string | null;
  status?: string | null;
};

type OrderItem = {
  id: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
  required_inputs?: string | null;
  product_thumbnail?: string | null;
  variant_required_inputs?: string | null;
  guide_link?: string | null;
  service?: ServiceInfo | null;
};

type OrderDetailResponse = {
  success: boolean;
  data: {
    id: number;
    order_code: string;
    status: string;
    subtotal_amount: number | string;
    discount_amount: number | string;
    total_amount: number | string;
    balance_applied?: number | string;
    payment_amount?: number | string;
    payment_status?: string | null;
    created_at?: string;
    completed_at?: string | null;
    processed_at?: string | null;
    refunded_at?: string | null;
    discount_code?: string | null;
    user: {
      id: number;
      full_name: string;
      email: string;
      balance?: number | string;
    };
    items: OrderItem[];
  };
};

type EditablePair = {
  key: string;
  label: string;
  value: string;
};

type ItemEditorState = {
  requiredInputs: EditablePair[];
  saving: boolean;
};

const ORDER_STATUSES = [
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PROCESSING', label: 'Đang chuẩn bị hàng' },
  { value: 'SHIPPING', label: 'Đang vận chuyển' },
  { value: 'DELIVERING', label: 'Đang giao hàng' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
];

function formatDateSafe(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderStatusLabel(status: string) {
  return ORDER_STATUSES.find((item) => item.value === status)?.label || status;
}

function getOrderStatusClassName(status: string) {
  if (status === 'COMPLETED') return 'bg-green-500/10 text-green-500 border-green-500/20';
  if (status === 'CANCELLED' || status === 'REFUNDED') return 'bg-red-500/10 text-red-500 border-red-500/20';
  if (status === 'PENDING_PAYMENT') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
  if (status === 'SHIPPING' || status === 'DELIVERING') return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
  return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
}

function getServiceStatusClassName(status?: string | null) {
  if (status === 'ACTIVE') return 'bg-green-500/10 text-green-500';
  if (status === 'EXPIRING_SOON') return 'bg-yellow-500/10 text-yellow-500';
  if (status === 'EXPIRED') return 'bg-red-500/10 text-red-500';
  return 'bg-secondary text-muted-foreground';
}

function getServiceStatusLabel(status?: string | null) {
  if (status === 'ACTIVE') return 'Đang hoạt động';
  if (status === 'EXPIRING_SOON') return 'Sắp hết hạn';
  if (status === 'EXPIRED') return 'Đã hết hạn';
  return status || 'Chưa xác định';
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function buildRequiredInputLabelMap(rawDefs?: string | null) {
  const defs = parseJson<RequiredInputDef[]>(rawDefs, []);
  return new Map(
    defs
      .map((entry) => [String(entry?.id || '').trim(), String(entry?.label || '').trim()] as const)
      .filter(([key, label]) => key && label)
  );
}

function resolveRequiredInputLabel(labelMap: Map<string, string>, key: string, currentLabel?: string | null) {
  const normalizedKey = String(key || '').trim();
  const normalizedLabel = String(currentLabel || '').trim();
  const mappedLabel = labelMap.get(normalizedKey);

  if (mappedLabel) {
    if (!normalizedLabel) return mappedLabel;
    if (normalizedLabel === normalizedKey) return mappedLabel;
    if (/^input_\d+$/i.test(normalizedLabel)) return mappedLabel;
  }

  return normalizedLabel || mappedLabel || normalizedKey;
}

function parseEditableRequiredInputs(value: string | null | undefined, labelMap: Map<string, string>) {
  const parsedArray = parseJson<unknown[]>(value, []);
  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
    return parsedArray
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        return {
          key: String((item as { key?: unknown }).key ?? ''),
          label: resolveRequiredInputLabel(
            labelMap,
            String((item as { key?: unknown }).key ?? ''),
            String((item as { label?: unknown; key?: unknown }).label ?? '')
          ),
          value: String((item as { value?: unknown }).value ?? ''),
        };
      })
      .filter(Boolean) as EditablePair[];
  }

  const parsed = parseJson<Record<string, unknown>>(value, {});
  return Object.entries(parsed)
    .map(([key, rawValue]) => ({
      key: String(key || ''),
      label: resolveRequiredInputLabel(labelMap, String(key || '')),
      value: String(rawValue ?? ''),
    }))
    .filter((item) => item.key || item.label || item.value);
}



function buildItemEditors(items: OrderItem[]) {
  return items.reduce<Record<number, ItemEditorState>>((acc, item) => {
    const labelMap = buildRequiredInputLabelMap(item.variant_required_inputs);
    acc[item.id] = {
      requiredInputs: parseEditableRequiredInputs(item.required_inputs, labelMap),
      saving: false,
    };
    return acc;
  }, {});
}

function normalizeRequiredInputsPayload(rows: EditablePair[]) {
  return rows.reduce<Array<{ key: string; label: string; value: string }>>((acc, row) => {
    const key = row.key.trim();
    const label = row.label.trim();
    const value = row.value.trim();
    if ((key || label) && value) {
      acc.push({
        key,
        label: label || key,
        value,
      });
    }
    return acc;
  }, []);
}



function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-lg font-black text-foreground">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div className="shrink-0 rounded-xl bg-secondary/60 p-3 text-muted-foreground">{icon}</div>
      </div>
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<OrderDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [itemEditors, setItemEditors] = useState<Record<number, ItemEditorState>>({});

  const loadOrder = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await apiFetch<OrderDetailResponse>(`/admin/orders/${orderId}`);
      if (response.success) {
        setOrder(response.data);
        setStatusValue(response.data.status);
        setItemEditors(buildItemEditors(response.data.items || []));
        setError('');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải chi tiết đơn hàng');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const orderServices = useMemo(
    () => (order?.items || []).filter((item) => item.service),
    [order?.items]
  );

  const handleUpdateStatus = async () => {
    if (!order || !statusValue || statusValue === order.status) return;

    setStatusSubmitting(true);
    try {
      const response = await apiFetch(`/admin/orders/${order.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: statusValue }),
      });

      if ((response as { success?: boolean }).success) {
        toast.success('Đã cập nhật trạng thái đơn hàng');
        await loadOrder(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const updateItemEditor = (itemId: number, updater: (current: ItemEditorState) => ItemEditorState) => {
    setItemEditors((prev) => {
      const current = prev[itemId] || { requiredInputs: [], saving: false };
      return {
        ...prev,
        [itemId]: updater(current),
      };
    });
  };

  const setItemSaving = (itemId: number, saving: boolean) => {
    updateItemEditor(itemId, (current) => ({ ...current, saving }));
  };

  const handleRequiredInputChange = (itemId: number, index: number, field: 'key' | 'label' | 'value', value: string) => {
    updateItemEditor(itemId, (current) => ({
      ...current,
      requiredInputs: current.requiredInputs.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const handleAddRequiredInput = (itemId: number) => {
    updateItemEditor(itemId, (current) => ({
      ...current,
      requiredInputs: [...current.requiredInputs, { key: '', label: '', value: '' }],
    }));
  };

  const handleRemoveRequiredInput = (itemId: number, index: number) => {
    updateItemEditor(itemId, (current) => ({
      ...current,
      requiredInputs: current.requiredInputs.filter((_, rowIndex) => rowIndex !== index),
    }));
  };


  const handleSaveItemData = async (itemId: number) => {
    if (!order) return;
    const editor = itemEditors[itemId] || { requiredInputs: [], saving: false };

    setItemSaving(itemId, true);
    try {
      const response = await apiFetch(`/admin/orders/${order.id}/items/${itemId}/data`, {
        method: 'PUT',
        body: JSON.stringify({
          required_inputs: normalizeRequiredInputsPayload(editor.requiredInputs),
        }),
      });

      if ((response as { success?: boolean }).success) {
        toast.success('Đã cập nhật dữ liệu đơn hàng');
        await loadOrder(false);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật dữ liệu đơn hàng');
    } finally {
      setItemSaving(itemId, false);
    }
  };

  const getRequiredInputLabelMap = (item: OrderItem) => {
    return buildRequiredInputLabelMap(item.variant_required_inputs);
  };

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Đang tải chi tiết đơn hàng...</div>;
  }

  if (error || !order) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{error || 'Không tìm thấy đơn hàng'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/tp-admin/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Quay lại đơn hàng
        </Link>

        <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-card px-6 py-6 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(720px,760px)] 2xl:items-start">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight">{order.order_code}</h1>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${getOrderStatusClassName(order.status)}`}>
                {getOrderStatusLabel(order.status)}
              </span>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Quản trị viên có thể cập nhật trạng thái đơn, kiểm tra dữ liệu khách nhập và theo dõi dịch vụ phát sinh từ đơn này.
            </p>
          </div>

          <div className="grid w-full gap-3 md:grid-cols-3 2xl:min-w-[720px]">
            <SummaryCard
              icon={<Wallet className="h-5 w-5" />}
              label="Tổng thanh toán"
              value={formatVND(Number(order.total_amount || 0))}
              hint={`Ngoài ví: ${formatVND(Number(order.payment_amount || 0))}`}
            />
            <SummaryCard
              icon={<UserRound className="h-5 w-5" />}
              label="Khách hàng"
              value={order.user.full_name || order.user.email}
              hint={order.user.email}
            />
            <SummaryCard
              icon={<Clock3 className="h-5 w-5" />}
              label="Ngày mua"
              value={formatDateSafe(order.created_at)}
              hint={`Hoàn thành: ${formatDateSafe(order.completed_at)}`}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">Sản phẩm trong đơn</h2>
                <p className="text-sm text-muted-foreground">Thông tin mặt hàng và biến thể khách đã mua.</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">Số lượng sản phẩm</p>
                <p className="font-black">{order.items.length}</p>
              </div>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-secondary/10 p-4">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary">
                      <img src={resolveMediaUrl(item.product_thumbnail, '/file.svg')} alt={item.product_name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-black">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">{formatVND(Number(item.total_price || 0))}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatVND(Number(item.unit_price || 0))} x {item.quantity}
                          </p>
                        </div>
                      </div>

                      {item.guide_link ? (
                        <Link href={item.guide_link} target="_blank" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                          Xem hướng dẫn
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black">Thông tin khách đã nhập</h2>
              <p className="text-sm text-muted-foreground">Admin có thể sửa, xóa hoặc thêm mới dữ liệu đầu vào của từng sản phẩm trong đơn.</p>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => {
                const editor = itemEditors[item.id] || { requiredInputs: [], saving: false };
                const labelMap = getRequiredInputLabelMap(item);
                const normalizedRows = editor.requiredInputs.map((row) => ({
                  ...row,
                  label: labelMap.get(String(row.key || '').trim()) || row.label || row.key,
                }));

                return (
                  <div key={item.id} className="rounded-2xl border border-border bg-secondary/10 p-4">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveItemData(item.id)}
                        disabled={editor.saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {editor.saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Lưu dữ liệu
                      </button>
                    </div>

                    <div className="space-y-3">
                      {normalizedRows.map((row, index) => {
                        const isLockedField = labelMap.has(String(row.key || '').trim());

                        return (
                          <div key={`${item.id}-required-${index}`} className="rounded-2xl border border-border bg-card p-4">
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] lg:items-start">
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tên trường</label>
                                <input
                                  value={row.label}
                                  onChange={(event) => handleRequiredInputChange(item.id, index, 'label', event.target.value)}
                                  placeholder="vd: Email"
                                  readOnly={isLockedField}
                                  className={`w-full rounded-xl border border-border px-4 py-3 text-sm outline-none ${isLockedField ? 'cursor-not-allowed bg-secondary text-muted-foreground' : 'bg-background'}`}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Giá trị</label>
                                <input
                                  value={row.value}
                                  onChange={(event) => handleRequiredInputChange(item.id, index, 'value', event.target.value)}
                                  placeholder="Nhập dữ liệu khách đã gửi"
                                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
                                />
                              </div>

                              <div className="flex pt-7">
                                {isLockedField ? (
                                  <div className="inline-flex items-center rounded-xl border border-border px-3 py-3 text-sm font-semibold text-muted-foreground">
                                    Trường gốc
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRequiredInput(item.id, index)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/5"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {editor.requiredInputs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
                          Chưa có dữ liệu đầu vào cho item này.
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleAddRequiredInput(item.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                      >
                        <Plus className="h-4 w-4" />
                        Thêm trường mới
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>



          {orderServices.length > 0 ? (
            <div className="rounded-[28px] border border-border bg-card p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black">Dịch vụ liên kết</h2>
                  <p className="text-sm text-muted-foreground">Các gói thời hạn phát sinh từ đơn này được quản lý trong tab riêng.</p>
                </div>
                <Link
                  href={`/tp-admin/services?search=${encodeURIComponent(String(orderServices[0]?.service?.id || order.order_code))}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Mở quản lý dịch vụ
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-3">
                {orderServices.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-secondary/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getServiceStatusClassName(item.service?.status)}`}>
                        {getServiceStatusLabel(item.service?.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Mã dịch vụ</p>
                        <p className="mt-1 text-sm font-semibold">#{item.service?.id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Gia hạn</p>
                        <p className="mt-1 text-sm font-semibold">{item.service?.allowRenewal ? 'Cho phép gia hạn' : 'Chỉ mua mới'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Bắt đầu</p>
                        <p className="mt-1 text-sm font-semibold">{formatDateSafe(item.service?.startedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Hết hạn</p>
                        <p className="mt-1 text-sm font-semibold">{formatDateSafe(item.service?.expiresAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-secondary/60 p-3 text-muted-foreground">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Cập nhật đơn hàng</h2>
                <p className="text-sm text-muted-foreground">Thao tác chính dành cho quản trị viên.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Trạng thái mới</p>
                <select
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none"
                >
                  {ORDER_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={statusSubmitting || statusValue === order.status}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {statusSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                Lưu trạng thái
              </button>

              <div className="rounded-2xl border border-border bg-secondary/10 p-4 text-sm text-muted-foreground">
                Khi chuyển sang <span className="font-bold text-foreground">Hoàn thành</span>, hệ thống sẽ tiếp tục cấp dịch vụ nếu biến thể có cấu hình thời hạn.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-6">
            <h2 className="text-lg font-black">Khách hàng</h2>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Họ tên</p>
                <p className="mt-1 text-sm font-semibold">{order.user.full_name}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Email</p>
                <p className="mt-1 text-sm font-semibold break-all">{order.user.email}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Số dư hiện tại</p>
                <p className="mt-1 text-sm font-semibold">{formatVND(Number(order.user.balance || 0))}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-6">
            <h2 className="text-lg font-black">Thanh toán và thời gian</h2>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-semibold">{formatVND(Number(order.subtotal_amount || 0))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Giảm giá</span>
                <span className="font-semibold">-{formatVND(Number(order.discount_amount || 0))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Số dư đã dùng</span>
                <span className="font-semibold">{formatVND(Number(order.balance_applied || 0))}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Thanh toán ngoài</span>
                <span className="font-semibold">{formatVND(Number(order.payment_amount || 0))}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-black">Tổng thanh toán</span>
                <span className="text-xl font-black text-primary">{formatVND(Number(order.total_amount || 0))}</span>
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Ngày mua</p>
                <p className="mt-1 text-sm font-semibold">{formatDateSafe(order.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Hoàn thành</p>
                <p className="mt-1 text-sm font-semibold">{formatDateSafe(order.completed_at)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Xử lý</p>
                <p className="mt-1 text-sm font-semibold">{formatDateSafe(order.processed_at)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">SePay</p>
                <p className="mt-1 text-sm font-semibold">{order.payment_status || '--'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
