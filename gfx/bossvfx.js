// Hiệu ứng đòn boss kiểu pixel: tia, quét, sóng xung kích, vùng cảnh báo.
// Mọi nét đều là ô vuông bám lưới (không gradient, không đầu nét tròn), dải màu bậc: viền tối răng cưa → màu giữa → sáng → lõi trắng.
import { WPP, sn } from './pixel.js';

const H = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// đĩa pixel: các hàng ô bám lưới
export function disc(ctx, x, y, r, c) { ctx.fillStyle = c; const X = sn(x), Y = sn(y); for (let dy = -r; dy <= r; dy += WPP) { const w = sn(Math.sqrt(Math.max(0, r * r - dy * dy))); if (w > 0) ctx.fillRect(X - w, Y + sn(dy), w * 2, WPP); } }
const sq = (ctx, x, y, s, c) => { const z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.fillRect(sn(x - z / 2), sn(y - z / 2), z, z); };

// bộ màu theo nguyên tố của từng boss: [viền tối, giữa, sáng, rất sáng, lõi]
export const STY = {
  fire: { band: ['#2a0804', '#c8301a', '#ff8a2a', '#ffd84a', '#fff6d0'], part: ['#ff5a1a', '#ffc04a', '#fff3b0'], smoke: '#2a201c' },
  magma: { band: ['#1c0e08', '#8a2a10', '#ff6a1e', '#ffb04a', '#fff0b0'], part: ['#ff7a2a', '#ffd36b', '#6a4a36', '#8a6a50'], smoke: '#3a2a22' },
  quake: { band: ['#1c1917', '#57534E', '#A8A29E', '#D97706', '#F59E0B'], part: ['#78716C', '#57534E', '#A8A29E', '#44403C', '#D97706'], smoke: '#57534E' },   // địa chấn: đất, đá xám, khe hổ phách
  ice: { band: ['#0a1e3a', '#2f7ac8', '#7fd0ff', '#c8f4ff', '#ffffff'], part: ['#bff0ff', '#ffffff', '#7fd0ff'], smoke: '#cfe8ff' },
  spore: { band: ['#14200a', '#3a7a1e', '#7ad03a', '#c8ff6a', '#f4ffd0'], part: ['#b45ae8', '#3ad0e0', '#c8ff6a', '#e6b4ff'], smoke: '#3a5a2a' },
  toxic: { band: ['#120a1c', '#5a2a8a', '#3ad08a', '#c8ffb0', '#f4fff0'], part: ['#9a4ae0', '#3ad08a', '#c8ffb0', '#6a2aa8'], smoke: '#2a1a3a' },
  blood: { band: ['#120408', '#7a0a1c', '#e0203a', '#ffc04a', '#fff0e0'], part: ['#ff2a4a', '#ffd36b', '#2a0a14'], smoke: '#1a0a10' },
  gold: { band: ['#2a1404', '#a8701a', '#ffd36b', '#fff0b0', '#ffffff'], part: ['#ffd36b', '#e0203a', '#fff0b0'], smoke: '#3a2a14' },
  storm: { band: ['#0c0a2a', '#5a3ad0', '#8ab8ff', '#d8f0ff', '#ffffff'], part: ['#bfe8ff', '#ffffff', '#c8a8ff'], smoke: '#2a2a4a' }
};
const BOSS_STY = { DRAGON: 'fire', COLOSSUS: 'quake', WARDEN: 'ice', BEHEMOTH: 'spore', SOVEREIGN: 'storm' };
export function styleOf(h) {
  if (h.sty && STY[h.sty]) return STY[h.sty];
  const b = h.owner; if (b && BOSS_STY[b.type]) return STY[BOSS_STY[b.type]];
  if (b && b.cloneOf && BOSS_STY[b.cloneOf]) return STY[BOSS_STY[b.cloneOf]];
  const c = (h.color || '').toLowerCase();
  if (c.includes('7fe0ff') || c.includes('9fe6ff') || c.includes('7fd0ff') || c.includes('3a8aff') || c.includes('bfe8ff')) return STY.ice; if (c.includes('9a5aff') || c.includes('c9')) return STY.storm;
  if (c.includes('ff2a4a') || c.includes('ff3a5a') || c.includes('b07aff')) return STY.blood; if (c.includes('ffd36b') || c.includes('e6b84a')) return STY.gold;
  if (c.includes('a8e05a') || c.includes('b8ff5a') || c.includes('8ad84a') || c.includes('9ad84a')) return STY.toxic; if (c.includes('ff7a2a') || c.includes('ff7a3c') || c.includes('ff5a2a')) return STY.magma;
  return STY.fire;
}
const kindOf = st => Object.keys(STY).find(k => STY[k] === st);

