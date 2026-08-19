# NEXT_4 — what fifteen minutes of film showed

Nothing in this file is implemented. It is a list of things that went wrong, or
looked wrong, while recording `sakura-crossing-15min.mp4` — a scripted
fifteen-minute play-through at 1080p30 — together with the mechanism behind each
one where I could find it, and what might be done about it. Priority order is
mine and arguable; the evidence is not.

**Where the evidence comes from.** The recorder in `tools/rec/` drives the real
game through its own inputs and can run the whole fifteen minutes as a
simulation in about fifteen seconds (`--fast`). Everything measured below was
measured through it, and every measurement can be re-run. Where I am guessing, I
say so.


## 1. Animals walk on the railway, and the train drives through them

**Seen.** Six minutes of world time, sampling every animal's position: a ひよこ
spends the whole time between the lineside fences, at `z` from −0.3 to +0.8 —
the centre line of the track — around `x` −8 to −11. Its `y` is 0.00 and
`heightAt` under it is 0.00, so it is standing on the ground *plane* while the
ballast, sleepers and rail sit above it. That is the "animal under the track"
you saw. At one sample it is in the `dance` state, which means it had led
somebody to a landmark and arrived, on the rails.

**Mechanism.** Two things, and the first is the one that matters.

`walkable()` in `world/landmarks.js` does not require a clear corridor. It
samples every `STEP = 0.5 m` and tolerates a blocked *run* of up to
`BLOCKED_RUN = 4` — **two metres of solid obstruction in a row** — and up to
`BLOCKED_FRACTION = 0.30` of the edge overall. The lineside fence is 0.3 m
thick: one sample, comfortably inside both budgets. So the graph joins the
street to the trackbed as if the fence were not there, and every route planner
downstream believes it.

That tolerance is deliberate and the comment above it argues for it well — a pet
does not need a clear tube, and demanding one produced seventy-one islands. The
problem is that it cannot tell a parked kei truck from a fence, and a fence is
exactly the case where "the last two metres are what the obstacle probe is for"
stops being true: the probe steers *round* obstacles, and there is no round.

Second, nothing anywhere treats the railway as special. `world/pets.js` has no
knowledge of it, and the train's only colliders are the two boom blocks in
`world/index.js`, which exist for the player. An animal on the rails is not
pushed, warned or hit; the train passes through it.

**Options, cheapest first.**

- A keep-out volume for the pets' steering: the corridor between the lineside
  fences is a rectangle, and `pets.js` already probes for obstacles. Treating it
  as permanently occupied costs one box test and fixes the symptom everywhere,
  including animals that wander in without being routed in.
- A per-collider "this is a barrier, not clutter" flag that `walkable()` refuses
  outright regardless of the run budget. More honest, more invasive: something
  has to mark the fences, and the district builders are where that knowledge
  lives.
- Give the train a sweep test against pets and have it scatter them, which is
  the fun answer rather than the correct one, and does nothing about the animal
  that is standing there when no train is due.

**Worth checking while in there:** the trackbed reads as ground at `y = 0`, so
anything that walks in is drawn sunk to the ankles in sleepers. Whether the
rail deck should be a platform (so feet sit on it) is a separate question from
whether anything should be there at all.


## 2. The graph and the walker disagree about what is walkable

**Seen.** Following an animal that had offered to show me somewhere, the walk
ended with the animal `wait`-ing thirteen metres away on the far side of the
商店街's north fence, and the player pressing forward into it until the animal
gave up and went back to grazing. Twice, in different runs, in different places.
Re-testing the whole lattice against the *player's* collision rules rather than
the graph's, **326 of 1851 sampled edges — about eighteen per cent — are edges a
person cannot use.**

**Mechanism.** Same tolerance as §1, plus a smaller mismatch: `MAX_RISE = 0.45`
in the graph against `STEP = 0.38` in `core/player.js`. A 0.40 m rise is a step
the graph will plan through and the walker cannot climb.

**Why it matters more than it looks.** `lead()` is the game's best idea — an
animal that walks you somewhere and is yours when you get there — and its
failure mode is silent. The animal does not say it has lost you; it waits, then
`abandon()`s, and the player is left standing at a fence with nothing to show
for ninety seconds. If the offer is going to be made, the route behind it should
be one the player can walk.

**Options.**

- Validate a candidate route against the player's rules at `lead()` time and
  pick another landmark if it fails. The A* is already bounded and cheap.
- Or make the failure legible: an animal that has waited past `LEAD_WAIT` comes
  *back* to the player and re-offers, rather than standing where the player
  cannot get to.
- Longer term, one clearance model with two thresholds — cat and person — rather
  than a graph that means "cat" and callers that assume "person".


## 3. Nine of the thirty-nine landmarks can never be offered

**Seen.** The boot already warns about part of this: `landmarks: no route in or
out of Array(2)` appears in the console on every DEV load (`landmarks.js:514`).
Dumping components tells the fuller story. Of 39 placed landmarks, **30 are on
the town's main component and 9 are not**:

| landmark | component |
|---|---|
| 温泉 `onsen` (−36.4, 49.6) | 1 — five nodes |
| `pier` (166, −80) | 3 — one node |
| `lakecafe` (178.6, −140) | 4 — one node |
| `lakepark`, `boats`, `camp`, `hide`, `suijin`, `dam` | 2 — 792 nodes, a whole region of its own |

`reachableLandmarks()` runs a Dijkstra from the animal's node, so nothing off
component 0 can ever be offered as a destination. The onsen is one of the four
hero images in `README.md` and no animal in the game can take you there.

