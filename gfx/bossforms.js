// Boss vẽ lại (bản 2): mỗi boss là MỘT khối giải phẫu liền mạch — các phần thân ghép bằng hợp mềm (smooth-union SDF)
// nên chung một đường viền #141013 và một hướng đổ bóng, không còn trông như các khối bìa dán chồng lên nhau.
// Mỗi trạng thái có tư thế riêng: idle(4) · walk(4: tiếp đất – chuyển – tiếp đất – chuyển, thân nhún và vai xoay ngược hông)
// · wind(3: lấy đà) · slam/cleave(4: bắt đầu – va chạm ×2 – hồi) · cast(4) · dash(4) · stagger(2) · rise(2).
import { OUT, PAL, mk, part, cap, ell, poly, place, glowLine, dot, hsh } from './bosspix.js';

// ---------- SDF bổ sung ----------
const smin = (k, ...fs) => (x, y) => { let d = fs[0](x, y); for (let i = 1; i < fs.length; i++) { const b = fs[i](x, y), h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - d) / k)); d = b + (d - b) * h - k * h * (1 - h); } return d; };
const uni = (...fs) => (x, y) => { let d = 1e9; for (const f of fs) { const v = f(x, y); if (v < d) d = v; } return d; };
const tri = (a, b, c) => poly([a, b, c]);
const inE = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
// chuỗi khúc (đuôi, cổ, ngón cánh) theo các điểm, bán kính giảm dần
const chain = (pts, r0, r1) => uni(...pts.slice(1).map((p, i) => cap(pts[i][0], pts[i][1], p[0], p[1], r0 + (r1 - r0) * i / (pts.length - 1), r0 + (r1 - r0) * (i + 1) / (pts.length - 1))));
const bez = (p0, p1, p2, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });

const OBS = ['#111318', '#1f2228', '#2f343c', '#4B5563'], BAS = ['#1f2228', '#374151', '#4B5563', '#6B7280'], GRD = ['#16181d', '#262a31', '#374151', '#4B5563'];   // granite cổ + đá phiến (Ashen Colossus)
const IVORY = ['#8a7a5e', '#c8b890', '#ece2c4', '#fffaf0'];

// ================= 1. ASHEN COLOSSUS: golem đá granite cổ, khe nứt địa tầng hổ phách (không lửa / nham) =================
function colossus(P) {
  const W = 66, H = 62, g = mk(W, H), st = P.st || 'idle', f = P.f | 0;
  const lava = P.rage ? ['#D97706', '#F59E0B', '#FDE68A'] : ['#78350F', '#D97706', '#F59E0B'];   // khe địa tầng: hổ phách – vàng nâu
  let by = 0, ln = 0, cr = 0, sway = 0, hd = 0, core = f % 2, tuck = 0;
  let fB = [24, 0], fF = [42, 0], aB = { e: [13, 36], h: [11, 46] }, aF = { e: [53, 36], h: [55, 46] };
  if (st === 'idle') { by = [0, 0, 1, 1][f]; }
  else if (st === 'walk' || st === 'dash') {
    const s = [1, 0, -1, 0][f];                                      // chân trước bước tới khi s>0
    fF = [42 + s * 5, f === 3 ? 4 : 0]; fB = [24 - s * 5, f === 1 ? 4 : 0];
    by = [1, -1, 1, -1][f]; sway = -s;                               // vai xoay ngược với hông
    aF = { e: [53 + sway * 2, 36], h: [55 + sway * 4, 46] }; aB = { e: [13 - sway * 2, 36], h: [11 - sway * 4, 46] };
    if (st === 'dash') { ln = 4; cr = 2; aF = { e: [57, 33], h: [62, 39] }; aB = { e: [9, 31], h: [5, 37] }; }
  } else if (st === 'wind' || st === 'rise') {
    const k = st === 'rise' ? 2 : f;
    ln = [-1, -2, -3][k]; by = [0, -1, -2][k]; hd = -1;
    aB = [{ e: [10, 30], h: [8, 22] }, { e: [16, 14], h: [24, 5] }, { e: [17, 12], h: [26, 3] }][k];
    aF = [{ e: [55, 30], h: [56, 22] }, { e: [48, 14], h: [40, 5] }, { e: [47, 12], h: [38, 3] }][k];
    if (st === 'rise') { tuck = 5; fB[1] = fF[1] = 4; }
  } else if (st === 'slam') {
    if (f === 0) { ln = 1; aB = { e: [30, 12], h: [40, 9] }; aF = { e: [52, 13], h: [56, 19] }; }
    else if (f < 3) { ln = 5; cr = 4; hd = 2; aB = { e: [40, 40], h: [50, 55] }; aF = { e: [57, 40], h: [61, 55] }; fF[0] = 46; fB[0] = 20; }
    else { ln = 2; cr = 2; aB = { e: [34, 40], h: [44, 51] }; aF = { e: [54, 40], h: [56, 51] }; }
  } else if (st === 'cleave') {                                       // đấm thẳng: vai trước xoay ra, thân lao tới
    if (f === 0) { ln = -2; sway = -2; aF = { e: [44, 33], h: [36, 31] }; }
    else if (f < 3) { ln = 5; sway = 3; aF = { e: [58, 28], h: [64, 28] }; aB = { e: [9, 34], h: [5, 40] }; fF[0] = 48; fB[0] = 18; }
    else { ln = 2; sway = 1; aF = { e: [56, 34], h: [60, 40] }; }
  } else if (st === 'cast') { by = -1; core = 2 + f % 2; aB = { e: [8, 32], h: [4, 26] }; aF = { e: [56, 32], h: [61, 26] }; }
  else if (st === 'stagger') { cr = 4; hd = 3; ln = -1; aB = { e: [14, 42], h: [14, 53] }; aF = { e: [50, 42], h: [50, 53] }; }

  const fy = 59 - tuck, hipY = 40 + cr * 0.6 + by * 0.5, tx = 32 + ln, ty = 28 + cr + by;
  const sB = [17 + ln - sway, 21 + cr + by + (sway < 0 ? 1 : 0)], sF = [47 + ln + sway, 21 + cr + by + (sway > 0 ? 1 : 0)];
  const hx = 33 + ln * 1.3, hy = 17 + cr + by + hd, lc = f % 2 ? lava[1] : lava[0];
  const crack = (x, y, c, i) => hsh(x >> 1, (x + y) >> 1) < 0.06 && i > 0 ? lc : c;
  const sheen = (c, i, x, y) => i === 3 && hsh(x, y * 3) < 0.35 ? '#9CA3AF' : i >= 2 && hsh(x * 5, y) < 0.09 ? '#4D7C0F' : c;   // ánh đá phiến + rêu đá
  const leg = (hx0, fx, lift, pal) => {
    const ay = fy - lift - 3, kx = (hx0 + fx) / 2 + 3, ky = (hipY + ay) / 2 + 1;
    part(g, uni(smin(2, cap(hx0, hipY, kx, ky, 6.5, 5.5), cap(kx, ky, fx, ay, 5.5, 5)), poly([[fx - 6, fy - lift - 5], [fx + 7, fy - lift - 4], [fx + 9, fy - lift], [fx - 7, fy - lift]])), pal, { tex: (x, y, c, i) => y > ky - 2 && y < ky + 2 ? OBS[Math.min(3, i)] : crack(x, y, c, i) }); // greave + đầu gối vỏ chai
  };
  const arm = (s, A, pal, front) => {
    const e = [A.e[0] + ln * 0.5, A.e[1] + by], h = [A.h[0] + ln * 0.5, A.h[1] + by];
    part(g, smin(2.5, cap(s[0], s[1], e[0], e[1], 6, 5), cap(e[0], e[1], h[0], h[1], 5, 5.5)), pal, { tex: crack });
    part(g, smin(1.5, ell(h[0], h[1], front ? 7.5 : 6.5, front ? 6.5 : 6), ell(h[0] + 2, h[1] - 3, 5, 3)), OBS, { tex: (x, y, c, i) => sheen(c, i, x, y) }); // găng đá vỏ chai
    for (let k = -1; k <= 1; k++) dot(g, h[0] + 4, h[1] - 1 + k * 2, lc);                                                              // khớp ngón dung nham
  };
  arm(sB, aB, GRD, false);
  leg(26 + ln * 0.4, fB[0] + ln * 0.5, fB[1], BAS.map(c => c)); // chân sau
  // thân: lồng ngực rộng + hông + 2 giáp vai cao + đầu lún giữa vai — một khối liền
  const spikes = uni(tri([sB[0] - 8, sB[1] - 3], [sB[0] - 6, sB[1] - 14], [sB[0] - 2, sB[1] - 5]), tri([sB[0] - 1, sB[1] - 6], [sB[0] + 2, sB[1] - 13], [sB[0] + 4, sB[1] - 6]),
    tri([sF[0] - 3, sF[1] - 6], [sF[0] + 1, sF[1] - 15], [sF[0] + 3, sF[1] - 6]), tri([sF[0] + 3, sF[1] - 4], [sF[0] + 9, sF[1] - 11], [sF[0] + 8, sF[1] - 2]));
  const body = uni(smin(4, poly([[tx - 13, ty - 9], [tx + 14, ty - 9], [tx + 9, ty + 12], [tx - 9, ty + 12]]), ell(tx, hipY - 1, 11, 6), ell(sB[0], sB[1], 10, 8), ell(sF[0], sF[1], 11, 8.5), ell(hx, hy, 6, 5.5)), spikes);
  const fx0 = tx + 2, fy0 = ty + 2, hot = core >= 2;
  part(g, body, BAS, { tex: (x, y, c, i) => {
    const r = inE(x, y, fx0, fy0, 8.5, 7.5);
    if (r < 1) { if (((y - fy0 + 30) % 3 === 0 && r > 0.15) || Math.abs(x - fx0) < 0.6) return OBS[1]; return r < 0.25 ? (hot ? '#FDE68A' : lava[2]) : r < 0.6 ? lava[1] : lava[0]; } // lõi địa tầng hổ phách trong lồng ngực
    if (r < 1.4) return OBS[0];
    if (inE(x, y, sB[0], sB[1] - 1, 10.5, 8) < 1 || inE(x, y, sF[0], sF[1] - 1, 11.5, 8.5) < 1 || y < sB[1] - 7) return sheen(OBS[i], i, x, y); // giáp vai + gai
    if (inE(x, y, hx, hy, 6.4, 6) < 1) return sheen(OBS[Math.max(0, i - 1)], i, x, y);                                                        // mũ trụ bazan
    return crack(x, y, c, i);
  } });
  // sừng lệch: sừng sau to cong ngược, sừng trước gãy cụt
  part(g, chain(bez([hx - 3, hy - 3], [hx - 11, hy - 10], [hx - 5, hy - 19], 5), 2.6, 0.8), PAL.horn);
  part(g, cap(hx + 3, hy - 4, hx + 6, hy - 9, 2.2, 1.6), PAL.horn);
  const eye = P.dim ? '#3a2a12' : P.rage ? '#FDE68A' : '#F59E0B'; dot(g, hx, hy, eye, 3, 1); dot(g, hx + 4, hy, eye, 1, 1);
  leg(38 + ln * 0.4, fF[0] + ln * 0.5, fF[1], BAS); // chân trước
  arm(sF, aF, BAS, true);
  // vết nứt địa tầng trên ngực/vai
  for (const [a, b2, c, d] of [[-12, -6, -8, 2], [10, -7, 13, 0], [-6, 10, -1, 12], [6, 9, 9, 12]]) glowLine(g, tx + a, ty + b2, tx + c, ty + d, lc);
  glowLine(g, sF[0] - 5, sF[1] + 2, sF[0] + 3, sF[1] + 5, lc);
  return g.canvas(OUT);
}

