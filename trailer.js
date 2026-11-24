// Trailer Director: phim giới thiệu 32 giây tự diễn ngay trong canvas để quay màn hình.
// Bấm T ở màn hình chính để chạy, Esc để thoát, H để ẩn/hiện letterbox + chú thích (quay bản sạch).
// Mỗi cảnh dựng một Game thật (bất tử, năng lượng vô hạn), nhân vật do bot tự đánh; camera có zoom, lia, quay chậm, đẩy cận.
// Không động tới hồ sơ người chơi: main.js bỏ qua trackEvents khi ui === 'trailer'.
import { Game } from './game.js';
import * as PR from './profile.js';
import { ROSTER } from './env.js';

const DT = 1 / 60;
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;
const TAGLINE = 'FORGE ELEMENTS • FELL TITANS';

let A = null;      // api từ main.js: { R, SFX, setGame, setUi, toTitle, bag }
let S = null;      // trạng thái phim đang chạy

// ---------- dựng cảnh ----------
function mk(cls, skin, stage, seed = 1234) {
  const g = new Game(seed, cls, { difficulty: 'NORMAL', skin, skinFx: PR.skinFx(cls, skin) });
  g.labGod = true; g.labEnergy = true; g.labShards = true;
  if (stage > 1) g.startStage(stage);
  g.spawnQ = g.spawnQ || [];
  A.R.reset(); A.R.camX = g.p.x; A.R.camY = g.p.y; A.R.camTarget = null; A.R.banner = null;
  A.setGame(g); S.g = g; S.bot = { atk: 0, cast: 0.4, ci: 0, dash: 1.6 };
  return g;
}
function ring(g, n, r, types) {
  const p = g.p;
  types = types || ROSTER[g.theme] || ROSTER.forest;   // quái đúng biome của cảnh
  for (let i = 0; i < n; i++) g.spawnEnemy(types[i % types.length], i / n * Math.PI * 2 + 0.3, r);
  g.spawnQ = [];
}
const live = g => g.enemies.filter(e => !e.dead && e.type !== 'DUMMY');
function nearest(g) { const p = g.p; let b = null, bd = 1e9; for (const e of live(g)) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; b = e; } } return b; }
function crowd(g) { const L = live(g).filter(e => !e.boss); if (!L.length) return null; let x = 0, y = 0; for (const e of L) { x += e.x; y += e.y; } return { x: x / L.length, y: y / L.length }; }

// bot tự đánh: giữ khoảng cách theo lớp, vòng sườn, tụ lực theo nhịp, xoay vòng chiêu, lướt xuyên định kỳ
function bot(g, dt, force) {
  const p = g.p, B = S.bot, tg = nearest(g), it = { mx: 0, my: 0, slots: [], dash: false, fire: false, fireHeld: false, fireReleased: false };
  p.hp = p.max;
  const aimAt = force.aim || tg;
  if (aimAt) { it.ax = aimAt.x; it.ay = aimAt.y; } else { it.ax = p.x + Math.cos(p.aim) * 120; it.ay = p.y + Math.sin(p.aim) * 120; }
  if (tg && !force.hold) {
    const want = { KNIGHT: 58, RANGER: 280, MAGE: 240 }[p.cls] || 200, dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy) || 1, k = d > want + 30 ? 1 : d < want - 50 ? -1 : 0, side = (Math.floor(S.t / 1.7) % 2 ? 1 : -1) * 0.55;
    it.mx = dx / d * k - dy / d * side; it.my = dy / d * k + dx / d * side;
  }
  if (force.move) { it.mx = force.move.x; it.my = force.move.y; }
  const hold = { KNIGHT: 0.55, RANGER: 0.45, MAGE: 0.7 }[p.cls] || 0.5;
  B.atk += dt; if (B.atk > hold + 0.18) B.atk = 0;
  it.fireHeld = force.noFire ? false : force.charge ? true : (tg && Math.hypot(tg.x - p.x, tg.y - p.y) < 520 && B.atk < hold);
  B.cast -= dt;
  if (!force.noCast && tg && B.cast <= 0) { B.cast = 0.8; const sl = [0, 1, 2, 3].filter(i => p.cores[i] && p.cores[i].type !== 'tri'); if (sl.length) it.slots = [sl[B.ci++ % sl.length]]; }
  B.dash -= dt; if (!force.noDash && tg && B.dash <= 0) { B.dash = 2.6; it.dash = true; if (!it.mx && !it.my) { it.mx = tg.x - p.x; it.my = tg.y - p.y; } }
  if (force.slots) it.slots = force.slots; if (force.dash) { it.dash = true; }
  return it;
}
// cảnh quay không bao giờ "hết màn": giữ trận ở trạng thái đánh, bỏ màn tối chuyển stage / chọn thẻ thưởng
function keepFight(g) { if (g.state !== 'fight') g.state = 'fight'; g.clearT = 0; g.travel = 0; const R = A.R; R.fadeHold = false; R.fadeIn = 0; }
function ff(g, sec) { for (let i = 0; i < sec * 60; i++) { g.step(DT, bot(g, DT, {})); keepFight(g); } g.events.length = 0; }

