// Boss vẽ bằng SDF: mỗi bộ phận là hình con nhộng/elip/đa giác, ghép bằng smooth-union nên khớp nối liền mạch.
// Đổ bóng theo pháp tuyến (ánh sáng trên-trái), viền sáng, viền trong chọn lọc, hoạ tiết theo chất liệu, chi tiết phát sáng.
import { pix, hash2, dith, mix } from './pixel.js';

// ---------- SDF cơ bản ----------
const cap = (ax, ay, bx, by, r0, r1 = r0) => (x, y) => { const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay, L = bax * bax + bay * bay || 1, h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / L)); return Math.hypot(pax - bax * h, pay - bay * h) - (r0 + (r1 - r0) * h); };
const ell = (cx, cy, rx, ry) => (x, y) => { const dx = (x - cx) / rx, dy = (y - cy) / ry, k = Math.hypot(dx, dy); return (k - 1) * Math.min(rx, ry); };
const poly = pts => (x, y) => {
  let d = 1e9, inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j], ex = xj - xi, ey = yj - yi, wx = x - xi, wy = y - yi, h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? -d : d;
};
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

// vẽ một tập bộ phận: parts = [{ f, m, k(độ mềm), z(độ ưu tiên lớp) }], mats = { tên: { pal, tex(x,y,d,nx,ny) } }
function render(W, H, parts, mats, deco) {
  const field = (x, y) => { let d = 1e9, best = null, bv = 1e9, bz = -1e9; for (const p of parts) { const v = p.f(x, y); d = p.k ? smin(d, v, p.k) : Math.min(d, v); const z = p.z || 0; if (v < 0) { if (z > bz || (z === bz && v < bv)) { best = p; bz = z; bv = v; } } else if (bz === -1e9 && v < bv) { best = p; bv = v; } } return [d, best]; };
  const col = new Array(W * H).fill(null);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x + 0.5, Y = y + 0.5, [d, part] = field(X, Y); if (d > 0 || !part) continue;
    const dx = field(X + 0.7, Y)[0] - field(X - 0.7, Y)[0], dy = field(X, Y + 0.7)[0] - field(X, Y - 0.7)[0], gl = Math.hypot(dx, dy) || 1;
    const depth = Math.min(1, -d / 5), nx = dx / gl * (1 - depth * 0.7), ny = dy / gl * (1 - depth * 0.7), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let lum = 0.45 + (-nx * 0.55 - ny * 0.6 + nz * 0.45) * 0.55;
    const M = mats[part.m]; if (M.tex) lum += M.tex(x, y, d, nx, ny) || 0;
    const pal = M.pal, t = Math.max(0, Math.min(0.999, lum)) * (pal.length - 1), b = Math.floor(t);
    let c = pal[Math.min(pal.length - 1, b + (dith(x, y, t - b) ? 1 : 0))];
    if (d > -1.2 && nx > 0.35 && ny > -0.2) c = pal[0];                 // viền trong phía bóng tối
    else if (d > -1.2 && nx < -0.45 && ny < 0.2 && M.rim) c = M.rim;    // viền sáng phía có đèn
    if (M.over) c = M.over(x, y, d, nx, ny, c) || c;
    col[y * W + x] = c;
  }
  const g = { set: (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) col[y * W + x] = c; }, get: (x, y) => col[Math.round(y) * W + Math.round(x)] };
  if (deco) deco(g);
  return pix(W, H, (x, y) => col[y * W + x]);
}
const noise = (x, y, s) => hash2(Math.floor(x), Math.floor(y), s);

