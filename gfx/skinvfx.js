import { HAND_Y } from './skinlines.js';
// skinVFXHooks: lớp hiệu ứng theo skin, đè lên đường vẽ mặc định của renderer mà KHÔNG đụng logic chiến đấu
// (sát thương, tầm đánh, hình dạng vùng trúng giữ nguyên — chỉ thay hình ảnh). Hạng skin quyết định hook nào chạy:
//   single → chiêu đơn nguyên tố (hình học riêng theo Lửa/Nước/Đất/Gió, tô theo chủ đề skin)
//   basic  → đòn thường + tụ lực (lưỡi liềm của Hiệp sĩ, mũi tên dải lụa của Xạ thủ, ấn phép của Pháp sư)
//   move   → bước chân, khói/tàn lửa khi đi, bóng ảnh nhiều khung khi lướt
//   duo    → chiêu ghép 2 (hơi thở rồng, thiên thạch, vuốt...)   ult → tuyệt kỹ ghép 3 (hình đại diện chiếm cả màn hình)
import { WPP, sn, mix, rgba, tintOf, Grid } from './pixel.js';
import { covers, glyph, motif, themeOf } from './skinfx.js';
import { tri } from './pxdraw.js';
import { LINES, lineEvent, drawLines, drawDecals, heroSingle, heroOwns, persistDraw, lineFrame, ghostWhen } from './skinlines.js';
export { covers };

const H = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sq = (ctx, x, y, s, c) => { const z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.fillRect(sn(x - z / 2), sn(y - z / 2), z, z); };
function line(ctx, x1, y1, x2, y2, s, c, step = WPP * 2) { const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L / step)), z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i <= n; i++) ctx.rect(sn(x1 + (x2 - x1) * i / n - z / 2), sn(y1 + (y2 - y1) * i / n - z / 2), z, z); ctx.fill(); }
function ring(ctx, x, y, r, s, c, gaps = 0, rot = 0) { const n = Math.max(16, Math.floor(r * 6.283 / (WPP * 2))); for (let i = 0; i < n; i++) { if (gaps && Math.floor(i / (n / gaps / 2)) % 2) continue; const q = rot + i / n * 6.283; sq(ctx, x + Math.cos(q) * r, y + Math.sin(q) * r * 0.85, s, c); } }
function disc(ctx, x, y, r, c) { ctx.fillStyle = c; const X = sn(x), Y = sn(y); ctx.beginPath(); for (let dy = -r; dy <= r; dy += WPP) { const w = sn(Math.sqrt(Math.max(0, r * r - dy * dy))); if (w > 0) ctx.rect(X - w, Y + sn(dy * 0.85), w * 2, WPP); } ctx.fill(); }
function star(ctx, x, y, r, c, pts = 5, rot = -Math.PI / 2) { const P = []; for (let i = 0; i < pts; i++) { const a = rot + i * 6.283 / pts; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } for (let i = 0; i < pts; i++) { const [a1, b1] = P[i], [a2, b2] = P[(i + 2) % pts]; line(ctx, a1, b1, a2, b2, WPP, c, WPP); } }
function bolt(ctx, x1, y1, x2, y2, seed, c1, c2, w = 3) { let px = x1, py = y1; const n = 8; for (let i = 1; i <= n; i++) { const k = i / n, x = x1 + (x2 - x1) * k + (i < n ? (H(i, seed) - 0.5) * 34 : 0), y = y1 + (y2 - y1) * k + (i < n ? (H(seed, i) - 0.5) * 20 : 0); line(ctx, px, py, x, y, WPP * w, c1, WPP); line(ctx, px, py, x, y, WPP, c2, WPP); px = x; py = y; } }
const shp = (pal, v) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(v * (pal.length - 1))))];

// ---------- kiểu riêng của từng chủ đề ----------
// foot: dấu chân · wisp: hạt bay khi đi · slash: dáng lưỡi liềm · cone/slam/claw: bộ chiêu ghép 2 · ult: tuyệt kỹ
export const STYLE = {
  radiant:    { foot: 'gold', wisp: 'feather', slash: 'smooth', cone: 'holy', slam: 'pillar', claw: 'feather' },
  frost:      { foot: 'frost', wisp: 'flake', slash: 'crystal', cone: 'frost', slam: 'icefall', claw: 'shard' },
  inferno:    { foot: 'ember', wisp: 'ember', slash: 'smooth', cone: 'flame', slam: 'meteor', claw: 'claw' },
  abyss:      { foot: 'shadow', wisp: 'smoke', slash: 'jag', cone: 'void', slam: 'rift', claw: 'claw', mix: 0.45 },
  shadow:     { foot: 'shadow', wisp: 'bat', slash: 'jag', cone: 'void', slam: 'rift', claw: 'claw', mix: 0.45 },
  void:       { foot: 'void', wisp: 'mote', slash: 'jag', cone: 'void', slam: 'rift', claw: 'arc', mix: 0.45 },
  dragonfire: { foot: 'ember', wisp: 'ember', slash: 'claw', cone: 'flame', slam: 'meteor', claw: 'claw', ult: 'dragon', bone: '#e6d29a', ultPal: ['#140404', '#9a1a10', '#ffb03a', '#ffffff'] },
  starlight:  { foot: 'star', wisp: 'star', slash: 'smooth', cone: 'star', slam: 'starfall', claw: 'comet', ult: 'starfall' },
  celestial:  { foot: 'gold', wisp: 'feather', slash: 'feather', cone: 'holy', slam: 'pillar', claw: 'feather', ult: 'seraph' },
  storm:      { foot: 'spark', wisp: 'spark', slash: 'jag', cone: 'bolt', slam: 'thunder', claw: 'arc', ult: 'thunder' },
  magma:      { foot: 'magma', wisp: 'ember', slash: 'jag', cone: 'flame', slam: 'geyser', claw: 'claw', ult: 'eruption' },
  spore:      { foot: 'spore', wisp: 'spore', slash: 'smooth', cone: 'spore', slam: 'bloom', claw: 'vine', ult: 'bloom' },
  glacier:    { foot: 'frost', wisp: 'flake', slash: 'crystal', cone: 'frost', slam: 'icefall', claw: 'shard', ult: 'glacier' },
  wyrm:       { foot: 'ember', wisp: 'smoke', slash: 'claw', cone: 'flame', slam: 'meteor', claw: 'claw', ult: 'dragon', bone: '#f0e0c0' },
  tempest:    { foot: 'spark', wisp: 'star', slash: 'jag', cone: 'bolt', slam: 'thunder', claw: 'arc', ult: 'tempest' }
};
const st = th => STYLE[th.id] || {};

// ---------- bảng màu theo nguyên tố, nhuộm theo chủ đề skin (giữ được Lửa/Nước/Đất/Gió dễ nhận ra) ----------
const ELB = { FIRE: ['#5a1408', '#e0461e', '#ffb03a'], WATER: ['#0a2a5a', '#2a7ad8', '#8ad0ff'], EARTH: ['#3a2a18', '#9a7a52', '#e0c890'], WIND: ['#14483a', '#4ac8a0', '#c8fff0'] };
const EPC = new Map();
// [tối, giữa, sáng, màu nhấn của skin (viền), trắng]
export function elPal(th, el) {
  const k = th.id + el; let p = EPC.get(k);
  if (!p) { const b = ELB[el] || [th.pal[0], th.pal[1], th.pal[2]], m = st(th).mix ?? 0.3; p = [mix(b[0], th.pal[0], m), mix(b[1], th.pal[1], m), mix(b[2], th.pal[2], m * 0.6), th.pal[2], th.pal[3]]; EPC.set(k, p); }
  return p;
}
const full5 = th => [th.pal[0], th.pal[1], th.pal[2], th.pal[3], '#ffffff'];

// ================= vẽ các thực thể hiệu ứng =================
function poly(g, pts, c) {
  let y0 = Infinity, y1 = -Infinity; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const xs = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5) !== (by <= y + 0.5)) xs.push(ax + (y + 0.5 - ay) / (by - ay) * (bx - ax)); } xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) g.set(x, y, typeof c === 'function' ? c(x, y) : c); }
}
// đầu rồng pixel cho tuyệt kỹ của Dragon Knight / Ignivar (2 khung: ngậm / há miệng)
const DRAGON = new Map();
function dragonImg(P, jaw, bone) {
  const key = P.join() + jaw + bone; let c = DRAGON.get(key); if (c) return c;
  const g = new Grid(34, 24), D = [P[0], P[1], P[2]];
  poly(g, [[2, 23], [6, 12], [13, 11], [12, 23]], (x, y) => shp(D, (x - 2) / 12 * 0.8 - ((x + y) % 4 === 0 ? 0.3 : 0)));
  for (const [x, y] of [[4, 16], [5, 13], [7, 11]]) { g.set(x - 1, y - 1, P[2]); g.set(x - 2, y - 2, P[3]); }
  g.ell(12, 9, 8, 5.5, (dx, dy) => shp(D, 0.8 - dy * 0.4 + dx * 0.2));
  poly(g, [[16, 5], [30, 8], [31, 10], [16, 12]], (x, y) => shp(D, 0.85 - (y - 5) * 0.08));
  const o = jaw * 3; poly(g, [[15, 12], [28, 11 + o], [27, 14 + o], [14, 15]], () => P[1]);
  if (jaw) for (let x = 17; x <= 27; x++) for (let y = 12; y < 11 + Math.round((x - 15) / 13 * o); y++) g.set(x, y, y & 1 ? P[3] : '#ffe27a');
  for (let x = 18; x <= 29; x += 2) { g.set(x, 11, '#ffffff'); g.set(x - 1, 12 + Math.round((x - 15) / 13 * o), '#ffffff'); }
  g.line(10, 4, 2, 0, bone, 2); g.line(14, 4, 8, 0, bone, 1);
  g.set(20, 7, '#ffe27a'); g.set(21, 7, '#ffffff'); g.set(20, 8, '#1a0a08'); g.set(29, 8, '#1a0a08');
  for (const [x, y] of [[9, 13], [7, 12], [10, 14], [6, 10]]) g.set(x, y, P[2]);
  c = g.canvas(); DRAGON.set(key, c); if (DRAGON.size > 16) DRAGON.delete(DRAGON.keys().next().value); return c;
}

