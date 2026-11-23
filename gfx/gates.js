// Cổng sang biome kế — kiến trúc phẳng nhìn từ trên xuống, nằm sát mặt đất ở đầu bắc đấu trường boss.
// Mỗi cổng gồm 3 lớp (cùng khung W×H, neo AX/AY = ngưỡng cửa):
//   path  : lối mòn dẫn vào cổng, không viền (hoà vào nền)
//   floor : miệng hầm / cầu thang / khe nứt / thảm — lún vào mặt đất, viền #09080f 1px
//   props : phần đứng (cột đèn, trụ đá, cổng sắt) — sắp theo chiều sâu cùng nhân vật
// k = mức mở (0 niêm phong → 1 mở), f = khung hoạt ảnh 0..5.
//  dungeon : hầm mỏ khung gỗ đóng ván (4 khung mở: nguyên ván → nứt → ván trượt ra → bậc gỗ xuống, sương bào tử)
//  frost   : cầu thang đá xẻ phẳng đi lên, nắp đá trượt về bắc, ánh ngày + tuyết tràn xuống các bậc trên
//  volcano : khe nứt obsidian toác ra giữa nền tuyết, mép basalt, bậc đá xuống, than hồng bay lên
//  palace  : 2 trụ đá vuông + chậu sét, cổng sắt đen viền vàng mở rộng, thảm đỏ chạy về bắc
import { Grid, dith } from './pixel.js';

export const GATE = { W: 80, H: 64, AX: 40, AY: 40 };
const { W, H, AX, AY } = GATE;
const OUT = '#09080f';
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const sh = (pal, v, x, y) => { const t = Math.max(0, Math.min(0.999, v)) * (pal.length - 1), b = Math.floor(t); return pal[Math.min(pal.length - 1, b + (dith(x, y, t - b) ? 1 : 0))]; };
const ease = k => k * k * (3 - 2 * k);
const DX = x => x + 0.5 - AX;

// lối mòn từ ngưỡng cửa đi về nam, mép tan dần
function trail(g, pal, y0 = AY + 1, hw0 = 6) {
  for (let y = y0; y < H; y++) { const t = (y - y0) / (H - y0), hw = hw0 - t * 2 + (hash(y >> 1, 3) - 0.5) * 2;
    for (let x = 0; x < W; x++) { const d = Math.abs(DX(x)); if (d > hw) continue; if (d > hw - 2 && hash(x, y) < 0.3 + t * 0.6) continue; if (hash(x * 7, y * 3) < t * 0.35) continue;
      g.set(x, y, hash(x * 3, y * 5) < 0.06 ? pal[3] : sh(pal, 0.35 + hash(x >> 1, y >> 1) * 0.4, x, y)); } }
}

