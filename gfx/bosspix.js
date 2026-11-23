// Boss pixel nét đậm: cùng cỡ texel với nhân vật (WPP), viền tối #141013, tô cel 4 bậc (không dither, không gradient).
// Mỗi boss có bộ khung theo trạng thái: idle(4) · walk(4) · wind(3) · slam(4) · cleave(4) · cast(4) · dash(4) · stagger(2) · rise(2).
import { Grid } from './pixel.js';

export const OUT = '#141013';

// ---------- SDF + tô cel ----------
export const cap = (ax, ay, bx, by, r0, r1 = r0) => (x, y) => { const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay, L = bax * bax + bay * bay || 1, h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / L)); return Math.hypot(pax - bax * h, pay - bay * h) - (r0 + (r1 - r0) * h); };
export const ell = (cx, cy, rx, ry) => (x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry, k = Math.hypot(dx, dy); return (k - 1) * Math.min(rx, ry); };
export const poly = pts => (x, y) => {
  let d = 1e9, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j], ex = xj - xi, ey = yj - yi, wx = x - xi, wy = y - yi, h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? -d : d;
};
// xoay/đặt một hình cục bộ (u dọc trục, v ngang trục) theo gốc và hướng
export const place = (pts, ox, oy, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([u, v]) => [ox + u * s + v * c, oy - u * c + v * s]); };

// tô một bộ phận: viền tối quanh mép (tạo nét tách khối), bên trong chia 4 bậc sáng theo pháp tuyến (đèn trên-trái)
// lưới có độ dời (để chừa lề cho vũ khí/nấm mà không lệch tâm boss)
export function mk(W, H, ox = 0, oy = 0) { const g = new Grid(W, H); return { w: W, h: H, ox, oy, set: (x, y, c) => g.set(x + ox, y + oy, c), get: (x, y) => g.get(Math.round(x) + ox, Math.round(y) + oy), rect: (x, y, w, h, c) => g.rect(x + ox, y + oy, w, h, c), ell: (cx, cy, rx, ry, c) => g.ell(cx + ox, cy + oy, rx, ry, c), line: (a, b, c2, d, col, th) => g.line(a + ox, b + oy, c2 + ox, d + oy, col, th), canvas: o => g.canvas(o) }; }
export function part(g, f, pal, o = {}) {
  const ox = g.ox || 0, oy = g.oy || 0;
  for (let y = -oy; y < g.h - oy; y++) for (let x = -ox; x < g.w - ox; x++) {
    const X = x + 0.5, Y = y + 0.5, d = f(X, Y);
    if (d >= 1) continue;
    if (d >= 0) { if (o.line !== false) g.set(x, y, OUT); continue; }
    const nx = f(X + 1, Y) - f(X - 1, Y), ny = f(X, Y + 1) - f(X, Y - 1), gl = Math.hypot(nx, ny) || 1, depth = Math.min(1, -d / 4);
    let lum = 0.5 + (-(nx / gl) * 0.42 - (ny / gl) * 0.5) * (1 - depth * 0.55) + depth * 0.12 + (o.lift || 0);
    const n = pal.length; let i = lum > 0.8 ? n - 1 : lum > 0.56 ? n - 2 : lum > 0.3 ? Math.max(0, n - 3) : 0;
    if (d > -1 && nx / gl + ny / gl > 0.6) i = 0;                       // mép phía bóng tối
    let c = pal[Math.max(0, Math.min(n - 1, i))];
    if (o.tex) c = o.tex(x, y, c, i, nx / gl, ny / gl, d) || c;
    g.set(x, y, c);
  }
}
export const glowLine = (g, x0, y0, x1, y1, c) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1; for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n), v = g.get(x, y); if (v && v !== OUT) g.set(x, y, c); } };
export const dot = (g, x, y, c, w = 1, h = 1) => g.rect(Math.round(x), Math.round(y), w, h, c);
export const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------- bảng màu (tối đa 4 bậc mỗi chất liệu) ----------
export const PAL = {
  rock: ['#2a1d1a', '#47322b', '#6b4d3e', '#8e6d55'], rockD: ['#1c1412', '#2f221d', '#45302a', '#5a4234'],
  fire: ['#b8361a', '#ff7a2a', '#ffc04a', '#fff3b0'], moss: ['#2c4a22', '#3f6a2c', '#5e8f3a', '#86b450'],
  ice: ['#3a6a9a', '#69a8d8', '#a8dcf4', '#effaff'], plate: ['#1f2a3a', '#344866', '#55739a', '#8aa8c8'], plateD: ['#141c28', '#22304a', '#344866', '#4a6688'],
  cloak: ['#141c34', '#22305a', '#33467a', '#4a609a'], bone: ['#8a7a62', '#c8b896', '#ece0c0', '#fffaf0'],
  shell: ['#2a2a24', '#45443a', '#66644f', '#8a876a'], shellD: ['#1a1a16', '#2c2c25', '#403f34', '#56543f'], hide: ['#3a2a22', '#5a4232', '#7c5c44', '#9c7a5a'],
  capP: ['#4a1a6a', '#7a2ab0', '#b45ae8', '#e6b4ff'], capC: ['#0e4a5a', '#1a8aa0', '#3ad0e0', '#b4f6ff'], stem: ['#6a6a5a', '#a8a890', '#d0d0b8', '#efefdc'],
  robe: ['#1a1030', '#2e1c52', '#46307a', '#6a4aa8'], robeD: ['#120a22', '#1e1238', '#2e1c52', '#422c70'], void: ['#05040a', '#0c0a18', '#141028', '#1e1838'],
  shaft: ['#2a2a3a', '#5a6a80', '#9ab0c8', '#d8e8f8'], snout: ['#5a3030', '#8a4a44', '#b06a5a', '#d08a78'],
  gold: ['#7a5a1a', '#b8902a', '#e6c04a', '#fff0a0'], storm: ['#2a6ab8', '#5aa8ff', '#a8e0ff', '#ffffff'],
  scale: ['#3a0e0e', '#6a1a14', '#9a2e1c', '#c8502a'], scaleD: ['#24080a', '#40100e', '#621a14', '#82281a'], wing: ['#2a0a10', '#4a1418', '#6e2420', '#94382a'], horn: ['#4a4038', '#7a6a58', '#ab9a80', '#ddd0b8']
};
const hot = (P, a, b) => P.rage ? b : a;

