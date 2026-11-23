// Bot chơi trọn một lượt: né + dùng mọi chiêu đang có + chọn nâng cấp. Bắt lỗi và đo độ khó.
import { Game, BOSS_STAGES } from '../game.js';
import { EL } from '../kits.js';
import * as FG from '../forge.js';
const SHOP = !process.argv.includes('--noshop');
// ghé lò rèn (bot không đi bộ tới: coi như ghé một lần mỗi stage có nhà): rèn chiêu mạnh nhất trên thanh, mua bình, phần dư mua chỉ số
function shop(g) {
  const p = g.p, rank = c => !c ? 0 : c.type === 'tri' ? 4 : c.type === 'inf' ? 3 : c.type === 'duo' ? 2 : 1;
  if (p.shards > 1) FG.sellShard(g);
  for (const i of [0, 1, 2, 3].sort((a, b) => rank(p.cores[b]) - rank(p.cores[a]))) if (p.cores[i] && FG.canForge(g, p.cores[i]).ok) FG.forgeCore(g, i);
  while (p.potions.hp < 2 && !FG.buyPotion(g, 'hp').error);
  while (p.potions.en < 1 && !FG.buyPotion(g, 'en').error);
  for (const id of ['dmg', 'hp', 'dr']) if (p.gold > FG.statPrice(g, id) + 150) FG.buyStat(g, id);
}

