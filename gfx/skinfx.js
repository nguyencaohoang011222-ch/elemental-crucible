// Hiệu ứng kỹ năng theo SKIN. Mỗi chủ đề (theme) có: bảng màu, ký hiệu đặc trưng (glyph) hiện khi chiêu nổ/tung,
// hạt riêng (motif) và kiểu vệt đạn. Hạng skin quyết định chiêu nào được đổi hiệu ứng (TIERS trong profile.js).
import { WPP, sn } from './pixel.js';

// rare: chiêu đơn · epic: + đòn thường/tụ lực + đi/lướt · victory: + chiêu ghép 2 · heroes/boss: toàn bộ (cả tuyệt kỹ ghép 3)
const COVER = { common: [], rare: ['single'], epic: ['basic', 'move', 'single'], victory: ['basic', 'move', 'single', 'duo'], boss: ['basic', 'move', 'single', 'duo', 'ult'], heroes: ['basic', 'move', 'single', 'duo', 'ult'] };
export const covers = (fx, cat) => !!fx && (COVER[fx.tier] || []).includes(cat);
export function catOfSkill(sk) { if (!sk) return 'basic'; if (sk.group === 'ULTIMATE' || sk.tier === 3) return 'ult'; if (sk.dual) return 'duo'; const c = sk.combo || sk.els || []; return c.length >= 2 && c[0] !== c[1] ? 'duo' : 'single'; }

const H = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sq = (ctx, x, y, s, c) => { const z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.fillRect(sn(x - z / 2), sn(y - z / 2), z, z); };
function line(ctx, x1, y1, x2, y2, s, c, step = WPP * 2) { const L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(L / step)), z = Math.max(WPP, sn(s)); ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i <= n; i++) ctx.rect(sn(x1 + (x2 - x1) * i / n - z / 2), sn(y1 + (y2 - y1) * i / n - z / 2), z, z); ctx.fill(); }
function ring(ctx, x, y, r, s, c, gaps = 0, rot = 0) { const n = Math.max(16, Math.floor(r * 6.283 / (WPP * 2))); for (let i = 0; i < n; i++) { if (gaps && Math.floor(i / (n / gaps / 2)) % 2) continue; const q = rot + i / n * 6.283; sq(ctx, x + Math.cos(q) * r, y + Math.sin(q) * r * 0.85, s, c); } }
function disc(ctx, x, y, r, c) { ctx.fillStyle = c; const X = sn(x), Y = sn(y); ctx.beginPath(); for (let dy = -r; dy <= r; dy += WPP) { const w = sn(Math.sqrt(Math.max(0, r * r - dy * dy))); if (w > 0) ctx.rect(X - w, Y + sn(dy * 0.85), w * 2, WPP); } ctx.fill(); }
function star(ctx, x, y, r, c, pts = 5, rot = -Math.PI / 2) { const P = []; for (let i = 0; i < pts; i++) { const a = rot + i * 6.283 / pts; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } for (let i = 0; i < pts; i++) { const [a1, b1] = P[i], [a2, b2] = P[(i + 2) % pts]; line(ctx, a1, b1, a2, b2, WPP, c, WPP); } }

