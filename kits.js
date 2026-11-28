// Bộ chiêu RIÊNG cho từng lớp. Phím đầu (nguyên tố chính) quyết định HÌNH DẠNG theo lớp,
// phím sau quyết định HIỆU ỨNG. Cùng phím 2 lần = chiêu đặc trưng của lớp cho nguyên tố đó.
export const EL = ['FIRE', 'WATER', 'EARTH', 'WIND'];
export const KEYS = { FIRE: 'Q', WATER: 'W', EARTH: 'E', WIND: 'R' };
export const EL_INFO = {
  FIRE:  { name: 'Fire',  color: '#ff7a3c', role: 'Damage' },
  WATER: { name: 'Water', color: '#5bb8ff', role: 'Control' },
  EARTH: { name: 'Earth', color: '#d4b46e', role: 'Defense' },
  WIND:  { name: 'Wind',  color: '#a6ebcb', role: 'Mobility' }
};
export const GROUP_COLOR = { CONTROL: '#5bb8ff', AREA: '#ff9a4a', MOBILITY: '#a6ebcb', DEFENSE: '#d4b46e', DAMAGE: '#ff7a3c', ULTIMATE: '#f0a8ff' };
export const GROUP_NAME = { CONTROL: 'Control', AREA: 'Area', MOBILITY: 'Mobility', DEFENSE: 'Defense', DAMAGE: 'Damage', ULTIMATE: 'Ultimate' };

const S = (name, group, cd, shape, params, tags, desc) => ({ name, group, cd, shape, tags, desc, ...params });

