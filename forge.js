// Vàng trong trận + nhà thợ rèn: bán lõi/Shard, mua chỉ số, bình thuốc, rèn chiêu.
// Logic thuần (chạy được trong test, không đụng DOM). Giá và lượng nằm hết ở đây.
import { CLASSES, dist } from './sim.js';
import { coreDef } from './kits.js';
import { hasForgeUp } from './forgeups.js';
import { rollRelics } from './relics.js';
import { healMul } from './relics.js';

// ---------- nguồn vàng ----------
// [xác suất rơi, ít nhất, nhiều nhất] — quái thường không phải con nào cũng rơi vàng; boss rơi mưa vàng
export const GOLD = { GRUNT: [0.75, 2, 5], CHARGER: [0.85, 3, 8], SHOOTER: [0.85, 3, 8], ELITE: [1, 30, 45], crate: [0.3, 2, 4], rock: [0.3, 2, 4], pillar: [0.3, 2, 4], crystal: [0.3, 2, 4], treasure: [1, 10, 16], supply: [0.3, 2, 4] };
export const BOSS_GOLD = n => 300 + 60 * n;          // n = số boss đã hạ trước đó trong lượt
export const goldRoll = (g, src) => { const G = GOLD[src]; if (!G || g.rand() >= G[0]) return 0; return G[1] + Math.floor(g.rand() * (G[2] - G[1] + 1)); };
export const stageGold = n => 25 + 4 * n;
// lượt ghé thợ rèn: mỗi chỉ số chỉ mua được 1 lần trong một lần vào nhà
export function enterForge(g) { g.visitBuys = {}; g.forgeVisits = (g.forgeVisits || 0) + 1; g.visitRelics = 0; g.relicRerolls = 0; rollRelics(g); }

// ---------- thợ rèn theo map ----------
export const SMITHS = {
  forest:  { name: 'Bramble', title: 'the Goblin Smith', hello: 'Mind the moss, traveller. Bring me cores and I\'ll hammer them sharper.', color: '#7ad06a' },
  dungeon: { name: 'Grit', title: 'the Spore-Kin Dwarf', hello: 'The rune-forge hums tonight. Spores won\'t follow you into my alcove.', color: '#c8a0ff' },
  frost:   { name: 'Hroth', title: 'the Frost-Dwarf', hello: 'Hrrm. Warm your hands by the blue fire. Cold steel holds the sharpest edge.', color: '#9ad8ff' },
  volcano: { name: 'Kilna', title: 'the Cinder-Forged', hello: 'The lava runs right under my anvil. Everything here is still glowing.', color: '#ff8a3a' },
  palace:  { name: 'Aurex', title: 'the Seraphic Automaton', hello: 'GREETINGS, CHAMPION. THE ROYAL ARMORY IS AT YOUR SERVICE.', color: '#ffd34a' }
};
export const smithOf = theme => SMITHS[theme] || SMITHS.forest;
export const FORGE_R = 120;        // bán kính vùng an toàn trong nhà
export const FORGE_CALM = 320;     // quái trong bán kính này mất dấu bạn khi bạn ở trong nhà
export const FORGE_NOSPAWN = 450;  // không sinh quái quanh nhà

// stage nào có nhà: map 1 (stage 1–5) chỉ có ở stage 4; từ map 2 trở đi ngẫu nhiên 40%,
// không quá 3 stage thường liền nhau thiếu nhà
export const MAP1_LAST = 5;
export function rollForge(g, n, isBoss) {
  if (isBoss) return false;
  if (n <= MAP1_LAST) { if (n === 4) { g.forgeDry = 0; return true; } return false; }
  const yes = (g.forgeDry || 0) >= 3 || g.rand() < 0.4;
  g.forgeDry = yes ? 0 : (g.forgeDry || 0) + 1;
  return yes;
}

// ---------- bán ----------
export const SELL = { el: 30, duo: 60, inf: 100, tri: 150, shard: 70 };
export const sellPrice = core => core ? SELL[core.type] || 0 : 0;
export function sellCore(g, i) {
  const p = g.p, c = p.cores[i]; if (!c) return { error: 'Empty slot.' };
  if (p.cores.filter(Boolean).length <= 1) return { error: 'Keep at least one core.' };
  const v = sellPrice(c); p.cores[i] = null; g.syncOwned(); g.addGold(v, 'sell'); g.skillCache.clear(); p.queued = null;
  g.emit('sold', { v }); return { gold: v };
}
export function sellShard(g) {
  const p = g.p; if (!(p.shards > 0)) return { error: 'No Fusion Shards.' };
  p.shards--; g.addGold(SELL.shard, 'sell'); g.emit('sold', { v: SELL.shard }); return { gold: SELL.shard };
}

