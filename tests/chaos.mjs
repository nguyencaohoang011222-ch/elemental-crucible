// Cursed Relics (thợ rèn): cửa hàng 3 món + reroll + 1 món mỗi lần ghé, và từng relic: lợi + cái giá. Thêm kinh tế vàng và nerf Ranger.
import { Game } from '../game.js';
import { CLASSES } from '../sim.js';
import * as FG from '../forge.js';
import * as R from '../relics.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const mk = (cls, ...ids) => { const g = new Game(7, cls, { training: true }); g.enemies = []; g.spawnQ = []; for (const id of ids) { R.RELIC_BY_ID[id].apply(g.p.mods, g); g.p.relics.add(id); } g.refreshStats(true); return g; };
const foe = (g, dx, dy, type = 'GRUNT') => { const e = g.spawnAt(type, g.p.x + dx, g.p.y + dy) || g.enemies[g.enemies.length - 1]; e.spawn = 0; e.atkCd = 99; return e; };
const tick = (g, s) => { for (let i = 0; i < Math.round(s * 60); i++) R.tickRelics(g, 1 / 60); };

// ---------- cửa hàng ----------
{ const g = new Game(3, 'RANGER'); g.p.gold = 2000; FG.enterForge(g);
  ok(g.relicOffer.length === 3 && g.relicOffer.every(id => { const r = R.RELIC_BY_ID[id]; return !r.cls || r.cls === 'RANGER'; }), 'a visit offers 3 relics that fit the hero (' + g.relicOffer.join(', ') + ')');
  const c = [R.rerollRelics(g).cost, R.rerollRelics(g).cost, R.rerollRelics(g).cost]; ok(c.join() === '30,45,70', 'gold rerolls cost 30 → 45 → 70 (' + c.join() + ')');
  const gemR = R.rerollRelics(g, 'gem'); ok(gemR.gems === R.RELIC_REROLL_GEMS && g.relicOffer.length === 3, 'gem reroll asks ' + R.RELIC_REROLL_GEMS + ' gems and rerolls the offer');
  const id = g.relicOffer[0], r1 = R.buyRelic(g, id); ok(!r1.error && g.p.relics.has(id), 'buying a relic works (' + id + ')');
  ok(!!R.buyRelic(g, g.relicOffer[1]).error, 'only one relic per visit'); ok(!!R.rerollRelics(g).error, 'no rerolls after buying this visit');
  FG.enterForge(g); ok(g.visitRelics === 0 && g.relicRerolls === 0 && !g.relicOffer.includes(id), 'next visit: fresh offer, reroll price reset, owned relic never offered again');
  g.p.gold = 0; ok(!!R.buyRelic(g, g.relicOffer[0]).error, 'cannot buy without gold'); }
{ const g = new Game(3, 'KNIGHT'); g.p.gold = 0; FG.enterForge(g); ok(g.relicOffer.every(id => !['cursed', 'gambit', 'blackhole'].includes(id)), 'Knight is never offered Ranger/Mage relics'); }

