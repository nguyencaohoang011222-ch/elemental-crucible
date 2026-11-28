// Brutal (khoá 'HARD'): quái trâu và đông hơn, ra đòn nhanh hơn, bắn đạn đôi; boss không bị choáng.
import { Game, BRUTAL } from '../game.js';
import { poiseDamage, staggerBoss } from '../boss.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };

const n = new Game(31, 'KNIGHT', { element: 'FIRE' }), b = new Game(31, 'KNIGHT', { element: 'FIRE', difficulty: 'HARD' });
ok(b.brutal && !n.brutal, 'HARD is Brutal');
for (const g of [n, b]) { g.stage = 6; g.spawnQ = []; g.enemies = []; g.startStage(6); }
ok(b.spawnQ.length > n.spawnQ.length, 'Brutal stages bring more enemies (' + b.spawnQ.length + ' vs ' + n.spawnQ.length + ')');
const en = n.spawnAt('GRUNT', 0, 0), eb = b.spawnAt('GRUNT', 0, 0); ok(eb.max > en.max * 1.35, 'Brutal enemies have more HP');

// đạn đôi
const shots = g => { g.spawnQ = []; g.enemies = []; g.sigils = []; g.foes = []; const s = g.spawnAt('SHOOTER', g.p.x + 250, g.p.y); s.spawn = 0; s.st = 0; let total = 0; for (let i = 0; i < 300; i++) { const before = g.foes.length; g.p.hp = g.p.max; g.step(1 / 60, {}); total += Math.max(0, g.foes.length - before); } return total; };
const sn = shots(new Game(32, 'KNIGHT', { element: 'FIRE' })), sb = shots(new Game(32, 'KNIGHT', { element: 'FIRE', difficulty: 'HARD' }));
ok(sb >= sn * 1.8, 'Brutal shooters fire about twice as many bullets (' + sb + ' vs ' + sn + ')');

// boss không bị choáng
const g = new Game(33, 'KNIGHT', { element: 'FIRE', difficulty: 'HARD' }); g.startStage(5); const boss = g.boss; boss.spawn = 0; boss.poiseImm = 0;
poiseDamage(g, boss, 99999); staggerBoss(g, boss, 3, 'test'); g.cc(boss, 'stun', 3);
ok(!(boss.stagger > 0), 'Brutal bosses never stagger');
const gn = new Game(33, 'KNIGHT', { element: 'FIRE' }); gn.startStage(5); gn.boss.spawn = 0; gn.boss.poiseImm = 0; poiseDamage(gn, gn.boss, 99999); ok(gn.boss.stagger > 0, 'normal bosses still stagger');
ok(BRUTAL.aggro > 1 && b.aggro === BRUTAL.aggro, 'Brutal enemies act faster');
if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
