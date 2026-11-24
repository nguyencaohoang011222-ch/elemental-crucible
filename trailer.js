// Trailer Director: phim giới thiệu ~36 giây tự diễn ngay trong canvas để quay màn hình hoặc xuất video.
// Bấm T ở màn hình chính để chạy, Esc để thoát, H để ẩn/hiện letterbox + chú thích (quay bản sạch).
// Mỗi cảnh dựng một Game thật (bất tử, năng lượng vô hạn); boss chạy đủ AI và đòn, nhân vật do bot "chơi như pro":
// lách đạn, lướt sát giờ chót qua vùng đòn, đánh qua lại rồi phản đòn bằng Ultimate. Camera: zoom/lia cubic, quay chậm, đẩy cận.
// Âm thanh: trailerAudio.js (nhạc 135 BPM + SFX). Không động tới hồ sơ người chơi (main.js bỏ qua trackEvents khi ui === 'trailer').
import { Game } from './game.js';
import * as PR from './profile.js';
import { ROSTER } from './env.js';
import { TrailerAudio, wavDataURL, DROP, BEAT } from './trailerAudio.js';
import { iconSkill } from './gfx/icons.js';

const DT = 1 / 60, TAU = Math.PI * 2;
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // easeInOutCubic
const lerp = (a, b, k) => a + (b - a) * k;
const TAGLINE = 'FORGE ELEMENTS • FELL TITANS';
const WIPE = 0.45;                                   // chuyển cảnh 0.45s, cắt cảnh ở giữa
const FLASH_AT = Math.round(32.6 / BEAT) * BEAT;     // chớp sét cuối đúng phách (nhạc cắt tại đây)
const TITLE_AT = 33.5, SLAM_AT = TITLE_AT + 0.22, END_AT = 37.1;
// mốc cảnh ghép lõi (giây trong cảnh): mở bảng, 3 cú bấm chọn lõi, bấm MERGE, đóng bảng
const MERGE_T = { open: 0.5, c: [1.15, 1.8, 2.45], btn: 3.3, close: 4.1 };
export const TRAILER_LEN = END_AT;

let A = null;      // api từ main.js: { R, setGame, setUi, toTitle, bag, audioCtx }
let S = null;      // trạng thái phim đang chạy
let LOGO = null, lastRec = null;

// ---------- âm thanh: phát trực tiếp hoặc ghi mốc để dựng file ----------
function sfx(type) { if (!S) return; if (S.rec) S.rec.cues.push({ t: S.t, type }); else if (S.au) S.au.cue(type, S.t); }
function slow(scale, dur, punch, at) {
  if (S.slowT > 0) return; S.slowT = dur; S.slowScale = scale; S.punch = punch; S.punchAt = at ? { x: at.x, y: at.y } : null; S.punchT = dur + 0.2;
  if (S.rec) S.rec.slows.push([S.t, dur]); else if (S.au) S.au.slow(S.t, dur);
}

// ---------- dựng cảnh ----------
function mk(cls, skin, stage, seed) {
  const g = new Game(seed, cls, { difficulty: 'NORMAL', skin, skinFx: PR.skinFx(cls, skin) });
  g.labGod = true; g.labEnergy = true; g.labShards = true;
  if (stage > 1) g.startStage(stage);
  A.R.reset(); A.R.camTarget = null; A.R.banner = null;
  const dir = S.whipDir || 1; A.R.camX = g.p.x - dir * 320; A.R.camY = g.p.y;   // vào cảnh với đà lia từ phía vệt quét
  A.setGame(g); S.g = g; S.bot = { atk: 0, cast: 0.5, ci: 0, dash: 2, side: 1, sideT: 0, clutch: false };
  return g;
}
function ring(g, n, r) { const types = ROSTER[g.theme] || ROSTER.forest; for (let i = 0; i < n; i++) g.spawnEnemy(types[i % types.length], i / n * TAU + 0.3, r); g.spawnQ = []; }
const live = g => g.enemies.filter(e => !e.dead && e.type !== 'DUMMY');
function nearest(g) { const p = g.p; let b = null, bd = 1e9; for (const e of live(g)) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; b = e; } } return b; }
function crowd(g) { const L = live(g).filter(e => !e.boss); if (!L.length) return null; let x = 0, y = 0; for (const e of L) { x += e.x; y += e.y; } return { x: x / L.length, y: y / L.length }; }
function morph(cls, skin) { const p = S.g.p; p.skin = skin; p.skinFx = PR.skinFx(cls, skin); A.R.burst && A.R.burst(p.x, p.y - 20, '#fff6d0', 26, 320, 4, 0.5); S.flash = Math.max(S.flash, 0.55); sfx('morph'); }

