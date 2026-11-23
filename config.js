// Cấu hình Supabase (Dashboard → Project Settings → API).
// Publishable / "anon public" key được thiết kế để nằm trong mã phía trình duyệt; dữ liệu được bảo vệ bằng Row Level Security trong supabase/schema.sql.
// Để trống thì game chạy offline như cũ (ẩn đăng nhập + bảng xếp hạng). Không bao giờ đặt secret / service_role key ở đây.
export const SUPABASE_URL = 'https://ofulrluzgezmscmgxbao.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_GFp22aTto1n9prkmNLqIOQ_Pdkn0ZBG';
