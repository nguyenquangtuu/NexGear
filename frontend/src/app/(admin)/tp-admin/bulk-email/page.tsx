'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Italic, Link as LinkIcon, Loader2, Mail, Search, Send, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { apiFetch } from '@/lib/api';

type AudienceType = 'ALL_USERS' | 'MANUAL_EMAILS' | 'PRODUCT_BUYERS' | 'VARIANT_BUYERS';

type ProductOption = {
  id: number;
  name: string;
  slug: string;
};

type VariantOption = {
  id: number;
  product_id: number;
  name: string;
  product_name: string;
};

type PreviewRecipient = {
  user_id: number | null;
  email: string;
  full_name: string;
};

type PreviewResponse = {
  total: number;
  recipients: PreviewRecipient[];
};

type SendResponse = {
  total: number;
  deliveredCount: number;
  failedCount: number;
  delivered: { email: string; full_name: string; messageId: string }[];
  failed: { email: string; full_name: string; error: string }[];
};

const audienceOptions: { value: AudienceType; label: string; description: string }[] = [
  {
    value: 'ALL_USERS',
    label: 'Toàn bộ user',
    description: 'Gửi tới tất cả user có email hợp lệ và chưa bị chặn.',
  },
  {
    value: 'MANUAL_EMAILS',
    label: 'Danh sách email',
    description: 'Nhập mỗi email một dòng để gửi theo danh sách riêng.',
  },
  {
    value: 'PRODUCT_BUYERS',
    label: 'Người mua cùng sản phẩm',
    description: 'Lọc theo user đã mua một sản phẩm cụ thể.',
  },
  {
    value: 'VARIANT_BUYERS',
    label: 'Người mua cùng phân loại',
    description: 'Lọc theo user đã mua một phân loại cụ thể.',
  },
];

const DEFAULT_EMAIL_TEMPLATE = `
<p>Xin chào bạn,</p>
<p>Đây là thông báo từ hệ thống Vextro về dịch vụ của bạn.</p>
<p>Trân trọng,<br />Đội ngũ Vextro</p>
`.trim();

