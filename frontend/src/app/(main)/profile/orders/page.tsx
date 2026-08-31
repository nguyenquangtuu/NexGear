'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, ShoppingBag, Star, X, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ClientPortal from '@/components/ClientPortal';
import { resolveMediaUrl } from '@/lib/media';
import { ReviewModal } from '../_components/ReviewModal';

type RequiredInputDef = {
  id?: string;
  label?: string;
  required?: boolean;
};

const OrdersPage = () => {
  const REVIEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderTabParam = searchParams.get('orderTab');

  const [orderTab, setOrderTab] = useState(orderTabParam || 'all');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [reviewingOrder, setReviewingOrder] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/orders/my');
      if (res.success) {
        setOrders(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (orderTabParam) {
      setOrderTab(orderTabParam);
    }
  }, [orderTabParam]);

  const isRateable = (order: any) => {
    if (!order || order.status !== 'COMPLETED' || order.is_reviewed) return false;

    const completionDate = order.completed_at || order.created_at;
    const completionTime = new Date(completionDate).getTime();
    if (!Number.isFinite(completionTime)) return false;

    const diff = Date.now() - completionTime;
    if (diff < 0) return false;

    return diff <= REVIEW_WINDOW_MS;
  };

  const rateableOrders = orders.filter(isRateable);

  const handleOrderTabChange = (status: string) => {
    setOrderTab(status);
    const params = new URLSearchParams(searchParams.toString());
    params.set('orderTab', status);
    router.push(`/profile/orders?${params.toString()}`, { scroll: false });
  };

  const getFilteredOrders = (tabId: string) => {
    if (tabId === 'all') return orders;
    if (tabId === 'rating') return rateableOrders;
    
    if (tabId === 'processing') {
      return orders.filter((order) => 
        ['PROCESSING', 'PENDING_PAYMENT', 'SHIPPING', 'DELIVERING'].includes(order.status)
      );
    }
    
    return orders.filter((order) => order.status.toLowerCase() === tabId.toLowerCase());
  };

  const processingCount = orders.filter((order) => 
    ['PROCESSING', 'PENDING_PAYMENT', 'SHIPPING', 'DELIVERING'].includes(order.status)
  ).length;
  const ratingCount = rateableOrders.length;

  const orderTabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'processing', label: 'Đang xử lý' },
    { id: 'completed', label: 'Hoàn thành' },
    { id: 'rating', label: 'Đánh giá' },
    { id: 'cancelled', label: 'Đã hủy' },
  ];

  const getFriendlyLabel = (key: string) => {
    const labels: Record<string, string> = {
      account_email: 'Email tài khoản',
      account_gmail: 'Gmail',
      account_password: 'Mật khẩu',
      password: 'Mật khẩu',
      server: 'Máy chủ',
      character_name: 'Tên nhân vật',
      backup_code: 'Mã dự phòng',
      login_method: 'Phương thức đăng nhập',
      ingame_id: 'ID Ingame',
      phone_number: 'Số điện thoại',
      note: 'Ghi chú',
    };

    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const parseJsonObject = (value: unknown) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const getRequiredInputLabel = (order: any, key: string) => {
    const parsedDefs = parseJsonObject(order?.variant_required_inputs);
    const defs = Array.isArray(parsedDefs) ? (parsedDefs as RequiredInputDef[]) : [];
    const matched = defs.find((item) => String(item?.id || '') === String(key));
    return matched?.label || getFriendlyLabel(key);
  };

  const getRequiredInputEntries = (order: any) => {
    const parsed = parseJsonObject(order?.required_inputs);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const key = String((item as { key?: unknown }).key ?? '');
          const label = String((item as { label?: unknown }).label ?? '');
          const value = String((item as { value?: unknown }).value ?? '');
          if (!key && !label) return null;
          const normalizedLabel = label.trim();
          const fallbackLabel = getRequiredInputLabel(order, key);
          return {
            key: key || label,
            label:
              !normalizedLabel || normalizedLabel === key || /^input_\d+$/i.test(normalizedLabel)
                ? fallbackLabel
                : normalizedLabel,
            value,
          };
        })
        .filter(Boolean) as Array<{ key: string; label: string; value: string }>;
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).map(([key, value]) => ({
        key,
        label: getRequiredInputLabel(order, key),
        value: String(value),
      }));
    }

    return [];
  };

  const formatDateSafe = (value: unknown) => {
    if (!value) return '--';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderStatusLabel = (status: string) => {
    if (status === 'COMPLETED') return 'Hoàn thành';
    if (status === 'PROCESSING') return 'Đang xử lý';
    if (status === 'SHIPPING') return 'Đang vận chuyển';
    if (status === 'DELIVERING') return 'Đang giao hàng';
    if (status === 'DELIVERED') return 'Đã giao hàng';
    if (status === 'PENDING_PAYMENT') return 'Chờ thanh toán';
    if (status === 'CANCELLED') return 'Đã hủy';
    if (status === 'REFUNDED') return 'Đã hoàn tiền';
    return status;
  };

  const getOrderStatusClassName = (status: string) => {
    if (status === 'COMPLETED') return 'text-green-500';
    if (status === 'CANCELLED' || status === 'REFUNDED') return 'text-red-500';
    if (status === 'SHIPPING' || status === 'DELIVERING') return 'text-purple-500';
    return 'text-primary';
  };

  const getServiceManagementHref = (order: any) => {
    if (!order?.service?.id) return '/profile/services';

    const params = new URLSearchParams();
    params.set('serviceId', String(order.service.id));
    params.set('orderId', String(order.id));
    return `/profile/services?${params.toString()}`;
  };

  const hasOrderGuide = (order: any) => Boolean(order?.guide_link) && !order?.service;

  return (
    <div className="animate-fade-in flex flex-col min-h-[60vh]">
      <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          onClick={() => router.push('/profile')}
          className="p-1 hover:bg-muted rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-black">Lịch sử mua hàng</h2>
      </div>

      <div className="bg-card border border-border rounded-xl md:rounded-2xl sticky top-2 md:top-auto z-10 mx-4 md:mx-0 overflow-hidden shadow-sm mt-4 md:mt-0">
        <div className="flex overflow-x-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {orderTabs.map((tab) => {
            const count = tab.id === 'processing' ? processingCount : tab.id === 'rating' ? ratingCount : 0;
            const showBadge = count > 0;

            return (
              <button
                key={tab.id}
                onClick={() => handleOrderTabChange(tab.id)}
                className={`flex-none px-5 py-3 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${orderTab === tab.id
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
              >
                {tab.label}
                {showBadge && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-primary text-white text-[9px] font-black rounded-full shadow-sm">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-grow space-y-3 mt-3 px-4 md:px-0 pb-6">
        {ordersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <p className="text-sm font-bold text-muted-foreground">Đang tải đơn hàng...</p>
          </div>
        ) : getFilteredOrders(orderTab).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border/50">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-bold text-muted-foreground">Chưa có đơn hàng nào</p>
            <Link href="/" className="mt-4 text-xs font-black text-primary hover:underline">
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          getFilteredOrders(orderTab).map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-card border border-border rounded-xl md:rounded-2xl overflow-hidden shadow-sm animate-fade-in cursor-pointer hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase">{order.order_code}</span>
                </div>
                <span className={`text-[10px] font-black uppercase ${getOrderStatusClassName(order.status)}`}>
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>

              <div className="p-4 flex gap-4">
                <div className="h-20 w-20 rounded-lg bg-secondary overflow-hidden shrink-0 border border-border/50">
                  <img
                    src={resolveMediaUrl(order.product_thumbnail, 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop')}
                    alt="Product"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold line-clamp-2 leading-snug">{order.product_name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      Phân loại: <span className="text-foreground">{order.variant_name}</span>
                    </p>
                    <p className="text-xs font-bold mt-1.5 flex items-center gap-1">
                      <span className="text-muted-foreground">Số lượng:</span>
                      <span className="text-foreground">x{order.quantity}</span>
                    </p>
                    {order.service && (
                      <div className="mt-2 rounded-lg bg-primary/5 px-2.5 py-2 text-[11px]">
                        <div className="font-black uppercase text-primary">{order.service.statusLabel}</div>
                        <div className="mt-1 text-muted-foreground">
                          Hết hạn: {formatDateSafe(order.service.expiresAt)}
                        </div>
                        <Link
                          href={getServiceManagementHref(order)}
                          onClick={(event) => event.stopPropagation()}
                          className="mt-2 inline-flex text-[11px] font-black text-primary hover:underline"
                        >
                          Mở quản lý dịch vụ
                        </Link>
                      </div>
                    )}
                    {hasOrderGuide(order) && (
                      <a
                        href={order.guide_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="mt-2 inline-flex text-[11px] font-black text-primary hover:underline"
                      >
                        Xem hướng dẫn sử dụng
                      </a>
                    )}
                    {order.warranty_expires_at && (
                      <div className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-[11px]">
                        <div className="font-black uppercase text-emerald-600">Bảo hành</div>
                        <div className="mt-1 text-muted-foreground">
                          Đến: {formatDateSafe(order.warranty_expires_at)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-primary">{Math.round(order.total_amount).toLocaleString('vi-VN')}đ</p>
                  </div>
                </div>
              </div>



              <div className="px-4 py-3 bg-secondary/5 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {formatDateSafe(order.created_at || order.createdAt)}
                </span>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Thành tiền:</span>
                    <span className="text-base font-black text-primary">{Math.round(order.total_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {order.status === 'PENDING_PAYMENT' && (
                      <Link
                        href={`/payment-result?orderCode=${order.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-[9px] font-black rounded-lg hover:bg-primary/10 transition-all"
                      >
                        Tiếp tục thanh toán
                      </Link>
                    )}
                    {order.service && (
                      <Link
                        href={getServiceManagementHref(order)}
                        onClick={(event) => event.stopPropagation()}
                        className="px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-[9px] font-black rounded-lg hover:bg-primary/10 transition-all"
                      >
                        Quản lý dịch vụ
                      </Link>
                    )}
                    {hasOrderGuide(order) && (
                      <a
                        href={order.guide_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="px-3 py-1 border border-primary/20 bg-primary/5 text-primary text-[9px] font-black rounded-lg hover:bg-primary/10 transition-all"
                      >
                        Xem hướng dẫn
                      </a>
                    )}
                    {isRateable(order) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setReviewingOrder(order);
                        }}
                        className="px-3 py-1 bg-primary text-white text-[9px] font-black rounded-lg hover:scale-[1.02] transition-all shadow-md shadow-primary/20"
                      >
                        Đánh giá ngay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedOrder && (
        <ClientPortal>
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
            <div className="relative bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <h3 className="font-black text-foreground">Chi tiết đơn hàng</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 max-h-[70vh] overflow-y-auto space-y-5">
                <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-2xl border border-border/50">
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Mã đơn hàng</p>
                    <p className="text-sm font-black text-primary">{selectedOrder.order_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Trạng thái</p>
                    <p className={`text-xs font-black uppercase ${getOrderStatusClassName(selectedOrder.status)}`}>
                      {getOrderStatusLabel(selectedOrder.status)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-black text-foreground uppercase tracking-wider">Sản phẩm</p>
                  <div className="flex gap-4 p-3 border border-border rounded-2xl bg-card">
                    <div className="h-16 w-16 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border/30">
                      <img src={resolveMediaUrl(selectedOrder.product_thumbnail)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold line-clamp-1">{selectedOrder.product_name}</h4>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{selectedOrder.variant_name}</p>
                      <p className="text-xs font-black text-primary mt-1">
                        {Number(selectedOrder.unit_price).toLocaleString('vi-VN')}đ x {selectedOrder.quantity}
                      </p>
                    </div>
                  </div>
                </div>

                {(selectedOrder.shipping_recipient_name || selectedOrder.shipping_phone || selectedOrder.shipping_address || selectedOrder.shipping_note || selectedOrder.delivery_method) && (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">Thông tin giao hàng</p>
                    <div className="rounded-2xl border border-border/50 bg-secondary/30 p-4 space-y-3">
                      {selectedOrder.delivery_method && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Phương thức nhận hàng</p>
                          <p className="mt-1 text-sm font-black text-foreground">
                            {selectedOrder.delivery_method === 'PICKUP' ? 'Nhận tại cửa hàng' : 'Giao hàng'}
                          </p>
                        </div>
                      )}
                      {selectedOrder.pickup_store && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Cửa hàng nhận hàng</p>
                          <p className="mt-1 text-sm font-black text-foreground">{selectedOrder.pickup_store}</p>
                        </div>
                      )}
                      {selectedOrder.shipping_fee != null && Number(selectedOrder.shipping_fee) > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Phí giao hàng</p>
                          <p className="mt-1 text-sm font-black text-foreground">{Number(selectedOrder.shipping_fee).toLocaleString('vi-VN')}đ</p>
                        </div>
                      )}
                      {selectedOrder.shipping_recipient_name && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Người nhận</p>
                          <p className="mt-1 text-sm font-black text-foreground">{selectedOrder.shipping_recipient_name}</p>
                        </div>
                      )}
                      {selectedOrder.shipping_phone && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Số điện thoại</p>
                          <p className="mt-1 text-sm font-black text-foreground">{selectedOrder.shipping_phone}</p>
                        </div>
                      )}
                      {selectedOrder.shipping_address && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Địa chỉ</p>
                          <p className="mt-1 text-sm font-black text-foreground break-words">{selectedOrder.shipping_address}</p>
                        </div>
                      )}
                      {selectedOrder.shipping_note && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Ghi chú giao hàng</p>
                          <p className="mt-1 text-sm text-foreground">{selectedOrder.shipping_note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedOrder.required_inputs && (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">Thông tin đã nhập</p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {(() => {
                        try {
                          const inputs = getRequiredInputEntries(selectedOrder);
                          return inputs.map(({ key, label, value }) => (
                            <div key={key} className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-secondary/30 border border-border/50 hover:border-primary/30 transition-all group/input">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</span>
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-sm font-black text-foreground break-all leading-tight">{String(value)}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(String(value));
                                    alert(`Đã sao chép: ${String(value)}`);
                                  }}
                                  className="shrink-0 p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-all opacity-0 group-hover/input:opacity-100"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ));
                        } catch (_error) {
                          return (
                            <p className="text-[10px] text-muted-foreground italic text-center py-4 bg-muted/20 rounded-xl">
                              Không có thông tin bổ sung
                            </p>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}



                {selectedOrder.service && (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">Thông tin dịch vụ</p>
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase text-primary">Trạng thái</p>
                          <p className="mt-1 text-sm font-black text-foreground">{selectedOrder.service.statusLabel}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-primary">Loại đơn</p>
                          <p className="mt-1 text-sm font-black text-foreground">
                            {selectedOrder.service.action === 'RENEWAL' ? 'Gia hạn gói' : 'Mua gói mới'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Bắt đầu / gia hạn từ</p>
                          <p className="mt-1 text-sm font-semibold">{formatDateSafe(selectedOrder.service.startedAt)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Hết hạn</p>
                          <p className="mt-1 text-sm font-semibold">{formatDateSafe(selectedOrder.service.expiresAt)}</p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm text-muted-foreground">{selectedOrder.service.message}</p>
                      <Link
                        href={getServiceManagementHref(selectedOrder)}
                        className="mt-4 inline-flex text-sm font-black text-primary hover:underline"
                      >
                        {selectedOrder.service.canRenew ? 'Mở quản lý dịch vụ để gia hạn' : 'Mở quản lý dịch vụ'}
                      </Link>
                    </div>
                  </div>
                )}

                {hasOrderGuide(selectedOrder) && (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">Hướng dẫn</p>
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm text-muted-foreground">
                        Sản phẩm này bao gồm hướng dẫn, vui lòng bấm nút bên dưới để xem hướng dẫn.
                      </p>
                      <a
                        href={selectedOrder.guide_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex text-sm font-black text-primary hover:underline"
                      >
                        Mở hướng dẫn
                      </a>
                    </div>
                  </div>
                )}

                {selectedOrder.warranty_expires_at && (
                  <div className="space-y-3">
                    <p className="text-xs font-black text-foreground uppercase tracking-wider">Thông tin bảo hành</p>
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-600">Trạng thái</p>
                          <p className={`mt-1 text-sm font-black ${new Date(selectedOrder.warranty_expires_at).getTime() > Date.now() ? 'text-emerald-600' : 'text-red-500'}`}>
                            {new Date(selectedOrder.warranty_expires_at).getTime() > Date.now() ? 'Còn bảo hành' : 'Hết hạn bảo hành'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Hết hạn vào</p>
                          <p className="mt-1 text-sm font-bold">{formatDateSafe(selectedOrder.warranty_expires_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tạm tính:</span>
                    <span className="font-bold">{Number(selectedOrder.subtotal_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-500">
                    <span className="font-bold">Giảm giá:</span>
                    <span className="font-bold">-{Number(selectedOrder.discount_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-black text-foreground">Tổng thanh toán:</span>
                    <span className="text-xl font-black text-primary">{Number(selectedOrder.total_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/10 border-t border-border">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-secondary text-foreground rounded-2xl font-black text-xs hover:bg-muted transition-all border border-border"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </ClientPortal>
      )}

      {reviewingOrder && (
        <ReviewModal
          order={reviewingOrder}
          onClose={() => setReviewingOrder(null)}
          onRefresh={fetchOrders}
        />
      )}
    </div>
  );
};

export default OrdersPage;
