// Lò rèn / cửa hàng cho 5 map — cùng mật độ texel 1x với nhân vật (1 pixel lưới = WPP đơn vị thế giới),
// chi tiết 1 pixel (gạch có vữa, ngói, xà mảnh), viền #141013 mảnh, lò sưởi nép trong tường sau,
// quầy hàng gỗ phía trước trưng kiếm/khiên/bình thuốc/lõi nguyên tố, và người bán hàng to đúng bằng nhân vật (16×22).
import { Grid, dith } from './pixel.js';

const OUT = '#141013';
const sh = (pal, v, x, y) => { const t = Math.max(0, Math.min(0.999, v)) * (pal.length - 1), b = Math.floor(t); return pal[Math.min(pal.length - 1, b + (dith(x, y, t - b) ? 1 : 0))]; };
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export const FORGE_PAL = {
  forest:  { trim: '#c89a5a', glow: '#ffb84a', lamp: '#ffd36b' },
  dungeon: { trim: '#7affd0', glow: '#5af0ff', lamp: '#9ff0ff' },
  frost:   { trim: '#7fd0ff', glow: '#5ab8ff', lamp: '#9ae0ff' },
  volcano: { trim: '#ff8a2a', glow: '#ff7a1a', lamp: '#ffb84a' },
  palace:  { trim: '#ffd34a', glow: '#fff0a0', lamp: '#ffe08a' }
};
// kích thước nhà: 64×52, chân tường trước ở hàng 49 (neo)
export const HOUSE = { W: 64, H: 52, CX: 32, BASE: 49 };
const { W, H, CX, BASE } = HOUSE;

// tường gạch: viên w×h, vữa 1px, so le từng hàng
function bricks(g, x0, y0, w, h, bw, bh, pal, mortar) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const row = Math.floor((y - y0) / bh), off = row % 2 ? (bw >> 1) : 0, bx = (x - x0 + off) % bw, by = (y - y0) % bh;
    if (by === bh - 1 || bx === bw - 1) { g.set(x, y, mortar); continue; }
    const id = hash(Math.floor((x - x0 + off) / bw), row);
    g.set(x, y, by === 0 ? pal[2] : id < 0.33 ? pal[0] : pal[1]);
  }
}
// mái ngói: hàng cao 2px, viên rộng 3px, khe 1px tối, so le
function shingles(g, top, rows, w0, grow, pal, dark, cap) {
  for (let r = 0; r < rows; r++) { const y = top + r * 2, hw = w0 + r * grow; for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) { const k = (x + (r % 2) * 2) % 4; g.set(x, y, k === 3 ? dark : pal[(hash(x >> 2, r) * pal.length) | 0]); g.set(x, y + 1, k === 3 ? dark : r === rows - 1 ? dark : pal[0]); } }
  if (cap) for (let x = Math.round(CX - w0); x <= Math.round(CX + w0); x++) g.set(x, top - 1, cap);
}
// cửa mở có lò sưởi nép trong tường sau: vòm đá nhỏ, than hồng, lửa
function hearthDoor(g, x0, y0, w, h, frame, glow) {
  for (let y = y0; y < BASE; y++) for (let x = x0; x < x0 + w; x++) g.set(x, y, '#120c0a');
  for (let x = x0; x < x0 + w; x++) { const dy = Math.round(Math.abs(x - (x0 + w / 2 - 0.5)) ** 2 / (w * 0.6)); for (let y = y0 - 3 + dy; y < y0; y++) g.set(x, y, '#120c0a'); }
  for (let y = y0 - 3; y < BASE; y++) { g.set(x0 - 1, y, frame); g.set(x0 + w, y, frame); }
  const fx = x0 + 2, fw = w - 4, fy = BASE - 7;                                  // lò trong tường sau
  for (let x = fx; x < fx + fw; x++) { g.set(x, fy, '#4a4a52'); g.set(x, fy + 1, (x - fx) % 3 === 2 ? '#2a2a30' : '#6a6a72'); }
  for (let y = fy + 2; y < BASE - 1; y++) for (let x = fx + 1; x < fx + fw - 1; x++) g.set(x, y, y === BASE - 2 ? (hash(x, y) < 0.5 ? '#ff6a1a' : '#a8300e') : hash(x, y) < 0.3 ? '#ffe08a' : hash(x, y) < 0.7 ? glow : '#ff6a1a');
  g.set(fx, BASE - 4, '#4a4a52'); g.set(fx + fw - 1, BASE - 4, '#4a4a52');
}
function win(g, x, y, w, h, frame, light) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.set(x + i, y + j, (i === 0 || j === 0 || i === w - 1 || j === h - 1) ? frame : (i === (w >> 1) || j === (h >> 1)) ? frame : j < h / 2 ? light : '#e8a040'); }

