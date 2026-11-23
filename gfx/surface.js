// Vẽ mặt đất động (lửa, nước, băng, nham, đá đen, độc, cháy xém, bụi gai) theo ô 24 đơn vị, có hoạt ảnh pixel.
// Trả về nguồn sáng cho lửa/nham. Chỉ vẽ các ô trong khung nhìn.
import { WPP, hash2 } from './pixel.js';
import { SC } from '../env.js';

const P = WPP;
export function drawSurface(ctx, surf, view, t, lights) {
  if (!surf || !surf.cells.size) return;
  const x0 = view.ox - SC, x1 = view.ox + view.w + SC, y0 = view.oy - SC, y1 = view.oy + view.h + SC;
  let nl = 0;
  for (const c of surf.cells.values()) {
    const X = c.i * SC, Y = c.j * SC; if (X < x0 || X > x1 || Y < y0 || Y > y1) continue;
    const h = hash2(c.i, c.j, 17), fade = Math.min(1, c.t / 1.2);
    switch (c.type) {
      case 'fire': {
        ctx.fillStyle = 'rgba(60,16,6,.45)'; ctx.fillRect(X, Y, SC, SC);
        for (let k = 0; k < 4; k++) { const fx = X + 3 + ((h * 97 + k * 7) % 6) * 3, fl = 2 + Math.round((Math.sin(t * 16 + k * 2 + h * 9) + 1) * 1.6); ctx.fillStyle = '#ff5a1a'; ctx.fillRect(fx, Y + SC - fl * P, P, fl * P); if (fl > 2) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(fx, Y + SC - (fl - 1) * P, P, (fl - 2) * P); } }
        if (nl++ % 3 === 0) lights.push({ x: X + SC / 2, y: Y + SC / 2, r: 70, i: 0.8, c: '#ff7a3c', glow: 0.18 });
        break;
      }
      case 'water': {
        ctx.globalAlpha = 0.55 * fade; ctx.fillStyle = '#3a7ac8'; ctx.fillRect(X, Y, SC, SC); ctx.globalAlpha = 0.8 * fade;
        ctx.fillStyle = '#a8d8ff'; const r = Math.floor(t * 2 + h * 6) % 4; ctx.fillRect(X + 3 + r * 3, Y + 6 + (h * 3 | 0) * 3, 9, P); ctx.globalAlpha = 1; break;
      }
      case 'ice': {
        ctx.globalAlpha = 0.7 * fade; ctx.fillStyle = '#bfe8ff'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#e8f8ff'; ctx.fillRect(X + 3, Y + 3, 9, P); ctx.fillRect(X + 3, Y + 3, P, 6);
        if (Math.sin(t * 3 + h * 20) > 0.92) { ctx.fillStyle = '#ffffff'; ctx.fillRect(X + 12, Y + 9, P, P); } ctx.globalAlpha = 1; break;
      }
      case 'lava': {
        ctx.fillStyle = '#c8380e'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#ff8a2a'; ctx.fillRect(X + 3, Y + 6, 12, 6);
        const b = (t * 1.5 + h * 5) % 1; if (b < 0.4) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(X + 6 + (h * 4 | 0) * 3, Y + 9 - Math.round(b * 10) * 0, P * 2, P * 2); }
        if (nl++ % 3 === 0) lights.push({ x: X + SC / 2, y: Y + SC / 2, r: 80, i: 0.8, c: '#ff6a2a', glow: 0.2 });
        break;
      }
      case 'fault': {   // hố nứt địa tầng: đất lật, phiến granite vỡ, sỏi, khe hổ phách nối liền giữa các ô, viền #09080f
        const same = (dx, dy) => surf.at(X + SC / 2 + dx * SC, Y + SC / 2 + dy * SC) === 'fault', P2 = P * 2;
        ctx.fillStyle = '#292524'; ctx.fillRect(X, Y, SC, SC);
        ctx.fillStyle = '#44403C'; ctx.fillRect(X + ((h * 5 | 0) % 4) * P, Y + P, P2, P); ctx.fillRect(X + P * 4, Y + ((h * 7 | 0) % 3 + 4) * P, P2, P);
        if (h < 0.55) { const sx = X + ((h * 11 | 0) % 4) * P, sy = Y + ((h * 13 | 0) % 3 + 2) * P; ctx.fillStyle = '#09080f'; ctx.fillRect(sx - P, sy - P, P * 5, P * 4); ctx.fillStyle = '#57534E'; ctx.fillRect(sx, sy, P * 3, P2); ctx.fillStyle = '#78716C'; ctx.fillRect(sx, sy, P * 3, P); }   // phiến granite nhô lên
        ctx.fillStyle = '#A8A29E'; ctx.fillRect(X + ((h * 17 | 0) % 7) * P, Y + 6 * P, P, P); if (h > 0.4) { ctx.fillStyle = '#78716C'; ctx.fillRect(X + ((h * 23 | 0) % 6 + 1) * P, Y + ((h * 29 | 0) % 6 + 1) * P, P, P); }   // sỏi
        const glow = Math.sin(t * 2.4 + h * 6) > 0.2 ? '#F59E0B' : '#D97706', cx = X + 4 * P, cy = Y + 4 * P;
        const link = (dx, dy) => same(dx, dy) && hash2(c.i + Math.min(0, dx), c.j + Math.min(0, dy), dx ? 41 : 43) < 0.38, L = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => link(dx, dy));   // khe nối ngẫu nhiên → mạng nứt không đều
        if (L.length || h < 0.18) { ctx.fillStyle = '#1c1917'; ctx.fillRect(cx - P, cy - P, P * 3, P * 3); ctx.fillStyle = glow; ctx.fillRect(cx, cy, P, P); }
        for (const [dx, dy] of L) for (let k = 1; k <= 4; k++) { const jx = dy ? ((k + (h * 4 | 0)) % 3 === 0 ? P : 0) : 0, jy = dx ? ((k + (h * 4 | 0)) % 3 === 0 ? P : 0) : 0, px = cx + dx * k * P + jx, py = cy + dy * k * P + jy; ctx.fillStyle = '#1c1917'; ctx.fillRect(px - (dy ? P : 0), py - (dx ? P : 0), dy ? P * 3 : P, dx ? P * 3 : P); ctx.fillStyle = glow; ctx.fillRect(px, py, P, P); }   // khe hổ phách nối sang ô kề
        ctx.fillStyle = '#09080f'; if (!same(0, -1)) ctx.fillRect(X, Y, SC, P); if (!same(0, 1)) ctx.fillRect(X, Y + SC - P, SC, P); if (!same(-1, 0)) ctx.fillRect(X, Y, P, SC); if (!same(1, 0)) ctx.fillRect(X + SC - P, Y, P, SC);
        if (!same(0, -1)) { ctx.fillStyle = '#57534E'; ctx.fillRect(X + P, Y + P, SC - P2, P); }   // mép đất lật phía trên
        if (nl++ % 4 === 0) lights.push({ x: cx, y: cy, r: 46, i: 0.5, c: '#D97706', glow: 0.1 });
        break;
      }
      case 'obsidian': {
        ctx.fillStyle = '#16121a'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#2e2836'; ctx.fillRect(X + 3, Y + 3, 9, P);
        const heat = Math.max(0, Math.min(1, (c.t - 14) / 8)); if (heat > 0) { ctx.globalAlpha = heat; ctx.fillStyle = '#ff5a1a'; ctx.fillRect(X + 6, Y + 12, 9, P); ctx.fillRect(X + 12, Y + 9, P, 6); ctx.globalAlpha = 1; }
        break;
      }
      case 'poison': {
        for (let k = 0; k < 3; k++) { const a = t * 0.8 + h * 6 + k * 2.1, px = X + SC / 2 + Math.cos(a) * 6, py = Y + SC / 2 + Math.sin(a) * 4 - k * 3; ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = k === 1 ? '#a8ff5a' : '#6ac83a'; ctx.beginPath(); ctx.arc(px, py, 12 - k * 2, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1; if (h < 0.08) { ctx.fillStyle = '#e8ffd0'; ctx.fillRect(X + 9, Y + 6, 6, 6); ctx.fillStyle = '#1a2a10'; ctx.fillRect(X + 9, Y + 9, P, P); ctx.fillRect(X + 12, Y + 9, P, P); }
        break;
      }
      case 'scorched': { ctx.globalAlpha = 0.55 * Math.min(1, c.t / 4); ctx.fillStyle = '#1a1410'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#3a2e26'; ctx.fillRect(X + (h * 5 | 0) * 3, Y + 6, 6, P); if (c.t > 20 && Math.sin(t * 6 + h * 30) > 0.8) { ctx.fillStyle = '#ff7a3c'; ctx.fillRect(X + 9, Y + 12, P, P); } ctx.globalAlpha = 1; break; }
      case 'mud': { ctx.globalAlpha = 0.8 * fade; ctx.fillStyle = '#5a3e24'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#7a5a36'; ctx.fillRect(X + 3 + (h * 4 | 0) * 3, Y + 6, 6, P); ctx.fillStyle = '#3a2614'; ctx.fillRect(X + 12, Y + 15, 6, P); ctx.globalAlpha = 1; break; }
      case 'rubble': { ctx.globalAlpha = fade; for (let k = 0; k < 4; k++) { const rx = X + ((h * 13 + k * 5) % 6) * 3, ry = Y + ((h * 7 + k * 4) % 6) * 3; ctx.fillStyle = '#3a3630'; ctx.fillRect(rx, ry + P, 6, P); ctx.fillStyle = k % 2 ? '#8a8270' : '#a8a08a'; ctx.fillRect(rx, ry, 6, P); } ctx.globalAlpha = 1; break; }
      case 'sand': { ctx.globalAlpha = 0.6 * fade; ctx.fillStyle = '#d8c08a'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#f0dca8'; const sx = (t * 30 + h * 40) % SC; ctx.fillRect(X + sx, Y + 9, 6, P); ctx.fillRect(X + (sx + 12) % SC, Y + 18, 3, P); ctx.globalAlpha = 1; break; }
      case 'magma': { ctx.fillStyle = '#8a2a0a'; ctx.fillRect(X, Y, SC, SC); ctx.fillStyle = '#ff7a2a'; ctx.fillRect(X + 3, Y + 9, 15, P); if ((t * 2 + h * 5) % 1 < 0.3) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(X + 9, Y + 6, 6, 6); } if (nl++ % 3 === 0) lights.push({ x: X + SC / 2, y: Y + SC / 2, r: 60, i: 0.7, c: '#ff6a2a', glow: 0.18 }); break; }
      case 'thorn': { ctx.globalAlpha = fade; ctx.fillStyle = '#3a4a1e'; for (let k = 0; k < 4; k++) ctx.fillRect(X + ((h * 11 + k * 5) % 6) * 3, Y + ((h * 7 + k * 3) % 6) * 3, 6, P); ctx.fillStyle = '#c8d8a0'; ctx.fillRect(X + 9, Y + 6, P, P); ctx.fillRect(X + 3, Y + 15, P, P); ctx.globalAlpha = 1; break; }
    }
  }
}

// bẫy của bản đồ: dấu trên sàn, bóng báo trước, vật rơi / cột phun
export function drawMapHazards(ctx, list, t, warn, lights) {
  for (const h of list) {
    const ph = (t + h.off) % h.period, left = h.period - ph, k = Math.max(0, 1 - left / warn);
    if (h.kind === 'chandelier') {
      ctx.strokeStyle = 'rgba(200,40,40,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x - 12, h.y - 6); ctx.lineTo(h.x + 12, h.y + 6); ctx.moveTo(h.x + 12, h.y - 6); ctx.lineTo(h.x - 12, h.y + 6); ctx.stroke();
      if (left < warn) {
        ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.4})`; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r * (0.4 + k * 0.6), h.r * 0.5 * (0.4 + k * 0.6), 0, 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(255,70,50,${0.4 + k * 0.6})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.5, 0, 0, 7); ctx.stroke();
        if (left < 0.35) { const fy = h.y - left / 0.35 * 300; ctx.fillStyle = '#c8983a'; ctx.fillRect(h.x - 24, fy - 6, 48, 6); ctx.fillStyle = '#ffe27a'; for (let i = -2; i <= 2; i++) ctx.fillRect(h.x + i * 9 - 3, fy, 6, 9); }
      }
      if (ph < 0.6) { ctx.fillStyle = `rgba(200,150,60,${0.6 - ph})`; for (let i = 0; i < 6; i++) ctx.fillRect(h.x - 30 + i * 12, h.y - 3 + (i % 2) * 6, 6, 6); }
    } else {
      ctx.fillStyle = '#1a0e0a'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 15, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff5a1a'; ctx.fillRect(h.x - 6, h.y - 3, 12, 3);
      if (left < warn) {
        ctx.strokeStyle = `rgba(255,120,40,${0.4 + k * 0.6})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.5, 0, 0, 7); ctx.stroke();
        if (Math.sin(t * 30) > 0) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(h.x - 3 + (Math.random() - 0.5) * 18, h.y - 6 - k * 12, 6, 6); }
      }
      if (ph < 0.7) { const hh = (1 - ph / 0.7) * 200; ctx.fillStyle = 'rgba(255,90,26,.75)'; ctx.fillRect(h.x - 15, h.y - hh, 30, hh); ctx.fillStyle = 'rgba(255,226,122,.9)'; ctx.fillRect(h.x - 6, h.y - hh, 12, hh); lights.push({ x: h.x, y: h.y - 30, r: 150, i: 1, c: '#ff7a3c', glow: 0.3 }); }
      else if (left < warn) lights.push({ x: h.x, y: h.y, r: 60 + k * 50, i: 0.7, c: '#ff5a1a', glow: 0.2 });
    }
  }
}
