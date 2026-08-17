# PLAN_1.md — the brief in `PROMPT_1.md`

Three things, in this order: a loading page, the cube-pet NPCs, and touch
control. The order is not the order they were asked in — the loader goes first
because every later phase reports progress through it, and touch goes last
because it reaches into `player.js`, `hud.js` and `index.html` and wants
something finished to be tested against.

---

## What constrains all of it

- **Everything is authored flat and baked once.** `buildWorld()` ends with
  `bakeToPlanet(root)`, which folds geometry into world space and clears
  container transforms. Anything that moves must either carry
  `userData.planetRigid` or — like `ebike.js` — be added to `scene` *after* the
  bake and re-seated every frame from `basisAt`/`positionAt`. The pets are the
  second kind.
- **The scene is draw-call bound**: ~3050 calls at the crossing, ~20 ms. That is
  the number the pet budget comes out of, and the reason they get no inverted
  hull.
- **All materials go through `cel()` / `flat()`.** `CLAUDE_0.md` already records
  the agreed `.glb` route: `public/models/`, `GLTFLoader`, then walk the loaded
  scene and replace every material with `cel()`, preserving base colour and map.
  An untouched PBR asset renders as a photograph pasted onto a painting.
- **"No people anywhere" is a hard constraint** of this world, and it stands.
  Cube *animals* do not breach it — the environment still carries the narrative,
  and nothing here is a person, on a poster or otherwise.
- **`main.js` is the only caller of `buildWorld`**, which is what makes the
  loader refactor cheap.

---

## 1. Loading page

The problem is not the download, it is that `buildWorld()` is one long
synchronous call. A CSS-animated loader put in front of it freezes solid for the
whole build. So the build has to yield.

1. **A static splash in `index.html`** — in the menu's own visual language
   (cream paper, red accent, the crossing mark). It lives in the HTML, so it
   paints before the ~1 MB three.js module is even parsed, which is most of the
   perceived wait on a phone.
2. **`buildWorld` becomes `async`** and takes an `onProgress(fraction, label)`.
   Phases yield to the browser between each other: base layers → houses → each
   entry of the `districts` array → planting → `bakeToPlanet` → shader warm-up.
   The district array is already a list, so this is a loop with a label per
   entry, and the labels are the district names — 桜並木, 商店街, ひばり湖 — so the
   bar reads as part of the place rather than as a spinner.
3. **Shader warm-up** with `renderer.compileAsync(scene, camera)` inside the
   loader, which is where the first-seconds stutter currently is.
4. **`main.js` restructures** into an async `main()`: renderer, scene and lights
   stay at the top; `world`, `player`, `hud`, `ebike`, `pipeline`, the frame loop
   and `window.__scene` all move after the await. Assets — the ten models, the
   music — load as their own early phase.
5. The splash fades into the existing start menu. Music still waits for a
   gesture.

**The trap:** `window.__scene` and the dev `__shot` helper must be assigned
*after* the await, or the entire verification workflow in `CLAUDE_0.md` breaks.

---

## 2. Cube-pet NPCs

### The assets

`kenney_cube-pets_1.0/` is `.gitignore`d, and it stays that way: the source kit
does not belong in the repository. Ten species are copied into
`public/models/pets/`, and the GLBs are **not self-contained** — they reference
`Textures/colormap.png` by URI, so that file goes at the same relative path
under it. Kenney's CC0 licence ships beside them and is credited in the README.

Ten, ~1.4 MB, chosen to be plausible in a Japanese suburb rather than to fill a
zoo:

| model | | model | |
|---|---|---|---|
| `animal-cat` | ねこ | `animal-monkey` | さる |
| `animal-dog` | いぬ | `animal-chick` | ひよこ |
| `animal-bunny` | うさぎ | `animal-crab` | かに |
| `animal-fox` | きつね | `animal-caterpillar` | いもむし |
| `animal-deer` | しか | `animal-hog` | いのしし |

