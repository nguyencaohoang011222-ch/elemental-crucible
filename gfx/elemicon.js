// Biểu tượng nguyên tố 24×24 (tô cel 4 bậc, viền tối) — hiển thị phóng to ×2–×3 bằng image-rendering: pixelated.
import { Grid } from './pixel.js';
const pip = (pts, x, y) => { let i = false; for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) { const [xa, ya] = pts[a], [xb, yb] = pts[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) i = !i; } return i; };
const poly = (g, pts, c) => { for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (pip(pts, x + 0.5, y + 0.5)) g.set(x, y, typeof c === 'function' ? c(x, y) : c); };
const cache = new Map();
const DRAW = {
  FIRE(g) {
    poly(g, [[12, 0.5], [16, 6], [19.5, 11], [20, 17], [16.5, 22.5], [7.5, 22.5], [4, 17], [4.5, 11.5], [8, 8], [9, 12], [10.5, 5]], (x, y) => x < 10 ? '#c2410c' : '#ea580c');
    poly(g, [[12, 6], [15.5, 12], [17, 17], [14.5, 22], [9.5, 22], [7, 17], [8.5, 12], [10.5, 14]], (x, y) => x < 11 ? '#f97316' : '#fb923c');
    poly(g, [[12, 11], [15, 16.500], [14, 21], [10, 21], [9, 16.500]], '#fbbf24');
    poly(g, [[12, 15], [13.500, 18.500], [12, 20.500], [10.500, 18.500]], '#fff7d6');
  },
  WATER(g) {
    poly(g, [[12, 1], [17, 9], [19.500, 14.500], [18, 20], [12, 22.500], [6, 20], [4.500, 14.500], [7, 9]], (x, y) => x < 10 ? '#0284c7' : x > 15 ? '#0369a1' : '#0ea5e9');
    poly(g, [[12, 5], [15.500, 11], [17, 15], [12, 19.500], [8.500, 15]], (x, y) => x < 11 ? '#38bdf8' : '#7dd3fc');
    for (let x = 6; x < 19; x++) { const y = 15 + (((x >> 1) & 1) ? 0 : 1); if (g.get(x, y)) g.set(x, y, '#e0f7ff'); if (g.get(x, y + 3) && x % 3) g.set(x, y + 3, '#bae6fd'); }
    g.rect(8, 8, 2, 4, '#ffffff'); g.set(8, 13, '#ffffff');
  },
  EARTH(g) {
    poly(g, [[3, 11], [8, 15], [8.500, 22.500], [1.500, 22.500]], x => x < 5 ? '#4d7c0f' : '#65a30d');
    poly(g, [[21, 12.500], [22.500, 22.500], [15.500, 22.500], [15.500, 16.500]], x => x < 19 ? '#65a30d' : '#4d7c0f');
    poly(g, [[12, 1], [16.500, 9], [17, 22.500], [7, 22.500], [7.500, 9]], x => x < 10 ? '#65a30d' : x < 13 ? '#84cc16' : '#4d7c0f');
    poly(g, [[12, 3.500], [12.500, 22], [9.500, 22], [9, 9]], '#a3e635');
    g.line(12, 4, 12, 21, '#d9f99d');
    for (const [x, y] of [[13, 16], [10, 18], [14, 12]]) g.set(x, y, '#365314');
    g.rect(4, 17, 2, 1, '#a3e635');
  },
  WIND(g) {
    const arm = (a0, r0, r1, c, th) => { let px = null; for (let t = 0; t <= 1.001; t += 0.02) { const a = a0 + t * 4.4, r = r0 + (r1 - r0) * t, x = 12 + Math.cos(a) * r, y = 12 + Math.sin(a) * r * 0.92; if (px) g.line(px[0], px[1], x, y, c, th); px = [x, y]; } };
    arm(0.4, 9.500, 1.500, '#0f766e', 3); arm(0.4, 9.500, 1.500, '#14b8a6', 2); arm(0.4, 9.500, 2, '#99f6e4', 1);
    arm(3.5, 8, 2, '#14b8a6', 2); arm(3.5, 8, 2.500, '#5eead4', 1);
    g.line(19, 6, 22, 5, '#2dd4bf', 2); g.line(2, 17, 5, 19, '#2dd4bf', 2); g.set(12, 12, '#ffffff'); g.set(13, 12, '#ccfbf1');
  }
};
export function elemEmblem(el) {
  if (cache.has(el)) return cache.get(el);
  const g = new Grid(24, 24); DRAW[el](g); const c = g.canvas('#141013'); cache.set(el, c); return c;
}
