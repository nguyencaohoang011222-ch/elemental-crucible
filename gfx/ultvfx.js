// Hiệu ứng 12 tuyệt kỹ: vật thể sống (g.ults) + sự kiện (ultfx/ultCast). Pixel dải bậc theo bảng màu của chiêu.
import { WPP, sn } from './pixel.js';
import { disc } from './bossvfx.js';
import { drawTrench } from './trench.js';

const H = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sq = (ctx, x, y, s, c) => { const z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.fillRect(sn(x - z / 2), sn(y - z / 2), z, z); };
function line(ctx, x1, y1, x2, y2, s, c, step = WPP * 2) { const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L / step)); for (let i = 0; i <= n; i++) sq(ctx, x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, s, c); }
function bolt(ctx, x1, y1, x2, y2, seed, c1, c2, w = 3) { let px = x1, py = y1; const n = 8; for (let i = 1; i <= n; i++) { const k = i / n, x = x1 + (x2 - x1) * k + (i < n ? (H(i, seed) - 0.5) * 34 : 0), y = y1 + (y2 - y1) * k + (i < n ? (H(seed, i) - 0.5) * 20 : 0); line(ctx, px, py, x, y, WPP * w, c1, WPP); line(ctx, px, py, x, y, WPP, c2, WPP); px = x; py = y; } }
function ringPix(ctx, x, y, r, s, c, jit = 0, seed = 0) { const n = Math.max(20, Math.floor(r * 6.283 / (WPP * 2))); for (let i = 0; i < n; i++) { const q = i / n * 6.283, rr = r + (H(i, seed) - 0.5) * jit; sq(ctx, x + Math.cos(q) * rr, y + Math.sin(q) * rr, s, c); } }

