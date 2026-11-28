// Đo hiệu năng mô phỏng (không vẽ): mỗi map một stage đông quái, bot đánh 25 giây game, in ms trung bình / p95 mỗi bước 1/60 s.
// Dùng để so trước / sau khi tối ưu. CLI: node tools/perf.mjs [giây=25]
import { Game } from '../game.js';
import { bot } from './tune/bot.mjs';

const SECS = +(process.argv[2] || 25), STAGES = [4, 9, 14, 19, 24];   // forest, dungeon, frost, volcano, palace (stage thường, không phải boss)
const rows = [];
for (const st of STAGES) {
  const g = new Game(4242, 'MAGE', { element: 'FIRE' }); g.stage = st - 1; g.enemies = []; g.spawnQ = []; g.startStage(st);
  const cfg = { level: 'good', seed: 1, strategy: 'merge' }, times = []; let maxE = 0;
  for (let i = 0; i < SECS * 60; i++) {
    g.p.hp = g.p.max; g.p.energy = g.p.energyMax;
    const it = bot(g, true, cfg), t0 = process.hrtime.bigint(); g.step(1 / 60, it); times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    g.events.length = 0; maxE = Math.max(maxE, g.enemies.length + g.foes.length);
    if (g.state === 'reward') { g.state = 'fight'; g.rewards = []; }
  }
  times.sort((a, b) => a - b);
  rows.push({ stage: st, theme: g.theme, avg: times.reduce((a, b) => a + b, 0) / times.length, p95: times[Math.floor(times.length * 0.95)], max: times[times.length - 1], maxE });
}
console.log('stage theme     avg ms  p95 ms  max ms  peak enemies+bullets');
for (const r of rows) console.log(String(r.stage).padEnd(5), r.theme.padEnd(9), r.avg.toFixed(3).padStart(6), r.p95.toFixed(3).padStart(7), r.max.toFixed(2).padStart(7), '  ' + r.maxE);
console.log('mean avg ' + (rows.reduce((a, r) => a + r.avg, 0) / rows.length).toFixed(3) + ' ms/step (budget: 16.7 ms per frame for sim + draw)');
