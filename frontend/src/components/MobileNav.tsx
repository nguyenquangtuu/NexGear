'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Grid,
  Heart,
  Home,
  Loader2,
  MessageSquare,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { getCategoryIcon } from '@/lib/category-icons';
import NotificationBell from './NotificationBell';

type Category = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
};

const MobileNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const isHomeActive = pathname === '/' || !pathname;
  const isCategoryActive = useMemo(() => pathname.startsWith('/category'), [pathname]);
  const isNotificationActive = pathname === '/notifications';
  const isWishlistActive = pathname === '/wishlist' || pathname === '/profile/wishlist';
  const isChatActive = pathname === '/chat';

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!categoryMenuRef.current?.contains(event.target as Node)) {
        setShowCategoryMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCategoryMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    setShowCategoryMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!showCategoryMenu || categories.length > 0) {
      return;
    }

    let isMounted = true;

    (async () => {
      setIsLoadingCategories(true);
      try {
        const response = await apiFetch('/categories');
        if (isMounted && response?.success) {
          setCategories((response.data || []).slice(0, 8));
        }
      } catch {
        if (isMounted) {
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [showCategoryMenu, categories.length]);

  return (
    <>
      {showCategoryMenu && <div className="fixed inset-0 z-40 bg-black/10 md:hidden" aria-hidden="true" />}

      <div
        ref={categoryMenuRef}
        className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/80 px-4 backdrop-blur-lg md:hidden"
      >
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 transition-colors ${
            isHomeActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <div className={`rounded-md p-1 ${isHomeActive ? 'bg-primary/10' : ''}`}>
            <Home className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold">Trang chủ</span>
        </Link>

        <div className="relative flex flex-col items-center">
          {showCategoryMenu && (
            <div className="absolute bottom-[calc(100%+12px)] left-1/2 z-[60] w-[min(80vw,240px)] -translate-x-1/2">
              <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                <div className="space-y-0.5">
                  <div className="px-3 py-2 mb-1 border-b border-border/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Danh mục</p>
                  </div>
                  {isLoadingCategories ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-6 text-[11px] font-bold text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Đang tải...
                    </div>
                  ) : categories.length > 0 ? (
                    categories.map((category) => {
                      const Icon = getCategoryIcon(category.icon);

                      return (
                        <Link
                          key={category.id}
                          href={`/category/${category.slug}`}
                          className="flex items-center gap-2.5 rounded-xl px-2.5 py-1 text-[11px] font-bold text-foreground transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="line-clamp-1">{category.name}</span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="px-3 py-6 text-center text-[11px] font-bold text-muted-foreground">
                      Không tìm thấy danh mục.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCategoryMenu((prev) => !prev)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isCategoryActive || showCategoryMenu ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
            aria-expanded={showCategoryMenu}
            aria-haspopup="menu"
            aria-label="Mở danh mục"
          >
            <div className={`rounded-md p-1 ${isCategoryActive || showCategoryMenu ? 'bg-primary/10' : ''}`}>
              <Grid className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold">Danh mục</span>
          </button>
        </div>

        <Link
          href="/chat"
          className={`flex flex-col items-center gap-1 transition-colors ${
            isChatActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <div className={`rounded-md p-1 ${isChatActive ? 'bg-primary/10' : ''}`}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold">Hỗ trợ</span>
        </Link>

        <Link
          href="/notifications"
          className={`flex flex-col items-center gap-1 transition-colors ${
            isNotificationActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <div
            className={`flex items-center justify-center rounded-md p-1 ${
              isNotificationActive ? 'border border-primary/25 bg-primary/10 text-primary' : 'border border-transparent'
            }`}
          >
            <NotificationBell
              className="h-5 w-5"
              iconClassName={isNotificationActive ? 'text-primary' : 'text-muted-foreground'}
              showCount
              link={false}
            />
          </div>

          <span className="text-[10px] font-bold leading-none">Thông báo</span>
        </Link>

        <Link
          href={user ? '/profile' : '/login'}
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === '/profile' || pathname === '/login'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <div
            className={`rounded-md p-1 ${
              pathname === '/profile' || pathname === '/login' ? 'bg-primary/10' : ''
            }`}
          >
            <User className="h-5 w-5" />
          </div>

          <span className="text-[10px] font-bold">{user ? 'Hồ sơ' : 'Tài khoản'}</span>
        </Link>
      </div>
    </>
  );
};

export default MobileNav;
