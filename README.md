# 🏸 Lớp Học Cầu Lông Q4 & Q7 - Website & CMS System

Hệ thống Landing Page chuyển đổi cao (CRO), Cẩm nang Blog chuẩn Technical SEO BWF và Hệ thống Quản trị CMS Upload Thành tích học viên cho thương hiệu **Lớp Học Cầu Lông Quận 4 & Quận 7** ([lophoccaulong.com](https://lophoccaulong.com)).

---

## 🌟 Tính Năng Nổi Bật

1. **Landing Page Chuyển Đổi Cao (CRO):**
   - Thiết kế thể thao hiện đại, tối ưu Mobile-First cho màn hình dọc (Portrait Mobile).
   - Tích hợp 2 địa chỉ sân tập thực tế:
     - **Sân T12 Quận 4:** 1B Hoàng Diệu, Phường 13, Quận 4, TP.HCM
     - **Sân Dni Sport Quận 7:** 85 Nguyễn Văn Quỳ, Phường Phú Thuận, Quận 7, TP.HCM
   - Cập nhật 6 ca học linh hoạt (T2-T4, T3-T5, T2-T6, T3-T6, T3-T7, T7-CN sáng).
   - Bộ chọn ca học tự động điền form đăng ký học thử.
   - Nút kết nối nhanh: Zalo, Facebook Messenger, Hotline.

2. **Bảng Vàng Thành Tích Học Viên:**
   - Thay thế mục video bằng showcase thành tích học viên có huy chương, cúp vô địch tại các giải phong trào TP.HCM.
   - Cơ chế tự động đồng bộ hình ảnh mới từ Backend lên Landing page.

3. **Chuyên Trang Blog Cầu Lông Chuẩn Technical SEO (`blog.html` & `blog-detail.html`):**
   - Tìm kiếm bài viết trực tiếp (Live search).
   - Bộ lọc chuyên mục: Kỹ thuật cầu lông, Bộ pháp & Thể lực, Kinh nghiệm chọn vợt, Sân tập Q4 & Q7.
   - Dynamic Schema.org `BlogPosting` JSON-LD tự động sinh cho từng bài viết.
   - 4 bài viết SEO chuyên sâu có sẵn.

4. **Hệ Thống Quản Trị CMS Độc Quyền (`admin.html`):**
   - Xác thực đăng nhập bảo mật (`admin` / `caulong2026`).
   - Upload ảnh thành tích thực tế với tính năng xem trước (preview) ngay lập tức.
   - Soạn thảo và quản lý bài viết SEO với bộ đếm ký tự Meta Description (160 ký tự chuẩn Google).
   - Quản lý danh sách học viên đăng ký học thử (Leads): 1-click gọi điện hoặc mở Zalo chat nhanh.

5. **Backend REST API (`server.js`):**
   - Xây dựng bằng Node.js & Express.
   - Multer middleware xử lý upload ảnh an toàn vào thư mục `/uploads`.
   - Lưu trữ dữ liệu JSON tại `/data`.

---

## 🛠️ Cấu Trúc Thư Mục

```text
├── index.html             # Landing page chính
├── styles.css             # Custom animations, responsive, touch optimizations
├── script.js              # Logic frontend, interactive tabs, form handlers
├── blog.html              # Danh sách bài viết Blog SEO
├── blog-detail.html       # Chi tiết bài viết Blog SEO
├── blog.js                # Blog dynamic rendering & filtering
├── admin.html             # Giao diện CMS Quản trị
├── admin.js               # Logic CMS: Upload ảnh, CRUD bài viết, Leads
├── server.js              # Backend Node.js / Express REST API
├── sitemap.xml            # Sitemap chuẩn SEO Google
├── robots.txt             # File điều hướng bọ tìm kiếm Googlebot
├── package.json           # Cấu hình dự án & dependencies
├── data/                  # Cơ sở dữ liệu JSON
│   ├── achievements.json  # Dữ liệu bảng vàng thành tích
│   ├── posts.json         # Dữ liệu bài viết blog SEO
│   └── registrations.json # Danh sách học viên đăng ký
└── uploads/               # Thư mục lưu ảnh upload thực tế
    ├── achievements/      # Ảnh giải thưởng học viên
    └── blog/              # Ảnh bìa bài viết
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Yêu Cầu Môi Trường
- Node.js >= 18.x

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Khởi động máy chủ:
```bash
node server.js
```

### 3. Truy cập trình duyệt:
- **Trang chủ:** `http://localhost:3000`
- **Blog Cầu Lông:** `http://localhost:3000/blog.html`
- **Quản trị CMS:** `http://localhost:3000/admin.html`
  - *Tài khoản mặc định:* `admin`
  - *Mật khẩu mặc định:* `caulong2026`

---

## 🌐 Bản Quyền & Thương Hiệu
- **Tên thương hiệu:** Lớp Học Cầu Lông Quận 4 & Quận 7
- **Tên miền chính thức:** [https://lophoccaulong.com](https://lophoccaulong.com)
- **Fanpage:** [Lớp Học Cầu Lông Q4 Q7](https://www.facebook.com/profile.php?id=61565837504855)
- **TikTok:** [@lophoccaulongq4q7](https://www.tiktok.com/@lophoccaulongq4q7)
- **Instagram:** [@lophoccaulongq4q7](https://www.instagram.com/lophoccaulongq4q7/)

