import React from "react";
import { Scale, AlertTriangle } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Chính sách sử dụng",
    description: "Quy định về việc sử dụng và quyền sở hữu các nền tảng kỹ thuật số được mua tại VEXTRO.",
    path: "/license",
    keywords: ["chính sách sử dụng", "license VEXTRO", "quyền sử dụng tài khoản"],
  });
}

export default function LicensePage() {
  const sections = [
    {
      id: "1",
      title: "Phạm vi sử dụng",
      content: "Sản phẩm bạn mua tại Vextro chỉ được sử dụng cho mục đích cá nhân hoặc theo phạm vi cho phép được nêu trong mô tả sản phẩm. Bạn không có quyền sử dụng sản phẩm cho các hoạt động vi phạm pháp luật hoặc đạo đức xã hội.",
    },
    {
      id: "2",
      title: "Hạn chế quyền hạn",
      content: "Nghiêm cấm việc chia sẻ, sao chép, bán lại hoặc phân phối lại sản phẩm dưới bất kỳ hình thức nào khi chưa có sự cho phép bằng văn bản từ VEXTRO. Mọi hành vi vi phạm sẽ bị khóa tài khoản vĩnh viễn và có thể bị truy cứu trách nhiệm pháp lý.",
    },
    {
      id: "3",
      title: "Trách nhiệm người dùng",
      content: "Bạn chịu trách nhiệm hoàn toàn về các hoạt động phát sinh từ việc sử dụng sản phẩm. VEXTRO không chịu trách nhiệm cho bất kỳ thiệt hại nào do việc sử dụng sản phẩm sai mục đích hoặc không đúng hướng dẫn.",
    },
    {
      id: "4",
      title: "Cập nhật và hỗ trợ",
      content: "Đối với các sản phẩm có hỗ trợ cập nhật, bạn sẽ nhận được thông báo qua email hoặc trực tiếp trên website. Mọi thắc mắc về kỹ thuật vui lòng liên hệ bộ phận hỗ trợ để được giải đáp.",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-20">
      {/* Header Section */}
      <div className="mb-8 pt-6 text-center md:mb-10 md:pt-8">
        <div className="container mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 text-sm font-bold mb-6">
            <Scale className="w-4 h-4" />
            <span>Quyền sở hữu & Sử dụng</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-6">
            Chính sách sử dụng
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Quy định về việc sử dụng sản phẩm kỹ thuật số được mua tại Vextro.
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
                <div className="flex items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                  <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    Việc vi phạm chính sách sử dụng có thể dẫn đến việc đình chỉ tài khoản vĩnh viễn mà không được hoàn tiền.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
