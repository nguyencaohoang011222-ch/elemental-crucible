// độ cao tay cầm vũ khí của nhân vật chibi so với tâm chân (world px)
export const HAND_Y = -2;
// Module hiệu ứng RIÊNG cho từng dòng skin hạng cao (Epic, Victory, HEROES, Boss).
// Quy tắc: không dòng nào dùng lại mẫu hình của dòng khác rồi đổi màu. Mỗi dòng có hình học, vật lý hạt và câu chuyện riêng
// cho: đi (walk), lướt (dash), đòn thường (basic), tụ lực (charge), đạn (shot), điểm trúng chiêu (impact), tuyệt kỹ (ult).
// Skin Boss dùng lại đúng hàm vẽ đòn của boss trong trận (bossvfx.impact / shockwave), thu nhỏ lại.
import { WPP, sn, H, sq, line, poly, disc, tri, zig } from './pxdraw.js';
import * as BVX from './bossvfx.js';

// ---------- hạ tầng: thực thể hiệu ứng (vẽ trên) và vết trên mặt đất (vẽ dưới chân) ----------
const spawn = (R, f, o = {}) => (R.skl || (R.skl = [])).push({ f, t: 0, T: 0.5, seed: Math.random() * 100, ...o });
const decal = (R, f, o = {}) => { const D = R.skdec || (R.skdec = []); D.push({ f, t: 0, T: 1.6, seed: Math.random() * 100, ...o }); if (D.length > 60) D.shift(); };
const every = (R, key, dt, gap) => { R[key] = (R[key] || 0) - dt; if (R[key] > 0) return false; R[key] = gap; return true; };
const posOf = e => e.ev === 'arcSlash' ? [e.x + Math.cos(e.a) * (e.range || 100) * 0.8, e.y + Math.sin(e.a) * (e.range || 100) * 0.8] : (e.ev === 'beam' || e.ev === 'blink') ? [e.x2, e.y2] : [e.x, e.y];
const tipOf = e => { const f = Math.cos(e.a) < 0 ? -1 : 1, q = e.a - 0.5 * f; return [e.x + Math.cos(q) * 60, e.y - 10 + Math.sin(q) * 60]; };
const ptip = p => { const f = p.face || 1, q = p.aim - 0.5 * f; return [p.x + Math.cos(q) * 58, p.y + HAND_Y + Math.sin(q) * 58]; };
const part = (R, x, y, vx, vy, life, c, s, g) => { if (R.parts.length < 900) R.parts.push({ x, y, vx, vy, life, max: life, c, s, g }); };
// đòn boss thật, thu nhỏ: h giống hệt một "hazard" của boss trong trận
const bossHit = (R, type, h, T = 0.32) => spawn(R, (c, o, k, t) => { o.h.fade = 0.3 * (1 - k); BVX.impact(R, c, o.h, t); }, { T, h: { owner: { type }, ...h, fade: 0.3 } });
const bossWave = (R, type, x, y, r, T = 0.45, thick = 12) => spawn(R, (c, o, k, t) => { o.h.rr = r * (0.15 + 0.85 * k); BVX.shockwave(R, c, o.h, t); }, { T, h: { owner: { type }, x, y, thick } });
const ARROWS = new Set(['arrow', 'pierce', 'silver']);

// =====================================================================================
// EPIC — Obsidian Knight: thép bóng tối sắc lẹm, sóng lưỡi liềm đen bay ra, vệt động năng mảnh
// =====================================================================================
const OB = { d: '#0e0e14', s: '#2a2a36', m: '#6a6a88', e: '#a87aff', w: '#e8d8ff' };
const abyss = {
  ghost: true,
  basic(R, e) {
    if (e.ev === 'swing') { const big = e.charge > 0.3; spawn(R, (c, o, k) => { // lưỡi liềm kép bay về phía trước, không phải vòng tròn
      const r0 = o.r * (0.55 + 0.8 * k), A = o.arc * 0.9; c.globalAlpha = 1 - k;
      for (const off of [0, -10]) for (let i = 0; i <= 16; i++) { const u = i / 16, a = o.a - A / 2 + A * u, w = Math.sin(u * Math.PI), rr = r0 + off; sq(c, o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr, WPP * (1 + Math.round(w * (big ? 3 : 2))), off ? OB.s : OB.d); if (!off) sq(c, o.x + Math.cos(a) * (rr + 4), o.y + Math.sin(a) * (rr + 4), WPP, OB.e); }
      for (let i = 0; i < 4; i++) { const a = o.a + (H(i, o.seed) - 0.5) * A, d = r0 * 0.6; line(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, o.x + Math.cos(a) * (d + 30), o.y + Math.sin(a) * (d + 30), WPP, OB.m, WPP); } }, { x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4, T: big ? 0.42 : 0.3 }); }
    else if (e.ev === 'knightWave') spawn(R, (c, o, k) => { // 8 mảnh lưỡi thép xoay bung ra
      c.globalAlpha = 1 - k; for (let i = 0; i < 8; i++) { const a = i * 0.785 + k * 2.5, d = o.r * (0.2 + 0.8 * k), x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d * 0.8, b = a + 1.6; tri(c, [x + Math.cos(b) * 14, y + Math.sin(b) * 14], [x - Math.cos(b) * 14, y - Math.sin(b) * 14], [x + Math.cos(a) * 22, y + Math.sin(a) * 22], OB.s); line(c, x - Math.cos(b) * 14, y - Math.sin(b) * 14, x + Math.cos(a) * 22, y + Math.sin(a) * 22, WPP, OB.e, WPP); } }, { x: e.x, y: e.y, r: e.r, T: 0.45 });
  },
  dash(R, x, y, dx, dy) { spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; for (let i = -2; i <= 2; i++) { const ox = -dy * i * 7, oy = dx * i * 7, L = 60 + (2 - Math.abs(i)) * 30; line(c, o.x + ox, o.y + oy, o.x + ox - dx * L * (1 - k * 0.5), o.y + oy - dy * L * (1 - k * 0.5), WPP, i ? OB.m : OB.e, WPP); } }, { x: x + dx * 90, y, T: 0.3 }); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.05)) decal(R, (c, o, k) => { c.globalAlpha = (1 - k) * 0.8; line(c, o.x, o.y, o.x - o.dx * 10, o.y - o.dy * 10, WPP, k < 0.3 ? OB.e : OB.s, WPP); }, { x: p.x, y: p.y + 10, dx: Math.cos(Math.atan2(p.vy, p.vx)), dy: Math.sin(Math.atan2(p.vy, p.vx)), T: 0.6 }); },
  charge(R, ctx, p, t) { const c = p.charge, n = 3 + Math.round(c * 3); for (let i = 0; i < n; i++) { const a = t * 3 + i * 6.283 / n, x = p.x + Math.cos(a) * 34, y = p.y - 8 + Math.sin(a) * 18; tri(ctx, [x, y - 8], [x - 4, y + 6], [x + 4, y + 6], OB.s); sq(ctx, x, y - 8, WPP, OB.e); } },
  impact(R, x, y, r) { spawn(R, (c, o, k) => { // lưỡi thép đâm lên từ đất
    const rise = Math.min(1, k * 6); c.globalAlpha = Math.min(1, (1 - k) * 3);
    for (let i = 0; i < 5; i++) { const a = i * 1.256 + o.seed, d = o.r * (0.2 + 0.4 * (i & 1)), bx = o.x + Math.cos(a) * d, by = o.y + Math.sin(a) * d * 0.7, h = (34 + (i % 3) * 12) * rise; tri(c, [bx - 5, by], [bx + 5, by], [bx + 2, by - h], OB.s); line(c, bx + 5, by, bx + 2, by - h, WPP, OB.e, WPP); } }, { x, y, r, T: 0.55 }); }
};

// =====================================================================================
// EPIC — Shadow Stalker: mũi tên kim đen + ảnh dư, xúc tu bóng tối, bước tan thành khói
// =====================================================================================
const SH = { d: '#06060c', s: '#24243a', v: '#9a6aff', w: '#e0d0ff' };
const shadow = {
  ghost: true,
  basic(R, e) { if (e.ev === 'shoot') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; for (let i = 1; i <= 3; i++) { const d = 26 + i * 16 * (1 - k); line(c, o.x + Math.cos(o.a) * d, o.y + Math.sin(o.a) * d, o.x + Math.cos(o.a) * (d + 16), o.y + Math.sin(o.a) * (d + 16), WPP, i === 1 ? SH.v : SH.s, WPP); } }, { x: e.x, y: e.y - 10, a: e.a, T: 0.25 }); },
  shot(R, ctx, s, cat, t) { if (!ARROWS.has(s.kind) && s.kind !== 'sarrow') return false; const a = s.a, ca = Math.cos(a), sa = Math.sin(a), big = s.kind !== 'arrow';
    for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.5 / i; line(ctx, s.x - ca * (22 + i * 12), s.y - sa * (22 + i * 12), s.x - ca * i * 12, s.y - sa * i * 12, WPP, SH.v, WPP); } ctx.globalAlpha = 1;
    line(ctx, s.x - ca * 22, s.y - sa * 22, s.x, s.y, WPP * (big ? 2 : 1), SH.d, WPP); line(ctx, s.x - ca * 18, s.y - sa * 18, s.x, s.y, WPP, SH.v, WPP * 3); sq(ctx, s.x + ca * 2, s.y + sa * 2, WPP * 2, SH.w); return true; },
  dash(R, x, y, dx, dy) { for (let i = 0; i < 10; i++) part(R, x + (Math.random() - 0.5) * 20, y - 10, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 0.8, i & 1 ? SH.s : SH.d, 9); spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; disc(c, o.x, o.y + 8, 16 * (1 - k) + 4, SH.d, 0.4); }, { x, y, T: 0.5 }); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.2)) decal(R, (c, o, k) => { c.globalAlpha = (1 - k) * 0.7; disc(c, o.x, o.y, 5, SH.d, 0.5); if (k > 0.4) sq(c, o.x, o.y - (k - 0.4) * 30, WPP * 2, SH.s); }, { x: p.x + (Math.random() - 0.5) * 8, y: p.y + 10, T: 1.2 }); },
  charge(R, ctx, p, t) { const [bx, by] = [p.x + Math.cos(p.aim) * 22, p.y + HAND_Y + Math.sin(p.aim) * 22]; for (let j = 0; j < 5; j++) { const a0 = j * 1.256 + 0.6, sx = p.x + Math.cos(a0) * 46, sy = p.y + 8 + Math.sin(a0) * 16; for (let s = 0; s <= 8; s++) { const u = s / 8 * p.charge, w = Math.sin(u * 9 + t * 8 + j) * 5; sq(ctx, sx + (bx - sx) * u + w, sy + (by - sy) * u, WPP * (s < 4 ? 2 : 1), s > 6 ? SH.v : SH.s); } } },
  impact(R, x, y, r) { spawn(R, (c, o, k) => { // xúc tu có gai siết vào tâm
    c.globalAlpha = 1 - k * k; const close = Math.min(1, k * 2.5);
    for (let j = 0; j < 6; j++) { const a = j * 1.047 + o.seed; for (let s = 0; s <= 8; s++) { const u = s / 8, d = o.r * (1 - u * close), w = Math.sin(u * 7 + j) * 6, x2 = o.x + Math.cos(a) * d - Math.sin(a) * w, y2 = o.y + (Math.sin(a) * d + Math.cos(a) * w) * 0.7; sq(c, x2, y2, WPP * 2, SH.s); if (s % 3 === 1) sq(c, x2 + Math.cos(a + 1.6) * 4, y2 + Math.sin(a + 1.6) * 3, WPP, SH.v); } } }, { x, y, r, T: 0.6 }); }
};

// =====================================================================================
// EPIC — Void Walker: vết rách không gian hình tam giác, mảnh vật chất tối, hạt bị hút vào
// =====================================================================================
const VO = { k: '#02020a', d: '#14102a', m: '#2a2050', c: '#7fe0ff', w: '#e0f8ff' };
function voidTear(c, x, y, s, open, seed, t) { // ba mảnh tam giác răng cưa tách ra quanh một khe tối
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + seed + t * 0.5, ox = Math.cos(a) * s * 0.5 * open, oy = Math.sin(a) * s * 0.5 * open, p1 = [x + ox + Math.cos(a) * s, y + oy + Math.sin(a) * s], p2 = [x + ox + Math.cos(a + 2.4) * s * 0.6, y + oy + Math.sin(a + 2.4) * s * 0.6], p3 = [x + ox + Math.cos(a - 2.4) * s * 0.6, y + oy + Math.sin(a - 2.4) * s * 0.6]; tri(c, p1, p2, p3, VO.m); poly(c, [p1, p2, p3, p1], WPP, VO.c); }
  tri(c, [x, y - s * 0.7 * open], [x - s * 0.25 * open, y + s * 0.4 * open], [x + s * 0.25 * open, y + s * 0.4 * open], VO.k);
}
const voidL = {
  basic(R, e) {
    if (e.ev === 'shoot') { const [x, y] = tipOf(e); spawn(R, (c, o, k) => { c.globalAlpha = 1 - k * k; voidTear(c, o.x, o.y, 16, k < 0.5 ? k * 2 : 2 - k * 2, o.seed, 0); }, { x, y, T: 0.28 }); }
    else if (e.ev === 'boom') spawn(R, (c, o, k) => { // rạn nứt tam giác + hạt bị hút vào rồi loé
      c.globalAlpha = 1 - k; for (let i = 0; i < 7; i++) { const a = i * 0.898 + o.seed, L = o.r * (0.5 + 0.5 * H(i, o.seed)); poly(c, [[o.x, o.y], [o.x + Math.cos(a) * L * 0.5 + 6, o.y + Math.sin(a) * L * 0.4], [o.x + Math.cos(a) * L, o.y + Math.sin(a) * L * 0.8]], WPP, i & 1 ? VO.c : VO.m); }
      for (let i = 0; i < 10; i++) { const a = i * 0.628 + k * 4, d = o.r * (1 - k); sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.8, WPP, VO.w); } if (k > 0.7) voidTear(c, o.x, o.y, 18, (k - 0.7) * 3, o.seed, 0); }, { x: e.x, y: e.y, r: e.r || 70, T: 0.5 });
  },
  shot(R, ctx, s, cat, t) { if (s.kind !== 'orb' && s.kind !== 'sbolt' && s.kind !== 'spark') return false; const rr = (s.r || 8) * 0.8;
    disc(ctx, s.x, s.y, rr, VO.k); for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.094, x = s.x + Math.cos(a) * (rr + 7), y = s.y + Math.sin(a) * (rr + 7) * 0.8; tri(ctx, [x + Math.cos(a) * 7, y + Math.sin(a) * 7], [x + Math.cos(a + 2.3) * 4, y + Math.sin(a + 2.3) * 4], [x + Math.cos(a - 2.3) * 4, y + Math.sin(a - 2.3) * 4], VO.m); sq(ctx, x + Math.cos(a) * 7, y + Math.sin(a) * 7, WPP, VO.c); }
    for (let i = 0; i < 5; i++) { const a = H(i, (t * 6) | 0) * 6.283, d = rr + 22 - ((t * 60 + i * 9) % 20); sq(ctx, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, WPP, VO.w); } return true; },   // hạt bị lực hút kéo vào lõi
  charge(R, ctx, p, t) { const [x, y] = ptip(p); for (let i = 0; i < 10; i++) { const a = i * 0.628 + t * 4, d = 44 * (1 - ((t * 1.3 + i * 0.1) % 1)); sq(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, WPP, i & 1 ? VO.c : VO.w); } voidTear(ctx, x, y, 8 + 8 * p.charge, 0.4 + 0.6 * p.charge, 0, t); },
  dash(R, x, y, dx, dy) { for (const [px, py, d] of [[x, y, 0], [x + dx * 100, y + dy * 100, 0.08]]) spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; voidTear(c, o.x, o.y - 10, 20, Math.sin(Math.min(1, k * 1.5) * Math.PI), o.seed, 0); }, { x: px, y: py, T: 0.4 }); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.22)) decal(R, (c, o, k) => { c.globalAlpha = 1 - k; const s = 5 * (1 - k * 0.5); tri(c, [o.x, o.y - s], [o.x - s, o.y + s * 0.6], [o.x + s, o.y + s * 0.6], VO.d); poly(c, [[o.x, o.y - s], [o.x + s, o.y + s * 0.6]], WPP, VO.c); sq(c, o.x, o.y - k * 20, WPP, VO.w); }, { x: p.x + (Math.random() - 0.5) * 10, y: p.y + 10, T: 1.1 }); },
  impact(R, x, y, r) { spawn(R, (c, o, k) => { const open = Math.sin(Math.min(1, k * 1.6) * Math.PI); c.globalAlpha = 1 - k * 0.6; voidTear(c, o.x, o.y - 6, o.r * 0.45, open, o.seed, 0); for (let i = 0; i < 8; i++) { const a = i * 0.785 + o.seed, d = o.r * (1 - k); sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.7, WPP * 2, VO.c); } }, { x, y, r, T: 0.6 }); }
};

