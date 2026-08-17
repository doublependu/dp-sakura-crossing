import * as THREE from 'three';
import { flat } from '../core/toon.js';
import { clamp, rngKit } from '../core/util.js';
import { basisAt, positionAt, wrapX, wrapDelta } from './planet.js';

/* ------------------------------------------------------------------ *
 * 動物たち -- the cube pets, and the only imported geometry in the world.
 *
 * Everything else here is generated: `textures.js` draws every sign with
 * Canvas2D and every building is boxes.  These twenty-three are Kenney's
 * Cube Pets (CC0, credited in the README, shipped in `public/models/pets/`),
 * and what they *are* -- the species table, the sizes, the loader -- lives
 * next door in `petmodels.js`.  This file is what they do.
 *
 * The one rule that governs the whole file: **they are built after the
 * bake.**  `bakeToPlanet` folds geometry into world space and clears
 * container transforms, which destroys animation pivots -- so, exactly like
 * `ebike.js`, these are added to the *scene* rather than to `world.root`,
 * and re-seated on the sphere by hand every frame from `basisAt`/
 * `positionAt`.  Everything below is in flat authoring coordinates like
 * every other builder.
 *
 * They are also the answer to a constraint rather than an exception to it:
 * this world has no people in it anywhere, on purpose, and it still does.
 * An animal crossing the road ahead of you is not a person; it is weather.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Where they live.
 *
 * Two rules decide this table, and they pull in opposite directions.
 *
 * **Near the player**, because the opening minute used to have no animal in
 * it at all: twelve homes spread evenly over a planet is a tour, and a tour
 * you have to walk forty metres to start.  Fourteen of the entries below are
 * within thirty-five metres of where you are standing when the loader comes
 * down, and two of them are in the opening frame.
 *
 * **At the landmarks**, because an animal that lives somewhere worth seeing
 * is the whole reason "follow" pays out.  The far scatter is not decoration;
 * each of those is a guide standing at the place it will take you to next.
 *
 * Every coordinate is a documented camera position out of `CLAUDE_0.md` --
 * ground somebody has already stood on and photographed -- and each one is
 * checked again at startup by `findSpot`.
 *
 * `r` is how far from home the animal will let itself get; `n` is how many
 * of them there are, scattered around the anchor by their own seeds.
 * ------------------------------------------------------------------ */
const SPAWNS = [
  /* ------------------------- within sight of the start ------------------------- */
  { species: 'cat',         x: 13.5,  z: 16.6,   r: 10, n: 2, seed: 8101 }, // さくら坂裏路地
  { species: 'dog',         x: 12.9,  z: 9.6,    r: 9,        seed: 8102 }, // 自販機の休み処
  { species: 'chick',       x: -9.6,  z: 4.35,   r: 7,  n: 3, seed: 8103 }, // 沿線の畑
  { species: 'caterpillar', x: -6.4,  z: 6.6,    r: 4,        seed: 8104 }, // 踏切の植込み
  { species: 'bee',         x: 5.9,   z: 25.0,   r: 12, n: 3, seed: 8105 }, // 街路の桜
  { species: 'bunny',       x: 5.4,   z: 31.5,   r: 9,  n: 2, seed: 8106 }, // 前庭の植込み
  { species: 'parrot',      x: 22.2,  z: 20.0,   r: 11,       seed: 8107 }, // さくら坂商店街
  { species: 'monkey',      x: 33.0,  z: 28.0,   r: 10,       seed: 8108 }, // 児童公園
  { species: 'pig',         x: 22.2,  z: 34.2,   r: 9,        seed: 8109 }, // レコードと電器
  { species: 'koala',       x: 13.4,  z: 44.4,   r: 10,       seed: 8110 }, // ひばり台図書館
  { species: 'fox',         x: -27.9, z: 28.0,   r: 11,       seed: 8111 }, // 桜守神社の境内

  /* ------------------------------ the near districts ------------------------------ */
  { species: 'crab',        x: 11.0,  z: -27.6,  r: 8,  n: 2, seed: 8112 }, // 用水路の岸
  { species: 'penguin',     x: 2.4,   z: -29.5,  r: 8,        seed: 8113 }, // こばと橋
  { species: 'beaver',      x: -34.0, z: -20.6,  r: 9,        seed: 8114 }, // 用水路
  { species: 'hog',         x: 34.0,  z: -26.0,  r: 11,       seed: 8115 }, // 川端の道
  { species: 'panda',       x: -10.3, z: 51.6,   r: 9,        seed: 8116 }, // 桜守裏町
  { species: 'giraffe',     x: 49.2,  z: 12.0,   r: 12,       seed: 8117 }, // 二丁目通り
  { species: 'cat',         x: -21.8, z: -58.0,  r: 10,       seed: 8118 }, // ひばり台五丁目
  { species: 'chick',       x: 0.4,   z: -58.6,  r: 7,  n: 2, seed: 8119 }, // 文具 ひばり堂
  { species: 'dog',         x: 20.2,  z: 71.8,   r: 10,       seed: 8120 }, // 町内会館
  { species: 'elephant',    x: 61.6,  z: 57.6,   r: 12,       seed: 8121 }, // 六丁目の転回場
  { species: 'cow',         x: -37.0, z: 92.4,   r: 12,       seed: 8122 }, // スーパー さかえ
  { species: 'bunny',       x: -4.0,  z: 33.0,   r: 8,        seed: 8123 }, // 図書館前バス停

  /* ------------------------------- school and hills ------------------------------- */
  { species: 'lion',        x: 12.6,  z: -49.5,  r: 11,       seed: 8124 }, // 高校の昇降口
  { species: 'tiger',       x: 40.0,  z: -44.2,  r: 14,       seed: 8125 }, // 校庭
  { species: 'deer',        x: -14.0, z: -122.0, r: 16, n: 2, seed: 8126 }, // 林間広場
  { species: 'monkey',      x: -32.0, z: -111.2, r: 12,       seed: 8127 }, // 山ノ神
  { species: 'polar',       x: 31.0,  z: -139.0, r: 13,       seed: 8128 }, // 展望台
  { species: 'parrot',      x: 91.0,  z: 7.2,    r: 12,       seed: 8129 }, // 東山トンネル

  /* ---------------------------------- the lake ---------------------------------- */
  { species: 'deer',        x: 133.0, z: -74.0,  r: 16,       seed: 8130 }, // ひばり湖畔公園
  { species: 'bee',         x: 143.0, z: -92.0,  r: 12, n: 2, seed: 8131 }, // 貸ボート
  { species: 'crab',        x: 214.0, z: -138.2, r: 9,        seed: 8132 }, // 野鳥観察小屋
  { species: 'beaver',      x: 200.0, z: -146.0, r: 10,       seed: 8133 }, // キャンプ場
];

