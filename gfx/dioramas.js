// Hero dioramas for every skin of every class — 64×48 unified pixel grid, 1px outlines, 4-frame idle (6 FPS).
// The hero is the TRUE in-game sprite (heroGrid + the skin's own weapon renderer from skinlooks.js), upscaled with Scale2x;
// scenes, boss silhouettes, rim light, contact shadows and particles are drawn on the same grid.
import { Grid } from './pixel.js';
import { heroGrid } from './rig.js';
import { weaponSpec, swordGrid, bowGrid, staffGrid } from './skinlooks.js';
import { SKINS } from '../profile.js';


export const GW = 64, GH = 48, FLOOR = 36;
const SX = 19, SY = 5;                                  // knight sprite origin on the grid
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dth = (x, y, t) => t * 16 > BAY[((y & 3) << 2) | (x & 3)] + 0.5;
const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const grid = (c = '.') => Array.from({ length: GH }, () => new Array(GW).fill(c));
const inb = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;


// ---------------- boss silhouettes (B fill, b rim, Q eyes, q glowing details) ----------------
const BOSS = {
  COLOSSUS: { x: 14, y: 1, rows: [
    '..............bbbbbbbb..............',
    '.............bBBBBBBBBb.............',
    '............bBBQQBBQQBBb............',
    '............bBBBBBBBBBBb............',
    '......bbbbbbbBBBBBBBBBBbbbbbbbb.....',
    '....bbBBBBBBBBBBBBBBBBBBBBBBBBBbb...',
    '...bBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb..',
    '..bBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb.',
    '..bBBBBBBBBBBBBqqBBqqBBBBBBBBBBBBBb.',
    '..bBBBBBbBBBBBBBqqqqBBBBBBBbBBBBBBb.',
    '..bBBBBBbBBBBBBBBqqBBBBBBBBbBBBBBBb.',
    '..bBBBBbbBBBBBBBBBBBBBBBBBBbbBBBBBb.',
    '..bBBBBb.bBBBBBBBBBBBBBBBBb.bBBBBBb.',
    '..bBBBBb.bBBBBBBBBBBBBBBBBb.bBBBBBb.',
    '.bBBBBBb.bBBBBBBBBBBBBBBBBb.bBBBBBBb',
    '.bBBBBBb..bBBBBBBBBBBBBBBb..bBBBBBBb',
    'bBBqBBBBb.bBBBBBBBBBBBBBBb.bBBBBqBBB',
    'bBBBBBBBb.bBBBBBBBBBBBBBBb.bBBBBBBBB',
    '.bBBBBBb..bBBBBBBbbBBBBBBb..bBBBBBb.',
    '..bbbbb...bBBBBBb..bBBBBBb...bbbbb..',
    '..........bBBBBBb..bBBBBBb..........',
    '..........bBBBBBb..bBBBBBb..........',
    '.........bBBBBBBb..bBBBBBBb.........',
  ] },
  BEHEMOTH: { x: 12, y: 6, rows: [
    '............bbbbbb..........bbbbbbb.....',
    '..........bbBBBBBBbb......bbBBBBBBBbb...',
    '.........bBBBqBBBBBBb....bBBBBBqBBBBBb..',
    '.........bBBBBBBBBqBb....bBqBBBBBBBBBb..',
    '..........bbbBBBBbbb..bbbbbbbBBBBbbbbb..',
    '.............bBBb...bbBBBBb...bBBb......',
    '....bbbbb....bBBb..bBBqBBBBb..bBBb......',
    '..bbBBBBBbb..bBBbbbbBBBBBBBbbbbBBbbbb...',
    '.bBBBBBBBBBbbBBBBBBBBBBBBBBBBBBBBBBBBbb.',
    'bBBQQBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb',
    'bBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb',
    '.bBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb.',
    '..bbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBb..',
    '....bBBBb.bBBBBBBBBBBBBBBBBBBBBBb.bBBBb.',
    '....bBBBb..bBBBb..........bBBBb...bBBBb.',
    '....bBBBb..bBBBb..........bBBBb...bBBBb.',
    '...bBBBBb.bBBBBb.........bBBBBb..bBBBBb.',
  ] },
  WARDEN: { x: 16, y: 2, rows: [
    '.........b.........b.............q....',
    '.........bb.......bb............qqq...',
    '..........bb.....bb.............bqb...',
    '...........bBbbbBb...............b....',
    '...........bBBBBBb...............b....',
    '..........bBQBBQBBb..............b....',
    '..........bBBBBBBBb..............b....',
    '.......bbbbBBBBBBBbbbbb..........b....',
    '.....bbBBBBBBBBBBBBBBBBbb........b....',
    '....bBBBBBBBBBBBBBBBBBBBBb.......b....',
    '...bBBBBBBBBBBBBBBBBBBBBBBb....bbBb...',
    '...bBBBBBBBBBBBBBBBBBBBBBBBbbbbBBBb...',
    '...bBBBBbBBBBBBBBBBBBBBbBBBBBBBBb.b...',
    '...bBBBBbBBBBBBBBBBBBBBbbbbbbbbb..b...',
    '...bBBBBbBBBBBBBBBBBBBBb..........b...',
    '..bBBBBb.bBBBBBBBBBBBBBBb.........b...',
    '..bBBBb..bBBBBBBBBBBBBBBBb........b...',
    '..bBBBb.bBBBBBBBBBBBBBBBBBb.......b...',
    '...bbb..bBBBBBBBBBBBBBBBBBBb......b...',
    '........bBBBBBBBBBBBBBBBBBBBb.....b...',
    '.......bBBBBBBBbbbbbBBBBBBBBBb....b...',
    '.......bBBBBBBb.....bBBBBBBBBb....b...',
  ] },
  DRAGON: { x: 5, y: 1, rows: [
    'b...................................................b',
    'bb.................................................bb',
    'bBb...............bb..........bb..................bBb',
    'bBBb.............bBBb........bBBb................bBBb',
    'bBBBb...........bBBBBb......bBBBBb..............bBBBb',
    '.bBBBbb........bBBBBBBbbbbbbBBBBBBb...........bbBBBb.',
    '.bBBBBBbb.....bBBBBQQBBBBBBQQBBBBBBb........bbBBBBBb.',
    '..bBBBBBBbb...bBBBBBBBBBBBBBBBBBBBBb......bbBBBBBBb..',
    '..bBBBBBBBBbb..bBBBBBBBBBBBBBBBBBBb.....bbBBBBBBBBb..',
    '...bBBBBBBBBBbbbbBBBBqqqqqqBBBBBbbbbbbbBBBBBBBBBb...',
    '...bBBBBBBBBBBBBBBBBBBqqqqBBBBBBBBBBBBBBBBBBBBBBb...',
    '....bBBBBBbBBBBBBBBBBBBBBBBBBBBBBBBBBBBbBBBBBBb....',
    '....bBBBb..bBBBBBBBBBBBBBBBBBBBBBBBBBBb..bBBBBb....',
    '.....bBb....bBBBBBBBBBBBBBBBBBBBBBBBBBb....bBBb.....',
    '.....bb.....bBBBBBBBBBBBBBBBBBBBBBBBBb......bb......',
    '......b......bBBBBBBBBBBBBBBBBBBBBBBb........b......',
    '.............bBBBBBBBBBBBBBBBBBBBBBBb...............',
    '............bBBBBBBBBBBBBBBBBBBBBBBBBb..............',
  ] },
  SOVEREIGN: { x: 18, y: 0, rows: [
    '..........q...q...q..........',
    '..........bb.bbb.bb..........',
    '..........bBbBBBbBb..........',
    '..........bBBBBBBBb..........',
    '.........bBBQBBBQBBb.........',
    '.........bBBBBBBBBBb.........',
    '.....bbbbbBBBBBBBBBbbbbb.....',
    '...bbBBBBBBBBBBBBBBBBBBBbb...',
    '.qbBBBBBBBBBBBBBBBBBBBBBBBbq.',
    'qqbBBBb.bBBBBBBBBBBBb.bBBBbqq',
    '..bbBb...bBBBBBBBBBBBb..bBbb.',
    '.........bBBBBBBBBBBBBb......',
    '........bBBBBBBBBBBBBBBb.....',
    '........bBBBBBBBBBBBBBBb.....',
    '.......bBBBBBBBBBBBBBBBBb....',
    '.......bBBBBBBBBBBBBBBBBb....',
    '......bBBBBBBBBBBBBBBBBBBb...',
    '......bBBbBBBbBBBbBBBbBBBb...',
    '.......bb.bBb.bBb.bBb..bb....',
    '...........b...b...b.........',
  ] },
};


