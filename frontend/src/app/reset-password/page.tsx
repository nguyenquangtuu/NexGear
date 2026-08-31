'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import TurnstileField from '@/components/auth/TurnstileField';
import { getPasswordStrength } from '@/lib/password-strength';

const authShellClass = 'max-w-[440px] w-full space-y-6 animate-fade-in';
const authCardClass = 'rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-7';
const fieldLabelClass = 'block px-1 text-sm font-medium text-foreground';
const fieldInputClass = 'block w-full rounded-2xl border border-border/60 bg-secondary/40 px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all';
const primaryButtonClass = 'w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:scale-100';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!passwordStrength.isStrong) {
      setError('Mật khẩu chưa đủ mạnh. Vui lòng dùng ít nhất 10 ký tự gồm chữ hoa, chữ thường, số, ký tự đặc biệt và không có khoảng trắng.');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword, turnstileToken }),
      });
      setSuccess(data.message || 'Đặt lại mật khẩu thành công.');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
      setTimeout(() => router.push('/login'), 1200);
    } catch (err: any) {
      setError(err.message || 'Không thể đặt lại mật khẩu.');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Đặt lại mật khẩu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chọn một mật khẩu mạnh hơn để bảo vệ tài khoản.
          </p>
        </div>

        <div className={authCardClass}>
          {error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">{error}</div> : null}
          {success ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-600">{success}</div> : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3.5">
              <label className={fieldLabelClass} htmlFor="newPassword">
                Mật khẩu mới
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground transition-colors pointer-events-none group-focus-within:text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div className="space-y-1.5">
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
                Xác nhận mật khẩu mới
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

            <TurnstileField
              action="password-reset-confirm"
              value={turnstileToken}
              onChange={setTurnstileToken}
              resetSignal={turnstileResetSignal}
            />

            <button
              type="submit"
              disabled={loading || !token || !passwordStrength.isStrong || !turnstileToken}
              className={primaryButtonClass}
            >
              {loading ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