// ---------- 1. Ashen Colossus: golem đá vỏ chai, nứt dung nham, lò lửa trong ngực ----------
function colossus(P) {
  const W = 58, H = 58, g = mk(W, H), st = P.st || 'idle', f = P.f | 0;
  let by = 0, cr = 0, ln = 0, hd = 0, lp = 0, liftB = 0, liftF = 0, core = f % 2, tuck = 0;
  let eB = [10, 36], fB = [9, 46], eF = [48, 36], fF = [49, 46];
  if (st === 'idle') { by = [0, 0, 1, 1][f]; }
  else if (st === 'walk' || st === 'dash') {
    lp = [1, 0, -1, 0][f]; liftB = f === 1 ? 3 : 0; liftF = f === 3 ? 3 : 0; by = [1, 0, 1, 0][f];
    fB = [9 + lp * 3, 46]; fF = [49 - lp * 3, 46];
    if (st === 'dash') { ln = 3; cr = 2; eB = [6, 34]; fB = [3, 40]; eF = [44, 38]; fF = [42, 46]; }
  } else if (st === 'wind' || st === 'rise') {
    const k = st === 'rise' ? 2 : f;
    if (k === 0) { eB = [6, 30]; fB = [4, 22]; eF = [50, 30]; fF = [46, 20]; by = -1; }
    else { eB = [14, 12]; fB = [22, 4]; eF = [42, 12]; fF = [34, 4]; by = k === 2 ? -2 : -1; hd = -1; }
    if (st === 'rise') { tuck = 4; liftB = liftF = 3; }
  } else if (st === 'slam' || st === 'cleave') {
    if (f === 0) { eB = [30, 18]; fB = [40, 26]; eF = [50, 22]; fF = [48, 30]; cr = 1; }
    else if (f < 3) { eB = [34, 40]; fB = [44, 51]; eF = [52, 40]; fF = [52, 50]; cr = 4; ln = 3; hd = 2; }
    else { eB = [30, 38]; fB = [40, 48]; eF = [50, 38]; fF = [50, 47]; cr = 2; ln = 1; }
  } else if (st === 'cast') { eB = [6, 32]; fB = [3, 25]; eF = [52, 32]; fF = [55, 25]; by = -1; core = 2 + (f % 2); }
  else if (st === 'stagger') { cr = 3; hd = 3; fB = [12, 50]; fF = [46, 50]; eB = [12, 40]; eF = [46, 40]; }
  const lava = hot(P, ['#e0501e', '#ffb04a'], ['#ff8a3c', '#ffe27a']), lc = (f % 2 ? lava[1] : lava[0]);
  const sh = (x, y) => [x + ln, y + cr + by], [sBx, sBy] = sh(14, 22), [sFx, sFy] = sh(42, 22);
  const hipY = 41 + Math.round(cr * 0.6), fy = 54 - tuck;
  const fX = (v) => v[0] + ln * 0.6, fYc = (v) => v[1] + Math.round(cr * 0.5);
  // tay sau
  part(g, cap(sBx, sBy, eB[0] + ln, fYc(eB), 5, 4.5), PAL.rockD); part(g, cap(eB[0] + ln, fYc(eB), fX(fB), fYc(fB), 4.5, 4), PAL.rockD);
  part(g, ell(fX(fB), fYc(fB), 7, 6), PAL.rockD);
  // chân
  part(g, cap(22 + ln * 0.4, hipY, 20 - lp * 3, fy - liftB - 2, 5.5, 5), PAL.rockD); part(g, ell(20 - lp * 3, fy - liftB, 7, 3.5), PAL.rockD);
  part(g, cap(34 + ln * 0.4, hipY, 36 + lp * 3, fy - liftF - 2, 5.5, 5), PAL.rock); part(g, ell(36 + lp * 3, fy - liftF, 7, 3.5), PAL.rock);
  // hông, thân
  part(g, ell(28 + ln * 0.5, hipY - 1, 12, 6), PAL.rock);
  const tx = 28 + ln, ty = 31 + cr + by;
  part(g, ell(tx, ty, 15, 13), PAL.rock, { tex: (x, y, c, i) => (x * 7 + y * 3) % 23 === 0 && i > 0 ? PAL.rock[i - 1] : c });
  part(g, ell(sBx, sBy, 8, 7), PAL.rock, { tex: (x, y, c, i, nx, ny) => ny < -0.55 ? PAL.moss[Math.min(3, i)] : c });
  const hx = 30 + ln * 1.4, hy = 15 + cr + by + hd;
  part(g, ell(hx, hy, 6.5, 5.5), PAL.rock); part(g, poly([[hx - 6, hy - 2], [hx + 7, hy - 3], [hx + 6, hy], [hx - 6, hy + 1]]), PAL.rockD); // mày đá
  part(g, ell(sFx, sFy, 8.5, 7.5), PAL.rock, { tex: (x, y, c, i, nx, ny) => ny < -0.55 ? PAL.moss[Math.min(3, i)] : c });
  // tay trước + nắm đấm khổng lồ
  part(g, cap(sFx, sFy, eF[0] + ln, fYc(eF), 5.5, 5), PAL.rock); part(g, cap(eF[0] + ln, fYc(eF), fX(fF), fYc(fF), 5, 4.5), PAL.rock);
  part(g, ell(fX(fF), fYc(fF), 7.5, 6.5), PAL.rock);
  for (let k = -1; k <= 1; k++) dot(g, fX(fF) + 3, fYc(fF) - 2 + k * 2, PAL.rockD[0]); // khớp ngón
  // vết nứt dung nham
  for (const [a, b2, c, d] of [[-10, -6, -4, -2], [-4, -2, -6, 6], [6, -8, 10, -1], [10, -1, 8, 7], [-2, 8, 4, 11]]) glowLine(g, tx + a, ty + b2, tx + c, ty + d, lc);
  glowLine(g, sFx - 4, sFy + 2, sFx + 3, sFy + 5, lc); glowLine(g, fX(fF) - 4, fYc(fF) + 1, fX(fF) + 1, fYc(fF) + 3, lc);
  // lò lửa trong ngực
  const cr0 = 3 + (core >= 2 ? 1 : 0) + (core === 3 ? 1 : 0);
  g.ell(tx + 3, ty - 1, cr0 + 1, cr0 + 1, OUT); g.ell(tx + 3, ty - 1, cr0, cr0, (dx, dy) => { const r = dx * dx + dy * dy; return r < 0.2 ? '#ffffff' : r < 0.5 ? PAL.fire[3] : r < 0.8 ? PAL.fire[2] : PAL.fire[1]; });
  const eye = P.dim ? '#6a2a10' : P.rage ? '#ffffff' : '#ffd36b'; dot(g, hx + 1, hy, eye, 2, 1); dot(g, hx + 5, hy, eye, 1, 1);
  return g.canvas(OUT);
}

