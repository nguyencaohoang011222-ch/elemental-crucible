// Năng lượng không tự hồi: chỉ đến từ giết quái, đập thùng, đánh thường trúng (ít) và Mage tụ đủ lâu.
import { Game } from '../game.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const step = (g, n, inp = {}) => { for (let i = 0; i < n; i++) g.step(1 / 60, inp); };

for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) {
  const g = new Game(11, cls, {}); g.enemies = []; g.spawnQ = []; g.p.energy = 10; step(g, 600);
  ok(Math.abs(g.p.energy - 10) < 0.01, cls + ': standing still 10s does not regenerate energy (' + g.p.energy.toFixed(1) + ')');
}
const g = new Game(12, 'KNIGHT', {}); g.enemies = []; g.spawnQ = []; g.p.energy = 0; g.rand = () => 0.99;
g.spawnAt('GRUNT', g.p.x + 300, g.p.y); const e = g.enemies[g.enemies.length - 1]; g.hurtEnemy(e, 9999, 0, 0, 'trap'); step(g, 2);
ok(Math.round(g.p.energy) === 6, 'killing a grunt gives +6 energy (' + g.p.energy.toFixed(1) + ')');
g.p.energy = 0; g.spawnAt('EMBERHULK', g.p.x + 300, g.p.y); const el = g.enemies[g.enemies.length - 1]; g.hurtEnemy(el, 99999, 0, 0, 'trap'); step(g, 2);
ok(g.p.energy >= 30, 'killing an elite gives at least +30 energy (' + g.p.energy.toFixed(1) + ')');

// đánh thường trúng chỉ cho một ít
const k = new Game(13, 'KNIGHT', { training: true }); k.enemies = []; k.spawnAt('GRUNT', k.p.x + 60, k.p.y); for (const q of k.enemies) { q.spawn = 0; q.hp = 9999; } k.p.energy = 0; k.p.aim = 0; k.basicAttack(0);
ok(k.p.energy > 0 && k.p.energy <= 1, 'a Knight basic hit gives a little energy (' + k.p.energy.toFixed(2) + ')');

// thùng thường hay ra năng lượng; thùng đấu trường luôn ra
const c = new Game(14, 'RANGER', {}); c.enemies = []; c.spawnQ = []; c.rand = () => 0.5; c.pickups = [];
c.world.onBreak({ type: 'crate', x: c.p.x + 50, y: c.p.y, v: 0.3 });
ok(c.pickups.some(it => it.kind === 'energy'), 'a normal crate can drop energy (60%)');
c.pickups = []; c.rand = () => 0.95; c.world.onBreak({ type: 'crate', x: c.p.x + 50, y: c.p.y, v: 0.3, supply: true });
ok(c.pickups.some(it => it.kind === 'energy'), 'an arena supply crate always drops energy');

// stage thường không nạp đầy; stage boss nạp đầy
const s = new Game(15, 'MAGE', {}); s.p.energy = 20; s.startStage(2); ok(s.p.energy === 20, 'normal stage start does not refill energy');
s.startStage(5); ok(s.p.energy === s.p.energyMax, 'boss stage start refills energy');
process.exitCode = fail ? 1 : 0;