// ---------- bot chơi như pro ----------
// vùng đòn sắp nổ / tia đang quét / sóng đang lan / đạn sắp trúng → hướng né
function threat(g) {
  const p = g.p, m = p.r + 16;
  for (const h of g.hazards) {
    if (h.dead) continue;
    const d = Math.hypot(p.x - h.x, p.y - h.y);
    if (h.kind === 'ring' && h.active) { if (Math.abs(d - h.rr) < h.thick / 2 + m + 40 && d > h.rr) return { x: h.x - p.x, y: h.y - p.y, big: true }; continue; }   // sóng lan tới: lướt XUYÊN qua (bất tử khi lướt)
    if (h.kind === 'beam') { if (h.t > 0.35) continue; const n = h.n || 1; for (let k = 0; k < n; k++) for (const ahead of [0, 0.35]) { const a = (h.twin ? h.a + (k - (n - 1) / 2) * h.twin : h.a + k * TAU / n) + (h.spin || 0) * ahead, ca = Math.cos(a), sa = Math.sin(a), rx = p.x - h.x, ry = p.y - h.y, al = rx * ca + ry * sa, sd = -rx * sa + ry * ca; if (al > 0 && al < h.len && Math.abs(sd) < h.width / 2 + m) return { x: -sa * Math.sign(sd || 1), y: ca * Math.sign(sd || 1), big: true }; } continue; }
    if (h.done || h.t > 0.32) continue;
    if (h.kind === 'circle' && d < h.r + m && !(h.hole && d < h.hole - m)) return { x: p.x - h.x || 1, y: p.y - h.y, big: h.r > 70 };
    if (h.kind === 'arc' && d < h.r + m) return { x: p.x - h.x, y: p.y - h.y, big: true };
    if (h.kind === 'rect' || h.kind === 'line') { const ca = Math.cos(h.a), sa = Math.sin(h.a), rx = p.x - h.x, ry = p.y - h.y, al = rx * ca + ry * sa, sd = -rx * sa + ry * ca, inL = h.kind === 'line' ? al > 0 && al < h.len : Math.abs(al) < h.len / 2; if (inL && Math.abs(sd) < h.width / 2 + m) return { x: -sa * Math.sign(sd || 1), y: ca * Math.sign(sd || 1), big: h.width > 50 }; }
  }
  for (const f of g.foes) { const dx = p.x - f.x, dy = p.y - f.y, v2 = f.vx * f.vx + f.vy * f.vy || 1, tt = (dx * f.vx + dy * f.vy) / v2; if (tt > 0 && tt < 0.32) { const cx = f.x + f.vx * tt - p.x, cy = f.y + f.vy * tt - p.y; if (Math.hypot(cx, cy) < (f.r || 8) + p.r + 12) { const s = Math.sign(-f.vy * dx + f.vx * dy) || 1; return { x: -f.vy * s, y: f.vx * s, shot: true }; } } }
  return null;
}
function bot(g, dt, force) {
  const p = g.p, B = S.bot, foe = g.boss && !g.boss.dead ? g.boss : nearest(g), it = { mx: 0, my: 0, slots: [], dash: false, fire: false, fireHeld: false, fireReleased: false };
  p.hp = p.max;
  const aimAt = force.aim || foe;
  if (aimAt) { it.ax = aimAt.x; it.ay = aimAt.y; } else { it.ax = p.x + Math.cos(p.aim) * 120; it.ay = p.y + Math.sin(p.aim) * 120; }
  // đi vòng quanh mục tiêu ở tầm hợp lớp, đổi chiều mỗi ~1.6s
  B.sideT -= dt; if (B.sideT <= 0) { B.sideT = 1.3 + ((S.t * 7.3) % 1) * 0.8; B.side = -B.side; }
  if (foe && !force.hold) {
    const want = (g.boss ? { KNIGHT: 110, RANGER: 300, MAGE: 270 } : { KNIGHT: 58, RANGER: 280, MAGE: 240 })[p.cls] || 220, dx = foe.x - p.x, dy = foe.y - p.y, d = Math.hypot(dx, dy) || 1, k = d > want + 40 ? 1 : d < want - 50 ? -0.9 : 0, sd = 0.75 * B.side;
    it.mx = dx / d * k - dy / d * sd; it.my = dy / d * k + dx / d * sd;
  }
  if (force.move) { it.mx = force.move.x; it.my = force.move.y; }
  // né: lướt sát giờ chót nếu lướt sẵn sàng, không thì bước ngang
  const th = force.noDodge ? null : threat(g);
  if (th) { const L = Math.hypot(th.x, th.y) || 1; it.mx = th.x / L; it.my = th.y / L; if (p.dashCd <= 0 && !th.shot || (th.shot && p.dashCd <= 0 && B.dash < 0.8)) { it.dash = true; B.dash = 1.4; if (th.big && !B.clutch && force.clutchOk) { B.clutch = true; slow(0.35, 0.3, 1.15, p); } sfx('whoosh'); } }
  const hold = { KNIGHT: 0.55, RANGER: 0.42, MAGE: 0.6 }[p.cls] || 0.5;
  B.atk += dt; if (B.atk > hold + 0.16) B.atk = 0;
  it.fireHeld = force.noFire ? false : force.charge ? true : (foe && Math.hypot(foe.x - p.x, foe.y - p.y) < 560 && B.atk < hold);
  B.cast -= dt;
  if (!force.noCast && foe && B.cast <= 0) { B.cast = 0.75; const sl = [0, 1, 2, 3].filter(i => p.cores[i] && p.cores[i].type !== 'tri'); if (sl.length) it.slots = [sl[B.ci++ % sl.length]]; }
  B.dash -= dt; if (!force.noDash && !it.dash && foe && B.dash <= 0 && !g.boss) { B.dash = 2.6; it.dash = true; sfx('whoosh'); if (!it.mx && !it.my) { it.mx = foe.x - p.x; it.my = foe.y - p.y; } }
  if (force.slots) it.slots = force.slots; if (force.dash) { it.dash = true; sfx('whoosh'); }
  return it;
}
function keepFight(g) {
  if (g.state !== 'fight') g.state = 'fight'; g.clearT = 0; g.travel = 0; const R = A.R; R.fadeHold = false; R.fadeIn = 0;
  // boss hung hăng: poise luôn đầy (không bị choáng vì bot dồn đòn), nghỉ giữa các đòn ngắn lại
  const b = g.boss; if (b && !b.dead) { if (b.poiseMax) b.poise = b.poiseMax; b.stagger = 0; if (b.idle > 0.22) b.idle = 0.22; if (b.hp < b.max * 0.55) b.hp = b.max * 0.55; }
}
function ff(g, sec) { for (let i = 0; i < sec * 60; i++) { g.step(DT, bot(g, DT, { noDodge: true })); keepFight(g); } g.events.length = 0; }

