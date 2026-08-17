# NEXT.md — handover

Working document for whoever picks this up next. **Read `CLAUDE.md` and
`README.md` first** — every trap, convention and camera position is already
recorded there and this file does not repeat them.

**Four** briefs have been worked to now, and the fourth is described in the section
directly below this one — read that first if you are picking up from it, because it
changed one thing about how this world is built rather than only adding to it.

Three briefs have been worked to. The first grew the world from one level crossing
into a complete Japanese suburban neighbourhood — school, shrine, shopping
street, drainage channel, overbridge, richer housing. The second **densified** it
— more and varied housing, back streets, a library, Showa-era shops, a phone box,
a festival ground — and took the canal round the planet the way the train goes.

The third, this round, asked for two things and they turned out to be one: **double
the school**, and **put a large area of low hill behind it** — not a peak but a
broad rolling range, comparable in area to the town, running from behind the school
and *across the railway*, with a tunnel through it. The two are one brief because
the school could only grow north and east into ground the hills wanted, and the
hills could only be reached through the school.

Throughout: **no people anywhere** — not as geometry, not as silhouettes, not on
posters, ema, noren or signage. The environment carries all the narrative.

---

## The fourth brief — ひばり湖, the lake on the far side of the hill

The ask was a large lake area on the other side of the school's back hill, roughly
the size of the town's residential district, natural rather than a resort: a
lakeside park, a timber trestle, a boat station, a cafe, a small campsite, a bird
hide, a water god's shrine, a low dam with a spillway, a narrow lake road, a few
vehicles, and a new lake-view platform on the hill, all connected to the existing
road and trail systems.

**Four findings from it are worth more than the district itself.**

**1. The projection decided the geography, not the brief.** "Behind the hill" means
south of the crest, and the equirectangular bake squeezes *x* by `cos(z / R)` —
0.37 at z = −190, where a 4.4 m car is 1.6 m long. There is no lake behind the
crest that is not a diorama. The east shoulder is the divide instead. **Check
`cos(z / R)` before siting anything with a vehicle or a building in it**: 0.79 at
the supermarket is the worst this world has accepted.

**2. Water above the datum, not below it.** The 用水路 is a hole in three
cooperating layers. Doing that for a 110 m lake with an irregular shoreline is not
proportionate, so the lake's surface is flat at `groundY + LEVEL − TERRAIN_DROP` and
the shoreline is the *contour* where the hill field crosses that level. Nothing in
`street.js`, `planet.js` or `landform.js` changed. `README.md` has the full
argument; the practical consequence is that **depth is a function** and everything
downstream reads it.

**3. A lake fails globally and renders nothing.** This is the finding to remember.
Every previous bug here was local. Water finds the lowest point on the whole rim,
and a 0.3 m notch drains the basin with no visual change at all. The first rim was
seven elliptical summits — the way every other hill in this world is made — and
twenty of the shoreline's thirty-two stretches had ground *below* the water within
two metres of the shore. The fix was to derive the rim from the shoreline so that
no-spill is structural, and to write `lakeLeakCheck` (a flood fill on
`field < LEVEL`), because per-point freeboard passes while a gully twenty metres out
drains everything.

**4. The flood fill found two things nothing else could, again.** The 見晴台 was
sealed by its own balustrade — a railed platform is a solid object from underneath,
so the trail could not pass under it — and the 湖畔遊歩道 ran *through* 喫茶
みなも, which showed up as one unreachable waypoint on a brick rest area forty
metres away. Neither appeared in any frame. **Bucket the colliders on an 8 m grid
before running the fill**: at 2 731 of them a naive fill is 3 × 10⁹ operations and
it wedged the page badly enough that `location.reload()` timed out.

Also worth knowing:

- **`naturalAt(x, z)`** is new and exported from `hills.js`: what the range would do
  before the lake touches it. Every number in `DAMS` and `CHANNELS` was read off a
  map dumped from it, and once `lakeGround` is in the lattice there is no other way
  to ask where the valley mouth is.
- **`ROUTES`** is `TRAILS` with a per-route bench width and an optional designed
  longitudinal profile. A road needs the profile; a hill path must not have one.
- **The scatter fields were appended to, not regenerated.** Widening `MICRO`,
  `FINE`, `ULTRA` and `COVER` to the new window would have re-drawn the same RNG
  stream and moved every bump on ひばり山 — which moves 560 trees, re-tones 43 000
  facets and re-cuts every benched trail on a range that is finished. Second sets
  with their own seeds, overlapping the old edge.
- **A camera seated by `heightAt` inside the lake is under the water**, and
  single-sided water is invisible from below. Two of the first six positions were.

### What is left at the lake

- The four water-surface layers are static geometry plus three drifting lanes and
  six ripple rings. A **train-streak-style reflection** of the wind on the whole
  surface — the canal's trick, generalised — would be cheap and is the obvious next
  thing. It needs a `planetRigid` hub, not `mesh.position.x`.
- **The boat hulls are 2.9 m and read as coloured slabs beyond about twenty
  metres.** They are built from joints and are correct close up; what they lack at
  distance is a sheer line. One more member along the gunwale would probably do it.
- **Nothing on the lake moves except the water.** A boat rocking on the dock, or the
  four 水鳥 drifting, would be the single largest gain per line — but see the note
  in `lake.js` about why the birds are deliberately still.
- The east and north shores have no path by design, which is right, but they also
  have **no way to be seen close up**. A viewpoint on the north rim, looking south
  over the water with the railway behind it, is the one frame the district is
  missing.

---

## Where it stands

**Twenty-six districts**, built, connected and walkable, and **forty-four parked
motor vehicles and fourteen scooters** distributed over all of them.

The lake needs its own fill window: **261 870 cells over x 84…300, z −172…−8** from
a seed on the school's outer road at (89, −60), with all 31 of ひばり湖's waypoints
reached — about 9 s with the colliders bucketed. The figures below are the town and
the hills.

**796 858 grid cells reachable from the spawn** over x −170…170, z −200…130, and
every FLOODFILL waypoint in every district header is reached — plus, this round,
both tunnel bores end to end, all four portal mouths, all four 待避所, both
maintenance gates and all four viewpoints.

**That number is not comparable to any earlier one** — the bounds tripled with the
hills, and they had to: the tunnels are at x −132…−96 and 108…138 and the massif's
back ridge fades out at z ≈ −186. The check that means anything is the waypoint
list.

The hills add one figure that is worth quoting on its own: **`hillAt` is exactly
0.00 over all 1 435 colliders and platforms standing on ground the hills are
forbidden to touch**, sampled at 13 263 points by `hillSafety(world)`. That is the
invariant the whole design hangs on, and it is checked rather than believed —
because the last time this world had relief on it, the failure mode was 7 346 m²
of green cutting up through the roads and nobody noticed for months.

**Mind the fill's bounds.** In the *old* window (x −95…85, z −85…115) the same
world reads a much smaller number and always will; every earlier round quoted a
different window again. Quote the bounds and the tool with any number here, and
re-derive rather than compare.

The most recent round is **東山トンネル** — the second railway tunnel, the
clearance bug that had been in the first one since the day it was built, and
making both of them walkable. It is the section immediately below.

The sections below that are the rounds in order: the canal-and-densify round, the
onsen street, the prop-placement pass, **the six residential blocks**, then
**学校前通り** — the school route between the canal and the gate — and
**川端の道**, the lane between the canal and the school's back wall, then
**機動車**, the town-wide traffic pass, **ひばり台六丁目**, the community-bus
turnaround at the north-east edge of the town, **球体化**, which took the low
relief out of the planet, **四件**, four reported placements and the two latent
bugs behind them, and finally **ひばり台七丁目 — スーパー さかえ**, the
supermarket and its roof car park, which is the most recent work.

Then **ひばり山** — the back hills, the expanded school and the railway tunnel —
and **東山トンネル**, the second bore.

Then **電動バイク**, the first thing in this world you can ride: a 原付 summoned
with `V`, mounted with `E`, run at one and a half times a run.

The newest work is **取出口** — the vending machines' delivery port, which was a
printed panel rather than an opening, so the can every one of them has dropped
since the day they were built fell inside the machine. It is the section
immediately below.

**The planet is still a true sphere and `RELIEF` is still 0.** The hills are a
*third* surface over the terrain grid and the sphere, not the old relief turned
back on; the reasoning is in `hills.js`'s header and summarised below. Nothing in
`planet.js` changed.

---

## 取出口 — the drink that never dropped

Reported as "the vending machine doesn't dispense". It was not the animation,
which was correct, and not the wiring, which was correct: `dispense()` released
the can at `front - 0.14` and the body is a solid `BoxGeometry` 0.72 m deep, so
the can was **0.14 m inside the machine** for its whole 1.9 s fall. Measured
before touching anything — `can.position` reads `(-0.2, 0.21, 0.221)` against a
body half-depth of 0.36.

The 取出口 was a *printed panel*: a 0.62 × 0.24 m plate with a black bar painted
on it, on the front face. So this is the same rule as the onsen street's 格子
screens — **you cannot carve a recess into a box** — except that the usual answer,
build the depth outward, cannot apply, because a delivery port is a hole. The
body is five boxes with a notch out of the front now, merged into one mesh:
`hullOutline` draws a contour per mesh, and five meshes would ink every seam
across the front of the machine. The notch is lined — dark back, sides and head,
a lighter tray floor, because a can landing on black stops being a can.

**Two proportions in it were derived rather than chosen, and both took a pass to
find.**

- **0.165 tall against 0.11 deep.** A pocket can only be seen into along a sight
  line shallower than `atan(height / depth)`; steeper than that and its own head
  cuts the tray off. The first cut was 0.135 over 0.17 — 38° — and the machine's
  collider stops the player 0.54 m from the face, where the eye looks down at
  70°. So the can was invisible *from the only place you can stand to press E*,
  which is a different bug with the same symptom as the one being fixed. 56.3°
  now: the mouth is open to a standing eye from about a metre out.
- **The flap is fixed and translucent, not hinged.** A swinging one was built
  first and cannot work at that depth: hinged at the top it sweeps the whole
  pocket, and 0.11 m of pocket against a 0.066 m can leaves an inward flap
  either through the back liner or through the drink. Deepening the pocket to
  make room is exactly what the paragraph above forbids. Smoked plastic at 0.40
  opacity is better anyway — it is what the real thing is made of, it never
  fights the can, and it means the drink reads from *any* distance instead of
  only from far enough back to see past the head. The motion the interaction
  needs is the can falling, which is what was asked for.

And the drink itself is **emissive**, at 0.42. The pocket is a hole the sun never
enters, so everything in it sits on the cel ramp's bottom band under a violet
tint: a light can and a dark liner came out within a few per cent of each other
and the drink read as a smudge in the 取出口 lettering. The lettering also moved
to the top third of the flap, because the can lands in the bottom half and type
across a drink makes it read as broken type.

Two things fell out of it that were nobody's report:

1. **Three of the five selection buttons in each row had never been visible.**
   They were at y 0.16–0.35 across x −0.45…0.59; the port panel was at y
   0.10–0.34 across x −0.51…0.11 — *the same plane*. The panel won. Nobody
   misses a button on a machine with ten of them. The buttons are a narrower
   block in the one clear band (y 0.285–0.395) now, and all ten are visible.

