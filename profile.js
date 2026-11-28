// Hồ sơ người chơi lưu trên máy: Gem, skin, hiệu ứng trang trí, nhiệm vụ ngày, chuỗi đăng nhập, thành tựu, thống kê.
// Gem chỉ mua tiện lợi có giới hạn và đồ trang trí; mọi tính năng ảnh hưởng gameplay đều có đường mở miễn phí.
const KEY = 'ea-profile';
const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
const today = () => new Date().toISOString().slice(0, 10);

export const ECON = {
  bossFirst: 25, bossRepeat: 3, perStages: 3, winBonus: 40, firstWin: 100, firstClassWin: 40, hardWin: 60, eliteChance: 0.15, eliteGems: 2,
  login: [5, 5, 8, 8, 10, 10, 25], reroll: [5, 8, 12, 16, 20], revive: 30, chest: 40, chestRefund: 20
};
// ---------- skin theo hạng ----------
// Mọi skin đều đổi HÌNH DÁNG pixel (mũ, giáp, áo choàng — gfx/skinlooks.js), không skin nào chỉ đổi màu.
// common: chỉ ngoại hình, hiệu ứng mặc định · rare: + vũ khí riêng + hiệu ứng chiêu đơn nguyên tố
// epic: + bước chân/lướt + đòn thường & tụ lực riêng · victory: + chiêu 2 nguyên tố
// heroes/boss: đổi TOÀN BỘ: mọi chiêu đơn, chiêu ghép 2, tuyệt kỹ ghép 3, đòn thường, tụ lực, đi và lướt
export const TIERS = {
  common: { name: 'Common', color: '#8a93a8', glow: '#a8b0c4', cover: [] },
  rare: { name: 'Rare', color: '#d4af37', glow: '#f0d060', cover: ['single'] },
  epic: { name: 'Epic', color: '#9d4edd', glow: '#c77dff', cover: ['basic', 'move', 'single'] },
  victory: { name: 'Victory', color: '#ffd36b', glow: '#ffe27a', cover: ['basic', 'move', 'single', 'duo'] },
  boss: { name: 'Boss', color: '#d92638', glow: '#ff4a3a', cover: ['basic', 'move', 'single', 'duo', 'ult'] },
  heroes: { name: 'HEROES', color: '#ff5400', glow: '#ffb703', cover: ['basic', 'move', 'single', 'duo', 'ult'] }
};
export const PRICE = { common: 70, rare: 160, epic: 280, heroes: 480 };
const SK = (id, name, tier, theme, pal, extra = {}) => ({ id, name, tier, theme, price: PRICE[tier] || 0, pal, ...extra });
// skin boss: mỗi boss một bộ cho cả 3 tướng (ghép 6 mảnh rơi từ boss đó)
export const BOSS_SKINS = {
  COLOSSUS: { id: 'ashen', name: 'Ashen Colossus', theme: 'magma', m: { main: ['#1c1210', '#3a2a22', '#5a4234', '#7a5a44'], sec: ['#2a1a14', '#4a3022', '#6a4430'], cape: ['#5a1a08', '#a03a14', '#e0601e'], trim: '#ff7a2a', acc: ['#ff5a1a', '#ffd36b'] } },
  BEHEMOTH: { id: 'sporeling', name: 'Sporeback', theme: 'spore', m: { main: ['#2a1a40', '#4a2a6a', '#7a4aa8', '#b47ae8'], sec: ['#3a3a24', '#5a5a36', '#7a7a4a'], cape: ['#2c4a22', '#3f6a2c', '#5e8f3a'], trim: '#3ad0e0', acc: ['#c8ff6a', '#3ad0e0'] } },
  WARDEN: { id: 'frostbound', name: 'Frostbound', theme: 'glacier', m: { main: ['#2a4a6a', '#4a7aa8', '#8ab8e0', '#e0f4ff'], sec: ['#1c2a3e', '#2e4466', '#4a6a96'], cape: ['#141c34', '#22305a', '#33467a'], trim: '#bff0ff', acc: ['#6ef0ff', '#ffffff'] } },
  DRAGON: { id: 'ignivar', name: 'Ignivar', theme: 'wyrm', m: { main: ['#3a0e0e', '#6a1a14', '#9a2e1c', '#c8502a'], sec: ['#24080a', '#40100e', '#621a14'], cape: ['#2a0a10', '#4a1418', '#6e2420'], trim: '#ffd36b', acc: ['#ff7a2a', '#ffe27a'] } },
  SOVEREIGN: { id: 'stormcrown', name: 'Stormcrown', theme: 'tempest', m: { main: ['#1a1030', '#2e1c52', '#46307a', '#6a4aa8'], sec: ['#0c0a18', '#141028', '#1e1838'], cape: ['#2e1c52', '#46307a', '#6a4aa8'], trim: '#ffe27a', acc: ['#a8f0ff', '#ffffff'] } }
};
const bossPal = (cls, m) => cls === 'KNIGHT' ? { helm: m.main, body: m.sec, cape: m.cape, trim: m.trim, plume: m.acc, arm: m.main.slice(0, 3) }
  : cls === 'RANGER' ? { hood: m.main, body: m.sec, cape: m.cape, trim: m.trim, arm: m.sec, quiver: [m.sec[0], m.sec[1]] }
  : { hat: m.main, robe: m.main, trim: m.trim, hair: m.acc[1], arm: m.sec };
