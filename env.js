// Môi trường: 5 vùng, quái riêng từng vùng, mặt đất động (lửa/nước/băng/nham/đá đen/độc/cháy xém/bụi gai),
// tương tác nguyên tố và bẫy của bản đồ (bẫy trần ở dinh thự, mạch phun ở núi lửa). Không phụ thuộc DOM.
import { ENEMIES, TILE, hash2, dist, smoothNoise } from './sim.js';

export const THEME_ORDER = ['forest', 'dungeon', 'frost', 'volcano', 'palace'];
export const themeForStage = n => THEME_ORDER[Math.min(4, Math.floor(Math.max(0, n - 1) / 5))];

// ---------- quái theo vùng: ai = khuôn hành vi (melee / charger / shooter / assassin) ----------
Object.assign(ENEMIES.GRUNT, { ai: 'melee' });
Object.assign(ENEMIES.CHARGER, { ai: 'charger', name: 'Boar', tier: 2 });
Object.assign(ENEMIES.SHOOTER, { ai: 'shooter', name: 'Thorn Shaman', shot: 'thorn', color: '#7ac060', tier: 2, followup: true });
const add = (k, o) => { ENEMIES[k] = { mass: 1, gold: 1, ...o }; };
add('YETI',       { name: 'Yeti',          ai: 'melee',    hp: 80,  speed: 92,  r: 17, dmg: 12, color: '#dfeaf2', mass: 1.4, onHit: 'chill' });
add('WOLF',       { name: 'Ice Wolf',      ai: 'charger',  hp: 70,  speed: 110, r: 16, dmg: 20, color: '#b8c8d8', mass: 1.1, dash: 680, trail: 'ice' });
add('ICEMAGE',    { name: 'Frost Mage',    ai: 'shooter',  hp: 50,  speed: 82,  r: 14, dmg: 11, color: '#9fe6ff', mass: 0.8, shot: 'ice' });
add('SPOREMAN',   { name: 'Sporeling',     ai: 'melee',    hp: 64,  speed: 96,  r: 15, dmg: 12, color: '#c8b48a', death: 'poison' });
add('BEETLE',     { name: 'Shell Beetle',  ai: 'charger',  hp: 120, speed: 70,  r: 18, dmg: 26, color: '#5a7a4a', mass: 2, front: 'armor' });
add('SPITTER',    { name: 'Spore Spitter', ai: 'shooter',  hp: 52,  speed: 78,  r: 14, dmg: 12, color: '#9ac060', mass: 0.9, shot: 'poison' });
add('GUARD',      { name: 'Palace Guard',  ai: 'melee',    hp: 110, speed: 84,  r: 16, dmg: 15, color: '#c84a3a', mass: 1.8, front: 'shield' });
add('ASSASSIN',   { name: 'Shadow Assassin', ai: 'assassin', hp: 70, speed: 120, r: 14, dmg: 24, color: '#ff2a4a', mass: 0.9, tier: 2 });
add('BELLMAGE',   { name: 'Bell Priest',   ai: 'shooter',  hp: 60,  speed: 78,  r: 14, dmg: 12, color: '#e6b84a', mass: 0.9, bell: true });
add('MAGMAN',     { name: 'Magma Brute',   ai: 'melee',    hp: 95,  speed: 86,  r: 17, dmg: 15, color: '#ff7a3c', mass: 1.6, trail: 'fire', death: 'explode' });
add('SALAMANDER', { name: 'Salamander',    ai: 'charger',  hp: 85,  speed: 100, r: 16, dmg: 24, color: '#e8582a', mass: 1.2, dash: 640, trail: 'fire' });
add('EMBERMAGE',  { name: 'Ember Caller',  ai: 'shooter',  hp: 58,  speed: 80,  r: 14, dmg: 14, color: '#ffb04a', mass: 0.9, shot: 'lava' });
add('MINISPORE',  { name: 'Spore Imp',     ai: 'melee',    hp: 18,  speed: 125, r: 10, dmg: 6,  color: '#b8e070', mass: 0.5, onHit: 'poison', death: 'puddle', mini: true });
add('ILLUSION',   { name: 'Illusion',      ai: 'assassin', hp: 1,   speed: 130, r: 14, dmg: 10, color: '#a87aff', mass: 0.5, illusion: true });
// ELITE: hệ số chỉ số của quái tinh anh so với số gốc bên dưới (vòng lặp /tune được phép chỉnh); reach: tầm chiêu đặc biệt
export const ELITE = { hp: 1.6, speed: 1.15, dmg: 1.2, reach: 1.4 };
const elite = (k, base, o) => add(k, { elite: true, base, mass: 3, gold: 6, ...o, hp: Math.round(o.hp * ELITE.hp), speed: Math.round(o.speed * ELITE.speed), dmg: Math.round(o.dmg * ELITE.dmg) });
elite('EMBERHULK',   'GRUNT',      { name: 'Ember Hulk',       ai: 'melee',   hp: 90, speed: 105, r: 18, dmg: 20, color: '#ff7a3c', aura: '#ff3a2a', skill: 'quake' });
elite('GLACIER',     'ICEMAGE',    { name: 'Rime Seer', ai: 'shooter', hp: 75, speed: 96,  r: 16, dmg: 16, color: '#9fe6ff', aura: '#a87aff', skill: 'frostbeam', shot: 'ice' });
elite('SPOREMOTHER', 'SPOREMAN',   { name: 'Spore Mother',     ai: 'melee',   hp: 96, speed: 98,  r: 17, dmg: 16, color: '#c8b48a', aura: '#a87aff', skill: 'brood', death: 'poison' });
elite('BLADEDANCER', 'ASSASSIN',   { name: 'Blade Dancer',     ai: 'assassin',hp: 105, speed: 145, r: 16, dmg: 28, color: '#7a5ac0', aura: '#ff3a2a', skill: 'mirror' });
elite('INFERNO',     'SALAMANDER', { name: 'Inferno Brute',    ai: 'charger', hp: 128, speed: 120, r: 18, dmg: 30, color: '#e8582a', aura: '#ff3a2a', skill: 'rampage', dash: 760, trail: 'fire' });
export const ELITES = { forest: 'EMBERHULK', frost: 'GLACIER', dungeon: 'SPOREMOTHER', palace: 'BLADEDANCER', volcano: 'INFERNO' };
export const ROSTER = {
  // [thường gặp, hạng nặng / lao, tầm xa]: rosterType map GRUNT/CHARGER/SHOOTER của rừng sang ô tương ứng
  forest: ['GRUNT', 'CHARGER', 'SHOOTER'], dungeon: ['SPOREBOMB', 'HUSK', 'WEAVER'], frost: ['FROSTSTALKER', 'SENTINEL', 'CRYOMAGE'],
  volcano: ['CINDERIMP', 'JUGGERNAUT', 'BOMBARDIER'], palace: ['HALBERDIER', 'ASSASSIN', 'ARCANIST']
};