// ---------------- scene builders (static part) ----------------
function sky(G, low = 0.5) { for (let y = 0; y < FLOOR; y++) for (let x = 0; x < GW; x++) G[y][x] = dth(x, y, Math.max(0, (y - 8) / FLOOR) * low) ? '3' : '2'; }
function pines(G, list, c = '3', edge) { for (const [cx, top, w] of list) for (let y = Math.max(0, top); y < FLOOR; y++) { const k = (y - top) / (FLOOR - top), tier = ((y - top) % 6) / 6, hw = Math.min(w, Math.round(k * w * 0.6 + tier * w * 0.5 + 0.5)); for (let x = cx - hw; x <= cx + hw; x++) if (inb(x, y)) G[y][x] = edge && x === cx - hw ? edge : c; } }
function arch(G, cx, R, spring, ring = 3) { for (let y = 0; y < FLOOR; y++) for (let x = 0; x < GW; x++) { const dx = x + 0.5 - cx, inside = y >= spring ? Math.abs(dx) < R : Math.hypot(dx, y - spring) < R, rg = y >= spring ? Math.abs(dx) < R + ring : Math.hypot(dx, y - spring) < R + ring;
  if (inside) G[y][x] = (y > FLOOR - 7 && dth(x, y, (y - (FLOOR - 7)) / 12)) ? '3' : '2'; else if (rg) { const a = Math.atan2(y - spring, dx), seg = Math.floor((a + Math.PI) / 0.32); G[y][x] = (y < spring && seg % 2 === 0) || (y >= spring && ((y >> 2) & 1)) ? '4' : '3'; } else G[y][x] = ((y & 3) === 3 || ((x + (y >> 2) * 4) % 9 === 0)) ? '2' : '3'; } }