// ---------- Ashen Colossus ----------
function colossus(P) {
  const W = 52, H = 56, cr = P.crouch | 0, ln = P.lean | 0, arm = P.arm || 0, rage = P.rage, lava = P.pulse || rage ? ['#ff8a3c', '#ffe27a'] : ['#e0501e', '#ffb04a'];
  const sy = 21 + cr, parts = [];
  parts.push({ f: cap(18, 40 + cr, 17, 52, 6, 5), m: 'rock' }, { f: cap(34, 40 + cr, 35, 52, 6, 5), m: 'rock' });
  parts.push({ f: ell(17, 53, 6, 3), m: 'rock' }, { f: ell(35, 53, 6, 3), m: 'rock' });
  parts.push({ f: ell(26 + ln, 37 + cr, 12, 7), m: 'rock', k: 4 });
  parts.push({ f: cap(26 + ln, 34 + cr, 26 + ln, 22 + cr, 13, 11), m: 'rock', k: 5 });
  const head = [26 + ln * 1.5, 12 + cr + (P.hd | 0)];
  parts.push({ f: ell(head[0], head[1], 6, 5.5), m: 'rock', k: 3 });
  const arms = arm > 0.5 ? [[9, 12, 12, 3], [43, 12, 40, 3]] : arm < -0.5 ? [[6, 34, 5, 47], [46, 34, 47, 47]] : [[8, 32, 9, 42], [44, 32, 43, 42]];
  [[12, sy], [40, sy]].forEach(([sx, s2], i) => { const [ex, ey, fx, fy] = arms[i]; parts.push({ f: cap(sx + ln, s2, ex + ln, ey + cr, 5, 4.5), m: 'rock', k: 3 }, { f: cap(ex + ln, ey + cr, fx + ln, fy + cr, 4.5, 4), m: 'rock', k: 2 }, { f: ell(fx + ln, fy + cr, 6.5, 6), m: 'rock', z: 2 }); });
  parts.push({ f: ell(11 + ln, sy - 1, 9, 7.5), m: 'shoulder', k: 4, z: 1 }, { f: ell(41 + ln, sy - 1, 9, 7.5), m: 'shoulder', k: 4, z: 1 });
  const rock = { pal: ['#140c0a', '#2a1c16', '#45302a', '#62483a', '#80634e'], rim: '#a88a6a', tex: (x, y) => (noise(x / 2, y / 3, 4) - 0.5) * 0.18,
    over: (x, y, d) => { const v = noise(Math.floor((x + y * 0.6) / 2.5), Math.floor((y - x * 0.3) / 3), 9); return d < -2 && v < 0.07 ? lava[(x + y) & 1] : null; } };
  const mats = { rock, shoulder: { ...rock, over: (x, y, d, nx, ny) => ny < -0.55 && noise(x, y, 2) < 0.55 ? (noise(x, y, 5) < 0.5 ? '#4f7a3c' : '#6a9a4a') : rock.over(x, y, d) } };
  return render(W, H, parts, mats, g => {
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) if (i * i / 9 + j * j / 5 < 1) g.set(26 + ln + i, 27 + cr + j, i * i + j * j < 3 ? '#ffffff' : lava[1]);
    const eye = P.dim ? '#6a2a10' : rage ? '#ffffff' : '#ffd36b'; g.set(head[0] - 2, head[1], eye); g.set(head[0] - 3, head[1], eye); g.set(head[0] + 2, head[1], eye); g.set(head[0] + 3, head[1], eye);
  });
}