// ---------- 2. Frost Warden: hiệp sĩ xác băng gầy, kích băng răng cưa, vương miện băng, áo choàng rách bay ----------
function warden(P) {
  const W = 72, H = 64, g = mk(W, H, 5), st = P.st || 'idle', f = P.f | 0;
  let by = 0, ln = 0, cb = 0, a = 0.08, hand = [34, 38], free = [14, 42], orb = 0;
  if (st === 'idle') { by = [0, 0, -1, -1][f]; cb = [0, 1, 2, 1][f]; hand = [38, 38]; a = 0.05; }
  else if (st === 'walk') { ln = 2; by = [0, -1, 0, -1][f]; cb = [2, 3, 4, 3][f]; a = 0.5; hand = [35, 38]; free = [12, 38]; }
  else if (st === 'wind' || st === 'rise') { const k = st === 'rise' ? 2 : f; a = [-0.4, -1.2, -1.5][k]; hand = [[32, 30], [28, 22], [27, 20]][k]; by = k === 2 ? -1 : 0; ln = k ? -1 : 0; cb = 1 + k; free = [16, 34]; }
  else if (st === 'slam' || st === 'cleave') { a = [0.6, 1.75, 1.75, 1.35][f]; hand = [[36, 28], [40, 40], [40, 40], [38, 40]][f]; ln = f ? 2 : 0; by = f === 1 || f === 2 ? 2 : 0; cb = f ? 4 : 2; free = [12, 36]; }
  else if (st === 'cast') { a = 0.05; hand = [34, 40]; free = [9, 22 + (f % 2)]; orb = 3 + (f % 2); cb = 1 + (f % 2); }
  else if (st === 'dash') { ln = 4; cb = 5; a = 1.45; hand = [38, 36]; free = [10, 34]; by = f % 2; }
  else if (st === 'stagger') { by = 3; ln = -1; a = 0.4; free = [14, 48]; }
  const B = (x, y) => [x + ln, y + by];
  // áo choàng rách phía sau
  const [s1x, s1y] = B(17, 20), [s2x, s2y] = B(30, 20);
  part(g, poly([[s1x, s1y], [s2x, s2y], [28 + ln * 0.5, 40], [26 - cb, 60], [22 - cb * 1.5, 56], [18 - cb * 2, 62], [13 - cb * 2.5, 55], [9 - cb * 3, 59], [11 - cb * 2, 40]]), PAL.cloak);
  // tay sau
  part(g, cap(...B(18, 24), free[0] + ln, free[1] + by, 2.5, 2.2), PAL.plateD);
  // chân giáp, váy giáp
  part(g, cap(...B(20, 44), 19, 60, 3, 2.6), PAL.plateD); part(g, ell(19, 61, 3.5, 1.8), PAL.plateD);
  part(g, cap(...B(28, 44), 29, 60, 3, 2.6), PAL.plate); part(g, ell(30, 61, 3.5, 1.8), PAL.plate);
  part(g, poly([B(14, 37), B(34, 37), B(36, 50), B(12, 50)]), PAL.plate, { tex: (x, y, c) => (x - ln) % 5 === 0 ? PAL.plate[0] : c });
  // ngực gầy + đai
  part(g, poly([B(15, 21), B(33, 21), B(31, 38), B(17, 38)]), PAL.plate);
  part(g, poly([B(18, 26), B(30, 26), B(28, 35), B(20, 35)]), PAL.ice);
  // vai giáp gai sau
  part(g, poly([B(11, 19), B(19, 17), B(21, 25), B(12, 26), B(8, 22)]), PAL.plateD);
  // đầu sọ + vương miện băng
  const [hx, hy] = B(25 + ln * 0.3, 13);
  part(g, ell(hx, hy, 5, 6), PAL.bone); part(g, poly([[hx - 3, hy + 1], [hx + 4, hy + 1], [hx + 3, hy + 6], [hx - 2, hy + 6]]), PAL.plate);
  part(g, poly([[hx - 6, hy - 3], [hx - 5, hy - 10], [hx - 3, hy - 5], [hx - 1, hy - 13], [hx + 1, hy - 5], [hx + 3, hy - 11], [hx + 4, hy - 5], [hx + 6, hy - 9], [hx + 6, hy - 3]]), PAL.ice);
  const eye = P.dim ? '#2a4a5a' : P.rage ? '#ffffff' : '#6ef0ff'; dot(g, hx + 1, hy, eye, 2, 1); dot(g, hx - 2, hy, eye);
  // cán kích
  const dir = [Math.sin(a), -Math.cos(a)], top = [hand[0] + ln + dir[0] * 23, hand[1] + by + dir[1] * 23], bot = [hand[0] + ln - dir[0] * 12, hand[1] + by - dir[1] * 12];
  part(g, cap(bot[0], bot[1], top[0], top[1], 1.6), PAL.shaft);
  // tay trước giữ kích
  part(g, cap(...B(31, 24), hand[0] + ln, hand[1] + by, 2.8, 2.4), PAL.plate); part(g, ell(hand[0] + ln, hand[1] + by, 2.5, 2.5), PAL.plate);
  part(g, poly([B(29, 17), B(37, 19), B(40, 23), B(36, 27), B(28, 25)]), PAL.plate);
  // lưỡi kích băng răng cưa
  part(g, poly(place([[-12, 0], [-13, 4], [-11, 9], [-8, 7], [-6, 11], [-3, 7], [0, 1]], top[0], top[1], a)), PAL.ice);
  part(g, poly(place([[0, -2], [7, 0], [0, 2]], top[0], top[1], a)), PAL.ice);
  part(g, poly(place([[-9, 0], [-7, -5], [-5, 0]], top[0], top[1], a)), PAL.ice);
  if (orb) { const ox = free[0] + ln, oy = free[1] + by - 4; g.ell(ox, oy, orb + 1, orb + 1, OUT); g.ell(ox, oy, orb, orb, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : PAL.ice[2]); }
  return g.canvas(OUT);
}

