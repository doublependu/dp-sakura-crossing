import * as THREE from 'three';
import { PAL } from '../core/palette.js';
import { cel, flat } from '../core/toon.js';
import { flameTex, emberTex, scorchTex } from '../core/textures.js';
import { clamp, rngKit } from '../core/util.js';
import { basisAt, positionAt, wrapX, wrapDelta } from './planet.js';

/* ------------------------------------------------------------------ *
 * 灰の雨 -- Cinder Fall.
 *
 * A port of `MeteorAbility` out of the LinearAbilityCasting sandbox, and the
 * word "port" is doing a lot of work: **none of that file's rendering survives
 * here, and all of its choreography does.**
 *
 *   A burning rock leaves the mouth, lobs downrange on an arc wrapped in its
 *   own fireball, and heats up the whole way -- so the explosion is something
 *   you *watched arrive*.  It lands, detonates, throws its own shattered
 *   chunks across the ground, and the burn fades out behind you while embers
 *   climb off it.
 *
 * Seven beats: launch, arc, an arrival you saw coming, **the fireball**, the
 * ring, debris, a mark that fades.
 *
 * ------------------------------------------------------------------ *
 * THE FIREBALL, WHICH IS THE WHOLE POINT AND WAS MISSING
 *
 * The first pass built the embers, the ring and the scorch and called it done.
 * It was not done, and the gap is visible in one method of `MeteorAbility`:
 * `onImpact` spawns **two nested `BurstMode.FIRE` shells** -- an outer growing
 * 0.22 -> 1.0 of `burstSize` over 0.9 s, and an inner at twice the intensity
 * growing 0.1 -> 0.55 over 0.35 s.  That pair *is* the explosion.  Everything
 * else in the method is decoration around it, and without it there is nothing
 * at the end of the arc but sparks.
 *
 * The original draws each shell as a noise-displaced icosphere with a fresnel
 * rim, dissolving through `dissolveMask`, additively blended.  Here it is
 * **three nested lumpy spheres of flat colour**, hard-edged, at three sizes,
 * three speeds and three lifetimes.  That is not a compromise -- it is how the
 * thing is drawn in the medium this world imitates: an anime explosion is
 * concentric blobs of unshaded colour with a hard outline, never a gradient.
 * The lumps come from the same directional hash the cinder uses at a different
 * seed per layer, so the three silhouettes never line up and the mass reads as
 * boiling rather than as three balloons.
 *
 * The palette is the reference's, mapped onto this town's warm end:
 *
 *     colorHot        #fff3d0  ->  a cream that is already in the lanterns
 *     colorFlameMid   #ffb02e  ->  PAL.orange
 *     colorFlameEdge  #ff3d10  ->  PAL.red
 *
 * which is the matsuri palette.  That is most of what makes fire belong here:
 * it is the same orange as the festival, arriving on a hillside.
 *
 * ------------------------------------------------------------------ *
 * WHAT WAS LEFT BEHIND, AND WHY IT HAD TO BE
 *
 *   - **The volumetric trail.**  The original raymarches a black-body radiator
 *     through a proxy hull at 35 samples per pixel in four noise layers.  It is
 *     beautiful and it is a photograph.  The trail here is hand-drawn tongues
 *     on one instanced quad, which is how a background artist draws fire and
 *     costs one draw call.
 *   - **The PBR rock** and its HDR probe.  There is no probe in this world and
 *     not one standard material anywhere in it.
 *   - **The dynamic light.**  `lightIntensity: 16` is the one entry that is a
 *     hard technical no rather than a taste call: changing the light count
 *     recompiles every material in the scene.  The heat is *drawn* instead.
 *   - **`GroundFissures`, the smoke, the screen flash and the camera shake.**
 *     Molten cracks through a school running track is a different game, grey
 *     smoke over a pastel town greys the town, and the frame is a background:
 *     it does not shake.
 *
 * What was taken *verbatim* is the idea that makes the original tunable: **a
 * cast stores dice, not metres.**  One seed and a handful of unitless rolls per
 * chunk -- an angle, an elevation, a speed jitter.  Every distance and duration
 * is resolved out of `C` inside the update loop, on a zero-length frame
 * included, so changing `arc` re-lofts a cinder already in the air and changing
 * `chunkSpeed` re-throws debris that has already landed.
 *
 * ------------------------------------------------------------------ *
 * COORDINATES
 *
 * Flat authoring coordinates throughout, like every other builder, seated onto
 * the sphere at draw time by `positionAt`/`basisAt` -- the `pets.js` rule for
 * the `pets.js` reason: this is built after `bakeToPlanet`, so it lives in the
 * scene rather than in `world.root`.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * The numbers.  Where a name matches the original's, the original's value is
 * in the comment -- those are the deliberate departures.
 * ------------------------------------------------------------------ */
