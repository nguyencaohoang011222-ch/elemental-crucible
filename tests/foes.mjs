// Quái mới: spawn nhiều hướng có ấn báo, tách mềm + vây sườn, cổng tấn công lệch nhịp, 12 quái riêng của map 2–5.
import { Game } from '../game.js';
import { ENEMIES, dist, angDiff } from '../sim.js';
import { ROSTER } from '../env.js';
import { setTheme } from '../gameenv.js';
import { updateHazards } from '../boss.js';
import { FOE_ART } from '../gfx/foes.js';
import fs from 'fs';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const DT = 1 / 60;
const lab = (theme, seed = 3) => { const g = new Game(seed, 'KNIGHT', { training: true, lab: true }); g.enemies = []; setTheme(g, theme); g.theme = theme; g.infHp = true; return g; };
const put = (g, t, dx, dy) => { const e = g.spawnAt(t, g.p.x + dx, g.p.y + dy); e.spawn = 0; return e; };
const run = (g, sec, fn, it = {}) => { for (let i = 0; i < sec * 60; i++) { g.step(DT, typeof it === 'function' ? it(g) : it); if (fn && fn(g) === true) return true; g.events.length = 0; } return false; };
const evs = g => g.events.map(e => e.ev);

// ---------- spawn nhiều hướng ----------
{ const g = new Game(5, 'KNIGHT'); g.startStage(22); g.spawnQ = []; g.enemies = [];
  const list = ['HALBERDIER', 'HALBERDIER', 'HALBERDIER', 'ASSASSIN', 'ASSASSIN', 'ARCANIST', 'ARCANIST', 'ARCANIST', 'HALBERDIER', 'ASSASSIN', 'HALBERDIER', 'ARCANIST'];
  g.spawnWave(list);
  const S = g.sigils, p = g.p, ang = S.map(s => Math.atan2(s.y - p.y, s.x - p.x)).sort((a, b) => a - b);
  let groups = 1; for (let i = 1; i < ang.length; i++) if (ang[i] - ang[i - 1] > 0.87) groups++; if (ang.length > 1 && ang[0] + Math.PI * 2 - ang[ang.length - 1] <= 0.87) groups--;
  ok(S.length === list.length && groups >= 3, `one wave arrives from ${groups} separate flanks (≥3), not one blob`);
  const avg = f => { const q = S.filter(f); return q.reduce((a, s) => a + dist(s.x, s.y, p.x, p.y), 0) / q.length; };
  const dr = avg(s => ENEMIES[s.type].ranged), dm = avg(s => !ENEMIES[s.type].ranged);
  ok(dr > dm + 80, `ranged units spawn behind the melee line (${dm | 0} vs ${dr | 0})`);
  const sq = S.filter(s => s.type === 'HALBERDIER' && s.sq), groupsSq = new Set(sq.map(s => s.sq));
  ok(sq.length >= 3 && [...groupsSq].some(k => sq.filter(s => s.sq === k).length >= 2 && new Set(sq.filter(s => s.sq === k).map(s => s.sqo)).size >= 2), 'halberdiers spawn as a squad with spread formation slots');
  run(g, 0.7); const early = g.enemies.length;
  run(g, 0.2); ok(early === 0 && g.enemies.length === list.length && g.sigils.length === 0, `enemies appear only after the 0.8s ground sigil (${early} at 0.7s, ${g.enemies.length} at 0.9s)`);
}
// stage thật: đợt đầu cũng ra từ nhiều hướng
{ const g = new Game(9, 'KNIGHT'); g.startStage(8); run(g, 1.2); const p = g.p, a = g.enemies.filter(e => e.type !== 'DUMMY').map(e => Math.atan2(e.y - p.y, e.x - p.x));
  let spread = 0; for (const x of a) for (const y of a) spread = Math.max(spread, Math.abs(angDiff(x, y)));
  ok(a.length >= 3 && spread > 2.0, `stage 8 first wave surrounds the player (angular spread ${(spread * 57.3) | 0}°)`);
}
// ---------- tách mềm + vây sườn ----------
{ const g = lab('forest'); g.labGod = true;
  for (let i = 0; i < 8; i++) put(g, 'GRUNT', 450 + i * 0.5, i * 0.5);
  run(g, 1.0); let md = 1e9; for (const a of g.enemies) for (const b of g.enemies) if (a !== b) md = Math.min(md, dist(a.x, a.y, b.x, b.y));
  ok(md > 36, `8 brutes stacked on one point spread out (closest pair ${md | 0}px > 36)`);
  run(g, 3.2); const p = g.p, a = g.enemies.map(e => Math.atan2(e.y - p.y, e.x - p.x)); let spread = 0; for (const x of a) for (const y of a) spread = Math.max(spread, Math.abs(angDiff(x, y)));
  ok(spread > Math.PI / 2, `brutes from one side flank around the player (spread ${(spread * 57.3) | 0}° > 90°)`);
}
// ---------- lệch nhịp ----------
{ const g = lab('forest'); g.labGod = true; const tele = new Map();
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(g, 'SHOOTER', Math.cos(a) * 300, Math.sin(a) * 300); }
  run(g, 6, g => { for (const e of g.enemies) if (e.state === 'tele' && !tele.has(e)) tele.set(e, g.t); });
  const ts = [...tele.values()].sort((a, b) => a - b); let gap = 9; for (let i = 1; i < ts.length; i++) gap = Math.min(gap, ts[i] - ts[i - 1]);
  ok(ts.length === 6 && gap >= 0.2, `6 casters spawned together never wind up within 0.2s of each other (closest ${gap.toFixed(2)}s)`);
}
{ const g = lab('forest'); g.labGod = true; put(g, 'SHOOTER', 300, 0); const ts = []; run(g, 5, g => { for (const e of g.events) if (e.ev === 'cast') ts.push(g.t); });
  const pairs = ts.filter((t, i) => i && Math.abs(t - ts[i - 1] - 0.45) < 0.05).length;
  ok(pairs >= 1, `Thorn Shaman fires a delayed follow-up shot 0.45s after its volley (${pairs} follow-ups in ${ts.length} casts)`); }