function pillars(G, list) { for (const [px, hw, top] of list) for (let y = Math.max(0, top); y < FLOOR; y++) { const w = hw + Math.round(Math.min(1, (y - top) / 14) * 1.5 + (hsh(y >> 1, px) - 0.5) * 2); for (let x = px - w; x <= px + w; x++) if (inb(x, y)) G[y][x] = x === px - w ? '4' : '3'; } for (let x = 0; x < GW; x++) { const L = Math.round(1 + 4 * hsh(x >> 1, 11) * Math.abs(Math.sin(x * 0.7))); for (let y = 0; y < L; y++) G[y][x] = '3'; } }
function columns(G, xs, w = 4, top = 6) { for (const cx of xs) for (let y = top; y < FLOOR; y++) for (let x = cx - w; x <= cx + w; x++) if (inb(x, y)) G[y][x] = y < top + 2 || y > FLOOR - 3 ? '4' : (x === cx - w + 1 || x === cx + 1) ? '4' : '3'; }
function mountains(G, base = 22, amp = 9, c = '3', edge = '4') { for (let x = 0; x < GW; x++) { const h = base - Math.round(amp * Math.abs(Math.sin(x * 0.11 + 1)) * (0.6 + 0.4 * hsh(x >> 2, 3))); for (let y = h; y < FLOOR; y++) G[y][x] = y === h ? edge : c; } }
function clouds(G, y0, y1, c = '3', t = 0.45) { for (let y = y0; y < y1; y++) for (let x = 0; x < GW; x++) { const n = Math.sin(x * 0.21 + y * 0.5) + Math.sin(x * 0.07 - y * 0.3) * 1.3; if (n > 0.6 && dth(x, y, t + (n - 0.6) * 0.4)) G[y][x] = c; } }
function glow(G, cx, cy, rx, ry, amt, c = 'T', only) { for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const t = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry); if (t > 0 && (!only || only.includes(G[y][x])) && dth(x, y, t * amt)) G[y][x] = c; } }
function mushrooms(G, list) { for (const [cx, top, w] of list) { for (let y = top + 3; y < FLOOR; y++) for (let x = cx - 1; x <= cx + 1; x++) if (inb(x, y)) G[y][x] = '3'; for (let y = top; y < top + 4; y++) { const hw = Math.round(w * Math.sqrt(1 - ((y - top - 3) / 4) ** 2)); for (let x = cx - hw; x <= cx + hw; x++) if (inb(x, y)) G[y][x] = y === top + 3 ? '4' : 'U'; } for (let k = 0; k < 3; k++) { const x = cx - w + 2 + Math.round(hsh(k, cx) * (w * 2 - 4)), y = top + 1 + (k % 2); if (inb(x, y)) G[y][x] = 'u'; } } }
function moon(G, cx, cy) { for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) { const d = Math.hypot(x - cx, y - cy); if (inb(x, y) && d < 3.4) G[y][x] = d < 2.2 || (x - cx) + (y - cy) < 0 ? 'U' : 'u'; } }
function stars(G, n, seed, c = 'u') { for (let i = 0; i < n; i++) { const x = Math.floor(hsh(i, seed) * GW), y = Math.floor(hsh(seed, i) * 24); if (G[y][x] === '2') G[y][x] = c; } }
function lanterns(G, list) { for (const [x, y] of list) { for (let k = 0; k < y; k++) if (G[k][x] === '2' || G[k][x] === '3') G[k][x] = '4'; glow(G, x, y + 2, 6, 5, 0.55, 'T', '234'); for (const [dx, dy, c] of [[-1, 0, 'u'], [0, 0, 'u'], [1, 0, 'u'], [-2, 1, 'U'], [-1, 1, 'U'], [0, 1, 'U'], [1, 1, 'U'], [2, 1, 'U'], [-2, 2, 'U'], [-1, 2, 'U'], [0, 2, 'e'], [1, 2, 'U'], [2, 2, 'U'], [-2, 3, 'U'], [-1, 3, 'U'], [0, 3, 'U'], [1, 3, 'U'], [2, 3, 'U'], [-1, 4, 'u'], [0, 4, 'u'], [1, 4, 'u'], [0, 5, 'u']]) if (inb(x + dx, y + dy)) G[y + dy][x + dx] = c; } }
function roofs(G, list) { for (const [cx, top, w] of list) for (let y = top; y < FLOOR; y++) { const k = y - top, hw = k < 3 ? w - 2 + k * 2 + (k === 2 ? 1 : 0) : w - 1; for (let x = cx - hw; x <= cx + hw; x++) if (inb(x, y)) G[y][x] = k === 2 ? '4' : '3'; } }
function banners(G, xs) { for (const x0 of xs) for (let y = 4; y < 22; y++) for (let x = x0; x < x0 + 4; x++) { const tip = y >= 20 && (x - x0 === 0 || x - x0 === 3) && y === 21; if (!tip && !(y === 21 && (x - x0 === 1 || x - x0 === 2) && false)) G[y][x] = (y === 4) ? 'U' : (y === 10 && (x - x0 === 1 || x - x0 === 2)) ? 'U' : 'u'; } }
function floor(G, style) {
  for (let y = FLOOR; y < GH; y++) for (let x = 0; x < GW; x++) {
    const row = Math.floor((y - FLOOR) / 4), seamV = (x + row * 6) % 12 === 0, seamH = (y - FLOOR) % 4 === 3;
    let c = y === FLOOR ? '7' : seamH || seamV || hsh(x >> 1, y) < 0.1 ? '5' : '6';
    if (style === 'snow' && (y <= FLOOR + 1 || (seamH && hsh(x, y) < 0.18))) c = y === FLOOR ? 'P' : dth(x, y, 0.6) ? 'P' : 'p';
    if (style === 'moss' && (seamH || seamV || y === FLOOR) && hsh(x >> 1, y) < 0.5) c = hsh(x, y) < 0.4 ? 'P' : 'p';
    if (style === 'ash' && c === '6' && hsh(x, y >> 1) < 0.18) c = 'p';
    if (style === 'ice' && (y === FLOOR || (c === '6' && dth(x, y, 0.15)))) c = y === FLOOR ? 'P' : 'p';
    G[y][x] = c;
  }
  if (style === 'lava' || style === 'crack') { const crack = (x0, y0, len, dir) => { let x = x0, y = y0; for (let i = 0; i < len; i++) { if (x < 0 || x >= GW) break; G[y][x] = style === 'lava' ? (i % 4 === 1 ? 'e' : 'P') : 'p'; x += dir; if (hsh(i, x0) < 0.35) y = Math.max(FLOOR + 2, Math.min(GH - 1, y + (hsh(i, y0) < 0.5 ? -1 : 1))); } }; crack(0, 44, 22, 1); crack(63, 45, 18, -1); crack(30, 46, 10, 1); }
}
const TORCH = [54, 15];
const SCENES = {
  castle: G => { arch(G, 31, 15, 18); const [TX, TY] = TORCH; for (let y = TY - 8; y < TY + 8; y++) for (let x = TX - 8; x < TX + 9; x++) { const d = Math.hypot(x - TX, (y - TY + 1) * 1.15); if (inb(x, y) && (d < 3.6 || (d < 6.5 && G[y][x] !== '2' && dth(x, y, 0.5 - (d - 3.6) * 0.12)))) G[y][x] = 'T'; } for (const [x, y] of [[TX - 1, TY + 1], [TX, TY + 1], [TX + 1, TY + 1], [TX, TY + 2], [TX, TY + 3]]) G[y][x] = 't'; floor(G, 'plain'); },
  snow: G => { sky(G, 0.6); moon(G, 52, 7); stars(G, 14, 3); pines(G, [[3, 14, 5], [14, 18, 4], [48, 16, 5], [60, 12, 6]], '3', '4'); roofs(G, [[31, 20, 9]]); for (const [x, y] of [[27, 25], [35, 25]]) { G[y][x] = 'U'; G[y][x + 1] = 'U'; G[y + 1][x] = 'u'; G[y + 1][x + 1] = 'U'; } floor(G, 'snow'); },
  lantern: G => { sky(G, 0.4); stars(G, 10, 5); roofs(G, [[8, 18, 10], [56, 16, 10]]); lanterns(G, [[6, 6], [18, 3], [46, 4], [58, 7]]); floor(G, 'plain'); },
  palace: G => { arch(G, 31, 15, 18); banners(G, [4, 56]); glow(G, 31, 18, 12, 14, 0.25, 'T', '2'); floor(G, 'plain'); },
  cavern: G => { sky(G, 0.3); glow(G, 40, 34, 30, 9, 0.5, 'T', '23'); pillars(G, [[3, 4, -1], [15, 3, 5], [36, 3, 8], [59, 5, -1]]); floor(G, 'crack'); },
  volcano: G => { sky(G, 0.3); glow(G, 34, 36, 34, 12, 0.7, 'T', '23'); mountains(G, 24, 10); for (let x = 22; x < 30; x++) { G[14 + Math.abs(x - 26)][x] = 'U'; } floor(G, 'lava'); },
  temple: G => { sky(G, 0.7); stars(G, 22, 9); moon(G, 9, 6); columns(G, [6, 56], 4, 4); for (let x = 2; x < 61; x++) { G[4][x] = '4'; G[3][x] = x % 4 ? '3' : '4'; } floor(G, 'crack'); },
  ash: G => { sky(G, 0.4); glow(G, 32, 30, 34, 12, 0.6, 'T', '23'); clouds(G, 2, 30, '3', 0.35); floor(G, 'ash'); },
  spore: G => { sky(G, 0.3); mushrooms(G, [[4, 12, 6], [58, 9, 7], [48, 22, 4], [12, 24, 4]]); glow(G, 32, 30, 30, 10, 0.3, 'T', '23'); floor(G, 'moss'); },
  blizzard: G => { sky(G, 0.6); mountains(G, 26, 12); clouds(G, 0, 12, '3', 0.4); floor(G, 'ice'); },
  magma: G => { sky(G, 0.3); glow(G, 32, 38, 34, 14, 0.75, 'T', '23'); columns(G, [5, 58], 4, 6); clouds(G, 0, 10, '3', 0.4); floor(G, 'lava'); },
  tempest: G => { sky(G, 0.4); clouds(G, 0, 26, '3', 0.45); clouds(G, 2, 16, '4', 0.3); floor(G, 'plain'); },
};
function stampBoss(G, key) { const b = BOSS[key], M = grid('.'); b.rows.forEach((row, r) => [...row].forEach((c, i) => { const x = b.x + i, y = b.y + r; if (c !== '.' && inb(x, y) && y < FLOOR) { G[y][x] = c; M[y][x] = c; } }));
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < GW; x++) if (M[y][x] === '.') { let d = 9; for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) if (inb(x + ox, y + oy) && M[y + oy][x + ox] !== '.') d = Math.min(d, Math.hypot(ox, oy)); if (d < 3.2 && dth(x, y, (1 - d / 3.2) * 0.55)) G[y][x] = 'b'; } }


// ---------------- extra scenes for Ranger & Mage ----------------
Object.assign(SCENES, {
  forest: G => { sky(G, 0.5); moon(G, 11, 8); stars(G, 9, 4); pines(G, [[2, 10, 5], [20, 12, 6], [33, 6, 7], [46, 11, 6], [60, 7, 7]], '3'); pines(G, [[-2, 4, 6], [27, 16, 5], [55, 14, 6]], '3', '4'); floor(G, 'moss'); },
  gothic: G => { for (let y = 0; y < FLOOR; y++) for (let x = 0; x < GW; x++) G[y][x] = '2';
    for (const [l, r] of [[-2, 14], [20, 44], [50, 70]]) { const cx = (l + r) / 2, half = (r - l) / 2 - 3, spring = 14; for (let y = 0; y < FLOOR; y++) for (let x = Math.max(0, l - 3); x <= Math.min(GW - 1, r + 3); x++) { const inX = Math.abs(x + 0.5 - cx); let open; if (y >= spring) open = inX < half; else { const R = half * 1.6, ox = half - R; open = Math.hypot(inX - ox, y - spring) < R && y > 2; } if (!open) G[y][x] = (x === l || (Math.abs(inX - half) < 1 && y >= spring)) ? '4' : '3'; else if (y > FLOOR - 6 && dth(x, y, (y - (FLOOR - 6)) / 10)) G[y][x] = '3'; } }
    floor(G, 'plain'); },
  cosmos: G => { sky(G, 0.25); clouds(G, 2, 30, '3', 0.35); clouds(G, 6, 22, '4', 0.22); stars(G, 30, 13, 'u'); stars(G, 8, 17, 'U'); floor(G, 'crack'); },
  icefield: G => { sky(G, 0.6); moon(G, 50, 7); mountains(G, 24, 10); floor(G, 'ice'); },
  starfield: G => { sky(G, 0.5); stars(G, 34, 21, 'u'); stars(G, 10, 23, 'U'); moon(G, 10, 7); pines(G, [[50, 18, 5], [60, 14, 6], [4, 20, 4]], '3', '4'); floor(G, 'crack'); },
});

