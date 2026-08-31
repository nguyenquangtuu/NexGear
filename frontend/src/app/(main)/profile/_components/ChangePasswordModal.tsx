'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import ClientPortal from '@/components/ClientPortal';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshUser: () => void;
}

export const ChangePasswordModal = ({ isOpen, onClose, refreshUser }: ChangePasswordModalProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.success) {
        alert('Đổi mật khẩu thành công');
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        refreshUser();
      } else {
        setError(res.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientPortal>
      <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-black">Đổi mật khẩu</h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">{error}</div>}

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground px-1 block">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-secondary/50 border border-border/60 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground px-1 block">Mật khẩu mới</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-secondary/50 border border-border/60 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground px-1 block">Xác nhận mật khẩu</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-secondary/50 border border-border/60 px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ClientPortal>
  );
};