const DRAW = {
  // ----- đòn thường -----
  crescent(c, o, k) { // nhát chém lưỡi liềm của Hiệp sĩ: răng cưa / vuốt rồng / pha lê / lông vũ
    const P = o.P, pr = Math.min(1, k * 2.4), A0 = -o.arc / 2 * o.dir, n = Math.max(10, Math.round(o.arc * o.range / 9)), tw = o.big ? 32 : 20;
    c.globalAlpha = Math.max(0, 1 - k * k);
    for (let i = 0; i <= n * pr; i++) {
      const u = i / n, a = o.a + A0 + o.arc * o.dir * u, bulge = Math.sin(u * Math.PI), ca = Math.cos(a), sa = Math.sin(a);
      const rO = o.range + (o.style === 'jag' && i % 3 === 0 ? 8 : 0), w = Math.max(WPP * 2, tw * bulge);
      for (let d = 0; d < w; d += WPP * 2) sq(c, o.x + ca * (rO - d), o.y + sa * (rO - d), WPP * 2, d < WPP * 2 ? P[3] : d < w * 0.5 ? P[2] : P[1]);
      if (o.style === 'claw' && i % 2 === 0) for (const off of [-14, -28]) sq(c, o.x + ca * (rO + off), o.y + sa * (rO + off), WPP * 2, off === -14 ? P[2] : P[1]);
      if (o.style === 'crystal' && i % 4 === 0) line(c, o.x + ca * rO, o.y + sa * rO, o.x + ca * (rO + 12), o.y + sa * (rO + 12), WPP, P[3], WPP);
      if (o.style === 'feather' && i % 3 === 0) { const b = a + 0.6 * o.dir; line(c, o.x + ca * rO, o.y + sa * rO, o.x + ca * rO + Math.cos(b) * 12, o.y + sa * rO + Math.sin(b) * 12, WPP, P[3], WPP); }
    }
    c.globalAlpha = 1;
  },
  shock(c, o, k) { // vòng sóng (răng cưa nếu jag); sx/sy + a để thành vòng âm thanh dẹt theo hướng bắn
    const r = o.r0 + (o.r - o.r0) * (1 - Math.pow(1 - k, 2)), n = Math.max(18, Math.round(r / 4)), sx = o.sx || 1, sy = o.sy || 0.85, ca = Math.cos(o.a || 0), sa = Math.sin(o.a || 0);
    c.globalAlpha = Math.max(0, 1 - k);
    for (let i = 0; i < n; i++) { const q = i / n * 6.283, j = o.jag && i % 2 ? 7 : 0, lx = Math.cos(q) * (r + j) * sx, ly = Math.sin(q) * (r + j) * sy; sq(c, o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca, WPP * (o.w || 2), i % 4 ? o.P[2] : o.P[3]); }
    c.globalAlpha = 1;
  },
  sigil(c, o, k, t) { // ấn phép loé ở đầu trượng khi Pháp sư tung đòn
    const r = o.r * (0.5 + 0.5 * Math.min(1, k * 3)); c.globalAlpha = Math.max(0, 1 - k * k);
    ring(c, o.x, o.y, r, WPP, o.P[2], 0, t * 3); ring(c, o.x, o.y, r * 0.62, WPP, o.P[3], 6, -t * 4); star(c, o.x, o.y, r * 0.55, o.P[2], 5, t * 2);
    for (let i = 0; i < 6; i++) { const a = t * 3 + i * 1.047; sq(c, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r * 0.85, WPP * 2, o.P[3]); }
    c.globalAlpha = 1;
  },
  burst(c, o, k, t) { // nổ quả cầu: vòng ấn + tia + sao
    const r = o.r * (0.3 + 0.7 * Math.min(1, k * 2.5)); c.globalAlpha = Math.max(0, 1 - k);
    ring(c, o.x, o.y, r, WPP * 2, o.P[2], 8, t); for (let i = 0; i < 10; i++) { const a = i * 0.628 + 0.3; line(c, o.x + Math.cos(a) * r * 0.3, o.y + Math.sin(a) * r * 0.25, o.x + Math.cos(a) * r * 1.1, o.y + Math.sin(a) * r * 0.95, WPP, i % 2 ? o.P[3] : o.P[1]); }
    star(c, o.x, o.y, r * 0.5, o.P[3], 6, t * 2); c.globalAlpha = 1;
  },
  // ----- chiêu đơn theo nguyên tố -----
  flare(c, o, k, t) { // Lửa: vành nhật hoa toả lưỡi lửa
    const P = o.P, R0 = o.r * (0.4 + 0.6 * Math.min(1, k * 2)); c.globalAlpha = Math.max(0, 1 - k * k);
    for (let i = 0; i < 12; i++) { const a = i * 0.524 + H(i, o.seed) * 0.25, L = R0 * (0.65 + 0.45 * H(i, o.seed + 1)) * (1 - k * 0.3), ca = Math.cos(a), sa = Math.sin(a); line(c, o.x + ca * R0 * 0.25, o.y + sa * R0 * 0.2, o.x + ca * L, o.y + sa * L * 0.85, WPP * 2, P[1]); line(c, o.x + ca * R0 * 0.3, o.y + sa * R0 * 0.25, o.x + ca * L * 0.7, o.y + sa * L * 0.6, WPP, P[3]); sq(c, o.x + ca * L, o.y + sa * L * 0.85, WPP * 2, P[4]); }
    disc(c, o.x, o.y, Math.max(WPP, 10 * (1 - k)), P[4]); ring(c, o.x, o.y, R0 * 0.55, WPP, P[3], 0, t); c.globalAlpha = 1;
  },
  wave(c, o, k) { // Nước: ba gợn sóng có viền màu skin + giọt bắn
    const P = o.P; c.globalAlpha = Math.max(0, 1 - k);
    for (let j = 0; j < 3; j++) { const rr = o.r * (0.35 + 0.3 * j) * (0.6 + 0.6 * k), n = Math.max(14, Math.round(rr / 4)); for (let i = 0; i < n; i++) { if ((i + j) % 5 === 0) continue; const q = i / n * 6.283, x = o.x + Math.cos(q) * rr, y = o.y + Math.sin(q) * rr * 0.8; sq(c, x, y, WPP * 2, P[1]); sq(c, x, y - WPP * 2, WPP, P[3]); } }
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.2, d = o.r * (0.4 + k * 0.7); sq(c, o.x + Math.cos(a) * d, o.y + Math.sin(a) * d * 0.8 - Math.sin(k * Math.PI) * 18, WPP * 2, P[4]); }
    c.globalAlpha = 1;
  },
  spikes(c, o, k) { // Đất: gai đá nhiều mặt, gân màu skin (vd. cẩm thạch viền vàng)
    const P = o.P, rise = Math.min(1, k * 5); c.globalAlpha = Math.min(1, (1 - k) * 3);
    for (let i = 0; i < 7; i++) { const a = i * 0.898 + o.seed, d = o.r * (0.35 + 0.35 * (i % 2)), bx = o.x + Math.cos(a) * d, by = o.y + Math.sin(a) * d * 0.8, h = (16 + (i % 3) * 8) * rise;
      for (let y = 0; y < h; y += WPP) { const w2 = Math.max(WPP, (h - y) * 0.45); sq(c, bx - w2 / 4, by - y, w2 / 2, P[1]); sq(c, bx + w2 / 4, by - y, w2 / 2, P[0]); }
      line(c, bx, by, bx, by - h, WPP, P[3], WPP); sq(c, bx, by - h, WPP, P[4]); }
    c.globalAlpha = 1;
  },
  gust(c, o, k, t) { // Gió: ba nhánh xoắn lá/lông vũ
    const P = o.P; c.globalAlpha = Math.max(0, 1 - k);
    for (let j = 0; j < 3; j++) for (let s = 1; s <= 9; s++) { const ang = t * 7 + j * 2.094 + s * 0.38, rad = o.r * s / 9 * (0.6 + 0.5 * k), x = o.x + Math.cos(ang) * rad, y = o.y + Math.sin(ang) * rad * 0.8; sq(c, x, y, WPP * 2, s % 3 ? P[1] : P[3]); if (s % 3 === 0) sq(c, x + Math.cos(ang + 1.6) * 4, y + Math.sin(ang + 1.6) * 4, WPP, P[4]); }
    c.globalAlpha = 1;
  },
  // ----- chiêu ghép 2 -----
  cone(c, o, k, t) { // hơi thở / tia toả hình nón theo hướng chiêu
    const P = o.P, L = o.r * (0.4 + 0.8 * Math.min(1, k * 2)), A = o.arc || 0.9, sd = (t * 14) | 0; c.globalAlpha = Math.max(0, 1 - k * k);
    for (let i = 0; i < 16; i++) {
      const u = i / 15 - 0.5, a = o.a + u * A, d = L * (0.55 + 0.45 * H(i, o.seed + (sd % 3))), ca = Math.cos(a), sa = Math.sin(a), ex = o.x + ca * d, ey = o.y + sa * d;
      switch (o.style) {
        case 'flame': line(c, o.x + ca * 20, o.y + sa * 20, ex, ey, WPP * 3, i % 3 ? P[1] : P[2]); sq(c, ex, ey, WPP * 3, P[3]); break;
        case 'holy': line(c, o.x, o.y, ex, ey, WPP, i & 1 ? P[3] : P[2], WPP * 3); sq(c, ex, ey, WPP * 2, P[3]); break;
        case 'frost': line(c, ex - ca * 16, ey - sa * 16, ex, ey, WPP * 2, P[2]); sq(c, ex, ey, WPP, P[3]); break;
        case 'spore': disc(c, ex, ey, 5 + 7 * k, i & 1 ? P[1] : P[2]); sq(c, ex, ey, WPP, P[3]); break;
        case 'bolt': if (i % 4 === 0) bolt(c, o.x, o.y, ex, ey, o.seed + i + sd, P[2], P[3], 2); break;
        case 'void': for (let s = 0; s < 6; s++) { const q = s / 5, w2 = Math.sin(q * 9 + t * 12 + i) * 6; sq(c, o.x + ca * d * q - sa * w2, o.y + sa * d * q + ca * w2, WPP * 2, s > 3 ? P[2] : P[1]); } break;
        default: sq(c, ex, ey, WPP * 2, P[3]); line(c, o.x + ca * d * 0.7, o.y + sa * d * 0.7, ex, ey, WPP, P[2]);
      }
    }
    c.globalAlpha = 1;
  },
  slam(c, o, k, t) { // giáng xuống từ trời / phun từ đất
    const P = o.P, x = o.x, y = o.y, r = o.r, kk = Math.max(0, (k - 0.25) / 0.75);
    switch (o.style) {
      case 'meteor': case 'starfall': case 'icefall': {
        const n = o.style === 'starfall' ? 4 : 1;
        for (let j = 0; j < n; j++) { const ox = n > 1 ? (H(j, o.seed) - 0.5) * r : 0, oy = n > 1 ? (H(o.seed, j) - 0.5) * r * 0.6 : 0, f2 = Math.min(1, Math.max(0, (k - j * 0.05) * 4));
          if (f2 < 1) { const sx = x + ox - 160 * (1 - f2), sy = y + oy - 260 * (1 - f2); line(c, sx - 40, sy - 65, sx, sy, WPP * 2, P[1]); if (o.style === 'icefall') { for (let q = 0; q < 26; q += WPP) sq(c, sx - q * 0.6, sy - q, Math.max(WPP, 12 - q * 0.4), q < 6 ? P[3] : P[2]); } else { disc(c, sx, sy, 10, P[2]); sq(c, sx, sy, WPP * 2, P[3]); } } }
        if (k > 0.25) { c.globalAlpha = 1 - kk; ring(c, x, y, r * (0.3 + 0.8 * kk), WPP * 2, P[2]); ring(c, x, y, r * 0.6 * (0.3 + 0.8 * kk), WPP, P[3], 6); for (let i = 0; i < 8; i++) { const a = i * 0.785, d = r * (0.2 + kk * 0.9); sq(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8 - Math.sin(kk * Math.PI) * 30, WPP * 2, i & 1 ? P[1] : P[3]); } c.globalAlpha = 1; }
        break;
      }
      case 'pillar': case 'thunder': {
        c.globalAlpha = Math.max(0, 1 - k); const w = (1 - k) * 18 + 6;
        if (o.style === 'pillar') for (let yy = y - 400; yy < y; yy += WPP * 2) { sq(c, x, yy, w, P[2]); sq(c, x, yy, w * 0.4, P[3]); }
        else bolt(c, x, y - 420, x, y, o.seed + ((t * 20) | 0), P[2], P[3], 3);
        ring(c, x, y, r * (0.4 + kk), WPP * 2, P[2]); c.globalAlpha = 1; break;
      }
      case 'geyser': case 'bloom': {
        c.globalAlpha = Math.max(0, 1 - kk);
        for (let i = 0; i < 6; i++) { const a = i * 1.047 + o.seed, bx = x + Math.cos(a) * r * 0.5, by = y + Math.sin(a) * r * 0.4, h = Math.sin(Math.min(1, k * 2) * Math.PI) * (50 + (i & 1) * 30);
          if (o.style === 'geyser') for (let yy = 0; yy < h; yy += WPP * 2) sq(c, bx + Math.sin(yy * 0.2 + t * 10) * 3, by - yy, WPP * 3, yy > h * 0.7 ? P[3] : P[2]);
          else { line(c, bx, by, bx, by - h * 0.5, WPP * 2, '#d8d0b8'); disc(c, bx, by - h * 0.5, 6 + h * 0.08, i & 1 ? P[1] : P[2]); sq(c, bx, by - h * 0.5 - 4, WPP, P[3]); } }
        ring(c, x, y, r * (0.3 + 0.7 * k), WPP * 2, P[1]); c.globalAlpha = 1; break;
      }
      default: { // rift: hố tối co lại rồi bùng
        const rr = k < 0.4 ? r * (1 - k / 0.4) * 0.6 : r * (k - 0.4) / 0.6; c.globalAlpha = Math.max(0, 1 - k);
        disc(c, x, y, Math.max(WPP, rr * 0.5), P[0]); ring(c, x, y, rr, WPP * 2, P[2], 4, t * 4); ring(c, x, y, rr * 0.7, WPP, P[3], 3, -t * 6); c.globalAlpha = 1;
      }
    }
  },
  claw(c, o, k, t) { // vết vuốt / sao chổi / lông vũ / mảnh băng / dây leo / tia điện
    const P = o.P, ca = Math.cos(o.a), sa = Math.sin(o.a), nx = -sa, ny = ca, pr = Math.min(1, k * 3); c.globalAlpha = Math.max(0, 1 - k);
    switch (o.style) {
      case 'claw': for (let j = -1; j <= 1; j++) for (let i = 0; i < 12; i++) { const u = i / 11; if (u > pr) break; const bend = Math.sin(u * Math.PI) * 10; sq(c, o.x + nx * j * 14 + ca * u * o.r + nx * bend, o.y + ny * j * 14 + sa * u * o.r + ny * bend, WPP * (3 - Math.abs(u - 0.5) * 3), u > 0.8 ? P[3] : P[2]); } break;
      case 'comet': { const hx = o.x + ca * o.r * pr, hy = o.y + sa * o.r * pr; line(c, o.x, o.y, hx, hy, WPP * 2, P[1]); star(c, hx, hy, 12, P[3], 5, t * 6); break; }
      case 'feather': for (let j = -2; j <= 2; j++) { const a = o.a + j * 0.25, L = o.r * pr; line(c, o.x, o.y, o.x + Math.cos(a) * L, o.y + Math.sin(a) * L, WPP, P[3], WPP * 2); sq(c, o.x + Math.cos(a) * L, o.y + Math.sin(a) * L, WPP * 2, P[2]); } break;
      case 'shard': for (let j = 0; j < 8; j++) { const a = o.a + (H(j, o.seed) - 0.5) * 1.2, L = o.r * pr * (0.6 + 0.4 * H(o.seed, j)), ex = o.x + Math.cos(a) * L, ey = o.y + Math.sin(a) * L; line(c, ex - Math.cos(a) * 14, ey - Math.sin(a) * 14, ex, ey, WPP * 2, P[2]); sq(c, ex, ey, WPP, P[3]); } break;
      case 'vine': for (let j = -1; j <= 1; j++) for (let i = 0; i < 14; i++) { const u = i / 13; if (u > pr) break; const w = Math.sin(u * 8 + t * 6 + j) * 8; sq(c, o.x + ca * u * o.r + nx * (w + j * 12), o.y + sa * u * o.r + ny * (w + j * 12), WPP * 2, i % 4 === 3 ? P[3] : P[1]); } break;
      default: for (let j = -1; j <= 1; j++) bolt(c, o.x, o.y, o.x + Math.cos(o.a + j * 0.3) * o.r * pr, o.y + Math.sin(o.a + j * 0.3) * o.r * pr, o.seed + j + ((t * 20) | 0), P[2], P[3], 2);
    }
    c.globalAlpha = 1;
  },
  // ----- tuyệt kỹ: hình đại diện chiếm màn hình -----
  avatar(c, o, k, t, R) {
    const P = o.P;
    switch (o.style) {
      case 'dragon': { // đầu rồng dung nham trồi lên sau lưng, gầm rồi phun lửa theo hướng ngắm
        const jaw = k > 0.25 && k < 0.85 ? 1 : 0, img = dragonImg(P, jaw, o.bone || '#e6d29a'), S = WPP * 2, w = img.width * S, h = img.height * S, rise = Math.min(1, k / 0.25), x = o.x - o.face * 50, y = o.y + 20 + (1 - rise) * 70;
        c.save(); c.globalAlpha = Math.min(1, rise * 1.5) * Math.min(1, (1 - k) * 4); c.translate(sn(x), sn(y)); c.scale(o.face, 1); c.drawImage(img, -w * 0.3, -h, w, h); c.restore();
        if (jaw && R) { const mx = x + o.face * (-w * 0.3 + 28 * S), my = y - h + 12 * S; for (let i = 0; i < 6; i++) { const a = o.a + (Math.random() - 0.5) * 0.5, sp = 380 + Math.random() * 260; R.parts.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.55, max: 0.55, c: i % 3 ? P[2] : P[3], s: 7 }); } }
        break;
      }
      case 'starfall': { // vẽ chòm sao quanh mục tiêu rồi từng ngôi sao rơi xuống
        const pts = o.pts, n = pts.length;
        for (let i = 0; i < n; i++) { const t0 = i / n * 0.35; if (k < t0) continue; const [x2, y2] = pts[i]; if (i > 0) { const [x1, y1] = pts[i - 1]; c.globalAlpha = Math.max(0, 1 - k) * 0.8; line(c, x1, y1, x2, y2, WPP, P[1], WPP * 3); }
          const f2 = (k - 0.4 - i * 0.07) / 0.12; c.globalAlpha = Math.max(0, 1 - k * 0.8);
          if (f2 < 0) { sq(c, x2, y2, WPP * 3, '#ffffff'); sq(c, x2 - WPP * 2, y2, WPP, P[2]); sq(c, x2 + WPP * 2, y2, WPP, P[2]); }
          else if (f2 < 1) { const sx = x2 + 140 * (1 - f2), sy = y2 - 320 * (1 - f2); line(c, sx + 50, sy - 110, sx, sy, WPP * 2, P[2]); star(c, sx, sy, 10, '#ffffff', 5, t * 8); }
          else if (f2 < 2) { ring(c, x2, y2, (f2 - 1) * 80, WPP * 2, P[2]); star(c, x2, y2, 16 * (2 - f2), P[3], 5, t * 4); } }
        c.globalAlpha = 1; break;
      }
      case 'seraph': { // vầng hào quang + đôi cánh khổng lồ + cột sáng quanh người
        const s = Math.min(1, k * 2.5); c.globalAlpha = Math.min(1, (1 - k) * 3);
        ring(c, o.x, o.y - 70, 30 + 40 * s, WPP * 2, P[2], 0, t); ring(c, o.x, o.y - 70, 22 + 30 * s, WPP, P[3], 8, -t * 2);
        for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + sd * (0.35 + i * 0.17), L = (70 + i * 14) * s; line(c, o.x, o.y - 30, o.x + Math.cos(a) * L, o.y - 30 + Math.sin(a) * L * 0.8, WPP * 2, i & 1 ? P[3] : P[2], WPP * 2); }
        for (let i = 0; i < 6; i++) { if (k < i * 0.08) continue; const a = i * 1.047 + 0.4, px2 = o.x + Math.cos(a) * 150, py2 = o.y + Math.sin(a) * 110; for (let yy = py2 - 320; yy < py2; yy += WPP * 2) sq(c, px2, yy, 10 * (1 - k) + 4, P[2]); disc(c, px2, py2, 14, P[3]); }
        c.globalAlpha = 1; break;
      }
      case 'thunder': { for (let i = 0; i < 3; i++) { const t0 = 0.1 + i * 0.16, f2 = (k - t0) / 0.18; if (f2 < 0 || f2 > 1) continue; const px2 = o.tx + (i - 1) * 70, py2 = o.ty + (i & 1) * 30; c.globalAlpha = 1 - f2; bolt(c, px2, py2 - 460, px2, py2, i * 13 + ((t * 30) | 0), P[2], '#ffffff', 4); ring(c, px2, py2, 30 + f2 * 90, WPP * 2, P[3]); for (let j = 0; j < 6; j++) bolt(c, px2, py2, px2 + Math.cos(j * 1.047) * 80 * f2, py2 + Math.sin(j * 1.047) * 60 * f2, j + i * 7, P[2], P[3], 1); } c.globalAlpha = 1; break; }
      case 'eruption': { for (let i = 0; i < 8; i++) { const t0 = i * 0.06, f2 = (k - t0) / 0.5; if (f2 < 0 || f2 > 1) continue; const a = i * 0.785, gx = o.x + Math.cos(a) * 130, gy = o.y + Math.sin(a) * 95, hh = Math.sin(f2 * Math.PI) * 150; c.globalAlpha = 1 - f2 * 0.6; for (let yy = 0; yy < hh; yy += WPP * 2) sq(c, gx + Math.sin(yy * 0.15 + t * 12) * 4, gy - yy, WPP * (4 - yy / hh * 2), yy > hh * 0.75 ? P[3] : yy > hh * 0.4 ? P[2] : P[1]); line(c, o.x, o.y, gx, gy, WPP, P[2], WPP * 2); } c.globalAlpha = 1; break; }
      case 'bloom': { const grow = Math.min(1, k * 2.5), hh = 130 * grow, burst = Math.max(0, (k - 0.55) / 0.45); c.globalAlpha = Math.min(1, (1 - k) * 3);
        if (burst < 0.4) { for (let yy = 0; yy < hh; yy += WPP * 2) sq(c, o.tx, o.ty - yy, 14, '#d8d0b8'); for (let q = 0; q < 1; q += 0.05) { const a = Math.PI + q * Math.PI, rr = 70 * grow; line(c, o.tx, o.ty - hh, o.tx + Math.cos(a) * rr, o.ty - hh + Math.sin(a) * rr * 0.55, WPP * 3, P[1]); } for (let i = 0; i < 5; i++) disc(c, o.tx - 40 + i * 20, o.ty - hh - 18 + (i & 1) * 8, 5, P[3]); }
        if (burst > 0) for (let i = 0; i < 18; i++) { const a = i * 0.349, d = 40 + burst * 220; disc(c, o.tx + Math.cos(a) * d, o.ty + Math.sin(a) * d * 0.7, 10 + burst * 14, i & 1 ? P[1] : P[2]); }
        c.globalAlpha = 1; break; }
      case 'glacier': { for (let w = 0; w < 3; w++) { const f2 = (k - w * 0.15) / 0.55; if (f2 < 0 || f2 > 1) continue; const rr = 60 + w * 70; c.globalAlpha = 1 - f2 * 0.7; for (let i = 0; i < 14; i++) { const a = i * 0.449 + w * 0.2, bx = o.x + Math.cos(a) * rr, by = o.y + Math.sin(a) * rr * 0.75, hh = Math.sin(Math.min(1, f2 * 2) * Math.PI / 2) * (36 + (i % 3) * 14); for (let yy = 0; yy < hh; yy += WPP) sq(c, bx, by - yy, Math.max(WPP, (hh - yy) * 0.5), yy > hh * 0.6 ? P[3] : P[2]); } } c.globalAlpha = 1; break; }
      case 'tempest': { const conv = Math.max(0, (k - 0.45) / 0.35), col = ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff']; c.globalAlpha = Math.min(1, (1 - k) * 4);
        const pos = col.map((cc, i) => { const a = t * 4 + i * 1.571, rr = 150 * (1 - Math.min(1, conv)); return [o.tx + Math.cos(a) * rr, o.ty + Math.sin(a) * rr * 0.75]; });
        pos.forEach(([x2, y2], i) => { disc(c, x2, y2, 12, col[i]); sq(c, x2, y2, WPP * 2, '#ffffff'); });
        if (k > 0.35) for (let i = 0; i < 4; i++) bolt(c, pos[i][0], pos[i][1], pos[(i + 1) % 4][0], pos[(i + 1) % 4][1], i + ((t * 24) | 0), P[2], '#ffffff', 2);
        if (conv >= 1) ring(c, o.tx, o.ty, (k - 0.8) * 900, WPP * 2, P[3]);
        c.globalAlpha = 1; break; }
    }
  }
};

