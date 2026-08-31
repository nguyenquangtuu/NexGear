'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import Link from 'next/link';
import { ProfileSidebar } from './_components/ProfileSidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      '/profile': 'Hồ sơ',
      '/profile/orders': 'Đơn hàng',
      '/profile/services': 'Dịch vụ',
      '/profile/wishlist': 'Yêu thích',
    };

    document.title = `${pageTitles[pathname] || 'Hồ sơ'} | Vextro`;
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="bg-secondary p-4 rounded-full">
          <User className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Vui lòng đăng nhập</h2>
        <p className="text-sm leading-6 text-muted-foreground">Bạn cần đăng nhập để xem thông tin cá nhân</p>
        <a
          href="/login"
          className="rounded-2xl bg-primary px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/15 transition hover:opacity-95 active:scale-[0.99]"
        >
          Đăng nhập ngay
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/10 md:bg-transparent">
      {/* Desktop View */}
      <div className="hidden md:block max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col md:flex-row gap-6">
          <ProfileSidebar />
          <div className="flex-grow min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground mb-5">
              <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
              <span>/</span>
              {pathname === '/profile' ? (
                <span className="text-foreground font-semibold">Tài khoản</span>
              ) : (
                <>
                  <Link href="/profile" className="hover:text-primary transition-colors">Tài khoản</Link>
                  <span>/</span>
                  <span className="text-foreground font-semibold">
                    {{
                      '/profile/orders': 'Đơn hàng',
                      '/profile/services': 'Dịch vụ',
                      '/profile/wishlist': 'Yêu thích',
                    }[pathname] || 'Hồ sơ'}
                  </span>
                </>
              )}
            </div>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        {children}
      </div>
    </div>
  );
}
