// Cơ chế boss: chữ ký riêng, mỗi pha có đòn mới, nhắm dự đoán, ngục băng kín, Last Flame nấp sau đá, lính nấm, chui đất, bão tuyết.
import { Game } from '../game.js';
import { BOSS_DEFS, lead } from '../boss.js';
import { dist } from '../sim.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const STAGE = { COLOSSUS: 5, WARDEN: 15, BEHEMOTH: 10, SOVEREIGN: 25, DRAGON: 20 };
const step = (g, n, it = {}) => { for (let i = 0; i < n; i++) g.step(1 / 60, typeof it === 'function' ? it() : it); };
function boss(id, seed = 1) { const g = new Game(50 + seed, 'KNIGHT', {}); g.step(1 / 60, {}); g.startStage(STAGE[id]); const b = g.boss; b.spawn = 0; b.idle = 99; return [g, b]; }

// ---- quy tắc chung ----
const D = Object.fromEntries(BOSS_DEFS.map(d => [d.id, d]));
const all = id => new Set(D[id].phases.flatMap(p => p.moves));
ok(!all('DRAGON').has('flamebeams') && !all('DRAGON').has('divechain'), 'Ignivar no longer has rotating flame beams or divechain');
ok(!all('WARDEN').has('teleport'), 'Frost Warden no longer has the blink-slash (kept for Sovereign)');
ok(BOSS_DEFS.every(d => !d.phases.some(p => p.moves.includes('barrage') || p.moves.includes('lances'))), 'no boss uses the generic fan barrage anymore');
ok(BOSS_DEFS.every(d => d.phases.every(p => !p.moves.some(m => m.endsWith('beams')) || d.id === 'WARDEN' || d.id === 'SOVEREIGN')), 'rotating beams only on the two mage bosses');
ok(BOSS_DEFS.every(d => d.phases.every((p, i) => i === 0 || p.moves.some(m => !d.phases[i - 1].moves.includes(m)))), 'every phase adds at least one move the previous phase did not have');

// ---- nhắm dự đoán ----
{ const [g, b] = boss('DRAGON'); g.p.vx = 200; g.p.vy = 0; g.pv = { x: 200, y: 0 }; const [x] = lead(g, 0.9, 1); ok(x > g.p.x + 120, `lead() aims ahead of a running player (+${Math.round(x - g.p.x)})`); }
{ const [g, b] = boss('DRAGON'); b.phase = 1; g.pv = { x: 220, y: 0 }; const x0 = g.p.x; g.hazards = []; g.boss.busy = 0;
  const run = () => { g.p.vx = 220; return { mx: 1, my: 0 }; };
  b.sched = []; b.busy = 99; const MOV = (await import('../boss.js')); /* skyfall via forceMove */ b.forceMove = 'skyfall'; b.idle = 0; b.busy = 0;
  step(g, 75, run); const circles = g.hazards.filter(h => h.kind === 'circle' && h.owner === b);
  ok(circles.filter(h => h.x > x0 + 60).length >= 2, `skyfall meteors land ahead of the running player (${circles.filter(h => h.x > x0 + 60).length}/${circles.length})`); }