// ================= hiệu ứng riêng của 3 skin HEROES =================
const PRISM = ['#7fe0ff', '#c08aff', '#ffe27a', '#ffffff'];
const VIOLET = '#9a4aff', MAGMA = ['#140404', '#5a0e08', '#c8301a', '#ff8a2a', '#ffd36b', '#ffffff'];
export const ultPalOf = th => st(th).ultPal || th.pal;
// khung ngắm góc vuông xoay (Starlight Huntress)
function bracket(c, x, y, r, rot, col, w = WPP) { for (let i = 0; i < 4; i++) { const a = rot + i * 1.571, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r, b1 = a + 2.356, b2 = a - 2.356; line(c, cx, cy, cx + Math.cos(b1) * r * 0.45, cy + Math.sin(b1) * r * 0.45, w, col, WPP); line(c, cx, cy, cx + Math.cos(b2) * r * 0.45, cy + Math.sin(b2) * r * 0.45, w, col, WPP); } }
// lốc rồng: các vòng nhát chém xoay ngược chiều, vàng dung nham xen đỏ hắc diện thạch, viền trắng
function dragonVortex(c, x, y, t, k = 1) {
  for (let L = 0; L < 3; L++) {
    const rr = (46 + L * 26) * k, sp = (L & 1 ? -1 : 1) * (5 - L * 1.2), n = 3 + L;
    for (let j = 0; j < n; j++) { const a0 = t * sp + j * 6.283 / n, arc = 1.1;
      for (let i = 0; i <= 10; i++) { const a = a0 + arc * i / 10, w = Math.sin(i / 10 * Math.PI), px2 = x + Math.cos(a) * rr, py2 = y - 8 + Math.sin(a) * rr * 0.55;
        sq(c, px2, py2, WPP * (1 + Math.round(w * 2)), L === 1 ? (i > 7 ? '#ffffff' : MAGMA[4]) : (i > 7 ? MAGMA[3] : i & 1 ? MAGMA[1] : MAGMA[2]));
        if (i === 10) sq(c, px2 + Math.cos(a + 1.57) * 3, py2 + Math.sin(a + 1.57) * 3, WPP, '#ffffff'); } }
  }
}
Object.assign(DRAW, {
  railRing(c, o, k, t) { // vòng lục giác dọc đường bay của mũi tên ray
    const r = 8 + 30 * k, ca = Math.cos(o.a), sa = Math.sin(o.a), pt = q => { const lx = Math.cos(q) * r * 0.32, ly = Math.sin(q) * r; return [o.x + lx * ca - ly * sa, o.y + lx * sa + ly * ca]; };
    c.globalAlpha = Math.max(0, 1 - k); for (let i = 0; i < 6; i++) { const [x1, y1] = pt(i * 1.047 + t * 3), [x2, y2] = pt((i + 1) * 1.047 + t * 3); line(c, x1, y1, x2, y2, WPP, PRISM[i % 4], WPP); } c.globalAlpha = 1;
  },
  shards(c, o, k, t) { // mảnh sao sắc bắn ra khi trúng
    c.globalAlpha = Math.max(0, 1 - k);
    for (let i = 0; i < 12; i++) { const a = o.a + (H(i, o.seed) - 0.5) * 2.6, d = 8 + k * 70 * (0.5 + 0.7 * H(o.seed, i)), x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d; line(c, x - Math.cos(a) * 10, y - Math.sin(a) * 10, x, y, WPP, PRISM[i % 4], WPP); if (i % 4 === 0) star(c, x, y, 5, '#ffffff', 4, t * 6); }
    if (k < 0.3) { disc(c, o.x, o.y, 10 * (1 - k / 0.3), '#ffffff'); bracket(c, o.x, o.y, 14 + k * 30, t * 4, '#7fe0ff'); }
    c.globalAlpha = 1;
  },
  fissure(c, o, k) { // vết vuốt dung nham khắc xuống đất, nguội dần từ trắng → vàng → đỏ thẫm
    const col = k < 0.3 ? MAGMA[4] : k < 0.65 ? MAGMA[3] : MAGMA[2], ca = Math.cos(o.a), sa = Math.sin(o.a), nx = -sa, ny = ca;
    c.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
    const crack = (x0, y0, a, len, n, seed, w) => { let px2 = x0, py2 = y0; for (let s = 1; s <= n; s++) { const d = s * len / n, j = (H(s, seed) - 0.5) * 10, qx = x0 + Math.cos(a) * d - Math.sin(a) * j, qy = y0 + (Math.sin(a) * d + Math.cos(a) * j) * 0.8; line(c, px2, py2, qx, qy, WPP * (w + 1), '#120404', WPP); line(c, px2, py2, qx, qy, WPP * w, col, WPP); px2 = qx; py2 = qy; } };
    crack(o.x, o.y, o.a, o.r, 7, o.seed, 1);                                                   // đường nứt chính
    for (const [u, sd] of [[0.35, 1], [0.6, -1]]) crack(o.x + ca * o.r * u, o.y + sa * o.r * u * 0.8, o.a + sd * 0.7, o.r * 0.3, 3, o.seed + sd, 1);   // hai nhánh
    if (k < 0.5) for (let s = 1; s <= 3; s++) { const d = s * o.r / 4; sq(c, o.x + ca * d, o.y + sa * d * 0.8 - 4 - H(s, (k * 30) | 0) * 10, WPP, MAGMA[4]); }   // tia dung nham bắn lên
    c.globalAlpha = 1;
  },
  holyRing(c, o, k, t) { // sóng thánh khi giáo mặt trời nổ
    const r = o.r * (0.2 + 0.9 * (1 - Math.pow(1 - k, 2))); c.globalAlpha = Math.max(0, 1 - k);
    ring(c, o.x, o.y, r * 1.08, WPP, VIOLET, 0, t); ring(c, o.x, o.y, r, WPP * 2, '#ffffff'); ring(c, o.x, o.y, r * 0.86, WPP, '#ffb81a', 12, -t * 2);
    for (let i = 0; i < 12; i++) { const a = i * 0.524 + 0.26; line(c, o.x + Math.cos(a) * r * 0.5, o.y + Math.sin(a) * r * 0.42, o.x + Math.cos(a) * r * 1.2, o.y + Math.sin(a) * r, WPP, i & 1 ? '#fff2a0' : '#ffffff'); }
    if (k < 0.25) disc(c, o.x, o.y, 18 * (1 - k * 4), '#ffffff'); c.globalAlpha = 1;
  },
  judgment(c, o, k, t) { // pháp sư: khắc ấn thiên thần xuống đất → cột lửa thiên giới / thiên thạch phán xét / vết rách vũ trụ
    const sk = Math.min(1, k / 0.3), R0 = o.r, x = o.x, y = o.y, E = o.E || '#ffb81a';
    c.globalAlpha = k < 0.8 ? 1 : (1 - k) / 0.2;
    ring(c, x, y, R0 * sk, WPP, '#ffb81a', 0, t * 0.5); ring(c, x, y, R0 * 0.8 * sk, WPP, VIOLET, 12, -t); star(c, x, y, R0 * 0.74 * sk, '#fff2a0', 6, t * 0.6); ring(c, x, y, R0 * 0.3 * sk, WPP, E, 0, t);
    for (let i = 0; i < 12; i++) if (i / 12 < sk) { const a = i * 0.524 + t * 0.5, rx = x + Math.cos(a) * R0 * 0.9, ry = y + Math.sin(a) * R0 * 0.9 * 0.85; sq(c, rx, ry, WPP * 2, '#ffffff'); sq(c, rx + WPP * 2, ry, WPP, E); }
    if (k > 0.25 && o.mode) {
      const kk = (k - 0.25) / 0.75;
      if (o.mode === 'pillar') { const w = (1 - kk) * 30 + 8; for (let yy = y - 440; yy < y; yy += WPP * 2) { sq(c, x, yy, w + 8, VIOLET); sq(c, x, yy, w, '#ffb81a'); sq(c, x, yy, w * 0.45, '#ffffff'); } disc(c, x, y, Math.max(WPP, R0 * 0.6 * (1 - kk)), '#ffffff'); ring(c, x, y, R0 * (0.5 + kk * 0.8), WPP * 2, E); }
      else if (o.mode === 'meteor') { const f2 = Math.min(1, kk * 3); if (f2 < 1) { const sx = x + 200 * (1 - f2), sy = y - 360 * (1 - f2); for (let q = 0; q < 70; q += WPP * 2) sq(c, sx + q * 0.55, sy - q, Math.max(WPP, 14 - q * 0.18), q < 10 ? '#ffffff' : q < 35 ? '#ffb81a' : VIOLET); disc(c, sx, sy, 12, '#ffffff'); } else { const k3 = (kk - 0.33) / 0.67; ring(c, x, y, R0 * (0.3 + k3 * 1.1), WPP * 2, '#ffffff'); ring(c, x, y, R0 * (0.2 + k3 * 0.8), WPP, VIOLET, 8, t); for (let i = 0; i < 10; i++) { const a = i * 0.628; sq(c, x + Math.cos(a) * R0 * k3, y + Math.sin(a) * R0 * k3 * 0.8 - Math.sin(k3 * Math.PI) * 40, WPP * 2, i & 1 ? '#ffb81a' : '#ffffff'); } } }
      else if (o.mode === 'rift') { const open = Math.sin(Math.min(1, kk) * Math.PI), hh = R0 * 1.4; for (let yy = -hh; yy <= hh; yy += WPP) { const u = 1 - Math.abs(yy) / hh, hw = Math.max(0, u * 22 * open + (H(yy | 0, o.seed) - 0.5) * 6 * open); if (hw < WPP) continue; sq(c, x - hw, y - 60 + yy, WPP, '#ffffff'); sq(c, x + hw, y - 60 + yy, WPP, VIOLET); c.fillStyle = '#0a0418'; c.fillRect(sn(x - hw + WPP), sn(y - 60 + yy), Math.max(0, sn(hw * 2 - WPP * 2)), WPP); if (H(yy | 0, o.seed + 3) < 0.12) sq(c, x + (H(o.seed, yy | 0) - 0.5) * hw, y - 60 + yy, WPP, '#fff2a0'); } for (let i = 0; i < 6; i++) { const a = t * 6 + i * 1.047, d = 30 + 60 * (1 - (kk * 2 + i * 0.1) % 1); sq(c, x + Math.cos(a) * d, y - 60 + Math.sin(a) * d * 1.4, WPP * 2, i & 1 ? VIOLET : '#ffffff'); } }
    }
    c.globalAlpha = 1;
  },
  dragonUlt(c, o, k, t, R) { // rồng thân rắn đầy đủ: đầu + 14 đốt thân + 4 đốt đuôi, mỗi đốt đi đúng quỹ đạo cũ của đầu
    const P = o.P, sm = R._skSim, tau = k * o.T, fade = Math.min(1, (1 - k) * 5);
    // quỹ đạo 3D của đầu theo thời gian (x, y mặt đất, z độ cao) chiếu lên màn hình; d > 0 = phía trước
    const path = q => {
      q = Math.max(0, q);
      if (o.mode === 'coil') { const cx = sm ? sm.p.x : o.x, cy = sm ? sm.p.y : o.y, ang = o.a0 + q * 6.5, rad = 58 + 16 * Math.sin(q * 3.1), z = 24 + Math.min(1, q / 1.4) * 70 + Math.sin(q * 2.2) * 12; return [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.5 - z, Math.sin(ang)]; }
      if (q < 0.85) { const u = q / 0.85, ang = o.a0 + u * 8.5, rad = 170 * (1 - u) + 24, z = 430 * Math.pow(1 - u, 1.5); return [o.tx + Math.cos(ang) * rad, o.ty + Math.sin(ang) * rad * 0.5 - z, Math.sin(ang)]; }
      const ang = o.a0 + 8.5 + (q - 0.85) * 5, rad = 62 + (q - 0.85) * 18, z = 12 + (q - 0.85) * 40; return [o.tx + Math.cos(ang) * rad, o.ty + Math.sin(ang) * rad * 0.5 - z, Math.sin(ang)];
    };
    // các đốt đặt cách đều nhau theo chiều dài quỹ đạo đã đi qua (bay nhanh hay chậm thân vẫn liền mạch)
    const N = 19, D = 10, raw = []; { let q = tau, [lx, ly, ld] = path(q), acc = 0; raw.push([lx, ly, ld]); while (raw.length < N && q > -2) { q -= 0.003; const [x, y, d] = path(q); acc += Math.hypot(x - lx, y - ly); lx = x; ly = y; if (acc >= D) { acc = 0; raw.push([x, y, d]); } } while (raw.length < N) raw.push(raw[raw.length - 1]); }
    const seg = raw.map(([x, y, d], j) => { const nb = raw[j === 0 ? 1 : j - 1], va = j === 0 ? Math.atan2(y - nb[1], x - nb[0]) : Math.atan2(nb[1] - y, nb[0] - x), w = j > 0 ? Math.sin(t * 9 + j * 0.8) * 4 : 0; return { x: x - Math.sin(va) * w, y: y + Math.cos(va) * w, d, va: (x === nb[0] && y === nb[1]) ? o.a : va }; });
    if (o.mode === 'dive' && tau >= 0.85 && !o.hit) { // đập xuống: sóng dung nham, vết vuốt, tàn hắc diện thạch, khựng hình, giật màn hình có hướng
      o.hit = true; const X = R.skx;
      for (const da of [-0.55, 0, 0.55]) X.push({ k: 'fissure', t: 0, T: 2.6, P, seed: Math.random() * 100, x: o.tx, y: o.ty, a: o.a + da, r: 150 });
      X.push({ k: 'shock', t: 0, T: 0.55, P: [MAGMA[0], MAGMA[2], MAGMA[4], '#ffffff'], seed: 0, x: o.tx, y: o.ty, r0: 20, r: 220, jag: true, w: 3 });
      for (let i = 0; i < 34; i++) { const a2 = Math.random() * 6.283, sp = 160 + Math.random() * 320; R.parts.push({ x: o.tx, y: o.ty, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp * 0.6 - 220, g: 700, life: 0.9, max: 0.9, c: i % 3 ? '#1a0808' : i % 2 ? '#ff3a1a' : MAGMA[4], s: i % 3 ? 7 : 5 }); }
      R._skKick = { x: Math.cos(o.a) * 16, y: Math.sin(o.a) * 16 + 6, t: 0, T: 0.32 }; R.addShake(16); R._skUlt = { t: 0, T: 0.5, c: '#ffffff', d: '#5a0e08' };
      if (sm) sm.hitstop = Math.max(sm.hitstop || 0, 0.14);
    }
    if (o.mode === 'coil' && sm) dragonVortex(c, sm.p.x, sm.p.y, t, 0.8);
    // thân: vẽ từ đuôi lên đầu; đốt phía sau (d < 0) mờ hơn để có chiều sâu
    for (let j = N - 1; j >= 1; j--) {
      const g = seg[j], tail = j >= N - 4, r = tail ? Math.max(WPP, 9 - (j - (N - 4)) * 2.2) : 14 - j * 0.28, nx = -Math.sin(g.va), ny = Math.cos(g.va);
      c.globalAlpha = fade * (g.d < 0 ? 0.75 : 0.95);
      disc(c, g.x, g.y, r + WPP, '#140404'); disc(c, g.x, g.y, r, j & 1 ? '#7a1610' : '#9a1e12'); disc(c, g.x - nx * r * 0.3, g.y - ny * r * 0.3, Math.max(WPP, r * 0.5), '#c8301a');
      sq(c, g.x + nx * r * 0.55, g.y + ny * r * 0.55, WPP * 2, j & 1 ? MAGMA[4] : MAGMA[3]);   // vảy bụng vàng dung nham
      if (!tail && j % 2 === 0) { const fl = ((t * 12) | 0) + j & 1, L2 = r + 9 + fl * 2; line(c, g.x - nx * r, g.y - ny * r, g.x - nx * L2, g.y - ny * L2, WPP * 2, MAGMA[3], WPP); sq(c, g.x - nx * (L2 + 2), g.y - ny * (L2 + 2), WPP, '#ffffff'); }   // vây lưng phát sáng
      if (j === 4 || j === 9) for (const sd of [-1, 1]) { const lx = g.x + nx * sd * (r + 8) - Math.cos(g.va) * 4, ly = g.y + ny * sd * (r + 8) - Math.sin(g.va) * 4; line(c, g.x, g.y, lx, ly, WPP * 2, '#5a0e08', WPP); for (const cl of [-0.5, 0, 0.5]) sq(c, lx + Math.cos(g.va + cl) * 4, ly + Math.sin(g.va + cl) * 4, WPP, '#e6d29a'); }   // hai cặp chân vuốt
    }
    // chóp đuôi lửa + vệt tia dung nham và khói
    const tl = seg[N - 1], tq = (t * 20) | 0;
    for (let i = 0; i < 4; i++) sq(c, tl.x - Math.cos(tl.va) * i * 4 + (H(i, tq) - 0.5) * 6, tl.y - Math.sin(tl.va) * i * 4 + (H(tq, i) - 0.5) * 6, WPP * (3 - i * 0.5), i ? MAGMA[3] : '#ffffff');
    if (R.parts.length < 900) R.parts.push({ x: tl.x, y: tl.y, vx: (Math.random() - 0.5) * 40, vy: -30, life: 0.7, max: 0.7, c: Math.random() < 0.6 ? MAGMA[4] : '#3a2a2a', s: 4 });
    // đầu: quay theo vector vận tốc, mắt sáng, sừng vàng, râu bay, hàm há phun tàn lửa
    const HS = 1.45, h = seg[0], va = h.va, ca = Math.cos(va), sa = Math.sin(va), up = ca < 0 ? -1 : 1, L = (u, v) => [h.x + (ca * u - sa * v * up) * HS, h.y + (sa * u + ca * v * up) * HS];
    const jaw = 4 + Math.round(Math.abs(Math.sin(t * 7)) * 5);
    c.globalAlpha = fade;
    for (const [u0, u1, v, w2, col] of [[-10, 14, -2, 16, '#140404'], [-8, 12, -2, 12, '#9a1e12'], [8, 26, -3, 9, '#9a1e12'], [-6, 10, -6, 6, '#c8301a']]) for (let u = u0; u <= u1; u += 2) { const [x, y] = L(u, v); sq(c, x, y, w2 * HS, col); }
    for (let u = 8; u <= 24; u += 2) { const [x, y] = L(u, 5 + (u - 8) / 16 * jaw); sq(c, x, y, 6 * HS, '#7a1610'); }   // hàm dưới
    for (let u = 12; u <= 24; u += WPP * 2) { const [x, y] = L(u, 2); sq(c, x, y, WPP, '#ffffff'); const [x2, y2] = L(u, 3 + (u - 8) / 16 * jaw); sq(c, x2, y2, WPP, '#ffffff'); }   // răng
    const [mx, my] = L(22, 3 + jaw * 0.6); sq(c, mx, my, WPP * 2, '#ffe27a');
    const [ex, ey] = L(6, -7); sq(c, ex, ey, WPP * 2, '#ffe27a'); sq(c, ex + ca * 2, ey + sa * 2, WPP, '#ffffff');   // mắt
    for (const [v0, v1] of [[-8, -20], [-4, -16]]) { let [px2, py2] = L(-2, v0); for (let s2 = 1; s2 <= 4; s2++) { const [qx, qy] = L(-2 - s2 * 5, v0 + (v1 - v0) * s2 / 4); line(c, px2, py2, qx, qy, WPP * (s2 < 3 ? 2 : 1), s2 > 2 ? '#fff4c0' : MAGMA[4], WPP); px2 = qx; py2 = qy; } }   // sừng vàng
    for (const sd of [0, 1]) { let [px2, py2] = L(20, 6 + sd * 4); for (let s2 = 1; s2 <= 6; s2++) { const [qx, qy] = L(20 - s2 * 7, 8 + sd * 6 + Math.sin(t * 10 + s2 + sd * 2) * 5); line(c, px2, py2, qx, qy, WPP, s2 & 1 ? MAGMA[4] : MAGMA[3], WPP); px2 = qx; py2 = qy; } }   // râu bay
    if (Math.random() < 0.7) { const a2 = va + (Math.random() - 0.5) * 0.4, sp = 260 + Math.random() * 160; R.parts.push({ x: mx, y: my, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp, life: 0.3, max: 0.3, c: Math.random() < 0.5 ? MAGMA[3] : '#ffe27a', s: 4 }); }   // hơi thở lửa dọc quỹ đạo (vừa đủ, không che thân rồng)
    if (o.mode === 'coil' && k > 0.15 && Math.random() < 0.5) { const tp = seg[N - 2]; R.parts.push({ x: tp.x, y: tp.y, vx: Math.cos(tp.va + 1.57) * 300, vy: Math.sin(tp.va + 1.57) * 300, life: 0.25, max: 0.25, c: '#ffffff', s: 4 }); }   // đuôi quất ra ngoài
    if (k > 0.85) for (let i = 0; i < 2; i++) { const g = seg[(Math.random() * N) | 0]; R.parts.push({ x: g.x, y: g.y, vx: 0, vy: -60 - Math.random() * 60, life: 0.8, max: 0.8, c: Math.random() < 0.5 ? MAGMA[4] : MAGMA[3], s: 4 }); }   // tan thành tàn lửa
    c.globalAlpha = 1;
  }
});
// sao 4 cánh pixel nguyên (không gradient): tâm trắng, cánh vàng-trắng; n = độ dài cánh tính bằng pixel
function pixStar(c, x, y, n) {
  const X = sn(x), Y = sn(y), px1 = (i, j, col) => { c.fillStyle = col; c.fillRect(X + i * WPP, Y + j * WPP, WPP, WPP); };
  px1(0, 0, '#ffffff'); for (const [i, j] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) px1(i, j, '#fff2a0');
  for (let i = 1; i <= n; i++) { const col = i <= n - 2 ? '#ffffff' : '#ffd84a'; px1(0, -i, col); px1(0, i, col); px1(-i, 0, col); px1(i, 0, col); }
}
DRAW.muzzle = (c, o, k) => pixStar(c, o.x, o.y, k < 0.5 ? 5 : 3);   // loé 2–3 khung lúc tung đòn (Celestial)
const SIG = DRAW.sigil;
DRAW.sigil = (c, o, k, t) => { SIG(c, o, k, t); if (!o.holy) return; const r = o.r * (0.5 + 0.5 * Math.min(1, k * 3)); c.globalAlpha = Math.max(0, 1 - k * k); ring(c, o.x, o.y, r * 1.25, WPP, VIOLET, 0, -t * 2); for (let i = 0; i < 12; i++) { const a = t * 4 + i * 0.524; line(c, o.x + Math.cos(a) * r * 1.05, o.y + Math.sin(a) * r * 0.9, o.x + Math.cos(a) * r * 1.25, o.y + Math.sin(a) * r * 1.06, WPP, i & 1 ? '#ffffff' : '#ffb81a', WPP); } c.globalAlpha = 1; };

