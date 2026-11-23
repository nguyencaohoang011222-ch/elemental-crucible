// Test Lab (chế độ admin): chọn map/class/stage, gọi quái/boss, cho lõi/nâng cấp, bật bất tử, vẽ mặt đất, đặt vật.
import { ENEMIES, CLASSES } from './sim.js';
import { EL, EL_INFO } from './kits.js';
import { ROSTER, THEME_ORDER } from './env.js';
import { BOSS_DEFS } from './boss.js';
import { BOSS_STAGES } from './game.js';
import { MINOR, MINOR_BY_ID } from './upgrades.js';
import { STAT_DROPS } from './game.js';
import { THEMES } from './gfx/themes.js';
import { applyEl } from './gameenv.js';
import { teardownArena } from './arena.js';
import { placeForge, removeForge } from './gameenv.js';
import { FORGE_R, smithOf } from './forge.js';

const OBS_HP = { tree: 70, rock: 160, pillar: 220, crate: 35, lamp: 50, crystal: 120 };
const PAINT = { fire: 'BURN', ice: 'ICE', water: 'WATER', lava: 'LAVA', poison: 'POISON', obsidian: null, thorn: 'THORN' };
let api = null, panel = null, mode = '', paint = 'fire', place = 'tree', labId = 0;

const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn); else if (k === 'style') e.style.cssText = v; else e[k] = v; } for (const c of kids) e.append(c); return e; };
const btn = (label, fn, cls = '') => h('button', { className: 'lb ' + cls, textContent: label, on: { click: e => { e.stopPropagation(); fn(); refresh(); } } });
const sel = (opts, val, fn) => { const s = h('select', { on: { change: e => fn(e.target.value) } }); for (const [v, t] of opts) s.append(h('option', { value: v, textContent: t, selected: v === val })); return s; };
const sec = (title, ...kids) => h('div', { className: 'ls' }, h('b', { textContent: title }), ...kids);
const G = () => api.game();

function spawnNear(type) { const g = G(), p = g.p, a = Math.random() * 6.28; g.spawnAt(type, p.x + Math.cos(a) * 220, p.y + Math.sin(a) * 220); }
function spawnBoss(i) {
  const g = G(), n = Object.keys(BOSS_STAGES).find(k => BOSS_STAGES[k] === i);
  g.enemies = g.enemies.filter(e => !e.boss); g.hazards = []; g.boss = null;
  const keepTheme = g.labTheme; g.startStage(+n); g.labTheme = keepTheme; if (keepTheme) { g.theme = keepTheme; g.surface.theme = keepTheme; }
}
function nextPhase() { const b = G().boss; if (!b || b.dead) return; const ph = b.def.phases[b.phase + 1]; if (ph) b.hp = b.max * ph.at - 1; }
function addCore(kind, a, b, c) {
  const g = G(), core = kind === 'el' ? { type: 'el', el: a } : kind === 'duo' ? { type: 'duo', els: [a, b] } : kind === 'tri' ? { type: 'tri', els: [a, b, c] } : { type: 'inf', els: [a, b], add: c };
  if (kind === 'tri' && new Set([a, b, c]).size < 3) return api.hint('Ultimates need 3 different elements.');
  if (g.addCore(core) < 0) api.hint('Bag is full — open it (Tab) and merge or drop cores.'); else api.hint('Core added: ' + g.coreSkill(core).name);
}
export function labClick(w, right) {
  const g = G(); if (!g || !g.lab || !mode) return false;
  if (mode === 'paint') { if (paint === 'obsidian') g.surface.apply(w.x, w.y, 50, 'LAVA', { life: 30 }) && g.surface.apply(w.x, w.y, 50, 'WATER'); else applyEl(g, w.x, w.y, 50, PAINT[paint], { life: 30, puddle: true, chance: 1 }); if (paint === 'fire') applyEl(g, w.x, w.y, 50, 'FIRE', { chance: 1 }); return true; }
  if (mode === 'place') {
    if (place === 'trap') { g.hazards.push({ kind: 'circle', x: w.x, y: w.y, r: 62, t: 1.3, T: 1.3, hold: 0, dmg: 26, color: '#ff4a32', owner: null }); return true; }
    const type = place === 'mushroom' ? 'tree' : place === 'chest' ? 'crate' : place, r = { tree: 24, rock: 20, pillar: 18, crate: 13, lamp: 8, crystal: 15 }[type];
    const S = 576, c = g.world.chunk(Math.floor(w.x / S), Math.floor(w.y / S));
    c.obs.push({ type, x: w.x, y: w.y, r, v: place === 'chest' ? 0.95 : Math.random() * 0.8, key: 'lab' + (labId++), hp: OBS_HP[type], max: OBS_HP[type], hit: 0 });
    if (place === 'mushroom' && g.theme !== 'dungeon') api.hint('Mushrooms only burst into spores in the Fungal map — switch map to see it.');
    return true;
  }
  return false;
}
export const labMode = () => mode;

