# PLAN_4.md — riding the dragon

The brief is three sentences and each one is a different kind of work:

1. **You can get on the dragon and fly.**  A second `mount()`, and the first
   thing in this world that leaves the ground with you on it.
2. **Third person.**  The first camera in the game that is not on the player's
   own eyeballs — and the first frame in which the *player* is a thing being
   looked at rather than the thing looking.
3. **`F` breathes fire.**  The one verb PLAN_3 deliberately took away, handed
   back — to the rider, not to the animal.

Nothing here needs a new asset, a new loader or a new pass.  Almost all of it
is reached by extending two files that were already written for it: `RIDE` in
`core/player.js`, which is a block about what riding changes *and what it must
not*, and the state machine in `world/dragon.js`, which already flies, already
lands on a chosen spot, and already knows how to open its own jaw.

---

## The concern, stated once, then built anyway

PLAN_3 removed the fire button and wrote a paragraph about why:

> Nothing else here has a verb attached to it — you walk, you look, and you say
> hello to an animal — and a button that makes something explode was a
> different game wearing this one's clothes.

That argument was about *the animal's* fire, and it still holds: the NPC dragon
keeps its own clock and its own reasons.  What the brief adds is a different
thing standing in the same place — a **ride**, which this world already has one
of, and which is the one existing feature with a verb on it.  The e-bike works
here because it is somebody's scooter, parked, and you borrow it.  A dragon
works on exactly the same terms, and the plan below spends its design budget
keeping it there:

- **You do not summon it.**  There is no `V` for a dragon.  You walk the ninety
  metres to 校庭, you find it — awake or asleep, home or out on its circuit —
  and you ask.  Missing it is a real outcome.
- **It is not a weapon platform.**  `F` throws a cinder at the ground the same
  way the animal does, subject to the same veto (`cinder.canLand`), and there is
  nothing in this world to hit.  It is a firework, not a bomb bay.
- **It goes home.**  Get off and it flies back to the school ground and resumes
  its own life on its own clock, mid-thought, as if you had borrowed a scooter.

If any of that reads wrong once it is on screen, the failure will be visible in
one flight and the plan says where the dial is each time.

---

## What constrains all of it

Read these first; four of the six decisions below are forced by one of them.

- **Flat authoring space, projected at the end.**  Everything simulates in flat
  (x, z, y) and is seated onto the sphere at draw time by `basisAt` /
  `positionAt`.  `player.js` already does exactly this in `applyCamera`, and the
  third-person boom must be built *inside* that frame, not bolted on after it —
  a camera offset applied in world space rolls off the planet within thirty
  metres of walking.
- **There is no player avatar.**  Not a small thing: the game has never drawn a
  body, and a third-person camera behind an empty saddle is a camera behind an
  empty saddle.  §2 settles this — the thing on screen is the *dragon*, the
  rider is off-frame under the camera, and that is a deliberate read, not an
  omission to fix later.
- **`x` wraps and `z` is clamped.**  `wrapX` closes the world at 1005.3 m of
  circumference; `world.bounds` clamps latitude to ±241 m.  A ride that can
  cross the planet in under a minute is the first thing that will find any
  seam either of those has.
- **The planet is small and that is the whole view.**  `R = 160`, so
  `horizonFor(h) = sqrt(2·160·h + h²)`: at 20 m you see 80 m of ground, at 90 m
  you see 192 m, and the fog closes at 205.  The ceiling in §3 is derived from
  that coincidence rather than chosen.
- **Nothing in the world is opaque above 31 m.**  Measured, in the Node harness,
  on the built world: **2 732 colliders, every single one carries a `top`, and
  the highest is 30.5 m.**  So `free(x, z, r, y)` — which skips any collider
  whose top is below the probe — returns true everywhere above 31 m, and the air
  above the town needs no new collision system at all.  Below 31 m the same
  probe is already the one the NPC dragon flies its 15 m circuit with.
- **The dragon is a borrowed model with a measured rig.**  46 bones, 8 clips,
  authored facing **+z**, 2.83 units tall in the bind pose, scaled by
  `HEIGHT / 2.83 = 1.943`.  Every offset in §1 and §2 is a bone position out of
  the GLB multiplied by that number, not a guess.

---

## 0. The rig, measured

Read off `public/models/dragon/dragon.glb` with `GLTFLoader.parse`, bind pose,
world positions in model units — and in metres at the shipping scale of 1.943:

