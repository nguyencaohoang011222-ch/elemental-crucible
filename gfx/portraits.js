// Chân dung thẻ chọn tướng: pixel art vẽ tay trên lưới số nguyên.
// Mỗi tướng có 3 tư thế khác nhau theo bậc skin (thường · rare/epic/victory · heroes/boss). Đầu dựng từ ma trận ký tự (mỗi ký tự = một vai trò màu), đồ đội đầu / cánh / hoạ tiết của từng skin là
// các "tem" ma trận nhỏ dán lên; vũ khí vẽ bằng bậc thang Bresenham 1–3 ô. Nền 64×40 pixel theo vùng của skin.
// Không dùng arc / ellipse / xoay hình / nét khử răng cưa: mọi thứ là ô vuông 1×1 trên lưới.
import { canvas, mix } from './pixel.js';
import { lookOf } from './skinlooks.js';

const CW = 64, CH = 40, BX = 12, BY = 0;            // khung 64×40, tượng 40×40 đặt lệch phải
const OUT = '#141013';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dth = (x, y, t) => t * 16 > BAYER[((y & 3) << 2) | (x & 3)] + 0.5;
const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const ramp = c => [mix(c, '#000000', 0.5), mix(c, '#000000', 0.22), c, mix(c, '#ffffff', 0.38)];
const p4 = a => !a ? null : a.length >= 4 ? a.slice(0, 4) : a.length === 3 ? [mix(a[0], '#000000', 0.3), a[0], a[1], a[2]] : ramp(a[0]);

// ---------- lưới pixel ----------
function grid(w, h) { const d = Array.from({ length: h }, () => new Array(w).fill(null)); return { w, h, d, set(x, y, c) { x |= 0; y |= 0; if (c && x >= 0 && y >= 0 && x < w && y < h) d[y][x] = c; }, get(x, y) { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < w && y < h ? d[y][x] : null; } }; }
// rows: mảng các hàng; mỗi hàng là danh sách [cột bắt đầu, chuỗi]; '.' = trống, 'o' = viền tối
function stamp(G, rows, pal, ox = 0, oy = 0, flip = false) {
  rows.forEach((segs, y) => { for (const [x0, s] of segs) for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '.' || ch === ' ') continue; const c = ch === 'o' ? OUT : pal[ch]; if (c) G.set(ox + (flip ? -(x0 + i) : x0 + i), oy + y, c); } });
}
const S = lines => lines.map(l => [[0, l]]);   // tem viết dạng nguyên hàng
// viền ngoài: ô trống kề ô có màu → viền tối
function outline(G) { const add = []; for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (!G.d[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = G.get(x + dx, y + dy); return v && v !== OUT; })) add.push([x, y]); for (const [x, y] of add) G.d[y][x] = OUT; }
// đường bậc thang Bresenham
function line(G, x0, y0, x1, y1, fn) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, i = 0; for (;;) { fn(x0, y0, i++); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }

// ================= đầu vẽ tay (ma trận ký tự) =================
// mỗi đầu: [hàng, neo đỉnh đầu (dùng cho tem đội đầu)]
const HEAD = {
  helm: [[[[3, 'oooooooo']], [[2, 'oBBBCCCCDo']], [[1, 'oABBBCCCCDDo']], [[0, 'oABBBBCCCCDDo']], [[0, 'oABBBBBCCCCDDo']], [[0, 'oAABBBBBCCCCDo']], [[0, 'oAABoooooooooooo']],
    [[0, 'oAABooyYooyYoo']], [[0, 'oAABBooooooooo']], [[0, 'oAABBBCCoCCoDo']], [[0, 'oAAABBBBCCCCDo']], [[1, 'oAAABBBBCCCo']], [[2, 'ooAAABBBCoo']]], [7, 1]],
  hood: [[[[9, 'ooooooo']], [[7, 'ooBBBCCCDoo']], [[5, 'ooABBBBCCCDDo']], [[3, 'oAABBBBBBCCCDDo']], [[1, 'ooAAABBBBBBCCCDDo']], [[0, 'oAAAABBBBBBBCCCDDo']], [[0, 'oAAABBBBoooooooCDo']],
    [[1, 'oAABBBozzzzzzzoDo']], [[2, 'oABBBozzyYzzyYzo']], [[2, 'oABBBozzzzzzzzzo']], [[2, 'oAABBBozzzzzzzo']], [[3, 'oAABBBozzzzzo']], [[3, 'oAAABBBoooooCo']], [[4, 'oAAABBBBCCCCo']], [[4, 'ooAABBBBCCCoo']]], [12, 0]],
  hat: [[[[4, 'ooo']], [[3, 'oBBoo']], [[4, 'oBCCo']], [[6, 'oBCCo']], [[7, 'oBBCCo']], [[8, 'oABBCCo']], [[8, 'oABBBCCDo']], [[8, 'oAABBBCCDo']], [[7, 'oTTTTTTTTTTTo']], [[6, 'oAABBBBBBBCCCDo']],
    [[1, 'ooAAABBBBBBBBBBBBCCCCDDoo']], [[0, 'oAAAoooooooooooooooooCCDDo']], [[7, 'ozzzzzzzzzzo']], [[7, 'ozzyYzzzyYzo']], [[7, 'ozzzzzzzzzzo']], [[7, 'oSSzzzzzzSSo']], [[7, 'osSSSzzSSSso']], [[7, 'osSSSSSSSSso']],
    [[8, 'osSSSSSSSso']], [[9, 'osSSSSSSso']], [[10, 'osSSSSso']], [[11, 'osSSso']], [[12, 'oSSo']]], [13, 9]],
  bare: [[[[2, 'oooooooo']], [[1, 'oHHHHHHHHo']], [[0, 'oHHHHHHHHhHo']], [[0, 'oHHHoooooohHo']], [[0, 'oHHozzzzzzzo']], [[0, 'oHozzyYzyYzo']], [[0, 'oHozzzzzzzzo']], [[1, 'oHozzzzzzo']], [[2, 'oooozzzo']]], [6, 0]]
};
const PLUME = [[[4, 'oooo']], [[2, 'ooPPQPoo']], [[1, 'oPPQQPPPPo']], [[0, 'oPPpo'], [8, 'opPPo']], [[0, 'oPpo'], [8, 'oppo']], [[1, 'oo']]]; // đặt ở (helmX-8, helmY-3)