// ================= hook: sự kiện chiêu =================
export function skinEvent(R, e, th, cat, cls, sim) {
  const S = st(th), P = full5(th), X = R.skx || (R.skx = []), add = (k, o) => X.push({ k, t: 0, T: 0.5, P, seed: Math.random() * 100, ...o });
  R._skSim = sim;
  if (cat === 'single' && heroSingle(th.id, R, e, cls, sim)) return;   // 12 chiêu đơn HEROES: hình riêng từng chiêu
  const LN = LINES[th.id]; if (e.ev !== 'hit' && LN && lineEvent(LN, R, e, cat, cls, sim)) return;   // dòng skin có module riêng → không dùng mẫu chung
  if (e.ev === 'hit') { if (th.id === 'starlight' && cat === 'basic') add('shards', { x: e.x, y: e.y - 8, a: e.a ?? 0, T: 0.45 }); return; }
  // ----- Dragon Knight: tuyệt kỹ = rồng xoắn quanh người rồi bổ nhào, khắc vết vuốt dung nham -----
  if (th.id === 'dragonfire' && cat === 'ult' && e.ev === 'ultCast') {
    const p = sim.p, a = p.aim, coil = e.id === 'sunder' || e.id === 'monsoon' || (e.id !== 'meteorblade' && e.id !== 'titan' && Math.random() < 0.5);   // lốc/vũ điệu → cuộn quanh người · thiên thạch/người khổng lồ → bổ nhào
    add('dragonUlt', { x: p.x, y: p.y, a, a0: a + Math.PI, mode: coil ? 'coil' : 'dive', tx: p.x + Math.cos(a) * 170, ty: p.y + Math.sin(a) * 170, T: coil ? 2.6 : 2.1, P: ultPalOf(th) });
    R._skUlt = { t: 0, T: 0.8, c: '#ffb03a', d: '#140404' }; R.addShake(8); glyph(R, th, p.x, p.y + 8, 90, 0.8); return;
  }
  // ----- Celestial Archon: phán xét thần thánh -----
  if (th.id === 'celestial') {
    if (cat === 'basic') {
      if (e.ev === 'shoot' && e.kind === 'orb') { const f = Math.cos(e.a) < 0 ? -1 : 1, q = e.a - 0.5 * f, mx = e.x + Math.cos(q) * 62, my = e.y - 10 + Math.sin(q) * 62; add('sigil', { x: mx, y: my, r: 26, T: 0.4, holy: true }); add('muzzle', { x: mx, y: my, T: 0.06 }); return; }
      if (e.ev === 'boom' && !e.el) { add('holyRing', { x: e.x, y: e.y, r: (e.r || 70) * 1.25, T: 0.5 }); motif(R, th, e.x, e.y, 10, (e.r || 70) * 0.5, 'star'); if (R.addShake) R.addShake(4); return; }
    } else if (cat !== 'move' && e.ev !== 'ultCast') {
      if (e.ev === 'skill') { add('judgment', { x: e.x, y: e.y + 10, r: cat === 'ult' ? 110 : 80, T: 0.9 }); return; }
      if (e.ev === 'volley' || e.ev === 'dash' || e.ev === 'trapSet' || (e.ev === 'rainHit' && !e.big && Math.random() > 0.15) || X.filter(o => o.k === 'judgment').length > 10) return;
      const pos = e.ev === 'arcSlash' ? [e.x + Math.cos(e.a) * (e.range || 100) * 0.8, e.y + Math.sin(e.a) * (e.range || 100) * 0.8] : e.ev === 'beam' || e.ev === 'blink' ? [e.x2, e.y2] : [e.x, e.y];
      if (pos[0] === undefined) return;
      const el = e.el || (e.els && e.els[0]);
      add('judgment', { x: pos[0], y: pos[1], r: Math.min(110, Math.max(44, (e.r || 60) * 0.9)), mode: cat === 'single' ? 'pillar' : cat === 'duo' ? 'meteor' : 'rift', E: el ? elPal(th, el)[2] : '#ffb81a', T: cat === 'ult' ? 1.1 : 0.85 });
      if (R.addShake) R.addShake(cat === 'single' ? 3 : 6); return;
    }
  }
  if (cat === 'basic') {
    if (e.ev === 'swing') {
      const range = e.reach || 104, arc = e.arc || 1.4, dir = e.dir || (e.combo % 2 ? 1 : -1);
      add('crescent', { x: e.x, y: e.y, a: e.a, range, arc, dir, big: e.charge > 0.3 || e.big, style: S.slash || 'smooth', T: e.charge ? 0.34 : 0.24 });
      for (let i = 0; i < 6; i++) { const q = e.a + (i / 5 - 0.5) * arc; motif(R, th, e.x + Math.cos(q) * range, e.y + Math.sin(q) * range, 1, 4, 'spark'); }
      if (e.charge > 0.6) glyph(R, th, e.x + Math.cos(e.a) * range * 0.6, e.y + Math.sin(e.a) * range * 0.6, Math.min(70, range * 0.5), 0.4);
    } else if (e.ev === 'knightWave') { add('shock', { x: e.x, y: e.y, r0: 20, r: e.r, jag: true, w: 3, T: 0.45 }); add('shock', { x: e.x, y: e.y, r0: 10, r: e.r * 0.7, T: 0.35, P: [P[0], P[1], P[3], P[2]] }); glyph(R, th, e.x, e.y, e.r * 0.5, 0.5); }
    else if (e.ev === 'shoot' && cls === 'RANGER') { const big = e.kind !== 'arrow', bx = e.x + Math.cos(e.a) * 28, by = e.y - 10 + Math.sin(e.a) * 28; add('shock', { x: bx, y: by, a: e.a, r0: 4, r: big ? 38 : 18, sx: 0.32, sy: 1, T: big ? 0.36 : 0.22, w: big ? 2 : 1 }); if (big) add('shock', { x: bx + Math.cos(e.a) * 20, y: by + Math.sin(e.a) * 20, a: e.a, r0: 4, r: 26, sx: 0.32, sy: 1, T: 0.3 }); motif(R, th, bx, by, big ? 6 : 2, 8); }
    else if (e.ev === 'shoot' && cls === 'MAGE' && e.kind === 'orb') { const f = Math.cos(e.a) < 0 ? -1 : 1, q = e.a - 0.5 * f; add('sigil', { x: e.x + Math.cos(q) * 56, y: e.y - 10 + Math.sin(q) * 56, r: 20, T: 0.32 }); }
    else if (e.ev === 'boom' && !e.el) { add('burst', { x: e.x, y: e.y, r: e.r || 70, T: 0.45 }); motif(R, th, e.x, e.y, 8, (e.r || 70) * 0.5); }
    return;
  }
  if (cat === 'move') { if (e.ev === 'dash') { glyph(R, th, e.x, e.y + 8, 30, 0.35); motif(R, th, e.x, e.y, 10, 16); add('shock', { x: e.x, y: e.y + 8, r0: 6, r: 36, T: 0.3, sy: 0.45 }); } return; }
  if (cat === 'single') {
    const el = e.el || (e.els && e.els[0]), E = el ? elPal(th, el) : P, kind = el === 'FIRE' ? 'flare' : el === 'WATER' ? 'wave' : el === 'EARTH' ? 'spikes' : 'gust';
    switch (e.ev) {
      case 'skill': glyph(R, th, e.x, e.y + 8, 40, 0.45); motif(R, th, e.x, e.y - 10, 6, 24); return;
      case 'arcSlash': for (let i = 0; i < 3; i++) { const q = e.a + (i - 1) * (e.arc || 1.4) * 0.35, d = (e.range || 100) * 0.8; add(kind, { x: e.x + Math.cos(q) * d, y: e.y + Math.sin(q) * d, r: 30, P: E, T: 0.4 }); } break;
      case 'beam': for (let i = 1; i <= 4; i++) add(kind, { x: e.x1 + (e.x2 - e.x1) * i / 4, y: e.y1 + (e.y2 - e.y1) * i / 4, r: 26, P: E, T: 0.4 }); break;
      case 'blink': add(kind, { x: e.x2, y: e.y2, r: 44, P: E, T: 0.45 }); break;
      case 'rainHit': if (e.big || Math.random() < 0.35) add(kind, { x: e.x, y: e.y, r: e.big ? Math.max(30, e.r || 50) : 22, P: E, T: 0.35 }); break;
      case 'volley': case 'dash': case 'trapSet': break;
      default: if (e.x !== undefined) add(kind, { x: e.x, y: e.y, r: Math.min(110, Math.max(30, e.r || 50)), P: E, T: 0.5 });
    }
    if (e.x !== undefined && Math.random() < 0.5) glyph(R, th, e.x, e.y, 24, 0.35);   // chữ ký nhỏ của skin
    return;
  }
  if (cat === 'duo') {
    switch (e.ev) {
      case 'skill': glyph(R, th, e.x, e.y + 8, 56, 0.55); motif(R, th, e.x, e.y - 10, 10, 30); return;
      case 'arcSlash': add('cone', { x: e.x, y: e.y, a: e.a, r: (e.range || 120) * 1.15, arc: Math.min(1.6, e.arc || 1), style: S.cone, T: 0.5 }); return;
      case 'beam': add('cone', { x: e.x1, y: e.y1, a: Math.atan2(e.y2 - e.y1, e.x2 - e.x1), r: Math.hypot(e.x2 - e.x1, e.y2 - e.y1), arc: 0.35, style: S.cone, T: 0.45 }); return;
      case 'volley': add('cone', { x: e.x, y: e.y, a: e.a ?? sim.p.aim, r: 160, arc: 0.7, style: S.cone, T: 0.4 }); return;
      case 'whirl': case 'knightWave': add('claw', { x: e.x, y: e.y, a: sim.p.aim, r: e.r || 120, style: S.claw, T: 0.4 }); add('shock', { x: e.x, y: e.y, r0: 10, r: e.r || 100, jag: true, T: 0.35 }); return;
      case 'blink': add('claw', { x: e.x1, y: e.y1, a: Math.atan2(e.y2 - e.y1, e.x2 - e.x1), r: Math.hypot(e.x2 - e.x1, e.y2 - e.y1), style: S.claw, T: 0.4 }); return;
      case 'rainHit': if (!e.big && Math.random() > 0.2) return; break;
      case 'dash': case 'trapSet': return;
    }
    if (e.x !== undefined) add('slam', { x: e.x, y: e.y, r: Math.min(140, Math.max(50, e.r || 70)), style: S.slam, T: 0.7 });
    return;
  }
  if (cat === 'ult') {
    if (e.ev === 'ultCast') {
      const p = sim.p, a = p.aim, tx = p.x + Math.cos(a) * 180, ty = p.y + Math.sin(a) * 180, o = { x: p.x, y: p.y, a, face: Math.cos(a) < 0 ? -1 : 1, tx, ty, style: S.ult, T: 1.5, bone: S.bone };
      if (S.ult === 'starfall') o.pts = Array.from({ length: 7 }, (_, i) => [tx + Math.cos(i * 0.9 + 0.3) * (50 + (i % 3) * 30), ty + Math.sin(i * 0.9 + 0.3) * (40 + (i % 3) * 22)]);
      if (S.ult) add('avatar', o);
      R._skUlt = { t: 0, T: 0.8, c: th.pal[2], d: th.pal[0] }; if (R.addShake) R.addShake(8); glyph(R, th, p.x, p.y + 8, 90, 0.8);
    } else if (e.x !== undefined) { if (Math.random() < 0.5) glyph(R, th, e.x, e.y, Math.min(110, e.r || 60), 0.5); motif(R, th, e.x, e.y, 6, Math.min(60, (e.r || 60) * 0.6)); if (Math.random() < 0.35) add('slam', { x: e.x, y: e.y, r: Math.min(120, Math.max(50, e.r || 70)), style: S.slam, T: 0.6 }); }
  }
}

