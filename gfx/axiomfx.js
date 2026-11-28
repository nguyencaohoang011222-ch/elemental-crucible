// Hiệu ứng của Axiom: mặt cắt chờ nổ, cú Gập, Đàn Khối bay quanh, bóng né gương, vòng báo nhịp.
import { Grid, sn, WPP } from './pixel.js';
import { AX } from '../axiom.js';

let cube = null;
function cubeImg() {
  if (cube) return cube;
  const g = new Grid(5, 5);
  g.rect(0, 1, 4, 4, () => '#5a6ab0'); g.rect(1, 0, 4, 1, () => '#eef4ff'); g.rect(4, 1, 1, 3, () => '#3a4684'); g.rect(0, 1, 4, 1, () => '#c4d4ff'); g.rect(1, 2, 2, 2, () => '#8a9ee0');
  return (cube = g.canvas('#0c0a18'));
}
const drawCube = (c, x, y, s = 1) => { const i = cubeImg(), w = i.width * WPP * s, h = i.height * WPP * s; c.drawImage(i, sn(x - w / 2), sn(y - h / 2), w, h); };
const seg = (c, w, col, lw, a) => { c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(w.x1, w.y1); c.lineTo(w.x2, w.y2); c.stroke(); };

export function axiomEvent(R, e) {
  const fx = R.axFx || (R.axFx = []);
  if (e.ev === 'axFold') fx.push({ type: 'fold', planes: e.planes, box: e.box, t: 0.45, T: 0.45 });
  else if (e.ev === 'axDodge') fx.push({ type: 'ghost', x: e.x, y: e.y, face: e.face, t: e.t, T: e.t });
  else if (e.ev === 'axBlock' || e.ev === 'axCube') fx.push({ type: 'pop', x: e.x, y: e.y - 8, t: 0.3, T: 0.3 });
}

// vẽ dưới nhân vật: mặt cắt và bóng giả
export function axiomUnder(R, c, sim, dt, ghostFrame) {
  const p = sim.p, A = p.ax, fx = R.axFx || [];
  if (A) {
    const n = A.planes.length, charging = A.foldT > 0;
    for (const w of A.planes) { const a = Math.min(1, w.t); seg(c, w, '#7a5ae0', charging ? 14 : 9, 0.28 * a); seg(c, w, '#eef4ff', charging ? 4 : 2, (charging ? 1 : 0.75) * a); }
    if (n >= AX.PLANE_MAX) { c.globalAlpha = 0.5; c.strokeStyle = '#ffe27a'; c.lineWidth = 2; c.beginPath(); for (const w of A.planes) c.rect(sn(w.x2) - 6, sn(w.y2) - 6, 12, 12); c.stroke(); }
  }
  for (const f of fx) if (f.type === 'ghost' && ghostFrame) {
    c.save(); c.globalAlpha = 0.55 * Math.min(1, f.t * 2); c.translate(sn(f.x), sn(f.y)); c.scale(f.face || 1, 1); c.drawImage(ghostFrame.img, ghostFrame.X, ghostFrame.Y, ghostFrame.W, ghostFrame.H); c.restore();
  }
  c.globalAlpha = 1;
}

// vẽ trên nhân vật: đàn khối, cú nổ, vòng báo nhịp
export function axiomOver(R, c, sim, t, dt) {
  const p = sim.p, A = p.ax; let fx = R.axFx || [];
  if (A) {
    for (let i = 0; i < A.cubes; i++) { const a = t * 2.2 + i * Math.PI * 2 / A.cubes; drawCube(c, p.x + Math.cos(a) * 50, p.y - 10 + Math.sin(a) * 24 - (p.z || 0), 0.67); }
    if (p.charge >= 1 && A.fullT <= AX.WINDOW) { c.strokeStyle = '#ffffff'; c.lineWidth = 4; const s = 28 + 60 * (A.fullT / AX.WINDOW); c.beginPath(); c.rect(sn(p.x - s), sn(p.y - 14 - s), s * 2, s * 2); c.stroke(); }
  }
  for (const f of fx) {
    f.t -= dt; const k = Math.max(0, f.t / f.T);
    if (f.type === 'fold') {
      for (const w of f.planes) { seg(c, w, '#9d6aff', 34 * k, 0.55 * k); seg(c, w, '#ffffff', 10 * k, k); }
      c.globalAlpha = k; for (const w of f.planes) for (let i = 1; i <= 5; i++) { const q = i / 6, off = (1 - k) * (i % 2 ? 46 : -46), nx = -(w.y2 - w.y1) / AX.PLANE_LEN, ny = (w.x2 - w.x1) / AX.PLANE_LEN; drawCube(c, w.x1 + (w.x2 - w.x1) * q + nx * off, w.y1 + (w.y2 - w.y1) * q + ny * off, (f.box ? 1.6 : 1) * (0.5 + k)); }
    } else if (f.type === 'pop') { c.globalAlpha = k; c.strokeStyle = '#c4d4ff'; c.lineWidth = 3; const s = 6 + 22 * (1 - k); c.beginPath(); c.rect(sn(f.x - s), sn(f.y - s), s * 2, s * 2); c.stroke(); }
  }
  c.globalAlpha = 1; R.axFx = fx.filter(f => f.t > 0);
}