/**
 * Fetched before the loading bar comes down.
 *
 * Only the species standing where the player is standing.  The other
 * seventeen arrive on idle over the following few seconds, which nobody sees
 * because they are all at least forty metres away -- and putting all 3.2 MB
 * in front of the bar is fifteen seconds of nothing on a phone.
 */
export const EAGER = ['cat', 'dog', 'chick', 'caterpillar', 'bee', 'bunny'];

/* ------------------------------- behaviour ------------------------------- */

/** Multiple of the walk speed when something startles them, or they hurry. */
const RUN = 2.4;
/**
 * What startles them, and it is deliberately not distance alone.
 *
 * A radius on its own makes them impossible to be near: the interaction ray
 * reaches 3 m, so a two-and-a-half metre panic leaves half a metre of world
 * in which an animal is both visible and still there, and every approach ends
 * with its back end disappearing round a corner.  What they actually mind is
 * being *rushed*, so the trigger is the player's speed as much as their
 * distance -- walk up slowly and a cat will let you get to arm's length; run
 * at it, or ride the machine at it, and it is gone.
 *
 * Which is also the instruction printed on the title card.
 */
const FLEE_R = 2.9;      // ... if you are moving faster than
const FLEE_SPEED = 3.2;  // ... this, which is between a walk (2.55) and a run
const FLEE_CLOSE = 1.15; // ... and this close, they go however you came

/**
 * Two rings and a cap, where there used to be one ring.
 *
 * Twelve animals spread over a planet could be drawn whenever they were in
 * front of you.  Thirty-four, most of them deliberately crowded around the
 * spawn, cannot: this scene is draw-call bound at about three thousand and an
 * animal is six or seven of them.  So an animal is *drawn* to 62 m, *thought
 * about* to 44 m, and beyond the cap the furthest of them are dropped
 * entirely -- at which point they are four pixels across and nobody has ever
 * been able to name one.
 */
const DRAW = 62;
const ANIM = 44;
/**
 * 18, not 22, and the four are a measurement rather than a taste.
 *
 * At 22 the animals cost **150 draw calls** at the crossing (10 764 against
 * 10 614 with them hidden), which is over the budget this was given.  The four
 * that go are the four furthest away -- at fifty-odd metres, behind a row of
 * houses, four pixels across -- and dropping them brings it to the low 120s.
 * Nobody has ever been able to name the twenty-second animal on screen.
 */
const DRAW_CAP = 18;

/** Companions never fall under the rings; they are two metres away. */
const FOLLOW_NEAR = 2.2;
const FOLLOW_FAR = 3.4;
/** Past this the companion has genuinely lost you -- put it back behind you. */
const FOLLOW_LOST = 55;

/* --------------------------------- guiding --------------------------------- */

/** Close enough to a route node to call it reached. */
const NODE_REACH = 2.4;
/** The guide hangs back if you are further behind than this ... */
const LEAD_WAIT = 13;
/** ... and gives up on you at this, or after `LEAD_PATIENCE` seconds of it. */
const LEAD_LOST = 48;
const LEAD_PATIENCE = 32;
/** Progress it has to make in `STUCK_EVERY` seconds not to count as stuck. */
const STUCK_EVERY = 3.0;
const STUCK_DIST = 0.7;
const STUCK_LIMIT = 3;

/**
 * @param scene   the render scene -- *not* `world.root`, which is baked
 * @param world   the built world: colliders, `heightAt`, interactables
 * @param player  the walker, which they keep away from, greet and follow
 * @param nav     the landmark graph out of `landmarks.js`
 * @param library the lazy model library out of `petmodels.js`
 * @param discovered  the set of landmark ids already found, restored from storage
 * @param onDiscover  called with the landmark when a guide delivers the player
 */
