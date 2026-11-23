// A0: kiểm tra từng lớp sống được bao lâu khi chơi "đứng yên đánh" vs "vừa né vừa đánh".
import { Sim } from '../sim.js';

function intent(s, style) {
  const p = s.p; let tgt = null, bd = 1e9;
  for (const e of s.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; tgt = e; } }
  const it = {};
  if (!tgt) return it;
  it.ax = tgt.x; it.ay = tgt.y;
  const range = p.cls === 'KNIGHT' ? 70 : 260;
  const dx = tgt.x - p.x, dy = tgt.y - p.y;
  if (style === 'stand') { it.fire = bd < range + 30; it.fireHeld = false; return it; }
  // kite: giữ khoảng cách, né đạn và cú lao
  let mx = 0, my = 0;
  if (bd > range) { mx = dx; my = dy; } else if (bd < range * 0.7) { mx = -dx; my = -dy; } else { mx = -dy; my = dx; }
  for (const e of s.enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 90) { mx -= (e.x - p.x) / d * 60; my -= (e.y - p.y) / d * 60; } }
  for (const f of s.foes) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < 90) { mx += -f.vy; my += f.vx; } }
  it.mx = mx; it.my = my;
  it.dash = s.enemies.some(e => e.state === 'charge' && Math.hypot(e.x - p.x, e.y - p.y) < 140) || s.foes.some(f => Math.hypot(f.x - p.x, f.y - p.y) < 40);
  it.fire = bd < range + 40;
  if (p.cls === 'RANGER') { it.fireHeld = false; }
  return it;
}

function run(cls, style, seed) {
  const s = new Sim(seed, cls); const dt = 1 / 60;
  while (!s.over && s.t < 300) { s.step(dt, intent(s, style)); s.events.length = 0; }
  return { t: s.t, kills: s.kills };
}
const N = 20;
console.log('Lớp'.padEnd(8), 'Lối chơi'.padEnd(10), 'sống TB (s)'.padEnd(12), 'kill TB');
for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) for (const style of ['stand', 'kite']) {
  let t = 0, k = 0; for (let i = 1; i <= N; i++) { const r = run(cls, style, i); t += r.t; k += r.kills; }
  console.log(cls.padEnd(8), style.padEnd(10), (t / N).toFixed(0).padEnd(12), (k / N).toFixed(0));
}
