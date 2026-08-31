import React from "react";
import { Search, BookOpen, CreditCard, ShieldCheck, User, MessageCircle, Mail, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Trung tâm hỗ trợ",
    description: "Tìm kiếm hướng dẫn, câu hỏi thường gặp hoặc liên hệ trực tiếp với đội ngũ hỗ trợ tại VEXTRO.",
    path: "/help-center",
    keywords: ["trung tâm hỗ trợ", "help center VEXTRO", "hướng dẫn VEXTRO"],
  });
}

export default function HelpCenterPage() {
  const categories = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Hướng dẫn mua hàng",
      description: "Quy trình mua sản phẩm số, thanh toán và nhận file tự động.",
      color: "from-blue-500/20 to-cyan-500/20",
      link: "/huong-dan-mua-hang",
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Thanh toán & Hoàn tiền",
      description: "Các phương thức thanh toán và chính sách hoàn trả sản phẩm.",
      color: "from-emerald-500/20 to-teal-500/20",
      link: "/refund-policy",
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Quyền sử dụng & Bảo mật",
      description: "Quy định về việc sử dụng sản phẩm và bảo vệ thông tin cá nhân.",
      color: "from-orange-500/20 to-red-500/20",
      link: "/license",
    },
    {
      icon: <User className="w-6 h-6" />,
      title: "Câu hỏi thường gặp",
      description: "Giải đáp các thắc mắc phổ biến của người dùng khi mua hàng.",
      color: "from-purple-500/20 to-pink-500/20",
      link: "/faq",
    },
  ];

  const popularArticles = [
    { title: "Cách mua sản phẩm trên Vextro", link: "/huong-dan-mua-hang" },
    { title: "Làm sao để nhận file sau khi thanh toán thành công?", link: "/faq" },
    { title: "Chính sách hoàn tiền đối với sản phẩm kỹ thuật số", link: "/refund-policy" },
    { title: "Quyền sử dụng sản phẩm sau khi mua", link: "/license" },
    { title: "Tôi cần làm gì nếu không nhận được email gửi file?", link: "/faq" },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-muted/30 border-b border-border/50 py-14 md:py-18">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-50" />
        
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8 relative z-10">
          <div className="max-w-4xl space-y-5 text-center lg:text-left">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Chúng tôi có thể giúp gì?
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl lg:mx-0 mx-auto">
              Tìm kiếm hướng dẫn, câu hỏi thường gặp hoặc liên hệ trực tiếp với chúng tôi.
            </p>
            <div className="relative group max-w-2xl mx-auto lg:mx-0 pt-4 md:pt-5">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 mt-3.5 text-muted-foreground group-focus-within:text-primary transition-colors w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm vấn đề của bạn..."
                className="w-full pl-14 pr-5 py-3.5 md:py-4 rounded-2xl bg-card border border-border/50 focus:outline-hidden focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-lg text-sm md:text-base"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8 -mt-8 relative z-20">
        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-12 md:mb-14">
          {categories.map((cat, i) => (
            <Link
              key={i}
              href={cat.link}
              className="group p-5 md:p-6 rounded-2xl border border-border/50 bg-card backdrop-blur-sm hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col items-start text-left"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform shadow-inner`}>
                {cat.icon}
              </div>
              <h3 className="text-lg font-bold mb-1.5">{cat.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Popular Articles */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h2 className="text-xl md:text-2xl font-black">Câu hỏi phổ biến</h2>
              </div>
              
              <div className="space-y-2.5">
                {popularArticles.map((article, i) => (
                  <Link
                    key={i}
                    href={article.link}
                    className="p-3.5 md:p-4 rounded-xl border border-border/40 bg-card/30 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all flex items-center justify-between gap-3 group"
                  >
                    <span className="text-foreground/90 text-sm md:text-base font-bold group-hover:text-primary transition-colors">
                      {article.title}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
              
              <Link href="/faq" className="mt-7 inline-flex items-center gap-2 text-primary font-bold text-base hover:gap-3 transition-all group">
                Xem tất cả câu hỏi
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>

          {/* Contact Support Sidebar */}
          <div className="lg:col-span-4 space-y-5 sticky top-20">
            <div className="p-6 md:p-7 rounded-2xl border border-border/50 bg-linear-to-br from-primary/10 via-card to-card relative overflow-hidden shadow-xl group">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-3">Vẫn cần hỗ trợ?</h3>
                <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed">
                  Nếu bạn không tìm thấy câu trả lời, hãy kết nối với đội ngũ Vextro ngay lập tức.
                </p>
                
                <div className="space-y-3">
                  <a
                    href="https://www.facebook.com/vextrovn"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 bg-[#1877F2] text-white py-3.5 rounded-xl font-bold text-sm md:text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 group"
                  >
                    <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Facebook
                  </a>
                  <a
                    href="mailto:help@vextro.vn"
                    className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-sm md:text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20 group"
                  >
                    <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    help@vextro.vn
                  </a>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                <span className="text-xs font-black text-emerald-600 uppercase tracking-wide">Đang trực tuyến</span>
              </div>
              <p className="text-sm text-muted-foreground mb-1 italic">Thời gian phản hồi</p>
              <p className="text-xl font-black text-emerald-600 tracking-tight">~ 5-15 phút</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

