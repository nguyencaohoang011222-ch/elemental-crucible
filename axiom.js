// Axiom, Chủ Khối (đang thử trong Test Lab): chuỗi chém, Mặt cắt trễ (nhả đúng nhịp), Gập, Né gương, Đàn Khối.
// Logic thuần, chạy được trong test. Thiết kế: xem tài liệu "Axiom, Chủ Khối".
export const AX = { CUBES: 8, START: 3, WINDOW: 0.2, PLANE_LEN: 270, PLANE_MAX: 4, PLANE_LIFE: 6, PLANE_W: 30, PLANE_DMG: 46, BOX: 1.5, FOLD_DELAY: 0.3, DODGE_T: 0.22, DECOY: 1.5, BLOCK_R: 40,
  // Ảo: tài nguyên cho các chiêu thực tại giả
  ILL: 100, ILL_DODGE: 25, ILL_CUT: 12, ILL_FOLD: 6, ILL_HIT: 2, LAB_REGEN: 8,
  HOLD: 0.22, HOLD_SLOW: 0.8, SWAP: 30, SWAP2: 40, CONFUSE: 50, CONFUSE_R: 260, CONFUSE_T: 3,
  // Rapid Slash: nhả tụ đầy thì lao đi chém xoay; Thuấn Trảm: giữ tụ đầy thêm STOP_HOLD giây thì dừng thời gian
  RUSH_T: 0.3, RUSH_HITS: [0.1, 0.22], RUSH_R: 86, RUSH_DMG: 24, STOP_HOLD: 1.0, STOP_LEN: 300, STOP_W: 46, SEVER: 105,
  STOP: { fade: 0.3, walk: 1.5, slash: 1.62, sheath: 1.78, end: 2.15 },
  MIRROR_HP: 0.35, MIRROR_BOSS: 0.08, MIRROR_STOP: 1.1, MIRROR_LAB_CD: 20 };

const hyp = Math.hypot;
export const axState = p => p.ax || (p.ax = { cubes: AX.START, planes: [], fullT: 0, foldT: 0, dodgeT: 0, dodged: false, blockCd: 0, from: null, illusion: 0, press: null, brokeStage: null, brokeAt: -999, init: false });
const gain = (A, v) => { A.illusion = Math.min(AX.ILL, A.illusion + v); };
export function segDist(x, y, w) {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1, L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / L));
  return hyp(x - w.x1 - dx * t, y - w.y1 - dy * t);
}

// có đòn nào sắp chạm người chơi không (dùng lúc bắt đầu dash)
export function threatened(g) {
  const p = g.p;
  for (const s of g.foes || []) {
    if (!(s.life > 0)) continue;
    const rx = p.x - s.x, ry = p.y - s.y, v2 = (s.vx || 0) ** 2 + (s.vy || 0) ** 2; if (!v2) continue;
    const t = (rx * s.vx + ry * s.vy) / v2; if (t < 0 || t > 0.22) continue;
    if (hyp(rx - s.vx * t, ry - s.vy * t) < (s.r || 6) + p.r + 8) return true;
  }
  for (const h of g.hazards || []) if (h.kind === 'circle' && !h.done && h.t > 0 && h.t < 0.25 && hyp(p.x - h.x, p.y - h.y) < h.r + p.r) return true;
  for (const e of g.enemies) {
    if (e.dead) continue; const d = hyp(p.x - e.x, p.y - e.y) - e.r - p.r;
    if ((e.state === 'tele' && e.st < 0.22 && d < 95) || (e.state === 'charge' && d < 55)) return true;
  }
  return false;
}

// né gương: để lại bóng giả hút địch, thưởng 1 Khối
export function mirrorDodge(g) {
  const p = g.p, A = axState(p); if (A.dodged) return false;
  A.dodged = true; const f = A.from || { x: p.x, y: p.y };
  p.lure = { x: f.x, y: f.y }; p.lureT = Math.max(p.lureT || 0, AX.DECOY);
  A.cubes = Math.min(AX.CUBES, A.cubes + 1); gain(A, AX.ILL_DODGE); g.hitstop = Math.max(g.hitstop, 0.08);
  g.emit('axDodge', { x: f.x, y: f.y, face: p.face, t: AX.DECOY });
  return true;
}
export function axiomDash(g) {
  const p = g.p, A = axState(p); A.dodgeT = AX.DODGE_T; A.dodged = false; A.from = { x: p.x, y: p.y };
  if (threatened(g)) mirrorDodge(g);
}

