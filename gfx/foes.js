// Sprite quái riêng của map 2–5: mỗi con một dáng (không dùng chung khuôn với rừng), mật độ 1x như nhân vật,
// viền #141013. Nhìn sang phải; render tự lật.
// Tư thế: f = khung đi (0–3), m = đang di chuyển, w = báo đòn, a = ra đòn, x = choáng, sw = phồng (Spore Bomber), r = rune khiên sáng (Sentinel).
import { Grid, shade, hash2, mix } from './pixel.js';

const OUT = '#141013';
const EYE_X = '#2a1a1a';
// chu kỳ đi 4 khung: 0 sải chân (A trước, B sau) · 1 chuyển (B nhấc, thân nhô lên) · 2 sải ngược · 3 chuyển (A nhấc).
// ax/bx: lệch ngang bàn chân A/B, ay/by: nhấc chân, b: nhún thân (âm = lên), l: nghiêng người về trước
const WALK = [{ ax: 2, ay: 0, bx: -2, by: 0, b: 0, l: 1 }, { ax: 0, ay: 0, bx: 0, by: -2, b: -1, l: 1 }, { ax: -2, ay: 0, bx: 2, by: 0, b: 0, l: 1 }, { ax: 0, ay: -2, bx: 0, by: 0, b: -1, l: 1 }];
const STILL = { ax: 0, ay: 0, bx: 0, by: 0, b: 0, l: 0 };
const walk = P => (P.m ? WALK[P.f | 0] : STILL);
// chân người: hông (x, y0) → bàn chân chạm đất y1; lệch dx, nhấc dy; d = phía sau (tối hơn)
function leg(g, x, y0, y1, dx, dy, w, cols, boot) {
  const n = Math.max(1, y1 + dy - y0);
  for (let j = 0; j <= n; j++) { const xx = Math.round(x + dx * j / n); g.rect(xx, y0 + j, w, 1, (i, jj, X, Y) => shade(cols, 0.62 - j / n * 0.3 + (i === 0 ? 0.15 : 0), X, Y)); } // chân xiên theo sải bước
  g.rect(x + dx - (dx < 0 ? 1 : 0), y1 + dy, w + 1, 1, boot);
}

