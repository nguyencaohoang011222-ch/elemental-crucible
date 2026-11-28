# Balance loop log

One line per `/tune` round (kept or reverted). Score = `node tools/tune/check.mjs` (lower is better, 0 = all on target).

| date | knob | old → new | target row | score before → after | result |
|---|---|---|---|---|---|
| 2026-11-28 | AXIOM Prism Wall `dmg` (kits.js) | 36 → 41 | AXIOM T2 Prism Wall 0.28 → 0.31 | 13.102 → 13.051 | kept (trial round) |
| 2026-11-28 | AXIOM Prism Wall `dmg` (kits.js) | 41 → 36 | — | — | undone: Axiom is left out of tuning (user) |
| 2026-11-28 | `BURN.mob` (game.js, was a literal 5) | 5 → 4.3 | KNIGHT Flame Cleave 9.8 → 9.27, MAGE Inferno Orb 4.63 → 4.5 | 48.051 → 45.708 | kept. Tried first: Flame Cleave dmg −15% and burn time −13%, no effect: fire value comes from the flat burn tick and grass fire, not the skill numbers |
| 2026-11-28 | KNIGHT Flame Cleave `cd` tier (kits.js; sets cost and cooldown) | 4 → 4.6 | Flame Cleave 9.27 → 8.56 | 45.708 → 44.924 | kept |
