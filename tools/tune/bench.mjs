// Đo từng chiêu trong tình huống cố định: 1 mục tiêu và cụm 6 quái, AI đứng yên, tung 1 lần, đếm sát thương trong 4 giây.
// So mỗi chiêu với trung vị các chiêu tấn công cùng hạng (đơn / đôi / tuyệt kỹ) của cả 4 tướng để bắt chiêu lệch.
// CLI: node tools/tune/bench.mjs [KNIGHT|RANGER|MAGE|AXIOM] [--json]
import { Game } from '../../game.js';
import { EL } from '../../kits.js';

export const CLASSES = ['KNIGHT', 'RANGER', 'MAGE', 'AXIOM'];
export const OFFENSE = new Set(['DAMAGE', 'AREA', 'ULTIMATE']);
const SECONDS = 4;
// tâm mục tiêu: tướng cận chiến đứng gần hơn
const CENTER = { KNIGHT: 95, AXIOM: 160, RANGER: 200, MAGE: 200 };
const SINGLE = [[0, 0]], CLUSTER = [[0, 0], [45, 25], [45, -25], [-35, 35], [-35, -35], [5, 55]];

export function cores() {
  const out = [];
  for (const a of EL) for (const b of EL) out.push(a === b ? { type: 'el', el: a } : { type: 'duo', els: [a, b] });
  for (const m of EL) out.push({ type: 'tri', els: EL.filter(e => e !== m) });
  return out;
}
const tierOf = c => c.type === 'el' ? 1 : c.type === 'duo' ? 2 : 3;

function dealt(cls, core, spots) {
  const cx = CENTER[cls] || 200, AIM = [cx, 0];
  const g = new Game(12, cls, { training: true, lab: true }); g.enemies = []; g.spawnQ = []; g.sigils = []; g.labGod = true;
  const es = spots.map(([x, y]) => { const e = g.spawnAt('GRUNT', g.p.x + cx + x, g.p.y + y); e.spawn = 0; e.hp = e.max = 1e6; e.home = [e.x, e.y]; return e; });
  g.labFreezeAI = true;
  const sk = g.coreSkill(core); g.p.gcd = 0; g.p.energy = g.p.energyMax = 999;
  const ax = g.p.x + AIM[0], ay = g.p.y + AIM[1]; g.castNow(sk, ax, ay);
  for (let i = 0; i < SECONDS * 60; i++) { g.step(1 / 60, { ax, ay }); g.events.length = 0; for (const e of es) { e.x = e.home[0]; e.y = e.home[1]; } }
  return { dmg: es.reduce((s, e) => s + (e.max - e.hp), 0), sk };
}

export function bench(only) {
  const rows = [];
  for (const cls of CLASSES) {
    if (only && only !== cls) continue;
    for (const c of cores()) {
      const a = dealt(cls, c, SINGLE), b = dealt(cls, c, CLUSTER), sk = a.sk, cost = Math.max(1, sk.cost || 1);
      rows.push({ cls, name: sk.name, key: sk.key, tier: tierOf(c), group: sk.group, offense: OFFENSE.has(sk.group), cost,
        single: Math.round(a.dmg), cluster: Math.round(b.dmg), aoe: +(b.dmg / Math.max(1, a.dmg)).toFixed(2),
        value: +((a.dmg + b.dmg / 3) / cost).toFixed(2) });
    }
  }
  // lệch so với trung vị: so với các chiêu tấn công CÙNG HẠNG của mọi tướng (trừ chính nó), để bắt cả chiêu lệch lẫn tướng lệch
  const med = v => { const s = v.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  for (const r of rows) {
    const peers = rows.filter(q => q !== r && q.tier === r.tier && q.offense && q.value > 0).map(q => q.value);
    const m = med(peers); r.median = +m.toFixed(2); r.ratio = m ? +(r.value / m).toFixed(2) : 1;
  }
  return rows;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/tune/bench.mjs')) {
  const only = process.argv.find(a => CLASSES.includes(a)), rows = bench(only);
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('Hero'.padEnd(7), 'T', 'Skill'.padEnd(26), 'Group'.padEnd(9), 'cost'.padStart(4), 'single'.padStart(7), 'cluster'.padStart(8), 'aoe'.padStart(5), 'value'.padStart(6), ' x median');
    for (const r of rows) console.log(r.cls.padEnd(7), r.tier, r.name.slice(0, 26).padEnd(26), r.group.padEnd(9), String(r.cost).padStart(4), String(r.single).padStart(7), String(r.cluster).padStart(8), String(r.aoe).padStart(5), String(r.value).padStart(6), ' ' + (r.offense ? r.ratio.toFixed(2) : '(util)'));
  }
}
