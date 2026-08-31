'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import TurnstileField from '@/components/auth/TurnstileField';

const authShellClass = 'max-w-[440px] w-full space-y-6 animate-fade-in';
const authCardClass = 'rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-7';
const fieldLabelClass = 'block px-1 text-sm font-medium text-foreground';
const fieldInputClass = 'block w-full rounded-2xl border border-border/60 bg-secondary/40 px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all';
const primaryButtonClass = 'w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:scale-100';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, turnstileToken }),
      });
      setSuccess(data.message || 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
      setTurnstileToken('');
      setTurnstileResetSignal((value) => value + 1);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
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
          <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">Quên mật khẩu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Nhập email để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        <div className={authCardClass}>
          {error ? <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">{error}</div> : null}
          {success ? <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-600">{success}</div> : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
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

            <TurnstileField
              action="password-reset-request"
              value={turnstileToken}
              onChange={setTurnstileToken}
              resetSignal={turnstileResetSignal}
            />

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className={primaryButtonClass}
            >
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