// ================= tem đồ đội đầu / phụ kiện (toạ độ tương đối đỉnh đầu) =================
const TEM = {
  santa: [S(['......oo....', '.....oWWo...', '..ooooo.....', '.oRRRRRRoo..', 'oRRRRRRRRRRo', 'oRRrRRRRRRrRo', 'oWWWWWWWWWWWWo', 'oWWWWWWWWWWWWo']), { R: '#c81e1e', r: '#8a1010', W: '#f4f0ec' }, -7, -6],
  crown: [S(['.o..o..o..o.', 'oYoyYoyYoyYo', 'oYYYYYYYYYYo', 'oyrYYbYYrYyo', 'oyyyyyyyyyyo']), { Y: '#ffe27a', y: '#c8983a', r: '#ff3a3a', b: '#3a8aff' }, -6, -4],
  stormCrown: [S(['.o...o....o..', 'oC..oCo..oCo.', 'oYo.oYo.oYYo.', 'oYYoYYYoYYYo.', 'oYcYYYYYYcYo.', 'oyyyyyyyyyyo.']), { Y: '#ffe27a', y: '#c8983a', C: '#7fe0ff', c: '#7fe0ff' }, -6, -5],
  jadeCrown: [S(['..o..o..o...', '.oGooGooGo..', 'oGGGGGGGGGGo', 'oGyGGrGGyGGo', 'ogggggggggg.']), { G: '#2a9a6a', g: '#1a6a4a', y: '#ffd36b', r: '#ff3a3a' }, -6, -4],
  floatingCrown: [S(['.o...o...o..', 'oYo.oYo.oYo.', 'oYYoYYYoYYo.', 'oYcYYYYYcYo.', 'oyyyyyyyyyo.', '............', 'c..........c']), { Y: '#ffe27a', y: '#c8983a', c: '#a8f0ff' }, -6, -8],
  horns: [S(['o...........o', 'Ho.........oH', 'Hho.......ohH', '.Hho.....ohH.', '..Hh.....hH..']), { H: '#6a6a88', h: '#2a2a36' }, -7, -3],
  dragonHorns: [S(['oo.............oo', 'BBo...........oBB', '.Bbo.........obB.', '..Bbo.......obB..', '...Bbb.....bbB...', '....Bb.....bB....']), { B: '#e8dcc0', b: '#8a7a5a' }, -9, -4],
  iceCrown: [S(['..o...o...o..', '.oWo.oWo.oWo.', '.oCWooCWooCWo', 'oCCCCCCCCCCCo', 'obbbbbbbbbbbo']), { W: '#ffffff', C: '#8ad4f8', b: '#2f6aa8' }, -6, -4],
  mushroomCap: [S(['....oooooooo....', '..ooMMMWMMMMoo..', '.oMMWMMMMMWMMMo.', 'oMMMMMMMWMMMMMMo', 'oMmMMWMMMMMMmMMo', 'ommmmmmmmmmmmmmo']), { M: '#9a52c8', m: '#5a2a8a', W: '#e8ffe0' }, -8, -5],
  antlers: [S(['o.o.......o.o', 'oLo.o...o.oLo', '.oLoLo.oLoLo.', '..oLLo.oLLo..', '...oLo.oLo...']), { L: '#7a5230' }, -6, -5],
  halo: [S(['..oooooooo..', '.oYYYYYYYYo.', 'oY........Yo', '.oYYYYYYYYo.']), { Y: '#ffe27a' }, -6, -7],
  runeHalo: [S(['..oooooooo..', '.oCcCcCcCco.', 'oC........Co', '.ocCcCcCcCo.']), { C: '#7fe0ff', c: '#3a8aa8' }, -6, -7],
  laurel: [S(['oLo........oLo', 'LoLo......oLoL', '.oLLo....oLLo.']), { L: '#e6c36a' }, -7, 1],
  flameTips: [S(['.o...o..o...', 'oYo.oFooYo..', 'oFoYoFFoFFo.', 'FFFFFFFFFFFo']), { Y: '#fff4c0', F: '#ff7a2a' }, -6, -3],
  dragonSkull: [S(['oo...........oo', 'Bo..ooooooo..oB', 'Bboo BBBBBBBoobB'.replace(' ', 'o'), '.BbBBbBBBBbBBb.', '..oBBBBBBBBBo..', '..oBoooBoooBo..', '..oBBBBBBBBBo..', '...oBBoBoBBo...']), { B: '#e8dcc0', b: '#8a7a5a' }, -7, -2],
  lionHead: [S(['..oo.oo.oo.oo....', '.oGooGooGooGoo...', 'oGRRRRRRRRRRRGo..', 'GRRRRRRRRRRRRRRo.', 'oRWWoRRRRRoWWRRo.', 'oRWoooRRRoooWRRo.', 'oRRooRRYRRooRRGo.', 'GRRRRRRYRRRRRRRG.', 'oRRoWoWoWoWoRRo..', 'oRRoooooooooRRo..', '.oRRWWWWWWWRRo...', '..oGRRRRRRRGo....', '...oGGGGGGGo.....']), { R: '#d82a1e', G: '#e6c36a', W: '#ffffff', Y: '#ffd36b' }, -8, 0],
  starVisor: [S(['oooooooooooo', 'oCWCCWCCWCCo', 'oooooooooooo']), { C: '#8ac8ff', W: '#ffffff' }, -5, 7],
  rudolph: [S(['oo', 'Ro']), { R: '#ff2a2a' }, 6, 11],
  furRim: [S(['..oWWWWWWWo..', '.oW.......Wo.', 'oW.........Wo', 'oW.........Wo', 'oW.........Wo', '.oW.......Wo.', '..oWWWWWWWo..']), { W: '#f4f0ec' }, -4, 6],
  topknot: [S(['....ooo....', '...oHHHo...', '...oHhHo...', '..ooHHHoo..', '.oHHHHHHHo.']), { H: '#3a2e34', h: '#141016' }, -4, -4]
};
// cánh / khói sau lưng (toạ độ trong khung 40×40)
const BACK = {
  dragonWings: [S(['ooo..........', 'oWWoo........', 'oWwWWoo......', '.oWwwWWoo....', '.oWWwwwWWWo..', '..oWWwwwwWWo.', '..oWWWwwwwWWo', '...oWWWWwwwWo', '....ooWWWWWWo', '......oooooo.']), { W: '#8a2a1c', w: '#4a1014' }, 0, 6],
  angelWings: [S(['oo...........', 'oWWo.........', 'oWYWWoo......', '.oWWYWWWoo...', 'oWWWWYWWWWo..', '.ooWWWWYWWWo.', 'oWWWWWWWWYWWo', '.oooWWWWWWWWo', '..oWWWWWWYWo.', '...ooWWWWWWo.', '.....ooooooo.']), { W: '#fffaf0', Y: '#e6c36a' }, 0, 4],
  wisps: [S(['..o.....o..', '.oPo...oPo.', 'oPPPo.oPPPo', '.oPo...oPo.']), { P: '#5a3a7a' }, 0, 22]
};

