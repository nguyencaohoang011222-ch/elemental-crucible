import { CLASSES } from './sim.js';
import { Game, BOSS_STAGES, MAJOR_STAGES, LAST_STAGE, BAR_SIZE, BAG_SIZE, INV_SIZE } from './game.js';
import { EL, EL_INFO, GROUP_COLOR, GROUP_NAME, KITS, skillDef, triDef, coreEls, mergeResult, ultBaseName, RIDER_TEXT, TRI_SETS } from './kits.js';
import { Renderer } from './render.js';
import * as AU from './audio.js';
import { iconSkill, iconUpgrade, iconElement } from './gfx/icons.js';
import { infuseDef } from './kits.js';
import { heroPortrait } from './gfx/portraits.js';
import { renderPixelIcon as PXI, hydratePixelIcons } from './gfx/pixelIcons.js';
import { drawDiorama, hasDiorama } from './gfx/dioramas.js';
// diorama 64×48 cho mọi skin của cả 3 tướng (dựng từ sprite thật trong game): một nhịp 6 FPS chung cho mọi canvas đang hiện
const KD_LIVE = new Set(); let kdFrame = 0;
function heroDiorama(cls, id) { const c = document.createElement('canvas'); c.width = 64; c.height = 48; c.className = 'kdio'; c.dataset.cls = cls; c.dataset.kd = id || ''; drawDiorama(c, cls, c.dataset.kd, kdFrame); KD_LIVE.add(c); return c; }
setInterval(() => { kdFrame = (kdFrame + 1) % 4; for (const c of KD_LIVE) { if (!c.isConnected) { KD_LIVE.delete(c); continue; } drawDiorama(c, c.dataset.cls, c.dataset.kd, kdFrame); } }, 1000 / 6);
import { elemEmblem } from './gfx/elemicon.js';
import { initLab, showLab, toggleLab, labClick, labMode, rebuildLab } from './lab.js';
import * as PR from './profile.js';
import { ENEMIES } from './sim.js';
import { skinWeapon, weapon, HERO_MX, HERO_MY } from './gfx/rig.js';
import { bowGrid } from './gfx/skinlooks.js';
import { Grid } from './gfx/pixel.js';
import * as FG from './forge.js';
import * as RL from './relics.js';
import * as ON from './online.js';
import * as TM from './mobile.js';
import { startTrailer, stopTrailer, trailerFrame, toggleCaptions, trailerTime, renderTrailerAudio, renderTrailerMusic, trailerClipList } from './trailer.js';
import { forgeInfo } from './forgeups.js';
import { MINOR_BY_ID } from './upgrades.js';
import { STAT_DROPS } from './game.js';
import { coreDef } from './kits.js';
import { smithSprite } from './gfx/forge.js';
import { snapshotRun, restoreRun, validRun } from './runsave.js';
import { initCoop, openCoop, coopTick, queueCmd, CO, leave as leaveCoop } from './coop.js';
import * as SU from './seasonui.js';

const $ = id => document.getElementById(id);
const cv = $('c'), R = new Renderer(cv);

// ---------- cài đặt (lưu trên máy) ----------
const SET = { gfx: 'auto', master: 70, sfx: 90, music: 55, musicOn: true, sfxOn: true, shake: true, numbers: true, hints: true, autopause: true, control: 'wasd', fps: false, light: true, zoom: 100 };
{ let saved = {}; try { saved = JSON.parse(localStorage.getItem('ea-settings') || '{}'); } catch (e) { /* trình duyệt chặn lưu trữ */ } Object.assign(SET, saved); if (!saved.control && matchMedia('(pointer: coarse)').matches) SET.control = 'touch'; }   // máy cảm ứng: lần đầu tự chọn điều khiển Touch
function saveSet() { try { localStorage.setItem('ea-settings', JSON.stringify(SET)); } catch (e) { /* bỏ qua */ } R.opts.shake = SET.shake; R.opts.numbers = SET.numbers; R.opts.fps = SET.fps; R.opts.light = SET.light; applyGfx(); AU.setVolumes(SET.master / 100, SET.sfx / 100, SET.music / 100); AU.setMusicOn(SET.musicOn); AU.setSfxOn(SET.sfxOn); }
saveSet();
// camera khoá tầm nhìn: luôn thấy đúng VIEW_ROWS pixel game theo chiều dọc (≈800 đơn vị thế giới ≈ 16.7 ô), bất kể cỡ cửa sổ / toàn màn hình / devicePixelRatio.
// canvas vẽ ở độ phân giải VIEW_ROWS×P (P nguyên → pixel đều), CSS kéo giãn cho vừa cửa sổ; chiều ngang theo tỉ lệ màn hình.
const VIEW_ROWS = 267;
const ZOOMS = [90, 100, 115, 130, 150];   // % phóng to do người chơi chọn (Settings): ít hàng pixel hơn = nhìn to hơn
function fit() { const rows = Math.round(VIEW_ROWS * 100 / Math.max(80, Math.min(160, SET.zoom || 100))), w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), P = Math.max(2, Math.round(h / rows)), H = rows * P; R.fixedP = P; R.resize(Math.round(w * H / h), H); }
addEventListener('resize', fit); fit();

// ---------- âm thanh: xem audio.js (hiệu ứng 8-bit + nhạc chiptune) ----------
let muted = false;
const tone = AU.tone, SFX = AU.SFX;
R.onStep = tk => AU.step(tk);

// ---------- trạng thái ----------
let game = new Game(7, 'KNIGHT', { training: true }); // phông nền màn hình chính
let ui = 'title', runCfg = { cls: 'KNIGHT', element: 'FIRE', difficulty: 'NORMAL' }, isTraining = false, endShown = false;
const keys = new Set(), mouse = { x: 0, y: 0, down: false, pressed: false, released: false, rdown: false };
let slotQ = [], dashQ = false, spaceQ = false, moveTo = null, attackT = null, marker = null; let potQ = null;
// phím chiêu đổi theo kiểu điều khiển: WASD dùng Q E R F, chuột phải dùng Q W E R
const slotCodes = () => SET.control === 'wasd' ? ['KeyQ', 'KeyE', 'KeyR', 'KeyF'] : ['KeyQ', 'KeyW', 'KeyE', 'KeyR'];
const slotLabel = i => slotCodes()[i].slice(3);
const modals = [];

function openModal(id) { if (!modals.includes(id)) modals.push(id); $(id).classList.add('on'); }
function closeModal(id) { id = id || modals[modals.length - 1]; if (!id) return; $(id).classList.remove('on'); const i = modals.indexOf(id); if (i >= 0) modals.splice(i, 1); }
function resetInput() { slotQ = []; dashQ = false; spaceQ = false; moveTo = null; attackT = null; marker = null; mouse.down = mouse.rdown = false; keys.clear(); TM.resetTouch(); }
function ensureAudio() { AU.ensure(); }
addEventListener('pointerdown', ensureAudio); addEventListener('keydown', ensureAudio);

