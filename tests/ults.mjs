// 12 chiêu ghép 3 nguyên tố (4 bộ × 3 lớp), không phụ thuộc thứ tự ghép: mỗi chiêu gây sát thương, dọn sạch sau khi xong.
// Bản rèn: đồng hồ cát miễn sát thương rồi dịch chuyển tới chỗ an toàn; tàng hình làm boss nhắm lệch; slow motion làm chậm quái.
import { Game } from '../game.js';
import { ULT_TABLE, triDef, TRI_SETS } from '../kits.js';
import { ULT_IDS } from '../ults.js';
import { BOSS_STAGES } from '../game.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };
const CLS = ['KNIGHT', 'RANGER', 'MAGE'];
const all = CLS.flatMap(cls => TRI_SETS.map(set => ({ cls, set, d: triDef(cls, set) })));
ok(all.length === 12 && new Set(all.map(x => x.d.key)).size === 12, '12 merge-3 skills in the whole game (4 per class)');
ok(new Set(all.map(x => x.d.ult)).size === 12 && new Set(all.map(x => x.d.name)).size === 12, 'each has its own mechanic and name');
ok(all.every(x => ULT_IDS.includes(x.d.ult)), 'every one has a mechanic in ults.js');
ok(Object.values(ULT_TABLE).every(t => Object.keys(t).length === 4), 'ULT_TABLE keeps 4 per class');
// mọi hoán vị của một bộ ra cùng chiêu
const perms = a => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(r => [x, ...r]));
let same = true; for (const { cls, set, d } of all) for (const pm of perms(set)) { const e = triDef(cls, pm); if (e.key !== d.key || e.name !== d.name || e.slam?.dmg !== d.slam?.dmg) same = false; }
ok(same, 'all 6 orders of the same three elements give the same skill');
for (const forged of [false, true]) for (const { cls, set, d } of all) {
  const g = new Game(3, cls, { training: true, lab: true }); g.labGod = true; g.enemies = [];
  for (let i = 0; i < 8; i++) g.spawnAt('GRUNT', g.p.x + 150 + (i % 4) * 60, g.p.y - 90 + Math.floor(i / 4) * 120);
  for (const e of g.enemies) { e.spawn = 0; e.hp = e.max = 4000; }
  if (forged) g.p.forged.add(d.key);
  const sk = g.coreSkill({ type: 'tri', els: set.slice().reverse() }), hp0 = g.enemies.reduce((s, e) => s + e.hp, 0);
  if (!forged) ok(sk.cost <= g.p.energyMax, `${cls} ${d.name}: costs ${sk.cost} (max energy ${g.p.energyMax})`);
  g.p.energy = g.p.energyMax; let err = null;
  try { g.castNow(sk, g.p.x + 250, g.p.y); for (let i = 0; i < 60 * (forged ? 9.5 : 8); i++) { if (cls === 'KNIGHT' && i % 30 === 0) g.basicAttack(0); g.step(1 / 60, { ax: g.p.x + 250, ay: g.p.y }); } } catch (e) { err = e.message; }
  const dmg = Math.round(hp0 - g.enemies.reduce((s, e) => s + (e.dead ? 0 : e.hp), 0));
  ok(!err && dmg > 400 && g.ults.length === 0 && !!sk.forged === forged, `${forged ? 'Forged ' : ''}${cls} ${d.name}: ${dmg} damage, cleaned up${err ? ' ERR ' + err : ''}`);
}
// Monsoon Dance trúng 5 mục tiêu; Titan giảm sát thương
{ const g = new Game(4, 'KNIGHT', { training: true, lab: true }); g.enemies = []; for (let i = 0; i < 6; i++) g.spawnAt('GRUNT', g.p.x + Math.cos(i) * 220, g.p.y + Math.sin(i) * 220); for (const e of g.enemies) { e.spawn = 0; e.hp = e.max = 4000; }
  g.p.energy = 999; g.castNow(g.coreSkill({ type: 'tri', els: ['WIND', 'FIRE', 'WATER'] }), g.p.x + 100, g.p.y); for (let i = 0; i < 120; i++) g.step(1 / 60, {});
  ok(g.enemies.filter(e => e.hp < 4000).length >= 5, 'Monsoon Dance strikes 5 different foes'); }
{ const g = new Game(5, 'KNIGHT', { training: true, lab: true }); g.p.energy = 999; g.castNow(g.coreSkill({ type: 'tri', els: ['EARTH', 'FIRE', 'WATER'] }), g.p.x + 100, g.p.y); g.step(1 / 60, {});
  const hp0 = g.p.hp; g.hurtPlayer(40, 0, { boss: true }); ok(g.p.giant > 0 && hp0 - g.p.hp <= 20 * g.diff.dmg + 0.01, 'Mountain Titan: giant form halves damage taken'); }
