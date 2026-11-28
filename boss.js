// Boss lớn (stage 5/10/15/20): đòn có báo trước nhưng dồn dập, có đòn trễ nhịp kiểu Elden Ring,
// đổi pha khi mất máu, và thanh THẾ ĐỨNG (poise): khống chế làm hao thế đứng, vỡ thì boss khuỵu.
import { ENEMIES, dist, angDiff } from './sim.js';
const TAU = Math.PI * 2;

export const BOSS_DEFS = [
  { id: 'COLOSSUS', name: 'Ashen Colossus', epithet: 'The Mountain That Walks', hp: 2100, r: 58, speed: 81, range: 150, dmg: 0.8, poise: 130, color: '#D97706', accent: '#F59E0B',
    phases: [{ at: 1, moves: ['slam', 'combo', 'charge', 'nova'] },
             { at: 0.55, moves: ['slam', 'combo', 'charge', 'nova', 'rain', 'leap', 'molten'], speed: 1.25, wind: 0.8, terra: 'QUAKE' }] },
  { id: 'WARDEN', name: 'Frost Warden', epithet: 'Keeper of the Last Winter', hp: 9000, r: 50, speed: 102, range: 300, dmg: 1.35, poise: 200, color: '#9fe6ff', accent: '#ffffff', tele: '#1a5cff',
    phases: [{ at: 1, moves: ['frostbeams', 'prison', 'frostjavelins', 'sweep'] },
             { at: 0.55, moves: ['frostbeams', 'prison', 'frostjavelins', 'blizzard', 'mirror'], speed: 1.2, wind: 0.8, terra: 'ICE' }] },
  { id: 'BEHEMOTH', name: 'Sporeback Behemoth', epithet: 'The Walking Grove', hp: 6500, r: 70, speed: 68, range: 170, dmg: 1.15, poise: 170, color: '#d4b46e', accent: '#ff9a4a',
    phases: [{ at: 1, moves: ['slam', 'sporecone', 'roots', 'burrow', 'shellricochet'] },
             { at: 0.5, moves: ['brood', 'sporequake', 'mycelium', 'burrow', 'shellricochet', 'toxicspit'], speed: 1.25, wind: 0.8, terra: 'POISON' }] },
  { id: 'SOVEREIGN', name: 'Storm Sovereign', epithet: 'Crown of Every Element', hp: 20000, r: 54, speed: 119, range: 200, dmg: 1.7, poise: 260, color: '#c9a8ff', accent: '#7fe0ff',
    phases: [{ at: 1, moves: ['vortex', 'stormbeams', 'lines', 'teleport', 'constellation'] },
             { at: 0.66, moves: ['vortex2', 'stormbeams', 'lines', 'teleport', 'constellation'], speed: 1.2, wind: 0.85 }, // phase 2: lốc mạnh hơn; phân thân chỉ từ phase 3
             { at: 0.33, moves: ['vortex2', 'stormbeams', 'lines', 'teleport', 'mirror', 'constellation'], speed: 1.35, wind: 0.75, storm: true }] }
];
BOSS_DEFS.push({ id: 'DRAGON', name: 'Ignivar', epithet: 'The Last Flame', hp: 15000, r: 66, speed: 108, range: 240, dmg: 1.55, poise: 210, color: '#ff5a1a', accent: '#ffd36b', tele: '#ff3a10',
  phases: [{ at: 1, moves: ['breath', 'tail', 'gust', 'dive'] },
           { at: 0.8, moves: ['breath', 'tail', 'skyfall', 'hellspiral', 'dive'], speed: 1.15, wind: 0.85, terra: 'LAVA' },
           { at: 0.4, moves: ['breath', 'infernodive', 'lastflame', 'skyfall', 'tail'], speed: 1.3, wind: 0.75, firestorm: true }] });
ENEMIES.BOSSCLONE = { name: 'Mirror Image', ai: 'clone', hp: 1, speed: 90, r: 50, dmg: 0, color: '#c9a8ff', mass: 2, gold: 0, illusion: true };
for (const d of BOSS_DEFS) ENEMIES[d.id] = { name: d.name, hp: d.hp, speed: 0, r: d.r, dmg: 0, color: d.color, mass: 40, gold: 0 };

const MELEE = new Set(['slam', 'combo', 'sweep', 'sporecone', 'tail']), GAP = new Set(['charge', 'leap', 'teleport', 'burrow', 'vortex', 'vortex2', 'dive', 'divechain', 'rampage', 'infernodive', 'shellricochet']);

export function makeBoss(g, idx, x, y) {
  const d = BOSS_DEFS[idx];
  return { id: g.nextId++, type: d.id, boss: true, def: d, x, y, r: d.r, hp: d.hp, max: d.hp, kx: 0, ky: 0, flash: 0, dead: false, spawn: 1.6,
    burn: 0, burnTick: 0, wet: 0, slow: 0, slowAmt: 0, root: 0, freeze: 0, stun: 0, blind: 0, rootImm: 0, state: 'move', st: 0,
    poise: d.poise, poiseMax: d.poise, stagger: 0, phase: 0, idle: 1.4, busy: 0, last: '', face: 0, z: 0, sched: [],
    dashing: null, leap: null, tele: null, alpha: 1, contactCd: 0, stormT: 0, invuln: 0, glow: 0, poiseImm: 0, poiseIdle: 0 };
}

// ---------- tiện ích hazard ----------
// chọn cửa ngục băng: chấm điểm từng hướng theo độ trống của đường từ người chơi ra cửa và vùng ngay bên ngoài cửa
// (không vướng vật cản, không ra ngoài đấu trường). Các hướng trống hoàn toàn được chọn ngẫu nhiên; nếu không có thì lấy hướng trống nhất.
export function prisonGap(g, cx, cy, R0, n, W) {
  const pr = (g.p && g.p.r) || 14, A = g.arena, free = (x, y) => !g.world.blocked(x, y, pr + 4) && (!A || Math.hypot(x - A.x, y - A.y) < A.r - pr - 6);
  let best = [], bestS = -1;
  for (let k = 0; k < n; k++) {
    const a = (k + (W - 1) / 2) / n * TAU; let s = 0;
    for (const d of [R0 * 0.45, R0 * 0.8, R0, R0 + 40, R0 + 80, R0 + 120]) if (free(cx + Math.cos(a) * d, cy + Math.sin(a) * d)) s++;
    if (s > bestS) { bestS = s; best = [k]; } else if (s === bestS) best.push(k);
  }
  return best[Math.floor(g.rand() * best.length)];
}
function haz(g, b, o) { const h = { owner: b, color: b.def.tele || b.def.color, T: o.t, hold: 0, ...o }; g.hazards.push(h); return h; }
function aimAt(b, p) { return Math.atan2(p.y - b.y, p.x - b.x); }
// nhắm dự đoán: vị trí người chơi sau t giây theo vận tốc gần nhất (k = mức tin vào dự đoán), kẹp trong đấu trường
export function lead(g, t, k = 1, jit = 0) {
  const p = g.p, v = g.pv || { x: 0, y: 0 }; let x = p.x + v.x * t * k + (g.rand() - 0.5) * jit, y = p.y + v.y * t * k + (g.rand() - 0.5) * jit;
  const A = g.arena; if (A) { const d = dist(x, y, A.x, A.y), m = A.r - 40; if (d > m) { x = A.x + (x - A.x) / d * m; y = A.y + (y - A.y) / d * m; } }
  return [x, y];
}
// người chơi có nấp sau khối đá cứng (so với điểm nguồn) không
export function shadowed(g, sx, sy) {
  const p = g.p, dx = p.x - sx, dy = p.y - sy, L2 = dx * dx + dy * dy || 1;
  for (const o of g.world.temp) {
    if (!o.solid || o.type === 'rimrock' || o.sink > 0) continue;
    const t = ((o.x - sx) * dx + (o.y - sy) * dy) / L2; if (t <= 0 || t >= 1) continue;
    const cx = sx + dx * t, cy = sy + dy * t; if (dist(cx, cy, o.x, o.y) < o.r - 2) return true;
  }
  return false;
}
function at(b, t, fn) { b.sched.push({ t, fn }); }
function beam(g, b, o) { g.hazards.push({ kind: 'beam', owner: b, x: b.x, y: b.y, a: aimAt(b, g.p) + Math.PI / o.n, color: b.def.tele || b.def.color, hitCd: 0, T: o.t, ...o }); b.glow = o.t; }
function vortexAt(g, b, x, y, force, dur, w) {
  g.hazards.push({ kind: 'vortex', owner: b, x, y, r: 560, force, t: 0.9 * w, T: 0.9 * w, dur, dmg: 14, color: '#9a5aff', hitCd: 0 });
  for (let k = 0; k < 5; k++) at(b, 0.9 * w + 0.5 + k * 0.65, () => { const [lx, ly] = lead(g, 0.85, 1.2, 40); haz(g, b, { kind: 'circle', x: lx, y: ly, r: 54, t: 0.8, dmg: 22, color: '#7fe0ff' }); if (b.phase > 0 && k % 2 === 1) { const [mx, my] = lead(g, 0.85, 2.0, 50); haz(g, b, { kind: 'circle', x: mx, y: my, r: 52, t: 0.75, dmg: 20, color: '#7fe0ff' }); } });
  g.emit('vortex', { x, y });
}
// đổi mảng sàn (tránh chỗ người chơi đang đứng)
function terra(g, b, el, n, life) {
  if (!g.surface) return; const A = g.arena || b;
  for (let i = 0; i < n; i++) for (let k = 0; k < 8; k++) { const a = g.rand() * TAU, d = 100 + g.rand() * 440, x = A.x + Math.cos(a) * d, y = A.y + Math.sin(a) * d; if (dist(x, y, g.p.x, g.p.y) < 160) continue; g.surface.apply(x, y, 60 + g.rand() * 35, el, { rand: g.rand, life }); break; }
}