export function axiomTick(g, dt, it) {
  const p = g.p, A = axState(p);
  if (!A.init) { A.init = true; if (g.lab) A.illusion = AX.ILL; }
  if (g.lab) gain(A, AX.LAB_REGEN * dt);
  A.dodgeT = Math.max(0, A.dodgeT - dt);
  if (A.needRelease && !it.fireHeld && p.charge === 0) A.needRelease = false;
  if (A.needRelease && it.fireHeld) p.charge = 0;   // vừa Thuấn Trảm xong: phải thả nút mới tụ lại
  if (A.rush) rushTick(g, dt);
  if (p.charge >= 1 && it.fireHeld && A.fullT >= AX.STOP_HOLD) { startStop(g); return; } A.blockCd = Math.max(0, A.blockCd - dt);
  // thời gian đã giữ ở mức tụ đầy: nhả trong WINDOW giây là đúng nhịp
  if (p.charge >= 1) { if (it.fireHeld) { const was = A.fullT; A.fullT += dt; if (was === 0) g.emit('axReady', { x: p.x, y: p.y }); } } else A.fullT = 0;
  for (const w of A.planes) w.t -= dt;
  A.planes = A.planes.filter(w => w.t > 0 || A.foldT > 0);
  // Gập: tra kiếm, sau một nhịp mọi mặt cắt cùng nổ
  // nút Không gian: chạm = gập mặt cắt; giữ rồi thả = Hoán Vị / Nhiễu Thực Tại tuỳ chỗ ngắm
  spaceInput(g, dt, it);
  if (A.foldT > 0) { A.foldT -= dt; if (A.foldT <= 0) { A.foldT = 0; fold(g); } }
  // Đàn Khối đỡ đạn: mỗi lần đỡ mất một khối
  if (A.cubes > 0 && A.blockCd <= 0) for (const s of g.foes || []) {
    if (!(s.life > 0) || hyp(s.x - p.x, s.y - p.y) > AX.BLOCK_R + (s.r || 6)) continue;
    s.life = 0; s.landed = true; A.cubes--; A.blockCd = 0.3; g.emit('axBlock', { x: s.x, y: s.y }); break;
  }
}
function fold(g) {
  const p = g.p, A = axState(p), planes = A.planes, box = planes.length >= AX.PLANE_MAX, dmg = AX.PLANE_DMG * (box ? AX.BOX : 1) * (p.basicMul || 1);
  A.planes = []; let hits = 0; const struck = new Set();
  for (const w of planes) for (const e of g.enemies) {
    if (e.dead || segDist(e.x, e.y, w) > AX.PLANE_W + e.r) continue;
    g.hurtEnemy(e, dmg, Math.atan2(w.y2 - w.y1, w.x2 - w.x1) + Math.PI / 2, 260, 'blast'); hits++; struck.add(e);
  }
  gain(A, AX.ILL_FOLD * struck.size);
  g.hitstop = Math.max(g.hitstop, box ? 0.12 : 0.06);
  g.emit('axFold', { planes: planes.map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })), box, hits });
}

