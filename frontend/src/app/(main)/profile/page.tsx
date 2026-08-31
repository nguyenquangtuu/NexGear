'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Camera,
  Settings,
  ArrowLeft,
  ShoppingBag,
  TimerReset,
  CalendarDays
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch, getErrorMessage } from '@/lib/api';
import { ChangePasswordModal } from './_components/ChangePasswordModal';
import { TwoFactorSetupModal } from './_components/TwoFactorSetupModal';
import { TwoFactorDisableModal } from './_components/TwoFactorDisableModal';
import { MobileProfileMenu } from './_components/ProfileSidebar';
import { ZaloBotNotificationCard } from './_components/ZaloBotNotificationCard';

function ProfileContent() {
  const { user, refreshUser, setUser } = useAuth();
  const searchParams = useSearchParams();
  const isSettingsTab = searchParams?.get('tab') === 'settings';

  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [is2FADisableModalOpen, setIs2FADisableModalOpen] = useState(false);
  const [profileHighlights, setProfileHighlights] = useState({
    processingOrders: 0,
    activeServices: 0,
  });

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      fetchSocialAccounts();
      fetchProfileHighlights();
    }
  }, [user]);

  const fetchSocialAccounts = async () => {
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/auth/social-accounts');
      if (res.success) {
        setSocialAccounts(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch social accounts', error);
    }
  };

  const fetchProfileHighlights = async () => {
    try {
      const [ordersRes, servicesRes] = await Promise.all([
        apiFetch('/orders/my'),
        apiFetch('/orders/services/my'),
      ]);

      const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
      const services = Array.isArray(servicesRes?.data) ? servicesRes.data : [];

      setProfileHighlights({
        processingOrders: orders.filter((order: any) => order?.status === 'PROCESSING').length,
        activeServices: services.filter((service: any) => service?.status !== 'EXPIRED').length,
      });
    } catch (error) {
      console.error('Failed to fetch profile highlights', error);
    }
  };

  const handleLinkSocial = (provider: string) => {
    if (socialAccounts.length > 0) {
      alert('Bạn chỉ có thể liên kết với một mạng xã hội duy nhất. Vui lòng hủy liên kết tài khoản hiện tại trước.');
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  const handleUnlinkSocial = async (provider: string) => {
    if (!confirm(`Bạn có chắc muốn hủy liên kết với ${provider}?`)) return;

    setSocialLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/auth/unlink-social', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      });
      if (res.success) {
        await fetchSocialAccounts();
      } else {
        alert(res.message || 'Hủy liên kết thất bại');
      }
    } catch (error: any) {
      alert(error.message || 'Hủy liên kết thất bại');
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    const nextFullName = fullName.trim();

    if (!nextFullName) {
      alert('Vui lòng nhập họ và tên.');
      return;
    }

    if (nextFullName.length < 2 || nextFullName.length > 120) {
      alert('Họ tên phải từ 2-120 ký tự.');
      return;
    }

    if (nextFullName === user.fullName) {
      return;
    }

    setProfileSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName: nextFullName }),
      });

      if (res.success) {
        setUser((prev) => (prev ? { ...prev, fullName: res.data?.fullName || nextFullName } : prev));
        await refreshUser();
        alert(res.message || 'Cập nhật thông tin thành công');
      }
    } catch (error) {
      alert(getErrorMessage(error, 'Không thể cập nhật thông tin'));
    } finally {
      setProfileSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Mobile Menu View */}
      <div className={`md:hidden ${isSettingsTab ? 'hidden' : 'block'}`}>
        {/* If we are on /profile on mobile, we show the menu. 
            If we want to show the actual profile edit on mobile, we need a way to toggle it.
            Original code used `showMobileMenu` state. 
            I'll show the MobileProfileMenu here, and provide a way to go to the edit page if needed.
            Wait, the user wants separate pages. 
            On mobile, /profile can be the menu, and /profile/settings can be the edit page?
            Or /profile is the edit page and we have a separate menu?
            Let's stick to: /profile shows the menu on mobile (original behavior). 
            But the user said "tách tab profile ra nhiều trang".
        */}
        <MobileProfileMenu />
      </div>

      {/* Desktop Content / Mobile Content when specific route is hit */}
      <div className={`${isSettingsTab ? 'block' : 'hidden md:block'}`}>
        <div className="space-y-6 animate-fade-in">
          {isSettingsTab && (
            <div className="md:hidden flex items-center gap-3 px-0 pt-4 pb-2">
              <Link href="/profile" className="p-2 border border-border rounded-xl bg-card shadow-sm text-foreground active:scale-95 transition-transform">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h2 className="text-lg font-black">Thông tin cá nhân</h2>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Link href="/profile/orders?orderTab=processing" className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/20">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Đơn xử lý</span>
              </div>
              <p className="mt-4 text-lg font-black text-foreground">{profileHighlights.processingOrders}</p>
              <p className="mt-1 text-xs text-muted-foreground">Đơn đang chờ hoàn tất</p>
            </Link>

            <Link href="/profile/services" className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/20">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600">
                  <TimerReset className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Dịch vụ</span>
              </div>
              <p className="mt-4 text-lg font-black text-foreground">{profileHighlights.activeServices}</p>
              <p className="mt-1 text-xs text-muted-foreground">Gói còn hiệu lực</p>
            </Link>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-violet-500/10 p-2 text-violet-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tham gia</span>
              </div>
              <p className="mt-4 text-lg font-black text-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '--/--/----'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Mốc tạo tài khoản</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm mx-0">
            <h3 className="text-lg font-black mb-5 hidden md:block">Thông tin cá nhân</h3>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-black border-4 border-background shadow-lg">
                    {user.fullName.charAt(0)}
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Hiện chỉ hỗ trợ cập nhật tên"
                    className="absolute bottom-0 right-0 p-1.5 bg-muted text-muted-foreground rounded-full shadow-md cursor-not-allowed"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-grow space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground px-1 block">Họ và tên</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full bg-secondary/50 border border-border/60 dark:border-transparent px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground px-1 block">Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        defaultValue={user.email}
                        disabled
                        className="w-full bg-secondary/30 border border-border/60 dark:border-transparent px-4 py-2.5 rounded-xl text-sm text-muted-foreground cursor-not-allowed"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={profileSaving || fullName.trim() === user.fullName}
                    className="px-6 py-2.5 bg-primary text-white font-black rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-black">Bảo mật & Liên kết</h3>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-[10px] font-black uppercase text-green-500">Tài khoản an toàn</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Password Section */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-secondary/10">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Mật khẩu</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Thay đổi mật khẩu định kỳ để bảo vệ tài khoản.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white text-[10px] font-black rounded-lg hover:opacity-90 transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  Đổi mật khẩu
                </button>
              </div>

              {/* 2FA Section */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-secondary/10">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Xác thực 2 yếu tố (2FA)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Bảo mật tài khoản bằng ứng dụng Google Authenticator.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (user.is_2fa_enabled) {
                      setIs2FADisableModalOpen(true);
                    } else {
                      setIs2FASetupModalOpen(true);
                    }
                  }}
                  className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all border shrink-0 shadow-sm cursor-pointer ${user.is_2fa_enabled
                    ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
                    : 'bg-secondary text-foreground border-border/60 hover:bg-muted'
                    }`}
                >
                  {user.is_2fa_enabled ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
              </div>

              {/* Social Accounts Section */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Liên kết mạng xã hội</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Facebook */}
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border border-border/60 ${socialAccounts.find(a => a.provider === 'facebook') ? 'bg-blue-600/5 border-blue-600/20' : 'bg-secondary/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${socialAccounts.find(a => a.provider === 'facebook') ? 'bg-blue-600 text-white' : 'bg-blue-600/10 text-blue-600'}`}>
                        <svg className="h-4.5 w-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold">Facebook</p>
                        <p className={`text-[10px] ${socialAccounts.find(a => a.provider === 'facebook') ? 'text-blue-600 font-bold' : 'text-muted-foreground'}`}>
                          {socialAccounts.find(a => a.provider === 'facebook') ? 'Đã liên kết' : 'Chưa liên kết'}
                        </p>
                      </div>
                    </div>
                    {socialAccounts.find(a => a.provider === 'facebook') ? (
                      <button
                        disabled={socialLoading}
                        onClick={() => handleUnlinkSocial('facebook')}
                        className="text-[10px] font-black text-red-500 hover:underline disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    ) : (
                      <button
                        disabled={socialAccounts.length > 0}
                        onClick={() => handleLinkSocial('facebook')}
                        className={`text-[10px] font-black hover:underline ${socialAccounts.length > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}
                      >
                        Liên kết
                      </button>
                    )}
                  </div>

                  {/* Google */}
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border border-border/60 ${socialAccounts.find(a => a.provider === 'google') ? 'bg-primary/5 border-primary/20' : 'bg-secondary/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${socialAccounts.find(a => a.provider === 'google') ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold">Google</p>
                        <p className={`text-[10px] ${socialAccounts.find(a => a.provider === 'google') ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {socialAccounts.find(a => a.provider === 'google') ? 'Đã liên kết' : 'Chưa liên kết'}
                        </p>
                      </div>
                    </div>
                    {socialAccounts.find(a => a.provider === 'google') ? (
                      <button
                        disabled={socialLoading}
                        onClick={() => handleUnlinkSocial('google')}
                        className="text-[10px] font-black text-red-500 hover:underline disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    ) : (
                      <button
                        disabled={socialAccounts.length > 0}
                        onClick={() => handleLinkSocial('google')}
                        className={`text-[10px] font-black hover:underline ${socialAccounts.length > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}
                      >
                        Liên kết
                      </button>
                    )}
                  </div>

                  {/* Zalo */}
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border border-border/60 ${socialAccounts.find(a => a.provider === 'zalo') ? 'bg-[#0068FF]/5 border-[#0068FF]/20' : 'bg-secondary/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${socialAccounts.find(a => a.provider === 'zalo') ? 'bg-[#0068FF] text-white' : 'bg-[#0068FF]/10 text-[#0068FF]'}`}>
                        <div className={`h-5 w-5 ${socialAccounts.find(a => a.provider === 'zalo') ? 'bg-white text-[#0068FF]' : 'bg-[#0068FF] text-white'} rounded-sm flex items-center justify-center font-bold text-[8px]`}>Zalo</div>
                      </div>
                      <div>
                        <p className="text-xs font-bold">Zalo</p>
                        <p className={`text-[10px] ${socialAccounts.find(a => a.provider === 'zalo') ? 'text-[#0068FF] font-bold' : 'text-muted-foreground'}`}>
                          {socialAccounts.find(a => a.provider === 'zalo') ? 'Đã liên kết' : 'Chưa liên kết'}
                        </p>
                      </div>
                    </div>
                    {socialAccounts.find(a => a.provider === 'zalo') ? (
                      <button
                        disabled={socialLoading}
                        onClick={() => handleUnlinkSocial('zalo')}
                        className="text-[10px] font-black text-red-500 hover:underline disabled:opacity-50"
                      >
                        Hủy
                      </button>
                    ) : (
                      <button
                        disabled={socialAccounts.length > 0}
                        onClick={() => handleLinkSocial('zalo')}
                        className={`text-[10px] font-black hover:underline ${socialAccounts.length > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}
                      >
                        Liên kết
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kênh nhận thông báo</h4>
                <ZaloBotNotificationCard userId={user.id} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        refreshUser={refreshUser}
      />
      {is2FASetupModalOpen && (
        <TwoFactorSetupModal
          onClose={() => setIs2FASetupModalOpen(false)}
          onRefresh={refreshUser}
        />
      )}
      {is2FADisableModalOpen && (
        <TwoFactorDisableModal
          onClose={() => setIs2FADisableModalOpen(false)}
          onRefresh={refreshUser}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin h-8 w-8 mx-auto border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <ProfileContent />
    </Suspense>
  );
}
