// A0 — cảm giác đánh. Mô phỏng tất định, không DOM.
import { axiomTick, axiomDash, axiomAttack } from './axiom.js';
export const TILE = 48, CHUNK = 12; // chunk = 12x12 ô

export function rng(s) {
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function smoothNoise(x, y, seed, scale) { return smooth(x, y, seed, scale); }
function smooth(x, y, seed, scale) {
  const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const s = t => t * t * (3 - 2 * t), a = hash2(x0, y0, seed), b = hash2(x0 + 1, y0, seed), c = hash2(x0, y0 + 1, seed), d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * s(tx) + (c - a) * s(ty) + (a - b - c + d) * s(tx) * s(ty);
}
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------------- dữ liệu ----------------
export const FOCUS_TIME = 1.2, FOCUS_MIN = 0.4, FOCUS_REGEN = 0.3, FOCUS_DELAY = 0.6;   // Ranger: slow motion có hạn
export const CLASSES = {
  KNIGHT: { name: 'Knight', hp: 140, speed: 183, energy: 100, basicDmg: 1, skillDmg: 1.1, color: '#e6c36a', desc: 'Wide sword sweeps. Hold to charge a huge sweep; full charge releases a shockwave.', dash: { speed: 1000, time: 0.12, cd: 1.15 }, hpRegen: 1.2 },
  RANGER: { name: 'Ranger', hp: 105, speed: 196, energy: 70, basicDmg: 1.1, skillDmg: 1.15, color: '#7fd18b', desc: 'Rapid arrows. Hold to charge: time briefly slows (limited Focus); 75%+ charge pierces one extra enemy.', dash: { speed: 850, time: 0.1, cd: 1.35 }, hpRegen: 0.3 },
  // lab: tướng đang thử, chỉ chọn được trong Test Lab
  AXIOM:  { lab: true, name: 'Axiom (test)', hp: 115, speed: 192, energy: 100, basicDmg: 1, skillDmg: 1.1, color: '#a27ae0', desc: 'Wandering swordsman of cubes and space.', dash: { speed: 980, time: 0.12, cd: 1.05 }, hpRegen: 0.6 },
  MAGE:   { name: 'Mage',   hp: 95,  speed: 170, energy: 150, basicDmg: 0.95, skillDmg: 1.05, color: '#9b8cff', desc: 'Arcane orbs. Hold to grow a huge slow orb that refills your energy on hit.', dash: { speed: 920, time: 0.12, cd: 1.25 }, hpRegen: 0.6 }
};
export const ENEMIES = {
  GRUNT:   { name: 'Brute',   hp: 60,  speed: 102, r: 15, dmg: 13, color: '#c96b4a', mass: 1.0, gold: 1 },
  CHARGER: { name: 'Charger', hp: 95,  speed: 78,  r: 18, dmg: 26, color: '#d9a04a', mass: 1.6, gold: 2 },
  SHOOTER: { name: 'Caster',  hp: 45,  speed: 85,  r: 14, dmg: 13,  color: '#8a6ad1', mass: 0.8, gold: 2 },
  DUMMY:   { name: 'Dummy',   hp: 600, speed: 0,   r: 16, dmg: 0,  color: '#b8946a', mass: 99,  gold: 0 }
};
export { dist, angDiff };

// ---------------- thế giới mở theo chunk ----------------
const OBS_HP = { tree: 70, rock: 160, pillar: 220, crate: 35, lamp: 50, crystal: 120, landmark: 260 };
export class World {
  constructor(seed) { this.seed = seed; this.chunks = new Map(); this.broken = new Set(); this.onBreak = null; this.temp = []; this.tempId = 0; }
  // vật cản có thời hạn: chặn quái và đạn như vật cản thường
  addTemp(type, x, y, r, life, hp = 80) { const o = { type, x, y, r, life, T: life, hp, max: hp, hit: 0, v: 0.5, temp: true, key: 'temp' + (this.tempId++) }; this.temp.push(o); return o; }
  // xoá lặng lẽ vật cản trong vùng (không rơi đồ): trả về danh sách để vẽ bụi
  clearArea(x, y, r) {
    const gone = [];
    this.near(x, y, r, o => { if (o.solid || dist(x, y, o.x, o.y) > r) return; gone.push({ x: o.x, y: o.y, r: o.r, type: o.type }); if (o.temp) o.dead = true; else { this.broken.add(o.key); const c = this.chunks.get(o.key.split(':')[0]); if (c) c.obs = c.obs.filter(q => q !== o); } });
    this.temp = this.temp.filter(o => !o.dead); return gone;
  }
  tickTemp(dt) { for (const o of this.temp) { o.age = (o.age || 0) + dt; if (o.sink > 0) { o.sink -= dt; if (o.sink <= 0) o.dead = true; continue; } o.life -= dt; if (o.life <= 0 && !o.dead) { o.dead = true; o.crumble = true; if (this.onBreak) this.onBreak(o); } } this.temp = this.temp.filter(o => !o.dead); }
  damageObstacles(x, y, r, dmg) {
    if (!(dmg > 0)) return [];
    const out = [];
    this.near(x, y, r + 60, o => { if (o.solid) return; if (dist(x, y, o.x, o.y) < r + o.r) { o.hp -= dmg; o.hit = 0.15; if (this.onHitObs) this.onHitObs(o); if (o.hp <= 0 && !out.includes(o)) out.push(o); } });
    for (const o of out) this.breakObs(o);
    return out;
  }
  breakObs(o) {
    if (o.dead || o.solid) return; o.dead = true;
    if (o.temp) { this.temp = this.temp.filter(q => q !== o); if (this.onBreak) this.onBreak(o); return; }
    this.broken.add(o.key);
    const c = this.chunks.get(o.key.split(':')[0]); if (c) c.obs = c.obs.filter(q => q !== o);
    if (this.onBreak) this.onBreak(o);
  }
  biome(x, y) {
    const n = smooth(x, y, this.seed + 11, 1400);
    return n < 0.33 ? 'meadow' : n < 0.66 ? 'forest' : 'ruins';
  }
  chunk(cx, cy) {
    const k = cx + ',' + cy; let c = this.chunks.get(k);
    if (c) return c;
    const r = rng((Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663) ^ this.seed) >>> 0);
    const obs = [], deco = [];
    const x0 = cx * CHUNK * TILE, y0 = cy * CHUNK * TILE, W = CHUNK * TILE;
    const bio = this.biome(x0 + W / 2, y0 + W / 2);
    const nTree = bio === 'forest' ? 9 : bio === 'meadow' ? 3 : 2, nRock = bio === 'ruins' ? 3 : 2, nPillar = bio === 'ruins' ? 3 : 0;
    const safe = (x, y) => dist(x, y, 0, 0) > 260; // vùng xuất phát trống
    const place = (type, r0, n) => {
      for (let i = 0; i < n; i++) for (let t = 0; t < 8; t++) {
        const x = x0 + 30 + r() * (W - 60), y = y0 + 30 + r() * (W - 60), rr = r0 * (0.8 + r() * 0.5);
        if (!safe(x, y) || obs.some(o => dist(x, y, o.x, o.y) < o.r + rr + 70)) continue;
        obs.push({ type, x, y, r: rr, v: r(), key: k + ':' + obs.length, hp: OBS_HP[type], max: OBS_HP[type], hit: 0 }); break;
      }
    };
    place('tree', 22, nTree); place('rock', 20, nRock); place('pillar', 18, nPillar);
    place('landmark', 18, r() < 0.7 ? 1 : 2); // điểm nhấn riêng từng map (khúc gỗ, pha lê, đá băng, obsidian, chậu lửa…)
    place('crate', 13, bio === 'ruins' ? 3 : 2); if (r() < 0.75) place('lamp', 8, 1);
    if (r() < 0.2) place('crystal', 15, 1); // tinh thể hợp nhất: hiếm
    for (let i = 0; i < 26; i++) deco.push({ x: x0 + r() * W, y: y0 + r() * W, t: Math.floor(r() * 4), v: r() });
    c = { cx, cy, obs: obs.filter(o => !this.broken.has(o.key)), deco, bio };
    this.chunks.set(k, c);
    if (this.chunks.size > 220) { for (const key of this.chunks.keys()) { this.chunks.delete(key); if (this.chunks.size < 180) break; } }
    return c;
  }
  near(x, y, rad, fn) {
    const S = CHUNK * TILE, c0x = Math.floor((x - rad) / S), c1x = Math.floor((x + rad) / S), c0y = Math.floor((y - rad) / S), c1y = Math.floor((y + rad) / S);
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) for (const o of this.chunk(cx, cy).obs) fn(o);
    for (const o of this.temp) if (Math.abs(o.x - x) < rad + o.r && Math.abs(o.y - y) < rad + o.r) fn(o);
  }
  collide(e, r) {
    this.near(e.x, e.y, r + 60, o => {
      const d = dist(e.x, e.y, o.x, o.y), m = o.r + r;
      if (d < m && d > 0.001) { e.x = o.x + (e.x - o.x) / d * m; e.y = o.y + (e.y - o.y) / d * m; }
    });
  }
  blocked(x, y, r) { let hit = false; this.near(x, y, r + 60, o => { if (!hit && dist(x, y, o.x, o.y) < o.r + r) hit = true; }); return hit; }
}

