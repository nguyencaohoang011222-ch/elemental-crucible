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
  else if (e.ev === 'axSwap') fx.push({ type: 'swap', x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0.45, T: 0.45 });
  else if (e.ev === 'axConfuse') fx.push({ type: 'wave', x: e.x, y: e.y, r: e.r, t: 0.55, T: 0.55 });
  else if (e.ev === 'axShatter') startShatter(R, e);
  else if (e.ev === 'axBlock' || e.ev === 'axCube' || e.ev === 'axClash' || e.ev === 'axMark') fx.push({ type: 'pop', x: e.x, y: e.y - 8, t: 0.3, T: 0.3 });
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
    } else if (f.type === 'swap') {
      c.globalAlpha = k; for (const [x, y] of [[f.x1, f.y1], [f.x2, f.y2]]) { const s = 14 + 40 * (1 - k); c.strokeStyle = '#c9a8ff'; c.lineWidth = 4; c.beginPath(); c.rect(sn(x - s), sn(y - 14 - s), s * 2, s * 2); c.rect(sn(x - s * 0.55), sn(y - 14 - s * 0.55), s * 1.1, s * 1.1); c.stroke(); for (let i = 0; i < 4; i++) drawCube(c, x + Math.cos(i * 1.57 + f.t * 12) * s, y - 14 + Math.sin(i * 1.57 + f.t * 12) * s, 0.8 * k + 0.2); }
      seg(c, f, '#9d6aff', 10 * k, 0.5 * k);
    } else if (f.type === 'wave') { c.globalAlpha = 0.8 * k; c.strokeStyle = '#a27ae0'; c.lineWidth = 8; const s = f.r * (1 - k * k); c.beginPath(); c.rect(sn(f.x - s), sn(f.y - s * 0.6), s * 2, s * 1.2); c.stroke();
    } else if (f.type === 'pop') { c.globalAlpha = k; c.strokeStyle = '#c4d4ff'; c.lineWidth = 3; const s = 6 + 22 * (1 - k); c.beginPath(); c.rect(sn(f.x - s), sn(f.y - s), s * 2, s * 2); c.stroke(); }
  }
  // địch đang nhiễu: khối tím xoay trên đầu
  for (const e of sim.enemies) if (e.confuse > 0 && !e.dead) for (let i = 0; i < 2; i++) { const a = t * 7 + i * Math.PI; c.globalAlpha = 1; c.fillStyle = i ? '#ffffff' : '#c07aff'; c.fillRect(sn(e.x + Math.cos(a) * 16) - 4, sn(e.y - e.r - 30 + Math.sin(a) * 6) - 4, 9, 9); }
  if (A) {
    // thanh Ảo dưới chân: đầy thì sáng vàng (còn mạng dự phòng)
    const full = A.illusion >= AX.ILL, bx = sn(p.x) - 27, by = sn(p.y) + 21;
    c.globalAlpha = 0.9; c.fillStyle = '#100c1c'; c.fillRect(bx - 3, by - 3, 60, 12); c.fillStyle = full ? (Math.floor(t * 5) % 2 ? '#ffe27a' : '#fff4c0') : '#a27ae0'; c.fillRect(bx, by, sn(54 * A.illusion / AX.ILL), 6);
    const P = A.press;
    if (P && P.t >= AX.HOLD && P.aim) {   // đang ngắm Hoán Vị / Nhiễu
      const self = Math.hypot(P.aim.x - p.x, P.aim.y - p.y) <= 70 && P.marks.length < 2;
      c.globalAlpha = 0.85; c.strokeStyle = '#c9a8ff'; c.lineWidth = 3; c.setLineDash([9, 6]); c.beginPath();
      if (self) c.rect(sn(p.x - AX.CONFUSE_R), sn(p.y - AX.CONFUSE_R * 0.6), AX.CONFUSE_R * 2, AX.CONFUSE_R * 1.2);
      else if (P.marks.length === 2) { const [a, b] = P.marks; c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); for (const e of P.marks) c.rect(sn(e.x - 28), sn(e.y - 42), 56, 56); }
      else { c.moveTo(p.x, p.y); c.lineTo(P.aim.x, P.aim.y); c.rect(sn(P.aim.x - 24), sn(P.aim.y - 36), 48, 48); }
      c.stroke(); c.setLineDash([]);
    }
  }
  c.globalAlpha = 1; R.axFx = fx.filter(f => f.t > 0);
}

