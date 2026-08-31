'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    google?: any;
    FB?: any;
    Zalo?: any;
    ZaloSocialSDK?: any;
  }
}

const authShellClass = 'max-w-[440px] w-full space-y-6 animate-fade-in';
const authCardClass = 'rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-7';
const fieldLabelClass = 'block px-1 text-sm font-medium text-foreground';
const fieldInputClass = 'block w-full rounded-2xl border border-border/60 bg-secondary/40 px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all';
const primaryButtonClass = 'w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:scale-100 cursor-pointer';
const socialButtonClass = 'flex h-11 items-center justify-center rounded-2xl border border-border/60 bg-secondary/30 transition-all hover:bg-secondary/50 cursor-pointer';

const LoginContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const redirectToPendingVerification = (pendingEmail: string) => {
    const query = new URLSearchParams({
      mode: 'verify-pending',
      email: pendingEmail,
    });
    router.push(`/register?${query.toString()}`);
  };

  React.useEffect(() => {
    const isSocialPopup = searchParams.get('social_popup') === '1';
    const isSuccess = searchParams.get('success') === '1';
    const provider = searchParams.get('provider') || 'social';

    if (isSocialPopup && isSuccess) {
      try {
        const channel = new BroadcastChannel('vextro-social-auth');
        channel.postMessage({ type: 'SOCIAL_AUTH_SUCCESS', provider });
        channel.close();
      } catch {}

      if (window.opener) {
        window.opener.postMessage({ type: 'SOCIAL_AUTH_SUCCESS', provider }, window.location.origin);
        try {
          window.close();
        } catch {}
        return;
      }
      try {
        window.close();
      } catch {}

      refreshUser()
        .then(async () => {
          try {
            const me = await apiFetch('/auth/me');
            if (me?.data?.needsEmail) {
              router.push('/register?mode=complete-email');
              return;
            }
          } catch {}
          router.push('/');
        })
        .catch(() => router.push('/'));
      return;
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('vextro-social-auth');
      channel.onmessage = async (event) => {
        if (event.data?.type === 'SOCIAL_AUTH_SUCCESS') {
          setLoading(true);
          await refreshUser();
          try {
            const me = await apiFetch('/auth/me');
            if (me?.data?.needsEmail) {
              router.push('/register?mode=complete-email');
              return;
            }
          } catch {}
          router.push('/');
        }
      };
    } catch {}

    const handleMessage = async (event: MessageEvent) => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const backendOrigin = (() => {
        try {
          return new URL(apiUrl).origin;
        } catch {
          return null;
        }
      })();

      if (event.origin !== window.location.origin && event.origin !== backendOrigin) return;
      if (event.data?.type === 'SOCIAL_AUTH_SUCCESS') {
        setLoading(true);
        await refreshUser();
        try {
          const me = await apiFetch('/auth/me');
          if (me?.data?.needsEmail) {
            router.push('/register?mode=complete-email');
            return;
          }
        } catch {}
        router.push('/');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      try {
        channel?.close();
      } catch {}
    };
  }, [refreshUser, router, searchParams]);

  const handleTokenLogin = async (provider: string, accessToken: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/auth/token-login', {
        method: 'POST',
        body: JSON.stringify({ provider, accessToken }),
      });

      if (data.success) {
        await refreshUser();
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || `Đăng nhập ${provider} thất bại`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCallback = (response: any) => {
    if (response.credential) {
      handleTokenLogin('google', response.credential);
    }
  };

  const handleGoogleLogin = () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (window.google?.accounts?.oauth2 && googleClientId) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'email profile openid',
        callback: (response: any) => {
          if (response.access_token) {
            handleTokenLogin('google', response.access_token);
          } else if (response.credential) {
            handleTokenLogin('google', response.credential);
          }
        },
      });
      client.requestAccessToken();
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const openAuthPopup = (provider: string) => {
    const w = 500;
    const h = 600;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/${provider}`;
    window.open(url, `${provider} Login`, `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
  };

  const handleFBLogin = () => {
    openAuthPopup('facebook');
  };

  const handleZaloLogin = () => {
    openAuthPopup('zalo');
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/2fa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ code: twoFactorCode }),
      });

      if (data.success) {
        await refreshUser();
        router.push('/');
      } else {
        setError(data.message || 'Mã xác thực không đúng');
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực 2FA thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        if (data.require2FA) {
          setShow2FA(true);
        } else {
          await refreshUser();
          router.push('/');
        }
      } else {
        setError(data.message || 'Đăng nhập thất bại');
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        redirectToPendingVerification(err?.data?.data?.email || email);
        return;
      }
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className={authShellClass}>
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => {
            const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            if (!googleClientId) return;
            if (!window.google?.accounts?.id) return;

            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: handleGoogleCallback,
            });
          }}
        />

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trang chủ
        </Link>

        <div className="text-center">
          <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Chào mừng trở lại</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>

        <div className={authCardClass}>
          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
              {error}
            </div>
          )}

          {!show2FA ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-3.5">
                <label className={fieldLabelClass} htmlFor="email">
                  Email của bạn
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldInputClass}
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="mb-1 flex items-center justify-between px-1">
                  <label className={fieldLabelClass} htmlFor="password">
                    Mật khẩu
                  </label>
                  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={fieldInputClass}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className={`${primaryButtonClass} mt-2`}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handle2FAVerify}>
              <div className="text-center space-y-2">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Xác thực 2 lớp</h3>
                <p className="text-sm text-muted-foreground">
                  Nhập mã xác thực từ ứng dụng <span className="font-medium text-foreground">Authenticator</span> của bạn.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3.5 text-center text-xl font-semibold tracking-[0.35em] text-foreground focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                  placeholder="000000"
                />
              </div>

              <button type="submit" disabled={loading || twoFactorCode.length !== 6} className={primaryButtonClass}>
                {loading ? 'Đang xác thực...' : 'Xác nhận đăng nhập'}
              </button>

              <button
                type="button"
                onClick={() => setShow2FA(false)}
                className="w-full py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Quay lại đăng nhập
              </button>
            </form>
          )}

          {!show2FA && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase font-medium">
                  <span className="bg-card px-4 tracking-[0.18em] text-muted-foreground">Hoặc đăng nhập bằng</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <button onClick={handleGoogleLogin} type="button" className={`${socialButtonClass} group`}>
                  <svg className="h-5 w-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.273 0 3.191 2.69 1.145 6.655l4.121 3.11z" />
                    <path fill="#34A853" d="M16.04 18.013c-1.09.593-2.325.915-3.64.915-2.818 0-5.218-1.81-6.242-4.353l-4.12 3.108C4.166 21.813 7.824 24 12 24c3.11 0 5.924-1.033 8.113-2.783l-4.073-3.204z" />
                    <path fill="#4285F4" d="M23.49 12.275c0-.825-.075-1.612-.213-2.373H12v4.5h6.438c-.275 1.462-1.1 2.7-2.34 3.53l4.073 3.204c2.39-2.2 3.765-5.443 3.765-8.86z" />
                    <path fill="#FBBC05" d="M5.266 14.245l-4.121 3.108A11.914 11.914 0 0 1 0 12c0-1.411.259-2.758.732-4.01l4.121 3.11c-.14.43-.218.887-.218 1.365 0 .635.13 1.24.364 1.78z" />
                  </svg>
                </button>
                <button onClick={handleFBLogin} type="button" className={`${socialButtonClass} px-4 group text-blue-600`}>
                  <svg className="h-6 w-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button onClick={handleZaloLogin} type="button" className={`${socialButtonClass} px-4 group`}>
                  <div className="h-6 w-6 bg-[#0068FF] rounded-md flex items-center justify-center text-white font-bold text-[10px] group-hover:scale-110 transition-transform">Zalo</div>
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Việc đăng nhập đồng nghĩa với việc bạn đồng ý với{' '}
          <Link href="/terms-of-service" className="text-foreground hover:underline">Điều khoản dịch vụ</Link>
          {' '}và{' '}
          <Link href="/privacy-policy" className="text-foreground hover:underline">Chính sách bảo mật</Link>
          {' '}của VEXTRO.
        </p>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
