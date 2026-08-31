import React from "react";
import { Mail, MessageCircle, Clock } from "lucide-react";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Liên hệ hỗ trợ",
    description: "Đội ngũ VEXTRO luôn sẵn sàng lắng nghe và hỗ trợ qua Facebook và email chính thức nhanh chóng nhất.",
    path: "/contact",
    keywords: ["liên hệ VEXTRO", "hỗ trợ VEXTRO", "support VEXTRO"],
  });
}

export default function ContactPage() {
  const contactMethods = [
    {
      title: "Facebook",
      description: "Hỗ trợ trực tiếp qua tin nhắn Facebook. Đây là kênh phản hồi nhanh nhất.",
      icon: <MessageCircle className="w-8 h-8" />,
      action: "Nhắn tin ngay",
      link: "https://www.facebook.com/vextrovn",
      color: "bg-blue-500",
      shadow: "shadow-blue-500/20",
    },
    {
      title: "Hỗ trợ qua Email",
      description: "Gửi yêu cầu hỗ trợ chi tiết qua email để chúng tôi xử lý đầy đủ hơn.",
      icon: <Mail className="w-8 h-8" />,
      action: "Gửi email",
      link: "mailto:help@vextro.vn",
      color: "bg-emerald-500",
      shadow: "shadow-emerald-500/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 xl:px-8 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Liên hệ</span>
        </div>
      </div>
      <div className="relative mb-10 overflow-hidden py-10 md:py-12 lg:py-14">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary md:text-sm">
            <MessageCircle className="w-4 h-4" />
            <span>Liên hệ chúng tôi</span>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl lg:text-5xl">
            Bạn cần hỗ trợ?
          </h1>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-lg lg:mx-0">
            Đội ngũ Vextro luôn sẵn sàng lắng nghe và hỗ trợ khi bạn cần. Hiện tại chúng tôi chỉ hỗ trợ qua Facebook và email chính thức.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 grid items-stretch gap-5 md:grid-cols-2">
            {contactMethods.map((method, index) => (
              <div
                key={index}
                className="group flex h-full flex-col items-start rounded-2xl border border-border/50 bg-card/30 p-6 text-left shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-lg ${method.color} ${method.shadow} transition-transform duration-300 group-hover:scale-105`}
                >
                  {method.icon}
                </div>
                <h3 className="mb-2 text-lg font-black transition-colors group-hover:text-primary md:text-xl">
                  {method.title}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {method.description}
                </p>
                <a
                  href={method.link}
                  target={method.link.startsWith("http") ? "_blank" : undefined}
                  rel={method.link.startsWith("http") ? "noreferrer" : undefined}
                  className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-95 md:text-base"
                >
                  {method.action}
                </a>
              </div>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/30 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold">Thời gian phản hồi</h4>
                <p className="text-sm italic text-muted-foreground">08:00 - 22:00 mỗi ngày</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/30 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold">Email hỗ trợ</h4>
                <p className="text-sm text-muted-foreground">help@vextro.vn</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
