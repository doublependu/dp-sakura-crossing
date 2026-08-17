# PLAN_2.md — the brief in `PROMPT_2.md`

Seven items, and they are not seven independent jobs. Items 1–3 are one piece
of work (the whole kit, sized, spawned where you start), item 4 is built on top
of it and is the only genuinely new system in the brief, and items 5–7 are
self-contained. The order below is jump first — it is small, it touches
`player.js` before anything else does, and it is the one thing that is worth
having under your feet while testing everything else — then the menagerie, then
follow, then the two bits of signage.

---

## What constrains all of it

Nothing here has changed since `PLAN_1.md`, and every one of these has already
cost something once:

- **The world is authored flat and baked once.** `buildWorld()` ends with
  `bakeToPlanet(root)`, which folds geometry into world space and clears
  container transforms. Anything that moves is added to `scene` *after* the
  build and re-seated every frame from `basisAt`/`positionAt` — that is what
  `ebike.js` and `pets.js` both do. The **sign** is the opposite case: it never
  moves, so it goes inside `buildWorld` *before* the bake, like every other prop.
- **The scene is draw-call bound.** ~3050 calls at the crossing. Twelve animals
  measured **68**. This brief roughly triples the animal count and asks for them
  to be concentrated where the player starts, which is the same place the draw
  call count is already worst. That is the single number to watch, and §2.6 is
  about nothing else.
- **All materials go through `cel()` / `flat()`.** An untouched glTF renders as
  a photograph pasted onto a painting.
- **Models are Y-up, feet at y = 0, facing +z**, node-animated with no skins
  (`Object3D.clone()` is enough), and every one of the 24 carries the same eight
  clips: `static, idle, walk, run, eat, dance, gesture-positive,
  gesture-negative`. Confirmed again against the GLB JSON for this plan.
- **Scale is a target height in metres**, divided by the model's own measured
  height. Item 2 of the brief is already how the file works; what it needs is
  the table extended to the other thirteen species.
- **`kenney_cube-pets_1.0/` stays `.gitignore`d**; the shipped copies live in
  `public/models/pets/` with `Textures/colormap.png` beside them and Kenney's
  CC0 licence next to it.
- **`world.interactables` and `world.colliders` are the two lists to keep
  honest.** Both counts are part of the verification workflow in `CLAUDE_0.md`.
  This brief moves both baselines on purpose; §5 says by how much.
- **`TOTAL = 45` in `world/index.js`** is the number of `step()` calls. Add a
  phase and it has to move, and the symptom of forgetting is a bar that stops at
  0.93.

---

## 1. Jump  (brief item 5)

`player.js` says "deliberately no jump" at the top of the file, and that comment
is the first thing to change, because the reason it said that was a walking-sim
argument, not a technical one.

### The vertical

Today `pos.y` is a pure follower: `pos.y += (targetY - pos.y) * (1 - exp(-18
dt))`. A jump is a second regime, not a modification of that one.

- `vy`, `airborne`, `GRAVITY = 16`, `JUMP_V = 5.0` — apex **0.78 m**, air time
  **0.63 s**. High enough to be worth pressing over a kerb and a canal coping,
  low enough to reach nothing that was not meant to be reached.
- **Airborne**: `vy -= G·dt`, `pos.y += vy·dt`; land when `vy <= 0 &&
  pos.y <= heightAt(x, z, pos.y)`. **Grounded**: exactly the exponential ease it
  has always been, untouched.
- **Coyote time 0.12 s** and a **0.15 s jump buffer**. Both are four lines and
  both are the difference between a jump that feels made and one that feels
  sampled.
- No bob while airborne; a 0.06 m knee dip over 0.15 s on landing, eased out
  through the existing `bob` term.

### The decision worth writing down: jumping does not change collision

`_resolve()` skips a collider whose `top <= feetY + STEP`, and `feetY` is the
*ground* height at the player's position. The tempting change is to pass
`pos.y` instead while airborne, so a jump clears a low wall. **Don't.** Garden
walls have colliders and no `platform`, so clearing one drops the player inside
the garden — or inside the house, or under the world — and there are hundreds of
them across forty modules. Jump changes only the vertical: you go up, the town
stays where it was.

The one asymmetry, which is safe in the other direction: `heightAt` is already
called with `pos.y` as `fromY`, and a platform is eligible within 0.55 m of it.
So a jump *does* let you get onto a low deck, a bridge-head step or a verge pad
you cannot walk up onto — because a platform is by definition a surface somebody
built to stand on. That is a feature and it comes for free.