// ---------- đường viền pixel chấm (vùng cảnh báo) ----------
function outlinePts(h, k = 1) {
  const pts = [];
  if (h.kind === 'circle') { const r = Math.max(0, h.r * k), n = Math.max(24, Math.floor(r * 6.283 / (WPP * 2))); for (let i = 0; i <= n; i++) { const q = i / n * 6.283; pts.push([h.x + Math.cos(q) * r, h.y + Math.sin(q) * r]); } }
  else if (h.kind === 'arc') { const r = Math.max(0, h.r * k), n = Math.max(10, Math.floor(r * h.arc / (WPP * 2))); pts.push([h.x, h.y]); for (let i = 0; i <= n; i++) { const q = h.a - h.arc / 2 + h.arc * i / n; pts.push([h.x + Math.cos(q) * r, h.y + Math.sin(q) * r]); } pts.push([h.x, h.y]); }
  else { const ca = Math.cos(h.a), sa = Math.sin(h.a), w = h.width * (h.kind === 'line' ? 1 : k) / 2, L = h.kind === 'line' ? h.len * k : h.len, x0 = h.kind === 'line' ? 0 : -L / 2, P = (u, v) => [h.x + ca * u - sa * v, h.y + sa * u + ca * v]; pts.push(P(x0, -w), P(x0 + L, -w), P(x0 + L, w), P(x0, w), P(x0, -w)); }
  return pts;
}
// đóng dấu ô vuông dọc theo đường gấp khúc; dash = số ô bật / tắt; off = độ trôi (viền chạy)
function stampPath(ctx, pts, s, c, dash = 0, off = 0) {
  let acc = 0; const step = Math.max(WPP, s);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(L / step));
    for (let j = 0; j < n; j++) { const idx = Math.floor((acc + j * step + off) / step); if (dash && (idx % (dash * 2)) >= dash) continue; const t = j / n; sq(ctx, ax + (bx - ax) * t, ay + (by - ay) * t, s, c); }
    acc += L;
  }
}
function fillPath(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill(); }

// vùng cảnh báo hình tròn / quạt / đường / chữ nhật trước khi đánh
export function telegraph(ctx, h, t) {
  const span = Math.max(0.01, h.T - h.hold), pr = Math.min(1, (h.T - h.t) / span), flash = h.t < 0.15, blink = flash && Math.floor(t * 30) % 2 === 0;
  const qk = styleOf(h) === STY.quake, c = qk ? '#F59E0B' : h.color || '#ff5a4a', out = outlinePts(h, 1);
  fillPath(ctx, out, blink ? 'rgba(255,255,255,.32)' : qk ? 'rgba(217,119,6,.16)' : 'rgba(255,50,50,.18)');
  // phần đã nạp (lan dần ra viền); chạm viền đúng lúc đánh
  const inner = outlinePts(h, pr);
  ctx.globalAlpha = 0.22 + pr * 0.15; fillPath(ctx, inner, c); ctx.globalAlpha = 1;
  if (h.kind !== 'line' || pr < 1) stampPath(ctx, inner, WPP, flash ? '#ffffff' : c);
  // viền ngoài: chấm pixel chạy vòng, nền tối để nổi trên mọi mặt đất
  stampPath(ctx, out, WPP * 2, 'rgba(10,6,14,.85)', 2, t * 40);
  stampPath(ctx, out, WPP, flash ? '#ffffff' : c, 2, t * 40);
}

