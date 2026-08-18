import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { cel } from '../core/toon.js';

/* ------------------------------------------------------------------ *
 * 竜 -- the dragon's model, and the four things that have to happen to it
 * between the network and the scene.
 *
 * `petmodels.js` next door does the same job for twenty-three animals and its
 * two rules hold here too -- every material is replaced with `cel()`, and one
 * failure is one absent animal rather than a broken town.  What is different
 * is that this is a **skinned** mesh with a 46-bone rig, where the Kenney kit
 * is node-animated with no skin at all, and that difference decides most of
 * this file.
 *
 * ------------------------------------------------------------------ *
 * 1. THE FIRE IS GEOMETRY, AND IT COMES OUT
 *
 * The GLB carries its own flame: primitives 13 and 14 of `DR_body`, materials
 * `fire` and `fire_core`, 346 triangles of cone reaching a metre and a half
 * out in front of the jaw.  `world/cinderfall.js` replaces it, so both are
 * dropped here -- at load, once, rather than hidden every frame.
 *
 * ------------------------------------------------------------------ *
 * 2. ...BUT THE BONE THAT DROVE IT STAYS, AND IS THE TRIGGER
 *
 * Those primitives are skinned to a bone called `firejet` at the jaw, and
 * **every clip in the file animates its scale**:
 *
 *     breathe_fire     0.001 -> 1.25, over 72 keys
 *     the other seven  0.001, flat
 *
 * So the model already carries a normalised "how open is the jet" envelope,
 * authored by hand, and it is free to read.  That is what `dragon.js` gates
 * the cast on -- not a clip name, not a timer.  Deleting the fire primitives
 * does not touch it: a bone is part of the skeleton, not part of the mesh
 * that happens to be weighted to it.
 *
 * ------------------------------------------------------------------ *
 * 3. FIFTEEN PRIMITIVES BECOME ONE DRAW CALL
 *
 * A glTF mesh with fifteen primitives arrives as fifteen `SkinnedMesh`
 * children -- fifteen draw calls in the colour pass and fifteen more in the
 * shadow pass, for one animal, in a scene that is draw-call bound at about
 * 2 800.  They all carry exactly `POSITION, NORMAL, JOINTS_0, WEIGHTS_0` and
 * they all share one skin, so they can be merged, with each primitive's
 * `baseColorFactor` baked into a per-vertex colour and one
 * `cel({ vertexColors: true })` over the lot.
 *
 * Thirteen draw calls become **one**, twice over.  This is exactly the
 * argument `perf.js` makes about the district -- "the count of things
 * submitted is the cost" -- applied to a model instead of a town.
 *
 * The merged mesh is bound to the *original* skeleton and dropped in where
 * the originals were, so the rig, the mixer and all eight clips are untouched.
 *
 * ------------------------------------------------------------------ *
 * 4. SIZE IS A HEIGHT IN METRES
 *
 * As in `petmodels.js`, and measured rather than typed: the model is **2.83
 * units** tall in the bind pose -- the horns reach y = 2.82, which is a third
 * again above the body -- so the scale is `HEIGHT / 2.83` and everything that
 * depends on the animal's bulk is derived from `HEIGHT` below rather than
 * written down twice.
 *
 * **5.5 m, and the number is set by a sightline rather than by taste.**  The
 * thing this animal has to do is be legible from the school ground looking
 * north at the mountain, which is 86 m to the crest.  At 2.4 m and a 46 degree
 * field of view that is about thirty pixels of a 790-pixel frame -- a smudge
 * you would not pick out of a treeline.  At 5.5 m it is seventy, which is a
 * silhouette with a wingspan.  It also puts the animal a clear head above the
 * player at arm's length, which is the other thing it is for.
 *
 * Everything scales with it: the wingspan comes out at 7.2 m and the body at
 * 6.4 m nose to tail, so the numbers below are fractions of `HEIGHT` and not
 * constants that would have to be re-tuned by hand next time it moves.
 * ------------------------------------------------------------------ */

/** Target height in metres, floor to the tip of the horns. */
export const HEIGHT = 5.5;

/**
 * How far the jaw opens, in radians about the hinge measured in `prepare`.
 *
 * Read off `breathe_fire` rather than chosen: 0.558 rad from the clip's own
 * first frame, at t = 1.83 s.  See the note beside `bones.jawHinge`.
 */
export const JAW_OPEN = 0.558;

/**
 * How far the authored colours are pulled toward this world's palette, 0..1.
 *
 * **Zero on purpose.**  The model is hand-authored and its greens are a
 * decision; `cel()`'s three-band ramp and its violet shadow tint are what
 * integrate everything else in this town and they are given the chance to do
 * it here too, before anybody starts repainting somebody else's dragon.  If it
 * turns out to sit too loud against the pastels, this is the one number to
 * move -- 0.15 takes the edge off the saturation without touching the hue.
 */
const DESATURATE = 0.0;

/** The two materials that are the model's own fire, and are replaced. */
const FIRE_MATERIALS = new Set(['fire', 'fire_core']);

