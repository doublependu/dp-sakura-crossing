import * as THREE from 'three';
import { flat } from '../core/toon.js';
import { clamp, rngKit } from '../core/util.js';
import { HEIGHT, JAW_OPEN } from './dragonmodel.js';
import { R, basisAt, positionAt, flatAt, wrapX, wrapDelta } from './planet.js';

/* ------------------------------------------------------------------ *
 * 竜 -- the dragon.  One of it, and it is the only thing in this world that
 * is bigger than you.
 *
 * It shares almost all of its machinery with `pets.js` and it is a separate
 * file because it shares almost none of its *rules*.  What carries over
 * unchanged, and is worth naming so the two can be read against each other:
 *
 *   - **Built after the bake.**  `bakeToPlanet` folds geometry into world
 *     space and clears container transforms, which destroys animation pivots,
 *     so this is added to the *scene* and re-seated on the sphere every frame
 *     from `basisAt`/`positionAt`.  Every coordinate below is flat authoring
 *     space, like every other builder.
 *   - **The wander is a turn rate, not a heading.**  What is integrated is the
 *     second derivative, so a path comes out as arcs joined smoothly rather
 *     than as a polyline with a visible corner at every decision.
 *   - **`headingTo(dx, dz) = atan2(-dx, -dz)`**, the walker's convention, and
 *     the models are authored facing +z, so `ry = heading + PI`.
 *   - **`findSpot`**, because a written coordinate is a guess about ground
 *     built by forty modules and half the time the guess is a flowerbed.
 *
 * What is different, and why:
 *
 *   - **It does not flee.**  `pets.js` startles an animal that is rushed, and
 *     that rule is printed on the title card.  A dragon does not flee a
 *     walker: rush it and it *stands up*, and if you keep coming it roars.
 *     Same idea read the other way round, one branch instead of a state.
 *   - **It does not guide.**  `lead()` walks the landmark graph, whose edges
 *     are sampled straight lines a half-metre probe steps over.  A 4.3 m
 *     wingspan on a two-metre footway is a bug report.
 *   - **It is a ground animal and a flyer in the same body.**  The seam is the
 *     take-off, which is the only genuinely new movement in the file: it runs
 *     across the school ground first.  A 2.4 m animal that lifts vertically
 *     off a standing start looks like a helicopter.
 *   - **It is drawn to 150 m rather than 62.**  The pets' cap would pop it out
 *     of the sky mid-circuit while you were watching it.
 *
 * ------------------------------------------------------------------ *
 * ALL EIGHT CLIPS, AND WHAT EACH ONE IS FOR
 *
 *   sleep         the long default at the roost, and the reason it is here is
 *                 that a still frame is what this world is made of.  It never
 *                 falls asleep while you are watching it arrive.
 *   idle          woken, between wanders, and perched
 *   walk          crossing the school ground
 *   run           the twelve metres of run-up before it leaves the ground
 *   hover         both ends of every flight -- the climb out and the landing
 *   fly_forward   the circuit over the hills
 *   roar          arriving at the crest, and saying hello
 *   breathe_fire  the cast -- **entirely its own idea**.  Its `firejet` bone is
 *                 what opens the jet (see `dragonmodel.js`), so the effect is
 *                 gated on the animation rather than on a clock running beside
 *                 it.  See "WHY IT BREATHES" below.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Where it lives.
 *
 * The roost is inside 校庭 -- `GND = { 36..80, -67.5..-45.5 }` in `school.js`
 * -- at the far corner, backed by the gym and the courtyard.  Not at the
 * `schoolyard` landmark (40, -44.2), because the tiger already lives there
 * with a 14 m radius and two animals sharing an anchor is two animals standing
 * inside each other.
 *
 * The circuit is five waypoints and it is deliberately a *loop*: an
 * out-and-back is the same silhouette flying at you and then away from you
 * along one line, twice.  Every leg of this is over open ground somebody
 * standing on the school ground or the 展望台 deck can see against sky, and
 * the whole thing is about 300 m -- forty seconds of flight, which is long
 * enough to be an absence and short enough that whoever watched it leave is
 * still there when it comes back.
 *
 * The summits it crosses, out of `hills.js`: A0a (24, -116) at 8.0 m, A1
 * (30, -140) at 16.5 m with the 展望台 on it, A0b (72, -112) at 7.0 m.  It
 * does not use `TRAILS.main`, which is 117 m of switchbacks laid out for a
 * walker because the band z -100..-124 is a uniform 1-in-2.  It goes over.
 * ------------------------------------------------------------------ */
/**
 * The roost, and both numbers are answers to the same measurement.
 *
 * It was (66, -60) with an 18 m leash, which sounds like the far corner of the
 * ground and is not: an 18 m circle about that point reaches z = -78, and the
 * **gymnasium** is at x 56..76, z -84..-70.  So the leash's own reach included
 * the inside of a building, and see the note on `landing` for what that cost.
 *
 * 校庭 is x 36..80, z -67.5..-45.5.  This is its middle, with a leash that
 * keeps every part of a 7 m wingspan on the running track.
 */
const ROOST = { x: 58.0, z: -56.5, r: 12 };

/**
 * Everything below was tuned against a 2.4 m animal, and the animal is 5.5 m.
 *
 * Rather than re-typing a dozen numbers, the size-dependent ones are scaled --
 * and **not all by the same power**, which is the only interesting thing here.
 * Distances scale with the body (`SIZE`), because a stride, a wingspan and the
 * room needed to turn are all lengths.  Speeds scale with its square root,
 * because a bigger animal is not proportionally faster: doubling a creature's
 * height and its speed together gives you something that crosses its own body
 * length in the same time, which is exactly what makes scaled-up models read
 * as toys.  Twice the size at 1.4 times the speed reads as weight.
 */
const SIZE = HEIGHT / 2.4;
const PACE = Math.sqrt(SIZE);

const CIRCUIT = [
  { x: 30.0, z: -92.0 },                 // over the hill-foot road, past the 裏門
  { x: 24.0, z: -114.0 },                // A0a, the foothill behind the school
  { x: 30.0, z: -138.0, perch: true },   // the near summit, beside the 展望台
  { x: 78.0, z: -116.0 },                // back over A0b's shoulder
];

/* ------------------------------- behaviour ------------------------------- */

const WALK = 1.15 * PACE;   // m/s on the ground
const RUN = 3.6 * PACE;     // the run-up
const FLY = 7.5 * PACE;     // the circuit
/**
 * Metres of clear air under its feet on the circuit.
 *
 * The school block's roof rail is at about 10.5 m and the gym is 8, so this has
 * to clear the taller of them with the animal's own five and a half metres
 * sitting on top of it -- 15 puts its feet four and a half metres over the
 * highest thing it crosses and its head twenty metres up, which from the school
 * ground is squarely against sky.
 */
const CRUISE = 15.0;
const CLIMB = 1.9 * PACE;   // m/s the altitude changes at
const RUNUP = 12.0 * SIZE;  // metres of ground it covers before it leaves it

/** Seconds at the roost between trips, and seconds perched at the crest. */
const TRIP_EVERY = [55, 110];
const PERCH_FOR = [12, 22];

/**
 * Close enough to a waypoint to turn for the next one.
 *
 * **Not scaled with the animal**, and that is the point.  Scaling it put the
 * figure at 20.6 m, which for the two waypoints that end in a landing meant
 * beginning the descent twenty metres short of where it meant to touch down --
 * and on the way home from the circuit, twenty metres short of the roost is
 * inside the gym.  A waypoint tolerance is about the flight path, not the
 * wingspan: 12 m at 11 m/s is one second of anticipation, which is what a turn
 * needs.
 */
const NODE_REACH = 12.0;
/** And a touchdown is a *place*, so it gets its own, much tighter one. */
const TOUCH_REACH = 3.5;

/**
 * It falls asleep only when nobody is near enough to watch it do so, and wakes
 * well before that -- `WAKE_NEAR < SLEEP_ALONE` is the hysteresis, and getting
 * it the wrong way round gives an animal that wakes up the instant it dozes off
 * whenever the player is standing in the gap between the two.
 */
const SLEEP_AFTER = 40;
const SLEEP_ALONE = 30;
const WAKE_NEAR = 22;
/**
 * Crowd it inside this and it stops wandering and looks at you.
 *
 * **Barely scaled**, and the reason is a bug that scaling caused.  At `4.5 *
 * SIZE` this became 10.3 m, and 10 m is most of the distance anyone stands at
 * to watch something -- so the animal held perfectly still for as long as
 * anybody was looking at it, which is the exact inverse of what the rule is
 * for.  Measured, on the first run at 5.5 m: twelve minutes of `idle` and eight
 * metres of ground covered.
 *
 * What it actually has to be is personal space, which grows with the body but
 * not with the whole animal: a couple of paces past the wingtips.
 */
const LOOM_NEAR = 2.6 * SIZE;

/* --------------------------------- the fire --------------------------------- */

/* ------------------------------------------------------------------ *
 * WHY IT BREATHES
 *
 * It used to be a menu item.  You walked up, pressed `E`, picked "ask for
 * fire", and spent 1.6 seconds aiming a marker with the crosshair.  All of that
 * is gone, and what replaced it is the shorter, better answer: **it breathes
 * when it feels like it, and it feels like it far more often when somebody is
 * watching.**
 *
 * Which is also the only version that fits this world.  Nothing else here has a
 * verb attached to it -- you walk, you look, and you say hello to an animal --
 * and a button that makes something explode was a different game wearing this
 * one's clothes.  A dragon that breathes fire *because it is a dragon*, on its
 * own clock, in front of you, is weather.  The whole town is built out of
 * weather.
 *
 * The audience rule is doing real work rather than being a flourish: at the
 * roost it tries every 16-34 s with a player inside 45 m and every 50-110 s
 * without one, so walking up to the school ground is what makes the place go
 * off.  Nothing about that is announced, and nothing has to be.
 * ------------------------------------------------------------------ */

/** How much of the 3 s `breathe_fire` clip has run when the jet opens. */
const JET_OPEN = 0.05;
/** Seconds between attempts at the roost, with an audience and without one. */
const CAST_EVERY_NEAR = [16, 34];
const CAST_EVERY_ALONE = [50, 110];
/** Inside this, the player counts as an audience. */
const AUDIENCE = 45;
/**
 * How often a perch on the crest ends in one.
 *
 * High, on purpose, and for a sightline: the summit is the one place in this
 * world where the animal is against sky at eighty-six metres with nothing in
 * front of it, so a burst up there is the widest-read thing it does.  It is
 * also the only cast nobody has to be nearby for.
 */