// ---------- chỉ số ----------
export const STAT_SHOP = [
  { id: 'hp',  name: '+10% max HP',      base: 90, apply: (m, g) => { const v = Math.round(CLASSES[g.p.cls].hp * 0.1); m.hpMax += v; g.p.hp += v; } },
  { id: 'dmg', name: '+8% damage',       base: 120, apply: m => { m.dmg *= 1.08; m.basic *= 1.08; } },
  { id: 'en',  name: '+10 max energy',   base: 80, apply: m => { m.energyMax += 10; } },
  { id: 'cd',  name: '-8% skill cost',   base: 130, apply: m => { m.cd *= 0.92; } },
  { id: 'spd', name: '+6% move speed',   base: 80, apply: m => { m.speed *= 1.06; } },
  { id: 'dr',  name: '-6% damage taken', base: 130, apply: m => { m.dr = 1 - (1 - m.dr) * 0.94; } }
];
export const statPrice = (g, id) => { const s = STAT_SHOP.find(q => q.id === id); return Math.round(s.base * Math.pow(1.25, (g.shopBuys[id] || 0))); };
export function buyStat(g, id) {
  const s = STAT_SHOP.find(q => q.id === id); if (!s) return { error: 'Unknown item.' };
  if ((g.visitBuys || {})[id]) return { error: 'Sold out this visit.' };
  const c = statPrice(g, id); if (g.p.gold < c) return { error: 'Not enough gold.' };
  g.p.gold -= c; g.shopBuys[id] = (g.shopBuys[id] || 0) + 1; (g.visitBuys = g.visitBuys || {})[id] = true; s.apply(g.p.mods, g); g.upgradeLog.push('Forge: ' + s.name); g.refreshStats(false);
  g.emit('bought', { id }); return { cost: c };
}

// ---------- bình thuốc ----------
export const POTIONS = { hp: { name: 'Health Potion', price: 40, text: 'Restores 40% HP.' }, en: { name: 'Energy Potion', price: 35, text: 'Restores 60 energy.' } };
export const POTION_MAX = 3;
export function buyPotion(g, k) {
  const P = POTIONS[k]; if (!P) return { error: 'Unknown potion.' };
  if (g.p.potions[k] >= POTION_MAX) return { error: 'You can carry ' + POTION_MAX + '.' };
  if (g.p.gold < P.price) return { error: 'Not enough gold.' };
  g.p.gold -= P.price; g.p.potions[k]++; g.emit('bought', { id: 'potion' }); return { cost: P.price };
}
export function drinkPotion(g, k) {
  const p = g.p; if (!(p.potions[k] > 0) || p.potCd > 0 || g.over || p.hp <= 0) return false;
  if (k === 'hp' && p.hp >= p.max) return false;
  if (k === 'en' && p.energy >= p.energyMax) return false;
  p.potions[k]--; p.potCd = 1;
  if (k === 'hp') { const v = Math.round(p.max * 0.4 * healMul(p)); p.hp = Math.min(p.max, p.hp + v); g.emit('potion', { x: p.x, y: p.y, k, v }); }
  else { p.energy = Math.min(p.energyMax, p.energy + 60); g.emit('potion', { x: p.x, y: p.y, k, v: 60 }); }
  return true;
}

// ---------- rèn chiêu ----------
export const FORGE_COST = { el: 140, duo: 210, inf: 260, tri: 420 };
export function forgeKeyOf(g, core) { return core.type === 'inf' ? 'INF:' + core.els.join('>') + '+' + core.add : coreDef(g.p.cls, core).key; }
export function canForge(g, core) {
  if (!core) return { error: 'Empty slot.' };
  const k = forgeKeyOf(g, core);
  if (g.p.forged.has(k)) return { error: 'Already forged.' };
  if (core.type !== 'inf' && !hasForgeUp(coreDef(g.p.cls, core))) return { error: 'This skill cannot be forged.' };
  const cost = FORGE_COST[core.type];
  if (g.p.gold < cost) return { error: 'Not enough gold.', cost };
  if (core.type === 'tri' && !g.labShards && !(g.p.shards > 0)) return { error: 'Needs 1 Fusion Shard.', cost };
  return { ok: true, cost, key: k };
}
export function forgeCore(g, i) {
  const c = g.p.cores[i], r = canForge(g, c); if (!r.ok) return r;
  g.p.gold -= r.cost; if (c.type === 'tri' && !g.labShards) g.p.shards--;
  g.p.forged.add(r.key); g.skillCache.clear(); g.upgradeLog.push('Forged ' + g.coreSkill(c).name);
  g.emit('forged', { slot: i, name: g.coreSkill(c).name }); return { cost: r.cost };
}

// ---------- vùng an toàn ----------
export const inForge = (g, x, y) => !!(g.forge && dist(x, y, g.forge.x, g.forge.y) < FORGE_R);