// ---------------- scene palettes (background characters only; the hero keeps its true in-game colours) ----------------
const SCENE_PAL = {
  castle: { '2': '#0d1018', '3': '#141824', '4': '#1e2332', '5': '#181a22', '6': '#272a34', '7': '#373b48', T: '#3a2418', U: '#ffd060', u: '#ff7a1e', E: '#ff9e44', e: '#ffd060', t: '#5a3418', rim: '#ff9e44' },
  forest: { '2': '#0a0f1c', '3': '#101626', '4': '#18203a', '5': '#191c22', '6': '#2a2d32', '7': '#3a3e44', P: '#38502c', p: '#24331f', T: '#163a2c', U: '#c8d4ff', u: '#6a78a8', E: '#9ad8a8', e: '#4a9a4a', rim: '#6bff95' },
  gothic: { '2': '#161224', '3': '#211b36', '4': '#2d2547', '5': '#1e1a28', '6': '#2c2638', '7': '#3d3550', T: '#1b3446', U: '#7ef9ff', u: '#33c8f0', E: '#bff9ff', e: '#7ef9ff', rim: '#7ef9ff' },
  snow: { '2': '#0a1424', '3': '#12223a', '4': '#1c3354', '5': '#1a2230', '6': '#2a3446', '7': '#3a4660', P: '#dce8f4', p: '#a8bcd4', U: '#ffe6a0', u: '#c8a050', E: '#ffffff', e: '#c8dcf0', T: '#1e3048', rim: '#9ad8ff' },
  lantern: { '2': '#0e0c24', '3': '#181434', '4': '#241c48', '5': '#181a22', '6': '#272a34', '7': '#373b48', P: '#3a3048', p: '#2c2638', U: '#e0302a', u: '#ffd36b', E: '#ffd36b', e: '#ff9a3a', T: '#3a1c24', rim: '#ffb04a' },
  palace: { '2': '#140c22', '3': '#22143a', '4': '#33204f', '5': '#1c1424', '6': '#2c2238', '7': '#3e3250', U: '#a8781e', u: '#5a2a7a', E: '#fff2b0', e: '#ffd36b', T: '#3a2a2a', rim: '#fff0a0' },
  cavern: { '2': '#0e0b16', '3': '#1c1628', '4': '#2a2040', '5': '#16121e', '6': '#241e30', '7': '#342c46', U: '#7a4ad0', u: '#3a2460', E: '#c88aff', e: '#7a4ad0', T: '#24143a', rim: '#c08aff' },
  volcano: { '2': '#140a0c', '3': '#22121a', '4': '#301a22', '5': '#1a1012', '6': '#2a1a1c', '7': '#3a2426', P: '#c8301f', p: '#7a1a14', U: '#c8301f', u: '#7a1a14', E: '#ffb03a', e: '#ff6a1a', T: '#3a1210', rim: '#ff8a2a' },
  temple: { '2': '#0c0a20', '3': '#16123a', '4': '#221c50', '5': '#16142a', '6': '#24223e', '7': '#363458', P: '#5a8aa8', p: '#3a5a78', U: '#ffffff', u: '#8a8ac8', E: '#fff2b0', e: '#7ef0ff', T: '#1c3048', rim: '#7ef0ff' },
  cosmos: { '2': '#06040e', '3': '#120c24', '4': '#221640', '5': '#0e0a18', '6': '#1a1428', '7': '#2a2240', P: '#7fe0ff', p: '#4a3a80', U: '#e0f8ff', u: '#7fe0ff', E: '#7fe0ff', e: '#c8a8ff', T: '#1a1640', rim: '#7fe0ff' },
  icefield: { '2': '#0a1220', '3': '#121e30', '4': '#1c2c44', '5': '#18222e', '6': '#283444', '7': '#3a4a5e', P: '#cfe4f4', p: '#8aa8c4', U: '#e0f4ff', u: '#8ab8e0', E: '#ffffff', e: '#bfe0f4', T: '#183048', rim: '#bfe8ff' },
  starfield: { '2': '#080c1e', '3': '#101a36', '4': '#1a2a50', '5': '#12162a', '6': '#1e243e', '7': '#2e3658', P: '#8ac8ff', p: '#3a6aa8', U: '#ffffff', u: '#8ac8ff', E: '#e0f0ff', e: '#8ac8ff', T: '#1a2a48', rim: '#8ac8ff' },
  ash: { '2': '#0e0a0a', '3': '#1a1414', '4': '#262020', '5': '#141010', '6': '#221c1a', '7': '#302826', P: '#3a3230', p: '#4a403c', B: '#2e2220', b: '#6a2410', Q: '#ffb040', q: '#c8401a', E: '#8a8078', e: '#ff7a2a', T: '#2e1610', rim: '#ff7a2a' },
  spore: { '2': '#0a0c10', '3': '#12161a', '4': '#1a2024', '5': '#101414', '6': '#1c2220', '7': '#28302c', P: '#2c4a22', p: '#3f6a2c', B: '#202a2a', b: '#4a2e70', Q: '#d8ff7a', q: '#7a4aa8', U: '#3a2a50', u: '#2a1c3a', E: '#c8ff6a', e: '#b47ae8', T: '#1a2a1a', rim: '#9aff7a' },
  blizzard: { '2': '#0a1220', '3': '#121e30', '4': '#1c2c44', '5': '#18222e', '6': '#283444', '7': '#3a4a5e', P: '#cfe4f4', p: '#8aa8c4', B: '#1e3450', b: '#3a6a92', Q: '#8af4ff', q: '#bff0ff', E: '#ffffff', e: '#bfe0f4', T: '#183048', rim: '#6ef0ff' },
  magma: { '2': '#120808', '3': '#1e0e0e', '4': '#2c1616', '5': '#180e0e', '6': '#281818', '7': '#382222', P: '#5a1a10', p: '#8a2a14', B: '#2e1414', b: '#7a2012', Q: '#ffd040', q: '#ff7a2a', U: '#3a1a14', u: '#5a2418', E: '#ffd36b', e: '#ff7a2a', T: '#3a120c', rim: '#ffb030' },
  tempest: { '2': '#080814', '3': '#100f24', '4': '#1a1838', '5': '#12101e', '6': '#1e1c30', '7': '#2c2a44', B: '#201c48', b: '#4a3a92', Q: '#a8f0ff', q: '#ffe27a', E: '#ffffff', e: '#a8f0ff', T: '#1a1c3a', U: '#a8f0ff', rim: '#7ef4ff' },
};
const SCENE_FX = { castle: ['torch'], forest: ['wind'], gothic: ['rise'], snow: ['snow'], lantern: ['rise'], palace: ['rise'], cavern: ['rise'], volcano: ['rise'], temple: ['stars', 'rise'], cosmos: ['stars', 'rise'],
  icefield: ['snow'], starfield: ['stars', 'rise'], ash: ['rise'], spore: ['rise'], blizzard: ['snow'], magma: ['rise'], tempest: ['lightning'] };
