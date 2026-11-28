# Elemental Arena: project standards

Static browser game (HTML + ES modules, no build step). Run `node tests/<name>.mjs` for the headless sim tests. Deploys to Vercel on every push to `main`.

## Pixel art

- **1× native texel density.** Every sprite is authored on a 1× pixel grid (`Grid` in `gfx/pixel.js`) and drawn at `WPP` (3) world px per texel with `imageSmoothingEnabled = false`. Never mix sprites at different texel sizes in the same scene; never smooth-scale pixel art.
- **Outlines:** 1 px dark outline on characters (`#141013` for the player, `#09080f`/`#0c0a12` elsewhere).
- **Camera:** fixed vertical field of view (`VIEW_ROWS` in `main.js`, about 801 world units). Do not tie zoom to window size or `devicePixelRatio`. The only exception is the player's own Zoom setting (`SET.zoom`, 90–150%), which `fit()` applies.

## Player sprites: chibi standard

- All three heroes and every skin use the **chibi proportions** of the Shop dioramas: big head/helm, compact torso, short legs.
- In-game frames come from `heroGrid()` → `chibiGrid()` (`gfx/rig.js`). `chibiGrid` drops rows 15–17 (legs / robe skirt) and shifts the head and torso down by `CHIBI_DROP` (3) rows, so the feet stay on row 20. Shop dioramas (`gfx/dioramas.js`) call `heroGrid()` directly and apply their own 2× squash.
- New skins and parts are drawn on the normal `heroGrid` layout; the chibi pass applies to them automatically. Don't draw anything important on rows 15–17.
- Animation (`heroPose`): 2-frame idle breathing bob with cape sway, 4-frame hop walk (alternating legs, 1 px bounce mid-stride, dust puffs from `render.js`), forward-lean dash, and swing / draw / cast arm poses.
- **Anchors:** the weapon hand sits at `HAND_Y` (−2 world px from the foot centre, exported from `gfx/skinlines.js`). Every weapon, muzzle and skin-VFX origin uses `p.y + HAND_Y`, never a hard-coded offset. The player hurtbox is `r: 12` (`sim.js`).
- Hero Select cards show the skin's diorama (chibi on its biome pedestal), with `cursor: pointer !important`.

## Performance

- Games run on weak laptop GPUs and phones; the frame budget is mostly **draw calls**. Never draw a shape as many separate `fillRect` cells in a loop: put the cells of one colour into one path (`beginPath` → `rect` × n → `fill`), as `disc`, `line` and `ringPix` do in `gfx/*vfx.js`, `drawSurface` (layer/alpha/colour groups) and the particle loop in `render.js`.
- Never create gradients or canvases per frame. Cache sprites: shadows (`shadow()` in `render.js`), light holes and glows (`gfx/light.js`), Rig frames (white/red tints are built lazily).
- No O(n²) loops over enemies, tufts or props: use a coarse grid (`nearPairs` in `sim.js`, the enemy grid that tufts query in `render.js`).
- Graphics quality: `SET.gfx` is `auto` / `high` / `low`; `R.lowQ` turns off coloured light glows, ambient motes and tuft sway, and caps lights (24) and particles (260). Auto switches to low after 3 s under ~45 FPS.

## Trailer Director

- `trailer.js`: press **T** on the title screen for a 32 s scripted trailer (Esc exits, H hides letterbox + captions). Each shot builds a real `Game` (god mode, infinite energy) driven by a bot; the camera uses `R.camZoom` / `R.camTarget` (renderer) for zooms, boss pans and slow-motion punches.
- `ui === 'trailer'` skips `trackEvents`, so the trailer never touches the player profile. Shots call `keepFight()` so a stage never "clears" mid-shot.

## Controls (hybrid PC + mobile)

- Three modes in `SET.control`: `wasd`, `mouse` (PC) and `touch` (mobile). The PC / Mobile button in the top-right corner (title screen `#ctlbtn`, in-run `#ctlhud`) toggles between touch and the last PC mode; touch devices start in `touch` the first time.
- `mobile.js` only fills the per-frame input object `it` that `main.js` passes to `game.step`; never put gameplay logic there. Touch UI lives in `#touchui` and is shown by `body.touch`.
- Every screen must fit a landscape phone (about 740×360) without scrolling: use the `@media (max-height:500px)` block at the end of the stylesheet.

## UI

