// Giao diện mã đổi quà, early access Brutal, bảng phần thưởng theo độ khó, tab mùa Brutal trên bảng xếp hạng, thông báo thưởng mùa.
// Dữ liệu từ online.js (supabase/redeem.sql). Offline hoặc chưa đăng nhập: Brutal khoá, các tab mùa báo cần online.
import * as ON from './online.js';
import * as PR from './profile.js';
import { renderPixelIcon as PXI } from './gfx/pixelIcons.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// email nhà phát triển: chỉ hiện cho chính người vô địch mùa (không in ra cho ai khác)
const DEV_MAIL = 'nguyencaohoang011222@gmail.com';
let A = null, brutal = false, season = null, lbTab = 'all';

export const brutalOk = () => brutal;
// điểm mùa của một lượt Brutal (cùng công thức với season_board trong redeem.sql)
export const seasonPoints = (stage, won, time) => stage * 10 + (won ? 150 + Math.max(0, 120 - Math.floor(time / 30)) : 0);

export function initSeasonUI(api) {
  A = api;
  $('redeembtn').onclick = openRedeem;
  $('redeemok').onclick = doRedeem;
  $('redeemin').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') doRedeem(); };
  $('redeemin').oninput = () => { const v = $('redeemin').value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); if (v !== $('redeemin').value) $('redeemin').value = v; $('redeemmsg').textContent = ''; };
  $('rwlink').onclick = () => openRewards();
  for (const b of $('lbtabs').children) b.onclick = () => { lbTab = b.dataset.t; renderBoard(); };
  ON.onOnline(s => { if (s.ready) refreshAccess(); });
}

// ---------- quyền Brutal + thưởng mùa trước ----------
async function refreshAccess() {
  const s = ON.state(); if (!s.user) { brutal = false; A.onAccess(); return; }
  brutal = (await ON.fetchEntitlements()).brutal; A.onAccess();
  season = await ON.seasonNow();
  if (season && season.n > 1) { const prev = season.n - 1; if (!(PR.P.seasons && PR.P.seasons[prev])) { const b = await ON.seasonBoard(prev, 10), me = b.rows.find(r => r.user_id === s.user.id); if (me) { const got = PR.claimSeason(prev, Number(me.rank)); if (got) showSeasonWin(got); } } }
}

// ---------- mã đổi quà ----------
function openRedeem() {
  const s = ON.state(); $('redeemin').value = ''; $('redeemmsg').className = 'nickerr';
  $('redeemmsg').textContent = !s.configured ? 'Redeem needs the online server.' : !s.user ? 'Sign in with Google first, then enter your code.' : '';
  A.openModal('redeem'); setTimeout(() => $('redeemin').focus(), 50);
}
async function doRedeem() {
  const b = $('redeemok'), m = $('redeemmsg'); b.disabled = true; m.className = 'nickerr'; m.textContent = 'Checking…';
  const r = await ON.redeemCode($('redeemin').value); b.disabled = false;
  if (r.error) { m.textContent = r.error; return; }
  if (r.gems > 0) { PR.addGems(r.gems); A.refreshGems(); }
  if (r.kind === 'brutal') { brutal = true; A.onAccess(); }
  m.className = 'nickerr ok'; m.innerHTML = (r.gems > 0 ? PXI('gem', 14) + ' +' + r.gems + ' gems' : '') + (r.kind === 'brutal' ? (r.gems > 0 ? ' · ' : '') + 'Brutal unlocked!' : '');
  A.showHint(r.kind === 'brutal' ? 'Brutal early access unlocked.' : 'Code redeemed: +' + r.gems + ' gems.', 3);
}

// ---------- bảng phần thưởng ----------
export function openRewards(focus) {
  const T = PR.TRAILS, tr = id => T.find(t => t.id === id), E = PR.ECON;
  const row = (icon, title, sub) => '<li><span class="rwi">' + icon + '</span><span><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></li>';
  const sw = (c, w = 16) => '<i class="rwsw" style="background:linear-gradient(90deg,' + c[0] + ',' + c[1] + ');width:' + w + 'px"></i>';
  const normal = '<ol class="rwlist">' + row(PXI('gem', 16), '+1 gem every ' + E.perStages + ' stages', 'Reach farther, earn more') + row(PXI('trophy', 16), '+' + E.winBonus + ' gems on victory', '') + row(PXI('star', 16), '+' + E.firstWin + ' gems + Crown Lightning', 'First victory ever') + row(PXI('swords', 16), 'Titanslayer skin', 'First win with each hero') + '</ol>';
  const B = tr('brutal');
  const brut = '<ol class="rwlist">' + row(PXI('gem', 16), '+' + E.hardWin + ' gems on victory', 'On top of the Normal rewards') + row(sw(B.c), B.name + ' (exclusive)', 'First Brutal victory: trail + aura, never sold') + row(PXI('bolt', 16), 'Season points', 'Stage × 10, victory +150, speed bonus · best 10 runs count') + '</ol>';
  const seasonList = '<ol class="rwlist season">' + PR.SEASON_REWARDS.map(r => { const t = r.trail ? tr(r.trail) : null; return row('<b class="rwrank">' + (r.rank === 10 ? '4–10' : '#' + r.rank) + '</b>', (t ? t.name + ' trail + aura · ' : '') + r.gems + ' gems', r.extra || ''); }).join('') + '</ol>';
  const lock = brutal ? '' : '<p class="rwlock">' + PXI('lock', 14) + ' Brutal is in early access. Got an invite code? Enter it in <b>Redeem code</b> on the title screen.</p>';
  $('rwbody').innerHTML = '<div class="rwcols"><section class="rwcol' + (focus === 'NORMAL' ? ' on' : '') + '"><h3>Normal</h3>' + normal + '</section><section class="rwcol brutal' + (focus === 'HARD' ? ' on' : '') + '"><h3>Brutal</h3>' + brut + '</section></div>' +
    '<section class="rwseason"><h3>Brutal season · every 2 weeks</h3>' + seasonList + '</section>' + lock;
  A.openModal('rewards');
}

