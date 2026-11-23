// Địa hình hệ Đất: Cataclysm đã giảm sức mạnh; mỗi chiêu Đất dựng địa hình theo hình riêng, nhỏ, có khe và hết hạn.
import { Game } from '../game.js';
import { skillDef } from '../kits.js';
let fail = 0; const ok = (c, m) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };

const cata = skillDef('MAGE', 'EARTH', 'EARTH');
ok(cata.name === 'Cataclysm' && cata.dmg === 78 && cata.radius === 115 && cata.stun === 0.6 && !cata.leave, 'Cataclysm: 78 dmg, radius 115, stun 0.6, no lava');

function cast(cls, a, b, frames = 90) {
  const g = new Game(7, cls, { training: true, lab: true }); const sk = skillDef(cls, a, b); g.p.energy = 999;
  g.castNow(sk, g.p.x + 220, g.p.y); for (let i = 0; i < frames; i++) g.step(1 / 60, {});
  return g;
}
const tot = g => g.world.temp.length, types = g => new Set(g.world.temp.map(o => o.type));
const m = cast('MAGE', 'EARTH', 'EARTH', 120);
ok(types(m).has('mound') && !types(m).has('stone'), 'Mage Cataclysm raises a crater rim of mounds (' + tot(m) + ' pieces), no pillars');
const k = cast('KNIGHT', 'EARTH', 'EARTH', 40);
ok(types(k).has('ridge') && tot(k) <= 8, 'Knight Earthbreaker raises a broken ridge (' + tot(k) + ' pieces)');
const r = cast('RANGER', 'EARTH', 'EARTH', 80);
ok(types(r).has('mound'), 'Ranger Arrow Rain raises mounds (' + tot(r) + ')');
const rb = cast('RANGER', 'WIND', 'EARTH', 30);
ok(types(rb).has('ridge') && tot(rb) >= 5 && !rb.walls.length, 'Ranger Stone Tumble raises a curved berm, no straight wall (' + tot(rb) + ')');
ok([...m.world.temp, ...k.world.temp, ...r.world.temp].every(o => o.earth && o.life > 0 && o.r <= 26), 'all earth terrain is small and temporary');
const e = new Game(8, 'MAGE', { training: true, lab: true }); e.world.addTemp('mound', e.p.x + 200, e.p.y, 14, 0.5, 60); for (let i = 0; i < 60; i++) e.step(1 / 60, {});
ok(e.world.temp.length === 0, 'earth terrain expires');
process.exitCode = fail ? 1 : 0;
