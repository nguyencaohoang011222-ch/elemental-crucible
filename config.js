// Cấu hình Supabase (Dashboard → Project Settings → API).
// "anon public" key được thiết kế để nằm trong mã phía trình duyệt; dữ liệu được bảo vệ bằng Row Level Security trong supabase/schema.sql.
// Để trống thì game chạy offline như cũ (ẩn đăng nhập + bảng xếp hạng).
export const SUPABASE_URL = '';        // ví dụ: 'https://abcdxyz.supabase.co'
export const SUPABASE_ANON_KEY = '';   // chuỗi dài bắt đầu bằng 'eyJ...'