// ================= hook: đạn =================
// trả true nếu đã tự vẽ trọn viên đạn (renderer bỏ qua hình mặc định); hình dạng/kích thước vùng trúng giữ nguyên
function ribbonFor(R, s) { const M = R.skribM || (R.skribM = new WeakMap()); let r = M.get(s); if (!r) { r = { pts: [], seen: 0, fade: 1, w: s.kind === 'arrow' ? 1 : 1.6 }; M.set(s, r); (R.skrib || (R.skrib = [])).push(r); } return r; }
function elementShot(R, ctx, s, E, el, t, ca, sa, th) {
  const r = s.r || 6;
  switch (s.kind) {
    case 'crescent': { const W2 = (s.width || 40) / 2, cx = s.x - ca * 12, cy = s.y - sa * 12; for (let i = -9; i <= 9; i++) { const q = s.a + i / 9 * 1.1, ox = Math.cos(q), oy = Math.sin(q); for (let d = 0; d < 10; d += WPP * 2) sq(ctx, cx + ox * (W2 - d), cy + oy * (W2 - d), WPP * 2, d === 0 ? E[3] : d < 5 ? E[2] : E[1]); if (Math.abs(i) > 6 || i % 3 === 0) flourish(ctx, el, cx + ox * W2, cy + oy * W2, E, t, i); } return; }
    case 'cyclone': for (let i = 0; i < 10; i++) { const a = t * 12 + i * 0.8, rr = 6 + i * 5; sq(ctx, s.x + Math.cos(a) * rr, s.y - i * 4 + Math.sin(a) * rr * 0.5, WPP * (i < 3 ? 3 : 2), i % 3 === 0 ? E[3] : i & 1 ? E[2] : E[1]); } return;
    case 'sarrow': case 'shard': line(ctx, s.x - ca * 20, s.y - sa * 20, s.x, s.y, WPP * 2, E[1], WPP); line(ctx, s.x - ca * 16, s.y - sa * 16, s.x, s.y, WPP, E[2], WPP); for (const d of [-1, 1]) sq(ctx, s.x - ca * 4 - sa * 4 * d, s.y - sa * 4 + ca * 4 * d, WPP * 2, E[3]); sq(ctx, s.x + ca * 3, s.y + sa * 3, WPP * 2, E[4]); flourish(ctx, el, s.x - ca * 20, s.y - sa * 20, E, t, 0); return;
  }
  // đạn tròn: mỗi nguyên tố một hình
  if (el === 'FIRE') { for (let i = 0; i < 6; i++) { const a = t * 12 + i * 1.047, L = r + 4 + H(i, (t * 20) | 0) * 7; line(ctx, s.x, s.y, s.x + Math.cos(a) * L - ca * 4, s.y + Math.sin(a) * L - sa * 4, WPP, i & 1 ? E[2] : E[3], WPP); } for (let i = 1; i <= 6; i++) sq(ctx, s.x - ca * i * 6, s.y - sa * i * 6, WPP * Math.max(1, 3 - i * 0.4), i < 3 ? E[2] : E[1]); sq(ctx, s.x, s.y, WPP * (r > 10 ? 4 : 3), E[4]); }
  else if (el === 'WATER') { for (let i = -5; i <= 5; i++) { const q = s.a + i / 5 * 1.2, cx = s.x - ca * (r + 2); sq(ctx, cx + Math.cos(q) * (r + 6), s.y - sa * (r + 2) + Math.sin(q) * (r + 6), WPP * 2, Math.abs(i) > 3 ? E[3] : E[1]); } sq(ctx, s.x, s.y, WPP * 2, E[4]); for (let i = 1; i <= 4; i++) sq(ctx, s.x - ca * i * 8 + Math.sin(t * 20 + i) * 3, s.y - sa * i * 8, WPP, E[2]); }
  else if (el === 'EARTH') { const a0 = t * 10, pts = [0, 1, 2, 3].map(i => [s.x + Math.cos(a0 + i * 1.571) * (r + 3), s.y + Math.sin(a0 + i * 1.571) * (r + 3)]); for (let i = 0; i < 4; i++) line(ctx, pts[i][0], pts[i][1], pts[(i + 1) % 4][0], pts[(i + 1) % 4][1], WPP * 2, i & 1 ? E[0] : E[1], WPP); disc(ctx, s.x, s.y, r, E[1]); line(ctx, pts[0][0], pts[0][1], pts[2][0], pts[2][1], WPP, E[3], WPP); sq(ctx, s.x, s.y, WPP, E[4]); }
  else { for (let i = 0; i < 4; i++) { const a = t * 16 + i * 1.571; for (let j = 1; j <= 3; j++) sq(ctx, s.x + Math.cos(a + j * 0.25) * j * (r * 0.5 + 2), s.y + Math.sin(a + j * 0.25) * j * (r * 0.5 + 2), WPP * (j === 3 ? 1 : 2), j === 3 ? E[3] : E[1]); } sq(ctx, s.x, s.y, WPP * 2, E[4]); }
  if (Math.random() < 0.35) motif(R, th, s.x - ca * 8, s.y - sa * 8, 1, 4);
}
function flourish(ctx, el, x, y, E, t, i) {
  if (el === 'FIRE') sq(ctx, x, y - 4 - H(i, (t * 16) | 0) * 6, WPP, E[3]);
  else if (el === 'WATER') sq(ctx, x, y - WPP * 2, WPP, E[4]);
  else if (el === 'EARTH') sq(ctx, x + WPP, y + WPP, WPP * 2, E[0]);
  else sq(ctx, x + Math.cos(t * 10 + i) * 4, y + Math.sin(t * 10 + i) * 4, WPP, E[3]);
}
export function shotHook(R, ctx, s, th, cat, t) {
  const LN = LINES[th.id]; if (LN && LN.shot && LN.shot(R, ctx, s, cat, t)) return true;
  const P = th.pal, a = s.a ?? Math.atan2(s.vy, s.vx), ca = Math.cos(a), sa = Math.sin(a);
  if (cat === 'basic' && th.id === 'starlight' && (s.kind === 'arrow' || s.kind === 'pierce' || s.kind === 'silver')) { // mũi tên ray siêu tốc + vệt chòm sao lăng kính
    const big = s.kind !== 'arrow', r = ribbonFor(R, s); r.th = th; r.seen = R.time; r.prism = true; r.pts.push([s.x, s.y]); if (r.pts.length > (big ? 34 : 20)) r.pts.shift();
    if (big && (r.lx === undefined || Math.hypot(s.x - r.lx, s.y - r.ly) > 70)) { r.lx = s.x; r.ly = s.y; (R.skx || (R.skx = [])).push({ k: 'railRing', t: 0, T: 0.45, P: full5(th), seed: 0, x: s.x, y: s.y, a }); }
    const L = big ? 48 : 30; line(ctx, s.x - ca * L, s.y - sa * L, s.x, s.y, WPP * (big ? 3 : 2), '#7fe0ff', WPP); line(ctx, s.x - ca * L * 0.9, s.y - sa * L * 0.9, s.x, s.y, WPP, '#ffffff', WPP);
    star(ctx, s.x + ca * 3, s.y + sa * 3, big ? 10 : 6, '#ffffff', 4, t * 10); sq(ctx, s.x, s.y, WPP * (big ? 3 : 2), '#ffffff');
    return true;
  }
  if (cat === 'basic' && th.id === 'celestial' && s.kind === 'orb') { // giáo mặt trời / ngôi sao co sụp, kéo vệt sét vàng
    const rr = s.r || 8, big = (s.charge || 0) > 0.6 || s.full, r = ribbonFor(R, s); r.th = th; r.seen = R.time; r.bolt = true; r.pts.push([s.x, s.y]); if (r.pts.length > 16) r.pts.shift();
    if (big) { const pul = 1 + Math.sin(t * 30) * 0.15; ring(ctx, s.x, s.y, (rr + 14) * pul, WPP, VIOLET, 0, t * 4); ring(ctx, s.x, s.y, (rr + 22) * (2 - pul), WPP, '#ffb81a', 6, -t * 5); disc(ctx, s.x, s.y, rr + 5, '#ffb81a'); disc(ctx, s.x, s.y, rr, '#ffffff'); for (let i = 0; i < 4; i++) { const q = t * 5 + i * 1.571; line(ctx, s.x, s.y, s.x + Math.cos(q) * (rr + 18), s.y + Math.sin(q) * (rr + 18), WPP, i & 1 ? '#ffb81a' : '#ffffff', WPP); } }
    else { const L = 34 + rr; line(ctx, s.x - ca * L, s.y - sa * L, s.x, s.y, WPP * 3, VIOLET, WPP); line(ctx, s.x - ca * L, s.y - sa * L, s.x, s.y, WPP * 2, '#ffb81a', WPP); line(ctx, s.x - ca * L * 0.8, s.y - sa * L * 0.8, s.x, s.y, WPP, '#ffffff', WPP); for (const d of [-1, 1]) line(ctx, s.x + ca * 4, s.y + sa * 4, s.x - ca * 8 - sa * 7 * d, s.y - sa * 8 + ca * 7 * d, WPP, '#ffffff', WPP); sq(ctx, s.x + ca * 5, s.y + sa * 5, WPP * 2, '#ffffff'); }
    return true;
  }
  if (cat === 'basic') {
    if (s.kind === 'arrow' || s.kind === 'pierce' || s.kind === 'silver') { // mũi tên năng lượng + dải lụa nhiều lớp còn đọng lại
      const big = s.kind !== 'arrow', r = ribbonFor(R, s); r.th = th; r.seen = R.time; r.pts.push([s.x, s.y]); if (r.pts.length > (big ? 24 : 14)) r.pts.shift();
      line(ctx, s.x - ca * 18, s.y - sa * 18, s.x, s.y, WPP * (big ? 2 : 1), P[2], WPP); for (const d of [-1, 1]) line(ctx, s.x, s.y, s.x - ca * 8 - sa * 5 * d, s.y - sa * 8 + ca * 5 * d, WPP, P[3], WPP);
      sq(ctx, s.x + ca * 2, s.y + sa * 2, WPP * (big ? 3 : 2), P[3]); for (const d of [-1, 1]) sq(ctx, s.x - ca * 18 - sa * 4 * d, s.y - sa * 18 + ca * 4 * d, WPP, P[1]);
      return true;
    }
    if (s.kind === 'orb') { // quả cầu nhiều vệt xoắn + sao vệ tinh
      const rr = s.r || 8;
      for (let j = 0; j < 3; j++) for (let i = 1; i <= 8; i++) { const off = Math.sin(t * 14 + i * 0.8 + j * 2.094) * rr * 0.9; sq(ctx, s.x - ca * i * 6 - sa * off, s.y - sa * i * 6 + ca * off, WPP * (i < 4 ? 2 : 1), j === 0 ? P[3] : P[1 + (j & 1)]); }
      disc(ctx, s.x, s.y, rr + 4, P[1]); disc(ctx, s.x, s.y, rr, P[2]); sq(ctx, s.x - rr * 0.3, s.y - rr * 0.3, WPP * 2, P[3]);
      for (let i = 0; i < 3; i++) { const q = t * 8 + i * 2.094; sq(ctx, s.x + Math.cos(q) * (rr + 9), s.y + Math.sin(q) * (rr + 9) * 0.8, WPP * 2, P[3]); }
      if (s.full) ring(ctx, s.x, s.y, rr + 14, WPP, P[3], 6, t * 5);
      return true;
    }
    if (s.kind === 'spark') { star(ctx, s.x, s.y, 7, P[3], 4, t * 8); return true; }
    return false;
  }
  const els = (s.sk && (s.sk.dual || s.sk.combo || s.sk.els)) || [s.el, s.el], el = s.el || els[0];
  if (cat === 'single') { elementShot(R, ctx, s, elPal(th, el), el, t, ca, sa, th); return true; }
  if (cat === 'duo' || cat === 'ult') { // màu chủ đề + bện hai nguyên tố
    const A = elPal(th, els[0]), B = elPal(th, els[1] || els[0]), r = s.r || 6;
    elementShot(R, ctx, s, full5(th), el, t, ca, sa, th);
    for (let i = 1; i <= 9; i++) { const off = Math.sin(t * 16 + i * 0.7) * (r + 4); for (const [d, Q] of [[1, A], [-1, B]]) sq(ctx, s.x - ca * i * 5 - sa * off * d, s.y - sa * i * 5 + ca * off * d, WPP * (i < 4 ? 2 : 1), Q[i < 3 ? 3 : 1]); }
    if (cat === 'ult') star(ctx, s.x, s.y, r + 10, P[3], 4, t * 6);
    return true;
  }
  return false;
}

