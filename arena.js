// Đấu trường boss: dựng tại chỗ người chơi đang đứng (không dịch chuyển).
// Vành đá + bố cục khối cứng riêng cho từng boss trồi lên từ mặt đất, kèm vài thùng mana (không mọc lại).
// Khối cứng (o.solid) không bị phá; boss lao vào sẽ bị choáng.
import { dist } from './sim.js';

const TAU = Math.PI * 2;
export const ARENA_R = 620;       // bán kính kẹp người chơi/boss
const RIM_R = ARENA_R + 24;      // vành đá nằm ngay ngoài

function piece(g, A, type, x, y, r, delay, o = {}) {
  const p = g.p;
  if (dist(x, y, p.x, p.y) < r + p.r + 40) return null;                    // không bao giờ đè người chơi
  if (A.gate && !o.deco && dist(x, y, A.gate.x, A.gate.y) < (dist(x, y, A.x, A.y) > 500 ? 118 : 70) + r) return null;      // chừa khe cho cổng ở đầu bắc
  const ob = g.world.addTemp(type, x, y, r, Infinity, o.hp ?? 9999);
  ob.v = o.v ?? g.rand(); ob.rise = o.rise ?? 0.45; ob.riseDelay = delay; ob.age = 0; ob.arena = true;
  if (!o.breakable) ob.solid = true;
  if (o.supply) ob.supply = true;
  if (o.glow) ob.glowC = o.glow;
  A.pieces.push(ob); return ob;
}
// tảng đá thật đặt quanh cổng (offset so với ngưỡng cửa): [loại, dx, dy, r]
export const GATE_ROCKS = {
  dungeon: [['rimrock', -84, -48, 18], ['rimrock', -76, 6, 14], ['rimrock', 92, -52, 15], ['rimrock', 96, 4, 13]],
  frost: [['rimrock', -80, -62, 16], ['rimrock', 84, -58, 14]],
  volcano: [['arenarock', -92, -36, 20], ['arenarock', 96, -24, 18], ['arenarock', -66, 22, 13]],
  palace: []
};
const P = (A, a, d) => [A.x + Math.cos(a) * d, A.y + Math.sin(a) * d];
const crate = (g, A, a, d, delay) => { const [x, y] = P(A, a, d); return piece(g, A, 'crate', x, y, 14, delay, { breakable: true, supply: true, hp: 35, v: 0.3, rise: 0.3 }); };
const cells = (g, A, x, y, r, type) => { if (!g.surface) return; const S = 24; for (let j = -r; j <= r; j += S) for (let i = -r; i <= r; i += S) if (i * i + j * j <= r * r) g.surface.setAt(x + i, y + j, type, 99999); };

