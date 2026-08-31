import React from "react";
import { Zap, Clock, Download, AlertCircle } from "lucide-react";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Chính sách giao hàng",
    description: "Sản phẩm được cung cấp dưới dạng kỹ thuật số và được giao ngay sau khi thanh toán thành công tại VEXTRO.",
    path: "/delivery-policy",
    keywords: ["giao hàng VEXTRO", "giao sản phẩm số", "nhận tài khoản ngay"],
  });
}

export default function DeliveryPolicyPage() {
  const sections = [
    {
      title: "Hình thức giao hàng",
      content: "Tất cả sản phẩm trên Vextro đều là sản phẩm số (file tải về, tài khoản, key kích hoạt). Chúng tôi không giao hàng vật lý qua các đơn vị vận chuyển truyền thống.",
      icon: <Zap className="w-6 h-6 text-yellow-500" />,
      color: "bg-yellow-500/10",
    },
    {
      title: "Thời gian bàn giao",
      content: "Sản phẩm sẽ được bàn giao tự động và tức thì ngay sau khi hệ thống ghi nhận thanh toán thành công. Trong một số trường hợp đặc biệt cần xử lý thủ công, thời gian bàn giao tối đa là 24h.",
      icon: <Clock className="w-6 h-6 text-blue-500" />,
      color: "bg-blue-500/10",
    },
    {
      title: "Cách thức nhận sản phẩm",
      content: "Bạn có thể tải trực tiếp tại trang 'Đơn hàng' sau khi thanh toán thành công, nhận qua email hoặc truy cập lịch sử đơn hàng trong phần quản lý tài khoản.",
      icon: <Download className="w-6 h-6 text-emerald-500" />,
      color: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 xl:px-8 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Chính sách giao hàng</span>
        </div>
      </div>
      {/* Header Section */}
      <div className="mb-8 pt-6 text-center md:mb-10 md:pt-8">
        <div className="container mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 text-sm font-bold mb-6">
            <Zap className="w-4 h-4" />
            <span>Giao hàng tự động 24/7</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-6">
            Chính sách giao hàng & truy cập
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Sản phẩm được cung cấp dưới dạng kỹ thuật số và được giao ngay sau khi thanh toán thành công.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl space-y-6">
          {sections.map((section, index) => (
            <div
              key={index}
              className="group flex flex-col items-start gap-6 rounded-3xl border border-border/50 bg-card/30 p-6 shadow-xl transition-all duration-300 hover:border-primary/30 md:flex-row md:p-8"
            >
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${section.color} transition-transform group-hover:scale-110`}>
                {section.icon}
              </div>
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground transition-colors group-hover:text-primary md:text-2xl">
                  {index + 1}. {section.title}
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {section.content}
                </p>
              </div>
            </div>
          ))}

          {/* Warning Note */}
          <div className="flex items-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
            <AlertCircle className="h-8 w-8 shrink-0 text-red-500" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Vấn đề phát sinh?</h3>
              <p className="text-muted-foreground leading-relaxed italic">
                Nếu sau khi thanh toán thành công mà bạn chưa nhận được sản phẩm hoặc gặp lỗi khi truy cập, vui lòng liên hệ ngay với đội ngũ hỗ trợ để được xử lý kịp thời.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