- **No emoji anywhere in the UI.** Use the pixel icon set (`gfx/pixelIcons.js`, `<i data-px="name">` or `PXI(name, size)`), adding a new 16×16 icon there when one is missing. The only exception is `showHint()` strings: they may contain the emoji tokens listed in `PX_EMOJI` (`main.js`), which `pxText` swaps for pixel icons before display.
- **No scrollbars on main screens and modals.** Content must fit; only long lists (leaderboard, guide sections) may scroll inside a bounded panel.
- Reuse the existing look: `.box` modals, `.tabs.seg` tabs, `var(--gold)` headings, `'Pixelify Sans'` font, `clip-path: var(--px-step2)` bevelled corners.
- UI text is English; code comments may be Vietnamese.

## Run save (Continue)

- `runsave.js`: `Game.finishReward` calls `g.onStageSave(n)` right before `startStage(n)`; `main.js` stores `snapshotRun(g, n)` in the profile as `PR.P.run`, so it goes to localStorage and syncs to the account (Supabase `saves`) like the rest of the profile. `restoreRun` builds a new `Game` from the same seed and enters stage `n`.
- The save is deleted on death or victory (`showEnd` / `showVictory`) and when a new run starts. Quit to Title from the pause menu keeps it. Training, Test Lab and the trailer never save.
- When you add new run state to `Game` or `p` (a new counter, a Set), add it to `G_KEYS` / `P_KEYS` in `runsave.js` and to `tests/runsave.mjs`.

## Axiom (experimental hero, Test Lab only)

- `CLASSES.AXIOM.lab` hides it from New Run. Combat logic is in `axiom.js`, sprite and poses in `gfx/axiomrig.js`, effects in `gfx/axiomfx.js`; test `tests/axiom.mjs`.
- Done: 3-hit chain, timed release leaves a delayed cut (max 4), Shift / cube button folds them, mirror dodge, orbiting cubes, Rapid Slash (late full release rushes with two spin cuts), Flash Cut (hold a full charge 1 s: `axiomStop` freezes the world and clock, desaturated screen, walk, slash, sheath, then damage), Illusion bar with hold-to-swap, double swap, confusion (`confusedStep` replaces enemy AI) and the Mirror Break death cheat with a screen shatter (one snapshot per use). Own element kit in `kits.js` (`KITS.AXIOM`: Fire = falling cube, Water = glass pane beam, Earth = pillar line, Wind = space fold blink) and 4 cube ultimates in `ults.js` (`axcoffin`, `axprism`, `axrain`, `axfold`). Axiom skills have no forge upgrades yet.
- Not done yet: style rank, the two cube ultimates, forge upgrades, portrait / diorama / skins, run save of `p.ax`.

## Co-op (2 players, lockstep)

- `net.js`: handshake over a Supabase Realtime broadcast channel named by a 4-character room code, then a direct WebRTC DataChannel. `coop.js`: Host / Join / lobby UI and the lockstep loop (`coopTick`): each machine sends its input for frame `f + D` (D = 4); a frame runs only when both inputs are there; every 120 frames both send a state hash and a mismatch ends the session.
- `Game.coop(seed, cfgs)` builds one game with `players[]`; `stepCoop(dt, [in0, in1])` replaces `step`. The sim must stay **deterministic**: no `Math.random`, `Date.now` or DOM reads in sim code, and anything the UI changes in a run must go through `act(name, args)` in `main.js` (the `ACT` table), never a direct call, or the two machines drift apart.
- `g.p` is "the player acting right now". Per-player fields listed in `PER_PLAYER` (`game.js`) live on `p` and are read through `g.<name>`. Things a player creates (`OWNED`: shots, zones, pending, traps, walls, ults, relicFx) remember their owner and run with `g.p` set to it (`ownRun`). Enemies chase the nearest player (`pickTarget`, `byTarget`); hazards and enemy shots hit everyone via `g.forTargets`.
- Scaling per extra player (`COOP`): enemy HP +50%, boss HP +70%, enemy count +30%. A player at 0 HP goes down; standing next to them for 2 s revives at 40% HP; stage clear revives everyone; the run ends when all are down. No gem revive, no run save, no leaderboard submit in co-op.

## Brutal difficulty

- Stored as `difficulty: 'HARD'` (saves and leaderboard keep the old key); the UI says Brutal. `g.brutal` and `BRUTAL` in `game.js`: enemy HP x1.4, damage x1.3, 35% more enemies, more elites, enemy timers run 1.4x faster (`aggro` in `Sim.updateEnemies`), every minion bullet gets a twin. Bosses ignore poise and stagger, attack sooner (shorter wind-up and idle), move faster and chain moves more often.

## Redeem codes, Brutal early access, Brutal seasons

