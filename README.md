# DEZ EVENT - Hệ thống Đấu thầu Dự án Media Sự kiện

## Hướng dẫn cài đặt & chạy dự án

1. Giải nén file zip và cài đặt thư viện:
   ```bash
   npm install
   ```
2. Đổi tên file `.env.local.example` thành `.env.local` và điền đầy đủ thông tin Supabase + Google Drive API.
3. Mở **SQL Editor** trên Supabase và chạy toàn bộ nội dung trong file `supabase/schema.sql`.
4. Chạy môi trường local:
   ```bash
   npm run dev
   ```
5. Đăng ký tài khoản đầu tiên -> vào Supabase Table Editor -> bảng `profiles` -> đổi `role` từ `vendor` sang `admin` để truy cập `/admin`.