function forest() {
  const g = new Grid(W, H), stone = ['#5e5e54', '#76766a', '#929284'], plaster = ['#b4a07a', '#c8b48c', '#d8c69e'], wood = ['#2e1c10', '#4a2e1a', '#6a4426'], roof = ['#5a3a22', '#6a4628', '#7a5230'], moss = ['#3a6a2e', '#4d8a3c', '#6aa84a'];
  bricks(g, 7, BASE - 6, 50, 6, 4, 2, stone, '#3a3a34');                       // móng đá
  for (let y = 22; y < BASE - 6; y++) for (let x = 8; x < 56; x++) g.set(x, y, sh(plaster, 0.75 - (x - 8) / 48 * 0.4 + (hash(x, y) < 0.06 ? -0.3 : 0), x, y));
  for (const x of [8, 19, 44, 55]) for (let y = 21; y < BASE - 6; y++) g.set(x, y, x === 8 || x === 44 ? wood[1] : wood[2]);
  for (let x = 8; x < 56; x++) { g.set(x, 21, wood[2]); g.set(x, 22, wood[0]); g.set(x, 31, wood[1]); }
  for (let k = 0; k < 9; k++) { g.set(9 + k, 30 - k, wood[1]); g.set(54 - k, 30 - k, wood[1]); }   // giằng chéo
  shingles(g, 6, 8, 6, 3.3, roof, '#3a2414', null);
  for (let k = 0; k < 16; k++) { const r = (hash(k, 9) * 8) | 0, y = 6 + r * 2, hw = 6 + r * 3.3, x = Math.round(CX - hw + hash(k, 3) * hw * 2); g.set(x, y, moss[1]); g.set(x + 1, y, moss[2]); if (k % 3 === 0) g.set(x, y + 1, moss[0]); }
  bricks(g, 45, 2, 6, 16, 3, 2, stone, '#3a3a34'); for (let x = 44; x < 52; x++) g.set(x, 1, '#2a2a26');          // ống khói
  hearthDoor(g, 26, 34, 12, 15, wood[0], '#ffb84a');
  win(g, 12, 25, 5, 5, wood[0], '#ffd88a'); win(g, 47, 25, 5, 5, wood[0], '#ffd88a');
  return g;
}
function dungeon() {
  const g = new Grid(W, H), rock = ['#221c30', '#2e2640', '#3e3454', '#524670'], brick = ['#3e3650', '#4a4260', '#5e5478'], cy = ['#1a8aa0', '#4adcf0', '#c8fcff'], vi = ['#5a2ab0', '#9a5ae8', '#e0c8ff'];
  g.ell(CX, 26, 27, 25, (dx, dy, x, y) => y >= BASE ? null : sh(rock, 0.62 - dx * 0.3 - dy * 0.25, x, y));
  for (let x = 6; x < 58; x++) for (let y = 26; y < BASE; y++) g.set(x, y, sh(rock, 0.55 - (x - 6) / 52 * 0.3, x, y));
  for (let k = 0; k < 14; k++) { let x = 8 + (hash(k, 1) * 48) | 0, y = 8 + (hash(k, 2) * 36) | 0; for (let s = 0; s < 4; s++) { g.set(x, y, rock[0]); x += hash(k, s) < 0.5 ? 1 : -1; y++; } } // vết nứt 1px
  // vòm đá xây: viên 3×2 dọc theo cung
  for (let k = 0; k <= 16; k++) { const a = Math.PI + k / 16 * Math.PI, x = Math.round(CX + Math.cos(a) * 12), y = Math.round(31 + Math.sin(a) * 12); for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) g.set(x + i - 1, y + j, i === 2 || j === 1 ? rock[0] : brick[k % 3]); }
  bricks(g, 19, 31, 3, 18, 3, 2, brick, rock[0]); bricks(g, 42, 31, 3, 18, 3, 2, brick, rock[0]);
  hearthDoor(g, 22, 31, 20, 18, rock[0], '#5af0ff');
  for (let x = 25; x < 39; x += 4) { g.set(x, 36, cy[1]); g.set(x + 1, 37, cy[2]); }                               // phù văn trong hốc
  for (const [x, c, hgt] of [[7, vi, 26], [57, cy, 22]]) { for (let y = BASE - hgt; y < BASE; y++) { g.set(x, y, '#d8ccb4'); g.set(x + 1, y, '#a89c88'); } g.ell(x + 0.5, BASE - hgt, 5, 3, (dx, dy, xx, yy) => dy > 0.3 ? null : sh(c, 0.7 - dx * 0.3 - dy * 0.3, xx, yy)); g.set(x - 2, BASE - hgt - 1, '#ffffff'); g.set(x + 2, BASE - hgt, c[2]); }
  for (const [x, c] of [[14, cy], [50, vi], [17, vi]]) { g.set(x, BASE - 4, c[1]); g.set(x, BASE - 3, c[1]); g.set(x, BASE - 2, c[0]); g.set(x + 1, BASE - 2, c[2]); g.set(x - 1, BASE - 2, c[0]); g.set(x, BASE - 5, c[2]); }
  return g;
}
function frost() {
  const g = new Grid(W, H), st = ['#5a6e82', '#6e849a', '#8aa2b8'], pine = ['#2e1e12', '#4a3020', '#5e3e28'], snow = ['#d4e6f4', '#ffffff'];
  bricks(g, 8, 22, 48, BASE - 22, 5, 3, st, '#3a4a5a');
  for (let r = 0; r < 7; r++) { const y = 8 + r * 2, hw = 8 + r * 4; for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) { g.set(x, y, (x % 6) === 0 ? pine[0] : pine[2]); g.set(x, y + 1, (x % 6) === 0 ? pine[0] : pine[1]); } }
  for (let x = CX - 34; x <= CX + 34; x++) g.set(x, 22, pine[0]);
  for (let r = 0; r < 7; r++) { const y = 7 + r * 2, hw = 8 + r * 4; for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) if (r === 0 || hash(x, r) < 0.35) g.set(x, y, snow[r === 0 ? 1 : 0]); }
  for (let x = CX - 9; x <= CX + 9; x++) { g.set(x, 6, snow[1]); g.set(x, 5, x % 3 ? snow[1] : snow[0]); }
  for (let x = CX - 33; x <= CX + 33; x += 3) { const len = 1 + ((hash(x, 5) * 4) | 0); for (let k = 0; k < len; k++) g.set(x, 23 + k, k === len - 1 ? '#ffffff' : '#a8dcf8'); }  // nhũ băng 1px
  hearthDoor(g, 26, 33, 12, 16, pine[0], '#5ab8ff');
  win(g, 13, 27, 5, 5, pine[0], '#bfe8ff'); win(g, 46, 27, 5, 5, pine[0], '#bfe8ff');
  for (let k = 0; k < 2; k++) for (let x = 24 - k * 2; x < 40 + k * 2; x++) g.set(x, BASE + k, k ? '#8aa2b8' : '#ffffff');
  // chậu lửa xanh
  for (let x = 58; x < 63; x++) g.set(x, BASE - 8, '#3a3a44'); g.set(60, BASE - 7, '#2a2a30'); for (let y = BASE - 6; y < BASE; y++) g.set(60, y, '#3a3a44');
  g.set(60, BASE - 12, '#e8f8ff'); g.set(59, BASE - 11, '#5ab8ff'); g.set(60, BASE - 11, '#bfe8ff'); g.set(61, BASE - 11, '#5ab8ff'); for (let x = 59; x < 62; x++) { g.set(x, BASE - 10, '#4ab8ff'); g.set(x, BASE - 9, '#2a7ad8'); }
  return g;
}
function volcano() {
  const g = new Grid(W, H), iron = ['#1e1a22', '#2a242e', '#3a3240'], bas = ['#16121a', '#221c24', '#322a34'];
  for (let x = 6; x < 58; x += 3) { const h = 4 + ((hash(x, 1) * 3) | 0); for (let y = BASE - h + 2; y < BASE + 1; y++) for (let i = 0; i < 3; i++) g.set(x + i, y, i === 2 ? bas[0] : y === BASE - h + 2 ? bas[2] : bas[1]); }
  for (let y = 22; y < BASE - 2; y++) for (let x = 9; x < 55; x++) { const sx = (x - 9) % 9, sy = (y - 22) % 7; g.set(x, y, sx === 0 || sy === 0 ? '#0e0c10' : sh(iron, 0.75 - sx / 9 * 0.4, x, y)); if ((sx === 2 || sx === 7) && sy === 2) g.set(x, y, '#6a5a6a'); }
  for (let r = 0; r < 8; r++) { const y = 6 + r * 2, hw = 5 + r * 3.6; for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) { g.set(x, y, x % 5 === 0 ? '#0e0c10' : iron[2]); g.set(x, y + 1, x % 5 === 0 ? '#0e0c10' : iron[1]); } }
  for (let x = CX - 31; x <= CX + 31; x++) g.set(x, 22, '#0e0c10');
  for (const s of [-1, 1]) { let x = CX + s * 30, y = 21; for (let k = 0; k < 7; k++) { g.set(x, y, k < 4 ? '#4a3a40' : '#8a7a80'); g.set(x + s, y, '#2a2026'); x += s * (k < 3 ? 1 : 0); y--; } g.set(x, y, '#d8c8c8'); }
  for (let y = 0; y < 6; y++) g.set(CX, y, y < 2 ? '#ff8a2a' : '#3a3036');
  hearthDoor(g, 25, 33, 14, 14, '#4a1a0a', '#ff7a1a');
  for (let x = 4; x < 60; x++) { g.set(x, BASE + 1, (x >> 1) % 3 ? '#ff8a2a' : '#ffe08a'); g.set(x, BASE + 2, '#a8300e'); }   // rãnh dung nham
  for (const x of [14, 48]) for (let y = 27; y < 32; y++) g.set(x, y, y % 2 ? '#ffd36b' : '#ff6a1a');
  return g;
}
function palace() {
  const g = new Grid(W, H), mar = ['#b4ac9a', '#d4cebe', '#ece8dc', '#faf8f2'], gd = ['#8a6a14', '#c8983a', '#ffd34a', '#fff0a0'], cr = ['#6a1018', '#8a1a22', '#a82a30'];
  for (let k = 0; k < 3; k++) for (let x = 5 + k * 2; x < 59 - k * 2; x++) g.set(x, BASE - k, k % 2 ? mar[1] : mar[3]);
  for (let y = 22; y < BASE - 2; y++) for (let x = 11; x < 53; x++) g.set(x, y, ((x - 11) % 6 === 0 || (y - 22) % 5 === 0) ? cr[0] : sh(cr, 0.7 - (x - 11) / 42 * 0.4, x, y));
  for (const x of [8, 20, 40, 52]) { for (let y = 22; y < BASE - 2; y++) for (let i = 0; i < 4; i++) g.set(x + i, y, i === 1 ? mar[3] : i === 2 ? mar[1] : i === 0 ? mar[2] : mar[0]); for (let i = -1; i < 5; i++) { g.set(x + i, 20, gd[3]); g.set(x + i, 21, gd[1]); g.set(x + i, BASE - 3, gd[1]); } }
  for (let r = 0; r < 7; r++) { const y = 6 + r * 2, hw = 8 + r * 3.8 + (r === 6 ? 3 : 0); for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) { const k = (x + (r % 2) * 2) % 4; g.set(x, y, k === 0 ? gd[1] : cr[2]); g.set(x, y + 1, k === 0 ? cr[0] : cr[1]); } }
  for (let x = CX - 34; x <= CX + 34; x++) { g.set(x, 19, gd[2]); g.set(x, 20, gd[0]); }
  for (let y = 1; y < 6; y++) g.set(CX, y, gd[2]); g.set(CX - 1, 2, gd[3]); g.set(CX + 1, 2, gd[1]); g.set(CX, 0, gd[3]);
  hearthDoor(g, 26, 31, 12, 16, gd[1], '#ffd88a');
  for (let x = CX - 4; x < CX + 4; x++) for (let y = BASE - 2; y <= BASE; y++) g.set(x, y, x === CX - 4 || x === CX + 3 ? gd[2] : cr[2]);
  for (const x of [15, 47]) { for (let y = 21; y < 26; y++) g.set(x, y, gd[0]); g.set(x - 1, 26, gd[3]); g.set(x, 26, gd[2]); g.set(x + 1, 26, gd[1]); g.set(x, 27, gd[0]); }  // lư hương
  return g;
}
const HOUSES = { forest, dungeon, frost, volcano, palace };
export function forgeHouse(theme) { const g = (HOUSES[theme] || forest)(); return { img: g.canvas(OUT), ax: CX + 1, ay: BASE + 1 }; }