// mọi thao tác UI làm thay đổi ván chơi đi qua act(): chơi đơn chạy ngay; co-op thì cả hai máy cùng áp dụng ở cùng một khung
const ACT = {
  pickMinor: (g, id) => g.pickMinor(id), pickMajor: (g, c) => g.pickMajor(c), skipReward: g => g.finishReward(), reroll: (g, paid) => g.rerollReward(paid),
  swap: (g, a, b) => g.swapInv(a, b), merge: (g, idxs) => g.mergeCores(idxs), proceed: g => g.proceed(),
  forge: (g, i) => FG.forgeCore(g, i), stat: (g, id) => FG.buyStat(g, id), pot: (g, k) => FG.buyPotion(g, k), sellCore: (g, i) => FG.sellCore(g, i), sellShard: g => FG.sellShard(g),
  buyRelic: (g, id) => RL.buyRelic(g, id), rerollRelics: (g, pay) => RL.rerollRelics(g, pay), sellRelic: (g, id) => RL.sellRelic(g, id)
};
function act(n, a = [], cb) { if (CO.on && game.coop) return queueCmd(n, a, cb); const r = ACT[n](game, ...a); if (cb) cb(r); return r; }
// ---------- co-op ----------
function startCoop(seed, cfgs, me) {
  ensureAudio(); isTraining = false; runCfg = { ...runCfg, cls: cfgs[me].cls };
  game = Game.coop(seed, cfgs, { difficulty: 'NORMAL' }); game.holdForge = true; game.p = game.players[me]; R.coopNames = CO.names; R.coopMe = me;
  enterPlay(); showHint('Co-op: stay close. Stand next to a fallen friend to revive them.', 7);
}
function partnerLeft(msg) { if (!game.coop) return; for (const k of [...modals]) closeModal(k); toTitle(); showHint(msg || 'Your partner left.', 5); }
function coopFrame(dt, wm) {
  if (game.over) return;
  if (game.state === 'reward') { if (ui === 'play' && game.rewards.length && !CO.rwBusy) openReward(); else if (!game.rewards.length && !modals.length) showHint('Waiting for your friend to pick a card…', 0.3); }
  if (CO.wait > 0.6) showHint('Waiting for your friend…', 0.3);
  if (game.p.down) showHint('You are down. Your friend can revive you by standing next to you.', 0.3);
  coopTick(dt, first => {
    const free = ui === 'play' && !modals.length && game.state === 'fight';
    const { it, kx, ky, wasd } = free ? readInput(dt, wm) : { it: { ax: wm.x, ay: wm.y } };
    if (first) {
      it.slots = free ? slotQ.splice(0) : []; it.potion = free ? potQ : null; potQ = null;
      if (dashQ && free) { const p = game.p; it.dash = true; if (TM.touchOn()) { const d = TM.dashDir(game); it.mx = d.x; it.my = d.y; } else if (!(wasd && (kx || ky))) { it.mx = wm.x - p.x; it.my = wm.y - p.y; } moveTo = null; }
      dashQ = false; it.space = free && spaceQ; spaceQ = false;
    } else { it.slots = []; it.fireReleased = false; }
    return it;
  });
  mouse.pressed = false; mouse.released = false;
}
function startRun(cfg) {
  ensureAudio(); runCfg = { ...cfg }; isTraining = false; PR.clearRun();
  game = new Game((Date.now() % 1e6) | 0, cfg.cls, { element: cfg.element, difficulty: cfg.difficulty, skin: PR.skinOf(cfg.cls), skinFx: PR.skinFx(cfg.cls, PR.skinOf(cfg.cls)) });
  game.holdForge = true; hookRunSave(game); enterPlay();
}
// ---------- lưu tiến trình lượt chơi: tự lưu mỗi khi qua stage, tắt tab mở lại vẫn Continue được ----------
function hookRunSave(g) { g.onStageSave = n => { if (g !== game || isTraining || g.lab) return; PR.saveRun(snapshotRun(g, n)); pushNow(); }; }
const savedRun = () => validRun(PR.P.run) && CLASSES[PR.P.run.cls] ? PR.P.run : null;
function continueRun() {
  const s = savedRun(); if (!s) { renderContinue(); return; }
  ensureAudio(); isTraining = false; runCfg = { ...runCfg, cls: s.cls, difficulty: s.difficulty || 'NORMAL' };
  try { game = restoreRun(s, { skin: PR.skinOf(s.cls), skinFx: PR.skinFx(s.cls, PR.skinOf(s.cls)) }); }
  catch (e) { console.warn('runsave: không khôi phục được', e); PR.clearRun(); renderContinue(); showHint('Your saved run could not be loaded.', 4); return; }
  game.holdForge = true; hookRunSave(game); enterPlay(); showHint('Run restored: stage ' + s.stage + '.', 3);
}
function renderContinue() {
  const s = savedRun(), b = $('contbtn'), nb = document.querySelector('.tbtn[data-act="newrun"]'); if (!b) return;
  b.classList.toggle('hidden', !s); if (nb) nb.classList.toggle('hero', !s);
  if (s) b.querySelector('small').textContent = 'Stage ' + s.stage + ' · ' + CLASSES[s.cls].name + (s.difficulty === 'HARD' ? ' · Brutal' : '');
}
function startTraining(cls) {
  ensureAudio(); isTraining = true;
  game = new Game((Date.now() % 1e6) | 0, cls || runCfg.cls, { training: true, skin: PR.skinOf(cls || runCfg.cls), skinFx: PR.skinFx(cls || runCfg.cls, PR.skinOf(cls || runCfg.cls)) });
  enterPlay();
}
let labCfg = { cls: 'KNIGHT', theme: 'forest' };
const LAB_KEEP = ['labGod', 'labEnergy', 'labFreezeAI', 'labSlow', 'labShards', 'labPacks', 'infHp', 'labGold'];
function startLab(cfg) {
  ensureAudio(); isTraining = true; labCfg = { ...cfg };
  const keep = game && game.lab ? Object.fromEntries(LAB_KEEP.map(k => [k, game[k]])) : {}; // đổi map/class trong Test Lab: giữ nguyên các công tắc
  game = new Game((Date.now() % 1e6) | 0, cfg.cls, { training: true, lab: true, theme: cfg.theme, skin: PR.skinOf(cfg.cls), skinFx: PR.skinFx(cfg.cls, PR.skinOf(cfg.cls)) });
  Object.assign(game, keep);
  enterPlay(); showLab(true);
  if (cfg.cls === 'AXIOM') showHint('Axiom: release a full charge as the square closes to cut; ' + (TM.touchOn() ? 'tap the cube button' : 'tap Shift') + ' to fold. Hold it on a foe to swap places, on yourself to confuse them. Release a full charge late to rush; keep holding to stop time. A full purple bar cheats one death.', 12);
}
initCoop({ game: () => game, start: startCoop, partnerLeft, ACT, openModal, closeModal, defaultCls: () => runCfg.cls, myName: () => (ON.state().nick || 'Player'), skinOf: c => PR.skinOf(c), skinFx: c => PR.skinFx(c, PR.skinOf(c)) });
initLab({ game: () => game, cfg: () => labCfg, restart: c => startLab(c), R, openBag: () => openBag(), hint: (s) => showHint(s, 3), resetProfile: () => { PR.reset(); showHint('Profile reset', 2); } });
// dải chiêu Test Lab: kéo thẳng lên ô nào trên thanh chiêu thì thay ô đó
function buildLabStrip() {
  const S = $('labstrip'); S.innerHTML = ''; const all = [];
  for (const a of EL) all.push({ type: 'el', el: a });
  for (const a of EL) for (const b of EL) if (a !== b) all.push({ type: 'duo', els: [a, b] });
  for (const set of TRI_SETS) all.push({ type: 'tri', els: set.slice() });
  for (const a of EL) for (const b of EL) if (a !== b) all.push({ type: 'inf', els: [a, b], add: a });
  for (const c of all) { const s = game.coreSkill(c), im = document.createElement('img'); im.src = iconSkill(s); im.title = s.name + ' (' + s.cost + ' energy) — drag onto a skill slot'; im.draggable = true; im.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', 'core:' + JSON.stringify(c))); im.addEventListener('mousedown', ev => ev.stopPropagation()); S.appendChild(im); }
}
function syncTrainPanel() {
  $('labstrip').classList.add('hidden');
}
// ---------- gem, nhiệm vụ, thành tựu ----------
function trackEvents(evs) {
  for (const e of evs) {
    if (e.ev === 'kill') { PR.track('kills'); const d = ENEMIES[e.type]; if (d && d.elite) { PR.track('elites'); if (Math.random() < PR.ECON.eliteChance) { PR.addGems(PR.ECON.eliteGems, 'Elite'); showHint('💎 +' + PR.ECON.eliteGems + ' from the elite!', 2); } } }
    else if (e.ev === 'bossIntro') game.noHitBoss = true;
    else if (e.ev === 'hurt' && game.boss) game.noHitBoss = false;
    else if (e.ev === 'bossDown') { const bid = game.boss ? game.boss.def.id : e.name, n = PR.bossDefeated(bid); if (!game.coop) game.bossLoot('gem', Math.max(1, Math.min(5, n)), '+' + n + ' gems', ''); const sh = PR.rollBossShard(bid); if (sh && game.coop) showHint(sh.unlocked ? 'BOSS SKIN UNLOCKED: ' + sh.name : CLASSES[sh.cls].name + ' shard: ' + sh.name + ' ' + sh.count + '/' + sh.need, 4); else if (sh) { game.bossLoot('bshard', 1, 'BOSS SHARD', sh.unlocked ? 'BOSS SKIN UNLOCKED: ' + sh.name + ' (' + CLASSES[sh.cls].name + ')!' : CLASSES[sh.cls].name + ' shard: ' + sh.name + ' ' + sh.count + '/' + sh.need); R.rings.push({ x: e.x, y: e.y, r: 10, R: 160, t: 0.8, T: 0.8, c: '#5af0c0', w: 6 }); } if (game.noHitBoss) PR.track('nohit'); }
    else if (e.ev === 'stageClear') PR.track('stages');
    else if (e.ev === 'forgeHold') showHint('Stage clear. Shop at ' + e.name + ' as long as you like, then press ' + (TM.touchOn() ? 'Next stage' : 'Enter or Next stage') + '.', 8);
    else if (e.ev === 'pickup' && e.hint) showHint(e.hint, 5);
    else if (e.ev === 'bombBlast') PR.track('bombs');
    else if (e.ev === 'obstacleBreak' && e.type === 'crystal') PR.track('crystals');
  }
}
function updateQuestDot() { const d = $('questdot'); if (d) d.classList.toggle('on', PR.P.quests.list.some(q => !q.claimed && q.progress >= q.goal)); }
PR.onChange(() => { updateQuestDot(); for (const id of ['titlegems', 'shopgems', 'dailygems']) if ($(id) && !(id === 'dailygems' && gemLock)) setGems($(id), PR.P.gems); });
PR.save();
const TIER_ICON = { common: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>', rare: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 8l1.5 3 3 .5-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.5z"/>', boss: '<path d="M5 9l3.5 2.5L12 6l3.5 5.5L19 9l-1.2 4H6.2z"/><path d="M7 13v2.5C7 18 9.2 20 12 20s5-2 5-4.5V13"/><path d="M9.8 16h.01M14.2 16h.01M11 18.5h2"/>', epic: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 7l3 5-3 5-3-5z"/>', victory: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M8 13l2-4 2 3 2-3 2 4z"/>', heroes: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M8 14V9l2 2 2-3 2 3 2-2v5z"/><path d="M8 16h8"/>' };
const tierBadge = (tier, s = 20) => PXI('tier:' + (tier || 'common'), s, 'tbadge'); const tierBadgeOld = (tier, s = 20) => '<svg class="tbadge" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="' + (PR.TIERS[tier] || PR.TIERS.common).color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + TIER_ICON[tier] + '</svg>';
const COVER_TXT = { basic: 'Basic attack & charge', move: 'Walk & dash', single: 'Single-element skills', duo: 'Dual-element skills', ult: 'Ultimates' };
const COVER_ORDER = ['single', 'basic', 'move', 'duo', 'ult'];
const PERK = { common: '✦ New look', rare: '✦ Custom weapon + elemental FX', epic: '✦ Epic combat VFX', victory: '✦ Champion VFX', boss: '✦ Boss signature VFX', heroes: '✦ Full mythic VFX overhaul' };
const coverLine = tier => { const T = PR.TIERS[tier] || PR.TIERS.common; return T.cover.length ? ['Custom weapon', ...COVER_ORDER.filter(c => T.cover.includes(c)).map(c => COVER_TXT[c])].join(' · ') : 'New look · default effects'; };
let skinFilter = 'all';
let shopTab = 'skins';
// ảnh thẻ skin: nhân vật cầm vũ khí của skin (xoay 90° cho sắc nét)
let defBow = null;
function heroPreview(cls, skin) {
  const fr = R.rig.frame('h', cls + (skin ? ':' + skin : ''), { by: 0, eyes: 'open' }).img, c = document.createElement('canvas'); c.width = fr.width; c.height = fr.height + 2;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(fr, 0, 2);
  const sw = skin ? skinWeapon(cls, skin, 0) : null, hx = 11 + HERO_MX, hy = 16 + 3 + HERO_MY;   // +3: chibi đã dồn thân xuống 3 hàng
  if (cls === 'RANGER') { const img = sw ? sw.img : (defBow = defBow || bowGrid({}).canvas()); g.drawImage(img, hx - 6, hy - 10); }
  else { const img = sw ? sw.img : weapon(cls === 'KNIGHT' ? 'sword' : 'staff'); g.save(); g.translate(hx, hy + (cls === 'MAGE' ? 5 : 0)); g.rotate(-Math.PI / 2); g.drawImage(img, cls === 'MAGE' ? -1 : -2, -Math.floor(img.height / 2)); g.restore(); }
  return c;
}
function openShop() { renderShop(); openModal('shop'); PR.save(); }
// xem trước hiệu ứng lướt: nhân vật nhỏ chạy ngang trên cỏ, để lại đúng vệt của hiệu ứng đó (pixel, không emoji)
let FXV = [], fxRaf = 0;
function fxStop() { FXV = []; if (fxRaf) cancelAnimationFrame(fxRaf); fxRaf = 0; }
function fxStart() { if (!fxRaf) fxRaf = requestAnimationFrame(fxTick); }
function fxTick(now) {
  fxRaf = 0; if (!FXV.length || !$('shop').classList.contains('on') || shopTab !== 'fx') { FXV = []; return; }
  const t = now / 1000, cls = 'KNIGHT', skin = PR.skinOf(cls);
  for (const v of FXV) {
    const g = v.c.getContext('2d'); g.imageSmoothingEnabled = false; const W = v.c.width, Hh = v.c.height;
    for (let y = 0; y < Hh; y += 4) for (let x = 0; x < W; x += 4) { g.fillStyle = ((x * 7 + y * 13) >> 2) % 5 ? '#2e5232' : '#386a3c'; g.fillRect(x, y, 4, 4); }
    const u = ((t * 0.55 + v.ph) % 1), x = -14 + u * (W + 28), y = 33, f = Math.floor(t / 0.085) % 6;
    const px = (X, Y, c, s = 1) => { g.fillStyle = c; g.fillRect(Math.round(X), Math.round(Y), s, s); };
    for (let k = 1; k <= 14; k++) { const tx = x - k * 3, ty = y - 6 + Math.sin(k * 0.9 + t * 9) * (v.id === 'leaves' ? 3 : 1); if (tx < 0) continue; const a = 1 - k / 15, h = (k * 37 + Math.floor(t * 20)) % 7;
      if (v.id === 'flame') { px(tx, ty - (h % 3), a > 0.6 ? '#ffd36b' : '#ff7a3c', 2); if (h < 2) px(tx + 1, ty - 4 - h, '#fff1b0'); }
      else if (v.id === 'crown') { px(tx, ty + ((k + Math.floor(t * 30)) % 3) - 1, k & 1 ? '#7fe0ff' : '#ffe27a', 2); if (h === 0) px(tx, ty - 5, '#ffffff'); }
      else if (v.id === 'stars') { if (h < 3) { const c = ['#ffffff', '#ffe27a', '#c08aff', '#7fe0ff'][h]; px(tx, ty - h * 2, c); if (h === 0) { px(tx - 1, ty, c); px(tx + 1, ty, c); px(tx, ty - 1, c); px(tx, ty + 1, c); } } }
      else if (v.id === 'leaves') { if (h < 3) { px(tx, ty - h, h & 1 ? '#6aa84c' : '#a8e070', 2); px(tx + 2, ty - h - 1, '#3e7a2a'); } }
      else if (k % 4 === 0) px(tx, y + 3 - (k % 3), '#a89470', 2);   // không hiệu ứng: chỉ bụi chân
    }
    const fr = R.rig.frame('h', cls + (skin ? ':' + skin : ''), { by: f % 3 === 1 ? -1 : 0, lx: Math.round(Math.sin(f) * 1.5), rx: Math.round(-Math.sin(f) * 1.5), cape: 1 + (f & 1), eyes: 'open' }).img;
    g.drawImage(fr, Math.round(x - fr.width / 2), y + 4 - fr.height);
  }
  fxRaf = requestAnimationFrame(fxTick);
}
// rương pixel 16-bit: viền tối dày, gỗ sồi đai sắt khoá đồng / tím hoàng gia viền vàng, gem lam trên nắp
const CHEST_ART = {};
function chestArt(royal) {
  const key = royal ? 'r' : 'w'; if (CHEST_ART[key]) return CHEST_ART[key];
  const g = new Grid(34, 28), O = '#141013';
  const C = royal ? { b: ['#2a1050', '#46207a', '#6a34a8', '#8a52d0'], band: ['#8a6a1a', '#c8983a', '#ffe27a'], lock: '#ffe27a', gem: ['#1a8aa8', '#3ad0e0', '#bff8ff'] } : { b: ['#4a2a14', '#6a4022', '#8a5a32', '#a87444'], band: ['#3a3a44', '#5a5a66', '#8a8a96'], lock: '#c8983a', gem: null };
  g.rect(2, 11, 30, 15, O); g.rect(3, 4, 28, 8, O); g.rect(4, 3, 26, 1, O);   // viền tối dày bao ngoài
  g.rect(3, 12, 28, 13, (i, j) => C.b[(j + (i >> 2)) % 4 === 0 ? 0 : j < 3 ? 3 : j < 8 ? 2 : 1]);   // thân: ván gỗ / nhung tím
  for (let x = 3; x < 31; x += 7) g.rect(x, 12, 1, 13, C.b[0]);
  g.rect(4, 4, 26, 7, (i, j) => C.b[j < 2 ? 3 : 2]); g.rect(5, 3, 24, 1, C.b[3]);   // nắp cong
  g.rect(3, 11, 28, 2, (i) => C.band[i & 1 ? 1 : 2]); g.rect(3, 24, 28, 1, C.band[0]);   // đai ngang
  for (const x of [6, 26]) { g.rect(x, 4, 2, 21, (i, j) => C.band[i ? 0 : 1]); for (let y = 6; y < 24; y += 5) g.set(x, y, C.band[2]); }   // đai dọc + đinh tán
  g.rect(15, 12, 4, 6, O); g.rect(16, 13, 2, 4, C.lock); g.set(16, 15, O);   // khoá
  if (royal) { g.rect(14, 3, 6, 5, O); g.rect(15, 4, 4, 3, C.gem[1]); g.set(15, 4, C.gem[2]); g.set(18, 6, C.gem[0]); for (const x of [3, 30]) g.rect(x, 4, 1, 21, C.band[1]); g.rect(3, 4, 28, 1, C.band[2]); }   // gem lam + viền vàng
  return (CHEST_ART[key] = g.canvas());
}
const BEAM = { common: '#ffffff', trail: '#7fe0ff', rare: '#5aa8ff', shard: '#5af0c0', epic: '#b06aff', heroes: '#ffd36b' };
function renderShop() {
  const T = $('shoptabs'); T.innerHTML = '';
  if (shopTab === 'gems') shopTab = 'skins'; fxStop();
  $('gemtip').innerHTML = '<b>Earn gems for free</b><ul><li>First kill of each titan: ' + GEM(12) + PR.ECON.bossFirst + ' (later ' + GEM(12) + PR.ECON.bossRepeat + ')</li><li>End of a run: ' + GEM(12) + '1 per ' + PR.ECON.perStages + ' stages, ' + GEM(12) + PR.ECON.winBonus + ' for a win</li><li>Elites: ' + PR.ECON.eliteChance * 100 + '% chance of ' + GEM(12) + PR.ECON.eliteGems + '</li><li>Daily login streak: ' + PR.ECON.login.join(' · ') + '</li><li>3 daily quests and one-time achievements</li></ul><em>Gem packs (real money) are disabled in this prototype.</em>';
  for (const [k, n] of [['skins', 'Skins'], ['fx', 'Dash effects'], ['chest', 'Chests']]) { const b = document.createElement('button'); b.textContent = n; b.className = k === shopTab ? 'on' : ''; b.onclick = () => { shopTab = k; renderShop(); }; T.appendChild(b); }
  const B = $('shopbody'); B.innerHTML = '';
  if (shopTab === 'skins') {
    const F = document.createElement('div'); F.className = 'tfilter'; B.appendChild(F);
    for (const k of ['all', 'common', 'rare', 'epic', 'heroes', 'boss']) { const b = document.createElement('button'); b.className = k === skinFilter ? 'on' : ''; b.innerHTML = (k === 'all' ? '' : tierBadge(k, 14)) + (k === 'all' ? 'All' : PR.TIERS[k].name); b.onclick = () => { skinFilter = k; renderShop(); }; F.appendChild(b); }
    for (const cls of ['KNIGHT', 'RANGER', 'MAGE']) {
      const list = PR.SKINS[cls].filter(s => skinFilter === 'all' || (s.tier || 'common') === skinFilter || (skinFilter === 'epic' && s.tier === 'victory')); if (!list.length) continue;
      B.insertAdjacentHTML('beforeend', '<div class="invlabel">' + CLASSES[cls].name + '</div>'); const grid = document.createElement('div'); grid.className = 'skgrid'; B.appendChild(grid);
      for (const s of list) {
        const tier = s.tier || 'common', T = PR.TIERS[tier], own = PR.ownsSkin(cls, s.id), eq = PR.skinOf(cls) === s.id, d = document.createElement('div');
        d.className = 'skcard t-' + tier + (eq ? ' eq' : ''); d.style.setProperty('--tc', T.color); d.style.setProperty('--tg', T.glow);
        d.innerHTML = '<div class="skhead">' + tierBadge(tier) + '<span>' + T.name + '</span></div><div class="skart"></div><b>' + s.name + '</b><div class="skfx"><span class="skperk">' + PERK[tier] + '</span></div>';
        { const art = d.querySelector('.skart'); if (hasDiorama(cls, s.id)) { art.classList.add('kd'); art.appendChild(heroDiorama(cls, s.id)); } else art.appendChild(heroPreview(cls, s.id)); }
        if (tier === 'boss') { const n = PR.shardsOf(s.boss, cls); d.insertAdjacentHTML('beforeend', '<div class="shards">' + Array.from({ length: PR.SHARD_NEED }, (_, i) => '<i class="' + (i < n || own ? 'on' : '') + '"></i>').join('') + '<span>' + (own ? 'Crafted' : n + '/' + PR.SHARD_NEED + ' shards') + '</span></div>'); }
        const row = document.createElement('div'); row.className = 'skrow';
        const pv = document.createElement('button'); pv.className = 'skpv'; pv.innerHTML = PXI('eye', 15) + 'Preview'; if (0) pv.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>Preview'; pv.onclick = () => openSkinPreview(cls, s.id); row.appendChild(pv);
        const bt = document.createElement('button'); bt.className = 'skbuy' + (own ? '' : ' buy');
        bt.innerHTML = eq ? 'Equipped' : own ? 'Equip' : tier === 'boss' ? 'Boss drop' : tier === 'victory' ? 'Win a run' : GEM(14) + s.price;
        if (!own && (tier === 'boss' || tier === 'victory')) bt.disabled = true;
        bt.onclick = () => { if (own) PR.equipSkin(cls, s.id); else if (!PR.buySkin(cls, s.id)) return showShopMsg('Not enough gems.'); renderShop(); };
        row.appendChild(bt); d.appendChild(row); grid.appendChild(d);
      }
    }
  }
  else if (shopTab === 'fx') {
    const grid = document.createElement('div'); grid.className = 'fxgrid'; B.appendChild(grid);
    for (const t of PR.TRAILS) {
      const own = PR.ownsTrail(t.id), eq = PR.P.trail === t.id, d = document.createElement('div'); d.className = 'fxcard' + (eq ? ' eq' : '') + (t.exclusive ? ' excl' : '');
      d.innerHTML = '<div class="fxhead">' + (t.exclusive ? '<span class="fxtag">' + (t.how ? 'Exclusive' : 'Victory') + '</span>' : '') + (eq ? '<span class="fxtag on">Equipped</span>' : '') + '</div><canvas width="96" height="40"></canvas><b>' + t.name + '</b>';
      const bt = document.createElement('button'); bt.className = 'skbuy' + (own || eq ? '' : ' buy'); bt.innerHTML = eq ? 'Equipped' : own ? 'Equip' : t.exclusive ? (t.how || 'Win a run') : GEM(14) + t.price; bt.disabled = eq || (!own && t.exclusive);
      bt.onclick = () => { if (own) PR.equipTrail(t.id); else if (!PR.buyTrail(t.id)) return showShopMsg('Not enough gems.'); applyTrail(); renderShop(); };
      d.appendChild(bt); grid.appendChild(d); FXV.push({ c: d.querySelector('canvas'), id: t.id, ph: Math.random() });
    }
    fxStart();
  }
  else if (shopTab === 'chest') renderChests(B);
}
// xem trước: một sân thử mini (Game + Renderer riêng) tự lặp chiêu đang chọn lên hình nộm ngay khi bấm. Không ảnh hưởng hồ sơ hay trận đang chơi.
let PV = null;
function openSkinPreview(cls, id) {
  const s = PR.SKINS[cls].find(k => k.id === id), tier = s.tier || 'common', T = PR.TIERS[tier], fx = PR.skinFx(cls, id);
  $('pvbadge').innerHTML = tierBadge(tier, 34); $('pvname').textContent = s.name; $('pvtier').textContent = T.name + ' · ' + CLASSES[cls].name; $('pvtier').style.color = T.color;
  const items = [{ t: 'basic', c: 'basic', name: 'Basic attack' }, { t: 'charge', c: 'basic', name: 'Charged attack' }, { t: 'move', c: 'move', name: 'Walk & dash' }];
  for (const a of EL) items.push({ t: 'skill', c: 'single', a, b: a, name: skillDef(cls, a, a).name });
  for (const a of EL) for (const b of EL) if (a !== b) items.push({ t: 'skill', c: 'duo', a, b, name: skillDef(cls, a, b).name });
  for (const set of TRI_SETS) items.push({ t: 'ult', c: 'ult', a: set[0], els: set.slice(), name: triDef(cls, set).name });
  const keep = PV && PV.cls === cls && PV.id === id ? PV.sel : null, sel = items.find(x => keep && x.name === keep.name) || items[0];
  const L = $('pvlist'); L.innerHTML = ''; let grp = '';
  items.forEach(it => { if (it.c !== grp) { grp = it.c; L.insertAdjacentHTML('beforeend', '<div class="pvgrp">' + COVER_TXT[it.c] + (T.cover.includes(it.c) ? '' : ' <em>default</em>') + '</div>'); }
    const b = document.createElement('button'); b.className = 'pvit' + (T.cover.includes(it.c) ? ' fx' : '') + (it === sel ? ' on' : ''); b.innerHTML = (it.a ? '<img src="' + iconElement(it.a) + '">' : '') + (it.b && it.b !== it.a ? '<img src="' + iconElement(it.b) + '">' : '') + '<span>' + it.name + '</span>';
    b.onclick = () => { L.querySelectorAll('.pvit').forEach(x => x.classList.remove('on')); b.classList.add('on'); PV.sel = it; pvReset(); }; L.appendChild(b); });
  const own = PR.ownsSkin(cls, id), buy = $('pvbuy');
  buy.innerHTML = PR.skinOf(cls) === id ? 'Equipped' : own ? 'Equip' : tier === 'boss' ? CLASSES[cls].name + ' shards ' + PR.shardsOf(s.boss, cls) + '/' + PR.SHARD_NEED + ' · Boss drop' : tier === 'victory' ? 'Win a run to unlock' : 'Buy · ' + GEM(16) + s.price;
  buy.disabled = PR.skinOf(cls) === id || (!own && (tier === 'boss' || tier === 'victory'));
  buy.onclick = () => { if (own) PR.equipSkin(cls, id); else if (!PR.buySkin(cls, id)) { $('pvnote').textContent = 'Not enough gems'; return; } openSkinPreview(cls, id); renderShop(); };
  const fresh = !PV; PV = { cls, id, fx, sel, cmp: false, R: PV ? PV.R : new Renderer($('pvc')) };
  $('pvcmp').textContent = 'Compare default'; $('pvcmp').onclick = () => { PV.cmp = !PV.cmp; $('pvcmp').textContent = PV.cmp ? 'Show ' + s.name : 'Compare default'; $('pvnote').textContent = PV.cmp ? 'Default look' : ''; pvReset(); };
  $('pvnote').textContent = ''; pvReset(); openModal('skinpv'); if (fresh) requestAnimationFrame(pvLoop);
  { const r = $('pvc').getBoundingClientRect(), d = devicePixelRatio || 1; if (r.width > 50 && r.height > 50) { PV.R.fixedP = Math.max(2, Math.round(2.8 * d)); PV.R.camLeadK = 0.18; PV.R.resize(Math.round(r.width * d), Math.round(r.height * d)); pvFrame(); } }   // camera xem trước: vẽ 1:1 pixel thiết bị, mỗi pixel game ≈ 2,8 px CSS (xa hơn ~30%), nhân vật đứng ~32% từ trái
}
function pvReset() {
  const g = new Game(11, PV.cls, { training: true, lab: true, skin: PV.cmp ? '' : PV.id, skinFx: PV.cmp ? null : PV.fx });
  g.labGod = true; g.labEnergy = true; g.enemies = []; PV.x0 = g.p.x; PV.y0 = g.p.y;
  for (let i = 0; i < 5; i++) g.spawnAt('DUMMY', g.p.x + 140 + (i % 2) * 50, g.p.y - 80 + i * 40);
  PV.g = g; PV.t = 0; PV.next = 0.25; PV.alt = 0; PV.R.reset(); pvFrame(); PV.down = false; PV.dashQ = false; PV.castQ = false;
}
function pvFrame() { if (!PV || !PV.g) return; const R = PV.R, p = PV.g.p; R.camX = p.x + (R.camLeadK || 0) * R.W / R.zoom; R.camY = p.y; }   // đặt camera ngay vào khung, không lia từ gốc bản đồ
function pvCast(it, ax, ay) {
  const g = PV.g, p = g.p; g.zones = []; g.ults = []; g.pending = [];
  if (it.t === 'skill') g.castNow(g.skill(it.a, it.b), ax, ay);
  else if (it.t === 'ult') { p.energy = p.energyMax = 999; g.castNow(g.coreSkill({ type: 'tri', els: it.els }), ax, ay); }
}
function pvLoop() {
  if (!PV || !$('skinpv').classList.contains('on')) { PV = null; return; }
  const g = PV.g, dt = 1 / 60, it = PV.sel, p = g.p; PV.t += dt; const inp = {};
  {
    if (it.t === 'move') { const a = PV.t * 1.6; inp.mx = Math.cos(a); inp.my = Math.sin(a) * 0.6; if (PV.t > PV.next) { inp.dash = true; PV.next = PV.t + 1.1; } }
    else if (it.t === 'charge') { const ph = PV.t % 2; inp.fireHeld = ph < 1.3; }
    else if (PV.t > PV.next) {
      p.x = PV.x0; p.y = PV.y0; p.aim = 0; p.giant = 0; p.ultSpin = 0; p.ultLift = 0; p.z = 0;
      for (const e of g.enemies) { e.hp = e.max; }
      if (it.t === 'basic') { g.basicAttack(0); PV.next = PV.t + 0.45; }
      else if (it.t === 'skill') { pvCast(it, p.x + 170, p.y); PV.next = PV.t + 2.4; }
      else { pvCast(it, p.x + 170, p.y); PV.next = PV.t + 5.5; }
    }
    inp.ax = p.x + 170; inp.ay = p.y;
  }
  try { g.step(dt, inp); PV.R.draw(g, { dt, sfx: null, aimDist: 0 }); } catch (err) { console.warn('preview', err); }
  g.events.length = 0;
  requestAnimationFrame(pvLoop);
}
// ---------- rương ----------
const TIER_COL = t => t === 'trail' ? '#7fe0ff' : t === 'shard' ? PR.TIERS.boss.color : (PR.TIERS[t] || PR.TIERS.common).color;
const TIER_NAME = t => t === 'trail' ? 'Dash effect' : t === 'shard' ? 'Boss shard' : (PR.TIERS[t] || PR.TIERS.common).name;
const RANK = ['common', 'trail', 'rare', 'shard', 'epic', 'heroes'];
function renderChests(B) {
  const royal = PR.royalPool(), pity = PR.royalPity(), basic = PR.chestPool(), bt = {};
  for (const o of basic) { const t = o.kind === 'trail' ? 'trail' : PR.SKINS[o.cls].find(s => s.id === o.id).tier; bt[t] = (bt[t] || 0) + o.chance * (1 - PR.CHEST_SHARD); } bt.shard = PR.CHEST_SHARD;
  const bars = list => '<div class="odds">' + list.map(([t, c]) => '<div class="odd"><i style="background:' + TIER_COL(t) + ';width:' + Math.max(3, c * 100) + '%"></i><span style="color:' + TIER_COL(t) + '">' + TIER_NAME(t) + '</span><b>' + (c * 100).toFixed(c < 0.1 ? 1 : 0) + '%</b></div>').join('') + '</div>';
  B.innerHTML = '<div class="chests">'
    + '<div class="chest"><div class="chart" id="cbasic"><i class="crays"></i><i class="mote"></i><i class="mote"></i><i class="mote"></i></div><h3>Wooden Chest</h3><p>Common &amp; Rare skins, dash effects, a rare boss shard.</p>' + bars(Object.entries(bt)) + '<div class="crow"><button class="cbtn" id="ob1">Open · ' + GEM(14) + PR.ECON.chest + '</button></div></div>'
    + '<div class="chest royal"><div class="chart" id="croyal"><i class="crays"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i><i class="spark"></i></div><h3>Royal Chest</h3><p>Rare, <b style="color:#c08aff">Epic</b>, <b style="color:#ff5a4a">HEROES</b> skins and <b style="color:#5af0c0">boss shards</b>.</p>' + bars(royal.map(r => [r.tier, r.chance]))
    + '<div class="pity"><span>Epic or better guaranteed in <b>' + pity.epic + '</b></span><span>HEROES guaranteed in <b>' + pity.heroes + '</b></span></div>'
    + '<div class="crow"><button class="cbtn gold" id="or1">Open · ' + GEM(14) + PR.ROYAL.price + '</button></div></div>'
    + '</div><p class="cnote">Chests contain cosmetics only — never power. Duplicates refund gems. Rates shown are per open; guarantees apply on top.</p><div class="creveal" id="creveal"></div>';
  $('cbasic').appendChild(chestArt(false)); $('croyal').appendChild(chestArt(true));
  const go = (box, results) => {
    if (!results) return showShopMsg('Not enough gems.');
    const best = results.reduce((a, r) => Math.max(a, RANK.indexOf(r.tier)), 0), bestT = RANK[best];
    const art = $(box); art.classList.remove('shake', 'burst', 'beam'); void art.offsetWidth; art.classList.add('shake'); art.style.setProperty('--beam', BEAM[bestT] || '#ffffff'); art.style.setProperty('--bc', TIER_COL(bestT));
    document.querySelectorAll('.cbtn').forEach(b => b.disabled = true);
    setTimeout(() => {
      art.classList.add('burst', 'beam'); if (best >= 4 && SFX.jackpot) SFX.jackpot(best === 5); else if (SFX.claim) SFX.claim();
      if (best === 5) { R.addShake(10); document.querySelector('#shop .box').classList.add('jolt'); setTimeout(() => document.querySelector('#shop .box').classList.remove('jolt'), 500); }
      const V = $('creveal'); V.innerHTML = '';
      results.forEach((r, i) => {
        const tier = r.kind === 'trail' ? 'trail' : r.tier, d = document.createElement('div'); d.className = 'rcard t-' + tier; d.style.setProperty('--tc', TIER_COL(tier)); d.style.animationDelay = (i * 0.28) + 's';
        d.innerHTML = '<div class="rhead">' + (tier === 'trail' ? '' : tierBadge(tier, 16)) + '<span>' + TIER_NAME(tier) + '</span></div><div class="rart"></div><b>' + r.name + '</b>' + (r.cls ? '<div class="rcls">' + CLASSES[r.cls].name + '</div>' : '') + '<div class="rtag ' + (r.dup ? 'dup' : 'new') + '">' + (r.dup ? 'Duplicate · +' + r.refund + ' gems' : r.kind === 'shard' ? (r.unlocked ? 'SKIN UNLOCKED!' : 'Shard ' + r.count + '/' + r.need) : r.pity ? 'NEW · Guaranteed' : 'NEW') + '</div>';
        const ra = d.querySelector('.rart'); if (r.kind === 'shard' && r.cls) { const cv = heroPreview(r.cls, r.id); if (!r.unlocked) cv.style.filter = 'brightness(.55) saturate(.6)'; ra.appendChild(cv); ra.insertAdjacentHTML('beforeend', '<i class="rshard"></i>'); } else if (r.kind === 'skin') ra.appendChild(heroPreview(r.cls, r.id)); else { const t = PR.TRAILS.find(x => x.id === r.id); ra.innerHTML = '<div class="rtrail" style="--c1:' + ((t && t.c && t.c[0]) || '#fff') + ';--c2:' + ((t && t.c && t.c[1]) || '#fff') + '"><i></i><i></i><i></i><i></i></div>'; }
        if (r.kind === 'skin' || (r.kind === 'shard' && r.cls)) { const p = document.createElement('button'); p.className = 'skpv'; p.textContent = 'Preview'; p.onclick = () => openSkinPreview(r.cls, r.id); d.appendChild(p); }
        V.appendChild(d);
      });
      setTimeout(() => { const keep = V.innerHTML; renderChests(B); $('creveal').replaceWith(V); }, 400 + results.length * 280);
    }, 650);
  };
  $('ob1').onclick = () => { const r = PR.openChest(); go('cbasic', r ? [{ ...r, tier: r.kind === 'shard' ? 'shard' : r.kind === 'trail' ? 'trail' : PR.SKINS[r.cls].find(s => s.id === r.id).tier, refund: PR.ECON.chestRefund }] : null); };
  $('or1').onclick = () => go('croyal', PR.openRoyal(1));
}
function showShopMsg(s) { const p = document.createElement('p'); p.style.color = 'var(--bad)'; p.textContent = s; $('shopbody').prepend(p); setTimeout(() => p.remove(), 1600); }
function applyTrail() { const t = PR.TRAILS.find(x => x.id === PR.P.trail); R.opts.trail = t && t.c ? t.c : null; R.opts.aura = t && t.aura ? t.aura : null; }
applyTrail();
function GEM(s) { return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="M7.5 3.5h9L20 9l-8 12.5L4 9z" fill="#0ea5e9"/><path d="M7.5 3.5h9L20 9H4z" fill="#7dd3fc"/><path d="M4 9h5l3 12.5z" fill="#38bdf8"/><path d="M20 9h-5l-3 12.5z" fill="#0284c7"/><path d="M9 9l3-5.5L15 9z" fill="#bae6fd"/><path d="M7.5 3.5h9L20 9l-8 12.5L4 9z" fill="none" stroke="#082f49" stroke-width=".9" stroke-linejoin="round"/></svg>`; }
const FLAME = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f2a33a" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></svg>`;
const ICO = {"firstboss":"<path d=\"M12 4a6 6 0 0 0-6 6c0 2 1 3.5 2.5 4.5V18h7v-3.5C17 13.5 18 12 18 10a6 6 0 0 0-6-6z\"/><path d=\"M9.5 10.5h.01M14.5 10.5h.01M10.5 18v-2M13.5 18v-2\"/>","stage15":"<path d=\"M5 20V4M5 5h11l-2 3 2 3H5\"/>","win1":"<path d=\"M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M8.5 20h7M10 17h4\"/>","allclass":"<path d=\"M12 4l1.9 4 4.3.6-3.1 3 .8 4.3L12 13.8 8.1 15.9l.8-4.3-3.1-3 4.3-.6z\"/>","tri1":"<path d=\"M12 3l8 4.5v9L12 21l-8-4.5v-9z\"/><path d=\"M12 8v8M8.5 10l7 4M15.5 10l-7 4\"/>","elites10":"<path d=\"M5 19L17 7M13 5l6-1-1 6M19 19L7 7M11 5L5 4l1 6\"/>"};
const CREST = (id, got) => { const c = got ? '#d4af37' : '#6a746f'; return `<svg class="crest" viewBox="0 0 48 48"><path d="M24 3l17 7v14c0 9-7 16-17 21C14 40 7 33 7 24V10z" fill="#141a17" stroke="${c}" stroke-width="1.6"/><path d="M24 7l13 5.4V24c0 7-5.4 12.5-13 16.4C16.4 36.5 11 31 11 24V12.4z" fill="none" stroke="${c}" stroke-opacity=".35" stroke-width="1"/><g transform="translate(12 11.5)" fill="none" stroke="${got ? '#f2d675' : '#8a908d'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICO[id]}</g>${got ? '' : '<g stroke="#9aa09d" stroke-width="1.4" fill="none"><rect x="31" y="31" width="10" height="8" rx="1.5" fill="#121614"/><path d="M33 31v-2.5a3 3 0 0 1 6 0V31"/></g>'}</svg>`; };
// huy hiệu pixel 16×16 cho các cột mốc (viền đen 1px, phóng to bằng pixelated)
const BADGE_PX = {
  firstboss: { p: { H: '#e8d8a8', h: '#a8885a', W: '#ece8dc', w: '#b8b0a0', r: '#ff3a2a', R: '#ffb03a' }, m: [
    '................', '.oo..........oo.', 'oHho........ohHo', '.oHho.oooo.ohHo.', '..ohhoWWWWohho..', '...oWWWWWWWWo...', '..oWWWWWWWWWWo..', '..oWooWWWWooWo..',
    '..oWorRWWRroWo..', '..oWooWWWWooWo..', '..oWWWWooWWWWo..', '...owWWWWWWwo...', '...oWoWoWoWoo...', '....oWoWoWoo....', '.....oooooo.....', '................'] },
  stage15: { p: { G: '#ffd36b', N: '#8a5a2a', R: '#d02a2a', r: '#7a1418', Y: '#ffd36b' }, m: [
    '.oo.............', 'oGGo............', '.oNooooooooooo..', '.oNoRRRRRRRRRRo.', '.oNoRrRRRRRRRo..', '.oNoRRRYYRRRRRo.', '.oNoRRYYYYRRRo..', '.oNoRRRYYRRRRRo.',
    '.oNoRRRRRRRRo...', '.oNoRrRoRRRo....', '.oNoooo.ooo.....', '.oNo............', '.oNo............', '.oNo............', 'oNNNo...........', 'ooooo...........'] },
  win1: { p: { Y: '#ffd36b', W: '#fff6c8', y: '#c8983a', N: '#6a3a1a' }, m: [
    '................', '..oooooooooooo..', 'ooYWWYYYYYYYyyoo', 'oYoYWYYYYYYYyoYo', 'oYooYWYYYYYyooYo', '.oYooYYYYYYyoYo.', '..ooooYYYYyoooo.', '......oYYyo.....',
    '.......oYo......', '.......oYo......', '......oYYyo.....', '.....oyyyyyo....', '....oooooooooo..', '....oNNNNNNNNo..', '....oooooooooo..', '................'] },
  allclass: { p: { S: '#c8d0e0', s: '#6a7488', R: '#ff4a3a', r: '#a81e1e', G: '#6ad04a', g: '#2a7a2a', B: '#4a8aff', b: '#1a3a9a' }, m: [
    '................', '.oooooooooooooo.', '.oSSSSSSSSSSSso.', '.oSSSSooooSSSSo.', '.oSSSSoRroSSSSo.', '.oSSSSoRroSSSSo.', '.oSSSSooooSSSSo.', '.oSooooSSooooSo.',
    '.oSoGgoSSoBboSo.', '.oSoGgoSSoBboSo.', '..oSooooooooSo..', '...oSSSSSSSso...', '....oSSSSSso....', '.....oSSSso.....', '......oSso......', '.......oo.......'] },
  tri1: { p: { C: '#7ef9ff', c: '#e0ffff', Y: '#ffd36b', L: '#a8b2c6', s: '#5a6478' }, m: [
    '......oo....Y...', '.....oCCo.......', '..Y.oCccCo......', '.....oCCo.....Y.', '......oo........', '..ooooooooooooo.', '.oLLLLLLLLLLLLo.', 'oLLssssssssssso.',
    '.ooosssssssooo..', '....osssssso....', '....ossssso.....', '...ossssssso....', '..osssssssssso..', '..oooooooooooo..', '................', '................'] },
  elites10: { p: { W: '#e0e8f4', G: '#ffd36b', N: '#6a3a1a' }, m: [
    'oo............oo', 'oWo..........oWo', '.oWo........oWo.', '..oWo......oWo..', '...oWo....oWo...', '....oWo..oWo....', '.....oWooWo.....', '......oWWo......',
    '.....oWooWo.....', '...GoWo..oWoG...', '...oGo....oGo...', '..oNoGo..oGoNo..', '.oNo.oo..oo.oNo.', 'oNo..........oNo', 'oo............oo', '................'] },
};
const PADLOCK = ['.sss.', 's...s', 'ooooo', 'oLLLo', 'oLoLo', 'oLLLo', 'ooooo'];
const pxCache = new Map();
function pxImg(rows, pal, gray) {
  const key = rows.join('|') + gray; if (pxCache.has(key)) return pxCache.get(key);
  const w = rows[0].length, c = document.createElement('canvas'); c.width = w; c.height = rows.length; const x = c.getContext('2d');
  const SL = ['#262c38', '#3a4152', '#545d70', '#7a8396', '#9aa2b4'];
  rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch === '.') return; let col = ch === 'o' ? '#0b0a10' : pal[ch]; if (!col) return;
    if (gray && ch !== 'o') { const n = parseInt(col.slice(1), 16), l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; col = SL[Math.min(4, Math.floor(l * 5))]; }
    x.fillStyle = col; x.fillRect(i, y, 1, 1); }));
  const u = c.toDataURL(); pxCache.set(key, u); return u;
}
const BADGE_GOAL = { firstboss: s => [s.bosses || 0, 1], stage15: s => [s.best || 0, 15], win1: s => [s.wins || 0, 1], allclass: s => [['KNIGHT', 'RANGER', 'MAGE'].filter(c => (s.winsBy || {})[c]).length, 3], tri1: s => [s.tri || 0, 1], elites10: s => [s.elites || 0, 10] };
function pixelBadge(id, got) {
  const B = BADGE_PX[id]; if (!B) return '';
  return '<div class="pxmed"><img class="pxb" alt="" src="' + pxImg(B.m, B.p, !got) + '">' + (got ? '' : '<img class="pxlock" alt="Locked" src="' + pxImg(PADLOCK, { s: '#c8ccd8', L: '#8a92a4' }, false) + '">') + '</div>';
}
const CURATED = ["firstboss","stage15","win1","allclass","tri1","elites10"];
var gemLock = false;
function setGems(el, n) { if (el) el.innerHTML = GEM(18) + '<span class="gnum">' + n + '</span>'; }
function resetText() { const n = new Date(), nx = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1), s = Math.max(0, Math.floor((nx - n.getTime()) / 1000)); return 'Resets daily · in ' + Math.floor(s / 3600) + 'h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + 'm'; }
setInterval(() => { if ($('daily').classList.contains('on')) $('qreset').textContent = resetText(); }, 30000);
function openDaily() { PR.rollQuests(); renderDaily(); openModal('daily'); PR.save(); }
function tickNumber(pill, from, to) {
  const t0 = performance.now(), n = pill.querySelector('.gnum'); pill.classList.add('flash');
  const step = now => { const k = Math.min(1, (now - t0) / 550); if (n) n.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); else { gemLock = false; setGems(pill, PR.P.gems); setTimeout(() => pill.classList.remove('flash'), 350); } };
  requestAnimationFrame(step);
}
function flyGems(from, to, reward) {
  const fx = from.left + from.width / 2, fy = from.top + from.height / 2, tx = to.left + 22, ty = to.top + to.height / 2, n = Math.min(10, Math.max(5, reward));
  for (let i = 0; i < n; i++) {
    const g = document.createElement('div'); g.className = 'qfx'; g.innerHTML = GEM(16); g.style.left = fx - 8 + 'px'; g.style.top = fy - 8 + 'px'; document.body.appendChild(g);
    const mx = (Math.random() - 0.5) * 120, my = -30 - Math.random() * 70;
    g.animate([{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.15)', opacity: 1, offset: 0.35 }, { transform: 'translate(' + (tx - fx) + 'px,' + (ty - fy) + 'px) scale(.7)', opacity: 1 }], { duration: 620 + Math.random() * 260, delay: i * 40, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'both' }).onfinish = () => g.remove();
  }
  const t = document.createElement('div'); t.className = 'qfx'; t.style.cssText = 'left:' + (fx - 30) + 'px;top:' + (fy - 14) + 'px;font:800 18px "Pixelify Sans",monospace;color:#f2d675;text-shadow:0 2px 6px #000;white-space:nowrap'; t.textContent = '+' + reward + ' Gems'; document.body.appendChild(t);
  t.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-34px)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => t.remove();
}
function claimQuest(i, btn) {
  const q = PR.P.quests.list[i]; if (!q || q.claimed || q.progress < q.goal) return;
  const old = PR.P.gems, pill = $('dailygems'), br = btn.getBoundingClientRect(), pr = pill.getBoundingClientRect();
  gemLock = true; PR.claimQuest(i); if (SFX.claim) SFX.claim();
  flyGems(br, pr, q.reward); setTimeout(() => tickNumber(pill, old, PR.P.gems), 700); renderDaily();
}
function renderDaily() {
  const P = PR.P, ready = P.quests.list.filter(q => !q.claimed && q.progress >= q.goal).length;
  $('qreset').textContent = resetText();
  if (!gemLock) setGems($('dailygems'), P.gems);
  const C = $('qcards'); C.innerHTML = '';
  P.quests.list.forEach((q, i) => {
    const on = Math.floor(q.progress / q.goal * 10), full = q.progress >= q.goal, d = document.createElement('div');
    d.className = 'qcard' + (q.claimed ? ' done' : full ? ' ready' : '');
    d.innerHTML = '<div class="qt">' + q.text + '</div><div class="qprog"><div class="segs">' + Array.from({ length: 10 }, (_, k) => '<i class="' + (k < on || full ? 'on' : '') + '"></i>').join('') + '</div><span class="qnum">' + Math.min(q.progress, q.goal) + '/' + q.goal + '</span></div><div class="qside"><div class="qreward">' + GEM(15) + q.reward + '</div></div>';
    const side = d.querySelector('.qside');
    if (q.claimed) side.insertAdjacentHTML('beforeend', '<div class="stamp">CLAIMED</div>');
    else { const b = document.createElement('button'); b.className = 'claim' + (full ? '' : ' off'); b.textContent = full ? 'CLAIM' : 'IN PROGRESS'; if (full) b.onclick = () => claimQuest(i, b); side.appendChild(b); }
    C.appendChild(d);
  });
  $('qach').innerHTML = CURATED.map(id => { const a = PR.ACHIEVEMENTS.find(x => x.id === id), got = !!P.ach[id], [n, goal] = BADGE_GOAL[id](P.stats || {}), pg = Math.min(n, goal); return '<div class="badge pxbadge ' + (got ? 'got' : 'lock') + '">' + pixelBadge(id, got) + '<div class="bt">' + a.text + '</div>' + (goal > 1 && !got ? '<div class="bprog"><i style="width:' + Math.round(pg / goal * 100) + '%"></i><span>' + pg + '/' + goal + '</span></div>' : got ? '<div class="bprog done"><span>Unlocked</span></div>' : '<div class="bprog"><i style="width:0"></i><span>0/1</span></div>') + '<div class="br">' + GEM(13) + a.reward + '</div></div>'; }).join('');
}
// âm thanh nhẹ khi rê chuột qua nút trong bảng nhiệm vụ
$('daily').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b && !b.classList.contains('off') && b !== $('daily')._last) { $('daily')._last = b; if (SFX.hover) SFX.hover(); } });
$('daily').addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest('button')) $('daily')._last = null; });
// thưởng đăng nhập mỗi ngày
setTimeout(() => { const r = PR.dailyLogin(); if (r) { showHint('📅 Daily login — day ' + r.streak + ': 💎 +' + r.reward, 5); const T = $('titlegems'); if (T) setGems(T, PR.P.gems); } }, 600);
$('revivebtn').onclick = () => { if (!PR.spend(PR.ECON.revive)) { $('revivebtn').innerHTML = 'Not enough gems (need ' + PXI('gem', 14) + PR.ECON.revive + ')'; return; } closeModal('end'); game.revive(); ui = 'play'; last = performance.now(); };
function enterPlay() {
  R.reset(); resetInput(); endShown = false; hintState.forced = 0;
  for (const m of [...modals]) closeModal(m);
  $('title').classList.remove('on'); $('hud').classList.remove('hidden'); qw.innerHTML = ''; df.innerHTML = '';
  ui = 'play'; syncTrainPanel();
}
function toTitle() {
  showLab(false); $('labstrip').classList.add('hidden');
  for (const m of [...modals]) closeModal(m);
  game = new Game(7, 'KNIGHT', { training: true }); R.reset(); ui = 'title';
  $('hud').classList.add('hidden'); $('title').classList.add('on'); renderContinue();
}
// ---------- Trailer Director (T ở màn hình chính) ----------
function runTrailer(record, extra) {
  ensureAudio(); AU.music(null); for (const m of [...modals]) closeModal(m);
  $('title').classList.remove('on'); $('hud').classList.add('hidden');
  startTrailer({ R, SFX, audioCtx: () => AU.ensure(), setGame: g => { game = g; }, setUi: u => { ui = u; }, toTitle,
    bag: { open() { mSel = []; renderBag(); openModal('bag'); }, sel(i) { if (!mSel.includes(i)) mSel.push(i); renderBag(); }, merge() { $('mok').click(); }, close() { if (modals.includes('bag')) closeModal('bag'); const t = $('btip'); if (t) t.style.display = 'none'; } } }, { record: !!record, ...(extra || {}) });
}
function pause() {
  if (ui !== 'play') return; if (game.coop) $('pause').classList.add('coop'); else $('pause').classList.remove('coop'); ui = 'pause'; resetInput();
  const g = game;
  renderAudio($('pauseaudio'));
  openModal('pause');
}
function resume() { closeModal('pause'); ui = 'play'; last = performance.now(); }
const coopBlur = () => game.coop;
function confirmBox(title, text, yes) {
  $('cft').textContent = title; $('cfs').textContent = text;
  $('cfyes').onclick = () => { closeModal('confirm'); yes(); };
  $('cfno').onclick = () => closeModal('confirm');
  openModal('confirm');
}

