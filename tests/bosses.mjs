// Mỗi boss chạy 60s (người chơi bất tử, liên tục dùng chiêu khống chế), ép qua mọi pha. Ghi đòn đã ra, số lần vỡ thế đứng, đòn trúng.
import { Game } from '../game.js';
for (const [stage, idx] of [[5, 0], [10, 1], [15, 2], [20, 3], [25, 4]]) {
  const g = new Game(11, 'MAGE', { element: 'WATER' });
  g.p.owned = new Set(['FIRE', 'WATER', 'EARTH', 'WIND']); g.refreshStats(true);
  g.startStage(stage);
  const moves = new Set(), hz = new Set(); let staggers = 0, phases = 0, hits = 0, t = 0, noGap = 0;
  while (t < 60 && g.boss && !g.boss.dead) {
    const b = g.boss, frac = t / 60;
    if (b.def.phases[1] && frac > 0.35 && b.phase === 0) b.hp = b.max * (b.def.phases[1].at - 0.01);
    if (b.def.phases[2] && frac > 0.7 && b.phase === 1) b.hp = b.max * (b.def.phases[2].at - 0.01);
    g.p.hp = g.p.max; g.p.inv = 0;
    const it = { ax: b.x, ay: b.y, cx: b.x, cy: b.y };
    if (Math.round(t * 60) % 30 === 0) { ['FIRE','WATER','EARTH','WIND'].forEach((el, i) => { g.p.cores[i] = i < 2 ? { type: 'el', el } : { type: 'duo', els: [el, 'FIRE'] }; }); it.slots = [Math.floor(Math.random() * 4)]; }
    g.step(1 / 60, it);
    for (const h of g.hazards) if (h.kind === 'ring' && h.dmg > 0 && h.gapW) noGap++;
    for (const e of g.events) { if (e.ev === 'bossStagger') staggers++; if (e.ev === 'bossPhase') phases++; if (e.ev === 'hurt') hits++; }
    g.events.length = 0;
    if (g.boss) moves.add(g.boss.last); for (const h of g.hazards) hz.add(h.kind);
    t += 1 / 60;
  }
  console.log(`S${stage} ${g.boss ? g.boss.def.name : '?'}: moves=[${[...moves].filter(Boolean).join(',')}] hazards=[${[...hz].join(',')}] phases=${phases} staggers=${staggers} playerHits=${hits} openRings=${noGap} bossHp=${g.boss ? Math.round(100 * g.boss.hp / g.boss.max) + '%' : 'dead'}`);
}
