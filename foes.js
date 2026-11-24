// Quái riêng của map 2–5 (hang nấm, đèo băng, núi lửa, cung điện): dữ liệu + AI.
// Rừng giữ bộ quái gốc (melee / charger / shooter trong sim.js). Mỗi quái ở đây có khuôn hành vi riêng,
// chạy trong enemiesExtra (sau AI gốc). Mọi đòn mở đầu đi qua cổng tấn công g.gate(e) để không bao giờ đánh cùng nhịp.
import { ENEMIES, dist, angDiff } from './sim.js';
import { applyEl, chill } from './gameenv.js';

const TAU = Math.PI * 2;
const add = (k, o) => { ENEMIES[k] = { mass: 1, gold: 1, tier: 1, ...o }; };
// tier 2 = quái khó (vàng, năng lượng, đồ rơi như Charger/Caster)
add('SPOREBOMB',    { name: 'Spore Bomber',      ai: 'bomber',    hp: 34,  speed: 135, r: 12, dmg: 18, color: '#9ad84a', mass: 0.6, death: 'puddle', immune: 'poison' });
add('WEAVER',       { name: 'Mycelium Weaver',   ai: 'weaver',    hp: 55,  speed: 80,  r: 14, dmg: 11, color: '#b8ff5a', mass: 0.9, tier: 2, ranged: true, immune: 'poison' });
add('HUSK',         { name: 'Brute Stalker',     ai: 'husk',      hp: 120, speed: 72,  r: 18, dmg: 15, color: '#a8e05a', mass: 2.2, tier: 2, trail: 'poison', immune: 'poison' });
add('FROSTSTALKER', { name: 'Frost Stalker',     ai: 'stalker',   hp: 70,  speed: 150, r: 15, dmg: 20, color: '#bfe8ff', mass: 1.0 });
add('CRYOMAGE',     { name: 'Cryo Conjurer',     ai: 'conjurer',  hp: 52,  speed: 80,  r: 14, dmg: 14, color: '#9fe6ff', mass: 0.8, tier: 2, ranged: true });
add('SENTINEL',     { name: 'Glacial Sentinel',  ai: 'sentinel',  hp: 150, speed: 58,  r: 19, dmg: 16, color: '#7fd0ff', mass: 2.6, tier: 2, front: 'shield' });
add('CINDERIMP',    { name: 'Cinder Imp',        ai: 'swarm',     hp: 30,  speed: 150, r: 11, dmg: 9,  color: '#ff8a3a', mass: 0.6, death: 'explode', pack: 2 });
add('BOMBARDIER',   { name: 'Pyro Bombardier',   ai: 'mortar',    hp: 60,  speed: 70,  r: 16, dmg: 22, color: '#ff7a2a', mass: 1.2, tier: 2, ranged: true });
add('JUGGERNAUT',   { name: 'Obsidian Juggernaut', ai: 'jugg',    hp: 170, speed: 55,  r: 20, dmg: 18, color: '#9a6aff', mass: 3.0, tier: 2, front: 'armor' });
add('ARCANIST',     { name: 'Crimson Arcanist',  ai: 'arcanist',  hp: 62,  speed: 78,  r: 14, dmg: 18, color: '#ff3a5a', mass: 0.9, tier: 2, ranged: true });
add('HALBERDIER',   { name: 'Royal Halberdier',  ai: 'halberd',   hp: 115, speed: 80,  r: 16, dmg: 18, color: '#ffd36b', mass: 1.8, squad: true });
export const FOE_AIS = new Set(['bomber', 'weaver', 'husk', 'stalker', 'conjurer', 'sentinel', 'swarm', 'mortar', 'jugg', 'arcanist', 'halberd']);
// quái đứng sau tuyến đầu khi spawn
export const isRanged = d => !!d && (d.ranged || d.ai === 'shooter');

// điểm đoán trước của người chơi (vận tốc làm mượt)
export function trackPV(g, dt) { const p = g.p; if (!g.pv) g.pv = { x: 0, y: 0 }; const k = Math.min(1, dt * 8); g.pv.x += ((p.vx || 0) - g.pv.x) * k; g.pv.y += ((p.vy || 0) - g.pv.y) * k; }
export function leadPt(g, t, jit = 0) { const p = g.p, v = g.pv || { x: 0, y: 0 }; return [p.x + v.x * t + (g.rand() - 0.5) * jit, p.y + v.y * t + (g.rand() - 0.5) * jit]; }