### The wiring

- `Space` on keydown when `active && !ride`. `Space` is already in the
  `preventDefault` list. No jump on the e-bike — a scooter that hops is a
  different game.
- **Touch**: a `J` button in `touch-buttons`, between `V` and `E` so `E` stays
  outermost under the thumb, dispatching `onAction('jump')`; `main.js` gets
  `act.jump()`. Fires on `pointerdown` like every other button there.
- **HUD**: `<b>Space</b> jump` into the hint line and the `keys-only` control
  strip, `<b>J</b> Jump` into the `touch-only` strip.
- Pets are unaffected: the flee trigger reads `player.vel.x/z`, which a jump
  does not touch.

---

## 2. The whole menagerie  (brief items 1, 2, 3)

### 2.1 Which models

The kit has 24. **23 ship** — everything except `animal-fish`, which is the one
model in the kit that is neither land-based nor air-based and would need a third
locomotion mode and a water surface to swim in. (There *is* a lake. It is a
worthwhile thing and it is not this brief; noted at the bottom.)

Thirteen new files, ~1.9 MB, copied from `kenney_cube-pets_1.0/Models/GLB
format/` into `public/models/pets/`: `beaver, bee, cow, elephant, giraffe,
koala, lion, panda, parrot, penguin, pig, polar, tiger`. Total on disk goes
1.4 MB → ~3.3 MB, which is what §2.4 exists for.

**Air-based: `bee` and `parrot`.** Everything else walks, penguins and crabs
included.

### 2.2 The size ladder  (item 2)

`SPECIES.height` is already a real height in metres, so item 2 is a table, not a
mechanism. The ladder, smallest to largest — the bee at 0.18 m is the floor the
brief names, and the giraffe is nineteen times it:

| | m | | m | | m |
|---|---|---|---|---|---|
| bee | 0.18 | penguin | 0.62 | tiger | 1.05 |
| caterpillar | 0.20 | koala | 0.66 | lion | 1.10 |
| crab | 0.22 | hog | 0.72 | deer | 1.24 |
| chick | 0.24 | monkey | 0.76 | polar | 1.30 |
| parrot | 0.34 | pig | 0.78 | panda | 1.35 |
| bunny | 0.40 | | | cow | 1.45 |
| cat | 0.44 | | | elephant | 2.70 |
| beaver | 0.55 | | | giraffe | 3.40 |
| fox | 0.54 | dog | 0.58 | | |

**Three things stop being constants once the spread is this wide**, and all
three are currently module-level in `pets.js` because twelve animals within a
factor of six did not need them to be anything else:

- `BODY_R = 0.3` — an elephant with a 0.3 m body radius walks through fences.
  Derive it from the measured bounding box: `max(0.22, 0.42 · footprintWidth)`.
- `MAX_RISE = 0.42` — a caterpillar should not climb a kerb it is twice as tall
  as, and an elephant should not be stopped by one. `clamp(0.55·height, 0.10,
  0.65)`.
- `PROBE = 0.95` — must lead the body: `bodyR + 0.65`.

`AXLE` (the ground-rake sample separation) should scale with length too, or a
giraffe's pitch is computed off two points inside its own footprint.

### 2.3 Where they live  (item 3)

Item 3 says spawn them near the player. The player starts at
**(1.85, 0, 13.6)**, looking down the street at the crossing. The current
`HOMES` table is a tour of the whole map, which is why the opening minute can
have no animal in it at all.

**A near ring and a far scatter.**

- **Near ring — 14 animals inside 8–34 m of spawn**, all on ground the
  documented camera positions already prove walkable: the back alley at
  (13.5, 16.6), the lineside allotment at (-9.6, 4.9), the rest corner at
  (12.9, 9.6), the shotengai mouth at (6.5, 15.1), 児童公園 at (33, 28), the
  shop forecourt, the far kerb past the crossing. Two of these are within
  fifteen metres of the spawn point and one is in the opening frame. This is
  also the set the loader fetches eagerly (§2.4).
- **Far scatter — the rest**, one or two per district, placed at the landmark
  anchors of §3 rather than beside them. That is deliberate: an animal that
  lives *at* a landmark is the thing that makes "follow" pay out.