// mọi tuyệt kỹ (thường + rèn) xong là nhân vật đứng lại trên mặt đất, hết khổng lồ/bay (lỗi cũ: Sunder để người treo lơ lửng)
{ const bad = [];
  for (const forged of [false, true]) for (const { cls, set, d } of all) {
    const g = new Game(6, cls, { training: true, lab: true }); g.labGod = true; g.enemies = [];
    for (let i = 0; i < 4; i++) g.spawnAt('GRUNT', g.p.x + 160 + i * 50, g.p.y); for (const e of g.enemies) { e.spawn = 0; e.hp = e.max = 9000; }
    if (forged) g.p.forged.add(d.key);
    const sk = g.coreSkill({ type: 'tri', els: set.slice() }); g.p.energy = 999; g.castNow(sk, g.p.x + 200, g.p.y);
    for (let i = 0; i < 60 * 10; i++) g.step(1 / 60, { ax: g.p.x + 200, ay: g.p.y });
    const p = g.p; if (p.z !== 0 || p.ultLift > 0 || p.giant > 0 || p.ultMove || p.leap) bad.push(`${forged ? 'forged ' : ''}${d.name} z=${p.z.toFixed(1)}`);
  }
  ok(bad.length === 0, 'every ultimate (normal + forged) ends with the hero back on the ground' + (bad.length ? ' — stuck: ' + bad.join(', ') : '')); }

// ---------- hệ phòng thủ trong trận boss thật ----------
const bossGame = (cls, stage = 20) => { const g = new Game(11, cls); g.startStage(stage); for (let i = 0; i < 120; i++) g.step(1 / 60, {}); return g; };
// Đồng hồ cát (Solar Flare rèn): không mất máu kể cả đòn kiểu Last Flame, rồi đứng ở điểm ngoài mọi vùng bẫy
{ const g = bossGame('MAGE'), p = g.p, set = ['FIRE', 'WATER', 'EARTH'];
  p.forged.add(triDef('MAGE', set).key); p.energy = 999; const hp0 = p.hp;
  g.castNow(g.coreSkill({ type: 'tri', els: set }), p.x + 150, p.y);
  ok(p.goldT > 2, 'Sundial: casting turns you to gold');
  // đòn ép trúng giữa lúc hoá vàng, kể cả đòn đặt inv=0 để đánh xuyên
  g.hazards.push({ kind: 'circle', x: p.x, y: p.y, r: 120, t: 0.2, T: 0.2, hold: 0, dmg: 60, owner: g.boss });
  g.step(1 / 60, {}); const iv = p.inv; p.inv = 0; g.hurtPlayer(80, 0, { boss: true }); p.inv = Math.max(p.inv, iv);
  let lost = 0; for (let i = 0; i < 60; i++) { const h = p.hp; g.step(1 / 60, {}); lost += Math.max(0, h - p.hp); }
  ok(lost === 0 && p.hp >= hp0 - 0.01, `Sundial: no damage while golden (lost ${lost.toFixed(1)})`);
  // bẫy quanh chỗ đứng ngay trước khi hết vàng → phải dịch chuyển ra ngoài
  console.log("     goldT left", p.goldT.toFixed(2)); for (let i = 0; i < 200 && p.goldT > 0.3; i++) g.step(1 / 60, {});
  const ox = p.x, oy = p.y; g.hazards.push({ kind: 'circle', x: ox, y: oy, r: 150, t: 3, T: 3, hold: 0, dmg: 60, owner: g.boss });
  for (let i = 0; i < 60 && p.goldT > 0; i++) g.step(1 / 60, {});
  const moved = Math.hypot(p.x - ox, p.y - oy), A = g.arena;
  ok(p.goldT === 0 && moved > 150 && (!A || Math.hypot(p.x - A.x, p.y - A.y) < A.r), `Sundial: teleported ${Math.round(moved)}px out of the danger zone, still in the arena`); }
