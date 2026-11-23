// Tranh pixel cho thẻ chọn tướng: nền theo chủ đề + nhân vật phóng to ×2 trong tư thế chiến đấu.
// Vẽ ở độ phân giải thấp (80×50) rồi CSS phóng to với image-rendering: pixelated.
import { canvas, dith, mix } from './pixel.js';
import { HERO_MX, HERO_MY } from './rig.js';

const W = 80, H = 50;
let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

// nền chuyển màu có dither theo chiều dọc
function sky(g, top, bot, y0 = 0, y1 = H) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const t = (y - y0) / (y1 - y0); px(g, x, y, dith(x, y, t) ? bot : top); }
}

const SCENE = {
  KNIGHT(g) { // thành trì cháy, than hồng bay lên
    sky(g, '#140a0c', '#3a1610', 0, 40);
    rect(g, 0, 30, W, 20, '#1a0d0c');
    // tường thành và tháp canh
    const wall = '#0c0708';
    rect(g, 0, 24, W, 16, wall); for (let x = 0; x < W; x += 6) rect(g, x, 21, 3, 3, wall);
    for (const [tx, tw, th] of [[4, 10, 16], [62, 12, 20]]) { rect(g, tx, 24 - th, tw, th, wall); for (let x = tx; x < tx + tw; x += 3) rect(g, x, 22 - th, 2, 2, wall); rect(g, tx + (tw >> 1) - 1, 28 - th, 2, 3, '#ff8a2a'); }
    for (let i = 0; i < 6; i++) { const x = 18 + i * 8, y = 27 + (i & 1); px(g, x, y, '#ff9a3c'); px(g, x, y + 1, '#a8401a'); }
    // ánh lửa phía chân trời
    for (let x = 0; x < W; x++) if (dith(x, 39, 0.5)) px(g, x, 39, '#5a2014');
    rect(g, 0, 40, W, 10, '#2a1512'); for (let x = 0; x < W; x += 5) rect(g, x + (x % 3), 42 + (x % 2) * 3, 3, 1, '#3d1f19');
    for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * 40; px(g, x, y, rnd() < 0.4 ? '#ffd27a' : '#ff6a2a'); if (rnd() < 0.3) px(g, x, y + 1, '#7a2a12'); }
  },
  RANGER(g) { // rừng đêm, trăng, lá rơi
    sky(g, '#081410', '#12301f', 0, 42);
    // trăng
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) px(g, 64 + x, 9 + y, x + y > 2 ? '#c9d6a8' : '#eef2d0');
    // tầng cây xa và gần
    for (let x = 0; x < W; x++) { const h1 = 14 + Math.round(Math.sin(x * 0.45) * 2 + Math.sin(x * 1.3) * 1.5); rect(g, x, 42 - h1, 1, h1, '#0d2418'); }
    for (const tx of [2, 15, 60, 72]) { rect(g, tx, 10, 4, 34, '#08140e'); for (let y = 6; y < 22; y++) { const w = 7 - Math.abs(y - 13) * 0.5; rect(g, tx + 2 - w, y, w * 2, 1, dith(tx, y, 0.6) ? '#0a1d13' : '#0f2a1b'); } }
    rect(g, 0, 42, W, 8, '#0b1d12'); for (let x = 0; x < W; x += 2) if (rnd() < 0.6) px(g, x, 41, '#1c4a2a');
    const leaf = ['#5fae4a', '#9ccc4a', '#d39a3a', '#3f8a3a'];
    for (let i = 0; i < 22; i++) { const x = rnd() * W, y = rnd() * 42, c = leaf[(rnd() * 4) | 0]; px(g, x, y, c); if (rnd() < 0.5) px(g, x + 1, y + 1, mix(c, '#000000', 0.35)); }
    for (let i = 0; i < 6; i++) px(g, rnd() * W, 20 + rnd() * 20, '#d8ff8a'); // đom đóm
  },
  MAGE(g) { // hư không tím, vòng phù văn
    sky(g, '#0a0818', '#1e1440', 0, H);
    for (let i = 0; i < 30; i++) px(g, rnd() * W, rnd() * 34, rnd() < 0.3 ? '#cfc2ff' : '#5a4ca0');
    // vòng phù văn lớn sau lưng
    const cx = 40, cy = 26;
    for (let a = 0; a < 6.283; a += 0.035) { const r1 = 19, r2 = 15; px(g, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9, '#5b3fb0'); if (Math.floor(a * 9) % 3 !== 0) px(g, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.9, '#3a2a78'); }
    for (let k = 0; k < 8; k++) { const a = k * 0.785 + 0.2, x = cx + Math.cos(a) * 17, y = cy + Math.sin(a) * 15.3; rect(g, x - 1, y - 1, 3, 1, '#b79bff'); px(g, x, y, '#e6dcff'); px(g, x, y + 1, '#b79bff'); }
    // tinh thể trôi
    for (const [x, y] of [[8, 14], [70, 20], [12, 34]]) { px(g, x, y - 2, '#c8b6ff'); rect(g, x - 1, y - 1, 3, 2, '#8a6cf0'); px(g, x, y + 1, '#4a3699'); }
    rect(g, 0, 43, W, 7, '#120d26'); for (let x = 0; x < W; x++) if (dith(x, 43, 0.5)) px(g, x, 43, '#2a1f55');
  }
};

