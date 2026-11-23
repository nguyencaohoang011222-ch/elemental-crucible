// Ngoại hình skin: mỗi skin đổi HÌNH DÁNG pixel thật (mũ, giáp vai, áo choàng, cánh, vũ khí), không skin nào chỉ đổi màu.
// rig.js dựng nhân vật theo lớp: back (sau lưng) → thân → body (đè lên thân) → đầu (head thay mũ / hat đè lên mũ) → tay trước → front.
// Mỗi skin = một "look": danh sách bộ phận + thông số vũ khí. Bộ phận dùng chung cho cả 3 tướng (skin boss) hoặc riêng từng tướng.
import { Grid } from './pixel.js';
import { BOSS_SKINS } from '../profile.js';

const sh = (pal, v) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(v * (pal.length - 1))))];
const H = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const px = (g, list, c) => { for (const [x, y] of list) g.set(x, y, c); };
const ifSet = (g, x, y, c) => { if (g.get(x, y)) g.set(x, y, c); };   // chỉ tô lên chỗ đã có pixel (giữ đúng dáng)
function poly(g, pts, c) {
  let y0 = Infinity, y1 = -Infinity; for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y + 0.5) !== (by <= y + 0.5)) xs.push(ax + (y + 0.5 - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) g.set(x, y, typeof c === 'function' ? c(x, y) : c);
  }
}
const FUR = ['#b8bcc8', '#e4e8f0', '#ffffff'], GOLD = ['#6a4a10', '#c8983a', '#e6c36a', '#ffe27a'], HAIR = ['#141016', '#241c22', '#3a2e34'];
const FIRE = ['#c83a14', '#ff7a2a', '#ffd84a', '#fff4c0'], ICE = ['#2f6aa8', '#6ab8e8', '#c8f4ff', '#ffffff'];
const SKIN_C = new Set(['#c8986e', '#f0c9a0', '#ffe2c4']);
const robeX = (K, y) => { const s = (y - 10) / 3 | 0, d = y > 15 ? (K.P.hem | 0) : 0; return [5 + K.ln - s + d, 10 + K.ln + s + d]; };
// ô thân (áo giáp hoặc áo choàng pháp sư) để vẽ hoa văn bám theo dáng
function bodyCells(K, fn) {
  const { ln, by } = K;
  if (!K.robe) { for (let y = 10; y <= 14; y++) for (let x = 5 + ln; x <= 10 + ln; x++) fn(x, y + by, x - 5 - ln, y - 10); return; }
  for (let y = 10; y <= 19; y++) { const [x0, x1] = robeX(K, y); for (let x = x0; x <= x1; x++) fn(x, y + (y < 15 ? by : 0), x - x0, y - 10); }
}
const armAt = (K, front) => front ? [10 + K.ln + (K.P.arx | 0), 10 + K.by + (K.P.ary | 0)] : [4 + K.ln + (K.P.alx | 0), 10 + K.by + (K.P.aly | 0)];