// Tàng hình (Thunderhead rèn): boss nhắm vào bóng ma, không phải người chơi; đòn kế tiếp ×2.5
{ const g = bossGame('MAGE'), p = g.p, b = g.boss, set = ['FIRE', 'WATER', 'WIND'];
  p.forged.add(triDef('MAGE', set).key); p.energy = 999;
  g.castNow(g.coreSkill({ type: 'tri', els: set }), b.x, b.y);
  ok(p.stealthT > 3 && p.crit && p.crit.mult === 2.5, 'Storm Veil: you vanish and your next attack is a ×2.5 crit');
  // so với đối chứng không tàng hình: trùm cuối (vùng tròn/chữ nhật đặt sẵn toạ độ) — đòn rơi xa người chơi hơn hẳn
  const seen0 = { ...p.seen };
  const aimDist1 = (hide, seed) => { const q = new Game(seed, 'MAGE'); q.startStage(25); q.labGod = true; for (let i = 0; i < 90; i++) q.step(1 / 60, {}); const B = q.boss, P = q.p; if (hide) { P.stealthT = 99; P.seen = { x: P.x, y: P.y, t: 0 }; } const px = P.x - 300, py = P.y + 120;
    let s = 0, n = 0; for (let i = 0; i < 60 * 5; i++) { if (B.busy <= 0) B.idle = 0; const n0 = q.hazards.length; P.x = px; P.y = py; q.step(1 / 60, {}); P.x = px; P.y = py; for (const h of q.hazards.slice(n0)) if ((h.kind === 'circle' || h.kind === 'rect') && h.x !== undefined && h.owner === B) { s += Math.hypot(h.x - P.x, h.y - P.y); n++; } } return [n ? s / n : 0, n]; };
  const aimDist = hide => { let s = 0, n = 0; for (const sd of [13, 14, 15]) { const [d, k] = aimDist1(hide, sd); s += d * k; n += k; } return [n ? s / n : 0, n]; }; // trung bình nhiều seed: không phụ thuộc một địa hình
  const [dh, nh] = aimDist(true), [dv, nv] = aimDist(false);
  ok(nh >= 3 && nv >= 3 && dh > dv * 1.5 && dh > 200, `Stealth: titan attacks land ${Math.round(dh)}px from you on average (visible: ${Math.round(dv)}px; ${nh}/${nv} attacks)`);
  ok(Math.hypot(g.hidePt ? g.hidePt.x - seen0.x : 0, g.hidePt ? g.hidePt.y - seen0.y : 0) < 200 || p.stealthT <= 0, 'the titan hunts near where you vanished');
  const e = b; p.res = null; p.stealthT = 1; p.crit = { mult: 2.5, t: Infinity, stealth: true }; const h0 = e.hp; e.stagger = 0; e.invuln = 0; g.hurtEnemy(e, 40, 0, 0, 'skill');
  ok(Math.abs((h0 - e.hp) - 100) < 1 && !p.crit && p.stealthT === 0, `the first hit after stealth deals ×2.5 (${Math.round(h0 - e.hp)}) and reveals you`); }
// Slow motion (Monsoon rèn): quái đi được ~35% quãng đường
{ const run = slow => { const g = new Game(8, 'KNIGHT'); g.startStage(3); g.enemies = []; const e = g.spawnAt('GRUNT', g.p.x + 500, g.p.y); e.spawn = 0; if (slow) g.p.slowmoT = 5; const x0 = e.x; for (let i = 0; i < 60; i++) g.step(1 / 60, {}); return Math.abs(e.x - x0); };
  const n = run(false), s = run(true); ok(s / n > 0.25 && s / n < 0.45, `Slow motion: enemies move ${Math.round(s / n * 100)}% as far`); }
process.exitCode = fail ? 1 : 0;
