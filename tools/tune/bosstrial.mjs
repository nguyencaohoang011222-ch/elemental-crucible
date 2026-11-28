// Thử boss: bot bất tử chơi tới stage boss để có bộ đồ thật, rồi tắt bất tử và đánh boss.
// Đo: thời gian hạ boss, % thời gian boss bị choáng, HP hồi mỗi giây (% máu tối đa), mana thu/chi, số pha boss đã diễn.
// mortal: false (mặc định) = bất tử cả trong trận boss, đo phần tấn công thuần (bot né kém hơn người nhiều); true = đánh thật, đo sống/chết.
// CLI: node tools/tune/bosstrial.mjs [5|10|15|20|25 ...] [KNIGHT ...] [--spam|--merge] [--relics] [--mortal] [--json]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from './bot.mjs';
import { BOSS_STAGES } from '../../game.js';
import { BOSS_DEFS } from '../../boss.js';

export const BOSSES = Object.keys(BOSS_STAGES).map(Number);
export const HEROES = ['KNIGHT', 'RANGER', 'MAGE'];
// relic đáng ngờ nhất cho combo boss (sát thương, tung lại, hoàn mana, hồi máu)
export const RELIC_SET = ['glass', 'echo', 'wild', 'overload', 'bloodmagic', 'bats', 'spellblade'];
const FIGHT_CAP = 240;

export function trial(job) {
  const S = job.stage, m = { frames: 0, stag: 0, heal: 0, gain: 0, spend: 0, phase: 0, phases: 0, t0: -1, ttk: null, died: false, maxHp: 1 };
  let lastHp = null, lastEn = null, lastPot = null;
  const onStep = g => {
    if (g.stage > S) return false;
    const b = g.boss, p = g.p;
    if (g.stage === S && b && !b.dead && b.spawn <= 0) {
      if (m.t0 < 0) { m.t0 = g.t; m.phases = (BOSS_DEFS.find(d => d.id === b.type) || b.def || { phases: [1] }).phases.length; }
      m.frames++; if (b.stagger > 0) m.stag++; m.phase = Math.max(m.phase, b.phase + 1); m.maxHp = p.max;
      const pots = p.potions.hp;
      if (lastHp !== null && p.hp > lastHp && !(lastPot !== null && pots < lastPot)) m.heal += p.hp - lastHp;
      if (lastEn !== null) { if (p.energy > lastEn) m.gain += p.energy - lastEn; else m.spend += lastEn - p.energy; }
      lastHp = p.hp; lastEn = p.energy; lastPot = pots;
      if (g.t - m.t0 > FIGHT_CAP) return false;
    } else if (m.t0 >= 0 && m.ttk === null && (!b || b.dead)) m.ttk = +(g.t - m.t0).toFixed(1);
    return true;
  };
  const r = run(job.cls, job.el, job.seed, true, { level: 'good', strategy: job.strategy, relics: job.relics, immortal: true, mortalFrom: job.mortal ? S : 0, maxStage: S, onStep, maxT: 6000 });
  m.died = !!(r.stage === S && !r.won && m.ttk === null && m.t0 >= 0 && m.frames / 60 < FIGHT_CAP);
  const secs = m.frames / 60;
  return { ...job, reached: m.t0 >= 0, ttk: m.ttk, died: m.died, timeout: m.ttk === null && !m.died, secs: +secs.toFixed(1),
    stagger: +(m.stag / Math.max(1, m.frames)).toFixed(3), healPct: +(100 * m.heal / Math.max(1, secs) / m.maxHp).toFixed(2),
    energyIn: +(m.gain / Math.max(1, secs)).toFixed(1), energyOut: +(m.spend / Math.max(1, secs)).toFixed(1), phases: m.phase + '/' + m.phases };
}

if (!isMainThread && workerData && workerData.bosstrial) parentPort.on('message', j => { if (!j) process.exit(0); parentPort.postMessage(trial(j)); });

