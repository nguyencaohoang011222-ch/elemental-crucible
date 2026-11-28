// Bot chơi trọn một lượt: né + dùng mọi chiêu đang có + chọn nâng cấp. Bắt lỗi và đo độ khó. (bot dùng chung ở tools/tune/bot.mjs)
import { BOSS_STAGES } from '../game.js';
import { run as runBot } from '../tools/tune/bot.mjs';
const SHOP = !process.argv.includes('--noshop');
const run = (cls, el, seed, skill = true) => runBot(cls, el, seed, skill, { shop: SHOP });
const N = +(process.argv.find(a => /^\d+$/.test(a)) || 6);
console.log('Lớp'.padEnd(8), 'Bắt đầu'.padEnd(8), 'stage TB'.padEnd(9), 'thắng'.padEnd(6), 'chết ở boss', '  thời gian hạ boss (s)');
for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) for (const el of ['FIRE', 'WATER']) {
  let st = 0, w = 0, atBoss = 0; const bt = {};
  const hps = []; for (let s = 1; s <= N; s++) { const r = run(cls, el, s); if (r.bossHp !== null && !r.won) hps.push(r.bossHp + '%@S' + r.stage); st += r.stage; if (r.won) w++; if (BOSS_STAGES[r.stage] !== undefined && !r.won) atBoss++; for (const k in r.bossTimes) (bt[k] = bt[k] || []).push(r.bossTimes[k]); }
  console.log(cls.padEnd(8), el.padEnd(8), (st / N).toFixed(1).padEnd(9), `${w}/${N}`.padEnd(6), `${atBoss}/${N}`.padEnd(12), Object.entries(bt).map(([k, v]) => 'S' + k + ':' + Math.round(v.reduce((a, b) => a + b, 0) / v.length)).join(' '), '  boss còn:', hps.join(','));
}