// ================= nền 64×40 theo vùng =================
function bg(kind, G) {
  const P = (x, y, c) => G.set(x, y, c), R = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) P(x + i, y + j, c); };
  const sky = (a, b, y0 = 0, y1 = CH) => { for (let y = y0; y < y1; y++) for (let x = 0; x < CW; x++) P(x, y, dth(x, y, (y - y0) / (y1 - y0)) ? b : a); };
  const spark = (n, cols, y1 = CH, sd = 3) => { for (let k = 0; k < n; k++) P(hsh(k, sd) * CW, hsh(sd, k) * y1, cols[k % cols.length]); };
  const pines = (base, col, snow) => { for (let k = 0; k < 9; k++) { const x0 = (k * 8 + (k % 2) * 3) % CW, h = 10 + (k % 3) * 4; for (let j = 0; j < h; j++) { const w = (j >> 1) + 1; R(x0 - w + 1, base - h + j, w * 2 - 1, 1, snow && j % 4 === 0 ? '#e8f4ff' : col); } R(x0, base, 1, 2, '#1a1410'); } };
  const ringPx = (cx, cy, r, c, gap) => { let x = r, y = 0, e = 0; const pts = []; while (x >= y) { pts.push([x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]); y++; e += 2 * y + 1; if (2 * (e - x) + 1 > 0) { x--; e += 1 - 2 * x; } } pts.forEach(([dx, dy], i) => { if (!gap || i % gap) P(cx + dx, cy + dy, c); }); };
  switch (kind) {
    case 'castle': case 'volcano': {
      const lava = kind === 'volcano';
      sky(lava ? '#1a0806' : '#140a0c', lava ? '#4a1408' : '#3e1810', 0, 28);
      const wall = lava ? '#140908' : '#0c0708';
      R(0, 18, CW, 22, wall); for (let x = 0; x < CW; x += 5) R(x, 16, 3, 2, wall);
      for (const [tx, tw, th] of [[2, 7, 12], [52, 9, 15]]) { R(tx, 18 - th, tw, th, wall); for (let x = tx; x < tx + tw; x += 3) R(x, 16 - th, 2, 2, wall); R(tx + (tw >> 1), 21 - th, 1, 2, '#ff8a2a'); }
      for (let y = 20; y < CH; y += 3) for (let x = (y % 2) * 3; x < CW; x += 6) R(x, y, 5, 1, lava ? '#2a1210' : '#1e1210');
      if (lava) for (let x = 0; x < CW; x++) { const y = 34 + ((x >> 3) % 2); P(x, y, x % 3 ? '#ff6a1e' : '#ffd36b'); P(x, y + 1, '#a8301a'); }
      spark(26, ['#ffd27a', '#ff6a2a', '#ff9a3c'], 30, lava ? 9 : 3); break; }
    case 'forest': sky('#081410', '#14321f', 0, 32); for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) P(54 + x, 6 + y, x + y > 1 ? '#c9d6a8' : '#eef2d0');
      pines(30, '#0d2418'); R(0, 31, CW, 9, '#0b1d12'); spark(7, ['#d8ff8a'], 30, 5); break;
    case 'sanctum': sky('#0a0818', '#1e1440'); spark(30, ['#cfc2ff', '#5a4ca0', '#5a4ca0'], 28, 7);
      for (const ax of [1, 54]) { R(ax, 6, 9, 28, '#100c22'); for (let y = 6; y < 34; y += 5) { R(ax + 1, y + 4, 7, 1, '#2a1f55'); for (let x = ax + 1; x < ax + 8; x++) R(x, y + 1, 1, 3, ['#4a2a6a', '#2a3a6a', '#5a3a2a', '#2a5a4a'][(x + y) % 4]); } }
      ringPx(32, 18, 15, '#5b3fb0'); ringPx(32, 18, 12, '#3a2a78', 3); R(0, 34, CW, 6, '#120d26'); break;
    case 'snow': sky('#16243a', '#3a5a7a', 0, 30); pines(30, '#16302a', true); R(0, 30, CW, 10, '#cfe0ee'); for (let x = 0; x < CW; x += 3) P(x, 30, '#ffffff'); spark(34, ['#ffffff', '#c8d8e8'], CH, 11); break;
    case 'xmas': sky('#0e1830', '#26304a', 0, 30); pines(30, '#123a24', true); R(0, 30, CW, 10, '#d8e4ee'); for (let k = 0; k < 12; k++) P(hsh(k, 21) * CW, 14 + hsh(21, k) * 14, ['#ff3a3a', '#ffd36b', '#3aff7a'][k % 3]); spark(26, ['#ffffff'], CH, 13); break;
    case 'tet': sky('#1a0608', '#4a0e10', 0, CH); for (const [x, y] of [[6, 5], [17, 3], [46, 4], [58, 7]]) { R(x, y - 3, 1, 3, '#3a2a14'); R(x - 2, y, 5, 5, '#c81e1e'); R(x - 1, y + 1, 3, 3, '#ff4a3a'); R(x - 2, y, 5, 1, '#e6c36a'); R(x - 2, y + 5, 5, 1, '#e6c36a'); P(x, y + 6, '#e6c36a'); }
      for (let k = 0; k < 22; k++) { const x = hsh(k, 31) * CW, y = 12 + hsh(31, k) * 26; P(x, y, k % 3 ? '#ffd36b' : '#ffe8a0'); if (k % 2) P(x + 1, y, '#ffb84a'); } R(0, 35, CW, 5, '#2a0a0a'); break;
    case 'spore': sky('#0a0812', '#1a1430', 0, CH); R(0, 32, CW, 8, '#120e1a');
      for (const [x, h, c] of [[5, 10, '#9a52c8'], [14, 6, '#3ad0e0'], [50, 12, '#9a52c8'], [59, 7, '#3ad0e0']]) { R(x, 32 - h, 1, h, '#5a4a6a'); R(x - 3, 32 - h - 2, 7, 2, c); R(x - 2, 32 - h - 3, 5, 1, c); P(x - 1, 32 - h - 2, '#ffffff'); }
      spark(30, ['#c8ff6a', '#b47ae8', '#3ad0e0'], 32, 17); break;
    case 'cosmos': sky('#05040a', '#141028'); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const v = Math.sin(x * 0.18 + y * 0.12) + Math.sin(y * 0.25 - x * 0.07); if (v > 1.3 && dth(x, y, 0.5)) P(x, y, '#2a1a4a'); }
      spark(44, ['#ffffff', '#a8e0ff', '#cfc2ff', '#5a4ca0'], CH, 19); for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) P(54 + x, 8 + y, x - y > 2 ? '#3a2a6a' : '#7a5ac8'); break;
    case 'storm': sky('#0c0a1a', '#2a2448', 0, CH); for (let k = 0; k < 4; k++) R(k * 17, 2 + (k % 2) * 3, 14, 3, '#1a1630');
      for (const x0 of [6, 57]) { let x = x0; for (let y = 4; y < 30; y++) { P(x, y, y % 3 ? '#7fe0ff' : '#ffffff'); if (y % 4 === 0) x += (y % 8 ? 1 : -1); } } spark(16, ['#a8f0ff'], CH, 23); R(0, 34, CW, 6, '#141028'); break;
    case 'ruins': sky('#16102a', '#3a2858', 0, CH); for (const [x, h] of [[4, 22], [12, 14], [52, 24], [59, 12]]) { R(x, 36 - h, 4, h, '#18122a'); R(x - 1, 36 - h, 6, 2, '#241a3a'); } R(0, 36, CW, 4, '#100a1a');
      for (let k = 0; k < 14; k++) { const x = hsh(k, 41) * CW, y = 10 + hsh(41, k) * 26; P(x, y, '#7a4ab8'); P(x + 1, y - 1, '#a87aff'); } break;
    case 'gold': sky('#2a1a08', '#5a3a12', 0, CH); for (const x of [3, 14, 49, 60]) { R(x - 1, 4, 3, 32, '#7a5a1a'); P(x, 4, '#ffe27a'); R(x - 2, 3, 5, 1, '#c8983a'); } for (let k = 0; k < 6; k++) for (let y = 0; y < CH; y++) if ((y + k) % 3) P(22 + k * 4 + (y >> 2), y, '#6a4a1a');
      spark(20, ['#ffe27a', '#fff4c0'], CH, 29); break;
  }
}
// vùng nền theo skin
const BIOME_ID = { crimson: 'xmas', autumn: 'xmas', scholar: 'xmas', ironclad: 'tet', scout: 'tet', seawitch: 'tet', gold: 'gold', obsidian: 'ruins', shadow: 'ruins', void: 'cosmos', dragonknight: 'volcano', inferno: 'volcano',
  frost: 'snow', starlight: 'cosmos', celestial: 'cosmos', titanslayer: 'storm', ashen: 'volcano', sporeling: 'spore', frostbound: 'snow', ignivar: 'volcano', stormcrown: 'storm' };