// ---------- hang nấm (tím độc – lục bảo) ----------
const VIO = ['#1e0e2e', '#3e1a5a', '#6a2e92', '#9a52c8', '#c890f0'], EMR = '#3ad08a', EMR2 = '#a8ffd0';
function sporeBomb(P) { // 16 x 13: túi nấm bò thấp, 6 chân
  const g = new Grid(16, 13), s = (P.sw | 0) * 0.45, f = P.f | 0, bob = P.m && f & 1 ? -1 : 0;
  const body = ['#1a2a1e', '#2a5a3a', '#3a8a56', '#6ac88a'];
  for (let k = 0; k < 3; k++) { const x = 4 + k * 3, up = P.m ? (f + k) & 1 : 0; g.line(x, 9, x - 1 - up, 12 - up, '#1a1410'); g.line(x + 1, 9, x + 2 + (1 - up), 12 - (P.m ? 1 - up : 0), '#2e2418'); }
  g.ell(8, 7.5 - s * 0.4 + bob, 5.5 + s, 3.8 + s * 0.8, (dx, dy, x, y) => shade(body, 0.75 - dx * 0.25 - dy * 0.45, x, y));
  g.ell(7.5, 4.5 - s * 0.7 + bob, 5 + s * 0.8, 2.6 + s * 0.4, (dx, dy, x, y) => hash2(x, y, 9) < 0.2 ? '#f0e0f0' : shade(VIO, 0.8 - dx * 0.2 - dy * 0.5, x, y));
  g.set(12 + (s > 0.8 ? 1 : 0), 7 + bob, '#ff3a6a'); g.set(13 + (s > 0.8 ? 1 : 0), 8 + bob, '#ff3a6a');
  if (s > 0.4) for (const [x, y] of [[5, 8], [8, 6], [10, 9], [6, 6]]) g.set(x, y + bob, s > 1 ? '#ffffff' : EMR2);
  return g;
}
function weaver(P) { // 16 x 21: pháp sư nón nấm tím, gậy sợi nấm lục bảo
  const g = new Grid(16, 21), f = P.f | 0, w = P.w | 0, by = P.m ? (f & 1 ? -1 : 0) : (f >= 2 ? 1 : 0), ln = P.m ? 1 : 0;
  const robe = ['#14101e', '#261c38', '#3a2c52', '#54406e'], glow = EMR;
  for (let y = 9; y <= 19; y++) { const s = (y - 9) / 3 | 0, hem = y > 16 ? (f < 2 ? 1 : -1) : 0, sh = y < 13 ? ln : 0, x0 = 5 - s + hem + sh, x1 = 10 + s + hem + sh; g.rect(x0, y + (y < 17 ? by : 0), x1 - x0 + 1, 1, (i, j, x) => (y + i) % 5 === 0 && y > 12 ? '#3a8a5a' : shade(robe, 0.85 - i / (x1 - x0 + 1) * 0.7, x, y)); }
  g.rect(5, 20, 3, 1, '#100c14'); g.rect(9, 20, 3, 1, '#100c14');
  g.ell(8 + ln, 7.5 + by, 3, 2.6, (dx, dy, x, y) => shade(['#5a4a5a', '#8a7488', '#b8a0b4'], 0.7 - dx * 0.3 - dy * 0.3, x, y));
  g.rect(6 + ln, 6 + by, 5, 1, '#1a1020'); g.set(9 + ln, 7 + by, glow); g.set(11 + ln, 7 + by, glow);
  g.ell(8 + ln, 3.4 + by, 7, 2.6, (dx, dy, x, y) => hash2(x, y, 4) < 0.2 ? EMR2 : shade(VIO, 0.85 - dx * 0.15 - dy * 0.55, x, y));
  for (const x of [3, 6, 10, 13]) g.set(x + ln, 6 + by, EMR); // sợi nấm rủ dưới mép nón
  const sy = w ? 0 : 5, sx = 13 + ln;
  g.line(sx, sy + 3, sx, 20, (k) => k * 16 % 3 < 1 ? '#8ac8a0' : '#3a5a48');
  g.ell(sx, sy + 2, w ? 2.4 : 1.8, w ? 2.4 : 1.8, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : dx < 0 ? VIO[3] : glow);
  g.rect(sx - 2, 11 + by, 2, 2, robe[2]);
  return g;
}
function husk(P) { // 22 x 20: xác nấm gù to, tay dài lê đất
  const g = new Grid(22, 20), w = P.w | 0, a = P.a | 0, W = walk(P), b = W.b, l = W.l;
  const skin = ['#2e2a26', '#4e4640', '#766a5e', '#9a8e7e'], slime = EMR;
  leg(g, 6, 13 + b, 18, W.bx, W.by, 3, skin.slice(0, 3), '#100c0a'); leg(g, 12, 13 + b, 18, W.ax, W.ay, 3, skin.slice(1), '#100c0a');
  g.ell(10 + l * 0.5, 10 + b, 8, 6, (dx, dy, x, y) => hash2(x, y, 6) < 0.07 ? slime : shade(skin, 0.7 - dx * 0.2 - dy * 0.45, x, y));
  for (const [x, y, r] of [[6, 4, 3], [11, 3, 3.6], [15, 5, 2.4]]) g.ell(x + l * 0.5, y + b, r, r * 0.65, (dx, dy, xx, yy) => hash2(xx, yy, 3) < 0.2 ? EMR2 : shade(VIO, 0.9 - dy * 0.6, xx, yy));
  const hy = (a ? 11 : 8) + b, hx = 18 + l; g.ell(hx, hy, 2.8, 2.5, (dx, dy, x, y) => shade(skin, 0.75 - dy * 0.4, x, y)); g.set(hx + 1, hy, P.x ? EYE_X : slime); g.set(hx + 2, hy + 1, P.x ? EYE_X : slime);
  const sw = P.m ? (P.f & 2 ? 1 : -1) : 0, fx = w ? 17 : a ? 21 : 18 + sw, fy = w ? 0 : a ? 18 : 16;
  g.line(15 + l, 9 + b, fx, fy, skin[2], 3); g.ell(fx, fy, 2.2, 2, (dx, dy, x, y) => shade(skin, 0.6 - dy * 0.3, x, y));
  g.line(4, 9 + b, w ? 3 : 2 - sw, w ? 1 : 16, skin[1], 2);
  if (a) for (let i = 0; i < 4; i++) g.set(15 + i * 2, 19, i % 2 ? slime : VIO[4]);
  return g;
}
// ---------- đèo băng ----------
// sói băng to: thân cơ bắp, bờm gai băng, mắt xanh; phi nước đại 4 khung (thu chân → bật → bay → đáp)
const GALLOP = [
  { dy: 1, f: [-2, -1], fy: [0, 0], b: [3, 4], by: [0, 0] },   // thu chân
  { dy: 0, f: [2, 3], fy: [-1, 0], b: [-3, -4], by: [0, 0] },  // đạp bật
  { dy: -2, f: [4, 5], fy: [-3, -2], b: [-4, -5], by: [-3, -2] }, // bay
  { dy: -1, f: [1, 2], fy: [0, 0], b: [-2, -1], by: [-2, -1] }  // đáp chân trước
];
function frostStalker(P) { // 28 x 18
  const g = new Grid(28, 18), w = P.w | 0, a = P.a | 0;
  const fur = ['#16243a', '#2e4a6e', '#5a82ae', '#a8c8e8', '#e8f6ff'], ice = ['#7fd0ff', '#bff0ff', '#ffffff'];
  const G = a ? { dy: -2, f: [5, 6], fy: [-4, -3], b: [-5, -6], by: [-2, -1] } : w ? { dy: 2, f: [1, 2], fy: [0, 0], b: [1, 0], by: [0, 0] } : P.m ? GALLOP[P.f | 0] : { dy: 0, f: [0, 1], fy: [0, 0], b: [0, 1], by: [0, 0] };
  const dy = G.dy, gy = 17;
  const legL = (hx, hy, fx, fy, back, front) => { const kx = (hx + fx) / 2 + (front ? 1 : -1), ky = (hy + fy) / 2; g.line(hx, hy, kx, ky, back ? fur[1] : fur[2], 2); g.line(kx, ky, fx, fy, back ? fur[0] : fur[1], 2); g.set(fx + (front ? 1 : 0), fy, '#0e1622'); };
  // chân phía xa (tối)
  legL(18, 10 + dy, 18 + G.f[1], gy + G.fy[1], true, true); legL(8, 10 + dy, 8 + G.b[1], gy + G.by[1], true, false);
  // đuôi xù băng
  for (let k = 0; k < 6; k++) { const x = 4 - k, y = 7 + dy + (k >> 1) - (a ? 1 : 0); g.ell(x, y, 1.8 - k * 0.15, 1.4, (dx, dyy, xx, yy) => shade(fur, 0.6 + k * 0.06 - dyy * 0.3, xx, yy)); }
  // thân: mông + ngực vạm vỡ
  g.ell(8, 9 + dy, 5, 3.6, (dx, dyy, x, y) => shade(fur, 0.7 - dx * 0.15 - dyy * 0.5, x, y));
  g.ell(13, 9.5 + dy, 5, 3.2, (dx, dyy, x, y) => shade(fur, 0.68 - dyy * 0.5, x, y));
  g.ell(18, 8.5 + dy, 5.5, 4.4, (dx, dyy, x, y) => shade(fur, 0.78 - dx * 0.1 - dyy * 0.55, x, y));
  g.rect(9, 12 + dy, 9, 1, fur[0]);
  // bờm gai băng lởm chởm trên vai/cổ
  for (const [x, h] of [[12, 2], [14, 3], [16, 4], [18, 5], [20, 4], [22, 3]]) { for (let u = 0; u < h; u++) g.set(x + (u >> 1), 5 + dy - u, u === h - 1 ? ice[2] : ice[u & 1]); g.set(x + 1, 5 + dy, ice[0]); }
  // đầu: mõm dài, hàm, tai cụp, mắt sáng
  const hx = 23, hy = 7 + dy + (w ? 2 : 0) + (a ? -1 : 0);
  g.ell(hx, hy, 3.4, 2.8, (dx, dyy, x, y) => shade(fur, 0.85 - dyy * 0.5, x, y));
  g.rect(hx + 2, hy, 4, 2, fur[2]); g.rect(hx + 2, hy + 2, 3, 1, a || w ? '#e8f6ff' : fur[1]); if (a || w) g.set(hx + 4, hy + 2, '#ffffff');
  g.set(hx + 5, hy, '#0e1622');
  g.line(hx - 1, hy - 2, hx - 3, hy - 4, fur[3]); g.line(hx, hy - 2, hx - 1, hy - 4, ice[1]);
  g.set(hx + 1, hy - 1, P.x ? EYE_X : '#7fffff'); g.set(hx + 2, hy - 1, P.x ? EYE_X : '#ffffff');
  // chân phía gần (sáng)
  legL(20, 11 + dy, 20 + G.f[0], gy + G.fy[0], false, true); legL(9, 11 + dy, 9 + G.b[0], gy + G.by[0], false, false);
  return g;
}
function cryoMage(P) { // 14 x 22: áo choàng dài, vương miện băng, mảnh băng lơ lửng
  const g = new Grid(14, 22), f = P.f | 0, w = P.w | 0, by = P.m ? (f & 1 ? -1 : 0) : (f >= 2 ? 1 : 0);
  const robe = ['#1a2e4a', '#2e5078', '#5a8ab8', '#a8d8f8'], ice = '#bfefff';
  for (let y = 8; y <= 20; y++) { const s = (y - 8) / 4 | 0, hem = y > 17 ? (f < 2 ? 1 : -1) : 0, x0 = 4 - s + hem, x1 = 9 + s + hem; g.rect(x0, y + (y < 18 ? by : 0), x1 - x0 + 1, 1, (i, j, x) => i === ((x1 - x0) >> 1) && y > 10 ? '#e0f4ff' : shade(robe, 0.85 - i / (x1 - x0 + 1) * 0.7, x, y)); }
  g.rect(4, 21, 2, 1, '#0e1828'); g.rect(8, 21, 2, 1, '#0e1828');
  g.ell(7, 6 + by, 3, 3, (dx, dy, x, y) => shade(['#c8d8e8', '#e8f0f8', '#ffffff'], 0.7 - dx * 0.3 - dy * 0.3, x, y));
  g.rect(6, 6 + by, 4, 2, '#0e1a2e'); g.set(7, 6 + by, '#7fe0ff'); g.set(9, 6 + by, '#7fe0ff');
  g.rect(5, 3 + by, 5, 1, '#4a8ac0'); for (const [x, h] of [[5, 1], [7, 3], [9, 1]]) { g.line(x, 2 + by, x, 3 + by - h, ice); g.set(x, 2 + by - h, '#ffffff'); }
  const hy = w ? 4 : 10;
  g.rect(1, hy + by, 2, 3, robe[1]); g.rect(11, hy + by, 2, 3, robe[1]);
  for (const [x, y] of w ? [[0, 1], [13, 1], [6, -1]] : [[0, 13 + by], [13, 13 + by]]) { g.set(x, y + 1, ice); g.set(x, y + 2, '#ffffff'); g.set(x, y + 3, ice); }
  return g;
}
// Glacial Sentinel: giáp băng nặng, khiên tháp pha lê trong suốt lởm chởm, búa chiến phủ sương; rune khiên sáng khi đỡ đòn
function sentinel(P) { // 28 x 28
  const g = new Grid(28, 28), w = P.w | 0, a = P.a | 0, W = walk(P), b = W.b, l = W.l;
  const plate = ['#1a2a40', '#34506e', '#5a80a8', '#9cc4e4', '#e0f2ff'], frost = '#e8f8ff';
  // búa chiến phía sau (giơ cao khi báo đòn, bổ xuống khi ra đòn)
  const hm = w ? [[9, 12], [5, 2]] : a ? [[9, 12], [3, 22]] : [[8, 14], [4, 5]];
  g.line(hm[0][0], hm[0][1] + b, hm[1][0], hm[1][1], (k) => k > 0.85 ? '#a8b8c8' : '#3a2a20', 2); // cán bọc da, đầu cán thép
  const hx0 = hm[1][0] - 4, hy0 = hm[1][1] - 3; // đầu búa: khối thép băng 8x5 có gờ sáng + gai sương
  g.rect(hx0, hy0, 8, 5, (i, j, x, y) => j === 0 ? '#e8f8ff' : i === 0 || i === 7 ? '#14223a' : shade(['#1e3a5a', '#3a6a98', '#7fb8e8'], 0.85 - j * 0.15, x, y));
  g.rect(hx0 + 3, hy0 + 1, 2, 3, '#bff0ff'); g.set(hx0 - 1, hy0 + 2, frost); g.set(hx0 + 8, hy0 + 2, frost);
  // chân giáp
  leg(g, 8, 19 + b, 26, W.bx, W.by, 4, plate.slice(0, 3), '#0a1220'); leg(g, 13, 19 + b, 26, W.ax, W.ay, 4, plate.slice(1, 4), '#0a1220');
  // thân giáp dày + đai rune
  g.rect(6 + l, 9 + b, 12, 11, (i, j, x, y) => (i * 7 + j * 3) % 11 === 0 ? frost : shade(plate, 0.9 - i * 0.04 - j * 0.03, x, y));
  g.rect(6 + l, 17 + b, 12, 2, '#14223a'); for (let i = 0; i < 4; i++) g.set(7 + l + i * 3, 18 + b, '#7fe0ff');
  // vai gai băng
  for (const [x, s] of [[5, -1], [17, 1]]) { g.ell(x + l, 10 + b, 3, 2.4, (dx, dy, xx, yy) => shade(plate, 0.85 - dy * 0.5, xx, yy)); g.line(x + l, 8 + b, x + l + s, 5 + b, frost); g.line(x + l + s * 2, 9 + b, x + l + s * 3, 7 + b, '#bff0ff'); }
  // mũ trụ có mào sừng + khe mắt sáng
  const hx = 9 + l; g.rect(hx, 2 + b, 7, 7, (i, j, x, y) => shade(plate, 0.95 - i * 0.07 - j * 0.03, x, y)); g.rect(hx + 2, 5 + b, 5, 1, P.x ? EYE_X : a || w ? '#ffffff' : '#7fe0ff');
  g.line(hx + 1, 2 + b, hx - 1, -1 + b, frost); g.line(hx + 5, 2 + b, hx + 7, -1 + b, frost); g.set(hx + 3, 1 + b, '#bff0ff');
  // khiên tháp pha lê lởm chởm (trong suốt: dither 2 tông + vệt sáng chéo)
  const sx = 17 + (a ? 3 : 0), sy = (w ? 1 : a ? 5 : 4) + b, rn = P.r | 0;
  for (let j = 0; j < 20; j++) { const jag = j % 4 === 0 ? 1 : j % 4 === 2 ? -1 : 0, x0 = sx + (j < 3 ? 3 - j : 0) + (jag < 0 ? 1 : 0), x1 = sx + 8 + jag - (j > 16 ? j - 16 : 0);
    for (let x = x0; x <= x1; x++) { const edge = x === x0 || x === x1 || j === 0 || j === 19, facet = (x - sx + j) % 7 === 0;
      g.set(x, sy + j, edge ? '#e8f8ff' : facet ? '#ffffff' : ((x + j) & 1 ? '#8ad4f8' : '#4aa0d8')); } }
  // rune trên khiên: mờ bình thường, sáng rực khi đỡ đòn phía trước
  const RC = rn ? ['#ffffff', '#7fffff'] : ['#bfe8ff', '#6ab8e8'];
  for (const [rx, ry] of [[3, 4], [4, 9], [3, 14]]) { g.set(sx + rx, sy + ry, RC[0]); g.set(sx + rx + 2, sy + ry, RC[0]); g.set(sx + rx + 1, sy + ry - 1, RC[1]); g.set(sx + rx + 1, sy + ry + 1, RC[1]); if (rn) g.set(sx + rx + 1, sy + ry, '#ffffff'); }
  return g;
}
// ---------- núi lửa ----------
function cinderImp(P) { // 14 x 13: yêu tinh nhỏ có cánh dơi (bay: nhún theo nhịp đập cánh)
  const g = new Grid(14, 13), f = P.f | 0, wing = f & 1, b = P.m ? (wing ? -1 : 0) : 0;
  const skin = ['#5a1408', '#a02a10', '#e0501e', '#ffa040'];
  for (const s of [-1, 1]) { const x0 = 7 + s * 2; for (let k = 0; k < 4; k++) g.line(x0, 4 + b, x0 + s * (3 + k * 0.6), (wing ? 1 + k : 6 - k) + b, k % 2 ? '#3a0e08' : '#6a1a0e'); }
  g.ell(7, 7 + b, 3.4, 3.6, (dx, dy, x, y) => hash2(x, y, 2) < 0.12 ? '#ffd36b' : shade(skin, 0.75 - dx * 0.25 - dy * 0.4, x, y));
  g.line(5, 4 + b, 4, 1 + b, '#2a0a06'); g.line(9, 4 + b, 10, 1 + b, '#2a0a06');
  g.set(8, 6 + b, P.x ? EYE_X : '#ffe27a'); g.set(10, 6 + b, P.x ? EYE_X : '#ffe27a');
  g.line(5, 10 + b, 4 + (f === 1 ? 1 : 0), 12, skin[1]); g.line(9, 10 + b, 10 - (f === 3 ? 1 : 0), 12, skin[1]);
  g.line(3, 9 + b, 0, 11, skin[1]); g.set(0, 12, '#ffd36b');
  return g;
}
// Pyro Bombardier: quái golem dung nham lùn chắc, lưng có 3 miệng phun phồng lên trước khi bắn bom
function bombardier(P) { // 24 x 19
  const g = new Grid(24, 19), w = P.w | 0, a = P.a | 0, W = walk(P), b = W.b + (w ? 1 : 0), l = W.l;
  const rock = ['#140c0a', '#2a1a14', '#46302a', '#6a4a3a'], lava = a ? ['#ffffff', '#ffe27a'] : w ? ['#ffd36b', '#ffffff'] : ['#ff5a1a', '#ffb84a'];
  // 4 chân ngắn to (cặp xa tối hơn)
  for (const [x, A, d] of [[5, false, 1], [15, true, 1], [7, true, 0], [17, false, 0]]) { const o = A ? [W.ax, W.ay] : [W.bx, W.by]; g.rect(x + (o[0] >> 1), 13 + b, 3, 5 - b + o[1], d ? rock[1] : rock[2]); g.rect(x + (o[0] >> 1) - 1, 18 + o[1], 4, 1, '#080404'); }
  // thân gù rộng, nứt dung nham
  const sw = w ? 0.8 : 0;
  g.ell(11 + l * 0.5, 11 + b, 9.5 + sw, 5.8 + sw, (dx, dy, x, y) => hash2(x >> 1, (x + y) >> 1, 7) < 0.1 ? lava[0] : shade(rock, 0.72 - dx * 0.2 - dy * 0.5, x, y));
  // 3 miệng phun trên lưng
  for (const [x, h] of [[6, 3], [10, 4], [14, 3]]) { const hh = h + (w ? 1 : 0); g.rect(x - 1, 7 + b - hh, 3, hh + 1, (i, j, xx, yy) => shade(rock, 0.6 - i * 0.15, xx, yy)); g.rect(x, 7 + b - hh, 1, 1, lava[1]); g.set(x - 1, 7 + b - hh, lava[0]); g.set(x + 1, 7 + b - hh, lava[0]); if (w || a) { g.set(x, 6 + b - hh, lava[1]); if (a) g.set(x, 5 + b - hh, '#ffffff'); } }
  // đầu thấp phía trước + hàm phát sáng
  const hx = 20 + l; g.ell(hx, 12 + b, 3.2, 2.8, (dx, dy, x, y) => shade(rock, 0.8 - dy * 0.45, x, y));
  g.set(hx + 1, 11 + b, P.x ? EYE_X : '#ffd36b'); g.set(hx + 2, 11 + b, P.x ? EYE_X : '#ffd36b'); g.rect(hx, 13 + b, 3, 1, lava[0]);
  return g;
}
function juggernaut(P) { // 24 x 21: khối đá vỏ chai bóng, mạch dung nham
  const g = new Grid(24, 21), w = P.w | 0, a = P.a | 0, W = walk(P), b = W.b, l = W.l;
  const obs = ['#120c1a', '#22182e', '#3a2a4e', '#5e4a7a'], seam = w ? '#ffe27a' : '#ff6a2a';
  leg(g, 6, 15 + b, 19, W.bx, W.by, 4, obs.slice(0, 3), '#060408'); leg(g, 14, 15 + b, 19, W.ax, W.ay, 4, obs.slice(1), '#060408');
  g.ell(12 + l * 0.5, 10 + b, 10, 7, (dx, dy, x, y) => { if (dx < -0.2 && dy < -0.3 && (x + y) % 3 === 0) return '#d8c8ff'; if (hash2(x >> 1, (x + y) >> 1, 8) < 0.1) return seam; return shade(obs, 0.75 - dx * 0.25 - dy * 0.5, x, y); });
  for (const [x, y] of [[5, 4], [9, 2], [14, 2], [18, 4]]) g.line(x + l, y + 2 + b, x + l + (x > 12 ? 1 : -1), y - 1 + b, obs[3], 2);
  g.rect(17 + l, 7 + b, 4, 3, obs[1]); g.rect(18 + l, 8 + b, 2, 1, P.x ? EYE_X : seam);
  const fy = w ? 2 : a ? 18 : 14 + (P.m ? (P.f & 2 ? -1 : 0) : 0);
  for (const s of [0, 1]) { const x = s ? 22 : 2; g.line(s ? 19 : 5, 9 + b, x, fy, obs[2], 3); g.ell(x, fy, 2.4, 2.2, (dx, dy, xx, yy) => shade(obs, 0.7 - dy * 0.4, xx, yy)); }
  if (w) for (let i = 0; i < 3; i++) g.set(10 + i * 2, 10 + b, '#ffffff');
  return g;
}
// ---------- cung điện (đỏ thẫm – vàng) ----------
function assassin(P) { // 16 x 19: trùm mũ, khăn đỏ bay, đôi dao lưỡi liềm đỏ thẫm
  const g = new Grid(16, 19), f = P.f | 0, w = P.w | 0, a = P.a | 0, W = walk(P), crouch = (a ? 2 : 0) + (W.b < 0 ? -1 : 0), l = W.l;
  const cloak = ['#0c0812', '#1a1226', '#2e2240', '#4a3a62'], red = ['#6a0a14', '#b01428', '#ff2a4a'];
  leg(g, 5, 13, 17, W.bx, W.by, 2, cloak.slice(0, 3), '#060408'); leg(g, 9, 13, 17, W.ax, W.ay, 2, cloak.slice(1), '#060408');
  for (let y = 7 + crouch; y <= 14; y++) { const s = (y - 7) / 3 | 0, sh = y < 10 ? l : 0, x0 = 4 - s + sh, x1 = 11 + s + sh; g.rect(x0, y, x1 - x0 + 1, 1, (i, j, x) => shade(cloak, 0.8 - i / (x1 - x0 + 1) * 0.6, x, y)); }
  for (let k = 0; k < 6; k++) g.set(3 - k * 0.8, 8 + crouch + k * 0.5 + ((k + f) & 1), k < 4 ? red[1 + ((k + f) & 1)] : red[0]); // khăn bay
  g.rect(4 + l, 7 + crouch, 8, 2, red[1]);
  g.ell(8 + l, 4 + crouch, 3.6, 3.6, (dx, dy, x, y) => shade(cloak, 0.85 - dx * 0.3 - dy * 0.3, x, y)); g.line(8 + l, 0 + crouch, 10 + l, 1 + crouch, cloak[3]);
  g.rect(8 + l, 4 + crouch, 4, 2, '#060408'); g.set(9 + l, 4 + crouch, P.x ? EYE_X : red[2]); g.set(11 + l, 4 + crouch, P.x ? EYE_X : red[2]);
  const dy = 10 + crouch, blade = (pts, c) => { for (const [x, y] of pts) g.set(x, y, c); };
  if (w) { blade([[11, dy - 4], [12, dy - 5], [13, dy - 6], [14, dy - 6], [15, dy - 5]], '#ffd8e0'); blade([[11, dy - 2], [12, dy - 1], [13, dy], [14, dy], [15, dy - 1]], '#ffd8e0'); }
  else if (a) { blade([[11, dy], [12, dy - 2], [13, dy - 4], [14, dy - 5], [15, dy - 5]], red[2]); blade([[11, dy + 1], [12, dy + 3], [13, dy + 4], [14, dy + 5], [15, dy + 5]], red[2]); g.set(13, dy - 3, '#ffffff'); }
  else { blade([[12, dy], [13, dy - 1], [14, dy - 3], [14, dy - 2]], '#dfe4ee'); blade([[4, dy], [3, dy - 1], [2, dy - 3], [2, dy - 2]], '#dfe4ee'); }
  return g;
}
function arcanist(P) { // 16 x 23: áo choàng hoàng gia, cổ áo cao, quả cầu máu
  const g = new Grid(16, 23), f = P.f | 0, w = P.w | 0, a = P.a | 0, by = P.m ? (f & 1 ? -1 : 0) : (f >= 2 ? 1 : 0);
  const robe = ['#3a0610', '#640c1c', '#981a2e', '#c83448'], gold = ['#8a6a20', '#e6b84a', '#ffe27a'];
  for (let y = 9; y <= 21; y++) { const s = (y - 9) / 4 | 0, hem = y > 18 ? (f < 2 ? 1 : -1) : 0, x0 = 5 - s + hem, x1 = 10 + s + hem; g.rect(x0, y + (y < 19 ? by : 0), x1 - x0 + 1, 1, (i, j, x) => y === 21 || i === 0 || i === x1 - x0 ? gold[1] : shade(robe, 0.85 - i / (x1 - x0 + 1) * 0.7, x, y)); }
  g.rect(7, 9 + by, 2, 12, gold[0]);
  g.rect(4, 6 + by, 2, 4, gold[1]); g.rect(10, 6 + by, 2, 4, gold[1]);
  g.ell(8, 6 + by, 2.6, 2.8, (dx, dy, x, y) => shade(['#c8a8a0', '#e8d0c8', '#fff0e8'], 0.75 - dx * 0.3 - dy * 0.3, x, y));
  g.set(9, 6 + by, '#ff2a4a'); g.rect(6, 3 + by, 5, 1, gold[2]); for (const x of [6, 8, 10]) g.set(x, 2 + by, gold[1]);
  const ox = 13, oy = w || a ? 4 : 11, r = w ? 2.6 : a ? 2.2 : 1.8;
  g.line(11, 11 + by, ox - 1, oy + 2, robe[2], 2);
  g.ell(ox, oy, r, r, (dx, dy) => dx * dx + dy * dy < 0.25 ? '#ffffff' : dx * dx + dy * dy < 0.6 ? '#ff5a6a' : '#b01428');
  if (w || a) for (let i = 0; i < 4; i++) { const q = i * 1.57 + f * 0.4; g.set(ox + Math.round(Math.cos(q) * 4), oy + Math.round(Math.sin(q) * 4), '#ff8a9a'); }
  return g;
}
// Royal Halberdier: giáp tấm đỏ thẫm viền vàng chạm trổ, mũ có chùm lông, áo choàng, kích tháp mạ vàng
function halberdier(P) { // 28 x 29
  const g = new Grid(28, 29), w = P.w | 0, a = P.a | 0, W = walk(P), b = W.b, l = W.l;
  const red = ['#3a0610', '#6a0c1c', '#a01a2c', '#d03a48'], gold = ['#6a4a10', '#b8862a', '#e6b84a', '#ffe8a0'], steel = ['#3a3440', '#6a6070', '#a89aa8'];
  // áo choàng phía sau
  for (let y = 9; y <= 24; y++) { const s = (y - 9) / 3 | 0, wv = ((y + (P.f | 0)) >> 2) & 1; g.rect(5 - s - wv + l, y + b, 3 + (s >> 1), 1, (i, j, x) => shade(red, 0.35 + i * 0.12, x, y)); }
  // chân giáp vàng – thép
  leg(g, 9, 19 + b, 27, W.bx, W.by, 3, [gold[0], gold[1], steel[1]], '#100a08'); leg(g, 14, 19 + b, 27, W.ax, W.ay, 3, [gold[1], gold[2], gold[3]], '#100a08');
  // thân giáp đỏ viền vàng + huy hiệu
  g.rect(8 + l, 10 + b, 10, 10, (i, j, x, y) => i === 0 || i === 9 || j === 9 ? gold[2] : shade(red, 0.9 - i * 0.05 - j * 0.02, x, y));
  g.rect(12 + l, 12 + b, 2, 4, gold[3]); g.rect(11 + l, 13 + b, 4, 1, gold[2]);
  g.rect(8 + l, 17 + b, 10, 1, gold[1]);
  // vai vàng chạm trổ
  for (const x of [7, 18]) g.ell(x + l, 11 + b, 2.8, 2.2, (dx, dy, xx, yy) => (xx + yy) % 3 === 0 ? gold[3] : shade(gold, 0.85 - dy * 0.5, xx, yy));
  // mũ trụ vàng có khe mặt + chùm lông đỏ cong ra sau
  const hx = 10 + l; g.rect(hx, 3 + b, 7, 7, (i, j, x, y) => shade(gold, 0.95 - i * 0.07 - j * 0.04, x, y)); g.rect(hx + 3, 6 + b, 4, 1, P.x ? EYE_X : '#1a0a08'); g.rect(hx + 4, 5 + b, 1, 3, '#1a0a08');
  for (let k = 0; k < 7; k++) { const x = hx + 3 - k, y = 2 + b - (k < 3 ? k : 3 - (k - 3) * 0.5) + (k > 4 ? 1 : 0); g.rect(x, y, 2, 2, k % 2 ? red[2] : red[3]); }
  g.set(hx + 4, 1 + b, red[3]);
  // kích tháp mạ vàng: đứng / ngả sau vai (báo đòn quét) / ngang ra trước (quét – đâm)
  const pole = gold[1], ring = gold[3];
  const head = (x, y, dir) => { // lưỡi rìu lớn + mũi nhọn + móc
    if (dir === 'up') { g.line(x, y, x, y - 5, '#fff6d0'); g.rect(x + 1, y - 3, 3, 4, (i, j) => i === 2 || j === 0 ? '#fff6d0' : gold[2]); g.rect(x - 2, y - 1, 2, 2, gold[2]); g.rect(x - 1, y + 1, 3, 1, red[2]); }
    else { g.line(x, y, x + 5, y, '#fff6d0'); g.rect(x - 1, y + 1, 4, 3, (i, j) => j === 2 || i === 0 ? '#fff6d0' : gold[2]); g.rect(x, y - 2, 2, 2, gold[2]); g.rect(x - 2, y - 1, 1, 3, red[2]); } };
  if (a) { g.line(2, 14 + b, 22, 14 + b, (k) => k > 0.3 && k < 0.36 ? ring : pole, 1); g.line(2, 15 + b, 21, 15 + b, gold[0]); head(22, 14 + b, 'side'); g.rect(17 + l, 13 + b, 3, 3, gold[2]); }
  else if (w) { g.line(19, 15 + b, 3, 4, pole, 2); head(3, 4, 'up'); g.rect(16 + l, 13 + b, 3, 3, gold[2]); }
  else { g.line(21, 7 + b, 21, 28, (k) => Math.abs(k - 0.45) < 0.03 ? ring : pole); g.line(22, 8 + b, 22, 27, gold[0]); head(21, 7 + b, 'up'); g.rect(18 + l, 13 + b, 3, 3, gold[2]); }
  return g;
}