// di chuyển có tính đóng băng / trói / chậm / mặt đất
function mv(g, e, a, sp, dt) {
  if (e.root > 0) return;
  const ef = g.surfFxE ? g.surfFxE(e.x, e.y) : null, k = (ef ? ef.spd : 1) * (1 - (e.slowAmt || 0));
  e.x += Math.cos(a) * sp * k * dt; e.y += Math.sin(a) * sp * k * dt;
}
// hướng vây sườn: ở xa đi tới điểm lệch e.flank quanh người chơi, gần thì lao thẳng
function flankDir(g, e, dp, toP, near = 120) {
  const p = g.p, fl = e.flank || 0;
  if (dp <= near || !fl) return toP;
  const tx = p.x - Math.cos(toP + fl) * 90, ty = p.y - Math.sin(toP + fl) * 90; return Math.atan2(ty - e.y, tx - e.x);
}
// giữ khoảng cách (quái tầm xa): lùi khi quá gần, đi vòng khi đúng tầm
function keepDist(g, e, d, dp, toP, want, dt) {
  const side = (e.id % 2 ? 1 : -1), a = dp > want + 40 ? toP + side * 0.35 : dp < want - 40 ? toP + Math.PI : toP + side * Math.PI / 2;
  mv(g, e, a, d.speed * (dp < want - 40 ? 1.05 : 0.7), dt);
}
const contact = (g, e, d, dp, toP, cd = 0.9, extra) => { const p = g.p; if (dp < d.r + p.r + 8 && e.atkCd <= 0) { e.atkCd = cd + g.rand() * 0.3; g.hurtPlayer(d.dmg, toP); if (extra) extra(); } };
const H = (g, o) => { const h = { owner: null, hold: 0, T: o.t, ...o }; g.hazards.push(h); return h; };
const die = (g, e) => { e.dead = true; e.hp = 0; g.emit('kill', { x: e.x, y: e.y, type: e.type }); };