// =====================================================================================
// VICTORY — Titanslayer: vòng nguyệt quế vàng, xích titan đứt, giáo Valkyrie rơi từ trời, ấn vương miện
// =====================================================================================
const TS = { d: '#5a3a08', g: '#c8983a', y: '#ffe27a', w: '#fff6d0', l: '#8aa83a', s: '#c8d4e8', st: '#6a7480' };
function crownSigil(c, x, y, s) { const b = y + s * 0.4; line(c, x - s, b, x + s, b, WPP * 2, TS.g, WPP); poly(c, [[x - s, b], [x - s, y - s * 0.3], [x - s * 0.5, y + s * 0.1], [x, y - s * 0.6], [x + s * 0.5, y + s * 0.1], [x + s, y - s * 0.3], [x + s, b]], WPP, TS.y); sq(c, x, y - s * 0.6, WPP * 2, TS.w); sq(c, x - s, y - s * 0.3, WPP, TS.w); sq(c, x + s, y - s * 0.3, WPP, TS.w); }
function chainLink(c, x, y, a, col) { const ca = Math.cos(a), sa = Math.sin(a); for (const [u, v] of [[-4, -2], [-4, 2], [4, -2], [4, 2], [-5, 0], [5, 0], [-2, -3], [2, -3], [-2, 3], [2, 3]]) sq(c, x + ca * u - sa * v, y + sa * u + ca * v, WPP, col); }
function spear(c, x, y, a, L, col) { const ca = Math.cos(a), sa = Math.sin(a); line(c, x - ca * L, y - sa * L, x, y, WPP * 2, TS.d, WPP); line(c, x - ca * L, y - sa * L, x, y, WPP, col, WPP); tri(c, [x + ca * 12, y + sa * 12], [x - sa * 5, y + ca * 5], [x + sa * 5, y - ca * 5], TS.w); for (const d of [-1, 1]) line(c, x - ca * 4, y - sa * 4, x - ca * 10 - sa * 8 * d, y - sa * 10 + ca * 8 * d, WPP, TS.y, WPP); }
const chainBurst = (R, x, y, n = 6) => spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; for (let i = 0; i < o.n; i++) { const a = i * 6.283 / o.n + o.seed, d = 8 + k * 70, px2 = o.x + Math.cos(a) * d, py2 = o.y + Math.sin(a) * d * 0.7 - Math.sin(k * Math.PI) * 20; chainLink(c, px2, py2, a + k * 6, i & 1 ? TS.s : TS.st); sq(c, px2 + 8, py2 - 4, WPP, TS.y); } }, { x, y, n, T: 0.6 });
const titanslayer = {
  basic(R, e, cls) {
    if (e.ev === 'swing') spawn(R, (c, o, k) => { // nhát chém viền lá nguyệt quế
      const A = o.arc, pr = Math.min(1, k * 2.4); c.globalAlpha = 1 - k * k;
      for (let i = 0; i <= 14 * pr; i++) { const u = i / 14, a = o.a - A / 2 + A * u, x = o.x + Math.cos(a) * o.r, y = o.y + Math.sin(a) * o.r; sq(c, x, y, WPP * 2, TS.g); if (i % 2 === 0) for (const d of [-1, 1]) { const b = a + d * 0.9 + 1.57; line(c, x, y, x + Math.cos(b) * 8, y + Math.sin(b) * 8, WPP, TS.l, WPP); } } }, { x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4, T: 0.3 });
    else if (e.ev === 'knightWave') { crownFall(R, e.x, e.y); chainBurst(R, e.x, e.y, 10); }
    else if (e.ev === 'shoot') { const [x, y] = cls === 'MAGE' ? tipOf(e) : [e.x + Math.cos(e.a) * 26, e.y - 10 + Math.sin(e.a) * 26]; spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; crownSigil(c, o.x, o.y - 6 - k * 10, 9); }, { x, y, T: 0.3 }); }
    else if (e.ev === 'boom') { chainBurst(R, e.x, e.y, 8); for (let i = 0; i < 8; i++) part(R, e.x, e.y, (Math.random() - 0.5) * 200, -80 - Math.random() * 120, 0.6, i & 1 ? TS.y : TS.g, 4, 300); }
  },
  shot(R, ctx, s) { if (!ARROWS.has(s.kind) && s.kind !== 'orb' && s.kind !== 'sbolt' && s.kind !== 'sarrow' && s.kind !== 'shard') return false; spear(ctx, s.x, s.y, s.a, s.kind === 'arrow' ? 22 : 30, TS.y); if (Math.random() < 0.4) part(R, s.x, s.y, 0, -20, 0.4, TS.y, 3); return true; },
  dash(R, x, y) { spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const r = 14 + k * 40; for (let i = 0; i < 12; i++) { const a = i * 0.524, px2 = o.x + Math.cos(a) * r, py2 = o.y + 6 + Math.sin(a) * r * 0.45; line(c, px2, py2, px2 + Math.cos(a + 1.9) * 7, py2 + Math.sin(a + 1.9) * 4, WPP, TS.l, WPP); sq(c, px2, py2, WPP, TS.y); } }, { x, y, T: 0.45 }); chainBurst(R, x, y, 4); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.12)) { part(R, p.x + (Math.random() - 0.5) * 12, p.y + 8, (Math.random() - 0.5) * 20, -30, 0.6, Math.random() < 0.5 ? TS.y : TS.g, 3); if (Math.random() < 0.25) decal(R, (c, o, k) => { c.globalAlpha = 1 - k; line(c, o.x - 3, o.y + 2, o.x + 3, o.y - 2, WPP, TS.l, WPP); }, { x: p.x, y: p.y + 10, T: 1 }); } },
  charge(R, ctx, p, t) { const n = 6, rr = 30; for (let i = 0; i < n; i++) { const a = t * 2 + i * 6.283 / n, x = p.x + Math.cos(a) * rr, y = p.y - 6 + Math.sin(a) * rr * 0.45; chainLink(ctx, x, y, a, i & 1 ? TS.s : TS.st); } if (p.charge > 0.6) crownSigil(ctx, p.x, p.y - 52, 7); },
  impact(R, x, y, r, cat) { const n = cat === 'duo' ? 3 : 1; for (let i = 0; i < n; i++) spearFall(R, x + (n > 1 ? (i - 1) * r * 0.5 : 0), y + (n > 1 ? (i & 1) * 14 : 0), i * 0.07); }
};
function spearFall(R, x, y, delay = 0) { spawn(R, (c, o, k, t, R2) => { // giáo Valkyrie cắm xuống + sóng tàn vàng + mắt xích văng
  const kk = Math.max(0, (k - o.delay) / (1 - o.delay)), f = Math.min(1, kk * 4); if (kk <= 0) return;
  if (f < 1) spear(c, o.x + 40 * (1 - f), o.y - 300 * (1 - f), Math.atan2(300, -40), 40, TS.y);
  else { if (!o.hit) { o.hit = true; chainBurst(R2, o.x, o.y, 6); for (let i = 0; i < 10; i++) part(R2, o.x, o.y, (Math.random() - 0.5) * 240, -100 - Math.random() * 100, 0.7, i & 1 ? TS.y : TS.w, 4, 400); }
    const k2 = (kk - 0.25) / 0.75; c.globalAlpha = 1 - k2; spear(c, o.x, o.y, Math.atan2(300, -40), 40, TS.y); for (let i = 0; i < 14; i++) { const a = i * 0.449, d = 10 + k2 * 60; sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.5, WPP, i & 1 ? TS.y : TS.g); } }
}, { x, y, delay, T: 0.7 }); }
function crownFall(R, x, y) { spawn(R, (c, o, k) => { c.globalAlpha = 1 - k * k; crownSigil(c, o.x, o.y - 70 + Math.min(1, k * 4) * 50, 16); for (let i = 0; i < 16; i++) { const a = i * 0.393, d = 20 + k * o.r; sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.55, WPP * 2, i & 1 ? TS.y : TS.g); } }, { x, y, r: 140, T: 0.5 }); }

// =====================================================================================
// HEROES — Dragon Knight: quét cánh rồng lửa sát đất, vết vuốt cháy trên cỏ, khói đen-vàng, răng nanh đan chéo, mạch dung nham phun
// =====================================================================================
const DK = { k: '#140404', d: '#5a0e08', r: '#9a1e12', c: '#c8301a', o: '#ff8a2a', g: '#ffd36b', w: '#ffffff' };
function fang(c, x, y, a, r, A, side, k) { // một nanh rồng cong: dày ở gốc, nhọn ở chóp
  const n = 14; for (let i = 0; i <= n * Math.min(1, k * 2.6); i++) { const u = i / n, q = a + side * (A / 2 - A * u), rr = r * (0.75 + 0.25 * Math.sin(u * Math.PI)), w = (1 - u) * 5 + 1, x2 = x + Math.cos(q) * rr, y2 = y + Math.sin(q) * rr; sq(c, x2, y2, WPP * Math.round(w), u > 0.8 ? DK.w : side > 0 ? DK.g : DK.c); if (i % 3 === 0) sq(c, x2 - Math.cos(q) * w * 2, y2 - Math.sin(q) * w * 2, WPP, DK.k); }
}
function geyser(R, x, y, h = 90) { spawn(R, (c, o, k) => { c.globalAlpha = Math.min(1, (1 - k) * 2.5); const hh = Math.sin(Math.min(1, k * 1.8) * Math.PI) * o.h; for (let yy = 0; yy < hh; yy += WPP * 2) { const w = (1 - yy / hh) * 10 + 4; sq(c, o.x + Math.sin(yy * 0.2 + o.seed) * 3, o.y - yy, w + 4, DK.k); sq(c, o.x + Math.sin(yy * 0.2 + o.seed) * 3, o.y - yy, w, yy > hh * 0.7 ? DK.g : DK.o); } disc(c, o.x, o.y, 14, DK.d, 0.45); disc(c, o.x, o.y, 8, DK.g, 0.45); if (k < 0.5 && Math.random() < 0.5) part(R, o.x, o.y - hh, (Math.random() - 0.5) * 120, -80, 0.6, DK.g, 4, 500); }, { x, y, h, T: 0.75 }); }
const dragonKnight = {
  basic(R, e) {
    if (e.ev === 'swing') { const big = e.charge > 0.3; spawn(R, (c, o, k) => { c.globalAlpha = 1 - k * k; fang(c, o.x, o.y, o.a, o.r, o.arc, 1, k); fang(c, o.x, o.y, o.a, o.r * 0.88, o.arc * 0.85, -1, Math.max(0, k - 0.08)); }, { x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4, T: big ? 0.4 : 0.3 }); if (big) geyser(R, e.x + Math.cos(e.a) * (e.reach || 104) * 0.7, e.y + Math.sin(e.a) * (e.reach || 104) * 0.7, 70); }
    else if (e.ev === 'knightWave') spawn(R, (c, o, k) => { // vòng răng nanh chĩa vào trong
      c.globalAlpha = 1 - k; const r = o.r * (0.3 + 0.7 * k); for (let i = 0; i < 14; i++) { const a = i * 0.449, x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r * 0.75; tri(c, [x + Math.cos(a + 1.57) * 7, y + Math.sin(a + 1.57) * 5], [x - Math.cos(a + 1.57) * 7, y - Math.sin(a + 1.57) * 5], [x - Math.cos(a) * 16, y - Math.sin(a) * 12], i & 1 ? DK.g : DK.c); } }, { x: e.x, y: e.y, r: e.r, T: 0.45 });
  },
  dash(R, x, y, dx, dy) {
    spawn(R, (c, o, k) => { // cánh rồng lửa quét thấp sát đất phía sau
      const a = Math.atan2(o.dy, o.dx) + Math.PI, sweep = Math.min(1, k * 2.2); c.globalAlpha = (1 - k) * 0.9;
      for (const side of [-1, 1]) { const base = [o.x, o.y + 4], spars = 4; for (let s = 0; s <= spars; s++) { const q = a + side * (0.25 + s * 0.22) * sweep, L = 70 - s * 8, tip = [o.x + Math.cos(q) * L, o.y + 4 + Math.sin(q) * L * 0.45]; if (s > 0) { const pq = a + side * (0.25 + (s - 1) * 0.22) * sweep, pt = [o.x + Math.cos(pq) * (L + 8), o.y + 4 + Math.sin(pq) * (L + 8) * 0.45]; tri(c, base, pt, tip, s & 1 ? DK.r : DK.c); } line(c, base[0], base[1], tip[0], tip[1], WPP, DK.k, WPP); sq(c, tip[0], tip[1], WPP, DK.g); } } }, { x: x + dx * 60, y: y + dy * 60, dx, dy, T: 0.4 });
    clawMark(R, x, y, Math.atan2(dy, dx));
  },
  walk(R, ctx, p, t, dt, moving) { if (!moving) return; if (every(R, '_lw', dt, 0.34)) clawMark(R, p.x, p.y + 10, Math.atan2(p.vy, p.vx), 0.55); if (every(R, '_lw2', dt, 0.09)) part(R, p.x + (Math.random() - 0.5) * 14, p.y + 6, (Math.random() - 0.5) * 16, -26, 0.9, Math.random() < 0.7 ? '#1a1414' : DK.g, Math.random() < 0.7 ? 6 : 3); },
  charge(R, ctx, p, t) { const a = p.aim, n = Math.round(4 + p.charge * 6); for (let i = 0; i < n; i++) { const d = 16 + i * 6, x = p.x + Math.cos(a) * d, y = p.y + HAND_Y + Math.sin(a) * d, h = 6 + H(i, (t * 14) | 0) * 10 * p.charge; line(ctx, x, y, x - 2, y - h, WPP * 2, DK.o, WPP); sq(ctx, x - 2, y - h, WPP, DK.g); } },
  impact(R, x, y, r, cat, e) { geyser(R, x, y, cat === 'duo' ? 120 : 80); spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; fang(c, o.x - 30, o.y, 0, 40, 1.6, 1, k); fang(c, o.x + 30, o.y, Math.PI, 40, 1.6, -1, k); }, { x, y, T: 0.35 }); if (cat === 'duo') { geyser(R, x - r * 0.5, y + 10, 70); geyser(R, x + r * 0.5, y - 6, 70); } }
};
function clawMark(R, x, y, a, sc = 1) { decal(R, (c, o, k) => { const col = k < 0.2 ? DK.g : k < 0.5 ? DK.o : '#2a1410'; c.globalAlpha = Math.min(1, (1 - k) * 1.6); for (let j = -1; j <= 1; j++) { const nx = -Math.sin(o.a) * j * 6 * o.sc, ny = Math.cos(o.a) * j * 4 * o.sc; line(c, o.x + nx - Math.cos(o.a) * 12 * o.sc, o.y + ny - Math.sin(o.a) * 6 * o.sc, o.x + nx + Math.cos(o.a) * 12 * o.sc, o.y + ny + Math.sin(o.a) * 6 * o.sc, WPP, j ? '#1a0e0a' : col, WPP); } }, { x, y, a, sc, T: 2 }); }

