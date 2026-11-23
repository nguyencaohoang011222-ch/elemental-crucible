// Khung xương pixel: nhân vật, quái và boss được dựng từ các bộ phận theo "tư thế" (độ lệch chân, tay, thân, đầu).
// Mỗi tư thế sinh ra một khung hình 1:1 pixel, lưu cache. Hoạt ảnh = chọn tư thế theo thời gian và trạng thái game.
import { Grid, shade, whiteOf, tintOf, hash2, mix } from './pixel.js';
import { ENEMIES } from '../sim.js';
import { BOSS_PIX } from './bosspix.js';
import { BOSS_FORMS } from './bossforms.js';
import { SKINS } from '../profile.js';
import { lookOf, applyLayer, PARTS, weaponSpec, swordGrid, bowGrid, staffGrid } from './skinlooks.js';
export { lookAnim, weaponSpec, BOW_TIP, staffTip } from './skinlooks.js';

const SKIN = ['#c8986e', '#f0c9a0', '#ffe2c4'];
const HERO = {
  KNIGHT: { helm: ['#4a5466', '#7d8ca0', '#b4c2d4', '#e6eef8'], plume: ['#a01e1e', '#e04040'], body: ['#24407a', '#3a64b4', '#5a8ad8'], trim: '#e6c36a', cape: ['#5e1414', '#8e2222', '#b03030'], legs: ['#2a2638', '#3e3a52'], boot: '#2a1e16', arm: ['#4a5466', '#7d8ca0', '#b4c2d4'] },
  RANGER: { hood: ['#1c4424', '#2e7038', '#46984e', '#68b86a'], body: ['#4a3420', '#6e5030', '#8e6a42'], trim: '#c8a050', cape: ['#1c4424', '#2e7038', '#46984e'], legs: ['#3a2c1e', '#54402a'], boot: '#2a1e16', arm: ['#4a3420', '#6e5030', '#8e6a42'], quiver: ['#5a3a20', '#7a5230'] },
  MAGE: { hat: ['#211a52', '#3a2e8e', '#5444c0', '#7466e0'], robe: ['#211a52', '#3a2e8e', '#5444c0', '#7466e0'], trim: '#e6c36a', boot: '#2a1e16', arm: ['#2c2470', '#3a2e8e', '#5444c0'], hair: '#d8d8e8' }
};

