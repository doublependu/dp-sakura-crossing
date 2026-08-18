import * as THREE from 'three';
import { flat } from '../core/toon.js';
import { clamp, rngKit } from '../core/util.js';
import { HEIGHT } from './dragonmodel.js';
import { basisAt, positionAt, flatAt, wrapX, wrapDelta } from './planet.js';

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
 */
export function createDragon({ scene, world, player, cinder, model }) {
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

  const label = () => {
    if (p.state === 'sleep') return 'りゅう  ·  asleep';

    return 'りゅう  ·  say hello';
  };

  /* One thing to say to it, so `E` never opens a card -- `main.js` calls
   * `action` directly when there is only one option, which is the same path
   * the cat on the garden wall has always taken. */
  world.interactables.push({
    hitbox: hit,
    get label() { return label(); },
    get options() { return [{ key: 'hello', label: 'say hello', action: greet }]; },
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

  function think(dt, dPlayer) {
    /* ------------------------------ the fire ------------------------------ */

    if (p.state === 'turn') {
      /* Facing it before breathing at it.  No clip of its own -- it is a
       * stationary `idle` with the steering still running, which is what a
       * heavy animal turning on the spot actually looks like. */
      p.turnT -= dt;
      p.wantSpeed = 0;
      if (p.target) steerToward(p.target.x, p.target.z, 2.6);
      if (p.turnT <= 0) begin();
      return;
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
      return;
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

    /* --------------------------- shared from here down --------------------------- */

    p.turnRate += (p.turnTarget - p.turnRate) * (1 - Math.exp(-2.2 * dt));
    const airborne = p.state === 'fly' || p.state === 'takeoff' || p.state === 'landing';
    if (p.wantSpeed > 0.01 || airborne) p.heading += p.turnRate * dt;

    /* Looking around: a slow sway of the whole body off the heading it will
     * leave on, applied at draw time rather than to the heading, so the
     * direction it walks off in is the one it chose. */
    p.swayT += dt;
    const swaying = p.wantSpeed < 0.01 && !airborne;
    const swayTarget = swaying
      ? Math.sin(p.swayT * 0.7) * 0.4 + Math.sin(p.swayT * 0.31) * 0.16
      : 0;
    p.sway += (swayTarget - p.sway) * (1 - Math.exp(-2.4 * dt));

    p.speed += (p.wantSpeed - p.speed) * (1 - Math.exp(-2.6 * dt));

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
      if (ahead) {
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
    // arrives leaves the take-off state hanging on an asymptote
    p.alt += clamp(climbing, -CLIMB * 1.4 * dt, CLIMB * dt);
    if (Math.abs(p.altTarget - p.alt) < 0.02) p.alt = p.altTarget;
    p.altBob = airborne ? Math.sin(p.swayT * 1.6) * 0.22 : 0;

    if (airborne) {
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
    if (p.state === 'wander') play('walk', { rate: clamp(p.speed / WALK, 0.5, 1.6) });
    else if (p.state === 'runup') play('run', { rate: clamp(p.speed / RUN, 0.6, 1.5) });
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

    const near = d < DRAW;
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
      seat();
      /* Now the skeleton is current, so the animator's own envelope can be
       * read off it -- see `jetOpen`.  This is the whole trigger: the cinder
       * leaves when the jaw opens, not when a clock beside it says so. */
      if (p.state === 'cast' && !p.jetFired && p.target && jetOpen() > JET_OPEN) {
        p.jetFired = true;
        cinder.cast(jetPoint(_flat), p.target);
      }
    }
  }

  return {
    group,
    update,
    get state() { return p.state; },
    get debug() {
      return {
        state: p.state,
        x: +p.x.toFixed(2), z: +p.z.toFixed(2),
        y: +p.y.toFixed(2), alt: +p.alt.toFixed(2),
        leg: p.leg, going: p.going,
        castIn: +p.castIn.toFixed(1), tripIn: +p.tripIn.toFixed(1),
        jet: +jetOpen().toFixed(3),
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
    teleport(x, z) {
      p.x = wrapX(x);
      p.z = z;
      p.y = world.heightAt(p.x, p.z);
    },
  };
}
