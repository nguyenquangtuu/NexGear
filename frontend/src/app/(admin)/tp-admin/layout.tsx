'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Menu } from 'lucide-react';

import NotificationBell from '@/components/NotificationBell';
import AdminSidebar from './components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const authorized = !!user && user.role === 'ADMIN';

  useEffect(() => {
    const titles: Record<string, string> = {
      '/tp-admin': 'Bảng điều khiển',
      '/tp-admin/orders': 'Quản lý đơn hàng',
      '/tp-admin/services': 'Quản lý dịch vụ',
      '/tp-admin/products': 'Quản lý sản phẩm',
      '/tp-admin/categories': 'Quản lý danh mục',
      '/tp-admin/users': 'Quản lý người dùng',
      '/tp-admin/chats': 'Chat CSKH',
      '/tp-admin/coupons': 'Mã giảm giá',
      '/tp-admin/banks': 'Cấu hình ngân hàng',
      '/tp-admin/home-banners': 'Banner trang chủ',
      '/tp-admin/seo': 'Cấu hình SEO',
      '/tp-admin/posts': 'Quản lý bài viết',
      '/tp-admin/transactions': 'Lịch sử giao dịch',
    };

    const currentTitle = titles[pathname] || 
      (pathname.startsWith('/tp-admin/orders/') ? 'Chi tiết đơn hàng' :
       pathname.startsWith('/tp-admin/services/') ? 'Chi tiết dịch vụ' :
       pathname.startsWith('/tp-admin/users/') ? 'Chi tiết người dùng' :
       pathname === '/tp-admin/products/new' ? 'Thêm sản phẩm mới' :
       pathname.startsWith('/tp-admin/products/') ? 'Chỉnh sửa sản phẩm' :
       pathname.startsWith('/tp-admin/categories/') ? 'Quản lý danh mục' :
       'Quản trị hệ thống');

    document.title = `${currentTitle} | VEXTRO Admin`;
  }, [pathname]);

  useEffect(() => {
    if (!loading && !authorized) {
      router.replace('/');
    }
  }, [authorized, loading, router]);

  if (loading || !authorized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="type-body-muted animate-pulse">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <AdminSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <main className={`transition-all duration-300 ${collapsed ? 'lg:pl-[84px]' : 'lg:pl-[248px]'}`}>
        <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 -ml-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              aria-label="Mở menu quản trị"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block">
              <h1 className="type-title-md text-foreground">Quản trị hệ thống</h1>
              <p className="type-body-muted">Chào mừng trở lại, {user?.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:block">
              <NotificationBell />
            </div>
            <div className="hidden text-right md:block">
              <p className="type-label text-foreground">{user?.fullName}</p>
              <p className="type-caption text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/50 font-semibold text-foreground">
              {user?.fullName?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
