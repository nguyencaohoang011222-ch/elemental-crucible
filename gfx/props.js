// Vật cản và đồ trang trí vẽ bằng thuật toán từng pixel (có đổ bóng, dither, viền), lưu sẵn theo vùng/kích cỡ.
// Mỗi sprite có điểm neo (ax, ay) = vị trí chân vật trên mặt đất, tính bằng pixel.
import { WPP, pix, whiteOf, hash2, dith, mix } from './pixel.js';
import { BIOME_PROPS } from './biome.js';

const shade4 = (pal, v, x, y) => { const t = Math.max(0, Math.min(0.999, v)) * (pal.length - 1), b = Math.floor(t); return pal[Math.min(pal.length - 1, b + (dith(x, y, t - b) ? 1 : 0))]; };
const TRUNK = ['#2e1e14', '#4e3220', '#6e4a2c'];

// ---------- cây ----------
function roundTree(rW, v, leaves, extra) {
  const R = Math.max(6, Math.round(rW * 1.15 / WPP)), trunkH = Math.round(R * 0.75) + 2, w = 2 * R + 3, h = 2 * R + trunkH, cx = (w - 1) / 2, cy = R;
  const blobs = [[cx, cy, R], [cx - R * 0.52, cy + R * 0.3, R * 0.66], [cx + R * 0.5, cy + R * 0.28, R * 0.64], [cx + R * 0.12 * (v > 0.5 ? 1 : -1), cy - R * 0.38, R * 0.58]];
  const img = pix(w, h, (x, y) => {
    let best = null, bd = 1;
    for (const [bx, by, br] of blobs) { const d = Math.hypot(x - bx, y - by) / br; if (d <= 1 && (best === null || by < best[1] || d < bd * 0.6)) { best = [bx, by, br]; bd = d; } }
    if (best) {
      const [bx, by, br] = best, l = -((x - bx) * 0.55 + (y - by) * 0.85) / br;
      let s = 0.5 + l * 0.45 + (hash2(x, y, 9) - 0.5) * 0.18 - (y > cy + R * 0.55 ? 0.25 : 0);
      if (extra && hash2(x, y, 31 + v * 9) < 0.06 && s > 0.35) return extra;
      return shade4(leaves, s, x, y);
    }
    const tx = Math.abs(x - cx); if (y > cy + R * 0.3 && (tx <= 1.5 || (y > h - 3 && tx <= 2.5))) return x < cx - 0.5 ? TRUNK[2] : x > cx + 0.5 ? TRUNK[0] : TRUNK[1];
    return null;
  });
  return { img, ax: cx + 1, ay: h };
}
function pine(rW, v, needles, snow) {
  const R = Math.max(6, Math.round(rW * 1.05 / WPP)), H = Math.round(R * 2.6), trunkH = 4, w = 2 * R + 1, h = H + trunkH, cx = R, tierH = H / 3.2;
  const img = pix(w, h, (x, y) => {
    if (y < H) {
      const tier = Math.min(2, Math.floor(y / tierH)), local = (y - tier * tierH) / tierH, hw = (0.42 + tier * 0.29) * R * (0.25 + local * 0.75), dx = x - cx;
      if (Math.abs(dx) <= hw + 0.3) {
        if (snow && (local < 0.3 || (local < 0.55 && dx < 0)) && hash2(x, y, 5) < 0.8) return y % 2 ? snow : '#ffffff';
        return shade4(needles, 0.55 - dx / (hw + 1) * 0.4 - local * 0.2, x, y);
      }
      return null;
    }
    return Math.abs(x - cx) <= 1 ? (x < cx ? TRUNK[2] : TRUNK[1]) : null;
  });
  return { img, ax: cx + 1, ay: h };
}
function mushroom(rW, v, cap, spot) {
  const R = Math.max(6, Math.round(rW * 1.1 / WPP)), stemH = Math.round(R * 0.9), capH = Math.round(R * 0.8), w = 2 * R + 1, h = capH + stemH, cx = R;
  const img = pix(w, h, (x, y) => {
    if (y < capH) {
      const nx = (x - cx) / R, ny = (capH - y) / capH; if (nx * nx + ny * ny > 1) return null;
      if (hash2(x, y, 17 + v * 5) < 0.09 && y < capH - 2) return spot;
      return shade4(cap, 0.65 - nx * 0.35 + ny * 0.2 - (y === capH - 1 ? 0.5 : 0), x, y);
    }
    const sw = 1.5 + (y > h - 3 ? 1 : 0); return Math.abs(x - cx) <= sw ? (x < cx ? '#efe4c8' : '#bfb090') : null;
  });
  return { img, ax: cx + 1, ay: h, glow: { dy: -h * 0.8, c: spot, r: 120 } };
}

