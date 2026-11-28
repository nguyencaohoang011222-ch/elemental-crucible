// Cursed Relics: nâng cấp "độc và lạ" chỉ bán ở thợ rèn. Mỗi món có một lợi và một cái giá.
// Logic thuần (chạy trong test). Game gọi các hook: relicBasic (quanh đòn thường), relicHit / relicKill, relicCast, tickRelics.
import { dist, ENEMIES } from './sim.js';

export const RELICS = [
  { id: 'unstable', name: 'Unstable Ammo', price: 170, pro: 'Every 5th basic attack rolls a wild effect: ×1.4 damage, ×1.5 size, or a small blast.', con: 'That wild shot veers up to 15° off your aim.', apply: m => { m.unstable = 1; } },
  { id: 'static', name: 'Static Build-up', price: 180, pro: 'Walking builds static (max 10). Your next basic attack discharges lightning that jumps 1 enemy per 5 charge.', con: 'Standing still for 1s drains all static. −5% move speed.', apply: m => { m.static = 1; m.speed *= 0.95; } },
  { id: 'potato', name: 'Hot Potato', price: 190, pro: 'Basic hits plant a bomb. Hitting another enemy passes it on (+15% each pass, up to ×2). It blows up after 3s.', con: 'If it blows up near you, you take 6 damage too.', apply: m => { m.potato = 1; } },
  { id: 'polter', name: 'Poltergeist', price: 200, pro: 'Skill kills have a 40% chance to release a homing ghost (12 damage).', con: 'Each ghost drains 2 energy.', apply: m => { m.polter = 0.4; } },
  { id: 'bats', name: 'Vampire Bats', price: 200, pro: 'Skill kills have a 30% chance to release a bat that bites (8 damage) and heals you 1.', con: 'Natural HP regeneration −50%.', apply: m => { m.bats = 0.3; m.regenMul = (m.regenMul || 1) * 0.5; } },
  { id: 'cursed', name: 'Cursed Arrow', cls: 'RANGER', price: 200, pro: 'Every 6th arrow curses its target with Doom for 3s: it takes +15% damage from everything.', con: 'Cursed arrows wobble in flight.', apply: m => { m.cursed = 1; } },
  { id: 'blood', name: 'Blood Pact', price: 260, pro: 'Basic attacks deal +35% damage.', con: 'Each basic attack costs 1 HP (never below 15). All healing −30%.', apply: m => { m.basic *= 1.35; m.bloodPact = 1; m.healMul = (m.healMul || 1) * 0.7; } },
  { id: 'overclock', name: 'Overclock', price: 260, pro: 'For 2s after every cast: +40% attack speed.', con: 'No energy gain during those 2s. Skills cost 10% more.', apply: m => { m.overclock = 1; m.cd *= 1.1; } },
  { id: 'chain', name: 'Chain Reaction', price: 300, pro: 'Enemies killed by basic attacks explode for 20% of their max HP (chains up to 4 times).', con: 'Standing within 60px of a blast hurts you for 5.', apply: m => { m.chainReact = 1; } },
  { id: 'glass', name: 'Glass Cannon', price: 340, pro: '+40% to all damage.', con: '−35% max HP and you take 15% more damage.', apply: m => { m.dmg *= 1.4; m.basic *= 1.4; m.hpMul = (m.hpMul || 1) * 0.65; m.takenMul = (m.takenMul || 1) * 1.15; } },
  { id: 'gambit', name: "Hunter's Gambit", cls: 'RANGER', price: 340, pro: 'Fully charged arrows deal +50% damage and fly 50% farther.', con: 'Each dash burns 15% Focus. Quick arrows −20% damage.', apply: m => { m.gambit = 1; } },
  { id: 'boomerang', name: 'Boomerang Blade', cls: 'KNIGHT', price: 360, pro: 'A full charge hurls your sword 300px; it spins back, piercing on the way out and back (80% charged damage each way).', con: 'You cannot swing until it returns, and move 10% slower while it flies.', apply: m => { m.boomerang = 1; } },
  { id: 'blackhole', name: 'Black Hole Orb', cls: 'MAGE', price: 360, pro: 'Hold to charge an orb past 90% (it turns violet): it collapses into a 1.5s black hole that drags enemies in (4 damage every 0.25s).', con: 'Charging takes 25% longer.', apply: m => { m.blackHole = 1; m.chargeSpd /= 1.25; } },
  // ---- relic cho chiêu (mọi lớp) ----
  { id: 'echo', name: 'Echo Chamber', price: 300, pro: 'Every 4th skill you cast repeats itself 0.5s later on the same spot at 60% damage.', con: 'Skills cost 15% more energy.', apply: m => { m.echo = 1; m.cd *= 1.15; } },
  { id: 'gravity', name: 'Gravity Well', price: 280, pro: 'Skill hits have a 20% chance to tear open a small black hole (1.2s) that drags enemies together. At most one every 2.5s.', con: 'Skill damage −10%.', apply: m => { m.gravity = 1; m.dmg *= 0.9; } },
  { id: 'bloodmagic', name: 'Blood Magic', price: 240, pro: 'Out of energy? Cast anyway: the missing energy is paid in HP (1 HP per 2 energy). Never takes you below 20% HP.', con: 'Max energy −30%.', apply: m => { m.bloodMagic = 1; m.energyMul = (m.energyMul || 1) * 0.7; } },
  { id: 'overload', name: 'Chain Caster', price: 320, pro: 'A skill that hits 3 or more enemies refunds 35% of its energy cost (once per cast).', con: 'Skill hits on a lone enemy (no other foe within 150px) deal 15% less.', apply: m => { m.overload = 1; } },
  { id: 'spellblade', name: 'Spellblade', price: 260, pro: 'After every skill, your next 2 basic attacks deal +50% damage and burst for a small blast of that element.', con: 'Basic attack speed −15%.', apply: m => { m.spellblade = 1; m.atkSpeed *= 0.85; } },
  // ---- relic riêng cho Knight ----
  { id: 'relentless', name: 'Relentless Blade', cls: 'KNIGHT', price: 340, pro: 'Keep holding: a full charge swings by itself and starts the next charge at 50%. You no longer slow down while charging.', con: 'Quick (uncharged) swings deal 25% less damage.', apply: m => { m.relentless = 1; } },
  { id: 'juggernaut', name: 'Juggernaut', cls: 'KNIGHT', price: 280, pro: 'Dashing through enemies deals 18 damage each and adds to your combo. Hitting 2+ halves the dash cooldown.', con: 'Dash cooldown +20%.', apply: m => { m.juggernaut = 1; m.dashCd *= 1.2; } },
  { id: 'riposte', name: 'Mirror Guard', cls: 'KNIGHT', price: 300, pro: 'Projectiles you cut with your sword fly back at the shooter for 150% of their damage.', con: 'You take 10% more damage.', apply: m => { m.riposte = 1; m.takenMul = (m.takenMul || 1) * 1.1; } },
  { id: 'wild', name: 'Wild Magic', price: 420, pro: '20% chance for every cast to fire a free copy near your cursor at 50% damage.', con: 'Every skill lands up to 60px off where you aimed.', apply: m => { m.wild = 0.2; } },
];
export const RELIC_BY_ID = Object.fromEntries(RELICS.map(r => [r.id, r]));
export const RELICS_PER_VISIT = 1, RELIC_OFFER = 3, RELIC_REROLL_GEMS = 3;
export const relicRerollGold = n => Math.round(30 * Math.pow(1.5, n) / 5) * 5;          // 30, 45, 70, 100, 150…
const BASIC_KINDS = new Set(['slash', 'arrow', 'pierce', 'silver', 'orb', 'blast', 'spark', 'wave', 'blade']);

