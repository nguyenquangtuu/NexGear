'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Copy, Link2, MessageCircle, Unlink2 } from 'lucide-react';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { subscribePrivateChannel } from '@/lib/realtime';

type ZaloBotStatus = {
  configured: boolean;
  botLink: string | null;
  linked: boolean;
  enabled: boolean;
  chatIdMasked: string | null;
  chatName: string | null;
  linkedAt: string | null;
  linkCode: string | null;
  linkCodeExpiresAt: string | null;
};

type PendingAction = 'create-link' | 'toggle-enabled' | 'unlink' | null;

export function ZaloBotNotificationCard({ userId }: { userId: number | string }) {
  const [status, setStatus] = useState<ZaloBotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const loadStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const res = await apiFetch('/zalo-bot/status');
      if (res.success) {
        setStatus(res.data);
      }
    } catch (error) {
      console.error('Failed to load Zalo Bot status', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let pollingTimer: ReturnType<typeof setInterval> | number | null = null;

    void loadStatus();

    const channel = subscribePrivateChannel(`private-user-${userId}`);

    const handleLinked = (data: { chatName?: string; chatIdMasked?: string }) => {
      setStatus((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          linked: true,
          chatName: data.chatName ?? prev.chatName,
          chatIdMasked: data.chatIdMasked ?? prev.chatIdMasked,
          enabled: true,
          linkCode: null,
          linkCodeExpiresAt: null,
        };
      });
      void loadStatus(false);
    };

    const handleSubscriptionError = (statusCode: number) => {
      console.error('Failed to subscribe Zalo Bot realtime channel:', statusCode);
    };

    if (channel) {
      channel.bind('zalo-bot:linked', handleLinked);
      channel.bind('pusher:subscription_error', handleSubscriptionError);
    }

    if (status?.linkCode && !status.linked) {
      pollingTimer = window.setInterval(() => {
        void loadStatus(false);
      }, 3000);
    }

    return () => {
      if (pollingTimer) {
        window.clearInterval(pollingTimer);
      }
      if (channel) {
        channel.unbind('zalo-bot:linked', handleLinked);
        channel.unbind('pusher:subscription_error', handleSubscriptionError);
      }
    };
  }, [status?.linkCode, status?.linked, userId]);

  const createLinkCode = async () => {
    setSubmitting(true);
    setPendingAction('create-link');
    try {
      const res = await apiFetch('/zalo-bot/link-code', { method: 'POST' });
      if (res.success) {
        setStatus(res.data);
      }
    } catch (error) {
      alert(getErrorMessage(error, 'Không thể tạo mã liên kết Zalo Bot'));
    } finally {
      setSubmitting(false);
      setPendingAction(null);
    }
  };

  const updateEnabled = async (enabled: boolean) => {
    setSubmitting(true);
    setPendingAction('toggle-enabled');
    try {
      const res = await apiFetch('/zalo-bot/preferences', {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      if (res.success) {
        setStatus(res.data);
      }
    } catch (error) {
      alert(getErrorMessage(error, 'Không thể cập nhật nhận thông báo qua Zalo Bot'));
    } finally {
      setSubmitting(false);
      setPendingAction(null);
    }
  };

  const unlink = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy liên kết Zalo Bot không?')) return;

    setSubmitting(true);
    setPendingAction('unlink');
    try {
      const res = await apiFetch('/zalo-bot/link', { method: 'DELETE' });
      if (res.success) {
        setStatus(res.data);
      }
    } catch (error) {
      alert(getErrorMessage(error, 'Không thể hủy liên kết Zalo Bot'));
    } finally {
      setSubmitting(false);
      setPendingAction(null);
    }
  };

  const copyLinkCode = async () => {
    if (!status?.linkCode) return;
    try {
      await navigator.clipboard.writeText(status.linkCode);
      alert('Đã sao chép mã liên kết');
    } catch {
      alert('Không thể sao chép mã liên kết');
    }
  };

  if (loading || !status) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/10 p-4">
        <div>
          <p className="text-sm font-bold">Thông báo qua Zalo Bot</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Đang tải cấu hình nhận thông báo...</p>
        </div>
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/10 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0068FF]/10 text-[#0068FF]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Thông báo qua Zalo Bot</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Kênh này đang chưa sẵn sàng trên hệ thống.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-secondary/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0068FF]/10 text-[#0068FF]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Thông báo qua Zalo Bot</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Liên kết tài khoản để nhận đơn hàng, dịch vụ và các thông báo quan trọng ngay trên Zalo.
            </p>
          </div>
        </div>

        {status.botLink && (
          <a
            href={status.botLink}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 cursor-pointer rounded-lg bg-[#0068FF] px-3 py-2 text-[10px] font-black text-white transition-all hover:opacity-90"
          >
            Mở bot
          </a>
        )}
      </div>

      {status.linked ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 font-bold text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã liên kết
            </span>
            <span className="text-muted-foreground">
              {status.chatName ? `Tài khoản Zalo: ${status.chatName}` : `Chat ID: ${status.chatIdMasked || '--'}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateEnabled(!status.enabled)}
              disabled={submitting}
              className={`rounded-lg border px-4 py-2 text-[10px] font-black transition-all ${
                status.enabled
                  ? 'border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20'
                  : 'border-border/60 bg-secondary text-foreground hover:bg-muted'
              } ${submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              {pendingAction === 'toggle-enabled'
                ? 'Đang xử lý...'
                : status.enabled
                  ? 'Đang bật nhận thông báo'
                  : 'Bật nhận thông báo'}
            </button>
            <button
              onClick={unlink}
              disabled={submitting}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-[10px] font-black text-red-500 transition-all hover:bg-red-500/20 ${
                submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
            >
              <Unlink2 className="h-3.5 w-3.5" />
              {pendingAction === 'unlink' ? 'Đang hủy liên kết...' : 'Hủy liên kết'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={createLinkCode}
              disabled={submitting}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-[#0068FF]/20 bg-[#0068FF]/10 px-4 py-2 text-[10px] font-black text-[#0068FF] transition-all hover:bg-[#0068FF]/20 ${
                submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              {pendingAction === 'create-link'
                ? 'Đang tạo mã...'
                : status.linkCode
                  ? 'Tạo lại mã liên kết'
                  : 'Tạo mã liên kết'}
            </button>
          </div>

          {status.linkCode && (
            <div className="space-y-3 rounded-xl border border-[#0068FF]/20 bg-[#0068FF]/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#0068FF]">Mã liên kết</p>
                  <p className="mt-1 text-base font-black text-foreground">{status.linkCode}</p>
                </div>
                <button
                  onClick={copyLinkCode}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[10px] font-black text-foreground hover:bg-secondary"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Sao chép
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Mã có hiệu lực đến {status.linkCodeExpiresAt ? new Date(status.linkCodeExpiresAt).toLocaleString('vi-VN') : '--'}.
              </p>

              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>1. Mở Zalo Bot của cửa hàng.</p>
                <p>
                  2. Gửi đúng mã <span className="font-black text-foreground">{status.linkCode}</span> vào khung chat của bot.
                </p>
                <p>3. Bot sẽ xác nhận và tự bật nhận thông báo cho tài khoản của bạn.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
