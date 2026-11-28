// Hệ phòng thủ dùng chung: slow motion, đồng hồ cát (hoá vàng → dịch chuyển chỗ an toàn), tàng hình / mồi nhử,
// chí mạng sau khi hiện hình, xoá đạn, khiên/giảm sát thương ngắn hạn. Mọi bộ đếm nằm trên g.p.
import { dist } from './sim.js';

const TAU = Math.PI * 2;
export const CRIT_STEALTH = 2.5;

// ô trống cho người chơi bán kính pr: không vướng vật cản, vẫn trong đấu trường
export function freeAt(g, x, y, pr) {
  const A = g.arena;
  return !g.world.blocked(x, y, pr + 4) && (!A || Math.hypot(x - A.x, y - A.y) < A.r - pr - 6);
}
// độ nguy hiểm của 1 điểm: nằm trong vùng báo trước của boss chưa nổ, gần boss, gần quái, gần đạn
function danger(g, x, y) {
  let s = 0;
  for (const h of g.hazards || []) {
    if (h.done && !h.active) continue;
    if (h.x === undefined) continue;
    const d = dist(x, y, h.x, h.y);
    if (h.kind === 'circle' || h.kind === 'slam' || h.kind === 'vortex') { if (d < (h.r || 60) + 30) s += 10; }
    else if (h.kind === 'arc') { if (d < (h.r || 120) + 30) s += 6; }
    else if (h.kind === 'ring') { if (Math.abs(d - (h.rr || 0)) < 120 || d < (h.max || 300)) s += 3; }
    else if (h.kind === 'line' || h.kind === 'rect' || h.kind === 'beam') {
      const a = h.a || 0, ca = Math.cos(a), sa = Math.sin(a), rx = x - h.x, ry = y - h.y, along = rx * ca + ry * sa, side = Math.abs(-rx * sa + ry * ca);
      const len = h.len || 600, w = (h.width || 80) / 2 + 30;
      if ((h.kind === 'rect' ? Math.abs(along) < len / 2 : along > -20 && along < len) && side < w) s += 8;
    }
  }
  if (g.blizzard) s += 0;
  for (const e of g.enemies) if (!e.dead && e.type !== 'DUMMY') { const d = dist(x, y, e.x, e.y); if (e.boss) s += Math.max(0, (360 - d) / 40); else if (d < 140) s += (140 - d) / 50; }
  for (const f of g.foes) if (dist(x, y, f.x, f.y) < 90) s += 1.5;
  return s;
}
// điểm an toàn nhất trong bán kính r quanh người chơi (dùng cho đồng hồ cát)
export function safeSpot(g, r = 320) {
  const p = g.p; let best = null, bs = Infinity;
  const cands = [[p.x, p.y]];
  for (const rr of [r * 0.35, r * 0.65, r]) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU + rr * 0.01; cands.push([p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr]); }
  for (const [x, y] of cands) {
    if (!freeAt(g, x, y, p.r)) continue;
    const s = danger(g, x, y) + dist(x, y, p.x, p.y) / 400; // hoà điểm thì chọn chỗ gần hơn
    if (s < bs) { bs = s; best = [x, y]; }
  }
  return best || [p.x, p.y];
}

