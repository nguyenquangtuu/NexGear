# ⚡ NexGear - Backend RESTful API Server

Hệ thống Backend RESTful API cho nền tảng thương mại điện tử **NexGear** (chuyên bán Laptop, Phụ kiện & Thiết bị công nghệ). Được xây dựng trên nền tảng **Node.js & Express**, kết hợp mô hình dữ liệu lai (**MySQL & MongoDB**), cung cấp các dịch vụ quản lý dữ liệu, xác thực đa phương thức, cổng thanh toán tự động, AI kiểm duyệt & tư vấn, và truyền tải thời gian thực.

---

## 🚀 Công nghệ Sử dụng

* **Core Framework**: Node.js & Express.js.
* **Cơ sở Dữ liệu**:
  * **MySQL (mysql2)**: Quản lý Người dùng, Phân quyền, Danh mục, Sản phẩm, Biến thể, Đơn hàng, Giao dịch ví, Mã giảm giá, Bài viết, Đánh giá.
  * **MongoDB (Mongoose)**: Lưu trữ Nhật ký hoạt động (Logs), Lịch sử Live Chat, Thông báo thời gian thực, Cấu hình API động (ApiVariables), Cấu hình biến thể nhà cung cấp (ProductVariantApiConfig).
* **Xác thực & Bảo mật**:
  * Passport.js (Local Auth, Google, Facebook, Zalo, GitHub OAuth 2.0).
  * Express-Session & Express-MySQL-Session lưu trữ phiên bảo mật.
  * 2FA Email OTP qua Nodemailer.
  * Helmet, CORS, Express Rate Limit, Bcryptjs, Cloudflare Turnstile Server Verification.
* **Tích hợp Dịch vụ Ngoài (Integrations)**:
  * **PayOS & Sepay Webhook**: Tự động tạo mã VietQR và đối soát ngân hàng tức thì 24/7.
  * **Pusher**: Kênh Realtime cho Live Chat và Thông báo người dùng.
  * **OpenRouter (Google Gemini 2.0 Flash)**: AI kiểm duyệt nội dung đánh giá và Bot AI tư vấn CSKH tự động.
  * **Zalo Bot Platform**: Webhook tự động nhận & gửi thông báo đơn hàng/giao dịch qua Zalo.

---

## ✨ Các Tính năng Chính

* **Xác thực & Phân quyền**: Đăng ký, đăng nhập Local & Social OAuth, 2FA OTP qua Email, quên mật khẩu an toàn, chống tấn công Brute-force (Login Throttle).
* **Quản lý Danh mục & Sản phẩm**: CRUD danh mục đa cấp, sản phẩm đa biến thể (CPU/RAM/SSD/Bảo hành), kho số lượng/mã tự động (**Warehouse Items**).
* **Kiểm tra Giá vốn Tự động (Price Check Service)**: Tự động kiểm tra giá nhà cung cấp và điều chỉnh giá bán theo biên lợi nhuận.
* **Đơn hàng & Thanh toán**:
  * Xử lý giỏ hàng, tính giá, áp dụng coupon giảm giá.
  * Thanh toán bằng Số dư ví, PayOS VietQR, đối soát Sepay Webhook, Chuyển khoản ngân hàng.
  * Tự động hủy đơn hàng quá hạn thanh toán (**Order Timeout Service**).
* **Hậu mãi & Quản lý Dịch vụ (User Services)**: Theo dõi thời hạn bảo hành, kích hoạt gia hạn dịch vụ tự động.
* **Đánh giá & AI Kiểm duyệt**: Hệ thống đánh giá 1-5 sao có AI rà soát ngôn từ thô tục, thư rác trước khi duyệt.
* **Live Chat & Bot AI CSKH**: Chat thời gian thực với quản trị viên qua Pusher hoặc Bot AI tự động tư vấn 24/7 dựa trên thông tin sản phẩm và đơn hàng của khách.
* **Zalo Bot & Email Marketing**: Tự động gửi thông báo qua Zalo và gửi email hàng loạt (Bulk Email).
* **Quản trị Toàn diện (Admin APIs)**: Báo cáo doanh thu, quản lý người dùng, điều chỉnh số dư ví, banner, SEO, blog, nhật ký hoạt động.

---

## 🛠 Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu Hệ thống
* Node.js 18.x trở lên
* MySQL 8.0 & MongoDB 7.0 (chạy cục bộ hoặc qua Docker)

### 2. Cài đặt Gói Phụ thuộc
```bash
cd backend
npm install
```

### 3. Cấu hình Biến Môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
*Điền đầy đủ thông tin kết nối DB (MySQL, MongoDB) và các API Keys.*

### 4. Khởi chạy Server
```bash
# Chế độ phát triển (Tự động reload với nodemon)
npm run dev

# Chế độ Production
npm start
```

Mặc định, API Server sẽ lắng nghe tại: `http://localhost:5000/api`

---

Developed for **NexGear Backend**.