// ---------- bộ đòn ----------
const MOVES = {
  // Đập đất: vòng cảnh báo bám theo hướng người chơi rồi khoá; đôi khi khựng một nhịp trước khi nện (đòn trễ).
  slam(g, b, w) {
    const hold = g.rand() < 0.5 ? 0.25 + g.rand() * 0.35 : 0, T = 1.0 * w + hold;
    const toxic = b.type === 'BEHEMOTH';
    haz(g, b, { kind: 'circle', r: 128, t: T, hold, dmg: 42, track: 'front', reach: 165, lock: T * 0.35, color: toxic ? '#8ad84a' : undefined,
      shock: toxic ? null : { speed: 400, max: 360, thick: 22, dmg: 20 }, after() { if (toxic && g.surface) g.surface.apply(this.x, this.y, 115, 'POISON', { rand: g.rand, life: 14 }); } });
    g.emit('bossWind', { x: b.x, y: b.y, kind: 'slam' });
    return T + 0.55 * w;
  },
  sweep(g, b, w) {
    const hold = g.rand() < 0.35 ? 0.3 : 0, T = 0.8 * w + hold;
    haz(g, b, { kind: 'arc', r: 225, arc: 3.0, t: T, hold, dmg: 40, track: 'aim', lock: T * 0.3 });
    return T + 0.5 * w;
  },
  // Chuỗi 3–4 nhát xen trái phải, mỗi nhát nhắm lại một lần.
  combo(g, b, w) {
    const hits = b.phase > 0 ? 4 : 3; let t = 0;
    for (let i = 0; i < hits; i++) {
      const wind = (i === 0 ? 0.75 : 0.42) * w, start = t;
      at(b, start, () => haz(g, b, { kind: 'arc', r: 190, arc: 2.1, t: wind, dmg: 30, track: 'aim', lock: wind * 0.45, side: i % 2 ? 1 : -1,
        after: () => { const a = aimAt(b, g.p); b.x += Math.cos(a) * 45; b.y += Math.sin(a) * 45; g.world.collide(b, b.r * 0.8); } }));
      t += wind + 0.08;
    }
    return t + 0.6 * w;
  },
  // Húc: vạch đường rồi lao. Đâm vào cây/cột thì khuỵu.
  charge(g, b, w) {
    const T = 0.85 * w;
    const h = haz(g, b, { kind: 'line', fromBoss: true, len: 780, width: b.r * 2, t: T, dmg: 0, track: 'aim', lock: T * 0.4, visual: true });
    at(b, T, () => { b.dashing = { a: h.a, left: 780, speed: 950, hit: false }; });
    return 99; // kết thúc khi cú húc dừng
  },
  // Nhiều vòng sóng lan ra: phải lướt xuyên qua (lướt không bị trúng đòn).
  nova(g, b, w) {
    const n = b.phase > 0 ? 3 : 2, gap = 0.75; let ga = aimAt(b, g.p) + (g.rand() - 0.5) * 2;
    for (let i = 0; i < n; i++) {
      haz(g, b, { kind: 'ring', x: b.x, y: b.y, rr: b.r, speed: 300, max: 520, thick: 24, t: 0.85 * w + i * gap, dmg: 26, pre: true, fromBoss: true });
      ga += (g.rand() < 0.5 ? 1 : -1) * (0.9 + g.rand() * 0.8);
    }
    b.glow = 0.75 * w; b.anchor = 0.85 * w + (n - 1) * gap + 0.05;
    return Math.max(0.75 * w + n * gap * 0.6 + 0.3, b.anchor);
  },
  barrage(g, b, w, kind) {
    const waves = b.phase > 0 ? 6 : 4;
    for (let i = 0; i < waves; i++) at(b, 0.5 * w + i * 0.3, () => {
      const a0 = aimAt(b, g.p), n = 7, spread = 1.3, off = i % 2 ? spread / (n - 1) / 2 : 0;
      for (let k = 0; k < n; k++) { const a = a0 - spread / 2 + k * spread / (n - 1) + off; g.foes.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 290, vy: Math.sin(a) * 290, life: 3, dmg: 16 * b.def.dmg, r: 9, c: kind === 'ice' ? '#bfe8ff' : b.def.color, boss: true, kind }); }
      g.emit('bossCast', { x: b.x, y: b.y });
    });
    b.glow = 0.5 * w;
    return 0.5 * w + waves * 0.3 + 0.4;
  },
  // Mưa vòng tròn quanh người chơi, một vòng nằm đúng chỗ đứng.
  rain(g, b, w) {
    const n = b.phase > 0 ? 13 : 9, p = g.p;
    for (let i = 0; i < n; i++) {
      const a = g.rand() * TAU, d = i === 0 ? 0 : 60 + g.rand() * 200;
      haz(g, b, { kind: 'circle', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 72, t: 0.95 + i * 0.11, dmg: 32 });
    }
    return 0.8;
  },
  // Lưới vạch song song đi qua chỗ người chơi; pha 2 thêm lưới vuông góc.
  lines(g, b, w) {
    const p = g.p, th = g.rand() * Math.PI, nx = -Math.sin(th), ny = Math.cos(th), sets = b.phase > 0 ? 2 : 1;
    for (let s = 0; s < sets; s++) {
      const a = th + s * Math.PI / 2, ux = -Math.sin(a), uy = Math.cos(a);
      for (let i = -2; i <= 2; i++) haz(g, b, { kind: 'rect', x: p.x + ux * i * 150, y: p.y + uy * i * 150, a, len: 1500, width: 60, t: 1.0 * w + s * 0.75 + (i + 2) * 0.06, dmg: 40 });
    }
    b.glow = 0.8;
    return 1.1;
  },
  // Khe nứt toả ra từ boss.
  fissure(g, b, w) {
    const sets = b.phase > 0 ? 2 : 1, a0 = aimAt(b, g.p);
    for (let s = 0; s < sets; s++) for (let i = 0; i < 6; i++) {
      const a = a0 + i * TAU / 6 + s * TAU / 12;
      haz(g, b, { kind: 'rect', x: b.x + Math.cos(a) * 360, y: b.y + Math.sin(a) * 360, a, len: 700, width: 58, t: 1.0 * w + s * 0.7, dmg: 38 });
    }
    return 1.0 * w + sets * 0.7 + 0.4;
  },
  // Nhảy lên cao, bóng đổ bám theo người chơi rồi khoá, rơi xuống tạo sóng chấn động.
  leap(g, b, w) {
    const T = 1.6 * w;
    const h = haz(g, b, { kind: 'circle', r: 170, t: T, dmg: 55, track: 'player', lock: 0.5 * w, shock: { speed: 400, max: 400, thick: 24, dmg: 22 } });
    b.leap = { t: 0, T, ox: b.x, oy: b.y, h };
    return T + 0.8 * w;
  },
  // Biến mất rồi hiện ra sau lưng và chém nhanh.
  teleport(g, b, w) {
    b.tele = { t: 0, T: 0.45 };
    at(b, 0.45, () => {
      const p = g.p, a = p.aim + Math.PI;
      let x = p.x + Math.cos(a) * 140, y = p.y + Math.sin(a) * 140;
      if (g.world.blocked(x, y, b.r * 0.7)) { x = p.x - Math.cos(a) * 140; y = p.y - Math.sin(a) * 140; }
      b.x = x; b.y = y; g.clampArena(b, b.r);
      g.emit('bossBlink', { x, y });
      haz(g, b, { kind: 'arc', r: 200, arc: 2.6, t: 0.5 * w, dmg: 36, track: 'aim', lock: 0.25 * w });
    });
    return 0.45 + 0.5 * w + 0.5;
  },
  // ---------- rồng ----------
  // Phun lửa quét ngang: chuỗi nón lửa lần lượt theo một hướng; để lại lửa trên đất. Đứng sau lưng/ra xa là né được.
  breath(g, b, w) {
    const a0 = aimAt(b, g.p), dir = g.rand() < 0.5 ? 1 : -1, n = 7, step = 0.26, mx = b.x + Math.cos(a0) * b.r * 0.9, my = b.y + Math.sin(a0) * b.r * 0.9; // gốc quạt lửa: ngay dưới hàm rồng (đầu vươn trước thân)
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * step * dir;
      at(b, i * 0.1, () => haz(g, b, { kind: 'arc', x: mx, y: my, a, r: 330, arc: 0.42, t: 0.75 * w, dmg: 30, after: () => { if (g.surface) for (let k = 1; k <= 4; k++) g.surface.apply(mx + Math.cos(a) * k * 75, my + Math.sin(a) * k * 75, 34, 'BURN', { rand: g.rand, life: 3 }); g.emit('breath', { x: b.x, y: b.y, a }); } }));
    }
    b.glow = 0.6 * w; b.face = a0; b.chanT = n * 0.1 + 0.75 * w;
    return n * 0.1 + 0.75 * w + 0.6;
  },
  // Quét đuôi: vòng cung rộng phía sau lưng rồng (thường là chỗ người chơi vòng ra sau)
  tail(g, b, w) {
    const a = aimAt(b, g.p), back = Math.abs(angDiff(a, b.face || 0)) > 1.6;
    haz(g, b, { kind: 'arc', r: 230, arc: back ? 2.4 : 1.8, t: 0.8 * w, dmg: 34, track: 'aim', lock: 0.3 * w, push: 400 });
    return 0.8 * w + 0.5;
  },
  // Vỗ cánh: sóng đẩy lùi (có khe), thổi tắt/dạt lửa
  gust(g, b, w) {
    haz(g, b, { kind: 'ring', x: b.x, y: b.y, rr: b.r, speed: 420, max: 420, thick: 30, t: 0.7 * w, dmg: 10, push: 560, pre: true, fromBoss: true });
    b.anchor = 0.75 * w; g.emit('bossRoar', { x: b.x, y: b.y });
    return 0.7 * w + 0.6;
  },
  // Bổ nhào: lao thẳng để lại vệt lửa
  dive(g, b, w) {
    const T = 0.8 * w;
    const h = haz(g, b, { kind: 'line', fromBoss: true, len: 820, width: b.r * 1.8, t: T, dmg: 0, track: 'aim', lock: T * 0.4, visual: true });
    at(b, T, () => { b.dashing = { a: h.a, left: 820, speed: 1050, hit: false, fire: true }; });
    return 99;
  },
  // Bay lên rồi trút thiên thạch NHẮM DỰ ĐOÁN: mỗi bộ 3 viên = chỗ đứng / chỗ sắp tới / xa hơn theo hướng chạy (chặn cả đi thẳng lẫn một cú lướt)
  skyfall(g, b, w) {
    const T = 2.8; b.fly = { t: 0, T };
    for (let i = 0; i < 12; i++) at(b, 0.4 + i * 0.16, () => { const m = i % 3, [x, y] = m === 0 ? [g.p.x, g.p.y] : lead(g, 0.9, m === 1 ? 1 : 1.9, 24); haz(g, b, { kind: 'circle', x, y, r: 68, t: 0.9, dmg: 30, after() { if (g.surface) g.surface.apply(this.x, this.y, 46, 'LAVA', { rand: g.rand, life: 7 }); } }); });
    at(b, T - 1.0, () => haz(g, b, { kind: 'circle', r: 150, t: 1.0, dmg: 40, track: 'player', lock: 0.45, shock: { speed: 300, max: 300, thick: 24, dmg: 18 } }));
    return T + 0.6;
  },
  // Xoắn ốc lửa: 3 nhánh cột lửa mọc từ mép sân xoáy vào tâm; lối an toàn xoay theo
  hellspiral(g, b, w) {
    const A = g.arena || { x: b.x, y: b.y, r: 600 }, a0 = g.rand() * TAU, dir = g.rand() < 0.5 ? 1 : -1, steps = 15;
    for (let arm = 0; arm < 3; arm++) for (let s = 0; s < steps; s++) {
      const r = A.r - 50 - s * (A.r - 110) / steps, a = a0 + arm * TAU / 3 + dir * s * 0.34;
      haz(g, b, { kind: 'circle', x: A.x + Math.cos(a) * r, y: A.y + Math.sin(a) * r, r: 58, t: 0.95 * w + s * 0.13, dmg: 30, after() { if (g.surface) g.surface.apply(this.x, this.y, 36, 'BURN', { rand: g.rand, life: 2.5 }); } });
    }
    b.glow = 0.9 * w; g.emit('bossRoar', { x: b.x, y: b.y }); b.chanT = 0.95 * w + steps * 0.13;
    return 0.95 * w + steps * 0.13 + 0.5;
  },
  // Cú bổ nhào xuyên sân (kiểu ult Shyvana): dài hơn, rộng hơn, trúng thì làm chậm
  infernodive(g, b, w) {
    const T = 0.85 * w, W = b.r * 2.6;
    const h = haz(g, b, { kind: 'line', fromBoss: true, len: 1200, width: W, t: T, dmg: 0, track: 'aim', lock: T * 0.4, visual: true });
    at(b, T, () => { b.dashing = { a: h.a, left: 1200, speed: 1350, hit: false, fire: true, wide: W / 2, slowHit: 2.0 }; });
    g.emit('bossRoar', { x: b.x, y: b.y });
    return 99;
  },
  // NGỌN LỬA CUỐI CÙNG: bay lên giữa sân, gồng rồi thiêu toàn đấu trường — chỉ chỗ khuất sau mỏm đá là an toàn
  lastflame(g, b, w) {
    if ((g.t - (b.lfT ?? -99)) < 25) return MOVES.infernodive(g, b, w);
    b.lfT = g.t;
    const A = g.arena || { x: b.x, y: b.y, r: 620 }, T = 2.8, p = g.p, pockets = [];
    // 2–3 khoảng trống nhỏ ở chỗ khó đoán: cách xa người chơi nhưng vẫn chạy kịp; chỉ hiện rõ lúc đầu rồi mờ đi
    for (let k = 0; k < 40 && pockets.length < (b.rage ? 2 : 3); k++) {
      const a = g.rand() * TAU, d = 230 + g.rand() * 200, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      if (dist(x, y, A.x, A.y) > A.r - 90 || pockets.some(q => dist(q.x, q.y, x, y) < 260) || g.world.blocked(x, y, 40)) continue;
      pockets.push({ x, y, r: 62 });
    }
    b.soar = { t: 0, T: T + 0.6, x0: b.x, y0: b.y, x1: A.x, y1: A.y };
    at(b, 0.5, () => g.hazards.push({ kind: 'shadowblast', owner: b, x: A.x, y: A.y, r: A.r + 40, t: T - 0.5, T: T - 0.5, dmg: 42, color: '#ff3a10', pockets }));
    g.emit('bossRoar', { x: b.x, y: b.y });
    return T + 1.2;
  },
  // Ngục băng kín: 24 trụ chồng mép, không lướt/lách được, chỉ một cửa (rộng 3 trụ).
  // Cửa luôn mở ra chỗ TRỐNG: phía ngoài cửa không vướng đá/cây/tường đấu trường và vẫn nằm trong đấu trường.
  prison(g, b, w) {
    const p = g.p, n = 24, R0 = b.phase > 0 ? 150 : 175, W = 3;
    const gap = prisonGap(g, p.x, p.y, R0, n, W);
    for (let k = 0; k < n; k++) { if ((k - gap + n) % n < W) continue; const a = k / n * TAU, o = g.world.addTemp('icewall', p.x + Math.cos(a) * R0, p.y + Math.sin(a) * R0, 24, 4.2, 999); o.solid = true; o.rise = 0.25; o.riseDelay = 0; o.age = 0; }
    const ga = (gap + (W - 1) / 2) / n * TAU, gx = p.x + Math.cos(ga) * R0, gy = p.y + Math.sin(ga) * R0;
    haz(g, b, { kind: 'circle', x: p.x, y: p.y, r: R0 - 25, t: 1.5 * w, dmg: b.phase > 0 ? 52 : 40 }); g.emit('prison', { x: p.x, y: p.y, gx, gy, r: R0 });
    return 1.5 * w + 0.6;
  },
  // Giáo băng: 3 cây ném lần lượt, mỗi cây báo trước một vạch rồi bay rất nhanh vào chỗ dự đoán; xuyên người, để vệt băng
  frostjavelins(g, b, w) {
    for (let i = 0; i < 3; i++) at(b, 0.5 * w + i * 0.7, () => {
      const [tx, ty] = lead(g, 0.45 + dist(b.x, b.y, g.p.x, g.p.y) / 1150, 1, 20), a = Math.atan2(ty - b.y, tx - b.x);
      haz(g, b, { kind: 'line', x: b.x, y: b.y, a, len: 900, width: 26, t: 0.45, dmg: 0, visual: true });
      at(b, 0.45, () => { g.foes.push({ x: b.x + Math.cos(a) * b.r, y: b.y + Math.sin(a) * b.r, vx: Math.cos(a) * 1150, vy: Math.sin(a) * 1150, life: 0.9, dmg: 26 * b.def.dmg, r: 11, c: '#e8f8ff', boss: true, kind: 'javelin', pierce: true, trail: 'ICE', a }); g.emit('bossCast', { x: b.x, y: b.y }); });
    });
    b.glow = 0.5 * w;
    return 0.5 * w + 3 * 0.7 + 0.5;
  },
  // Bão tuyết: tầm nhìn hẹp, đứng yên là tích lạnh rồi đóng băng
  blizzard(g, b, w) { g.blizzard = { t: 7.5, T: 7.5 }; b.glow = 0.8; g.emit('bossRoar', { x: b.x, y: b.y }); g.emit('blizzard', {}); return 1.4; },
  // Mai xoay nảy như bi a: chạm vành/đá thì bật theo góc phản xạ
  shellricochet(g, b, w) {
    const T = 0.8 * w;
    const h = haz(g, b, { kind: 'line', fromBoss: true, len: 600, width: b.r * 1.6, t: T, dmg: 0, track: 'aim', lock: T * 0.4, visual: true });
    at(b, T, () => { b.dashing = { a: h.a, left: 3200, speed: 780, hit: false, spin: true, bounce: b.rage ? 4 : 3 }; });
    return 99;
  },
  // Rễ nấm bò ngầm thành nhiều đường ngoằn ngoèo rồi vỡ thành dải độc
  mycelium(g, b, w) {
    const a0 = aimAt(b, g.p);
    for (let v = 0; v < 4; v++) {
      let x = b.x, y = b.y, a = a0 + (v - 1.5) * 0.7;
      for (let i = 0; i < 9; i++) {
        a += (g.rand() - 0.5) * 0.9 + angDiff(aimAt({ x, y }, g.p), a) * 0.12;
        const nx = x + Math.cos(a) * 62, ny = y + Math.sin(a) * 62;
        haz(g, b, { kind: 'rect', x: (x + nx) / 2, y: (y + ny) / 2, a, len: 70, width: 40, t: 1.2 * w + i * 0.07, dmg: 22, color: '#8ad84a', after() { if (g.surface) g.surface.apply(this.x, this.y, 30, 'POISON', { rand: g.rand, life: 6 }); } });
        x = nx; y = ny;
      }
    }
    b.glow = 0.8; return 1.2 * w + 0.9;
  },
  // Dậm đất: nấm trong đấu trường gãy thành bãi độc, mọi lính nấm nhảy vào chỗ dự đoán (chậm, dễ đoán hơn rồng) rồi nổ
  sporequake(g, b, w) {
    const T = 1.0 * w;
    haz(g, b, { kind: 'circle', r: 200, t: T, dmg: 30, fromBoss: true, color: '#c8a070', after: () => {
      for (const o of g.world.temp) if (o.arena && o.type === 'tree' && !o.dead) { o.dead = true; o.solid = false; if (g.surface) g.surface.apply(o.x, o.y, 80, 'POISON', { rand: g.rand, life: 9 }); g.emit('obstacleBreak', { x: o.x, y: o.y, r: o.r, type: 'tree' }); }
      g.world.temp = g.world.temp.filter(o => !o.dead);
      const spores = g.enemies.filter(e => e.type === 'MINISPORE' && !e.dead);
      spores.forEach((e, i) => { const J = 0.9 + i * 0.08, [lx, ly] = i % 2 ? lead(g, J, 0.6, 0) : [g.p.x, g.p.y], q = i * 2.4 + g.rand() * 0.8, rr = i < 2 ? 20 : 70 + (i % 3) * 55, tx = lx + Math.cos(q) * rr, ty = ly + Math.sin(q) * rr; e.dead = true; e.hp = 0; g.emit('sporeLeap', { x1: e.x, y1: e.y, x2: tx, y2: ty, T: J });
        haz(g, b, { kind: 'circle', x: tx, y: ty, r: 62, t: J, dmg: 18, color: '#8ad84a', after() { if (g.surface) g.surface.apply(this.x, this.y, 60, 'POISON', { rand: g.rand, life: 6 }); } }); });
    } });
    g.emit('bossWind', { x: b.x, y: b.y, kind: 'slam' });
    return T + 1.4;
  },
  // Sao chòm: các ngôi sao quanh người chơi nối thành chòm sao, rồi các vạch nổ
  constellation(g, b, w) {
    const [cx, cy] = lead(g, 0.6, 0.6), n = b.phase > 0 ? 6 : 5, a0 = g.rand() * TAU, pts = [];
    for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n + (g.rand() - 0.5) * 0.6, d = 110 + g.rand() * 130; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); }
    const pairs = pts.map((q, i) => [q, pts[(i + 1) % n]]); pairs.push([pts[0], pts[Math.floor(n / 2)]]); if (b.phase > 0) pairs.push([pts[1], pts[n - 1]]);
    const T = 1.1 * w;
    for (const [[x1, y1], [x2, y2]] of pairs) haz(g, b, { kind: 'rect', x: (x1 + x2) / 2, y: (y1 + y2) / 2, a: Math.atan2(y2 - y1, x2 - x1), len: Math.hypot(x2 - x1, y2 - y1) + 30, width: 34, t: T, dmg: 36, color: '#c9a8ff' });
    for (const [x, y] of pts) haz(g, b, { kind: 'circle', x, y, r: 22, t: T, dmg: 0, visual: true, color: '#ffe9a0' });
    b.glow = T; return T + 0.6;
  },
  // Phun độc: một dải độc rộng chạy tới tận mép đấu trường, để lại bãi độc dọc đường
  toxicspit(g, b, w) {
    const [tx, ty] = lead(g, 0.6, 0.5), a = Math.atan2(ty - b.y, tx - b.x), L = 1300, T = 1.1 * w;
    haz(g, b, { kind: 'rect', x: b.x + Math.cos(a) * (L / 2 + b.r * 0.5), y: b.y + Math.sin(a) * (L / 2 + b.r * 0.5), a, len: L, width: 120, t: T, dmg: 34, color: '#8ad84a',
      after() { if (g.surface) for (let d = b.r; d < L; d += 55) g.surface.apply(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 52, 'POISON', { rand: g.rand, life: 9 }); } });
    b.face = a; b.glow = T; g.emit('bossWind', { x: b.x, y: b.y, kind: 'slam' });
    return T + 0.6;
  },
  // ---------- chiêu mới ----------
  molten(g, b, w) { terra(g, b, b.type === 'COLOSSUS' ? 'QUAKE' : 'LAVA', 7, 12); g.emit('bossRoar', { x: b.x, y: b.y }); return 1.0; },
  // tia xoay quanh boss: báo trước vị trí ban đầu + chiều xoay; đứng giữa các tia hoặc ra ngoài tầm là né được
  frostbeams(g, b, w) { const sd = g.rand() < 0.5 ? 1 : -1; beam(g, b, { n: 2, twin: 0.2, len: 430, width: 20, t: 1.0 * w, dur: 3.2, spin: sd * 0.85, a: aimAt(b, g.p) - sd * 1.35, dmg: 22, trail: 'ICE' }); /* hai tia song song (gậy + lòng bàn tay) quét ngang trước mặt */ b.anchor = 1.0 * w + 3.2; at(b, 1.0 * w + 0.6, () => MOVES.frostjavelins(g, b, 0.8)); return 1.0 * w + 3.4; },
  stormbeams(g, b, w) { beam(g, b, { n: 4, len: 470, width: 18, t: 1.0 * w, dur: 3.6, spin: (g.rand() < 0.5 ? 1 : -1) * 0.8, dmg: 24 }); b.anchor = 1.0 * w + 3.6; return 1.0 * w + 3.8; },
  flamebeams(g, b, w) { beam(g, b, { n: 3, len: 480, width: 24, t: 0.9 * w, dur: 3.4, spin: (g.rand() < 0.5 ? 1 : -1) * 1.0, dmg: 28, trail: 'BURN' }); b.anchor = 0.9 * w + 3.4; return 0.9 * w + 3.6; },
  lances(g, b, w) { return MOVES.barrage(g, b, w, 'ice'); },
  // phân thân: bản sao 1 máu cùng ra đòn; boss thật đổi chỗ
  mirror(g, b, w) {
    if (b.type === 'SOVEREIGN' && b.phase < 2) return MOVES.constellation(g, b, w); // trùm cuối chỉ phân thân từ phase 3
    const alive = g.enemies.filter(e => e.cloneOf && !e.dead).length; const cap = b.type === 'SOVEREIGN' ? 2 : 1; if (alive >= cap) return MOVES.frostjavelins ? (b.type === 'WARDEN' ? MOVES.frostjavelins(g, b, w) : MOVES.constellation(g, b, w)) : 1.0;
    const p = g.p, spots = [0, 1, 2].map(k => { const a = g.rand() * 0.6 + k * TAU / 3; return [p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240]; });
    const real = Math.floor(g.rand() * 3);
    let made = alive; spots.forEach(([x, y], k) => { if (k === real) { b.x = x; b.y = y; g.clampArena(b, b.r); g.emit('bossBlink', { x, y }); } else if (made < cap) { made++; const c = g.spawnAt('BOSSCLONE', x, y); g.clampArena(c, b.r + 10); c.r = b.r; c.def = b.def; c.cloneOf = b.type; c.life = 10; c.spawn = 0.3; c.atkT = 1 + k * 0.4; } });
    return 1.0;
  },
  // rải lính nấm từ lưng
  brood(g, b, w) {
    if (b.shrooms === undefined) b.shrooms = 5;
    if (b.shrooms <= 0) { b.shrooms = 5; g.emit('regrow', { x: b.x, y: b.y }); b.glow = 0.8; return 1.0; }   // nấm mọc lại trên lưng
    const alive = g.enemies.filter(e => e.type === 'MINISPORE' && !e.dead).length, n = Math.max(0, Math.min(b.shrooms, 9 - alive));
    for (let k = 0; k < n; k++) { const a = g.rand() * TAU, d = 90 + g.rand() * 120, x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d; at(b, 0.3 + k * 0.16, () => { b.shrooms = Math.max(0, b.shrooms - 1); const m = g.spawnAt('MINISPORE', x, y); m.spawn = 0.5; g.emit('dropMinion', { x1: b.x + (k - 2) * 12, y1: b.y - b.r * 1.1, x2: x, y2: y }); }); }
    b.glow = 0.6; return 1.2 + n * 0.16;
  },
  // vùng rễ: nhiều vòng quanh người chơi, sập xuống thì trói chân
  roots(g, b, w) { const p = g.p; for (let k = 0; k < 5; k++) { const a = g.rand() * TAU, d = k === 0 ? 0 : 90 + g.rand() * 160; haz(g, b, { kind: 'circle', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 72, t: (1.0 + k * 0.12) * w, dmg: 10, rootP: 1.4, color: '#7ac040' }); } return 1.4 * w; },
  // chui đất: thành gò đất đuổi theo rồi trồi lên dưới chân
  burrow(g, b, w) { b.burrow = { t: 0, T: 1.2 + g.rand(), dust: 0 }; g.emit('burrow', { x: b.x, y: b.y }); return 99; },
  sporecone(g, b, w) { const a = aimAt(b, g.p); haz(g, b, { kind: 'arc', x: b.x, y: b.y, a, r: 280, arc: 1.1, t: 0.85 * w, dmg: 18, color: '#8ad84a', after: () => { if (g.surface) for (let k = 1; k <= 3; k++) g.surface.apply(b.x + Math.cos(a) * k * 85, b.y + Math.sin(a) * k * 85, 55, 'POISON', { rand: g.rand, life: 6 }); } }); return 0.85 * w + 0.5; },
  // nổi giận: húc liên tục 3 cú, mỗi cú nhanh hơn
  rampage(g, b, w) { const T = 0.7 * w; const h = haz(g, b, { kind: 'line', fromBoss: true, len: 700, width: b.r * 2, t: T, dmg: 0, track: 'aim', lock: T * 0.4, visual: true }); at(b, T, () => { b.dashing = { a: h.a, left: 700, speed: 900, hit: false, chain: 2 }; }); g.emit('bossRoar', { x: b.x, y: b.y }); return 99; },
  divechain(g, b, w) { const r = MOVES.dive(g, b, w); b.sched[b.sched.length - 1].chainFire = true; b.diveChain = 2; return r; },
  // hố đen: hút cả sân về một điểm, sét đánh xung quanh
  vortex(g, b, w) { const A = g.arena || b; vortexAt(g, b, A.x + (g.rand() - 0.5) * 200, A.y + (g.rand() - 0.5) * 200, 160, 3.6, w); return 0.9 * w + 3.8; },
  vortex2(g, b, w) { const A = g.arena || b, a = g.rand() * TAU; vortexAt(g, b, A.x + Math.cos(a) * 260, A.y + Math.sin(a) * 260, 105, 3.6, w); vortexAt(g, b, A.x - Math.cos(a) * 260, A.y - Math.sin(a) * 260, 105, 3.6, w); return 0.9 * w + 3.8; },
  summon(g, b) {
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4; g.spawnAt(i % 2 ? 'CHARGER' : 'GRUNT', b.x + Math.cos(a) * 120, b.y + Math.sin(a) * 120); }
    g.emit('bossRoar', { x: b.x, y: b.y });
    return 1.0;
  }
};