// đòn đánh: c = 0 là chuỗi 3 đòn, c > 0 là đòn tụ
export function axiomAttack(g, c) {
  const p = g.p, A = axState(p), M = p.mods || {}, bm = p.basicMul || 1, as = p.atkSpeed || 1, sz = M.atkSize || 1;
  if (A.needRelease) { A.needRelease = false; return; }
  const perfect = c >= 1 && A.fullT <= AX.WINDOW; A.fullT = 0;
  let reach, arc, dmg, kb, big = false;
  if (c === 0) {
    p.combo = (p.combo % 3) + 1; p.comboT = 0.7; big = p.combo === 3;
    reach = big ? 126 : 100; arc = big ? 2.2 : 1.3; dmg = (big ? 20 : 11) * bm; kb = big ? 420 : 180;
    p.atkT = (big ? 0.48 : 0.27) / as; p.swing = 0.15; p.vx += Math.cos(p.aim) * (big ? 280 : 190); p.vy += Math.sin(p.aim) * (big ? 280 : 190);
  } else {
    big = true; reach = 118 + 70 * c; arc = 1.2 + 0.8 * c; dmg = (12 + 40 * c) * bm; kb = 240 + 300 * c;
    p.atkT = 0.4 / as; p.swing = 0.22; p.vx += Math.cos(p.aim) * 340 * c; p.vy += Math.sin(p.aim) * 340 * c;
  }
  p.swingDir = -p.swingDir || 1; reach *= sz;
  if (perfect) {
    const dx = Math.cos(p.aim), dy = Math.sin(p.aim);
    A.planes.push({ x1: p.x + dx * 20, y1: p.y + dy * 20, x2: p.x + dx * (20 + AX.PLANE_LEN), y2: p.y + dy * (20 + AX.PLANE_LEN), t: AX.PLANE_LIFE });
    if (A.planes.length > AX.PLANE_MAX) A.planes.shift();
    const n = A.cubes; A.cubes = 0;
    if (n >= 4) g.shoot({ kind: 'wave', dmg: 11 * n, speed: 900, life: 0.55, r: 18 * sz, pierce: 99, kb: 320, noRecoil: true });
    else for (let k = 0; k < n; k++) g.shoot({ kind: 'wave', dmg: 10, speed: 760, life: 0.5, r: 8 * sz, pierce: 0, kb: 160, off: (k - (n - 1) / 2) * 0.18, noRecoil: true });
    gain(A, AX.ILL_CUT); g.hitstop = Math.max(g.hitstop, 0.06); g.emit('axCut', { x: p.x, y: p.y, a: p.aim, n });
  }
  let hits = 0;
  for (const e of g.enemies) {
    const d = hyp(p.x - e.x, p.y - e.y); if (e.dead || d > reach + e.r) continue;
    let da = Math.atan2(e.y - p.y, e.x - p.x) - p.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > arc / 2 + e.r / Math.max(d, 1)) continue;
    g.hurtEnemy(e, dmg, p.aim, kb, 'slash'); hits++;
  }
  g.damageObs(p.x + Math.cos(p.aim) * reach * 0.6, p.y + Math.sin(p.aim) * reach * 0.6, reach * 0.5, dmg);
  if (hits) { gain(A, AX.ILL_HIT); g.hitstop = Math.max(g.hitstop, big ? 0.06 : 0.035); if (g.gainEnergy) g.gainEnergy(c > 0 ? 0.75 + 2 * c : big ? 0.75 : 0.4); }
  if (c >= 0.95) startRush(g);
  if (hits && c === 0 && big && A.cubes < AX.CUBES) { A.cubes++; g.emit('axCube', { x: p.x, y: p.y }); }
  g.emit('swing', { x: p.x, y: p.y, a: p.aim, big, combo: p.combo, hits, reach, arc, charge: c });
}

