import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cel, flat } from '../core/toon.js';
import { clamp, rngKit } from '../core/util.js';
import { basisAt, positionAt, wrapX, wrapDelta } from './planet.js';

/* ------------------------------------------------------------------ *
 * 動物たち -- the cube pets, and the only imported geometry in the world.
 *
 * Everything else here is generated: `textures.js` draws every sign with
 * Canvas2D and every building is boxes.  These ten are Kenney's Cube Pets
 * (CC0, credited in the README, shipped in `public/models/pets/`), and they
 * are held to the same two rules as anything else that arrived from
 * outside:
 *
 *   1. **Every material is replaced with `cel()`.**  A glTF arrives as
 *      `MeshStandardMaterial`, and an untouched PBR asset dropped into this
 *      scene renders as a photograph pasted onto a painting -- no shadow
 *      tint, no quantised bands, lit by a hemisphere it does not share.  The
 *      colour map survives the swap because on these models the map *is* the
 *      colour: the UVs index swatches in one 512-pixel palette atlas, so
 *      dropping the texture does not simplify them, it turns them grey.  All
 *      ten species share that one atlas, so they share one material and one
 *      shader program between them.
 *   2. **They are built after the bake.**  `bakeToPlanet` folds geometry
 *      into world space and clears container transforms, which destroys
 *      animation pivots -- so, exactly like `ebike.js`, these are added to
 *      the *scene* rather than to `world.root`, and re-seated on the sphere
 *      by hand every frame from `basisAt`/`positionAt`.  Everything below is
 *      in flat authoring coordinates like every other builder.
 *
 * They are also the answer to a constraint rather than an exception to it:
 * this world has no people in it anywhere, on purpose, and it still does.
 * An animal crossing the road ahead of you is not a person; it is weather.
 * ------------------------------------------------------------------ */

/* The ten, and what each one is worth in metres.
 *
 * `height` is a real height, not a scale factor: the models are 1.25 to 1.83
 * units tall and a single multiplier applied to all of them would put a chick
 * and a deer within a hand's breadth of each other.  The scale is measured
 * off the loaded geometry and divided into this, so a species can be swapped
 * for another without anybody having to work out what 0.31 meant.
 *
 * `speed` is a comfortable walk.  A run is a multiple of it (`RUN`), and the
 * walk cycle's playback rate is tied to the speed actually achieved, so a
 * scurrying animal's legs go with it.
 */
const SPECIES = {
  cat:         { file: 'animal-cat',         name: 'ねこ',       height: 0.44, speed: 1.05 },
  dog:         { file: 'animal-dog',         name: 'いぬ',       height: 0.58, speed: 1.25 },
  bunny:       { file: 'animal-bunny',       name: 'うさぎ',     height: 0.40, speed: 1.15 },
  fox:         { file: 'animal-fox',         name: 'きつね',     height: 0.54, speed: 1.30 },
  deer:        { file: 'animal-deer',        name: 'しか',       height: 1.24, speed: 1.35 },
  hog:         { file: 'animal-hog',         name: 'いのしし',   height: 0.72, speed: 1.10 },
  monkey:      { file: 'animal-monkey',      name: 'さる',       height: 0.76, speed: 1.20 },
  chick:       { file: 'animal-chick',       name: 'ひよこ',     height: 0.24, speed: 0.55 },
  crab:        { file: 'animal-crab',        name: 'かに',       height: 0.22, speed: 0.42 },
  caterpillar: { file: 'animal-caterpillar', name: 'いもむし',   height: 0.20, speed: 0.22 },
};

/* Where they live.
 *
 * Every one of these is a *documented camera position* out of `CLAUDE_0.md` --
 * the establishing shot of some district, which means it is ground somebody
 * has already stood on and photographed.  That is the whole reason for
 * choosing them over made-up coordinates: a hand-picked spot in a world this
 * size is a coin flip between a pavement and the inside of a wall, and each
 * one is checked again at startup anyway (`findSpot`).
 *
 * `r` is how far from home the animal will let itself get.  A caterpillar's
 * five metres and a deer's eighteen are the same decision as their speeds.
 */