// ---- ngục băng kín ----
{ const [g, b] = boss('WARDEN'); b.forceMove = 'prison'; b.idle = 0; step(g, 2);
  const walls = g.world.temp.filter(o => o.type === 'icewall');
  ok(walls.length === 21 && walls.every(o => o.solid), `ice prison: 21 solid pillars, 3-pillar exit (${walls.length})`);
  const cx = walls.reduce((a, o) => a + o.x, 0) / walls.length, cy = walls.reduce((a, o) => a + o.y, 0) / walls.length;
  const sorted = walls.map(o => Math.atan2(o.y - cy, o.x - cx)).sort((a, c) => a - c); let gaps = 0; for (let i = 0; i < sorted.length; i++) { const d2 = ((sorted[(i + 1) % sorted.length] - sorted[i]) + Math.PI * 2) % (Math.PI * 2); if (d2 > 0.4) gaps++; }
  ok(gaps === 1, 'ice prison has exactly one exit');
  // cửa ngục băng luôn mở ra chỗ trống: kể cả khi đứng sát mép đấu trường, chạy thẳng ra cửa là thoát trước khi vòng băng nổ
{ let esc = 0, N = 8; for (let s = 0; s < N; s++) { const [g, b] = boss('WARDEN', 20 + s); const A = g.arena, ang = s / N * Math.PI * 2; g.p.x = A.x + Math.cos(ang) * (A.r - 40); g.p.y = A.y + Math.sin(ang) * (A.r - 40); b.x = A.x - Math.cos(ang) * 200; b.y = A.y - Math.sin(ang) * 200;
    b.forceMove = 'prison'; b.idle = 0; let ev = null; for (let i = 0; i < 6 && !ev; i++) { g.step(1 / 60, {}); ev = g.events.find(e => e.ev === 'prison'); }
    const hp0 = g.p.hp, out = () => Math.hypot(g.p.x - ev.x, g.p.y - ev.y) > ev.r + 20; let k = 0;
    for (; k < 200 && !out(); k++) { const tx = ev.gx + (ev.gx - ev.x) * 0.6, ty = ev.gy + (ev.gy - ev.y) * 0.6; g.step(1 / 60, { mx: tx - g.p.x, my: ty - g.p.y }); }
    if (out() && k < 90 && g.p.hp >= hp0) esc++; }
  ok(esc === N, 'ice prison exit always opens onto free ground: escaped ' + esc + '/' + N + ' times from the arena edge'); }
// lướt vào tường không ra được
  const p = g.p, wall = walls[0], a = Math.atan2(wall.y - p.y, wall.x - p.x); g.labGod = true; let out = false;
  for (let i = 0; i < 90; i++) { g.step(1 / 60, { mx: Math.cos(a), my: Math.sin(a), dash: i % 20 === 0 }); if (dist(p.x, p.y, cx, cy) > 200) out = true; }
  ok(!out, 'dashing into the ice wall does not get the player out'); }

// ---- Last Flame: khoảng trống ngẫu nhiên ----
{ const [g, b] = boss('DRAGON'); b.phase = 2; b.hp = b.max * 0.3; b.forceMove = 'lastflame'; b.idle = 0; g.labGod = false; let safe = null, moved = false;
  for (let i = 0; i < 60 * 4; i++) { g.step(1 / 60, {}); const h = g.hazards.find(q => q.kind === 'shadowblast'); if (h && !moved && h.pockets.length) { g.p.x = h.pockets[0].x; g.p.y = h.pockets[0].y; moved = true; } const e = g.events.find(q => q.ev === 'lastFlame'); if (e) safe = e.safe; }
  ok(moved && safe === true, 'Last Flame: reaching one of the hidden gaps makes the breath miss'); }
{ const [g, b] = boss('DRAGON', 2); b.phase = 2; b.hp = b.max * 0.3; b.forceMove = 'lastflame'; b.idle = 0; let hit = false, far = true;
  for (let i = 0; i < 60 * 4; i++) { g.step(1 / 60, {}); const h = g.hazards.find(q => q.kind === 'shadowblast'); if (h) far = far && h.pockets.every(q => dist(q.x, q.y, g.p.x, g.p.y) > 200); if (g.events.some(e => e.ev === 'lastFlame' && !e.safe)) hit = true; }
  ok(hit && far, 'Last Flame: gaps spawn away from the player; standing still gets burned'); }
{ const d = (await import('../boss.js')).BOSS_DEFS.find(x => x.id === 'DRAGON'); ok(d.phases[1].at === 0.8, 'Ignivar phase 1 lasts only the first 20% of its health'); }
{ const G = await import('../game.js'); ok(G.BOSS_STAGES[25] === 3 && G.BOSS_STAGES[20] === 4, 'Storm Sovereign is the final boss (stage 25), Ignivar at stage 20'); }
// ---- infernodive làm chậm ----
{ const [g, b] = boss('DRAGON', 3); g.world.temp = g.world.temp.filter(o => o.type === 'rimrock'); b.x = g.p.x - 300; b.y = g.p.y; b.dashing = { a: 0, left: 1200, speed: 1350, hit: false, fire: true, wide: b.r * 1.3, slowHit: 2 }; step(g, 30); ok(g.p.slowT > 0, 'Infernodive hit slows the player'); }