const BIOME_CLS = { KNIGHT: 'castle', RANGER: 'forest', MAGE: 'sanctum' };

// ================= bảng màu theo skin =================
const DEF = {
  KNIGHT: { helm: ['#4a5466', '#7d8ca0', '#b4c2d4', '#e6eef8'], plume: ['#a01e1e', '#e04040'], body: ['#24407a', '#3a64b4', '#5a8ad8'], trim: '#e6c36a', cape: ['#5e1414', '#8e2222', '#b03030'], arm: ['#4a5466', '#7d8ca0', '#b4c2d4'] },
  RANGER: { hood: ['#1c4424', '#2e7038', '#46984e', '#68b86a'], body: ['#4a3420', '#6e5030', '#8e6a42'], trim: '#c8a050', cape: ['#1c4424', '#2e7038', '#46984e'], arm: ['#4a3420', '#6e5030', '#8e6a42'] },
  MAGE: { hat: ['#211a52', '#3a2e8e', '#5444c0', '#7466e0'], robe: ['#211a52', '#3a2e8e', '#5444c0', '#7466e0'], trim: '#e6c36a', arm: ['#2c2470', '#3a2e8e', '#5444c0'], hair: '#d8d8e8' }
};
// bảng màu quá tối (void, shadow…) thì nâng sáng để vẫn đọc được khối trên nền tối
const lum = c => { const n = parseInt(c.slice(1, 7), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };
const lift = p => p && lum(p[2]) < 0.2 ? p.map((c, i) => mix(c, '#7a7ab8', 0.18 + i * 0.06)) : p;
function palette(P, glow) {
  const hd = lift(p4(P.helm || P.hood || P.hat)), bd = lift(p4(P.body || P.robe)), cp = lift(p4(P.cape || P.robe)), ar = lift(p4(P.arm || P.body || P.robe)), tr = P.trim || '#e6c36a';
  const pl = P.plume ? p4(P.plume.length === 2 ? [mix(P.plume[0], '#000000', 0.3), P.plume[0], P.plume[1]] : P.plume) : ['#6a1010', '#a01e1e', '#e04040', '#ff8a6a'], hair = P.hair || '#d8d8e8';
  return { A: hd[0], B: hd[1], C: hd[2], D: hd[3], E: bd[0], F: bd[1], G: bd[2], H: bd[3], I: cp[0], J: cp[1], K: cp[2], a: ar[0], b: ar[1], c: ar[2], T: tr, t: mix(tr, '#000000', 0.4), g: tr,
    p: pl[1], P: pl[2], Q: pl[3], y: glow, Y: mix(glow, '#ffffff', 0.55), z: '#0c0a10', s: mix(hair, '#000000', 0.25), S: hair, R: '#7a3a20', r: '#a85a30', W: '#f0e6cc' };
}

// ================= bộ phận phẳng 2D: tô 3 tông + viền tối riêng từng mảnh =================
// mặt nạ → tô cel phẳng: mép trên/trái sáng, mép phải/dưới tối 2 ô, giữa là màu nền (không có dải chuyển kiểu hình trụ)
function cel(T, pal) {
  const O = grid(CW, CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.d[y][x]) {
    const e = (dx, dy) => !T.get(x + dx, y + dy);
    O.d[y][x] = (e(0, -1) || e(-1, 0)) ? pal[2] : (e(1, 0) || e(0, 1) || e(2, 0) || e(0, 2)) ? pal[0] : pal[1];
  }
  return O;
}
function commit(F, T, pal, line = true) { const C = pal ? cel(T, pal) : T; if (line) outline(C); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (C.d[y][x]) F.d[y][x] = C.d[y][x]; return T; }
function fillPoly(T, pts, c = '#') {
  for (let y = 0; y < CH; y++) { const yc = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [x1, y1] = pts[i], [x2, y2] = pts[j]; if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + (yc - y1) * (x2 - x1) / (y2 - y1)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) T.set(x, y, c); }
  return T;
}
function disk(T, cx, cy, r, c = '#') { const R = Math.ceil(r); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r + r * 0.6) T.set(Math.round(cx) + dx, Math.round(cy) + dy, c); return T; }
function limb(T, pts, r0, r1 = r0, c = '#') { const n = pts.length - 1; for (let s = 0; s < n; s++) { const [a, b] = [pts[s], pts[s + 1]]; let k = 0; const L = Math.max(1, Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])); line(T, a[0], a[1], b[0], b[1], (x, y) => { const t = (s + Math.min(1, k++ / L)) / n; disk(T, x, y, r0 + (r1 - r0) * t, c); }); } return T; }
const L3 = (F, pal, fn) => { const T = grid(CW, CH); fn(T); return commit(F, T, pal); };          // vẽ một mảnh: mặt nạ → tô → viền → dán
const CAPE = (F, pal, pts, dir = 1) => { const T = grid(CW, CH); fillPoly(T, pts); commit(F, T, pal); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.get(x, y) && T.get(x - 2, y) && T.get(x + 2, y) && T.get(x, y - 1) && (x + y * dir * 0.6 | 0) % 7 === 0) F.set(x, y, pal[0]); return T; }; // áo choàng có nếp gấp