// ---------- kịch bản ----------
// mỗi cảnh: t0 (giây), dur, setup(), tick(lt, dt) trả về lệnh ép bot; cam(lt) đặt zoom/mục tiêu; cap = chú thích
const CORES_A = [{ type: 'duo', els: ['FIRE', 'WIND'] }, { type: 'duo', els: ['EARTH', 'FIRE'] }, { type: 'duo', els: ['WATER', 'EARTH'] }, { type: 'el', el: 'WIND' }];
function shots() {
  const L = [];
  // 1. Mở màn: cận nhân vật trên đường đất → kéo ra toàn cảnh khi bầy quái tràn vào → lướt xuyên + chém tụ lực (quay chậm)
  L.push({ t0: 0, dur: 4.0, wipe: null, cap: ['FIGHT THE HORDE', 'Fast pixel roguelite action'],
    setup() { const g = mk('KNIGHT', 'dragonknight', 1, 4242); g.enemies = []; g.spawnQ = []; g.p.cores = CORES_A.slice(); g.p.cores.length = 10; S.spawned = false; },
    tick(lt) { const g = S.g; if (!S.spawned && lt > 0.45) { S.spawned = true; ring(g, 16, 560); }
      if (lt > 2.75 && lt < 2.8) { slow(0.35, 0.45, 1.25); const c = crowd(g); return { dash: true, move: c ? { x: c.x - g.p.x, y: c.y - g.p.y } : null }; }
      if (lt > 2.8 && lt < 3.4) return { charge: true, noCast: true }; return lt < 1.2 ? { hold: true, noFire: true, noCast: true, noDash: true } : {}; },
    cam(lt) { return { zoom: lt < 0.6 ? 1.4 : lerp(1.4, 0.85, ease((lt - 0.6) / 2.1)) }; } });
  // 2. Ghép lõi: mở Bag, chọn 3 lõi đơn → Ultimate → bắn ngay vào đám đông (đẩy cận + quay chậm khi nổ)
  L.push({ t0: 4.0, dur: 4.4, wipe: 'slash', cap: ['FORGE ELEMENTAL CORES', 'Merge any elements into new skills'],
    setup() { const g = mk('MAGE', 'celestial', 3, 777); g.enemies = []; g.spawnQ = []; g.p.cores = [{ type: 'el', el: 'FIRE' }, { type: 'el', el: 'WATER' }, { type: 'el', el: 'EARTH' }, { type: 'duo', els: ['WIND', 'FIRE'] }]; g.p.cores.length = 10; ring(g, 14, 300); ff(g, 0.25); S.bagStep = 0; },
    tick(lt) { const g = S.g, b = A.bag;
      const steps = [[0.35, () => { b.open(); S.paused = true; }], [0.6, () => b.sel(0)], [0.8, () => b.sel(1)], [1.0, () => b.sel(2)], [1.45, () => b.merge()], [1.85, () => { b.close(); S.paused = false; }]];
      while (S.bagStep < steps.length && lt >= steps[S.bagStep][0]) steps[S.bagStep++][1]();
      if (lt > 2.05 && !S.ultCast) { S.ultCast = true; const i = g.p.cores.findIndex(c => c && c.type === 'tri'), c = crowd(g); if (i >= 0 && i < 4) { slow(0.35, 0.55, 1.3, c); return { slots: [i], aim: c, noFire: true }; } }
      return lt < 2.6 ? { noCast: true, noDash: true, aim: crowd(g) } : {}; },
    cam(lt) { return { zoom: lt < 2.0 ? 1.1 : 1.0 }; } });
  // 3. Biome + Titan: 5 boss, mỗi con ~2.1s — lia camera sang boss, zoom 1.35 lúc nó gồng đòn, thẻ tên boss
  const BOSSES = [[5, 'KNIGHT', 'gold'], [10, 'RANGER', 'frost'], [15, 'MAGE', 'inferno'], [20, 'KNIGHT', 'obsidian'], [25, 'RANGER', 'shadow']];
  BOSSES.forEach(([st, cls, sk], i) => L.push({ t0: 8.4 + i * 2.12, dur: 2.12, wipe: i % 2 ? 'whip' : 'slash', boss: true, cap: i === 0 ? ['FELL COLOSSAL TITANS', ''] : null,
    setup() { const g = mk(cls, sk, st, 9000 + i * 17); g.p.cores = CORES_A.slice(); g.p.cores.length = 10; ff(g, 0.55); S.shook = false; },
    tick(lt) { if (lt > 0.95 && !S.shook) { S.shook = true; A.R.addShake(7); } return lt < 1.1 ? { noDash: true } : {}; },
    cam(lt) { const g = S.g, p = g.p, b = g.boss && !g.boss.dead ? g.boss : null; if (!b) return { zoom: 1.05 };
      if (lt < 0.35) return { zoom: 1.0 }; if (lt < 1.35) return { zoom: lerp(1.0, 1.35, ease((lt - 0.35) / 0.8)), target: { x: b.x, y: b.y - b.r * 0.4, k: 7 } };
      return { zoom: lerp(1.35, 1.0, ease((lt - 1.35) / 0.6)), target: { x: (b.x + p.x) / 2, y: (b.y + p.y) / 2, k: 6 } }; } }));
  // 4. Tướng & skin: nhân vật biến hình giữa trận qua vụ nổ nguyên tố, mỗi skin tung đòn đặc trưng
  const SKN = [['KNIGHT', 'dragonknight', 'DRAGON KNIGHT'], ['RANGER', 'starlight', 'STARLIGHT HUNTRESS'], ['MAGE', 'celestial', 'CELESTIAL ARCHON'], ['KNIGHT', 'ignivar', 'IGNIVAR BOSS SKIN'], ['MAGE', 'stormcrown', 'STORMCROWN BOSS SKIN']];
  SKN.forEach(([cls, sk, nm], i) => L.push({ t0: 19.0 + i * 1.6, dur: 1.6, wipe: i === 0 ? 'slash' : 'morph', cap: [nm, i === 0 ? 'Heroes & mythic skins' : ''],
    setup() { const g = mk(cls, sk, [3, 7, 12, 17, 22][i], 3100 + i); /* mỗi skin một biome, tránh màn boss */ g.enemies = []; g.spawnQ = []; g.p.cores = CORES_A.slice(); g.p.cores.length = 10; ring(g, 12, 230); ff(g, 0.15); },
    tick(lt) { return lt < 0.8 ? { charge: true, noDash: true } : lt < 0.9 ? { slots: [i % 3] } : {}; },
    cam() { return { zoom: 1.22 }; } }));
  // 5. Cao trào: đấu Stormcrown → tuyệt kỹ + khựng hình → chớp sét → màn tiêu đề
  L.push({ t0: 27.0, dur: 3.0, wipe: 'slash', cap: null, final: true,
    setup() { const g = mk('KNIGHT', 'titanslayer', 25, 2525); g.p.cores = [{ type: 'tri', els: ['FIRE', 'WATER', 'EARTH'] }, ...CORES_A.slice(0, 3)]; g.p.cores.length = 10; ff(g, 0.4); },
    tick(lt) { const g = S.g; if (lt > 1.5 && !S.ultCast) { S.ultCast = true; slow(0.3, 0.7, 1.35, g.boss); return { slots: [0], aim: g.boss, noFire: true }; }
      if (lt > 2.35 && !S.flashed) { S.flashed = true; S.flash = 1; A.R.addShake(10); } return {}; },
    cam(lt) { const g = S.g, b = g.boss && !g.boss.dead ? g.boss : null, p = g.p; if (!b) return { zoom: 1.2 };
      return { zoom: lerp(1.05, 1.3, ease((lt - 0.4) / 1.4)), target: { x: lerp(p.x, b.x, 0.45), y: lerp(p.y, b.y, 0.45), k: 5 } }; } });
  return L;
}
const TITLE_AT = 30.0, END_AT = 33.6;

