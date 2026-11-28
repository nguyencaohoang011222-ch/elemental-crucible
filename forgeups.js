// Nâng cấp ở lò rèn cho MỌI chiêu: 48 chiêu thường (lợi thế theo dạng chiêu + nét nguyên tố riêng) và 12 chiêu ghép 3.
// Nâng cấp là cơ chế giúp chơi mượt sau khi tung chiêu (khiên sau cú lao, bất tử khi lộn, mồi nhử khi dịch chuyển…),
// không chỉ cộng số. Mọi hook được game.js gọi; dữ liệu chiêu chỉ mang { forge: { k, form } } (không có hàm → an toàn khi scaleDef).
import { dist } from './sim.js';
import { slowmo, shield, dr, heal, stealth, lure, critNext, clearShots, reflectShots } from './defense.js';

const TAU = Math.PI * 2;
export const FORM_OF = {
  KNIGHT: { FIRE: 'cleave', WATER: 'whirl', EARTH: 'rupture', WIND: 'charge' },
  RANGER: { FIRE: 'volley', WATER: 'trap', EARTH: 'rain', WIND: 'tumble' },
  MAGE:   { FIRE: 'orb', WATER: 'lance', EARTH: 'meteor', WIND: 'blink' }
};
const near = (g, x, y, r) => g.enemies.filter(e => !e.dead && e.type !== 'DUMMY' && dist(x, y, e.x, e.y) < r + e.r).length;
const stones = (g, x, y, R, n, life) => { for (let k = 0; k < n; k++) { const a = k / n * TAU + 0.3, sx = x + Math.cos(a) * R, sy = y + Math.sin(a) * R; if (!g.world.blocked(sx, sy, 10)) { const o = g.world.addTemp('stone', sx, sy, 15, life, 140); o.rise = 0.2; o.earth = true; } } g.emit('forgeCover', { x, y, r: R }); };

// ---------- lợi thế theo dạng chiêu ----------
const PERK = {
  cleave:  { text: 'After the cleave you take 30% less damage for 0.8s, and your next basic attack hits 40% harder.', cast(g) { dr(g, 0.3, 0.8); g.p.nextBasic = 1.4; } },
  whirl:   { text: 'You can\'t be knocked back while spinning; hitting at least one foe grants 15 shield.', cast(g, sk) { const p = g.p; p.steadyT = Math.max(p.steadyT || 0, (sk.spin ? sk.spin.time : 0.4) + 0.3); if (near(g, p.x, p.y, sk.radius || 150)) shield(g, 15, 3); } },
  rupture: { text: 'Braced for 1.5s: the next hit you take is halved.', cast(g) { g.p.braceT = 1.5; g.emit('brace', { x: g.p.x, y: g.p.y, on: true }); } },
  charge:  { text: 'Gain a 30 shield for 2.5s after the charge.', cast(g, sk, c, T) { const t = (sk.time || 0.2) * ((sk.charges || 1)) + 2.5; shield(g, T.shieldN || 30, t); } },
  volley:  { text: 'Firing refunds half of your dash cooldown.', cast(g) { g.p.dashCd *= 0.5; } },
  trap:    { text: 'When your trap springs, you get a burst of speed for 1.5s.', trap(g) { g.p.hasteT = Math.max(g.p.hasteT || 0, 1.5); } },
  rain:    { text: 'Foes hit are marked for 3s and take 15% more damage.', hit(g, e) { e.fMark = 3; } },
  tumble:  { text: '+0.2s invulnerability, and your next shot within 1.5s crits for ×1.6.', cast(g) { g.p.inv += 0.2; critNext(g, 1.6, 1.5); } },
  orb:     { text: 'Killing a foe with it refunds 30% of its energy.', kill(g, e, sk) { g.gainEnergy((sk.cost || 0) * 0.3); g.emit('refund', { x: e.x, y: e.y }); } },
  lance:   { text: 'Take 25% less damage while casting, then move faster for 1s.', cast(g) { dr(g, 0.25, 0.6); g.p.hasteT = Math.max(g.p.hasteT || 0, 1); } },
  meteor:  { text: 'A 20 shield while the strike falls; catching 3+ foes in the target area refunds 25% energy.', cast(g, sk, c, T) { shield(g, T.shieldN || 20, (sk.delay || 0.6) + 0.5); const [tx, ty] = g.aimTarget(sk, c.ax, c.ay); if (near(g, tx, ty, (sk.radius || sk.area || 120) + 20) >= 3) { g.gainEnergy((sk.cost || 0) * 0.25); g.emit('refund', { x: tx, y: ty }); } } },
  blink:   { text: 'Invulnerable for 0.4s on arrival; an afterimage left behind lures foes for 1.2s.', cast(g, sk, c, T) { g.p.inv = Math.max(g.p.inv, T.inv || 0.4); lure(g, c.ox, c.oy, 1.2); } }
};

