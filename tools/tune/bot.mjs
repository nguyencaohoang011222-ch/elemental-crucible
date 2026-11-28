// Bot chơi trọn một lượt: né + dùng chiêu + chọn nâng cấp + ghé lò rèn. Dùng chung cho tests/run.mjs và vòng lặp cân bằng (tools/tune).
// level: 'base' (bot gốc, giữ nguyên kết quả cũ), 'novice' (phản xạ chậm, né kém), 'good' (né sớm, ưu tiên chiêu hiệu quả theo bảng đo).
import { Game, BOSS_STAGES } from '../../game.js';
import * as FG from '../../forge.js';
import { skillPower } from '../../kits.js';
import { RELIC_BY_ID } from '../../relics.js';

// strategy: 'merge' (mặc định: ghép tham lam) | 'spam' (giữ chiêu đơn, spam chiêu hiệu quả nhất, nhặt nâng cấp hồi máu/mana: kiểu người chơi thật đã phá đảo)
const SPAM_PICKS = ['leech', 'regen', 'surge', 'flow', 'power', 'focus', 'fire', 'water', 'earth', 'wind', 'reserve', 'vital'];
const spamValue = (g, c) => { const sk = g.coreSkill(c); return skillPower(sk) / Math.max(1, sk.cost); };
const ready = (g, c) => { const p = g.p, sk = g.coreSkill(c); return p.energy >= sk.cost && !(p.cds && p.cds[sk.key] > 0); };

// ghé lò rèn (bot không đi bộ tới: coi như ghé một lần mỗi stage có nhà): rèn chiêu mạnh nhất trên thanh, mua bình, phần dư mua chỉ số
export function shop(g) {
  const p = g.p, rank = c => !c ? 0 : c.type === 'tri' ? 4 : c.type === 'inf' ? 3 : c.type === 'duo' ? 2 : 1;
  if (p.shards > 1) FG.sellShard(g);
  for (const i of [0, 1, 2, 3].sort((a, b) => rank(p.cores[b]) - rank(p.cores[a]))) if (p.cores[i] && FG.canForge(g, p.cores[i]).ok) FG.forgeCore(g, i);
  while (p.potions.hp < 2 && !FG.buyPotion(g, 'hp').error);
  while (p.potions.en < 1 && !FG.buyPotion(g, 'en').error);
  for (const id of ['dmg', 'hp', 'dr']) if (p.gold > FG.statPrice(g, id) + 150) FG.buyStat(g, id);
}

// bộ sinh số riêng của bot (không đụng g.rand, để bot novice/good không làm lệch dòng ngẫu nhiên của game)
const lcg = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

