-- Elemental Arena: mã đổi quà, quyền early access Brutal, mùa Brutal 2 tuần.
-- Dán toàn bộ file này vào Supabase → SQL Editor → Run (chạy lại nhiều lần cũng an toàn).
-- Cần chạy schema.sql trước (bảng profiles, runs).

-- ---------- mã đổi quà ----------
-- Không có policy nào trên bảng codes → không ai đọc / sửa được qua API; chỉ hàm redeem_code (security definer) chạm vào.
create table if not exists public.codes (
  code text primary key check (code ~ '^[A-Z0-9-]{4,24}$'),
  kind text not null default 'gems' check (kind in ('gems', 'brutal')),
  gems int not null default 0 check (gems between 0 and 100000),
  max_uses int not null default 1 check (max_uses >= 1),
  uses int not null default 0,
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
alter table public.codes enable row level security;

-- mỗi tài khoản đổi một mã đúng một lần
create table if not exists public.redemptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null references public.codes (code) on delete cascade,
  at timestamptz not null default now(),
  primary key (user_id, code)
);
alter table public.redemptions enable row level security;
drop policy if exists "own redemptions" on public.redemptions;
create policy "own redemptions" on public.redemptions for select using (auth.uid() = user_id);

-- quyền của tài khoản (early access Brutal)
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  brutal boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "own entitlements" on public.entitlements;
create policy "own entitlements" on public.entitlements for select using (auth.uid() = user_id);

create or replace function public.redeem_code(c text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.codes%rowtype; uid uuid := auth.uid();
begin
  if uid is null then return json_build_object('error', 'Sign in first.'); end if;
  select * into r from public.codes where code = upper(trim(c)) for update;
  if not found then return json_build_object('error', 'Unknown code.'); end if;
  if r.expires_at is not null and r.expires_at < now() then return json_build_object('error', 'This code has expired.'); end if;
  if r.uses >= r.max_uses then return json_build_object('error', 'This code has been used up.'); end if;
  if exists (select 1 from public.redemptions where user_id = uid and code = r.code) then return json_build_object('error', 'You already used this code.'); end if;
  insert into public.redemptions (user_id, code) values (uid, r.code);
  update public.codes set uses = uses + 1 where code = r.code;
  if r.kind = 'brutal' then
    insert into public.entitlements (user_id, brutal) values (uid, true)
    on conflict (user_id) do update set brutal = true, updated_at = now();
  end if;
  return json_build_object('kind', r.kind, 'gems', r.gems, 'code', r.code);
end $$;
revoke all on function public.redeem_code(text) from public, anon;
grant execute on function public.redeem_code(text) to authenticated;

-- ---------- mùa Brutal ----------
-- Mùa 1 bắt đầu lúc bạn chạy file này lần đầu; mỗi mùa 14 ngày, tự nối tiếp (không cần tạo mùa mới bằng tay).
create table if not exists public.season_config (
  id int primary key default 1 check (id = 1),
  epoch timestamptz not null default now(),
  days int not null default 14 check (days between 1 and 90)
);
insert into public.season_config (id) values (1) on conflict (id) do nothing;
alter table public.season_config enable row level security;
drop policy if exists "season config readable" on public.season_config;
create policy "season config readable" on public.season_config for select using (true);

-- mùa hiện tại: số mùa, lúc bắt đầu, lúc kết thúc
create or replace function public.season_now() returns json language sql stable as $$
  select json_build_object('n', n, 'starts_at', c.epoch + (n - 1) * c.days * interval '1 day', 'ends_at', c.epoch + n * c.days * interval '1 day')
  from public.season_config c, lateral (select greatest(1, floor(extract(epoch from (now() - c.epoch)) / (c.days * 86400))::int + 1) as n) s
$$;
grant execute on function public.season_now() to anon, authenticated;

-- bảng điểm một mùa: tổng điểm 10 lượt Brutal tốt nhất của mỗi người (chỉ tài khoản có quyền Brutal)
-- điểm một lượt = stage × 10, thắng thêm 150 + thưởng tốc độ (tối đa 120, mất 1 điểm mỗi 30 giây)
-- loại lượt bất hợp lý: thời gian ít hơn stage × 20 giây
create or replace function public.season_board(n int, lim int default 50)
returns table (rank bigint, user_id uuid, nickname text, points int, runs int, best_stage int, wins int)
language sql stable as $$
  with c as (select epoch + (n - 1) * days * interval '1 day' as s, epoch + n * days * interval '1 day' as e from public.season_config),
  r as (
    select ru.user_id, ru.stage, ru.won,
           ru.stage * 10 + case when ru.won then 150 + greatest(0, 120 - ru.time_s / 30) else 0 end as pts
    from public.runs ru, c
    where ru.difficulty = 'HARD' and ru.created_at >= c.s and ru.created_at < c.e and ru.time_s >= ru.stage * 20
      and exists (select 1 from public.entitlements en where en.user_id = ru.user_id and en.brutal)
  ),
  k as (select r.*, row_number() over (partition by r.user_id order by r.pts desc) as i from r)
  select rank() over (order by sum(k.pts) desc, max(k.stage) desc), k.user_id, p.nickname, sum(k.pts)::int, count(*)::int, max(k.stage), sum(case when k.won then 1 else 0 end)::int
  from k join public.profiles p on p.id = k.user_id
  where k.i <= 10
  group by k.user_id, p.nickname
  order by 1
  limit lim
$$;
grant execute on function public.season_board(int, int) to anon, authenticated;

-- ---------- tạo mã (chạy riêng mỗi khi muốn phát quà) ----------
-- 500 gem, 5 người dùng được, hết hạn sau 7 ngày:
--   insert into public.codes (code, kind, gems, max_uses, expires_at, note) values ('FRIENDS500', 'gems', 500, 5, now() + interval '7 days', 'ban be');
-- mã mời early access Brutal (kèm 100 gem), 3 người:
--   insert into public.codes (code, kind, gems, max_uses, note) values ('BRUTAL-ALPHA', 'brutal', 100, 3, 'early access');
-- xem mã đã dùng bao nhiêu:   select code, kind, gems, uses, max_uses, expires_at from public.codes order by created_at desc;
-- cấp quyền Brutal thẳng cho một nickname:
--   insert into public.entitlements (user_id, brutal) select id, true from public.profiles where nickname = 'TenBan' on conflict (user_id) do update set brutal = true;
