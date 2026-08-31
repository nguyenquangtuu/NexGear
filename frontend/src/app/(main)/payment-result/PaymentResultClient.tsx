"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  Headset,
  ListChecks,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { apiFetch } from "@/lib/api";

type PaymentInfo = {
  bankName?: string;
  bankShortName?: string;
  accountNumber?: string;
  accountHolder?: string;
  transferContent?: string;
  qrUrl?: string;
};

type PaymentResultData = {
  orderId: number;
  orderCode: string;
  status: string;
  paymentStatus: string;
  balanceApplied: number;
  paymentAmount: number;
  paymentInfo?: PaymentInfo | null;
  remainingSeconds?: number;
};

type SyncResponse = {
  success: boolean;
  data?: PaymentResultData;
};

const GUIDE_STEPS = [
  "Mở ứng dụng ngân hàng hoặc ví điện tử",
  "Quét mã QR hoặc chuyển khoản thông tin bên trái",
  "Nhập đúng nội dung chuyển khoản",
  "Chờ hệ thống xác nhận thanh toán",
];

function formatVnd(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getStatusLabel(status: string) {
  const statusMap: Record<string, string> = {
    PENDING_PAYMENT: "Chờ thanh toán",
    PENDING: "Đang chờ xử lý",
    PROCESSING: "Đang xử lý",
    COMPLETED: "Hoàn tất",
    CANCELLED: "Đã hủy",
    FAILED: "Thất bại",
  };
  return statusMap[status] || status || "--";
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "FAILED":
    case "CANCELLED":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "bg-primary/10 text-primary";
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`Đã sao chép ${label.toLowerCase()}`);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-primary/30 hover:text-primary"
      title={`Sao chép ${label}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

function PaymentField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div
          className={`min-w-0 break-all text-sm md:text-[15px] ${accent ? "font-semibold text-primary" : "font-medium text-foreground"}`}
        >
          {value || "--"}
        </div>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

function SupportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Liên hệ hỗ trợ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Đội ngũ hỗ trợ của chúng tôi sẵn sàng giúp bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/30 hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-3 text-sm text-muted-foreground">
          <p>Vui lòng liên hệ qua các kênh bên dưới để được hỗ trợ nhanh nhất:</p>
          <ul className="space-y-2 pl-1">
            <li>• Email: <span className="font-medium text-foreground">support@vextro.vn</span></li>
            <li>• Hotline: <span className="font-medium text-foreground">1900 xxxx</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PaymentResultData | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync countdown with server-returned remainingSeconds (avoids timezone issues)
  useEffect(() => {
    if (result?.remainingSeconds === undefined) return;
    setCountdown(result.remainingSeconds);
  }, [result?.remainingSeconds]);

  // Decrement locally every second
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setInterval(() => setCountdown((p) => (p !== null && p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown === null]);

  const formattedCountdown = useMemo(() => {
    if (countdown === null) return "--:--";
    const m = Math.floor(countdown / 60).toString().padStart(2, "0");
    const s = (countdown % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [countdown]);

  // Derive overlay type
  const overlayState = useMemo<"success" | "expired" | null>(() => {
    const isPaid =
      result?.status === "COMPLETED" ||
      result?.status === "PROCESSING" ||
      result?.status === "SHIPPING" ||
      result?.paymentStatus === "PAID" ||
      result?.paymentStatus === "SUCCESS";

    if (isPaid) return "success";
    if (
      result?.status === "CANCELLED" ||
      result?.status === "FAILED" ||
      (countdown !== null && countdown === 0)
    )
      return "expired";
    return null;
  }, [result?.status, result?.paymentStatus, countdown]);

  // Fade-in then redirect
  useEffect(() => {
    if (!overlayState) return;
    const fadeTimer = setTimeout(() => setOverlayVisible(true), 50);
    const redirectTimer = setTimeout(
      () => router.push("/profile/orders"),
      overlayState === "success" ? 3000 : 4000,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [overlayState, router]);

  const paymentOrderCode = useMemo(() => {
    const orderCode =
      searchParams.get("orderCode") || searchParams.get("order_code");
    return orderCode || "";
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      if (!paymentOrderCode) {
        setError("Không tìm thấy mã đơn thanh toán.");
        setLoading(false);
        return;
      }
      try {
        const response = (await apiFetch("/orders/payment-status/sync", {
          method: "POST",
          body: JSON.stringify({ orderCode: paymentOrderCode }),
        })) as SyncResponse;

        if (!cancelled && response.data) {
          setResult(response.data);
          const status = response.data.status;
          if (status !== "PENDING_PAYMENT" && status !== "PENDING") {
            setLoading(false);
            if (timer) clearInterval(timer);
            timer = null;
            return;
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Payment polling error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();
    timer = setInterval(fetchStatus, 5000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [paymentOrderCode]);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Đang tải thông tin thanh toán...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full border border-red-500/20 bg-red-500/10 p-4 text-red-500">
          <XCircle className="h-10 w-10" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Lỗi xác nhận thanh toán
        </h1>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          {error}
        </p>
      </div>
    );
  }

  const paymentInfo = result?.paymentInfo;
  const bankName =
    paymentInfo?.bankName || paymentInfo?.bankShortName || "Ngân hàng";
  const bankShortName =
    paymentInfo?.bankShortName || paymentInfo?.bankName || "BK";

  return (
    <>
      <div className="relative rounded-3xl border border-border bg-card overflow-hidden">
        {/* ── Result overlay ── */}
        {overlayState && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-3xl px-6 text-center transition-opacity duration-700"
            style={{
              backgroundColor: "var(--card)",
              opacity: overlayVisible ? 1 : 0,
            }}
          >
            {overlayState === "success" ? (
              <>
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
                  style={{ transition: "transform 0.5s ease", transform: overlayVisible ? "scale(1)" : "scale(0.6)" }}
                >
                  <Check className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Thanh toán thành công!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cảm ơn bạn đã đặt hàng. Đơn hàng đang được xử lý.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10"
                  style={{ transition: "transform 0.5s ease", transform: overlayVisible ? "scale(1)" : "scale(0.6)" }}
                >
                  <X className="h-12 w-12 text-red-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Đơn hàng đã hết hạn</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Đơn hàng đã hết thời gian thanh toán và được tự động hủy.
                  </p>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang chuyển hướng đến lịch sử đơn hàng...
            </div>
          </div>
        )}
        {/* ── Header ── */}
        <div className="border-b border-border px-5 py-5 md:px-7">
          <div className="flex items-start gap-3">
            <Link
              href="/profile/orders"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                Thanh toán đơn hàng
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span>
                  Mã đơn hàng:{" "}
                  <span className="font-semibold text-primary">
                    {result?.orderCode || "--"}
                  </span>
                </span>
                <span>
                  Trạng thái:{" "}
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusBadgeClass(result?.status || "")}`}
                  >
                    {getStatusLabel(result?.status || "")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid items-start gap-5 px-5 py-5 md:px-7 md:py-6 lg:grid-cols-[minmax(0,1.45fr)_320px]">
          {/* Left — bank transfer */}
          <section className="rounded-2xl border border-border bg-background p-5">
            {/* Section header */}
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                1. Chuyển khoản ngân hàng
              </h2>
            </div>

            {/* Two-column: info | QR */}
            <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_200px]">
              {/* Bank info */}
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {bankShortName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Ngân hàng
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {bankName}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card px-4">
                  <PaymentField
                    label="Số tài khoản"
                    value={paymentInfo?.accountNumber || ""}
                  />
                  <PaymentField
                    label="Chủ tài khoản"
                    value={paymentInfo?.accountHolder || ""}
                  />
                  <PaymentField
                    label="Nội dung chuyển khoản"
                    value={paymentInfo?.transferContent || ""}
                    accent
                  />
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Vui lòng nhập đúng nội dung chuyển khoản để chúng tôi xác
                    nhận thanh toán nhanh chóng.
                  </p>
                </div>
              </div>

              {/* QR code */}
              <div className="flex flex-col items-center">
                <div className="mb-3 text-center text-sm font-medium text-foreground">
                  Quét mã QR để thanh toán
                </div>
                <div className="w-full max-w-[180px]">
                  {paymentInfo?.qrUrl ? (
                    <div className="relative overflow-hidden rounded-2xl">
                      <div className="qr-scan-line" />
                      <img
                        src={paymentInfo.qrUrl}
                        alt="QR thanh toán"
                        className="aspect-square w-full rounded-2xl object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border text-center text-sm text-muted-foreground">
                      Chưa có mã QR
                    </div>
                  )}
                </div>
                {paymentInfo?.qrUrl && (
                  <a
                    href={paymentInfo.qrUrl}
                    download="qr-thanhtoan.png"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải mã QR
                  </a>
                )}
                <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
                  Mở ứng dụng ngân hàng hoặc ví điện tử để quét mã và thanh
                  toán.
                </p>
              </div>
            </div>

            {/* Footer timer */}
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-4 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Thời gian chờ thanh toán:
              </span>
              <span className="font-semibold text-primary">
                {formattedCountdown}
              </span>
              <span className="text-muted-foreground">
                | Đơn hàng sẽ tự động hủy nếu quá thời gian trên.
              </span>
            </div>
          </section>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* 2. Payment summary */}
            <section className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  2. Thông tin thanh toán
                </h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Trạng thái đơn</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusBadgeClass(result?.status || "")}`}
                  >
                    {getStatusLabel(result?.status || "")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Đã khấu trừ</span>
                  <span className="font-medium text-foreground">
                    {formatVnd(result?.balanceApplied || 0)}
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-foreground">
                    Cần thanh toán
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    {formatVnd(result?.paymentAmount || 0)}
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Guide steps */}
            <section className="rounded-2xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ListChecks className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  3. Hướng dẫn
                </h2>
              </div>

              <div className="space-y-3">
                {GUIDE_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Support card */}
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <div className="mb-1.5 flex items-center gap-2">
                <Headset className="h-4 w-4 text-primary" />
                <div className="text-sm font-semibold text-foreground">
                  Bạn cần hỗ trợ?
                </div>
              </div>
              <p className="mb-4 text-xs leading-5 text-muted-foreground">
                Nếu có bất kỳ vấn đề nào, vui lòng liên hệ với chúng tôi.
              </p>
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Liên hệ hỗ trợ
              </button>
            </section>
          </div>
        </div>
      </div>

      <SupportModal
        open={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </>
  );
}

export default function PaymentResultClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