// ---------- vật thể đang tồn tại ----------
export function drawUlts(R, ctx, sim, t) {
  for (const o of sim.ults || []) {
    const P = R.ultPal || o.pal || ['#222', '#888', '#ccc', '#fff'], k = o.t / o.life, tf = Math.floor(t * 14);   // skin HEROES/Boss nhuộm cả vật thể tuyệt kỹ
    switch (o.kind) {
      case 'sunder': { // lốc đá quanh người chơi
        const p = sim.p; for (let i = 0; i < 18; i++) { const a = t * 9 + i * 0.35, r = 40 + (i % 3) * 22 + Math.sin(t * 6 + i) * 6; sq(ctx, p.x + Math.cos(a) * r, p.y - 14 + Math.sin(a) * r * 0.45, WPP * (i % 3 ? 2 : 3), i % 4 ? P[1] : P[2]); }
        ringPix(ctx, p.x, p.y + 8, 70 + Math.sin(t * 10) * 6, WPP, P[3], 8, tf); break;
      }
      case 'titan': { const p = sim.p; ctx.globalAlpha = 0.35; ringPix(ctx, p.x, p.y + 10, 46, WPP * 2, P[2], 6, tf); ctx.globalAlpha = 1; if (Math.random() < 0.3) R.parts.push({ x: p.x + (Math.random() - 0.5) * 50, y: p.y + 10, vx: 0, vy: -30, life: 0.6, max: 0.6, c: P[1], s: 5 }); break; }
      case 'pentagram': { // ngôi sao bẫy: đỉnh nhấp nháy + nét nối chấm
        const arm = o.armed <= 0, pts = o.pts; ctx.globalAlpha = arm ? 0.85 : 0.4;
        for (let i = 0; i < 5; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 2) % 5]; const L = Math.hypot(x2 - x1, y2 - y1), n = Math.floor(L / (WPP * 3)); for (let j = 0; j < n; j++) if ((j + tf) % 3) sq(ctx, x1 + (x2 - x1) * j / n, y1 + (y2 - y1) * j / n, WPP, P[2]); }
        ctx.globalAlpha = 1; for (const [x, y] of pts) { disc(ctx, x, y, 14, P[0]); disc(ctx, x, y, 10, arm && tf % 2 ? P[3] : P[1]); sq(ctx, x, y, WPP * 2, P[3]); } break;
      }
      case 'decoy': { // phân thân: bóng người mờ màu sương
        const fl = 0.55 + 0.2 * Math.sin(t * 12 + o.uid); ctx.globalAlpha = fl; disc(ctx, o.x, o.y + 10, 12, 'rgba(0,0,0,.4)');
        ctx.fillStyle = P[1]; ctx.fillRect(sn(o.x - 6), sn(o.y - 24), 12, 24); ctx.fillStyle = P[2]; ctx.fillRect(sn(o.x - 6), sn(o.y - 33), 12, 9); ctx.fillStyle = P[3]; ctx.fillRect(sn(o.x + 0), sn(o.y - 30), 3, 3);
        ringPix(ctx, o.x, o.y + 8, 22 + (tf % 3) * 3, WPP, P[2]); ctx.globalAlpha = 1; break;
      }
      case 'sun': { // mặt trời: lõi trắng, quầng răng cưa, tia xoay, vòng hút
        const pulse = 1 + 0.08 * Math.sin(t * 14), r = (36 + k * 18) * pulse;
        ctx.globalAlpha = 0.35; ringPix(ctx, o.x, o.y, 320 * (1 - (t * 0.8) % 1), WPP, P[2], 10, tf); ctx.globalAlpha = 1;
        for (let i = 0; i < 12; i++) { const a = t * 2 + i * 0.524; line(ctx, o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, o.x + Math.cos(a) * (r + 22 + (i % 2) * 14), o.y + Math.sin(a) * (r + 22 + (i % 2) * 14), WPP * 2, P[2], WPP); }
        disc(ctx, o.x, o.y, r + 8, P[1]); disc(ctx, o.x, o.y, r, P[2]); disc(ctx, o.x, o.y, r * 0.65, P[3]); disc(ctx, o.x, o.y, r * 0.35, '#ffffff');
        if (Math.random() < 0.8) { const a = Math.random() * 6.283, d = 160 + Math.random() * 150; R.parts.push({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, vx: -Math.cos(a) * d * 2, vy: -Math.sin(a) * d * 2, life: 0.4, max: 0.4, c: P[2], s: 4 }); } break;
      }
      case 'tide': { // con sóng: dải bậc cong, bọt trắng trên đỉnh
        const ca = Math.cos(o.a), sa = Math.sin(o.a), nx = -sa, ny = ca;
        for (let s = -o.w / 2; s <= o.w / 2; s += WPP * 3) { const curl = Math.sin(s * 0.02 + t * 6) * 10, bx = o.x + nx * s, by = o.y + ny * s;
          for (const [d, c, w] of [[-34, P[0], 5], [-22, P[1], 5], [-10, P[2], 4], [0 + curl * 0.3, P[3], 3]]) sq(ctx, bx + ca * (d + curl), by + sa * (d + curl), WPP * w, c);
          if (H(s | 0, tf) < 0.25) sq(ctx, bx + ca * (6 + curl), by + sa * (6 + curl), WPP * 2, '#ffffff'); }
        if (Math.random() < 0.9) R.parts.push({ x: o.x + nx * (Math.random() - 0.5) * o.w, y: o.y + ny * (Math.random() - 0.5) * o.w, vx: ca * 200, vy: sa * 200 - 60, life: 0.4, max: 0.4, c: '#e8f8ff', s: 4 }); break;
      }
      case 'cloud': { // mây giông: khối mây pixel tối, chớp bên trong, bóng đổ
        ctx.globalAlpha = 0.25; disc(ctx, o.x, o.y + 10, 90, '#000'); ctx.globalAlpha = 1;
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 0.6, r = 30 + (i % 3) * 18; disc(ctx, o.x + Math.cos(a) * r, o.y - 120 + Math.sin(a) * r * 0.4, 30 - (i % 3) * 4, i % 2 ? P[0] : P[1]); }
        if (tf % 7 === 0) disc(ctx, o.x + (H(tf, 1) - 0.5) * 60, o.y - 120, 16, P[3]);
        if (Math.random() < 0.6) R.parts.push({ x: o.x + (Math.random() - 0.5) * 150, y: o.y - 100, vx: -20, vy: 380, life: 0.35, max: 0.35, c: P[2], s: 3 }); break;
      }
    }
  }
}

