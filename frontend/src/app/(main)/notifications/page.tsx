'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, CheckCheck, Package, CreditCard, ShieldCheck, LogIn, Trash2, Filter, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from '@/components/NotificationBell';
import { subscribePrivateChannel, unsubscribePrivateChannel } from '@/lib/realtime';

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  createdAt: string;
};

const PAGE_SIZE = 10;

const NotificationsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async ({ nextPage, append }: { nextPage: number; append: boolean }) => {
    if (!user) return;

    const isInitial = nextPage === 1;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await apiFetch(`/notifications?page=${nextPage}&limit=${PAGE_SIZE}`);
      if (res.success) {
        const allNotifications = (res.data.notifications || []) as NotificationItem[];
        const incoming = filter === 'unread' ? allNotifications.filter((n) => !n.is_read) : allNotifications;

        setNotifications((prev) => (append ? [...prev, ...incoming] : incoming));
        setUnreadCount(res.data.unreadCount || 0);

        const totalPages = res.data.pagination?.totalPages ?? nextPage;
        setHasMore(nextPage < totalPages && allNotifications.length > 0);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, filter]);

  useEffect(() => {
    setNotifications([]);
    setHasMore(true);
    setPage(1);
    fetchNotifications({ nextPage: 1, append: false });
  }, [fetchNotifications, filter]);

  useEffect(() => {
    if (!user) return;

    const channelName = `private-user-${user.id}`;
    const channel = subscribePrivateChannel(channelName);
    if (!channel) return;

    const onNotificationNew = (payload: { notification?: NotificationItem; unreadCount?: number }) => {
      const incoming = payload?.notification;
      if (!incoming?._id) return;

      setUnreadCount(Number(payload?.unreadCount || 0));
      setHasMore(true);
      setPage(1);

      setNotifications((prev) => {
        const withoutIncoming = prev.filter((item) => item._id !== incoming._id);
        if (filter === 'unread' && incoming.is_read) {
          return withoutIncoming;
        }
        return [incoming, ...withoutIncoming];
      });
    };

    const onNotificationChanged = (payload: { unreadCount?: number }) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(Number(payload.unreadCount));
      }
      fetchNotifications({ nextPage: 1, append: false });
    };

    channel.bind('notifications:new', onNotificationNew);
    channel.bind('notifications:changed', onNotificationChanged);
    channel.bind('notifications:unread-count', (payload: { unreadCount?: number }) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(Number(payload.unreadCount));
      }
    });

    return () => {
      channel.unbind('notifications:new', onNotificationNew);
      channel.unbind('notifications:changed', onNotificationChanged);
      channel.unbind('notifications:unread-count');
      unsubscribePrivateChannel(channelName);
    };
  }, [user, filter, fetchNotifications]);

  useEffect(() => {
    if (!user || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNotifications({ nextPage: page + 1, append: true });
        }
      },
      { rootMargin: '200px' }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);

    return () => observer.disconnect();
  }, [user, loading, loadingMore, hasMore, page, fetchNotifications]);

  const markAsRead = async (notificationId?: string) => {
    try {
      if (notificationId) {
        await apiFetch(`/notifications/${notificationId}/read`, { method: 'PUT' });
      } else {
        await apiFetch('/notifications/read-all', { method: 'PUT' });
      }

      setNotifications([]);
      setHasMore(true);
      setPage(1);
      await fetchNotifications({ nextPage: 1, append: false });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string, wasUnread: boolean) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa thông báo này không?');
    if (!confirmed) return;

    const index = notifications.findIndex((n) => n._id === notificationId);
    const deletedItem = index >= 0 ? notifications[index] : null;

    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await apiFetch(`/notifications/${notificationId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete notification:', error);

      if (deletedItem) {
        setNotifications((prev) => {
          const next = [...prev];
          const restoreIndex = Math.min(Math.max(index, 0), next.length);
          next.splice(restoreIndex, 0, deletedItem);
          return next;
        });
      }

      if (wasUnread) {
        setUnreadCount((prev) => prev + 1);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_SUCCESS':
      case 'ORDER_COMPLETED':
        return <Package className="h-4 w-4 text-primary" />;
      case 'DEPOSIT_SUCCESS':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'BALANCE_ADJUSTED':
        return <CreditCard className="h-4 w-4 text-orange-500" />;
      case 'SERVICE_RENEWAL_REMINDER':
        return <Bell className="h-4 w-4 text-amber-500" />;
      case 'SERVICE_EXPIRED':
        return <ShieldCheck className="h-4 w-4 text-red-500" />;
      case 'LOGIN_SUCCESS':
        return <LogIn className="h-4 w-4 text-blue-500" />;
      case 'ACCOUNT_BLOCKED':
      case 'ACCOUNT_UNBLOCKED':
        return <ShieldCheck className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <div className="bg-secondary p-4 rounded-full">
          <Bell className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Vui lòng đăng nhập</h2>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">Bạn cần đăng nhập để xem thông báo</p>
        <Link href="/login" className="rounded-2xl bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:opacity-95 active:scale-[0.99]">
          Đăng nhập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-background pb-20 lg:pb-14">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Thông báo</span>
        </div>

        <div className="mt-3 rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-3 md:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                <NotificationBell className="p-0 scale-90" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-tight">Thông báo</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả đã được đọc'}
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                  filter === 'unread'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-secondary text-foreground border-border hover:bg-muted'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>{filter === 'unread' ? 'Chưa đọc' : 'Tất cả'}</span>
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500/20 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Đọc tất cả</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-border bg-card">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
              <p className="text-sm font-semibold text-muted-foreground">Đang tải thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-border bg-card text-center px-4">
              <Bell className="h-14 w-14 text-muted-foreground/20 mb-3" />
              <p className="text-base font-bold text-foreground">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo nào'}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1.5 max-w-md">
                {filter === 'unread' ? 'Tất cả thông báo đã được đọc' : 'Các thông báo sẽ xuất hiện khi có cập nhật'}
              </p>
            </div>
          ) : (
            <>
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`rounded-xl border bg-card transition-all hover:border-primary/25 ${
                    notif.is_read ? 'border-border/60' : 'border-primary/20 ring-1 ring-primary/5'
                  }`}
                >
                  <div className="p-3 md:p-3.5 flex items-start gap-2.5 md:gap-3">
                    <div className={`shrink-0 p-2 rounded-lg border ${notif.is_read ? 'bg-secondary border-border' : 'bg-primary/10 border-primary/10'}`}>
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2.5 md:gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground leading-snug break-words">{notif.title}</h3>
                          <p className="mt-1 whitespace-pre-line break-words text-xs leading-snug text-muted-foreground">{notif.message}</p>
                          <p className="text-[11px] text-muted-foreground/70 mt-1.5 font-medium">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.is_read && (
                            <button
                              onClick={() => markAsRead(notif._id)}
                              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                              title="Đánh dấu đã đọc"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif._id, !notif.is_read)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Xóa thông báo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center py-4 text-xs text-muted-foreground">
                  {loadingMore ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang tải thêm thông báo...</span>
                    </div>
                  ) : (
                    <span>Kéo xuống để tải thêm</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
