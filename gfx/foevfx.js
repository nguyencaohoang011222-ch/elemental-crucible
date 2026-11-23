// Hiệu ứng của quái map 2–5: ấn triệu hồi, báo đòn riêng, dây hồi máu, đạn đặc biệt, bom bay vòng cung, lõi an toàn.
// Vẽ theo lưới pixel (WPP), không làm mượt.
import { WPP, sn, rgba } from './pixel.js';
import { ENEMIES } from '../sim.js';

const sq = (ctx, x, y, s, c) => { ctx.fillStyle = c; ctx.fillRect(sn(x) - s / 2, sn(y) - s / 2, s, s); };
const SIGIL = { forest: '#c8f07a', dungeon: '#b8ff5a', frost: '#9fe6ff', volcano: '#ff8a3a', palace: '#ff3a5a' };

// ấn triệu hồi trên đất: vòng chấm xoay + 4 răng, sáng dần trong 0.8s
export function drawSigils(ctx, sim, t) {
  if (!sim.sigils || !sim.sigils.length) return;
  const c = SIGIL[sim.theme] || '#ffffff';
  for (const s of sim.sigils) {
    const k = 1 - s.t / s.T, R = 34 + (1 - k) * 14, blink = s.t < 0.15 && Math.floor(t * 30) % 2, y0 = s.y + 6, C = blink ? '#ffffff' : c;
    ctx.save(); ctx.globalAlpha = 0.55 + k * 0.45;
    ctx.fillStyle = 'rgba(10,6,14,.6)'; ctx.beginPath(); ctx.ellipse(sn(s.x), sn(y0), R + 8, (R + 8) * 0.45, 0, 0, 7); ctx.fill();
    ctx.fillStyle = rgba(c.length === 7 ? c : '#ffffff', 0.12 + k * 0.2); ctx.beginPath(); ctx.ellipse(sn(s.x), sn(y0), R, R * 0.45, 0, 0, 7); ctx.fill();
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283 + t * 2.4, x = s.x + Math.cos(a) * R, y = y0 + Math.sin(a) * R * 0.45; sq(ctx, x, y, WPP * 2, '#141013'); sq(ctx, x, y, WPP, i % 3 ? C : '#ffffff'); }
    for (let i = 0; i < 4; i++) { const a = i * 1.571 - t * 1.8; for (let u = 0; u < 4; u++) { const r = R * 0.25 + u * WPP * 2; sq(ctx, s.x + Math.cos(a) * r, y0 + Math.sin(a) * r * 0.45, WPP * (u === 3 ? 2 : 1), C); } }
    // cột sáng mọc lên dần, đậm nhất ngay trước khi quái hiện
    const hgt = 20 + k * 70; for (let u = 0; u < hgt; u += WPP) { const w = (1 - u / hgt) * 10 * k + WPP; ctx.globalAlpha = (0.2 + 0.5 * k) * (1 - u / hgt); ctx.fillStyle = c; ctx.fillRect(sn(s.x) - w / 2, sn(y0 - u), w, WPP); }
    ctx.globalAlpha = 1; for (let i = 0; i < 2 + k * 3; i++) sq(ctx, s.x + (Math.random() - 0.5) * R * 1.4, y0 - Math.random() * 50 * k, WPP, Math.random() < 0.3 ? '#ffffff' : c);
    ctx.restore();
  }
}
// báo đòn riêng từng loại + dây hồi máu (vẽ trên lớp sáng)
export function drawFoeTells(ctx, sim, t) {
  for (const e of sim.enemies) {
    const d = ENEMIES[e.type]; if (!d || e.dead) continue;
    if (d.ai === 'stalker' && e.state === 'feint') { // vạch vồ mảnh, nhấp nháy
      const ca = Math.cos(e.ta), sa = Math.sin(e.ta), on = Math.floor(t * 16) % 2;
      for (let u = 24; u < 260; u += WPP * 3) sq(ctx, e.x + ca * u, e.y + sa * u, WPP, on ? '#ffffff' : '#9fe6ff');
    }
    if (d.ai === 'jugg' && e.state === 'tele') { // vết nứt sắp chạy: dải hẹp phát sáng
      const pr = 1 - e.st / 0.9, ca = Math.cos(e.ta), sa = Math.sin(e.ta);
      for (let u = 20; u < 480 * Math.min(1, pr * 1.4); u += WPP * 2) sq(ctx, e.x + ca * u + (((u / 6) | 0) % 2 ? -sa : sa) * WPP, e.y + 8 + sa * u + (((u / 6) | 0) % 2 ? ca : -ca) * WPP, WPP, pr > 0.85 ? '#ffffff' : '#ff6a2a');
      for (let i = 0; i < 3; i++) sq(ctx, e.x + (Math.random() - 0.5) * 40, e.y - Math.random() * 40, WPP * 2, '#ffd36b');
    }
    if ((d.ai === 'weaver' || d.ai === 'conjurer' || d.ai === 'mortar' || d.ai === 'arcanist') && e.state === 'tele') {
      const pr = Math.max(0, 1 - e.st / 0.6), R = 18 + pr * 12, c = d.color;
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 - t * 5; sq(ctx, e.x + Math.cos(a) * R, e.y - 10 + Math.sin(a) * R, WPP, i % 3 ? c : '#ffffff'); }
    }
    if (d.ai === 'halberd' && e.state === 'throw') { const a = e.ta; for (let i = 0; i < 6; i++) sq(ctx, e.x + Math.cos(a + i) * 16, e.y - 20 + Math.sin(a + i) * 8, WPP, '#ffd36b'); }
    if (d.ai === 'bomber' && e.state === 'swell' && Math.floor(t * 14) % 2) for (let i = 0; i < 4; i++) sq(ctx, e.x + (Math.random() - 0.5) * 30, e.y - Math.random() * 20, WPP, '#e8ff7a');
    if (e.tie && !e.tie.dead) { // dây hồi máu: chấm xanh chạy từ weaver tới đồng đội
      const a = e.tie, n = Math.max(4, Math.hypot(a.x - e.x, a.y - e.y) / 12 | 0);
      for (let i = 0; i <= n; i++) { const k = i / n, w = Math.sin(k * 9 + t * 8) * 4; sq(ctx, e.x + (a.x - e.x) * k, e.y - 10 + (a.y - e.y) * k + w, WPP, (i + Math.floor(t * 12)) % 3 ? '#7aff5a' : '#ffffff'); }
      for (let i = 0; i < 2; i++) sq(ctx, a.x + (Math.random() - 0.5) * 24, a.y - Math.random() * 30, WPP, '#7aff8a');
    }
  }
}
// đạn đặc biệt; trả true nếu đã vẽ
export function drawFoeShot(ctx, f, t) {
  if (f.kind === 'spore') {
    const p = 1 + 0.2 * Math.sin(t * 10 + f.x * 0.1), r = f.r * p;
    ctx.fillStyle = '#141013'; ctx.beginPath(); ctx.arc(sn(f.x), sn(f.y), r + 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a2a8a'; ctx.beginPath(); ctx.arc(sn(f.x), sn(f.y), r, 0, 7); ctx.fill(); ctx.fillStyle = '#3ad08a'; ctx.beginPath(); ctx.arc(sn(f.x - 2), sn(f.y - 2), r * 0.55, 0, 7); ctx.fill();
    for (let i = 0; i < 5; i++) { const a = i * 1.257 + t * 3, bb = (Math.sin(t * 9 + i * 2) + 1) * 0.5; sq(ctx, f.x + Math.cos(a) * r * (0.7 + bb * 0.4), f.y + Math.sin(a) * r * (0.7 + bb * 0.4), WPP, i % 2 ? '#c890f0' : '#a8ffd0'); }
    sq(ctx, f.x, f.y, WPP * 2, '#ffffff'); return true;
  }
  if (f.kind === 'sporelet') { sq(ctx, f.x, f.y, WPP * 3, '#141013'); sq(ctx, f.x, f.y, WPP * 2, '#9a4ae0'); sq(ctx, f.x - WPP / 2, f.y - WPP / 2, WPP, '#a8ffd0'); return true; }
  if (f.kind === 'lightwave') { // sóng sáng vàng hình lưỡi liềm, vuông góc hướng bay
    const a = Math.atan2(f.vy, f.vx), ca = Math.cos(a), sa = Math.sin(a);
    for (let v = -33; v <= 33; v += WPP) { const bend = -Math.abs(v) * 0.4, x = f.x + ca * bend - sa * v, y = f.y + sa * bend + ca * v, e = Math.abs(v) > 24; sq(ctx, x, y, WPP * 5, '#3a1404'); sq(ctx, x, y, WPP * 3, e ? '#e0203a' : '#ffd36b'); if (!e) sq(ctx, x + ca * WPP, y + sa * WPP, WPP * 2, '#ffffff'); }
    for (let k = 1; k <= 3; k++) for (let v = -18 + k * 4; v <= 18 - k * 4; v += WPP * 2) { const bend = -Math.abs(v) * 0.4 - k * 12; sq(ctx, f.x + ca * bend - sa * v, f.y + sa * bend + ca * v, WPP, k === 1 ? '#ffd36b' : '#e0203a'); }
    return true; }
  if (f.kind === 'ember') { sq(ctx, f.x, f.y, WPP * 4, '#141013'); sq(ctx, f.x, f.y, WPP * 3, '#ff6a1e'); sq(ctx, f.x, f.y, WPP, '#ffe27a'); return true; }
  if (f.kind === 'glaive') { // chakram vàng xoay 4 cánh
    const s = f.spin || t * 18;
    sq(ctx, f.x, f.y, WPP * 4, '#141013');
    for (let i = 0; i < 4; i++) { const a = s + i * 1.571; for (let u = 1; u <= 4; u++) sq(ctx, f.x + Math.cos(a + u * 0.18) * u * WPP, f.y + Math.sin(a + u * 0.18) * u * WPP, WPP, u > 3 ? '#ffffff' : '#ffd36b'); }
    sq(ctx, f.x, f.y, WPP * 2, '#e6b84a'); return true;
  }
  if (f.kind === 'fissure') { // vết nứt chạy dưới đất
    const a = Math.atan2(f.vy, f.vx), ca = Math.cos(a), sa = Math.sin(a);
    for (let u = -60; u <= 6; u += WPP) { const j = ((u * 7) & 7) > 3 ? WPP : -WPP; sq(ctx, f.x + ca * u - sa * j, f.y + sa * u + ca * j, WPP * 2, '#1a0e0a'); sq(ctx, f.x + ca * u - sa * j, f.y + sa * u + ca * j, WPP, u > -20 ? '#ffe27a' : '#ff6a1e'); }
    return true;
  }
  return false;
}
// bom magma bay vòng cung (theo event 'lob')
export function drawLobs(R, ctx, dt) {
  if (!R.lobs || !R.lobs.length) return;
  for (const L of R.lobs) {
    L.t += dt; const k = Math.min(1, L.t / L.T), x = L.x1 + (L.x2 - L.x1) * k, gy = L.y1 + (L.y2 - L.y1) * k, y = gy - Math.sin(k * Math.PI) * (160 + Math.hypot(L.x2 - L.x1, L.y2 - L.y1) * 0.25);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sn(x) - 6, sn(gy) - 2, 12, 5);
    sq(ctx, x, y, WPP * 5, '#141013'); sq(ctx, x, y, WPP * 4, '#3a2626'); sq(ctx, x - WPP, y - WPP, WPP * 2, '#ff6a1e'); sq(ctx, x, y, WPP, '#ffe27a');
    if (Math.random() < 0.6) R.parts.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: 20, life: 0.4, max: 0.4, c: Math.random() < 0.5 ? '#ff6a1e' : '#3a3236', s: 4 });
  }
  R.lobs = R.lobs.filter(L => L.t < L.T);
}
// lõi an toàn của ấn máu: viền trắng + nền sáng nhạt
export function holeEye(ctx, h, t) {
  if (!h.hole) return;
  ctx.save(); ctx.fillStyle = 'rgba(255,240,240,.18)'; ctx.beginPath(); ctx.arc(h.x, h.y, h.hole, 0, 7); ctx.fill();
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + t * 2; sq(ctx, h.x + Math.cos(a) * h.hole, h.y + Math.sin(a) * h.hole, WPP, i % 2 ? '#ffffff' : '#ffd0d8'); }
  for (let i = 0; i < 6; i++) { const a = i * 1.047 - t; sq(ctx, h.x + Math.cos(a) * h.hole * 0.45, h.y + Math.sin(a) * h.hole * 0.45, WPP, '#ffffff'); }
  ctx.restore();
}
// vòng ngắm bom: tâm chữ thập + 4 góc ngoặc đỏ cam, nháy nhanh dần
export function reticle(ctx, h, t) {
  const pr = Math.min(1, (h.T - h.t) / h.T), on = Math.floor(t * (6 + pr * 18)) % 2, c = on ? '#ffffff' : '#ff3a1a', r = h.r;
  for (let u = -12; u <= 12; u += WPP) { sq(ctx, h.x + u, h.y, WPP, c); sq(ctx, h.x, h.y + u, WPP, c); }
  const q = r * 0.72;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { for (let u = 0; u < 14; u += WPP) for (const [x, y] of [[h.x + sx * (q - u), h.y + sy * q], [h.x + sx * q, h.y + sy * (q - u)]]) sq(ctx, x, y, WPP * 2, '#141013'); for (let u = 0; u < 14; u += WPP) { sq(ctx, h.x + sx * (q - u), h.y + sy * q, WPP, c); sq(ctx, h.x + sx * q, h.y + sy * (q - u), WPP, c); } }
}
// gai băng lởm chởm trồi lên dọc quạt đập khiên
export function drawIceSpikes(R, ctx, dt) {
  if (!R.iceSp || !R.iceSp.length) return;
  for (const s of R.iceSp) {
    s.t += dt; const k = (s.t - s.d) / s.T; if (k < 0) continue;
    const up = Math.min(1, k * 5), fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, H = 30 * s.s * up;
    ctx.save(); ctx.globalAlpha = Math.max(0, fade);
    for (const [ox, hh, w] of [[-8, 0.6, 3], [0, 1, 4], [7, 0.75, 3]]) { const h2 = H * hh; for (let v = 0; v < h2; v += WPP) { const ww = Math.max(1, Math.round(w * (1 - v / h2))) * WPP; ctx.fillStyle = '#0a1e3a'; ctx.fillRect(sn(s.x + ox) - ww / 2 - WPP, sn(s.y - v), ww + WPP * 2, WPP); ctx.fillStyle = v > h2 - WPP * 3 ? '#ffffff' : (v / WPP) & 1 ? '#7fd0ff' : '#bff0ff'; ctx.fillRect(sn(s.x + ox) - ww / 2, sn(s.y - v), ww, WPP); } }
    ctx.restore();
  }
  R.iceSp = R.iceSp.filter(s => s.t < s.d + s.T);
}
export { rgba };
