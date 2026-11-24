// Ánh sáng: phủ một lớp tối theo vùng, khoét các vùng sáng (đuốc, đèn, phép, đạn) với vành sáng chia bậc kiểu retro,
// rồi cộng thêm quầng màu ấm. Lớp sáng vẽ ở nửa độ phân giải khung pixel → mép sáng thô như game pixel.
import { WPP, canvas, rgba } from './pixel.js';

// ảnh mẫu (64px): lỗ sáng chia bậc và quầng màu; vẽ lại bằng drawImage + globalAlpha (tương đương nhân alpha các điểm dừng)
let HOLE = null; const GLOW = new Map();
function hole() {
  if (HOLE) return HOLE; const n = 64, c = canvas(n, n), g = c.getContext('2d'), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.42, 'rgba(0,0,0,0.92)'); gr.addColorStop(0.43, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.72, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.73, 'rgba(0,0,0,0.24)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, n, n); return (HOLE = c);
}
function glow(col) {
  let c = GLOW.get(col); if (c) return c; const n = 64; c = canvas(n, n); const g = c.getContext('2d'), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.5, rgba(col, 0.45)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, n, n); GLOW.set(col, c); return c;
}
export class Lighting {
  constructor() { this.c = canvas(2, 2); this.g = this.c.getContext('2d'); }
  // bctx: ngữ cảnh khung pixel (chưa biến đổi). view: {ox, oy, w, h} theo đơn vị thế giới.
  render(bctx, view, dark, amb, lights, low) {
    if (amb <= 0.01) return;
    const S = WPP * 2, W = Math.ceil(view.w / S) + 1, H = Math.ceil(view.h / S) + 1;
    if (this.c.width !== W || this.c.height !== H) { this.c.width = W; this.c.height = H; }
    const g = this.g;
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.fillStyle = rgba(dark, amb); g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const x = (L.x - view.ox) / S, y = (L.y - view.oy) / S, R = L.r / S, i = Math.min(1, L.i ?? 1);
      if (x < -R || y < -R || x > W + R || y > H + R || R < 1) continue;
      g.globalAlpha = i; g.drawImage(hole(), x - R, y - R, R * 2, R * 2);
    }
    g.globalAlpha = 1;
    bctx.save(); bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.imageSmoothingEnabled = false;
    bctx.drawImage(this.c, 0, 0, W * 2, H * 2);
    // quầng màu cộng thêm (bỏ qua ở chế độ đồ hoạ thấp)
    if (low) { bctx.restore(); return; }
    bctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.c) continue;
      const x = (L.x - view.ox) / WPP, y = (L.y - view.oy) / WPP, R = L.r / WPP * 0.6, a = (L.glow ?? 0.16) * Math.min(1, L.i ?? 1);
      if (x < -R || y < -R || x > view.w / WPP + R || y > view.h / WPP + R || R < 1) continue;
      bctx.globalAlpha = a; bctx.drawImage(glow(L.c), x - R, y - R, R * 2, R * 2);
    }
    bctx.restore();
  }
}