const HOMES = [
  { species: 'cat',         x: 13.5,  z: 16.6,   r: 10, seed: 8101 },  // さくら坂裏路地
  { species: 'dog',         x: 33.0,  z: 28.0,   r: 13, seed: 8102 },  // 児童公園
  { species: 'fox',         x: -27.9, z: 22.0,   r: 11, seed: 8103 },  // 桜守神社の境内
  { species: 'bunny',       x: 39.0,  z: -45.0,  r: 15, seed: 8104 },  // 校庭
  { species: 'crab',        x: -34.0, z: -20.6,  r: 9,  seed: 8105 },  // 用水路の岸
  { species: 'chick',       x: 7.9,   z: -35.4,  r: 8,  seed: 8106 },  // こばと橋南詰
  { species: 'monkey',      x: -36.4, z: 49.6,   r: 11, seed: 8107 },  // 湯の坂の足湯
  { species: 'caterpillar', x: -10.3, z: 51.6,   r: 5,  seed: 8108 },  // 桜守裏町の生垣
  { species: 'hog',         x: 52.0,  z: -32.2,  r: 12, seed: 8109 },  // 川端の道
  { species: 'cat',         x: -21.8, z: -58.0,  r: 10, seed: 8110 },  // ひばり台五丁目の路地
  { species: 'deer',        x: 133.0, z: -74.0,  r: 16, seed: 8111 },  // ひばり湖畔公園
  { species: 'deer',        x: -14.0, z: -122.0, r: 18, seed: 8112 },  // 杉林の林間広場
];

/* ------------------------------- behaviour ------------------------------- */

/** Multiple of the walk speed when something startles them. */
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
/** Beyond this they are not drawn and their mixer is not stepped. */
const FAR = 74;
/** Lookahead for the obstacle probe, and the body radius it is testing. */
const PROBE = 0.95;
const BODY_R = 0.3;
/** A step that would move the ground more than this is a kerb too high, a
 *  parapet, or the channel -- all of which are refusals, not climbs. */
const MAX_RISE = 0.42;
/** Sampled at each end of the body for the ground rake. */
const AXLE = 0.45;

/* --------------------------------- loading --------------------------------- */

/**
 * Fetch and prepare the ten species.
 *
 * Returns prototypes, not pets: a scene graph with the material already
 * swapped and the scale already measured, ready to be cloned.  Cloning is a
 * plain `Object3D.clone()` -- these are node-animated, with no skins at all,
 * so the clip tracks resolve against the clone's node *names* and
 * `SkeletonUtils` is not needed.
 *
 * @param onProgress optional `(fraction)`
 */
export async function loadPetModels(onProgress = null) {
  const base = (import.meta.env?.BASE_URL ?? './') + 'models/pets/';
  const loader = new GLTFLoader().setPath(base);
  const keys = Object.keys(SPECIES);

  /* One failure is one absent animal, not a town that will not open.
   * `Promise.all` over ten fetches rejects on the first 404 and takes the
   * whole build down with it -- and the thing most likely to 404 is a model
   * somebody removed from `public/`, which is exactly the case where the
   * right answer is "then there is no cat". */
  let done = 0;
  const settled = await Promise.all(keys.map(async (key) => {
    try {
      const gltf = await loader.loadAsync(`${SPECIES[key].file}.glb`);
      return [key, gltf];
    } catch (err) {
      console.warn(`pets: ${SPECIES[key].file}.glb did not load`, err);
      return null;
    } finally {
      done++;
      onProgress?.(done / keys.length);
    }
  }));
  const loaded = settled.filter(Boolean);

  /* One material for all ten.  The atlas is the same file in every one of the
   * GLBs, but each load produces its own `Texture` for it, so the first one
   * wins and the rest are dropped -- ten identical uploads is nine wasted. */
  let atlas = null;
  const models = {};

  for (const [, gltf] of loaded) {
    if (atlas) break;
    gltf.scene.traverse((o) => {
      if (!atlas && o.isMesh && o.material?.map) atlas = o.material.map;
    });
  }
  const material = cel({ map: atlas, bands: 3, tint: 0x6c5f8c, flat: true });

  for (const [key, gltf] of loaded) {
    const spec = SPECIES[key];
    const root = gltf.scene;
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = material;
      // MeshToonMaterial has no normal map, so the tangents are 465 vertices
      // of dead weight per animal
      o.geometry.deleteAttribute('tangent');
      o.castShadow = true;
      o.receiveShadow = true;
    });

    const box = new THREE.Box3().setFromObject(root);
    const modelHeight = Math.max(1e-3, box.max.y - box.min.y);
    models[key] = {
      key,
      spec,
      root,
      clips: gltf.animations,
      scale: spec.height / modelHeight,
      /* The hitbox is sized off the animal, but with a floor under it that a
       * crab does not come close to.  The crosshair is at eye height and a
       * caterpillar is 0.2 m tall: at the 3 m the interaction ray reaches, the
       * angle to the top of a *true-sized* box is under four degrees, so the
       * difference between hitting it and missing is a twitch of the mouse.
       * The generous box is invisible and the ray still stops at 3 m. */
      hit: new THREE.Vector3(
        Math.max(0.7, (box.max.x - box.min.x) * (spec.height / modelHeight)),
        Math.max(0.8, spec.height * 1.15),
        Math.max(0.7, (box.max.z - box.min.z) * (spec.height / modelHeight))
      ),
    };
  }

  onProgress?.(1);
  return models;
}