const PERCH_CAST = 0.7;
/** How far in front of itself it throws, metres. */
const THROW = [11, 21];
/** It turns to face the target first if it is further off the nose than this. */
const TURN_FIRST = 0.5;

/* --------------------------------- the ride --------------------------------- */

/* ------------------------------------------------------------------ *
 * BEING RIDDEN
 *
 * The second thing in this world you can get on, and the first that leaves the
 * ground with you.  It is built on the e-bike's terms and it is worth saying
 * what those are, because they are what keep a flying mount inside a game about
 * walking slowly through a suburb:
 *
 *   - **You do not summon it.**  There is no key for a dragon.  You walk the
 *     ninety metres to 校庭, and it is asleep, or awake, or out on its circuit
 *     -- and if it is out, you wait or you come back.  Missing it is a real
 *     outcome, the same way the train's timetable is real.
 *   - **You borrow it.**  Every autonomous clock is *frozen*, not reset, while
 *     somebody is on it, and it picks its own life back up mid-thought when
 *     they get off.  Then it goes home.
 *   - **It is not a weapon.**  `F` throws the same cinder at the same ground
 *     under the same veto (`cinder.canLand`), and there is nothing in this
 *     world to hit.  See `riderBreathe`.
 *
 * The flight model is four numbers and one idea: **the animal follows the
 * camera, and arrives a beat late.**  The rider looks somewhere and the dragon
 * swings after them at a bounded rate, which is what weight looks like.  The
 * alternative -- heading *is* yaw, rigidly -- makes five and a half metres of
 * animal handle like a mouse cursor, and it is the single most common way a
 * flying mount ends up feeling like a camera with a model glued to it.
 *
 * **Altitude is a consequence, not an axis.**  There is no up key and no down
 * key: climb is `speed · sin(nose)` plus whatever the wings are beating, minus
 * a sink when nothing is driving it.  You gain height by pointing at the sky
 * and going, which is the only version of this that teaches itself.
 * ------------------------------------------------------------------ */

const SADDLE = {
  cruise: 16.0,     // m/s on W -- a lap of the planet in 63 s
  boost: 26.0,      // on Shift+W -- a lap in 39 s
  accel: 3.2,       // m/s² toward the wish speed ...
  brake: 6.0,       // ... and away from it, because S has to mean something
  /**
   * A wing-beat, in m/s of climb, and how long one is worth.
   *
   * Held, the key is a steady 4.5 m/s.  Tapped -- which is all a touch button
   * can send -- it decays over `beatFor`, so one press is one beat.  It is also
   * what puts the animal in the air at the end of a run-up, whatever the rider
   * is doing with the key at that moment.
   */
  beat: 4.5,
  beatFor: 0.8,
  sink: 1.2,        // m/s with nothing driving it
  /**
   * The ceiling, over the terrain -- and it is derived rather than chosen.
   *
   * `horizonFor(90) = sqrt(2·160·90 + 90²) = 192 m`, and `scene.fog.far` is
   * 205.  So at ninety metres the ground runs out over the curve of the planet
   * a whisker before the fog would have taken it: the shot at the ceiling is a
   * complete little world with a clean edge, and going higher buys nothing but
   * more of the same disc against more sky.
   */
  ceiling: 90.0,
  turn: 1.1,        // rad/s following the camera ...
  assist: 1.6,      // ... and with A or D held into it
  bank: 0.62,
  nose: 0.5,        // rad of the rider's look the nose will take
  /** Above this the wings stop hovering and start flying. */
  flap: 4.0,
  /** It will not land on ground it cannot stand on; it holds here instead. */
  hold: 2.0,
  /** Seconds between rider casts.  At cruise that is 22 m between impacts. */
  every: 1.4,
};

/**
 * The jaw, opened by hand.
 *
 * `breathe_fire` is a three-second grounded clip and cross-fading into it at
 * altitude is an animal that stops flapping, which is an animal falling out of
 * the sky -- the constraint PLAN_3 wrote down and which does not go away
 * because somebody is sitting on it.  So the rider's fire does not touch the
 * mixer: the `jaw` bone is rotated on top of whatever the flight clip is doing,
 * exactly the way `lookAt` rotates the head, on the envelope below.
 *
 * It is deliberately quicker than the animator's own -- 0.76 s against three
 * seconds -- and that difference is the point.  The dragon's own fire is a
 * display it decided to put on.  The rider's is a snap of the head, and the
 * two should not be mistaken for each other in the same shot.
 *
 * (The plan this was built from kept the real clip for a cast made while
 * standing.  It was dropped on contact: playing it locks the rider out of the
 * controls for three seconds and needs a second trigger path beside this one,
 * to buy a nicer pose for the one case nobody will spend any time in.)
 */
const JAW = { open: 0.18, hold: 0.30, close: 0.28 };

/**
 * The aim: a march against `heightAt`, not a raycast into the scene.
 *
 * The scene is one baked planet mesh and ten thousand props, so a real ray
 * would test all of them and come back with a *roof* as often as ground -- the
 * wrong answer for a thing that lands and burns.  `heightAt` is the surface the
 * animal itself walks on and the one `canLand` vetoes against, so the aim and
 * the veto agree by construction.
 *
 * Coarse then bisected: 70 samples out to 140 m and eight halvings, which
 * resolves the crossing to 8 mm for 78 height queries.  The step cannot skip
 * anything that matters -- the field is terrain and decks, and there is nothing
 * thin and tall in it.
 */
const AIM = {
  reach: 140,
  step: 2.0,
  refine: 8,
  /**
   * Where a shot at nothing goes off, and why there is such a thing.
   *
   * **On this planet most of the frame is past the horizon.**  The depression
   * angle to it is `acos(R / (R + h))`, and with `R = 160` that is 19.7 degrees
   * from ten metres up, 32.6 from thirty, and **45.7 from seventy** -- so from
   * any real flying height, a shot thrown level, or down a shallow slope, or at
   * anything on the skyline, never reaches the ground at all.  It leaves the
   * world.  Measured on the first run of the flight harness, which is how this
   * was found: from 58 m, at 34 degrees down, 140 m of march and the ray was
   * still 30 m in the air and flattening.
   *
   * So the airburst is not the exception the plan took it for -- fired forward,
   * it is the *normal* shot, and the exception is aiming steeply enough down to
   * hit something.  Which is a good rule once it is admitted: over the town you
   * throw fireworks, and you have to mean it to leave a mark.
   *
   * It bursts at 55 m rather than at the end of the march because 140 m is
   * eight seconds of flight and nobody is watching by then.
   */
  burst: 55,
};

/* ---------------------------------- LOD ---------------------------------- */

/**
 * One number, not the pets' two, and **it does not gate the thinking**.
 *
 * `pets.js` stops thinking about an animal past 44 m, which is free there:
 * thirty-four animals on ten-metre leashes are always within a few seconds of
 * where they were when they froze, and a frozen animal on the far side of the
 * planet is one nobody can see.
 *
 * That reasoning does not survive a 300 m circuit.  Measured, on the first
 * run: the dragon left the school, crossed the ridge, passed 110 m from a
 * player standing at the crossing end of the 通学路 -- and stopped, in mid-air,
 * at eleven metres, **for the remaining four minutes of the test**.  It could
 * not come home, because coming home is a decision and deciding is the thing
 * that had been switched off.  Anything that travels has to keep thinking or
 * it strands itself.
 *
 * So thinking is unconditional -- there is one of it, and it is a handful of
 * probes -- and this gates only what costs real money: the 46-bone mixer and
 * the draw.  150 m because the fog closes at 205 and this is a big airborne
 * animal; the pets' 62 would pop it out of the sky mid-circuit while you
 * watched it.
 */
const DRAW = 150;

/**
 * @param scene   the render scene -- *not* `world.root`, which is baked
 * @param world   the built world: colliders, `heightAt`, interactables
 * @param player  the walker
 * @param cinder  `createCinderfall(...)`, which owns the aim and the effect
 * @param model   the prepared prototype out of `dragonmodel.js`
 * @param hud     optional, for the line that says what the controls are
 */
