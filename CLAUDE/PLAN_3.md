# PLAN_3.md — the dragon, and the fire it breathes

Three items in the brief, and only the first is really new:

1. **One instance of `ref/dragon.glb` as an NPC**, using *all* of its animation
   loops — eight of them, and the plan below spends one section proving each
   clip has a reason to play rather than a slot to fill.
2. **Home is the school playground; it wanders up the mountains around the
   school.** That is one behaviour with two regimes — a ground animal at the
   roost and a flyer on a circuit — and the seam between them is the take-off,
   which is the only genuinely new piece of movement code in the brief.
3. **Replace the model's own fire with "Cinder Fall"** — the meteor ability out
   of `~/Repos/github/others/LinearAbiltyCastingThreeJS` — **rendered in this
   world's style.** That last clause is the whole job. Cinder Fall as it ships
   is a raymarched black-body volume on a PBR rock under an HDR probe. Dropping
   that into a cel painting is the "photograph pasted onto a painting" failure
   `petmodels.js` names at the top of itself. What crosses over is the
   *choreography*, not the shading, and §5 is a list of what survives and what
   is deliberately thrown away.

The order of work is at the end. Item 3 is the biggest of the three and the one
that can be built and looked at on its own, so it is not last.

> ### AMENDED AFTER IMPLEMENTATION
>
> This document is the plan as approved, kept as written.  Three things in it
> were changed afterwards, on instruction, and §4, §6 and §10 should be read
> knowing that:
>
> 1. **The `E` trigger, the 1.6 s wind-up and the crosshair aim are gone.**  The
>    dragon breathes when it decides to, much more often with a player nearby,
>    and picks its own target.  The whole of §4's interaction design and §6's
>    camera-ray march went with them; what survived is the rule about where a
>    cinder may land (`canLand` in `cinderfall.js`).  The one thing on `E` now
>    is "say hello".
> 2. **It is 5.5 m, not 2.4.**  The plan's 2.4 m came out as thirty pixels at the
>    eighty-six metres from the school ground to the crest, which is a smudge in
>    a treeline.  §1's wingspan arithmetic was also wrong -- the model is 2.83
>    units tall, not 2.03, because the horns clear the body by a third.
> 3. **The fireball was missing.**  §5 kept "the burst" in its table and the
>    first implementation did not build it: no shells, only embers and a ring.
>    The reference's `onImpact` spawns two nested `BurstMode.FIRE` bodies and
>    that pair *is* the explosion.  There are three of them now.

**Answered since the first draft** (§10 is what is left):

- **`dragon.glb` is yours.** No licence to chase, nothing to vendor from a third
  party. It ships in `public/models/dragon/` and the README credit names you.
- **2.4 m tall, 4.3 m wingspan.** Confirmed; §1 stands as written.
- **The fire is player-triggered, and it lands where the crosshair lands.** This
  is the change with the longest tail. §4 and §6 are rewritten around it, and it
  is what turns the cast from a thing the dragon decides into a thing the player
  aims — which means it now needs a range, a refusal, a wind-up you can aim
  during, and a rule about where the player has to be standing. All four are
  below.

---

## What constrains all of it

Nothing here is new since `PLAN_2.md`, and each of these has already cost
something once:

- **The world is authored flat and baked once.** `buildWorld()` ends with
  `bakeToPlanet(root)`, which folds geometry into world space and clears
  container transforms — which destroys animation pivots. Anything that moves is
  added to `scene` *after* the build and re-seated every frame from
  `basisAt`/`positionAt`. That is what `ebike.js` and `pets.js` both do, and it
  is what the dragon and every particle of its fire will do.
- **The scene is draw-call bound**, ~2 800 at the crossing after `perf.js`. The
  school ground is a cheaper view than the crossing, which is the one piece of
  luck in this brief: the dragon lives in the part of the world that has
  headroom. §7 is the budget, and the answer is one draw call for the animal.
- **Every material goes through `cel()` / `flat()`.** No exceptions, including
  for fire. Anime fire is two or three flat bands with a hard edge, not a
  gradient, and `flat()` is exactly the tool for it.
- **`world.heightAt(x, z, fromY)` is the ground**, `hillAt` included, so the
  hills behind the school are walkable and flyable-over without a single
  platform. `world.colliderGrid` is what keeps anything out of a wall.
- **`world.interactables` is a list whose length is part of the verification
  workflow** in `CLAUDE_0.md`. This adds exactly one.
- **Fog is `Fog(PAL.fog, 44, 205)` and the camera far plane is 600.** Anything
  past ~150 m is a fog-coloured silhouette, which sets the draw distance in §7.