// bom sắt (núi lửa): đánh trúng là châm ngòi
function bomb(rW) {
  const R = Math.max(6, Math.round(rW * 1.0 / WPP)), w = 2 * R + 1, h = 2 * R + 4, cx = R, cy = R + 3;
  const img = pix(w, h, (x, y) => {
    const dx = (x - cx) / R, dy = (y - cy) / R;
    if (y < 4 && Math.abs(x - cx - (3 - y) * 0.6) < 0.8) return y === 0 ? '#ffd36b' : '#c8983a';
    if (y >= 3 && y <= 4 && Math.abs(x - cx) <= 1) return '#5a5a66';
    if (dx * dx + dy * dy > 1) return null;
    if (Math.abs(dy) < 0.12) return '#7a2010';
    if (dx < -0.2 && dy < -0.25 && dx * dx + dy * dy < 0.5 && dx * dx + dy * dy > 0.15) return '#9a9aa8';
    return shade4(['#0c0c12', '#1c1c24', '#2e2e3a', '#46465a'], 0.6 - dx * 0.3 - dy * 0.4, x, y);
  });
  return { img, ax: cx + 1, ay: h - 1, bomb: true };
}
// tinh thể hợp nhất: phá ra có thể rơi Đá hợp nhất
function crystal(rW) {
  const w = 14, h = 22, cx = 6.5;
  const shards = [[cx, 0, 3.2, 20], [cx - 4, 7, 2.2, 13], [cx + 4.5, 9, 2, 11]];
  const img = pix(w, h, (x, y) => {
    for (const [sx, top, hw, len] of shards) { if (y < top || y > top + len) continue; const k = (y - top) / len, half = k < 0.25 ? hw * k / 0.25 : hw; if (Math.abs(x - sx) <= half) return x < sx - half * 0.3 ? '#f0c8ff' : x > sx + half * 0.4 ? '#6a2a9a' : (hash2(x, y, 3) < 0.12 ? '#ffffff' : '#b06ae8'); }
    if (y >= h - 2 && Math.abs(x - cx) < 6) return '#3a3040';
    return null;
  });
  return { img, ax: cx + 1, ay: h, glow: { dy: -12, c: '#c07aff', r: 130 } };
}
// cây chết cháy đen (núi lửa)
function deadTree(rW, v) {
  const R = Math.max(6, Math.round(rW * 1.1 / WPP)), w = 2 * R + 3, h = Math.round(R * 2.4), cx = (w - 1) / 2;
  const br = [[cx, h - 1, cx, h * 0.3], [cx, h * 0.55, cx - R * 0.8, h * 0.2], [cx, h * 0.45, cx + R * 0.9, h * 0.15], [cx - R * 0.4, h * 0.38, cx - R * 0.9, h * 0.45], [cx + R * 0.5, h * 0.3, cx + R * 0.7, 1]];
  const set = new Map();
  br.forEach(([x0, y0, x1, y1], k) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); set.set(x + ',' + y, hash2(x, y, 4 + k) < 0.1 ? '#ff5a1a' : k === 0 ? '#2a1e1a' : '#3a2a24'); if (k === 0) { set.set((x + 1) + ',' + y, '#1a1210'); set.set((x - 1) + ',' + y, '#3a2a24'); } } });
  const img = pix(w, h, (x, y) => set.get(x + ',' + y) || null);
  return { img, ax: cx + 1, ay: h };
}
// ---------- đá ----------
function rock(rW, v, pal, cap, vein) {
  const rx = Math.max(5, Math.round(rW * 1.05 / WPP)), ry = Math.max(4, Math.round(rx * 0.78)), w = 2 * rx + 1, h = 2 * ry + 1, cx = rx, cy = ry;
  const img = pix(w, h, (x, y) => {
    const dx = (x - cx) / rx, dy = (y - cy) / ry, a = Math.atan2(dy, dx), wob = 1 - 0.13 * hash2(Math.floor((a + 3.2) * 2.2), 3, 7 + v * 11);
    if (dx * dx + dy * dy > wob * wob) return null;
    const facet = (hash2(Math.floor((a + 3.2) * 1.4), 1, 13 + v * 7) - 0.5) * 0.25;
    if (vein && hash2(Math.floor(x / 2), Math.floor((x + y) / 2), 9) < 0.07) return hash2(x, y, 2) < 0.5 ? vein : '#ffb84a';
    if (cap && dy < -0.25 + hash2(x, 0, 3) * 0.2) return dy < -0.6 && cap === '#e8f2f8' ? '#ffffff' : (hash2(x, y, 8) < 0.3 ? mix(cap, '#ffffff', 0.25) : cap);
    return shade4(pal, 0.55 - dx * 0.3 - dy * 0.4 + facet, x, y);
  });
  return { img, ax: cx + 1, ay: h - 1 };
}

