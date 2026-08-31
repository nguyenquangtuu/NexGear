'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import TurnstileField from '@/components/auth/TurnstileField';
import { getPasswordStrength } from '@/lib/password-strength';

const authShellClass = 'max-w-[440px] w-full space-y-5 animate-fade-in';
const authCardClass = 'rounded-3xl border border-border bg-card p-5 shadow-lg sm:p-6';
const fieldLabelClass = 'block px-1 text-sm font-medium text-foreground';
const fieldInputClass = 'block w-full rounded-2xl border border-border/60 bg-secondary/40 px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all';
const otpInputClass = 'block w-full rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3.5 text-center text-xl font-semibold tracking-[0.35em] text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all';
const primaryButtonClass = 'w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:scale-100';
const secondaryButtonClass = 'w-full rounded-2xl border border-border/60 bg-background py-3 text-sm font-medium text-foreground transition hover:bg-secondary/30 disabled:opacity-50';

const RegisterContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'info' | 'warning'>('info');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [step, setStep] = useState<'registerProfile' | 'registerSecurity' | 'verify' | 'completeEmail' | 'completeEmailVerify'>('registerProfile');
  const [otpCode, setOtpCode] = useState('');
  const passwordStrength = getPasswordStrength(password);

  const isCompleteEmailMode = searchParams.get('mode') === 'complete-email' || !!user?.needsEmail;
  const isVerifyPendingMode = searchParams.get('mode') === 'verify-pending';

  useEffect(() => {
    if (!isCompleteEmailMode) return;
    setStep('completeEmail');
    setFullName(user?.fullName || '');
  }, [isCompleteEmailMode, user?.fullName]);

  useEffect(() => {
    if (!isVerifyPendingMode) return;
    const pendingEmail = searchParams.get('email') || '';
    setEmail(pendingEmail);
    setStep('verify');
    setError('');
    setNotice('Tài khoản này chưa xác thực. Vui lòng nhập OTP để kích hoạt tài khoản trước khi tiếp tục.');
    setNoticeTone('warning');
  }, [isVerifyPendingMode, searchParams]);

  const validateProfileStep = () => {
    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return false;
    }

    if (!email.trim()) {
      setError('Vui lòng nhập email.');
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError('Email chưa đúng định dạng.');
      return false;
    }

    return true;
  };

  const validateRegisterForm = () => {
    if (!validateProfileStep()) {
      return false;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return false;
    }

    if (!passwordStrength.isStrong) {
      setError('Mật khẩu chưa đạt mức phù hợp. Chỉ cần thanh đánh giá chuyển xanh là có thể tiếp tục.');
      return false;
    }

    if (!acceptedTerms) {
      setError('Vui lòng đồng ý với điều khoản sử dụng trước khi đăng ký.');
      return false;
    }

    if (!turnstileToken) {
      setError('Vui lòng hoàn tất xác minh captcha trước khi đăng ký.');
      return false;
    }

    return true;
  };

  const submitRegistration = async () => {
    setError('');
    setNotice('');

    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, fullName, password, turnstileToken }),
      });

      if (data.success) {
        if (data.message) {
          setNotice(data.message);
          setNoticeTone(data.data?.otpEmailSent === false ? 'warning' : 'info');
        }
        setStep('verify');
        setTurnstileToken('');
        setTurnstileResetSignal((value) => value + 1);
      }
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        const pendingEmail = err?.data?.data?.email || email;
        setEmail(pendingEmail);
        setStep('verify');
        setNotice(err.message || 'Tài khoản này chưa xác thực. Vui lòng nhập OTP để kích hoạt tài khoản.');
        setNoticeTone('warning');
        setTurnstileToken('');
        setTurnstileResetSignal((value) => value + 1);
        return;
      }
      setError(err.message || 'Đăng ký thất bại');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!validateRegisterForm()) return;

    await submitRegistration();
  };

  const handleContinueToSecurity = () => {
    setError('');
    setNotice('');
    if (!validateProfileStep()) return;
    setStep('registerSecurity');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otpCode }),
      });

      if (data.success) {
        await refreshUser();
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setNotice(data.message || 'Đã gửi lại mã OTP vào email của bạn.');
      setNoticeTone('info');
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCompleteEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/complete-email/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (data.success) {
        setStep('completeEmailVerify');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể gửi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompleteEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/complete-email/verify', {
        method: 'POST',
        body: JSON.stringify({ email, otpCode }),
      });
      if (data.success) {
        await refreshUser();
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCompleteEmailOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/complete-email/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      alert('Đã gửi lại mã OTP vào email của bạn.');
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'completeEmail' || step === 'completeEmailVerify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className={authShellClass}>
          <Link
            href="/login"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>

          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Xác thực email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tài khoản Zalo không trả về email. Vui lòng nhập email để xác thực và sử dụng đầy đủ tính năng.
            </p>
          </div>

          <div className={authCardClass}>
            {notice ? (
              <div
                className={`mb-4 rounded-2xl border p-3 text-center text-sm ${
                  noticeTone === 'warning'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-700'
                    : 'border-primary/20 bg-primary/10 text-primary'
                }`}
              >
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
                {error}
              </div>
            ) : null}

            {step === 'completeEmail' ? (
              <form className="space-y-4" onSubmit={handleRequestCompleteEmailOtp}>
                <div className="space-y-3.5">
                  <label className={fieldLabelClass} htmlFor="email">
                    Email của bạn
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-primary">
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

                <button type="submit" disabled={loading} className={`${primaryButtonClass} mt-2`}>
                  {loading ? 'Đang gửi OTP...' : 'Gửi OTP'}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleVerifyCompleteEmailOtp}>
                <div className="space-y-3.5 text-center">
                  <label className={fieldLabelClass} htmlFor="otpCode">
                    Nhập mã OTP
                  </label>
                  <p className="text-xs font-medium text-muted-foreground">
                    Chúng tôi đã gửi mã OTP đến <strong>{email}</strong>
                  </p>
                  <input
                    id="otpCode"
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className={otpInputClass}
                    placeholder="000000"
                  />
                </div>

                <button type="submit" disabled={loading} className={`${primaryButtonClass} mt-2`}>
                  {loading ? 'Đang xác thực...' : 'Xác thực'}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendCompleteEmailOtp}
                  className="w-full text-sm font-medium text-primary hover:underline disabled:opacity-50"
                >
                  Gửi lại OTP
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
        <div className={authShellClass}>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Xác thực email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Chúng tôi đã gửi mã OTP gồm 6 chữ số đến <strong>{email}</strong>
            </p>
          </div>

          <div className={authCardClass}>
            {notice ? (
              <div
                className={`mb-4 rounded-2xl border p-3 text-center text-sm ${
                  noticeTone === 'warning'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-700'
                    : 'border-primary/20 bg-primary/10 text-primary'
                }`}
              >
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
                {error}
              </div>
            ) : null}
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <div className="space-y-3.5 text-center">
                <label className={fieldLabelClass} htmlFor="otpCode">
                  Nhập mã OTP
                </label>
                <input
                  id="otpCode"
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={otpInputClass}
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className={`${primaryButtonClass} mt-2`}
              >
                {loading ? 'Đang xác thực...' : 'Xác thực tài khoản'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm font-medium text-primary hover:underline"
              >
                Chưa nhận được mã? Gửi lại OTP
              </button>
            </div>

            <button
              onClick={() => setStep('registerSecurity')}
              className="mt-4 w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Quay lại bước tạo mật khẩu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className={authShellClass}>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại trang chủ
        </Link>

        <div className="text-center">
          <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Tạo tài khoản mới</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>

        <div className={authCardClass}>
          {notice ? (
            <div
              className={`mb-4 rounded-2xl border p-3 text-center text-sm ${
                noticeTone === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-700'
                  : 'border-primary/20 bg-primary/10 text-primary'
              }`}
            >
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
              {error}
            </div>
          ) : null}

          <div className="mb-5 rounded-2xl bg-secondary/20 p-1">
            <div className="grid grid-cols-2 gap-1 text-xs font-semibold">
              <div className={`rounded-xl px-3 py-2 text-center transition ${step === 'registerProfile' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                1. Thông tin
              </div>
              <div className={`rounded-xl px-3 py-2 text-center transition ${step === 'registerSecurity' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                2. Bảo mật
              </div>
            </div>
          </div>

          {step === 'registerProfile' ? (
            <div className="animate-fade-in">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Bắt đầu với thông tin cơ bản</h3>
                <p className="mt-1 text-sm text-muted-foreground">Vui lòng cung cấp họ tên và email để tiếp tục quá trình đăng ký.</p>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-3.5">
                  <label className={fieldLabelClass} htmlFor="fullName">
                    Họ và tên
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={fieldInputClass}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                <div className="space-y-3.5">
                  <label className={fieldLabelClass} htmlFor="email">
                    Email của bạn
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-primary">
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

                <button type="button" onClick={handleContinueToSecurity} className={primaryButtonClass}>
                  Tiếp tục
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-3.5 animate-fade-in" onSubmit={handleSubmit}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">Tạo mật khẩu và hoàn tất</h3>
                <p className="mt-1 text-sm text-muted-foreground">Bước cuối cùng để tạo tài khoản và nhận mã xác thực.</p>
              </div>

              <div className="space-y-3.5">
                <label className={fieldLabelClass} htmlFor="password">
                  Mật khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-primary">
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
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">Mật khẩu: {passwordStrength.label}</span>
                  <span className="text-[11px] text-muted-foreground">{passwordStrength.hint}</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 rounded-full ${index < passwordStrength.score ? passwordStrength.tone : 'bg-border/80'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3.5">
                <label className={fieldLabelClass} htmlFor="confirmPassword">
                  Xác nhận mật khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={fieldInputClass}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <span className="leading-6">
                  Tôi đồng ý với{' '}
                  <Link href="/terms-of-service" className="font-medium text-primary hover:underline">
                    điều khoản sử dụng
                  </Link>
                  {' '}và{' '}
                  <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
                    chính sách bảo mật
                  </Link>
                  .
                </span>
              </label>

              <div className="flex justify-center pt-1">
                <TurnstileField
                  action="register"
                  value={turnstileToken}
                  onChange={setTurnstileToken}
                  resetSignal={turnstileResetSignal}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('registerProfile')}
                  className={`${secondaryButtonClass} flex-1`}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  className={`${primaryButtonClass} mt-0 flex-1`}
                >
                  {loading ? 'Đang xử lý...' : 'Đăng ký'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RegisterContent />
    </Suspense>
  );
}
