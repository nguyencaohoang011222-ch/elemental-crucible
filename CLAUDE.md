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

## UI

- **No emoji anywhere in the UI.** Use the pixel icon set (`gfx/pixelIcons.js`, `<i data-px="name">` or `PXI(name, size)`), adding a new 16×16 icon there when one is missing. The only exception is `showHint()` strings: they may contain the emoji tokens listed in `PX_EMOJI` (`main.js`), which `pxText` swaps for pixel icons before display.
- **No scrollbars on main screens and modals.** Content must fit; only long lists (leaderboard, guide sections) may scroll inside a bounded panel.
- Reuse the existing look: `.box` modals, `.tabs.seg` tabs, `var(--gold)` headings, `'Pixelify Sans'` font, `clip-path: var(--px-step2)` bevelled corners.
- UI text is English; code comments may be Vietnamese.
