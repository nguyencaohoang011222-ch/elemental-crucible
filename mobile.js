// Điều khiển cảm ứng (chế độ "Touch"): joystick trái + cụm nút kiểu MOBA bên phải.
// Chỉ điền object input `it` mà main.js đưa vào game.step — không đụng logic trận đấu.
//   joystick  → it.mx / it.my
//   nút đánh  → chạm: đánh địch gần nhất · giữ: tụ lực (fireHeld) · thả: nhả đòn · kéo ra: nhắm tay
//   nút chiêu → chạm: tung vào địch gần nhất · kéo: hiện vạch nhắm, thả để tung · kéo về giữa nút: huỷ
//   nút lướt  → lướt theo hướng joystick (đứng yên thì theo hướng nhắm)
const JOY_R = 56, DEAD = 0.12, AIM_PX = 70, CANCEL_PX = 16, TAP_MOVE = 14;
const ATK_RANGE = { KNIGHT: 240, RANGER: 560, MAGE: 480, AXIOM: 240 }, SKILL_RANGE = 620, SKILL_REACH = 420;

let O = null, root = null, joyEl = null, knobEl = null, atkEl = null, dashEl = null, skEls = [], potEls = {}, spaceEl = null;
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const atk = { id: null, down: false, seen: false, upPending: false, ox: 0, oy: 0, dx: 0, dy: 0, moved: false };
const sk = { id: null, i: -1, ox: 0, oy: 0, dx: 0, dy: 0, aiming: false, cancel: false };
const sp = { id: null, down: false, seen: false, upPending: false, ox: 0, oy: 0, dx: 0, dy: 0, moved: false };
let castAim = null, castT = 0, lastDir = { x: 1, y: 0 }, barSig = '';

const len = (x, y) => Math.hypot(x, y);
const cap = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (err) { /* con trỏ giả lập / đã nhả */ } };
export const touchOn = () => !!(O && O.SET.control === 'touch');

export function initMobile(opts) {
  O = opts; root = document.getElementById('touchui'); if (!root) return;
  joyEl = root.querySelector('.tjoy'); knobEl = root.querySelector('.tknob'); atkEl = root.querySelector('.tatk'); dashEl = root.querySelector('.tdash');
  skEls = [...root.querySelectorAll('.tsk')]; potEls = { hp: root.querySelector('.tpot.hp'), en: root.querySelector('.tpot.en') };
  const zone = root.querySelector('.tzone');
  // joystick nổi: tâm đặt tại chỗ ngón tay chạm trong nửa trái màn hình
  zone.addEventListener('pointerdown', e => { if (joy.id !== null) return; e.preventDefault(); cap(zone, e); joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; showJoy(true); });
  zone.addEventListener('pointermove', e => { if (e.pointerId !== joy.id) return; let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = len(dx, dy); if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; } joy.x = dx / JOY_R; joy.y = dy / JOY_R; showJoy(true); });
  const joyEnd = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; showJoy(false); };
  zone.addEventListener('pointerup', joyEnd); zone.addEventListener('pointercancel', joyEnd);
  // nút đánh thường
  atkEl.addEventListener('pointerdown', e => { e.preventDefault(); cap(atkEl, e); Object.assign(atk, { id: e.pointerId, down: true, seen: false, upPending: false, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, moved: false }); atkEl.classList.add('on'); });
  atkEl.addEventListener('pointermove', e => { if (e.pointerId !== atk.id) return; atk.dx = e.clientX - atk.ox; atk.dy = e.clientY - atk.oy; if (len(atk.dx, atk.dy) > TAP_MOVE) atk.moved = true; });
  const atkEnd = e => { if (e.pointerId !== atk.id) return; atk.id = null; atk.upPending = true; atkEl.classList.remove('on'); };
  atkEl.addEventListener('pointerup', atkEnd); atkEl.addEventListener('pointercancel', atkEnd);
  // nút chiêu
  skEls.forEach((el, i) => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); if (sk.id !== null || el.classList.contains('empty')) return; cap(el, e); Object.assign(sk, { id: e.pointerId, i, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, aiming: false, cancel: false }); el.classList.add('on'); });
    el.addEventListener('pointermove', e => { if (e.pointerId !== sk.id) return; sk.dx = e.clientX - sk.ox; sk.dy = e.clientY - sk.oy; const d = len(sk.dx, sk.dy); if (d > TAP_MOVE) sk.aiming = true; sk.cancel = sk.aiming && d < CANCEL_PX; el.classList.toggle('cancel', sk.cancel); });
    const end = e => { if (e.pointerId !== sk.id) return; sk.id = null; el.classList.remove('on', 'cancel'); if (e.type === 'pointercancel' || sk.cancel) return; castSkill(i, sk.aiming ? aimFromDrag(sk.dx, sk.dy) : null); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  });
  dashEl.addEventListener('pointerdown', e => { e.preventDefault(); O.dash(); dashEl.classList.add('on'); setTimeout(() => dashEl.classList.remove('on'), 120); });
  spaceEl = root.querySelector('.tspace'); spaceEl.addEventListener('pointerdown', e => { e.preventDefault(); cap(spaceEl, e); Object.assign(sp, { id: e.pointerId, down: true, seen: false, upPending: false, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0, moved: false }); O.space(); spaceEl.classList.add('on'); });
  spaceEl.addEventListener('pointermove', e => { if (e.pointerId !== sp.id) return; sp.dx = e.clientX - sp.ox; sp.dy = e.clientY - sp.oy; if (len(sp.dx, sp.dy) > TAP_MOVE) sp.moved = true; });
  const spEnd = e => { if (e.pointerId !== sp.id) return; sp.id = null; sp.upPending = true; spaceEl.classList.remove('on'); };
  spaceEl.addEventListener('pointerup', spEnd); spaceEl.addEventListener('pointercancel', spEnd);
  for (const k of ['hp', 'en']) potEls[k].addEventListener('pointerdown', e => { e.preventDefault(); O.potion(k); });
  root.addEventListener('contextmenu', e => e.preventDefault());
}
function showJoy(on) {
  joyEl.style.display = on ? 'block' : 'none'; if (!on) return;
  joyEl.style.left = joy.ox + 'px'; joyEl.style.top = joy.oy + 'px';
  knobEl.style.transform = `translate(${joy.x * JOY_R}px, ${joy.y * JOY_R}px)`;
}
export function resetTouch() { joy.id = atk.id = sk.id = null; joy.x = joy.y = 0; atk.down = atk.upPending = false; sp.id = null; sp.down = sp.upPending = false; castAim = null; if (joyEl) showJoy(false); }