// vũ khí
function blade(F, x0, y0, x1, y1, W8, wide = false, guardLen = 3) {
  const W1 = W8 || {}, edge = W1.edge || '#ffffff', core = W1.core || '#b8c4d0', dark = W1.dark || '#5a6676', guard = (W1.guardC || ['#6a4a10', '#c8983a', '#e6c36a'])[1], gem = W1.gem || '#ff3a3a';
  const T = grid(CW, CH), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = Math.round(-dy / L), ny = Math.round(dx / L);
  line(T, x0, y0, x1, y1, (x, y, i) => { T.set(x, y, core); T.set(x + nx, y + ny, edge); T.set(x - nx, y - ny, dark); if (wide) T.set(x - nx * 2, y - ny * 2, dark); if (W1.cracks && i % 3 === 1) T.set(x, y, W1.cracks[i % W1.cracks.length]); });
  if (W1.jag) line(T, x0, y0, x1, y1, (x, y, i) => { if (i % 4 === 2) T.set(x + nx * 2, y + ny * 2, edge); });
  outline(T); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.d[y][x]) F.d[y][x] = T.d[y][x];
  const ux = dx / L, uy = dy / L, G = grid(CW, CH);                                                     // chắn tay vuông góc + chuôi + núm
  line(G, x0 - Math.round(-uy * guardLen), y0 - Math.round(ux * guardLen), x0 + Math.round(-uy * guardLen), y0 + Math.round(ux * guardLen), (x, y) => G.set(x, y, guard));
  line(G, x0, y0, x0 - Math.round(ux * 4), y0 - Math.round(uy * 4), (x, y) => G.set(x, y, '#5a3a20')); G.set(x0 - Math.round(ux * 5), y0 - Math.round(uy * 5), gem);
  outline(G); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (G.d[y][x]) F.d[y][x] = G.d[y][x];
  if (W1.glow) line(F, x0, y0, x1, y1, (x, y, i) => { if (i % 3 === 0 && !F.get(x + nx * 2, y + ny * 2)) F.set(x + nx * 2, y + ny * 2, W1.glow); });
}
function bowAt(F, top, bot, bend, hand, aim, W8, gl) {
  const W1 = W8 || {}, limbC = W1.limb || ['#5a3a20', '#8a5a30', '#b07a40'], str = W1.string || '#e8e0d0', T = grid(CW, CH);
  const dx = bot[0] - top[0], dy = bot[1] - top[1], L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L, N = Math.ceil(L), pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N, o = Math.sin(Math.PI * t) * bend; pts.push([Math.round(top[0] + dx * t + nx * o), Math.round(top[1] + dy * t + ny * o)]); }
  for (const [x, y] of pts) { T.set(x, y, limbC[1]); T.set(x + 1, y, limbC[2]); T.set(x - 1, y, limbC[0]); if (W1.nodes && (x + y) % 6 === 0) T.set(x, y, W1.nodes); }
  outline(T); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.d[y][x]) F.d[y][x] = T.d[y][x];
  const tc = { crystal: '#c8f4ff', star: '#ffe27a', bolt: '#7fe0ff', lava: '#ff7a2a', shroom: '#9a52c8', wisp: '#c07aff', bone: '#f0e0c0' }[W1.tips];
  if (tc) for (const p of [pts[0], pts[pts.length - 1]]) { F.set(p[0], p[1], tc); F.set(p[0] + 1, p[1], tc); F.set(p[0] - 1, p[1], tc); }
  line(F, pts[1][0], pts[1][1], hand[0], hand[1], (x, y) => F.set(x, y, str)); line(F, pts[pts.length - 2][0], pts[pts.length - 2][1], hand[0], hand[1], (x, y) => F.set(x, y, str));
  if (aim) { line(F, hand[0], hand[1], aim[0], aim[1], (x, y, i) => F.set(x, y, '#d8d0b0')); const ax = Math.sign(aim[0] - hand[0]), ay = Math.sign(aim[1] - hand[1]);
    F.set(aim[0], aim[1], '#ffffff'); F.set(aim[0] - ax, aim[1], gl); F.set(aim[0], aim[1] - ay || aim[1] + 1, gl); F.set(aim[0] + ax, aim[1] - ay, gl); }
}
function orb(F, cx, cy, r, cols, spark = true) {
  const T = grid(CW, CH); disk(T, cx, cy, r); const C = grid(CW, CH);
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.d[y][x]) { const d = Math.hypot(x - cx + r * 0.35, y - cy + r * 0.35) / (r + 0.5); C.d[y][x] = d < 0.35 ? '#ffffff' : d < 0.75 ? cols[2] : d < 1.05 ? cols[1] : cols[0]; }
  outline(C); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (C.d[y][x]) F.d[y][x] = C.d[y][x];
  if (spark) for (let k = 0; k < 8; k++) { const q = k * 0.785, rr = r + 2 + (k % 2); const x = Math.round(cx + Math.cos(q) * rr), y = Math.round(cy + Math.sin(q) * rr); if (!F.get(x, y) || F.get(x, y) === OUT) F.set(x, y, k % 2 ? cols[2] : '#ffffff'); }
}
function flame(F, cx, cy, h, cols) { // ngọn lửa bậc thang hướng lên
  const T = grid(CW, CH); for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((h - j) * 0.55)), sway = Math.round(Math.sin(j * 0.9) * 1); for (let i = -w; i <= w; i++) T.set(cx + i + sway, cy - j, Math.abs(i) < w * 0.4 && j < h * 0.6 ? cols[2] : Math.abs(i) < w * 0.75 ? cols[1] : cols[0]); }
  for (let k = 0; k < 5; k++) T.set(cx + (k - 2) * 2, cy - h - (k % 3), cols[1]); outline(T); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.d[y][x]) F.d[y][x] = T.d[y][x];
}
function staffLine(F, x0, y0, x1, y1, W8) { const W1 = W8 || {}, sh = W1.shaft || ['#4a2f1a', '#7a5230'], T = grid(CW, CH); line(T, x0, y0, x1, y1, (x, y, i) => { T.set(x, y, sh[1]); T.set(x + 1, y, sh[0]); if (W1.bands && i % 7 === 3) { T.set(x, y, W1.bands); T.set(x + 1, y, W1.bands); } }); outline(T); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (T.d[y][x]) F.d[y][x] = T.d[y][x]; }
const ORBC = gl => ({ orb: [mix(gl, '#000000', 0.45), gl, mix(gl, '#ffffff', 0.5)], ice: ['#2f6aa8', '#8ad4f8', '#e0f8ff'], lava: ['#a8301a', '#ff7a2a', '#ffe27a'], bolt: ['#3a3a8a', '#7fe0ff', '#e0f8ff'], crownorb: ['#3a3a8a', '#a8f0ff', '#e0f8ff'], shroom: ['#5a2a8a', '#9a52c8', '#e8ffe0'], skull: ['#8a7a5a', '#e8dcc0', '#fff8e8'], flame: ['#c83a14', '#ff7a2a', '#fff4c0'], wing: ['#c8b890', '#fffaf0', '#fff4c0'] });
const sparks = (F, pts, cols) => pts.forEach(([x, y], k) => { if (!F.get(x, y) || F.get(x, y) === OUT) F.set(x, y, cols[k % cols.length]); });
const PAL3 = (pc, k) => k === 'arm' ? [pc.a, pc.b, pc.c] : k === 'body' ? [pc.E, pc.F, pc.G] : k === 'cape' ? [pc.I, pc.J, pc.K] : [pc.A, pc.B, pc.C];