/* --------------------------------- the herd --------------------------------- */

/**
 * @param scene   the render scene -- *not* `world.root`, which is baked
 * @param world   the built world: colliders, `heightAt`, interactables
 * @param player  the walker, which they keep away from and greet
 * @param models  whatever `loadPetModels` handed back
 */
export function createPets({ scene, world, player, models }) {
  const group = new THREE.Group();
  group.name = 'pets';
  scene.add(group);

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
   * once because it is used three times below and getting it backwards is
   * silent: an animal that flees toward you looks like an animal that charges.
   */
  const headingTo = (dx, dz) => Math.atan2(-dx, -dz);

  /* ------------------------------ ground tests ------------------------------ */

  /** Is there room for a body of radius `r` at a flat point, feet at `feetY`? */
  function free(x, z, r, feetY) {
    for (const c of world.colliders) {
      if (c.top !== undefined && c.top <= feetY + 0.3) continue;
      if (c.bottom !== undefined && c.bottom > feetY + 1.2) continue;
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false;
    }
    return true;
  }

  /** Free ground at a walkable height -- the test every step is put through. */
  function walkable(x, z, feetY) {
    if (!free(x, z, BODY_R, feetY)) return false;
    return Math.abs(world.heightAt(x, z, feetY) - feetY) <= MAX_RISE;
  }

  /**
   * Somewhere near an anchor with room to stand.
   *
   * The same search `ebike.summon()` does, and for the same reason: a written
   * coordinate is a guess about a world built by forty modules, and half the
   * time the guess is a flowerbed.  Rings outward and gives up on the anchor
   * itself, which is at worst one animal standing somewhere odd.
   */
  function findSpot(home, rng) {
    const feet = world.heightAt(home.x, home.z);
    for (const d of [0, 1.4, 2.8, 4.5, 6.5]) {
      for (let i = 0; i < 8; i++) {
        const a = rng.range(0, Math.PI * 2) + (i * Math.PI) / 4;
        const x = wrapX(home.x + Math.cos(a) * d);
        const z = home.z + Math.sin(a) * d;
        const y = world.heightAt(x, z);
        if (Math.abs(y - feet) > 0.6) continue;
        if (free(x, z, 0.5, y)) return { x, z };
      }
    }
    return { x: wrapX(home.x), z: home.z };
  }

  /** The ground's rake along the animal, from a sample at each end. */
  function groundPitch(x, z, heading, feetY) {
    const fx = -Math.sin(heading), fz = -Math.cos(heading);
    const front = world.heightAt(wrapX(x + fx * AXLE), z + fz * AXLE, feetY);
    const rear = world.heightAt(wrapX(x - fx * AXLE), z - fz * AXLE, feetY);
    return clamp(Math.atan2(front - rear, AXLE * 2), -0.5, 0.5);
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

  for (const home of HOMES) {
    const model = models?.[home.species];
    // a missing model is one absent animal, not a broken world
    if (!model) continue;

    const rng = rngKit(home.seed);
    const holder = new THREE.Group();
    holder.name = `pet-${home.species}`;

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

    const spot = findSpot(home, rng);
    const mixer = new THREE.AnimationMixer(body);
    const actions = {};
    for (const clip of model.clips) actions[clip.name] = mixer.clipAction(clip);

    const p = {
      home, spec: model.spec, rng, holder, mixer, actions, current: null,
      x: spot.x, z: spot.z,
      y: world.heightAt(spot.x, spot.z),
      heading: rng.range(0, Math.PI * 2),
      pitch: 0,
      speed: 0,
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
    };
    pets.push(p);

    world.interactables.push({
      hitbox: hit,
      label: `${model.spec.name}  ·  say hello`,
      action: () => {
        /* Turn to face whoever said it and wave.
         *
         * Looped rather than played once, because every clip in this kit is
         * cut for a game seen from above and is *short* -- the gesture is a
         * quarter of a second, which as a one-shot is over before the prompt
         * has faded and reads as a twitch.  Three of them in a row reads as a
         * greeting. */
        p.heading = headingTo(wrapDelta(player.pos.x, p.x), player.pos.z - p.z);
        p.state = 'greet';
        p.speed = 0;
        p.turnRate = 0;
        p.stateIn = 2.2;
        play(p, 'gesture-positive', { fade: 0.1 });
      },
    });

    play(p, 'idle', { fade: 0 });
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
   * animal's own frame after the heading, which is what it has to be.
   */
  function seat(p) {
    basisAt(p.x, p.z, _up, _east, _north);
    _basis.makeBasis(_east, _up, _north);
    _surfaceQ.setFromRotationMatrix(_basis);
    _localE.set(-p.pitch, p.heading + p.sway + Math.PI, 0, 'YXZ');
    _localQ.setFromEuler(_localE);
    p.holder.quaternion.copy(_surfaceQ).multiply(_localQ);
    positionAt(p.x, p.y, p.z, p.holder.position);
    p.holder.updateMatrixWorld(true);
  }

  /* -------------------------------- per frame -------------------------------- */

  /**
   * One animal's second of thought.
   *
   * The whole brief was "moving in curves, looking around", and the curve is
   * the load-bearing half: what is integrated here is a *turn rate*, not a
   * heading, and the rate itself chases a target resampled every couple of
   * seconds.  Steer toward waypoints instead and every path in the world is a
   * polyline with a visible corner at each one.
   */
  function think(p, dt, distToPlayer) {
    const rng = p.rng;

    /* Startled.  Only from the walking states -- being crowded in the middle
     * of a wave should not cancel the wave. */
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

    p.stateIn -= dt;
    if (p.stateIn <= 0) {
      if (p.state === 'walk') {
        /* A quarter of the stops are spent on something on the ground, and one
         * in twenty-five is a dance -- which is in the kit, costs nothing, and
         * is the sort of thing you tell somebody about afterwards.  Rare enough
         * that seeing it is luck rather than a feature. */
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
     * so the second derivative of the heading is what the RNG touches and the
     * path comes out as arcs joined smoothly rather than as a wobble. */
    p.turnIn -= dt;
    if (p.turnIn <= 0) {
      p.turnIn = rng.range(1.6, 4.2);
      p.turnTarget = rng.range(-1, 1) * (p.state === 'flee' ? 0.5 : 0.85);
    }

    /* Home.  Past the radius the bearing back is blended in, hard by 1.4x it
     * -- an animal that wanders off is a bug report about an empty district,
     * and a leash is cheaper than a fence. */
    const dh = Math.hypot(wrapDelta(p.x, p.home.x), p.z - p.home.z);
    if (walking && dh > p.home.r) {
      const back = headingTo(wrapDelta(p.home.x, p.x), p.home.z - p.z);
      let d = back - p.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const pull = clamp((dh - p.home.r) / (p.home.r * 0.4), 0, 1);
      p.turnTarget = p.turnTarget * (1 - pull) + clamp(d * 1.4, -1.8, 1.8) * pull;
    }

    p.turnRate += (p.turnTarget - p.turnRate) * (1 - Math.exp(-2.4 * dt));
    if (walking) p.heading += p.turnRate * dt;

    /* Looking around, which is the other half of the brief and is only ever
     * a stopped animal: a slow sway of the whole body off the heading it will
     * leave on.  Applied at draw time (`seat`) rather than to the heading, so
     * the direction it walks off in is the one it chose. */
    p.swayT += dt;
    const swayTarget = walking ? 0 : Math.sin(p.swayT * 0.9) * 0.55 + Math.sin(p.swayT * 0.37) * 0.2;
    p.sway += (swayTarget - p.sway) * (1 - Math.exp(-3.0 * dt));

    /* What is in front of it.  One probe ahead and one to each side; if the
     * front is blocked, turn toward whichever flank is open and mean it.
     * This is what keeps them out of walls -- the step test below only stops
     * them, and an animal pressed against a fence for four seconds is worse
     * than one that never gets there. */
    const target = p.state === 'flee' ? p.spec.speed * RUN : walking ? p.spec.speed : 0;
    p.speed += (target - p.speed) * (1 - Math.exp(-3.5 * dt));

    if (walking) {
      const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
      if (!walkable(wrapX(p.x + fx * PROBE), p.z + fz * PROBE, p.y)) {
        const l = p.heading + 0.9, r = p.heading - 0.9;
        const lOk = walkable(wrapX(p.x - Math.sin(l) * PROBE), p.z - Math.cos(l) * PROBE, p.y);
        const rOk = walkable(wrapX(p.x - Math.sin(r) * PROBE), p.z - Math.cos(r) * PROBE, p.y);
        const turn = lOk ? 1 : rOk ? -1 : (p.rng.sign() * 2);
        p.turnTarget = turn * 1.9;
        p.turnRate = p.turnTarget;
        p.speed *= 0.55;
      }

      const step = p.speed * dt;
      const nx = wrapX(p.x + fx * step);
      const nz = p.z + fz * step;
      // one axis at a time, so a corner slides instead of stopping dead
      if (walkable(nx, p.z, p.y)) p.x = nx;
      if (walkable(p.x, nz, p.y)) p.z = nz;
    }

    // the ground, eased exactly the way the player eases onto it
    const groundY = world.heightAt(p.x, p.z, p.y);
    p.y += (groundY - p.y) * (1 - Math.exp(-16 * dt));
    p.pitch = groundPitch(p.x, p.z, p.heading, p.y);

    /* The clip.  The walk cycle's rate follows the speed actually achieved --
     * it is half a second long, so at rate 1 it is two strides a second, and
     * an animal shoved down to a crawl by an obstacle probe should not keep
     * marching on the spot. */
    if (p.state === 'greet') return;
    if (p.state === 'flee') {
      play(p, 'run', { rate: clamp(p.speed / (p.spec.speed * RUN), 0.7, 1.6) });
    } else if (p.state === 'graze') {
      play(p, 'eat');
    } else if (p.state === 'dance') {
      play(p, 'dance');
    } else if (p.speed > 0.06) {
      play(p, 'walk', { rate: clamp(p.speed / p.spec.speed, 0.55, 1.7) });
    } else {
      play(p, 'idle');
    }
  }

  function update(dt) {
    for (const p of pets) {
      const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);

      /* Far away they are neither drawn nor animated, and they do not think
       * either.  A frozen animal on the far side of the planet is one nobody
       * can see; the alternative is twelve mixers rebinding twenty-one tracks
       * apiece for no pixels at all. */
      const near = d < FAR;
      if (near !== p.near) {
        p.near = near;
        p.holder.visible = near;
      }
      if (!near) continue;

      think(p, dt, d);
      p.mixer.update(dt);
      seat(p);
    }
  }

  // seat them once so they are in place on the very first frame
  for (const p of pets) seat(p);

  return { group, pets, update, get count() { return pets.length; } };
}
