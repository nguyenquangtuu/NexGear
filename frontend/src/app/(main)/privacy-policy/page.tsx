import React from "react";
import { Lock } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Chính sách bảo mật",
    description: "Chúng tôi cam kết bảo vệ quyền riêng tư của người dùng khi sử dụng dịch vụ tại VEXTRO.",
    path: "/privacy-policy",
    keywords: ["bảo mật VEXTRO", "privacy policy VEXTRO"],
  });
}

export default function PrivacyPolicyPage() {
  const sections = [
    {
      id: "1",
      title: "Thông tin chúng tôi thu thập",
      content:
        "Chúng tôi thu thập các thông tin cần thiết như tên, email và dữ liệu giao dịch để xử lý đơn hàng, hỗ trợ khách hàng và vận hành dịch vụ.",
    },
    {
      id: "2",
      title: "Mục đích sử dụng dữ liệu",
      content:
        "Dữ liệu được dùng để xác nhận thanh toán, bàn giao sản phẩm số, gửi thông báo cần thiết và cải thiện trải nghiệm sử dụng website.",
    },
    {
      id: "3",
      title: "Bảo mật thông tin",
      content:
        "Hệ thống áp dụng các biện pháp kỹ thuật phù hợp để hạn chế truy cập trái phép. Thanh toán được xử lý qua các cổng uy tín và kết nối mã hóa.",
    },
    {
      id: "4",
      title: "Chia sẻ với bên thứ ba",
      content:
        "Chúng tôi không bán dữ liệu cá nhân. Thông tin chỉ được chia sẻ ở mức cần thiết với đối tác thanh toán hoặc hạ tầng kỹ thuật để hoàn tất giao dịch.",
    },
    {
      id: "5",
      title: "Quyền của người dùng",
      content:
        "Bạn có thể yêu cầu xem, cập nhật hoặc xóa dữ liệu cá nhân bằng cách liên hệ đội ngũ hỗ trợ. Chúng tôi sẽ xử lý trong thời gian hợp lý.",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border/60 bg-card p-5 md:p-7">
          <div className="mb-7 border-b border-border/60 pb-5">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Lock className="h-3.5 w-3.5" />
              <span>Bảo mật dữ liệu</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Chính sách bảo mật
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Chúng tôi cam kết bảo vệ quyền riêng tư của người dùng khi sử dụng dịch vụ tại
              Vextro. Cập nhật lần cuối: 13/04/2026.
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <section
                key={section.id}
                className="rounded-xl border border-border/60 bg-background/70 p-4 md:p-4"
              >
                <h2 className="text-base font-semibold text-foreground md:text-lg">
                  {section.id}. {section.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-[15px]">
                  {section.content}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-6 rounded-lg border border-border/60 bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground">
            Nếu có câu hỏi về dữ liệu cá nhân, vui lòng liên hệ kênh hỗ trợ chính thức của Vextro để
            được phản hồi sớm nhất.
          </p>
        </div>
      </div>
    </div>
  );
}
