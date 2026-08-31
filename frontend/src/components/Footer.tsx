"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Globe } from "lucide-react";

import { useTheme } from "@/components/ThemeProvider";

const Footer = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = mounted
    ? resolvedTheme === "dark"
      ? "/images/brand/logo-dark.png"
      : "/images/brand/logo-light.png"
    : "/images/brand/logo-dark.png";

  return (
    <footer className="hidden border-t border-border bg-card pb-24 pt-10 md:block md:pb-12 md:pt-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col gap-4 sm:col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={logoSrc}
                alt="NEXGEAR"
                width={220}
                height={66}
                className="h-12 w-auto max-w-[220px] origin-left scale-110 object-contain"
                priority
              />
            </Link>
            <p className="type-body-muted">
              NEXGEAR là hệ thống bán lẻ laptop, linh kiện và thiết bị công nghệ chính hãng với giá tốt, bảo hành rõ ràng và dịch vụ chuyên nghiệp.
            </p>
            <div className="mt-2 flex gap-4">
              <Link
                href="https://www.facebook.com/nexgearvn"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Globe className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:help@nexgear.vn"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="type-title-sm text-foreground">Sản phẩm & Dịch vụ</h3>
            <div className="flex flex-col gap-2">
              <Link href="/products" className="type-body-muted transition-colors hover:text-primary">
                Tất cả sản phẩm
              </Link>
              <Link href="/products?sort=best_selling" className="type-body-muted transition-colors hover:text-primary">
                Sản phẩm bán chạy
              </Link>
              <Link href="/products?sort=discount" className="type-body-muted transition-colors hover:text-primary">
                Đang giảm giá
              </Link>
              <Link href="/blog" className="type-body-muted transition-colors hover:text-primary">
                Tin tức công nghệ
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="type-title-sm text-foreground">Hỗ trợ khách hàng</h3>
            <div className="flex flex-col gap-2">
              <Link href="/terms" className="type-body-muted transition-colors hover:text-primary">
                Điều khoản sử dụng
              </Link>
              <Link href="/privacy" className="type-body-muted transition-colors hover:text-primary">
                Chính sách bảo mật
              </Link>
              <Link href="/warranty" className="type-body-muted transition-colors hover:text-primary">
                Chính sách bảo hành
              </Link>
              <Link href="/faq" className="type-body-muted transition-colors hover:text-primary">
                Câu hỏi thường gặp
              </Link>
              <Link href="/contact" className="type-body-muted transition-colors hover:text-primary">
                Liên hệ hỗ trợ
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="type-title-sm text-foreground">Chính sách</h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/terms-of-service"
                className="type-body-muted transition-colors hover:text-primary"
              >
                Điều khoản dịch vụ
              </Link>
              <Link
                href="/privacy-policy"
                className="type-body-muted transition-colors hover:text-primary"
              >
                Chính sách bảo mật
              </Link>
              <Link
                href="/refund-policy"
                className="type-body-muted transition-colors hover:text-primary"
              >
                Chính sách hoàn tiền
              </Link>
              <Link
                href="/delivery-policy"
                className="type-body-muted transition-colors hover:text-primary"
              >
                Chính sách giao hàng và truy cập
              </Link>
              <Link href="/license" className="type-body-muted transition-colors hover:text-primary">
                Chính sách sử dụng
              </Link>
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="type-title-sm text-foreground">Liên hệ với chúng tôi</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-primary" />
                <Link
                  href="mailto:help@nexgear.vn"
                  className="type-body-muted transition-colors hover:text-primary"
                >
                  help@nexgear.vn
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 shrink-0 text-primary" />
                <Link
                  href="https://www.facebook.com/nexgearvn"
                  target="_blank"
                  rel="noreferrer"
                  className="type-body-muted transition-colors hover:text-primary"
                >
                  facebook.com/nexgearvn
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="type-caption text-center text-muted-foreground md:text-left">
            © 2026 NEXGEAR - Laptop & Thiết bị công nghệ chính hãng
          </p>
          <div className="flex gap-6 grayscale opacity-50">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Visa_Inc._logo_%282021%E2%80%93present%29.svg/1280px-Visa_Inc._logo_%282021%E2%80%93present%29.svg.png"
              alt="Visa"
              className="h-4 object-contain"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png"
              alt="Mastercard"
              className="h-4 object-contain"
            />
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/PayPal_logo.svg/960px-PayPal_logo.svg.png"
              alt="Paypal"
              className="h-4 object-contain"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