// =====================================================================================
// HEROES — Starlight Huntress: lưới toàn ký, dây laser chòm sao, mưa sao quỹ đạo
// =====================================================================================
const SL = { d: '#0e1a3a', b: '#3a6aa8', c: '#7fe0ff', p: '#c08aff', y: '#ffe27a', w: '#ffffff' };
function bracketBox(c, x, y, r, rot, col) { for (let i = 0; i < 4; i++) { const a = rot + i * 1.571, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r; line(c, cx, cy, cx + Math.cos(a + 2.356) * r * 0.5, cy + Math.sin(a + 2.356) * r * 0.5, WPP, col, WPP); line(c, cx, cy, cx + Math.cos(a - 2.356) * r * 0.5, cy + Math.sin(a - 2.356) * r * 0.5, WPP, col, WPP); } }
const starlight = {
  only: ['move', 'single', 'duo', 'ult-sub', 'shoot'],
  basic(R, e) { if (e.ev === 'shoot') { const x = e.x + Math.cos(e.a) * 28, y = e.y - 10 + Math.sin(e.a) * 28; spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; bracketBox(c, o.x, o.y, 8 + k * 16, k * 3, SL.c); }, { x, y, T: 0.22 }); } },
  dash(R, x, y, dx, dy) { spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const n = 5; let px2 = o.x, py2 = o.y; for (let i = 1; i <= n; i++) { const u = i / n, x2 = o.x + o.dx * 110 * u + (H(i, o.seed) - 0.5) * 20, y2 = o.y + o.dy * 110 * u + (H(o.seed, i) - 0.5) * 14; line(c, px2, py2, x2, y2, WPP, SL.b, WPP * 2); sq(c, x2, y2, WPP * 2, i === n ? SL.w : SL.c); px2 = x2; py2 = y2; } bracketBox(c, px2, py2, 12, k * 4, SL.w); }, { x, y: y - 6, dx, dy, T: 0.5 }); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.08)) decal(R, (c, o, k) => { if ((Math.floor(k * 12) & 1) && k > 0.5) return; c.globalAlpha = (1 - k) * 0.8; const s = 6; poly(c, [[o.x - s, o.y], [o.x, o.y - s * 0.5], [o.x + s, o.y], [o.x, o.y + s * 0.5], [o.x - s, o.y]], WPP, k < 0.3 ? SL.c : SL.b); }, { x: sn(p.x / 12) * 12, y: sn((p.y + 10) / 8) * 8, T: 0.7 }); },
  impact(R, x, y, r, cat) { const n = cat === 'duo' ? 5 : 3; spawn(R, (c, o, k) => { // khoá mục tiêu rồi mưa sao xiên từ quỹ đạo
    c.globalAlpha = 1 - k * 0.6; bracketBox(c, o.x, o.y, o.r * (0.6 - k * 0.3), k * 2, SL.w);
    for (let i = 0; i < o.n; i++) { const f = (k - i * 0.06) * 3; if (f < 0 || f > 1.6) continue; const tx = o.x + (H(i, o.seed) - 0.5) * o.r, ty = o.y + (H(o.seed, i) - 0.5) * o.r * 0.6; if (f < 1) { const sx = tx + 160 * (1 - f), sy = ty - 260 * (1 - f); line(c, sx + 30, sy - 50, sx, sy, WPP * 2, i & 1 ? SL.p : SL.c, WPP); sq(c, sx, sy, WPP * 2, SL.w); } else { const kk = f - 1; for (let q = 0; q < 4; q++) { const a = q * 1.571 + 0.785; line(c, tx, ty, tx + Math.cos(a) * 14 * (1 - kk), ty + Math.sin(a) * 14 * (1 - kk), WPP, SL.w, WPP); } } } }, { x, y, r, n, T: 0.65 }); }
};

// =====================================================================================
// HEROES — Celestial Archon: lưỡi hào quang xoay, nhật thực (phần tụ lực / đòn / chiêu nằm trong skinvfx)
// =====================================================================================
const CE = { v: '#2a0e5a', g: '#ffb81a', y: '#fff2a0', w: '#ffffff', p: '#9a4aff' };
function haloBlade(c, x, y, r, rot) { for (let i = 0; i < 20; i++) { const a = rot + i * 0.314, px2 = x + Math.cos(a) * r, py2 = y + Math.sin(a) * r * 0.45; sq(c, px2, py2, WPP, i % 5 ? CE.g : CE.w); if (i % 5 === 0) tri(c, [px2, py2], [px2 + Math.cos(a + 0.4) * 9, py2 + Math.sin(a + 0.4) * 4], [px2 + Math.cos(a) * 12, py2 + Math.sin(a) * 5], CE.y); } }
export function eclipse(c, x, y, r, k, t) { // nhật thực: đĩa tối + vành nhật hoa răng cưa vàng trắng, viền tím
  disc(c, x, y, r + 6, CE.p, 1); disc(c, x, y, r + 3, CE.g, 1); disc(c, x, y, r, '#05030c', 1);
  for (let i = 0; i < 24; i++) { const a = i * 0.262 + t * 0.6, L = r + 6 + (i & 1 ? 10 : 18) * (0.6 + 0.4 * Math.sin(t * 8 + i)); line(c, x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4), x + Math.cos(a) * L, y + Math.sin(a) * L, WPP, i & 1 ? CE.y : CE.w, WPP); }
}
const celestial = {
  only: ['move', 'ult'],
  dash(R, x, y, dx, dy) { spawn(R, (c, o, k) => { c.globalAlpha = 1 - k * k; const d = 110 * Math.min(1, k * 1.6); haloBlade(c, o.x + o.dx * d, o.y - 4 + o.dy * d, 18, k * 14); }, { x, y, dx, dy, T: 0.45 }); },
  walk(R, ctx, p, t, dt, moving) { ctx.globalAlpha = 0.55; haloBlade(ctx, p.x, p.y + 10, 16, t * 2); ctx.globalAlpha = 1; if (moving && every(R, '_lw', dt, 0.3)) part(R, p.x - p.vx * 0.05, p.y - 20, (Math.random() - 0.5) * 30, 20, 1, CE.w, 3); },
  ult(R, e, sim) { const p = sim.p, a = p.aim, tx = p.x + Math.cos(a) * 180, ty = p.y + Math.sin(a) * 180; spawn(R, (c, o, k, t) => { const s = Math.sin(Math.min(1, k * 1.4) * Math.PI); c.globalAlpha = Math.min(1, (1 - k) * 3); eclipse(c, o.x, o.y - 120, 10 + 26 * s, k, t); for (let i = 0; i < 5; i++) { const q = i * 1.256 + t, L = 140 * s; line(c, o.x, o.y - 120, o.x + Math.cos(q) * L, o.y - 120 + Math.sin(q) * L * 0.5 + L * 0.6, WPP, CE.y, WPP * 3); } }, { x: tx, y: ty, T: 1.6 }); return false; }   // vẫn chạy cảnh thiên thần (seraph) của skinvfx
};

// =====================================================================================
// BOSS — Ashen Colossus: đúng đòn của Colossus: khe nứt dung nham, đá núi lửa văng, sóng lò luyện
// =====================================================================================
const AS = { k: '#1c1210', s: '#3a2a22', m: '#5a4234', o: '#ff6a1e', y: '#ffd36b' };
const ashen = {
  basic(R, e, cls) {
    if (e.ev === 'swing') bossHit(R, 'COLOSSUS', { kind: 'arc', x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4 });
    else if (e.ev === 'knightWave') bossWave(R, 'COLOSSUS', e.x, e.y, e.r, 0.5, 14);
    else if (e.ev === 'boom') bossHit(R, 'COLOSSUS', { kind: 'circle', x: e.x, y: e.y, r: (e.r || 70) * 0.8 });
    else if (e.ev === 'shoot') { const [x, y] = cls === 'MAGE' ? tipOf(e) : [e.x + Math.cos(e.a) * 26, e.y - 10 + Math.sin(e.a) * 26]; for (let i = 0; i < 4; i++) part(R, x, y, Math.cos(e.a) * 80 + (Math.random() - 0.5) * 60, -60 - Math.random() * 60, 0.5, i & 1 ? AS.m : AS.o, 5, 500); }
  },
  shot(R, ctx, s, cat, t) { if (!ARROWS.has(s.kind) && !['orb', 'sbolt', 'sarrow', 'shard', 'spark'].includes(s.kind)) return false; const r = Math.max(5, (s.r || 6) * 0.9); disc(ctx, s.x, s.y, r + 3, AS.k); disc(ctx, s.x, s.y, r, AS.s); for (let i = 0; i < 3; i++) { const a = i * 2.094 + s.x * 0.05; line(ctx, s.x, s.y, s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, WPP, (t * 10 | 0) % 3 === i ? AS.y : AS.o, WPP); } if (Math.random() < 0.5) part(R, s.x, s.y, 0, -30, 0.6, '#3a2a22', 7); return true; },
  dash(R, x, y) { bossWave(R, 'COLOSSUS', x, y + 6, 60, 0.4, 10); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.24)) decal(R, (c, o, k) => { const col = k < 0.35 ? AS.y : k < 0.7 ? AS.o : AS.s; c.globalAlpha = Math.min(1, (1 - k) * 2); poly(c, [[o.x - 7, o.y], [o.x - 2, o.y - 2], [o.x + 2, o.y + 2], [o.x + 7, o.y - 1]], WPP, col); }, { x: p.x, y: p.y + 10, T: 1.4 }); },
  charge(R, ctx, p, t) { for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.3, L = 20 + p.charge * 26, pts = [[p.x, p.y + 10]]; for (let s = 1; s <= 3; s++) pts.push([p.x + Math.cos(a + (H(i, s) - 0.5) * 0.5) * L * s / 3, p.y + 10 + Math.sin(a + (H(s, i) - 0.5) * 0.5) * L * s / 3 * 0.5]); poly(ctx, pts, WPP, (t * 8 + i | 0) % 3 ? AS.o : AS.y); } },
  impact(R, x, y, r, cat) { bossHit(R, 'COLOSSUS', { kind: 'circle', x, y, r: r * 0.85 }); bossWave(R, 'COLOSSUS', x, y, r * (cat === 'single' ? 1.1 : 1.6), 0.5, 12); }
};

// =====================================================================================
// BOSS — Frostbound (Frost Warden): giáo băng của Warden, sàn đóng băng, mảnh bão tuyết
// =====================================================================================
const FW = { d: '#0a1e3a', b: '#2f7ac8', l: '#7fd0ff', p: '#c8f4ff', w: '#ffffff' };
function iceLance(c, x, y, a, L) { const ca = Math.cos(a), sa = Math.sin(a); for (let u = -L; u <= 12; u += WPP) { const w2 = u > 2 ? Math.max(WPP, (12 - u) * 0.7) : u < -L + 6 ? WPP : 6; sq(c, x + ca * u, y + sa * u, w2 + WPP * 2, FW.d); } for (let u = -L + 2; u <= 10; u += WPP) { const w2 = u > 2 ? Math.max(WPP, (12 - u) * 0.6) : 3; sq(c, x + ca * u, y + sa * u, w2, u > -10 ? FW.w : FW.p); } }
const iceTile = (R, x, y, s = 10, T = 1.6) => decal(R, (c, o, k) => { c.globalAlpha = Math.min(1, (1 - k) * 2) * 0.85; const S = o.s; tri(c, [o.x, o.y - S * 0.5], [o.x - S, o.y], [o.x + S, o.y], FW.p); tri(c, [o.x, o.y + S * 0.5], [o.x - S, o.y], [o.x + S, o.y], FW.l); poly(c, [[o.x - S, o.y], [o.x, o.y - S * 0.5], [o.x + S, o.y]], WPP, FW.w); }, { x, y, s, T });
const frostbound = {
  basic(R, e, cls) {
    if (e.ev === 'swing') bossHit(R, 'WARDEN', { kind: 'line', x: e.x, y: e.y, a: e.a, len: (e.reach || 104) * 1.1, width: 26 });   // nhát giáo băng thẳng như kích của Warden
    else if (e.ev === 'knightWave') { bossHit(R, 'WARDEN', { kind: 'circle', x: e.x, y: e.y, r: e.r * 0.7 }); for (let i = 0; i < 6; i++) iceTile(R, e.x + Math.cos(i * 1.047) * 40, e.y + Math.sin(i * 1.047) * 24, 12); }
    else if (e.ev === 'boom') { bossHit(R, 'WARDEN', { kind: 'circle', x: e.x, y: e.y, r: (e.r || 70) * 0.8 }); iceTile(R, e.x, e.y, 16); }
    else if (e.ev === 'shoot') for (let i = 0; i < 5; i++) part(R, e.x + Math.cos(e.a) * 26, e.y - 10 + Math.sin(e.a) * 26, Math.cos(e.a + (Math.random() - 0.5)) * 160, Math.sin(e.a + (Math.random() - 0.5)) * 160, 0.3, FW.w, 3);
  },
  shot(R, ctx, s) { if (!ARROWS.has(s.kind) && !['orb', 'sbolt', 'sarrow', 'shard', 'spark'].includes(s.kind)) return false; iceLance(ctx, s.x, s.y, s.a, s.kind === 'arrow' ? 26 : 40); return true; },
  dash(R, x, y, dx, dy) { iceTile(R, x, y + 8, 14); for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283; part(R, x, y - 10, Math.cos(a) * 200, Math.sin(a) * 140, 0.4, i & 1 ? FW.w : FW.l, 3); } },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.16)) iceTile(R, sn(p.x / 18) * 18, sn((p.y + 12) / 10) * 10, 9, 1.4); },
  charge(R, ctx, p, t) { const n = 8; for (let i = 0; i < n; i++) { const a = i * 0.785, d = 40 - p.charge * 10, x = p.x + Math.cos(a) * d, y = p.y + 10 + Math.sin(a) * d * 0.45, h = 6 + p.charge * 14; for (let yy = 0; yy < h; yy += WPP) sq(ctx, x, y - yy, Math.max(WPP, (h - yy) * 0.5), yy > h * 0.6 ? FW.w : FW.l); } },
  impact(R, x, y, r, cat, e) { bossHit(R, 'WARDEN', { kind: 'circle', x, y, r: r * 0.9 }); iceTile(R, x, y, 18, 2); if (cat !== 'single') for (let i = 0; i < 4; i++) iceTile(R, x + Math.cos(i * 1.571 + 0.785) * r * 0.6, y + Math.sin(i * 1.571 + 0.785) * r * 0.35, 12, 2); }
};

// =====================================================================================
// BOSS — Sporeback (Behemoth): mây bào tử phát quang, vũng axit sủi bọt, dây gai trồi lên
// =====================================================================================
const SP = { d: '#14200a', g: '#3a7a1e', l: '#7ad03a', y: '#c8ff6a', p: '#b45ae8', c: '#3ad0e0', w: '#f4ffd0' };
const acidPool = (R, x, y, r, T = 1.8) => decal(R, (c, o, k) => { c.globalAlpha = Math.min(1, (1 - k) * 2) * 0.85; disc(c, o.x, o.y, o.r, SP.g, 0.45); disc(c, o.x, o.y, o.r * 0.7, SP.l, 0.45); for (let i = 0; i < 4; i++) { const ph = (o.t * 2 + i * 0.27) % 1, a = H(i, o.seed) * 6.283, d = o.r * 0.5 * H(o.seed, i); if (ph < 0.7) sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.4 - ph * 6, WPP * (ph < 0.5 ? 1 : 2), ph > 0.5 ? SP.w : SP.y); } }, { x, y, r, T });
function vines(R, x, y, r) { spawn(R, (c, o, k) => { const rise = Math.min(1, k * 4); c.globalAlpha = Math.min(1, (1 - k) * 3); for (let j = 0; j < 5; j++) { const a = j * 1.256 + o.seed, bx = o.x + Math.cos(a) * o.r * 0.5, by = o.y + Math.sin(a) * o.r * 0.3, h = (30 + (j % 3) * 14) * rise; for (let s = 0; s <= h; s += WPP * 2) { const w = Math.sin(s * 0.15 + j) * 5; sq(c, bx + w, by - s, WPP * 2, SP.g); if ((s / (WPP * 2) | 0) % 3 === 1) sq(c, bx + w + 4, by - s, WPP, SP.y); } sq(c, bx + Math.sin(h * 0.15 + j) * 5, by - h, WPP * 2, SP.p); } }, { x, y, r, T: 0.8 }); }
const sporeCloud = (R, x, y, r) => spawn(R, (c, o, k) => { c.globalAlpha = (1 - k) * 0.6; for (let i = 0; i < 7; i++) { const a = i * 0.898 + o.seed + k, d = o.r * (0.2 + 0.5 * k) * (0.6 + 0.4 * H(i, o.seed)); disc(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.6 - k * 14, 8 + k * 10, i & 1 ? SP.g : '#5a3a7a', 0.7); sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.6 - k * 20, WPP, i % 3 ? SP.c : SP.y); } }, { x, y, r, T: 0.9 });
const sporeback = {
  basic(R, e, cls) {
    if (e.ev === 'swing') spawn(R, (c, o, k) => { // roi dây gai quất theo cung
      const A = o.arc, pr = Math.min(1, k * 2.5); c.globalAlpha = 1 - k; for (let i = 0; i <= 18 * pr; i++) { const u = i / 18, a = o.a - A / 2 + A * u, rr = o.r + Math.sin(u * 12) * 6, x = o.x + Math.cos(a) * rr, y = o.y + Math.sin(a) * rr; sq(c, x, y, WPP * 2, SP.g); if (i % 3 === 0) { sq(c, x + Math.cos(a) * 5, y + Math.sin(a) * 5, WPP, SP.y); sq(c, x - Math.cos(a) * 5, y - Math.sin(a) * 5, WPP, SP.y); } } }, { x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4, T: 0.32 });
    else if (e.ev === 'knightWave') { bossHit(R, 'BEHEMOTH', { kind: 'circle', x: e.x, y: e.y, r: e.r * 0.7 }); sporeCloud(R, e.x, e.y, e.r * 0.8); }
    else if (e.ev === 'boom') { sporeCloud(R, e.x, e.y, e.r || 70); acidPool(R, e.x, e.y, 16, 1.2); }
    else if (e.ev === 'shoot') sporeCloud(R, e.x + Math.cos(e.a) * 26, e.y - 10 + Math.sin(e.a) * 26, 20);
  },
  shot(R, ctx, s, cat, t) { if (!ARROWS.has(s.kind) && !['orb', 'sbolt', 'sarrow', 'shard', 'spark'].includes(s.kind)) return false; const r = Math.max(5, (s.r || 6)); disc(ctx, s.x, s.y, r + 2, SP.d); disc(ctx, s.x, s.y, r, SP.l); sq(ctx, s.x - 2, s.y - 2, WPP * 2, SP.p); sq(ctx, s.x + 3, s.y + 1, WPP, SP.c); if (Math.random() < 0.4) part(R, s.x, s.y, 0, 40, 0.5, SP.y, 3, 300); return true; },
  dash(R, x, y) { sporeCloud(R, x, y, 50); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.3)) acidPool(R, p.x + (Math.random() - 0.5) * 8, p.y + 11, 6, 1.1); if (moving && Math.random() < 0.15) part(R, p.x, p.y, (Math.random() - 0.5) * 20, -20, 1.2, Math.random() < 0.5 ? SP.c : SP.y, 3); },
  charge(R, ctx, p, t) { for (let i = 0; i < 12; i++) { const a = i * 0.524 + t * 1.5, d = 50 * (1 - ((t * 0.9 + i * 0.08) % 1)); sq(ctx, p.x + Math.cos(a) * d, p.y - 6 + Math.sin(a) * d * 0.6, WPP * 2, i % 3 ? SP.y : SP.c); } },
  impact(R, x, y, r, cat) { acidPool(R, x, y, r * 0.45, 2); vines(R, x, y, r); if (cat !== 'single') sporeCloud(R, x, y, r); }
};

