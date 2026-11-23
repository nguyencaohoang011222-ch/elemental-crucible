// Nền theo vùng: mỗi chunk (12x12 ô) được vẽ MỘT LẦN thành ảnh 192x192 pixel rồi dùng lại mỗi khung hình.
// Ô 16px. Có 3 loại ô: nền, lối đi (có viền chuyển tiếp), mảng nền khác. Kèm danh sách cụm cỏ để vẽ lay động.
import { TILE, CHUNK } from '../sim.js';
import { WPP, canvas, hash2, smooth, mix } from './pixel.js';
import { tileType as envTileType, isLava } from '../env.js';

export const TP = TILE / WPP, CP = CHUNK * TP; // 16px mỗi ô, 192px mỗi chunk
const PATH = 1, PATCH = 2;

export function tileType(tx, ty, seed) { return envTileType(tx, ty, seed); }
function _oldTileType(tx, ty, seed) {
  // lối đi = đường đồng mức của nhiễu; chia cho độ dốc để bề rộng luôn ~1–2 ô và không đứt đoạn
  const line = (sd, sc, w) => { const f = (x, y) => smooth(x, y, seed + sd, sc), n = f(tx, ty), gx = f(tx + 1, ty) - f(tx - 1, ty), gy = f(tx, ty + 1) - f(tx, ty - 1); return Math.abs(n - 0.5) < Math.hypot(gx, gy) * 0.5 * w; };
  if (line(101, 11, 0.75) || line(303, 19, 1.1)) return PATH;
  return smooth(tx, ty, seed + 202, 6) > 0.64 ? PATCH : 0;
}

// sinh số giả ngẫu nhiên theo ô: R(k) cho cùng ô luôn ra cùng kết quả
const rnd = (tx, ty, seed) => { let k = 0; return () => hash2(tx * 7 + (k++), ty * 13 - k * 3, seed); };