export function createPets({
  scene, world, player, nav, library,
  discovered = new Set(), onDiscover = null, onCompanion = null,
}) {
  const group = new THREE.Group();
  group.name = 'pets';
  scene.add(group);

  const grid = world.colliderGrid;

  const _up = new THREE.Vector3();
  const _east = new THREE.Vector3();
  const _north = new THREE.Vector3();
  const _basis = new THREE.Matrix4();
  const _surfaceQ = new THREE.Quaternion();
  const _localQ = new THREE.Quaternion();
  const _localE = new THREE.Euler();

  /**
   * The heading that walks in a given direction.
   *
   * Forward is `(-sin h, -cos h)` -- the walker's convention, kept so a pet's
   * heading and the player's yaw mean the same thing -- so pointing one at
   * anything is `atan2(-dx, -dz)` and *not* `atan2(dx, dz)`.  Written down
   * once because it is used six times below and getting it backwards is
   * silent: an animal that flees toward you looks like an animal that charges.
   */
  const headingTo = (dx, dz) => Math.atan2(-dx, -dz);

  /** Signed shortest turn from `a` to `b`. */
  function angleDelta(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  /* ------------------------------ ground tests ------------------------------ */

  /**
   * Is there room for a body of radius `r` at a flat point, feet at `feetY`?
   *
   * Through the collider grid rather than the flat list.  There are 2731
   * colliders in this world and thirty-odd animals firing three probes each
   * per frame; the list version was a hundred full scans a frame, which is
   * the entire reason `colgrid.js` exists.
   */
  function free(x, z, r, feetY) {
    return !grid.each(x, z, r + 0.1, (c) => {
      if (c.top !== undefined && c.top <= feetY + 0.3) return false;
      if (c.bottom !== undefined && c.bottom > feetY + 1.2) return false;
      return x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r;
    });
  }

  /** Free ground at a walkable height -- the test every step is put through. */
  function walkable(p, x, z, feetY) {
    if (!free(x, z, p.bodyR, feetY)) return false;
    return Math.abs(world.heightAt(x, z, feetY) - feetY) <= p.rise;
  }

  /**
   * Somewhere near an anchor with room to stand.
   *
   * The same search `ebike.summon()` does, and for the same reason: a written
   * coordinate is a guess about a world built by forty modules, and half the
   * time the guess is a flowerbed.  Rings outward and gives up on the anchor
   * itself, which is at worst one animal standing somewhere odd.
   */
  /**
   * @param apart  how far out to *start* looking.
   *
   * Which is the whole reason it is a parameter: the ring search begins at
   * zero and the anchor is usually free, so three chicks from one spawn all
   * took it and stood inside each other.  Their seeds differ, but a seed only
   * chooses an angle, and every angle at radius nought is the same point.
   */
  function findSpot(x0, z0, rng, bodyR = 0.5, apart = 0) {
    const feet = world.heightAt(x0, z0);
    for (const d of [0, 1.4, 2.8, 4.5, 6.5].map((v) => v + apart)) {
      for (let i = 0; i < 8; i++) {
        const a = rng.range(0, Math.PI * 2) + (i * Math.PI) / 4;
        const x = wrapX(x0 + Math.cos(a) * d);
        const z = z0 + Math.sin(a) * d;
        const y = world.heightAt(x, z);
        if (Math.abs(y - feet) > 0.6) continue;
        if (free(x, z, bodyR, y)) return { x, z };
      }
    }
    return { x: wrapX(x0), z: z0 };
  }

  /** The ground's rake along the animal, from a sample at each end. */
  function groundPitch(p) {
    const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
    const front = world.heightAt(wrapX(p.x + fx * p.axle), p.z + fz * p.axle, p.y);
    const rear = world.heightAt(wrapX(p.x - fx * p.axle), p.z - fz * p.axle, p.y);
    return clamp(Math.atan2(front - rear, p.axle * 2), -0.5, 0.5);
  }

  /* -------------------------------- animation -------------------------------- */

  /**
   * Cross-fade to a clip.  Re-asking for the clip already running only
   * updates its rate, which is what lets the walk cycle follow the speed
   * without restarting itself sixty times a second.
   */
  function play(p, name, { loop = true, rate = 1, fade = 0.24 } = {}) {
    const next = p.actions[name];
    if (!next) return;
    if (p.current === next) { next.timeScale = rate; return; }
    if (p.current) p.current.fadeOut(fade);
    next.reset();
    next.timeScale = rate;
    next.enabled = true;
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    next.clampWhenFinished = !loop;
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();
    p.current = next;
  }

  /* --------------------------------- building --------------------------------- */

  const pets = [];
  /** Spawns still waiting for their model to arrive over the network. */
  const waiting = SPAWNS.flatMap((s) => {
    const n = s.n ?? 1;
    return Array.from({ length: n }, (_, i) => ({ ...s, seed: s.seed + i * 17, index: i }));
  });
  let opened = false;   // has the player started walking about yet

  function build(spawn, model) {
    const rng = rngKit(spawn.seed);
    const holder = new THREE.Group();
    holder.name = `pet-${spawn.species}`;

    const body = model.root.clone(true);
    body.scale.setScalar(model.scale);
    holder.add(body);

    /* The hitbox `E` picks, a child so it travels with the animal for free.
     * Invisible rather than absent: `Raycaster` ignores `visible`, which is
     * what the cat on the garden wall relies on too. */
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(model.hit.x, model.hit.y, model.hit.z),
      flat({ color: 0xff0000, cache: false })
    );
    hit.position.y = model.hit.y / 2;
    hit.visible = false;
    holder.add(hit);
    group.add(holder);

    const spot = findSpot(spawn.x, spawn.z, rng, model.bodyR, spawn.index * 1.6);
    const mixer = new THREE.AnimationMixer(body);
    const actions = {};
    for (const clip of model.clips) actions[clip.name] = mixer.clipAction(clip);

    const p = {
      spawn, spec: model.spec, key: model.key, rng, holder, hit, mixer, actions,
      current: null,
      bodyR: model.bodyR, rise: model.rise, axle: model.axle,
      air: !!model.spec.air,
      x: spot.x, z: spot.z,
      y: world.heightAt(spot.x, spot.z),
      alt: 0,
      altTarget: 0,
      altBob: 0,
      heading: rng.range(0, Math.PI * 2),
      pitch: 0,
      roll: 0,
      speed: 0,
      wantSpeed: 0,
      greetT: 0,
      turnRate: 0,
      turnTarget: 0,
      // how long until the next heading-rate resample, and until the next
      // state change; two clocks, because a turn is not a decision
      turnIn: rng.range(0.4, 2.0),
      stateIn: rng.range(1.5, 7.0),
      state: 'walk',
      sway: 0,
      swayT: rng.range(0, 10),
      near: true,
      rank: 0,
      // guiding
      route: null, routeI: 0, target: null,
      leadT: 0, stuckT: 0, stuckX: 0, stuckZ: 0, stuckN: 0,
      slot: 0,
    };
    if (p.air) {
      p.cruise = rng.range(1.7, 2.9);
      p.alt = p.altTarget = p.cruise;
    }
    pets.push(p);

    world.interactables.push({
      hitbox: hit,
      /* A getter, because what this animal is to you changes: it is a stranger,
       * then a guide walking somewhere, then yours. */
      get label() {
        if (p.state === 'follow' || p.state === 'stay') return `${p.spec.name}  ·  yours`;
        if (p.state === 'lead' || p.state === 'wait') return `${p.spec.name}  ·  leading you`;
        if (p.state === 'arrived') return `${p.spec.name}  ·  waiting for you`;
        return `${p.spec.name}  ·  say hello`;
      },
      get options() { return optionsFor(p); },
      // the plain `E` path, for anything that does not open the card
      action: () => greet(p),
      pet: p,
    });

    play(p, 'idle', { fade: 0 });
    seat(p);
    return p;
  }

  /**
   * Bring in every spawn of a species whose model has just arrived.
   *
   * The distance rule is the whole point of doing it this way: an animal that
   * fades into existence six metres in front of you is worse than one that is
   * not there yet, so a late arrival waits until the player is somewhere else.
   * At boot there is no such problem -- nobody has moved -- so the near ring
   * is placed immediately and the rule starts applying afterwards.
   */
  function materialise(key, model) {
    for (let i = waiting.length - 1; i >= 0; i--) {
      const s = waiting[i];
      if (s.species !== key) continue;
      if (opened) {
        const d = Math.hypot(wrapDelta(s.x, player.pos.x), s.z - player.pos.z);
        if (d < 32) continue;
      }
      waiting.splice(i, 1);
      build(s, model);
    }
  }

  /* -------------------------------- the verbs -------------------------------- */

  function faceThePlayer(p) {
    p.heading = headingTo(wrapDelta(player.pos.x, p.x), player.pos.z - p.z);
  }

  function greet(p) {
    /* Turn to face whoever said it and wave.
     *
     * Looped rather than played once, because every clip in this kit is cut
     * for a game seen from above and is *short* -- the gesture is a quarter of
     * a second, which as a one-shot is over before the prompt has faded and
     * reads as a twitch.  Three of them in a row reads as a greeting. */
    faceThePlayer(p);
    p.speed = 0;
    p.turnRate = 0;
    if (p.air) p.altTarget = 0.35;
    if (p.state === 'follow' || p.state === 'stay') {
      // a companion does not stop being yours because you said hello
      p.greetT = 2.2;
    } else {
      p.state = 'greet';
      p.stateIn = 2.2;
    }
    play(p, 'gesture-positive', { fade: 0.1 });
  }

  /** Plan a route to somewhere worth going, and set off.  False if nowhere is. */
  function lead(p) {
    const from = nav.nearestNode(p.x, p.z, 30);
    if (from < 0) return false;
    const candidates = nav.reachableLandmarks(from, { exclude: discovered });
    if (!candidates.length) return false;

    /* Somewhere new if there is anywhere new, and among the new ones, the
     * nearest -- `reachableLandmarks` has already sorted on exactly that.  A
     * little randomness among the first few, so asking twice in the same
     * street is not the same walk twice. */
    const pick = candidates[Math.min(candidates.length - 1, Math.floor(p.rng.range(0, 2.6)))];
    const route = nav.path(from, pick.node);
    if (!route || route.length < 2) return false;

    p.target = pick.lm;
    p.route = route;
    p.routeI = 0;
    p.state = 'lead';
    p.leadT = 0;
    p.stuckT = 0;
    p.stuckN = 0;
    p.stuckX = p.x;
    p.stuckZ = p.z;
    if (p.air) p.altTarget = p.cruise;
    return true;
  }

  /** Give up leading, with a shrug, and go back to being an animal. */
  function abandon(p) {
    p.route = null;
    p.target = null;
    p.state = 'pause';
    p.stateIn = 2.0;
    play(p, 'gesture-negative', { fade: 0.15 });
  }

  function adopt(p) {
    p.route = null;
    p.target = null;
    p.state = 'follow';
    p.slot = pets.filter((o) => o.state === 'follow' || o.state === 'stay').length - 1;
    onCompanion?.(p);
  }

  /** What `E` offers on this animal.  Two at a time, never more. */
  function optionsFor(p) {
    const hello = { key: 'hello', label: 'say hello', action: () => greet(p) };
    if (p.state === 'follow') {
      return [hello, { key: 'stay', label: 'stay here', action: () => { p.state = 'stay'; } }];
    }
    if (p.state === 'stay') {
      return [hello, { key: 'come', label: 'come along', action: () => adopt(p) }];
    }
    if (p.state === 'lead' || p.state === 'wait' || p.state === 'arrived') {
      return [hello, { key: 'stop', label: 'never mind', action: () => abandon(p) }];
    }
    return [hello, { key: 'follow', label: 'follow', action: () => {
      if (!lead(p)) {
        // an animal that does not know anywhere should not pretend to
        play(p, 'gesture-negative', { fade: 0.12 });
        p.state = 'pause';
        p.stateIn = 1.6;
      }
    } }];
  }

  /* --------------------------------- seating --------------------------------- */

  /**
   * Put an animal on the sphere.
   *
   * The models are authored **facing +z** and the walker's forward is -z, so
   * a heading of 0 is half a turn from the model's own front: `ry = heading +
   * PI`.  The rake is a rotation about the local **x** (a pet's length runs
   * along z, where the scooter's runs along x, which is why that file turns
   * about z instead), and about +x a positive angle sends the nose *down* --
   * hence the sign.  Euler 'YXZ' is Ry·Rx·Rz, so the rake is applied in the
   * animal's own frame after the heading, which is what it has to be, and the
   * bank a flyer carries goes in the third slot for the same reason.
   */
  function seat(p) {
    basisAt(p.x, p.z, _up, _east, _north);
    _basis.makeBasis(_east, _up, _north);
    _surfaceQ.setFromRotationMatrix(_basis);
    _localE.set(-p.pitch, p.heading + p.sway + Math.PI, p.roll, 'YXZ');
    _localQ.setFromEuler(_localE);
    p.holder.quaternion.copy(_surfaceQ).multiply(_localQ);
    positionAt(p.x, p.y + p.alt + p.altBob, p.z, p.holder.position);
    p.holder.updateMatrixWorld(true);
  }

  /* --------------------------------- steering --------------------------------- */

  /**
   * Advance one animal along whatever it is doing, and produce a `turnTarget`.
   *
   * Split out of `think` when guiding arrived, because the wander and the walk
   * to a landmark differ in exactly one thing -- where the heading wants to be
   * -- and everything after that (the probe, the step, the ground, the clip)
   * is shared.
   */
  function steerToward(p, tx, tz, gain = 2.2) {
    const want = headingTo(wrapDelta(tx, p.x), tz - p.z);
    const d = angleDelta(p.heading, want);
    p.turnTarget = clamp(d * gain, -2.4, 2.4);
  }

  /* -------------------------------- per frame -------------------------------- */

  /**
   * One animal's second of thought.
   *
   * The wander is the original brief -- "moving in curves, looking around" --
   * and the curve is the load-bearing half: what is integrated here is a *turn
   * rate*, not a heading, and the rate itself chases a target resampled every
   * couple of seconds.  Steer toward waypoints instead and every path in the
   * world is a polyline with a visible corner at each one.  Which is exactly
   * what the guide below would be, if it did not go through the same filter.
   */
  function think(p, dt, distToPlayer) {
    const rng = p.rng;
    const guiding = p.state === 'lead' || p.state === 'wait';
    const owned = p.state === 'follow' || p.state === 'stay';

    /* Startled.  Only from the idle states -- being crowded in the middle of a
     * wave should not cancel the wave, and an animal that has offered to take
     * you somewhere should not bolt because you caught up with it. */
    const rush = Math.hypot(player.vel.x, player.vel.z);
    const startled = distToPlayer < FLEE_CLOSE
      || (distToPlayer < FLEE_R && rush > FLEE_SPEED);
    if (startled && (p.state === 'walk' || p.state === 'pause')) {
      p.state = 'flee';
      p.stateIn = rng.range(1.1, 2.2);
      p.heading = headingTo(wrapDelta(p.x, player.pos.x), p.z - player.pos.z)
        + rng.range(-0.4, 0.4);
      p.turnRate = 0;
      p.turnTarget = 0;
    }

    if (p.greetT > 0) p.greetT -= dt;

    /* ------------------------------- the guide ------------------------------- */
    if (guiding) {
      p.leadT += dt;
      const node = nav.nodes[p.route[p.routeI]];

      /* Waiting for you.  The gap is the whole readable part of leading: an
       * animal that simply walks at its own pace to a place you cannot see is
       * an animal that has wandered off, and the difference between the two is
       * that this one keeps stopping and looking back. */
      if (distToPlayer > LEAD_WAIT) {
        p.state = 'wait';
        steerToward(p, player.pos.x, player.pos.z, 2.0);
        if (distToPlayer > LEAD_LOST || p.leadT > LEAD_PATIENCE + 40) { abandon(p); return; }
      } else if (p.state === 'wait') {
        p.state = 'lead';
        p.leadT = Math.min(p.leadT, LEAD_PATIENCE * 0.5);
      }

      if (p.state === 'lead') {
        const dNode = Math.hypot(wrapDelta(node.x, p.x), node.z - p.z);
        if (dNode < NODE_REACH) {
          p.routeI++;
          if (p.routeI >= p.route.length) {
            p.state = 'arrived';
            p.stateIn = 1e9;
            faceThePlayer(p);
            p.speed = 0;
            if (p.air) p.altTarget = 0.4;
            play(p, 'dance', { fade: 0.2 });
            return;
          }
        }
        steerToward(p, node.x, node.z, 2.6);

        /* Stuck.  This *will* fire: the graph's edges are sampled straight
         * lines and the town is full of things a half-metre sample steps over.
         * What matters is that it fails politely -- a re-plan from wherever it
         * has got to, and after three of those an animal that shrugs and goes
         * back to its own business rather than one grinding into a fence for
         * the rest of the session. */
        p.stuckT += dt;
        if (p.stuckT > STUCK_EVERY) {
          const moved = Math.hypot(wrapDelta(p.x, p.stuckX), p.z - p.stuckZ);
          p.stuckT = 0;
          p.stuckX = p.x;
          p.stuckZ = p.z;
          if (moved < STUCK_DIST) {
            p.stuckN++;
            if (p.stuckN > STUCK_LIMIT) { abandon(p); return; }
            const from = nav.nearestNode(p.x, p.z, 24);
            const to = nav.landmarkNode(p.target.id);
            const re = from >= 0 && to >= 0 ? nav.path(from, to) : null;
            if (!re) { abandon(p); return; }
            p.route = re;
            p.routeI = 0;
          }
        }
      }
    } else if (owned) {
      /* Yours.  A slot each, so three of them are a loose group at your heels
       * rather than one animal wearing two others. */
      if (p.state === 'follow') {
        const slotA = player.yaw + Math.PI + (p.slot % 2 ? 0.55 : -0.55) * (1 + (p.slot >> 1));
        const tx = wrapX(player.pos.x - Math.sin(slotA) * FOLLOW_NEAR);
        const tz = player.pos.z - Math.cos(slotA) * FOLLOW_NEAR;
        const gap = Math.hypot(wrapDelta(tx, p.x), tz - p.z);
        if (gap > 0.6) steerToward(p, tx, tz, 2.8);
        else p.turnTarget = 0;
        p.wantSpeed = gap > FOLLOW_FAR ? p.spec.speed * RUN
          : gap > 0.9 ? p.spec.speed * clamp(gap / FOLLOW_FAR, 0.35, 1)
            : 0;
        if (distToPlayer > FOLLOW_LOST) {
          /* Lost -- you took the machine.  Put it back behind you rather than
           * having it sprint the length of the town: a companion that arrives
           * from nowhere while you are not looking is invisible, and one doing
           * twenty-seven kilometres an hour on four short legs is not. */
          const behind = player.yaw + Math.PI;
          const spot = findSpot(
            wrapX(player.pos.x - Math.sin(behind) * 6),
            player.pos.z - Math.cos(behind) * 6, p.rng, p.bodyR
          );
          p.x = spot.x;
          p.z = spot.z;
          p.y = world.heightAt(p.x, p.z);
        }
      } else {
        p.turnTarget = 0;
        p.wantSpeed = 0;
      }
    } else if (p.state !== 'arrived') {
      /* --------------------------- the ordinary animal --------------------------- */
      p.stateIn -= dt;
      if (p.stateIn <= 0) {
        if (p.state === 'walk') {
          /* A quarter of the stops are spent on something on the ground, and
           * one in twenty-five is a dance -- which is in the kit, costs
           * nothing, and is the sort of thing you tell somebody about
           * afterwards.  Rare enough that seeing it is luck. */
          p.state = rng.chance(0.04) ? 'dance' : rng.chance(0.25) ? 'graze' : 'pause';
          p.stateIn = p.state === 'graze' ? rng.range(3.0, 6.5)
            : p.state === 'dance' ? rng.range(4.0, 7.0)
              : rng.range(2.0, 5.5);
        } else if (p.state === 'greet') {
          // come out of a wave standing still, not walking off mid-gesture
          p.state = 'pause';
          p.stateIn = rng.range(1.0, 2.5);
        } else {
          p.state = 'walk';
          p.stateIn = rng.range(4.0, 11.0);
          // leave the pause on a new bearing, or the stop reads as a stutter
          p.heading += rng.range(-1.1, 1.1);
        }
      }

      const walking = p.state === 'walk' || p.state === 'flee';

      /* The curve.  `turnTarget` is a rate in rad/s and `turnRate` chases it,
       * so the second derivative of the heading is what the RNG touches and
       * the path comes out as arcs joined smoothly rather than as a wobble. */
      p.turnIn -= dt;
      if (p.turnIn <= 0) {
        p.turnIn = rng.range(1.6, 4.2);
        p.turnTarget = rng.range(-1, 1) * (p.state === 'flee' ? 0.5 : 0.85);
      }

      /* Home.  Past the radius the bearing back is blended in, hard by 1.4x it
       * -- an animal that wanders off is a bug report about an empty district,
       * and a leash is cheaper than a fence. */
      const dh = Math.hypot(wrapDelta(p.x, p.spawn.x), p.z - p.spawn.z);
      if (walking && dh > p.spawn.r) {
        const back = headingTo(wrapDelta(p.spawn.x, p.x), p.spawn.z - p.z);
        const pull = clamp((dh - p.spawn.r) / (p.spawn.r * 0.4), 0, 1);
        p.turnTarget = p.turnTarget * (1 - pull)
          + clamp(angleDelta(p.heading, back) * 1.4, -1.8, 1.8) * pull;
      }

      p.wantSpeed = p.state === 'flee' ? p.spec.speed * RUN : walking ? p.spec.speed : 0;
    }

    /* --------------------------- shared from here down --------------------------- */

    if (p.state === 'lead') p.wantSpeed = p.spec.speed * 1.3;
    if (p.state === 'wait' || p.state === 'arrived' || p.state === 'greet') p.wantSpeed = 0;
    // mid-wave, nothing walks -- including a companion that was catching up
    if (p.greetT > 0) p.wantSpeed = 0;

    p.turnRate += (p.turnTarget - p.turnRate) * (1 - Math.exp(-2.4 * dt));
    const moving = p.wantSpeed > 0.01;
    if (moving || guiding) p.heading += p.turnRate * dt;

    /* Looking around, which is the other half of the original brief and is
     * only ever a stopped animal: a slow sway of the whole body off the
     * heading it will leave on.  Applied at draw time (`seat`) rather than to
     * the heading, so the direction it walks off in is the one it chose. */
    p.swayT += dt;
    const swayTarget = moving ? 0
      : Math.sin(p.swayT * 0.9) * 0.55 + Math.sin(p.swayT * 0.37) * 0.2;
    p.sway += (swayTarget - p.sway) * (1 - Math.exp(-3.0 * dt));

    p.speed += (p.wantSpeed - p.speed) * (1 - Math.exp(-3.5 * dt));

    /* What is in front of it.  One probe ahead and one to each side; if the
     * front is blocked, turn toward whichever flank is open and mean it.
     * This is what keeps them out of walls -- the step test below only stops
     * them, and an animal pressed against a fence for four seconds is worse
     * than one that never gets there.
     *
     * A flyer's probe is the same probe at its own altitude, which is the
     * whole difference between flying and walking here: `free` already takes
     * the height the query is made from, so a bee simply passes over the
     * things whose tops are beneath it, and still goes round a house. */
    const probeY = p.y + p.alt;
    if (p.speed > 0.05) {
      const lead2 = p.bodyR + 0.65;
      const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
      const blocked = p.air
        ? !free(wrapX(p.x + fx * lead2), p.z + fz * lead2, p.bodyR, probeY)
        : !walkable(p, wrapX(p.x + fx * lead2), p.z + fz * lead2, p.y);
      if (blocked) {
        const l = p.heading + 0.9, r = p.heading - 0.9;
        const test = (h) => {
          const hx = wrapX(p.x - Math.sin(h) * lead2), hz = p.z - Math.cos(h) * lead2;
          return p.air ? free(hx, hz, p.bodyR, probeY) : walkable(p, hx, hz, p.y);
        };
        const turn = test(l) ? 1 : test(r) ? -1 : p.rng.sign() * 2;
        p.turnTarget = turn * 1.9;
        p.turnRate = p.turnTarget;
        p.speed *= 0.55;
      }

      const step = p.speed * dt;
      const nx = wrapX(p.x + fx * step);
      const nz = p.z + fz * step;
      // one axis at a time, so a corner slides instead of stopping dead
      if (p.air) {
        if (free(nx, p.z, p.bodyR, probeY)) p.x = nx;
        if (free(p.x, nz, p.bodyR, probeY)) p.z = nz;
      } else {
        if (walkable(p, nx, p.z, p.y)) p.x = nx;
        if (walkable(p, p.x, nz, p.y)) p.z = nz;
      }
    }

    // the ground, eased exactly the way the player eases onto it
    const groundY = world.heightAt(p.x, p.z, p.y);
    p.y += (groundY - p.y) * (1 - Math.exp(-16 * dt));

    if (p.air) {
      /* Height, bob and bank.  The bob is what stops a hovering box reading as
       * a hovering box, and the bank is what makes a turn read as flight
       * rather than as sliding sideways. */
      p.alt += (p.altTarget - p.alt) * (1 - Math.exp(-2.6 * dt));
      /* The bob is a *displacement*, not a velocity: added to the altitude at
       * draw time rather than integrated into it, or a bee climbs half a metre
       * every time the sine spends longer positive than negative. */
      p.altBob = Math.sin(p.swayT * 2.3) * 0.16 * clamp(p.alt, 0, 1);
      p.pitch = 0;
      p.roll += (clamp(-p.turnRate * 0.34, -0.5, 0.5) - p.roll) * (1 - Math.exp(-4 * dt));
    } else {
      p.pitch = groundPitch(p);
    }

    /* The clip.  The walk cycle's rate follows the speed actually achieved --
     * it is half a second long, so at rate 1 it is two strides a second, and
     * an animal shoved down to a crawl by an obstacle probe should not keep
     * marching on the spot. */
    if (p.state === 'greet' || p.greetT > 0) return;
    if (p.state === 'arrived') { play(p, 'dance'); return; }
    if (p.state === 'flee') {
      play(p, 'run', { rate: clamp(p.speed / (p.spec.speed * RUN), 0.7, 1.6) });
    } else if (p.state === 'graze') {
      play(p, 'eat');
    } else if (p.state === 'dance') {
      play(p, 'dance');
    } else if (p.speed > p.spec.speed * 1.35) {
      play(p, 'run', { rate: clamp(p.speed / (p.spec.speed * RUN), 0.7, 1.6) });
    } else if (p.speed > 0.06) {
      // a flyer's "walk" is its wingbeat, and it does not slow down with it
      play(p, 'walk', { rate: p.air ? 1.8 : clamp(p.speed / p.spec.speed, 0.55, 1.7) });
    } else {
      play(p, p.air ? 'walk' : 'idle', { rate: p.air ? 1.5 : 1 });
    }
  }

  /* ------------------------------ arrival ------------------------------ */

  /**
   * Has the player come to where the guide is standing?
   *
   * Both of them have to be inside the landmark's radius, which is the
   * difference between "the animal got there" and "you were shown something".
   */
  function checkArrival(p) {
    const lm = p.target;
    if (!lm) return;
    const dPlayer = Math.hypot(wrapDelta(lm.x, player.pos.x), lm.z - player.pos.z);
    const dPet = Math.hypot(wrapDelta(lm.x, p.x), lm.z - p.z);
    if (dPlayer > lm.r || dPet > lm.r * 1.6) return;
    const first = !discovered.has(lm.id);
    if (first) discovered.add(lm.id);
    onDiscover?.(lm, first, p);
    adopt(p);
  }

  /* -------------------------------- the frame -------------------------------- */

  let rankT = 0;
  const order = [];

  function update(dt) {
    if (!opened && (player.active || player.vel.lengthSq() > 0.01)) opened = true;

    /* The draw cap, recomputed twice a second rather than every frame: it is a
     * sort over thirty-odd animals and the answer does not change in 16 ms. */
    rankT -= dt;
    if (rankT <= 0) {
      rankT = 0.5;

      /* Spawns whose model arrived while the player was standing on top of
       * them.  `materialise` refuses those, and without this they would wait
       * for a second delivery that is never coming -- the model is already in
       * memory.  Twice a second, ask again. */
      if (waiting.length) {
        for (const key of new Set(waiting.map((s) => s.species))) {
          const model = library?.peek(key);
          if (model) materialise(key, model);
        }
      }

      order.length = 0;
      for (const p of pets) {
        p._d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);
        order.push(p);
      }
      order.sort((a, b) => a._d - b._d);
      order.forEach((p, i) => { p.rank = i; });
    }

    for (const p of pets) {
      const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);
      const owned = p.state === 'follow' || p.state === 'stay';

      /* Far away they are neither drawn nor animated, and they do not think
       * either.  A frozen animal on the far side of the planet is one nobody
       * can see; the alternative is thirty-four mixers rebinding twenty-one
       * tracks apiece for no pixels at all. */
      const near = owned || (d < DRAW && p.rank < DRAW_CAP);
      if (near !== p.near) {
        p.near = near;
        p.holder.visible = near;
      }
      if (!near) continue;

      if (owned || d < ANIM) {
        think(p, dt, d);
        p.mixer.update(dt);
        if (p.state === 'arrived') checkArrival(p);
      }
      seat(p);
    }
  }

  return {
    group,
    pets,
    update,
    materialise,
    /** Everything the pause screen wants to say about your collection. */
    get companions() {
      return pets.filter((p) => p.state === 'follow' || p.state === 'stay')
        .map((p) => p.spec.name);
    },
    get count() { return pets.length; },
    get pending() { return waiting.length; },
    /** DEV: hand-drive one, for the headless checks. */
    lead, greet, abandon,
  };
}