const bossSkins = cls => Object.entries(BOSS_SKINS).map(([boss, b]) => SK(b.id, b.name, 'boss', b.theme, bossPal(cls, b.m), { boss, exclusive: true }));
export const SKINS = {
  KNIGHT: [{ id: '', name: 'Knight', price: 0, tier: 'common' },
    SK('crimson', 'Yuletide Vanguard', 'common', null, { body: ['#6a0e0e', '#a81e1e', '#d83a3a'], cape: ['#0e4a22', '#1a6a32', '#2a8a44'], arm: ['#6a0e0e', '#a81e1e', '#d83a3a'], legs: ['#2a1a14', '#3a2a1e'] }),
    SK('ironclad', 'Lion Dance Knight', 'common', null, { helm: ['#6a0a0a', '#a81414', '#d82a1e', '#ff5a3a'], body: ['#6a0a0a', '#a81414', '#d82a1e'], cape: ['#6a0a0a', '#a81414', '#d82a1e'], trim: '#ffd36b', arm: ['#8a6a1a', '#c8983a', '#e6c36a'], legs: ['#2a1414', '#4a1e1e'] }),
    SK('gold', 'Royal Gold', 'rare', 'radiant', { helm: ['#8a6a1a', '#c8983a', '#e6c36a', '#ffe27a'], body: ['#a8a8b8', '#d8d8e4', '#ffffff'], cape: ['#1a2a6a', '#2a44a0', '#3a5ad0'], arm: ['#8a6a1a', '#c8983a', '#e6c36a'] }),
    SK('obsidian', 'Obsidian', 'epic', 'abyss', { helm: ['#16161e', '#2a2a36', '#44445a', '#6a6a88'], body: ['#1a1a24', '#2e2e40', '#4a4a66'], cape: ['#2a1040', '#44206a', '#6a3aa0'], trim: '#a87aff', plume: ['#6a3aa0', '#a87aff'], arm: ['#16161e', '#2a2a36', '#44445a'] }),
    SK('dragonknight', 'Dragon Knight', 'heroes', 'dragonfire', { helm: ['#3a0a08', '#7a1a10', '#b8361a', '#ff7a2a'], body: ['#2a0e0a', '#5a1a10', '#8a2a14'], cape: ['#1a0a0a', '#3a1010', '#5a1a14'], trim: '#ffd36b', plume: ['#ff7a2a', '#ffe27a'], arm: ['#3a0a08', '#7a1a10', '#b8361a'] }),
    SK('titanslayer', 'Titanslayer', 'victory', 'storm', { helm: ['#1a1030', '#3a2a6a', '#7a5ad0', '#c8b8ff'], body: ['#20203a', '#3a3a66', '#5a5a9a'], cape: ['#6a4a10', '#c8983a', '#ffe27a'], trim: '#7fe0ff', plume: ['#7fe0ff', '#ffffff'] }, { exclusive: true }),
    ...bossSkins('KNIGHT')],
  RANGER: [{ id: '', name: 'Ranger', price: 0, tier: 'common' },
    SK('autumn', 'Frosty Archer', 'common', null, { hood: ['#6a0e0e', '#a81e1e', '#d83a3a', '#ff6a5a'], body: ['#0e4a22', '#1a6a32', '#2a8a44'], cape: ['#0e4a22', '#1a6a32', '#2a8a44'], trim: '#ffffff', arm: ['#0e4a22', '#1a6a32', '#2a8a44'] }),
    SK('scout', 'Crimson Lantern', 'common', null, { body: ['#6a0a0a', '#a81414', '#d82a1e'], cape: ['#6a0a0a', '#a81414', '#d82a1e'], trim: '#ffd36b', arm: ['#6a0a0a', '#a81414', '#d82a1e'], quiver: ['#8a6a1a', '#c8983a'] }),
    SK('frost', 'Frost Ranger', 'rare', 'frost', { hood: ['#2a4a6a', '#4a7aa8', '#8ab8e0', '#d0ecff'], body: ['#3a4a5a', '#5a6a7a', '#8a9aaa'], cape: ['#2a4a6a', '#4a7aa8', '#8ab8e0'], trim: '#ffffff', arm: ['#3a4a5a', '#5a6a7a', '#8a9aaa'] }),
    SK('shadow', 'Shadow Stalker', 'epic', 'shadow', { hood: ['#14141c', '#24243a', '#3a3a5a', '#5a5a80'], body: ['#1a1a24', '#2a2a3a', '#3a3a50'], cape: ['#14141c', '#24243a', '#3a3a5a'], trim: '#c07aff', arm: ['#1a1a24', '#2a2a3a', '#3a3a50'] }),
    SK('starlight', 'Starlight Huntress', 'heroes', 'starlight', { hood: ['#0e1a3a', '#1e3a6a', '#3a6aa8', '#8ac8ff'], body: ['#1a2a4a', '#2a4470', '#4a6a9a'], cape: ['#c8d8f0', '#e0ecff', '#ffffff'], trim: '#7fe0ff', arm: ['#1a2a4a', '#2a4470', '#4a6a9a'], quiver: ['#c8d8f0', '#ffffff'] }),
    SK('titanslayer', 'Titanslayer', 'victory', 'storm', { hood: ['#1a1030', '#3a2a6a', '#7a5ad0', '#c8b8ff'], body: ['#20203a', '#3a3a66', '#5a5a9a'], cape: ['#6a4a10', '#c8983a', '#ffe27a'], trim: '#7fe0ff' }, { exclusive: true }),
    ...bossSkins('RANGER')],
  MAGE: [{ id: '', name: 'Mage', price: 0, tier: 'common' },
    SK('scholar', 'Winter Solstice', 'common', null, { hat: ['#6a0e0e', '#a81e1e', '#d83a3a', '#ff6a5a'], robe: ['#0e4a22', '#1a6a32', '#2a8a44', '#3aa856'], trim: '#ffffff', arm: ['#6a0e0e', '#a81e1e', '#d83a3a'] }),
    SK('seawitch', 'Jade Dynasty', 'common', null, { hat: ['#0e3a2a', '#1a6a4a', '#2a9a6a', '#5ad09a'], robe: ['#6a0a0a', '#a81414', '#d82a1e', '#ff4a3a'], trim: '#ffd36b', hair: '#1a1418', arm: ['#6a0a0a', '#a81414', '#d82a1e'] }),
    SK('inferno', 'Inferno', 'rare', 'inferno', { hat: ['#3a0a04', '#7a1a08', '#c83a14', '#ff7a2a'], robe: ['#3a0a04', '#7a1a08', '#c83a14', '#ff7a2a'], trim: '#ffd36b', arm: ['#5a1208', '#7a1a08', '#c83a14'] }),
    SK('void', 'Void Walker', 'epic', 'void', { hat: ['#06040e', '#14102a', '#2a2050', '#4a3a80'], robe: ['#06040e', '#14102a', '#2a2050', '#4a3a80'], trim: '#7fe0ff', hair: '#a87aff', arm: ['#0a0818', '#14102a', '#2a2050'] }),
    SK('celestial', 'Celestial Archon', 'heroes', 'celestial', { hat: ['#8a8aa8', '#b8b8d0', '#e0e0f0', '#ffffff'], robe: ['#8a8aa8', '#b8b8d0', '#e0e0f0', '#ffffff'], trim: '#e6c36a', hair: '#ffe27a', arm: ['#8a8aa8', '#b8b8d0', '#e0e0f0'] }),
    SK('titanslayer', 'Titanslayer', 'victory', 'storm', { hat: ['#1a1030', '#3a2a6a', '#7a5ad0', '#c8b8ff'], robe: ['#20203a', '#3a3a66', '#5a5a9a', '#8a8ad0'], trim: '#ffe27a', hair: '#7fe0ff' }, { exclusive: true }),
    ...bossSkins('MAGE')]
};
export const skinFx = (cls, id) => { const s = (SKINS[cls] || []).find(k => k.id === id); return s && s.theme ? { tier: s.tier, theme: s.theme } : null; };
// mảnh skin boss: RIÊNG từng tướng (vd. mảnh Pháp sư của Frost Warden). Đủ 4 mảnh mở đúng skin boss của tướng đó.
// Rơi khi hạ boss (12%, ngẫu nhiên một tướng chưa có skin), hoặc từ rương thường (rất hiếm) và rương xịn.
export const SHARD_NEED = 4, SHARD_CHANCE = 0.12, CHEST_SHARD = 0.01;
const CLS3 = ['KNIGHT', 'RANGER', 'MAGE'];
export const shardsOf = (bossId, cls) => (P.bshards || {})[bossId + ':' + cls] || 0;
const shardOpen = bossId => CLS3.filter(c => !P.skins.includes(c + ':' + BOSS_SKINS[bossId].id) && shardsOf(bossId, c) < SHARD_NEED);
function addShard(bossId, cls) {
  const b = BOSS_SKINS[bossId], k = bossId + ':' + cls; P.bshards = P.bshards || {};
  const n = P.bshards[k] = (P.bshards[k] || 0) + 1, unlocked = n >= SHARD_NEED; if (unlocked && !P.skins.includes(cls + ':' + b.id)) P.skins.push(cls + ':' + b.id);
  return { kind: 'shard', tier: 'shard', boss: bossId, cls, id: b.id, name: b.name, count: n, need: SHARD_NEED, unlocked };
}
export function rollBossShard(bossId, rand = Math.random) {
  if (!BOSS_SKINS[bossId]) return null; const open = shardOpen(bossId);
  if (!open.length || rand() >= SHARD_CHANCE) return null;
  const r = addShard(bossId, open[Math.floor(rand() * open.length)]); save(); return r;
}
// mảnh ngẫu nhiên (boss bất kỳ, tướng bất kỳ còn thiếu skin) cho rương; null nếu đã có đủ mọi skin boss
function randomShard(rand) { const opts = Object.keys(BOSS_SKINS).flatMap(b => shardOpen(b).map(c => [b, c])); if (!opts.length) return null; const [b, c] = opts[Math.floor(rand() * opts.length)]; return addShard(b, c); }
export const TRAILS = [{ id: '', name: 'None', price: 0 }, { id: 'crown', name: 'Crown Lightning', price: 0, exclusive: true, c: ['#7fe0ff', '#ffe27a'] }, { id: 'flame', name: 'Flame Dash', price: 50, c: ['#ff7a3c', '#ffd36b'] }, { id: 'stars', name: 'Stardust Dash', price: 50, c: ['#ffffff', '#ffe27a'] }, { id: 'leaves', name: 'Leaf Dash', price: 50, c: ['#6aa84c', '#a8e070'] }];
const QUESTS = [
  { id: 'kills', text: 'Defeat 60 enemies', goal: 60, reward: 2 }, { id: 'stages', text: 'Clear 6 stages', goal: 6, reward: 2 },
  { id: 'elites', text: 'Defeat 2 elite enemies', goal: 2, reward: 3 }, { id: 'bosses', text: 'Defeat a titan', goal: 1, reward: 3 },
  { id: 'tri', text: 'Forge an ultimate (merge 3)', goal: 1, reward: 2 }, { id: 'nohit', text: 'Defeat a titan without being hit', goal: 1, reward: 3 },
  { id: 'bombs', text: 'Blow up 5 volcano bombs', goal: 5, reward: 2 }, { id: 'crystals', text: 'Break 2 fusion crystals', goal: 2, reward: 2 }
];
export const ACHIEVEMENTS = [
  { id: 'firstboss', text: 'Defeat your first titan', reward: 10, test: s => s.bosses >= 1 }, { id: 'stage15', text: 'Reach stage 15', reward: 20, test: s => s.best >= 15 },
  { id: 'win1', text: 'Win a full run', reward: 40, test: s => s.wins >= 1 }, { id: 'allclass', text: 'Win with all 3 heroes', reward: 50, test: s => ['KNIGHT', 'RANGER', 'MAGE'].every(c => (s.winsBy || {})[c]) },
  { id: 'tri1', text: 'Forge your first ultimate', reward: 10, test: s => s.tri >= 1 }, { id: 'elites10', text: 'Defeat 10 elites', reward: 20, test: s => s.elites >= 10 },
  { id: 'bombs20', text: 'Blow up 20 bombs', reward: 20, test: s => s.bombs >= 20 }, { id: 'kills1k', text: 'Defeat 1000 enemies', reward: 30, test: s => s.kills >= 1000 }
];