// ---- Behemoth: lính nấm, Spore Quake, chui đất ----
{ const [g, b] = boss('BEHEMOTH'); b.hp = b.max * 0.45; b.idle = 0; step(g, 200); const n = g.enemies.filter(e => e.type === 'MINISPORE').length;
  ok(n >= 3, `phase 2: mushrooms hop off its back as sporelings (${n} spawned, ${b.shrooms} left on back)`);
  const shroomObs = g.world.temp.filter(o => o.arena && o.type === 'tree').length;
  if (b.burrow) { b.burrow = null; b.invuln = 0; b.hidden = false; } b.busy = 0; b.forceMove = 'sporequake'; b.idle = 0; step(g, 90);   // không đang chui đất
  ok(g.world.temp.filter(o => o.arena && o.type === 'tree').length === 0 && shroomObs > 0, 'Spore Quake breaks all arena mushrooms');
  ok(g.enemies.filter(e => e.type === 'MINISPORE' && !e.dead).length === 0 && g.hazards.some(h => h.kind === 'circle' && h.r === 62), 'sporelings leap at the player to explode'); }
{ const [g, b] = boss('BEHEMOTH', 4); b.forceMove = 'burrow'; b.idle = 0; step(g, 20); ok(b.burrow && b.alpha === 0, 'burrow: the Behemoth is invisible underground'); }
{ const [g, b] = boss('BEHEMOTH', 5); b.forceMove = 'shellricochet'; b.idle = 0; let bounces = 0; for (let i = 0; i < 60 * 6; i++) { g.step(1 / 60, {}); bounces += g.events.filter(e => e.ev === 'shellBounce').length; g.events.length = 0; } ok(bounces >= 2, `Shell Ricochet bounces off the arena (${bounces})`); }

// ---- bão tuyết ----
{ const [g, b] = boss('WARDEN', 6); g.blizzard = { t: 6, T: 6 }; let froze = false; for (let i = 0; i < 150; i++) { g.step(1 / 60, {}); if (g.p.frozen > 0) froze = true; } ok(froze, 'Blizzard: standing still freezes you'); }
{ const [g, b] = boss('WARDEN', 7); g.blizzard = { t: 6, T: 6 }; g.labGod = true; let froze = false, a = 0; for (let i = 0; i < 150; i++) { a += 0.05; g.step(1 / 60, { mx: Math.cos(a), my: Math.sin(a) }); if (g.p.frozen > 0) froze = true; } ok(!froze, 'Blizzard: keeping on the move avoids freezing'); }

