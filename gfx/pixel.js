// Công cụ pixel art dùng chung. Thế giới được vẽ lên một khung nhỏ: 1 pixel khung = WPP đơn vị thế giới,
// rồi phóng to theo bội số nguyên → mọi thứ (nhân vật, nền, hiệu ứng) nằm trên cùng một lưới pixel.
import { hash2 } from '../sim.js';
export { hash2 };

export const WPP = 3;                                    // đơn vị thế giới trên mỗi pixel
export const sn = v => Math.round(v / WPP) * WPP;        // bám lưới pixel

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
export function hex(h) { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
export function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, '0')).join(''); }
export const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };

// ma trận Bayer 4x4 để tô chuyển màu kiểu pixel (dither)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const dith = (x, y, t) => t * 16 > BAYER[((y & 3) << 2) | (x & 3)] + 0.5;

// sprite từng pixel: fn(x, y) trả màu hoặc null. Tự thêm viền tối 1px quanh hình.
export function pix(w, h, fn, outline = '#0c0a12') {
  const c = canvas(w + 2, h + 2), g = c.getContext('2d'), img = g.createImageData(w + 2, h + 2), d = img.data;
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = fn(x, y); if (col) cells.push(x, y, col); }
  const put = (x, y, col) => { const i = (y * (w + 2) + x) * 4, [r, gg, b] = hex(col); d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; };
  if (outline) for (let k = 0; k < cells.length; k += 3) { const x = cells[k], y = cells[k + 1]; for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) put(x + ox, y + oy, outline); }
  for (let k = 0; k < cells.length; k += 3) put(cells[k] + 1, cells[k + 1] + 1, cells[k + 2]);
  g.putImageData(img, 0, 0);
  return c;
}
// sprite từ chuỗi ký tự + bảng màu (nhân vật, quái)
export function fromRows(rows, pal) { return pix(rows[0].length, rows.length, (x, y) => { const ch = rows[y][x]; return ch === '.' ? null : (pal[ch] || '#ff00ff'); }); }
export function tintOf(c, col) { const w = canvas(c.width, c.height), g = w.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.65; g.fillStyle = col; g.fillRect(0, 0, w.width, w.height); return w; }
export function whiteOf(c) { const w = canvas(c.width, c.height), g = w.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w.width, w.height); return w; }

// tô theo bảng màu tối→sáng với dither giữa các bậc
export const shade = (pal, v, x, y) => { const t = Math.max(0, Math.min(0.999, v)) * (pal.length - 1), b = Math.floor(t); return pal[Math.min(pal.length - 1, b + (dith(x, y, t - b) ? 1 : 0))]; };

// lưới pixel để dựng sprite bằng các hình cơ bản (khung xương nhân vật, boss)
export class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; }
  rect(x, y, w, h, c) { x = Math.round(x); y = Math.round(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, typeof c === 'function' ? c(i, j, x + i, y + j) : c); }
  ell(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'function' ? c(dx, dy, x, y) : c);
    }
  }
  line(x0, y0, x1, y1, c, th = 1) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (th <= 1) this.set(x, y, typeof c === 'function' ? c(i / n) : c); else this.rect(x - (th >> 1), y - (th >> 1), th, th, typeof c === 'function' ? c(i / n) : c); }
  }
  canvas(outline = '#0c0a12') { return pix(this.w, this.h, (x, y) => this.d[y * this.w + x], outline); }
}

// nhiễu mượt theo lưới (dùng cho lối đi, mảng nền)
export function smooth(x, y, seed, scale) {
  const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const s = t => t * t * (3 - 2 * t), a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * s(tx) + (c - a) * s(ty) + (a - b - c + d) * s(tx) * s(ty);
}
