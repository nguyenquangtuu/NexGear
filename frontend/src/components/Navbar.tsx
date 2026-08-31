'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter, usePathname } from 'next/navigation';
import { Search, User, HelpCircle, Bell, Sun, Moon, Laptop, MessageSquare, LogOut, ShoppingBag, ShoppingCart, Heart, XCircle, Sparkles, Loader2, Shield, Languages, ChevronDown, Check, PlusCircle, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { useNotificationRealtime } from '@/lib/useNotificationRealtime';
import { resolveMediaUrl } from '@/lib/media';

type SearchProduct = {
  id: string | number;
  slug: string;
  name: string;
  tagline?: string;
  badge?: string;
  thumbnail?: string;
  variants?: Array<{ price?: number }>;
};

type ProductSearchResponse = {
  success: boolean;
  data: SearchProduct[];
};

type Language = 'vi' | 'en';
type GTranslateWindow = Window & {
  doGTranslate?: (langPair: string) => void;
};

function resolveImageUrl(url?: string | null) {
  return resolveMediaUrl(url);
}

const GTRANSLATE_COOKIE_NAME = 'googtrans';

function setGTranslateCookies(lang: Language) {
  const cookieValue = `/vi/${lang}`;
  // Xóa cookie cũ để tránh xung đột domain
  document.cookie = `${GTRANSLATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${GTRANSLATE_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
  
  // Set cookie mới
  document.cookie = `${GTRANSLATE_COOKIE_NAME}=${cookieValue};path=/`;
  if (window.location.hostname !== 'localhost') {
    document.cookie = `${GTRANSLATE_COOKIE_NAME}=${cookieValue};domain=.${window.location.hostname};path=/`;
  }
}

function triggerGTranslate(lang: Language) {
  const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (!combo) {
    return false;
  }

  // Set the value directly to target language
  combo.value = lang;
  // Create and dispatch a native change event
  const event = document.createEvent('HTMLEvents');
  event.initEvent('change', true, true);
  combo.dispatchEvent(event);
  return true;
}

const Navbar = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [language, setLanguage] = useState<Language>('vi');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const { unreadCount: notificationCount } = useNotificationRealtime(user?.id ?? null);

  const router = useRouter();
  const pathname = usePathname();
  const logoSrc = mounted
    ? resolvedTheme === 'dark'
      ? '/images/brand/logo-dark.png'
      : '/images/brand/logo-light.png'
    : '/images/brand/logo-dark.png';
  const isDarkTheme = mounted ? resolvedTheme === 'dark' : true;
  const isProfilePage = pathname.startsWith('/profile');

  // Search logic with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setShowResults(true);
      try {
        const res = (await apiFetch(`/products?q=${encodeURIComponent(searchQuery)}&limit=6`)) as ProductSearchResponse;
        if (res.success) {
          setSearchResults(res.data);
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowResults(false);
    }
  };

  const handleSelectResult = (slug: string) => {
    router.push(`/products/${slug}`);
    setShowResults(false);
    setSearchQuery('');
  };

  // Avoid hydration mismatch and add scroll listener
  useEffect(() => {
    let languageSyncInterval: number | null = null;

    const savedLanguage = localStorage.getItem('gtranslate-language');
    if (savedLanguage === 'vi' || savedLanguage === 'en') {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      setGTranslateCookies(savedLanguage);

      if (savedLanguage !== 'vi') {
        let attempts = 0;
        languageSyncInterval = window.setInterval(() => {
          attempts += 1;
          if (triggerGTranslate(savedLanguage) || attempts >= 20) {
            if (languageSyncInterval != null) {
              window.clearInterval(languageSyncInterval);
              languageSyncInterval = null;
            }
          }
        }, 300);
      }
    }

    setMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      if (languageSyncInterval != null) {
        window.clearInterval(languageSyncInterval);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const applyGTranslateLanguage = (lang: Language) => {
    if (lang === language) {
        setShowLanguageMenu(false);
        return;
    }
    
    setLanguage(lang);
    setShowLanguageMenu(false);
    localStorage.setItem('gtranslate-language', lang);
    document.documentElement.lang = lang;
    setGTranslateCookies(lang);

    // Try to translate instantly without reload
    const success = triggerGTranslate(lang);
    
    // Always reload to guarantee 100% translation application and clear React Virtual DOM glitches
    // This is necessary because Next.js sometimes overwrites translated text when Hydrating or routing
    setTimeout(() => {
      window.location.reload();
    }, success ? 200 : 50);
  };

  return (
    <>
      <Script id="gtranslate-config" strategy="afterInteractive">
        {`window.gtranslateSettings = {"default_language":"vi","languages":["vi","en"],"wrapper_selector":".gtranslate_wrapper"}`}
      </Script>
      <Script src="https://cdn.gtranslate.net/widgets/latest/dropdown.js" strategy="afterInteractive" />
      <div className="gtranslate_wrapper absolute -left-[9999px] top-auto h-px w-px overflow-hidden" />

      {/* Top Header - Scrolls away naturally */}
      <div className="hidden border-b border-border/50 bg-background py-1.5 md:block">
        <div className="max-w-6xl mx-auto flex justify-between px-4 text-xs font-medium text-muted-foreground overflow-visible">
          <div
            className="relative"
            ref={languageMenuRef}
            onMouseEnter={() => setShowLanguageMenu(true)}
            onMouseLeave={() => setShowLanguageMenu(false)}
          >
            <button
              type="button"
              className={`flex items-center gap-1.5 transition-colors ${showLanguageMenu ? 'text-primary' : 'hover:text-primary'}`}
            >
              <Languages className="h-3.5 w-3.5" />
              <span>Ngôn ngữ</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLanguageMenu && (
              <div className="absolute left-0 top-full z-[80] min-w-[132px] w-max pt-2">
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                  <button
                    type="button"
                    onClick={() => applyGTranslateLanguage('vi')}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Tiếng Việt</span>
                    {language === 'vi' ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyGTranslateLanguage('en')}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>English</span>
                    {language === 'en' ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-6 items-center">
            <Link
              href="/notifications"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
              aria-label="Thông báo"
            >
              <span className="relative inline-flex items-center justify-center">
                <Bell className="h-3.5 w-3.5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full border border-background bg-primary px-1 text-[9px] font-black leading-none text-white shadow-sm">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </span>
              <span>Thông báo</span>
            </Link>

            <Link
              href="/help-center"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Hỗ trợ
            </Link>
            {/* Theme Toggle */}
            {mounted && (
              <div className="flex items-center gap-2 border-l border-border pl-6 ml-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1 rounded-md transition-all ${theme === 'light' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                  title="Light"
                >
                  <Sun className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1 rounded-md transition-all ${theme === 'dark' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                  title="Dark"
                >
                  <Moon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`p-1 rounded-md transition-all ${theme === 'system' ? 'bg-primary text-white' : 'hover:bg-muted'}`}
                  title={theme === 'system' ? `System (${resolvedTheme})` : 'System'}
                >
                  <Laptop className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Header - Sticky */}
      <header className={`sticky top-0 z-50 w-full border-b border-border transition-all duration-300 ${isProfilePage ? 'hidden md:block' : ''
        } ${isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-sm py-3'
          : 'bg-background py-4'
        }`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-3 md:gap-12">
            <Link href="/" className="hidden shrink-0 items-center gap-2 md:flex">
              <Image
                src={logoSrc}
                alt="NEXGEAR"
                width={240}
                height={72}
                className="h-8 w-auto max-w-[170px] origin-left scale-[1.18] object-contain md:h-10 md:max-w-[250px]"
                priority
              />
            </Link>

            <div className={`mx-auto max-w-lg flex-1 relative md:max-w-xl ${isProfilePage ? 'hidden md:block' : ''}`}>
              <form onSubmit={handleSearchSubmit} className="relative group">
                <div
                  className={`relative overflow-hidden rounded-xl md:rounded-2xl border transition-all duration-300 ${
                    isDarkTheme
                      ? 'border-white/10 bg-secondary/55 shadow-lg shadow-black/20 ring-1 ring-white/5 group-hover:border-primary/25 group-focus-within:border-primary/40 group-focus-within:bg-secondary/75 group-focus-within:shadow-primary/10'
                      : 'border-border/80 bg-background/92 shadow-lg shadow-slate-200/70 ring-1 ring-slate-200/70 group-hover:border-primary/25 group-focus-within:border-primary/45 group-focus-within:bg-background group-focus-within:shadow-primary/10'
                  }`}
                >
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Search className={`h-5 w-5 ${isSearching ? 'animate-pulse' : ''}`} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setIsFocused(true);
                    if (searchQuery.length >= 2) setShowResults(true);
                  }}
                  onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                  className="w-full rounded-xl md:rounded-2xl border-0 bg-transparent px-11 py-2.5 pr-28 text-sm text-foreground placeholder:text-muted-foreground placeholder-ellipsis focus:outline-none focus:ring-4 focus:ring-primary/10 md:px-12 md:pr-[8.75rem]"
                  placeholder="Tìm sản phẩm..."
                />
                <div className="absolute inset-y-0 right-1.5 flex items-center md:right-2 gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className={`p-1 transition-colors ${isDarkTheme ? 'text-slate-400 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`px-3.5 py-1.5 text-xs font-semibold transition-all md:px-4 rounded-lg md:rounded-xl ${
                      isDarkTheme
                        ? 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-blue-500'
                        : 'bg-primary text-white shadow-md shadow-primary/20 hover:-translate-y-px hover:shadow-lg hover:shadow-primary/25'
                    }`}
                  >
                    Tìm kiếm
                  </button>
                </div>
                </div>
              </form>

              {/* Search Results Dropdown */}
              {showResults && isFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {isSearching && searchQuery.length >= 2 && searchResults.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-medium">Đang tìm kiếm...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        <div className="px-3 py-2 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          <Sparkles className="h-3 w-3 text-primary" />
                          Kết quả tìm kiếm
                        </div>
                        {searchResults.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => handleSelectResult(product.slug)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition-all group/res text-left"
                          >
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                              <img
                                src={resolveImageUrl(product.thumbnail)}
                                alt={product.name}
                                className="h-full w-full object-cover group-hover/res:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/file.svg';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover/res:text-primary transition-colors">{product.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.tagline}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-black text-primary">
                                  {product.variants?.[0]?.price ? product.variants[0].price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ'}
                                </span>
                                {product.badge && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-bold uppercase">{product.badge}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-xs text-muted-foreground font-medium">Không tìm thấy sản phẩm nào khớp với &quot;{searchQuery}&quot;</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSearchSubmit}
                    className="w-full py-3 bg-secondary/50 border-t border-border text-xs font-bold text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <Search className="h-3 w-3" />
                    Xem tất cả kết quả
                  </button>
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 md:gap-4 shrink-0">
              <Link href="/chat" className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors group" title="Hỗ trợ trực tuyến">
                <MessageSquare className="h-6 w-6 md:h-6 md:w-6 group-hover:scale-110 transition-transform" />
              </Link>

              <Link href="/profile/orders" className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors group" title="Đơn hàng của tôi">
                <ShoppingCart className="h-6 w-6 md:h-6 md:w-6 group-hover:scale-110 transition-transform" />
              </Link>

              {/* Mobile Settings Button */}
              <div className="md:hidden relative">
                <button
                  onClick={() => setShowMobileSettings(!showMobileSettings)}
                  className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors group"
                  title="Cài đặt"
                >
                  <Settings className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                </button>
                {showMobileSettings && (
                  <div className="fixed top-16 right-4 w-48 bg-card border border-border rounded-xl shadow-2xl z-[100] p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/50 mb-2">Giao diện</div>
                    <div className="flex gap-2 mb-3 px-2">
                       <button onClick={() => setTheme('light')} className={`flex-1 p-2 rounded-lg flex justify-center items-center ${theme === 'light' ? 'bg-primary text-white' : 'hover:bg-muted'}`}><Sun className="h-4 w-4" /></button>
                       <button onClick={() => setTheme('dark')} className={`flex-1 p-2 rounded-lg flex justify-center items-center ${theme === 'dark' ? 'bg-primary text-white' : 'hover:bg-muted'}`}><Moon className="h-4 w-4" /></button>
                       <button onClick={() => setTheme('system')} className={`flex-1 p-2 rounded-lg flex justify-center items-center ${theme === 'system' ? 'bg-primary text-white' : 'hover:bg-muted'}`}><Laptop className="h-4 w-4" /></button>
                    </div>
                    <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/50 mb-2">Ngôn ngữ</div>
                    <div className="space-y-1">
                      <button onClick={() => { applyGTranslateLanguage('vi'); setShowMobileSettings(false); }} className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors ${language === 'vi' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                        Tiếng Việt
                        {language === 'vi' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => { applyGTranslateLanguage('en'); setShowMobileSettings(false); }} className={`flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors ${language === 'en' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                        English
                        {language === 'en' && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="pt-2 mt-2 border-t border-border">
                        <Link onClick={() => setShowMobileSettings(false)} href="/chat" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold hover:bg-muted transition-colors">
                            <MessageSquare className="h-4 w-4" /> Hỗ trợ trực tuyến
                        </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center ml-2 relative">
                {loading ? (
                  <div className="h-9 w-24 bg-muted animate-pulse rounded-xl"></div>
                ) : user ? (
                  <div
                    className="relative group/user-menu"
                    onMouseEnter={() => setShowUserMenu(true)}
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${showUserMenu ? 'bg-primary/15 text-primary shadow-sm' : 'hover:bg-primary/5 text-foreground'
                        }`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner ring-2 ring-primary/5 group-hover/user-menu:ring-primary/20 transition-all">
                        {user.fullName.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold max-w-[100px] truncate">{user.fullName}</span>
                    </button>

                    {showUserMenu && (
                      <div className="absolute top-full right-0 w-64 pt-2 z-50">
                        <div className="absolute -top-4 left-0 right-0 h-6 cursor-default" />
                        <div className="bg-card border border-border rounded-2xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden ring-1 ring-black/5">
                          <div className="px-4 py-3 border-b border-border/40">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/10 shadow-sm">
                                {user.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-foreground truncate leading-none">{user.fullName}</p>
                                <p className="text-[11px] text-muted-foreground truncate leading-none mt-1">{user.email}</p>
                              </div>
                            </div>
                          </div>

                          <div className="px-1.5 py-1.5 space-y-0.5">
                            {user.role === 'ADMIN' && (
                              <Link
                                href="/tp-admin"
                                className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-bold text-indigo-500 hover:bg-indigo-500/10 transition-all duration-200 group/item"
                              >
                                <div className="p-1.5 rounded-md bg-indigo-500/5 group-hover/item:bg-indigo-500/10 transition-colors">
                                  <Shield className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                                </div>
                                Quản trị hệ thống
                              </Link>
                            )}
                            <Link
                              href="/profile"
                              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 group/item"
                            >
                              <div className="p-1.5 rounded-md bg-secondary group-hover/item:bg-primary/10 transition-colors">
                                <User className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                              </div>
                              Hồ sơ cá nhân
                            </Link>

                            <Link
                              href="/profile/orders"
                              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 group/item"
                            >
                              <div className="p-1.5 rounded-md bg-secondary group-hover/item:bg-primary/10 transition-colors">
                                <ShoppingCart className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                              </div>
                              Đơn hàng của tôi
                            </Link>

                            <Link
                              href="/chat"
                              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 group/item"
                            >
                              <div className="p-1.5 rounded-md bg-secondary group-hover/item:bg-primary/10 transition-colors">
                                <MessageSquare className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                              </div>
                              Hỗ trợ trực tuyến (AI)
                            </Link>

                            <Link
                              href="/profile/wishlist"
                              className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 group/item"
                            >
                              <div className="p-1.5 rounded-md bg-secondary group-hover/item:bg-primary/10 transition-colors">
                                <Heart className="h-3.5 w-3.5 group-hover/item:scale-110 transition-transform" />
                              </div>
                              Sản phẩm yêu thích
                            </Link>

                            <div className="pt-1 mt-1 border-t border-border/50">
                              <button
                                onClick={() => logout()}
                                className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all duration-200 group/logout"
                              >
                                <div className="p-1.5 rounded-md bg-red-500/5 group-hover/logout:bg-red-500/10 transition-colors">
                                  <LogOut className="h-3.5 w-3.5 group-hover/logout:scale-110 transition-transform" />
                                </div>
                                Đăng xuất
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="px-6 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                  >
                    Đăng nhập
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
