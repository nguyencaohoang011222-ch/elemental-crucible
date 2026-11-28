// Nối môi trường vào trận đấu: mặt đất ảnh hưởng mọi sinh vật, chiêu tác động lên mặt đất,
// năng lực riêng của quái từng vùng, nấm nổ, bẫy trần, mạch phun.
import { ENEMIES, dist, angDiff } from './sim.js';
import { Surface, SURF_FX, SURF_FX_E, ROSTER, ELITES, mapHazards, WARN, ELITE } from './env.js';
import { foeAI, FOE_AIS, trackPV, splitFoe } from './foes.js';

const PROJ = new Set(['arrow', 'pierce', 'orb', 'sbolt', 'sarrow', 'crescent', 'shard', 'cyclone']);

export function initEnv(g, opts) {
  g.surface = new Surface(g.world); g.world.surface = g.surface;
  g.theme = 'forest'; g.mapHz = []; g.hzPrev = new Map(); g.envT = 0;
  g.surfFx = (x, y) => SURF_FX[g.surface.at(x, y)] || null;
  g.surfFxE = (x, y) => SURF_FX_E[g.surface.at(x, y)] || null;
  g.enemyHit = (e, d) => { if (d.onHit === 'chill') chill(g, 1); if (d.onHit === 'poison') applyEl(g, g.p.x, g.p.y, 26, 'POISON', { life: 3 }); };
  g.enemyCast = (e, d) => {
    if (!d.bell) return false;
    e.casts = (e.casts || 0) + 1; if (e.casts % 3) return false;
    // chuông: vòng choáng quanh thầy tu, có báo trước
    g.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: 125, t: 0.8, T: 0.8, hold: 0, dmg: 8 * g.dmgScale, color: '#e6b84a', stunP: 0.7, owner: null });
    g.emit('bellRing', { x: e.x, y: e.y }); return true;
  };
  const prevHit = g.world.onHitObs;
  g.fused = new Set();
  g.world.onHitObs = o => { if (prevHit) prevHit(o); if (g.theme === 'dungeon' && o.type === 'tree' && !o.dead) sporeBurst(g, o);
    if (g.theme === 'volcano' && o.type === 'rock' && !o.dead) { o.hp = o.max; if (!(o.fuse > 0)) { o.fuse = 2.2; o.fuseT = 2.2; g.fused.add(o); g.emit('fuseLit', { x: o.x, y: o.y }); } } };
}
export function setTheme(g, theme) {
  if (g.theme !== theme) { g.surface.cells.clear(); g.surface.burning.clear(); }
  g.theme = theme; g.surface.theme = theme;
}
export function rosterType(g, base) { const R = ROSTER[g.theme] || ROSTER.forest; return base === 'CHARGER' ? R[1] : base === 'SHOOTER' ? R[2] : R[0]; }

export function chill(g, n) {
  const p = g.p; p.chill = (p.chill || 0) + n; p.chillT = 2.6;
  if (p.chill >= 3) { p.chill = 0; p.frozen = 0.8; g.emit('playerFrozen', { x: p.x, y: p.y }); }
}
function sporeBurst(g, o) {
  g.world.breakObs(o);
  for (const r of g.surface.apply(o.x, o.y, 95, 'POISON', { life: 6 })) react(g, r);
  g.emit('sporeBurst', { x: o.x, y: o.y, r: 95 });
}
function react(g, r) {
  if (r.kind === 'steam') g.emit('steamPop', { x: r.x, y: r.y });
  else if (r.kind === 'explode') { // khí độc gặp lửa: nổ, trúng cả hai phe
    for (const e of g.enemies) if (!e.dead && dist(e.x, e.y, r.x, r.y) < 70 + e.r) { g.hurtEnemy(e, 30, Math.atan2(e.y - r.y, e.x - r.x), 260, 'blast'); e.burn = Math.max(e.burn || 0, 2); }
    g.world.damageObstacles(r.x, r.y, 60, 40);
    if (dist(g.p.x, g.p.y, r.x, r.y) < 70) g.hurtPlayer(14, Math.atan2(g.p.y - r.y, g.p.x - r.x), { boss: true });
    g.emit('boom', { x: r.x, y: r.y, r: 70, el: 'FIRE' });
  }
}
export function applyEl(g, x, y, r, el, opt = {}) { for (const q of g.surface.apply(x, y, r, el, { rand: g.rand, ...opt })) react(g, q); }

