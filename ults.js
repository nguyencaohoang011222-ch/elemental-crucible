// 36 tuyệt kỹ ghép 3 nguyên tố: mỗi chiêu một cơ chế riêng.
// Ghép từ các khối của Game (hitCircle, hitLine, proj, addZone, pend) + vật thể tuyệt kỹ sống trong g.ults.
import { dist, angDiff, ENEMIES } from './sim.js';
import { slowmo, shield, heal, stealth, lure, goldStatue, clearShots } from './defense.js';

const TAU = Math.PI * 2;
const alive = g => g.enemies.filter(e => !e.dead);
const inR = (g, x, y, r) => alive(g).filter(e => dist(x, y, e.x, e.y) < r + e.r);
function closest(g, x, y, maxR = 700, skip) { let b = null, bd = maxR; for (const e of alive(g)) { if (skip && skip.has(e)) continue; const d = dist(x, y, e.x, e.y); if (d < bd) { bd = d; b = e; } } return b; }
const fx = (g, sk, name, d = {}) => g.emit('ultfx', { name, pal: sk.pal, ...d });
const hit = (g, sk, x, y, r, eff) => g.hitCircle(x, y, r, eff, sk);
function ring(g, sk, x, y, r, w, eff) { let n = 0; for (const e of alive(g)) { const d = dist(x, y, e.x, e.y); if (d > r - w - e.r && d < r + w + e.r) { g.applyHit(e, eff, Math.atan2(e.y - y, e.x - x), sk); n++; } } return n; }
function launch(g, e, t = 0.9) { if (e.boss) { g.cc(e, 'stun', t * 0.5); return; } g.cc(e, 'stun', t); e.airT = t; e.airH = t; }
function pullIn(g, x, y, r, force, dt) { for (const e of alive(g)) { const d = dist(x, y, e.x, e.y); if (d < r && d > 8) { const m = e.boss ? 40 : (ENEMIES[e.type] || {}).mass || 1; e.kx += (x - e.x) / d * force * dt * 8 / m; e.ky += (y - e.y) / d * force * dt * 8 / m; } } }
function ent(g, sk, o) { o.t = 0; o.sk = sk; o.pal = sk.pal; o.uid = g.ultUid = (g.ultUid || 0) + 1; g.ults.push(o); return o; }
// di chuyển người chơi theo đường (nhảy/lướt) — không bị input chen ngang
function moveP(g, x1, y1, T, arc, onEnd) { const p = g.p; p.ultMove = { x0: p.x, y0: p.y, x1, y1, t: 0, T, arc, onEnd }; p.inv = Math.max(p.inv, T + 0.12); }
const clampR = (g, x0, y0, x, y, r) => { const d = dist(x0, y0, x, y); return d <= r ? [x, y] : [x0 + (x - x0) / d * r, y0 + (y - y0) / d * r]; };
const surf = (g, x, y, r, el, life) => { if (g.surface) g.surface.apply(x, y, r, el, { rand: g.rand, life }); };
// đặc sản: đánh dấu quái nhận thêm amt sát thương từ mọi nguồn trong dur giây (game.js hurtEnemy đọc e.vuln / e.vulnUntil; boss có trần)
function mark(g, e, amt, dur) { if (e.dead || !(amt > 0)) return; e.vuln = Math.max(e.vulnUntil > g.t ? e.vuln : 0, amt); e.vulnUntil = Math.max(e.vulnUntil || 0, g.t + dur); }
// gọi sau mỗi lần tung chiêu (game.js castNow): chế độ bão của Thunderhead
export function ultOnCast(g, sk, ax, ay, free) {
  const p = g.p; if (!(p.storm > 0) || free || sk.ult || !sk.els || sk.els.length !== 1 || !p.stormSk) return;
  const S = p.stormSk; p.energy = Math.min(p.energyMax, p.energy + sk.cost * (S.stormRefund || 0));   // chiêu đơn rẻ một nửa
  const e = closest(g, ax, ay, 200), [bx, by] = e ? [e.x, e.y] : [ax, ay];
  hit(g, S, bx, by, 62, S.bolt); fx(g, S, 'lightning', { x: bx, y: by });
}