export function foeAI(g, e, d, dt) {
  if (e.blockT > 0) e.blockT -= dt;
  if (e.spawn > 0) return;
  if (e.freeze > 0 || e.stun > 0) { if (e.state === 'pounce' || e.state === 'lunge') { e.state = 'stagger'; e.st = 0.6; } return; }
  const p = g.p, dp = dist(e.x, e.y, p.x, p.y), toP = Math.atan2(p.y - e.y, p.x - e.x), ds = g.dmgScale || 1, blind = e.blind > 0;
  const ready = r => e.st <= 0 && dp < r && !blind && g.gate(e);
  if (e.state === 'stagger') { if (e.st <= 0) { e.state = 'move'; e.st = 0.8 + g.rand() * 0.6; } return; }
  switch (d.ai) {
    // ---------- hang nấm ----------
    case 'bomber': {
      if (e.state === 'move') {
        e.wt = (e.wt || 0) - dt; if (e.wt <= 0) { e.wt = 0.3; e.wa = (g.rand() - 0.5) * 1.6; }
        mv(g, e, flankDir(g, e, dp, toP, 140) + (dp > 90 ? e.wa || 0 : 0), d.speed, dt);
        if (ready(70)) { e.state = 'swell'; e.st = 0.7; e.T = 0.7; H(g, { kind: 'circle', x: e.x, y: e.y, r: 70, t: 0.7, visual: true, color: '#b8ff5a', sty: 'toxic' }); g.emit('swell', { x: e.x, y: e.y }); }
      } else if (e.state === 'swell' && e.st <= 0) {
        if (dp < 70 + p.r) g.hurtPlayer(d.dmg * ds, toP, { boss: true });
        applyEl(g, e.x, e.y, 80, 'POISON', { life: 6 }); g.emit('sporeBurst', { x: e.x, y: e.y, r: 80 }); die(g, e);
      }
      break;
    }
    case 'weaver': {
      if (e.state === 'move') {
        keepDist(g, e, d, dp, toP, 300, dt);
        if (ready(540)) { e.state = 'tele'; e.st = 0.6; e.ta = toP; }
      } else if (e.state === 'tele') {
        e.ta = toP;
        if (e.st <= 0) { g.foes.push({ x: e.x, y: e.y - 6, vx: Math.cos(toP) * 150, vy: Math.sin(toP) * 150, life: 3.4, dmg: d.dmg, r: 9, kind: 'spore', home: 1.3, split: 3, c: '#9a4ae0' }); g.emit('cast', { x: e.x, y: e.y }); e.state = 'move'; e.st = 2.4 + g.rand() * 0.9; }
      }
      // dây hồi máu: nối tới đồng đội bị thương gần nhất, đứt khi weaver bị đánh
      e.healT = (e.healT ?? 3 + g.rand() * 2) - dt;
      if (e.tie) {
        const a = e.tie; e.tieT -= dt;
        if (a.dead || e.flash > 0 || e.tieT <= 0 || dist(a.x, a.y, e.x, e.y) > 300) { if (e.flash > 0 && !a.dead) g.emit('tetherCut', { x: e.x, y: e.y }); e.tie = null; }
        else a.hp = Math.min(a.max, a.hp + a.max * 0.15 * dt);
      } else if (e.healT <= 0) {
        e.healT = 5; let best = null, bv = 0.999;
        for (const a of g.enemies) { if (a === e || a.dead || a.boss || a.type === 'DUMMY' || dist(a.x, a.y, e.x, e.y) > 240) continue; const v = a.hp / a.max; if (v < bv) { bv = v; best = a; } }
        if (best) { e.tie = best; e.tieT = 2; g.emit('tether', { x: e.x, y: e.y }); }
      }
      break;
    }
    case 'husk': {
      if (e.state === 'move') {
        mv(g, e, flankDir(g, e, dp, toP), d.speed, dt);
        contact(g, e, d, dp, toP, 1.1);
        if (ready(170)) {
          e.state = 'tele'; e.st = 0.6; e.ta = toP;
          for (let k = 0; k < 3; k++) { const a = toP + (k - 1) * 0.45, t = 0.6 + k * 0.12, x = e.x, y = e.y;
            H(g, { kind: 'line', x, y, a, len: 280, width: 34, t, dmg: 16 * ds, color: '#a8e05a', sty: 'toxic', after: () => { for (let u = 40; u <= 280; u += 60) applyEl(g, x + Math.cos(a) * u, y + Math.sin(a) * u, 24, 'THORN'); } }); }
        }
      } else if (e.state === 'tele' && e.st <= 0) { e.state = 'slam'; e.st = 0.55; g.emit('thud', { x: e.x, y: e.y }); }
      else if (e.state === 'slam' && e.st <= 0) { e.state = 'move'; e.st = 3.4 + g.rand() * 1.2; }
      break;
    }
    // ---------- đèo băng ----------
    case 'stalker': {
      e.dir = e.dir || (e.id % 2 ? 1 : -1);
      if (e.state === 'move') {
        const a = toP + e.dir * (dp > 210 ? 0.55 : dp < 150 ? 2.3 : Math.PI / 2);
        mv(g, e, a, d.speed, dt);
        if (ready(260)) { e.state = 'feint'; e.st = 0.45; e.ta = toP; g.emit('tele', { x: e.x, y: e.y, a: toP }); }
      } else if (e.state === 'feint') {
        if (e.st > 0.33) mv(g, e, e.ta, 220, dt); // nhích tới rồi khựng lại (đòn nhử)
        if (e.st <= 0) { e.state = 'pounce'; e.st = 0.28; e.ta = toP; e.hitP = false; }
      } else if (e.state === 'pounce') {
        e.x += Math.cos(e.ta) * 780 * dt; e.y += Math.sin(e.ta) * 780 * dt;
        e.trailT = (e.trailT || 0) - dt; if (e.trailT <= 0) { e.trailT = 0.04; applyEl(g, e.x, e.y, 22, 'ICE', { life: 7 }); }
        if (!e.hitP && dp < d.r + p.r + 4) { e.hitP = true; g.hurtPlayer(d.dmg, e.ta); chill(g, 1); }
        if (g.world.blocked(e.x, e.y, d.r)) { e.state = 'stagger'; e.st = 1.0; g.emit('thud', { x: e.x, y: e.y }); }
        else if (e.st <= 0) { e.state = 'stagger'; e.st = e.hitP ? 0.45 : 0.8; e.dir = -e.dir; }
      }
      break;
    }
    case 'conjurer': {
      if (e.state === 'move') {
        keepDist(g, e, d, dp, toP, 320, dt);
        if (ready(560)) { e.state = 'tele'; e.st = 0.5; }
      } else if (e.state === 'tele' && e.st <= 0) {
        const [lx, ly] = leadPt(g, 1.0, 30); e.alt = !e.alt;
        if (e.alt) { // vòng cột băng quanh điểm đoán trước + lõi nổ muộn
          for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + g.rand() * 0.3, x = lx + Math.cos(a) * 78, y = ly + Math.sin(a) * 78;   // map 3: 5 cột, vòng 78 (trước 6 cột, 95)
            H(g, { kind: 'circle', x, y, r: 26, t: 1.05 + k * 0.06, dmg: 10 * ds, color: '#9fe6ff', after: () => { if (dist(x, y, g.p.x, g.p.y) > 26 + g.p.r && !g.world.blocked(x, y, 12)) { const o = g.world.addTemp('icecrystal', x, y, 16, 3, 40); o.rise = 0.2; o.v = g.rand(); o.foeIce = true; } } }); }
          H(g, { kind: 'circle', x: lx, y: ly, r: 38, t: 1.45, dmg: 12 * ds, color: '#9fe6ff', after: () => applyEl(g, lx, ly, 40, 'ICE', { life: 6 }) });
        } else { // nova chữ thập
          for (const a of [toP, toP + Math.PI / 2]) H(g, { kind: 'rect', x: lx, y: ly, a, len: 220, width: 30, t: 1.15, dmg: 12 * ds, color: '#9fe6ff', after: () => { for (let u = -100; u <= 100; u += 50) applyEl(g, lx + Math.cos(a) * u, ly + Math.sin(a) * u, 22, 'ICE', { life: 6 }); } });
        }
        g.emit('cast', { x: e.x, y: e.y }); e.state = 'move'; e.st = 3.8 + g.rand() * 1.2;
      }
      break;
    }
    case 'sentinel': {
      if (e.state === 'move') {
        if (dp > 240) mv(g, e, flankDir(g, e, dp, toP, 300), d.speed, dt);
        contact(g, e, d, dp, toP, 1.2, () => chill(g, 1));
        if (ready(e.alt ? 300 : 230)) {
          e.alt = !e.alt; e.ta = toP;
          if (e.alt) { // giơ khiên rồi nện xuống: quạt 5 dải gai băng lởm chởm
            e.state = 'slamWind'; e.st = 0.85; const x = e.x, y = e.y;
            for (let k = 0; k < 3; k++) { const a = toP + (k - 1) * 0.3, t = 0.85 + Math.abs(k - 1) * 0.05;   // map 3: 3 dải (trước 5)
              H(g, { kind: 'line', x, y, a, len: 190, width: 22, t, dmg: 13 * ds, color: '#9fe6ff', sty: 'ice', after: () => { const pts = []; for (let u = 50; u <= 190; u += 38) { const px = x + Math.cos(a) * u, py = y + Math.sin(a) * u; pts.push([px, py]); applyEl(g, px, py, 20, 'ICE', { life: 6 }); } g.emit('iceSpikes', { pts }); if (k === 1) { g.emit('thud', { x, y }); } } }); }
          } else {
          const dir = e.id % 2 ? 1 : -1; e.state = 'beam'; e.st = 2.0;
          H(g, { kind: 'beam', owner: e, x: e.x, y: e.y, a: toP - 0.7 * dir, n: 1, len: 230, width: 22, t: 1.0, dur: 1.0, spin: 1.1 * dir, hitCd: 0, dmg: 12 * ds, color: '#9fe6ff', sty: 'ice', trail: 'ICE', onHitP: () => chill(g, 1) });
          }
        }
      } else if (e.state === 'slamWind' && e.st <= 0) { e.state = 'slam'; e.st = 0.5; }
      else if ((e.state === 'beam' || e.state === 'slam') && e.st <= 0) { e.state = 'move'; e.st = 3.8 + g.rand() * 1.4; }
      break;
    }
    // ---------- núi lửa ----------
    case 'swarm': {
      e.wt = (e.wt || 0) - dt; if (e.wt <= 0) { e.wt = 0.25; e.wa = (g.rand() - 0.5) * 2; }
      mv(g, e, flankDir(g, e, dp, toP, 100) + (dp > 70 ? e.wa || 0 : 0), d.speed, dt);
      contact(g, e, d, dp, toP, 0.8);
      break;
    }
    case 'mortar': {
      if (e.state === 'move') {
        keepDist(g, e, d, dp, toP, 380, dt);
        if (ready(640)) { e.state = 'tele'; e.st = 0.7; }
      } else if (e.state === 'tele' && e.st <= 0) {
        const tg = [leadPt(g, 1.1, 40), [p.x, p.y]];
        tg.forEach(([x, y], k) => { const t = 1.1 + k * 0.25;
          H(g, { kind: 'circle', x, y, r: 56, t, dmg: 22 * ds, color: '#ff5a2a', sty: 'magma', reticle: true, after: () => applyEl(g, x, y, 50, 'LAVA', { life: 5 }) });
          g.emit('lob', { x1: e.x - 4 + k * 8, y1: e.y - 30, x2: x, y2: y, T: t }); });
        e.state = 'fire'; e.st = 0.35; g.emit('cast', { x: e.x, y: e.y });
      } else if (e.state === 'fire' && e.st <= 0) { e.state = 'move'; e.st = 3.2 + g.rand() * 1.0; }
      break;
    }
    case 'jugg': {
      if (e.state === 'move') {
        e.ta = toP; mv(g, e, flankDir(g, e, dp, toP), d.speed, dt);
        contact(g, e, d, dp, toP, 1.3);
        if (ready(420)) { e.state = 'tele'; e.st = 0.9; e.ta = toP; g.emit('juggCharge', { x: e.x, y: e.y }); }
      } else if (e.state === 'tele') {
        if (e.st > 0.4) e.ta += angDiff(toP, e.ta) * Math.min(1, dt * 3);
        if (e.st <= 0) {
          g.foes.push({ x: e.x, y: e.y + 8, vx: Math.cos(e.ta) * 560, vy: Math.sin(e.ta) * 560, life: 0.85, dmg: 20, r: 14, kind: 'fissure', pierce: true, trail: 'BURN', c: '#ff6a2a' });
          g.emit('fissure', { x: e.x, y: e.y, a: e.ta }); e.state = 'recover'; e.st = 1.1; e.burst = 0.35;
        }
      } else if (e.state === 'recover') {
        if (e.burst > 0) { e.burst -= dt; if (e.burst <= 0) { for (let k = 0; k < 6; k++) { const a = e.ta + Math.PI / 6 + k * TAU / 6; g.foes.push({ x: e.x, y: e.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 2, dmg: 12, r: 8, kind: 'ember', c: '#ffb04a' }); } g.emit('emberRing', { x: e.x, y: e.y }); } }
        if (e.st <= 0) { e.state = 'move'; e.st = 3.6 + g.rand() * 1.2; }
      }
      break;
    }
    // ---------- cung điện ----------
    case 'arcanist': {
      if (e.state === 'move') {
        keepDist(g, e, d, dp, toP, 300, dt);
        if (ready(520)) { e.state = 'tele'; e.st = 0.5; }
      } else if (e.state === 'tele' && e.st <= 0) {
        e.alt = !e.alt;
        if (e.alt) { // ấn máu: lõi an toàn ở tâm, sóng lan ra ngoài sau khi nổ
          const [x, y] = leadPt(g, 0.6, 20);
          H(g, { kind: 'circle', x, y, r: 150, hole: 44, t: 1.2, dmg: 20 * ds, color: '#ff2a4a', sty: 'blood',
            after: () => H(g, { kind: 'ring', x, y, rr: 150, speed: 260, max: 300, thick: 20, dmg: 12 * ds, t: 0.3, pre: true, shockPre: true, color: '#ff2a4a', sty: 'blood' }) });
          e.state = 'move'; e.st = 3.4 + g.rand();
        } else { // hai quả cầu laser xoay quanh pháp sư
          const dir = e.id % 2 ? 1 : -1;
          H(g, { kind: 'beam', owner: e, x: e.x, y: e.y, a: toP + Math.PI / 2, n: 2, len: 240, width: 22, t: 0.7, dur: 2.2, spin: 1.1 * dir, hitCd: 0, dmg: 14 * ds, color: '#ff3a5a', sty: 'blood' });
          e.state = 'beam'; e.st = 2.9;
        }
        g.emit('cast', { x: e.x, y: e.y });
      } else if (e.state === 'beam') { if (dp > 90) mv(g, e, toP, 40, dt); if (e.st <= 0) { e.state = 'move'; e.st = 3.0 + g.rand(); } }
      break;
    }
    case 'halberd': {
      if (e.state === 'move') {
        // đội hình hàng ngang: giữ vị trí lệch vuông góc so với hướng tới người chơi
        const o = e.sqo || 0, tx = p.x - Math.cos(toP) * 190 - Math.sin(toP) * o, ty = p.y - Math.sin(toP) * 190 + Math.cos(toP) * o, dd = dist(e.x, e.y, tx, ty);
        if (dd > 18) mv(g, e, Math.atan2(ty - e.y, tx - e.x), d.speed * (dd > 120 ? 1 : 0.7), dt);
        contact(g, e, d, dp, toP, 1.1);
        if (ready(270)) {
          e.alt = !e.alt; e.ta = toP;
          if (e.alt) { e.state = 'tele'; e.st = 0.55; H(g, { kind: 'arc', x: e.x, y: e.y, a: toP, r: 150, arc: 2.6, t: 0.55, dmg: 18 * ds, color: '#ffd36b', sty: 'gold' }); }
          else { e.state = 'throw'; e.st = 0.4; }
        }
      } else if (e.state === 'tele' && e.st <= 0) { e.state = 'sweep'; e.st = 0.28; g.emit('sweep', { x: e.x, y: e.y, a: e.ta }); }
      else if (e.state === 'sweep' && e.st <= 0) {
        const [lx, ly] = leadPt(g, 0.25), a = Math.atan2(ly - e.y, lx - e.x);
        g.foes.push({ x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20 - 6, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, life: 0.75, dmg: 16, r: 16, kind: 'lightwave', pierce: true, c: '#ffd36b' });
        g.emit('lightwave', { x: e.x, y: e.y, a }); e.state = 'move'; e.st = 2.8 + g.rand();
      }
      else if (e.state === 'throw' && e.st <= 0) {
        const [lx, ly] = leadPt(g, 0.4), a = Math.atan2(ly - e.y, lx - e.x);
        g.foes.push({ x: e.x, y: e.y - 6, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, life: 2.4, dmg: 14, r: 10, kind: 'glaive', pierce: true, ret: { t: 0.6, o: e }, c: '#ffd36b' });
        g.emit('glaive', { x: e.x, y: e.y }); e.state = 'move'; e.st = 2.8 + g.rand();
      }
      break;
    }
  }
}