// ---------- địa hình hệ Đất ----------
// Đất lồi lên theo nhiều hình dạng (gờ, gò, miệng hố, đá nhọn, bờ cong). Các mảnh nhỏ, có khe hở, hết hạn sau vài giây:
// chặn từng phần để đổi đường đi chứ không dựng thành tường kín.
const TAU2 = Math.PI * 2;
function raise(g, type, x, y, r, life, hp, delay = 0) {
  const place = () => {
    const p = g.p; if (dist(x, y, p.x, p.y) < r + p.r + 3 || g.world.blocked(x, y, r * 0.6)) return;
    const o = g.world.addTemp(type, x, y, r, life, hp); o.v = g.rand(); o.rise = 0.28; o.earth = true;
  };
  if (delay > 0) g.pend(delay, place); else place();
}
// gờ đất dọc một đường: bỏ cách quãng để chừa khe, lệch trái-phải cho tự nhiên
function ridgeLine(g, x, y, a, len, n, bend, delay0, stepT, skipEvery, life = 5) {
  const nx = -Math.sin(a), ny = Math.cos(a);
  for (let i = 0; i < n; i++) {
    if (skipEvery && i % skipEvery === skipEvery - 1) continue;
    const t = n > 1 ? i / (n - 1) : 0.5, off = Math.sin(t * Math.PI) * bend + (i % 2 ? 6 : -6);
    raise(g, 'ridge', x + Math.cos(a) * (t - 0.5) * len + nx * off, y + Math.sin(a) * (t - 0.5) * len + ny * off, 14 + (i % 3), life, 70, delay0 + i * stepT);
  }
}
// vành miệng hố quanh một điểm, chừa một khe
function crater(g, x, y, R, n, delay, life = 6) {
  const gapA = g.rand() * TAU2;
  for (let i = 0; i < n; i++) { const q = i / n * TAU2; if (Math.abs(Math.atan2(Math.sin(q - gapA), Math.cos(q - gapA))) < 0.55) continue; raise(g, 'mound', x + Math.cos(q) * R, y + Math.sin(q) * R * 0.92, 16 + g.rand() * 4, life, 80, delay + (i % 4) * 0.03); }
}
function mounds(g, x, y, area, n, delay, life = 5) {
  for (let i = 0; i < n; i++) { const q = g.rand() * TAU2, d = Math.sqrt(g.rand()) * area; raise(g, 'mound', x + Math.cos(q) * d, y + Math.sin(q) * d, 19 + g.rand() * 6, life, 90, delay + i * 0.12); }
}
function shards(g, x, y, R, n, delay, life = 5) {
  for (let i = 0; i < n; i++) { const q = g.rand() * TAU2, d = R * (0.4 + g.rand() * 0.6); raise(g, 'shard', x + Math.cos(q) * d, y + Math.sin(q) * d, 12 + g.rand() * 5, life, 60, delay + i * 0.05); }
}
// bờ đất cong chắn phía trước người chơi (thay tường thẳng của Ranger)
function berm(g, x, y, a, len, life) {
  const p = g.p, nx = -Math.sin(a), ny = Math.cos(a), cx = p.x + Math.cos(a) * 42, cy = p.y + Math.sin(a) * 42, n = Math.max(5, Math.round(len / 24));
  for (let i = 0; i < n; i++) { const t = i / (n - 1) - 0.5, bow = (0.25 - t * t) * 70; raise(g, 'ridge', cx + nx * t * len + Math.cos(a) * bow, cy + ny * t * len + Math.sin(a) * bow, 15, life, 90, 0.04 + Math.abs(t) * 0.25); }
}
// dựng địa hình theo dạng chiêu; s = quy mô (1 = chiêu Đất thuần, nhỏ hơn cho chiêu ghép)
function earthShape(g, sk, x, y, a, s) {
  const p = g.p, big = s > 1;
  switch (sk.shape) {
    case 'spikes': {
      const lines = sk.radial || sk.lines || 1;
      for (let L = 0; L < lines; L++) {
        const ang = sk.radial ? a + L * TAU2 / lines : a + (lines > 1 ? (L - (lines - 1) / 2) * sk.spread : 0), pc = Math.max(3, Math.round(sk.count * s));
        ridgeLine(g, p.x + Math.cos(ang) * sk.count * sk.spacing * 0.5 + Math.cos(ang) * 30, p.y + Math.sin(ang) * sk.count * sk.spacing * 0.5 + Math.sin(ang) * 30, ang, sk.count * sk.spacing * 0.9, pc, lines > 1 ? 10 : 18, 0.05, sk.step, s < 1 ? 2 : 3);
      }
      break;
    }
    case 'rain': mounds(g, x, y, (sk.area || 140) * 0.75, Math.round((big ? 6 : 3) * (s < 1 ? 0.7 : 1)), (sk.delay || 0.3) + 0.15); break;
    case 'ground': crater(g, x, y, sk.radius * 0.7, big ? 10 : 8, sk.delay || 0.6); if (!big) shards(g, x, y, sk.radius * 0.35, 2, (sk.delay || 0.6) + 0.1); else shards(g, x, y, sk.radius * 0.5, 4, (sk.delay || 0.6) + 0.1); break;
    case 'well': crater(g, x, y, sk.radius * 0.6, 8, sk.life || 1.5); break;
    default: shards(g, big ? p.x : x, big ? p.y : y, big ? 80 : 56, Math.round((big ? 6 : 3) * (s < 1 ? 0.7 : 1)), sk.delay || sk.time || 0.15);
  }
}