const U = {
  // ================= KNIGHT =================
  meteorblade(g, sk, ax, ay) { // 3 cú nhảy chém (bản rèn: 4, cú cuối là thiên thạch lớn), mỗi lần đáp nứt lửa + đá văng
    const p = g.p, F = sk.forged; let N = F ? 4 : 3, n = 0, extra = 0; const done = new Set();
    const jump = (tx, ty) => moveP(g, tx, ty, 0.32, 110, () => {
      const last = F && n === N - 1, R = last ? 220 : F ? 150 : 135;
      const k0 = g.kills; hit(g, sk, p.x, p.y, R, { ...(last ? { ...sk.slam, dmg: sk.slam.dmg * 1.4, stun: 1.2 } : sk.slam), exec: sk.exec || 0 });
      if (!last && g.kills > k0 && extra < (sk.chain || 0)) { N++; extra++; fx(g, sk, 'fireRing', { x: p.x, y: p.y, r: 60 }); } fx(g, sk, 'fireRing', { x: p.x, y: p.y, r: R }); g.hitstop = Math.max(g.hitstop, last ? 0.12 : 0.07);
      for (let k = 0; k < 8; k++) g.proj('shard', p.x, p.y, k * TAU / 8 + n, { speed: 520, range: 260, r: 7, dmg: sk.rock.dmg, burn: 2, pierce: 1 }, sk);
      surf(g, p.x, p.y, last ? 140 : 70, 'MAGMA', last ? 6 : 3);
      if (last) { fx(g, sk, 'supernova', { x: p.x, y: p.y, r: R }); const a = p.aim; for (let k = -3; k <= 3; k++) g.addZone('lava', p.x + Math.cos(a) * k * 46, p.y + Math.sin(a) * k * 46, 34, 4); }
      if (F) p.inv = Math.max(p.inv, 0.3);
      if (++n < N) { const e = closest(g, p.x, p.y, 300, done); if (e) done.add(e); const [nx, ny] = e ? [e.x, e.y] : [p.x + Math.cos(p.aim) * 180, p.y + Math.sin(p.aim) * 180]; g.pend(0.1, () => { if (F) p.inv = Math.max(p.inv, 0.2); jump(...clampR(g, p.x, p.y, nx, ny, 300)); }); }
    });
    jump(...clampR(g, p.x, p.y, ax, ay, 340));
  },
  monsoon(g, sk) { // 5 nhát lướt chém tự nhắm (bản rèn: 7 nhát + slow motion)
    const p = g.p, hitSet = new Set(), F = sk.forged; let N = F ? 7 : 5, n = 0;
    if (F) slowmo(g, N * 0.13 + 0.2 + 2.5);
    const strike = () => {
      const e = closest(g, p.x, p.y, 420, hitSet); p.inv = Math.max(p.inv, 0.3);
      const [tx, ty] = e ? [e.x - Math.cos(Math.atan2(e.y - p.y, e.x - p.x)) * 20, e.y - Math.sin(Math.atan2(e.y - p.y, e.x - p.x)) * 20] : [p.x + Math.cos(p.aim + n) * 140, p.y + Math.sin(p.aim + n) * 140];
      fx(g, sk, 'slashLine', { x: p.x, y: p.y, x2: tx, y2: ty });
      moveP(g, tx, ty, 0.08, 0, () => { const k0 = g.kills; if (e) { hitSet.add(e); g.applyHit(e, sk.strike, Math.atan2(e.y - p.y, e.x - p.x), sk); } if (g.kills > k0 && N < (sk.maxStrikes || N)) N++; hit(g, sk, p.x, p.y, 55, sk.strike); g.hitstop = Math.max(g.hitstop, 0.04);
        if (++n < N) g.pend(0.05, strike); else g.pend(0.12, () => { hit(g, sk, p.x, p.y, 150, sk.finale); fx(g, sk, 'steamBurst', { x: p.x, y: p.y, r: 150 }); g.addZone('steam', p.x, p.y, F ? 140 : 110, F ? 3 : 2); if (F) clearShots(g, p.x, p.y, 160); }); });
    };
    strike();
  },
  titan(g, sk) { // hoá khổng lồ đá (bản rèn: 2s tượng vàng-đá bất tử dậm 3 lần trước, rồi khổng lồ giảm 60%, dậm để lại lava + hồi máu)
    const p = g.p, F = sk.forged;
    const giant = () => {
      p.giant = 6; p.giantDr = F ? 0.4 : 0.5; if (sk.titanShield) shield(g, p.max * sk.titanShield, 6); hit(g, sk, p.x, p.y, 180, sk.stomp); fx(g, sk, 'stoneNova', { x: p.x, y: p.y, r: 180 }); g.hitstop = Math.max(g.hitstop, 0.1); surf(g, p.x, p.y, 150, 'RUBBLE', 6);
      ent(g, sk, { kind: 'titan', life: 6, last: p.swing, update(g, dt, o) { const p = g.p; p.frozen = 0; p.rooted = 0; if (sk.tauntR) pullIn(g, p.x, p.y, sk.tauntR, 60, dt); if (p.swing > o.last + 0.01) { const x = p.x + Math.cos(p.aim) * 80, y = p.y + Math.sin(p.aim) * 80; hit(g, sk, x, y, 120, { ...sk.swing, slow: sk.stompSlow }); fx(g, sk, 'stoneNova', { x, y, r: 120 }); surf(g, x, y, 70, 'RUBBLE', 5); g.hitstop = Math.max(g.hitstop, 0.04); if (F) { g.addZone('lava', x, y, 50, 2.5); heal(g, 4); } } o.last = p.swing; if (o.t >= o.life - 0.02) { p.giant = 0; p.giantDr = 0; } } });
    };
    if (!F) return giant();
    goldStatue(g, 2, { onEnd: giant });
    for (const t of [0.5, 1.1, 1.7]) g.pend(t, () => { hit(g, sk, p.x, p.y, 150, { dmg: sk.stomp.dmg * 0.5, stun: 0.6, push: 300 }); fx(g, sk, 'stoneNova', { x: p.x, y: p.y, r: 150 }); clearShots(g, p.x, p.y, 150); });
  },
  sunder(g, sk) { // bay lên xoay trên không, văng đá (bản rèn: 3.5s, vòng nước xoá đạn, đá làm ướt/chậm, cú đáp đóng băng)
    const F = sk.forged, L = F ? 3.5 : 3;
    g.p.ultSpin = L; g.p.ultLift = L; g.p.inv = Math.max(g.p.inv, 0.4);
    ent(g, sk, { kind: 'sunder', life: L, tick: 0, rock: 0, ward: !!F, pulled: new Set(), update(g, dt, o) { const p = g.p; o.x = p.x; o.y = p.y; o.tick -= dt; o.rock -= dt;
      if (sk.pullR) { pullIn(g, p.x, p.y, sk.pullR, 160, dt); for (const e of inR(g, p.x, p.y, sk.pullR)) if (!e.boss) o.pulled.add(e); }
      if (F) clearShots(g, p.x, p.y, 125);
      if (o.tick <= 0) { o.tick = 0.25; hit(g, sk, p.x, p.y, 125, sk.tick); }
      if (o.rock <= 0) { o.rock = 0.28; for (let k = 0; k < 3; k++) g.proj('shard', p.x, p.y, g.rand() * TAU, { speed: 480, range: 300, r: 8, dmg: sk.rock.dmg, burn: F ? 0 : 2.5, wet: F ? 3 : 0, slow: F ? [0.45, 1.2] : undefined, pierce: 1 }, sk); }
      if (o.t >= o.life - 0.02) { p.ultLift = 0; p.ultSpin = 0; p.z = 0; hit(g, sk, p.x, p.y, 160, { ...sk.land, stun: Math.min(1.5, sk.land.stun + 0.12 * o.pulled.size) }); fx(g, sk, 'bigSlam', { x: p.x, y: p.y, r: 160 }); } } });
  },
  // ================= RANGER =================
  meteorarrow(g, sk, ax, ay) { // gồng → mũi tên khổng lồ, thiên thạch dọc đường (bản rèn: slow motion, 9 thiên thạch, tên tách 3)
    const p = g.p, a = Math.atan2(ay - p.y, ax - p.x), sx = p.x, sy = p.y, F = sk.forged, M = F ? 9 : 6, gap = F ? 110 : 160; fx(g, sk, 'charge', { x: sx, y: sy, a }); g.p.slowT = Math.max(g.p.slowT || 0, 0.55);
    if (F) slowmo(g, 0.55 + 2.5);
    g.pend(0.55, () => { g.proj('sarrow', sx, sy, a, { speed: 1400, range: 1100, r: 18, dmg: sk.big.dmg, burn: 3, pierce: 99 }, sk); fx(g, sk, 'bigArrow', { x: sx, y: sy, a }); g.hitstop = Math.max(g.hitstop, 0.06);
      for (let i = 1; i <= M; i++) { const x = sx + Math.cos(a) * i * gap, y = sy + Math.sin(a) * i * gap; fx(g, sk, 'meteorFall', { x, y, d: 0.35 + i * 0.08 }); g.pend(0.35 + i * 0.08, () => { hit(g, sk, x, y, 85, { ...sk.meteor, stun: 0.4 + 1.1 * i / M }); fx(g, sk, 'crater', { x, y, r: 85 }); }); }
      if (F) g.pend(1100 / 1400, () => { const ex = sx + Math.cos(a) * 1100, ey = sy + Math.sin(a) * 1100; for (const d of [-0.5, 0, 0.5]) g.proj('sarrow', ex, ey, a + Math.PI + d, { speed: 1100, range: 600, r: 12, dmg: sk.big.dmg * 0.45, burn: 2, pierce: 99 }, sk); fx(g, sk, 'bigArrow', { x: ex, y: ey, a: a + Math.PI }); }); });
  },
  pentagram(g, sk, ax, ay) { // 5 bẫy ngôi sao: một cái nổ là cả chuỗi nổ (bản rèn: kết giới sao — trong sao xoá đạn, giảm 30% sát thương)
    const p = g.p, [tx, ty] = clampR(g, p.x, p.y, ax, ay, 400), pts = [], F = sk.forged;
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * TAU / 5; pts.push([tx + Math.cos(a) * 135, ty + Math.sin(a) * 135]); }
    const boom = pts => { for (let k = 0; k < 5; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 2) % 5]; g.hitLine(x1, y1, x2, y2, 24, sk.beam, sk); hit(g, sk, x1, y1, 85, sk.blast); fx(g, sk, 'steamBurst', { x: x1, y: y1, r: 85 }); } fx(g, sk, 'starLines', { pts }); g.hitstop = Math.max(g.hitstop, 0.06); };
    ent(g, sk, { kind: 'pentagram', life: 8, x: tx, y: ty, pts, armed: 0.4, ward: !!F, update(g, dt, o) { o.armed -= dt;
      if (F) { clearShots(g, o.x, o.y, 150); if (dist(g.p.x, g.p.y, o.x, o.y) < 150) g.zoneDr = Math.max(g.zoneDr || 0, 0.3); }
      const trig = !o.fired && o.armed <= 0 && (o.t >= (sk.autoFire || 99) || o.pts.some(([x, y]) => inR(g, x, y, 45).length));
      if (trig || (!o.fired && o.t >= o.life - 0.02)) { o.fired = true; boom(o.pts); for (const e of inR(g, o.x, o.y, 160)) { g.cc(e, 'root', sk.blast.root || 1.2); mark(g, e, sk.markAmt || 0, sk.markT || 0); } if (!F) o.dead = true; } } });
  },
  airstrike(g, sk, ax, ay) { // 3 lượt oanh tạc thảm (bản rèn: 4 lượt, hố để lại hơi nước, lượt cuối thả tảng đá choáng)
    const p = g.p, a = Math.atan2(ay - p.y, ax - p.x), nx = -Math.sin(a), ny = Math.cos(a), sx = p.x, sy = p.y, F = sk.forged, LN = F ? 4 : 3;
    for (let L = 0; L < LN; L++) { const off = (L - (LN - 1) / 2) * 75; for (let i = 1; i <= 8; i++) { const x = sx + Math.cos(a) * i * 66 + nx * off, y = sy + Math.sin(a) * i * 66 + ny * off;
      fx(g, sk, 'bombMark', { x, y, d: 0.35 + i * 0.06 + L * 0.22 });
      g.pend(0.35 + i * 0.06 + L * 0.22, () => { hit(g, sk, x, y, 60, { ...sk.bomb, slow: sk.carpetSlow }); for (const e of inR(g, x, y, 60)) mark(g, e, sk.shred || 0, 3); fx(g, sk, 'bomb', { x, y }); surf(g, x, y, 34, 'FIRE', 2.5); if (F && i % 3 === 0) g.addZone('steam', x, y, 60, 2.5); }); } }
    if (F) { const bx = sx + Math.cos(a) * 330, by = sy + Math.sin(a) * 330, T0 = 0.35 + 8 * 0.06 + LN * 0.22 + 0.2; fx(g, sk, 'meteorFall', { x: bx, y: by, d: T0 }); g.pend(T0, () => { hit(g, sk, bx, by, 130, { dmg: sk.bomb.dmg * 1.8, stun: 1.0, push: 260 }); fx(g, sk, 'crater', { x: bx, y: by, r: 130 }); g.hitstop = Math.max(g.hitstop, 0.08); }); }
  },
  mirage(g, sk, ax, ay) { // phân thân bắn tên hơi nước, hút kẻ địch, nổ khi hết giờ (bản rèn: tàng hình 4s, 4 phân thân)
    const p = g.p, a = Math.atan2(ay - p.y, ax - p.x), ox = p.x, oy = p.y, F = sk.forged, N = F ? 4 : 3;
    g.startDash('roll', { dist: 200, time: 0.18, els: sk.els, tags: [] }, a + Math.PI, ax, ay, 0);
    if (F) { stealth(g, 4); lure(g, ox, oy, 4); }
    for (let k = 0; k < N; k++) { const q = a + (k - (N - 1) / 2) * 1.1; ent(g, sk, { kind: 'decoy', quiet: !!F, life: sk.decoyLife || 4, bn: g.basicN || 0, x: ox + Math.cos(q) * 60, y: oy + Math.sin(q) * 60, shot: 0.3 + k * 0.15, update(g, dt, o) {
      if ((g.basicN || 0) > o.bn) { o.bn = g.basicN; const [gx, gy] = g.aim || [ax, ay], e = closest(g, gx, gy, 260) || closest(g, o.x, o.y, 480); if (e && sk.copy) g.proj('sarrow', o.x, o.y, Math.atan2(e.y - o.y, e.x - o.x), { speed: 900, range: 520, r: 6, dmg: sk.copy.dmg, pierce: 0, quiet: !!F }, sk); }
      pullIn(g, o.x, o.y, 260, 90, dt); for (const e of inR(g, o.x, o.y, 140)) if (!e.boss) g.cc(e, 'blind', 0.3);
      o.shot -= dt; if (o.shot <= 0) { o.shot = 0.6; const e = closest(g, o.x, o.y, 480); if (e) g.proj('sarrow', o.x, o.y, Math.atan2(e.y - o.y, e.x - o.x), { speed: 820, range: 480, r: 6, dmg: sk.arrow.dmg, burn: 1.5, pierce: 0, quiet: !!F }, sk); }
      if (o.t >= o.life - 0.02) { hit(g, sk, o.x, o.y, 120, sk.boom); fx(g, sk, 'steamBurst', { x: o.x, y: o.y, r: 120 }); } } }); }
  },
  // ================= MAGE =================
  solar(g, sk, ax, ay) { // mặt trời hút vào rồi sụp nổ (bản rèn: hoá vàng 2.5s rồi dịch chuyển tới chỗ an toàn)
    const p = g.p, [tx, ty] = clampR(g, p.x, p.y, ax, ay, 420), F = sk.forged, L = F ? 2.5 : 2.3;
    if (F) goldStatue(g, L, { tele: 320 });
    ent(g, sk, { kind: 'sun', life: L, x: tx, y: ty, tick: 0, update(g, dt, o) { pullIn(g, o.x, o.y, 320, 330, dt); o.tick -= dt; if (o.tick <= 0) { o.tick = 0.3; hit(g, sk, o.x, o.y, 140, sk.tick); }
      if (o.t >= o.life - 0.02) { const n = inR(g, o.x, o.y, 270).filter(e => !e.boss).length; hit(g, sk, o.x, o.y, 270, { ...sk.nova, dmg: sk.nova.dmg * Math.min(sk.packMax || 1, 1 + (sk.packBonus || 0) * n) }); fx(g, sk, 'supernova', { x: o.x, y: o.y, r: 270 }); g.hitstop = Math.max(g.hitstop, 0.14); surf(g, o.x, o.y, 160, 'FIRE', 3); } } });
  },
  abyss(g, sk, ax, ay) { // sóng khổng lồ quét ngang (bản rèn: xoá đạn, 30 khiên, sóng dội ngược lần 2)
    const p = g.p, a0 = Math.atan2(ay - p.y, ax - p.x), F = sk.forged;
    if (F) shield(g, 30, 5);
    const wave = (a, x0, y0, crash) => ent(g, sk, { kind: 'tide', life: 1.6, x: x0, y: y0, a, w: 1000, hit: new Set(), update(g, dt, o) { o.x += Math.cos(a) * 660 * dt; o.y += Math.sin(a) * 660 * dt;
      if (F) for (const f of g.foes) { const rx = f.x - o.x, ry = f.y - o.y, al = rx * Math.cos(a) + ry * Math.sin(a), sd = -rx * Math.sin(a) + ry * Math.cos(a); if (Math.abs(sd) < o.w / 2 && al > -60 && al < 60) { f.life = 0; f.landed = true; } }
      for (const e of alive(g)) { const rx = e.x - o.x, ry = e.y - o.y, along = rx * Math.cos(a) + ry * Math.sin(a), side = -rx * Math.sin(a) + ry * Math.cos(a);
        if (Math.abs(side) < o.w / 2 && along > -40 && along < 50) { if (!o.hit.has(e)) { o.hit.add(e); g.applyHit(e, sk.wave, a, sk); mark(g, e, sk.drown || 0, 4); if (sk.refund) g.p.energy = Math.min(g.p.energyMax, g.p.energy + sk.refund); } if (!e.boss) { e.x += Math.cos(a) * 500 * dt; e.y += Math.sin(a) * 500 * dt; } } }
      if (o.t >= o.life - 0.02) { for (const e of o.hit) if (!e.dead) g.applyHit(e, sk.crash, a, sk); if (crash) crash(o); } } });
    wave(a0, p.x - Math.cos(a0) * 160, p.y - Math.sin(a0) * 160, F ? o => wave(a0 + Math.PI, o.x, o.y, null) : null);
  },
  comettrench(g, sk, ax, ay) { // sao chổi khổng lồ lao chéo từ trời, rãnh lửa (bản rèn: thêm 2 sao chổi phụ ±40°, lửa 5s)
    const p = g.p, [tx, ty] = clampR(g, p.x, p.y, ax, ay, 420), a = Math.atan2(ty - p.y, tx - p.x), F = sk.forged;
    const comet = (cx, cy, s, d) => {
      fx(g, sk, 'cometFall', { x: cx, y: cy, a, d });
      g.pend(d, () => { const L = 320 * s, x1 = cx - Math.cos(a) * L, y1 = cy - Math.sin(a) * L, x2 = cx + Math.cos(a) * L, y2 = cy + Math.sin(a) * L;
        g.hitLine(x1, y1, x2, y2, 62 * s, sk.trench, sk); hit(g, sk, cx, cy, 170 * s, s < 1 ? { ...sk.impact, dmg: sk.impact.dmg * 0.5 } : sk.impact); fx(g, sk, 'supernova', { x: cx, y: cy, r: 170 * s }); fx(g, sk, 'trench', { x: x1, y: y1, x2, y2 }); g.hitstop = Math.max(g.hitstop, s < 1 ? 0.05 : 0.12);
        if (s >= 1 && sk.wallT) g.walls.push({ x1, y1, x2, y2, life: sk.wallT, stone: true, lava: true });
        for (let k = 0; k <= 10; k++) g.addZone('fire', x1 + (x2 - x1) * k / 10, y1 + (y2 - y1) * k / 10, 36 * s, F ? 5 : 3.5); });
    };
    comet(tx, ty, 1, 0.8);
    if (F) for (const s of [-1, 1]) { const q = a + s * 0.7, d = 220; comet(tx + Math.cos(q) * d, ty + Math.sin(q) * d, 0.55, 1.2); }
  },
  thunderhead(g, sk, ax, ay) { // mây giông theo con trỏ giáng sét (bản rèn: tàng hình 3.5s, mây 6s, sét nảy thêm 1 mục tiêu)
    const F = sk.forged;
    if (F) stealth(g, 3.5);
    g.p.stormSk = sk; g.p.storm = F ? 6 : 5;
    ent(g, sk, { kind: 'cloud', quiet: !!F, life: F ? 6 : 5, x: ax, y: ay, bolt: 0.2, update(g, dt, o) { g.p.storm = Math.max(0, o.life - o.t); const [gx, gy] = g.aim || [ax, ay], d = dist(o.x, o.y, gx, gy); if (d > 4) { const s = Math.min(d, 320 * dt); o.x += (gx - o.x) / d * s; o.y += (gy - o.y) / d * s; }
      o.bolt -= dt; if (o.bolt <= 0) { o.bolt = 0.32; const e = closest(g, o.x, o.y, 170); const [bx, by] = e ? [e.x, e.y] : [o.x + (g.rand() - 0.5) * 120, o.y + (g.rand() - 0.5) * 120]; hit(g, sk, bx, by, 62, sk.bolt); fx(g, sk, 'lightning', { x: bx, y: by }); surf(g, bx, by, 34, 'WATER', 3);
        if (F && e) { const e2 = closest(g, e.x, e.y, 220, new Set([e])); if (e2) { hit(g, sk, e2.x, e2.y, 50, sk.bolt); fx(g, sk, 'lightning', { x: e2.x, y: e2.y }); } } } } });
  }
};