| bone | model units | × 1.943 (m) | what it is for here |
|---|---|---|---|
| `hips` | (0, 0.66, −0.33) | (0, 1.28, −0.64) | — |
| `spine2` | (0, 0.69, −0.11) | (0, 1.34, −0.21) | — |
| `chest` | (0, 0.70, 0.11) | (0, 1.36, 0.21) | the saddle's parent |
| `wingrootL/R` | (±0.06, 0.90, 0.35) | (±0.12, 1.75, 0.68) | the withers — top of the back |
| `neck1` | (0, 0.74, 0.30) | (0, 1.44, 0.58) | — |
| `head` | (0, 1.58, 0.54) | (0, 3.07, 1.05) | the look-at, already used |
| `firejet` | (0, 1.385, 1.58) | (0, 2.69, 3.07) | the cast origin, already used |
| `jaw` | — | — | **new**: the jaw override in §4 |

Bind-pose bounds are x −1.86…1.86, y −0.01…2.82, z −1.72…4.54; the z maximum is
the model's own fire cone, which `dragonmodel.js` deletes at load, so the animal
measures **7.23 m across the wings, 6.4 m nose to tail, 5.5 m to the horns**.

Clips, with durations, all 138 tracks: `idle` 4.00 s, `sleep` 5.00 s, `walk`
1.33 s, `run` 0.83 s, `hover` 1.00 s, `fly_forward` 0.83 s, `roar` 2.50 s,
`breathe_fire` 3.00 s.  There is **no glide clip**, which §3 has to answer for.

### The seat

Behind the wingroots, on top of the shoulders: local `(0, 0.95, 0.15)` units =
**(0, 1.85, 0.29) m** above the animal's origin, which is the point `seat()`
already puts on the sphere.  It is not a bone and does not need to be one — the
seat is where the *camera boom is anchored*, and anchoring it to `chest` would
inherit the wing-beat's whole vertical throw into the camera.  A constant offset
in the group's local frame, plus a fraction of the animal's bob, is the version
that does not make anybody ill (§2).

---

## 1. Getting on

### The card already exists

`world/dragon.js` pushes one interactable with a single option, and `main.js`
already routes anything with **more than one** option into `hud.openChoice`.  So
the whole mount UI is one array entry:

```js
get options() {
  return grounded() && !ridden
    ? [{ key: 'hello', label: 'say hello', action: greet },
       { key: 'ride',  label: 'climb on',  action: mountRider }]
    : [{ key: 'hello', label: 'say hello', action: greet }];
}
```

and the label goes from `りゅう · say hello` to `りゅう · climb on` when the
second option is live, because `hud.setPrompt` shows the tail of the label and
the prompt is the only affordance on screen.

Two refusals, both silent-with-a-flash rather than a disabled row:

- **Not while it is in the air.**  `grounded()` already exists and is exactly
  the right test.  The pick's `raycaster.far` is 3.0 m, so you must be standing
  next to it anyway.
- **Not while it is casting or roaring.**  `p.state === 'cast' | 'turn' | 'roar'`
  keeps the option out; interrupting a three-second clip to snap into a saddle
  is the animation bug that would show up in every recording.

### What `mountRider()` does

Six things, and it is worth listing them against the e-bike's four so the
difference is on the record:

1. `player.mount(rideEntry, { thirdPerson: true })` — the walker stops
   simulating (§1.3).
2. `player.yaw = p.heading` — a snap, for the e-bike's reason: the yaw *is* the
   flight direction, so anything else starts you looking off the animal's flank.
   `player.pitch` snaps to 0.
3. The dragon enters `state = 'ridden'`, sub-state `'ground'`; every autonomous
   clock (`tripIn`, `castIn`, `stateIn`, `perchFor`) is frozen where it stands
   rather than reset — it resumes its own life on dismount, mid-thought.
4. `hud.flash('りゅう · W to walk, Space to fly, F to breathe, E to get off', 3200)`.
5. The touch button row relabels (§7).
6. `player.pos` is slaved to the animal from this frame on — see below, it is
   the load-bearing line in the whole plan.

### The player is a passenger, and `player.pos` still has to be right

`player.pos` is not just where the walker is.  It is:

- the shadow cascade's centre (`main.js`, snapped to 2 m),
- the light-seating frame (`basisAt(player.pos.x, player.pos.z)`),
- the sky dome's anchor (via the camera),
- the pets' LOD and behaviour distance (`pets.js`, 62 m draw / 44 m think),
- the dragon's own `dPlayer` and `DRAW` gate,
- `cinder.canLand`'s minimum range,
- and the HUD coordinate readout.

