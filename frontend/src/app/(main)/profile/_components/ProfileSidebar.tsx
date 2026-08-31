'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  ShoppingBag,
  Heart,
  ChevronRight,
  LogOut,
  Settings,
  ShoppingCart,
  Clock,
  CheckCircle,
  Star,
  XCircle,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const menuItems = [
  { id: 'profile', label: 'Hồ sơ của tôi', icon: User, href: '/profile' },
  { id: 'orders', label: 'Lịch sử mua hàng', icon: ShoppingBag, href: '/profile/orders' },
  { id: 'wishlist', label: 'Sản phẩm yêu thích', icon: Heart, href: '/profile/wishlist' },
];

export const ProfileSidebar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isActive = (href: string) => {
    if (href === '/profile') return pathname === '/profile';
    return pathname.startsWith(href);
  };

  return (
    <div className="w-full space-y-5 md:w-[280px] md:shrink-0">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-6 flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {user.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-grow">
            <p className="type-label truncate text-foreground">{user.fullName}</p>
            <p className="type-caption truncate text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`group flex w-full items-center justify-between rounded-xl p-2.5 transition-all ${
                  active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    className={`h-4.5 w-4.5 ${
                      active ? 'text-white' : 'text-muted-foreground group-hover:text-primary'
                    }`}
                  />
                  <span className="type-label-sm">{item.label}</span>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${
                    active ? 'rotate-90' : 'group-hover:translate-x-1'
                  }`}
                />
              </Link>
            );
          })}

          <div className="mt-3 border-t border-border/50 pt-3">
            <button
              onClick={() => logout()}
              className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-red-500 transition-all hover:bg-red-500/10"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span className="type-label-sm">Đăng xuất</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export const MobileProfileMenu = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="flex flex-col pb-20 md:hidden">
      <div className="bg-gradient-to-br from-primary to-primary/80 px-4 pb-6 pt-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-2xl font-semibold text-white shadow-lg">
              {user.fullName.charAt(0)}
            </div>
            <div className="text-white">
              <h2 className="type-title-sm text-white">{user.fullName}</h2>
              <div className="mt-1 flex items-center gap-1">
                <span className="type-eyebrow rounded bg-white/20 px-1.5 py-0.5 text-white">
                  Thành viên mới
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/profile?tab=settings"
              className="rounded-full bg-white/10 p-2 text-white transition-transform active:scale-95"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <Link
              href="/profile/orders"
              className="rounded-full bg-white/10 p-2 text-white transition-transform active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-white backdrop-blur-md">
            <p className="type-eyebrow opacity-80">Ngày tham gia</p>
            <p className="type-title-sm mt-1 text-white">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '--/--/----'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-2 border-y border-border bg-card shadow-sm">
        <Link
          href="/profile/orders"
          className="flex w-full items-center justify-between border-b border-border/50 px-4 py-3.5 text-left transition-colors active:bg-secondary/50"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="type-label text-foreground">Đơn mua</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <span className="type-caption">Xem lịch sử đơn hàng</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
        <div className="grid grid-cols-4 py-4">
          <Link
            href="/profile/orders?orderTab=processing"
            className="flex flex-col items-center gap-2 transition-transform active:scale-95"
          >
            <Clock className="h-6 w-6 text-muted-foreground" />
            <span className="type-caption text-center text-muted-foreground">Đang xử lý</span>
          </Link>
          <Link
            href="/profile/orders?orderTab=completed"
            className="flex flex-col items-center gap-2 transition-transform active:scale-95"
          >
            <CheckCircle className="h-6 w-6 text-muted-foreground" />
            <span className="type-caption text-center text-muted-foreground">Hoàn thành</span>
          </Link>
          <Link
            href="/profile/orders?orderTab=rating"
            className="flex flex-col items-center gap-2 transition-transform active:scale-95"
          >
            <Star className="h-6 w-6 text-muted-foreground" />
            <span className="type-caption text-center text-muted-foreground">Đánh giá</span>
          </Link>
          <Link
            href="/profile/orders?orderTab=cancelled"
            className="flex flex-col items-center gap-2 transition-transform active:scale-95"
          >
            <XCircle className="h-6 w-6 text-muted-foreground" />
            <span className="type-caption text-center text-muted-foreground">Đã hủy</span>
          </Link>
        </div>
      </div>

      <div className="mt-3 space-y-0.5 border-y border-border bg-card shadow-sm">
        <div className="border-b border-border/50 px-4 py-3">
          <h3 className="type-eyebrow text-muted-foreground">Tiện ích của tôi</h3>
        </div>
        <Link
          href="/profile/wishlist"
          className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-secondary/50"
        >
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-blue-500" />
            <span className="type-label text-foreground">Sản phẩm yêu thích</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          href="/notifications"
          className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-secondary/50"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-red-500" />
            <span className="type-label text-foreground">Hộp thư thông báo</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <div className="mt-3 space-y-0.5 border-y border-border bg-card shadow-sm">
        <div className="border-b border-border/50 px-4 py-3">
          <h3 className="type-eyebrow text-muted-foreground">Thiết lập tài khoản</h3>
        </div>
        <Link
          href="/profile?tab=settings"
          className="flex w-full cursor-pointer items-center justify-between px-4 py-4 transition-colors active:bg-secondary/50"
        >
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-green-600" />
            <span className="type-label text-foreground">Hồ sơ cá nhân</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
        <Link
          href="/help-center"
          className="flex w-full items-center justify-between px-4 py-4 transition-colors active:bg-secondary/50"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-yellow-500" />
            <span className="type-label text-foreground">Trung tâm hỗ trợ</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      <div className="mt-6 px-4">
        <button
          onClick={() => logout()}
          className="type-button w-full cursor-pointer rounded-xl border border-border bg-card py-3.5 text-red-500 shadow-sm transition-colors active:bg-red-500/10"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
};
