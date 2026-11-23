// Vẽ: thế giới mở, nhân vật pixel, chiêu theo lớp, boss và vòng cảnh báo. Chỉ đọc trạng thái game.
// Đường ống: thế giới vẽ lên khung pixel nhỏ (1px = WPP đơn vị) → ánh sáng → hiệu ứng phát sáng → phóng to nguyên lần
// lên màn hình → chữ (số sát thương, tên chiêu) vẽ sắc nét ở độ phân giải màn hình.
import { TILE, CHUNK, CLASSES, ENEMIES, hash2 } from './sim.js';
import { WPP, sn, canvas, fromRows, whiteOf } from './gfx/pixel.js';
import { THEMES, themeOf } from './gfx/themes.js';
import { Ground } from './gfx/ground.js';
import { Props } from './gfx/props.js';
import { Lighting } from './gfx/light.js';
import { Ambient } from './gfx/ambient.js';
import { pickupSprite } from './gfx/icons.js';
import { gateLayers, GATE, GATE_LIGHTS, GATE_INFO } from './gfx/gates.js';
import { drawSurface, drawMapHazards } from './gfx/surface.js';
import { WARN } from './env.js';
import { bossAnimState, animFrame, squash, HEAVY } from './gfx/bosspix.js';
import { tintOf } from './gfx/pixel.js';
import { forgeHouse, smithSprite, forgeLantern, runeStone, forgeStock, forgeApron, forgeCounter, SMITH_POSES, FORGE_PAL } from './gfx/forge.js';
import * as BVX from './gfx/bossvfx.js';
import * as SKF from './gfx/skinfx.js';
import { skinVFXHooks as SKV } from './gfx/skinvfx.js';
import { trenchStyles } from './gfx/trench.js';
const SKIN_VIS = new Set(['swing', 'knightWave', 'arcSlash', 'whirl', 'spike', 'rainHit', 'beam', 'blink', 'slam', 'trapPop', 'trapSet', 'boom', 'volley', 'dash', 'skill', 'ultfx', 'ultCast', 'shoot', 'zone', 'hit']);
const ARROW_K = new Set(['arrow', 'pierce', 'silver']);
const HERO_OWN = new Set(['arcSlash', 'whirl', 'spike', 'rainHit', 'beam', 'blink', 'slam', 'trapPop', 'boom', 'zone']);
import { drawUlts, ultEvent, drawUltEvents, ultCastFx } from './gfx/ultvfx.js';
import { drawRelics } from './gfx/relicvfx.js';
import { drawSigils, drawFoeTells, drawFoeShot, drawLobs, holeEye, reticle, drawIceSpikes } from './gfx/foevfx.js';
import { HAND_Y } from './gfx/skinlines.js';
import { Rig, heroPose, enemyPose, bossPose, weapon, ENEMY_SIZE, ENEMY_FEET, BOSS_DRAW, HERO_MX, HERO_MY, skinWeapon, lookAnim, staffTip } from './gfx/rig.js';
import { EL_INFO, GROUP_COLOR } from './kits.js';
import { BOSS_DEFS } from './boss.js';