// ---------- chủ đề ----------
// glyph(ctx, x, y, r, k, t, P): k = tiến độ 0→1 của hiệu ứng (dùng để nở ra / mờ dần)
export const THEMES = {
  radiant: { name: 'Radiant', pal: ['#6a4a10', '#c8983a', '#ffe27a', '#ffffff'], motif: ['star', 'feather'], trail: ['#ffe27a', '#ffffff'],
    glyph(c, x, y, r, k, t, P) { ring(c, x, y, r * (0.6 + k * 0.5), WPP * 2, P[2]); for (let i = 0; i < 8; i++) { const a = i * 0.785 + t; line(c, x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.3, x + Math.cos(a) * r * (0.7 + k * 0.5), y + Math.sin(a) * r * (0.6 + k * 0.4), WPP, i % 2 ? P[1] : P[3]); } line(c, x, y - r * 0.55, x, y + r * 0.4, WPP * 2, P[3]); line(c, x - r * 0.3, y - r * 0.2, x + r * 0.3, y - r * 0.2, WPP * 2, P[3]); } },
  abyss: { name: 'Abyss', pal: ['#0a0614', '#3a1a6a', '#a87aff', '#e8d8ff'], motif: ['rune', 'smoke'], trail: ['#a87aff', '#3a1a6a'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); ring(c, x, y, R0, WPP * 2, P[1]); ring(c, x, y, R0 * 0.8, WPP, P[2], 6, -t * 2); star(c, x, y, R0 * 0.75, P[2], 6, t); for (let i = 0; i < 6; i++) { const a = t + i * 1.047; sq(c, x + Math.cos(a) * R0, y + Math.sin(a) * R0 * 0.85, WPP * 3, P[3]); } } },
  dragonfire: { name: 'Dragonfire', pal: ['#2a0804', '#c8301a', '#ff8a2a', '#ffe08a'], motif: ['ember', 'smoke'], trail: ['#ff8a2a', '#ffe08a'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + s * (0.4 + i * 0.32); line(c, x + Math.cos(a) * R0 * 0.3, y + Math.sin(a) * R0 * 0.25, x + Math.cos(a) * R0 * (1 - i * 0.08), y + Math.sin(a) * R0 * (0.85 - i * 0.07), WPP * 2, i % 2 ? P[1] : P[2]); } for (let i = 0; i < 10; i++) { const a = i * 0.628 + t * 3, h = (8 + H(i, (t * 12) | 0) * 14) * (1 - k * 0.5); sq(c, x + Math.cos(a) * R0, y + Math.sin(a) * R0 * 0.8 - h, WPP * 2, P[3]); } } },
  frost: { name: 'Frost', pal: ['#0a2440', '#4a9ad8', '#bfe8ff', '#ffffff'], motif: ['flake', 'shard'], trail: ['#bfe8ff', '#ffffff'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (let i = 0; i < 6; i++) { const a = i * 1.047 + 0.3, ex = x + Math.cos(a) * R0, ey = y + Math.sin(a) * R0 * 0.85; line(c, x, y, ex, ey, WPP * 2, P[2]); for (const s of [-1, 1]) line(c, x + Math.cos(a) * R0 * 0.6, y + Math.sin(a) * R0 * 0.5, x + Math.cos(a + s * 0.5) * R0 * 0.85, y + Math.sin(a + s * 0.5) * R0 * 0.72, WPP, P[3]); } sq(c, x, y, WPP * 3, P[3]); } },
  shadow: { name: 'Shadow', pal: ['#06060c', '#24243a', '#9a6aff', '#e0d0ff'], motif: ['bat', 'smoke'], trail: ['#24243a', '#9a6aff'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); disc(c, x, y, R0 * 0.55, 'rgba(6,6,12,.55)'); for (let i = 0; i < 26; i++) { const a = -2.4 + i * 0.19; sq(c, x + Math.cos(a) * R0 * 0.7, y + Math.sin(a) * R0 * 0.6, WPP * 2, P[2]); } for (let i = 0; i < 20; i++) { const a = -2.2 + i * 0.2; sq(c, x + Math.cos(a) * R0 * 0.55 + R0 * 0.18, y + Math.sin(a) * R0 * 0.48, WPP * 2, P[0]); } ring(c, x, y, R0, WPP, P[1], 8, t); } },
  starlight: { name: 'Starlight', pal: ['#0e1a3a', '#3a6aa8', '#8ac8ff', '#ffffff'], motif: ['star', 'petal'], trail: ['#8ac8ff', '#ffffff'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6), pts = []; for (let i = 0; i < 6; i++) { const a = H(i, 3) * 6.283, d = R0 * (0.4 + H(i, 5) * 0.6); pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85]); } for (let i = 0; i < 5; i++) line(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], WPP, P[1], WPP * 3); for (const [px, py] of pts) { sq(c, px, py, WPP * 3, P[3]); sq(c, px - WPP * 2, py, WPP, P[2]); sq(c, px + WPP * 2, py, WPP, P[2]); sq(c, px, py - WPP * 2, WPP, P[2]); sq(c, px, py + WPP * 2, WPP, P[2]); } star(c, x, y, R0 * 0.45, P[2], 5, t); } },
  inferno: { name: 'Inferno', pal: ['#3a0a04', '#c83a14', '#ff7a2a', '#ffd84a'], motif: ['ember'], trail: ['#ff7a2a', '#ffd84a'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (let i = 0; i < 14; i++) { const a = i * 0.449, h = (10 + H(i, (t * 10) | 0) * 22) * (1 - k * 0.6), bx = x + Math.cos(a) * R0, by = y + Math.sin(a) * R0 * 0.8; line(c, bx, by, bx, by - h, WPP * 2, P[1]); line(c, bx, by - h * 0.3, bx, by - h * 0.9, WPP, P[3]); } ring(c, x, y, R0, WPP * 2, P[0]); } },
  void: { name: 'Void', pal: ['#02020a', '#2a2050', '#7fe0ff', '#e0f8ff'], motif: ['mote'], trail: ['#7fe0ff', '#2a2050'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.35 + k * 0.4); disc(c, x, y, R0 + 6, P[1]); disc(c, x, y, R0, P[0]); for (let i = 0; i < 3; i++) ring(c, x, y, R0 + 12 + i * 10, WPP, i === 1 ? P[2] : P[1], 3, t * (2 + i)); for (let i = 0; i < 6; i++) { const a = -t * 3 + i * 1.047, d = R0 + 20 + (i % 2) * 12; sq(c, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, WPP * 2, P[3]); } } },
  celestial: { name: 'Celestial', pal: ['#2a0e5a', '#ffb81a', '#fff2a0', '#ffffff'],   // phán xét: tím vũ trụ · vàng mặt trời · trắng loá motif: ['star', 'feather'], trail: ['#fff4c0', '#e6c36a'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); ring(c, x, y, R0, WPP * 2, P[1]); ring(c, x, y, R0 * 0.62, WPP, P[2]); for (let i = 0; i < 8; i++) { const a = t * 1.5 + i * 0.785, sx = x + Math.cos(a) * R0, sy = y + Math.sin(a) * R0 * 0.85; sq(c, sx, sy, WPP * 3, P[3]); sq(c, sx - WPP * 2, sy, WPP, P[2]); sq(c, sx + WPP * 2, sy, WPP, P[2]); } for (let i = 0; i < 12; i++) { const a = i * 0.524; line(c, x + Math.cos(a) * R0 * 0.2, y + Math.sin(a) * R0 * 0.17, x + Math.cos(a) * R0 * 0.5, y + Math.sin(a) * R0 * 0.42, WPP, P[3]); } } },
  storm: { name: 'Storm', pal: ['#0c0a2a', '#3a6ad0', '#7fe0ff', '#ffe27a'], motif: ['bolt', 'spark'], trail: ['#7fe0ff', '#ffe27a'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6), sd = (t * 20) | 0; for (let i = 0; i < 6; i++) { let px = x, py = y; const a = i * 1.047 + H(i, sd) * 0.4; for (let j = 1; j <= 4; j++) { const d = R0 * j / 4, nx = x + Math.cos(a + (H(j, sd + i) - 0.5) * 0.6) * d, ny = y + Math.sin(a + (H(sd, j + i) - 0.5) * 0.6) * d * 0.85; line(c, px, py, nx, ny, WPP * 2, j > 2 ? P[2] : P[3], WPP); px = nx; py = ny; } } ring(c, x, y, R0, WPP, P[1], 6, t); } },
  magma: { name: 'Magma', pal: ['#1c0e08', '#5a3a2a', '#ff6a1e', '#ffd36b'], motif: ['rock', 'ember'], trail: ['#ff6a1e', '#5a3a2a'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (let i = 0; i < 9; i++) { const a = i * 0.698 + 0.2; let px = x, py = y; for (let j = 1; j <= 3; j++) { const d = R0 * j / 3, nx = x + Math.cos(a + (H(i, j) - 0.5) * 0.5) * d, ny = y + Math.sin(a + (H(j, i) - 0.5) * 0.5) * d * 0.85; line(c, px, py, nx, ny, WPP * 2, P[0], WPP); line(c, px, py, nx, ny, WPP, P[2], WPP); px = nx; py = ny; } } for (let i = 0; i < 6; i++) { const a = i * 1.047; disc(c, x + Math.cos(a) * R0, y + Math.sin(a) * R0 * 0.85, 6, P[1]); } } },
  glacier: { name: 'Glacier', pal: ['#0a1e3a', '#2f7ac8', '#c8f4ff', '#ffffff'], motif: ['shard', 'flake'], trail: ['#c8f4ff', '#2f7ac8'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (let i = 0; i < 9; i++) { const a = i * 0.698, bx = x + Math.cos(a) * R0, by = y + Math.sin(a) * R0 * 0.85, h = 12 + (i % 3) * 8; for (let j = 0; j < h; j += WPP) sq(c, bx, by - j, Math.max(WPP, (h - j) * 0.5), j < h * 0.3 ? P[1] : P[2]); sq(c, bx, by - h, WPP, P[3]); } } },
  spore: { name: 'Sporeback', pal: ['#14200a', '#7a2ab0', '#3ad0e0', '#c8ff6a'], motif: ['spore'], trail: ['#c8ff6a', '#b45ae8'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (let i = 0; i < 7; i++) { const a = i * 0.898 + 0.2, mx = x + Math.cos(a) * R0, my = y + Math.sin(a) * R0 * 0.85, cr = 7 + (i % 3) * 3; line(c, mx, my, mx, my - cr, WPP, '#d0d0b8', WPP); for (let dx = -cr; dx <= cr; dx += WPP) sq(c, mx + dx, my - cr - Math.sqrt(Math.max(0, cr * cr - dx * dx)) * 0.5, WPP * 2, i % 2 ? P[1] : P[2]); sq(c, mx, my - cr - 2, WPP, P[3]); } } },
  wyrm: { name: 'Ignivar', pal: ['#24080a', '#9a2e1c', '#ff7a2a', '#ffe27a'], motif: ['ember', 'smoke'], trail: ['#ff7a2a', '#9a2e1c'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6); for (let i = -1; i <= 1; i++) { const ox = i * R0 * 0.35; for (let j = 0; j < 10; j++) { const u = j / 9; sq(c, x + ox + (u - 0.5) * R0 * 0.5, y - R0 * 0.6 + u * R0 * 1.2, WPP * (3 - Math.abs(u - 0.5) * 3), j > 6 ? P[3] : P[2]); } } ring(c, x, y, R0, WPP, P[1], 4, t); } },
  tempest: { name: 'Stormcrown', pal: ['#1a1030', '#6a4aa8', '#a8f0ff', '#ffe27a'], motif: ['bolt', 'star'], trail: ['#a8f0ff', '#6a4aa8'],
    glyph(c, x, y, r, k, t, P) { const R0 = r * (0.5 + k * 0.6), cy = y - R0 * 0.2; line(c, x - R0 * 0.5, cy, x + R0 * 0.5, cy, WPP * 2, P[3]); for (let i = 0; i < 5; i++) { const px = x - R0 * 0.5 + i * R0 * 0.25; line(c, px, cy, px, cy - R0 * (i % 2 ? 0.25 : 0.45), WPP * 2, P[3]); } ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff'].forEach((col, i) => { const a = t * 2 + i * 1.571; sq(c, x + Math.cos(a) * R0, y + Math.sin(a) * R0 * 0.85, WPP * 3, col); }); } }
};
for (const [k, v] of Object.entries(THEMES)) v.id = k;
export const themeOf = id => THEMES[id] || null;

// ---------- hạt riêng ----------
export function motif(R, th, x, y, n = 6, spread = 30, kind) {
  const L = R.skp || (R.skp = []);
  for (let i = 0; i < n; i++) {
    const m = kind || th.motif[i % th.motif.length], a = Math.random() * 6.283, d = Math.random() * spread, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8, c = th.pal[1 + (i % 3)];
    const o = { m, x: px, y: py, vx: 0, vy: 0, life: 0.7, max: 0.7, c, rot: Math.random() * 6.283 };
    if (m === 'ember') { o.vy = -60 - Math.random() * 60; o.vx = (Math.random() - 0.5) * 30; o.life = o.max = 0.6; }
    else if (m === 'flake' || m === 'feather' || m === 'petal') { o.vy = 30 + Math.random() * 20; o.vx = (Math.random() - 0.5) * 50; o.life = o.max = 1.0; }
    else if (m === 'smoke') { o.vy = -25; o.vx = (Math.random() - 0.5) * 20; o.life = o.max = 0.9; o.c = th.pal[0]; }
    else if (m === 'star' || m === 'spark') { o.vx = Math.cos(a) * 60; o.vy = Math.sin(a) * 60; o.life = o.max = 0.5; }
    else if (m === 'bolt') { o.life = o.max = 0.18; }
    else if (m === 'rock') { o.vx = Math.cos(a) * 120; o.vy = -120 - Math.random() * 60; o.g = 400; o.life = o.max = 0.7; }
    else if (m === 'shard') { o.vx = Math.cos(a) * 140; o.vy = Math.sin(a) * 100; o.life = o.max = 0.45; }
    else if (m === 'spore') { o.vy = -18; o.vx = (Math.random() - 0.5) * 16; o.life = o.max = 1.3; }
    else if (m === 'mote') { o.tx = x; o.ty = y; o.x = x + Math.cos(a) * (spread + 30); o.y = y + Math.sin(a) * (spread + 30); o.life = o.max = 0.5; }
    else if (m === 'bat') { o.vx = (Math.random() - 0.5) * 140; o.vy = -60 - Math.random() * 60; o.life = o.max = 0.8; }
    else if (m === 'rune') { o.vy = -30; o.life = o.max = 0.8; }
    L.push(o);
  }
  if (L.length > 500) L.splice(0, L.length - 500);
}
// ---------- ký hiệu đặc trưng (bung ra rồi mờ) ----------
export function glyph(R, th, x, y, r, T = 0.55) { (R.skg || (R.skg = [])).push({ th, x, y, r, t: 0, T }); }

export function drawSkinFx(R, ctx, dt, t) {
  if (R.skg) { for (const g of R.skg) { g.t += dt; const k = Math.min(1, g.t / g.T); ctx.globalAlpha = Math.max(0, 1 - k * k); g.th.glyph(ctx, g.x, g.y, g.r, k, t, g.th.pal); } ctx.globalAlpha = 1; R.skg = R.skg.filter(g => g.t < g.T); }
  if (R.skp) {
    for (const o of R.skp) {
      o.life -= dt; if (o.m === 'mote') { const k = 1 - o.life / o.max; o.x += (o.tx - o.x) * Math.min(1, dt * 6); o.y += (o.ty - o.y) * Math.min(1, dt * 6); } else { o.x += o.vx * dt; o.y += o.vy * dt; if (o.g) o.vy += o.g * dt; }
      o.rot += dt * 4; const a = Math.max(0, o.life / o.max); ctx.globalAlpha = a;
      switch (o.m) {
        case 'star': case 'spark': sq(ctx, o.x, o.y, WPP, '#ffffff'); sq(ctx, o.x - WPP, o.y, WPP, o.c); sq(ctx, o.x + WPP, o.y, WPP, o.c); sq(ctx, o.x, o.y - WPP, WPP, o.c); sq(ctx, o.x, o.y + WPP, WPP, o.c); break;
        case 'flake': for (let i = 0; i < 3; i++) { const q = o.rot + i * 1.047; sq(ctx, o.x + Math.cos(q) * 4, o.y + Math.sin(q) * 4, WPP, o.c); sq(ctx, o.x - Math.cos(q) * 4, o.y - Math.sin(q) * 4, WPP, o.c); } break;
        case 'feather': case 'petal': line(ctx, o.x - Math.cos(o.rot) * 4, o.y - Math.sin(o.rot) * 2, o.x + Math.cos(o.rot) * 4, o.y + Math.sin(o.rot) * 2, WPP, o.c, WPP); break;
        case 'smoke': ctx.globalAlpha = a * 0.5; disc(ctx, o.x, o.y, 6 + (1 - a) * 10, o.c); break;
        case 'bolt': { let px = o.x, py = o.y - 14; for (let i = 0; i < 3; i++) { const nx = o.x + (H(i, o.rot * 10 | 0) - 0.5) * 10, ny = py + 9; line(ctx, px, py, nx, ny, WPP, i ? o.c : '#ffffff', WPP); px = nx; py = ny; } break; }
        case 'rock': sq(ctx, o.x, o.y, WPP * 2, o.c); sq(ctx, o.x - WPP, o.y - WPP, WPP, '#ffd36b'); break;
        case 'shard': line(ctx, o.x, o.y, o.x - o.vx * 0.04, o.y - o.vy * 0.04, WPP, o.c, WPP); sq(ctx, o.x, o.y, WPP, '#ffffff'); break;
        case 'spore': ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(o.rot * 3)); sq(ctx, o.x, o.y, WPP * 2, o.c); break;
        case 'bat': { const f = Math.sin(o.rot * 4) > 0 ? 1 : -1; sq(ctx, o.x, o.y, WPP, '#06060c'); sq(ctx, o.x - WPP * 2, o.y - WPP * f, WPP * 2, '#06060c'); sq(ctx, o.x + WPP * 2, o.y - WPP * f, WPP * 2, '#06060c'); break; }
        case 'rune': for (let i = 0; i < 4; i++) { const q = o.rot + i * 1.571; sq(ctx, o.x + Math.cos(q) * 4, o.y + Math.sin(q) * 4, WPP, o.c); } sq(ctx, o.x, o.y, WPP, '#ffffff'); break;
        default: sq(ctx, o.x, o.y, WPP * 2, o.c);
      }
    }
    ctx.globalAlpha = 1; R.skp = R.skp.filter(o => o.life > 0);
  }
}

