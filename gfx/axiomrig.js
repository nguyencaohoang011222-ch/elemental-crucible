// Sprite lãng khách Axiom trên khung heroGrid (16×21, nhìn sang phải). Hàng 15–17 sẽ bị chibiGrid bỏ nên không vẽ chi tiết ở đó.
// P.hair: 0..3, độ bay của tóc và vạt áo (trễ nhịp so với thân).
const HAIR = ['#0c1020', '#182446', '#2a3d6e', '#4a66a0'], COAT = ['#171430', '#262152', '#3a3278', '#544aa6'];
const SKIN = ['#c8986e', '#f0c9a0', '#ffe2c4'], TRIM = '#d8e4ff', SASH = '#a27ae0', BOOT = '#14101c', CUBE = ['#5a6ab0', '#9ab0ee', '#eef4ff'];

export function axiomGrid(g, P) {
  const by = P.by | 0, ln = P.lean | 0, sw = P.hair | 0, hx = 4 + ln, hy = 3 + by + (P.hd | 0), r = (x, y, w, h, c) => g.rect(x, y, w, h, () => c);
  // đuôi tóc buộc thấp, bay về sau
  // [x, y, rộng, cao]: gốc dày, ngọn thuôn; bay lên và lùi ra theo sw
  const tail = [[hx - 1, hy + 3, 3, 4], [hx - 3, hy + 5, 3, 4], [hx - 4, hy + 7, 2, 4], [hx - 5, hy + 9, 1, 3]];
  tail.forEach(([x, y, w, h], i) => { const dx = Math.round(i * sw * 0.45), dy = -Math.round(i * Math.max(0, sw - 1) * 0.55); r(x - dx, y + dy, w, h, HAIR[1]); r(x - dx + w - 1, y + dy, 1, h - 1, HAIR[2]); });
  if (sw >= 3) { r(hx - 9, hy + 7, 1, 1, CUBE[1]); r(hx - 8, hy + 11, 1, 1, CUBE[0]); }
  // vạt áo dài lệch một bên
  for (let y = 11; y <= 19; y++) { const k = y - 11, len = 2 + (k >> 1), x0 = 5 + ln - len - Math.round(k * sw * 0.3); r(x0, y + (y < 15 ? by : 0), len + 1, 1, k % 4 === 3 ? COAT[0] : COAT[1]); if (y > 17) r(x0, y, 1, 1, TRIM); }
  // vỏ kiếm ghép khối, đeo chéo sau hông
  for (let i = 0; i < 4; i++) { const x = 5 + ln - i * 2, y = 13 + by + i; r(x, y, 2, 2, i % 2 ? CUBE[0] : CUBE[1]); r(x, y, 1, 1, CUBE[2]); }
  // tay sau
  r(4 + ln + (P.alx | 0), 10 + by + (P.aly | 0), 2, 4, COAT[0]); r(4 + ln + (P.alx | 0), 14 + by + (P.aly | 0), 2, 1, SKIN[0]);
  // chân
  const leg = (x, ly, c) => { const top = 15 + by, bot = 19 + ly; r(x, top, 2, Math.max(1, bot - top + 1), c); r(x, bot + 1, 3, 1, BOOT); };
  leg(5 + (P.lx | 0), P.ly | 0, '#1c1930'); leg(9 + (P.rx | 0), P.ry | 0, '#2c2848');
  // thân: áo mở cổ, đai dây
  r(5 + ln, 10 + by, 6, 5, COAT[2]); r(5 + ln, 10 + by, 2, 5, COAT[1]); r(8 + ln, 10 + by, 2, 2, SKIN[1]); r(8 + ln, 12 + by, 1, 1, TRIM); r(10 + ln, 10 + by, 1, 4, TRIM);
  r(5 + ln, 13 + by, 6, 1, SASH); r(10 + ln, 14 + by, 1, 1, SASH);
  // mặt
  r(hx + 1, hy + 2, 6, 5, SKIN[1]); r(hx + 1, hy + 6, 6, 1, SKIN[0]);
  const ey = hy + 4;
  if (P.eyes === 'closed') r(hx + 6, ey, 1, 1, SKIN[0]);
  else if (P.eyes === 'hurt') { r(hx + 6, ey, 1, 1, '#1a1220'); r(hx + 5, ey + 2, 2, 1, '#6a2020'); }
  else r(hx + 6, ey, 1, 1, '#8fd8ff');
  // tóc: đỉnh đầu, gáy và mái dài che một mắt
  r(hx, hy, 8, 2, HAIR[1]); r(hx + 1, hy - 1, 5, 1, HAIR[2]); r(hx + 2, hy - 2, 2, 1, HAIR[1]); r(hx - 1, hy + 1, 3, 5, HAIR[1]); r(hx, hy + 1, 1, 4, HAIR[0]);
  r(hx + 2, hy + 2, 3, 2, HAIR[1]); r(hx + 3, hy + 4, 2, 1, HAIR[2]); r(hx + 4, hy + 5, 1, 1, HAIR[2]); r(hx + 7, hy + 1, 1, 3, HAIR[2]); r(hx + 2, hy, 3, 1, HAIR[3]);
  r(hx, hy + 5, 2, 1, SASH);   // dây buộc tóc
  // tay trước
  r(10 + ln + (P.arx | 0), 10 + by + (P.ary | 0), 2, 4, COAT[3]); r(10 + ln + (P.arx | 0), 14 + by + (P.ary | 0), 2, 1, SKIN[2]);
  return g;
}

// tư thế riêng: đứng 4 khung, chạy 8 khung hạ thấp người, tóc trễ nhịp
export function axiomPose(p, t, moving, P) {
  if (p.dashT > 0) { Object.assign(P, { lean: 2, by: 1, lx: -3, rx: 2, alx: -3, arx: -2, hair: 3 }); }
  else if (moving) {
    const f = Math.floor(t / 0.07) % 8;
    P.lx = [2, 1, 0, -1, -2, -1, 0, 1][f]; P.rx = -P.lx; P.ly = [0, 0, -1, -1, 0, 0, 0, 0][f]; P.ry = [0, 0, 0, 0, 0, 0, -1, -1][f];
    P.by = [1, 1, 0, 1, 1, 1, 0, 1][f]; P.lean = 1; P.alx = -2; P.aly = 1; P.arx = -1; P.hair = [2, 2, 3, 3, 2, 2, 3, 3][f];
  } else { const f = Math.floor(t / 0.28) % 4; P.by = f >= 2 ? 1 : 0; P.hair = [0, 0, 1, 1][f]; P.hd = 0; P.arx = -1; if (t % 3.4 < 0.14) P.eyes = 'closed'; }
  const A = p.ax;
  if (A && A.foldT > 0) Object.assign(P, { arx: -4, ary: 1, alx: 1, lean: 0, by: 1, hd: 1, eyes: 'closed', hair: 1 });   // tra kiếm
  else if ((p.charge || 0) > 0.05) { Object.assign(P, { lean: moving ? 1 : -1, by: 1, arx: -3, ary: 1, alx: -1 }); if (!moving) { P.lx = -2; P.rx = 2; } }
  else if (p.swing > 0) { Object.assign(P, { lean: 1, arx: 2, ary: (p.combo === 2 ? -2 : 0), hair: 3 }); if (!moving) { P.lx = -2; P.rx = 2; P.by = 1; } }
  if (p.hurtT > 0) { P.lean = -1; P.eyes = 'hurt'; }
  return P;
}
