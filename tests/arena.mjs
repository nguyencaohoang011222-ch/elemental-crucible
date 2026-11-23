// Đấu trường boss: dựng tại chỗ (không dịch chuyển), vành đá + bố cục riêng, khối cứng không phá được, thùng mana, gỡ khi boss chết.
import { Game } from '../game.js';
import { dist } from '../sim.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const EXPECT = { 5: ['COLOSSUS', 'arenarock', 4], 10: ['BEHEMOTH', 'menhir', 5], 15: ['WARDEN', 'spire', 4], 20: ['DRAGON', 'arenarock', 5], 25: ['SOVEREIGN', 'obelisk', 4] };
for (const [st, [id, key, crates]] of Object.entries(EXPECT)) {
  const g = new Game(30 + +st, 'KNIGHT', {}); g.step(1 / 60, {});
  const x0 = g.p.x, y0 = g.p.y; g.startStage(+st);
  const T = g.world.temp.filter(o => o.arena), solid = T.filter(o => o.solid), box = T.filter(o => o.supply), rim = T.filter(o => o.type === 'rimrock');
  ok(g.boss && g.boss.type === id && g.p.x === x0 && g.p.y === y0, `S${st} ${id}: arena built where the player stands (no teleport)`);
  ok(solid.some(o => o.type === key) && rim.length > 60 && box.length === crates, `S${st}: ${solid.length} solid pieces (${key}), rim ${rim.length}, ${box.length} supply crates`);
  ok(T.every(o => dist(o.x, o.y, g.p.x, g.p.y) > o.r + g.p.r), `S${st}: nothing spawns on top of the player`);
  ok(!g.world.blocked(g.boss.x, g.boss.y, g.boss.r * 0.55), `S${st}: boss stands on free ground`);
  const one = solid.find(o => o.type === key); g.world.damageObstacles(one.x, one.y, 10, 99999);
  ok(g.world.temp.includes(one), `S${st}: solid arena pieces cannot be destroyed`);
  // boss lao vào khối cứng thì bị choáng
  if (st === '5' || st === '15') { const b = g.boss; b.x = one.x - (one.r + b.r * 0.55 + 40); b.y = one.y; b.dashing = { a: 0, left: 400, speed: 900, hit: true }; b.spawn = 0; b.stagger = 0; for (let i = 0; i < 30; i++) g.step(1 / 60, {}); if (st === '5') ok(b.stagger > 0, 'Colossus (first titan) dashing into terrain crashes and staggers'); else ok(!(b.stagger > 0) && b.x > one.x - 10, 'Behemoth dashing into a menhir slides past it without being stunned'); }
  // boss chết: khối lún rồi biến mất, thùng còn lại được giữ
  g.boss.hp = 0; g.boss.dead = true; for (let i = 0; i < 60 * 8; i++) { const G = g.portal; if (G && G.state !== 'sealed') { g.p.x = G.x; g.p.y = G.y + 20; } g.step(1 / 60, {}); while (g.state === 'reward' && g.rewards.length) g.finishReward(); }
  if (st === '25') ok(g.won && !g.arena, 'S25: beating the final titan wins the run'); else ok(!g.world.temp.some(o => o.arena && !o.supply) && !g.arena, `S${st}: arena sinks away after the boss dies`);
}
process.exitCode = fail ? 1 : 0;