// ---------- từng relic ----------
{ const a = mk('KNIGHT'), b = mk('KNIGHT', 'glass'); ok(b.p.max === Math.round(a.p.max * 0.65), `Glass Cannon: max HP ${a.p.max} → ${b.p.max}`);
  a.hurtPlayer(20, 0); b.p.hp = b.p.max; const h0 = b.p.hp; b.hurtPlayer(20, 0); ok((h0 - b.p.hp) > (a.p.max - a.p.hp) * 1.1, 'Glass Cannon: you take ~15% more damage');
  ok(b.p.mods.dmg >= 1.39, 'Glass Cannon: +40% damage'); }
{ const g = mk('KNIGHT', 'blood'); g.p.hp = 16; g.basicAttack(0); g.p.atkT = 0; ok(g.p.hp === 15, 'Blood Pact: a swing costs 1 HP'); g.basicAttack(0); ok(g.p.hp === 15, 'Blood Pact: never below 15 HP'); ok(g.p.mods.healMul < 1, 'Blood Pact: healing reduced'); }
{ const g = mk('RANGER', 'unstable'); for (let i = 0; i < 5; i++) { g.basicAttack(0); g.p.atkT = 0; } ok(g.events.some(e => e.ev === 'unstable'), 'Unstable Ammo: the 5th shot rolls a wild effect'); }
{ const g = mk('KNIGHT', 'static'); for (let i = 0; i < 12; i++) { g.p.x += 60; R.tickRelics(g, 1 / 60); } ok(g.p.static === 10, 'Static: walking charges up to 10 (' + g.p.static + ')');
  const e1 = foe(g, 120, 0), e2 = foe(g, 200, 40); const h1 = e1.hp, h2 = e2.hp; g.p.aim = Math.PI; g.basicAttack(0); ok(g.p.static === 0 && e1.hp < h1 && e2.hp < h2, 'Static: the next attack discharges lightning through 2 enemies');
  g.p.static = 6; tick(g, 1.2); ok(g.p.static === 0, 'Static: standing still for 1s drains it'); }
{ const g = mk('KNIGHT', 'potato'), e1 = foe(g, 200, 0), e2 = foe(g, 260, 0); e1.hp = e2.hp = 500;
  R.relicHit(g, e1, 'slash'); const b = g.relicFx.find(f => f.type === 'potato'); ok(b && b.e === e1, 'Hot Potato: a basic hit plants the bomb');
  tick(g, 0.3); R.relicHit(g, e2, 'slash'); ok(b.e === e2 && b.mult > 1.1, 'Hot Potato: hitting another enemy passes it on, stronger');
  tick(g, 3); ok(e1.hp < 500 && e2.hp < 500 && !g.relicFx.some(f => f.type === 'potato'), 'Hot Potato: it blows up after 3s'); }
{ const g = mk('KNIGHT', 'potato'), e = foe(g, 30, 0); e.hp = 500; const h = g.p.hp; R.relicHit(g, e, 'slash'); g.p.inv = 0; tick(g, 3.1); ok(g.p.hp < h, 'Hot Potato: blowing up next to you hurts you'); }
{ const g = mk('KNIGHT', 'chain'); const a = foe(g, 200, 0), b = foe(g, 240, 0), c = foe(g, 280, 0); const hb = b.hp; a.hp = 1; g.hurtEnemy(a, 5, 0, 0, 'slash');
  ok(a.dead && b.hp < hb && (g._chainD || 0) === 0, 'Chain Reaction: a basic kill explodes into its neighbours (and the chain counter resets)'); }
{ const g = mk('KNIGHT', 'chain'), a = foe(g, 30, 0); a.hp = 1; const h = g.p.hp; g.p.inv = 0; g.hurtEnemy(a, 5, 0, 0, 'slash'); ok(g.p.hp < h, 'Chain Reaction: a blast next to you hurts you'); }
{ const g = mk('MAGE', 'polter', 'bats'); g.rand = () => 0; g.p.energy = 50; const e = foe(g, 200, 0); e.dead = true; R.relicKill(g, e, 'skill');
  ok(g.relicFx.some(f => f.type === 'ghost') && g.p.energy === 48, 'Poltergeist: a skill kill releases a ghost and drains 2 energy');
  ok(g.relicFx.some(f => f.type === 'bat') && g.p.mods.regenMul === 0.5, 'Vampire Bats: a skill kill releases a bat; regen halved');
  const t = foe(g, 260, 0), h = t.hp; tick(g, 1.5); ok(t.hp < h, 'ghost / bat fly to an enemy and bite it'); }
{ const g = mk('MAGE', 'overclock'); R.relicAfterCast(g, { key: 'x' }, 0, 0); ok(g.p.ocT === 2, 'Overclock: casting starts a 2s window');
  const e0 = g.p.energy = 10; g.gainEnergy(20); ok(g.p.energy === e0, 'Overclock: no energy gain during the window'); tick(g, 2.1); g.gainEnergy(20); ok(g.p.energy > e0, 'Overclock: energy gain returns afterwards'); }
{ const g = mk('MAGE', 'wild'); let off = 0, max = 0; for (let i = 0; i < 40; i++) { const [x, y] = R.relicCastAim(g, 500, 500), d = Math.hypot(x - 500, y - 500); max = Math.max(max, d); if (d > 1) off++; }
  ok(off > 30 && max <= 60.01, 'Wild Magic: every skill lands up to 60px off target (max ' + max.toFixed(1) + ')'); }
{ const g = mk('KNIGHT', 'boomerang'); g.basicAttack(1); ok(g.relicFx.some(f => f.type === 'blade'), 'Boomerang Blade: a full charge throws the sword');
  g.p.atkT = 0; const sw = g.events.filter(e => e.ev === 'swing').length; g.basicAttack(0); ok(g.events.filter(e => e.ev === 'swing').length === sw, 'Boomerang Blade: no swings while it flies');
  tick(g, 0.1); ok(g.p.bladeOut, 'Boomerang Blade: slower while it flies'); tick(g, 2); ok(!g.relicFx.some(f => f.type === 'blade'), 'Boomerang Blade: it comes back'); }
{ const g = mk('MAGE', 'blackhole'); ok(g.p.chargeSpd < 0.81, 'Black Hole Orb: charging is 25% slower');
  g.basicAttack(1); ok(g.shots.some(s => s.hole), 'Black Hole Orb: a 90%+ orb is marked'); const e = foe(g, 100, 0); R.relicExplode(g, { x: g.p.x, y: g.p.y, hole: true });
  const d0 = Math.hypot(e.x - g.p.x, e.y - g.p.y); tick(g, 0.6); ok(Math.hypot(e.x - g.p.x, e.y - g.p.y) < d0 - 20, 'Black Hole Orb: enemies get dragged in'); }
{ const g = mk('RANGER', 'cursed'); for (let i = 0; i < 6; i++) { g.basicAttack(0); g.p.atkT = 0; } ok(g.shots.filter(s => s.cursed).length === 1, 'Cursed Arrow: every 6th arrow is cursed');
  const e = foe(g, 90, 0); e.hp = 500; e.doomT = 3; const h = e.hp; g.hurtEnemy(e, 10, 0, 0, 'skill'); ok(Math.abs((h - e.hp) - 11.5) < 0.6, 'Doom: +15% damage taken'); }
{ const a = mk('RANGER'), b = mk('RANGER', 'gambit'); a.basicAttack(1); b.basicAttack(1); const sa = a.shots[a.shots.length - 1], sb = b.shots[b.shots.length - 1];
  ok(sb.dmg > sa.dmg * 1.45 && sb.life > sa.life * 1.45, "Hunter's Gambit: full charge +50% damage and range");
  b.p.focus = 1; b.p.dashT = 0.1; R.tickRelics(b, 1 / 60); ok(Math.abs(b.p.focus - 0.85) < 0.01, "Hunter's Gambit: a dash burns 15% Focus"); }