// chiêu nối chiêu: sau đòn A, xác suất p ra ngay đòn B (đòn trước dọn đường cho đòn sau)
const LINKS = {
  COLOSSUS: { leap: ['nova', 0.8], charge: ['slam', 0.7], slam: ['combo', 0.4] },
  WARDEN: { prison: ['frostjavelins', 0.85], blizzard: ['mirror', 0.6], sweep: ['frostjavelins', 0.5] },
  BEHEMOTH: { toxicspit: ['shellricochet', 1], roots: ['slam', 0.8], mycelium: ['burrow', 0.6], sporequake: ['toxicspit', 0.5] },
  DRAGON: { gust: ['breath', 0.8], skyfall: [b2 => b2.phase >= 2 ? 'infernodive' : 'dive', 0.7], tail: ['breath', 0.4], hellspiral: ['skyfall', 0.35] },
  SOVEREIGN: { vortex: ['constellation', 0.75], vortex2: ['lines', 0.7], teleport: ['lines', 0.6], mirror: ['constellation', 0.5] }
};
// đòn có thời gian hồi riêng (không cho spam tia xoay)
const MOVE_CD = { frostbeams: 16, stormbeams: 12, shellricochet: 9, toxicspit: 7, lastflame: 25 };
function chooseMove(g, b, P, d) {
  if (b.forceMove) { const m = b.forceMove; b.forceMove = null; return m; }
  // Warden pha 2: bão tuyết là đòn chủ đạo (cứ hết bão là gần như gọi lại)
  if (b.type === 'WARDEN' && b.phase > 0 && !g.blizzard && b.last !== 'blizzard' && g.rand() < 0.75) return 'blizzard';
  b.cd = b.cd || {};
  let opts = P.moves.filter(m => m !== b.last && !((b.cd[m] || 0) > g.t) && !(m === 'blizzard' && g.blizzard));
  if (d > 280) opts = opts.filter(m => !MELEE.has(m)).concat(opts.filter(m => GAP.has(m)));
  if (d < 200) opts = opts.concat(opts.filter(m => MELEE.has(m)));
  if (!opts.length) opts = P.moves;
  return opts[Math.floor(g.rand() * opts.length)];
}