// ---------- kịch bản ----------
const CORES = (tri) => { const c = [tri ? { type: 'tri', els: ['FIRE', 'WATER', 'EARTH'] } : { type: 'duo', els: ['FIRE', 'WIND'] }, { type: 'duo', els: ['EARTH', 'FIRE'] }, { type: 'duo', els: ['WATER', 'EARTH'] }, { type: 'duo', els: ['WIND', 'WATER'] }]; c.length = 10; return c; };
// cảnh boss: lia sang boss (zoom 1.12 lúc lộ diện) → khung rộng 0.9 cho cả boss lẫn người → phản đòn Ultimate cuối cảnh
function bossShot(t0, dur, stage, cls, skin, seed, o = {}) {
  return { t0, dur, wipe: o.wipe || 'slash', boss: true, kicker: o.kicker || null, final: !!o.final,
    setup() { const g = mk(cls, skin, stage, seed); g.p.cores = CORES(true); ff(g, 1.9); S.ultCast = false; S.shook = false; sfx('riser'); if (o.morphFrom) { const p = g.p; p.skin = o.morphFrom; p.skinFx = PR.skinFx(cls, o.morphFrom); S.morphAt = 1.0; S.morphTo = [cls, skin]; } else S.morphAt = null; },
    tick(lt) { const g = S.g, b = g.boss && !g.boss.dead ? g.boss : null;
      if (S.morphAt && lt >= S.morphAt) { morph(...S.morphTo); S.morphAt = null; }
      if (lt > 1.15 && !S.shook) { S.shook = true; A.R.addShake(6); }
      const ultAt = o.ultAt || dur - 1.4;
      if (b && lt > ultAt && !S.ultCast) { S.ultCast = true; slow(0.35, 0.3, 1.15, b); sfx('burst'); return { slots: [0], aim: b, noFire: true, noDodge: true }; }
      if (o.final && lt > FLASH_AT - t0 && !S.flashed) { S.flashed = true; S.flash = 1; A.R.addShake(12); sfx('zap'); }
      return { clutchOk: lt > 1.4, noDash: lt < 0.9 }; },
    cam(lt) { const g = S.g, p = g.p, b = g.boss && !g.boss.dead ? g.boss : null; if (!b) return { zoom: 0.95 };
      if (lt < 0.25) return { zoom: 1.0 };
      if (lt < 1.4) { const k = ease((lt - 0.25) / 1.15); return { zoom: lerp(1.0, 1.12, k), target: { x: lerp(p.x, b.x, k), y: lerp(p.y, b.y - b.r * 0.4, k), k: 6 } }; }
      const d = Math.hypot(b.x - p.x, b.y - p.y), zw = Math.max(0.85, Math.min(0.95, 520 / Math.max(1, d)));
      return { zoom: lerp(1.12, zw, ease((lt - 1.4) / 0.7)), target: { x: lerp(p.x, b.x, 0.42), y: lerp(p.y, b.y, 0.42), k: 4 } }; } };
}
function shots() {
  const L = [];
  // 1. Mở màn: cận Knight trên đường đất → biến thành Dragon Knight → kéo ra khi bầy quái tràn vào → lướt + chém tụ lực đúng nhịp DROP
  L.push({ t0: 0, dur: 5.0, wipe: null, cap: ['FIGHT THE HORDE', 'Fast pixel roguelite action'],
    setup() { S.whipDir = 1; const g = mk('KNIGHT', '', 1, 4242); A.R.camX = g.p.x; g.enemies = []; g.spawnQ = []; g.p.cores = CORES(false); S.spawned = false; S.morphed = false; },
    tick(lt) { const g = S.g;
      if (!S.spawned && lt > 0.4) { S.spawned = true; ring(g, 16, 560); }
      if (!S.morphed && lt > 1.55) { S.morphed = true; morph('KNIGHT', 'dragonknight'); }
      if (lt > 3.2 && lt < 3.24) { const c = crowd(g); return { dash: true, move: c ? { x: c.x - g.p.x, y: c.y - g.p.y } : null, charge: true, noDodge: true }; }
      if (lt > 2.7 && lt < DROP - 0.04) return { charge: true, noCast: true, noDash: true, noDodge: true, aim: crowd(g) };
      if (lt >= DROP - 0.04 && !S.dropped) { S.dropped = true; slow(0.35, 0.3, 1.15); sfx('burst'); return { noFire: true, aim: crowd(g) }; }
      return lt < 1.3 ? { hold: true, noFire: true, noCast: true, noDash: true, noDodge: true } : {}; },
    cam(lt) { return { zoom: lt < 0.7 ? 1.4 : lerp(1.4, 0.9, ease((lt - 0.7) / 2.4)) }; } });
  // 2. Ghép lõi (6.5s): bảng Merge vẽ trong canvas, con trỏ chọn Lửa → Nước → Đất, bấm MERGE → Ultimate bay về thanh chiêu → tung vào đám đông
  L.push({ t0: 5.0, dur: 6.5, wipe: 'slash', merge: true, cap: ['FORGE ELEMENTAL CORES', 'Merge any elements into new skills'],
    setup() { const g = mk('MAGE', 'celestial', 3, 777); g.enemies = []; g.spawnQ = []; g.p.cores = [{ type: 'el', el: 'FIRE' }, { type: 'el', el: 'WATER' }, { type: 'el', el: 'EARTH' }, { type: 'duo', els: ['WIND', 'FIRE'] }]; g.p.cores.length = 10; ring(g, 16, 300); ff(g, 0.25);
      const img = c => { const im = new Image(); im.src = iconSkill(g.coreSkill(c)); return im; }, tri = { type: 'tri', els: ['FIRE', 'WATER', 'EARTH'] }, ts = g.coreSkill(tri);
      S.mui = { icons: g.p.cores.slice(0, 4).map(img), names: g.p.cores.slice(0, 4).map(c => g.coreSkill(c).name), res: img(tri), resName: ts ? ts.name : 'Ultimate', step: 0, merged: false }; S.ultCast = false; },
    tick(lt) { const g = S.g, M = MERGE_T, U = S.mui;
      if (lt >= M.open && lt < M.close) S.paused = true; else if (S.paused && lt >= M.close) S.paused = false;
      const ev = [[M.open, () => sfx('charge')], [M.c[0], () => sfx('kill')], [M.c[1], () => sfx('kill')], [M.c[2], () => sfx('kill')], [M.btn, () => { sfx('morph'); sfx('burst'); const r = g.mergeCores([0, 1, 2]); U.merged = !r.error; }], [M.close, () => sfx('whoosh')]];
      while (U.step < ev.length && lt >= ev[U.step][0]) ev[U.step++][1]();
      if (lt > M.close + 0.35 && !S.ultCast) { S.ultCast = true; const i = g.p.cores.findIndex(c => c && c.type === 'tri'), c = crowd(g); if (i >= 0 && i < 4) { slow(0.35, 0.3, 1.15, c); sfx('burst'); return { slots: [i], aim: c, noFire: true }; } }
      return lt < M.close + 0.8 ? { noCast: true, noDash: true, aim: crowd(g) } : {}; },
    cam(lt) { const M = MERGE_T; return { zoom: lt < M.open ? 1.0 : lt < M.close ? 1.08 : lerp(1.08, 0.92, ease((lt - M.close) / 1.2)) }; } });
  // 3–6. Titan: boss đánh hết sức, nhân vật đổi skin giữa trận
  L.push(bossShot(11.5, 5.5, 10, 'RANGER', 'starlight', 9010, { wipe: 'whip', kicker: 'FELL COLOSSAL TITANS', morphFrom: '' }));
  L.push(bossShot(17.0, 5.5, 15, 'MAGE', 'frostbound', 9015, { wipe: 'slash' }));
  L.push(bossShot(22.5, 5.5, 20, 'KNIGHT', 'ignivar', 9020, { wipe: 'whip', morphFrom: 'dragonknight' }));
  L.push(bossShot(28.0, 5.5, 25, 'MAGE', 'stormcrown', 9025, { wipe: 'slash', final: true, ultAt: 3.6 }));
  return L;
}