// ---------- 3. Sporeback Behemoth: thú đá rêu lưng rùa, nanh lớn, nấm phát quang tím/lam ----------
function behemoth(P) {
  const W = 82, H = 62, g = mk(W, H, 0, 4), st = P.st || 'idle', f = P.f | 0;
  let by = 0, rear = 0, hd = 0, hx0 = 0, lp = 0, swell = 0, glow = f % 2, splay = 0;
  if (st === 'idle') by = [0, 0, 1, 1][f];
  else if (st === 'walk' || st === 'dash') { lp = [1, 0, -1, 0][f]; by = [1, 0, 1, 0][f]; hd = [0, 1, 0, 1][f]; if (st === 'dash') { hd += 3; hx0 = 3; } }
  else if (st === 'wind' || st === 'rise') { rear = [3, 7, 9][st === 'rise' ? 2 : f]; hd = -2; }
  else if (st === 'slam' || st === 'cleave') { rear = [4, -2, -2, 0][f]; by = [0, 2, 2, 1][f]; hd = [-2, 3, 3, 1][f]; hx0 = f === 1 || f === 2 ? 3 : 0; }
  else if (st === 'cast') { swell = 2 + (f % 2); glow = 1; }
  else if (st === 'stagger') { by = 3; hd = 4; splay = 2; }
  if (st === 'spin') { // thu vào mai, xoay: chỉ còn mai tròn, vệt rêu chạy quanh
    const cy = 34, ph = f * 0.8;
    part(g, ell(40, cy, 24, 19), PAL.shell, { tex: (x2, y2, c, i) => { const a = Math.atan2(y2 - cy, x2 - 40) + ph; return Math.sin(a * 3) > 0.35 ? PAL.moss[Math.min(3, i)] : c; } });
    for (let k = 0; k < 4; k++) { const a = ph + k * 1.57; glowLine(g, 40 + Math.cos(a) * 6, cy + Math.sin(a) * 5, 40 + Math.cos(a) * 20, cy + Math.sin(a) * 15, PAL.shell[0]); }
    dot(g, 39, cy - 1, P.rage ? '#ffffff' : '#c8ff6a', 2, 1);
    return g.canvas(OUT);
  }
  const fy = 55, front = (y) => y - rear;          // phần trước nhấc lên khi chồm
  const leg = (x, top, footX, lift, pal) => { part(g, cap(x, top, footX, fy - lift - 2, 4.5, 4), pal); part(g, ell(footX, fy - lift, 5.5, 2.6), pal); };
  // chân phía xa
  leg(24, 38 + by, 24 - lp * 3 - splay, lp < 0 ? 2 : 0, PAL.shellD);
  leg(54, front(38 + by), 54 + lp * 3 + splay, Math.max(0, rear) + (lp > 0 ? 2 : 0), PAL.shellD);
  // thân mai + bụng
  const cy = 30 + by - rear * 0.35;
  part(g, ell(38, cy + 8, 22, 8), PAL.hide);
  part(g, ell(36, cy, 25, 15), PAL.shell, { tex: (x, y, c, i, nx, ny) => ny < -0.45 ? PAL.moss[i] : ((x + y * 2) % 11 === 0 ? PAL.shell[0] : c) });
  for (const [a, b2, c, d] of [[22, cy - 2, 30, cy + 6], [40, cy - 6, 46, cy + 4], [30, cy + 7, 50, cy + 8]]) glowLine(g, a, b2, c, d, PAL.shell[0]);
  // đầu lợn rừng
  const hx = 66 + hx0, hy = front(36 + hd);
  part(g, poly([[hx - 9, hy - 9], [hx - 4, hy - 13], [hx - 2, hy - 7]]), PAL.hide); // tai
  part(g, ell(hx, hy, 10, 8), PAL.hide);
  part(g, ell(hx + 9, hy + 4, 5, 4), PAL.snout); dot(g, hx + 12, hy + 3, OUT); dot(g, hx + 12, hy + 5, OUT);
  // nanh
  part(g, cap(hx + 6, hy + 7, hx + 13, hy + 1, 1.6, 1), PAL.bone); part(g, cap(hx + 2, hy + 7, hx + 7, hy + 2, 1.3, 0.8), PAL.bone);
  const eye = P.dim ? '#4a3a2a' : P.rage ? '#ffffff' : '#c8ff6a'; dot(g, hx + 2, hy - 2, eye, 2, 1);
  // chân phía gần
  leg(16, 40 + by, 16 + lp * 3 - splay, lp > 0 ? 2 : 0, PAL.shell);
  leg(46, front(40 + by), 46 - lp * 3 + splay, Math.max(0, rear) + (lp < 0 ? 2 : 0), PAL.shell);
  // nấm phát quang trên lưng
  const shrooms = [[22, 17, 6, 6, 3.5, 'P'], [36, 12, 8, 8, 4.5, 'C'], [48, 17, 5, 5, 3, 'P'], [29, 18, 4, 4, 2.5, 'C'], [42, 18, 3, 3.5, 2.2, 'P']];
  for (const [sx, sy0, hgt, rx, ry, k] of shrooms.slice(0, P.sh ?? 5)) {
    const sy = sy0 + by - rear * (sx / 60) * 0.6, top = sy - hgt, pal = k === 'P' ? PAL.capP : PAL.capC, R = rx + swell * (rx > 5 ? 1 : 0.5);
    part(g, cap(sx, sy + 1, sx + 1, top + 1, 1.6, 1.3), PAL.stem);
    part(g, (x, y) => Math.max(ell(sx + 1, top, R, ry)(x, y), y - top - 1.2), pal);
    for (let s = -1; s <= 1; s++) { const px = Math.round(sx + 1 + s * R * 0.5), py = Math.round(top - ry * 0.5 + Math.abs(s)); g.set(px, py, glow ? pal[3] : pal[2]); }
  }
  if (st === 'cast') for (let i = 0; i < 10; i++) { const px = 14 + hsh(i, f) * 50, py = 2 + hsh(f, i) * 14; dot(g, px, py, i % 2 ? PAL.capP[3] : PAL.capC[3]); }
  return g.canvas(OUT);
}