export const KITS = {
  KNIGHT: {
    forms: { FIRE: 'Cleave', WATER: 'Whirl', EARTH: 'Rupture', WIND: 'Charge' },
    'FIRE>FIRE':   S('Flame Cleave', 'DAMAGE', 5, 'arc', { range: 125, arc: 2.6, dmg: 55, burn: 3, crescent: { range: 320, dmg: 30, speed: 720, width: 80, burn: 2, pierce: 99 } }, ['melee'], 'A huge burning cleave that also launches a fire crescent.'),
    'FIRE>WATER':  S('Steam Cleave', 'CONTROL', 6, 'arc', { range: 115, arc: 2.2, dmg: 40, leave: { kind: 'steam', radius: 115, life: 3.5, offset: 90 } }, ['melee', 'zone'], 'Cleave that bursts into steam: enemies inside are blinded and their shots vanish.'),
    'FIRE>EARTH':  S('Molten Cleave', 'AREA', 7, 'arc', { range: 120, arc: 2.3, dmg: 72, stun: 0.8, leave: { kind: 'lava', radius: 85, life: 3.5, offset: 80 } }, ['melee', 'zone'], 'Heavy molten strike: stuns and leaves a lava pool.'),
    'FIRE>WIND':   S('Searing Crescent', 'DAMAGE', 5, 'arc', { range: 100, arc: 1.8, dmg: 35, crescent: { range: 470, dmg: 48, speed: 820, width: 110, burn: 3, pierce: 99 } }, ['melee', 'projectile'], 'Quick slash that sends a giant burning crescent through the whole line.'),
    'WATER>WATER': S('Riptide Whirl', 'CONTROL', 4, 'whirl', { radius: 175, dmg: 50, wet: 4, push: 280, slow: [0.4, 1.6], barrier: { life: 1.6 } }, ['melee', 'area'], 'A wide soaking spin that shoves enemies away, then leaves a ring of water around you for 1.6s that destroys incoming projectiles.'),
    'WATER>FIRE':  S('Boiling Vortex', 'AREA', 6, 'whirl', { radius: 118, dmg: 14, burn: 2, spin: { time: 1.4, tick: 0.2 } }, ['melee', 'area'], 'Keep spinning for 1.4s, scalding everything close.'),
    'WATER>EARTH': S('Mire Whirl', 'CONTROL', 7, 'whirl', { radius: 130, dmg: 26, root: 1.4, leave: { kind: 'swamp', radius: 140, life: 4 } }, ['melee', 'area', 'zone'], 'Spin that roots enemies and turns the ground into a swamp.'),
    'WATER>WIND':  S('Maelstrom', 'CONTROL', 8, 'whirl', { radius: 210, dmg: 16, pull: 360, wet: 3, after: { t: 0.55, radius: 135, freeze: 1.4, dmg: 22 } }, ['area'], 'Drag everything in, then freeze the pile.'),
    'EARTH>EARTH': S('Earthbreaker', 'CONTROL', 5, 'spikes', { count: 6, spacing: 55, radius: 46, step: 0.05, dmg: 46, stun: 0.7 }, ['area'], 'A line of rock spikes erupts toward the cursor, stunning.'),
    'EARTH>FIRE':  S('Magma Fissure', 'AREA', 7, 'spikes', { count: 7, spacing: 55, radius: 44, step: 0.05, dmg: 34, burn: 2.5, leaveEach: { kind: 'lava', radius: 36, life: 2.6 } }, ['area', 'zone'], 'A burning fissure that leaves lava along its path.'),
    'EARTH>WATER': S('Quicksand Rift', 'CONTROL', 7, 'spikes', { count: 6, spacing: 55, radius: 48, step: 0.05, dmg: 24, root: 1.3, slow: [0.4, 1.5], leaveEnd: { kind: 'swamp', radius: 115, life: 4 } }, ['area', 'zone'], 'A rift that roots enemies and ends in a swamp.'),
    'EARTH>WIND':  S('Stone Storm', 'AREA', 7, 'spikes', { count: 5, spacing: 55, radius: 40, step: 0.05, lines: 3, spread: 0.45, dmg: 30, push: 220 }, ['area'], 'Three lines of flying stone fan out in front of you.'),
    'WIND>WIND':   S('Gale Charge', 'MOBILITY', 4, 'charge', { dist: 110, time: 0.22, dmg: 40, push: 320 }, ['mobility', 'melee'], 'Charge through enemies, knocking them aside.'),
    'WIND>FIRE':   S('Blazing Charge', 'MOBILITY', 5, 'charge', { dist: 110, time: 0.22, dmg: 34, burn: 2.5, trail: 'fire' }, ['mobility', 'melee', 'zone'], 'Charge leaving a trail of fire.'),
    'WIND>WATER':  S('Tidal Charge', 'MOBILITY', 5, 'charge', { dist: 100, time: 0.2, dmg: 28, wet: 3, slow: [0.4, 1.4], endWhirl: { radius: 115, dmg: 24, push: 260, wet: 3 } }, ['mobility', 'melee', 'area'], 'Charge that crashes into a wave at the end.'),
    'WIND>EARTH':  S('Meteor Leap', 'MOBILITY', 7, 'leap', { range: 107, time: 0.4, radius: 125, dmg: 62, stun: 1.2 }, ['mobility', 'area'], 'Leap to the cursor and slam the ground, stunning.')
  },
  RANGER: {
    forms: { FIRE: 'Volley', WATER: 'Trap', EARTH: 'Rain', WIND: 'Tumble' },
    'FIRE>FIRE':   S('Phoenix Arrow', 'DAMAGE', 6, 'bolt', { speed: 1050, range: 720, r: 12, dmg: 46, pierce: 99, burn: 3, explode: { radius: 95, dmg: 30, burn: 2 } }, ['projectile'], 'A blazing arrow that pierces everything and explodes at the end.'),
    'FIRE>WATER':  S('Scalding Volley', 'CONTROL', 5, 'volley', { count: 5, spread: 0.55, speed: 900, range: 480, r: 6, dmg: 15, blind: 0.9, burn: 1.5 }, ['projectile'], 'Five scalding arrows that blind what they hit.'),
    'FIRE>EARTH':  S('Blast Arrows', 'AREA', 6, 'volley', { count: 3, spread: 0.3, speed: 820, range: 520, r: 7, dmg: 17, explode: { radius: 72, dmg: 30, stun: 0.5 } }, ['projectile', 'area'], 'Three explosive arrows that stun on impact.'),
    'FIRE>WIND':   S('Firestorm Volley', 'DAMAGE', 6, 'volley', { count: 9, spread: 0.95, speed: 950, range: 500, r: 6, dmg: 14, pierce: 1, burn: 2 }, ['projectile'], 'A wide fan of nine burning arrows.'),
    'WATER>WATER': S('Tidal Snare', 'CONTROL', 4, 'trap', { range: 380, radius: 110, arm: 0.35, life: 14, max: 3, dmg: 28, freeze: 1.8, wet: 3 }, ['trap'], 'Place a snare at the cursor: the first enemy to step in freezes everything around it.'),
    'WATER>FIRE':  S('Geyser Trap', 'DAMAGE', 5, 'trap', { range: 380, radius: 100, arm: 0.35, life: 14, max: 3, dmg: 58, push: 320, burn: 2 }, ['trap'], 'A trap that erupts in a scalding geyser.'),
    'WATER>EARTH': S('Quicksand Trap', 'CONTROL', 6, 'trap', { range: 380, radius: 130, arm: 0.35, life: 14, max: 3, dmg: 20, root: 2.2, leave: { kind: 'swamp', radius: 140, life: 4 } }, ['trap', 'zone'], 'A trap that roots enemies and becomes quicksand.'),
    'WATER>WIND':  S('Frost Mine', 'AREA', 6, 'trap', { range: 380, radius: 100, arm: 0.35, life: 14, max: 3, dmg: 22, freeze: 1.4, shards: { count: 8, dmg: 20, speed: 600, range: 300, r: 6 } }, ['trap', 'projectile'], 'A mine that freezes and sprays ice shards in every direction.'),
    'EARTH>EARTH': S('Arrow Rain', 'AREA', 6, 'rain', { range: 420, count: 14, duration: 1.2, area: 140, radius: 42, delay: 0.35, dmg: 20 }, ['area'], 'Arrows rain down over the target area.'),
    'EARTH>FIRE':  S('Fire Rain', 'AREA', 7, 'rain', { range: 420, count: 14, duration: 1.2, area: 140, radius: 42, delay: 0.35, dmg: 17, burn: 2.5, leaveEach: { kind: 'fire', radius: 30, life: 2.2 } }, ['area', 'zone'], 'Burning arrows rain down and set the ground alight.'),
    'EARTH>WATER': S('Hailstorm', 'CONTROL', 7, 'rain', { range: 420, count: 16, duration: 1.3, area: 150, radius: 42, delay: 0.35, dmg: 14, wet: 3, slow: [0.45, 1.5], freeze: 0.5 }, ['area'], 'Hail soaks, slows and briefly freezes the area.'),
    'EARTH>WIND':  S('Boulder Barrage', 'CONTROL', 8, 'rain', { range: 420, count: 6, duration: 1.0, area: 150, radius: 70, delay: 0.45, dmg: 42, stun: 0.8 }, ['area'], 'Heavy boulders crash down, stunning.'),
    'WIND>WIND':   S('Gale Tumble', 'MOBILITY', 3, 'roll', { dist: 70, time: 0.18, arrows: { count: 3, spread: 0.18, speed: 950, range: 520, r: 6, dmg: 20, pierce: 1 } }, ['mobility', 'projectile'], 'Tumble away from the cursor while firing three arrows at it.'),
    'WIND>FIRE':   S('Ember Tumble', 'MOBILITY', 4, 'roll', { dist: 70, time: 0.18, trail: 'fire', arrows: { count: 3, spread: 0.2, speed: 950, range: 520, r: 6, dmg: 17, burn: 2 } }, ['mobility', 'projectile', 'zone'], 'Tumble leaving fire behind, firing burning arrows.'),
    'WIND>WATER':  S('Mist Tumble', 'MOBILITY', 5, 'roll', { dist: 80, time: 0.2, inv: 0.6, leaveOrigin: { kind: 'steam', radius: 120, life: 3.5 }, arrows: { count: 2, spread: 0.15, speed: 950, range: 520, r: 6, dmg: 15 } }, ['mobility', 'zone'], 'Vanish in a cloud of mist and tumble away.'),
    'WIND>EARTH':  S('Stone Tumble', 'DEFENSE', 6, 'roll', { dist: 70, time: 0.18, wallOrigin: { length: 190, life: 5 }, arrows: { count: 3, spread: 0.18, speed: 950, range: 520, r: 6, dmg: 17, stun: 0.3 } }, ['mobility', 'projectile'], 'Tumble away and raise a stone wall where you stood: it blocks enemies and shots.')
  },
  MAGE: {
    forms: { FIRE: 'Orb', WATER: 'Lance', EARTH: 'Meteor', WIND: 'Blink' },
    'FIRE>FIRE':   S('Inferno Orb', 'DAMAGE', 6, 'bolt', { speed: 440, range: 520, r: 14, dmg: 30, pierce: 0, explode: { radius: 120, dmg: 42, burn: 3 }, split: { count: 5, dmg: 14, speed: 420, range: 180, r: 7, burn: 2 } }, ['projectile', 'area'], 'A huge fireball that explodes and splits into five embers.'),
    'FIRE>WATER':  S('Steam Bomb', 'CONTROL', 6, 'bolt', { speed: 520, range: 480, r: 12, dmg: 20, explode: { radius: 110, dmg: 34 }, leave: { kind: 'steam', radius: 125, life: 4 } }, ['projectile', 'zone'], 'A bomb that bursts into a blinding steam cloud.'),
    'FIRE>EARTH':  S('Magma Bomb', 'AREA', 7, 'bolt', { speed: 480, range: 480, r: 13, dmg: 24, explode: { radius: 100, dmg: 56, stun: 0.6 }, leave: { kind: 'lava', radius: 95, life: 4 } }, ['projectile', 'area', 'zone'], 'A molten bomb: stuns and leaves lava.'),
    'FIRE>WIND':   S('Fire Cyclone', 'AREA', 6, 'cyclone', { speed: 240, range: 520, r: 56, dmg: 10, tick: 0.16, burn: 2.5, pull: 70 }, ['projectile', 'area'], 'A slow fire whirl that drags enemies along and burns them.'),
    'WATER>WATER': S('Glacial Lance', 'CONTROL', 4, 'beam', { length: 540, width: 46, dmg: 58, freeze: 1.4 }, ['beam'], 'An icy lance that freezes everything in a line.'),
    'WATER>FIRE':  S('Boiling Beam', 'DAMAGE', 5, 'beam', { length: 500, width: 48, dmg: 58, burn: 2.5 }, ['beam'], 'A scalding beam that burns everything in a line.'),
    'WATER>EARTH': S('Crystal Lance', 'CONTROL', 6, 'beam', { length: 520, width: 44, dmg: 40, stun: 1.0, endBurst: { radius: 90, dmg: 30, stun: 1.0 } }, ['beam', 'area'], 'A crystal lance that stuns, shattering at the end.'),
    'WATER>WIND':  S('Storm Ray', 'CONTROL', 6, 'beam', { length: 600, width: 76, dmg: 28, push: 360, slow: [0.45, 1.5] }, ['beam'], 'A wide gale ray that blasts enemies back.'),
    'EARTH>EARTH': S('Cataclysm', 'AREA', 8, 'ground', { range: 400, radius: 115, delay: 1.0, dmg: 78, stun: 0.6 }, ['area'], 'A giant boulder crashes down after a warning, stunning and cracking the ground into slow rubble.'),
    'EARTH>FIRE':  S('Meteor Shower', 'AREA', 8, 'rain', { range: 400, count: 7, duration: 1.2, area: 150, radius: 72, delay: 0.6, dmg: 42, burn: 2.5 }, ['area'], 'Seven meteors rain down around the cursor.'),
    'EARTH>WATER': S('Glacier Drop', 'CONTROL', 8, 'ground', { range: 400, radius: 150, delay: 0.7, dmg: 60, freeze: 2.0 }, ['area'], 'A glacier crashes down, freezing a wide area.'),
    'EARTH>WIND':  S('Gravity Well', 'CONTROL', 9, 'well', { range: 400, radius: 175, life: 2.2, pull: 230, slam: { radius: 135, dmg: 75, stun: 1.0 } }, ['area', 'zone'], 'A well that drags enemies in, then collapses on them.'),
    'WIND>WIND':   S('Tempest Blink', 'MOBILITY', 4, 'blink', { range: 100, nova: { radius: 130, dmg: 34, push: 360 } }, ['mobility', 'area'], 'Teleport to the cursor and blast enemies away.'),
    'WIND>FIRE':   S('Flame Blink', 'MOBILITY', 5, 'blink', { range: 100, nova: { radius: 120, dmg: 34, burn: 2.5 }, novaOrigin: { radius: 120, dmg: 34, burn: 2.5 } }, ['mobility', 'area'], 'Teleport, exploding in flames where you leave and where you land.'),
    'WIND>WATER':  S('Frost Blink', 'MOBILITY', 5, 'blink', { range: 100, novaOrigin: { radius: 145, dmg: 20, freeze: 1.5 } }, ['mobility', 'area'], 'Teleport, freezing everything you leave behind.'),
    'WIND>EARTH':  S('Quake Blink', 'MOBILITY', 6, 'blink', { range: 100, nova: { radius: 150, dmg: 50, stun: 1.2 } }, ['mobility', 'area'], 'Teleport and shake the ground, stunning.')
  }
};