// ---------- vòng chạy ----------
export function startTrailer(api, opts = {}) {
  A = api; if (!LOGO) { LOGO = new Image(); LOGO.src = 'icons/logo-480.png'; }
  S = { t: 0, i: -1, list: shots(), acc: 0, slowT: 0, slowScale: 1, punch: 1, punchT: 0, flash: 0, zoom: 1.4, caps: true, wipe: null, rec: opts.record ? { cues: [], slows: [] } : null, au: null, hits: 0, kills: 0, hz: 0, haz: 0 };
  // âm thanh trực tiếp: dùng chung AudioContext của game (đã mở khoá bằng phím T), đồng hồ phim chạy theo đồng hồ âm thanh
  if (!S.rec && api.audioCtx) { const ac = api.audioCtx(); if (ac) { S.au = new TrailerAudio(ac, ac.destination, ac.currentTime + 0.06); S.au.music({ cut: FLASH_AT, slam: SLAM_AT, end: END_AT }); S.ac = ac; } }
  A.setUi('trailer'); document.body.classList.add('trailer');
}
export function stopTrailer() {
  if (!S) return; if (S.rec) lastRec = S.rec; if (S.au) S.au.fadeOut(0.35);
  S = null; const R = A.R; R.camZoom = 1; R.camTarget = null; document.body.classList.remove('trailer'); try { A.bag.close(); } catch (e) { /* bag chưa mở */ } A.toTitle();
}
export function trailerOn() { return !!S; }
export function toggleCaptions() { if (S) S.caps = !S.caps; }
export function trailerTime() { return S ? S.t : -1; }