// ================= bộ phận =================
export const PARTS = {
  // ---------- dùng chung ----------
  hairBack(K, o = {}) { const { g, hx, hy } = K, c = o.c || '#5a3a1e'; g.rect(hx, hy + 3, 1, 3, c); g.set(hx + 1, hy + 3, c); },
  beard(K, o = {}) { const { g, hx, hy } = K; g.rect(hx + 3, hy + 6, 3, 1, o.c || K.C.hair || '#e8e8f0'); },
  eyes(K, o = {}) { const { g, hx, hy, P } = K; if (P.eyes === 'closed' || P.eyes === 'hurt') return; g.set(hx + 4, hy + 4, o.c); g.set(hx + 6, hy + 4, o.c); },
  shadowFace(K, o = {}) { const { g, hx, hy, P } = K; for (let y = hy + 2; y <= hy + 6; y++) for (let x = hx + 1; x <= hx + 7; x++) if (SKIN_C.has(g.get(x, y))) g.set(x, y, y > hy + 4 ? '#14101c' : '#221a2e'); if (P.eyes !== 'closed') { g.set(hx + 4, hy + 4, o.eye || '#c07aff'); g.set(hx + 6, hy + 4, o.eye || '#c07aff'); } },
  cape(K, o = {}) {
    const { g, ln, by, P } = K, C = o.pal || K.C.cape || K.C.robe, f = P.cape | 0, y1 = o.long ? 18 : 17;
    for (let y = 10; y <= y1; y++) {
      const w = 3 + ((Math.min(17, y) - 10) >> 1), x0 = 6 + ln - w - (y > 12 ? f : 0);
      for (let i = 0; i < w + 2; i++) {
        const x = x0 + i; if (o.hem === 'tatter' && y >= y1 - 1 && (x + y) % 3 === 0) continue;
        let c = sh(C, 0.25 + i / (w + 2) * 0.6);
        if (o.deco === 'coins' && (x * 7 + y * 3) % 6 === 0) c = GOLD[3];
        if (o.deco === 'stars' && H(x, y) < 0.16) c = (x + y + K.af) % 3 ? '#ffffff' : '#8ac8ff';
        if (o.deco === 'moss' && y > 13 && (x * 3 + y) % 4 === 0) c = (x + K.af) % 5 ? '#4e7f2a' : '#c8ff6a';
        g.set(x, y + by, c);
      }
    }
    const w = 6, x0 = 6 + ln - w - f, yb = y1 + by;
    if (o.hem === 'fur') g.rect(x0 - 1, yb, w + 4, 1, (i, j, x) => FUR[1 + (x & 1)]);
    if (o.hem === 'gold') g.rect(x0, yb, w + 2, 1, (i, j, x) => GOLD[2 + (x & 1)]);
    if (o.hem === 'icicle') for (let i = 0; i < w + 2; i += 2) { const L = 1 + ((i >> 1) % 2); for (let k = 1; k <= L; k++) g.set(x0 + i, yb + k, k === L ? ICE[3] : ICE[2]); }
    if (o.hem === 'tatter') for (let i = 1; i < w + 2; i += 3) { g.set(x0 + i, yb + 1, sh(C, 0.2)); g.set(x0 + i - (f ? 1 : 0), yb + 2, sh(C, 0.05)); }
    if (o.hem === 'zigzag') for (let i = 0; i < w + 2; i++) g.set(x0 + i, yb - ((i % 4) < 2 ? 0 : 1), o.zc || GOLD[3]);
    if (o.hem === 'embers') for (let i = 0; i < w + 2; i++) { g.set(x0 + i, yb, (i + K.af) % 3 ? '#3a1a10' : '#ff5a1a'); if (i % 2 === 0) g.set(x0 + i, yb + 1, (i + K.af) % 4 ? '#ff7a2a' : '#ffd36b'); }
  },
  pads(K, o = {}) {
    const { g, ln, by } = K, M = o.c || GOLD, y = 9 + by, h = o.h || 2;
    for (const [x0, fr] of [[3 + ln, 0], [9 + ln, 1]]) {
      g.rect(x0, y, 4, h, (i, j) => sh(M, 0.95 - j * 0.35 - (fr ? 0 : 0.2) - (i === 0 || i === 3 ? 0.12 : 0)));
      if (o.rim) g.rect(x0, y + h - 1, 4, 1, o.rim);
      if (o.spikes) for (const [dx, dy] of o.spikes) g.set(x0 + (fr ? 3 - dx : dx), y - dy, o.spikeC || M[M.length - 1]);
      if (o.tassel) for (let i = 0; i < 4; i += 2) { g.set(x0 + i + fr, y + h, o.tassel[0]); g.set(x0 + i + fr, y + h + 1, o.tassel[1]); }
    }
  },
  // ---------- lễ hội: Giáng sinh ----------
  santa(K, o = {}) {
    const { g, hx, hy } = K, R = o.c || ['#6a0e0e', '#a81e1e', '#d83a3a'];
    g.rect(hx, hy, 8, 1, (i) => i > 5 ? R[2] : R[1]); g.rect(hx + 1, hy - 1, 6, 1, (i) => i > 3 ? R[2] : R[1]);
    g.rect(hx + 1, hy - 2, 4, 1, R[1]); g.rect(hx, hy - 3, 3, 1, R[0]); g.rect(hx - 1, hy - 4, 2, 1, R[0]);
    g.rect(hx - 3, hy - 5, 2, 2, (i, j) => j ? FUR[1] : FUR[2]);
    g.rect(hx - 1, hy + 1, 10, 2, (i, j, x) => FUR[(j ? 0 : 1) + (x & 1)]);
  },
  wizSanta(K) {
    const { g, hx, hy } = K, R = K.C.hat;
    g.rect(hx, hy, 8, 1, (i) => sh(R, 0.5 + i * 0.06)); g.rect(hx + 1, hy - 1, 6, 1, R[2]); g.rect(hx + 1, hy - 2, 5, 1, R[1]);
    g.rect(hx + 1, hy - 3, 4, 1, R[1]); g.rect(hx, hy - 4, 3, 1, R[0]); g.rect(hx - 1, hy - 5, 2, 1, R[0]);
    g.rect(hx - 3, hy - 6, 2, 2, (i, j) => j ? FUR[1] : FUR[2]);
    g.rect(hx - 1, hy + 1, 10, 2, (i, j, x) => FUR[(j ? 0 : 1) + (x & 1)]);
    px(g, [[hx + 6, hy], [hx + 7, hy], [hx + 7, hy - 1]], '#2a8a44'); g.set(hx + 6, hy - 1, '#ff3a3a');   // nhành ô-rô
  },
  antlers(K, o = {}) {
    const { g, hx, hy } = K, A = o.c || ['#4a2e16', '#7a5230', '#b0804a'];
    px(g, [[hx + 2, hy - 1], [hx + 2, hy - 2], [hx + 1, hy - 3], [hx + 1, hy - 4], [hx, hy - 5], [hx, hy - 3], [hx - 1, hy - 3], [hx + 2, hy - 4], [hx + 3, hy - 5]], A[0]);
    px(g, [[hx + 6, hy - 1], [hx + 6, hy - 2], [hx + 7, hy - 3], [hx + 7, hy - 4], [hx + 8, hy - 5], [hx + 8, hy - 3], [hx + 9, hy - 3], [hx + 6, hy - 4], [hx + 5, hy - 5]], A[1]);
    px(g, [[hx + 8, hy - 5], [hx + 9, hy - 3], [hx + 5, hy - 5]], A[2]);
    g.rect(hx, hy, 8, 1, o.band || '#2a8a44');
  },
  rudolph(K) { K.g.set(K.hx + 7, K.hy + 5, '#ff3a3a'); },
  hoodFur(K) { const { g, hx, hy } = K; g.rect(hx + 1, hy + 2, 7, 1, (i, j, x) => FUR[1 + (x & 1)]); g.rect(hx + 1, hy + 7, 7, 1, (i, j, x) => FUR[x & 1]); g.rect(hx - 3, hy + 1, 2, 2, (i, j) => j ? FUR[1] : FUR[2]); },
  scarf(K, o = {}) {
    const { g, hx, hy, P } = K, a = o.a || '#d83a3a', b = o.b || '#ffffff', f = (P.cape | 0) > 1 ? -1 : 0;
    g.rect(hx + 1, hy + 7, 7, 1, (i, j, x) => (x >> 1) & 1 ? a : b);
    px(g, [[hx, hy + 8], [hx - 1 + f, hy + 9]], a); px(g, [[hx - 1 + f, hy + 10], [hx - 2 + f, hy + 11]], b); g.set(hx - 2 + f, hy + 12, a);
  },
  furPads(K) { const { g, ln, by } = K; for (const x0 of [3 + ln, 9 + ln]) g.rect(x0, 9 + by, 4, 2, (i, j, x) => FUR[(j ? 0 : 1) + (x & 1)]); },
  candyBelt(K) { const { g, ln, by } = K; g.rect(5 + ln, 14 + by, 6, 1, (i, j, x) => x & 1 ? '#ffffff' : '#d83a3a'); px(g, [[11 + ln, 12 + by], [11 + ln, 13 + by], [12 + ln, 11 + by]], '#ffffff'); px(g, [[11 + ln, 14 + by], [12 + ln, 12 + by]], '#d83a3a'); },
  candyHem(K) {
    const { g } = K;
    for (let y = 15; y <= 17; y++) { const [x0, x1] = robeX(K, y); for (let x = x0; x <= x1; x++) ifSet(g, x, y, ((x + y) >> 1) & 1 ? '#ffffff' : '#d83a3a'); }
    for (let y = 18; y <= 19; y++) { const [x0, x1] = robeX(K, y); g.rect(x0 - 1, y, x1 - x0 + 3, 1, (i, j, x) => FUR[(y === 19 ? 0 : 1) + (x & 1)]); }
  },
  furCuffs(K) { const { g } = K; for (const fr of [0, 1]) { const [ax, ay] = armAt(K, fr); g.rect(ax - (fr ? 0 : 1), ay + 3, 3, 1, FUR[2]); } },
  // ---------- lễ hội: Tết ----------
  lionHead(K) {
    const { g, hx, hy } = K, R = K.C.helm;
    g.ell(hx + 3.5, hy + 0.3, 5.2, 3.6, (dx, dy) => sh(R, 0.85 - dy * 0.3 + dx * 0.1));
    for (let y = hy - 2; y <= hy + 5; y++) { g.set(hx - 2, y, GOLD[1 + (y & 1)]); if (y & 1) g.set(hx - 3, y, GOLD[2]); }
    px(g, [[hx - 1, hy - 3], [hx + 1, hy - 4], [hx + 6, hy - 4], [hx + 8, hy - 3]], GOLD[3]);
    g.rect(hx, hy - 1, 8, 1, GOLD[2]);
    for (const ex of [hx + 1, hx + 5]) { g.rect(ex, hy, 2, 2, '#ffffff'); g.set(ex + 1, hy + 1, '#141016'); }
    px(g, [[hx + 3, hy - 4], [hx + 4, hy - 5], [hx + 4, hy - 4]], GOLD[3]);
    g.rect(hx + 1, hy + 3, 7, 1, (i) => i & 1 ? '#ffffff' : GOLD[2]);
    px(g, [[hx + 8, hy + 4], [hx + 8, hy + 5], [hx + 7, hy + 6]], '#ffffff');
  },
  tasselPads(K) { PARTS.pads(K, { c: GOLD, tassel: [GOLD[3], '#d82a1e'] }); },
  silkTunic(K) {
    const { g, ln, by } = K; if (K.robe) return;
    px(g, [[7 + ln, 10 + by], [8 + ln, 10 + by]], GOLD[3]);
    for (let y = 11; y <= 13; y++) g.set(8 + ln, y + by, y === 12 ? GOLD[1] : GOLD[3]);
    px(g, [[6 + ln, 12 + by], [10 + ln, 11 + by], [5 + ln, 11 + by]], GOLD[2]); g.rect(5 + ln, 14 + by, 6, 1, GOLD[2]);
  },
  topknot(K) {
    const { g, hx, hy, P } = K, f = (P.cape | 0) > 1 ? 1 : 0;
    g.rect(hx, hy, 8, 2, (i, j) => sh(HAIR, 0.8 - j * 0.4 + (i > 5 ? 0.2 : 0))); g.rect(hx, hy + 2, 2, 4, HAIR[0]);
    g.rect(hx + 2, hy - 2, 3, 2, HAIR[1]); g.rect(hx + 1, hy - 2, 5, 1, GOLD[2]); g.set(hx + 6, hy - 2, '#d82a1e');
    g.rect(hx, hy + 1, 8, 1, '#c82a2a'); g.set(hx + 5, hy + 1, GOLD[3]);
    px(g, [[hx - 1, hy + 1], [hx - 2, hy + 2], [hx - 2, hy + 3], [hx - 3 - f, hy + 4]], '#c82a2a'); px(g, [[hx - 3 - f, hy + 5], [hx - 4 - f, hy + 5], [hx - 4 - f, hy + 6]], GOLD[2]);
  },
  lantern(K) { const { g, ln, by, af } = K, x = 1 + ln, y = 13 + by; g.set(x + 1, y, GOLD[2]); g.rect(x, y + 1, 3, 1, GOLD[1]); g.rect(x, y + 2, 3, 2, (i) => i === 1 ? (af & 1 ? '#ffe27a' : '#ffb03a') : '#d82a1e'); g.rect(x, y + 4, 3, 1, GOLD[1]); g.set(x + 1, y + 5, af & 1 ? '#ffd36b' : '#d82a1e'); },
  jadeCrown(K) {
    const { g, hx, hy, P } = K, J = ['#0e5a3a', '#2a9a6a', '#7ae8b0'], f = (P.cape | 0) > 1 ? 1 : 0;
    g.rect(hx, hy + 1, 8, 2, (i, j) => HAIR[j ? 0 : 1]); g.rect(hx, hy + 3, 2, 4, HAIR[0]);
    for (let k = 0; k < 6; k++) g.set(hx - 1 - (k > 3 ? f : 0), hy + 3 + k, HAIR[k & 1]);
    g.rect(hx + 2, hy - 1, 4, 2, HAIR[1]); g.rect(hx + 2, hy - 2, 4, 1, J[1]); g.rect(hx + 2, hy - 3, 4, 1, GOLD[2]); g.rect(hx + 3, hy - 4, 2, 1, J[2]);
    g.rect(hx, hy - 1, 8, 1, (i) => i > 1 && i < 6 ? GOLD[3] : GOLD[2]); g.set(hx - 1, hy - 1, J[2]); g.set(hx + 8, hy - 1, J[2]);
    px(g, [[hx - 2, hy], [hx - 2, hy + 1]], GOLD[2]); g.set(hx - 2, hy + 2, '#d82a1e');
  },
  jadePendant(K) {
    const { g, ln, by } = K, J = ['#0e5a3a', '#2a9a6a', '#7ae8b0'];
    px(g, [[6 + ln, 10 + by], [9 + ln, 10 + by], [7 + ln, 11 + by], [8 + ln, 11 + by]], GOLD[3]);
    g.rect(7 + ln, 12 + by, 2, 2, (i, j) => i === 0 && j === 0 ? J[2] : J[1]); g.set(7 + ln, 14 + by, GOLD[2]); g.set(8 + ln, 15, GOLD[2]);
    for (let y = 15; y <= 18; y++) { const [x0, x1] = robeX(K, y); ifSet(g, (x0 + x1) >> 1, y, GOLD[2]); }
  },
  sleeves(K) { const { g, C } = K; for (const fr of [0, 1]) { const [ax, ay] = armAt(K, fr); g.rect(ax - 1, ay + 1, 4, 3, (i, j) => j === 2 ? GOLD[2] : sh(C.arm, 0.4 + i * 0.15)); } },
  // ---------- Royal Gold ----------
  crown(K, o = {}) {
    const { g, hx, hy } = K, G = o.c || GOLD, y = hy - 1;
    g.rect(hx, y, 8, 1, (i) => G[i & 1 ? 2 : 1]);
    px(g, [[hx, y - 1], [hx + 2, y - 1], [hx + 3, y - 1], [hx + 4, y - 1], [hx + 5, y - 1], [hx + 7, y - 1], [hx + 3, y - 2], [hx + 4, y - 2]], G[2]);
    px(g, [[hx, y - 2], [hx + 7, y - 2], [hx + 3, y - 3], [hx + 4, y - 3]], G[3]);
    g.set(hx + 2, y, '#ff3a3a'); g.set(hx + 5, y, '#3a8aff'); g.set(hx + 4, y - 1, '#ffffff');
  },
  sunTabard(K) { const { g, ln, by } = K; g.rect(7 + ln, 11 + by, 2, 2, (i, j) => i + j === 0 ? GOLD[3] : GOLD[2]); px(g, [[6 + ln, 11 + by], [9 + ln, 12 + by], [7 + ln, 13 + by], [8 + ln, 10 + by], [6 + ln, 13 + by], [9 + ln, 10 + by]], GOLD[1]); g.rect(5 + ln, 14 + by, 6, 1, GOLD[2]); },
  // ---------- Obsidian ----------
  horns(K, o = {}) {
    const { g, hx, hy } = K, c = o.c || ['#16161e', '#2a2a36', '#44445a'], tip = o.tip || '#a87aff';
    px(g, [[hx, hy], [hx - 1, hy - 1], [hx - 1, hy - 2], [hx - 2, hy - 3]], c[1]); px(g, [[hx, hy - 1], [hx - 2, hy - 2]], c[0]); g.set(hx - 2, hy - 4, tip);
    px(g, [[hx + 7, hy], [hx + 8, hy - 1], [hx + 8, hy - 2], [hx + 9, hy - 3]], c[2]); px(g, [[hx + 7, hy - 1], [hx + 9, hy - 2]], c[1]); g.set(hx + 9, hy - 4, tip);
    if (o.crest) px(g, [[hx + 3, hy - 1], [hx + 4, hy - 1], [hx + 4, hy - 2], [hx + 5, hy - 1]], c[1]);
  },
  visor(K, o = {}) { const { g, hx, hy, af } = K; g.rect(hx + 2, hy + 3, 6, 1, (i) => (i + af) % 3 ? o.c : (o.c2 || o.c)); },
  rune(K, o = {}) { const { g, ln, by, af } = K, c = af & 1 ? (o.c2 || '#e8d8ff') : o.c; px(g, [[7 + ln, 11 + by], [8 + ln, 11 + by], [7 + ln, 12 + by], [9 + ln, 12 + by], [6 + ln, 12 + by], [8 + ln, 13 + by]], c); },
  // ---------- Dragon Knight ----------
  dragonHorns(K, o = {}) {
    const { g, hx, hy, af } = K, B = o.c || ['#2a0a08', '#5a1a10', '#8a2a14'];
    px(g, [[hx + 1, hy], [hx, hy - 1], [hx - 1, hy - 1], [hx - 2, hy - 2], [hx - 3, hy - 2], [hx - 4, hy - 3]], B[2]); px(g, [[hx + 1, hy - 1], [hx, hy - 2], [hx - 1, hy - 2]], B[1]);
    px(g, [[hx + 5, hy - 1], [hx + 4, hy - 2], [hx + 3, hy - 3], [hx + 2, hy - 4], [hx + 1, hy - 5]], B[2]); px(g, [[hx + 6, hy - 1], [hx + 5, hy - 2], [hx + 4, hy - 3]], B[1]);
    const a = af & 1, b = (af >> 1) & 1;
    px(g, [[hx - 5, hy - 3 - a], [hx - 4, hy - 4]], FIRE[1]); g.set(hx - 5, hy - 4 - a, FIRE[2 + b]); g.set(hx - 6, hy - 4, FIRE[0]);
    px(g, [[hx + 1, hy - 6 - b], [hx, hy - 6]], FIRE[1]); g.set(hx + 1, hy - 7 + a, FIRE[2 + a]); g.set(hx, hy - 7, FIRE[0]);
  },
  snout(K) { const { g, hx, hy } = K, c = K.C.helm; g.rect(hx + 8, hy + 1, 1, 3, c[1]); g.set(hx + 9, hy + 2, c[2]); g.set(hx + 9, hy + 3, c[1]); g.set(hx + 9, hy + 1, '#1a0a0a'); g.rect(hx + 3, hy + 3, 5, 1, (i) => i & 1 ? '#ffb04a' : '#ff5a1a'); },
  scales(K) { const { g, ln, by, af } = K; bodyCells(K, (x, y, u, v) => { if ((u + v) % 2 === 0 && v % 2) ifSet(g, x, y, K.C.body[0]); }); g.rect(7 + ln, 12 + by, 2, 1, af & 1 ? FIRE[3] : FIRE[2]); g.set(7 + ln, 11 + by, FIRE[1]); },
  dragonWings(K, o = {}) {
    const { g, ln, by, P } = K, M = o.pal || ['#2a0806', '#6a1410', '#a82a18'], S = o.spar || '#1a0806', fl = P.cape | 0;
    const sx = 5 + ln, sy = 10 + by, ex = 1 + ln, ey = 4 + by + fl, tx = -3 + ln, ty = 7 + by + fl;
    poly(g, [[sx, sy], [ex, ey], [tx, ty], [tx, 13 + by], [tx + 2, 12 + by], [tx + 3, 16 + by], [tx + 5, 14 + by], [sx - 1, 17 + by]], (x, y) => (o.tatter && y > 13 + by && (x + y) % 3 === 0) ? null : sh(M, 0.2 + (x - tx) / 9 * 0.7));
    g.line(sx, sy, ex, ey, S); g.line(ex, ey, tx, ty, S); g.line(ex, ey, tx + 2, 12 + by, S); g.line(ex, ey, tx + 5, 14 + by, S);
    g.set(ex, ey - 1, o.claw || '#e6d29a'); g.set(tx, ty - 1, o.claw || '#e6d29a');
  },
  // ---------- Titanslayer ----------
  stormCrown(K) {
    const { g, hx, hy, af } = K, y = hy - 1;
    g.rect(hx, y, 8, 1, (i) => GOLD[1 + (i & 1)]);
    px(g, [[hx, y - 1], [hx + 1, y - 2], [hx + 3, y - 1], [hx + 4, y - 2], [hx + 4, y - 3], [hx + 6, y - 1], [hx + 7, y - 2]], GOLD[2]);
    g.set(hx + 4, y, '#7fe0ff'); px(g, [[hx + 5, y - 4], [hx + 4, y - 5 + (af & 1)]], af & 1 ? '#7fe0ff' : '#ffffff');
  },
  hairTop(K, o = {}) { const { g, hx, hy } = K, c = o.c || ['#c8b8ff', '#e8e0ff']; g.rect(hx, hy + 1, 8, 2, (i, j) => c[j ? 0 : 1]); g.rect(hx, hy + 3, 2, 4, c[0]); g.rect(hx - 1, hy + 4, 1, 4, c[0]); },
  zigzagRobe(K, o = {}) { const { g } = K; for (let y = 15; y <= 19; y++) { const [x0, x1] = robeX(K, y); for (let x = x0; x <= x1; x++) if ((x + (y >> 1)) % 4 === (y & 1)) ifSet(g, x, y, o.c || '#7fe0ff'); } },
  // ---------- Frost Ranger ----------
  iceSpikes(K) { const { g, hx, hy } = K; px(g, [[hx + 1, hy - 1], [hx + 2, hy - 1], [hx + 4, hy - 1], [hx + 4, hy - 2], [hx + 6, hy - 1]], ICE[2]); px(g, [[hx + 2, hy - 2], [hx + 4, hy - 3], [hx + 6, hy - 2]], ICE[3]); },
  furCollar(K) { const { g, hx, hy } = K; g.rect(hx, hy + 7, 9, 1, (i, j, x) => FUR[1 + (x & 1)]); g.set(hx + 2, hy + 8, FUR[1]); },
  iceShoulder(K) { const { g, ln, by } = K; g.rect(9 + ln, 9 + by, 4, 2, (i, j) => ICE[2 - j]); px(g, [[11 + ln, 8 + by], [12 + ln, 7 + by], [10 + ln, 8 + by]], ICE[3]); },
  // ---------- Shadow Stalker ----------
  deepCowl(K) {
    const { g, hx, hy, P } = K, C = K.C.hood, f = (P.cape | 0) > 1 ? 1 : 0;
    g.rect(hx, hy - 1, 8, 3, (i, j) => sh(C, 0.8 - j * 0.2 - i * 0.04));
    px(g, [[hx - 1, hy], [hx - 1, hy + 1], [hx - 2, hy + 1], [hx - 2, hy + 2], [hx - 3 - f, hy + 2], [hx - 4 - f, hy + 3]], C[1]);
    g.rect(hx, hy + 2, 2, 6, C[0]); g.rect(hx + 2, hy + 2, 7, 1, C[1]); g.set(hx + 8, hy + 3, C[1]);
    g.rect(hx + 3, hy + 5, 5, 2, '#1a1a24');
  },
  wisps(K) { const { g, ln, by, af } = K; for (let k = 0; k < 3; k++) { const x = -1 + ln + ((k * 3 + af) % 7), y = 19 + by + ((k + af) & 1); g.set(x, y, k === 1 ? '#c07aff' : '#3a3a5a'); } },
  // ---------- Starlight Huntress ----------
  starCrown(K) {
    const { g, hx, hy, P, af } = K, Hc = ['#3a6aa8', '#8ac8ff', '#e0f0ff'], f = (P.cape | 0) > 1 ? 1 : 0;
    g.rect(hx, hy, 8, 2, (i, j) => sh(Hc, 0.45 + i * 0.07 - j * 0.15)); g.rect(hx, hy + 2, 2, 4, Hc[0]); g.set(hx + 1, hy + 2, Hc[1]);
    for (let k = 0; k < 7; k++) g.rect(hx - 1 - (k > 3 ? f : 0) - (k >> 2), hy + 3 + k, 2, 1, sh(Hc, 0.6 - k * 0.07));
    g.rect(hx + 1, hy + 1, 7, 1, (i) => i & 1 ? '#c8d8f0' : '#ffffff');
    px(g, [[hx + 2, hy], [hx + 6, hy], [hx + 4, hy]], '#e0ecff'); g.set(hx + 4, hy - 1, '#ffffff');
    const tw = af & 1; g.set(hx + 4, hy - 2, '#ffffff'); px(g, tw ? [[hx + 3, hy - 2], [hx + 5, hy - 2], [hx + 4, hy - 3]] : [[hx + 4, hy - 3]], '#8ac8ff');
  },
  moonPad(K) { const { g, ln, by } = K; px(g, [[10 + ln, 9 + by], [11 + ln, 9 + by], [12 + ln, 10 + by], [12 + ln, 11 + by], [11 + ln, 12 + by]], '#e6d29a'); g.set(11 + ln, 10 + by, '#fff4c0'); },
  // ---------- pháp sư: Inferno / Void / Celestial ----------
  flameHat(K) {
    const { g, hx, hy, af } = K, C = K.C.hat;
    g.rect(hx - 1, hy + 2, 10, 1, C[1]); g.rect(hx + 1, hy + 1, 6, 1, K.C.trim); g.rect(hx + 1, hy, 6, 1, (i) => sh(C, 0.8 - i * 0.1)); g.rect(hx + 2, hy - 1, 4, 1, C[2]);
    const base = [2, 4, 3, 2];
    for (let c = 0; c < 4; c++) { const h = base[c] + ((c + af) % 3 === 0 ? 1 : 0); for (let k = 0; k < h; k++) g.set(hx + 2 + c - (k > 2 ? 1 : 0), hy - 2 - k, FIRE[Math.min(3, k === h - 1 ? 3 : k + 1)]); }
  },
  flameHem(K) {
    const { g, af } = K;
    for (let y = 15; y <= 19; y++) { const [x0, x1] = robeX(K, y); for (let x = x0; x <= x1; x++) { const d = y - 15 - ((x + af) % 3); if (d >= 0) ifSet(g, x, y, FIRE[Math.min(2, d)]); }
      if (y >= 16) { if ((y + af) & 1) g.set(x0 - 1, y, FIRE[1]); if ((y + af + 1) & 1) g.set(x1 + 1, y, FIRE[2]); } }
  },
  voidHood(K) {
    const { g, hx, hy } = K, C = K.C.hat;
    g.rect(hx, hy - 1, 8, 3, (i, j) => sh(C, 0.85 - j * 0.2 - i * 0.04)); g.rect(hx - 1, hy, 1, 3, C[1]); g.rect(hx, hy + 2, 2, 6, C[0]); g.rect(hx - 2, hy + 1, 1, 2, C[0]);
    g.rect(hx + 2, hy + 2, 6, 1, C[0]); px(g, [[hx + 2, hy - 1], [hx + 5, hy]], '#7fe0ff');
  },
  runeHalo(K) {
    const { g, hx, hy, af } = K, y0 = hy - 6, pts = [[hx + 1, y0], [hx + 3, y0], [hx + 5, y0], [hx + 7, y0 + 1], [hx + 5, y0 + 2], [hx + 3, y0 + 2], [hx + 1, y0 + 2], [hx - 1, y0 + 1]];
    pts.forEach(([x, y], i) => g.set(x, y, i === af * 2 || i === (af * 2 + 4) % 8 ? '#e0f8ff' : i & 1 ? '#7fe0ff' : '#4a3a80'));
  },
  starSpeckle(K) { const { g, af } = K; bodyCells(K, (x, y) => { if (H(x, y) < 0.13) ifSet(g, x, y, H(x + af, y) < 0.5 ? '#e0f8ff' : '#7fe0ff'); }); },
  floatShards(K) { const { g, hx, hy, af } = K, b = af & 1; px(g, [[hx - 3, hy + 6 + b], [hx - 3, hy + 8 + b]], '#4a3a80'); g.set(hx - 3, hy + 7 + b, '#7fe0ff'); px(g, [[hx + 10, hy + 8 - b], [hx + 10, hy + 10 - b]], '#4a3a80'); g.set(hx + 10, hy + 9 - b, '#e0f8ff'); },
  laurel(K) {
    const { g, hx, hy } = K, Hh = ['#c8983a', '#ffe27a'], L = ['#7a9a3a', '#c8d86a'];
    g.rect(hx, hy + 1, 8, 2, (i, j) => Hh[j ? 0 : 1]); g.rect(hx, hy + 3, 2, 3, Hh[0]); g.rect(hx - 1, hy + 3, 1, 4, Hh[0]);
    g.rect(hx, hy + 1, 8, 1, GOLD[2]); px(g, [[hx + 1, hy], [hx + 3, hy], [hx + 5, hy], [hx - 1, hy + 1], [hx - 1, hy]], L[1]); px(g, [[hx + 2, hy], [hx + 4, hy], [hx - 2, hy + 1]], L[0]);
  },
  halo(K) { const { g, hx, hy, af } = K, y0 = hy - 5 - (af < 2 ? 1 : 0); g.rect(hx + 1, y0, 6, 1, GOLD[2]); g.rect(hx + 1, y0 + 2, 6, 1, GOLD[3]); g.set(hx, y0 + 1, GOLD[2]); g.set(hx + 7, y0 + 1, GOLD[3]); g.set(hx + 2 + af, y0 + 2, '#ffffff'); },
  angelWings(K) {
    const { g, ln, by, P } = K, F = ['#b8b8d0', '#e0e0f0', '#ffffff'], fl = P.cape | 0, sx = 5 + ln, sy = 10 + by, top = 3 + by + fl;
    poly(g, [[sx, sy], [sx - 2, top + 1], [sx - 6, top], [sx - 9, top + 3], [sx - 9, top + 6], [sx - 7, 14 + by], [sx - 4, 16 + by], [sx - 1, 15 + by]], (x) => sh(F, 0.3 + (x - (sx - 9)) / 9 * 0.65));
    for (let k = 0; k < 4; k++) { const yy = top + 3 + k * 3; for (let x = sx - 9 + k; x < sx - 1; x += 2) ifSet(g, x, yy, F[0]); }
    g.line(sx, sy, sx - 6, top, GOLD[2]);
  },
  goldStripes(K) { const { g } = K; for (let y = 11; y <= 19; y++) { const [x0, x1] = robeX(K, y); ifSet(g, x0 + 1, y + (y < 15 ? K.by : 0), GOLD[2]); ifSet(g, x1 - 1, y + (y < 15 ? K.by : 0), GOLD[2]); } },
  // ---------- skin boss (dùng chung 3 tướng) ----------
  stoneHelm(K) {
    const { g, hx, hy, af } = K, S = ['#1c1210', '#3a2a22', '#5a4234', '#7a5a44'], L = ['#ff5a1a', '#ffd36b'];
    g.rect(hx, hy, 8, 3, (i, j) => sh(S, 0.85 - j * 0.25 - i * 0.03)); px(g, [[hx + 1, hy - 1], [hx + 2, hy - 1], [hx + 4, hy - 1], [hx + 5, hy - 1], [hx + 6, hy - 1]], S[2]);
    g.rect(hx, hy + 3, 2, 3, S[1]); g.rect(hx + 2, hy + 3, 6, 1, '#0c0806'); g.set(hx + 4, hy + 3, L[af & 1]); g.set(hx + 6, hy + 3, L[af & 1]);
    px(g, [[hx, hy - 1], [hx - 1, hy - 2], [hx + 7, hy - 1], [hx + 8, hy - 2]], S[3]); g.set(hx - 1, hy - 3, L[af & 1]); g.set(hx + 8, hy - 3, L[1 - (af & 1)]);
    px(g, [[hx + 3, hy], [hx + 4, hy + 1], [hx + 3, hy + 2]], L[(af >> 1) & 1]);
  },
  fissures(K) { const { g, af } = K; let i = 0; bodyCells(K, (x, y, u, v) => { if (Math.abs(u - 2 - Math.round(Math.sin(v * 1.3) * 1.5)) < 1 || (v === 3 && u > 2)) { ifSet(g, x, y, (i + af) % 3 ? '#ff5a1a' : '#ffd36b'); i++; } }); },
  mushroomCap(K) {
    const { g, hx, hy, af } = K, Cp = ['#2a1a40', '#4a2a6a', '#7a4aa8', '#b47ae8'];
    g.ell(hx + 3.5, hy + 1, 6.4, 4, (dx, dy) => dy > 0.25 ? null : sh(Cp, 0.75 - dy * 0.35 + dx * 0.12));
    g.rect(hx - 2, hy + 1, 12, 1, Cp[1]); g.rect(hx - 1, hy + 2, 10, 1, (i) => i & 1 ? '#b8b098' : '#d8d0b8');
    px(g, [[hx + 1, hy - 2], [hx + 5, hy - 2], [hx + 7, hy - 1], [hx - 1, hy], [hx + 3, hy]], (af & 1) ? '#e8f0ff' : '#3ad0e0'); g.set(hx + 3, hy - 2, '#e8f0ff');
  },
  shroomPads(K) { const { g, ln, by, af } = K, Cp = ['#4a2a6a', '#7a4aa8', '#b47ae8']; for (const x0 of [3 + ln, 9 + ln]) { g.rect(x0 + 1, 8 + by, 2, 1, Cp[2]); g.rect(x0, 9 + by, 4, 1, Cp[1]); g.rect(x0, 10 + by, 4, 1, '#d8d0b8'); g.set(x0 + 1 + (af & 1), 9 + by, '#c8ff6a'); } },
  iceCrown(K) {
    const { g, hx, hy } = K;
    g.rect(hx, hy, 8, 3, (i, j) => sh(['#1c2a3e', '#2e4466', '#4a7aa8', '#8ab8e0'], 0.9 - j * 0.25 - i * 0.03)); g.rect(hx, hy + 3, 2, 4, '#2e4466');
    for (const [c, h] of [[0, 2], [2, 4], [4, 5], [6, 3], [7, 2]]) for (let k = 0; k < h; k++) { g.set(hx + c, hy - 1 - k, k === h - 1 ? ICE[3] : k > h / 2 ? ICE[2] : ICE[1]); if (h > 3 && k < 2) g.set(hx + c + 1, hy - 1 - k, ICE[1]); }
    g.set(hx + 4, hy + 1, '#6ef0ff');
  },
  dragonSkull(K) {
    const { g, hx, hy, af } = K, B = ['#8a7a5a', '#c8b48a', '#f0e0c0'];
    g.rect(hx, hy - 1, 8, 4, (i, j) => sh(B, 0.9 - j * 0.2 - i * 0.03)); g.rect(hx + 5, hy + 2, 5, 2, (i, j) => sh(B, 0.8 - j * 0.4)); g.rect(hx, hy + 3, 2, 3, B[0]);
    px(g, [[hx + 7, hy + 4], [hx + 9, hy + 4]], '#ffffff'); g.set(hx + 5, hy + 1, '#1a0a08'); g.set(hx + 6, hy + 1, af & 1 ? '#ffe27a' : '#ff7a2a');
    px(g, [[hx, hy - 2], [hx - 1, hy - 3], [hx - 2, hy - 3], [hx - 3, hy - 2], [hx - 3, hy - 1]], '#9a2e1c'); px(g, [[hx + 2, hy - 2], [hx + 1, hy - 3], [hx, hy - 4]], '#6a1a14');
  },
  floatingCrown(K) {
    const { g, hx, hy, af, C } = K, M = C.helm || C.hood || C.hat, y = hy - 3 - (af & 1);
    g.rect(hx, hy, 8, 2, (i, j) => sh(M, 0.8 - j * 0.3 - i * 0.04)); g.rect(hx, hy + 2, 2, 5, M[0]); g.rect(hx - 1, hy + 1, 1, 2, M[1]);
    g.rect(hx + 1, y, 6, 1, GOLD[2]); px(g, [[hx + 1, y - 1], [hx + 3, y - 1], [hx + 4, y - 1], [hx + 6, y - 1]], GOLD[3]); g.set(hx + 3, y, '#a8f0ff');
    const orbs = [[hx - 1, hy - 2], [hx + 2, hy - 6], [hx + 6, hy - 6], [hx + 9, hy - 2]], col = ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff'];
    orbs.forEach(([x, yy], i) => g.set(x, yy, col[(i + af) % 4]));
  },
  ermine(K) { const { g, hx, hy } = K; g.rect(hx, hy + 7, 9, 1, (i) => i % 3 === 1 ? '#1a1418' : '#ffffff'); }
};