- **The big four (`elephant, giraffe, lion, tiger`) and the near-big
  (`cow, panda, polar`) never go in the town.** Not for tone — for geometry: a
  2.7 m body with a 1.1 m radius cannot get through a 2.1 m back alley, and the
  obstacle probe will jam it against a wall for the rest of the session. They
  go where there is room: 校庭 (39, -45), 湖畔公園 (133, -74), the 林間広場 at
  (-14, -122), the hill meadows, the 堰堤. Which is also the honest answer to
  the tone question — see the flag at the bottom of this plan.

**Multiple instances** (item 1, third bullet) come from a `count` on the spawn
entry, scattered around the anchor by the existing `findSpot` ring search with
a per-instance seed: `chick ×4` (a brood behind the school), `bee ×5`,
`crab ×3` (the canal bank), `cat ×3`, `bunny ×2`, `dog ×2`, `monkey ×2`,
`penguin ×2`. **Target total ≈ 34 animals from 23 species.**

### 2.4 The lazy loader  (item 1, first bullet)

Yes, it makes sense — 3.3 MB in front of a loading bar on a phone is fifteen
seconds of nothing on a bad connection, and most of those animals are on the
far side of the planet.

`loadPetModels()` splits into a small module with three parts:

1. **The atlas, loaded on its own, first.** Today the shared `cel()` material is
   built from whichever GLB happened to load first, which cannot work when
   models arrive one at a time hours apart. `TextureLoader` fetches
   `models/pets/Textures/colormap.png` once and the material exists before any
   model does. The settings have to match what `GLTFLoader` would have produced
   or every animal is upside down and washed out: **`flipY = false`,
   `colorSpace = SRGBColorSpace`, `wrapS/T = RepeatWrapping`,
   `minFilter = LinearMipmapLinearFilter`** (the GLB sampler says 9987; there is
   no `magFilter`, so the default stands).
2. **`species(key)` → a memoised promise** of a prepared prototype: tangents
   deleted, shared material assigned, bounding box measured, `scale`, `hit`,
   `bodyR`, `rise` derived. Per-model failure stays per-model — one 404 is one
   absent animal, which is rule 5 of what shipped last time and is now thirteen
   times more likely to matter.
3. **Three ways a model gets asked for.**
   - **Eagerly, during boot**: only the near-ring species (7 files, ~1.0 MB).
     The bar keeps meaning what it says.
   - **On idle, after `boot.done()`**: the rest drip in two at a time through
     `requestIdleCallback` (`setTimeout` fallback), so a session that never
     leaves the crossing still ends up with a fully populated world within a
     minute, at zero cost to the opening.
   - **On demand**: the player comes within ~140 m of an unpopulated anchor and
     it jumps the queue.

**Materialisation rule**: a pet is only added to the group when the player is
more than 30 m from its spot. Otherwise it waits. An animal that fades in six
metres in front of you is worse than one that is not there yet.

### 2.5 Flying  (item 1, "air-based")

A bee and a parrot are the same steering model with three changes, not a second
brain:

- `y = ground + hover`, where `hover` is 1.6–3.2 m sampled per instance, plus a
  slow sine bob (~0.25 m, ~0.7 Hz) and a bank into the turn (`roll = -clamp(ω ·
  0.35)`), which is what makes a turn read as flight rather than as sliding.
- **Obstacle probes only test colliders that reach the flight altitude** —
  `c.top > y - 0.3`. That is the existing `free()` signature doing its job; a
  bee should pass over a garden wall and around a house, and it will.
- No ground rake, no `MAX_RISE`, and the `walk` clip is used at a high timescale
  for the wingbeat (`run` for the parrot). They land for `graze`/`greet` by
  easing `hover` to 0.1 m for the duration — cheap, and it is the difference
  between a bee and a hovering box.

### 2.6 The draw-call budget

Twelve animals cost 68 calls. Thirty-four, concentrated near the spawn, is the
one part of this brief that can measurably hurt. Three levers, applied before
measuring rather than after:

- **Two rings instead of one.** `FAR = 74` becomes `DRAW = 62` (visibility) and
  `ANIM = 44` (mixer + `think`). Between the two an animal is drawn and frozen,
  which is invisible at 50 m and free.
- **A nearest-N cap**: sort by distance once every ~0.5 s, draw at most 22.
  Above that the extra animals are the ones you cannot pick out anyway.
- **No `hullOutline`**, still — confirmed last time, and the screen-space ink
  pass draws them cleanly.

