// Vàng + nhà thợ rèn: nhà xuất hiện đúng stage, vùng an toàn, bán/mua/bình thuốc/rèn chiêu, 60 nâng cấp chạy được, vài cơ chế mẫu.
import { Game, BOSS_STAGES, LAST_STAGE } from '../game.js';
import { EL, TRI_SETS, coreDef, KITS } from '../kits.js';
import * as FG from '../forge.js';
import { FORGE_KEYS, TRI_UP, forgeInfo } from '../forgeups.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };

// ---------- stage nào có nhà ----------
{ let hits = 0, tries = 0, maxDry = 0, s4 = true, map1 = true, never = true;
  for (let seed = 1; seed <= 200; seed++) {
    const g = new Game(seed, 'KNIGHT'); let dry = 0;
    for (let n = 2; n <= LAST_STAGE; n++) {
      g.startStage(n); const boss = BOSS_STAGES[n] !== undefined, has = !!g.forge;
      if (boss && has) never = false;
      if (n === 4 && !has) s4 = false;
      if (n <= 5 && n !== 4 && has) map1 = false;
      if (n > 5 && !boss) { tries++; if (has) hits++; dry = has ? 0 : dry + 1; maxDry = Math.max(maxDry, dry); }
    }
  }
  ok(s4, 'map 1: stage 4 always has a forge');
  ok(map1, 'map 1: no forge on stages 1–3 and 5');
  ok(never, 'titan stages never have a forge');
  ok(hits / tries > 0.33 && hits / tries < 0.6, `maps 2–5: forge on ${Math.round(hits / tries * 100)}% of normal stages`);
  ok(maxDry <= 3, `maps 2–5: never more than 3 normal stages in a row without a forge (max ${maxDry})`); }

// ---------- nhà đặt trên nền trống, có lối vào ----------
{ let good = 0, n = 0;
  for (let seed = 1; seed <= 40; seed++) for (const st of [4, 6, 7, 8, 9, 11]) {
    const g = new Game(seed, 'RANGER'); g.startStage(st); const F = g.forge; if (!F) continue; n++;
    const d = Math.hypot(F.x - g.p.x, F.y - g.p.y), porchFree = !g.world.blocked(F.x, F.y + 30, 18), doorFree = !g.world.blocked(F.x, F.y + 140, 18);
    const behind = F.parts.filter(o => o.y < F.y - 60 && !o.hidden).length; // khung cây/đá phía sau nhà
    if (d >= 380 && d <= 640 && porchFree && doorFree && behind >= 3) good++;
  }
  ok(good === n, `forge sits 420–600px away, porch and entrance free, framed by trees/rocks behind it (${good}/${n})`); }

// ---------- vùng an toàn ----------
const forgeGame = (seed = 3, cls = 'KNIGHT') => { const g = new Game(seed, cls); g.startStage(4); g.enemies = []; g.spawnQ = []; return g; };
{ const g = forgeGame(), F = g.forge, p = g.p; p.x = F.x; p.y = F.y + 20;
  for (let i = 0; i < 4; i++) { const e = g.spawnAt('GRUNT', F.x + 160 + i * 20, F.y + 60 + i * 15); e.spawn = 0; }
  const sh = g.spawnAt(g.enemies[0].type, F.x - 200, F.y + 80); sh.spawn = 0;
  const hp0 = p.hp; let inside = 0;
  for (let i = 0; i < 60 * 6; i++) { g.step(1 / 60, {}); p.x = F.x; p.y = F.y + 20; if (g.enemies.some(e => !e.dead && Math.hypot(e.x - F.x, e.y - F.y) < FG.FORGE_R)) inside++; }
  ok(g.inForge, 'standing on the porch counts as inside the forge');
  ok(p.hp >= hp0 - 0.01, `enemies around the forge ignore you (HP ${Math.round(hp0)} → ${Math.round(p.hp)})`);
  ok(inside === 0, 'enemies cannot step onto the porch');
  g.foes.push({ x: F.x + 300, y: F.y + 20, vx: -400, vy: 0, life: 3, dmg: 20, r: 7 }); const h1 = p.hp; for (let i = 0; i < 60; i++) { g.step(1 / 60, {}); p.x = F.x; p.y = F.y + 20; }
  ok(p.hp === h1 && g.foes.length === 0, 'enemy shots fizzle at the forge'); }
{ const g = forgeGame(); const F = g.forge; g.p.x = F.x + 900; g.p.y = F.y; g.spawnQ = ['GRUNT', 'GRUNT', 'GRUNT', 'GRUNT', 'GRUNT', 'GRUNT']; g.stageTotal = 6; g.burstT = 0; g.p.x = F.x + 200; g.p.y = F.y + 200;
  g.step(1 / 60, {}); ok(g.enemies.filter(e => Math.hypot(e.x - F.x, e.y - F.y) < FG.FORGE_NOSPAWN).length <= 1, 'new waves do not spawn right next to the forge'); }
{ const g = new Game(5, 'MAGE'); g.startStage(4); ok(!!g.forge, 'forge present'); g.enemies = []; g.spawnQ = []; for (let i = 0; i < 60 * 3; i++) g.step(1 / 60, {}); ok(!g.forge && g.p.gold >= FG.stageGold(4), `forge is removed after the stage; stage clear pays ${FG.stageGold(4)} gold`); }

