// Co-op 2 người: màn kết nối (Host / Join bằng mã 4 ký tự), phòng chờ chọn tướng, và vòng lockstep.
// Lockstep: hai máy chạy cùng một mô phỏng tất định; mỗi khung chỉ gửi input (kèm các lệnh như ghép lõi, chọn thẻ, mua đồ).
// Input của khung f được gửi trước D khung, nên bên kia luôn có sẵn; thiếu thì chờ.
import { Link, makeCode, cleanCode } from './net.js';
import { onlineReady } from './online.js';
import { CLASSES } from './sim.js';
import { EL, EL_INFO } from './kits.js';
import { iconElement } from './gfx/icons.js';
import { renderPixelIcon as PXI } from './gfx/pixelIcons.js';

export const CO = { on: false, me: 0, frame: 0, D: 4, inp: [new Map(), new Map()], pend: [], cbs: new Map(), cid: 0, acc: 0, wait: 0, names: ['Player 1', 'Player 2'], hashes: new Map(), rwBusy: false };
let A = null, link = null, mine = { cls: 'KNIGHT', element: 'FIRE' }, theirs = null;
const $ = id => document.getElementById(id);
const HEROES = ['KNIGHT', 'RANGER', 'MAGE'];

export function initCoop(api) {
  A = api;
  $('cp-host').onclick = host;
  $('cp-join').onclick = () => { show('enter'); $('cp-in').value = ''; $('cp-js').textContent = ''; syncGo(); setTimeout(() => $('cp-in').focus(), 50); };
  $('cp-in').oninput = () => { const v = cleanCode($('cp-in').value); if ($('cp-in').value !== v) $('cp-in').value = v; $('cp-js').textContent = ''; syncGo(); };
  $('cp-in').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') join(); };
  $('cp-go').onclick = join;
  $('cp-back').onclick = () => { leave(); A.closeModal('coop'); };
  $('cp-start').onclick = start;
}
const syncGo = () => { $('cp-go').disabled = cleanCode($('cp-in').value).length !== 4; };
function show(step) { for (const s of ['pick', 'wait', 'enter', 'lobby']) $('cp-' + s).classList.toggle('hidden', s !== step); $('cp-back').textContent = step === 'pick' ? 'Close' : 'Cancel'; }

export function openCoop() {
  leave(); show('pick'); $('cp-err').textContent = onlineReady() ? '' : 'Co-op needs the online server. Check your internet and reload.';
  for (const b of ['cp-host', 'cp-join']) $(b).disabled = !onlineReady();
  mine = { cls: A.defaultCls(), element: 'FIRE' }; theirs = null; A.openModal('coop');
}
function newLink() {
  link = new Link();
  link.on('open', () => { show('lobby'); sendPick(); renderLobby(); })
    .on('msg', onMsg)
    .on('error', msg => { const where = link && link.role === 'guest' ? 'cp-js' : 'cp-hs'; $(where).textContent = msg; if (link && link.role === 'guest') { $('cp-go').disabled = false; } })
    .on('close', msg => { if (CO.on) { CO.on = false; A.partnerLeft(msg); } else { show('pick'); $('cp-err').textContent = msg; } link = null; });
  return link;
}
async function host() {
  const code = makeCode(); newLink(); show('wait'); $('cp-code').textContent = code; $('cp-hs').textContent = 'Waiting for your friend…';
  try { await link.host(code); } catch (e) { $('cp-hs').textContent = e.message; }
}
async function join() {
  const code = cleanCode($('cp-in').value); if (code.length !== 4) return;
  $('cp-go').disabled = true; $('cp-js').textContent = 'Connecting…'; newLink();
  try { await link.join(code); } catch (e) { $('cp-js').textContent = e.message; $('cp-go').disabled = false; }
}
function sendPick() { if (link) link.send({ t: 'pick', ...mine, name: A.myName(), skin: A.skinOf(mine.cls), skinFx: A.skinFx(mine.cls) }); }
function onMsg(m) {
  if (m.t === 'pick') { theirs = m; renderLobby(); }
  else if (m.t === 'start') begin(m);
  else if (m.t === 'in') CO.inp[1 - CO.me].set(m.f, JSON.parse(m.it));
  else if (m.t === 'h') { const mineH = CO.hashes.get(m.f); if (mineH !== undefined && mineH !== m.h) { CO.on = false; A.partnerLeft('The two games went out of sync.'); leave(); } }
  else if (m.t === 'bye') { if (CO.on) { CO.on = false; A.partnerLeft('Your partner left.'); } leave(); }
}