// ---------- cột ----------
function pillar(rW, v, theme) {
  const pw = Math.max(4, Math.round(rW * 2 / WPP) - 2), ph = Math.round(rW * 3.6 / WPP), w = pw + 2, h = ph, cx = (w - 1) / 2;
  const P = {
    forest: ['#5e5f56', '#8a8a7c', '#aeae9c', '#c8c8b4'], frost: ['#4a8fb8', '#7fc4e8', '#b8e8ff', '#e8faff'],
    volcano: ['#100c12', '#221a26', '#3a2c40', '#5a4462'], dungeon: ['#2c2d36', '#474956', '#626573', '#7f8290'], palace: ['#5a1010', '#8a1e1e', '#b03030', '#d04a3a']
  }[theme];
  const broken = theme === 'forest' && v > 0.4;
  const img = pix(w, h, (x, y) => {
    const capRow = y < 2 || y >= h - 2, inner = x >= 1 && x <= w - 2;
    if (!capRow && !inner) return null;
    if (theme === 'frost') { // tinh thể băng: đỉnh nhọn
      const hw = y < pw ? (y / pw) * (w / 2) : w / 2; if (Math.abs(x - cx) > hw) return null;
      return shade4(P, 0.75 - (x - cx) / w * 0.9 + (hash2(x, y, 4) < 0.08 ? 0.4 : 0), x, y);
    }
    if (broken && y < 3 + Math.round(hash2(x, 1, 3) * 3)) return null;
    if (theme === 'palace' && (y === 3 || y === 4 || y === h - 5 || y === h - 4)) return x < cx ? '#f0cc6a' : '#c8983a';
    if (theme === 'forest' && hash2(x, y, 21) < 0.12 && y < h * 0.6) return hash2(x, y, 2) < 0.5 ? '#4d7a3c' : '#5f9446';
    let s = 0.75 - (x - 1) / (pw) * 0.6 + (capRow ? 0.15 : 0);
    if (theme !== 'palace' && hash2(x, y, 33 + v * 3) < 0.05) s -= 0.4;
    return shade4(P, s, x, y);
  });
  const torch = theme === 'dungeon' || theme === 'volcano' ? { dy: -h + 2 } : null;
  return { img, ax: cx + 1, ay: h, flame: torch, glow: theme === 'frost' ? { dy: -h * 0.6, c: '#9fe6ff', r: 110 } : torch ? { dy: -h + 1, c: '#ff9a3c', r: 150 } : null };
}

// ---------- thùng, rương ----------
function crate(rW, v, kind) {
  const s = Math.max(7, Math.round(rW * 2.1 / WPP)), w = s, h = s;
  if (kind === 'iron') { const img = pix(w, h + 1, (x, y) => { const dx = Math.abs(x - (w - 1) / 2) / (w / 2); if (dx > 1 - (y === 0 || y === h ? 0.25 : 0)) return null; if (y === 2 || y === h - 2) return '#ff7a3c'; return shade4(['#1a1a20', '#2e2e36', '#46464e', '#5e5e66'], 0.7 - (x - w / 2) / w, x, y); }); return { img, ax: w / 2 + 0.5, ay: h + 1 }; }
  if (kind === 'barrel' || (kind === 'wood' && v > 0.6)) {
    const img = pix(w, h + 1, (x, y) => { const dx = Math.abs(x - (w - 1) / 2) / (w / 2); if (dx > 1 - (y === 0 || y === h ? 0.25 : 0)) return null; if (y === 2 || y === h - 2) return '#3a3a40'; return shade4(['#4a2e1a', '#6e4626', '#8e5e34', '#a8743e'], 0.7 - (x - w / 2) / w - (y === 0 ? -0.2 : 0), x, y); });
    return { img, ax: w / 2 + 0.5, ay: h + 1 };
  }
  if (kind === 'chest' && v > 0.5) {
    const img = pix(w + 2, h, (x, y) => { const W = w + 2; if (y === 3) return '#3a2410'; if (x === 0 || x === W - 1 || y === 0 || y === h - 1) return '#c8983a'; if ((x === Math.floor(W / 2) || x === Math.floor(W / 2) - 1) && y >= 2 && y <= 5) return y === 4 ? '#3a2a10' : '#f0cc6a'; return shade4(['#5a2e14', '#7a4220', '#9a582c'], 0.7 - x / W * 0.5 - (y < 3 ? -0.2 : 0), x, y); });
    return { img, ax: (w + 2) / 2 + 0.5, ay: h, chest: true };
  }
  const red = kind === 'chest';
  const P = red ? ['#4a1010', '#7a1e1e', '#9a2a26'] : ['#5a3a1e', '#7e5430', '#9e6e40'];
  const img = pix(w, h, (x, y) => {
    if (x === 0 || x === w - 1 || y === 0 || y === h - 1) return red ? '#c8983a' : '#4a2e16';
    if (!red && (x === y || x === w - 1 - y)) return '#5a3a1e';
    if (y === 1 && kind === 'wood' && hash2(x, 0, 9) < 0.5 && v > 0.3) return null;
    return shade4(P, 0.75 - x / w * 0.5 - (y % 3 === 0 ? 0.2 : 0), x, y);
  });
  return { img, ax: w / 2 + 0.5, ay: h };
}