// ---------- Frost Warden ----------
function warden(P) {
  const W = 48, H = 62, cr = P.crouch | 0, sw = P.arm || 0, parts = [];
  const cape = poly([[16, 20 + cr], [26, 20 + cr], [24, 56], [4 - (P.cape ? 3 : 0), 58], [7, 40]]);
  parts.push({ f: (x, y) => { const d = cape(x, y); return y > 50 && noise(x / 2, 0, 3) < 0.4 ? Math.max(d, 54 - y) : d; }, m: 'cape', z: -1 });
  parts.push({ f: cap(19, 40 + cr, 18, 58, 3.5, 3), m: 'plate' }, { f: cap(28, 40 + cr, 29, 58, 3.5, 3), m: 'plate' }, { f: ell(18, 59, 4, 2), m: 'plate' }, { f: ell(29, 59, 4, 2), m: 'plate' });
  parts.push({ f: poly([[14, 36 + cr], [34, 36 + cr], [36, 46 + cr], [12, 46 + cr]]), m: 'plate', k: 2 });
  parts.push({ f: cap(24, 36 + cr, 24, 22 + cr, 8, 10), m: 'plate', k: 3 });
  parts.push({ f: ell(14, 22 + cr, 6, 5), m: 'plate', z: 1, k: 2 }, { f: ell(34, 22 + cr, 6, 5), m: 'plate', z: 1, k: 2 });
  const hy = 12 + cr + (P.hd | 0); parts.push({ f: cap(24, hy - 2, 24, hy + 5, 5.5, 5), m: 'plate', k: 2, z: 1 });
  for (const [x, h] of [[19, 6], [22, 9], [26, 9], [29, 6]]) parts.push({ f: cap(x, hy - 5, x + (x - 24) * 0.2, hy - 5 - h, 1.6, 0.4), m: 'ice', z: 2 });
  const hand = sw === 2 ? [40, 26] : sw > 0.5 ? [33, 12] : sw < -0.5 ? [40, 28] : [35, 32];
  parts.push({ f: cap(34, 23 + cr, hand[0], hand[1] + cr, 3.2, 3), m: 'plate', z: 2 }, { f: cap(14, 23 + cr, 11, 34 + cr, 3.2, 3), m: 'plate', z: -1 });
  const blade = sw > 0.5 && sw < 2 ? [hand[0], hand[1] + cr, 6, -2] : sw < -0.5 ? [hand[0], hand[1] + cr, 47, hand[1] + cr + 2] : sw === 2 ? [10, 58, 13, 26] : [hand[0] + 1, 6, hand[0] + 1, 58];
  parts.push({ f: cap(blade[0], blade[1], blade[2], blade[3], 2.4, 1.2), m: 'blade', z: 3 });
  const mats = {
    plate: { pal: ['#1a2a40', '#34507a', '#5e84b0', '#9ec4e8', '#e4f4ff'], rim: '#ffffff', tex: (x, y, d) => (y % 6 === 0 && d < -1 ? -0.12 : 0) },
    ice: { pal: ['#3a7ab0', '#7ac0e8', '#bfe8ff', '#ffffff'], rim: '#ffffff' },
    blade: { pal: ['#4a9ad0', '#8ad0f0', '#c8f0ff', '#ffffff'], rim: '#ffffff', over: (x, y) => noise(x, y, 7) < 0.1 ? '#ffffff' : null },
    cape: { pal: ['#3a5a7a', '#6a90b0', '#a8c8e0', '#e0eef8'], tex: (x, y) => Math.sin(x * 0.9 + y * 0.15) * 0.12 }
  };
  return render(W, H, parts, mats, g => { const eye = P.dim ? '#4a6a88' : P.rage ? '#ffffff' : '#7fe8ff'; for (let x = 21; x <= 27; x++) g.set(x, hy + 1, eye); if (sw === 2) for (let i = -2; i <= 2; i++) g.set(42 + i, 26, '#ffffff'); });
}