**Budget: ≤ 130 extra draw calls at the crossing with the near ring populated.**
Measured with `renderer.info.render.calls` before and after, and reported as a
number, not as an impression. If it lands over, the near ring loses two animals,
not the ring.

---

## 3. Follow, landmarks, and the collection  (brief item 4)

This is the new system. Everything above is an extension of something that
already works; this is not.

### 3.1 Landmarks

There is no such concept in the world today. `src/world/landmarks.js`: a table
of ~24 entries `{ id, jp, en, x, z, r }` where `r` is an arrival radius of
6–10 m. Every coordinate comes from the documented `__shot` positions in
`CLAUDE_0.md` — 桜踏切, 桜守神社, さくら坂商店街, 用水路, 跨線橋, ひばり台図書館,
県立ひばり台高等学校, ひばり湖畔公園, 見晴らし桟橋, 湯の坂の足湯, 夏まつりの広場,
こばと橋南詰, 東山トンネル, 児童公園, 見晴台 … — for the same reason the pet
homes did: those are places somebody has already stood and photographed.

### 3.2 Getting there: a waypoint graph, because steering alone will not

The pets steer reactively. Reactive steering crosses a suburban town about as
well as you would expect: it will find the first wall, slide along it, and stop.
A pet that has promised to take you somewhere and instead vibrates against a
fence is worse than no feature.

- **Nodes**: the 24 landmarks plus ~15 junction nodes (the crossing, both bridge
  heads, the three T junctions, the hill road, the lake road, the school gate).
  Hand-placed, ~40 total.
- **Edges, derived rather than authored**: every pair under 55 m is tested by
  sampling the straight line every 1 m and requiring `free(x, z, 0.55, y)` and a
  step-to-step height change ≤ 0.35 m. Built once at startup. ~800 candidate
  pairs × ~50 samples.
- **Which needs a collider grid first.** `free()` is a linear scan of
  `world.colliders`, and after forty district builders that list is long. 40 000
  probes × the whole list is not a startup cost anybody will accept. Bucket the
  colliders into a 4 m grid (keyed on wrapped x) once after the build, in a
  small module, and have both the graph builder and the pets' own per-frame
  probes go through it. **This is a prerequisite, not an optimisation** — and it
  is worth doing anyway: thirty-four animals doing three probes a frame each is
  a hundred scans of that list per frame today. Measure `world.colliders.length`
  first and put the number in the commit message.
- **A\*** over ~40 nodes is nothing. Recompute on demand only.

In DEV, assert at startup that every landmark is in the same connected component
as the spawn node and `console.warn` the ones that are not. An unreachable
landmark is a promise the game cannot keep, and it should say so at build time
rather than to the player thirty metres into a walk.

### 3.3 The interaction menu

Today `E` fires `interactable.action()`. The brief needs a choice, so:

- An interactable may carry `options: [{ key, label, action }]` instead of a
  bare `action`. `main.js`'s `player.onInteract` opens a **choice card** when it
  sees one, and behaves exactly as it does today when it does not — the cat on
  the garden wall is untouched.
- **The card** is a small two-row panel under the crosshair, in the menu's paper
  and red. `1`/`2` pick directly, `W`/`S` move the highlight, `E` confirms,
  `Esc` or looking away closes it, and it times out after 5 s. It is
  **non-modal** — the player keeps walking, which matters because the pet is
  liable to wander off mid-decision, and a modal card that pins you in place
  while a cat leaves is a bad joke.
- **On touch the rows are tappable**, which is the whole reason the card is DOM
  and not drawn: a pointer-locked desktop cannot click it and a phone cannot
  press `1`.
- The two options: `hello` (what it does today) and `follow`.

### 3.4 The sequence

**`follow` selected** → the pet picks a target: the **nearest undiscovered**
landmark reachable through the graph, preferring 30–90 m away (close enough to
be a walk, far enough to be a journey). All discovered? It picks the farthest
one and the payout is the companion rather than the toast.

**LEAD**: the pet paths node to node, using the existing steering to seek the
next node and the existing probes to avoid what is between them; advances when
within 2 m. Three things make it readable as *leading* rather than as leaving:

- It walks at **1.35× its own speed** but throttles to keep the player within
  12 m.
- Past 14 m it **stops, turns, and idles** — the "come on" beat.
- Past 45 m, or 30 s without the gap closing, it gives up, plays
  `gesture-negative`, and walks home. Losing your guide by dawdling is fair.