// ---------- địa hình đất lồi (gờ / gò / đá nhọn) ----------
const EARTHPAL = {
  forest: ['#2e2016', '#4e3822', '#765630', '#a07c4a'], frost: ['#2a384a', '#46607a', '#7490aa', '#aec8dc'], dungeon: ['#1c1726', '#332a46', '#50426a', '#74648e'],
  palace: ['#43342a', '#6e5a46', '#9a8262', '#c4aa84'], volcano: ['#100b10', '#241a22', '#3c2c38', '#5a4454']
};
const CAP = { forest: ['#255e33', '#367e3e', '#58a64e'], frost: ['#a8c0d4', '#d4e4f0', '#f4fafe'], volcano: ['#a02a0c', '#ff6a1e', '#ffc04a'] };
function bump(r, v, theme, kind) {
  const P = EARTHPAL[theme] || EARTHPAL.forest, C = CAP[theme] || null, w = Math.round(r * (kind === 'ridge' ? 3.0 : 2.5) / WPP) + 2, h = Math.round(r * (kind === 'ridge' ? 1.5 : 1.7) / WPP) + 2, cx = (w - 1) / 2;
  const seed = Math.round(v * 97);
  const top = x => { const u = Math.abs(x - cx) / (cx + 0.5); let t = Math.sqrt(Math.max(0, 1 - u * u)); if (kind === 'ridge') t = Math.pow(t, 0.7) * (0.78 + 0.22 * hash2(x, seed, 3)); else t = Math.pow(t, 0.85); return h - 2 - Math.round(t * (h - 3)); };
  const img = pix(w, h, (x, y) => {
    if (y >= h - 1) return Math.abs(x - cx) < cx - 1 ? P[0] : null;
    const ty = top(x); if (y < ty) return null;
    const dd = y - ty, lum = 0.62 - (x - cx) / w * 0.8 + (dd < 2 ? 0.18 : 0) - dd / h * 0.25;
    if (C && dd < (theme === 'frost' ? 3 : 2) && hash2(x, y, seed) > 0.12) return shade4(C, 0.7 - (x - cx) / w * 0.6, x, y);
    if (theme === 'volcano' && hash2(x >> 1, y >> 1, seed + 5) < 0.07 && dd > 2) return shade4(CAP.volcano, 0.8, x, y);
    return hash2(x, y, seed + 9) < 0.05 ? P[3] : shade4(P, lum, x, y);
  });
  return { img, ax: w / 2, ay: h - 1.5 };
}
function shardSprite(r, v, theme) {
  const P = theme === 'frost' ? ['#3a74a0', '#6cb4e0', '#a8e0ff', '#eaffff'] : theme === 'volcano' ? ['#100b10', '#2c2030', '#4a3848', '#ff7a2a'] : theme === 'dungeon' ? ['#3a2870', '#6a48b8', '#a47af0', '#d8c4ff'] : theme === 'palace' ? ['#6a5a3a', '#9a8458', '#c8b27c', '#eadcaa'] : ['#4a3c2a', '#7a644a', '#a8906e', '#d0bc98'];
  const w = Math.round(r * 1.7 / WPP) + 2, h = Math.round(r * 3.4 / WPP) + 2, cx = (w - 1) / 2, lean = (v - 0.5) * 3, seed = Math.round(v * 61);
  const img = pix(w, h, (x, y) => {
    const t = y / (h - 1), tipx = cx + lean * (1 - t), hw = (w / 2 - 0.5) * Math.pow(t, 0.75) + 0.4; if (Math.abs(x - tipx) > hw) return null;
    const side = x < tipx ? 0.3 : 0.75, e = Math.abs(x - tipx) > hw - 1.2 ? -0.18 : 0;
    return hash2(x, y, seed) < 0.05 ? P[3] : shade4(P, side + e + t * 0.1, x, y);
  });
  return { img, ax: w / 2, ay: h - 1 };
}

