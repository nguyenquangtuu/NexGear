# ⚡ NexGear - Modern Frontend Web Client

Giao diện Web Client cho nền tảng thương mại điện tử **NexGear** (Laptop & Thiết bị công nghệ cao cấp), được xây dựng trên nền tảng **Next.js 16 (App Router)** và **React 19**, mang lại trải nghiệm mua sắm mượt mà, tốc độ tải trang vượt trội, giao diện người dùng (UI/UX) tinh tế và tối ưu chuẩn SEO.

---

## 🚀 Công nghệ Sử dụng

* **Core Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components, Streaming SSR).
* **UI Library**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/).
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Modern CSS system, Responsive Design).
* **Icons & Themes**: Lucide React, Next-themes (Hỗ trợ Dark/Light mode).
* **Rich Text Editor**: [Tiptap Editor](https://tiptap.dev/) cho việc tạo nội dung Sản phẩm & Bài viết Blog.
* **Realtime**: [Pusher JS](https://pusher.com/) cho Live Chat và Thông báo người dùng tức thì.
* **Bảo mật & Tiện ích**: Cloudflare Turnstile CAPTCHA, React Hot Toast, ZXing Browser (Quét mã).
* **SEO & Metadata**: Động theo từng trang, tự động sinh `sitemap.ts`, `robots.ts` và Schema Markup (JSON-LD).

---

## ✨ Tính năng Chính

### 🛍️ 1. Giao diện Khách hàng (Storefront)
* **Trang chủ sống động**: Hero Banners động, Khung giờ vàng Flash Sale đếm ngược, Danh sách sản phẩm mới về & đề xuất cá nhân hóa, Sản phẩm vừa xem gần đây.
* **Tìm kiếm & Lọc nâng cao**: Lọc sản phẩm theo danh mục đa cấp, khoảng giá, thương hiệu; sắp xếp theo giá, đánh giá và độ phổ biến.
* **Trang Chi tiết Sản phẩm**: Thư viện hình ảnh sắc nét, bảng thông số kỹ thuật, lựa chọn biến thể linh hoạt, form nhập liệu yêu cầu theo từng biến thể.
* **Đánh giá Sản phẩm**: Đánh giá 1-5 sao và để lại nhận xét được kiểm duyệt bởi AI.
* **Giỏ hàng & Đặt hàng**: Giỏ hàng realtime, mã giảm giá Coupon, chọn phương thức nhận hàng (Giao tận nơi / Nhận tại cửa hàng).
* **Thanh toán Linh hoạt**: Nạp tiền & thanh toán bằng Ví NexGear, quét mã VietQR tự động qua PayOS, đối soát Sepay tức thì.
* **Trung tâm Tài khoản**: Quản lý thông tin, ví tiền, lịch sử đơn hàng, quản lý bảo hành & gia hạn dịch vụ (**User Services**), danh sách yêu thích (**Wishlist**), trung tâm thông báo realtime.
* **Hỗ trợ Trực tuyến**: Live Chat trực tiếp với Admin hoặc trò chuyện với **Trợ lý ảo AI CSKH (Google Gemini)** 24/7.
* **Blog & Cẩm nang**: Bài viết công nghệ, tin khuyến mãi, các trang chính sách & hướng dẫn mua hàng.

### ⚙️ 2. Giao diện Quản trị viên (Admin Dashboard - `/tp-admin`)
* **Tổng quan (Dashboard)**: Biểu đồ doanh thu, tổng số đơn hàng, khách hàng mới, sản phẩm bán chạy.
* **Quản lý Danh mục & Sản phẩm**: Thêm/Sửa/Xóa sản phẩm với trình soạn thảo Tiptap Rich Text, quản lý biến thể, giá vốn, giá bán, tồn kho.
* **Quản lý Đơn hàng & Giao dịch**: Theo dõi và cập nhật trạng thái đơn hàng, mã vận đơn, quản lý lịch sử nạp tiền và giao dịch toàn sàn.
* **Quản trị Người dùng**: Danh sách khách hàng, phân quyền Admin, điều chỉnh số dư ví khách hàng, khóa tài khoản vi phạm.
* **Marketing & Truyền thông**: Quản lý Mã giảm giá (Coupons), cấu hình Banner Trang chủ, quản lý Blog & Tin tức, Gửi Email Marketing hàng loạt.
* **Quản lý CSKH & AI**: Bảng điều khiển Live Chat đa phiên hội thoại, cấu hình Bot AI CSKH (System Prompt & Training Instructions).
* **Cài đặt Hệ thống & SEO**: Cấu hình thông tin website, tài khoản ngân hàng nhận tiền, quản lý SEO Onpage.

---

## 🛠 Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu Hệ thống
* Node.js 18.x trở lên
* npm / yarn / pnpm

### 2. Cài đặt Gói Phụ thuộc
```bash
cd frontend
npm install
```

### 3. Cấu hình Biến Môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```

### 4. Khởi chạy Ứng dụng
```bash
# Chạy ở chế độ phát triển (Development)
npm run dev

# Xây dựng bản tối ưu cho Production
npm run build

# Khởi chạy bản Production
npm run start

# Kiểm tra cú pháp mã nguồn
npm run lint
```

Mặc định, ứng dụng chạy tại: `http://localhost:3000`

---

Developed for **NexGear Frontend**.