**Stuck detection**: net progress < 0.6 m over 3 s → re-plan from the nearest
node. Three failed re-plans → give up the same way. This will fire; the graph is
derived from a sampled straight line and the town is full of things a 1 m sample
steps over. It failing *gracefully* is the requirement.

**Arrival**: the pet enters the landmark radius, turns to face back, and
dances. When the player also enters the radius:

- `hud.flash('new landmark discovered:  ' + name)` — bigger and longer than the
  ordinary toast (3.5 s, its own class), with the Japanese name under the
  English one.
- The landmark goes into the collection.
- The pet becomes a **companion**.

**COMPANION**: follows the player at 2.2–3.2 m on a per-companion angular slot
(so three of them are a loose group, not a stack), `walk`/`run` chosen by the
gap, ignores the flee trigger — it is yours now — and no longer answers to its
home anchor. If it falls more than 60 m behind (you rode the e-bike), it
re-seats with `findSpot` **behind the player and out of view** rather than
running the whole way, because a cat that teleports where you cannot see it is
invisible and a cat that sprints at 20 km/h is not.

`E` on a companion offers `hello` and `stay` — it has to be possible to put one
down, or the group is a ratchet.

### 3.5 The collection

"It's like a collection!" is the line in the brief, so it gets somewhere to
live rather than being a toast that scrolls away.

- **Persisted** in `localStorage` under `sakura-crossing-collection`:
  `{ landmarks: [id…], companions: [species…] }`, wrapped in `try/catch` exactly
  the way the volume setting already is.
- **Shown in the pause overlay**: a `pause-only` panel, `しるべ · Landmarks
  7 / 24`, listing what has been found; undiscovered ones as `———`. Companions
  as a line of species names underneath.
- **Restored across sessions as a record, not as a party.** The landmarks stay
  found; the animals are back where they live and you go and get them. Simpler,
  and it keeps the walk worth taking twice.

---

## 4. The sign  (item 6) and the link  (item 7)

### 4.1 「Adapted by Man & Bot」

- **`textures.js`**: a `creditPlate()` generator, 512 × 128 to fit
  `makeSignPost`'s standard blade, built like `lakePlate` — cream ground, a rule
  top and bottom in the red, **Adapted by Man & Bot** across the middle and
  `人と機械の手による` small underneath. **Appended at the end of the file**, which
  is that file's own standing rule: `variant:` indices are baked into geometry
  across the world and a table cannot be inserted into.
- **Placed inside `buildWorld`**, in the existing crossing-corner phase, so
  `TOTAL` stays at 45 and the sign is baked onto the planet like everything else
  that stands still. A `makeSignPost` with a `double`-sided plate at 1.35 m on
  the near-side east footway around **(4.55, 0, 11.2)**, turned to read across
  the street, plus a 0.25 m collider.
- **The placement is decided with a shot, not with arithmetic.** The opening
  frame is composed, and a post 9 m from the camera on the right-hand kerb may
  well land in the middle of it. `__shot('name')` before and after; if it
  intrudes, the fallbacks are the lineside path beside the allotment
  (-9.6, 4.35) or the rest corner (12.9, 9.6), both of which are places a
  町内会 plate actually belongs.
- Interactable, with a toast that credits Kenney's CC0 kit alongside the line.
  Two lines of code and it turns a joke into an acknowledgement.

### 4.2 Fork me on GitHub

- A `pause-only` link in the overlay to
  `https://github.com/doublependu/dp-sakura-crossing`, `target="_blank"
  rel="noopener noreferrer"`.
- **Two things will break it if they are missed.** The overlay resumes the game
  on *any* click that is not inside `.audio-control` — so the link needs the
  same exemption and a `stopPropagation`, or clicking it resumes the walk behind
  the new tab. And `.menu-foot` is `display: none` under 520 px, so the link
  cannot live there or it does not exist on a phone: it goes in its own
  `pause-only` row above the resume button.
- Text and an `↗`, not an octocat — no new asset, and the page has a CSP-free
  but self-contained-by-habit posture worth keeping.

---

## 5. Verification

The repo's workflow, unchanged: `npm run dev`, `window.__shot()` from the
browser at the documented camera positions before and after, `world.update(1/60)`
and `pets.update(1/60)` stepped by hand because rAF does not fire in that pane,
and the headless Chrome/CDP path for anything involving real input.

What specifically has to be checked, beyond looking at it:

1. **Draw calls at the crossing**, `renderer.info.render.calls`, before and
   after, with the near ring populated. Budget ≤ 130 extra. Report the number.
2. **The two lists.** `world.colliders` moves by exactly one (the sign).
   `world.interactables` moves by the pet count plus one — that is a *new
   baseline*, and it is stable across a session because pets register once and
   travel with their hitboxes. Check it is stable after the e-bike is summoned
   and put away.
3. **Jump**: apex ≈ 0.78 m measured off `player.pos.y`; a garden wall is *not*
   clearable; a bridge-head step *is*; `Space` while riding does nothing; coyote
   time works off the library porch step.
4. **The loader**: throttled to Fast 3G, confirm the bar still finishes on the
   near ring alone, that no animal materialises inside 30 m, and that deleting
   one GLB from `public/` costs exactly one animal.
5. **Follow**, headlessly: tell a pet to lead, teleport the player along behind
   it in 3 m steps, assert arrival, the toast, the collection write and the
   companion state. Then box a pet in and assert the stuck detector gives up
   inside ~12 s instead of grinding.
6. **The graph**: connected-component assert at startup, in DEV.
7. **Touch**, on an emulated 390×844 phone with real `Input.dispatchTouchEvent`:
   the `J` button, the choice card rows, and the pause panel's collection list.

---

## 6. Order, risk, and two things flagged

**Order**: jump → menagerie (assets, loader, sizes, spawn) → collider grid →
landmarks and graph → follow/companion/collection → sign → link. The grid sits
in the middle because §3 needs it and §2 wants it.

**The risk is entirely in §3.2.** Everything else is additive to systems that
work. If the derived graph proves too coarse to trust, the fallback that still
satisfies the brief is: the pet only leads to a landmark it can reach in a
mostly-straight line under 45 m, which turns A\* into "walk toward it" and keeps
every other part of item 4 intact. Take that fallback rather than shipping a
guide that gets stuck.

**Two things flagged, both delivered as asked:**

- **The kit's exotics break the world's premise.** This is a Japanese suburb
  built on the rule that everything in it is ordinary. A giraffe in it is a
  different kind of thing than a cat on a garden wall — it makes the town a
  backdrop for a toy rather than the subject. The brief says all of them, so all
  of them ship; keeping the big seven to the school ground, the lake shore and
  the hill meadows is the compromise that keeps the *streets* plausible, and it
  is also the geometric necessity (§2.3). Worth a second look once it is
  standing up and can actually be judged.
- **`animal-fish` is excluded** as neither land nor air. There is a lake, and a
  fish in it wants a swim state and a water-surface height query. A small, good,
  separate job.

**Not in scope and deliberately still missing**: the Low/High quality toggle
from `PLAN_1.md`, which is still waiting on a measurement from a real handset.
Thirty-four animals make that measurement more urgent, not less.

---

## 7. What actually shipped, and where it differs

All seven items went in. Eight things changed on contact with the world, and
each of them is a decision rather than a detail.

1. **The sizes are not the sizes in the plan, because the brief changed.**
   "Make them cute and visible" turns §2.2 from a zoological ladder into a
   game one: the range is now **0.34 m to 1.15 m**, a spread of about three
   and a half rather than nineteen. A bee is a bumblebee the size of a teacup
   and an elephant comes up to your waist. That also deleted a whole section
   of the plan — with nothing wider than a metre, no species has to be exiled
   from the town for not fitting down a two-metre alley, so **§2.3's "big four
   never go in the town" rule is gone** and every animal lives wherever it
   suits. The tone flag at the bottom of §6 is answered the same way: a
   knee-high giraffe in a suburban lane is a toy in a street, which this world
   can carry, where a 4.8 m one would have been a crane with a face.

2. **The hand-placed junction table did not work and was deleted.** Sixty
   coordinates off the documented camera positions gave **thirty-eight
   disconnected islands**: a junction every thirty metres leaves every edge
   leaping a whole district in one straight line, and a straight line across a
   district hits a house. It is a lattice now — a node every 5 m over four
   rectangles of interesting ground, keep the ones with room to stand, join
   the neighbours — which is a coarse navmesh, costs one 250 ms sweep at
   startup, and needs no maintenance at all. **2 060 nodes, 6 607 edges, 30 of
   the 39 landmarks in one component**, and a second self-contained cluster of
   six around the lake. `onsen`, `pier` and `lakecafe` are in pockets of their
   own; an animal there simply has nowhere to offer.