export function createDragon({ scene, world, player, cinder, model, hud }) {
  if (!model) return null;

  const group = new THREE.Group();
  group.name = 'dragon';
  scene.add(group);

  const grid = world.colliderGrid;
  const rng = rngKit(7717);

  const _up = new THREE.Vector3();
  const _east = new THREE.Vector3();
  const _north = new THREE.Vector3();
  const _basis = new THREE.Matrix4();
  const _surfaceQ = new THREE.Quaternion();
  const _localQ = new THREE.Quaternion();
  const _localE = new THREE.Euler();
  const _lookQ = new THREE.Quaternion();
  const _jetPos = new THREE.Vector3();
  const _jetScale = new THREE.Vector3();
  const _jetQuat = new THREE.Quaternion();
  const _flat = { x: 0, z: 0, y: 0 };

  const headingTo = (dx, dz) => Math.atan2(-dx, -dz);

  function angleDelta(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /* ------------------------------ ground tests ------------------------------ */

  /** Is there room for a body of radius `r` at a flat point, feet at `feetY`? */
  function free(x, z, r, feetY) {
    return !grid.each(x, z, r + 0.1, (c) => {
      if (c.top !== undefined && c.top <= feetY + 0.3) return false;
      if (c.bottom !== undefined && c.bottom > feetY + 1.2) return false;
      return x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r;
    });
  }

  function walkable(x, z, feetY) {
    if (!free(x, z, model.bodyR, feetY)) return false;
    return Math.abs(world.heightAt(x, z, feetY) - feetY) <= model.rise;
  }

  /** Somewhere near an anchor with room for it to stand.  `pets.js`'s search. */
  function findSpot(x0, z0, r = model.bodyR) {
    const feet = world.heightAt(x0, z0);
    for (const d of [0, 2.5, 5.0, 8.0, 12.0]) {
      for (let i = 0; i < 8; i++) {
        const a = rng.range(0, Math.PI * 2) + (i * Math.PI) / 4;
        const x = wrapX(x0 + Math.cos(a) * d);
        const z = z0 + Math.sin(a) * d;
        const y = world.heightAt(x, z);
        if (Math.abs(y - feet) > 0.8) continue;
        if (free(x, z, r, y)) return { x, z };
      }
    }
    return { x: wrapX(x0), z: z0 };
  }

  /** The ground's rake along the animal, from a sample at each end. */
  function groundPitch() {
    const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
    const front = world.heightAt(wrapX(p.x + fx * model.axle), p.z + fz * model.axle, p.y);
    const rear = world.heightAt(wrapX(p.x - fx * model.axle), p.z - fz * model.axle, p.y);
    return clamp(Math.atan2(front - rear, model.axle * 2), -0.4, 0.4);
  }

  /* -------------------------------- animation -------------------------------- */

  const body = model.root;
  body.scale.setScalar(model.scale);
  group.add(body);

  const mixer = new THREE.AnimationMixer(body);
  const actions = {};
  for (const clip of model.clips) actions[clip.name] = mixer.clipAction(clip);

  let current = null;

  /** Cross-fade to a clip.  Re-asking for the running one only re-rates it. */
  function play(name, { loop = true, rate = 1, fade = 0.3 } = {}) {
    const next = actions[name];
    if (!next) return;
    if (current === next) { next.timeScale = rate; return; }
    if (current) current.fadeOut(fade);
    next.reset();
    next.timeScale = rate;
    next.enabled = true;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();
    current = next;
  }

  /* --------------------------------- the state --------------------------------- */

  const spot = findSpot(ROOST.x, ROOST.z);
  const p = {
    x: spot.x,
    z: spot.z,
    y: world.heightAt(spot.x, spot.z),
    alt: 0,
    altTarget: 0,
    altBob: 0,
    heading: rng.range(0, Math.PI * 2),
    pitch: 0,
    roll: 0,
    speed: 0,
    wantSpeed: 0,
    turnRate: 0,
    turnTarget: 0,
    turnIn: rng.range(0.5, 2.5),
    sway: 0,
    swayT: rng.range(0, 10),
    state: 'idle',
    stateIn: rng.range(3, 8),
    homeT: 0,             // seconds since it last landed at the roost
    tripIn: rng.range(TRIP_EVERY[0], TRIP_EVERY[1]),
    leg: 0,               // which waypoint of the circuit it is heading for
    going: true,          // out along the circuit, or back to the roost
    near: true,
    touch: { x: spot.x, z: spot.z },   // where a descent is aiming its feet
    landT: 0,
    // the perch
    perchFor: 0,
    wildPending: false,
    // the fire
    castIn: 0,          // seconds until it next considers breathing
    castT: 0,
    turnT: 0,
    jetFired: false,
    target: null,
    wild: false,
    /* The ride.  `mode` is the seam the whole flight model turns on: a ridden
     * animal is on the ground, taking a run at it, in the air, or being asked
     * to put itself down -- and nothing else. */
    ridden: false,
    mode: 'ground',     // 'ground' | 'runup' | 'air' | 'setdown'
    runupD: 0,
    beatT: 0,
    noseWant: 0,
    jawT: -1,           // seconds into the jaw envelope; < 0 is shut
    fireIn: 0,
    riderTarget: null,
  };
  p.castIn = rng.range(CAST_EVERY_NEAR[0], CAST_EVERY_ALONE[1]);

  /* The hitbox `E` picks, a child so it travels with the animal for free.
   * Invisible rather than absent: `Raycaster` ignores `visible`. */
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(model.hit.x, model.hit.y, model.hit.z),
    flat({ color: 0xff0000, cache: false })
  );
  hit.position.y = model.hit.y / 2;
  hit.visible = false;
  group.add(hit);

  /* --------------------------------- the verbs --------------------------------- */

  function faceThePlayer() {
    p.heading = headingTo(wrapDelta(player.pos.x, p.x), player.pos.z - p.z);
  }

  function wake() {
    if (p.state !== 'sleep') return;
    p.state = 'idle';
    p.stateIn = rng.range(3, 7);
    play('idle', { fade: 0.4 });
  }

  function greet() {
    wake();
    if (!grounded()) return;
    faceThePlayer();
    p.speed = 0;
    p.turnRate = 0;
    p.state = 'roar';
    p.stateIn = 2.5;
    play('roar', { loop: false, fade: 0.15 });
  }

  const grounded = () => p.alt < 0.4
    && p.state !== 'takeoff' && p.state !== 'fly' && p.state !== 'runup';

  /**
   * Commit to a cast at a flat point.
   *
   * If the target is more than `TURN_FIRST` off the nose it turns to face it
   * first, in its own little state, rather than breathing sideways and
   * swinging round mid-jet.  The turn is capped at a second and a half, so a
   * target directly behind costs a beat and looks like a decision.
   */
  function fire(target) {
    p.target = { x: target.x, z: target.z };
    const want = headingTo(wrapDelta(target.x, p.x), target.z - p.z);
    const off = Math.abs(angleDelta(p.heading, want));
    if (off > TURN_FIRST) {
      p.state = 'turn';
      p.turnT = clamp(off / 2.2, 0.3, 1.5);
      play('idle', { fade: 0.2 });
    } else {
      begin();
    }
  }

  /** Open the jaw.  Split out so `turn` can hand off into it. */
  function begin() {
    p.state = 'cast';
    p.castT = 0;
    p.jetFired = false;
    play('breathe_fire', { loop: false, fade: 0.12 });
  }

  /**
   * Somewhere worth breathing at.
   *
   * Two strategies, and the first one is the whole reason the fire moved off
   * the menu.  **With an audience** it picks a bearing off the line to the
   * player, rotated a half-turn to a radian and a bit either way -- so the
   * cinder lands clearly inside the frame somebody standing there is looking
   * at, and just as clearly nowhere near their feet.  Aiming *at* the player
   * would be a threat and aiming at random would land it behind them half the
   * time; this is the version that reads as a display.
   *
   * **Without one** it throws roughly where it is already facing, which needs
   * no turn and costs nothing.
   *
   * Either way `cinder.canLand` has the veto: never inside `minRange` of the
   * player, never within 1.6 m of a collider, never on itself.  Ten tries and
   * then it does not bother, which is the right answer on a crowded summit.
   */
  function pickTarget(dPlayer) {
    const watched = dPlayer < AUDIENCE;
    const toPlayer = headingTo(wrapDelta(player.pos.x, p.x), player.pos.z - p.z);
    for (let i = 0; i < 10; i++) {
      const bearing = watched
        ? toPlayer + rng.sign() * rng.range(0.55, 1.35)
        : p.heading + rng.range(-1.1, 1.1);
      const d = rng.range(THROW[0], THROW[1]);
      const x = wrapX(p.x - Math.sin(bearing) * d);
      const z = p.z - Math.cos(bearing) * d;
      if (cinder.canLand(x, z, { x: p.x, z: p.z, r: model.bodyR + 4 })) return { x, z };
    }
    return null;
  }

  /** Try to breathe.  False if there is nowhere legal to put it. */
  function tryCast(dPlayer) {
    const t = pickTarget(dPlayer);
    if (!t) return false;
    p.speed = 0;
    p.turnRate = 0;
    fire(t);
    return true;
  }

  /* ---------------------------------- the ride ---------------------------------- */

  /**
   * What the walker is handed when it becomes a passenger.
   *
   * Four numbers, and keeping them current is this file's side of the contract
   * in `player.js`'s `FLY` block: where the saddle is, how hard the animal is
   * banked, how far through a wing-beat it is, and how fast it is going as a
   * fraction of cruise.  The walker never looks at anything else in here.
   */
  const saddle = {
    eye: model.saddle,
    roll: 0,
    bob: 0,
    speedFrac: 0,
    tilt: 0,
  };

  const _aim = { x: 0, z: 0, y: 0, ground: false };
  const _hit = { x: 0, z: 0, y: 0 };
  const _ray = new THREE.Vector3();
  const _probe = new THREE.Vector3();

  const rideAir = () => p.ridden && (p.mode === 'air' || p.mode === 'setdown');

  /** Anything that would make climbing on now an animation bug. */
  function canRide() {
    return !p.ridden && grounded()
      && p.state !== 'cast' && p.state !== 'turn' && p.state !== 'roar';
  }

  /**
   * Write the rider's real position back onto the walker, every frame.
   *
   * This is the load-bearing line of the whole feature and it is one function.
   * `player.pos` is not merely where the walker is: it is the shadow cascade's
   * centre, the frame the lights are seated in, the pets' LOD and behaviour
   * distance, this animal's own `dPlayer`, and the minimum range `canLand`
   * refuses to drop a cinder inside.  Leave the walker standing on the school
   * ground while the camera flies away and the town goes unlit around a body
   * nobody can see -- and the dragon LODs itself out at 150 m from its own
   * rider.
   *
   * `vel` goes too, because `pets.js` reads it as "how fast is this thing
   * coming at me": an animal landing on a playground should scatter what is
   * standing on it.
   */
  function syncRider() {
    player.pos.x = p.x;
    player.pos.z = p.z;
    player.pos.y = p.y + p.alt;
    player.vel.set(-Math.sin(p.heading) * p.speed, 0, -Math.cos(p.heading) * p.speed);
    /* **Negated**, and it is a derivation rather than a taste.
     *
     * The animal's roll is applied about its own local z in `seat` -- and the
     * model is authored facing +z while the camera looks down -z, so the model
     * frame is the camera frame turned half a turn about y.  Their z axes point
     * in opposite directions, so the same number banks the animal one way and
     * the frame the other: hand `p.roll` straight over and the horizon tips
     * *out* of every turn while the dragon leans into it.
     *
     * (Checked by hand, because it is the one part of this that a headless
     * harness cannot see: a left turn is `turnRate > 0`, which gives the animal
     * a negative roll, which drops its left wing -- and the camera wants a
     * *positive* roll to tip the horizon the same way.) */
    saddle.roll = -p.roll;
    saddle.bob = p.altBob;
    saddle.speedFrac = p.speed / SADDLE.cruise;
    /* How far below the rider's own look the frame should sit, which on a
     * planet this small is most of what makes the view worth having -- see
     * `FLY.tiltMargin` in `player.js`.  `acos(R / (R + alt))` is the angle down
     * to the horizon; leaving a quarter radian of it above the camera's axis
     * keeps the edge of the world in the same place in the frame at every
     * height, from a standing start to the ceiling. */
    saddle.tilt = Math.max(0, Math.acos(R / (R + Math.max(0, p.alt))) - 0.25);
  }

  function mountRider() {
    if (!canRide()) return;
    // it does not stay asleep with somebody climbing onto it
    wake();
    p.ridden = true;
    p.state = 'ridden';
    p.mode = 'ground';
    p.speed = 0;
    p.wantSpeed = 0;
    p.turnRate = 0;
    p.turnTarget = 0;
    p.sway = 0;
    p.runupD = 0;
    p.beatT = 0;
    p.noseWant = 0;
    p.jawT = -1;
    p.fireIn = 0;
    p.riderTarget = null;
    p.target = null;
    /* A snap, for the e-bike's reason: while riding, the view *is* the
     * direction of travel, so anything else starts the rider looking off the
     * animal's flank at a creature walking somewhere else. */
    player.yaw = p.heading;
    player.pitch = 0;
    player.mount(saddle, { thirdPerson: true });
    syncRider();
    player.applyCamera(0);
    play('idle', { fade: 0.3 });
    hud?.flash('りゅう  ·  W walk  ·  Space fly  ·  F breathe  ·  E get off', 4200);
  }

  /**
   * Step off, sideways, and check there is somewhere to step to.
   *
   * The e-bike's dismount with a bigger animal in the middle of it: left, then
   * right, then back off the tail, each tried for room and for a step the
   * walker could have taken on foot.  3.2 m clears the body -- `bodyR` is
   * 1.82 -- so the rider is not left standing inside the thing they were on.
   */
  function stepOff() {
    const feet = p.y;
    const rx = Math.cos(p.heading), rz = -Math.sin(p.heading);
    const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
    const d = model.bodyR + 1.4;
    for (const [dx, dz] of [[-rx * d, -rz * d], [rx * d, rz * d], [-fx * d * 1.3, -fz * d * 1.3]]) {
      const x = wrapX(p.x + dx);
      const z = p.z + dz;
      if (!free(x, z, 0.4, feet)) continue;
      if (Math.abs(world.heightAt(x, z, feet) - feet) > 0.6) continue;
      player.pos.x = x;
      player.pos.z = z;
      player.pos.y = world.heightAt(x, z, feet);
      return;
    }
    // nowhere clear: leave them standing where the animal is rather than
    // pushing them into whatever the three probes just refused
    player.pos.y = world.heightAt(p.x, p.z, feet);
  }

  /**
   * Get off, and hand the animal back its own life.
   *
   * `falling` is the mid-air version: the rider is released at the saddle and
   * the walker's own gravity integrator takes it from there -- a fall is the
   * second half of a jump, `player.js` already integrates one, and this world
   * has no damage in it and is not about to grow any.
   */
  function dismount({ falling = false } = {}) {
    if (!p.ridden) return;
    const air = p.mode !== 'ground';
    p.ridden = false;
    p.mode = 'ground';
    p.jawT = -1;
    p.riderTarget = null;
    p.beatT = 0;

    if (falling && air) {
      player.unmount({ falling: true });
      player.pos.y = p.y + p.alt + model.saddle;
    } else {
      player.unmount();
      stepOff();
    }

    /* Whatever state it is handed, it is one the file already knows how to be
     * in.  Airborne it is `fly` with `going` false, which *is* "head home and
     * land at the roost"; on the ground away from home it is given a short trip
     * clock, so it takes off and comes back round the circuit in its own time
     * rather than teleporting or standing there forever. */
    if (p.alt > 0.5) {
      p.state = 'fly';
      p.going = false;
      p.altTarget = CRUISE;
      play('fly_forward', { fade: 0.5 });
    } else {
      p.alt = 0;
      /* And the *target* with it.  Nothing writes `altTarget` while the ride
       * owns the altitude, so it is whatever the animal last wanted -- which is
       * zero in every path that can reach a mount today, and a grounded animal
       * silently levitating back to a stale target if that ever stops being
       * true.  Caught with the harness's `teleport(x, z, alt)`, which is
       * exactly that "ever". */
      p.altTarget = 0;
      p.state = 'idle';
      p.stateIn = rng.range(2, 5);
      p.homeT = 0;
      const home = Math.hypot(wrapDelta(p.x, ROOST.x), p.z - ROOST.z);
      if (home > ROOST.r) p.tripIn = rng.range(4, 9);
      play('idle', { fade: 0.4 });
    }
    hud?.flash('りゅう  ·  ありがとう', 1600);
  }

  /**
   * `E`, while riding.
   *
   * In the air it does not throw you off -- it asks the animal to put you down,
   * and the animal is better at that than you are: `findSpot` is the same ring
   * search that stops it choosing the inside of the gymnasium.  A second press
   * during the descent is the escape hatch, and the only way out if the rider
   * has flown somewhere the landing search cannot resolve.
   */
  function riderE() {
    if (!p.ridden) return;
    if (p.mode === 'ground') { dismount(); return; }
    if (p.mode === 'setdown') { dismount({ falling: true }); return; }
    p.mode = 'setdown';
    p.touch = findSpot(p.x, p.z, model.bodyR);
    p.landT = 0;
    hud?.flash('りゅう  ·  setting down  ·  E again to jump', 2400);
  }

  /* --------------------------------- the jaw --------------------------------- */

  /**
   * Open the jaw on top of whatever the mixer just wrote.
   *
   * Applied between `mixer.update()` and the matrix flush in `seat`, which is
   * what layering anything on an animation means here -- the same slot, and the
   * same reason, as `lookAt` directly above.  The hinge and the angle are both
   * measured off the model in `dragonmodel.js`; nothing here is a guess about
   * somebody else's rig.
   */
  function applyJaw() {
    const jaw = model.bones.jaw;
    if (!jaw || !model.bones.jawHinge || p.jawT < 0) return;
    const t = p.jawT;
    let e;
    if (t < JAW.open) e = t / JAW.open;
    else if (t < JAW.open + JAW.hold) e = 1;
    else e = clamp(1 - (t - JAW.open - JAW.hold) / JAW.close, 0, 1);
    // eased at both ends, or a jaw starts and stops dead on a hinge
    e = e * e * (3 - 2 * e);
    _lookQ.setFromAxisAngle(model.bones.jawHinge, JAW_OPEN * e);
    jaw.quaternion.multiply(_lookQ);
  }

  /* --------------------------------- the aim --------------------------------- */

  /**
   * What ground the crosshair is on.  See `AIM`.
   *
   * Marched in *world* space and converted back with `flatAt` at every sample,
   * which is not a detail on a planet this small: 140 m is fifty degrees of arc
   * at `R = 160`, so a straight line in the frame is a curve in the flat
   * coordinates everything else here is written in.  March it flat and a shot
   * at the horizon lands in the wrong postcode.
   *
   * `ground` false means the ray never came down -- you are looking at sky --
   * and the caller turns that into an airburst at the end of the march.
   */
  function aimPoint(out) {
    const cam = player.camera;
    _ray.set(0, 0, -1).applyQuaternion(cam.quaternion);
    let prev = 0;
    for (let d = 2.0; d <= AIM.reach; d += AIM.step) {
      _probe.copy(cam.position).addScaledVector(_ray, d);
      flatAt(_probe, _hit);
      if (_hit.y <= world.heightAt(wrapX(_hit.x), _hit.z)) {
        let lo = prev;
        let hi = d;
        for (let i = 0; i < AIM.refine; i++) {
          const mid = (lo + hi) * 0.5;
          _probe.copy(cam.position).addScaledVector(_ray, mid);
          flatAt(_probe, _hit);
          if (_hit.y <= world.heightAt(wrapX(_hit.x), _hit.z)) hi = mid; else lo = mid;
        }
        _probe.copy(cam.position).addScaledVector(_ray, hi);
        flatAt(_probe, _hit);
        out.x = wrapX(_hit.x);
        out.z = _hit.z;
        out.y = world.heightAt(out.x, out.z);
        out.ground = true;
        return out;
      }
      prev = d;
    }
    _probe.copy(cam.position).addScaledVector(_ray, AIM.burst);
    flatAt(_probe, _hit);
    out.x = wrapX(_hit.x);
    out.z = _hit.z;
    out.y = _hit.y;
    out.ground = false;
    return out;
  }

  /**
   * `F`.
   *
   * **It always fires.**  The animal picking its own target can afford to be
   * refused -- it just picks again -- but a rider has already aimed, and a
   * silent refusal is a broken button.  So the veto does not decide *whether*,
   * it decides *what arrives*: legal ground gets the cast exactly as the animal
   * throws it, and anything else -- a rooftop, a tree, a shopfront, the sky --
   * gets the same cinder bursting in the air a metre short of it, with no
   * scorch, no crater and no debris.  Nobody's shop gets a burn mark and `F`
   * over the town is a firework rather than a dead key.
   *
   * The minimum range goes three-dimensional while airborne, which is one
   * argument to `canLand`: straight down from forty metres is a perfectly good
   * shot, and measuring that drop as a horizontal zero is the sort of refusal
   * that looks exactly like a bug.
   */
  function riderBreathe() {
    if (!p.ridden || p.fireIn > 0) return false;
    const t = aimPoint(_aim);
    const drop = Math.max(0, (p.y + p.alt) - t.y);
    const legal = t.ground
      && cinder.canLand(t.x, t.z, { x: p.x, z: p.z, r: model.bodyR + 2 }, drop);
    p.fireIn = SADDLE.every;
    p.riderTarget = {
      x: t.x, z: t.z, y: t.y, airburst: !legal,
      // it has to beat the animal that threw it -- see `cast`
      speed: Math.max(16, p.speed + 12),
    };
    p.jawT = 0;
    p.jetFired = false;
    return true;
  }

  /* ------------------------------ the flight model ------------------------------ */

  /**
   * One ridden frame's worth of decisions.
   *
   * It sets the same three things every other state in this file sets --
   * `wantSpeed`, `turnTarget` and where the animal is in the air -- and then
   * falls through into exactly the same shared tail, which is why a ridden
   * dragon collides, steps, rakes to the ground and picks its clip rate through
   * the code that was already there.
   */
  function rideThink(dt) {
    const inp = player.axes();
    const climb = player.climbing;
    p.fireIn = Math.max(0, p.fireIn - dt);
    if (p.jawT >= 0) {
      p.jawT += dt;
      if (p.jawT > JAW.open + JAW.hold + JAW.close) p.jawT = -1;
    }

    /* Follow the camera, a beat late.  The cap is the whole feel of the thing:
     * 1.1 rad/s is a wide, deliberate turn for something with a seven-metre
     * span, A or D held into it buys 1.6, and at boost it tightens by up to
     * forty per cent less, because speed costs agility everywhere else in the
     * world and should here. */
    const fast = clamp((p.speed - SADDLE.cruise) / (SADDLE.boost - SADDLE.cruise), 0, 1);
    const cap = (inp.side ? SADDLE.assist : SADDLE.turn) * (rideAir() ? 1 - fast * 0.4 : 1);
    /* The gain sets the *steady* lag, and the cap sets how fast it can ever
     * turn.  They are different jobs and the first pass conflated them: at a
     * gain of 2.4, holding D -- which swings the view at 1.2 rad/s -- settled
     * the animal 1.2/2.4 = 0.5 rad behind the camera and left it there, which
     * `.shots/ride-4-bank.jpg` showed as a dragon flying along the right-hand
     * edge of the frame for the whole turn.  At 4.5 the sustained lag is 15
     * degrees, and a *whipped* view still leaves the animal behind for a second
     * because the cap, not the gain, is what stops it following. */
    p.turnTarget = clamp(angleDelta(p.heading, player.yaw) * 4.5, -cap, cap);

    if (climb) p.beatT = SADDLE.beatFor;
    p.beatT = Math.max(0, p.beatT - dt);

    switch (p.mode) {
      case 'ground': {
        p.wantSpeed = inp.fwd > 0 ? (inp.sprint ? RUN : WALK) : 0;
        p.noseWant = 0;
        if (climb) {
          /* It takes a run at it.  Driven rather than scripted: the run-up ends
           * when the ground runs out or twelve body-lengths have gone by, so
           * asking for the sky from a corner of the school ground visibly costs
           * the animal a run across it first. */
          p.mode = 'runup';
          p.runupD = 0;
        }
        break;
      }

      case 'runup': {
        p.wantSpeed = RUN;
        p.noseWant = 0;
        p.runupD += p.speed * dt;
        if (p.runupD >= RUNUP || blockedAhead()) {
          p.mode = 'air';
          // whatever the rider is doing with the key at this instant, the
          // animal gets the beat that puts it in the air
          p.beatT = SADDLE.beatFor;
        }
        break;
      }

      case 'air': {
        const throttle = inp.fwd > 0 ? (inp.sprint ? SADDLE.boost : SADDLE.cruise) : 0;
        p.wantSpeed = inp.fwd < 0 ? 0 : throttle;
        p.noseWant = clamp(player.pitch, -SADDLE.nose, SADDLE.nose);

        const lift = SADDLE.beat * (p.beatT / SADDLE.beatFor);
        let vy = p.speed * Math.sin(p.noseWant) + lift;
        if (!throttle && lift <= 0.01) vy -= SADDLE.sink;
        p.alt = clamp(p.alt + vy * dt, 0, SADDLE.ceiling);

        if (p.alt <= 0.35 && vy <= 0) {
          if (walkable(p.x, p.z, p.y)) {
            p.alt = 0;
            p.mode = 'ground';
            // it arrives running rather than stopping dead; the brake does the rest
            p.speed = Math.min(p.speed, RUN);
          } else {
            // it will not put its feet inside a building: hold, and let the
            // rider move it somewhere it can stand
            p.alt = Math.max(p.alt, SADDLE.hold);
          }
        }
        break;
      }

      case 'setdown': {
        /* The animal flying itself down, with the rider watching.  The approach
         * is the one the file already learned the hard way -- slow *into* the
         * spot so the turn tightens as the gap closes, and let the tolerance
         * grow with time so a bad geometry is an untidy landing rather than an
         * orbit that never ends.  See `case 'landing'`. */
        p.landT += dt;
        const gap = Math.hypot(wrapDelta(p.touch.x, p.x), p.touch.z - p.z);
        const reach = TOUCH_REACH + p.landT * 1.5;
        steerToward(p.touch.x, p.touch.z, 2.0);
        p.wantSpeed = clamp(gap * 0.7, 0, SADDLE.cruise * 0.35);
        p.noseWant = 0;
        const want = gap <= reach ? 0 : Math.min(p.alt, 2.0);
        p.alt += clamp(want - p.alt, -CLIMB * 1.4 * dt, CLIMB * dt);
        if (p.alt < 0.35) {
          p.alt = 0;
          p.mode = 'ground';
          dismount();
        }
        break;
      }
    }
  }

  /** Which clip a ridden animal is playing, and how fast. */
  function rideClip() {
    if (p.mode === 'ground') {
      if (p.speed > 0.25) {
        const running = p.speed > (WALK + RUN) * 0.5;
        play(running ? 'run' : 'walk',
          { rate: clamp(p.speed / (running ? RUN : WALK), 0.5, 1.5), fade: 0.3 });
      } else {
        play('idle', { fade: 0.35 });
      }
      return;
    }
    if (p.mode === 'runup') {
      play('run', { rate: clamp(p.speed / RUN, 0.6, 1.5), fade: 0.25 });
      return;
    }
    if (p.alt < SADDLE.flap || p.speed < 3) {
      play('hover', { rate: 1, fade: 0.35 });
      return;
    }
    /* There is no glide clip in the file, so a dive with the throttle off drops
     * the beat to 0.45 and lets the wings sweep slowly instead.  It reads as a
     * glide, it costs nothing, and the alternative -- holding a pose out of
     * `fly_forward` -- is only worth building if this does not convince. */
    const driven = p.wantSpeed > 0.01;
    play('fly_forward', {
      rate: driven ? clamp(0.75 + p.speed / 40, 0.75, 1.35) : (p.pitch < -0.08 ? 0.45 : 0.8),
      fade: 0.4,
    });
  }

  const label = () => {
    if (p.ridden) return 'りゅう  ·  get off';
    if (p.state === 'sleep') return 'りゅう  ·  asleep';
    if (canRide()) return 'りゅう  ·  climb on';

    return 'りゅう  ·  say hello';
  };

  /* One thing to say to it, or two once there is somewhere to sit.
   *
   * `main.js` opens the choice card for anything offering more than one option
   * and calls `action` directly for anything offering one, which is the path
   * the cat on the garden wall has always taken -- so the whole mount UI is an
   * extra entry in this array and no new widget anywhere. */
  world.interactables.push({
    hitbox: hit,
    get label() { return label(); },
    get options() {
      const hello = { key: 'hello', label: 'say hello', action: greet };
      return canRide()
        ? [hello, { key: 'ride', label: 'climb on', action: mountRider }]
        : [hello];
    },
    action: greet,
    dragon: p,
  });

  /* Start it breathing, in both senses.
   *
   * `pets.js` ends its builder with exactly this line and it is not decoration.
   * Without a clip playing, the mixer writes nothing, and what stands on the
   * school ground is the **bind pose** -- wings out, legs straight, for however
   * many seconds pass before the state machine happens to change state and call
   * `play()` for the first time.
   *
   * It is worse than a cosmetic wait here, because `jetOpen()` reads the
   * `firejet` bone's scale to decide when the jaw has opened, and in the bind
   * pose that scale is **1.0** -- the value it only ever otherwise reaches at
   * the peak of `breathe_fire`.  So an un-animated dragon reports a fully open
   * jet.  Caught in a real browser, on the first frame that was ever rendered:
   * `debug.jet` came back 0.792 from an animal doing nothing at all.  Every
   * headless test had missed it, because every headless test forces a state
   * first and forcing a state plays a clip. */
  play('idle', { fade: 0 });
  seat();

  /* -------------------------------- seating -------------------------------- */

  /**
   * Put it on the sphere.
   *
   * The model is authored facing +z and the walker's forward is -z, so a
   * heading of 0 is half a turn from the model's own front: `ry = heading +
   * PI`.  The rake is about the local **x**, and about +x a positive angle
   * sends the nose *down* -- hence the sign.  Euler 'YXZ' is Ry·Rx·Rz, so the
   * rake lands in the animal's own frame after the heading, and the bank the
   * wings carry goes in the third slot for the same reason.
   */
  function seat() {
    basisAt(p.x, p.z, _up, _east, _north);
    _basis.makeBasis(_east, _up, _north);
    _surfaceQ.setFromRotationMatrix(_basis);
    _localE.set(-p.pitch, p.heading + p.sway + Math.PI, p.roll, 'YXZ');
    _localQ.setFromEuler(_localE);
    group.quaternion.copy(_surfaceQ).multiply(_localQ);
    positionAt(p.x, p.y + p.alt + p.altBob, p.z, group.position);
    group.updateMatrixWorld(true);
  }

  /* --------------------------------- steering --------------------------------- */

  function steerToward(tx, tz, gain = 2.0) {
    const want = headingTo(wrapDelta(tx, p.x), tz - p.z);
    p.turnTarget = clamp(angleDelta(p.heading, want) * gain, -2.4, 2.4);
  }

  /** Where it is going right now, or null if it is not going anywhere. */
  function waypoint() {
    if (p.state !== 'fly' && p.state !== 'takeoff') return null;
    if (!p.going) return ROOST;
    return CIRCUIT[p.leg] ?? ROOST;
  }

  /* -------------------------------- the head -------------------------------- */

  /**
   * Turn the head toward the aim point, on top of whatever the clip is doing.
   *
   * Applied **after** `mixer.update()` and before `updateMatrixWorld`, which
   * is what layering a look-at on an animation means: the mixer writes the
   * authored pose into the bone, and this rotates it from there.  The two axes
   * are measured off the bind pose in `dragonmodel.js` rather than assumed --
   * this is a Blender rig, its bones run along their own local +y, and
   * guessing is how a look-at rolls a dragon's head onto its side.
   */
  function lookAt(tx, tz, weight) {
    const head = model.bones.head;
    if (!head || !model.bones.headUp || weight <= 0.001) return;
    const want = headingTo(wrapDelta(tx, p.x), tz - p.z);
    const yaw = clamp(angleDelta(p.heading, want), -0.55, 0.55) * weight;
    const d = Math.hypot(wrapDelta(tx, p.x), tz - p.z);
    const dy = world.heightAt(tx, tz) - (p.y + p.alt + model.height * 0.75);
    const pitchWant = clamp(Math.atan2(dy, Math.max(d, 0.5)), -0.45, 0.45) * weight;
    _lookQ.setFromAxisAngle(model.bones.headUp, yaw);
    head.quaternion.multiply(_lookQ);
    _lookQ.setFromAxisAngle(model.bones.headRight, pitchWant);
    head.quaternion.multiply(_lookQ);
  }

  /* --------------------------------- the fire --------------------------------- */

  /**
   * Open the jet when the animator opens it.
   *
   * `firejet` is a bone whose scale every clip drives: 0.001 flat in seven of
   * them and 0.001 -> 1.25 over 72 keys in `breathe_fire`.  So the model
   * carries its own normalised "how open is the jet" envelope, authored by
   * hand, and this reads it rather than running a second clock beside it.
   */
  function jetOpen() {
    const jet = model.bones.firejet;
    if (!jet) return 0;
    jet.matrixWorld.decompose(_jetPos, _jetQuat, _jetScale);
    // the world matrix carries the model's own scale; the bone's own is what
    // the animator keyed, so divide it back out
    return clamp((_jetScale.x / model.scale - 0.05) / 1.2, 0, 1);
  }

  /** The firejet's position, in flat authoring coordinates. */
  function jetPoint(out) {
    const jet = model.bones.firejet;
    if (!jet) {
      out.x = p.x; out.z = p.z; out.y = p.y + p.alt + model.height * 0.8;
      return out;
    }
    _jetPos.setFromMatrixPosition(jet.matrixWorld);
    flatAt(_jetPos, out);
    out.x = wrapX(out.x);
    return out;
  }

  /* -------------------------------- per frame -------------------------------- */

  /**
   * A ridden frame, or an unridden one, and then the part that is the same.
   *
   * `decide` is everything the animal chooses for itself and `rideThink` is
   * everything the rider chooses for it; both leave the same three variables
   * behind -- `wantSpeed`, `turnTarget` and where the animal is in the air --
   * and the tail below moves, collides, rakes and animates whatever it finds
   * in them.  Which is the reason a ridden dragon needs no second movement
   * system: it is the same one, driven from the other end.
   */
  function think(dt, dPlayer) {
    if (p.state === 'ridden') rideThink(dt);
    else if (!decide(dt, dPlayer)) return;

    /* --------------------------- shared from here down --------------------------- */
    const ridden = p.state === 'ridden';

    p.turnRate += (p.turnTarget - p.turnRate) * (1 - Math.exp(-2.2 * dt));
    const airborne = p.state === 'fly' || p.state === 'takeoff'
      || p.state === 'landing' || rideAir();
    // a ridden animal turns under the camera even standing still
    if (p.wantSpeed > 0.01 || airborne || ridden) p.heading += p.turnRate * dt;
    /* Looking around: a slow sway of the whole body off the heading it will
     * leave on, applied at draw time rather than to the heading, so the
     * direction it walks off in is the one it chose. */
    p.swayT += dt;
    // not while somebody is on it: an animal swinging its shoulders 0.4 rad
    // under a stationary camera reads as the camera drifting
    const swaying = p.wantSpeed < 0.01 && !airborne && !ridden;
    const swayTarget = swaying
      ? Math.sin(p.swayT * 0.7) * 0.4 + Math.sin(p.swayT * 0.31) * 0.16
      : 0;
    p.sway += (swayTarget - p.sway) * (1 - Math.exp(-2.4 * dt));

    /* An exponential ease is right for an animal deciding to walk somewhere
     * and wrong for a throttle: it never quite arrives, and the difference
     * between cruise and boost is exactly the thing a rider is asking for.  So
     * the ride integrates a real acceleration, and brakes harder than it
     * accelerates for the same reason the e-bike does -- S has to be able to
     * stop you before the thing you are looking at. */
    if (ridden) {
      const rate = (p.wantSpeed > p.speed ? SADDLE.accel : SADDLE.brake) * dt;
      p.speed += clamp(p.wantSpeed - p.speed, -rate, rate);
    } else {
      p.speed += (p.wantSpeed - p.speed) * (1 - Math.exp(-2.6 * dt));
    }

    /* What is in front of it.  On the ground this is the pets' three-probe
     * steer; in the air it is the same probe at its own altitude, which is the
     * whole difference between flying and walking here -- `free` already takes
     * the height it is asked from, so at eleven metres it simply passes over
     * the things whose tops are beneath it. */
    if (p.speed > 0.05) {
      const lead = model.bodyR + 1.4;
      const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
      const probeY = p.y + p.alt;
      const ahead = airborne
        ? !free(wrapX(p.x + fx * lead), p.z + fz * lead, model.bodyR, probeY)
        : !walkable(wrapX(p.x + fx * lead), p.z + fz * lead, p.y);
      /* The turn-away is the animal's, not the rider's.  Above 31 m it can
       * never fire -- measured: every collider in the world carries a top and
       * the highest is 30.5 -- and below it, an autopilot that swings you off
       * the roof you were aiming at is worse than the bump.  A ridden animal
       * still *blocks* on the per-axis test below; it just does not steer
       * itself out of trouble somebody else chose. */
      if (ahead && !ridden) {
        const test = (h) => {
          const hx = wrapX(p.x - Math.sin(h) * lead), hz = p.z - Math.cos(h) * lead;
          return airborne ? free(hx, hz, model.bodyR, probeY) : walkable(hx, hz, p.y);
        };
        const turn = test(p.heading + 0.9) ? 1 : test(p.heading - 0.9) ? -1 : rng.sign() * 2;
        p.turnTarget = turn * 1.8;
        p.turnRate = p.turnTarget;
        p.speed *= 0.6;
      }

      const step = p.speed * dt;
      const nx = wrapX(p.x + fx * step);
      const nz = p.z + fz * step;
      // one axis at a time, so a corner slides instead of stopping dead
      if (airborne) {
        if (free(nx, p.z, model.bodyR, probeY)) p.x = nx;
        if (free(p.x, nz, model.bodyR, probeY)) p.z = nz;
      } else {
        if (walkable(nx, p.z, p.y)) p.x = nx;
        if (walkable(p.x, nz, p.y)) p.z = nz;
      }
    }

    /* Latitude, which only a ridden animal can ever reach the end of.
     *
     * The world wraps in x forever and is bounded in z -- `bounds` is a quarter
     * of the circumference either side of the equator, 241 m, which is the same
     * fence `player.js` holds the walker behind.  Nothing autonomous here goes
     * more than 140 m from the school, so this never mattered until somebody
     * could point the animal north and hold W: measured, on the first run of
     * the flight harness, ninety seconds of boost put it at **z = 1073**, which
     * is four times past the pole -- and past the pole `positionAt` folds back
     * on itself and the tangent frame the whole camera is built on inverts.
     * It slides along the fence, exactly as a walker does. */
    if (ridden) p.z = clamp(p.z, world.bounds.z0, world.bounds.z1);

    // the ground, eased exactly the way the player eases onto it
    const groundY = world.heightAt(p.x, p.z, p.y);
    p.y += (groundY - p.y) * (1 - Math.exp(-14 * dt));

    /* Height, bob and bank.
     *
     * The altitude is measured over the *terrain*, so the circuit follows the
     * hill up rather than flying into A1's 16.5 m of summit.  The bob is a
     * displacement added at draw time and never integrated, or it climbs half
     * a metre every time the sine spends longer positive than negative --
     * `pets.js` learned that one first. */
    const climbing = p.altTarget - p.alt;
    // a rate rather than an exponential ease: a climb-out that never quite
    // arrives leaves the take-off state hanging on an asymptote.  A ridden
    // animal has already set its own altitude in `rideThink`, out of the nose
    // and the wings, so there is no target to chase.
    if (!ridden) {
      p.alt += clamp(climbing, -CLIMB * 1.4 * dt, CLIMB * dt);
      if (Math.abs(p.altTarget - p.alt) < 0.02) p.alt = p.altTarget;
    }
    p.altBob = airborne ? Math.sin(p.swayT * 1.6) * 0.22 : 0;

    if (rideAir()) {
      // carried, the nose is the rider's look and the bank is the turn it is
      // actually making -- 0.8 of the look, so the animal is never quite as
      // steep as the camera and the two read as animal and rider
      p.pitch += (p.noseWant * 0.8 - p.pitch) * (1 - Math.exp(-4 * dt));
      p.roll += (clamp(-p.turnRate * 0.55, -SADDLE.bank, SADDLE.bank) - p.roll)
        * (1 - Math.exp(-3.5 * dt));
    } else if (airborne) {
      // nose up on the climb, down on the run in -- the read is the wing, but
      // the attitude is what makes it flight rather than sliding sideways
      p.pitch += (clamp(climbing * 0.22, -0.3, 0.35) - p.pitch) * (1 - Math.exp(-3 * dt));
      p.roll += (clamp(-p.turnRate * 0.55, -0.6, 0.6) - p.roll) * (1 - Math.exp(-3 * dt));
    } else {
      p.pitch += (groundPitch() - p.pitch) * (1 - Math.exp(-8 * dt));
      p.roll += (0 - p.roll) * (1 - Math.exp(-4 * dt));
    }

    /* The clip's rate follows the speed actually achieved: an animal shoved
     * down to a crawl by an obstacle probe should not keep marching on the
     * spot. */
    if (ridden) rideClip();
    else if (p.state === 'wander') play('walk', { rate: clamp(p.speed / WALK, 0.5, 1.6) });
    else if (p.state === 'runup') play('run', { rate: clamp(p.speed / RUN, 0.6, 1.5) });
  }

  /** What the animal decides on its own.  False means the frame is over. */
  function decide(dt, dPlayer) {
    /* ------------------------------ the fire ------------------------------ */

    if (p.state === 'turn') {
      /* Facing it before breathing at it.  No clip of its own -- it is a
       * stationary `idle` with the steering still running, which is what a
       * heavy animal turning on the spot actually looks like. */
      p.turnT -= dt;
      p.wantSpeed = 0;
      if (p.target) steerToward(p.target.x, p.target.z, 2.6);
      if (p.turnT <= 0) begin();
      return false;
    }

    if (p.state === 'cast') {
      p.castT += dt;
      p.wantSpeed = 0;
      p.turnTarget = 0;
      /* The jet itself is opened in `update`, after `mixer.update` and after
       * the matrices are flushed -- reading a bone's world matrix from here
       * is reading last frame's pose, and the cast's origin is a point on a
       * head that is moving through the clip. */
      if (p.castT > 3.0) {
        p.state = p.wild ? 'perch' : 'idle';
        p.stateIn = rng.range(3, 6);
        p.target = null;
        p.wild = false;
        play('idle', { fade: 0.35 });
      }
      return false;
    }

    /* ------------------------------ being crowded ------------------------------ */
    /* It does not flee.  It stands up, and if you keep coming it roars -- the
     * `pets.js` startle rule read the other way round, which is the only way
     * round it can be read for something this size. */
    if (dPlayer < WAKE_NEAR) wake();
    if (dPlayer < LOOM_NEAR && grounded()
      && (p.state === 'wander' || p.state === 'graze')) {
      p.state = 'idle';
      p.stateIn = rng.range(2.5, 5);
      faceThePlayer();
      play('idle', { fade: 0.25 });
    }

    /* -------------------------------- the trip -------------------------------- */
    const home = Math.hypot(wrapDelta(p.x, ROOST.x), p.z - ROOST.z);
    const atRoost = grounded() && home < ROOST.r;
    if (atRoost) {
      p.homeT += dt;
      p.tripIn -= dt;
    }

    switch (p.state) {
      /* ------------------------------ at the roost ------------------------------ */
      case 'sleep':
        p.wantSpeed = 0;
        p.turnTarget = 0;
        /* It wakes up on its own.
         *
         * Without this the state was a trap: `sleep` set `stateIn` to a
         * lifetime and nothing but a player walking inside eighteen metres
         * could end it, so a session where nobody went to the school ground
         * spent **nineteen of its first thirty minutes** with a dragon lying
         * on it -- four flights instead of eighteen.  A still frame is what
         * this world is made of; a still frame nobody can get out of is a
         * bug. */
        p.stateIn -= dt;
        if (p.tripIn <= 0 || p.stateIn <= 0) {
          p.state = 'idle';
          p.stateIn = rng.range(3, 7);
          play('idle', { fade: 0.5 });
        }
        break;

      case 'idle':
      case 'graze':
      case 'wander': {
        p.stateIn -= dt;

        /* Whether to breathe, and this clock is the whole feature.
         *
         * It runs on the ground at the roost and nowhere else -- the perch has
         * its own, and a dragon that breathes fire while flapping would have to
         * stop flapping for the three seconds the clip lasts, which is a dragon
         * falling out of the sky.
         *
         * Reset on *every* expiry, whether or not there was anywhere legal to
         * put it.  Leaving it at zero on a failure means retrying sixty times a
         * second, and on a crowded corner of the school ground that is sixty
         * ten-candidate searches a second forever. */
        p.castIn -= dt;
        if (p.castIn <= 0) {
          const watched = dPlayer < AUDIENCE;
          const gap = watched ? CAST_EVERY_NEAR : CAST_EVERY_ALONE;
          p.castIn = rng.range(gap[0], gap[1]);
          if (tryCast(dPlayer)) break;
        }

        if (p.tripIn <= 0 && p.state !== 'graze') { beginTrip(); break; }
        if (p.stateIn <= 0) {
          if (p.state === 'wander') {
            p.state = rng.chance(0.3) ? 'graze' : 'idle';
            p.stateIn = p.state === 'graze' ? rng.range(4, 8) : rng.range(3, 7);
            play('idle', { rate: p.state === 'graze' ? 0.6 : 1, fade: 0.35 });
          } else if (p.homeT > SLEEP_AFTER && dPlayer > SLEEP_ALONE && rng.chance(0.4)) {
            /* Asleep.  Never while you are watching it arrive -- the whole
             * value of the state is that finding it awake feels like timing,
             * and an animal that dozes off in front of you is a bug. */
            p.state = 'sleep';
            p.stateIn = rng.range(45, 120);
            play('sleep', { fade: 0.6 });
          } else if (dPlayer < LOOM_NEAR) {
            /* Not while you are standing on top of it.  This used to be a
             * correction applied *after* the decision -- pick `wander`, take a
             * step, notice the player, go back to `idle` -- and the symptom was
             * a 0.02 s walk state every four seconds, i.e. two clip cross-fades
             * and a twitch, on repeat, for as long as anybody stood near it.
             * Deciding not to is free; undeciding is not. */
            p.state = 'idle';
            p.stateIn = rng.range(2.5, 5);
          } else {
            p.state = 'wander';
            p.stateIn = rng.range(6, 14);
            p.heading += rng.range(-1.0, 1.0);
            play('walk', { fade: 0.35 });
          }
        }

        if (p.state === 'wander') {
          p.wantSpeed = WALK;
          p.turnIn -= dt;
          if (p.turnIn <= 0) {
            p.turnIn = rng.range(1.8, 4.5);
            p.turnTarget = rng.range(-1, 1) * 0.6;
          }
          // the leash: past the roost's radius the bearing home is blended in
          if (home > ROOST.r) {
            const back = headingTo(wrapDelta(ROOST.x, p.x), ROOST.z - p.z);
            const pull = clamp((home - ROOST.r) / (ROOST.r * 0.4), 0, 1);
            p.turnTarget = p.turnTarget * (1 - pull)
              + clamp(angleDelta(p.heading, back) * 1.4, -1.8, 1.8) * pull;
          }
        } else {
          p.wantSpeed = 0;
          p.turnTarget = 0;
        }
        break;
      }

      case 'roar':
        p.wantSpeed = 0;
        p.turnTarget = 0;
        p.stateIn -= dt;
        if (p.stateIn <= 0) {
          p.state = grounded() && home < ROOST.r ? 'idle' : 'perch';
          p.stateIn = rng.range(3, 7);
          play('idle', { fade: 0.35 });
        }
        break;

      /* -------------------------------- leaving -------------------------------- */
      case 'runup': {
        p.wantSpeed = RUN;
        p.stateIn -= dt;
        // straight ahead, into whatever it is already facing, and if the probe
        // says there is a fence coming it simply leaves early
        if (p.stateIn <= 0 || blockedAhead()) {
          p.state = 'takeoff';
          p.altTarget = CRUISE;
          play('hover', { fade: 0.4 });
        }
        break;
      }

      case 'takeoff': {
        p.wantSpeed = FLY * 0.55;
        const w = waypoint();
        if (w) steerToward(w.x, w.z, 1.6);
        if (p.alt > CRUISE * 0.65) {
          p.state = 'fly';
          play('fly_forward', { fade: 0.5 });
        }
        break;
      }

      /* ------------------------------- the circuit ------------------------------- */
      case 'fly': {
        p.wantSpeed = FLY;
        p.altTarget = CRUISE;
        const w = waypoint();
        steerToward(w.x, w.z, 1.5);
        const d = Math.hypot(wrapDelta(w.x, p.x), w.z - p.z);
        if (d < NODE_REACH) {
          if (p.going && w.perch) {
            beginLanding(w);
          } else if (p.going) {
            p.leg++;
            if (p.leg >= CIRCUIT.length) p.going = false;
          } else {
            beginLanding(ROOST);
          }
        }
        break;
      }

      case 'landing': {
        /* It comes down **onto a place**, not merely downward.
         *
         * The first version set the altitude target to zero on reaching a
         * waypoint and let the ground arrive.  Where it arrived was wherever
         * the animal happened to be twenty metres short of the roost, which was
         * inside the gymnasium -- and a five-metre body inside a collider is not
         * a cosmetic problem: every direction fails `walkable`, the obstacle
         * probe cuts the speed to a tenth every frame, and the thing stands
         * there at four centimetres a second for the rest of the session.
         * Measured: nine and a half minutes.
         *
         * The second version held it at two metres until it was within three
         * and a half of the spot -- and that deadlocked too, the other way: a
         * heavy animal at four metres a second steering at a fixed gain does
         * not converge on a point, it **orbits** it, and it orbited for
         * twenty-four minutes of a thirty-minute run.
         *
         * So the approach does the two things an approach has to do.  It
         * **slows into the spot** rather than flying at it, so the turn tightens
         * as the gap closes and the circle collapses instead of persisting.
         * And the tolerance **grows with time**, so however badly the geometry
         * goes it is a landing that got untidy rather than one that never
         * happened.  `unstick` is underneath all of it as the last resort. */
        p.landT += dt;
        const gap = Math.hypot(wrapDelta(p.touch.x, p.x), p.touch.z - p.z);
        const reach = TOUCH_REACH + p.landT * 1.5;
        steerToward(p.touch.x, p.touch.z, 2.0);
        p.wantSpeed = clamp(gap * 0.7, 0, FLY * 0.4);
        p.altTarget = gap <= reach ? 0 : Math.min(p.alt, 2.0);
        if (p.alt < 0.35) {
          p.alt = 0;
          if (p.going) {
            // arrived on the crest: it announces itself, and often burns
            p.state = 'roar';
            p.stateIn = 2.5;
            play('roar', { loop: false, fade: 0.3 });
            p.perchFor = rng.range(PERCH_FOR[0], PERCH_FOR[1]);
            p.wildPending = rng.chance(PERCH_CAST);
          } else {
            p.state = 'idle';
            p.stateIn = rng.range(3, 7);
            p.homeT = 0;
            p.tripIn = rng.range(TRIP_EVERY[0], TRIP_EVERY[1]);
            play('idle', { fade: 0.4 });
          }
        }
        break;
      }

      case 'perch': {
        p.wantSpeed = 0;
        p.turnTarget = 0;
        p.perchFor -= dt;
        if (p.wildPending && p.perchFor < 8) {
          /* The cast from the crest.  It goes through the same target search as
           * the roost's, so it is subject to the same veto -- which matters
           * more up here than anywhere, because the summit is planted and a
           * fixed bearing downhill lands in a tree about half the time.
           *
           * `wild` is what sends it back to the perch afterwards instead of
           * standing up: it has not finished being on the mountain. */
          p.wildPending = false;
          const t = pickTarget(dPlayer);
          if (t) {
            p.wild = true;
            fire(t);
            break;
          }
        }
        if (p.perchFor <= 0) {
          /* Off the crest and on down the circuit -- **not** straight home.
           * The leg after the perch is the one that makes this a loop rather
           * than an out-and-back, which is the difference between a dragon
           * that crosses the sky and one that flies at you and then away from
           * you along the same line, twice. */
          p.leg++;
          if (p.leg >= CIRCUIT.length) p.going = false;
          /* And it does **not** run up here.  It tried to, at first, and got
           * 0.1 s of the run cycle before the probe stopped it: a summit is a
           * 1-in-2 slope in every direction, so `walkable` -- which allows a
           * 0.55 m step -- refuses the second stride, and what the clip fade
           * showed was a twitch.  Which is also the honest answer.  A dragon
           * on a school running track takes a run at it.  A dragon on a peak
           * steps off the peak. */
          p.state = 'takeoff';
          p.altTarget = CRUISE;
          play('hover', { fade: 0.35 });
        }
        break;
      }
    }

    return true;
  }

  /** One probe ahead, for the run-up: it leaves the ground early rather than
   *  running into the gym. */
  function blockedAhead() {
    const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
    const d = model.bodyR + 4.0;
    return !walkable(wrapX(p.x + fx * d), p.z + fz * d, p.y);
  }

  /**
   * Pick where to put its feet, then start down.
   *
   * `findSpot` is the same ring search `pets.js` and `ebike.summon()` both use,
   * and for the same reason: a written coordinate is a guess about ground built
   * by forty modules.  A guess is survivable for a cat.  For something with a
   * seven-metre span it is the difference between landing on the running track
   * and landing in the gym.
   */
  function beginLanding(at) {
    p.touch = findSpot(at.x, at.z, model.bodyR);
    p.landT = 0;
    p.state = 'landing';
    play('hover', { fade: 0.45 });
  }

  /**
   * The net under all of it: if it is ever standing inside something, move it.
   *
   * Nothing should put it there -- the landing chooses its spot, the step test
   * refuses to walk into a wall, and the leash keeps it on the ground it lives
   * on.  But "should" is doing a lot of work across forty world modules and one
   * planet, and the failure mode is not graceful degradation: a body inside a
   * collider fails every probe in every direction and stands still forever.  So
   * this asks the cheap question once a second and, if the answer is bad, puts
   * it back on its own ground.
   */
  let stuckT = 0;
  function unstick(dt) {
    stuckT -= dt;
    if (stuckT > 0) return;
    stuckT = 1.0;
    if (free(p.x, p.z, model.bodyR, p.y)) return;
    const spot = findSpot(ROOST.x, ROOST.z, model.bodyR);
    if (import.meta.env?.DEV) {
      console.warn(`dragon: stood inside something at (${p.x.toFixed(1)}, `
        + `${p.z.toFixed(1)}) -- moved to (${spot.x.toFixed(1)}, ${spot.z.toFixed(1)})`);
    }
    p.x = spot.x;
    p.z = spot.z;
    p.y = world.heightAt(p.x, p.z);
  }

  /** Turn into the open and start running. */
  function beginTrip() {
    /* It leaves along whichever of eight bearings has the most open ground in
     * front of it, which on the school ground is always down the long axis --
     * and, when it has been shoved into the corner by a wander, is whatever is
     * left.  Cheaper and more reliable than a runway. */
    let best = p.heading;
    let bestClear = -1;
    for (let i = 0; i < 8; i++) {
      const h = (i * Math.PI) / 4;
      let clear = 0;
      for (let d = 2; d <= RUNUP; d += 2) {
        const x = wrapX(p.x - Math.sin(h) * d);
        const z = p.z - Math.cos(h) * d;
        if (!walkable(x, z, p.y)) break;
        clear = d;
      }
      if (clear > bestClear) { bestClear = clear; best = h; }
    }
    p.heading = best;
    p.state = 'runup';
    p.stateIn = Math.max(1.2, Math.min(RUNUP, bestClear)) / RUN;
    p.going = true;
    p.leg = 0;
    p.homeT = 0;
    p.tripIn = rng.range(TRIP_EVERY[0], TRIP_EVERY[1]);
    play('run', { fade: 0.3 });
  }

  /* -------------------------------- the frame -------------------------------- */

  function update(dt) {
    const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);

    /* Always.  See the note on `DRAW`: an animal with a three-hundred-metre
     * circuit that stops deciding while it is out on it never comes back. */
    think(dt, d);
    if (p.alt < 0.4) unstick(dt);

    /* Never LODed out from under its own rider.  `d` is zero by construction
     * while ridden, so this is belt and braces -- but the one thing that must
     * not be possible is a change to how the rider's position is written making
     * the mount disappear underneath the camera that is pointed at it. */
    const near = d < DRAW || p.ridden;
    if (near !== p.near) {
      p.near = near;
      group.visible = near;
      /* And the hitbox goes with it -- through **layers**, not `visible`.
       * `Raycaster` ignores `visible` (which is the whole reason an invisible
       * hitbox works at all, here and on the cat on the garden wall), and out
       * past the draw distance this stops being re-seated, so what it leaves
       * behind is a 2.6 m box of interactable air standing wherever the dragon
       * happened to cross 150 m.  An empty layer mask fails `layers.test` and
       * the pick never reaches it. */
      if (near) hit.layers.enable(0); else hit.layers.disableAll();
      // a marker left on the ground by a dragon nobody can see is litter
    }

    if (near) {
      mixer.update(dt);
      /* The look-at is layered on top of the mixer's own pose, so it has to
       * happen between `mixer.update` and the matrix flush in `seat`. */
      if ((p.state === 'cast' || p.state === 'turn') && p.target) {
        lookAt(p.target.x, p.target.z, 1);
      }
      /* The rider's fire, in the same slot and for the same reason: the mixer
       * has written the flight pose, and the jaw and the head are rotated from
       * there.  The look-at is weighted by the envelope so the head comes round
       * with the jaw and goes back with it. */
      if (p.ridden && p.jawT >= 0) {
        applyJaw();
        if (p.riderTarget) {
          const w = clamp(1 - Math.max(0, p.jawT - JAW.open - JAW.hold) / JAW.close, 0, 1);
          lookAt(p.riderTarget.x, p.riderTarget.z, w);
        }
      }
      seat();
      /* Now the skeleton is current, so the animator's own envelope can be
       * read off it -- see `jetOpen`.  This is the whole trigger: the cinder
       * leaves when the jaw opens, not when a clock beside it says so. */
      if (p.state === 'cast' && !p.jetFired && p.target && jetOpen() > JET_OPEN) {
        p.jetFired = true;
        cinder.cast(jetPoint(_flat), p.target);
      }
      /* And the rider's, off its own envelope rather than off the `firejet`
       * bone -- which every flight clip pins shut at 0.001, so there is nothing
       * to read there while the wings are working.  Same origin, same cast. */
      if (p.ridden && p.riderTarget && !p.jetFired && p.jawT >= JAW.open) {
        p.jetFired = true;
        cinder.cast(jetPoint(_flat), p.riderTarget,
          { airburst: p.riderTarget.airburst, speed: p.riderTarget.speed });
      }
    }

    /* The camera, last, and only now.
     *
     * `main.js` updates the player before the world, so the walker's own frame
     * has already run and deliberately left the camera alone -- see
     * `_passenger`.  Placing it here, after `seat` has put the animal where it
     * actually is this frame, is the difference between a camera on a dragon
     * and a camera chasing one two thirds of a metre behind. */
    if (p.ridden) {
      syncRider();
      player.applyCamera(0);
    }
  }

  return {
    group,
    update,
    get state() { return p.state; },
    /* ------------------------------- the ride ------------------------------- */
    get riding() { return p.ridden; },
    get rideMode() { return p.mode; },
    mountRider,
    dismount,
    /** `E`, while riding: set me down, and then off. */
    riderE,
    /** `F`: throw one at whatever the crosshair is on. */
    riderBreathe,
    /** DEV: what the crosshair is pointing at, without throwing anything. */
    aim: () => ({ ...aimPoint(_aim) }),
    get debug() {
      return {
        state: p.state,
        x: +p.x.toFixed(2), z: +p.z.toFixed(2),
        y: +p.y.toFixed(2), alt: +p.alt.toFixed(2),
        leg: p.leg, going: p.going,
        castIn: +p.castIn.toFixed(1), tripIn: +p.tripIn.toFixed(1),
        jet: +jetOpen().toFixed(3),
        ridden: p.ridden, mode: p.mode,
        speed: +p.speed.toFixed(2), heading: +p.heading.toFixed(2),
      };
    },
    /** DEV: hand-drive it, for the headless checks. */
    greet,
    /** DEV: make it breathe now, wherever it can legally put one. */
    breathe: (dPlayer = 0) => tryCast(dPlayer),
    force(state) {
      const known = ['sleep', 'idle', 'graze', 'wander', 'runup', 'takeoff',
        'fly', 'landing', 'perch', 'roar', 'turn', 'cast'];
      if (!known.includes(state)) {
        console.warn(`dragon: no state "${state}" -- one of ${known.join(', ')}`);
        return;
      }
      p.state = state;
      p.stateIn = 1e9;
      p.alt = state === 'fly' || state === 'takeoff' ? CRUISE : 0;
      p.altTarget = p.alt;
      const clip = {
        sleep: 'sleep', idle: 'idle', graze: 'idle', wander: 'walk', runup: 'run',
        takeoff: 'hover', fly: 'fly_forward', landing: 'hover', perch: 'idle',
        roar: 'roar', turn: 'idle', cast: 'breathe_fire',
      }[state];
      if (state === 'cast') { p.castT = 0; p.jetFired = false; }
      if (clip) play(clip, { loop: state !== 'cast' && state !== 'roar', fade: 0 });
      // a forced cast still needs somewhere to put it
      if (state === 'cast' && !p.target) {
        p.target = pickTarget(1e9) ?? { x: wrapX(p.x - Math.sin(p.heading) * 14),
          z: p.z - Math.cos(p.heading) * 14 };
      }
    },
    /** DEV: put it somewhere, optionally in the air.  `alt` is over the ground. */
    teleport(x, z, alt) {
      p.x = wrapX(x);
      p.z = z;
      p.y = world.heightAt(p.x, p.z);
      if (alt !== undefined) {
        p.alt = alt;
        p.altTarget = alt;
        if (p.ridden) p.mode = alt > 0.4 ? 'air' : 'ground';
      }
    },
  };
}
