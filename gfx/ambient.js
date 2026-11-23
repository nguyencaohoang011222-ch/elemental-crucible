// Hạt trôi trong không khí theo vùng: phấn hoa/đom đóm (rừng), tuyết (núi băng), bụi (ngục), cánh hoa (cung điện).
// Số hạt cố định, tạo một lần và dùng lại; quấn quanh khung nhìn nên không bao giờ hết hạt.
import { WPP, sn } from './pixel.js';

const N = 70;
export class Ambient {
  constructor() { this.kind = null; this.p = []; }
  reset(kind) {
    this.kind = kind; this.p = [];
    for (let i = 0; i < N; i++) this.p.push({ u: Math.random(), v: Math.random(), ph: Math.random() * 6.28, sp: 0.5 + Math.random(), fly: Math.random() < (kind === 'pollen' ? 0.25 : 0) });
  }
  update(dt, t, kind) {
    if (kind !== this.kind) this.reset(kind);
    for (const q of this.p) {
      if (kind === 'snow') { q.v += dt * 0.07 * q.sp; q.u += Math.sin(t * 0.8 + q.ph) * dt * 0.012; }
      else if (kind === 'petals') { q.v += dt * 0.035 * q.sp; q.u += dt * 0.025 * q.sp + Math.sin(t + q.ph) * dt * 0.01; }
      else if (kind === 'ash') { q.v += dt * 0.02 * q.sp; q.u += Math.sin(t * 0.5 + q.ph) * dt * 0.01; }
      else if (kind === 'dust') { q.v -= dt * 0.006 * q.sp; q.u += Math.sin(t * 0.3 + q.ph) * dt * 0.004; }
      else { q.v -= dt * 0.01 * q.sp; q.u += Math.sin(t * 0.6 + q.ph) * dt * 0.01; }
      q.u -= Math.floor(q.u); q.v -= Math.floor(q.v);
    }
  }
  // vẽ trong toạ độ thế giới; trả danh sách nguồn sáng nhỏ (đom đóm)
  draw(ctx, view, t, lights) {
    const k = this.kind, W = view.w, H = view.h;
    for (const q of this.p) {
      const x = sn(view.ox + q.u * W), y = sn(view.oy + q.v * H);
      if (k === 'snow') { ctx.fillStyle = q.sp > 1.1 ? '#ffffff' : '#dfeaf2'; ctx.fillRect(x, y, WPP * (q.sp > 1.3 ? 2 : 1), WPP); }
      else if (k === 'petals') { ctx.fillStyle = q.sp > 1 ? '#ffb8d4' : '#ff8ab0'; ctx.fillRect(x, y, WPP * 2, WPP); }
      else if (k === 'ash') { if (q.sp > 1.25) { ctx.fillStyle = '#ff8a3c'; ctx.fillRect(x, sn(view.oy + (1 - q.v) * H), WPP, WPP); } else { ctx.fillStyle = '#8a7a74'; ctx.fillRect(x, y, WPP, WPP); } }
      else if (k === 'dust') { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 2 + q.ph); ctx.fillStyle = '#c8c4b8'; ctx.fillRect(x, y, WPP, WPP); ctx.globalAlpha = 1; }
      else if (q.fly) { const on = Math.sin(t * 2.2 + q.ph) > 0.2; if (on) { ctx.fillStyle = '#e8ff8a'; ctx.fillRect(x, y, WPP, WPP); lights.push({ x, y, r: 36, i: 0.6, c: '#d8ff6a', glow: 0.25 }); } }
      else { ctx.globalAlpha = 0.6; ctx.fillStyle = '#f2eaa8'; ctx.fillRect(x, y, WPP, WPP); ctx.globalAlpha = 1; }
    }
  }
}