// ---------- 4. Storm Sovereign: thực thể bay, áo choàng vũ trụ rách, cầu sét ở tay, vương miện nguyên tố lơ lửng ----------
function sovereign(P) {
  const W = 60, H = 66, g = mk(W, H, 1), st = P.st || 'idle', f = P.f | 0;
  let by = 0, ln = 0, tp = 0, L = [12, 40], Rh = [45, 40], orbR = 3.5 + (f % 2) * 0.5, cd = 0, bolt = false, ctilt = 0;
  if (st === 'idle') { by = [0, -1, -1, 0][f]; tp = f % 2; }
  else if (st === 'walk') { ln = 3; tp = 2 + (f % 2); L = [9, 36]; Rh = [41, 43]; }
  else if (st === 'wind' || st === 'rise') { const k = st === 'rise' ? 2 : f; L = [[11, 28], [7, 14], [6, 12]][k]; Rh = [[46, 28], [50, 14], [51, 12]][k]; orbR = [4, 5, 6][k]; cd = k ? -2 : 0; }
  else if (st === 'cast') { L = [46, 30]; Rh = [52, 36]; orbR = 4 + (f % 2); bolt = true; ln = 2; }
  else if (st === 'slam' || st === 'cleave') { L = [[16, 22], [14, 58], [14, 58], [16, 50]][f]; Rh = [[42, 22], [44, 58], [44, 58], [42, 50]][f]; by = f && f < 3 ? 3 : 0; orbR = f ? 4.5 : 3; }
  else if (st === 'dash') { ln = 5; tp = 4; L = [6, 34]; Rh = [38, 44]; }
  else if (st === 'stagger') { by = 3; ctilt = 2; L = [14, 50]; Rh = [44, 50]; orbR = 2; }
  const B = (x, y) => [x + ln, y + by];
  // áo choàng rách (tua bay về sau khi lướt)
  const hem = [];
  for (let i = 0; i <= 8; i++) { const x = 12 + i * 4 - tp * (1 + (8 - i) * 0.35), y = 56 + ((i + f) % 2 ? 6 : 0) + (i % 3 === 0 ? 3 : 0); hem.push([x, y]); }
  part(g, poly([B(19, 24), B(37, 24), [44 + ln * 0.5, 44 + by], ...hem.reverse(), [10 + ln * 0.2 - tp, 44 + by]]), PAL.robe, { tex: (x, y, c) => hsh(x, y) < 0.04 ? '#cfc2ff' : c });
  // tay áo sau
  part(g, cap(...B(20, 27), L[0] + ln, L[1] + by, 3.5, 2.5), PAL.robe, { lift: -0.12 });
  // ngực vũ trụ
  part(g, poly([B(20, 23), B(36, 23), B(34, 40), B(22, 40)]), PAL.void, { tex: (x, y, c) => hsh(x * 3, y) < 0.08 ? (hsh(y, x) < 0.5 ? '#ffffff' : '#a8e0ff') : c });
  // mũ trùm, mặt hư không
  const [hx, hy] = B(28, 16);
  part(g, ell(hx, hy, 7.5, 7.5), PAL.robe); part(g, ell(hx + 1.5, hy + 1.5, 4.2, 4.5), PAL.void, { line: false });
  const eye = P.dim ? '#3a3a6a' : P.rage ? '#ffffff' : '#a8f0ff'; dot(g, hx, hy + 1, eye, 2, 1); dot(g, hx + 3, hy + 1, eye, 2, 1);
  // vương miện nguyên tố lơ lửng
  const cx = hx, cy = hy - 12 + cd + ctilt;
  part(g, poly([[cx - 7, cy + 3 + ctilt], [cx - 7, cy - 2], [cx - 4, cy + 1], [cx - 2, cy - 5], [cx, cy], [cx + 2, cy - 5], [cx + 4, cy + 1], [cx + 7, cy - 2], [cx + 7, cy + 3 - ctilt]]), PAL.gold);
  ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff'].forEach((c, i) => dot(g, cx - 5 + i * 3, cy + 1, c));
  // tay áo trước
  part(g, cap(...B(36, 27), Rh[0] + ln, Rh[1] + by, 3.5, 2.5), PAL.robe, { lift: 0.08 });
  // cầu sét
  for (const [x, y] of [L, Rh]) {
    const ox = x + ln, oy = y + by, r = orbR;
    g.ell(ox, oy, r + 1, r + 1, OUT); g.ell(ox, oy, r, r, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : PAL.storm[2 - ((f + Math.round(dx * 2)) & 1)]);
    for (let k = 0; k < 4; k++) { const an = hsh(k, f + x) * 6.28, d0 = r + 1, d1 = r + 3 + hsh(f, k) * 2; glowLine(g, ox, oy, ox, oy, '#fff'); const x1 = ox + Math.cos(an) * d1, y1 = oy + Math.sin(an) * d1; g.line(ox + Math.cos(an) * d0, oy + Math.sin(an) * d0, x1, y1, k % 2 ? PAL.storm[3] : PAL.storm[1]); }
  }
  if (bolt) for (const [x, y] of [L, Rh]) { let px = x + ln, py = y + by; for (let s = 0; s < 4; s++) { const nx = Math.min(W - 1, px + 2 + hsh(s, f) * 2), ny = py + (hsh(f, s) - 0.5) * 6; g.line(px, py, nx, ny, '#ffffff'); px = nx; py = ny; } }
  return g.canvas(OUT);
}