// ---------------- mô phỏng ----------------
// các cặp quái có thể chạm nhau (i < j), giữ đúng thứ tự i tăng rồi j tăng như vòng lặp đôi cũ → kết quả mô phỏng không đổi.
// Ô lưới rộng hơn khoảng đẩy lớn nhất (2r + 30) cộng biên 24 cho phần dịch chuyển trong lúc đẩy, nên không sót cặp nào.
const PAIRS = [];
function nearPairs(list) {
  const n = list.length; PAIRS.length = 0;
  if (n < 24) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) PAIRS.push(i, j); return PAIRS; }
  let rmax = 0; for (const e of list) { const r = (ENEMIES[e.type] || {}).r || 16; if (r > rmax) rmax = r; }
  const C = rmax * 2 + 30 + 24, G = new Map(), cx = new Int32Array(n), cy = new Int32Array(n);
  for (let i = 0; i < n; i++) { const e = list[i], x = Math.floor(e.x / C), y = Math.floor(e.y / C), k = x * 100003 + y; cx[i] = x; cy[i] = y; let b = G.get(k); if (!b) G.set(k, b = []); b.push(i); }
  const js = [];
  for (let i = 0; i < n; i++) {
    js.length = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const b = G.get((cx[i] + dx) * 100003 + cy[i] + dy); if (b) for (const j of b) if (j > i) js.push(j); }
    if (js.length > 1) js.sort((a, b) => a - b);
    for (const j of js) PAIRS.push(i, j);
  }
  return PAIRS;
}
export class Sim {
  constructor(seed = 1, cls = 'KNIGHT') {
    this.seed = seed; this.rand = rng(seed); this.world = new World(seed);
    this.world.onBreak = o => this.emit('obstacleBreak', { x: o.x, y: o.y, r: o.r, type: o.type, v: o.v, charred: !!o.charred, crumble: !!o.crumble });
    this.t = 0; this.over = false; this.hitstop = 0; this.events = [];
    const c = CLASSES[cls];
    this.p = { cls, x: 0, y: 0, vx: 0, vy: 0, r: 12, hp: c.hp, max: c.hp, aim: 0, face: 1,
      atkT: 0, combo: 0, comboT: 0, swing: 0, swingDir: 1, charge: 0, dashT: 0, dashCd: 0, dashX: 0, dashY: 0, inv: 0, hurtT: 0, focus: 1, focusOn: false, focusRegenT: 0 };
    this.enemies = []; this.shots = []; this.foes = []; this.gold = 0; this.kills = 0; this.nextId = 1;
    this.spawnT = 2; this.wave = 0; this.intensity = 0;
  }
  emit(ev, d) { this.events.push({ ...d, ev }); }

