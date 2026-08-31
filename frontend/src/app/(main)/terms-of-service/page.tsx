import React from "react";
import { Shield, CheckCircle2 } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Điều khoản dịch vụ",
    description: "Quy định về việc sử dụng website và dịch vụ tại VEXTRO. Cập nhật lần cuối: 13/04/2026.",
    path: "/terms-of-service",
    keywords: ["điều khoản VEXTRO", "terms of service VEXTRO"],
  });
}

export default function TermsOfServicePage() {
  const sections = [
    {
      id: "1",
      title: "Chấp nhận điều khoản",
      content: "Bằng việc truy cập và sử dụng website Vextro, bạn đồng ý tuân thủ các điều khoản và điều kiện được nêu tại đây. Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng không sử dụng dịch vụ của chúng tôi.",
    },
    {
      id: "2",
      title: "Tài khoản người dùng",
      content: "Bạn có trách nhiệm bảo mật thông tin tài khoản và mật khẩu của mình. Mọi hoạt động diễn ra dưới tài khoản của bạn sẽ thuộc trách nhiệm của bạn. Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản nếu phát hiện hành vi vi phạm.",
    },
    {
      id: "3",
      title: "Quy định mua hàng",
      content: "Vextro chỉ cung cấp các sản phẩm kỹ thuật số cho mục đích sử dụng cá nhân. Bạn cam kết thông tin thanh toán cung cấp là chính xác và hợp pháp. Sau khi thanh toán thành công, sản phẩm sẽ được bàn giao tự động qua hệ thống.",
    },
    {
      id: "4",
      title: "Quyền sở hữu trí tuệ",
      content: "Tất cả nội dung, hình ảnh và phần mềm trên website đều thuộc sở hữu của Vextro hoặc các đối tác cung cấp. Nghiêm cấm mọi hành vi sao chép, phân phối lại hoặc sử dụng thương mại khi chưa có sự đồng ý bằng văn bản.",
    },
    {
      id: "5",
      title: "Thay đổi điều khoản",
      content: "Chúng tôi có quyền cập nhật hoặc thay đổi các điều khoản này bất cứ lúc nào mà không cần thông báo trước. Việc tiếp tục sử dụng website sau các thay đổi đồng nghĩa với việc bạn chấp nhận các điều khoản mới.",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-20">
      {/* Header Section */}
      <div className="mb-8 pt-6 text-center md:mb-10 md:pt-8">
        <div className="container mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
            <Shield className="w-4 h-4" />
            <span>Pháp lý & Quy định</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-6">
            Điều khoản dịch vụ
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Quy định về việc sử dụng website và dịch vụ tại Vextro. Cập nhật lần cuối: 13/04/2026.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Main Content Card */}
          <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/30 shadow-2xl backdrop-blur-xl">
            <div className="space-y-9 p-6 md:p-10">
              {sections.map((section) => (
                <div key={section.id} className="group relative pl-11">
                  <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    {section.id}
                  </div>
                  <h2 className="mb-3 text-xl font-bold text-foreground transition-colors group-hover:text-primary md:text-2xl">
                    {section.title}
                  </h2>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {section.content}
                  </p>
                </div>
              ))}

              <div className="pt-8 border-t border-border/50">
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    Bằng cách tiếp tục sử dụng Vextro, bạn xác nhận đã đọc và hiểu rõ các điều khoản dịch vụ này.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Support Note */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">
              Bạn có thắc mắc về điều khoản?{" "}
              <a href="/contact" className="text-primary font-bold hover:underline">
                Liên hệ chúng tôi ngay
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