// ---------- bảng xếp hạng: tất cả / mùa Brutal / Hall of Fame ----------
export function openBoard() { lbTab = 'all'; A.openModal('leader'); renderBoard(); }
const left = d => { const s = Math.max(0, (d - Date.now()) / 1000), dd = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), mm = Math.floor(s % 3600 / 60); return dd ? dd + 'd ' + hh + 'h' : hh ? hh + 'h ' + mm + 'm' : mm + 'm'; };
async function renderBoard() {
  for (const b of $('lbtabs').children) b.classList.toggle('on', b.dataset.t === lbTab);
  const B = $('lbody'), sub = $('lbsub'), me = ON.state().user ? ON.state().user.id : null; B.innerHTML = '<p class="sub">Loading…</p>';
  if (lbTab === 'all') { sub.textContent = "Each player's best run: highest stage first, then the fastest time."; return A.renderAllTime(B); }
  season = season || await ON.seasonNow();
  if (!season) { sub.textContent = ''; B.innerHTML = '<p class="sub">The Brutal season is not set up on the server yet.</p>'; return; }
  if (lbTab === 'season') {
    sub.textContent = 'Season ' + season.n + ' · ends in ' + left(season.ends) + ' · sum of your best 10 Brutal runs';
    const r = await ON.seasonBoard(season.n, 50); if (r.error) { B.innerHTML = '<p class="sub">Could not load the season. Check your connection.</p>'; return; }
    if (!r.rows.length) { B.innerHTML = '<p class="sub">No Brutal runs this season yet. Be the first!</p>'; return; }
    const row = x => '<tr class="' + (x.rank <= 3 ? 'r' + x.rank : '') + (x.user_id === me ? ' me' : '') + '"><td>#' + x.rank + '</td><td>' + esc(x.nickname) + '</td><td>' + x.points + '</td><td>' + x.best_stage + '</td><td>' + x.wins + '</td></tr>';
    B.innerHTML = '<table class="lb"><thead><tr><th>Rank</th><th>Player</th><th>Points</th><th>Best</th><th>Wins</th></tr></thead><tbody>' + r.rows.map(row).join('') + '</tbody></table>';
    return;
  }
  // Hall of Fame: nhà vô địch các mùa đã xong
  sub.textContent = 'Champions of past Brutal seasons.';
  if (season.n <= 1) { B.innerHTML = '<p class="sub">Season 1 is still running. The first champion is crowned in ' + left(season.ends) + '.</p>'; return; }
  const rows = []; for (let n = season.n - 1; n >= Math.max(1, season.n - 12); n--) { const r = await ON.seasonBoard(n, 3); rows.push([n, r.rows]); }
  B.innerHTML = '<table class="lb"><thead><tr><th>Season</th><th>' + PXI('trophy', 14) + ' Champion</th><th>#2</th><th>#3</th></tr></thead><tbody>' + rows.map(([n, rs]) => '<tr><td>S' + n + '</td>' + [0, 1, 2].map(i => '<td' + (i === 0 ? ' class="won"' : '') + '>' + (rs[i] ? esc(rs[i].nickname) : '–') + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
}

// ---------- thông báo thưởng mùa ----------
function showSeasonWin(g) {
  const t = g.trail; let html = '<p class="swrank">#' + g.rank + ' · Season ' + g.n + '</p><p class="sub">' + esc(g.title) + '</p><ul class="rwlist"><li><span class="rwi">' + PXI('gem', 16) + '</span><span><b>+' + g.gems + ' gems</b></span></li>' + (t ? '<li><span class="rwi"><i class="rwsw" style="background:linear-gradient(90deg,' + t.c[0] + ',' + t.c[1] + ')"></i></span><span><b>' + esc(t.name) + '</b><small>Exclusive trail + aura, equip it in the Shop</small></span></li>' : '') + (g.rank <= 10 ? '<li><span class="rwi">' + PXI('star', 16) + '</span><span><b>Season ' + g.n + ' badge</b></span></li>' : '') + '</ul>';
  if (g.rank === 1) html += '<div class="swmail"><b>You are the Hall of Fame champion.</b><p>You are invited to design your own skin effect with the developer. Email <a href="mailto:' + DEV_MAIL + '?subject=' + encodeURIComponent('Elemental Arena Season ' + g.n + ' champion') + '">' + DEV_MAIL + '</a> with your nickname and your idea.</p></div>';
  $('swbody').innerHTML = html; A.refreshGems(); A.openModal('seasonwin');
}
