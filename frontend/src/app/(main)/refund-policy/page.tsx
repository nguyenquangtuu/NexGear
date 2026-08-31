import React from "react";
import { RefreshCcw, CheckCircle2, XCircle, Info } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Chính sách hoàn tiền",
    description: "Chúng tôi hỗ trợ hoàn tiền trong một số trường hợp nhất định để đảm bảo quyền lợi của khách hàng tại VEXTRO.",
    path: "/refund-policy",
    keywords: ["hoàn tiền VEXTRO", "refund policy", "bảo hành sản phẩm số"],
  });
}

export default function RefundPolicyPage() {
  const allowRefund = [
    "Sản phẩm bị lỗi kỹ thuật không thể sử dụng.",
    "Sản phẩm không đúng với mô tả trên website.",
    "Giao dịch bị tính phí nhầm lẫn do lỗi hệ thống.",
    "Thời gian xử lý đơn hàng vượt quá 24 giờ mà không có thông báo trước.",
  ];

  const denyRefund = [
    "Sản phẩm số như file hoặc tài khoản đã được truy cập hoặc tải xuống.",
    "Người dùng thay đổi ý định sau khi đã nhận đúng sản phẩm như mô tả.",
    "Lỗi phát sinh do người dùng không tuân thủ hướng dẫn sử dụng.",
    "Sản phẩm đã quá thời hạn bảo hành được công bố.",
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-20">
      <div className="mb-8 pt-6 text-center md:mb-10 md:pt-8">
        <div className="container mx-auto px-4">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-600">
            <RefreshCcw className="h-4 w-4" />
            <span>Quyền lợi khách hàng</span>
          </div>
          <h1 className="mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl lg:text-6xl">
            Chính sách hoàn tiền
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Chúng tôi hỗ trợ hoàn tiền trong một số trường hợp nhất định để đảm bảo quyền lợi của khách hàng.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-card/30 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110">
              <CheckCircle2 className="h-24 w-24 text-emerald-500" />
            </div>
            <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-foreground md:text-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              Trường hợp được hoàn tiền
            </h2>
            <ul className="space-y-3">
              {allowRefund.map((item, i) => (
                <li key={i} className="flex items-start gap-3 leading-relaxed text-muted-foreground">
                  <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-red-500/20 bg-card/30 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110">
              <XCircle className="h-24 w-24 text-red-500" />
            </div>
            <h2 className="mb-6 flex items-center gap-3 text-xl font-bold text-foreground md:text-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                <XCircle className="h-6 w-6" />
              </span>
              Trường hợp không hỗ trợ
            </h2>
            <ul className="space-y-3">
              {denyRefund.map((item, i) => (
                <li key={i} className="flex items-start gap-3 leading-relaxed text-muted-foreground">
                  <div className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border/50 bg-card/30 p-6 shadow-xl backdrop-blur-xl md:col-span-2 md:p-8">
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <h3 className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">1</span>
                  Quy trình yêu cầu
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Bạn vui lòng liên hệ với bộ phận hỗ trợ qua Facebook https://www.facebook.com/vextrovn hoặc email help@vextro.vn và cung cấp mã đơn hàng cùng lý do yêu cầu hoàn tiền. Chúng tôi sẽ xem xét và phản hồi trong vòng 24 giờ làm việc.
                </p>
              </div>
              <div className="space-y-6">
                <h3 className="flex items-center gap-3 text-2xl font-bold text-foreground">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">2</span>
                  Thời gian nhận tiền
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Nếu yêu cầu hoàn tiền được chấp thuận, số tiền sẽ được hoàn về tài khoản gốc của bạn trong vòng 3 - 5 ngày làm việc, tùy thuộc vào ngân hàng hoặc cổng thanh toán.
                </p>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4 rounded-2xl border-t border-border/50 bg-primary/5 p-5 pt-6 text-primary">
              <Info className="h-6 w-6 shrink-0" />
              <p className="text-sm font-medium italic leading-relaxed">
                Lưu ý: Mọi quyết định cuối cùng về hoàn tiền thuộc về Vextro dựa trên các bằng chứng và điều khoản đã được công bố.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