/**
 * Merge every skinned primitive under `root` into one, colours baked in.
 *
 * Returns the merged `SkinnedMesh`, already bound and parented where the
 * originals were, or `null` if the model is not shaped the way this expects --
 * in which case the caller keeps the originals and pays the draw calls, which
 * is a slower dragon rather than no dragon.
 */
function mergeSkinned(root) {
  const parts = [];
  root.traverse((o) => { if (o.isSkinnedMesh) parts.push(o); });
  if (!parts.length) return null;

  const keep = parts.filter((m) => !FIRE_MATERIALS.has(m.material?.name));
  if (!keep.length) return null;

  const skeleton = keep[0].skeleton;
  const bindMatrix = keep[0].bindMatrix.clone();
  const parent = keep[0].parent;
  // one skin, or the merge is meaningless -- the bone indices would not agree
  if (keep.some((m) => m.skeleton !== skeleton)) return null;

  const geos = [];
  for (const m of keep) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    /* `baseColorFactor` arrives from the loader already in linear working
     * space -- `GLTFLoader` does `color.fromArray(factor)`, which does not
     * convert -- and a vertex colour attribute is read in working space too.
     * So this is a straight copy, and *not* a `setHex`, which would apply an
     * sRGB decode to numbers that have already had one. */
    const c = m.material?.color ?? { r: 1, g: 1, b: 1 };
    const r = c.r + (0.5 - c.r) * DESATURATE;
    const gg = c.g + (0.5 - c.g) * DESATURATE;
    const b = c.b + (0.5 - c.b) * DESATURATE;
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // MeshToonMaterial has no normal map, so tangents are dead weight
    g.deleteAttribute('tangent');
    g.deleteAttribute('uv');
    g.deleteAttribute('uv1');
    geos.push(g);
  }

  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) return null;

  const material = cel({
    color: 0xffffff, vertexColors: true, bands: 3, tint: 0x6a6288, flat: true, cache: false,
  });
  const mesh = new THREE.SkinnedMesh(merged, material);
  mesh.name = 'dragon-body';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  /* Never culled.  Three derives a skinned mesh's bounds from the *bind pose*,
   * and this one's wings fold to a third of it -- but the flight clips also
   * throw the tail well outside it, and a bounding sphere that is wrong in
   * either direction is an animal that vanishes at the edge of the frame.
   * There is one of it, so there is nothing to save. */
  mesh.frustumCulled = false;

  parent.add(mesh);
  mesh.bind(skeleton, bindMatrix);
  for (const m of parts) {
    m.removeFromParent();
    m.geometry.dispose();
  }
  return mesh;
}

/**
 * Everything `dragon.js` needs to build one, measured off the model rather
 * than typed in.
 *
 * Exported as well as used, because the headless checks in `CLAUDE_0.md` read
 * the GLB off disk with `GLTFLoader.parse` -- `fetch` has no `file://` -- and
 * everything worth verifying about this file (did the merge happen, how many
 * draw calls is it, which way is up inside the head bone) is decided here.
 */
