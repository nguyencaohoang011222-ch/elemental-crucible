// Axiom: nhả đúng nhịp để lại mặt cắt, Gập làm nổ, né gương, Đàn Khối đỡ đạn.
import { Game } from '../game.js';
import { AX, axState, segDist } from '../axiom.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const mk = () => { const g = new Game(7, 'AXIOM', { training: true, lab: true }); g.enemies = []; g.spawnQ = []; g.sigils = []; return g; };
const run = (g, sec, it = {}) => { for (let i = 0; i < Math.round(sec * 60); i++) g.step(1 / 60, { ax: g.p.x + 200, ay: g.p.y, ...it }); };
const release = g => run(g, 2 / 60, { fireHeld: false });
const holdFull = (g, extra) => { run(g, 1 / 60, { fireHeld: true }); let n = 0; while (g.p.charge < 1 && n++ < 200) run(g, 1 / 60, { fireHeld: true }); run(g, extra, { fireHeld: true }); };

let g = mk(); holdFull(g, 0.05); release(g); let A = axState(g.p);
ok(A.planes.length === 1, 'release on the beat leaves a cut');
ok(A.cubes === 0, 'perfect release throws the cubes');
g = mk(); holdFull(g, 0.6); release(g); ok(axState(g.p).planes.length === 0, 'late release is a normal charged slash');
g = mk(); run(g, 0.4, { fireHeld: true }); release(g); ok(axState(g.p).planes.length === 0, 'early release leaves no cut');

g = mk(); holdFull(g, 0.05); release(g); A = axState(g.p); run(g, 1);
const w = A.planes[0], e = g.spawnAt('GRUNT', (w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2); e.spawn = 0; e.hp = e.max = 1000; g.labFreezeAI = true;
ok(segDist(e.x, e.y, w) < 1, 'target sits on the cut');
const hp0 = e.hp; run(g, 1 / 60, { space: true }); ok(e.hp === hp0, 'fold waits one beat'); run(g, AX.FOLD_DELAY + 0.3);
ok(e.hp <= hp0 - AX.PLANE_DMG * 0.9 && A.planes.length === 0, 'fold detonates the cut');

g = mk(); for (let i = 0; i < 6; i++) { holdFull(g, 0.03); release(g); run(g, 0.5); } ok(axState(g.p).planes.length <= AX.PLANE_MAX, 'at most four cuts');

g = mk(); A = axState(g.p); const c0 = A.cubes;
g.foes.push({ x: g.p.x + 60, y: g.p.y, vx: -500, vy: 0, r: 6, life: 2, dmg: 10 });
const x0 = g.p.x; run(g, 1 / 60, { dash: true, my: 1 });
ok(A.dodged && g.p.lureT > 1 && Math.abs(g.p.lure.x - x0) < 1 && A.cubes === c0 + 1, 'dashing as a shot arrives mirror-dodges and leaves a decoy');
g = mk(); A = axState(g.p); run(g, 1 / 60, { dash: true, my: 1 }); ok(!A.dodged && A.cubes === AX.START, 'dash with no threat gives nothing');

g = mk(); A = axState(g.p); const hp = g.p.hp; g.foes.push({ x: g.p.x + 30, y: g.p.y, vx: -100, vy: 0, r: 6, life: 2, dmg: 10 }); run(g, 0.2);
ok(A.cubes === AX.START - 1 && g.p.hp >= hp, 'an orbiting cube blocks a shot and is spent');

g = mk(); const t = g.spawnAt('GRUNT', g.p.x + 70, g.p.y); t.spawn = 0; t.hp = t.max = 500; g.labFreezeAI = true; A = axState(g.p); A.cubes = 0;
for (let i = 0; i < 3; i++) { run(g, 1 / 60, { fire: true }); run(g, 0.5); t.x = g.p.x + 70; t.y = g.p.y; }
ok(t.hp < 500 && A.cubes === 1, 'third combo hit grants a cube');
ok(g.coreSkill({ type: 'el', el: 'FIRE' }).name.length > 0, 'element cores work');

// một stage thật: không lỗi khi chạy
const s = new Game(99, 'AXIOM', { element: 'FIRE' }); for (let i = 0; i < 900; i++) { s.p.hp = s.p.max; const f = s.enemies[0]; s.step(1 / 60, { ax: f ? f.x : 1, ay: f ? f.y : 0, fireHeld: i % 80 < 62, dash: i % 97 === 0, space: i % 130 === 0, slots: i % 150 === 0 ? [0] : [] }); s.events.length = 0; }
ok(s.stage === 1, 'a real stage runs');
if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