// ================= 2. SPOREBACK BEHEMOTH: rùa – thú cổ đại, mai đá rêu lởm chởm, nấm phát quang =================
function behemoth(P) {
  const W = 96, H = 62, g = mk(W, H, 0, 6), st = P.st || 'idle', f = P.f | 0;
  let by = 0, sx = 0, rear = 0, hd = 0, hx0 = 0, swell = 0, glow = f % 2, splay = 0, jaw = 0, tuck = 0;
  let A = [0, 0], B = [0, 0]; // [bước tới, nhấc] cho cặp chéo A (sau-gần + trước-xa) và B (sau-xa + trước-gần)
  if (st === 'idle') { by = [0, 0, 1, 1][f]; }
  else if (st === 'walk' || st === 'dash') {
    const s = [1, 0, -1, 0][f]; A = [s * 4, f === 3 ? 4 : 0]; B = [-s * 4, f === 1 ? 4 : 0]; by = [1, 0, 1, 0][f]; sx = [1, 0, -1, 0][f]; hd = [0, 1, 0, 1][f];
    if (st === 'dash') { hd += 4; hx0 = 4; A[0] *= 1.4; B[0] *= 1.4; }
  } else if (st === 'wind' || st === 'rise') { const k = st === 'rise' ? 2 : f; by = [1, 2, 3][k]; hd = 2; swell = 1 + k; glow = 1; splay = k; if (st === 'rise') tuck = 3; }   // khom thấp, nấm phồng và rực sáng
  else if (st === 'slam') { rear = [6, -1, -1, 0][f]; by = [0, 2, 2, 1][f]; hd = [-3, 4, 4, 1][f]; hx0 = f === 1 || f === 2 ? 3 : 0; jaw = f === 1 ? 2 : 0; }
  else if (st === 'cleave') { hd = [0, 3, 3, 1][f]; hx0 = [-2, 5, 6, 2][f]; jaw = [1, 3, 3, 1][f]; by = f === 1 || f === 2 ? 1 : 0; sx = [0, 2, 2, 1][f]; }
  else if (st === 'cast') { swell = 2 + f % 2; glow = 1; jaw = 1; }
  else if (st === 'stagger') { by = 3; hd = 5; splay = 3; }
  const fy = 56 - tuck, cx = 42 + sx, cy = 26 + by - rear * 0.35 - swell * 0.5, srx = 30 + swell, sry = 15 + swell;
  if (st === 'spin') { // thu vào mai, xoay
    const ph = f * 0.8;
    part(g, ell(44, 34, 26, 20), PAL.shell, { tex: (x, y, c, i) => { const a = Math.atan2(y - 34, x - 44) + ph; return Math.sin(a * 3) > 0.35 ? PAL.moss[Math.min(3, i)] : c; } });
    for (let k = 0; k < 4; k++) { const a = ph + k * 1.57; glowLine(g, 44 + Math.cos(a) * 6, 34 + Math.sin(a) * 5, 44 + Math.cos(a) * 22, 34 + Math.sin(a) * 16, PAL.shell[0]); }
    dot(g, 43, 33, P.rage ? '#ffffff' : '#6ef0ff', 2, 1);
    return g.canvas(OUT);
  }
  const front = y => y - rear;
  // chân thú to có khớp: vai dưới mép mai → khuỷu bè ra → cẳng → bàn chân 3 vuốt ngà
  const leg = (x0, y0, step, lift, pal, isFront) => {
    const fx = x0 + step + (isFront ? splay : -splay) + (isFront ? -1 : 1), ex = x0 + (isFront ? 6 : -6) + step * 0.5, ey = y0 + 7 - lift * 0.5, ay = fy - lift - 3;
    part(g, smin(2, cap(x0, y0, ex, ey, 7, 5.5), ell(ex, ey, 5, 4.5), cap(ex, ey, fx, ay, 5.6, 5), ell(fx + 1, fy - lift - 2.5, 7, 3.4)), pal,
      { tex: (x, y, c, i) => ((y * 2 + Math.abs(x - ex)) % 5 === 0 && i > 0 ? pal[i - 1] : c) });                            // vảy xếp vòng quanh chân
    for (let k = 0; k < 3; k++) part(g, ell(fx - 2 + k * 3.6, fy - lift - 1.2, 1.5, 1.2), ['#2a2420', '#5a5048', '#8a7e70', '#a89c8c'], { line: false });   // móng voi xám nâu, không viền trắng
  };
  leg(26, front(34 + by) + rear * 0.2, B[0], B[1], PAL.shellD, false);       // sau-xa
  leg(62, front(34 + by), A[0], A[1] + Math.max(0, rear), PAL.shellD, true); // trước-xa
  // đuôi ngắn có gai
  part(g, chain([[16, cy + 9], [8, cy + 12], [2, cy + 11 + (f % 2)]], 4.5, 1.5), PAL.hide);
  // cổ + đầu thú có sừng, râu rêu, mắt lam
  const hx = 81 + hx0, hy = front(34 + hd);
  part(g, cap(66, front(cy + 6), hx - 4, hy + 2, 7, 5.5), PAL.hide);
  part(g, chain(bez([hx - 2, hy - 4], [hx - 10, hy - 12], [hx - 17, hy - 10], 5), 2.4, 0.8), IVORY); // sừng cong ra sau
  part(g, chain(bez([hx + 1, hy - 5], [hx - 4, hy - 13], [hx - 9, hy - 14], 4), 2, 0.7), IVORY);
  part(g, uni(smin(2.5, ell(hx, hy, 7.5, 6), ell(hx + 7, hy + 2, 5.5, 4), poly([[hx - 6, hy - 4], [hx + 9, hy - 3], [hx + 6, hy]])), poly([[hx - 2, hy + 4 + jaw], [hx + 11, hy + 4 + jaw * 1.6], [hx + 9, hy + 7 + jaw * 1.6], [hx - 3, hy + 7]])), PAL.hide,
    { tex: (x, y, c, i) => y > hy + 3 + jaw && x > hx ? PAL.hide[Math.max(0, i - 1)] : c });
  if (jaw) { for (let x = hx + 1; x < hx + 10; x += 2) g.set(x, hy + 4 + Math.round(jaw * (x - hx) / 12), '#fffaf0'); }
  for (let k = 0; k < 6; k++) { const bx = hx + 1 + k * 1.6, len = 4 + (k % 3) + (k === 2 ? 2 : 0), swy = ((k + f) % 3) - 1; g.line(bx, hy + 7 + jaw, bx + swy, hy + 7 + jaw + len, k % 2 ? PAL.moss[1] : PAL.moss[2]); } // râu rêu đung đưa
  const eye = P.dim ? '#2a4a4a' : P.rage ? '#ffffff' : '#6ef0ff'; dot(g, hx + 2, hy - 2, eye, 2, 1); dot(g, hx + 3, hy - 3, '#ffffff');
  // bụng + mai: mảng đá lục giác nối rêu, mép răng cưa, gờ lưng nhọn
  part(g, ell(cx, cy + 9, srx - 4, 7), PAL.hide);
  const rim = []; for (let k = 0; k <= 12; k++) { const q = Math.PI * (0.08 + k * 0.84 / 12), x = cx - Math.cos(q) * srx * 0.98, y = cy + Math.sin(q) * sry * 0.92; rim.push(tri([x - 3, y - 1], [x + (x - cx) * 0.06, y + 5 + (k % 2) * 2], [x + 3, y - 1])); }
  const ridge = []; for (let x = cx - 20; x <= cx + 18; x += 6) { const top = cy - sry * Math.sqrt(Math.max(0, 1 - ((x - cx) / srx) ** 2)); ridge.push(tri([x - 3, top + 3], [x + 1, top - 4 - (x % 12 === 0 ? 2 : 0)], [x + 3, top + 3])); }
  const vents = [[cx - 12, cy - 6], [cx + 4, cy - 10], [cx + 14, cy - 3]];
  const plate = (x, y) => { const s = 8, gx = Math.floor(x / s), gy = Math.floor(y / s); let d1 = 1e9, d2 = 1e9, id = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const px = (gx + i + 0.15 + hsh(gx + i, gy + j) * 0.7) * s, py = (gy + j + 0.15 + hsh(gy + j + 31, gx + i + 7) * 0.7) * s, d = Math.hypot(x - px, y - py); if (d < d1) { d2 = d1; d1 = d; id = (gx + i) * 57 + (gy + j) * 13; } else if (d < d2) d2 = d; } return [d2 - d1, id]; };
  part(g, uni(ell(cx, cy, srx, sry), ...rim, ...ridge), PAL.shell, { tex: (x, y, c, i, nx, ny) => {
    for (const [vx, vy] of vents) { const r = inE(x, y, vx, vy, 2.6, 1.8); if (r < 1) return r < 0.4 ? (glow || swell ? '#e6b4ff' : '#9a4ae0') : r < 0.75 ? '#3ad0e0' : PAL.shellD[0]; } // lỗ phun bào tử
    const [edge, id] = plate(x, y);
    if (edge < 1.1) return PAL.shellD[0];                                                                           // khe giữa các mảng mai
    const j = Math.max(0, Math.min(3, i + (hsh(id, 3) < 0.3 ? -1 : hsh(id, 4) > 0.8 ? 1 : 0) + (edge < 2.2 && ny < 0 ? 1 : 0)));
    if (ny < -0.3 && hsh(id, 9) < 0.55) return PAL.moss[Math.min(3, j)];                                          // rêu phủ theo từng mảng
    return PAL.shell[j];
  } });
  // chân gần (đè lên bụng)
  leg(20, front(36 + by) + rear * 0.2, A[0], A[1], PAL.shell, false);       // sau-gần
  leg(56, front(36 + by), B[0], B[1] + Math.max(0, rear), PAL.shell, true); // trước-gần
  // nấm phát quang tím – lam mọc từ khe mai
  const shrooms = [[cx - 14, cy - 11, 6, 5.5, 3.2, 'P'], [cx - 2, cy - 15, 8, 7.5, 4.2, 'C'], [cx + 10, cy - 12, 5, 5, 3, 'P'], [cx - 7, cy - 13, 4, 3.6, 2.4, 'C'], [cx + 5, cy - 14, 3, 3.2, 2.2, 'P']];
  for (const [mx, my, hgt, rx, ry, k] of shrooms.slice(0, P.sh ?? 5)) {
    const top = my - hgt * 0.55 - swell * 0.5, pal = k === 'P' ? PAL.capP : PAL.capC, R = rx + swell * (rx > 5 ? 0.8 : 0.4);
    part(g, cap(mx, my + 2, mx + 1, top + 1, 1.7, 1.3), ['#2a2036', '#43365a', '#62547a', '#86789e']);
    part(g, (x, y) => Math.max(ell(mx + 1, top, R, ry)(x, y), y - top - 1.2), pal);
    for (let s = -1; s <= 1; s++) g.set(Math.round(mx + 1 + s * R * 0.5), Math.round(top - ry * 0.5 + Math.abs(s)), glow ? pal[3] : pal[2]);
  }
  if (st === 'slam' && (f === 1 || f === 2)) for (let i = 0; i < 26; i++) { const q = hsh(i, f) * 3.4 + 2.9, r = 8 + hsh(f, i) * 30; dot(g, cx + Math.cos(q) * r, cy - sry * 0.6 + Math.sin(q) * r * 0.6, i % 3 ? PAL.capP[3] : i % 2 ? '#c8ff6a' : PAL.capC[3], 1 + (i % 4 === 0), 1); }   // phun bào tử
  if (st === 'cast' || st === 'wind') for (let i = 0; i < 10; i++) dot(g, cx - 20 + hsh(i, f) * 40, cy - sry - 4 - hsh(f, i) * 10, i % 2 ? PAL.capP[3] : PAL.capC[3]);
  return g.canvas(OUT);
}

