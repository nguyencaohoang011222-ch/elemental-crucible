// Nâng cấp đánh thường: Multishot, Twin Orb, Sword Wave, Quick Charge, Ricochet.
import { Game } from '../game.js';
import { MINOR_BY_ID } from '../upgrades.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const mk = (cls, ups) => { const g = new Game(1, cls, { training: true }); for (const u of ups) MINOR_BY_ID[u].apply(g.p.mods, g); g.refreshStats(false); return g; };
let g = mk('RANGER', ['multishot', 'multishot']); g.basicAttack(0); ok(g.shots.filter(s => s.kind === 'arrow').length === 3, 'Multishot ×2 fires 3 arrows');
g = mk('MAGE', ['twinorb']); g.basicAttack(0.5); ok(g.shots.filter(s => s.kind === 'orb').length === 2, 'Twin Orb fires 2 orbs');
g = mk('KNIGHT', ['swordwave']); g.basicAttack(1); ok(g.shots.filter(s => s.kind === 'wave').length === 3, 'Sword Wave at full charge fires 3 crescents');
const t = (ups) => { const q = mk('KNIGHT', ups); let n = 0; while (q.p.charge < 1 && n < 400) { q.updatePlayer(1 / 60, { fireHeld: true }); n++; } return n; };
const a = t([]), b = t(['qcharge', 'qcharge']); ok(b < a, `Quick Charge ×2 shortens full charge (${a} → ${b} frames)`);
g = mk('RANGER', ['ricochet']); g.spawnAt('GRUNT', g.p.x + 120, g.p.y); g.spawnAt('GRUNT', g.p.x + 120, g.p.y + 150); for (const e of g.enemies) e.spawn = 0; g.p.aim = 0; g.basicAttack(0); const ev = []; for (let i = 0; i < 40; i++) { g.updateShots(1 / 60); ev.push(...g.events.map(e => e.ev)); g.events.length = 0; } ok(ev.includes('ricochet'), 'Ricochet bounces to a second enemy');
// Ranger Focus: slow motion is limited, can't be re-spammed, and refills
{ const q = mk('RANGER', []), dt = 1 / 60; let slow = 0, ts = [];
  for (let i = 0; i < 180; i++) { q.step(dt, { fireHeld: true, ax: q.p.x + 200, ay: q.p.y }); if (q.p.slowmo) slow++; ts.push(q.timeScale); }
  ok(slow * dt > 1.0 && slow * dt < 1.35, 'Ranger slow motion lasts ~1.2s per full Focus (' + (slow * dt).toFixed(2) + 's)');
  ok(ts.includes(0.55) && ts[ts.length - 1] === 1, 'Focus slows the world to 55%, then time returns to normal while still drawing');
  q.step(dt, {}); let again = 0; for (let i = 0; i < 30; i++) { q.step(dt, { fireHeld: true }); if (q.p.slowmo) again++; } q.step(dt, {});
  ok(again === 0, 'Re-drawing with little Focus left gives no slow motion');
  for (let i = 0; i < 240; i++) q.step(dt, {}); ok(q.p.focus > 0.99, 'Focus refills after ~4s without drawing (' + q.p.focus.toFixed(2) + ')');
  let back = 0; for (let i = 0; i < 30; i++) { q.step(dt, { fireHeld: true }); if (q.p.slowmo) back++; } ok(back > 15, 'Slow motion works again once Focus has refilled'); }
// dash cooldowns per hero
for (const [cls, cd] of [['KNIGHT', 1.15], ['RANGER', 1.35], ['MAGE', 1.25]]) { const q = mk(cls, []); q.step(1 / 60, { dash: true, mx: 1 }); q.dashQ = true; ok(Math.abs(q.p.dashCd - cd) < 0.05, cls + ' dash cooldown ' + cd + 's (' + q.p.dashCd.toFixed(2) + ')'); }
// dash goes a bit farther than each hero's own wind dash skill (Gale Charge 110, Mist Tumble 80, Tempest Blink 100)
import('../sim.js').then(({ CLASSES }) => { for (const [cls, skill] of [['KNIGHT', 110], ['RANGER', 80], ['MAGE', 100]]) { const D = CLASSES[cls].dash; ok(D.speed * D.time > skill, cls + ' dash ' + Math.round(D.speed * D.time) + 'px > wind skill ' + skill + 'px'); } process.exitCode = fail ? 1 : 0; });
process.exitCode = fail ? 1 : 0;
