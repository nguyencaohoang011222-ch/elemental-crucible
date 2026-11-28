// Luật cân bằng chung + đặc sản tuyệt kỹ: hồi chiêu, trần hồi máu, chốt pha boss, cộng hưởng nguyên tố, 12 đặc sản.
import { Game, CD, RESONANCE } from '../game.js';
import { HEAL } from '../defense.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const lab = (cls, seed = 5) => { const g = new Game(seed, cls, { training: true, lab: true }); g.enemies = []; g.spawnQ = []; g.sigils = []; g.p.energy = g.p.energyMax = 999; return g; };
const run = (g, s, it = {}) => { for (let i = 0; i < s * 60; i++) { g.p.energy = Math.max(g.p.energy, 0); g.step(1 / 60, it); g.events.length = 0; } };
const foe = (g, x, y, hp = 5000, type = 'GRUNT') => { const e = g.spawnAt(type, g.p.x + x, g.p.y + y); e.spawn = 0; e.hp = e.max = hp; return e; };

// ---------- hồi chiêu ----------
{ const g = lab('MAGE'), sk = g.coreSkill({ type: 'el', el: 'FIRE' });
  ok(sk.cd > 0.5 && sk.cd < 5, 'single skills have a short cooldown (' + sk.cd + 's)');
  const tri = g.coreSkill({ type: 'tri', els: ['FIRE', 'EARTH', 'WIND'] }); ok(tri.cd >= 6 && tri.cd <= 14, 'ultimates have a long cooldown (' + tri.cd + 's)');
  ok(g.tryCast(sk, { ax: 200, ay: 0 }), 'first cast goes off'); g.events.length = 0;
  run(g, 0.3); ok(!g.tryCast(sk, { ax: 200, ay: 0 }) && g.events.some(e => e.ev === 'notReady'), 'casting again during the cooldown is blocked with a notReady event');
  run(g, sk.cd); g.p.energy = 999; ok(g.tryCast(sk, { ax: 200, ay: 0 }), 'after the cooldown it casts again');
  ok(CD.scale > 0, 'CD.scale is a tunable constant'); }

// ---------- trần hồi máu ----------
{ const g = lab('KNIGHT'), p = g.p; run(g, 1.1); p.hp = 10; const got = g.heal(10000);
  ok(got <= HEAL.perSec * p.max * HEAL.burst + 1e-6 && got > 0, 'one huge heal is capped by the per-second budget (' + got.toFixed(1) + ' HP)');
  const h0 = p.hp; run(g, 1); ok(p.hp - h0 <= HEAL.perSec * p.max * 1.05 + (p.mods.regen || 0) + 2, 'the budget refills at the cap rate');
  p.mods.healMul = 0.5; p.healBud = 1e9; p.hp = 10; const half = g.heal(20); ok(Math.abs(half - 10) < 1e-6, 'healing respects healMul (Blood Pact)'); }

// ---------- chốt pha boss ----------
{ const g = new Game(8, 'MAGE', { element: 'FIRE' }); g.stage = 4; g.enemies = []; g.spawnQ = []; g.startStage(5); const b = g.boss; b.spawn = 0; b.invuln = 0;
  const at = b.def.phases[1].at; g.hurtEnemy(b, b.max * 0.9, 0, 0, 'skill');
  ok(b.hp >= b.max * at - 1e-6 && !b.dead, 'a huge hit stops at the phase threshold (' + (b.hp / b.max).toFixed(2) + ')');
  run(g, 0.3); ok(b.phase === 1 && b.invuln > 0, 'the boss then plays its phase change'); }