function nearest(g, r) { const p = g.p; let best = null, bd = r; for (const e of g.enemies) { if (e.dead || e.hp <= 0) continue; const d = len(e.x - p.x, e.y - p.y) - (e.r || 16); if (d < bd) { bd = d; best = e; } } if (g.boss && !g.boss.dead) { const b = g.boss, d = len(b.x - p.x, b.y - p.y) - (b.r || 40); if (d < bd) best = b; } return best; }
function aimFromDrag(dx, dy) { const d = len(dx, dy) || 1, k = Math.min(1, d / AIM_PX); return { ux: dx / d, uy: dy / d, k }; }
function aimPoint(g, a) { const p = g.p; if (a) return { x: p.x + a.ux * SKILL_REACH * Math.max(0.25, a.k), y: p.y + a.uy * SKILL_REACH * Math.max(0.25, a.k) }; const e = nearest(g, SKILL_RANGE); return e ? { x: e.x, y: e.y } : { x: p.x + lastDir.x * 200, y: p.y + lastDir.y * 200 }; }
function castSkill(i, a) { const g = O.game(); if (!g || !g.p) return; castAim = aimPoint(g, a); castT = 0.25; O.slot(i); }

// gọi mỗi khung hình trước game.step
export function touchInput(it, g, dt) {
  const p = g.p, m = len(joy.x, joy.y);
  if (m > DEAD) { it.mx = joy.x; it.my = joy.y; lastDir = { x: joy.x / m, y: joy.y / m }; } else { it.mx = 0; it.my = 0; }
  // hướng nhắm: kéo tay trên nút đánh > địch gần nhất trong tầm > hướng đang chạy
  let aim;
  if (atk.down && atk.moved && len(atk.dx, atk.dy) > TAP_MOVE) { const d = len(atk.dx, atk.dy); aim = { x: p.x + atk.dx / d * 300, y: p.y + atk.dy / d * 300 }; }
  else { const e = nearest(g, (ATK_RANGE[p.cls] || 300) * 1.4); aim = e ? { x: e.x, y: e.y } : { x: p.x + lastDir.x * 200, y: p.y + lastDir.y * 200 }; }
  it.ax = aim.x; it.ay = aim.y; it.cx = undefined; it.cy = undefined;
  if (castAim) { it.cx = castAim.x; it.cy = castAim.y; castT -= dt; if (castT <= 0) castAim = null; }
  // chạm rất nhanh (lên/xuống giữa hai khung) vẫn phải giữ fireHeld ít nhất một khung để ra đòn
  if (atk.upPending && atk.seen) { atk.down = false; atk.upPending = false; }
  it.fireHeld = atk.down; it.fireReleased = !atk.down && atk.seen; if (atk.down) atk.seen = true; else atk.seen = false;
  it.fire = false;
  // nút Không gian: giữ để ngắm; kéo tới đâu ngắm tới đó, kéo về giữa nút = ngắm chính mình
  if (sp.upPending && sp.seen) { sp.down = false; sp.upPending = false; }
  it.spaceHeld = sp.down; if (sp.down) { sp.seen = true; if (sp.moved) it.swapAt = len(sp.dx, sp.dy) < CANCEL_PX ? { x: p.x, y: p.y } : aimPoint(g, aimFromDrag(sp.dx, sp.dy)); }
}
export function dashDir(g) { const m = len(joy.x, joy.y); if (m > DEAD) return { x: joy.x, y: joy.y }; const e = nearest(g, 400), p = g.p; return e ? { x: e.x - p.x, y: e.y - p.y } : lastDir; }