// ---------- nét nguyên tố của từng chiêu ----------
// text: mô tả; mod(def): đổi tham số trước khi áp chỉ số; cast/hit/trap/kill/dashEnd/zone/shot/shotEnd: hook.
// T.noPerk: thay hẳn phần lợi thế dạng chiêu; T.shieldN / T.inv: chỉnh số của lợi thế.
const T = {
  // ===== KNIGHT =====
  'KNIGHT:FIRE>FIRE':   { text: 'The fire crescent flies back like a boomerang for a second hit.', cast(g, sk, c) { const C = sk.crescent; if (!C) return; const a = c.a, ex = c.ox + Math.cos(a) * C.range, ey = c.oy + Math.sin(a) * C.range; g.pend(C.range / C.speed, () => g.proj('crescent', ex, ey, a + Math.PI, C, sk)); } },
  'KNIGHT:FIRE>WATER':  { text: 'While you stand in your own steam, foes lose track of you.', zone(g, z, dt, inside) { if (inside && z.kind === 'steam') stealth(g, 0.35); } },
  'KNIGHT:FIRE>EARTH':  { text: 'Standing on your lava pool: take 20% less damage.', zone(g, z, dt, inside) { if (inside && z.kind === 'lava') g.zoneDr = Math.max(g.zoneDr, 0.2); } },
  'KNIGHT:FIRE>WIND':   { text: 'The crescent leaves a tailwind: you move faster for 2s.', cast(g) { g.p.hasteT = Math.max(g.p.hasteT || 0, 2); } },
  'KNIGHT:WATER>WATER': { text: 'The water ring lasts 2.6s and reflects shots back at the nearest foe.', mod(d) { d.barrier = { ...d.barrier, life: 2.6 }; }, zone(g, z, dt, inside, sk) { if (z.kind === 'barrier') reflectShots(g, g.p.x, g.p.y, z.r + 40, sk); } },
  'KNIGHT:WATER>FIRE':  { text: 'Heal 3 HP per second while spinning.', zone(g, z, dt) { if (z.kind === 'spin') heal(g, 3 * dt); } },
  'KNIGHT:WATER>EARTH': { text: 'The swamp marks foes in it: +15% damage taken.', zone(g, z) { if (z.kind !== 'swamp') return; for (const e of g.enemies) if (!e.dead && dist(z.x, z.y, e.x, e.y) < z.r + e.r) e.fMark = Math.max(e.fMark || 0, 0.5); } },
  'KNIGHT:WATER>WIND':  { text: 'The pull drags enemy shots in too and destroys them.', cast(g, sk) { const p = g.p; clearShots(g, p.x, p.y, sk.radius); if (sk.after) g.pend(sk.after.t, () => clearShots(g, p.x, p.y, sk.radius)); } },
  'KNIGHT:EARTH>EARTH': { text: 'The last spike becomes a stone pillar for 3s that blocks shots.', cast(g, sk, c) { const L = sk.count * sk.spacing, x = c.ox + Math.cos(c.a) * L, y = c.oy + Math.sin(c.a) * L; g.pend(sk.count * sk.step + 0.05, () => stones(g, x, y, 0, 1, 3)); } },
  'KNIGHT:EARTH>FIRE':  { text: 'Your lava trail speeds you up instead of slowing you.', zone(g, z, dt, inside) { if (inside && z.kind === 'lava') g.p.hasteT = Math.max(g.p.hasteT || 0, 0.25); } },
  'KNIGHT:EARTH>WATER': { text: 'Standing in the swamp at the end of the rift heals 3 HP per second.', zone(g, z, dt, inside) { if (inside && z.kind === 'swamp') heal(g, 3 * dt); } },
  'KNIGHT:EARTH>WIND':  { text: 'Every stone that hits grants +4 shield (up to 30).', hit(g) { shield(g, Math.min(30, (g.p.shield || 0) + 4), 3); } },
  'KNIGHT:WIND>WIND':   { text: 'Recast it once for free within 1.5s.', cast(g, sk, c) { if (!c.free) { g.p.freeCast = sk.key; g.p.freeCastT = 1.5; } } },
  'KNIGHT:WIND>FIRE':   { text: 'Foes that strike your shield are set ablaze.', cast(g) { g.p.shieldBurn = 3; } },
  'KNIGHT:WIND>WATER':  { text: 'The wave at the end of the charge heals you for 10.', dashEnd(g) { heal(g, 10); } },
  'KNIGHT:WIND>EARTH':  { text: 'The shield grows to 40, and a ring of stones rises where you land (2s cover).', shieldN: 40, dashEnd(g) { stones(g, g.p.x, g.p.y, 90, 7, 2); } },
  // ===== RANGER =====
  'RANGER:FIRE>FIRE':   { text: 'Where it explodes, a phoenix feather drops (heals 12% HP).', shotEnd(g, s) { if (!s.sk._feather || s.sk._feather !== s.castId) { s.sk._feather = s.castId; g.dropAt('heal', s.x, s.y); } } },
  'RANGER:FIRE>WATER':  { text: 'Landing a hit makes you vanish for 1.2s; the next attack crits.', hit(g) { if (!(g.p.stealthT > 0)) stealth(g, 1.2); } },
  'RANGER:FIRE>EARTH':  { text: 'The blasts hurl foes away from you and stun 0.2s longer.', mod(d) { if (d.explode) { d.explode.stun = (d.explode.stun || 0) + 0.2; d.explode.push = (d.explode.push || 0) + 240; } } },
  'RANGER:FIRE>WIND':   { text: 'Fully resets your dash cooldown.', noPerk: true, cast(g) { g.p.dashCd = 0; } },
  'RANGER:WATER>WATER': { text: 'When the snare freezes foes, your next hit crits for ×1.8.', trap(g) { critNext(g, 1.8, 3); } },
  'RANGER:WATER>FIRE':  { text: 'The geyser forms a water column that blocks shots for 1.2s.', trap(g, t) { clearShots(g, t.x, t.y, 140); g.addZone('barrier', t.x, t.y, 110, 1.2); } },
  'RANGER:WATER>EARTH': { text: 'When the trap springs you gain 15 shield.', trap(g) { shield(g, 15, 4); } },
  'RANGER:WATER>WIND':  { text: 'The ice shards also shatter enemy shots.', shot(g, s) { if (s.kind === 'shard') clearShots(g, s.x, s.y, 14); } },
  'RANGER:EARTH>EARTH': { text: 'Standing inside your arrow rain: take 20% less damage.', cast(g, sk, c) { const [x, y] = g.aimTarget(sk, c.ax, c.ay); g.addZone('cover', x, y, sk.area, sk.delay + sk.duration + 0.4); } , zone(g, z, dt, inside) { if (inside && z.kind === 'cover') g.zoneDr = Math.max(g.zoneDr, 0.2); } },
  'RANGER:EARTH>FIRE':  { text: 'Your burning ground speeds you up.', zone(g, z, dt, inside) { if (inside && z.kind === 'fire') g.p.hasteT = Math.max(g.p.hasteT || 0, 0.25); } },
  'RANGER:EARTH>WATER': { text: 'The hail destroys enemy shots in the area.', cast(g, sk, c) { const [x, y] = g.aimTarget(sk, c.ax, c.ay); g.addZone('ward', x, y, sk.area, sk.delay + sk.duration + 0.3); }, zone(g, z) { if (z.kind === 'ward') clearShots(g, z.x, z.y, z.r); } },
  'RANGER:EARTH>WIND':  { text: 'Three boulders stay behind as cover for 3s.', cast(g, sk, c) { const [x, y] = g.aimTarget(sk, c.ax, c.ay); g.pend(sk.delay + sk.duration, () => stones(g, x, y, sk.area * 0.55, 3, 3)); } },
  'RANGER:WIND>WIND':   { text: 'One extra tumble (each one fires arrows).', mod(d) { d.rolls = (d.rolls || 1) + 1; } },
  'RANGER:WIND>FIRE':   { text: 'Leaves a flame decoy that lures foes for 1.2s, then explodes.', cast(g, sk, c) { lure(g, c.ox, c.oy, 1.2); g.pend(1.2, () => { g.hitCircle(c.ox, c.oy, 110, { dmg: 34, burn: 2.5 }, sk); g.emit('boom', { x: c.ox, y: c.oy, r: 110, el: 'FIRE' }); }); } },
  'RANGER:WIND>WATER':  { text: 'Vanish for 2.5s; your next attack crits.', cast(g) { stealth(g, 2.5); } },
  'RANGER:WIND>EARTH':  { text: 'The stone wall lasts 7s and you gain 20 shield.', mod(d) { if (d.wallOrigin) d.wallOrigin = { ...d.wallOrigin, life: 7 }; }, cast(g) { shield(g, 20, 4); } },
  // ===== MAGE =====
  'MAGE:FIRE>FIRE':     { text: 'The six embers home in on nearby foes.', shot(g, s) { if (s.kind !== 'shard') return; let b = null, bd = 260; for (const e of g.enemies) if (!e.dead && e.type !== 'DUMMY') { const d = dist(s.x, s.y, e.x, e.y); if (d < bd) { bd = d; b = e; } } if (b) { const sp = Math.hypot(s.vx, s.vy), a = Math.atan2(b.y - s.y, b.x - s.x), k = 0.18; s.vx += (Math.cos(a) * sp - s.vx) * k; s.vy += (Math.sin(a) * sp - s.vy) * k; s.a = Math.atan2(s.vy, s.vx); } } },
  'MAGE:FIRE>WATER':    { text: 'While you stand in your steam cloud, foes lose track of you.', zone(g, z, dt, inside) { if (inside && z.kind === 'steam') stealth(g, 0.35); } },
  'MAGE:FIRE>EARTH':    { text: 'Standing on your lava: take 25% less damage.', zone(g, z, dt, inside) { if (inside && z.kind === 'lava') g.zoneDr = Math.max(g.zoneDr, 0.25); } },
  'MAGE:FIRE>WIND':     { text: 'The fire cyclone swallows enemy shots along its path.', shot(g, s) { if (s.kind === 'cyclone') clearShots(g, s.x, s.y, s.r); } },
  'MAGE:WATER>WATER':   { text: 'Foes that die frozen shatter, damaging and chilling those nearby.', kill(g, e, sk) { if (e.freeze > 0 || e.frozeHit) { g.hitCircle(e.x, e.y, 95, { dmg: 32, freeze: 0.6 }, sk); g.emit('slam', { x: e.x, y: e.y, r: 95, el: 'WATER' }); } } },
  'MAGE:WATER>FIRE':    { text: 'Each foe the beam hits heals you for 2.', hit(g) { heal(g, 2); } },
  'MAGE:WATER>EARTH':   { text: 'The shattering crystal drops a shard: pick it up for 25 shield.', cast(g, sk, c) { g.dropAt('crystal', c.ox + Math.cos(c.a) * sk.length, c.oy + Math.sin(c.a) * sk.length); } },
  'MAGE:WATER>WIND':    { text: 'The recoil pushes you back a step, and the ray erases shots along its line.', cast(g, sk, c) { const p = g.p; p.vx -= Math.cos(c.a) * 520; p.vy -= Math.sin(c.a) * 520; const L = sk.length; for (const f of g.foes) { const rx = f.x - c.ox, ry = f.y - c.oy, al = rx * Math.cos(c.a) + ry * Math.sin(c.a), sd = Math.abs(-rx * Math.sin(c.a) + ry * Math.cos(c.a)); if (al > 0 && al < L && sd < sk.width / 2 + 10) { f.life = 0; f.landed = true; g.emit('block', { x: f.x, y: f.y }); } } } },
  'MAGE:EARTH>EARTH':   { text: 'Four stone pillars rise around the crater as cover for 4s.', cast(g, sk, c) { const [x, y] = g.aimTarget(sk, c.ax, c.ay); g.pend(sk.delay + 0.05, () => stones(g, x, y, sk.radius + 30, 4, 4)); } },
  'MAGE:EARTH>FIRE':    { text: 'Each meteor that hits refunds 2 energy.', hit(g) { g.gainEnergy(2); } },
  'MAGE:EARTH>WATER':   { text: 'The casting shield grows to 35.', shieldN: 35 },
  'MAGE:EARTH>WIND':    { text: 'The well drags enemy shots in and swallows them.', zone(g, z) { if (z.kind === 'well') clearShots(g, z.x, z.y, z.r); } },
  'MAGE:WIND>WIND':     { text: 'Recast it once for free within 2s.', cast(g, sk, c) { if (!c.free) { g.p.freeCast = sk.key; g.p.freeCastT = 2; } } },
  'MAGE:WIND>FIRE':     { text: 'The afterimage explodes in flames when the lure ends.', cast(g, sk, c) { g.pend(1.2, () => { g.hitCircle(c.ox, c.oy, 120, { dmg: 36, burn: 2.5 }, sk); g.emit('boom', { x: c.ox, y: c.oy, r: 120, el: 'FIRE' }); }); } },
  'MAGE:WIND>WATER':    { text: 'Invulnerable for 0.8s on arrival.', inv: 0.8 },
  'MAGE:WIND>EARTH':    { text: 'A ring of stones rises where you land (2s cover).', cast(g) { stones(g, g.p.x, g.p.y, 95, 7, 2); } }
};