const SPR = {
  KNIGHT: ['....HHHH....', '...HHHHHH...', '...HSSSSH...', '...SeSSeS...', '....SSSS....', '..AABBBBAA..', '..ABBBBBBA..', '...BBGGBB...', '...BBBBBB...', '...LL..LL...', '...LL..LL...', '..oo....oo..'],
  RANGER: ['....hhhh....', '...hhhhhh...', '..hhSSSShh..', '...SeSSeS...', '....SSSS....', '...BBBBBB...', '..BBBBBBBB..', '...BBGGBB...', '...BBBBBB...', '...LL..LL...', '...LL..LL...', '..oo....oo..'],
  MAGE:   ['.....HH.....', '....HHHH....', '..HHHHHHHH..', '...SeSSeS...', '....SSSS....', '...BBBBBB...', '..BBBGGBBB..', '..BBBBBBBB..', '..BBBBBBBB..', '..BBBBBBBB..', '...LL..LL...', '..oo....oo..'],
  GRUNT:  ['............', '...HHHHHH...', '..HHHHHHHH..', '..HeHHHHeH..', '..HHHttHHH..', '.AABBBBBBAA.', '.ABBBBBBBBA.', '..BBBBBBBB..', '..BBBBBBBB..', '...LL..LL...', '...LL..LL...', '..oo....oo..'],
  CHARGER:['............', '.hh......hh.', '..hHHHHHHh..', '.HHeHHHHeHH.', '.HHHHttHHHH.', 'AABBBBBBBBAA', 'ABBBBBBBBBBA', '.BBBBBBBBBB.', '.BBBBBBBBBB.', '..LLL..LLL..', '..LLL..LLL..', '.ooo....ooo.'],
  DUMMY:  ['....HHHH....', '...HHHHHH...', '...HeHHeH...', '....HHHH....', '.AAAABBAAAA.', '.A..BBBB..A.', '....BBBB....', '....BBBB....', '.....LL.....', '.....LL.....', '.....LL.....', '...oooooo...'],
  SHOOTER:['.....HH.....', '....HHHH....', '...HHHHHH...', '...HeHHeH...', '....HHHH....', '...BBBBBB...', '..BBBBBBBB..', '..BBBGGBBB..', '..BBBBBBBB..', '..BBBBBBBB..', '...BB..BB...', '..oo....oo..']
};
const PAL = {
  KNIGHT:  { H: '#c9d3df', S: '#f0c9a0', e: '#141220', A: '#9fb0c4', B: '#3f6fbf', G: '#e6c36a', L: '#34304a', o: '#1c1826' },
  RANGER:  { h: '#3a8a46', S: '#f0c9a0', e: '#141220', B: '#5aa860', G: '#c8a050', L: '#5a4630', o: '#1c1826' },
  MAGE:    { H: '#5a4ab0', S: '#f0c9a0', e: '#9ff', B: '#6a58c8', G: '#e6c36a', L: '#2c2848', o: '#1c1826' },
  GRUNT:   { H: '#8a4a32', e: '#ffd46a', t: '#f0e0c0', A: '#6b3a26', B: '#b8603e', L: '#4a2a1c', o: '#1c1210' },
  CHARGER: { h: '#e8dcc0', H: '#a8742e', e: '#ff5a3a', t: '#f0e0c0', A: '#7a5420', B: '#c88a3a', L: '#5a3a18', o: '#1c1210' },
  DUMMY:   { H: '#d8b47a', e: '#5a3a1a', A: '#8a6a3a', B: '#c8a060', L: '#6a4a2a', o: '#3a2a1a' },
  SHOOTER: { H: '#4a3a7a', e: '#ff7af0', B: '#7a5ac0', G: '#ff9af0', L: '#3a2c5a', o: '#140f20' }
};
// boss: khung người khổng lồ 16x16, mỗi con một bảng màu
const TITAN = ['....HH....HH....', '....HHH..HHH....', '.....DBBBBD.....', '....DBBBBBBD....', '....BBEBBEBB....', '....BBBBBBBB....', '..AADBBBBBBDAA..', '.AAABBBCCBBBAAA.', '.AAABBBCCBBBAAA.', '.AA.BBBBBBBB.AA.', '.LL.DBBBBBBD.LL.', '.LL..BBBBBB..LL.', '.....BB..BB.....', '....DBB..BBD....', '....DDD..DDD....', '................'];
const BOSS_PAL = {
  COLOSSUS:  { H: '#3a2a26', D: '#2a1c1a', B: '#5a3a30', E: '#ffd36b', A: '#6b4636', C: '#ff7a3c', L: '#ff9a4a' },
  WARDEN:    { H: '#e8faff', D: '#2a4a68', B: '#4a7aa8', E: '#ffffff', A: '#6aa8d8', C: '#bff0ff', L: '#9fe6ff' },
  BEHEMOTH:  { H: '#6a5a42', D: '#3a3428', B: '#7a6a50', E: '#ff9a4a', A: '#8a7a5a', C: '#d4b46e', L: '#9a8a6a' },
  SOVEREIGN: { H: '#ffe27a', D: '#2a1e48', B: '#4a3478', E: '#7fe0ff', A: '#6a4aa8', C: '#c9a8ff', L: '#9b7ae0' }
};
const mixLight = c => { const n = parseInt(c.slice(1, 7), 16), m = v => Math.min(255, v + Math.round((255 - v) * 0.6)); return 'rgb(' + m(n >> 16) + ',' + m((n >> 8) & 255) + ',' + m(n & 255) + ')'; };
const BREAK_C = { tree: ['#3c8a48', '#6a4a2a'], rock: ['#8a8e98', '#5a5a62'], pillar: ['#a8a898', '#6a6a5e'], crate: ['#9e6e40', '#5a3a1e'], lamp: ['#ffd27a', '#3a3a44'] };
const BIO = {
  meadow: { a: '#4f8f4a', b: '#4a8845', d: '#6fae5c', f: ['#f2e27a', '#f29ab0', '#ffffff'] },
  forest: { a: '#2f6b3f', b: '#2c653b', d: '#3f8a4c', f: ['#c9e86a', '#7fd0a0', '#e8f0a0'] },
  ruins:  { a: '#5f6a4c', b: '#5a6448', d: '#7a8460', f: ['#d8c890', '#b0b8a0', '#e0d0a0'] }
};
const ELC = el => (EL_INFO[el] || { color: '#ffffff' }).color;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export class Renderer {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.spr = {}; this.white = {}; this.bossS = {};
    // sprite gốc 1:1 pixel (12x12 + viền), vẽ ra 42 đơn vị = 14 pixel khung
    for (const k of Object.keys(SPR)) { this.spr[k] = fromRows(SPR[k], PAL[k]); this.white[k] = whiteOf(this.spr[k]); }
    for (const d of BOSS_DEFS) { this.bossS[d.id] = WPP * Math.max(1, Math.round(d.r * 2.6 / 16 / WPP)); this.spr[d.id] = fromRows(TITAN, BOSS_PAL[d.id] || BOSS_PAL.COLOSSUS); this.white[d.id] = whiteOf(this.spr[d.id]); }
    this.buf = canvas(64, 64); this.bctx = this.buf.getContext('2d');
    this.groundC = new Ground(); this.props = new Props(); this.light = new Lighting(); this.amb = new Ambient();
    this.rig = new Rig(); this.onStep = null; this.swT = 0.16; this.lastSwing = 0;
    this.texts = []; this.fps = 60; this.ms = 0; this.stepT = 0; this.P = 3;
    this.opts = { shake: true, numbers: true, fps: false, light: true }; this.zoom = 1;
    this.reset();
    this.resize(cv.width, cv.height);
  }
  toScreen(x, y) { return [(x - this.camX) * this.zoom + this.W / 2, (y - this.camY) * this.zoom + this.H / 2]; }
  toWorld(sx, sy) { return [(sx - this.W / 2) / this.zoom + this.camX, (sy - this.H / 2) / this.zoom + this.camY]; }
  reset() { this.fadeHold = false; this.fadeIn = 0; this.flashW = 0; this.bolts = []; this.lavaPts = []; this.streaks = []; this.stars = []; this.circles = []; this.claws = []; this.cracks = []; this.fallen = []; this.lobs = []; this.camX = 0; this.camY = 0; this.shake = 0; this.parts = []; this.nums = []; this.rings = []; this.slashes = []; this.decals = []; this.beams = []; this.spikes = []; this.castText = null; this.flash = 0; this.time = 0; this.banner = null;
    this.skl = []; this.skdec = []; this.skx = []; this.skrib = []; this.skp = []; this.skg = []; this.skgh = []; this.skfoot = []; this._skUlt = null; this._skKick = null; }   // hiệu ứng skin không sót sang trận/xem trước mới
  // mỗi pixel khung = P điểm màn hình (số nguyên), khung cao khoảng 225 pixel
  resize(w, h) {
    this.cv.width = w; this.cv.height = h; this.W = w; this.H = h; this.ctx.imageSmoothingEnabled = false;
    this.P = this.fixedP || Math.max(2, Math.round(h / 225)); this.zoom = this.P / WPP;   // fixedP: số pixel nguyên cho mỗi pixel game (màn xem trước)
    this.bw = Math.ceil(w / this.P) + 3; this.bh = Math.ceil(h / this.P) + 3;
    this.buf.width = this.bw; this.buf.height = this.bh; this.bctx.imageSmoothingEnabled = false;
  }
  wtext(x, y, s, c, size) { this.texts.push({ x, y, s, c, size }); }
  addShake(v) { this.shake = Math.max(this.shake, v); }
  num(x, y, s, c, big) { if (this.opts.numbers) this.nums.push({ x: x + (Math.random() - 0.5) * 14, y, s, c, t: 0.8, T: 0.8, big }); }

  // màu của chiêu khi skin phủ loại chiêu này: chiêu đơn giữ màu nguyên tố (nhuộm theo skin), còn lại theo màu skin
  ec(el) { return !this.curTh ? ELC(el) : this.curCat === 'single' && el ? SKV.elPal(this.curTh, el)[2] : this.curTh.pal[2]; }
  consume(sim, sfx) {
    const skfx = sim.p && sim.p.skinFx;
    for (const e of sim.events) { try {
      if (sfx && sfx[e.ev]) sfx[e.ev](e);
      if (e.ev === 'shoot' && sim.p.cls === 'MAGE') this._mzT = 0.1;   // loé đầu trượng 2–3 khung
      let skCat = null, skTh = null;
      if (skfx && SKIN_VIS.has(e.ev)) { skCat = e.fx || (e.ev === 'swing' || e.ev === 'knightWave' || e.ev === 'shoot' || (e.ev === 'boom' && !e.el) || (e.ev === 'hit' && ARROW_K.has(e.kind)) ? 'basic' : e.ev === 'trapPop' ? 'single' : e.ev === 'dash' ? 'move' : e.ev === 'ultfx' || e.ev === 'ultCast' ? 'ult' : null); if (skCat && SKF.covers(skfx, skCat)) skTh = SKF.themeOf(skfx.theme); }
      this.curTh = skTh; this.curCat = skCat; if (skTh && e.pal) e.pal = skTh.pal;
      if (skTh && skCat === 'single' && SKV.owns(skTh) && HERO_OWN.has(e.ev) && !(skTh.id === 'celestial' && e.el === 'EARTH')) { if (e.ev !== 'spike') this.addShake(e.big ? 6 : 3); SKV.event(this, e, skTh, skCat, sim.p.cls, sim); this.curTh = null; this.curCat = null; continue; }   // chiêu đơn HEROES: bỏ hẳn hình mặc định
      switch (e.ev) {
        case 'swing': if (skTh && skCat === 'basic') { if (e.hits) this.addShake(e.charge ? 4 + e.charge * 6 : e.big ? 6 : 3); break; } this.slashes.push({ x: e.x, y: e.y, a: e.a, range: e.reach || 104, arc: e.arc || 1.4, t: e.charge ? 0.24 : 0.16, T: e.charge ? 0.24 : 0.16, c: this.curTh ? (e.charge ? this.curTh.pal[3] : this.curTh.pal[2]) : e.charge ? '#ffd36b' : e.big ? '#fff1a0' : '#ffffff', dir: e.combo % 2 ? 1 : -1, thin: !e.charge }); if (e.hits) this.addShake(e.charge ? 4 + e.charge * 6 : e.big ? 6 : 3); break;
        case 'knightWave': this.rings.push({ x: e.x, y: e.y, r: 20, R: e.r, t: 0.35, T: 0.35, c: '#ffe9a0', w: 10 }); this.rings.push({ x: e.x, y: e.y, r: 10, R: e.r * 0.7, t: 0.28, T: 0.28, c: '#ffffff', w: 4 }); this.burst(e.x, e.y, '#ffe9a0', 30, 360, 4, 0.4); this.addShake(9); break;
        case 'arenaRise': for (const q of e.gone || []) this.puff(q.x, q.y, 3, 30, '#8a8270'); this.addShake(6); break;
        case 'killEnergy': if (Math.random() < 0.6) this.parts.push({ x: e.x, y: e.y - 10, vx: 0, vy: -60, life: 0.5, max: 0.5, c: '#7fb0ff', s: 5 }); break;
        case 'terraform': this.puff(e.x, e.y, 10, 80, e.kind === 'sand' ? '#d8c08a' : e.kind === 'mud' ? '#6a4a2a' : e.kind === 'magma' ? '#ff7a3c' : e.kind === 'earth' ? '#8a6a46' : '#9a9080'); this.addShake(e.kind === 'earth' ? 3 : 2); break;
        case 'obstacleBreak': if (e.crumble) { this.puff(e.x, e.y, 6, 30, '#8a8270'); break; } { const bc = BREAK_C[e.type] || BREAK_C.rock, tree = e.type === 'tree'; this.fallen.push({ ...e, t: tree ? 1.4 : 0.6, T: tree ? 1.4 : 0.6, dir: Math.random() < 0.5 ? 1 : -1 }); this.burst(e.x, e.y - e.r, bc[0], 22, 260, 5, 0.6); this.burst(e.x, e.y, bc[1], 12, 200, 4, 0.5); if (e.type === 'crate' && this.T && this.T.crateKind === 'chest' && e.v > 0.5) this.burst(e.x, e.y - 10, '#ffd36b', 26, 280, 4, 0.8); this.decals.push({ x: e.x, y: e.y, t: 20, c: tree ? '#3a2614' : '#4a4a52', stump: tree, r: e.r }); this.addShake(tree ? 4 : 6); break; }
        case 'noEnergy': this.castText = { s: 'Not enough energy (' + e.cost + ')', c: '#7fb0ff', t: 0.8, T: 0.8 }; break;
        case 'hit': if (e.kind !== 'burn') { this.spark(e.x, e.y - 8, e.a, e.kind === 'slash' ? '#fff3c8' : '#ffe9a0', e.dmg >= 40 ? 9 : 4); if (e.dmg >= 40) { this.stars.push({ x: e.x, y: e.y - 10, t: 0.13, T: 0.13 }); this.rings.push({ x: e.x, y: e.y - 8, r: 6, R: 34, t: 0.16, T: 0.16, c: '#ffffff', w: 4 }); this.addShake(5); } } this.burst(e.x, e.y, e.kind === 'slash' ? '#fff3c8' : e.kind === 'burn' ? '#ff9a4a' : '#e8ffd0', e.kind === 'burn' ? 2 : 6, 200, 3, 0.25, e.a);
          if (e.kind !== 'burn' || e.dmg >= 8) this.num(e.x, e.y - 20, String(e.dmg), e.kind === 'burn' ? '#ffb070' : e.dmg >= 40 ? '#ffe27a' : '#ffffff', e.dmg >= 40); break;
        case 'kill': this.puff(e.x, e.y, 6, 14, '#6a6a74'); this.burst(e.x, e.y, (ENEMIES[e.type] || {}).color || '#fff', 16, 250, 4, 0.5, e.a); this.rings.push({ x: e.x, y: e.y, r: 10, R: 44, t: 0.3, T: 0.3, c: '#fff', w: 3 }); this.decals.push({ x: e.x, y: e.y, t: 6, c: (ENEMIES[e.type] || {}).color || '#888' }); this.addShake(2); break;
        case 'boom': this.rings.push({ x: e.x, y: e.y, r: 8, R: e.r || 70, t: 0.28, T: 0.28, c: e.el ? this.ec(e.el) : '#b9a8ff', w: 5 }); this.burst(e.x, e.y, e.el ? this.ec(e.el) : '#c8b8ff', 18, 260, 4, 0.4); this.addShake(4); break;
        case 'hurt': this.claws.push({ x: e.x, y: e.y - 14, t: 0.24, T: 0.24, a: Math.random() < 0.5 ? 0.6 : -0.6 }); this.addShake(10); this.burst(e.x, e.y, '#ff5a5a', 14, 220, 3, 0.35); this.num(e.x, e.y - 30, '-' + e.dmg, '#ff6a6a', true); this.flash = 0.16; break;
        case 'dash': this.burst(e.x, e.y + 8, (this.T && this.T.dust) || '#e8f4ff', 10, 130, 3, 0.35); break;
        case 'thud': this.puff(e.x, e.y + 6, 8, 18, (this.T && this.T.dust) || '#c8b890'); this.addShake(5); this.burst(e.x, e.y, '#c8b890', 12, 200, 4, 0.4); break;
        case 'parry': this.burst(e.x, e.y, '#fff7a0', 10, 200, 3, 0.25); break;
        case 'skill': { const c = this.curTh ? this.curTh.pal[2] : GROUP_COLOR[e.group] || '#fff';   // skin: vòng phép theo màu skin thay cho hồng mặc định
          this.circles.push({ follow: true, r: e.group === 'ULTIMATE' ? 72 : 46, t: 0.6, T: 0.6, c }); this.rings.push({ x: e.x, y: e.y, r: 6, R: 42, t: 0.25, T: 0.25, c, w: 3 }); for (const el of (e.els || [])) this.burst(e.x, e.y - 10, this.ec(el), 6, 140, 3, 0.35); this.castText = { s: e.name, c, t: 1.3, T: 1.3, first: e.first }; break; }
        case 'arcSlash': this.slashes.push({ x: e.x, y: e.y, a: e.a, range: e.range, arc: e.arc, t: 0.22, T: 0.22, c: this.ec(e.el), dir: 1 }); this.burst(e.x + Math.cos(e.a) * e.range * 0.6, e.y + Math.sin(e.a) * e.range * 0.6, this.ec(e.el), 14, 220, 4, 0.35, e.a); this.addShake(4); break;
        case 'whirl': this.rings.push({ x: e.x, y: e.y, r: 10, R: e.r, t: 0.3, T: 0.3, c: this.ec(e.el), w: 8 }); this.burst(e.x, e.y, this.ec(e.el), 22, 260, 4, 0.4); this.addShake(3); break;
        case 'spike': this.spikes.push({ x: e.x, y: e.y, r: e.r, t: 0.45, T: 0.45, c: this.ec(e.el), pal: skTh ? (skCat === 'single' ? SKV.elPal(skTh, e.el || 'EARTH') : [skTh.pal[0], skTh.pal[1], skTh.pal[2], skTh.pal[3]]) : null }); this.burst(e.x, e.y, '#c8b08a', 6, 160, 3, 0.3); this.addShake(1.5); break;
        case 'rainHit': this.burst(e.x, e.y, this.ec(e.el), e.big ? 16 : 5, e.big ? 240 : 120, 3, 0.3); if (e.big) { this.rings.push({ x: e.x, y: e.y, r: 6, R: e.r, t: 0.25, T: 0.25, c: this.ec(e.el), w: 4 }); this.addShake(3); } break;
        case 'beam': this.beams.push({ ...e, t: 0.3, T: 0.3, c: this.ec(e.el) }); this.addShake(4); break;
        case 'blink': this.rings.push({ x: e.x1, y: e.y1, r: 4, R: 40, t: 0.25, T: 0.25, c: '#d8fff1', w: 3 }); this.rings.push({ x: e.x2, y: e.y2, r: 40, R: 4, t: 0.25, T: 0.25, c: '#d8fff1', w: 3 }); for (let i = 0; i < 10; i++) { const k = i / 10; this.burst(e.x1 + (e.x2 - e.x1) * k, e.y1 + (e.y2 - e.y1) * k, '#d8fff1', 1, 40, 3, 0.3); } break;
        case 'slam': this.puff(e.x, e.y, e.big ? 14 : 8, e.r * 0.8, (this.T && this.T.dust) || '#c8b890'); if (e.big) this.cracks.push({ x: e.x, y: e.y, r: Math.min(130, e.r), t: 4, seed: Math.random() * 1e4 }); this.rings.push({ x: e.x, y: e.y, r: 8, R: e.r, t: 0.3, T: 0.3, c: this.ec(e.el), w: 6 }); this.burst(e.x, e.y, this.ec(e.el), e.big ? 30 : 14, e.big ? 320 : 200, 4, 0.5); this.addShake(e.big ? 10 : 5); break;
        case 'trapPop': this.rings.push({ x: e.x, y: e.y, r: 8, R: e.r, t: 0.3, T: 0.3, c: this.ec(e.el), w: 6 }); this.burst(e.x, e.y, this.ec(e.el), 20, 260, 4, 0.4); this.addShake(4); break;
        case 'interrupt': this.num(e.x, e.y - 40, 'INTERRUPTED!', '#7fe0ff', true); this.rings.push({ x: e.x, y: e.y, r: 10, R: 50, t: 0.3, T: 0.3, c: '#7fe0ff', w: 3 }); break;
        case 'steamPop': this.burst(e.x, e.y - 10, '#f0f6fa', 10, 90, 5, 0.6); this.num(e.x, e.y - 34, 'STEAM x1.3', '#e8f4ff'); break;
        case 'block': this.burst(e.x, e.y, '#d8fff1', 6, 120, 3, 0.25); break;
        case 'coin': this.burst(e.x, e.y - 6, '#ffd34a', 4, 90, 3, 0.3); if (e.v >= 10) this.num(e.x, e.y - 24, '+' + e.v + ' gold', '#ffd34a'); break;
        case 'potion': this.rings.push({ x: e.x, y: e.y, r: 8, R: 60, t: 0.35, T: 0.35, c: e.k === 'hp' ? '#ff5a6a' : '#5aa8ff', w: 5 }); this.burst(e.x, e.y - 20, e.k === 'hp' ? '#ff8a9a' : '#8ac8ff', 18, 160, 4, 0.5); this.num(e.x, e.y - 40, '+' + e.v + (e.k === 'hp' ? ' HP' : ' energy'), e.k === 'hp' ? '#7aff8a' : '#7fb0ff', true); break;
        case 'goldStart': this.rings.push({ x: e.x, y: e.y - 20, r: 60, R: 10, t: 0.35, T: 0.35, c: '#ffd34a', w: 6 }); this.burst(e.x, e.y - 20, '#ffd34a', 24, 200, 4, 0.5); this.castText = { s: 'HOURGLASS', c: '#ffd34a', t: 1.1, T: 1.1 }; break;
        case 'goldBlock': if (Math.random() < 0.5) this.burst(e.x, e.y - 24, '#fff0a0', 6, 140, 3, 0.25); break;
        case 'goldEnd': for (let i = 0; i < 14; i++) this.parts.push({ x: e.x1 + (Math.random() - 0.5) * 30, y: e.y1 - 20 - Math.random() * 30, vx: (Math.random() - 0.5) * 260, vy: -120 - Math.random() * 160, life: 0.7, max: 0.7, c: i % 2 ? '#ffd34a' : '#c88a1a', s: 6 }); if (e.tele) { this.rings.push({ x: e.x2, y: e.y2, r: 70, R: 6, t: 0.3, T: 0.3, c: '#fff0a0', w: 5 }); for (let i = 0; i < 10; i++) { const k = i / 10; this.burst(e.x1 + (e.x2 - e.x1) * k, e.y1 + (e.y2 - e.y1) * k, '#ffd34a', 1, 40, 3, 0.3); } } this.addShake(3); break;
        case 'stealthOn': this.puff(e.x, e.y, 10, 40, '#c8c8d8'); this.castText = { s: 'HIDDEN', c: '#c8c8e8', t: 0.9, T: 0.9 }; break;
        case 'stealthOff': this.burst(e.x, e.y - 20, '#e8e8ff', 10, 140, 3, 0.3); break;
        case 'crit': this.num(e.x, e.y - 46, 'CRIT ×' + e.mult, '#ffe27a', true); this.rings.push({ x: e.x, y: e.y, r: 8, R: 50, t: 0.25, T: 0.25, c: '#ffe27a', w: 4 }); this.addShake(4); break;
        case 'shieldUp': this.rings.push({ x: e.x, y: e.y - 18, r: 46, R: 32, t: 0.25, T: 0.25, c: '#e6d29a', w: 4 }); break;
        case 'slowmo': this.rings.push({ x: e.x, y: e.y, r: 20, R: 260, t: 0.5, T: 0.5, c: '#9ac8ff', w: 6 }); this.castText = { s: 'SLOW MOTION', c: '#9ac8ff', t: 1.1, T: 1.1 }; break;
        case 'lure': this.puff(e.x, e.y, 6, 26, '#e8e0ff'); break;
        case 'brace': if (!e.on) this.num(e.x, e.y - 40, 'BRACED', '#e6d29a'); break;
        case 'refund': this.num(e.x, e.y - 36, '+energy', '#7fb0ff'); break;
        case 'freeCast': this.castText = { s: 'FREE RECAST', c: '#a6ebcb', t: 0.8, T: 0.8 }; break;
        case 'forgeCover': this.puff(e.x, e.y, 8, Math.max(30, e.r), (this.T && this.T.dust) || '#c8b890'); break;
        case 'forgeNear': this.banner = { s: 'A FORGE IS NEARBY', sub: e.name + ' will trade with you — follow the arrow', t: 2.6, T: 2.6, c: '#ffd34a', small: true }; break;
        case 'forged': break;
        case 'shieldHit': this.rings.push({ x: e.x, y: e.y, r: 20, R: 30, t: 0.15, T: 0.15, c: '#e6d29a', w: 3 }); break;
        case 'notReady': this.castText = { s: e.name + ' — ' + e.cd.toFixed(1) + 's', c: '#ff8a7a', t: 0.8, T: 0.8 }; break;
        case 'locked': this.castText = { s: 'Empty slot', c: '#a8a8a8', t: 0.6, T: 0.6 }; break;
        case 'stageStart': { const biome = e.n > 1 && (e.n - 1) % 5 === 0; this.banner = { s: e.boss ? '' : 'STAGE ' + e.n, sub: e.boss || e.n <= 1 ? '' : 'Stage ' + (e.n - 1) + '  ▸  Stage ' + e.n + (biome ? '  ·  ' + (THEMES[sim.theme] && THEMES[sim.theme].name || '') : ''), t: 2.2, T: 2.2, c: '#ffe9a0' }; this.fadeIn = this.fadeHold || e.n === 1 ? 0.7 : 0; this.fadeHold = false; break; }
        case 'waveClear': this.banner = { s: 'WAVE ' + e.n + (e.of ? '/' + e.of : '') + ' CLEAR', sub: 'Next wave incoming…', t: 1.6, T: 1.6, c: '#c8f0ff', mini: true }; break;
        case 'stageCleared': this.banner = { s: 'STAGE CLEAR', sub: 'Loot flies to you', t: 2.2, T: 2.2, c: '#9dff9d', small: true }; this.rings.push({ x: sim.p.x, y: sim.p.y, r: 10, R: 220, t: 0.5, T: 0.5, c: '#9dff9d', w: 5 }); break;
        case 'gateOpen': { const I = GATE_INFO[e.theme] || GATE_INFO.dungeon; this.banner = { s: 'THE WAY OPENS', sub: 'Collect your spoils, then walk into the gate to ' + I.verb.toLowerCase() + ' to ' + I.to, t: 3.2, T: 3.2, c: I.c, small: true, top: true }; this.addShake(9); this.puff(e.x, e.y - 30, 22, 120, (this.T && this.T.dust) || '#a89470'); for (let i = 0; i < 16; i++) this.parts.push({ x: e.x + (Math.random() - 0.5) * 200, y: e.y - Math.random() * 40, vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 80, life: 0.7, max: 0.7, c: i % 2 ? '#6a6070' : '#3a3440', s: 6 }); break; }
        case 'gateEnter': this.rings.push({ x: sim.p.x, y: sim.p.y, r: 60, R: 6, t: 0.5, T: 0.5, c: '#ffffff', w: 4 }); break;
        case 'bossIntro': this.banner = { s: e.name.toUpperCase(), sub: e.epithet, t: 3.2, T: 3.2, c: '#ff8a6a', boss: true }; this.addShake(8); break;
        case 'bossHit': { const c = e.color || '#ff6a4a'; this.puff(e.x, e.y, 16, (e.r || 60) * 0.9, (this.T && this.T.dust) || '#c8b890'); if (e.kind === 'circle') this.cracks.push({ x: e.x, y: e.y, r: Math.min(150, (e.r || 60) * 0.9), t: 5, seed: Math.random() * 1e4 });  this.addShake(e.kind === 'circle' ? 9 : 6); break; }
        case 'bossStagger': this.banner = { s: e.why === 'crash' ? 'CRASHED!' : 'POSTURE BROKEN!', sub: 'Punish it: +60% damage', t: 1.6, T: 1.6, c: '#ffe27a', small: true }; this.rings.push({ x: e.x, y: e.y, r: 20, R: 160, t: 0.4, T: 0.4, c: '#ffe27a', w: 8 }); this.addShake(12); break;
        case 'bossPhase': this.banner = { s: 'IT GROWS ENRAGED', sub: '', t: 1.8, T: 1.8, c: '#ff5a4a', small: true }; this.addShake(14); this.flash = 0.25; break;
        case 'bossDown': this.flashW = 0.35; for (let i = 0; i < 40; i++) { const q = Math.random() * 6.283, v = 120 + Math.random() * 380; this.parts.push({ x: e.x, y: e.y - 30, vx: Math.cos(q) * v, vy: Math.sin(q) * v * 0.6 - 120, life: 0.9, max: 0.9, c: i % 3 ? '#ffd36b' : '#ffffff', s: 6 }); } this.banner = { s: 'TITAN FELLED', sub: e.name + ' — gather the spoils', t: 3, T: 3, c: '#ffd36b', top: true }; for (let i = 0; i < 4; i++) this.rings.push({ x: e.x, y: e.y, r: 10, R: 120 + i * 80, t: 0.5 + i * 0.15, T: 0.5 + i * 0.15, c: '#ffd36b', w: 6 }); this.burst(e.x, e.y, '#ffd36b', 60, 400, 6, 1); this.addShake(16); break;
        case 'bossBlink': this.rings.push({ x: e.x, y: e.y, r: 70, R: 6, t: 0.3, T: 0.3, c: '#c9a8ff', w: 4 }); break;
        case 'bossRoar': this.rings.push({ x: e.x, y: e.y, r: 20, R: 200, t: 0.5, T: 0.5, c: '#ffffff', w: 4 }); this.addShake(8); break;
        case 'pickup': if (e.kind === 'gem' || e.kind === 'bshard') { if (e.label) this.num(e.x, e.y - 30, e.label, e.kind === 'gem' ? '#7fe0ff' : '#5af0c0', true); this.burst(e.x, e.y, e.kind === 'gem' ? '#7fe0ff' : '#5af0c0', 10, 160, 3, 0.4); break; } this.num(e.x, e.y - 24, e.label, e.kind === 'energy' ? '#7fb0ff' : e.kind === 'heal' ? '#7aff8a' : e.kind === 'shard' ? '#d8b0ff' : '#ffd36b', e.kind === 'stat' || e.kind === 'shard'); this.burst(e.x, e.y, e.kind === 'energy' ? '#7fb0ff' : e.kind === 'heal' ? '#ff7a7a' : '#ffd36b', e.kind === 'stat' ? 22 : 10, 180, 3, 0.4); break;
        case 'sporeBurst': this.puff(e.x, e.y, 18, e.r || 80, '#8ad84a'); this.rings.push({ x: e.x, y: e.y, r: 10, R: e.r || 80, t: 0.4, T: 0.4, c: '#a8ff5a', w: 6 }); this.addShake(3); break;
        case 'trapCrash': this.puff(e.x, e.y, 14, e.r, '#c8a070'); this.rings.push({ x: e.x, y: e.y, r: 10, R: e.r, t: 0.3, T: 0.3, c: '#ffe27a', w: 6 }); this.addShake(7); break;
        case 'ventErupt': this.burst(e.x, e.y - 20, '#ff7a3c', 24, 300, 5, 0.6); this.burst(e.x, e.y - 40, '#ffd36b', 12, 200, 4, 0.5); this.addShake(5); break;
        case 'playerFrozen': this.burst(e.x, e.y - 20, '#bfe8ff', 20, 220, 4, 0.5); this.castText = { s: 'FROZEN!', c: '#9fe6ff', t: 0.9, T: 0.9 }; break;
        case 'iceCrack': this.burst(e.x, e.y - 20, '#ffffff', 10, 200, 3, 0.3); break;
        case 'hurtDot': if (!this.dotT || this.time - this.dotT > 0.45) { this.dotT = this.time; this.num(e.x, e.y - 36, '-' + e.dmg, e.kind === 'poison' ? '#a8ff5a' : '#ff9a4a'); } break;
        case 'bellRing': this.rings.push({ x: e.x, y: e.y, r: 10, R: 125, t: 0.5, T: 0.5, c: '#ffe27a', w: 4 }); break;
        case 'breath': for (let i = 0; i < 10; i++) { const d = 40 + Math.random() * 280; this.parts.push({ x: e.x + Math.cos(e.a) * d, y: e.y + Math.sin(e.a) * d, vx: Math.cos(e.a) * 120, vy: Math.sin(e.a) * 120 - 30, life: 0.5, max: 0.5, c: Math.random() < 0.5 ? '#ff7a3c' : '#ffd36b', s: 6 }); } this.addShake(3); break;
        case 'chain': { const segs = [], n = 6; for (let i = 0; i <= n; i++) { const k = i / n, j = i === 0 || i === n ? 0 : (Math.random() - 0.5) * 26; const nx = -(e.y2 - e.y1), ny = e.x2 - e.x1, L = Math.hypot(nx, ny) || 1; segs.push([e.x1 + (e.x2 - e.x1) * k + nx / L * j, e.y1 + (e.y2 - e.y1) * k + ny / L * j]); } this.bolts.push({ segs, t: 0.22, T: 0.22 }); this.burst(e.x2, e.y2, '#bfe8ff', 8, 160, 3, 0.25); break; }
        case 'fuseLit': this.burst(e.x, e.y - 20, '#ffd36b', 6, 100, 3, 0.3); break;
        case 'bombBlast': this.puff(e.x, e.y, 18, e.r, '#3a3236'); for (let i = 0; i < 3; i++) this.rings.push({ x: e.x, y: e.y, r: 10, R: e.r * (0.6 + i * 0.25), t: 0.3 + i * 0.08, T: 0.3 + i * 0.08, c: i ? '#ff7a3c' : '#ffffff', w: 8 - i * 2 }); this.cracks.push({ x: e.x, y: e.y, r: e.r * 0.8, t: 5, seed: Math.random() * 1e4 }); this.addShake(12); break;
        case 'eliteSpawn': this.banner = { s: 'ELITE: ' + e.name.toUpperCase(), sub: 'Defeat it for a chance at a Fusion Shard', t: 2.2, T: 2.2, c: '#d8b0ff', small: true }; this.rings.push({ x: e.x, y: e.y, r: 10, R: 120, t: 0.5, T: 0.5, c: '#c07aff', w: 6 }); this.addShake(5); break;
        case 'eliteCast': this.rings.push({ x: e.x, y: e.y, r: 40, R: 8, t: 0.3, T: 0.3, c: '#ffffff', w: 3 }); break;
        case 'frostBeam': for (let i = 0; i < 30; i++) { const d = Math.random() * 1400; this.parts.push({ x: e.x + Math.cos(e.a) * d, y: e.y + Math.sin(e.a) * d, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.5, max: 0.5, c: Math.random() < 0.5 ? '#ffffff' : '#9fe6ff', s: 4 }); } this.addShake(6); break;
        case 'dropMinion': for (let i = 0; i < 8; i++) { const k = i / 8; this.parts.push({ x: e.x1 + (e.x2 - e.x1) * k, y: e.y1 + (e.y2 - e.y1) * k - Math.sin(k * Math.PI) * 60, vx: 0, vy: 0, life: 0.4 + k * 0.2, max: 0.6, c: '#b8e070', s: 4 }); } break;
        case 'vortex': this.rings.push({ x: e.x, y: e.y, r: 300, R: 20, t: 0.6, T: 0.6, c: '#9a5aff', w: 6 }); this.addShake(6); break;
        case 'prison': this.rings.push({ x: e.x, y: e.y, r: 10, R: 175, t: 0.4, T: 0.4, c: '#bfe8ff', w: 6 }); this.burst(e.gx, e.gy, '#7aff8a', 16, 120, 4, 0.8); this.num(e.gx, e.gy - 20, 'EXIT', '#7aff8a', true); break;
        case 'rooted': this.burst(e.x, e.y, '#7ac040', 12, 140, 4, 0.4); break;
        case 'burrowDust': for (let i = 0; i < 3; i++) this.parts.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + (Math.random() - 0.5) * 16, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, life: 0.5, max: 0.5, c: '#6a5436', s: 5 }); break;
        case 'lob': (this.lobs = this.lobs || []).push({ ...e, t: 0 }); break;
        case 'spawnDust': this.puff(e.x, e.y + 6, 10, 40, (this.T && this.T.dust) || '#a89470'); this.rings.push({ x: e.x, y: e.y + 4, r: 8, R: 40, t: 0.3, T: 0.3, c: '#ffffff', w: 3 }); break;
        case 'emberRing': this.rings.push({ x: e.x, y: e.y, r: 10, R: 70, t: 0.3, T: 0.3, c: '#ffb04a', w: 5 }); this.addShake(3); break;
        case 'fissure': this.addShake(4); this.burst(e.x, e.y, '#ff6a2a', 10, 220, 4, 0.4); break;
        case 'sporeSplit': this.puff(e.x, e.y, 5, 20, '#b8ff5a'); break;
        case 'iceSpikes': (this.iceSp = this.iceSp || []).push(...e.pts.map(([x, y], i) => ({ x, y, t: 0, T: 0.7, d: i * 0.04, s: 0.7 + Math.random() * 0.6 }))); this.addShake(3); break;
        case 'shadowSmoke': for (let i = 0; i < 14; i++) { const q = Math.random() * 6.28, v = 30 + Math.random() * 60; this.parts.push({ x: e.x + Math.cos(q) * 10, y: e.y - 10 + Math.sin(q) * 8, vx: Math.cos(q) * v, vy: Math.sin(q) * v * 0.5 - 20, life: 0.6, max: 0.6, c: i % 3 ? '#140810' : '#5a0a1c', s: 5 + Math.random() * 4 }); } break;
        case 'sweep': this.addShake(2); break;
        case 'lightwave': this.burst(e.x, e.y, '#ffd36b', 8, 200, 3, 0.3, e.a); break;
        case 'tetherCut': this.rings.push({ x: e.x, y: e.y - 10, r: 6, R: 30, t: 0.25, T: 0.25, c: '#7aff5a', w: 3 }); break;
        case 'sporeLeap': (this.leaps = this.leaps || []).push({ ...e, t: 0 }); break;
        case 'shellBounce': this.addShake(7); this.puff(e.x, e.y, 8, 50, '#8a7a5a'); break;
        case 'lastFlame': this.flash = e.safe ? 0.2 : 0.45; this.addShake(16); for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283, d = Math.random() * e.r; this.parts.push({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, vx: 0, vy: -60 - Math.random() * 80, life: 0.8, max: 0.8, c: Math.random() < 0.5 ? '#ff7a2a' : '#ffd84a', s: 5 }); } if (e.safe) for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283; this.parts.push({ x: sim.p.x + Math.cos(a) * 70, y: sim.p.y + Math.sin(a) * 70, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 0.5, max: 0.5, c: i % 2 ? '#ff7a2a' : '#ffd84a', s: 5 }); } break;
        case 'playerSlowed': this.num(sim.p.x, sim.p.y - 36, 'SLOWED', '#ff9a5a', false); break;
        case 'bossLink': this.addShake(2); break;
        case 'ultfx': ultEvent(this, e); break;
        case 'ultCast': ultCastFx(this, e); this.castText = { s: e.name, c: (e.pal && e.pal[2]) || '#ffd36b', t: 1.4, T: 1.4 }; break;
        case 'regrow': this.puff(e.x, e.y - 40, 10, 40, '#b45ae8'); break;
        case 'blizzard': this.addShake(4); break;
        case 'burrow': this.puff(e.x, e.y, 16, 90, '#6a5436'); this.addShake(6); break;
        case 'burrowOut': this.puff(e.x, e.y, 20, 130, '#8a7050'); this.addShake(10); break;
        case 'ricochet': this.burst(e.x, e.y, '#e8dcc0', 5, 120, 3, 0.2); break;
        case 'revive': for (let i = 0; i < 3; i++) this.rings.push({ x: e.x, y: e.y, r: 10, R: 120 + i * 50, t: 0.5 + i * 0.1, T: 0.5 + i * 0.1, c: '#ffe27a', w: 6 }); this.burst(e.x, e.y, '#ffe27a', 40, 300, 5, 0.8); this.banner = { s: 'REVIVED', sub: '', t: 1.4, T: 1.4, c: '#ffe27a', small: true }; break;
        case 'stageClear': break;
        case 'blackHole': for (let i = 0; i < 2; i++) this.rings.push({ x: e.x, y: e.y, r: e.small ? 110 : 150, R: 8, t: 0.35 + i * 0.12, T: 0.35 + i * 0.12, c: i ? '#c8a8ff' : '#7a4ad8', w: 5 }); this.addShake(e.small ? 2 : 4); if (!e.small) this.castText = { s: 'BLACK HOLE', c: '#c8a8ff', t: 0.9, T: 0.9 }; break;
        case 'holeEnd': this.rings.push({ x: e.x, y: e.y, r: 10, R: e.r || 100, t: 0.3, T: 0.3, c: '#c8a8ff', w: 4 }); this.burst(e.x, e.y, '#9a6aff', 14, 220, 3, 0.35); break;
        case 'refund': this.num(e.x, e.y - 40, '+' + e.v + ' energy', '#7fb0ff', true); break;
        case 'bloodPay': this.num(e.x, e.y - 40, '-' + e.v + ' HP', '#ff5a5a', true); this.burst(e.x, e.y - 20, '#c81a2a', 10, 140, 3, 0.4); break;
        case 'echoCast': this.rings.push({ x: e.x, y: e.y, r: 70, R: 10, t: 0.3, T: 0.3, c: '#c8a8ff', w: 4 }); this.castText = { s: 'ECHO', c: '#c8a8ff', t: 0.7, T: 0.7 }; break;
        case 'spellblade': this.rings.push({ x: e.x, y: e.y - 16, r: 8, R: 40, t: 0.25, T: 0.25, c: ELC(e.el), w: 3 }); break;
        case 'jugHit': this.burst(e.x, e.y, '#ffd36b', 8, 200, 3, 0.25); this.addShake(3); break;
        case 'jugReset': this.num(e.x, e.y - 40, 'DASH READY', '#ffd36b', false); break;
        case 'riposte': this.burst(e.x, e.y, '#ffffff', 8, 200, 3, 0.25); this.num(e.x, e.y - 24, 'RIPOSTE', '#ffe9a0', false); break;
        case 'lunge': for (let i = 0; i < 8; i++) { const k = i / 8; this.parts.push({ x: e.x0 + (e.x - e.x0) * k, y: e.y0 + (e.y - e.y0) * k - 10, vx: 0, vy: -20, life: 0.25 + k * 0.15, max: 0.4, c: i % 2 ? '#ffe9a0' : '#c8b890', s: 5 }); } this.puff(e.x, e.y + 6, 6, 30, (this.T && this.T.dust) || '#c8b890'); break;
      }
      if (this.curTh) SKV.event(this, e, this.curTh, skCat, sim.p.cls, sim); this.curTh = null; this.curCat = null;
    } catch (err) { console.warn('event', e.ev, err); } }
    sim.events.length = 0;
  }
  // tia lửa: vệt sáng ngắn bay theo hướng đòn
  spark(x, y, a, c, n) { for (let i = 0; i < n; i++) { const aa = (a ?? Math.random() * 6.28) + (Math.random() - 0.5) * 1.4, v = 260 + Math.random() * 320; this.streaks.push({ x, y, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, life: 0.16 + Math.random() * 0.1, max: 0.26, c }); } if (this.streaks.length > 200) this.streaks.splice(0, this.streaks.length - 200); }
  // bụi mù: hạt to, bay chậm, toả ra
  puff(x, y, n, r, c) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, d = Math.random() * r * 0.4, v = 30 + Math.random() * 70; this.parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 20, life: 0.5 + Math.random() * 0.5, max: 1, c, s: 6 + Math.random() * 4 }); } }
  // vòng pixel: các ô vuông bám lưới dọc theo đường tròn; gap = [góc giữa khe, độ rộng]; dash = vẽ cách ô
  pixRing(ctx, x, y, r, th, c, gap, a = 1, dash = 0) {
    if (r <= 0) return; const n = Math.max(24, Math.floor(r * 2 * Math.PI / WPP)), sz = sn(Math.max(WPP, th)) || WPP;
    ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = c;
    for (let i = 0; i < n; i++) { if (dash && Math.floor(i / dash) % 2) continue; const q = i / n * Math.PI * 2; if (gap && Math.abs(Math.atan2(Math.sin(q - gap[0]), Math.cos(q - gap[0]))) < gap[1] / 2) continue; ctx.fillRect(sn(x + Math.cos(q) * r - sz / 2), sn(y + Math.sin(q) * r - sz / 2), sz, sz); }
    ctx.globalAlpha = 1;
  }
  magicCircle(ctx, x, y, r, c, rot, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r * 0.72, r * 0.32, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= 3; i++) { const q = rot + i * 2.094; const px = x + Math.cos(q) * r * 0.72, py = y + Math.sin(q) * r * 0.32; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    ctx.fillStyle = c; for (let i = 0; i < 8; i++) { const q = -rot * 1.3 + i * 0.785; ctx.fillRect(sn(x + Math.cos(q) * r) - 3, sn(y + Math.sin(q) * r * 0.45) - 3, 6, 6); }
    ctx.restore();
  }
  burst(x, y, c, n, sp, s, life, dirA) {
    for (let i = 0; i < n; i++) {
      const a = dirA !== undefined ? dirA + (Math.random() - .5) * 1.8 : Math.random() * 6.283, v = sp * (0.3 + Math.random() * 0.7);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), max: life, c, s });
    }
  }

  draw(sim, ui) {
    const t0 = performance.now(), dt = ui.dt, p = sim.p, W = this.W, H = this.H; this.time += dt; this.dtNow = dt;
    this.consume(sim, ui.sfx);
    const lx = Math.cos(p.aim) * Math.min(90, (ui.aimDist || 0) * 0.18), ly = Math.sin(p.aim) * Math.min(70, (ui.aimDist || 0) * 0.18);
    const k = 1 - Math.exp(-10 * dt), lead = (this.camLeadK || 0) * W / this.zoom; this.camX += (p.x + lx + lead - this.camX) * k; this.camY += (p.y + ly - this.camY) * k;
    const sh = this.opts.shake ? this.shake : 0; this.shake = Math.max(0, this.shake - dt * 40);
    const z = this.zoom, vw = W / z, vh = H / z;
    const ox = Math.floor((this.camX - vw / 2) / WPP) * WPP - WPP, oy = Math.floor((this.camY - vh / 2) / WPP) * WPP - WPP;
    const view = this.view = { ox, oy, w: this.bw * WPP, h: this.bh * WPP };
    const tk = this.themeOverride || themeOf(sim), T = THEMES[tk]; this.tk = tk; this.T = T;
    const ctx = this.bctx, lights = [];
    ctx.setTransform(1 / WPP, 0, 0, 1 / WPP, -ox / WPP, -oy / WPP); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = T.bg; ctx.fillRect(ox, oy, view.w, view.h);
    const tufts = this.drawGround(ctx, sim, view, tk, T);
    for (const d of this.decals) { d.t -= dt; if (d.stump !== undefined) { ctx.globalAlpha = Math.min(1, d.t / 3); ctx.fillStyle = d.c; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.55, d.r * 0.3, 0, 0, 7); ctx.fill(); if (d.stump) { ctx.fillStyle = '#7a5a34'; ctx.fillRect(sn(d.x) - 6, sn(d.y) - 6, 12, 6); } continue; } ctx.globalAlpha = Math.max(0, Math.min(0.35, d.t / 6 * 0.35)); ctx.fillStyle = d.c; ctx.fillRect(sn(d.x) - 9, sn(d.y) + 3, 18, 6); ctx.fillRect(sn(d.x) - 3, sn(d.y), 6, 12); }
    ctx.globalAlpha = 1; this.decals = this.decals.filter(d => d.t > 0).slice(-80);
    for (const c of this.cracks) { c.t -= dt; ctx.globalAlpha = Math.min(1, c.t / 1.2) * 0.8; ctx.fillStyle = '#1a1410'; for (let k = 0; k < 7; k++) { let x = c.x, y = c.y, a = k * 0.9 + hash2(k, 1, c.seed | 0) * 0.6; const n = (c.r / 9) | 0; for (let i = 0; i < n; i++) { a += (hash2(k, i, c.seed | 0) - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 4.5; ctx.fillRect(sn(x), sn(y), 3, 3); } } }
    ctx.globalAlpha = 1; this.cracks = this.cracks.filter(c => c.t > 0).slice(-10);
    drawSurface(ctx, sim.surface, view, this.time, lights);
    for (const [lx2, ly2] of this.lavaPts) { const hh = hash2(lx2 | 0, ly2 | 0, 3), b = (this.time * 0.9 + hh * 7) % 1; if (b < 0.25) { ctx.fillStyle = b < 0.12 ? '#ffe27a' : '#ff8a2a'; ctx.fillRect(sn(lx2 - 12 + hh * 24), sn(ly2 - 9 + hh * 12) - sn(b * 30), 6, 6); } if (hh < 0.35) lights.push({ x: lx2, y: ly2, r: 70, i: 0.65, c: '#ff5a1a', glow: 0.12 }); }
    this.under(ctx, sim, false);
    // vật thể + nhân vật + cỏ theo trục y
    const list = [], RR = Math.max(view.w, view.h) / 2 + 160;
    sim.world.near(this.camX, this.camY, RR, o => {
      if (o.hidden) return;
      const spr = this.props.get(tk, T, o);
      if (o.fuse > 0) lights.push({ x: o.x, y: o.y - o.r, r: 90, i: 0.9, c: '#ff5a1a', glow: 0.25 });
      if (o.burning > 0) lights.push({ x: o.x, y: o.y - o.r, r: 110, i: 0.9, c: '#ff7a3c', glow: 0.22 });
      if (spr.glow) lights.push({ x: o.x, y: o.y + spr.glow.dy * WPP, r: spr.glow.r, c: spr.glow.c, i: 0.9 + Math.sin(this.time * 9 + o.x) * 0.08, glow: 0.2 });
      list.push({ y: o.y, f: () => this.obstacle(ctx, o, spr) });
    });
    if (sim.forge) this.forgeWorld(ctx, sim, list, lights);
    if (sim.portal) this.gateWorld(ctx, sim, list, lights);
    for (const e of sim.enemies) if (!e.boss && !e.cloneOf) list.push({ y: e.y, f: () => this.enemy(ctx, e, sim) });
    list.push({ y: p.y, f: () => this.player(ctx, sim) });
    for (const tu of tufts) list.push({ y: tu.y, f: () => this.tuft(ctx, tu, sim, tk, T) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.f());
    for (const f of this.fallen) {
      f.t -= dt; const kk = 1 - f.t / f.T;
      ctx.save(); ctx.globalAlpha = Math.min(1, f.t / 0.4); ctx.translate(sn(f.x), sn(f.y));
      if (f.type === 'tree') { const spr = this.props.get(tk, T, f); ctx.rotate(f.dir * Math.min(1.5, kk * kk * 3.2)); ctx.drawImage(spr.img, -spr.ax * WPP, -spr.ay * WPP, spr.img.width * WPP, spr.img.height * WPP); }
      else { const bc = BREAK_C[f.type] || BREAK_C.rock; for (let i = 0; i < 5; i++) { const a = i * 1.26 + f.x, d = kk * 40; ctx.fillStyle = i % 2 ? bc[0] : bc[1]; ctx.fillRect(sn(Math.cos(a) * d) - 6, sn(Math.sin(a) * d - (1 - kk) * 10) - 6, 12, 9); } }
      ctx.restore();
    }
    this.fallen = this.fallen.filter(f => f.t > 0);
    // hạt trôi + ánh sáng
    this.amb.update(dt, this.time, T.motes); this.amb.draw(ctx, view, this.time, lights);
    if (this.opts.light) { this.collectLights(sim, lights); this.light.render(ctx, view, T.dark, T.amb + (sim.boss ? 0.03 : 0), lights); }
    // phần phát sáng / cảnh báo: luôn rõ, không bị tối
    if (sim.arena) this.arena(ctx, sim);
    this.under(ctx, sim, true);
    drawMapHazards(ctx, sim.mapHz || [], sim.t, WARN, lights);
    drawSigils(ctx, sim, this.time);
    this.hazards(ctx, sim, false);
    for (const e of sim.enemies) if (e.boss || e.cloneOf) (e.boss ? this.boss(ctx, e, sim) : this.enemy(ctx, e, sim)); // boss + phân thân luôn được chiếu sáng như nhau
    for (const e of sim.enemies) {
      const eai = (ENEMIES[e.type] || {}).ai;
      if (eai === 'charger' && e.state === 'tele') {
        const pr = 1 - e.st / 0.62; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ta);
        ctx.fillStyle = `rgba(255,80,60,${0.15 + pr * 0.25})`; ctx.fillRect(0, -18, 270, 36);
        ctx.fillStyle = `rgba(255,220,180,${0.5 + pr * 0.5})`; ctx.fillRect(0, -18, 270 * pr, 4); ctx.fillRect(0, 14, 270 * pr, 4); ctx.restore();
      }
      if (eai === 'shooter' && e.state === 'tele') { ctx.strokeStyle = 'rgba(255,140,240,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, 22 + Math.max(0, 1 - e.st / .55) * 10, 0, 7); ctx.stroke(); }
    }
    drawFoeTells(ctx, sim, this.time);
    this.hazards(ctx, sim, true);
    this._skTh = SKF.covers(sim.p.skinFx, 'ult') ? SKF.themeOf(sim.p.skinFx.theme) : null; this._skSim = sim;
    this.ultPal = this._skTh ? SKV.ultPal(this._skTh) : null; this.trenchTheme = sim.p.skinFx && trenchStyles.includes(sim.p.skinFx.theme) ? sim.p.skinFx.theme : 'default';
    drawUlts(this, ctx, sim, this.time); drawUltEvents(this, ctx, dt, this.time); SKF.drawSkinFx(this, ctx, dt, this.time); SKV.draw(this, ctx, dt, this.time);
    if (this.leaps) { for (const L of this.leaps) { L.t += dt; const k = Math.min(1, L.t / L.T), x = L.x1 + (L.x2 - L.x1) * k, y = L.y1 + (L.y2 - L.y1) * k - Math.sin(k * Math.PI) * 130; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(sn(L.x1 + (L.x2 - L.x1) * k) - 9, sn(L.y1 + (L.y2 - L.y1) * k) - 3, 18, 6); ctx.fillStyle = '#141013'; ctx.fillRect(sn(x) - 12, sn(y) - 12, 24, 15); ctx.fillStyle = '#5a8a2a'; ctx.fillRect(sn(x) - 9, sn(y) - 12, 18, 9); ctx.fillStyle = '#b8e070'; ctx.fillRect(sn(x) - 6, sn(y) - 12, 6, 3); ctx.fillStyle = '#d0d0b8'; ctx.fillRect(sn(x) - 3, sn(y) - 3, 6, 6); ctx.fillStyle = '#ff3a3a'; ctx.fillRect(sn(x) - 3, sn(y) - 6, 3, 3); ctx.fillRect(sn(x) + 3, sn(y) - 6, 3, 3); } this.leaps = this.leaps.filter(L => L.t < L.T); }
    drawLobs(this, ctx, dt); drawIceSpikes(this, ctx, dt);
    for (const c of this.circles) { c.t -= dt; const k2 = c.t / c.T, cx = c.follow ? p.x : c.x, cy = c.follow ? p.y + 10 : c.y; this.magicCircle(ctx, cx, cy, c.r * (1.15 - k2 * 0.15), c.c, this.time * 3, Math.min(1, k2 * 1.6)); }
    this.circles = this.circles.filter(c => c.t > 0);
    for (const it of sim.pickups || []) { const img = pickupSprite(it.kind, it.stat), bob = Math.sin(this.time * 5 + it.x) > 0 ? -WPP : 0; if (it.life < 3 && Math.floor(this.time * 10) % 2) continue; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(sn(it.x) - 9, sn(it.y) + 9, 18, 3); ctx.drawImage(img, sn(it.x) - 18, sn(it.y) - 24 + (it.z > 0 ? -sn(it.z) : bob), 36, 36); }
    this._skfx = sim.p.skinFx; for (const s of sim.shots) this.shot(ctx, s);
    drawRelics(ctx, sim, this.time);
    for (const f of sim.foes) { if (drawFoeShot(ctx, f, this.time)) continue; if (f.kind === 'javelin') { const a = Math.atan2(f.vy, f.vx), ca = Math.cos(a), sa = Math.sin(a); for (let u = -46; u <= 12; u += WPP) { const w2 = u > 2 ? Math.max(WPP, (12 - u) * 0.7) : u < -40 ? WPP : 6; ctx.fillStyle = '#0a1e3a'; ctx.fillRect(sn(f.x + ca * u) - w2 / 2 - WPP, sn(f.y + sa * u) - w2 / 2 - WPP, w2 + WPP * 2, w2 + WPP * 2); } for (let u = -44; u <= 10; u += WPP) { const w2 = u > 2 ? Math.max(WPP, (12 - u) * 0.6) : 3; ctx.fillStyle = u > -10 ? '#ffffff' : '#bff0ff'; ctx.fillRect(sn(f.x + ca * u) - w2 / 2, sn(f.y + sa * u) - w2 / 2, w2, w2); } continue; } const c = f.c || '#ff7af0'; ctx.fillStyle = 'rgba(8,8,20,.8)'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 3, 0, 7); ctx.fill(); ctx.fillStyle = rgba(c.length === 7 ? c : '#ff7af0', 0.35); ctx.beginPath(); ctx.arc(f.x, f.y, f.r + 5, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(sn(f.x) - 3, sn(f.y) - 3, 6, 6); }
    // nhát chém
    for (const s of this.slashes) {
      s.t -= dt; const pr = 1 - s.t / s.T, full = s.arc >= 6.2;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.globalAlpha = Math.max(0, s.t / s.T) * (s.thin ? 1 : 0.85);
      ctx.fillStyle = s.c;
      const a0 = full ? 0 : -s.arc / 2 * s.dir, a1 = full ? 6.283 * Math.min(1, pr * 1.6) : a0 + s.arc * s.dir * Math.min(1, pr * 1.6), th = s.thin ? 18 : Math.max(22, s.range * 0.32);
      ctx.beginPath(); ctx.arc(0, 0, s.range, Math.min(a0, a1), Math.max(a0, a1)); ctx.arc(0, 0, Math.max(4, s.range - th), Math.max(a0, a1), Math.min(a0, a1), true); ctx.fill();
      if (!s.thin) { ctx.globalAlpha *= 0.6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s.range, Math.min(a0, a1), Math.max(a0, a1)); ctx.arc(0, 0, s.range - 6, Math.max(a0, a1), Math.min(a0, a1), true); ctx.fill(); }
      ctx.restore();
    }
    ctx.globalAlpha = 1; this.slashes = this.slashes.filter(s => s.t > 0);
    for (const b of this.beams) {
      b.t -= dt; const k2 = Math.max(0, b.t / b.T);
      ctx.save(); ctx.globalAlpha = k2; ctx.strokeStyle = rgba(b.c, 0.5); ctx.lineWidth = b.w * (1.4 - k2 * 0.4); ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(3, b.w * 0.3 * k2); ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.restore();
    }
    this.beams = this.beams.filter(b => b.t > 0);
    for (const s of this.spikes) {
      s.t -= dt; const k2 = Math.min(1, (s.T - s.t) / 0.08), fade = Math.min(1, s.t / 0.15);
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(sn(s.x), sn(s.y));
      const sp = s.pal; // skin: gai theo bảng màu skin (vd. cẩm thạch gân vàng) thay cho đá nâu
      for (let i = 0; i < 4; i++) { const ox2 = sn((i - 1.5) * s.r * 0.35), h = sn((s.r * 0.9 + (i % 2) * s.r * 0.4) * k2); ctx.fillStyle = sp ? sp[0] : '#1e1a16'; ctx.beginPath(); ctx.moveTo(ox2 - 9, 6); ctx.lineTo(ox2, 6 - h - 3); ctx.lineTo(ox2 + 9, 6); ctx.fill(); ctx.fillStyle = sp ? (i % 2 ? sp[1] : sp[2]) : i % 2 ? '#a08a66' : '#c0a878'; ctx.beginPath(); ctx.moveTo(ox2 - 6, 3); ctx.lineTo(ox2, 3 - h); ctx.lineTo(ox2 + 6, 3); ctx.fill(); ctx.fillStyle = sp ? sp[3] : rgba(s.c, 0.6); ctx.fillRect(ox2, sn(3 - h * 0.7), 3, sn(h * 0.5)); }
      ctx.restore();
    }
    this.spikes = this.spikes.filter(s => s.t > 0);
    for (const r of this.rings) { r.t -= dt; const pr = 1 - r.t / r.T; ctx.strokeStyle = r.c; ctx.globalAlpha = Math.max(0, r.t / r.T); ctx.lineWidth = Math.max(3, r.w || 4); ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0, r.r + (r.R - r.r) * pr), 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1; this.rings = this.rings.filter(r => r.t > 0);
    if (p.shield > 0) { ctx.strokeStyle = '#e6d29a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(this.time * 8); ctx.beginPath(); ctx.arc(p.x, p.y - 8, 26, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const q of this.parts) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; if (q.g) q.vy += q.g * dt; ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.fillStyle = q.c; const ss = Math.max(WPP, sn(q.s)); ctx.fillRect(sn(q.x - q.s / 2), sn(q.y - q.s / 2), ss, ss); }
    ctx.globalAlpha = 1; this.parts = this.parts.filter(q => q.life > 0).slice(-900);
    for (const q of this.streaks) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.86; q.vy *= 0.86; ctx.globalAlpha = Math.max(0, q.life / q.max); ctx.strokeStyle = q.c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.03, q.y - q.vy * 0.03); ctx.stroke(); }
    ctx.globalAlpha = 1; this.streaks = this.streaks.filter(q => q.life > 0);
    for (const b of this.bolts) { b.t -= dt; const k2 = b.t / b.T; ctx.globalAlpha = Math.min(1, k2 * 2); for (const [w2, c2] of [[7, 'rgba(120,200,255,.55)'], [3, '#ffffff']]) { ctx.strokeStyle = c2; ctx.lineWidth = w2; ctx.beginPath(); b.segs.forEach(([x2, y2], i) => i ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2)); ctx.stroke(); } }
    ctx.globalAlpha = 1; this.bolts = this.bolts.filter(b => b.t > 0);
    for (const q of this.stars) { q.t -= dt; const k2 = q.t / q.T, L = sn(10 + 26 * k2); ctx.fillStyle = '#ffffff'; ctx.fillRect(sn(q.x) - L, sn(q.y) - 3, L * 2, 6); ctx.fillRect(sn(q.x) - 3, sn(q.y) - L, 6, L * 2); ctx.fillStyle = '#ffe27a'; ctx.fillRect(sn(q.x) - 6, sn(q.y) - 6, 12, 12); }
    this.stars = this.stars.filter(q => q.t > 0);
    for (const c of this.claws) { c.t -= dt; const k2 = c.t / c.T; ctx.globalAlpha = Math.min(1, k2 * 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(c.x - 14 + i * 9, c.y - 16 * c.a); ctx.lineTo(c.x + 14 + i * 9, c.y + 16 * c.a); ctx.stroke(); } ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(c.x - 12 + i * 9, c.y - 14 * c.a); ctx.lineTo(c.x + 12 + i * 9, c.y + 14 * c.a); ctx.stroke(); } }
    ctx.globalAlpha = 1; this.claws = this.claws.filter(c => c.t > 0);
    if (this.opts.hitbox) { ctx.lineWidth = 2; ctx.strokeStyle = '#00ff88'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); ctx.strokeStyle = '#ff3a3a'; for (const e of sim.enemies) { ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.stroke(); } ctx.strokeStyle = '#ffd36b'; sim.world.near(this.camX, this.camY, 700, o => { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.stroke(); }); }
    if (sim.blizzard) { // mù trắng: chỉ thấy vùng quanh mình, thỉnh thoảng gió lặng hé rộng ra
      const Bz = sim.blizzard, k = Math.min(1, (Bz.T - Bz.t) / 0.5, Bz.t / 0.5), p2 = sim.p, cyc = this.time % 3.4, lull = cyc < 1.2 ? Math.sin(cyc / 1.2 * Math.PI) : 0;
      const RR = 115 + lull * 160, A0 = k * (1 - lull * 0.35), ring = (r1, r2, a) => { ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(p2.x + r2, p2.y); ctx.arc(p2.x, p2.y, r2, 0, Math.PI * 2); ctx.moveTo(p2.x + r1, p2.y); ctx.arc(p2.x, p2.y, r1, 0, Math.PI * 2, true); ctx.fill('evenodd'); };
      ctx.save(); ctx.fillStyle = '#c5d2dc';
      ctx.globalAlpha = A0; ctx.beginPath(); ctx.rect(p2.x - 4000, p2.y - 4000, 8000, 8000); ctx.moveTo(p2.x + RR + 70, p2.y); ctx.arc(p2.x, p2.y, RR + 70, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.globalAlpha = 1; ctx.fillStyle = '#b4c2ce'; for (let i = 0; i < 90; i++) { const fx2 = p2.x + ((i * 131) % 1600) - 800, fy2 = p2.y + ((i * 89) % 1100) - 550; if (Math.hypot(fx2 - p2.x, fy2 - p2.y) > RR + 70) ctx.fillRect(sn(fx2), sn(fy2), WPP * 4, WPP); } ctx.fillStyle = '#c5d2dc';
      ring(RR + 45, RR + 70, A0); ring(RR + 20, RR + 45, A0 * 0.96); ring(RR, RR + 20, A0 * 0.75);
      ctx.globalAlpha = A0 * 0.5; ctx.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++) { const fx = p2.x + ((i * 97 + this.time * 220) % 1400) - 700, fy = p2.y + ((i * 61 + this.time * 160) % 1000) - 500; if (Math.hypot(fx - p2.x, fy - p2.y) > RR) ctx.fillRect(sn(fx), sn(fy), WPP * (i % 3 ? 1 : 2), WPP * (i % 3 ? 1 : 2)); }
      ctx.restore();
      for (let i = 0; i < 8; i++) { const a = Math.random() * 6.283, d = Math.random() * RR; this.parts.push({ x: p2.x + Math.cos(a) * d, y: p2.y + Math.sin(a) * d - 60, vx: -140, vy: 110, life: 0.6, max: 0.6, c: '#ffffff', s: 3 }); }
      if (p2.bchill > 0) { const w2 = 40, c2 = Math.min(1, p2.bchill / 1.4); ctx.fillStyle = '#0a1420cc'; ctx.fillRect(sn(p2.x - w2 / 2) - 3, sn(p2.y + 22), w2 + 6, 9); ctx.fillStyle = c2 > 0.7 && Math.floor(this.time * 12) % 2 ? '#ffffff' : '#7fd0ff'; ctx.fillRect(sn(p2.x - w2 / 2), sn(p2.y + 22) + 3, sn(w2 * c2), 3); }
    }
    // ---------- phóng to lên màn hình ----------
    const S = this.ctx; S.setTransform(1, 0, 0, 1, 0, 0); S.imageSmoothingEnabled = false; S.globalAlpha = 1;
    S.fillStyle = '#000'; S.fillRect(0, 0, W, H);
    const kk = this._skKick, kf = kk ? Math.sin((1 - kk.t / kk.T) * Math.PI) * (1 - kk.t / kk.T) * z : 0;   // giật màn hình có hướng (rồng đập xuống)
    const sx0 = (ox - (this.camX - vw / 2)) * z + (Math.random() - 0.5) * sh * 1.2 + (kk ? kk.x * kf : 0), sy0 = (oy - (this.camY - vh / 2)) * z + (Math.random() - 0.5) * sh * 1.2 + (kk ? kk.y * kf : 0);
    S.drawImage(this.buf, 0, 0, this.bw, this.bh, Math.round(sx0), Math.round(sy0), this.bw * this.P, this.bh * this.P);
    this.screenTexts(S, sim, dt);
    this.overlay(S, sim, dt);
    this.ms = this.ms * 0.9 + (performance.now() - t0) * 0.1; if (dt > 0) this.fps = this.fps * 0.94 + (1 / dt) * 0.06;
    if (this.opts.fps) { S.font = 'bold 12px monospace'; S.textAlign = 'left'; S.fillStyle = '#000a'; S.fillRect(8, H - 26, 210, 18); S.fillStyle = this.fps > 55 ? '#9dff9d' : this.fps > 40 ? '#ffe27a' : '#ff6a6a'; S.fillText(`FPS ${Math.round(this.fps)} · draw ${this.ms.toFixed(1)}ms · ${this.bw}x${this.bh}`, 12, H - 13); }
  }
  collectLights(sim, L) {
    const p = sim.p;
    L.push({ x: p.x, y: p.y - 10, r: 165, i: 1 });
    for (const s of sim.shots) L.push({ x: s.x, y: s.y, r: s.kind === 'orb' ? 36 : s.kind === 'sbolt' ? 70 + (s.r || 8) * 3 : 50, i: 0.85, c: s.kind === 'orb' ? '#c8b8ff' : ELC(s.el), glow: s.kind === 'orb' ? 0.05 : 0.22 });   // quả cầu pháp sư: ánh sáng nhỏ, không còn quầng tím mềm to
    for (const f of sim.foes) L.push({ x: f.x, y: f.y, r: 46, i: 0.8, c: f.c && f.c.length === 7 ? f.c : '#ff7af0', glow: 0.25 });
    for (const zn of sim.zones) if (zn.kind === 'fire' || zn.kind === 'lava') L.push({ x: zn.x, y: zn.y, r: zn.r * 1.6, i: 0.8, c: '#ff7a3c', glow: 0.2 });
    for (const r of this.rings) L.push({ x: r.x, y: r.y, r: r.R * 1.2 + 30, i: Math.max(0, r.t / r.T), c: r.c && r.c.length === 7 ? r.c : null, glow: 0.18 });
    for (const s of this.slashes) L.push({ x: s.x + Math.cos(s.a) * s.range * 0.5, y: s.y + Math.sin(s.a) * s.range * 0.5, r: s.range * 1.2, i: s.t / s.T, c: s.c, glow: 0.12 });
    for (const b of this.beams) L.push({ x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2, r: Math.hypot(b.x2 - b.x1, b.y2 - b.y1) * 0.6, i: b.t / b.T, c: b.c, glow: 0.2 });
    for (const h of sim.hazards) if (h.kind === 'beam') { for (let k = 0; k < h.n; k++) { const a = h.twin ? h.a + (k - (h.n - 1) / 2) * h.twin : h.a + k * Math.PI * 2 / h.n; L.push({ x: h.x + Math.cos(a) * h.len * 0.6, y: h.y + Math.sin(a) * h.len * 0.6, r: h.len * 0.6, i: h.active ? 0.8 : 0.4, c: h.color, glow: 0.15 }); } } else if (!h.done) L.push({ x: h.x, y: h.y, r: Math.min(400, (h.r || h.len || h.max || 120) * 1.1), i: 0.55, c: h.color || '#ff5a4a', glow: 0.1 });
    for (const q of sim.pending) if (q.tele) L.push({ x: q.tele.x, y: q.tele.y, r: q.tele.r * 1.3, i: 0.6, c: ELC(q.tele.el), glow: 0.12 });
    for (const it of sim.pickups || []) L.push({ x: it.x, y: it.y - 8, r: 50, i: 0.7, c: it.kind === 'energy' ? '#5aa8ff' : it.kind === 'heal' ? '#ff5a5a' : it.kind === 'shard' ? '#c07aff' : it.kind === 'gem' ? '#7fe0ff' : it.kind === 'bshard' ? '#5af0c0' : '#ffd36b', glow: 0.3 });
    for (const e of sim.enemies) { const ed = ENEMIES[e.type]; if (ed && ed.elite) L.push({ x: e.x, y: e.y - 20, r: 120, i: 0.8, c: ed.aura, glow: 0.2 }); }
    const b = sim.boss; if (b && !b.dead) L.push({ x: b.x, y: b.y - b.r * 0.6, r: b.r * 3.2, i: 0.95, c: b.def.accent, glow: 0.14 });
    if (L.length > 60) L.length = 60;
  }
  screenTexts(S, sim, dt) {
    const f = Math.max(0.85, this.P / 3.6), p = sim.p; S.textAlign = 'center';
    for (const q of this.texts) { const [x, y] = this.toScreen(q.x, q.y); S.font = `bold ${Math.round(q.size * f)}px "Pixelify Sans",monospace`; S.lineWidth = 3; S.strokeStyle = '#000a'; S.strokeText(q.s, x, y); S.fillStyle = q.c; S.fillText(q.s, x, y); }
    this.texts.length = 0;
    for (const n of this.nums) { n.t -= dt; const pr = 1 - n.t / n.T, [x, y] = this.toScreen(n.x, n.y - pr * 26); S.globalAlpha = Math.max(0, Math.min(1, n.t / (n.T * 0.4))); S.font = `bold ${Math.round((n.big ? 18 : 13) * f)}px "Pixelify Sans",monospace`; S.lineWidth = 3; S.strokeStyle = '#000a'; S.strokeText(n.s, x, y); S.fillStyle = n.c || '#fff'; S.fillText(n.s, x, y); }
    S.globalAlpha = 1; this.nums = this.nums.filter(n => n.t > 0);
    if (this.castText) { const c = this.castText; c.t -= dt; const pr = 1 - c.t / c.T, [x, y] = this.toScreen(p.x, p.y - 58 - pr * 14); S.globalAlpha = Math.max(0, Math.min(1, c.t / (c.T * 0.4))); S.font = `bold ${Math.round(18 * f)}px "Pixelify Sans",monospace`; S.lineWidth = 4; S.strokeStyle = '#000a'; const label = c.s + (c.first ? '  NEW!' : ''); S.strokeText(label, x, y); S.fillStyle = c.c; S.fillText(label, x, y); S.globalAlpha = 1; if (c.t <= 0) this.castText = null; }
  }
  drawGround(ctx, sim, view, tk, T) {
    const S = CHUNK * TILE, out = [];
    const c0x = Math.floor(view.ox / S), c1x = Math.floor((view.ox + view.w) / S), c0y = Math.floor(view.oy / S), c1y = Math.floor((view.oy + view.h) / S); this.lavaPts = [];
    for (let cy = c0y; cy <= c1y; cy++) for (let cx = c0x; cx <= c1x; cx++) {
      const c = this.groundC.get(cx, cy, sim.world.seed, tk, T); ctx.drawImage(c.img, c.x, c.y, S, S);
      if (c.lava) for (const q of c.lava) if (q[0] > view.ox - 30 && q[0] < view.ox + view.w + 30 && q[1] > view.oy - 30 && q[1] < view.oy + view.h + 30) this.lavaPts.push(q);
      for (const tu of c.tufts) if (tu.x > view.ox - 30 && tu.x < view.ox + view.w + 30 && tu.y > view.oy - 10 && tu.y < view.oy + view.h + 40) out.push(tu);
    }
    return out;
  }
  // cỏ lay theo gió và rạp sang hai bên khi có người đi qua
  tuft(ctx, tu, sim, tk, T) {
    let sway = Math.sin(this.time * 1.7 + tu.ph + tu.x * 0.01) * 1.1;
    const push = e => { const d = Math.hypot(tu.x - e.x, tu.y - e.y); if (d < 42) sway += Math.sign(tu.x - e.x || 1) * (1 - d / 42) * 4; };
    push(sim.p); for (const e of sim.enemies) if (Math.abs(e.x - tu.x) < 60 && Math.abs(e.y - tu.y) < 60) push(e);
    const lean = Math.max(-3, Math.min(3, Math.round(sway))), img = this.props.tuft(tk, T, tu.s, tu.c, lean);
    ctx.drawImage(img, sn(tu.x) - 7 * WPP, sn(tu.y) - 8 * WPP, img.width * WPP, img.height * WPP);
  }

  overlay(ctx, sim, dt) {
    const W = this.W, H = this.H, p = sim.p;
    for (const e of sim.enemies) {
      const [sx, sy] = this.toScreen(e.x, e.y); if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
      const a = Math.atan2(sy - H / 2, sx - W / 2), ex = W / 2 + Math.cos(a) * (W / 2 - 18), ey = H / 2 + Math.sin(a) * (H / 2 - 18);
      ctx.fillStyle = e.boss ? e.def.color : (ENEMIES[e.type] || {}).color || '#fff'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(Math.max(12, Math.min(W - 12, ex)), Math.max(12, Math.min(H - 12, ey)), e.boss ? 10 : 4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.forgeOverlay(ctx, sim, W, H);
    this.gateOverlay(ctx, sim, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, sim.boss ? 'rgba(20,0,0,.45)' : 'rgba(0,0,0,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    SKV.screen(this, ctx, sim, dt, W, H);
    if (sim.timeScale && sim.timeScale < 1 && !this._skSlowmo) { ctx.fillStyle = 'rgba(80,140,255,.12)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(160,200,255,.35)'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, W, H); }
    if (this.flashW > 0) { this.flashW -= dt; ctx.fillStyle = `rgba(255,250,235,${Math.max(0, this.flashW) * 2})`; ctx.fillRect(0, 0, W, H); }
    {   // màn tối dạng pixel khi dọn stage / bước qua cổng, giữ tối suốt màn thưởng, sáng dần khi vào stage mới
      let dk = 0;
      if (sim.clearT > 0) dk = Math.max(0, Math.min(1, (0.6 - sim.clearT) / 0.6));
      if (sim.travel > 0) dk = Math.max(dk, Math.min(1, 1 - sim.travel / 0.7));
      if (dk > 0.9) this.fadeHold = true;
      if (sim.state === 'reward' && this.fadeHold) dk = 1;
      if (this.fadeIn > 0) { this.fadeIn -= dt; dk = Math.max(dk, this.fadeIn / 0.7); }
      if (dk > 0) this.pixFade(ctx, W, H, dk);
    }
    if (this.flash > 0) { this.flash -= dt; ctx.fillStyle = `rgba(255,40,40,${this.flash * 1.6})`; ctx.fillRect(0, 0, W, H); }
    const low = p.hp / p.max; if (low < 0.3) { ctx.fillStyle = `rgba(160,0,0,${(0.3 - low) * (0.6 + 0.4 * Math.sin(this.time * 6))})`; ctx.fillRect(0, 0, W, H); }
    if (this.banner) {
      const b = this.banner; b.t -= dt; const k = Math.min(1, b.t / 0.4, (b.T - b.t) / 0.3);
      ctx.globalAlpha = Math.max(0, k); ctx.textAlign = 'center';
      if (b.boss) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H * 0.3 - 60, W, 110); }
      const by = b.top ? Math.max(70, H * 0.11) : b.mini ? H * 0.17 : H * 0.3;   // banner sau boss nằm sát mép trên, không che cổng
      ctx.font = `800 ${b.mini ? 22 : b.small ? 30 : b.boss ? 46 : 40}px "Pixelify Sans",monospace`; ctx.lineWidth = 6; ctx.strokeStyle = '#000c'; ctx.strokeText(b.s, W / 2, by); ctx.fillStyle = b.c; ctx.fillText(b.s, W / 2, by);
      if (b.sub) { ctx.font = `italic ${b.mini ? 14 : 18}px "Pixelify Sans",monospace`; ctx.strokeText(b.sub, W / 2, by + (b.mini ? 22 : 32)); ctx.fillStyle = '#e8dcc0'; ctx.fillText(b.sub, W / 2, by + (b.mini ? 22 : 32)); }
      ctx.globalAlpha = 1; if (b.t <= 0) this.banner = null;
    }
  }

  // nhà thợ rèn: sân trước đất + đá cuội tan dần vào nền, hố than, đống củi/thùng quặng, 2 dấu hiệu vùng an toàn cạnh đe, nhà, thợ rèn gõ búa
  forgeWorld(ctx, sim, list, lights) {
    const F = sim.forge, C = FORGE_PAL[F.theme] || FORGE_PAL.forest, t = this.time, inside = sim.inForge;
    this.forgeCache = this.forgeCache || new Map();
    const key = F.theme; let A = this.forgeCache.get(key);
    if (!A) { const rune = F.theme === 'dungeon' || F.theme === 'volcano'; A = { house: forgeHouse(F.theme), smith: Object.fromEntries(SMITH_POSES.map(k => [k, smithSprite(F.theme, k)])), counter: forgeCounter(F.theme), mark: rune ? runeStone(F.theme) : forgeLantern(F.theme), stock: forgeStock(F.theme), apron: forgeApron(F.theme) }; this.forgeCache.set(key, A); }
    const Ap = A.apron, ax0 = F.x, ay0 = F.y - 10; ctx.drawImage(Ap.img, sn(ax0 - Ap.ax * WPP), sn(ay0 - Ap.ay * WPP), Ap.img.width * WPP, Ap.img.height * WPP);
    const px0 = ax0 + Ap.pit[0] * WPP, py0 = ay0 + Ap.pit[1] * WPP; lights.push({ x: px0, y: py0, r: 90, i: 0.85 + Math.sin(t * 6) * 0.1, c: '#ff6a1a', glow: 0.2 });
    if (Math.random() < 0.15) this.parts.push({ x: px0 + (Math.random() - 0.5) * 20, y: py0 - 6, vx: (Math.random() - 0.5) * 10, vy: -50, life: 0.6, max: 0.6, c: Math.random() < 0.5 ? '#ffd36b' : '#ff6a1a', s: 3 });
    const sprite = (S, x, y, shadow) => list.push({ y, f: () => { if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(sn(x - shadow / 2), sn(y - 4), shadow, 7); } ctx.drawImage(S.img, sn(x - S.ax * WPP), sn(y - S.ay * WPP), S.img.width * WPP, S.img.height * WPP); } });
    // 2 dấu hiệu vùng an toàn cạnh đe (đèn lồng hoặc đá phù văn)
    for (const [mx, my] of [[F.x - 96, F.y + 26], [F.x + 136, F.y + 22]]) { sprite(A.mark, mx, my, 18); lights.push({ x: mx, y: my - (A.mark.img.height > 18 ? 54 : 24), r: inside ? 120 : 85, i: (inside ? 0.95 : 0.7) + Math.sin(t * 5 + mx) * 0.05, c: C.lamp, glow: inside ? 0.22 : 0.12 }); }
    sprite(A.stock, F.x - 110, F.y - 46, 40);
    const H = A.house, hx = F.x, hy = F.y - 50;
    list.push({ y: hy, f: () => { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(sn(hx - 99), sn(hy - 9), 198, 12); ctx.drawImage(H.img, sn(hx - H.ax * WPP), sn(hy - H.ay * WPP), H.img.width * WPP, H.img.height * WPP); } });
    // người bán đứng sau quầy: thở nhẹ; vẫy tay khi bạn lại gần; thỉnh thoảng giơ viên ngọc lên ngắm
    const sx = F.x + 55, sy = F.y - 8, near = Math.hypot(sim.p.x - sx, sim.p.y - sy) < 230;
    const pose = near ? (Math.floor(t * 3.5) % 2 ? 'wave1' : 'wave0') : (t % 8 > 6 ? (Math.floor(t * 4) % 2 ? 'gem1' : 'gem0') : (Math.floor(t * 1.6) % 2 ? 'idle1' : 'idle0'));
    const S = A.smith[pose];
    list.push({ y: sy, f: () => { ctx.drawImage(S.img, sn(sx - S.ax * WPP), sn(sy - S.ay * WPP), S.img.width * WPP, S.img.height * WPP); if (inside) this.wtext(sx, sy - 90, '[T] Trade', C.trim, 12); } });
    if (pose.startsWith('gem')) lights.push({ x: sx + 6, y: sy - 45, r: 50, i: 0.8, c: '#5af0ff', glow: 0.25 });
    const Q = A.counter, qx = F.x + 55, qy = F.y + 12;
    list.push({ y: qy, f: () => { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(sn(qx - 54), sn(qy - 3), 108, 6); ctx.drawImage(Q.img, sn(qx - Q.ax * WPP), sn(qy - Q.ay * WPP), Q.img.width * WPP, Q.img.height * WPP); } });
    const chim = { forest: [hx + 45, hy - 150], frost: [hx + 3, hy - 138], volcano: [hx + 3, hy - 150], dungeon: null, palace: null }[F.theme];
    if (chim && Math.random() < 0.14) this.parts.push({ x: chim[0] + (Math.random() - 0.5) * 10, y: chim[1], vx: (Math.random() - 0.3) * 20, vy: -40 - Math.random() * 20, life: 1.6, max: 1.6, c: F.theme === 'volcano' ? '#4a3a3a' : '#9a9aa8', s: 9 });
    if (F.theme === 'palace' && Math.random() < 0.08) for (const x of [hx - 50, hx + 46]) this.parts.push({ x, y: hy - 66, vx: (Math.random() - 0.5) * 10, vy: -20, life: 1.4, max: 1.4, c: '#e8dcc0', s: 6 });
    lights.push({ x: hx, y: hy - 20, r: 160, i: 0.95 + Math.sin(t * 7) * 0.06, c: C.glow, glow: 0.25 });
    if (F.theme === 'dungeon') for (const x of [hx - 74, hx + 76]) lights.push({ x, y: hy - 75, r: 150, i: 0.85, c: x < hx ? '#c07aff' : '#5af0ff', glow: 0.2 });
    if (F.theme === 'frost') lights.push({ x: hx + 84, y: hy - 33, r: 120, i: 0.9 + Math.sin(t * 9) * 0.08, c: '#5ab8ff', glow: 0.25 });
  }
  // cổng sang biome kế: dựng lên cùng vành đấu trường, mở ra khi boss gục
  gateK(G) { return G.state === 'sealed' ? 0 : G.state === 'open' ? 1 : Math.min(1, G.t / 1.6); }
  gateWorld(ctx, sim, list, lights) {
    const G = sim.portal, k = this.gateK(G), f = Math.floor(this.time * 8) % 6, L = gateLayers(G.theme, k, f);
    const x0 = sn(G.x - (GATE.AX + 1) * WPP), y0 = sn(G.y - (GATE.AY + 1) * WPP), w = L.floor.width * WPP, h = L.floor.height * WPP;
    list.push({ y: G.y - 3000, f: () => { if (L.path) ctx.drawImage(L.path, x0, y0, w, h); ctx.drawImage(L.floor, x0, y0, w, h);   // lớp nền phẳng: dưới mọi thứ
      if (k > 0.6) { const pulse = (Math.sin(this.time * 4) + 1) / 2; ctx.fillStyle = (GATE_INFO[G.theme] || GATE_INFO.dungeon).c; ctx.globalAlpha = 0.3 + 0.35 * pulse; ctx.fillRect(sn(G.x - 30), sn(G.y + 6), 60, WPP); ctx.globalAlpha = 1; } } });   // vạch ngưỡng cửa
    if (L.props) list.push({ y: G.y, f: () => ctx.drawImage(L.props, x0, y0, w, h) });
    if (k > 0.6) { const p = sim.p; if (Math.hypot(p.x - G.x, p.y - G.y) < 320) { const I = GATE_INFO[G.theme] || GATE_INFO.dungeon; this.wtext(G.x, G.y + 40, 'WALK IN TO ' + I.verb, I.c, 13); } }
    if (k > 0) for (const Lt of GATE_LIGHTS[G.theme] || []) lights.push({ x: G.x + (Lt.x - GATE.AX) * WPP, y: G.y + (Lt.y - GATE.AY) * WPP, r: Lt.r * (0.4 + 0.6 * k), i: 0.85 + Math.sin(this.time * 7 + Lt.x) * 0.08, c: Lt.c, glow: 0.22 * k });
  }
  gateOverlay(ctx, sim, W, H) {
    const G = sim.portal; if (!G || G.state === 'sealed' || sim.travel > 0) return;
    const [sx, sy] = this.toScreen(G.x, G.y - 60); if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) return;
    const a = Math.atan2(sy - H / 2, sx - W / 2), ex = Math.max(34, Math.min(W - 34, W / 2 + Math.cos(a) * (W / 2 - 34))), ey = Math.max(34, Math.min(H - 34, H / 2 + Math.sin(a) * (H / 2 - 34))), I = GATE_INFO[G.theme] || GATE_INFO.dungeon, bob = Math.sin(this.time * 5) * 3;
    ctx.save(); ctx.translate(ex + Math.cos(a) * bob, ey + Math.sin(a) * bob); ctx.rotate(a); ctx.fillStyle = '#09080f'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = I.c; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-2, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.font = 'bold 12px "Pixelify Sans",monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000c'; ctx.strokeText('GATE', ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4); ctx.fillStyle = I.c; ctx.fillText('GATE', ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4);
  }
  // màn tối pixel: ô 12px theo ma trận Bayer 4x4, phủ dần theo dk
  pixFade(ctx, W, H, dk) {
    const lv = Math.max(1, Math.min(16, Math.ceil(dk * 16))); this._fadePat = this._fadePat || [];
    if (!this._fadePat[lv]) { const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], S = 12, c = canvas(S * 4, S * 4), g = c.getContext('2d'); g.fillStyle = '#09080f'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (B[j * 4 + i] < lv) g.fillRect(i * S, j * S, S, S); this._fadePat[lv] = ctx.createPattern(c, 'repeat'); }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = this._fadePat[lv]; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  }
  forgeOverlay(ctx, sim, W, H) {
    const F = sim.forge;
    if (F) { const [sx, sy] = this.toScreen(F.x, F.y - 40); if (sx < 30 || sx > W - 30 || sy < 30 || sy > H - 30) { const a = Math.atan2(sy - H / 2, sx - W / 2), ex = Math.max(34, Math.min(W - 34, W / 2 + Math.cos(a) * (W / 2 - 34))), ey = Math.max(34, Math.min(H - 34, H / 2 + Math.sin(a) * (H / 2 - 34))), C = FORGE_PAL[F.theme] || FORGE_PAL.forest, bob = Math.sin(this.time * 5) * 3;
      ctx.save(); ctx.translate(ex + Math.cos(a) * bob, ey + Math.sin(a) * bob); ctx.rotate(a); ctx.fillStyle = '#0c0a12'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.fillStyle = C.trim; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -8); ctx.lineTo(-2, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.font = 'bold 12px "Pixelify Sans",monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000c'; ctx.strokeText('FORGE', ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4); ctx.fillStyle = C.trim; ctx.fillText('FORGE', ex - Math.cos(a) * 26, ey - Math.sin(a) * 26 + 4); } }
    const p = sim.p;
    if (p.stealthT > 0 && sim.hidePt) { const [qx, qy] = this.toScreen(sim.hidePt.x, sim.hidePt.y - 30); ctx.font = 'bold 22px "Pixelify Sans",monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000a'; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(this.time * 6); ctx.strokeText('?', qx, qy); ctx.fillStyle = '#c8c8d8'; ctx.fillText('?', qx, qy); ctx.globalAlpha = 1; }
  }
  // đồng hồ cát pixel trên đầu khi hoá vàng: cát chảy theo thời gian
  hourglass(ctx, x, y, k) {
    const X = sn(x), Y = sn(y), u = WPP;
    ctx.fillStyle = '#0c0a12'; ctx.fillRect(X - 5 * u, Y - 7 * u, 10 * u, 14 * u);
    ctx.fillStyle = '#c88a1a'; ctx.fillRect(X - 4 * u, Y - 6 * u, 8 * u, u); ctx.fillRect(X - 4 * u, Y + 5 * u, 8 * u, u);
    ctx.fillStyle = '#e8f4ff'; for (let j = 0; j < 4; j++) { const w = 3 - j; ctx.fillRect(X - (w + 0.5) * u, Y - (5 - j) * u, (2 * w + 1) * u, u); ctx.fillRect(X - (w + 0.5) * u, Y + (4 - j) * u, (2 * w + 1) * u, u); }
    ctx.fillStyle = '#ffd34a'; const top = Math.round((1 - k) * 4), bot = Math.round(k * 4);
    for (let j = 0; j < top; j++) { const w = 3 - (4 - top + j); if (w >= 0) ctx.fillRect(X - (w + 0.5) * u, Y - (top - j) * u, (2 * w + 1) * u, u); }
    for (let j = 0; j < bot; j++) { const w = 3 - j; ctx.fillRect(X - (w + 0.5) * u, Y + (4 - j) * u, (2 * w + 1) * u, u); }
    if (Math.floor(this.time * 10) % 2) { ctx.fillRect(X - u / 2, Y - u, u, 2 * u); }
  }
  arena(ctx, sim) {
    const A = sim.arena, c = sim.boss ? sim.boss.def.accent : '#ffd36b', t = this.time;
    ctx.save(); ctx.strokeStyle = rgba(c, 0.08); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(A.x, A.y, A.r, 0, 7); ctx.stroke();
    ctx.fillStyle = rgba(c, 0.8);
    for (let i = 0; i < 48; i++) { const a = i * Math.PI * 2 / 48 + t * 0.15, x = A.x + Math.cos(a) * A.r, y = A.y + Math.sin(a) * A.r; ctx.globalAlpha = 0.15 + 0.15 * Math.sin(t * 3 + i); ctx.fillRect(x - 3, y - 3, 6, 6); }
    ctx.restore();
  }
  under(ctx, sim, post) {
    const t = this.time;
    if (!post) for (const z of sim.zones) {
      const k = Math.max(0, Math.min(1, z.life / 0.4, (z.T - z.life) / 0.15 + 0.2));
      ctx.save(); ctx.globalAlpha = k;
      if (z.kind === 'swamp') { ctx.fillStyle = 'rgba(74,92,40,.7)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); ctx.fillStyle = '#5a7a30'; for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 0.4, r = z.r * (0.2 + (i % 4) * 0.2); ctx.fillRect(z.x + Math.cos(a) * r - 3, z.y + Math.sin(a) * r - 2, 6, 4); } ctx.strokeStyle = '#9ac060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); }
      else if (z.kind === 'steam' || z.kind === 'storm') { for (let i = 0; i < 12; i++) { const a = i * 0.52 + t * (z.kind === 'storm' ? 2.2 : 0.4), r = z.r * (0.25 + (i % 4) * 0.2); ctx.fillStyle = 'rgba(236,244,248,.42)'; ctx.beginPath(); ctx.arc(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, 18 + (i % 3) * 6, 0, 7); ctx.fill(); } if (z.kind === 'storm') { ctx.strokeStyle = 'rgba(200,255,240,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.5 + i * 0.25), t * 4 + i, t * 4 + i + 2); ctx.stroke(); } } }
      else if (z.kind === 'fire' || z.kind === 'lava') { const f = 0.6 + 0.4 * Math.sin(t * 14 + z.x); ctx.fillStyle = z.kind === 'lava' ? 'rgba(80,20,10,.8)' : 'rgba(255,90,30,.35)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); for (let i = 0; i < (z.kind === 'lava' ? 8 : 3); i++) { const a = i * 2.1 + z.x, r = z.r * 0.6 * ((i % 3) / 3), h = 8 + f * 8; ctx.fillStyle = i % 2 ? '#ffd36b' : '#ff6a2a'; ctx.fillRect(z.x + Math.cos(a) * r - 3, z.y + Math.sin(a) * r - h, 6, h); } }
      else if (z.kind === 'barrier' && SKV.persist(sim, 'barrier', ctx, z.follow ? { ...z, x: sim.p.x, y: sim.p.y } : z, t)) { /* skin HEROES vẽ thay */ }
      else if (z.kind === 'barrier') { const zx = z.follow ? sim.p.x : z.x, zy = z.follow ? sim.p.y : z.y; ctx.strokeStyle = 'rgba(20,40,90,.6)'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(zx, zy, z.r, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(110,190,255,.75)'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = 'rgba(90,170,255,.12)'; ctx.fill(); ctx.fillStyle = '#d8f0ff'; for (let i = 0; i < 14; i++) { const a = i * 0.449 + t * 2.6; ctx.fillRect(sn(zx + Math.cos(a) * z.r) - 3, sn(zy + Math.sin(a) * z.r) - 3, 6, 6); } }
      else if (z.kind === 'spin') { const c = ELC(z.sk.els[z.sk.els.length - 1]); ctx.strokeStyle = c; ctx.lineWidth = 6; for (let i = 0; i < 3; i++) { ctx.globalAlpha = k * (0.6 - i * 0.15); ctx.beginPath(); ctx.arc(z.x, z.y, z.r * (0.6 + i * 0.2), t * 12 + i * 2, t * 12 + i * 2 + 2.2); ctx.stroke(); } }
      else if (z.kind === 'cover' || z.kind === 'ward') { const c = z.kind === 'cover' ? '#e6d29a' : '#9ae0ff'; ctx.strokeStyle = rgba(c, 0.45 * k); ctx.lineWidth = 3; ctx.setLineDash([9, 9]); ctx.lineDashOffset = -t * 30; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = rgba(c, 0.06 * k); ctx.fill(); }
      else if (z.kind === 'well') { ctx.fillStyle = 'rgba(40,30,20,.45)'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); ctx.strokeStyle = '#c8b08a'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const rr = z.r * (1 - ((t * 0.8 + i * 0.25) % 1)); ctx.beginPath(); ctx.arc(z.x, z.y, rr, 0, 7); ctx.stroke(); } }
      ctx.restore();
    }
    if (post) for (const tr of sim.traps) {
      if (SKV.persist(sim, 'trap', ctx, tr, t)) continue;
      const c = ELC(tr.el), armed = tr.arm <= 0;
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.globalAlpha = armed ? 0.55 + 0.25 * Math.sin(t * 5) : 0.3; ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1; ctx.fillStyle = '#1a1a22'; ctx.fillRect(tr.x - 9, tr.y - 9, 18, 18); ctx.fillStyle = c; ctx.fillRect(tr.x - 6, tr.y - 6, 12, 12); ctx.fillStyle = '#fff'; ctx.fillRect(tr.x - 2, tr.y - 2, 4, 4); ctx.restore();
    }
    if (post) for (const q of sim.pending) if (q.tele) {
      const T = q.tele, pr = 1 - q.t / q.T, c = ELC(T.el);
      if (SKV.persist(sim, 'tele', ctx, T, t, pr)) continue;
      ctx.fillStyle = rgba(c, 0.1 + pr * 0.22); ctx.beginPath(); ctx.arc(T.x, T.y, T.r, 0, 7); ctx.fill();
      ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(T.x, T.y, T.r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(T.x, T.y, Math.max(0, T.r * pr), 0, 7); ctx.stroke();
      if (T.fall) { const h = (1 - pr) * 280; if (T.r > 60) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(T.x + h * 0.4, T.y - h, 10 + pr * 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(T.x + h * 0.4, T.y - h, 5, 0, 7); ctx.fill(); } else { ctx.strokeStyle = '#f0e8d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(T.x + h * 0.2, T.y - h); ctx.lineTo(T.x + h * 0.2 - 4, T.y - h + 16); ctx.stroke(); } }
    }
    if (!post) for (const w of sim.walls) {
      ctx.save(); ctx.globalAlpha = Math.min(1, w.life / 0.5); ctx.lineCap = 'round';
      if (w.stone) { ctx.strokeStyle = '#3a3026'; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); ctx.strokeStyle = '#a08a66'; ctx.lineWidth = 12; ctx.stroke(); }
      else { ctx.strokeStyle = 'rgba(210,255,240,.85)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke(); }
      ctx.restore();
    }
  }
  // vòng cảnh báo đòn boss. top=false: phần nền; top=true: sóng đang lan và tia sáng
  hazards(ctx, sim, top) {
    const t = this.time;
    for (const h of sim.hazards) {
      const c = h.color || '#ff5a4a';
      if (h.kind === 'shadowblast') { if (!top) BVX.shadowblast(this, ctx, h, sim, t); continue; }
      if (h.kind === 'beam') { if (!top || !h.owner) continue; BVX.beam(this, ctx, h, t); continue; }
      if (h.kind === 'vortex') { if (top) continue; BVX.vortex(this, ctx, h, t); continue; }
      if (h.active) { if (!top) continue; BVX.shockwave(this, ctx, h, t); continue; }
      if (h.done) { if (!top || h.visual) continue; BVX.impact(this, ctx, h, t); continue; }
      if (top) continue;
      const span = Math.max(0.01, h.T - h.hold), pr = Math.min(1, (h.T - h.t) / span), holding = h.t < h.hold;
      ctx.save();
      if (h.kind === 'ring') { const b = h.owner, R0 = h.shockPre ? h.rr : (b ? b.r : h.rr) + 10, rc = BVX.styleOf(h).band[2]; this.pixRing(ctx, h.x, h.y, R0 + pr * 24, 9, '#0c0810', null, 0.6); this.pixRing(ctx, h.x, h.y, R0 + pr * 24, 6, h.t < 0.15 ? '#ffffff' : rc, null, h.t < 0.15 ? 1 : 0.55 + 0.4 * Math.sin(t * 20)); this.pixRing(ctx, h.x, h.y, h.max, 3, rc, null, 0.35 + 0.25 * pr, 4); ctx.restore(); continue; }
      BVX.telegraph(ctx, h, t); holeEye(ctx, h, t); if (h.reticle) reticle(ctx, h, t);
      ctx.restore();
    }
  }
  shape(ctx, h, k) {
    ctx.beginPath();
    if (h.kind === 'circle') ctx.arc(h.x, h.y, Math.max(0, h.r * k), 0, 7);
    else if (h.kind === 'arc') { ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, Math.max(0, h.r * k), h.a - h.arc / 2, h.a + h.arc / 2); ctx.closePath(); }
    else if (h.kind === 'rect' || h.kind === 'line') {
      const ca = Math.cos(h.a), sa = Math.sin(h.a), w = h.width * (h.kind === 'line' ? 1 : k) / 2, L = h.kind === 'line' ? h.len * k : h.len, x0 = h.kind === 'line' ? 0 : -L / 2;
      const P = (u, v) => [h.x + ca * u - sa * v, h.y + sa * u + ca * v];
      const pts = [P(x0, -w), P(x0 + L, -w), P(x0 + L, w), P(x0, w)];
      ctx.moveTo(...pts[0]); for (const q of pts.slice(1)) ctx.lineTo(...q); ctx.closePath();
    }
  }
  obstacle(ctx, o, spr) {
    const s = spr || this.props.get(this.tk, this.T, o); let x = sn(o.x); const y = sn(o.y), hit = o.hit > 0;
    if (hit) { o.hit -= this.dtNow || 0.016; x += (Math.random() < 0.5 ? -1 : 1) * WPP; }
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y, Math.max(9, o.r * 1.05), Math.max(4, o.r * 0.4), 0, 0, 7); ctx.fill();
    const w = s.img.width * WPP, h = s.img.height * WPP, X = x - s.ax * WPP, Y = y - s.ay * WPP;
    let ky = 1; if (o.sink > 0) ky = Math.max(0, o.sink / (o.sinkT || 0.8)); else if (o.rise) { const el = o.riseDelay !== undefined ? (o.age || 0) - o.riseDelay : o.T - o.life, k = Math.max(0, Math.min(1, el / o.rise)); ky = 1 - Math.pow(1 - k, 3); if (k <= 0) return; if (!o.dusted) { if (o.arena && !o.supply && Math.random() < 0.5) this.addShake(1.5); o.dusted = true; this.puff(o.x, o.y, 4, 26, (this.T && this.T.dust) || '#9a8466'); for (let i = 0; i < 4; i++) this.parts.push({ x: o.x + (Math.random() - 0.5) * o.r, y: o.y, vx: (Math.random() - 0.5) * 150, vy: -90 - Math.random() * 90, life: 0.45, max: 0.45, c: i % 2 ? '#7a644a' : '#a8906e', s: 4 }); } }
    ctx.drawImage(s.img, X, y - s.ay * WPP * ky, w, h * ky);
    if (hit) { ctx.globalAlpha = 0.6; ctx.drawImage(s.white, X, Y, w, h); ctx.globalAlpha = 1; }
    if (o.temp && o.life < 1) { ctx.globalAlpha = 0.5; ctx.drawImage(s.white, X, Y, w, h); ctx.globalAlpha = 1; }
    if (o.hp < o.max * 0.5) { ctx.fillStyle = 'rgba(12,10,16,.75)'; const cy = sn(Y + h * 0.55); for (let i = 0; i < 4; i++) ctx.fillRect(x + (i % 2 ? 0 : -WPP) + (i > 1 ? WPP : 0), cy + i * WPP, WPP, WPP); }
    if (o.fuse > 0) { const k2 = 1 - o.fuse / (o.fuseT || 2.2), fast = Math.floor(this.time * (6 + k2 * 18)) % 2; ctx.save(); ctx.setLineDash([9, 6]); ctx.strokeStyle = 'rgba(255,60,40,' + (0.45 + k2 * 0.5) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, 120, 0, 7); ctx.stroke(); ctx.restore(); if (fast) { ctx.globalAlpha = 0.7; ctx.drawImage(s.white, X, Y, w, h); ctx.globalAlpha = 1; } ctx.fillStyle = '#ffd36b'; ctx.fillRect(x - 3 + (Math.random() - 0.5) * 6, Y - 3 - Math.random() * 9, 6, 6); this.wtext(o.x, o.y - o.r - 30, Math.max(0, o.fuse).toFixed(1), '#ff7a5a', 12); }
    if (o.burning > 0) { for (let i = -2; i <= 2; i++) { const hh = 3 + Math.round((Math.sin(this.time * 15 + i * 1.7 + o.x) + 1) * 2) - Math.abs(i); const fx = x + i * WPP * 2, fy = sn(Y + h * 0.35); ctx.fillStyle = '#ff5a1a'; ctx.fillRect(fx, fy - hh * WPP, WPP * 2, hh * WPP); ctx.fillStyle = '#ffd36b'; ctx.fillRect(fx, fy - (hh - 1) * WPP, WPP, Math.max(0, hh - 2) * WPP); } if (Math.random() < 0.3) this.parts.push({ x: x + (Math.random() - 0.5) * o.r, y: Y + h * 0.2, vx: (Math.random() - 0.5) * 20, vy: -50, life: 0.9, max: 0.9, c: '#3a3236', s: 6 }); }
    if (s.flame) { const fy = y + s.flame.dy * WPP; for (let i = -1; i <= 1; i++) { const hh = 2 + Math.round((Math.sin(this.time * 17 + i * 2.3 + o.x) + 1) * 1.3) - Math.abs(i); ctx.fillStyle = '#ff6a2a'; ctx.fillRect(x + i * WPP, fy - hh * WPP, WPP, hh * WPP); if (hh > 2) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(x + i * WPP, fy - (hh - 1) * WPP, WPP, (hh - 2) * WPP); } } }
  }
  player(ctx, sim) {
    const p = sim.p, moving = Math.hypot(p.vx, p.vy) > 30, t = this.time, z = p.z || 0;
    if (p.swing > this.lastSwing + 1e-6) this.swT = p.swing; this.lastSwing = p.swing;
    // khổng lồ hoá: phóng to quanh CHÂN (không phải quanh tâm) và bóng phóng theo, nên bóng luôn nằm dưới chân
    const gs = p.giant > 0 ? 1 + 0.6 * Math.min(1, (6 - p.giant) / 0.25, p.giant / 0.25) : 1;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sn(p.x), sn(p.y + 10), 13 * gs * (1 - Math.min(0.4, z / 120)), 5 * gs * (1 - Math.min(0.4, z / 120)), 0, 0, 7); ctx.fill();
    // bụi chân + tiếng bước khi chạy
    if (moving && !(p.dashT > 0) && !(z > 0)) { this.stepT -= this.dtNow || 0.016; if (this.stepT <= 0) { this.stepT = 0.17; this.parts.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y + 10, vx: -p.vx * 0.12 + (Math.random() - 0.5) * 20, vy: -8 - Math.random() * 14, life: 0.45, max: 0.45, c: (this.T && this.T.dust) || '#a89470', s: 3 }); if (this.onStep) this.onStep(this.tk); } }
    const dashing = p.dashT > 0 || p.sdashT > 0, dx = p.sdash ? p.sdash.dx : p.dashX, dy = p.sdash ? p.sdash.dy : p.dashY, dtn = this.dtNow || 0.016;
    // skin: đi/lướt (Epic trở lên) và đòn thường/tụ lực có hook riêng
    const skm = SKF.covers(p.skinFx, 'move') ? SKF.themeOf(p.skinFx.theme) : null, skb = SKF.covers(p.skinFx, 'basic') ? SKF.themeOf(p.skinFx.theme) : null;
    if (skm) SKV.walk(this, ctx, p, skm, t, dtn, moving, dashing, p.skinFx.tier === 'heroes' || p.skinFx.tier === 'boss');
    if (p.cls === 'MAGE' && p.charge > 0.08) this.magicCircle(ctx, p.x, p.y + 10, 24 + 20 * p.charge, skb ? skb.pal[2] : '#9b8cff', t * 2.5, 0.4 + p.charge * 0.5);
    const pose = heroPose(p, t, moving); if (p.skin && lookAnim(p.cls, p.skin)) pose.af = Math.floor(t / 0.14) % 4;
    const fr = this.rig.frame('h', p.cls + (p.skin ? ':' + p.skin : ''), pose), W = fr.img.width * WPP, H = fr.img.height * WPP, X = -(9 + HERO_MX) * WPP, Y = 12 - (22 + HERO_MY) * WPP;
    if (skm) SKV.dash(this, ctx, p, fr, skm, X, Y, W, H, dashing, dtn);   // bóng ảnh nhiều khung theo tư thế thật
    else if (dashing) for (let i = 1; i <= 3; i++) { ctx.save(); ctx.globalAlpha = 0.28 / i; ctx.translate(sn(p.x - dx * i * 15), sn(p.y - dy * i * 15 - z)); ctx.scale(p.face, 1); ctx.drawImage(fr.white, X, Y, W, H); ctx.restore(); }
    if (dashing && this.opts.trail) for (let i = 0; i < 3; i++) this.parts.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y - 10 + (Math.random() - 0.5) * 30, vx: -dx * 60 + (Math.random() - 0.5) * 40, vy: -dy * 60 - 20, life: 0.5, max: 0.5, c: this.opts.trail[i % 2], s: 4 });
    const blink = p.inv > 0 && !dashing && Math.floor(t * 24) % 2;
    ctx.save(); ctx.translate(sn(p.x), sn(p.y - z)); ctx.scale(p.face, 1); if (gs > 1) { ctx.translate(0, 10 + z); ctx.scale(gs, gs); ctx.translate(0, -(10 + z)); } if (p.ghostT > 0) ctx.globalAlpha = 0.28; if (p.stealthT > 0) { ctx.globalAlpha = 0.22 + 0.06 * Math.sin(t * 9); ctx.translate(Math.round(Math.sin(t * 23) * 1.5) * WPP, 0); }
    if (p.hp < (this.lastHp ?? p.hp) - 0.01) { this.hurtFlash = 0.2; if (this.opts.shake) this.addShake(2.5); } this.lastHp = p.hp; this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - (this.dtNow || 0.016));
    if (p.goldT > 0) { if (!fr.gold) fr.gold = tintOf(tintOf(fr.img, '#ffd34a'), '#c88a1a'); ctx.drawImage(fr.gold, X, Y, W, H); if (Math.floor(t * 8) % 3 === 0) { ctx.globalAlpha = 0.5; ctx.drawImage(fr.white, X, Y, W, H); } }
    else if (!blink) ctx.drawImage(this.hurtFlash > 0 ? (Math.floor(this.hurtFlash * 30) % 2 ? fr.white : fr.red) : fr.img, X, Y, W, H);
    ctx.restore();
    if (p.goldT > 0) this.hourglass(ctx, p.x, p.y - 69 - z, 1 - p.goldT / (p.goldT0 || 1));
    if (p.shield > 0 && !(p.goldT > 0)) { ctx.strokeStyle = rgba('#e6d29a', 0.35 + 0.15 * Math.sin(t * 7)); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, p.y - 14 - z, 30, 33, 0, 0, 7); ctx.stroke(); }
    if (p.rooted > 0) { ctx.strokeStyle = '#5a8a2a'; ctx.lineWidth = 4; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 22, p.y + 10 + Math.sin(a) * 9); ctx.quadraticCurveTo(p.x + Math.cos(a) * 8, p.y - 6, p.x + Math.cos(a + 0.6) * 10, p.y - 22 + i % 3 * 6); ctx.stroke(); } this.wtext(p.x, p.y - 57, 'ROOTED — dash to break!', '#a8e070', 11); }
    if (p.frozen > 0) { ctx.fillStyle = 'rgba(170,225,255,.55)'; ctx.fillRect(sn(p.x) - 24, sn(p.y) - 48, 48, 60); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(sn(p.x) - 24, sn(p.y) - 48, 48, 60); ctx.fillStyle = '#ffffff'; ctx.fillRect(sn(p.x) - 18, sn(p.y) - 42, 6, 18); this.wtext(p.x, p.y - 57, 'FROZEN — dash to break!', '#bfe8ff', 11); }
    if (p.chill > 0) for (let i = 0; i < 3; i++) { ctx.fillStyle = i < p.chill ? '#9fe6ff' : 'rgba(255,255,255,.25)'; ctx.fillRect(sn(p.x) - 12 + i * 9, sn(p.y) - 57, 6, 6); }
    // vũ khí: có lấy đà (khi tụ lực) và theo đà (vung quá rồi dừng)
    ctx.save(); ctx.translate(p.x, p.y + HAND_Y - z); ctx.rotate(p.aim);
    const skw = p.skin ? skinWeapon(p.cls, p.skin, Math.floor(t / 0.12)) : null;   // vũ khí riêng của skin (Rare trở lên)
    if (p.cls === 'KNIGHT') {
      const dir = p.swingDir || 1, back = (s2) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(s2 - 1, 3) + c1 * Math.pow(s2 - 1, 2); };
      let off = 0.85 * dir;
      if (p.charge > 0.05) off = 1.5 * dir + (1 + 0.35 * p.charge) * 0 + Math.sin(t * 40) * 0.03 * p.charge;
      if (p.swing > 0) { const s2 = 1 - p.swing / Math.max(0.05, this.swT); off = (-1.25 + 2.4 * back(Math.min(1, s2))) * dir; }
      ctx.rotate(off); const sw = skw ? skw.img : weapon('sword'); ctx.drawImage(sw, 6, -sw.height * WPP / 2, sw.width * WPP, sw.height * WPP);
      const tipX = 6 + (sw.width - 2.5) * WPP;
      if (skw && skw.sp.glow) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 6) + (p.charge > 0.05 ? 0.3 * p.charge : 0); ctx.fillStyle = skw.sp.glow; ctx.fillRect(6 + 4 * WPP, -WPP * 1.5, (sw.width - 7) * WPP, WPP * 3); ctx.globalAlpha = 1; }
      if (p.charge >= 0.7 && Math.floor(t * 14) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(tipX, -9, 3, 15); ctx.fillRect(tipX - 6, -3, 15, 3); }
    } else if (p.cls === 'RANGER') {
      const c = p.charge, rec = (p.atkT || 0) > 0.2 ? 3 : 0;
      if (skw) { // cung pixel của skin; dây cung nối hai đầu cung trong sprite
        const img = skw.img, ox = 5.5, oy = -img.height * WPP / 2, tx = ox + 3.5 * WPP, ty1 = oy + 2.5 * WPP, ty2 = oy + 18.5 * WPP;
        ctx.drawImage(img, ox, oy, img.width * WPP, img.height * WPP);
        ctx.strokeStyle = skw.sp.string || '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, ty1); ctx.lineTo(tx - c * 14 + rec, 0); ctx.lineTo(tx, ty2); ctx.stroke();
        if (c > 0) { ctx.fillStyle = c >= 0.75 ? (skw.sp.glow || '#fff6a0') : '#d8d0b0'; ctx.fillRect(tx - 12 - c * 14, -1.5, 30, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(tx + 15 - c * 14, -3, 5, 6); }
      } else {
        ctx.strokeStyle = '#0c0a12'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(14, 0, 16, -1.25, 1.25); ctx.stroke();
        ctx.strokeStyle = '#a0703a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(14, 0, 16, -1.25, 1.25); ctx.stroke();
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(14 + Math.cos(-1.25) * 16, Math.sin(-1.25) * 16); ctx.lineTo(14 - c * 12 + rec, 0); ctx.lineTo(14 + Math.cos(1.25) * 16, Math.sin(1.25) * 16); ctx.stroke();
        if (c > 0) { ctx.fillStyle = c >= 0.75 ? '#fff6a0' : '#d8d0b0'; ctx.fillRect(2 - c * 12, -1.5, 28, 3); }
      }
    } else {
      const up = p.castAnim > 0 || p.charge > 0.05 ? -0.5 * (p.face || 1) : 0; ctx.rotate(up);
      const st = skw ? skw.img : weapon('staff'); ctx.drawImage(st, -4, -st.height * WPP / 2, st.width * WPP, st.height * WPP);
      this._tipD = skw ? -4 + (staffTip(skw.sp) + 1.5) * WPP : 48; this._tipA = up;   // vị trí đầu trượng (vẽ tia sáng pixel sau khi restore)
    }
    ctx.restore();
    if (skb && p.charge > 0.05) SKV.charge(this, ctx, p, skb, t, sim);
    if (p.cls === 'MAGE') { const a = p.aim + (this._tipA || 0); this._mzT = Math.max(0, (this._mzT || 0) - (this.dtNow || 0.016)); SKV.muzzle(this, ctx, p.x + Math.cos(a) * this._tipD, p.y + HAND_Y - z + Math.sin(a) * this._tipD, p.skinFx ? p.skinFx.theme : '', p.charge || 0, this._mzT / 0.1, t); }   // mọi Pháp sư: tia sáng pixel ở đầu trượng, không còn quả cầu tròn mờ
    if (p.charge > 0.05) {
      const c = p.charge, ready = p.cls === 'RANGER' ? c >= 0.75 : p.cls === 'KNIGHT' ? c >= 0.7 : c >= 0.98;
      const bh = p.cls === 'MAGE' && p.mods && p.mods.blackHole;
      ctx.strokeStyle = bh && c >= 0.9 ? '#c8a8ff' : ready ? '#fff6a0' : '#ffffffaa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y - 8, 28, -Math.PI / 2, -Math.PI / 2 + c * 6.283); ctx.stroke();
      if (bh) { const m = -Math.PI / 2 + 0.9 * 6.283; ctx.fillStyle = '#c8a8ff'; ctx.fillRect(p.x + Math.cos(m) * 28 - 3, p.y - 8 + Math.sin(m) * 28 - 3, 6, 6); }   // vạch 90% = đủ lực tạo hố đen
      if (p.cls === 'RANGER') { ctx.fillStyle = '#fff6a0'; const m = -Math.PI / 2 + 0.75 * 6.283; ctx.fillRect(p.x + Math.cos(m) * 28 - 2, p.y - 8 + Math.sin(m) * 28 - 2, 4, 4); ctx.save(); ctx.globalAlpha = 0.25 + 0.4 * c; ctx.strokeStyle = ready ? '#fff6a0' : '#ffffff'; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x + Math.cos(p.aim) * (300 + 400 * c), p.y - 8 + Math.sin(p.aim) * (300 + 400 * c)); ctx.stroke(); ctx.restore(); }
      if (p.cls === 'KNIGHT') { const R = 110 + 100 * c, A = 1.6 + 1.6 * c; ctx.save(); ctx.globalAlpha = 0.12 + 0.18 * c; ctx.fillStyle = ready ? '#ffd36b' : '#ffffff'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, R, p.aim - A / 2, p.aim + A / 2); ctx.closePath(); ctx.fill(); if (c >= 0.7) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, R + 150, 0, 7); ctx.stroke(); } ctx.restore(); }
      if (false) { const rr = 8 + 14 * c, ox = p.x + Math.cos(p.aim - 0.5 * (p.face || 1)) * 56, oy = p.y + HAND_Y + Math.sin(p.aim - 0.5 * (p.face || 1)) * 56; ctx.fillStyle = 'rgba(155,140,255,.35)'; ctx.beginPath(); ctx.arc(ox, oy, rr + 6, 0, 7); ctx.fill(); ctx.fillStyle = '#c8b8ff'; ctx.beginPath(); ctx.arc(ox, oy, rr, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox - rr * 0.3, oy - rr * 0.3, rr * 0.3, 0, 7); ctx.fill(); }
    }
  }
  status(ctx, e, sc) {
    const t = this.time;
    if (e.freeze > 0) { ctx.fillStyle = 'rgba(190,240,255,.55)'; ctx.fillRect(e.x - 18 * sc, e.y - 34 * sc, 36 * sc, 44 * sc); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(e.x - 18 * sc, e.y - 34 * sc, 36 * sc, 44 * sc); }
    if (e.root > 0) { ctx.strokeStyle = '#6a8a3a'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(e.x, e.y + 6, 10 + i * 3, i, i + 2.4); ctx.stroke(); } }
    if (e.burn > 0) for (let i = 0; i < 3; i++) { const f = 6 + Math.sin(t * 12 + i * 2 + e.id) * 3; ctx.fillStyle = i === 1 ? '#ffd36b' : '#ff7a3c'; ctx.fillRect(e.x - 9 + i * 7, e.y - 26 * sc - f, 5, f + 5); }
    if (e.wet > 0) { ctx.fillStyle = '#7fc4ff'; for (let i = 0; i < 3; i++) ctx.fillRect(e.x - 8 + i * 7, e.y - 30 * sc + ((t * 40 + i * 9) % 16), 2, 4); }
    if (e.blind > 0) this.wtext(e.x, e.y - 44 * sc, '? ?', '#e8eef2', 11);
    if (e.stun > 0) this.wtext(e.x, e.y - 44 * sc, '* *', '#ffe27a', 12);
  }
  enemy(ctx, e, sim) {
    if (e.cloneOf) { // giống hệt boss thật: chỉ đánh trúng mới biết con nào mất máu
      e._px = e._px ?? e.x; e._py = e._py ?? e.y; const mv = Math.hypot(e.x - e._px, e.y - e._py) > 0.4; e._px = e.x; e._py = e.y;
      const sw = e.swingT || 0, cst = sw > 0.3 ? 'wind' : sw > 0 ? 'cleave' : mv ? 'walk' : 'idle', cf = sw > 0.3 ? Math.min(2, Math.floor((0.85 - sw) / 0.18)) : sw > 0 ? Math.min(3, Math.floor((0.3 - sw) / 0.08)) : Math.floor(this.time / (mv ? 0.1 : 0.13)) % 4, fr = this.rig.frame('b', e.cloneOf, { st: cst, f: cf, rage: sim.boss && sim.boss.rage ? 1 : 0 }), w2 = fr.img.width * WPP, h2 = fr.img.height * WPP, face = sim.p.x < e.x ? -1 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.55, e.r * 1.1, e.r * 0.4, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(sn(e.x), sn(e.y)); ctx.scale(face, 1); ctx.drawImage(e.flash > 0 ? fr.white : fr.img, -w2 / 2, sn(e.r * 0.55) - h2 + WPP, w2, h2); ctx.restore();
      if (Math.random() < 0.4 && sim.boss) this.parts.push({ x: e.x + (Math.random() - 0.5) * e.r * 2, y: e.y - Math.random() * e.r * 2, vx: 0, vy: -40, life: 0.8, max: 0.8, c: sim.boss.def.accent, s: 3 });
      return; }
    const d = ENEMIES[e.type], t = this.time, sc = 1;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sn(e.x), sn(e.y + 9), d.r, d.r * 0.38, 0, 0, 7); ctx.fill();
    const face = sim.p.x < e.x ? -1 : 1, near = (ENEMIES[e.type] || {}).ai === 'melee' && Math.hypot(sim.p.x - e.x, sim.p.y - e.y) < 48;
    const fr = this.rig.frame('e', e.type, enemyPose(e, t, near)), [w, h] = ENEMY_SIZE[e.type];
    if (ENEMY_FEET.has(e.type)) { const ff = Math.floor(t / (e.type === 'FROSTSTALKER' ? 0.085 : e.type === 'GRUNT' || (ENEMIES[e.type] || {}).ai === 'melee' || (ENEMIES[e.type] || {}).ai === 'charger' ? 0.11 : 0.12) + e.id) % 4, sp = Math.hypot(e.x - (e._dx ?? e.x), e.y - (e._dy ?? e.y)); e._dx = e.x; e._dy = e.y;
      if (ff !== e._ff) { e._ff = ff; if ((ff === 0 || ff === 2) && sp > 0.25 && !(e.spawn > 0)) { const big = d.r > 16, c = (this.T && this.T.dust) || '#a89470'; for (let i = 0; i < (big ? 3 : 2); i++) this.parts.push({ x: e.x + (Math.random() - 0.5) * d.r, y: e.y + 10, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 18, life: 0.35, max: 0.35, c, s: big ? 4 : 3 }); } } }
    const jitter = e.state === 'tele' ? (Math.random() < 0.5 ? -WPP : WPP) : 0, spawnK = e.spawn > 0 ? 1 - e.spawn / 0.4 : 1;
    const ed = ENEMIES[e.type] || {}, big = ed.elite ? 1.34 : ed.mini ? 0.67 : 1;
    if (ed.elite) { const t2 = this.time; ctx.strokeStyle = ed.aura; ctx.lineWidth = 3; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t2 * 6); ctx.beginPath(); ctx.ellipse(sn(e.x), sn(e.y + 9), e.r * 1.4, e.r * 0.55, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; if (Math.random() < 0.7) { const q = Math.random() * 6.28; this.streaks.push({ x: e.x + Math.cos(q) * e.r, y: e.y - 20 + Math.sin(q) * e.r, vx: 0, vy: -160, life: 0.3, max: 0.3, c: ed.aura }); } }
    ctx.save(); ctx.globalAlpha = Math.max(0, spawnK) * (e.alpha ?? 1) * (ed.illusion ? 0.55 : 1); ctx.translate(sn(e.x) + jitter, sn(e.y + (1 - spawnK) * 12)); ctx.scale(face * big, big);
    if (e.state === 'stagger') ctx.rotate(Math.sin(t * 20) * 0.08);
    if (e.type === 'DUMMY' && e.flash > 0) ctx.rotate(Math.sin(t * 50) * 0.14);
    ctx.drawImage(e.flash > 0 || (e.state === 'swell' && Math.floor(t * (8 + (0.7 - e.st) * 20)) % 2) ? fr.white : fr.img, -((w + 2) / 2) * WPP, 12 - (h + 1) * WPP, (w + 2) * WPP, (h + 2) * WPP);
    ctx.restore();
    if ((ENEMIES[e.type] || {}).ai === 'charger' && e.state === 'charge' && Math.random() < 0.5) this.parts.push({ x: e.x - face * 16, y: e.y + 10, vx: -face * 40, vy: -20, life: 0.4, max: 0.4, c: (this.T && this.T.dust) || '#a89470', s: 4 });
    if (ENEMIES[e.type].elite) { const bw = 40; ctx.fillStyle = '#000a'; ctx.fillRect(sn(e.x - bw / 2) - 3, sn(e.y - 66), bw + 6, 9); ctx.fillStyle = ENEMIES[e.type].aura; ctx.fillRect(sn(e.x - bw / 2), sn(e.y - 66) + 3, sn(bw * Math.max(0, e.hp / e.max)), 3); }
    this.status(ctx, e, sc);
    if (e.state === 'stagger') this.wtext(e.x, e.y - 48, '✦ ✦', '#ffe27a', 12);
    if (e.hp < e.max && !ENEMIES[e.type].elite) { const bw = 26; ctx.fillStyle = '#000a'; ctx.fillRect(sn(e.x - bw / 2) - 3, sn(e.y - 48), bw + 6, 9); ctx.fillStyle = '#ff5a4a'; ctx.fillRect(sn(e.x - bw / 2), sn(e.y - 48) + 3, sn(bw * Math.max(0, e.hp / e.max)), 3); }
  }
  boss(ctx, b, sim) {
    if (b.burrow) return; // dưới đất: vô hình, chỉ có bụi lác đác (burrowDust)
    const t = this.time, an = b._an || (b._an = { st: 'idle', t0: t, f: -1, px: b.x, py: b.y, lt: t, mv: 0 });
    // phát hiện di chuyển (theo vị trí giữa các khung vẽ)
    const dtv = Math.max(1e-3, t - an.lt), sp = Math.hypot(b.x - an.px, b.y - an.py) / dtv; an.mv = sp > 18 ? 0.15 : Math.max(0, an.mv - dtv); an.px = b.x; an.py = b.y; an.lt = t;
    const st = bossAnimState(b, sim, an.mv > 0);
    if (st !== an.st) { an.st = st; an.t0 = t; an.f = -1; }
    const f = animFrame(st === 'walk' && HEAVY[b.type] ? 'walkHeavy' : st, t - an.t0);
    if (f !== an.f) { // sự kiện theo khung: bụi bước chân, rung màn hình khi va chạm
      an.f = f; const foot = b.y + b.r * 0.5;
      if (st === 'walk' && (f === 0 || f === 2) && HEAVY[b.type]) { const side = f === 0 ? 1 : -1, fx = b.x + Math.cos(b.face) * b.r * 0.35 * side; this.puff(fx, foot, 6, 34, (this.T && this.T.dust) || '#c8b890'); this.rings.push({ x: fx, y: foot, r: 6, R: b.r * 0.7, t: 0.28, T: 0.28, c: (this.T && this.T.dust) || '#c8b890', w: 3 }); this.addShake(b.type === 'DRAGON' ? 1 : 1.8); }
      if (b.type === 'DRAGON' && st === 'rise' && f === 0) { this.puff(b.x, foot, 10, b.r * 1.6, (this.T && this.T.dust) || '#c8b890'); }
      if (b.type === 'WARDEN' && st === 'walk') for (let i = 0; i < 3; i++) this.parts.push({ x: b.x - Math.cos(b.face) * b.r * (0.4 + Math.random() * 0.5), y: foot - Math.random() * b.r, vx: -Math.cos(b.face) * 60, vy: -10, life: 0.6, max: 0.6, c: i % 2 ? '#bfefff' : '#ffffff', s: 3 });
      if (st === 'prisonSlam' && f === 0) { this.addShake(8); const bx = b.x + Math.cos(b.face) * b.r * 0.4; for (let i = 0; i < 18; i++) { const q = i / 18 * 6.283; this.parts.push({ x: bx, y: foot, vx: Math.cos(q) * 260, vy: Math.sin(q) * 110, life: 0.4, max: 0.4, c: i % 3 ? '#a8f0ff' : '#ffffff', s: 4 }); } }
      if ((st === 'slam' || st === 'cleave') && f === 1) { this.addShake(st === 'slam' ? 7 : 5); this.puff(b.x + Math.cos(b.face) * b.r * 0.6, foot, 12, 90, (this.T && this.T.dust) || '#c8b890'); }
      if (st === 'stagger' && f === 0) this.addShake(3);
    }
    const P = { st, f, rage: b.rage ? 1 : 0, dim: st === 'stagger' ? 1 : 0 }; if (b.type === 'BEHEMOTH') P.sh = b.shrooms ?? 5;
    const wbm = b.type === 'WARDEN' && (st === 'beam' || st === 'beamWind') ? sim.hazards.find(h => h.owner === b && h.kind === 'beam') : null;
    if (wbm) { const fc = Math.cos(b.face) < 0 ? -1 : 1; let la = fc > 0 ? wbm.a : Math.PI - wbm.a; la = Math.atan2(Math.sin(la), Math.cos(la)); P.aim = Math.round(la / (Math.PI / 8)) * (Math.PI / 8); }   // tay + gậy xoay theo hướng tia
    const fr = this.rig.frame('b', b.type, P);
    if (!fr.gold) fr.gold = tintOf(fr.img, '#ffd34a');
    const flashW = st === 'wind' && t - an.t0 < 0.07; // khung loé vàng báo hiệu
    const img = (b.flash > 0 || b.invuln > 0 && Math.floor(t * 16) % 2) ? fr.white : flashW ? fr.gold : fr.img, w = img.width * WPP, h = img.height * WPP;
    const [sqx, sqy] = squash(st, f);
    const spawnK = b.spawn > 0 ? Math.max(0, 1 - b.spawn / 1.6) : 1, fly = b.type === 'SOVEREIGN';
    ctx.fillStyle = fly ? 'rgba(20,8,40,.45)' : 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.55, b.r * (1.1 - Math.min(0.5, b.z / 500)) * (fly ? 0.7 : 1), b.r * 0.4 * (fly ? 0.7 : 1), 0, 0, 7); ctx.fill();
    if (fly) { const pu = 0.5 + 0.5 * Math.sin(t * 3); for (let i = 0; i < 28; i++) { const q = i / 28 * 6.283 + t * 0.8, rx = b.r * (0.95 + pu * 0.12), ry = rx * 0.36; ctx.fillStyle = i % 3 ? `rgba(122,70,210,${0.25 + pu * 0.3})` : `rgba(200,160,255,${0.35 + pu * 0.35})`; ctx.fillRect(sn(b.x + Math.cos(q) * rx) - WPP / 2, sn(b.y + b.r * 0.55 + Math.sin(q) * ry) - WPP / 2, WPP, WPP); }
      if (Math.random() < 0.5) { const up = Math.random() < 0.5; this.parts.push({ x: b.x + (Math.random() - 0.5) * b.r * 1.3, y: b.y + b.r * 0.4 - Math.random() * b.r * 0.6, vx: (Math.random() - 0.5) * 12, vy: up ? -18 - Math.random() * 14 : 14 + Math.random() * 10, life: 1.1, max: 1.1, c: ['#7a5ad0', '#b48ae0', '#4a2574', '#e0d0ff'][(Math.random() * 4) | 0], s: 3 }); } } // vòng bóng tím nhịp đập + đốm sáng trôi lên/xuống
    if (b.glow > 0 || b.dashing) { ctx.fillStyle = rgba(b.def.color, 0.18 + 0.12 * Math.sin(t * 20)); ctx.beginPath(); ctx.arc(b.x, b.y - b.r * 0.4 - b.z, b.r * 1.3, 0, 7); ctx.fill(); }
    ctx.save(); ctx.globalAlpha = (b.alpha ?? 1) * Math.min(1, spawnK * 1.5);
    const float = fly ? sn(Math.sin(t * 2) * 6) - 27 : 0, face = Math.cos(b.face) < 0 ? -1 : 1, sk = b.stagger > 0 ? Math.sin(t * 22) * 0.05 : 0;
    ctx.translate(sn(b.x), sn(b.y - b.z) + float); ctx.translate(0, sn(b.r * 0.55)); ctx.rotate(sk); ctx.scale(face * (0.6 + 0.4 * spawnK) * sqx, (0.6 + 0.4 * spawnK) * sqy);
    ctx.drawImage(img, -w / 2, -h + WPP, w, h);
    ctx.restore();
    if (wbm && fr.img.tip) { const s = 0.6 + 0.4 * spawnK, toW = q => [b.x + face * s * sqx * (-w / 2 + q[0] * WPP), b.y - b.z + float + b.r * 0.55 + s * sqy * (-h + WPP + q[1] * WPP)]; wbm.vo = [toW(fr.img.tip), toW(fr.img.palm)]; }   // tia phát đúng từ đầu gậy và lòng bàn tay
    const brh = fr.img.mouth ? sim.hazards.find(h => h.owner === b && !h.done && h.kind === 'arc' && h.arc < 0.6) : null;
    if (fr.img.mouth && (st === 'cast' || (st === 'wind' && f > 0) || brh)) {
      const s = 0.6 + 0.4 * spawnK, mx = b.x + face * s * sqx * (-w / 2 + fr.img.mouth[0] * WPP), my = b.y - b.z + float + b.r * 0.55 + s * sqy * (-h + WPP + fr.img.mouth[1] * WPP), fa = st === 'wind' ? -Math.PI / 2 + face * 0.4 : b.face;
      for (let i = 0; i < (st === 'wind' ? 1 : 5); i++) {
        const c = Math.random() < 0.3 ? '#fff3b0' : Math.random() < 0.6 ? '#ffc04a' : '#ff5a1a';
        if (brh) { const k = 0.25 + Math.random() * 0.75, q = brh.a + (Math.random() - 0.5) * brh.arc, tx = brh.x + Math.cos(q) * brh.r * k, ty = brh.y + Math.sin(q) * brh.r * k, L = 0.3 + Math.random() * 0.15; this.parts.push({ x: mx, y: my, vx: (tx - mx) / L, vy: (ty - my) / L, life: L, max: L, c, s: 5 + Math.random() * 6 }); } // luồng lửa đổ từ hàm xuống vùng cháy
        else { const q = fa + (Math.random() - 0.5) * 0.35, v = st === 'wind' ? 40 : 260 + Math.random() * 160; this.parts.push({ x: mx, y: my, vx: Math.cos(q) * v, vy: Math.sin(q) * v, life: st === 'wind' ? 0.35 : 0.45, max: 0.45, c, s: 5 + Math.random() * 5 }); }
      }
    }
    if (b.dashing && Math.random() < 0.7) this.puff(b.x - Math.cos(b.face) * b.r * 0.6, b.y + b.r * 0.5, 1, 20, (this.T && this.T.dust) || '#c8b890');
    if (Math.random() < 0.4) { const qk = b.type === 'COLOSSUS'; this.parts.push({ x: b.x + (Math.random() - 0.5) * b.r * 2, y: b.y - Math.random() * b.r * 2 - b.z, vx: 0, vy: qk ? 30 : -40, life: 0.8, max: 0.8, c: qk ? ['#78716C', '#A8A29E', '#57534E'][(Math.random() * 3) | 0] : b.def.accent, s: 3 }); }   // Colossus: bụi granite rơi lả tả thay tàn lửa
    if (b.fly) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r * 0.55, b.r * 1.3, b.r * 0.5, 0, 0, 7); ctx.fill(); }
    if (b.stagger > 0) this.wtext(b.x, b.y - b.r * 2.4, '✦  ✦  ✦', '#ffe27a', 22);
    this.status(ctx, b, 2);
  }
  shot(ctx, s) {
    if (s.hole) { const rr = (s.r || 8) + 10 + Math.sin(this.time * 18) * 2; ctx.fillStyle = 'rgba(42,16,80,.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, 7); ctx.fill(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - this.time * 7; ctx.fillStyle = i % 2 ? '#c8a8ff' : '#7a4ad8'; ctx.fillRect(sn(s.x + Math.cos(a) * rr) - 3, sn(s.y + Math.sin(a) * rr) - 3, 6, 6); } }   // cầu đủ lực tạo hố đen: quầng tím-đen (vẽ trước cả khi skin tự vẽ viên đạn)
    const skc = s.sk ? (s.sk.group === 'ULTIMATE' ? 'ult' : SKF.catOfSkill(s.sk)) : 'basic', sth = SKF.covers(this._skfx, skc) ? SKF.themeOf(this._skfx.theme) : null;
    if (sth && SKV.shot(this, ctx, s, sth, skc, this.time)) return;   // skin tự vẽ trọn viên đạn (giữ nguyên kích thước vùng trúng)
    const t = this.time, c = sth ? sth.pal[2] : ELC(s.el);
    if (Math.random() < 0.75) this.parts.push({ x: s.x - Math.cos(s.a) * 8, y: s.y - Math.sin(s.a) * 8, vx: 0, vy: 0, life: 0.2, max: 0.2, c: s.kind === 'orb' ? '#9b8cff' : s.kind === 'arrow' ? '#e8dcc0' : s.kind === 'pierce' ? '#fff6a0' : c, s: s.kind === 'orb' || s.kind === 'sbolt' ? 6 : 3 });
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
    if (s.kind === 'cyclone') { ctx.rotate(-s.a); for (let i = 0; i < 9; i++) { const a = t * 12 + i * 0.8, r = 6 + i * 5; ctx.fillStyle = i % 2 ? '#ffb04a' : '#ff5a2a'; ctx.fillRect(Math.cos(a) * r - 4, -i * 4 + Math.sin(a) * r * 0.5 - 4, 8, 8); } }
    else if (s.kind === 'crescent') { ctx.fillStyle = rgba(c, 0.55); ctx.beginPath(); ctx.arc(-12, 0, s.width / 2, -1.2, 1.2); ctx.arc(-24, 0, s.width / 2 - 4, 1.1, -1.1, true); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-12, 0, s.width / 2, -1.1, 1.1); ctx.stroke(); }
    else if (s.kind === 'sarrow' || s.kind === 'shard') { ctx.fillStyle = rgba(c, 0.5); ctx.fillRect(-20, -3, 22, 6); ctx.fillStyle = '#0c0a12'; ctx.fillRect(-12, -2, 22, 4); ctx.fillStyle = s.kind === 'shard' ? '#e8f8ff' : '#e8dcc0'; ctx.fillRect(-11, -1, 20, 2); ctx.fillStyle = c; ctx.fillRect(7, -3, 5, 6); }
    else if (s.kind === 'sbolt') { ctx.fillStyle = rgba(c, 0.4); ctx.fillRect(-s.r * 2.6, -s.r * 0.7, s.r * 2.8, s.r * 1.4); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, s.r + 2, 0, 7); ctx.fill(); ctx.fillStyle = '#fff4d0'; ctx.beginPath(); ctx.arc(0, 0, Math.max(2, s.r - 3), 0, 7); ctx.fill(); }
    // đạn cơ bản của lớp
    if (s.kind === 'arrow') { ctx.fillStyle = '#0c0a12'; ctx.fillRect(-12, -2, 22, 4); ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-11, -1, 20, 2); ctx.fillStyle = '#fff'; ctx.fillRect(7, -2, 4, 4); }
    else if (s.kind === 'wave') { ctx.fillStyle = 'rgba(255,233,160,.45)'; ctx.beginPath(); ctx.arc(-10, 0, (s.r || 16) + 6, -1.2, 1.2); ctx.arc(-22, 0, (s.r || 16), 1.1, -1.1, true); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-10, 0, (s.r || 16) + 6, -1.1, 1.1); ctx.stroke(); }
    else if (s.kind === 'spark') { ctx.fillStyle = '#c8b8ff'; ctx.fillRect(-9, -3, 15, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -3, 6, 6); }
    else if (s.kind === 'silver') { ctx.globalAlpha = 0.35; ctx.fillStyle = '#dfe8ff'; ctx.fillRect(-60, -9, 72, 18); ctx.globalAlpha = 1; ctx.fillStyle = '#0c0a12'; ctx.fillRect(-24, -4, 42, 8); ctx.fillStyle = '#c8d4e8'; ctx.fillRect(-22, -3, 38, 6); ctx.fillStyle = '#ffffff'; ctx.fillRect(-20, -2, 34, 2); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(12, -8); ctx.lineTo(12, 8); ctx.fill(); if (Math.random() < 0.8) this.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, max: 0.35, c: Math.random() < 0.5 ? '#ffffff' : '#c8d8ff', s: 3 }); }
    else if (s.kind === 'pierce') { ctx.fillStyle = '#fff6a0'; ctx.globalAlpha = 0.4; ctx.fillRect(-40, -5, 50, 10); ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(-16, -2, 30, 4); }
    else if (s.kind === 'orb') { const rr = s.r || 8; if (s.full) { ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * 6.283 + this.time * 6, rad = rr + 8 + (i % 2) * 6; i ? ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.stroke(); } ctx.fillStyle = 'rgba(90,72,192,.5)'; ctx.beginPath(); ctx.arc(0, 0, rr + 5, 0, 7); ctx.fill(); ctx.fillStyle = '#5a48c0'; ctx.beginPath(); ctx.arc(0, 0, rr + 2, 0, 7); ctx.fill(); ctx.fillStyle = '#c8b8ff'; ctx.beginPath(); ctx.arc(0, 0, rr * 0.75, 0, 7); ctx.fill(); }
    ctx.restore();
    if (sth) SKF.skinShot(this, ctx, s, sth, t);
  }
}