// ================= hook: đi lại, lướt, tụ lực =================
function footprint(c, f, k) {
  const P = f.P, ca = Math.cos(f.a), sa = Math.sin(f.a), pt = (u, v, s, col) => sq(c, f.x + ca * u - sa * v, f.y + sa * u + ca * v, s, col);
  switch (f.st) {
    case 'ember': case 'magma': { const col = k < 0.25 ? '#ffd36b' : k < 0.55 ? '#ff5a1a' : '#3a2018'; pt(0, 0, WPP * 2, col); pt(4, 0, WPP, col); break; }
    case 'frost': pt(0, 0, WPP, P[3]); pt(-3, 0, WPP, P[2]); pt(3, 0, WPP, P[2]); pt(0, -3, WPP, P[2]); pt(0, 3, WPP, P[2]); break;
    case 'shadow': c.globalAlpha *= 0.6; disc(c, f.x, f.y, 4 + k * 5, '#0a0812'); break;
    case 'star': if (Math.floor(f.t * 10) % 3) { pt(0, 0, WPP, '#ffffff'); pt(3, 0, WPP, P[2]); pt(-3, 0, WPP, P[2]); } break;
    case 'void': ring(c, f.x, f.y, 4 + k * 4, WPP, P[2]); break;
    case 'spore': pt(0, 0, WPP * 2, P[1]); if (k > 0.2) { pt(0, -3, WPP, '#d8d0b8'); pt(0, -6, WPP * 2, P[2]); } break;
    case 'spark': if (k < 0.4) { pt(0, 0, WPP, '#ffffff'); pt(3, -3, WPP, P[2]); pt(-3, 3, WPP, P[2]); } break;
    default: pt(0, 0, WPP * 2, P[2]); pt(4, 0, WPP, P[3]);
  }
}
export function walkHook(R, ctx, p, th, t, dt, moving, dashing, aura) {
  const LN = LINES[th.id]; if (LN && LN.walk) { drawDecals(R, ctx, dt, t); LN.walk(R, ctx, p, t, dt, moving, dashing); return; }
  const S = st(th), P = th.pal, F = R.skfoot || (R.skfoot = []);
  if (moving && !dashing && !(p.z > 0)) { R._skFootT = (R._skFootT || 0) - dt; if (R._skFootT <= 0) { R._skFootT = 0.17; R._skSide = -(R._skSide || 1); const a = Math.atan2(p.vy, p.vx), q = a + Math.PI / 2; F.push({ x: p.x + Math.cos(q) * 4 * R._skSide, y: p.y + 10 + Math.sin(q) * 3 * R._skSide, a, t: 0, T: 1.8, st: S.foot || 'gold', P }); if (F.length > 40) F.shift(); } }
  for (const f of F) { f.t += dt; ctx.globalAlpha = Math.max(0, 1 - f.t / f.T); footprint(ctx, f, f.t / f.T); }
  ctx.globalAlpha = 1; R.skfoot = F.filter(f => f.t < f.T);
  if (moving) { R._skWisp = (R._skWisp || 0) - dt; if (R._skWisp <= 0) { R._skWisp = dashing ? 0.03 : 0.1; motif(R, th, p.x - p.vx * 0.03, p.y + 2, 1, 8, S.wisp); } }
  if (aura) { ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 4); ring(ctx, p.x, p.y + 10, 20, WPP, P[2], 4, t * 1.5); ctx.globalAlpha = 1; }
}
// bóng ảnh nhiều khung: lưu đúng khung hình (tư thế) ở từng thời điểm khi lướt / chạy nhanh, tô 2 màu xen kẽ
export function ghostHook(R, ctx, p, fr, th, X, Y, W, Hh, dashing, dt) {
  const LN = LINES[th.id]; if (LN && !LN.ghost && !ghostWhen(th.id, p)) return;   // chỉ dòng nào cần bóng ảnh thật (thép bóng tối) mới vẽ
  const G = R.skgh || (R.skgh = []), TC = R.skTint || (R.skTint = new Map()), fast = Math.hypot(p.vx, p.vy) > 300;
  R._skGhT = (R._skGhT || 0) - dt;
  if ((dashing || fast) && R._skGhT <= 0) { R._skGhT = 0.035; R._skGhI = ((R._skGhI || 0) + 1) % 2; G.push({ img: fr.img, x: p.x, y: p.y - (p.z || 0), face: p.face, t: 0, i: R._skGhI }); if (G.length > 10) G.shift(); }
  for (const g of G) {
    g.t += dt; const k = g.t / 0.32; if (k >= 1) continue; const col = g.i ? th.pal[2] : th.pal[1];
    let m = TC.get(g.img); if (!m) { m = {}; TC.set(g.img, m); if (TC.size > 240) TC.delete(TC.keys().next().value); } if (!m[col]) m[col] = tintOf(g.img, col);
    ctx.save(); ctx.globalAlpha = 0.55 * (1 - k); ctx.translate(sn(g.x), sn(g.y)); ctx.scale(g.face, 1); ctx.drawImage(m[col], X, Y, W, Hh); ctx.restore();
  }
  R.skgh = G.filter(g => g.t < 0.32);
}
export function chargeHook(R, ctx, p, th, t, sim) {
  const c = p.charge; if (!(c > 0.05)) return; const P = th.pal, ax = Math.cos(p.aim), ay = Math.sin(p.aim);
  if (p.cls === 'RANGER' && th.id === 'starlight') { // tia ngắm thiên hà sắc lẹm + khoá mục tiêu chòm sao + đồng hồ tụ lực ôm quanh người
    const bx = p.x + ax * 24, by = p.y + HAND_Y + ay * 24, L = 300 + 400 * c, ex = bx + ax * L, ey = by + ay * L, ready = c >= 0.75;
    line(ctx, bx, by, ex, ey, WPP * 3, '#1e1650', WPP); line(ctx, bx, by, ex, ey, WPP * 2, ready ? '#7fe0ff' : '#3a6aa8', WPP); line(ctx, bx, by, ex, ey, WPP, '#ffffff', WPP);
    for (let i = 0; i < 5; i++) { const u = (t * 1.6 + i / 5) % 1; sq(ctx, bx + ax * L * u, by + ay * L * u, WPP * 3, PRISM[i % 4]); }
    bracket(ctx, ex, ey, 16, t * 2.5, ready ? '#ffffff' : '#7fe0ff'); sq(ctx, ex, ey, WPP, '#ffffff');
    const locks = []; for (const e of (sim && sim.enemies) || []) { if (e.dead) continue; const dx = e.x - bx, dy = e.y - by, al = dx * ax + dy * ay, pe = Math.abs(-dx * ay + dy * ax); if (al > 0 && al < L && pe < (e.r || 16) + 26) locks.push([e, al]); }
    locks.sort((a, b) => a[1] - b[1]);
    locks.slice(0, 6).forEach(([e], i) => { const rr = (e.r || 16) + 10 + Math.max(0, 14 - ((t * 60 + i * 7) % 60)), ey2 = e.y - 10; bracket(ctx, e.x, ey2, rr, -t * 3 + i, i ? '#c08aff' : '#ffffff', WPP); star(ctx, e.x, ey2 - rr - 8, 4, '#ffe27a', 4, t * 6); if (i) { const [q] = locks[i - 1]; line(ctx, q.x, q.y - 10, e.x, ey2, WPP, '#8ac8ff', WPP * 3); } });
    const segs = 20, lit = Math.round(c * segs);
    for (let i = 0; i < segs; i++) { const a = 2.36 + i / segs * 4.71, on = i < lit, x2 = p.x + Math.cos(a) * 36, y2 = p.y - 8 + Math.sin(a) * 30; sq(ctx, x2, y2, WPP * (on ? 2 : 1), on ? (i >= segs * 0.75 ? '#ffffff' : PRISM[i % 2 ? 0 : 1]) : 'rgba(140,170,255,.25)'); }
    const m = 2.36 + 0.75 * 4.71; line(ctx, p.x + Math.cos(m) * 30, p.y - 8 + Math.sin(m) * 25, p.x + Math.cos(m) * 42, p.y - 8 + Math.sin(m) * 35, WPP, '#ffe27a', WPP);
    return;
  }
  if (p.cls === 'MAGE' && th.id === 'celestial') { // vòng ấn vàng xoay trước đầu trượng, to dần khi tụ lực
    const f = p.face || 1, tx = p.x + Math.cos(p.aim - 0.5 * f) * 62, ty = p.y + HAND_Y + Math.sin(p.aim - 0.5 * f) * 62, r = 14 + 16 * c;
    ring(ctx, tx, ty, r, WPP, '#ffb81a', 0, t * 3); ring(ctx, tx, ty, r * 1.3, WPP, VIOLET, 10, -t * 4); star(ctx, tx, ty, r * 0.8, '#ffffff', 6, t * 2);
    for (let i = 0; i < 8; i++) { const a = t * 3 + i * 0.785; sq(ctx, tx + Math.cos(a) * r * 1.15, ty + Math.sin(a) * r * 1.0, WPP * 2, i & 1 ? '#ffffff' : '#ffb81a'); }
    ring(ctx, p.x, p.y + 8, 26 + 14 * c, WPP, '#ffb81a', 8, t * 2);
    if (c >= 0.98) pixStar(ctx, tx, ty, ((t * 20) | 0) & 1 ? 3 : 4);
    return;
  }
  const LN = LINES[th.id]; if (LN && LN.charge) { LN.charge(R, ctx, p, t); return; }
  if (p.cls === 'KNIGHT') { // năng lượng hội tụ vào lưỡi kiếm, vòng răng cưa khi tụ đủ
    const hx = p.x + ax * 40, hy = p.y + HAND_Y + ay * 40;
    for (let i = 0; i < 10; i++) { const a = i * 0.628 + t * 2, d = 50 * (1 - ((t * 1.6 + i * 0.1) % 1)); sq(ctx, hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.8, WPP * 2, i & 1 ? P[2] : P[3]); }
    if (c >= 0.7) { ring(ctx, p.x, p.y + 8, 30 + Math.sin(t * 12) * 3, WPP, P[2], 6, t * 4); ring(ctx, p.x, p.y + 8, 40, WPP, P[1], 8, -t * 3); }
  } else if (p.cls === 'RANGER') { // đường hội tụ quanh cung + tâm ngắm (màn hình làm mờ mép riêng ở screenHook)
    const bx = p.x + ax * 24, by = p.y + HAND_Y + ay * 24; ctx.globalAlpha = 0.4 + 0.6 * c;
    for (let i = 0; i < 10; i++) { const a = i * 0.628 + 0.3, ph = (t * 2.2 + i * 0.13) % 1, r1 = 90 - ph * 70; line(ctx, bx + Math.cos(a) * r1, by + Math.sin(a) * r1, bx + Math.cos(a) * (r1 + 14), by + Math.sin(a) * (r1 + 14), WPP, i & 1 ? P[2] : P[3], WPP); }
    sq(ctx, bx, by, WPP * (2 + Math.round(c * 2)), P[3]); ctx.globalAlpha = 1;
    const L = 300 + 400 * c; ring(ctx, p.x + ax * L, p.y - 8 + ay * L, 14, WPP, P[2], 4, t * 3);
  } else { // pháp sư: hai vòng phép nghiêng xoay ngược chiều + hạt hội tụ ở đầu trượng
    for (const [rr, sy, sp, n] of [[30 + 12 * c, 0.4, 1.8, 14], [22 + 10 * c, 0.75, -2.6, 10]]) for (let i = 0; i < n; i++) { const a = t * sp + i / n * 6.283; sq(ctx, p.x + Math.cos(a) * rr, p.y - 6 + Math.sin(a) * rr * sy, WPP * (i % 3 ? 1 : 2), i % 3 ? P[2] : P[3]); }
    const f = p.face || 1, tx = p.x + Math.cos(p.aim - 0.5 * f) * 56, ty = p.y + HAND_Y + Math.sin(p.aim - 0.5 * f) * 56;
    for (let i = 0; i < 6; i++) { const a = i * 1.047 + t * 3, d = 30 * (1 - ((t * 1.4 + i * 0.16) % 1)); sq(ctx, tx + Math.cos(a) * d, ty + Math.sin(a) * d, WPP, P[3]); }
    if (c >= 0.98) star(ctx, tx, ty, 18, P[3], 5, t * 3);
  }
}
// lớp màn hình: viền mờ + tách màu khi Xạ thủ ngắm chậm, loé màn hình khi tung tuyệt kỹ
export function screenHook(R, ctx, sim, dt, W, Hh) {
  R._skSlowmo = false; const p = sim.p, fx = p && p.skinFx, th = fx && themeOf(fx.theme); if (!th) { R._skUlt = null; return; }
  if (p.cls === 'RANGER' && p.charge > 0.12 && covers(fx, 'basic') && th.id === 'starlight') { // viền chàm vũ trụ + vệt sáng hội tụ vào giữa
    R._skSlowmo = true; const c = p.charge, cx = W / 2, cy = Hh / 2, M = Math.hypot(W, Hh) / 2;
    const g = ctx.createRadialGradient(cx, cy, Math.min(W, Hh) * 0.28, cx, cy, M); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(18,10,70,' + (0.5 + 0.2 * c) + ')'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    ctx.lineWidth = 2; for (let i = 0; i < 18; i++) { const a = i * 0.349 + 0.17, u = (R.time * 1.8 + i * 0.137) % 1, r1 = M * (1 - u * 0.55), r2 = r1 - 40 - 60 * c; ctx.strokeStyle = 'rgba(' + (i % 3 ? '160,210,255' : '220,180,255') + ',' + (0.45 * c * (1 - u)) + ')'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(127,224,255,' + (0.25 + 0.3 * c) + ')'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, Hh - 8);
  } else if (p.cls === 'RANGER' && p.charge > 0.12 && covers(fx, 'basic') && !LINES[th.id]) {
    R._skSlowmo = true; const c = p.charge, pulse = 0.5 + 0.5 * Math.sin(R.time * 10);
    const g = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.3, W / 2, Hh / 2, Math.hypot(W, Hh) * 0.55); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(th.pal[1], 0.3 + 0.25 * c * pulse)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
    const o = 3 + 6 * c * pulse; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,60,90,.32)'; ctx.strokeRect(6 - o, 6, W - 12, Hh - 12); ctx.strokeStyle = 'rgba(60,220,255,.32)'; ctx.strokeRect(6 + o, 6, W - 12, Hh - 12); ctx.strokeStyle = rgba(th.pal[2], 0.45); ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, Hh - 4);
  }
  const u = R._skUlt; if (u) { u.t += dt; const k = u.t / u.T; if (k >= 1) R._skUlt = null; else { ctx.fillStyle = rgba(u.c, 0.22 * (1 - k)); ctx.fillRect(0, 0, W, Hh); const g = ctx.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.25, W / 2, Hh / 2, Math.hypot(W, Hh) * 0.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(u.d, 0.55 * (1 - k))); ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh); } }
}
// vẽ các thực thể hiệu ứng + dải lụa mũi tên (gọi mỗi khung, sau lớp hạt của skinfx)
export function drawHooks(R, ctx, dt, t) {
  if (R.skrib) {
    for (const r of R.skrib) {
      if (R.time - r.seen > 0.06) r.fade -= dt * 3.5; const n = r.pts.length; if (n < 2 || !r.th) continue; const P = r.th.pal;
      if (r.prism || r.bolt) { // dải lăng kính có nút sao (Starlight) / vệt sét vàng răng cưa (Celestial)
        const fr = (t * 24) | 0;
        for (let i = 1; i < n; i++) { const [x1, y1] = r.pts[i - 1], [x2, y2] = r.pts[i], u = i / n, al = Math.max(0, r.fade) * u;
          if (r.prism) { ctx.globalAlpha = al * 0.55; line(ctx, x1, y1, x2, y2, WPP * 3, PRISM[(i + fr) % 4], WPP * 2); ctx.globalAlpha = al; line(ctx, x1, y1, x2, y2, WPP, '#ffffff', WPP * 2); if (i % 5 === 0) star(ctx, x2, y2, 5, '#ffffff', 4, t * 4); if (i % 5 === 0 && i >= 5) line(ctx, r.pts[i - 5][0], r.pts[i - 5][1] - 8, x2, y2 - 8, WPP, '#8ac8ff', WPP * 3); }
          else { const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a), j1 = (H(i, fr) - 0.5) * 16, j2 = (H(i + 1, fr) - 0.5) * 16; ctx.globalAlpha = al; line(ctx, x1 + nx * j1, y1 + ny * j1, x2 + nx * j2, y2 + ny * j2, WPP * 2, '#ffb81a', WPP); line(ctx, x1 + nx * j1, y1 + ny * j1, x2 + nx * j2, y2 + ny * j2, WPP, '#ffffff', WPP); if (i % 4 === 0) sq(ctx, x2 - nx * j2, y2 - ny * j2, WPP, VIOLET); }
        }
        continue;
      }
      for (let i = 1; i < n; i++) { const [x1, y1] = r.pts[i - 1], [x2, y2] = r.pts[i], u = i / n, a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a), wv = Math.sin(i * 0.9 - t * 14) * 5 * r.w;
        ctx.globalAlpha = Math.max(0, r.fade) * u * 0.4; line(ctx, x1 + nx * wv, y1 + ny * wv, x2 + nx * wv, y2 + ny * wv, WPP * 2 * r.w, P[1], WPP * 2); line(ctx, x1 - nx * wv, y1 - ny * wv, x2 - nx * wv, y2 - ny * wv, WPP * 2 * r.w, P[1], WPP * 2);
        ctx.globalAlpha = Math.max(0, r.fade) * u * 0.85; line(ctx, x1, y1, x2, y2, WPP * 2 * r.w, P[2], WPP * 2); ctx.globalAlpha = Math.max(0, r.fade) * u; line(ctx, x1, y1, x2, y2, WPP, P[3], WPP * 2); }
    }
    ctx.globalAlpha = 1; R.skrib = R.skrib.filter(r => r.fade > 0);
  }
  drawLines(R, ctx, dt, t);
  if (R._skSim && R._skSim.p.skinFx && covers(R._skSim.p.skinFx, 'single')) lineFrame(R._skSim.p.skinFx.theme, R, ctx, R._skSim, t, dt);
  // Dragon Knight: lốc rồng nhiều tầng quanh người suốt lúc tuyệt kỹ đang hoạt động (thay cho đốm cam mờ)
  const sm = R._skSim; if (sm && R._skTh && R._skTh.id === 'dragonfire' && sm.p.cls === 'KNIGHT' && sm.ults && sm.ults.length) dragonVortex(ctx, sm.p.x, sm.p.y, t);
  if (R._skKick) { R._skKick.t += dt; if (R._skKick.t >= R._skKick.T) R._skKick = null; }
  if (R.skx) {
    for (const o of R.skx) { o.t += dt; const f = DRAW[o.k]; if (f) f(ctx, o, Math.min(1, o.t / o.T), t, R); }
    ctx.globalAlpha = 1; R.skx = R.skx.filter(o => o.t < o.T); if (R.skx.length > 140) R.skx.splice(0, R.skx.length - 140);
  }
}
// một chỗ để renderer gọi: mỗi đường vẽ (đi, lướt, đòn thường, tụ lực, chiêu đơn, ghép 2, ghép 3) có đúng một hook
// tia sáng pixel ở đầu trượng Pháp sư (không gradient): c = mức tụ lực, fl = độ loé ngay sau khi tung đòn (1 → 0)
function px1(c, x, y, i, j, col) { c.fillStyle = col; c.fillRect(sn(x) + i * WPP, sn(y) + j * WPP, WPP, WPP); }
const MUZ = {
  void(c, x, y, s, t) { const o = s * 0.8; tri(c, [x, y - 8 * o], [x - 7 * o, y + 5 * o], [x + 7 * o, y + 5 * o], '#2a1450'); for (let i = 0; i < 3; i++) { const a = i * 2.094 - Math.PI / 2; px1(c, x + Math.cos(a) * 8 * o, y + Math.sin(a) * 8 * o, 0, 0, '#9a6aff'); } for (let i = 0; i < 5; i++) { const a = H(i, (t * 8) | 0) * 6.283, d = 14 - ((t * 50 + i * 5) % 14); px1(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 0, 0, i & 1 ? '#14001e' : '#6a3aa0'); } },
  storm(c, x, y, s, t, a) { const n = Math.round(2 + s * 3); for (let i = 0; i <= n; i++) px1(c, x + Math.cos(a) * i * WPP, y + Math.sin(a) * i * WPP, 0, 0, i > n - 2 ? '#ffffff' : '#ffe27a'); for (const d of [-1, 1]) px1(c, x - Math.sin(a) * d * WPP * 2, y + Math.cos(a) * d * WPP * 2, 0, 0, '#c8983a'); for (let i = 0; i < 3; i++) px1(c, x + (H(i, (t * 6) | 0) - 0.5) * 12, y - ((t * 40 + i * 6) % 18), 0, 0, '#ffd36b'); },
  magma(c, x, y, s, t) { px1(c, x, y, 0, 0, '#fff0b0'); for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px1(c, x, y, i, j, '#ff6a1e'); if (s > 0.4) for (const [i, j] of [[2, -1], [-2, 1], [1, 2]]) px1(c, x, y, i, j, ((t * 10) | 0) & 1 ? '#ffb04a' : '#5a4234'); },
  glacier(c, x, y, s) { const n = 1 + Math.round(s * 2); px1(c, x, y, 0, 0, '#ffffff'); for (let i = 1; i <= n; i++) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) px1(c, x, y, a * i, b * i, i === n ? '#7fd0ff' : '#c8f4ff'); },
  spore(c, x, y, s, t) { px1(c, x, y, 0, 0, '#c8ff6a'); for (let i = 0; i < 6; i++) { const a = i * 1.047 + t * 2, d = 4 + s * 8; px1(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 0, 0, i & 1 ? '#3ad0e0' : '#a83ac8'); } },
  tempest(c, x, y, s, t) { const sd = (t * 30) | 0; for (let j = 0; j < 2 + Math.round(s * 2); j++) zigTo(c, x, y, x + (H(j, sd) - 0.5) * 26, y + (H(sd, j) - 0.5) * 26, sd + j); px1(c, x, y, 0, 0, '#ffffff'); },
  wyrm(c, x, y, s, t) { for (let i = 0; i < 3 + Math.round(s * 3); i++) px1(c, x + (H(i, (t * 12) | 0) - 0.5) * 8, y - i * WPP, 0, 0, i < 2 ? '#ffe27a' : '#ff7a2a'); px1(c, x, y, 0, 1, '#9a2e1c'); },
  celestial(c, x, y, s) { star4px(c, x, y, 2 + Math.round(s * 3), '#ffd84a', '#fff2a0'); },
  default(c, x, y, s) { star4px(c, x, y, 2 + Math.round(s * 3), '#9b8cff', '#e0d8ff'); }
};
function star4px(c, x, y, n, edge, mid) { px1(c, x, y, 0, 0, '#ffffff'); for (let i = 1; i <= n; i++) { const col = i === n ? edge : i > 1 ? mid : '#ffffff'; px1(c, x, y, i, 0, col); px1(c, x, y, -i, 0, col); px1(c, x, y, 0, i, col); px1(c, x, y, 0, -i, col); } }
function zigTo(c, x1, y1, x2, y2, seed) { let px = x1, py = y1; for (let i = 1; i <= 3; i++) { const k = i / 3, x = x1 + (x2 - x1) * k + (i < 3 ? (H(i, seed) - 0.5) * 8 : 0), y = y1 + (y2 - y1) * k + (i < 3 ? (H(seed, i) - 0.5) * 8 : 0); line(c, px, py, x, y, WPP, i === 3 ? '#ffffff' : '#8ab8ff', WPP); px = x; py = y; } }
export function staffMuzzle(R, ctx, x, y, theme, charge, flash, t) { const f = MUZ[theme] || MUZ.default, s = Math.max(charge, flash, 0.25); if (charge < 0.05 && flash <= 0 && ((t * 2.5) | 0) % 4) return; f(ctx, x, y, s, t, R._skSim ? R._skSim.p.aim : 0); }
export const heroSingleOwns = th => !!th && heroOwns(th.id);
export const persist = (sim, kind, c, obj, t, pr) => { const fx = sim.p && sim.p.skinFx; return !!fx && covers(fx, 'single') && persistDraw(fx.theme, kind, c, obj, t, pr); };
export const skinVFXHooks = { owns: heroSingleOwns, persist, muzzle: staffMuzzle,
  event: skinEvent, shot: shotHook, walk: walkHook, dash: ghostHook, charge: chargeHook, screen: screenHook, draw: drawHooks, elPal, ultPal: ultPalOf };