  step(dt, it = {}) {
    if (this.over) return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.t += dt;
    this.updatePlayer(dt, it);
    this.updateShots(dt);
    this.updateEnemies(dt);
    this.updateFoeShots(dt);
    this.director(dt);
  }

  // ---------- người chơi ----------
  updatePlayer(dt, it) {
    const p = this.p, C = CLASSES[p.cls];
    p.atkT = Math.max(0, p.atkT - dt); p.comboT = Math.max(0, p.comboT - dt); if (p.comboT <= 0) p.combo = 0;
    p.swing = Math.max(0, p.swing - dt); p.inv = Math.max(0, p.inv - dt); p.dashCd = Math.max(0, p.dashCd - dt); p.hurtT = Math.max(0, p.hurtT - dt);
    if (it.ax !== undefined) { p.aim = Math.atan2(it.ay - p.y, it.ax - p.x); p.face = Math.cos(p.aim) < 0 ? -1 : 1; }
    const frozen = p.frozen > 0, rooted = p.rooted > 0, sf = this.surfFx ? this.surfFx(p.x, p.y) : null;
    let mx = frozen || rooted ? 0 : it.mx || 0, my = frozen || rooted ? 0 : it.my || 0; const ml = Math.hypot(mx, my); if (ml > 0) { mx /= ml; my /= ml; }
    if (it.dash && !frozen && !rooted && p.dashCd <= 0 && p.dashT <= 0) {
      p.dashT = C.dash.time; p.dashCd = C.dash.cd * (p.dashCdMul || 1); p.inv = C.dash.time + 0.08;
      if (ml > 0) { p.dashX = mx; p.dashY = my; } else { p.dashX = Math.cos(p.aim); p.dashY = Math.sin(p.aim); }
      this.emit('dash', { x: p.x, y: p.y });
      if (p.cls === 'AXIOM') axiomDash(this);
    }
    const slow = p.charge > 0.12 ? (p.cls === 'KNIGHT' && p.mods && p.mods.relentless ? 1 : 0.5) : (p.swing > 0 ? 0.6 : 1);   // Relentless Blade: tụ lực không bị chậm
    if (p.dashT > 0) { p.dashT -= dt; p.vx = p.dashX * C.dash.speed; p.vy = p.dashY * C.dash.speed; }
    else { const k = 1 - Math.exp(-16 * (sf ? sf.grip : 1) * dt); const spd = C.speed * (p.speedMul || 1) * (sf ? sf.spd : 1) * (p.slowT > 0 ? 0.5 : 1) * (p.hasteT > 0 ? 1.5 : 1) * (p.resSpd || 1) * (p.bladeOut ? 0.9 : 1); p.vx += (mx * spd * slow - p.vx) * k; p.vy += (my * spd * slow - p.vy) * k; }
    p.x += p.vx * dt; p.y += p.vy * dt; this.world.collide(p, p.r);

    // tấn công: giữ chuột trái để tụ lực, nhả để đánh; bấm nhanh = đòn thường. Luôn đánh về phía con trỏ.
    const CH = { KNIGHT: 0.8, RANGER: 1.0, MAGE: 1.2, AXIOM: 0.9 }[p.cls] / (p.chargeSpd || 1);
    if (p.cls === 'AXIOM') axiomTick(this, dt, it);
    if (p.echo) { p.echo.t -= dt; if (p.echo.t <= 0) { const E = p.echo; p.echo = null; for (const e of this.enemies) { const d = dist(p.x, p.y, e.x, e.y); if (!e.dead && d < E.reach + e.r && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), E.a)) < E.arc / 2 + e.r / Math.max(d, 1)) this.hurtEnemy(e, E.dmg, E.a, 200, 'slash'); } this.emit('swing', { x: p.x, y: p.y, a: E.a, big: true, combo: 3, hits: 1, reach: E.reach, arc: E.arc, charge: 0 }); } }
    p.slowmo = false;
    if (frozen) { p.charge = 0; return; }
    // Ranger: slow motion khi tụ lực tốn thanh Focus (1.2s); chỉ bắt đầu khi còn ≥ 40%, hồi 0.3/s sau 0.6s không tụ lực
    if (p.cls === 'RANGER') {
      if (p.focus === undefined) p.focus = 1;
      const drawing = it.fireHeld && p.atkT <= 0;
      if (drawing && p.charge === 0) p.focusOn = p.focus >= FOCUS_MIN;
      if (!it.fireHeld) p.focusOn = false;
    }
    if (it.fireHeld && p.atkT <= 0) { p.charge = Math.min(1, p.charge + dt / CH);
      if (p.cls === 'KNIGHT') { if (p.chargePre && p.charge > 0.12) { p.charge = Math.max(p.charge, p.chargePre); p.chargePre = 0; }   // Battle Rhythm: nhát trúng trước đó nạp sẵn lực
        if (p.mods && p.mods.relentless && p.charge >= 1) { this.basicAttack(1); p.charge = 0.5; } } /* Relentless Blade: giữ chuột → chém đầy liên tục */ if (p.cls === 'RANGER' && p.charge > 0.12 && p.focusOn && p.focus > 0) { p.slowmo = true; p.focus = Math.max(0, p.focus - dt / FOCUS_TIME); p.focusRegenT = FOCUS_DELAY; if (p.focus <= 0) p.focusOn = false; } }
    if (p.cls === 'RANGER' && !p.slowmo) { if (p.focusRegenT > 0) p.focusRegenT -= dt; else if (!(it.fireHeld && p.charge > 0.12)) p.focus = Math.min(1, p.focus + FOCUS_REGEN * dt); }
    if (p.charge > 0 && !it.fireHeld) { const c = p.charge; p.charge = 0; this.basicAttack(c < 0.12 ? 0 : c); }
    else if (it.fire && !it.fireHeld && p.atkT <= 0) this.basicAttack(0);
  }
  // Mirror Guard: bật đạn bị chém ngược về phía kẻ bắn (150% sát thương)
  // nhát chém của Knight đỡ đạn quái bay tới phía trước; Mirror Guard (relic) / Reflecting Edge (nâng cấp) bật đạn ngược về kẻ bắn.
  // Reflecting Edge mở rộng góc + tầm đỡ (cấp 2 rộng hơn nữa) để đỡ đòn định hướng dễ hơn.
  parryShot(s) {
    const p = this.p; if (p.cls !== 'KNIGHT' || !(p.swing > 0)) return false;
    // vùng đỡ = vệt chém đang hiện (tầm + góc của nhát chém), Reflecting Edge nới thêm
    const dl = (p.mods && p.mods.deflect) || 0, S = p.slashRef || { reach: 70, arc: 1.8, a: p.aim }, R = Math.max(70, S.reach + 14) + dl * 18, A = Math.max(0.9, S.arc / 2 + 0.15) + dl * 0.25;
    if (dist(s.x, s.y, p.x, p.y) > R + (s.r || 6) || Math.abs(angDiff(Math.atan2(s.y - p.y, s.x - p.x), S.a)) > A) return false;
    s.life = 0; this.emit('parry', { x: s.x, y: s.y });
    const m = p.mods || {}, mul = Math.max(m.riposte ? 1.5 : 0, dl >= 2 ? 1.6 : dl ? 1.0 : 0); if (mul > 0) this.reflectShot(s, mul);
    return true;
  }
  reflectShot(s, mul = 1.5) {
    const p = this.p;
          let a = Math.atan2(-s.vy, -s.vx), bd = 1e9; for (const e of this.enemies) { if (e.dead) continue; const ea = Math.atan2(e.y - s.y, e.x - s.x), d = dist(s.x, s.y, e.x, e.y); if (Math.abs(angDiff(ea, Math.atan2(-s.vy, -s.vx))) < 0.6 && d < bd) { bd = d; a = ea; } }
          this.shots.push({ kind: 'wave', dmg: (s.dmg || 10) * mul * (p.basicMul || 1), speed: 760, life: 0.9, r: 12, pierce: 0, kb: 200, aoeDmg: 0, x: s.x, y: s.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, a, hit: new Set() }); this.emit('riposte', { x: s.x, y: s.y });
  }
  damageObs(x, y, r, dmg) { return this.world.damageObstacles(x, y, r, dmg); }
  basicAttack(c) {
    const p = this.p, bm = p.basicMul || 1, as = p.atkSpeed || 1, M = p.mods || {}, sz = M.atkSize || 1;
    if (p.cls === 'AXIOM') return axiomAttack(this, c);
    if (p.cls === 'KNIGHT') {
      let reach, arc, dmg, kb, big = false;
      if (c === 0) {
        p.combo = (p.combo % 3) + 1; p.comboT = 0.75; big = p.combo === 3;
        reach = big ? 122 : 104; arc = big ? 1.8 : 1.4; dmg = (big ? 21 : 12) * bm; kb = big ? 520 : 240;
        p.atkT = (big ? 0.58 : 0.36) / as; p.swing = 0.16; p.swingDir = -p.swingDir || 1;
        p.vx += Math.cos(p.aim) * (big ? 240 : 140); p.vy += Math.sin(p.aim) * (big ? 240 : 140);
      } else {
        reach = 110 + 100 * c; arc = 1.6 + 1.6 * c; dmg = (12 + 44 * c) * bm; kb = 300 + 400 * c; big = true;
        p.atkT = 0.42 / as; p.swing = 0.22; p.swingDir = -p.swingDir || 1;
        p.vx += Math.cos(p.aim) * 300 * c; p.vy += Math.sin(p.aim) * 300 * c;
      }
      reach *= sz; arc *= Math.min(1.25, 0.9 + sz * 0.1);
      if (c === 0 && M.relentless) dmg *= 0.75;
      if (c >= 0.35 && M.gapCloser) {   // Gap Closer: nhát tụ lao tới địch gần hướng nhắm rồi mới chém
        const L = 60 + 120 * c; let best = null, bd = 1e9;
        for (const e of this.enemies) { if (e.dead) continue; const d = dist(p.x, p.y, e.x, e.y); if (d < reach + L && d < bd && Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), p.aim)) < 0.7) { bd = d; best = e; } }
        if (best && bd > reach * 0.55) { const a = Math.atan2(best.y - p.y, best.x - p.x), mv = Math.min(L, bd - reach * 0.55), x0 = p.x, y0 = p.y; p.x += Math.cos(a) * mv; p.y += Math.sin(a) * mv; this.world.collide(p, p.r); p.aim = a; this.emit('lunge', { x0, y0, x: p.x, y: p.y, a }); }
      }
      if (c === 0 && big && M.cleaveEcho) p.echo = { t: 0.18, reach, arc, dmg: dmg * 0.6, a: p.aim };
      if (c >= 0.35 && M.swordWave) { const n = c >= 0.95 || M.swordWave > 1 ? 3 : 1; for (let k = 0; k < n; k++) this.shoot({ kind: 'wave', dmg: (10 + 22 * c) * (M.swordWave > 1 ? 1.3 : 1), speed: 720, life: 0.55, r: 16 * sz, pierce: 99, kb: 220, off: (k - (n - 1) / 2) * 0.32, noRecoil: true }); }
      if (c >= 0.95 && M.quakeWave) this.shoot({ kind: 'wave', dmg: dmg * 0.6, speed: 700, life: 360 / 700, r: 26 * sz, pierce: 99, kb: 260, noRecoil: true });   // Shockwave Mastery
      let hits = 0; const hit = new Set();
      for (const e of this.enemies) {
        const d = dist(p.x, p.y, e.x, e.y); if (d > reach + e.r) continue;
        if (Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), p.aim)) > arc / 2 + e.r / Math.max(d, 1)) continue;
        this.hurtEnemy(e, dmg, p.aim, kb, 'slash'); hits++; hit.add(e);
      }
      this.damageObs(p.x + Math.cos(p.aim) * reach * 0.6, p.y + Math.sin(p.aim) * reach * 0.6, reach * 0.5, dmg);
      if (c >= 0.7) { // tụ đủ: sóng đẩy lùi quanh người
        const R = reach + 150;
        for (const e of this.enemies) if (!hit.has(e) && !e.dead && dist(p.x, p.y, e.x, e.y) < R + e.r) this.hurtEnemy(e, 10 * bm, Math.atan2(e.y - p.y, e.x - p.x), 560, 'wave');
        this.emit('knightWave', { x: p.x, y: p.y, r: R });
      }
      if (hits && c >= 0.7) this.hitstop = Math.max(this.hitstop || 0, 0.07); else if (hits && big) this.hitstop = Math.max(this.hitstop || 0, 0.035);
      if (hits && this.gainEnergy) this.gainEnergy(c > 0 ? 0.75 + 2.25 * c : big ? 0.75 : 0.4);
      if (hits && c === 0 && M.rhythm) p.chargePre = M.rhythm;
      if (hits && this.t - (p.swingHealT ?? -9) >= 0.5) { p.swingHealT = this.t; if (this.heal) this.heal(1); else p.hp = Math.min(p.max, p.hp + 1); }   // Knight: đòn thường trúng hồi 1 máu (tối đa 2/s) // năng lượng theo nhát chém, không nhân theo số quái
      p.slashRef = { reach, arc, a: p.aim };   // vùng đỡ đạn = đúng vệt chém nhìn thấy
      this.emit('swing', { x: p.x, y: p.y, a: p.aim, big, combo: p.combo, hits, reach, arc, charge: c, dir: p.swingDir });
      if (hits) this.hitstop = Math.max(this.hitstop, big ? 0.075 : 0.04);
    } else if (p.cls === 'RANGER') {
      const extra = M.atkExtra || 0, ric = M.ricochet || 0;
      if (c === 0) { for (let k = 0; k <= extra; k++) this.shoot({ kind: 'arrow', dmg: 15, speed: 920, life: 0.42, r: 5 * sz, pierce: 0, kb: 130, spread: 0.04, energy: k ? 0 : 0.3, off: (k - extra / 2) * 0.14, ricochet: ric, noRecoil: k > 0 }); p.atkT = 0.3 / as; }
      else { const pierce = c >= 0.75, silver = c >= 0.97; for (let k = 0; k <= extra; k++) this.shoot({ kind: silver ? 'silver' : pierce ? 'pierce' : 'arrow', dmg: (9 + 55 * c) * (silver ? 1.15 : 1) * (k ? 0.4 : 1), speed: 860 + 380 * c, life: 0.6, r: (5 + 3 * c) * sz, pierce: pierce ? 1 : 0, falloff: pierce ? 0.25 : 0, kb: 130 + 300 * c, charge: c, energy: k ? 0 : 0.5 + 2.5 * c, off: (k - extra / 2) * 0.12, ricochet: pierce ? 0 : ric, noRecoil: k > 0 });
        if (silver && M.volleyCharge) for (const o of [-0.16, 0.16]) this.shoot({ kind: 'silver', dmg: 30 * (1 + c), speed: 1300, life: 0.7, r: 7 * sz, pierce: 1, falloff: 0.25, kb: 200, off: o, noRecoil: true });
        p.atkT = 0.32 / as; }
    } else {
      const sp = 580 - 300 * c, r = 8 + 14 * c;
      const full = c >= 0.95, arcLv = M.chainExtra || 0, chained = c >= (arcLv ? 0.7 : 0.95), n = (M.atkExtra || 0);
      for (let k = 0; k <= n; k++) this.shoot({ kind: 'orb', dmg: ((c > 0 ? 11 : 16) + 40 * c) * (k ? 0.7 : 1), speed: sp, life: (420 + 120 * c) / sp, r: (full ? r + 4 : r) * sz, pierce: 0, kb: 200 + 200 * c, aoe: (70 + 80 * c) * (full ? 1.45 : 1) * sz, aoeDmg: (10 + 38 * c) * (k ? 0.7 : 1), charge: c, energy: k ? 0 : c >= 0.6 ? 2 + 6 * c : 0.4, chain: chained ? 4 + arcLv * 2 : 0, full, burst: M.orbBurst ? 4 : 0, off: (k - n / 2) * 0.26, noRecoil: k > 0 });
      p.atkT = (c > 0 ? 0.45 : 0.48) / as;
    }
  }
  shoot(o) {
    const p = this.p, a = p.aim + (o.off || 0) + (o.spread ? (this.rand() - 0.5) * o.spread * 2 : 0); o = { ...o, dmg: o.dmg * (p.basicMul || 1), aoeDmg: (o.aoeDmg || 0) * (p.basicMul || 1) };
    this.shots.push({ ...o, x: p.x + Math.cos(a) * 18, y: p.y + Math.sin(a) * 18, vx: Math.cos(a) * o.speed, vy: Math.sin(a) * o.speed, a, hit: new Set() });
    this.emit('shoot', { x: p.x, y: p.y, a, kind: o.kind });
    const rec = o.noRecoil ? 0 : o.kind === 'silver' ? 300 : o.kind === 'pierce' ? 220 : 40; p.vx -= Math.cos(a) * rec; p.vy -= Math.sin(a) * rec;
  }
  updateShots(dt) {
    for (const s of this.shots) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (this.world.blocked(s.x, s.y, s.r)) { this.damageObs(s.x, s.y, s.r + 4, s.dmg); this.explode(s); s.life = 0; this.emit('wallHit', { x: s.x, y: s.y, kind: s.kind }); continue; }
      for (const e of this.enemies) {
        if (e.dead || s.hit.has(e) || dist(s.x, s.y, e.x, e.y) > e.r + s.r) continue;
        s.hit.add(e); this.hurtEnemy(e, s.dmg, s.a, s.kb, s.kind); if (s.falloff) s.dmg *= s.falloff; if (s.energy && !s.gave) { s.gave = true; if (this.gainEnergy) this.gainEnergy(s.energy); }
        if (s.kind === 'pierce' || s.kind === 'silver') this.hitstop = Math.max(this.hitstop, s.kind === 'silver' ? 0.05 : 0.03);
        if (s.ricochet > 0) { let best = null, bd = 240; for (const q of this.enemies) { if (q.dead || s.hit.has(q)) continue; const d2 = dist(s.x, s.y, q.x, q.y); if (d2 < bd) { bd = d2; best = q; } } if (best) { s.ricochet--; const a2 = Math.atan2(best.y - s.y, best.x - s.x), sp2 = Math.hypot(s.vx, s.vy); s.vx = Math.cos(a2) * sp2; s.vy = Math.sin(a2) * sp2; s.a = a2; s.life = Math.max(s.life, 0.35); this.emit('ricochet', { x: s.x, y: s.y }); break; } }
        if (s.pierce-- <= 0) { this.explode(s); s.life = 0; break; }
      }
      if (s.life <= 0 && s.kind === 'orb' && !s.boomed) this.explode(s);
    }
    this.shots = this.shots.filter(s => s.life > 0);
  }
  explode(s) {
    if (!s.aoe || s.boomed) return; s.boomed = true;
    for (const e of this.enemies) { const d = dist(s.x, s.y, e.x, e.y); if (!e.dead && !s.hit.has(e) && d < s.aoe + e.r) { this.hurtEnemy(e, s.aoeDmg, Math.atan2(e.y - s.y, e.x - s.x), 260, 'blast'); if (s.energy && !s.gave) { s.gave = true; if (this.gainEnergy) this.gainEnergy(s.energy); } } }
    this.damageObs(s.x, s.y, s.aoe * 0.6, s.aoeDmg);
    this.emit('boom', { x: s.x, y: s.y, r: s.aoe, full: s.full }); this.hitstop = Math.max(this.hitstop, 0.035);
    if (s.burst) for (let k = 0; k < s.burst; k++) { const a2 = k / s.burst * Math.PI * 2 + 0.4; this.shots.push({ kind: 'spark', dmg: 9 * (this.p.basicMul || 1), x: s.x, y: s.y, vx: Math.cos(a2) * 520, vy: Math.sin(a2) * 520, a: a2, life: 0.35, r: 5, pierce: 1, kb: 100, hit: new Set(s.hit) }); }
    if (s.chain) { // sét lan: nhảy từ chỗ nổ sang quái gần nhất, rồi từ quái đó sang quái kế tiếp
      let px = s.x, py = s.y; const done = new Set();
      for (let k = 0; k < s.chain; k++) {
        let best = null, bd = 190; for (const e of this.enemies) { if (e.dead || done.has(e)) continue; const d = dist(px, py, e.x, e.y); if (d < bd) { bd = d; best = e; } }
        if (!best) break; done.add(best);
        this.emit('chain', { x1: px, y1: py, x2: best.x, y2: best.y });
        this.hurtEnemy(best, 14 * (this.p.basicMul || 1), Math.atan2(best.y - py, best.x - px), 120, 'chain'); best.slow = Math.max(best.slow || 0, 0.8); best.slowAmt = Math.max(best.slowAmt || 0, 0.4);
        px = best.x; py = best.y;
      }
    }
  }
  hurtEnemy(e, dmg, a, kb, kind) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 0.1; const m = ENEMIES[e.type].mass;
    e.kx += Math.cos(a) * kb / m; e.ky += Math.sin(a) * kb / m;
    if (e.state === 'tele' && kb > 300) { e.state = 'stagger'; e.st = 0.5; }
    this.emit('hit', { x: e.x, y: e.y, dmg: Math.round(dmg), kind, a });
    if (e.hp <= 0) {
      e.dead = true; this.kills++; this.gold += ENEMIES[e.type].gold;
      this.emit('kill', { x: e.x, y: e.y, type: e.type, a });
      if (this.onKill) this.onKill(e);
    }
  }

  // ---------- kẻ địch ----------
  spawnEnemy(type, ang, rad) {
    const p = this.p;
    for (let i = 0; i < 6; i++) {
      const a = ang + (this.rand() - 0.5) * 0.6, x = p.x + Math.cos(a) * rad, y = p.y + Math.sin(a) * rad;
      if (this.world.blocked(x, y, 24)) continue;
      const d = ENEMIES[type], s = 1 + this.intensity * 0.04;
      this.enemies.push({ id: this.nextId++, type, x, y, r: d.r, hp: d.hp * s, max: d.hp * s, kx: 0, ky: 0, flash: 0, state: 'move', st: 0.6 + this.rand() * 0.8, atkCd: 0, dead: false, ta: 0, spawn: 0.4 });
      return true;
    }
    return false;
  }
  // cổng tấn công: hai đòn không bao giờ khởi động cách nhau dưới 0.22s; quái bị hoãn thêm 0.15–0.45s
  gate(e) { if (this.t - (this.atkGate ?? -9) < 0.22) { e.st = 0.15 + this.rand() * 0.3; return false; } this.atkGate = this.t; return true; }
  updateEnemies(dt) {
    const p = this.p;
    for (const e of this.enemies) {
      const d = ENEMIES[e.type];
      e.flash = Math.max(0, e.flash - dt); e.atkCd = Math.max(0, e.atkCd - dt * (this.aggro || 1)); e.spawn = Math.max(0, e.spawn - dt);
      e.x += e.kx * dt; e.y += e.ky * dt; const kd = Math.exp(-9 * dt); e.kx *= kd; e.ky *= kd;
      const dp = dist(e.x, e.y, p.x, p.y), toP = Math.atan2(p.y - e.y, p.x - e.x);
      e.st -= dt * (this.aggro || 1);   // Brutal: hồi chiêu, báo đòn, nghỉ sau húc đều nhanh hơn
      if (e.spawn > 0) { this.world.collide(e, d.r); continue; }
      const ef = this.surfFxE ? this.surfFxE(e.x, e.y) : this.surfFx ? this.surfFx(e.x, e.y) : null, sm = ef ? ef.spd : 1;
      const step = (sp) => { e.x += Math.cos(e.ma ?? toP) * sp * sm * dt; e.y += Math.sin(e.ma ?? toP) * sp * sm * dt; };
      if (d.ai === 'melee') {
        const fl = e.flank || 0; // ở xa: đi tới điểm lệch quanh người chơi (vòng hai bên), gần thì lao thẳng
        e.ma = dp > 120 && fl ? Math.atan2(p.y - Math.sin(toP + fl) * 90 - e.y, p.x - Math.cos(toP + fl) * 90 - e.x) : toP + Math.sin(this.t * 2 + e.id) * 0.3;
        if (dp > d.r + p.r + 4) step(d.speed);
        if (dp < d.r + p.r + 8 && e.atkCd <= 0) { e.atkCd = 0.9; this.hurtPlayer(d.dmg, toP); if (d.onHit && this.enemyHit) this.enemyHit(e, d); }
      } else if (d.ai === 'charger') {
        if (e.state === 'move') { e.ma = toP; if (dp > 140) step(d.speed); if (dp < 330 && e.st <= 0 && this.gate(e)) { e.state = 'tele'; e.st = 0.62; e.ta = toP; this.emit('tele', { x: e.x, y: e.y, a: e.ta }); } }
        else if (e.state === 'tele') { e.ta += angDiff(toP, e.ta) * Math.min(1, dt * 1.2); if (e.st <= 0) { e.state = 'charge'; e.st = 0.42; e.hitP = false; } }
        else if (e.state === 'charge') {
          e.x += Math.cos(e.ta) * (d.dash || 560) * dt; e.y += Math.sin(e.ta) * (d.dash || 560) * dt;
          if (!e.hitP && dp < d.r + p.r + 4) { e.hitP = true; this.hurtPlayer(d.dmg, e.ta); }
          if (this.world.blocked(e.x, e.y, d.r)) { e.state = 'stagger'; e.st = 1.1; this.emit('thud', { x: e.x, y: e.y }); }
          else if (e.st <= 0) { e.state = 'stagger'; e.st = 0.7; }
        } else if (e.state === 'stagger') { if (e.st <= 0) { e.state = 'move'; e.st = 1.2 + this.rand(); } }
      } else if (d.ai === 'shooter') {
        const want = 290;
        e.ma = dp > want + 40 ? toP : dp < want - 40 ? toP + Math.PI : toP + Math.PI / 2 * (e.id % 2 ? 1 : -1);
        if (e.state === 'move') { step(d.speed * (dp < want - 40 ? 1.1 : 0.7)); if (dp < 520 && e.st <= 0 && this.gate(e)) { e.state = 'tele'; e.st = 0.55; e.ta = toP; }
          if (e.follow > 0) { e.follow -= dt; if (e.follow <= 0) { const v = this.pv || { x: 0, y: 0 }, a = Math.atan2(p.y + v.y * 0.6 - e.y, p.x + v.x * 0.6 - e.x); this.foes.push({ x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 2.4, dmg: d.dmg, r: 7, kind: d.shot, c: d.color }); this.emit('cast', { x: e.x, y: e.y }); } } }
        else if (e.state === 'tele') { e.ta = toP; if (e.st <= 0) { if (!(this.enemyCast && this.enemyCast(e, d))) { for (const off of [-0.18, 0, 0.18]) this.foes.push({ x: e.x, y: e.y, vx: Math.cos(e.ta + off) * 260, vy: Math.sin(e.ta + off) * 260, life: 2.6, dmg: d.dmg, r: 7, kind: d.shot, c: d.color }); this.emit('cast', { x: e.x, y: e.y }); if (d.followup) e.follow = 0.45; } e.state = 'move'; e.st = 1.8 + this.rand() * 0.8; } }
        else if (e.state === 'stagger') { if (e.st <= 0) { e.state = 'move'; e.st = 1; } }
      }
      this.world.collide(e, d.r);
    }
    // đẩy tách nhau: mềm (dàn đội hình) rồi cứng (không chồng lên nhau)
    const list = this.enemies, pairs = nearPairs(list);
    for (let q = 0; q < pairs.length; q += 2) {
      const a = list[pairs[q]], b = list[pairs[q + 1]], A = ENEMIES[a.type], B = ENEMIES[b.type], R = A.r + B.r + 30, dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 1e-4 || a.spawn > 0 || b.spawn > 0) continue;
      const d = Math.sqrt(d2), k = (R - d) / R * 140 * dt, ma = A.mass || 1, mb = B.mass || 1, wa = mb / (ma + mb), wb = ma / (ma + mb), nx = dx / d, ny = dy / d;
      a.x -= nx * k * 2 * wa; a.y -= ny * k * 2 * wa; b.x += nx * k * 2 * wb; b.y += ny * k * 2 * wb;
    }
    for (let q = 0; q < pairs.length; q += 2) {
      const a = list[pairs[q]], b = list[pairs[q + 1]], ra = ENEMIES[a.type].r, rb = ENEMIES[b.type].r, d = dist(a.x, a.y, b.x, b.y);
      if (d < ra + rb && d > 0.01) { const o = (ra + rb - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; }
    }
    // dọn quái chết / quá xa
    this.enemies = this.enemies.filter(e => !e.dead && dist(e.x, e.y, p.x, p.y) < 1800);
  }
  updateFoeShots(dt) {
    const p = this.p;
    for (const s of this.foes) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (this.world.blocked(s.x, s.y, s.r)) s.life = 0;
      else if (this.parryShot(s)) { /* kiếm chém tan / bật lại đạn */ }
      else if (dist(s.x, s.y, p.x, p.y) < s.r + p.r) { s.life = 0; this.hurtPlayer(s.dmg, Math.atan2(s.vy, s.vx)); }
    }
    this.foes = this.foes.filter(s => s.life > 0);
  }
  hurtPlayer(dmg, a) {
    const p = this.p; if (p.inv > 0 || this.over) return;
    const d = p.cls === 'KNIGHT' ? dmg * 0.8 : dmg;
    p.hp -= d; p.inv = 0.6; p.hurtT = 0.25; p.vx += Math.cos(a) * 320; p.vy += Math.sin(a) * 320;
    this.hitstop = Math.max(this.hitstop, 0.06);
    this.emit('hurt', { x: p.x, y: p.y, dmg: Math.round(d) });
    if (p.hp <= 0) { p.hp = 0; if (this.downed) this.downed(p); else { this.over = true; this.emit('dead', {}); } }
  }

  // ---------- đạo diễn: địch đông dần theo thời gian ----------
  director(dt) {
    this.intensity = this.t / 20;
    this.spawnT -= dt;
    const cap = Math.min(42, 6 + Math.floor(this.t / 6));
    if (this.spawnT <= 0 && this.enemies.length < cap) {
      this.wave++;
      const n = Math.min(7, 2 + Math.floor(this.t / 25)), ang = this.rand() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const r = this.rand(), type = this.t < 20 ? 'GRUNT' : r < 0.55 ? 'GRUNT' : r < 0.8 ? 'CHARGER' : 'SHOOTER';
        this.spawnEnemy(type, ang + i * 0.25, 560 + this.rand() * 120);
      }
      this.spawnT = Math.max(1.4, 4.2 - this.t / 40);
    }
  }
}
