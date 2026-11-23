// Nét vẽ pixel cơ bản (ô vuông bám lưới, không gradient). Chỉ là "bút", không phải hiệu ứng: mỗi dòng skin tự dựng hình riêng từ đây.
import { WPP, sn } from './pixel.js';
export { WPP, sn };
export const H = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const sq = (ctx, x, y, s, c) => { const z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.fillRect(sn(x - z / 2), sn(y - z / 2), z, z); };
export function line(ctx, x1, y1, x2, y2, s, c, step = WPP * 2) { const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L / step)); for (let i = 0; i <= n; i++) sq(ctx, x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, s, c); }
export function poly(ctx, pts, s, c) { for (let i = 0; i + 1 < pts.length; i++) line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], s, c, WPP); }
export function disc(ctx, x, y, r, c, sy = 0.85) { ctx.fillStyle = c; const X = sn(x), Y = sn(y); for (let dy = -r; dy <= r; dy += WPP) { const w = sn(Math.sqrt(Math.max(0, r * r - dy * dy))); if (w > 0) ctx.fillRect(X - w, Y + sn(dy * sy), w * 2, WPP); } }
// tam giác đặc (quét hàng) — cho lưỡi, gai, mảnh vỡ
export function tri(ctx, a, b, c2, col) {
  const P = [a, b, c2]; ctx.fillStyle = col; const y0 = Math.min(a[1], b[1], c2[1]), y1 = Math.max(a[1], b[1], c2[1]);
  for (let y = sn(y0); y <= y1; y += WPP) {   // giao hàng quét với từng cạnh không nằm ngang (tránh chia cho 0 → vạch dài)
    let l = Infinity, r = -Infinity;
    for (let i = 0; i < 3; i++) { const p = P[i], q = P[(i + 1) % 3], lo = Math.min(p[1], q[1]), hi = Math.max(p[1], q[1]); if (y < lo || y > hi) continue; const x = hi - lo < 1e-6 ? null : p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]); for (const v of x === null ? [p[0], q[0]] : [x]) { l = Math.min(l, v); r = Math.max(r, v); } }
    if (r >= l) ctx.fillRect(sn(l), y, Math.max(WPP, sn(r) - sn(l)), WPP);
  }
}
// tia sét gấp khúc
export function zig(ctx, x1, y1, x2, y2, seed, c1, c2, w = 2, n = 7, amp = 26) { let px = x1, py = y1; for (let i = 1; i <= n; i++) { const k = i / n, nx = -(y2 - y1), ny = x2 - x1, L = Math.hypot(nx, ny) || 1, j = i < n ? (H(i, seed) - 0.5) * amp : 0, x = x1 + (x2 - x1) * k + nx / L * j, y = y1 + (y2 - y1) * k + ny / L * j; line(ctx, px, py, x, y, WPP * w, c1, WPP); if (c2) line(ctx, px, py, x, y, WPP, c2, WPP); px = x; py = y; } }
