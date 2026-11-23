// Reroll (3 miễn phí rồi tốn gem), hồi sinh 1 lần, gem boss lần đầu/lặp lại, nhiệm vụ ngày, hòm trang trí.
import { Game } from '../game.js';
import * as PR from '../profile.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const g = new Game(3, 'KNIGHT', { element: 'FIRE' }); g.clearStage();
const costs = []; for (let i = 0; i < 6; i++) { costs.push(g.rerollCost()); g.rerollReward(g.rerollCost() > 0); }
ok(costs.join(',') === '0,0,0,5,8,12', 'reroll costs: ' + costs.join(','));
g.over = true; ok(g.revive() && !g.over && g.p.hp > 0, 'revive works once'); g.over = true; ok(!g.revive(), 'second revive is refused');
PR.reset(); const a = PR.bossDefeated('COLOSSUS'), b = PR.bossDefeated('COLOSSUS'); ok(a === 25 && b === 3 && PR.P.gems === 38, `titan gems first ${a}, repeat ${b}, +10 first-titan achievement = ${PR.P.gems}`);
PR.rollQuests(true); const q = PR.P.quests.list[0]; for (let i = 0; i < q.goal; i++) PR.track(q.id); ok(PR.claimQuest(0) === q.reward, 'daily quest completes and pays ' + q.reward);
PR.P.gems = 1000; const seen = new Set(); let dups = 0; for (let i = 0; i < 30; i++) { const r = PR.openChest(); if (r.dup) dups++; else seen.add(r.kind + r.id + (r.cls || '')); }
ok(seen.size > 0 && seen.size + dups === 30, `chest gives cosmetics (${seen.size} new, ${dups} refunded duplicates)`);
ok(!PR.spend(99999), 'cannot spend more gems than you have');
PR.reset(); process.exitCode = fail ? 1 : 0;