// gọi mỗi khung hình. Phát trực tiếp: thời gian theo đồng hồ âm thanh (không lệch nhạc); xuất file: dt cố định
export function trailerFrame(dt) {
  if (!S) return; const R = A.R;
  if (S.au && S.ac && S.ac.state === 'running') { const t = S.ac.currentTime - S.au.t0; dt = Math.max(0, Math.min(0.1, t - S.t)); }
  S.t += dt;
  if (S.t >= END_AT) { stopTrailer(); return; }
  const nx = S.list[S.i + 1];
  // vệt quét bắt đầu trước điểm cắt WIPE/2, kèm đà lia camera theo hướng quét
  if (nx && nx.wipe && !S.wipe && S.t >= nx.t0 - WIPE / 2) { S.whipDir = nx.wipe === 'whip' ? -(S.whipDir || 1) : 1; S.wipe = { kind: nx.wipe, t0: nx.t0 - WIPE / 2, dir: S.whipDir }; sfx('whoosh'); }
  if (nx && S.t >= nx.t0) { S.i++; S.cur = nx; S.ultCast = false; S.flashed = false; S.paused = false; S.slowT = 0; S.punchT = 0; nx.setup(); }
  const sh = S.cur; if (!sh) return;
  const lt = S.t - sh.t0, inTitle = S.t >= TITLE_AT;
  let ts = 1; if (S.slowT > 0) { S.slowT -= dt; ts = S.slowScale; }
  const force = inTitle ? { noFire: true, noCast: true, noDash: true, hold: true, noDodge: true } : (sh.tick(lt, dt) || {});
  const g = S.g;
  if (!S.paused && !inTitle) { S.acc += dt * ts; let n = 0; while (S.acc >= DT && n < 6) { g.step(DT, bot(g, DT, force)); force.slots = null; force.dash = false; S.acc -= DT; n++; keepFight(g); } }
  // âm thanh theo sự kiện trận (trước khi renderer tiêu thụ sự kiện)
  if (!inTitle) { S.hits -= dt; S.kills -= dt; S.hz -= dt;
    for (const e of g.events) { if (e.ev === 'hit' && S.hits <= 0) { S.hits = 0.07; sfx('hit'); } else if (e.ev === 'kill' && S.kills <= 0) { S.kills = 0.09; sfx('kill'); } else if (e.ev === 'bossHit' && S.hz <= 0) { S.hz = 0.25; sfx('thud'); } }
    const nh = g.hazards.length; if (nh > S.haz && S.hz <= 0 && g.boss) { S.hz = 0.6; sfx('charge'); } S.haz = nh; }
  // camera: mục tiêu + zoom của cảnh, đẩy cận khi quay chậm, đà lia khi chuyển cảnh
  const c = sh.cam(lt) || {}; let zoom = c.zoom || 1;
  if (S.punchT > 0) { S.punchT -= dt; zoom *= lerp(1, S.punch, Math.min(1, S.punchT / 0.2)); }
  S.zoom += (zoom - S.zoom) * Math.min(1, dt * 7); R.camZoom = S.zoom;
  let tg = S.punchT > 0 && S.punchAt ? { x: S.punchAt.x, y: S.punchAt.y, k: 9 } : c.target || null;
  if (nx && nx.wipe && S.t > nx.t0 - WIPE / 2) { const k = ease((S.t - (nx.t0 - WIPE / 2)) / (WIPE / 2)), base = tg || { x: g.p.x, y: g.p.y }; tg = { x: base.x + (S.whipDir || 1) * 420 * k, y: base.y, k: 14 }; }
  R.camTarget = tg; R.banner = null; R.castText = null;
  if (!inTitle) R.draw(g, { dt: S.paused ? 0 : dt * ts, sfx: null, aimDist: 300 });
  else g.events.length = 0;
  overlay(R.ctx, R, dt, lt, sh, inTitle);
}

// ---------- xuất video: nhạc + SFX dựng lại offline theo đúng các mốc đã ghi ----------
export async function renderTrailerAudio() {
  const rec = lastRec || (S && S.rec); if (!rec) return null;
  const sr = 44100, oc = new OfflineAudioContext(2, Math.ceil(sr * END_AT), sr), au = new TrailerAudio(oc, oc.destination, 0);
  au.music({ cut: FLASH_AT, slam: SLAM_AT, end: END_AT });
  for (const c of rec.cues) au.cue(c.type, c.t);
  for (const [t, d] of rec.slows) au.slow(t, d);
  return wavDataURL(await oc.startRendering());
}

