# ⚡ NexGear - Laptop & Tech Gear E-Commerce Platform

> Nền tảng Thương mại Điện tử chuyên nghiệp cho Laptop, Phụ kiện & Thiết bị Công nghệ được xây dựng trên kiến trúc Monorepo tiêu chuẩn hiện đại.

---

## 🏗 Kiến trúc Dự án (Monorepo Architecture)

Dự án được cấu trúc theo mô hình **Monorepo** phân chia rõ ràng giữa **Frontend** và **Backend**, giúp quản lý mã nguồn tập trung, đồng bộ và dễ dàng mở rộng.

```text
NexGear/
├── backend/                       # RESTful API Server (Node.js & Express)
│   ├── public/                    # Static files & user uploads
│   ├── src/
│   │   ├── config/                # Cấu hình Passport, Session, DB, PayOS, Pusher...
│   │   ├── controllers/           # Controllers điều khiển nghiệp vụ API
│   │   ├── db/                    # Kết nối MySQL (mysql2) & MongoDB (Mongoose)
│   │   ├── middlewares/           # Middleware xác thực (Auth), Rate Limit, Upload, CSRF...
│   │   ├── models/                # Schemas MongoDB & Models MySQL
│   │   ├── routes/                # Khai báo các Route API (/api/...)
│   │   ├── services/              # Dịch vụ tích hợp: Email, OTP, PayOS, Sepay, Pusher, AI...
│   │   ├── utils/                 # Utilities & Helper functions
│   │   ├── app.js                 # Cấu hình Express App & Middleware chain
│   │   └── server.js              # Khởi chạy HTTP Server (Cổng 5000)
│   ├── .env.example               # Mẫu cấu hình biến môi trường Backend
│   ├── package.json               # Backend dependencies
│   └── README.md                  # Tài liệu chi tiết Backend
│
├── frontend/                      # Web Client (Next.js 16 App Router & React 19)
│   ├── public/                    # Tài nguyên tĩnh (Favicon, Logo, Media...)
│   ├── src/
│   │   ├── app/                   # App Router: Layouts, Pages, Server Components, API Rewrites
│   │   │   ├── (admin)/tp-admin   # Dashboard Quản trị viên
│   │   │   ├── (main)             # Giao diện người dùng (Trang chủ, Sản phẩm, Giỏ hàng...)
│   │   │   ├── login & register   # Trang xác thực người dùng
│   │   │   └── sitemap.ts         # SEO Sitemap tự động
│   │   ├── components/            # UI Components tái sử dụng
│   │   ├── contexts/              # React Context Providers (Auth, Cart, Realtime, Theme...)
│   │   └── lib/                   # API Client (apiFetch), Pusher Realtime, SEO, Constants...
│   ├── .env.example               # Mẫu cấu hình biến môi trường Frontend
│   ├── next.config.ts             # Cấu hình Next.js & Proxy API Rewrites
│   ├── tsconfig.json              # Cấu hình TypeScript
│   ├── postcss.config.mjs         # Cấu hình PostCSS
│   ├── eslint.config.mjs          # Cấu hình ESLint
│   ├── package.json               # Frontend dependencies
│   └── README.md                  # Tài liệu chi tiết Frontend
│
├── docker-compose.yml             # Khởi chạy nhanh MySQL 8.0 & MongoDB 7.0 cục bộ
├── package.json                   # Root package.json điều phối chạy đồng thời (Concurrently)
├── .gitignore                     # Gitignore chuẩn hóa toàn dự án
└── README.md                      # Tài liệu tổng quan hệ thống NexGear
```

---

## 🚀 Công nghệ Sử dụng (Tech Stack)

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components & Streaming)
- **UI Library**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Realtime**: [Pusher JS](https://pusher.com/)
- **Editor**: [Tiptap Rich Text Editor](https://tiptap.dev/)
- **Security**: Cloudflare Turnstile CAPTCHA

### Backend
- **Core Engine**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Relational DB**: MySQL (qua `mysql2`)
- **Document DB**: MongoDB (qua `mongoose`)
- **Authentication**: Passport.js (Local, Google, Facebook, Zalo OAuth) & Express Session
- **Payments**: PayOS & Sepay Webhook
- **Realtime & Communications**: Pusher & Nodemailer (SMTP OTP)
- **Security**: Helmet, CORS, Express Rate Limit, CSRF Token

---

## 🛠 Hướng dẫn Cài đặt & Khởi chạy (Getting Started)

### 1. Yêu cầu Tiên quyết
- **Node.js**: Phiên bản 18.x trở lên
- **npm** (đi kèm Node.js) hoặc **yarn** / **pnpm**
- **Docker** & **Docker Compose** (Tùy chọn nếu muốn chạy DB qua Docker)

---

### 2. Cài đặt Dependencies

Chạy lệnh sau tại thư mục gốc của dự án để cài đặt các gói phụ thuộc cho cả Root, Frontend và Backend:

```bash
# Cài đặt tất cả phụ thuộc
npm run install:all
```

---

### 3. Cấu hình Biến Môi trường (.env)

#### Backend:
Tạo file `backend/.env` từ file mẫu:
```bash
cp backend/.env.example backend/.env
```
Điền các thông tin kết nối MySQL, MongoDB và API Keys của bạn.

#### Frontend:
Tạo file `frontend/.env` từ file mẫu:
```bash
cp frontend/.env.example frontend/.env
```

---

### 4. Khởi chạy Cơ sở Dữ liệu (MySQL & MongoDB)

Nếu đã cài Docker, bạn có thể khởi động ngay hệ quản trị cơ sở dữ liệu:
```bash
docker compose up -d
```

---

### 5. Khởi chạy Ứng dụng

Bạn có thể khởi chạy đồng thời cả Frontend và Backend chỉ bằng một lệnh duy nhất từ thư mục gốc:

```bash
# Chạy đồng thời cả Frontend (3000) và Backend (5000)
npm run dev
```

Hoặc chạy độc lập từng phần:
```bash
# Chạy riêng Backend (Port 5000)
npm run dev:backend

# Chạy riêng Frontend (Port 3000)
npm run dev:frontend
```

---

## 🌐 Danh sách Cổng & Đường dẫn Mặc định

| Ứng dụng | Địa chỉ URL / Cổng | Ghi chú |
| :--- | :--- | :--- |
| **NexGear Storefront (Frontend)** | [http://localhost:3000](http://localhost:3000) | Giao diện mua sắm khách hàng |
| **Admin Dashboard** | [http://localhost:3000/tp-admin](http://localhost:3000/tp-admin) | Giao diện Quản trị hệ thống |
| **Backend API** | [http://localhost:5000/api](http://localhost:5000/api) | Điểm kết nối RESTful API |
| **MySQL Server** | `localhost:3306` | User: `nexgear_user` / DB: `nexgear_db` |
| **MongoDB Server** | `mongodb://localhost:27017` | DB: `nexgear_db` |

---

## 📜 Danh sách Lệnh hữu ích (Scripts)

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy song song cả Backend và Frontend |
| `npm run dev:backend` | Chạy Backend với nodemon tự động reload |
| `npm run dev:frontend` | Chạy Frontend Next.js ở chế độ phát triển |
| `npm run build` | Xây dựng bản build tối ưu cho Frontend |
| `npm run start:backend` | Chạy Backend ở chế độ Production |
| `npm run start:frontend` | Chạy Frontend ở chế độ Production |
| `npm run lint:frontend` | Kiểm tra lỗi cú pháp ESLint cho Frontend |
| `npm run install:all` | Cài đặt toàn bộ node_modules cho cả FE & BE |

---

Developed for **NexGear Project**.