function build() {
  const g = G(), cfg = api.cfg();
  panel.innerHTML = '';
  const cores = { kind: 'duo', a: 'FIRE', b: 'WATER', c: 'EARTH' }, elOpts = EL.map(e => [e, EL_INFO[e].name]);
  const roster = ROSTER[g.theme] || ROSTER.forest;
  panel.append(
    h('div', { className: 'lt' }, h('b', { textContent: 'TEST LAB' }), h('small', { textContent: ' F2 hide · Tab bag' })),
    sec('World',
      sel(THEME_ORDER.map(t => [t, THEMES[t].name]), cfg.theme, v => api.restart({ ...cfg, theme: v })),
      sel(Object.keys(CLASSES).map(k => [k, CLASSES[k].name]), cfg.cls, v => api.restart({ ...cfg, cls: v })),
      h('label', {}, 'Stage ', h('input', { type: 'number', min: 1, max: 25, value: g.stage || 1, style: 'width:48px', on: { change: e => { g.stage = Math.max(1, Math.min(25, +e.target.value)); g.dmgScale = 1 + 0.045 * (g.stage - 1); } } }))),
    sec('Spawn enemies', ...roster.map(t => btn(ENEMIES[t].name, () => spawnNear(t))), btn('Pack ×6', () => { for (let i = 0; i < 6; i++) spawnNear(roster[i % 3]); }),
      sel([['', 'any map…'], ...Object.values(ROSTER).flat().map(t => [t, ENEMIES[t].name])], '', v => v && spawnNear(v)),
      h('label', {}, h('input', { type: 'checkbox', checked: !!g.labPacks, on: { change: e => { g.labPacks = e.target.checked; } } }), ' auto waves')),
    sec('Elites', ...['EMBERHULK', 'GLACIER', 'SPOREMOTHER', 'BLADEDANCER', 'INFERNO'].map(t => btn(ENEMIES[t].name, () => spawnNear(t)))),
    sec('Bosses', ...BOSS_DEFS.map((d, i) => btn(d.name, () => spawnBoss(i))), btn('Next phase ▸', nextPhase), btn('Clear arena', () => { teardownArena(G(), false); G().enemies = G().enemies.filter(e => !e.boss); G().boss = null; G().hazards = []; })),
    sec('Cores / skills',
      sel([['el', 'Single'], ['duo', 'Two-element'], ['tri', 'Ultimate (3)'], ['inf', 'Infused (2+1)']], cores.kind, v => cores.kind = v),
      sel(elOpts, cores.a, v => cores.a = v), sel(elOpts, cores.b, v => cores.b = v), sel(elOpts, cores.c, v => cores.c = v),
      btn('Give core', () => addCore(cores.kind, cores.a, cores.b, cores.c)), btn('Open bag', () => api.openBag())),
    sec('Upgrades', (() => { const s = sel(MINOR.map(u => [u.id, u.name]), MINOR[0].id, () => {}); return h('span', {}, s, btn('Grant', () => { const u = MINOR_BY_ID[s.value]; G().upgrades[u.id] = (G().upgrades[u.id] || 0) + 1; u.apply(G().p.mods, G()); G().upgradeLog.push(u.name); G().refreshStats(false); api.hint(u.name + ' granted'); })); })(),
      btn('+1 Fusion Shard', () => { G().p.shards = (G().p.shards || 0) + 1; }), h('label', {}, h('input', { type: 'checkbox', checked: !!g.labShards, on: { change: e => { G().labShards = e.target.checked; } } }), ' Infinite shards'),
      btn('+100 gems', () => { api.gems(100); }), btn('Reset profile', () => { api.resetProfile(); }),
      btn('Drop energy', () => G().dropAt('energy', G().p.x + 60, G().p.y)), btn('Drop heal', () => G().dropAt('heal', G().p.x + 60, G().p.y)), btn('Drop stat', () => G().dropAt('stat', G().p.x + 60, G().p.y))),
    sec('Forge (smith)',
      btn('Spawn smith here', () => { const g = G(); removeForge(g); placeForge(g, FORGE_R, true); api.hint(smithOf(g.theme).name + ' set up shop nearby — walk onto the porch and press T.'); }),
      btn('Remove smith', () => { removeForge(G()); }),
      btn('+500 gold', () => { G().p.gold = (G().p.gold || 0) + 500; }),
      btn('+1 HP / energy potion', () => { const p = G().p; p.potions.hp = Math.min(3, p.potions.hp + 1); p.potions.en = Math.min(3, p.potions.en + 1); }),
      h('label', {}, h('input', { type: 'checkbox', checked: !!g.labGold, on: { change: e => { G().labGold = e.target.checked; } } }), ' Enemies drop gold')),
    sec('Cheats',
      ...[['labGod', 'Invincible'], ['labEnergy', 'Infinite energy'], ['labFreezeAI', 'Freeze AI'], ['labSlow', 'Slow time ×0.25']].map(([k, t]) => h('label', {}, h('input', { type: 'checkbox', checked: !!g[k], on: { change: e => { G()[k] = e.target.checked; } } }), ' ' + t)),
      h('label', {}, h('input', { type: 'checkbox', checked: !!api.R.opts.hitbox, on: { change: e => { api.R.opts.hitbox = e.target.checked; } } }), ' Show hitboxes'),
      btn('Kill all', () => { for (const e of G().enemies) if (e.type !== 'DUMMY') { e.hp = 0; G().hurtEnemy(e, 1, 0, 0, 'trap'); } }), btn('Full heal', () => { const p = G().p; p.hp = p.max; p.energy = p.energyMax; p.frozen = 0; p.chill = 0; })),
    sec('Click tool (left-click on the map)',
      sel([['', 'Off (attack normally)'], ['paint', 'Paint ground'], ['place', 'Place object']], mode, v => { mode = v; }),
      sel(Object.keys(PAINT).map(k => [k, k]), paint, v => paint = v),
      sel(['tree', 'mushroom', 'rock', 'pillar', 'crate', 'chest', 'lamp', 'crystal', 'trap'].map(k => [k, k]), place, v => place = v),
      btn('Clear ground', () => { G().surface.cells.clear(); })),
    h('small', { className: 'lh', textContent: 'Tips: paint ice then hit it with a Fire skill → water. Paint lava, cast Water → obsidian. Fire on poison → explosion. Burn trees in the Forest map.' })
  );
}
function refresh() { /* trạng thái được đọc trực tiếp từ game mỗi lần mở lại bảng */ }
export function initLab(a) {
  api = a;
  panel = h('div', { id: 'labpanel', className: 'hidden', on: { mousedown: e => e.stopPropagation(), keydown: e => e.stopPropagation() } });
  document.body.append(panel);
}
export function showLab(on) { if (!panel) return; panel.classList.toggle('hidden', !on); if (on) build(); else mode = ''; }
export function toggleLab() { if (panel && G() && G().lab) { const hid = panel.classList.toggle('hidden'); if (!hid) build(); } }
export function rebuildLab() { if (panel && !panel.classList.contains('hidden')) build(); }