// ---------- 12 chiêu ghép 3: bản rèn (cơ chế nằm trong ults.js, nhánh sk.forged) ----------
export const TRI_UP = {
  meteorblade: { text: 'Four leaps instead of three; the last is a giant meteor (radius 220, 1.2s stun) that leaves a magma rift. Invulnerable for the whole chain.', mod(d) { d.slam.dmg = 95; } },
  monsoon:     { text: 'Seven slashes. SLOW MOTION: the world runs at 35% during the dance and 2.5s after; the finale\'s steam erases shots.', mod(d) { d.strike.dmg = 70; } },
  titan:       { text: 'GOLDEN BULWARK: 2s as an invulnerable gold-stone statue that stomps three times, then giant form takes 60% less damage; stomps leave lava and heal 4.', mod() {} },
  sunder:      { text: 'Spin 3.5s inside a water ring that erases shots; rocks soak and slow; the landing hits for 100 and freezes 0.8s.', mod(d) { d.rock.dmg = 24; d.land.dmg = 100; d.land.freeze = 0.8; } },
  meteorarrow: { text: 'SLOW MOTION from the draw until 2.5s after release; 9 meteors; the giant arrow splits into three at the end.', mod(d) { d.meteor.dmg = 85; } },
  mirage:      { text: 'STEALTH for 4s: foes and titans lose you and attack less often; your next attack crits ×2.5. Four mirages that explode for 60.', mod(d) { d.boom.dmg = 60; } },
  pentagram:   { text: 'STAR WARD for 8s: inside the star, enemy shots are erased and you take 30% less damage. Stronger blasts, 1.6s root.', mod(d) { d.beam.dmg = 80; d.blast.dmg = 85; d.blast.root = 1.6; } },
  airstrike:   { text: 'Four bombing runs; craters leave blinding steam and fire; the last run drops a stunning boulder.', mod(d) { d.bomb.dmg = 60; } },
  solar:       { text: 'HOURGLASS: turn to gold for 2.5s (invulnerable) while the sun burns, it collapses for 160, then you teleport to the safest spot nearby.', mod(d) { d.nova.dmg = 160; } },
  abyss:       { text: 'The wave erases shots, grants 30 shield and crashes back a second time; the crash hits for 75.', mod(d) { d.crash.dmg = 75; } },
  comettrench: { text: 'Impact 150, trench 110; two smaller comets follow at ±40°; the trench burns for 5s.', mod(d) { d.impact.dmg = 150; d.trench.dmg = 110; } },
  thunderhead: { text: 'STEALTH for 3.5s inside the storm; the cloud lasts 6s and each bolt (64) chains to one more foe.', mod(d) { d.bolt.dmg = 64; } }
};