// ---------- roster ----------
{ const base = new Set(['melee', 'charger', 'shooter']);
  const bad = ['dungeon', 'frost', 'volcano', 'palace'].flatMap(t => ROSTER[t].filter(k => base.has(ENEMIES[k].ai) || !FOE_ART[k]));
  const fns = new Set(Object.values(FOE_ART).map(a => a[0]));
  ok(bad.length === 0 && fns.size === 12, `biomes 2–5 use 12 new enemies with their own AI and sprite (${bad.join(',') || 'none reused'})`);
  ok(ROSTER.forest.join() === 'GRUNT,CHARGER,SHOOTER', 'Ruined Forest keeps the baseline roster');
}

// ---------- 12 quái ----------
// Spore Bomber: phồng rồi nổ thành vũng độc
{ const g = lab('dungeon'); const e = put(g, 'SPOREBOMB', 150, 0); let sw = 0, at = null;
  run(g, 6, g => { if (evs(g).includes('swell')) sw = g.t; if (e.dead && !at) at = [e.x, e.y]; });
  ok(sw && at && g.surface.at(at[0], at[1]) === 'poison', 'Spore Bomber swells, then bursts into a lingering poison puddle');
}
// Mycelium Weaver: bào tử bám đuổi tách 3 + dây hồi máu
{ const g = lab('dungeon'); put(g, 'WEAVER', 320, 0); let home = false, split = 0;
  run(g, 7, g => { for (const f of g.foes) if (f.kind === 'spore' && f.home) home = true; split += g.events.filter(e => e.ev === 'sporeSplit').length; });
  ok(home && split > 0 && g.foes.length + split > 0, `Weaver fires homing spores that split on impact (${split} splits)`);
  const g2 = lab('dungeon'); g2.labGod = true; const w = put(g2, 'WEAVER', 360, 0), a = put(g2, 'HUSK', 330, 120); a.hp = 20; let tied = false;
  run(g2, 7, () => { if (w.tie === a) tied = true; });
  ok(tied && a.hp > 40, `Weaver tethers and heals a wounded ally (20 → ${a.hp | 0} hp)`);
}
// Brute Stalker: vệt nhớt độc + 3 dải gai
{ const g = lab('dungeon'); g.labGod = true; const e = put(g, 'HUSK', 400, 0); let fan = 0;
  run(g, 9, g => { fan = Math.max(fan, g.hazards.filter(h => h.kind === 'line' && h.color === '#a8e05a').length); });
  let slime = 0; for (let x = g.p.x; x <= g.p.x + 400; x += 12) if (g.surface.at(x, g.p.y) === 'poison') slime++;
  ok(fan === 3, 'Brute Stalker slams a 3-way wave of fungal spikes');
  ok(slime > 0 || [...g.surface.cells.values()].some(c => c.type === 'poison'), 'Brute Stalker leaves a toxic slime trail');
}
// Frost Stalker: nhử rồi vồ, để lại băng trơn
{ const g = lab('frost'); g.labGod = true; const e = put(g, 'FROSTSTALKER', 230, 0); let fe = null, po = null;
  run(g, 8, g => { if (e.state === 'feint' && fe === null) fe = g.t; if (e.state === 'pounce' && po === null) po = g.t; });
  const ice = [...g.surface.cells.values()].filter(c => c.type === 'ice').length;
  ok(fe !== null && po !== null && po - fe >= 0.4, `Frost Stalker pauses (feint ${(po - fe).toFixed(2)}s) before a fast lunge`);
  ok(ice > 0, `Frost Stalker's lunge leaves slick frost patches (${ice} cells)`);
}
// Cryo Conjurer: nhắm điểm người chơi sắp tới
{ const g = lab('frost'); g.labGod = true; put(g, 'CRYOMAGE', 0, -330); let hit = null;
  run(g, 9, g => { const fresh = g.hazards.filter(h => h.color === '#9fe6ff' && !h.done && h.t > h.T - DT * 1.5); if (fresh.length && !hit) { const cx = fresh.reduce((a, h) => a + h.x, 0) / fresh.length; hit = { cx, px: g.p.x }; } }, { mx: 1, my: 0 });
  ok(hit && hit.cx - hit.px > 80, `Cryo Conjurer drops its pillars/nova on the predicted path (${hit ? (hit.cx - hit.px) | 0 : '?'}px ahead)`);
}
// Glacial Sentinel: khiên trước chặn đạn + tia quét
{ const g = lab('frost'); g.labGod = true; const e = put(g, 'SENTINEL', 200, 0); e.hp = e.max = 5000; g.labFreezeAI = true;
  const a = Math.atan2(e.y - g.p.y, e.x - g.p.x), h0 = e.hp; g.hurtEnemy(e, 100, a, 0, 'arrow'); const front = h0 - e.hp; const h1 = e.hp; g.hurtEnemy(e, 100, a + Math.PI, 0, 'arrow'); const back = h1 - e.hp;
  ok(front < back * 0.3, `Glacial Sentinel's frost shield blocks frontal projectiles (${front | 0} front vs ${back | 0} flank)`);
  ok(e.blockT > 0, 'blocking a frontal hit lights up the shield runes');
  g.labFreezeAI = false; let beam = false, cone = 0, spikes = false; run(g, 12, g => { if (g.hazards.some(h => h.kind === 'beam' && h.owner === e && h.spin)) beam = true; cone = Math.max(cone, g.hazards.filter(h => h.kind === 'line' && h.sty === 'ice' && !h.done).length); if (evs(g).includes('iceSpikes')) spikes = true; });
  ok(cone === 3 && spikes, 'Glacial Sentinel slams its shield into a cone of 3 jagged ice-spike lanes');
  ok(beam, 'Glacial Sentinel also fires a sweeping freezing beam');
}
// Cinder Imp: nổ trễ 0.6s sau khi chết
{ const g = lab('volcano'); const e = put(g, 'CINDERIMP', 60, 0); g.p.inv = 9; g.hurtEnemy(e, 999, 0, 0, 'slash'); const h = g.hazards.find(h => h.kind === 'circle' && dist(h.x, h.y, e.x, e.y) < 5);
  ok(h && Math.abs(h.t - 0.6) < 0.05, 'Cinder Imp erupts in a fiery nova 0.6s after dying');
}
// Pyro Bombardier: bom vòng cung để lại hố dung nham
{ const g = lab('volcano'); g.labGod = true; put(g, 'BOMBARDIER', 380, 0); let lobs = [], lava = false;
  run(g, 8, g => { for (const e of g.events) if (e.ev === 'lob') lobs.push(e); if (lobs.length && lobs.some(L => g.surface.at(L.x2, L.y2) === 'lava')) lava = true; });
  ok(lobs.length >= 2 && lava, `Pyro Bombardier lobs ${lobs.length} magma bombs that leave lava craters`);
}
// Obsidian Juggernaut: vết nứt rồi vòng 6 mảnh than
{ const g = lab('volcano'); g.labGod = true; put(g, 'JUGGERNAUT', 300, 0); let fis = false, emb = 0;
  run(g, 9, g => { if (g.foes.some(f => f.kind === 'fissure')) fis = true; emb = Math.max(emb, g.foes.filter(f => f.kind === 'ember').length); });
  ok(fis && emb === 6, `Obsidian Juggernaut sends a seismic fissure then a ring of ${emb} ember shards`);
}
// Shadow Assassin: 2 nhát lưỡi liềm liên tiếp
{ const g = lab('palace'); g.labGod = true; put(g, 'ASSASSIN', 260, 0); let pair = null;
  let smoke = false; run(g, 7, g => { if (evs(g).includes('shadowSmoke')) smoke = true; const s = g.hazards.filter(h => h.slash && !h.done); if (s.length === 2 && !pair) pair = s.map(h => ({ a: h.a, t: h.t, kind: h.kind, sty: h.sty })); });
  ok(pair && pair.every(h => h.kind === 'arc' && h.sty === 'blood') && Math.abs(Math.abs(angDiff(pair[0].a, pair[1].a)) - 0.64) < 0.01 && Math.abs(pair[1].t - pair[0].t - 0.18) < 0.02 && smoke, 'Shadow Assassin blinks behind with shadow smoke and slashes twin crimson crescents 0.18s apart');
}
// Crimson Arcanist: ấn máu có lõi an toàn + cầu laser xoay
{ const g = lab('palace'); g.labGod = true; const e = put(g, 'ARCANIST', 300, 0); let rune = false, orbs = false;
  run(g, 10, g => { if (g.hazards.some(h => h.hole)) rune = true; if (g.hazards.some(h => h.kind === 'beam' && h.owner === e && h.n === 2)) orbs = true; });
  ok(rune && orbs, 'Crimson Arcanist alternates blood-rune rings and rotating laser orbs');
  const t = lab('palace'), p = t.p, hp0 = p.hp; t.hazards.push({ kind: 'circle', x: p.x, y: p.y, r: 150, hole: 44, t: 0.05, T: 0.05, hold: 0, dmg: 30, owner: null }); updateHazards(t, 0.1);
  const safe = p.hp === hp0; t.p.inv = 0; t.hazards.push({ kind: 'circle', x: p.x + 100, y: p.y, r: 150, hole: 44, t: 0.05, T: 0.05, hold: 0, dmg: 30, owner: null }); updateHazards(t, 0.1);
  ok(safe && p.hp < hp0, 'standing in the blood rune\'s inner eye is safe, the outer ring hits');
}
// Royal Halberdier: quét kích → sóng sáng đâm xuyên; xen kẽ chakram quay về
{ const g = lab('palace'); g.labGod = true; const e = put(g, 'HALBERDIER', 240, 0); let sweep = false, wave = false, back = false, caught = false;
  run(g, 12, g => { if (g.hazards.some(h => h.kind === 'arc' && h.sty === 'gold' && h.arc > 2.5)) sweep = true; if (sweep && g.foes.some(f => f.kind === 'lightwave' && f.pierce)) wave = true; for (const f of g.foes) if (f.kind === 'glaive' && f.back) back = true; if (back && !g.foes.some(f => f.kind === 'glaive')) caught = true; });
  ok(sweep && wave, 'Royal Halberdier combos a wide golden halberd sweep into a piercing light-wave thrust');
  ok(back && caught, 'Royal Halberdier also throws a chakram that curves back to him');
}
// không lỗi khi chơi từng map với quái mới
{ let err = null; for (const st of [7, 12, 17, 22]) { const g = new Game(st, 'MAGE'); g.labGod = true; g.startStage(st); try { run(g, 40, null, g => ({ mx: Math.sin(g.t), my: Math.cos(g.t * 0.7), fire: true, ax: g.p.x + 100, ay: g.p.y })); } catch (x) { err = st + ': ' + x.message; break; } }
  ok(!err, 'stages 7/12/17/22 run 40s with the new enemies without errors' + (err ? ' — ' + err : '')); }
