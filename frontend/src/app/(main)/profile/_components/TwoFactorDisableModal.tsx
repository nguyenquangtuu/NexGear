'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import ClientPortal from '@/components/ClientPortal';

interface TwoFactorDisableModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export const TwoFactorDisableModal = ({ onClose, onRefresh }: TwoFactorDisableModalProps) => {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (res.success) {
        alert('Đã tắt bảo mật 2 lớp');
        onRefresh();
        onClose();
      } else {
        setError(res.message || 'Mã xác thực không đúng');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientPortal>
      <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-black text-foreground">Vô hiệu hóa 2FA</h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleDisable} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">{error}</div>}

            <p className="text-sm text-muted-foreground font-medium text-center">
              Vui lòng nhập mã từ ứng dụng xác thực để vô hiệu hóa bảo mật 2 lớp cho tài khoản này.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground px-1 block text-center uppercase tracking-wider">Mã xác thực 6 số</label>
              <input
                type="text"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-secondary/50 border border-border/60 px-4 py-4 rounded-2xl text-2xl font-black text-center tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 hover:opacity-90 hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận vô hiệu hóa'}
            </button>
          </form>
        </div>
      </div>
    </ClientPortal>
  );
};