// ---------- gắn hiệu ứng vào sự kiện chiêu ----------
const IMPACT = new Set(['whirl', 'slam', 'trapPop', 'boom', 'spike', 'rainHit', 'trapSet', 'zone']);
export function onSkinEvent(R, e, th, cat) {
  const r = e.r || 60;
  switch (e.ev) {
    case 'skill': glyph(R, th, e.x, e.y + 8, cat === 'ult' ? 90 : 48, cat === 'ult' ? 0.8 : 0.5); motif(R, th, e.x, e.y - 10, cat === 'ult' ? 18 : 8, 30); break;
    case 'swing': case 'arcSlash': { const range = e.range || e.reach || 104, arc = e.arc || 1.4; for (let i = 0; i < 6; i++) { const q = e.a + (i / 5 - 0.5) * arc; motif(R, th, e.x + Math.cos(q) * range * 0.85, e.y + Math.sin(q) * range * 0.85, 1, 6); } if (e.ev === 'arcSlash' || e.charge > 0.6) glyph(R, th, e.x + Math.cos(e.a) * range * 0.6, e.y + Math.sin(e.a) * range * 0.6, Math.min(70, range * 0.5), 0.4); break; }
    case 'knightWave': glyph(R, th, e.x, e.y, e.r * 0.8, 0.5); motif(R, th, e.x, e.y, 14, e.r * 0.6); break;
    case 'beam': { for (let i = 0; i <= 8; i++) motif(R, th, e.x1 + (e.x2 - e.x1) * i / 8, e.y1 + (e.y2 - e.y1) * i / 8, 1, 10); glyph(R, th, e.x2, e.y2, 50, 0.45); break; }
    case 'blink': glyph(R, th, e.x1, e.y1, 40, 0.4); glyph(R, th, e.x2, e.y2, 52, 0.5); motif(R, th, e.x2, e.y2, 10, 30); break;
    case 'volley': motif(R, th, e.x, e.y, 6, 16); break;
    case 'dash': glyph(R, th, e.x, e.y + 8, 30, 0.35); motif(R, th, e.x, e.y, 8, 16); break;
    default: if (IMPACT.has(e.ev)) { if (e.ev !== 'rainHit' || e.big || Math.random() < 0.35) glyph(R, th, e.x, e.y, Math.min(120, Math.max(30, r)), 0.5); motif(R, th, e.x, e.y, e.ev === 'rainHit' ? 2 : 8, Math.min(60, r * 0.6)); }
  }
}
// đạn: lõi + quầng theo bảng màu của skin, vệt hạt riêng
export function skinShot(R, ctx, s, th, t) {
  const P = th.pal, a = s.a ?? Math.atan2(s.vy, s.vx), ca = Math.cos(a), sa = Math.sin(a), big = (s.r || 6) > 10;
  for (let i = 1; i <= (big ? 6 : 4); i++) sq(ctx, s.x - ca * i * 6, s.y - sa * i * 6, WPP * (big ? 4 : 2) * (1 - i / 8), i < 2 ? P[3] : P[1 + (i % 2)]);
  sq(ctx, s.x, s.y, WPP * (big ? 4 : 2), P[3]);
  if (Math.random() < (big ? 0.7 : 0.35)) motif(R, th, s.x - ca * 8, s.y - sa * 8, 1, 4);
}
// di chuyển (chỉ HEROES): bụi bước chân + hào quang dưới chân
export function skinMove(R, ctx, p, th, t, moving, dt) {
  const P = th.pal; ctx.globalAlpha = 0.3 + 0.1 * Math.sin(t * 4); ring(ctx, p.x, p.y + 10, 20, WPP, P[2], 4, t * 1.5); ctx.globalAlpha = 1;
  if (moving) { R._skStep = (R._skStep || 0) - dt; if (R._skStep <= 0) { R._skStep = 0.12; motif(R, th, p.x, p.y + 8, 1, 6); } }
}
