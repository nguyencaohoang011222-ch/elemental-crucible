# Balance loop log

One line per `/tune` round (kept or reverted). Score = `node tools/tune/check.mjs` (lower is better, 0 = all on target).

| date | knob | old → new | target row | score before → after | result |
|---|---|---|---|---|---|
| 2026-11-28 | AXIOM Prism Wall `dmg` (kits.js) | 36 → 41 | AXIOM T2 Prism Wall 0.28 → 0.31 | 13.102 → 13.051 | kept (trial round) |
| 2026-11-28 | AXIOM Prism Wall `dmg` (kits.js) | 41 → 36 | — | — | undone: Axiom is left out of tuning (user) |