// ---------- quầy hàng: mặt quầy gỗ + đồ trưng (kiếm, khiên, bình thuốc, lõi nguyên tố) ----------
const COUNTER = {
  forest:  { top: ['#6a4426', '#8a5e34', '#a8743e'], front: ['#4a2e1a', '#5e3c22'], cloth: '#3e6a2a' },
  dungeon: { top: ['#3e3650', '#4e4466', '#62587e'], front: ['#2a2438', '#342c46'], cloth: '#2a6a7a' },
  frost:   { top: ['#5e3e28', '#7a5234', '#946644'], front: ['#3e2818', '#4a3020'], cloth: '#4a6a8a', snow: true },
  volcano: { top: ['#2a242e', '#3a3240', '#4a4250'], front: ['#16121a', '#221c24'], cloth: '#8a2a10' },
  palace:  { top: ['#d4cebe', '#ece8dc', '#faf8f2'], front: ['#8a1a22', '#a82a30'], cloth: '#ffd34a' }
};
export function forgeCounter(theme) {
  const C = COUNTER[theme] || COUNTER.forest, g = new Grid(34, 16);
  for (let x = 0; x < 34; x++) { g.set(x, 8, C.top[2]); g.set(x, 9, x % 8 === 7 ? C.top[0] : C.top[1]); g.set(x, 10, C.top[0]); }  // mặt quầy (ván 1px)
  for (let y = 11; y < 16; y++) for (let x = 1; x < 33; x++) g.set(x, y, x % 6 === 0 ? C.front[0] : y === 11 ? C.front[0] : C.front[1]);
  for (let x = 4; x < 30; x++) g.set(x, 12, x % 2 ? C.cloth : C.front[1]);                                              // dải vải trước quầy
  if (C.snow) for (let x = 0; x < 34; x += 1) if (hash(x, 1) < 0.5) g.set(x, 7, '#ffffff');
  // kiếm dựng (lưỡi 1px, chuôi, chắn tay)
  for (let y = 0; y < 7; y++) g.set(3, y, y === 0 ? '#ffffff' : '#c8ccd8'); g.set(2, 6, '#c8983a'); g.set(4, 6, '#c8983a'); g.set(3, 7, '#5a3a1a');
  // khiên tròn có huy hiệu
  for (let y = 2; y < 8; y++) for (let x = 7; x < 12; x++) { const d = (x - 9) ** 2 + (y - 4.8) ** 2; if (d <= 7.5) g.set(x, y, d > 4.5 ? '#c8983a' : (x === 9 || y === 5) ? '#ffd34a' : '#8a1a22'); }
  // bình máu + bình năng lượng
  for (const [x, c, l] of [[15, '#ff4a5a', '#ffb0b8'], [19, '#3a8aff', '#b0dcff']]) { g.set(x, 3, '#c8c0b0'); g.set(x, 4, '#e8e0d0'); for (let y = 5; y < 8; y++) for (let i = -1; i <= 1; i++) g.set(x + i, y, y === 5 && i === -1 ? l : c); }
  // lõi nguyên tố trên khay: lửa / nước / đất / gió
  for (let x = 23; x < 33; x++) g.set(x, 7, '#5a3a1e');
  [['#ff7a3c', '#ffd0a0'], ['#5bb8ff', '#d0ecff'], ['#d4b46e', '#f4e4b8'], ['#a6ebcb', '#eafff4']].forEach(([c, l], k) => { const x = 24 + k * 2; g.set(x, 5, l); g.set(x, 6, c); g.set(x + 1, 6, c); g.set(x + 1, 5, c); });
  return { img: g.canvas(OUT), ax: 17, ay: 16 };
}

