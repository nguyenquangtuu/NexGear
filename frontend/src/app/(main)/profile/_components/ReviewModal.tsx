'use client';

import React, { useState } from 'react';
import { X, XCircle, Star } from 'lucide-react';
import ClientPortal from '@/components/ClientPortal';

interface ReviewModalProps {
  order: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const ReviewModal = ({ order, onClose, onRefresh }: ReviewModalProps) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch(`/orders/${order.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });

      if (res.success) {
        onRefresh();
        onClose();
        return;
      }

      setError(res.message);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ClientPortal>
      <div className="fixed inset-0 z-[11000] p-4">
        <button
          aria-label="Đóng đánh giá"
          onClick={onClose}
          className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-sm"
        />

        <div className="relative mx-auto flex min-h-full w-full items-center justify-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h3 className="text-xl font-black">Đánh giá sản phẩm</h3>
              <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-4rem)] space-y-6 overflow-y-auto p-6">
              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-500">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-bold text-muted-foreground">Bạn thấy sản phẩm này thế nào?</p>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform active:scale-90"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors ${
                          star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm font-black text-primary">
                  {rating === 1
                    ? 'Rất tệ'
                    : rating === 2
                      ? 'Không tốt'
                      : rating === 3
                        ? 'Bình thường'
                        : rating === 4
                          ? 'Hài lòng'
                          : 'Tuyệt vời'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Ý kiến của bạn (Tùy chọn)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                  className="min-h-[120px] w-full resize-none rounded-2xl border border-border/50 bg-secondary/30 p-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full rounded-2xl bg-primary py-4 font-black text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ClientPortal>
  );
};