// ================= 3. FROST WARDEN: Đại pháp sư băng đứng trên mặt đất — áo choàng hoàng gia chấm đất (không lộ chân), giáp vai băng chữ V, vương miện 5 gai, gậy băng đầu pha lê =================
// Trạng thái riêng theo chiêu: idle · walk · beamWind/beam (tia đôi) · prisonWind/prisonSlam (ngục gai) · fanWind/fanSwing (sóng quạt) · cast · stagger.
function warden(P) {
  const W = 120, H = 86, g = mk(W, H, 24, 16), st = P.st || 'idle', f = P.f | 0, aim = P.aim || 0;   // rộng hơn để pha lê đầu gậy không bị cắt khi chĩa ngang
  const SL = 60;                                                             // chiều dài gậy
  let by = 0, ln = 0, cb = 2, wave = 0, pulse = 0, eyesFlare = 0, runes = 0, mist = 0, dust = 0, shards = 0, frost = 0, trail = null, glowTip = 0, palmOrb = 0, sq = 0;
  // tư thế: H1 = tay gần (cầm gậy), H2 = tay xa; staff: { a (0 = dựng đứng, đầu lên), grip (0 = đáy, 1 = đầu) } hoặc { a, base: [x,y] }
  let H1 = [45, 40], H2 = [19, 40], staff = { a: 0.06, grip: 0.45 };
  if (st === 'idle') { by = [-1, -1, 0, 0][f]; pulse = f < 2 ? 1 : 0; cb = [2, 3, 3, 2][f]; mist = f >= 2 ? f - 1 : 0; }
  else if (st === 'walk' || st === 'dash') { ln = [1, 2, 1, 2][f]; by = [0, -1, 0, -1][f]; staff = { a: -0.3, grip: 0.45 }; H1 = [44, 39]; wave = f; cb = [4, 6, 5, 7][f]; dust = 1; }
  else if (st === 'beamWind' || st === 'beam') {
    const d = [Math.cos(aim), Math.sin(aim)], beamOn = st === 'beam';
    H1 = [48 + d[0] * 6, 22 + d[1] * 6]; H2 = [H1[0] - d[0] * 11, H1[1] - d[1] * 11 + 1];   // hai tay cùng nắm thân gậy
    staff = { a: aim + Math.PI / 2, grip: 0.5 }; glowTip = beamOn ? 2 : 1 + (f % 2); cb = beamOn ? 6 + (f % 2) * 2 : 3; ln = beamOn ? 1 : 0;   // nghiêng người vào phép, áo choàng bay ngược
  }
  else if (st === 'prisonWind') { H1 = [42, -11 + f]; H2 = [22, -11 + f]; staff = { a: Math.PI / 2, grip: 0.62 }; eyesFlare = 1; runes = 1 + f; glowTip = 1; cb = 3; by = -1; }
  else if (st === 'prisonSlam') { staff = { a: 0, base: [51, 69] }; H1 = [49, 34]; H2 = [45, 28]; by = [2, 2, 1][f]; sq = by; shards = f === 0 ? 1 : f === 1 ? 2 : 0; runes = f < 2 ? 2 : 0; cb = 5; ln = 2; }
  else if (st === 'fanWind') { staff = { a: -1.15, grip: 0.3 }; H1 = [24, 20 - f]; H2 = [30, 18 - f]; frost = 1 + f; ln = -2; cb = 4; }
  else if (st === 'fanSwing') { staff = { a: [-0.1, 1.2, 2.1][f], grip: 0.3 }; H1 = [[32, 12], [50, 24], [48, 36]][f]; H2 = [[36, 12], [44, 22], [42, 32]][f]; frost = 2; ln = [0, 3, 2][f]; cb = 6; trail = [-1.1, [-0.1, 1.2, 2.1][f]]; }
  else if (st === 'cast') { H1 = [46, 24]; staff = { a: 0.15, grip: 0.4 }; H2 = [16, 14 - (f % 2)]; palmOrb = 2; glowTip = 2; cb = 3 + (f % 2); }
  else if (st === 'stagger') { by = 3; staff = { a: 0.5, grip: 0.45 }; H1 = [46, 44]; eyesFlare = -1; cb = 1; }
  const B = (x, y) => [x + ln, y + by];
  const STEEL = ['#0a0f1c', '#18223a', '#2a3a5a', '#46608a'], STEELD = ['#06090f', '#10172a', '#1c2842', '#2e4062'], FROST = ['#2a5a8a', '#4a8ac0', '#8ac8f0', '#d8f4ff'];
  const ROBE = ['#0c1030', '#1a2260', '#2a3890', '#4458c0'], CLOAK = ['#080c1e', '#121c40', '#1e2e62', '#2e4488'], FUR = ['#9ab0c8', '#c8dcec', '#eef6ff', '#ffffff'], ICE = PAL.ice;
  const EYE = P.dim || eyesFlare < 0 ? '#2a4a5a' : eyesFlare > 0 || P.rage ? '#ffffff' : '#6ef0ff', GY = 67;
  // ----- áo choàng hoàng gia sau hai vai, bay theo khung / giật lùi khi bắn tia -----
  const hem = []; for (let i = 0; i <= 12; i++) { const t = i / 12, x = 50 - t * (50 + cb * 2.6) + Math.sin(f * 1.57 + i * 1.2) * 1.4, y = 62 + (i % 2 ? 4 : 0) + Math.round(hsh(i, 5) * 3) - t * cb * 1.6; hem.push([x, y]); }
  part(g, poly([B(15, 15), B(49, 15), [53 + ln * 0.3, 40], ...hem, [2 - cb * 2.2, 40], [8 - cb, 24 + by]]), CLOAK, { tex: (x, y, c, i) => (Math.round(x * 0.35 + y * 0.05) % 3 === 0 && i > 0) ? CLOAK[i - 1] : c });
  // ----- áo dài chấm đất, viền lông trắng; mép áo gợn sóng khi đi -----
  const skirt = []; for (let i = 0; i <= 10; i++) { const t = i / 10, x = 52 - t * 40, y = GY - 1 + Math.round(Math.sin(t * 9 + wave * 1.6) * (wave || st === 'walk' ? 1.2 : 0.4)); skirt.push([x, y]); }
  part(g, poly([B(23, 34), B(41, 34), [50, 58], ...skirt, [14, 58]]), ROBE, { tex: (x, y, c, i) => {
    const edge = skirt[Math.max(0, Math.min(10, Math.round((52 - x) / 4)))][1];
    if (y > edge - 3) return FUR[Math.min(3, i + (y > edge - 1 ? 0 : 1))];                                           // viền lông trắng ở gấu
    const mx = 32 + ln * (1 - (y - 34) / 34); if (Math.abs(x - mx) < 3 + (y - 34) * 0.12) return Math.abs(x - mx) < 0.8 ? FROST[3] : FROST[Math.min(3, i)]; // dải băng giữa vạt trước
    if ((Math.round(x * 0.4 + y * 0.08)) % 4 === 0) return ROBE[Math.max(0, i - 1)];                                  // nếp áo dọc
    return c; } });
  // ----- thân trên chữ V: vai rộng → eo, giáp thép – băng, lõi băng giữa ngực -----
  part(g, poly([B(13, 18), B(51, 18), B(41, 36), B(23, 36)]), STEEL, { tex: (x, y, c, i) => {
    const mx = 32 + ln, cy = 26 + by, dx = Math.abs(x - mx), dy = y - cy;
    if (dx + Math.abs(dy) * 0.7 < 3.2) return dx + Math.abs(dy) * 0.7 < 1.5 ? '#ffffff' : '#6ef0ff';
    if (dx + Math.abs(dy) * 0.7 < 4.8) return FROST[1];
    if (y < 30 + by && Math.abs(dx - (y - 18 - by) * 0.9 - 4) < 1) return FROST[2];
    if (y >= 31 + by && Math.round((y - by) / 2) % 2 === 0 && dx < 7) return STEEL[Math.min(3, i + 1)];
    return c; } });
  part(g, poly([B(22, 34), B(42, 34), B(42, 37), B(22, 37)]), FUR);                                                       // đai lông ở eo
  // ----- giáp vai băng nhiều gai (sáng nhịp) -----
  const SPK = pulse || glowTip > 1 ? ['#4a8ac0', '#8ac8f0', '#d8f4ff', '#ffffff'] : FROST;
  for (const [px, s] of [[14, -1], [50, 1]]) { const [qx, qy] = B(px, 18);
    part(g, ell(qx, qy + 2, 8.5, 5.5), STEEL, { tex: (x, y, c, i) => y > qy + 4 ? FUR[Math.min(3, i)] : c });
    part(g, uni(tri([qx - 6, qy], [qx - 5 + s, qy - 12], [qx - 2, qy]), tri([qx - 2, qy - 1], [qx + s * 3, qy - 15], [qx + 2, qy - 1]), tri([qx + 1, qy], [qx + s * 8, qy - 11], [qx + 5, qy + 1]), tri([qx + s * 5, qy + 1], [qx + s * 11, qy - 4], [qx + s * 7, qy + 4])), SPK); }
  // ----- mũ sắt thon, khe mặt chữ V, mắt lam; vương miện băng 5 gai -----
  const [hx, hy] = B(32, 7);
  part(g, poly([[hx - 8.5, hy - 5], [hx + 8.5, hy - 5], [hx + 8, hy + 3], [hx + 3, hy + 10], [hx, hy + 11.5], [hx - 3, hy + 10], [hx - 8, hy + 3]]), STEEL, { tex: (x, y, c) => {
    const dx = x - hx, vy = hy + 1 + Math.abs(dx) * 0.55; if (Math.abs(dx) < 7 && y > vy - 2 && y < vy + 1.4) return PAL.void[1]; if (Math.abs(dx) < 0.7 && y > hy + 3) return FROST[2]; return c; } });
  for (const s of [-1, 1]) { dot(g, hx + s * 3 - (s < 0 ? 2 : 0), hy + 2, EYE, 3, 1); if (!P.dim) dot(g, hx + s * 4 - (s < 0 ? 1 : 0), hy + 3, eyesFlare > 0 ? '#6ef0ff' : '#2a8ab0', 2, 1); }
  if (eyesFlare > 0) for (const s of [-1, 1]) { dot(g, hx + s * 6, hy + 1, '#a8f0ff'); dot(g, hx + s * 7, hy, '#ffffff'); }
  part(g, uni(poly([[hx - 8, hy - 7], [hx + 8, hy - 7], [hx + 7, hy - 4], [hx - 7, hy - 4]]), tri([hx - 8, hy - 7], [hx - 10, hy - 14], [hx - 5, hy - 7]), tri([hx - 5, hy - 7], [hx - 4, hy - 16], [hx - 1, hy - 7]), tri([hx - 2, hy - 7], [hx, hy - 20], [hx + 2, hy - 7]), tri([hx + 1, hy - 7], [hx + 4, hy - 16], [hx + 5, hy - 7]), tri([hx + 5, hy - 7], [hx + 10, hy - 14], [hx + 8, hy - 7])), ICE,
    { tex: (x, y, c, i) => (y < hy - 11 && i > 1) ? '#ffffff' : c });
  // ----- tay xa (lòng bàn tay vuốt băng) -----
  const arm = (sx, h, pal, out) => { const [qx, qy] = B(sx, 21), wx = h[0] + ln, wy = h[1] + by, ex = (qx + wx) / 2 + out, ey = (qy + wy) / 2 + 3;
    part(g, smin(2, cap(qx, qy, ex, ey, 4, 3.4), cap(ex, ey, wx, wy, 3.4, 3), ell(wx, wy, 3.2, 3)), pal); return [wx, wy]; };
  const palm = arm(16, H2, STEELD, -3);
  if (!/^beam/.test(st)) for (let k = -1; k <= 1; k++) dot(g, palm[0] + 3, palm[1] + k * 1.5, FROST[3]);             // vuốt (khi không nắm gậy)
  // ----- gậy băng: đáy có gai, đốt bạc, đầu pha lê kim cương xoay / nhấp nháy -----
  const sd = [Math.sin(staff.a), -Math.cos(staff.a)], h1 = [H1[0] + ln, H1[1] + by];
  const bot = staff.base ? [staff.base[0] + ln, staff.base[1]] : [h1[0] - sd[0] * SL * staff.grip, h1[1] - sd[1] * SL * staff.grip], top = [bot[0] + sd[0] * SL, bot[1] + sd[1] * SL];
  part(g, cap(bot[0], bot[1], top[0], top[1], 2.2), PAL.shaft, { tex: (x, y, c) => { const t = (x - bot[0]) * sd[0] + (y - bot[1]) * sd[1]; return Math.round(t) % 9 === 0 ? FUR[2] : c; } });
  part(g, tri([bot[0] - sd[1] * 2, bot[1] + sd[0] * 2], [bot[0] + sd[1] * 2, bot[1] - sd[0] * 2], [bot[0] - sd[0] * 5, bot[1] - sd[1] * 5]), FROST);   // gai đáy gậy
  if (frost) part(g, poly([[top[0] - sd[1] * 1.5, top[1] + sd[0] * 1.5], [top[0] - sd[0] * 26 - sd[1] * (2 + frost * 2), top[1] - sd[1] * 26 + sd[0] * (2 + frost * 2)], [top[0] - sd[0] * 28, top[1] - sd[1] * 28], [top[0] + sd[1] * 1.5, top[1] - sd[0] * 1.5]]), ['#4a8ac0', '#8ac8f0', '#d8f4ff', '#ffffff']);   // lưỡi băng lưỡi liềm phủ nửa trên gậy
  const cw = [5.5, 4, 2, 4][f % 4], ch = 10, cc = [top[0] + sd[0] * 3, top[1] + sd[1] * 3], CR = pulse || glowTip ? ['#8ac8f0', '#d8f4ff', '#e0ffff', '#ffffff'] : ICE;
  part(g, poly([[cc[0] + sd[0] * ch, cc[1] + sd[1] * ch], [cc[0] - sd[1] * cw, cc[1] + sd[0] * cw], [cc[0] - sd[0] * 3, cc[1] - sd[1] * 3], [cc[0] + sd[1] * cw, cc[1] - sd[0] * cw]]), CR);    // pha lê kim cương
  part(g, uni(tri([top[0] - sd[1] * 3, top[1] + sd[0] * 3], [top[0] + sd[0] * 4 - sd[1] * 4, top[1] + sd[1] * 4 + sd[0] * 4], [top[0], top[1]]), tri([top[0] + sd[1] * 3, top[1] - sd[0] * 3], [top[0] + sd[0] * 4 + sd[1] * 4, top[1] + sd[1] * 4 - sd[0] * 4], [top[0], top[1]])), PAL.gold);  // móc đỡ pha lê
  const tip = [cc[0] + sd[0] * 4, cc[1] + sd[1] * 4];
  // ----- tay gần nắm gậy (vẽ sau gậy) -----
  arm(48, H1, STEEL, 3);
  if (/^beam/.test(st)) part(g, ell(palm[0], palm[1], 3.2, 3), STEELD);                                                   // nắm tay sau ôm thân gậy
  // ----- quả cầu tụ năng lượng 3×3 + tia hội tụ -----
  const orb3 = (x, y, lv) => { g.rect(Math.round(x) - 2, Math.round(y) - 2, 5, 5, OUT); g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, lv > 1 ? '#ffffff' : '#a8f0ff'); g.set(Math.round(x), Math.round(y), '#ffffff');
    for (let k = 0; k < 4 + lv * 2; k++) { const q = hsh(k, f + 3) * 6.28, r = 4 + hsh(f, k) * (lv > 1 ? 3 : 6); dot(g, x + Math.cos(q) * r, y + Math.sin(q) * r, k % 2 ? '#6ef0ff' : '#e0ffff'); } };
  if (glowTip) orb3(tip[0], tip[1], glowTip);
  if (palmOrb) orb3(palm[0] + 4, palm[1], palmOrb);
  // ----- vòng rune băng dưới gấu áo (ngục gai) -----
  if (runes) for (let k = 0; k < 20; k++) { const q = k / 20 * 6.28 + f * 0.3, x = 32 + Math.cos(q) * (26 + runes * 2), y = GY + Math.sin(q) * 4; if (k % 2 === 0) { dot(g, x, y, runes > 1 ? '#ffffff' : '#6ef0ff', 2, 1); } }
  // ----- mảnh băng bắn tung từ đáy gậy khi nện xuống -----
  if (shards) for (let k = 0; k < 14; k++) { const q = k / 14 * 6.28, r = 5 + shards * 6 + hsh(k, f) * 3; dot(g, bot[0] + Math.cos(q) * r, Math.min(GY + 1, bot[1] - 1 + Math.sin(q) * r * 0.45), k % 3 ? '#a8f0ff' : '#ffffff'); }
  // ----- vệt chém quạt lam theo cung vung gậy -----
  if (trail) { const piv = h1; for (let q = trail[0]; q <= trail[1]; q += 0.04) for (let w = 0; w < 4; w++) { const r = SL * (1 - staff.grip) + 4 - w, x = piv[0] + Math.sin(q) * r, y = piv[1] - Math.cos(q) * r; if (y > -16 && y < GY + 2) g.set(Math.round(x), Math.round(y), w === 0 ? '#ffffff' : w < 2 ? '#a8f0ff' : '#3ad0f0'); } }
  // ----- sương lạnh rơi từ gai vai / đầu gậy (idle), bụi tuyết sau gấu áo (walk) -----
  if (mist) for (let k = 0; k < 6; k++) { const src = k < 3 ? B(k % 2 ? 50 : 14, 6) : tip; dot(g, src[0] + (hsh(k, 7) - 0.5) * 8, src[1] + 2 + mist * 3 + hsh(k, f) * 4, k % 2 ? '#d8f4ff' : '#9ad8f0'); }
  if (dust) for (let k = 0; k < 3; k++) dot(g, 12 - k * 3 - (f + k) % 3, GY - 1 - ((f + k * 2) % 4), k % 2 ? '#ffffff' : '#bfe8ff');
  const c = g.canvas(OUT); c.tip = [tip[0] + 24 + 1, tip[1] + 16 + 1]; c.palm = c.tip; return c;   // cả hai tia phát từ pha lê đầu gậy (xòe chữ V)
}