// ---------- API ----------
const twistKey = d => d && d.key && !d.ult ? d.key : null;
FORM_OF.AXIOM = { FIRE: 'cube', WATER: 'pane', EARTH: 'pillar', WIND: 'fold' };
export function hasForgeUp(d) { if (!d) return false; if (d.ult) return !!TRI_UP[d.ult]; return !!T[d.key]; }
export function forgeInfo(cls, d) {
  if (!d) return null;
  if (d.ult) return TRI_UP[d.ult] ? { kind: 'tri', text: TRI_UP[d.ult].text } : null;
  const t = T[d.key], form = FORM_OF[cls][d.combo ? d.combo[0] : d.els[0]]; if (!t) return null;
  return { kind: 'skill', perk: t.noPerk ? null : PERK[form].text, twist: t.text, form };
}
// nhân bản định nghĩa chiêu thành bản rèn (trước khi áp chỉ số): +15% sát thương, tham số riêng, cờ forge
const eachDmg = (o, f) => { if (!o || typeof o !== 'object' || Array.isArray(o)) return; if (typeof o.dmg === 'number') o.dmg *= f; for (const v of Object.values(o)) eachDmg(v, f); };
export function forgeDef(cls, d) {
  const o = JSON.parse(JSON.stringify(d));
  if (o.ult) { const U = TRI_UP[o.ult]; if (U) U.mod(o); o.forged = true; }
  else { const t = T[o.key]; if (!t) return d; if (t.mod) t.mod(o); eachDmg(o, 1.15); o.forged = true; o.forge = { k: o.key, form: FORM_OF[cls][o.combo[0]] }; }
  o.name = 'Forged ' + o.name; o.key = o.key; return o;
}
const tw = sk => sk && sk.forge ? T[sk.forge.k] : null;
const pk = sk => { const t = tw(sk); return t && !t.noPerk ? PERK[sk.forge.form] : null; };
const call = (sk, name, ...a) => { const P = pk(sk), t = tw(sk); if (P && P[name]) P[name](...a, t); if (t && t[name]) t[name](...a); };
// gọi sau khi chiêu được tung. c = { ox, oy, ax, ay, a, free }
export function onCast(g, sk, c) { if (!sk.forge) return; const P = pk(sk), t = tw(sk); if (P && P.cast) P.cast(g, sk, c, t); if (t.cast) t.cast(g, sk, c); g.emit('forgeProc', { x: g.p.x, y: g.p.y }); }
export function onHit(g, e, sk) { if (sk && sk.forge) call(sk, 'hit', g, e, sk); }
export function onTrap(g, t) { if (t.sk && t.sk.forge) call(t.sk, 'trap', g, t); }
export function onKill(g, e, sk) { if (sk && sk.forge) call(sk, 'kill', g, e, sk); }
export function onDashEnd(g, sk) { if (sk && sk.forge) call(sk, 'dashEnd', g, sk); }
export function onZone(g, z, dt, inside) { const t = z.fsk && tw(z.fsk); if (t && t.zone) t.zone(g, z, dt, inside, z.fsk); }
export function onShot(g, s) { const t = tw(s.sk); if (t && t.shot) t.shot(g, s); }
export function onShotEnd(g, s) { const t = tw(s.sk); if (t && t.shotEnd) t.shotEnd(g, s); }
export const FORGE_KEYS = Object.keys(T);