// ================= 9 tư thế (3 bậc × 3 tướng) =================
// mỗi tư thế vẽ thân/tay/vũ khí rồi gọi X.head(loại, x, y) đúng thứ tự lớp; toạ độ trên khung 64×40
const POSES = {
  KNIGHT: [
    X => { // Thường: thủ thế, kiếm dựa chéo vai, áo choàng bay
      CAPE(X.F, PAL3(X.pc, 'cape'), [[22, 13], [12, 16], [5, 27], [1, 40], [27, 40], [29, 20]]);
      X.wingsOne(22, 12);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[20, 18], [15, 26], [18, 32]], 2.6, 2.2));
      const torso = L3(X.F, PAL3(X.pc, 'arm'), T => { fillPoly(T, [[19, 15], [41, 14], [38, 27], [36, 40], [24, 40], [22, 27]]); });
      X.tabard(torso, 26, 34, 15);
      L3(X.F, PAL3(X.pc, 'arm'), T => { disk(T, 20, 17, 4.2); disk(T, 40, 16, 4.4); });
      X.head('helm', 23, 2);
      blade(X.F, 35, 28, 53, 3, X.W8, X.W8 && X.W8.w > 1);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[40, 18], [43, 25], [36, 28]], 2.6, 2.3));
      CAPE(X.F, PAL3(X.pc, 'cape'), [[38, 33], [46, 36], [50, 40], [37, 40]]);   // vạt áo choàng quấn phía trước, khung mép dưới
    },
    X => { // Rare/Epic/Victory: lao tới chém, người đổ về trước, đại kiếm cầm thấp đang vung, tia năng lượng
      CAPE(X.F, PAL3(X.pc, 'cape'), [[25, 13], [12, 12], [2, 19], [8, 25], [0, 33], [22, 34], [28, 24]]);
      X.wingsOne(24, 11);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[24, 17], [15, 21], [8, 26]], 2.6, 2));
      const torso = L3(X.F, PAL3(X.pc, 'arm'), T => fillPoly(T, [[22, 15], [43, 11], [44, 24], [44, 40], [28, 40], [26, 26]]));
      X.tabard(torso, 32, 36, 14, 0.25);
      L3(X.F, PAL3(X.pc, 'arm'), T => { disk(T, 24, 16, 4); disk(T, 42, 13, 4.4); });
      X.head('helm', 29, 1);
      for (let k = 0; k < 14; k++) { const q = -1.2 + k * 0.17, x = Math.round(46 + Math.cos(q) * 15), y = Math.round(22 + Math.sin(q) * 15); X.F.set(x, y, k % 3 ? X.glow : '#ffffff'); }  // vệt chém
      blade(X.F, 45, 26, 62, 38, X.W8, true, 4);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[42, 15], [48, 21], [45, 26]], 2.8, 2.4));
      sparks(X.F, [[56, 30], [59, 33], [53, 35], [61, 29], [50, 31]], [X.glow, '#ffffff']);
    },
    X => { // Heroes/Boss: chúa tể đứng thẳng, một tay giơ cao bốc lửa / dung nham / năng lượng, tay kia nắm kiếm răng cưa dựng đứng, cánh xoè hai bên
      X.wingsTwo(31, 4);
      if (!X.hasWings) CAPE(X.F, PAL3(X.pc, 'cape'), [[22, 13], [8, 20], [3, 40], [58, 40], [52, 20], [40, 13]]);
      blade(X.F, 44, 27, 47, 1, X.W8, true, 4);
      const torso = L3(X.F, PAL3(X.pc, 'arm'), T => fillPoly(T, [[20, 15], [42, 15], [39, 28], [38, 40], [24, 40], [23, 28]]));
      X.tabard(torso, 27, 35, 14);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[21, 17], [14, 12], [11, 6]], 2.8, 2.4));
      const fc = X.skin === 'ashen' ? ['#a8301a', '#ff5a1a', '#ffd36b'] : X.fire ? ['#c83a14', '#ff7a2a', '#fff4c0'] : [mix(X.glow, '#000000', 0.4), X.glow, '#ffffff'];
      flame(X.F, 11, 4, 6, fc);
      L3(X.F, PAL3(X.pc, 'arm'), T => { disk(T, 21, 16, 4.6); disk(T, 41, 16, 4.6); disk(T, 11, 6, 2.4); });
      X.head('helm', 23, 1);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[41, 18], [45, 24], [44, 28]], 2.8, 2.4));
      sparks(X.F, [[8, 1], [15, 2], [6, 6], [16, 7], [13, 0]], [fc[1], fc[2]]);
    }
  ],
  RANGER: [
    X => { // Thường: cung thủ rừng kéo cung gỗ nhìn nghiêng
      CAPE(X.F, PAL3(X.pc, 'cape'), [[18, 14], [10, 18], [4, 30], [2, 40], [22, 40], [22, 20]]);
      X.wingsOne(18, 12);
      X.quiver(16, 16);
      const torso = L3(X.F, PAL3(X.pc, 'body'), T => fillPoly(T, [[17, 16], [36, 16], [34, 28], [33, 40], [20, 40], [20, 28]]));
      X.strap(torso, 18, 17, 34, 31);
      L3(X.F, PAL3(X.pc, 'hood'), T => fillPoly(T, [[15, 14], [38, 14], [35, 21], [18, 22]]));          // khăn trùm vai
      X.head('hood', 15, 0);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[34, 18], [42, 17], [48, 17]], 2.4, 2));
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[18, 19], [12, 15], [17, 12]], 2.4, 2));
      bowAt(X.F, [49, 1], [49, 38], 4, [17, 12], [61, 12], X.W8, X.glow);
      CAPE(X.F, PAL3(X.pc, 'cape'), [[30, 34], [40, 37], [42, 40], [29, 40]]);
    },
    X => { // Rare/Epic/Victory: xạ thủ cúi thấp 3/4, mũ trùm kéo sụp, nhắm chếch lên, mũi tên sáng
      CAPE(X.F, PAL3(X.pc, 'cape'), [[22, 18], [10, 20], [2, 28], [6, 34], [0, 40], [26, 40], [26, 26]]);
      X.wingsOne(20, 15);
      X.quiver(20, 20);
      const torso = L3(X.F, PAL3(X.pc, 'body'), T => fillPoly(T, [[21, 20], [40, 17], [42, 28], [42, 40], [26, 40], [24, 30]]));
      X.strap(torso, 23, 21, 40, 33);
      L3(X.F, PAL3(X.pc, 'hood'), T => fillPoly(T, [[19, 18], [42, 15], [41, 22], [22, 25]]));
      X.head('hood', 21, 4, true);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[40, 19], [47, 15], [52, 12]], 2.4, 2));
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[23, 22], [20, 18], [24, 15]], 2.4, 2));
      bowAt(X.F, [46, 0], [58, 29], 4, [24, 15], [62, 2], X.W8, X.glow);
      sparks(X.F, [[62, 2], [60, 1], [63, 4], [58, 3]], [X.glow, '#ffffff']);
    },
    X => { // Heroes/Boss: bật nhảy xoay người, khăn choàng tung bay, cung giơ cao, ấn năng lượng lơ lửng
      X.wingsOne(22, 10);
      CAPE(X.F, PAL3(X.pc, 'cape'), [[22, 14], [12, 10], [4, 6], [0, 12], [6, 18], [1, 26], [10, 28], [4, 36], [20, 34], [26, 22]]);
      const torso = L3(X.F, PAL3(X.pc, 'body'), T => fillPoly(T, [[20, 15], [38, 13], [37, 26], [33, 36], [27, 40], [22, 34], [22, 26]]));
      X.strap(torso, 21, 16, 36, 30);
      L3(X.F, PAL3(X.pc, 'hood'), T => fillPoly(T, [[18, 13], [40, 11], [38, 18], [21, 20]]));
      X.head('hood', 18, 0);
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[37, 15], [43, 9], [47, 6]], 2.4, 2));
      L3(X.F, PAL3(X.pc, 'arm'), T => limb(T, [[22, 17], [19, 13], [25, 11]], 2.4, 2));
      bowAt(X.F, [40, 0], [60, 18], 5, [25, 11], [63, 0], X.W8, X.glow);
      for (const [x, y] of [[8, 30], [52, 26], [58, 34], [14, 6]]) { const c = X.glow; X.F.set(x, y, '#ffffff'); X.F.set(x - 1, y, c); X.F.set(x + 1, y, c); X.F.set(x, y - 1, c); X.F.set(x, y + 1, c); X.F.set(x - 1, y - 1, OUT); X.F.set(x + 1, y + 1, OUT); }  // ấn sao lơ lửng
      sparks(X.F, [[63, 0], [61, 1], [62, 3], [59, 2]], [X.glow, '#ffffff']);
    }
  ],
  MAGE: [
    X => { // Thường: phù thuỷ mũ nhọn, sách phép mở và gậy gỗ
      staffLine(X.F, 46, 40, 47, 6, X.W8);
      const robe = L3(X.F, PAL3(X.pc, 'body'), T => fillPoly(T, [[20, 16], [38, 16], [41, 28], [45, 40], [16, 40], [18, 28]]));
      X.robeTrim(robe, 29);
      L3(X.F, PAL3(X.pc, 'body'), T => limb(T, [[21, 18], [15, 25], [12, 27]], 3, 2.6));
      X.tome(4, 23);
      X.head('hat', 16, 0);
      L3(X.F, PAL3(X.pc, 'body'), T => limb(T, [[37, 18], [43, 22], [46, 22]], 3, 2.6));
      orb(X.F, 47, 4, 2.6, X.orbC);
    },
    X => { // Rare/Epic/Victory: thi phép một tay, đầu ngửa ra sau, tay vươn ra triệu cầu lửa / khe hư không, gậy cầm chéo
      staffLine(X.F, 12, 40, 24, 6, X.W8); orb(X.F, 24, 5, 2.4, X.orbC, false);
      const robe = L3(X.F, PAL3(X.pc, 'body'), T => fillPoly(T, [[19, 17], [38, 15], [40, 28], [42, 40], [17, 40], [18, 28]]));
      X.robeTrim(robe, 29, 0.15);
      L3(X.F, PAL3(X.pc, 'body'), T => limb(T, [[21, 19], [17, 24], [15, 28]], 3, 2.6));
      X.head('hat', 14, 0);
      L3(X.F, PAL3(X.pc, 'body'), T => limb(T, [[37, 17], [46, 15], [52, 14]], 3, 2.4));
      orb(X.F, 57, 13, 4, X.castC);
      sparks(X.F, [[50, 8], [62, 9], [61, 19], [52, 20], [55, 6]], [X.castC[1], '#ffffff']);
    },
    X => { // Heroes/Boss: thần quan lơ lửng đối xứng, hai tay giơ cao giữ hai cầu năng lượng, hào quang và cánh rực sáng
      X.wingsTwo(32, 4);
      const robe = L3(X.F, PAL3(X.pc, 'body'), T => fillPoly(T, [[23, 15], [41, 15], [42, 26], [38, 33], [34, 40], [30, 40], [26, 33], [22, 26]]));
      X.robeTrim(robe, 32);
      L3(X.F, PAL3(X.pc, 'body'), T => { limb(T, [[24, 17], [17, 13], [12, 8]], 3, 2.4); limb(T, [[40, 17], [47, 13], [52, 8]], 3, 2.4); });
      X.head(X.bare ? 'bare' : 'hat', X.bare ? 26 : 19, X.bare ? 3 : 0);
      orb(X.F, 11, 6, 3.4, X.castC); orb(X.F, 53, 6, 3.4, X.castC);
      line(X.F, 15, 4, 49, 4, (x, y, i) => { if (i % 2) X.F.set(x, y + ((i >> 1) % 2 ? -1 : 1), X.castC[2]); });   // tia sét nối hai cầu
      for (let k = 0; k < 6; k++) X.F.set(30 + (k % 3) * 2, 36 + (k >> 1), k % 2 ? X.glow : '#ffffff');               // gió phép dưới chân lơ lửng
    }
  ]
};
const TIER_POSE = { common: 0, rare: 1, epic: 1, victory: 1, heroes: 2, boss: 2 };

