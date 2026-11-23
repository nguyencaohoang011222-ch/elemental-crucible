// Hiệu ứng pixel của Cursed Relics: bom Hot Potato, hồn ma, dơi, kiếm boomerang, hố đen, dấu Doom, điện tích Static.
import { WPP, sn } from './pixel.js';

const px = (ctx, x, y, rows, pal) => { rows.forEach((r, j) => [...r].forEach((ch, i) => { const c = pal[ch]; if (!c) return; ctx.fillStyle = c; ctx.fillRect(sn(x) + (i - r.length / 2) * WPP, sn(y) + (j - rows.length / 2) * WPP, WPP, WPP); })); };
const BOMB = ['...ab', '..o.a', '.ooo.', 'ooRoo', 'oRRRo', 'ooooo', '.ooo.'];
const GHOST = ['.ooo.', 'owwwo', 'wbwbw', 'wwwww', 'wwwww', 'w.w.w'];
const BAT = ['o.....o', 'oo.r.oo', 'ooooooo', '.o.o.o.'];
const SWORD = ['...w...', '...w...', '..gwg..', 'wwwowww', '..gwg..', '...w...', '...w...'];

export function drawRelics(ctx, sim, t) {
  const fx = sim.relicFx || [], p = sim.p;
  for (const e of sim.enemies) if (!e.dead && e.doomT > 0) {                     // Doom: hộp sọ tím nhấp nháy trên đầu
    if (Math.floor(t * 6) % 3 === 0) continue;
    px(ctx, e.x, e.y - e.r - 26, ['.ppp.', 'pkpkp', 'ppppp', '.p.p.'], { p: '#b47ae8', k: '#1a0a2a' });
  }
  for (const f of fx) {
    if (f.type === 'potato') { const lit = Math.floor(t * (f.t < 1 ? 14 : 6)) % 2;
      px(ctx, f.x, f.y - 46 - Math.abs(Math.sin(t * 8)) * 6, BOMB, { o: '#1a1418', R: f.t < 1 ? '#ff3a2a' : '#7a2a2a', a: lit ? '#ffd36b' : '#ff7a2a', b: '#ffffff' });
      ctx.fillStyle = '#ffd36b'; ctx.font = '700 12px monospace'; ctx.fillText(Math.ceil(f.t), sn(f.x) + 10, sn(f.y) - 52); }
    else if (f.type === 'ghost') { ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t * 9); px(ctx, f.x, f.y + Math.sin(t * 7 + f.x) * 3, GHOST, { o: '#0b0a14', w: '#d8e8ff', b: '#3a2a6a' }); ctx.globalAlpha = 1; }
    else if (f.type === 'bat') { const fl = Math.floor(t * 12) % 2; px(ctx, f.x, f.y, fl ? BAT : ['.......', 'o..r..o', 'ooooooo', 'o.o.o.o'], { o: '#2a1424', r: '#ff3a3a' }); }
    else if (f.type === 'blade') { ctx.save(); ctx.translate(sn(f.x), sn(f.y)); ctx.rotate(Math.round(f.spin / (Math.PI / 4)) * Math.PI / 4); ctx.translate(-sn(f.x), -sn(f.y)); px(ctx, f.x, f.y, SWORD, { w: '#e6eef8', g: '#e6c36a', o: '#5a3a1a' }); ctx.restore(); }
    else if (f.type === 'hole') {   // hố đen: vành hút chấm tím, hạt xoắn vào tâm, đĩa bồi tụ xoay, lõi đen viền tím
      const T = f.T || 1.5, R = f.R || 130, sc = Math.min(1, (T - f.t) / 0.2) * Math.min(1, f.t / 0.3), big = R >= 120;
      const n = Math.floor(R * 6.283 / (WPP * 3));
      for (let i = 0; i < n; i += 2) { const a = i / n * 6.283 + t * 0.9; ctx.fillStyle = i % 4 ? '#3a2468' : '#7a4ad8'; ctx.fillRect(sn(f.x + Math.cos(a) * R * sc), sn(f.y + Math.sin(a) * R * 0.55 * sc), WPP, WPP); }
      for (let i = 0; i < 26; i++) { const u = (t * 1.3 + i * 0.137) % 1, r = R * (1 - u) * sc, a = i * 2.39 + t * 3 + u * 3.2; ctx.fillStyle = u > 0.75 ? '#ffffff' : u > 0.45 ? '#c8a8ff' : '#7a4ad8'; const s2 = u > 0.6 ? WPP : WPP * 2; ctx.fillRect(sn(f.x + Math.cos(a) * r), sn(f.y + Math.sin(a) * r * 0.55), s2, s2); }
      const cr = (big ? 9 : 7) * WPP * sc;
      for (const [rr, w, c1, c2, sp] of [[cr + 5 * WPP, 2, '#5a2aa8', '#c8a8ff', 2.2], [cr + 2 * WPP, 1, '#9a6aff', '#ffffff', -3.4]]) { const m = Math.max(12, Math.floor(rr * 6.283 / (WPP * 2))); for (let i = 0; i < m; i++) { const a = i / m * 6.283 + t * sp, on = (i + Math.floor(t * 12)) % 5; if (on === 4) continue; ctx.fillStyle = on < 2 ? c2 : c1; ctx.fillRect(sn(f.x + Math.cos(a) * rr), sn(f.y + Math.sin(a) * rr * 0.55), WPP * w, WPP * w); } }
      for (let dy = -cr; dy <= cr; dy += WPP) { const w = sn(Math.sqrt(Math.max(0, cr * cr - dy * dy))); if (w <= 0) continue; ctx.fillStyle = '#9a6aff'; ctx.fillRect(sn(f.x) - w - WPP, sn(f.y + dy * 0.6), w * 2 + 2 * WPP, WPP); ctx.fillStyle = '#05040a'; ctx.fillRect(sn(f.x) - w, sn(f.y + dy * 0.6), w * 2, WPP); }
      ctx.fillStyle = '#c8a8ff'; ctx.fillRect(sn(f.x) - WPP, sn(f.y) - WPP, WPP, WPP);
    }
  }
  if (p && p.mods && p.mods.static && p.static > 0) for (let i = 0; i < p.static; i++) {   // Static: chấm điện quanh chân
    const a = i / 10 * Math.PI * 2 + t * 3; ctx.fillStyle = i % 2 ? '#bff0ff' : '#7ef0ff'; ctx.fillRect(sn(p.x + Math.cos(a) * 22), sn(p.y + 8 + Math.sin(a) * 8), WPP, WPP); }
  if (p && p.ocT > 0 && Math.floor(t * 10) % 2) { ctx.strokeStyle = 'rgba(255,170,60,.6)'; ctx.lineWidth = WPP; ctx.strokeRect(sn(p.x) - 18, sn(p.y) - 40, 36, 52); }   // Overclock
}
