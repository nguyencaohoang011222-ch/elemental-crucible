// Nâng cấp sau mỗi wave (chọn 1 trong 3) + nâng cấp lớn ở đầu stage 3, 7, 12, 18.
import { EL, EL_INFO } from './kits.js';

export function defaultMods() {
  return { speed: 1, hpMax: 0, basic: 1, dashCd: 1, atkSpeed: 1, regen: 0, dr: 0, lifesteal: 0,
    cd: 1, dmg: 1, elDmg: {}, elCd: {}, radius: 1, earthRadius: 1, burn: 1, freeze: 1, stun: 1, push: 1,
    projExtra: 0, pierce: 0, zoneLife: 1, aftershock: 0, ultCd: 1, comboFlow: 0, energyMax: 0, energyRegen: 0, energyGain: 1,
    chargeSpd: 1, atkSize: 1, atkExtra: 0, ricochet: 0, chainExtra: 0, swordWave: 0, cleaveEcho: 0, volleyCharge: 0, orbBurst: 0 };
}

// tag: chỉ xuất hiện khi bạn có ít nhất một chiêu mang tag đó. el: cần sở hữu nguyên tố. cls: chỉ cho lớp đó.
export const MINOR = [
  { id: 'swift',   name: 'Swift Feet',       color: '#a6ebcb', max: 5, text: '+8% movement speed.', apply: m => { m.speed *= 1.08; } },
  { id: 'vital',   name: 'Vitality',         color: '#ff7a6a', max: 5, text: '+20 max HP and heal 20.', apply: (m, g) => { m.hpMax += 20; g.p.hp += 20; } },
  { id: 'edge',    name: 'Honed Weapon',     color: '#e6c36a', max: 5, text: '+20% basic attack damage.', apply: m => { m.basic *= 1.2; } },
  { id: 'step',    name: 'Quick Step',       color: '#cfe8ff', max: 4, text: 'Dash cooldown -15%.', apply: m => { m.dashCd *= 0.85; } },
  { id: 'regen',   name: 'Regeneration',     color: '#8de28a', max: 4, text: 'Regenerate 1.5 HP per second.', apply: m => { m.regen += 1.5; } },
  { id: 'focus',   name: 'Elemental Focus',  color: '#f0a8ff', max: 5, text: 'All skills cost 8% less energy.', apply: m => { m.cd *= 0.92; } },
  { id: 'power',   name: 'Arcane Power',     color: '#f0a8ff', max: 5, text: 'All skill damage +12%.', apply: m => { m.dmg *= 1.12; } },
  { id: 'fire',    name: 'Fire Mastery',     el: 'FIRE',  max: 5, text: 'Fire skills +20% damage. Burns last 30% longer.', apply: m => { m.elDmg.FIRE = (m.elDmg.FIRE || 1) * 1.2; m.burn *= 1.3; } },
  { id: 'water',   name: 'Water Mastery',    el: 'WATER', max: 5, text: 'Water skills cost 12% less energy. Freeze, slow and root +25%.', apply: m => { m.elCd.WATER = (m.elCd.WATER || 1) * 0.88; m.freeze *= 1.25; } },
  { id: 'earth',   name: 'Earth Mastery',    el: 'EARTH', max: 5, text: 'Earth skills +15% area. Stuns +25%.', apply: m => { m.earthRadius *= 1.15; m.stun *= 1.25; } },
  { id: 'wind',    name: 'Wind Mastery',     el: 'WIND',  max: 5, text: 'Wind skills cost 12% less energy. Knockback +25%.', apply: m => { m.elCd.WIND = (m.elCd.WIND || 1) * 0.88; m.push *= 1.25; } },
  { id: 'split',   name: 'Split Shot',       tag: 'projectile', max: 3, color: '#ffd36b', text: 'Projectile skills fire extra projectiles.', apply: m => { m.projExtra++; } },
  { id: 'pierce',  name: 'Piercing',         tag: 'projectile', max: 3, color: '#ffd36b', text: 'Skill projectiles pierce +1 enemy.', apply: m => { m.pierce++; } },
  { id: 'wide',    name: 'Wide Reach',       tag: 'area|melee', max: 4, color: '#ff9a4a', text: 'Area and melee skills +15% radius.', apply: m => { m.radius *= 1.15; } },
  { id: 'linger',  name: 'Lingering Magic',  tag: 'zone|trap', max: 4, color: '#9ac060', text: 'Zones and traps last 35% longer.', apply: m => { m.zoneLife *= 1.35; } },
  { id: 'echo',    name: 'Aftershock',       tag: 'area|melee|beam', max: 3, color: '#ff9a4a', text: 'Area, melee and beam hits echo 0.4s later for +35% damage.', apply: m => { m.aftershock += 0.35; } },
  { id: 'flow',    name: 'Combo Flow',       needPairs: true, max: 3, color: '#a6ebcb', text: 'Casting a merged skill refunds 6 energy.', apply: m => { m.comboFlow += 6; } },
  { id: 'ult',     name: 'Ultimate Charge',  needForge: true, max: 3, color: '#f0a8ff', text: 'Three-element skills cost 15% less energy.', apply: m => { m.ultCd *= 0.85; } },
  { id: 'reserve', name: 'Deep Reserves', color: '#7fb0ff', max: 4, text: '+20 max energy.', apply: (m, g) => { m.energyMax += 20; } },
  { id: 'surge', name: 'Mana Surge', color: '#7fb0ff', max: 4, text: 'Kills give +2 energy and all energy gains are 25% larger.', apply: m => { m.energyKill = (m.energyKill || 0) + 2; m.energyGain *= 1.25; } },
  // ---------- nâng cấp đánh thường ----------
  { id: 'qcharge', name: 'Quick Charge', color: '#ffe27a', max: 4, text: 'Charge your basic attack 15% faster.', apply: m => { m.chargeSpd *= 1.15; } },
  { id: 'heavy', name: 'Heavy Hands', color: '#e6c36a', max: 4, text: 'Basic attacks are 15% bigger (sweep reach, arrow and orb size, blast radius).', apply: m => { m.atkSize *= 1.15; } },
  { id: 'swordwave', name: 'Sword Wave', cls: 'KNIGHT', max: 2, color: '#ffe9a0', text: 'Charged slashes launch a piercing crescent. Full charge (or level 2) fires three.', apply: m => { m.swordWave++; } },
  { id: 'rhythm', name: 'Battle Rhythm', cls: 'KNIGHT', max: 2, color: '#ffe9a0', text: 'A basic swing that connects pre-loads your next charge (25%, level 2: 40%). Charge 15% faster.', apply: m => { m.rhythm = m.rhythm ? 0.4 : 0.25; m.chargeSpd *= 1.15; } },
  { id: 'gapcloser', name: 'Gap Closer', cls: 'KNIGHT', max: 1, color: '#ffe9a0', text: 'Charged swings lunge at the nearest foe in front of you (up to 180px) before striking.', apply: m => { m.gapCloser = 1; } },
  { id: 'deflect', name: 'Reflecting Edge', cls: 'KNIGHT', max: 2, color: '#ffe9a0', text: 'Your swings bounce enemy projectiles back at their shooter (100% damage, level 2: 160%) and parry in a wider, longer arc.', apply: m => { m.deflect = (m.deflect || 0) + 1; } },
  { id: 'quakewave', name: 'Shockwave Mastery', cls: 'KNIGHT', max: 1, color: '#ffe9a0', text: 'A full charge also sends a ground wave 360px ahead that pierces everything (60% of the swing).', apply: m => { m.quakeWave = 1; } },
  { id: 'echo2', name: 'Cleave Echo', cls: 'KNIGHT', max: 1, color: '#ffe9a0', text: 'The 3rd hit of your combo strikes again a moment later.', apply: m => { m.cleaveEcho = 1; } },
  { id: 'multishot', name: 'Multishot', cls: 'RANGER', max: 3, color: '#7fd18b', text: 'Fire +1 extra arrow with every shot, in a fan.', apply: m => { m.atkExtra++; } },
  { id: 'ricochet', name: 'Ricochet', cls: 'RANGER', max: 2, color: '#7fd18b', text: 'Arrows bounce to +1 nearby enemy.', apply: m => { m.ricochet++; } },
  { id: 'volleych', name: 'Volley Charge', cls: 'RANGER', max: 1, color: '#dfe8ff', text: 'Fully charged shots also fire two silver arrows.', apply: m => { m.volleyCharge = 1; } },
  { id: 'twinorb', name: 'Twin Orb', cls: 'MAGE', max: 2, color: '#9b8cff', text: 'Cast +1 extra orb with every attack.', apply: m => { m.atkExtra++; } },
  { id: 'arcmastery', name: 'Arc Mastery', cls: 'MAGE', max: 2, color: '#bfe8ff', text: 'Chain lightning hits +2 enemies and triggers from 70% charge.', apply: m => { m.chainExtra++; } },
  { id: 'orbburst', name: 'Orb Burst', cls: 'MAGE', max: 1, color: '#c8b8ff', text: 'Orbs burst into 4 sparks when they explode.', apply: m => { m.orbBurst = 1; } },
  { id: 'bulwark', name: 'Bulwark',          cls: 'KNIGHT', max: 3, color: '#e6c36a', text: 'Take 8% less damage.', apply: m => { m.dr = 1 - (1 - m.dr) * 0.92; } },
  { id: 'quick',   name: 'Quickdraw',        cls: 'RANGER', max: 3, color: '#7fd18b', text: 'Basic attacks are 15% faster.', apply: m => { m.atkSpeed *= 1.15; } },
  { id: 'leech',   name: 'Soul Leech',       cls: 'MAGE',   max: 3, color: '#9b8cff', text: 'Heal 2% of skill damage you deal.', apply: m => { m.lifesteal += 0.02; } }
];
export const MINOR_BY_ID = Object.fromEntries(MINOR.map(u => [u.id, u]));

