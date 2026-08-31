# NexGear - Modern E-Commerce Platform

NexGear là nền tảng thương mại điện tử hiện đại chuyên về Laptop & Thiết bị Công nghệ, được xây dựng với mục tiêu mang lại trải nghiệm mua sắm mượt mà, tốc độ cao và giao diện người dùng (UI) tinh tế. Dự án sử dụng các công nghệ mới nhất để đảm bảo hiệu suất tối ưu và khả năng mở rộng dễ dàng.

## 🚀 Công nghệ sử dụng

### Frontend Core

- **Next.js 16 (App Router)**: Framework React mạnh mẽ nhất hiện nay với Server Components và Streaming.
- **React 19**: Phiên bản mới nhất của React với nhiều cải tiến về hiệu suất.
- **TypeScript**: Đảm bảo tính an toàn của mã nguồn và hỗ trợ phát triển nhanh chóng.

### Giao diện & Trải nghiệm (UI/UX)

- **Tailwind CSS v4**: Utility-first CSS framework cho việc thiết kế giao diện linh hoạt và hiện đại.
- **Lucide React**: Bộ icon vector sắc nét và đa dạng.
- **Next-themes**: Hỗ trợ chuyển đổi chế độ Sáng/Tối (Light/Dark mode) mượt mà.
- **React Hot Toast**: Hệ thống thông báo đẹp mắt và trực quan.
- **Google Fonts**: Sử dụng font _Inter_ và _Be Vietnam Pro_ tối ưu cho tiếng Việt.

### Tính năng nâng cao

- **Pusher JS**: Xử lý dữ liệu thời gian thực (Real-time) cho Chat và Thông báo.
- **Tiptap Editor**: Trình soạn thảo văn bản phong phú (Rich Text Editor) cho hệ thống Blog và quản trị nội dung.
- **Cloudflare Turnstile**: Giải pháp bảo mật chống bot hiện đại và thân thiện với người dùng.
- **SEO & Marketing**: Tích hợp Metadata động, JSON-LD (Schema.org), Sitemap và Robots.ts tự động.

## ✨ Tính năng chính

### Người dùng (Customer)

- **Hệ thống Mua sắm**: Tìm kiếm, lọc sản phẩm laptop/linh kiện, giỏ hàng và danh sách yêu thích (Wishlist).
- **Xác thực đa nền tảng**: Hỗ trợ Đăng nhập bằng Google, Facebook và Zalo.
- **Tài khoản cá nhân**: Quản lý thông tin profile, lịch sử đơn hàng và thông báo.
- **Giao tiếp**: Chat trực tuyến thời gian thực với quản trị viên.

### Quản trị (Admin Dashboard - `/tp-admin`)

- **Quản lý Sản phẩm & Danh mục**: Thêm, sửa, xóa sản phẩm với trình soạn thảo Tiptap.
- **Quản lý Đơn hàng & Giao dịch**: Theo dõi trạng thái đơn hàng và luồng tiền.
- **Quản trị Người dùng**: Quản lý danh sách thành viên và phân quyền.
- **Hệ thống Blog**: Đăng tải và quản lý bài viết tin tức.
- **Cấu hình Hệ thống**: Cài đặt SEO, Banner, API Variables, và thông tin website.

## 🛠 Hướng dẫn cài đặt

Để chạy phần Frontend của NexGear ở môi trường local:

### 1. Yêu cầu hệ thống

- Node.js 18.x trở lên
- npm hoặc yarn

### 2. Cài đặt Dependencies

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt các gói phụ thuộc
npm install
```

### 3. Cấu hình biến môi trường

Tạo file `.env` từ file mẫu `.env.example` và điền các thông tin cần thiết:

```bash
cp .env.example .env
```

### 4. Chạy dự án

```bash
# Chạy ở chế độ phát triển (Development)
npm run dev

# Xây dựng bản production
npm run build

# Chạy bản production
npm start
```

Mặc định, ứng dụng sẽ chạy tại địa chỉ: [http://localhost:3000](http://localhost:3000)

---

Developed by **Nguyen Quang Tuu**.