// ---------- Ranger nerf ----------
{ const C = CLASSES.RANGER; ok(C.speed === 196 && C.basicDmg === 1.1 && C.dash.speed * C.dash.time > 80 && C.dash.speed * C.dash.time < 100, 'Ranger: speed 196, basic ×1.1, short dash (~85px)');
  const g = mk('RANGER'); g.basicAttack(0); const s = g.shots[g.shots.length - 1]; ok(s.speed * s.life < 400, 'Ranger: quick arrows fly under 400px (' + Math.round(s.speed * s.life) + ')'); }
// Ranger: slowest dash; charged arrows pierce one extra enemy at 25%
{ const g = mk('RANGER'); ok(CLASSES.RANGER.dash.cd > Math.max(CLASSES.KNIGHT.dash.cd, CLASSES.MAGE.dash.cd), 'Ranger has the slowest dash cooldown (' + CLASSES.RANGER.dash.cd + 's)');
  const e1 = foe(g, 120, 0), e2 = foe(g, 170, 0), e3 = foe(g, 220, 0); for (const e of [e1, e2, e3]) e.hp = e.max = 2000; g.p.aim = 0; g.basicAttack(1);
  for (let i = 0; i < 40; i++) g.updateShots(1 / 60); const d1 = 2000 - e1.hp, d2 = 2000 - e2.hp, d3 = 2000 - e3.hp;
  ok(d1 > 0 && d2 > 0 && d3 === 0, 'full charge pierces only one extra enemy (' + [d1, d2, d3].map(Math.round).join(' / ') + ')'); ok(Math.abs(d2 - d1 * 0.25) < d1 * 0.06, 'the pierced enemy takes 25% damage'); }