// =====================================================================================
// BOSS — Stormcrown (Storm Sovereign): sét gấp khúc cao thế từ trời, tia sao huyền bí xoay
// =====================================================================================
const SV = { d: '#0c0a2a', p: '#5a3ad0', b: '#8ab8ff', l: '#d8f0ff', w: '#ffffff', y: '#ffe27a' };
function starBeams(R, x, y, r, n = 4, T = 0.6) { spawn(R, (c, o, k, t) => { // các tia sáng xoay quanh tâm như đòn tia của Sovereign
  c.globalAlpha = Math.min(1, (1 - k) * 2); const rot = o.seed + k * 2.6, L = o.r * Math.min(1, k * 3);
  for (let i = 0; i < o.n; i++) { const a = rot + i * 6.283 / o.n, ex = o.x + Math.cos(a) * L, ey = o.y + Math.sin(a) * L * 0.7; line(c, o.x, o.y, ex, ey, WPP * 3, SV.p, WPP); line(c, o.x, o.y, ex, ey, WPP, SV.l, WPP); sq(c, ex, ey, WPP * 2, SV.w); }
  sq(c, o.x, o.y, WPP * 3, SV.y); }, { x, y, r, n, T }); }
const stormcrown = {
  basic(R, e, cls) {
    if (e.ev === 'swing') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const A = o.arc; for (let j = 0; j < 3; j++) { const a1 = o.a - A / 2 + A * j / 3, a2 = a1 + A / 3; zig(c, o.x + Math.cos(a1) * o.r, o.y + Math.sin(a1) * o.r, o.x + Math.cos(a2) * o.r, o.y + Math.sin(a2) * o.r, o.seed + j + ((k * 20) | 0), SV.b, SV.w, 2, 4, 16); } }, { x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4, T: 0.25 });
    else if (e.ev === 'knightWave') { bossHit(R, 'SOVEREIGN', { kind: 'circle', x: e.x, y: e.y, r: e.r * 0.6 }); starBeams(R, e.x, e.y, e.r, 6); }
    else if (e.ev === 'boom') { bossHit(R, 'SOVEREIGN', { kind: 'circle', x: e.x, y: e.y, r: (e.r || 70) * 0.7 }); starBeams(R, e.x, e.y, (e.r || 70) * 1.2, 4, 0.45); }
    else if (e.ev === 'shoot') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; for (let j = 0; j < 3; j++) zig(c, o.x, o.y, o.x + Math.cos(o.a + (j - 1) * 0.5) * 30, o.y + Math.sin(o.a + (j - 1) * 0.5) * 30, o.seed + j, SV.b, SV.w, 1, 3, 10); }, { x: e.x + Math.cos(e.a) * 24, y: e.y - 10 + Math.sin(e.a) * 24, a: e.a, T: 0.15 });
  },
  shot(R, ctx, s, cat, t) { if (!ARROWS.has(s.kind) && !['orb', 'sbolt', 'sarrow', 'shard', 'spark'].includes(s.kind)) return false; const r = Math.max(5, (s.r || 6) * 0.8), sd = (t * 30) | 0; disc(ctx, s.x, s.y, r + 2, SV.p); disc(ctx, s.x, s.y, r, SV.l); for (let j = 0; j < 3; j++) { const a = H(j, sd) * 6.283; zig(ctx, s.x, s.y, s.x + Math.cos(a) * (r + 12), s.y + Math.sin(a) * (r + 12), sd + j, SV.b, null, 1, 3, 8); } return true; },
  dash(R, x, y, dx, dy) { spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; zig(c, o.x, o.y - 10, o.x + o.dx * 110, o.y - 10 + o.dy * 110, o.seed + ((k * 25) | 0), SV.p, SV.w, 2, 6, 20); }, { x, y, dx, dy, T: 0.3 }); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.1)) decal(R, (c, o, k) => { if (k > 0.5) return; c.globalAlpha = 1 - k * 2; zig(c, o.x, o.y, o.x + 10, o.y - 3, o.seed, SV.b, SV.w, 1, 3, 6); }, { x: p.x - 5 + (Math.random() - 0.5) * 8, y: p.y + 10, T: 0.4 }); },
  charge(R, ctx, p, t) { const sd = (t * 20) | 0, pts = [0, 1, 2, 3].map(i => [p.x + Math.cos(t * 3 + i * 1.571) * 36, p.y - 8 + Math.sin(t * 3 + i * 1.571) * 18]); pts.forEach(([x, y], i) => { sq(ctx, x, y, WPP * 3, ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff'][i]); if (p.charge > 0.3) zig(ctx, x, y, pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], sd + i, SV.b, SV.w, 1, 4, 10); }); },
  impact(R, x, y, r, cat) { bossHit(R, 'SOVEREIGN', { kind: 'circle', x, y, r: r * 0.8 }); if (cat !== 'single') starBeams(R, x, y, r * 1.3, cat === 'ult' ? 8 : 5); }
};

// =====================================================================================
// BOSS — Ignivar: luồng lửa rồng răng cưa, vệt đất cháy, sóng gió từ đôi cánh; tuyệt kỹ = xoắn địa ngục
// =====================================================================================
const IG = { k: '#24080a', d: '#40100e', r: '#9a2e1c', o: '#ff7a2a', y: '#ffe27a', b: '#f0e0c0' };
const scorch = (R, x, y, a, L = 18, T = 2.2) => decal(R, (c, o, k) => { c.globalAlpha = Math.min(1, (1 - k) * 2) * 0.8; line(c, o.x, o.y, o.x + Math.cos(o.a) * o.L, o.y + Math.sin(o.a) * o.L * 0.5, WPP * 3, '#1a0a08', WPP); if (k < 0.5 && (Math.floor(o.t * 10 + o.seed) & 1)) sq(c, o.x + Math.cos(o.a) * o.L * H(1, o.seed), o.y + Math.sin(o.a) * o.L * 0.5 * H(1, o.seed), WPP, IG.o); }, { x, y, a, L, T });
function flameJet(c, x, y, a, L, A, seed, k) { for (let i = 0; i < 9; i++) { const u = i / 8 - 0.5, q = a + u * A, d = L * (0.6 + 0.4 * H(i, seed)) * Math.min(1, k * 3); let px2 = x, py2 = y; for (let s = 1; s <= 4; s++) { const qx = x + Math.cos(q + (H(s, i + seed) - 0.5) * 0.3) * d * s / 4, qy = y + Math.sin(q + (H(i, s + seed) - 0.5) * 0.3) * d * s / 4; line(c, px2, py2, qx, qy, WPP * (4 - s * 0.6), s > 2 ? IG.y : IG.o, WPP); px2 = qx; py2 = qy; } } }
const wingGust = (R, x, y, a) => spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; for (const sd of [-1, 1]) { const r = 20 + k * 60; for (let i = 0; i <= 10; i++) { const q = o.a + sd * (0.6 + i * 0.12), px2 = o.x + Math.cos(q) * r, py2 = o.y + Math.sin(q) * r * 0.6; sq(c, px2, py2, WPP * (i < 5 ? 2 : 1), i & 1 ? IG.b : IG.o); } } }, { x, y, a, T: 0.4 });
const ignivar = {
  basic(R, e, cls) {
    if (e.ev === 'swing') bossHit(R, 'DRAGON', { kind: 'arc', x: e.x, y: e.y, a: e.a, r: e.reach || 104, arc: e.arc || 1.4 });   // ba vết vuốt than hồng như Ignivar
    else if (e.ev === 'knightWave') { wingGust(R, e.x, e.y, Math.PI); wingGust(R, e.x, e.y, 0); }
    else if (e.ev === 'boom') { bossHit(R, 'DRAGON', { kind: 'circle', x: e.x, y: e.y, r: (e.r || 70) * 0.8 }); for (let i = 0; i < 3; i++) scorch(R, e.x, e.y, i * 2.094 + Math.random()); }
    else if (e.ev === 'shoot') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; flameJet(c, o.x, o.y, o.a, 40, 0.5, o.seed, k); }, { x: e.x + Math.cos(e.a) * 24, y: e.y - 10 + Math.sin(e.a) * 24, a: e.a, T: 0.2 });
  },
  shot(R, ctx, s, cat, t) { if (!ARROWS.has(s.kind) && !['orb', 'sbolt', 'sarrow', 'shard', 'spark'].includes(s.kind)) return false; const r = Math.max(5, (s.r || 6) * 0.9), ca = Math.cos(s.a), sa = Math.sin(s.a); for (let j = -1; j <= 1; j++) for (let i = 1; i <= 4; i++) sq(ctx, s.x - ca * i * 7 - sa * j * (3 + i * 1.5) + (H(i, (t * 20) | 0) - 0.5) * 4, s.y - sa * i * 7 + ca * j * (3 + i * 1.5), WPP * (3 - i * 0.5), i < 2 ? IG.y : IG.o); disc(ctx, s.x, s.y, r, IG.y); sq(ctx, s.x, s.y, WPP * 2, '#ffffff'); return true; },
  dash(R, x, y, dx, dy) { const a = Math.atan2(dy, dx); wingGust(R, x, y, a + Math.PI); scorch(R, x, y + 8, a, 90, 2); },
  walk(R, ctx, p, t, dt, moving) { if (moving && every(R, '_lw', dt, 0.07)) scorch(R, p.x - p.vx * 0.03, p.y + 10, Math.atan2(p.vy, p.vx) + Math.PI, 10, 1.6); },
  charge(R, ctx, p, t) { for (let i = 0; i < 7; i++) { const x = p.x - 18 + i * 6, h = (8 + H(i, (t * 16) | 0) * 18) * p.charge; line(ctx, x, p.y + 10, x, p.y + 10 - h, WPP * 2, IG.o, WPP); sq(ctx, x, p.y + 10 - h, WPP, IG.y); } },
  impact(R, x, y, r, cat, e) { const a = e && e.a !== undefined ? e.a : Math.random() * 6.283; spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; flameJet(c, o.x - Math.cos(o.a) * 40, o.y - Math.sin(o.a) * 40, o.a, o.r * 1.2, 0.7, o.seed, k); }, { x, y, a, r, T: 0.4 }); bossHit(R, 'DRAGON', { kind: 'circle', x, y, r: r * 0.7 }); scorch(R, x, y, a, r, 2.4); },
  ult(R, e, sim) { const p = sim.p; spawn(R, (c, o, k, t) => { // xoắn địa ngục (Hell Spiral) của Ignivar: 4 nhánh luồng lửa xoay toả ra + vòng gió cánh
    c.globalAlpha = Math.min(1, (1 - k) * 3); const cx = sim.p.x, cy = sim.p.y, rot = k * 7;
    for (let j = 0; j < 4; j++) { const a0 = rot + j * 1.571; let px2 = cx, py2 = cy; for (let s = 1; s <= 10; s++) { const q = a0 + s * 0.22, d = s * 18 * Math.min(1, k * 2), qx = cx + Math.cos(q) * d, qy = cy + Math.sin(q) * d * 0.6; line(c, px2, py2, qx, qy, WPP * (4 - s * 0.25), s > 7 ? IG.y : s & 1 ? IG.o : IG.r, WPP); px2 = qx; py2 = qy; } }
    if (k > 0.5) { const r = (k - 0.5) * 400; for (let i = 0; i < 24; i++) { const q = i * 0.262; sq(c, cx + Math.cos(q) * r, cy + Math.sin(q) * r * 0.6, WPP * 2, i & 1 ? IG.b : IG.o); } }
  }, { T: 1.6 }); for (let i = 0; i < 6; i++) scorch(R, p.x, p.y, i * 1.047, 120, 2.6); R._skUlt = { t: 0, T: 0.6, c: IG.o, d: IG.k }; return true; }
};

