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

// ---------- thực tại giả ----------
const mkI = ill => { const q = mk(); q.labFreezeAI = true; run(q, 1 / 60); q.lab = false; const S = axState(q.p); S.illusion = ill; S.cubes = 0; return q; };
const foe = (q, dx, dy = 0) => { const f = q.spawnAt('GRUNT', q.p.x + dx, q.p.y + dy); f.spawn = 0; f.hp = f.max = 150; return f; };
const holdSpace = (q, aims) => { const first = aims[0]; q.step(1 / 60, { ax: first.x, ay: first.y, space: true, spaceHeld: true }); for (const a of aims) for (let i = 0; i < 20; i++) q.step(1 / 60, { ax: a.x, ay: a.y, spaceHeld: true }); const last = aims[aims.length - 1]; q.step(1 / 60, { ax: last.x, ay: last.y }); };

g = mkI(100); let f1 = foe(g, 250); let px = g.p.x, fx = f1.x; g.foes.push({ x: g.p.x - 80, y: g.p.y, vx: 20, vy: 0, r: 6, life: 3, dmg: 10 });
holdSpace(g, [{ x: f1.x, y: f1.y }]);
ok(Math.abs(g.p.x - fx) < 40 && Math.abs(f1.x - px) < 40 && axState(g.p).illusion === 100 - AX.SWAP, 'hold on a foe swaps places');
ok(f1.hp < 150, 'the incoming shot hits the foe that took your place');
g = mkI(10); f1 = foe(g, 250); px = g.p.x; holdSpace(g, [{ x: f1.x, y: f1.y }]); ok(Math.abs(g.p.x - px) < 1, 'no swap without Illusion');

g = mkI(100); f1 = foe(g, 250, -100); let f2 = foe(g, 250, 120); const y1 = f1.y, y2 = f2.y; px = g.p.x;
holdSpace(g, [{ x: f1.x, y: f1.y }, { x: f2.x, y: f2.y }]);
ok(Math.abs(f1.y - y2) < 30 && Math.abs(f2.y - y1) < 30 && Math.abs(g.p.x - px) < 1 && axState(g.p).illusion === 100 - AX.SWAP2, 'sweeping two foes swaps them');

g = mkI(100); f1 = foe(g, 120); f2 = foe(g, 170); holdSpace(g, [{ x: g.p.x, y: g.p.y }]);
ok(f1.confuse > 0 && f2.confuse > 0, 'hold on yourself confuses nearby foes');
g.labFreezeAI = false; run(g, 1.5); ok(f1.hp < 150 && f2.hp < 150, 'confused foes cut each other');
run(g, 3); ok(!(f1.confuse > 0), 'confusion ends');

g = mkI(100); g.stage = 3; f1 = foe(g, 200); g.p.hp = 5; px = g.p.x; fx = f1.x; g.hurtPlayer(500, Math.PI);
ok(!g.over && Math.abs(g.p.hp - g.p.max * AX.MIRROR_HP) < 1 && axState(g.p).illusion === 0, 'mirror break turns death into a lie');
ok(Math.abs(g.p.x - fx) < 40 && (f1.dead || f1.hp <= 0) && g.events.some(e => e.ev === 'axShatter'), 'the attacker takes your place and pays');
g.p.inv = 0; axState(g.p).illusion = 100; g.p.hp = 5; g.hurtPlayer(500, 0); ok(g.over, 'only once per stage');
g = mkI(99); g.p.hp = 5; g.hurtPlayer(500, 0); ok(g.over, 'needs a full bar');
g = mkI(100); g.hurtPlayer(10, 0); ok(axState(g.p).illusion === 100, 'a non-lethal hit does not spend it');

// ---------- Rapid Slash và Thuấn Trảm ----------
g = mkI(0); f1 = foe(g, 160); f1.hp = f1.max = 1000; px = g.p.x; holdFull(g, 0.5); release(g); run(g, 0.4);
ok(g.p.x - px > 180, 'late full release rushes forward');
ok(1000 - f1.hp > 60, 'the rush cuts the foe on its path more than once');
g = mkI(0); g.labFreezeAI = false; f1 = foe(g, 200); f1.hp = f1.max = 1000; const ex = f1.x; px = g.p.x;
holdFull(g, AX.STOP_HOLD + 0.2); const A2 = axState(g.p); ok(!!A2.stop, 'holding a full charge stops time');
const t0 = g.t, fx0 = f1.x; run(g, 1.0, { fireHeld: true }); ok(g.t === t0 && Math.abs(f1.x - fx0) < 0.01 && f1.hp === 1000, 'the world and the clock are frozen, no damage yet');
run(g, 1.3, { fireHeld: true }); ok(!A2.stop && g.p.x - px > 250 && f1.hp <= 1000 - AX.SEVER * 0.9, 'after the sheath the cut lands');
ok(g.t > t0, 'the clock runs again');
const pl = A2.planes.length; run(g, 0.5, { fireHeld: true }); release(g); ok(g.p.charge === 0 && !A2.rush, 'must let go before charging again');

// một stage thật: không lỗi khi chạy
const s = new Game(99, 'AXIOM', { element: 'FIRE' }); for (let i = 0; i < 900; i++) { s.p.hp = s.p.max; const f = s.enemies[0]; s.step(1 / 60, { ax: f ? f.x : 1, ay: f ? f.y : 0, fireHeld: i % 80 < 62, dash: i % 97 === 0, space: i % 130 === 0, spaceHeld: i % 260 < 40, slots: i % 150 === 0 ? [0] : [] }); s.events.length = 0; }
ok(s.stage === 1, 'a real stage runs');
if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
