// Biểu tượng pixel 16x16 cho mọi chiêu (theo hình dạng chiêu + màu nguyên tố) và mọi nâng cấp.
// Sinh bằng code một lần rồi cache dạng dataURL để dùng trong HTML (<img>).
import { Grid, mix } from './pixel.js';
import { EL_INFO, GROUP_COLOR } from '../kits.js';
import { ULT_GLYPH } from './ulticons.js';

const cache = new Map();
const W = '#ffffff', K = '#0c0a12';
const elc = el => (EL_INFO[el] || { color: '#cccccc' }).color;
const lite = c => mix(c, '#ffffff', 0.45), dark = c => mix(c, '#000000', 0.45);

// ---------- khung nền ----------
function frame(g, border, tier, tint) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const corner = (x === 0 || x === 15) && (y === 0 || y === 15); if (corner) continue;
    const edge = x === 0 || x === 15 || y === 0 || y === 15;
    const d = Math.hypot(x - 7.5, y - 7.5) / 10.6;
    g.set(x, y, edge ? border : mix(tint ? mix('#2a2a3a', tint, 0.35) : '#2a2a3a', '#0e0e16', d));
  }
  if (tier) { g.rect(1, 1, 14, 1, mix(border, '#ffffff', 0.3)); }
}
const gems = (g, els) => { [[1, 1], [13, 1]].forEach(([x, y], i) => { const c = elc(els[i % els.length]); g.rect(x, y, 2, 2, c); g.set(x, y, lite(c)); }); };

