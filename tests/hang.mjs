// Tái hiện kịch bản bị treo: Kiếm sĩ chỉ có Đất + tuyệt kỹ EEE, đánh boss stage 5, ép sang pha 2. Kiểm tra số không hữu hạn.
import { Game } from '../game.js';
const bad = v => !Number.isFinite(v);
for (let seed = 1; seed <= 30; seed++) {
  const g = new Game(seed, 'KNIGHT', { element: 'EARTH' });
  g.p.cores[1] = { type: 'tri', els: ['EARTH', 'FIRE', 'WIND'] }; g.p.cores[2] = { type: 'inf', els: ['WATER', 'WIND'], add: 'EARTH' }; g.startStage(5);
  let i = 0, err = null;
  try {
    for (; i < 60 * 40 && g.boss && !g.boss.dead; i++) {
      g.p.hp = g.p.max;
      const b = g.boss, it = { ax: b.x, ay: b.y, cx: b.x, cy: b.y, fire: true, fireHeld: i % 90 < 50 };
      if (i % 20 === 0) it.slots = [2, 2];
      if (i % 300 === 0) it.slots = [1];
      if (i === 900) b.hp = b.max * 0.5;
      g.step(1 / 60, it); g.events.length = 0;
      const vals = { px: g.p.x, py: g.p.y, pvx: g.p.vx, bx: b.x, by: b.y, bkx: b.kx };
      for (const s of g.shots) { vals['s' + s.kind] = s.x; }
      for (const h of g.hazards) { vals['h' + h.kind] = h.x; if (h.kind === 'ring' && h.active) vals.rr = h.rr; }
      for (const e of g.enemies) vals['e' + e.type] = e.x;
      const k = Object.entries(vals).find(([, v]) => bad(v));
      if (k) { err = `non-finite ${k[0]}=${k[1]} at frame ${i}, boss.last=${b.last}`; break; }
    }
  } catch (e) { err = 'EXC ' + e.stack.split('\n').slice(0, 3).join(' | '); }
  if (err) { console.log('seed', seed, err); }
}
console.log('done');