function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export function rollMinor(g, n = 3) {
  const p = g.p, tags = g.ownedTags();
  const pool = MINOR.filter(u => {
    if ((g.upgrades[u.id] || 0) >= u.max) return false;
    if (u.el && !p.owned.has(u.el)) return false;
    if (u.cls && u.cls !== p.cls) return false;
    if (u.tag && !u.tag.split('|').some(t => tags.has(t))) return false;
    if (u.needPairs && p.owned.size < 2) return false;
    if (u.needForge && !g.hasUlt()) return false;
    return true;
  });
  // ưu tiên nâng cấp gắn với chiêu (nhân đôi trọng số) để mỗi lượt chơi có bản sắc
  const weighted = pool.flatMap(u => (u.tag || u.el) ? [u, u] : [u]);
  const out = [];
  for (const u of shuffle(weighted, g.rand)) { if (!out.includes(u)) out.push(u); if (out.length >= n) break; }
  const cards = out.map(u => ({ id: u.id, name: u.name, text: u.text, color: u.color || (u.el ? EL_INFO[u.el].color : '#fff'), level: (g.upgrades[u.id] || 0) + 1, max: u.max }));
  // thỉnh thoảng có một lõi nguyên tố: ghép sẽ tiêu tốn lõi nên cần nguồn bổ sung
  if (g.freeSlot() >= 0 && g.rand() < 0.4) {
    const el = EL[Math.floor(g.rand() * 4)];
    cards[Math.min(cards.length, n) - 1] = { id: 'core:' + el, name: EL_INFO[el].name + ' Core', color: EL_INFO[el].color, core: el, text: `A single ${EL_INFO[el].name} core for your bag. Cast it alone or merge it with other cores.`, level: 1, max: 1 };
  }
  return cards;
}

export function rollMajor(g) {
  const p = g.p, cards = [];
  if (g.freeSlot() >= 0) {
    const missing = shuffle(EL.filter(e => !p.owned.has(e)), g.rand), rest = shuffle(EL.filter(e => p.owned.has(e)), g.rand);
    for (const el of [...missing, ...rest].slice(0, 2)) cards.push({ type: 'awaken', el, name: (p.owned.has(el) ? '' : 'Awaken ') + EL_INFO[el].name + ' Core', color: EL_INFO[el].color,
      text: p.owned.has(el) ? `Another ${EL_INFO[el].name} core: merge material or a second copy of its skill.` : `A new element. Cast it alone, or open your bag (Tab) to merge it with your other cores.` });
  }
  cards.push({ type: 'ascend', name: 'Elemental Ascension', color: '#ffd36b', text: 'All skills +20% damage and cost 10% less energy.' });
  return cards;
}
