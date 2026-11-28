// Lõi một lượt chơi: 20 stage, boss ở 5/10/15/20, nâng cấp sau mỗi wave, nâng cấp lớn ở đầu stage 3/7/12/18.
// Mỗi ô trên thanh là một lõi (chiêu đã ghép sẵn): bấm 1 phím là tung. Ghép lõi trong túi đồ.
import { mirrorDodge, mirrorBreak, confusedStep, axiomStop } from './axiom.js';
import { Sim, ENEMIES, CLASSES, dist, angDiff } from './sim.js';
import { EL, skillDef, coreDef, coreKey, coreEls, mergeResult, skillPower } from './kits.js';
import { defaultMods, rollMinor, rollMajor, MINOR_BY_ID } from './upgrades.js';
import { BOSS_DEFS, makeBoss, bossUpdate, updateHazards, poiseDamage } from './boss.js';
import { themeForStage } from './env.js';
import { buildArena, teardownArena, ARENA_R } from './arena.js';
import { ultOnCast, castUlt, updateUlts } from './ults.js';
import { tickDefense, withPhantom, dmgTakenMul, critMul, clearShots, heal, tickHeal } from './defense.js';
import { forgeDef, onCast, onHit, onTrap, onKill as onKillF, onDashEnd, onZone, onShot, onShotEnd } from './forgeups.js';
import { relicBasic, relicHit, relicKill, relicCastAim, relicAfterCast, relicBlocksEnergy, healMul, tickRelics, relicShots, relicExplode, canBloodPay, bloodPay } from './relics.js';
import { GOLD, BOSS_GOLD, goldRoll, enterForge, stageGold, rollForge, inForge, FORGE_R, FORGE_CALM, FORGE_NOSPAWN, smithOf, drinkPotion } from './forge.js';
import { placeForge, removeForge } from './gameenv.js';
import { isRanged, steerFoe } from './foes.js';
import { initEnv, setTheme, rosterType, eliteFor, terraform, envHit, frontGuard, onDeath, foeLand, enemiesExtra, envStep, frozenInput } from './gameenv.js';

const TAU = Math.PI * 2;
export const MAJOR_STAGES = [3, 7, 12, 18, 22];
export const BOSS_STAGES = { 5: 0, 10: 2, 15: 1, 20: 4, 25: 3 }; // Storm Sovereign là boss cuối
export const LAST_STAGE = 25;
export const WAVE_REST = 1.75, STAGE_REST = 2.5, GATE_TRAVEL = 0.75;   // nghỉ giữa wave / dọn stage / bước qua cổng (tối dần)
export const BAR_SIZE = 4, BAG_SIZE = 6, INV_SIZE = BAR_SIZE + BAG_SIZE;
export const MAX_BAR = BAR_SIZE;
const BASIC_KINDS = new Set(['slash', 'wave']);
// năng lượng KHÔNG tự hồi: chỉ đến từ giết quái, đập thùng, đánh thường trúng (ít) và Mage tụ đủ lâu
export const KILL_ENERGY = { GRUNT: 6, CHARGER: 9, SHOOTER: 9, ELITE: 30 };
// tỉ lệ rơi: e = năng lượng, h = máu, s = nâng cấp chỉ số nhỏ vĩnh viễn
export const DROPS = {
  GRUNT: { e: 0.08, h: 0.02, s: 0.01 }, CHARGER: { e: 0.13, h: 0.035, s: 0.02 }, SHOOTER: { e: 0.13, h: 0.03, s: 0.02 },
  crate: { e: 0.6, h: 0.07, s: 0.04 }, supply: { e: 1, h: 0.25, s: 0 }, treasure: { e: 0.6, h: 0.45, s: 0.6 }, lamp: { e: 0.25, h: 0, s: 0 },
  tree: { e: 0.03, h: 0.01, s: 0 }, crystal: { e: 1, h: 0.2, s: 0.1, shard: 0.25 }, elite: { e: 1, h: 0.8, s: 0.35, shard: 0.55 }, rock: { e: 0.03, h: 0.01, s: 0.01 }, pillar: { e: 0.05, h: 0.02, s: 0.02 }
};
export const STAT_DROPS = [
  { id: 'dmg', name: '+3% skill damage', apply: m => { m.dmg *= 1.03; } },
  { id: 'hp', name: '+6 max HP', apply: (m, g) => { m.hpMax += 6; g.p.hp += 6; } },
  { id: 'spd', name: '+2% speed', apply: m => { m.speed *= 1.02; } },
  { id: 'en', name: '+5 max energy', apply: m => { m.energyMax += 5; } },
  { id: 'regen', name: '+1 energy per kill', apply: m => { m.energyKill = (m.energyKill || 0) + 1; } },
  { id: 'basic', name: '+4% attack damage', apply: m => { m.basic *= 1.04; } }
];
export const SPLIT_SIDE = 0.35, SPLIT_COST = 0.1;   // Split Shot: sát thương đạn phụ, giá chiêu thêm mỗi cấp
const SKILL_SHOTS = new Set(['sbolt', 'sarrow', 'crescent', 'cyclone', 'shard']);
const CC_INTERRUPT = ['stun', 'freeze', 'root'];

function scaleDef(o, f, key) {
  if (key === 'slow' && Array.isArray(o)) return [o[0], o[1] * f.freeze];
  if (Array.isArray(o)) return o.slice();
  if (o && typeof o === 'object') { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = scaleDef(v, f, k); return r; }
  if (typeof o !== 'number') return o;
  switch (key) {
    case 'dmg': return o * f.dmg;
    case 'radius': case 'area': return o * f.rad;
    case 'burn': return o * f.burn;
    case 'freeze': case 'root': return o * f.freeze;
    case 'stun': return o * f.stun;
    case 'life': return o * f.life;
    case 'push': return o * f.push;
    default: return o;
  }
}
function segDist(x, y, w) {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / L));
  const px = w.x1 + dx * t, py = w.y1 + dy * t, d = Math.hypot(x - px, y - py) || 0.001;
  return { d, nx: (x - px) / d, ny: (y - py) / d };
}

// co-op: các trường "của người chơi" nằm trên chính p; g.<tên> luôn trỏ vào người đang hành động (g.p)
export const PER_PLAYER = ['inQ', 'dashQ', 'spaceQ', 'aim', 'rewards', 'shopBuys', 'visitBuys', 'visitRelics', 'relicRerolls', 'relicOffer', 'inForge', 'forgeVisits', 'forgeDry', 'upgrades', 'upgradeLog', 'casts', 'merges', 'discovered', 'statDrops', 'rerolls', 'paidRerolls', 'revived', 'skillCache', 'zoneDr', 'pv', 'hidePt', 'goldEarned', 'noHitBoss'];
// vật thể do người chơi tạo ra: mỗi món nhớ chủ để khi cập nhật thì g.p = chủ của nó
const OWNED = ['shots', 'zones', 'pending', 'traps', 'walls', 'ults', 'relicFx'];
// Brutal: quái trâu và đông hơn, ra đòn dồn dập hơn, bắn gấp đôi đạn; boss không bị choáng và đánh liên tục
// ---------- luật cân bằng chung (vòng lặp /tune được phép chỉnh các số này) ----------
// CD: hồi chiêu riêng từng chiêu = cd định nghĩa × scale
export const CD = { scale: 0.45 };
// COST: giá chiêu đơn / đôi = (flat + perCd × cd định nghĩa) × tier[hạng]; tuyệt kỹ giữ ultCost (% thanh năng lượng) × tier[2]
// (bench giao tranh cho thấy tuyệt kỹ đã đáng giá nhất trên mỗi mana; chiêu đơn rẻ quá nên đắt hơn 15%)
// RESONANCE: tung chiêu ghép 3 nguyên tố → buff t giây theo từng nguyên tố của nó.
// Lửa: +fire sát thương chiêu · Nước: hồi waterHeal × máu tối đa / s (vẫn trong trần) + xoá làm chậm/đóng băng · Đất: khiên earthShield × máu tối đa + miễn khống chế · Gió: +windSpeed tốc chạy, hồi chiêu chạy windCd lần nhanh hơn
export const RESONANCE = { t: 5, fire: 0.2, waterHeal: 0.04, earthShield: 0.15, windSpeed: 0.2, windCd: 2 };
// ULTFX: đặc sản tuyệt kỹ dùng chung (dấu nhận thêm sát thương có trần trên boss, ngưỡng kết liễu)
export const ULTFX = { bossVulnCap: 0.15, execAt: 0.3 };
// BURN: sát thương thiêu đốt mỗi 0,5 s (cố định, không theo sức chiêu: chiêu lửa nào cũng đốt như nhau)
export const BURN = { mob: 4.3, boss: 10 };
export const COST = { flat: 7, perCd: 3.4, tier: [1.15, 1, 1] };
export const BRUTAL = { count: 1.35, aggro: 1.4, elite: 0.55, bossWind: 0.78, bossIdle: 0.55, bossSpeed: 1.15, link: 0.25, twinSpread: 0.2 };
export const COOP = { hp: 0.5, boss: 0.7, count: 0.3, revive: 2, reviveR: 70, reviveHp: 0.4 };   // mỗi người thêm: máu quái +50%, máu boss +70%, số quái +30%
export const MAP_HP = { forest: 1, dungeon: 1.2, frost: 1.4, volcano: 1.6, palace: 1.8 };   // máu gốc quái thường theo map
export class Game extends Sim {
  constructor(seed = 1, cls = 'KNIGHT', opts = {}) {
    super(seed, cls);
    for (const k of PER_PLAYER) Object.defineProperty(this, k, { get() { return this.p['_' + k]; }, set(v) { this.p['_' + k] = v; }, configurable: true });
    this.coopN = opts.coopN || 1; this.players = [this.p];
    const p = this.p;
    this.training = !!opts.training; this.difficulty = opts.difficulty || 'NORMAL'; this.brutal = this.difficulty === 'HARD'; this.diff = this.brutal ? { hp: 1.4, dmg: 1.3 } : { hp: 1, dmg: 1 }; this.aggro = this.brutal ? BRUTAL.aggro : 1;   // Brutal (khoá cũ 'HARD')
    p.cores = Array(INV_SIZE).fill(null);
    if (this.training) {
      EL.forEach((el, i) => { p.cores[i] = { type: 'el', el }; p.cores[BAR_SIZE + i] = { type: 'el', el }; });
      p.cores[8] = { type: 'tri', els: ['FIRE', 'EARTH', 'WIND'] }; p.cores[9] = { type: 'duo', els: ['WATER', 'WIND'] };
    } else p.cores[0] = { type: 'el', el: opts.element || 'FIRE' };
    Object.defineProperty(p, 'bar', { get: () => p.cores.slice(0, BAR_SIZE), configurable: true });
    p.owned = new Set(); this.syncOwned();
    p.gold = 0; p.potions = { hp: 0, en: 0 }; p.potCd = 0; p.forged = new Set(); this.shopBuys = {}; this.visitBuys = {}; this.bossGoldN = 0; p.relics = new Set(); this.relicFx = []; this.relicOffer = []; this.visitRelics = 0; this.relicRerolls = 0; this.forge = null; this.inForge = false; this.forgeDry = 0;
    p.shards = 0; p.cds = {}; p.gcd = 0; p.queued = null; p.energy = 100; p.energyMax = 100;
    p.focus = 1; p.focusOn = false; p.focusRegenT = 0; p.shield = 0; p.shieldT = 0; p.sdashT = 0; p.sdash = null; p.leap = null; p.z = 0; p.castAnim = 0;
    p.mods = defaultMods(); this.upgrades = {}; this.upgradeLog = [];
    this.zones = []; this.pending = []; this.ults = []; this.walls = []; this.traps = []; this.hazards = [];
    this.discovered = new Set(); this.casts = 0; this.merges = 0; this.inQ = []; this.dashQ = false;
    this.stats = { dmg: 0, bossKills: 0 };
    this.stage = 0; this.state = 'fight'; this.rewards = []; this.spawnQ = []; this.sigils = []; this.burstT = 0; this.stageT = 0; this.stageTotal = 0;
    this.arena = null; this.boss = null; this.loot = null; this.portal = null; this.travel = 0; this.deathSlow = 0; this.clearT = 0; this.waveN = 0; this.waveOf = 0; this.waveRest = 0; this.won = false; this.dmgScale = 1; this.packs = 0; this.packT = 3;
    this.skillCache = new Map(); this.pickups = []; this.statDrops = 0; this.heal = n => heal(this, n);
    const ob = this.world.onBreak; this.world.onBreak = o => { ob(o); this.rollDrop(o.supply ? 'supply' : o.type === 'crate' && o.v > 0.85 ? 'treasure' : o.type, o.x, o.y); };
    this.rerolls = 3; this.paidRerolls = 0; this.revived = false; p.skin = opts.skin || ''; p.skinFx = opts.skinFx || null;
    initEnv(this, opts); this.lab = !!opts.lab; if (this.lab) this.labTheme = opts.theme || 'forest'; setTheme(this, opts.theme || 'forest');
    this.refreshStats(true);
    if (this.training) {
      for (const [x, y] of [[230, -90], [270, 20], [230, 130]]) this.spawnAt('DUMMY', x, y);
    } else this.startStage(1);
  }