// ---------- Gương Vỡ: chụp khung hình đúng một lần, rạn rồi vỡ thành mảnh đa giác để lộ thực tại thật ----------
const SH = { CRACK: 0.35, BREAK: 0.8, END: 1.5 };
function startShatter(R, e) {
  const src = R.ctx.canvas, snap = R.axSnap || (R.axSnap = document.createElement('canvas'));
  if (snap.width !== src.width || snap.height !== src.height) { snap.width = src.width; snap.height = src.height; }
  const sc = snap.getContext('2d'); sc.clearRect(0, 0, snap.width, snap.height); sc.drawImage(src, 0, 0);
  const W = src.width, H = src.height, [ix, iy] = R.toScreen(e.x, e.y - 14), nx = R.lowQ ? 3 : 5, ny = R.lowQ ? 2 : 3;
  let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pts = []; for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pts.push([(i + (i && i < nx ? (rnd() - 0.5) * 0.7 : 0)) * W / nx, (j + (j && j < ny ? (rnd() - 0.5) * 0.7 : 0)) * H / ny]);
  const shards = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = pts[j * (nx + 1) + i], b = pts[j * (nx + 1) + i + 1], d = pts[(j + 1) * (nx + 1) + i], q = pts[(j + 1) * (nx + 1) + i + 1];
    for (const tri of ((i + j) % 2 ? [[a, b, q], [a, q, d]] : [[a, b, d], [b, q, d]])) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, dx = cx - ix, dy = cy - iy, L = Math.hypot(dx, dy) || 1;
      shards.push({ tri, cx, cy, vx: dx / L * (120 + rnd() * 220), vy: dy / L * (80 + rnd() * 160), spin: (rnd() - 0.5) * 2.4, wait: L / Math.hypot(W, H) * 0.18 });
    }
  }
  const cracks = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + rnd() * 0.3, line = [[ix, iy]]; for (let s = 1; s <= 7; s++) { const r = s / 7 * Math.hypot(W, H) * 0.75, w = (rnd() - 0.5) * 0.28; line.push([ix + Math.cos(a + w) * r, iy + Math.sin(a + w) * r]); } cracks.push(line); }
  R.axShat = { t: 0, shards, cracks };
}
export function axiomScreen(R, c, W, H, dt) {
  const S = R.axShat; if (!S) return;
  S.t += Math.min(dt, 0.05); const t = S.t, snap = R.axSnap;
  if (t >= SH.END) { R.axShat = null; return; }
  c.save();
  if (t < SH.BREAK) {
    c.drawImage(snap, 0, 0, W, H);
    c.globalCompositeOperation = 'saturation'; c.globalAlpha = Math.min(1, t * 6); c.fillStyle = '#808080'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    if (t > SH.CRACK) {
      const k = (t - SH.CRACK) / (SH.BREAK - SH.CRACK) * 7; c.globalAlpha = 1;
      for (const [col, w] of [['rgba(150,100,255,.55)', 9], ['#ffffff', 2.5]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); for (const line of S.cracks) { c.moveTo(line[0][0], line[0][1]); for (let s = 1; s < line.length && s <= k + 1; s++) { const f = Math.min(1, k - s + 1); c.lineTo(line[s - 1][0] + (line[s][0] - line[s - 1][0]) * f, line[s - 1][1] + (line[s][1] - line[s - 1][1]) * f); } } c.stroke(); }
    }
  } else {
    for (const s of S.shards) {
      const q = Math.max(0, t - SH.BREAK - s.wait) / (SH.END - SH.BREAK - s.wait); if (q >= 1) continue;
      c.save(); c.globalAlpha = 1 - q * q; c.translate(s.cx + s.vx * q, s.cy + s.vy * q + 420 * q * q); c.rotate(s.spin * q); c.scale(1 - 0.35 * q, 1 - 0.35 * q);
      c.beginPath(); s.tri.forEach(([x, y], i) => i ? c.lineTo(x - s.cx, y - s.cy) : c.moveTo(x - s.cx, y - s.cy)); c.closePath();
      c.save(); c.clip(); c.drawImage(snap, -s.cx, -s.cy); c.fillStyle = 'rgba(110,110,125,.45)'; c.fill(); c.restore();
      c.strokeStyle = '#e8dcff'; c.lineWidth = 2.5; c.stroke(); c.restore();
    }
  }
  c.restore();
}