const T = {
  // ---------- 1. HẦM MỎ ----------
  dungeon: {
    trail: ['#4a3420', '#5e4228', '#735234', '#9a8a70'],
    floor(g, k, f) {
      const wood = ['#3a2414', '#5a3a1e', '#7a5230', '#9a6a3e'], x0 = 29, x1 = 50, y0 = 21, y1 = 40, st = k < 0.25 ? 0 : k < 0.5 ? 1 : k < 0.85 ? 2 : 3;
      // lòng hầm: bậc gỗ đi xuống phía bắc, càng sâu càng tối
      for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = x0 + 2; x <= x1 - 2; x++) {
        const d = (y1 - 2 - y) / (y1 - y0 - 4), r = (y1 - 2 - y) % 3;
        let c = d > 0.82 ? '#0a0810' : r === 0 ? sh(['#140e0a', '#24180e', '#3a2814', '#5a3e22', '#6a4828'], 1 - d, x, y) : r === 1 ? '#140e0a' : '#0e0a08';
        if (x === x0 + 2 || x === x1 - 2) c = '#120c08';
        if (st === 3 && d > 0.55 && dith(x + f, y, (d - 0.55) * 1.2)) c = '#22402c';   // sương đọng dưới đáy
        g.set(x, y, c);
      }
      // ván đóng: 0 nguyên · 1 nứt vỡ · 2 trượt sang hai bên
      if (st < 3) for (let p = 0; p < 5; p++) {
        const py = y0 + 2 + p * 3 + (p > 2 ? 1 : 0), sl = st === 2 ? (p % 2 ? 1 : -1) * (6 + p * 1.5) : 0;
        if (st === 2 && p === 2) continue;
        for (let y = py; y < py + 2; y++) for (let x = x0 + 1; x <= x1 - 1; x++) {
          const xs = Math.round(x - sl); if (xs < x0 + 1 || xs > x1 - 1) continue;
          if (st >= 1 && (p === 1 || p === 3) && Math.abs(xs - 40 - (p === 3 ? 3 : -2)) < 2 + (y - py)) continue;   // chỗ ván gãy
          g.set(x, y, (xs === x0 + 2 || xs === x1 - 2) && y === py ? '#8a8a96' : y === py ? wood[3] : hash(xs, p * 9 + y) < 0.15 ? wood[1] : wood[2]);
        }
        if (st === 1) for (let s = 0; s < 3; s++) g.set(40 + (p - 2) * 3 + s, py + 2, wood[3]);   // dăm gỗ
      }
      // khung gỗ vuông chìm vào nền
      for (let x = x0; x <= x1; x++) { g.set(x, y0, wood[3]); g.set(x, y0 + 1, hash(x, 1) < 0.2 ? wood[1] : wood[2]); g.set(x, y1 - 1, wood[2]); g.set(x, y1, wood[1]); }
      for (let y = y0; y <= y1; y++) { g.set(x0, y, wood[2]); g.set(x0 + 1, y, wood[1]); g.set(x1 - 1, y, wood[1]); g.set(x1, y, wood[0]); }
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) g.set(x, y, '#8a8a96');
      if (st === 3) for (let i = 0; i < 16; i++) { const hy = hash(i, 7), x = Math.round(x0 + 3 + hash(i, 3) * 16 + Math.sin((f / 6 + hy) * 6.283)), y = Math.round(y1 - 3 - ((f / 6 * 0.5 + hy) % 1) * 22); g.set(x, y, ['#7aff9a', '#b47aff', '#5ad07a', '#9a6aff'][i % 4]); }   // sương bào tử bốc lên
    },
    props(g, k, f) {
      const wood = ['#3a2414', '#5a3a1e', '#7a5230', '#9a6a3e'];
      for (let y = 14; y <= AY; y++) { g.set(54, y, wood[3]); g.set(55, y, wood[1]); }   // cột đèn
      for (let x = 50; x <= 56; x++) { g.set(x, 14, wood[3]); g.set(x, 15, wood[1]); }
      g.set(51, 16, '#5a4a3a'); g.set(51, 17, '#5a4a3a');
      const lit = k > 0.15, fl = ['#ffd36b', '#ffe9a0', '#ffb84a', '#ffd36b', '#fff0b0', '#ffb84a'][f];
      g.rect(50, 18, 3, 1, '#4a4a52'); g.rect(50, 19, 3, 3, '#2a2830'); g.set(51, 20, lit ? fl : '#3a3628'); if (lit) g.set(51, 19, '#fff8d0'); g.rect(50, 22, 3, 1, '#4a4a52');
      g.rect(53, AY - 1, 4, 2, '#4a3e34');   // đá kê chân cột
    }
  },
  // ---------- 2. CẦU THANG ĐÁ LÊN MẶT BĂNG ----------
  frost: {
    trail: ['#2a2830', '#36343e', '#44424e', '#6a6878'],
    floor(g, k, f) {
      const x0 = 27, x1 = 52, y0 = 13, y1 = 40, sx0 = 31, sx1 = 48, wall = ['#2c3446', '#404a60', '#56627c', '#7c88a0'];
      // ánh ngày tràn qua lối ra phía bắc
      for (let y = 5; y < y0; y++) for (let x = sx0 - 1; x <= sx1 + 1; x++) { if (y < 5 + Math.round(hash(x >> 1, 4) * 3)) continue; g.set(x, y, dith(x, y, (y - 5) / 8) ? '#e8f8ff' : '#ffffff'); }
      // bậc đá đi lên phía bắc: càng lên càng sáng, tuyết tràn xuống các bậc trên
      for (let y = y0; y <= y1 - 2; y++) for (let x = sx0; x <= sx1; x++) {
        const t = (y1 - 2 - y) / (y1 - 2 - y0), r = (y1 - 2 - y) % 3, snowY = y0 + 7 + Math.round(Math.sin(x * 0.8) * 1.5 + hash(x, 2) * 2);
        let c = r === 0 ? sh(['#3a4458', '#5a6680', '#8a98b0', '#c8d4e4', '#f0f6ff'], 0.15 + t * 0.85, x, y) : sh(['#1c2230', '#2c3446', '#4a5670', '#8a98b0'], t * 0.9, x, y);
        if (y < snowY) c = r === 0 || dith(x, y, 0.6) ? '#ffffff' : '#d8e8f8';
        g.set(x, y, c);
      }
      // nắp đá khắc phù văn trượt về bắc
      const lb = Math.round(y1 - 2 - ease(k) * (y1 - y0 + 1));
      for (let y = y0; y <= lb; y++) for (let x = sx0; x <= sx1; x++) {
        const dx = x + 0.5 - 40, dy = y + 0.5 - (lb - 7), rr = Math.hypot(dx, dy * 1.3);
        g.set(x, y, y >= lb - 1 ? (y === lb ? '#1c2230' : '#56627c') : Math.abs(rr - 5) < 0.7 || (Math.abs(dx) < 0.6 && rr < 5) || (Math.abs(dy) < 0.6 && rr < 5) ? (k > 0 ? ((f % 3) ? '#5af0ff' : '#e0ffff') : '#2a4a5a') : sh(['#2c3446', '#3a4458', '#4a5468'], 0.4 + hash(x >> 2, y >> 2) * 0.4, x, y));
      }
      // tường đá hai bên + gờ trước
      for (let y = y0; y <= y1; y++) for (const [a, b] of [[x0, sx0 - 1], [sx1 + 1, x1]]) for (let x = a; x <= b; x++) {
        const bx = (x - a), row = Math.floor((y - y0) / 3), mor = (y - y0) % 3 === 2 || (bx === 2 && row % 2);
        g.set(x, y, y < y0 + 8 && (y - y0) % 3 === 0 ? '#e8f4ff' : mor ? '#1c2230' : (y - y0) % 3 === 0 ? wall[3] : sh(wall, 0.5 + hash(x, row) * 0.3, x, y));
      }
      for (let x = x0; x <= x1; x++) { g.set(x, y1 - 1, '#7c88a0'); g.set(x, y1, '#404a60'); }
      if (k > 0.6) for (let i = 0; i < 10; i++) { const x = Math.round(sx0 + hash(i, 11) * 17), y = Math.round(y0 + ((f / 6 + hash(i, 5)) % 1) * 24); g.set(x, y, '#ffffff'); }   // tuyết bay xuống bậc
    },
    props(g) {
      for (const x0 of [24, 52]) { g.rect(x0, AY - 7, 4, 7, '#404a60'); g.rect(x0, AY - 7, 4, 1, '#7c88a0'); g.rect(x0 + 3, AY - 6, 1, 6, '#2c3446'); g.rect(x0, AY - 9, 4, 2, '#e8f4ff'); g.set(x0 + 1, AY - 10, '#ffffff'); g.set(x0 + 2, AY - 10, '#ffffff'); }   // trụ đá nhỏ phủ tuyết
    }
  },
  // ---------- 3. KHE NỨT OBSIDIAN ----------
  volcano: {
    trail: ['#8a96a8', '#a8b4c4', '#c4d0dc', '#5a6070'],
    floor(g, k, f) {
      const s = 0.1 + 0.9 * ease(k), rows = [];
      for (let y = 11; y <= AY; y++) { const u = (y - 26) / 15, hw0 = 15 * Math.pow(Math.max(0, 1 - u * u), 0.8), jag = (hash(y >> 1, 5) - 0.5) * 4 + Math.sin(y * 1.3) * 1.5, cxo = Math.sin(y * 0.45) * 2.5 + (hash(y >> 2, 9) - 0.5) * 2; rows[y] = { c: AX - 0.5 + cxo, hw: Math.max(0.6, hw0 * s + jag * s * 0.7) }; }
      const inside = (x, y) => { const r = rows[y]; return !!r && Math.abs(x - r.c) <= r.hw; };
      for (let y = 11; y <= AY; y++) for (let x = 0; x < W; x++) {
        const r = rows[y], d = Math.abs(x - r.c), e = (r.hw - d) / Math.max(1, r.hw);
        if (d > r.hw) { if (d < r.hw + 1.6 && hash(x * 3, y) < 0.55) g.set(x, y, hash(x, y * 7) < 0.5 ? '#2a2630' : '#4a4652'); else if (d < r.hw + 3.2 && dith(x, y, 0.45)) g.set(x, y, '#8a96a8'); continue; }   // đá vụn + tuyết tan quanh mép
        if (!inside(x, y - 2)) { g.set(x, y, inside(x, y - 1) ? '#44343a' : '#221a1e'); continue; }   // vách bắc basalt (mặt đứng)
        if (d > r.hw - 1.2) { g.set(x, y, '#120c10'); continue; }
        g.set(x, y, sh(['#0e0606', '#2a0808', '#5a1206', '#a82a0a', '#e8560e', '#ffb84a'], e * (0.55 + 0.45 * k) + hash(x, y + f) * 0.08, x, y));   // vực than hồng
      }
      if (k > 0.6) { let sy = AY; while (sy > 12 && !inside(40, sy)) sy--; for (let i = 0; i < 5; i++) { const y = sy - i * 2; if (!inside(40, y)) break; for (let x = 37; x <= 42; x++) { g.set(x, y, i === 0 ? '#6a5860' : '#4e3c42'); g.set(x, y - 1, '#1a1418'); } g.set(37, y, '#ff8a2a'); g.set(42, y, '#ff8a2a'); } }   // bậc đá xuống vực
      if (k > 0.4) for (let i = 0; i < 12; i++) { const x = Math.round(AX - 9 + hash(i, 13) * 18 + Math.sin(f + i)), y = Math.round(AY - 4 - ((f / 6 + hash(i, 2)) % 1) * 34); if (y < 11 || inside(x, y)) g.set(x, y, i % 2 ? '#ffd36b' : '#ff8a2a'); }   // than hồng bay lên
    },
    props() {}
  },
  // ---------- 4. CỔNG DINH THỰ ----------
  palace: {
    trail: null,
    floor(g, k) {
      for (let y = AY - 4; y <= AY + 4; y++) for (let x = 12; x <= 67; x++) { const row = Math.floor(y / 3), bx = (x + (row % 2) * 2) % 4; g.set(x, y, bx === 3 || y % 3 === 2 ? '#2a2638' : sh(['#3a3450', '#46405a', '#5c5478'], 0.4 + hash(x >> 2, row) * 0.5, x, y)); }   // sân lát đá
      for (let y = 6; y < AY - 4; y++) for (let x = 25; x <= 54; x++) g.set(x, y, dith(x, y, (y - 6) / 34 * 0.6) ? '#221c2c' : '#14101c');   // sân trong tối
      const len = AY + 4 + Math.round(ease(k) * (H - AY - 5));
      for (let y = 6; y <= len; y++) for (let x = AX - 5; x <= AX + 4; x++) { const far = y < AY - 4, dx = x - (AX - 5); const c = dx === 0 || dx === 9 ? (far ? '#6a5020' : '#c8983a') : (y % 4 === 0 ? (far ? '#5a0e18' : '#b81e30') : (far ? '#3a0a12' : '#9a1626')); g.set(x, y, y < 6 + (AY - 10) * 0.35 && dith(x, y, 0.5) ? '#14101c' : c); }   // thảm đỏ chạy về bắc
    },
    props(g, k, f) {
      for (const [x0, s] of [[16, -1], [56, 1]]) {
        for (let y = 12; y <= AY; y++) for (let x = x0; x < x0 + 8; x++) { const row = Math.floor((y - 12) / 4), mor = (y - 12) % 4 === 3 || ((x - x0 + (row % 2) * 4) % 8 === 7); g.set(x, y, mor ? '#24202e' : x === x0 + 7 ? '#2c2840' : x === x0 ? '#625a78' : sh(['#3a3450', '#46405a', '#5c5478'], 0.5 + hash(x, row) * 0.3, x, y)); }   // mặt trước trụ vuông
        for (let y = 8; y <= 11; y++) for (let x = x0 - 1; x <= x0 + 8; x++) g.set(x, y, y === 8 ? '#9a92b4' : y === 11 ? '#c8983a' : '#7a7294');   // mặt trên + viền vàng
        g.rect(x0 + 1, 6, 6, 2, '#c8983a'); g.rect(x0 + 1, 6, 6, 1, '#ffe27a');   // chậu vàng
        if (k > 0.2) { for (let i = 0; i < 6; i++) { const hh = Math.round((3 + 3 * hash(i * 3 + s, f)) * Math.min(1, k * 1.6)); for (let j = 0; j < hh; j++) g.set(x0 + 1 + i, 5 - j, j > hh - 2 ? '#5af0ff' : j > hh * 0.5 ? '#b47aff' : (i === 2 || i === 3) && j < 2 ? '#ffffff' : '#7a3ad8'); }
          let lx = x0 + 3; for (let y = 4; y >= 0; y--) { lx += Math.round((hash(y, f * 7 + s) - 0.5) * 2); g.set(lx, y, y % 2 ? '#e0ffff' : '#5af0ff'); } }   // sét nhảy
        else g.rect(x0 + 1, 5, 6, 1, '#2a1a3a');
      }
      // cổng sắt đôi: cánh co lại khi mở vào trong
      const e = ease(k), full = 15, w = Math.max(2, Math.round(full * (1 - e * 0.85)));
      for (const [a, dir] of [[24, 1], [55, -1]]) for (let i = 0; i < w; i++) {
        const x = a + dir * i, last = i === w - 1, u = Math.round(i / Math.max(1, w - 1) * (full - 1));
        for (let y = 18; y <= AY; y++) {
          const rail = y === 23 || y === 35, bar = u % 2 === 0 || last;
          if (rail) g.set(x, y, '#c8983a'); else if (bar) g.set(x, y, last ? '#ffe27a' : (y + u) % 7 === 0 ? '#3a3a4a' : '#1a1a24');
        }
        if (u % 2 === 0) { g.set(x, 17, '#ffe27a'); g.set(x, 16, '#c8983a'); }   // mũi giáo vàng
      }
      if (e < 0.05) for (let y = 26; y <= 32; y++) for (let x = 36; x <= 43; x++) { const d = Math.hypot(x + 0.5 - 40, y + 0.5 - 29); if (Math.abs(d - 3) < 0.7 || d < 1) g.set(x, y, '#ffe27a'); }   // huy hiệu giữa khi đóng
    }
  }
};