// ================= từng skin =================
const BP = id => Object.values(BOSS_SKINS).find(b => b.id === id).m;
const DARK = ['#16161e', '#2a2a36', '#44445a', '#6a6a88'];
const LOOKS = {
  KNIGHT: {
    crimson: { head: ['santa', ['hairBack', { c: '#5a3a1e' }]], body: ['scarf', 'candyBelt'], front: ['furPads'], back: [['cape', { hem: 'fur' }]], noCape: true },
    ironclad: { head: ['lionHead'], body: ['silkTunic'], front: ['tasselPads'], back: [['cape', { hem: 'gold', deco: 'coins' }]], noCape: true },
    gold: { hat: ['crown'], noPlume: true, body: ['sunTabard'], front: [['pads', { c: GOLD, rim: '#fff4c0' }]], back: [['cape', { hem: 'gold', long: true }]], noCape: true,
      weapon: { len: 13, w: 1, edge: '#fff4c0', core: '#e6c36a', dark: '#8a6a1a', fuller: '#ffffff', guard: 'wing', guardC: GOLD, grip: '#2a44a0', gem: '#ff3a3a', gemG: '#3a8aff' } },
    obsidian: { hat: [['horns', { crest: true }], ['visor', { c: '#a87aff', c2: '#e8d8ff' }]], noPlume: true, body: [['rune', { c: '#a87aff' }]], front: [['pads', { c: DARK, rim: '#a87aff', spikes: [[0, 1], [1, 2], [3, 1]], spikeC: '#6a6a88' }]], back: [['cape', { hem: 'tatter', long: true }]], noCape: true, anim: true,
      weapon: { len: 13, w: 1, edge: '#c08aff', core: '#2a2a36', dark: '#0e0e14', guard: 'jag', guardC: ['#2a1040', '#6a3aa0', '#a87aff'], grip: '#1a0a2a', gem: '#a87aff', jag: true, glow: '#a87aff' } },
    dragonknight: { hat: ['dragonHorns', 'snout'], noPlume: true, body: ['scales'], front: [['pads', { c: ['#3a0a08', '#7a1a10', '#b8361a', '#ff7a2a'], spikes: [[1, 1], [2, 2]], spikeC: '#e6d29a' }]], back: ['dragonWings'], noCape: true, anim: true,
      weapon: { len: 16, w: 2, edge: '#ffb04a', core: '#3a1410', dark: '#1a0808', guard: 'claw', guardC: ['#3a0a08', '#7a1a10', '#e6d29a'], grip: '#2a0e0a', gem: '#ffd36b', cracks: ['#ff5a1a', '#ffd36b', '#ff9a2a'], glow: '#ff7a2a', anim: true } },
    titanslayer: { hat: ['stormCrown'], noPlume: true, front: [['pads', { c: ['#20203a', '#3a3a66', '#5a5a9a', '#8a8ad0'], rim: GOLD[3] }]], back: [['cape', { hem: 'zigzag', zc: '#7fe0ff' }]], noCape: true, anim: true,
      weapon: { len: 14, w: 1, edge: '#e0f8ff', core: '#7fe0ff', dark: '#3a3a66', guard: 'wing', guardC: GOLD, grip: '#20203a', gem: '#ffe27a', bolt: '#ffffff', glow: '#7fe0ff', anim: true } }
  },
  RANGER: {
    autumn: { hat: ['hoodFur', 'antlers', 'rudolph'], body: ['scarf'], back: [['cape', { hem: 'fur' }]], noCape: true },
    scout: { head: ['topknot'], body: ['silkTunic', 'lantern'], back: [['cape', { hem: 'gold', deco: 'coins' }]], noCape: true, anim: true },
    frost: { hat: ['iceSpikes', 'furCollar'], front: ['iceShoulder'], back: [['cape', { hem: 'icicle' }]], noCape: true,
      weapon: { limb: ['#2f6aa8', '#8ab8e0', '#e0f4ff'], tips: 'crystal', grip: '#3a4a5a', gem: '#6ef0ff', string: '#e0f4ff', glow: '#bfe8ff' } },
    shadow: { head: ['deepCowl', ['shadowFace', { eye: '#c07aff' }]], back: [['cape', { hem: 'tatter', long: true }], 'wisps'], noCape: true, anim: true,
      weapon: { limb: ['#0c0c14', '#24243a', '#3a3a5a'], tips: 'wisp', grip: '#14141c', gem: '#c07aff', string: '#c07aff', glow: '#9a6aff', anim: true } },
    starlight: { head: ['starCrown'], front: ['moonPad'], back: [['cape', { long: true, deco: 'stars' }]], noCape: true, anim: true,
      weapon: { limb: ['#0e1a3a', '#1e3a6a', '#3a6aa8'], tips: 'star', grip: '#c8d8f0', gem: '#ffffff', nodes: '#8ac8ff', string: '#e0f0ff', glow: '#8ac8ff', anim: true } },
    titanslayer: { hat: ['stormCrown'], front: [['pads', { c: ['#20203a', '#3a3a66', '#5a5a9a', '#8a8ad0'], rim: GOLD[3] }]], back: [['cape', { hem: 'zigzag', zc: '#7fe0ff' }]], noCape: true, anim: true,
      weapon: { limb: ['#3a3a66', '#5a5a9a', '#c8b8ff'], tips: 'bolt', grip: '#c8983a', gem: '#7fe0ff', string: '#ffe27a', glow: '#7fe0ff', anim: true } }
  },
  MAGE: {
    scholar: { head: ['wizSanta', 'beard'], body: ['candyHem'], front: ['furCuffs'] },
    seawitch: { head: ['jadeCrown'], body: ['jadePendant'], front: ['sleeves'] },
    inferno: { head: ['flameHat', ['eyes', { c: '#ffb03a' }], 'beard'], body: ['flameHem'], anim: true,
      weapon: { shaft: ['#3a1408', '#6a2a14'], len: 13, head: 'flame', bands: '#e6c36a', glow: '#ff7a2a', anim: true } },
    void: { head: ['voidHood', ['shadowFace', { eye: '#7fe0ff' }], 'runeHalo'], body: ['starSpeckle'], front: ['floatShards'], anim: true,
      weapon: { shaft: ['#0a0818', '#2a2050'], len: 13, head: 'orb', glow: '#7fe0ff', anim: true } },
    celestial: { head: ['laurel', 'halo'], back: ['angelWings'], body: ['goldStripes'], anim: true,
      weapon: { shaft: ['#c8983a', '#ffe27a'], len: 13, head: 'wing', glow: '#fff4c0', anim: true } },
    titanslayer: { head: ['hairTop', 'stormCrown'], body: [['zigzagRobe', { c: '#7fe0ff' }]], anim: true,
      weapon: { shaft: ['#20203a', '#5a5a9a'], len: 13, head: 'bolt', bands: '#ffe27a', glow: '#7fe0ff', anim: true } }
  }
};
// skin boss: cùng bộ phận cho cả 3 tướng, vũ khí theo tướng
const BOSS_LOOK = {
  ashen: { head: ['stoneHelm'], body: ['fissures'], front: [['pads', { c: ['#1c1210', '#3a2a22', '#5a4234', '#7a5a44'], rim: '#ff5a1a', spikes: [[0, 1], [3, 1]], spikeC: '#5a4234' }]], back: [['cape', { hem: 'embers', pal: BP('ashen').cape }]], noCape: true, anim: true,
    weapons: { KNIGHT: { len: 13, w: 2, edge: '#7a5a44', core: '#2a1a14', dark: '#1c1210', guard: 'jag', guardC: ['#1c1210', '#3a2a22', '#5a4234'], grip: '#2a1a14', gem: '#ff5a1a', cracks: ['#ff5a1a', '#ffd36b'], glow: '#ff5a1a', anim: true },
      RANGER: { limb: ['#1c1210', '#3a2a22', '#5a4234'], tips: 'lava', grip: '#2a1a14', gem: '#ff5a1a', string: '#ff9a4a', glow: '#ff5a1a', anim: true },
      MAGE: { shaft: ['#1c1210', '#3a2a22'], len: 13, head: 'lava', glow: '#ff5a1a', anim: true } } },
  sporeling: { head: ['mushroomCap'], front: ['shroomPads'], back: [['cape', { deco: 'moss', pal: BP('sporeling').cape }]], noCape: true, anim: true,
    weapons: { KNIGHT: { len: 12, w: 1, edge: '#c8ff6a', core: '#5a5a36', dark: '#3a3a24', guard: 'shroom', guardC: ['#4a2a6a', '#7a4aa8', '#b47ae8'], grip: '#3a3a24', gem: '#3ad0e0', glow: '#c8ff6a' },
      RANGER: { limb: ['#2c4a22', '#3f6a2c', '#5e8f3a'], tips: 'shroom', grip: '#5a5a36', gem: '#3ad0e0', string: '#c8ff6a', glow: '#c8ff6a' },
      MAGE: { shaft: ['#3a3a24', '#5a5a36'], len: 13, head: 'shroom', glow: '#c8ff6a', anim: true } } },
  frostbound: { head: ['iceCrown'], front: [['pads', { c: ['#2e4466', '#4a7aa8', '#8ab8e0', '#e0f4ff'], spikes: [[0, 1], [0, 2], [3, 1], [3, 2]], spikeC: '#ffffff' }]], back: [['cape', { hem: 'icicle', pal: BP('frostbound').cape }]], noCape: true,
    weapons: { KNIGHT: { len: 14, w: 1, edge: '#ffffff', core: '#8ab8e0', dark: '#2e4466', guard: 'crystal', guardC: ICE, grip: '#1c2a3e', gem: '#6ef0ff', jag: true, glow: '#bff0ff' },
      RANGER: { limb: ['#2e4466', '#8ab8e0', '#e0f4ff'], tips: 'crystal', grip: '#1c2a3e', gem: '#6ef0ff', string: '#ffffff', glow: '#bff0ff' },
      MAGE: { shaft: ['#1c2a3e', '#4a6a96'], len: 12, head: 'ice', glow: '#bff0ff' } } },
  ignivar: { head: ['dragonSkull'], front: [['pads', { c: ['#40100e', '#621a14', '#9a2e1c', '#c8502a'], spikes: [[1, 1], [2, 2]], spikeC: '#f0e0c0' }]], back: [['dragonWings', { pal: ['#24080a', '#40100e', '#621a14'], spar: '#c8b48a', claw: '#f0e0c0', tatter: true }]], noCape: true, anim: true,
    weapons: { KNIGHT: { len: 14, w: 1, edge: '#f0e0c0', core: '#c8b48a', dark: '#6a5a40', guard: 'bone', guardC: ['#6a5a40', '#c8b48a', '#f0e0c0'], grip: '#40100e', gem: '#ff7a2a', jag: true, glow: '#ff7a2a' },
      RANGER: { limb: ['#6a5a40', '#c8b48a', '#f0e0c0'], tips: 'bone', grip: '#40100e', gem: '#ff7a2a', string: '#ffb04a', glow: '#ff7a2a' },
      MAGE: { shaft: ['#40100e', '#6a2a14'], len: 12, head: 'skull', glow: '#ff7a2a', anim: true } } },
  stormcrown: { head: ['floatingCrown'], body: ['ermine'], back: [['cape', { hem: 'gold', long: true, pal: BP('stormcrown').cape }]], noCape: true, anim: true,
    weapons: { KNIGHT: { len: 14, w: 1, edge: '#ffe27a', core: '#6a4aa8', dark: '#2e1c52', guard: 'wing', guardC: GOLD, grip: '#1a1030', gem: '#a8f0ff', bolt: '#a8f0ff', glow: '#a8f0ff', anim: true },
      RANGER: { limb: ['#2e1c52', '#6a4aa8', '#ffe27a'], tips: 'bolt', grip: '#1a1030', gem: '#a8f0ff', string: '#ffe27a', glow: '#a8f0ff', anim: true },
      MAGE: { shaft: ['#1a1030', '#46307a'], len: 13, head: 'crownorb', bands: '#ffe27a', glow: '#a8f0ff', anim: true } } }
};
export function lookOf(cls, id) { if (!id) return null; const b = BOSS_LOOK[id]; if (b) return { ...b, weapon: b.weapons[cls] }; return (LOOKS[cls] || {})[id] || null; }
export const weaponSpec = (cls, id) => { const L = lookOf(cls, id); return L && L.weapon || null; };
export const lookAnim = (cls, id) => { const L = lookOf(cls, id); return !!(L && (L.anim || (L.weapon && L.weapon.anim))); };
export function applyLayer(K, layer) { const L = K.L; if (!L || !L[layer]) return; for (const p of L[layer]) { const [n, o] = Array.isArray(p) ? p : [p, {}]; if (PARTS[n]) PARTS[n](K, o); } }

