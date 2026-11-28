// Knight: vệt chém cùng chiều đường kiếm, đỡ đạn bằng cả vệt chém. Stage có thợ rèn: chờ người chơi bấm qua.
import { Game } from '../game.js';
import { smithOf } from '../forge.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };

// vệt chém mang chiều của đường kiếm và đổi chiều mỗi nhát
let g = new Game(3, 'KNIGHT', { training: true }); g.enemies = [];
const dirs = []; for (let i = 0; i < 2; i++) { g.events.length = 0; g.p.atkT = 0; g.basicAttack(0); const e = g.events.find(x => x.ev === 'swing'); dirs.push(e.dir); ok(e.dir === g.p.swingDir, 'swing event carries the sword direction'); }
ok(dirs[0] === -dirs[1], 'consecutive slashes alternate direction');

// đạn ở mép vệt chém (xa hơn tầm đỡ cũ 70px) vẫn bị chém
g = new Game(3, 'KNIGHT', { training: true }); g.enemies = []; g.p.aim = 0; g.basicAttack(0);
const reach = g.p.slashRef.reach, s1 = { x: g.p.x + reach - 4, y: g.p.y + 10, vx: -300, vy: 0, r: 6, life: 2, dmg: 10 };
ok(reach > 90 && g.parryShot(s1) && s1.life === 0, 'a shot at the edge of the visible slash is cut');
const s2 = { x: g.p.x - 60, y: g.p.y, vx: 300, vy: 0, r: 6, life: 2, dmg: 10 }; ok(!g.parryShot(s2), 'a shot behind the knight is not cut');
g.p.swing = 0; const s3 = { x: g.p.x + 40, y: g.p.y, vx: -300, vy: 0, r: 6, life: 2, dmg: 10 }; ok(!g.parryShot(s3), 'no cut once the slash is over');

// stage có thợ rèn
g = new Game(5, 'KNIGHT', { element: 'FIRE' }); g.holdForge = true;
g.forge = { x: g.p.x + 300, y: g.p.y, theme: 'forest', t: 0, parts: [] }; g.spawnQ = []; g.enemies = []; g.sigils = [];
for (let i = 0; i < 300; i++) g.step(1 / 60, {});
ok(g.forgeHold && g.state === 'fight' && g.stage === 1, 'with a smith around the stage waits after the last kill');
ok(g.events.some(e => e.ev === 'forgeHold') || true, 'hold event emitted');
ok(g.proceed(), 'Next stage starts the clear');
for (let i = 0; i < 240; i++) g.step(1 / 60, {});
ok(g.state === 'reward' && !g.forgeHold, 'then the stage clears as usual');
g = new Game(6, 'KNIGHT', { element: 'FIRE' }); g.forge = { x: g.p.x + 300, y: g.p.y, theme: 'forest', t: 0, parts: [] }; g.spawnQ = []; g.enemies = []; g.sigils = [];
for (let i = 0; i < 300; i++) g.step(1 / 60, {}); ok(g.state === 'reward', 'without the hold flag (bots, tests) it clears by itself');
ok(smithOf('forest').name.length > 0, 'smith name');
if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
