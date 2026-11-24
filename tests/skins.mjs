// Skin theo hạng: hạng quyết định chiêu nào đổi hiệu ứng; mảnh skin boss; hòm chỉ ra Common/Rare; sự kiện chiêu mang nhãn loại chiêu.
import * as PR from '../profile.js';
import { covers, THEMES } from '../gfx/skinfx.js';
import { Game } from '../game.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
PR.reset();
for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) {
  const L = PR.SKINS[cls], by = t => L.filter(s => s.tier === t).length;
  ok(by('common') === 3 && by('rare') === 1 && by('epic') === 1 && by('heroes') === 1 && by('victory') === 1 && by('boss') === 5, `${cls}: 2 Common (+default) · 1 Rare · 1 Epic · 1 HEROES · Titanslayer · 5 Boss`);
  ok(L.filter(s => s.theme).every(s => THEMES[s.theme]), `${cls}: every effect skin has a real VFX theme`);
}
ok(covers({ tier: 'common' }, 'basic') === false && !PR.skinFx('KNIGHT', 'crimson'), 'Common skins: new look, default effects');
ok(covers({ tier: 'rare' }, 'single') && !covers({ tier: 'rare' }, 'basic') && !covers({ tier: 'rare' }, 'duo'), 'Rare: single-element skill effects only');
ok(['single', 'basic', 'move'].every(c => covers({ tier: 'epic' }, c)) && !covers({ tier: 'epic' }, 'duo') && !covers({ tier: 'epic' }, 'ult'), 'Epic: + basic attack/charge + walk/dash');
ok(['basic', 'single', 'duo', 'ult', 'move'].every(c => covers({ tier: 'heroes' }, c) && covers({ tier: 'boss' }, c)), 'HEROES and Boss: every skill (single, merge-2, merge-3), basic, walk and dash');
// không skin nào chỉ là đổi màu: dáng pixel (ô có/không có màu) phải khác bản gốc, và Rare trở lên có vũ khí riêng
{
  const { heroGrid, weaponSpec } = await import('../gfx/rig.js'), { swordGrid, bowGrid, staffGrid } = await import('../gfx/skinlooks.js');
  const mask = g => g.d.map(c => (c ? 1 : 0)).join(''), P0 = { by: 0, eyes: 'open' };
  for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) {
    const base = mask(heroGrid(cls, P0)), seen = new Set([base]), wseen = new Set();
    for (const s of PR.SKINS[cls].filter(k => k.id)) {
      const m = mask(heroGrid(cls + ':' + s.id, P0)), diff = [...m].filter((c, i) => c !== base[i]).length;
      ok(diff >= 12 && !seen.has(m), `${cls} ${s.name}: new silhouette (${diff} pixels differ from default)`); seen.add(m);
      for (const P of [{ by: 1, lean: 1, cape: 2, af: 1 }, { by: -1, lean: -1, hem: 1, af: 3, arx: 2, ary: -2 }]) heroGrid(cls + ':' + s.id, P);
      const w = weaponSpec(cls, s.id);
      if (s.tier !== 'common') { const g = cls === 'KNIGHT' ? swordGrid(w || {}, 1) : cls === 'RANGER' ? bowGrid(w || {}, 1) : staffGrid(w || {}, 1), wm = mask(g) + g.d.join(); ok(!!w && !wseen.has(wm), `${cls} ${s.name}: own weapon sprite`); wseen.add(wm); }
    }
  }
}
{
  const V = await import('../gfx/skinvfx.js'), H = V.skinVFXHooks;
  ok(['walk', 'dash', 'charge', 'event', 'shot', 'screen', 'draw'].every(k => typeof H[k] === 'function'), 'skinVFXHooks: walk, dash, charge, basic/single/merge-2/merge-3 events, shots, screen, draw');
  const th = (await import('../gfx/skinfx.js')).themeOf('radiant'), w = V.elPal(th, 'WATER'), f = V.elPal(th, 'FIRE');
  ok(w[1] !== f[1] && w[3] === f[3], 'single-element skills keep their element colour, edged with the skin colour');
}
ok(new Set(Object.values(PR.SKINS).flat().filter(s => s.theme && s.tier !== 'boss').map(s => s.theme)).size >= 9, 'paid/victory effect skins use distinct themes');
ok(PR.PRICE.common < PR.PRICE.rare && PR.PRICE.rare < PR.PRICE.epic && PR.PRICE.epic < PR.PRICE.heroes, `prices rise by tier (${Object.values(PR.PRICE).join(' / ')})`);
// hòm: chỉ Common + Rare
ok(PR.chestPool().every(o => o.kind !== 'skin' || ['common', 'rare'].includes(PR.SKINS[o.cls].find(s => s.id === o.id).tier)), 'chest only drops Common and Rare skins');
// mảnh skin boss: riêng từng tướng, 4 mảnh mở đúng skin của tướng đó
let r = 0; const always = () => 0; let res;
for (let i = 0; i < PR.SHARD_NEED - 1; i++) res = PR.rollBossShard('WARDEN', always);
ok(PR.SHARD_NEED === 4 && res && res.cls === 'KNIGHT' && !res.unlocked && PR.shardsOf('WARDEN', 'KNIGHT') === 3 && PR.shardsOf('WARDEN', 'MAGE') === 0, 'shards are per hero (3 Knight shards, 0 Mage)');
res = PR.rollBossShard('WARDEN', always);
ok(res && res.unlocked && PR.ownsSkin('KNIGHT', 'frostbound') && !PR.ownsSkin('RANGER', 'frostbound') && !PR.ownsSkin('MAGE', 'frostbound'), '4 Knight shards unlock Frostbound for the Knight only');
res = PR.rollBossShard('WARDEN', always); ok(res && res.cls !== 'KNIGHT', 'once a hero owns the skin, drops go to heroes still missing it');
ok(PR.rollBossShard('COLOSSUS', () => 0.9) === null, 'boss shard drop is rare (12%)');
{ const s0 = Object.values(PR.P.bshards).reduce((a, b) => a + b, 0); for (let i = 0; i < 4000; i++) { PR.P.gems = 100; PR.openChest(); } const got = Object.values(PR.P.bshards).reduce((a, b) => a + b, 0) - s0; ok(got > 15 && got < 75, 'wooden chest drops a boss shard very rarely (' + got + ' in 4000 opens, ~1%)'); }
PR.reset();
// sự kiện chiêu mang nhãn loại chiêu
const g = new Game(3, 'KNIGHT', { training: true, lab: true, skin: 'dragonknight', skinFx: PR.skinFx('KNIGHT', 'dragonknight') }); g.labEnergy = true;
g.castNow(g.skill('FIRE', 'FIRE'), g.p.x + 100, g.p.y); const e1 = g.events.find(e => e.ev === 'arcSlash'); g.events.length = 0;
g.castNow(g.skill('FIRE', 'WATER'), g.p.x + 100, g.p.y); const e2 = g.events.find(e => e.ev === 'arcSlash'); g.events.length = 0;
g.castNow(g.skill('EARTH', 'EARTH'), g.p.x + 100, g.p.y); for (let i = 0; i < 30; i++) g.step(1 / 60, {}); const e3 = g.events.find(e => e.ev === 'spike');
ok(e1 && e1.fx === 'single' && e2 && e2.fx === 'duo' && e3 && e3.fx === 'single', 'skill events are tagged single/duo (also delayed hits)');
ok(g.p.skinFx && g.p.skinFx.theme === 'dragonfire', 'the equipped skin effect reaches the game');
// ---- rương xịn ----
PR.reset();
const pool = PR.royalPool(); ok(Math.abs(pool.reduce((s, r) => s + r.chance, 0) - 1) < 1e-9, 'Royal Chest rates add up to 100%');
ok(pool.every(r => r.items.every(it => it.kind === 'trail' || it.kind === 'shard' || ['rare', 'epic', 'heroes'].includes(it.tier))), 'Royal Chest never contains Common, full Boss or Titanslayer skins');
ok(PR.ROYAL.rates.shard > 0 && pool.find(r => r.tier === 'shard').items.length === 15, 'Royal Chest can give a boss shard (5 bosses × 3 heroes)');
{ let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const cnt = {}; const N = 20000;
  for (let i = 0; i < N; i++) { PR.P.skins = []; PR.P.trails = []; const [r] = PR.openRoyal(1, rnd, true, true); cnt[r.tier] = (cnt[r.tier] || 0) + 1; }
  ok(Object.entries(PR.ROYAL.rates).every(([k, c]) => Math.abs((cnt[k] || 0) / N - c) < 0.015), 'observed rates match the published odds: ' + Object.entries(cnt).map(([k, v]) => k + ' ' + (v / N * 100).toFixed(1) + '%').join(', ')); }
{ PR.reset(); let maxE = 0, maxH = 0, sinceE = 0, sinceH = 0; for (let i = 0; i < 3000; i++) { PR.P.skins = []; PR.P.trails = []; const [r] = PR.openRoyal(1, Math.random, false, true); sinceE = r.tier === 'epic' || r.tier === 'heroes' ? 0 : sinceE + 1; sinceH = r.tier === 'heroes' ? 0 : sinceH + 1; maxE = Math.max(maxE, sinceE); maxH = Math.max(maxH, sinceH); }
  ok(maxE < PR.ROYAL.pityEpic && maxH < PR.ROYAL.pityHeroes, 'guarantees hold: never 10 opens without Epic+, never 40 without HEROES (longest dry streaks ' + maxE + ' / ' + maxH + ')'); }
{ PR.reset(); for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) for (const s of PR.SKINS[cls]) if (s.id) PR.P.skins.push(cls + ':' + s.id); for (const tr of PR.TRAILS) if (tr.id) PR.P.trails.push(tr.id);
  const g0 = PR.P.gems; const [r] = PR.openRoyal(1, () => 0.99, true, true); ok(r.dup && PR.P.gems === g0 + PR.ROYAL.refund[r.tier], 'duplicates refund ' + r.refund + ' gems'); }
{ PR.reset(); ok(PR.openRoyal(1) === null, 'cannot open without enough gems'); PR.P.gems = 700; const res = PR.openRoyal(5); ok(res && res.length === 5 && PR.P.gems >= 20 && PR.P.gems <= 20 + 5 * 180, 'x5 open costs 680 and gives 5 items'); }
PR.reset();
// chống tái chế mẫu: mọi dòng skin Epic / Victory / HEROES / Boss có module riêng, và cùng một chuỗi sự kiện
// phải vẽ ra HÌNH khác nhau (so vị trí ô pixel, bỏ qua màu) — không dòng nào là bản đổi màu của dòng khác
{
  const { LINES, lineEvent, drawLines, drawDecals } = await import('../gfx/skinlines.js');
  const hiThemes = new Set(); for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) for (const s of PR.SKINS[cls]) if (['epic', 'victory', 'heroes', 'boss'].includes(s.tier)) hiThemes.add(s.theme);
  ok([...hiThemes].every(t => LINES[t]), 'every Epic / Victory / HEROES / Boss skin line has its own VFX module (' + hiThemes.size + ' lines)');
  const shape = (theme, cls) => {
    const cells = new Set(), ctx = { fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, fillRect(x, y) { cells.add(Math.round(x / 3) + ',' + Math.round(y / 3)); }, rect(x, y) { cells.add(Math.round(x / 3) + ',' + Math.round(y / 3)); }, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, closePath() {} };
    const sim = { p: { x: 0, y: 0, aim: 0, face: 1, cls, dashX: 1, dashY: 0, vx: 200, vy: 0, charge: 0.8, skinFx: { tier: 'boss', theme } }, enemies: [], ults: [] }, R = { parts: [], time: 0, addShake() {}, gapMark() {} }, L = LINES[theme];
    const evs = [{ ev: 'dash', x: 0, y: 0 }, cls === 'KNIGHT' ? { ev: 'swing', x: 0, y: 0, a: 0, reach: 104, arc: 1.4, combo: 1 } : { ev: 'shoot', x: 0, y: 0, a: 0, kind: cls === 'MAGE' ? 'orb' : 'arrow' }, { ev: 'slam', x: 120, y: 0, r: 70, el: 'FIRE' }];
    for (const [i, e] of evs.entries()) lineEvent(L, R, e, i === 0 ? 'move' : i === 1 ? 'basic' : 'single', cls, sim);
    for (let f = 0; f < 24; f++) { R.time += 1 / 60; drawLines(R, ctx, 1 / 60, R.time); if (L.walk) { L.walk(R, ctx, sim.p, R.time, 1 / 60, true, false); drawDecals(R, ctx, 1 / 60, R.time); } if (L.charge) L.charge(R, ctx, sim.p, R.time); }
    return cells;
  };
  const lines = [...hiThemes].filter(t => LINES[t]), S = {}; for (const t of lines) S[t] = shape(t, 'KNIGHT');
  let worst = 0, pair = ''; for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) { const A = S[lines[i]], B = S[lines[j]]; let inter = 0; for (const c of A) if (B.has(c)) inter++; const jac = inter / Math.max(1, A.size + B.size - inter); if (jac > worst) { worst = jac; pair = lines[i] + ' / ' + lines[j]; } }
  ok(lines.every(t => S[t].size > 40) && worst < 0.6, 'no two skin lines draw the same geometry (most similar pair ' + pair + ': ' + (worst * 100).toFixed(0) + '% overlap, colours ignored)');
}
process.exitCode = fail ? 1 : 0;