3. **`wrapDelta(a, b)` is `a - b`, and getting it backwards cost an
   afternoon.** The corridor test walked *away* from its target, so every edge
   in the graph was checked against a mirror image of the ground it was
   supposed to cross. It looked exactly like a world too cluttered to
   navigate — the distances were right the whole time, because a hypotenuse
   does not care about signs. There is now a `nav.explain(a, b)` hook that says
   why any edge does or does not exist, which is what found it.

4. **The corridor test asks a different question than the plan said.** "Is
   there a clear 1.2 m tube the whole way" rejects a straight line *down the
   middle of the street*, because a kei truck is parked on it: 55 edges out of
   1 514 candidates. What a pet actually needs is a corridor that is broadly
   open, because the last two metres are what its obstacle probe is for. A
   fraction of the line may be blocked, no more than 2 m of it consecutively,
   and the sample is every 0.5 m rather than every 1 m — at a metre a *slope*
   and a *step* read identically, so no single rise limit could both admit the
   hillside and reject a retaining wall.

5. **The choice card does not own W and S.** The plan had them moving the
   highlight. They cannot: the card is deliberately non-modal so an animal
   cannot wander off while you decide, which means W has to keep meaning "walk
   forward" the entire time it is up. Two options need `1`, `2` and `E`, and
   that is all it takes. It also has to intercept in the **capture** phase --
   `player.js` binds its keydown in its constructor, long before `main.js`
   binds anything, so a bubble listener sees `E` only after the walker has
   already re-opened the card that was about to be confirmed.

6. **The collection lists what you have found, not what you have not.**
   Thirty-nine rows of `———` is a checklist with three ticks on it, and it
   turns a quiet walk into a completion task. Found places are listed; the
   remainder gets one muted line saying how many are still out there.

7. **A collider spatial grid turned out to be a prerequisite, not an
   optimisation.** `world.colliders` holds **2 732** boxes; the graph fires
   about eighty thousand probes at startup and thirty-odd animals fire three
   each per frame. It is a 4 m grid now (3 783 cells, 8 321 spans), and it
   carries the pets, the graph and anything else that asks. It was checked
   against a brute-force scan over 4 897 points before anything was allowed to
   depend on it: **zero disagreements**.

8. **The draw cap is 18, not 22, and the four are a measurement.** At 22 the
   animals cost **150 draw calls** at the crossing against a budget of 130. At
   18 they cost **111** (10 725 with them, 10 614 with the group hidden), 111
   at the shotengai and 100 at the library. The four that go are the four
   furthest away, at fifty-odd metres and four pixels across.

**Verified** in headless Chrome over CDP, stepping `world.update` and
`pets.update` by hand because rAF never fires in that pane:

- **43 animals from 23 species**, all placing correctly; the wander tracked
  over 30 simulated seconds; siblings from one anchor 1.6–17 m apart after the
  ring search was taught to start away from the anchor (three chicks were
  standing inside each other, because every angle at radius nought is the same
  point).
- **The guide, end to end**: a cat in the back alley offered 桜踏切 → 文具 ひばり堂,
  planned a six-hop route, walked it while the player trailed four metres
  behind, arrived, was adopted at **56 s**, wrote the landmark to the
  collection and became a companion. Zero stuck re-plans on that run.
- **The jump**: apex **0.74 m**, **0.60 s** airborne, a garden wall is *not*
  clearable (0 m climbed), no double jump from a buffered press, and inert on
  the e-bike.
- **The interaction path**: crosshair picks `ねこ · say hello`, two options,
  card opens titled ねこ with `say hello` / `follow`, `W` passes through it
  untouched, `2` is taken and closes it.
- **The counts**: colliders 2 731 → **2 732** (the sign, exactly as predicted);
  interactables grow by one per animal as it materialises, which is the new
  baseline.
- **The lazy loader**: eager set is six species (~1 MB) and the loading bar
  finishes on those alone; the other seventeen arrive on idle; a late arrival
  refuses to appear within 32 m of the player and retries twice a second until
  it can.

**Still open, honestly**: the phone has been checked in an emulator, not on a
handset, so the Low/High toggle is still the next measurement this needs — and
it matters more now. `onsen`, `pier` and `lakecafe` are reachable on foot but
not by a guide, which is a lattice that does not quite reach them rather than a
bug, and the fix is another rectangle rather than another idea.