export const FOE_ART = {
  SPOREBOMB: [sporeBomb, 16, 13], WEAVER: [weaver, 16, 21], HUSK: [husk, 22, 20],
  FROSTSTALKER: [frostStalker, 28, 18], CRYOMAGE: [cryoMage, 14, 22], SENTINEL: [sentinel, 28, 28],
  CINDERIMP: [cinderImp, 14, 13], BOMBARDIER: [bombardier, 24, 19], JUGGERNAUT: [juggernaut, 24, 21],
  ASSASSIN: [assassin, 16, 19], ARCANIST: [arcanist, 16, 23], HALBERDIER: [halberdier, 28, 29]
};
// quái có chân chạm đất: bụi tung mỗi bước
export const FOE_FEET = new Set(['SPOREBOMB', 'HUSK', 'FROSTSTALKER', 'SENTINEL', 'BOMBARDIER', 'JUGGERNAUT', 'ASSASSIN', 'HALBERDIER']);
export const drawFoe = (type, P) => FOE_ART[type][0](P).canvas(OUT);

const WIND = { tele: 1, swell: 1, feint: 1, throw: 1, vanish: 1, slamWind: 1 }, ACT = { pounce: 1, lunge: 1, slam: 1, beam: 1, recover: 1, fire: 1, windup: 1, sweep: 1 };
export function foePose(e, t) {
  const hard = e.freeze > 0 || e.stun > 0, x = e.state === 'stagger' || e.stun > 0 ? 1 : 0;
  const mv = Math.hypot(e.x - (e._wx ?? e.x), e.y - (e._wy ?? e.y)); e._wx = e.x; e._wy = e.y; if (mv > 0.25) e._mvT = 0.15; else e._mvT = Math.max(0, (e._mvT || 0) - 1 / 60);
  const m = !hard && !x && e._mvT > 0 && !WIND[e.state] && !ACT[e.state] ? 1 : 0;
  const rate = e.type === 'FROSTSTALKER' ? 0.085 : 0.12, f = hard || x ? 0 : Math.floor(t / rate + e.id) % 4;
  return { f, m, w: WIND[e.state] ? 1 : 0, a: ACT[e.state] ? 1 : 0, x, sw: e.state === 'swell' ? Math.max(1, Math.min(3, Math.floor((1 - e.st / 0.7) * 4))) : 0, r: e.blockT > 0 ? 1 : 0 };
}
export { mix };
