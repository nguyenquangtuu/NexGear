import { Metadata } from "next";
import PaymentResultClient from "./PaymentResultClient";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { orderCode?: string; order_code?: string };
}): Promise<Metadata> {
  const orderCode = searchParams.orderCode || searchParams.order_code || "";
  return {
    title: orderCode ? `Thanh toán đơn hàng ${orderCode}` : "Thanh toán đơn hàng",
    description: "Hoàn tất thanh toán đơn hàng của bạn qua chuyển khoản ngân hàng hoặc QR code.",
  };
}

export default function PaymentResultPage() {
  return (
    <div className="main-page">
      <section className="page-section">
        <PaymentResultClient />
      </section>
    </div>
  );
}
