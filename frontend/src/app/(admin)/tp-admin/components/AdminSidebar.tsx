'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  Ticket,
  FolderTree,
  FileText,
  MessageSquare,
  Images,
  Landmark,
  Search,
  TimerReset,
  Settings,
  Mail,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import { apiFetch } from '@/lib/api';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  hasBadge?: boolean;
  children?: {
    icon: React.ElementType;
    label: string;
    href: string;
  }[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Tổng quan',
    items: [{ icon: BarChart3, label: 'Bảng điều khiển', href: '/tp-admin' }],
  },
  {
    label: 'Quản lý bán hàng',
    items: [
      { icon: ShoppingCart, label: 'Đơn hàng', href: '/tp-admin/orders', hasBadge: true },
      { icon: TimerReset, label: 'Quản lý dịch vụ', href: '/tp-admin/services' },
      { icon: CreditCard, label: 'Giao dịch', href: '/tp-admin/transactions' },
      { icon: Ticket, label: 'Mã giảm giá', href: '/tp-admin/coupons' },
    ],
  },
  {
    label: 'Sản phẩm & Kho',
    items: [
      { icon: Package, label: 'Sản phẩm', href: '/tp-admin/products' },
      { icon: FolderTree, label: 'Danh mục', href: '/tp-admin/categories' },
    ],
  },
  {
    label: 'Khách hàng',
    items: [
      { icon: Users, label: 'Người dùng', href: '/tp-admin/users' },
      { icon: MessageSquare, label: 'Chat CSKH', href: '/tp-admin/chats' },
      { icon: Mail, label: 'Email hàng loạt', href: '/tp-admin/bulk-email' },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      {
        icon: Settings,
        label: 'Cấu hình chung',
        children: [
          { icon: Landmark, label: 'Ngân hàng', href: '/tp-admin/banks' },
          { icon: Images, label: 'Banner trang chủ', href: '/tp-admin/home-banners' },
          { icon: Search, label: 'SEO website', href: '/tp-admin/seo' },
        ],
      },
      { icon: FileText, label: 'Bài viết (Blog)', href: '/tp-admin/posts' },
    ],
  },
];