// ================= ghép =================
const cache = new Map();
// cls: KNIGHT/RANGER/MAGE · skin: id skin đang mặc ('' = mặc định) · pal: bảng màu skin · theme: chủ đề skin · tier: bậc skin
export function heroPortrait(cls, skin = '', pal = null, theme = null, tier = 'common') {
  const key = cls + ':' + skin; if (cache.has(key)) return cache.get(key);
  const Lk = skin ? lookOf(cls, skin) : null, P = { ...DEF[cls], ...(pal || {}) }, W8 = Lk && Lk.weapon;
  const all = Lk ? [...(Lk.head || []), ...(Lk.hat || []), ...(Lk.body || []), ...(Lk.back || []), ...(Lk.front || [])] : [];
  const parts = n => all.some(p => (Array.isArray(p) ? p[0] : p) === n);
  const opt = n => { const p = all.find(q => Array.isArray(q) && q[0] === n); return p ? p[1] : {}; };
  let glow = (W8 && W8.glow) || { KNIGHT: '#ffd27a', RANGER: '#ffd27a', MAGE: '#7ad8ff' }[cls];
  if (parts('visor')) glow = opt('visor').c || glow;
  if (parts('shadowFace')) glow = opt('shadowFace').eye || glow;
  if (cls === 'MAGE' && parts('flameHat')) glow = '#ffb03a';
  const pc = palette(P, glow), F = grid(CW, CH), B = grid(CW, CH);
  bg(BIOME_ID[skin] || BIOME_CLS[cls], B);
  const lion = parts('lionHead'), bare = cls === 'MAGE' && (parts('jadeCrown') || parts('laurel') || parts('hairTop')), mhood = cls === 'MAGE' && parts('voidHood'), rbare = cls === 'RANGER' && parts('topknot');
  const oc = ORBC(glow), head = (W8 && W8.head) || 'orb';
  const wingPal = parts('dragonWings') && skin === 'ignivar' ? { W: '#c8b48a', w: '#40100e' } : null, wingN = ['dragonWings', 'angelWings'].find(n => parts(n));
  const X = {
    F, pc, W8, glow, skin, bare, fire: skin === 'dragonknight' || skin === 'ignivar' || skin === 'inferno', hasWings: !!wingN,
    orbC: oc[head] || oc.orb, castC: skin === 'void' ? ['#14102a', '#7fe0ff', '#e0f8ff'] : skin === 'inferno' || skin === 'ashen' || skin === 'ignivar' ? oc.flame : oc[head] || oc.orb,
    wingsOne(x, y) { if (wingN) { const [rows, wp] = BACK[wingN]; stamp(F, rows, wingPal || wp, x - 13, y); } else if (parts('wisps')) stamp(F, BACK.wisps[0], BACK.wisps[1], x - 12, y + 12); },
    wingsTwo(cx, y) { if (!wingN) return; const [rows, wp] = BACK[wingN]; stamp(F, rows, wingPal || wp, cx - 21, y); stamp(F, rows, wingPal || wp, cx + 21, y, true); },
    tabard(T, x0, x1, y0, lean = 0) { for (let y = y0; y < CH; y++) { const sh = Math.round((y - y0) * lean); for (let x = x0 + sh; x <= x1 + sh; x++) if (T.get(x, y) && F.get(x, y) !== OUT) F.set(x, y, x === x0 + sh || x === x1 + sh ? pc.T : (x - x0 - sh) < 3 ? pc.G : (x1 + sh - x) < 2 ? pc.E : pc.F); } for (let x = x0 - 4; x <= x1 + 4; x++) if (T.get(x, y0 + 15) && F.get(x, y0 + 15) !== OUT) F.set(x, y0 + 15, pc.T); },
    strap(T, x0, y0, x1, y1) { line(F, x0, y0, x1, y1, (x, y) => { if (T.get(x, y)) { F.set(x, y, pc.T); F.set(x, y + 1, pc.t); } }); },
    robeTrim(T, cx, lean = 0) { for (let y = 16; y < CH; y++) { const x = Math.round(cx + (y - 16) * lean); if (T.get(x, y)) { F.set(x, y, pc.T); if (T.get(x + 1, y)) F.set(x + 1, y, pc.t); } } },
    quiver(x, y) { L3(F, ['#3a2414', '#5a3a20', '#7a5230'], T => limb(T, [[x, y + 14], [x + 4, y]], 2.2, 2)); for (let k = 0; k < 3; k++) { F.set(x + 3 + k, y - 1 - k, '#e8e0d0'); F.set(x + 3 + k, y - 2 - k, k % 2 ? '#d83a3a' : '#ffffff'); } },
    tome(x, y) { stamp(F, S(['oooooooooo', 'oRrrrRrrrRo', 'oRWWWRWWWRo', 'oRWWWRWWWRo', '.oooooooooo']), pc, x, y); for (let k = 0; k < 5; k++) F.set(x + 1 + k * 2, y - 2 - (k % 2) * 2, k % 2 ? glow : '#ffffff'); },
    head(kind, x, y, low = false) {
      let k = kind; if (cls === 'MAGE' && mhood) k = 'hood'; if (cls === 'MAGE' && bare) k = 'bare'; if (cls === 'RANGER' && rbare) k = 'bare';
      const [rows, anchor] = HEAD[k], hair = cls === 'MAGE' ? P.hair || '#d8d8e8' : '#3a2e34';
      const hp = k === 'bare' ? { ...pc, H: hair, h: mix(hair, '#000000', 0.4), z: '#1a1418' } : pc;
      if (k === 'bare') { x += 4; y += cls === 'MAGE' ? 4 : 3; }
      if (k === 'helm' && !lion && !(Lk && Lk.noPlume) && !parts('santa')) stamp(F, PLUME, pc, x - 8, y - 3 < 0 ? 0 : y - 3);
      if (!lion) stamp(F, rows, hp, x, y);
      if ((low || parts('deepCowl')) && k === 'hood') for (let j = 1; j < 8; j++) for (let i = 0; i < 18; i++) if (F.get(x + i, y + j) === pc.B) F.set(x + i, y + j, pc.A);
      if (parts('stoneHelm') && k === 'helm') for (let j = 0; j < 13; j++) for (let i = 0; i < 16; i++) { const c = F.get(x + i, y + j); if (c && c !== OUT && c !== glow && hsh(i, j) < 0.16) F.set(x + i, y + j, '#ff5a1a'); }
      X.hx = x + anchor[0]; X.hy = y + anchor[1]; X.hk = k;
    }
  };
  POSES[cls][TIER_POSE[tier] ?? 0](X);
  // hoạ tiết thân theo skin (quanh ngực)
  const cx = X.hx ?? 30, chestY = (X.hy ?? 2) + (X.hk === 'hat' ? 8 : 14);
  const tc = (x0, y0, x1, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = F.get(x, y); if (c && c !== OUT) fn(x, y, c); } };
  if (parts('sunTabard')) stamp(F, S(['.o.o.', 'oYYYo', '.YyY.', 'oYYYo', '.o.o.']), { Y: '#ffe27a', y: '#ffffff' }, cx - 2, chestY + 4);
  if (parts('rune')) stamp(F, S(['V.V', '.V.', 'VVV', '.V.']), { V: '#a87aff' }, cx - 1, chestY + 5);
  if (parts('scales')) tc(cx - 9, chestY, cx + 9, CH - 1, (x, y) => { if ((x + (y % 4 ? 0 : 2)) % 4 === 0 && y % 2 === 0) F.set(x, y, '#ff7a2a'); });
  if (parts('fissures') || parts('flameHem')) tc(cx - 9, chestY, cx + 9, CH - 1, (x, y) => { if (hsh(x, y * 3) < 0.07) F.set(x, y, hsh(y, x) < 0.5 ? '#ff5a1a' : '#ffd36b'); });
  if (parts('starSpeckle')) tc(cx - 10, chestY, cx + 10, CH - 1, (x, y) => { if (hsh(x * 5, y) < 0.06) F.set(x, y, '#7fe0ff'); });
  if (parts('ermine')) tc(cx - 9, chestY - 2, cx + 9, chestY - 1, (x, y) => F.set(x, y, (x * 3 + y) % 5 === 0 ? OUT : '#f4f0e8'));
  if (parts('zigzagRobe') || parts('goldStripes') || parts('candyHem')) { const c = parts('zigzagRobe') ? '#7fe0ff' : parts('candyHem') ? '#ffffff' : '#e6c36a'; for (let x = cx - 12; x <= cx + 12; x++) { const y = 36 + ((x >> 1) % 2), v = F.get(x, y); if (v && v !== OUT) F.set(x, y, c); } }
  if (parts('scarf')) stamp(F, S(['oooooooooo', 'oGRGRGRGRo', '.oGRo.....', '.oRGo.....', '.oGRo.....', '..oo......']), { G: '#1a6a32', R: '#d83a3a' }, cx - 5, chestY - 2);
  if (parts('jadePendant')) stamp(F, S(['.o.', 'oGo', '.o.']), { G: '#3ad08a' }, cx - 1, chestY + 6);
  if (parts('lantern')) stamp(F, S(['..o..', '.ooo.', 'oRYRo', 'oRYRo', '.ooo.']), { R: '#d82a1e', Y: '#ffd36b' }, cx + 6, chestY + 14);
  if (parts('silkTunic')) tc(cx - 8, chestY, cx + 8, CH - 1, (x, y) => { if ((x + y) % 6 === 0) F.set(x, y, '#e6c36a'); });
  // tem đội đầu theo đỉnh đầu
  const hx = X.hx ?? 30, hy = X.hy ?? 2, up = X.hk === 'hat' ? -9 : 0;
  const put = (name, dx = 0, dy = 0) => { const t = TEM[name]; if (t) stamp(F, t[0], t[1], hx + t[2] + dx, Math.max(0, hy + t[3] + dy)); };
  if (lion) put('lionHead', 0, -1);
  if (parts('santa')) put('santa');
  if (parts('wizSanta') && X.hk === 'hat') { const map = { [pc.A]: '#6a0e0e', [pc.B]: '#a81e1e', [pc.C]: '#d83a3a', [pc.D]: '#ff6a5a', [pc.T]: '#f4f0ec' }; for (let y = 0; y < hy + 3; y++) for (let x = hx - 14; x < hx + 14; x++) { const c = F.get(x, y); if (map[c]) F.set(x, y, map[c]); } stamp(F, S(['oo.', 'WWo', 'WWo']), { W: '#f4f0ec' }, hx - 11, 0); }
  for (const n of ['crown', 'stormCrown', 'jadeCrown', 'floatingCrown', 'iceCrown', 'mushroomCap', 'antlers', 'dragonSkull']) if (parts(n)) put(n, 0, up);
  if (parts('laurel')) put('laurel'); if (parts('iceSpikes')) put('iceCrown');
  if (parts('horns')) put('horns'); if (parts('dragonHorns')) put('dragonHorns');
  if (parts('halo')) put('halo', 0, up); if (parts('runeHalo')) put('runeHalo');
  if (parts('flameHat')) put('flameTips', -6, -9);
  if (parts('starCrown')) put('starVisor');
  if (parts('hoodFur') || parts('furCollar')) put('furRim', 1, 0);
  if (parts('rudolph')) put('rudolph');
  if (parts('topknot')) put('topknot', -2, 2);
  if (parts('snout')) stamp(F, S(['oooo.', 'BBBBo', 'oooo.']), { B: pc.C }, hx + 6, hy + 7);
  // viền sáng phía trước theo màu chủ đề
  outline(F);
  for (let y = 0; y < CH; y++) { let x = CW - 1; while (x >= 0 && (!F.d[y][x] || F.d[y][x] === OUT)) x--; if (x > 0) F.d[y][x] = mix(F.d[y][x], glow, 0.5); }
  const c = canvas(CW, CH), g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (const G of [B, F]) for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { const v = G.d[y][x]; if (v) { g.fillStyle = v; g.fillRect(x, y, 1, 1); } }
  cache.set(key, c); return c;
}