// ---------- nút menu ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-close]'); if (!b) return;
  if (b.hasAttribute('data-close')) { closeModal(b.closest('.screen').id); return; }
  const act = b.dataset.act; ensureAudio(); if ((act === 'quit' || act === 'restart') && ui === 'end' && !isTraining && !game.gemsPaid) game.gemsPaid = runEndedOnline(game.stage, game.won, game.p.cls); if (act === 'restart' && game.lab) { startLab(labCfg); return; } if (SFX.ui) SFX.ui();
  if (act === 'newrun') { if (savedRun()) confirmBox('Start a new run?', 'Your saved run (stage ' + savedRun().stage + ') will be lost.', () => { PR.clearRun(); openNewRun(); }); else openNewRun(); }
  else if (act === 'continue') continueRun();
  else if (act === 'lab') startLab(labCfg);
  else if (act === 'coop') openCoop();
  else if (act === 'shop') openShop();
  else if (act === 'daily') openDaily();
  else if (act === 'leader') SU.openBoard();
  else if (act === 'settings') openSettings();
  else if (act === 'fullscreen') { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => { try { screen.orientation.lock('landscape'); } catch (e) { /* trình duyệt không cho khoá */ } }).catch(() => {}); }
  else if (act === 'controls') { renderControls(); openModal('controls'); }
  else if (act === 'resume') resume();
  else if (act === 'restart' && game.coop) { leaveCoop(); toTitle(); openCoop(); }
  else if (act === 'restart') { if (ui === 'end') { closeModal('end'); closeModal('victory'); if (isTraining) startTraining(); else openNewRun(); } else confirmBox('Restart?', 'This run will be lost.', () => isTraining ? startTraining() : startRun(runCfg)); }
  else if (act === 'quit' && game.coop) { if (ui === 'end') { leaveCoop(); toTitle(); } else confirmBox('Leave co-op?', 'The run ends for both of you.', () => { leaveCoop(); toTitle(); }); }
  else if (act === 'quit') { if (ui === 'end') toTitle(); else { const s = !isTraining && savedRun(); confirmBox('Quit to title?', s ? 'Progress is saved at the start of stage ' + s.stage + '. Pick Continue on the title screen to resume.' : 'This run will be lost.', toTitle); } }
});
$('pausebtn').onclick = () => pause();
$('bagbtn').onclick = () => openBag();
// ---------- bảng âm thanh nhanh (HUD + màn tạm dừng) ----------
function audioToast(s) { const T = $('audiotoast'); T.textContent = s; T.style.opacity = 1; clearTimeout(audioToast.t); audioToast.t = setTimeout(() => T.style.opacity = 0, 1100); }
function setAudio(k, v) {
  if (k === 'music' || k === 'sfx') SET[k] = Math.max(0, Math.min(100, Math.round(v)));
  else SET[k] = v;
  saveSet(); ensureAudio(); for (const el of document.querySelectorAll('.audiopanel')) renderAudio(el);
  audioToast(k === 'music' ? 'Music ' + SET.music + '%' : k === 'sfx' ? 'Effects ' + SET.sfx + '%' : k === 'musicOn' ? (v ? 'Music on' : 'Music off') : k === 'sfxOn' ? (v ? 'Effects on' : 'Effects off') : '');
}
const AIC_OLD = { music: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>', bell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/></svg>', mute: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>' };
const AIC = { music: PXI('music', 18), bell: PXI('bell', 18), mute: PXI('mute', 18), sound: PXI('sound', 18) };
function renderAudio(el) {
  const row = (on, ic, label, key, v, up, dn) => `<div class="arow"><button class="abtn ${on ? 'on' : ''}" data-a="${key}On">${AIC[ic]}${label}</button><button class="step" data-a="${dn}">−</button><input type="range" min="0" max="100" value="${v}" data-a="${key}" style="--p:${v}%"><button class="step" data-a="${up}">+</button><span class="pct">${on ? v + '%' : 'off'}</span></div>`;
  el.innerHTML = row(SET.musicOn, 'music', 'Music', 'music', SET.music, 'm+', 'm-') + row(SET.sfxOn, 'bell', 'Effects', 'sfx', SET.sfx, 's+', 's-') + `<div class="arow"><button class="abtn mute ${muted ? 'on' : ''}" data-a="mute">${AIC.mute}${muted ? 'Unmute all' : 'Mute all'}</button></div>`;
  el.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); const a = b.dataset.a;
    if (a === 'musicOn' || a === 'sfxOn') setAudio(a, !SET[a]); else if (a === 'm-') setAudio('music', SET.music - 10); else if (a === 'm+') setAudio('music', SET.music + 10);
    else if (a === 's-') setAudio('sfx', SET.sfx - 10); else if (a === 's+') setAudio('sfx', SET.sfx + 10); else if (a === 'mute') { muted = !muted; AU.setMuted(muted); renderAudio(el); audioToast(muted ? 'All sound muted' : 'Sound on'); } });
  el.querySelectorAll('input').forEach(i => { i.oninput = e => { i.style.setProperty('--p', i.value + '%'); setAudio(i.dataset.a, +e.target.value); }; i.addEventListener('mousedown', e => e.stopPropagation()); });
}
$('audiobtn').onclick = e => { e.stopPropagation(); const P = $('audiopop'); P.classList.toggle('hidden'); if (!P.classList.contains('hidden')) renderAudio(P); };
$('audiopop').addEventListener('mousedown', e => e.stopPropagation());
// ---------- kiểu điều khiển ----------
// nút chuyển nhanh PC ⇄ Mobile: nhớ kiểu PC dùng gần nhất (WASD hoặc chuột phải) để chuyển về đúng kiểu đó
function toggleControl() { if (SET.control === 'touch') SET.control = SET.lastDesk || 'wasd'; else { SET.lastDesk = SET.control; SET.control = 'touch'; } saveSet(); syncControl(); moveTo = attackT = null; showHint(SET.control === 'touch' ? 'Mobile controls: joystick on the left, buttons on the right.' : 'PC controls: ' + (SET.control === 'wasd' ? 'WASD + mouse.' : 'right-click to move.'), 3); if (modals.includes('controls')) renderControls(); }
for (const id of ['ctlbtn', 'ctlhud']) $(id).onclick = e => { e.stopPropagation(); toggleControl(); };
function syncControl() { for (const seg of document.querySelectorAll('.ctlseg')) for (const x of seg.children) x.classList.toggle('on', x.dataset.c === SET.control); qw.dataset.sig = '';
  { const t = SET.control === 'touch', html = PXI(t ? 'phone' : 'keyboard', 16) + '<span>' + (t ? 'Mobile' : 'PC') + '</span>'; for (const id of ['ctlbtn', 'ctlhud']) { const b = $(id); b.innerHTML = html; b.title = 'Controls: ' + (t ? 'Mobile' : 'PC') + ' (tap to switch)'; } } document.body.classList.toggle('touch', SET.control === 'touch'); TM.markTouchDirty(); TM.resetTouch(); }
