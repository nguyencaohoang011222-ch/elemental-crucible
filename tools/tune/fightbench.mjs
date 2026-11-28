// Bench giao tranh: mỗi chiêu được thử trong một trận nhỏ 8 giây với AI quái hoạt động (6 quái thường + 1 tinh anh lao vào).
// Người chơi đứng yên và KHÔNG đánh thường (đánh thường làm kết quả nhiễu); chiêu cần đo được tung ở giây 0 vào giữa bầy.
// Giá trị = sát thương của chiêu (cả cháy, nổ trễ, phân thân) + máu đỡ được (so với trận không tung chiêu) + giây khống chế lên quái × ccW.
// (đã thử: đánh thường + chiêu tham chiếu làm nhiễu ±700, lớn hơn cả một chiêu đơn)
// Nhờ vậy khống chế, buff, đánh dấu, phân thân, bẫy đều có điểm, không chỉ sát thương lên bao cát đứng yên.
// CLI: node tools/tune/fightbench.mjs [KNIGHT|RANGER|MAGE] [--json]
import { Game } from '../../game.js';
import { EL } from '../../kits.js';

export const HEROES = ['KNIGHT', 'RANGER', 'MAGE'];
// hpMul cao: quái không chết trong 8 s, để thứ tự hạ quái không làm nhiễu kết quả
export const FB = { seconds: 8, hpMul: 20, ccW: 12, hurtW: 1 };
const PACK = [[240, 0], [200, 120], [200, -120], [120, 200], [120, -200], [-60, 230], [-60, -230]];

export function cores() {
  const out = [];
  for (const a of EL) for (const b of EL) out.push(a === b ? { type: 'el', el: a } : { type: 'duo', els: [a, b] });
  for (const m of EL) out.push({ type: 'tri', els: EL.filter(e => e !== m) });
  return out;
}
const tierOf = c => c.type === 'el' ? 1 : c.type === 'duo' ? 2 : 3;

function fight(cls, core) {
  const g = new Game(21, cls, { training: true, lab: true }); g.enemies = []; g.spawnQ = []; g.sigils = [];
  const p = g.p; p.energy = p.energyMax = 999;
  // đếm máu mất sau giảm sát thương / khiên, rồi hồi đầy ngay để người chơi không chết
  let hurt = 0; const hp0 = g.hurtPlayer.bind(g); g.hurtPlayer = function (...a) { const h = p.hp; const r = hp0(...a); hurt += Math.max(0, h - p.hp); p.hp = p.max; return r; };
  PACK.forEach(([x, y], i) => { const e = g.spawnAt(i === 0 ? 'BLADEDANCER' : 'GRUNT', p.x + x, p.y + y); e.spawn = 0; e.hp = e.max = e.max * FB.hpMul; });
  const sk = core ? g.coreSkill(core) : null;
  const d0 = g.stats.dmg; let cc = 0;
  const aimAt = () => { let best = null, bd = 1e9; for (const e of g.enemies) if (!e.dead) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } } return best || { x: p.x + 200, y: p.y }; };
  const centroid = () => { const L = g.enemies.filter(e => !e.dead); if (!L.length) return { x: p.x + 200, y: p.y }; return { x: L.reduce((s, e) => s + e.x, 0) / L.length, y: L.reduce((s, e) => s + e.y, 0) / L.length }; };
  if (sk) { const c = centroid(); p.gcd = 0; g.castNow(sk, c.x, c.y); }
  for (let i = 0; i < FB.seconds * 60; i++) {
    p.energy = 999;
    const t = aimAt(); g.step(1 / 60, { ax: t.x, ay: t.y, cx: t.x, cy: t.y }); g.events.length = 0;
    if (g.over) break;
    for (const e of g.enemies) if (!e.dead && !e.boss && ((e.stun || 0) > 0 || (e.freeze || 0) > 0 || (e.root || 0) > 0)) cc += 1 / 60;
  }
  return { dmg: g.stats.dmg - d0, hurt, cc, sk };
}

let BASE = {};
export function fightBench(heroes = HEROES) {
  const rows = [];
  for (const cls of heroes) {
    const b = BASE[cls] || (BASE[cls] = fight(cls, null));
    for (const c of cores()) {
      const r = fight(cls, c), sk = r.sk, cost = Math.max(1, sk.cost || 1);
      const dmg = r.dmg - b.dmg, saved = b.hurt - r.hurt, cc = r.cc - b.cc;
      const value = dmg + FB.hurtW * saved + FB.ccW * cc;
      rows.push({ cls, name: sk.name, key: sk.key, tier: tierOf(c), group: sk.group, cost, cd: +(sk.cd || 0).toFixed(2),
        dmg: Math.round(dmg), saved: Math.round(saved), cc: +cc.toFixed(1), value: Math.round(value), perEnergy: +(value / cost).toFixed(2) });
    }
  }
  const med = v => { const s = v.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  for (const r of rows) { const m = med(rows.filter(q => q !== r && q.tier === r.tier).map(q => q.perEnergy)); r.median = m; r.ratio = m ? +(r.perEnergy / m).toFixed(2) : 1; }
  return rows;
}
// trung vị giá trị/mana theo hạng: để kiểm tra "ghép có đáng không"
export function tierMedians(rows) {
  const med = v => { const s = v.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  return [1, 2, 3].map(t => med(rows.filter(r => r.tier === t).map(r => r.perEnergy)));
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/tune/fightbench.mjs')) {
  const a = process.argv.slice(2), only = a.filter(x => HEROES.includes(x)), rows = fightBench(only.length ? only : HEROES);
  if (a.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('Hero'.padEnd(7), 'T', 'Skill'.padEnd(22), 'cost'.padStart(4), 'cd'.padStart(5), 'dmg+'.padStart(6), 'saved'.padStart(6), 'cc s'.padStart(5), 'value'.padStart(6), '/energy'.padStart(8), ' x tier median');
    for (const r of rows) console.log(r.cls.padEnd(7), r.tier, r.name.slice(0, 22).padEnd(22), String(r.cost).padStart(4), String(r.cd).padStart(5), String(r.dmg).padStart(6), String(r.saved).padStart(6), String(r.cc).padStart(5), String(r.value).padStart(6), String(r.perEnergy).padStart(8), ' ' + r.ratio.toFixed(2));
    const m = tierMedians(rows); console.log('\nvalue per energy, tier medians: single ' + m[0] + ' · duo ' + m[1] + ' · tri ' + m[2] + '   (duo/single ' + (m[1] / m[0]).toFixed(2) + ', tri/duo ' + (m[2] / m[1]).toFixed(2) + ')');
  }
}