const BOSS_OF = { ashen: ['COLOSSUS', 'ash'], sporeling: ['BEHEMOTH', 'spore'], frostbound: ['WARDEN', 'blizzard'], ignivar: ['DRAGON', 'magma'], stormcrown: ['SOVEREIGN', 'tempest'] };
const SKIN_SCENE = {
  KNIGHT: { '': 'castle', crimson: 'snow', ironclad: 'lantern', gold: 'palace', obsidian: 'cavern', dragonknight: 'volcano', titanslayer: 'temple' },
  RANGER: { '': 'forest', autumn: 'snow', scout: 'lantern', frost: 'icefield', shadow: 'cavern', starlight: 'starfield', titanslayer: 'temple' },
  MAGE: { '': 'gothic', scholar: 'snow', seawitch: 'lantern', inferno: 'volcano', void: 'cosmos', celestial: 'temple', titanslayer: 'temple' },
};
const DEFAULT_GLOW = { KNIGHT: null, RANGER: '#6bff95', MAGE: '#7ef9ff' };

// every diorama: one per in-game skin of every class (ids/names/tiers come straight from profile.js)
export const DIORAMAS = {};
for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) DIORAMAS[cls] = (SKINS[cls] || []).map(s => {
  const id = s.id || '', boss = BOSS_OF[id], scene = boss ? boss[1] : SKIN_SCENE[cls][id] || 'castle', sp = id ? weaponSpec(cls, id) : null;
  return { cls, id, name: s.name, tier: s.tier || 'common', scene, boss: boss && boss[0], glow: (sp && sp.glow) || DEFAULT_GLOW[cls] };
});
export const KNIGHT_DIORAMAS = DIORAMAS.KNIGHT;
export const hasDiorama = (cls, id) => !!(DIORAMAS[cls] || []).find(d => d.id === (id || ''));

// ---------------- the hero: the true in-game sprite + weapon, upscaled with Scale2x onto the 64×48 grid ----------------
const DEF_SWORD = () => { const g = new Grid(15, 3); g.rect(0, 1, 3, 1, '#5a3a1a'); g.rect(3, 0, 1, 3, '#e6c36a'); g.rect(4, 0, 10, 1, '#ffffff'); g.rect(4, 1, 10, 1, '#dfe8f2'); g.rect(4, 2, 10, 1, '#8a9ab0'); g.set(14, 1, '#dfe8f2'); return g; };
const DEF_STAFF = () => { const g = new Grid(19, 6); g.rect(0, 2, 14, 2, (i, j) => j ? '#5a3a20' : '#8a5e34');
  g.rect(13, 1, 1, 4, '#e6c36a'); g.set(13, 0, '#a8781e'); g.set(13, 5, '#a8781e');                       // gold cradle
  const FAC = ['..ab..', '.abcd.', 'abccde', '.bcdd.', '..dd..'].map(r => r.slice(0, 5)); const FC = { a: '#e8fdff', b: '#bff9ff', c: '#7fe6ff', d: '#3a9ad0', e: '#ffffff' };
  FAC.forEach((r, y) => [...r].forEach((ch, x) => { if (FC[ch]) g.set(14 + x, y + 0.5 | 0, FC[ch]); })); return g; };
const WW = 40, WH = 44, OX = 7, OY = 6;                     // 1× work canvas, hero grid placed at (OX, OY)
const work = () => Array.from({ length: WH }, () => new Array(WW).fill(null));
function weaponGrid(cls, id, f) {
  const sp = id ? weaponSpec(cls, id) : null, fr = sp && sp.anim ? f & 3 : 0;
  if (cls === 'KNIGHT') return sp ? swordGrid(sp, fr) : DEF_SWORD();
  if (cls === 'RANGER') return bowGrid(sp || {}, fr);
  return sp ? staffGrid(sp, fr) : DEF_STAFF();
}
// 1× layers, exactly as the shop preview composes them (heroGrid + skin weapon, hand-held)
function heroLayers(cls, id, f, tier) {
  const dyn = tier !== 'common' && tier !== 'rare';
  const P = { by: 0, eyes: 'open', af: f, cape: dyn ? 1 + (f & 1) : (f & 1), lx: cls === 'MAGE' ? (dyn ? -1 : 0) : 2, rx: cls === 'MAGE' ? (dyn ? 1 : 0) : 0, ...(cls === 'RANGER' ? { arx: 1, ary: -3 } : {}) };
  const hg = heroGrid(cls + (id ? ':' + id : ''), P), B = work(), W = work();
  for (let y = 0; y < hg.h; y++) for (let x = 0; x < hg.w; x++) { const c = hg.d[y * hg.w + x]; if (c) B[y + OY][x + OX] = c; }
  const wg = weaponGrid(cls, id, f), hx = 11 + 5 + OX + 1 + (cls === 'KNIGHT' ? 1 : 0), hy = 16 + 7 + OY + 1;      // +1: the preview draws the padded canvas
  const putW = (x, y, c) => { if (c && x >= 0 && y >= 0 && x < WW && y < WH) W[y][x] = c; };
  if (cls === 'RANGER') {
    // bow held out at arm's length in front of the body (grip in the raised front hand), string drawn slightly, glowing arrow nocked
    const BX = x => x + OX + 5, BY = y => y + OY + 7, bx = BX(12), byy = BY(2), armC = hg.get(11, 9) || '#6e5030', skinC = '#f0c9a0', glowC = (id && weaponSpec(cls, id) || {}).glow || '#6bff95', strC = (id && weaponSpec(cls, id) || {}).string || '#d8e4d0';
    for (let x = BX(12); x <= bx + 3; x++) { putW(x, BY(11), x >= bx + 3 ? skinC : armC); putW(x, BY(12), x >= bx + 3 ? skinC : armC); }
    for (let j = 0; j < wg.h; j++) for (let i = 0; i < wg.w; i++) putW(bx + i, byy + j, wg.d[j * wg.w + i]);
    const nx = bx, ny = byy + 9, tips = [[bx + 2, byy + 2], [bx + 2, byy + 16]];
    for (const [tx, ty] of tips) { const n = Math.abs(ny - ty); for (let k = 0; k <= n; k++) { const x = Math.round(tx + (nx - tx) * k / n), y = Math.round(ty + (ny - ty) * k / n); if (!W[y][x]) putW(x, y, k > n - 3 ? glowC : strC); } }
    for (let x = nx - 1; x <= bx + 9; x++) if (!W[ny][x] || x > bx + 6) putW(x, ny, x > bx + 7 ? glowC : '#c8a070');
    putW(bx + 10, ny, '#ffffff'); putW(bx + 9, ny - 1, glowC); putW(bx + 9, ny + 1, glowC); putW(nx - 1, ny - 1, skinC); putW(nx - 2, ny, glowC);
  } else {
    const ty = cls === 'MAGE' ? hy + 5 : hy, u0 = cls === 'MAGE' ? -1 : -2, v0 = -Math.floor((wg.h + 2) / 2) + 1;
    for (let j = 0; j < wg.h; j++) for (let i = 0; i < wg.w; i++) putW(hx + v0 + j, ty - (u0 + 1 + i), wg.d[j * wg.w + i]);   // rotated −90°: blade points up
  }
  let legs = null;
  if (cls !== 'MAGE') {
    const X = x => x + OX + 5, Y = y => y + OY + 7, lx = 2;
    legs = { back: B[Y(16)][X(5 + lx)] || '#2a2a3a', front: B[Y(16)][X(10)] || '#3e3a52', boot: B[Y(20)][X(5 + lx)] || '#2a1e16' };
    for (let y = 15; y <= 20; y++) for (let x = 5 + lx; x <= 12; x++) B[Y(y)][X(x)] = null;
  }
  return { B, W, legs };
}
// Scale2x (EPX): doubles a pixel layer without blur, keeps diagonals as clean 1-cell stairs
function scale2x(A) {
  const h = A.length, w = A[0].length, O = Array.from({ length: h * 2 }, () => new Array(w * 2).fill(null)), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? null : A[y][x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = A[y][x], a = at(x, y - 1), b = at(x + 1, y), c = at(x - 1, y), d = at(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (c === a && c !== d && a !== b) e0 = a; if (a === b && a !== c && b !== d) e1 = b; if (d === c && d !== b && c !== a) e2 = c; if (b === d && b !== a && d !== c) e3 = d;
    O[y * 2][x * 2] = e0; O[y * 2][x * 2 + 1] = e1; O[y * 2 + 1][x * 2] = e2; O[y * 2 + 1][x * 2 + 1] = e3;
  }
  return O;
}
// compress the legs / skirt a little (drop one of each doubled row) so the full figure + headgear fits above the 12-row floor
const SQUASH = new Set([OY + 7 + 16, OY + 7 + 18, OY + 7 + 13, OY + 7 + 11]);   // 1× rows (hero coords + margins) that keep a single copy
const SQUASH_LEGS = new Set([...SQUASH, OY + 7 + 15, OY + 7 + 17, OY + 7 + 19]);
const SQUASH_MAGE = new Set([...SQUASH, OY + 7 + 12, OY + 7 + 15, OY + 7 + 17, OY + 7 + 20]);  // Knight & Ranger: short sturdy chibi legs
function squashRows(A2, set) { const out = []; for (let y = 0; y < A2.length; y++) { if ((y & 1) && set.has(y >> 1)) continue; out.push(A2[y]); } return out; }
const squashedBefore = (set, srcRow) => { let n = 0; for (let y = 0; y < srcRow * 2; y++) if (!((y & 1) && set.has(y >> 1))) n++; return n; };
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const heroCache = new Map();
function heroSprite(d, f) {
  const key = d.cls + ':' + d.id + ':' + f; if (heroCache.has(key)) return heroCache.get(key);
  const { B, W, legs } = heroLayers(d.cls, d.id, f, d.tier), SQ = d.cls === 'MAGE' ? SQUASH_MAGE : SQUASH_LEGS, B2 = squashRows(scale2x(B), SQ), W2 = squashRows(scale2x(W), SQ);
  if (d.cls === 'MAGE') mageDetail(B2, W2, d, f, SQ);
  // bounding box of everything, then anchor the feet (lowest body row) on the floor
  let x0 = 1e9, x1 = -1, y0 = 1e9, yb = -1, wy0 = 1e9;
  B2.forEach((r, y) => r.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); yb = Math.max(yb, y); } }));
  W2.forEach((r, y) => r.forEach((c, x) => { if (c) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); wy0 = Math.min(wy0, y); } }));
  const s = { B2, W2, x0, x1, y0, yb, waist: squashedBefore(SQ, OY + 7 + 15), legs, torsoBottom: squashedBefore(SQ, OY + 7 + 15) - 1, legX: (OX + 5 + 8) * 2 };
  heroCache.set(key, s); return s;
}

