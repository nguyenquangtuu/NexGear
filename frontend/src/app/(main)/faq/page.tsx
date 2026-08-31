import React from "react";
import { HelpCircle, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Câu hỏi thường gặp",
    description: "Tìm câu trả lời nhanh cho các thắc mắc phổ biến nhất về cách sử dụng, mua hàng và thanh toán tại VEXTRO.",
    path: "/faq",
    keywords: ["FAQ VEXTRO", "câu hỏi thường gặp", "hỗ trợ mua hàng"],
  });
}

export default function FAQPage() {
  const faqItems = [
    {
      question: "Làm thế nào để mua sản phẩm trên Vextro?",
      answer:
        "Bạn chỉ cần chọn sản phẩm mong muốn, nhấn 'Mua ngay', chọn phương thức thanh toán và hoàn tất giao dịch. Hệ thống sẽ gửi file hoặc tài khoản cho bạn ngay lập tức qua email và lịch sử đơn hàng.",
    },
    {
      question: "Tôi sẽ nhận sản phẩm như thế nào sau khi thanh toán?",
      answer:
        "Sau khi thanh toán thành công, bạn có thể tải file trực tiếp tại trang 'Đơn hàng của tôi' hoặc kiểm tra email để nhận đường dẫn tải sản phẩm hoặc thông tin tài khoản.",
    },
    {
      question: "Vextro có hỗ trợ hoàn tiền không?",
      answer:
        "Chúng tôi hỗ trợ hoàn tiền trong trường hợp sản phẩm lỗi hoặc không đúng mô tả. Vui lòng tham khảo 'Chính sách hoàn tiền' để biết thêm chi tiết về điều kiện và quy trình.",
    },
    {
      question: "Tôi có thể chia sẻ sản phẩm đã mua cho người khác không?",
      answer:
        "Không. Sản phẩm bạn mua chỉ dành cho mục đích sử dụng cá nhân. Việc chia sẻ, sao chép hoặc phân phối lại khi chưa có sự cho phép là vi phạm điều khoản sử dụng của chúng tôi.",
    },
    {
      question: "Tôi cần làm gì nếu gặp lỗi trong quá trình sử dụng sản phẩm?",
      answer:
        "Bạn có thể liên hệ trực tiếp với đội ngũ hỗ trợ qua Facebook https://www.facebook.com/vextrovn hoặc email help@vextro.vn. Vui lòng cung cấp mã đơn hàng để chúng tôi hỗ trợ bạn nhanh nhất.",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 xl:px-8 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Câu hỏi thường gặp</span>
        </div>
      </div>

      <div className="relative mb-10 overflow-hidden py-10 md:py-12">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary md:text-sm">
            <HelpCircle className="h-4 w-4" />
            <span>Giải đáp thắc mắc</span>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl lg:text-5xl">
            Câu hỏi thường gặp
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg lg:mx-0">
            Tìm câu trả lời nhanh cho các thắc mắc phổ biến nhất về Vextro.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8">
        <div className="mx-auto max-w-5xl space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-border/50 bg-card/30 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-primary/30 md:p-6"
            >
              <h3 className="mb-2 flex items-start gap-2.5 text-base font-bold text-foreground md:text-lg">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary transition-all group-hover:bg-primary group-hover:text-white">
                  {index + 1}
                </span>
                {item.question}
              </h3>
              <p className="pl-8 text-sm leading-relaxed text-muted-foreground md:text-base">
                {item.answer}
              </p>
            </div>
          ))}

          <div className="relative mt-10 overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 text-center md:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative z-10">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-primary" />
              <h2 className="mb-2.5 text-xl font-bold md:text-2xl">Vẫn không tìm thấy câu trả lời?</h2>
              <p className="mx-auto mb-6 max-w-xl text-sm text-muted-foreground md:text-base">
                Đừng lo lắng, đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp đỡ bạn.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95 md:text-base"
              >
                Liên hệ hỗ trợ ngay
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
