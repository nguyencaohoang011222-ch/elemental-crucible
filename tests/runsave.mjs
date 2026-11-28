// Lưu tiến trình lượt chơi: chụp trước khi vào stage mới, khôi phục ra Game đúng stage, giữ lõi / nâng cấp / vàng / relic.
import { Game } from '../game.js';
import { snapshotRun, restoreRun, validRun } from '../runsave.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };

const g = new Game(4242, 'KNIGHT', { element: 'WATER', difficulty: 'HARD' });
let saved = null; g.onStageSave = n => { saved = JSON.parse(JSON.stringify(snapshotRun(g, n))); };
g.addCore({ type: 'el', el: 'FIRE' }); g.p.gold = 321; g.p.relics.add('blood'); g.p.forged.add('FIRE'); g.discovered.add('x');
g.upgrades.power = 2; g.p.mods.dmg = 1.2544; g.p.mods.elDmg.FIRE = 1.2; g.upgradeLog.push('Arcane Power'); g.t = 123.4; g.kills = 17; g.p.hp = 50;
g.stage = 4; g.state = 'reward'; g.rewards = [{ type: 'minor', choices: [] }];
g.pickMinor(null);
ok(g.stage === 5 && saved && saved.stage === 5, 'snapshot taken right before stage 5');
ok(validRun(saved), 'snapshot is a valid run');
const r = restoreRun(saved, { skin: '' });
ok(r.stage === 5 && !!r.boss, 'restored game starts at stage 5 (boss)');
ok(r.p.cls === 'KNIGHT' && r.difficulty === 'HARD' && r.diff.hp === 1.4 && r.brutal, 'class + difficulty kept');
ok(r.p.cores[0].el === 'WATER' && r.p.cores[1].el === 'FIRE' && r.p.owned.has('FIRE'), 'cores + owned elements kept');
ok(r.p.gold === 321 && r.p.relics.has('blood') && r.p.forged.has('FIRE') && r.discovered.has('x'), 'gold, relics, forged, discovered kept');
ok(r.upgrades.power === 2 && Math.abs(r.p.mods.dmg - 1.2544) < 1e-9 && r.p.mods.elDmg.FIRE === 1.2 && r.upgradeLog.includes('Arcane Power'), 'upgrades + mods kept');
ok(Math.abs(r.t - 123.4) < 1e-9 && r.kills === 17, 'run time + kills kept');
ok(r.p.energy === r.p.energyMax, 'boss stage refills energy');
// stage thường: máu giữ đúng như lúc lưu
const s2 = { ...saved, stage: 6 }; const r2 = restoreRun(s2);
ok(r2.stage === 6 && !r2.boss && r2.spawnQ.length > 0 && r2.p.hp === 50, 'normal stage restore keeps HP and queues waves');
for (let i = 0; i < 120; i++) r2.step(1 / 60, {});
ok(!r2.over && r2.enemies.length + r2.sigils.length > 0, 'restored game runs and spawns enemies');
ok(!validRun(null) && !validRun({ v: 1, stage: 1, cls: 'KNIGHT', p: { cores: [] } }), 'rejects empty / stage-1 saves');
if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
