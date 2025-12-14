# Hướng dẫn cài đặt Database (Supabase)

Để ứng dụng có thể đồng bộ dữ liệu giữa các tài khoản khi deploy, chúng ta sẽ sử dụng **Supabase** (Database đám mây miễn phí và mạnh mẽ).

## Bước 1: Tạo dự án Supabase
1. Truy cập [https://supabase.com/](https://supabase.com/) và đăng nhập/đăng ký.
2. Tạo một **New Project**.
3. Đặt tên (ví dụ: `TechnicalManager`) và mật khẩu database.

## Bước 2: Tạo Bảng (Database)
1. Trong dashboard dự án Supabase, đi tới mục **SQL Editor** (icon dấu ngoặc nhọn bên trái).
2. Tạo một trang query mới (New Query).
3. Mở file `src/db/schema.sql` trong dự án này, copy toàn bộ nội dung và paste vào SQL Editor của Supabase.
4. Nhấn **RUN** để tạo toàn bộ các bảng.

## Bước 3: Lấy khóa API (API Keys)
1. Đi tới **Project Settings** (icon bánh răng) -> **API**.
2. Copy `Project URL`.
3. Copy `anon` `public` key.

## Bước 4: Cấu hình ứng dụng
1. Tại thư mục gốc của dự án, tạo file `.env` (copy từ `.env.example`).
2. Điền thông tin đã copy vào:
   ```env
   VITE_SUPABASE_URL=https://xyz.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxh...
   ```

## Lưu ý khi Deploy
Khi deploy lên Vercel/Netlify/GitHub Pages, bạn cũng cần vào phần **Environment Variables** của nền tảng đó và thêm 2 biến `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` tương tự như file `.env`.