// ---------- relic cho chiêu ----------
const evN = (g, n) => g.events.filter(e => e.ev === n).length;
{ const g = mk('MAGE', 'echo'), sk = g.coreSkill(g.p.cores[0]); foe(g, 200, 0).hp = 9999; g.p.energyMax = g.p.energy = 999;
  for (let i = 0; i < 4; i++) { g.p.gcd = 0; g.castNow(sk, g.p.x + 200, g.p.y); } for (let i = 0; i < 60; i++) g.step(1 / 60, {});
  ok(evN(g, 'echoCast') === 1 && g.casts >= 5, 'Echo Chamber: the 4th cast repeats itself once (' + evN(g, 'echoCast') + ' echo, ' + g.casts + ' casts)'); ok(g.p.mods.cd > 1.14, 'Echo Chamber: skills cost 15% more'); }
{ const g = mk('MAGE', 'gravity'); g.rand = () => 0; const e = foe(g, 200, 0); e.hp = e.max = 9999; g.hurtEnemy(e, 5, 0, 0, 'skill'); g.hurtEnemy(e, 5, 0, 0, 'skill');
  ok(g.relicFx.filter(f => f.type === 'hole').length === 1, 'Gravity Well: a skill hit opens one black hole, then waits 2.5s');
  g.t += 2.6; g.hurtEnemy(e, 5, 0, 0, 'skill'); ok(g.relicFx.filter(f => f.type === 'hole').length === 2, 'Gravity Well: ready again after 2.5s'); }
{ const g = mk('KNIGHT', 'bloodmagic'), sk = g.coreSkill(g.p.cores[0]); ok(g.p.energyMax === 70, 'Blood Magic: max energy 100 → ' + g.p.energyMax);
  g.p.energy = 0; const h0 = g.p.hp, n0 = g.casts; g.castNow(sk, g.p.x + 100, g.p.y); ok(g.casts === n0 + 1 && h0 - g.p.hp === Math.ceil(sk.cost / 2), 'Blood Magic: casting with 0 energy costs ' + Math.ceil(sk.cost / 2) + ' HP (lost ' + Math.round(h0 - g.p.hp) + ')');
  g.p.energy = 0; g.p.hp = g.p.max * 0.2 + 2; g.p.gcd = 0; const n1 = g.casts; g.castNow(sk, g.p.x + 100, g.p.y); ok(g.casts === n1, 'Blood Magic: never takes you below 20% HP'); }
{ const g = mk('MAGE', 'overload'), es = [foe(g, 200, 0), foe(g, 220, 30), foe(g, 230, -30)]; for (const e of es) e.hp = e.max = 9999;
  g._castId = 99; g._castCost = 40; g.p.energy = 0; for (const e of es) g.hurtEnemy(e, 5, 0, 0, 'skill'); ok(g.p.energy === 14, 'Chain Caster: hitting 3 enemies refunds 35% of 40 (' + g.p.energy + ')');
  const lone = foe(g, -500, 0); ok(Math.abs(R.relicHit(g, lone, 'skill') - 0.85) < 1e-9, 'Chain Caster: a lone target takes 15% less'); }
{ const g = mk('KNIGHT', 'spellblade'), sk = g.coreSkill(g.p.cores[0]), e = foe(g, 60, 0); e.hp = e.max = 9999; g.p.aim = 0;
  R.relicAfterCast(g, sk, 0, 0); ok(g.p.spellblade === 2, 'Spellblade: a cast charges the next 2 basic attacks'); g.p.atkT = 0; g.basicAttack(0); ok(g.p.spellblade === 1 && evN(g, 'boom') >= 1, 'Spellblade: the empowered swing bursts'); ok(g.p.atkSpeed < 0.86, 'Spellblade: attack speed −15%'); }
// ---------- Knight ----------
{ const g = mk('KNIGHT', 'relentless'), e = foe(g, 90, 0); e.hp = e.max = 99999; let full = 0;
  for (let i = 0; i < 180; i++) { g.step(1 / 60, { ax: e.x, ay: e.y, fireHeld: true }); full += g.events.filter(v => v.ev === 'swing' && v.charge >= 1).length; g.events.length = 0; }
  ok(full >= 2, 'Relentless Blade: holding for 3s swings full charges by itself (' + full + ')'); }
{ const g = mk('KNIGHT', 'juggernaut'), a = foe(g, 70, 0), b = foe(g, 110, 0); a.hp = a.max = b.hp = b.max = 999; g.p.dashCd = 0;
  for (let i = 0; i < 30; i++) g.step(1 / 60, i === 0 ? { mx: 1, my: 0, dash: true, ax: g.p.x + 300, ay: g.p.y } : { mx: 1, my: 0 });
  ok(a.hp < 999 && b.hp < 999, 'Juggernaut: dashing through enemies damages both (' + (999 - a.hp | 0) + ' / ' + (999 - b.hp | 0) + ')'); ok(evN(g, 'jugReset') === 1, 'Juggernaut: hitting 2 halves the dash cooldown'); }
{ const g = mk('KNIGHT', 'riposte'), sh = foe(g, 300, 0, 'SHOOTER'); sh.hp = sh.max = 999; g.p.aim = 0; g.p.swing = 0.2; g.foes = [{ x: g.p.x + 50, y: g.p.y, vx: -200, vy: 0, life: 2, dmg: 10, r: 6 }];
  g.updateFoeShots(1 / 60); ok(g.shots.some(s => s.kind === 'wave' && s.vx > 0), 'Mirror Guard: a cut projectile flies back at the shooter'); }