export default function AdminSidebar({
  isOpen,
  onClose,
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === 'light' ? '/images/brand/logo-light.png' : '/images/brand/logo-dark.png';
  const [isDesktop, setIsDesktop] = useState(false);
  const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
  const [openSubMenus, setOpenSubMenus] = useState<string[]>(() => {
    const initial: string[] = [];
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((child) => pathname === child.href)) {
          initial.push(item.label);
        }
      });
    });
    return initial;
  });
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Auto-expand menus that contain the active path when pathname changes
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    const menusToExpand: string[] = [];
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children?.some((child) => pathname === child.href)) {
          menusToExpand.push(item.label);
        }
      });
    });
    if (menusToExpand.length > 0) {
      setOpenSubMenus((prev) => Array.from(new Set([...prev, ...menusToExpand])));
    }
  }

  const toggleSubMenu = (label: string) => {
    if (isCompact) {
      setCollapsed(false);
      setOpenSubMenus([label]);
      return;
    }
    setOpenSubMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };


  useEffect(() => {
    const updateViewport = () => setIsDesktop(window.innerWidth >= 1024);

    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const fetchProcessingOrdersCount = async () => {
      try {
        const res = await apiFetch('/admin/orders?page=1&limit=1&status=PROCESSING');
        if (res.success) {
          setProcessingOrdersCount(Number(res.data?.pagination?.total || 0));
        }
      } catch {
        setProcessingOrdersCount(0);
      }
    };

    fetchProcessingOrdersCount();
  }, [pathname]);

  const isCompact = isDesktop && collapsed;

  const toggleSidebarMode = () => {
    if (isDesktop) {
      setCollapsed(!collapsed);
      return;
    }

    onClose();
  };

  const handleNavigate = () => {
    if (!isDesktop) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-0 z-[60] h-full w-[248px] border-r border-border/60 bg-card/95 backdrop-blur-xl transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCompact ? 'lg:w-[84px]' : 'lg:w-[248px]'}`}
      >
        <div className="flex h-full flex-col">
          <div className={`px-4 pb-4 pt-5 ${isCompact ? 'lg:flex lg:justify-center' : ''}`}>
            {!isCompact ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-3">
                <Link href="/" className="min-w-0 flex-1" onClick={handleNavigate}>
                  <Image
                    src={logoSrc}
                    alt="VEXTRO"
                    width={132}
                    height={34}
                    className="h-7 w-auto object-contain"
                    priority
                  />
                </Link>
                <button
                  onClick={toggleSidebarMode}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/70 text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
                  aria-label={isDesktop ? 'Thu gọn sidebar' : 'Đóng menu'}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={toggleSidebarMode}
                className="hidden h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-background/50 text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground lg:flex"
                aria-label="Mở rộng sidebar"
              >
                <Image
                  src="/images/brand/favicon.png"
                  alt="VEXTRO"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </button>
            )}
          </div>

          {isCompact && (
            <div className="hidden px-3 pb-3 lg:block">
              <button
                onClick={toggleSidebarMode}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-border/60 bg-background/40 text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground"
                aria-label="Mở rộng sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <nav className={`flex-1 overflow-y-auto pb-4 ${isCompact ? 'lg:px-2' : 'px-3'}`}>
            <div className="space-y-5">
              {menuGroups.map((group) => (
                <div key={group.label} className="space-y-2">
                  {!isCompact && (
                    <div className="type-eyebrow px-3 text-muted-foreground/70">{group.label}</div>
                  )}
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const hasChildren = !!item.children && item.children.length > 0;
                      const isExpanded = openSubMenus.includes(item.label);
                      const isActive =
                        pathname === item.href ||
                        (hasChildren && item.children?.some((c) => pathname === c.href));

                      const Icon = item.icon;
                      const content = (
                        <>
                          <Icon
                            size={18}
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                            }`}
                          />
                          {!isCompact && (
                            <>
                              <span className="type-label truncate">{item.label}</span>
                              {item.hasBadge && processingOrdersCount > 0 ? (
                                <span className="type-button-sm ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-white">
                                  {processingOrdersCount}
                                </span>
                              ) : null}
                              {hasChildren && (
                                <div className="ml-auto text-muted-foreground/50">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      );

                      const itemClassName = `group flex h-11 items-center rounded-lg border transition-all ${
                        isCompact ? 'text-sm lg:justify-center lg:px-0' : 'gap-3 px-3.5 text-sm'
                      } ${
                        isActive
                          ? 'border-border/80 bg-accent text-foreground shadow-sm'
                          : 'border-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/50 hover:text-foreground'
                      }`;

                      if (hasChildren) {
                        return (
                          <div key={item.label} className="space-y-1">
                            <button onClick={() => toggleSubMenu(item.label)} className={`w-full ${itemClassName}`}>
                              {content}
                            </button>
                            {isExpanded && !isCompact && (
                              <div className="ml-4 space-y-1 border-l border-border/60 pl-2 animate-in slide-in-from-top-2 duration-200">
                                {item.children?.map((child) => {
                                  const isChildActive = pathname === child.href;
                                  const ChildIcon = child.icon;
                                  return (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      onClick={handleNavigate}
                                      className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-xs transition-all ${
                                        isChildActive
                                          ? 'bg-accent/50 text-foreground font-bold'
                                          : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                                      }`}
                                    >
                                      <ChildIcon
                                        size={14}
                                        className={isChildActive ? 'text-primary' : 'text-muted-foreground/60'}
                                      />
                                      <span>{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href || '#'}
                          onClick={handleNavigate}
                          title={isCompact ? item.label : ''}
                          className={itemClassName}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className={`border-t border-border/60 p-3 ${isCompact ? 'lg:px-2' : ''}`}>
            <button
              onClick={logout}
              title={isCompact ? 'Đăng xuất' : ''}
              className={`group flex h-11 w-full items-center rounded-lg border border-transparent text-left transition-all hover:border-border/50 hover:bg-muted/50 hover:text-foreground ${
                isCompact ? 'text-sm lg:justify-center lg:px-0' : 'gap-3 px-3.5 text-sm'
              } text-muted-foreground`}
            >
              <LogOut
                size={18}
                className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
              />
              {!isCompact && <span className="type-label">Đăng xuất</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