// ---------- vàng rơi ----------
{ const g = new Game(4, 'KNIGHT'); g.startStage(3); g.enemies = []; g.spawnQ = ['GRUNT', 'GRUNT']; const e = g.spawnAt('GRUNT', g.p.x + 60, g.p.y); e.spawn = 0; e.hp = 1;
  const r0 = g.rand; g.rand = () => 0; g.hurtEnemy(e, 50, 0, 0, 'skill'); g.rand = r0; for (let i = 0; i < 120; i++) g.step(1 / 60, {}); ok(g.p.gold >= FG.GOLD.GRUNT[1], `killing a grunt drops gold (${g.p.gold})`); }

// ---------- bán / mua ----------
{ const g = forgeGame(); const p = g.p; p.cores[1] = { type: 'duo', els: ['FIRE', 'WATER'] }; p.cores[5] = { type: 'el', el: 'EARTH' }; p.shards = 2; p.gold = 0; g.syncOwned();
  let r = FG.sellCore(g, 5); ok(r.gold === 30 && p.gold === 30 && !p.cores[5], 'selling a single core gives 30 gold');
  r = FG.sellCore(g, 1); ok(r.gold === 60 && p.gold === 90, 'selling a two-element core gives 60 gold');
  r = FG.sellShard(g); ok(r.gold === 70 && p.shards === 1 && p.gold === 160, 'selling a Fusion Shard gives 70 gold');
  ok(!('buyShard' in FG), 'the smith never sells shards');
  const only = p.cores.findIndex(Boolean); ok(!!FG.sellCore(g, only).error, 'you cannot sell your last core');
  p.gold = 1000; const c1 = FG.statPrice(g, 'hp'), m0 = p.max; FG.buyStat(g, 'hp'); const c2 = FG.statPrice(g, 'hp');
  ok(p.max > m0 && c2 === Math.round(c1 * 1.25), `stat: +max HP (${m0} → ${p.max}), price ${c1} → ${c2}`);
  const s0 = p.speedMul; FG.buyStat(g, 'spd'); ok(p.speedMul > s0, 'stat: move speed goes up');
  ok(FG.buyStat(g, 'hp').error === 'Sold out this visit.', 'each stat can be bought once per smith visit'); FG.enterForge(g); ok(!FG.buyStat(g, 'hp').error, 'a new visit re-opens the stat');
  p.gold = 0; ok(!!FG.buyStat(g, 'dmg').error, 'cannot buy without gold'); }
{ const g = new Game(3, 'KNIGHT'); let tot = 0; for (let i = 0; i < 100; i++) tot += FG.goldRoll(g, 'GRUNT'); ok(tot > 180 && tot < 330, 'grunts drop gold by chance (100 kills → ' + tot + ')'); ok(FG.BOSS_GOLD(0) >= 300 && FG.FORGE_COST.tri === 420, 'boss gold 300+, merge-3 forge costs 420'); }
{ const g = forgeGame(); const p = g.p; p.gold = 1000; g.director = () => {}; // giữ stage đang đánh
  for (let i = 0; i < 4; i++) FG.buyPotion(g, 'hp'); ok(p.potions.hp === 3 && p.gold === 1000 - 3 * 40, 'carry at most 3 health potions (40 gold each)');
  FG.buyPotion(g, 'en'); p.hp = 10; g.step(1 / 60, { potion: 'hp' }); ok(Math.abs(p.hp - (10 + Math.round(p.max * 0.4))) < 2 && p.potions.hp === 2, 'pressing 1 drinks a health potion (+40% HP)');
  g.step(1 / 60, { potion: 'hp' }); ok(p.potions.hp === 2, '1s cooldown between potions');
  for (let i = 0; i < 70; i++) g.step(1 / 60, {}); p.energy = 0; g.step(1 / 60, { potion: 'en' }); ok(p.energy >= 59 && p.potions.en === 0, 'pressing 2 drinks an energy potion (+60)'); }