// ---------- người bán hàng: 16×22 như nhân vật; tư thế nghỉ (thở), vẫy tay, ngắm viên ngọc ----------
const SMITH = {
  forest:  { skin: ['#4a6a2e', '#6a8a3e', '#8aaa52'], cloth: ['#3a2a1a', '#5a4024', '#7a5a34'], apron: ['#5a3818', '#7a4e24'], eye: '#ffe060', ears: true },
  dungeon: { skin: ['#9a7a62', '#b8967a', '#d4b496'], cloth: ['#2a3a3a', '#3e5656', '#567474'], apron: ['#3a2a20', '#54402e'], eye: '#1a1a20', beard: ['#c8c0b0', '#e8e0d0'], cap: ['#5a2ab0', '#9a5ae8', '#e0c8ff'] },
  frost:   { skin: ['#c49a7a', '#dcb496', '#f0ccae'], cloth: ['#b8c4d0', '#dce4ec', '#ffffff'], apron: ['#4a5a6a', '#647a8e'], eye: '#1a2a4a', beard: ['#9ac0dc', '#d0e8f8'], hood: true },
  volcano: { skin: ['#2e2428', '#463840', '#5e4a54'], cloth: ['#3a2418', '#4e3222', '#6a4630'], apron: ['#1a1214', '#2e2220'], eye: '#ffb84a', horns: true, cracks: '#ff6a1a' },
  palace:  { skin: ['#a87a1a', '#d8aa3a', '#ffd84a'], cloth: ['#c8983a', '#e8c050', '#fff0a0'], apron: ['#6a1018', '#8a1a22'], eye: '#5af0ff', halo: true, wings: true }
};
export const SMITH_POSES = ['idle0', 'idle1', 'wave0', 'wave1', 'gem0', 'gem1'];
export function smithSprite(theme, pose = 'idle0') {
  if (typeof pose === 'number') pose = pose ? 'idle1' : 'idle0';
  const S = SMITH[theme] || SMITH.forest, g = new Grid(20, 26), cx = 10, by = pose === 'idle1' ? 1 : 0, hy = 7 + by;
  if (S.wings) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) for (let y = 11 + k; y < 17 - k; y++) g.set(cx + s * (5 + k) - (s < 0 ? 1 : 0), y + by, k % 2 ? '#fff0a0' : '#ffffff');
  // chân
  for (let y = 21; y < 25; y++) { g.set(cx - 2, y, S.cloth[0]); g.set(cx - 3, y, S.cloth[0]); g.set(cx + 1, y, S.cloth[0]); g.set(cx + 2, y, S.cloth[0]); }
  for (const x of [cx - 4, cx - 3, cx - 2, cx + 1, cx + 2, cx + 3]) g.set(x, 25, '#1a1210');
  // thân + tạp dề
  for (let y = 13 + by; y < 22; y++) for (let x = cx - 4; x < cx + 4; x++) g.set(x, y, x === cx - 4 ? S.cloth[0] : x === cx + 3 ? S.cloth[0] : sh(S.cloth, 0.7 - (x - cx + 4) / 8 * 0.4, x, y));
  for (let y = 15 + by; y < 22; y++) for (let x = cx - 2; x < cx + 2; x++) g.set(x, y, y === 15 + by ? '#1a1210' : x < cx ? S.apron[1] : S.apron[0]);
  g.set(cx - 3, 14 + by, '#1a1210'); g.set(cx + 2, 14 + by, '#1a1210');                                // quai tạp dề
  if (S.cracks) { g.set(cx - 3, 17 + by, S.cracks); g.set(cx + 2, 19 + by, S.cracks); }
  // đầu 6×6
  for (let y = hy; y < hy + 6; y++) for (let x = cx - 3; x < cx + 3; x++) g.set(x, y, sh(S.skin, 0.8 - (x - cx + 3) / 6 * 0.4 - (y - hy) / 6 * 0.2, x, y));
  g.set(cx - 2, hy + 2, S.eye); g.set(cx + 1, hy + 2, S.eye); g.set(cx - 1, hy + 4, S.skin[0]); g.set(cx, hy + 4, S.skin[0]);
  if (S.ears) { g.set(cx - 4, hy + 1, S.skin[1]); g.set(cx - 5, hy, S.skin[2]); g.set(cx + 3, hy + 1, S.skin[1]); g.set(cx + 4, hy, S.skin[2]); }
  if (S.beard) { for (let y = hy + 4; y < hy + 8; y++) for (let x = cx - 3; x < cx + 3; x++) if (y < hy + 7 || Math.abs(x - cx + 0.5) < 2) g.set(x, y, (x + y) % 2 ? S.beard[0] : S.beard[1]); }
  if (S.cap) { for (let x = cx - 5; x < cx + 5; x++) { g.set(x, hy - 1, S.cap[1]); if (Math.abs(x - cx + 0.5) < 4) g.set(x, hy - 2, S.cap[1]); if (Math.abs(x - cx + 0.5) < 2.5) g.set(x, hy - 3, S.cap[0]); } g.set(cx - 3, hy - 2, S.cap[2]); g.set(cx + 2, hy - 1, S.cap[2]); }
  if (S.hood) { for (let x = cx - 4; x < cx + 4; x++) { g.set(x, hy - 1, S.cloth[1]); g.set(x, hy - 2, x === cx - 4 || x === cx + 3 ? null : S.cloth[2]); } for (let y = hy; y < hy + 5; y++) { g.set(cx - 4, y, S.cloth[1]); g.set(cx + 3, y, S.cloth[0]); } }
  if (S.horns) for (const s of [-1, 1]) { g.set(cx + (s < 0 ? -3 : 2), hy - 1, '#4a3a3a'); g.set(cx + (s < 0 ? -4 : 3), hy - 2, '#6a5a5a'); g.set(cx + (s < 0 ? -4 : 3), hy - 3, '#a89090'); }
  if (S.halo) for (let x = cx - 3; x < cx + 3; x++) g.set(x, hy - 3, x === cx - 3 || x === cx + 2 ? '#c8983a' : '#fff0a0');
  // tay theo tư thế
  const arm = S.cloth[1], hand = S.skin[1];
  if (pose.startsWith('wave')) { const up = pose === 'wave0'; g.set(cx - 5, 14 + by, arm); g.set(cx - 5, 15 + by, arm); g.set(cx - 5, 16 + by, hand); for (let k = 0; k < 4; k++) g.set(cx + 4 + (up ? 0 : k >> 1), 13 + by - k, k === 3 ? hand : arm); if (up) g.set(cx + 5, 9 + by, hand); }
  else if (pose.startsWith('gem')) { g.set(cx - 5, 14 + by, arm); g.set(cx - 5, 15 + by, arm); g.set(cx - 5, 16 + by, hand); g.set(cx + 4, 14 + by, arm); g.set(cx + 4, 13 + by, arm); g.set(cx + 3, 12 + by, hand); g.set(cx + 2, 11 + by, pose === 'gem0' ? '#5af0ff' : '#ffffff'); g.set(cx + 3, 11 + by, '#2a8aa0'); }
  else { for (const x of [cx - 5, cx + 4]) { g.set(x, 14 + by, arm); g.set(x, 15 + by, arm); g.set(x, 16 + by, arm); g.set(x, 17 + by, hand); } }   // tay chống lên quầy
  return { img: g.canvas(OUT), ax: cx + 1, ay: 26 };
}