- Server side lives in `supabase/redeem.sql` (the user pastes it into the SQL Editor): `codes` (no RLS policies, so only `redeem_code` can touch it), `redemptions` (one use per account per code), `entitlements` (`brutal`, granted by the developer per nickname with SQL; redeem codes never grant it), `season_config` (epoch + 14 days, seasons roll on automatically), `season_now()`, `season_board(n)` (sum of the best 10 Brutal runs, entitled accounts only, absurd times dropped).
- Client: `online.js` (`redeemCode`, `fetchEntitlements`, `seasonNow`, `seasonBoard`) and `seasonui.js` (Redeem modal for gem codes only, Brutal lock on the New Run difficulty button (always open on localhost), Rewards modal, leaderboard tabs All time / Brutal season / Hall of Fame, season reward claim on sign-in). Season points use the same formula on both sides (`seasonPoints`).
- Rewards: first Brutal win gives the exclusive `brutal` trail + aura; season ranks 1/2/3/top 10 get `champion` / `silver` / `bronze` trails, gems and a badge (`PR.claimSeason`, `SEASON_REWARDS`). The developer email is shown only to the season champion. Trails with `aura` draw a ring under the player (`R.opts.aura`).

## Balance rules

- **Per-skill cooldowns:** `applyMods` sets `cd = def.cd × CD.scale` (`game.js`); `castNow` writes `p.cds[key]`, `tryCast` blocks with a `notReady` event. Free copies (Echo, Wild, forge recasts) ignore cooldowns. The HUD ring is `coolMark` (`mobile.js`) on `.slot` and `.tsk`.
- **Skill cost:** `COST` (flat + perCd × cd, × `tier[single, duo, ult]`); ultimates keep `ultCost` (% of the class energy bar).
- **Healing cap:** every ongoing heal (regen, lifesteal, heal on cast, forge and relic heals, Water resonance) goes through `heal()` in `defense.js` and its `HEAL.perSec` budget (3% max HP per second). Potions, heal drops and stage clear heals bypass it. New heal sources must call `g.heal(n)`, never `p.hp +=`.
- **Boss phase gates:** `hurtEnemy` clamps boss HP at the next phase threshold, so every phase change plays.
- **Elemental Resonance:** casting a three-element ultimate gives a 5 s buff from its three elements (`RESONANCE`, `Game.resonate`, `p.res`): Fire +20% skill damage, Water heal over time and cleanse, Earth shield and control immunity, Wind +20% move speed and 2× cooldown speed. Shown as rings at the feet and a cast text.
- **Elites:** `ELITE` in `env.js` multiplies elite HP, speed and damage (skill damage too); skills only fire within `skillRange × ELITE.reach` and land on the player. Each elite approaches differently through `eliteSteer` (`gameenv.js`, hooked into `Sim.updateEnemies`): Ember Hulk circles to the back, Spore Mother hides behind grunts, Rime Seer kites at 380 px and sidesteps when aimed at, Blade Dancer orbits and dodges shots before blinking in, Inferno Brute runs to a diagonal before charging at where you are going. Test: `tests/elites.mjs`.
- **Ultimate signatures** (`ults.js`, params in the `X(...)` defs of `kits.js`): Meteor Blade execute + kill chain, Monsoon Dance untargetable + kill extension, Mountain Titan shield + control immunity + pull + slowing stomps, Sunder Cyclone pull + stun per foe pulled, Meteor Arrow stun by distance, Pentagram auto-fire + root + mark, Firestorm Barrage slow + shred, Mirage decoys copy basic attacks, Solar Flare blast per foe caught, Abyssal Tide drown mark + energy refund, Comet Trench wall, Thunderhead storm mode (single skills half price + extra bolt). Marks use `e.vuln` / `e.vulnUntil` (bosses capped by `ULTFX.bossVulnCap`). Test: `tests/balance.mjs`.

## Tuning loop (balance)

- `tools/tune/`: `bot.mjs` (shared bot, also used by `tests/run.mjs`; levels `base` / `novice` / `good`, `immortal` mode for boss kill times), `bench.mjs` (every skill vs a fixed single target and a 6-enemy cluster, value = damage per energy compared to the same-tier median of all heroes), `sweep.mjs` (parallel bot runs), `fightbench.mjs` (each skill in an 8 s fight with live enemies: damage + HP saved + control), `bosstrial.mjs` (bot plays to a boss stage with a real build, then fights it; strategies `merge` / `spam`, optional relics, immortal or `--mortal`), `check.mjs` (scores everything against `tuning/targets.json`, prints one SCORE, writes `tuning/report.json`).
- `/tune` (`.claude/skills/tune/SKILL.md`) runs one round: measure, change one knob group by at most 15%, keep only if the score drops and all tests pass, log it in `tuning/log.md`, commit on the local `tune` branch. `/loop /tune` repeats it. The loop never pushes and never edits targets, the tools or the tests.
- Bots are a proxy: read results relatively. Traps and skills that need moving enemies show as "not measurable" in the bench.