export function bot(g, skill, cfg = {}) {
  const level = cfg.level || 'base', p = g.p, it = {};
  const foes = g.enemies.filter(e => e.type !== 'DUMMY' && !e.dead);
  let tgt = null, bd = 1e9; for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; tgt = e; } }
  if (!tgt) { const G = g.portal; if (G && G.state !== 'sealed') { it.mx = G.x - p.x; it.my = G.y - p.y; } return it; }   // boss xong: đi vào cổng
  // hết năng lượng trong trận boss: đi đập thùng mana của đấu trường (thùng không phải quái, nhưng đánh thường phá được)
  if (g.boss && p.energy < 35) { let cb = null, cd = 1e9; for (const o of g.world.temp) if (o.supply && !o.dead) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < cd) { cd = d; cb = o; } } if (cb) { tgt = { x: cb.x, y: cb.y, crate: true }; bd = cd; } }
  // bot gốc đứng xa boss cả khi cận chiến; novice/good áp sát
  const melee = p.cls === 'KNIGHT' || p.cls === 'AXIOM';
  const range = tgt.crate ? (melee ? 40 : 150) : tgt.boss ? (melee && level !== 'base' ? 70 + (tgt.r || 30) : 260) : melee ? 70 : 240, dx = tgt.x - p.x, dy = tgt.y - p.y;
  let mx = 0, my = 0;
  if (bd > range) { mx = dx; my = dy; } else if (bd < range * 0.7) { mx = -dx; my = -dy; } else { mx = -dy; my = dx; }
  for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 90 && !e.boss) { mx -= (e.x - p.x) / d * 60; my -= (e.y - p.y) / d * 60; } }
  // né hazard của boss (good: thấy sớm hơn, né mạnh hơn; novice: né yếu)
  // (đã đo: né mạnh tay hơn hay chọn chiêu theo bảng bench đều làm bot tệ đi, nên good chỉ nhìn sớm hơn)
  const look = cfg.look ?? (level === 'good' ? 1.5 : 1), push = cfg.push ?? (level === 'novice' ? 0.5 : 1);
  let danger = false;
  for (const h of g.hazards) {
    if (h.done && !h.active) continue;
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    if (h.kind === 'circle' && d < h.r + 30) { mx += (p.x - h.x) / (d || 1) * 200 * push; my += (p.y - h.y) / (d || 1) * 200 * push; if (h.t < 0.25 * look) danger = true; }
    if (h.kind === 'arc' && d < h.r + 30) { mx += (p.x - h.x) / (d || 1) * 150 * push; my += (p.y - h.y) / (d || 1) * 150 * push; if (h.t < 0.25 * look) danger = true; }
    if ((h.kind === 'rect' || h.kind === 'line') && h.t < 0.3 * look) danger = true;
    if (h.active && Math.abs(d - h.rr) < 60) danger = true;
  }
  for (const f of g.foes) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < 90) { mx += -f.vy * push; my += f.vx * push; if (d < 40 * look) danger = true; } }
  if (g.boss && g.boss.dashing && bd < 220) danger = true;
  // novice/good: nhặt đồ rơi gần (mana, máu, chỉ số) khi không có nguy hiểm, như người chơi thật
  if (level !== 'base' && !danger && g.pickups) { let pk = null, pd = 350; for (const q of g.pickups) { if (q.kind === 'gold' || q.kind === 'gem' || q.kind === 'bshard' || (q.kind === 'energy' && p.energy > p.energyMax * 0.85) || (q.kind === 'heal' && p.hp > p.max * 0.9)) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < pd) { pd = d; pk = q; } } if (pk) { mx = (pk.x - p.x) * 4 + mx * 0.3; my = (pk.y - p.y) * 4 + my * 0.3; } }
  it.mx = mx; it.my = my; it.ax = tgt.x; it.ay = tgt.y; it.cx = tgt.x; it.cy = tgt.y; it.fire = bd < range + 40;
  if (p.cls === 'AXIOM') it.fireHeld = it.fire;
  it.dash = danger || foes.some(e => e.state === 'charge' && Math.hypot(e.x - p.x, e.y - p.y) < 140);
  const miss = cfg.dashMiss ?? (level === 'novice' ? 0.6 : 0);
  if (miss && it.dash) { cfg.rng = cfg.rng || lcg(cfg.seed || 1); if (cfg.rng() < miss) it.dash = false; }   // novice: phản xạ chậm, lỡ 60% cú né
  if (cfg.shop !== false) { if (p.hp < p.max * 0.35 && p.potions.hp) it.potion = 'hp'; else if (g.boss && p.energy < 25 && p.potions.en) it.potion = 'en'; }
  if (!skill || g.t % 0.25 > 1 / 60) return it;
  // dùng chiêu: ưu tiên chiêu 3 nguyên tố, rồi ô ngẫu nhiên đủ energy (mỗi ô 1 phím). good: chọn ô có điểm hiệu quả cao nhất.
  const opts = [];
  for (let i = 0; i < 4; i++) { const c = p.cores[i]; if (c && ready(g, c)) opts.push([i, c]); }
  if (cfg.strategy === 'spam') { if (opts.length) { let bi = opts[0][0], bv = -1; for (const [i, c] of opts) { const v = spamValue(g, c); if (v > bv) { bv = v; bi = i; } } it.slots = [bi]; } return it; }
  const big = opts.find(([, c]) => c.type === 'tri' || c.type === 'inf');
  if (big) it.slots = [big[0]];
  else if (opts.length && level === 'good' && cfg.value) { let bi = opts[0][0], bv = -1; for (const [i, c] of opts) { const v = cfg.value(g, c); if (v > bv) { bv = v; bi = i; } } it.slots = [bi]; }
  else if (opts.length) it.slots = [opts[Math.floor(g.rand() * opts.length)][0]];
  return it;
}
// ghép tham lam trong túi: 3 đơn khác nhau → tuyệt kỹ, đôi + đơn → truyền, 2 đơn khác nhau → đôi
export function autoMerge(g, level, strategy) {
  const inv = g.p.cores, idx = f => inv.map((c, i) => c && f(c) ? i : -1).filter(i => i >= 0);
  // 'full' (thử nghiệm): giữ thanh chiêu đầy 4 ô, chỉ ghép khi có hơn 4 lõi. Đo thấy ghép tham lam mạnh hơn nên good vẫn ghép.
  const count = () => inv.filter(Boolean).length;
  if (strategy === 'spam') { const v = c => c ? spamValue(g, c) : -1; const sorted = inv.slice().sort((a, b) => v(b) - v(a)); for (let i = 0; i < inv.length; i++) inv[i] = sorted[i]; return; }   // spam: không ghép, chiêu đơn mạnh nhất lên thanh
  for (let guard = 0; guard < 6; guard++) {
    if (level === 'full' && count() <= 4) break;
    const singles = idx(c => c.type === 'el'), duos = idx(c => c.type === 'duo');
    const distinct = []; for (const i of singles) if (!distinct.some(j => inv[j].el === inv[i].el)) distinct.push(i);
    let r = null;
    if (distinct.length >= 3) r = g.mergeCores(distinct.slice(0, 3));
    else if (duos.length && singles.length) r = g.mergeCores([duos[0], singles[0]]);
    else if (distinct.length >= 2) r = g.mergeCores(distinct.slice(0, 2));
    if (!r || r.error) break;
  }
  // đưa lõi mạnh nhất lên thanh
  const rank = c => !c ? 0 : c.type === 'tri' || c.type === 'inf' ? 3 : c.type === 'duo' ? 2 : 1;
  const order = inv.map((c, i) => i).sort((a, b) => rank(inv[b]) - rank(inv[a]));
  const sorted = order.map(i => inv[i]); for (let i = 0; i < inv.length; i++) inv[i] = sorted[i];
}
export function rewards(g, level, strategy) {
  while (g.state === 'reward') {
    const r = g.rewards[0];
    if (r.type === 'minor') { if (!r.choices.length) g.finishReward(); else { const pref = strategy === 'spam' ? SPAM_PICKS.map(id => r.choices.find(c => c.id === id)).find(Boolean) : null; g.pickMinor((pref || r.choices[Math.floor(g.rand() * r.choices.length)]).id); } }
    else {
      const aw = r.choices.find(c => c.type === 'awaken');
      g.pickMajor(aw || r.choices[0]);
    }
  }
  autoMerge(g, level, strategy);
}
// một lượt chơi. opts: { difficulty: 'NORMAL'|'HARD', level, strategy, relics: [id] (tặng ngay từ đầu), shop, value, maxT, immortal (máu luôn đầy: đo sức đánh), maxStage, onStep(g) }
export function run(cls, el, seed, skill = true, opts = {}) {
  const SHOP = opts.shop !== false;
  const g = new Game(seed, cls, { element: el, difficulty: opts.difficulty }); const dt = 1 / 60; let bossTimes = {}, bossStart = 0;
  const cfg = { level: opts.level || 'base', seed, shop: SHOP, value: opts.value, look: opts.look, push: opts.push, dashMiss: opts.dashMiss, strategy: opts.strategy || 'merge' };
  for (const id of opts.relics || []) { const r = RELIC_BY_ID[id]; if (!r || (r.cls && r.cls !== cls)) continue; (g.p.relics = g.p.relics || new Set()).add(id); r.apply(g.p.mods, g); g.refreshStats(false); }
  // sát thương nhận theo nguồn (chỉ đo trong công cụ, không đổi game)
  const taken = { mob: 0, boss: 0 }, stageT = {}; let stT0 = 0, lastSt = g.stage;
  const hp0 = g.hurtPlayer.bind(g); g.hurtPlayer = function (...a) { const q = this.p, h = q.hp; const r = hp0(...a); const d = Math.max(0, h - q.hp); if (d) taken[this.boss && !this.boss.dead ? 'boss' : 'mob'] += d; return r; };
  const maxT = opts.maxT || 4500;
  while (!g.over && g.t < maxT && !(opts.maxStage && g.stage > opts.maxStage)) {
    if (opts.immortal && !(opts.mortalFrom && g.stage >= opts.mortalFrom)) g.p.hp = g.p.max;
    if (opts.onStep && opts.onStep(g) === false) break;
    if (g.state === 'reward') { if (bossStart) { bossTimes[g.stage] = Math.round(g.t - bossStart); bossStart = 0; } rewards(g, cfg.level, cfg.strategy); continue; }
    const st = g.stage;
    if (SHOP && g.forge && g.shopped !== st) { g.shopped = st; shop(g); }
    if (BOSS_STAGES[st] !== undefined && !bossStart) bossStart = g.t;
    g.step(dt, bot(g, skill, cfg)); g.events.length = 0;
    if (g.stage !== st && bossStart) { bossTimes[st] = Math.round(g.t - bossStart); bossStart = 0; }
    if (g.stage !== lastSt) { stageT[lastSt] = Math.round(g.t - stT0); stT0 = g.t; lastSt = g.stage; }
  }
  return { stage: g.stage, won: g.won, t: Math.round(g.t), casts: g.casts, owned: g.p.owned.size, merges: g.merges, bar: g.p.cores.slice(0, 4).map(c => c ? c.type : '-').join(''), bossTimes, bossHp: g.boss ? Math.round(100 * g.boss.hp / g.boss.max) : null, progress: +(g.stage + (g.boss && !g.won ? Math.max(0, 1 - g.boss.hp / g.boss.max) : 0)).toFixed(2), taken: { mob: Math.round(taken.mob), boss: Math.round(taken.boss) }, stageT, dmg: Math.round(g.stats.dmg) };
}