// ---------- phòng chờ: mỗi người chọn tướng + nguyên tố đầu; chủ phòng bấm Start ----------
function slot(title, pick, editable) {
  const hero = HEROES.map(k => '<button class="cphero' + (pick && pick.cls === k ? ' on' : '') + '" data-h="' + k + '"' + (editable ? '' : ' disabled') + '>' + CLASSES[k].name + '</button>').join('');
  const els = EL.map(e => '<button class="cpel' + (pick && pick.element === e ? ' on' : '') + '" data-e="' + e + '" title="' + EL_INFO[e].name + '"' + (editable ? '' : ' disabled') + '><img src="' + iconElement(e) + '" alt=""></button>').join('');
  return '<h4>' + title + '</h4>' + (pick ? '<div class="cprow">' + hero + '</div><div class="cprow">' + els + '</div>' : '<p class="cpstatus">Choosing…</p>');
}
function renderLobby() {
  const isHost = link && link.role === 'host';
  $('cp-me').innerHTML = slot('You', mine, true);
  $('cp-them').innerHTML = slot(theirs ? escName(theirs.name) : 'Friend', theirs, false);
  for (const b of $('cp-me').querySelectorAll('[data-h]')) b.onclick = () => { mine.cls = b.dataset.h; sendPick(); renderLobby(); };
  for (const b of $('cp-me').querySelectorAll('[data-e]')) b.onclick = () => { mine.element = b.dataset.e; sendPick(); renderLobby(); };
  $('cp-start').classList.toggle('hidden', !isHost); $('cp-start').disabled = !theirs;
  $('cp-ls').textContent = isHost ? (theirs ? 'Both ready. Press Start.' : 'Waiting for your friend to pick…') : 'Waiting for the host to start…';
}
const escName = s => String(s || 'Friend').replace(/[<>&"]/g, '').slice(0, 16);
function start() {
  if (!theirs || !link) return;
  const seed = (Date.now() % 1e6) | 0, me = { ...mine, name: A.myName(), skin: A.skinOf(mine.cls), skinFx: A.skinFx(mine.cls) };
  const m = { t: 'start', seed, cfgs: [me, theirs] };
  link.send(m); begin(m);
}
function begin(m) {
  CO.me = link.role === 'host' ? 0 : 1; CO.frame = 0; CO.acc = 0; CO.wait = 0; CO.pend = []; CO.cbs.clear(); CO.hashes.clear(); CO.rwBusy = false;
  CO.inp = [new Map(), new Map()]; for (let f = 0; f < CO.D; f++) for (const M of CO.inp) M.set(f, {});
  const cfgs = m.cfgs.map(c => ({ cls: HEROES.includes(c.cls) ? c.cls : 'KNIGHT', element: EL.includes(c.element) ? c.element : 'FIRE', skin: c.skin || '', skinFx: c.skinFx || null }));
  CO.names = m.cfgs.map((c, i) => escName(c.name) || 'Player ' + (i + 1));
  CO.on = true; A.closeModal('coop'); A.start(m.seed, cfgs, CO.me);
}

// ---------- lockstep ----------
// gửi một lệnh (ghép lõi, chọn thẻ, mua đồ…): cả hai máy cùng áp dụng ở cùng một khung; cb chạy trên máy mình khi lệnh có hiệu lực
export function queueCmd(n, a, cb) { const id = ++CO.cid; CO.pend.push({ n, a: a || [], id }); if (cb) CO.cbs.set(id, cb); }
function applyCmds(g, it, idx) {
  for (const c of it.cmds || []) {
    const fn = A.ACT[c.n]; let r = null;
    if (fn) r = g.as(g.players[idx], () => fn(g, ...(c.a || [])));
    if (idx === CO.me && CO.cbs.has(c.id)) { const cb = CO.cbs.get(c.id); CO.cbs.delete(c.id); try { cb(r); } catch (e) { console.warn(e); } }
  }
}
export function hashOf(g) { let h = 0; const add = v => { h = (h * 31 + Math.round((v || 0) * 100)) | 0; }; for (const q of g.players) { add(q.x); add(q.y); add(q.hp); add(q.energy); add(q.gold); } add(g.enemies.length); for (const e of g.enemies) { add(e.x); add(e.y); add(e.hp); } add(g.stage); add(g.t); return h; }
export function coopTick(dt, makeInput) {
  const g = A.game(); if (!CO.on || !link) return;
  CO.acc = Math.min(CO.acc + dt, 0.25); let n = 0;
  while (CO.acc >= 1 / 60 && n < 4) {
    const f = CO.frame + CO.D;
    if (!CO.inp[CO.me].has(f)) { const it = makeInput(n === 0); it.cmds = CO.pend.splice(0); const s = JSON.stringify(it); CO.inp[CO.me].set(f, JSON.parse(s)); link.send({ t: 'in', f, it: s }); }
    const a = CO.inp[0].get(CO.frame), b = CO.inp[1].get(CO.frame);
    if (!a || !b) { CO.wait += dt; break; }
    CO.wait = 0;
    applyCmds(g, a, 0); applyCmds(g, b, 1);
    g.stepCoop(1 / 60, [a, b]);
    CO.inp[0].delete(CO.frame); CO.inp[1].delete(CO.frame);
    if (CO.frame % 120 === 0) { const h = hashOf(g); CO.hashes.set(CO.frame, h); if (CO.hashes.size > 30) CO.hashes.delete(CO.hashes.keys().next().value); link.send({ t: 'h', f: CO.frame, h }); }
    CO.frame++; CO.acc -= 1 / 60; n++;
  }
}
export function leave() { if (link) { try { link.send({ t: 'bye' }); } catch (e) { /* đã đóng */ } link.close(); } link = null; CO.on = false; }