// ================= 4. IGNIVAR: rồng cánh dơi đứng 4 điểm — cổ tay cánh chống đất làm chân trước, 2 chân sau thấp, cổ chữ S, đuôi dài =================
const SCL = ['#1a0a0e', '#3a1016', '#6a1a1c', '#a02c22'], SCD = ['#120608', '#260a0e', '#441216', '#6a1c1a'], MEM = ['#3a0e0a', '#7a2210', '#c8501a', '#ff8a3a'], MEMD = ['#24080a', '#4a140e', '#7a2a14', '#a84a20'], BELLY = ['#6a2a0a', '#b8561a', '#ff9a3a', '#ffd27a'];
function dragon(P) {
  const W = 120, H = 88, g = mk(W, H, 4, 6), st = P.st || 'idle', f = P.f | 0;
  let by = 0, hx = 90, hy = 12, mouth = 0, throat = 0, flare = 0, step = 0, lift = 0, rear = 0, tailPh = f * 1.57, tailEnd = null, air = 0, droop = 0, lean = 0, breath = 0, embers = 0;
  if (st === 'idle') { by = [0, 0, 1, 1][f]; hy += [0, 0, 1, 1][f]; throat = f % 2; breath = [0, 1, 2, 1][f]; flare = [0, 0.08, 0.15, 0.08][f]; }
  else if (st === 'walk') { step = [1, 0, -1, 0][f]; lift = f % 2 ? 3 : 0; by = [1, -1, 1, -1][f]; hy += [1, 0, 1, 0][f]; hx += step; breath = f % 2; flare = [0.05, 0.12, 0.05, 0.12][f]; }
  else if (st === 'wind') { hx = [84, 80, 77][f]; hy = [9, 5, 3][f]; throat = 1 + f; flare = [0.6, 1, 1.1][f]; mouth = [0, 1, 1][f]; breath = 2; embers = 1 + f; }   // ngửa đầu, xòe cánh, họng – miệng rực sáng, tàn lửa bốc lên     // ngửa cổ hít lửa, cánh xòe rộng
  else if (st === 'cast') { hx = 100; hy = 24; mouth = 3; throat = 3; flare = 0.6; lean = 3; }                       // vươn cổ phun lửa
  else if (st === 'slam') { rear = [9, -2, -2, 0][f]; by = [-2, 3, 3, 1][f]; hx = [82, 104, 104, 96][f]; hy = [6, 24, 24, 18][f]; mouth = [1, 3, 3, 1][f]; throat = [1, 3, 3, 1][f]; flare = [0.7, 0.4, 0.4, 0.2][f]; lean = [0, 5, 5, 2][f]; }   // lao đầu tới, há to gầm
  else if (st === 'cleave') { tailEnd = [[10, 4], [24, 84], [86, 84], [18, 74]][f]; lean = [-2, 2, 3, 1][f]; hx = [86, 90, 92, 90][f]; hy = [10, 16, 18, 14][f]; }
  else if (st === 'dash') { lean = 6; by = 3; hx = 104; hy = 26; flare = 0.8; mouth = 1; step = f % 2 ? 1 : -1; }
  else if (st === 'rise') { air = 1; flare = f % 2 ? 1.2 : -0.6; by = -3 + f * 2; }
  else if (st === 'stagger') { hx = 92; hy = 40; mouth = 1; by = 3; droop = 1; }
  const fy = 80 - air * 8, R = (x, y) => y - rear * Math.max(0, (x - 30) / 50);     // nửa trước nhấc lên khi chồm
  const hip = [38 + lean * 0.4, 52 + by], chest = [64 + lean, R(64, 46 + by)], sh = [62 + lean, R(62, 40 + by)];
  const CLAW = ['#2a2420', '#5a5048', '#8a7e70', '#b8ac9c'];
  const tc = (P.rage ? ['#ff5a1a', '#ffb04a', '#ffe27a', '#ffffff'] : ['#c83a12', '#ff7a2a', '#ffc04a', '#fff3b0'])[Math.min(3, throat)];
  // ----- cánh – chân trước: vai → khuỷu → cổ tay chống đất (móc vuốt), các ngón dài gập ngược lên trên lưng -----
  const wing = (ox, s, dark) => {
    // vai S → khuỷu E (gập ra sau) → khớp cánh K nhô cao trên lưng → ngón dài nhất chạy xuống chống đất G (chân trước); 3 ngón còn lại xòe về sau
    const S = [sh[0] + ox, sh[1] - (dark ? 2 : 0)], up = air || rear > 6, k = Math.max(0, Math.min(1, flare)), flex = st === 'walk' ? s * 3 : 0;
    const K = [S[0] + 6 + k * 4 + flex, S[1] - 32 - k * 8 + (flare < 0 ? 28 : 0) + droop * 14], E = [S[0] - 8 + k * 2, S[1] - 14 - k * 4 + (flare < 0 ? 12 : 0)];
    const G = up ? [K[0] + 14, K[1] + 22] : [S[0] + 18 + s * 5 + (dark ? -3 : 0), fy - (lift && (dark ? step < 0 : step > 0) ? lift : 0)];
    const fold = [[-24, -2], [-40, 10], [-54, 22]], wide = [[-26, -20], [-50, -12], [-72, 6]], low = [[-24, 14], [-42, 22], [-58, 18]];
    const base = flare < 0 ? low : fold, tips = base.map((p, i) => [K[0] + p[0] + (wide[i][0] - p[0]) * k, K[1] + p[1] + (wide[i][1] - p[1]) * k + droop * (6 + i * 3)]);
    const back = [hip[0] - 8, hip[1] - 9];
    const mem = [K]; tips.forEach((t, i) => { mem.push(t); const n = tips[i + 1]; if (n) { const mx = (t[0] + n[0]) / 2, my = (t[1] + n[1]) / 2; mem.push([mx + (K[0] - mx) * 0.25, my + (K[1] - my) * 0.25]); } });
    mem.push([(tips[2][0] + back[0]) / 2 + 2, (tips[2][1] + back[1]) / 2 + 3], back, S, E);
    part(g, poly(mem), dark ? MEMD : MEM, { tex: (x, y, c, i) => hsh(x >> 1, y >> 2) < 0.08 ? (dark ? MEMD : MEM)[Math.max(0, i - 1)] : c });   // màng cánh cam than hồng
    const bone = dark ? SCD : SCL;
    part(g, uni(smin(2, cap(S[0], S[1], E[0], E[1], 5, 3.8), cap(E[0], E[1], K[0], K[1], 3.8, 3), ell(K[0], K[1], 3, 3)), ...(up ? [cap(K[0], K[1], G[0], G[1] - 2, 3, 2.4)] : []), ...tips.map(t => cap(K[0], K[1], t[0], t[1], 1.6, 0.8))), bone);
    part(g, tri([K[0] - 1, K[1] - 2], [K[0] + 3, K[1] - 7], [K[0] + 3, K[1] - 1]), IVORY);                                                   // gai khớp cánh
    if (up) part(g, uni(tri([G[0] - 1, G[1] - 3], [G[0] + 7, G[1] - 1], [G[0] + 1, G[1]]), tri([G[0] - 3, G[1] - 3], [G[0] + 3, G[1] - 1], [G[0] - 4, G[1]])), CLAW); // vuốt cánh (chỉ khi bay)
  };
  // ----- chân sau thấp, cơ bắp (đùi – cẳng – bàn – vuốt) -----
  const leg = (ox, s, pal) => {
    const h0 = [hip[0] + ox, hip[1] + 2], kx = h0[0] + 7 + s * 3, ky = h0[1] + 9, ax = h0[0] - 1 + s * 5, ay = fy - 8, ll = st === 'walk' && lift && (ox < 0 ? step > 0 : step < 0) ? lift : 0, fx = ax + 5;
    part(g, smin(2.5, ell(h0[0], h0[1], 9, 7.5), cap(h0[0], h0[1] + 2, kx, ky, 6, 4.5), cap(kx, ky, ax, ay - ll, 4.5, 3), cap(ax, ay - ll, fx, fy - 2 - ll, 3, 2.4)), pal);
    for (let k = 0; k < 3; k++) part(g, tri([fx - 1 + k * 3, fy - 3 - ll], [fx + 4 + k * 3, fy - ll], [fx - 2 + k * 3, fy - ll]), CLAW);
  };
  // chân trước cơ bắp gập khớp, bàn chân có vuốt đặt dưới ngực (thay cho ngón cánh chống đất)
  const foreleg = (ox, s, pal) => {
    const up = air || rear > 6, S0 = [sh[0] + ox + 2, sh[1] + 5], E0 = [S0[0] - 5, S0[1] + 11], ll = st === 'walk' && lift && (ox < 0 ? step < 0 : step > 0) ? lift : 0;
    const Wr = up ? [S0[0] + 6, S0[1] + 16] : [S0[0] + 3 + s * 4, fy - 7 - ll], F0 = up ? [Wr[0] + 5, Wr[1] + 3] : [Wr[0] + 4, fy - 2 - ll], gy = up ? F0[1] + 1 : fy - ll;
    part(g, smin(2.5, ell(S0[0], S0[1], 7, 6.5), cap(S0[0], S0[1], E0[0], E0[1], 6, 5), cap(E0[0], E0[1], Wr[0], Wr[1], 5, 3.6), cap(Wr[0], Wr[1], F0[0], F0[1], 3.6, 3)), pal, { tex: (x, y, c, i) => ((x + y * 2) % 5 === 0 && i > 0) ? pal[i - 1] : c });
    for (let k = 0; k < 3; k++) part(g, tri([F0[0] - 1 + k * 3, gy - 3], [F0[0] + 3 + k * 3, gy], [F0[0] - 2 + k * 3, gy]), CLAW);
  };
  wing(-6, -step, true);                                 // cánh xa (sau thân)
  leg(-6, -step, SCD);
  foreleg(-5, -step, SCD);                               // chân trước xa
  // ----- đuôi dài uốn lượn, thon dần, gai lưng, lưỡi đuôi -----
  const t0 = [hip[0] - 10, hip[1] + 1], te = tailEnd || [Math.sin(tailPh) * 3 - 2, 44 + Math.cos(tailPh) * 6 + by], tm = [(t0[0] + te[0]) / 2 + 2, Math.max(t0[1], te[1]) + 14 + Math.sin(tailPh + 1) * 3];
  const tpts = bez(t0, tm, te, 10);
  part(g, chain(tpts, 7, 1.6), SCL, { tex: (x, y, c, i, nx, ny) => ny > 0.45 ? BELLY[Math.min(3, i)] : c });
  for (let k = 1; k < 9; k += 2) { const [x, y] = tpts[k], s = 4 - k * 0.3; part(g, tri([x - s * 0.6, y - s * 0.9], [x - s * 0.2, y - s * 2.1], [x + s * 0.6, y - s * 0.9]), IVORY); }
  const tl = tpts[10], tp = tpts[9], ta = Math.atan2(tl[1] - tp[1], tl[0] - tp[0]);
  part(g, poly([[tl[0] + Math.cos(ta) * 7, tl[1] + Math.sin(ta) * 7], [tl[0] - Math.sin(ta) * 4, tl[1] + Math.cos(ta) * 4], [tl[0] - Math.cos(ta) * 2, tl[1] - Math.sin(ta) * 2], [tl[0] + Math.sin(ta) * 4, tl[1] - Math.cos(ta) * 4]]), SCD);
  wing(0, step, false);                                  // cánh gần: vẽ sau lưng thân để đầu – cổ luôn nổi rõ phía trước
  // ----- thân thon + cổ chữ S + đầu sừng: một khối liền; bụng cam than hồng -----
  const n0 = [chest[0] + 2, chest[1] - 6], neck = [...bez(n0, [hx - 10, hy + 30], [hx - 16, hy + 12], 5), ...bez([hx - 16, hy + 12], [hx - 15, hy + 3], [hx - 7, hy + 2], 3).slice(1)];
  const skull = poly([[hx - 8, hy - 3], [hx - 2, hy - 6], [hx + 8, hy - 3], [hx + 15, hy], [hx + 15, hy + 2], [hx + 4, hy + 3], [hx - 7, hy + 4]]);
  const jaw = poly([[hx - 7, hy + 3], [hx + 4, hy + 3 + mouth], [hx + 14, hy + 3 + mouth * 2.2], [hx + 13, hy + 6 + mouth * 2.2], [hx + 3, hy + 9 + mouth], [hx - 6, hy + 8]]);
  part(g, uni(smin(4, ell(hip[0] + 6, hip[1] - 5, 14, 8.5), ell(chest[0], chest[1], 10 + throat * 0.3 + breath * 0.5, 9 + breath * 0.4), chain(neck, 5.5, 3.4)), skull), SCL, { tex: (x, y, c, i, nx, ny) => {
    if (y >= hy - 7 && y <= hy + 9 && x > hx - 9) { if (y > hy + 3 && x > hx - 5) return SCD[Math.min(3, i)]; return c; }
    if (ny > 0.35) return BELLY[Math.min(3, i)];                                                                  // bụng, họng vảy cam
    if (ny < -0.4) return hsh(x * 2, y) < 0.1 && i > 1 ? '#ff7a3a' : SCD[Math.min(3, i)];                          // giáp lưng vỏ chai, ánh than
    return c; } });
  part(g, jaw, SCD, { tex: (x, y, c, i) => y > hy + 6 + mouth ? SCD[Math.max(0, i - 1)] : c });                                  // hàm dưới tách khối, cằm rõ
  if (!mouth) for (let x = hx - 3; x <= hx + 12; x++) g.set(x, hy + 3, x % 3 ? MEM[2] : MEM[3]);                                       // khe miệng dung nham khi ngậm
  for (let k = 0; k < 5; k++) { const p = k < 2 ? [hip[0] - 2 + k * 9, hip[1] - 13] : neck[Math.min(neck.length - 2, (k - 2) * 2 + 1)]; part(g, tri([p[0] - 2, p[1] - 3], [p[0] - 1, p[1] - 8], [p[0] + 2, p[1] - 3]), IVORY); } // gai lưng
  for (let i = 1; i < neck.length; i++) { const [x, y] = neck[i]; glowLine(g, x + 2, y + 2, x + 3, y + 3, i % 2 ? tc : MEM[Math.min(3, throat + 1)]); }    // họng than hồng
  part(g, chain(bez([hx - 4, hy - 4], [hx - 12, hy - 10], [hx - 21, hy - 9], 5), 2.3, 0.6), IVORY);
  part(g, chain(bez([hx, hy - 5], [hx - 6, hy - 13], [hx - 14, hy - 15], 4), 1.9, 0.5), IVORY);
  for (let x = hx + 3; x <= hx + 13; x += 3) { g.set(x, hy + 3, '#fffaf0'); g.set(x, hy + 4, '#ece2c4'); }
  for (let x = hx + 4; x <= hx + 12; x += 3) g.set(x, hy + 2 + mouth * 2.2 * ((x - hx) / 13) + (mouth ? 1 : 2), '#fffaf0');
  if (mouth) { for (let x = hx + 2; x < hx + 12; x++) for (let y = hy + 4; y < hy + 3 + mouth * 2.2 * ((x - hx) / 13) + 1; y++) if (g.get(x, y) && g.get(x, y) !== OUT) g.set(x, y, tc); }
  const eye = P.dim ? '#3a2a12' : P.rage ? '#FDE68A' : '#F59E0B'; dot(g, hx + 3, hy - 2, eye, 3, 1); dot(g, hx + 4, hy - 3, OUT);
  if (mouth >= 2) for (let i = 0; i < 10; i++) dot(g, hx + 15 + hsh(i, f) * 8, hy + 1 + hsh(f, i) * (2 + mouth * 2), i % 3 ? PAL.fire[2] : PAL.fire[3]);
  if (embers) for (let i = 0; i < 6 + embers * 4; i++) dot(g, hx + 4 + hsh(i, f + 5) * 14, hy - 2 - hsh(f + 5, i) * (6 + embers * 5), i % 3 ? PAL.fire[1] : PAL.fire[3]);   // tàn lửa bốc lên khi hít lửa
  if (embers) for (let i = 0; i < neck.length; i++) { const [x, y] = neck[i]; dot(g, x + 1, y + 2, embers > 2 ? '#fff3b0' : PAL.fire[2]); }                           // cổ họng rực sáng
  leg(4, step, SCL);                                     // chân sau gần
  foreleg(1, step, SCL);                                 // chân trước gần
  const c = g.canvas(OUT); c.mouth = [hx + 15 + 4 + 1, hy + 2 + 6 + 1]; return c;
}

