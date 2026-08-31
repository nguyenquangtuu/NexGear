# NexGear Backend API

Đây là hệ thống Backend API cho nền tảng thương mại điện tử **NexGear** (chuyên bán Laptop, Phụ kiện & Thiết bị công nghệ). Server được xây dựng trên nền tảng Node.js và Express, cung cấp các dịch vụ quản lý dữ liệu, xác thực, thanh toán và các tính năng thời gian thực.

## 🚀 Công nghệ sử dụng

### Core Stack
- **Node.js & Express**: Môi trường thực thi và Framework chính.
- **MySQL (mysql2)**: Cơ sở dữ liệu quan hệ chính để quản lý Người dùng, Sản phẩm, Đơn hàng.
- **MongoDB (Mongoose)**: Cơ sở dữ liệu NoSQL hỗ trợ lưu trữ dữ liệu linh hoạt.
- **Passport.js**: Hệ thống xác thực mạnh mẽ hỗ trợ Google, Facebook, Zalo.

### Dịch vụ tích hợp (Integrations)
- **PayOS & Sepay**: Cổng thanh toán trực tuyến và đối soát ngân hàng tự động.
- **Pusher**: Hệ thống truyền tải dữ liệu thời gian thực cho Chat và Thông báo.
- **Nodemailer**: Dịch vụ gửi Email (OTP, Hóa đơn, Thông báo).
- **OpenRouter**: Tích hợp AI hỗ trợ các tính năng thông minh.
- **Zalo SDK**: Tương tác với hệ sinh thái Zalo và Zalo Bot.

### Bảo mật (Security)
- **Helmet**: Thiết lập các HTTP headers bảo mật.
- **CORS**: Quản lý truy cập từ các domain được phép.
- **Express Rate Limit**: Chống tấn công Brute-force và Spam.
- **Bcryptjs**: Mã hóa mật khẩu người dùng.
- **Cloudflare Turnstile**: Xác thực người dùng phía Server.

## ✨ Các tính năng chính

- **Quản lý Sản phẩm**: API CRUD cho Laptop, linh kiện, thuộc tính và tồn kho.
- **Hệ thống Đơn hàng**: Xử lý quy trình đặt hàng, tính toán giá, áp dụng coupon và thanh toán.
- **Xác thực & Phân quyền**: Đăng ký, đăng nhập (Local & Social), quản lý session và phân quyền Admin/User.
- **Thanh toán tự động**: Tích hợp PayOS cho chuyển khoản ngân hàng và đối soát qua Sepay.
- **Real-time Chat**: Hệ thống chat giữa người dùng và admin thông qua Pusher.
- **Zalo Bot**: Tự động hóa các thông báo và tương tác qua Zalo.
- **Hệ thống Email/OTP**: Gửi mã xác thực và thông báo giao dịch tự động.

## 🛠 Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống
- Node.js 18.x trở lên
- MySQL & MongoDB

### 2. Cài đặt
```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt các gói phụ thuộc
npm install
```

### 3. Cấu hình
Tạo file `.env` từ file mẫu `.env.example` và điền đầy đủ các thông số kết nối Database và API Keys:
```bash
cp .env.example .env
```

### 4. Chạy Server
```bash
# Chạy ở chế độ phát triển (với nodemon)
npm run dev

# Chạy ở chế độ production
npm start
```

Mặc định, API sẽ chạy tại địa chỉ: [http://localhost:5000](http://localhost:5000)

---
Developed by **NexGear Team**.
