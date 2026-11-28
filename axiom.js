// Axiom, Chủ Khối (đang thử trong Test Lab): chuỗi chém, Mặt cắt trễ (nhả đúng nhịp), Gập, Né gương, Đàn Khối.
// Logic thuần, chạy được trong test. Thiết kế: xem tài liệu "Axiom, Chủ Khối".
export const AX = { CUBES: 8, START: 3, WINDOW: 0.2, PLANE_LEN: 270, PLANE_MAX: 4, PLANE_LIFE: 6, PLANE_W: 30, PLANE_DMG: 46, BOX: 1.5, FOLD_DELAY: 0.3, DODGE_T: 0.22, DECOY: 1.5, BLOCK_R: 40 };

const hyp = Math.hypot;
export const axState = p => p.ax || (p.ax = { cubes: AX.START, planes: [], fullT: 0, foldT: 0, dodgeT: 0, dodged: false, blockCd: 0, from: null });
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
  A.cubes = Math.min(AX.CUBES, A.cubes + 1); g.hitstop = Math.max(g.hitstop, 0.08);
  g.emit('axDodge', { x: f.x, y: f.y, face: p.face, t: AX.DECOY });
  return true;
}
export function axiomDash(g) {
  const p = g.p, A = axState(p); A.dodgeT = AX.DODGE_T; A.dodged = false; A.from = { x: p.x, y: p.y };
  if (threatened(g)) mirrorDodge(g);
}

export function axiomTick(g, dt, it) {
  const p = g.p, A = axState(p);
  A.dodgeT = Math.max(0, A.dodgeT - dt); A.blockCd = Math.max(0, A.blockCd - dt);
  // thời gian đã giữ ở mức tụ đầy: nhả trong WINDOW giây là đúng nhịp
  if (p.charge >= 1) { if (it.fireHeld) { const was = A.fullT; A.fullT += dt; if (was === 0) g.emit('axReady', { x: p.x, y: p.y }); } } else A.fullT = 0;
  for (const w of A.planes) w.t -= dt;
  A.planes = A.planes.filter(w => w.t > 0 || A.foldT > 0);
  // Gập: tra kiếm, sau một nhịp mọi mặt cắt cùng nổ
  if (it.space && A.planes.length && A.foldT <= 0) { A.foldT = AX.FOLD_DELAY; g.emit('axSheath', { x: p.x, y: p.y }); }
  if (A.foldT > 0) { A.foldT -= dt; if (A.foldT <= 0) { A.foldT = 0; fold(g); } }
  // Đàn Khối đỡ đạn: mỗi lần đỡ mất một khối
  if (A.cubes > 0 && A.blockCd <= 0) for (const s of g.foes || []) {
    if (!(s.life > 0) || hyp(s.x - p.x, s.y - p.y) > AX.BLOCK_R + (s.r || 6)) continue;
    s.life = 0; s.landed = true; A.cubes--; A.blockCd = 0.3; g.emit('axBlock', { x: s.x, y: s.y }); break;
  }
}
function fold(g) {
  const p = g.p, A = axState(p), planes = A.planes, box = planes.length >= AX.PLANE_MAX, dmg = AX.PLANE_DMG * (box ? AX.BOX : 1) * (p.basicMul || 1);
  A.planes = []; let hits = 0;
  for (const w of planes) for (const e of g.enemies) {
    if (e.dead || segDist(e.x, e.y, w) > AX.PLANE_W + e.r) continue;
    g.hurtEnemy(e, dmg, Math.atan2(w.y2 - w.y1, w.x2 - w.x1) + Math.PI / 2, 260, 'blast'); hits++;
  }
  g.hitstop = Math.max(g.hitstop, box ? 0.12 : 0.06);
  g.emit('axFold', { planes: planes.map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })), box, hits });
}

// đòn đánh: c = 0 là chuỗi 3 đòn, c > 0 là đòn tụ
export function axiomAttack(g, c) {
  const p = g.p, A = axState(p), M = p.mods || {}, bm = p.basicMul || 1, as = p.atkSpeed || 1, sz = M.atkSize || 1;
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
    g.hitstop = Math.max(g.hitstop, 0.06); g.emit('axCut', { x: p.x, y: p.y, a: p.aim, n });
  }
  let hits = 0;
  for (const e of g.enemies) {
    const d = hyp(p.x - e.x, p.y - e.y); if (e.dead || d > reach + e.r) continue;
    let da = Math.atan2(e.y - p.y, e.x - p.x) - p.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) > arc / 2 + e.r / Math.max(d, 1)) continue;
    g.hurtEnemy(e, dmg, p.aim, kb, 'slash'); hits++;
  }
  g.damageObs(p.x + Math.cos(p.aim) * reach * 0.6, p.y + Math.sin(p.aim) * reach * 0.6, reach * 0.5, dmg);
  if (hits) { g.hitstop = Math.max(g.hitstop, big ? 0.06 : 0.035); if (g.gainEnergy) g.gainEnergy(c > 0 ? 0.75 + 2 * c : big ? 0.75 : 0.4); }
  if (hits && c === 0 && big && A.cubes < AX.CUBES) { A.cubes++; g.emit('axCube', { x: p.x, y: p.y }); }
  g.emit('swing', { x: p.x, y: p.y, a: p.aim, big, combo: p.combo, hits, reach, arc, charge: c });
}