So the ride must **write the rider's real position into `player.pos` every
frame** — x and z from the animal, `y` from `p.y + p.alt` — and everything
downstream keeps working with no changes.  Get this wrong (leave the walker
standing on the school ground while the camera flies away) and the symptom is
not subtle: the town goes unlit and unshadowed around a body nobody can see, and
the dragon LODs itself out at 150 m from its own rider.

`player.pos.y` at 90 m is harmless for `heightAt(x, z, fromY)`: a large `fromY`
makes every platform eligible again, which is the same answer the builders get
when they omit it.

### What the walker stops doing

`player.mount()` already zeroes velocity, bob, `vy`, `airborne` and `buffered`.
For a flyer it must additionally skip, in `update()`:

- the wish-velocity integration and both `_resolve` passes — the animal owns
  collision now, and a 0.34 m disc at 26 m/s inside a town's colliders is a
  teleport generator;
- the ground-follow / gravity block;
- the `lonScale`, sub-step and `bounds` clamp, which the animal does instead.

Cleanest shape: `this.ride` gains a flag, and the top of `update()` becomes

```js
if (this.ride?.thirdPerson) { this._passenger(dt); return; }
```

where `_passenger` does only the yaw/pitch bookkeeping, `yawRate`, `roll` and
`applyCamera`.  Roughly 25 lines added to `player.js`, no line of the walking
path touched — which is the same standard the `JUMP` block set.

---

## 2. The camera

### The frame is the dragon

There is no rider model and none is going to be built for this.  So the shot is
composed around the animal: boom behind and above the **seat**, the dragon
filling the lower-middle third, the horizon curving off both sides of it.  That
is the anime shot anyway — the one from the back of the creature, wings working
at the edges of frame — and it is the shot this game's whole art direction is
already pointed at.

### The numbers, derived

Vertical fov is 46°; at 16:9 the horizontal is 2·atan(tan 23° · 16/9) = **74°**.
For the 5.5 m animal to stand about 58 % of frame height, the boom wants
`d ≈ 2.75 / tan(13.4°) ≈ 11.5 m`.  Round the pair to

```
BOOM = { back: 11.0, up: 3.4, lookAhead: 2.5 }
```

— 11 m behind the seat, 3.4 m above it, aim point 2.5 m *ahead* of the seat so
the animal sits below centre and the sky gets the top half of the frame.  The
7.23 m wingspan then spans 37° of a 74° frame: half the width, wingtip to
wingtip, with room to bank.

### It is built out of `applyCamera`, not beside it

The existing method already produces the correct **orientation** on a sphere —
surface quaternion from `basisAt`, times the local `YXZ` euler of
(pitch, yaw, roll).  Third person needs the same quaternion and a different
position, so the change is: compute the quaternion exactly as now, then

```js
positionAt(seatX, seatY, seatZ, camera.position);         // the anchor, on the sphere
_boomDir.set(0, 0, 1).applyQuaternion(camera.quaternion); // camera-back, world space
camera.position.addScaledVector(_boomDir, boomNow)        // pulled back along the view
               .addScaledVector(_upWorld, BOOM.up);
```

Because the boom is applied along the *camera's own* axes and the anchor is
placed by `positionAt`, the whole rig is correct on the sphere for free, at any
longitude, with no second frame to keep in sync.

### Four details that are the difference between a camera and a fairground ride

- **The boom lags.**  `boomNow` springs toward `BOOM.back · (1 + 0.35 · speed /
  cruise)` at about 4 /s, so accelerating stretches the shot and braking closes
  it.  This is the single cheapest thing that makes speed legible; without it
  16 m/s and 26 m/s look identical.
- **Roll is quoted, not inherited.**  The animal banks up to ±0.6 rad in a turn
  (`p.roll`).  Feeding that straight into the camera is the classic way to make
  a viewer motion-sick.  The camera takes **0.35 of it** and eases at 5 /s, so
  the horizon tips enough to sell the turn and never enough to invert.
- **Pitch is the rider's, not the animal's.**  You look where you look; the
  animal's own nose pitch (§3) is a *result* and never rotates the frame.
- **The wing-beat bob is filtered.**  `p.altBob` is ±0.22 m at 1.6 Hz.  The seat
  takes all of it, the camera takes 0.3 of it — the animal visibly heaves under
  a camera that mostly does not.

### Terrain, and the one clamp

At low altitude the boom will be underground on any slope.  One `heightAt` at
the boom's flat point, and if the camera is under `ground + 0.8` it is lifted to
it, easing back down at 6 /s.  That is the whole camera-collision system, and it
is enough: the world above 31 m has nothing in it, and below 31 m the animal is
landing, taking off, or being flown very deliberately down a street by somebody
who has earned whatever the camera does.

