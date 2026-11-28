// Chấm cân bằng: bench từng chiêu + bot sống chết + bot bất tử (đo sức đánh boss), so với tuning/targets.json.
// In bảng đạt/lệch và MỘT điểm tổng (0 = đạt hết; càng thấp càng tốt). Ghi tuning/report.json.
// CLI: node tools/tune/check.mjs [skills|bosses|run|all] [KNIGHT|RANGER|MAGE|AXIOM] [--seeds N] [--json]
//   skills: chỉ bench chiêu (~1 s) · bosses: + thời gian hạ boss · run/all (mặc định): + bot Normal/Brutal, novice/good (~1-2 phút)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bench, CLASSES } from './bench.mjs';
import { sweep } from './sweep.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
// điểm lệch của một số so với khoảng [lo, hi]: 0 trong khoảng, ngoài thì khoảng cách tương đối tới mép gần nhất
const off = (x, lo, hi) => x < lo ? (lo - x) / Math.max(1e-9, Math.abs(lo)) : x > hi ? (x - hi) / Math.max(1e-9, Math.abs(hi)) : 0;

export async function check({ area = 'all', only = null, seeds = 3 } = {}) {
  const T = JSON.parse(readFileSync(join(ROOT, 'tuning', 'targets.json'), 'utf8'));
  const items = [], add = (group, name, value, band, w, extra) => { const d = off(value, band[0], band[1]); items.push({ group, name, value: +(+value).toFixed(2), band, score: +(w * d).toFixed(3), ok: d === 0, ...extra }); };
  const classes = only ? [only] : CLASSES;

  // 1. từng chiêu
  const rows = bench(only); const unmeasured = [];
  for (const r of rows) { if (!r.offense) continue; if (!(r.value > 0)) { unmeasured.push(r.cls + ' ' + r.name); continue; } add('skill', r.cls + ' T' + r.tier + ' ' + r.name, r.ratio, T.skills.ratio, T.skills.weight, { cost: r.cost, raw: r.value, median: r.median }); }

  // 2. thời gian hạ boss với bot bất tử
  let bossRuns = null;
  if (area !== 'skills') {
    bossRuns = await sweep({ classes, diffs: ['NORMAL'], levels: ['good'], seeds: 1, immortal: true, maxStage: 10 });
    const per = {};
    for (const r of bossRuns.runs) for (const s of ['5', '10']) if (r.bossTimes[s] !== undefined) ((per[r.cls] = per[r.cls] || {})[s] = per[r.cls]?.[s] || []).push(r.bossTimes[s]);
    const tot = [];
    for (const cls of classes) { let sum = 0; for (const s of ['5', '10']) { const v = per[cls]?.[s]; const m = v && v.length ? mean(v) : 999; sum += m; add('bossTime', cls + ' boss S' + s + ' (s)', m, T.bossTime[s], T.bossTime.weight); } tot.push(sum); }
    if (classes.length > 1) add('bossTime', 'hero spread (slowest/fastest)', Math.max(...tot) / Math.min(...tot), [1, T.bossTimeSpread.max], T.bossTimeSpread.weight);
  }

  // 3. bot sống chết: Normal/Brutal × novice/good
  let runRes = null;
  if (area === 'all' || area === 'run') {
    runRes = await sweep({ classes, seeds, levels: T.skillGap.weight ? ['novice', 'good'] : ['good'] });
    const G = runRes.groups, pg = (cls, diff, level) => G[cls + '|' + diff + '|' + level]?.progress || 0;
    const ng = classes.map(c => pg(c, 'NORMAL', 'good'));
    for (const [i, c] of classes.entries()) add('progress', c + ' Normal good bot progress', ng[i], T.progress.normalGood, T.progress.weight);
    if (classes.length > 1) add('progress', 'hero spread (best/worst)', Math.max(...ng) / Math.max(0.1, Math.min(...ng)), [1, T.progressSpread.max], T.progressSpread.weight);
    add('brutal', 'Brutal / Normal progress (good bot)', mean(classes.map(c => pg(c, 'HARD', 'good'))) / Math.max(0.1, mean(ng)), T.brutal.ratio, T.brutal.weight);
    if (T.skillGap.weight) add('skillGap', 'good / novice progress (Normal)', mean(ng) / Math.max(0.1, mean(classes.map(c => pg(c, 'NORMAL', 'novice')))), [T.skillGap.min, 99], T.skillGap.weight);
  }

  const score = +items.reduce((s, i) => s + i.score, 0).toFixed(3);
  const report = { at: new Date().toISOString(), area, only, seeds, score, offTarget: items.filter(i => !i.ok).length, total: items.length, unmeasured, items, groups: runRes?.groups || null, bossRuns: bossRuns ? bossRuns.groups : null, skills: rows };
  return report;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/tune/check.mjs')) {
  const a = process.argv.slice(2), area = a.find(x => ['skills', 'bosses', 'run', 'all'].includes(x)) || 'all', only = a.find(x => CLASSES.includes(x)) || null;
  const si = a.indexOf('--seeds'), seeds = si >= 0 ? +a[si + 1] : 3, t0 = Date.now();
  const r = await check({ area, only, seeds });
  writeFileSync(join(ROOT, 'tuning', 'report.json'), JSON.stringify(r, null, 1));
  if (a.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    const bad = r.items.filter(i => !i.ok).sort((x, y) => y.score - x.score);
    for (const grp of ['bossTime', 'progress', 'brutal', 'skillGap']) for (const i of r.items.filter(i => i.group === grp)) console.log((i.ok ? ' ok ' : 'OFF ') + i.name.padEnd(40), String(i.value).padStart(7), ' target ' + i.band.join('–'), i.ok ? '' : ' +' + i.score);
    const sk = r.items.filter(i => i.group === 'skill'); console.log(' ' + sk.filter(i => i.ok).length + '/' + sk.length + ' attack skills within ' + JSON.stringify(sk[0]?.band) + ' x median');
    for (const i of sk.filter(i => !i.ok).sort((x, y) => y.score - x.score)) console.log('OFF ' + i.name.padEnd(40), String(i.value).padStart(7), ' (value ' + i.raw + ', median ' + i.median + ', cost ' + i.cost + ')  +' + i.score);
    if (r.unmeasured.length) console.log(' not measurable in the bench (traps / need moving enemies): ' + r.unmeasured.join(', '));
    console.log('\nSCORE ' + r.score + '  (' + r.offTarget + '/' + r.total + ' off target)' + (bad[0] ? '  worst: ' + bad[0].name : '') + '  [' + ((Date.now() - t0) / 1000).toFixed(1) + 's]');
  }
}