// ---------------- Mage outfit detail pass (on the 2× layers: 1px folds, mantle, sash, hand, staff lean, skin trims) ----------------
const MAGE_STYLE = {
  '': { sash: '#e6c36a' }, scholar: { mantle: '#f4f6fa', mantleD: '#c8d0dc', sash: '#d83a3a' }, seawitch: { mantle: '#2a9a6a', mantleD: '#0e5a3a', trim: '#ffd36b', sash: '#ffd36b' },
  inferno: { sash: '#ffd36b', mantle: '#7a1a08', mantleD: '#3a0a04', trim: '#ff7a2a' }, void: { sash: '#2a2050', rune: '#7fe0ff', trim: '#7fe0ff', tatter: true },
  celestial: { mantle: '#ffffff', mantleD: '#d0d0e4', trim: '#e6c36a', sash: '#ffe27a', glow: true, wing: true },
  titanslayer: { pauldron: ['#20203a', '#3a3a66', '#5a5a9a', '#8a8ad0'], sash: '#ffe27a', trim: '#ffe27a' },
  ashen: { mantle: '#3a2a22', mantleD: '#1c1210', trim: '#ff5a1a', sash: '#2a1a14', cracks: true },
  sporeling: { mantle: '#7a4aa8', mantleD: '#4a2a6a', trim: '#4e7f2a', sash: '#5a5a36', spots: true },
  frostbound: { mantle: '#4a7aa8', mantleD: '#2e4466', trim: '#e0f4ff', sash: '#2e4466', shards: true },
  ignivar: { mantle: '#621a14', mantleD: '#40100e', trim: '#f0e0c0', sash: '#40100e', scales: true },
  stormcrown: { sash: '#2e1c52', bolt: true, trim: '#ffe27a' },
};
function mageDetail(B2, W2, d, f, SQ) {
  const st = MAGE_STYLE[d.id] || MAGE_STYLE[''], X2 = x => (x + OX + 5) * 2, R0 = y => squashedBefore(SQ, y + OY + 7), RN = y => (SQ.has(y + OY + 7) ? 1 : 2);
  const rows = (a, b) => { const out = []; for (let y = a; y <= b; y++) for (let k = 0; k < RN(y); k++) out.push(R0(y) + k); return out; };
  const rx = y => { const s2 = (y - 10) / 3 | 0; return [5 - s2, 10 + s2]; };
  const set = (x, y, c) => { if (B2[y] && x >= 0 && x < B2[y].length) B2[y][x] = c; }, get = (x, y) => B2[y] && B2[y][x];
  const dark = c => mixHex(c, '#05040a', 0.38), lite = c => mixHex(c, '#ffffff', 0.18);
  const robeC = get(X2(7), R0(16)) || '#26389a', trim = st.trim || get(X2(7), R0(19)) || '#e6c36a';
  // 1) robe folds: crisp 1px dark creases down the skirt + a shadow line above the hem trim
  const skirt = rows(15, 18);
  for (const y of skirt) { const y1 = 15 + Math.floor((y - R0(15)) / 2); const [a, b] = rx(Math.min(18, y1)); for (const x of [X2(a) + 3, X2(Math.round((a + b) / 2)) + 1, X2(b) - 2]) { const c = get(x, y); if (c && c !== trim) set(x, y, dark(c)); } }
  const hemTop = R0(19) - 1; { const [a, b] = rx(18); for (let x = X2(a); x <= X2(b) + 1; x++) { const c = get(x, hemTop); if (c && c !== trim) set(x, hemTop, mixHex(c, '#05040a', 0.25)); } }
  // 2) void: tattered cosmic hem
  if (st.tatter) { const yb = R0(19) + RN(19) - 1; const [a, b] = rx(19); for (let x = X2(a) - 1; x <= X2(b) + 2; x++) { if (x % 3 === 0) set(x, yb, null); else if (get(x, yb) && (x + f) % 4 === 1) set(x, yb, '#7fe0ff'); } }
  // 3) layered shoulder mantle / collar (or Titanslayer pauldrons)
  const mrows = rows(10, 11), [ma, mb] = rx(10);
  if (st.pauldron) { const P = st.pauldron;
    for (const [x0, w] of [[X2(ma) - 2, 6], [X2(mb) - 2, 6]]) for (let j = 0; j < 4; j++) for (let i = 0; i < w; i++) { if ((j === 0 && (i === 0 || i === w - 1))) continue; const y = R0(10) - 1 + j; set(x0 + i, y, j === 3 ? '#ffe27a' : j === 0 ? P[3] : i < 2 ? P[1] : P[2]); }
  } else {
    const M = st.mantle || mixHex(robeC, '#05040a', 0.22), MD = st.mantleD || dark(robeC);
    mrows.forEach((y, k) => { for (let x = X2(ma) - 1; x <= X2(mb) + 2; x++) { if (!get(x, y) && x > X2(ma) && x < X2(mb) + 1) continue; const last = k === mrows.length - 1;
      let c = last ? trim : k === 0 ? lite(M) : (x < X2(ma) + 3 ? MD : M);
      if (st.scales && !last && (x + (k & 1)) % 3 === 0) c = MD;
      if (st.spots && !last && (x * 5 + k * 3) % 7 === 0) c = (x + f) % 2 ? '#c8ff6a' : '#e8f0ff';
      set(x, y, c); } });
    if (st.spots) for (const x of [X2(ma) - 1, X2(ma) + 2, X2(mb), X2(mb) + 2]) set(x, mrows[0] - 1, '#b47ae8');           // little caps on the fungal collar
  }
  if (st.shards) for (const [x0, dir] of [[X2(ma) - 1, -1], [X2(mb) + 2, 1]]) for (let k = 0; k < 3; k++) for (let h = 0; h < 3 + (k & 1); h++) set(x0 + dir * k + (h >> 1) * dir, R0(10) - 1 - h, h === 2 + (k & 1) ? '#ffffff' : '#bff0ff');
  // 4) waist sash + hanging knot (+ runes / lightning)
  const srow = rows(14, 14), [sa, sb] = rx(14);
  srow.forEach((y, k) => { for (let x = X2(sa); x <= X2(sb) + 1; x++) { if (!get(x, y)) continue; let c = k === 0 ? lite(st.sash) : st.sash;
    if (st.glow && (x + f) % 5 === 0) c = '#ffffff';
    if (st.rune && k === 0 && (x % 3 === 1)) c = (x + f) % 2 ? st.rune : '#e0f8ff';
    if (st.bolt) c = ((x >> 1) + k) % 2 ? '#a8f0ff' : ((x + f) % 6 === 0 ? '#ffffff' : st.sash);
    set(x, y, c); } });
  { const kx = X2(Math.round((sa + sb) / 2)) + 1; for (let j = 1; j <= 4; j++) { const y = srow[srow.length - 1] + j; if (get(kx, y)) set(kx, y, j === 4 ? dark(st.sash) : st.sash); } }
  // 5) molten chest cracks (Ashen)
  if (st.cracks) { let x = X2(6), y = R0(11); for (let i = 0; i < 9; i++) { if (get(x, y)) set(x, y, (i + f) % 3 ? '#ff5a1a' : '#ffd36b'); x += 1; y += (i % 3 === 1) ? 1 : (i % 3 === 2 ? -1 : 0); } }
  // 6) celestial wing: crisp outline against the body + feather rows
  if (st.wing) { const WS = new Set(['#b8b8d0', '#e0e0f0', '#ffffff']), [a] = rx(12), edge = X2(a);
    for (let y = 0; y < B2.length; y++) for (let x = 0; x < edge; x++) { const c = get(x, y); if (!c || !WS.has(c)) continue;
      if (get(x + 1, y) && !WS.has(get(x + 1, y)) && x + 1 >= edge - 1) set(x, y, '#0b0a14'); else if (y % 3 === 0 && x % 2 === 0) set(x, y, '#9a9ab8'); } }
  // 7) staff: lean the top forward 1–2px, then a hand + cuff gripping it
  let hy = R0(14), sx = -1; for (let x = 0; x < W2[hy].length; x++) if (W2[hy][x]) { sx = x; break; }
  for (let y = 0; y < hy; y++) { const k = Math.min(2, Math.floor((hy - y) / 13)) + 1; if (k) { W2[y] = [...new Array(k).fill(null), ...W2[y].slice(0, W2[y].length - k)]; } }
  if (sx >= 0) { const skin = '#f0c9a0', skinD = '#c8986e', sleeve = lite(robeC), sleeveD = robeC;
    let bx = sx - 1; while (bx > 0 && !get(bx, hy)) bx--;                      // body edge at hand height
    for (let x = bx + 1; x < sx; x++) { W2[hy - 1][x] = sleeve; W2[hy][x] = sleeveD; W2[hy + 1][x] = dark(robeC); }   // sleeve reaching to the staff
    if (sx - 1 > bx) { W2[hy - 1][sx - 1] = trim; W2[hy][sx - 1] = trim; W2[hy + 1][sx - 1] = trim; }                  // cuff
    for (let j = 0; j < 3; j++) for (let i = 0; i <= 2; i++) W2[hy - 1 + j][sx + i] = j === 2 ? skinD : skin; }        // hand wrapped round the staff
  // 8) faceted glint on crystal tips
  for (let y = 0; y < hy; y++) { const x = W2[y].indexOf('#e8fdff'); if (x >= 0) { W2[y][x] = '#ffffff'; break; } }
}