// ---------- loại ô nền (dùng chung với phần vẽ) ----------
export const PATH = 1, PATCH = 2;
// nham chỉ ở phần lõi của mảng nền (sông nham hẹp hơn, chừa đường đi)
export const isLava = (tx, ty, seed) => smoothNoise(tx, ty, seed + 202, 6) > 0.73;
export function tileType(tx, ty, seed) {
  const line = (sd, sc, w) => { const f = (x, y) => smoothNoise(x, y, seed + sd, sc), n = f(tx, ty), gx = f(tx + 1, ty) - f(tx - 1, ty), gy = f(tx, ty + 1) - f(tx, ty - 1); return Math.abs(n - 0.5) < Math.hypot(gx, gy) * 0.5 * w; };
  if (line(101, 11, 0.75) || line(303, 19, 1.1)) return PATH;
  return smoothNoise(tx, ty, seed + 202, 6) > 0.64 ? PATCH : 0;
}

// ---------- mặt đất động ----------
export const SC = 24; // cạnh ô mặt đất (nửa ô nền)
const MAX_CELLS = 520;
const LIFE = { fire: 3.2, water: 10, ice: 14, obsidian: 22, poison: 6, scorched: 25, thorn: 7, lava: 9, fault: 9, mud: 8, rubble: 9, sand: 6, magma: 5 };
export const SURF_FX = { // ảnh hưởng tới ai đứng trên: tốc độ, độ bám, sát thương/giây
  water: { spd: 0.65, grip: 1 }, ice: { spd: 1.05, grip: 0.16 }, fire: { spd: 1, grip: 1, dps: 9, burn: true }, lava: { spd: 0.7, grip: 1, dps: 26, burn: true }, fault: { spd: 0.7, grip: 1, dps: 26 },
  poison: { spd: 0.9, grip: 1, dps: 8 }, thorn: { spd: 0.55, grip: 1, dps: 2 }, obsidian: { spd: 1, grip: 1 }, scorched: { spd: 1, grip: 1 },
  mud: { spd: 0.55, grip: 1 }, rubble: null, sand: null, magma: null
};
// riêng cho quái: đá vụn làm chậm, cát làm mù, magma đốt (người chơi tạo ra nên không hại người chơi)
export const SURF_FX_E = { ...SURF_FX, rubble: { spd: 0.62, grip: 1 }, sand: { spd: 0.85, grip: 1, blind: true }, magma: { spd: 0.7, grip: 1, dps: 20, burn: true } };
export class Surface {
  constructor(world) { this.w = world; this.cells = new Map(); this.theme = 'forest'; this.tick = 0; this.burning = new Set(); }
  key(i, j) { return i + ',' + j; }
  base(i, j) {
    const t = tileType(Math.floor(i * SC / TILE), Math.floor(j * SC / TILE), this.w.seed);
    if (t === PATCH && this.theme === 'frost') return 'ice';
    if (t === PATCH && this.theme === 'volcano' && isLava(Math.floor(i * SC / TILE), Math.floor(j * SC / TILE), this.w.seed)) return 'lava';
    return null;
  }
  flammable(i, j) { const t = tileType(Math.floor(i * SC / TILE), Math.floor(j * SC / TILE), this.w.seed); return (this.theme === 'forest' || this.theme === 'dungeon') && t !== PATH; }
  at(x, y) { const i = Math.floor(x / SC), j = Math.floor(y / SC), c = this.cells.get(this.key(i, j)); return c ? c.type : this.base(i, j); }
  set(i, j, type, life) {
    const k = this.key(i, j);
    if (!type) { this.cells.delete(k); return; }
    if (!this.cells.has(k) && this.cells.size >= MAX_CELLS) return;
    this.cells.set(k, { i, j, type, t: life ?? LIFE[type] ?? 6 });
  }
  setAt(x, y, type, life) { this.set(Math.floor(x / SC), Math.floor(y / SC), type, life); }
  // áp nguyên tố lên một vùng; trả về danh sách phản ứng để game xử lý (nổ, hơi nước…)
  apply(x, y, r, el, opt = {}) {
    const out = [], R = Math.ceil(r / SC), ci = Math.floor(x / SC), cj = Math.floor(y / SC), rand = opt.rand || Math.random;
    for (let j = cj - R; j <= cj + R; j++) for (let i = ci - R; i <= ci + R; i++) {
      const cx = (i + 0.5) * SC, cy = (j + 0.5) * SC; if (dist(cx, cy, x, y) > r) continue;
      const cur = this.at(cx, cy);
      if (el === 'FIRE') {
        if (cur === 'ice') this.set(i, j, 'water');
        else if (cur === 'water') { this.set(i, j, null); if (rand() < 0.3) out.push({ kind: 'steam', x: cx, y: cy }); }
        else if (cur === 'poison') { this.set(i, j, null); out.push({ kind: 'explode', x: cx, y: cy }); }
        else if (cur === 'thorn') this.set(i, j, 'fire');
        else if (cur !== 'lava' && cur !== 'obsidian' && cur !== 'scorched' && cur !== 'fire' && this.flammable(i, j) && rand() < (opt.chance ?? 0.55)) this.set(i, j, 'fire');
      } else if (el === 'WATER') {
        if (cur === 'fire') { this.set(i, j, 'scorched'); if (rand() < 0.3) out.push({ kind: 'steam', x: cx, y: cy }); }
        else if (cur === 'lava') this.set(i, j, 'obsidian');
        else if (cur === 'water' && opt.freeze) this.set(i, j, 'ice');
        else if (!cur && opt.puddle && rand() < 0.35) this.set(i, j, opt.freeze ? 'ice' : 'water');
      } else if (el === 'EARTH') {
        if (cur === 'lava') this.set(i, j, 'obsidian');
        else if (cur === 'fire' || cur === 'poison') this.set(i, j, null);
      } else if (el === 'WIND') {
        if (cur === 'poison') this.set(i, j, null);
        else if (cur === 'fire' && rand() < 0.5) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rand() * 4)]; if (this.flammable(i + d[0], j + d[1])) this.set(i + d[0], j + d[1], 'fire'); }
      } else if (el === 'POISON') { if (cur !== 'lava' && cur !== 'water') this.set(i, j, 'poison', opt.life); }
      else if (el === 'ICE') { if (cur === 'lava') this.set(i, j, 'obsidian'); else if (cur === 'fire') this.set(i, j, null); else this.set(i, j, 'ice', opt.life); }
      else if (el === 'QUAKE') this.set(i, j, 'fault', opt.life);   // hố nứt địa chấn (Ashen Colossus)
      else if (el === 'LAVA') { if (cur === 'water' || cur === 'ice') this.set(i, j, 'obsidian'); else this.set(i, j, 'lava', opt.life); }
      else if (el === 'THORN') { if (!cur) this.set(i, j, 'thorn'); }
      else if (el === 'RUBBLE' || el === 'MUD' || el === 'SAND' || el === 'MAGMA') { if (cur === 'lava') this.set(i, j, 'obsidian'); else if (cur !== 'water' || el === 'MUD') this.set(i, j, el.toLowerCase(), opt.life); }
      else if (el === 'BURN') { if (cur === 'ice' || cur === 'water') this.set(i, j, cur === 'ice' ? 'water' : null); else if (cur === 'poison') { this.set(i, j, null); out.push({ kind: 'explode', x: cx, y: cy }); } else if (cur !== 'lava' && cur !== 'obsidian') this.set(i, j, 'fire', opt.life); }
    }
    // đốt vật cản dễ cháy
    if (el === 'FIRE') this.w.near(x, y, r + 40, o => { if (!o.dead && (o.type === 'tree' || o.type === 'crate') && dist(o.x, o.y, x, y) < r + o.r && !(this.theme === 'frost' && o.type === 'tree' && rand() < 0.5)) this.ignite(o); });
    if (el === 'WATER') this.w.near(x, y, r + 40, o => { if (o.burning && dist(o.x, o.y, x, y) < r + o.r) { o.burning = 0; this.burning.delete(o); } });
    return out;
  }
  ignite(o) { if (o.burning > 0) return; o.burning = 5; this.burning.add(o); }
  // cập nhật theo nhịp: lửa lan và tắt, băng/nước/độc hết hạn, vật cản đang cháy
  update(dt, rand, onReact) {
    this.tick -= dt;
    for (const o of this.burning) {
      if (o.dead || !(o.burning > 0)) { this.burning.delete(o); continue; }
      o.burning -= dt; o.hp -= 16 * dt; o.hit = Math.max(o.hit || 0, 0.02);
      if (rand() < dt * 2.5) this.apply(o.x + (rand() - 0.5) * o.r * 2, o.y + (rand() - 0.5) * o.r * 2, 30, 'FIRE', { rand, chance: 0.8 });
      if (rand() < dt * 0.6) this.w.near(o.x, o.y, 110, q => { if (q !== o && !q.dead && (q.type === 'tree' || q.type === 'crate') && dist(q.x, q.y, o.x, o.y) < 110) this.ignite(q); });
      if (o.hp <= 0) { o.charred = true; this.burning.delete(o); this.w.breakObs(o); }
    }
    if (this.tick > 0) return; const step = 0.25; this.tick = step;
    let fires = 0; for (const c of this.cells.values()) if (c.type === 'fire') fires++;
    for (const c of [...this.cells.values()]) {
      c.t -= step;
      if (c.type === 'fire') {
        if (fires < 140 && rand() < 0.16) { const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rand() * 4)], ni = c.i + d[0], nj = c.j + d[1]; if (!this.cells.has(this.key(ni, nj)) && this.flammable(ni, nj)) { this.set(ni, nj, 'fire', 2.2 + rand() * 1.5); fires++; } }
        if (rand() < 0.05) this.w.near((c.i + 0.5) * SC, (c.j + 0.5) * SC, 40, o => { if ((o.type === 'tree' || o.type === 'crate') && dist(o.x, o.y, (c.i + 0.5) * SC, (c.j + 0.5) * SC) < o.r + 20) this.ignite(o); });
        if (c.t <= 0) this.set(c.i, c.j, 'scorched');
      } else if (c.t <= 0) {
        if (c.type === 'ice' && this.base(c.i, c.j) !== 'ice') this.set(c.i, c.j, 'water', 4);
        else this.set(c.i, c.j, null);
      }
    }
  }
}