const C = {
  /* --- the cast --- */
  range: 26,
  minRange: 8,        // how close to the player it will ever land
  speed: 13,          // reference 21
  /**
   * The floor under the flight time, and it is the most important number here.
   *
   * The first pass had none, and the arithmetic ate the whole effect: a
   * fourteen-metre shot at 15 m/s is 0.9 s, a six-metre one is **0.4 s**, and
   * at 0.4 s there is no watching-it-arrive -- there is a flicker and then a
   * bang.  The original never hits this because its caster stands twenty metres
   * from everything it throws at.  A dragon breathes at the ground near its own
   * feet, so the short shot is the *normal* shot and has to be given time to be
   * a shot at all.
   */
  minFlight: 0.95,
  arc: 3.4,           // metres the mid-span lobs upward
  arcCurve: 0.85,     // < 1 flattens the top of the arc
  chargeCurve: 1.6,   // how late it heats up on the way in

  /* --- the cinder --- */
  radius: 0.9,        // reference 0.8
  lumpiness: 0.26,
  cuts: 7,            // planar fracture faces sliced off it
  cutDepth: 0.26,
  spin: 3.0,          // rad/s
  /** The fireball it flies inside.  Reference `trailHeadSize: 1.8`. */
  headMin: 1.15,      // × radius, cool at the mouth ...
  headMax: 2.10,      // ... and at full charge, on the way in

  /* --- the trail --- */
  trailNodes: 34,     // tongues laid along the arc
  trailSpan: 7.0,     // reference 7.0 -- metres of arc they cover behind it
  trailWidth: 1.25,
  trailHead: 1.7,     // × width, the swell at the cinder
  trailFlicker: 0.22,
  trailBurnout: 0.55, // seconds it takes to go out after the impact

  /* --- the detonation --- */
  /**
   * `burstSize`, and the three shells are the reference's two plus one.  Its
   * outer runs 0.22 -> 1.0 over 0.9 s and its inner 0.1 -> 0.55 over 0.35 s;
   * the third sits between them and is what stops the pair reading as a ball
   * inside a ball.
   */
  /**
   * Back to the reference's own figure after looking at 5.2 and then 4.2 on
   * screen: a five-metre radius is ten metres of fireball, and at the eighteen
   * metres a watcher actually stands from it that is half the frame with its
   * far side clipped off by the edge.  The animal is big; the explosion does
   * not have to be bigger.
   */
  burstSize: 3.6,
  /**
   * Three shells, and they are **offset lobes rather than concentric skins**.
   *
   * Concentric was the obvious reading of the original and it is wrong for an
   * opaque medium: the outer shell is always the biggest, so the two inside it
   * are never once visible, and the only way to see them is to make everything
   * translucent -- which is how the first version ended up looking like an
   * orange gel laid over the school rather than a fire standing in front of it.
   *
   * Pushed apart by a fraction of the radius, all three break the silhouette
   * and each gets its own ink outline.  Which is how the medium actually draws
   * an explosion: overlapping blobs of flat colour, outlined, not a shaded ball.
   */
  shells: [
    { r0: 0.22, r1: 0.94, life: 0.90, color: PAL.red,    hold: 0.55, spin: 0.7,
      off: [0, 0, 0] },
    { r0: 0.18, r1: 0.80, life: 0.66, color: PAL.orange, hold: 0.50, spin: -1.1,
      off: [-0.30, 0.34, 0.12] },
    { r0: 0.12, r1: 0.52, life: 0.40, color: 0xfff3d0,   hold: 0.40, spin: 1.6,
      off: [0.30, 0.46, -0.16] },
  ],
  /** Tongues thrown flat out of the crater, which is the part that licks. */
  burstTongues: 16,
  burstTongueLife: 0.7,
  burstTongueReach: 0.85,   // × burstSize

  /* --- embers --- */
  emberRate: 110,     // reference 180
  emberSize: 0.19,
  emberSpeed: 2.4,
  emberRise: 1.6,
  emberLife: 1.5,
  emberDrag: 1.0,
  emberTurb: 0.7,
  burstEmbers: 190,   // reference 260

  /* --- the chunks it breaks into --- */
  chunkCount: 10,     // reference 18
  chunkScale: 0.32,   // × the cinder's radius
  chunkSpeed: 7.0,
  chunkForward: 0.5,  // how far the spray is biased downrange
  chunkLoft: 0.95,
  chunkGravity: -17,
  chunkSpin: 6,
  chunkLinger: 1.8,   // seconds they lie there before sinking
  chunkSink: 1.1,

  /* --- what the ground does --- */
  shockRadius: 7.0,   // reference 6
  shockLife: 0.6,     // reference 0.65
  scorchRadius: 2.6,  // reference 2.8
  scorchLife: 8.0,    // reference 8

  /* --- the clock --- */
  impactHold: 0.9,    // the burst, before the fade starts
  fadeTime: 1.6,
};

/**
 * The four colour stops every particle walks through over its own lifetime,
 * A at birth through D as it dies.
 *
 * The reference's `colorEmberA..D`, except for D: the original dies to
 * `#2b0d05`, a burnt near-black, which against this world's pale sky is a dark
 * speck rather than a fade.  It dies to the world's own ink instead -- the
 * colour every shadow in this town already tends toward.
 */
const EMBER = [0xfff3d0, 0xffb655, 0xe0453f, PAL.ink];
/** The trail, tail to head.  Warmer and shorter -- it never gets to cold. */
const FLAME = [PAL.red, PAL.orange, 0xffd9a0, 0xfff3d0];

const _up = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _bA = new THREE.Vector3();
const _bB = new THREE.Vector3();
const _bC = new THREE.Vector3();
const _wA = new THREE.Vector3();
const _wB = new THREE.Vector3();
const _tv = new THREE.Vector3();
const _col = new THREE.Color();
const _colB = new THREE.Color();
const _dummy = new THREE.Object3D();
const _axis = new THREE.Vector3(0.31, 0.83, 0.46).normalize();

/** Sample a four-stop gradient at t in 0..1 into `out`. */
function gradient4(stops, t, out) {
  const u = clamp(t, 0, 1) * 3;
  const i = Math.min(2, Math.floor(u));
  out.set(stops[i]);
  _colB.set(stops[i + 1]);
  return out.lerp(_colB, u - i);
}

function smoothstep(a, b, v) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Radius of the trail along the stream, 0 = tail, 1 = head, × `trailWidth`.
 * The profile the original sizes its proxy hull with, minus the wake spread --
 * there is no volume here for spent gas to balloon into.
 */