2. **Two presses drove one can.** Both call sites (`addVending` and the corner
   shop's `shopState`) keep a list of live steppers and push one per press, so a
   second press ran a second animation over the same mesh and the older one
   hid a can the newer one was still dropping. A press supersedes the one
   before it, by token, inside `makeVendingMachine` — so neither caller had to
   change.

Nineteen machines share this geometry, so the fix is one file. Check it at the
vending corner (`restm`), where three of them stand two metres from the player.

**Verified without a render, because the browser tooling was down.** The question
the bug is actually about — *can you see the can?* — is a line-of-sight question,
so it can be asked numerically: build the machine headless (`document` stubbed
with a proxy that no-ops every Canvas2D call, since none of the geometry depends
on what the canvas contains), step `dispense()` frame by frame, and fire a ray
from a player standing 2.4 m off at eye 1.35 to the can, stopping just short of
it — skipping anything whose material is `transparent`, because a 40 %-opaque
flap does not hide what is behind it. **147 of 156 frames clear, 94 %**, and the
nine that are not are the right ones: the can is still up in the chute. A probe
straight into the port comes back at z = 0.264 against a front face at 0.361, so
the hole is a hole. Worth keeping as a pattern — "is this thing visible" is a
raycast, not a screenshot, and it works with no browser at all.

---

## 電動バイク — the first thing you can ride

A small round, and the first one that adds a *verb* rather than a place. `V`
stands a 原付 in front of you, `E` gets you on, and riding is the same
first-person camera dropped onto the seat at **1.5 × a run — 7.65 m/s**, checked
rather than asserted: hold `W` for three seconds with the world stepped by hand
and `hypot(vel.x, vel.z)` reads 7.650 against a `runSpeed` of 5.1.

`world/ebike.js`, `core/player.js`'s `RIDE` block, and an opt-in `cockpit: true`
on `makeScooter`. Four things are worth carrying forward.

1. **It cannot be a district, because it is placed after the bake.**
   `bakeToPlanet` folds every mesh's geometry into root space and clears the
   container transforms; `planetRigid` exists for the things that animate *in
   place* and re-seats them once. A machine summoned at an arbitrary point and
   then driven is neither, so it is built in `main.js` after `buildWorld` and
   re-seated every frame exactly the way the bake re-seats a rigid rig —
   `basisAt` for the tangent frame, `positionAt` for the position. Everything
   inside it is in flat authoring coordinates like every builder in the world.

2. **The rider's side of the machine did not exist.** Not a bug — an absence.
   Every scooter here is authored to be read from eight metres outside, and
   `makeScooter`'s own comments say which five features carry the silhouette at
   that range. From the seat, 0.8 m behind it, the machine is a bar cowl, the
   back of a legshield and two mirrors: three blank faces. The fix is a
   speedometer, brake levers, an ignition barrel and the 荷物フック, opt-in so
   the twelve parked ones are untouched and pay nothing, and merged into the
   same bake so it costs no draw call. **The first thing added went straight
   inside the cowl** — the levers were written at `|z| = 0.15`, which is exactly
   the cowl's half-width, so a machine with no visible brakes. Third time for
   that one; the trap table has it under the onsen street's 格子 screens.

3. **A 0.34 m disc is not a 1.65 m machine.** The walker collides as one disc at
   the eye. A rider has 1.25 m of scooter in front of that, so riding into a
   wall puts the handlebars inside it — and the handlebars are the bottom third
   of the frame. `RIDE.nose` is a second probe at the front axle, resolved with
   its own radius and the push *translated* back into the body rather than
   turned into a pivot: a slide is stable in a corner, a rotation is not. It is
   visible in the numbers straight away — the first ride up the main street
   stopped 3.45 m out, exactly 0.92 m short of a parked kei van's collider.

4. **Both bank signs were derived and then read back, not eyeballed.** The
   camera's +Z points backward, so a positive `rotation.z` tilts the head
   *left*; yaw also grows to the left, so the camera's bank takes the turn rate
   with no sign flip, while the machine — whose local +z is the rider's right —
   takes it inverted. A banked frame looks entirely plausible either way round,
   so the check was steering left and right under a stepped clock and reading
   `player.roll` and `inner.rotation.x` back: `-0.083 / +0.199` turning right,
   `+0.082 / -0.197` turning left.

`V` used to be the orbit view; it is `P` now. Both HUD hint lines, the pause
menu's control strip and the README table moved with it.

Left undone deliberately: no sound, no battery, no third person, and the machine
is not parked anywhere in the world when you are not using it — it is summoned,
which is the one openly unrealistic thing here and the reason it does not need a
home. If a later round wants it to have one, the obvious place is 六丁目's 月極
bay 2, which `rokuchome.js` leaves empty on purpose.

---

## 東山トンネル — the second bore, the clearance, and walking into a tunnel

A round about one object that had three separate things wrong with it, and the
worst of them had been there since the day the object went in.

### 1. The first bore's cross-section was wrong, and nothing could ever have shown it

`boreProfile` read

```js
pts.push([Math.cos(a) * T.half, T.spring - T.half + Math.sin(a) * T.arch]);
//                              ^^^^^^^^^^^^^^^^^^
```

so the arch's centre landed at y = **−0.1** instead of on the springing line at
3.2. The consequences, none of which threw or logged anything:

- the crown was at **3.20 m**, not the 6.5 the constant said;
- the side walls had a height of *minus ten centimetres*;
- the train's roof (3.96), its roof pods (4.24), its pantograph (4.88) and both
  catenary wires (4.88 and 5.95) all ran through solid rock — the messenger wire
  by **2.78 m**;
- `buildPortal`'s arch hole had the identical expression, so the opening was
  3.62 m tall against a lining 3.20 m tall;
- and everything hung off `CROWN` — the rigid conductor and its brackets — was
  computed from the *constants*, so it floated 2.75 m above the real ceiling,
  inside the mountain, where nothing can be seen.

It survived because a tunnel with a train in it is a dark hole with a dark shape
moving in it. **A rendered frame of a tunnel mouth looks exactly the same whatever
the ceiling is doing.** The fix is one expression and a numeric check:
`boreClearance()` in `tunnel.js` samples the train's own envelope — read off
`train.js` rather than assumed — against the lining and returns the worst gap. It
read **−2.78 m** before and reads **+0.524 m** now, at the messenger wire, on both
bores.

The knock-on: `copeY` was capped at `CROWN + 1.9`, which was a comfortable 5.1
above a crown at 3.20 and is 1.48 m above one at 6.50 — the 扁額 overlapped the
arch ring. `CROWN + 2.6` gives 2.18 m of wall above the extrados, which is the
proportion a 坑門 actually has.

### 2. The siting was wrong, and the survey says so in one number

Sampling `hillAt` along the whole equator, in the band between the railway and the
drainage channel:

```
              south of the line (z −18…−9)     north (z 9…40)
west arm         0.0                              10–12
east col         0.0                               9–10
```

The **0.0 is everywhere**, on both sides of the planet, and it is not the summits'
fault: the channel's corridor holds the ground flat from z = −30.5 out to z = −10
at every longitude, so most of the 24 m between the two rings is forbidden to
rise. A range cannot cross a railway if the ground beside the railway is not
allowed to stand up.

So the round did three things:

1. **A bore may now narrow the channel's corridor at its own longitude** —
   `nearBore(x, pick)` and a `narrowChannel` flag, 14 m → 11 m. That is also what a
   drainage channel through a col actually looks like: a narrow valley floor with
   the hill coming down to it.
2. **`TUNNEL`/`NOTCH` became `TUNNELS`/`NOTCHES`**, and every consumer takes the
   union — `nearBore` and `inNotch` here, and in `railway.js` the lineside fence
   runs (through a new `trimRun` that subtracts every bore *and* every gate
   opening), the masking walls and the catenary mast skip. The mast one is the
   dangerous one: a 6.6 m mast standing inside a lining cannot be seen from
   anywhere outside the mountain.
3. **東山トンネル goes through the east shoulder's col**, x 108…138, where E2
   (124, −48) is south of the line and E3 (122, 20) north, and a new summit E2b
   (123, −13, rx 60, rz 15, h 13) fills the band between the railway and the water
   once the corridor lets it. Both flanks now carry 6–8 m at the portal planes and
   9–10 at the crest.

**The old bore stays**, at the user's decision, and the two are deliberately
opposite at every point — spur against col, 片切り against a two-sided cutting,
walkway south against walkway north, gate south against gate north, and each pair
of viewpoints mirrored. Two portals on a 1 005 m loop are only worth having if a
player who has seen one does not think they have walked back to it.

### 3. You can walk into both of them

The bore used to be sealed by a single collider over the whole notch — correct
while a tunnel was a thing you looked at, and the third of this round's tasks.

- **The collider is a shell**: the notch's four edges, the two portal planes split
  across the arch, and a wall down each flank of the bore, stepped back at the
  refuges.
- **The walkway is 1.35 m and 0.50 m up**, with a kerb, a handrail broken at each
  refuge, and three treads down to the cess at each end. A player on it is at
  |z| ≥ 2.29 after their own radius against a train body half-width of 1.43, so a
  train passes **0.86 m away and does not go through them**.
- **The ballast is two platforms** (0.26 over the sleepers, 0.13 on the shoulder).
  Without them the player walks the bore *inside* the prism with the railheads at
  ankle level — which nobody had ever seen, because there was no way in.
- **A 保守用通路 gate** breaks the lineside fence on each bore's walkway side, with
  a leaf standing open, a plate on it, gravel through the opening and a worn line
  along the cess to the portal. Both positions are constrained rather than chosen:
  the west one clears its own viewing platform's railing, the east one is outside
  its cutting's retaining kerb, which is a wall.
- **Light has to be drawn.** There is no occlusion in this pipeline, so a `cel()`
  surface inside a mountain is lit by the sun: the first walkway came out as the
  brightest thing in the frame. The bore's own concrete is `flat()` and darker, and
  the lamps are a hood, an emissive face and a pool of warm on the ground.
- **Detail sized for two metres**: ring joints built as real swept faces by
  alternating each lining ring 65 mm in and out, 待避所 that are one ring set back
  0.9 m (so the recess's back, soffit and both cheeks fall out of the same quad
  strip), cable ducting and a drainage channel on the far wall, and 距離標 /
  覆工番号 / 保守用通路 plates.

### What this round's bugs were

Same lesson as every other round.

1. **The cross-section**, above. Nine years of frames, none of which could show it.
2. **`plantRange` rejects any face steeper than 0.9, and every engineered face is
   steeper than that** — cutting banks, a cap's flanks and a col's ridge are all
   1.3–1.9 by construction, because that is what `slopeLimitAt` allows inside the
   ring corridors on purpose. So all of them rendered as large unbroken areas of
   the bare-earth tone: 45 % of the overlook's frame, 60 % of the gate's, a third
   of the railside spot's. `dressFaces` scatters scrub, boulders and tussocks over
   exactly the ground the range's own planting refuses.
3. **`hillMeshY` answers with the flat grade inside a notch**, so the rock and
   tuft builders seated everything meant for a cap fifteen metres under it. Both
   take a `yAt` now.
4. **A cap's tone table cannot be the hill field's.** A knoll rises 11 m in the
   fifteen between the track and the notch's edge, so at the field's own 0.78
   slope threshold nearly all of it went to bare earth, and its 8.6 m height
   threshold put all of it in the deep green while everything around it was turf —
   from directly above the col it read as a separate dark object sitting on the
   range. 1.05 and `crestEnd + 0.8`.
5. **The overlook was fenced in by its own railings.** The flood fill reported it
   unreachable with the ground one cell outside it fully walkable: three of its
   four sides were railed and the fourth faced a 1.5 slope the fill will not climb.
   A railing 0.09 m thick takes 0.86 m of ground once the player's radius is on
   both sides — the whole width of a ridge top. Which side is left open is decided
   by where the ground lets you walk up, and it is not the same for a bank (the
   back) as for a ridge (along the crest).
6. **And its rail was on the arrival side**, from `V.z - look * 1.25` where the
   sign should be `+`. It renders identically either way.
7. **`railway.js`'s masking wall was 1.6 m behind the new viewing spot.** The east
   runs reached x = 92 and the gate (85) and the spot (91) both went in behind
   2.2 m of concrete. Three renders were mis-read as a bare cutting bank before a
   ray came back with `parent: 'railway'` at 1.96 m. The only route to the gate was
   a one-metre gap between the wall's end and the cutting's kerb — which the flood
   fill found and no human would. Both east runs stop at 80 now, along the town's
   own frontage, and every masking run gets a pier at **both** ends.
8. **A cap whose notch depth is not a multiple of its z step overshoots it.** The
   west notch is 39 m deep and `round(39/2) = 20` steps of exactly 2.0 finished a
   metre past it, overlapping the hill mesh. One division.
9. **A `CylinderGeometry` laid along z needs `rx`, not `rz`** — the overhead
   brackets, exactly as the trolley bay's guide rails in 七丁目.
10. **A tonal band change in the middle of a lining ring** is a hard vertical edge
    on a smooth wall with nothing to explain it. From a metre away it read as a
    pale panel stuck to the bore. On a joint it reads as the joint.

### The ten reported placements

A pass over ten camera positions the user sent, and eight of the ten are a *class*
rather than a one-off — which is the same ratio every reporting round here has had.

| where | what | why |
|---|---|---|
| 東山's bore | a wedge of concrete across the mouth | the arch hole's base lay exactly on the shape's own bottom edge, so `triangulateShape` filled the opening with four huge triangles. **All four portals.** The contour is held 0.45 m clear of the hole now. |
| 七丁目's passage | a bench with two sign posts through it | the bench was centred 0.2 m from posts at z 65.6 and 66.6, and standing on the slotted channel as well |
| 七丁目's spur | the road ending in a notched corner | a T junction paved to the two centre lines, so its south-west quadrant was never paved |
| 学校前通り's west wall | pots with no backs, and a notice board nobody could see | the wall face is x = −1.40 and *outward is +x*; four of the five props went in at −1.44 to −1.60 |
| the school gate | a flower bed in the doorway | two of them, in fact: one on the approach apron half a metre off the gate's axis, one 1.3 m inside the opening |
| the gymnasium | canopy stays braced against nothing | written as a centre and an angle, so one end was at the canopy and the other a metre out in the air. Both canopies. |
| the 中庭 | two benches facing walls | one `ry` used for a pair on opposite sides of a courtyard |
| the 中庭 | the 案内図 growing through its own frame | `makeGuideBoard` leaned its panel 0.12 rad about its centre — every one in the world |
| ひばり山's yard | the 軽トラ inside the tool store | 0.47 × 1.30 m of overlap; there is no gap on that yard it fits across, so it stands along it |
| the 展望台 | two benches facing away from the view | under a comment reading "two benches facing the view" |

Verified after: `hillSafety` **0.00**, clearance **+0.524** on both bores,
**796 843 cells** and 30/30 waypoints over the same window, production build clean.

### What is left on it

- The col's south ridge is at the corridor's own slope allowance of 1.9 on both
  faces, so the only path onto it is a zigzag with one 0.95 pitch of 丸太階段.
  That is honest — it is a 隘路's shoulder — but it is the steepest maintained
  path in the world by some way.
- Neither bore is lit at dusk. The lamps are drawn, not switched; the world's
  staggered dusk ramp (さくら坂, 湯の坂) would suit them.
- The east shoulder still has no *district* on it — 東山トンネル is the first thing
  built there, and everything x 100…165 north of the col is still backdrop.

---

## ひばり山 — the back hills, the tunnel, and the school that doubled

The largest single piece of work since the planet, and the only one that added a
new *mechanism* rather than more content: the world now has ground that is not a
plane, and a player can walk up it.

### What the round produced

- `src/world/hills.js` — the height field. A piecewise-linear surface over a 3 m
  triangular lattice, 40 446 m² of it above zero, highest point 17.9 m. Also the
  drawn mesh (three tones, non-indexed, flat-shaded), the trail polylines, the
  ribbon builder, the forest, and the safety check.
- `src/world/urayama.js` — the district: 89 m of hill-foot road, the school's
  back-gate transition, 117 m of 遊歩道 with two flights of 丸太階段, a boardwalk,
  two plank bridges, the 展望台, the 山ノ神, two clearings and a maintenance yard.
- `src/world/tunnel.js` — 36 m of bore, two 坑門, the liner, the cuttings and two
  places to watch a train from.
- `src/world/school.js` — doubled: x 10.6..84, z -41..-86, 3 303 m² against
  1 498. Second block, annex, 渡り廊下, 中庭, store, relocated gym, 968 m² ground,
  staff bays, back yard, two new gates.
- Appended to `textures.js`: eleven generators, including `specialRoomTex`'s six
  interiors and `deckPanel`, whose bearings are the measured ones.
- Five vehicles in `traffic.js`, **all off the carriageway**.
- Two small edits elsewhere, both commented where they happen: `approach.js`
  loses the railing across the road's old dead end and two of its six screen
  trees; `railway.js` pulls its west masking walls back to x = −80, its west
  lineside fence back to the east portal, and skips catenary masts through the
  bore.

### The three decisions everything else follows from

**1. The hills are a third surface, and the other two are not touched.** The
obvious approach — turn `RELIEF` back on — is the bug the previous round spent
itself fixing: the sphere carried the relief, the terrain grid did not, and the
green came up through the roads. Displacing *both* does not work either, because
the road, every lane and every pad in the world are authored against `groundY(z)`
alone, which is a function of latitude only. So `hillAt(x, z)` is added to the
height *queries* and the drawn hill is its own mesh, sitting in exactly the
relationship to the reference plane that the flat terrain grid has. Where the
field is positive the mesh is above the grid; where it is negative it is buried.
They meet along a contour, which is a line and not an area.

**2. The lattice is what makes it low-poly *and* exact.** Both the mesh and
`hillAt` read the same node array through the same two-triangle interpolation, so
the walkable surface and the drawn surface are the same surface with no clearance
fudge anywhere. That is also what let the tunnel's cap meet the hillside exactly:
the notch's four edges are lattice lines, and the cap samples `fieldAt` along
them.

**3. Gentle is enforced.** A slope limiter lowers any node standing more than
`maxSlope · CELL` above a neighbour, until none does. It only lowers, so every
keep-out guarantee survives it. 0.52 outside the two ring corridors and 1.9 inside
them, because a railway cutting is steep on purpose.

### What it cost, in bugs

Every one of these threw nothing and logged nothing, which is the pattern this
project has had from the first round.

1. **The toe of the massif came out at 40-45°.** The keep-out mask was doing the
   shaping: a 13 m ramp multiplied by a 16 m bump climbs out of flat ground at
   0.78, measured at x = 30. Widening the ramp does not help — going 0 to 16 m in
   44 m averages 20° whatever shape you pick. The slope limiter is the fix.
2. **…and then the toe came out as a perfect plane.** A limiter pinned along a
   straight line produces a perfectly uniform ramp: the same height at x = 0, 30
   and 60, to the centimetre, and no oblique route up it. Stepping the keep-out —
   the town's rectangle stops at z = −80, only the school and its roads reach −96
   — puts a twenty-metre kink in the pinned line and the toe crosses the map on a
   diagonal. That diagonal is what the main trail traverses.
3. **The hillside had no shading on it at all.** Coplanar facets all land in the
   same cel band. Fixed with geometry, and the first attempt at that was two
   octaves of plane wave, which gave every ridge the same bearing and had the ink
   pass draw three straight lines down the slope. 170 scattered bumps instead.
4. **A hundred square metres of the toe was painted bare earth.** The facet-tone
   test used the biggest drop across the triangle's three edges, and on a uniform
   ramp the diagonal falls twice as far as either side — 1.04 reported for a 0.52
   slope. It has to be the facet's own gradient.
5. **The tunnel portal came out as a dam.** The cap blended from its crest to
   `hillAt` at the notch's z edges, so at the portal planes it stood 9.6 m over the
   whole 39 m width against a hillside at 2.3 — a lens 39 m wide and 11 m tall to
   close. A Coons patch from the four boundary curves collapses the lens to the
   knoll's excess over the terrain.
6. **…and then it came out as a 13 m grey tent**, because the concrete ran up to
   the cap's edge, which is a bell. Two extrusions split at the coping line.
7. **The 展望台's stair, rail gap, panel and four of five trees were on the view
   side.** `+z` is the way the deck looks. The flood fill found the stair before a
   render found the trees.
8. **The first flood fill never finished**: 53.6 M visits for 770 k cells. A
   visited set keyed on the cell with a height *tolerance* ping-pongs forever on a
   slope. Key it on (cell, height bucket).
9. **And it wedged the page.** 900 k cells is ~40 s of synchronous JavaScript,
   which is past every timeout in the toolchain; the run left the renderer so stuck
   that `location.reload()` timed out and the dev server had to be restarted. Run
   it in `setTimeout` chunks and poll `window.__fill`.

Five cherries had to come out of the school ground — they stood at (54, −46.4),
(54.2, −58.6), (35.4, −66.2), (13.2, −70.4) and (24.6, −71.6), which after the
expansion are the middle of the pitch, the middle of the pitch again, the 2 m
passage between the block and the ground, the staff car park, and inside the
管理棟. Two are replanted in the 中庭's tree pits. Nothing is planted *on* a school
ground, and nothing was, once it was big enough for the trees to be in the way.

### What is left on it

- The massif's far south fringe (z < −160) is fading terrain with nothing on it.
  It is over the horizon from every reachable point and it is *meant* to be
  scenery, but if a later round wants a second way up the hill, that is where the
  land is.
- The east shoulder (x 100…165) has no district on it at all — no path, no
  furniture, no reason to go there. It is backdrop for 二丁目 and 六丁目 and it
  does that job, but it is the largest piece of unused ground in the world now.
- The bore is straight and 36 m long, so from one portal you can see daylight at
  the other. That is correct and rather good; it does mean the *inside* of the
  tunnel is only ever seen with a train in it or as a bright arch.
- The 展望台 is 13 600 draw calls. Nothing is wrong with it, but it is the frame
  to measure against if the renderer is ever optimised.

### The state of the earlier rounds

The sections below are those rounds, in order, and they are unchanged.

---

**The planet is a true sphere.** `RELIEF` in `planet.js` is 0. It was a
one-symptom, one-cause fix — the sphere carried the relief and the terrain grid
did not, so the green surface was cutting up through the roads and the parked
cars — and it is written up in its own section below. Every mask and pad that
used to hold the relief off built ground is kept, and inert.

Earlier state, kept for the reasoning: twelve districts, 150 700 cells.

### 用水路 now circles the planet

The channel is authored exactly the way the railway is: a straight line of
constant `z` spanning one full `CIRCUMFERENCE` in `x`, so the equirectangular
bake closes it into a seamless latitude circle 1005 m round at `z = -24`. Four
consequences, and every one of them is load-bearing:

1. **`landform.js` no longer bounds `x`.** The excavation is a continuous band
   right round the world, so `inTrench` is a latitude test and nothing else.
2. **`reliefAt` needed a second corridor.** Both rings are dead flat in `z`, so
   without one a hill comes up through the revetment somewhere on the far side.
   Deliberately tighter than the railway's — 7–20 m against 7–26 — because the
   made ground only reaches 6 m either side and widening it flattens the low
   hills behind the school, which are most of the background mass looking north.
3. **The structure runs the whole way and the dressing does not.** Revetment,
   bed, bank slabs and water go all the way; coping, service paths, retaining
   kerb, railings, planting, reeds and signage stop at `D_W = -58` / `D_E = 44`.
   That division is a cost decision as much as a taste one — see *Performance*.
4. **The street had to cross it**, and that is the single biggest new piece of
   civil engineering in the project. こばと橋: graded fill either side, a deck
   over the channel, parapets over the excavation exactly, edge upstands, and two
   steps where the south bank arrives 0.34 m above the apron. The made ground is
   flat at `Y0` because a canal is flat; the road climbs 0.64 m across the
   corridor on its way to the school. Neither can move, so the bank stops.

Three more crossings so the eastern half is worth walking: **なかて橋**, a plain
2.5 m field slab with kerbs and no railing, and **第二分水門**, a distribution
gate with two guide piers, a shut steel leaf, a threaded stem, a handwheel and a
grated walkway. The sluice is the only part of this world that looks like a
machine, and it is the reason to walk out to `x = 30`.

### What else went in

- **ひばり台図書館** (`library.js`) — the quiet public building the district had
  no example of. Three-part frontage, 0.28 m cornice standing 0.25 m proud, a
  0.16 m string course, a glazed entrance bay hollow for 2.2 m behind its doors
  with real shelving, a counter, a lit ceiling strip and the return trolley
  nobody emptied. Ramp *and* steps onto a terrace under a canopy. Book drop,
  notice board, bike parking, one long bed, two street cherries standing in the
  paving in proper tree pits.
- **The corner** (`library.js`) — 公衆電話ボックス, the 街区案内図 and the
  recycling box on the triangle where the north lane meets the road. The box is
  built like a hero prop, which is the point: it is a metre square and has to
  hold a street corner, so the frame, the glazing, the light box, the instrument,
  the handset on its hook, the directory rack and the plinth are all real.
- **ひばり台三丁目** (`northblock.js`, `housing.js`) — a 3.2 m residential lane
  with **one of each type on it**: a corner shop with the family's flat over it,
  the relocated coin parking, a 二階半 attic house, a three-storey walk-up, a
  terrace of three with a bay each, and a single-storey house under one falling
  roof. `housing.js` is new and holds the three generators `makeHouse` is not:
  `makeAtticHouse`, `makeWalkup`, `makeTerrace`, plus the two lean-tos.
- **Two back streets** (`alleys.js`) — さくら坂裏路地, 2.1 m behind the shopping
  street's west row past five shop *backs*, widening into a drying ground; and
  駅裏の小径, 2.6 m from the canal's south bank straight to the station platform
  steps. The second one closes polish item #8 from the last round: the steps
  could only be reached by a forty-metre dogleg behind the houses.
- **Two Showa units** (`showa.js`) — レコード ほしぞら and 電器 たかの, with a
  wood-cased television, a pedestal fan, a valve radio, boxed bulbs, a crate of
  sleeves, a glazed case and two chalked boards. A photo studio was drafted and
  dropped: a Showa 写真館 window is portraits, and a photographer's window with
  nobody in it reads as a mistake rather than as a choice.
- **夏まつり準備中** (`matsuri.js`) — the festival ground, two days out. Five
  stalls up and *empty*, two canopies still rolled, the tank dry, the prize rack
  bare, a 太鼓台 you can stand on, lantern runs off the posts and the trees, a
  flag line, cable to a distribution box, rope on stakes, cones and chalked
  pitch lines.

### Recorded moves to existing content

Every one is commented where it happens with the reason. Keeping this bar is
worth more than any of the individual changes.

| what | why |
|---|---|
| houses at `(-6.4, -27.4)` and `(12.4, -26.0)` **deleted** | twelve metres of canal made ground went straight through both. The gap each leaves is not a hole in the composition — it *is* the canal, which is a far better reason for a break in a frontage than a coincidence. |
| one of them **rebuilt** at `(-15.2, -34.6)` facing +z | gives the canal's north bank a frontage instead of a field |
| house at `(10.2, 20.4)` narrowed 7.2 → 5.6 m, slid 0.8 m west | opens the 2.1 m back alley behind the shopping street. Frontage and front-door clutter unchanged; the whole move happens behind the house. |
| retaining wall `[-15, -18.4, -27.2]` → three 3.2 m panels at `[-10.6, -14.0, -17.4]` | the northern pair reached into the middle of こばと橋. The bridge's own fill retains the embankment from z = -17 to -30 now. |
| guardrail at `z = -25` **deleted** | that is こばと橋, and a bridge's parapet is its guardrail. Two of them side by side on a nine-metre deck read as a fenced-off carriageway. |
| pole 6 moved `(8.1, -26.5)` → `(8.4, -31.6)` | it stood on the channel coping. **`approach.js` anchors its own cable chain to this pole by hand — the two have to be changed together.** |
| **ひばり駐車場 moved** off the shopping street to the north block | the two Showa units needed frontage and that was the only spare on either row. A car park is a better neighbour for a library forecourt and a residential lane than for a run of shops, and the "a gap needs a reason" beat is now supplied by two forty-year-old shops. |
| grove tree `(15.2, 48.6)` → `(7.8, 51.4)` | at scale 1.8 it stood dead in front of the library's new entrance bay |
| grove tree `(43.8, 45.0)` → `(45.8, 41.0)` | a grove tree collides with a 1.42 m box, and this one was squarely across the north lane's new east arm |
| grove tree `(-19.0, -33.8)` → `(-22.6, -33.8)` | inside the roof of the house rebuilt on the north bank |
| cherry `(12.5, 23.0)` → `(5.9, 25.0)` | it had been *inside* the house at `(10.2, 20.4)` since both went in — invisible, and only surfaced because narrowing that house left the trunk standing in the new alley |
| canal shrub row pitch 7.4 → 6.2 m | the last clump landed inside the house at `(41.5, -15)` |

---

## What this round's bugs were

Same lesson as every previous round, and it is worth restating because it keeps
being true: **a clean console means nothing, and neither does a screenshot of
the frame you were working on.** Every one of these threw nothing.

1. **`heightAt` could not express an excavation.** Platforms only raise the
   ground, so the query answered with the natural grade over the whole canal
   footprint — and on the north bank the made ground is 0.34 m *below* natural.
   The player had been walking the canal's main service path floating over it
   since the day the channel went in. `ctx.cut` now lowers the ground before
   platforms raise it.
2. **The channel-edge collider had never worked.** It stood 0.3 m above a path
   0.06 m up, and `_resolve` skips any collider within a step of the feet. What
   had actually been keeping anybody out of the water was the railing — which is
   why taking the channel past the end of the railings exposed it immediately.
3. **A notice board sealed the only way into the new alley.** 1.4 m wide with the
   player's 0.34 m radius on each side is 2.08 m of a 2.1 m passage. Found by
   flood fill; invisible in every frame.
4. **Two garden walls stood inside the residential lane**, because the walk-up's
   gallery was 0.1 m off the carriageway and the attic house's frontage 0.2 m off
   it, so both of their boundaries had nowhere to go but the road.
5. **A pre-existing grove tree blocked the lane's east arm.** Grove trees collide
   with a 1.42 m box at scale 1.75; nothing in the world says so.
6. **Every window on the library was a flat grey panel**, because the reveal box
   was centred on the wall face and swallowed the painted interior — *and*
   because a `PlaneGeometry` faces +z while that frontage looks down −z, so the
   plates were back-face culled as well. One symptom, two independent bugs.
7. **The sluice walkway was walled off from both banks** by its own railings,
   which ran across its ends instead of along its edges, and stood 0.44 m above
   the path against a 0.38 m step limit.
8. **The parapets and the deck of こばと橋 read as a pile of separate slabs.**
   The road drifts 1.19 m in `x` *and* falls 0.53 m in `y` across the seven
   metres of bridge, so a run of short boxes steps both ways at once and the ink
   pass outlines every one. Rebuilt as swept quad strips.
9. **The book drop had its slot on one face and its name plate on the other.**

---

## 湯の坂 — the onsen street

A thirteenth district, on the shelf behind the shrine. The brief asked for a
*neighbourhood* onsen street and not a preserved one, so the constraints that
shaped it are all about smallness: five buildings, none over two storeys, a
carriageway of 4.8 m, and a level change you climb in six steps rather than a
hillside you survey.

What it does that nothing else here does:

- **A second street that is not the first street again.** さくら坂 is enamel,
  plastic awnings and lit sign boxes; this is timber frame, 格子 infill,
  plaster, tile and painted board, on stone laid across the run. Same palette
  family, forty years apart. It needed its own generator (`makeOnsenUnit`) --
  `makeShop`'s glazed recess behind piers is the wrong building entirely.
- **Water you can walk beside.** An open hot channel down the middle of the
  town, built as a trough *within* the made ground rather than excavated out of
  the terrain, which is what makes it a tenth of the canal's cost: no faces
  removed from the grid, no hole in the planet, no `reliefAt` corridor.
- **Restraint on the steam.** Ten soft quads over the whole district, drifting,
  and no volume. The brief was right to ask for this: fog would have eaten the
  ink pass and the frame budget together.
- **Two ways in.** The 裏参道 gate through the shrine's north wall (which the
  precinct never had -- it was a cul-de-sac) and fifteen steps down the east
  face onto the field. The street is a route, not a pocket.

