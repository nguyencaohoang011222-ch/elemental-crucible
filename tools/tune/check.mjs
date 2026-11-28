// Chấm cân bằng: bench giao tranh từng chiêu + thử boss theo chiến thuật + bot sống chết + bot bất tử, so với tuning/targets.json.
// In bảng đạt/lệch và MỘT điểm tổng (0 = đạt hết; càng thấp càng tốt). Ghi tuning/report.json.
// CLI: node tools/tune/check.mjs [skills|bosses|run|all] [KNIGHT|RANGER|MAGE|AXIOM] [--seeds N] [--json]
//   skills: chỉ bench giao tranh (~2 s) · bosses: + thời gian hạ boss + thử boss (~1,5 phút) · run/all (mặc định): + bot Normal/Brutal (~3 phút)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bench, CLASSES } from './bench.mjs';
import { sweep } from './sweep.mjs';
import { fightBench, tierMedians } from './fightbench.mjs';
import { bossTrials, summarizeTrials } from './bosstrial.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
// điểm lệch của một số so với khoảng [lo, hi]: 0 trong khoảng, ngoài thì khoảng cách tương đối tới mép gần nhất
const off = (x, lo, hi) => x < lo ? (lo - x) / Math.max(1e-9, Math.abs(lo)) : x > hi ? (x - hi) / Math.max(1e-9, Math.abs(hi)) : 0;

export async function check({ area = 'all', only = null, seeds = 3 } = {}) {
  const T = JSON.parse(readFileSync(join(ROOT, 'tuning', 'targets.json'), 'utf8'));
  const items = [], add = (group, name, value, band, w, extra) => { const d = off(value, band[0], band[1]); items.push({ group, name, value: +(+value).toFixed(2), band, score: +(w * d).toFixed(3), ok: d === 0, ...extra }); };
  const classes = only ? [only] : (T.heroes || CLASSES);   // targets.heroes: các tướng được cân bằng

  // 1. từng chiêu: bench giao tranh (AI quái hoạt động; tính sát thương + máu đỡ được + giây khống chế) chia theo mana
  const rows = fightBench(classes.filter(c => c !== 'AXIOM')); const unmeasured = [];
  for (const r of rows) { if (!(r.value > 0)) { unmeasured.push(r.cls + ' ' + r.name); continue; } add('skill', r.cls + ' T' + r.tier + ' ' + r.name, r.ratio, T.fight.ratio, T.fight.weight, { cost: r.cost, raw: r.perEnergy, median: r.median }); }
  const tm = tierMedians(rows.filter(r => r.value > 0));
  add('merge', 'duo / single value per energy', tm[1] / Math.max(0.01, tm[0]), [T.merge.duoOverSingle, 99], T.merge.weight);
  add('merge', 'ultimate / duo value per energy', tm[2] / Math.max(0.01, tm[1]), [T.merge.triOverDuo, 99], T.merge.weight);
  if (T.skills.weight) { for (const r of bench(classes)) if (r.offense && r.value > 0) add('skill', r.cls + ' T' + r.tier + ' ' + r.name + ' (static)', r.ratio, T.skills.ratio, T.skills.weight); }

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

  // 2b. thử boss theo chiến thuật (bất tử: đo sức tấn công): boss 3–5 phải sống đủ lâu, không bị khoá choáng, không chiến thuật nào áp đảo
  let trials = null;
  if (area !== 'skills') {
    const rowsT = await bossTrials({ heroes: classes.filter(c => c !== 'AXIOM') }); trials = summarizeTrials(rowsT);
    for (const st of T.bossFloor.stages) { const v = rowsT.filter(r => r.stage === st && r.ttk !== null).map(r => r.ttk); add('bossFloor', 'boss S' + st + ' fastest kill, any strategy (s)', v.length ? Math.min(...v) : 999, [T.bossFloor.min, 9999], T.bossFloor.weight); }
    for (const st of [...new Set(rowsT.map(r => r.stage))]) { const v = rowsT.filter(r => r.stage === st); add('stagger', 'boss S' + st + ' time staggered', mean(v.map(r => r.stagger)), [0, T.stagger.max], T.stagger.weight); }
    const byS = s => trials.filter(t => t.strategy === s && t.ttk !== null); const ms = mean(byS('merge').map(t => t.ttk)), ss = mean(byS('spam').map(t => t.ttk));
    if (ms && ss) add('strategy', 'spam / merge boss kill time', ss / ms, T.strategy.spamOverMerge, T.strategy.weight);
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
    if (T.elite) { const gs = classes.map(c => G[c + '|NORMAL|good']).filter(Boolean), tt = gs.filter(x => x.eliteTTK !== null); if (tt.length) add('elite', 'elite time to kill, good bot Normal (s)', mean(tt.map(x => x.eliteTTK)), T.elite.ttk, T.elite.weight); add('elite', 'share of non-boss damage taken near elites', mean(gs.map(x => x.eliteShare)), T.elite.share, T.elite.weight); }
    if (T.skillGap.weight) add('skillGap', 'good / novice progress (Normal)', mean(ng) / Math.max(0.1, mean(classes.map(c => pg(c, 'NORMAL', 'novice')))), [T.skillGap.min, 99], T.skillGap.weight);
  }

  const score = +items.reduce((s, i) => s + i.score, 0).toFixed(3);
  const report = { at: new Date().toISOString(), area, only, seeds, score, offTarget: items.filter(i => !i.ok).length, total: items.length, unmeasured, items, groups: runRes?.groups || null, bossRuns: bossRuns ? bossRuns.groups : null, trials, skills: rows };
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
    for (const grp of ['merge', 'bossFloor', 'stagger', 'strategy', 'elite', 'bossTime', 'progress', 'brutal', 'skillGap']) for (const i of r.items.filter(i => i.group === grp)) console.log((i.ok ? ' ok ' : 'OFF ') + i.name.padEnd(40), String(i.value).padStart(7), ' target ' + i.band.join('–'), i.ok ? '' : ' +' + i.score);
    const sk = r.items.filter(i => i.group === 'skill'); console.log(' ' + sk.filter(i => i.ok).length + '/' + sk.length + ' skills within ' + JSON.stringify(sk[0]?.band) + ' x their tier median (fight value per energy)');
    for (const i of sk.filter(i => !i.ok).sort((x, y) => y.score - x.score)) console.log('OFF ' + i.name.padEnd(40), String(i.value).padStart(7), ' (value ' + i.raw + ', median ' + i.median + ', cost ' + i.cost + ')  +' + i.score);
    if (r.unmeasured.length) console.log(' not measurable in the fight bench (no damage, control or protection on their own, e.g. needs basic attacks): ' + r.unmeasured.join(', '));
    console.log('\nSCORE ' + r.score + '  (' + r.offTarget + '/' + r.total + ' off target)' + (bad[0] ? '  worst: ' + bad[0].name : '') + '  [' + ((Date.now() - t0) / 1000).toFixed(1) + 's]');
  }
}