// ---------- thực tại giả ----------
const alive = e => !e.dead && e.hp > 0 && e.type !== 'DUMMY';
function nearestTo(list, x, y, max, ok = () => true) { let b = null, bd = max; for (const e of list) { if (!alive(e) || !ok(e)) continue; const d = hyp(e.x - x, e.y - y) - (e.r || 16); if (d < bd) { bd = d; b = e; } } return b; }
function spaceInput(g, dt, it) {
  const p = g.p, A = axState(p);
  if (it.space) A.press = { t: 0, marks: [], aim: null };
  const P = A.press; if (!P) return;
  const aim = it.swapAt || (it.cx !== undefined ? { x: it.cx, y: it.cy } : it.ax !== undefined ? { x: it.ax, y: it.ay } : null); if (aim) P.aim = aim;
  if (it.spaceHeld) {
    P.t += dt;
    if (P.t >= AX.HOLD) {   // đang ngắm: thời gian chậm một lúc, ghi lại tối đa hai địch con trỏ quét qua
      if (P.t < AX.HOLD + AX.HOLD_SLOW) p.slowmoT = Math.max(p.slowmoT || 0, dt * 2);
      const e = P.aim && nearestTo(g.enemies, P.aim.x, P.aim.y, 22, q => !q.boss);
      if (e && !P.marks.includes(e)) { P.marks.push(e); if (P.marks.length > 2) P.marks.shift(); g.emit('axMark', { x: e.x, y: e.y }); }
    }
    return;
  }
  A.press = null;
  if (P.t < AX.HOLD) { if (A.planes.length && A.foldT <= 0) { A.foldT = AX.FOLD_DELAY; g.emit('axSheath', { x: p.x, y: p.y }); } return; }
  castIllusion(g, P);
}
const pay = (g, A, v) => { if (A.illusion < v) { g.emit('noEnergy', {}); return false; } A.illusion -= v; return true; };
function place(g, o, x, y, r) { o.x = x; o.y = y; if (g.world) g.world.collide(o, r); if (g.arena) g.clampArena(o, r); }
export function castIllusion(g, P) {
  const p = g.p, A = axState(p), marks = P.marks.filter(alive), aim = P.aim || p;
  if (marks.length === 2) {   // tráo hai địch với nhau
    if (!pay(g, A, AX.SWAP2)) return false;
    const [a, b] = marks, ax = a.x, ay = a.y, bx = b.x, by = b.y; place(g, a, bx, by, a.r); place(g, b, ax, ay, b.r); g.cc(a, 'stun', 0.5); g.cc(b, 'stun', 0.5);
    g.emit('axSwap', { x1: ax, y1: ay, x2: bx, y2: by }); return true;
  }
  const self = hyp(aim.x - p.x, aim.y - p.y) <= 70, t = self ? null : marks[0] || nearestTo(g.enemies, aim.x, aim.y, 120);
  if (t) {
    if (!pay(g, A, AX.SWAP)) return false;
    if (t.boss) { g.cc(t, 'stun', 1); g.emit('axSwap', { x1: p.x, y1: p.y, x2: t.x, y2: t.y, boss: true }); return true; }   // boss không bị tráo: chỉ mất poise
    const ox = p.x, oy = p.y, tx = t.x, ty = t.y; place(g, p, tx, ty, p.r); place(g, t, ox, oy, t.r); p.vx = p.vy = 0; p.inv = Math.max(p.inv, 0.35); g.cc(t, 'stun', 0.5);
    for (const s of g.foes || []) if (s.life > 0 && hyp(s.x - ox, s.y - oy) < 110) { s.life = 0; s.landed = true; g.hurtEnemy(t, (s.dmg || 10) * 3, Math.atan2(s.vy || 0, s.vx || 1), 120, 'skill'); }   // đòn đang bay tới trúng kẻ thế chỗ
    g.emit('axSwap', { x1: ox, y1: oy, x2: tx, y2: ty }); return true;
  }
  if (!self) return false;
  // ngắm vào chính mình: Nhiễu Thực Tại
  const list = g.enemies.filter(e => alive(e) && !e.boss && hyp(e.x - p.x, e.y - p.y) < AX.CONFUSE_R);
  if (!list.length) return false;
  if (!pay(g, A, AX.CONFUSE)) return false;
  for (const e of list) { e.confuse = e.max > 200 ? AX.CONFUSE_T / 2 : AX.CONFUSE_T; e.axCd = 0.35; }
  g.emit('axConfuse', { x: p.x, y: p.y, r: AX.CONFUSE_R }); return true;
}
// địch bị nhiễu: coi kẻ khác là bạn rồi lao vào chém (thay cho AI thường)
export function confusedStep(g, dt, typeOf) {
  for (const e of g.enemies) {
    if (!(e.confuse > 0) || !alive(e)) continue;
    e.confuse -= dt; e.axCd = (e.axCd || 0) - dt; e.flash = Math.max(0, e.flash - dt); e.spawn = Math.max(0, (e.spawn || 0) - dt);
    e.x += (e.kx || 0) * dt; e.y += (e.ky || 0) * dt; const kd = Math.exp(-9 * dt); e.kx *= kd; e.ky *= kd;
    if (e.confuse <= 0) { e.confuse = 0; e.state = 'move'; e.st = 0.6; continue; }
    const t = nearestTo(g.enemies, e.x, e.y, 700, q => q !== e); if (!t) continue;
    const d = hyp(t.x - e.x, t.y - e.y) || 1, reach = e.r + t.r + 12, T = typeOf(e);
    e.ma = Math.atan2(t.y - e.y, t.x - e.x);
    if (d > reach) { const sp = (T.speed || 100) * 1.25 * dt; e.x += Math.cos(e.ma) * sp; e.y += Math.sin(e.ma) * sp; }
    else if (e.axCd <= 0) { e.axCd = 0.6; g.hurtEnemy(t, Math.max((T.dmg || 10) * 2.5, t.boss ? 20 : t.max * 0.16), e.ma, 200, 'skill'); g.emit('axClash', { x: (e.x + t.x) / 2, y: (e.y + t.y) / 2 }); }
    if (g.world) g.world.collide(e, e.r); if (g.arena) g.clampArena(e, e.r);
  }
}
// Gương Vỡ: đòn chí mạng khi Ảo đầy hoá ra là giả; kẻ ra đòn bị đặt vào chỗ Axiom và nhận hộ. Một lần mỗi stage (Test Lab: hồi sau vài chục giây).
export function mirrorBreak(g, a) {
  const p = g.p, A = axState(p);
  if (A.illusion < AX.ILL) return false;
  if (g.lab ? g.t - A.brokeAt < AX.MIRROR_LAB_CD : A.brokeStage === g.stage) return false;
  A.illusion = 0; A.brokeStage = g.stage; A.brokeAt = g.t; A.press = null;
  const x = p.x, y = p.y, from = a === undefined ? null : a + Math.PI;
  let foe = null, best = 1e9;   // kẻ ra đòn: gần, và nằm đúng hướng đòn tới
  for (const e of g.enemies) { if (!alive(e)) continue; const d = hyp(e.x - x, e.y - y), off = from === null ? 0 : Math.abs(Math.atan2(Math.sin(Math.atan2(e.y - y, e.x - x) - from), Math.cos(Math.atan2(e.y - y, e.x - x) - from))); const score = d + off * 160; if (score < best) { best = score; foe = e; } }
  p.hp = Math.max(1, p.max * AX.MIRROR_HP); p.inv = 1.8; p.frozen = 0; p.rooted = 0; p.vx = p.vy = 0;
  for (const s of g.foes || []) { s.life = 0; s.landed = true; }
  g.hazards = (g.hazards || []).filter(h => !(h.kind === 'circle' && hyp(h.x - x, h.y - y) < h.r + 60));
  if (foe) {
    if (foe.boss) { const k = Math.atan2(y - foe.y, x - foe.x); place(g, p, x + Math.cos(k) * 240, y + Math.sin(k) * 240, p.r); g.hurtEnemy(foe, foe.max * AX.MIRROR_BOSS, k + Math.PI, 0, 'skill'); }
    else { const fx = foe.x, fy = foe.y; place(g, p, fx, fy, p.r); place(g, foe, x, y, foe.r); g.hurtEnemy(foe, foe.max * (foe.max > 200 ? 0.5 : 1.2), 0, 0, 'skill'); }
  }
  g.hitstop = Math.max(g.hitstop, AX.MIRROR_STOP);
  g.emit('axShatter', { x, y }); return true;
}