  // ---------- chỉ số và chiêu ----------
  refreshStats(full) {
    const p = this.p, m = p.mods;
    p.max = Math.round((CLASSES[p.cls].hp + m.hpMax) * (m.hpMul || 1)); p.hp = full ? p.max : Math.min(p.hp, p.max);
    const C0 = CLASSES[p.cls];
    p.chargeSpd = m.chargeSpd || 1;
    p.speedMul = m.speed; p.basicMul = m.basic * (C0.basicDmg || 1); p.dashCdMul = m.dashCd; p.atkSpeed = m.atkSpeed;
    p.energyMax = Math.round(((C0.energy || 100) + (m.energyMax || 0)) * (m.energyMul || 1)); if (full) p.energy = p.energyMax; else p.energy = Math.min(p.energy, p.energyMax);
    this.skillCache.clear();
  }
  applyMods(def) {
    const m = this.p.mods, els = def.els;
    let dmg = m.dmg * (CLASSES[this.p.cls].skillDmg || 1), cd = m.cd, rad = 1;
    for (const e of els) { dmg *= m.elDmg[e] || 1; cd *= m.elCd[e] || 1; }
    if (els.includes('EARTH')) rad *= m.earthRadius;
    if (def.tags.some(t => t === 'area' || t === 'melee')) rad *= m.radius;
    if (def.group === 'ULTIMATE') cd *= m.ultCd;
    const out = scaleDef(def, { dmg, rad, burn: m.burn, freeze: m.freeze, stun: m.stun, life: m.zoneLife, push: m.push });
    // chiêu 3 nguyên tố: giá theo sức mạnh thật (thang log): yếu ~35, mạnh nhất ~90
    const tier = def.ultCost || def.tier === 3 ? 2 : els.length === 1 ? 0 : 1;
    const base = (def.ultCost ? def.ultCost / 100 * (CLASSES[this.p.cls].energy || 100) : def.tier === 3 ? Math.max(35, Math.min(90, 30 + 13 * Math.log(Math.max(1, skillPower(def)) / 40))) : COST.flat + def.cd * COST.perCd) * COST.tier[tier];
    out.cost = Math.round(base * cd);
    // hồi chiêu riêng từng chiêu: cd trong định nghĩa × CD.scale (chiêu đơn ~1,4–3,6 s, tuyệt kỹ ~9 s); Focus / Mastery rút ngắn theo cùng hệ số giá
    out.cd = +(def.cd * cd * CD.scale).toFixed(2);
    if (def.tags.includes('projectile') && (m.projExtra || m.pierce)) {
      if (out.shape === 'volley') out.count += 2 * m.projExtra;
      if (out.arrows) out.arrows.count += m.projExtra;
      if (out.split) out.split.count += m.projExtra;
      if (out.shards) out.shards.count += 2 * m.projExtra;
      if (out.shape === 'bolt' || out.shape === 'cyclone') out.extra = m.projExtra;
      if (out.crescent && !out.radial) out.extra = m.projExtra;
      for (const o of [out, out.arrows, out.crescent]) if (o) o.pierce = (o.pierce ?? 0) >= 50 ? o.pierce : (o.pierce ?? 0) + m.pierce;
      // Split Shot: đạn phụ chỉ gây SPLIT_SIDE sát thương (kể cả nổ / mảnh vỡ), mỗi cấp tăng giá chiêu SPLIT_COST
      if (m.projExtra) {
        const f = { dmg: SPLIT_SIDE, rad: 1, burn: 1, freeze: 1, stun: 1, life: 1, push: 1 };
        if (out.extra && (out.shape === 'bolt' || out.shape === 'cyclone')) out.side = scaleDef(out, f);
        if (out.extra && out.crescent) out.crescentSide = scaleDef(out.crescent, f);
        out.cost = Math.round(out.cost * (1 + SPLIT_COST * m.projExtra));
      }
    }
    return out;
  }
  skill(a, b) {
    const k = a + '>' + b; let s = this.skillCache.get(k);
    if (!s) { s = this.applyMods(skillDef(this.p.cls, a, b)); this.skillCache.set(k, s); }
    return s;
  }
  coreSkill(core, forceForge) {
    const k = 'C' + coreKey(core) + (forceForge ? '!' : ''); let s = this.skillCache.get(k);
    if (!s && core.type === 'inf') { // chiêu đôi + lõi đơn: tung cả hai chiêu cùng lúc
      const fi = this.p.forged.has('INF:' + core.els.join('>') + '+' + core.add); // rèn Infused = rèn cả hai chiêu thành phần
      const a = this.coreSkill({ type: 'duo', els: core.els }, fi), b = this.coreSkill({ type: 'el', el: core.add }, fi);
      s = { ...a, key: a.key + '+' + core.add, name: a.name + ' + ' + b.name, dual: [a, b], cost: Math.round((a.cost + b.cost) * 0.85), cd: +Math.max(a.cd, b.cd * 1.5).toFixed(2), els: [...new Set([...a.els, ...b.els])], combo: [...core.els, core.add], tier: 2, desc: 'Casts ' + a.name + ' and ' + b.name + ' at the same time. ' + a.desc };
      this.skillCache.set(k, s);
    }
    if (!s) { let d = coreDef(this.p.cls, core); if (forceForge || this.p.forged.has(d.key)) d = forgeDef(this.p.cls, d); s = this.applyMods(d); if (core.type === 'inf' && this.p.forged.has('INF:' + core.els.join('>') + '+' + core.add)) { s = { ...s, forged: true, name: 'Forged ' + s.name }; } this.skillCache.set(k, s); }
    return s;
  }
  ownedTags() {
    const p = this.p, tags = new Set();
    for (const a of p.owned) for (const b of p.owned) for (const t of skillDef(p.cls, a, b).tags) tags.add(t);
    for (const c of p.cores) if (c) for (const t of coreDef(p.cls, c).tags) tags.add(t);
    return tags;
  }
  syncOwned() { const p = this.p; p.owned = new Set(p.cores.filter(Boolean).flatMap(coreEls)); }
  freeSlot() { const i = this.p.cores.indexOf(null); return i; }
  addCore(core) { const i = this.freeSlot(); if (i < 0) return -1; this.p.cores[i] = core; this.syncOwned(); this.emit('coreGain', { el: core.el, slot: i }); return i; }
  // ghép các lõi ở các vị trí idxs (theo đúng thứ tự người chơi chọn). Lõi nguyên liệu biến mất.
  mergeCores(idxs) {
    const p = this.p, cores = idxs.map(i => p.cores[i]);
    const res = mergeResult(cores); if (res.error) return res;
    if (res.type === 'tri' && !this.labShards) { if ((p.shards || 0) < 1) return { error: 'Needs 1 Fusion Shard (break purple crystals or defeat elites).' }; p.shards--; }
    for (const i of idxs) p.cores[i] = null;
    const at = Math.min(...idxs); p.cores[at] = res; this.syncOwned(); this.merges++;
    const sk = this.coreSkill(res); this.emit('merge', { name: sk.name, slot: at });
    return { core: res, slot: at, skill: sk };
  }