// ================= 5. STORM SOVEREIGN: giữ nguyên thiết kế, mép áo không lặp, vương miện bay + cầu sét quay khi thi phép =================
function sovereign(P) {
  const W = 64, H = 70, g = mk(W, H, 3, 4), st = P.st || 'idle', f = P.f | 0;
  let by = 0, ln = 0, tp = 0, L = [12, 40], Rh = [45, 40], orbR = 3.5 + (f % 2) * 0.5, cd = [0, -1, -2, -1][f], bolt = false, ctilt = 0, orbit = 0;
  if (st === 'idle') { by = [0, -1, -1, 0][f]; tp = f % 2; }
  else if (st === 'walk') { ln = 3; tp = 2 + (f % 2); L = [9, 36]; Rh = [41, 43]; }
  else if (st === 'wind' || st === 'rise') { const k = st === 'rise' ? 2 : f; L = [[11, 28], [7, 14], [6, 12]][k]; Rh = [[46, 28], [50, 14], [51, 12]][k]; orbR = [4, 5, 6][k]; cd = k ? -3 : -1; orbit = 1; }
  else if (st === 'cast') { L = [46, 30]; Rh = [52, 36]; orbR = 4 + (f % 2); bolt = true; ln = 2; orbit = 1; cd -= 1; }
  else if (st === 'slam' || st === 'cleave') { L = [[12, 24], [48, 30], [50, 31], [44, 36]][f]; Rh = [[44, 24], [53, 36], [54, 37], [48, 40]][f]; ln = [0, 3, 3, 1][f]; orbR = f === 1 || f === 2 ? 5 : 3.5; bolt = f === 1 || f === 2; }   // đẩy hai tay ra trước, phóng sét
  else if (st === 'dash') { ln = 5; tp = 4; L = [6, 34]; Rh = [38, 44]; }
  else if (st === 'stagger') { by = 3; ctilt = 2; L = [14, 50]; Rh = [44, 50]; orbR = 2; cd = 0; }
  const B = (x, y) => [x + ln, y + by];
  // mép áo rách: độ dài từng tua lấy theo nhiễu (không lặp răng cưa đều), gợn theo khung
  const hem = [];
  for (let i = 0; i <= 14; i++) { const x = 11 + i * 2.45 - tp * (1 + (14 - i) * 0.22) - (i < 6 ? (6 - i) * 0.6 : 0), tip = i % 2 === 0, y = (tip ? 62 + Math.round(hsh(i, 11) * 8) + Math.round((14 - i) * 0.3) : 57 + Math.round(hsh(i, 13) * 3)) + Math.round(Math.sin(f * 1.57 + i * 0.9) * 2); hem.push([x, y]); }   // tua áo dài ngắn so le, lệch về phía gió
  const ROB = ['#140c22', '#2E1A47', '#4A2574', '#6b3a9e'], GOLD = ['#6a4a1a', '#a8782a', '#d8a84a'], CRIM = '#a01a3a';
  const neb = (x, y) => { const u = (x - y * 0.55) * 0.42 + Math.sin(y * 0.22 + f * 0.5) * 1.6; return Math.sin(u) * 1.1 + Math.sin(u * 0.5 + y * 0.12) * 0.7; }; // vệt tinh vân chéo uốn lượn
  const hemTop = []; for (const [x, y] of hem) hemTop.push([x, y]);
  part(g, poly([B(19, 24), B(37, 24), [44 + ln * 0.5, 44 + by], ...hem.reverse(), [10 + ln * 0.2 - tp, 44 + by]]), ROB, { tex: (x, y, c, i) => {
    if (y < 40 + by) return c; const v = neb(x, y);
    if (v > 1.6) return hsh(x * 5, y * 7) < 0.1 ? '#ffffff' : '#c8a0f0';                                        // lõi tinh vân, vài sao sáng
    if (v > 1.25) return '#8a52c8'; if (v > 0.9) return ROB[Math.min(3, i + 1)];
    return c; } });
  part(g, cap(...B(20, 27), L[0] + ln, L[1] + by, 3.5, 2.5), ROB, { lift: -0.12, tex: (x, y, c, i) => (x + y * 2) % 7 === 0 && i > 0 ? ROB[i - 1] : c });
  const midX = 28 + ln;
  part(g, poly([B(20, 23), B(36, 23), B(34, 40), B(34, 47 + (f % 2)), B(32, 44), B(30, 53 - (f % 2)), B(28, 46), B(26, 51 + (f % 2)), B(24, 45), B(22, 49 - (f % 2)), B(22, 40)]), ROB, { tex: (x, y, c, i) => {   // vạt thân rủ xuống thành tua lởm chởm, không còn mép cắt ngang hông
    const w = 1.5 + (y - 23 - by) * 0.12, dx = x - midX;
    if (Math.abs(dx) < w) return hsh(x * 3, y) < 0.14 ? (hsh(y, x) < 0.5 ? '#ffffff' : '#a8e0ff') : PAL.void[1 + (y & 1)]; // khe áo hở thấy vũ trụ
    if (Math.abs(Math.abs(dx) - w - 0.5) < 0.6) return GOLD[2];                                                   // đường viền vàng hai mép khe
    if (Math.abs(dx) > w && (Math.round(dx * 0.7 + y * 0.35) % 4 === 0)) return ROB[Math.max(0, i - 1)];          // nếp gấp chéo
    return ROB[Math.min(3, i + (dx < 0 ? 1 : 0))]; } });
  for (const [s, sx] of [[-1, 20], [1, 36]]) { const [px, py] = B(sx, 25); // giáp vai vàng sạm viền đỏ thẫm, ngọc đỏ giữa
    part(g, uni(ell(px, py, 4.6, 3.4), tri([px + s * 2, py - 2], [px + s * 6, py - 5], [px + s * 4, py + 1])), GOLD, { tex: (x, y, c, i) => y > py + 1.5 ? CRIM : c }); dot(g, px, py, '#ff4a5a'); }
  glowLine(g, ...B(21, 24), midX - 1, 30 + by, GOLD[2]); glowLine(g, ...B(35, 24), midX + 1, 30 + by, GOLD[2]);              // đường may cổ áo hình chữ V
  const [hx, hy] = B(28, 16);
  part(g, uni(ell(hx, hy, 7.5, 7.5), tri([hx - 6, hy - 3], [hx - 2, hy - 11], [hx + 2, hy - 6])), ROB, { tex: (x, y, c, i) => (Math.round(x - hx + (y - hy) * 0.6) % 5 === 0 && i > 0) ? ROB[i - 1] : c }); // mũ có nếp, chóp nhọn
  part(g, ell(hx + 1.5, hy + 1.5, 4.2, 4.5), PAL.void, { line: false, tex: (x, y, c) => { const r = inE(x, y, hx + 1.5, hy + 1.5, 4.2, 4.5); return r > 0.7 ? ((x + y + f) % 3 ? '#5a1440' : '#a0285a') : c; } }); // hào quang đỏ–tím rỉ quanh viền mặt
  { const E1 = P.dim ? '#6a2030' : '#EF4444', E2 = P.dim ? '#8a3040' : P.rage ? '#ffffff' : '#FCA5A5', ey = hy + 1;
    for (const [x, y, k] of [[hx - 1, ey - 1, 0], [hx, ey, 0], [hx + 1, ey, 1], [hx + 5, ey - 1, 0], [hx + 4, ey, 0], [hx + 3, ey, 1]]) g.set(x, y, k ? E2 : E1); // mắt xếch, lõi sáng phía trong
    for (const [x, y] of [[hx - 2, ey - 2], [hx - 1, ey - 2], [hx, ey - 1], [hx + 6, ey - 2], [hx + 5, ey - 2], [hx + 4, ey - 1]]) g.set(x, y, '#2a1438'); } // gờ mày cau xuống
  // vương miện nguyên tố lơ lửng (nhấp nhô theo khung)
  const cx = hx, cy = hy - 12 + cd + ctilt;
  part(g, poly([[cx - 7, cy + 3 + ctilt], [cx - 7, cy - 2], [cx - 4, cy + 1], [cx - 2, cy - 5], [cx, cy], [cx + 2, cy - 5], [cx + 4, cy + 1], [cx + 7, cy - 2], [cx + 7, cy + 3 - ctilt]]), st === 'wind' ? ['#b8902a', '#e6c04a', '#fff0a0', '#a8f0ff'] : PAL.gold);   // vương miện rực vàng – lam khi tụ sét
  ['#ff5a2a', '#3a9aff', '#6ad04a', '#ffffff'].forEach((c, i) => dot(g, cx - 5 + i * 3, cy + 1, c));
  if (orbit) for (let k = 0; k < 3; k++) { const q = f * 0.9 + k * 2.09, ox = cx + Math.cos(q) * 11, oy = cy + 1 + Math.sin(q) * 4; g.ell(ox, oy, 2, 2, OUT); g.ell(ox, oy, 1.4, 1.4, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : PAL.storm[1 + (k % 2)]); } // cầu sét quay quanh vương miện
  part(g, cap(...B(36, 27), Rh[0] + ln, Rh[1] + by, 3.5, 2.5), ROB, { lift: 0.08, tex: (x, y, c, i) => (x + y * 2) % 7 === 0 && i > 0 ? ROB[i - 1] : c });
  if (st === 'wind') for (const [x, y] of [L, Rh]) { let px = x + ln, py = y + by; const tx = cx, ty = cy + 2; for (let s2 = 1; s2 <= 6; s2++) { const k = s2 / 6, nx = px + (tx - px) / (7 - s2) + (hsh(s2, f + x) - 0.5) * 3, ny = py + (ty - py) / (7 - s2); g.line(px, py, nx, ny, s2 % 2 ? '#ffffff' : PAL.storm[2]); px = nx; py = ny; } }
  for (const [x, y] of [L, Rh]) {
    const ox = x + ln, oy = y + by, r = orbR;
    g.ell(ox, oy, r + 1, r + 1, OUT); g.ell(ox, oy, r, r, (dx, dy) => dx * dx + dy * dy < 0.3 ? '#ffffff' : PAL.storm[2 - ((f + Math.round(dx * 2)) & 1)]);
    for (let k = 0; k < 4; k++) { const an = hsh(k, f + x) * 6.28, d0 = r + 1, d1 = r + 3 + hsh(f, k) * 2; g.line(ox + Math.cos(an) * d0, oy + Math.sin(an) * d0, ox + Math.cos(an) * d1, oy + Math.sin(an) * d1, k % 2 ? PAL.storm[3] : PAL.storm[1]); }
  }
  if (bolt) for (const [x, y] of [L, Rh]) { let px = x + ln, py = y + by; for (let s = 0; s < 4; s++) { const nx = Math.min(W - 4, px + 2 + hsh(s, f) * 2), ny = py + (hsh(f, s) - 0.5) * 6; g.line(px, py, nx, ny, '#ffffff'); px = nx; py = ny; } }
  const c = g.canvas(OUT); if (!c.getContext) return c;
  const cx2 = c.getContext('2d'), img = cx2.getImageData(0, 0, c.width, c.height), d = img.data, Y0 = 49 + 4 + 1 + Math.round(by * 0.5), Y1 = c.height, BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let x = 0; x < c.width; x++) { const yc = Y0 + Math.round((hsh(x >> 1, 7) - 0.5) * 9) + ((x >> 2) % 2) * 2;      // mỗi cột bắt đầu tan ở một độ cao khác nhau: không còn đường cắt ngang
    for (let y = Math.max(0, yc); y < Y1; y++) { const t = (y - yc) / Math.max(1, Y1 - yc), i = (y * c.width + x) * 4; if (!d[i + 3]) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2], out = r === 0x14 && gg === 0x10 && b === 0x13, robe = b > gg && r >= gg && !(r > 200 && gg > 200 && b > 200);
      if (!out && !robe) continue;                                                                 // giữ nguyên cầu sét / vàng
      if (out && t > 0.08) { d[i + 3] = 0; continue; }                                              // không còn nét viền cắt ngang mép áo
      if (t * 17 > BAY[((y + f) & 3) * 4 + (x & 3)] + 0.5) { d[i + 3] = 0; continue; }              // tan rã thành các ô thưa dần
      d[i + 3] = Math.round(255 * (1 - t * 0.65)); } }                                               // bán trong suốt dần
  cx2.putImageData(img, 0, 0);
  for (let k = 0; k < 14; k++) { const px = Math.round(14 + hsh(k, 3) * 30 + ln + 3 + 1), py = Math.round(Y0 + 2 + ((hsh(k, 5) * 16 + f * 1.5 + k) % 16)); if (py >= Y1) continue;
    cx2.globalAlpha = 0.25 + hsh(k, 9) * 0.5; cx2.fillStyle = ['#7a5ad0', '#b48ae0', '#4A2574', '#e0d0ff'][k % 4]; cx2.fillRect(px, py, 1, 1); }   // bụi sao rơi khỏi tua áo
  for (let k = 0; k < 3; k++) { let px = 18 + k * 9 + ln + 3 + (f + k) % 3, py = Y0 - 2; cx2.globalAlpha = 0.75; cx2.fillStyle = k % 2 ? '#7ef4ff' : '#b48ae0';   // tia sét tím – lam rỉ ra dưới tua áo
    for (let s2 = 0; s2 < 5; s2++) { px += hsh(s2 + k * 7, f) < 0.5 ? -1 : 1; py += 2; if (py >= Y1) break; cx2.fillRect(px, py, 1, 2); } }
  cx2.globalAlpha = 1; return c;
}

export const BOSS_FORMS = { COLOSSUS: [colossus, 66, 62], WARDEN: [warden, 120, 86], BEHEMOTH: [behemoth, 96, 62], SOVEREIGN: [sovereign, 64, 70], DRAGON: [dragon, 120, 88] };
