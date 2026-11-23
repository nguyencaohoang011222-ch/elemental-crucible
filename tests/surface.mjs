// Tương tác mặt đất: lửa→băng thành nước, nước→nham thành đá đen, lửa lan có giới hạn, nấm nổ độc, lửa+độc nổ, băng trơn.
import { Game } from '../game.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const g = new Game(3, 'MAGE', { training: true, lab: true, theme: 'frost' }), s = g.surface, count = t => [...s.cells.values()].filter(c => c.type === t).length;
s.apply(400, 400, 60, 'ICE'); const ice = count('ice'); s.apply(400, 400, 60, 'FIRE', { rand: () => 0 }); ok(ice > 0 && count('water') === ice, `fire melts ${ice} ice cells into water`);
s.theme = 'volcano'; s.cells.clear(); s.apply(0, 600, 60, 'LAVA'); s.apply(0, 600, 60, 'WATER'); ok(count('obsidian') > 0 && count('lava') === 0, 'water turns lava into obsidian');
s.theme = 'forest'; s.cells.clear(); s.apply(800, 800, 40, 'FIRE', { rand: Math.random }); let mx = 0; for (let i = 0; i < 900; i++) { s.update(1 / 30, Math.random, () => {}); mx = Math.max(mx, count('fire')); } ok(mx > 0 && mx <= 160 && count('fire') === 0, `fire spreads (peak ${mx}) and burns out`);
s.cells.clear(); s.apply(1200, 1200, 50, 'POISON', { life: 6 }); const r = s.apply(1200, 1200, 50, 'FIRE', { rand: () => 0 }); ok(r.some(q => q.kind === 'explode'), 'fire ignites poison into an explosion');
const g2 = new Game(4, 'KNIGHT', { training: true, lab: true, theme: 'dungeon' }); let shroom = null; g2.world.near(g2.p.x, g2.p.y, 1500, o => { if (!shroom && o.type === 'tree') shroom = o; });
g2.world.damageObstacles(shroom.x, shroom.y, 10, 5); ok(shroom.dead && [...g2.surface.cells.values()].some(c => c.type === 'poison'), 'hitting a giant mushroom bursts it into a poison cloud');
const g3 = new Game(5, 'KNIGHT', { training: true, lab: true, theme: 'frost' }); g3.surface.apply(g3.p.x, g3.p.y, 300, 'ICE', { life: 30 }); g3.p.vx = 400; for (let i = 0; i < 30; i++) g3.step(1 / 60, {}); const v1 = Math.abs(g3.p.vx);
const g4 = new Game(5, 'KNIGHT', { training: true, lab: true, theme: 'forest' }); g4.p.vx = 400; for (let i = 0; i < 30; i++) g4.step(1 / 60, {}); ok(v1 > Math.abs(g4.p.vx) * 5, `ice keeps momentum (${v1 | 0} vs ${Math.abs(g4.p.vx) | 0})`);
const g5 = new Game(6, 'KNIGHT', { training: true, lab: true, theme: 'volcano' }); g5.surface.apply(g5.p.x, g5.p.y, 60, 'LAVA', { life: 30 }); const h0 = g5.p.hp; for (let i = 0; i < 60; i++) g5.step(1 / 60, {}); ok(g5.p.hp < h0 - 20, `standing in lava hurts (${h0} → ${g5.p.hp | 0} in 1s)`);
let bomb = null; g5.world.near(g5.p.x, g5.p.y, 2000, o => { if (!bomb && o.type === 'rock') bomb = o; }); g5.world.damageObstacles(bomb.x, bomb.y, 5, 10); ok(!bomb.dead && bomb.fuse > 0, 'hitting a volcano bomb lights its fuse'); g5.p.x = bomb.x + 600; for (let i = 0; i < 160; i++) g5.step(1 / 60, {}); ok(bomb.dead, 'the bomb explodes after its fuse');
process.exitCode = fail ? 1 : 0;
