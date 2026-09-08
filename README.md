# ⚡ NexGear - Nền tảng Thương mại Điện tử Laptop & Thiết bị Công nghệ

> **NexGear** là giải pháp sàn Thương mại Điện tử (E-Commerce) chuyên sâu cho Laptop, Phụ kiện & Thiết bị Công nghệ cao cấp. Dự án được xây dựng theo kiến trúc **Monorepo** hiện đại, kết hợp sức mạnh giữa **Next.js 16 (App Router)** và **Node.js / Express RESTful API**, tích hợp cơ chế đa cơ sở dữ liệu **MySQL & MongoDB**, thanh toán tự động, AI kiểm duyệt & tư vấn, cùng hệ thống Realtime thời gian thực.

---

## 🌟 Tính năng Nổi bật của Hệ thống

### 🛒 1. Trải nghiệm Khách hàng (Storefront)
* **Khám phá & Trang chủ thông minh**:
  * Dynamic Hero Banner tùy biến cao, hỗ trợ slide tự động và hiệu ứng overlay.
  * Khung giờ vàng Flash Sale (**Golden Hour Sale**) với đồng hồ đếm ngược trực quan.
  * Đề xuất sản phẩm cá nhân hóa: Sản phẩm mới về, sản phẩm nổi bật, sản phẩm vừa xem (**Recently Viewed**).
* **Tìm kiếm & Bộ lọc chuyên sâu**:
  * Tìm kiếm nhanh theo từ khóa, lọc theo danh mục đa cấp, khoảng giá, thương hiệu.
  * Sắp xếp linh hoạt: Mới nhất, Giá tăng/giảm, Đánh giá cao, Bán chạy nhất.
* **Chi tiết Sản phẩm & Biến thể phong phú**:
  * Thư viện ảnh sản phẩm độ nét cao, thông số kỹ thuật chi tiết, mô tả Rich Text.
  * Quản lý biến thể linh hoạt (Cấu hình CPU, RAM, SSD, Màu sắc, Gói bảo hành, Thời hạn dịch vụ).
  * Hỗ trợ form nhập liệu tùy biến theo từng biến thể (Required Inputs).
* **Đánh giá & AI Kiểm duyệt nội dung**:
  * Hệ thống chấm điểm 1 - 5 sao và bình luận sản phẩm thực tế từ người đã mua hàng.
  * **Tích hợp AI (Google Gemini qua OpenRouter)** tự động rà soát, kiểm duyệt ngôn từ thô tục, chống spam và nội dung độc hại trước khi hiển thị.
* **Giỏ hàng & Đặt hàng tối ưu (Checkout Flow)**:
  * Giỏ hàng realtime, chọn phương thức nhận hàng: **Giao tận nơi (Delivery)** hoặc **Nhận tại cửa hàng (Pickup)**.
  * Áp dụng mã giảm giá (**Coupon**): Giảm theo % hoặc số tiền cố định, kiểm tra điều kiện đơn hàng tối thiểu và giới hạn sử dụng.
* **Cổng Thanh toán đa dạng & Tự động**:
  * **Ví số dư NexGear (Wallet Balance)**: Thanh toán trừ tiền trực tiếp tức thì.
  * **Cổng thanh toán PayOS**: Tự động sinh mã VietQR chuẩn NAPAS 24/7.
  * **Đối soát tự động Sepay Webhook**: Xác nhận giao dịch chuyển khoản ngân hàng ngay lập tức không cần can thiệp thủ công.
  * Hỗ trợ chuyển khoản ngân hàng trực tiếp theo thông tin tài khoản hiển thị trên hệ thống.
  * Cơ chế tự động hủy đơn khi quá hạn thanh toán (**Order Timeout Service**).