// ---------- nhân vật người chơi (16 x 21, chân ở hàng 20) ----------
// khung có lề trái/phải HERO_MX và lề trên HERO_MY để skin có chỗ cho sừng, cánh, vương miện, hào quang
export const HERO_W = 16, HERO_H = 21, HERO_MX = 5, HERO_MY = 7;
class OGrid extends Grid { constructor(w, h, ox, oy) { super(w, h); this.ox = ox; this.oy = oy; } set(x, y, c) { super.set(Math.round(x) + this.ox, Math.round(y) + this.oy, c); } get(x, y) { return super.get(Math.round(x) + this.ox, Math.round(y) + this.oy); } }
export function heroGrid(cls, P) {
  // nhân vật nhỏ: tô phẳng theo bậc (không dither) cho sạch như pixel art vẽ tay
  const shade = (pal, v) => pal[Math.max(0, Math.min(pal.length - 1, Math.round(v * (pal.length - 1))))];
  const [cls0, skin] = cls.split(':'); cls = cls0; const sk0 = skin && (SKINS[cls] || []).find(s => s.id === skin), L = lookOf(cls, skin);
  const g = new OGrid(HERO_W + HERO_MX * 2, HERO_H + HERO_MY, HERO_MX, HERO_MY), C = sk0 ? { ...HERO[cls], ...sk0.pal } : HERO[cls], by = P.by | 0, ln = P.lean | 0, robe = cls === 'MAGE';
  const K = { g, cls, C, ln, by, P, af: P.af | 0, robe, hx: 4 + ln, hy: 3 + by + (P.hd | 0), L };
  const sk = (x, y) => shade(SKIN, 0.6, x, y);
  applyLayer(K, 'back');
  // áo choàng phía sau (nhìn sang phải nên áo bay về bên trái)
  if (C.cape && !(L && L.noCape)) { const f = P.cape | 0; for (let y = 10; y <= 17; y++) { const w = 3 + ((y - 10) >> 1), x0 = 6 + ln - w - (y > 12 ? f : 0); g.rect(x0, y + by, w + 2, 1, (i, j, x) => shade(C.cape, 0.25 + i / (w + 2) * 0.6, x, y)); } }
  // tay sau
  const arm = (x, y, cols, dark) => { g.rect(x, y, 2, 4, (i, j, xx, yy) => shade(cols, dark ? 0.2 : 0.4 + (1 - i) * 0.4, xx, yy)); g.rect(x, y + 4, 2, 1, dark ? SKIN[0] : SKIN[1]); };
  arm(4 + ln + (P.alx | 0), 10 + by + (P.aly | 0), C.arm, true);
  if (cls === 'RANGER') g.rect(3 + ln, 8 + by, 2, 6, (i, j, x, y) => j === 0 ? '#e8e0d0' : shade(C.quiver, 0.5 + i * 0.3, x, y));
  // chân
  if (!robe) {
    const leg = (x, ly, dark) => { const top = 15 + by, bot = 19 + ly; g.rect(x, top, 2, Math.max(1, bot - top + 1), dark ? C.legs[0] : C.legs[1]); g.rect(x, bot + 1, 3, 1, C.boot); };
    leg(5 + (P.lx | 0), P.ly | 0, true); leg(9 + (P.rx | 0), P.ry | 0, false);
  } else {
    const hem = P.hem | 0;
    for (let y = 10; y <= 19; y++) { const s = (y - 10) / 3 | 0, sh = y > 15 ? hem : 0, x0 = 5 + ln - s + sh, x1 = 10 + ln + s + sh; g.rect(x0, y + (y < 15 ? by : 0), x1 - x0 + 1, 1, (i, j, x) => y === 19 || y === 14 ? C.trim : shade(C.robe, 0.85 - i / (x1 - x0 + 1) * 0.7, x, y)); }
    g.rect(6 + (P.lx | 0), 20, 2, 1, C.boot); g.rect(9 + (P.rx | 0), 20, 2, 1, C.boot);
  }
  // thân
  if (!robe) {
    g.rect(5 + ln, 10 + by, 6, 5, (i, j, x, y) => shade(C.body, 0.85 - i * 0.12, x, y));
    g.rect(5 + ln, 14 + by, 6, 1, cls === 'KNIGHT' ? '#5a3a1a' : C.trim);
    if (cls === 'KNIGHT') { g.rect(7 + ln, 11 + by, 2, 2, C.trim); g.rect(4 + ln, 10 + by, 3, 1, C.helm[2]); g.rect(9 + ln, 10 + by, 3, 1, C.helm[1]); }
    if (cls === 'RANGER') { g.rect(5 + ln, 10 + by, 6, 1, C.trim); g.line(6 + ln, 11 + by, 9 + ln, 14 + by, '#3a2a1a'); }
  }
  applyLayer(K, 'body');
  // đầu
  const hy = K.hy, hx = K.hx;
  g.rect(hx + 1, hy + 2, 6, 5, (i, j, x, y) => j === 4 ? SKIN[0] : sk(x, y));
  const eyeY = hy + 4;
  if (P.eyes === 'closed') { g.rect(hx + 4, eyeY, 1, 1, SKIN[0]); g.rect(hx + 6, eyeY, 1, 1, SKIN[0]); }
  else if (P.eyes === 'hurt') { g.rect(hx + 4, eyeY - 1, 1, 1, '#1a1220'); g.rect(hx + 6, eyeY + 1, 1, 1, '#1a1220'); g.rect(hx + 5, eyeY + 2, 2, 1, '#6a2020'); }
  else { g.rect(hx + 4, eyeY, 1, 1, cls === 'MAGE' ? '#7fe6ff' : '#1a1220'); g.rect(hx + 6, eyeY, 1, 1, cls === 'MAGE' ? '#7fe6ff' : '#1a1220'); }
  if (L && L.head) applyLayer(K, 'head');   // skin thay hẳn mũ/mũ trùm
  else if (cls === 'KNIGHT') {
    g.rect(hx, hy, 8, 4, (i, j, x, y) => shade(C.helm, 0.95 - j * 0.15 - i * 0.04, x, y));
    g.rect(hx, hy + 4, 2, 3, (i, j, x, y) => shade(C.helm, 0.35, x, y)); g.rect(hx + 7, hy + 4, 1, 2, C.helm[1]);
    g.rect(hx + 2, hy + 3, 6, 1, '#1a1a24');
    if (!(L && L.noPlume)) { g.rect(hx + 3, hy - 2, 2, 2, C.plume[1]); g.rect(hx + 1, hy - 1, 2, 1, C.plume[0]); g.rect(hx, hy, 1, 1 + (P.cape > 1 ? 1 : 0), C.plume[0]); }
  } else if (cls === 'RANGER') {
    g.rect(hx, hy, 8, 3, (i, j, x, y) => shade(C.hood, 0.9 - j * 0.15 - i * 0.05, x, y));
    g.rect(hx, hy + 3, 2, 5, (i, j, x, y) => shade(C.hood, 0.35, x, y)); g.rect(hx - 1, hy + 1, 1, 2, C.hood[1]); g.rect(hx + 7, hy + 3, 1, 1, C.hood[2]);
    g.rect(hx + 1, hy + 7, 7, 1, C.trim);
  } else {
    g.rect(hx + 1, hy + 5, 6, 2, (i, j) => j === 1 && i > 1 && i < 5 ? C.hair : null);
    g.rect(hx - 1, hy + 2, 10, 1, C.hat[1]);
    g.rect(hx + 1, hy + 1, 6, 1, C.trim);
    g.rect(hx + 1, hy, 6, 1, (i, j, x, y) => shade(C.hat, 0.8 - i * 0.1, x, y));
    g.rect(hx + 2, hy - 1, 4, 1, (i, j, x, y) => shade(C.hat, 0.85 - i * 0.12, x, y));
    g.rect(hx + 2, hy - 2, 3, 1, C.hat[2]); g.rect(hx + 1, hy - 3 + (P.cape > 1 ? 1 : 0), 2, 1, C.hat[3]);
  }
  if (L && L.hat) for (const p of L.hat) { const [n, o] = Array.isArray(p) ? p : [p, {}]; if (PARTS[n]) PARTS[n](K, o); }   // đè lên mũ mặc định
  // tay trước
  arm(10 + ln + (P.arx | 0), 10 + by + (P.ary | 0), C.arm, false);
  applyLayer(K, 'front');
  return g;
}
// chibi trong trận: bỏ 3 hàng chân/vạt áo (hàng 15–17), dồn đầu + thân xuống 3 hàng, chân luôn ở hàng 20.
// cùng tỉ lệ với sprite Shop (đầu to, thân chắc, chân ngắn). Diorama Shop vẫn gọi heroGrid gốc.
export const CHIBI_DROP = 3;
export function chibiGrid(g) {
  const W = g.w, cut = 17 + HERO_MY, d = g.d.slice();
  for (let y = cut; y >= 0; y--) for (let x = 0; x < W; x++) d[y * W + x] = y - CHIBI_DROP >= 0 ? g.d[(y - CHIBI_DROP) * W + x] : null;
  g.d = d; return g;
}
function drawHero(cls, P) { return chibiGrid(heroGrid(cls, P)).canvas('#141013'); }
// vũ khí theo skin (ma trận pixel từ skinlooks), có khung hoạt ảnh cho vũ khí phát sáng / lửa
const SKW = new Map();
export function skinWeapon(cls, id, f = 0) {
  const sp = weaponSpec(cls, id); if (!sp) return null; const fr = sp.anim ? f & 3 : 0, key = cls + id + fr; let w = SKW.get(key);
  if (!w) { const g = cls === 'KNIGHT' ? swordGrid(sp, fr) : cls === 'RANGER' ? bowGrid(sp, fr) : staffGrid(sp, fr); w = { img: g.canvas(), sp, gw: g.w, gh: g.h }; SKW.set(key, w); }
  return w;
}