// ---------- Sporeback Behemoth ----------
function behemoth(P) {
  const W = 76, H = 56, cr = P.crouch | 0, rear = P.rear | 0, ln = P.lean | 0, parts = [];
  const legs = [[16, 36], [26, 37], [48 + ln, 36 - rear], [58 + ln, 37 - rear]];
  legs.forEach(([x, y], i) => parts.push({ f: cap(x, y + cr, x + (i % 2 ? 1 : -1), 52, 5.5, 5), m: 'hide', z: i % 2 ? 1 : -1, k: 3 }, { f: ell(x + (i % 2 ? 1 : -1), 53, 6, 2.6), m: 'hide' }));
  parts.push({ f: ell(36 + ln * 0.5, 30 + cr - rear * 0.5, 26, 14), m: 'hide', k: 6 });
  const hx = 64 + ln, hy = 31 + cr - rear * 2 + (P.low | 0);
  parts.push({ f: cap(56 + ln, 28 + cr - rear, hx, hy, 9, 8), m: 'hide', k: 5 }, { f: ell(hx + 3, hy + 3, 9, 7), m: 'hide', k: 3, z: 1 });
  parts.push({ f: cap(hx + 6, hy + 6, hx + 11, hy - 2, 1.8, 0.8), m: 'tusk', z: 3 }, { f: cap(hx, hy + 7, hx + 4, hy + 2, 1.5, 0.7), m: 'tusk', z: 3 });
  const shrooms = [[22, 14, 7, '#a85ae0'], [32, 10, 9, '#5ad0c8'], [43, 13, 7, '#a85ae0'], [52, 17, 5, '#e05aa8'], [15, 19, 5, '#5ad0c8']];
  shrooms.forEach(([x, top, r, c], i) => { const by = 22 + cr - rear * 0.4; parts.push({ f: cap(x, by, x - 1, top + cr - rear * 0.4 + r * 0.4, 1.8, 1.4), m: 'stem', z: 2 }, { f: (X, Y) => Math.max(ell(x, top + cr - rear * 0.4 + r * 0.5, r, r * 0.75)(X, Y), Y - (top + cr - rear * 0.4 + r * 0.6)), m: 'cap' + i, z: 3 }); });
  const mats = {
    hide: { pal: ['#141210', '#2a2620', '#463e32', '#665a48', '#8a7c64'], rim: '#a89a80', tex: (x, y) => (noise(x / 3, y / 3, 6) - 0.5) * 0.22, over: (x, y, d, nx, ny) => ny < -0.6 && noise(x, y, 4) < 0.6 ? (noise(x, y, 8) < 0.5 ? '#3a5a2e' : '#4f7a3c') : null },
    tusk: { pal: ['#8a7a60', '#c8b898', '#efe4c8', '#ffffff'] }, stem: { pal: ['#8a8070', '#c8bca0', '#efe4c8'] }
  };
  shrooms.forEach(([, , , c], i) => { mats['cap' + i] = { pal: [mix(c, '#000', 0.6), mix(c, '#000', 0.3), c, mix(c, '#fff', 0.4)], rim: mix(c, '#fff', 0.7), over: (x, y) => noise(x, y, 11 + i) < 0.1 ? '#f8f0ff' : null }; });
  return render(W, H, parts, mats, g => { const eye = P.dim ? '#6a4a2a' : P.rage ? '#ffffff' : '#ffb84a'; g.set(hx + 2, hy - 1, eye); g.set(hx + 3, hy - 1, eye); g.set(hx + 6, hy - 1, eye); });
}