function bot(g, skill) {
  const p = g.p, it = {};
  const foes = g.enemies.filter(e => e.type !== 'DUMMY' && !e.dead);
  let tgt = null, bd = 1e9; for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; tgt = e; } }
  if (!tgt) { const G = g.portal; if (G && G.state !== 'sealed') { it.mx = G.x - p.x; it.my = G.y - p.y; } return it; }   // boss xong: đi vào cổng
  // hết năng lượng trong trận boss: đi đập thùng mana của đấu trường (thùng không phải quái, nhưng đánh thường phá được)
  if (g.boss && p.energy < 35) { let cb = null, cd = 1e9; for (const o of g.world.temp) if (o.supply && !o.dead) { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < cd) { cd = d; cb = o; } } if (cb) { tgt = { x: cb.x, y: cb.y, crate: true }; bd = cd; } }
  const range = tgt.crate ? (p.cls === 'KNIGHT' ? 40 : 150) : tgt.boss ? 260 : p.cls === 'KNIGHT' ? 70 : 240, dx = tgt.x - p.x, dy = tgt.y - p.y;
  let mx = 0, my = 0;
  if (bd > range) { mx = dx; my = dy; } else if (bd < range * 0.7) { mx = -dx; my = -dy; } else { mx = -dy; my = dx; }
  for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 90 && !e.boss) { mx -= (e.x - p.x) / d * 60; my -= (e.y - p.y) / d * 60; } }
  // né hazard của boss
  let danger = false;
  for (const h of g.hazards) {
    if (h.done && !h.active) continue;
    const d = Math.hypot(h.x - p.x, h.y - p.y);
    if (h.kind === 'circle' && d < h.r + 30) { mx += (p.x - h.x) / (d || 1) * 200; my += (p.y - h.y) / (d || 1) * 200; if (h.t < 0.25) danger = true; }
    if (h.kind === 'arc' && d < h.r + 30) { mx += (p.x - h.x) / (d || 1) * 150; my += (p.y - h.y) / (d || 1) * 150; if (h.t < 0.25) danger = true; }
    if ((h.kind === 'rect' || h.kind === 'line') && h.t < 0.3) danger = true;
    if (h.active && Math.abs(d - h.rr) < 60) danger = true;
  }
  for (const f of g.foes) { const d = Math.hypot(f.x - p.x, f.y - p.y); if (d < 90) { mx += -f.vy; my += f.vx; if (d < 40) danger = true; } }
  if (g.boss && g.boss.dashing && bd < 220) danger = true;
  it.mx = mx; it.my = my; it.ax = tgt.x; it.ay = tgt.y; it.cx = tgt.x; it.cy = tgt.y; it.fire = bd < range + 40;
  it.dash = danger || foes.some(e => e.state === 'charge' && Math.hypot(e.x - p.x, e.y - p.y) < 140);
  if (SHOP) { if (p.hp < p.max * 0.35 && p.potions.hp) it.potion = 'hp'; else if (g.boss && p.energy < 25 && p.potions.en) it.potion = 'en'; }
  if (!skill || g.t % 0.25 > 1 / 60) return it;
  // dùng chiêu: ưu tiên chiêu 3 nguyên tố, rồi ô ngẫu nhiên đủ energy (mỗi ô 1 phím)
  const opts = [];
  for (let i = 0; i < 4; i++) { const c = p.cores[i]; if (c && p.energy >= g.coreSkill(c).cost) opts.push([i, c]); }
  const big = opts.find(([, c]) => c.type === 'tri' || c.type === 'inf');
  if (big) it.slots = [big[0]]; else if (opts.length) it.slots = [opts[Math.floor(g.rand() * opts.length)][0]];
  return it;
}
// ghép tham lam trong túi: 3 đơn khác nhau → tuyệt kỹ, đôi + đơn → truyền, 2 đơn khác nhau → đôi
function autoMerge(g) {
  const inv = g.p.cores, idx = f => inv.map((c, i) => c && f(c) ? i : -1).filter(i => i >= 0);
  for (let guard = 0; guard < 6; guard++) {
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
function rewards(g) {
  while (g.state === 'reward') {
    const r = g.rewards[0];
    if (r.type === 'minor') { if (!r.choices.length) g.finishReward(); else g.pickMinor(r.choices[Math.floor(g.rand() * r.choices.length)].id); }
    else {
      const aw = r.choices.find(c => c.type === 'awaken');
      g.pickMajor(aw || r.choices[0]);
    }
  }
  autoMerge(g);
}
function run(cls, el, seed, skill = true) {
  const g = new Game(seed, cls, { element: el }); const dt = 1 / 60; let bossTimes = {}, bossStart = 0;
  while (!g.over && g.t < 4500) {
    if (g.state === 'reward') { if (bossStart) { bossTimes[g.stage] = Math.round(g.t - bossStart); bossStart = 0; } rewards(g); continue; }
    const st = g.stage;
    if (SHOP && g.forge && g.shopped !== st) { g.shopped = st; shop(g); }
    if (BOSS_STAGES[st] !== undefined && !bossStart) bossStart = g.t;
    g.step(dt, bot(g, skill)); g.events.length = 0;
    if (g.stage !== st && bossStart) { bossTimes[st] = Math.round(g.t - bossStart); bossStart = 0; }
  }
  return { stage: g.stage, won: g.won, t: Math.round(g.t), casts: g.casts, owned: g.p.owned.size, merges: g.merges, bar: g.p.cores.slice(0, 4).map(c => c ? c.type : '-').join(''), bossTimes, bossHp: g.boss ? Math.round(100 * g.boss.hp / g.boss.max) : null };
}
const N = +(process.argv.find(a => /^\d+$/.test(a)) || 6);
console.log('Lớp'.padEnd(8), 'Bắt đầu'.padEnd(8), 'stage TB'.padEnd(9), 'thắng'.padEnd(6), 'chết ở boss', '  thời gian hạ boss (s)');
for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) for (const el of ['FIRE', 'WATER']) {
  let st = 0, w = 0, atBoss = 0; const bt = {};
  const hps = []; for (let s = 1; s <= N; s++) { const r = run(cls, el, s); if (r.bossHp !== null && !r.won) hps.push(r.bossHp + '%@S' + r.stage); st += r.stage; if (r.won) w++; if (BOSS_STAGES[r.stage] !== undefined && !r.won) atBoss++; for (const k in r.bossTimes) (bt[k] = bt[k] || []).push(r.bossTimes[k]); }
  console.log(cls.padEnd(8), el.padEnd(8), (st / N).toFixed(1).padEnd(9), `${w}/${N}`.padEnd(6), `${atBoss}/${N}`.padEnd(12), Object.entries(bt).map(([k, v]) => 'S' + k + ':' + Math.round(v.reduce((a, b) => a + b, 0) / v.length)).join(' '), '  boss còn:', hps.join(','));
}