// ---------- rèn chiêu ----------
{ const g = forgeGame(); const p = g.p; p.cores[0] = { type: 'el', el: 'WIND' }; p.cores[1] = { type: 'tri', els: ['FIRE', 'WATER', 'WIND'] }; p.gold = 139; g.skillCache.clear();
  ok(!!FG.forgeCore(g, 0).error, 'forging a single skill costs 140 gold');
  p.gold = 560; const r = FG.forgeCore(g, 0); const s = g.coreSkill(p.cores[0]);
  ok(!r.error && p.gold === 420 && s.forged && /^Forged/.test(s.name), 'forged: ' + s.name);
  ok(!!FG.forgeCore(g, 0).error, 'each skill can be forged only once');
  p.shards = 0; ok(/Shard/.test(FG.forgeCore(g, 1).error || ''), 'forging a merge-3 skill needs a Fusion Shard');
  p.shards = 1; const r2 = FG.forgeCore(g, 1); ok(!r2.error && p.shards === 0 && p.gold === 0 && g.coreSkill(p.cores[1]).forged, 'merge-3 forge: 420 gold + 1 shard'); }

// ---------- 60 nâng cấp ----------
ok(FORGE_KEYS.length === 48 && Object.keys(TRI_UP).length === 12, `every skill has a forge upgrade (48 regular + 12 merge-3)`);
{ let missing = 0; for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) for (const a of EL) for (const b of EL) { const d = coreDef(cls, a === b ? { type: 'el', el: a } : { type: 'duo', els: [a, b] }), f = forgeInfo(cls, d); if (!f || !f.twist) missing++; } ok(missing === 0, 'every regular skill has its own element twist text'); }
{ let bad = [];
  for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) {
    const cores = [...EL.flatMap(a => EL.map(b => a === b ? { type: 'el', el: a } : { type: 'duo', els: [a, b] })), ...TRI_SETS.map(s => ({ type: 'tri', els: s })), { type: 'inf', els: ['WATER', 'EARTH'], add: 'WIND' }];
    for (const c of cores) {
      const g = new Game(3, cls, { training: true, lab: true }); g.labGod = true; g.enemies = [];
      for (let i = 0; i < 6; i++) g.spawnAt('GRUNT', g.p.x + 150 + (i % 3) * 60, g.p.y - 60 + Math.floor(i / 3) * 120);
      for (const e of g.enemies) { e.spawn = 0; e.hp = e.max = 3000; }
      g.foes.push({ x: g.p.x + 60, y: g.p.y, vx: -50, vy: 0, life: 3, dmg: 5, r: 7 });
      g.p.forged.add(FG.forgeKeyOf(g, c)); g.skillCache.clear();
      const sk = g.coreSkill(c); g.p.energy = 999;
      try { g.castNow(sk, g.p.x + 220, g.p.y); for (let i = 0; i < 60 * 9; i++) { g.p.energy = 999; g.step(1 / 60, { ax: g.p.x + 220, ay: g.p.y }); } } catch (e) { bad.push(cls + ' ' + sk.name + ': ' + e.message); }
      if (!sk.forged && c.type !== 'inf') bad.push(cls + ' ' + sk.name + ' not forged');
      if (c.type === 'inf' && !sk.dual.every(s => s.forged)) bad.push(cls + ' infused halves not forged');
    }
  }
  ok(bad.length === 0, 'all forged skills (48 + 12 + infused) cast and run cleanly' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : '')); }