// Reflecting Edge (nâng cấp Knight): bật đạn về kẻ bắn, đỡ trước khi đạn chạm người, cấp 2 đỡ được góc rộng hơn
{ const { MINOR_BY_ID: U } = await import('../upgrades.js');
  const g = mk('KNIGHT'), sh = foe(g, 300, 0, 'SHOOTER'); sh.hp = sh.max = 999; U.deflect.apply(g.p.mods, g); g.p.aim = 0; g.p.swing = 0.2; const hp0 = g.p.hp;
  g.foes = [{ x: g.p.x + 14, y: g.p.y, vx: -260, vy: 0, life: 2, dmg: 10, r: 7 }]; g.updateFoeShots(1 / 60);
  const w = g.shots.find(s => s.kind === 'wave' && s.vx > 0); ok(w && Math.abs(w.dmg - 10 * (g.p.basicMul || 1)) < 0.01 && g.p.hp === hp0, 'Reflecting Edge: a swing bounces a point-blank shot back at 100% and you take no damage');
  const g0 = mk('KNIGHT'); g0.p.aim = 0; g0.p.swing = 0.2; g0.p.slashRef = { reach: 104, arc: 1.4, a: 0 }; g0.foes = [{ x: g0.p.x + 95, y: g0.p.y + 95, vx: -100, vy: -100, life: 2, dmg: 10, r: 6 }]; g0.updateFoeShots(1 / 60);
  const g2 = mk('KNIGHT'); U.deflect.apply(g2.p.mods, g2); U.deflect.apply(g2.p.mods, g2); g2.p.aim = 0; g2.p.swing = 0.2; g2.p.slashRef = { reach: 104, arc: 1.4, a: 0 }; g2.foes = [{ x: g2.p.x + 95, y: g2.p.y + 95, vx: -100, vy: -100, life: 2, dmg: 10, r: 6 }]; g2.updateFoeShots(1 / 60);
  const w2 = g2.shots.find(s => s.kind === 'wave');
  ok(g0.foes.length === 1 && g2.foes.length === 0 && w2 && Math.abs(w2.dmg - 16 * (g2.p.basicMul || 1)) < 0.01, 'level 2 reaches further: parries a shot 134px out, past the visible slash (base Knight cannot) and returns it at 160%'); }
{ const { MINOR_BY_ID: U } = await import('../upgrades.js');
  { const g = mk('KNIGHT'), e = foe(g, 260, 0); e.hp = e.max = 9999; U.gapcloser.apply(g.p.mods); g.p.aim = 0; const x0 = g.p.x; g.basicAttack(1); ok(g.p.x - x0 > 60 && e.hp < 9999, 'Gap Closer: a charged swing lunges ' + Math.round(g.p.x - x0) + 'px and hits a foe out of reach'); }
  { const g = mk('KNIGHT'); U.quakewave.apply(g.p.mods); g.p.aim = 0; g.basicAttack(1); ok(g.shots.some(s => s.kind === 'wave' && s.pierce >= 99), 'Shockwave Mastery: a full charge sends a ground wave'); }
  { const g = mk('KNIGHT'), e = foe(g, 60, 0); e.hp = e.max = 9999; U.rhythm.apply(g.p.mods); g.p.aim = 0; g.basicAttack(0); ok(g.p.chargePre === 0.25, 'Battle Rhythm: a connecting swing pre-loads 25% charge'); }
  ok(CLASSES.KNIGHT.skillDmg === 1.1, 'Knight skills deal 10% more'); }
// ---------- Black Hole Orb ----------
for (const [hold, want] of [[1.6, 1], [0.5, 0]]) { const g = mk('MAGE', 'blackhole'), e = foe(g, 260, 0); e.hp = e.max = 9999;
  for (let i = 0; i < hold * 60; i++) g.step(1 / 60, { ax: e.x, ay: e.y, fireHeld: true }); for (let i = 0; i < 90; i++) g.step(1 / 60, { ax: e.x, ay: e.y });
  ok(evN(g, 'blackHole') === want, 'Black Hole Orb: holding ' + hold + 's → ' + evN(g, 'blackHole') + ' black hole(s) (want ' + want + ')'); }
process.exitCode = fail ? 1 : 0;