Bugs this round, all of them invisible in a screenshot until you look for them:

1. **Every 格子 panel on the street was inside the wall.** They were written at
   `front − 0.04` to look recessed; the volume is a solid box, so five timber
   frontages rendered as blank plaster. Depth has to be built outward.
2. **The bathhouse's whole lobby was inside the wall too** -- lockers, scale,
   bench -- because the unit had no recess. `hollow` cuts the volume back and
   builds the returns and header round the opening.
3. **Its noren were coplanar with the doorway board** and lost the depth test
   about half the time, so the entrance came out as a black rectangle. It had
   looked right from a camera 0.6 m away an hour earlier, which is the tell.
4. **The ryokan's porch was 1.4 m off its own door**, because `doorAt` is in
   the unit's frame and that unit is turned a half circle.
5. **The terrace slab roofed the channel over.** The revetment, the coping, the
   railings and the steps down to the water were all correct and the water was
   under a lid.
6. **The viewing deck was inside a cherry**, twice, at 3.4 m and then at 6.8 m
   off it. Four metres up is the canopy layer.

Verified: 160 751 cells reachable from the spawn, and every part of the street
-- gate, both flights, the bridge, the ryokan court and porch, the footbath, the
water landing and the deck -- is on the walk. 3 895 draw calls looking west down
the street against 5 792 at the crossing, so it is not the heaviest view.

---

## The prop-placement round

Six reports, all of them things you walk into rather than things you read in a
log. Every one turned out to be a *class* of mistake rather than a one-off, so
each fix is worth more than the report that found it. The tools are the same two
as always — the flood fill, and a ray fired out of the back of the thing.

1. **Thirty-seven of eighty-seven bicycles were inside something.** A bicycle is
   1.73 m long and 0.55 m wide, and almost everywhere in the world one had been
   placed by its clearance to the wall rather than by its length: the housing
   sweep pointed all twelve of its bikes straight at the frontage, both alley
   bikes lay across a 2.1 m passage with their back wheels in the render, three
   racks had their end bike inside a building, and the two under the drying
   ground's shelter were parked inside each other. `district.js`'s was one
   swapped ternary; the rest were individual. **Zero now**, by the audit at the
   bottom of this section.
2. **Half the outdoor units faced into the wall they hung on**, because the
   housing sweep used `frontIsX ? PI/2 : 0` where the name plate two lines above
   it correctly used `fx * PI/2`. And none of them touched their wall — 0.2 to
   1.3 m off it, one with no wall behind it at all, and every `feet: false` unit
   hanging on nothing. `makeAircon` draws its brackets now, so a badly placed one
   is visible rather than merely wrong.
3. **`groundY(z)` is not the ground.** The apartment's whole forecourt — rack,
   bins, post box, umbrella stand, planter — sat 0.24 m under the lane it stands
   on; two house bicycles were sunk to their axles in the footway and one was a
   third of a metre in the air over the canal's cut bank. `ctx.groundAt` is new
   and gives the same answer the height query does.
4. **Both flights of steps off こばと橋 had been sealed since they went in.** The
   parapet ended 0.7 m from the house behind it, and 0.7 m minus twice the
   player's radius is 0.02 m. The parapets are pulled back to z = −21.4 (still
   over the excavation) and the flights moved into the 0.72 m that leaves.
5. **The passage between the two houses west of the road was a dead end**, walled
   off by the retaining wall's three panels; the 0.2 m joint between two of them
   is what makes it read as an opening. Two runs and a pier each side now.
6. **The library's doorway was behind its bin store**, and the crow net on every
   refuse point in the world was a flat green card standing beside the bins
   instead of a net over them.

Re-verified after: **112 822 cells** reachable from the spawn on the same
0.35 m grid (was 112 775 in these bounds — the passage and the two flights are
the difference), 87 bicycles with no collider overlap and no bike-in-bike, 40
outdoor units all within 0.13 m of their wall, production build clean.

---

## The six residential blocks

The brief for this round was **densify, do not add landmarks**: more housing and
more of the ordinary stuff of living between the districts that already exist,
in six named places, all joined up. Six modules, one shared kit, and the whole
thing hangs on the fact that none of them is a place you go to see something.

**The state this was picked up in is worth recording, because it is the most
expensive kind of unfinished.** Three of the six blocks — `ichome.js`,
`koenmae.js`, `yonchome.js` — were written, complete, commented and *not
imported by anything*. `blocks.js`, `plots.js` and `streetprops.js` were there
to support them; `textures.js` had carried four unused shop fascias (clinic,
pharmacy, laundry, estate agent) since the shopping street was built; and
`planet.js`'s `PADS` array had graded ground reserved for all six under the
comment "Added with the six residential blocks". The production build passed
with 50 modules and rendered a world that did not contain any of it. A module
nobody imports builds nothing, and it does it silently.

### What went in

| block | file | what it is |
|---|---|---|
| ひばり台一丁目 | `ichome.js` | 63 m of 2.4 m lane west of the crossing, in the slot between the railway's masking wall and eight frontages |
| ひばり台二丁目 | `nichome.js` | the planned block: a kerbed 38 m spine, the four services, a コーポ, a 連棟 and a 狭小住宅 on a 私道, a 月極 car park, allotments |
| 桜守裏町 | `uramachi.js` | the oldest and smallest: a 祠, a lane behind the onsen street's trees, a 長屋 四戸, one 木造平屋, a drying ground |
| ひばり台四丁目 | `yonchome.js` | the 町内会館, the pocket park, the north row — **and the main road's head** |
| ひばり台五丁目 | `tsugakuro.js` | the school's neighbourhood: a staff block, three family plots, a 送迎 bay, the two shops' backs and a 抜け道 between them |
| 公園前 | `koenmae.js` | the connective one: the link past the overbridge piers, the pocket square, ひばり荘's service strip |

Two of them do civil work rather than just housing, and both were forced by the
land rather than chosen:

- **The main road now ends properly.** `street.js` sweeps the carriageway from
  `Z_MIN` to `Z_MAX = 52` and stops, and until now it stopped in an open field
  with nothing to say about it. 四丁目 carries it 6.4 m further on the same flat
  section (`centerX` is −3.40 and `groundY` 0.45 out there, so one slab meets it
  with no seam), turns both footways round the head, closes it with a guard
  barrier and a 立入禁止 plate, and hangs its own lane off the T just short of
  the end. 桜守裏町 then cuts a 1.8 m gap in the closing hedge, so the end of the
  road has a footpath going on out of it into an older street.
- **桜守裏町 threads a gap nobody had used.** `onsen.js` built a 2.2 m slot
  between two walls from x −18.6 to −11.7 at the foot of 湯の坂's fifteen steps
  and stopped there, because at the time there was nothing east of it. That slot
  is now the west end of a street.

### What this round's bugs were

Same lesson, again, and it is the reason this file exists: **every one of these
threw nothing, logged nothing, and looked correct in a rendered frame.**

1. **四丁目's lane was laid through a building.** 米・酒 なかの stands at
   x 1.95..7.05, z 49.15..54.65 (`northblock.js`), and the block's header
   enumerated everything else in the envelope and missed it. So six metres of
   carriageway were inside the shop, the lamp pole stood in its shop floor, the
   west boundary hedge went in the 0.65 m slot between the shop and the road,
   and the block's only connection to the world was a **0.49 m pinch** between a
   grove tree and the library's boundary hedge. The flood fill found it in one
   run; nine rendered frames of that lane did not.
2. **`isSidewalk` had no bound in z.** It is a lateral test, so `streetHeight`
   reported `groundY + 0.135` for both 1.55 m footway bands at *every* z in the
   world — two invisible kerb-height ledges running out into the fields north of
   z = 52 and south of z = −66. Measured at (−7.4, 75): 0.585 against a ground
   of 0.450. Latent since the first commit and harmless until something was
   built out there, which is exactly what this round did.
3. **A walk-up's open stair came down in a 私道.** `makeWalkup` puts it 1.6 m
   beyond the local −x end, outside the mass and therefore outside
   `plotCollide`'s box; on a `face: 'x-'` block that is the *south* end. Guessed
   at rather than read, it produced a five-metre collider across one forecourt
   and a real staircase standing in another block's lane.
4. **One utility pole sealed a route in a different district.** 二丁目's west
   verge pole at (46.55, 31.4) is a 0.4 m box, and the player's 0.34 m radius is
   added to every side of it: 1.08 m of clear ground, taken out of 公園前's
   1.4 m squeeze between the park's railing and a grove tree — the only way from
   its pocket square onto 二丁目's spine. Two districts, two modules, both
   perfect on their own.
5. **Three gates were too narrow to walk through.** `plotWall` splits its run at
   `at ± w/2` and its gate posts carry no collider, so the opening is exactly
   `w` less 0.68 m. At the 1.1–1.2 m that reads well on the page that is
   0.42–0.52 m. 1.8 m is the working minimum now.
6. **Two things stood on the axis of a deliberate opening.** The gap cut in the
   road head's hedge exists to show 桜守裏町's 長屋 through it; a pole 0.2 m off
   the centre line and then a grove tree 0.4 m off it each filled the entire
   opening.