What the models actually are, checked rather than assumed: Y-up, feet at y = 0,
1.25–1.83 units tall, **facing +z**. The player's forward is −z, so a pet at
heading `h` draws at `ry = h + π`. No skins — animation is per-node TRS, so a
plain `Object3D.clone()` plus an `AnimationMixer` works and `SkeletonUtils` is
not needed. Every one of the ten carries the same eight clips: `static, idle,
walk, run, eat, dance, gesture-positive, gesture-negative`. `walk` is 0.5 s
long, so the mixer's timescale is driven by ground speed.

Scale is authored as a **target height in metres** and divided by the model's
own measured height, not as a magic multiplier — a cat at 0.42 m and a deer at
1.25 m read correctly against a 1.62 m eye.

### The module

`src/world/pets.js`, a runtime module in the `ebike.js` mould: built in
`main.js` after `buildWorld` returns, added to `scene` (never to `world.root`,
which is baked), `pets.update(dt)` in the frame loop, and exposed on
`window.__scene`.

- **One shared `cel({ map: colormap })` for every pet.** The colormap is a
  palette atlas — the UVs index swatches, so the texture *is* the colour and
  cannot be dropped. It is loaded once and reused, so all ten species share one
  program. The unused `TANGENT` attribute is deleted on load.
- **5–7 meshes per pet**, which cannot be merged because they are animated
  separately. At twelve pets that is ~75 calls against ~3000. **No
  `hullOutline`** — it would double that, and the screen-space ink pass already
  draws them. Checked against a frame before it is settled.
- `shadowify()`. Mixer updates and `visible` are gated on distance from the
  player (~50 m / ~70 m), so pets on the far side of the planet cost nothing.

### Moving in curves, looking around

A steering model, not a waypoint list — waypoints give polylines, and the brief
asks for curves.

- **States**: `WANDER → PAUSE → (rarely) EAT / DANCE → SCURRY`.
- **WANDER** integrates a *heading rate*, not a heading: `ω` chases a target
  resampled every 1.5–4 s from the seeded RNG and smoothed. That is what makes
  the path an arc.
- **PAUSE** plays `idle` and adds a ±0.6 rad body-yaw sway — the looking around.
- **SCURRY** plays `run` when the player closes inside ~2.5 m, breaks away a few
  metres, then settles.
- **Ground**: `world.heightAt(x, z, ownFeet)` smoothed the way the player
  smooths it, and a two-sample ground rake like `ebike.js`'s `groundPitch`.
- **Obstacles**: a `roomAt()` probe forward and at ±35°, ~1.2 m out; steer to
  whichever is free, turn hard if none is. Any step that would move the ground
  more than 0.5 m is refused, so nothing walks off a retaining wall or into the
  channel.
- `wrapX` on x, `wrapDelta` for player distance, and a soft return force toward
  a home anchor (radius ~16 m) so nothing wanders to the far side of the planet.
- **Anchors** are seeded from the documented `__shot` camera positions in
  `CLAUDE_0.md` — those are known-walkable ground, which beats inventing
  coordinates — and each one is validated at startup by the same free-spot
  search `ebike.summon()` uses.

### Interaction

Each pet carries an invisible hitbox child and one `world.interactables` entry,
exactly like the cat on the garden wall in `world/index.js`: `E` plays
`gesture-positive` and the pet turns to face the player. Registered once,
travelling with the group, so the collider and interactable counts are stable —
which is the check `CLAUDE_0.md` prescribes for anything that touches those two
lists.

---

## 3. Touch control

Pointer lock does not exist on a phone, and `player.locked` gates every input in
the game — that single fact is why it is currently unplayable there.

- **An input layer on `Player`**: `move {x, y}`, `look {dx, dy}`, `run`, and an
  edge-triggered `interact`, filled either by the keyboard as today or by touch.
  `locked` becomes `active = locked || touch`, and `main.js`'s
  `player.locked ? player.pick(…)` follows it.
- **Widgets** in `hud.js` with their CSS in `index.html`: a floating left-thumb
  stick that appears where the thumb lands (past ~0.75 deflection is a run),
  right-half drag-to-look through pointer events keyed by `pointerId` so both
  work at once, and a button column — **E** (labelled with whatever is hovered),
  **V** e-bike, **P** planet, **M** music, **☰** pause. Shown on
  `matchMedia('(pointer: coarse)')`, with a fallback that switches them on at the
  first `touchstart` in case the query lies.