// ---------- 5. Ignivar: rồng cánh gai, sọ sừng, họng than hồng (nhìn nghiêng 3/4) ----------
function dragon(P) {
  const W = 100, H = 64, g = mk(W, H), st = P.st || 'idle', f = P.f | 0;
  let by = 0, hx = 76, hy = 22, mouth = 0, throat = f % 2, wings = 'fold', lp = 0, tail = [4, 30], tuck = 0, rear = 0;
  if (st === 'idle') { by = [0, 0, 1, 1][f]; hy += [0, 0, 1, 1][f]; tail = [4, 30 + [0, 1, 2, 1][f]]; }
  else if (st === 'walk' || st === 'dash') { lp = [1, 0, -1, 0][f]; by = [1, 0, 1, 0][f]; hy += [1, 0, 1, 0][f]; tail = [4, 32 + [0, 2, 0, -2][f]]; if (st === 'dash') { hx = 82; hy = 32; wings = 'half'; } }
  else if (st === 'wind') { hx = [68, 62, 60][f]; hy = [16, 11, 10][f]; throat = 1 + f; wings = f ? 'half' : 'fold'; rear = f; }
  else if (st === 'cast') { hx = 82; hy = 30; mouth = 2; throat = 3; wings = 'half'; }
  else if (st === 'slam') { rear = [5, -1, -1, 0][f]; by = [0, 2, 2, 1][f]; hx = 78; hy = [14, 28, 28, 24][f]; mouth = f === 1 ? 1 : 0; wings = f ? 'fold' : 'half'; }
  else if (st === 'cleave') { tail = [[8, 10], [0, 40], [12, 60], [4, 44]][f]; by = f === 1 || f === 2 ? 1 : 0; hx = 74; hy = 24; }
  else if (st === 'rise') { wings = f % 2 ? 'up' : 'down'; tuck = 5; }
  else if (st === 'stagger') { hx = 76; hy = 44; mouth = 1; by = 2; throat = 0; }
  const fy = 61 - tuck, fr = (y) => y - rear;
  const leg = (x, top, footX, lift, pal) => { const kx = (x + footX) / 2 + 3, ky = (top + fy - lift) / 2; part(g, cap(x, top, kx, ky, 5, 4), pal); part(g, cap(kx, ky, footX, fy - lift - 1, 3.5, 3), pal); part(g, poly([[footX - 3, fy - lift - 2], [footX + 5, fy - lift - 1], [footX + 6, fy - lift + 1], [footX - 4, fy - lift + 1]]), PAL.horn); };
  const wingPoly = wings === 'fold' ? [[36, 28], [48, 18], [60, 22], [56, 30], [44, 33]]
    : wings === 'half' ? [[36, 28], [40, 8], [52, 14], [62, 6], [62, 26], [46, 33]]
    : wings === 'up' ? [[36, 28], [28, 2], [42, 8], [56, 0], [62, 24], [46, 33]] : [[36, 30], [20, 42], [34, 44], [48, 50], [60, 30], [46, 34]];
  // cánh xa
  part(g, poly(wingPoly.map(([x, y]) => [x - 6, fr(y + by) - 2])), PAL.wing, { lift: -0.15 });
  // chân xa
  leg(34, 42 + by, 32 - lp * 3, lp < 0 ? 2 : 0, PAL.scaleD); leg(56, fr(42 + by), 58 + lp * 3, Math.max(0, rear * 2) + (lp > 0 ? 2 : 0), PAL.scaleD);
  // đuôi (đường cong bậc 2) + mũi gai
  const p0 = [28, 40 + by], p1 = [12, 46 + by], p2 = tail;
  for (let i = 0; i < 10; i++) { const t0 = i / 10, t1 = (i + 1) / 10, q = t => [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]; const [ax, ay] = q(t0), [bx, by2] = q(t1); part(g, cap(ax, ay, bx, by2, 6 - t0 * 4.5, 6 - t1 * 4.5), PAL.scale, { line: i === 0 || i === 9 ? true : true }); }
  part(g, poly([[p2[0] + 2, p2[1] - 3], [p2[0] - 5, p2[1]], [p2[0] + 2, p2[1] + 3]]), PAL.horn);
  // thân + ngực
  part(g, ell(44, fr(38 + by) + rear * 0.5, 18, 11), PAL.scale, { tex: (x, y, c, i, nx, ny) => ny > 0.5 ? PAL.horn[Math.min(3, i + 1)] : c });
  part(g, ell(57, fr(38 + by), 9, 10), PAL.scale, { tex: (x, y, c, i, nx, ny) => ny > 0.35 ? PAL.horn[Math.min(3, i + 1)] : c });
  for (let k = 0; k < 6; k++) part(g, poly([[30 + k * 5, fr(28 + by) + (k > 3 ? -2 : 0)], [33 + k * 5, fr(22 + by) + (k > 3 ? -2 : 0)], [35 + k * 5, fr(28 + by) + (k > 3 ? -2 : 0)]]), PAL.horn);
  // cổ + họng than hồng
  const nb = [60, fr(32 + by)];
  part(g, cap(nb[0], nb[1], hx - 6, hy + 3, 6, 4), PAL.scale);
  const tc = hot(P, ['#c83a12', '#ff7a2a', '#ffc04a', '#fff3b0'], ['#ff5a1a', '#ffb04a', '#ffe27a', '#ffffff'])[Math.min(3, throat)];
  for (let i = 1; i < 8; i++) { const t = i / 8, x = nb[0] + (hx - 6 - nb[0]) * t + 1, y = nb[1] + (hy + 3 - nb[1]) * t + 4 - t * 1.5; glowLine(g, x, y, x, y + 1, i % 2 ? tc : PAL.fire[Math.max(0, Math.min(3, throat) - 1)]); }
  // đầu góc cạnh + sừng
  part(g, poly([[hx - 5, hy - 3], [hx - 14, hy - 10], [hx - 7, hy - 2]]), PAL.horn); part(g, poly([[hx - 2, hy - 4], [hx - 8, hy - 12], [hx - 1, hy - 6]]), PAL.horn);
  part(g, poly([[hx - 4, hy + 3 + mouth], [hx + 4, hy + 3 + mouth * 1.5], [hx + 12, hy + 3 + mouth * 2.5], [hx + 3, hy + 7 + mouth]]), PAL.scaleD);
  part(g, poly([[hx - 7, hy - 3], [hx + 3, hy - 5], [hx + 13, hy - 1], [hx + 14, hy + 2], [hx + 3, hy + 3], [hx - 6, hy + 4]]), PAL.scale);
  if (mouth) { for (let x = hx; x < hx + 12; x += 2) g.set(x, hy + 3 + mouth * 1.5 * ((x - hx) / 12) + 1, '#fff'); for (let i = 0; i < 4 * mouth; i++) dot(g, hx + 13 + hsh(i, f) * 6, hy + 1 + hsh(f, i) * (3 + mouth * 2), i % 2 ? PAL.fire[3] : PAL.fire[2]); }
  const eye = P.dim ? '#6a2a10' : P.rage ? '#ffffff' : '#ffe27a'; dot(g, hx + 2, hy - 2, eye, 2, 1);
  // chân gần
  leg(38, 44 + by, 38 + lp * 3, lp > 0 ? 2 : 0, PAL.scale); leg(60, fr(44 + by), 62 - lp * 3, Math.max(0, rear * 2) + (lp < 0 ? 2 : 0), PAL.scale);
  // cánh gần
  part(g, poly(wingPoly.map(([x, y]) => [x, fr(y + by)])), PAL.wing);
  for (let k = 1; k < wingPoly.length - 1; k++) g.line(wingPoly[0][0], fr(wingPoly[0][1] + by), wingPoly[k][0], fr(wingPoly[k][1] + by), PAL.horn[1]);
  return g.canvas(OUT);
}