// ---------- Tuyệt kỹ rèn từ 3 nguyên tố (phím D / F, bấm là tung) ----------
// Nguyên tố thứ 1 = dạng tuyệt kỹ của lớp. Nguyên tố 2 và 3 = cường hoá (trùng thì cộng dồn).
const ULT = {
  KNIGHT: {
    FIRE:  S('Sunfall Cleave', 'ULTIMATE', 20, 'arc', { range: 200, arc: 6.3, dmg: 90, burn: 3, radial: 8, crescent: { range: 380, dmg: 40, speed: 760, width: 90, pierce: 99 } }, ['melee', 'projectile'], 'A full-circle blazing cleave that sprays eight crescents.'),
    WATER: S('Tsunami Spin', 'ULTIMATE', 20, 'whirl', { radius: 185, dmg: 20, wet: 2, push: 120, slow: [0.5, 1], spin: { time: 2.6, tick: 0.18 } }, ['melee', 'area'], 'Spin as a tidal storm for 2.6s.'),
    EARTH: S('Tectonic Rupture', 'ULTIMATE', 20, 'spikes', { count: 7, spacing: 60, radius: 48, step: 0.05, radial: 6, dmg: 52, stun: 1.0 }, ['area'], 'Six lines of spikes burst out from you in a star.'),
    WIND:  S('Hurricane Rush', 'ULTIMATE', 20, 'charge', { dist: 300, time: 0.2, dmg: 48, push: 300, charges: 3 }, ['mobility', 'melee'], 'Three chained charges toward the cursor.')
  },
  RANGER: {
    FIRE:  S('Sky Barrage', 'ULTIMATE', 20, 'volley', { count: 11, spread: 1.4, waves: 4, wavegap: 0.22, speed: 980, range: 560, r: 6, dmg: 20, pierce: 1 }, ['projectile'], 'Four waves of eleven arrows.'),
    WATER: S('Minefield', 'ULTIMATE', 20, 'trap', { range: 380, scatter: 170, trapCount: 6, radius: 100, arm: 0.2, life: 16, max: 12, dmg: 40, freeze: 1.2 }, ['trap'], 'Scatter six armed snares around the cursor.'),
    EARTH: S('Deluge', 'ULTIMATE', 20, 'rain', { range: 420, count: 40, duration: 2.4, area: 230, radius: 46, delay: 0.35, dmg: 26 }, ['area'], 'A long, dense storm of arrows over a wide area.'),
    WIND:  S('Wind Dancer', 'ULTIMATE', 20, 'roll', { dist: 200, time: 0.17, rolls: 3, arrows: { count: 5, spread: 0.4, speed: 980, range: 540, r: 6, dmg: 24, pierce: 2 } }, ['mobility', 'projectile'], 'Three tumbles in a row, each firing five arrows.')
  },
  MAGE: {
    FIRE:  S('Supernova', 'ULTIMATE', 20, 'nova', { radius: 260, delay: 0.35, dmg: 130, burn: 3, push: 300 }, ['area'], 'Detonate a star around yourself.'),
    WATER: S('Absolute Zero', 'ULTIMATE', 20, 'ground', { range: 400, radius: 240, delay: 0.6, dmg: 60, freeze: 2.6 }, ['area'], 'Freeze a huge area solid.'),
    EARTH: S('Meteor Storm', 'ULTIMATE', 20, 'rain', { range: 400, count: 14, duration: 2.2, area: 240, radius: 80, delay: 0.7, dmg: 50, burn: 2 }, ['area'], 'Fourteen meteors crash down over a wide area.'),
    WIND:  S('Eye of the Storm', 'ULTIMATE', 20, 'storm', { radius: 200, life: 5, tick: 0.22, dmg: 12, push: 120, blind: 0.4 }, ['area', 'zone'], 'Become the eye of a storm for 5s.')
  }
};
const SUFFIX = {
  'FIRE+FIRE': 'Inferno', 'FIRE+WATER': 'Steam', 'EARTH+FIRE': 'Magma', 'FIRE+WIND': 'Wildfire', 'WATER+WATER': 'Tides',
  'EARTH+WATER': 'the Mire', 'WATER+WIND': 'Frost', 'EARTH+EARTH': 'Stone', 'EARTH+WIND': 'Sandstorm', 'WIND+WIND': 'Gales'
};
const RADIUS_KEYS = ['radius', 'area', 'width', 'range'];
function deepMap(o, fn, k) {
  if (Array.isArray(o)) return o.slice();
  if (o && typeof o === 'object') { const r = {}; for (const [kk, v] of Object.entries(o)) r[kk] = deepMap(v, fn, kk); return r; }
  return fn(k, o);
}
function ultMod(def, el) {
  if (el === 'FIRE') { def = deepMap(def, (k, v) => k === 'dmg' ? v * 1.3 : v); def.burn = (def.burn || 0) + 2.5; }
  if (el === 'WATER') { def.wet = 4; def.slow = [0.5, 2]; if (def.freeze) def.freeze += 0.6; }
  if (el === 'EARTH') { def = deepMap(def, (k, v) => (k === 'radius' || k === 'area') ? v * 1.2 : v); def.stun = (def.stun || 0) + 0.7; }
  if (el === 'WIND') {
    def.push = (def.push || 0) + 260;
    if (def.count) def.count = Math.round(def.count * 1.4);
    if (def.charges) def.charges += 1; if (def.rolls) def.rolls += 1; if (def.trapCount) def.trapCount += 2; if (def.waves) def.waves += 1;
    if (def.spin) def.spin = { ...def.spin, time: def.spin.time * 1.3 };
  }
  return def;
}