for (const seg of document.querySelectorAll('.ctlseg')) for (const x of seg.children) x.onclick = () => { if (x.dataset.c !== 'touch') SET.lastDesk = x.dataset.c; SET.control = x.dataset.c; saveSet(); syncControl(); moveTo = attackT = null; };
function renderControls() {
  if (TM.touchOn()) return renderGuide([['<kbd>Left side</kbd>', 'Touch anywhere on the left half and drag: a joystick appears under your thumb.'], ['<kbd>Big button</kbd>', 'Tap to attack the nearest enemy. <b>Hold to charge</b>, release to strike. Slide your thumb off the button to aim by hand.'], ['<kbd>Skill buttons</kbd>', '<b>Tap</b> to cast at the nearest enemy. <b>Drag</b> to aim (a line shows where it lands), release to cast. Drag back to the centre of the button to cancel.'], ['<kbd>Boot button</kbd>', 'Dash where the joystick points (toward your target when standing still). Invincible while dashing.'], ['<kbd>Potions</kbd>', 'Tap the small red / blue buttons to drink.'], ['<kbd>Bag</kbd>', 'Pauses the game. Tap 2–3 cores to merge, or tap 2 cores and press Swap to reorder.']]);
  const w = SET.control === 'wasd', K = [0, 1, 2, 3].map(i => '<kbd>' + slotLabel(i) + '</kbd>').join(' ');
  const rows = w ? [['<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>', 'Move. Your attacks and skills always aim at the cursor.']]
    : [['<kbd>Right-click</kbd>', 'Move there. Hold to follow the cursor. Right-click an enemy to attack it.']];
  rows.push(['<kbd>Left-click</kbd>', 'Basic attack toward the cursor. <b>Hold to charge</b>: Knight sweeps wider (full charge = shockwave), Ranger slows time and pierces at 75%+, Mage grows a huge orb that refills energy.'],
    ['<kbd>Space</kbd>', w ? 'Dash where you are moving (toward the cursor when standing still). Invincible while dashing.' : 'Dash toward the cursor. You are invincible while dashing: dash THROUGH boss waves.'],
    [K, 'Your 4 skill slots. <b>One press casts</b> the skill on that slot. Skills cost <b>energy</b> (blue bar); basic hits refill it.'],
    ['<kbd>Tab</kbd> / <kbd>I</kbd>', 'Open your bag (pauses the game): merge 2 different cores into a two-element skill, 3 singles into an ultimate, or a merged skill + 1 single to infuse it. Drag cores to choose which 4 are on your bar.'],
    ['<kbd>Esc</kbd> / <kbd>P</kbd>', 'Pause.'], ['<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>', 'Pick an upgrade card.'], ['<kbd>M</kbd>', 'Mute.']);
  renderGuide(rows);
}
function renderGuide(rows) {
  const keys = '<table class="keys" style="width:100%">' + rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</table>';
  // hướng dẫn cho người mới: cơ bản · điều khiển · ghép lõi · mẹo
  const cls = (game && game.p && game.p.cls) || runCfg.cls;
  const el = e => '<span class="gel" style="color:' + EL_INFO[e].color + '"><img src="' + iconElement(e) + '" alt="">' + EL_INFO[e].name + '</span>';
  const res = (txt, sk) => '<span class="gres">' + (sk ? '<img src="' + iconSkill(sk) + '" alt="">' : '') + txt + '</span>';
  const safe = f => { try { return f(); } catch (e) { return null; } };
  const duo = safe(() => skillDef(cls, 'FIRE', 'WATER')), tri = safe(() => triDef(cls, ['FIRE', 'WATER', 'EARTH'])), inf = safe(() => infuseDef(cls, ['FIRE', 'WATER'], 'WIND'));
  const sec = (icon, title, body) => '<div class="gsec"><h4>' + PXI(icon, 16) + title + '</h4>' + body + '</div>';
  const OP = s => '<span class="gop">' + s + '</span>', CN = (CLASSES[cls] || {}).name || cls;
  const T = {
    basics: sec('swords', 'Your goal', '<p>Fight through <b>' + LAST_STAGE + ' stages</b>. Every 5th stage is a <b>Titan</b> boss; beat the last one to win the run.</p>')
      + sec('play', 'A stage, step by step', '<ol class="gsteps"><li>Enemies come in <b>waves</b>. Clear them all to finish the stage.</li><li>Pick <b>1 of 3 upgrade cards</b>. Some cards give a new <b>element core</b> (a new skill).</li><li>After a Titan falls, collect the loot and <b>walk into the gate</b> to reach the next biome.</li></ol>')
      + sec('bolt', 'Energy and skills', '<p>Skills cost <b>energy</b> (the blue bar). Basic attacks refill it, so keep hitting between casts.</p><p>You have <b>4 skill slots</b> (' + [0, 1, 2, 3].map(i => '<kbd>' + slotLabel(i) + '</kbd>').join(' ') + ') and <b>6 bag slots</b> for spare cores.</p>')
      + sec('coin', 'Gold, smiths and relics', '<p>Enemies drop <b>gold</b>. Sometimes a <b>smith</b> camps nearby: buy stat boosts, forge (upgrade) a skill, or take one <b>Cursed Relic</b>. Relics are strong but always come with a price.</p>')
      + sec('gem', 'After a run', '<p>Win or lose, you earn <b>gems</b>. Spend them in <b>Shop &amp; Skins</b>. Daily Quests give extra gems.</p>'),
    controls: keys,
    get axiom() { return axGuide(); },
    merge: sec('sparkle', 'What is merging?', '<p>Each <b>core</b> is one element: Fire, Water, Earth or Wind. Open the <b>Bag</b> (<kbd>Tab</kbd>), click cores to put them on the merge table, then press <b>Merge</b>. A merged skill is stronger than its parts and does more.</p><p>The examples below use your hero, <b>' + CN + '</b>.</p>')
      + sec('flame', 'Recipes', '<div class="grec">' + el('FIRE') + OP('+') + el('WATER') + OP('→') + res('Two-element skill' + (duo ? ': ' + duo.name : ''), duo) + '<span class="gnote">2 single cores of <b>different</b> elements. Order matters: the first core sets the main effect.</span></div>'
        + '<div class="grec">' + el('FIRE') + OP('+') + el('WATER') + OP('+') + el('EARTH') + OP('→') + res('Ultimate' + (tri ? ': ' + tri.name : ''), tri) + '<span class="gnote">3 single cores, all different. Costs <b>1 Fusion Shard</b> ◆ (break purple crystals or defeat elites).</span></div>'
        + '<div class="grec">' + res('Two-element skill') + OP('+') + el('WIND') + OP('→') + res('Infused skill' + (inf ? ': ' + inf.name : ''), inf) + '<span class="gnote">A merged skill plus 1 single core adds a third element on top.</span></div>')
      + sec('lock', 'What can\'t be merged', '<ul><li>Two cores of the <b>same</b> element.</li><li>Two merged skills together.</li><li>Ultimates and infused skills: they are final.</li></ul>')
      + sec('bag', 'Merge tips', '<ul><li>Click 2 or 3 cores and the table <b>previews the result</b> before you merge.</li><li>Drag cores between the bar and the bag to choose your 4 active skills.</li><li>Opening the Bag pauses the game, so merge whenever you like.</li></ul>'),
    tips: sec('heart', 'Staying alive', '<ul><li><kbd>Space</kbd> dash makes you <b>invincible</b>: dash through boss attacks and shockwaves.</li><li>Coloured marks on the ground show where an attack will land. Step out of them.</li><li>Potions heal. The smith sells more.</li></ul>')
      + sec('star', 'Getting stronger', '<ul><li>Merge early: one merged skill beats two single ones.</li><li>Hold left-click to <b>charge</b> your basic attack for big hits.</li><li>Read a relic\'s price before you buy it. Open the Bag any time to check your build.</li></ul>')
  };
  // tab riêng cho Axiom (chỉ khi đang cầm Axiom trong Test Lab): PC và điện thoại dùng chung một bảng, mỗi cột ghi cách bấm của từng máy
  const AX_KEYS = [
    ['Tap left-click / Tap the big button', 'Basic attack, 3-hit chain. The 3rd hit grants a cube.', 'Tap the big button'],
    ['Hold left-click, release late', 'Charge. Release while the square is closing: a cut stays on the ground.', 'Hold the big button, release as the square closes'],
    ['Release a full charge late (after the square)', 'Rapid Slash: lunges forward and spins two cuts along the way.', 'Same: hold, release a little late'],
    ['Hold a full charge 1 s more', 'Flash Cut: time stops, the screen goes black and white, you walk through, slash once, sheath, then the cut lands.', 'Same: keep holding after full'],
    ['Shift (tap)', 'Fold: all cuts detonate after a short beat. 4 cuts together hit harder.', 'Cube button (tap)'],
    ['Shift (hold, aim at a foe, release)', 'Swap places: you take its spot and the foe takes yours. Cost 30 Illusion.', 'Hold cube button, drag onto a foe, release'],
    ['Shift (hold, sweep 2 foes)', 'Swap those two foes. Cost 40 Illusion.', 'Hold, drag across two foes, release'],
    ['Shift (hold, aim at yourself)', 'Confusion: foes near you turn on each other for 3 s. Cost 50 Illusion.', 'Hold, drag back into the middle of the button, release'],
    ['Dash (Space / Dash button) as a shot arrives', 'Mirror dodge: leaves a decoy that pulls enemies, +25 Illusion, +1 cube.', 'Dash button at the last moment'],
    ['Taking a lethal hit with a full purple bar', 'Mirror Break: the hit was a lie. You return at 35% HP, the attacker takes your place. Once per stage.', 'Same, automatic']
  ];
  const axGuide = () => {
    const touch = TM.touchOn();
    const rows = AX_KEYS.map(([pc, what, ph]) => '<tr><td>' + (touch ? ph : pc) + '</td><td>' + what + '</td></tr>').join('');
    return '<table class="keys" style="width:100%">' + rows + '</table>'
      + '<p class="sub">Purple bar under your feet: Illusion. Cubes orbit you and block shots.</p>';
  };
  const TABS = [['basics', 'Basics'], ['controls', 'Controls'], ['merge', 'Merging'], ['tips', 'Tips']];
  if (isAxiomRun()) TABS.push(['axiom', 'Axiom']);
  if (!T[guideTab]) guideTab = 'basics';
  $('guidetabs').innerHTML = TABS.map(([k, n]) => '<button data-g="' + k + '" class="' + (k === guideTab ? 'on' : '') + '">' + n + '</button>').join('');
  for (const b of $('guidetabs').children) b.onclick = () => { guideTab = b.dataset.g; renderControls(); };
  $('guidebody').innerHTML = T[guideTab]; $('guidebody').scrollTop = 0;
}
let guideTab = 'basics';
const isAxiomRun = () => !!(game && game.p && game.p.cls === 'AXIOM');