// vạch nhắm chiêu + vòng điểm rơi, vẽ đè lên canvas sau R.draw
export function drawTouch(c, R, g) {
  if (sk.id === null || !sk.aiming || !g || !g.p) return;
  const p = g.p, a = aimFromDrag(sk.dx, sk.dy), t = aimPoint(g, a), [x0, y0] = R.toScreen(p.x, p.y), [x1, y1] = R.toScreen(t.x, t.y), Z = R.zoom;
  c.save(); c.globalAlpha = sk.cancel ? 0.35 : 0.85; c.strokeStyle = sk.cancel ? '#ff6a5a' : '#ffe27a'; c.lineWidth = 3; c.setLineDash([8, 6]);
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.ellipse(x1, y1, 26 * Z, 13 * Z, 0, 0, 7); c.stroke();
  c.fillStyle = sk.cancel ? '#ff6a5a33' : '#ffe27a22'; c.fill(); c.restore();
}

// vòng hồi chiêu trên ô chiêu (PC và điện thoại): vùng tối quét theo phần còn lại + số giây
export function coolMark(el, left, total) {
  const on = left > 0 && total > 0; el.classList.toggle('cool', on); if (!on) return;
  el.style.setProperty('--cd', Math.min(1, left / total).toFixed(3));
  const t = left >= 1 ? String(Math.ceil(left)) : left.toFixed(1); if (el.dataset.cd !== t) el.dataset.cd = t;
}
// cập nhật icon chiêu, mờ khi thiếu năng lượng, số bình thuốc
export function syncTouch(g, iconSkill) {
  if (!root || !touchOn() || !g || !g.p) return;
  const p = g.p, sig = p.cores.slice(0, 4).map(c => c ? JSON.stringify(c) : '-').join('|');
  if (sig !== barSig) { barSig = sig; skEls.forEach((el, i) => { const c = p.cores[i]; el.classList.toggle('empty', !c); el.innerHTML = c ? '<img src="' + iconSkill(g.coreSkill(c)) + '" alt="">' : ''; }); }
  skEls.forEach((el, i) => { const c = p.cores[i]; if (c) { const sk = g.coreSkill(c); el.classList.toggle('poor', p.energy < sk.cost); coolMark(el, p.cds[sk.key] || 0, sk.cd); } else coolMark(el, 0, 0); });
  for (const k of ['hp', 'en']) { const n = (p.potions || {})[k] || 0, el = potEls[k]; el.classList.toggle('empty', !n); const s = el.querySelector('span'); if (s && s.textContent !== String(n)) s.textContent = n; }
  dashEl.classList.toggle('cd', (p.dashCd || 0) > 0);
  spaceEl.classList.toggle('hidden', p.cls !== 'AXIOM');
}
export function markTouchDirty() { barSig = ''; }