- **The sun's shadow camera is a 68 m cascade with `far = 200`.** A dragon at 20 m
  altitude 90 m away is outside it. It will simply stop casting a shadow, which
  is correct and free; nothing needs doing about it except not being surprised.

---

## 0. The model, measured

Read out of the GLB's JSON rather than guessed. Everything below depends on it.

| | |
|---|---|
| meshes | one, `DR_body`, **15 primitives** — one per material |
| skin | `DR_rig`, **46 joints**, so this is a *skinned* mesh — `SkeletonUtils.clone` territory, not `Object3D.clone()` |
| triangles | **5 588** total; the two fire primitives are 346 of them |
| bounds | 2.03 units tall, **3.62 wide** (wingspan), 3.28 long **including a fire cone that reaches z = 4.54** |
| axes | Y-up, feet at y ≈ 0, **facing +z** — the same convention as the Kenney pets, so `ry = heading + PI` carries over unchanged |
| textures | **none.** Every material is a flat `baseColorFactor` |
| clips | `breathe_fire` (3.0 s), `fly_forward` (0.83), `hover` (1.0), `idle` (4.0), `roar` (2.5), `run` (0.83), `sleep` (5.0), `walk` (1.33) |

Two findings that shape the work:

**The fire is geometry, and it is already gated by a bone.** Primitives 13 and
14 use materials `fire` and `fire_core`, and they are skinned to a bone called
`firejet` that sits at the jaw. Every clip animates that bone's *scale*:

```
breathe_fire   0.001 → 1.25
every other clip   0.001 flat
```

So the model already carries a normalised "how open is the jet" envelope, keyed
72 times over three seconds, and it is free to read. That is the trigger for
Cinder Fall — not a timer, not a clip-name string comparison, but the bone the
animator actually used. Deleting the two fire primitives at load leaves the
envelope intact, because the bone is part of the skeleton and not part of them.

**Fifteen primitives with identical attribute sets, one skin.** Every primitive
carries exactly `POSITION, NORMAL, JOINTS_0, WEIGHTS_0`, mode 4. That means they
can be merged into one geometry with the per-primitive `baseColorFactor` baked
into a `color` attribute, drawn by a single `cel({ vertexColors: true })`. Fifteen
draw calls become one, twice over (colour pass and shadow pass). This is
`perf.js`'s `dedupeMaterials`/`mergeStatic` argument applied to a model instead of
a district, and it is the difference between a dragon that costs 30 calls and one
that costs 2.

---

## 1. Size, and where it lives

### Size

The pets ladder runs 0.34 m (caterpillar) to 1.15 m (giraffe), authored for the
game rather than measured off the animal — an elephant comes up to your waist.
The dragon is not on that ladder; it is the thing the ladder exists to contrast
with.

