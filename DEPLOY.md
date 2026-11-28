# Đưa Elemental Arena lên mạng (GitHub → Vercel → Supabase)

Game là web tĩnh (HTML + JS), không cần bước build. Luồng cập nhật sau khi xong:

```
sửa code trong Claude Code → commit + push lên GitHub → Vercel tự deploy (~30 giây) → web cập nhật
```

Web chỉ cập nhật khi có **push** lên GitHub. Chỉ cần nói với Claude "push lên" là được.

---

## Bước 1 — GitHub
1. Đăng nhập https://github.com.
2. Bấm **New repository** và đặt tên, ví dụ `elemental-arena`.
   - Chọn Public hoặc Private.
   - **Không** tick "Add a README" / .gitignore / license (repo phải trống).
3. Bấm **Create repository**, rồi copy địa chỉ dạng `https://github.com/<tên-bạn>/elemental-arena.git`.
4. Gửi địa chỉ đó cho Claude. Claude sẽ chạy `git remote add origin …` và `git push`.
   - Lần đầu, Windows sẽ mở cửa sổ đăng nhập GitHub (Git Credential Manager). Bạn tự đăng nhập; Claude không bao giờ nhập mật khẩu.

## Bước 2 — Vercel (web tự cập nhật)
1. Vào https://vercel.com, chọn **Continue with GitHub**.
2. Bấm **Add New… → Project**, chọn repo `elemental-arena`, bấm **Import**.
3. Thiết lập:
   - Framework Preset: **Other**.
   - Root Directory: `./`.
   - Không cần đổi gì khác (đã có `vercel.json`).
4. Bấm **Deploy**. Xong sẽ có địa chỉ dạng `https://elemental-arena-xxxx.vercel.app`.
5. Từ giờ mỗi lần push lên nhánh `main`, Vercel tự deploy lại.

## Bước 3 — Supabase (tài khoản, lưu tiến trình, bảng xếp hạng)
1. Vào https://supabase.com, bấm **New project**.
   - Chọn region gần (ví dụ Singapore) và đặt database password (cất kỹ).
2. Tạo bảng:
   - Mở **SQL Editor → New query**.
   - Mở file [supabase/schema.sql](supabase/schema.sql), copy toàn bộ, dán vào, bấm **Run**.
3. Lấy key:
   - Vào **Project Settings → API**, copy **Project URL** và **anon public key**.
   - Dán vào [config.js](config.js), hoặc gửi cho Claude để Claude dán.
   - anon key được phép nằm công khai trong code web; dữ liệu đã có Row Level Security bảo vệ.
   - **Tuyệt đối không** gửi hay dán `service_role` key.

## Bước 3b — Mã đổi quà, early access Brutal, mùa Brutal

1. Supabase → **SQL Editor** → **New query**, mở [supabase/redeem.sql](supabase/redeem.sql), copy toàn bộ, dán vào, bấm **Run**. Chạy lại nhiều lần cũng an toàn.
2. Mùa 1 bắt đầu đúng lúc bạn chạy file này lần đầu; mỗi mùa 14 ngày, tự nối tiếp.
3. Tạo mã: chạy một dòng SQL (mẫu có ở cuối file), ví dụ:
   - 500 gem cho 5 người, hết hạn sau 7 ngày: `insert into public.codes (code, kind, gems, max_uses, expires_at) values ('FRIENDS500', 'gems', 500, 5, now() + interval '7 days');`
   - mã mời Brutal (kèm 100 gem) cho 3 người: `insert into public.codes (code, kind, gems, max_uses) values ('BRUTAL-ALPHA', 'brutal', 100, 3);`
4. Người chơi đăng nhập Google, bấm **Redeem code** ở góc trên trái màn hình chính, nhập mã.
5. Hết mùa, người hạng 1–10 nhận thưởng khi đăng nhập lại. Hạng 1 thấy email liên hệ của bạn trong thông báo riêng.

Lưu ý: gem và lượt chơi vẫn do trình duyệt gửi lên, người rành code vẫn gian lận được. Bảng mùa đã loại lượt có thời gian vô lý và chỉ tính tài khoản có quyền Brutal.

## Bước 4 — Đăng nhập bằng Gmail (Google OAuth)
1. Vào https://console.cloud.google.com.
   - Tạo project mới.
   - Vào **APIs & Services → OAuth consent screen**: chọn **External**, điền tên app và email hỗ trợ, rồi Save.
2. Vào **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs**: thêm `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Địa chỉ chính xác nằm ở Supabase → **Authentication → Providers → Google**, mục "Callback URL".
3. Copy **Client ID** và **Client Secret**.
   - Trong Supabase: **Authentication → Providers → Google**, bật **Enable**, dán 2 giá trị, rồi Save.
4. Trong Supabase: **Authentication → URL Configuration**.
   - **Site URL**: `https://elemental-arena-xxxx.vercel.app` (địa chỉ Vercel của bạn).
   - **Redirect URLs**: thêm `https://elemental-arena-xxxx.vercel.app/**` và `http://localhost:8765/**`.
5. Lúc mới tạo, Google để app ở chế độ "Testing", chỉ những email bạn thêm vào **Test users** mới đăng nhập được. Muốn ai cũng vào được thì bấm **Publish app** ở OAuth consent screen.

## Bước 5 — Kiểm tra
1. Push lên GitHub, chờ Vercel deploy xong, rồi mở web.
2. Ở màn hình chính, góc phải trên có nút **Sign in with Google**. Đăng nhập xong, đặt nickname.
3. Chơi một lượt. Khi chết hoặc thắng, lượt đó được gửi lên bảng xếp hạng (nút **Leaderboard** ở menu).

---

### Cách game dùng Supabase
| Bảng | Nội dung | Ai đọc / ghi |
|---|---|---|
| `profiles` | nickname (3–16 ký tự chữ / số / `_`, không trùng) | ai cũng đọc; chỉ chủ tài khoản sửa |
| `saves` | toàn bộ tiến trình (gem, skin, nhiệm vụ, thành tích) | chỉ chủ tài khoản |
| `runs` | mỗi lượt chơi: stage, thời gian, tướng, thắng/thua | ai cũng đọc; chỉ tự gửi lượt của mình |
| view `leaderboard` | lượt tốt nhất của mỗi người | ai cũng đọc |

- **Xếp hạng**: stage cao hơn đứng trên; cùng stage thì thời gian ngắn hơn đứng trên.
- **Đồng bộ tiến trình**:
  - Lần đầu đăng nhập trên một máy: giữ bản có nhiều tiến trình hơn (máy hay tài khoản).
  - Về sau: bản lưu mới hơn thắng. Mỗi thay đổi được tự lưu lên mây sau ~2.5 giây.
- **Test Lab và chế độ luyện tập** không được gửi lên bảng xếp hạng.
- **Lưu ý**: game chạy hoàn toàn trên trình duyệt, nên người rành kỹ thuật có thể gửi điểm giả. Với game cá nhân thì ổn; nếu sau này cần chống gian lận thì phải thêm kiểm tra phía server (Supabase Edge Function).