**Options.** Component 2 is not broken — it is a second district with 792 nodes
and no bridge to the first. Whether that wants a walkable link, a rule that
guides may only offer their own component (so the failure is invisible rather
than absent), or something that crosses the gap deliberately, is a design
question. See §6: there is already something in the game that crosses it easily.


## 4. The player can get into the trackbed and cannot get out

**Seen.** Aiming the walker along a lattice route past the station put it in the
ballast between the rails, with the platform edge at chest height. It stayed
there for four minutes of film — every route out was up a step it could not
take. The camera at rail level looking up at the platform is in
`.shots/`-adjacent dry-run stills if you want to see it.

**Mechanism.** `STEP = 0.38` against a platform edge that is higher, and no
ramp. Getting *in* is easy because the fence is one blocked sample (§1).

**Options.** Fixing §1 removes the routes that lead in, but not the ability to
walk in. A one-way trap is worth a guard of its own: either the corridor becomes
a genuine barrier for the player too, or something in it is climbable.


## 5. The dragon's fire is aimed where the camera is not

**Seen.** Standing eleven metres from the dragon and asking it to breathe, the
jaw opens on camera and the fireball is thrown clean out of frame. Repeatedly.
It only came into shot after I moved the camera back to about twenty metres, and
the difference between those two shots is the difference between the effect
existing and not.

**Mechanism.** `pickTarget()` is doing exactly what it says: when the player is
inside `AUDIENCE = 45`, it throws at a bearing `0.55–1.35 rad` off the line to
the player, `THROW = [11, 21]` metres out. That is a good instinct — beside you,
not at you — but it is specified in the *dragon's* frame, and what the player
sees depends on the triangle. At eleven metres, the worst case puts the landing
point about seventy degrees off the view axis against a half-field of view of
roughly forty-three; even the best case is about seventy-four. At thirty metres
the same cone closes to about fifteen degrees.

**Options.** Choose the bearing so the burst lands inside the frustum rather
than at a fixed angular offset from the player — the same rule expressed in the
viewer's frame instead of the thrower's, biased by distance. The intent
("beside, not at") survives; the shot stops depending on where you happen to be
standing. Cheap and, I think, the single highest-value visual fix here: this is
the game's best effect and it is currently invisible from the distance a player
naturally stands at.


## 6. Riding

**Nothing to fly to.** At `SADDLE.cruise = 16 m/s` the animal laps the planet in
sixty-three seconds, so a held W leaves the district in about twenty and the
next four minutes are empty ground. Every good frame in the film comes from a
*deliberate* orbit of the town at sixty to a hundred metres' radius, which is
not a thing the controls suggest or reward. Meanwhile there is a whole lake
district at `x` 133–251 (§3) that nothing on foot can reach. The dragon is the
obvious answer to the question §3 asks.

**The prompt sits in the middle of the best shots.** `E · get off` is drawn
centre-frame for the entire five minutes of flight, over the little-planet
horizon and everything else. On foot the prompt is a response to what you are
looking at; while riding it is a constant. Fading it a few seconds after
mounting, or moving it out of the optical centre, would cost nothing.

**The boom does not lead the landing.** Coming down, the animal's body holds the
middle of the frame and the ground it is aiming at is behind it. Worth a look at
whether the descent should raise the camera.

**Mounting has no proximity guard.** `canRide()` checks state and grounding but
not distance, so `mountRider()` will seat a rider from any range. The card path
can only fire within the 3 m pick, so this is not reachable in play today — but
it is a trap for anything that ever calls it from elsewhere.


## 7. The lead's payoff is all-or-nothing and silent

`checkArrival()` credits the arrival only while **both** the animal and the
player are inside the landmark radius. Following at a polite five metres and
stopping when the animal starts dancing is enough to get nothing, with no
indication that anything was missed — in test runs this was the difference
between two companions and none, and it was not obvious from inside the game
which had happened. Either widen the player's half of the test, or have the
animal wait, visibly, until you have caught up.


## 8. There is no sound but music

`core/audio.js` is a playlist and a volume ramp; there is no effects system at
all. The crossing bells blink silently, the boom comes down silently, a
three-car train passes two metres away silently, the dragon's jaw opens
silently, and a fireball bursts silently. Given how much of this project's
budget goes on the *look*, the absence is conspicuous — and the crossing bell
alone, on the sequence that already exists in `updateSequence()`, would carry a
surprising amount.


## 9. Smaller visual notes

- **Interacting with a small animal points the camera at the floor.** Standing
  the required two metres from a cat and aiming at it is a pitch of about −0.9
  rad: the frame is mostly pavement. A look-at that aims at the animal but
  keeps some horizon, or an interaction range that scales with the target's
  height, would frame these better.
- **The far side of the planet is bald.** Long flights cross large stretches of
  untextured ground with nothing on them. Not a defect — the district is meant
  to be one place on a small world — but at ninety metres the emptiness is most
  of the frame, and cheap far-field scatter would carry it.
- **The shadow under a big mount.** In several school-ground frames the dragon's
  shadow reads as a large soft blob rather than a shape. I did not chase this
  and it may simply be the cascade at that distance; worth one look at a
  seven-metre caster against the budget in `core/perf.js`.


## What I would do first

1. §5, the fire aiming — one function, and it makes the best effect visible from
   where players actually stand.
2. §1, the railway keep-out — one box test, and it removes the most obviously
   wrong thing on screen.
3. §6's prompt fade and §7's arrival radius — both tiny, both remove a bad
   experience that is currently invisible to the person having it.
4. §2 and §3 together, as one piece of work about what "walkable" means, since
   they are the same disagreement seen from two ends.