// ---------- Storm Sovereign ----------
function sovereign(P) {
  const W = 50, H = 64, arm = P.arm || 0, hem = P.hem | 0, parts = [];
  parts.push({ f: (x, y) => { const d = poly([[14, 30], [36, 30], [42, 54], [8, 54]])(x, y); return y > 46 ? Math.max(d, (y - 46) * 0.8 - 6 + noise(x / 2 + hem, y / 2, 3) * 6 - 3) : d; }, m: 'robe' });
  parts.push({ f: cap(25, 34, 25, 18, 9, 8), m: 'robe', k: 4 });
  parts.push({ f: ell(25, 20, 12, 4), m: 'gold', z: 1 });
  const hy = 11 + (P.hd | 0); parts.push({ f: ell(25, hy, 5.5, 6), m: 'skin', z: 2 }, { f: (x, y) => Math.max(ell(25, hy + 5, 5, 4.5)(x, y), hy + 3 - y), m: 'beard', z: 3 });
  const tilt = P.dim ? 2 : 0; for (const [x, h] of [[20, 5], [25, 7], [30, 5]]) parts.push({ f: cap(x + tilt, hy - 5, x + tilt, hy - 5 - h, 1.6, 0.6), m: 'gold', z: 3 });
  parts.push({ f: ell(25 + tilt, hy - 5, 7, 2), m: 'gold', z: 3 });
  const hands = arm > 0.5 ? [[12, 6], [38, 6]] : arm < -0.5 ? [[5, 26], [46, 24]] : [[8, 34], [42, 34]];
  [[16, 21], [34, 21]].forEach(([sx, sy2], i) => parts.push({ f: cap(sx, sy2, hands[i][0], hands[i][1], 4, 5.5), m: 'robe', z: 1 }));
  const mats = {
    robe: { pal: ['#140c28', '#2a1c50', '#46307e', '#6a4ab0', '#9474d8'], rim: '#c8a8ff', tex: (x, y) => Math.sin(x * 0.7 + y * 0.25) * 0.08, over: (x, y, d) => d < -1.5 && (x + y * 2) % 9 === 0 && y % 3 === 0 ? '#e6b84a' : null },
    gold: { pal: ['#6a4a18', '#a8782a', '#e6b84a', '#ffe27a', '#ffffff'], rim: '#ffffff' },
    skin: { pal: ['#7a7090', '#b8b0c8', '#d8d0e4', '#f0ecf8'] }, beard: { pal: ['#9a9ab0', '#c8c8dc', '#ececf8'], tex: (x) => (x % 2 ? -0.1 : 0.05) }
  };
  return render(W, H, parts, mats, g => {
    const eye = P.dim ? '#5a6a7a' : '#7fe0ff'; g.set(23, hy, eye); g.set(27, hy, eye); g.set(25 + tilt, hy - 6, '#7fe0ff');
    hands.forEach(([x, y]) => { for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (i * i + j * j <= 4) g.set(x + i, y + j, i * i + j * j < 2 ? '#ffffff' : '#7fe0ff'); });
    if (arm > 0.5) for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (i * i + j * j <= 9) g.set(25 + i, 2 + j, i * i + j * j < 3 ? '#ffffff' : '#9ff0ff');
  });
}