// chọn tư thế: chân theo di chuyển, thân trên theo hành động
export function heroPose(p, t, moving) {
  const P = { by: 0, lx: 0, ly: 0, rx: 0, ry: 0, alx: 0, aly: 0, arx: 0, ary: 0, lean: 0, hd: 0, cape: 0, hem: 0, eyes: 'open' };
  const dashing = p.dashT > 0 || p.sdashT > 0;
  if (dashing) {
    P.lean = 1; P.lx = -2; P.rx = 1; P.alx = -2; P.arx = -1; P.cape = 2; P.hem = -1; P.by = 1;
  } else if ((p.z || 0) > 2 || p.leap) {
    P.ly = -2; P.ry = -2; P.aly = -2; P.ary = -2; P.by = -1; P.cape = 2;
  } else if (moving) {
    const f = Math.floor(t / 0.11) % 4;   // nhịp nhún chibi 4 khung: chân luân phiên, bật lên giữa bước
    P.lx = [1, 0, -1, 0][f]; P.rx = -P.lx; P.ly = f === 0 ? -1 : 0; P.ry = f === 2 ? -1 : 0;
    P.by = f & 1 ? -1 : 0; P.alx = -P.lx; P.arx = -P.rx; P.cape = 1 + (f & 1); P.hem = f < 2 ? 1 : -1;
  } else {
    const f = Math.floor(t / 0.24) % 4; P.by = f >= 2 ? 1 : 0; P.cape = f === 3 ? 1 : 0;
    if (t % 3.1 < 0.13) P.eyes = 'closed';
  }
  // thân trên theo hành động
  const ch = p.charge || 0;
  if (p.cls === 'KNIGHT') {
    if (ch > 0.05) { P.lean = -1; P.arx = -2; P.ary = -1; P.alx = -1; if (!moving) { P.lx = -1; P.rx = 1; } }
    else if (p.swing > 0) { P.lean = 1; P.arx = 2; P.ary = 0; P.by = Math.max(P.by, 0) + (moving ? 0 : 1); P.cape = 2; if (!moving) { P.lx = -1; P.rx = 1; } }
  } else if (p.cls === 'RANGER') {
    if (ch > 0.05) { P.arx = 2; P.ary = -1; P.alx = 1; if (!moving) { P.lx = -1; P.rx = 1; } }
    else if ((p.atkT || 0) > 0.18) { P.lean = -1; P.arx = 1; }
  } else if (ch > 0.05 || p.castAnim > 0) { P.ary = -3; P.arx = 1; P.aly = -1; P.cape = 2; }
  if (p.castAnim > 0 && p.cls !== 'MAGE') { P.ary = -2; P.arx = 2; }
  if (p.hurtT > 0) { P.lean = -1; P.eyes = 'hurt'; P.hd = 0; }
  return P;
}

// ---------- vũ khí ----------
function sword() { const g = new Grid(15, 3); g.rect(0, 1, 3, 1, '#5a3a1a'); g.rect(3, 0, 1, 3, '#e6c36a'); g.rect(4, 0, 10, 1, '#ffffff'); g.rect(4, 1, 10, 1, '#dfe8f2'); g.rect(4, 2, 10, 1, '#8a9ab0'); g.set(14, 1, '#dfe8f2'); return g.canvas(); }
function staff() { const g = new Grid(18, 4); g.rect(0, 1, 14, 2, (i, j) => j ? '#5a3a20' : '#8a5e34'); g.rect(13, 0, 1, 4, '#e6c36a'); g.rect(14, 0, 4, 4, (i, j) => (i + j) % 3 === 0 ? '#ffffff' : i > 1 ? '#7fe6ff' : '#4ab0e0'); return g.canvas(); }
export const WEAPONS = { sword: null, staff: null };
export function weapon(name) { if (!WEAPONS[name]) WEAPONS[name] = name === 'sword' ? sword() : staff(); return WEAPONS[name]; }