const PAINT = {
  forest(g, T, x, y, type, r) {
    if (type === PATH) {
      g.fillStyle = T.path[r() < 0.5 ? 0 : 1]; g.fillRect(x, y, TP, TP);
      for (let i = 0; i < 5; i++) { g.fillStyle = r() < 0.5 ? T.pathD : T.pathL; g.fillRect(x + (r() * 15 | 0), y + (r() * 15 | 0), 1, 1); }
      if (r() < 0.3) { const px = x + 2 + (r() * 11 | 0), py = y + 2 + (r() * 11 | 0); g.fillStyle = T.pebble; g.fillRect(px, py, 2, 2); g.fillStyle = mix(T.pebble, '#ffffff', 0.35); g.fillRect(px, py, 1, 1); }
      return;
    }
    const pal = type === PATCH ? T.patch : T.base;
    g.fillStyle = pal[0]; g.fillRect(x, y, TP, TP);
    const n = type === PATCH ? 9 : 6;
    for (let i = 0; i < n; i++) { const bx = x + (r() * 15 | 0), by = y + 1 + (r() * 14 | 0); g.fillStyle = type === PATCH ? T.patchD : T.baseD; g.fillRect(bx, by, 1, 2); if (r() < 0.5) { g.fillStyle = T.baseL; g.fillRect(bx + 1, by - 1, 1, 1); } }
    if (type !== PATCH && r() < 0.09) { const fx = x + 3 + (r() * 9 | 0), fy = y + 3 + (r() * 9 | 0), c = T.flowers[(r() * T.flowers.length) | 0]; g.fillStyle = c; g.fillRect(fx - 1, fy, 3, 1); g.fillRect(fx, fy - 1, 1, 3); g.fillStyle = '#f7d24a'; g.fillRect(fx, fy, 1, 1); }
    if (r() < 0.04) { g.fillStyle = T.pebble; g.fillRect(x + (r() * 13 | 0), y + (r() * 13 | 0), 2, 1); }
  },
  frost(g, T, x, y, type, r) {
    if (type === PATCH) { // mặt băng
      g.fillStyle = T.patch[0]; g.fillRect(x, y, TP, TP);
      g.fillStyle = mix(T.patch[0], '#ffffff', 0.55); const o = (r() * 10) | 0; for (let i = 0; i < 4; i++) g.fillRect(x + o + i, y + 3 + i, 1, 1);
      if (r() < 0.4) { g.fillStyle = T.patchD; const cx = x + (r() * 12 | 0), cy = y + (r() * 12 | 0); for (let i = 0; i < 4; i++) g.fillRect(cx + i, cy + (i & 1), 1, 1); }
      return;
    }
    if (type === PATH) { // đá cuội phủ tuyết nén
      g.fillStyle = T.pathD; g.fillRect(x, y, TP, TP);
      for (const [sx, sy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { const ox = (r() * 2) | 0; g.fillStyle = T.path[(r() * 2) | 0]; g.fillRect(x + sx + ox, y + sy + 1, 7 - ox, 6); g.fillStyle = T.pathL; g.fillRect(x + sx + ox, y + sy + 1, 7 - ox, 1); }
      return;
    }
    g.fillStyle = T.base[0]; g.fillRect(x, y, TP, TP);
    for (let i = 0; i < 4; i++) { g.fillStyle = T.baseD; g.fillRect(x + (r() * 15 | 0), y + (r() * 15 | 0), 2, 1); }
    if (r() < 0.35) { g.fillStyle = T.baseL; g.fillRect(x + (r() * 15 | 0), y + (r() * 15 | 0), 1, 1); }
  },
  dungeon(g, T, x, y, type, r) {
    if (type === PATH) { // gạch nhỏ mòn
      g.fillStyle = T.pathD; g.fillRect(x, y, TP, TP);
      for (const [sx, sy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { g.fillStyle = T.path[(r() * 2) | 0]; g.fillRect(x + sx, y + sy, 7, 7); g.fillStyle = T.pathL; g.fillRect(x + sx, y + sy, 7, 1); }
      return;
    }
    const pal = type === PATCH ? T.patch : T.base;
    g.fillStyle = T.baseD; g.fillRect(x, y, TP, TP);
    g.fillStyle = pal[(r() * pal.length) | 0]; g.fillRect(x, y, TP - 1, TP - 1);
    g.fillStyle = T.baseL; g.fillRect(x, y, TP - 1, 1); g.fillRect(x, y, 1, TP - 1);
    if (r() < 0.18) { g.fillStyle = T.baseD; let cx = x + 3 + (r() * 8 | 0), cy = y + 3 + (r() * 6 | 0); for (let i = 0; i < 6; i++) { g.fillRect(cx, cy, 1, 1); cx += r() < 0.5 ? 1 : 0; cy += 1; } }
    if (type === PATCH) for (let i = 0; i < 7; i++) { g.fillStyle = r() < 0.5 ? '#4d6b44' : '#3f5a3a'; g.fillRect(x + (r() * 14 | 0), y + (r() * 14 | 0), 2, 1); }
    if (r() < 0.03) { const bx = x + 4 + (r() * 6 | 0), by = y + 5 + (r() * 6 | 0); g.fillStyle = '#d8d0c0'; g.fillRect(bx, by, 3, 2); g.fillStyle = '#1a1a20'; g.fillRect(bx, by, 1, 1); g.fillRect(bx + 2, by, 1, 1); }
  },
  volcano(g, T, x, y, type, r, tx, ty, seed) {
    if (type === PATCH && !isLava(tx, ty, seed)) { g.fillStyle = '#3a2a26'; g.fillRect(x, y, TP, TP); for (let i = 0; i < 6; i++) { g.fillStyle = r() < 0.5 ? '#4a3632' : '#2a1e1c'; g.fillRect(x + (r() * 14 | 0), y + (r() * 14 | 0), 2, 2); } return; }
    if (type === PATCH) { // nham thạch
      g.fillStyle = T.patch[0]; g.fillRect(x, y, TP, TP);
      for (let i = 0; i < 5; i++) { g.fillStyle = r() < 0.5 ? '#ff8a2a' : '#ffb84a'; g.fillRect(x + (r() * 13 | 0), y + (r() * 13 | 0), 3, 2); }
      g.fillStyle = T.patchD; g.fillRect(x + (r() * 12 | 0), y + (r() * 12 | 0), 4, 1);
      return;
    }
    if (type === PATH) { g.fillStyle = T.pathD; g.fillRect(x, y, TP, TP); for (const [sx, sy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) { g.fillStyle = T.path[(r() * 2) | 0]; g.fillRect(x + sx, y + sy + 1, 7, 6); g.fillStyle = T.pathL; g.fillRect(x + sx, y + sy + 1, 7, 1); } return; }
    g.fillStyle = T.base[0]; g.fillRect(x, y, TP, TP);
    for (let i = 0; i < 5; i++) { g.fillStyle = r() < 0.5 ? T.baseD : T.baseL; g.fillRect(x + (r() * 15 | 0), y + (r() * 15 | 0), 2, 1); }
    if (r() < 0.22) { g.fillStyle = '#7a2010'; let cx = x + 2 + (r() * 10 | 0), cy = y + 2 + (r() * 10 | 0); for (let i = 0; i < 5; i++) { g.fillRect(cx, cy, 1, 1); cx += r() < 0.5 ? 1 : 0; cy += 1; } g.fillStyle = '#ff5a1a'; g.fillRect(cx, cy, 1, 1); }
  },
  palace(g, T, x, y, type, r, tx, ty) {
    if (type === PATH) { // thảm đỏ
      g.fillStyle = T.path[(tx + ty) & 1]; g.fillRect(x, y, TP, TP);
      g.fillStyle = T.pathL; if (((tx + ty) & 1) === 0) { g.fillRect(x + 7, y + 5, 2, 6); g.fillRect(x + 5, y + 7, 6, 2); }
      return;
    }
    if (type === PATCH) { // sân lát đá
      g.fillStyle = T.patchD; g.fillRect(x, y, TP, TP);
      g.fillStyle = T.patch[(r() * 2) | 0]; g.fillRect(x, y, TP - 1, TP - 1); g.fillStyle = mix(T.patch[0], '#ffffff', 0.18); g.fillRect(x, y, TP - 1, 1);
      return;
    }
    for (let k = 0; k < 4; k++) { // ván gỗ ngang, 4px mỗi tấm
      g.fillStyle = T.base[(hash2(tx, ty * 4 + k, 77) * 3) | 0]; g.fillRect(x, y + k * 4, TP, 4);
      g.fillStyle = T.baseD; g.fillRect(x, y + k * 4 + 3, TP, 1);
      const sx = (hash2(tx, ty * 4 + k, 91) * TP) | 0; g.fillRect(x + sx, y + k * 4, 1, 3);
      if (r() < 0.5) { g.fillStyle = T.baseL; g.fillRect(x + (r() * 14 | 0), y + k * 4 + 1, 2, 1); }
    }
  }
};

// viền chuyển tiếp quanh lối đi (cỏ phủ lấn, tuyết lấn, viền vàng của thảm…)
function edges(g, T, theme, x, y, side, r) {
  for (let i = 0; i < TP; i++) {
    let depth = theme === 'palace' ? 2 : theme === 'dungeon' || theme === 'volcano' ? 1 : 1 + (r() < 0.5 ? 1 : 0) + (r() < 0.2 ? 1 : 0);
    for (let d = 0; d < depth; d++) {
      const px = side === 0 ? x + i : side === 1 ? x + TP - 1 - d : side === 2 ? x + i : x + d;
      const py = side === 0 ? y + d : side === 1 ? y + i : side === 2 ? y + TP - 1 - d : y + i;
      g.fillStyle = theme === 'palace' ? (d === 0 ? '#3a120e' : '#d8b04a') : theme === 'dungeon' ? T.baseD : theme === 'volcano' ? '#7a2010' : theme === 'frost' ? T.base[0] : (d === depth - 1 ? T.baseD : T.base[0]);
      g.fillRect(px, py, 1, 1);
    }
  }
}

function softEdge(g, T, x, y, side, r) {
  g.fillStyle = T.base[0];
  for (let i = 0; i < TP; i++) { const d = (r() < 0.45 ? 1 : 0) + (r() < 0.15 ? 1 : 0); for (let k = 0; k < d; k++) { const px = side === 0 || side === 2 ? x + i : side === 1 ? x + TP - 1 - k : x + k, py = side === 1 || side === 3 ? y + i : side === 0 ? y + k : y + TP - 1 - k; g.fillRect(px, py, 1, 1); } }
}

export class Ground {
  constructor() { this.cache = new Map(); }
  get(cx, cy, seed, theme, T) {
    const key = theme + ':' + cx + ',' + cy; let c = this.cache.get(key);
    if (c) { this.cache.delete(key); this.cache.set(key, c); return c; } // LRU
    c = this.build(cx, cy, seed, theme, T); this.cache.set(key, c);
    if (this.cache.size > 90) this.cache.delete(this.cache.keys().next().value);
    return c;
  }
  build(cx, cy, seed, theme, T) {
    const img = canvas(CP, CP), g = img.getContext('2d'), tx0 = cx * CHUNK, ty0 = cy * CHUNK;
    const type = (tx, ty) => tileType(tx, ty, seed), tufts = [], lava = [];
    for (let j = 0; j < CHUNK; j++) for (let i = 0; i < CHUNK; i++) {
      const tx = tx0 + i, ty = ty0 + j, t = type(tx, ty), r = rnd(tx, ty, seed);
      PAINT[theme](g, T, i * TP, j * TP, t, r, tx, ty, seed);
      if (t === PATCH && theme === 'volcano' && isLava(tx, ty, seed)) lava.push([(tx + 0.5) * TILE, (ty + 0.5) * TILE]);
      if (t === PATH) [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([ox, oy], side) => { if (type(tx + ox, ty + oy) !== PATH) edges(g, T, theme, i * TP, j * TP, side, r); });
      else {
        if (t === PATCH && (theme === 'forest' || theme === 'frost')) [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([ox, oy], side) => { if (type(tx + ox, ty + oy) === 0) softEdge(g, T, i * TP, j * TP, side, r); });
      }
      if (t !== PATH && T.tuftN && r() < T.tuftN / 144 * (t === PATCH ? 1.6 : 1)) tufts.push({ x: (tx + 0.2 + r() * 0.6) * TILE, y: (ty + 0.3 + r() * 0.6) * TILE, s: (r() * 4) | 0, c: (r() * 3) | 0, ph: r() * 6.28 });
    }
    return { img, tufts, lava, x: tx0 * TILE, y: ty0 * TILE };
  }
}