**Proposal: 2.4 m tall, which makes the wingspan 4.3 m** (scale ≈ 1.18 on the
model's 2.03 units). Reasons: it is taller than the player, so it reads as *the*
animal rather than another animal; 4.3 m of wing fits the 44 × 22 m school
ground with room to open them; and it is small enough that the 2 m back alleys it
will never visit are not a problem anyway. Anything past ~3 m starts competing
with the school block for the silhouette, which is the one thing in that view
that is meant to carry it.

Its own body numbers, not `petmodels.js`'s clamps — those top out at `bodyR
0.55`, which would let this walk through a fence:

```
bodyR 1.05    rise 0.55    axle 1.6    hit 2.6 × 2.8 × 3.4
```

### Home

**校庭 — the school ground**, `GND = { x0: 36, x1: 80, z0: -67.5, z1: -45.5 }` in
`school.js`. The landmark `schoolyard` is at (40, -44.2) and the tiger already
lives there with `r: 14`, so the dragon's roost goes to the **far corner, around
(66, -60)** — inside the ground, clear of the tiger's circle, backed by the gym
and the courtyard, and visible from the `yard` camera position in `CLAUDE_0.md`
(`pos: [39, 0, -45], yaw: -0.7`) as a shape at the far end of a running track.

`findSpot` from `pets.js` gets reused verbatim to place it — a written
coordinate in this world is a guess about ground built by forty modules, and half
the time the guess is a flowerbed.

### The mountains

`hills.js` `SUMMITS`, the ones behind the school:

```
A0a  (24, -116)  h 8.0    the foothill directly behind the school
A0b  (72, -112)  h 7.0    behind the gym and the ground
A1   (30, -140)  h 16.5   the near summit — the 展望台 is on it
A3   (86, -134)  h 14.5   east, behind the gym
A4   (22, -162)  h 17.0   the back ridge, the highest thing here
```

**The circuit** — five waypoints, deliberately a loop and not an out-and-back, so
it is never flying at you and then away along the same line:

```
roost   (66, -60)     the school ground
gate    (30, -92)     over the hill-foot road, past the 裏門 and the trail head
foot    (24, -114)    the foothill, A0a's top
crest   (30, -138)    the near summit, beside the 展望台 — the perch
east    (78, -116)    back over A0b's shoulder
roost
```

That is **≈ 300 m** of circuit. At `fly` speed 7.5 m/s it is 40 seconds of flight
plus the time spent perched, which is the right order: long enough to be an
absence, short enough that a player who watched it leave is still there when it
comes back. The whole loop stays inside z ≥ -145 and x ≤ 90, so it is always
somewhere a player standing on the school ground or the lookout deck can see it
against sky.

**Why it does not use `TRAILS.main`.** The path from the back gate to the crest
is 117 m of switchbacks laid out for a walker, because the band z −100..−124 is a
uniform 1-in-2. A flyer has no business on it. It goes over.

---

## 2. The eight clips, and why each one plays

The brief says use all the loops. Rather than a state per clip, here is the state
machine, with the clip each state owns. Ten states, eight clips, two shared
(`hover` covers both ends of a flight; `roar` covers the greeting and the
wind-up, at two different rates).

| state | clip | when |
|---|---|---|
| `sleep` | `sleep` | the long default at the roost. Enters when it has been home > 40 s with the player > 25 m away; leaves the moment anything wakes it |
| `idle` | `idle` | woken, or between wanders at the roost |
| `wander` | `walk` | crossing the school ground, home radius **r = 16**, the same curve-integrating wander as `pets.js` — a turn *rate* chased toward a resampled target, never a heading |
| `graze` | `idle` at 0.6× | the pause. `pets.js` has `eat`; this kit does not, and a slowed idle is a better lie than a dance |
| `runup` | `run` | 12 m across the ground into the wind before it leaves. **This is the reason `run` exists in this plan** — a 2.4 m animal that lifts vertically off a standing start looks like a helicopter |
| `takeoff` | `hover` | wings out, altitude ramps 0 → cruise over 1.8 s |
| `fly` | `fly_forward` | the circuit |
| `perch` | `hover` → `idle` | over a waypoint, then landed on the crest |
| `roar` | `roar` | on arriving at the crest, and when the player says hello. One-shot, clamped, then back |
| `aim` | `roar` held at 0.35× | the wind-up. Reared up, head tracking, **while you look where you want it** — §6 |
| `cast` | `breathe_fire` | §5–6. One-shot, 3.0 s, at whatever the crosshair was on when the wind-up ended |

**`sleep` is the one worth defending.** A five-second loop of a sleeping dragon
is a *still frame* in a world whose whole brief is a background — and it is the
state that makes finding it awake feel like timing. The rule is that it never
sleeps while you are watching it arrive: entering `sleep` requires the player
beyond 25 m, and any player inside 18 m wakes it into `idle` with a 0.4 s fade.

`play()` from `pets.js` transfers unchanged — the cross-fade helper where
re-asking for the running clip only updates its rate. The two one-shots (`roar`,
`breathe_fire`) go through it with `loop: false`, which it already supports.

**Flee is deliberately absent.** `pets.js` startles an animal that is rushed —
that rule is printed on the title card. A dragon does not flee a walker. Rush it
and it *stands up* (`idle` → `roar` if you keep coming inside 4 m, with a
cooldown), which is the same idea read the other way round and costs one branch.

---

## 3. Flight, seating, and not going through the school

Seating is `pets.js`'s `seat()` with one addition. `basisAt/positionAt` put it on
the sphere; `Euler('YXZ')` carries heading, ground rake and bank in the order
that already works for the bee. What is added:

- **`alt`** — metres above `world.heightAt(x, z)`, eased toward `altTarget` at
  `1 - exp(-2.6 dt)`, exactly as the flyers do. Cruise is **11 m over the
  terrain**, which clears the school block (H ≈ 10.5 m to the roof rail) and the
  gym, and follows the hill up rather than flying into A1's 16.5 m.
- **`altBob`** — a *displacement* added at draw time, never integrated, or it
  climbs half a metre every time the sine spends longer positive than negative.
  `pets.js` learned that one already.
- **`pitch`** from the climb rate rather than from the ground rake while
  airborne, clamped ±0.35: nose up on the climb out of the school, nose down on
  the run in to the crest.
- **`roll`** from the turn rate, ±0.6 — twice the bee's, because the wing is the
  read.

**Obstacles.** On the ground it uses `walkable()` and the three-probe steer from
`pets.js` against `world.colliderGrid`. In the air it uses `free()` at its own
altitude, which is the whole difference between flying and walking here — the
grid query already takes the height it is asked from. At 11 m over the terrain
nothing in the world is in the way, so this is a safety net rather than a
mechanism; the case it actually catches is the take-off, where it is at 2 m and
the gym is 8 m tall.

**Wrapping.** Every x goes through `wrapX` and every difference through
`wrapDelta`. The circuit is 300 m on a planet — this is not optional.

---

## 4. What `E` does

One entry in `world.interactables`, hitbox as a child of the holder so it travels
for free, invisible rather than absent (`Raycaster` ignores `visible`).

Label, following the existing grammar (`ねこ · say hello`): **`りゅう · say
hello`**, and `りゅう · asleep` when it is. Two options, never more:

- **say hello** → faces the player, `roar`, then back to `idle`. The pets'
  `gesture-positive` does not exist in this kit and a roar is the better answer
  anyway.
- **ask for fire** → opens the wind-up (`aim`), which is where the crosshair
  comes in. **20 s cooldown**, and while it is cooling the option still shows but
  reads `breathing out` and is answered with a head-shake rather than silence. A
  refusal that does not read is a broken button.

### The problem the crosshair creates, and the shape of the fix

**The crosshair is on the dragon when you pick the option.** It has to be — that
is how `player.pick()` found the dragon in the first place, and the choice card
opens under a crosshair that is by definition pointed at its chest. Fire "where
the crosshair lands" resolved at the instant of the click therefore lands *on the
dragon*, every single time. So there has to be a gap between choosing and firing,
and the only question is what fills it.

**The design: a 1.6 s wind-up you aim during.** Picking the option does not cast.
It puts the dragon into `aim` — reared back, `roar` played at 0.35× so it is a
held breath rather than a bark, head tracking your crosshair — closes the choice
card, and hands you back the mouse. `hud.setPrompt` shows *"look where it should
land"* and a small ground marker follows your aim (§6). At the end of the 1.6 s
it breathes at wherever the marker was standing.

Three reasons this is the right shape rather than a modal aim mode with a second
click:

1. **It adds no input.** This game has walking, looking and `E`. A confirm click
   would be a fourth verb, and the click is already bound to pointer lock.
2. **The wind-up is not overhead — it is the beat Cinder Fall is built on.** The
   reference's whole thesis is "an explosion you watched arrive"; the same
   argument one step earlier gives you a cast you watched *aim*.
3. **It cannot get stuck.** There is no state the player can be left holding. The
   clock runs out and something happens either way.

If the marker is somewhere it refuses to fire (§6), the wind-up ends in a
head-shake instead of a cast, the cooldown is *not* spent, and the prompt says
why. §10 carries the one alternative worth considering.

It does **not** join the guide/companion system. `lead()` walks the `landmarks.js`
nav graph, whose edges are sampled straight lines a half-metre probe steps over;
a 4.3 m wingspan on a 2 m footway is a bug report. It stays at the school.

**Where you have to be standing.** The card only opens on a `pick()` hit, and
`player.raycaster.far` is 3.0 m — so fire can only be asked of a dragon that is on
the ground within arm's reach, i.e. at the roost or perched on the crest. In the
air it is unaskable, which needs no code and is the correct answer anyway.

---

## 5. Cinder Fall — what crosses over, and what does not

Cinder Fall is `MeteorAbility` in the reference repo (`ELEMENT_META.meteor.label
= 'Cinder Fall'`). Read in full: 1 081 lines of ability, a 271-line
`MeteorMaterial`, an 833-line `VolumetricFireMaterial`, and about 130 settings.

**What it is, as choreography** — and this is the part that is worth having:

> A burning rock leaves the caster's hand, **lobs downrange on an arc**, and heats
> up the whole way, so the explosion is something you *watched arrive*. It lands,
> bursts, throws its own shattered chunks across the floor, and the crater burns
> out behind you while embers climb off it.

Launch → arc → an arrival you saw coming → burst → debris → a mark that fades.
Six beats. Every one of them survives.

**What is thrown away, and why:**

| dropped | why |
|---|---|
| `VolumetricFireMaterial` — 35-sample raymarched black-body volume, four noise layers | It is a photograph. It is also 35 texture-free but transcendental samples per pixel of a screen-filling hull, on a renderer that is already main-thread bound at 60 fps |
| the PBR rock (`MeteorMaterial`, `envIntensity: 1.25`, HDR probe) | There is no probe in this world and no standard material anywhere in it |
| `GroundFissures` — real heaved-basalt geometry, 6 arms + branches | Molten cracks tearing through a school running track is a different game |
| the dynamic `PointLight` (`lightIntensity: 16`) | **Changing the light count recompiles every material in the scene.** This is the one entry here that is a hard technical no, not a taste call |
| `CameraShake`, `ScreenFlash`, `impactShake`, `rumble` | The frame is a background. It does not shake |
| smoke (`smokeRate: 70`, four grey stops) | Grey smoke over a pastel town greys the town |

**What is kept, and translated:**

| kept | as |
|---|---|
| the arc | verbatim. `_arcPoint(s)` with `arc: 2.6`, `arcCurve: 0.85` — a closed-form function of `s`, not an integration |
| "resolved against settings inside the update loop, on a zero-length frame included" | verbatim, and it is the best idea in that file. A cast stores **dice, not metres**: one seed, one tumble axis, a handful of unitless rolls per chunk. Every distance, angle and second is resolved from the constants table each frame, so tuning a number re-lofts a cinder that is already in the air |
| the rock | `IcosahedronGeometry(r, 1)` with per-vertex jitter from the cast's own seed, `cel()` in `PAL.ink`-ward charcoal. Faceted and flat-shaded, so the depth-difference ink pass finds every crease — which is the whole low-poly-but-accurate direction |
| the heat that builds on the way in (`chargeCurve: 1.6`) | as **shell opacity**, not as crack width. Two nested `flat()` hulls around the rock, `PAL.orange` then `PAL.lanternLit`, scaling 1.0 → 1.35 over the flight |
| the fire trail | a chain of **billboarded flame tongues** — `flameTex()`, a hard-edged five-tongue silhouette drawn in Canvas2D exactly the way `petalTex()` draws a petal, on one `InstancedMesh`. Hand-drawn tongues are more anime than any shader, and it is one draw call |
| embers, sparks | one `InstancedMesh` of small quads, colour stepped over the particle's own lifetime through the reference's own four stops — `#fff3d0 → #ff9a2e → #ff3b0d → #2b0d05`. That gradient is the single most transferable number in the file |
| chunks (`chunkCount: 18`) | **8**, ballistic and closed-form as above, cel-shaded, sinking after `chunkLinger` |
| the shockwave ring (`shockRadius: 6`) | a flat `RingGeometry` in `PAL.lanternLit`, scaling out and fading — anime already draws impacts this way |
| the scorch (`scorchRadius: 2.8`, `scorchLife: 8`) | a `flat()` disc with a soft canvas alpha, seated on the ground by `basisAt` and raked by a two-sample slope, `depthWrite: false`, fading over 8 s |

**Palette.** `PAL` already has `orange: 0xef8a3c`, `red: 0xe0453f`, `lantern:
0xf6e2c0` and `lanternLit: 0xffd9a0` — the warm end of this world, and it is the
matsuri lanterns' end. The fire uses those four and nothing else. That, more than
any geometry decision, is what makes it belong: it is the same orange as the
festival, arriving on a hillside.

---

## 6. Aiming: from the crosshair to the ground

Three things have to be found each frame of the wind-up, and only the first is
new work.

### 6.1 The aim point — a march against `heightAt`, not a scene raycast

The obvious implementation is `Raycaster.intersectObjects(scene.children)`. **Do
not.** `perf.js` merged 14 800 static meshes into 1 371 objects grouped by
material and by a 96 m cell — a ray against that is a ray against six million
triangles in a handful of BVH-less buffer geometries, every frame for 1.6 s.

The world already answers this question analytically. March the camera ray:

```
ray  = camera.position, forward = (0,0,-1) applied to camera.quaternion
step 0.5 m out to RANGE, at each sample:
   ground = world.heightAt(x, z, prevY)     // streetHeight + hillAt + cuts + platforms
   if sample.y <= ground  →  crossed; bisect 4× between this sample and the last
```

Forty samples, four bisections, ~44 `heightAt` calls — cheaper than one
`intersectObject` against a single merged district, and it is the *same* function
the player walks on, so the marker cannot disagree with the ground by a
millimetre. It also handles the hills for free, which is the case that matters:
aiming down the slope from the crest is the shot this whole feature exists for.

**The one thing `heightAt` does not know is walls.** A garden wall is a collider,
not a height — so a ray fired at a house lands on the ground *behind* it. Fixed in
the same loop, for two lines: at each sample also ask `colliderGrid` whether a
collider spans that point with `top` above the ray's height. If one does, the
march stops there and the aim point is the front face of that wall — which reads
correctly as "you are pointing at a building", and feeds gate 2 below, which will
refuse it.

### 6.2 The marker, and the four refusals

A small flat ring — `RingGeometry`, `flat()` in `PAL.lanternLit`, `noOutline`,
`depthWrite: false` — seated by `basisAt` and raked by a two-sample slope, the
same `groundPitch` trick `pets.js` uses. **One draw call, and only during a
wind-up.** It is drawn in one of two states: *ready* (open ring, warm) or
*refused* (ring plus a slash, knocked to `PAL.ink`), so the answer is visible
before the clock runs out rather than after.

It refuses on four gates, all cheap, all checked every frame so the marker
updates live as you sweep:

| gate | rule | why |
|---|---|---|
| **too close** | aim point within **4 m of the player** | the reference's `minRange: 3.0`, plus a metre. Nobody sets fire to their own feet by mis-aiming |
| **too far** | beyond **RANGE = 22 m** | the reference's `range: 20`. Past that the arc is a mortar shot and the cinder is four pixels at the top of it. When the ray finds no ground at all inside 22 m — aiming at the sky, or off the crest into the valley — this is the gate that catches it |
| **built ground** | a collider within **2.5 m** of the aim point, or the march stopped on a wall (§6.1) | it cannot scorch a bicycle shed, a fence, or the gym |
| **the dragon itself** | aim point within **3 m** of the dragon's own footprint | the case that started §4 |

Refused for the whole wind-up → head-shake, no cast, **cooldown not spent**, and
`hud.flash` says which of the four it was in four words. Spending a 20 s cooldown
on a shot the game refused to take is the kind of thing that makes a feature feel
broken when it is working exactly as designed.

### 6.3 Origin, direction, arc

**Origin** is unchanged from the first draft: the `firejet` bone's world matrix,
taken after `mixer.update()`. Its animated scale is the emission envelope (§0) —
`s > 0.05` opens the jet, `s` scales the trail width and the ember rate. Nothing
polls a clip name.

**Direction is now derived, not read.** Previously the jaw pointed and the ground
was found; now the ground is chosen and the jaw has to follow it. Two parts:

- **The body turns.** Through the wind-up, `heading` steers toward the aim point
  with the same `steerToward` gain the pets use, capped at 2.4 rad/s — so a shot
  behind it costs most of the 1.6 s in the turn, which is a fair price and looks
  like a decision.
- **The head does the rest.** After `mixer.update()`, apply a post-mixer yaw and
  pitch to the `head` bone (clamped ±0.5 rad, ±0.4 rad) toward the aim point.
  This is standard look-at layering — write to the bone *after* the mixer has
  written to it, before `updateMatrixWorld`. It costs one quaternion per frame and
  it is what makes the fire come out of the face rather than merely near it.

**The arc** is then fitted between the firejet's world position and the aim point,
with the reference's `arc: 2.6` and `arcCurve: 0.85` unchanged — a closed-form
`_arcPoint(s)`, resolved from the constants each frame, so tuning the loft
re-lofts a cinder already in the air.

### 6.4 Does it still fire on its own?

**Yes, but rarely, and only at the crest.** The first draft had ambient casting
because the dragon chose its own targets; now that the player aims, an ambient
cast has no aimer. The argument for keeping one anyway is that `breathe_fire` is
otherwise the only clip of the eight that never plays unless a button is pressed
— and a player who watches the dragon for ten minutes without ever walking up to
it should still, once, see it breathe.

So: **at the crest only, ~25 % of perches, aimed down the slope** — a fixed
bearing 20 m downhill from the perch, which is always open ground and always
visible from the 展望台. Never at the school. A scorch mark on a school running
track should be something the player caused.

This is the one item in §6 that is a taste call rather than a consequence, and
§10 flags it as reversible in one constant.

---

## 7. The budget

| | draw calls | notes |
|---|---|---|
| dragon, merged (§0) | **1** colour + 1 shadow | 5 242 tris after the fire primitives go |
| dragon, unmerged fallback | 13 + 13 | only if the merge hits a wall |
| flame trail | 1 | `InstancedMesh`, 48 tongues, only while a cast lives |
| embers + sparks | 1 | one instanced quad cloud, 220 slots, pooled |
| chunks | 1 | instanced, 8 slots |
| ring + scorch | 2 | two quads |
| **aim marker** (§6.2) | 1 | one ring, and only during a 1.6 s wind-up |
| **total, mid-cast** | **6** | |
| **total, mid-aim** | **2** | dragon + marker |
| **total, resting** | **1** | the effect meshes are `visible = false` between casts |

Against ~2 800 at the crossing and less than that at the school. The dragon is not
visible from the crossing at all — it is 100 m north behind a three-storey block —
so the opening frame's number is **unchanged**, which is the number `CLAUDE_0.md`
actually tracks.

**LOD.** Draw to **150 m** (fog closes at 205, and this is a big airborne animal —
the pets' 62 m would pop it out of the sky mid-circuit while you watched).
Animate to **110 m**. Think to 110 m. There is one of them, so there is no
`DRAW_CAP` sort to do.

Everything in the effect is **pooled and allocated once at boot** — three
`InstancedMesh`es and two quads, sized for one live cast plus one fading out.
Nothing is constructed during a cast. `userData.noOutline = true` on all of it,
like `petals.js`: the ink pass has no business drawing an outline around an ember.

---

## 8. Files

**New**

- `public/models/dragon/dragon.glb` — copied out of `ref/`, which is
  `.gitignore`d. Yours, so it simply ships: no `LICENSE.txt` beside it, and the
  README credit reads as authorship rather than attribution.
- `src/world/dragonmodel.js` — the loader. Mirrors `petmodels.js`: fetch,
  `SkeletonUtils.clone`-safe prepare, strip the two fire primitives, merge the
  remaining thirteen with baked vertex colours, one `cel()`, measure the box,
  find the `firejet` and `head` bones. ~180 lines, over half of them the note
  explaining the merge.
- `src/world/dragon.js` — the NPC: the state machine, flight, seating, the
  interactable, the wind-up and the head look-at. ~500 lines.
- `src/world/cinderfall.js` — the effect, standalone and testable without a
  dragon. Its whole interface is `cast(origin, target)` — note **target**, not
  direction, which is the §6 change reaching all the way down: the effect is told
  where to land and fits its own arc, rather than being pointed and asked to
  find out. `aimPoint(camera)` and the marker live here too, since they are the
  same march. ~460 lines.

**Modified**

- `src/core/textures.js` — `flameTex()`, `emberTex()`, `scorchTex()`, in the
  style of `petalTex()`.
- `src/main.js` — fetch on idle *after* the pets' eager set (it is 1.5 MB and
  nothing at the crossing needs it), construct, `dragon.update(dt)` in the frame,
  add to `window.__scene`. The dragon needs `camera` handed to it, which the pets
  do not — that is the aim march.
- `README.md` — the credit line, alongside Kenney's.
- `CLAUDE/CLAUDE_0.md` — the interactables count, and a `dragon` camera position.

**Untouched:** `world/index.js`, `perf.js`, the bake, `TOTAL` in the loader.
Nothing here is built before the bake, so no `step()` is added and the loading bar
does not move.

---

## 9. How it gets verified

Per `CLAUDE_0.md` — no `computer{screenshot}`, nothing animates on its own, step
the world by hand:

```js
const s = window.__scene, d = s.dragon;
// the roost, from the school ground camera
await __shot('yard', 1400, 790, { pos: [39, 0, -45], yaw: -0.7, pitch: 0.03 })

// every clip, forced, one shot apiece
for (const st of ['sleep','idle','wander','runup','takeoff','fly','perch','roar','aim','cast']) {
  d.force(st); for (let i = 0; i < 30; i++) d.update(1/60);
  await __shot('dragon-' + st, 1000, 620, {})
}

// the circuit: 90 simulated seconds, then where is it
for (let i = 0; i < 60*90; i++) d.update(1/60);
console.log(d.debug);        // state, x, z, alt, waypoint
```

**The aim march is testable without rendering anything**, which makes it the
cheapest correct thing in the plan to be confident about. It is a pure function
of the camera and `world.heightAt`:

```js
const s = window.__scene, p = s.player, d = s.dragon;
p.pos.set(64, 0, -58); p.pos.y = s.world.heightAt(64, -58);
p.yaw = -0.7; p.pitch = -0.25;
console.log(d.aimPoint());          // { x, z, y, dist, ok, reason }
// sweep the pitch and print the whole curve — the ground under the crosshair
// must be monotonic in pitch and must never disagree with heightAt
for (let a = -0.9; a < 0.1; a += 0.05) { p.pitch = a; console.log(a, d.aimPoint()); }
```

Then the four refusals, each provoked deliberately: aim at your own feet
(`pitch = -1.4`), at the sky (`pitch = +0.2`), at the gym wall, and at the dragon.
All four must come back `ok: false` with the right `reason`, and the marker must
be in its refused state on the same frame.

Then the whole interaction end to end, which is the `CLAUDE_0.md` vending-machine
recipe with a longer clock:

```js
s.world.interactables.find((i) => i.label.includes('りゅう')).options
  .find((o) => o.key === 'fire').action();          // opens the wind-up
p.yaw = -1.1; p.pitch = -0.32;                      // aim during it
for (let i = 0; i < 96; i++) d.update(1/60);        // 1.6 s of wind-up
await __shot('aim', 1400, 790, {})                  // marker on the ground
for (let i = 0; i < 42; i++) d.update(1/60);        // ~0.7 s in, cinder mid-arc
await __shot('cinder-air', 1400, 790, {})
for (let i = 0; i < 60; i++) d.update(1/60);        // impact + burst
await __shot('cinder-hit', 1400, 790, {})
```

And the same again from the crest, watched from the lookout deck at
`pos: [34.5, 0, -128.2]` — the shot that has to carry the feature, because it is
the one with a hillside under it.

`d.force(state)` and `d.aimPoint()` are dev hooks on the returned object, for
exactly this — the same role `pets.lead/greet/abandon` already play.

Four numbers to record before and after, in the report: draw calls at the opening
frame (must not move), draw calls from the `yard` camera resting, the same
mid-cast, and `world.interactables.length` (+1).

The ground-truth question — *can the ember cloud be seen through the school
block?* — is a raycast, not a screenshot, and can be asked in Node with
`document` stubbed, per `CLAUDE_0.md`.

---

## 10. Settled, and what is left

**Settled.** The model is yours and ships as yours; 2.4 m and 4.3 m of wing; the
fire is player-triggered and lands under the crosshair. §4 and §6 are rewritten
around the third, and the wind-up in §4 is the answer to the problem it created —
that the crosshair is by definition on the dragon at the moment you pick the
option.

**Nothing below blocks the work.** Steps 1–4 of the order below — the effect,
the loader, the ground behaviour, the flight — are unaffected by all of it. These
are the calls I have made on your behalf; each is one constant, and each is worth
a look when there is something on screen to look at.

**1. The wind-up, versus a modal aim mode.** §4 chose 1.6 seconds of held breath
you aim during, ending in a cast either way. The alternative is a proper aim mode:
pick the option, the dragon holds *indefinitely*, you look where you like and
press `E` again to release, `Esc` to cancel. That is more precise and it is what
a game with a combat verb would do. I did not choose it because it adds a fourth
verb to a game whose whole vocabulary is walk / look / `E`, and because a held
state the player can wander off in the middle of needs a timeout anyway — at which
point it is the wind-up with extra steps. **If 1.6 s turns out to be too short to
turn around in, the honest fix is 2.2 s, not a new input mode.**

**2. Whether it ever breathes on its own.** §6.4 keeps a rare ambient cast at the
crest — 25 % of perches, aimed 20 m downhill, never at the school — on the
argument that `breathe_fire` should not be the one clip of eight that a player
who never approaches the dragon never sees. Set that constant to 0 and the fire
becomes purely yours. It is a one-line decision either way and it is the one
place where "player-triggered" could reasonably have meant "player-triggered
*only*".

**3. RANGE = 22 m.** The reference ships `range: 20` and `minRange: 3`, tuned for
a combat arena. Here the natural shot is from the crest down an open hillside,
where 22 m is quite short — the 展望台 is 9 m above the slope below it and you
will want to reach further. Easy to raise; the reason not to raise it far is that
the cinder is sized for an arc you can watch, and at 40 m it is a dot at the top
of a mortar shot. **I would rather ship 22 and raise it after looking at one.**

**4. The name on the label.** §4 has `りゅう · say hello`, matching the pets'
kana (`ねこ`, `いぬ`). `ドラゴン` is the other obvious reading and `山の主` — the
master of the mountain — is the one I would pick if this world did not already
have a 山ノ神 shrine 15 m from the trail it flies over. Say a word and it is a
string.

**5. Two live scorch marks, maximum.** Now that the player aims, they can put
eight of them on the running track in a minute. The cap is 2, oldest recycled,
each fading over the reference's `scorchLife: 8`. Not really a question, but it is
a rule that exists only because the crosshair change created the possibility, so
it is written down here rather than buried in §5.

---

## Order of work

1. **`cinderfall.js` + the three textures**, driven by a debug emitter casting
   between two fixed points on the school ground. This is the biggest piece, it
   is the one with a real chance of looking wrong, and it needs no model and no
   crosshair. Shots at four points through a cast; tune against them.
2. **The aim march + the marker** (§6.1, §6.2) — still with no dragon. It is a
   pure function, it is verifiable by printing numbers rather than by looking
   (§9), and every one of the four refusals can be provoked from a console. Doing
   it here rather than inside the state machine is what keeps it that way.
3. **`dragonmodel.js`** — load, strip, merge, cel. One shot of it standing at the
   roost in T-pose. Confirm the draw call is 1 and the vertex colours came
   through.
4. **The state machine on the ground** — sleep / idle / wander / graze / roar, the
   interactable, `E`. Everything at the school ground, no flight.
5. **Flight** — runup, takeoff, the circuit, perch, landing. The 90-second step
   test, then shots from the ground and from the deck.
6. **Wire it all together** — the `E` option opens the wind-up, the wind-up drives
   the body turn and the head look-at, the `firejet` envelope opens the jet, the
   cast goes to the aim point. Then the rare crest cast on top.
7. **Budget pass and the README credit.** Numbers in the report, before and after.