// thùng mana trong đấu trường: thêm đai xanh lam phát sáng để dễ nhận ra
function supplyBand(s) {
  const c = document.createElement('canvas'); c.width = s.img.width; c.height = s.img.height; const x = c.getContext('2d'); x.drawImage(s.img, 0, 0);
  x.globalCompositeOperation = 'source-atop'; const y = Math.floor(c.height * 0.45); x.fillStyle = '#38bdf8'; x.fillRect(0, y, c.width, 2); x.fillStyle = '#bae6fd'; x.fillRect(Math.floor(c.width / 2) - 1, y - 1, 2, 4);
  return { ...s, img: c, glow: { dy: -c.height * 0.5, c: '#38bdf8', r: 70 } };
}

// ---------- đèn ----------
function lamp(theme, T) {
  if (theme === 'dungeon' || theme === 'volcano') { // chậu lửa
    const w = 9, h = 9;
    const img = pix(w, h, (x, y) => { if (y <= 3) return Math.abs(x - 4) <= 4 - (y === 3 ? 1 : 0) ? (y === 0 ? '#2a2a30' : shade4(['#3a3a44', '#5a5a66', '#7a7a88'], 0.8 - x / 9, x, y)) : null; if (y < h - 1) return Math.abs(x - 4) <= 0.5 ? '#3a3a44' : null; return Math.abs(x - 4) <= 2 ? '#2a2a30' : null; });
    return { img, ax: 5, ay: h, flame: { dy: -h + 1 }, glow: { dy: -h, c: T.lamp, r: 190 } };
  }
  if (theme === 'palace') { // đèn lồng giấy
    const w = 7, h = 19;
    const img = pix(w, h, (x, y) => {
      if (y < 9) { if (y === 0 || y === 8) return Math.abs(x - 3) <= 1 ? '#d8b04a' : null; const hw = [0, 2, 3, 3, 3, 3, 3, 2, 0][y]; if (Math.abs(x - 3) > hw) return null; return y === 4 ? '#ffd88a' : shade4(['#a01818', '#d83a2a', '#ff7a4a'], 0.8 - (x - 3) / 6 + (y === 3 || y === 5 ? 0.2 : 0), x, y); }
      if (y < h - 1) return x === 3 ? '#4a2e1a' : null; return Math.abs(x - 3) <= 2 ? '#3a2416' : null;
    });
    return { img, ax: 4, ay: h, glow: { dy: -h + 4, c: T.lamp, r: 170 } };
  }
  const w = 7, h = 18; // cột đèn sắt
  const img = pix(w, h, (x, y) => {
    if (y === 0) return Math.abs(x - 3) <= 2 ? '#2a2a30' : null;
    if (y <= 5) { if (x === 0 || x === 6) return null; if (x === 1 || x === 5) return '#2a2a30'; return y === 1 || y === 5 ? '#2a2a30' : (x === 2 ? '#fff4c0' : T.lamp); }
    if (theme === 'frost' && y === 6 && (x === 1 || x === 5)) return '#e8faff';
    if (y < h - 2) return x === 3 ? '#3a3a44' : null; return Math.abs(x - 3) <= 2 - (y === h - 1 ? 0 : 1) ? '#2a2a30' : null;
  });
  return { img, ax: 4, ay: h, glow: { dy: -h + 3, c: T.lamp, r: 180 } };
}

// ---------- cụm cỏ (7 độ nghiêng cho mỗi hình) ----------
const TUFTS = [[[-2, 4], [0, 6], [2, 5]], [[-3, 3], [-1, 5], [1, 6], [3, 4]], [[-1, 4], [1, 5]], [[-2, 5], [0, 4], [1, 6], [3, 3]]];