// ---------- cộng hưởng nguyên tố ----------
{ const g = lab('MAGE'), p = g.p, tri = g.coreSkill({ type: 'tri', els: ['FIRE', 'EARTH', 'WIND'] }); g.castNow(tri, p.x + 200, p.y);
  ok(p.res && p.res.FIRE > 0 && p.res.EARTH > 0 && p.res.WIND > 0 && !(p.res.WATER > 0), 'an ultimate gives resonance from exactly its three elements');
  ok(p.shield >= p.max * RESONANCE.earthShield - 1e-6, 'Earth resonance gives a shield');
  const e = foe(g, 120, 0); g.labFreezeAI = true; const h = e.hp; g.hurtEnemy(e, 100, 0, 0, 'skill'); ok(Math.abs(h - e.hp - 100 * (1 + RESONANCE.fire)) < 1, 'Fire resonance boosts skill damage');
  const sk = g.coreSkill({ type: 'el', el: 'WATER' }); p.cds[sk.key] = 2; run(g, 0.5); ok(p.cds[sk.key] < 2 - 0.5 * 1.5, 'Wind resonance makes cooldowns tick faster'); }

// ---------- đặc sản tuyệt kỹ ----------
const ultG = (cls, els, setup) => { const g = lab(cls); const es = setup ? setup(g) : []; g.labFreezeAI = true; const sk = g.coreSkill({ type: 'tri', els }); g.castNow(sk, g.p.x + 200, g.p.y); return { g, sk, es }; };
// Knight
{ const g = lab('KNIGHT'), e = foe(g, 100, 0, 1000); g.labFreezeAI = true; e.hp = 200; const h = e.hp; g.applyHit(e, { dmg: 50, exec: 0.6 }, 0); ok(h - e.hp > 50 * 1.5, 'execute: low-HP foes take more damage'); }
{ const { g, sk } = ultG('KNIGHT', ['FIRE', 'EARTH', 'WIND'], g => [foe(g, 160, 0)]); ok(sk.exec > 0 && sk.chain > 0, 'Meteor Blade has execute and kill chaining'); }
{ const { g } = ultG('KNIGHT', ['FIRE', 'WATER', 'WIND'], g => [foe(g, 160, 0)]); run(g, 0.15); ok(g.p.inv > 0, 'Monsoon Dance: you cannot be hit while dancing'); }
{ const { g } = ultG('KNIGHT', ['FIRE', 'WATER', 'EARTH'], g => [foe(g, 200, 0)]); run(g, 0.2); g.p.frozen = 1; run(g, 0.1); ok(g.p.shield > g.p.max * 0.25 && !(g.p.frozen > 0), 'Mountain Titan: big shield and immune to control'); }
{ const { g, es } = ultG('KNIGHT', ['WATER', 'EARTH', 'WIND'], g => [foe(g, 260, 0)]); g.labFreezeAI = false; const d0 = Math.hypot(es[0].x - g.p.x, es[0].y - g.p.y); run(g, 1); ok(Math.hypot(es[0].x - g.p.x, es[0].y - g.p.y) < d0 - 30, 'Sunder Cyclone pulls foes in'); }
// Ranger
{ const { g, es } = ultG('RANGER', ['FIRE', 'EARTH', 'WIND'], g => [foe(g, 160, 40), foe(g, 800, 40)]); const mx = [0, 0]; for (let i = 0; i < 150; i++) { g.step(1 / 60, {}); g.events.length = 0; es.forEach((e, k) => { mx[k] = Math.max(mx[k], e.stun || 0); }); } ok(mx[1] > mx[0] + 0.3, 'Meteor Arrow: farther meteors stun longer (' + mx.map(v => v.toFixed(2)).join(' vs ') + ')'); }
{ const { g, es } = ultG('RANGER', ['WATER', 'EARTH', 'WIND'], g => [foe(g, 200, 0)]); run(g, 1.3); ok(es[0].vulnUntil > g.t && es[0].vuln >= 0.2 && (es[0].root || 0) > 0, 'Pentagram fires by itself, roots and marks'); }
{ const { g, es } = ultG('RANGER', ['FIRE', 'WATER', 'EARTH'], g => [foe(g, 66, 0)]); run(g, 1.2); ok(es[0].vulnUntil > g.t && es[0].slow > 0, 'Firestorm Barrage slows and shreds'); }
{ const { g } = ultG('RANGER', ['FIRE', 'WATER', 'WIND'], g => [foe(g, 300, 0)]); run(g, 0.3); const n0 = g.shots.length; g.basicN = (g.basicN || 0) + 1; run(g, 1 / 60); ok(g.shots.length >= n0 + 3, 'Mirage decoys copy your basic attacks'); }
// Mage
{ const solo = ultG('MAGE', ['FIRE', 'WATER', 'EARTH'], g => [foe(g, 200, 0, 1e6)]); run(solo.g, 2.6);
  const pack = ultG('MAGE', ['FIRE', 'WATER', 'EARTH'], g => [foe(g, 200, 0, 1e6), foe(g, 230, 30, 1e6), foe(g, 230, -30, 1e6), foe(g, 170, 30, 1e6), foe(g, 170, -30, 1e6)]); run(pack.g, 2.6);
  ok(pack.es[0].max - pack.es[0].hp > (solo.es[0].max - solo.es[0].hp) * 1.2, 'Solar Flare hits harder the more foes it pulls in'); }
{ const { g, es } = ultG('MAGE', ['WATER', 'EARTH', 'WIND'], g => [foe(g, 60, 0)]); g.p.energy = 10; run(g, 0.6); ok(es[0].vulnUntil > g.t && g.p.energy > 10, 'Abyssal Tide drowns foes and refunds energy'); }
{ const { g } = ultG('MAGE', ['FIRE', 'EARTH', 'WIND'], g => [foe(g, 200, 0)]); run(g, 1); ok(g.walls.some(w => w.lava), 'Comet Trench leaves a wall'); }
{ const { g, sk } = ultG('MAGE', ['FIRE', 'WATER', 'WIND'], g => [foe(g, 200, 0)]); run(g, 0.2); const s1 = g.coreSkill({ type: 'el', el: 'FIRE' }); g.p.energy = 500; g.p.gcd = 0; g.castNow(s1, g.p.x + 200, g.p.y); ok(g.p.storm > 0 && Math.abs(500 - g.p.energy - s1.cost * (1 - sk.stormRefund)) < 1, 'Thunderhead storm mode: single skills cost half'); }