// ---------- tia xoay (beam) ----------
const r0Of = (h) => (h.owner ? h.owner.r * 0.5 : 20);
function muzzle(ctx, x, y, st, t, k = 1) {
  const p = 1 + 0.25 * Math.sin(t * 24), B = st.band;
  disc(ctx, x, y, 15 * p * k, B[0]); disc(ctx, x, y, 12 * p * k, B[1]); disc(ctx, x, y, 8 * p * k, B[3]); disc(ctx, x, y, 4 * k + 2, B[4]);
  for (let i = 0; i < 8; i++) { const q = t * 3 + i * 0.785, r = 22 * k; sq(ctx, x + Math.cos(q) * r, y + Math.sin(q) * r, WPP * (i % 2 ? 1 : 2), B[i % 2 ? 2 : 3]); } // vòng phù văn
}
export function beam(R, ctx, h, t) {
  const st = styleOf(h), K = kindOf(st), B = st.band, r0 = r0Of(h), W = h.width;
  for (let k = 0; k < h.n; k++) {
    const a = h.twin ? h.a + (k - (h.n - 1) / 2) * h.twin : h.a + k * Math.PI * 2 / h.n, ca = Math.cos(a), sa = Math.sin(a), O = h.vo && h.vo[k];
    // điểm phát hình ảnh (đầu gậy / bàn tay): tia đi từ đó xuống tới điểm cuối trên mặt đất, vùng trúng vẫn theo mặt đất
    const P = O ? (u, v) => { const t2 = Math.max(0, Math.min(1, (u - r0) / Math.max(1, h.len - r0))), ex = h.x + ca * h.len, ey = h.y + sa * h.len; return [O[0] + (ex - O[0]) * t2 - sa * v, O[1] + (ey - O[1]) * t2 + ca * v]; } : (u, v) => [h.x + ca * u - sa * v, h.y + sa * u + ca * v];
    if (!h.active) {
      const pr = 1 - h.t / h.T, flash = h.t < 0.15, blink = flash && Math.floor(t * 30) % 2 === 0;
      const box = [P(r0, -W / 2), P(h.len, -W / 2), P(h.len, W / 2), P(r0, W / 2), P(r0, -W / 2)];
      fillPath(ctx, box, blink ? 'rgba(255,255,255,.3)' : 'rgba(255,50,50,.18)');
      for (const s of [-1, 1]) {
        const edge = [P(r0, s * W / 2), P(h.len, s * W / 2)];
        stampPath(ctx, edge, WPP * 2, 'rgba(10,6,14,.85)', 2, t * 50); stampPath(ctx, edge, WPP, flash ? '#ffffff' : (h.color || B[2]), 2, t * 50);
        stampPath(ctx, [P(r0, s * W / 2 * (1 - pr)), P(h.len, s * W / 2 * (1 - pr))], WPP, flash ? '#ffffff' : B[3]);   // hai vạch hội tụ = đếm ngược
      }
      // mũi tên chỉ chiều xoay
      const sg = Math.sign(h.spin) || 1; for (let i = 0; i < 3; i++) { const q = a + sg * (0.12 + i * 0.07), rr = h.len * 0.72; sq(ctx, h.x + Math.cos(q) * rr, h.y + Math.sin(q) * rr, WPP * (3 - i), flash ? '#ffffff' : B[3]); }
      muzzle(ctx, P(r0, 0)[0], P(r0, 0)[1], st, t, 0.4 + pr * 0.6);
      continue;
    }
    // thân tia: các ô vuông chồng theo 4 dải, bề rộng nhiễu theo thời gian (bề mặt năng lượng chuyển động)
    const step = WPP * 2, tf = Math.floor(t * 20);
    let path = [];
    if (K === 'storm') { // tia sét gấp khúc, đổi hình 20 lần/giây
      let v = 0; for (let u = r0; u <= h.len; u += 24) { path.push([u, v]); v = Math.max(-W * 0.6, Math.min(W * 0.6, v + (H(u | 0, tf + k * 7) - 0.5) * W * 0.9)); } path.push([h.len, 0]);
    } else path = [[r0, 0], [h.len, 0]];
    const draw = (band, scale) => {
      for (let i = 0; i + 1 < path.length; i++) {
        const [u0, v0] = path[i], [u1, v1] = path[i + 1], n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / step));
        for (let j = 0; j < n; j++) {
          const u = u0 + (u1 - u0) * j / n, v = v0 + (v1 - v0) * j / n, nz = H(Math.floor(u / step), tf + k * 13);
          let w = W * 0.5 * (K === 'fire' ? 0.6 + nz * 0.7 : K === 'ice' ? 0.85 + nz * 0.15 : K === 'storm' ? 0.55 + nz * 0.3 : 0.75 + nz * 0.35);
          if (u > h.len - 30) w *= (h.len - u) / 30 * 0.6 + 0.4;              // thuôn nhọn ở đầu cuối
          const [x, y] = P(u, v); sq(ctx, x, y, Math.max(WPP, w * 2 * scale), band);
        }
      }
    };
    draw(B[0], 1.25); draw(B[1], 1); draw(B[2], 0.62); draw(B[3], 0.36); draw(B[4], 0.16);
    // gai năng lượng hai bên mép
    for (let i = 0; i < 6; i++) { const u = r0 + H(i, tf + k) * (h.len - r0), s = H(tf, i) < 0.5 ? -1 : 1, L = W * (0.5 + H(i + 9, tf) * 0.7); const [x0, y0] = P(u, s * W * 0.4), [x1, y1] = P(u + (K === 'ice' ? 0 : 6), s * L); stampPath(ctx, [[x0, y0], [x1, y1]], WPP, K === 'ice' ? B[4] : B[3]); }
    if (K === 'storm') for (let i = 0; i < 2; i++) { let [u, v] = path[1 + Math.floor(H(i, tf) * (path.length - 2))] || path[0]; const s = H(i + 3, tf) < 0.5 ? -1 : 1, pts = []; for (let j = 0; j < 4; j++) { pts.push(P(u, v)); u += 14; v += s * (6 + H(j, tf + i) * 10); } stampPath(ctx, pts, WPP, B[3]); }
    // miệng tia + đầu cuối tan thành tia lửa / khói
    const [mx, my] = P(r0, 0), [ex, ey] = P(h.len, 0); muzzle(ctx, mx, my, st, t, 1);
    for (let i = 0; i < 5; i++) sq(ctx, ex + (H(i, tf) - 0.5) * W * 1.4, ey + (H(tf, i) - 0.5) * W * 1.4, WPP * (1 + (i % 3)), i % 2 ? B[4] : B[3]);
    if (Math.random() < 0.9) { const c = st.part[(Math.random() * st.part.length) | 0]; R.parts.push({ x: ex, y: ey, vx: ca * 60 + (Math.random() - 0.5) * 140, vy: sa * 60 + (Math.random() - 0.5) * 140 - 40, life: 0.45, max: 0.45, c, s: 4 + Math.random() * 3 }); }
    if (Math.random() < 0.5) R.parts.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 0.8, max: 0.8, c: st.smoke, s: 8 });
    // hạt rơi dọc thân tia theo nguyên tố
    if (Math.random() < 0.8) { const u = r0 + Math.random() * (h.len - r0), [x, y] = P(u, (Math.random() - 0.5) * W); R.parts.push(K === 'ice' ? { x, y, vx: (Math.random() - 0.5) * 20, vy: 40, life: 0.9, max: 0.9, c: '#ffffff', s: 3 } : K === 'fire' ? { x, y, vx: 0, vy: -70, life: 0.5, max: 0.5, c: st.part[(Math.random() * 2) | 0], s: 4 } : { x, y, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.18, max: 0.18, c: '#ffffff', s: 3 }); }
  }
}