* **Trung tâm Tài khoản Người dùng (Customer Portal)**:
  * Quản lý hồ sơ cá nhân, đổi mật khẩu, quản lý địa chỉ nhận hàng mặc định.
  * Nạp tiền vào ví số dư tự động qua cổng QR Code.
  * Quản lý lịch sử đơn hàng, tra cứu chi tiết và theo dõi trạng thái giao vận theo thời gian thực.
  * Quản lý dịch vụ & Bảo hành (**User Services**): Theo dõi ngày bắt đầu/hết hạn bảo hành, kích hoạt gia hạn dịch vụ chỉ với 1 cú click.
  * Danh sách sản phẩm yêu thích (**Wishlist**).
  * Nhận thông báo Realtime tức thì (In-app qua Pusher) và qua kênh **Zalo Bot cá nhân**.
* **Hỗ trợ Trực tuyến 24/7 (Live Chat & AI Bot)**:
  * Kênh Live Chat trực tiếp với chuyên viên tư vấn (Admin) qua Pusher Realtime.
  * **Trợ lý ảo AI CSKH (Google Gemini)**: Tự động hỗ trợ 24/7, tư vấn sản phẩm, giải đáp kỹ thuật và tra cứu thông tin đơn hàng dựa trên dữ liệu mua sắm thực tế của khách hàng.
* **Tin tức & Cẩm nang Công nghệ (Blog)**:
  * Đọc bài viết hướng dẫn, đánh giá công nghệ, tin tức khuyến mãi.
  * Hệ thống trang chính sách hoàn chỉnh: Đổi trả, Bảo hành, Giao hàng, Điều khoản dịch vụ, Hướng dẫn mua hàng, FAQ.

---

### ⚙️ 2. Hệ thống Quản trị Toàn diện (Admin Dashboard - `/tp-admin`)
* **Báo cáo & Thống kê (Analytics Dashboard)**:
  * Bảng điều khiển thời gian thực về Doanh thu, Tổng số đơn hàng, Khách hàng mới, Sản phẩm bán chạy.
  * Biểu đồ trực quan theo dõi tăng trưởng kinh doanh theo ngày, tuần, tháng.
* **Quản lý Sản phẩm & Danh mục (Catalog Management)**:
  * Quản lý danh mục đa cấp (Danh mục cha/con, Icon, Thumbnail, Thứ tự hiển thị).
  * Thêm/Sửa/Xóa sản phẩm với trình soạn thảo **Tiptap Rich Text**, upload đa hình ảnh.
  * Cấu hình SEO riêng biệt cho từng sản phẩm (Meta Title, Description, Keywords, OpenGraph, Schema SKU/GTIN/MPN).
  * Quản lý biến thể: Giá niêm yết, giá vốn, tồn kho, kho tài khoản/mã số tự động (**Warehouse Items**).
  * **Tự động kiểm tra giá vốn (Price Check Service)** từ nhà cung cấp & tự động điều chỉnh giá bán theo biên lợi nhuận (Keep Margin, Amount, Percent).
  * Tích hợp API tự động với đối tác thứ ba (**Product Variant API Config**).
* **Quản lý Đơn hàng & Giao dịch (Orders & Transactions)**:
  * Kiểm soát toàn diện vòng đời đơn hàng: *Chờ thanh toán ➔ Đang xử lý ➔ Đang giao ➔ Hoàn tất ➔ Hủy / Hoàn tiền*.
  * Cập nhật thông tin giao vận, mã vận đơn, ghi chú nội bộ.
  * Theo dõi biến động số dư và lịch sử toàn bộ dòng tiền, giao dịch nạp tiền trên sàn.
* **Quản trị Người dùng & Phân quyền (User Management)**:
  * Quản lý danh sách thành viên, xem chi tiết lịch sử mua sắm và số dư ví.
  * Tính năng điều chỉnh số dư khách hàng (Cộng/Trừ tiền kèm lý do và ghi nhận log).
  * Khóa / Mở khóa tài khoản người dùng vi phạm.
  * Phân quyền Quản trị viên (ADMIN) và Khách hàng (USER).
