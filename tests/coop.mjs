// Co-op 2 người (lockstep): hai bản mô phỏng nhận cùng input phải giống hệt nhau; quái mạnh theo số người; gục và hồi sinh.
import { Game, COOP } from '../game.js';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const cfgs = [{ cls: 'KNIGHT', element: 'FIRE' }, { cls: 'MAGE', element: 'WATER' }];
const hash = g => { let h = 0; const add = v => { h = (h * 31 + Math.round(v * 100)) | 0; }; for (const q of g.players) { add(q.x); add(q.y); add(q.hp); add(q.energy); add(q.gold); } add(g.enemies.length); for (const e of g.enemies) { add(e.x); add(e.y); add(e.hp); } add(g.stage); add(g.t); return h; };

// dữ liệu riêng từng người
const g = Game.coop(77, cfgs);
ok(g.coop && g.players.length === 2 && g.players[1].cls === 'MAGE', 'two players in one game');
ok(g.players[0].cores[0].el === 'FIRE' && g.players[1].cores[0].el === 'WATER', 'each player has their own starting core');
g.as(g.players[1], () => { g.upgrades.swift = 1; }); ok(!g.upgrades.swift && g.players[1]._upgrades.swift === 1, 'per-player fields stay separate');

// quái mạnh hơn theo số người
const solo = new Game(77, 'KNIGHT', { element: 'FIRE' });
ok(g.spawnQ.length > solo.spawnQ.length, 'more enemies with two players (' + g.spawnQ.length + ' vs ' + solo.spawnQ.length + ')');
const e1 = g.spawnAt('GRUNT', 0, 0), e0 = solo.spawnAt('GRUNT', 0, 0);
ok(Math.abs(e1.max / e0.max - (1 + COOP.hp)) < 1e-9, 'enemy HP x' + (1 + COOP.hp) + ' with two players');
g.enemies = g.enemies.filter(e => e !== e1); solo.enemies = [];

// lockstep: hai máy, cùng input, phải ra cùng trạng thái
const A = Game.coop(4242, cfgs), B = Game.coop(4242, cfgs);
let seed = 9; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let same = true, bad = -1;
for (let f = 0; f < 3600; f++) {
  const its = [0, 1].map(i => { const q = A.players[i], e = A.enemies[0]; return { mx: Math.round((rnd() - 0.5) * 2), my: Math.round((rnd() - 0.5) * 2), ax: e ? e.x : q.x + 100, ay: e ? e.y : q.y, fireHeld: rnd() < 0.6, fire: rnd() < 0.1, dash: rnd() < 0.01, slots: rnd() < 0.02 ? [0] : [] }; });
  const copy = JSON.parse(JSON.stringify(its));
  for (const q of A.players) q.hp = Math.max(q.hp, 30); for (const q of B.players) q.hp = Math.max(q.hp, 30);
  A.stepCoop(1 / 60, its); B.stepCoop(1 / 60, copy);
  if (A.state === 'reward') for (const G of [A, B]) for (const q of G.players) G.as(q, () => { while (G.rewards.length) { const r = G.rewards[0]; if (r.type === 'minor') G.pickMinor(r.choices[0] && r.choices[0].id); else G.pickMajor(r.choices[0]); } });
  if (hash(A) !== hash(B)) { same = false; bad = f; break; }
  A.events.length = 0; B.events.length = 0;
}
ok(same, 'two machines with the same inputs stay identical for 60 s' + (bad >= 0 ? ' (diverged at frame ' + bad + ')' : ''));
ok(A.stage >= 2, 'the co-op run progresses through stages (stage ' + A.stage + ')');
ok(A.players.every(q => Math.hypot(q.x - A.players[0].x, q.y - A.players[0].y) < 2000), 'both players move in the same world');

// địch nhắm cả hai người
const T = Game.coop(5, cfgs); T.spawnQ = []; T.enemies = []; T.sigils = [];
const [p1, p2] = T.players; p2.x = p1.x + 600; p2.y = p1.y;
const n1 = T.spawnAt('GRUNT', p1.x + 80, p1.y), n2 = T.spawnAt('GRUNT', p2.x + 80, p2.y); n1.spawn = n2.spawn = 0;
for (let i = 0; i < 60; i++) T.stepCoop(1 / 60, [{}, {}]);
ok(n1.tgt === p1 && n2.tgt === p2, 'each enemy chases the nearest player');
ok(Math.hypot(n2.x - p2.x, n2.y - p2.y) < 120, 'the far enemy goes after player 2');

// gục và hồi sinh
const D = Game.coop(6, cfgs); D.spawnQ = []; D.enemies = []; D.sigils = [];
const [d1, d2] = D.players; D.as(d2, () => D.hurtPlayer(9999, 0));
ok(d2.down && !D.over, 'a player at 0 HP goes down, the run goes on');
d1.x = d2.x + 30; d1.y = d2.y; for (let i = 0; i < 60 * (COOP.revive + 0.2); i++) D.stepCoop(1 / 60, [{}, {}]);
ok(!d2.down && d2.hp > 0, 'standing next to a downed partner revives them');
D.as(d2, () => { d2.inv = 0; D.hurtPlayer(9999, 0); }); D.as(d1, () => { d1.inv = 0; D.hurtPlayer(9999, 0); });
ok(D.over, 'the run ends when both are down');

// thưởng: chờ cả hai chọn xong
const R = Game.coop(8, cfgs); R.spawnQ = []; R.enemies = []; R.sigils = []; R.clearStage();
ok(R.state === 'reward' && R.players.every(q => q._rewards.length), 'both players get reward cards');
R.as(R.players[0], () => R.pickMinor(R.rewards[0].choices[0].id)); while (R.as(R.players[0], () => R.rewards.length)) R.as(R.players[0], () => R.pickMajor(R.rewards[0].choices[0]));
ok(R.state === 'reward', 'the next stage waits for the partner');
R.as(R.players[1], () => { while (R.rewards.length) { const r = R.rewards[0]; if (r.type === 'minor') R.pickMinor(r.choices[0].id); else R.pickMajor(r.choices[0]); } });
ok(R.state === 'fight' && R.stage === 2, 'once both choose, the next stage starts');
if (fail) { console.log(fail + ' failed'); process.exit(1); } else console.log('all passed');