function fresh() { return { gems: 0, skins: [], trails: [], skin: {}, trail: '', login: { last: '', streak: 0 }, quests: { day: '', list: [] }, ach: {}, stats: { runs: 0, wins: 0, winsBy: {}, bosses: 0, bossFirst: {}, kills: 0, elites: 0, bombs: 0, tri: 0, crystals: 0, best: 0 } }; }
export let P = fresh();
try { const raw = store && store.getItem(KEY); if (raw) P = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* hồ sơ hỏng: bắt đầu lại */ }
// hồ sơ cũ: mảnh từng tính chung cả bộ → chuyển thành mảnh cho từng tướng (không tự mở skin)
if (P.bshards) for (const id of Object.keys(BOSS_SKINS)) if (typeof P.bshards[id] === 'number') { const n = Math.min(SHARD_NEED - 1, P.bshards[id]); delete P.bshards[id]; for (const c of ['KNIGHT', 'RANGER', 'MAGE']) P.bshards[id + ':' + c] = Math.max(P.bshards[id + ':' + c] || 0, n); }
const subs = new Set();
export const onChange = fn => subs.add(fn);
export function save() { try { store && store.setItem(KEY, JSON.stringify(P)); } catch (e) { /* bỏ qua */ } for (const f of subs) f(P); }
export function reset() { P = fresh(); save(); }
// thay toàn bộ hồ sơ bằng bản lưu trên mây (đồng bộ tài khoản)
export function replace(obj) { P = Object.assign(fresh(), obj || {}); save(); }
// lượt chơi đang dở (bản chụp từ runsave.js), đi theo hồ sơ nên cũng được đồng bộ lên tài khoản
export function saveRun(snap) { P.run = snap; save(); }
export function clearRun() { if (!P.run) return; delete P.run; save(); }
export function addGems(n, why) { if (!(n > 0)) return; P.gems += n; save(); for (const f of subs) f(P, { gems: n, why }); }
export function spend(n) { if (P.gems < n) return false; P.gems -= n; save(); return true; }