### `R`, `P` and `Esc` while riding

- `R` (`player.reset()`) must not teleport a rider to the crossing while the
  camera is on a dragon a hundred metres away.  Riding, `R` **dismounts first**
  (the immediate step-off path of §6) and then resets.
- `P` (planet view) is already exclusive of everything and takes the camera
  wholesale; on return it re-seats from `player.applyCamera`, which is now the
  boom, so it needs no change.
- `Esc` releases the pointer.  You stay on the dragon; it keeps flying with no
  throttle, which is §3's `hover`.  This is correct and matches the e-bike,
  which does not throw you off when you tab out.

---

## 3. Flight

### The control map

| input | on the ground | in the air |
|---|---|---|
| mouse | steer the head / heading | steer: yaw is the flight direction, pitch is the flight *path* |
| `W` | walk forward | throttle to cruise |
| `Shift`+`W` | run | throttle to boost |
| `S` | stop | brake toward hover |
| `A` / `D` | turn on the spot | bank and turn (adds to the mouse) |
| `Space` | **take off** | climb — a wing-beat that trades speed for height |
| `F` | breathe | breathe |
| `E` | get off | set me down, then get off (§6) |

Two things about this map are decisions rather than defaults:

**The animal follows the camera, with a lag.**  `p.heading` eases toward
`player.yaw` at a rate limited to about 1.1 rad/s at cruise (1.6 with `A`/`D`
held into the turn), and the nose pitch eases toward `player.pitch` clamped to
±0.5 rad.  So you can whip the view round to look at the town and the dragon
swings after you, arriving a beat late — which is what weight looks like.  The
alternative (heading *is* yaw, rigidly) makes a five-and-a-half-metre animal
handle like a mouse cursor, and it is the single most common way a flying mount
comes out feeling like a spectator camera with a model glued to it.

**Altitude is a consequence, not an axis.**  Climb rate is
`speed · sin(nosePitch)` plus whatever `Space` is adding, minus a sink of about
1.2 m/s when the throttle is off.  No "up key / down key".  This is the one
choice most likely to want revisiting after the first flight; the fallback is a
held-`Space` climb and `Ctrl` descend, which is two lines.

### The numbers

```
CRUISE_V   16.0   m/s   throttle W          — a lap of the planet in 63 s
BOOST_V    26.0   m/s   throttle Shift+W    — a lap in 39 s
HOVER_V     0.0   m/s   no throttle, wings working
ACCEL       3.2   m/s²  toward the wish speed; brake at 6.0
BEAT_LIFT   4.5   m/s   while Space is held, decaying over 0.8 s per beat
SINK        1.2   m/s   with no throttle and level
CEILING    90.0   m     over the terrain
TURN_MAX    1.1   rad/s  cruise; 1.6 with A/D; scaled by 0.6 at boost
BANK_MAX    0.62  rad
```

For scale: the NPC's own circuit flies at `7.5 · sqrt(5.5/2.4) = 11.35 m/s` and
cruises at 15 m over the terrain.  The rider is 1.4× faster and can go six times
higher, which is the difference between an animal going about its business and
somebody taking it out.

**The ceiling is derived.**  `horizonFor(90) = sqrt(2·160·90 + 8100) = 192 m`,
and `scene.fog.far` is 205.  At 90 m the ground runs out over the curve of the
planet a whisker before the fog would have taken it — so the shot at the ceiling
is a complete little world with a clean edge, and pushing higher would only buy
more of the same disc against more sky.  It is also comfortably under the 500 m
sky dome and the 600 m camera far, so nothing clips.

### Fog, and the one change to it

At 90 m almost everything visible is 60–190 m away, i.e. deep in a fog band
authored for a walker at eye level looking down a street.  The town greys out
from the air.  Fix, and it is four lines in `main.js`: ease
`scene.fog.near` from 44 → 90 and `scene.fog.far` from 205 → 300 as
`player.pos.y` climbs past 20 m, and back on the way down.  `THREE.Fog`'s
`near`/`far` are plain numbers on a uniform, so there is nothing to recompile.
The sky dome and clear colour stay exactly as they are.

### The ground/air seam, both ways

**Take-off.**  The NPC runs twelve metres first, and it is right to (a heavy
animal that lifts vertically off a standing start is a helicopter).  The rider
gets the same thing, driven rather than scripted: `Space` on the ground plays
`run`, and the animal leaves the ground when it has either covered
`RUNUP = 12 · SIZE` metres or run out of walkable ground ahead (`blockedAhead()`,
which already exists).  Then `hover` until `alt > 4`, then `fly_forward`.
Holding `Space` from a standstill in a corner therefore *takes a run at it* and
the player sees why.