// ---------- Rapid Slash: lao tới, chém xoay hai vòng trên đường lao ----------
function startRush(g) {
  const p = g.p, A = axState(p);
  A.rush = { t: 0, n: 0 }; p.dashT = AX.RUSH_T; p.dashX = Math.cos(p.aim); p.dashY = Math.sin(p.aim); p.inv = Math.max(p.inv, AX.RUSH_T + 0.06);
  g.emit('axRush', { x: p.x, y: p.y, a: p.aim });
}
function rushTick(g, dt) {
  const p = g.p, A = axState(p), R = A.rush; R.t += dt;
  while (R.n < AX.RUSH_HITS.length && R.t >= AX.RUSH_HITS[R.n]) {
    R.n++; let hits = 0;
    for (const e of g.enemies) { if (e.dead || hyp(e.x - p.x, e.y - p.y) > AX.RUSH_R + e.r) continue; g.hurtEnemy(e, AX.RUSH_DMG * (p.basicMul || 1), Math.atan2(e.y - p.y, e.x - p.x), 160, 'slash'); hits++; }
    if (hits) { gain(A, AX.ILL_HIT); g.hitstop = Math.max(g.hitstop, 0.03); }
    g.emit('swing', { x: p.x, y: p.y, a: p.aim + R.n * 2.1, big: true, combo: 3, hits, reach: AX.RUSH_R, arc: 6.28, charge: 0.5 });
  }
  if (R.t >= AX.RUSH_T) A.rush = null;
}
// ---------- Thuấn Trảm: thế giới dừng và mất màu, Axiom đi bộ xuyên qua, chém một nhát, tra kiếm, rồi mọi thứ trên đường đi mới nhận đòn ----------
function startStop(g) {
  const p = g.p, A = axState(p);
  A.stop = { t: 0, x0: p.x, y0: p.y, a: p.aim }; A.fullT = 0; A.rush = null; A.press = null; p.charge = 0; p.dashT = 0; p.vx = p.vy = 0;
  g.emit('axStop', { x: p.x, y: p.y, a: p.aim });
}
// gọi từ Game.step thay cho cả lượt cập nhật: đồng hồ trận đứng yên
export function axiomStop(g, dt) {
  const p = g.p, A = axState(p), S = A.stop, T = AX.STOP; S.t += dt;
  p.inv = Math.max(p.inv, 0.6); p.swing = Math.max(0, p.swing - dt); A.sheathT = Math.max(0, (A.sheathT || 0) - dt);
  const dx = Math.cos(S.a), dy = Math.sin(S.a);
  if (S.t > T.fade && S.t < T.walk) {
    const k = (S.t - T.fade) / (T.walk - T.fade), x0 = p.x, y0 = p.y;
    p.x = S.x0 + dx * AX.STOP_LEN * k; p.y = S.y0 + dy * AX.STOP_LEN * k; if (g.world) g.world.collide(p, p.r); if (g.arena) g.clampArena(p, p.r);
    p.vx = (p.x - x0) / dt; p.vy = (p.y - y0) / dt; p.face = dx < 0 ? -1 : 1; p.aim = S.a;
  } else { p.vx = p.vy = 0; }
  if (S.t >= T.walk && !S.cut) { S.cut = true; p.swing = 0.15; p.combo = 1; p.swingDir = -p.swingDir || 1; g.emit('swing', { x: p.x, y: p.y, a: S.a, big: true, combo: 3, hits: 0, reach: 130, arc: 2.4, charge: 1 }); g.emit('axSlash', { x: p.x, y: p.y }); }
  if (S.t >= T.slash && !S.sheathed) { S.sheathed = true; A.sheathT = T.end - T.slash; g.emit('axSheath', { x: p.x, y: p.y }); }
  if (S.t < T.end) return true;
  // tra kiếm xong: thời gian chạy lại, mọi thứ nằm trên đường đi mới bị chém
  const w = { x1: S.x0, y1: S.y0, x2: p.x, y2: p.y }; let hits = 0;
  for (const e of g.enemies) { if (e.dead || segDist(e.x, e.y, w) > AX.STOP_W + e.r) continue; g.hurtEnemy(e, AX.SEVER * (p.basicMul || 1), S.a + Math.PI / 2, 300, 'blast'); hits++; }
  A.stop = null; A.needRelease = true; A.sheathT = 0; gain(A, AX.ILL_CUT + AX.ILL_FOLD * hits); g.hitstop = Math.max(g.hitstop, 0.12);
  g.emit('axSever', { ...w, hits });
  return true;
}