// ---------- tạo lượt mới ----------
let nrStep = 1, nrCls = runCfg.cls, nrEl = runCfg.element, nrDiff = runCfg.difficulty;
function openNewRun() {
  nrStep = 1; nrCls = runCfg.cls; nrEl = runCfg.element; nrDiff = runCfg.difficulty;
  renderNewRun(); openModal('newrun');
}
const HERO_ARCH = { KNIGHT: 'Vanguard', RANGER: 'Sharpshooter', MAGE: 'Arcanist' };
const hsv = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const HICO = {
  hp: PXI('heart', 16),
  en: PXI('bolt', 16),
  spd: PXI('boot', 16),
  menu: PXI('menu', 16)
};
let nrOpen = '';
function renderNewRun() {
  $('nr1').classList.toggle('hidden', nrStep !== 1); $('nr2').classList.toggle('hidden', nrStep !== 2);
  $('st1').classList.toggle('on', nrStep === 1); $('st2').classList.toggle('on', nrStep === 2);
  $('nrnext').textContent = nrStep === 1 ? 'Next' : 'Begin the run'; $('nrnext').classList.toggle('pulse', nrStep === 2);
  const H = $('heroes'); H.innerHTML = '';
  for (const k of Object.keys(CLASSES).filter(k => !CLASSES[k].lab)) {
    const c = CLASSES[k], b = document.createElement('div'), forms = KITS[k].forms;
    b.className = 'hcard' + (k === nrCls ? ' on' : '') + (nrOpen === k ? ' open' : ''); b.tabIndex = 0; b.setAttribute('role', 'button'); b.style.setProperty('--c', c.color);
    const bar = (ic, v, max, label) => '<div class="hstat">' + HICO[ic] + '<div class="hb"><i style="width:' + Math.round(v / max * 100) + '%"></i></div><span>' + label + '</span></div>';
    b.innerHTML = '<div class="art"></div><button class="hmore" aria-label="Details">' + HICO.menu + '</button>'
      + '<div class="info"><div class="hn">' + c.name.toUpperCase() + '</div><div class="ha">' + HERO_ARCH[k] + '</div>'
      + bar('hp', c.hp, 150, c.hp + ' HP') + bar('en', c.energy, 150, c.energy + ' EN') + bar('spd', c.speed, 220, c.speed + ' SPD') + '</div>'
      + '<div class="hdraw"><h4>Attack</h4><p>' + c.desc + '</p><p>Energy comes only from kills and crates' + (c.basicDmg > 1 ? ' · basic attacks +' + Math.round((c.basicDmg - 1) * 100) + '% damage' : '') + '</p>'
      + '<h4>Skill forms</h4><div class="hforms">' + EL.map(e => '<div><img src="' + iconElement(e) + '" alt="">' + forms[e] + '</div>').join('') + '</div></div>';
    { const sid = PR.skinOf(k), se = PR.SKINS[k].find(s => s.id === sid) || PR.SKINS[k][0], art = b.querySelector('.art');
      art.appendChild(hasDiorama(k, se.id) ? heroDiorama(k, se.id) : heroPortrait(k, se.id, se.pal, se.theme, se.tier || 'common'));
      const owned = PR.SKINS[k].filter(s => PR.ownsSkin(k, s.id));
      art.insertAdjacentHTML('beforeend', '<div class="hskin"><span class="t-' + (se.tier || 'common') + '">' + se.name + '</span></div>');
      if (owned.length > 1) { // đổi skin ngay trong màn chọn tướng (chỉ các skin đã có)
        for (const [cl, d] of [['hsk prev', -1], ['hsk next', 1]]) { const bt = document.createElement('button'); bt.className = cl; bt.setAttribute('aria-label', d < 0 ? 'Previous skin' : 'Next skin'); bt.textContent = d < 0 ? '‹' : '›';
          bt.onclick = e => { e.stopPropagation(); const i = owned.findIndex(s => s.id === se.id), n = owned[(i + d + owned.length) % owned.length]; PR.equipSkin(k, n.id); if (SFX.ui) SFX.ui(); renderNewRun(); }; art.appendChild(bt); } } }
    b.querySelector('.hmore').onclick = e => { e.stopPropagation(); nrOpen = nrOpen === k ? '' : k; if (SFX.ui) SFX.ui(); renderNewRun(); };
    b.onclick = () => { nrCls = k; renderNewRun(); };
    b.ondblclick = e => { if (e.target.closest('.hmore')) return; nrCls = k; nrStep = 2; renderNewRun(); };
    b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nrCls = k; renderNewRun(); } };
    H.appendChild(b);
  }
  const E = $('elements'); E.innerHTML = '';
  const ECOL = { FIRE: '#f97316', WATER: '#38bdf8', EARTH: '#84cc16', WIND: '#2dd4bf' };
  for (const el of EL) {
    const s = skillDef(nrCls, el, el), b = document.createElement('div'); b.className = 'ecard' + (el === nrEl ? ' on' : ''); b.tabIndex = 0; b.setAttribute('role', 'button'); b.style.setProperty('--c', ECOL[el]);
    b.appendChild(elemEmblem(el).cloneNode ? (() => { const c = document.createElement('canvas'); const src = elemEmblem(el); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); return c; })() : '');
    b.insertAdjacentHTML('beforeend', '<div class="en">' + EL_INFO[el].name + '</div><div class="pill"><img src="' + iconSkill(s) + '" alt="">' + s.name + '</div><p class="ed" title="' + s.desc.replace(/"/g, '&quot;') + '">' + s.desc + '</p>');
    b.onclick = () => { nrEl = el; if (SFX.ui) SFX.ui(); renderNewRun(); };
    b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nrEl = el; renderNewRun(); } };
    E.appendChild(b);
  }
  if (nrDiff === 'HARD' && !SU.brutalOk()) nrDiff = 'NORMAL';
  for (const x of $('diffseg').children) { x.classList.toggle('on', x.dataset.d === nrDiff); x.classList.toggle('locked', x.dataset.d === 'HARD' && !SU.brutalOk()); }
  syncControl();
}
for (const x of $('diffseg').children) x.onclick = () => { if (x.dataset.d === 'HARD' && !SU.brutalOk()) return SU.openRewards('HARD'); nrDiff = x.dataset.d; renderNewRun(); };
$('nrnext').onclick = () => { if (nrStep === 1) { nrStep = 2; renderNewRun(); } else startRun({ cls: nrCls, element: nrEl, difficulty: nrDiff }); };
$('nrback').onclick = () => { if (nrStep === 2) { nrStep = 1; renderNewRun(); } else closeModal('newrun'); };

// ---------- cài đặt ----------
function openSettings() {
  $('s-master').value = SET.master; $('s-sfx').value = SET.sfx; $('s-music').value = SET.music; $('s-musicon').checked = SET.musicOn; $('s-sfxon').checked = SET.sfxOn; $('s-shake').checked = SET.shake; $('s-numbers').checked = SET.numbers; $('s-hints').checked = SET.hints; $('s-autopause').checked = SET.autopause; $('s-fps').checked = SET.fps; $('s-light').checked = SET.light; syncGfx();
  syncControl(); syncZoom(); openModal('settings');
}
$('s-master').oninput = e => { SET.master = +e.target.value; saveSet(); };
$('s-sfx').oninput = e => { SET.sfx = +e.target.value; saveSet(); ensureAudio(); tone(440, 0.08, 'triangle', 0.05); };
$('s-music').oninput = e => { SET.music = +e.target.value; saveSet(); ensureAudio(); };
$('s-musicon').onchange = e => setAudio('musicOn', e.target.checked);
$('s-sfxon').onchange = e => setAudio('sfxOn', e.target.checked);
$('s-shake').onchange = e => { SET.shake = e.target.checked; saveSet(); };
$('s-numbers').onchange = e => { SET.numbers = e.target.checked; saveSet(); };
$('s-hints').onchange = e => { SET.hints = e.target.checked; saveSet(); };
$('s-autopause').onchange = e => { SET.autopause = e.target.checked; saveSet(); };
$('s-fps').onchange = e => { SET.fps = e.target.checked; saveSet(); };
$('s-light').onchange = e => { SET.light = e.target.checked; saveSet(); };
for (const b of $('gfxseg').children) b.onclick = () => { SET.gfx = b.dataset.q; autoLow = false; saveSet(); syncGfx(); };
for (const b of $('zoomseg').children) b.onclick = () => { SET.zoom = +b.dataset.z; saveSet(); syncZoom(); fit(); };
function syncZoom() { for (const b of $('zoomseg').children) b.classList.toggle('on', +b.dataset.z === (SET.zoom || 100)); }
function syncGfx() { for (const b of $('gfxseg').children) b.classList.toggle('on', b.dataset.q === SET.gfx); }

// ---------- thưởng sau wave ----------
function openReward() {
  const r = game.rewards[0]; if (!r) return;
  ui = 'reward'; resetInput();
  if (r.type === 'minor') {
    const wasBoss = BOSS_STAGES[game.stage] !== undefined;
    $('rwtitle').textContent = wasBoss ? 'Titan felled!' : `Stage ${game.stage} cleared`;
    $('rwsub').textContent = 'Choose an upgrade (1 / 2 / 3).' + (MAJOR_STAGES.includes(game.stage + 1) ? ' A great boon awaits after this.' : '');
    const C = $('rwcards'); C.innerHTML = '';
    if (!r.choices.length) C.innerHTML = '<p class="sub">Everything is maxed out.</p>';
    r.choices.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.style.setProperty('--c', c.color);
      b.innerHTML = `<span class="lv">Lv ${c.level} / ${c.max}</span><img class="cico" src="${iconUpgrade(c.id, c.color)}"><b>${c.name}</b><small>${c.text}</small><span class="key">${i + 1}</span>`;
      b.onclick = () => pickReward(i); C.appendChild(b);
    });
    $('rwreroll').innerHTML = rerollLabel(); openModal('reward');
  } else {
    $('mjsub').textContent = `Stage ${game.stage + 1} begins. The elements answer you — choose one (1 / 2 / 3).`;
    const C = $('mjcards'); C.innerHTML = '';
    r.choices.forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'card'; b.style.setProperty('--c', c.color);
      let extra = '';
      if (c.type === 'awaken') { const s = skillDef(game.p.cls, c.el, c.el); extra = `<small style="margin-top:6px">Casts: <span style="color:${GROUP_COLOR[s.group]}">${s.name}</span></small>`; }
      b.innerHTML = `<img class="cico" src="${c.type === 'awaken' ? iconElement(c.el) : iconUpgrade(c.type, c.color)}"><b>${c.name}</b><small>${c.text}</small>${extra}<span class="key">${i + 1}</span>`;
      b.onclick = () => pickReward(i); C.appendChild(b);
    });
    $('mjreroll').innerHTML = rerollLabel(); openModal('major');
  }
}
function pickReward(i) {
  const r = game.rewards[0]; if (!r) return;
  if (CO.on) CO.rwBusy = true;
  const done = () => { CO.rwBusy = false; };
  if (r.type === 'minor') { const c = r.choices[i]; if (!c) return; closeModal('reward'); act('pickMinor', [c.id], () => { done(); if (c.core) coreHint(c.core); }); }
  else {
    const c = r.choices[i]; if (!c) return;
    closeModal('major'); act('pickMajor', [c], () => { done(); if (c.type === 'awaken') coreHint(c.el); });
  }
  afterReward();
}
function afterReward() { if (CO.on && game.coop) { ui = 'play'; return; } if (game.state === 'reward') openReward(); else { ui = 'play'; last = performance.now(); } }
$('rwskip').onclick = () => { closeModal('reward'); if (CO.on) CO.rwBusy = true; act('skipReward', [], () => { CO.rwBusy = false; }); afterReward(); };
function rerollLabel() { const c = game.rerollCost(); return PXI('dice', 16) + (c ? ' Reroll — ' + PXI('gem', 14) + c : ' Reroll (' + game.rerolls + ' free)'); }
function doReroll() {
  const c = game.rerollCost();
  if (c && !PR.spend(c)) { showHint('Not enough gems for a reroll (need ' + c + ' gems). Earn gems from titans, elites, daily quests and achievements.', 3); return; }
  const r0 = game.rewards[0]; closeModal(r0.type === 'minor' ? 'reward' : 'major'); if (CO.on) { CO.rwBusy = true; ui = 'play'; }
  act('reroll', [c > 0], () => { CO.rwBusy = false; if (!CO.on) openReward(); if (SFX.coreGain) SFX.coreGain(); });
}
$('rwreroll').onclick = doReroll; $('mjreroll').onclick = doReroll;

function coreHint(el) {
  const i = game.p.cores.findLastIndex(c => c && c.type === 'el' && c.el === el);
  showHint(i < 0 ? '' : i < BAR_SIZE ? `${EL_INFO[el].name} core on ${slotLabel(i)}. Press Tab to merge it with your other cores.` : `${EL_INFO[el].name} core added to your bag. Press Tab to merge it or put it on your bar.`, 6);
}