// ---- sét hố đen nhắm người chơi ----
{ const [g, b] = boss('SOVEREIGN'); b.forceMove = 'vortex'; b.idle = 0; step(g, 150); const c = g.hazards.filter(h => h.kind === 'circle' && h.owner === b && !h.done); ok(c.length && c.every(h => dist(h.x, h.y, g.p.x, g.p.y) < 220), 'vortex lightning targets the player'); }
// ---- Behemoth: không còn cú húc, lính nấm miễn độc ----
ok(!all('BEHEMOTH').has('rampage') && D.BEHEMOTH.phases.every(p => p.moves.includes('shellricochet')) && all('BEHEMOTH').has('toxicspit'), 'Behemoth: dash removed, shell ricochet in both phases, toxic spit added');
{ const [g, b] = boss('BEHEMOTH', 8); const m = g.spawnAt('MINISPORE', g.p.x + 200, g.p.y); m.spawn = 0; g.surface.apply(m.x, m.y, 80, 'POISON', { life: 20 }); const hp0 = m.hp; for (let i = 0; i < 120; i++) { m.x = g.p.x + 200; m.y = g.p.y; g.step(1 / 60, {}); } ok(m.hp === hp0, 'sporelings are immune to poison ground'); }
// ---- Warden: bão tuyết là đòn chủ đạo pha 2, tia xoay có thời gian hồi ----
{ const used = {}; let up = 0; for (const sd of [9, 10, 11]) { const [g, b] = boss('WARDEN', sd); b.hp = b.max * 0.5; b.idle = 0; g.labGod = true; for (let i = 0; i < 60 * 60; i++) { g.step(1 / 60, {}); if (g.blizzard) up++; if (b.last) used[b.last] = (used[b.last] || 0) + (b._seen !== b.idle ? 0 : 0); if (b.last && b.last !== b._l) { used[b.last] = (used[b.last] || 0) + 1; b._l = b.last; } } }
  ok(up / 10800 > 0.55, 'Warden phase 2: the blizzard is up most of the fight (' + Math.round(up / 108) + '% of the time, 3 seeds)'); ok((used.frostbeams || 0) <= 12, 'frost beams are not spammed'); }
// ---- chiêu nối chiêu ----
{ const [g, b] = boss('BEHEMOTH', 11); b.hp = b.max * 0.45; step(g, 120); b.busy = 0; b.forceMove = 'toxicspit'; b.idle = 0; g.labGod = true; let dashed = false; for (let i = 0; i < 60 * 5; i++) { g.step(1 / 60, {}); if (b.dashing && b.dashing.spin) dashed = true; } ok(dashed, 'Behemoth: after the toxic spit it rolls straight at you'); }
{ let links = 0; for (const id of ['COLOSSUS', 'WARDEN', 'BEHEMOTH', 'DRAGON', 'SOVEREIGN']) { const [g, b] = boss(id, 12); b.idle = 0; g.labGod = true; for (let i = 0; i < 60 * 40; i++) { g.step(1 / 60, {}); links += g.events.filter(e => e.ev === 'bossLink').length; g.events.length = 0; } } ok(links >= 5, 'bosses chain moves into follow-ups (' + links + ' links in 5×40s)'); }
// ---- phân thân: tối đa 2, quét vòng giống bản thật ----
{ const [g, b] = boss('WARDEN', 13); b.hp = b.max * 0.5; g.labGod = true; for (let k = 0; k < 3; k++) { b.busy = 0; b.forceMove = 'mirror'; b.idle = 0; step(g, 30); } const clones = g.enemies.filter(e => e.cloneOf && !e.dead);
  ok(clones.length <= 1 && clones.length > 0, 'at most 1 mirror image at a time (' + clones.length + ')'); const arcs = []; for (let i = 0; i < 240; i++) { g.step(1 / 60, {}); for (const h of g.hazards) if (h.owner && h.owner.cloneOf && h.kind === 'arc' && !arcs.includes(h)) arcs.push(h); } ok(arcs.length > 0 && arcs.every(h => h.r === 225 && h.arc === 3.0), 'mirror images cast the same wide halberd sweep as the real Warden'); }
// trùm cuối: không phân thân ở phase 1–2, có phân thân ở phase 3
for (const [hpk, want] of [[1, false], [0.5, false], [0.2, true]]) { const [g, b] = boss('SOVEREIGN', 21); g.labGod = true; b.hp = b.max * hpk; step(g, 90); let made = 0; for (let k = 0; k < 4; k++) { b.busy = 0; b.forceMove = 'mirror'; b.idle = 0; step(g, 40); made = Math.max(made, g.enemies.filter(e => e.cloneOf && !e.dead).length); }
  ok((made > 0) === want, `Storm Sovereign at ${hpk * 100}% HP (phase ${b.phase + 1}): ${want ? 'splits into mirror images' : 'no mirror images'} (${made})`); }
process.exitCode = fail ? 1 : 0;
