'use client';

import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useNotificationRealtime } from '@/lib/useNotificationRealtime';

const NotificationBell = ({
  className = '',
  showCount = false,
  link = true,
  iconClassName = '',
}: {
  className?: string;
  showCount?: boolean;
  link?: boolean;
  iconClassName?: string;
}) => {
  const { user } = useAuth();
  const { unreadCount } = useNotificationRealtime(user?.id ?? null);

  const icon = (
    <>
      <Bell className={`h-5 w-5 ${iconClassName || 'text-muted-foreground'}`} />
      {showCount && unreadCount > 0 && (
        <span className="absolute -right-1 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-background bg-primary px-1 text-[9px] font-black leading-none text-white shadow-sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </>
  );

  if (!link) {
    return (
      <div className={`relative inline-flex items-center justify-center rounded-xl transition-colors hover:bg-secondary ${className}`}>
        {icon}
      </div>
    );
  }

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex items-center justify-center rounded-xl transition-colors hover:bg-secondary ${className}`}
      aria-label="Xem thông báo"
    >
      {icon}
    </Link>
  );
};

export default NotificationBell;