// ---------- túi đồ: ghép lõi ----------
let mSel = [];
function openBag() {
  if (ui !== 'play' || game.over || game.state !== 'fight') return;
  ui = 'bag'; resetInput(); mSel = []; renderBag(); openModal('bag');
}
function closeBag() { const t = $('btip'); if (t) t.style.display = 'none'; closeModal('bag'); ui = 'play'; last = performance.now(); qw.dataset.sig = ''; }
const coreColors = c => coreEls(c).map(e => EL_INFO[e].color);
function coreCell(i, c, cls) {
  const d = document.createElement('div');
  if (!c) { d.className = 'slot empty'; d.innerHTML = (cls ? `<span class="k">${cls}</span>` : '') + '<span class="n">—</span>'; return d; }
  const s = game.coreSkill(c), multi = c.type !== 'el';
  d.className = 'slot' + (c.type === 'tri' || c.type === 'inf' ? ' tri' : '');
  if (!multi) d.style.setProperty('--c', EL_INFO[c.el].color); else if (c.type === 'duo') d.style.setProperty('--c', EL_INFO[c.els[0]].color);
  d.innerHTML = (cls ? `<span class="k">${cls}</span>` : '') + `<span class="cost">${s.cost}</span><img class="ico" src="${iconSkill(s)}"><span class="n">${s.name}</span>`;
  d.title = s.name + ' — ' + s.desc; if (s.forged) d.classList.add('forged');
  return d;
}
function dragWire(d, i, has, onDrop) {
  if (has) { d.draggable = true; d.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/plain', String(i)); d.classList.add('drag'); }); d.addEventListener('dragend', () => d.classList.remove('drag')); }
  d.addEventListener('dragover', ev => { ev.preventDefault(); d.classList.add('over'); });
  d.addEventListener('dragleave', () => d.classList.remove('over'));
  d.addEventListener('drop', ev => { ev.preventDefault(); d.classList.remove('over'); const raw = ev.dataTransfer.getData('text/plain'); if (raw.startsWith('core:')) { if (i >= 0) { game.p.cores[i] = JSON.parse(raw.slice(5)); game.syncOwned(); onDrop(); } return; } const from = +raw; if (Number.isFinite(from) && from !== i) { act('swap', [from, i], () => { mSel = mSel.map(k => k === from ? i : k === i ? from : k); onDrop(); }); } });
}
// cột Build (phải) của túi đồ: chỉ số sống còn, relic (ô 24px + tooltip), đồ rèn/mua, nâng cấp
const RELIC_ICON = { unstable: 'dice', static: 'bolt', potato: 'flame', polter: 'eye', bats: 'bell', cursed: 'skull', blood: 'heart', overclock: 'hourglass', chain: 'sparkle', glass: 'gem', gambit: 'trophy', boomerang: 'restart', blackhole: 'star', wild: 'music', echo: 'sound', gravity: 'gear', bloodmagic: 'potion', overload: 'banner', spellblade: 'anvil', relentless: 'swords', juggernaut: 'boot', riposte: 'shield' };
function bagTip(el, html) {
  el.addEventListener('mouseenter', () => { let t = $('btip'); if (!t) { t = document.createElement('div'); t.id = 'btip'; document.body.appendChild(t); } t.innerHTML = html; t.style.display = 'block'; const r = el.getBoundingClientRect(), w = t.offsetWidth, hh = t.offsetHeight; t.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; t.style.top = (r.top - hh - 8 < 8 ? r.bottom + 8 : r.top - hh - 8) + 'px'; });
  el.addEventListener('mouseleave', () => { const t = $('btip'); if (t) t.style.display = 'none'; });
}
function renderBuild() {
  const g = game, p = g.p, m = p.mods, C0 = CLASSES[p.cls], B = $('bagbuild'); B.innerHTML = '';
  const esc = s => String(s).replace(/</g, '&lt;');
  // tài nguyên chính
  B.insertAdjacentHTML('beforeend', '<div class="bres"><span>' + PXI('heart', 16) + Math.round(p.hp) + '/' + p.max + '</span><span>' + PXI('coin', 16) + p.gold + '</span><span>' + PXI('gem', 16) + (g.labShards ? '∞' : p.shards || 0) + '</span><span>' + PXI('potion', 16) + p.potions.hp + ' · ' + p.potions.en + '</span></div>');
  // chỉ số thưởng: chỉ hiện khi khác 0
  const bd = [], add = (v, name, inv) => { const n = Math.round((v - 1) * 100); if (n) bd.push('<i class="' + ((n > 0) !== !!inv ? '' : 'dn') + '">' + (n > 0 ? '+' : '') + n + '% ' + name + '</i>'); };
  add(m.dmg || 1, 'Skill Dmg'); add(p.basicMul / (C0.basicDmg || 1) || 1, 'Attack Dmg'); add(m.cd || 1, 'Skill Cost', true); add(p.atkSpeed || 1, 'Atk Speed'); add(p.speedMul || 1, 'Move'); add((1 - (m.dr || 0)) * (m.takenMul || 1), 'Dmg Taken', true); add(p.dashCdMul || 1, 'Dash CD', true);
  const de = p.energyMax - (C0.energy || 100); if (de) bd.push('<i class="' + (de > 0 ? '' : 'dn') + '">' + (de > 0 ? '+' : '') + de + ' Energy</i>');
  if (bd.length) B.insertAdjacentHTML('beforeend', '<div class="bbadges">' + bd.join('') + '</div>');
  const sec = (ic, t, count) => { const d = document.createElement('div'); d.className = 'bsec2'; d.innerHTML = '<h5>' + PXI(ic, 16) + t + (count !== undefined ? '<em>' + count + '</em>' : '') + '</h5>'; B.appendChild(d); return d; };
  // relic: ô 24px, rê chuột xem công dụng
  const rel = [...(p.relics || [])].filter(id => RL.RELIC_BY_ID[id]), S1 = sec('skull', 'Cursed Relics', rel.length || undefined), box = document.createElement('div'); box.className = 'brel'; S1.appendChild(box);
  for (const id of rel) { const r = RL.RELIC_BY_ID[id], live = RL.relicLive ? RL.relicLive(g, id) : '', d = document.createElement('div'); d.className = 'rs'; d.innerHTML = PXI(RELIC_ICON[id] || 'skull', 24) + (live && /\d/.test(live) && id === 'static' ? '<b>' + (p.static || 0) + '</b>' : '');
    bagTip(d, '<b>' + esc(r.name) + (r.cls ? ' · ' + CLASSES[r.cls].name : '') + '</b><div class="p">+ ' + esc(r.pro) + '</div><div class="c">− ' + esc(r.con) + '</div>' + (live ? '<div class="l">' + esc(live) + '</div>' : '')); box.appendChild(d); }
  if (!rel.length) { box.innerHTML = '<div class="rs empty"></div><div class="rs empty"></div><div class="rs empty"></div>'; S1.insertAdjacentHTML('beforeend', '<p class="bnone" style="margin-top:6px">The smith sells one relic per visit.</p>'); }
  // đồ rèn + đồ mua
  const S2 = sec('anvil', 'Forged & Bought'), ch2 = document.createElement('div'); ch2.className = 'bchips'; S2.appendChild(ch2); const seen = new Set();
  for (const c of p.cores) { if (!c) continue; const key = FG.forgeKeyOf(g, c); if (!p.forged.has(key) || seen.has(key)) continue; seen.add(key);
    const s = g.coreSkill(c); let tip = '+15% damage.'; if (c.type === 'inf') tip = 'Both halves forged, +15% damage.'; else { const info = forgeInfo(p.cls, coreDef(p.cls, c)); if (info) tip = info.kind === 'tri' ? info.text : (info.perk ? '▸ ' + info.perk + '<br>' : '') + '✦ ' + info.twist + '<br>+15% damage.'; }
    const d = document.createElement('span'); d.className = 'bchip forged'; d.innerHTML = '<img src="' + iconSkill(s) + '">' + esc(s.name); bagTip(d, '<b>' + esc(s.name) + ' (forged)</b>' + tip); ch2.appendChild(d); }
  for (const [id, n] of Object.entries(g.shopBuys || {})) { const s = FG.STAT_SHOP.find(q => q.id === id); if (!s || !(n > 0)) continue; const d = document.createElement('span'); d.className = 'bchip buy'; d.innerHTML = PXI('wrench', 16) + esc(s.name) + (n > 1 ? ' <small>×' + n + '</small>' : ''); bagTip(d, '<b>' + esc(s.name) + '</b>Bought at the forge ' + n + ' time' + (n > 1 ? 's' : '') + '.'); ch2.appendChild(d); }
  if (!ch2.children.length) ch2.outerHTML = '<p class="bnone">Forge a skill or buy stats at the smith.</p>';
  // nâng cấp + vật phẩm nhặt
  const ups = Object.entries(g.upgrades || {}).filter(([, n]) => n > 0), log = g.upgradeLog || [], drops = STAT_DROPS.map(s => [s, log.filter(x => x === s.name).length]).filter(([, n]) => n > 0), asc = log.filter(x => x === 'Ascension').length;
  const S3 = sec('trophy', 'Upgrades & Pickups', ups.length + drops.length + (asc ? 1 : 0) || undefined), ch3 = document.createElement('div'); ch3.className = 'bchips'; S3.appendChild(ch3);
  for (const [id, n] of ups) { const u = MINOR_BY_ID[id]; if (!u) continue; const d = document.createElement('span'); d.className = 'bchip'; d.innerHTML = '<img src="' + iconUpgrade(id, u.color) + '">' + esc(u.name) + (u.max > 1 ? ' <small>' + n + '/' + u.max + '</small>' : ''); bagTip(d, '<b>' + esc(u.name) + ' · Lv ' + n + (u.max ? '/' + u.max : '') + '</b>' + esc(u.text)); ch3.appendChild(d); }
  if (asc) { const d = document.createElement('span'); d.className = 'bchip'; d.innerHTML = PXI('star', 16) + 'Ascension' + (asc > 1 ? ' <small>×' + asc + '</small>' : ''); bagTip(d, '<b>Ascension</b>+20% skill damage, −10% skill cost each.'); ch3.appendChild(d); }
  for (const [s, n] of drops) { const d = document.createElement('span'); d.className = 'bchip'; d.innerHTML = PXI('sparkle', 16) + esc(s.name) + (n > 1 ? ' <small>×' + n + '</small>' : ''); bagTip(d, '<b>' + esc(s.name) + '</b>Picked up in the field' + (n > 1 ? ' ×' + n : '') + '.'); ch3.appendChild(d); }
  if (!ch3.children.length) ch3.outerHTML = '<p class="bnone">Pick upgrades after each stage.</p>';
}
function renderBag() {
  renderBuild();
  const p = game.p;
  for (const [id, a, b] of [['invbar', 0, BAR_SIZE], ['invbag', BAR_SIZE, INV_SIZE]]) {
    const row = $(id); row.innerHTML = '';
    for (let i = a; i < b; i++) {
      const c = p.cores[i], d = coreCell(i, c, i < BAR_SIZE ? slotLabel(i) : '');
      const o = mSel.indexOf(i); if (o >= 0) { d.classList.add('sel'); d.insertAdjacentHTML('beforeend', `<span class="ord">${o + 1}</span>`); }
      if (c) d.onclick = () => { const k = mSel.indexOf(i); if (k >= 0) mSel.splice(k, 1); else if (mSel.length < 3) mSel.push(i); renderBag(); };
      else d.onclick = () => { if (mSel.length === 1) { game.swapInv(mSel[0], i); mSel = []; renderBag(); } };   // 1 lõi đang chọn + chạm ô trống = chuyển lõi sang đó (dùng được trên cảm ứng)
      dragWire(d, i, !!c, renderBag);
      row.appendChild(d);
    }
  }
  // Test Lab: bảng mọi chiêu, bấm để lấy
  const cat = $('invcat'), catl = $('catlabel'); cat.classList.toggle('hidden', !game.lab); catl.classList.toggle('hidden', !game.lab);
  if (game.lab) {
    cat.innerHTML = ''; const all = [];
    for (const a of EL) all.push({ type: 'el', el: a });
    for (const a of EL) for (const b of EL) if (a !== b) all.push({ type: 'duo', els: [a, b] });
    for (const set of TRI_SETS) all.push({ type: 'tri', els: set.slice() });
    for (const a of EL) for (const b of EL) if (a !== b) all.push({ type: 'inf', els: [a, b], add: a });
    for (const c of all) { const d = coreCell(-1, c, ''); d.classList.add('mini'); d.draggable = true; d.title += ' — drag onto a skill-bar or bag slot (or click to add)'; d.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/plain', 'core:' + JSON.stringify(c))); d.onclick = () => { const i = game.freeSlot(); if (i < 0) game.p.cores[INV_SIZE - 1] = c; else game.p.cores[i] = c; game.syncOwned(); renderBag(); }; cat.appendChild(d); }
  }
  const P = $('mprev'), ok = $('mok'); $('mswap').disabled = mSel.length !== 2;
  if (!mSel.length) { P.innerHTML = 'Click 2 or 3 cores to preview what they become.<br><small style="color:var(--dim)">2 different singles → two-element skill · 3 different singles → ultimate · merged skill + single → infused skill</small>'; ok.disabled = true; return; }
  const res = mergeResult(mSel.map(i => p.cores[i]));
  if (res.error) { P.innerHTML = `<span class="err">${res.error}</span>`; ok.disabled = true; return; }
  const needShard = res.type === 'tri' && !game.labShards, noShard = needShard && (game.p.shards || 0) < 1;
  const s = game.coreSkill(res), order = coreEls(res).map(e => `<span style="color:${EL_INFO[e].color}">${EL_INFO[e].name}</span>`).join(res.type === 'tri' ? ' + ' : ' → ');
  P.innerHTML = `<img class="cico" src="${iconSkill(s)}"><b>${s.name}</b> <small style="color:${GROUP_COLOR[s.group]}">${GROUP_NAME[s.group]} · ${s.cost} energy</small><br><small>${order}</small><br><small style="color:#a8b4a0">${s.desc}</small><br><small style="color:var(--dim)">The ${mSel.length} cores used will be consumed.${needShard ? ' Costs 1 Fusion Shard (you have ' + (game.p.shards || 0) + ').' : ''}</small>` + (noShard ? '<br><span class="err">Needs 1 Fusion Shard — break purple crystals or defeat elite enemies.</span>' : '');
  if (mSel.some(i => p.cores[i] && game.coreSkill(p.cores[i]).forged)) P.innerHTML += '<br><span class="err">A forged core is on the table: its forge upgrade will be lost.</span>';
  ok.disabled = noShard;
}
$('mclear').onclick = () => { mSel = []; renderBag(); };
$('mswap').onclick = () => { if (mSel.length !== 2) return; game.swapInv(mSel[0], mSel[1]); mSel = []; renderBag(); };
$('mrev').onclick = () => { mSel.reverse(); renderBag(); };
$('mok').onclick = () => act('merge', [mSel.slice()], r => { if (!r || r.error) return; mSel = []; renderBag(); SFX.merge(); game.events.length = 0; showHint(`Merged: ${r.skill.name}${r.slot < BAR_SIZE ? ' on ' + slotLabel(r.slot) : ' (in your bag — drag it onto the bar)'}.`, 5); });
$('bagclose').onclick = () => closeBag();


// ---------- nhà thợ rèn: bán, chỉ số, bình thuốc, rèn chiêu ----------
let smithTab = 'forge', smithConfirm = -1, smithMsgT = 0;
function openSmith() {
  if (ui !== 'play' || game.over || game.state !== 'fight' || !game.inForge) return;
  ui = 'smith'; resetInput(); smithConfirm = -1; const S = FG.smithOf(game.forge.theme);
  $('smithname').innerHTML = S.name + ' <small style="color:' + S.color + ';font-size:.6em">' + S.title + '</small>'; $('smithhello').textContent = '"' + S.hello + '"';
  $('smithpic').src = smithPortrait(game.forge.theme); $('smithmsg').textContent = '';
  renderSmith(); openModal('smith'); if (SFX.forgeNear) SFX.forgeNear();
}
function closeSmith() { closeModal('smith'); ui = 'play'; last = performance.now(); qw.dataset.sig = ''; game.events.length = 0; }
function smithPortrait(theme) { const k = 'sp' + theme; if (smithPortrait[k]) return smithPortrait[k]; const s = smithSprite(theme, 'wave0'), c = document.createElement('canvas'); c.width = s.img.width * 4; c.height = s.img.height * 4; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s.img, 0, 0, c.width, c.height); return (smithPortrait[k] = c.toDataURL()); }
function smithSay(s, err) { const m = $('smithmsg'); m.textContent = s; m.classList.toggle('err', !!err); }
function smithAct(n, a, ok, sfx) { act(n, a, r => { if (modals.includes('smith')) smithDone(r, ok, sfx); }); }
function smithDone(r, ok, sfx) { if (r && r.error) { smithSay(r.error, true); if (SFX.noEnergy) SFX.noEnergy(); } else { smithSay(ok); if (SFX[sfx]) SFX[sfx](); } game.events.length = 0; renderSmith(); }
const GOLDI = '<i class="coin"></i>';
function renderSmith() {
  const g = game, p = g.p;
  $('smithgold').textContent = p.gold; $('smithshards').textContent = g.labShards ? '∞' : (p.shards || 0);
  const T = $('smithtabs'); T.innerHTML = '';
  for (const [k, n, ic] of [['forge', 'Forge skills', 'anvil'], ['relics', 'Relics', 'skull'], ['stats', 'Stats', 'shield'], ['pots', 'Potions', 'potion'], ['sell', 'Sell', 'coin']]) { const b = document.createElement('button'); b.innerHTML = PXI(ic, 16) + ' ' + n; b.className = smithTab === k ? 'on' : ''; b.onclick = () => { smithTab = k; smithConfirm = -1; renderSmith(); }; T.appendChild(b); }
  const B = $('smithbody'); B.innerHTML = ''; const grid = document.createElement('div'); grid.className = 'sgrid'; B.appendChild(grid);
  const card = (html, cls) => { const d = document.createElement('div'); d.className = 'sitem2' + (cls ? ' ' + cls : ''); d.innerHTML = html; grid.appendChild(d); return d; };
  if (smithTab === 'forge') {
    const seen = new Set(); let any = false;
    p.cores.forEach((c, i) => {
      if (!c) return; const key = FG.forgeKeyOf(g, c); if (seen.has(key)) return; seen.add(key); any = true;
      const s = g.coreSkill(c), done = p.forged.has(key), cost = FG.FORGE_COST[c.type], chk = FG.canForge(g, c);
      let body = '';
      if (c.type === 'inf') body = '<p class="tw">Forges both halves: each gets its own forge upgrade, +15% damage.</p>';
      else { const info = forgeInfo(p.cls, coreDef(p.cls, c)); if (!info) return; body = info.kind === 'tri' ? '<p class="tri">' + info.text + '</p>' : (info.perk ? '<p class="perk">▸ ' + info.perk + '</p>' : '') + '<p class="tw">✦ ' + info.twist + '</p><p>+15% damage.</p>'; }
      const price = done ? 'Forged ✦' : GOLDI + cost + (c.type === 'tri' ? ' + ◆1' : '');
      const d = card('<span class="tag">' + ({ el: 'single', duo: 'two-element', inf: 'infused', tri: 'merge 3' })[c.type] + (i < BAR_SIZE ? ' · ' + slotLabel(i) : '') + '</span><img class="ico" src="' + iconSkill(s) + '"><div class="st"><h4>' + s.name + '</h4>' + body + '<button class="buy2"' + (done || !chk.ok ? ' disabled' : '') + '>' + price + '</button></div>', done ? 'done' : '');
      const bt = d.querySelector('.buy2'); if (!done && chk.ok) bt.onclick = () => smithAct('forge', [i], 'Forged: ' + g.coreSkill(c).name + '!', 'forged'); else if (!done) bt.title = chk.error;
    });
    if (!any) card('<div class="st"><h4>No skills to forge</h4><p>Pick up cores first.</p></div>');
  } else if (smithTab === 'relics') {
    // Cursed Relics: 3 món mỗi lần ghé, mua 1, reroll bằng vàng hoặc gem
    const done = (g.visitRelics || 0) >= RL.RELICS_PER_VISIT, rc = RL.relicRerollGold(g.relicRerolls || 0), gc = RL.RELIC_REROLL_GEMS;
    const head = card('<div class="st"><h4>' + PXI('skull', 16) + ' Cursed Relics</h4><p>' + (done ? 'You bought a relic this visit. Come back next time for a new offer.' : 'Three relics on sale this visit. You may take <b>one</b>. Every relic has a price beyond gold.') + '</p><div class="rrow"><button class="buy2 rr-g"' + (done || p.gold < rc ? ' disabled' : '') + '>' + PXI('dice', 16) + ' Reroll · ' + GOLDI + rc + '</button><button class="buy2 rr-m"' + (done || PR.P.gems < gc ? ' disabled' : '') + '>' + PXI('dice', 16) + ' Reroll · ' + PXI('gem', 14) + gc + '</button></div></div>', 'relichead');
    head.querySelector('.rr-g').onclick = () => smithAct('rerollRelics', ['gold'], 'The smith digs out other relics…', 'ui');
    head.querySelector('.rr-m').onclick = () => { if (!PR.spend(gc)) { smithSay('Not enough gems.', true); return; } PR.save(); smithAct('rerollRelics', ['gem'], 'The smith digs out other relics…', 'ui'); };
    const RICON = { unstable: 'power', static: 'swift', potato: 'echo', polter: 'focus', bats: 'leech', cursed: 'ricochet', blood: 'edge', overclock: 'quick', chain: 'split', glass: 'heavy', gambit: 'pierce', boomerang: 'swordwave', blackhole: 'orbburst', wild: 'surge' };
    for (const id of g.relicOffer || []) { const r = RL.RELIC_BY_ID[id], own = p.relics.has(id);
      const d = card('<span class="tag">' + (r.cls ? r.cls.toLowerCase() + ' · ' : '') + 'relic</span><img class="ico" src="' + iconUpgrade(RICON[id] || 'power') + '"><div class="st"><h4>' + r.name + '</h4><p class="rpro">▲ ' + r.pro + '</p><p class="rcon">▼ ' + r.con + '</p><button class="buy2"' + (own || done || p.gold < r.price ? ' disabled' : '') + '>' + (own ? 'Owned' : GOLDI + r.price) + '</button></div>', 'relic' + (own ? ' done' : ''));
      const bt = d.querySelector('.buy2'); if (!own && !done && p.gold >= r.price) bt.onclick = () => smithAct('buyRelic', [id], 'Relic taken: ' + r.name + '. Mind the price…', 'forged'); }
    if (p.relics.size) card('<div class="st"><h4>Your relics</h4><p>' + [...p.relics].map(id => RL.RELIC_BY_ID[id].name).join(' · ') + '</p></div>', 'relicown');
  } else if (smithTab === 'stats') {
    for (const s of FG.STAT_SHOP) { const c = FG.statPrice(g, s.id), n = g.shopBuys[s.id] || 0; const d = card('<span class="tag">bought ' + n + '</span><img class="ico" src="' + iconUpgrade(({ hp: 'vital', dmg: 'edge', en: 'focus', cd: 'swift', spd: 'swift', dr: 'guard' })[s.id] || 'power') + '"><div class="st"><h4>' + s.name + '</h4><p>' + ((g.visitBuys || {})[s.id] ? '<b style="color:#ff8a5a">Sold out this visit.</b>' : 'One per visit · price rises ×1.25 each time.') + '</p><button class="buy2"' + ((g.visitBuys || {})[s.id] || p.gold < c ? ' disabled' : '') + '>' + GOLDI + c + '</button></div>'); d.querySelector('.buy2').onclick = () => smithAct('stat', [s.id], s.name + '!', 'bought'); }
  } else if (smithTab === 'pots') {
    for (const k of ['hp', 'en']) { const P = FG.POTIONS[k], n = p.potions[k]; const d = card('<span class="tag">' + n + ' / ' + FG.POTION_MAX + '</span><div class="pot ' + k + '" style="width:48px;height:48px;flex:none"><i></i></div><div class="st"><h4>' + P.name + '</h4><p>' + P.text + ' Press <b>' + (k === 'hp' ? 1 : 2) + '</b> in battle to drink it.</p><button class="buy2"' + (p.gold < P.price || n >= FG.POTION_MAX ? ' disabled' : '') + '>' + GOLDI + P.price + '</button></div>'); d.querySelector('.buy2').onclick = () => smithAct('pot', [k], P.name + ' bought.', 'bought'); }
  } else {
    p.cores.forEach((c, i) => { if (!c) return; const s = g.coreSkill(c), v = FG.sellPrice(c), conf = smithConfirm === i, bar = i < BAR_SIZE;
      const d = card('<span class="tag">' + (bar ? 'on bar · ' + slotLabel(i) : 'bag') + '</span><img class="ico" src="' + iconSkill(s) + '"><div class="st"><h4>' + s.name + '</h4><p>' + (conf ? '<b style="color:#ff8a5a">Click again to sell a core from your skill bar.</b>' : 'Sell this core.') + '</p><button class="buy2">+' + GOLDI + v + '</button></div>', 'sellc' + (conf ? ' confirm' : ''));
      d.querySelector('.buy2').onclick = () => { if (bar && !conf) { smithConfirm = i; renderSmith(); return; } smithConfirm = -1; smithAct('sellCore', [i], 'Sold ' + s.name + ' for ' + v + ' gold.', 'sold'); }; });
    // bán lại relic: bấm hai lần cho chắc, hoàn 50% giá
    for (const id of p.relics) { const r = RL.RELIC_BY_ID[id], v = RL.relicSellPrice(id), conf = smithConfirm === 'r:' + id;
      const d = card('<span class="tag">relic</span><img class="ico" src="' + iconUpgrade('power') + '"><div class="st"><h4>' + r.name + '</h4><p>' + (conf ? '<b style="color:#ff8a5a">Click again to sell. Its bonus and its curse both go away.</b>' : 'Sell this relic back for half its price. Removes its bonus and its curse.') + '</p><button class="buy2">+' + GOLDI + v + '</button></div>', 'relicsell');
      d.querySelector('.buy2').onclick = () => { if (!conf) { smithConfirm = 'r:' + id; renderSmith(); return; } smithConfirm = -1; smithAct('sellRelic', [id], 'Sold ' + r.name + ' for ' + v + ' gold.', 'sold'); }; }
    const n = p.shards || 0; const d = card('<span class="tag">' + n + ' owned</span><div class="st"><h4>◆ Fusion Shard</h4><p>' + GOLDI + FG.SELL.shard + ' each. The smith buys shards but never sells them.</p><button class="buy2"' + (n > 0 && !g.labShards ? '' : ' disabled') + '>+' + GOLDI + FG.SELL.shard + '</button></div>');
    d.querySelector('.buy2').onclick = () => smithAct('sellShard', [], 'Sold a Fusion Shard.', 'sold');
  }
}
$('smithclose').onclick = () => closeSmith();
$('tradep').onclick = () => openSmith();
$('nextstage').onclick = e => { e.stopPropagation(); if (ui === 'play' && game.forgeHold) act('proceed'); };

// ---------- input ----------
addEventListener('keydown', e => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) { if (e.code === 'Enter' && e.target.id === 'nickin') $('nickok').click(); return; }   // đang gõ nickname: không bắt phím game
  if (ui === 'trailer') { e.preventDefault(); if (e.repeat) return; if (e.code === 'Escape') stopTrailer(); else if (e.code === 'KeyH') toggleCaptions(); return; }   // trailer: Esc thoát, H ẩn/hiện letterbox + chú thích
  if (ui === 'title' && !modals.length && e.code === 'KeyT' && !e.repeat) { runTrailer(); return; }
  if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'KeyM') { muted = !muted; AU.setMuted(muted); audioToast(muted ? 'All sound muted' : 'Sound on'); return; }
  if (e.code === 'KeyN') { setAudio('musicOn', !SET.musicOn); return; }
  if (e.code === 'KeyB' && !modals.includes('bag')) { setAudio('sfxOn', !SET.sfxOn); return; }
  if (e.code === 'Minus') { setAudio('music', SET.music - 10); return; } if (e.code === 'Equal') { setAudio('music', SET.music + 10); return; }
  if (e.code === 'BracketLeft') { setAudio('sfx', SET.sfx - 10); return; } if (e.code === 'BracketRight') { setAudio('sfx', SET.sfx + 10); return; }
  if (e.code === 'F3') { e.preventDefault(); SET.fps = !SET.fps; saveSet(); return; }
  if (modals.length) {
    const top = modals[modals.length - 1];
    if ((top === 'end' || top === 'victory') && (e.code === 'KeyR' || e.code === 'Space')) { $(top).querySelector('[data-act="restart"]').click(); return; }
    if (top === 'bag') { if (e.code === 'Escape' || e.code === 'Tab' || e.code === 'KeyI') closeBag(); return; }
    if (top === 'smith') { if (e.code === 'Escape' || e.code === 'KeyT') closeSmith(); return; }
    if (e.code === 'Escape') { if (top === 'pause') resume(); else if (top === 'reward' || top === 'major') { /* phải chọn */ } else closeModal(); }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
    if (n !== undefined && (top === 'reward' || top === 'major')) pickReward(n);
    return;
  }
  if (ui !== 'play') return;
  keys.add(e.code);
  const si = slotCodes().indexOf(e.code); if (si >= 0) slotQ.push(si);
  if (e.code === 'Space') dashQ = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') spaceQ = true;   // Axiom: Gập
  if (e.code === 'Digit1') potQ = 'hp'; if (e.code === 'Digit2') potQ = 'en';
  if (e.code === 'KeyT') openSmith();
  if (e.code === 'Enter' && game.forgeHold) act('proceed');
  if (e.code === 'Tab' || e.code === 'KeyI') openBag();
  if (e.code === 'Escape') pause();
  if (e.code === 'KeyP') pause();
  if (e.code === 'F2') { e.preventDefault(); toggleLab(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); mouse.down = mouse.rdown = false; if (SET.autopause && ui === 'play' && !coopBlur()) pause(); });