// ---------- sóng xung kích đang lan ----------
export function shockwave(R, ctx, h, t) {
  const st = styleOf(h), K = kindOf(st), B = st.band, gs = null, T2 = Math.max(12, h.thick), r = h.rr, tf = Math.floor(t * 20);
  if (r <= 0) return;
  const n = Math.max(32, Math.floor(r * 6.283 / (WPP * 2)));
  const inGap = q => gs && Math.abs(Math.atan2(Math.sin(q - gs[0]), Math.cos(q - gs[0]))) < gs[1] / 2;
  // nứt dung nham toả ra sau sóng (Colossus)
  if (K === 'magma' || K === 'quake') for (let i = 0; i < 14; i++) { const q = i * 0.449 + (h.seed || (h.seed = Math.random() * 6)); if (inGap(q)) continue; const pts = []; for (let d = Math.min(r, 40); d <= r; d += 18) { const j = (H(i, d | 0) - 0.5) * 0.18; pts.push([h.x + Math.cos(q + j) * d, h.y + Math.sin(q + j) * d]); } if (pts.length > 1) { stampPath(ctx, pts, WPP * 2, B[0]); stampPath(ctx, pts, WPP, Math.floor(t * 10 + i) % 3 ? B[2] : B[3]); } }
  // vùng gây sát thương mờ (đúng bề dày va chạm)
  ctx.globalAlpha = 0.16; for (let i = 0; i < n; i += 2) { const q = i / n * 6.283; if (!inGap(q)) sq(ctx, h.x + Math.cos(q) * r, h.y + Math.sin(q) * r, T2, B[1]); } ctx.globalAlpha = 1;
  const bands = [[B[0], 0.62], [B[1], 0.48], [B[3], 0.26], [B[4], 0.1]];
  for (const [c, k] of bands) for (let i = 0; i < n; i++) {
    const q = i / n * 6.283; if (inGap(q)) continue;
    const j = (H(i, tf) - 0.5) * T2 * (K === 'spore' ? 0.5 : 0.25), rr = r + j;
    sq(ctx, h.x + Math.cos(q) * rr, h.y + Math.sin(q) * rr, T2 * k * (K === 'storm' ? 0.7 + H(tf, i) * 0.6 : 1), c);
  }
  // hạt văng ra theo nguyên tố
  for (let s = 0; s < 3; s++) {
    const q = Math.random() * 6.283; if (inGap(q)) continue; const x = h.x + Math.cos(q) * r, y = h.y + Math.sin(q) * r, c = st.part[(Math.random() * st.part.length) | 0];
    if (K === 'magma') R.parts.push({ x, y, vx: Math.cos(q) * 160, vy: Math.sin(q) * 80 - 120, life: 0.55, max: 0.55, c, s: 5 + Math.random() * 4 });
    else if (K === 'quake') R.parts.push({ x, y, vx: Math.cos(q) * 150, vy: Math.sin(q) * 70 - 130, life: 0.55, max: 0.55, c, s: Math.random() < 0.5 ? 3 : 6 });   // cục đất 1x1 / 2x2
    else if (K === 'spore') R.parts.push({ x, y, vx: Math.cos(q) * 30, vy: -25 - Math.random() * 20, life: 1.2, max: 1.2, c, s: 4 });
    else if (K === 'ice') R.parts.push({ x, y, vx: Math.cos(q) * 120, vy: Math.sin(q) * 120, life: 0.4, max: 0.4, c, s: 4 });
    else R.parts.push({ x, y, vx: Math.cos(q) * 220, vy: Math.sin(q) * 220, life: 0.25, max: 0.25, c, s: 3 });
  }
}