// ---------- kích hoạt ----------
export function slowmo(g, t) { const p = g.p; p.slowmoT = Math.max(p.slowmoT || 0, t); g.emit('slowmo', { x: p.x, y: p.y, t }); }
export function shield(g, n, t) { const p = g.p; p.shield = Math.max(p.shield || 0, n); p.shieldT = Math.max(p.shieldT || 0, t); g.emit('shieldUp', { x: p.x, y: p.y, n }); }
export function dr(g, amt, t) { const p = g.p; if (amt >= (p.drAmt || 0) || !(p.drT > 0)) p.drAmt = amt; p.drT = Math.max(p.drT || 0, t); }
// Trần hồi máu: mọi hồi máu theo thời gian / theo đòn / theo lần tung chiêu đi qua heal() và trừ vào quỹ p.healBud,
// quỹ nạp HEAL.perSec × máu tối đa mỗi giây, đầy tối đa HEAL.burst giây. Bình máu, đồ rơi, qua stage không qua đây (không tính trần).
export const HEAL = { perSec: 0.03, burst: 1 };
export function healCap(p) { return HEAL.perSec * p.max; }
export function tickHeal(p, dt) { const c = healCap(p) * HEAL.burst; p.healBud = Math.min(c, (p.healBud ?? c) + healCap(p) * dt); }
export function heal(g, n) {
  const p = g.p; if (!(n > 0) || p.hp <= 0) return 0;
  n *= p.mods.healMul || 1;   // Blood Pact… giảm mọi nguồn hồi
  if (p.healBud === undefined) p.healBud = healCap(p) * HEAL.burst;
  const v = Math.min(p.max - p.hp, n, p.healBud); if (!(v > 0)) return 0;
  p.healBud -= v; p.hp += v; if (v >= 1) g.emit('healTick', { x: p.x, y: p.y, v: Math.round(v) }); return v;
}
// hoá vàng: bất tử + đứng yên t giây; hết vàng thì (tuỳ chọn) dịch chuyển tới chỗ an toàn trong bán kính tele
export function goldStatue(g, t, opts = {}) {
  const p = g.p; p.goldT = t; p.goldT0 = t; p.goldTele = opts.tele || 0; p.goldEnd = opts.onEnd || null; p.vx = p.vy = 0; p.charge = 0;
  g.emit('goldStart', { x: p.x, y: p.y, t });
}
// tàng hình: kẻ địch nhắm vào điểm cuối cùng thấy bạn; đòn trực tiếp đầu tiên phá tàng hình và chí mạng ×2.5
export function stealth(g, t) {
  const p = g.p; if (!(p.stealthT > 0)) p.seen = { x: p.x, y: p.y, t: 0 };
  p.stealthT = Math.max(p.stealthT || 0, t); p.crit = { mult: CRIT_STEALTH, t: Infinity, stealth: true };
  g.emit('stealthOn', { x: p.x, y: p.y, t });
}
export function reveal(g) { const p = g.p; if (!(p.stealthT > 0)) return; p.stealthT = 0; g.emit('stealthOff', { x: p.x, y: p.y }); }
// mồi nhử: kẻ địch đánh vào điểm (x,y) trong t giây (không kèm chí mạng)
export function lure(g, x, y, t) { const p = g.p; p.lure = { x, y }; p.lureT = Math.max(p.lureT || 0, t); g.emit('lure', { x, y, t }); }
export function critNext(g, mult, t) { const p = g.p; if (!p.crit || p.crit.mult <= mult) p.crit = { mult, t }; }
// xoá đạn địch (cả đạn boss) trong bán kính r; không đụng vùng báo trước của boss
export function clearShots(g, x, y, r) {
  let n = 0; for (const f of g.foes) if (f.life > 0 && dist(f.x, f.y, x, y) < r + (f.r || 6)) { f.life = 0; f.landed = true; n++; g.emit('block', { x: f.x, y: f.y }); }
  return n;
}
// dội đạn: đạn địch trong bán kính bị đảo ngược thành đạn của người chơi bắn vào kẻ địch gần nhất
export function reflectShots(g, x, y, r, sk) {
  let n = 0;
  for (const f of g.foes) {
    if (!(f.life > 0) || dist(f.x, f.y, x, y) > r + (f.r || 6)) continue;
    f.life = 0; f.landed = true; n++;
    let best = null, bd = 520; for (const e of g.enemies) if (!e.dead && e.type !== 'DUMMY') { const d = dist(f.x, f.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
    const a = best ? Math.atan2(best.y - f.y, best.x - f.x) : Math.atan2(f.y - y, f.x - x);
    if (sk) g.proj('shard', f.x, f.y, a, { speed: 620, range: 480, r: 7, dmg: Math.max(14, (f.dmg || 10) * 1.2), pierce: 0 }, sk);
    g.emit('parry', { x: f.x, y: f.y });
  }
  return n;
}

// ---------- điểm nhắm thay thế cho kẻ địch ----------
// null = kẻ địch thấy bạn. Ngược lại trả về {x,y} để quái/boss nhắm vào.
export function hidePoint(g) {
  const p = g.p;
  if (p.lureT > 0 && p.lure) return p.lure;
  if (p.stealthT > 0 || g.inForge) {
    const s = p.seen || (p.seen = { x: p.x, y: p.y, t: 0 });
    // bóng ma trôi chậm quanh điểm cuối cùng thấy bạn
    const k = s.t || 0;
    if (g.inForge && g.forge) { const F = g.forge, a = Math.atan2(s.y - F.y, s.x - F.x) + Math.sin(k * 0.4) * 1.2, R = 260 + Math.sin(k * 0.9) * 40; return { x: F.x + Math.cos(a) * R, y: F.y + Math.sin(a) * R }; }
    return { x: s.x + Math.cos(k * 0.9 + s.x * 0.01) * 70 * Math.min(1, k), y: s.y + Math.sin(k * 0.7 + s.y * 0.01) * 70 * Math.min(1, k) };
  }
  return null;
}
// chạy fn trong lúc g.p được thay bằng bóng ma (để quái/boss nhắm lệch). hurtPlayer luôn trỏ về người chơi thật.
export function withPhantom(g, pt, fn) {
  if (!pt) return fn();
  const real = g.p, ph = Object.create(real);
  ph.x = pt.x; ph.y = pt.y; ph.vx = 0; ph.vy = 0; ph.phantom = true;
  g._real = real; g.p = ph;
  try { return fn(); } finally { g.p = real; g._real = null; }
}

// ---------- mỗi khung ----------
export function tickDefense(g, dt) {
  const p = g.p;
  for (const k of ['slowmoT', 'drT', 'braceT', 'steadyT', 'lureT', 'freeCastT']) if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
  if (p.drT <= 0) p.drAmt = 0;
  if (p.freeCastT <= 0) p.freeCast = null;
  if (p.seen) p.seen.t = (p.seen.t || 0) + dt;
  if (p.stealthT > 0) { p.stealthT -= dt; if (p.stealthT <= 0) { p.stealthT = 0; if (p.crit && p.crit.stealth) p.crit.t = 2; g.emit('stealthOff', { x: p.x, y: p.y }); } }
  if (p.crit && p.crit.t !== Infinity) { p.crit.t -= dt; if (p.crit.t <= 0) p.crit = null; }
  if (!(p.stealthT > 0) && !g.inForge) p.seen = null;
  if (p.goldT > 0) {
    p.goldT -= dt; p.vx = p.vy = 0; p.charge = 0; p.inv = Math.max(p.inv, 0.05);
    if (p.goldT <= 0) {
      p.goldT = 0; const ox = p.x, oy = p.y;
      if (p.goldTele) { const [x, y] = safeSpot(g, p.goldTele); p.x = x; p.y = y; if (g.arena) g.clampArena(p, p.r); p.inv = Math.max(p.inv, 0.5); }
      g.emit('goldEnd', { x1: ox, y1: oy, x2: p.x, y2: p.y, tele: !!p.goldTele });
      const f = p.goldEnd; p.goldEnd = null; if (f) f(g);
    }
  }
  g.hidePt = hidePoint(g);
}
// hệ số giảm sát thương nhận (nhân vào trong hurtPlayer). Trả về 0 khi hoàn toàn miễn.
export function dmgTakenMul(g, dmg) {
  const p = g.p; if (p.goldT > 0) return 0;
  let m = 1;
  if (p.drT > 0) m *= 1 - (p.drAmt || 0);
  if (p.braceT > 0) { m *= 0.5; p.braceT = 0; g.emit('brace', { x: p.x, y: p.y }); }
  if (g.zoneDr) m *= 1 - g.zoneDr;
  return m;
}
// chí mạng khi gây sát thương; trả về hệ số nhân
export function critMul(g, e, dmg, kind) {
  const p = g.p;
  if (kind === 'burn' || kind === 'echo' || kind === 'zone' || e.type === 'DUMMY' && false) return 1;
  if (dmg < 10) return 1; // tick vùng/bỏng nhỏ không tiêu chí mạng
  if (g._quietHit) return 1; // phân thân/mây của chiêu tàng hình không làm lộ
  let m = 1;
  if (p.crit) { m = p.crit.mult; p.crit = null; g.emit('crit', { x: e.x, y: e.y, mult: m }); }
  if (p.stealthT > 0) reveal(g);
  return m;
}