// ---------- lớp phủ: letterbox, chú thích, vệt chuyển cảnh, chớp sáng, màn tiêu đề ----------
function overlay(c, R, dt, lt, sh, inTitle) {
  const W = R.W, H = R.H, k = H / Math.max(1, innerHeight), px = v => Math.round(v * k);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
  if (inTitle) { titleCard(c, W, H, S.t - TITLE_AT, px); drawWipe(c, W, H); return; }
  if (sh.final && S.t > FLASH_AT + 0.15) { c.globalAlpha = Math.min(1, (S.t - FLASH_AT - 0.15) / 0.6); c.fillStyle = '#0b0f0d'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  if (S.flash > 0) { c.globalAlpha = Math.min(1, S.flash); c.fillStyle = '#f4fbff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; S.flash = Math.max(0, S.flash - dt * 2.4); }
  if (sh.merge && S.mui) mergeUI(c, W, H, lt, px);
  if (S.caps) {
    const bh = px(28) * ease(S.t / 0.5); c.fillStyle = '#000'; c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh);
    const cap = sh.boss && S.g.boss ? [S.g.boss.def.name.toUpperCase(), S.g.boss.def.epithet] : sh.cap;
    if (cap && lt > 0.35) lowerThird(c, cap, lt - 0.35, sh.dur - 1.0, W, H, px, sh.kicker);
  }
  drawWipe(c, W, H);
}
// ---------- bảng ghép lõi + con trỏ chuột (vẽ trong canvas) ----------
const CURSOR = ['o.........', 'oo........', 'oWo.......', 'oWWo......', 'oWWWo.....', 'oWWWWo....', 'oWWWWWo...', 'oWWWWWWo..', 'oWWWWWWWo.', 'oWWWWWoooo', 'oWWoWWo...', 'oWo.oWWo..', 'oo..oWWo..', 'o....oWWo.', '.....oWWo.', '......oo..'];
const ELC = ['#ff7a3c', '#5bb8ff', '#d4b46e', '#a6ebcb'];
function mergeUI(c, W, H, lt, px) {
  const M = MERGE_T, U = S.mui, open = ease((lt - M.open) / 0.3) * (1 - ease((lt - M.close) / 0.3)); if (open <= 0) return;
  c.save(); c.globalAlpha = 0.55 * open; c.fillStyle = '#04070680'; c.fillRect(0, 0, W, H); c.globalAlpha = open;
  const pw = px(760), ph = px(360), x0 = W / 2 - pw / 2, y0 = H * 0.46 - ph / 2 + (1 - open) * px(40), S2 = px(84), gap = px(14);
  // khung bảng: nền tối, viền vàng, vát góc pixel
  c.fillStyle = '#0f1714'; c.fillRect(x0, y0, pw, ph); c.strokeStyle = '#d4af37'; c.lineWidth = px(3); c.strokeRect(x0, y0, pw, ph); c.fillStyle = '#09080f'; for (const [x, y] of [[x0, y0], [x0 + pw - px(6), y0], [x0, y0 + ph - px(6)], [x0 + pw - px(6), y0 + ph - px(6)]]) c.fillRect(x, y, px(6), px(6));
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.font = `800 ${px(24)}px "Pixelify Sans",monospace`; c.fillStyle = '#d4af37'; c.fillText('Inventory & Merge', x0 + px(24), y0 + px(40));
  c.font = `700 ${px(12)}px "Pixelify Sans",monospace`; c.fillStyle = '#8a9a90'; c.fillText('SKILL BAR', x0 + px(24), y0 + px(70)); c.fillText('MERGE TABLE', x0 + px(24), y0 + px(196));
  const bar = i => ({ x: x0 + px(24) + i * (S2 + gap), y: y0 + px(80) }), tab = i => ({ x: x0 + px(24) + i * (S2 + gap), y: y0 + px(206) }), res = { x: x0 + px(24) + 3 * (S2 + gap) + px(44), y: y0 + px(206) }, btn = { x: x0 + pw - px(200), y: y0 + px(226), w: px(170), h: px(48) };
  const slot = (p, col, on) => { c.fillStyle = '#0d1512'; c.fillRect(p.x, p.y, S2, S2); c.strokeStyle = col; c.lineWidth = px(on ? 4 : 2); c.strokeRect(p.x, p.y, S2, S2); };
  const icon = (im, p, k = 1) => { if (im && im.complete && im.naturalWidth) { const s = S2 * 0.72 * k; c.imageSmoothingEnabled = false; c.drawImage(im, p.x + S2 / 2 - s / 2, p.y + S2 / 2 - s / 2, s, s); } };
  const picked = i => lt >= M.c[i];
  // thanh chiêu: lõi đã chọn mờ đi; sau khi ghép, ô 1 nhận Ultimate
  for (let i = 0; i < 4; i++) { const p = bar(i); slot(p, i < 3 && picked(i) && !U.merged ? '#ffffff' : ELC[i], i < 3 && picked(i) && !U.merged); const done = U.merged && lt >= M.btn + 0.45;
    if (i === 0 && done) { icon(U.res, p, 1 + Math.max(0, 0.25 - (lt - M.btn - 0.45)) ); } else if (!(U.merged && i < 3)) { c.globalAlpha = open * (i < 3 && picked(i) ? 0.35 : 1); icon(U.icons[i], p); c.globalAlpha = open; } }
  // bàn ghép: lõi bay từ thanh chiêu xuống trong 0.3s
  for (let i = 0; i < 3; i++) { const p = tab(i); slot(p, '#2a3a30', false); if (!picked(i) || (U.merged && lt > M.btn + 0.15)) continue; const k = ease((lt - M.c[i]) / 0.3), a = bar(i); icon(U.icons[i], { x: lerp(a.x, p.x, k), y: lerp(a.y, p.y, k) }); }
  c.fillStyle = '#8a9a90'; c.font = `800 ${px(26)}px "Pixelify Sans",monospace`; c.fillText('\u2192', res.x - px(34), res.y + S2 / 2 + px(9));
  // ô kết quả: hiện bản xem trước khi đủ 3 lõi, lóe sáng lúc bấm MERGE rồi bay về thanh chiêu
  slot(res, lt >= M.c[2] + 0.3 ? '#f0a8ff' : '#2a3a30', lt >= M.c[2] + 0.3);
  if (lt >= M.c[2] + 0.3 && !(U.merged && lt > M.btn + 0.45)) { const fly = U.merged ? ease((lt - M.btn - 0.15) / 0.3) : 0, b0 = bar(0); c.globalAlpha = open * (U.merged ? 1 : 0.55 + 0.25 * Math.sin(lt * 10)); icon(U.res, { x: lerp(res.x, b0.x, fly), y: lerp(res.y, b0.y, fly) }, 1 + (U.merged ? 0.2 * (1 - fly) : 0)); c.globalAlpha = open; }
  if (lt >= M.c[2] + 0.3) { c.font = `700 ${px(13)}px "Pixelify Sans",monospace`; c.fillStyle = '#f0a8ff'; c.fillText('ULTIMATE', res.x, res.y + S2 + px(20)); c.fillStyle = '#f0e2b8'; c.fillText(U.resName, res.x, res.y + S2 + px(38)); }
  // nút MERGE: sáng lên khi con trỏ rê tới, nhấn xuống lúc bấm
  const hov = lt > M.btn - 0.35 && lt < M.btn + 0.4, down = lt >= M.btn && lt < M.btn + 0.12, ready = lt >= M.c[2] + 0.3;
  c.fillStyle = ready ? (hov ? '#3a3216' : '#2a2412') : '#141a17'; c.fillRect(btn.x, btn.y + (down ? px(3) : 0), btn.w, btn.h); c.strokeStyle = ready ? '#d4af37' : '#2a3a30'; c.lineWidth = px(2); c.strokeRect(btn.x, btn.y + (down ? px(3) : 0), btn.w, btn.h);
  c.textAlign = 'center'; c.font = `800 ${px(18)}px "Pixelify Sans",monospace`; c.fillStyle = ready ? '#f2d675' : '#5a6a60'; c.fillText('MERGE', btn.x + btn.w / 2, btn.y + btn.h / 2 + px(7) + (down ? px(3) : 0)); c.textAlign = 'left';
  if (U.merged && lt < M.btn + 0.5) { const k = (lt - M.btn) / 0.5; c.globalAlpha = open * (1 - k); c.strokeStyle = '#fff6d0'; c.lineWidth = px(4); c.beginPath(); c.arc(res.x + S2 / 2, res.y + S2 / 2, S2 * (0.6 + k * 1.6), 0, TAU); c.stroke(); c.globalAlpha = open; }
  // con trỏ chuột: lướt mượt giữa các điểm bấm, nhún xuống + gợn vòng khi bấm
  const ctr = p => ({ x: p.x + S2 * 0.55, y: p.y + S2 * 0.55 }), keys = [[M.open, { x: x0 + pw * 0.75, y: y0 + ph + px(60) }], [M.c[0], ctr(bar(0))], [M.c[1], ctr(bar(1))], [M.c[2], ctr(bar(2))], [M.btn, { x: btn.x + btn.w * 0.55, y: btn.y + btn.h * 0.6 }], [M.close, { x: btn.x + btn.w * 0.8, y: btn.y + btn.h * 1.6 }]];
  let cp = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [ta, pa] = keys[i - 1], [tb, pb] = keys[i]; if (lt <= tb) { const k = ease(Math.max(0, (lt - ta - 0.05) / Math.max(0.01, (tb - ta) * 0.62))); cp = { x: lerp(pa.x, pb.x, k), y: lerp(pa.y, pb.y, k) }; break; } cp = pb; }
  const clicks = [...M.c, M.btn], press = clicks.some(t => lt >= t && lt < t + 0.1), sc = px(3) * (press ? 0.85 : 1);
  for (const t of clicks) if (lt >= t && lt < t + 0.35) { const k = (lt - t) / 0.35; c.globalAlpha = open * (1 - k); c.strokeStyle = '#ffffff'; c.lineWidth = px(2); c.beginPath(); c.arc(cp.x, cp.y, px(8) + k * px(26), 0, TAU); c.stroke(); c.globalAlpha = open; }
  CURSOR.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; c.fillStyle = ch === 'o' ? '#141013' : '#ffffff'; c.fillRect(Math.round(cp.x + i * sc), Math.round(cp.y + j * sc), Math.ceil(sc), Math.ceil(sc)); }));
  c.restore();
}
function drawWipe(c, W, H) { if (!S.wipe) return; const k = (S.t - S.wipe.t0) / WIPE; if (k >= 1) { S.wipe = null; return; } if (k > 0) wipe(c, W, H, k, S.wipe.kind, S.wipe.dir); }
function lowerThird(c, [title, sub], t, hold, W, H, px, kicker) {
  const inK = ease(t / 0.35), outK = ease((t - hold) / 0.35), x0 = px(26) - (1 - inK) * px(420) - outK * px(420), y = H - px(28) - px(80);
  if (outK >= 1) return;
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  if (kicker) { c.font = `700 ${px(12)}px "Pixelify Sans",monospace`; c.fillStyle = '#d4af37'; c.fillText(kicker, x0, y - px(10)); }
  c.font = `800 ${px(26)}px "Pixelify Sans",monospace`; const tw = c.measureText(title).width, bh = px(sub ? 54 : 38);
  c.fillStyle = '#000a'; c.fillRect(x0 - px(10), y, tw + px(24), bh);
  c.fillStyle = '#d4af37'; c.fillRect(x0 - px(10), y, px(4), bh); c.fillRect(x0 - px(10), y + bh - px(3), (tw + px(24)) * Math.min(1, t / 0.6), px(3));
  c.fillStyle = '#141013'; c.fillText(title, x0 + px(2), y + px(30)); c.fillStyle = '#f2d675'; c.fillText(title, x0, y + px(28));
  if (sub) { c.font = `600 ${px(13)}px "Pixelify Sans",monospace`; c.fillStyle = '#c8d0c8'; c.fillText(sub, x0, y + px(46)); }
  c.restore();
}
// slash: dải lửa chéo quét qua (lõi trắng ở mép trước) · whip: vệt lia ngang tối kèm vệt sáng mảnh
function wipe(c, W, H, k, kind, dir = 1) {
  c.save(); if (dir < 0) { c.translate(W, 0); c.scale(-1, 1); }
  const kk = ease(k);
  if (kind === 'whip') { const x = lerp(-W * 0.8, W * 1.8, kk); for (let i = 0; i < 18; i++) { const y = (i / 18) * H, w = W * (0.55 + ((i * 37) % 10) / 18); c.fillStyle = i % 4 ? '#0b0f0d' : '#1d2a25'; c.fillRect(x - w, y, w, H / 18 + 1); if (i % 5 === 2) { c.fillStyle = '#7fe0ff'; c.fillRect(x - w * 0.15, y + H / 36, w * 0.15, Math.max(2, H / 180)); } } c.restore(); return; }
  const x = lerp(-W * 0.7, W * 1.75, kk), sk = H * 0.6, band = (off, w, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x - off, 0); c.lineTo(x - off - w, 0); c.lineTo(x - off - w - sk, H); c.lineTo(x - off - sk, H); c.closePath(); c.fill(); };
  band(0, W * 0.95, '#0b0f0d'); band(-W * 0.02, W * 0.05, '#c8301a'); band(-W * 0.05, W * 0.03, '#ff8a2a'); band(-W * 0.065, W * 0.015, '#fff6d0');
  c.restore();
}
function titleCard(c, W, H, t, px) {
  c.fillStyle = '#0b0f0d'; c.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.46, ts = SLAM_AT - TITLE_AT, slam = t < ts ? lerp(2.6, 1, ease(t / ts)) : 1 + Math.max(0, 0.05 - (t - ts) * 0.25) * Math.sin(t * 40);
  if (t < ts) c.globalAlpha = Math.min(1, t / ts * 1.5);
  if (t > ts && t < ts + 1.0) { const r = (t - ts) * px(760), a = 1 - (t - ts) / 1.0; c.globalAlpha = a; c.fillStyle = '#d4af37'; const n = 72, s = px(5); for (let i = 0; i < n; i++) { const q = i / n * TAU; c.fillRect(Math.round(cx + Math.cos(q) * r) - s / 2, Math.round(cy + Math.sin(q) * r * 0.55) - s / 2, s, s); } c.globalAlpha = 1; }
  c.save(); c.translate(cx, cy); c.scale(slam, slam);
  if (LOGO && LOGO.complete && LOGO.naturalWidth) { const s = px(96); c.imageSmoothingEnabled = false; c.drawImage(LOGO, -s / 2, -s - px(46), s, s); }
  c.textAlign = 'center'; c.font = `900 ${px(64)}px "Pixelify Sans",monospace`;
  c.fillStyle = '#3a2410'; c.fillText('ELEMENTAL ARENA', 0, px(6)); c.fillStyle = '#ffd36b'; c.fillText('ELEMENTAL ARENA', 0, 0);
  c.restore(); c.globalAlpha = 1; c.textAlign = 'center';
  if (t > 0.7) { c.globalAlpha = Math.min(1, (t - 0.7) / 0.5); c.font = `700 ${px(18)}px "Pixelify Sans",monospace`; c.fillStyle = '#c8d0c8'; c.fillText(TAGLINE, cx, cy + px(52)); c.globalAlpha = 1; }
  if (t > 1.3 && (t < 2.2 || Math.floor(t * 2.4) % 2 === 0)) { c.font = `800 ${px(22)}px "Pixelify Sans",monospace`; const w = c.measureText('PLAY NOW').width + px(36); c.fillStyle = '#2a2412'; c.fillRect(cx - w / 2, cy + px(84), w, px(40)); c.strokeStyle = '#d4af37'; c.lineWidth = px(2); c.strokeRect(cx - w / 2, cy + px(84), w, px(40)); c.fillStyle = '#f2d675'; c.fillText('PLAY NOW', cx, cy + px(112)); }
  if (t > END_AT - TITLE_AT - 0.6) { c.globalAlpha = Math.min(1, (t - (END_AT - TITLE_AT - 0.6)) / 0.6); c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  c.textAlign = 'left';
}