* **Marketing, Khuyến mãi & Truyền thông**:
  * **Quản lý Mã giảm giá (Coupons)**: Thiết lập mã, loại giảm (%, Cố định), mức giảm tối đa, ngày bắt đầu/kết thúc, giới hạn lượt dùng.
  * **Quản lý Banner Trang chủ (Home Banners)**: Tùy biến slide, banner quảng cáo, căn chỉnh chữ, preset màu sắc.
  * **Quản lý Blog & Tin tức**: Soạn thảo và xuất bản bài viết chuẩn SEO, tùy chọn chế độ hiển thị (Công khai, Ẩn, Chỉ liên kết).
  * **Gửi Email Hàng loạt (Bulk Email Marketing)**: Gửi thông báo khuyến mãi, tin tức đến toàn bộ hoặc nhóm khách hàng bằng mẫu HTML chuyên nghiệp.
* **Quản lý Chăm sóc Khách hàng & Cấu hình AI**:
  * Giao diện điều phối Live Chat đa phiên hội thoại với khách hàng theo thời gian thực.
  * **Cấu hình Trợ lý AI CSKH**: Bật/Tắt chế độ tự động trả lời, tùy chỉnh System Prompt và nạp tài liệu hướng dẫn (Training Instructions) riêng biệt.
* **Kênh Thông báo Zalo Bot**:
  * Tích hợp Zalo Bot Webhook, gửi cảnh báo tự động về Zalo của Admin ngay khi có đơn hàng mới hoặc có yêu cầu nạp tiền.
* **Cài đặt Hệ thống & Tối ưu SEO (Site Settings)**:
  * Quản lý thông tin website: Logo, Favicon, Tên thương hiệu, Hotline, Email, Mạng xã hội.
  * Cấu hình danh sách Tài khoản Ngân hàng nhận thanh toán (QR VietQR tự động).
  * Quản lý Biến môi trường API động (**API Variables** lưu trữ trên MongoDB).
  * Quản lý SEO Onpage toàn trang (Tự động tạo `sitemap.ts` và `robots.ts` chuẩn Google).
  * Xem nhật ký hoạt động hệ thống (**Activity & Security Logs**).

---

### 🛡️ 3. Bảo mật & Hạ tầng Kỹ thuật
* **Xác thực Đa phương thức**:
  * Đăng ký, đăng nhập tài khoản chuẩn mật khẩu mã hóa Bcrypt.
  * Đăng nhập mạng xã hội thông qua OAuth 2.0 (**Google, Facebook, Zalo, GitHub**).
  * Xác thực 2 bước (**2FA / Email OTP**) khi đăng nhập và thực hiện thao tác nhạy cảm.
  * Quên mật khẩu & Đặt lại mật khẩu an toàn với token OTP có thời hạn qua Email.
* **Bảo vệ Hệ thống**:
  * Chống tấn công Brute-force đăng nhập (**Login Throttle Service**) tự động khóa IP/tài khoản khi sai nhiều lần.
  * Giới hạn tần suất gọi API (**Express Rate Limit**) theo từng nhóm endpoint.
  * Tích hợp **Cloudflare Turnstile CAPTCHA** chống bot tự động ở form đăng ký/đăng nhập.
  * Bảo mật HTTP Headers với **Helmet**, bảo vệ Cookie Session chống tấn công XSS/CSRF.
* **Kiến trúc Dữ liệu Lai (Hybrid Database)**:
  * **MySQL**: Đảm bảo toàn vẹn dữ liệu quan hệ ACID cho Tài chính, Đơn hàng, Sản phẩm, Người dùng, Mã giảm giá.
  * **MongoDB**: Lưu trữ linh hoạt, hiệu năng cao cho Nhật ký hoạt động (Logs), Thông báo (Notifications), Tin nhắn Chat, Biến cấu hình API động.

---

## 🚀 Công nghệ Sử dụng (Tech Stack)

