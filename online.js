// Tính năng online qua Supabase: đăng nhập Google, nickname, lưu tiến trình lên mây, gửi lượt chơi, bảng xếp hạng.
// Không cấu hình (config.js trống) hoặc không tải được thư viện → mọi hàm trả về rỗng, game chạy offline như cũ.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
export const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;
let sb = null, user = null, nick = null, ready = false;
const subs = new Set();
const emit = () => { for (const f of subs) try { f(state()); } catch (e) { console.warn(e); } };

export const configured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const state = () => ({ configured: configured(), ready, user, nick, email: user ? user.email : '' });
export const onOnline = fn => { subs.add(fn); fn(state()); };

export async function initOnline() {
  if (!configured()) return;
  try {
    const { createClient } = await import(LIB);
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    const { data } = await sb.auth.getSession();
    await setUser(data.session ? data.session.user : null);
    sb.auth.onAuthStateChange((_ev, s) => { const u = s ? s.user : null; if ((u && u.id) !== (user && user.id)) setUser(u); });
  } catch (e) { console.warn('online: không khởi động được Supabase', e); sb = null; }
  ready = true; emit();
}
async function setUser(u) {
  user = u || null; nick = null;
  if (user && sb) { const { data } = await sb.from('profiles').select('nickname').eq('id', user.id).maybeSingle(); nick = data ? data.nickname : null; }
  emit();
}

export async function signIn() { if (!sb) return; await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); }
export async function signOut() { if (!sb) return; await sb.auth.signOut(); user = null; nick = null; emit(); }

// đặt / đổi nickname: 3–16 ký tự chữ, số, gạch dưới; trùng tên thì báo lỗi
export async function setNickname(n) {
  if (!sb || !user) return { error: 'Sign in first.' };
  n = String(n || '').trim(); if (!NICK_RE.test(n)) return { error: '3–16 letters, numbers or _ only.' };
  const { error } = await sb.from('profiles').upsert({ id: user.id, nickname: n });
  if (error) return { error: error.code === '23505' ? 'That nickname is taken.' : error.message };
  nick = n; emit(); return { ok: true };
}

// bản lưu tiến trình (hồ sơ gem, skin, nhiệm vụ, thành tích…)
export async function loadSave() {
  if (!sb || !user) return null;
  const { data, error } = await sb.from('saves').select('data, updated_at').eq('user_id', user.id).maybeSingle();
  if (error) { console.warn('online: loadSave', error); return null; }
  return data;
}
export async function pushSave(data) {
  if (!sb || !user) return false;
  const { error } = await sb.from('saves').upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
  if (error) { console.warn('online: pushSave', error); return false; }
  return true;
}

// gửi một lượt chơi đã kết thúc (cần đăng nhập + có nickname)
export async function submitRun(r) {
  if (!sb || !user || !nick) return false;
  const row = { user_id: user.id, stage: Math.max(1, Math.min(25, r.stage | 0)), time_s: Math.max(1, Math.round(r.time)), cls: r.cls, won: !!r.won, difficulty: r.difficulty || 'NORMAL' };
  const { error } = await sb.from('runs').insert(row);
  if (error) { console.warn('online: submitRun', error); return false; }
  return true;
}
// top N + dòng của chính mình (nếu không nằm trong top)
export async function fetchLeaderboard(limit = 50) {
  if (!sb) return { rows: [], me: null, error: 'offline' };
  const { data, error } = await sb.from('leaderboard').select('user_id, nickname, stage, time_s, cls, won, rank').order('rank', { ascending: true }).order('created_at', { ascending: true }).limit(limit);
  if (error) return { rows: [], me: null, error: error.message };
  let me = null;
  if (user && !data.some(r => r.user_id === user.id)) { const q = await sb.from('leaderboard').select('user_id, nickname, stage, time_s, cls, won, rank').eq('user_id', user.id).maybeSingle(); me = q.data || null; }
  return { rows: data, me };
}