export function staggerBoss(g, b, t, why) {
  if (b.dead || g.brutal) return;   // Brutal: boss không bao giờ bị choáng
  b.stagger = t; b.poise = b.poiseMax; b.poiseImm = t + 5; b.dashing = null; b.sched = []; b.busy = 0; b.tele = null; b.alpha = 1;
  if (b.leap) { b.leap = null; b.z = 0; }
  g.hazards = g.hazards.filter(h => h.owner !== b || h.done);
  g.hitstop = Math.max(g.hitstop, 0.12);
  g.emit('bossStagger', { x: b.x, y: b.y, why });
}
export function poiseDamage(g, b, amt) {
  if (g.brutal) return;
  if (b.stagger > 0 || b.invuln > 0 || b.spawn > 0 || b.poiseImm > 0) return;
  b.poise -= amt; b.poiseIdle = 0;
  if (b.poise <= 0) staggerBoss(g, b, 2.6, 'break');
}

export function bossUpdate(g, b, dt) {
  if (b.dead) return;
  const p = g.p, ph = b.def.phases;
  b.poiseImm = Math.max(0, b.poiseImm - dt); b.poiseIdle += dt; if (b.poiseIdle > 3) b.poise = Math.min(b.poiseMax, b.poise + b.poiseMax * 0.12 * dt);
  b.flash = Math.max(0, b.flash - dt); b.contactCd = Math.max(0, b.contactCd - dt); b.invuln = Math.max(0, b.invuln - dt); b.glow = Math.max(0, b.glow - dt);
  if (b.anchor > 0) { b.anchor -= dt; b.kx = 0; b.ky = 0; } // đang niệm đòn lan từ thân: không bị đẩy lệch tâm
  b.x += b.kx * dt; b.y += b.ky * dt; const kd = Math.exp(-10 * dt); b.kx *= kd; b.ky *= kd;
  // vận tốc người chơi (làm mượt) cho các đòn nhắm dự đoán
  if (!g.pv) g.pv = { x: 0, y: 0 }; { const k = Math.min(1, dt * 8); g.pv.x += ((p.vx || 0) - g.pv.x) * k; g.pv.y += ((p.vy || 0) - g.pv.y) * k; }
  if (b.emergeT > 0) { b.emergeT -= dt; b.alpha = b.emergeT > 0 ? 0 : 1; b.invuln = Math.max(b.invuln, 0.05); }
  // bão tuyết: đứng yên/đi chậm thì tích lạnh, đầy thì đóng băng
  if (g.blizzard) {
    const Bz = g.blizzard; Bz.t -= dt; const sp = Math.hypot(g.pv.x, g.pv.y);
    p.bchill = Math.max(0, (p.bchill || 0) + (sp < 70 && p.dashT <= 0 ? dt : -dt * 1.2));
    if (p.bchill >= 1.4) { p.bchill = 0; p.frozen = Math.max(p.frozen || 0, 0.9); g.hurtPlayer(14, 0, { boss: true }); g.emit('playerFrozen', { x: p.x, y: p.y }); }
    if (Bz.t <= 0) { g.blizzard = null; p.bchill = 0; }
  }
  if (b.spawn > 0) { b.spawn -= dt; return; }
  // đổi pha
  if (b.phase + 1 < ph.length && b.hp / b.max <= ph[b.phase + 1].at) {
    b.phase++; b.invuln = 1.3; b.sched = []; b.busy = 1.3; b.dashing = null; b.tele = null; b.alpha = 1;
    if (b.leap) { b.leap = null; b.z = 0; }
    g.hazards = g.hazards.filter(h => h.owner !== b || h.done);
    haz(g, b, { kind: 'ring', x: b.x, y: b.y, rr: b.r, speed: 520, max: 380, thick: 40, t: 0.01, dmg: 0, push: 480 });
    g.emit('bossPhase', { x: b.x, y: b.y, phase: b.phase });
    if (ph[b.phase].terra) terra(g, b, ph[b.phase].terra, 8, ph[b.phase].terra === 'LAVA' || ph[b.phase].terra === 'QUAKE' ? 30 : 18);
    b.rage = true;
    if (b.type === 'BEHEMOTH' && b.phase === 1) { b.shrooms = 5; at(b, 1.0, () => { b.busy = MOVES.brood(g, b, 1); }); }
    if (b.type === 'DRAGON' && b.phase === 2) b.forceMove = 'lastflame';
  }
  const hid = !!g._real, P = ph[b.phase], w = (P.wind || 1) * (hid ? 1.4 : 1) * (g.brutal ? 0.78 : 1), spd = (P.speed || 1) * (g.brutal ? 1.15 : 1);
  if (b.stagger > 0) { b.stagger -= dt; return; }
  // lịch đòn
  for (const s of b.sched) { s.t -= dt; if (s.t <= 0) { s.done = true; s.fn(); } }
  b.sched = b.sched.filter(s => !s.done);
  // bão sét nền (pha cuối của trùm)
  if (P.firestorm) { b.stormT -= dt; if (b.stormT <= 0) { b.stormT = 0.9; const a = g.rand() * TAU, d = g.rand() * 200; haz(g, b, { kind: 'circle', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 62, t: 1.0, dmg: 24, after() { if (g.surface) g.surface.apply(this.x, this.y, 40, 'BURN', { rand: g.rand, life: 3 }); } }); } }
  if (P.storm) { b.stormT -= dt; if (b.stormT <= 0) { b.stormT = 1.3; const [sx, sy] = lead(g, 1.0, 1.3, 60); haz(g, b, { kind: 'circle', x: sx, y: sy, r: 52, t: 1.0, dmg: 22, color: '#7fe0ff' }); } } // sét nền: rơi chỗ sắp tới (đổi hướng là né được)
  // không đứng im khi niệm: trôi chậm về phía người chơi hoặc đi ngang (38% tốc độ)
  if (b.chanT > 0) b.chanT -= dt;
  const chan = b.chanT > 0 || g.hazards.some(h => h.owner === b && h.kind === 'beam' && h.active);
  if (chan && !b.dashing && !b.burrow && !b.leap && !b.fly) {
    const a = aimAt(b, p), d = dist(b.x, b.y, p.x, p.y), sp = b.def.speed * spd * 0.38 * dt, fwd = d > 230 ? 1 : d < 150 ? -0.6 : 0.2;
    if (!b.strafe) b.strafe = g.rand() < 0.5 ? 1 : -1;
    const ox = b.x, oy = b.y; b.x += (Math.cos(a) * fwd - Math.sin(a) * b.strafe * 0.7) * sp; b.y += (Math.sin(a) * fwd + Math.cos(a) * b.strafe * 0.7) * sp;
    if (g.world.blocked(b.x, b.y, b.r * 0.55) || g.outOfArena(b, b.r)) { b.x = ox; b.y = oy; b.strafe = -b.strafe; }
  }
  // bay lên giữa sân (Last Flame)
  if (b.soar) {
    const S = b.soar; S.t += dt; const k = Math.min(1, S.t / 0.6);
    b.x = S.x0 + (S.x1 - S.x0) * k; b.y = S.y0 + (S.y1 - S.y0) * k;
    b.z = S.t < S.T - 0.4 ? Math.min(1, S.t / 0.5) * 200 : Math.max(0, (S.T - S.t) / 0.4) * 200; b.invuln = Math.max(b.invuln, 0.05);
    if (S.t >= S.T) { b.soar = null; b.z = 0; haz(g, b, { kind: 'ring', x: b.x, y: b.y, rr: b.r, speed: 420, max: 300, thick: 26, t: 0.01, dmg: 14, push: 420 }); }
    b.busy -= dt; return;
  }
  // húc
  if (b.dashing) {
    const D = b.dashing, s = D.speed * dt, ox = b.x, oy = b.y;
    b.x += Math.cos(D.a) * s; b.y += Math.sin(D.a) * s; D.left -= s;
    const rp = g._real || p;
    if (!D.hit && dist(b.x, b.y, rp.x, rp.y) < (D.wide || b.r) + rp.r && rp.inv <= 0) { D.hit = true; g.hurtPlayer(46 * b.def.dmg, D.a, { boss: true, real: true }); if (D.slowHit) { p.slowT = Math.max(p.slowT || 0, D.slowHit); g.emit('playerSlowed', { x: p.x, y: p.y }); } }
    if (D.bounce !== undefined && (g.world.blocked(b.x, b.y, b.r * 0.55) || g.outOfArena(b, b.r))) {
      b.x = ox; b.y = oy; let nx, ny; const A = g.arena;
      if (A && g.outOfArena(b, b.r + 2)) { nx = A.x - b.x; ny = A.y - b.y; } else { let o2 = null, hd2 = 1e9; g.world.near(b.x, b.y, b.r + 80, o => { const d3 = dist(b.x, b.y, o.x, o.y) - o.r; if (d3 < hd2) { hd2 = d3; o2 = o; } }); if (o2) { nx = b.x - o2.x; ny = b.y - o2.y; } else { nx = -Math.cos(D.a); ny = -Math.sin(D.a); } }
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; let dx = Math.cos(D.a), dy = Math.sin(D.a); const dn = dx * nx + dy * ny; dx -= 2 * dn * nx; dy -= 2 * dn * ny;
      D.a = Math.atan2(dy, dx) + (g.rand() - 0.5) * 0.25; D.bounce--; D.hit = false; g.emit('shellBounce', { x: b.x, y: b.y }); g.hazards.push({ kind: 'line', owner: b, x: b.x, y: b.y, a: D.a, len: 260, width: b.r * 1.4, t: 0.25, T: 0.25, hold: 0, dmg: 0, visual: true, color: b.def.color });
      if (D.bounce < 0) D.left = 0;
    }
    if (D.fire && g.surface && g.rand() < 0.6) g.surface.apply(b.x, b.y, 40, 'BURN', { rand: g.rand, life: 3 });
    g.world.damageObstacles(b.x + Math.cos(D.a) * b.r * 0.5, b.y + Math.sin(D.a) * b.r * 0.5, b.r * 0.5, 40);
    if (D.bounce === undefined && g.world.blocked(b.x, b.y, b.r * 0.55)) {
      g.world.damageObstacles(b.x + Math.cos(D.a) * b.r, b.y + Math.sin(D.a) * b.r, b.r * 0.7, 999);
      // chỉ boss đầu (Ashen Colossus) đâm vào địa hình mới bị choáng; các boss sau trườn men theo vật cản rồi lao tiếp
      if (b.type === 'COLOSSUS') { b.x = ox; b.y = oy; staggerBoss(g, b, 1.8, 'crash'); return; }
      // trườn: bỏ phần lao thẳng vào vật cản, men theo mép (hướng lao giữ nguyên nên qua khỏi mép là lao tiếp)
      const R0 = b.r * 0.55; let hit = null, hd = 1e9; g.world.near(b.x, b.y, R0 + 60, o => { const d = dist(b.x, b.y, o.x, o.y) - o.r; if (d < R0 && d < hd) { hd = d; hit = o; } });
      if (hit) {
        let nx = ox - hit.x, ny = oy - hit.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        let tx = -ny, ty = nx; const dot = tx * Math.cos(D.a) + ty * Math.sin(D.a); if (dot < 0 || (Math.abs(dot) < 0.05 && (D.side = D.side || (g.rand() < 0.5 ? 1 : -1)) < 0)) { tx = -tx; ty = -ty; }
        b.x = ox + tx * s; b.y = oy + ty * s; const d2 = dist(b.x, b.y, hit.x, hit.y), m = hit.r + R0 + 1; if (d2 < m) { b.x = hit.x + (b.x - hit.x) / d2 * m; b.y = hit.y + (b.y - hit.y) / d2 * m; }
        if (g.world.blocked(b.x, b.y, R0 * 0.9)) { b.x = ox; b.y = oy; D.left -= s; }
      }
    }
    if ((D.bounce === undefined && g.outOfArena(b, b.r)) || D.left <= 0) { const ch = D.chain || 0, fire = D.fire; b.dashing = null; b.busy = 0.6 * w; g.clampArena(b, b.r);
      if (ch > 0 || (fire && b.diveChain > 0)) { if (fire) b.diveChain--; const T = 0.42; const h2 = haz(g, b, { kind: 'line', fromBoss: true, len: 700, width: b.r * 1.9, t: T, dmg: 0, track: 'aim', lock: T * 0.45, visual: true }); at(b, T, () => { b.dashing = { a: h2.a, left: 700, speed: D.speed * 1.12, hit: false, chain: Math.max(0, ch - 1), fire }; }); b.busy = 99; } }
    return;
  }
  if (b.burrow) {
    const B = b.burrow; B.t += dt; b.alpha = 0; b.invuln = 0.1;
    const a = aimAt(b, p), sp2 = 420 * spd; b.x += Math.cos(a) * sp2 * dt; b.y += Math.sin(a) * sp2 * dt; g.clampArena(b, b.r);
    B.dust -= dt; if (B.dust <= 0) { B.dust = 0.35 + g.rand() * 0.3; g.emit('burrowDust', { x: b.x, y: b.y }); }
    if (B.t >= B.T) {
      const [tx, ty] = lead(g, 0.5, 0.8, 30); b.x = tx; b.y = ty; g.clampArena(b, b.r); b.burrow = null; b.emergeT = 0.45;
      const out = { kind: 'circle', r: 135, t: 0.45, dmg: 36, color: '#8ad84a', after() { if (g.surface) g.surface.apply(this.x, this.y, 110, 'POISON', { rand: g.rand, life: 14 }); } };
      haz(g, b, { ...out, x: b.x, y: b.y });
      if (b.phase > 0) for (let k = 0; k < 2; k++) { const q = g.rand() * TAU, d = 170 + g.rand() * 110; haz(g, b, { ...out, r: 110, x: p.x + Math.cos(q) * d, y: p.y + Math.sin(q) * d }); }
      b.busy = 0.45 + 1.0 * w; at(b, 0.45, () => g.emit('burrowOut', { x: b.x, y: b.y }));
    }
    return;
  }
  if (b.fly) {
    const F = b.fly; F.t += dt; const k = Math.min(1, F.t / F.T); b.z = Math.sin(Math.min(1, k) * Math.PI) * 260;
    if (k > 0.6 && k < 0.95) { const p2 = g.p; b.x += (p2.x - b.x) * Math.min(1, dt * 2.5); b.y += (p2.y - b.y) * Math.min(1, dt * 2.5); }
    for (const s of b.sched) { s.t -= dt; if (s.t <= 0) { s.done = true; s.fn(); } } b.sched = b.sched.filter(s => !s.done);
    if (k >= 1) { b.fly = null; b.z = 0; }
    b.busy -= dt; return;
  }
  // nhảy
  if (b.leap) {
    const L = b.leap; L.t += dt; const k = Math.min(1, L.t / L.T);
    b.z = Math.sin(Math.min(1, k * 1.05) * Math.PI) * 240; b.alpha = 1;
    b.x = L.ox + (L.h.x - L.ox) * k; b.y = L.oy + (L.h.y - L.oy) * k;
    if (k >= 1) { b.leap = null; b.z = 0; b.x = L.h.x; b.y = L.h.y; }
    b.busy -= dt; return;
  }
  // dịch chuyển
  if (b.tele) { b.tele.t += dt; b.alpha = Math.max(0, 1 - b.tele.t / b.tele.T); if (b.tele.t >= b.tele.T) { b.tele = null; b.alpha = 1; } }
  if (b.busy > 0) { b.busy -= dt; return; }
  // tiến lại + chọn đòn
  const d = dist(b.x, b.y, p.x, p.y), toP = aimAt(b, p); b.face = toP;
  const sp = b.def.speed * spd * (1 - (g.brutal ? 0 : b.slowAmt || 0) * 0.3);
  if (d > b.def.range) { b.x += Math.cos(toP) * sp * dt; b.y += Math.sin(toP) * sp * dt; }
  else if (b.def.range > 250 && d < 200) { b.x -= Math.cos(toP) * sp * dt; b.y -= Math.sin(toP) * sp * dt; }
  g.world.collide(b, b.r * 0.8);
  { const rp = g._real || p; if (dist(b.x, b.y, rp.x, rp.y) < b.r + rp.r + 4 && b.contactCd <= 0) { b.contactCd = 1; g.hurtPlayer(15 * b.def.dmg, aimAt(b, rp), { boss: true, real: true }); } }
  b.idle -= dt;
  if (b.idle <= 0) {
    const mv = chooseMove(g, b, P, d); b.last = mv; if (MOVE_CD[mv]) { b.cd = b.cd || {}; b.cd[mv] = g.t + MOVE_CD[mv]; }
    b.busy = MOVES[mv](g, b, w);
    b.idle = (0.35 + g.rand() * 0.5) * w * (hid ? 1.6 : 1) * (g.brutal ? 0.55 : 1);
    const L = (LINKS[b.type] || {})[mv];
    if (L && !hid && !b.linked && g.rand() < L[1] + (g.brutal ? 0.25 : 0)) { const nx = typeof L[0] === 'function' ? L[0](b) : L[0]; if (MOVES[nx]) { b.forceMove = nx; b.idle = 0.05; b.linked = true; g.emit('bossLink', { x: b.x, y: b.y }); } }
    else b.linked = false;
  }
}