// ---------- vòng sóng kín 360°, màu theo map ----------
{ const src = ['boss.js', 'foes.js'].map(f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')).join('\n');
  ok(!/gapW|gapA/.test(src), 'no shockwave ring has a gap: every ring is a closed 360° circle');
  const R = fs.readFileSync(new URL('../render.js', import.meta.url), 'utf8'); ok(!R.includes('gapMark'), 'the green gap markers are gone'); }
{ const { styleOf } = await import('../gfx/bossvfx.js'); const hz = []; const pal = { dungeon: 'toxic', frost: 'ice', volcano: 'magma', palace: 'blood' };
  const map = { dungeon: ['SPOREBOMB', 'HUSK'], frost: ['CRYOMAGE', 'SENTINEL'], volcano: ['BOMBARDIER'], palace: ['ARCANIST', 'ASSASSIN'] }; let bad = [];
  for (const [th, types] of Object.entries(map)) { const g = lab(th); g.labGod = true; types.forEach((t, i) => put(g, t, 220 + i * 60, i * 80 - 40)); run(g, 10, g => { for (const h of g.hazards) { h._th = th; hz.push(h); } }); }
  const { STY } = await import('../gfx/bossvfx.js');
  for (const h of new Set(hz)) { const want = STY[pal[h._th]], got = styleOf(h); if (got !== want && !(h._th === 'palace' && got === STY.gold)) bad.push(h._th + ':' + h.kind); }
  ok(bad.length === 0, 'every biome-2–5 enemy telegraph/impact uses its biome palette (toxic / ice / magma / crimson)' + (bad.length ? ' — off: ' + [...new Set(bad)].join(',') : '')); }
// ít quái hơn nhưng trâu hơn: số quái, máu theo map (cả phòng tập), elite/boss không nhân hệ số map
{ const { Game: G2, MAP_HP } = await import('../game.js');
  const g = new G2(4, 'RANGER'); g.startStage(19); ok(g.stageTotal === 28, 'stage 19 spawns 28 enemies (was 41): ' + g.stageTotal);
  const t = new G2(4, 'RANGER', { training: true }); t.theme = 'palace'; const h = t.spawnAt('HALBERDIER', t.p.x + 300, t.p.y) || t.enemies[t.enemies.length - 1];
  ok(Math.round(h.max) === 207, 'Test Lab: Royal Halberdier has 207 HP on map 5 (was 115): ' + Math.round(h.max));
  const g2 = new G2(4, 'RANGER'); g2.stage = 23; g2.theme = 'palace'; const h2 = g2.spawnAt('HALBERDIER', g2.p.x + 300, g2.p.y) || g2.enemies[g2.enemies.length - 1];
  ok(h2.max > 115 * (1 + 0.09 * 22) * 1.5, 'stage 23 Halberdier is far tougher than before (' + Math.round(h2.max) + ' HP)');
  const el = t.spawnAt('BLADEDANCER', t.p.x + 300, t.p.y) || t.enemies[t.enemies.length - 1]; ok(Math.round(el.max) === ENEMIES.BLADEDANCER.hp, 'elites are not multiplied by the map factor (base × ELITE.hp)'); ok(MAP_HP.forest === 1 && MAP_HP.palace === 1.8, 'map HP factors 1 → 1.8'); }
process.exitCode = fail ? 1 : 0;