// đạn quái đặc biệt: bám đuổi, boomerang (gọi trong updateFoeShots trước khi di chuyển)
export function steerFoe(g, f, dt) {
  const p = g.p;
  if (f.home) { const cur = Math.atan2(f.vy, f.vx), sp = Math.hypot(f.vx, f.vy), want = Math.atan2(p.y - f.y, p.x - f.x), na = cur + Math.max(-f.home * dt, Math.min(f.home * dt, angDiff(want, cur))); f.vx = Math.cos(na) * sp; f.vy = Math.sin(na) * sp; }
  if (f.ret) {
    f.age = (f.age || 0) + dt; f.spin = (f.spin || 0) + dt * 18;
    if (f.age < f.ret.t) { const k = Math.exp(-1.6 * dt); f.vx *= k; f.vy *= k; }
    else {
      const o = f.ret.o; if (!f.back) { f.back = true; f.hitP = false; } // lượt về đánh trúng lại được
      if (!o || o.dead) { f.life = Math.min(f.life, 0.3); return; }
      const a = Math.atan2(o.y - f.y, o.x - f.x), k = Math.min(1, dt * 4.5); f.vx += (Math.cos(a) * 480 - f.vx) * k; f.vy += (Math.sin(a) * 480 - f.vy) * k;
      if (dist(f.x, f.y, o.x, o.y) < 22) { f.life = 0; f.landed = true; f.caught = true; }
    }
  }
}
// đạn bào tử vỡ thành bào tử nhỏ
export function splitFoe(g, f) {
  if (!f.split) return;
  const base = Math.atan2(f.vy, f.vx);
  for (let k = 0; k < f.split; k++) { const a = base + k * TAU / f.split; g.foes.push({ x: f.x + Math.cos(a) * 24, y: f.y + Math.sin(a) * 24, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, life: 0.9, dmg: f.dmg * 0.5, r: 5, kind: 'sporelet', c: f.c }); }
  g.emit('sporeSplit', { x: f.x, y: f.y });
}
