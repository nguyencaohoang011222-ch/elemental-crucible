// Elite: chỉ số cao hơn (ELITE), chiêu chỉ tung trong tầm và chạm tới người chơi, mỗi con một lối tiếp cận riêng (không đi thẳng như lính thường).
import { Game } from '../game.js';
import { ENEMIES } from '../sim.js';
import { ELITE } from '../env.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const arena = (seed = 9) => { const g = new Game(seed, 'KNIGHT', { training: true, lab: true }); g.enemies = []; g.spawnQ = []; g.sigils = []; g.labGod = true; g.p.aim = 0; return g; };
const put = (g, type, x, y) => { const e = g.spawnAt(type, g.p.x + x, g.p.y + y); e.spawn = 0; e.hp = e.max = 1e5; e.skillT = 99; return e; };
const run = (g, s, each) => { for (let i = 0; i < s * 60; i++) { g.p.hp = g.p.max; g.step(1 / 60, {}); g.events.length = 0; if (each) each(i); } };
const dP = (g, e) => Math.hypot(e.x - g.p.x, e.y - g.p.y);

ok(ELITE.hp > 1 && ELITE.speed > 1 && ELITE.dmg > 1 && ELITE.reach > 1, 'ELITE multipliers are tunable constants above 1');
ok(ENEMIES.EMBERHULK.hp > ENEMIES.GRUNT.hp * 2 && ENEMIES.EMBERHULK.speed > ENEMIES.GRUNT.speed, 'Ember Hulk is much tougher and faster than a grunt');

// Ember Hulk vòng ra sau lưng hướng ngắm (người chơi ngắm sang phải, Hulk bắt đầu ở bên phải)
{ const g = arena(), e = put(g, 'EMBERHULK', 420, 30), gr = put(g, 'GRUNT', 420, -30); let dev = 0, devG = 0; run(g, 2.5, () => { dev = Math.max(dev, Math.abs(e.y - g.p.y)); devG = Math.max(devG, Math.abs(gr.y - g.p.y)); }); ok(dev > devG + 80, 'Ember Hulk swings wide around the player instead of walking straight in (' + Math.round(dev) + ' vs grunt ' + Math.round(devG) + ')'); }
// Rime Seer giữ khoảng cách xa hơn lính bắn thường
{ const g = arena(), e = put(g, 'GLACIER', 150, 0); run(g, 3); ok(dP(g, e) > 320, 'Rime Seer kites at long range (' + Math.round(dP(g, e)) + 'px)'); }
// Blade Dancer lượn vòng thay vì lao thẳng
{ const g = arena(), e = put(g, 'BLADEDANCER', 240, 0); e.st = 3; const ds = []; run(g, 1.5, () => ds.push(dP(g, e))); ok(Math.min(...ds) > 150, 'Blade Dancer orbits at a distance before striking (closest ' + Math.round(Math.min(...ds)) + 'px)'); }
// Spore Mother núp sau lính thường
{ const g = arena(); const s = put(g, 'GRUNT', 200, 0); s.hp = s.max = 1e5; const e = put(g, 'SPOREMOTHER', 230, 160); run(g, 2.5); ok(dP(g, e) > dP(g, s) + 20, 'Spore Mother stays behind the grunts'); }
// Inferno Brute chạy ra góc chéo trước khi húc
{ const g = arena(), e = put(g, 'INFERNO', 300, 0); const a0 = Math.atan2(e.y - g.p.y, e.x - g.p.x); let tele = null; run(g, 3, () => { if (tele === null && e.state === 'tele') tele = Math.atan2(e.y - g.p.y, e.x - g.p.x); }); ok(tele !== null && Math.abs(Math.atan2(Math.sin(tele - a0), Math.cos(tele - a0))) > 0.5, 'Inferno Brute flanks to a new angle before charging'); }
// chiêu chỉ tung trong tầm, và quake rơi vào chỗ người chơi
{ const g = arena(), e = put(g, 'EMBERHULK', 1400, 0); e.skillT = 0; run(g, 0.2); ok(!g.hazards.some(h => h.kind === 'circle'), 'elite skills wait until the player is in range'); }
{ const g = arena(), e = put(g, 'EMBERHULK', 230, 0); e.skillT = 0; g.step(1 / 60, {}); const h = g.hazards.find(h => h.kind === 'circle'); ok(h && Math.hypot(h.x - g.p.x, h.y - g.p.y) < 60, 'Ember Hulk quake lands on the player, not in empty space'); }

if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