| Lớp (Layer) | Công nghệ / Thư viện | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Server Components, Streaming SSR, Tối ưu SEO & Performance |
| **Frontend UI** | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) | Xây dựng giao diện người dùng type-safe |
| **CSS Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Thiết kế giao diện hiện đại, responsive mượt mà |
| **Icons & UI Extras** | Lucide React, React Hot Toast, Next-themes | Bộ icon sắc nét, thông báo toast, chế độ Dark/Light Mode |
| **Rich Text Editor** | Tiptap Editor | Trình soạn thảo văn bản phong phú cho Quản trị Sản phẩm & Blog |
| **Backend Core** | [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) | Xây dựng RESTful API Server hiệu năng cao |
| **Relational DB** | MySQL 8.0 (qua `mysql2`) | Lưu trữ dữ liệu quan hệ (Người dùng, Sản phẩm, Đơn hàng, Ví tiền) |
| **NoSQL DB** | MongoDB 7.0 (qua `mongoose`) | Lưu trữ Logs, Lịch sử Chat, Thông báo, Dynamic API Configs |
| **Authentication** | Passport.js & Express-Session | Quản lý phiên đăng nhập, Local & Social OAuth (Google, FB, Zalo) |
| **Payment Gateways** | PayOS & Sepay Webhook | Tự động tạo mã VietQR và đối soát giao dịch ngân hàng tức thì |
| **Realtime Engine** | [Pusher](https://pusher.com/) (`pusher` & `pusher-js`) | Truyền tải dữ liệu thời gian thực cho Live Chat và Thông báo |
| **AI Integration** | OpenRouter (Google Gemini 2.0 Flash) | Kiểm duyệt đánh giá tự động & Bot AI tư vấn CSKH 24/7 |
| **Email Service** | Nodemailer (SMTP) | Gửi mã OTP xác thực, hóa đơn đơn hàng và email marketing |
| **Anti-Bot Security** | Cloudflare Turnstile | Xác thực CAPTCHA bảo vệ chống spam và tự động hóa độc hại |
| **DevOps & Container** | Docker & Docker Compose | Đóng gói và chạy cơ sở dữ liệu MySQL & MongoDB nhanh chóng |

---

## 🏗 Cấu trúc Thư mục Monorepo

```text
NexGear/
├── backend/                       # RESTful API Server (Node.js & Express)
│   ├── src/
│   │   ├── config/                # Cấu hình Passport, Session, MySQL, Mongo, PayOS, Pusher...
│   │   ├── controllers/           # Điều khiển nghiệp vụ API (Auth, Orders, Products, Chat, Admin...)
│   │   ├── db/                    # Khởi tạo Schema MySQL & Kết nối MongoDB
│   │   ├── middlewares/           # Middleware Auth, Rate Limit, Upload, Turnstile Captcha...
│   │   ├── models/                # MongoDB Mongoose Models
│   │   ├── routes/                # Khai báo các Routes API (/api/...)
│   │   ├── services/              # Dịch vụ tích hợp: AI, Email OTP, PayOS, Sepay, Zalo Bot, Pusher...
│   │   └── server.js              # Điểm khởi chạy Backend Server (Port 5000)
│   ├── .env.example               # Mẫu cấu hình môi trường Backend
│   └── package.json               # Dependencies của Backend
│
├── frontend/                      # Web Client (Next.js 16 App Router & React 19)
│   ├── src/
│   │   ├── app/                   # App Router: Layouts, Pages, Server Components, Route Handlers
│   │   │   ├── (admin)/tp-admin   # Dashboard Quản trị viên
│   │   │   ├── (main)             # Giao diện người dùng (Trang chủ, Sản phẩm, Giỏ hàng, Hồ sơ, Blog...)
│   │   │   ├── login & register   # Trang xác thực người dùng
│   │   │   ├── robots.ts          # Cấu hình Robots.txt tự động
│   │   │   └── sitemap.ts         # Sinh Sitemap SEO tự động
│   │   ├── components/            # UI Components tái sử dụng (Navbar, Footer, ProductCard, Hero...)
│   │   ├── contexts/              # React Contexts (AuthContext, CartContext, RealtimeContext...)
│   │   └── lib/                   # API Client (apiFetch), Pusher Realtime, SEO Utilities...
│   ├── .env.example               # Mẫu cấu hình môi trường Frontend
│   └── package.json               # Dependencies của Frontend
│
├── docker-compose.yml             # Khởi chạy nhanh MySQL 8.0 & MongoDB 7.0 bằng Docker
├── package.json                   # Root package điều phối chạy đồng thời (Concurrently)
└── README.md                      # Tài liệu tổng quan hệ thống NexGear
```

---

## 🛠 Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu Tiên quyết
* **Node.js**: Phiên bản 18.x trở lên
* **npm** (đi kèm Node.js) hoặc **yarn** / **pnpm**
* **MySQL 8.0** & **MongoDB 7.0** (Cài trực tiếp trên máy hoặc chạy qua Docker)

---

### 2. Cài đặt Gói Phụ thuộc (Dependencies)
Chạy lệnh sau tại thư mục gốc của dự án để tự động cài đặt gói cho cả Root, Backend và Frontend:

```bash
npm run install:all
```

---

### 3. Cấu hình Biến Môi trường (.env)

#### Cấu hình Backend:
Tạo file `backend/.env` từ file mẫu:
```bash
cp backend/.env.example backend/.env
```
*Điền thông tin kết nối MySQL, MongoDB và các API Keys (PayOS, Pusher, OpenRouter, SMTP Email, v.v.).*

#### Cấu hình Frontend:
Tạo file `frontend/.env` từ file mẫu:
```bash
cp frontend/.env.example frontend/.env
```

---

### 4. Khởi chạy Cơ sở Dữ liệu (MySQL & MongoDB)
Nếu sử dụng **Docker Compose**, bạn có thể khởi động ngay hệ quản trị cơ sở dữ liệu chỉ bằng một lệnh:

```bash
docker compose up -d
```

---

### 5. Khởi chạy Ứng dụng
Khởi chạy đồng thời cả **Frontend (Port 3000)** và **Backend (Port 5000)** bằng một lệnh duy nhất từ thư mục gốc:

```bash
npm run dev
```

*Hoặc khởi chạy độc lập từng phần:*
```bash
# Chạy riêng Backend (Port 5000 với Nodemon)
npm run dev:backend

# Chạy riêng Frontend (Port 3000 với Next.js Dev Server)
npm run dev:frontend
```

---

## 🌐 Danh sách Cổng & Đường dẫn Dịch vụ

| Ứng dụng / Dịch vụ | Địa chỉ URL / Cổng | Ghi chú |
| :--- | :--- | :--- |
| **NexGear Storefront (Frontend)** | [http://localhost:3000](http://localhost:3000) | Giao diện mua sắm khách hàng |
| **Admin Dashboard** | [http://localhost:3000/tp-admin](http://localhost:3000/tp-admin) | Giao diện Quản trị hệ thống |
| **Backend RESTful API** | [http://localhost:5000/api](http://localhost:5000/api) | Điểm kết nối API chính |
| **MySQL Server** | `localhost:3306` | DB: `nexgear_db` / User: `nexgear_user` |
| **MongoDB Server** | `mongodb://localhost:27017` | DB: `nexgear_db` |

---

## 📜 Danh sách Lệnh hữu ích (Scripts)

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Khởi chạy song song cả Backend và Frontend |
| `npm run dev:backend` | Khởi chạy Backend với `nodemon` tự động reload khi sửa mã nguồn |
| `npm run dev:frontend` | Khởi chạy Frontend Next.js ở chế độ phát triển |
| `npm run build` | Xây dựng bản build tối ưu cho Frontend (Production Build) |
| `npm run start:backend` | Khởi chạy Backend ở chế độ Production |
| `npm run start:frontend` | Khởi chạy Frontend ở chế độ Production |
| `npm run lint:frontend` | Kiểm tra lỗi cú pháp ESLint cho Frontend |
| `npm run install:all` | Cài đặt toàn bộ `node_modules` cho cả Root, Backend & Frontend |

---

Developed for **NexGear E-Commerce Platform**.

---

## 👨‍💻 Thông tin Sinh viên Thực hiện
* **Họ và tên**: Quốc Trung
* **Email**: doquoctrung2k@gmail.com
* **Môn học**: Mẫu thiết kế (Design Patterns)
* **Thời gian cập nhật**: 08/09/2026