// ---------- cập nhật hazard (dùng chung cho mọi boss) ----------
export function updateHazards(g, dt) {
  const p = g.p;
  for (const h of g.hazards) {
    if (h.kind === 'beam' || h.kind === 'vortex') { special(g, h, dt); continue; }
    if (h.kind === 'shadowblast') {
      if (!h.done) { h.t -= dt; if (h.t <= 0) { h.done = true; h.fade = 0.6; g.forTargets(p => { const safe = (h.pockets || []).some(q => dist(q.x, q.y, p.x, p.y) < q.r + p.r * 0.3); if (!safe && !g.labGod) { const iv = p.inv; p.inv = 0; g.hurtPlayer(h.dmg * (h.owner ? h.owner.def.dmg : 1), Math.atan2(p.y - h.y, p.x - h.x), { boss: true }); p.inv = Math.max(p.inv, iv); p.burnT = Math.max(p.burnT || 0, 3); } g.emit('lastFlame', { x: h.x, y: h.y, r: h.r, safe }); }); } }
      else h.fade -= dt;
      continue;
    }
    if (!h.done) {
      const b = h.owner;
      if (h.track && h.t > h.lock && b && !b.dead) {
        const tp = g.hidePt || p;
        if (h.track === 'player') { h.x = tp.x; h.y = tp.y; }
        else { const a = aimAt(b, tp); h.a = a; if (h.track === 'front') { const d = Math.min(dist(b.x, b.y, tp.x, tp.y), h.reach); h.x = b.x + Math.cos(a) * d; h.y = b.y + Math.sin(a) * d; } else { h.x = b.x; h.y = b.y; } }
      }
      if (h.fromBoss && b) { h.x = b.x; h.y = b.y; }
      if (h.x === undefined) { h.x = b ? b.x : p.x; h.y = b ? b.y : p.y; }
      h.t -= dt;
      if (h.t <= 0) {
        h.done = true; h.fade = 0.3;
        if (h.kind === 'ring') { h.active = true; h.hitP0 = h.hitP1 = false; }
        else if (!h.visual) {
          smash(g, h);
          g.forTargets(p => { if (hitsPlayer(h, p)) { g.hurtPlayer(h.dmg * (b && b.def ? b.def.dmg : 1), Math.atan2(p.y - h.y, p.x - h.x), { boss: true }); if (h.stunP) p.frozen = Math.max(p.frozen || 0, h.stunP); if (h.rootP) { p.rooted = Math.max(p.rooted || 0, h.rootP); g.emit('rooted', { x: p.x, y: p.y }); } if (h.push) { const pa = Math.atan2(p.y - h.y, p.x - h.x); p.vx += Math.cos(pa) * h.push; p.vy += Math.sin(pa) * h.push; } } });
          g.emit('bossHit', { x: h.x, y: h.y, kind: h.kind, r: h.r || 60, color: h.color, boss: b && b.type });
          if (h.shock) g.hazards.push({ kind: 'ring', x: h.x, y: h.y, rr: h.r * 0.4, speed: 300, max: Math.min(320, h.shock.max), thick: h.shock.thick, dmg: h.shock.dmg, owner: b, color: h.color, t: 0.35, T: 0.35, hold: 0, pre: true, shockPre: true });
          if (h.after) h.after();
        }
      }
    } else if (h.active) {
      h.rr += h.speed * dt;
      g.forTargets(p => { const hk = 'hitP' + (p.pi || 0);
      if (!h[hk] && Math.abs(dist(h.x, h.y, p.x, p.y) - h.rr) < h.thick / 2 + p.r && p.inv <= 0 && !p.leap) {
        h[hk] = true; const a = Math.atan2(p.y - h.y, p.x - h.x);
        g.hurtPlayer(h.dmg * (h.owner && h.owner.def ? h.owner.def.dmg : 1), a, { boss: true });
        if (h.push) { p.vx += Math.cos(a) * h.push; p.vy += Math.sin(a) * h.push; }
      } });
      if (h.rr >= h.max) h.active = false;
    } else h.fade -= dt;
  }
  g.hazards = g.hazards.filter(h => !h.dead && (!h.done || h.active || h.fade > 0 || h.kind === 'beam' || h.kind === 'vortex'));
}
export const beamAngle = (h, k) => h.twin ? h.a + (k - (h.n - 1) / 2) * h.twin : h.a + k * TAU / h.n;
function special(g, h, dt) {
  const p = g.p, b = h.owner;
  if (h.kind === 'beam') {
    if (b && !b.dead) { h.x = b.x; h.y = b.y; } else { h.dead = true; return; }
    if (h.t > 0) { h.t -= dt; return; }
    h.active = true; h.dur -= dt; h.a += h.spin * dt; h.hitCd -= dt; for (const k of ['hitCd0', 'hitCd1']) if (h[k] !== undefined) h[k] -= dt;
    for (let k = 0; k < h.n; k++) {
      const a = beamAngle(h, k), ca = Math.cos(a), sa = Math.sin(a), rx = p.x - h.x, ry = p.y - h.y, along = rx * ca + ry * sa, side = -rx * sa + ry * ca;
      g.forTargets(p => { const rx = p.x - h.x, ry = p.y - h.y, along = rx * ca + ry * sa, side = -rx * sa + ry * ca, ck = 'hitCd' + (p.pi || 0); if (h[ck] === undefined) h[ck] = h.hitCd;
        if (h[ck] <= 0 && along > b.r * 0.5 && along < h.len && Math.abs(side) < h.width / 2 + p.r * 0.5 && p.inv <= 0 && !p.leap) { h[ck] = 0.55; g.hurtPlayer(h.dmg * (b.def ? b.def.dmg : 1), a + Math.PI / 2, { boss: true }); if (h.onHitP) h.onHitP(); } });
      if (h.trail && g.surface && g.rand() < dt * 6) { const d = b.r + g.rand() * (h.len - b.r); g.surface.apply(h.x + ca * d, h.y + sa * d, 28, h.trail, { rand: g.rand, life: 4 }); }
    }
    if (h.dur <= 0) h.dead = true;
  } else {
    if (h.t > 0) { h.t -= dt; return; }
    h.active = true; h.dur -= dt; h.hitCd -= dt;
    const pull = (e, m) => { const d = dist(e.x, e.y, h.x, h.y); if (d < h.r && d > 4) { const k = h.force * m * (1 - d / h.r * 0.4) * dt; e.x += (h.x - e.x) / d * k; e.y += (h.y - e.y) / d * k; } return d; };
    for (const e of g.enemies) if (!e.boss && !e.dead) pull(e, 0.8);
    let hitAny = false; g.forTargets(p => { const d = pull(p, p.dashT > 0 ? 0.4 : 1); if (d < 46 && h.hitCd <= 0) { hitAny = true; g.hurtPlayer(h.dmg * (b ? b.def.dmg : 1), 0, { boss: true }); } }); if (hitAny) h.hitCd = 0.5;
    if (h.dur <= 0) h.dead = true;
  }
}
function smash(g, h) {
  const W = g.world;
  if (h.kind === 'circle') W.damageObstacles(h.x, h.y, h.r * 0.8, 200);
  else if (h.kind === 'arc') W.damageObstacles(h.x + Math.cos(h.a) * h.r * 0.55, h.y + Math.sin(h.a) * h.r * 0.55, h.r * 0.45, 200);
  else if (h.kind === 'rect') { const ca = Math.cos(h.a), sa = Math.sin(h.a); for (let u = -h.len / 2; u <= h.len / 2; u += 50) W.damageObstacles(h.x + ca * u, h.y + sa * u, h.width / 2, 200); }
}
function hitsPlayer(h, p) {
  if (p.inv > 0 || p.leap) return false;
  const d = dist(h.x, h.y, p.x, p.y);
  if (h.kind === 'circle') return d < h.r + p.r * 0.6 && !(h.hole && d < h.hole - p.r * 0.3);
  if (h.kind === 'arc') return d < h.r + p.r && Math.abs(angDiff(Math.atan2(p.y - h.y, p.x - h.x), h.a)) < h.arc / 2;
  if (h.kind === 'rect' || h.kind === 'line') {
    const ca = Math.cos(h.a), sa = Math.sin(h.a), rx = p.x - h.x, ry = p.y - h.y, along = rx * ca + ry * sa, side = -rx * sa + ry * ca;
    const half = h.kind === 'line' ? null : h.len / 2;
    return (half === null ? (along > 0 && along < h.len) : Math.abs(along) < half) && Math.abs(side) < h.width / 2 + p.r * 0.6;
  }
  return false;
}