// ---------- bẫy của bản đồ: vị trí sinh từ hash, chạy theo đồng hồ chung (tất định) ----------
export function mapHazards(theme, seed, cx, cy, rad) {
  if (theme !== 'palace' && theme !== 'volcano') return [];
  const out = [], t0x = Math.floor((cx - rad) / TILE), t1x = Math.floor((cx + rad) / TILE), t0y = Math.floor((cy - rad) / TILE), t1y = Math.floor((cy + rad) / TILE);
  const rate = theme === 'palace' ? 0.016 : 0.014;
  for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
    const h = hash2(tx, ty, seed + 77); if (h >= rate) continue;
    if (Math.abs(tx * TILE) < 300 && Math.abs(ty * TILE) < 300) continue; // vùng xuất phát an toàn
    const k = hash2(tx, ty, seed + 78);
    out.push({ id: tx + ',' + ty, x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE, period: 4.5 + k * 3, off: k * 10, r: theme === 'palace' ? 62 : 54, kind: theme === 'palace' ? 'chandelier' : 'vent' });
  }
  return out;
}
export const WARN = 1.3; // giây báo trước khi bẫy sập / mạch phun
export function hazardPhase(h, t) { return ((t + h.off) % h.period) / h.period * h.period; } // giây đã trôi trong chu kỳ