// quay chậm + đẩy cận vào điểm va chạm
function slow(scale, dur, punch, at) { S.slowT = dur; S.slowScale = scale; S.punch = punch; S.punchAt = at ? { x: at.x, y: at.y } : null; S.punchT = dur + 0.25; }

// ---------- vòng chạy ----------
export function startTrailer(api) {
  if (!LOGO) { LOGO = new Image(); LOGO.src = 'icons/logo-480.png'; }   // tải trước logo cho màn tiêu đề
  A = api; S = { t: 0, i: -1, list: shots(), acc: 0, slowT: 0, slowScale: 1, punch: 1, punchT: 0, flash: 0, zoom: 1.4, caps: true, wipeT: -1, capT: 0 };
  A.setUi('trailer'); document.body.classList.add('trailer');
}
export function stopTrailer() { if (!S) return; S = null; const R = A.R; R.camZoom = 1; R.camTarget = null; document.body.classList.remove('trailer'); try { A.bag.close(); } catch (e) { /* bag chưa mở */ } A.toTitle(); }
export function trailerOn() { return !!S; }
export function toggleCaptions() { if (S) S.caps = !S.caps; }

export function trailerFrame(dt) {
  if (!S) return; const R = A.R;
  S.t += dt;
  if (S.t >= END_AT) { stopTrailer(); return; }
  // chuyển cảnh: dựng cảnh mới đúng lúc vệt quét che kín màn hình
  const nx = S.list[S.i + 1];
  if (nx && S.t >= nx.t0) { S.i++; S.cur = nx; S.lt0 = nx.t0; S.ultCast = false; S.flashed = false; S.paused = false; nx.setup(); S.capT = 0; if (nx.wipe) { S.wipe = nx.wipe; S.wipeT = 0; } }
  const sh = S.cur; if (!sh) return;
  const lt = S.t - sh.t0;
  const inTitle = S.t >= TITLE_AT;
  // thời gian phim: chậm lại khi quay chậm
  let ts = 1; if (S.slowT > 0) { S.slowT -= dt; ts = S.slowScale; }
  const force = inTitle ? { noFire: true, noCast: true, noDash: true, hold: true } : (sh.tick(lt, dt) || {});
  const g = S.g;
  if (!S.paused && !inTitle) { S.acc += dt * ts; let n = 0; while (S.acc >= DT && n < 4) { g.step(DT, bot(g, DT, force)); force.slots = null; force.dash = false; S.acc -= DT; n++; keepFight(g); } }
  // camera
  const c = sh.cam(lt) || {}; let zoom = c.zoom || 1;
  if (S.punchT > 0) { S.punchT -= dt; zoom *= lerp(1, S.punch, Math.min(1, S.punchT / 0.25)); }
  S.zoom += (zoom - S.zoom) * Math.min(1, dt * 8); R.camZoom = S.zoom;
  R.camTarget = S.punchT > 0 && S.punchAt ? { x: S.punchAt.x, y: S.punchAt.y, k: 9 } : c.target || null;
  R.banner = null; R.castText = null;
  if (!inTitle) R.draw(g, { dt: S.paused ? 0 : dt * ts, sfx: A.SFX, aimDist: 300 });
  overlay(R.ctx, R, dt, lt, sh, inTitle);
}