const cache = new Map();
export function gateLayers(theme, k, f) {
  const D = T[theme] || T.dungeon, kq = Math.round(Math.max(0, Math.min(1, k)) * 12) / 12, fq = kq > 0 ? f % 6 : 0, key = theme + '|' + kq + '|' + fq;
  let c = cache.get(key); if (c) return c;
  let path = cache.get(theme + '|path');
  if (path === undefined) { path = null; if (D.trail) { const gt = new Grid(W, H); trail(gt, D.trail); path = gt.canvas(null); } cache.set(theme + '|path', path); }
  const gf = new Grid(W, H); D.floor(gf, kq, fq);
  const gp = new Grid(W, H); D.props(gp, kq, fq);
  c = { path, floor: gf.canvas(OUT), props: gp.d.some(Boolean) ? gp.canvas(OUT) : null }; cache.set(key, c); return c;
}
// điểm sáng (toạ độ lưới, render đổi sang thế giới)
export const GATE_LIGHTS = {
  dungeon: [{ x: 51.5, y: 20, r: 90, c: '#ffd36b' }, { x: 40, y: 30, r: 80, c: '#7aff9a' }],
  frost: [{ x: 40, y: 10, r: 150, c: '#e8f8ff' }, { x: 40, y: 20, r: 90, c: '#bff0ff' }],
  volcano: [{ x: 40, y: 26, r: 150, c: '#ff7a1a' }],
  palace: [{ x: 20, y: 3, r: 100, c: '#b47aff' }, { x: 60, y: 3, r: 100, c: '#5af0ff' }, { x: 40, y: 30, r: 90, c: '#ffd36b' }]
};
export const GATE_INFO = {
  dungeon: { verb: 'DESCEND', to: 'the Spore Cavern', c: '#9aff9a' },
  frost: { verb: 'ASCEND', to: 'the Frozen Tundra', c: '#bff0ff' },
  volcano: { verb: 'DESCEND', to: "the Dragon's Lair", c: '#ffb84a' },
  palace: { verb: 'ENTER', to: 'the Stormcrown Manor', c: '#ffe27a' }
};