// ---------- đăng nhập + nhiệm vụ ngày ----------
export function dailyLogin() {
  const d = today(); if (P.login.last === d) return null;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  P.login.streak = P.login.last === y ? P.login.streak + 1 : 1; P.login.last = d;
  const reward = ECON.login[(P.login.streak - 1) % 7]; P.gems += reward; rollQuests(); save();
  return { reward, streak: P.login.streak };
}
export function rollQuests(force) {
  const d = today(); if (P.quests.day === d && !force) return;
  const pool = [...QUESTS].sort(() => Math.random() - 0.5);
  P.quests = { day: d, list: pool.slice(0, 3).map(q => ({ ...q, progress: 0, claimed: false })) }; save();
}
export function claimQuest(i) { const q = P.quests.list[i]; if (!q || q.claimed || q.progress < q.goal) return 0; q.claimed = true; P.gems += q.reward; save(); return q.reward; }
// ---------- thống kê, thành tựu ----------
export function track(stat, n = 1) {
  if (stat in P.stats && typeof P.stats[stat] === 'number') P.stats[stat] += n;
  for (const q of P.quests.list) if (q.id === stat && !q.claimed) q.progress = Math.min(q.goal, q.progress + n);
  const got = [];
  for (const a of ACHIEVEMENTS) if (!P.ach[a.id] && a.test(P.stats)) { P.ach[a.id] = true; P.gems += a.reward; got.push(a); }
  save(); return got;
}
export function bossDefeated(idx) { const first = !P.stats.bossFirst[idx]; P.stats.bossFirst[idx] = true; const n = first ? ECON.bossFirst : ECON.bossRepeat; addGems(n, first ? 'First titan kill' : 'Titan kill'); track('bosses'); return n; }
export function runEnded(stage, won, cls) {
  P.stats.runs++; P.stats.best = Math.max(P.stats.best, stage); if (won) { P.stats.wins++; P.stats.winsBy[cls] = true; }
  let n = Math.floor(stage / ECON.perStages) + (won ? ECON.winBonus : 0); const unlocks = [], bonus = [];
  if (won) {
    const firstEver = P.stats.wins === 1, firstClass = !P.skins.includes(cls + ':titanslayer');
    if (firstEver) { n += ECON.firstWin; bonus.push(['First victory', ECON.firstWin]); if (!P.trails.includes('crown')) { P.trails.push('crown'); unlocks.push({ kind: 'trail', id: 'crown', name: 'Crown Lightning' }); } }
    if (firstClass) { n += ECON.firstClassWin; bonus.push(['First win as this hero', ECON.firstClassWin]); P.skins.push(cls + ':titanslayer'); unlocks.push({ kind: 'skin', cls, id: 'titanslayer', name: 'Titanslayer' }); }
    if (arguments[3] === 'HARD') { n += ECON.hardWin; bonus.push(['Brutal difficulty', ECON.hardWin]); }
  }
  P.gems += n; const got = track('runs', 0); save(); return { gems: n, ach: got, unlocks, bonus };
}
// ---------- cửa hàng ----------
export const skinOf = cls => P.skin[cls] || '';
export function buySkin(cls, id) { const s = SKINS[cls].find(k => k.id === id); if (!s || P.skins.includes(cls + ':' + id)) return true; if (!spend(s.price)) return false; P.skins.push(cls + ':' + id); P.skin[cls] = id; save(); return true; }
export const ownsSkin = (cls, id) => !id || P.skins.includes(cls + ':' + id);
export function equipSkin(cls, id) { if (!ownsSkin(cls, id)) return false; P.skin[cls] = id; save(); return true; }
export function buyTrail(id) { const t = TRAILS.find(k => k.id === id); if (!t || P.trails.includes(id)) return true; if (!spend(t.price)) return false; P.trails.push(id); P.trail = id; save(); return true; }
export const ownsTrail = id => !id || P.trails.includes(id);
export function equipTrail(id) { if (!ownsTrail(id)) return false; P.trail = id; save(); return true; }
// hòm trang trí: chỉ chứa skin/hiệu ứng, tỉ lệ công khai; trùng thì hoàn một phần gem
export function chestPool() { const out = []; for (const [cls, list] of Object.entries(SKINS)) for (const s of list) if (s.id && !s.exclusive && (s.tier === 'common' || s.tier === 'rare')) out.push({ kind: 'skin', cls, id: s.id, name: s.name + ' (' + cls[0] + cls.slice(1).toLowerCase() + ')', w: 120 / s.price }); for (const t of TRAILS) if (t.id && !t.exclusive) out.push({ kind: 'trail', id: t.id, name: t.name, w: 1.6 }); const W = out.reduce((a, b) => a + b.w, 0); return out.map(o => ({ ...o, chance: o.w / W })); }
// ---------- rương xịn: Rare / hiệu ứng lướt / Epic / HEROES, tỉ lệ công khai + bảo hiểm ----------
export const ROYAL = { price: 150, price5: 680, rates: { rare: 0.58, trail: 0.20, shard: 0.04, epic: 0.15, heroes: 0.03 }, pityEpic: 10, pityHeroes: 40, refund: { rare: 40, trail: 15, shard: 40, epic: 90, heroes: 180 } };
const royalItems = tier => tier === 'shard' ? Object.entries(BOSS_SKINS).flatMap(([boss, b]) => CLS3.map(cls => ({ kind: 'shard', boss, cls, id: b.id, name: b.name, tier: 'shard' })))
  : tier === 'trail' ? TRAILS.filter(t => t.id && !t.exclusive).map(t => ({ kind: 'trail', id: t.id, name: t.name, tier: 'trail' }))
  : Object.entries(SKINS).flatMap(([cls, list]) => list.filter(s => s.tier === tier && !s.exclusive).map(s => ({ kind: 'skin', cls, id: s.id, name: s.name, tier })));