// ---------- lớp phủ: letterbox, chú thích, vệt chuyển cảnh, chớp sáng, màn tiêu đề ----------
function overlay(c, R, dt, lt, sh, inTitle) {
  const W = R.W, H = R.H, k = H / Math.max(1, innerHeight), px = v => Math.round(v * k);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
  if (inTitle) { titleCard(c, W, H, S.t - TITLE_AT, px); return; }
  // màn tối dần trước tiêu đề
  if (sh.final && lt > 2.45) { c.globalAlpha = Math.min(1, (lt - 2.45) / 0.5); c.fillStyle = '#0b0f0d'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  // chớp sét
  if (S.flash > 0) { S.flash = Math.max(0, S.flash - dt * 2.2); c.globalAlpha = S.flash; c.fillStyle = '#f4fbff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  if (S.caps) {
    // letterbox trượt vào trong 0.4s đầu phim
    const bh = px(28) * ease(S.t / 0.4); c.fillStyle = '#000'; c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh);
    // chú thích góc dưới trái: trượt vào, giữ, trượt ra
    const cap = sh.boss && S.g.boss ? [S.g.boss.def.name.toUpperCase(), S.g.boss.def.epithet] : sh.cap;
    if (cap && lt > 0.25) lowerThird(c, cap, lt - 0.25, sh.dur - 0.5, W, H, px, sh.boss && sh.cap ? sh.cap[0] : null);
  }
  // vệt chuyển cảnh (che chỗ cắt cảnh)
  if (S.wipeT >= 0) { S.wipeT += dt; const T = 0.32, kk = S.wipeT / T; if (kk >= 1) S.wipeT = -1; else wipe(c, W, H, kk, S.wipe); }
}
function lowerThird(c, [title, sub], t, hold, W, H, px, kicker) {
  const inK = ease(t / 0.25), outK = ease((t - hold) / 0.25), x0 = px(26) - (1 - inK) * px(380) - outK * px(380), y = H - px(28) - px(78);
  if (outK >= 1) return;
  c.save(); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  if (kicker) { c.font = `700 ${px(12)}px "Pixelify Sans",monospace`; c.fillStyle = '#d4af37'; c.fillText(kicker, x0, y - px(10)); }
  c.font = `800 ${px(26)}px "Pixelify Sans",monospace`; const tw = c.measureText(title).width;
  c.fillStyle = '#000a'; c.fillRect(x0 - px(10), y, tw + px(24), px(sub ? 54 : 38));
  c.fillStyle = '#d4af37'; c.fillRect(x0 - px(10), y, px(4), px(sub ? 54 : 38)); c.fillRect(x0 - px(10), y + px(sub ? 54 : 38) - px(3), (tw + px(24)) * Math.min(1, t / 0.5), px(3));
  c.fillStyle = '#141013'; c.fillText(title, x0 + px(2), y + px(30)); c.fillStyle = '#f2d675'; c.fillText(title, x0, y + px(28));
  if (sub) { c.font = `600 ${px(13)}px "Pixelify Sans",monospace`; c.fillStyle = '#c8d0c8'; c.fillText(sub, x0, y + px(46)); }
  c.restore();
}
// vệt chém chéo (lửa), lia nhanh (vệt ngang), biến hình (vòng sáng nở ra)
function wipe(c, W, H, k, kind) {
  c.save();
  if (kind === 'morph') { const r = Math.hypot(W, H) * ease(k < 0.5 ? k * 2 : 2 - k * 2) * 0.6; c.globalAlpha = 0.9; c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(W / 2, H / 2, r, 0, 7); c.fill(); c.globalAlpha = 1; c.restore(); return; }
  if (kind === 'whip') { const x = lerp(-W * 0.6, W * 1.6, k); for (let i = 0; i < 14; i++) { const y = (i / 14) * H, w = W * (0.5 + ((i * 37) % 10) / 20); c.fillStyle = i % 3 ? '#0b0f0d' : '#1d2a25'; c.fillRect(x - w, y, w, H / 14 + 1); } c.restore(); return; }
  // slash: dải chéo đỏ-cam-vàng quét từ trái qua phải, lõi trắng ở mép trước
  const x = lerp(-W * 0.7, W * 1.7, k), sk = H * 0.6; const band = (off, w, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x - off, 0); c.lineTo(x - off - w, 0); c.lineTo(x - off - w - sk, H); c.lineTo(x - off - sk, H); c.closePath(); c.fill(); };
  band(0, W * 0.9, '#0b0f0d'); band(-W * 0.02, W * 0.05, '#c8301a'); band(-W * 0.05, W * 0.03, '#ff8a2a'); band(-W * 0.065, W * 0.015, '#fff6d0');
  c.restore();
}
let LOGO = null;
function titleCard(c, W, H, t, px) {
  c.fillStyle = '#0b0f0d'; c.fillRect(0, 0, W, H);
  if (!LOGO) { LOGO = new Image(); LOGO.src = 'icons/logo-480.png'; }
  const cx = W / 2, cy = H * 0.44, slam = t < 0.22 ? lerp(2.4, 1, ease(t / 0.22)) : 1 + Math.max(0, 0.06 - (t - 0.22) * 0.3) * Math.sin(t * 40);
  // sóng xung kích pixel khi logo đập xuống
  if (t > 0.2 && t < 1.1) { const r = (t - 0.2) * px(700), a = 1 - (t - 0.2) / 0.9; c.globalAlpha = a; c.fillStyle = '#d4af37'; const n = 64, s = px(5); for (let i = 0; i < n; i++) { const q = i / n * Math.PI * 2; c.fillRect(Math.round(cx + Math.cos(q) * r) - s / 2, Math.round(cy + Math.sin(q) * r * 0.55) - s / 2, s, s); } c.globalAlpha = 1; }
  c.save(); c.translate(cx, cy); c.scale(slam, slam);
  if (LOGO.complete && LOGO.naturalWidth) { const s = px(96); c.imageSmoothingEnabled = false; c.drawImage(LOGO, -s / 2, -s - px(46), s, s); }
  c.textAlign = 'center'; c.font = `900 ${px(64)}px "Pixelify Sans",monospace`;
  c.fillStyle = '#3a2410'; c.fillText('ELEMENTAL ARENA', 0, px(6)); c.fillStyle = '#ffd36b'; c.fillText('ELEMENTAL ARENA', 0, 0);
  c.restore();
  c.textAlign = 'center';
  if (t > 0.55) { c.globalAlpha = Math.min(1, (t - 0.55) / 0.4); c.font = `700 ${px(18)}px "Pixelify Sans",monospace`; c.fillStyle = '#c8d0c8'; c.fillText(TAGLINE, cx, cy + px(52)); c.globalAlpha = 1; }
  if (t > 1.1 && Math.floor(t * 2.4) % 2 === 0) { c.font = `800 ${px(22)}px "Pixelify Sans",monospace`; const w = c.measureText('PLAY NOW').width + px(36); c.fillStyle = '#2a2412'; c.fillRect(cx - w / 2, cy + px(84), w, px(40)); c.strokeStyle = '#d4af37'; c.lineWidth = px(2); c.strokeRect(cx - w / 2, cy + px(84), w, px(40)); c.fillStyle = '#f2d675'; c.fillText('PLAY NOW', cx, cy + px(112)); }
  c.textAlign = 'left';
}