7. **A 木造平屋's yard was sealed by a tree that had to stay.** The strip between
   湯の坂's east wall and 桜守裏町's lane is 6.9 m, and a 3.6 m house with the
   2.15 m yard it needs leaves 1.15 m — less than one of `onsen.js`'s screen
   trees, whose collider landed squarely behind the gate. The right fix was to
   move the *house*, not the tree: the trees are the west side of that street.
8. **`laneSign`'s stand-off did not rotate with its plate**, so it only cleared
   the post at `ry ≈ 0` — which is why 四丁目's name plate had been placed facing
   the wrong way with a comment explaining that it had to be.

### Recorded moves to existing content

| what | why |
|---|---|
| `street.js` `isSidewalk` **bounded to `Z_MIN..Z_MAX`** | see bug 2. Anything continuing a footway past the ends lays a real `pad`, which registers a platform, so the road head is unaffected. |
| `district.js` park east railing **split for a 1.6 m gate** at z 23.4..25.0 | 児童公園 was fenced solid on all four sides with one opening on the west, which was right while there was nothing east of it. 二丁目's spine runs down that side now. |
| `yonchome.js` road-head hedge **split for a 1.8 m gap** at x −2.5..−0.7 | 桜守裏町's footpath comes down through it. Without the gap that block hangs off one lane and the road head has nothing beyond the barrier but planting. |
| grove tree `(-22.6, -33.8)` → `(-26.4, -33.8)` (`canal.js`) | 五丁目's lane runs at x −21.8 with a 3.2 m carriageway, and a grove tree at scale 1.8 collides with a 1.46 m box: x −23.33..−21.87, the middle of it. Its second move — it came off x = −19 originally, out of the roof of the house on the north bank. |
| grove tree `(-1.2, 62.8)` → `(0.3, 62.4)` (`yonchome.js`, added this round) | dead on the axis of the hedge gap |
| 四丁目: lane `z0` 49.4 → 55.6, hedge `from` 50.6 → 58.7, bed / bench / cherry / lamp pole all moved north | all four were inside 米・酒 なかの or in the 0.65 m slot beside it |
| 四丁目: the slot between なかの and the library **closed with a 板塀** | it was passable at 0.49 m, which is a gap that reads as a way through and is not one. It is the shop's back yard now, entered from the lane. |
| `ground.js` `groundMats` gains `sidewalk` / `sidewalkAlt` | anything that has to *meet* the main road must be paved out of the street's own two footway tones, and `buildStreet` keeps its copies private |
| `plots.js` `laneSign` stand-off taken along the plate's normal | see bug 8 |

### Performance

Measured the same way on both sides, from a warm page, at 1000 x 560:

| view | draw calls |
|---|---|
| 五丁目's lane, north | 7 702 |
| **the 通学路, north from the same z** | **9 277** |
| the bridge deck | 6 443 |
| the crossing | 3 614 |
| 二丁目's spine | 2 958 |
| 一丁目's lane | 1 349 |
| the library forecourt | 1 526 |
| 桜守裏町's lane | 915 |
| 四丁目's lane | 741 |

The row that matters is the second one. The heaviest view in the world is
looking north up the school road, it always was, and 五丁目's own lane 25 m west
of it is **cheaper** — because the new block screens part of what that corridor
used to show. The blocks themselves are ordinary baked meshes with an exact
frustum test, so four of the six cost under 1 600 calls in their own
establishing shot, and the floor everywhere is still the two planet-scale rings.

Scene totals after: **718 colliders** (was 453), 18 interactables (was 11 — the
月極 car park's machine is the new half's first), 12 323 geometries, 205
textures. Production build clean at 57 modules.

---

## Audit against this round's brief

| Asked for | State |
|---|---|
| **Canal circles the planet like the train** | done — 1005 m, seamless, its own relief corridor |
| Canal crossings where it meets the district | done — footbridge, road bridge, field slab, sluice walkway |
| **More housing, mixed types**: 1–2 storey detached, 2.5-storey / attic timber, 3–4 storey small apartment, compact terrace with parking, corner shop-house | done — one of each on ひばり台三丁目, plus the rebuilt canal-front house |
| Varied roofs (gable / mono-pitch / shallow / small balcony) | done — `roofKind: 'shed'` is new, plus the attic dormer and the terrace's continuous gable |
| Varied wall colours across warm white / pale grey / cream / pale blue / pink-grey / pale tea | done — `PAL.wallTea` and `PAL.wallSage` appended for the last two |
| Varied doors, walls, steps, post boxes, plates, porches, fence heights, planting | done — `porch` and `shutters` are new options on `makeHouse` |
| Apartment: regular window rhythm, external stair, uniform balcony rail, exterior pipes, bike shelter, mailbox bank, refuse point, name plate | done — `makeWalkup` |
| Per-house signs of life: drying poles, umbrella stands, outdoor AC, gas meters, water pipes, pots, mats, parcel lockers, shoe cupboards, shutters, aerials, screens, curtains, some warm windows | done — new props: `makeTapPost`, `makeStorageShed`, `makePotShelf`, `makeMailboxBank`, `makeDeliveryBox`, `makeDoormat`, `makeIvy`, `makeRecycleBox` |
| **Alleys and half-private space** between the housing, with drying space, stores, a shared tap, old bicycles, AC units, pot shelves, ivy, stacked crates, mats, notice boards | done — two of them, `alleys.js` |
| Accurate ground: gutters, covers, ramp transitions, concrete patches, bollards, kerbs | done in both alleys and the lane |
| Alleys of *different* widths | done — 2.1 m widening to 3.4, and 2.6 m |
| **Community library** between housing and shopping street | done — `library.js` |
| Library: glazed entrance, fictional name board, steps, ramp, book drop, notice board, bike rack | done |
| Library forecourt: low beds, tree shade, benches, lamp, guide board, kept plants | done — the guide board went to the corner cluster where it does more work |
| Glimpsed interior: shelves, long tables, reading lamps, counter, curtains, posters | done — `libraryInterior` 3 variants, and the entrance bay is a real 2.2 m vestibule |
| Accurate entrance / window sizes / cornice thickness / canopy / facade joints | done |
| **1–2 Showa shops** in the existing shopping street | done — two, `showa.js` |
| Record shop: faded sign, aged display window, vertical light box, disc motif, poster, glass door, cloth curtain, AC unit, boxes, blackboard | done |
| Electrical shop: vintage TV, fan, radio, bulb boxes, repair board, cartons | done |
| Fictional Japanese only, no real brands, each shop distinct | held |
| **Old public telephone box**, green, precise | done — green, `makePhoneBooth` |
| Box: full frame, glazing, top light box, instrument, directory rack, base, coin area, keypad, interior light | done |
| Box: faded colour blocks, wear, drain at its foot, notices, contact shadow | done |
| Box companions: lamp, short guardrail, recycling box, guide board | done |
| **Festival ground being set up**, not open | done — `matsuri.js` |
| Folding stalls not yet trading, timber board, hung lanterns, banner, goldfish and firework flags, half-rolled awnings, stacked crates, folding tables, empty benches, cable, drink crates, bare prize rack, empty griddle / shaver, 太鼓台 | done |
| Ground: white lines, temporary signs, rope, cones, power box | done |
| Lanterns and flags with rhythm, dusk-capable, no neon | held — lanterns are hung and unlit |
| Everything connects to what was already there, growing outward from it | held — nothing new is more than one street from something old |
| No people, no cyberpunk, no high-rise, no realistic materials, no complex interiors, no neon | held |

---

## 川端の道 — the lane between the canal and the school's back wall

The stretch the brief actually meant, and I had read it as the 通学路 first: the
36 m of ground from (55.9, −35.8) west to (19.8, −36.1), between the canal's
south kerb and the school's north wall. Dead flat at 1.05, **completely empty**
— one grove tree in 380 m² — and the largest single unbuilt parcel left anywhere
near the middle of the map.

**What the survey decided, before a single coordinate was chosen:**

- **Nothing with four wheels can get here.** The only ways in are the two slots
  either side of the house at (14.4, −35.5): 1.5 m north and 1.62 m south, which
  after the player's radius are 0.82 m and 0.94 m of walkable ground. So this is
  a lane, its buildings are the five types that never needed a car — 長屋 三戸,
  木造平屋, 連棟 二戸, 二階半, 木造二階建 — and what would be a carriageway
  anywhere else is 2.8 m of worn asphalt with a gutter down one side.
- **The frontages face the water, and out here that is also the sun.** The sun
  is at (−52, 62, 56), so +z is the warm elevation (四丁目 and 二丁目 both record
  it). Five sunlit frontages with the channel in front of them and a blank
  school wall behind you is a section nothing else in this world has, and it is
  the whole reason the parcel was worth building on rather than planting.
- **The lane sits at z = −32.2 because of one tree.** `canal.js`'s grove at
  (28.6, −34.2) at scale 1.8 collides over x 27.87..29.33, z −34.93..−33.47. At
  z = −32.6, where a 2.8 m carriageway wants to be, it comes 0.53 m into the
  south verge. −32.2 clears it by 0.13 m and still leaves 7.2 m of plot. The
  tree stays — it is the south bank's own mass and the only thing that stops
  36 m of roof line running unbroken — and the row breaks round it instead,
  which gives it a better job than it had.

**The finding that mattered most: the water's edge was unguarded for 36 m.**
`canal.js`'s retaining kerb tops out at 1.27 against a lane at 1.10 — 0.17 m,
less than the 0.38 m step, so `_resolve` skips it exactly the way it skipped the
channel-edge barrier three rounds ago. And **east of x = 44 the kerb is not
there at all**: the canal runs its *structure* the whole way round the planet and
its *dressing* only over x −58…44, which is a division this file has recorded as
a cost decision since the channel went in and which nobody had read as a safety
one. The first thing built on this street is a 0.95 m railing.

**The way down to the towpath is a 1:11 ramp**, at the east end where there is no
kerb to cut through, and it is the only bicycle-friendly way onto the water in
the world. It also produced a new rule worth keeping:

> **A ramp is a staircase to the walker and a solid to the eye.** `heightAt` is
> a max over axis-aligned boxes and cannot express a slope, so the feet need a
> run of stepped platforms — but the ink pass fires on every box's silhouette,
> so drawing that run came out as eight pale slabs with a black line between
> each, which is precisely what こばと橋's deck did before it was rebuilt as a
> swept casting. Eight platforms, one raked box.

### Recorded moves to existing content

None. Every constraint on this street was worked round rather than moved — the
tree, the kerb, the school wall and the house at the west end are all untouched.
`laneNamePlate` gained 川端の道 as variant 6, appended.

### Performance

| view | draw calls |
|---|---|
| 川端の道, east down the lane | 1 202 |
| 川端の道, west along the row | 6 508 |
| the bridge deck | 6 527 |
| the crossing | 4 683 (was 4 480) |
| the opening composition up the hill | 2 179 |

The lane's own establishing shot is the second cheapest view in the world,
because looking east you are looking at a school wall and five frontages. The
west view is expensive for the same reason the school road is: it looks back up
the whole valley. Nothing else moved by more than about 200 calls.

**201 536 cells** reachable, down 1 930 from before — which is the right
direction, because five buildings, a green pocket and a ramp now stand on ground
that was empty.

---

## 学校前通り — the street between the canal and the school

A round about one road. The brief asked for the 通学路 to stop being a road with
two shops on it and become a *street*: shops for students at the school end,
housing density in the middle, a quiet node at the canal end, and the whole
length dressed with the things a street has when people live on it.

**The finding that shaped it: there was room for exactly two buildings.** Both
sides of that 35 m were already spoken for — ひばりマート and its 9.1 × 5.4 apron,
パン工房こむぎ, two houses, and 五丁目's link, 送迎 bay and 抜け道 on the west; the
school's own boundary wall, hard against the pavement for 33 m, on the east. A
survey of `world.colliders` over the envelope left two parcels big enough to
build on and a 2.77 m verge. Getting a third shop in would have meant moving
ひばりマート, こむぎ or the school wall, and none of those is worth a shop — so
what went in is one shop on the road, one on the parallel lane, and a great deal
of street. **That is the brief's own answer anyway**: most of its list is
furniture, not buildings.

### What went in