const clone = o => JSON.parse(JSON.stringify(o));

export function skillDef(cls, a, b) {
  const base = KITS[cls][a + '>' + b];
  if (!base) return null;
  const d = clone(base); d.key = cls + ':' + a + '>' + b; d.els = a === b ? [a] : [a, b]; d.combo = [a, b];
  return d;
}
export function forgeDef(cls, els) {
  const [a, b, c] = els, pair = [b, c].sort().join('+');
  let d = clone(ULT[cls][a]);
  d = ultMod(d, b); d = ultMod(d, c);
  d.name = d.name + ' of ' + SUFFIX[pair];
  d.key = cls + ':ULT:' + a + '>' + pair; d.els = [...new Set(els)]; d.combo = els; d.group = 'ULTIMATE';
  return d;
}
export const ultBaseName = (cls, el) => ULT[cls][el].name;
export const ultDesc = (cls, el) => ULT[cls][el].desc;
export const SUFFIX_OF = (b, c) => SUFFIX[[b, c].sort().join('+')];
export const COMBOS = EL.flatMap(a => EL.map(b => [a, b]));


// ---------- 36 tuyệt kỹ ghép 3 nguyên tố: khoá = nguyên tố đầu | cặp còn lại (đã sắp xếp) ----------
// Mỗi chiêu có cơ chế riêng (ults.js), hiệu ứng riêng (gfx/ultvfx.js) và icon riêng (gfx/ulticons.js).
const PAL = {
  magma: ['#1c0e08', '#a8301a', '#ff7a2a', '#ffe08a'], steam: ['#2a3440', '#8aa0b4', '#dfe8f0', '#ffffff'], ember: ['#2a0a04', '#c8401a', '#ff9a3a', '#fff0b0'],
  tide: ['#0a1e3a', '#2f7ac8', '#7fd0ff', '#e8f8ff'], frost: ['#0a2440', '#4a9ad8', '#bfe8ff', '#ffffff'], storm: ['#160c34', '#6a4ad8', '#b8a8ff', '#ffffff'],
  stone: ['#2a1d14', '#7a5a3a', '#c8a070', '#f4e0b8'], jade: ['#0c2a1a', '#2f8a5a', '#7ad0a0', '#e0fff0'], sand: ['#3a2a14', '#a8844a', '#e0c890', '#fff4d8'],
  solar: ['#3a1404', '#ff7a1a', '#ffd84a', '#ffffff'], void: ['#05040c', '#3a2a7a', '#9a7aff', '#f0e8ff'], gale: ['#0c2a2a', '#3ab8a0', '#a6ebcb', '#ffffff']
};
const X = (name, ult, cost, pal, tags, desc, params) => ({ name, ult, ultCost: cost, pal: PAL[pal], group: 'ULTIMATE', cd: 20, shape: 'ult', tags, desc, ...params });
// giá = % năng lượng gốc của class (Knight 100, Ranger 70, Mage 150)
const ULTS = {
  KNIGHT: {
    FIRE: X('Meteor Blade', 'meteorblade', 70, 'ember', ['melee', 'area'], 'Three leaping meteor strikes that chain to nearby foes. Execute: +60% damage to foes under 30% HP, and every kill adds another strike.', { slam: { dmg: 75, burn: 2, stun: 0.4 }, rock: { dmg: 20 }, exec: 0.6, chain: 3 }),
    WATER: X('Monsoon Dance', 'monsoon', 68, 'tide', ['melee'], 'Five lightning-fast slashes that leap from foe to foe; you cannot be hit while dancing. Each kill adds a slash (up to 8).', { strike: { dmg: 62, wet: 2 }, finale: { dmg: 65, blind: 1.2 }, maxStrikes: 8 }),
    EARTH: X('Mountain Titan', 'titan', 72, 'stone', ['melee', 'area'], 'Grow into a stone giant for 6s: half damage, a shield of 30% max HP, immune to control, nearby foes are dragged in, and every swing is a slowing stomp.', { stomp: { dmg: 70, stun: 1.0 }, swing: { dmg: 50, stun: 0.5, push: 240 }, titanShield: 0.3, tauntR: 250, stompSlow: [0.4, 1.5] }),
    WIND: X('Sunder Cyclone', 'sunder', 70, 'gale', ['melee', 'area'], 'Spin in the air for 3s, sucking foes in and hurling rocks, then crash down: the more foes pulled in, the longer they are stunned.', { tick: { dmg: 17, push: 160 }, rock: { dmg: 18 }, land: { dmg: 75, stun: 0.6 }, pullR: 300 })
  },
  RANGER: {
    FIRE: X('Meteor Arrow', 'meteorarrow', 72, 'ember', ['projectile', 'area'], 'Draw a colossal arrow that pierces across the whole field. Meteors crash down along its path, stunning longer the farther they fall.', { big: { dmg: 160, burn: 2 }, meteor: { dmg: 72, burn: 2, stun: 0.4 } }),
    WATER: X('Pentagram Snares', 'pentagram', 66, 'tide', ['trap', 'area'], 'Five snares form a pentagram that detonates after 1s (or when stepped on), rooting everything inside and marking it to take 25% more damage for 5s.', { beam: { dmg: 60, wet: 2 }, blast: { dmg: 65, wet: 3, root: 1.2 }, autoFire: 1, markAmt: 0.25, markT: 5 }),
    EARTH: X('Firestorm Barrage', 'airstrike', 70, 'stone', ['area'], 'Call three carpet-bombing runs toward the cursor. Foes caught are slowed by 40% and take 15% more damage for 3s.', { bomb: { dmg: 50, stun: 0.25 }, carpetSlow: [0.4, 1.5], shred: 0.15 }),
    WIND: X('Mirage', 'mirage', 64, 'gale', ['projectile', 'mobility'], 'Tumble away leaving three mirages for 5s. They lure and blind foes, copy every basic attack you fire, then explode.', { arrow: { dmg: 14 }, boom: { dmg: 40 }, copy: { dmg: 12 }, decoyLife: 5 })
  },
  MAGE: {
    FIRE: X('Solar Flare', 'solar', 72, 'solar', ['area'], 'A small sun descends, dragging foes in and scorching them, then collapses: +15% blast damage for every foe caught (up to double).', { tick: { dmg: 13, burn: 1 }, nova: { dmg: 135, burn: 2, push: 320 }, packBonus: 0.15, packMax: 2 }),
    WATER: X('Abyssal Tide', 'abyss', 68, 'tide', ['area'], 'A towering wave sweeps the whole screen, carrying foes with it. Drowned foes take 30% more damage for 4s; each foe hit refunds 3 energy.', { wave: { dmg: 75, wet: 4, slow: [0.5, 2] }, crash: { dmg: 55, stun: 0.6 }, drown: 0.3, refund: 3 }),
    EARTH: X('Comet Trench', 'comettrench', 72, 'stone', ['area'], 'A colossal comet streaks down and carves a burning trench that stands as a wall for 4s, blocking foes.', { trench: { dmg: 95, burn: 2 }, impact: { dmg: 120, stun: 0.8 }, wallT: 4 }),
    WIND: X('Thunderhead', 'thunderhead', 68, 'storm', ['area'], 'A storm cloud follows your cursor for 5s. Storm mode: single-element skills cost half and each one calls an extra lightning bolt.', { bolt: { dmg: 56, stun: 0.25 }, stormRefund: 0.5 })
  }
};
export const ULT_TABLE = ULTS;
// ---------- Axiom, Chủ Khối: nguyên tố đầu là hình khối, nguyên tố sau là hiệu ứng ----------
// Lửa = Khối rơi (nổ tại con trỏ) · Nước = Tấm kính (tia thẳng) · Đất = Cột khối (hàng cột trồi lên) · Gió = Gập không gian (dịch chuyển)
KITS.AXIOM = {
  forms: { FIRE: 'Cube', WATER: 'Pane', EARTH: 'Pillar', WIND: 'Fold' },
  'FIRE>FIRE':   S('Furnace Cube', 'DAMAGE', 5, 'ground', { range: 380, radius: 105, delay: 0.45, dmg: 74, burn: 3 }, ['area'], 'A burning cube slams down at the cursor and bursts.'),
  'FIRE>WATER':  S('Steam Cube', 'CONTROL', 6, 'ground', { range: 380, radius: 118, delay: 0.4, dmg: 36, blind: 1.2, wet: 2, leave: { kind: 'steam', radius: 118, life: 3.5 } }, ['area', 'zone'], 'A cube of boiling water shatters into blinding steam.'),
  'FIRE>EARTH':  S('Magma Cube', 'AREA', 7, 'ground', { range: 360, radius: 96, delay: 0.5, dmg: 62, stun: 0.8, leave: { kind: 'lava', radius: 90, life: 3.5 } }, ['area', 'zone'], 'A molten cube crashes down, stunning and leaving lava.'),
  'FIRE>WIND':   S('Scatter Cubes', 'DAMAGE', 6, 'rain', { range: 400, count: 6, duration: 0.45, area: 95, radius: 52, delay: 0.3, dmg: 26, burn: 2 }, ['area'], 'Six small cubes rain down and blow up one after another.'),
  'WATER>WATER': S('Glass Lance', 'CONTROL', 4, 'beam', { length: 520, width: 44, dmg: 52, freeze: 1.2 }, ['beam'], 'A pane of frozen glass slices straight ahead and freezes.'),
  'WATER>FIRE':  S('Searing Pane', 'DAMAGE', 5, 'beam', { length: 480, width: 56, dmg: 60, burn: 2.5 }, ['beam'], 'A red-hot pane cuts through the whole line.'),
  'WATER>EARTH': S('Prism Wall', 'AREA', 6, 'beam', { length: 420, width: 60, dmg: 36, stun: 0.5, endBurst: { radius: 110, dmg: 40, stun: 0.6 } }, ['beam', 'area'], 'A heavy prism slides out and shatters at the end, stunning.'),
  'WATER>WIND':  S('Shear Pane', 'CONTROL', 6, 'beam', { length: 560, width: 70, dmg: 30, push: 380, wet: 2 }, ['beam'], 'A wide pane of wind-glass shoves the whole line away.'),
  'EARTH>EARTH': S('Pillar Line', 'CONTROL', 5, 'spikes', { count: 6, spacing: 56, radius: 46, step: 0.05, dmg: 48, stun: 0.7 }, ['area'], 'Square pillars punch up in a line toward the cursor.'),
  'EARTH>FIRE':  S('Ember Pillars', 'AREA', 7, 'spikes', { count: 7, spacing: 52, radius: 42, step: 0.05, dmg: 34, burn: 2.5, leaveEach: { kind: 'fire', radius: 30, life: 2.2 } }, ['area', 'zone'], 'Glowing pillars rise and leave the ground burning.'),
  'EARTH>WATER': S('Frost Pillars', 'CONTROL', 6, 'spikes', { count: 6, spacing: 55, radius: 46, step: 0.05, dmg: 28, freeze: 1.0, slow: [0.5, 1.5] }, ['area'], 'Ice pillars burst up in a line and freeze what they hit.'),
  'EARTH>WIND':  S('Pillar Fan', 'AREA', 7, 'spikes', { count: 5, spacing: 55, radius: 40, step: 0.05, lines: 3, spread: 0.45, dmg: 30, push: 260 }, ['area'], 'Three lines of pillars fan out and knock foes back.'),
  'WIND>WIND':   S('Fold Step', 'MOBILITY', 4, 'blink', { range: 230, nova: { radius: 120, dmg: 38, push: 340 } }, ['mobility', 'area'], 'Fold space to the cursor and blast foes away where you land.'),
  'WIND>FIRE':   S('Fold Flare', 'MOBILITY', 5, 'blink', { range: 230, novaOrigin: { radius: 110, dmg: 36, burn: 2.5 }, nova: { radius: 110, dmg: 36, burn: 2.5 } }, ['mobility', 'area'], 'Fold away; both ends of the fold burst into flame.'),
  'WIND>WATER':  S('Fold Mirror', 'MOBILITY', 5, 'blink', { range: 230, nova: { radius: 130, dmg: 26, freeze: 0.9, wet: 2 } }, ['mobility', 'area'], 'Fold to the cursor; the space you land in freezes.'),
  'WIND>EARTH':  S('Fold Crush', 'MOBILITY', 7, 'blink', { range: 200, nova: { radius: 140, dmg: 56, stun: 1.0 } }, ['mobility', 'area'], 'Fold in and drop the weight of the space you left onto foes, stunning.')
};
ULT.AXIOM = {
  FIRE:  S('Cube Collapse', 'ULTIMATE', 20, 'ground', { range: 380, radius: 220, delay: 0.6, dmg: 110, burn: 3 }, ['area'], 'A giant cube falls on the cursor and collapses.'),
  WATER: S('Prism Burst', 'ULTIMATE', 20, 'nova', { radius: 240, delay: 0.35, dmg: 70, freeze: 1.2 }, ['area'], 'A prism forms around you and shatters, freezing everything near.'),
  EARTH: S('Monolith Ring', 'ULTIMATE', 20, 'spikes', { count: 6, spacing: 58, radius: 46, step: 0.05, radial: 8, dmg: 50, stun: 0.9 }, ['area'], 'Eight lines of pillars burst out in a star.'),
  WIND:  S('Fold Cascade', 'ULTIMATE', 20, 'blink', { range: 300, novaOrigin: { radius: 150, dmg: 60, push: 300 }, nova: { radius: 170, dmg: 70, stun: 0.8 } }, ['mobility', 'area'], 'Fold across the field; both ends explode.')
};
ULTS.AXIOM = {
  FIRE: X('Cube Coffin', 'axcoffin', 70, 'void', ['area'], 'A huge cube closes around the cursor. Its walls slam in again and again, then it collapses.', { wall: { dmg: 22, push: -120 }, crush: { dmg: 120, stun: 1.0 } }),
  WATER: X('Prism Lattice', 'axprism', 68, 'frost', ['beam', 'area'], 'Four glass panes spin around you for 3s, slicing and chilling everything they cross.', { beam: { dmg: 16, slow: [0.4, 0.6] } }),
  EARTH: X('Cube Rain', 'axrain', 72, 'storm', ['area'], 'A storm of cubes rains on the area, faster and faster, then one last silent beat and a giant cube.', { cube: { dmg: 30, burn: 1 }, final: { dmg: 110, stun: 0.8 } }),
  WIND: X('Grand Fold', 'axfold', 70, 'gale', ['mobility', 'area'], 'Fold every foe near the cursor into one point, crush the fold shut, then step out of it.', { fold: { dmg: 95, stun: 1.2 } })
};
// 12 chiêu ghép 3 trong cả game: mỗi lớp 4 bộ = C(4,3). Thứ tự ghép không quan trọng; bộ nhận diện bằng nguyên tố bị thiếu.
// MISS_TO_ULT[lớp][nguyên tố thiếu] = khoá trong ULTS (giữ nguyên cơ chế/icon/VFX cũ).
const MISS_TO_ULT = {
  KNIGHT: { WATER: 'FIRE', EARTH: 'WATER', WIND: 'EARTH', FIRE: 'WIND' },
  RANGER: { WATER: 'FIRE', EARTH: 'WIND', WIND: 'EARTH', FIRE: 'WATER' },
  MAGE:   { WATER: 'EARTH', EARTH: 'WIND', WIND: 'FIRE', FIRE: 'WATER' }
};
MISS_TO_ULT.AXIOM = { WATER: 'FIRE', EARTH: 'WATER', WIND: 'EARTH', FIRE: 'WIND' };
export const triSort = els => EL.filter(e => els.includes(e));
export const triMissing = els => EL.find(e => !els.includes(e));
export const TRI_SETS = EL.map(m => EL.filter(e => e !== m)); // 4 bộ, đã sắp
export const triUltKey = (cls, els) => MISS_TO_ULT[cls][triMissing(els)];
export const ultKey = els => els[0];