// opts: { stages, heroes, elements, strategies, relicSets: [[ids]...], seeds }
export async function bossTrials(opts = {}) {
  const o = { stages: BOSSES, heroes: HEROES, elements: ['FIRE', 'WATER'], strategies: ['merge', 'spam'], relicSets: [[]], seeds: 1, mortal: false, ...opts }, jobs = [];
  for (const stage of o.stages) for (const cls of o.heroes) for (const el of o.elements) for (const strategy of o.strategies) for (const relics of o.relicSets) for (let s = 1; s <= o.seeds; s++) jobs.push({ stage, cls, el, strategy, relics, seed: 2000 + s * 13, mortal: !!o.mortal });
  const n = Math.max(1, Math.min(o.threads || cpus().length - 1, jobs.length)), out = [];
  await new Promise((res, rej) => { let next = 0, live = n; for (let i = 0; i < n; i++) { const w = new Worker(fileURLToPath(import.meta.url), { workerData: { bosstrial: true } }); const feed = () => w.postMessage(next < jobs.length ? jobs[next++] : null); w.on('message', r => { out.push(r); feed(); }); w.on('error', rej); w.on('exit', () => { if (--live === 0) res(); }); feed(); } });
  const key = r => [String(r.stage).padStart(2, '0'), r.cls, r.el, r.strategy, r.relics.join('+'), r.seed].join('|');
  return out.sort((a, b) => key(a) < key(b) ? -1 : 1);
}

const mean = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
// gom theo boss × chiến thuật × relic: thời gian hạ (chỉ ván hạ được), tỉ lệ chết, % choáng, hồi máu
export function summarizeTrials(rows) {
  const by = {}; for (const r of rows) (by[r.stage + '|' + r.strategy + '|' + (r.relics.join('+') || '-')] ||= []).push(r);
  return Object.entries(by).map(([k, rs]) => { const [stage, strategy, relics] = k.split('|'), kills = rs.filter(r => r.ttk !== null);
    return { stage: +stage, strategy, relics, n: rs.length, ttk: kills.length ? +mean(kills.map(r => r.ttk)).toFixed(1) : null, ttkMin: kills.length ? Math.min(...kills.map(r => r.ttk)) : null, killRate: +(kills.length / rs.length).toFixed(2),
      stagger: +mean(rs.map(r => r.stagger)).toFixed(3), healPct: +mean(rs.map(r => r.healPct)).toFixed(2), energyIn: +mean(rs.map(r => r.energyIn)).toFixed(1), energyOut: +mean(rs.map(r => r.energyOut)).toFixed(1), phasesFull: rs.filter(r => { const [a, b] = r.phases.split('/'); return +a >= +b; }).length + '/' + rs.length }; });
}

if (isMainThread && process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/tune/bosstrial.mjs')) {
  const a = process.argv.slice(2), st = a.filter(x => /^\d+$/.test(x)).map(Number).filter(x => BOSSES.includes(x)), he = a.filter(x => HEROES.includes(x));
  const strategies = a.includes('--spam') ? ['spam'] : a.includes('--merge') ? ['merge'] : ['merge', 'spam'];
  const relicSets = a.includes('--relics') ? [[], ...RELIC_SET.map(r => [r])] : [[]];
  const t0 = Date.now(), rows = await bossTrials({ ...(st.length ? { stages: st } : {}), ...(he.length ? { heroes: he } : {}), strategies, relicSets, mortal: a.includes('--mortal') });
  if (a.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('Boss'.padEnd(5), 'Strategy'.padEnd(9), 'Relic'.padEnd(11), 'kill'.padStart(5), 'ttk s'.padStart(6), 'min'.padStart(5), 'stun%'.padStart(6), 'heal%/s'.padStart(8), 'en in/out'.padStart(10), ' phases');
    for (const s of summarizeTrials(rows)) console.log(('S' + s.stage).padEnd(5), s.strategy.padEnd(9), s.relics.padEnd(11), s.killRate.toFixed(2).padStart(5), String(s.ttk ?? '-').padStart(6), String(s.ttkMin ?? '-').padStart(5), (100 * s.stagger).toFixed(0).padStart(6), s.healPct.toFixed(2).padStart(8), (s.energyIn + '/' + s.energyOut).padStart(10), ' ' + s.phasesFull);
    console.log(rows.length + ' fights in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
}
