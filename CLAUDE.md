# Elemental Arena: project standards

Static browser game (HTML + ES modules, no build step). Run `node tests/<name>.mjs` for the headless sim tests. Deploys to Vercel on every push to `main`.

## Pixel art

- **1× native texel density.** Every sprite is authored on a 1× pixel grid (`Grid` in `gfx/pixel.js`) and drawn at `WPP` (3) world px per texel with `imageSmoothingEnabled = false`. Never mix sprites at different texel sizes in the same scene; never smooth-scale pixel art.
- **Outlines:** 1 px dark outline on characters (`#141013` for the player, `#09080f`/`#0c0a12` elsewhere).
- **Camera:** fixed vertical field of view (`VIEW_ROWS` in `main.js`, about 801 world units). Do not tie zoom to window size or `devicePixelRatio`.

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
- Done: 3-hit chain, timed release leaves a delayed cut (max 4), Shift / cube button folds them, mirror dodge, orbiting cubes. Element skills temporarily reuse the Knight kit.
- Not done yet: Illusion resource, swaps, enemy infighting, screen-shatter death cheat, style rank, the two cube ultimates, own 16 skills, portrait / diorama / skins, run save of `p.ax`.