// =====================================================================================
// TUYỆT KỸ HEROES — Starlight: "Orbital Constellation Valkyrie & Starfall Barrage"
//   pha 1: xé trời thành tinh vân nhiều lớp + mạng hoàng đạo xoay, nút sao nối bằng dây laser
//   pha 2: đại cung hồn ma (kèm cánh chim ưng sao) hiện trên đầu Xạ thủ, bắn 14 giáo ray lần lượt vào các nút,
//          mỗi phát: sóng kim cương, hố bụi sao còn đọng, tia sét lăng kính nối sang điểm trúng trước
// =====================================================================================
function nebula(c, x, y, R0, k, t, seed) {
  const layers = [['#140a3a', 1], ['#2a1a6a', 0.78], ['#4a2a9a', 0.58], ['#3a6ab8', 0.4], ['#7fe0ff', 0.22]];
  for (const [col, f] of layers) { const r = R0 * f * k; for (let i = 0; i < 26; i++) { const a = i * 0.2417 + seed, d = r * (0.3 + 0.7 * H(i, seed + f * 10)), bx = x + Math.cos(a + t * 0.15 * f) * d, by = y + Math.sin(a + t * 0.15 * f) * d * 0.42; disc(c, bx, by, Math.max(WPP, r * 0.28 * (0.5 + H(seed, i))), col, 0.5); } }
  for (let i = 0; i < 30; i++) { const a = H(i, seed) * 6.283, d = R0 * k * H(seed, i), tw = ((t * 6 + i) | 0) % 4; if (tw) sq(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.42, WPP, tw === 1 ? '#ffffff' : '#c08aff'); }
}
function greatbow(c, x, y, s, a, pull, t) { // đại cung hồn ma: cánh cung pixel, dây cung, cánh chim ưng sao phía sau
  const ca = Math.cos(a), sa = Math.sin(a), P = (u, v) => [x + (ca * u - sa * v) * s, y + (sa * u + ca * v) * s];
  for (const sd of [-1, 1]) for (let f = 0; f < 6; f++) { const [bx, by] = P(-6, sd * 6), q = a + Math.PI + sd * (0.5 + f * 0.28), L = (34 + f * 6) * s; line(c, bx, by, bx + Math.cos(q) * L, by + Math.sin(q) * L * 0.8, WPP, f & 1 ? '#3a6aa8' : '#8ac8ff', WPP * 2); sq(c, bx + Math.cos(q) * L, by + Math.sin(q) * L * 0.8, WPP * 2, '#ffffff'); }   // cánh
  for (let i = -12; i <= 12; i++) { const v = i * 3, u = 14 - (v * v) / 70, [px, py] = P(u, v); sq(c, px, py, WPP * 2 * s, Math.abs(i) > 9 ? '#ffffff' : i & 1 ? '#7fe0ff' : '#c08aff'); }   // thân cung
  const [t1x, t1y] = P(14 - 1296 / 70, -36), [t2x, t2y] = P(14 - 1296 / 70, 36), [nx, ny] = P(-6 - pull * 10, 0);
  line(c, t1x, t1y, nx, ny, WPP, '#e0f0ff', WPP); line(c, t2x, t2y, nx, ny, WPP, '#e0f0ff', WPP);
  if (pull > 0.2) { const [hx, hy] = P(26, 0); line(c, nx, ny, hx, hy, WPP * 2, '#7fe0ff', WPP); sq(c, hx, hy, WPP * 3, '#ffffff'); }
}
const starUlt = (R, e, sim) => {
  const p = sim.p, a = p.aim, tx = p.x + Math.cos(a) * 190, ty = p.y + Math.sin(a) * 190, N = 14;
  const nodes = Array.from({ length: N }, (_, i) => { const ring = i < 6 ? 0 : 1, j = ring ? i - 6 : i, n = ring ? 8 : 6, ang = j / n * 6.283 + ring * 0.4, r = ring ? 105 : 52; return [tx + Math.cos(ang) * r, ty + Math.sin(ang) * r * 0.55]; });
  const order = [...nodes.keys()].sort(() => Math.random() - 0.5);
  spawn(R, (c, o, k, t, R2) => {
    const fade = Math.min(1, (1 - k) * 6), skyY = o.ty - 170, open = Math.min(1, k / 0.18);
    c.globalAlpha = fade * 0.9; nebula(c, o.tx, skyY, 150, open, t, o.seed);
    // mạng hoàng đạo xoay: 2 vòng + nút sao + dây laser nối
    c.globalAlpha = fade;
    const rot = t * 0.4, web = o.nodes.map(([nx, ny], i) => { const dx = nx - o.tx, dy = (ny - o.ty) / 0.55, ang = Math.atan2(dy, dx) + rot, r = Math.hypot(dx, dy); return [o.tx + Math.cos(ang) * r, skyY + Math.sin(ang) * r * 0.35]; });
    for (let i = 0; i < web.length; i++) { const j = i < 6 ? (i + 1) % 6 : 6 + ((i - 6 + 1) % 8), m = i < 6 ? 6 + i : (i - 6) % 6; if ((i + 1) / web.length > open * 1.2) continue; line(c, web[i][0], web[i][1], web[j][0], web[j][1], WPP, '#7fe0ff', WPP); if (i % 2 === 0) line(c, web[i][0], web[i][1], web[m][0], web[m][1], WPP, '#c08aff', WPP * 2); }
    for (const [i, [wx, wy]] of web.entries()) { sq(c, wx, wy, WPP * 3, '#ffffff'); if (((t * 8 + i) | 0) % 3 === 0) { sq(c, wx - WPP * 2, wy, WPP, '#7fe0ff'); sq(c, wx + WPP * 2, wy, WPP, '#7fe0ff'); sq(c, wx, wy - WPP * 2, WPP, '#7fe0ff'); sq(c, wx, wy + WPP * 2, WPP, '#7fe0ff'); } }
    // nút sao chiếu xuống đất: vòng ngắm nhỏ chờ giáo ray
    for (const [i, [nx, ny]] of o.nodes.entries()) if (!o.hit[i]) { c.globalAlpha = fade * 0.6; for (let q = 0; q < 4; q++) { const aa = q * 1.571 + t * 2; sq(c, nx + Math.cos(aa) * 9, ny + Math.sin(aa) * 5, WPP, '#7fe0ff'); } }
    // đại cung hồn ma trên đầu Xạ thủ, bắn lần lượt
    const px = sim.p.x, py = sim.p.y - 95, bowK = Math.min(1, Math.max(0, (k - 0.14) / 0.12));
    if (bowK > 0) { const nxt = o.order[Math.min(o.N - 1, o.fired)], [gx, gy] = o.nodes[nxt], aim = Math.atan2(gy - py, gx - px); c.globalAlpha = fade * 0.8 * bowK; greatbow(c, px, py, 1.3, aim, ((t * 7) % 1), t); }
    const t0 = 0.3, dt = 0.04, flight = 0.035;
    while (o.fired < o.N && k >= t0 + o.fired * dt) o.fired++;
    for (let s = 0; s < o.fired; s++) {
      const i = o.order[s], [gx, gy] = o.nodes[i], f = (k - (t0 + s * dt)) / flight;
      if (f < 1) { const sx = px + (gx - px) * f, sy = py + (gy - py) * f, ang = Math.atan2(gy - py, gx - px); c.globalAlpha = fade; line(c, sx - Math.cos(ang) * 60, sy - Math.sin(ang) * 60, sx, sy, WPP * 3, s & 1 ? '#c08aff' : '#7fe0ff', WPP); line(c, sx - Math.cos(ang) * 50, sy - Math.sin(ang) * 50, sx, sy, WPP, '#ffffff', WPP); sq(c, sx, sy, WPP * 3, '#ffffff'); }
      else if (!o.hit[i]) {
        o.hit[i] = true; const prev = o.last; o.last = [gx, gy];
        spawn(R2, (c2, q, kk) => { c2.globalAlpha = 1 - kk; const r = 6 + kk * 46; poly(c2, [[q.x, q.y - r * 0.55], [q.x + r, q.y], [q.x, q.y + r * 0.55], [q.x - r, q.y], [q.x, q.y - r * 0.55]], WPP * 2, kk < 0.4 ? '#ffffff' : '#7fe0ff'); const r2 = r * 0.6; poly(c2, [[q.x, q.y - r2 * 0.55], [q.x + r2, q.y], [q.x, q.y + r2 * 0.55], [q.x - r2, q.y], [q.x, q.y - r2 * 0.55]], WPP, '#c08aff'); if (q.prev && kk < 0.5) zig(c2, q.prev[0], q.prev[1], q.x, q.y, q.seed + ((kk * 30) | 0), ['#7fe0ff', '#c08aff', '#ffe27a'][(kk * 9 | 0) % 3], '#ffffff', 1, 6, 22); }, { x: gx, y: gy, prev, T: 0.4 });
        decal(R2, (c2, q, kk) => { c2.globalAlpha = Math.min(1, (1 - kk) * 2) * 0.8; disc(c2, q.x, q.y, 10, '#141040', 0.5); for (let m = 0; m < 6; m++) { const aa = m * 1.047 + q.seed; if (((q.t * 6 + m) | 0) % 3) sq(c2, q.x + Math.cos(aa) * 12, q.y + Math.sin(aa) * 6, WPP, m & 1 ? '#7fe0ff' : '#ffffff'); } }, { x: gx, y: gy, T: 2.8 });   // hố bụi sao
        for (let m = 0; m < 6; m++) { const aa = Math.random() * 6.283; part(R2, gx, gy, Math.cos(aa) * 160, Math.sin(aa) * 90 - 60, 0.4, PRISM2[m % 4], 3); }
        if (R2.addShake) R2.addShake(3);
      }
    }
  }, { tx, ty, nodes, order, N, fired: 0, hit: {}, last: null, T: 2.6 });
  R._skUlt = { t: 0, T: 0.7, c: '#7fe0ff', d: '#140a3a' }; if (R.addShake) R.addShake(6); return true;
};
const PRISM2 = ['#7fe0ff', '#c08aff', '#ffe27a', '#ffffff'];

// =====================================================================================
// TUYỆT KỸ HEROES — Celestial: "Seraphic Judgment Throne & Orbital Cathedral Pillar"
//   pha 1: khắc thiên bàn nhiều vòng xoay (chữ thánh, kim chỉ) trên nền; 6 tháp pha lê bay lên quanh mép
//   pha 2: Seraphim 6 cánh hiện sau lưng Pháp sư; tháp bắn tia hội tụ vào tâm → cột lửa thiên giới bậc thang khổng lồ giáng xuống;
//          để lại vết nứt chữ vàng cháy xém và lông vũ sáng trôi
// =====================================================================================
function astrolabe(c, x, y, k, t) {
  const rings = [[62, 1, 18], [104, -0.6, 28], [146, 0.35, 40]];
  for (const [ri, [r, sp, n]] of rings.entries()) { const pr = Math.min(1, Math.max(0, k * 3 - ri * 0.4)), rot = t * sp;
    for (let i = 0; i < n * 3 * pr; i++) { const a = rot + i / (n * 3) * 6.283; sq(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, WPP, ri === 1 ? '#ffb81a' : '#fff2a0'); }
    for (let i = 0; i < n * pr; i++) { const a = rot + i / n * 6.283, x1 = x + Math.cos(a) * r, y1 = y + Math.sin(a) * r * 0.5; line(c, x1, y1, x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8) * 0.5, WPP, i % 4 ? '#c8983a' : '#ffffff', WPP); if (i % 3 === 0) { sq(c, x + Math.cos(a) * (r + 7), y + Math.sin(a) * (r + 7) * 0.5, WPP * 2, '#9a4aff'); sq(c, x + Math.cos(a + 0.05) * (r + 7), y + Math.sin(a + 0.05) * (r + 7) * 0.5 - WPP * 2, WPP, '#ffffff'); } } }   // vạch chia + chữ thánh
  const sp = Math.min(1, k * 2); for (let i = 0; i < 12; i++) { const a = -t * 0.2 + i * 0.524; line(c, x, y, x + Math.cos(a) * 146 * sp, y + Math.sin(a) * 73 * sp, WPP, i % 3 ? '#6a4a10' : '#ffb81a', WPP * 3); }   // nan hoa
  for (const s of [0, 1]) { const pts = []; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2.094 + s * Math.PI + t * 0.3; pts.push([x + Math.cos(a) * 92 * sp, y + Math.sin(a) * 46 * sp]); } pts.push(pts[0]); poly(c, pts, WPP, s ? '#9a4aff' : '#fff2a0'); }   // lục giác sao
}
function obelisk(c, x, y, h, glow) { tri(c, [x - 7, y], [x + 7, y], [x, y - h], '#5a3aa0'); tri(c, [x - 4, y], [x + 4, y], [x + 1, y - h + 6], '#e0d0ff'); line(c, x, y, x, y - h, WPP, '#ffffff', WPP * 2); tri(c, [x - 6, y], [x + 6, y], [x, y + 12], '#3a2a70'); if (glow) sq(c, x, y - h, WPP * 3, '#ffffff'); }
function seraph(c, x, y, s, t, k) { // sáu cánh: đôi trên vươn lên, đôi giữa dang ngang, đôi dưới rủ xuống; vầng hào quang + thân hình thoi sáng
  for (const [base, span, L] of [[-1.25, 0.55, 92], [-0.3, 0.5, 108], [0.65, 0.45, 80]]) for (const sd of [-1, 1]) for (let f = 0; f < 7; f++) {
    const q = (sd > 0 ? 0 : Math.PI) + sd * (base + f / 6 * span) * -1 * sd * sd, a = sd > 0 ? base + f / 6 * span : Math.PI - base - f / 6 * span, len = (L - f * 5) * s * k, ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.8;
    line(c, x + Math.cos(a) * 10, y + Math.sin(a) * 8, ex, ey, WPP * 2, f & 1 ? '#fff2a0' : '#ffffff', WPP * 2); sq(c, ex, ey, WPP * 2, '#ffb81a'); if (f % 2 === 0) sq(c, x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.48, WPP, '#9a4aff'); }
  for (let i = 0; i < 28; i++) { const a = t * 1.2 + i * 0.224; sq(c, x + Math.cos(a) * 30 * s, y - 34 * s + Math.sin(a) * 9 * s, WPP * 2, i % 4 ? '#ffb81a' : '#ffffff'); }   // hào quang
  tri(c, [x, y - 26 * s], [x - 9 * s, y], [x + 9 * s, y], '#fff2a0'); tri(c, [x, y + 30 * s], [x - 9 * s, y], [x + 9 * s, y], '#ffb81a'); sq(c, x, y - 6, WPP * 3, '#ffffff');
}
const celestialUlt = (R, e, sim) => {
  const p = sim.p, a = p.aim, tx = p.x + Math.cos(a) * 190, ty = p.y + Math.sin(a) * 190;
  spawn(R, (c, o, k, t, R2) => {
    const fade = Math.min(1, (1 - k) * 6);
    c.globalAlpha = fade; astrolabe(c, o.tx, o.ty, Math.min(1, k / 0.3), t);
    const obs = Array.from({ length: 6 }, (_, i) => { const ang = i * 1.047 + 0.52 + t * 0.15, rise = Math.min(1, Math.max(0, (k - 0.08 - i * 0.03) / 0.15)); return [o.tx + Math.cos(ang) * 168, o.ty + Math.sin(ang) * 84 - rise * 40 - Math.sin(t * 3 + i) * 4, rise]; });
    const sk = Math.min(1, Math.max(0, (k - 0.25) / 0.15)); if (sk > 0) { c.globalAlpha = fade * 0.85 * sk; seraph(c, sim.p.x, sim.p.y - 70, 1.25, t, sk); }   // Seraphim sau lưng Pháp sư
    for (const [i, [bx, by, rise]] of obs.entries()) if (rise > 0) { c.globalAlpha = fade * rise; obelisk(c, bx, by, 44, k > 0.4); if (k > 0.4 && k < 0.62) { line(c, bx, by - 44, o.tx, o.ty - 24, WPP * 2, '#ffb81a', WPP); line(c, bx, by - 44, o.tx, o.ty - 24, WPP, '#ffffff', WPP); } }   // tia hội tụ
    if (k > 0.5) { // cột lửa thiên giới bậc thang
      const kk = (k - 0.5) / 0.5, w0 = (1 - kk * 0.6) * 64, flick = ((t * 24) | 0) & 1; c.globalAlpha = fade;
      if (!o.hit) { o.hit = true; R2._skUlt = { t: 0, T: 0.6, c: '#ffffff', d: '#2a0e5a' }; R2.addShake(14); if (R2._skSim) R2._skSim.hitstop = Math.max(R2._skSim.hitstop || 0, 0.1);
        for (let i = 0; i < 10; i++) decal(R2, (c2, q, k2) => { c2.globalAlpha = Math.min(1, (1 - k2) * 2); let px2 = q.x, py2 = q.y; for (let s2 = 1; s2 <= 5; s2++) { const d = s2 * q.L / 5, nx = q.x + Math.cos(q.a + (H(s2, q.seed) - 0.5) * 0.4) * d, ny = q.y + Math.sin(q.a + (H(q.seed, s2) - 0.5) * 0.4) * d * 0.5; line(c2, px2, py2, nx, ny, WPP * 2, '#2a1a0a', WPP); line(c2, px2, py2, nx, ny, WPP, k2 < 0.5 ? '#ffd84a' : '#c8983a', WPP); if (s2 === 3) { sq(c2, nx, ny - WPP * 2, WPP * 2, '#ffb81a'); sq(c2, nx + WPP * 2, ny - WPP * 2, WPP, '#ffffff'); } px2 = nx; py2 = ny; } }, { x: o.tx, y: o.ty, a: i * 0.628 + Math.random() * 0.3, L: 70 + Math.random() * 60, T: 3.2 });   // vết nứt chữ vàng
        for (let i = 0; i < 26; i++) { const aa = Math.random() * 6.283, d = Math.random() * 120; part(R2, o.tx + Math.cos(aa) * d, o.ty - 40 - Math.random() * 120, (Math.random() - 0.5) * 40, 25 + Math.random() * 20, 2.2, i % 3 ? '#ffffff' : '#fff2a0', 4); }   // lông vũ sáng trôi
      }
      const tiers = [[1, '#9a4aff'], [0.72, '#ffb81a'], [0.46, '#fff2a0'], [0.22, '#ffffff']];
      for (let yy = o.ty - 520; yy < o.ty; yy += WPP * 2) { const step = Math.floor((o.ty - yy) / 60), wk = 1 + step * 0.06; for (const [f, col] of tiers) { const w = sn(w0 * f * wk / WPP / 2) * WPP * 2 + (flick && f === 1 ? WPP * 2 : 0); c.fillStyle = col; c.fillRect(sn(o.tx - w / 2), sn(yy), w, WPP * 2); } }
      disc(c, o.tx, o.ty, w0 * 1.1, '#ffb81a', 0.45); disc(c, o.tx, o.ty, w0 * 0.7, '#ffffff', 0.45);
      for (let i = 0; i < 16; i++) { const aa = i * 0.393, r = 40 + kk * 200; sq(c, o.tx + Math.cos(aa) * r, o.ty + Math.sin(aa) * r * 0.5, WPP * 2, i & 1 ? '#ffb81a' : '#ffffff'); }
    }
  }, { tx, ty, T: 2.8 });
  R._skUlt = { t: 0, T: 0.6, c: '#fff2a0', d: '#2a0e5a' }; if (R.addShake) R.addShake(6); return true;
};
starlight.ult = starUlt; starlight.only.push('ult'); celestial.ult = celestialUlt;

