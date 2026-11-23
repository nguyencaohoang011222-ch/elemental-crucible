// Hình cho khu kín dựng sẵn của stage thường: vật cản/tường riêng từng map + lớp nền tĩnh (đường, vực, dung nham,
// cầu, thảm, bệ ngai, bậc thang, lối đá lát tới lò rèn). Cùng mật độ pixel với vật cản cũ (1 pixel = WPP đơn vị),
// viền tối dày, mảng màu to — không nhiễu 1 pixel.
import { WPP, Grid, canvas, hash2, dith, mix } from './pixel.js';

const OUT = '#141013';
const sh = (pal, v, x, y) => { const t = Math.max(0, Math.min(0.999, v)) * (pal.length - 1), b = Math.floor(t); return pal[Math.min(pal.length - 1, b + (dith(x, y, t - b) ? 1 : 0))]; };
const px = r => Math.max(4, Math.round(r / WPP));

// ---------- vật cản ----------
// tường cây cổ thụ: tán dày tối, gốc to — xếp liền thành bức tường rừng
function treewall(r, v) {
  const R = px(r * 1.45), W = 2 * R + 4, H = 2 * R + 6, g = new Grid(W, H), cx = W / 2 - 0.5, cy = R + 1;
  const L = ['#0e2418', '#16341f', '#20482a', '#2e6034', '#447a3e'];
  g.rect(cx - 2, cy + R * 0.4, 5, H - cy - R * 0.4, (i, j, x, y) => ['#24170e', '#3a2616', '#4e3420', '#3a2616', '#24170e'][i]);
  const blobs = [[cx, cy, R], [cx - R * 0.55, cy + R * 0.25, R * 0.7], [cx + R * 0.55, cy + R * 0.2, R * 0.7], [cx + (v - 0.5) * R * 0.4, cy - R * 0.4, R * 0.62]];
  for (const [bx, by, br] of blobs) g.ell(bx, by, br, br * 0.92, (dx, dy, x, y) => { const lum = 0.55 - dx * 0.25 - dy * 0.4 + ((x >> 2) + (y >> 2)) % 3 * 0.04; return sh(L, lum, x, y); });
  for (let k = 0; k < 6; k++) { const a = k * 1.05 + v * 3, x = cx + Math.cos(a) * R * 0.5, y = cy - R * 0.1 + Math.sin(a) * R * 0.4; g.rect(x, y, 2, 1, L[4]); } // lá sáng thành mảng
  return { img: g.canvas(OUT), ax: cx + 1, ay: H };
}
// trụ đá phế tích gãy, phủ rêu
function ruinpillar(r, v) {
  const w = px(r * 1.7), h = px(r * 3.2) + 4, W = w + 4, H = h + 3, g = new Grid(W, H), x0 = 2;
  const S = ['#4a4a44', '#6a6a60', '#8c8c7e', '#acac9a'], top = Math.round(2 + v * 4);
  g.rect(x0 - 1, H - 3, w + 2, 3, (i, j, x, y) => sh(S, 0.5 - i / (w + 2) * 0.4 + (j === 0 ? 0.25 : 0), x, y));          // chân đế
  g.rect(x0, top, w, H - 3 - top, (i, j, x, y) => { const col = i / w; if (j < 3 && hash2(i >> 1, 0, 9 + v * 7) * 4 > j + 1) return null; return i % 3 === 2 && j > 3 ? S[1] : sh(S, 0.8 - col * 0.6, x, y); }); // thân + rãnh
  for (let k = 0; k < 3; k++) { const mx = x0 + Math.round(hash2(k, 1, v * 9 + 3) * (w - 3)), my = top + 3 + k * Math.round(h / 3.5); g.rect(mx, my, 3, 2, '#4d7a3c'); g.set(mx + 1, my - 1, '#6a9a4a'); g.set(mx, my + 2, '#3a5e2e'); } // rêu
  g.line(x0 + w * 0.6, top + 4, x0 + w * 0.4, top + h * 0.5, '#3a3a34'); // vết nứt
  return { img: g.canvas(OUT), ax: W / 2, ay: H };
}
// thạch nhũ: chóp đá nhiều tầng, mặt cắt to
function stalag(r, v) {
  const w = px(r * 2.1) + 2, h = px(r * 3.6) + 2, g = new Grid(w + 2, h + 1), S = ['#1e1a2a', '#342c46', '#4e4466', '#6e6488'];
  const cones = [[w * 0.5 + 1, h, w * 0.42], [w * 0.25 + 1, h * 0.55, w * 0.22], [w * 0.78 + 1, h * 0.62, w * 0.22]];
  for (const [cx, ch, hw] of cones) for (let y = h - ch; y <= h; y++) { const t = (y - (h - ch)) / ch, half = Math.max(0.6, hw * Math.pow(t, 0.8)); for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) g.set(x, y, sh(S, (x < cx ? 0.75 : 0.35) + (Math.abs(x - cx) < half * 0.3 ? 0.15 : 0) - t * 0.2, x, y)); }
  for (let k = 0; k < 3; k++) g.rect(w * 0.5 + (k - 1) * 3, h * 0.45 + k * 4, 1, 2, '#9a8ac0');
  return { img: g.canvas(OUT), ax: (w + 2) / 2, ay: h + 1 };
}
// khối vách hang
function cavewall(r, v) {
  const R = px(r * 1.15), W = 2 * R + 2, H = Math.round(R * 2.3), g = new Grid(W, H), cx = W / 2 - 0.5, S = ['#141220', '#241f34', '#3a3250', '#56496e'];
  g.ell(cx, H * 0.55, R, H * 0.48, (dx, dy, x, y) => { const facet = hash2((x / 3) | 0, (y / 3) | 0, 5 + v * 9) * 0.25; return sh(S, 0.6 - dx * 0.3 - dy * 0.35 + facet, x, y); });
  for (let k = 0; k < 2; k++) g.rect(cx - 3 + k * 5, H * 0.3 + k * 3, 2, 1, '#7a6a9a');
  return { img: g.canvas(OUT), ax: cx + 1, ay: H };
}
// cụm nấm phát quang tím-lục lam
function glowshroom(r, v) {
  const W = px(r * 2.6) + 4, H = px(r * 2.4) + 4, g = new Grid(W, H);
  const caps = [[W * 0.5, H * 0.38, W * 0.3, ['#3a1a6a', '#6a3ab8', '#a874f0', '#e0c8ff']], [W * 0.22, H * 0.62, W * 0.18, ['#0e4a5a', '#1a8aa0', '#4adcf0', '#c8fcff']], [W * 0.8, H * 0.6, W * 0.17, ['#0e4a5a', '#1a8aa0', '#4adcf0', '#c8fcff']]];
  for (const [cx, cy, rw] of caps) { g.rect(cx - 1, cy, 3, H - cy, (i) => ['#c8c0b0', '#efe8d8', '#a89c88'][i]); g.ell(cx, cy, rw, rw * 0.6, (dx, dy, x, y) => dy > 0.35 ? null : sh(caps.find(c => c[0] === cx)[3], 0.75 - dx * 0.3 - dy * 0.35, x, y)); g.set(cx - rw * 0.4, cy - 1, '#ffffff'); }
  return { img: g.canvas(OUT), ax: W / 2, ay: H, glow: { dy: -H * 0.5, c: '#7ff0ff', r: 150 } };
}
// vách băng răng cưa: khối băng to, nhiều đỉnh, mũ tuyết
function glacier(r, v) {
  const w = px(r * 2.3) + 2, h = px(r * 3.0) + 2, g = new Grid(w + 2, h + 1), I = ['#2a5a80', '#4a8ab8', '#7ec0e8', '#c4ecff', '#ffffff'];
  const peaks = [[0.2, 0.55], [0.48, 1], [0.78, 0.7]].map(([fx, fh]) => [1 + fx * w, fh * h]);
  for (let x = 1; x <= w; x++) { let top = h; for (const [pxk, ph] of peaks) top = Math.min(top, h - ph + Math.abs(x - pxk) * 1.4); top = Math.max(0, Math.round(top)); for (let y = top; y <= h; y++) { const face = ((x * 7 + (v * 11 | 0)) % 9) < 4 ? 0.15 : 0, snow = y - top < 2 && top < h - 3; g.set(x, y, snow ? I[4] : sh(I, 0.75 - (x / w) * 0.45 + face - (y / h) * 0.2, x, y)); } }
  for (let k = 0; k < 2; k++) g.line(w * (0.3 + k * 0.35), h * 0.35, w * (0.36 + k * 0.3), h * 0.85, I[1]);
  return { img: g.canvas(OUT), ax: (w + 2) / 2, ay: h + 1, glow: { dy: -h * 0.5, c: '#9fe6ff', r: 80 } };
}
// cột basalt lục giác (mép miệng núi lửa)
function basaltwall(r, v) {
  const W = px(r * 2.2) + 2, H = px(r * 3.2), g = new Grid(W + 2, H + 1), B = ['#0c0a0e', '#1a161c', '#2a242c', '#3e3540'];
  const cols = 3; for (let k = 0; k < cols; k++) { const cw = Math.floor(W / cols), x0 = 1 + k * cw, ch = Math.round(H * (0.65 + hash2(k, 2, v * 13) * 0.35)), y0 = H - ch;
    g.rect(x0, y0 + 2, cw, ch - 2, (i, j, x, y) => sh(B, 0.65 - i / cw * 0.5, x, y)); g.rect(x0, y0, cw, 2, B[3]); if (hash2(k, 5, v * 3) < 0.6) g.rect(x0 + 1, y0 + ch * 0.5, 1, 3, '#ff6a1a'); }
  return { img: g.canvas(OUT), ax: (W + 2) / 2, ay: H + 1 };
}
// cột obsidian bóng tối, mép phản sáng tím
function obsidian(r, v) {
  const w = px(r * 1.8) + 2, h = px(r * 3.6) + 2, g = new Grid(w + 2, h + 1), O = ['#08060c', '#16101e', '#2a1e38', '#5a3a7a'], lean = (v - 0.5) * 3;
  for (let y = 0; y <= h; y++) { const t = y / h, tip = w / 2 + 1 + lean * (1 - t), hw = (w / 2) * Math.pow(t, 0.6) + 0.5; for (let x = Math.floor(tip - hw); x <= Math.ceil(tip + hw); x++) { const edge = Math.abs(x - tip) > hw - 1.2; g.set(x, y, edge && x < tip ? O[3] : sh(O, x < tip ? 0.55 : 0.2, x, y)); } }
  g.rect(w / 2, h * 0.7, 2, 2, '#ff6a1a');
  return { img: g.canvas(OUT), ax: (w + 2) / 2, ay: h + 1 };
}
// tường cẩm thạch quanh sân điện: thân ngà, chân đỏ, viền vàng
function palwall(r, v) {
  const W = px(r * 2.0) + 2, H = px(r * 1.5) + 2, g = new Grid(W, H), M = ['#8a8070', '#b4ac9a', '#dcd6c4', '#f6f2e6'];
  g.rect(0, H - 4, W, 4, (i, j, x, y) => j === 0 ? '#ffd34a' : ['#5a1010', '#8a1e1e', '#6a1414'][j - 1] || '#5a1010');
  g.rect(1, 3, W - 2, H - 7, (i, j, x, y) => (i % 6 === 0 ? M[1] : sh(M, 0.85 - i / W * 0.45, x, y)));
  g.rect(0, 0, W, 3, (i, j) => j === 0 ? M[3] : j === 1 ? '#ffd34a' : '#c8983a');
  return { img: g.canvas(OUT), ax: W / 2, ay: H };
}
// lan can cẩm thạch thấp (mép bệ ngai)
function balustrade(r, v) {
  const W = px(r * 2.3) + 2, H = px(r * 1.8) + 2, g = new Grid(W, H), M = ['#9a9080', '#c4bcaa', '#e8e2d2', '#ffffff'];
  g.rect(0, 0, W, 2, (i, j) => j ? '#c8983a' : '#ffd34a'); g.rect(0, H - 2, W, 2, M[1]);
  for (let x = 1; x < W - 1; x += 3) g.rect(x, 2, 2, H - 4, (i, j) => j === Math.floor((H - 4) / 2) ? M[0] : i ? M[1] : M[3]);
  return { img: g.canvas(OUT), ax: W / 2, ay: H };
}
// cột điện đỏ-vàng có rãnh dọc, đầu cột và chân cột vàng
function colpillar(r, v) {
  const w = px(r * 1.7) + 1, h = px(r * 4.2), W = w + 4, g = new Grid(W, h + 1), C = ['#4a0c0c', '#7a1818', '#a82828', '#d04a3a'], Gd = ['#7a5a10', '#c8983a', '#ffd34a', '#fff0a0'];
  g.rect(2, 4, w, h - 8, (i, j, x, y) => i % 3 === 1 ? C[0] : sh(C, 0.85 - i / w * 0.65, x, y));
  for (const [y0, hh] of [[0, 4], [h - 4, 5]]) g.rect(0, y0, W, hh, (i, j, x, y) => j === 1 ? Gd[3] : sh(Gd, 0.8 - i / W * 0.5, x, y));
  g.rect(2, h * 0.35, w, 1, Gd[2]);
  return { img: g.canvas(OUT), ax: W / 2, ay: h + 1 };
}
// ngai vàng: lưng cao, đệm đỏ, viên ngọc
function throne(r, v) {
  const W = 26, H = 34, g = new Grid(W, H), Gd = ['#7a5a10', '#c8983a', '#ffd34a', '#fff0a0'], cx = 12.5;
  g.rect(4, 4, 18, 22, (i, j, x, y) => sh(Gd, 0.85 - i / 18 * 0.5, x, y)); g.ell(cx, 4, 9, 4, (dx, dy, x, y) => sh(Gd, 0.9 - dy * 0.3, x, y));
  g.rect(7, 8, 12, 14, (i, j, x, y) => sh(['#5a0e18', '#8a1a28', '#b82e3a'], 0.8 - i / 12 * 0.5, x, y));
  g.rect(1, 20, 24, 6, (i, j, x, y) => j === 0 ? Gd[3] : sh(Gd, 0.7 - i / 24 * 0.4, x, y)); g.rect(5, 18, 16, 4, (i, j, x, y) => sh(['#8a1a28', '#b82e3a', '#d84a52'], 0.7 - i / 16 * 0.4, x, y));
  g.rect(3, 26, 4, 7, Gd[1]); g.rect(19, 26, 4, 7, Gd[0]); g.ell(cx, 3, 2, 2, '#5af0ff'); g.set(cx - 1, 2, '#ffffff');
  return { img: g.canvas(OUT), ax: W / 2, ay: H, glow: { dy: -28, c: '#ffd34a', r: 160 } };
}
export const BIOME_PROPS = { treewall, ruinpillar, stalag, cavewall, glowshroom, glacier, basaltwall, obsidian, palwall, balustrade, colpillar, throne };

