// Cảnh động nhỏ cho How to Play: một Game lab + Renderer riêng vẽ lên canvas của thẻ hướng dẫn.
// Mỗi lúc chỉ chạy MỘT cảnh (startDemo dừng cảnh cũ); cảnh tự dừng khi canvas rời trang hoặc stopDemo().
// sc.kind: 'skill' (tung một chiêu lặp lại; core = lõi), 'dodge' (lướt né vùng đỏ), 'move' (chạy vòng + lướt), 'charge' (tụ lực đánh thường)
import { Game } from './game.js';
import { Renderer } from './render.js';

let D = null;
export function stopDemo() { if (D) { D.stop = true; D = null; } }
export function startDemo(canvas, sc, onTick) {
  stopDemo();
  const d = { canvas, sc, onTick, t: 0, next: 0.35, stop: false };
  try { d.R = new Renderer(canvas); } catch (e) { console.warn('demo', e); return null; }
  D = d; setup(d); fit(d); requestAnimationFrame(() => loop(d)); return d;
}
function fit(d) {
  const r = d.canvas.getBoundingClientRect(), dp = devicePixelRatio || 1;
  if (r.width > 20 && r.height > 20) { d.R.fixedP = Math.max(2, Math.round(1.6 * dp)); d.R.camLeadK = 0.2; d.R.resize(Math.round(r.width * dp), Math.round(r.height * dp)); }
}
function setup(d) {
  const sc = d.sc, g = new Game(11, sc.cls || 'MAGE', { training: true, lab: true, theme: sc.theme || 'forest' });
  g.labGod = true; g.labEnergy = true; g.enemies = []; g.spawnQ = []; g.sigils = [];
  d.g = g; d.x0 = g.p.x; d.y0 = g.p.y;
  if (sc.kind === 'skill') { for (let i = 0; i < 5; i++) { const e = g.spawnAt('GRUNT', g.p.x + 150 + (i % 2) * 45, g.p.y - 70 + i * 35); e.spawn = 0; e.hp = e.max = 1e5; } g.labFreezeAI = !sc.live; }
  if (sc.kind === 'charge') for (let i = 0; i < 3; i++) { const e = g.spawnAt('DUMMY', g.p.x + 120, g.p.y - 50 + i * 50); e.spawn = 0; }
  if (d.R.reset) d.R.reset();
}
function loop(d) {
  if (d.stop || !d.canvas.isConnected || !d.canvas.offsetParent) { if (D === d) D = null; return; }
  const g = d.g, p = g.p, dt = 1 / 60, sc = d.sc, inp = { ax: p.x + 170, ay: p.y };
  d.t += dt;
  if (sc.kind === 'skill' && d.t > d.next) {
    p.x = d.x0; p.y = d.y0; p.aim = 0; p.giant = 0; p.ultSpin = 0; p.ultLift = 0; p.z = 0; p.cds = sc.showCd ? p.cds : {}; p.energy = p.energyMax = 999; p.gcd = 0;
    for (const e of g.enemies) e.hp = e.max;
    if (!sc.showCd || !(p.cds[g.coreSkill(sc.core).key] > 0)) { g.zones = []; g.ults = []; g.pending = []; g.castNow(g.coreSkill(sc.core), p.x + 170, p.y); }
    d.next = d.t + (sc.every || (sc.core.type === 'tri' ? 5.5 : 2.6));
  }
  if (sc.kind === 'dodge') {   // vùng đỏ báo đòn hiện dưới chân → lướt ra ngoài trước khi nó nổ
    const c = d.t % 2.6;
    if (c < dt) { p.x = d.x0; p.y = d.y0; g.hazards.push({ kind: 'circle', x: p.x, y: p.y, r: 95, t: 1.0, T: 1.0, hold: 0, dmg: 0, color: '#ff5a2a', owner: null }); }
    if (c > 0.55 && c < 0.55 + dt * 1.5) { inp.dash = true; inp.mx = 0; inp.my = 1; }
  }
  if (sc.kind === 'move') { const a = d.t * 1.6; inp.mx = Math.cos(a); inp.my = Math.sin(a) * 0.6; if (d.t > d.next) { inp.dash = true; d.next = d.t + 1.1; } }
  if (sc.kind === 'charge') { inp.fireHeld = d.t % 2 < 1.3; inp.ax = p.x + 120; }
  try { g.step(dt, inp); d.R.draw(g, { dt, sfx: null, aimDist: 0 }); } catch (e) { console.warn('demo', e); d.stop = true; return; }
  g.events.length = 0;
  if (d.onTick) try { d.onTick(g); } catch (e) { /* bỏ qua */ }
  requestAnimationFrame(() => loop(d));
}