// ================= vũ khí (ma trận pixel theo thông số) =================
// kiếm nằm ngang: chuôi ở x=0..2, chắn tay x=3, lưỡi từ x=4; hàng giữa = cy
export function swordGrid(sp, f = 0) {
  const L = sp.len || 12, w = sp.w || 1, ga = w + 2, Hh = 2 * (ga + 1) + 1, cy = ga + 1, g = new Grid(5 + L, Hh);
  g.rect(0, cy, 3, 1, sp.grip || '#5a3a1a'); g.set(1, cy, sp.wrap || '#7a5a2a');
  if (sp.gem) { g.set(0, cy, sp.gem); g.set(0, cy - 1, sp.pommel || sp.gem); g.set(0, cy + 1, sp.pommel || sp.gem); }
  for (let i = 0; i < L; i++) {
    const x = 4 + i, rem = L - 1 - i, hw = Math.min(w, rem);
    for (let y = cy - hw; y <= cy + hw; y++) { let c = y === cy - hw ? sp.edge : y === cy + hw ? sp.dark : sp.core; if (hw >= 1 && y === cy && i > 0 && rem > 2 && sp.fuller) c = sp.fuller; g.set(x, y, c); }
    if (sp.jag && i > 0 && rem > 1) { if (i % 3 === 1) g.set(x, cy - hw - 1, sp.edge); if (i % 3 === 2) g.set(x, cy + hw + 1, sp.dark); }
    if (sp.cracks && rem > 1 && H(i, 7) < 0.45) g.set(x, cy + (w > 1 ? (H(i, 3) < 0.5 ? -1 : 1) : 0), sp.cracks[(i + f) % sp.cracks.length]);
    if (sp.bolt && rem > 1) { const ph = (i + f) % 4; g.set(x, cy + (ph === 1 ? -1 : ph === 3 ? 1 : 0) * Math.min(1, hw), sp.bolt); }
  }
  const G = sp.guardC || GOLD, gx = 3;
  g.rect(gx, cy - ga, 1, 2 * ga + 1, G[1]); g.set(gx, cy - ga, G[2]); g.set(gx, cy + ga, G[0]);
  const P2 = (list, c) => px(g, list.map(([dx, dy]) => [gx + dx, cy + dy]), c);
  switch (sp.guard) {
    case 'wing': P2([[1, -ga], [2, -ga - 1], [1, ga]], G[2]); P2([[2, ga + 1]], G[1]); P2([[-1, -ga + 1], [-1, ga - 1]], G[0]); break;
    case 'jag': P2([[-1, -ga], [1, -ga - 1], [-1, ga]], G[2]); P2([[1, ga + 1]], G[1]); break;
    case 'claw': P2([[1, -ga - 1], [2, -ga - 1], [1, ga + 1], [2, ga + 1]], G[2]); P2([[1, -ga], [1, ga]], G[1]); break;
    case 'crystal': P2([[-1, -ga + 1], [1, -ga + 1], [-1, ga - 1], [1, ga - 1]], G[2]); P2([[0, -ga - 1], [0, ga + 1]], G[3] || '#ffffff'); break;
    case 'bone': P2([[-1, -ga], [1, -ga], [-1, ga], [1, ga]], G[2]); break;
    case 'shroom': P2([[-1, -ga - 1], [0, -ga - 1], [1, -ga - 1]], G[1]); P2([[-1, -ga], [1, -ga]], G[2]); P2([[0, -ga - 1]], '#e8f0ff'); break;
  }
  if (sp.gemG) g.set(gx, cy, sp.gemG);
  return g;
}
// cung dựng đứng: hai đầu cung ở (2,1) và (2,17), tay cầm ở x=5..6
export const BOW_TIP = { top: [2, 1], bot: [2, 17] };
export function bowGrid(sp, f = 0) {
  const g = new Grid(9, 19), Lm = sp.limb || ['#5a3a1e', '#8a5a30', '#b07a44'];
  for (let y = 1; y <= 17; y++) { const t = (y - 9) / 8, x = 2 + Math.round(4 * (1 - t * t)); g.set(x, y, sh(Lm, 0.95 - Math.abs(t) * 0.7)); if (Math.abs(t) < 0.6) g.set(x - 1, y, Lm[0]); }
  g.rect(5, 8, 2, 3, sp.grip || '#3a2414'); if (sp.gem) g.set(7, 9, sp.gem);
  const a = f & 1, b = (f >> 1) & 1;
  for (const [y, s] of [[1, -1], [17, 1]]) {
    const o = y + s;
    switch (sp.tips) {
      case 'crystal': g.set(2, o, '#ffffff'); g.set(1, o, ICE[2]); g.set(3, o, ICE[2]); g.set(2, y, ICE[1]); break;
      case 'wisp': g.set(1 + a, o, '#c07aff'); g.set(b, y, '#5a3a8a'); g.set(3, o, '#3a3a5a'); break;
      case 'star': g.set(2, o, '#ffffff'); if (a) { g.set(1, y, '#8ac8ff'); g.set(3, y, '#8ac8ff'); } break;
      case 'bolt': g.set(3, o, a ? '#ffffff' : '#7fe0ff'); g.set(1 + b, o, '#ffe27a'); break;
      case 'lava': g.set(2, o, a ? '#ffd36b' : '#ff5a1a'); g.set(1, y, '#3a2a22'); break;
      case 'shroom': g.set(1, o, '#7a4aa8'); g.set(2, o, '#b47ae8'); g.set(3, o, '#7a4aa8'); g.set(2, o, '#e8f0ff'); break;
      case 'bone': g.set(1, y, '#f0e0c0'); g.set(1, o, '#c8b48a'); g.set(2, o, '#f0e0c0'); break;
      default: g.set(2, o, Lm[2]); g.set(3, o, GOLD[2]);
    }
  }
  if (sp.nodes) for (const yy of [4, 7, 11, 14]) { const t = (yy - 9) / 8, x = 2 + Math.round(4 * (1 - t * t)); g.set(x + 1, yy, (yy + f) % 2 ? sp.nodes : '#ffffff'); }
  return g;
}
// trượng nằm ngang: cán x=0..len-1 (2 hàng), đầu trượng từ x=len; hàng giữa cy=4
export function staffGrid(sp, f = 0) {
  const len = sp.len || 13, g = new Grid(len + 8, 9), cy = 4, S = sp.shaft || ['#5a3a20', '#8a5e34'], hx = len, a = f & 1;
  g.rect(0, cy, len, 1, S[1]); g.rect(0, cy + 1, len, 1, S[0]); if (sp.bands) for (let x = 3; x < len; x += 4) { g.set(x, cy, sp.bands); g.set(x, cy + 1, sp.bands); }
  switch (sp.head) {
    case 'flame': {
      px(g, [[hx, cy - 1], [hx, cy + 2], [hx + 1, cy - 2], [hx + 1, cy + 3]], GOLD[2]); g.rect(hx, cy, 1, 2, GOLD[1]);
      const rows = [[cy - 1, 3], [cy, 5], [cy + 1, 4], [cy + 2, 2]];
      for (const [y, L] of rows) { const n = L + ((y + f) % 3 === 0 ? 1 : 0); for (let k = 0; k < n; k++) g.set(hx + 1 + k, y, k === n - 1 ? FIRE[0] : k > n * 0.6 ? FIRE[1] : k > 0 ? FIRE[2] : FIRE[3]); }
      break;
    }
    case 'orb': {
      const M = '#2a2050'; px(g, [[hx, cy - 1], [hx + 1, cy - 2], [hx + 2, cy - 2], [hx, cy + 2], [hx + 1, cy + 3], [hx + 2, cy + 3]], M);
      g.rect(hx + 3, cy, 3, 2, '#02020a'); px(g, [[hx + 3, cy], [hx + 5, cy + 1]], '#7fe0ff'); g.set(hx + 4, cy, '#e0f8ff');
      const ring = [[hx + 4, cy - 1], [hx + 6, cy], [hx + 6, cy + 1], [hx + 4, cy + 2], [hx + 2, cy + 1], [hx + 2, cy]];
      ring.forEach(([x, y], i) => { if (i === f % 6 || i === (f + 3) % 6) g.set(x, y, '#7fe0ff'); });
      break;
    }
    case 'wing': {
      px(g, [[hx, cy - 1], [hx + 1, cy - 2], [hx + 1, cy - 3], [hx + 2, cy - 4], [hx, cy + 2], [hx + 1, cy + 3], [hx + 1, cy + 4], [hx + 2, cy + 5]], '#ffffff');
      px(g, [[hx, cy - 2], [hx, cy + 3], [hx + 2, cy - 3], [hx + 2, cy + 4]], '#e0e0f0');
      g.rect(hx + 3, cy, 3, 2, GOLD[3]); g.set(hx + 4, cy - 1, a ? '#ffffff' : GOLD[2]); g.set(hx + 4, cy + 2, a ? '#ffffff' : GOLD[2]); g.set(hx + 6, cy, a ? '#ffffff' : GOLD[2]); g.set(hx + 4, cy, '#ffffff');
      break;
    }
    case 'bolt': {
      px(g, [[hx, cy - 1], [hx + 1, cy - 2], [hx + 2, cy - 2], [hx, cy + 2], [hx + 1, cy + 3], [hx + 2, cy + 3]], GOLD[2]);
      const zz = a ? [[hx + 2, cy], [hx + 3, cy + 1], [hx + 4, cy], [hx + 5, cy + 1], [hx + 6, cy]] : [[hx + 2, cy + 1], [hx + 3, cy], [hx + 4, cy + 1], [hx + 5, cy], [hx + 6, cy + 1]];
      px(g, zz, '#7fe0ff'); g.set(hx + 6, cy + (a ? 0 : 1), '#ffffff');
      break;
    }
    case 'lava': {
      g.rect(hx, cy - 2, 4, 6, (i, j) => (i + j) % 3 === 0 ? '#3a2a22' : '#1c1210'); px(g, [[hx + 4, cy - 1], [hx + 4, cy + 2], [hx - 1, cy - 1]], '#3a2a22');
      px(g, [[hx + 1, cy - 1], [hx + 2, cy], [hx + 1, cy + 1], [hx + 2, cy + 2]], a ? '#ffd36b' : '#ff5a1a'); g.set(hx + 3, cy, '#ff5a1a');
      break;
    }
    case 'shroom': {
      g.rect(hx, cy, 2, 2, '#d8d0b8'); g.rect(hx + 2, cy - 3, 2, 8, (i, j) => sh(['#4a2a6a', '#7a4aa8', '#b47ae8'], 0.9 - Math.abs(j - 3.5) * 0.15 - i * 0.3)); g.set(hx + 4, cy - 1, '#7a4aa8'); g.set(hx + 4, cy + 2, '#7a4aa8'); g.rect(hx + 4, cy, 1, 2, '#4a2a6a');
      g.set(hx + 2, cy - 2, a ? '#c8ff6a' : '#e8f0ff'); g.set(hx + 3, cy + 3, a ? '#e8f0ff' : '#3ad0e0');
      break;
    }
    case 'ice': {
      for (let k = 0; k < 7; k++) { const hw2 = k < 2 ? 1 : k < 5 ? 2 : 1 - (k > 5 ? 1 : 0); for (let dy = -hw2; dy <= hw2 + 1; dy++) g.set(hx + k, cy + dy, dy <= 0 ? ICE[2] : ICE[1]); }
      g.set(hx + 7, cy, ICE[3]); g.set(hx + 7, cy + 1, ICE[2]); px(g, [[hx + 2, cy - 1], [hx + 4, cy - 2]], ICE[3]);
      break;
    }
    case 'skull': {
      g.rect(hx, cy - 2, 4, 4, (i, j) => sh(['#8a7a5a', '#c8b48a', '#f0e0c0'], 0.9 - j * 0.2)); g.rect(hx + 3, cy, 3, 2, '#c8b48a'); px(g, [[hx + 4, cy + 2], [hx + 5, cy + 2]], '#ffffff');
      g.set(hx + 2, cy - 1, a ? '#ffe27a' : '#ff7a2a'); px(g, [[hx, cy - 3], [hx - 1, cy - 3], [hx - 2, cy - 2]], '#9a2e1c');
      break;
    }
    case 'crownorb': {
      px(g, [[hx, cy - 2], [hx, cy - 1], [hx, cy + 2], [hx, cy + 3], [hx + 1, cy - 2], [hx + 2, cy - 3], [hx + 1, cy + 3], [hx + 2, cy + 4], [hx + 4, cy - 2], [hx + 4, cy + 3]], GOLD[2]);
      const col = ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff']; [[hx + 2, cy], [hx + 3, cy], [hx + 3, cy + 1], [hx + 2, cy + 1]].forEach(([x, y], i) => g.set(x, y, col[(i + f) % 4]));
      g.set(hx + 5, cy, a ? '#a8f0ff' : '#ffffff');
      break;
    }
  }
  return g;
}
// vị trí đầu trượng (để vẽ quầng sáng), tính theo pixel lưới
export const staffTip = sp => (sp.len || 13) + (sp.head === 'ice' ? 5 : sp.head === 'flame' ? 3 : 4);