const toCanvas = e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * cv.width / r.width; mouse.y = (e.clientY - r.top) * cv.height / r.height; };
addEventListener('mousemove', toCanvas);
function worldMouse() { const [x, y] = R.toWorld(mouse.x, mouse.y); return { x, y }; }
function enemyUnder(w) { let best = null, bd = 1e9; for (const e of game.enemies) { const d = Math.hypot(e.x - w.x, e.y - (w.y + 10)); if (d < ((e.r || 16) + 22) * 1.4 && d < bd) { bd = d; best = e; } } return best; }
function rightClick() {
  const w = worldMouse(), e = enemyUnder(w);
  if (e) { attackT = e; moveTo = null; marker = { x: e.x, y: e.y, t: 0.45, c: '#ff5a4a', follow: e }; }
  else { attackT = null; moveTo = w; marker = { x: w.x, y: w.y, t: 0.45, c: '#7fe07a' }; }
}
cv.addEventListener('mousedown', e => { toCanvas(e); if (ui !== 'play' || modals.length || TM.touchOn()) return; ensureAudio(); if (e.button === 0 && labMode() && labClick(worldMouse())) return; if (e.button === 0) { mouse.down = true; mouse.pressed = true; } if (e.button === 2 && SET.control === 'mouse') { mouse.rdown = true; rightClick(); } });
addEventListener('mouseup', e => { if (e.button === 0 && mouse.down) { mouse.down = false; mouse.released = true; } if (e.button === 2) mouse.rdown = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());

// ---------- gợi ý ----------
// gợi ý tự động: mỗi câu chỉ hiện tối đa 8 giây, bấm vào thì tắt ngay; câu đã tắt không hiện lại trong phiên này
const hintState = { text: '', forced: 0, cur: '', seen: 0, gone: new Set() };
$('hint').addEventListener('pointerdown', e => { e.stopPropagation(); if (hintState.forced) hintState.forced = 0; else if (hintState.cur) hintState.gone.add(hintState.cur); $('hint').textContent = ''; $('hint').dataset.t = ''; });
// chữ gợi ý: thay emoji bằng icon pixel
const PX_EMOJI = { '💎': 'gem', '📅': 'calendar', '🎲': 'dice', '⚔': 'swords', '💀': 'skull', '🔥': 'flame', '⚡': 'bolt', '⏳': 'hourglass', '▶': 'play', '🏆': 'trophy', '🔒': 'lock', '🛠': 'wrench' };
const pxText = s => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(/💎|📅|🎲|⚔|💀|🔥|⚡|⏳|▶|🏆|🔒|🛠/gu, m => PXI(PX_EMOJI[m], 14));
function showHint(s, t) { hintState.text = s; hintState.forced = t; }
function autoHint() {
  if (hintState.forced > 0) return hintState.text;
  if (!SET.hints) return '';
  const g = game, p = g.p;
  if (isTraining) return g.casts < 3 ? `Training: each key casts its slot (${[0, 1, 2, 3].map(slotLabel).join(' ')}). Press Tab to open your bag and try merging cores.` : '';
  if (g.stage === 1 && g.casts === 0) { const s = g.coreSkill(p.cores[0]); return TM.touchOn() ? `Drag the left side of the screen to move. Tap a skill button to cast ${s.name}; hold the big button to charge your attack.` : `${SET.control === 'wasd' ? 'Move with WASD. ' : ''}Press ${slotLabel(0)} to cast ${s.name}. Hold left-click to charge your attack.`; }
  const singles = p.cores.filter(c => c && c.type === 'el'), diff = new Set(singles.map(c => c.el)).size;
  if (g.merges === 0 && diff >= 2) return 'You have 2 different cores: ' + (TM.touchOn() ? 'tap Bag' : 'press Tab') + ' to merge them into a stronger skill.';
  if (g.forge && !g.inForge && g.stageT < 14 && !g.visitedForge) return `A forge is nearby: follow the gold arrow. Inside it, enemies lose track of you, and you can spend gold (press T).`;
  if (g.inForge) g.visitedForge = true;
  if (g.boss && g.stageT < 10) return 'Dash (' + (TM.touchOn() ? 'the boot button' : 'Space') + ') through shock waves — you are invincible while dashing. Control skills break its posture.';
  if (p.cores.slice(0, BAR_SIZE).includes(null) && p.cores.slice(BAR_SIZE).some(Boolean)) return 'Your bar has an empty slot: press Tab and drag a core from your bag onto it.';
  return '';
}

// ---------- HUD ----------
const qw = $('qwer'), df = $('df');
function hud(dt) {
  const g = game, p = g.p;
  hintState.forced = Math.max(0, hintState.forced - dt);
  $('hp').style.width = Math.max(0, p.hp / p.max * 100) + '%'; $('hpt').textContent = Math.ceil(Math.max(0, p.hp)) + ' / ' + p.max;
  $('dash').style.width = ((1 - p.dashCd / (CLASSES[p.cls].dash.cd * (p.dashCdMul || 1))) * 100) + '%';
  { const fb = $('focusbar'), rg = p.cls === 'RANGER'; fb.classList.toggle('hidden', !rg); if (rg) { const v = p.focus === undefined ? 1 : p.focus; $('focus').style.width = (v * 100) + '%'; fb.classList.toggle('low', v < 0.4 && !p.slowmo); } }
  if (isTraining) { $('stage').textContent = 'Training'; $('stagesub').textContent = 'Wave ' + Math.max(1, g.packs); }
  else {
    $('stage').textContent = `Stage ${g.stage} / ${LAST_STAGE}`;
    const nextBoss = [5, 10, 15, 20, 25].find(s => s >= g.stage);
    $('stagesub').textContent = g.boss ? 'TITAN' : (g.spawnQ.length + g.enemies.filter(e => e.type !== 'DUMMY').length) + ' enemies left · titan at stage ' + nextBoss;
  }
  const b = g.boss && !g.boss.dead ? g.boss : null;
  $('bossbar').classList.toggle('hidden', !b);
  if (b) {
    $('bossname').textContent = b.def.name; $('bossep').textContent = b.def.epithet;
    $('bosshp').style.width = Math.max(0, b.hp / b.max * 100) + '%'; $('bosspoise').style.width = Math.max(0, b.poise / b.poiseMax * 100) + '%';
    const ph = b.def.phases; $('tick1').style.left = ph[1] ? ph[1].at * 100 + '%' : '-10px'; $('tick2').style.left = ph[2] ? ph[2].at * 100 + '%' : '-10px';
  }
  { const sh = game.labShards ? '∞' : String(p.shards || 0); if ($('shards').textContent !== sh) $('shards').textContent = sh; }
  { const gv = String(p.gold || 0), gb = $('goldv'); if (gb.textContent !== gv) { gb.textContent = gv; const box = $('goldbox'); box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump'); } }
  for (const [k, id] of [['hp', 'poth'], ['en', 'pote']]) { const n = (p.potions || {})[k] || 0, el = $(id); $(id + 'n').textContent = n; el.classList.toggle('empty', !n); el.classList.toggle('cd', p.potCd > 0); }
  { const nb = $('nextstage'), on = !!(g.forgeHold && g.clearT <= 0 && g.state === 'fight' && !isTraining && !modals.length); nb.classList.toggle('hidden', !on); }
  { const tp = $('tradep'), on = !!(g.inForge && g.forge && g.state === 'fight' && !modals.length); tp.classList.toggle('hidden', !on); if (on) { const nm = FG.smithOf(g.forge.theme).name; if ($('tradename').textContent !== nm) $('tradename').textContent = nm; } }
  $('en').style.width = Math.max(0, p.energy / p.energyMax * 100) + '%'; $('ent').textContent = Math.floor(p.energy) + ' / ' + p.energyMax;
  const bsig = SET.control + p.cores.slice(0, BAR_SIZE).map(c => c ? JSON.stringify(c) : '-').join('|');
  if (qw.dataset.sig !== bsig) { qw.dataset.sig = bsig; buildBar(); }
  TM.syncTouch(g, iconSkill);
  for (let i = 0; i < BAR_SIZE; i++) { const d = qw.children[i], c = p.cores[i]; if (d && c) { const sk = g.coreSkill(c); d.classList.toggle('poor', p.energy < sk.cost); d.classList.toggle('forged', !!sk.forged); TM.coolMark(d, p.cds[sk.key] || 0, sk.cd); } }
  let h = autoHint(); const H = $('hint');
  if (h && !hintState.forced) { if (hintState.gone.has(h)) h = ''; else { if (h !== hintState.cur) { hintState.cur = h; hintState.seen = 0; } hintState.seen += dt; if (hintState.seen > 8) { hintState.gone.add(h); h = ''; } } } if (H.dataset.t !== h) { H.dataset.t = h; H.innerHTML = pxText(h); } H.style.opacity = h ? 1 : 0;
}

function buildBar() {
  const p = game.p; qw.innerHTML = '';
  for (let i = 0; i < BAR_SIZE; i++) {
    const c = p.cores[i], d = coreCell(i, c, slotLabel(i));
    if (c) d.title += ' Drag to reorder. Tab = bag.';
    dragWire(d, i, !!c, () => { qw.dataset.sig = ''; });
    d.addEventListener('mousedown', ev => ev.stopPropagation());
    qw.appendChild(d);
  }
}
// ---------- kết thúc ----------
const EICO = {"stage":"<path d=\"M5 21V4M5 5h12l-2.5 3.5L17 12H5\"/>","titan":"<path d=\"M12 4a6 6 0 0 0-6 6c0 2 1 3.5 2.5 4.5V18h7v-3.5C17 13.5 18 12 18 10a6 6 0 0 0-6-6z\"/><path d=\"M9.5 10.5h.01M14.5 10.5h.01M10.5 18v-2M13.5 18v-2\"/>","kills":"<path d=\"M5 19L17 7M13 5l6-1-1 6M19 19L7 7M11 5L5 4l1 6\"/>","dmg":"<path d=\"M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z\"/>","skills":"<path d=\"M13 3L5 14h6l-1 7 8-11h-6z\"/>","time":"<path d=\"M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9\"/>"};
const EPX = { stage: 'banner', titan: 'skull', kills: 'swords', dmg: 'flame', skills: 'bolt', time: 'hourglass' };
const eicon = k => PXI(EPX[k] || 'star', 28);
const ELCOL = { FIRE: '#f97316', WATER: '#38bdf8', EARTH: '#84cc16', WIND: '#2dd4bf' };
function countUp(el, to, fmt, ms = 700) { const t0 = performance.now(), step = n => { const k = Math.min(1, (n - t0) / ms); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
function groupBuild(log) {
  const map = new Map(), cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  for (const u of log) {
    const c = /^Core (\w+)$/.exec(u);
    if (c) { const o = map.get(u) || { core: c[1], n: 0 }; o.n++; map.set(u, o); continue; }
    const q = /^\+(\d+(?:\.\d+)?)(%?)\s+(.*)$/.exec(u);
    if (q) { const k = '#' + q[3] + q[2], o = map.get(k) || { num: 0, pct: q[2], rest: q[3], n: 0 }; o.num += +q[1]; o.n++; map.set(k, o); }
    else { const o = map.get(u) || { name: u, n: 0 }; o.n++; map.set(u, o); }
  }
  return [...map.values()].sort((a, b) => (b.core ? 1 : 0) - (a.core ? 1 : 0)).map(o => o.core ? '<span class="eup core" style="--c:' + ELCOL[o.core] + '"><img class="pxi" src="' + iconElement(o.core) + '" alt="">' + cap(o.core.toLowerCase()) + ' core' + (o.n > 1 ? ' <em>×' + o.n + '</em>' : '') + '</span>'
    : o.rest !== undefined ? '<span class="eup stat">' + PXI(/hp/i.test(o.rest) ? 'heart' : /skill/i.test(o.rest) ? 'bolt' : /attack|damage/i.test(o.rest) ? 'swords' : /energy/i.test(o.rest) ? 'gem' : /speed/i.test(o.rest) ? 'boot' : 'sparkle', 14) + '+' + (Math.round(o.num * 100) / 100) + o.pct + ' ' + cap(o.rest) + '</span>'
    : /^Relic: /.test(o.name) ? '<span class="eup relic">' + PXI('skull', 14) + o.name.slice(7) + '</span>'
    : /^Forge|^Forged/.test(o.name) ? '<span class="eup stat">' + PXI('anvil', 14) + o.name + (o.n > 1 ? ' <em>×' + o.n + '</em>' : '') + '</span>'
    : '<span class="eup">' + PXI('sparkle', 14) + o.name + (o.n > 1 ? ' <em>×' + o.n + '</em>' : '') + '</span>').join('');
}
function showVictory() {
  ui = 'end'; const g = game; $('victory').classList.toggle('coop', !!g.coop); if (SFX.victory) SFX.victory(); else if (SFX.bossDown) SFX.bossDown(); if (!isTraining) PR.clearRun();
  if (!isTraining && !g.gemsPaid) g.gemsPaid = runEndedOnline(g.stage, true, g.p.cls, g.difficulty);
  const R0 = g.gemsPaid || { gems: 0, bonus: [], unlocks: [], ach: [] }, cls = g.p.cls, tm = Math.floor(g.t);
  $('vsub').innerHTML = '<b>' + CLASSES[cls].name + '</b> broke all five titans' + (g.difficulty === 'HARD' ? '<span class="hard">BRUTAL</span>' : '');
  const S = [[tm, v => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'), 'clear time'], [g.kills, v => v, 'kills'], [g.stats.dmg, v => v >= 1000 ? Math.round(v / 1000) + 'k' : v, 'damage'], [g.discovered.size, v => v, 'skills used']];
  $('vstats').innerHTML = S.map(s => '<div><b>0</b><span>' + s[2] + '</span></div>').join(''); [...$('vstats').children].forEach((c, i) => countUp(c.querySelector('b'), S[i][0], S[i][1], 900));
  const cards = ['<div class="vcard rare"><div class="vk">Gems earned</div><div class="vg">' + GEM(26) + '<span class="vgn">0</span></div><div class="vd">' + (R0.bonus.length ? R0.bonus.map(b => b[0] + ' +' + b[1]).join('<br>') : 'Victory bonus') + (g.difficulty === 'HARD' && SU.brutalOk() ? '<br>Season points +' + SU.seasonPoints(25, true, Math.round(g.t)) : '') + '</div></div>'];
  for (const u of R0.unlocks) cards.push(u.kind === 'skin' ? '<div class="vcard rare" data-skin="1"><div class="vk">Exclusive skin</div><div class="vprev"></div><div class="vn">' + u.name + '</div><div class="vd">Only earned by victory</div></div>' : '<div class="vcard rare"><div class="vk">Exclusive dash</div><div class="vg" style="color:#7fe0ff">⟡</div><div class="vn">' + u.name + '</div><div class="vd">Only earned by victory</div></div>');
  for (const a of R0.ach || []) cards.push('<div class="vcard"><div class="vk">Achievement</div><div class="vg">' + PXI('trophy', 32) + '</div><div class="vn">' + a.text + '</div></div>');
  $('vrewards').innerHTML = cards.join(''); [...$('vrewards').children].forEach((c, i) => c.style.animationDelay = (0.5 + i * 0.25) + 's');
  const sk = $('vrewards').querySelector('[data-skin] .vprev'); if (sk) sk.appendChild(heroPreview(cls, 'titanslayer'));
  setTimeout(() => { const n = $('vrewards').querySelector('.vgn'); if (n) countUp(n, R0.gems, v => '+' + v, 900); }, 600);
  const eq = $('vequip'); eq.classList.toggle('hidden', !PR.ownsSkin(cls, 'titanslayer') || PR.skinOf(cls) === 'titanslayer'); eq.onclick = () => { PR.equipSkin(cls, 'titanslayer'); eq.textContent = 'Equipped'; eq.disabled = true; };
  const C = $('vconfetti'); C.innerHTML = ''; const cols = ['#ffe27a', '#d4af37', '#7fe0ff', '#ff7a3c', '#9b8cff', '#ffffff'];
  for (let i = 0; i < 70; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDuration = (2.5 + Math.random() * 3) + 's'; p.style.animationDelay = (Math.random() * 1.5) + 's'; C.appendChild(p); }
  openModal('victory');
}
function showEnd() {
  if (game.won) return showVictory();
  ui = 'end'; const g = game, won = g.won; if (!won && SFX.dead) SFX.dead(); $('end').classList.toggle('coop', !!g.coop); if (!isTraining) PR.clearRun();
  $('endt').textContent = won ? 'The Titans Have Fallen' : 'You Have Fallen'; $('endt').style.color = won ? 'var(--gold)' : 'var(--bad)';
  $('ends').textContent = won ? `${CLASSES[g.p.cls].name} conquered all ${LAST_STAGE} stages${g.difficulty === 'HARD' ? ' on Brutal' : ''}.` : `${CLASSES[g.p.cls].name} fell on stage ${g.stage}${g.boss ? ' to ' + g.boss.def.name : ''}.`;
  const m = Math.floor(g.t / 60), s = Math.floor(g.t % 60);
  const tm = Math.floor(g.t), S = [['stage', g.stage, v => v, 'stage'], ['titan', g.stats.bossKills, v => v, 'titans felled'], ['kills', g.kills, v => v, 'kills'], ['dmg', g.stats.dmg, v => v >= 1000 ? Math.round(v / 1000) + 'k' : v, 'damage dealt'], ['skills', g.discovered.size, v => v, 'skills used'], ['time', tm, v => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'), 'survival time']];
  $('endstats').innerHTML = S.map(([k, , , l]) => '<div class="estat">' + eicon(k) + '<div><b>0</b><span>' + l + '</span></div></div>').join('');
  [...$('endstats').children].forEach((c, i) => countUp(c.querySelector('b'), S[i][1], S[i][2]));
  $('endups').innerHTML = groupBuild(g.upgradeLog);
  const canRevive = !won && !g.revived && !isTraining && !g.coop; $('revivebtn').classList.toggle('hidden', !canRevive); $('revivebtn').textContent = 'Revive · ' + PR.ECON.revive + ' gems' + (PR.P.gems < PR.ECON.revive ? ' (not enough)' : '');
  if (!isTraining && !g.gemsPaid) { g.gemsPaid = won || !canRevive ? runEndedOnline(g.stage, won, g.p.cls) : null; }
  if (g.gemsPaid) { const ach = g.gemsPaid.ach.length ? '<span class="ach">' + g.gemsPaid.ach.map(a => a.text).join(', ') + '</span>' : ''; $('endgems').innerHTML = GEM(20) + '<span><span class="gn">0</span> Gems Earned</span>' + ach + '<span class="tot">Total: ' + GEM(14) + PR.P.gems + '</span>'; countUp($('endgems').querySelector('.gn'), g.gemsPaid.gems, v => '+' + v); }
  else $('endgems').innerHTML = canRevive ? '<span style="color:#9aa09d;font-weight:600">Revive once per run to keep going.</span>' : '';
  openModal('end');
}

// ---------- chất lượng đồ hoạ: High / Low / Auto (Auto bắt đầu ở High, tự chuyển Low nếu máy chậm) ----------
var autoLow = false, slowT = 0;   // var: saveSet() gọi applyGfx() từ đầu file, trước dòng này
function applyGfx() { R.lowQ = SET.gfx === 'low' || (SET.gfx === 'auto' && autoLow); }
// ---------- vòng lặp ----------
let last = performance.now(), acc = 0;
// input của người chơi trên máy này trong một khung (dùng chung cho chơi đơn và co-op)
function readInput(dt, wm) {
  const p = game.p, wasd = SET.control === 'wasd';
  const kx = (keys.has('ArrowRight') || (wasd && keys.has('KeyD')) ? 1 : 0) - (keys.has('ArrowLeft') || (wasd && keys.has('KeyA')) ? 1 : 0);
  const ky = (keys.has('ArrowDown') || (wasd && keys.has('KeyS')) ? 1 : 0) - (keys.has('ArrowUp') || (wasd && keys.has('KeyW')) ? 1 : 0);
  if (kx || ky || wasd) { moveTo = null; attackT = null; }
  if (mouse.rdown && !attackT) moveTo = { x: wm.x, y: wm.y };
  const it = { mx: kx, my: ky, ax: wm.x, ay: wm.y, cx: wm.x, cy: wm.y };
  const range = p.cls === 'KNIGHT' || p.cls === 'AXIOM' ? 64 : p.cls === 'RANGER' ? 330 : 290;
  let autoFire = false;
  if (attackT && (attackT.dead || !game.enemies.includes(attackT))) attackT = null;
  if (attackT) { const d = Math.hypot(attackT.x - p.x, attackT.y - p.y) - (attackT.r || 16); it.ax = attackT.x; it.ay = attackT.y; if (d > range) { it.mx = attackT.x - p.x; it.my = attackT.y - p.y; } else autoFire = true; }
  else if (moveTo) { const d = Math.hypot(moveTo.x - p.x, moveTo.y - p.y); if (d < 8) moveTo = null; else { it.mx = moveTo.x - p.x; it.my = moveTo.y - p.y; } }
  it.fire = autoFire; it.fireHeld = mouse.down; it.fireReleased = mouse.released;
  if (TM.touchOn()) TM.touchInput(it, game, dt);
  it.spaceHeld = it.spaceHeld || keys.has('ShiftLeft') || keys.has('ShiftRight');
  return { it, kx, ky, wasd };
}
function frame(now, manual) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (ui === 'trailer') { AU.music(null); AU.duck(false); trailerFrame(dt); if (!manual) requestAnimationFrame(frame); return; }   // trailer tự phát nhạc riêng: tắt nhạc sảnh/biome
  if (!manual && ui === 'play' && SET.gfx === 'auto' && !autoLow && !document.hidden) { slowT = R.fps < 45 ? slowT + dt : Math.max(0, slowT - dt * 0.5); if (slowT > 3) { autoLow = true; applyGfx(); } }
  const wm = worldMouse();
  if (CO.on && game.coop && ui !== 'title') coopFrame(dt, wm);
  else if (ui === 'play' && !game.over) {
    if (game.state === 'reward') openReward();
    else {
      acc += dt;
      const p = game.p, { it, kx, ky, wasd } = readInput(dt, wm);
      let steps = 0;
      while (acc >= 1 / 60 && steps < 4) {
        // phím chỉ được lấy ra khỏi hàng đợi khi thực sự có bước mô phỏng → không còn mất phím trên màn hình >60Hz
        if (steps === 0) {
          it.slots = slotQ.splice(0); it.potion = potQ; potQ = null;
          if (dashQ) { it.dash = true; if (TM.touchOn()) { const d = TM.dashDir(game); it.mx = d.x; it.my = d.y; } else if (!(wasd && (kx || ky))) { it.mx = wm.x - p.x; it.my = wm.y - p.y; } moveTo = null; dashQ = false; }
          it.space = spaceQ; spaceQ = false;
        } else { it.space = false; it.slots = []; it.dash = false; it.fireReleased = false; it.potion = null; }
        { const t0 = performance.now(); game.step(1 / 60, it); R.simMs = (R.simMs || 0) * 0.9 + (performance.now() - t0) * 0.1; } acc -= 1 / 60; steps++;   // F3: đo cả thời gian mô phỏng
        if (game.state === 'reward' || game.over) break;
      }
      if (steps) { mouse.pressed = false; mouse.released = false; }
    }
  } else if (ui === 'title') { game.p.x += dt * 35; game.p.y += Math.sin(now / 4000) * dt * 15; game.p.aim = 0; }
  if (!isTraining && ui !== 'title') trackEvents(game.events);
  try { R.draw(game, { dt, sfx: ui === 'play' || ui === 'reward' ? SFX : null, aimDist: ui === 'play' ? Math.hypot(wm.x - game.p.x, wm.y - game.p.y) : 0 }); }
  catch (err) { console.error(err); game.events.length = 0; R.ctx.setTransform(1, 0, 0, 1, 0, 0); R.ctx.globalAlpha = 1; }
  const c = R.ctx;
  if (ui === 'play') {
    if (marker) { marker.t -= dt; if (marker.follow) { marker.x = marker.follow.x; marker.y = marker.follow.y; } const [sx, sy] = R.toScreen(marker.x, marker.y), k = Math.max(0, marker.t / 0.45), Z = R.zoom; c.strokeStyle = marker.c; c.globalAlpha = k; c.lineWidth = 3; c.beginPath(); c.ellipse(sx, sy + 6 * Z, 18 * Z * (1.4 - k * 0.4), 9 * Z * (1.4 - k * 0.4), 0, 0, 7); c.stroke(); c.globalAlpha = 1; if (marker.t <= 0) marker = null; }
    if (attackT) { const [sx, sy] = R.toScreen(attackT.x, attackT.y), r = ((attackT.r || 16) + 8) * R.zoom; c.strokeStyle = '#ff5a4a'; c.lineWidth = 2; c.setLineDash([5, 4]); c.beginPath(); c.ellipse(sx, sy + r * 0.5, r * 1.3, r * 0.6, 0, 0, 7); c.stroke(); c.setLineDash([]); }
    TM.drawTouch(c, R, game);
    if (!TM.touchOn()) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(mouse.x, mouse.y, 9, 0, 7); c.moveTo(mouse.x - 14, mouse.y); c.lineTo(mouse.x - 5, mouse.y); c.moveTo(mouse.x + 5, mouse.y); c.lineTo(mouse.x + 14, mouse.y); c.moveTo(mouse.x, mouse.y - 14); c.lineTo(mouse.x, mouse.y - 5); c.moveTo(mouse.x, mouse.y + 5); c.lineTo(mouse.x, mouse.y + 14); c.stroke(); }
  }
  if (ui !== 'title') hud(dt);
  AU.music(ui === 'title' ? 'title' : ((game.boss && !game.boss.dead) ? 'boss_' : 'map_') + (game.theme || 'forest')); AU.musicPhase(game.boss && !game.boss.dead ? game.boss.phase : 0); AU.duck(ui !== 'play' && ui !== 'title');
  if (ui === 'play' && !game.over && endShown && game.revived && !modals.includes('end')) endShown = false;
  if (ui === 'play' && game.over && !endShown) { endShown = true; setTimeout(showEnd, game.won ? 1500 : 1100); }
  if (!manual) requestAnimationFrame(frame);
}
window.__ea = {
  get game() { return game; }, R, startRun, openBag, closeBag, get mSel() { return mSel; }, set mSel(v) { mSel = v; renderBag(); }, SET, startTraining, pause, resume, openReward, pickReward, toTitle, get ui() { return ui; },
  frames: n => { for (let i = 0; i < n; i++) frame(last + 1000 / 60, true); },
  press: code => { window.dispatchEvent(new KeyboardEvent('keydown', { code })); window.dispatchEvent(new KeyboardEvent('keyup', { code })); },
  shot: async n => fetch('/save/' + n, { method: 'POST', body: cv.toDataURL('image/png') }).then(r => r.text()),
  trailer: { start: (record, extra) => runTrailer(record, extra), time: trailerTime, audio: renderTrailerAudio, music: renderTrailerMusic, clips: trailerClipList }
};
requestAnimationFrame(frame);
TM.initMobile({ SET, game: () => game, slot: i => { if (ui === 'play' && !modals.length) slotQ.push(i); }, dash: () => { if (ui === 'play' && !modals.length) dashQ = true; }, space: () => { if (ui === 'play' && !modals.length) spaceQ = true; }, potion: k => { if (ui === 'play' && !modals.length) potQ = k; } });
syncControl();
if (!document.documentElement.requestFullscreen) document.querySelectorAll('[data-act="fullscreen"]').forEach(b => b.classList.add('hidden'));   // iPhone Safari: không có API toàn màn hình

// nút đóng: mọi bảng dùng nút X ở góc trên bên phải (luôn dính trên cùng khi cuộn), bỏ nút đóng ở cuối trang
const PX_X = '<svg viewBox="0 0 7 7" width="14" height="14" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true"><path d="M0 0h2v1H0zM1 1h2v1H1zM2 2h3v1H2zM3 3h1v1H3zM2 4h3v1H2zM1 5h2v1H1zM0 6h2v1H0zM5 0h2v1H5zM4 1h2v1H4zM4 5h2v1H4zM5 6h2v1H5z"/></svg>';
for (const [mid, sel] of [['leader', '[data-close]'], ['redeem', '[data-close]'], ['rewards', '[data-close]'], ['seasonwin', '[data-close]'], ['settings', '[data-close]'], ['controls', '[data-close]'], ['shop', '[data-close]'], ['bag', '#bagclose'], ['smith', '#smithclose']]) {
  const box = document.querySelector('#' + mid + ' .box'), orig = box && box.querySelector('.row ' + sel); if (!orig) continue;
  const x = document.createElement('button'); x.className = 'qclose xclose'; x.setAttribute('aria-label', 'Close'); x.title = orig.textContent.trim(); x.innerHTML = PX_X;
  x.onclick = e => { e.stopPropagation(); orig.click(); }; box.prepend(x);
  orig.style.display = 'none'; const row = orig.closest('.row'); if (row && [...row.children].every(c => c.style.display === 'none')) row.style.display = 'none';
}
for (const b of document.querySelectorAll('.qclose:not(.xclose) svg')) b.outerHTML = PX_X;

hydratePixelIcons(document);

// ---------- online: đăng nhập Google, nickname, đồng bộ tiến trình, bảng xếp hạng ----------
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } };
// kết thúc lượt: thưởng gem như cũ + gửi thành tích lên bảng xếp hạng (bỏ qua Test Lab / luyện tập)
function runEndedOnline(stage, won, cls, diff) {
  const r = PR.runEnded(stage, won, cls, diff);
  if (!isTraining && !game.lab && !game.training && !game.coop) ON.submitRun({ stage, time: game.t, cls, won, difficulty: diff || game.difficulty });
  return r;
}
function renderAcct(s) {
  const A = $('acct'), L = $('leaderbtn'); if (!A || !L) return;
  A.classList.toggle('hidden', !s.configured); L.classList.toggle('hidden', !s.configured); if (!s.configured) return;
  if (!s.ready) { A.innerHTML = '<span class="acctbtn">…</span>'; return; }
  if (!s.user) { A.innerHTML = '<button class="acctbtn" id="signin">' + PXI('play', 14) + 'Sign in with Google</button>'; $('signin').onclick = () => ON.signIn(); return; }
  A.innerHTML = '<button class="acctbtn me" id="acctme" title="Change nickname">' + PXI('star', 14) + escH(s.nick || 'Set nickname') + '</button><button class="acctbtn out" id="signout" title="Sign out">' + PXI('door', 14) + '</button>';
  $('acctme').onclick = openNick; $('signout').onclick = () => confirmBox('Sign out?', 'Your progress stays saved in your account.', () => ON.signOut());
}
function openNick() { const s = ON.state(); if (!s.user) return; $('nickin').value = s.nick || ''; $('nickerr').textContent = ''; openModal('nick'); setTimeout(() => $('nickin').focus(), 50); }
$('nickok').onclick = async () => { const b = $('nickok'); b.disabled = true; const r = await ON.setNickname($('nickin').value); b.disabled = false; if (r.error) { $('nickerr').textContent = r.error; return; } closeModal('nick'); showHint('Nickname saved: ' + ON.state().nick, 3); };
// đồng bộ hồ sơ: lần đầu trên máy này lấy bản có nhiều tiến trình hơn; về sau bản nào mới hơn thì thắng
let syncUser = null, pushT = 0;
const progressScore = d => !d ? -1 : ((d.stats && d.stats.runs) || 0) * 10 + (d.gems || 0) + ((d.skins && d.skins.length) || 0) * 50;
async function syncProfile(s) {
  if (!s.user) { syncUser = null; return; }
  if (syncUser === s.user.id) return; syncUser = s.user.id;
  const cloud = await ON.loadSave(), linked = lsGet('ea-cloud-user') === s.user.id, lastPush = lsGet('ea-cloud-at') || '';
  const takeCloud = cloud && (linked ? cloud.updated_at > lastPush : progressScore(cloud.data) >= progressScore(PR.P));
  if (takeCloud) { PR.replace(cloud.data); lsSet('ea-cloud-at', cloud.updated_at); showHint('Progress loaded from your account.', 3); }
  else if (await ON.pushSave(PR.P)) lsSet('ea-cloud-at', new Date().toISOString());
  lsSet('ea-cloud-user', s.user.id);
  if (!s.nick) openNick();
}
async function pushNow() { if (!syncUser) return; clearTimeout(pushT); pushT = 0; if (await ON.pushSave(PR.P)) lsSet('ea-cloud-at', new Date().toISOString()); }
PR.onChange(() => { if (!syncUser) return; clearTimeout(pushT); pushT = setTimeout(pushNow, 2500); if (ui === 'title') renderContinue(); });
addEventListener('pagehide', () => { if (pushT) pushNow(); });
renderContinue();
const fmtTime = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
async function renderAllTime(B) {
  B.innerHTML = '<p class="sub">Loading…</p>';
  const r = await ON.fetchLeaderboard(50), me = ON.state().user ? ON.state().user.id : null;
  if (r.error) { B.innerHTML = '<p class="sub">Could not load the leaderboard. Check your connection.</p>'; return; }
  if (!r.rows.length) { B.innerHTML = '<p class="sub">No runs yet. Be the first!</p>'; return; }
  const row = x => '<tr class="' + (x.rank <= 3 ? 'r' + x.rank : '') + (x.user_id === me ? ' me' : '') + '"><td>#' + x.rank + '</td><td>' + escH(x.nickname) + '</td><td>' + ((CLASSES[x.cls] || {}).name || x.cls) + '</td><td' + (x.won ? ' class="won"' : '') + '>' + (x.won ? 'Victory' : 'Stage ' + x.stage) + '</td><td>' + fmtTime(x.time_s) + '</td></tr>';
  B.innerHTML = '<table class="lb"><thead><tr><th>Rank</th><th>Player</th><th>Hero</th><th>Reached</th><th>Time</th></tr></thead><tbody>' + r.rows.map(row).join('') + (r.me ? '<tr class="gap"><td colspan="5">…</td></tr>' + row(r.me) : '') + '</tbody></table>' + (!me ? '<p class="sub" style="margin-top:10px">Sign in with Google to post your runs.</p>' : '');
}
ON.onOnline(s => { renderAcct(s); syncProfile(s); });
SU.initSeasonUI({ openModal, closeModal, showHint, renderAllTime, refreshGems: () => { for (const id of ['titlegems', 'shopgems']) if ($(id)) setGems($(id), PR.P.gems); }, onAccess: () => { if (modals.includes('newrun')) renderNewRun(); } });
ON.initOnline();