// ---------- shop ----------
export function rollRelics(g) {
  const p = g.p, pool = RELICS.filter(r => (!r.cls || r.cls === p.cls) && !(p.relics && p.relics.has(r.id)));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(g.rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  g.relicOffer = pool.slice(0, RELIC_OFFER).map(r => r.id); return g.relicOffer;
}
export function rerollRelics(g, pay = 'gold') {
  if ((g.visitRelics || 0) >= RELICS_PER_VISIT) return { error: 'You already bought a relic this visit.' };
  if (pay === 'gold') { const c = relicRerollGold(g.relicRerolls || 0); if (g.p.gold < c) return { error: 'Not enough gold.' }; g.p.gold -= c; g.relicRerolls = (g.relicRerolls || 0) + 1; rollRelics(g); return { cost: c }; }
  rollRelics(g); return { gems: RELIC_REROLL_GEMS };                                         // gem payment is taken by the caller (profile)
}
export function buyRelic(g, id) {
  const p = g.p, r = RELIC_BY_ID[id]; if (!r) return { error: 'Unknown relic.' };
  if (!(g.relicOffer || []).includes(id)) return { error: 'Not on sale this visit.' };
  if ((g.visitRelics || 0) >= RELICS_PER_VISIT) return { error: 'One relic per visit.' };
  if (p.gold < r.price) return { error: 'Not enough gold.' };
  p.gold -= r.price; (p.relics = p.relics || new Set()).add(id); g.visitRelics = (g.visitRelics || 0) + 1;
  r.apply(p.mods, g); g.refreshStats(false); g.upgradeLog.push('Relic: ' + r.name); g.emit('bought', { id: 'relic:' + id }); return { cost: r.price };
}

// ---------- bán lại relic: hoàn 50% giá, gỡ cả lợi lẫn hại ----------
// mọi relic chỉ bật cờ hoặc nhân chỉ số, nên dò hiệu ứng bằng cách áp lên hai bản nháp:
// khoá có kết quả không phụ thuộc giá trị cũ là cờ (gỡ đi), còn lại là hệ số nhân (chia ngược lại).
export const relicSellPrice = id => { const r = RELIC_BY_ID[id]; return r ? Math.round(r.price * 0.5 / 5) * 5 : 0; };
function relicEffect(r) {
  const fakeG = { p: { hp: 0, max: 0 } }, probe = base => new Proxy({}, { get: (o, k) => (k in o ? o[k] : base), set: (o, k, v) => { o[k] = v; return true; } }), a = probe(1), b = probe(2);
  r.apply(a, fakeG); r.apply(b, fakeG);
  const fx = {};
  for (const k of Object.keys(a)) { const v1 = a[k], v2 = b[k]; fx[k] = Math.abs(v2 - 2 * v1) < 1e-9 && Math.abs(v1 - 1) > 1e-9 ? { mul: v1 } : Math.abs(v2 - v1) < 1e-9 ? { flag: true } : { mul: v1 }; }
  return fx;
}
export function sellRelic(g, id) {
  const p = g.p, r = RELIC_BY_ID[id]; if (!r || !(p.relics && p.relics.has(id))) return { error: 'You do not own that relic.' };
  const m = p.mods;
  for (const [k, e] of Object.entries(relicEffect(r))) { if (e.flag) delete m[k]; else if (e.mul && typeof m[k] === 'number') { m[k] /= e.mul; if (Math.abs(m[k] - 1) < 1e-9 && /Mul$/.test(k)) delete m[k]; } }
  p.relics.delete(id);
  if (id === 'boomerang') g.relicFx = (g.relicFx || []).filter(f => f.type !== 'blade');
  if (id === 'static') p.static = 0;
  const i = g.upgradeLog.lastIndexOf('Relic: ' + r.name); if (i >= 0) g.upgradeLog.splice(i, 1);
  const v = relicSellPrice(id); p.gold += v; g.refreshStats(false); g.emit('sold', { id: 'relic:' + id, v });
  return { gold: v };
}

// ---------- runtime hooks ----------
const near = (g, x, y, R, skip) => { let best = null, bd = R; for (const e of g.enemies) { if (e.dead || e.type === 'DUMMY' && false || (skip && skip.has(e))) continue; const d = dist(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } } return best; };
// quanh đòn thường: trả về 'block' (không được đánh) hoặc hàm dọn dẹp chạy sau khi đánh
export function relicBasic(g, c, attack) {
  const p = g.p, M = p.mods, fx = g.relicFx || (g.relicFx = []);
  if (M.boomerang && p.cls === 'KNIGHT') {
    if (fx.some(f => f.type === 'blade')) return;                                            // kiếm đang bay: không chém được
    if (c >= 0.97) { const dmg = (12 + 44 * c) * (p.basicMul || 1) * 0.8;
      fx.push({ type: 'blade', x: p.x, y: p.y, a: p.aim, out: true, d: 0, dmg, hit: new Set(), spin: 0 }); p.atkT = 0.3; g.emit('bladeThrow', { x: p.x, y: p.y }); return; }
  }
  if (M.bloodPact && p.hp > 15) p.hp = Math.max(15, p.hp - 1);
  const undo = [], n0 = g.shots.length;
  if (M.unstable) { p.ammoN = (p.ammoN || 0) + 1; if (p.ammoN % 5 === 0) {
    const mode = Math.floor(g.rand() * 3), a0 = p.aim, bm = p.basicMul, sz = M.atkSize; p.aim += (g.rand() - 0.5) * 0.52;
    if (mode === 0) p.basicMul = (bm || 1) * 1.4; if (mode === 1) M.atkSize = (sz || 1) * 1.5; if (mode === 2) g._blastNext = true;
    g.emit('unstable', { x: p.x, y: p.y, mode }); undo.push(() => { p.aim = a0; p.basicMul = bm; M.atkSize = sz; g._blastNext = false; }); } }
  let sb = false; if (M.spellblade && p.spellblade > 0) { sb = true; p.spellblade--; const bm = p.basicMul; p.basicMul = (bm || 1) * 1.5; undo.push(() => { p.basicMul = bm; }); }
  if (M.overclock && p.ocT > 0) { const as = p.atkSpeed; p.atkSpeed = (as || 1) * 1.4; undo.push(() => { p.atkSpeed = as; }); }
  // static: xả sét
  if (M.static && (p.static || 0) >= 5) { let k = Math.floor(p.static / 5), px = p.x, py = p.y; const done = new Set(); p.static = 0;
    while (k-- > 0) { const e = near(g, px, py, done.size ? 170 : 260, done); if (!e) break; done.add(e); g.emit('chain', { x1: px, y1: py, x2: e.x, y2: e.y }); g.hurtEnemy(e, 6 * (M.dmg || 1), Math.atan2(e.y - py, e.x - px), 80, 'zap'); px = e.x; py = e.y; } }
  attack();
  // tên / cầu vừa bắn ra
  const made = g.shots.slice(n0);
  for (const s of made) {
    if (g._blastNext) { s.aoe = Math.max(s.aoe || 0, 50); s.aoeDmg = Math.max(s.aoeDmg || 0, s.dmg * 0.5); }
    if (p.cls === 'RANGER' && M.gambit) { if (c >= 0.97) { s.dmg *= 1.5; s.life *= 1.5; } else if (c === 0) s.dmg *= 0.8; }
    if (p.cls === 'RANGER' && M.cursed) { p.arrowN = (p.arrowN || 0) + 1; if (p.arrowN % 6 === 0) { s.cursed = true; s.t0 = 0; } }
    if (p.cls === 'MAGE' && M.blackHole && c >= 0.9 && s.kind === 'orb') s.hole = true;
  }
  if (sb) { const bx = p.x + Math.cos(p.aim) * (p.cls === 'KNIGHT' ? 90 : 0), by = p.y + Math.sin(p.aim) * (p.cls === 'KNIGHT' ? 90 : 0);
    if (p.cls === 'KNIGHT') { for (const e of g.enemies) if (!e.dead && dist(bx, by, e.x, e.y) < 60 + e.r) g.hurtEnemy(e, 10 * (p.basicMul || 1), Math.atan2(e.y - by, e.x - bx), 160, 'blast'); g.emit('boom', { x: bx, y: by, r: 60, el: p.sbEl }); }
    else for (const s of made) { s.aoe = Math.max(s.aoe || 0, 60); s.aoeDmg = Math.max(s.aoeDmg || 0, 10 * (p.basicMul || 1)); s.sbEl = p.sbEl; } }
  if (g._blastNext && p.cls === 'KNIGHT') { const R = 50, bx = p.x + Math.cos(p.aim) * 100, by = p.y + Math.sin(p.aim) * 100;
    for (const e of g.enemies) if (!e.dead && dist(bx, by, e.x, e.y) < R + e.r) g.hurtEnemy(e, 12 * (p.basicMul || 1) * 0.5, Math.atan2(e.y - by, e.x - bx), 200, 'blast');
    g.emit('boom', { x: bx, y: by, r: R, el: 'FIRE' }); }
  for (const u of undo) u();
}
// đòn đánh trúng: trả về hệ số sát thương
export function relicHit(g, e, kind) {
  const M = g.p.mods; let mul = 1;
  if (e.doomT > 0) mul *= 1.15;
  if (g._wildHalfT > g.t && kind === 'skill') mul *= 0.5;
  if (g._echoHalfT > g.t && kind === 'skill') mul *= 0.6;
  if (kind === 'skill' && !e.dead) {
    if (M.overload) { let lone = true; for (const q of g.enemies) if (q !== e && !q.dead && q.type !== 'DUMMY' && dist(q.x, q.y, e.x, e.y) < 150) { lone = false; break; } if (lone) mul *= 0.85;
      const O = g._ovl && g._ovl.id === g._castId ? g._ovl : (g._ovl = { id: g._castId, hit: new Set(), done: false }); O.hit.add(e);
      if (!O.done && O.hit.size >= 3) { O.done = true; const v = Math.round((g._castCost || 0) * 0.35); if (v > 0) { g.p.energy = Math.min(g.p.energyMax, g.p.energy + v); g.emit('refund', { x: g.p.x, y: g.p.y, v }); } } }
    if (M.gravity && g.t >= (g._gravT || 0) && g.rand() < 0.2) { g._gravT = g.t + 2.5; (g.relicFx || (g.relicFx = [])).push({ type: 'hole', x: e.x, y: e.y, t: 1.2, T: 1.2, tick: 0.25, R: 110, dmg: 3 }); g.emit('blackHole', { x: e.x, y: e.y, small: true }); }
  }
  if (M.potato && BASIC_KINDS.has(kind) && !e.dead) { const fx = g.relicFx || (g.relicFx = []); let b = fx.find(f => f.type === 'potato');
    if (!b) fx.push({ type: 'potato', e, t: 3, mult: 1, hopT: 0 });
    else if (b.e !== e && b.hopT <= 0) { b.e = e; b.mult = Math.min(2, b.mult * 1.15); b.hopT = 0.25; g.emit('potatoPass', { x: e.x, y: e.y }); } }
  return mul;
}
export function relicKill(g, e, kind) {
  const p = g.p, M = p.mods, fx = g.relicFx || (g.relicFx = []);
  if (M.chainReact && (BASIC_KINDS.has(kind) || kind === 'chainboom') && (g._chainD || 0) < 4) {
    const R = 80, dmg = (e.max || 50) * 0.2; g._chainD = (g._chainD || 0) + 1; g.emit('boom', { x: e.x, y: e.y, r: R, el: 'FIRE' });
    for (const q of g.enemies) if (!q.dead && q !== e && dist(e.x, e.y, q.x, q.y) < R + q.r) g.hurtEnemy(q, dmg, Math.atan2(q.y - e.y, q.x - e.x), 260, 'chainboom');
    if (dist(e.x, e.y, p.x, p.y) < 60) g.hurtPlayer(5, Math.atan2(p.y - e.y, p.x - e.x));
    g._chainD--;
  }
  if (kind === 'skill') {
    if (M.polter && g.rand() < M.polter) { fx.push({ type: 'ghost', x: e.x, y: e.y, vx: 0, vy: -60, life: 3, dmg: 12 }); p.energy = Math.max(0, p.energy - 2); }
    if (M.bats && g.rand() < M.bats) fx.push({ type: 'bat', x: e.x, y: e.y, vx: 0, vy: -80, life: 3, dmg: 8 });
  }
}
// trước khi cast: lệch chỗ nhắm (Wild Magic); sau khi cast: bản sao miễn phí, Overclock
export function relicCastAim(g, ax, ay) { const M = g.p.mods; if (!M.wild || g._wildCopy) return [ax, ay]; const a = g.rand() * Math.PI * 2, r = g.rand() * 60; return [ax + Math.cos(a) * r, ay + Math.sin(a) * r]; }
export function relicAfterCast(g, sk, ax, ay) {
  const p = g.p, M = p.mods;
  if (M.overclock) { p.ocT = 2; g.emit('overclock', { x: p.x, y: p.y }); }
  if (M.spellblade) { p.spellblade = 2; p.sbEl = (sk.els && sk.els[0]) || 'FIRE'; g.emit('spellblade', { x: p.x, y: p.y, el: p.sbEl }); }
  if (M.echo && !g._wildCopy && !g._echoCopy && !sk.ult) { p.echoN = (p.echoN || 0) + 1;
    if (p.echoN % 4 === 0) g.pend(0.5, () => { const pf = p.freeCast, pt = p.freeCastT; p.freeCast = sk.key; p.freeCastT = 1; g._echoCopy = true; g._echoHalfT = g.t + 0.6; g.emit('echoCast', { x: ax, y: ay });
      try { g.castNow(sk, ax, ay); } finally { g._echoCopy = false; p.freeCast = pf; p.freeCastT = pt; } }); }
  if (M.wild && !g._wildCopy && g.rand() < M.wild) {
    const a = g.rand() * Math.PI * 2, r = 40 + g.rand() * 120, cx = ax + Math.cos(a) * r, cy = ay + Math.sin(a) * r;
    g.pend(0.18, () => { const pf = p.freeCast, pt = p.freeCastT; p.freeCast = sk.key; p.freeCastT = 1; g._wildCopy = true; g._wildHalfT = g.t + 0.6; g.emit('wildCopy', { x: cx, y: cy });
      try { g.castNow(sk, cx, cy); } finally { g._wildCopy = false; p.freeCast = pf; p.freeCastT = pt; } });
  }
}
export const relicBlocksEnergy = g => !!(g.p.mods.overclock && g.p.ocT > 0);
export const healMul = p => p.mods.healMul || 1;
// mỗi khung
export function tickRelics(g, dt) {
  const p = g.p, M = p.mods, fx = g.relicFx || (g.relicFx = []);
  if (p.ocT > 0) p.ocT = Math.max(0, p.ocT - dt);
  for (const e of g.enemies) if (e.doomT > 0) e.doomT -= dt;
  // static: tích theo quãng đi bộ, mất khi đứng yên 1s
  if (M.static) { const lx = p._lx ?? p.x, ly = p._ly ?? p.y, mv = Math.hypot(p.x - lx, p.y - ly);
    if (mv > 0.5) { p.idleT = 0; p.staticD = (p.staticD || 0) + mv; while (p.staticD >= 60) { p.staticD -= 60; p.static = Math.min(10, (p.static || 0) + 1); } }
    else if ((p.idleT = (p.idleT || 0) + dt) > 1 && p.static) { p.static = 0; g.emit('staticLost', { x: p.x, y: p.y }); } }
  // Juggernaut: lướt xuyên địch gây sát thương, cộng combo; trúng ≥2 thì hồi lướt giảm nửa
  if (M.juggernaut && p.cls === 'KNIGHT') { const on = p.dashT > 0;
    if (on && !p._jugOn) p._jug = new Set();
    if (on) for (const e of g.enemies) if (!e.dead && !p._jug.has(e) && dist(p.x, p.y, e.x, e.y) < e.r + p.r + 14) { p._jug.add(e); g.hurtEnemy(e, 18 * (M.dmg || 1), Math.atan2(e.y - p.y, e.x - p.x), 220, 'slash'); p.combo = Math.min(2, (p.combo || 0) + 1); p.comboT = 0.75; g.emit('jugHit', { x: e.x, y: e.y }); }
    if (!on && p._jugOn && p._jug && p._jug.size >= 2) { p.dashCd *= 0.5; g.emit('jugReset', { x: p.x, y: p.y }); }
    p._jugOn = on; }
  // Hunter's Gambit: mỗi lần lướt mất 15% Focus
  if (M.gambit) { if (p.dashT > 0 && !p._wasDash) p.focus = Math.max(0, (p.focus ?? 1) - 0.15); p._wasDash = p.dashT > 0; }
  p._lx = p.x; p._ly = p.y; p.bladeOut = fx.some(f => f.type === 'blade');
  for (const f of fx) {
    if (f.type === 'potato') { f.t -= dt; f.hopT -= dt; if (f.e && !f.e.dead) { f.x = f.e.x; f.y = f.e.y; }
      if (f.t <= 0) { const R = 90, dmg = 18 * f.mult * (M.dmg || 1);
        for (const e of g.enemies) if (!e.dead && dist(f.x, f.y, e.x, e.y) < R + e.r) g.hurtEnemy(e, dmg, Math.atan2(e.y - f.y, e.x - f.x), 320, 'potatoboom');
        if (dist(f.x, f.y, p.x, p.y) < 70) g.hurtPlayer(6, Math.atan2(p.y - f.y, p.x - f.x));
        g.emit('boom', { x: f.x, y: f.y, r: R, el: 'FIRE' }); f.done = true; } }
    else if (f.type === 'ghost' || f.type === 'bat') { f.life -= dt; const e = near(g, f.x, f.y, 520);
      if (e) { const a = Math.atan2(e.y - f.y, e.x - f.x), sp = f.type === 'bat' ? 330 : 260; f.vx += (Math.cos(a) * sp - f.vx) * Math.min(1, dt * 5); f.vy += (Math.sin(a) * sp - f.vy) * Math.min(1, dt * 5);
        if (dist(f.x, f.y, e.x, e.y) < e.r + 10) { g.hurtEnemy(e, f.dmg * (M.dmg || 1), a, 80, 'relic'); if (f.type === 'bat') p.hp = Math.min(p.max, p.hp + 1 * healMul(p)); f.done = true; g.emit('relicBite', { x: e.x, y: e.y, kind: f.type }); } }
      f.x += f.vx * dt; f.y += f.vy * dt; if (f.life <= 0) f.done = true; }
    else if (f.type === 'blade') { f.spin += dt * 20; const sp = f.out ? 700 : 820;
      if (f.out) { f.x += Math.cos(f.a) * sp * dt; f.y += Math.sin(f.a) * sp * dt; f.d += sp * dt; if (f.d >= 300 || g.world.blocked(f.x, f.y, 10)) { f.out = false; f.hit = new Set(); } }
      else { const a = Math.atan2(p.y - f.y, p.x - f.x); f.x += Math.cos(a) * sp * dt; f.y += Math.sin(a) * sp * dt; if (dist(f.x, f.y, p.x, p.y) < 24) f.done = true; }
      for (const e of g.enemies) if (!e.dead && !f.hit.has(e) && dist(f.x, f.y, e.x, e.y) < e.r + 26) { f.hit.add(e); g.hurtEnemy(e, f.dmg, Math.atan2(e.y - f.y, e.x - f.x), 260, 'blade'); } }
    else if (f.type === 'hole') { f.t -= dt; f.tick -= dt;
      const HR = f.R || 130; for (const e of g.enemies) { if (e.dead || e.boss) continue; const d = dist(f.x, f.y, e.x, e.y); if (d < HR && d > 4) { const step = Math.min(d - 2, 150 * dt / Math.max(0.5, ENEMY_MASS(e))); e.x += (f.x - e.x) / d * step; e.y += (f.y - e.y) / d * step; } }
      if (f.tick <= 0) { f.tick = 0.25; for (const e of g.enemies) if (!e.dead && dist(f.x, f.y, e.x, e.y) < HR + e.r) g.hurtEnemy(e, (f.dmg || 4) * (f.dmg ? (M.dmg || 1) : (p.basicMul || 1)), 0, 0, 'hole'); }
      if (f.t <= 0) { f.done = true; g.emit('holeEnd', { x: f.x, y: f.y, r: HR * 0.85 }); } }
  }
  g.relicFx = fx.filter(f => !f.done);
}
const ENEMY_MASS = e => (ENEMIES[e.type] && ENEMIES[e.type].mass) || 1;
// tên nguyền: lắc lư khi bay, trúng thì Doom
export function relicShots(g, dt, before) {
  for (const s of g.shots) { if (!s.cursed) continue; s.t0 += dt; const a = Math.atan2(s.vy, s.vx) + Math.sin(s.t0 * 22) * 0.09, sp = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.a = a; }
  const cs = g.shots.filter(s => s.cursed); before();
  for (const s of cs) for (const e of s.hit) if (!e._doomFrom || e._doomFrom !== s) { e._doomFrom = s; e.doomT = 3; g.emit('doom', { x: e.x, y: e.y }); }
}
// cầu tụ lực ≥ 90% nổ thì sụp thành hố đen
export function relicExplode(g, s) { if (s.hole && !s.holed) { s.holed = true; (g.relicFx || (g.relicFx = [])).push({ type: 'hole', x: s.x, y: s.y, t: 1.5, T: 1.5, tick: 0.25, R: 130 }); g.emit('blackHole', { x: s.x, y: s.y }); } }

// Blood Magic: trả phần năng lượng thiếu bằng máu (1 HP / 2 năng lượng), không xuống dưới 20% máu
export function bloodCost(g, cost) { const p = g.p; if (!p.mods.bloodMagic || p.energy >= cost) return 0; return Math.ceil((cost - p.energy) / 2); }
export function canBloodPay(g, cost) { const p = g.p, h = bloodCost(g, cost); return h > 0 && p.hp - h >= p.max * 0.2; }
export function bloodPay(g, cost) { const p = g.p, h = bloodCost(g, cost); if (!h || p.hp - h < p.max * 0.2) return false; p.hp -= h; p.energy = 0; g.emit('bloodPay', { x: p.x, y: p.y, v: h }); return true; }
// dòng trạng thái đang chạy của relic (cho tab Build)
export function relicLive(g, id) {
  const p = g.p;
  if (id === 'static') return 'Static: ' + (p.static || 0) + ' / 10';
  if (id === 'overclock' && p.ocT > 0) return 'Overclocked: ' + p.ocT.toFixed(1) + 's left';
  if (id === 'echo') return 'Next echo in ' + (4 - ((p.echoN || 0) % 4)) + ' cast(s)';
  if (id === 'spellblade' && p.spellblade > 0) return 'Charged swings left: ' + p.spellblade;
  if (id === 'gravity') return g.t < (g._gravT || 0) ? 'Recharging: ' + ((g._gravT || 0) - g.t).toFixed(1) + 's' : 'Ready';
  if (id === 'unstable') return 'Wild shot in ' + (5 - ((p.ammoN || 0) % 5)) + ' attack(s)';
  if (id === 'cursed') return 'Cursed arrow in ' + (6 - ((p.arrowN || 0) % 6)) + ' shot(s)';
  return '';
}