// ---------- Lõi và ghép (túi đồ) ----------
// Lõi đơn = chiêu A>A. Lõi đôi = chiêu A>B. Ba lõi đơn khác nhau = tuyệt kỹ (4 bộ / lớp, không phụ thuộc thứ tự).
// Lõi đôi + lõi đơn = chiêu A>B được "truyền" thêm phụ lực của nguyên tố thứ ba.
const ADJ = { FIRE: 'Blazing', WATER: 'Tidal', EARTH: 'Titan', WIND: 'Tempest' };
const NOUN = { FIRE: 'Embers', WATER: 'Frost', EARTH: 'Stone', WIND: 'Gales' };
export const RIDER_TEXT = {
  FIRE: 'burns and hits 15% harder', WATER: 'soaks, slows and heals you 8', EARTH: 'stuns and grants a 20 shield', WIND: 'knocks back harder and reaches further'
};
// áp dụng fn lên chiêu và mọi hiệu ứng con có sát thương (nổ, vòng, mảnh…)
function eachEffect(def, fn) {
  const walk = o => { if (!o || typeof o !== 'object' || Array.isArray(o)) return; if ('dmg' in o) fn(o); for (const v of Object.values(o)) walk(v); };
  walk(def);
}
function rider(def, el, k = 1) {
  if (el === 'FIRE') eachEffect(def, o => { o.dmg *= 1 + 0.15 * k; o.burn = (o.burn || 0) + 2 * k; });
  if (el === 'WATER') { eachEffect(def, o => { o.wet = Math.max(o.wet || 0, 3); o.slow = [0.5, 1.4 * k]; if (o.freeze) o.freeze += 0.4 * k; }); def.healOnCast = (def.healOnCast || 0) + 8 * k; }
  if (el === 'EARTH') { eachEffect(def, o => { o.stun = (o.stun || 0) + 0.45 * k; }); def.shieldOnCast = (def.shieldOnCast || 0) + 20 * k; }
  if (el === 'WIND') {
    eachEffect(def, o => { o.push = (o.push || 0) + 200 * k; });
    for (const key of ['range', 'dist', 'speed', 'length']) if (typeof def[key] === 'number') def[key] *= 1 + 0.2 * k;
  }
  return def;
}
export function triDef(cls, els) {
  const set = triSort(els), uk = triUltKey(cls, set), d = clone(ULTS[cls][uk]);
  for (const e of set) rider(d, e, 0.4); // cả 3 nguyên tố góp phụ lực như nhau → không phụ thuộc thứ tự
  d.desc = d.desc + ' Fused from ' + set.map(e => EL_INFO[e].name).join(', ') + '.';
  d.key = cls + ':TRI:' + set.join('+'); d.els = set.slice(); d.combo = set.slice(); d.group = 'ULTIMATE'; d.tier = 3; d.glyph = d.ult; d.accent = EL_INFO[uk].color; d.triSet = set.join('+');
  return d;
}
export function infuseDef(cls, pair, add) {
  const base = skillDef(cls, pair[0], pair[1]);
  eachEffect(base, o => { o.dmg *= 1.35; });
  rider(base, add, 1);
  base.desc = `${base.desc} Infused: also ${RIDER_TEXT[add]}.`;
  base.name = `${base.name} of ${NOUN[add]}`;
  base.key = cls + ':INF:' + pair.join('>') + '+' + add; base.els = [...new Set([...pair, add])]; base.combo = [...pair, add]; base.group = 'ULTIMATE'; base.tier = 3;
  return base;
}
// ước lượng sức mạnh (tổng sát thương × số lần trúng × độ phủ + khống chế) để định giá năng lượng
export function skillPower(d) {
  const mult = (d.count || 1) * (d.waves || 1) * (d.charges || 1) * (d.rolls || 1) * (d.trapCount || 1) * (d.radial || 1) * (d.lines || 1) * (d.spin ? d.spin.time / d.spin.tick : 1) * (d.shape === 'storm' ? d.life / d.tick : 1);
  let s = (d.dmg || 0) * mult;
  for (const k of ['crescent', 'explode', 'split', 'arrows', 'nova', 'novaOrigin', 'after', 'endWhirl', 'slam', 'shards', 'endBurst']) if (d[k] && d[k].dmg) s += d[k].dmg * (d[k].count || 1) * (k === 'crescent' && d.radial ? d.radial : 1) * (k === 'arrows' ? (d.rolls || 1) : 1);
  s *= 0.6 + Math.min(300, d.radius || d.area || d.width || 80) / 250;
  return s + ((d.stun || 0) + (d.freeze || 0) + (d.root || 0)) * 18 + (d.burn || 0) * 6 + (d.push || 0) / 30;
}
export function coreDef(cls, core) {
  if (!core) return null;
  if (core.type === 'el') return skillDef(cls, core.el, core.el);
  if (core.type === 'duo') return skillDef(cls, core.els[0], core.els[1]);
  if (core.type === 'tri') return triDef(cls, core.els);
  if (core.type === 'inf') return infuseDef(cls, core.els, core.add);
  return null;
}
export const coreKey = core => core.type === 'el' ? core.el : core.type === 'inf' ? core.els.join('>') + '+' + core.add : core.type === 'tri' ? 'tri:' + triSort(core.els).join('+') : core.type + ':' + core.els.join('>');
export const coreEls = core => core.type === 'el' ? [core.el] : core.type === 'inf' ? [...core.els, core.add] : core.els.slice();
// ghép: trả về lõi mới hoặc { error }
export function mergeResult(cores) {
  const cs = cores.filter(Boolean);
  if (cs.length < 2) return { error: 'Put 2 or 3 cores on the table.' };
  if (cs.some(c => c.type === 'tri' || c.type === 'inf')) return { error: 'Three-element skills cannot be merged further.' };
  const singles = cs.filter(c => c.type === 'el'), duos = cs.filter(c => c.type === 'duo');
  if (cs.length === 2) {
    if (duos.length === 2) return { error: 'Two merged skills cannot be combined.' };
    if (singles.length === 2) { if (singles[0].el === singles[1].el) return { error: 'Use two different elements.' }; return { type: 'duo', els: [singles[0].el, singles[1].el] }; }
    return { type: 'inf', els: duos[0].els.slice(), add: singles[0].el };
  }
  if (singles.length === 3) { const e = singles.map(c => c.el); if (new Set(e).size < 3) return { error: 'Three single cores must be three different elements.' }; return { type: 'tri', els: triSort(e) }; }
  return { error: 'For 3 cores, use three single elements (or a merged skill + 1 single).' };
}