// ---------- đòn vừa đánh xong (quét / đập / đường) ----------
export function impact(R, ctx, h, t) {
  const st = styleOf(h), K = kindOf(st), B = st.band, k = Math.max(0, h.fade / 0.3), tf = Math.floor(t * 20);
  if (!h._fx) { h._fx = true; impactBurst(R, h, st, K); }
  ctx.globalAlpha = Math.min(1, k * 1.4);
  if (h.kind === 'arc') {
    // nhát quét hình lưỡi liềm mảnh (rồng: 3 vết vuốt than hồng)
    const sweep = Math.min(1, 0.35 + (1 - k) * 2.6), a0 = h.a - h.arc / 2, a1 = a0 + h.arc * sweep, lines = K === 'fire' ? [0.98, 0.86, 0.74] : [0.94];
    for (const f of lines) {
      const r = h.r * f, n = Math.max(10, Math.floor(r * (a1 - a0) / (WPP * 2))), th = K === 'fire' ? 9 : 16;
      for (let i = 0; i <= n; i++) {
        const q = a0 + (a1 - a0) * i / n, edge = Math.min(i, n - i) / Math.max(1, n) * 2, w = th * Math.min(1, edge * 2.5) * (0.8 + H(i, tf) * 0.4), x = h.x + Math.cos(q) * r, y = h.y + Math.sin(q) * r;
        sq(ctx, x, y, w * 1.5, B[0]); sq(ctx, x, y, w, B[K === 'spore' ? 1 : 2]); sq(ctx, x, y, w * 0.45, B[4]);
      }
    }
  } else if (h.kind === 'line' || h.kind === 'rect') {
    const ca = Math.cos(h.a), sa = Math.sin(h.a), L = h.len, x0 = h.kind === 'line' ? 0 : -L / 2, w = Math.min(h.width, 60) * 0.5;
    for (let u = 0; u <= L; u += WPP * 2) { const nz = H(u | 0, tf), ww = w * (0.6 + nz * 0.5) * Math.min(1, (L - u) / 40 + 0.3), x = h.x + ca * (x0 + u), y = h.y + sa * (x0 + u); sq(ctx, x, y, ww * 1.3, B[0]); sq(ctx, x, y, ww, B[1]); sq(ctx, x, y, ww * 0.45, B[3]); }
  } else if (h.kind === 'circle') {
    const r = h.r * (1.05 - k * 0.15);
    if (K === 'storm') { // sét đánh từ trời xuống
      let x = h.x + (H(1, tf) - 0.5) * 30, y = h.y - 420; const pts = [[x, y]]; while (y < h.y) { y += 34; x += (H(y | 0, tf) - 0.5) * 40; pts.push([x, Math.min(y, h.y)]); } stampPath(ctx, pts, WPP * 4, B[0]); stampPath(ctx, pts, WPP * 2, B[3]); stampPath(ctx, pts, WPP, '#ffffff');
    }
    if (K === 'ice') for (let i = 0; i < 9; i++) { const q = i * 0.698 + 0.3, L = r * (0.5 + H(i, 3) * 0.5), pts = [[h.x, h.y], [h.x + Math.cos(q) * L, h.y + Math.sin(q) * L]]; stampPath(ctx, pts, WPP * 3, B[0]); stampPath(ctx, pts, WPP * 2, B[2]); stampPath(ctx, pts, WPP, B[4]); }
    if (K === 'fire') for (let i = 0; i < 16; i++) { const q = H(i, 7) * 6.283, d = H(i, 8) * r * 0.8, hgt = (10 + H(i, tf) * 24) * k; sq(ctx, h.x + Math.cos(q) * d, h.y + Math.sin(q) * d - hgt * 0.5, 8, B[1]); sq(ctx, h.x + Math.cos(q) * d, h.y + Math.sin(q) * d - hgt, 5, B[3]); }
    if (K === 'quake') { for (let i = 0; i < 8; i++) { const q = i * 0.785 + H(i, 5) * 0.4, L = r * (0.55 + H(i, 6) * 0.45), pts = [[h.x, h.y]]; for (let d = 18; d <= L; d += 18) pts.push([h.x + Math.cos(q + (H(i, d) - 0.5) * 0.3) * d, h.y + Math.sin(q + (H(i, d) - 0.5) * 0.3) * d]); stampPath(ctx, pts, WPP * 2, '#09080f'); stampPath(ctx, pts, WPP, Math.floor(t * 8 + i) % 3 ? '#D97706' : '#F59E0B'); }   // khe nứt địa tầng
      const up = Math.min(1, (1 - k) * 3); for (let i = 0; i < 10; i++) { const q = H(i, 9) * 6.283, d = r * (0.25 + H(i, 10) * 0.6), x = h.x + Math.cos(q) * d, y = h.y + Math.sin(q) * d, hh = (14 + H(i, 11) * 20) * up * k; for (let s = 0; s < hh; s += WPP) { const w = Math.max(WPP, sn((1 - s / Math.max(1, hh)) * 12)); ctx.fillStyle = '#09080f'; ctx.fillRect(sn(x - w / 2) - WPP, sn(y - s) - WPP, w + 2 * WPP, WPP * 2); ctx.fillStyle = s < hh * 0.4 ? '#57534E' : s < hh * 0.8 ? '#78716C' : '#A8A29E'; ctx.fillRect(sn(x - w / 2), sn(y - s), w, WPP); } } }   // gai đá trồi lên
    if (K === 'spore') { ctx.globalAlpha *= 0.55; for (let i = 0; i < 10; i++) { const q = i * 0.628 + t, d = r * (0.3 + H(i, 2) * 0.55); sq(ctx, h.x + Math.cos(q) * d, h.y + Math.sin(q) * d, 22 + H(i, tf) * 10, i % 2 ? '#3a7a1e' : '#6a3a8a'); } }
    // vòng va chạm mảnh, răng cưa
    const n = Math.max(24, Math.floor(r * 6.283 / (WPP * 2)));
    for (let i = 0; i < n; i++) { const q = i / n * 6.283, rr = r + (H(i, tf) - 0.5) * 10; sq(ctx, h.x + Math.cos(q) * rr, h.y + Math.sin(q) * rr, WPP * 2, B[0]); sq(ctx, h.x + Math.cos(q) * rr, h.y + Math.sin(q) * rr, WPP, B[3]); }
  }
  ctx.globalAlpha = 1;
}
function impactBurst(R, h, st, K) {
  const parts = R.parts, n = 18;
  const center = h.kind === 'arc' ? [h.x + Math.cos(h.a) * h.r * 0.7, h.y + Math.sin(h.a) * h.r * 0.7] : h.kind === 'line' ? [h.x + Math.cos(h.a) * h.len * 0.5, h.y + Math.sin(h.a) * h.len * 0.5] : [h.x, h.y];
  const spread = h.kind === 'circle' ? h.r : h.kind === 'arc' ? h.r * 0.4 : (h.len || 200) * 0.5;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, d = Math.random() * spread, x = center[0] + Math.cos(h.kind === 'line' ? h.a : a) * (h.kind === 'line' ? (Math.random() - 0.5) * spread * 2 : d), y = center[1] + Math.sin(h.kind === 'line' ? h.a : a) * (h.kind === 'line' ? (Math.random() - 0.5) * spread * 2 : d), c = st.part[(Math.random() * st.part.length) | 0];
    if (K === 'magma') parts.push({ x, y, vx: Math.cos(a) * 180, vy: -140 - Math.random() * 120, life: 0.7, max: 0.7, c, s: 5 + Math.random() * 5 });
    else if (K === 'quake') { parts.push({ x, y, vx: Math.cos(a) * 170, vy: -150 - Math.random() * 110, life: 0.7, max: 0.7, c, s: Math.random() < 0.5 ? 3 : 6 }); if (i % 3 === 0) parts.push({ x, y, vx: Math.cos(a) * 20, vy: -30 - Math.random() * 20, life: 1.1, max: 1.1, c: i % 2 ? '#78716C' : '#57534E', s: 10 }); }   // cục đất + bụi bốc lên
    else if (K === 'spore') parts.push({ x, y, vx: Math.cos(a) * 25, vy: -20 - Math.random() * 30, life: 1.4, max: 1.4, c, s: 4 });
    else if (K === 'ice') parts.push({ x, y: y - 40 - Math.random() * 60, vx: (Math.random() - 0.5) * 30, vy: 50 + Math.random() * 30, life: 1.1, max: 1.1, c: '#ffffff', s: 3 });
    else if (K === 'storm') parts.push({ x, y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.22, max: 0.22, c, s: 3 });
    else { parts.push({ x, y, vx: Math.cos(a) * 40, vy: -80 - Math.random() * 60, life: 0.6, max: 0.6, c, s: 4 }); if (i % 3 === 0) parts.push({ x, y, vx: 0, vy: -40, life: 1, max: 1, c: st.smoke, s: 9 }); }
  }
}