// tư thế chiến đấu cho bộ rig (giống tham số heroPose)
const POSE = {
  KNIGHT: { by: 0, lx: -2, ly: 0, rx: 1, ry: 0, alx: -1, aly: 0, arx: 1, ary: -2, lean: 1, hd: 0, cape: 2, hem: -1, eyes: 'open' },
  RANGER: { by: 0, lx: -1, ly: 0, rx: 2, ry: 0, alx: -2, aly: -1, arx: 1, ary: -1, lean: 0, hd: 0, cape: 1, hem: 0, eyes: 'open' },
  MAGE: { by: 0, lx: 0, ly: 0, rx: 0, ry: 0, alx: -1, aly: -1, arx: 1, ary: -3, lean: 0, hd: 0, cape: 1, hem: -1, eyes: 'open' }
};

function weaponFx(g, cls, ox, oy) {
  if (cls === 'KNIGHT') { // kiếm giơ chéo lên trời, lưỡi sáng
    for (let i = 0; i < 18; i++) { const x = ox + 22 + i, y = oy + 18 - i; px(g, x, y, '#0c0a12'); px(g, x, y - 1, i > 14 ? '#ffffff' : '#dfe6ee'); px(g, x + 1, y - 1, '#9aa6b4'); }
    rect(g, ox + 20, oy + 17, 5, 2, '#d4af37'); rect(g, ox + 21, oy + 19, 2, 3, '#6a4a2a');
    for (let i = 0; i < 7; i++) px(g, ox + 34 + i, oy + 3 + (i * 1.6 | 0), i % 2 ? '#fff4c2' : '#ffd27a'); // vệt chém
  } else if (cls === 'RANGER') { // cung kéo căng, mũi tên phát sáng
    const bx = ox + 26, by = oy + 20;
    for (let t = -1.2; t <= 1.2; t += 0.08) { const x = bx + Math.cos(t) * 11, y = by + Math.sin(t) * 13; px(g, x, y, '#0c0a12'); px(g, x - 1, y, '#a0703a'); }
    for (let y = -11; y <= 11; y++) px(g, bx - 1 + Math.abs(y) * 0.27 - 3, by + y, '#e8e0d0');
    for (let x = bx - 6; x < bx + 18; x++) px(g, x, by, x > bx + 14 ? '#fff6a0' : '#d8d0b0');
    rect(g, bx + 18, by - 1, 2, 3, '#fff6a0'); for (let i = 0; i < 6; i++) px(g, bx + 20 + i * 2, by + ((i & 1) ? -1 : 1), '#e8ffb0');
  } else { // gậy phép giơ cao, quả cầu năng lượng
    for (let i = 0; i < 24; i++) { const x = ox + 25 + (i * 0.25 | 0), y = oy + 26 - i; px(g, x, y, '#4a2f1a'); px(g, x + 1, y, '#7a5230'); }
    const cx = ox + 31, cy = oy;
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = x * x + y * y; if (d <= 26) px(g, cx + x, cy + y, d < 5 ? '#ffffff' : d < 12 ? '#c6f4ff' : dith(x + 9, y + 9, 0.5) ? '#7ad8ff' : '#3a7fd0'); }
    for (let k = 0; k < 8; k++) { const a = k * 0.785; px(g, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, '#b79bff'); }
  }
}

const cache = new Map();
export function heroSplash(rig, cls, skin) {
  const key = cls + ':' + (skin || ''); if (cache.has(key)) return cache.get(key);
  const c = canvas(W, H), g = c.getContext('2d'); g.imageSmoothingEnabled = false; seed = { KNIGHT: 7, RANGER: 23, MAGE: 41 }[cls] || 3;
  SCENE[cls](g);
  const ox = 22, oy = 4, fr = rig.frame('h', cls + (skin ? ':' + skin : ''), POSE[cls]).img;
  // bóng đổ + viền sáng sau nhân vật
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(ox + 6, oy + 41, 22, 2);
  if (cls === 'RANGER') weaponFx(g, cls, ox, oy);
  g.drawImage(fr, ox - HERO_MX * 2, oy - HERO_MY * 2, fr.width * 2, fr.height * 2);
  if (cls !== 'RANGER') weaponFx(g, cls, ox, oy);
  cache.set(key, c); return c;
}