// ---------- dấu hiệu vùng an toàn ----------
export function forgeLantern(theme) {
  const g = new Grid(7, 16), P = FORGE_PAL[theme] || FORGE_PAL.forest;
  const post = theme === 'palace' ? '#c8983a' : theme === 'frost' ? '#4a5a6a' : '#4a2e18';
  for (let y = 7; y < 15; y++) g.set(3, y, post); for (let x = 1; x < 6; x++) g.set(x, 15, post);
  for (let x = 1; x < 6; x++) { g.set(x, 1, '#1e1a22'); g.set(x, 6, '#1e1a22'); } g.set(3, 0, '#1e1a22');
  for (let y = 2; y < 6; y++) { g.set(1, y, '#1e1a22'); g.set(5, y, '#1e1a22'); for (let x = 2; x < 5; x++) g.set(x, y, y === 3 && x === 3 ? '#ffffff' : P.lamp); }
  if (theme === 'frost') for (let x = 1; x < 6; x++) g.set(x, 0, '#ffffff');
  return { img: g.canvas(OUT), ax: 4, ay: 16 };
}
export function runeStone(theme) {
  const g = new Grid(8, 11), glow = theme === 'volcano' ? '#ff8a2a' : '#5af0ff', S = theme === 'volcano' ? ['#1a1418', '#2a2026', '#3e3238'] : ['#221e30', '#342c46', '#4e4466'];
  for (let y = 1; y < 10; y++) for (let x = 1; x < 7; x++) g.set(x, y, sh(S, 0.8 - (x - 1) / 6 * 0.6, x, y)); for (let x = 2; x < 6; x++) g.set(x, 0, S[2]); for (let x = 0; x < 8; x++) g.set(x, 10, S[0]);
  for (let y = 3; y < 8; y++) g.set(4, y, glow); g.set(3, 5, glow); g.set(5, 4, glow); g.set(3, 3, glow);
  return { img: g.canvas(OUT), ax: 4, ay: 11 };
}
// đống củi (rừng/băng) hoặc thùng quặng
export function forgeStock(theme) {
  const g = new Grid(14, 10);
  if (theme === 'forest' || theme === 'frost') {
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4 - row; k++) { const x = 1 + k * 3 + row, y = 7 - row * 3; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) g.set(x + i, y + j, (i === 1 && j === 1) ? '#d4a86a' : (i + j) % 2 ? '#8a6a42' : '#6a4a2a'); }
    if (theme === 'frost') for (let x = 4; x < 10; x++) g.set(x, 0, '#ffffff');
  } else {
    const ore = theme === 'dungeon' ? '#5af0ff' : theme === 'volcano' ? '#ff8a2a' : '#ffd34a', band = theme === 'palace' ? '#ffd34a' : '#4a4a54';
    for (let y = 4; y < 10; y++) for (let x = 1; x < 11; x++) g.set(x, y, x === 1 || x === 10 ? '#3a2410' : y === 6 ? band : x % 3 === 0 ? '#6a4a26' : '#7e5430');
    for (const [x, y] of [[2, 3], [4, 2], [6, 3], [8, 2], [3, 4], [7, 4]]) { g.set(x, y, ore); g.set(x + 1, y, '#2a2430'); }
  }
  return { img: g.canvas(OUT), ax: 7, ay: 10 };
}
// sân trước: đất + đá cuội 1px, mép tan dần (dither) vào nền; hố than; sỏi + cỏ mép
const APRON = {
  forest:  { dirt: ['#4a3826', '#56422c', '#625034'], stone: ['#7a7a6a', '#9a9a86', '#3e3e34'], tuft: '#4d7a3c' },
  dungeon: { dirt: ['#221e2c', '#2a2436', '#322a3e'], stone: ['#4a4458', '#5e5670', '#1a1622'], tuft: '#2a6a7a' },
  frost:   { dirt: ['#a4bacc', '#b4c8da', '#c4d6e6'], stone: ['#7a8a9a', '#98a8b8', '#4a5a6a'], tuft: '#ffffff' },
  volcano: { dirt: ['#1e161a', '#262024', '#32282c'], stone: ['#3a3036', '#4a3e44', '#140e10'], tuft: '#a8300e' },
  palace:  { dirt: ['#8a7a66', '#9a8a72', '#aa9a80'], stone: ['#c4bcaa', '#dcd6c4', '#8a8070'], tuft: '#ffd34a' }
};
export function forgeApron(theme) {
  const A = APRON[theme] || APRON.forest, Wd = 110, Hd = 60, cx = Wd / 2, cy = 26, c = document.createElement('canvas'); c.width = Wd; c.height = Hd; const x = c.getContext('2d');
  const put = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
  for (let j = 0; j < Hd; j++) for (let i = 0; i < Wd; i++) {
    const d = Math.hypot((i - cx) / (Wd * 0.46), (j - cy) / (Hd * 0.5)) + (hash(i >> 3, j >> 3) - 0.5) * 0.3;
    if (d > 1 || (d > 0.7 && hash(i, j) < (d - 0.7) / 0.3)) continue;
    put(i, j, A.dirt[hash(i, j) < 0.3 ? 0 : hash(i + 7, j) < 0.6 ? 1 : 2]);
  }
  for (let k = 0; k < 34; k++) { const a = hash(k, 3) * Math.PI * 2, rr = Math.sqrt(hash(k, 4)) * 0.6, i = Math.round(cx + Math.cos(a) * rr * Wd * 0.46), j = Math.round(cy + Math.sin(a) * rr * Hd * 0.5), w = 2 + (k % 2), h = 1;
    for (let u = -w; u <= w; u++) for (let v = -h; v <= h; v++) put(i + u, j + v, (Math.abs(u) === w && Math.abs(v) === h) ? A.dirt[0] : Math.abs(u) === w || v === h ? A.stone[2] : v < 0 ? A.stone[1] : A.stone[0]); }
  for (let k = 0; k < 30; k++) { const a = hash(k, 7) * Math.PI * 2, rr = 0.78 + hash(k, 8) * 0.3, i = Math.round(cx + Math.cos(a) * rr * Wd * 0.46), j = Math.round(cy + Math.sin(a) * rr * Hd * 0.5); put(i, j, A.stone[2]); if (k % 2) { put(i + 2, j, A.tuft); put(i + 3, j - 1, A.tuft); put(i + 4, j, A.tuft); } }
  const pi = 20, pj = 28; for (let u = -5; u <= 5; u++) for (let v = -3; v <= 3; v++) { const q = (u * u) / 25 + (v * v) / 9; if (q > 1) continue; put(pi + u, pj + v, q > 0.6 ? A.stone[2] : hash(u + 9, v + 9) < 0.3 ? '#ffd36b' : hash(u + 3, v + 3) < 0.6 ? '#ff6a1a' : '#a8300e'); }
  return { img: c, ax: cx, ay: cy, pit: [pi - cx, pj - cy] };
}