// ---------- Axiom: tuyệt kỹ hình khối (dùng hiệu ứng mặt cắt/khối của Axiom qua sự kiện axFold) ----------
const boxPlanes = (x, y, s) => [{ x1: x - s, y1: y - s, x2: x + s, y2: y - s }, { x1: x + s, y1: y - s, x2: x + s, y2: y + s }, { x1: x + s, y1: y + s, x2: x - s, y2: y + s }, { x1: x - s, y1: y + s, x2: x - s, y2: y - s }];
Object.assign(U, {
  axcoffin(g, sk, ax, ay) {   // khối khổng lồ đóng lại: 6 lần tường ập vào (kéo vào giữa), rồi co sập
    const p = g.p, [cx, cy] = clampR(g, p.x, p.y, ax, ay, 360), F = sk.forged, hits = F ? 8 : 6;
    for (let i = 0; i < hits; i++) { const s = 190 - i * (120 / hits); g.pend(0.3 + i * 0.16 * (1 - i * 0.05), () => { const n = ring(g, sk, cx, cy, s, 34, sk.wall); pullIn(g, cx, cy, s + 40, 900, 0.06); g.emit('axFold', { planes: boxPlanes(cx, cy, s), box: true, hits: n }); }); }
    g.pend(0.3 + hits * 0.15 + 0.2, () => { hit(g, sk, cx, cy, F ? 190 : 160, F ? { ...sk.crush, dmg: sk.crush.dmg * 1.3 } : sk.crush); g.emit('axFold', { planes: boxPlanes(cx, cy, 40), box: true, hits: 1 }); fx(g, sk, 'supernova', { x: cx, y: cy, r: 160 }); g.hitstop = Math.max(g.hitstop, 0.14); });
  },
  axprism(g, sk) {   // 4 tấm kính quay quanh người 3s
    const p = g.p, F = sk.forged, N = F ? 6 : 4;
    ent(g, sk, { kind: 'prism', life: F ? 4 : 3, a: p.aim, tick: 0, update(g, dt, o) {
      o.a += dt * 2.4; o.tick -= dt; if (o.tick > 0) return; o.tick = 0.2;
      for (let k = 0; k < N; k++) { const a = o.a + k * TAU / N, x2 = p.x + Math.cos(a) * 270, y2 = p.y + Math.sin(a) * 270; g.hitLine(p.x, p.y, x2, y2, 20, sk.beam, sk); g.emit('beam', { x1: p.x, y1: p.y, x2, y2, w: 30, el: 'WATER' }); }
      clearShots(g, p.x, p.y, 90);
    } });
  },
  axrain(g, sk, ax, ay) {   // mưa khối dồn nhịp, một nhịp câm, rồi khối lớn
    const p = g.p, [cx, cy] = clampR(g, p.x, p.y, ax, ay, 380), F = sk.forged, N = F ? 20 : 14; let t = 0.25;
    for (let i = 0; i < N; i++) { const a = g.rand() * TAU, r = Math.sqrt(g.rand()) * 230, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; t += Math.max(0.05, 0.16 - i * 0.008);
      g.pend(t, () => { hit(g, sk, x, y, 58, sk.cube); g.emit('axFold', { planes: boxPlanes(x, y, 26), box: false, hits: 0 }); g.emit('slam', { x, y, r: 58, el: 'EARTH' }); }, { x, y, r: 58, el: 'EARTH', fall: true }); }
    g.pend(t + 0.35, () => { hit(g, sk, cx, cy, F ? 200 : 170, sk.final); g.emit('axFold', { planes: boxPlanes(cx, cy, 90), box: true, hits: 1 }); fx(g, sk, 'stoneNova', { x: cx, y: cy, r: 170 }); g.hitstop = Math.max(g.hitstop, 0.12); }, { x: cx, y: cy, r: 170, el: 'EARTH', fall: true });
  },
  axfold(g, sk, ax, ay) {   // gập cả vùng về một điểm, ép lại, rồi bước ra ngay giữa
    const p = g.p, [cx, cy] = clampR(g, p.x, p.y, ax, ay, 380), F = sk.forged, R = F ? 380 : 320;
    ent(g, sk, { kind: 'fold', life: 0.6, update(g, dt, o) { pullIn(g, cx, cy, R, 2600, dt); } });
    g.emit('axFold', { planes: boxPlanes(cx, cy, R * 0.6), box: false, hits: 0 });
    g.pend(0.62, () => { hit(g, sk, cx, cy, 180, F ? { ...sk.fold, dmg: sk.fold.dmg * 1.3 } : sk.fold); g.emit('axFold', { planes: boxPlanes(cx, cy, 60), box: true, hits: 1 }); fx(g, sk, 'supernova', { x: cx, y: cy, r: 180 });
      const ox = p.x, oy = p.y; p.x = cx; p.y = cy; p.vx = p.vy = 0; p.inv = Math.max(p.inv, 0.5); if (g.world) g.world.collide(p, p.r); if (g.arena) g.clampArena(p, p.r); g.emit('blink', { x1: ox, y1: oy, x2: p.x, y2: p.y }); g.hitstop = Math.max(g.hitstop, 0.12); });
  }
});
export function castUlt(g, sk, ax, ay) {
  const f = U[sk.ult]; if (!f) return false;
  g.emit('ultCast', { x: g.p.x, y: g.p.y, name: sk.name, pal: sk.pal, id: sk.ult }); g.hitstop = Math.max(g.hitstop, 0.05);
  f(g, sk, ax, ay); return true;
}
export function updateUlts(g, dt) {
  const p = g.p;
  if (p.ultMove) { const M = p.ultMove; M.t += dt; const k = Math.min(1, M.t / M.T); p.x = M.x0 + (M.x1 - M.x0) * k; p.y = M.y0 + (M.y1 - M.y0) * k; p.vx = p.vy = 0; p.z = M.arc ? Math.sin(k * Math.PI) * M.arc : 0;
    if (k >= 1) { p.ultMove = null; p.z = 0; g.world.collide(p, p.r); if (g.arena) g.clampArena(p, p.r); if (M.onEnd) M.onEnd(); } }
  if (p.ultLift > 0) { p.ultLift -= dt; p.z = 26 + Math.sin(g.t * 8) * 4; p._lifted = true; if (p.ultLift <= 0) p.z = 0; }
  else if (p._lifted) { p._lifted = false; if (!p.ultMove && !p.leap) p.z = 0; }   // lift bị ngắt giữa chừng (chiêu kết thúc gán ultLift = 0): luôn hạ người xuống đất
  for (const k of ['ultSpin', 'hasteT', 'ghostT', 'giant']) if (p[k] > 0) p[k] = Math.max(0, p[k] - dt);
  for (const e of g.enemies) { if (e.airT > 0) e.airT -= dt; if (e.markT > 0) e.markT -= dt; }
  for (const o of g.ults) { o.t += dt; g._quietHit = !!o.quiet; try { o.update(g, dt, o); } finally { g._quietHit = false; } }
  g.ults = g.ults.filter(o => !o.dead && o.t < o.life);
}
export const ULT_IDS = Object.keys(U);