export function prepare(gltf) {
  const root = gltf.scene;
  const body = mergeSkinned(root);

  if (!body) {
    // the fallback: keep the primitives, drop the fire, pay the draw calls
    console.warn('dragon: could not merge the skin; falling back to one call per material');
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (FIRE_MATERIALS.has(o.material?.name)) { o.visible = false; return; }
      const c = o.material?.color ?? { r: 1, g: 1, b: 1 };
      o.material = cel({
        color: new THREE.Color(c.r, c.g, c.b).getHex(),
        bands: 3, tint: 0x6a6288, flat: true, cache: false,
      });
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    });
  }

  /* Measured in the bind pose, which is wings-out -- so `width` is the
   * wingspan and `depth` is nose to tail-tip, both of which are what the
   * hitbox and the body radius want to know about. */
  const box = new THREE.Box3().setFromObject(root);
  const modelH = Math.max(1e-3, box.max.y - box.min.y);
  const scale = HEIGHT / modelH;
  const w = (box.max.x - box.min.x) * scale;
  const d = (box.max.z - box.min.z) * scale;

  const bones = {};
  root.traverse((o) => {
    if (o.isBone && ['firejet', 'head', 'neck2', 'jaw'].includes(o.name)) {
      bones[o.name] = o;
    }
  });
  if (!bones.firejet) {
    console.warn('dragon: no `firejet` bone -- the fire will have nothing to gate on');
  }

  /**
   * Which way is up, *inside the head bone*.
   *
   * The wind-up turns the head toward where you are aiming, and to do that it
   * has to rotate the bone about the animal's up and right -- but a bone's own
   * axes are whatever the rigger's software chose, and this one is a Blender
   * rig, so its local +y runs *along* the neck rather than up it.  Guessing is
   * how a look-at ends up rolling a dragon's head onto its side.
   *
   * So it is measured instead: in the bind pose, take the head's world matrix,
   * see where each of its three local axes points in model space, and keep the
   * two that come closest to the model's up (0,1,0) and right (1,0,0).  Those
   * are the axes a yaw and a pitch have to be applied about, whatever they
   * happen to be called.
   */
  if (bones.head) {
    root.updateMatrixWorld(true);
    const m = new THREE.Matrix3().setFromMatrix4(bones.head.matrixWorld);
    const local = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1),
    ];
    const world = local.map((v) => v.clone().applyMatrix3(m).normalize());
    const closest = (target) => {
      let best = 0;
      let bestDot = -Infinity;
      for (let i = 0; i < 3; i++) {
        const d = Math.abs(world[i].dot(target));
        if (d > bestDot) { bestDot = d; best = i; }
      }
      // sign matters: an axis pointing down is the up axis, negated
      const sign = world[best].dot(target) < 0 ? -1 : 1;
      return local[best].clone().multiplyScalar(sign);
    };
    bones.headUp = closest(new THREE.Vector3(0, 1, 0));
    bones.headRight = closest(new THREE.Vector3(1, 0, 0));

    /**
     * And the same question for the jaw, which the ride has to open by hand.
     *
     * A rider breathes fire *while flying*, and `breathe_fire` is a three-second
     * grounded clip -- cross-fading to it mid-air is an animal that stops
     * flapping, which is an animal falling out of the sky (see `dragon.js`).  So
     * the jaw is rotated on top of the flight clip instead, exactly the way
     * `lookAt` rotates the head, and this is the hinge to rotate it about.
     *
     * **Both the axis and the angle are measured off the animator's own work
     * rather than invented.**  The hinge comes out as the bone's local **−x**,
     * and sampling `jaw.quaternion` through `breathe_fire` against its own first
     * frame gives a swing of **+0.558 rad about that axis**, reached over a
     * quarter of a second and held for a second and a half.  `JAW_OPEN` below is
     * that number, so a hand-driven jaw opens exactly as wide as a keyed one and
     * cannot be caught disagreeing with it in the same shot.
     */
    const jm = new THREE.Matrix3().setFromMatrix4(bones.jaw?.matrixWorld ?? new THREE.Matrix4());
    if (bones.jaw) {
      const jworld = local.map((v) => v.clone().applyMatrix3(jm).normalize());
      let best = 0;
      let bestDot = -Infinity;
      for (let i = 0; i < 3; i++) {
        const d = Math.abs(jworld[i].dot(new THREE.Vector3(1, 0, 0)));
        if (d > bestDot) { bestDot = d; best = i; }
      }
      const sign = jworld[best].dot(new THREE.Vector3(1, 0, 0)) < 0 ? -1 : 1;
      bones.jawHinge = local[best].clone().multiplyScalar(sign);
    }
  }

  return {
    root,
    body,
    bones,
    clips: gltf.animations,
    scale,
    height: HEIGHT,
    /**
     * Half the *body's* footprint, not the wings'.  Measuring the bind pose
     * would give half of a 7.2 m span and a dragon that cannot get through the
     * school's own back gate; what has to clear a gatepost is the animal, and
     * the wings fold.
     */
    bodyR: HEIGHT * 0.33,
    /** What it will step up.  It is five metres tall; a kerb is not an obstacle. */
    rise: HEIGHT * 0.23,
    /**
     * Where a rider sits, above the animal's own origin.
     *
     * Measured like everything else here: the wing roots are at y = 0.90 in the
     * bind pose and the shoulders behind them are the only flat part of the
     * animal, so the seat is 0.95 model units up -- `0.95 / 2.83` of the height,
     * which is 1.85 m at the shipping size.  `dragon.js` anchors the camera boom
     * to it and `player.js` measures the eye from it.
     */
    saddle: HEIGHT * (0.95 / 2.83),
    /** Half the body's length, for the two-sample ground rake. */
    axle: Math.min(HEIGHT * 0.55, d * 0.42),
    /** The hitbox `E` picks -- the body and a little air, never the wings. */
    hit: new THREE.Vector3(HEIGHT * 1.1, HEIGHT * 1.15, HEIGHT * 1.45),
    span: w,
    length: d,
  };
}

/**
 * Fetch the dragon, once.
 *
 * One file and no library: there is exactly one of these in the world, so the
 * lazy memoised species table next door would be scaffolding around a single
 * `await`.  What it keeps from `petmodels.js` is the *timing* -- 1.5 MB in
 * front of the loading bar is four seconds of nothing on a phone for an animal
 * a hundred metres north behind a three-storey block, so `main.js` asks for
 * this on idle after the bar has come down, and the school is empty until it
 * arrives.
 */
export function loadDragon() {
  const base = (import.meta.env?.BASE_URL ?? './') + 'models/dragon/';
  return new GLTFLoader()
    .setPath(base)
    .loadAsync('dragon.glb')
    .then((gltf) => prepare(gltf))
    .catch((err) => {
      // a town without a dragon is a worse world, not a broken one
      console.warn('dragon: dragon.glb did not load', err);
      return null;
    });
}