  hasUlt() { return this.p.cores.some(c => c && (c.type === 'tri' || c.type === 'inf')); }
  swapInv(i, j) { const v = this.p.cores; if (i === j || i < 0 || j < 0 || i >= INV_SIZE || j >= INV_SIZE) return; [v[i], v[j]] = [v[j], v[i]]; this.p.queued = null; }
  swapBar(i, j) { this.swapInv(i, j); }
  onKill(e) { onDeath(this, e); relicKill(this, e, this._lastKind); const ed = ENEMIES[e.type] || {}; if (e._lastSk) onKillF(this, e, e._lastSk); if (ed.illusion || ed.mini) return; if (!this.training || this.labGold) { if (e.boss) { this.dropGold(BOSS_GOLD(this.bossGoldN || 0), e.x, e.y); this.bossGoldN = (this.bossGoldN || 0) + 1; } else if (e.type !== 'DUMMY') { const v = goldRoll(this, ed.elite ? 'ELITE' : ed.tier === 2 ? 'CHARGER' : 'GRUNT'); if (v) this.dropGold(v, e.x, e.y); } } if (!e.boss && e.type !== 'DUMMY') { const ai = ed.ai, base = ed.elite ? KILL_ENERGY.ELITE : ed.tier === 2 ? KILL_ENERGY.CHARGER : KILL_ENERGY.GRUNT; this.gainEnergy(base + (this.p.mods.energyKill || 0)); this.emit('killEnergy', { x: e.x, y: e.y, v: base }); } if (ed.elite) { this.rollDrop('elite', e.x, e.y); this.dropAt('energy', e.x, e.y); return; } if (!e.boss) { const ai = ed.ai; this.rollDrop(ed.tier !== 2 ? 'GRUNT' : isRanged(ed) ? 'SHOOTER' : 'CHARGER', e.x, e.y); return; } if (e.boss) { this.dropAt('heal', e.x, e.y); this.dropAt('energy', e.x + 20, e.y); this.dropAt('stat', e.x - 20, e.y); this.dropAt('stat', e.x, e.y + 20); } else this.rollDrop(e.type, e.x, e.y); }
  rollDrop(src, x, y) {
    const d = DROPS[src]; if (!d) return;
    if (src === 'supply') this.dropAt('energy', x, y); // thùng đấu trường: 2 viên năng lượng
    if (this.rand() < d.e) this.dropAt('energy', x, y);
    if (this.rand() < d.h) this.dropAt('heal', x, y);
    if (this.rand() < d.s) this.dropAt('stat', x, y);
    if (d.shard && this.rand() < d.shard) this.dropAt('shard', x, y);
    if (GOLD[src] && (!this.training || this.labGold)) { const v = goldRoll(this, src); if (v) this.dropGold(v, x, y); }
  }
  dropAt(kind, x, y) {
    const a = this.rand() * Math.PI * 2, v = 90 + this.rand() * 90;
    const it = { kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 20 };
    if (kind === 'stat') it.stat = STAT_DROPS[Math.floor(this.rand() * STAT_DROPS.length)].id;
    this.pickups.push(it); this.emit('drop', { x, y, kind });
  }
  collect(it) {
    const p = this.p; let label = '';
    if (it.kind === 'gem' || it.kind === 'bshard') { this.emit('pickup', { x: it.x, y: it.y, kind: it.kind, label: it.label || '', hint: it.hint || '' }); return; }   // phần thưởng hồ sơ (đã ghi lúc boss chết), nhặt để xem
    if (it.kind === 'gold') { this.addGold(it.v || 1, 'pickup'); label = ''; this.emit('coin', { x: it.x, y: it.y, v: it.v || 1 }); return; }
    if (it.kind === 'crystal') { p.shield = Math.max(p.shield || 0, 25); p.shieldT = Math.max(p.shieldT || 0, 5); label = '+25 shield'; this.emit('pickup', { x: it.x, y: it.y, kind: 'crystal', label }); return; }
    if (it.kind === 'shard') { p.shards = (p.shards || 0) + 1; label = '+1 Fusion Shard'; }
    else if (it.kind === 'energy') { p.energy = Math.min(p.energyMax, p.energy + 20); label = '+20 energy'; }
    else if (it.kind === 'heal') { const v = Math.round(p.max * 0.12 * healMul(p)); p.hp = Math.min(p.max, p.hp + v); label = '+' + v + ' HP'; }
    else { const s = STAT_DROPS.find(q => q.id === it.stat) || STAT_DROPS[0]; s.apply(p.mods, this); this.statDrops++; this.upgradeLog.push(s.name); this.refreshStats(false); label = s.name; }
    this.emit('pickup', { x: it.x, y: it.y, kind: it.kind, label, stat: it.stat });
  }
  updatePickups(dt) {
    const p = this.p, b = this.boss;
    // boss rơi năng lượng mỗi khi mất 12.5% máu (giữa trận boss không có thùng để đập), mốc 50% rơi thêm máu
    if (b && !b.dead) while (b.hp / b.max < (this.bossDropNext ?? 0.875) && (this.bossDropNext ?? 0.875) > 0.01) { const n = this.bossDropNext ?? 0.875; this.dropAt('energy', b.x, b.y); if (Math.abs(n - 0.5) < 0.01) this.dropAt('heal', b.x, b.y); this.bossDropNext = n - 0.125; }
    for (const it of this.pickups) {
      it.t += dt; it.life -= dt; it.x += it.vx * dt; it.y += it.vy * dt; const fr = it.vz !== undefined ? 0.975 : 0.9; it.vx *= fr; it.vy *= fr;
      if (it.vz !== undefined) { it.z += it.vz * dt; it.vz -= 1100 * dt; if (it.z <= 0) { it.z = 0; it.vz = Math.abs(it.vz) > 90 ? -it.vz * 0.45 : 0; if (!it.vz) { it.vx *= 0.3; it.vy *= 0.3; } } }   // vòng nảy rơi xuống sàn
      if (it.z > 1) continue;
      const p = this.coop ? this.nearestPlayer(it.x, it.y) : this.p, d = dist(it.x, it.y, p.x, p.y) || 0.01;
      if ((this.clearT > 0 || this.vacuum) && it.t > 0.2) { const k = Math.min(d, (380 + it.t * 300) * dt); it.x += (p.x - it.x) / d * k; it.y += (p.y - it.y) / d * k; }   // dọn stage: mọi vàng/hồi máu bay về người chơi
      else if (it.t > 0.35 && d < 120) { const k = 520 * (1 - d / 140) * dt; it.x += (p.x - it.x) / d * k; it.y += (p.y - it.y) / d * k; }
      if (it.t > 0.35 && dist(it.x, it.y, p.x, p.y) < 22) { this.as(p, () => this.collect(it)); it.life = 0; }
    }
    this.pickups = this.pickups.filter(it => it.life > 0);
  }
  // đồ boss bung ra sàn: vòng nảy, không hết hạn
  arcLoot(it, spread = 1) { const a = this.rand() * TAU, v = (200 + this.rand() * 260) * spread; it.vx = Math.cos(a) * v; it.vy = Math.sin(a) * v * 0.7; it.z = 0; it.vz = 360 + this.rand() * 260; it.life = Infinity; it.t = 0; return it; }
  // main gọi khi boss chết: gem và mảnh skin boss rơi thật trên sàn (đã ghi vào hồ sơ, nhặt để xem)
  bossLoot(kind, n, label, hint) { const L = this.loot; if (!L) return; for (let i = 0; i < n; i++) { const it = { kind, x: L.x, y: L.y, t: 0, label: i === 0 ? label : '', hint: i === 0 ? hint : '' }; this.arcLoot(it, kind === 'bshard' ? 0.6 : 1); this.pickups.push(it); } this.emit('drop', { x: L.x, y: L.y, kind }); }
  addGold(v, why) { const p = this.p; v = Math.round(v); if (!(v > 0)) return; p.gold += v; this.goldEarned = (this.goldEarned || 0) + v; this.emit('gold', { v, why }); }
  dropGold(v, x, y) { const n = Math.min(14, Math.max(1, Math.round(v / 25))); let left = v; for (let i = 0; i < n; i++) { const c = i === n - 1 ? left : Math.round(v / n); left -= c; this.dropAt('gold', x, y); this.pickups[this.pickups.length - 1].v = c; } }
  gainEnergy(v) { if (relicBlocksEnergy(this)) return; const p = this.p; p.energy = Math.min(p.energyMax, p.energy + v * (p.mods.energyGain || 1)); }
  // ---------- vòng cập nhật ----------
  step(dt, it = {}) {
    if (this.labSlow) dt *= 0.25;
    // gom input TRƯỚC mọi điều kiện thoát sớm: không bao giờ mất phím vì hit-stop hay khung hình trống
    if (it.slots) for (const s of it.slots) this.inQ.push(typeof s === 'object' ? s.slot : s);
    if (it.dash) this.dashQ = true;
    if (it.space) this.spaceQ = true;
    if (it.ax !== undefined) this.aim = [it.ax, it.ay];
    if (this.over || this.state !== 'fight') return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.p.ax && this.p.ax.stop && axiomStop(this, dt)) return;   // Thuấn Trảm: thế giới đứng yên, đồng hồ không chạy
    if (this.deathSlow > 0) { this.deathSlow -= dt; dt *= 0.3; }   // boss gục: chậm lại một nhịp
    let it2 = { ...it, dash: this.dashQ, space: !!this.spaceQ }; this.dashQ = false; this.spaceQ = false; frozenInput(this, it2);
    if (this.travel > 0) { const G = this.portal; it2 = G ? { mx: G.x - this.p.x, my: G.y - 30 - this.p.y, ax: G.x, ay: G.y - 60 } : {}; this.inQ = []; this.p.queued = null; }   // đang bước qua cổng
    if (this.p.goldT > 0) { it2 = { ax: it.ax, ay: it.ay }; this.inQ = []; this.p.queued = null; }
    this.t += dt;
    { const was = this.inForge; this.inForge = inForge(this, this.p.x, this.p.y); if (this.inForge && !was) enterForge(this); } if (this.forge) this.forge.t += dt;
    tickDefense(this, dt);
    this.tickPlayer(dt, it2);
    this.updatePlayer(dt, it2);
    tickRelics(this, dt);
    const w = this.p.slowmoT > 0 ? 0.35 : this.p.slowmo ? 0.55 : 1, wdt = dt * w; this.timeScale = w;
    this.updateShots(dt);
    this.updateEnemies(wdt);
    this.updateFoeShots(wdt);
    this.director(dt);
    if (this.over) return;
    this.updateSkills(dt);
    this.updatePickups(dt);
    envStep(this, dt);
    updateHazards(this, wdt);
    if (this.arena) { this.clampArena(this.p, this.p.r); if (this.boss && !this.boss.dead && !this.boss.leap) this.clampArena(this.boss, this.boss.r); }
  }
  tickPlayer(dt, it) {
    const p = this.p;
    const R = p.res; let cdRate = 1;
    if (R) { for (const k in R) if (R[k] > 0) R[k] -= dt; if (R.WIND > 0) cdRate = RESONANCE.windCd; if (R.WATER > 0) heal(this, p.max * RESONANCE.waterHeal * dt); if (R.EARTH > 0) { p.frozen = 0; p.rooted = 0; } p.resSpd = R.WIND > 0 ? 1 + RESONANCE.windSpeed : 1; }
    for (const k in p.cds) { p.cds[k] -= dt * cdRate; if (p.cds[k] <= 0) delete p.cds[k]; }
    p.gcd = Math.max(0, p.gcd - dt); p.castAnim = Math.max(0, p.castAnim - dt);
    tickHeal(p, dt);
    const hr = (p.mods.regen || 0) + (CLASSES[p.cls].hpRegen || 0); if (hr && p.hp > 0) heal(this, hr * (p.mods.regenMul || 1) * dt);
    if (this.infHp) { p.hurtClock = (p.hurtClock || 0) + dt; if (p.hp < p.max && p.hurtClock > 1.2) p.hp = p.max; }
    if (this.labEnergy) p.energy = p.energyMax;
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }
    if (!(p.shield > 0)) p.shieldBurn = 0;
    if (p.potCd > 0) p.potCd = Math.max(0, p.potCd - dt);
    if (it.potion) drinkPotion(this, it.potion);
    this.handleInput(dt, it);
  }
  handleInput(dt, it) {
    const p = this.p;
    for (const s of this.inQ.splice(0)) {
      const item = s < BAR_SIZE ? p.cores[s] : null;
      if (!item) { this.emit('locked', { slot: s }); continue; }
      this.tryCast(this.coreSkill(item), it);
    }
    if (p.queued) {
      p.queued.t -= dt;
      if (p.queued.t <= 0) p.queued = null;
      else if (this.canAct() && p.gcd <= 0) { const q = p.queued; p.queued = null; this.castNow(q.sk, q.ax, q.ay); }
    }
  }
  // cộng hưởng nguyên tố: buff theo các nguyên tố của tuyệt kỹ vừa tung (xem RESONANCE)
  resonate(els) {
    const p = this.p, R = p.res || (p.res = {}), T = RESONANCE.t;
    for (const el of els) R[el] = T;
    if (els.includes('WATER')) { p.slowT = 0; p.frozen = 0; p.chill = 0; }
    if (els.includes('EARTH')) { p.shield = Math.max(p.shield || 0, p.max * RESONANCE.earthShield); p.shieldT = Math.max(p.shieldT || 0, T); }
    this.emit('resonance', { x: p.x, y: p.y, els: els.slice() });
  }
  canAct() { const p = this.p; return !p.leap && p.sdashT <= 0; }
  tryCast(sk, it) {
    const p = this.p;
    const freeNow = p.freeCast === sk.key && p.freeCastT > 0;
    if (!freeNow && p.cds[sk.key] > 0) { this.emit('notReady', { name: sk.name, cd: p.cds[sk.key] }); return false; }   // đang hồi chiêu
    if (p.energy < sk.cost && !freeNow && !canBloodPay(this, sk.cost)) { this.emit('noEnergy', { name: sk.name, cost: sk.cost }); return false; }
    const ax = it.cx ?? it.ax ?? p.x + Math.cos(p.aim) * 200, ay = it.cy ?? it.ay ?? p.y + Math.sin(p.aim) * 200;
    if (!this.canAct() || p.gcd > 0) { p.queued = { sk, ax, ay, t: 0.4 }; return true; } // hàng chờ: tung ngay khi có thể
    this.castNow(sk, ax, ay); return true;
  }
  castNow(sk, ax, ay) {
    [ax, ay] = relicCastAim(this, ax, ay);
    const p = this.p, free = p.freeCast === sk.key && p.freeCastT > 0;
    if (!free && p.energy < sk.cost && !canBloodPay(this, sk.cost)) { this.emit('noEnergy', { name: sk.name, cost: sk.cost }); return; }
    if (free) { p.freeCast = null; p.freeCastT = 0; this.emit('freeCast', { x: p.x, y: p.y }); } else if (p.energy >= sk.cost) p.energy -= sk.cost; else bloodPay(this, sk.cost);   // Blood Magic: phần thiếu trả bằng máu
    if (!free && sk.cd > 0) p.cds[sk.key] = sk.cd;
    if (!free && sk.group === 'ULTIMATE' && sk.els && sk.els.length >= 3) this.resonate(sk.els);   // bản sao miễn phí (Echo, Wild, tung lại) không tính hồi chiêu
    this._castCost = free ? 0 : sk.cost; p.gcd = 0.25; p.castAnim = 0.25; this.casts++;
    const first = !this.discovered.has(sk.key); this.discovered.add(sk.key);
    if (sk.els.length > 1 && p.mods.comboFlow) this.gainEnergy(p.mods.comboFlow);
    if (sk.healOnCast) heal(this, sk.healOnCast);
    if (sk.shieldOnCast) { p.shield = Math.max(p.shield, sk.shieldOnCast); p.shieldT = Math.max(p.shieldT, 4); }
    this.emit('skill', { x: p.x, y: p.y, key: sk.key, name: sk.name, group: sk.group, first, els: sk.combo });
    const tgt = s2 => { const [tx, ty] = this.aimTarget(s2, ax, ay); return [tx, ty]; };
    const fxPrev = this._fx; this._fx = this.fxCat(sk);
    const run = (s2, f) => { const c = { ox: p.x, oy: p.y, ax, ay, a: Math.atan2(ay - p.y, ax - p.x), free }; const fp = this._fsk; this._fsk = s2.forge ? s2 : null; this._castId = (this._castId || 0) + 1; try { f(); onCast(this, s2, c); } finally { this._fsk = fp; } };
    try {
    if (sk.dual) { const [a, b] = sk.dual; run(a, () => { this.execute(a, ax, ay); terraform(this, a, ...tgt(a)); }); this.pend(0.06, () => run(b, () => { this.execute(b, ax, ay); terraform(this, b, ...tgt(b)); })); } else if (sk.ult) castUlt(this, sk, ax, ay); else run(sk, () => { this.execute(sk, ax, ay); terraform(this, sk, ...tgt(sk)); });
    } finally { this._fx = fxPrev; }
    relicAfterCast(this, sk, ax, ay);
    ultOnCast(this, sk, ax, ay, free);
  }

  // ---------- công cụ đánh ----------
  hitCircle(x, y, r, eff, sk) { envHit(this, x, y, r, sk, eff); this.world.damageObstacles(x, y, r * 0.8, eff.dmg || 0); let n = 0; for (const e of this.enemies) if (!e.dead && dist(x, y, e.x, e.y) < r + e.r) { this.applyHit(e, eff, Math.atan2(e.y - y, e.x - x), sk); n++; } return n; }
  hitArc(x, y, a, range, arc, eff, sk) {
    if (arc >= 6.2) envHit(this, x, y, range, sk, eff); else envHit(this, x + Math.cos(a) * range * 0.55, y + Math.sin(a) * range * 0.55, range * 0.5, sk, eff);
    let n = 0; if (arc >= 6.2) this.world.damageObstacles(x, y, range * 0.8, eff.dmg || 0); else this.world.damageObstacles(x + Math.cos(a) * range * 0.6, y + Math.sin(a) * range * 0.6, range * 0.45, eff.dmg || 0);
    for (const e of this.enemies) {
      if (e.dead) continue; const d = dist(x, y, e.x, e.y); if (d > range + e.r) continue;
      if (arc < 6.2 && Math.abs(angDiff(Math.atan2(e.y - y, e.x - x), a)) > arc / 2 + e.r / Math.max(d, 1)) continue;
      this.applyHit(e, eff, Math.atan2(e.y - y, e.x - x), sk); n++;
    }
    return n;
  }
  hitLine(x1, y1, x2, y2, half, eff, sk) {
    let n = 0; const w = { x1, y1, x2, y2 }, L = Math.hypot(x2 - x1, y2 - y1);
    for (let d = 0; d <= L; d += 70) envHit(this, x1 + (x2 - x1) * d / Math.max(1, L), y1 + (y2 - y1) * d / Math.max(1, L), half + 10, sk, eff);
    for (let d = 0; d <= L; d += half * 1.6 + 10) this.world.damageObstacles(x1 + (x2 - x1) * d / L, y1 + (y2 - y1) * d / L, half, eff.dmg || 0);
    for (const e of this.enemies) if (!e.dead && segDist(e.x, e.y, w).d < half + e.r) { this.applyHit(e, eff, Math.atan2(y2 - y1, x2 - x1), sk); n++; }
    return n;
  }
  addZone(kind, x, y, r, life, extra = {}) { this.zones.push({ kind, x, y, r, life, T: life, tickT: 0, hit: new Set(), fsk: this._fsk || null, ...extra }); this.emit('zone', { x, y, kind }); }
  pend(t, fn, tele) { const fx = this._fx, fs = this._fsk; this.pending.push({ t, T: t, fn: fx || fs ? () => { const o = this._fx, os = this._fsk; this._fx = fx; this._fsk = fs; try { fn(); } finally { this._fx = o; this._fsk = os; } } : fn, tele }); }
  emit(ev, d) { super.emit(ev, this._fx && d ? { ...d, fx: this._fx } : d); }
  fxCat(sk) { if (sk.group === 'ULTIMATE' || sk.tier === 3) return 'ult'; if (sk.dual) return 'duo'; const c = sk.combo || sk.els || []; return c.length >= 2 && c[0] !== c[1] ? 'duo' : 'single'; }
  proj(kind, x, y, a, o, sk) {
    this.shots.push({ kind, sk, o, castId: this._castId, quiet: !!o.quiet, x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, vx: Math.cos(a) * o.speed, vy: Math.sin(a) * o.speed, a,
      r: o.r || 8, life: o.range / o.speed, pierce: o.pierce ?? 0, hit: new Set(), tickT: 0, width: o.width || 0, el: sk.els[sk.els.length - 1] });
  }
  aimTarget(sk, ax, ay) {
    const p = this.p, d = dist(p.x, p.y, ax, ay), r = sk.range || 300;
    return d <= r ? [ax, ay] : [p.x + (ax - p.x) / d * r, p.y + (ay - p.y) / d * r];
  }

  // ---------- thực thi chiêu theo hình dạng ----------
  execute(sk, ax, ay) {
    const p = this.p, a = Math.atan2(ay - p.y, ax - p.x), main = sk.els[0], fx = sk.els[sk.els.length - 1];
    switch (sk.shape) {
      case 'arc': {
        const n = this.hitArc(p.x, p.y, a, sk.range, sk.arc, sk, sk);
        this.emit('arcSlash', { x: p.x, y: p.y, a, range: sk.range, arc: sk.arc, el: fx });
        if (sk.crescent) {
          const k = sk.radial || (1 + 2 * (sk.extra || 0));
          for (let i = 0; i < k; i++) { const ang = sk.radial ? a + i * TAU / k : a + (i - (k - 1) / 2) * 0.22; const side = !sk.radial && sk.crescentSide && i !== (k - 1) / 2; this.proj('crescent', p.x, p.y, ang, side ? sk.crescentSide : sk.crescent, sk); }
        }
        if (sk.leave) { const o = sk.leave.offset || 0; this.addZone(sk.leave.kind, p.x + Math.cos(a) * o, p.y + Math.sin(a) * o, sk.leave.radius, sk.leave.life); }
        if (n) this.hitstop = Math.max(this.hitstop, sk.group === 'ULTIMATE' ? 0.09 : 0.05);
        break;
      }
      case 'whirl': {
        if (sk.pull) for (const e of this.enemies) { const d = dist(p.x, p.y, e.x, e.y); if (!e.dead && d < sk.radius + e.r && d > 1) { const m = e.boss ? 40 : ENEMIES[e.type].mass; e.kx -= (e.x - p.x) / d * sk.pull / m * 1.4; e.ky -= (e.y - p.y) / d * sk.pull / m * 1.4; } }
        if (sk.spin) this.addZone('spin', p.x, p.y, sk.radius, sk.spin.time, { follow: true, tick: sk.spin.tick, eff: sk, sk });
        else this.hitCircle(p.x, p.y, sk.radius, sk, sk);
        this.emit('whirl', { x: p.x, y: p.y, r: sk.radius, el: fx });
        if (sk.barrier) { this.addZone('barrier', p.x, p.y, sk.radius, sk.barrier.life, { follow: true }); for (const f of this.foes) if (dist(f.x, f.y, p.x, p.y) < sk.radius) { f.life = 0; this.emit('block', { x: f.x, y: f.y }); } }
        if (sk.leave) this.addZone(sk.leave.kind, p.x, p.y, sk.leave.radius, sk.leave.life);
        if (sk.after) { const A = sk.after; this.pend(A.t, () => { this.hitCircle(p.x, p.y, A.radius, A, sk); this.emit('slam', { x: p.x, y: p.y, r: A.radius, el: 'WATER', big: true }); }); }
        break;
      }
      case 'spikes': {
        const lines = sk.radial || sk.lines || 1;
        for (let L = 0; L < lines; L++) {
          const ang = sk.radial ? a + L * TAU / lines : a + (lines > 1 ? (L - (lines - 1) / 2) * sk.spread : 0);
          for (let k = 1; k <= sk.count; k++) {
            const x = p.x + Math.cos(ang) * k * sk.spacing, y = p.y + Math.sin(ang) * k * sk.spacing, last = k === sk.count;
            this.pend(k * sk.step, () => {
              this.hitCircle(x, y, sk.radius, sk, sk); this.emit('spike', { x, y, r: sk.radius, el: fx });
              if (sk.leaveEach) this.addZone(sk.leaveEach.kind, x, y, sk.leaveEach.radius, sk.leaveEach.life);
              if (last && sk.leaveEnd) this.addZone(sk.leaveEnd.kind, x, y, sk.leaveEnd.radius, sk.leaveEnd.life);
            }, { x, y, r: sk.radius, el: fx });
          }
        }
        break;
      }
      case 'charge': this.startDash('charge', sk, a, ax, ay, (sk.charges || 1) - 1); break;
      case 'roll': this.startDash('roll', sk, a + Math.PI, ax, ay, (sk.rolls || 1) - 1); this.rollShots(sk, ax, ay); break;
      case 'leap': { const [tx, ty] = this.aimTarget(sk, ax, ay); p.leap = { x0: p.x, y0: p.y, x1: tx, y1: ty, t: 0, T: sk.time, sk }; p.inv = Math.max(p.inv, sk.time + 0.15); break; }
      case 'bolt': { const n = 1 + 2 * (sk.extra || 0); for (let i = 0; i < n; i++) { const s = sk.side && i !== (n - 1) / 2 ? sk.side : sk; this.proj('sbolt', p.x, p.y, a + (i - (n - 1) / 2) * 0.16, s, s); } break; }
      case 'volley': {
        const waves = sk.waves || 1;
        const fan = () => { const ang0 = Math.atan2(ay - p.y, ax - p.x); for (let i = 0; i < sk.count; i++) this.proj('sarrow', p.x, p.y, ang0 + (sk.count > 1 ? (i - (sk.count - 1) / 2) * sk.spread / (sk.count - 1) : 0), sk, sk); this.emit('volley', { x: p.x, y: p.y }); };
        for (let w = 0; w < waves; w++) { if (w === 0) fan(); else this.pend(w * (sk.wavegap || 0.2), fan); }
        break;
      }
      case 'trap': {
        const n = sk.trapCount || 1, [cx, cy] = this.aimTarget(sk, ax, ay);
        for (let i = 0; i < n; i++) {
          const ang = this.rand() * TAU, rr = n > 1 ? Math.sqrt(this.rand()) * (sk.scatter || 0) : 0;
          this.traps.push({ x: cx + Math.cos(ang) * rr, y: cy + Math.sin(ang) * rr, r: sk.radius, arm: sk.arm, life: sk.life, sk, key: sk.key, el: fx });
        }
        const mine = this.traps.filter(t => t.key === sk.key);
        while (mine.length > sk.max) { const t = mine.shift(); this.traps.splice(this.traps.indexOf(t), 1); }
        this.emit('trapSet', { x: cx, y: cy });
        break;
      }
      case 'rain': {
        const [cx, cy] = this.aimTarget(sk, ax, ay);
        for (let i = 0; i < sk.count; i++) {
          const ang = this.rand() * TAU, rr = Math.sqrt(this.rand()) * sk.area, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          this.pend(sk.delay + i * sk.duration / sk.count, () => {
            this.hitCircle(x, y, sk.radius, sk, sk); this.emit('rainHit', { x, y, r: sk.radius, el: fx, big: sk.radius > 60 });
            if (sk.leaveEach) this.addZone(sk.leaveEach.kind, x, y, sk.leaveEach.radius, sk.leaveEach.life);
          }, { x, y, r: sk.radius, el: fx, fall: true });
        }
        break;
      }
      case 'beam': {
        const x2 = p.x + Math.cos(a) * sk.length, y2 = p.y + Math.sin(a) * sk.length;
        const n = this.hitLine(p.x, p.y, x2, y2, sk.width / 2, sk, sk);
        this.emit('beam', { x1: p.x, y1: p.y, x2, y2, w: sk.width, el: fx });
        if (sk.endBurst) { this.hitCircle(x2, y2, sk.endBurst.radius, sk.endBurst, sk); this.emit('slam', { x: x2, y: y2, r: sk.endBurst.radius, el: 'EARTH' }); }
        if (n) this.hitstop = Math.max(this.hitstop, 0.04);
        break;
      }
      case 'ground': {
        const [tx, ty] = this.aimTarget(sk, ax, ay);
        this.pend(sk.delay, () => {
          this.hitCircle(tx, ty, sk.radius, sk, sk);
          if (sk.leave) this.addZone(sk.leave.kind, tx, ty, sk.leave.radius, sk.leave.life);
          this.emit('slam', { x: tx, y: ty, r: sk.radius, el: fx, big: true }); this.hitstop = Math.max(this.hitstop, 0.07);
        }, { x: tx, y: ty, r: sk.radius, el: fx, fall: main === 'EARTH' });
        break;
      }
      case 'nova':
        this.pend(sk.delay || 0.35, () => { this.hitCircle(p.x, p.y, sk.radius, sk, sk); this.emit('slam', { x: p.x, y: p.y, r: sk.radius, el: fx, big: true }); this.hitstop = Math.max(this.hitstop, 0.09); }, { follow: true, r: sk.radius, el: fx });
        break;
      case 'blink': {
        let [tx, ty] = this.aimTarget(sk, ax, ay);
        for (let k = 0; k < 10 && this.world.blocked(tx, ty, p.r + 2); k++) { tx = p.x + (tx - p.x) * 0.85; ty = p.y + (ty - p.y) * 0.85; }
        const ox = p.x, oy = p.y;
        if (sk.novaOrigin) { this.hitCircle(ox, oy, sk.novaOrigin.radius, sk.novaOrigin, sk); this.emit('slam', { x: ox, y: oy, r: sk.novaOrigin.radius, el: fx }); }
        p.x = tx; p.y = ty; p.vx = p.vy = 0; p.inv = Math.max(p.inv, 0.25);
        if (this.arena) this.clampArena(p, p.r);
        this.emit('blink', { x1: ox, y1: oy, x2: p.x, y2: p.y });
        if (sk.nova) { this.hitCircle(p.x, p.y, sk.nova.radius, sk.nova, sk); this.emit('slam', { x: p.x, y: p.y, r: sk.nova.radius, el: fx }); }
        break;
      }
      case 'cyclone': { const n = 1 + 2 * (sk.extra || 0); for (let i = 0; i < n; i++) { const s = sk.side && i !== (n - 1) / 2 ? sk.side : sk; this.proj('cyclone', p.x, p.y, a + (i - (n - 1) / 2) * 0.3, s, s); } break; }
      case 'well': { const [tx, ty] = this.aimTarget(sk, ax, ay); this.addZone('well', tx, ty, sk.radius, sk.life, { sk }); break; }
      case 'storm': this.addZone('storm', p.x, p.y, sk.radius, sk.life, { follow: true, tick: sk.tick, eff: sk, sk }); break;
    }
  }
  startDash(kind, sk, a, ax, ay, left) {
    const p = this.p, d = sk.dist;
    p.sdash = { kind, sk, dx: Math.cos(a), dy: Math.sin(a), speed: d / sk.time, hit: new Set(), trailT: 0, left, ax, ay };
    p.sdashT = sk.time; p.inv = Math.max(p.inv, (sk.inv || sk.time) + 0.1);
    if (kind === 'roll') {
      if (sk.leaveOrigin) this.addZone(sk.leaveOrigin.kind, p.x, p.y, sk.leaveOrigin.radius, sk.leaveOrigin.life);
      // bờ đất của Stone Tumble được dựng trong terraform()
    }
    this.emit('dash', { x: p.x, y: p.y });
  }
  rollShots(sk, ax, ay) {
    const p = this.p, A = sk.arrows, a = Math.atan2(ay - p.y, ax - p.x);
    for (let i = 0; i < A.count; i++) this.proj('sarrow', p.x, p.y, a + (A.count > 1 ? (i - (A.count - 1) / 2) * A.spread / (A.count - 1) * 2 : 0), A, sk);
  }

  basicAttack(c) { this.basicN = (this.basicN || 0) + 1; const p = this.p, m = p.nextBasic; if (m) { p.nextBasic = 0; p.basicMul *= m; } try { relicBasic(this, c, () => super.basicAttack(c)); } finally { if (m) p.basicMul /= m; } }
  explode(s) { const was = s.boomed; super.explode(s); if (!was && s.boomed) relicExplode(this, s); }
  // ---------- trạng thái và sát thương ----------
  applyHit(e, eff, a, sk) {
    if (e.dead) return;
    let dmg = eff.dmg || 0;
    if (eff.exec && e.hp < e.max * ULTFX.execAt) dmg *= 1 + eff.exec;   // kết liễu (Meteor Blade)
    if (sk) { e._lastSk = sk; if (sk.forge && dmg > 0) onHit(this, e, sk); }
    if (eff.freeze) e.frozeHit = 0.6;
    if (eff.burn && e.wet > 0) { e.wet = 0; dmg *= 1.3; this.emit('steamPop', { x: e.x, y: e.y }); }
    else if (eff.burn) e.burn = Math.max(e.burn, eff.burn);
    if (eff.wet) { e.wet = Math.max(e.wet, eff.wet); if (!eff.burn) e.burn = 0; }
    if (eff.slow) this.cc(e, 'slow', eff.slow[1], eff.slow[0]);
    if (eff.freeze) this.cc(e, 'freeze', eff.freeze * (e.wet > 0 ? 1.5 : 1));
    if (eff.stun) this.cc(e, 'stun', eff.stun);
    if (eff.root) this.cc(e, 'root', eff.root);
    if (eff.blind) this.cc(e, 'blind', eff.blind);
    const kb = eff.push || (eff.stun ? 160 : 90);
    if (e.boss && eff.push) poiseDamage(this, e, eff.push / 14);
    if (dmg > 0) {
      this.hurtEnemy(e, dmg, a, kb, 'skill');
      const echo = this.p.mods.aftershock;
      if (echo > 0 && sk && sk.tags && sk.tags.some(t => t === 'area' || t === 'melee' || t === 'beam')) this.pend(0.4, () => { if (!e.dead) this.hurtEnemy(e, dmg * echo, a, 0, 'echo'); });
    } else { const m = e.boss ? 40 : ENEMIES[e.type].mass; e.kx += Math.cos(a) * kb / m; e.ky += Math.sin(a) * kb / m; }
  }
  cc(e, type, dur, amt) {
    if (e.dead) return;
    if (type === 'slow') { e.slow = Math.max(e.slow, dur); e.slowAmt = Math.max(e.slowAmt, amt); return; }
    if (e.boss) { poiseDamage(this, e, ({ stun: 28, freeze: 32, root: 14, blind: 4 })[type] * dur); this.emit('cc', { x: e.x, y: e.y, type, boss: true }); return; }
    if (type === 'root' && e.rootImm > 0) return;
    e[type] = Math.max(e[type], dur);
    if (type === 'root') e.rootImm = dur + 1.5;
    if (CC_INTERRUPT.includes(type) && (e.state === 'tele' || e.state === 'charge')) { e.state = 'stagger'; e.st = Math.max(dur, 0.6); this.emit('interrupt', { x: e.x, y: e.y }); }
    this.emit('cc', { x: e.x, y: e.y, type });
  }
  hurtEnemy(e, dmg, a, kb, kind) {
    if (e.type === 'DUMMY') { e.idle = 0; e.hp = Math.max(1, e.hp - dmg); e.flash = 0.1; e.kx += Math.cos(a) * kb * 0.05; e.ky += Math.sin(a) * kb * 0.05; this.stats.dmg += dmg; this.emit('hit', { x: e.x, y: e.y, dmg: Math.round(dmg), kind, a }); return; }
    dmg = frontGuard(this, e, dmg, a, kind);
    if (e.boss) {
      if (e.invuln > 0 || e.spawn > 0) return;
      if (e.stagger > 0) dmg *= 1.6;
      if (kind === 'skill') poiseDamage(this, e, dmg * 0.08);
      kb *= 0.15;
    }
    if (e.fMark > 0) dmg *= 1.15;
    if (e.vulnUntil > this.t) dmg *= 1 + (e.boss ? Math.min(ULTFX.bossVulnCap, e.vuln) : e.vuln);   // đánh dấu của tuyệt kỹ (Pentagram, Abyssal Tide, Firestorm); boss có trần
    if ((kind === 'skill' || kind === 'echo') && this.p.res && this.p.res.FIRE > 0) dmg *= 1 + RESONANCE.fire;
    dmg *= relicHit(this, e, kind);
    dmg *= critMul(this, e, dmg, kind);
    this.stats.dmg += dmg;
    if ((kind === 'skill' || kind === 'echo') && this.p.mods.lifesteal) heal(this, dmg * this.p.mods.lifesteal);
    // chốt pha: máu boss không tụt qua mốc pha kế tiếp; boss dừng ở mốc, diễn chuyển pha (bất tử 1,3 s) rồi mới nhận đòn tiếp. Sát thương thừa bị bỏ.
    if (e.boss && e.def && e.def.phases) { const ph = e.def.phases, nx = ph[e.phase + 1]; if (nx) { const floor = nx.at * e.max; if (e.hp - dmg < floor) dmg = Math.max(0, e.hp - floor); } }
    const lk = this._lastKind; this._lastKind = kind; try { super.hurtEnemy(e, dmg, a, kb, kind); } finally { this._lastKind = lk; }
  }
  hurtPlayer(dmg, a, opts = {}) {
    if (this._real) { const ph = this.p, R = this._real; if (!opts.real && dist(ph.x, ph.y, R.x, R.y) > 50) return; this.p = R; this._real = null; try { return this.hurtPlayer(dmg, a, opts); } finally { this.p = ph; this._real = R; } }
    const p = this.p; if (p.goldT > 0) { this.emit('goldBlock', { x: p.x, y: p.y }); return; }
    if (p.cls === 'AXIOM' && p.ax && p.ax.dodgeT > 0) mirrorDodge(this);   // đòn chạm ngay trong nhịp đầu của dash = né gương
    if (p.inv > 0 || this.over || p.leap || this.labGod) return;
    const dm = dmgTakenMul(this, dmg);
    let d = dmg * dm * (opts.boss ? 1 : this.dmgScale) * this.diff.dmg * (1 - p.mods.dr) * (p.giant > 0 ? (p.giantDr || 0.5) : 1) * (p.mods.takenMul || 1);
    if (this.infHp) { d = Math.min(d, Math.max(0, p.hp - 1)); p.hurtClock = 0; }
    if (p.shield > 0) { const ab = Math.min(p.shield, d); p.shield -= ab; d -= ab; this.emit('shieldHit', { x: p.x, y: p.y }); if (p.shieldBurn) for (const e of this.enemies) if (!e.dead && dist(e.x, e.y, p.x, p.y) < 90) e.burn = Math.max(e.burn, p.shieldBurn); if (d <= 0) { p.inv = 0.3; return; } }
    if (p.cls === 'AXIOM' && d >= p.hp && mirrorBreak(this, a)) return;   // Gương Vỡ: cái chết hoá ra là giả
    const vx0 = p.vx, vy0 = p.vy;
    super.hurtPlayer(d, a);
    if (p.steadyT > 0 || p.giant > 0) { p.vx = vx0; p.vy = vy0; }
  }

  // ---------- cập nhật chiêu, vùng, bẫy ----------
  updateSkills(dt) {
    const p = this.p;
    if (p.sdashT > 0) {
      const s = p.sdash; p.sdashT -= dt;
      p.x += s.dx * s.speed * dt; p.y += s.dy * s.speed * dt; p.vx = s.dx * 200; p.vy = s.dy * 200; this.world.collide(p, p.r);
      if (s.sk.trail) { s.trailT -= dt; if (s.trailT <= 0) { s.trailT = 0.035; this.addZone('fire', p.x, p.y, 30, 2.4 * p.mods.zoneLife); } }
      if (s.kind === 'charge') for (const e of this.enemies) if (!e.dead && !s.hit.has(e) && dist(p.x, p.y, e.x, e.y) < e.r + 26) { s.hit.add(e); this.applyHit(e, s.sk, Math.atan2(e.y - p.y, e.x - p.x), s.sk); }
      if (p.sdashT <= 0) {
        const sk = s.sk; p.sdash = null;
        if (sk.endWhirl) { this.hitCircle(p.x, p.y, sk.endWhirl.radius, sk.endWhirl, sk); this.emit('whirl', { x: p.x, y: p.y, r: sk.endWhirl.radius, el: 'WATER' }); }
        if (!(s.left > 0)) onDashEnd(this, sk);
        if (s.left > 0) {
          if (s.kind === 'charge') { const a = Math.atan2(s.ay - p.y, s.ax - p.x); this.startDash('charge', sk, dist(p.x, p.y, s.ax, s.ay) > 40 ? a : Math.atan2(s.dy, s.dx) + 0.8, s.ax, s.ay, s.left - 1); }
          else { const a = Math.atan2(s.ay - p.y, s.ax - p.x) + Math.PI + (this.rand() - 0.5) * 1.2; this.startDash('roll', sk, a, s.ax, s.ay, s.left - 1); this.rollShots(sk, s.ax, s.ay); }
        }
      }
    }
    if (p.leap) {
      const L = p.leap; L.t += dt; const k = Math.min(1, L.t / L.T);
      p.x = L.x0 + (L.x1 - L.x0) * k; p.y = L.y0 + (L.y1 - L.y0) * k; p.vx = p.vy = 0; p.z = Math.sin(k * Math.PI) * 60;
      if (k >= 1) {
        p.leap = null; p.z = 0; this.world.collide(p, p.r);
        this.hitCircle(p.x, p.y, L.sk.radius, L.sk, L.sk);
        this.emit('slam', { x: p.x, y: p.y, r: L.sk.radius, el: 'EARTH', big: true }); this.hitstop = Math.max(this.hitstop, 0.08);
        onDashEnd(this, L.sk);
      }
    }
    this.zoneDr = 0;
    updateUlts(this, dt);
    for (const q of this.pending) { q.t -= dt; if (q.tele && q.tele.follow) { q.tele.x = p.x; q.tele.y = p.y; } if (q.t <= 0) { q.done = true; q.fn(); } }
    this.pending = this.pending.filter(q => !q.done);
    for (const z of this.zones) {
      z.life -= dt; z.tickT -= dt; if (z.follow) { z.x = p.x; z.y = p.y; }
      if (z.fsk) onZone(this, z, dt, dist(z.x, z.y, p.x, p.y) < z.r);
      const tick = z.tickT <= 0; if (tick) z.tickT = z.tick || 0.3;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = dist(z.x, z.y, e.x, e.y); if (d > z.r + e.r) continue;
        const ang = Math.atan2(e.y - z.y, e.x - z.x);
        if (z.kind === 'swamp') { this.cc(e, 'slow', 0.4, 0.55); if (!z.hit.has(e)) { z.hit.add(e); this.cc(e, 'root', 1.2); e.wet = Math.max(e.wet, 2); } }
        else if (z.kind === 'steam') { this.cc(e, 'blind', 0.3); this.cc(e, 'slow', 0.4, 0.3); if (tick) this.applyHit(e, { dmg: 4 }, ang); }
        else if (z.kind === 'lava' && tick) this.applyHit(e, { dmg: 9 * p.mods.dmg, burn: 2 }, ang);
        else if (z.kind === 'fire' && tick) this.applyHit(e, { dmg: 6 * p.mods.dmg, burn: 2 }, ang);
        else if ((z.kind === 'spin' || z.kind === 'storm') && tick) this.applyHit(e, { dmg: z.eff.dmg, burn: z.eff.burn, wet: z.eff.wet, slow: z.eff.slow, blind: z.eff.blind, push: z.eff.push, stun: z.eff.stun }, ang, z.sk);
        else if (z.kind === 'well' && d > 10) { const m = e.boss ? 40 : ENEMIES[e.type].mass; e.kx -= Math.cos(ang) * z.sk.pull * dt * 8 / m; e.ky -= Math.sin(ang) * z.sk.pull * dt * 8 / m; }
      }
      if (z.kind === 'steam' || z.kind === 'storm') for (const f of this.foes) if (dist(z.x, z.y, f.x, f.y) < z.r) f.life = 0;
      if (z.kind === 'well' && z.life <= 0) { const S = z.sk.slam; this.hitCircle(z.x, z.y, S.radius, S, z.sk); this.emit('slam', { x: z.x, y: z.y, r: S.radius, el: 'EARTH', big: true }); this.hitstop = Math.max(this.hitstop, 0.07); }
    }
    this.zones = this.zones.filter(z => z.life > 0);
    for (const t of this.traps) {
      t.arm -= dt; t.life -= dt;
      if (t.arm <= 0 && this.enemies.some(e => !e.dead && dist(t.x, t.y, e.x, e.y) < t.r * 0.55 + e.r)) {
        const sk = t.sk; t.life = 0;
        this.hitCircle(t.x, t.y, t.r, sk, sk); onTrap(this, t);
        if (sk.leave) this.addZone(sk.leave.kind, t.x, t.y, sk.leave.radius, sk.leave.life);
        if (sk.shards) for (let i = 0; i < sk.shards.count; i++) this.proj('shard', t.x, t.y, i * TAU / sk.shards.count, sk.shards, sk);
        this.emit('trapPop', { x: t.x, y: t.y, r: t.r, el: t.el });
      }
    }
    this.traps = this.traps.filter(t => t.life > 0);
    for (const w of this.walls) w.life -= dt;
    this.walls = this.walls.filter(w => w.life > 0);
  }

  updateShots(dt) {
    const mine = this.shots.filter(s => SKILL_SHOTS.has(s.kind));
    this.shots = this.shots.filter(s => !SKILL_SHOTS.has(s.kind));
    relicShots(this, dt, () => super.updateShots(dt));
    for (const s of mine) {
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.sk && s.sk.forge) onShot(this, s);
      this._quietHit = s.quiet;
      if (s.kind === 'cyclone') {
        s.tickT -= dt; const tick = s.tickT <= 0; if (tick) s.tickT = s.o.tick;
        for (const e of this.enemies) {
          if (e.dead || dist(s.x, s.y, e.x, e.y) > s.r + e.r) continue;
          const pull = Math.atan2(s.y - e.y, s.x - e.x), m = e.boss ? 40 : ENEMIES[e.type].mass;
          e.kx += Math.cos(pull) * s.o.pull * dt * 10 / m; e.ky += Math.sin(pull) * s.o.pull * dt * 10 / m;
          if (tick) this.applyHit(e, { dmg: s.o.dmg, burn: s.o.burn, push: 10 }, pull, s.sk);
        }
        continue;
      }
      if (s.kind === 'crescent') {
        for (const e of this.enemies) if (!e.dead && !s.hit.has(e)) {
          const rx = e.x - s.x, ry = e.y - s.y, along = rx * Math.cos(s.a) + ry * Math.sin(s.a), side = -rx * Math.sin(s.a) + ry * Math.cos(s.a);
          if (Math.abs(along) < 22 + e.r && Math.abs(side) < s.width / 2) { s.hit.add(e); this.applyHit(e, s.o, s.a, s.sk); }
        }
        for (const f of this.foes) { const rx = f.x - s.x, ry = f.y - s.y; if (Math.abs(rx * Math.cos(s.a) + ry * Math.sin(s.a)) < 24 && Math.abs(-rx * Math.sin(s.a) + ry * Math.cos(s.a)) < s.width / 2) f.life = 0; }
        if (this.world.blocked(s.x, s.y, 6)) { this.world.damageObstacles(s.x, s.y, s.width / 2, s.o.dmg || 0); s.life = 0; }
        continue;
      }
      if (this.world.blocked(s.x, s.y, s.r)) { this.world.damageObstacles(s.x, s.y, s.r + 6, s.o.dmg || 0); this.endShot(s); continue; }
      for (const e of this.enemies) {
        if (e.dead || s.hit.has(e) || dist(s.x, s.y, e.x, e.y) > s.r + e.r) continue;
        s.hit.add(e); this.applyHit(e, s.o, s.a, s.sk);
        if (s.pierce-- <= 0) { this.endShot(s); break; }
      }
      if (s.life <= 0) this.endShot(s);
    }
    this._quietHit = false;
    this.shots.push(...mine.filter(s => s.life > 0 && !s.ended));
  }
  endShot(s) {
    if (s.ended) return; s.ended = true; s.life = 0;
    const o = s.o;
    if (s.sk && s.sk.forge) onShotEnd(this, s);
    if (o.explode) { this.hitCircle(s.x, s.y, o.explode.radius, o.explode, s.sk); this.emit('boom', { x: s.x, y: s.y, r: o.explode.radius, el: s.el }); this.hitstop = Math.max(this.hitstop, 0.035); }
    if (s.kind === 'sbolt' && s.sk.leave) this.addZone(s.sk.leave.kind, s.x, s.y, s.sk.leave.radius, s.sk.leave.life);
    if (o.split) for (let i = 0; i < o.split.count; i++) this.proj('shard', s.x, s.y, i * TAU / o.split.count, o.split, s.sk);
  }

  updateFoeShots(dt) {
    const p = this.p;
    for (const f of this.foes) {
      if (f.home || f.ret) steerFoe(this, f, dt);
      f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.life <= 0) continue;
      if (this.world.blocked(f.x, f.y, f.r)) { f.life = 0; continue; }
      for (const w of this.walls) if (segDist(f.x, f.y, w).d < 14) { f.life = 0; this.emit('block', { x: f.x, y: f.y }); }
      if (this.forge && dist(f.x, f.y, this.forge.x, this.forge.y) < FORGE_R + f.r) { f.life = 0; f.landed = true; this.emit('block', { x: f.x, y: f.y }); continue; }
      for (const z of this.zones) if (z.kind === 'barrier' && dist(f.x, f.y, z.follow ? this.ownerOf(z).x : z.x, z.follow ? this.ownerOf(z).y : z.y) < z.r + f.r) { f.life = 0; this.emit('block', { x: f.x, y: f.y }); }
      if (f.life <= 0) continue;
      if (f.trail && this.surface && this.rand() < 0.5) this.surface.apply(f.x, f.y, 22, f.trail, { rand: this.rand, life: 6 });
      let gone = false;
      for (const q of this.targets()) { if (gone) break; this.as(q, () => {
        if (this.parryShot(f)) { gone = true; return; }   // nhát chém đỡ trước khi đạn chạm người
        if (q.inv <= 0 && !q.leap && !(f.pierce && f.hitP) && dist(f.x, f.y, q.x, q.y) < f.r + q.r) { f.hitP = true; this.hurtPlayer(f.dmg, Math.atan2(f.vy, f.vx), { boss: f.boss }); if (!f.pierce) { f.life = 0; gone = true; } }
      }); }
      if (gone) continue;
    }
    for (const f of this.foes) if (f.life <= 0 && !f.landed) { f.landed = true; foeLand(this, f); }
    this.foes = this.foes.filter(f => f.life > 0);
  }

  // ---------- kẻ địch ----------
  spawnAt(type, x, y) {
    // máu: +13% mỗi stage; quái thường của map sau có máu gốc cao hơn (áp dụng cả trong phòng tập)
    const d = ENEMIES[type], inBoss = !!(this.boss && !this.boss.dead), mapMul = d.elite || d.illusion || d.mini || inBoss || type === 'DUMMY' ? 1 : (MAP_HP[this.theme] || 1), s = type === 'DUMMY' ? 1 : (this.training ? 1 : (1 + (inBoss ? 0.09 : 0.13) * Math.max(0, this.stage - 1)) * this.diff.hp) * mapMul;   // lính boss gọi ra giữ thang máu cũ
    const cm = type === 'DUMMY' ? 1 : 1 + COOP.hp * (this.coopN - 1);
    const e = { id: this.nextId++, type, x, y, r: d.r, hp: d.hp * s * cm, max: d.hp * s * cm, kx: 0, ky: 0, flash: 0, state: 'move', st: 0.8 + this.rand() * 1.1, atkCd: 0.4 + this.rand() * 0.7, dead: false, ta: 0, spawn: 0.4, flank: (this.rand() < 0.5 ? -1 : 1) * (0.5 + this.rand() * 0.8),
      burn: 0, burnTick: 0, wet: 0, slow: 0, slowAmt: 0, root: 0, freeze: 0, stun: 0, blind: 0, rootImm: 0, idle: 0 };
    this.enemies.push(e); if (d.elite) this.emit('eliteSpawn', { x, y, name: d.name }); return e;
  }
  updateEnemies(dt) {
    if (this.labFreezeAI) { for (const e of this.enemies) { e.flash = Math.max(0, e.flash - dt); e.spawn = 0; e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= 0.85; e.ky *= 0.85; } return; }
    for (const e of this.enemies) {
      e.burn = Math.max(0, e.burn - dt); e.wet = Math.max(0, e.wet - dt); e.slow = Math.max(0, e.slow - dt); if (e.slow <= 0) e.slowAmt = 0;
      if (e.frozeHit > 0) e.frozeHit -= dt;
      e.root = Math.max(0, e.root - dt); e.freeze = Math.max(0, e.freeze - dt); e.stun = Math.max(0, e.stun - dt); e.blind = Math.max(0, e.blind - dt); e.rootImm = Math.max(0, e.rootImm - dt);
      if (e.burn > 0) { e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = 0.5; this.hurtEnemy(e, (e.boss ? BURN.boss : BURN.mob) * this.p.mods.dmg * (this.p.mods.elDmg.FIRE || 1), 0, 0, 'burn'); } }
      if (!e.boss) for (const w of this.walls) { const s = segDist(e.x, e.y, w), r = e.r + 8; if (s.d < r) { e.x += s.nx * (r - s.d); e.y += s.ny * (r - s.d); } }
    }
    const dummies = [], bosses = [], minions = [];
    const confused = [];   // bị Nhiễu Thực Tại: không chạy AI thường
    for (const e of this.enemies) (e.type === 'DUMMY' ? dummies : e.boss ? bosses : e.confuse > 0 ? confused : minions).push(e);
    for (const e of dummies) { e.flash = Math.max(0, e.flash - dt); e.spawn = Math.max(0, e.spawn - dt); e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.exp(-14 * dt); e.ky *= Math.exp(-14 * dt); e.idle += dt; if (e.hp < e.max && e.idle > 3) e.hp = e.max; }
    const n0 = this.enemies.length; for (const b of bosses) this.asTarget(b, () => withPhantom(this, this.hidePt, () => bossUpdate(this, b, dt)));
    minions.push(...this.enemies.slice(n0)); // quái do boss gọi ra trong lượt này (lính nấm, phân thân) — trước đây bị mất
    const frozen = new Map();
    for (const e of minions) {
      const hard = e.freeze > 0 || e.stun > 0, rooted = e.root > 0, blind = e.blind > 0;
      if (hard || rooted || blind || e.slowAmt > 0) frozen.set(e, { x: e.x, y: e.y, hard, rooted, blind, st: e.st, state: e.state });
      if (hard || blind) e.atkCd = Math.max(e.atkCd, 0.3);
    }
    this.enemies = minions;
    const foesBefore = this.foes.length;
    this.byTarget(dt, () => withPhantom(this, this.hidePt, () => super.updateEnemies(dt)));
    for (const [e, s] of frozen) {
      if (e.dead) continue;
      const kx = e.kx * dt, ky = e.ky * dt;
      if (s.hard) { e.x = s.x + kx; e.y = s.y + ky; e.st = s.st; e.state = s.state === 'charge' ? 'stagger' : s.state; }
      else if (s.rooted) { e.x = s.x + kx; e.y = s.y + ky; }
      else if (e.slowAmt > 0) { e.x = s.x + (e.x - s.x) * (1 - e.slowAmt); e.y = s.y + (e.y - s.y) * (1 - e.slowAmt); }
      if (s.blind && e.state === 'tele') { e.state = 'move'; e.st = 0.5; }
    }
    for (let i = foesBefore; i < this.foes.length; i++) { const f = this.foes[i]; for (const [e, s] of frozen) if ((s.hard || s.blind) && dist(f.x, f.y, e.x, e.y) < 30) f.life = 0; }
    this.byTarget(dt, () => withPhantom(this, this.hidePt, () => enemiesExtra(this, dt)));
    if (this.forge) { const F = this.forge; for (const e of this.enemies) { if (e.dead || e.type === 'DUMMY') continue; const d = dist(e.x, e.y, F.x, F.y), m = FORGE_R + e.r + 6; if (d < m && d > 0.1) { e.x = F.x + (e.x - F.x) / d * m; e.y = F.y + (e.y - F.y) / d * m; if (e.state === 'charge') { e.state = 'stagger'; e.st = 0.5; } } } }
    if (this.brutal) { const L = this.foes.length; for (let i = foesBefore; i < L; i++) { const f = this.foes[i]; if (!f || f.boss || f.twin || !(f.vx || f.vy)) continue; f.twin = true; const s = (i % 2 ? 1 : -1) * BRUTAL.twinSpread, c = Math.cos(s), n = Math.sin(s); this.foes.push({ ...f, vx: f.vx * c - f.vy * n, vy: f.vx * n + f.vy * c, hit: f.hit ? new Set() : f.hit }); } }
    for (const e of this.enemies) if (e.fMark > 0) e.fMark -= dt;
    this.enemies.push(...confused.filter(c => !c.dead), ...dummies.filter(d => !d.dead), ...bosses.filter(b => !b.dead));
    if (confused.length) { confusedStep(this, dt, e => ENEMIES[e.type] || {}); this.enemies = this.enemies.filter(e => !e.dead); }
  }

  // ---------- võ đài boss ----------
  clampArena(e, r) { const A = this.arena; if (!A) return; const d = dist(A.x, A.y, e.x, e.y), m = A.r - r; if (d > m) { e.x = A.x + (e.x - A.x) / d * m; e.y = A.y + (e.y - A.y) / d * m; } }
  outOfArena(e, r) { const A = this.arena; return A ? dist(A.x, A.y, e.x, e.y) > A.r - r : false; }

  // ---------- stage ----------
  startStage(n) {
    const p = this.p;
    this.stage = n; this.state = 'fight'; this.stageT = 0; this.forgeHold = false;
    if (this.coop) this.players.forEach((q, i) => { if (i && q !== p) { q.x = p.x + 56 * i; q.y = p.y + 20; q.vx = q.vy = 0; this.world.collide(q, q.r); } }); this.spawnQ = []; this.sigils = []; this.burstT = 0.8;
    this.clearT = 0; this.waveN = 0; this.waveOf = 0; this.waveRest = 0; this.loot = null; this.portal = null; this.travel = 0; this.deathSlow = 0; this.vacuum = false;
    setTheme(this, this.labTheme || themeForStage(n));
    this.inQ = []; p.queued = null;
    this.dmgScale = 1 + 0.055 * (n - 1);
    const bi = BOSS_STAGES[n];
    removeForge(this);
    if (bi !== undefined) {
      this.enemies = this.enemies.filter(e => e.type === 'DUMMY');
      this.hazards = []; this.foes = []; this.blizzard = null; p.bchill = 0;
      const gate = n < LAST_STAGE && !this.lab ? { x: p.x, y: p.y - ARENA_R + 70, theme: themeForStage(n + 1), state: 'sealed', t: 0 } : null;   // cổng sang biome kế: nằm giữa vách trên của đấu trường
      buildArena(this, BOSS_DEFS[bi].id, gate); this.portal = gate; p.energy = p.energyMax; // vào trận boss: nạp đầy năng lượng một lần
      let bx = p.x + 380, by = p.y;
      for (let k = 0; k < 24; k++) { const a = this.rand() * TAU; bx = p.x + Math.cos(a) * 380; by = p.y + Math.sin(a) * 380; if (!this.world.blocked(bx, by, BOSS_DEFS[bi].r)) break; }
      this.bossDropNext = 0.875; this.boss = makeBoss(this, bi, bx, by); this.boss.hp = this.boss.max = this.boss.max * this.diff.hp * (1 + COOP.boss * (this.coopN - 1)); this.enemies.push(this.boss);
      this.emit('bossIntro', { name: BOSS_DEFS[bi].name, epithet: BOSS_DEFS[bi].epithet, idx: bi });
    } else {
      if (this.arena) teardownArena(this, true); this.boss = null;
      const total = Math.round((5 + n * 1.2) * (1 + COOP.count * (this.coopN - 1)) * (this.brutal ? BRUTAL.count : 1)), list = [];   // ít quái hơn nhưng trâu hơn
      for (let i = 0; i < total; i++) {
        const r = this.rand(), wc = n >= 2 ? 0.25 + n * 0.015 : 0, ws = n >= 3 ? 0.22 + n * 0.012 : 0;
        const ty = rosterType(this, r < ws ? 'SHOOTER' : r < ws + wc ? 'CHARGER' : 'GRUNT'); list.push(ty);
        if (ENEMIES[ty].pack && i < total - 1) { list.push(ty); i++; } // bầy (Cinder Imp) ra theo cặp
      }
      this.sinceElite = (this.sinceElite || 0) + 1;
      if (n >= 2 && (this.rand() < (this.brutal ? BRUTAL.elite : 0.35) || this.sinceElite >= (this.brutal ? 2 : 3))) { list.splice(Math.floor(list.length * 0.55), 0, eliteFor(this.theme)); this.sinceElite = 0; }
      this.spawnQ = list; this.stageTotal = total; this.waveOf = Math.ceil(list.length / Math.ceil(total / 3));
      if (!this.training && rollForge(this, n, false)) { placeForge(this, FORGE_R); this.emit('forgeNear', { name: smithOf(this.theme).name, theme: this.theme }); }
    }
    this.emit('stageStart', { n, boss: bi !== undefined });
  }
  director(dt) {
    if (this.training) return this.trainingDirector(dt);
    if (this.state !== 'fight') return;
    this.stageT += dt;
    if (this.boss) { if (this.boss.dead) this.bossVictory(dt); return; }
    this.tickSigils(dt);
    if (this.clearT > 0) { this.clearT -= dt; if (this.clearT <= 0) { this.clearT = 0; this.forgeHold = false; this.clearStage(); } return; }   // nghỉ sau stage: đồ tự bay về, rồi màn tối dần
    const alive = this.enemies.filter(e => e.type !== 'DUMMY').length + this.sigils.length;
    this.burstT -= dt;
    if (this.spawnQ.length) {
      if (this.waveRest > 0) { this.waveRest -= dt; if (this.waveRest <= 0) this.nextWave(); }
      else if (alive === 0 && this.waveN > 0) { this.waveRest = WAVE_REST; this.emit('waveClear', { n: this.waveN, of: this.waveOf }); }   // dọn sạch wave: thở một nhịp
      else if (this.burstT <= 0 || this.waveN === 0) this.nextWave();   // wave đầu ra ngay khi vào stage
      return;
    }
    if (alive === 0 && this.forge && this.holdForge && !this.forgeHold) { this.forgeHold = true; this.foes = []; this.emit('forgeHold', { n: this.stage, name: smithOf(this.forge.theme).name }); return; }   // còn thợ rèn: chờ người chơi mua xong rồi tự bấm qua
    if (alive === 0 && this.forgeHold) return;
    if (alive === 0) { this.clearT = STAGE_REST; this.foes = []; this.emit('stageCleared', { n: this.stage }); }
  }
  nextWave() {
    this.waveRest = 0;
    const n = Math.min(this.spawnQ.length, Math.ceil(this.stageTotal / 3));
    this.spawnWave(this.spawnQ.splice(0, n)); this.waveN++;
    this.burstT = 9;
    this.emit('burst', { n: this.waveN, of: this.waveOf });
  }
  // boss gục: hit-stop + chậm, đồ bung ra sàn, đi nhặt thoải mái; cổng ở vách trên mở ra, bước vào để sang biome kế
  bossVictory(dt) {
    const b = this.boss;
    if (!this.loot) {
      this.loot = { t: 0, x: b.x, y: b.y }; this.hazards = []; this.foes = []; this.enemies = this.enemies.filter(e => e.type === 'DUMMY'); this.sigils = []; this.pending = [];
      this.stats.bossKills++; this.blizzard = null; this.p.bchill = 0; this.hitstop = 0.2; this.deathSlow = 1.5;
      for (const it of this.pickups) if (dist(it.x, it.y, b.x, b.y) < 60) this.arcLoot(it);   // vàng / máu / chỉ số boss rơi nảy ra quanh xác
      this.emit('bossDown', { x: b.x, y: b.y, name: b.def.name, gate: this.portal ? this.portal.theme : null });
      return;
    }
    const L = this.loot, G = this.portal, p = this.p; L.t += dt;
    if (this.travel > 0) { this.travel -= dt; if (this.travel <= 0) { this.travel = 0; this.loot = null; this.boss = null; this.portal = null; teardownArena(this, false); this.clearStage(); } return; }
    if (!G) { if (L.t > 2.5) this.vacuum = true; if ((L.t > 3.5 && !this.pickups.length) || L.t > 12) { this.travel = GATE_TRAVEL; this.emit('gateEnter', { final: true }); } return; }   // boss cuối: nhặt xong là thắng
    G.t += dt;
    if (G.state === 'sealed' && L.t > 1.6) { G.state = 'opening'; G.t = 0; this.emit('gateOpen', { x: G.x, y: G.y, theme: G.theme }); }
    else if (G.state === 'opening' && G.t > 1.8) G.state = 'open';
    if (G.state !== 'sealed' && G.t > 0.9 && this.targets().some(q => dist(q.x, q.y, G.x, G.y) < 54)) { this.travel = GATE_TRAVEL; this.emit('gateEnter', { theme: G.theme }); }
  }
  // một đợt quái từ 3–4 hướng: cận chiến tuyến trước, tầm xa đứng sau; mỗi con có ấn báo 0.8s trước khi hiện
  spawnWave(types, now = false) {
    const p = this.p, F = types.length >= 7 ? 4 : types.length >= 3 ? 3 : types.length, base = this.rand() * TAU;
    const flanks = Array.from({ length: F }, (_, i) => ({ a: base + i * TAU / F + (this.rand() - 0.5) * 0.7, front: [], back: [] }));
    let fi = 0, bi = 1, sq = null;
    for (const t of types) {
      const d = ENEMIES[t];
      if (d.squad && sq && sq.front.filter(q => q === t).length < 3) { sq.front.push(t); continue; } // lính kích đi theo tổ
      const G = isRanged(d) ? flanks[bi++ % F] : flanks[fi++ % F]; (isRanged(d) ? G.back : G.front).push(t); sq = d.squad ? G : null;
    }
    this.squadN = (this.squadN || 0) + 1;
    flanks.forEach((G, gi) => {
      // vòng elip theo khung màn hình (rộng hơn cao) để ấn luôn nằm trong tầm nhìn: tuyến trước ~0.6, tuyến sau ~0.85 nửa khung
      const put = (list, RX, RY) => { const sqs = list.filter(t => ENEMIES[t].squad).length; let si = 0;
        list.forEach((t, j) => {
          const lat = (j - (list.length - 1) / 2) * 44, sqo = ENEMIES[t].squad ? (si++ - (sqs - 1) / 2) * 80 : 0;
          for (let k = 0; k < 40; k++) { // 16 lần quanh hướng của nhóm, sau đó bất kỳ hướng nào còn trống (vướng cây / sân lò rèn)
            const m = 1 + this.rand() * 0.12 + (k > 7 && k < 16 ? (k - 7) * 0.06 : 0), a = k >= 16 ? this.rand() * TAU : G.a + (k ? (this.rand() - 0.5) * (k > 7 ? 1.6 : 0.5) : 0), ca = Math.cos(a), sa = Math.sin(a), x = p.x + ca * RX * m - sa * lat, y = p.y + sa * RY * m + ca * lat;
            if (this.world.blocked(x, y, 24) || (this.forge && dist(x, y, this.forge.x, this.forge.y) < FORGE_NOSPAWN && k < 39)) continue;
            const s = { x, y, type: t, t: 0.8, T: 0.8, sq: ENEMIES[t].squad ? this.squadN * 10 + gi : 0, sqo };
            if (now) this.fromSigil(s); else this.sigils.push(s);
            break;
          }
        }); };
      put(G.front, 440, 250); put(G.back, 600, 320);
    });
    if (!now) this.emit('spawnSigil', { n: types.length, flanks: F });
  }
  fromSigil(s) { const e = this.spawnAt(s.type, s.x, s.y); e.spawn = 0.25; if (s.sq) { e.sq = s.sq; e.sqo = s.sqo; } this.emit('spawnDust', { x: s.x, y: s.y }); return e; }
  tickSigils(dt) { if (!this.sigils || !this.sigils.length) return; for (const s of this.sigils) { s.t -= dt; if (s.t <= 0) this.fromSigil(s); } this.sigils = this.sigils.filter(s => s.t > 0); }
  trainingDirector(dt) {
    this.tickSigils(dt);
    if (this.lab && !this.labPacks) return;
    const alive = this.enemies.filter(e => e.type !== 'DUMMY').length + this.sigils.length;
    if (alive > 0) return;
    this.packT -= dt; if (this.packT > 0) return;
    if (this.packs > 0) this.p.hp = Math.min(this.p.max, this.p.hp + this.p.max * 0.35);
    const n = Math.min(9, 4 + this.packs), list = [];
    for (let i = 0; i < n; i++) { const r = this.rand(); list.push(rosterType(this, this.packs === 0 ? 'GRUNT' : r < 0.5 ? 'GRUNT' : r < 0.78 ? 'CHARGER' : 'SHOOTER')); }
    this.spawnWave(list);
    this.packs++; this.packT = 4;
  }
  clearStage() {
    const p = this.p, wasBoss = BOSS_STAGES[this.stage] !== undefined;
    for (const q of this.players) { if (q.down) { q.down = false; q.hp = 0; } q.hp = Math.min(q.max, Math.max(q.hp, q.max * 0.5 * (this.coop ? 1 : 0)) + q.max * (wasBoss ? 1 : 0.3)); }
    for (const it of this.pickups) this.as(this.nearestPlayer(it.x, it.y), () => this.collect(it)); this.pickups = []; // dọn stage: tự nhặt hết đồ còn rơi
    this.foes = []; this.pending = []; this.hazards = []; this.zones = []; this.traps = []; this.sigils = [];
    for (const o of this.world.temp) if (o.foeIce) o.dead = true; this.world.temp = this.world.temp.filter(o => !o.dead);
    removeForge(this);
    if (!this.training) for (const q of this.players) this.as(q, () => this.addGold(stageGold(this.stage), 'stage'));
    this.emit('stageClear', { n: this.stage, boss: wasBoss });
    if (this.stage >= LAST_STAGE) { this.won = true; this.over = true; this.emit('victory', {}); return; }
    this.state = 'reward';
    for (const q of this.players) this.as(q, () => { this.rewards = [{ type: 'minor', choices: rollMinor(this) }]; if (MAJOR_STAGES.includes(this.stage + 1)) this.rewards.push({ type: 'major', choices: rollMajor(this) }); });
  }
  // ================= co-op =================
  // chạy fn với g.p = q (người đang hành động); một người chơi thì gọi thẳng
  as(q, fn) { if (q === this.p || !q) return fn(); const o = this.p; this.p = q; try { return fn(); } finally { this.p = o; } }
  targets() { return this.coop ? this.players.filter(q => !q.down) : [this.p]; }
  forTargets(fn) { for (const q of this.targets()) this.as(q, () => fn(q)); }
  nearestPlayer(x, y) { let b = this.players[0], bd = 1e18; for (const q of this.targets()) { const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; b = q; } } return b; }
  ownerOf(x) { return (x && x.owner) || this.players[0]; }
  tagOwned() { if (!this.coop) return; for (const n of OWNED) for (const x of this[n] || []) if (x && !x.owner) x.owner = this.p; }
  // tách các mảng vật thể theo chủ, chạy fn cho phần của q, rồi ghép lại
  ownRun(q, names, fn) {
    const keep = {}; for (const n of names) { const all = this[n] || []; keep[n] = all.filter(x => this.ownerOf(x) !== q); this[n] = all.filter(x => this.ownerOf(x) === q); }
    try { this.as(q, () => { fn(); this.tagOwned(); }); } finally { for (const n of names) this[n] = keep[n].concat(this[n] || []); }
  }
  // mục tiêu của một con địch: người gần nhất, giữ mục tiêu cũ trừ khi người kia gần hơn 150px
  pickTarget(e) {
    const alive = this.targets(); if (!alive.length) return this.players[0];
    let t = e.tgt && !e.tgt.down ? e.tgt : null, best = null, bd = 1e18;
    for (const q of alive) { const d = Math.hypot(q.x - e.x, q.y - e.y); if (d < bd) { bd = d; best = q; } }
    if (!t || Math.hypot(t.x - e.x, t.y - e.y) > bd + 150) t = best;
    return (e.tgt = t);
  }
  asTarget(e, fn) { if (!this.coop) return fn(); return this.as(this.pickTarget(e), fn); }
  // chạy fn cho từng nhóm địch cùng mục tiêu (g.enemies = nhóm đó)
  byTarget(dt, fn) {
    if (!this.coop) return fn();
    const groups = new Map(); for (const e of this.enemies) { const t = this.pickTarget(e); if (!groups.has(t)) groups.set(t, []); groups.get(t).push(e); }
    const outList = [];
    for (const q of this.players) { const grp = groups.get(q); if (!grp) continue; this.enemies = grp; this.as(q, fn); outList.push(...this.enemies); }
    this.enemies = outList;
  }
  // một người gục: co-op thì nằm chờ đồng đội hồi sinh; tất cả gục thì hết lượt
  downed(q) {
    if (!this.coop) { this.over = true; this.emit('dead', {}); return; }
    q.down = true; q.hp = 0; q.reviveT = 0; q.vx = q.vy = 0; q.charge = 0; q.dashT = 0; q.sdash = null; q.sdashT = 0; q.leap = null;
    this.emit('down', { x: q.x, y: q.y, who: this.players.indexOf(q) });
    if (this.players.every(o => o.down)) { this.over = true; this.emit('dead', {}); }
  }
  // dựng ván co-op: cfgs = [{ cls, element, skin, skinFx }, ...] theo thứ tự cố định (chủ phòng trước)
  static coop(seed, cfgs, opts = {}) {
    const N = cfgs.length, base = { ...opts, coopN: N };
    const g = new Game(seed, cfgs[0].cls, { ...base, element: cfgs[0].element, skin: cfgs[0].skin, skinFx: cfgs[0].skinFx });
    g.coop = N > 1;
    for (let i = 1; i < N; i++) {
      const t = new Game(seed, cfgs[i].cls, { ...base, element: cfgs[i].element, skin: cfgs[i].skin, skinFx: cfgs[i].skinFx }), q = t.p;
      q.x = g.p.x + 56 * i; q.y = g.p.y + 20; g.players.push(q);
    }
    g.players.forEach((q, i) => { q.pi = i; });
    return g;
  }
  // một khung lockstep: its[i] là input của người chơi i (cả hai máy chạy y hệt nhau)
  stepCoop(dt, its) {
    const P = this.players, home = this.p; this.p = P[0];
    try { this._stepCoop(dt, its, P); } finally { this.p = home; }
  }
  _stepCoop(dt, its, P) {
    P.forEach((q, i) => this.as(q, () => { const it = its[i] || {}; if (it.slots) for (const s of it.slots) this.inQ.push(typeof s === 'object' ? s.slot : s); if (it.dash) this.dashQ = true; if (it.space) this.spaceQ = true; if (it.ax !== undefined) this.aim = [it.ax, it.ay]; }));
    if (this.over || this.state !== 'fight') return;
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    if (this.deathSlow > 0) { this.deathSlow -= dt; dt *= 0.3; }
    const its2 = P.map((q, i) => this.as(q, () => {
      let it2 = { ...(its[i] || {}), dash: this.dashQ, space: !!this.spaceQ }; this.dashQ = false; this.spaceQ = false; frozenInput(this, it2);
      if (this.travel > 0) { const G = this.portal; it2 = G ? { mx: G.x - q.x, my: G.y - 30 - q.y, ax: G.x, ay: G.y - 60 } : {}; this.inQ = []; q.queued = null; }
      if (q.goldT > 0 || q.down) { it2 = { ax: (its[i] || {}).ax, ay: (its[i] || {}).ay }; this.inQ = []; q.queued = null; }
      return it2;
    }));
    this.t += dt; if (this.forge) this.forge.t += dt;
    P.forEach((q, i) => this.as(q, () => {
      const was = this.inForge; this.inForge = inForge(this, q.x, q.y); if (this.inForge && !was) enterForge(this);
      if (q.down) return;
      tickDefense(this, dt); this.tickPlayer(dt, its2[i]); this.updatePlayer(dt, its2[i]); this.tagOwned();
      this.ownRun(q, ['relicFx'], () => tickRelics(this, dt));
    }));
    const slow = P.some(q => !q.down && q.slowmoT > 0) ? 0.35 : P.some(q => !q.down && q.slowmo) ? 0.55 : 1, wdt = dt * slow; this.timeScale = slow;
    for (const q of P) this.ownRun(q, ['shots', 'relicFx'], () => this.updateShots(dt));
    this.updateEnemies(wdt); this.tagOwned();
    this.updateFoeShots(wdt);
    const lead = this.targets()[0] || P[0];
    this.as(lead, () => this.director(dt)); this.tagOwned();
    if (this.over) return;
    for (const q of P) this.ownRun(q, ['zones', 'pending', 'traps', 'walls', 'ults'], () => this.updateSkills(dt));
    this.updatePickups(dt);
    this.as(lead, () => envStep(this, dt)); this.tagOwned();
    this.as(this.boss && !this.boss.dead && this.boss.tgt && !this.boss.tgt.down ? this.boss.tgt : lead, () => updateHazards(this, wdt)); this.tagOwned();
    if (this.arena) { for (const q of P) this.clampArena(q, q.r); if (this.boss && !this.boss.dead && !this.boss.leap) this.clampArena(this.boss, this.boss.r); }
    // hồi sinh: đứng cạnh đồng đội đang gục
    for (const q of P) {
      if (!q.down) continue;
      const helper = this.targets().find(o => dist(o.x, o.y, q.x, q.y) < COOP.reviveR);
      q.reviveT = helper ? (q.reviveT || 0) + dt : Math.max(0, (q.reviveT || 0) - dt * 0.5);
      if (q.reviveT >= COOP.revive) { q.down = false; q.reviveT = 0; q.hp = q.max * COOP.reviveHp; q.inv = 1.5; this.emit('revived', { x: q.x, y: q.y, who: q.pi }); }
    }
  }
  // người chơi bấm Next stage khi đang chờ ở stage có thợ rèn
  proceed() { if (!this.forgeHold || this.clearT > 0) return false; this.forgeHold = false; this.clearT = STAGE_REST; this.emit('stageCleared', { n: this.stage }); return true; }
  rerollCost() { return this.rerolls > 0 ? 0 : [5, 8, 12, 16, 20][Math.min(4, this.paidRerolls)]; }
  // tung lại 3 thẻ của màn thưởng hiện tại (main lo trừ lượt miễn phí / gem)
  rerollReward(paid) { const r = this.rewards[0]; if (!r) return false; if (paid) this.paidRerolls++; else if (this.rerolls > 0) this.rerolls--; else return false; r.choices = r.type === 'minor' ? rollMinor(this) : rollMajor(this); this.emit('reroll', {}); return true; }
  // hồi sinh (1 lần mỗi lượt): nửa máu, 2.5 giây bất tử, dọn đòn đang bay
  revive() { if (this.revived) return false; const p = this.p; this.revived = true; this.over = false; p.hp = p.max * 0.5; p.inv = 2.5; p.frozen = 0; p.rooted = 0; this.hazards = []; this.foes = []; this.emit('revive', { x: p.x, y: p.y }); return true; }
  finishReward() { this.rewards.shift(); if (!this.rewards.length && this.players.every(q => !(q._rewards || []).length)) { const n = this.stage + 1; if (this.coop) return this.as(this.players[0], () => this.startStage(n)); if (this.onStageSave) this.onStageSave(n); this.startStage(n); } }   // onStageSave: main chụp bản lưu lượt chơi ngay trước khi vào stage mới
  pickMinor(id) {
    if (id && id.startsWith('core:')) { const el = id.slice(5); this.addCore({ type: 'el', el }); this.upgradeLog.push('Core ' + el); this.finishReward(); return; }
    const u = MINOR_BY_ID[id];
    if (u) { this.upgrades[id] = (this.upgrades[id] || 0) + 1; u.apply(this.p.mods, this); this.upgradeLog.push(u.name); this.refreshStats(false); }
    this.finishReward();
  }
  pickMajor(card) {
    const p = this.p;
    if (card.type === 'awaken') { this.addCore({ type: 'el', el: card.el }); this.upgradeLog.push('Core ' + card.el); }
    else if (card.type === 'ascend') { p.mods.dmg *= 1.2; p.mods.cd *= 0.9; this.upgradeLog.push('Ascension'); }
    this.refreshStats(false);
    this.finishReward();
  }
}
