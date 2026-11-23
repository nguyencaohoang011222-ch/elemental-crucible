// Rãnh "Comet Trench" (tuyệt kỹ Đất của Pháp sư): khe nứt hữu cơ, thon nhọn ở hai đầu, mép răng cưa — không bao giờ là thanh chữ nhật.
// Sao chổi chạy dọc đường để xẻ rãnh mở dần. Mặc định = khe núi lửa (mép hắc diện thạch, lõi dung nham sủi);
// skin hạng cao thay bằng vực riêng: dung nham, băng, bào tử, sét, lửa rồng, hư không, cẩm thạch titan, khe thiên giới.
import { WPP, sn, H, sq, line, disc, tri, zig } from './pxdraw.js';

// mỗi kiểu: e = mép, c(u, v, t, i) = màu lòng rãnh (v: 0 tâm → 1 mép), deco = vật trang trí dọc rãnh, comet = màu đầu sao chổi
const ST = {
  default: { w: 34, e: '#1a1412', rim: '#3a2a20', c: (u, v, t, i) => v > 0.7 ? '#5a1a0a' : ((i + ((t * 8) | 0)) % 7 === 0 ? '#ffe9a0' : v > 0.4 ? '#c8300e' : '#ff7a1e'), comet: ['#ff5a1a', '#ffd36b', '#ffffff'],
    deco(c, P, t, R, k) { for (const [x, y, n, side] of P) if (n % 6 === 0) { tri(c, [x - 5, y], [x + 5, y], [x + side * 3, y - 9], '#2a201a'); if (((t * 6 + n) | 0) % 9 === 0 && R) R.parts.push({ x, y: y - 8, vx: 0, vy: -30, life: 0.8, max: 0.8, c: n % 12 ? '#7a6a62' : '#ffd36b', s: 4 }); } } },
  magma: { w: 46, e: '#140a06', rim: '#3a2a22', c: (u, v, t, i) => v > 0.65 ? '#5a1a0a' : (H(i, (t * 3) | 0) < 0.08 ? '#2a1a14' : v > 0.3 ? '#ff5a1a' : '#ffb04a'), comet: ['#ff6a1e', '#ffd36b', '#ffffff'],
    deco(c, P, t) { for (const [x, y, n] of P) if (n % 5 === 0) { disc(c, x + Math.sin(t * 2 + n) * 4, y, 5, '#2a1a14', 0.6); } for (const [x, y, n, side] of P) if (n % 7 === 0) tri(c, [x - 6, y], [x + 6, y], [x + side * 2, y - 14], '#3a2a22'); } },
  glacier: { w: 32, e: '#0a1e3a', rim: '#7fd0ff', c: (u, v, t, i) => v > 0.6 ? '#2f7ac8' : (i % 9 === 0 ? '#ffffff' : '#123a6a'), comet: ['#7fd0ff', '#c8f4ff', '#ffffff'],
    deco(c, P) { for (const [x, y, n, side] of P) if (n % 3 === 0) { const h = 10 + (n % 4) * 5; tri(c, [x - 4, y], [x + 4, y], [x + side * 3, y - h], '#c8f4ff'); sq(c, x + side * 3, y - h, WPP, '#ffffff'); } } },
  spore: { w: 38, e: '#141013', rim: '#3e4430', c: (u, v, t, i) => { const ph = (t * 1.8 + H(i, 3)) % 1; return v < 0.5 && ph < 0.12 ? '#e070e8' : v > 0.6 ? '#2c4a22' : i % 5 === 0 ? '#3ad0e0' : '#5a8a1e'; }, comet: ['#7ad03a', '#c8ff6a', '#f4ffd0'],
    deco(c, P, t) { for (const [x, y, n] of P) if (n % 6 === 0) { c.fillStyle = '#141013'; c.fillRect(sn(x - 3), sn(y - 8), 6, 8); disc(c, x, y - 9, 7, '#141013', 0.5); disc(c, x, y - 9, 5, '#a83ac8', 0.5); sq(c, x - 2, y - 10, WPP, '#e070e8'); } for (const [x, y, n] of P) if (n % 4 === 2 && (((t * 4 + n) | 0) % 3)) sq(c, x, y - 14 - ((t * 20 + n * 3) % 20), WPP, n % 8 ? '#3ad0e0' : '#c8ff6a'); } },
  tempest: { w: 18, e: '#0c0a2a', rim: '#5a3ad0', c: (u, v, t, i) => v > 0.5 ? '#2a1a5a' : '#d8f0ff', comet: ['#8ab8ff', '#d8f0ff', '#ffffff'],
    deco(c, P, t) { const sd = (t * 24) | 0; for (let j = 0; j + 8 < P.length; j += 8) { const [x1, y1] = P[j], [x2, y2] = P[j + 8]; zig(c, x1, y1 - 4, x2, y2 - 4, sd + j, '#8ab8ff', '#ffffff', 1, 4, 14); if (H(j, sd) < 0.3) zig(c, x1, y1, x1 + (H(sd, j) - 0.5) * 60, y1 - 30, sd + j * 3, '#c8a8ff', '#ffffff', 1, 3, 10); } } },
  wyrm: { w: 36, e: '#0e0404', rim: '#2a1410', c: (u, v, t, i) => v > 0.55 ? '#24080a' : (i % 4 === 0 ? '#ffe27a' : '#ff7a2a'), comet: ['#ff7a2a', '#ffe27a', '#ffffff'],
    deco(c, P, t) { for (const [x, y, n] of P) if (n % 3 === 0) { const h = 10 + H(n, (t * 12) | 0) * 22; line(c, x, y, x - 3, y - h, WPP * 2, '#ff7a2a', WPP); line(c, x, y - 2, x - 2, y - h * 0.6, WPP, '#ffe27a', WPP); } } },
  void: { w: 36, e: '#02020a', rim: '#4a2a8a', c: (u, v, t, i) => v > 0.75 ? '#2a1450' : (H(i, 9) < 0.06 && ((t * 6 + i) | 0) % 3 ? '#e0f8ff' : '#06030f'), comet: ['#4a2a8a', '#9a6aff', '#e0f8ff'],
    deco(c, P, t) { for (const [x, y, n] of P) if (n % 7 === 0) { const fy = y - 22 - Math.sin(t * 2 + n) * 8, a = t + n; tri(c, [x + Math.cos(a) * 7, fy + Math.sin(a) * 7], [x + Math.cos(a + 2.2) * 5, fy + Math.sin(a + 2.2) * 5], [x + Math.cos(a - 2.2) * 5, fy + Math.sin(a - 2.2) * 5], '#2a2050'); sq(c, x + Math.cos(a) * 7, fy + Math.sin(a) * 7, WPP, '#7fe0ff'); } } },
  storm: { w: 34, e: '#5a4a30', rim: '#e8e4d8', c: (u, v, t, i) => v > 0.62 ? (i % 6 === 0 ? '#c8983a' : '#d8d4c8') : (v > 0.3 ? '#c8983a' : '#ffe27a'), comet: ['#c8983a', '#ffe27a', '#ffffff'],
    deco(c, P) { for (const [x, y, n, side] of P) if (n % 5 === 0) { const ca = side, pts = [[-4, -2], [-4, 2], [4, -2], [4, 2], [-5, 0], [5, 0]]; for (const [u, v] of pts) sq(c, x + u * ca, y + v - 4, WPP, n % 10 ? '#c8d4e8' : '#6a7480'); } } },
  celestial: { w: 40, e: '#2a0e5a', rim: '#ffb81a', c: (u, v, t, i) => v > 0.7 ? '#9a4aff' : (i % 11 === 0 ? '#ffffff' : v > 0.35 ? '#ffb81a' : '#fff2a0'), comet: ['#ffb81a', '#fff2a0', '#ffffff'],
    deco(c, P, t, R, k, f) { for (const [x, y, n] of P) if (n % 6 === 0) { sq(c, x, y - 3, WPP * 2, '#ffffff'); sq(c, x + WPP * 2, y - 3, WPP, '#9a4aff'); } for (const [x, y, n] of P) if (n % 9 === 4) { const fy = y - 28 - Math.sin(t * 3 + n) * 6; tri(c, [x, fy - 8], [x - 3, fy], [x + 3, fy], '#fff2a0'); tri(c, [x, fy + 8], [x - 3, fy], [x + 3, fy], '#ffb81a'); }
      if (k < 0.5) { const s = k / 0.5, bx = f.x + (f.x2 - f.x) * s, by = f.y + (f.y2 - f.y) * s; line(c, bx - 60, by - 300, bx, by, WPP * 3, '#ffb81a', WPP); line(c, bx - 60, by - 300, bx, by, WPP, '#ffffff', WPP); } } }   // tia phán xét của Seraphim lướt dọc rãnh
};
export const trenchStyles = Object.keys(ST);
export function drawTrench(c, f, k, t, theme, R) {
  const S = ST[theme] || ST.default, L = Math.hypot(f.x2 - f.x, f.y2 - f.y), ca = (f.x2 - f.x) / L, sa = (f.y2 - f.y) / L, nx = -sa, ny = ca, open = Math.min(1, k * 3.2), n = Math.floor(L / WPP);
  const fade = Math.min(1, (1 - k) * 2.5), P = [], seed = (f.x | 0) % 97; c.globalAlpha = fade;
  for (let i = 0; i <= n * open; i++) {
    const u = i / n, taper = Math.pow(Math.sin(u * Math.PI), 0.7), wl = S.w * taper * (0.7 + 0.5 * H(i >> 2, seed)), wr = S.w * taper * (0.7 + 0.5 * H(seed, i >> 2)), x = f.x + ca * u * L, y = f.y + sa * u * L;
    for (let v = -wl; v <= wr; v += WPP) { const vv = v < 0 ? -v / Math.max(1, wl) : v / Math.max(1, wr), px = x + nx * v, py = y + ny * v * 0.75; sq(c, px, py, WPP, vv > 0.86 ? S.e : vv > 0.74 ? S.rim : S.c(u, vv, t, i + ((v / WPP) | 0) * 13)); }
    if (i % 2 === 0) { P.push([x + nx * -wl, y + ny * -wl * 0.75, i, -1]); P.push([x + nx * wr, y + ny * wr * 0.75, i + 1, 1]); }
  }
  if (S.deco) S.deco(c, P, t, R, k, f);
  if (open < 1) { const hx = f.x + ca * L * open, hy = f.y + sa * L * open, C = S.comet; for (let j = 1; j < 9; j++) disc(c, hx - ca * j * 9 + j * 3, hy - sa * j * 9 - j * 5, Math.max(WPP, 16 - j * 1.6), j & 1 ? C[0] : C[1], 1); disc(c, hx, hy, 18, '#1a1412', 1); disc(c, hx, hy, 14, C[1], 1); disc(c, hx, hy, 7, C[2], 1);   // sao chổi xẻ rãnh
    if (R) for (let j = 0; j < 3; j++) { const a = Math.random() * 6.283; R.parts.push({ x: hx, y: hy, vx: Math.cos(a) * 160 - ca * 60, vy: -120 - Math.random() * 120, g: 600, life: 0.7, max: 0.7, c: j ? '#3a2a20' : C[1], s: j ? 6 : 4 }); } }
  c.globalAlpha = 1;
}