// ---------- Boomerang Blade: tụ đầy vẫn giữ sóng đẩy lùi và các nâng cấp nhát tụ ----------
{ const { RELIC_BY_ID } = await import('../relics.js');
  const g = lab('KNIGHT'), p = g.p; g.labFreezeAI = true; RELIC_BY_ID.boomerang.apply(p.mods, g); p.mods.swordWave = 1; g.refreshStats(false);
  const near = foe(g, -120, 0), n0 = g.shots.length; const x0 = near.x;
  g.basicAttack(1); run(g, 0.2);
  ok((g.relicFx || []).some(f => f.type === 'blade'), 'full charge still throws the Boomerang Blade');
  ok(Math.abs(near.x - x0) > 5 || near.hp < near.max, 'the charged knockback wave still hits foes behind you');
  ok(g.shots.length > n0 || g.shots.some(s => s.kind === 'wave'), 'Sword Wave still fires on a Boomerang throw'); }

// ---------- boss 4 (Ignivar) có bộ chiêu mới, boss 4–5 dồn đòn hơn ----------
{ const { BOSS_DEFS } = await import('../boss.js'); const D = BOSS_DEFS.find(d => d.id === 'DRAGON'), S = BOSS_DEFS.find(d => d.id === 'SOVEREIGN');
  ok(['clawcombo', 'emberrain', 'flamewall'].every(m => D.phases.some(ph => ph.moves.includes(m))), 'Ignivar has its new moves');
  ok(D.idleMul < 1 && S.idleMul < 1 && D.staggerMul < 1 && S.staggerMul < 1, 'bosses 4 and 5 rest less and stay staggered shorter'); }

if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