- **Start flow**: on touch `hud.onStart` skips `requestPointerLock`, engages
  touch mode and asks for fullscreen where it is offered. ☰ reopens the existing
  pause overlay.
- **Page plumbing**: `viewport-fit=cover`, no user scaling, `touch-action: none`,
  `overscroll-behavior: none`, no long-press menu, `100dvh` with a
  `visualViewport` handler so the address bar leaves no dead strip, and safe-area
  insets under the controls.
- **Performance** is the real risk: 3000 draw calls is a lot for a phone. The
  levers, in order of value — cap `Pipeline.pixelBudget` and the resolution
  scale on coarse pointers, shadow map 2048 → 1024, cascade ±34 → ±22 m, and a
  Low/High toggle in the pause menu. The notes are explicit that halving the
  internal resolution changed *nothing* on desktop, so this is measured on a real
  device and reported honestly rather than assumed.

---

## Verification

The repo's own workflow, which does not change: `npm run dev`, `window.__shot()`
from the browser at the documented camera positions before and after, and
`world.update(1/60)` stepped by hand because rAF never fires in that pane. The
pets are stepped the way the e-bike is — set the pose, step it, then shoot with
an empty options object so `__shot` does not move the player out from under it.

Three counts to check at the end: `world.colliders` and `world.interactables`
return to their baseline after the pets are built and the e-bike is put away,
and the draw call count at the crossing has not moved by more than the ~75 the
pets are allowed.

---

## What actually shipped, and where it differs

All three went in. Six things changed on contact with the world, and each of
them is a decision rather than a detail:

1. **Flee is about being rushed, not about distance.** The plan said "player
   within ~2.5 m". Built that way it is unplayable: the interaction ray reaches
   3 m, so there was half a metre in which an animal was both visible and still
   there, and every approach ended with its back end going round a corner. The
   trigger is now the player's *speed* as well as their distance — walk up
   slowly and a cat lets you get to arm's length, run at it and it is gone.
   Which is what the title card has always said to do.
2. **The greeting is looped, not a one-shot.** Every clip in the Kenney kit is
   cut short for a game seen from above: `gesture-positive` is a quarter of a
   second, which as a one-shot is over before the prompt fades and reads as a
   twitch. It runs for 2.2 s now.
3. **The hitboxes are bigger than the animals.** A caterpillar is 0.2 m tall;
   at 3 m the angle to the top of a true-sized box is under four degrees. The
   boxes have a 0.7 × 0.8 m floor under them, which is invisible and makes them
   findable.
4. **The stick's run threshold is 0.9, not 0.75.** A thumb at the edge of the
   ring is most people's resting position, so a lower threshold makes the game
   a run with a walk available to the careful. Backwards, for this town.
5. **A model that will not load is one absent animal.** `Promise.all` over ten
   fetches rejects on the first 404 and takes the whole build down with it. It
   is per-model now, and the world opens with nine.
6. **No `hullOutline`** — confirmed rather than assumed. Measured cost of the
   twelve animals in the colour pass: **68 draw calls**, against a budget of
   ~75. A hull would have doubled it, and the screen-space ink pass already
   draws them cleanly (see `.shots/pets-close.jpg`).

Verified headlessly through Chrome over CDP, since the Browser pane still does
not composite: the wander tracked over 120 simulated seconds across all twelve
animals, the greeting, the crosshair pick, the keyboard paths (walk 2.55, run
5.10, diagonal 2.55, stop 0) and the analogue stick (half deflection = 1.27),
and the whole touch path on an emulated 390×844 phone with real
`Input.dispatchTouchEvent` touches — start tap, stick, simultaneous look drag,
run threshold, `E`, pause and resume.

**Not done, and deliberately:** the Low/High quality toggle in the pause menu.
The phone profile is applied automatically off `(pointer: coarse)` — 1024
shadow map, ±24 m cascade, 1.25 render scale — but none of it has been measured
on a real handset, and a toggle whose two positions nobody has timed is a
guess with a control on it. That measurement is the next thing this needs.
