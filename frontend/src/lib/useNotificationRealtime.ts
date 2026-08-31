'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { subscribePrivateChannel, unsubscribePrivateChannel } from '@/lib/realtime';

export function useNotificationRealtime(userId?: number | string | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const hasUserId = Boolean(userId);

  const refreshUnreadCount = useCallback(async () => {
    if (!hasUserId) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await apiFetch('/notifications/unread-count');
      if (res.success) {
        setUnreadCount(Number(res.data?.count || 0));
      }
    } catch {
      // noop
    }
  }, [hasUserId]);

  useEffect(() => {
    if (!hasUserId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await apiFetch('/notifications/unread-count');
        if (!cancelled && res.success) {
          setUnreadCount(Number(res.data?.count || 0));
        }
      } catch {
        // noop
      }
    })();

    const channelName = `private-user-${userId}`;
    const channel = subscribePrivateChannel(channelName);
    if (!channel) return;

    const onUnread = (payload: { unreadCount?: number }) => {
      setUnreadCount(Number(payload?.unreadCount || 0));
    };

    const onNew = (payload: { unreadCount?: number }) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadCount(Number(payload.unreadCount));
      } else {
        refreshUnreadCount();
      }
    };

    channel.bind('notifications:unread-count', onUnread);
    channel.bind('notifications:new', onNew);
    channel.bind('notifications:changed', onNew);

    return () => {
      cancelled = true;
      channel.unbind('notifications:unread-count', onUnread);
      channel.unbind('notifications:new', onNew);
      channel.unbind('notifications:changed', onNew);
    };
  }, [hasUserId, userId, refreshUnreadCount]);

  return { unreadCount: hasUserId ? unreadCount : 0, refreshUnreadCount };
}