export class Props {
  constructor() { this.cache = new Map(); }
  get(theme, T, o) {
    // khối đấu trường boss: đá theo theme (núi lửa = basalt), trụ băng, cột đá, cột phù văn
    if (o.type === 'rimrock' || o.type === 'arenarock') { if (theme !== 'volcano') return this.get(theme, T, { r: o.r, v: o.v, type: 'rock' }); }
    const key = theme + o.type + ((o.v * 3) | 0) + ':' + Math.round(o.r / 3) + (o.supply ? 'S' : ''); let s = this.cache.get(key);
    if (s) return s;
    const v = ((o.v * 3) | 0) / 3 + 0.1, r = o.r;
    if (BIOME_PROPS[o.type]) s = BIOME_PROPS[o.type](r, v, theme);
    else if (theme === 'volcano' && o.type === 'tree') s = deadTree(r, v);
    else if (theme === 'volcano' && o.type === 'rock') s = bomb(r);
    else if (o.type === 'tree') s = theme === 'frost' ? pine(r, v, ['#14302a', '#1f4a3c', '#2c6450', '#3c7e62'], '#dfe9f0')
      : theme === 'dungeon' ? mushroom(r, v, ['#2a1e52', '#47307e', '#6a48b0', '#9a74e0'], '#9ff0ff')
      : theme === 'palace' ? roundTree(r, v, ['#7a2e50', '#b04a7a', '#de7aa6', '#ffb8d4'], '#fff0f6')
      : roundTree(r, v, ['#18402a', '#255e33', '#367e3e', '#58a64e'], null);
    else if (o.type === 'rock') s = theme === 'frost' ? rock(r, v, ['#34445a', '#56708c', '#84a0bc', '#b4cce0'], '#e8f2f8')
      : theme === 'dungeon' ? rock(r, v, ['#1c1d24', '#33353f', '#4c4f5c', '#6c6f7d'], null)
      : theme === 'palace' ? rock(r, v, ['#4a443c', '#6e665a', '#948a78', '#bab09a'], null)
      : rock(r, v, ['#30313a', '#555865', '#7d808c', '#a8abb6'], v > 0.5 ? '#4d7a3c' : null);
    else if (o.type === 'pillar') s = pillar(r, v, theme);
    else if (o.type === 'crate') { s = crate(r, v, T.crateKind); if (o.supply) s = supplyBand(s); }
    else if (o.type === 'lamp') s = lamp(theme, T);
    else if (o.type === 'crystal') s = crystal(r);
    else if (o.type === 'rimrock' || o.type === 'arenarock') s = rock(r, v, ['#100c12', '#2a2030', '#45364c', '#66526c'], null);
    else if (o.type === 'spire') s = shardSprite(r * 1.25, v, 'frost');
    else if (o.type === 'menhir') s = shardSprite(r * 1.15, 0.5 + (v - 0.5) * 0.3, theme === 'dungeon' ? 'forest' : theme);
    else if (o.type === 'obelisk') { s = pillar(r, 0.2, theme === 'palace' ? 'dungeon' : theme); s = { ...s, glow: { dy: -s.img.height * 0.6, c: o.glowC || '#c9a8ff', r: 130 } }; }
    else if (o.type === 'ridge') s = bump(r, v, theme, 'ridge');
    else if (o.type === 'mound') s = bump(r, v, theme, 'mound');
    else if (o.type === 'shard') s = shardSprite(r, v, theme);
    else if (o.type === 'stone') s = pillar(r * 1.1, 0.2, 'forest');
    else if (o.type === 'icewall') s = pillar(r * 1.1, 0.3, 'frost');
    else s = rock(r, v, ['#30313a', '#555865', '#7d808c', '#a8abb6'], null);
    s.white = whiteOf(s.img);
    this.cache.set(key, s);
    return s;
  }
  tuft(theme, T, shape, ci, lean) {
    const key = 't' + theme + shape + ci + lean; let c = this.cache.get(key);
    if (c) return c;
    const blades = TUFTS[shape], base = T.tuft[ci], tip = mix(base, '#ffffff', 0.25), dark = mix(base, '#000000', 0.3);
    const W = 13, H = 8;
    const set = new Map();
    for (const [dx, h] of blades) for (let k = 0; k < h; k++) { const x = 6 + dx + Math.round(lean * Math.pow(k / Math.max(1, h - 1), 2)), y = H - 1 - k; set.set(x + ',' + y, k === h - 1 ? tip : k < 2 ? dark : base); }
    c = pix(W, H, (x, y) => set.get(x + ',' + y) || null, null);
    this.cache.set(key, c);
    return c;
  }
}