// =====================================================================================
// Dragon Knight — đòn thường "Crimson Dragon-Fang Cleave" và đòn tụ lực "Sovereign Dragon-Wrath Nova"
// (to và nhiều lớp hơn nhát vuốt của Ignivar: HEROES phải đứng trên Boss)
// =====================================================================================
function dragonCleave(c, o, k) {
  const A = o.arc * 1.05, pr = Math.min(1, k * 2.6), n = 30, th = o.big ? 46 : 34; c.globalAlpha = 1 - k * k;
  for (let i = 0; i <= n * pr; i++) {
    const u = i / n, a = o.a + o.dir * (-A / 2 + A * u), bulge = Math.sin(u * Math.PI), w = Math.max(WPP * 2, th * bulge), ca = Math.cos(a), sa = Math.sin(a), rO = o.r + 6;
    for (let d = 0; d < w; d += WPP * 2) { const f = d / w; sq(c, o.x + ca * (rO - d), o.y + sa * (rO - d), WPP * 2, f < 0.12 ? DK.w : f < 0.35 ? DK.g : f < 0.6 ? DK.o : f < 0.85 ? DK.r : DK.k); }
    if (i % 3 === 0 && bulge > 0.25) tri(c, [o.x + Math.cos(a - 0.04) * rO, o.y + Math.sin(a - 0.04) * rO], [o.x + Math.cos(a + 0.04) * rO, o.y + Math.sin(a + 0.04) * rO], [o.x + ca * (rO + 10 + bulge * 8), o.y + sa * (rO + 10 + bulge * 8)], i % 6 ? DK.g : DK.w);   // răng nanh rồng ở mép ngoài
    if (i % 4 === 2) for (const off of [-th * 0.55, -th * 0.85]) sq(c, o.x + ca * (rO + off), o.y + sa * (rO + off), WPP, DK.k);   // vạch vuốt tối bên trong
  }
}
dragonKnight.basic = (R, e) => {
  if (e.ev === 'swing') {
    const big = e.charge > 0.3, r = (e.reach || 104) * (big ? 1.15 : 1.05), arc = e.arc || 1.4, dir = e.dir || (e.combo % 2 ? 1 : -1);
    spawn(R, dragonCleave, { x: e.x, y: e.y, a: e.a, r, arc, dir, big, T: big ? 0.42 : 0.32 });
    for (let i = 0; i < 9; i++) { const q = e.a + (i / 8 - 0.5) * arc, d = r * (0.6 + Math.random() * 0.4); part(R, e.x + Math.cos(q) * d, e.y + Math.sin(q) * d, Math.cos(q) * 30, -40 - Math.random() * 40, 0.9, i % 3 ? DK.g : DK.o, 3); if (i % 3 === 0) part(R, e.x + Math.cos(q) * d, e.y + Math.sin(q) * d, 0, -24, 1.1, '#241818', 7); }   // tàn vàng + khói núi lửa
    for (let i = 0; i < 3; i++) { const q = e.a + (i - 1) * arc * 0.3; clawMark(R, e.x + Math.cos(q) * r * 0.7, e.y + Math.sin(q) * r * 0.7 + 8, q, 0.7); }   // vết cháy ngắn trên nền
  } else if (e.ev === 'knightWave') {   // nova: lốc lửa rồng 360° hai lớp + sóng vuốt rồng xé ra + khựng hình
    spawn(R, (c, o, k) => {
      c.globalAlpha = 1 - k * k; const rOut = o.r * (0.35 + 0.65 * Math.min(1, k * 1.8)), rIn = rOut * 0.66, rot = k * 9;
      for (let i = 0; i < 40; i++) { const a = i * 0.157 + rot * 0.3, h = 14 + H(i, (k * 30) | 0) * 16, x = o.x + Math.cos(a) * rOut, y = o.y + Math.sin(a) * rOut * 0.6; line(c, x, y, x + Math.cos(a) * h * 0.6, y - h, WPP * 2, DK.k, WPP); line(c, x, y, x + Math.cos(a) * h * 0.5, y - h * 0.8, WPP, i & 1 ? DK.r : DK.c, WPP); }
      for (let i = 0; i < 32; i++) { const a = i * 0.196 - rot * 0.5, x = o.x + Math.cos(a) * rIn, y = o.y + Math.sin(a) * rIn * 0.6; sq(c, x, y, WPP * 3, i % 4 ? DK.g : DK.w); }
      for (let j = 0; j < 4; j++) { const a = j * 1.571 + 0.785; for (let m = -1; m <= 1; m++) { const nx = -Math.sin(a) * m * 10, ny = Math.cos(a) * m * 6; for (let s = 0; s < 8; s++) { const d = rIn + s * (rOut - rIn + 40) / 8 * Math.min(1, k * 2.4), bend = Math.sin(s / 7 * Math.PI) * 8; sq(c, o.x + Math.cos(a) * d + nx - Math.sin(a) * bend, o.y + (Math.sin(a) * d + ny + Math.cos(a) * bend) * 0.6, WPP * (s > 5 ? 1 : 2), s > 5 ? DK.w : DK.g); } } }   // sóng vuốt rồng
      if (k < 0.12) disc(c, o.x, o.y, o.r * 0.5, DK.w, 0.6);
    }, { x: e.x, y: e.y, r: e.r, T: 0.6 });
    if (R._skSim) R._skSim.hitstop = Math.max(R._skSim.hitstop || 0, 0.06); R._skUlt = { t: 0, T: 0.25, c: '#ffffff', d: DK.d }; R.addShake(10);
  }
};
dragonKnight.charge = (R, ctx, p, t) => { // vảy rồng / tàn lửa xoắn ốc hội tụ vào kiếm, lưỡi kiếm nóng trắng
  const c = p.charge, a = p.aim, tipX = p.x + Math.cos(a) * 54, tipY = p.y + HAND_Y + Math.sin(a) * 54;
  for (let i = 0; i < 14; i++) { const u = (t * 1.4 + i / 14) % 1, ang = i * 0.449 + u * 5, d = 70 * (1 - u); const x = p.x + Math.cos(ang) * d, y = p.y - 8 + Math.sin(ang) * d * 0.55; tri(ctx, [x, y - 4], [x - 3, y + 2], [x + 3, y + 2], i & 1 ? DK.g : DK.c); }
  line(ctx, p.x + Math.cos(a) * 18, p.y + HAND_Y + Math.sin(a) * 18, tipX, tipY, WPP * 2, c > 0.7 ? DK.w : DK.g, WPP);
  if (c > 0.7) { for (let q = 0; q < 4; q++) { const aa = q * 1.571 + t * 6; line(ctx, tipX, tipY, tipX + Math.cos(aa) * 10, tipY + Math.sin(aa) * 10, WPP, DK.w, WPP); } for (let i = 0; i < 18; i++) { const aa = t * 3 + i * 0.349; sq(ctx, p.x + Math.cos(aa) * 40, p.y + 4 + Math.sin(aa) * 18, WPP, i & 1 ? DK.g : DK.c); } }   // vòng vảy rồng khi tụ đủ
};