export function royalPool() { return Object.entries(ROYAL.rates).map(([tier, chance]) => ({ tier, chance, items: royalItems(tier) })); }
const ownsItem = it => it.kind === 'skin' ? P.skins.includes(it.cls + ':' + it.id) : P.trails.includes(it.id);
export function royalPity() { const p = P.pity || { epic: 0, heroes: 0 }; return { epic: ROYAL.pityEpic - p.epic, heroes: ROYAL.pityHeroes - p.heroes }; }
// mở n lần (n = 1 hoặc 5); rand và noPity chỉ để kiểm thử
export function openRoyal(n = 1, rand = Math.random, noPity = false, free = false) {
  const cost = n >= 5 ? ROYAL.price5 : ROYAL.price * n;
  if (!free && !spend(cost)) return null;
  P.pity = P.pity || { epic: 0, heroes: 0 }; const out = [];
  for (let i = 0; i < n; i++) {
    let tier, pity = false;
    if (!noPity && P.pity.heroes >= ROYAL.pityHeroes - 1) { tier = 'heroes'; pity = true; }
    else if (!noPity && P.pity.epic >= ROYAL.pityEpic - 1) { tier = rand() < ROYAL.rates.heroes / (ROYAL.rates.heroes + ROYAL.rates.epic) ? 'heroes' : 'epic'; pity = true; }
    else { let r = rand(); tier = 'rare'; for (const [t, c] of Object.entries(ROYAL.rates)) { if ((r -= c) < 0) { tier = t; break; } } }
    P.pity.epic = tier === 'epic' || tier === 'heroes' ? 0 : P.pity.epic + 1; P.pity.heroes = tier === 'heroes' ? 0 : P.pity.heroes + 1;
    if (tier === 'shard') { const s = randomShard(rand); if (s) out.push({ ...s, dup: false, pity }); else { P.gems += ROYAL.refund.shard; out.push({ kind: 'shard', tier: 'shard', name: 'Boss shard', dup: true, refund: ROYAL.refund.shard, pity }); } continue; }
    const all = royalItems(tier), fresh = all.filter(it => !ownsItem(it)), pool = fresh.length ? fresh : all, it = pool[Math.floor(rand() * pool.length)];
    if (fresh.length) { if (it.kind === 'skin') P.skins.push(it.cls + ':' + it.id); else P.trails.push(it.id); out.push({ ...it, dup: false, pity }); }
    else { P.gems += ROYAL.refund[tier]; out.push({ ...it, dup: true, refund: ROYAL.refund[tier], pity }); }
  }
  save(); return out;
}
export function openChest() {
  if (!spend(ECON.chest)) return null;
  if (Math.random() < CHEST_SHARD) { const s = randomShard(Math.random); if (s) { save(); return s; } }   // 1%: mảnh skin boss
  const pool = chestPool(); let r = Math.random(), pick = pool[pool.length - 1]; for (const o of pool) { if ((r -= o.chance) <= 0) { pick = o; break; } }
  const owned = pick.kind === 'skin' ? P.skins.includes(pick.cls + ':' + pick.id) : P.trails.includes(pick.id);
  if (owned) { P.gems += ECON.chestRefund; save(); return { ...pick, dup: true }; }
  if (pick.kind === 'skin') P.skins.push(pick.cls + ':' + pick.id); else P.trails.push(pick.id); save(); return pick;
}
