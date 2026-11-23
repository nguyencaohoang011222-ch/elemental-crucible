// Ghép: 3 đơn cần Đá hợp nhất; đôi + đơn tung đủ hai chiêu và tốn đúng năng lượng; cột đá chặn đạn quái.
import { Game } from '../game.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const g = new Game(2, 'MAGE', { training: true });
ok(!!g.mergeCores([4, 5, 6]).error, 'merging 3 singles without a shard is blocked');
g.p.shards = 1; const r = g.mergeCores([4, 5, 6]); ok(r.core && r.core.type === 'tri' && g.p.shards === 0, 'with a shard the ultimate is made and the shard is spent');
const g2 = new Game(3, 'KNIGHT', { training: true }); const s = g2.coreSkill({ type: 'inf', els: ['FIRE', 'WATER'], add: 'EARTH' });
const a = g2.coreSkill({ type: 'duo', els: ['FIRE', 'WATER'] }), b = g2.coreSkill({ type: 'el', el: 'EARTH' });
ok(s.dual && s.cost === Math.round((a.cost + b.cost) * 0.85), `dual skill costs ${s.cost} (= 85% of ${a.cost}+${b.cost})`);
g2.p.energy = 999; const e0 = g2.p.energy; g2.castNow(s, g2.p.x + 120, g2.p.y); for (let i = 0; i < 12; i++) g2.step(1 / 60, {});
const evs = new Set(g2.events.map(e => e.ev)); ok(evs.has('arcSlash') && (evs.has('spike') || evs.has('terraform')), 'both skills fire: ' + [...evs].filter(x => x !== 'skill').slice(0, 6).join(','));
const g3 = new Game(4, 'KNIGHT', { training: true, lab: true }); const o = g3.world.addTemp('stone', g3.p.x + 100, g3.p.y, 18, 5, 90);
g3.foes.push({ x: g3.p.x + 200, y: g3.p.y, vx: -300, vy: 0, life: 3, dmg: 10, r: 7 }); const hp0 = g3.p.hp; for (let i = 0; i < 60; i++) g3.step(1 / 60, {}); ok(g3.p.hp === hp0, 'a stone pillar blocks an enemy shot');
// ghép 3 không phụ thuộc thứ tự chọn lõi
{ const keys = new Set(); for (const order of [[4, 5, 6], [6, 4, 5], [5, 6, 4]]) { const q = new Game(2, 'RANGER', { training: true }); q.p.cores[4] = { type: 'el', el: 'EARTH' }; q.p.cores[5] = { type: 'el', el: 'FIRE' }; q.p.cores[6] = { type: 'el', el: 'WIND' }; q.p.shards = 1; const r = q.mergeCores(order); keys.add(r.skill.key + '|' + r.skill.name); }
  ok(keys.size === 1, 'merging the same 3 cores in any order gives the same skill: ' + [...keys][0]); }
process.exitCode = fail ? 1 : 0;
