// Lưu tiến trình lượt chơi: chụp trạng thái ngay khi bước vào stage mới (sau khi đã chọn thưởng), khôi phục thành Game mới ở đúng stage đó.
// Bản chụp chỉ gồm dữ liệu thuần (JSON) để cất vào hồ sơ người chơi (localStorage + đồng bộ tài khoản qua Supabase).
import { Game } from './game.js';

export const RUN_VER = 1;
const G_KEYS = ['shopBuys', 'bossGoldN', 'upgrades', 'upgradeLog', 'casts', 'merges', 'stats', 'rerolls', 'paidRerolls', 'revived', 'sinceElite', 'forgeVisits', 'statDrops', 'kills', 't', 'forgeDry'];
const P_KEYS = ['cores', 'gold', 'potions', 'shards', 'mods', 'hp', 'energy'];
const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));

// n: stage sắp vào (gọi ngay trước startStage(n))
export function snapshotRun(g, n = g.stage) {
  const p = g.p, o = { v: RUN_VER, at: Date.now(), seed: g.seed, cls: p.cls, difficulty: g.difficulty, stage: n, g: {}, p: {} };
  for (const k of G_KEYS) if (g[k] !== undefined) o.g[k] = clone(g[k]);
  for (const k of P_KEYS) if (p[k] !== undefined) o.p[k] = clone(p[k]);
  o.p.forged = [...p.forged]; o.p.relics = [...p.relics]; o.g.discovered = [...g.discovered];
  return o;
}

export const validRun = s => !!(s && s.v === RUN_VER && s.stage >= 2 && s.cls && s.p && Array.isArray(s.p.cores));

// opts: skin, skinFx (lấy từ hồ sơ hiện tại)
export function restoreRun(s, opts = {}) {
  const g = new Game(s.seed, s.cls, { difficulty: s.difficulty, skin: opts.skin, skinFx: opts.skinFx });
  const p = g.p;
  for (const k of G_KEYS) if (s.g[k] !== undefined) g[k] = clone(s.g[k]);
  for (const k of P_KEYS) if (s.p[k] !== undefined) p[k] = clone(s.p[k]);
  p.forged = new Set(s.p.forged || []); p.relics = new Set(s.p.relics || []); g.discovered = new Set(s.g.discovered || []);
  g.syncOwned();
  const hp = p.hp, en = p.energy; g.refreshStats(false); p.hp = Math.min(p.max, hp); p.energy = Math.min(p.energyMax, en);
  // bỏ stage 1 mà constructor vừa dựng, vào lại đúng stage đã lưu
  g.enemies = g.enemies.filter(e => e.type === 'DUMMY'); g.spawnQ = []; g.sigils = []; g.pickups = []; g.events = [];
  g.startStage(s.stage);
  g.restored = true;
  return g;
}