function trailProfile(u) {
  return (0.3 + 0.7 * Math.pow(u, 0.55))
    * (1 + (C.trailHead - 1) * smoothstep(0.62, 1, u));
}

/* ------------------------------------------------------------------ *
 * Lumpy spheres -- the cinder, and every shell of every fireball.
 *
 * An icosphere pushed about by a hash of its own vertex **direction**, and the
 * direction part is load-bearing: `IcosahedronGeometry` is non-indexed, so the
 * same corner appears in five triangles as five separate vertices.  Jitter them
 * by index and the ball tears into confetti; jitter them by where they point
 * and identical inputs give identical floats, so every seam closes.
 *
 * `cuts` slices flat fracture planes off it, which is what makes the cinder
 * read as broken stone rather than as a potato.  The fire shells pass none.
 * ------------------------------------------------------------------ */
function lumpySphere(seed, { detail = 1, lumps = C.lumpiness, cuts = 0, freq = 1.5 } = {}) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const rng = rngKit(seed);

  const planes = [];
  for (let i = 0; i < cuts; i++) {
    const a = rng.range(0, Math.PI * 2);
    const b = Math.acos(rng.range(-1, 1));
    planes.push({
      nx: Math.sin(b) * Math.cos(a),
      ny: Math.cos(b),
      nz: Math.sin(b) * Math.sin(a),
      d: 1 - C.cutDepth * rng.range(0.35, 1),
    });
  }

  const off = seed * 0.017;
  const hash = (x, y, z) => {
    const s = Math.sin((x + off) * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return s - Math.floor(s);
  };

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    x /= len; y /= len; z /= len;
    const r = 1
      + lumps * (hash(x * freq, y * freq, z * freq) - 0.5) * 2
      + lumps * 0.35 * (hash(x * freq * 3.4, y * freq * 3.4, z * freq * 3.4) - 0.5) * 2;
    x *= r; y *= r; z *= r;
    for (const p of planes) {
      const dot = x * p.nx + y * p.ny + z * p.nz;
      if (dot > p.d) {
        const k = dot - p.d;
        x -= p.nx * k; y -= p.ny * k; z -= p.nz * k;
      }
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */

/**
 * @param scene   the render scene -- *not* `world.root`, which is baked
 * @param world   the built world: `heightAt`, `colliderGrid`
 * @param player  the walker, for the "not at your feet" gate
 */
export function createCinderfall({ scene, world, player }) {
  const group = new THREE.Group();
  group.name = 'cinderfall';
  scene.add(group);

  const grid = world.colliderGrid;
  const rng = rngKit(4711);

  /* ------------------------------ the meshes ------------------------------ */

  /* Two casts at most -- one live and one still fading -- and everything below
   * is allocated here and never again.  Nothing is constructed during a cast.
   *
   * The split between instanced and plain is not arbitrary: anything whose
   * **opacity** animates is a plain mesh with its own material, because an
   * `InstancedMesh` shares one material and per-instance alpha is a shader
   * patch this does not need.  Everything that fades by shrinking and cooling
   * instead is instanced. */
  const MAX_CASTS = 2;

  const rockGeo = lumpySphere(9001, { detail: 1, cuts: C.cuts });
  const rocks = new THREE.InstancedMesh(
    rockGeo, cel({ color: 0x6a6270, bands: 3, tint: 0x5a5378, cache: false }), MAX_CASTS);
  const chunks = new THREE.InstancedMesh(
    rockGeo, cel({ color: 0x5f5866, bands: 3, tint: 0x5a5378, cache: false }),
    MAX_CASTS * C.chunkCount);

  /**
   * An unlit shell of flat colour -- every layer of fire in this file.
   *
   * **It writes depth, and that is the whole difference between fire and a
   * filter.**  The first version did not, on the usual reflex that anything
   * transparent should not, and the result was unmistakable once it was on
   * screen: the ink pass is a screen-space *depth* edge detector, so with no
   * depth of its own the fireball let the school building's window mullions and
   * the fence behind it keep their outlines -- drawn on top of the flames.  A
   * five-metre detonation came out as an orange gel with a building's edges
   * ruled across it.
   *
   * Writing depth costs the fade its correctness for the last fifth of a second
   * (a nearly-invisible shell still occludes), so `depthWrite` is switched off
   * per frame once the opacity drops -- see the burst block.  `FrontSide`
   * because the back of a sphere seen through its own front is the other half
   * of the same problem.
   */
  const fireMat = (color, opacity) => flat({
    color, transparent: true, opacity, depthWrite: true, toneMapped: false,
    side: THREE.FrontSide, cache: false,
  });

  /* The fireball the cinder flies inside: two shells, and singletons.  Only one
   * cinder is ever in the air -- the dragon's cooldown is an order of magnitude
   * longer than a flight -- so a second head would only ever be a duplicate. */
  const head = [
    {
      mesh: new THREE.Mesh(lumpySphere(2201, { detail: 3, lumps: 0.32, freq: 2.1 }),
        fireMat(PAL.orange, 0.85)), s: 1.0, spin: 0.9,
    },
    {
      mesh: new THREE.Mesh(lumpySphere(3307, { detail: 3, lumps: 0.36, freq: 2.7 }),
        fireMat(0xfff3d0, 0.95)), s: 0.62, spin: -1.4,
    },
  ];

  /* The detonation.  Three shells, submitted outer first so the inner ones
   * composite over them -- with `depthWrite` off, submission order is layer
   * order. */
  /* Detail 3 and a high lump frequency, which is a look rather than a fidelity
   * choice.  At detail 2 with slow lumps the outer shell came out as a smooth
   * six-sided slab -- a red polygon, not a fireball.  What an explosion needs
   * in this medium is a **cauliflower silhouette**: many small billows around
   * the edge, because the edge is the only thing an unshaded mass has.  1 280
   * triangles a shell is nothing next to what it buys. */
  const burst = C.shells.map((spec, i) => ({
    spec,
    mesh: new THREE.Mesh(
      lumpySphere(5100 + i * 811, { detail: 3, lumps: 0.34, freq: 2.4 + i * 0.6 }),
      fireMat(spec.color, 1)
    ),
  }));

  const quad = new THREE.PlaneGeometry(1, 1);
  /* A tongue's origin is its foot, not its middle: flame grows upward out of
   * where it is, and a centred quad sinks half of itself into the ground every
   * time the trail scrapes a hillside. */
  const tongueGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  /* `alphaTest` is what lets the tongues write depth: the cut-out is a hard
   * edge, so the depth they leave is the shape they draw, and the ink pass
   * finds the outline of every flame instead of the scenery behind it. */
  const flameMat = flat({
    color: 0xffffff, map: flameTex(), transparent: true, opacity: 0.96,
    alphaTest: 0.5, depthWrite: true, side: THREE.DoubleSide,
    toneMapped: false, cache: false,
  });
  /* One cloud for both jobs: the tongues streaming off the cinder and the ones
   * thrown flat out of the crater are the same quad in the same material, so
   * they are the same draw call. */
  const TONGUES = MAX_CASTS * C.trailNodes + C.burstTongues;
  const trail = new THREE.InstancedMesh(tongueGeo, flameMat, TONGUES);

  const EMBER_SLOTS = 420;
  const embers = new THREE.InstancedMesh(quad, flat({
    color: 0xffffff, map: emberTex(), transparent: true, opacity: 0.95,
    alphaTest: 0.3, depthWrite: false, side: THREE.DoubleSide,
    toneMapped: false, cache: false,
  }), EMBER_SLOTS);

  const ringGeo = new THREE.RingGeometry(0.82, 1.0, 40).rotateX(-Math.PI / 2);
  const ringMat = flat({
    color: PAL.lanternLit, transparent: true, opacity: 1, depthWrite: false,
    toneMapped: false, cache: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);

  const discGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  /* Two scorches, each on its own clock, so a second cast does not erase the
   * first one's mark.  Two draw calls that exist only while something is
   * burnt. */
  const scorches = Array.from({ length: 2 }, () => {
    const mat = flat({
      color: 0x4a4258, map: scorchTex(), transparent: true, opacity: 1,
      depthWrite: false, cache: false,
    });
    return { mesh: new THREE.Mesh(discGeo, mat), mat, t: 0, x: 0, z: 0, live: false };
  });

  const all = [
    rocks, chunks, trail, embers, ring,
    ...head.map((h) => h.mesh), ...burst.map((b) => b.mesh),
    ...scorches.map((s) => s.mesh),
  ];
  for (const m of all) {
    m.frustumCulled = false;
    m.visible = false;
    m.userData.noOutline = true;
    m.renderOrder = 5;
    group.add(m);
  }
  /* The cinder and its debris are real objects in this world and are outlined
   * and shadowed like one.  Only the fire is exempt. */
  for (const m of [rocks, chunks]) {
    delete m.userData.noOutline;
    m.renderOrder = 0;
    m.castShadow = true;
  }

  /* --------------------------- the ground helpers --------------------------- */

  /**
   * Seat a flat-lying object on the ground at (x, z), raked to the slope.
   *
   * Two height samples per axis rather than a surface normal, for the reason
   * `pets.js` rakes an animal from a sample at each end: `heightAt` is the only
   * ground there is here, and a normal derived from anything else can disagree
   * with it.
   */
  function seatOnGround(obj, x, z, lift, spread = 1.0) {
    const y = world.heightAt(x, z);
    basisAt(x, z, _up, _east, _north);
    _basis.makeBasis(_east, _up, _north);
    _q.setFromRotationMatrix(_basis);
    const hx = world.heightAt(wrapX(x + spread), z) - world.heightAt(wrapX(x - spread), z);
    const hz = world.heightAt(x, z + spread) - world.heightAt(x, z - spread);
    // +Rx sends +z down and +Rz sends +x up, so the signs are not symmetric
    _e.set(-Math.atan2(hz, spread * 2), 0, Math.atan2(hx, spread * 2), 'XYZ');
    _q2.setFromEuler(_e);
    obj.quaternion.copy(_q).multiply(_q2);
    positionAt(x, y + lift, z, obj.position);
    return y;
  }

  /** Stand an object upright on the sphere at a flat point, with a spin. */
  function seatUpright(obj, x, y, z, angle) {
    basisAt(x, z, _up, _east, _north);
    _basis.makeBasis(_east, _up, _north);
    _q.setFromRotationMatrix(_basis);
    _q2.setFromAxisAngle(_axis, angle);
    obj.quaternion.copy(_q).multiply(_q2);
    positionAt(x, y, z, obj.position);
  }

  /**
   * Face a quad at the camera, but keep its feet on the ground.
   *
   * A full billboard rolls a flame over as you look up at it and the tongue
   * ends up lying on its side.  This is a *cylindrical* billboard about the
   * local up: it always points away from the ground and only spins about that
   * axis to face you, which is what a hand-painted flame does.
   *
   * Right for anything burning *on* the ground.  Wrong for the trail -- see
   * `billboardAlong`.
   */
  function billboardUpright(x, z, cameraPos, out) {
    basisAt(x, z, _up, _east, _north);
    _bA.copy(cameraPos).sub(positionAt(x, 0, z, _bB)).normalize();
    _bB.crossVectors(_up, _bA);                      // right
    if (_bB.lengthSq() < 1e-6) _bB.copy(_east);      // looking straight down it
    _bB.normalize();
    _bA.crossVectors(_bB, _up).normalize();          // forward, out of the quad
    _basis.makeBasis(_bB, _up, _bA);
    return out.setFromRotationMatrix(_basis);
  }

  /**
   * The same trick, about the **flight path** instead of about the ground.
   *
   * The trail was built out of `billboardUpright` first, and one look at it
   * settled the question: thirty-four vertical tongues standing along an arc
   * do not read as a stream, they read as a **comb**.  Every one of them
   * points at the sky, their bases sit on the centre line, and their tips fan
   * apart -- a row of identical pickets travelling sideways.
   *
   * A flame streaming off something moving does not point up.  It points
   * *backwards*, along the flow, and it is the overlap of a hundred of those
   * that makes the mass.  So the quad's local +y is the reversed direction of
   * travel and the roll about it is what faces the camera, which is the same
   * cylindrical billboard rotated onto a different axis.
   *
   * `axis` is in world space, because the arc is a curve on a sphere and the
   * flat frame's idea of "backwards" drifts from the real one over seven
   * metres of trail.
   */
  function billboardAlong(pointW, axisW, cameraPos, out) {
    _bA.copy(cameraPos).sub(pointW).normalize();     // toward the camera
    _bB.crossVectors(axisW, _bA);                    // right
    if (_bB.lengthSq() < 1e-6) return out;           // looking straight down it
    _bB.normalize();
    _bC.crossVectors(_bB, axisW).normalize();        // out of the quad
    _basis.makeBasis(_bB, axisW, _bC);
    return out.setFromRotationMatrix(_basis);
  }

  /* ------------------------------ the target ------------------------------ */

  /**
   * Is this a place a cinder is allowed to land?
   *
   * The same gates the first pass applied to a crosshair.  The *aiming* went
   * away when the fire became the dragon's own decision; the rules about where
   * it may land did not.
   *
   * `BUILT` was 2.5 m, which made the whole summit illegal: the hill is
   * *planted*, every trunk is a collider, and a 2.5 m exclusion around each of
   * them leaves no legal ground on the crest at all.  1.6 m keeps the cinder
   * off the foot of a thing while leaving the gaps between the trees open.
   */
  const BUILT = 1.6;

  /**
   * @param drop  how far *above* the point the caster is, in metres.
   *
   * Zero for anything standing on the ground, which is every caller this had
   * until there was somebody in the air: a rider aiming straight down from
   * forty metres is making a perfectly good shot, and measuring that drop as a
   * horizontal zero refuses it for a reason that looks exactly like a bug.
   */
  function canLand(x, z, exclude = null, drop = 0) {
    if (Math.hypot(wrapDelta(x, player.pos.x), z - player.pos.z, drop) < C.minRange) return false;
    if (exclude && Math.hypot(wrapDelta(x, exclude.x), z - exclude.z) < exclude.r) return false;
    return !grid.each(x, z, BUILT, (c) => (
      x > c.x0 - BUILT && x < c.x1 + BUILT && z > c.z0 - BUILT && z < c.z1 + BUILT
    ));
  }

  /* ------------------------------ the casts ------------------------------ */

  /**
   * One cast, holding dice and clocks and **not one metre**.
   *
   * The two ends and the seed are the whole of its state; the arc, the trail,
   * the spray and the burn are resolved out of `C` on the frame they are drawn.
   */
  const casts = [];

  /**
   * @param opts.speed     m/s, overriding `C.speed` for this cast alone.
   * @param opts.airburst  detonate in the air and leave the ground alone.
   *
   * The rider's shot, over anything `canLand` refuses -- a roof, a tree, a
   * shopfront, the open sky.  It is the same cinder on the same arc with the
   * same burst; what it does not do is scorch, crater or throw debris, because
   * the thing it went off above is somebody's house.  See `riderBreathe`.
   *
   * `speed` exists for the same caller and is not a nicety: `C.speed` is 13 m/s,
   * chosen so a cinder thrown by something *standing still* can be watched all
   * the way in, and a dragon at boost does 26.  A caster that outruns its own
   * fire flies through it, so a rider's cast is thrown faster than the animal
   * throwing it.
   */
  function cast(origin, target, opts = {}) {
    if (casts.length >= MAX_CASTS) casts.shift();
    const seed = Math.floor(rng.range(1, 1e6));
    const r = rngKit(seed);
    const dist = Math.hypot(wrapDelta(target.x, origin.x), target.z - origin.z);

    const record = {
      seed,
      ox: origin.x, oy: origin.y, oz: origin.z,
      tx: target.x, tz: target.z, ty: target.y ?? world.heightAt(target.x, target.z),
      airburst: !!opts.airburst,
      dist,
      phase: 'travel',
      t: 0,
      travelTime: Math.max(C.minFlight, dist / (opts.speed ?? C.speed)),
      spinAxis: new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(),
      emit: 0,
      /* Per chunk: an angle, an elevation and a speed jitter.  Unitless, all
       * three, so `chunkSpeed` re-throws debris that has already landed. */
      dice: Array.from({ length: C.chunkCount }, () => ({
        a: r.range(0, Math.PI * 2),
        e: r.range(0.15, 1.0),
        s: r.range(0.6, 1.25),
        spin: new THREE.Vector3(r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)).normalize(),
        roll: r.range(0, Math.PI * 2),
      })),
      tongues: Array.from({ length: C.burstTongues }, () => ({
        a: r.range(0, Math.PI * 2),
        d: r.range(0.35, 1),
        s: r.range(0.7, 1.35),
        lag: r.range(0, 0.18),
      })),
    };
    casts.push(record);
    return record;
  }

  /** A point on the cast's arc, s in 0..1, into flat (x, y, z). */
  function arcPoint(k, s, out) {
    const u = clamp(s, 0, 1);
    out.x = wrapX(k.ox + wrapDelta(k.tx, k.ox) * u);
    out.z = k.oz + (k.tz - k.oz) * u;
    out.y = k.oy + (k.ty - k.oy) * u
      + Math.pow(Math.sin(Math.PI * u), C.arcCurve) * C.arc;
    return out;
  }

  /* ------------------------------- embers ------------------------------- */

  /* One pool for every cast.  A dead ember is `life <= 0`, the draw pass skips
   * it, and there is no compaction and no allocation anywhere. */
  const pool = Array.from({ length: EMBER_SLOTS }, () => ({
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, phase: 0,
  }));
  let poolNext = 0;

  function spawnEmber(x, y, z, speed, spread = 1) {
    const p = pool[poolNext];
    poolNext = (poolNext + 1) % EMBER_SLOTS;
    const a = rng.range(0, Math.PI * 2);
    const e = rng.range(-0.4, 1.0);
    const ce = Math.cos(e);
    p.x = x; p.y = y; p.z = z;
    p.vx = Math.cos(a) * ce * speed * spread;
    p.vy = Math.sin(e) * speed * spread + C.emberRise * 0.4;
    p.vz = Math.sin(a) * ce * speed * spread;
    p.max = C.emberLife * rng.range(0.7, 1.3);
    p.life = p.max;
    p.size = rng.range(0.7, 1.4);
    p.phase = rng.range(0, 10);
  }

  /* -------------------------------- state -------------------------------- */

  let clock = 0;
  let ringT = Infinity;
  let ringX = 0;
  let ringZ = 0;
  /** The detonation is a singleton: the newest impact owns all three shells. */
  let burstT = Infinity;
  let burstK = null;

  /* -------------------------------- update -------------------------------- */

  function update(dt, camera) {
    clock += dt;
    if (ringT < C.shockLife) ringT += dt;
    if (burstT < 1.2) burstT += dt;

    for (let i = casts.length - 1; i >= 0; i--) {
      const k = casts[i];
      k.t += dt;
      if (k.phase === 'travel' && k.t >= k.travelTime) {
        k.phase = 'impact';
        k.t = 0;
        impact(k);
      } else if (k.phase === 'impact' && k.t >= C.impactHold) {
        k.phase = 'fade';
        k.t = 0;
      } else if (k.phase === 'fade'
        && k.t >= C.fadeTime + C.chunkLinger + C.chunkSink) {
        casts.splice(i, 1);
      }

      if (k.phase === 'travel') {
        k.emit += C.emberRate * dt;
        while (k.emit >= 1) {
          k.emit -= 1;
          arcPoint(k, clamp(k.t / k.travelTime, 0, 1), _v);
          spawnEmber(_v.x, _v.y, _v.z, C.emberSpeed);
        }
      }
    }

    for (const p of pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) continue;
      const age = 1 - p.life / p.max;
      // buoyancy up, drag on everything, and a slow wander so the cloud does
      // not read as a spray of straight lines
      p.vy += C.emberRise * dt;
      const drag = Math.exp(-C.emberDrag * dt);
      p.vx *= drag; p.vy *= drag; p.vz *= drag;
      const turb = C.emberTurb * (1 - age);
      p.x = wrapX(p.x + (p.vx + Math.sin(clock * 2.7 + p.phase) * turb) * dt);
      p.y += p.vy * dt;
      p.z += (p.vz + Math.cos(clock * 2.3 + p.phase * 1.7) * turb) * dt;
      if (p.y < world.heightAt(p.x, p.z) + 0.02) p.life = Math.min(p.life, 0.12);
    }

    for (const s of scorches) {
      if (!s.live) continue;
      s.t += dt;
      if (s.t >= C.scorchLife) { s.live = false; s.mesh.visible = false; continue; }
      const f = s.t / C.scorchLife;
      s.mat.opacity = 0.72 * (1 - f * f);
      seatOnGround(s.mesh, s.x, s.z, 0.035);
      s.mesh.scale.setScalar(C.scorchRadius * 2 * (0.72 + 0.28 * smoothstep(0, 0.25, f)));
      s.mesh.visible = true;
    }

    if (camera) draw(camera);
  }

  /** The burst: the fireball, the ring, the mark, the chunks and the spray. */
  function impact(k) {
    for (let i = 0; i < C.burstEmbers; i++) {
      spawnEmber(k.tx, k.ty + 0.35, k.tz, C.emberSpeed * rng.range(1.5, 3.6));
    }
    burstT = 0;
    burstK = k;
    /* Everything below this line is the *ground's* half of an impact -- the
     * shock ring rolling out across it and the mark left behind.  An airburst
     * has no ground: it goes off over a roof, and both of those would be drawn
     * flat on whatever is underneath it. */
    if (k.airburst) return;
    ringT = 0;
    ringX = k.tx;
    ringZ = k.tz;
    // the older of the two marks is the one recycled
    const s = scorches[0].live && scorches[1].live
      ? (scorches[0].t > scorches[1].t ? scorches[0] : scorches[1])
      : (scorches.find((q) => !q.live) ?? scorches[0]);
    s.live = true;
    s.t = 0;
    s.x = k.tx;
    s.z = k.tz;
  }

  /* --------------------------------- drawing --------------------------------- */

  function draw(camera) {
    let nRock = 0;
    let nTrail = 0;
    let nChunk = 0;
    let flying = null;

    for (const k of casts) {
      const travelling = k.phase === 'travel';
      const s = travelling ? clamp(k.t / k.travelTime, 0, 1) : 1;

      /* -------------------------- the cinder -------------------------- */
      if (travelling) {
        flying = k;
        arcPoint(k, s, _v);
        seatUpright(_dummy, _v.x, _v.y, _v.z, 0);
        _q2.copy(_dummy.quaternion);
        _q.setFromAxisAngle(k.spinAxis, clock * C.spin);
        _dummy.quaternion.copy(_q2).multiply(_q);
        _dummy.scale.setScalar(C.radius);
        _dummy.updateMatrix();
        rocks.setMatrixAt(nRock++, _dummy.matrix);
      }

      /* --------------------------- the trail --------------------------- */
      /* Derived from the arc, never recorded from past frames -- which is what
       * lets `trailSpan` reshape fire that is already in the air. */
      const burn = travelling ? 1 : 1 - clamp(k.t / C.trailBurnout, 0, 1);
      if (burn > 0.01 && nTrail + C.trailNodes <= TONGUES) {
        const span = Math.min(C.trailSpan / Math.max(k.dist, 0.1), s);
        for (let i = 0; i < C.trailNodes; i++) {
          const u = i / (C.trailNodes - 1);          // 0 tail, 1 head
          const sn = s - span * (1 - u);
          if (sn < 0) continue;
          arcPoint(k, sn, _v);
          positionAt(_v.x, _v.y, _v.z, _wA);
          /* Backwards along the flow, sampled off the arc itself rather than
           * assumed -- the cast can climb or dive and the trail has to lie
           * along whatever it actually did. */
          arcPoint(k, Math.min(1, sn + 0.03), _tv);
          positionAt(_tv.x, _tv.y, _tv.z, _wB);
          _v2.copy(_wA).sub(_wB);
          if (_v2.lengthSq() < 1e-8) continue;
          _v2.normalize();

          const flick = 1 + C.trailFlicker * Math.sin(clock * 17 + i * 2.4 + k.seed);
          const size = C.trailWidth * trailProfile(u) * flick * burn;
          /* Pushed off the centre line by a fixed per-node wobble, so the
           * tongues make a plume instead of thirty-four sheets stacked on one
           * plane. */
          const wob = Math.sin(i * 2.399 + k.seed) * size * 0.22;
          const wob2 = Math.cos(i * 1.717 + k.seed) * size * 0.18;
          // the basis has to be built before the wobble, which is expressed in it
          billboardAlong(_wA, _v2, camera.position, _dummy.quaternion);
          _dummy.position.copy(_wA)
            .addScaledVector(_v2, -size * 0.30)      // sink the foot into the flow
            .addScaledVector(_bB, wob)
            .addScaledVector(_bC, wob2);
          _dummy.scale.set(size * 0.9, size * 1.35, 1);
          _dummy.updateMatrix();
          trail.setMatrixAt(nTrail, _dummy.matrix);
          gradient4(FLAME, u * 0.85 + 0.15, _col);
          trail.setColorAt(nTrail, _col);
          nTrail++;
        }
      }

      /* --------------------------- the chunks --------------------------- */
      // debris belongs to a thing that hit the ground
      if (!travelling && !k.airburst) {
        const e = k.phase === 'impact' ? k.t : C.impactHold + k.t;
        const fwdX = wrapDelta(k.tx, k.ox) / Math.max(k.dist, 0.1);
        const fwdZ = (k.tz - k.oz) / Math.max(k.dist, 0.1);
        for (const d of k.dice) {
          const ce = Math.cos(d.e);
          const dx = Math.cos(d.a) * ce + C.chunkForward * fwdX;
          const dz = Math.sin(d.a) * ce + C.chunkForward * fwdZ;
          const sp = C.chunkSpeed * d.s;
          const x = wrapX(k.tx + dx * sp * e);
          const z = k.tz + dz * sp * e;
          const fly = k.ty + 0.4
            + Math.sin(d.e) * C.chunkLoft * sp * e + 0.5 * C.chunkGravity * e * e;
          const rest = e - C.chunkLinger;
          const sink = rest > 0 ? clamp(rest / C.chunkSink, 0, 1) : 0;
          const size = C.radius * C.chunkScale * (1 - sink);
          if (size < 0.01) continue;
          const y = Math.max(world.heightAt(x, z) + size * 0.7, fly) - sink * size * 1.6;

          seatUpright(_dummy, x, y, z, 0);
          _q2.copy(_dummy.quaternion);
          // it stops tumbling when it stops moving
          _q.setFromAxisAngle(d.spin, d.roll + Math.min(e, C.chunkLinger) * C.chunkSpin);
          _dummy.quaternion.copy(_q2).multiply(_q);
          _dummy.scale.setScalar(size);
          _dummy.updateMatrix();
          chunks.setMatrixAt(nChunk++, _dummy.matrix);
        }
      }
    }

    /* ------------------- the fireball riding the cinder ------------------- */
    /* Two shells around the rock, swelling as it comes in.  `chargeCurve`
     * again: the original heats its meteor late, so the thing that leaves the
     * mouth is a stone with a flame on it and the thing that lands is a
     * fireball with a stone in it. */
    if (flying) {
      const s = clamp(flying.t / flying.travelTime, 0, 1);
      const charge = Math.pow(s, C.chargeCurve);
      const r = C.radius * (C.headMin + (C.headMax - C.headMin) * charge);
      arcPoint(flying, s, _v);
      for (const h of head) {
        seatUpright(h.mesh, _v.x, _v.y, _v.z, clock * h.spin);
        h.mesh.scale.setScalar(r * h.s);
        h.mesh.material.opacity = (h.s > 0.8 ? 0.5 : 0.72) + 0.3 * charge;
        h.mesh.visible = true;
      }
    } else if (head[0].mesh.visible) {
      for (const h of head) h.mesh.visible = false;
    }

    /* --------------------------- the detonation --------------------------- */
    if (burstK && burstT < C.shells[0].life) {
      const scale = C.burstSize;
      for (let i = 0; i < burst.length; i++) {
        const b = burst[i];
        const f = clamp(burstT / b.spec.life, 0, 1);
        if (f >= 1) { b.mesh.visible = false; continue; }
        // out fast, then coast -- an explosion is not a balloon inflating
        const grow = 1 - Math.pow(1 - f, 2.6);
        const r = scale * (b.spec.r0 + (b.spec.r1 - b.spec.r0) * grow);
        /* Lifted off the floor by a fifth of its reach, which is the
         * reference's own `_impact.y + scale * 0.28`: a ground detonation is a
         * *dome*, so most of the sphere belongs under the terrain and what is
         * wanted is the fraction standing above it.  The per-shell offset is
         * scaled by that shell's own radius, so the lobes stay in proportion as
         * the whole thing blooms. */
        const o = b.spec.off;
        seatUpright(b.mesh,
          wrapX(burstK.tx + o[0] * r),
          burstK.ty + scale * 0.28 + o[1] * r,
          burstK.tz + o[2] * r,
          clock * b.spec.spin + i);
        b.mesh.scale.setScalar(r);
        /* It holds, then goes.  A fireball is bright for most of its life and
         * then is not there; fading it linearly from the first frame reads as
         * a dissolve, which is a different thing entirely. */
        const a = 1 - smoothstep(b.spec.hold, 1, f);
        b.mesh.material.opacity = a;
        // stop occluding once it has stopped being there
        b.mesh.material.depthWrite = a > 0.85;
        b.mesh.visible = true;
      }

      /* Tongues thrown flat out of the crater, which is the part that licks.
       * They ride the same instanced cloud as the trail: same quad, same
       * material, same draw call. */
      for (let i = 0; i < (burstK.airburst ? 0 : burstK.tongues.length) && nTrail < TONGUES; i++) {
        const t = burstK.tongues[i];
        const f = clamp((burstT - t.lag) / C.burstTongueLife, 0, 1);
        if (f <= 0 || f >= 1) continue;
        const reach = scale * C.burstTongueReach * t.d * (1 - Math.pow(1 - f, 2.2));
        const x = wrapX(burstK.tx + Math.cos(t.a) * reach);
        const z = burstK.tz + Math.sin(t.a) * reach;
        const size = scale * 0.34 * t.s * Math.sin(Math.PI * Math.min(1, f * 1.15));
        if (size < 0.02) continue;
        _dummy.position.copy(positionAt(x, world.heightAt(x, z) + size * 0.1, z, _v2));
        billboardUpright(x, z, camera.position, _dummy.quaternion);
        _dummy.scale.set(size * 0.8, size * 1.5, 1);
        _dummy.updateMatrix();
        trail.setMatrixAt(nTrail, _dummy.matrix);
        gradient4(FLAME, 0.25 + 0.6 * (1 - f), _col);
        trail.setColorAt(nTrail, _col);
        nTrail++;
      }
    } else if (burst[0].mesh.visible) {
      for (const b of burst) b.mesh.visible = false;
      burstK = null;
    }

    /* -------------------------------- embers -------------------------------- */
    let nEmber = 0;
    for (const p of pool) {
      if (p.life <= 0) continue;
      const age = 1 - p.life / p.max;
      // they shrink late rather than early: an ember is bright until it isn't
      const size = C.emberSize * p.size * (1 - age * age * age);
      _dummy.position.copy(positionAt(p.x, p.y, p.z, _v2));
      _dummy.quaternion.copy(camera.quaternion);
      _dummy.scale.setScalar(size);
      _dummy.updateMatrix();
      embers.setMatrixAt(nEmber, _dummy.matrix);
      gradient4(EMBER, age, _col);
      embers.setColorAt(nEmber, _col);
      nEmber++;
    }

    /* --------------------------------- ring --------------------------------- */
    if (ringT < C.shockLife) {
      const f = clamp(ringT / C.shockLife, 0, 1);
      const r = C.shockRadius * (1 - Math.pow(1 - f, 2.2));
      seatOnGround(ring, ringX, ringZ, 0.05);
      ring.scale.set(Math.max(r, 0.05), 1, Math.max(r, 0.05));
      ringMat.opacity = 0.9 * (1 - f) * (1 - f);
      ring.visible = true;
    } else if (ring.visible) {
      ring.visible = false;
    }

    commit(rocks, nRock);
    commit(trail, nTrail, true);
    commit(chunks, nChunk);
    commit(embers, nEmber, true);
  }

  /** Hide an instanced mesh with nothing in it rather than drawing zero of it. */
  function commit(mesh, count, colours = false) {
    mesh.count = count;
    mesh.visible = count > 0;
    if (!count) return;
    mesh.instanceMatrix.needsUpdate = true;
    if (colours && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  /* --------------------------------- the API --------------------------------- */

  return {
    group,
    cast,
    canLand,
    update,
    get range() { return C.range; },
    get minRange() { return C.minRange; },
    get active() { return casts.length > 0; },
    get debug() {
      return {
        casts: casts.length,
        embers: pool.filter((p) => p.life > 0).length,
        burst: burstT < 1.2 ? +burstT.toFixed(2) : null,
        drawn: group.children.filter((o) => o.visible).length,
      };
    },
    dispose() {
      scene.remove(group);
      for (const m of all) m.geometry.dispose();
    },
  };
}