// hố đen (Storm Sovereign): xoắn ốc ô vuông hút vào tâm
export function vortex(R, ctx, h, t) {
  const k0 = h.active ? 1 : 1 - h.t / h.T, st = STY.storm, B = st.band;
  ctx.globalAlpha = 0.22 * k0; disc(ctx, h.x, h.y, h.r * 0.25, '#1a0a2a'); ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const rr = h.r * (1 - ((t * 0.5 + i * 0.2) % 1)), a0 = t * 2 + i, al = (0.2 + 0.6 * (1 - rr / h.r)) * k0, n = Math.floor(rr * 4 / (WPP * 3));
    ctx.globalAlpha = al; for (let j = 0; j < n; j++) { const q = a0 + j / n * 4, r2 = rr * (1 - j / n * 0.08); sq(ctx, h.x + Math.cos(q) * r2, h.y + Math.sin(q) * r2, WPP * (j % 3 ? 1 : 2), j % 2 ? B[2] : B[1]); }
  }
  ctx.globalAlpha = 1;
  const pulse = 26 + 8 * Math.sin(t * 8); disc(ctx, h.x, h.y, pulse + 9, B[2]); disc(ctx, h.x, h.y, pulse + 6, B[0]); disc(ctx, h.x, h.y, pulse, '#05000a');
  for (let i = 0; i < 10; i++) { const q = t * 4 + i * 0.628; sq(ctx, h.x + Math.cos(q) * (pulse + 9), h.y + Math.sin(q) * (pulse + 9), WPP, B[4]); }
  if (h.active && Math.random() < 0.8) { const a = Math.random() * 6.28, d = 80 + Math.random() * h.r * 0.6; R.parts.push({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 1.6 - Math.sin(a) * 120, vy: -Math.sin(a) * d * 1.6 + Math.cos(a) * 120, life: 0.6, max: 0.6, c: Math.random() < 0.5 ? '#9a5aff' : '#d8b0ff', s: 3 }); }
}