// ---------- điểm nhấn rải trong thế giới mở (mỗi map một bộ) ----------
// khúc gỗ đổ phủ rêu
function log(r, v) {
  const W = px(r * 2.6) + 2, H = px(r * 1.2) + 3, g = new Grid(W, H), B = ['#2e1c10', '#4a2e1a', '#6a4426', '#8a5e34'];
  g.rect(1, 2, W - 5, H - 3, (i, j, x, y) => sh(B, 0.75 - j / H * 0.6, x, y)); for (let i = 4; i < W - 6; i += 5) g.rect(i, 3, 1, H - 5, B[1]);
  g.ell(W - 3, H / 2 + 0.5, 2.5, H / 2 - 1, (dx, dy) => Math.hypot(dx, dy) < 0.45 ? '#b48a5a' : '#8a6a42');
  for (let k = 0; k < 3; k++) { const x = 3 + Math.round(hash2(k, 2, v * 9) * (W - 10)); g.rect(x, 1, 3, 2, '#4d7a3c'); g.set(x + 1, 0, '#6a9a4a'); }
  return { img: g.canvas(OUT), ax: W / 2, ay: H };
}
// cụm pha lê phát quang
function crystalcluster(r, v) {
  const W = px(r * 2.4) + 2, H = px(r * 2.6) + 2, g = new Grid(W, H), C = [['#1a6a8a', '#3ab8e0', '#9ae8ff', '#ffffff'], ['#4a2a8a', '#8a5ae0', '#c8a8ff', '#ffffff']];
  const sh2 = [[W * 0.5, H, 0.36, 0], [W * 0.24, H * 0.62, 0.2, 1], [W * 0.76, H * 0.7, 0.2, 0], [W * 0.38, H * 0.45, 0.14, 1]];
  for (const [cx, hh, hw, ci] of sh2) for (let y = H - hh; y < H; y++) { const t = (y - (H - hh)) / hh, half = Math.max(0.6, W * hw * Math.min(1, t * 3)); for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) g.set(x, y, sh(C[ci], x < cx ? 0.85 : 0.35, x, y)); }
  g.rect(1, H - 2, W - 2, 2, '#2a2436');
  return { img: g.canvas(OUT), ax: W / 2, ay: H, glow: { dy: -H * 0.5, c: '#7ff0ff', r: 130 } };
}
// tảng đá đóng băng (mũ tuyết + lớp băng mờ)
function frostboulder(r, v) {
  const R = px(r * 1.1), W = 2 * R + 2, H = Math.round(R * 1.7) + 2, g = new Grid(W, H), S = ['#3a4a5e', '#5a6e86', '#84a0ba', '#b8d0e4'];
  g.ell(W / 2 - 0.5, H * 0.56, R, H * 0.44, (dx, dy, x, y) => dy < -0.45 + hash2(x, 1, 3) * 0.2 ? (dy < -0.7 ? '#ffffff' : '#e8f4fc') : sh(S, 0.6 - dx * 0.3 - dy * 0.3, x, y));
  g.rect(W * 0.3, H * 0.55, 3, 2, '#bfe8ff'); g.rect(W * 0.62, H * 0.68, 2, 2, '#9ad8ff');
  return { img: g.canvas(OUT), ax: W / 2, ay: H };
}
// cụm tinh thể băng nhỏ
function icecrystal(r, v) {
  const W = px(r * 2.2) + 2, H = px(r * 2.4) + 2, g = new Grid(W, H), I = ['#3a7ab0', '#6cb4e0', '#bfe8ff', '#ffffff'];
  for (const [cx, hh, hw] of [[W * 0.5, H, 0.3], [W * 0.22, H * 0.55, 0.16], [W * 0.78, H * 0.6, 0.16]]) for (let y = H - hh; y < H; y++) { const t = (y - (H - hh)) / hh, half = Math.max(0.6, W * hw * Math.min(1, t * 2.5)); for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) g.set(x, y, sh(I, x < cx ? 0.8 : 0.4, x, y)); }
  return { img: g.canvas(OUT), ax: W / 2, ay: H, glow: { dy: -H * 0.4, c: '#9fe6ff', r: 90 } };
}
// chậu lửa vàng (sân điện)
function brazier(r, v) {
  const W = 14, H = 18, g = new Grid(W, H), Gd = ['#7a5a10', '#c8983a', '#ffd34a', '#fff0a0'];
  g.rect(2, 7, 10, 3, (i, j) => j === 0 ? Gd[3] : sh(Gd, 0.8 - i / 10 * 0.5, i, j)); g.rect(4, 10, 6, 1, Gd[1]); g.rect(6, 11, 2, 5, Gd[0]); g.rect(3, 16, 8, 2, Gd[1]);
  g.ell(7, 5, 3.5, 4, (dx, dy) => dy > 0.5 ? null : Math.abs(dx) < 0.35 && dy > -0.4 ? '#fff0a0' : '#ff8a2a'); g.rect(6, 0, 2, 2, '#ffb84a');
  return { img: g.canvas(OUT), ax: W / 2, ay: H, glow: { dy: -14, c: '#ffb84a', r: 150 } };
}
// một loại vật "landmark" duy nhất trong chunk, hình đổi theo map
export function landmark(r, v, theme) {
  if (theme === 'forest') return v < 0.55 ? log(r, v) : ruinpillar(r, v);
  if (theme === 'dungeon') return v < 0.55 ? crystalcluster(r, v) : glowshroom(r, v);
  if (theme === 'frost') return v < 0.5 ? frostboulder(r, v) : icecrystal(r, v);
  if (theme === 'volcano') return obsidian(r, v);
  return v < 0.6 ? brazier(r, v) : colpillar(r, v);
}
Object.assign(BIOME_PROPS, { log, crystalcluster, frostboulder, icecrystal, brazier, landmark });