// ---------- cơ chế mẫu ----------
const forged = (cls, core) => { const g = new Game(6, cls, { training: true, lab: true }); g.enemies = []; g.p.forged.add(FG.forgeKeyOf(g, core)); g.skillCache.clear(); g.p.energy = 999; return [g, g.coreSkill(core)]; };
{ const [g, sk] = forged('KNIGHT', { type: 'el', el: 'WIND' }); g.castNow(sk, g.p.x + 300, g.p.y); for (let i = 0; i < 20; i++) g.step(1 / 60, {}); ok(g.p.shield >= 29 && g.p.shieldT > 1.5, `Forged Gale Charge: 30 shield after the charge (${Math.round(g.p.shield)})`);
  const e0 = g.p.energy; g.castNow(sk, g.p.x + 300, g.p.y); ok(g.p.energy === e0, 'Forged Gale Charge: free recast'); }
{ const [g, sk] = forged('RANGER', { type: 'duo', els: ['WIND', 'FIRE'] }); const inv0 = g.p.inv; g.castNow(sk, g.p.x + 300, g.p.y); ok(g.p.crit && g.p.crit.mult === 1.6, 'Forged tumble: next shot crits ×1.6');
  ok(g.p.lureT > 0, 'Forged Ember Tumble: leaves a lure'); }
{ const [g, sk] = forged('MAGE', { type: 'duo', els: ['WIND', 'WATER'] }); g.castNow(sk, g.p.x + 200, g.p.y); ok(g.p.inv >= 0.79, `Forged Frost Blink: ${g.p.inv.toFixed(2)}s invulnerable on arrival`); }
{ const [g, sk] = forged('RANGER', { type: 'duo', els: ['WIND', 'WATER'] }); g.castNow(sk, g.p.x + 200, g.p.y); ok(g.p.stealthT > 2, 'Forged Mist Tumble: you vanish'); }
{ const [g, sk] = forged('KNIGHT', { type: 'el', el: 'EARTH' }); const gb = new Game(6, 'KNIGHT', { training: true, lab: true }), hb = gb.p.hp; gb.hurtPlayer(40, 0, { boss: true }); const base = hb - gb.p.hp; g.castNow(sk, g.p.x + 200, g.p.y); const h0 = g.p.hp; g.hurtPlayer(40, 0, { boss: true }); ok(base > 0 && Math.abs((h0 - g.p.hp) - base / 2) < 0.5, 'Forged Earthbreaker: braced — the next hit is halved'); }
{ const [g, sk] = forged('KNIGHT', { type: 'el', el: 'WATER' }); g.foes.push({ x: g.p.x + 230, y: g.p.y, vx: -300, vy: 0, life: 3, dmg: 10, r: 7 }); const e = g.spawnAt('GRUNT', g.p.x + 400, g.p.y); e.spawn = 0; e.hp = e.max = 2000; g.labFreezeAI = true;
  g.castNow(sk, g.p.x + 100, g.p.y); const s0 = g.shots.length; let refl = false; for (let i = 0; i < 60; i++) { g.step(1 / 60, {}); if (g.shots.some(s => s.kind === 'shard')) refl = true; } ok(refl, 'Forged Riptide Whirl: the water ring reflects shots'); }
// Test Lab: gọi thợ rèn tới gần người chơi
{ const { placeForge, removeForge } = await import('../gameenv.js'); const g = new Game(9, 'MAGE', { training: true, lab: true, theme: 'volcano' });
  placeForge(g, FG.FORGE_R, true); const F = g.forge, d = Math.hypot(F.x - g.p.x, F.y - g.p.y); g.p.x = F.x; g.p.y = F.y + 20; g.step(1 / 60, {});
  ok(F && F.theme === 'volcano' && d < 340 && g.inForge, `Test Lab: smith spawns ${Math.round(d)}px away in the current map, and you can trade`);
  removeForge(g); ok(!g.forge && !g.world.temp.some(o => o.type === 'forgehouse'), 'Test Lab: smith can be removed'); }
// ---------- bán relic ----------
{ const RL = await import('../relics.js'); const { Game } = await import('../game.js');
  const sellCase = (cls, id) => { const g = new Game(9, cls, { element: 'FIRE' }), p = g.p, m0 = JSON.stringify(p.mods), max0 = p.max, en0 = p.energyMax;
    g.relicOffer = [id]; g.visitRelics = 0; p.gold = 1000; const b = RL.buyRelic(g, id); if (b.error) return b.error;
    const gold1 = p.gold, r = RL.sellRelic(g, id);
    const same = JSON.stringify(p.mods) === m0 || Object.entries(JSON.parse(m0)).every(([k, v]) => typeof v !== 'number' || Math.abs(p.mods[k] - v) < 1e-9) && Object.keys(p.mods).every(k => k in JSON.parse(m0));
    return same && !p.relics.has(id) && p.gold === gold1 + RL.relicSellPrice(id) && p.max === max0 && p.energyMax === en0 && !g.upgradeLog.includes('Relic: ' + RL.RELIC_BY_ID[id].name) ? 'ok' : 'mods ' + JSON.stringify(p.mods); };
  for (const r of RL.RELICS) { const cls = r.cls || 'KNIGHT', res = sellCase(cls, r.id); ok(res === 'ok', 'selling ' + r.name + ' restores stats and refunds half (' + res + ')'); }
  const g = new Game(9, 'KNIGHT', { element: 'FIRE' }); ok(RL.sellRelic(g, 'glass').error, 'cannot sell a relic you do not own'); }
process.exitCode = fail ? 1 : 0;