// NGỌN LỬA CUỐI CÙNG: phủ đỏ toàn đấu trường, vùng bóng sau mỏm đá (so với rồng) tô tối viền vàng = chỗ an toàn
export function shadowblast(R, ctx, h, sim, t) {
  if (h.done) { const k = Math.max(0, h.fade / 0.6); ctx.globalAlpha = k * 0.6; disc(ctx, h.x, h.y, h.r, '#fff3c0'); ctx.globalAlpha = 1; return; }
  const pr = 1 - h.t / h.T, flash = h.t < 0.15 && Math.floor(t * 30) % 2 === 0, B = STY.fire.band;
  ctx.globalAlpha = 0.16 + pr * 0.22; disc(ctx, h.x, h.y, h.r, flash ? '#ffffff' : '#ff3a10'); ctx.globalAlpha = 1;
  // lưới than hồng lan dần từ tâm ra
  const rr = h.r * pr; ctx.globalAlpha = 0.5;
  for (let a = 0; a < 6.283; a += 0.05) sq(ctx, h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr, WPP * 2, a * 10 % 2 < 1 ? B[3] : B[2]);
  ctx.globalAlpha = 1;
  // khoảng trống: rõ trong 0.8s đầu, sau đó chỉ còn lấp lánh rất mờ
  const el = h.T - h.t, vis = el < 0.8 ? 1 : 0.12 + 0.1 * Math.sin(t * 9);
  for (const q of h.pockets || []) {
    ctx.globalAlpha = vis * 0.55; disc(ctx, q.x, q.y, q.r, '#1a1020'); ctx.globalAlpha = vis;
    for (let a = 0; a < 6.283; a += 0.22) sq(ctx, q.x + Math.cos(a + t) * q.r, q.y + Math.sin(a + t) * q.r, WPP, '#ffd84a');
    ctx.globalAlpha = 1;
  }
}