// ---------------- compose one frame (colour grid) ----------------
const sceneCache = new Map();
export function dioramaFrame(cls, id, f) {
  const d = (DIORAMAS[cls] || []).find(k => k.id === (id || '')) || DIORAMAS.KNIGHT[0], SP = { P: '#3a3e48', p: '#2c3038', T: '#2a2030', U: '#c8c8d8', u: '#5a5a70', E: '#ffffff', e: '#c8c8d8', B: '#141420', b: '#2a2a3a', Q: '#ffffff', q: '#aaaaaa', t: '#5a3418', ...SCENE_PAL[d.scene] };
  const skey = d.cls + ':' + d.id;
  if (!sceneCache.has(skey)) { const S = grid('2'); SCENES[d.scene](S); if (d.boss) stampBoss(S, d.boss); sceneCache.set(skey, S); }
  const G = sceneCache.get(skey).map(r => r.slice());
  const bright = f % 2 === 0, bob = f >= 2 ? 1 : 0, fx = new Set(SCENE_FX[d.scene] || []), epic = !['common', 'rare'].includes(d.tier), glow = d.glow;
  if (d.boss) for (let y = 0; y < FLOOR; y++) for (let x = 0; x < GW; x++) if (G[y][x] === 'q' && !bright && hsh(x, y) < 0.5) G[y][x] = 'B';
  if (fx.has('lightning') && f % 2 === 1) for (const [x0, seed] of [[8, 1 + f], [55, 7 + f]]) { let x = x0; for (let y = 0; y < 30; y++) { G[y][x] = y % 7 === 3 ? 'E' : 'e'; if (hsh(y, seed) < 0.45) x += hsh(seed, y) < 0.5 ? -1 : 1; } }
  if (fx.has('torch')) { const [TX, TY] = TORCH; for (const [dx, dy, c] of f % 2 ? [[0, -3, 'u'], [0, -2, 'U'], [-1, -1, 'u'], [0, -1, 'U'], [1, -1, 'u'], [0, 0, 'u']] : [[1, -3, 'u'], [0, -2, 'u'], [1, -2, 'U'], [-1, -1, 'u'], [0, -1, 'U'], [1, -1, 'u'], [0, 0, 'u']]) G[TY + dy][TX + dx] = c; }
  // hero placement: feet on the floor (row FLOOR+2), centred a bit left of the middle
  const H = heroSprite(d, f), feet = FLOOR + 2, oy = H.legs ? feet - 3 - H.torsoBottom : feet - H.yb, ox = Math.round(29 - (H.x0 + H.x1) / 2);
  // floor glow under the weapon side + contact shadow
  if (glow) glow2(G, ox + H.x1 - 6, FLOOR + 3, 13, 4.5, bright ? 0.8 : 0.62);
  const C = G.map(r => r.map(ch => SP[ch] || ch));               // to colours
  if (glow) for (let y = FLOOR; y < GH; y++) for (let x = 0; x < GW; x++) if (G[y][x] === 'Z') C[y][x] = mixHex(SP['6'], glow, 0.35);
  const scx = ox + (H.x0 + H.x1) / 2 - 2; for (let y = feet - 1; y <= feet + 2; y++) for (let x = 0; x < GW; x++) if (((x + 0.5 - scx) / ((H.x1 - H.x0) * 0.5 + 2)) ** 2 + ((y + 0.5 - (feet + 0.6)) / 1.9) ** 2 < 1) C[y][x] = '#09080f';
  // layers: body (rows above the waist bob 1px) → weapon (moves with the hand) ; each gets its own 1px outline
  const rim = SP.rim || '#ffffff', layer = (A, bobAll) => { const L = Array.from({ length: GH }, () => new Array(GW).fill(null));
    A.forEach((r, y) => r.forEach((c, x) => { if (!c) return; const yy = y + oy + ((bobAll || y < H.waist) ? bob : 0), xx = x + ox; if (yy >= 0 && yy < GH && xx >= 0 && xx < GW) L[yy][xx] = c; })); return L; };
  const commit = (L, lit) => {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (!L[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => L[y + b] && L[y + b][x + a])) C[y][x] = '#0b0a14';
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const c = L[y][x]; if (!c) continue; let out = c;
      if (lit) { if (!L[y][x + 1] || (!L[y - 1] || !L[y - 1][x + 1])) out = mixHex(c, rim, 0.42); else if (!L[y][x - 1]) out = mixHex(c, '#05040a', 0.3); }   // rim light on the lit side, shadowed back edge
      C[y][x] = out; } };
  commit(layer(H.B2, false), true);
  if (H.legs) {
    const xc = ox + H.legX, OUTL = '#09080f', back = mixHex(H.legs.back, '#9aa0b4', 0.12), front = mixHex(H.legs.front, rim, 0.32), bootB = mixHex(H.legs.boot, '#9aa0b4', 0.1), bootF = mixHex(H.legs.boot, rim, 0.3);
    const leg = (x0, top, bot) => {                            // x0 = left fill column; 2 wide × 3 tall
      for (let y = feet - 2; y <= feet + 1; y++) { C[y][x0 - 1] = OUTL; C[y][x0 + 2] = OUTL; }
      C[feet + 1][x0] = OUTL; C[feet + 1][x0 + 1] = OUTL;
      for (let y = feet - 2; y <= feet; y++) for (let x = x0; x <= x0 + 1; x++) C[y][x] = y === feet ? bot : top;
    };
    leg(xc - 3, back, bootB); leg(xc + 2, front, bootF);   // gap column xc stays background
  }
  commit(layer(H.W2, true), true);
  // weapon aura + ambient particles (1×1 cells, seamless over 4 frames)
  const free = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && /^[234567TPpuBbZ]$/.test(G[y][x]) && C[y][x] !== '#0b0a14' && !isHero(x, y);
  const isHero = (x, y) => { const yy = y - oy, xx = x - ox; return (H.B2[yy] && H.B2[yy][xx]) || (H.W2[yy - bob] && H.W2[yy - bob][xx]); };
  if (glow && epic && bright) for (let i = 0; i < 7; i++) { const x = ox + H.x1 - 2 + ((i * 5) % 9) - 4, y = oy + H.y0 + 2 + i * 3; if (free(x, y)) C[y][x] = i % 2 ? glow : '#ffffff'; }
  const pc = (i) => i % 3 ? SP.E : SP.e;
  if (fx.has('snow')) for (let i = 0; i < 26; i++) { const x = Math.floor(hsh(i, 1) * GW) + (f >> 1) * (i % 2), y = (Math.floor(hsh(1, i) * 12) + f * 3) % 12 + 12 * (i % 4); if (free(x, y)) C[y][x] = pc(i); }
  if (fx.has('rise')) for (let i = 0; i < 14; i++) { const x = Math.floor(hsh(i, 9) * GW) + ((f + i) % 4 >= 2 ? 1 : 0), y = FLOOR - 2 - ((Math.floor(hsh(9, i) * 8) + f * 2) % 8) - 8 * (i % 4); if (free(x, y)) C[y][x] = pc(i); }
  if (fx.has('stars')) for (let i = 0; i < 8; i++) { const x = Math.floor(hsh(i, 21) * GW), y = Math.floor(hsh(21, i) * 20); if (free(x, y) && (i + f) % 4 === 0) C[y][x] = SP.U || '#ffffff'; }
  if (fx.has('wind')) for (const [x0, y0, c] of [[6, 26, '#9ad8a8'], [20, 31, '#4a9a4a'], [40, 22, '#9ad8a8'], [50, 29, '#4a9a4a']]) { const x = (x0 + f * 3) % GW, y = y0 + (c === '#4a9a4a' ? [0, 1, 1, 0][f] : 0); if (free(x, y)) C[y][x] = c; }
  if (fx.has('torch')) { const [TX, TY] = TORCH; for (const [dx, ph, c] of [[-2, 0, SP.E], [2, 1, SP.e], [0, 2, SP.u]]) { const k = (f + ph) % 4, x = TX + dx + (k >> 1) * Math.sign(dx || 1), y = TY - 5 - k * 2; if (free(x, y)) C[y][x] = c; } }
  return C;
}
function glow2(G, cx, cy, rx, ry, amt) { for (let y = FLOOR; y < GH; y++) for (let x = 0; x < GW; x++) { const t = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry); if (t > 0 && /[567Pp]/.test(G[y][x]) && dth(x, y, t * amt)) G[y][x] = 'Z'; } }

// ---------------- bitmaps + drawing ----------------
const bmpCache = new Map();
export function dioramaBitmap(cls, id, f) {
  const key = cls + ':' + (id || '') + ':' + f; let b = bmpCache.get(key); if (b) return b;
  const C = dioramaFrame(cls, id, f); b = Object.assign(document.createElement('canvas'), { width: GW, height: GH }); const bx = b.getContext('2d');
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { bx.fillStyle = C[y][x] && C[y][x][0] === '#' ? C[y][x] : '#ff00ff'; bx.fillRect(x, y, 1, 1); }
  bmpCache.set(key, b); return b;
}
export function drawDiorama(canvas, cls, id, f) { const b = dioramaBitmap(cls, id, f), ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(b, 0, 0, canvas.width, canvas.height); }