export const BOSS_PIX = { COLOSSUS: [colossus, 58, 58], WARDEN: [warden, 72, 64], BEHEMOTH: [behemoth, 82, 62], SOVEREIGN: [sovereign, 60, 66], DRAGON: [dragon, 100, 64] };

// ---------- bộ điều khiển hoạt ảnh theo trạng thái ----------
// thời lượng mỗi khung (giây): ~10–12 FPS; slam/cleave giữ khung va chạm lâu hơn (hit-stop)
export const ANIM = {
  idle: { d: [0.13, 0.13, 0.13, 0.13], loop: true },
  beamWind: { d: [0.18, 0.18], loop: true }, beam: { d: [0.1, 0.1, 0.1], loop: true }, prisonWind: { d: [0.25, 0.35], loop: false }, prisonSlam: { d: [0.08, 0.14, 0.25], loop: false }, fanWind: { d: [0.2, 0.3], loop: false }, fanSwing: { d: [0.05, 0.07, 0.2], loop: false }, walk: { d: [0.1, 0.1, 0.1, 0.1], loop: true },
  wind: { d: [0.07, 0.1, 0.12], loop: false }, slam: { d: [0.05, 0.16, 0.1, 0.2], loop: false }, cleave: { d: [0.05, 0.14, 0.1, 0.2], loop: false },
  cast: { d: [0.09, 0.09, 0.09, 0.09], loop: true }, spin: { d: [0.06, 0.06, 0.06, 0.06], loop: true }, dash: { d: [0.08, 0.08, 0.08, 0.08], loop: true }, stagger: { d: [0.15, 0.15], loop: true }, rise: { d: [0.1, 0.1], loop: true }
};
export function animFrame(st, el) {
  const A = ANIM[st] || ANIM.idle, tot = A.d.reduce((a, b) => a + b, 0);
  let t = A.loop ? el % tot : Math.min(el, tot - 1e-4);
  for (let i = 0; i < A.d.length; i++) { if (t < A.d[i]) return i; t -= A.d[i]; }
  return A.d.length - 1;
}
// đọc trạng thái boss từ mô phỏng
export function bossAnimState(b, sim, moving) {
  if (b.stagger > 0) return 'stagger';
  if (b.leap || b.fly || b.soar) return 'rise';
  if (b.dashing) return b.dashing.spin ? 'spin' : 'dash';
  if (b.type === 'WARDEN') {                                                         // Frost Warden: khung riêng cho từng chiêu (tia đôi / ngục gai / sóng quạt)
    const own = sim.hazards.filter(h => h.owner === b), bm = own.find(h => h.kind === 'beam'), arc = own.find(h => h.kind === 'arc'), cir = own.find(h => h.kind === 'circle');
    if (bm) return bm.active ? 'beam' : 'beamWind';
    if (arc) return arc.done ? ((arc.fade || 0) > 0.05 ? 'fanSwing' : 'idle') : 'fanWind';
    if (cir) return cir.done ? ((cir.fade || 0) > 0.05 ? 'prisonSlam' : 'idle') : 'prisonWind';
    if (b.chanT > 0 || b.glow > 0) return 'cast';
  }
  if (b.chanT > 0 || sim.hazards.some(h => h.owner === b && h.kind === 'beam')) return 'cast';
  let wind = false, hit = null;
  for (const h of sim.hazards) { if (h.owner !== b) continue; if (h.done) { if ((h.fade || 0) > 0.12) hit = h; } else if (!h.active) wind = true; }
  if (hit) return hit.kind === 'arc' ? 'cleave' : 'slam';
  if (wind || (b.tele && b.tele.t < b.tele.T)) return 'wind';                        // đang báo đòn: tư thế lấy đà (ưu tiên hơn phát sáng)
  if (b.glow > 0) return 'cast';
  return moving ? 'walk' : 'idle';
}
// co giãn (squash & stretch) theo khung
export function squash(st, f) {
  if ((st === 'slam' || st === 'cleave') && f === 1) return [1.14, 0.87];
  if ((st === 'slam' || st === 'cleave') && f === 2) return [1.06, 0.95];
  if (st === 'wind' && f === 2) return [0.95, 1.06];
  if (st === 'walk' && (f === 0 || f === 2)) return [1.03, 0.97];
  return [1, 1];
}
export const HEAVY = { COLOSSUS: 1, BEHEMOTH: 1, DRAGON: 1 };
// thời lượng khung đi riêng: boss nặng bước chậm, nặng nề hơn
ANIM.walkHeavy = { d: [0.14, 0.12, 0.14, 0.12], loop: true };
