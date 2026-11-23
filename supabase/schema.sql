-- Elemental Arena — Supabase schema
-- Chạy 1 lần trong Supabase Dashboard → SQL Editor → New query → dán toàn bộ → Run.
-- Gồm: nickname công khai, bản lưu tiến trình riêng tư, lượt chơi + bảng xếp hạng (stage cao nhất, rồi thời gian ngắn nhất).

-- ---------- nickname (ai cũng đọc được để hiện trên bảng xếp hạng) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique check (nickname ~ '^[A-Za-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles readable by everyone" on public.profiles;
create policy "profiles readable by everyone" on public.profiles for select using (true);
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- bản lưu tiến trình (chỉ chủ tài khoản đọc / ghi) ----------
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.saves enable row level security;
drop policy if exists "own save select" on public.saves;
create policy "own save select" on public.saves for select using (auth.uid() = user_id);
drop policy if exists "own save insert" on public.saves;
create policy "own save insert" on public.saves for insert with check (auth.uid() = user_id);
drop policy if exists "own save update" on public.saves;
create policy "own save update" on public.saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- lượt chơi (mỗi lượt kết thúc gửi 1 dòng) ----------
create table if not exists public.runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  stage int not null check (stage between 1 and 25),
  time_s int not null check (time_s between 1 and 86400),
  cls text not null check (cls in ('KNIGHT', 'RANGER', 'MAGE')),
  won boolean not null default false,
  difficulty text not null default 'NORMAL',
  created_at timestamptz not null default now()
);
create index if not exists runs_rank_idx on public.runs (stage desc, time_s asc);
alter table public.runs enable row level security;
drop policy if exists "runs readable by everyone" on public.runs;
create policy "runs readable by everyone" on public.runs for select using (true);
drop policy if exists "insert own run" on public.runs;
create policy "insert own run" on public.runs for insert with check (auth.uid() = user_id);

-- ---------- bảng xếp hạng: thành tích tốt nhất của mỗi người ----------
-- xếp theo stage cao nhất; cùng stage thì ai xong nhanh hơn đứng trên
create or replace view public.leaderboard with (security_invoker = true) as
select b.user_id, p.nickname, b.stage, b.time_s, b.cls, b.won, b.created_at,
       rank() over (order by b.stage desc, b.time_s asc) as rank
from (
  select distinct on (user_id) user_id, stage, time_s, cls, won, created_at
  from public.runs
  order by user_id, stage desc, time_s asc, created_at asc
) b
join public.profiles p on p.id = b.user_id;
grant select on public.leaderboard to anon, authenticated;
