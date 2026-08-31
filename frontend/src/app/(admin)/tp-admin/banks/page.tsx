'use client';

import { useEffect, useMemo, useState } from 'react';
import { Landmark, Plus, RefreshCcw, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { resolveMediaUrl } from '@/lib/media';

import { apiFetch, getErrorMessage } from '@/lib/api';

type Bank = {
  id?: number;
  bank_name: string;
  short_name: string;
  account_number: string;
  account_holder: string;
  qr_template: string;
  min_deposit: number;
  is_active: number | boolean;
};

type VietQrBank = {
  id: number;
  name: string;
  code: string;
  shortName: string;
  logo: string;
};

const DEFAULT_QR_TEMPLATE = 'https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT_NUMBER}-print.png?amount=0&addInfo={CONTENT}&accountName={HOLDER}';

const EMPTY_BANK: Bank = {
  bank_name: '',
  short_name: '',
  account_number: '',
  account_holder: '',
  qr_template: '',
  min_deposit: 20000,
  is_active: true,
};

function buildQrTemplate(bankCode: string, accountNumber: string) {
  if (!bankCode || !accountNumber) return '';
  return DEFAULT_QR_TEMPLATE.replace('{BANK_CODE}', bankCode).replace('{ACCOUNT_NUMBER}', accountNumber);
}

function buildQrPreviewUrl(form: Bank) {
  if (!form.qr_template || !form.account_holder) return '';
  return form.qr_template
    .replace('{CONTENT}', encodeURIComponent('VEXTRODEMO'))
    .replace('{HOLDER}', encodeURIComponent(form.account_holder));
}

function formatVnd(value: number) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

export default function AdminBanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedId, setSelectedId] = useState<number | 'new'>('new');
  const [form, setForm] = useState<Bank>(EMPTY_BANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [vietQrBanks, setVietQrBanks] = useState<VietQrBank[]>([]);
  const [vietQrLoading, setVietQrLoading] = useState(false);
  const [vietQrQuery, setVietQrQuery] = useState('');
  const [selectedVietQrCode, setSelectedVietQrCode] = useState('');

  const loadBanks = async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ data: Bank[] }>('/admin/banks');
      const rows = Array.isArray(response.data) ? response.data : [];
      setBanks(rows);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không tải được danh sách ngân hàng'));
    } finally {
      setLoading(false);
    }
  };

  const loadVietQrBanks = async () => {
    setVietQrLoading(true);
    try {
      const response = await fetch('https://api.vietqr.io/v2/banks');
      const payload = await response.json();
      const list = Array.isArray(payload?.data) ? payload.data : [];
      setVietQrBanks(list);
    } catch {
      toast.error('Không tải được danh sách ngân hàng từ VietQR');
      setVietQrBanks([]);
    } finally {
      setVietQrLoading(false);
    }
  };

  useEffect(() => {
    loadBanks();
    loadVietQrBanks();
  }, []);

  const selectedBank = useMemo(
    () => (selectedId === 'new' ? null : banks.find((bank) => bank.id === selectedId) || null),
    [banks, selectedId]
  );

  const selectedVietQrBank = useMemo(
    () => vietQrBanks.find((bank) => bank.code === selectedVietQrCode) || null,
    [selectedVietQrCode, vietQrBanks]
  );

  const filteredVietQrBanks = useMemo(() => {
    const keyword = vietQrQuery.trim().toLowerCase();
    if (!keyword) return vietQrBanks;
    return vietQrBanks.filter((bank) => {
      return [bank.name, bank.shortName, bank.code].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [vietQrBanks, vietQrQuery]);

  useEffect(() => {
    if (!selectedBank) {
      setForm(EMPTY_BANK);
      setSelectedVietQrCode('');
      return;
    }

    const normalizedMinDeposit = Number(selectedBank.min_deposit || 0);
    const nextForm = {
      ...selectedBank,
      min_deposit: normalizedMinDeposit > 0 ? normalizedMinDeposit : 20000,
      is_active: Boolean(selectedBank.is_active),
    };

    setForm(nextForm);

    const matchedVietQrBank =
      vietQrBanks.find((bank) => bank.code === selectedBank.short_name) ||
      vietQrBanks.find((bank) => bank.shortName === selectedBank.short_name) ||
      vietQrBanks.find((bank) => bank.name === selectedBank.bank_name);

    setSelectedVietQrCode(matchedVietQrBank?.code || '');
  }, [selectedBank, vietQrBanks]);

  useEffect(() => {
    if (!selectedVietQrBank) return;

    setForm((prev) => ({
      ...prev,
      bank_name: selectedVietQrBank.name,
      short_name: selectedVietQrBank.code,
      qr_template: prev.account_number ? buildQrTemplate(selectedVietQrBank.code, prev.account_number) : prev.qr_template,
    }));
  }, [selectedVietQrBank]);

  useEffect(() => {
    if (!selectedVietQrCode || !form.account_number.trim()) return;

    setForm((prev) => ({
      ...prev,
      qr_template: buildQrTemplate(selectedVietQrCode, prev.account_number.trim()),
    }));
  }, [selectedVietQrCode, form.account_number]);

  const qrPreviewUrl = useMemo(() => buildQrPreviewUrl(form), [form]);

  const saveBank = async () => {
    if (!form.bank_name.trim() || !form.short_name.trim() || !form.account_number.trim() || !form.account_holder.trim()) {
      toast.error('Vui lòng điền đủ ngân hàng, số tài khoản và chủ tài khoản');
      return;
    }

    const payload = {
      ...form,
      bank_name: form.bank_name.trim(),
      short_name: form.short_name.trim(),
      account_number: form.account_number.trim(),
      account_holder: form.account_holder.trim(),
      qr_template: form.qr_template.trim(),
      min_deposit: Number(form.min_deposit || 0),
      is_active: Boolean(form.is_active),
    };

    setSaving(true);
    try {
      if (selectedBank?.id) {
        const response = await apiFetch<{ data: Bank }>(`/admin/banks/${selectedBank.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setBanks((prev) => prev.map((bank) => (bank.id === selectedBank.id ? response.data : bank)));
        toast.success('Đã cập nhật ngân hàng');
      } else {
        const response = await apiFetch<{ data: Bank }>('/admin/banks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setBanks((prev) => [response.data, ...prev]);
        setSelectedId(response.data.id || 'new');
        toast.success('Đã tạo ngân hàng mới');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không lưu được ngân hàng'));
    } finally {
      setSaving(false);
    }
  };

  const deleteBank = async () => {
    if (!selectedBank?.id) return;

    setDeleting(true);
    try {
      await apiFetch(`/admin/banks/${selectedBank.id}`, { method: 'DELETE' });
      setBanks((prev) => prev.filter((bank) => bank.id !== selectedBank.id));
      setSelectedId('new');
      toast.success('Đã xóa ngân hàng');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Không xóa được ngân hàng'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cấu hình ngân hàng</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý tài khoản ngân hàng, QR template, số tài khoản, chủ tài khoản và mức nạp tối thiểu.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSelectedId('new')}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Plus size={16} />
            Tạo mới
          </button>
          <button
            type="button"
            onClick={loadBanks}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <RefreshCcw size={16} />
            Tải lại
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="font-bold">Danh sách ngân hàng</h3>
              <p className="text-xs text-muted-foreground">Trang nạp tiền sẽ dùng dữ liệu trong danh sách này.</p>
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                Đang tải dữ liệu...
              </div>
            ) : banks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
                Chưa có ngân hàng nào. Tạo mới để bắt đầu.
              </div>
            ) : (
              banks.map((bank) => {
                const isSelected = selectedId === bank.id;

                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedId(bank.id || 'new')}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border bg-background hover:border-primary/30 hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{bank.short_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{bank.bank_name}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                          bank.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {bank.is_active ? 'Hiện' : 'Ẩn'}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-foreground/80">{bank.account_number}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6 rounded-3xl border border-border bg-card p-6">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold">Chọn ngân hàng từ VietQR</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tìm ngân hàng</span>
                <input
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none"
                  value={vietQrQuery}
                  onChange={(e) => setVietQrQuery(e.target.value)}
                  placeholder="Ví dụ: MBBank, VCB, ACB..."
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ngân hàng VietQR</span>
                <select
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 outline-none"
                  value={selectedVietQrCode}
                  onChange={(e) => setSelectedVietQrCode(e.target.value)}
                  disabled={vietQrLoading}
                >
                  <option value="">{vietQrLoading ? 'Đang tải danh sách ngân hàng...' : 'Chọn ngân hàng'}</option>
                  {filteredVietQrBanks.map((bank) => (
                    <option key={bank.id} value={bank.code}>
                      {bank.shortName} - {bank.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Khi chọn ngân hàng và nhập số tài khoản, hệ thống sẽ tự tạo QR template chuẩn VietQR cho bạn.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tên ngân hàng</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.bank_name}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mã ngân hàng</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.short_name}
                onChange={(e) => setForm((prev) => ({ ...prev, short_name: e.target.value.toUpperCase() }))}
                placeholder="Ví dụ: MBBANK, VCB, ACB"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Số tài khoản</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value.replace(/\s+/g, '') }))}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chủ tài khoản</span>
              <input
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                value={form.account_holder}
                onChange={(e) => setForm((prev) => ({ ...prev, account_holder: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_320px]">
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">QR template tự động</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                  value={form.qr_template}
                  onChange={(e) => setForm((prev) => ({ ...prev, qr_template: e.target.value }))}
                  placeholder="Chọn ngân hàng và nhập số tài khoản để tự sinh QR template"
                />
              </label>

              <div className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                Dùng <code>{'{CONTENT}'}</code> cho nội dung chuyển khoản và <code>{'{HOLDER}'}</code> cho tên chủ tài khoản.
                QR template đang tự sinh theo chuẩn VietQR nên bạn không cần nhập thủ công nữa.
              </div>
            </div>

            <div className="space-y-4">
              <label className="space-y-2 block">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nạp tối thiểu</span>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none"
                  value={form.min_deposit}
                  onChange={(e) => setForm((prev) => ({ ...prev, min_deposit: Number(e.target.value || 0) }))}
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(form.is_active)}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                <span className="text-sm font-medium text-foreground">Hiển thị trên trang nạp tiền</span>
              </label>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Xem trước QR</p>
                {qrPreviewUrl ? (
                  <div className="mt-3 flex flex-col items-center gap-3">
                    <img
                      src={qrPreviewUrl}
                      alt={`QR ${form.short_name || 'bank'}`}
                      className="w-full max-w-[220px] rounded-2xl border border-border bg-white"
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      QR mẫu đang dùng nội dung demo để kiểm tra template. Mức nạp tối thiểu hiện tại: {formatVnd(form.min_deposit)}.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Chọn ngân hàng VietQR, nhập số tài khoản và chủ tài khoản để xem QR tự sinh.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="button"
              onClick={saveBank}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
              {selectedBank?.id ? 'Lưu cập nhật ngân hàng' : 'Tạo ngân hàng mới'}
            </button>

            {selectedBank?.id ? (
              <button
                type="button"
                onClick={deleteBank}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/5 px-5 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-60"
              >
                {deleting ? <RefreshCcw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Xóa ngân hàng
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