**Landing.**  Throttle off, nose down, and below 6 m the animal drops into
`hover` and eases its feet onto `heightAt`; touching down with lateral speed
above ~4 m/s plays `run` for a beat and bleeds it off.  It refuses to land where
`walkable()` is false — the same test the NPC lands with — and instead holds a
2 m hover until you move it somewhere legal.  This is the only place a rider can
get stuck, and §6's forced step-off is the way out.

### Clips, and the missing glide

`hover` at ≤ 3 m/s, `fly_forward` above it, rate
`clamp(0.75 + speed / 40, 0.75, 1.35)` — 1.19 at cruise, 1.4 capped at boost.
There is no glide clip, so a dive with the throttle off drops the rate to **0.45**
and holds the wings' slow sweep, which reads as a glide at speed.  If that looks
wrong the honest alternative is a one-frame pose held out of `fly_forward` — but
try the rate first; it costs nothing.

### Collision in the air

Keep the existing three-probe steer from `dragon.js` unchanged, at the flight
altitude, but **do not let it steer for the rider** — above 31 m it never fires
(measured: no collider in the world reaches it), and below 31 m an autopilot
that turns you away from a rooftop you were aiming at is worse than the bump.
So while ridden the probe only *blocks* (the per-axis `free()` test that already
gates `p.x` and `p.z`), and the turn-away branch is skipped.  Flying into the
side of the school stops you dead against it, which is the correct amount of
punishment for flying into the side of the school.

`wrapX` and the `bounds` clamp apply exactly as they do to the walker.

---

## 4. `F` — the fireball

### Where it goes: the crosshair, marched against `heightAt`

PLAN_3 §6.1 designed this and then deleted it with the aim UI.  It comes back,
for the rider only, and it is the right tool: **march the camera ray against the
height field**, do not raycast the scene.

```
from the camera position, along the camera forward, in flat coordinates:
  step 0.75 m out to 140 m (≈ 190 samples, ~0.02 ms)
  at each sample, compare the ray's y against heightAt(x, z)
  first crossing → refine with 6 bisections → the aim point
```

Why not a scene raycast: the world is one baked planet mesh plus ten thousand
props, the ray would have to test them all, and it would return a *roof* as
often as ground — which is the wrong answer for a thing that lands and burns.
`heightAt` is the same function the animal walks on, it is O(platforms), and it
is what `canLand` vetoes against, so the aim and the veto agree by construction.

If the march finds no crossing within 140 m (you are looking at the sky), the
aim point is the ray at 140 m and the shot becomes an airburst (below).

### The veto, and what happens when it says no

`cinder.canLand(x, z, exclude)` refuses three things: inside `minRange` (8 m) of
the player, within `BUILT` (1.6 m) of any collider, and inside the caster's own
exclusion.  For an NPC picking its own target that is a filter — it just picks
again.  A rider has already aimed, so a silent refusal is a broken button.

**Recommendation: the shot always fires, and the veto chooses what it does when
it arrives.**

- Legal ground → the cast exactly as it is today: arc, impact, scorch disc,
  chunks, embers, shock ring.
- Vetoed ground, or no ground at all → the same cast with `airburst: true`,
  which suppresses the ground disc, the debris chunks and the scorch, and keeps
  the burst shells and the embers.  It detonates in the air a metre short of
  what it was going to hit.

That is one flag on the cast record and two `if`s in `cinderfall.impact()`, it
never puts a scorch mark on somebody's shopfront, and it means `F` over the
town is a firework above the rooftops rather than a dead key.  The alternative —
refuse and flash "not here" — is a worse game and more UI.

The `minRange` check should additionally be made **3-D while the rider is
airborne**: `hypot(dx, dz, alt)`, so aiming straight down from 40 m is a legal
shot rather than a refusal caused by measuring a vertical drop as a horizontal
zero.  One line in `canLand`, gated on a rider flag.

### The animation problem, and the answer

PLAN_3 is explicit that the animal never breathes while flying, because
`breathe_fire` is a grounded three-second clip and cross-fading to it mid-flight
is a dragon that stops flapping and falls out of the sky.  That constraint is
real and does not go away because there is somebody on its back.

So while ridden and airborne, **the clip is not played at all.**  Instead:

- The **jaw** is opened by hand, after `mixer.update()` and before the matrix
  flush, exactly the way `lookAt()` already rotates the head on top of the
  mixer's pose.  A 0.55 s envelope — 0.12 s open, 0.18 s held, 0.25 s closed —
  rotating the `jaw` bone about its measured hinge axis (found the same way
  `dragonmodel.js` finds `headUp`/`headRight`: take the bind-pose world matrix,
  keep the local axis closest to the model's +x).
- The **cast leaves at the peak of that envelope**, not on a `firejet` bone
  whose scale the flight clips pin at 0.001.  `jetOpen()` stays exactly as it is
  and stays the trigger for the animal's *own* casts; the rider's cast has its
  own gate, and both spawn from `jetPoint()`, which reads the bone's world
  position and is correct under any clip.
- The **head is aimed** at the target for the duration by the existing
  `lookAt()`, weighted in and out with the envelope.

On the *ground*, ridden, `F` can and should play the real `breathe_fire` clip —
it is a better animation and there is nothing to fall out of.

The alternative worth naming and not taking: `AnimationUtils.makeClipAdditive`
on `breathe_fire` plus `AdditiveAnimationBlendMode`, layered over
`fly_forward`.  It is the textbook answer and it is one call.  It is not the
recommendation because `breathe_fire` is authored as a whole-body grounded clip,
so its additive delta includes a folded wing pose that would fight the flight
clip on the two bones the frame is mostly made of.  If the jaw override looks
thin, this is the upgrade path.

### Rate, and not making a machine gun

`FIRE_EVERY = 1.4 s` between casts, and `MAX_CASTS` in `cinderfall.js` is
already a hard cap that drops the oldest.  At cruise 1.4 s is 22 m of ground
between impacts, which is a trail of fire down a hillside rather than a carpet.
The HUD says nothing about a cooldown; a key that does nothing for a beat is
legible without a meter.

---

## 5. The animal's own mind, while somebody is on it

One new state, `'ridden'`, entered from `mountRider()` and exited on dismount.
In `think()` it is the first branch and it returns immediately after applying
the rider's inputs — none of the autonomous machinery below it runs:

- no `castIn` clock (the rider owns `F`),
- no `tripIn` / circuit / `leg` / `going`,
- no `sleep`, no `wander`, no leash to `ROOST`,
- no `LOOM_NEAR` crowding rule (you are *on* it),
- `unstick()` **stays on** — it is a net under everything and a rider can fly
  the animal into geometry far more creatively than the animal can walk into it.

`p.tripIn`, `p.castIn` and `p.homeT` are frozen rather than zeroed, so the
animal picks its own life back up mid-thought when you get off.

On dismount the state machine is handed back at whatever altitude and position
the ride ended at: airborne → `'fly'` with `going = false` (which is already
"head home and land at the roost"), grounded and far from home → `'idle'` with
`tripIn` set short so it flies back within a few seconds, grounded at the roost
→ `'idle'`.  All three are existing states doing what they already do.

`DRAW` (150 m) never gates a ridden dragon, because `dPlayer` is ~0 by
construction.  Worth an explicit `|| ridden` on the visibility test anyway, so a
future change to how the rider's position is written cannot make the mount
vanish out from under its own camera.

---

## 6. Getting off

Two paths, one key.

**`E` in the air → "set me down."**  The animal takes the controls back: it
picks a landing spot with `findSpot()` — the same ring search the NPC lands
with, which is what stops it choosing the inside of the gymnasium — flies to it
and lands using the existing `'landing'` state, which already solves both the
orbiting and the twenty-metres-short bugs recorded in `dragon.js`.  The rider
watches.  This is the good ending and it shows off the animal's own competence.

**`E` again during that descent → step off now.**  The player is released at the
seat's position with `airborne = true` and `vy = 0`, and the walker's existing
gravity integrator does the rest: 16 m/s², terminal at whatever height, landing
on `heightAt` with the 0.06 m knee dip.  From 40 m that is 2.2 seconds of
falling and no consequence, because this world has no damage and is not about to
grow any.  It is also the escape hatch for a rider wedged somewhere the landing
search cannot resolve.

**`E` on the ground → step off sideways**, exactly the e-bike's dismount: left
first, then right, then back off the tail, each tried against `roomAt` and a
0.6 m height difference, and the animal's own `bodyR` (1.82 m) plus the walker's
0.34 m as the offset — call it 3.2 m to the side.

In all three cases: `player.unmount()`, the touch row relabels back, the animal
gets its clocks back, and `hud.flash('りゅう · thank you', 1400)`.

---

## 7. What flying breaks elsewhere

Each of these is a real thing that will happen on the first flight, with what to
do about it.

- **Pets wake up under you.**  `pets.js` measures distance to the player in flat
  x/z only (`DRAW = 62`, think radius 44), so crossing the town at 80 m altitude
  puts thirty animals "within 62 m" and runs thirty mixers for something the size
  of a pixel.  Fix: fold altitude into that one distance —
  `hypot(dx, dz, max(0, player.pos.y - p.y))` at `pets.js` lines ~876 and ~884.
  Two lines, and it makes overflight free.
- **The dragon's shadow leaves the cascade at 21.5 m.**  The sun sits at local
  (−52, 62, 56) — 62 m up, 98 m out — over a cascade of half-width 34 m, so a
  body at altitude `a` is displaced `a · 98/62` from the centre and falls off the
  edge at `a = 34 · 62/98 = 21.5 m`.  Above that the animal casts nothing.
  Accept it for the first pass (nobody is looking at the ground under
  themselves), and if it is missed, the cheap fix is a painted one: a single
  unlit dark ellipse seated on `heightAt` under the animal, opacity falling with
  altitude, one draw call — the same trick `cinderfall.js` uses for its scorch
  disc.  Widening the real cascade is not the fix; it is the whole town's shadow
  quality traded for one ellipse.
- **The shadow budget is unaffected.**  `createShadowBudget` already redraws on a
  2 m snap *or* every 2 frames, whichever comes first, so flight adds nothing to
  a cost that was already being paid every other frame.
- **`__shot` snaps the player to the ground.**  Line 558 of `main.js` does
  `player.pos.y = world.heightAt(...)` before `applyCamera`, which makes every
  flight screenshot a screenshot of the school ground.  Gate that on
  `!player.ride?.thirdPerson` and add an `alt` option, or no visual verification
  of any of this is possible.
- **Touch.**  The button row is built once in `touch.js` (`V` small, `J`, `E`
  primary).  Riding needs `F`.  Add `setMode('ride' | 'walk')` which relabels:
  `V → 火` (fire), `J → ▲` (take off / climb, and it is already wired to
  `player.jump()` which becomes the climb), `E` unchanged.  Pitch comes from the
  right-thumb drag, which is already the look, so the flight model needs nothing
  else.
- **The hint line and the README.**  `core/hud.js`'s hint and the two
  `control-strip` blocks, plus the key table at README line 39, all need the two
  new rows.  Say it as one line: `F` breathe fire *(riding)*.
- **`world.bounds`.**  ±241 m of latitude, clamped for the walker in
  `player.js`.  The ride clamps in the animal instead; without it you fly to the
  pole and the tangent frame degenerates.
- **`player.vel`.**  `pets.js` reads `hypot(player.vel.x, player.vel.z)` as
  "rush" to startle animals.  A passenger's `vel` should be written with the
  animal's actual velocity, so a dragon landing on a playground full of animals
  scatters them.  That is free and it is a nice moment.

---

## 8. Files

| file | change | rough size |
|---|---|---|
| `src/core/player.js` | `FLY` block; `mount(v, {thirdPerson})`; `_passenger(dt)`; the boom inside `applyCamera` | +90 |
| `src/world/dragon.js` | `'ridden'` state, the flight model, `mountRider`/`dismount`, the jaw override, the second interactable option, the aim march | +260 |
| `src/world/cinderfall.js` | `airburst` on a cast; 3-D `minRange` while airborne | +25 |
| `src/main.js` | `F` in the key handler and in `act`; the fog ease; `__shot`'s ground snap | +30 |
| `src/core/touch.js` | `setMode`, the relabelled row | +25 |
| `src/core/hud.js` | two hint entries | +4 |
| `README.md` | two key-table rows and a paragraph | +12 |

No new file.  The aim march is ~25 of the dragon's 260 and is the only piece
that might read better as its own small module (`world/aim.js`) if anything else
ever needs to ask "what ground am I looking at" — nothing does today.

---

## 9. How it gets verified

Per `CLAUDE_0.md`: **rAF does not fire in the Browser pane, so nothing animates
on its own** — every check below either steps the world by hand or runs headless.

**Headless, in Node** (the harness that found the mid-air freeze and the
nineteen-minutes-asleep bug — stub `document`/`window`/`localStorage`, read the
GLB with `fs` and `loader.parse`):

1. **Mount and fly a lap.**  Mount at the roost, hold throttle and a fixed yaw
   for 90 simulated seconds at 1/60, and assert: `p.alt` reaches cruise and never
   exceeds 90; `player.pos` tracks the animal to within a metre every frame;
   `wrapX` is crossed at least once and `p.x` stays in range; nothing NaNs.  The
   failure this is really looking for is the PLAN_3 one — *a ride that strands
   itself* — so it also asserts the animal is still moving on the last frame.
2. **Land in a hundred places.**  From 60 m over each of a grid of x/z points
   across the district, run the `E`-descent to completion and record where it
   touched down and how long it took.  Any spot that exceeds 30 s or ends with
   `free()` false is a landing bug; `dragon.js`'s own history says this is where
   the bugs are.
3. **Every collider has a `top`** — already measured (2 732 / 2 732, max 30.5 m),
   and worth re-running after any world change, because one collider without a
   `top` is an invisible wall in the sky that nothing else would ever notice.
4. **The aim march agrees with the ground.**  For 500 random camera poses,
   compare the marched aim point's `heightAt` against the ray's y at that point;
   the residual must be under the 0.75 m step after bisection.
5. **The fire does not litter.**  200 ridden casts over the district: count how
   many produce a scorch disc, and assert every one of those passes `canLand`.

**In the browser, with `__shot`** (after the `__shot` fix above):

6. Four frames that are the feature: on the animal's back at the roost about to
   leave; climbing out over 校庭 with the school below; at the ceiling with the
   planet curving away and the fog band gone; and a cast in flight, stepped to
   the frame the burst is widest.  These are also the README images.

**With headless Chrome** (the recording loop in `CLAUDE_0.md`, no ffmpeg
needed): one 20-second flight video, because everything in §2 — the boom lag,
the quoted roll, the filtered bob — is a claim about motion and cannot be
checked in a still.  `.shots/dragon-fire.webm` already exists as the precedent.

---

## 10. Decisions I would like confirmed

Everything above is buildable as written; these five are the ones where a
different answer is defensible and cheap to swap *before* the code exists.

1. **The camera has no rider in it.**  Recommended, because there is no avatar
   in this game and building one is a bigger job than the whole brief.  The
   alternative is a simple seated silhouette — cel-shaded, four boxes and a
   coat, in `petmodels.js`'s idiom — which would cost about 80 lines and would
   change what this feature *is*.
2. **`F` always fires, and illegal ground makes it an airburst** (§4) rather
   than refusing.
3. **Altitude is a consequence of the nose, not its own key** (§3).
4. **`E` in the air asks the animal to land, and a second `E` steps off into a
   fall** (§6).
5. **The dragon cannot be called.**  You walk to 校庭 — ninety metres from the
   opening view — and it may be out on its circuit when you get there.  I think
   the walk is the point and the absence is worth keeping; the counter-argument
   is that a mount you cannot find is a feature people do not know exists, and
   the fix would be a whistle on `V` when it is not the e-bike's turn.

Deliberately left out: no stamina, no health, no fall damage, no landing
minigame, no second rider, no sound (the whole game has one music track and no
SFX, and a dragon is not the place to start that argument), and **no combat** —
there is nothing in this world to fight and adding a target would be the change
that finally made it a different game.

---

## Order of work

Each step ends somewhere it can be looked at, which is the only ordering rule
that survives contact with a 3-D feature.

1. **The boom.**  `player.js`'s `thirdPerson` mount and the camera inside
   `applyCamera`, tested against the **e-bike** — mount the scooter in third
   person and ride around.  It isolates the camera from the flight model
   entirely, and if the sphere frame is wrong this is where it shows, at walking
   pace, two metres off the ground.  *(half a day)*
2. **`__shot` and the fog ease.**  Small, and everything after this is
   unverifiable without them.
3. **Mount, ground movement, dismount.**  Ride the dragon at a walk around the
   school ground.  The card, the two options, the seat offset, the three
   dismount paths, the animal's clocks freezing and resuming.  No flight yet.
4. **Flight.**  Take-off, throttle, the heading lag, altitude, the ceiling,
   landing.  This is the biggest single piece and the one that will need the
   most tuning against a real frame.
5. **The aim march**, drawn as a debug marker only, no fire.  Checked headless
   against `heightAt` before anything is thrown along it.
6. **`F`.**  The jaw override, the envelope, the cast, the airburst flag.
7. **The edges of §7** — pets' distance, the touch row, the hint line, the
   README, and the shadow ellipse if it turns out to be missed.
8. **The four frames and the flight video.**

Steps 1–4 are the feature; 5–6 are the brief's third sentence; 7–8 are what
makes it part of the town rather than a demo bolted to it.