// ---------- quái ----------
const BRUTE = { skin: ['#7a3a24', '#a0563a', '#c4744e'], cloth: ['#3a2a18', '#5a4024'], tusk: '#f0e0c0', eye: '#ffd46a', club: true };
function drawGrunt(P, L = BRUTE) { // 16 x 17
  const g = new Grid(16, 17), C = { ...BRUTE, ...L }, by = P.by | 0;
  const leg = (x, ly, d) => { g.rect(x, 12 + by, 3, 4 + ly - by, d ? C.skin[0] : C.skin[1]); g.rect(x, 16 + ly, 3, 1, '#2a1a10'); };
  leg(4 + (P.lx | 0), P.ly | 0, true); leg(9 + (P.rx | 0), P.ry | 0, false);
  g.rect(2 + (P.alx | 0), 7 + by, 3, 5, (i, j, x, y) => shade(C.skin, 0.25, x, y));
  g.ell(8, 9.5 + by, 5, 4, (dx, dy, x, y) => shade(C.skin, 0.65 - dx * 0.3 - dy * 0.3, x, y));
  g.rect(4, 11 + by, 8, 2, (i, j, x, y) => shade(C.cloth, 0.6, x, y));
  const hy = 1 + by + (P.hd | 0), LN = P.ln | 0;
  g.ell(9 + LN, hy + 3.5, 4.5, 3.8, (dx, dy, x, y) => shade(C.skin, 0.7 - dx * 0.25 - dy * 0.35, x, y));
  g.rect(7 + LN, hy + 2, 6, 1, C.skin[0]);
  if (C.cracks) for (let i = 0; i < 9; i++) g.set(4 + ((i * 5) % 9), 6 + ((i * 3) % 8) + by, i % 2 ? '#ff7a3c' : '#ffd36b');
  if (C.cap) { g.ell(9 + LN, hy + 1, 6, 3, (dx, dy, x, y) => hash2(x, y, 3) < 0.15 ? '#f0e8d8' : shade(C.cap, 0.75 - dx * 0.2 - dy * 0.4, x, y)); }
  if (C.helmet) { g.rect(5 + LN, hy - 1, 8, 3, (i, j, x, y) => shade([mix(C.helmet, '#000', 0.4), C.helmet, mix(C.helmet, '#fff', 0.4)], 0.8 - i * 0.07, x, y)); g.rect(8 + LN, hy - 3, 2, 2, '#e04040'); }
  if (C.horns) { g.line(6 + LN, hy + 1, 5 + LN, hy - 2, C.horns); g.line(12 + LN, hy + 1, 13 + LN, hy - 2, C.horns); }
  g.set(9 + LN, hy + 3, P.eyes === 'x' ? '#1a1010' : C.eye); g.set(12 + LN, hy + 3, P.eyes === 'x' ? '#1a1010' : C.eye);
  if (C.tusk) { g.set(9 + LN, hy + 6, C.tusk); g.set(12 + LN, hy + 6, C.tusk); g.set(9 + LN, hy + 5, C.tusk); }
  // tay trước + chuỳ
  const ax = 11 + (P.arx | 0), ay = 7 + by + (P.ary | 0);
  g.rect(ax, ay, 3, 4, (i, j, x, y) => shade(C.skin, 0.55, x, y));
  if (C.shield) { g.rect(12, 6 + by, 4, 9, (i, j, x, y) => i === 0 || j === 0 || j === 8 ? '#d8b04a' : shade(['#6a1414', '#9a2020', '#c03030'], 0.8 - j * 0.05, x, y)); g.rect(13, 9 + by, 2, 2, '#ffe27a'); }
  if (C.claw) { g.set(ax + 3, ay + 4, '#ffffff'); g.set(ax + 3, ay + 2, '#ffffff'); }
  if (!C.club) return g.canvas();
  const cl = P.club || 0, cx = ax + 1, cy = ay + 4, ex = cx + Math.round(Math.cos(cl) * 6), ey = cy - Math.round(Math.sin(cl) * 6);
  g.line(cx, cy, ex, ey, '#9a6a3a', 2); g.ell(ex, ey, 2.4, 2.4, (dx, dy, x, y) => dx * dx + dy * dy > 0.7 && (x + y) % 2 ? '#d8d0c0' : shade(['#6e4626', '#9a6a3a', '#c08850'], 0.7 - dx * 0.3 - dy * 0.3, x, y));
  return g.canvas();
}
const BULL = { hide: ['#4a3020', '#6e4a2c', '#8e6038', '#a87848'], horn: '#efe4c8', eye: '#ff5a3a', hoof: '#2a1a10' };
function drawCharger(P, L = BULL) { // 18 x 15
  const g = new Grid(18, 15), C = { ...BULL, ...L }, low = P.low | 0, st = P.stretch | 0, bb = P.by | 0;
  const leg = (x, ly, d) => { g.rect(x, 10, 2, 4 + ly, d ? C.hide[0] : C.hide[1]); g.rect(x, 14 + ly, 2, 1, C.hoof); };
  leg(3 - st + (P.lx | 0), P.ly | 0, true); leg(6 - st + (P.rx | 0), P.ry | 0, false); leg(11 + st + (P.rx | 0), P.ly | 0, true); leg(14 + st + (P.lx | 0), P.ry | 0, false);
  g.ell(8.5, 7.5 + (low >> 1) + bb, 7.5 + st * 0.5, 4.2, (dx, dy, x, y) => shade(C.hide, 0.7 - dx * 0.2 - dy * 0.45, x, y));
  g.ell(6, 4.5 + (low >> 1) + bb, 4, 2.5, (dx, dy, x, y) => shade(C.hide, 0.55 - dy * 0.4, x, y));
  const hx = 13 + st, hy = 5 + low + bb;
  g.ell(hx + 1.5, hy + 2, 3.2, 2.8, (dx, dy, x, y) => shade(C.hide, 0.75 - dx * 0.2 - dy * 0.3, x, y));
  if (C.shell) { g.ell(7.5, 6 + (low >> 1), 7, 4.5, (dx, dy, x, y) => Math.abs(x - 7) < 0.6 ? C.shell[0] : shade(C.shell, 0.85 - dx * 0.25 - dy * 0.5, x, y)); }
  if (C.spots) for (const [x, y] of [[4, 6], [8, 5], [11, 7], [6, 9]]) g.set(x, y + (low >> 1), C.spots);
  if (C.tail) g.line(1, 8, -2, 11, C.hide[1], 2);
  g.set(hx + 2, hy + 1, P.eyes === 'x' ? '#1a1010' : C.eye); g.rect(hx + 3, hy + 3, 2, 1, C.hide[0]);
  if (C.ears) { g.line(hx, hy, hx, hy - 2, C.hide[2]); g.line(hx + 2, hy, hx + 2, hy - 2, C.hide[2]); }
  else if (C.horn) { g.line(hx, hy, hx - 1, hy - 3, C.horn); g.line(hx + 3, hy, hx + 4, hy - 3 + (low ? 1 : 0), C.horn); g.set(hx + 5, hy - 3 + (low ? 1 : 0), C.horn); }
  if (C.tusk) { g.set(hx + 4, hy + 3, C.tusk); g.set(hx + 4, hy + 2, C.tusk); }
  return g.canvas();
}
const HEX = { robe: ['#2c2050', '#4a3a7a', '#6a52a8', '#8a6ad1'], glow: '#ff9af0', face: '#0e0a18' };
function drawShooter(P, L = HEX) { // 14 x 18
  const g = new Grid(14, 18), C = { ...HEX, ...L }, by = P.by | 0, hem = P.hem | 0;
  for (let y = 6; y <= 16; y++) { const s = (y - 6) / 4 | 0, x0 = 4 - s + (y > 13 ? hem : 0), x1 = 9 + s + (y > 13 ? hem : 0); g.rect(x0, y + by, x1 - x0 + 1, 1, (i, j, x) => shade(C.robe, 0.85 - i / (x1 - x0 + 1) * 0.7, x, y)); }
  g.ell(7, 4 + by, 3.6, 3.6, (dx, dy, x, y) => shade(C.robe, 0.8 - dx * 0.3 - dy * 0.3, x, y));
  g.rect(6, 4 + by, 4, 3, C.face); g.set(7, 5 + by, C.glow); g.set(9, 5 + by, C.glow);
  const up = P.up | 0;
  const hand = (x, y) => { g.rect(x, y, 2, 3, C.robe[1]); g.rect(x, y + (up ? -1 : 3), 2, 1, C.glow); };
  hand(2, 8 + by - up * 4); hand(10, 8 + by - up * 4);
  if (C.cap) g.ell(7, 2 + by, 5.5, 2.6, (dx, dy, x, y) => hash2(x, y, 5) < 0.18 ? '#f0f0d0' : shade(C.cap, 0.8 - dy * 0.5, x, y));
  if (C.bell) { g.rect(11, 9 + by, 3, 3, '#e6b84a'); g.set(12, 12 + by, '#a8782a'); }
  if (C.dagger) { g.line(11, 11 + by - up * 4, 13, 8 + by - up * 4, '#dfe8f2'); }
  if (C.leaf) { g.set(5, 1 + by, '#6aa84c'); g.set(9, 1 + by, '#6aa84c'); g.set(7, 0 + by, '#8ac860'); }
  if (up) { g.ell(7, -0 + by + 1, 2.4, 2.4, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : C.glow); }
  return g.canvas();
}
function drawDummy(P) { // 14 x 17
  const g = new Grid(14, 17);
  g.rect(6, 6, 2, 11, (i) => i ? '#6a4a2a' : '#8a6a3a'); g.rect(1, 7, 12, 2, (i, j) => j ? '#8a6a3a' : '#a8844c');
  g.ell(7, 10, 3.5, 3, (dx, dy, x, y) => shade(['#a8844c', '#c8a060', '#e0c080'], 0.7 - dx * 0.3 - dy * 0.3, x, y));
  g.ell(7, 3.5, 3.2, 3.2, (dx, dy, x, y) => shade(['#a8844c', '#d8b47a', '#ecd09a'], 0.75 - dx * 0.3 - dy * 0.3, x, y));
  g.set(6, 3, '#5a3a1a'); g.set(8, 3, '#5a3a1a'); g.rect(6, 5, 3, 1, '#8a6a3a'); g.rect(4, 16, 6, 1, '#4a2e16');
  return g.canvas();
}
// ngoại hình từng loại quái (dùng chung 3 khuôn dáng)
const LOOK = {
  GRUNT: ['g', {}], CHARGER: ['c', {}], SHOOTER: ['s', { robe: ['#1e3a1e', '#2e5a2e', '#4a7a3a', '#6a9a4a'], glow: '#c8f07a', leaf: true }],
  YETI: ['g', { skin: ['#9ab0c4', '#d8e4ee', '#ffffff'], cloth: ['#7a8ea0', '#a8bccc'], eye: '#3a8aff', tusk: '#ffffff', horns: '#c8d8e8', club: false, claw: true }],
  WOLF: ['c', { hide: ['#4a5a6a', '#7a8a9a', '#aab8c8', '#dce6ee'], eye: '#7fe0ff', ears: true, tail: true, horn: null }],
  ICEMAGE: ['s', { robe: ['#3a5a7a', '#5a88b0', '#8ab8d8', '#c8e8ff'], glow: '#9fe6ff' }],
  SPOREMAN: ['g', { skin: ['#8a7a5a', '#c8b48a', '#e8d8b0'], cloth: ['#5a4a30', '#7a6a48'], eye: '#2a2010', tusk: null, cap: ['#4a1e5a', '#7a3a90', '#a85ac8', '#d08ae8'], club: false }],
  BEETLE: ['c', { hide: ['#1e2418', '#2e3a26', '#46563a', '#5e7048'], shell: ['#16241a', '#2a4a30', '#3e6a44', '#62925e'], horn: '#c8d080', eye: '#ffe27a' }],
  SPITTER: ['s', { robe: ['#2e3a14', '#4a5a1e', '#6a7a2a', '#8a9a3a'], glow: '#b8ff5a', cap: ['#3a5a1a', '#5a8a2a', '#8ab84a'] }],
  GUARD: ['g', { skin: ['#5a1a14', '#8a2a20', '#b84030'], cloth: ['#3a2410', '#5a3a1a'], eye: '#ffe27a', tusk: null, helmet: '#d8b04a', shield: true, club: false }],
  ASSASSIN: ['s', { robe: ['#100c1c', '#221a38', '#3a2e5a', '#5a4884'], glow: '#c07aff', dagger: true }],
  BELLMAGE: ['s', { robe: ['#5a1010', '#8a1e1e', '#b03030', '#d04a3a'], glow: '#ffe27a', bell: true }],
  MAGMAN: ['g', { skin: ['#1e1614', '#3a2a24', '#5a4034'], cloth: ['#2a1e18', '#3a2a20'], eye: '#ffd36b', tusk: null, cracks: true, club: false, claw: true }],
  SALAMANDER: ['c', { hide: ['#6a1408', '#a82a14', '#e0501e', '#ff8a4a'], eye: '#ffe27a', horn: null, spots: '#ffd36b', tail: true }],
  EMBERMAGE: ['s', { robe: ['#1a0e0a', '#2e1a12', '#4a2a1a', '#6a3a22'], glow: '#ff9a3c' }]
};
LOOK.MINISPORE = ['g', { ...LOOK.SPOREMAN[1], cap: ['#3a5a1a', '#5a8a2a', '#8ab84a', '#b8e070'], eye: '#ff3a3a' }];
LOOK.ILLUSION = ['s', { robe: ['#2a1a4a', '#4a3a7a', '#7a5ac0', '#b8a0ff'], glow: '#ffffff', dagger: true }];
LOOK.EMBERHULK = ['g', { ...LOOK.MAGMAN[1], eye: '#ffffff', horns: '#ff7a3c' }];
LOOK.GLACIER = ['s', { robe: ['#1a3a5a', '#2a5a8a', '#5a9ad0', '#bfe8ff'], glow: '#ffffff', cap: ['#8ab8d8', '#c8e8ff', '#ffffff'] }];
LOOK.SPOREMOTHER = ['g', { ...LOOK.SPOREMAN[1], cap: ['#5a1a3a', '#9a2a6a', '#d04a9a', '#ff8ac8'], eye: '#ff3a3a' }];
LOOK.BLADEDANCER = ['s', { robe: ['#2a0a0a', '#5a1414', '#8a2020', '#c03030'], glow: '#ffe27a', dagger: true }];
LOOK.INFERNO = ['c', { ...LOOK.SALAMANDER[1], hide: ['#3a0a04', '#7a1a08', '#c83a14', '#ff7a2a'], spots: '#ffffff', horn: '#ffd36b' }];
const BASE = { g: [drawGrunt, 16, 17], c: [drawCharger, 18, 15], s: [drawShooter, 14, 18] };
import { FOE_ART, FOE_FEET, drawFoe, foePose } from './foes.js';
export const ENEMY_SIZE = { DUMMY: [14, 17] };
export const ENEMY_FEET = new Set();
const ENEMY_DRAW = { DUMMY: drawDummy };
for (const [k, [b, L]] of Object.entries(LOOK)) { const [fn, w, h] = BASE[b]; ENEMY_SIZE[k] = [w, h]; ENEMY_DRAW[k] = P => fn(P, L); }
for (const [k, [b]] of Object.entries(LOOK)) if (b !== 's') ENEMY_FEET.add(k);
for (const k of FOE_FEET) ENEMY_FEET.add(k);
for (const [k, [, w, h]] of Object.entries(FOE_ART)) { ENEMY_SIZE[k] = [w, h]; ENEMY_DRAW[k] = P => drawFoe(k, P); } // quái riêng map 2–5
export function enemyPose(e, t, near) {
  if (FOE_ART[e.type]) return foePose(e, t);
  const P = { by: 0, lx: 0, ly: 0, rx: 0, ry: 0, alx: 0, arx: 0, ary: 0, hd: 0, eyes: 'open' };
  const f = Math.floor(t / 0.11 + e.id) % 4, moving = e.type !== 'DUMMY' && e.state !== 'stagger' && e.freeze <= 0 && e.stun <= 0;
  const ai = (ENEMIES[e.type] || {}).ai;
  if (ai === 'charger') {
    if (e.state === 'tele') { P.low = 2; P.lx = f & 1 ? 1 : 0; P.ly = f & 1 ? -1 : 0; }
    else if (e.state === 'charge') { P.stretch = 1; P.low = 1; P.lx = f & 1 ? -1 : 1; P.rx = -P.lx; }
    else if (moving) { P.lx = [1, 0, -1, 0][f]; P.rx = -P.lx; P.ly = f === 3 ? -2 : 0; P.ry = f === 1 ? -2 : 0; P.by = f & 1 ? -1 : 0; }
  } else if (ai === 'shooter' || ai === 'assassin') {
    P.by = f >= 2 ? 1 : 0; P.hem = f < 2 ? 1 : -1; if (e.state === 'tele' || e.state === 'windup') P.up = 1;
  } else if (ai === 'melee') {
    if (moving) { P.lx = [1, 0, -1, 0][f]; P.rx = -P.lx; P.ly = f === 3 ? -2 : 0; P.ry = f === 1 ? -2 : 0; P.by = f & 1 ? -1 : 0; P.ln = 1; }
    P.club = 1.2;
    if (near) { const k = (t * 3 + e.id * 0.37) % 1; P.club = k < 0.6 ? 2.4 : -0.6; P.ary = k < 0.6 ? -2 : 1; P.hd = k < 0.6 ? 0 : 1; }
  }
  if (e.state === 'stagger' || e.stun > 0) { P.eyes = 'x'; P.hd = 1; P.low = 2; }
  return P;
}