// huy hiệu nguyên tố 5x5 ở góc: phân biệt các chiêu ghép có cùng hình dạng
const MINI = { FIRE: ['..#..', '.##..', '.###.', '#####', '.###.'], WATER: ['..#..', '.###.', '#####', '#####', '.###.'], EARTH: ['.###.', '#####', '#####', '####.', '.....'], WIND: ['####.', '....#', '.###.', '#....', '.####'] };
function badge(g, el, x, y) { g.rect(x - 1, y - 1, 7, 7, K); const c = elc(el); MINI[el].forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') g.set(x + i, y + j, j === 0 || i === 0 ? lite(c) : c); })); }

// ---------- ký hiệu nguyên tố ----------
const GLYPH = {
  FIRE: (g, ox = 0, oy = 0, s = 1) => { const c = elc('FIRE'); g.ell(8 + ox, 10 + oy, 4 * s, 4 * s, '#d84a1c'); g.ell(8 + ox, 8 + oy, 3 * s, 4.5 * s, c); g.line(8 + ox, 2 + oy, 8 + ox, 6 + oy, c); g.ell(8 + ox, 10 + oy, 1.8 * s, 2.4 * s, '#ffd36b'); g.line(5 + ox, 5 + oy, 6 + ox, 8 + oy, c); g.line(11 + ox, 4 + oy, 10 + ox, 8 + oy, c); },
  WATER: (g, ox = 0, oy = 0, s = 1) => { const c = elc('WATER'); g.ell(8 + ox, 10 + oy, 4 * s, 4 * s, c); for (let i = 0; i < 6; i++) g.rect(8 + ox - (i >> 1), 3 + oy + i, 1 + (i >> 1) * 2, 1, c); g.set(6 + ox, 9 + oy, W); g.set(6 + ox, 10 + oy, lite(c)); g.rect(9 + ox, 12 + oy, 2, 1, dark(c)); },
  EARTH: (g, ox = 0, oy = 0) => { const c = elc('EARTH'); g.rect(3 + ox, 8 + oy, 10, 5, dark(c)); g.rect(4 + ox, 6 + oy, 8, 6, c); g.rect(6 + ox, 4 + oy, 4, 3, c); g.rect(5 + ox, 6 + oy, 2, 1, lite(c)); g.rect(7 + ox, 4 + oy, 2, 1, lite(c)); g.line(9 + ox, 8 + oy, 11 + ox, 11 + oy, dark(c)); },
  WIND: (g, ox = 0, oy = 0) => { const c = elc('WIND'); for (let i = 0; i < 22; i++) { const a = i * 0.48, r = 1 + i * 0.25; g.set(8 + ox + Math.cos(a) * r, 8 + oy + Math.sin(a) * r * 0.85, i > 16 ? lite(c) : c); } g.line(2 + ox, 12 + oy, 7 + ox, 12 + oy, lite(c)); g.line(9 + ox, 3 + oy, 14 + ox, 3 + oy, c); }
};

// ---------- ký hiệu theo hình dạng chiêu (c = màu chính, a = màu phụ) ----------
const SHAPE = {
  arc: (g, c, a) => { g.ell(8, 9, 6.5, 6.5, (dx, dy) => (dx + 0.25) * (dx + 0.25) + (dy + 0.3) * (dy + 0.3) > 0.55 && dx > -0.2 ? (dx > 0.75 ? W : c) : null); g.line(3, 13, 6, 10, '#c8983a'); g.set(2, 14, '#5a3a1a'); g.rect(10, 3, 2, 1, a); },
  whirl: (g, c, a) => { for (let i = 0; i < 30; i++) { const q = i * 0.42, r = 0.6 + i * 0.2; g.set(8 + Math.cos(q) * r, 8 + Math.sin(q) * r, i > 22 ? W : i % 3 ? c : a); } },
  spikes: (g, c, a) => { for (const [x, h] of [[4, 6], [8, 9], [12, 5]]) for (let j = 0; j < h; j++) { const w = Math.max(0, Math.floor((h - j) / 2.2)); g.rect(x - w, 13 - j, w * 2 + 1, 1, j === h - 1 ? lite(a) : j > h / 2 ? c : dark(c)); } g.rect(2, 13, 12, 1, dark(c)); },
  charge: (g, c, a) => { g.rect(6, 7, 5, 3, c); for (let i = 0; i < 4; i++) g.rect(10 + i, 5 + i, 1, 7 - i * 2, i === 0 ? W : c); for (const y of [5, 8, 11]) g.line(1, y, 4, y, a); },
  roll: (g, c, a) => { for (let i = 0; i < 20; i++) { const q = -0.5 + i * 0.28, r = 5; g.set(8 + Math.cos(q) * r, 8 + Math.sin(q) * r, c); } g.rect(2, 6, 3, 1, W); g.rect(3, 5, 1, 3, W); g.line(9, 4, 14, 2, a); g.set(14, 2, W); },
  leap: (g, c, a) => { for (let i = 0; i < 9; i++) { const x = 2 + i * 1.3, y = 12 - Math.sin(i / 8 * Math.PI) * 9; if (i % 2 === 0) g.set(x, y, c); } g.ell(12, 12, 3, 1.6, a); g.line(9, 13, 15, 13, dark(a)); g.set(12, 9, W); g.set(14, 10, W); g.set(10, 10, W); },
  bolt: (g, c, a) => { g.line(2, 14, 8, 8, dark(c), 2); g.line(4, 13, 9, 9, a, 1); g.ell(10.5, 5.5, 3.6, 3.6, c); g.ell(10, 5, 1.8, 1.8, '#fff6c0'); },
  volley: (g, c, a) => { for (const q of [-0.45, 0, 0.45]) { const ex = 3 + Math.cos(q - 0.78) * 11, ey = 13 + Math.sin(q - 0.78) * 11; g.line(3, 13, ex, ey, '#e8dcc0'); g.rect(ex - 1, ey - 1, 2, 2, c); } g.rect(2, 12, 3, 3, a); },
  trap: (g, c, a) => { g.ell(8, 9, 6, 4, (dx, dy) => dx * dx + dy * dy > 0.5 ? c : null); for (let x = 3; x <= 13; x += 2) { g.set(x, 6 + (x % 4 ? 0 : 1), W); g.set(x, 12 - (x % 4 ? 0 : 1), W); } g.rect(7, 8, 2, 2, a); },
  rain: (g, c, a) => { g.ell(8, 4, 6, 2.5, mix(a, '#888899', 0.5)); for (const [x, y] of [[3, 8], [6, 10], [9, 8], [12, 11], [5, 13], [11, 14], [8, 12]]) { g.line(x, y, x - 1, y + 2, c); g.set(x - 1, y + 2, W); } },
  beam: (g, c, a) => { g.line(2, 13, 14, 3, dark(c), 3); g.line(2, 13, 14, 3, c, 2); g.line(3, 12, 13, 4, W, 1); g.rect(1, 12, 3, 3, a); },
  ground: (g, c, a) => { g.ell(8, 12.5, 6, 2.2, (dx, dy) => dx * dx + dy * dy > 0.45 ? c : dark(c)); g.line(12, 1, 9, 8, a, 2); g.ell(8.5, 8.5, 2.2, 2.2, lite(a)); },
  nova: (g, c, a) => { for (let i = 0; i < 8; i++) { const q = i * Math.PI / 4; g.line(8 + Math.cos(q) * 2, 8 + Math.sin(q) * 2, 8 + Math.cos(q) * (i % 2 ? 5 : 7), 8 + Math.sin(q) * (i % 2 ? 5 : 7), i % 2 ? a : c); } g.ell(8, 8, 2.2, 2.2, W); },
  blink: (g, c, a) => { for (let i = 0; i < 5; i++) g.set(3 + i * 2, 11 - i * 1.4, a); for (const [x, y, s] of [[12, 4, 3], [4, 12, 2]]) { g.line(x - s, y, x + s, y, c); g.line(x, y - s, x, y + s, c); g.set(x, y, W); } },
  cyclone: (g, c, a) => { for (let j = 0; j < 6; j++) { const w = 1.5 + j * 1.1, y = 13 - j * 2; g.ell(8 + (j % 2 ? 1 : 0), y, w, 1.2, j % 2 ? c : a); } g.set(9, 3, W); },
  well: (g, c, a) => { g.ell(8, 8, 6.5, 6.5, (dx, dy) => { const d = Math.hypot(dx, dy); return d > 0.85 ? c : d > 0.6 ? null : d > 0.4 ? a : '#05040a'; }); g.set(5, 5, W); },
  storm: (g, c, a) => { g.ell(6, 5, 4, 2.6, '#9aa0b8'); g.ell(10, 4.5, 4, 3, '#b8bed4'); g.line(9, 7, 6, 11, a, 2); g.line(6, 11, 9, 11, a, 1); g.line(9, 11, 6, 15, W, 1); }
};

function toURL(g) { return g.canvas(K).toDataURL(); }

// def: chiêu đã sinh (có shape, els, group, tier)
export function iconSkill(def) {
  if (!def) return '';
  const key = 'S' + def.key; if (cache.has(key)) return cache.get(key);
  const g = new Grid(16, 16), els = def.combo || def.els, tier = def.tier === 3 || def.group === 'ULTIMATE';
  const c = elc(els[0]), a = elc(els[els.length - 1]);
  frame(g, tier ? '#f0c060' : GROUP_COLOR[def.group] || '#888', tier, els.length > 1 && a !== c ? a : null);
  if (def.glyph && ULT_GLYPH[def.glyph]) { ULT_GLYPH[def.glyph](g, def.pal); els.slice(0, 3).forEach((el, i) => { g.rect(4 + i * 3, 14, 2, 1, elc(el)); }); const url = toURL(g); cache.set(key, url); return url; }
  (SHAPE[def.shape] || SHAPE.nova)(g, c, a === c ? lite(c) : a);
  if (tier) gems(g, els);
  if (els.length >= 3) { badge(g, els[1], 2, 10); badge(g, els[2], 10, 10); }
  else if (els.length === 2 && els[0] !== els[1]) badge(g, els[1], 10, 10);
  const url = toURL(g); cache.set(key, url); return url;
}
export function iconElement(el) {
  const key = 'E' + el; if (cache.has(key)) return cache.get(key);
  const g = new Grid(16, 16); frame(g, elc(el)); GLYPH[el](g);
  const url = toURL(g); cache.set(key, url); return url;
}

// ---------- nâng cấp ----------
const heart = (g, c) => { g.ell(5.5, 6.5, 3, 3, c); g.ell(10.5, 6.5, 3, 3, c); for (let i = 0; i < 6; i++) g.rect(2 + i, 8 + i, 12 - i * 2, 1, c); g.set(5, 5, W); };
const arrowUp = (g, c, x = 8) => { g.rect(x - 1, 6, 2, 8, c); for (let i = 0; i < 4; i++) g.rect(x - i, 3 + i, 1 + i * 2, 1, c); };
const UP = {
  gold: g => { g.ell(8, 8, 5.5, 5.5, (dx, dy) => Math.hypot(dx, dy) > 0.78 ? '#a8700e' : dx + dy < -0.4 ? '#fff0a0' : '#ffd34a'); g.rect(7, 5, 2, 6, '#c88a1a'); },
  crystal: g => { g.line(8, 2, 13, 8, '#bfe8ff', 2); g.line(13, 8, 8, 14, '#5ab8ff', 2); g.line(8, 14, 3, 8, '#5ab8ff', 2); g.line(3, 8, 8, 2, '#e8f8ff', 2); g.rect(6, 6, 4, 5, '#9ae0ff'); g.set(7, 6, '#ffffff'); },
  swift: g => { g.rect(5, 4, 4, 8, '#8a5a34'); g.rect(5, 11, 8, 3, '#6e4626'); g.rect(10, 12, 3, 1, '#3a2416'); g.line(1, 5, 4, 7, '#a6ebcb'); g.line(1, 8, 4, 9, '#a6ebcb'); g.line(2, 11, 4, 11, '#a6ebcb'); },
  vital: g => { heart(g, '#ff5a5a'); g.rect(11, 1, 1, 5, W); g.rect(9, 3, 5, 1, W); },
  edge: g => { g.line(3, 13, 12, 4, '#dfe8f2', 2); g.line(4, 12, 12, 4, W, 1); g.line(2, 11, 5, 14, '#e6c36a'); g.set(2, 14, '#5a3a1a'); },
  step: g => { g.ell(8, 9, 5, 3, '#cfe8ff'); for (let i = 0; i < 4; i++) g.line(4 + i * 2, 9, 2 + i * 3, 3 + i, W); },
  regen: g => { g.rect(6, 3, 4, 10, '#5fd06a'); g.rect(3, 6, 10, 4, '#5fd06a'); g.rect(7, 4, 2, 8, '#a8ffb0'); g.rect(4, 7, 8, 2, '#a8ffb0'); },
  focus: g => { g.ell(8, 8, 6, 3.5, '#9fd0ff'); g.ell(8, 8, 2.5, 2.5, '#2a3a8a'); g.ell(8, 8, 1, 1, W); },
  power: g => { for (let i = 0; i < 5; i++) { const q = -Math.PI / 2 + i * Math.PI * 2 / 5; g.line(8, 8, 8 + Math.cos(q) * 6.5, 8 + Math.sin(q) * 6.5, '#f0a8ff', 2); } g.ell(8, 8, 2.5, 2.5, W); },
  fire: g => GLYPH.FIRE(g), water: g => GLYPH.WATER(g), earth: g => GLYPH.EARTH(g), wind: g => GLYPH.WIND(g),
  split: g => SHAPE.volley(g, '#ffd36b', '#ffd36b'),
  pierce: g => { g.ell(10, 8, 3.5, 3.5, (dx, dy) => dx * dx + dy * dy > 0.4 ? '#ff7a6a' : null); g.line(1, 8, 15, 8, '#e8dcc0', 1); g.rect(13, 7, 2, 3, '#ffd36b'); },
  wide: g => { g.ell(8, 8, 3, 3, '#ff9a4a'); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.line(8 + dx * 4, 8 + dy * 4, 8 + dx * 7, 8 + dy * 7, W); } },
  linger: g => { g.rect(4, 2, 8, 1, '#c8983a'); g.rect(4, 13, 8, 1, '#c8983a'); for (let i = 0; i < 5; i++) { g.rect(5 + i * 0.5, 3 + i, 6 - i, 1, '#9ac060'); g.rect(5 + i * 0.5, 12 - i, 6 - i, 1, i > 2 ? '#9ac060' : null); } g.rect(7, 8, 2, 4, '#d8f0a0'); },
  echo: g => { g.ell(8, 8, 6.5, 6.5, (dx, dy) => Math.hypot(dx, dy) > 0.82 ? '#ff9a4a' : Math.hypot(dx, dy) > 0.45 && Math.hypot(dx, dy) < 0.6 ? '#ffd36b' : null); g.ell(8, 8, 1.5, 1.5, W); },
  flow: g => { for (let i = 0; i < 26; i++) { const q = i * 0.24; g.set(8 + Math.cos(q) * 5, 8 + Math.sin(q) * 5, i < 12 ? '#a6ebcb' : '#5ab8a0'); } g.rect(12, 9, 2, 1, W); g.rect(13, 8, 1, 3, W); },
  ult: g => { g.rect(3, 8, 10, 5, '#e6b84a'); for (const x of [3, 7, 11]) { g.rect(x, 4, 2, 4, '#e6b84a'); g.set(x, 3, '#ffe27a'); } g.set(5, 10, '#f0a8ff'); g.set(8, 10, '#7fe0ff'); g.set(11, 10, '#ff7a3c'); g.rect(3, 12, 10, 1, '#a8782a'); },
  reserve: g => { g.rect(6, 2, 4, 2, '#8a8aa0'); g.rect(4, 4, 8, 10, '#3a4a8a'); g.rect(5, 7, 6, 6, '#7fb0ff'); g.rect(5, 7, 2, 2, W); },
  surge: g => { g.line(10, 1, 5, 8, '#7fb0ff', 2); g.line(5, 8, 11, 8, '#7fb0ff', 2); g.line(11, 8, 6, 15, '#cfe4ff', 2); },
  bulwark: g => { g.rect(3, 3, 10, 6, '#7d8ca0'); for (let i = 0; i < 5; i++) g.rect(3 + i, 9 + i, 10 - i * 2, 1, '#7d8ca0'); g.rect(7, 4, 2, 8, '#e6c36a'); g.rect(4, 6, 8, 2, '#e6c36a'); g.rect(4, 4, 2, 1, W); },
  quick: g => { for (let i = 0; i < 18; i++) { const q = -1.3 + i * 0.15; g.set(6 + Math.cos(q) * 6, 8 + Math.sin(q) * 6, '#a0703a'); } g.line(7, 2, 7, 14, '#eeeeee'); g.line(3, 8, 14, 8, '#e8dcc0'); g.rect(13, 7, 2, 3, '#7fd18b'); },
  leech: g => { g.ell(8, 10, 4, 4, '#c02838'); for (let i = 0; i < 6; i++) g.rect(8 - (i >> 1), 3 + i, 1 + (i >> 1) * 2, 1, '#c02838'); g.set(6, 9, W); g.rect(9, 11, 2, 1, '#6a0a14'); },
  qcharge: g => { g.ell(8, 8, 6, 6, (dx, dy) => Math.hypot(dx, dy) > 0.78 ? '#ffe27a' : null); g.line(8, 8, 8, 3, '#ffffff'); g.line(8, 8, 11, 10, '#ffffff'); g.line(12, 2, 14, 4, '#ffe27a'); },
  heavy: g => { g.rect(3, 6, 10, 6, '#c8983a'); g.rect(4, 4, 8, 2, '#e6c36a'); g.rect(6, 12, 4, 3, '#8a5e34'); g.set(5, 7, '#ffffff'); },
  swordwave: g => { g.ell(9, 8, 6, 6, (dx, dy) => (dx + 0.3) ** 2 + dy * dy > 0.55 && dx > -0.1 ? '#ffe9a0' : null); g.line(2, 13, 6, 9, '#dfe8f2', 2); },
  echo2: g => { g.line(3, 13, 12, 3, '#dfe8f2', 2); g.line(6, 14, 14, 6, 'rgba(255,255,255,.6)'.length ? '#8a9ab0' : '#fff', 1); g.set(13, 2, '#ffffff'); },
  multishot: g => { for (const q of [-0.5, 0, 0.5]) { const ex = 8 + Math.cos(q - 1.57) * 7, ey = 14 + Math.sin(q - 1.57) * 11; g.line(8, 14, ex, ey, '#e8dcc0'); g.rect(ex - 1, ey - 1, 2, 2, '#7fd18b'); } },
  ricochet: g => { g.line(2, 12, 8, 4, '#e8dcc0'); g.line(8, 4, 14, 11, '#e8dcc0'); g.rect(7, 3, 3, 3, '#ffffff'); g.rect(13, 10, 2, 2, '#7fd18b'); },
  volleych: g => { for (const y of [5, 8, 11]) { g.line(2, y, 13, y, '#dfe8ff'); g.set(14, y, '#ffffff'); } },
  twinorb: g => { g.ell(5.5, 8, 3.5, 3.5, '#9b8cff'); g.ell(11, 8, 3.5, 3.5, '#c8b8ff'); g.set(4, 7, '#ffffff'); g.set(10, 7, '#ffffff'); },
  arcmastery: g => { g.line(2, 4, 7, 9, '#bfe8ff', 2); g.line(7, 9, 9, 5, '#bfe8ff', 2); g.line(9, 5, 14, 12, '#ffffff', 1); },
  orbburst: g => { g.ell(8, 8, 3, 3, '#c8b8ff'); for (let i = 0; i < 4; i++) { const q = i * 1.57 + 0.78; g.line(8 + Math.cos(q) * 4, 8 + Math.sin(q) * 4, 8 + Math.cos(q) * 7, 8 + Math.sin(q) * 7, '#ffffff'); } },
  ascend: g => { arrowUp(g, '#ffd36b'); g.set(3, 4, W); g.set(13, 6, W); g.set(12, 12, '#ffd36b'); },
  // vật phẩm rơi
  shard: g => { for (let i = 0; i < 7; i++) { g.rect(8 - (i >> 1), 2 + i, 1 + (i >> 1) * 2, 1, '#c07aff'); g.rect(8 - (i >> 1), 13 - i, 1 + (i >> 1) * 2, 1, '#7a3aba'); } g.rect(6, 4, 2, 4, '#f0d0ff'); g.set(11, 3, '#ffffff'); },
  energy: g => { for (let i = 0; i < 6; i++) { g.rect(8 - i, 2 + i, 1 + i * 2, 1, '#5aa8ff'); g.rect(8 - i, 13 - i, 1 + i * 2, 1, '#2a5ac8'); } g.rect(6, 4, 2, 3, W); },
  heal: g => heart(g, '#ff5a5a'),
  dmg: g => UP.power(g), hp: g => UP.vital(g), spd: g => UP.swift(g), en: g => UP.reserve(g), basic: g => UP.edge(g)
};
const UP_BORDER = { fire: elc('FIRE'), water: elc('WATER'), earth: elc('EARTH'), wind: elc('WIND') };
export function iconUpgrade(id, color) {
  const key = 'U' + id; if (cache.has(key)) return cache.get(key);
  const g = new Grid(16, 16);
  if (id.startsWith('core:')) { const el = id.slice(5); frame(g, elc(el)); GLYPH[el](g); }
  else { frame(g, color || UP_BORDER[id] || '#d8b04a'); (UP[id] || UP.power)(g); }
  const url = toURL(g); cache.set(key, url); return url;
}
// sprite vật phẩm rơi trong thế giới (không khung): trả canvas
const raw = new Map();
export function pickupSprite(kind, stat) {
  const key = kind + (stat || ''); if (raw.has(key)) return raw.get(key);
  const g = new Grid(16, 16);
  if (kind === 'gem') { g.rect(5, 3, 6, 1, '#bff8ff'); g.rect(4, 4, 8, 2, '#3ad0e0'); g.rect(5, 6, 6, 2, '#1a8aa8'); g.rect(6, 8, 4, 2, '#1a8aa8'); g.rect(7, 10, 2, 2, '#0e5a78'); g.set(6, 4, '#ffffff'); g.set(5, 5, '#bff8ff'); }
  else if (kind === 'bshard') { for (let y = 2; y <= 13; y++) { const w = y < 7 ? (y - 1) : Math.max(1, 13 - y); for (let x = 8 - (w >> 1); x <= 8 + (w >> 1); x++) g.set(x, y, x < 8 ? '#5af0c0' : x === 8 ? '#bfffe8' : '#2aa880'); } g.set(7, 4, '#ffffff'); g.set(7, 5, '#ffffff'); }
  else if (kind === 'stat') { g.ell(8, 8, 6.5, 6.5, (dx, dy) => Math.hypot(dx, dy) > 0.82 ? '#ffd36b' : '#3a2a10'); (UP[stat] || UP.power)(g); }
  else UP[kind](g);
  const c = g.canvas(K); raw.set(key, c); return c;
}
