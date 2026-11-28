---
name: tune
description: One round of the Elemental Arena balance loop. Measures balance with the headless bots, changes one group of numbers toward the targets in tuning/targets.json, keeps the change only if the score improves and the tests pass, and logs it. Use with /loop /tune (self-paced) or /tune <area>, where area is skills, bosses, brutal or a hero name (KNIGHT, RANGER, MAGE, AXIOM).
---

# /tune: one round of the balance loop

Goal: move the balance score (`tools/tune/check.mjs`, lower is better, 0 means every metric is on target) down one safe step per round, without breaking anything. Talk to the user in casual Vietnamese; they often read from a phone.

## Rules (never break these)

- **Never push.** Never `git push`, never merge into `main`. Commit only on the local branch `tune`.
- **Leave Axiom alone.** Only the heroes in `targets.heroes` (Knight, Ranger, Mage) are tuned; never change Axiom numbers (`KITS.AXIOM`, `ax*` ultimates, `axiom.js`).
- **Never edit the yardstick.** Do not change `tuning/targets.json`, `tools/tune/*` or the tests to make a number pass. If a target looks wrong, stop and ask the user.
- **Numbers only.** Change balance values: skill `dmg` / `cd` / `radius` / counts in `kits.js`; ultimate signature numbers in the `X(...)` params in `kits.js` (`exec`, `chain`, `titanShield`, `pullR`, `markAmt`, `shred`, `copy`, `packBonus`, `drown`, `refund`, `wallT`, `stormRefund`…); the rule constants in `game.js` (`CD.scale`, `COST.*`, `RESONANCE.*`, `ULTFX.*`, `BRUTAL`, `COOP`) and `defense.js` (`HEAL.perSec`, `HEAL.burst`); boss stats (`hp`, `poise`) in `boss.js`; `CLASSES` / `ENEMIES` in `sim.js`; economy in `profile.js` / `forge.js`. If a fix needs new mechanics or behaviour, stop and report it as a design question.
- **One knob group per round, at most ±15% per value.** A knob group is one skill, one boss, one hero's base stats, or one `BRUTAL` entry.
- Keep the sim deterministic (no `Math.random`, `Date.now`).

## Round

1. **Setup (first round only).** In `D:\ElementalArena\elemental-arena`, if the current branch is not `tune`: use `git switch -c tune` (or `git switch tune` if it exists), carrying the working tree. Commit any uncommitted work there as "tune: baseline" so every later round can be reverted cleanly.
2. **Measure.** `node tools/tune/check.mjs` (about 2 minutes; narrow with `skills`, `bosses`, `run`, or a hero name). Read the SCORE line and the OFF rows. Note the score in your head as `before`.
3. **Pick** the off-target row with the highest `+score` that a single knob group can fix. Skip rows listed under "not measurable". Prefer the root cause: a hero whose boss time is slow because one skill is weak means fixing that skill, not the boss.
4. **Find the knob.** Read the definition (e.g. `KITS.<HERO>['A>B']` in `kits.js`, `ULTS` / `U.<id>` in `ults.js`, `BOSSES` in `boss.js`). Decide the smallest change that moves the metric toward its band; scale damage for a value ratio (`value` is damage per energy, so ×1.2 dmg ≈ ×1.2 ratio; cost changes act inversely).
5. **Edit** with the Edit tool. One knob group.
6. **Re-measure** with the same `check.mjs` arguments → `after`. The run metrics are chaotic (one number can move a whole run), so for a skill change also confirm the skill's own row moved the right way.
7. **Test.** Run every `node tests/<name>.mjs` (skip `surface.mjs`, known flaky). All must pass.
8. **Keep or revert.** Keep only if `after < before - 0.05` and the tests pass: `git commit -am "tune: <knob> <old> -> <new> (score <before> -> <after>)"` on `tune`. Otherwise `git checkout -- <files>` to undo the edit.
9. **Log** one line in `tuning/log.md` (also for reverted tries), and commit it with the kept change or alone:
   `| date | knob | old → new | target row | score before → after | kept/reverted |`
10. **Report** in 2–3 Vietnamese sentences: what changed, score before → after, what is worst now.

## When to stop the loop

Stop (call ScheduleWakeup with `stop: true` when running under /loop) and tell the user when:
- the score is 0, or every remaining OFF row is "not measurable" or needs design work;
- 3 rounds in a row were reverted (no improvement);
- the best fix needs a mechanic change, a new file, or touching anything outside the numbers above;
- tests fail in a way that is not caused by your number change.

The final report lists every kept change (from `tuning/log.md`), the score from the first round to now, and asks whether to merge `tune` into `main` and push. Only the user says push.

## Notes

- The bots are a proxy. The good bot dies around stage 5–9; boss times come from an immortal bot. Read results as relative (hero vs hero, skill vs skill, Normal vs Brutal), not as how a human feels.
- `node tools/tune/bench.mjs [HERO]` prints every skill's raw numbers; `node tools/tune/sweep.mjs 3 [HERO] [--normal|--brutal]` prints per-hero run results.
- `tuning/report.json` holds the full last report (all items, groups, skill rows, boss trials).
- `node tools/tune/fightbench.mjs [HERO]` prints each skill's fight value (damage + HP saved + control); `node tools/tune/bosstrial.mjs [stages] [--spam|--merge] [--relics] [--mortal]` prints boss fights per strategy.
- Prefer the rule constants for system-wide rows (merge value, boss floor, stagger, strategy) and per-skill numbers for single skill rows.