// chiêu hệ Đất đổi địa hình (gọi một lần mỗi lần tung chiêu)
export function terraform(g, sk, x, y) {
  const c = sk.combo || sk.els; if (!c || !c.includes('EARTH')) return;
  const p = g.p, a = Math.atan2(y - p.y, x - p.x), [A, B] = c, tri = c.length >= 3, pure = A === 'EARTH' && (B === 'EARTH' || B === undefined);
  const at = sk.shape === 'ground' || sk.shape === 'rain' ? (sk.delay || 0.3) : 0;
  const surf = (r, el) => { const f = () => applyEl(g, x, y, r, el); if (at > 0) g.pend(at, f); else f(); };
  if (sk.wallOrigin) { berm(g, p.x, p.y, a, sk.wallOrigin.length, sk.wallOrigin.life); surf(70, 'RUBBLE'); g.emit('terraform', { x: p.x, y: p.y, kind: 'earth' }); return; }
  if (tri) { earthShape(g, sk, x, y, a, 1.5); surf(90, 'RUBBLE'); g.emit('terraform', { x, y, kind: 'earth' }); return; }
  if (pure) { earthShape(g, sk, x, y, a, 1); surf(sk.shape === 'ground' ? sk.radius * 0.9 : 80, 'RUBBLE'); g.emit('terraform', { x, y, kind: 'earth' }); return; }
  if (A === 'EARTH' && B === 'FIRE') { for (let k = 0; k < 4; k++) applyEl(g, p.x + Math.cos(a) * (60 + k * 55), p.y + Math.sin(a) * (60 + k * 55), 34, 'MAGMA'); earthShape(g, sk, x, y, a, 0.6); g.emit('terraform', { x, y, kind: 'magma' }); }
  else if (A === 'EARTH' && B === 'WATER') { surf(105, 'MUD'); earthShape(g, sk, x, y, a, 0.6); g.emit('terraform', { x, y, kind: 'mud' }); }
  else if (A === 'EARTH' && B === 'WIND') { surf(120, 'SAND'); earthShape(g, sk, x, y, a, 0.6); g.emit('terraform', { x, y, kind: 'sand' }); }
  else if (B === 'EARTH') { surf(90, 'RUBBLE'); earthShape(g, sk, x, y, a, 0.6); g.emit('terraform', { x, y, kind: 'rubble' }); }
}
export function envHit(g, x, y, r, sk, eff) {
  if (!sk || sk.noEnv || !sk.els) return;
  const el = sk.els[sk.els.length - 1];
  if (el === 'FIRE' || (eff && eff.burn)) applyEl(g, x, y, r * 0.8, 'FIRE');
  else if (el === 'WATER') applyEl(g, x, y, r * 0.8, 'WATER', { freeze: !!(eff && eff.freeze), puddle: true });
  else applyEl(g, x, y, r * 0.8, el);
}

// lá chắn/giáp phía trước của quái
export function frontGuard(g, e, dmg, a, kind) {
  const d = ENEMIES[e.type]; if (!d || !d.front || kind === 'burn' || kind === 'env') return dmg;
  const face = e.state === 'move' || d.front === 'shield' ? Math.atan2(g.p.y - e.y, g.p.x - e.x) : e.ta;
  if (Math.abs(angDiff(a + Math.PI, face)) > 1.1) return dmg;
  if (d.front === 'armor') { g.emit('block', { x: e.x, y: e.y }); return dmg * 0.3; }
  e.blockT = 0.35;
  if (PROJ.has(kind)) { g.emit('block', { x: e.x, y: e.y }); return dmg * 0.1; }
  return dmg * 0.6;
}
export function onDeath(g, e) {
  const d = ENEMIES[e.type]; if (!d) return;
  if (d.death === 'poison') { applyEl(g, e.x, e.y, 80, 'POISON', { life: 6 }); g.emit('sporeBurst', { x: e.x, y: e.y, r: 80 }); }
  if (d.death === 'puddle') applyEl(g, e.x, e.y, 34, 'POISON', { life: 4 });
  if (d.death === 'explode') g.hazards.push({ kind: 'circle', x: e.x, y: e.y, r: 75, t: 0.6, T: 0.6, hold: 0, dmg: 20 * g.dmgScale, color: '#ff7a3c', owner: null, after: () => applyEl(g, e.x, e.y, 60, 'BURN') });
}
// đạn quái rơi xuống: để lại mặt đất theo loại
export function foeLand(g, f) {
  if (f.split && !f.caught) splitFoe(g, f);
  if (!f.kind) return;
  if (f.hitP && f.kind === 'ice') chill(g, 1);
  if (f.kind === 'ice') applyEl(g, f.x, f.y, 34, 'ICE', { life: 8 });
  else if (f.kind === 'poison') applyEl(g, f.x, f.y, 52, 'POISON', { life: 5 });
  else if (f.kind === 'lava') applyEl(g, f.x, f.y, 34, 'LAVA', { life: 6 });
  else if (f.kind === 'thorn') applyEl(g, f.x, f.y, 30, 'THORN');
  else if (f.kind === 'spore') applyEl(g, f.x, f.y, 34, 'POISON', { life: 4 });
  else if (f.kind === 'sporelet') applyEl(g, f.x, f.y, 18, 'POISON', { life: 2.5 });
}