- **こばと橋南詰** — a 3.7 × 3.3 square on the east verge at the bridge head,
  with a machine (the district's interaction), two benches turned to face the
  water, a bed, a direction post, guardrails, and **the only way down to the
  canal's towpath at this end of the world**.
- **The school verge** — 24 m of the 2.77 m strip between the footway and the
  wall: two bicycle shelters, four racks, sixteen machines nose-in to the wall,
  the association board, three more 通学路 plates, two beds, two benches, a
  gutter with its gullies and a mirror on the gate corner. The verge is
  deliberately *full* — the road's own 1.55 m footway is the route past it,
  which is what a Japanese school frontage actually is.
- **文具 ひばり堂** — the stationery shop on the last road frontage there was,
  fifteen metres from the gate: gachapon, umbrella stand, blackboard, full bike
  rack, and a back yard behind it that is landlocked and dressed as one.
- **ひばり輪業** — the bicycle shop, on 五丁目's lane where the land was, with
  eight machines along its apron and its workshop flank dressed as a workshop.
- **The street** — gutters and covers down both footways, road patches, the
  conbini's apron and the bakery's frontage dressed for the first time, ivy and
  a poster board on the one blank flank, parked bicycles, fallen blossom.

### Two bugs, and the second one is a new class

1. **The towpath had never been reachable from the bridge head.** `canal.js`
   runs a 0.62 m retaining kerb along z = −30.0 from x 7.9 to 44, and the bank
   behind it is cut 0.37 m below the road verge. 0.62 m of collider above a
   0.38 m step limit: from the pavement you could see the water and there was no
   way down to it for forty metres either way. The kerb now leaves a 2.5 m
   opening with a return each side, and the flight comes through it.
2. **A flight of steps cannot be laid on a bank — the bank has to be cut
   first.** `heightAt` takes the max over platforms, so the treads at 0.81 and
   0.97 lost to a natural grade of 1.02 and every one below the top was buried.
   The flight rendered perfectly and you walked over the top of it on flat
   ground. This is the same failure as the canal's service path floating for
   twelve years, and it is worth stating as a rule: **`ctx.cut` first, then let
   the treads raise it back.** The one-line check is a height scan along the
   flight's own axis — `heightAt` should step down once per tread.

Also caught before it shipped: both new shops were wearing existing tenants'
fascias. `bunbo` is さくら坂's 文具とゲーム ほしの and `denki` is 電器 たかの, and
using them here would have put the same two shops on a second street 400 m away,
which is exactly the copy-paste this whole brief rules out. `SHOPS` gained
`bungu` (文具 ひばり堂) and `ringyo` (ひばり輪業) — appended, never reordered,
because every `kind:` in the world is a key into it.

### Recorded moves to existing content

| what | why |
|---|---|
| `canal.js` retaining kerb **split for a 2.5 m opening** at x 7.95..10.45, with a return each side | the towpath was unreachable from こばと橋; the new flight comes through it |
| `SHOPS` gains `bungu` and `ringyo` | see above |

### Performance

| view | draw calls |
|---|---|
| **the 通学路, north from z −58** | **9 741** (was 9 277) |
| こばと橋南詰, looking north | 9 583 |
| 五丁目's lane, north | 7 789 |
| the crossing, looking south | 4 480 (was 3 614) |
| **the opening composition up the hill** | **2 142** |
| the 通学路, south to the gate | 804 |

The street's own establishing shots are the two cheapest in the table, because
looking *along* it you are looking at the school wall and a row of bicycles. The
two expensive ones look north up the whole valley and were already the worst
views in the world before this round. The crossing gained 866 calls — the
bridge-head square is 45 m down the road from it and in frame — which is the one
number here worth watching if anything else goes in at that end.

---

## 機動車 — putting the town's traffic in

A round about one *class of object* rather than one place, and that is the only
unusual thing about it. The brief asked for motor vehicles across the **whole**
finished map — kerbside on the main roads, in the parking that already existed,
outside the shops, at the school, along the canal, in every residential block —
so that the district reads as somewhere people drive to and from rather than a
model of somewhere. Two files: `vehicles.js` builds them, `traffic.js` says
where every one of them is and why.

### The kit — `vehicles.js`

One generator, ten bodies, the way `makeShop` is one generator and nine tenants.
A kind is a **row in a table**: length, width, wheel radius, the two axle
positions, the sill and beltline heights, where the glasshouse meets the beltline
at each end, how far the roof is set back from those, and the extent of the side
glazing. Everything else — arches, bumpers, lamps, plates, seams, handles,
mirrors, wipers — is derived, so a new kind is eight numbers.

- `kei` 軽トールワゴン · `keivan` 軽バン · `keitruck` (which is `props.js`'s hero
  truck, parameterised rather than copied) · `hatch` · `sedan` · `wagon` ライトバン
  · `minivan` · `van` 商用バン · `boxtruck` 小型トラック · `minibus` コミュニティバス.
- Real dimensions. The 軽 class is a legal box, 3.40 × 1.48 × 2.00, and a kei
  car that is not visibly smaller than the car beside it is the one mistake a
  Japanese street cannot survive.
- Seven baked meshes each plus the plates, and **no inverted-hull outline** —
  `outline.js` is for the handful of hero props the README names and the ink pass
  already fires on every silhouette. Measured cost of all *thirty-six* over every
  pass, before the cut: **+100 to +184 draw calls** in the five heaviest views,
  or about 1.5 %. Cost was never the reason to halve the fleet.

### The sweep — `traffic.js`

**Eighteen** vehicles and eight scooters, in one file with one comment each.
It was thirty-six on the first pass and that was too many — see *The cut*
below. Six rules decide every position:

1. **Eighteen, and only eight of them on a carriageway.** The rest stand in
   parking a district module had already marked out. Kerbside vehicles are the
   expensive ones visually: one in a frame is life, two is congestion.
2. **Never two cars facing each other across a road.** A 6.3 m carriageway with
   a 1.7 m car at each kerb is 2.9 m between them and the eye reads a slot. No
   two entries overlap in the along-street axis on opposite kerbs of the same
   street; the closest pair is 5.1 m clear end to end.
3. **Keep left.** East kerb noses −z, west kerb noses +z. Free correctness, and
   it varies the orientations without anybody having to remember to.
4. **Nothing parks where it would not fit — including inside another vehicle.**
   Every position was tested against `world.colliders`, which does not contain
   the other cars in the same sweep. See bug 1 below.
5. **Some places have no cars because no car can reach them.** 桜守神社 is up
   eleven stone steps off a 2 m alley, 湯の坂 is up a flight from the shrine
   precinct, 夏まつり準備中 is behind both, and `kawabata.js`'s own header records
   that nothing with four wheels can get onto 川端の道 at all. Their residents'
   cars stand on the main road at the top of the hill, which is where they would.
   ひばり台一丁目 is the same case for a different reason: 2.4 m of lane, houses
   that predate the car, and a marked bay `ichome.js` deliberately leaves empty
   with a note saying why. That note stands.
6. **Fill the parking that was already built first.** Eleven marked bays, three
   carports, a 月極 park, a coin park, a 送迎 bay and a conbini apron were all
   standing empty — and **a bay left empty beside a full one does more work than
   a second car in it**, which is why the coin park uses one of three and the
   月極 park two of four, non-adjacent.

### The cut — thirty-six to eighteen

The first pass filled every position that *could* take a vehicle, and the town
stopped reading as a town: every view down a street had a car in it, さくら坂's
foreground was a delivery van, and two roads had a car at each kerb, which on a
6.3 m carriageway looks impassable. Halved, and the half that went is
deliberately **twenty kerbside down to eight**: what was cut is cars on roads,
not cars in car parks, so every piece of parking in the world is still visibly
used and no street is narrowed twice.

Gone with it: the second car in the coin park, the third in the 月極 park, the
second in the 町内会館's bays, the second on the terrace apron, the car on 四丁目's
3.4 m lane, the second on 二丁目's spine, and four of the seven round the school.

Also in: 駐停車禁止 yellow lines on both crossing approaches and the school gate,
徐行 painted twice on the school road (`roadPaint` gained the marking), five
視線誘導標 delineator wands, tyre tracks under every vehicle, a bus stop with a
timetable, and the fallen blossom that collects against anything that has not
moved for a while.

### What this round's bugs were

Same lesson as every round: **every one of these threw nothing and looked fine.**

1. **Two hatchbacks were parked inside one another.** `crossHatch` and
   `canalHatch` sat 1.6 m apart on the east kerb below the school with 4.05 m of
   car each, overlapping by 1.44 × 2.45 m. Both had been probed against
   `world.colliders` and both passed — because neither exists as a collider until
   the sweep runs, so a placement pass cannot see its own output. It survived a
   round of screenshots because from every angle one car hides the join. There is
   a pairwise check over the table in `buildTraffic` now, in dev, on every load.
   **Any pass that places many of one thing needs one.**
2. **Every windscreen in the world was body-coloured.** The glass is a thin panel
   over a thicker raked body wedge, and written the obvious way — same two end
   points, smaller thickness — it is *entirely inside* the wedge. Identical to the
   onsen street's 格子 panels and the library's window plates: depth is built
   outward. Fixed by offsetting along the wedge's outward normal, and by
   *deriving* which of the two normals is outward rather than assuming it.
3. **The hero frame came out as a flat dark rectangle.** The shop's delivery van
   went on the east kerb outside 青空商店 — 0.3 m in front of the opening camera.
   Nothing about the placement is wrong except where the player spawns, and the
   only way to find it is to render `__shot('open', …, {})` after every change
   that touches the first fifteen metres of that street.
4. **ひばり駐車場 had trees growing in two of its three bays.** `shotengai.js`
   planted a grove at (26.0, 49.4) and `library.js` a street cherry at
   (24.0, 48.6); both predate the coin park, which moved onto that ground from the
   shopping street two rounds ago, and neither moved with it. Nobody noticed
   because there had never been a car in a bay to be blocked by one.
5. **Two cars centred in adjacent bays left 0.62 m between them**, which after two
   player radii is nothing. Parked to the outside of their own lines instead.
6. **The wheels were 0.13 m inboard of the flanks** and the car stood on castors;
   and the first wheel arch was a single fat torus that read as a pale disc
   *bigger* than the wheel it framed. It is two pieces now — a dark well inboard
   for the shadow inside the opening, a thin flare at the flank for the one curve
   on the whole vehicle.
7. **The tail lamps were 0.26 × 0.20 in flat red** and were the loudest thing in
   any frame with a car park in it.
8. **The bus stop's pole wanted a collider and cannot have one.** 0.11 m of post
   on a 1.55 m footway, and every collider is inflated 0.34 m a side.

### Recorded moves to existing content

| what | why |
|---|---|
| grove `(26.0, 49.4)` → `(28.2, 53.1)` (`shotengai.js`) | it stood in ひばり駐車場's second bay; the two metres between the park's back line and ひばり台コーポ is where a coin park's planting strip actually is |
| cherry `(24.0, 48.6)` → `(25.3, 53.2)` (`library.js`) | the same, in the first bay |
| `makeKeiTruck` gains `color`, `load` and `hero` | so `vehicles.js` can use it instead of writing a second flatbed. The crossing's hero keeps its yellow, its crates and its shell; the parked ones do not |
| `roadPaint` gains `'slow'` (徐行) | a school frontage with cars parked along it needs the marking that says why everything is crawling |
| `textures.js` gains `busStopPlate` and `busTimetable` | the one bus stop in the world |
| `tsugakuro.js` `dropOff` waypoint `[-5.2, -39.0]` → `[-3.2, -39.2]` | there is a minivan in the middle of the 送迎 bay now; the probe moved to the part you can stand on |
| `yonchome.js` waypoint `[28.3, 74.0]` → `[28.3, 71.4]` | the same, under the carport |

### Verification

- **200 182 cells** reachable from the spawn, against **201 551** with the
  vehicle colliders spliced out. The difference is almost exactly the sum of the
  eighteen rotated footprints, so nothing was sealed — the whole loss is the cars.
  That comparison is the check worth repeating: run the fill, splice the new
  colliders out, run it again. (At thirty-six it read 197 880, and the same
  arithmetic held.)
- All **110** `FLOODFILL` waypoints in every district header probed. Two read
  0.70 m — `(45.6, 31.7)` and `(-11.4, 51.0)` — and **both read 0.70 in the
  baseline too**, so they are the bad-probe-point artefact this file already
  warns about and not a regression.
- Every vehicle and every scooter tested for overlap against `world.colliders` at
  its own footprint, **and every vehicle against every other vehicle**, which is
  the check that was missing and the one that found bug 1. Two scooters were
  inside something on the first pass (one in its own street's delivery van) and
  moved.
- Every kerbside pair on the same street checked for overlap in the along-street
  axis. Closest opposite pair: さくら坂's 軽トラ and the wholesaler's van, **5.12 m
  clear**; on the main road, the minibus and 桜守裏町's kei at 6.25 m.
- Production build clean at **61 modules**.

### Performance

Draw calls over *all* passes at 1000 × 560, with the vehicles' meshes toggled:

| view | with | without | cost |
|---|---|---|---|
| the crossing | 9 491 | 9 351 | +140 |
| さくら坂 | 8 371 | 8 187 | +184 |
| the bridge deck | 10 382 | 10 282 | +100 |
| 二丁目's spine | 6 338 | 6 222 | +116 |
| ひばり駐車場 | 5 374 | 5 230 | +144 |

Measured at thirty-six vehicles; halving the fleet roughly halves those numbers
again, and none of them was ever the reason to cut.

Scene totals after: **783 colliders** (was 765 before this round, 801 at
thirty-six vehicles).

### Audit against the motor-vehicle brief

| Asked for | State |
|---|---|
| Vehicles across the **whole** map, not one new area | done — 18 over 13 of the 21 districts; the four with none cannot be reached by a car |
| Rhythm, not saturation: "a town people drive in", not a car show | held — and **corrected**: 36 was too many and it is 18, only 8 of them on a carriageway. No street carries more than two, and no two face each other across one |
| **軽 K-car** | done — 5 keis and 2 軽トラ, the largest single group, which is what a Japanese suburb is |
| **Ordinary family car** | done — 3 `hatch`, 1 `sedan`, 1 `wagon` |
| **Minivan** | done — 1, on the 送迎 bay outside the school |
| **軽トラック** | done — 2, plus the crossing's hero |
| **Small delivery van** | done — 2 `keivan`, 1 `van` |
| **Community minibus** | done — ひばり台ふれあい号 at 図書館前, with its stop and timetable |
| **Scooters** | done — 8 new, on top of the 4 `streetprops.js` already parked |
| Optional older light truck / service vehicle | done — the 土地改良区's 軽トラ at こばと橋 and the 2 t box lorry restocking ひばりマート |
| Compact Japanese scale, gentle everyday colours, no supercars/luxury/large SUV | held — the palette is 14 tones, white/silver/cream are half of them, nothing saturated |
| Clear structure: body, glass, tyres, mirrors, shut lines, lamps, bumpers, plate | done — all of it derived from the table, and a 330 × 165 plate front and rear |
| **1. Station and crossing** — small family car, K-car, delivery van beside the shop, minibus at the edge, service vehicle further off; nothing blocking the crossing | done — the shop's van, one hatch beyond the gates and the hero 軽トラ, with 駐停車禁止 lines marking the five metres either side |
| **2. Shopping street** — a van at the back, a 軽トラ unloading, a car or two at the edge, a scooter by a shutter, a K-car by the machines | done — a 軽トラ, a van 5 m clear of it on the far kerb, and a scooter, over 26 m of a 6 m street, so it reads as trading rather than parked-up |
| **3. Onsen and shrine outskirts** — restrained, local, nothing in the core | done, and honestly: neither the shrine nor 湯の坂 nor the festival ground can be reached by a car, so their vehicles stand on the main road at their mouths |
| **4. School and 通学路** — family cars, a staff K-car, a bakery van, a shop lorry, scooters, a drop-off vehicle, no gate blocked | done — 3, and **none of them on the carriageway**: the 送迎 minivan, the box lorry on the conbini apron and the staff kei in its carport, plus 徐行 both ways and a yellow line on the gate frontage. It was 7 and that stretch read as congested |
| **5. Canal and bridges** — sparse, quiet, a maintenance truck | done — 1, the 土地改良区's; the banks are 2 m service paths and the quiet is the point |
| **6. Residential blocks** — the strongest concentration: bays, carports, apartment forecourts, terraces, scooters at doors | done — 7 across 三丁目, 二丁目, 四丁目, 公園前 and 五丁目, every one of them in parking that already existed and none on a residential lane |
| **7. Library, hall, phone box, community facilities** | done — the library's visitors use ひばり駐車場 three metres off its flank, which is why the coin park was moved there; the hall has one of its two bays used; a scooter stands at the phone box corner |
| Varied orientation — nose-in, reversed, parallel | done — kerbside parallel both ways by the keep-left rule, nose-in in every bay, one reversed into the 月極 park, one pulled in sideways on the 送迎 bay, and a small skew on a third of them |
| Mixed types along any one street | held — no two adjacent vehicles anywhere are the same kind |
| Colour variety inside a gentle range | held — and two of the fourteen are *lifted* darks, because a true bottle green loses all its detail in shade |
| Sensible positions; nothing at a stair head, on the crossing, in the shrine, on the towpath or in the play area | held — and verified by flood fill rather than by looking |
| Interaction with the surroundings: wheel stops, bay lines, cones, signs, petals, tyre marks, shadows | done — the existing wheel stops and bay lines are what they stand on, two cones by the lorry, tyre tracks under every vehicle, four new fallen-blossom patches |
| Lorries near back doors and service positions; scooters near walls, shop sides and porches | held |
| Road detail: bay lines, 月極 board, coin-park sign, yellow lines, 徐行, mirrors, bollards, gutters, covers, guardrails, cones, reflective posts, signs, carports | done — the yellow lines, 徐行 and the delineators are new; the rest already existed and is now *used* |
| Light wear only — tyre marks, petals, patches; still a clean town | held — the tracks are at 0.10 opacity and there is no grime anywhere |
| No people, anywhere, including on signage | held |

---

## ひばり台六丁目 — the community-bus turnaround

A round about **one vehicle movement**. The brief asked for a new district at the
edge of the existing housing, built round a small community-bus 折返場 with the
living streets that would surround one: a modest curved turning space with a
stop, a shelter and a timetable; three to five parking bays and a place a minibus
can pull up briefly; a main road narrow enough to be a 生活道路 but wide enough
for a light bus, with narrower branches off it; two or three small apartment
blocks, some detached houses with yards, a terrace, one 外廊下 block and one or
two very small shops; a great deal of ordinary road furniture; and a street-corner
node that reads as a frame out of an anime.

**The district exists because the bus did not have anywhere to go.**
ひばり台ふれあい号 went in with the motor vehicles a round ago with one stop
outside the library and no terminus, which is a timetable with no reason.

### The survey, and what it decided

Envelope x 45…80, z 40…70, swept against `world.colliders` before a single
coordinate was chosen. What is in it: the north lane's east arm and 二丁目's
north T (**top 0.513** — the datum this whole district is paved to), 三丁目's
片流れの平屋 *and its front garden's 板塀 at x 48.86…49.14*, 三丁目's 連棟 三戸,
one grove tree, 二丁目's コーポ みなみ and its back-edge planting. Everything else
was empty, which is why the district is here.

Four things the arithmetic decided rather than taste:

- **The turning circle is 12.4 m across.** `SPEC.minibus` is 6.30 × 2.08, so its
  outer front corner sweeps a shade over 6 m: a 6.20 m paved radius is one
  切り返し, which is what a driver does at the end of a suburban route four times
  a day. A radius the bus could take in one sweep is 8 m — a 16 m circle — and at
  that size it stops being a widened road and becomes a bus station, which the
  brief rules out and which nothing else in this town would survive next to.
- **This is the only district cut into a hill.** The shoulder north-east of
  二丁目 read 1.4 m at (60, 56) and 2.2 m at (60, 60), straight through where the
  turnaround is, so `planet.js` gains a pad at (62, 55), rx 17 / rz 11. Its north
  edge stops short of the block **on purpose**: the ground climbs again from
  z = 66 and is 2.4 m up by z = 72. That bank is what the retaining wall, the
  fence on it and the grove line stand on, and it is the reason the town ends
  here rather than merely running out.
- **The shops are on the south side and the housing on the north.** The sun is at
  (−52, 62, 56), so +z is the warm elevation: two sunlit shopfronts across the
  road from a shaded row of flats is the district's one strong section, and a
  弁当屋 in permanent shade is a 弁当屋 nobody can see the food in.
- **There is no south lane.** One was drafted between the shops and the circle and
  cut, because the pocket it needed is the only ground the corner node could stand
  on. The one detached house opens straight onto the circle's south rim instead,
  which is a better story than a stub — the house at the end of the line.

### What went in

`rokuchome.js`, one module, and the shared kit did the rest: `blocks.js`,
`plots.js`, `streetprops.js`, `housing.js`, `shops.js`, `vehicles.js` and
`ground.js` between them supplied every component and nothing new had to be
modelled.

- **六丁目通り** — 5.0 m of kerbed carriageway, 路側帯 both sides, a dashed centre
  line, gullies, two manholes, three patches, a 3.2 m connector down to 二丁目's
  north T with its own mirror, and a name plate at each mouth.
- **転回場** — the circle, a yellow 停車位置 box, a 駐停車禁止 arc, 徐行 at the
  throat, a raised waiting island with a 2.9 × 1.4 m shelter and a 路線図 in it,
  the stop pole carrying `busStopPlate` variant 1 (終点), two benches, a lamp, a
  転回場 plate, a 駐車禁止 disc, two delineators, two cones, a guardrail on the
  outer arc, and the faint scrub arcs the bus leaves at the radii its wheels
  actually trace.
- **月極駐車場** — three bays nose-in off the north kerb with lines, wheel stops,
  numbered plates, a back wall, ivy and the operator's board. 4.6 m deep, so they
  are 軽 bays, and the two vehicles in them say so.
- **the housing** — コーポ ひがし (3-storey walk-up, gallery on the street,
  balconies on the sunlit side, mailbox bank, parcel lockers, drying rack,
  storage shed), 第二 さくら荘 (a two-storey 外廊下 block on the circle's north
  rim), 連棟 三戸 with three aprons straight onto the circle and per-unit clutter,
  a 長屋 二戸 with its 0.92 m eave over 北の道, and one 一戸建て with a block
  boundary, a 1.9 m gate, a kitchen garden and chalk on the paving.
- **お弁当 のはら / 雑貨 まるみ** — two very small shops, one with a noren and a
  flag, the other with a half-shut shutter, crates and an umbrella stand.
- **the corner node** — the district's interaction (a machine), a recycling cage,
  a three-sheet notice board, a bench, a bed, a cherry in a tree pit, four
  bollards, and a light van at the kerb beside it.
- **北の道** — a 3.5 m lane with a slotted channel, patches, a manhole, a mirror,
  a name plate, bollards and a 徐行 plate at its dead end, the block's ゴミ集積所,
  a bike shelter and a standpipe.
- **the back edge** — a 1.15 m 擁壁 with weep holes and a channel at its foot, a
  転落防止柵 on top of it, six grove trees on the cut slope and five shrub clumps.

`traffic.js` gained four vehicles and two scooters, and **moved the bus**.

### What this round's bugs were

Same lesson as every round: **every one of these threw nothing and looked correct
in a rendered frame.**

1. **The bus shelter was a box you could not stand in.** A collider round the
   whole structure read the waiting island 1.05 m unreachable in the first flood
   fill. Only the back panel carries one now; the two 0.06 m cheeks and the four
   0.09 m posts go without, the call `traffic.js` already made for the stop pole.
2. **The walk-up's gallery was unreachable.** At 4.8 m deep the block left 1.5 m
   between the car park's back wall and itself, which after two player radii is
   0.82 m — with a mailbox bank and a locker bank standing in it. The block is
   4.4 m deep and the bays 4.2 m now, and the strip is 2.1 m. Nine frames of that
   forecourt looked fine.
3. **The north kerb ran across the car park's entrance.** 0.105 m of concrete over
   the mouth of a 月極 with two cars in it — and **nothing in this project can
   find that**, because a kerb carries no collider anywhere here, so the fill
   walks over it and a frame from the road does not show it edge-on. Split at
   every side road now, and dropped to 40 mm across the parking.
4. **The guardrail and its collider disagreed.** Five arc-following sections
   drawn, one AABB along the chord collided: the top section fenced the terrace
   off from its own street *visually* while the fill walked straight through it,
   so the mistake was invisible to both tools at once. Three sections now, each
   with the AABB of its own rotated box.
5. **The delivery van was parked across the 弁当屋's frontage.** That shop's
   doorstep strip is 0.74 m and a van 0.06 m off the kerb leaves 0.44 m of it. The
   waypoint read "reached" either way; a **scan line across the frontage** is what
   showed it.
6. **The lane mirror stood in the lane**, filling the top of the frame with its
   orange back. `laneSign`'s `mirror:` option offsets in world x/z from the post,
   so on a run turned a quarter circle the mirror lands in the carriageway.
   Placed outright instead, and turned to face the junction it is a mirror for.
7. **The 弁当屋 was wearing a 和菓子 noren**, because `norenTex` falls back to
   `ramen` for an unknown key and the nearest thing in the table was a
   confectioner's. The table gained a `bento` set; the *fascia* table gained
   `bento` and `zakka` for the same reason `bungu` and `ringyo` went in a round
   ago — a town has one of each.

### Recorded moves to existing content

| what | why |
|---|---|
| **ひばり台ふれあい号 moved** from 図書館前 to the 転回場 | a 一日四便 service lays over at its terminus, not halfway along its route. 図書館前 keeps its pole and its timetable, and a stop with no bus at it now says the bus is somewhere else — somewhere you can walk to. `CLAUDE.md`'s `busstop` camera still frames the stop; `rokuBus` frames the bus |
| `planet.js` `PADS` gains `(62, 55) rx 17 rz 11` | the only pad in the world cut into a hill rather than laid on flat ground. Its north edge is short of the block deliberately — widen `rz` and the district loses the rise it is at the foot of |
| `vehicles.js` `makeBusStop` gains `variant` | a route with two stops on it needs two names rather than the same name twice |
| `textures.js`: `SHOPS.bento` / `SHOPS.zakka`, `norenTex('bento')`, `warningPlate(3)`, `busStopPlate(variant)`, `busRouteBoard`, `bayNumber`, three `blockPlate` names, two `laneNamePlate` names | all **appended**. Every `kind:`, `plate:` and `variant:` already standing in the world is a bare index into those tables |

Nothing else was touched. Every constraint inside the envelope — the 板塀, the
grove tree, コーポ みなみ's back, 三丁目's 連棟 — was worked round rather than
moved.

### Performance

Draw calls over all passes at 1000 × 560 from a warm page, measured by
accumulating `renderer.info.render.calls` across every pass of one `__shot`. The
right-hand column is the same view with every mesh whose bounds fall inside
x 45…80 / z 40…71 hidden — i.e. the district switched off:

| view | with | without | cost |
|---|---|---|---|
| 六丁目通り, east into the circle | 905 | — | — |
| the circle, at the bus | 582 | — | — |
| 北の道, north | 594 | — | — |
| 六丁目通り, west from the throat | 8 222 | — | — |
| **二丁目's spine, north** | **4 228** | **2 937** | **+1 291** |
| the school road, north from z −58 | 10 722 | 10 561 | +161 |
| 三丁目's lane | 1 204 | 1 187 | +17 |
| the crossing | 4 766 | 4 766 | 0 |
| the bridge deck | 6 648 | 6 648 | 0 |
| the library forecourt | 1 612 | 1 612 | 0 |

Two things to read out of that. **The district's own establishing shots are the
three cheapest views in the world** — looking east or north from inside it you are
looking at a circle of asphalt, a bus and a row of frontages, and the hillside
behind closes everything else off. And it is **free from everywhere except the
one street that looks straight at it**: 二丁目's spine is a 38 m kerbed corridor
pointing due north at the new block, and that is where the 1 291 calls are.
Looking west from the throat is expensive for the same reason 川端の道's west view
is — it looks back down the whole valley.

Scene totals after: **829 colliders** (was 783), 20 interactables (was 19), 70
rigid rigs (was 67 — the two cloth hangs and the machine). Production build clean
at **62 modules**.

### Verification

- **198 117 cells** reachable from the spawn on the 0.35 m grid, against
  **201 987** with 六丁目's own 61 colliders spliced out. So the district takes
  3 870 cells out of the walk and its graded pad hands about 1 800 back —
  flattening a shoulder that ran to 2.4 m turns ground the step limit used to
  refuse into ground you can walk on. Nothing was sealed; the loss is the
  buildings themselves.
- **All twenty `FLOODFILL` waypoints in the header reached at 0.00 m**, and the
  neighbouring blocks re-probed alongside them: 二丁目's north end, 三丁目's lane,
  公園前's east link, 二丁目's allotment, 四丁目's hall bay and the library's bus
  stop are all unchanged. 公園前's east link still reads 0.70 and 二丁目's
  allotment 0.35, and **both read the same before this round** — the
  bad-probe-point artefact this file already warns about.
- Every new vehicle tested against `world.colliders` at its own rotated footprint
  and against every other vehicle by `buildTraffic`'s pairwise audit, which is
  silent.
- A scan line across both shop frontages, which is what found bug 5.

### Audit against this round's brief

| Asked for | State |
|---|---|
| A new district at the edge of the existing housing, joined to 三丁目 / 児童公園 / the library / the east blocks | done — it hangs off 二丁目's north T, which is where the north lane's east arm, 二丁目's spine and 三丁目's block already meet |
| Residential in character, not a new sightseeing set piece | held — no landmark, nothing over three storeys, and the biggest object in it is a minibus |
| **A small community-bus 折返場**, not a bus station | done — a 12.4 m circle on the end of a 15 m street, sized off the minibus's own turning radius |
| A stretch of *curved* road space to turn or pull up in | done — and it is one extruded polygon with the street, so there is no seam between them |
| Simple stop pole | done — `busStopPlate` variant 1, 終点 |
| Roofed waiting area | done — 2.9 × 1.4 m, four posts, a mono-pitch roof falling away from the road |
| Bench | done — one in the shelter facing the bus, one on the sunny end of the island |
| Timetable board | done — the case on the stop pole, and a 路線図 inside the shelter |
| Yellow stopping markings | done — a 6.6 × 2.8 停車位置 box and a 駐停車禁止 arc on the south-west rim |
| Guardrail | done — three sections following the outer arc, each with its own collider |
| Curve mirror | done — three: the connector, 北の道's mouth, and the one already at 二丁目's T |
| One street lamp | done — three, and the one on the circle's rim is the only light at the end of the route |
| A three-to-five-bay parking area beside it | done — three, 4.6 m deep, two used and the middle one empty |
| A stretch of kerb a community minibus can pull up on | done — the box on the circle is where it stands, and the street's south kerb carries the yellow line that says why nothing else does |
| Accurate road dimensions: curve radius, kerbs, bay lines, railings, shelter | done — every one derived, and the radius from `SPEC.minibus` |
| A main road narrow but passable by small cars and a light bus | done — 5.0 m of carriageway, which is what a Japanese コミュニティバス route actually runs on |
| Narrower branches to housing and small facilities | done — 北の道 at 3.5 m and the 3.2 m connector. A third was drafted and cut; the header says why |
| **2–3 three-storey small apartments** | partly — **two** blocks: コーポ ひがし at three storeys and 第二 さくら荘 at two. The land held exactly this. 四丁目's lesson is that a block enumerates what is already in its envelope and then builds *within* it, and a third block would have had to take either the 連棟's frontage or the car park |
| Detached houses with small yards | partly — **one**, with a block boundary, a 1.9 m gate, a front garden and a kitchen garden. Same reason |
| A terrace | done — 連棟 三戸, three aprons straight onto the circle, per-unit clutter |
| A small 外廊下 集合住宅 | done — 第二 さくら荘, two storeys, four flats, one stair, a gallery you can count the doors on |
| 1–2 tiny neighbourhood shops (chemist / laundry / bento / rice / general) | done — two, and **new tenants**: the table already had a pharmacy, a coin laundry, a dry cleaner and a rice-and-sake shop, and reusing one would have put the same shop twice in one town |
| Quiet, not a shopping street | held — two fascias, no lit sign boxes, no lantern runs, cream and green awnings |
| White edge lines, bay lines, yellow no-waiting, 徐行, convex mirrors, cones, bollards, covers, gutters, guardrails, corner mirrors, bay numbers, guide plates, notice board | done — all of them, and the bay numbers are a new texture drawn to the 3:2 face it lands on |
| Light wear: tyre marks, petals, patches | done — the scrub arcs on the circle at 0.09 opacity, seven fallen-blossom patches, three road patches. No grime |
| Apartments: external stair, balconies, mailbox bank, notice board, bike parking, refuse point | done |
| Detached houses varied in roof, porch, boundary, plate, post box, canopy, pots, curtains, outdoor unit, parking | done — through `dressPlot`, which allocates the slots once per plot so nothing lands on anything else |
| A terrace with a continuous but not identical rhythm | held — same wall, same roof, same window, different door, different clutter |
| Shops: shutter, noren, small sign, board, drinks crate, umbrella stand, small parking | done |
| Invented Japanese only, no real brands | held — see the names list at the foot of this file |
| A street-corner node: machine, cherry, lamp, bench, guide board, and a pale K-car or small van beside it | done — the corner pocket, with a pearl 軽バン at the kerb two metres from it |
| Cloth / paper / flags moving in the wind near the stop | done — a noren and a flag on the two shops, on the same rig `details.js` uses |
| Quieter than the station, more traffic than pure housing, plainer than the shopping street | held |
| No people, no high-rise, no cyberpunk lighting, no realistic materials, no large car park, no wide highway | held |

---

## 球体化 — taking the relief out of the planet

A one-line brief and a two-line fix, reported the way the good ones always are:
*the planet is bumpy, and the green surface is cutting through the roads and the
parked cars — make it a proper sphere.*

**The cause is that the world has two ground surfaces and only one of them
carried the relief.** `buildPlanet` displaced the sphere by `reliefAt`;
`street.js`'s 320 m terrain grid is a pure `groundY` profile and never carried it
at all. The two sit 65 mm apart, so anywhere the relief rose past that the sphere
came up **through** the grid — and with it up through everything laid flat on the
grid, because the road, the lanes, every `pad` and every kerb in the world are
authored against `groundY` alone. Measured before it was switched off:

- **7 346 m²** of the walkable bounds had the sphere above the grid,
- **21 of the world's colliders** were standing on ground it had risen through,
  worst of them the school's east fence at 0.87 m and 六丁目's back edge at
  1.68 m.

That is exactly the reported symptom, and it is the same shape of mistake as the
`groundY(z)` / `ctx.groundAt` pair and the `TERRAIN_DROP` note further up this
file: **two things that describe the same surface, maintained separately.**

### What changed

| | |
|---|---|
| `RELIEF = 0` in `planet.js` | the relief noise and every mask that held it off built ground — the railway corridor, the channel corridor, the district ellipse and all twelve `PADS` — are kept intact behind one number. Set it back to 1 and the old landscape returns exactly as it was, along with the clipping |
| icosphere **detail 6 → 30** | `PolyhedronGeometry` splits each icosahedron edge into `detail + 1`, so detail 6 at `R = 160` is a **24 m** facet sagging 0.60 m below the true sphere at its centre. Under the grid that is harmless; out past the grid, where the sphere *is* the ground under the far half of the railway and the channel, it is half a metre of ground dropping away between one vertex and the next. Detail 30 is a 5.4 m facet sagging 30 mm. 18 k triangles against 980, in one draw call on a mesh that is never culled |
| radial normals on the sphere | `computeVertexNormals()` on a non-indexed geometry is flat shading whatever the material asks for, and `cutSphereTrench` rebuilds the sphere as a bare position list. Every vertex is on a sphere about `CENTER`, so its normal is the radial direction — one loop, exact, and the terminator becomes a curve instead of a staircase of triangles |

Nothing else moved. No builder, no collider, no height query and no prop
placement changed, because every seat in the world is computed at build time from
`ctx.groundAt`, which reads the same function the sphere does.

### The bug inside the fix

Worth recording because it is a class rather than a slip: the radial-normal loop
was first written against the `pos` captured at the top of `buildPlanet` — but
`cutSphereTrench` **replaces** the position attribute, so that reference is the
pre-cut one and is both the wrong length and the wrong data. three.js does not
complain about a normal buffer shorter than its position buffer; it just shades
the tail of the mesh with whatever is there. The symptom was a band of stepped
stripes across the far hemisphere that looked exactly like the faceting the
change was meant to remove — which is the worst possible symptom, because it
reads as "the fix did not work" rather than as "the fix is broken".

### Verification

- **A radial ray fired down at 856 points across the walkable bounds hits the
  terrain grid before the sphere at every one of them**, gap 38–127 mm. Before:
  the sphere was *above* the grid at 7 346 m² of it, by up to 1.68 m. That ray
  test is the check to repeat — comparing `groundAt` with itself proves nothing,
  which is the same lesson as the `TERRAIN_DROP` round.
- On the far side of the planet, where the sphere is the ground, it now sits
  within **34–43 mm** of the height the arithmetic asks for. It was out by up to
  620 mm.
- **198 117 cells** reachable from the spawn — *identical* to before the change,
  which is the point: every mask and pad was already holding the relief off every
  walkable route, so removing it changes what you see and not where you can go.
- Draw calls unchanged in all five reference views (4 766 / 10 722 / 6 648 /
  4 228 / 905). Triangles submitted up about 18 k, or 1 %.
- Production build clean at 62 modules.

### What it costs

The low hills behind the school and north-east of 二丁目 are gone, and every
outward-facing view now ends in a clean horizon arc. That sharpens polish item 5
below rather than adding a new one, and the honest answer to it is distant
*mass* that is not the ground the town stands on — a tree line, a ridge in
`sky.js`. **Not** turning the relief back on.

One district loses a piece of its reasoning with it: ひばり台六丁目 was laid out
as a 造成地 cut into the rise north-east of 二丁目, and there is no rise now. Its
retaining wall is simply a 1.15 m boundary wall with a 転落防止柵 on it, which is
what most walls of that height and build are anyway; the grove line behind it
still closes the sky. Nothing was moved.

---

## 四件 — four reported placements, and the two latent bugs behind them

Four reports, each with the camera line that shows it. Every one turned out to be
a *class* of mistake this file already names, which is the reason they are
written up rather than just fixed.

**1. `(47.4, -32.5)` — an outdoor unit half buried in a doorstep.**
川端の道's 二階半. `dressPlot` places the aircon at `±(halfW - 0.75)` **without
consulting its own slot allocator**, so on this plot it landed at u = +2.05 —
inside the front door's step, which `makeAtticHouse` runs 1.5 m wide out to
local z 2.86 at the door. A ground-standing unit there is buried to its middle in
concrete. There is only 0.4 m of frontage east of that step, so the unit went
west (u = -2.05) and up onto the wall on brackets, which is where half the
outdoor units in Japan are. `airconOut` drops 0.20 → 0.09 with it: 0.20 was
clearing the plinth, and a wall unit is 1.25 m above the plinth — at 0.20 its
bracket arms, which span exactly the standoff, would not have reached the wall.

**2. `(18.5, -66.2)` — two rows of bicycles sunk into the ground.**
`groundY(z) is not the ground`, one layer in. The school's shed floor is a 0.07 m
`pad` and the racks were seated at `Y`, the site grade — so every wheel was cut
off at the rim. Worse, the pad only reached x = 18.5 and the shed runs to 23.4,
so half the twenty-five bikes were on concrete and half on bare terrain 0.085 m
lower. The floor is now two pads that abut at z = -60.0 and cover the shed's own
footprint, and the racks and the wheel gutters read their seat off `ctx.groundAt`
like everything else in the world.

**3. `(-2.7, -12.5)` — two planters inside a wall.**
The house at (-8.2, -16.4) has its frontage line, its own garden wall *and* the
road's retaining wall in the same 0.7 m of ground. The default `planterOut` of
-0.15 put the pots at x = -4.50 against a wall body face at -4.493: pot, soil and
foliage entirely inside the concrete.

**Moving them straight out does not work, and that is the interesting part.**
`dressHousing`'s `clear()` culls anything closer than 0.35 m to the footway's
road edge — at the pots' original z that limit is x < -4.23, while keeping the
foliage out of the wall needs x > -4.11. The two constraints cross: **there is no
legal position for a planter on that stretch of frontage at all.** They stop
crossing further south because the road is drifting east, so the pair moved
2.8 m along the frontage as well as 0.45 m out.

**4. `(-0.8, -28.3)` — delete this wall.**
It is こばと橋's **west parapet**, and it was doing its job: from the west footway
it is the bridge's edge protection. From the road approach it is also a blank
two-metre slab 0.9 m from the camera standing in front of the one thing the
bridge exists to show. Deleted as asked — and **that exposed a five-year-old
latent bug.**

The deck's upstand is swept (`topAt: GRADE(z) + 0.6`) but its collider was a
single flat box topped at `GRADE(-24) + 0.6`, the height it reaches at the
*middle* of the bridge. The road climbs 0.53 m across the crossing, so at the
south end that flat top stood **0.276 m** over the footway — inside the 0.38 m
step, so `_resolve` skipped it and the upstand was not a barrier there at all.
It never showed because the parapet was standing in front of it. Three colliders
now, each taking `GRADE` at its own low end: 0.43 m of clearance everywhere,
which is what the comment above it always claimed.

0.43 m is a barrier by five centimetres of step height, and five centimetres is
not what should be between a footway and a drained channel — so the *wall* went
and a pipe railing took its place. It is the canal's own bank detail, which is
why it disappears into the picture instead of closing it, and it is built along
`px(z)` rather than as a straight run because the road drifts 0.63 m in x over
the six metres of parapet: `railing()` is axis-aligned and three straight runs
would kink 0.16 m at every joint.

### Recorded moves to existing content

| what | why |
|---|---|
| `kawabata.js` ATT: `airconAt: -2.05, airconOut: 0.09, airconUp: 1.25` | report 1 |
| `school.js` `schoolShedPath` split into a path and a `schoolShedFloor` covering the shed; the racks and gutters seated on `ctx.groundAt` | report 2 |
| `index.js` house 29 gains `planterAlong: -2.8, planterOut: 0.30` | report 3 |
| `canal.js` **こばと橋's west parapet deleted**, replaced by a swept pipe railing | report 4 |
| `canal.js` the deck upstands' collider split into three following the grade | the latent bug report 4 exposed — it applies to *both* sides |

### Verification

- **198 211 cells** reachable, against 198 117 before: the parapet gives a little
  back and the railing takes a little, and nothing else moved.
- A scan line west across the bridge at z = -26 reads
  `.....######........######` — open carriageway, **the railing**, the deck
  ledge, **the upstand**. Before the fix the second block was missing entirely
  and the ledge ran straight off the edge.
- Every district waypoint near the four sites re-probed at 0.00: both bridge
  footways, こばと橋南詰, the towpath, the shed, the school yard path, the
  passage between the two houses, and 川端の道's lane.
- Production build clean at 62 modules.

### Noticed and not fixed

The shrub at `(-5.4, -13.4)` in `index.js` is in the same frame as report 3 and
has the same problem: it is planted in the 0.3 m between the house's face and its
garden wall, with a 1.6 m spread, so about a third of its blobs are inside one
wall or the other. It is not fixable in place — there is no ground there — and
the obvious home for it, the 2 m passage at z -12.9..-10.7, is a documented route
that a shrub would narrow. Worth one decision next time somebody is in that
block: move it into the passage and shrink the spread, or drop it.

---

## ひばり台七丁目 — スーパー さかえ, and what a big building brings with it

The brief: a **mid-sized community supermarket with a roof car park** on the field
behind the onsen street, clear that it is a real local スーパー and not a
convenience store — glazed entrance, fictional Japanese signage, a hard-dressed
前場, a vehicle ramp to a 12–20 bay roof deck, a believable delivery yard, a
living road node round it, and everyday Japanese cars parked with a reason.

`nanachome.js` (2 100 lines), plus twelve rows in `traffic.js`, two scooters,
eleven generators appended to `textures.js`, and one new argument in `index.js`.
The module was written in the previous session and this one verified it, which is
where all the interest is: **the code looked finished and eleven things were
wrong, none of which threw, logged or showed in the frames that had been taken.**

### What the arithmetic decided

- **The building is the length of its own ramp.** 1/6 maximum grade × 5.75 m rise
  = 34.5 m of run, and the parcel is 30 m across, so the ramp has to wrap two
  flanks: 16.4 m east, a 4.6 m corner landing, 15.9 m south. Hence 21.6 × 16.4.
- **The deck is at 6.20 because 湯の坂 is at 3.20 + a two-storey street**, which
  is what the brief asked for — the roof park is level with the onsen shelf, so
  the two read as one town rather than two terraces.
- **Twelve bays, not twenty.** 21.04 × 15.84 usable is two 5.0 m rows either side
  of a 5.84 m aisle: seven north (one the 3.4 m おもいやり bay), five south, since
  the ramp mouth takes 4.6 m of that row and the cart return 2.8 m more.
  *The module header claimed fourteen and `traffic.js` numbered two cars against
  that draft* — both corrected.
- **The frontage faces +z** because that is the only orientation where the wall is
  lit and its own apron is out of its shadow. Road north, ramp and blank flank
  south against 湯の坂, yard behind the west gable, footways east.

### The eleven findings, by class

Every one of these is a class this file or `CLAUDE.md` already names. That is the
point of listing them: none is new, and they still got in.

| # | what | class |
|---|---|---|
| 1 | **The roof deck was not being drawn.** The store's mass was built to `DECK` and the deck slab laid *at* `DECK` — coplanar top faces, and the mass (pale cream render) was winning. So the car park was surfaced in wall render, the sun's top cel band took it to near-white, and every line, numeral and arrow on it vanished. The tell was that changing the slab's material twice, by a fifth and then a third, produced *pixel-identical* frames. Mass stops 0.10 m short now; the slab closes the top of the building and is `asphaltWorn`. | coplanar faces / "a material change that changes nothing" |
| 2 | **The entrance recess was sealed** by one collider over the whole footprint — with its floor tiled, its platform registered, a mat and two basket stacks in it. Three boxes now, the library's own note. | a recess needs its own colliders |
| 3 | **…and the roof parapet was a wall across the doorway.** Split for the recess, the parapet's own collider still ran the full 21.6 m at *every* height, 0.34 m in front of the doors. `ctx.collide` gained the sixth argument `bottom` that `_resolve` has always honoured and nothing ever set. | a collider has no underside |
| 4 | **Two 4.4 m vertical poles through the trolley bay's roof.** The guide rails were `CylinderGeometry` with no rotation, so instead of capping the upstands they stood on them — 0.74 m into the ground, 1.36 m out through the canopy. | derive the rotation |
| 5 | **One roof condenser floating in the aisle, one buried in the plant hut.** `sz - 2.46 + dz - 0.2` against a face at 76.82. Two narrow units flanking the door now, 50 mm off the wall. | a prop written relative to an unmeasured face |
| 6 | **Both basket stacks inside the building.** `REC_X1 + 0.9` is not the recess's reveal, it is the middle of the solid block east of it. They are in the recess against its east return now, which is where a supermarket keeps them. | same |
| 7 | **A 1.1 × 3.6 m flower bed inside the east wall.** At `SX1 - 0.9`, and `SX1` is also where the ramp's east leg starts, so there is no strip there at all — the apron's east end is full. Moved to the service passage's east verge, which needed softening anyway. | same, plus "two constraints can cross" |
| 8 | **Three wall condensers 71 mm off the gable**, with bracket arms that span exactly the standoff. `SX0 - 0.27`, derived: `d/2 + standoff`. Verified by firing a ray out of the back of each. | `makeAircon`'s standoff |
| 9 | **Two loose bicycles through the bike rack and one through the gate pier.** Parked *along* z at 1.73 m each, they overlapped the rack's own five machines by 0.34 m at both ends. Moved north of the rack, 0.6 m apart across their width — which is what `makeBikeRack` itself uses — onto a small slab that was bare grade. | a bicycle is 1.73 m long |
| 10 | **The trolley lean-to's south bay was inside the shopfront.** `w` runs along local x and `ry = PI/2` maps that to world z, so 5.2 m centred on 84.4 ran from 81.80 into a frontage at 82.00 with glazing to 82.15. 4.8 on 84.65. | read the generator's own axes |
| 11 | **Six props seated on `Y` instead of on the surface they stand on**: four utility poles sunk a kerb's height into the north footway, two more 100 mm into the spur's, two delineators 70 mm into the passage slab, a doormat floating 80 mm over the apron, the dock's plate post and two ivy runs. | `groundY` is not the ground |

Two more were judged and left as they are: **`superInterior` was rewritten** from
a dark cool base (#6e6a7e) to a pale warm one (#ddd8d0), because every other
glimpsed interior in this world is pale — `shopInterior` #e2ddd2,
`libraryInterior` #e6e2d4 — and behind 0.42-opacity glass the supermarket read as
*shut*; and the interior plates are stretched 1.3–1.7× horizontally on the bands
they are mapped to, measured and accepted (it reads as a wider room, and it is a
fifteenth of what broke `alleyPlate`).

### Verification

- **221 484 cells** reachable, bounds x −95…85, z −85…115. Splice the district's
  own 87 colliders out and the same fill reads **224 842**; splice its twelve
  vehicles and it reads 222 456; without the district at all (its builder
  commented out and its cars spliced) **226 203**. So the district costs 4 719
  cells — 3 358 the buildings and walls, 972 the vehicles, the rest its sixteen
  trees. Nothing is sealed.
- Every one of the twenty-nine waypoints in the module header probes at ≤ 0.25 m,
  including both ends of the ramp, all four corners of the deck, the おもいやり
  bay, the yard, the dock, the coin park and the flight up to 湯の坂. `courtE`
  moved 0.7 m because a parked kei stands on the old one — the artefact this file
  already documents, not a blockage.
- **The recess is walkable** and the two-level case works: at (−37.4, 81.0) the
  fill holds both 0.62 (the tiled entrance floor) and 6.20 (the deck above it).
- 湯の坂's deck views west and south are unchanged, and the store does not appear
  in them — its wall is behind the street's own north row.
- No collider in the district overlaps another except where two runs meet at a
  pier or a corner, by pairwise audit. No prop origin lies inside any of the
  district's solid masses. No prop is more than 60 mm off the surface under it
  except the ones whose origin is their own mid-height.
- Production build clean at **63 modules**.
- Draw calls, measured with the shadow and ink passes included so they are *not*
  comparable to the ~3 050 colour-pass figure in `CLAUDE.md`: the crossing 9 368,
  the overbridge deck 10 364, this store's frontage 7 025, the roof deck 5 326.
  The roof deck is the cheaper of the two elevated viewpoints because the store's
  own mass occludes the half of the town the bridge can see.

### Audit against the supermarket brief

| Asked for | State |
|---|---|
| A two-storey-volume mid-sized community supermarket, clearly bigger than a conbini and far smaller than a mall | done — 21.6 × 16.4 m, 5.75 m to the deck, 354 m² of footprint against ひばりマート's 60 |
| Pale cream / pale grey / low-saturation body with a dark grey-blue eaves band | done — `m.wall` 0xf6f1e4, `m.wallGrey` 0xe2e0e4, `m.band` 0x59617a, and one accent (`PAL.leafDeep`) on the fascia |
| Four legible elevations: entrance, flank, delivery back, ramp side | done, and each is doing exactly one job — see the README note on why the frontage faces +z |
| Big glazed entrance, automatic doors, fictional Japanese fascia, banners, opening-hours plate, price posters, a slim rain canopy | done — `superFascia`, `superBoxSign`, three `superBanner`, `superHours`, four `superPoster` taped inside the glass, and a canopy with columns, a spine beam, purlins, a 0.16 m sheet, a gutter and two downpipes |
| Simplified interior glimpsed behind the glass: shelving, chillers, checkouts, ceiling strips, hung aisle signs | done — `superInterior` ×3 variants, and it was rewritten pale so the shop reads as open |
| A typical 前場: trolley bay, basket stacks, machines, recycling, drinks cage, promo stand, carton stack, umbrella stand, kerbs, a small bed, a 徐行 mark and a 本日特価 board | done, all of it, plus the guide lines, arrows, joints, petals, dapple and loose paper |
| Paving distinct from the road, white guide lines, pedestrian arrows, light wear | done — 90 mm jointed concrete against asphalt, two guide lines to the doors, two arrows, 徐行, tyre scrub |
| A short-stay area that does not block the doors | done — three bays, all *east* of the walking route, one occupied |
| Roof car park level with the onsen street, reached by an external ramp up the building's side | done — deck at 6.20 against 湯の坂's 3.20 + its two storeys, and the ramp wraps two flanks because a straight one does not fit |
| Ramp: pale concrete, white edges, yellow hazard, guards, crash walls, lighting, direction arrows | done — 0.62 m upstands with a collider per segment, seven arrows, anti-slip grooves every 0.42 m, a yellow hatch across the deck-end throat, and three wall bulkheads added this round |
| Corner: mirrors, anti-slip, height bar, fictional parking plates, low walls | done — two mirrors, a 制限高 2.1 m gantry with seven hanging flaps, `parkPlate` 0/2/3, and the landing walled on its two outer sides |
| 12–20 bays with lines, numbers, wheel stops, an accessible bay, in/out arrows, lamp columns, edge protection | done — twelve bays (ten of them 軽), `deckBay` 1–12, two wheel-stop runs, the おもいやり bay with its own mark and plate, two aisle arrows, four lamp columns, 0.80 m parapet + 0.42 m railing |
| A view out over roofs, poles, streets from the deck edge | done — and it needed the parapet dropped from 1.05 to 0.80, or the eye at 7.80 saw only a grey band |
| Roof extras: a small guide plate, a trolley return, one or two planters | done |
| Everyday Japanese cars, varied kinds, orientations and positions, not a showroom row | done — white compact, mint 軽, pearl 軽バン, mustard 軽, silver minivan, beige ライトバン on the roof; a 2 t lorry, a 軽トラ, a delivery van, two coin-park cars and a short-stay 軽 below. Three sit a couple of degrees out of line, the two rows face each other across the aisle, and half the bays are empty on purpose |
| A believable back-of-house: shutter, receiving door, dock, pallets, cages, cartons, waste bay, cold-store plant, outdoor units, extract, door light, warning plates, room for a van | done, and screened by a 2.1 m wall with a 4.2 m gateway so it is found rather than shown |
| A narrower service route from the store to the housing behind | done — the 3.2 m east passage, out either up the flight to 湯の坂 or east along the 2.4 m footpath into 桜守裏町's arm |
| A living road node: edge lines, bay lines, 徐行, a crossing, yellow no-waiting, mirrors, lamps, guardrail, covers, gullies, signage, a parking-entrance board, a 月極 plate, a few cones | done — 七丁目通り at 6.0 m with all of it, and the coin park's plate carries 月極 ２台 空きあり |
| A spur to ordinary housing so the store is *in* the neighbourhood | done — コーポ さかえ (3-storey walk-up), a 木造二階建 and a 二階半 on the north side of the road |
| A small coin park opposite, not a large one | done — six bays, gravel, one payment machine, two cars |
| Cherry or low planting at the entrance, petals, soft shadows, an anime silhouette from the deck | done — a cherry in a tree pit on the apron, four more on the verges, seven shrub clusters, five petal beds, sixteen grove trees closing the west and north |
| Fictional Japanese throughout, no real brands | held — スーパー さかえ 七丁目店, 七丁目 パーキング, and every plate drawn from scratch |
| No people anywhere | held |

### Noticed and not fixed

18. **The deck's sun/shade contrast is low** now that it is asphalt rather than
    render. It is correct — a dark flat plane under a high sun — and the parked
    cars and the paint both read better against it, but a frame of the deck has
    less tonal drama than the same frame did when it was accidentally cream. If a
    later round wants it back, the honest way is a lighter deck *and* a paint
    material with a cel ramp on it, not a paler slab.
19. **The interior plates are one flat plane each.** At two metres — which the
    walkable recess now allows — a supermarket interior wants one more layer of
    depth: a real gondola end or a counter box built outward off the plate, the
    way 蓬莱湯's lobby does it with `hollow`.
20. **`traffic.js`'s `schoolKerb` waypoint (5.0, −54.1) is inside the box lorry**
    parked there, and `koenmae`'s `eastLink` (45.6, 31.7) is inside the grove tree
    it names. Both are pre-existing and both are the documented artefact; they
    should be moved to ground a person can stand on next time that file is open.
21. **`flat: false` on a `cel()` material has done nothing for some time, and
    this file and `CLAUDE.md` both cite it as load-bearing.** `cel()` passes
    `flatShading` to `MeshToonMaterial`, and the three.js in `package.json`
    (^0.180.0) does not accept it — it prints
    `THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial`
    once per material and strips it, so **every cel material in the world is
    smooth-shaded**. Found while building a machine headless, where the warnings
    are not buried in a browser console. That means three notes are describing a
    world that no longer exists: the reeds' "a flat-shaded facet turned away from
    the sun is nearly black", the sphere's `flat: false`, and the bamboo's. It
    also means the *fix* for whatever those notes were working around may now be
    something else entirely. **Deliberately not touched** — the only honest way to
    change it is `MeshToonMaterial` plus a geometry-side `computeVertexNormals`
    decision per caller, and it would re-shade every surface in twenty-five
    districts. Worth a round of its own, with before/after frames of the reeds,
    the canal water and the planet's terminator.

---

## Audit against the residential-densification brief

| Asked for | State |
|---|---|
| **1. Densify the old low-rise housing north of the railway, west of the crossing** | done — ひばり台一丁目: a walk-up, a 長屋 四戸, a 連棟 三戸 and eight dressed frontages on a 2.4 m lane, with four passages south to the canal |
| **2. Extend the housing east of the station toward 三丁目** | done — ひばり台二丁目: a 38 m kerbed spine joining 公園前's link to the north lane's east arm |
| **3. A fuller community district round the library and east of the north lane** | done — ひばり台四丁目: the 町内会館, the pocket park, a walk-up, a 二階半, a carport bay, and the road head that gives it a mouth |
| **4. An older, narrower back street behind the onsen street and the shrine** | done — 桜守裏町: a 祠, a 長屋 四戸, a 木造平屋, a shared drying ground, three ways in |
| **5. Family housing, staff flats and small rentals along the school route** | done — ひばり台五丁目: グリーンハイツ, a 二階半, a detached house with a carport, a 連棟 二戸, a 送迎 bay and the 抜け道 between the two shops |
| **6. A middle-density belt round the children's park and ひばり荘** | done — 公園前, plus 二丁目's コーポ facing the park across its new east gate |
| Mixed house types, not one repeated block | done — 平屋, 二階建, 二階半, 3–4 storey コーポ, 連棟, 狭小住宅 with a garage, 木造, 長屋. Eight types across six blocks, and no two blocks use the same set |
| Varied roofs, wall colours, boundaries, entrances, windows | done — `blocks.js`'s `WALLS` array reaches eight tones; boundaries are block, timber, mesh and hedge; `plotWall` puts a real gate in each |
| Heavy per-house life: plates, post boxes, refuse points, drying poles, umbrella stands, pots, kitchen boxes, bicycles, kid's bikes, outdoor units, gas and water meters, mats, parcel boxes, shutters, carports | done — `dressPlot` allocates the slots once per plot so nothing lands on top of anything else, and `streetprops.js` supplies the new ones |
| Richer street network: one-car lanes, passing places, corner mirrors, back streets along boundaries, gutters, ramps, covers, ivy and pot shelves | done — nine new streets between 1.8 m and 3.6 m, six mirrors, `laneGutter` on every unkerbed one |
| **2. Small apartments with legible structure**: name plate, mailbox bank, notice board, external gallery, metal stair, bike shelter, parking, per-flat balcony, exposed pipes and meter boxes | done — three walk-ups, and the mailbox banks carry the right number of doors for the flat count |
| **2. Non-landmark community facilities**: clinic, pharmacy, laundry, estate agent, parcel lockers, notice board, small drinks frontage | done — all four fascias were already in `textures.js` and unused; the lockers are on コーポ みなみ's forecourt |
| **2. Coin/monthly parking, wheel stops, bay numbers, refuse points, street trees** | done — 月極駐車場 with four bays under the railway wall |
| **3. A 町内会館 with pale render, porch, notice board, canopy, parking, bike spaces, planting** | done — `makeHall`, in 四丁目's zone A |
| **3. A smaller pocket park and a children's bike stand** | done — 四丁目's north parcel |
| **4. Back-street feel**: exposed pipes, back doors, drying space, shared tap, narrow steps, side gates, stacked crates, a roadside 祠, cat bowls, cardboard | done — and the 祠 is the block's name: 桜守 is the shrine 400 m south |
| **5. School-adjacent**: small carport, ball box, chalk marks, drying racks, warm windows, kitchen boxes, community board, side parking, drop-off | done |
| No people anywhere, including on posters and signage | held |
| No high-rise, no commercial complex, no cyberpunk lighting, no realistic materials, no neon | held — nothing over three storeys, every fascia near-white with one bar |
| Everything connects; no isolated nodes; sight lines broken by buildings, poles, walls, trees, corners | held — one flood fill from the spawn reaches all of it, and the three sight lines that mattered were each cleared deliberately |

## Polish observed but not fixed

Items 1–6 are inherited and still true; read the previous round's reasoning in
git history if you need it. The new ones are 7–10, then 11–14 with the motor
vehicles and 15–17 with ひばり台六丁目.

1. **The shrine is still on the dim side.** Three passes have gone into this. Do
   not put a big canopy back on the south-west side.
2. **The apartment's access gallery in `district.js` is entirely self-shaded.**
   `makeWalkup` is the same type built better; if you ever rework ひばり荘,
   turning it so the balconies face the lane is the fix.
3. **The canal water still leans slightly toward "tile"** — the sky blocks could
   be fewer and longer.
4. **Small park props read weakly** — the drinking fountain is close to a plain
   white box.
5. **Empty skies on outward-facing views**, and **sharper since the planet was
   made a true sphere** -- the low hills that used to sit behind the school and
   north-east of 二丁目 were the only distant mass there was, and taking the
   relief out took them with it. At `R = 160` the ground horizon is 23 m and the
   cloud count is 22. If more is wanted, add distant *mass that is not the ground
   the town is standing on*: a far tree line, a ridge in `sky.js`. **No
   high-rise, and not by turning `RELIEF` back on** -- see the 球体化 section
   for what that costs.
6. **Shadow acne on large pale walls at grazing angles** — 2048 map over a ±34 m
   cascade is 33 mm a texel. Measure any change from the bridge deck.
7. **The library's frontage never sees the sun, and neither does its forecourt.**
   The sun is at `(-52, 62, 56)`, so a −z frontage is lit by the cool bounce
   alone and a 7 m parapet throws 6.4 m of shadow across the forecourt in front
   of it. This was considered and *kept*: it is architecturally right for a
   reading room, the warm vestibule glowing out of a cool elevation is the best
   thing about the building, and the approach along the lane shows the sunlit
   west flank against the shaded front, which is a strong composition. The
   mitigations are already in — lit name box with bracket lamps, pale-wood
   reveals, soffit and header, a warm strip under the canopy, warmer interior
   plates. If a future round disagrees, the honest fix is to rotate the whole
   thing to face −x and put the forecourt on its west side, which cascades into
   the coin park and three trees.
8. **The reed clumps read as yellow spikes at close range.** The heads are
   0.22 m cones on 0.6–1.0 m blades and on the verges, where the scale is
   smallest, the head is a third of the plant. Fine at distance, weak at two
   metres — and the new east arm of the canal puts the player next to them.
9. **The festival ground has no dusk state.** The lanterns are hung and unlit,
   which is correct for "two days out" and leaves the obvious next beat on the
   table: the shopping street already has a staggered ramp
   (`shotengai.js`), and reusing it here — one lantern run at a time, off the
   player's distance rather than a clock — would be the single highest-value
   addition left in the world.
10. **Almost nothing in the new districts is interactive.** Twelve `E`
    interactions and only two of them are in the new half — the 月極 park's
    machine in 二丁目 and the corner node's in 六丁目. The obvious remaining
    candidates are the phone box (lift the handset), the library's return post,
    and the 太鼓台.

Added with the motor vehicles:

11. **Nothing on the road is moving** — moved up from 13, because with
    twenty-two vehicles instead of thirty-six it is the most noticeable thing
    left, and 六丁目 sharpens it: the town now has a bus, a terminus, a route
    diagram and a timetable, and the bus never goes anywhere. The cheapest
    version of the fix is not traffic: it is one vehicle with its hazard lights
    on, or a lorry with its tail lift down and a crate on the pavement. **The
    expensive version is finally worth costing** — the minibus running its own
    loop the way the train runs the rail ring, driven off a position along a
    polyline rather than off a clock.
12. **Every vehicle in the world wears the same number plate.** `platePlate()` is
    one cached texture and all thirty-six plates share it, which is the right
    call for materials and the wrong one for the two or three plates you ever get
    close enough to read. A four-variant version keyed off the vehicle's index
    would cost four textures, not thirty-six.
13. **Two bays are compromised by props that were there first**, and both were
    left rather than moved. ひばり駐車場's payment machine stands at the mouth of
    bay 3, so the car in it is 0.5 m off its own line; and ひばりマート's three
    marked bays are 0.6 m short of the frontage because `gakkomae.js` stood two
    vending machines and a bin bank on it. Both look right — a car stopping a
    metre short of a wall is what happens — but if either is ever reworked, the
    markings are what should move.
14. **The two 0.70 m flood-fill readings are still unexplained** —
    `(45.6, 31.7)` on 公園前's east squeeze and `(-11.4, 51.0)` at 桜守裏町's 祠.
    Both read the same with every vehicle collider spliced out, so they predate
    this round and are almost certainly probe points written on top of something
    rather than real blockages. Worth one scan line each next time somebody is in
    those two blocks.

Added with ひばり台六丁目:

15. **The turning circle is the emptiest fifteen metres in the world.** That is
    partly the point — a 転回場 is empty by definition — but the only things on
    it are one bus, a yellow box, two arcs and the scrub marks. If it ever needs
    more, the honest additions are a painted centre spot, a second cone pair and
    a drain grating on the low side, and **not** another vehicle: a turning area
    with two things parked on it is a car park.
16. **六丁目 has two apartment blocks where the brief asked for two or three, and
    one detached house where it asked for several.** The envelope held exactly
    what went in it — the header enumerates the constraint — and the right way to
    add more is a *second* block north-east of the retaining wall on the shelf at
    z 70…80, not a third building squeezed into this one. That shelf is flat at
    2.4 m and completely empty.
17. **The connector down to 二丁目's north T is the district's one weak joint.**
    It is 3.2 m of asphalt threaded between 三丁目's 板塀 and コーポ みなみ's back,
    and from the main street looking west the view out of the district ends in
    two blank walls. Nothing is wrong with it; it is simply the only approach in
    the world that arrives at a district through a gap rather than along a street.

---

## Performance

Measured with one method on both sides, colour pass only, from a warm page:

| view | draw calls | triangles submitted |
|---|---|---|
| the crossing | 2 506 | 1 207 k |
| the bridge deck | 4 361 | 1 272 k |
| the residential lane | 345 | 932 k |
| the library forecourt | 307 | 926 k |
| the festival ground | 341 | 1 071 k |

Two things to read out of that table:

- **The new districts are almost free in the old views.** They are ordinary
  baked meshes and the frustum test on them is exact, so standing at the
  crossing you pay nothing for the library or the festival ground.
- **The floor is 900k triangles and it is the two rings.** Anything planet-scale
  is never culled — after the bake its bounding sphere is the whole planet — so
  the railway and the canal are submitted on every frame from everywhere. The
  canal added about 270k of that. Moving its coping, service paths and retaining
  kerb off the remote ring took 134k back and nobody can tell.
- Cutting the rest means a per-mesh `maxEdge` override in `bakeToPlanet`, and it
  was tried and rejected: at `maxEdge = 9` a chord sags 63 mm, which is fine on
  its own but opens a visible slot wherever a fine-tessellated layer sits on a
  coarse one — the coping on the wall, the path slab on the bank. Every layer
  would have to go coarse together, and then the bridges, which must stay fine,
  mismatch at their seams. Not worth it for 130k triangles of vertex work.

Scene totals: **859 k triangles, 6 664 baked meshes, 13 362 instances, 453
colliders, 50 rigid rigs.** Wall-clock timing on this machine drifts 33–42 ms
run to run with nothing changed, so **judge a change by draw calls** and only
believe a timing delta you can reproduce across alternating A/B runs inside one
page session.

`makePlanter` is still eleven meshes and is placed about forty times now; the
`makeBikeRack` treatment is the remaining easy win.

---

## How to check a route — do this before you believe one

Two tools, injected into the dev console rather than committed. The flood fill
found five separate blockages this round and every one of them was invisible in
a rendered frame.

```js
// BFS on a 0.35 m grid from the spawn, with the player's own numbers
const w = window.__scene.world, R = 0.34, STEP = 0.38, G = 0.35;
const blocked = (x, z, y) => w.colliders.some((c) =>
  !(c.top !== undefined && c.top <= y + STEP) &&
  x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R);
// key the visited set on (cell, height bucket) or a staircase reports unreachable:
// a one-bit-per-cell fill claims the step cells at ground height from the side
// before the climb reaches them, then refuses to revisit.
const seen = new Set();                        // seen.add(cell * 64 + Math.round(y / 0.3))
```

**Two things about it changed with the hills, and both are load-bearing.**

**A height *tolerance* is not a height bucket.** The obvious way to allow
revisiting — `if (prev !== undefined && Math.abs(prev - ny) < 0.2) continue` —
ping-pongs forever on sloping ground, because two neighbouring cells can each
justify re-pushing the other indefinitely. Measured on the first run over ひばり山:
**53.6 million visits for 770 000 cells**, and it never terminated. A `Set` keyed
on `(cell, round(y / 0.3))` converges in 12 M.

**Run it in chunks.** The window has to be x −170…170, z −200…130 now, which is
900 000 cells and about forty seconds of JavaScript — past every timeout in the
toolchain, and a synchronous run that overruns leaves the renderer wedged so hard
that `location.reload()` also times out and the dev server has to be restarted.

```js
// bucket the colliders and platforms by 6 m first -- world.heightAt walks the
// whole platform list per call, and there are 480 of them
window.__fill = { reached, done: false, visits: 0 };
const step = () => {
  let budget = 200000;
  while (stack.length && budget-- > 0) { /* ... */ }
  if (stack.length) setTimeout(step, 0); else window.__fill.done = true;
};
setTimeout(step, 0);
// then poll:  JSON.stringify({ done: __fill.done, reached: __fill.reached.size })
```

Then probe named places and report the *distance to the nearest reached cell*,
not a boolean — a boolean says "unreachable" for anything one grid step off, and
half of this round's first run was that rather than a real blockage.

**Probe every block's waypoints, not just the one you are working on.** Each
district header carries a `FLOODFILL` list for exactly this; run all of them
together after any change that adds furniture, because a 0.4 m pole added on one
street can seal a 1.4 m squeeze on another one built by a different module, and
that is not a hypothetical — it happened this round.

**A reading of 0.35–0.70 is usually a bad probe point, not a blockage**: the
grid's cell centres move when you change the bounds, and a point written on the
frontage line of a building is inside its collider once the player's radius is
added. Confirm with a scan line across the suspect gap rather than by trusting
the number:

```js
const { reached, X0, Z0, G } = window.__fill;
const has = (x, z) => reached.has(Math.round((x - X0) / G - 0.5) * 100000 + Math.round((z - Z0) / G - 0.5));
let s = ''; for (let i = 0; i <= 20; i++) s += has(44.2 + 3.0 * i / 20, 31.7) ? '.' : '#';
// '.############........' -- blocked for 1.9 m, open for the last metre
```

A coarse ASCII map of the whole region is the other half of it, and it is how
the 四丁目 blockage was diagnosed in one call: print `.`/`#` over a grid of
`x`/`z` and read the shape of the walls straight out of it.

`ctx.collide`-hunting a specific point is the other half of it:

```js
const R = 0.34, y = w.heightAt(x, z);
w.colliders.filter((c) => c.top > y + 0.38 &&
  x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R);
```

Do not drive the walker at a waypoint and call a stall a blockage: it stalls on
anything a real player would sidestep.

---

## Rules that must not be broken

- **No people.** Not as geometry, not as silhouettes, not in a crowd, and not
  drawn on any poster, ema, noren, flag or shop sign. This is the constraint the
  whole project hangs on, and it has been breached twice by accident (painted
  passengers in the train windows, and nearly again by a photo studio's window).
- **No cyberpunk, no high-rise, no realistic materials, no complex interiors, no
  neon.** Warm sunlight, cool violet-grey shadow, pink-white blossom,
  teal-leaning green, pale buildings, dark outlines.
- **Every Japanese string is invented.** Existing ones: 青空商店, ひばり台,
  さくら坂商店街, 桜守神社, 松の湯, ひばりマート, パン工房こむぎ, ひばり荘,
  そら茶, なごみ, ハレ水, ひなた, さくら通り, つばめ書房, しらゆき, 一心,
  さくら堂, みどり, ほしの, ひばり橋, こばと橋, なかて橋, 第二分水門,
  ひばり台土地改良区, ひばり台図書館, ひばり台コーポ, レコード ほしぞら,
  電器 たかの, 米・酒 なかの. Added with the six residential blocks:
  ひばり台一丁目, ひばり台二丁目, ひばり台四丁目, ひばり台五丁目, 公園前,
  桜守裏町, ひばり台内科, くすり さかい, コインランドリー ひばり, ひばり不動産,
  コーポ みなみ, グリーンハイツ, メゾン さくら坂, ハイツ ひばり, さくら荘.
  Added with 学校前通り: 文具 ひばり堂, ひばり輪業, こばと橋南詰, 川端の道.
  Added with the motor vehicles: ひばり台ふれあい号 (the community minibus) and
  its one stop, ひばり台 図書館前. Added with the bus turnaround:
  ひばり台六丁目, 六丁目通り, 六丁目 北の道, お弁当 のはら, 雑貨 まるみ,
  コーポ ひがし, ハイツ みのり, 第二 さくら荘, and the route diagram's five
  stop names (踏切前, 商店街, 図書館前, 町内会館, 六丁目). Added with the back
  hills: ひばり山, ひばり山トンネル, ひばり山 展望台, ひばり山 遊歩道, 山ノ神,
  林間広場, 尾根道, 裾道, and ひばり電鉄 — which is the first time the railway
  operator has been named at all, and it appears only on the tunnel's works
  plate. No real brands, no real place names — and no marque, model or badge on
  any vehicle either, for the same reason.
- **Six residential blocks, one shared kit.** `blocks.js`, `plots.js` and
  `streetprops.js` exist so that a seventh block is a layout problem and not a
  modelling one. If a new block needs a component none of them has, add it
  there rather than in the block — two copies of the same assembly is how both
  copies of the bicycle ended up with the fork 0.3 m short of the front hub.
- **Author flat, let the bake do the sphere.** Never write spherical placement by
  hand.
- **A new district returns its planting**, it does not plant.
- **Do not overturn the main scene.** Every nudge to existing content is
  commented where it happens with the reason, and listed in the table above.
  Keep that bar: small, justified, and recorded.