// ---------- Ignivar ----------
function dragon(P) {
  const W = 88, H = 62, cr = P.crouch | 0, wing = P.arm || 0, mouth = P.mouth | 0, parts = [], wy = wing > 0.5 ? -8 : wing < -0.5 ? 7 : 0;
  // cánh (màng + xương)
  const wingPoly = (bx, by, s) => { const tip = [bx + s * 24, 2 + wy], m1 = [bx + s * 30, 22 + wy * 0.4], m2 = [bx + s * 18, 30]; return { mem: poly([[bx, by], tip, m1, m2, [bx + s * 4, by + 10]]), bones: [cap(bx, by, tip[0], tip[1], 1.6, 0.8), cap(bx + s * 8, by - 4 + wy * 0.3, m1[0], m1[1], 1, 0.6), cap(bx + s * 6, by, m2[0], m2[1], 1, 0.6)] }; };
  const wl = wingPoly(34, 22 + cr, -1), wr = wingPoly(40, 21 + cr, 1);
  for (const w of [wl, wr]) { parts.push({ f: w.mem, m: 'mem', z: -2 }); for (const b of w.bones) parts.push({ f: b, m: 'scale', z: -1 }); }
  // đuôi
  for (let k = 0; k < 10; k++) { const t0 = k / 10, t1 = (k + 1) / 10, X = t => 26 - t * 24, Y = t => 38 + cr + Math.sin(t * 3.4 + (P.pulse ? 0.5 : 0)) * 5; parts.push({ f: cap(X(t0), Y(t0), X(t1), Y(t1), 4.5 - t0 * 3.6, 4.5 - t1 * 3.6), m: 'scale', k: 2 }); }
  parts.push({ f: cap(2, 38 + cr + Math.sin(3.4) * 5, -2, 33, 2, 0.4), m: 'horn' });
  // chân + thân
  parts.push({ f: cap(30, 40 + cr, 29, 56, 5, 4), m: 'scale', k: 3 }, { f: cap(46, 40 + cr, 47, 56, 5, 4), m: 'scale', k: 3, z: 1 });
  parts.push({ f: ell(29, 57, 5, 2.2), m: 'scale' }, { f: ell(48, 57, 5, 2.2), m: 'scale', z: 1 });
  parts.push({ f: ell(38, 36 + cr, 17, 11), m: 'body', k: 5 });
  // cổ + đầu
  const hx = 66 + (P.lean | 0), hy = 16 + cr + (P.hd | 0) + (P.low | 0);
  for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6, X = t => 48 + (hx - 48) * t, Y = t => 30 + cr + (hy + 3 - 30 - cr) * t - Math.sin(t * Math.PI) * 6; parts.push({ f: cap(X(t0), Y(t0), X(t1), Y(t1), 5.5 - t0 * 1.6, 5.5 - t1 * 1.6), m: 'body', k: 3 }); }
  parts.push({ f: ell(hx + 2, hy + 2, 7, 5.5), m: 'scale', k: 3, z: 2 }, { f: cap(hx + 4, hy + 3, hx + 14, hy + 4, 3.6, 2.4), m: 'scale', k: 2, z: 2 });
  parts.push({ f: cap(hx + 4, hy + 6 + mouth * 2, hx + 13, hy + 7 + mouth * 3, 2, 1.4), m: 'scale', z: 2 });
  parts.push({ f: cap(hx - 1, hy - 1, hx - 9, hy - 7, 1.8, 0.5), m: 'horn', z: 3 }, { f: cap(hx + 2, hy - 2, hx - 2, hy - 9, 1.5, 0.4), m: 'horn', z: 3 });
  const mats = {
    scale: { pal: ['#2a0604', '#5a1208', '#9a2410', '#d8461e', '#ff8a4a'], rim: '#ffb07a', tex: (x, y) => ((x + (y >> 1) * 2) % 4 === 0 ? -0.12 : 0) },
    body: { pal: ['#2a0604', '#5a1208', '#9a2410', '#d8461e', '#ff8a4a'], rim: '#ffb07a', tex: (x, y) => ((x + (y >> 1) * 2) % 4 === 0 ? -0.1 : 0), over: (x, y, d, nx, ny) => ny > 0.25 && d < -1.5 ? (y % 3 === 0 ? '#a8782a' : nx < 0 ? '#ffe27a' : '#e6b84a') : null },
    mem: { pal: ['#2a0808', '#4a1210', '#7a1e18', '#a83a24'], tex: (x, y) => Math.sin(x * 0.5) * 0.06 }, horn: { pal: ['#6a5a48', '#a8987a', '#efe4c8', '#ffffff'] }
  };
  return render(W, H, parts, mats, g => {
    const eye = P.dim ? '#6a3a1a' : P.rage ? '#ffffff' : '#ffe27a'; g.set(hx + 4, hy, eye); g.set(hx + 5, hy, eye);
    if (mouth) for (let i = 0; i < 9; i++) g.set(hx + 6 + i, hy + 6 + (i & 1), i > 5 ? '#ffffff' : '#ffd36b');
    for (let k = 0; k < 7; k++) g.set(28 + k * 4, 25 + cr - (k % 2), '#efe4c8');
  });
}

export const BOSS_ART = { COLOSSUS: [colossus, 52, 56], WARDEN: [warden, 48, 62], BEHEMOTH: [behemoth, 76, 56], SOVEREIGN: [sovereign, 50, 64], DRAGON: [dragon, 88, 62] };
