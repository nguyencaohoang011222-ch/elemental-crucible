// Quét cả lượt chơi bằng bot: tướng × nguyên tố đầu × độ khó × mức bot × seed cố định, chạy song song (worker_threads).
// CLI: node tools/tune/sweep.mjs [seeds=3] [KNIGHT ...] [--normal|--brutal] [--json]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from './bot.mjs';
import { BOSS_STAGES } from '../../game.js';

export const ALL = { classes: ['KNIGHT', 'RANGER', 'MAGE', 'AXIOM'], elements: ['FIRE', 'WATER', 'EARTH', 'WIND'], diffs: ['NORMAL', 'HARD'], levels: ['novice', 'good'] };

if (!isMainThread && workerData && workerData.sweep) {
  const values = workerData.values || {};
  const value = (g, c) => values[g.coreSkill(c).key] || 0;
  parentPort.on('message', job => {
    if (!job) { process.exit(0); }
    const r = run(job.cls, job.el, job.seed, true, { difficulty: job.diff, level: job.level, value, immortal: job.immortal, maxStage: job.maxStage });
    parentPort.postMessage({ ...job, ...r });
  });
}

// opts: { classes, elements, diffs, levels, seeds (số seed), values (key chiêu → điểm, cho bot good), threads, immortal, maxStage }
export async function sweep(opts = {}) {
  const o = { ...ALL, seeds: 3, ...opts }, jobs = [];
  for (const cls of o.classes) for (const el of o.elements) for (const diff of o.diffs) for (const level of o.levels) for (let s = 1; s <= o.seeds; s++) jobs.push({ cls, el, diff, level, seed: 1000 + s * 7, immortal: !!o.immortal, maxStage: o.maxStage || 0 });
  const n = Math.max(1, Math.min(o.threads || cpus().length - 1, jobs.length)), results = [];
  await new Promise((resolve, reject) => {
    let next = 0, live = n;
    for (let i = 0; i < n; i++) {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { sweep: true, values: o.values || {} } });
      const feed = () => { if (next < jobs.length) w.postMessage(jobs[next++]); else { w.postMessage(null); } };
      w.on('message', r => { results.push(r); feed(); });
      w.on('error', reject);
      w.on('exit', () => { if (--live === 0) resolve(); });
      feed();
    }
  });
  // sắp lại theo thứ tự job để kết quả tất định
  const key = r => [r.cls, r.el, r.diff, r.level, String(r.seed).padStart(6, '0')].join('|');
  results.sort((a, b) => key(a) < key(b) ? -1 : 1);
  return { runs: results, groups: summarize(results) };
}

const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
// gom theo tướng × độ khó × mức bot
export function summarize(runs) {
  const by = {};
  for (const r of runs) (by[r.cls + '|' + r.diff + '|' + r.level] = by[r.cls + '|' + r.diff + '|' + r.level] || []).push(r);
  const out = {};
  for (const [k, rs] of Object.entries(by)) {
    const [cls, diff, level] = k.split('|'), boss = {};
    for (const r of rs) for (const s in r.bossTimes) (boss[s] = boss[s] || []).push(r.bossTimes[s]);
    const deaths = {}; for (const r of rs) if (!r.won) deaths[r.stage] = (deaths[r.stage] || 0) + 1;
    const tk = rs.reduce((a, r) => [a[0] + r.taken.mob, a[1] + r.taken.boss], [0, 0]);
    out[k] = { cls, diff, level, n: rs.length, stage: +mean(rs.map(r => r.stage)).toFixed(2), progress: +mean(rs.map(r => r.progress)).toFixed(2), win: +(rs.filter(r => r.won).length / rs.length).toFixed(2),
      bossAtDeath: rs.filter(r => !r.won && BOSS_STAGES[r.stage] !== undefined).length / rs.length,
      bossT: Object.fromEntries(Object.entries(boss).map(([s, v]) => [s, Math.round(mean(v))])), deaths, bossShare: +(tk[1] / Math.max(1, tk[0] + tk[1])).toFixed(2) };
  }
  return out;
}

if (isMainThread && process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/tune/sweep.mjs')) {
  const a = process.argv.slice(2), seeds = +(a.find(x => /^\d+$/.test(x)) || 3), cls = a.filter(x => ALL.classes.includes(x));
  const diffs = a.includes('--normal') ? ['NORMAL'] : a.includes('--brutal') ? ['HARD'] : ALL.diffs;
  const { bench } = await import('./bench.mjs'); const values = Object.fromEntries(bench().map(r => [r.key, r.value]));
  const t0 = Date.now(), r = await sweep({ seeds, diffs, values, ...(cls.length ? { classes: cls } : {}) });
  if (a.includes('--json')) console.log(JSON.stringify(r.groups, null, 1));
  else {
    console.log('Hero'.padEnd(7), 'Diff'.padEnd(7), 'Bot'.padEnd(7), 'stage'.padStart(6), 'win'.padStart(5), ' boss time (s)            deaths by stage');
    for (const g of Object.values(r.groups)) console.log(g.cls.padEnd(7), (g.diff === 'HARD' ? 'BRUTAL' : g.diff).padEnd(7), g.level.padEnd(7), g.stage.toFixed(1).padStart(6), g.win.toFixed(2).padStart(5), ' ' + Object.entries(g.bossT).map(([s, v]) => 'S' + s + ':' + v).join(' ').padEnd(24), Object.entries(g.deaths).map(([s, v]) => 'S' + s + 'x' + v).join(' '));
    console.log((r.runs.length) + ' runs in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