// ---------- sự kiện ngắn ----------
export function ultEvent(R, e) {
  (R.ufx = R.ufx || []).push({ ...e, t: 0, T: { bigArrow: 0.45, cometFall: e.d || 0.8, meteorFall: e.d || 0.5, bombMark: e.d || 0.5, charge: 0.55, trench: 2.2, supernova: 0.6, starLines: 0.5, slashLine: 0.25, lightning: 0.25 }[e.name] || 0.45 });
  const P = e.pal || ['#222', '#888', '#ccc', '#fff'];
  if (['bigSlam', 'fireRing', 'stoneNova', 'crater', 'bomb', 'supernova', 'steamBurst'].includes(e.name)) { R.addShake(e.name === 'supernova' ? 14 : e.name === 'bigSlam' || e.name === 'stoneNova' ? 8 : 4); for (let i = 0; i < 18; i++) { const a = Math.random() * 6.283, v = 120 + Math.random() * 220; R.parts.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 60, life: 0.5, max: 0.5, c: P[1 + (i % 3)], s: 5 }); } }
  if (e.name === 'lightning') R.addShake(3);
}
export function drawUltEvents(R, ctx, dt, t) {
  if (!R.ufx) return;
  for (const f of R.ufx) {
    f.t += dt; const k = Math.min(1, f.t / f.T), P = f.pal || ['#222', '#888', '#ccc', '#fff'], fade = 1 - k, tf = Math.floor(t * 20);
    ctx.globalAlpha = Math.max(0, fade);
    switch (f.name) {
      case 'bigSlam': case 'fireRing': case 'stoneNova': case 'crater': case 'steamBurst': {
        const r = f.r * (0.4 + k * 0.7); ringPix(ctx, f.x, f.y, r, WPP * 3, P[0], 12, tf); ringPix(ctx, f.x, f.y, r, WPP * 2, P[f.name === 'steamBurst' ? 2 : 1], 12, tf); ringPix(ctx, f.x, f.y, r * 0.96, WPP, P[3], 8, tf + 1);
        if (f.name === 'stoneNova' || f.name === 'crater') for (let i = 0; i < 8; i++) { const a = i * 0.785 + 0.3; line(ctx, f.x, f.y, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.8, WPP, P[0], WPP * 2); }
        break;
      }
      case 'slashLine': { line(ctx, f.x, f.y, f.x2, f.y2, WPP * 4, P[0]); line(ctx, f.x, f.y, f.x2, f.y2, WPP * 2, P[2]); line(ctx, f.x, f.y, f.x2, f.y2, WPP, '#ffffff'); break; }
      case 'charge': { ctx.globalAlpha = 1; const r = 50 * (1 - k) + 8; ringPix(ctx, f.x, f.y, r, WPP * 2, P[2]); for (let i = 0; i < 6; i++) { const a = t * 10 + i; sq(ctx, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, WPP * 2, P[3]); } break; }
      case 'bigArrow': { const ca = Math.cos(f.a), sa = Math.sin(f.a), L = 1100 * k; for (let u = Math.max(0, L - 260); u < L; u += WPP * 3) { const w = (u - (L - 260)) / 260; sq(ctx, f.x + ca * u, f.y + sa * u, WPP * (2 + w * 5), u > L - 40 ? '#ffffff' : P[1 + Math.floor(w * 2)]); } break; }
      case 'meteorFall': case 'cometFall': { ctx.globalAlpha = 1; const big = f.name === 'cometFall', h = (1 - k) * (big ? 520 : 320), x = f.x + h * 0.6, y = f.y - h, r = big ? 30 : 14;
        for (let i = 1; i < 10; i++) disc(ctx, x + i * (big ? 14 : 8), y - i * (big ? 22 : 12), r * (1 - i / 11), i % 2 ? P[1] : P[2]);
        disc(ctx, x, y, r + 4, P[0]); disc(ctx, x, y, r, P[2]); disc(ctx, x, y, r * 0.5, P[3]); ctx.globalAlpha = 0.35 + k * 0.4; ringPix(ctx, f.x, f.y, big ? 170 : 85, WPP, P[1]); break; }
      case 'bombMark': { ctx.globalAlpha = 0.5 + 0.5 * (tf % 2); sq(ctx, f.x, f.y, WPP * 2, P[3]); ringPix(ctx, f.x, f.y, 30 * (1 - k) + 12, WPP, P[2]); break; }
      case 'bomb': { const r = 60 * (0.3 + k); disc(ctx, f.x, f.y, r, P[1]); disc(ctx, f.x, f.y, r * 0.6, P[2]); disc(ctx, f.x, f.y, r * 0.3, P[3]); break; }
      case 'supernova': { const r = f.r * (0.2 + k); disc(ctx, f.x, f.y, r, P[2]); disc(ctx, f.x, f.y, r * 0.75, P[3]); ringPix(ctx, f.x, f.y, r + 10, WPP * 3, P[1], 16, tf); break; }
      case 'starLines': { for (let i = 0; i < 5; i++) { const [x1, y1] = f.pts[i], [x2, y2] = f.pts[(i + 2) % 5]; line(ctx, x1, y1, x2, y2, WPP * 5, P[1]); line(ctx, x1, y1, x2, y2, WPP * 2, '#ffffff'); } break; }
      case 'trench': drawTrench(ctx, f, k, t, R.trenchTheme || 'default', R); break;   // khe nứt thon nhọn, không còn thanh chữ nhật
      case 'lightning': { bolt(ctx, f.x + 10, f.y - 130, f.x, f.y, tf, P[1], '#ffffff', 3); disc(ctx, f.x, f.y, 26 * (1 - k) + 6, P[2]); break; }
    }
  }
  ctx.globalAlpha = 1; R.ufx = R.ufx.filter(f => f.t < f.T);
}
// lúc tung tuyệt kỹ: quầng vàng + tên chiêu lớn
export function ultCastFx(R, e) { R.addShake(6); R.flash = Math.max(R.flash || 0, 0); R.ultBanner = { s: e.name, t: 1.4, T: 1.4, c: (e.pal && e.pal[2]) || '#ffd36b' }; (R.ufx = R.ufx || []).push({ name: 'supernova', x: e.x, y: e.y, r: 90, t: 0, T: 0.35, pal: e.pal }); }