// ---------- boss ----------
function drawColossus(P) { // 40 x 44 — người khổng lồ đá có vết nứt dung nham
  const W = 40, H = 44, g = new Grid(W, H), rock = ['#1e1614', '#2e2220', '#46342c', '#5e4636'], lava = P.pulse ? ['#ff7a3c', '#ffd36b'] : ['#d84a1c', '#ff9a4a'];
  const cr = P.crouch | 0, ln = P.lean | 0, arm = P.arm || 0; // arm: 0 xuống, 1 giơ cao, -1 đập đất
  const R = (dx, dy, x, y) => { if (hash2(Math.floor(x / 2), Math.floor((y + x) / 3), 5) < 0.09) return lava[(x + y) & 1]; return shade(rock, 0.7 - dx * 0.3 - dy * 0.35, x, y); };
  g.rect(11, 34, 6, 10 - cr, (i, j, x, y) => shade(rock, 0.4 + (i < 2 ? 0.2 : 0), x, y)); g.rect(23, 34, 6, 10 - cr, (i, j, x, y) => shade(rock, 0.5, x, y));
  g.rect(9, 42 - cr, 9, 2, rock[1]); g.rect(22, 42 - cr, 9, 2, rock[1]);
  g.ell(20 + ln, 25 + cr, 14, 11, R);
  const sx = 6 + ln, sy = 16 + cr;
  const fist = (x, y) => g.ell(x, y, 4.5, 4, (dx, dy, xx, yy) => shade(rock, 0.75 - dx * 0.3 - dy * 0.4, xx, yy));
  const limb = (x0, y0, x1, y1) => g.line(x0, y0, x1, y1, (k) => rock[2], 5);
  const fy = arm > 0.5 ? sy - 13 : arm < -0.5 ? 39 : sy + 14, fx1 = arm < -0.5 ? 4 + ln : arm > 0.5 ? 9 + ln : 3 + ln, fx2 = arm < -0.5 ? 36 + ln : arm > 0.5 ? 31 + ln : 37 + ln;
  limb(sx, sy, fx1, fy); limb(34 + ln, sy, fx2, fy); fist(fx1, fy); fist(fx2, fy);
  g.ell(sx, sy, 6, 5, R); g.ell(34 + ln, sy, 6, 5, R);
  const hy = 7 + cr + (P.hd | 0); g.ell(20 + ln + (ln > 0 ? 2 : 0), hy + 4, 5, 4.5, (dx, dy, x, y) => shade(rock, 0.8 - dx * 0.2 - dy * 0.4, x, y));
  const eye = P.dim ? '#7a3a1c' : '#ffd36b'; g.rect(18 + ln + (ln > 0 ? 2 : 0), hy + 4, 2, 1, eye); g.rect(22 + ln + (ln > 0 ? 2 : 0), hy + 4, 2, 1, eye);
  g.rect(18 + ln, 26 + cr, 4, 3, lava[1]); g.rect(19 + ln, 27 + cr, 2, 1, '#ffffff');
  return g.canvas();
}
function drawWarden(P) { // 36 x 46 — hiệp sĩ băng với đại kiếm
  const W = 36, H = 46, g = new Grid(W, H), ice = ['#1e3a5a', '#3a6a98', '#6aa8d8', '#bfe8ff'], plate = ['#3a4a62', '#5e7898', '#9ab8d8', '#e0f0ff'], cr = P.crouch | 0;
  for (let y = 18; y <= 42; y++) { const w = 4 + ((y - 18) >> 2), x0 = 12 - w - ((P.cape | 0) && y > 30 ? 1 : 0); g.rect(x0, y, w + 3, 1, (i, j, x) => shade(['#8ab0d0', '#c8e0f4', '#ffffff'], 0.2 + i / (w + 3) * 0.7, x, y)); }
  g.rect(12, 34, 5, 11 - cr, (i, j, x, y) => shade(plate, 0.45 + (i < 2 ? 0.2 : 0), x, y)); g.rect(20, 34, 5, 11 - cr, (i, j, x, y) => shade(plate, 0.55, x, y));
  g.rect(11, 44 - cr, 7, 2, plate[0]); g.rect(19, 44 - cr, 7, 2, plate[0]);
  g.rect(10, 18 + cr, 16, 17, (i, j, x, y) => shade(plate, 0.9 - i * 0.04 - j * 0.02, x, y));
  g.rect(16, 21 + cr, 4, 6, (i, j) => (i + j) & 1 ? ice[3] : ice[2]);
  g.rect(10, 32 + cr, 16, 2, '#2a3448');
  g.ell(10, 19 + cr, 4, 3.5, (dx, dy, x, y) => shade(plate, 0.85 - dy * 0.4, x, y)); g.ell(26, 19 + cr, 4, 3.5, (dx, dy, x, y) => shade(plate, 0.75 - dy * 0.4, x, y));
  const hy = 8 + cr; g.rect(13, hy, 10, 10, (i, j, x, y) => shade(plate, 0.95 - i * 0.06, x, y)); g.rect(15, hy + 5, 7, 1, P.dim ? '#4a6a88' : '#9ff0ff');
  for (const [i, x] of [13, 16, 19, 22].entries()) g.rect(x, hy - 3 - (i % 2 ? 2 : 0), 1, 3 + (i % 2 ? 2 : 0), ice[3]);
  // đại kiếm: 0 cắm đất, 1 giơ sau đầu, -1 chém ngang, 2 tay vươn ra thi phép
  const sw = P.arm || 0, hx = 27, hyy = 24 + cr;
  const blade = (x0, y0, x1, y1) => { g.line(x0, y0, x1, y1, ice[2], 2); g.line(x0, y0, x1, y1, ice[3], 1); };
  if (sw === 2) { g.rect(26, hyy - 2, 8, 3, plate[1]); g.ell(34, hyy - 1, 2.5, 2.5, '#ffffff'); blade(6, 40, 8, 20); }
  else if (sw > 0.5) { g.rect(24, hyy - 8, 3, 8, plate[1]); blade(25, hyy - 9, 4, 2); }
  else if (sw < -0.5) { g.rect(26, hyy, 6, 3, plate[1]); blade(31, hyy + 1, 35, hyy + 1); blade(31, hyy + 1, 35, hyy + 2); }
  else { g.rect(26, hyy, 3, 6, plate[1]); blade(29, hyy - 12, 29, 44); g.rect(27, hyy + 1, 5, 1, '#e6c36a'); }
  return g.canvas();
}
function drawBehemoth(P) { // 56 x 40 — quái thú núi đá bốn chân
  const W = 56, H = 40, g = new Grid(W, H), rock = ['#2a261e', '#4a4232', '#6e624a', '#94866a'], moss = ['#3a5a2e', '#4f7a3c', '#6a9a4c'], cr = P.crouch | 0, rear = P.rear | 0, ln = P.lean | 0;
  const leg = (x, top, d) => { g.rect(x, top, 6, 39 - top, (i, j, xx, yy) => shade(rock, d ? 0.3 : 0.5, xx, yy)); g.rect(x - 1, 38, 8, 2, rock[0]); };
  leg(9, 29 + cr, true); leg(18, 29 + cr, false); leg(32 + ln, 29 + cr - rear, true); leg(41 + ln, 29 + cr - rear, false);
  g.ell(27 + ln * 0.5, 20 + cr - rear * 0.5, 22, 13, (dx, dy, x, y) => dy < -0.45 + hash2(x, 0, 4) * 0.25 ? shade(moss, 0.7 - dx * 0.3, x, y) : shade(rock, 0.7 - dx * 0.25 - dy * 0.4, x, y));
  for (const [x, h] of [[16, 5], [22, 7], [28, 6], [34, 4]]) g.line(x, 9 + cr - rear * 0.5, x - 1, 9 + cr - rear * 0.5 - h, P.pulse ? '#ffb86a' : '#d88a3a', 2);
  const hx = 47 + ln, hy = 22 + cr - rear * 2 + (P.low | 0);
  g.ell(hx, hy, 8.5, 7.5, (dx, dy, x, y) => shade(rock, 0.8 - dx * 0.2 - dy * 0.45, x, y));
  const eye = P.dim ? '#6a4a2a' : '#ffb84a'; g.rect(hx + 1, hy - 2, 2, 2, eye); g.rect(hx + 5, hy - 2, 2, 1, eye);
  g.line(hx + 3, hy + 4, hx + 8, hy + 1, '#efe4c8', 2); g.line(hx - 1, hy + 5, hx + 3, hy + 7, '#efe4c8', 1);
  return g.canvas();
}
function drawSovereign(P) { // 40 x 48 — vua bão lơ lửng
  const W = 40, H = 48, g = new Grid(W, H), robe = ['#1e1438', '#3a2868', '#5a40a0', '#7a5ac8'], gold = ['#a8782a', '#e6b84a', '#ffe27a'], hem = P.hem | 0;
  for (let y = 16; y <= 46; y++) { const w = y < 32 ? 9 : 9 - ((y - 32) * 0.55 | 0), sh = y > 32 ? Math.round(Math.sin(y * 0.5 + hem) * 1.5) : 0, x0 = 20 - w + sh, x1 = 20 + w + sh; if (w <= 0) continue; g.rect(x0, y, x1 - x0, 1, (i, j, x) => y === 31 ? gold[1] : shade(robe, 0.85 - i / (x1 - x0) * 0.7, x, y)); }
  g.rect(18, 16, 4, 15, (i, j) => j % 4 === 0 ? gold[2] : gold[1]);
  const hy = 6 + (P.hd | 0); g.rect(15, hy + 2, 10, 9, (i, j, x, y) => shade(['#b8b0c8', '#d8d0e4', '#f0ecf8'], 0.75 - i * 0.05, x, y));
  g.rect(15, hy + 8, 10, 4, (i, j) => j > 1 && (i + j) % 2 ? '#e8e8f4' : j > 0 ? '#d8d8e8' : null);
  const eye = P.dim ? '#5a6a7a' : '#7fe0ff'; g.rect(17, hy + 5, 2, 1, eye); g.rect(21, hy + 5, 2, 1, eye);
  const ct = P.dim ? 1 : 0; g.rect(14 + ct, hy, 12, 3, (i, j, x, y) => shade(gold, 0.8 - j * 0.3, x, y)); for (const x of [15, 19, 23]) g.line(x + ct, hy, x + 1 + ct, hy - 4, gold[2]);
  g.set(20 + ct, hy + 1, '#7fe0ff');
  const arm = P.arm || 0;
  const sleeve = (x0, y0, x1, y1) => { g.line(x0, y0, x1, y1, robe[2], 4); g.ell(x1, y1, 2.2, 2.2, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : '#7fe0ff'); };
  if (arm > 0.5) { sleeve(12, 18, 9, 6); sleeve(28, 18, 31, 6); g.ell(20, 2.5, 3, 2.5, (dx, dy) => dx * dx + dy * dy < 0.35 ? '#ffffff' : '#9ff0ff'); }
  else if (arm < -0.5) { sleeve(12, 19, 6, 22); sleeve(28, 19, 37, 20); }
  else { sleeve(12, 18, 7, 28); sleeve(28, 18, 33, 28); }
  return g.canvas();
}
function drawDragon(P) { // 64 x 46 — rồng lửa, nhìn sang phải
  const W = 64, H = 46, g = new Grid(W, H), sc = ['#3a0a06', '#6a160c', '#a82a14', '#d8461e', '#ff7a3a'], belly = ['#a8782a', '#e6b84a', '#ffe27a'], mem = ['#3a0e0e', '#6a1a14', '#9a2a1a'];
  const cr = P.crouch | 0, wing = P.arm || 0, mouth = P.mouth | 0, dim = P.dim | 0;
  // cánh phía sau
  const wy = wing > 0.5 ? -6 : wing < -0.5 ? 6 : 0;
  for (const [bx, sgn] of [[26, -1], [30, 1]]) {
    const tipx = bx + sgn * 20, tipy = 2 + wy;
    for (let k = 0; k <= 10; k++) { const t = k / 10, x0 = bx + (tipx - bx) * t, y0 = 18 + cr + (tipy - 18 - cr) * t; g.line(x0, y0, x0 + sgn * 2 - sgn * t * 8, y0 + 12 - t * 4, (u) => shade(mem, 0.3 + t * 0.6, k, u * 10), 1); }
    g.line(bx, 18 + cr, tipx, tipy, sc[1], 2);
  }
  // đuôi
  for (let k = 0; k < 14; k++) { const t = k / 13, x = 18 - t * 16, y = 32 + cr + Math.sin(t * 3 + (P.pulse ? 0.4 : 0)) * 4; g.ell(x, y, 3.2 - t * 2, 2.6 - t * 1.6, (dx, dy, xx, yy) => shade(sc, 0.6 - dy * 0.4, xx, yy)); }
  // chân + thân
  g.rect(22, 34 + cr, 5, 10 - cr, (i, j, x, y) => shade(sc, 0.35, x, y)); g.rect(36, 34 + cr, 5, 10 - cr, (i, j, x, y) => shade(sc, 0.5, x, y));
  g.rect(21, 43, 7, 2, '#2a0806'); g.rect(35, 43, 7, 2, '#2a0806');
  g.ell(31, 28 + cr, 16, 10, (dx, dy, x, y) => dy > 0.25 && Math.abs(dx) < 0.75 ? shade(belly, 0.8 - dy * 0.5, x, y) : (hash2(x, y, 7) < 0.08 ? sc[4] : shade(sc, 0.8 - dx * 0.2 - dy * 0.45, x, y)));
  // cổ + đầu
  const hx = 50 + (P.lean | 0), hy = 13 + cr + (P.hd | 0) + (P.low | 0);
  for (let k = 0; k <= 8; k++) { const t = k / 8, x = 40 + (hx - 40) * t, y = 24 + cr + (hy + 4 - 24 - cr) * t; g.ell(x, y, 4.2 - t * 0.8, 3.8 - t * 0.6, (dx, dy, xx, yy) => dy > 0.3 ? belly[1] : shade(sc, 0.7 - dy * 0.4, xx, yy)); }
  g.ell(hx + 3, hy + 3, 7, 4.5, (dx, dy, x, y) => shade(sc, 0.85 - dx * 0.15 - dy * 0.4, x, y));
  g.rect(hx + 4, hy + 6 + mouth * 2, 7, 2, sc[2]); if (mouth) { g.rect(hx + 5, hy + 6, 6, 2, '#ffd36b'); g.rect(hx + 9, hy + 6, 4, 2, '#ffffff'); }
  g.line(hx - 1, hy, hx - 6, hy - 6, '#efe4c8', 2); g.line(hx + 3, hy - 1, hx + 1, hy - 7, '#efe4c8');
  const eye = dim ? '#6a3a1a' : '#ffe27a'; g.rect(hx + 4, hy + 1, 2, 1, eye);
  for (let k = 0; k < 6; k++) g.set(24 + k * 3, 17 + cr + (k % 2), '#efe4c8'); // gai lưng
  return g.canvas();
}
export const BOSS_DRAW = { DRAGON: [drawDragon, 64, 46], COLOSSUS: [drawColossus, 40, 44], WARDEN: [drawWarden, 36, 46], BEHEMOTH: [drawBehemoth, 56, 40], SOVEREIGN: [drawSovereign, 40, 48] };
Object.assign(BOSS_DRAW, BOSS_PIX, BOSS_FORMS); // boss pixel nét đậm, khung theo trạng thái (bản 2: khối giải phẫu liền mạch)
export function bossPose(b, sim, t) {
  const P = { pulse: Math.floor(t * 3) % 2, hem: Math.floor(t * 6) % 6, rage: b.rage ? 1 : 0 };
  let mode = 'idle';
  if (b.stagger > 0) mode = 'stagger';
  else if (b.leap || b.fly) mode = 'raise';
  else if (b.dashing) mode = 'charge';
  else {
    let wind = false, hit = false;
    for (const h of sim.hazards) { if (h.owner !== b) continue; if (h.done) { if ((h.fade || 0) > 0.12) hit = true; } else if (!h.active) wind = true; }
    mode = hit ? 'slam' : wind ? 'raise' : b.glow > 0 ? 'cast' : 'idle';
  }
  if (mode === 'stagger') { P.dim = 1; P.crouch = 2; P.hd = 2; P.arm = 0; }
  else if (mode === 'raise') { P.arm = 1; P.rear = 3; P.crouch = 0; }
  else if (mode === 'slam') { P.arm = -1; P.crouch = 2; P.low = 3; }
  else if (mode === 'charge') { P.lean = 2; P.low = 3; P.arm = -1; P.cape = 1; }
  else if (mode === 'cast') { P.arm = b.type === 'WARDEN' ? 2 : 1; }
  if (b.type === 'WARDEN' && mode === 'slam') P.arm = -1;
  if (b.type === 'SOVEREIGN' && mode === 'charge') P.arm = -1;
  if (b.type === 'DRAGON') { if (b.fly) { P.arm = 1; P.crouch = 0; } P.mouth = b.glow > 0 || mode === 'slam' ? 1 : 0; if (mode === 'raise' && !b.fly) P.arm = 1; }
  return { P, mode };
}

// ---------- cache khung hình ----------
export class Rig {
  constructor() { this.cache = new Map(); }
  frame(kind, id, P) {
    const key = kind + id + JSON.stringify(P); let f = this.cache.get(key);
    if (f) return f;
    const img = kind === 'h' ? drawHero(id, P) : kind === 'e' ? ENEMY_DRAW[id](P) : BOSS_DRAW[id][0](P);
    f = { img, white: whiteOf(img), red: tintOf(img, '#ff2a2a') }; this.cache.set(key, f);
    if (this.cache.size > 900) this.cache.delete(this.cache.keys().next().value);
    return f;
  }
}
