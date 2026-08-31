'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ClientPortal from '@/components/ClientPortal';

interface TwoFactorSetupModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export const TwoFactorSetupModal = ({ onClose, onRefresh }: TwoFactorSetupModalProps) => {
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSetupData();
  }, []);

  const fetchSetupData = async () => {
    setLoading(true);
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/auth/2fa/setup', { method: 'POST' });
      if (res.success) {
        setSetupData(res.data);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Không thể lấy thông tin thiết lập 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (res.success) {
        alert('Kích hoạt bảo mật 2 lớp thành công!');
        onRefresh();
        onClose();
      } else {
        setError(res.message || 'Mã xác thực không đúng');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi xác thực');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientPortal>
      <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-black text-foreground">Thiết lập 2FA</h3>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl">{error}</div>}

            {loading && !setupData ? (
              <div className="py-10 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-muted-foreground font-bold italic">Đang tải cấu hình...</p>
              </div>
            ) : setupData ? (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground font-medium">
                    Quét mã QR bằng ứng dụng <span className="text-foreground font-black">Google Authenticator</span> hoặc <span className="text-foreground font-black">Authy</span>.
                  </p>

                  <div className="bg-white p-3 rounded-2xl inline-block shadow-lg border-4 border-primary/20">
                    <img src={setupData.qrImageUrl} alt="2FA QR Code" className="w-48 h-48 block" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mã bí mật (Secret Key)</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="px-4 py-2 bg-secondary rounded-xl font-mono text-sm font-bold text-primary select-all">
                        {setupData.secret}
                      </code>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleVerify} className="space-y-4 pt-2 border-t border-border/50">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground px-1 block text-center uppercase tracking-wider">Nhập mã xác thực 6 số</label>
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
                    className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Đang xác thực...' : 'Kích hoạt ngay'}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ClientPortal>
  );
};