// =====================================================================================
// HEROES — 12 chiêu đơn nguyên tố, mỗi chiêu một hình riêng theo skin (thay mọi hình mặc định)
// =====================================================================================
// ---- Dragon Knight ----
function dragonCoil(c, o, k, t) { // xoáy rồng vực thẳm: ba lớp sóng xoắn sapphire + mào vây rồng + vảy nước xoay
  const r = o.r * (0.4 + 0.6 * Math.min(1, k * 2)); c.globalAlpha = 1 - k * k;
  for (let L = 0; L < 3; L++) { const rr = r * (0.55 + L * 0.22), rot = (L & 1 ? -1 : 1) * t * (6 - L) + L; for (let i = 0; i < 26; i++) { const a = rot + i * 0.2417, x = o.x + Math.cos(a) * rr, y = o.y + Math.sin(a) * rr * 0.6, crest = i % 6 === 0; sq(c, x, y, WPP * (L === 2 ? 3 : 2), L === 0 ? '#0a2a6a' : L === 1 ? '#2a6ad8' : i & 1 ? '#c8e8d0' : DK.g); if (crest && L === 2) tri(c, [x - Math.sin(a) * 6, y + Math.cos(a) * 4], [x + Math.sin(a) * 6, y - Math.cos(a) * 4], [x + Math.cos(a) * 14, y + Math.sin(a) * 9 - 6], DK.g); } }
  for (let i = 0; i < 10; i++) { const a = -t * 9 + i * 0.628, d = r * (0.3 + H(i, o.seed) * 0.8); tri(c, [o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.6 - 3], [o.x + Math.cos(a) * d - 3, o.y + Math.sin(a) * d * 0.6 + 2], [o.x + Math.cos(a) * d + 3, o.y + Math.sin(a) * d * 0.6 + 2], i & 1 ? '#7fd0ff' : '#ffffff'); }
}
function dragonSpine(c, o, k) { const rise = Math.min(1, k * 6), h = (46 + (o.i % 2) * 14) * rise; c.globalAlpha = Math.min(1, (1 - k) * 3); tri(c, [o.x - 9, o.y], [o.x + 9, o.y], [o.x + 6, o.y - h], DK.k); tri(c, [o.x - 5, o.y], [o.x + 6, o.y], [o.x + 5, o.y - h + 6], '#2a1a14'); line(c, o.x + 8, o.y, o.x + 6, o.y - h, WPP, DK.g, WPP); sq(c, o.x + 6, o.y - h, WPP * 2, DK.w); }
const DK_SINGLE = {
  FIRE(R, e) { if (e.ev !== 'arcSlash') return; spawn(R, (c, o, k) => { // hàm rồng răng cưa: hai hàm trên/dưới khép lại
    const A = o.arc, close = Math.min(1, k * 3); c.globalAlpha = 1 - k * k;
    for (const sd of [-1, 1]) { const a0 = o.a + sd * A / 2 * (1 - close * 0.6); for (let i = 0; i <= 18; i++) { const u = i / 18, a = a0 - sd * u * A * 0.5, r = o.r * (0.5 + u * 0.55), x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r; sq(c, x, y, WPP * 4, DK.k); sq(c, x, y, WPP * 2, u > 0.8 ? DK.w : DK.r); if (i % 3 === 0) tri(c, [x - 3, y], [x + 3, y], [x - Math.sin(a) * sd * 10, y + Math.cos(a) * sd * 10], DK.w); } } }, { x: e.x, y: e.y, a: e.a, r: e.range || 125, arc: e.arc || 2.6, T: 0.4 });
    for (let i = 0; i < 4; i++) { const q = e.a + (i - 1.5) * 0.3; decal(R, (c, o, k) => { c.globalAlpha = Math.min(1, (1 - k) * 2); let px2 = o.x, py2 = o.y; for (let s = 1; s <= 4; s++) { const nx = o.x + Math.cos(o.a + (H(s, o.seed) - 0.5) * 0.5) * s * 14, ny = o.y + Math.sin(o.a + (H(o.seed, s) - 0.5) * 0.5) * s * 8; line(c, px2, py2, nx, ny, WPP * 2, DK.k, WPP); line(c, px2, py2, nx, ny, WPP, k < 0.4 ? DK.g : DK.o, WPP); px2 = nx; py2 = ny; } if (Math.random() < 0.05) part(R, px2, py2, 0, -40, 0.6, DK.g, 3); }, { x: e.x + Math.cos(q) * 40, y: e.y + Math.sin(q) * 40, a: q, T: 2.2 }); }
  },
  WATER(R, e) { if (e.ev === 'whirl') spawn(R, dragonCoil, { x: e.x, y: e.y, r: e.r, T: 0.6 }); },
  EARTH(R, e) { if (e.ev !== 'spike') return; R._dkSp = (R._dkSp || 0) + 1; const prev = R._dkSpLast && R.time - R._dkSpLast.t < 0.2 ? R._dkSpLast : null; R._dkSpLast = { x: e.x, y: e.y, t: R.time };
    spawn(R, dragonSpine, { x: e.x, y: e.y + 8, i: R._dkSp, T: 0.6 });
    if (prev) decal(R, (c, o, k) => { c.globalAlpha = Math.min(1, (1 - k) * 2); zig(c, o.x1, o.y1, o.x2, o.y2, o.seed, DK.k, k < 0.5 ? DK.o : DK.r, 2, 4, 10); }, { x1: prev.x, y1: prev.y + 8, x2: e.x, y2: e.y + 8, T: 2 });
    for (let i = 0; i < 4; i++) part(R, e.x, e.y, (Math.random() - 0.5) * 160, -140 - Math.random() * 100, 0.7, i & 1 ? '#2a1a14' : DK.o, 5, 700); },
  WIND() {}   // Gale Charge: vẽ mỗi khung trong frame() khi đang lao
};
// ---- Starlight ----
function phoenixLance(c, s, t) { const a = s.a, ca = Math.cos(a), sa = Math.sin(a); for (const sd of [-1, 1]) for (let f = 0; f < 5; f++) { const q = a + Math.PI + sd * (0.4 + f * 0.22), L = 26 - f * 3; line(c, s.x - ca * 6, s.y - sa * 6, s.x - ca * 6 + Math.cos(q) * L, s.y - sa * 6 + Math.sin(q) * L, WPP, f & 1 ? '#ff6ad8' : '#ffd36b', WPP); } line(c, s.x - ca * 30, s.y - sa * 30, s.x, s.y, WPP * 3, '#ff6ad8', WPP); line(c, s.x - ca * 26, s.y - sa * 26, s.x + ca * 4, s.y + sa * 4, WPP, '#ffffff', WPP); sq(c, s.x + ca * 6, s.y + sa * 6, WPP * 3, '#ffffff'); }
function astralCage(c, x, y, r, t, armed) { // bẫy: thiên bàn thuỷ triều + nút sao quay + giáo nước pha lê chĩa vào
  for (const [f, sp, col] of [[1, 0.8, '#3a6aa8'], [0.72, -1.3, '#7fe0ff'], [0.42, 2, '#c8e8ff']]) { const rr = r * f; for (let i = 0; i < 30; i++) { if (i % 5 === 4) continue; const a = t * sp + i * 0.209; sq(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.5, WPP, col); } }
  for (let i = 0; i < 6; i++) { const a = -t * 1.2 + i * 1.047, nx = x + Math.cos(a) * r * 0.86, ny = y + Math.sin(a) * r * 0.43; sq(c, nx, ny, WPP * 2, '#ffffff'); const L = armed ? 18 : 10; tri(c, [nx - Math.sin(a) * 3, ny + Math.cos(a) * 2], [nx + Math.sin(a) * 3, ny - Math.cos(a) * 2], [nx - Math.cos(a) * L, ny - Math.sin(a) * L * 0.5], '#bff0ff'); }
  star4(c, x, y, armed ? 6 : 4, '#ffffff');
}
function star4(c, x, y, n, col) { for (let i = -n; i <= n; i++) { sq(c, x + i * WPP, y, WPP, Math.abs(i) < n - 1 ? '#ffffff' : col); sq(c, x, y + i * WPP, WPP, Math.abs(i) < n - 1 ? '#ffffff' : col); } }
const SL_SINGLE = {
  FIRE(R, e) { if (e.ev === 'boom') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const r = o.r * (0.2 + 0.9 * k); for (let i = 0; i < 16; i++) { const a = i * 0.393, L = r * (i & 1 ? 0.7 : 1); line(c, o.x + Math.cos(a) * r * 0.2, o.y + Math.sin(a) * r * 0.16, o.x + Math.cos(a) * L, o.y + Math.sin(a) * L * 0.8, WPP, i & 1 ? '#ff6ad8' : '#ffd36b', WPP); if (!(i & 1)) { const fx = o.x + Math.cos(a) * L, fy = o.y + Math.sin(a) * L * 0.8; line(c, fx, fy, fx + Math.cos(a + 0.6) * 8, fy + Math.sin(a + 0.6) * 6, WPP, '#ffffff', WPP); } } star4(c, o.x, o.y, Math.round(6 * (1 - k)) + 2, '#ffd36b'); }, { x: e.x, y: e.y, r: e.r || 95, T: 0.45 }); },
  WATER(R, e) { if (e.ev === 'trapPop') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const pin = Math.min(1, k * 4); for (let i = 0; i < 8; i++) { const a = i * 0.785, d = o.r * (1 - pin * 0.85); const x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d * 0.5; tri(c, [x - Math.sin(a) * 4, y + Math.cos(a) * 2], [x + Math.sin(a) * 4, y - Math.cos(a) * 2], [x - Math.cos(a) * 24, y - Math.sin(a) * 12], '#bff0ff'); line(c, x, y, x - Math.cos(a) * 24, y - Math.sin(a) * 12, WPP, '#ffffff', WPP); } const r2 = 10 + k * o.r; poly(c, [[o.x, o.y - r2 * 0.5], [o.x + r2, o.y], [o.x, o.y + r2 * 0.5], [o.x - r2, o.y], [o.x, o.y - r2 * 0.5]], WPP * 2, '#7fe0ff'); }, { x: e.x, y: e.y, r: e.r || 110, T: 0.55 }); },
  EARTH(R, e) { if (e.ev !== 'rainHit') return; spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const r = 6 + k * 34; poly(c, [[o.x, o.y - r * 0.5], [o.x + r, o.y], [o.x, o.y + r * 0.5], [o.x - r, o.y], [o.x, o.y - r * 0.5]], WPP, k < 0.4 ? '#ffffff' : '#c08aff'); }, { x: e.x, y: e.y, T: 0.35 }); decal(R, (c, o, k) => { c.globalAlpha = 1 - k; for (let i = 0; i < 4; i++) if (((o.t * 8 + i) | 0) % 3) sq(c, o.x + Math.cos(i * 1.571 + o.seed) * 8, o.y + Math.sin(i * 1.571 + o.seed) * 4, WPP, i & 1 ? '#7fe0ff' : '#ffffff'); }, { x: e.x, y: e.y, T: 1.6 }); },
  WIND() {}   // Gale Tumble: bóng ảnh + sao + vòng gió trong frame()/ghost
};
// ---- Celestial ----
function solarCrown(c, s, t) { const r = Math.max(8, (s.r || 10) * 0.9); disc(c, s.x, s.y, r + 4, '#9a4aff', 1); disc(c, s.x, s.y, r + 2, '#ffb81a', 1); disc(c, s.x, s.y, r, '#ffffff', 1); for (let i = 0; i < 8; i++) { const a = t * 3 + i * 0.785; line(c, s.x + Math.cos(a) * (r + 4), s.y + Math.sin(a) * (r + 4), s.x + Math.cos(a) * (r + 10 + (i & 1) * 4), s.y + Math.sin(a) * (r + 10 + (i & 1) * 4), WPP, '#ffd84a', WPP); } for (let i = 0; i < 6; i++) { const a = -t * 4 + i * 1.047; sq(c, s.x + Math.cos(a) * (r + 16), s.y + Math.sin(a) * (r + 16) * 0.8, WPP * 2, i & 1 ? '#fff2a0' : '#9a4aff'); } }
function iceSpear(c, x1, y1, x2, y2, k, t) { const a = Math.atan2(y2 - y1, x2 - x1), ca = Math.cos(a), sa = Math.sin(a), L = Math.hypot(x2 - x1, y2 - y1) * Math.min(1, k * 4); for (let u = 0; u < L; u += WPP * 2) { const f = u / L, w = 4 + Math.sin(f * Math.PI) * 10, x = x1 + ca * u, y = y1 + sa * u, facet = ((u / 18) | 0) & 1; sq(c, x, y, w + 4, '#2a4a8a'); sq(c, x - sa * w * 0.25, y + ca * w * 0.25, w * 0.6, facet ? '#c8f4ff' : '#7fd0ff'); sq(c, x + sa * w * 0.25, y - ca * w * 0.25, w * 0.4, '#ffffff'); if (u % 36 < WPP * 2) tri(c, [x - sa * w, y + ca * w], [x + sa * w, y - ca * w], [x + ca * 10, y + sa * 10], '#e0f8ff'); } const tx = x1 + ca * L, ty = y1 + sa * L; tri(c, [tx - sa * 9, ty + ca * 9], [tx + sa * 9, ty - ca * 9], [tx + ca * 24, ty + sa * 24], '#ffffff'); }
const CE_SINGLE = {
  FIRE(R, e) { if (e.ev === 'boom') spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const L = o.r * (0.4 + 1.1 * k); for (const [a, f] of [[0, 1], [1.571, 1], [3.142, 1], [4.712, 1], [0.785, 0.5], [2.356, 0.5], [3.927, 0.5], [5.498, 0.5]]) { line(c, o.x, o.y, o.x + Math.cos(a) * L * f, o.y + Math.sin(a) * L * f * 0.8, WPP * (f === 1 ? 3 : 2), '#ffb81a', WPP); line(c, o.x, o.y, o.x + Math.cos(a) * L * f, o.y + Math.sin(a) * L * f * 0.8, WPP, '#ffffff', WPP); } const r = o.r * k; for (let i = 0; i < 28; i++) { const a = i * 0.224; sq(c, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.6, WPP * 2, i & 1 ? '#9a4aff' : '#fff2a0'); } }, { x: e.x, y: e.y, r: e.r || 120, T: 0.5 }); },
  WATER(R, e, cls, sim) { if (e.ev !== 'beam') return; const p = sim.p; spawn(R, (c, o, k, t) => { c.globalAlpha = 1 - k * k; for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i / 15 - 0.5) * 2.6, L = 26 + (i % 3) * 6; line(c, o.px, o.py - 34, o.px + Math.cos(a) * L, o.py - 34 + Math.sin(a) * L * 0.7, WPP, i & 1 ? '#ffffff' : '#fff2a0', WPP * 2); } iceSpear(c, o.x1, o.y1, o.x2, o.y2, k, t); if (k > 0.25) { const kk = (k - 0.25) / 0.75; for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.52, d = 8 + kk * 40; line(c, o.x2, o.y2, o.x2 + Math.cos(a) * d, o.y2 + Math.sin(a) * d * 0.7, WPP * 2, '#c8f4ff', WPP); sq(c, o.x2 + Math.cos(a) * d, o.y2 + Math.sin(a) * d * 0.7, WPP * 2, '#ffd84a'); } } }, { px: p.x, py: p.y, x1: e.x1, y1: e.y1 - 10, x2: e.x2, y2: e.y2 - 10, T: 0.5 });
    for (let i = 0; i < 10; i++) { const u = Math.random(); part(R, e.x1 + (e.x2 - e.x1) * u, e.y1 + (e.y2 - e.y1) * u - 10, (Math.random() - 0.5) * 60, -30, 0.6, i & 1 ? '#c8f4ff' : '#c08aff', 3); } },
  EARTH() {},   // Cataclysm: ấn dưới mục tiêu (tele) + cột phán xét (đã có ở skinvfx khi trúng)
  WIND(R, e) { if (e.ev !== 'blink') return; R._ceBlink = { x: e.x2, y: e.y2, t: R.time };
    spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const col = 1 - Math.min(1, k * 1.6); for (let w = 0; w < 6; w++) { const a = -Math.PI / 2 + (w - 2.5) * 0.5, L = 40 * (0.4 + col); for (let f = 0; f < 4; f++) line(c, o.x, o.y - 14, o.x + Math.cos(a + f * 0.08) * (L - f * 4), o.y - 14 + Math.sin(a + f * 0.08) * (L - f * 4), WPP, f & 1 ? '#fff2a0' : '#ffffff', WPP * 2); } const pts = []; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i * 2.094 * 2 / 2; pts.push([o.x + Math.cos(i * 2.094) * 26 * col, o.y - 10 + Math.sin(i * 2.094) * 26 * col]); } poly(c, pts, WPP, '#ffb81a'); }, { x: e.x1, y: e.y1, T: 0.4 });
    spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; const r = 20 + k * 110; for (let j = 0; j < 8; j++) { const a1 = j * 0.785 + k, a2 = a1 + 0.6; zig(c, o.x + Math.cos(a1) * r, o.y + Math.sin(a1) * r * 0.55, o.x + Math.cos(a2) * r, o.y + Math.sin(a2) * r * 0.55, o.seed + j + ((k * 20) | 0), '#ffb81a', '#ffffff', 1, 3, 10); } }, { x: e.x2, y: e.y2, T: 0.45 }); }
};
const HSINGLE = { dragonfire: DK_SINGLE, starlight: SL_SINGLE, celestial: CE_SINGLE };
// lớp vẽ thay cho hình mặc định của vật thể tồn tại lâu (rào nước, bẫy, vòng báo trước) — chỉ skin HEROES
const PERSIST = {
  dragonfire: { barrier(c, z, t) { dragonCoil(c, { x: z.x, y: z.y, r: z.r, seed: 0 }, 0.3, t); return true; }, tele(c, T, pr, t) { zig(c, T.x - T.r, T.y + 6, T.x + T.r, T.y + 6, (T.x | 0) % 97, DK.k, pr > 0.5 ? DK.g : DK.o, 2, 4, 8); return true; } },
  starlight: { trap(c, tr, t) { astralCage(c, tr.x, tr.y, tr.r, t, tr.arm <= 0); return true; }, tele(c, T, pr, t) { const h = (1 - pr) * 260; for (let i = 0; i < 3; i++) sq(c, T.x + (H(i, T.x | 0) - 0.5) * 30, T.y - 230 + i * 6, WPP * 2, i & 1 ? '#c08aff' : '#7fe0ff'); line(c, T.x + h * 0.3 + 10, T.y - h - 26, T.x + h * 0.3, T.y - h, WPP * 2, '#7fe0ff', WPP); sq(c, T.x + h * 0.3, T.y - h, WPP * 2, '#ffffff'); const r = T.r * (0.4 + 0.6 * pr); poly(c, [[T.x, T.y - r * 0.5], [T.x + r, T.y], [T.x, T.y + r * 0.5], [T.x - r, T.y], [T.x, T.y - r * 0.5]], WPP, '#3a6aa8'); return true; } },
  celestial: { tele(c, T, pr, t) { const r = T.r * Math.min(1, pr * 1.5); for (let i = 0; i < 36; i++) { const a = t * 0.8 + i * 0.1745; sq(c, T.x + Math.cos(a) * r, T.y + Math.sin(a) * r * 0.5, WPP, i % 6 ? '#c8983a' : '#ffffff'); } for (const s of [0, 1]) { const pts = []; for (let i = 0; i <= 3; i++) { const a = -Math.PI / 2 + i * 2.094 + s * Math.PI - t * 0.4; pts.push([T.x + Math.cos(a) * r * 0.8, T.y + Math.sin(a) * r * 0.4]); } poly(c, pts, WPP, s ? '#9a4aff' : '#ffb81a'); } if (T.fall) { const h = (1 - pr) * 260; star4(c, T.x, T.y - h, 4, '#ffd84a'); line(c, T.x, T.y - h - 40, T.x, T.y - h - 6, WPP, '#fff2a0', WPP); } return true; } }
};
export function persistDraw(theme, kind, c, obj, t, pr) { const P = PERSIST[theme]; return !!(P && P[kind] && P[kind](c, obj, kind === 'tele' ? pr : t, kind === 'tele' ? t : undefined)); }
// đạn của chiêu đơn HEROES
starlight.shot = (R, ctx, s, cat, t) => { if (cat !== 'single') return false; if (s.kind === 'sbolt') { phoenixLance(ctx, s, t); if (Math.random() < 0.7) part(R, s.x, s.y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.5, ['#7fe0ff', '#c08aff', '#ff6ad8', '#ffd36b'][(Math.random() * 4) | 0], 4); return true; } if (s.kind === 'sarrow') { const ca = Math.cos(s.a), sa = Math.sin(s.a); line(ctx, s.x - ca * 18, s.y - sa * 18, s.x, s.y, WPP, '#7fe0ff', WPP); star4(ctx, s.x, s.y, 3, '#c08aff'); return true; } return false; };
celestial.shot = (R, ctx, s, cat, t) => { if (cat === 'single' && s.kind === 'sbolt') { solarCrown(ctx, s, t); return true; } if (cat === 'single' && s.kind === 'spark') { star4(ctx, s.x, s.y, 3, '#ffb81a'); return true; } return false; };
dragonKnight.shot = (R, ctx, s, cat, t) => { if (cat !== 'single' || s.kind !== 'crescent') return false; const W2 = (s.width || 80) / 2, cx = s.x - Math.cos(s.a) * 12, cy = s.y - Math.sin(s.a) * 12; for (let i = -9; i <= 9; i++) { const q = s.a + i / 9 * 1.1, x = cx + Math.cos(q) * W2, y = cy + Math.sin(q) * W2; sq(ctx, x, y, WPP * 4, DK.k); sq(ctx, x, y, WPP * 2, Math.abs(i) > 6 ? DK.w : DK.o); if (i % 3 === 0) tri(ctx, [x - 3, y], [x + 3, y], [x + Math.cos(q) * 10, y + Math.sin(q) * 10], DK.g); } if (Math.random() < 0.5) part(R, cx, cy, 0, -30, 0.6, DK.g, 3); return true; };
// mỗi khung: hào quang khi lao (Gale Charge) / bóng ảnh + sao khi lộn (Gale Tumble)
export function lineFrame(theme, R, ctx, sim, t, dt) {
  const p = sim.p, sd = p.sdash, fresh = sd && sd !== R._sdSeen; if (sd) R._sdSeen = sd;
  if (theme === 'dragonfire' && sd && sd.kind === 'charge' && p.sdashT > 0) { const a = Math.atan2(sd.dy, sd.dx); for (const s2 of [-1, 1]) for (let i = 0; i < 10; i++) { const q = a + s2 * (0.6 + i * 0.13), r = 30 + i * 2; sq(ctx, p.x + Math.cos(q) * r, p.y + HAND_Y + Math.sin(q) * r * 0.7, WPP * (i < 4 ? 2 : 1), i < 3 ? DK.w : i & 1 ? DK.g : DK.c); } tri(ctx, [p.x + Math.cos(a) * 40, p.y + HAND_Y + Math.sin(a) * 28], [p.x + Math.cos(a + 2.4) * 22, p.y + HAND_Y + Math.sin(a + 2.4) * 16], [p.x + Math.cos(a - 2.4) * 22, p.y + HAND_Y + Math.sin(a - 2.4) * 16], DK.o); part(R, p.x - sd.dx * 20, p.y + HAND_Y, -sd.dx * 60, -20, 0.7, Math.random() < 0.5 ? DK.g : DK.o, 4); }
  if (theme === 'starlight' && fresh && sd.kind === 'roll') { const x = p.x, y = p.y, a = Math.atan2(sd.dy, sd.dx); spawn(R, (c, o, k) => { c.globalAlpha = 1 - k; for (let i = 0; i <= 14; i++) { const q = o.a + Math.PI + (i / 14 - 0.5) * 2.2, r = 34 + k * 20; sq(c, o.x + Math.cos(q) * r, o.y - 6 + Math.sin(q) * r * 0.6, WPP * (i % 7 === 0 ? 2 : 1), i & 1 ? '#7fe0ff' : '#ffffff'); } for (let i = 0; i < 4; i++) { const q = i * 1.571 + 0.4, d = 12 + k * 40; star4(c, o.x + Math.cos(q) * d, o.y - 10 + Math.sin(q) * d * 0.7, 3, '#c08aff'); } }, { x, y, a, T: 0.4 }); }
}
export const ghostWhen = (theme, p) => theme === 'starlight' && p.sdash && p.sdash.kind === 'roll' && p.sdashT > 0;
// chiêu đơn HEROES: trả true nếu đã vẽ (engine bỏ qua hình mặc định và hiệu ứng chung)
export function heroSingle(theme, R, e, cls, sim) { const M = HSINGLE[theme]; if (!M) return false; const el = e.el || (e.els && e.els[0]); const f = M[el]; if (!f) return false; f(R, e, cls, sim); return !(theme === 'celestial' && el === 'EARTH'); }   // Cataclysm dùng cột phán xét có sẵn
export const heroOwns = theme => !!HSINGLE[theme];