// sát thủ: tiến lại, biến mất, hiện sau lưng rồi chém (có vạch báo trước)
function assassin(g, e, d, dt) {
  const p = g.p, dp = dist(e.x, e.y, p.x, p.y), toP = Math.atan2(p.y - e.y, p.x - e.x);
  if (e.freeze > 0 || e.stun > 0) { e.alpha = 1; return; }
  if (e.state === 'move' && d.elite) { e.alpha = 1; let a = dp > 260 ? toP : dp < 180 ? toP + Math.PI : toP + Math.PI / 2 * (e.id % 2 ? 1 : -1);
    for (const s of g.shots) if (dist(s.x, s.y, e.x, e.y) < 110) { a = Math.atan2(s.vy || 0, s.vx || 0) + Math.PI / 2 * (e.id % 2 ? 1 : -1); break; }   // né đạn
    e.x += Math.cos(a) * d.speed * dt; e.y += Math.sin(a) * d.speed * dt; g.world.collide(e, d.r);
    if (dp < 320 && e.st <= 0 && g.gate(e)) { e.state = 'vanish'; e.st = 0.45; g.emit('tele', { x: e.x, y: e.y }); } }
  else if (e.state === 'move') { e.alpha = 1; if (dp > 200) { e.x += Math.cos(toP) * d.speed * dt; e.y += Math.sin(toP) * d.speed * dt; } if (dp < 320 && e.st <= 0 && g.gate(e)) { e.state = 'vanish'; e.st = 0.45; g.emit('tele', { x: e.x, y: e.y }); } }
  else if (e.state === 'vanish') {
    e.alpha = Math.max(0, e.st / 0.45);
    if (e.st <= 0) {
      const a = p.aim + Math.PI; let x = p.x + Math.cos(a) * 85, y = p.y + Math.sin(a) * 85; if (g.world.blocked(x, y, d.r)) { x = p.x - Math.cos(a) * 85; y = p.y - Math.sin(a) * 85; }
      e.x = x; e.y = y; e.alpha = 1; e.state = 'windup'; e.st = 0.8; e.ta = Math.atan2(p.y - y, p.x - x);
      if (d.elite || d.illusion) g.hazards.push({ kind: 'arc', x, y, a: e.ta, r: 100, arc: 2.2, t: 0.5, T: 0.5, hold: 0, dmg: d.dmg * g.dmgScale, color: '#b07aff', owner: null });
      else { // nhát lưỡi liềm thứ nhất rồi nhát thứ hai chéo ngược, cách 0.18s
        for (const [k, t] of [[-1, 0.45], [1, 0.63]]) g.hazards.push({ kind: 'arc', x, y, a: e.ta + k * 0.32, r: 125, arc: 2.1, t, T: t, hold: 0, dmg: d.dmg * 0.65 * g.dmgScale, color: '#ff2a4a', sty: 'blood', owner: null, slash: true, crescent: k });
        g.emit('shadowSmoke', { x, y }); }
      g.emit('bossBlink', { x, y });
    }
  } else if (e.state === 'windup') { if (e.st <= 0) { e.state = 'move'; e.st = 2.4 + g.rand(); } }
  else if (e.state === 'stagger') { e.alpha = 1; if (e.st <= 0) { e.state = 'move'; e.st = 1; } }
}
// ---------- quái tinh anh: lối tiếp cận riêng, không đi thẳng như lính thường ----------
// trả về hướng đi (radian) hoặc null (giữ hướng mặc định). Chỉ đọc trạng thái mô phỏng → tất định.
export function eliteSteer(g, e, d, dp, toP) {
  const p = g.p, sk = d.skill;
  if (sk === 'quake') { // Ember Hulk: vòng ra sau lưng hướng ngắm của người chơi rồi mới áp sát
    if (dp < 130) return null; const bx = p.x - Math.cos(p.aim || 0) * 120, by = p.y - Math.sin(p.aim || 0) * 120;
    const ab = Math.atan2(by - e.y, bx - e.x); if (dist(e.x, e.y, bx, by) < dp) return ab;   // điểm sau lưng ở gần hơn người chơi: đi thẳng tới
    const df = angDiff(ab, toP), side = Math.abs(df) > 0.05 ? Math.sign(df) : (e.id % 2 ? 1 : -1); return toP + side * 1.05; }   // còn không thì đi vòng một bên
  if (sk === 'brood') { // Spore Mother: núp sau bầy lính, giữ ~260px
    let sh = null, sd = 1e9; for (const o of g.enemies) { if (o === e || o.dead || o.boss || ENEMIES[o.type].elite) continue; const q = dist(o.x, o.y, p.x, p.y); if (q < sd && q > 120) { sd = q; sh = o; } }
    if (sh) { const a = Math.atan2(sh.y - p.y, sh.x - p.x), tx = sh.x + Math.cos(a) * 70, ty = sh.y + Math.sin(a) * 70; if (dist(e.x, e.y, tx, ty) > 24) return Math.atan2(ty - e.y, tx - e.x); }
    return dp < 230 ? toP + Math.PI : dp > 300 ? toP : toP + Math.PI / 2 * (e.id % 2 ? 1 : -1); }
  if (sk === 'frostbeam') { // Rime Seer: thả diều xa, bị ngắm thẳng vào thì dạt ngang
    if (dp < 340) return null; const aimed = Math.abs(angDiff(p.aim || 0, Math.atan2(e.y - p.y, e.x - p.x))) < 0.3; return aimed ? toP + Math.PI / 2 * (e.id % 2 ? 1 : -1) : null; }
  if (sk === 'rampage') { // Inferno Brute: chạy tới điểm chéo bên hông rồi mới húc
    const s = e.id % 2 ? 1 : -1; if (e.flA == null) e.flA = Math.atan2(e.y - p.y, e.x - p.x) + s * 1.2;   // chốt góc chéo một lần cho mỗi cú húc
    const fx = p.x + Math.cos(e.flA) * 230, fy = p.y + Math.sin(e.flA) * 230;
    e.ready = dist(e.x, e.y, fx, fy) < 70 || dp > 420; return e.ready ? toP : Math.atan2(fy - e.y, fx - e.x); }
  return null;
}
const skillRange = d => ({ quake: 260, frostbeam: 900, brood: 420, mirror: 420, rampage: 520 })[d.skill] * ELITE.reach;
// ---------- quái tinh anh: mỗi map một chiêu riêng (bản mini của boss) ----------
export function eliteFor(theme) { return ELITES[theme] || ELITES.forest; }
function eliteSkill(g, e, d) {
  const p = g.p, a = Math.atan2(p.y - e.y, p.x - e.x), dm = g.dmgScale * ELITE.dmg;   // chiêu elite mạnh theo cùng hệ số
  g.emit('eliteCast', { x: e.x, y: e.y, name: d.name });
  if (d.skill === 'quake') { // đập đất: vòng sóng có khe + để lại lửa
    const reach = Math.min(dist(e.x, e.y, p.x, p.y), 180 * ELITE.reach), x = e.x + Math.cos(a) * reach, y = e.y + Math.sin(a) * reach;
    g.hazards.push({ kind: 'circle', x, y, r: 115, t: 0.95, T: 0.95, hold: 0, dmg: 26 * dm, color: '#ff5a2a', owner: null, shock: { speed: 300, max: 300, thick: 22, dmg: 14 * dm }, after: () => applyEl(g, x, y, 70, 'BURN', { life: 3 }) });
  } else if (d.skill === 'frostbeam') { // tia băng rộng bằng người, xuyên cả map; trúng thì đóng băng
    g.hazards.push({ kind: 'rect', x: e.x + Math.cos(a) * 1200, y: e.y + Math.sin(a) * 1200, a, len: 2400, width: 46, t: 1.2, T: 1.2, hold: 0, dmg: 22 * dm, color: '#3a8aff', owner: null, stunP: 1.0, after: () => { for (let k = 1; k < 14; k++) applyEl(g, e.x + Math.cos(a) * k * 90, e.y + Math.sin(a) * k * 90, 26, 'ICE', { life: 6 }); g.emit('frostBeam', { x: e.x, y: e.y, a }); } });
    e.st = Math.max(e.st, 1.6);
  } else if (d.skill === 'brood') { // rải lính nấm mini từ lưng + nổ mây độc
    for (let k = 0; k < 3; k++) { const q = a + (g.rand() - 0.5) * 1.2, r = 110 * ELITE.reach; const m = g.spawnAt('MINISPORE', e.x + Math.cos(q) * r, e.y + Math.sin(q) * r); m.spawn = 0.6; g.emit('dropMinion', { x1: e.x, y1: e.y - 40, x2: m.x, y2: m.y }); }
    applyEl(g, e.x, e.y, 90, 'POISON', { life: 5 }); g.emit('sporeBurst', { x: e.x, y: e.y, r: 90 });
  } else if (d.skill === 'mirror') { // phân thân 2 ảo ảnh + chém lướt chéo
    for (let k = 0; k < 2; k++) { const q = a + (k ? 2.1 : -2.1); const m = g.spawnAt('ILLUSION', p.x + Math.cos(q) * 160, p.y + Math.sin(q) * 160); m.life = 7; m.st = 0.2; }
    g.hazards.push({ kind: 'line', x: e.x, y: e.y, a, len: 420 * ELITE.reach, width: 50, t: 0.7, T: 0.7, hold: 0, dmg: 24 * dm, color: '#b07aff', owner: null, after: () => { e.x += Math.cos(a) * 380 * ELITE.reach; e.y += Math.sin(a) * 380 * ELITE.reach; g.world.collide(e, e.r); g.emit('bossBlink', { x: e.x, y: e.y }); } });
  } else if (d.skill === 'rampage') { e.chain = 3; e.state = 'tele'; e.st = 0.45; e.ta = a; } // húc liên tục 3 cú
}
export function enemiesExtra(g, dt) {
  trackPV(g, dt);
  for (const e of g.enemies) {
    const d = ENEMIES[e.type]; if (!d || e.dead) continue;
    if (FOE_AIS.has(d.ai)) { foeAI(g, e, d, dt); continue; }
    if (d.ai === 'assassin' && !e.spawn) assassin(g, e, d, dt);
    if (d.ai === 'clone') { const b = g.boss; if (g.arena) g.clampArena(e, e.r + 10); if (!b || b.dead) e.life = 0; else { let a2 = Math.atan2(g.p.y - e.y, g.p.x - e.x); e.face = a2; if (Math.hypot(g.p.x - e.x, g.p.y - e.y) > 160) { e.x += Math.cos(a2) * d.speed * dt; e.y += Math.sin(a2) * d.speed * dt; } e.swingT = Math.max(0, (e.swingT || 0) - dt); e.atkT = (e.atkT ?? 1.5) - dt; if (e.atkT <= 0) { e.atkT = 2.2 + g.rand() * 0.8; e.swingT = 0.85; if (b.type === 'SOVEREIGN' && b.phase >= 2 && g.rand() < 0.6) { const q = g.p.aim + Math.PI, ox = e.x, oy = e.y; e.x = g.p.x + Math.cos(q) * 120; e.y = g.p.y + Math.sin(q) * 120; if (g.arena) g.clampArena(e, e.r + 10); g.emit('bossBlink', { x: ox, y: oy }); g.emit('bossBlink', { x: e.x, y: e.y }); a2 = Math.atan2(g.p.y - e.y, g.p.x - e.x); e.face = a2; } g.hazards.push({ kind: 'arc', x: e.x, y: e.y, a: a2, r: 225, arc: 3.0, t: 0.8, T: 0.8, hold: 0, dmg: 30, color: e.def ? (e.def.tele || e.def.color) : '#c9a8ff', owner: e }); } } }
    if (d.illusion) { e.life = (e.life ?? 7) - dt; if (e.life <= 0) { e.dead = true; g.emit('kill', { x: e.x, y: e.y, type: e.type }); } }
    if (d.elite && !e.spawn && e.freeze <= 0 && e.stun <= 0) {
      e.skillT = (e.skillT ?? 2.5) - dt;
      if (e.skillT <= 0) { if (dist(e.x, e.y, g.p.x, g.p.y) <= skillRange(d)) { e.skillT = 4.5 + g.rand() * 1.5; eliteSkill(g, e, d); } else e.skillT = 0.5; }
      if (d.skill === 'rampage' && e.state !== 'move') e.flA = null;
      if (d.skill === 'rampage' && e.chain > 0 && e.state === 'stagger' && e.st < 0.55) { e.chain--; e.state = 'tele'; e.st = 0.32; e.ta = Math.atan2(g.p.y - e.y, g.p.x - e.x); }
    }
  }
}