export default function AdminBulkEmailPage() {
  const [audienceType, setAudienceType] = useState<AudienceType>('ALL_USERS');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState(DEFAULT_EMAIL_TEMPLATE);
  const [manualEmails, setManualEmails] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [variantQuery, setVariantQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantOption | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchingVariants, setSearchingVariants] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorMode === 'visual') {
      editorRef.current.innerHTML = content;
    }
  }, [editorMode, content]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Nhập đường dẫn URL:');
    if (url) execCommand('createLink', url);
  };

  const manualEmailCount = useMemo(() => {
    const unique = new Set(
      manualEmails
        .split(/\r?\n/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
    );
    return unique.size;
  }, [manualEmails]);

  useEffect(() => {
    if (!['PRODUCT_BUYERS', 'VARIANT_BUYERS'].includes(audienceType)) return;

    const timeout = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await apiFetch<{ success: boolean; data: ProductOption[] }>(
          `/admin/products/search?search=${encodeURIComponent(productQuery)}&limit=12`
        );
        if (res.success) {
          setProductOptions(res.data || []);
        }
      } catch {
        setProductOptions([]);
      } finally {
        setSearchingProducts(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [audienceType, productQuery]);

  useEffect(() => {
    if (audienceType !== 'VARIANT_BUYERS') return;

    const timeout = setTimeout(async () => {
      setSearchingVariants(true);
      try {
        const query = new URLSearchParams({
          search: variantQuery,
          limit: '12',
        });
        if (selectedProduct?.id) {
          query.set('productId', String(selectedProduct.id));
        }
        const res = await apiFetch<{ success: boolean; data: VariantOption[] }>(
          `/admin/variants/search?${query.toString()}`
        );
        if (res.success) {
          setVariantOptions(res.data || []);
        }
      } catch {
        setVariantOptions([]);
      } finally {
        setSearchingVariants(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [audienceType, variantQuery, selectedProduct]);

  useEffect(() => {
    setPreview(null);
    setSendResult(null);
  }, [audienceType, manualEmails, selectedProduct, selectedVariant, subject, content]);

  const audiencePayload = useMemo(
    () => ({
      audienceType,
      manualEmails,
      productId: selectedProduct?.id || null,
      variantId: selectedVariant?.id || null,
    }),
    [audienceType, manualEmails, selectedProduct, selectedVariant]
  );

  const validateAudience = () => {
    if (audienceType === 'MANUAL_EMAILS' && manualEmailCount === 0) {
      toast.error('Vui lòng nhập ít nhất 1 email hợp lệ');
      return false;
    }

    if (audienceType === 'PRODUCT_BUYERS' && !selectedProduct) {
      toast.error('Vui lòng chọn sản phẩm');
      return false;
    }

    if (audienceType === 'VARIANT_BUYERS' && !selectedVariant) {
      toast.error('Vui lòng chọn phân loại');
      return false;
    }

    return true;
  };

  const handlePreview = async () => {
    if (!validateAudience()) return;

    setPreviewing(true);
    setSendResult(null);
    try {
      const res = await apiFetch<{ success: boolean; data: PreviewResponse; message?: string }>(
        '/admin/bulk-email/preview',
        {
          method: 'POST',
          body: JSON.stringify(audiencePayload),
        }
      );
      if (res.success) {
        setPreview(res.data);
        toast.success(`Đã tìm thấy ${res.data.total} người nhận`);
      }
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : 'Không thể xem trước danh sách người nhận');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!validateAudience()) return;
    if (!subject.trim()) {
      toast.error('Vui lòng nhập tiêu đề email');
      return;
    }
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung email');
      return;
    }

    setSending(true);
    try {
      const res = await apiFetch<{ success: boolean; data: SendResponse; message: string }>(
        '/admin/bulk-email/send',
        {
          method: 'POST',
          body: JSON.stringify({
            ...audiencePayload,
            subject,
            content,
          }),
        }
      );

      setSendResult(res.data);
      if (res.success) {
        toast.success(res.message || 'Đã gửi email hàng loạt');
      } else {
        toast.error(res.message || 'Gửi email chỉ thành công một phần');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi email hàng loạt');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Email hàng loạt</h2>
          <p className="text-sm text-muted-foreground">
            Gửi email cho toàn bộ user, danh sách email riêng, người mua cùng sản phẩm hoặc cùng phân loại.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Nhóm người nhận</h3>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {audienceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setAudienceType(option.value);
                    if (option.value !== 'PRODUCT_BUYERS') setSelectedProduct(null);
                    if (option.value !== 'VARIANT_BUYERS') setSelectedVariant(null);
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    audienceType === option.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/30 hover:bg-secondary/20'
                  }`}
                >
                  <div className="text-sm font-bold">{option.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                </button>
              ))}
            </div>

            {audienceType === 'MANUAL_EMAILS' && (
              <div className="mt-5 space-y-2">
                <label className="text-sm font-bold">Danh sách email, mỗi dòng một email</label>
                <textarea
                  className="min-h-40 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={'user1@gmail.com\nuser2@gmail.com'}
                  value={manualEmails}
                  onChange={(event) => setManualEmails(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Đã nhập {manualEmailCount} email duy nhất.</p>
              </div>
            )}

            {audienceType === 'PRODUCT_BUYERS' && (
              <div className="mt-5 space-y-3">
                <label className="text-sm font-bold">Chọn sản phẩm</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Tìm sản phẩm theo tên hoặc slug"
                    value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.slug})` : productQuery}
                    onChange={(event) => {
                      setSelectedProduct(null);
                      setProductQuery(event.target.value);
                    }}
                  />
                </div>
                <div className="rounded-2xl border border-border bg-background">
                  {searchingProducts ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tìm sản phẩm...
                    </div>
                  ) : productOptions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Không có sản phẩm phù hợp.</div>
                  ) : (
                    productOptions.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          setSelectedProduct(product);
                          setProductQuery(product.name);
                        }}
                        className={`block w-full border-b border-border px-4 py-3 text-left text-sm last:border-b-0 ${
                          selectedProduct?.id === product.id ? 'bg-primary/5 text-primary' : 'hover:bg-secondary/30'
                        }`}
                      >
                        <div className="font-semibold">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.slug}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {audienceType === 'VARIANT_BUYERS' && (
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Lọc sản phẩm trước nếu cần</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Tìm sản phẩm"
                      value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.slug})` : productQuery}
                      onChange={(event) => {
                        setSelectedProduct(null);
                        setSelectedVariant(null);
                        setProductQuery(event.target.value);
                      }}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-background">
                    {searchingProducts ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tìm sản phẩm...
                      </div>
                    ) : productOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Không có sản phẩm phù hợp.</div>
                    ) : (
                      productOptions.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedVariant(null);
                            setProductQuery(product.name);
                          }}
                          className={`block w-full border-b border-border px-4 py-3 text-left text-sm last:border-b-0 ${
                            selectedProduct?.id === product.id ? 'bg-primary/5 text-primary' : 'hover:bg-secondary/30'
                          }`}
                        >
                          <div className="font-semibold">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.slug}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold">Chọn phân loại</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="w-full rounded-2xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Tìm phân loại theo tên"
                      value={
                        selectedVariant
                          ? `${selectedVariant.product_name} - ${selectedVariant.name}`
                          : variantQuery
                      }
                      onChange={(event) => {
                        setSelectedVariant(null);
                        setVariantQuery(event.target.value);
                      }}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-background">
                    {searchingVariants ? (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tìm phân loại...
                      </div>
                    ) : variantOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Không có phân loại phù hợp.</div>
                    ) : (
                      variantOptions.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(variant);
                            setVariantQuery(variant.name);
                          }}
                          className={`block w-full border-b border-border px-4 py-3 text-left text-sm last:border-b-0 ${
                            selectedVariant?.id === variant.id ? 'bg-primary/5 text-primary' : 'hover:bg-secondary/30'
                          }`}
                        >
                          <div className="font-semibold">{variant.name}</div>
                          <div className="text-xs text-muted-foreground">{variant.product_name}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Nội dung email</h3>
              </div>
              <div className="flex bg-secondary/50 p-1 rounded-xl gap-1 border border-border">
                <button 
                  type="button"
                  onClick={() => setEditorMode('visual')} 
                  className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${editorMode === 'visual' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  GIAO DIỆN
                </button>
                <button 
                  type="button"
                  onClick={() => setEditorMode('code')} 
                  className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${editorMode === 'code' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  MÃ NGUỒN
                </button>
                <div className="w-[1px] bg-border mx-1" />
                <button type="button" onClick={() => execCommand('bold')} className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground" title="In đậm"><Bold className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => execCommand('italic')} className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground" title="In nghiêng"><Italic className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => insertLink()} className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground" title="Chèn liên kết"><LinkIcon className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Tiêu đề</label>
                <input
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                  placeholder="Ví dụ: Thông báo cập nhật gói dịch vụ"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold">Nội dung</label>
                {editorMode === 'visual' ? (
                  <div 
                    ref={editorRef}
                    contentEditable 
                    suppressContentEditableWarning 
                    className="w-full px-6 py-4 border border-border rounded-2xl bg-background min-h-[400px] outline-none prose prose-sm max-w-none shadow-inner overflow-y-auto"
                    onBlur={(e) => setContent(e.currentTarget.innerHTML)}
                  />
                ) : (
                  <textarea 
                    className="w-full px-6 py-4 border border-border rounded-2xl bg-background min-h-[400px] outline-none font-mono text-sm leading-relaxed shadow-inner resize-none"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Nhập mã nguồn HTML..."
                  />
                )}
                <p className="text-[10px] text-muted-foreground">Mẹo: Bạn có thể dán nội dung HTML trực tiếp vào chế độ Mã nguồn.</p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold">Tác vụ</h3>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing || sending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold transition-all hover:bg-secondary/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Xem trước người nhận
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={sending || previewing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Gửi email hàng loạt
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold">Xem trước</h3>
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl bg-secondary/20 p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Số người nhận</div>
                <div className="mt-1 text-3xl font-black text-primary">{preview?.total || 0}</div>
              </div>

              {preview?.recipients?.length ? (
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background p-3">
                  {preview.recipients.map((recipient, index) => (
                    <div key={`${recipient.email}-${index}`} className="rounded-xl border border-border/70 px-3 py-2">
                      <div className="text-sm font-semibold">{recipient.full_name || 'Không có tên'}</div>
                      <div className="text-xs text-muted-foreground">{recipient.email}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Chưa có dữ liệu preview.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-lg font-bold">Kết quả gửi</h3>
            {sendResult ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-secondary/20 p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Tổng</div>
                    <div className="mt-1 text-2xl font-black">{sendResult.total}</div>
                  </div>
                  <div className="rounded-2xl bg-green-500/10 p-4 text-green-600">
                    <div className="text-xs uppercase tracking-wider">Thành công</div>
                    <div className="mt-1 text-2xl font-black">{sendResult.deliveredCount}</div>
                  </div>
                  <div className="rounded-2xl bg-red-500/10 p-4 text-red-600">
                    <div className="text-xs uppercase tracking-wider">Thất bại</div>
                    <div className="mt-1 text-2xl font-black">{sendResult.failedCount}</div>
                  </div>
                </div>

                {!!sendResult.failed.length && (
                  <div className="space-y-2">
                    <div className="text-sm font-bold">Danh sách lỗi</div>
                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background p-3">
                      {sendResult.failed.map((item, index) => (
                        <div key={`${item.email}-${index}`} className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
                          <div className="text-sm font-semibold">{item.email}</div>
                          <div className="text-xs text-red-600">{item.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Chưa có kết quả gửi trong phiên này.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
