// 12 icon tuyệt kỹ (16×16, vẽ trên khung vàng của icons.js). p = bảng màu 4 bậc của chiêu: [tối, giữa, sáng, rất sáng].
const W = '#ffffff', K = '#0c0a12';
export const ULT_GLYPH = {
  axcoffin(g, p) { g.rect(3, 3, 10, 10, p[1]); g.rect(4, 4, 8, 8, p[0]); g.rect(6, 6, 4, 4, p[2]); g.rect(7, 7, 2, 2, p[3]); for (const [x, y] of [[2, 2], [12, 2], [2, 12], [12, 12]]) g.rect(x, y, 2, 2, p[3]); },
  axprism(g, p) { for (let i = 0; i < 6; i++) { g.set(8 + i, 8 - i, p[3]); g.set(8 - i, 8 + i, p[3]); g.set(8 - i, 8 - i, p[2]); g.set(8 + i, 8 + i, p[2]); } g.rect(7, 7, 2, 2, p[3]); },
  axrain(g, p) { for (const [x, y, w] of [[2, 2, 3], [9, 1, 3], [5, 6, 3], [11, 6, 2], [2, 9, 2], [7, 10, 5]]) { g.rect(x, y, w, w, p[1]); g.rect(x, y, w, 1, p[3]); } },
  axfold(g, p) { g.rect(2, 2, 12, 1, p[2]); g.rect(2, 13, 12, 1, p[2]); g.rect(2, 2, 1, 12, p[2]); g.rect(13, 2, 1, 12, p[2]); for (let i = 3; i < 8; i++) { g.set(i, i, p[3]); g.set(15 - i, i, p[3]); g.set(i, 15 - i, p[3]); g.set(15 - i, 15 - i, p[3]); } g.rect(7, 7, 2, 2, p[3]); },
  meteorblade(g, p) { // kiếm lửa chém xuống + 3 vệt cong
    g.line(4, 12, 11, 3, K, 2); g.line(4, 12, 11, 3, p[2]); g.line(5, 12, 12, 4, p[3]); g.rect(3, 11, 3, 3, '#7a5a2a'); g.rect(2, 10, 2, 1, '#d4af37');
    for (let i = 0; i < 3; i++) { g.set(9 + i, 9 + i * 1.5, p[1]); g.set(10 + i, 9 + i * 1.5, p[2]); } g.set(12, 2, W); g.set(13, 3, p[3]);
  },
  monsoon(g, p) { // 5 vệt chém chéo nối nhau
    const pts = [[3, 12], [7, 4], [9, 11], [12, 3], [13, 12]];
    for (let i = 0; i < 4; i++) { g.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], p[1]); }
    for (const [x, y] of pts) { g.set(x, y, W); } g.line(7, 4, 9, 11, p[3]);
  },
  titan(g, p) { // mũ giáp đá khổng lồ + vết nứt dưới chân
    g.rect(4, 3, 8, 7, p[1]); g.rect(5, 3, 6, 1, p[2]); g.rect(4, 6, 8, 1, K); g.set(6, 6, '#ffd36b'); g.set(9, 6, '#ffd36b'); g.rect(3, 4, 1, 4, p[0]); g.rect(12, 4, 1, 4, p[0]);
    g.line(2, 13, 7, 11, p[0]); g.line(8, 11, 13, 13, p[0]); g.line(7, 11, 8, 14, p[2]); g.rect(4, 10, 8, 1, p[0]);
  },
  sunder(g, p) { // lốc xoáy có đá bay quanh
    for (let i = 0; i < 26; i++) { const a = i * 0.5, r = 1 + i * 0.22; g.set(8 + Math.cos(a) * r, 8 + Math.sin(a) * r * 0.8, i > 18 ? p[3] : p[1]); }
    for (const [x, y] of [[2, 4], [13, 6], [3, 12], [12, 12]]) { g.rect(x, y, 2, 2, '#8a6a4a'); g.set(x, y, '#c8a070'); }
  },
  meteorarrow(g, p) { // mũi tên lớn + thiên thạch rơi
    g.line(2, 13, 12, 3, K, 2); g.line(2, 13, 12, 3, '#e8dcc0'); g.rect(11, 2, 3, 3, W); g.set(13, 2, p[3]); g.line(2, 11, 4, 13, p[1]);
    for (const [x, y] of [[5, 4], [9, 9], [13, 12]]) { g.rect(x, y, 2, 2, p[2]); g.set(x - 1, y - 1, p[1]); g.set(x - 2, y - 2, p[0]); }
  },
  pentagram(g, p) { // ngôi sao năm cánh nối 5 bẫy
    const P = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; P.push([8 + Math.cos(a) * 6, 8.5 + Math.sin(a) * 6]); }
    for (let k = 0; k < 5; k++) g.line(P[k][0], P[k][1], P[(k + 2) % 5][0], P[(k + 2) % 5][1], p[2]);
    for (const [x, y] of P) { g.rect(x - 1, y - 1, 2, 2, p[1]); g.set(x, y, W); }
  },
  airstrike(g, p) { // 3 hàng nổ song song
    for (let L = 0; L < 3; L++) for (let i = 0; i < 4; i++) { const x = 3 + i * 3, y = 4 + L * 4 + (i % 2); g.rect(x, y, 2, 2, i === 3 ? p[3] : p[1]); g.set(x, y, p[2]); }
    g.line(2, 14, 14, 14, p[0]);
  },
  mirage(g, p) { // ba bóng người mờ dần
    [[3, p[0]], [7, p[1]], [11, p[2]]].forEach(([x, c], i) => { g.rect(x, 6, 3, 7, c); g.rect(x, 3, 3, 3, c); if (i === 2) { g.set(x + 1, 4, W); g.rect(x, 13, 3, 1, K); } });
  },
  solar(g, p) { // mặt trời có tia
    g.ell(8, 8, 3.5, 3.5, p[2]); g.ell(8, 8, 2, 2, p[3]); g.set(8, 8, W);
    for (let i = 0; i < 8; i++) { const a = i * 0.785; g.line(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, i % 2 ? p[1] : p[2]); }
  },
  abyss(g, p) { // con sóng cuộn khổng lồ
    for (let x = 1; x < 15; x++) { const h = 11 - Math.round(Math.sin((x - 1) / 13 * Math.PI) * 7); g.rect(x, h, 1, 14 - h, x < 9 ? p[1] : p[0]); g.set(x, h, p[2]); }
    g.rect(9, 4, 3, 1, p[3]); g.set(12, 5, p[3]); g.set(12, 6, W); g.set(11, 6, p[2]); g.rect(1, 14, 14, 1, p[0]);
  },
  comettrench(g, p) { // sao chổi đuôi dài + rãnh lửa
    for (let i = 0; i < 8; i++) g.rect(3 + i, 2 + i, 2, 1, i < 3 ? p[0] : p[1]); g.ell(11, 10, 2.5, 2.5, p[2]); g.set(11, 10, W);
    g.rect(2, 13, 12, 2, p[0]); for (let x = 3; x < 13; x += 2) g.set(x, 13, '#ff7a2a');
  },
  thunderhead(g, p) { // mây giông + tia sét
    g.ell(6, 5, 3.5, 2.5, p[1]); g.ell(10, 5, 3.5, 2.8, p[0]); g.ell(8, 4, 3, 2.5, p[1]); g.rect(4, 6, 9, 1, p[0]);
    g.line(9, 7, 7, 10, '#fff6a0'); g.line(7, 10, 9, 10, '#fff6a0'); g.line(9, 10, 6, 14, W);
  }
};