// mỗi bước: mặt đất cập nhật + gây hiệu ứng, vệt để lại, nấm, bẫy bản đồ, lạnh/đóng băng
export function envStep(g, dt) {
  const p = g.p;
  g.surface.update(dt, g.rand, r => react(g, r)); g.world.tickTemp(dt);
  const each = fn => g.forTargets ? g.forTargets(fn) : fn(p);
  const tick0 = g.envT - dt <= 0;
  each(p => {
  // lạnh và đóng băng
  if (p.chillT > 0) { p.chillT -= dt; if (p.chillT <= 0) p.chill = 0; }
  if (p.frozen > 0) p.frozen -= dt; if (p.rooted > 0) p.rooted -= dt; if (p.slowT > 0) p.slowT -= dt;
  if (p.burnT > 0) { p.burnT -= dt; p.burnTick = (p.burnTick || 0) - dt; if (p.burnTick <= 0) { p.burnTick = 0.5; dotPlayer(g, 5, 'burn'); } }
  // người chơi: vừa bước vào vùng gây hại thì mất máu ngay, sau đó theo nhịp
  const sp = g.surface.at(p.x, p.y), fx = SURF_FX[sp];
  const enter = fx && fx.dps && p.lastSurf !== sp; p.lastSurf = sp;
  if (fx && fx.dps && (tick0 || enter) && !p.leap && !(p.z > 0)) dotPlayer(g, fx.dps * 0.35, sp);
  if (sp === 'water') p.wet = 1;
  if (g.theme === 'dungeon' && p.dashT > 0) g.world.near(p.x, p.y, 80, o => { if (!o.dead && o.type === 'tree' && dist(o.x, o.y, p.x, p.y) < o.r + 22) sporeBurst(g, o); });
  });
  g.envT -= dt; let tick = g.envT <= 0; if (tick) g.envT = 0.35;
  // bom: châm ngòi khi bị đánh, nổ sau vài giây (có thể nổ dây chuyền)
  for (const o of g.fused) { if (o.dead) { g.fused.delete(o); continue; } o.fuse -= dt; if (o.fuse <= 0) { g.fused.delete(o); bombBlast(g, o); } }
  // quái
  for (const e of g.enemies) {
    if (e.dead || e.type === 'DUMMY') continue;
    const s = g.surface.at(e.x, e.y), f = SURF_FX_E[s], d = ENEMIES[e.type] || {};
    if (f && f.blind && g.rand() < dt * 1.5) e.blind = Math.max(e.blind || 0, 0.6);
    if (f) { if (f.burn) e.burn = Math.max(e.burn || 0, 1); if (s === 'water') e.wet = Math.max(e.wet || 0, 1); if (f.dps && tick && !e.boss && !(s === 'poison' && (d.onHit === 'poison' || d.immune === 'poison'))) g.hurtEnemy(e, f.dps * 0.6, 0, 0, 'env'); }
    if (e.burn > 0 && g.rand() < dt * 0.6) applyEl(g, e.x, e.y, 22, 'FIRE', { chance: 0.6 });
    if (d.trail && !e.spawn) { e.trailT = (e.trailT || 0) - dt; const moving = d.ai === 'charger' ? e.state === 'charge' : e.state !== 'stagger'; if (moving && e.trailT <= 0) { e.trailT = d.ai === 'charger' ? 0.05 : 0.3; applyEl(g, e.x, e.y, 20, d.trail === 'ice' ? 'ICE' : d.trail === 'poison' ? 'POISON' : 'BURN', { life: d.trail === 'ice' ? 9 : d.trail === 'poison' ? 4 : 3 }); } }
  }
  // vùng lửa/đầm lầy của chiêu tác động lên mặt đất
  for (const z of g.zones) {
    if ((z.kind === 'fire' || z.kind === 'lava') && g.rand() < dt * 3) applyEl(g, z.x + (g.rand() - 0.5) * z.r, z.y + (g.rand() - 0.5) * z.r, 26, 'FIRE', { chance: 0.7 });
    if (z.kind === 'swamp' && g.rand() < dt * 2) applyEl(g, z.x, z.y, z.r * 0.6, 'WATER', { puddle: true });
  }
  // bẫy trần (dinh thự) / mạch phun (núi lửa)
  // danh sách bẫy chỉ tính lại khi người chơi sang ô 256 đơn vị khác (trước đây quét ~1000 ô mỗi bước); bán kính nới thêm 256 để vẫn phủ đủ
  { const Q = 256, qx = Math.round(p.x / Q), qy = Math.round(p.y / Q), key = g.theme + ':' + g.stage + ':' + qx + ',' + qy + (g.forge ? 'f' : '');
    if (g._hzKey !== key) { g._hzKey = key; g.mapHz = mapHazards(g.theme, g.world.seed, qx * Q, qy * Q, 780 + Q).filter(h => !(g.forge && dist(h.x, h.y, g.forge.x, g.forge.y) < 260)); } }   // không có bẫy trong hiên lò rèn
  for (const h of g.mapHz) {
    const ph = (g.t + h.off) % h.period, prev = g.hzPrev.get(h.id);
    g.hzPrev.set(h.id, ph);
    if (prev !== undefined && ph < prev) { // vừa hết chu kỳ: sập/phun
      g.emit(h.kind === 'vent' ? 'ventErupt' : 'trapCrash', { x: h.x, y: h.y, r: h.r });
      each(p => { if (dist(p.x, p.y, h.x, h.y) < h.r + p.r * 0.5 && !(p.z > 0)) g.hurtPlayer(26 * g.dmgScale, Math.atan2(p.y - h.y, p.x - h.x), { boss: true }); });
      for (const e of g.enemies) if (!e.dead && !e.boss && dist(e.x, e.y, h.x, h.y) < h.r + e.r) g.hurtEnemy(e, 70, Math.atan2(e.y - h.y, e.x - h.x), 300, 'trap');
      if (h.kind === 'vent') applyEl(g, h.x, h.y, 44, 'BURN', { life: 2.5 }); else g.world.damageObstacles(h.x, h.y, h.r, 80);
    }
  }
  if (g.hzPrev.size > 400) g.hzPrev.clear();
}
function bombBlast(g, o) {
  const R = 120, p = g.p; g.world.breakObs(o);
  for (const e of g.enemies) if (!e.dead && dist(e.x, e.y, o.x, o.y) < R + e.r) g.hurtEnemy(e, e.boss ? 120 : 75, Math.atan2(e.y - o.y, e.x - o.x), 420, 'blast');
  const hit = q => { if (dist(q.x, q.y, o.x, o.y) < R + q.r) g.hurtPlayer(28 * g.dmgScale, Math.atan2(q.y - o.y, q.x - o.x), { boss: true }); }; if (g.forTargets) g.forTargets(hit); else hit(p);
  applyEl(g, o.x, o.y, 75, 'BURN', { life: 3 }); g.world.damageObstacles(o.x, o.y, R * 0.9, 60);
  g.emit('boom', { x: o.x, y: o.y, r: R, el: 'FIRE', big: true }); g.emit('bombBlast', { x: o.x, y: o.y, r: R }); g.hitstop = Math.max(g.hitstop, 0.06);
}
export function dotPlayer(g, dmg, kind) {
  const p = g.p; if (g.over || g.labGod) return;
  let d = dmg * g.diff.dmg * (1 - p.mods.dr); if (g.infHp) { d = Math.min(d, Math.max(0, p.hp - 1)); p.hurtClock = 0; } p.hp -= d; p.hurtT = Math.max(p.hurtT || 0, 0.14); p.vy -= 40;
  g.emit('hurtDot', { x: p.x, y: p.y, dmg: Math.max(1, Math.round(d)), kind });
  if (p.hp <= 0) { p.hp = 0; if (g.downed) g.downed(p); else { g.over = true; g.emit('dead', {}); } }
}
export function frozenInput(g, it) { const p = g.p; if ((p.frozen > 0 || p.rooted > 0) && it.dash) { if (p.frozen > 0) p.frozen -= 0.35; if (p.rooted > 0) p.rooted -= 0.45; it.dash = false; g.emit('iceCrack', { x: p.x, y: p.y }); } }
export { WARN };