// =====================================================================================
// BOSS — Sporeback: tuyệt kỹ theo từng tướng (thay cây nấm cán trắng cao lêu nghêu)
// =====================================================================================
const FUN = { o: '#141013', st: ['#2a2a1e', '#3e4430', '#566040'], moss: '#4e7f2a', cap: ['#3a1450', '#6a1e8a', '#a83ac8', '#e070e8'], gill: '#3ad0e0', pod: ['#5a8a1e', '#a8e050', '#e8ffb0'] };
function fungalCluster(c, x, y, s, t, seed, grow = 1) { // cụm nấm thấp đá rêu: đế đá xù xì, mũ nấm dày tím-hồng, mang phát sáng lam, quả bóng độc phập phồng
  const g = Math.min(1, grow), S = s * g; if (S < 2) return;
  for (let i = -3; i <= 3; i++) { const h = (6 + H(i, seed) * 6) * S / 10; disc(c, x + i * S * 0.5, y - h * 0.3, S * 0.45 + 2, FUN.o, 0.6); disc(c, x + i * S * 0.5, y - h * 0.3, S * 0.45, FUN.st[(i + 3) % 3], 0.6); if (i % 2 === 0) sq(c, x + i * S * 0.5, y - h * 0.3 - S * 0.3, WPP * 2, FUN.moss); }   // đế đá rêu
  for (let j = 0; j < 3; j++) { const cx = x + (j - 1) * S * 1.1 + (H(j, seed) - 0.5) * S * 0.4, cy = y - S * (0.9 + (j === 1 ? 0.5 : 0)), w = S * (j === 1 ? 1.15 : 0.85), stem = S * 0.32;
    c.fillStyle = FUN.o; c.fillRect(sn(cx - stem - WPP), sn(cy), sn(stem * 2 + WPP * 2), sn(S * 0.9)); c.fillStyle = '#c8c0a0'; c.fillRect(sn(cx - stem), sn(cy), sn(stem * 2), sn(S * 0.8));   // chân nấm thấp và dày
    disc(c, cx, cy, w + WPP, FUN.o, 0.5); disc(c, cx, cy, w, FUN.cap[1], 0.5); disc(c, cx - w * 0.2, cy - w * 0.12, w * 0.6, FUN.cap[2], 0.5); sq(c, cx - w * 0.35, cy - w * 0.2, WPP * 2, FUN.cap[3]);
    for (let u = -w * 0.8; u <= w * 0.8; u += WPP * 2) sq(c, cx + u, cy + w * 0.42, WPP, (((t * 6 + u) | 0) & 1) ? FUN.gill : '#1a8a9a'); }   // mang phát sáng
  for (const [ox, sz] of [[-S * 1.9, 0.45], [S * 1.8, 0.38]]) { const pul = 1 + Math.sin(t * 7 + ox) * 0.1, r = S * sz * pul; disc(c, x + ox, y - r, r + WPP, FUN.o, 1); disc(c, x + ox, y - r, r, FUN.pod[0], 1); disc(c, x + ox - r * 0.25, y - r * 1.2, r * 0.5, FUN.pod[1], 1); sq(c, x + ox - r * 0.3, y - r * 1.4, WPP, FUN.pod[2]); }   // quả bóng độc
}
function myceliumVeins(c, x, y, R0, k, t, seed) { for (let j = 0; j < 9; j++) { const a = j * 0.698 + seed; let px2 = x, py2 = y; const n = Math.max(1, Math.round(6 * k)); for (let s = 1; s <= n; s++) { const d = s * R0 / 6, nx = x + Math.cos(a + (H(s, j + seed) - 0.5) * 0.7) * d, ny = y + Math.sin(a + (H(j, s + seed) - 0.5) * 0.7) * d * 0.5; line(c, px2, py2, nx, ny, WPP * 2, FUN.o, WPP); line(c, px2, py2, nx, ny, WPP, ((t * 5 + s + j) | 0) % 3 ? '#1a8a9a' : FUN.gill, WPP); if (s % 2 === 0) sq(c, nx + 3, ny - 2, WPP, '#3a5a2a'); px2 = nx; py2 = ny; } } }
function sporeMist(c, x, y, R0, k, t, seed) { for (let i = 0; i < 22; i++) { const a = i * 0.2856 + seed + t * (0.4 + (i % 3) * 0.2), d = R0 * (0.3 + 0.7 * H(i, seed)), px2 = x + Math.cos(a) * d, py2 = y + Math.sin(a) * d * 0.5 - (i % 4) * 6; for (let q = 0; q < 6; q++) { const ox = (H(q, i) - 0.5) * 22, oy = (H(i, q) - 0.5) * 10; if ((q + i + ((t * 4) | 0)) % 3) sq(c, px2 + ox, py2 + oy, WPP * 2, q % 3 === 0 ? '#5a3a7a' : q % 3 === 1 ? '#3a6a2a' : '#7a4a9a'); } if (i % 4 === 0) sq(c, px2, py2 - 8, WPP, i % 8 ? FUN.gill : FUN.pod[1]); } }
function crackedEarth(c, x, y, R0, seed) { for (let j = 0; j < 7; j++) { const a = j * 0.898 + seed; poly(c, [[x, y], [x + Math.cos(a) * R0 * 0.5 + 5, y + Math.sin(a) * R0 * 0.25], [x + Math.cos(a) * R0, y + Math.sin(a) * R0 * 0.5]], WPP * 2, FUN.o); } }
const sporeUlt = (R, e, sim) => {
  const p = sim.p, cls = p.cls, a = p.aim, tx = p.x + Math.cos(a) * 180, ty = p.y + Math.sin(a) * 180;
  if (cls === 'MAGE') spawn(R, (c, o, k, t, R2) => { // vạc đầm lầy độc sôi sục, viền mạch nấm gai, rồi nổ phun bào tử + giọt axit
    const fade = Math.min(1, (1 - k) * 5); c.globalAlpha = fade; const g = Math.min(1, k / 0.2);
    crackedEarth(c, o.tx, o.ty, 120 * g, o.seed); myceliumVeins(c, o.tx, o.ty, 160, Math.min(1, k / 0.35), t, o.seed);
    disc(c, o.tx, o.ty, 62 * g + 6, FUN.o, 0.45); disc(c, o.tx, o.ty, 62 * g, FUN.st[1], 0.45); disc(c, o.tx, o.ty, 52 * g, '#3a1a50', 0.45); disc(c, o.tx, o.ty, 40 * g, '#5a2a7a', 0.45);
    for (let i = 0; i < 12; i++) { const ph = (t * 1.6 + i * 0.13) % 1, aa = H(i, o.seed) * 6.283, d = 44 * g * H(o.seed, i); if (ph < 0.75) disc(c, o.tx + Math.cos(aa) * d, o.ty + Math.sin(aa) * d * 0.45 - ph * 5, 2 + ph * 6, ph > 0.6 ? FUN.gill : '#a83ac8', 1); }   // bong bóng sủi
    for (let i = 0; i < 4; i++) fungalCluster(c, o.tx + Math.cos(i * 1.571 + 0.785) * 78, o.ty + Math.sin(i * 1.571 + 0.785) * 40, 9, t, i + o.seed, (k - 0.1 - i * 0.04) / 0.2);
    if (k > 0.55) { if (!o.boom) { o.boom = true; R2.addShake(12); R2._skUlt = { t: 0, T: 0.5, c: FUN.gill, d: '#14200a' }; for (let i = 0; i < 40; i++) { const aa = -Math.PI / 2 + (Math.random() - 0.5) * 1.4, sp = 250 + Math.random() * 350; part(R2, o.tx, o.ty, Math.cos(aa) * sp * 0.5, Math.sin(aa) * sp, 1.1, i % 3 ? (i & 1 ? '#a83ac8' : FUN.gill) : FUN.pod[1], i % 4 ? 4 : 6, 420); } }
      const kk = (k - 0.55) / 0.45, hh = Math.sin(Math.min(1, kk * 2) * Math.PI / 2) * 300 * (1 - kk * 0.5); for (let yy = 0; yy < hh; yy += WPP * 2) { const w = 30 - yy / hh * 18 + Math.sin(yy * 0.1 + t * 10) * 6; sq(c, o.tx, o.ty - yy, w + 6, FUN.o); sq(c, o.tx, o.ty - yy, w, ((yy / 12) | 0) & 1 ? '#a83ac8' : '#6a1e8a'); sq(c, o.tx, o.ty - yy, w * 0.35, FUN.gill); } sporeMist(c, o.tx, o.ty, 150 * kk + 40, kk, t, o.seed); }
  }, { tx, ty, T: 2.4 });
  else if (cls === 'RANGER') spawn(R, (c, o, k, t, R2) => { // mưa kim gai + quả bào tử, mỗi quả nổ thành sương độc chồng lên nhau + bẫy gai
    const fade = Math.min(1, (1 - k) * 5); c.globalAlpha = fade; myceliumVeins(c, o.tx, o.ty, 150, Math.min(1, k / 0.3), t, o.seed);
    for (const m of o.mists) { m.age = (m.age || 0) + 1 / 60; sporeMist(c, m.x, m.y, 50, 1, t, m.s); for (let i = 0; i < 10; i++) { const aa = i * 0.628 + m.s, x = m.x + Math.cos(aa) * 34, y = m.y + Math.sin(aa) * 17; tri(c, [x - 3, y], [x + 3, y], [x + Math.cos(aa) * 4, y - 9], '#3a5a1e'); sq(c, x + Math.cos(aa) * 4, y - 9, WPP, FUN.pod[1]); } }   // sương độc + bẫy gai
    const N = 18; for (let i = 0; i < N; i++) { const t0 = 0.08 + i * 0.035, f = (k - t0) / 0.06; if (f < 0) continue; const pod = i % 3 === 0, gx = o.tx + (H(i, o.seed) - 0.5) * 220, gy = o.ty + (H(o.seed, i) - 0.5) * 120;
      if (f < 1) { const sx = gx - 120 * (1 - f), sy = gy - 340 * (1 - f); if (pod) { disc(c, sx, sy, 8, FUN.o, 1); disc(c, sx, sy, 6, FUN.pod[0], 1); sq(c, sx - 2, sy - 3, WPP, FUN.pod[2]); } else { line(c, sx - 36 * 0.33, sy - 36, sx, sy, WPP * 2, FUN.o, WPP); line(c, sx - 30 * 0.33, sy - 30, sx, sy, WPP, '#a8c870', WPP); sq(c, sx, sy, WPP, '#ffffff'); } }
      else if (!o.done[i]) { o.done[i] = true; if (pod) { o.mists.push({ x: gx, y: gy, s: Math.random() * 9 }); R2.addShake(3); for (let q = 0; q < 8; q++) { const aa = Math.random() * 6.283; part(R2, gx, gy, Math.cos(aa) * 120, Math.sin(aa) * 60 - 40, 0.7, q & 1 ? FUN.gill : '#a83ac8', 4); } } else decal(R2, (c2, q, kk) => { c2.globalAlpha = 1 - kk; line(c2, q.x, q.y, q.x - 4, q.y - 14, WPP, '#a8c870', WPP); crackedEarth(c2, q.x, q.y, 14, q.seed); }, { x: gx, y: gy, T: 1.8 }); } }
  }, { tx, ty, mists: [], done: {}, T: 2.6 });
  else spawn(R, (c, o, k, t, R2) => { // đập kiếm xuống đất: khe nứt địa chấn, hàng ngà đá rêu + gai pha lê nấm trồi dọc khe, sóng bào tử ngang + đá rêu văng
    const fade = Math.min(1, (1 - k) * 4), L = 300, n = 11, ca = Math.cos(o.a), sa = Math.sin(o.a); c.globalAlpha = fade;
    const prog = Math.min(1, k / 0.45), pts = [[o.x, o.y + 8]]; for (let i = 1; i <= 16 * prog; i++) { const u = i / 16 * L, j = (H(i, o.seed) - 0.5) * 16; pts.push([o.x + ca * u - sa * j, o.y + 8 + sa * u * 0.6 + ca * j * 0.5]); }
    poly(c, pts, WPP * 4, FUN.o); poly(c, pts, WPP * 2, '#1a8a9a'); poly(c, pts, WPP, FUN.gill);
    for (let i = 0; i < n; i++) { const u = (i + 1) / n, t0 = u * 0.45, rise = Math.min(1, Math.max(0, (k - t0) / 0.08)); if (rise <= 0) continue; const d = u * L, side = i & 1 ? 1 : -1, bx = o.x + ca * d - sa * side * 18, by = o.y + 8 + sa * d * 0.6 + ca * side * 9, h = (i % 3 === 2 ? 52 : 40) * rise;
      if (i % 3 === 2) { tri(c, [bx - 8, by], [bx + 8, by], [bx, by - h], FUN.o); tri(c, [bx - 5, by], [bx + 5, by], [bx, by - h + 5], '#a83ac8'); line(c, bx + 2, by, bx, by - h + 5, WPP, FUN.gill, WPP); }   // gai pha lê nấm
      else { tri(c, [bx - 11, by], [bx + 11, by], [bx + side * 8, by - h], FUN.o); tri(c, [bx - 8, by], [bx + 8, by], [bx + side * 7, by - h + 6], FUN.st[2]); line(c, bx - 6, by - h * 0.4, bx + side * 4, by - h * 0.7, WPP * 2, FUN.moss, WPP); }   // ngà đá rêu
      if (rise < 1 && !o.d[i]) { o.d[i] = true; for (let q = 0; q < 4; q++) part(R2, bx, by, (Math.random() - 0.5) * 140, -160 - Math.random() * 100, 0.8, q & 1 ? FUN.moss : FUN.st[1], 5, 700); R2.addShake(4); } }
    if (k > 0.3) { const kk = (k - 0.3) / 0.7, d = kk * (L + 80); for (let s2 = -3; s2 <= 3; s2++) { const cx = o.x + ca * d - sa * s2 * 14, cy = o.y + 4 + sa * d * 0.6 + ca * s2 * 7; sporeMist(c, cx, cy, 26, 1, t, o.seed + s2); } }   // sóng bào tử ngang đuổi theo khe nứt
  }, { x: p.x, y: p.y, a, d: {}, T: 2.2 });
  R._skUlt = { t: 0, T: 0.5, c: FUN.gill, d: '#14200a' }; if (R.addShake) R.addShake(6); return true;
};
sporeback.ult = sporeUlt;

// ---------- bảng tra: id chủ đề skin → module riêng ----------
export const LINES = { abyss, shadow, void: voidL, storm: titanslayer, dragonfire: dragonKnight, starlight, celestial, magma: ashen, glacier: frostbound, spore: sporeback, tempest: stormcrown, wyrm: ignivar };
const SKIP = new Set(['volley', 'trapSet', 'dash']);
// điều phối một sự kiện chiêu vào đúng module; trả true nếu module đã xử lý (engine bỏ qua mẫu chung)
export function lineEvent(L, R, e, cat, cls, sim) {
  const ok = c => !L.only || L.only.includes(c);
  if (cat === 'move') { if (!ok('move')) return false; if (e.ev === 'dash' && L.dash) { const p = sim.p, dx = p.dashX ?? Math.cos(p.aim), dy = p.dashY ?? Math.sin(p.aim); L.dash(R, e.x, e.y, dx, dy, sim); } return true; }
  if (cat === 'basic') { if (!ok('basic') && !(e.ev === 'shoot' && ok('shoot'))) return false; if (L.basic) L.basic(R, e, cls, sim); return true; }
  if (cat === 'ult' && e.ev === 'ultCast') return ok('ult') && L.ult ? L.ult(R, e, sim) : false;
  if (!ok(cat) && !(cat === 'ult' && ok('ult-sub'))) return false;
  if (!L.impact) return false;
  if (e.ev === 'skill' || SKIP.has(e.ev) || (e.ev === 'rainHit' && !e.big && Math.random() > 0.3)) return true;
  const [x, y] = posOf(e); if (x === undefined) return true;
  L.impact(R, x, y, Math.min(120, Math.max(36, e.r || 60)), cat, e, sim); return true;
}
// vẽ thực thể (trên) — gọi mỗi khung từ skinvfx.drawHooks
export function drawLines(R, ctx, dt, t) { if (!R.skl) return; for (const o of R.skl) { o.t += dt; o.f(ctx, o, Math.min(1, o.t / o.T), t, R); } ctx.globalAlpha = 1; R.skl = R.skl.filter(o => o.t < o.T); if (R.skl.length > 160) R.skl.splice(0, R.skl.length - 160); }
// vẽ vết trên mặt đất (dưới chân nhân vật) — gọi từ walk hook
export function drawDecals(R, ctx, dt, t) { if (!R.skdec) return; for (const o of R.skdec) { o.t += dt; o.f(ctx, o, Math.min(1, o.t / o.T), t, R); } ctx.globalAlpha = 1; R.skdec = R.skdec.filter(o => o.t < o.T); }