// bố cục riêng: (g, A, rot) — delay tăng dần từ tâm ra ngoài
const LAYOUT = {
  // Furnace Ring: 4 khối basalt lớn ở 4 góc chéo để nấp, sàn đá vụn vòng trong, thùng nấp sau khối
  COLOSSUS(g, A, rot) {
    for (let k = 0; k < 4; k++) {
      const a = rot + Math.PI / 4 + k * Math.PI / 2, [x, y] = P(A, a, 330), nx = -Math.sin(a), ny = Math.cos(a);
      piece(g, A, 'arenarock', x, y, 34, 0.25 + k * 0.08);
      piece(g, A, 'arenarock', x + nx * 40 + Math.cos(a) * 14, y + ny * 40 + Math.sin(a) * 14, 24, 0.32 + k * 0.08);
      piece(g, A, 'arenarock', x - nx * 38 + Math.cos(a) * 10, y - ny * 38 + Math.sin(a) * 10, 22, 0.36 + k * 0.08);
      crate(g, A, a, 430, 0.6 + k * 0.05);
    }
    for (let k = 0; k < 10; k++) { const [x, y] = P(A, rot + k * 0.628, 190); cells(g, A, x, y, 40, 'rubble'); }
  },
  // Frozen Court: hồ băng trơn ở giữa, 6 trụ băng nhọn xếp lục giác chặn mưa giáo băng
  WARDEN(g, A, rot) {
    cells(g, A, A.x, A.y, 230, 'ice');
    for (let k = 0; k < 6; k++) { const [x, y] = P(A, rot + k * TAU / 6, 300); piece(g, A, 'spire', x, y, 22, 0.2 + k * 0.07); }
    for (let k = 0; k < 4; k++) crate(g, A, rot + TAU / 12 + k * Math.PI / 2, 470, 0.55 + k * 0.05);
  },
  // Overgrown Hollow: 5 cột đá đặt lệch để dụ cú húc rampage, cụm nấm cứng sát mép
  BEHEMOTH(g, A, rot) {
    for (let k = 0; k < 5; k++) { const a = rot + k * TAU / 5 + (g.rand() - 0.5) * 0.5, d = 220 + g.rand() * 160, [x, y] = P(A, a, d); piece(g, A, 'menhir', x, y, 26, 0.2 + k * 0.08); }
    for (let k = 0; k < 6; k++) { const a = rot + 0.3 + k * TAU / 6, [x, y] = P(A, a, 545); piece(g, A, 'tree', x, y, 18, 0.5 + k * 0.05); }
    for (let k = 0; k < 5; k++) crate(g, A, rot + TAU / 10 + k * TAU / 5, 470, 0.6 + k * 0.05);
  },
  // Star Sanctum: 8 cột phù văn bát giác + 4 bệ thấp chia lối chữ thập
  SOVEREIGN(g, A, rot) {
    for (let k = 0; k < 8; k++) { const [x, y] = P(A, rot + k * TAU / 8, 380); piece(g, A, 'obelisk', x, y, 20, 0.3 + k * 0.05, { glow: '#c9a8ff' }); }
    for (let k = 0; k < 4; k++) { const [x, y] = P(A, rot + Math.PI / 4 + k * Math.PI / 2, 175); piece(g, A, 'arenarock', x, y, 24, 0.15 + k * 0.05); }
    for (let k = 0; k < 4; k++) crate(g, A, rot + Math.PI / 8 + k * Math.PI / 2, 500, 0.6 + k * 0.05);
  },
  // Caldera: 3 mỏm đá lưỡi liềm để nấp luồng lửa và chặn cú lao, vũng dung nham sát mép
  DRAGON(g, A, rot) {
    for (let k = 0; k < 3; k++) {
      const c = rot + k * TAU / 3;
      for (let i = 0; i < 5; i++) { const a = c + (i - 2) * 0.14, d = 300 + Math.abs(i - 2) * -14, [x, y] = P(A, a, d); piece(g, A, 'arenarock', x, y, i === 2 ? 30 : 24, 0.25 + k * 0.1 + Math.abs(i - 2) * 0.05); }
      crate(g, A, c + Math.PI / 3, 420, 0.65 + k * 0.05);
      const [lx, ly] = P(A, c + Math.PI / 3, 560); cells(g, A, lx, ly, 36, 'lava');
    }
    for (let k = 0; k < 2; k++) crate(g, A, rot + Math.PI / 6 + k * Math.PI, 250, 0.7);
  }
};

export function buildArena(g, bossType, gate = null) {
  teardownArena(g, true);
  const p = g.p, A = { x: p.x, y: p.y, r: ARENA_R, rim: RIM_R, pieces: [], type: bossType, gate };
  g.arena = A;
  const gone = g.world.clearArea(A.x, A.y, RIM_R + 40);
  if (g.surface) for (const [k, c] of g.surface.cells) { const cx = (c.i + 0.5) * 24, cy = (c.j + 0.5) * 24; if (dist(cx, cy, A.x, A.y) < RIM_R) g.surface.cells.delete(k); }
  const rot = g.rand() * TAU, a0 = g.rand() * TAU, n = Math.ceil(TAU * RIM_R / 44);
  for (let i = 0; i < n; i++) { const q = i / n * TAU, [x, y] = P(A, q, RIM_R + (i % 2 ? 6 : 0)), da = Math.abs(Math.atan2(Math.sin(q - a0), Math.cos(q - a0))); piece(g, A, 'rimrock', x, y, 26 + (i % 3) * 2, 0.15 + da / Math.PI * 0.9, { rise: 0.35 }); }
  (LAYOUT[bossType] || LAYOUT.COLOSSUS)(g, A, rot);
  if (gate) (GATE_ROCKS[gate.theme] || []).forEach(([t, dx, dy, r], i) => piece(g, A, t, gate.x + dx, gate.y + dy, r, 0.3 + i * 0.05, { deco: true }));
  g.emit('arenaRise', { x: A.x, y: A.y, r: RIM_R, gone: gone.slice(0, 60) });
  return A;
}
// gỡ đấu trường: lún xuống trong ~0.8s (instant = xoá ngay); thùng còn lại được giữ
export function teardownArena(g, instant) {
  for (const o of g.world.temp) if (o.arena && (instant || !o.supply)) { if (instant) o.dead = true; else if (!(o.sink > 0)) { o.sink = 0.8; o.sinkT = 0.8; } }
  if (instant) g.world.temp = g.world.temp.filter(o => !o.dead);
  if (g.surface && g.arena) for (const [k, c] of g.surface.cells) if (c.t > 9000) c.t = 3;   // sàn băng/đá vụn/dung nham của đấu trường tan dần
  g.arena = null;
}