// ---------- nhà thợ rèn: vùng an toàn trong stage thường ----------
// Nhà đặt cách người chơi 420–600px, trên nền trống (không bẫy map, không mặt đất gây thương). Thân nhà là vật cản cứng
// phía sau hiên; vùng an toàn là hiên trước cửa (tâm g.forge.x/y). Thợ rèn đứng cạnh đe, cũng là vật cản.
export function placeForge(g, R = 120, near = false) {
  const p = g.p, base = g.rand() * Math.PI * 2;
  const okAt = (x, y) => {
    if (mapHazards(g.theme, g.world.seed, x, y, R + 80).some(h => dist(h.x, h.y, x, y) < h.r + R + 40)) return false;
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = k ? R : 0, f = g.surfFx(x + Math.cos(a) * rr, y + Math.sin(a) * rr); if (f && f.dps) return false; }
    return true;
  };
  let pos = null;
  for (let k = 0; k < 40 && !pos; k++) { const a = base + k * 2.4, d = near ? 230 + g.rand() * 80 : 420 + g.rand() * 180, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d; if (okAt(x, y)) pos = [x, y]; }
  if (!pos) { const a = base, D = near ? 260 : 480, x = p.x + Math.cos(a) * D, y = p.y + Math.sin(a) * D; pos = [x, y]; }
  const [x, y] = pos;
  g.world.clearArea(x, y - 40, R + 60); g.world.clearArea(x, y + 110, 140); // dọn nhà + sân trước, giữ cây hai bên
  // nhà 64×52 px (neo chân tường ở y-50), quầy hàng 34×16 px ở bên phải hiên (người bán đứng sau quầy)
  const hid = (dx, dy, r) => { const o = g.world.addTemp('forgehouse', x + dx, y + dy, r, Infinity, 1e9); o.solid = true; o.hidden = true; return o; };
  const body = hid(0, -112, 62), wingL = hid(-70, -78, 26), wingR = hid(70, -78, 26), npc = hid(38, -4, 16), npc2 = hid(72, -4, 16);
  // khung tự nhiên phía sau nhà: cụm cây/đá/cột theo map (để nhà không trơ trọi giữa bãi trống)
  const FRAME = { forest: ['treewall', 'treewall', 'ruinpillar', 'tree'], dungeon: ['cavewall', 'cavewall', 'glowshroom', 'crystalcluster'], frost: ['tree', 'tree', 'frostboulder', 'icecrystal'], volcano: ['basaltwall', 'basaltwall', 'obsidian', 'obsidian'], palace: ['colpillar', 'colpillar', 'brazier', 'brazier'] }[g.theme] || ['treewall', 'treewall', 'rock', 'tree'];
  const frame = [[-150, -150, 30], [156, -154, 30], [-190, -80, 20], [196, -90, 20]].map(([dx, dy, r], k) => { const o = g.world.addTemp(FRAME[k], x + dx, y + dy, r, Infinity, 1e9); o.solid = true; o.v = 0.2 + k * 0.2; return o; });
  g.forge = { x, y, theme: g.theme, parts: [body, wingL, wingR, npc, npc2, ...frame], t: 0 };
  g.emit('forgeHere', { x, y, theme: g.theme });
  return g.forge;
}
export function removeForge(g) {
  if (!g.forge) return;
  for (const o of g.forge.parts) o.dead = true;
  g.world.temp = g.world.temp.filter(o => !o.dead);
  g.forge = null; g.inForge = false;
}
