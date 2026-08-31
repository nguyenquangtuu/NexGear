import React from "react";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  ShoppingBag,
  Download,
  UserRound,
  RefreshCcw,
} from "lucide-react";

import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildPageMetadata({
    title: "Hướng dẫn mua hàng",
    description:
      "Xem quy trình mua hàng hiện tại trên Vextro: đăng nhập, chọn sản phẩm, thanh toán chuyển khoản và gia hạn dịch vụ.",
    path: "/huong-dan-mua-hang",
    keywords: [
      "hướng dẫn mua hàng",
      "cách mua trên Vextro",
      "thanh toán Vextro",
      "gia hạn dịch vụ Vextro",
    ],
  });
}

const steps = [
  {
    title: "Đăng nhập trước khi mua",
    description:
      "Bạn cần đăng nhập để hệ thống gắn đơn hàng và dịch vụ đã mua đúng vào tài khoản của mình.",
    icon: <UserRound className="h-6 w-6" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
    title: "Mở sản phẩm và nhập đủ thông tin",
    description:
      "Tại trang sản phẩm, chọn đúng phân loại, số lượng và điền đầy đủ các trường bắt buộc nếu gói yêu cầu. Sau đó bấm Mua ngay để mở hộp xác nhận thanh toán.",
    icon: <ShoppingBag className="h-6 w-6" />,
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "Thanh toán bằng chuyển khoản",
    description:
      "Sau khi xác nhận mua hàng, hệ thống tạo đơn và chuyển bạn sang trang thanh toán. Tại đây bạn quét QR hoặc chuyển khoản đúng số tiền, đúng nội dung để hệ thống xác nhận.",
    icon: <CreditCard className="h-6 w-6" />,
    color: "from-emerald-500 to-teal-500",
  },
  {
    title: "Theo dõi đơn trong mục Đơn hàng",
    description:
      "Đơn chờ thanh toán có thể tiếp tục thanh toán lại từ trang Đơn hàng. Sau khi thanh toán thành công, đơn sẽ chuyển sang trạng thái đang xử lý hoặc hoàn thành tùy loại sản phẩm.",
    icon: <Download className="h-6 w-6" />,
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Gia hạn trong Quản lý dịch vụ",
    description:
      "Với dịch vụ còn hạn và cho phép gia hạn, bạn vào Quản lý dịch vụ để bấm gia hạn. Hệ thống sẽ tạo đơn thanh toán chuyển khoản riêng cho lần gia hạn đó.",
    icon: <RefreshCcw className="h-6 w-6" />,
    color: "from-sky-500 to-indigo-500",
  },
];

const notes = [
  "Mọi đơn hàng hiện được thanh toán bằng chuyển khoản, không còn sử dụng ví nội bộ.",
  "Bạn cần thanh toán tại trang thanh toán đơn hàng bằng đúng nội dung chuyển khoản để hệ thống nhận diện.",
  "Đơn ở trạng thái chờ thanh toán có thể mở lại từ mục Đơn hàng để tiếp tục thanh toán trước khi hết thời gian chờ.",
  "Đơn gia hạn cũng dùng chuyển khoản như đơn mua mới và chỉ được cập nhật sau khi thanh toán thành công.",
  "Sau khi mua hoặc gia hạn, nên kiểm tra cả mục Đơn hàng và Quản lý dịch vụ để theo dõi đúng tiến độ thực tế.",
];

export default function HuongDanMuaHangPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 xl:px-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-primary">Trang chủ</Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Hướng dẫn mua hàng</span>
        </div>
      </div>

      <div className="relative mb-10 overflow-hidden py-10 md:py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary md:text-sm">
            <ShoppingBag className="h-4 w-4" />
            <span>Luồng mua hàng và gia hạn hiện tại</span>
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl lg:text-5xl">
            Hướng dẫn mua hàng
          </h1>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground md:text-lg lg:mx-0">
            Vextro hiện xử lý thanh toán bằng chuyển khoản cho cả đơn mua mới và đơn gia hạn.
            Với các gói dịch vụ có hạn dùng, thao tác gia hạn được thực hiện riêng trong Quản lý dịch vụ và sẽ chuyển sang luồng thanh toán tương ứng.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 xl:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="relative space-y-8">
            <div className="absolute bottom-16 left-7 top-16 hidden w-px bg-linear-to-b from-primary/20 via-primary/10 to-transparent md:block" />

            {steps.map((step, index) => (
              <div
                key={step.title}
                className="group relative flex flex-col items-center gap-5 rounded-2xl border border-border/50 bg-card/30 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-primary/30 md:flex-row md:items-start md:p-6"
              >
                <div
                  className={`relative z-10 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-105`}
                >
                  {step.icon}
                  <div className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-card bg-background text-[11px] font-black text-primary">
                    {index + 1}
                  </div>
                </div>

                <div className="relative z-10 space-y-3 text-center md:text-left">
                  <h3 className="text-xl font-black text-foreground transition-colors group-hover:text-primary md:text-2xl">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{step.description}</p>
                </div>

                <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 opacity-5 transition-all group-hover:translate-x-2 group-hover:opacity-10 md:block">
                  <ChevronRight className="h-16 w-16" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-5 md:p-6">
            <h2 className="text-lg font-black text-foreground md:text-xl">Lưu ý quan trọng</h2>
            <div className="mt-4 space-y-3">
              {notes.map((note) => (
                <div key={note} className="flex items-start gap-3 text-sm text-muted-foreground md:text-base">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition-all hover:border-primary/30 hover:text-primary md:text-base"
            >
              Xem sản phẩm ngay
              <ShoppingBag className="h-5 w-5" />
            </Link>
            <Link
              href="/profile/services"
              className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition-all hover:border-primary/30 hover:text-primary md:text-base"
            >
              Mở quản lý dịch vụ
              <RefreshCcw className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
