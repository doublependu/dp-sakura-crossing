import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { cel } from '../core/toon.js';
import { clamp } from '../core/util.js';

/* ------------------------------------------------------------------ *
 * 動物図鑑 -- the species table, and the loader that fetches them.
 *
 * Split out of `pets.js` when the ten became twenty-three, because the two
 * halves stopped being one subject: this file knows what a species *is* and
 * how to get one off the network, and `pets.js` knows what one *does*.
 *
 * The whole kit ships except `animal-fish`, which is the one model in it
 * that is neither land-based nor air-based.  There is a lake, and a fish in
 * it wants a swim state and a water-surface height query; that is a good
 * separate job and it is not this one.
 *
 * Two rules survive from when there were ten, and both still bite:
 *
 *   1. **Every material is replaced with `cel()`.**  An untouched glTF is a
 *      photograph pasted onto a painting.  The colour map has to survive the
 *      swap, because on these models the map *is* the colour -- the UVs index
 *      swatches in one 512-pixel palette atlas -- so dropping it does not
 *      simplify an animal, it turns it grey.
 *   2. **One failure is one absent animal.**  Twenty-three fetches through
 *      `Promise.all` reject on the first 404 and take the whole town down
 *      with them.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Size.
 *
 * `height` is a height in metres, not a scale factor -- the models are 1.25
 * to 1.83 units tall and one multiplier over all of them would put a bee and
 * an elephant within a hand's breadth of each other.  What it is *not* is
 * zoological.  A giraffe at its real 4.8 m in a suburban lane is a crane with
 * a face; a bee at its real 15 mm is a fly you cannot see, cannot pick with
 * the crosshair, and cannot tell from a petal.
 *
 * So the ladder is authored for the game rather than measured off the animal:
 * **0.34 m at the bottom, 1.15 m at the top**, a spread of about three and a
 * half, and it goes small - medium - large in the order anybody would guess.
 * A bee is a fat bumblebee the size of a teacup, an elephant comes up to your
 * waist, and both of them are cute and, far more to the point, *visible* from
 * across a street with a crosshair on them.
 *
 * That decision also buys the thing the size table was going to cost:
 * nothing in the kit is now too wide for a two-metre back alley, so every
 * species can live in the town instead of being exiled to the school field.
 *
 * `speed` is a comfortable walk.  A run is a multiple of it, and the walk
 * cycle's playback rate follows the speed actually achieved.
 * `air` is a flyer -- see the hover block in `pets.js`.
 */
export const SPECIES = {
  /* --- small: the pocket-sized end, 0.34-0.44 --- */
  bee:         { file: 'animal-bee',         name: 'はち',     height: 0.36, speed: 1.35, air: true },
  caterpillar: { file: 'animal-caterpillar', name: 'いもむし', height: 0.34, speed: 0.42 },
  crab:        { file: 'animal-crab',        name: 'かに',     height: 0.36, speed: 0.66 },
  chick:       { file: 'animal-chick',       name: 'ひよこ',   height: 0.38, speed: 0.78 },
  parrot:      { file: 'animal-parrot',      name: 'おうむ',   height: 0.44, speed: 1.45, air: true },

  /* --- middling: the ones a suburb actually has, 0.50-0.72 --- */
  bunny:       { file: 'animal-bunny',       name: 'うさぎ',   height: 0.50, speed: 1.15 },
  cat:         { file: 'animal-cat',         name: 'ねこ',     height: 0.54, speed: 1.05 },
  koala:       { file: 'animal-koala',       name: 'コアラ',   height: 0.58, speed: 0.72 },
  penguin:     { file: 'animal-penguin',     name: 'ペンギン', height: 0.60, speed: 0.80 },
  fox:         { file: 'animal-fox',         name: 'きつね',   height: 0.62, speed: 1.30 },
  beaver:      { file: 'animal-beaver',      name: 'ビーバー', height: 0.62, speed: 0.90 },
  dog:         { file: 'animal-dog',         name: 'いぬ',     height: 0.66, speed: 1.25 },
  monkey:      { file: 'animal-monkey',      name: 'さる',     height: 0.68, speed: 1.20 },
  hog:         { file: 'animal-hog',         name: 'いのしし', height: 0.70, speed: 1.10 },
  pig:         { file: 'animal-pig',         name: 'ぶた',     height: 0.72, speed: 0.95 },

  /* --- large: heads above the rest, 0.86-1.15 --- */
  panda:       { file: 'animal-panda',       name: 'パンダ',   height: 0.88, speed: 0.85 },
  tiger:       { file: 'animal-tiger',       name: 'とら',     height: 0.90, speed: 1.40 },
  lion:        { file: 'animal-lion',        name: 'ライオン', height: 0.92, speed: 1.35 },
  polar:       { file: 'animal-polar',       name: 'しろくま', height: 0.96, speed: 1.00 },
  deer:        { file: 'animal-deer',        name: 'しか',     height: 1.00, speed: 1.35 },
  cow:         { file: 'animal-cow',         name: 'うし',     height: 1.02, speed: 0.88 },
  elephant:    { file: 'animal-elephant',    name: 'ぞう',     height: 1.10, speed: 0.95 },
  giraffe:     { file: 'animal-giraffe',     name: 'きりん',   height: 1.15, speed: 1.05 },
};

export const SPECIES_KEYS = Object.keys(SPECIES);

/* --------------------------------- the atlas --------------------------------- */

/**
 * The palette atlas, loaded on its own and before anything else.
 *
 * It used to be scavenged out of whichever GLB happened to load first, which
 * worked exactly as long as they all loaded at once.  They do not any more --
 * a species can arrive twenty minutes into a walk -- so the one material every
 * animal in the world shares has to exist before the first of them does.
 *
 * The settings are not preferences.  They are what `GLTFLoader` would have
 * produced from the same file, and every one of them is visible if it is
 * missed: `flipY` false because glTF UVs have their origin at the top and a
 * flipped atlas gives every animal in the kit the wrong swatch; sRGB because
 * a linear-sampled palette is a washed-out one; the trilinear minification the
 * GLB's own sampler asks for (9987), or a distant animal fizzes.
 */
function loadAtlas(base) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      base + 'Textures/colormap.png',
      (tex) => {
        tex.flipY = false;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      () => {
        // grey animals are a worse world, not a broken one
        console.warn('pets: colormap.png did not load; the kit will be untextured');
        resolve(null);
      }
    );
  });
}

/* -------------------------------- prototypes -------------------------------- */

/**
 * Everything `pets.js` needs to make one animal, measured off the model
 * rather than typed in.
 *
 * The three that used to be module-level constants in `pets.js` are here
 * because a factor-of-three spread broke all of them: a body radius that fits
 * a cat lets an elephant walk through a fence, a 0.42 m step lets a
 * caterpillar climb a kerb it is shorter than, and a probe that does not lead
 * the body is a probe fired from inside the thing it is testing for.
 */
function prepare(key, gltf, material) {
  const spec = SPECIES[key];
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (material) o.material = material;
    // MeshToonMaterial has no normal map, so the tangents are dead weight
    o.geometry.deleteAttribute('tangent');
    o.castShadow = true;
    o.receiveShadow = true;
  });

  const box = new THREE.Box3().setFromObject(root);
  const modelH = Math.max(1e-3, box.max.y - box.min.y);
  const scale = spec.height / modelH;
  const w = (box.max.x - box.min.x) * scale;
  const d = (box.max.z - box.min.z) * scale;

  return {
    key,
    spec,
    root,
    clips: gltf.animations,
    scale,
    /** Half the footprint's short side, which is what has to clear a gatepost. */
    bodyR: clamp(0.42 * Math.min(w, d), 0.2, 0.55),
    /** What it will step up.  A caterpillar is not getting onto that kerb. */
    rise: clamp(0.62 * spec.height, 0.14, 0.55),
    /** Half the body's length, for the two-sample ground rake. */
    axle: clamp(0.5 * d, 0.2, 0.7),
    /**
     * The hitbox `E` picks, sized off the animal but with a floor under it.
     * The crosshair is at eye height: at the 3 m the interaction ray reaches,
     * the angle to the top of a true-sized caterpillar is a few degrees, and
     * the difference between hitting it and missing is a twitch of the mouse.
     * The generous box is invisible and the ray still stops at 3 m.
     */
    hit: new THREE.Vector3(
      Math.max(0.7, w),
      Math.max(0.8, spec.height * 1.15),
      Math.max(0.7, d)
    ),
  };
}

/* --------------------------------- the loader --------------------------------- */

/**
 * A lazy, memoised library of prepared species.
 *
 * Twenty-three GLBs are 3.2 MB, and putting all of it in front of the loading
 * bar is fifteen seconds of nothing on a phone for a set of animals most of
 * which are on the far side of a planet.  So there are three ways in:
 *
 *   - `preload(keys)` -- awaited by the boot sequence, for the handful that
 *     live where the player is standing when the bar comes down.
 *   - `idleQueue(keys)` -- everything else, two at a time, in whatever gaps
 *     the browser has after the first frame.  A session that never leaves the
 *     crossing still ends up with a full world inside a minute.
 *   - `get(key)` -- on demand, jumping the queue, for when somebody walks
 *     towards a district faster than the queue is filling it.
 */
export function createPetLibrary() {
  const base = (import.meta.env?.BASE_URL ?? './') + 'models/pets/';
  const loader = new GLTFLoader().setPath(base);

  const models = new Map();      // key -> prototype, once it has arrived
  const pending = new Map();     // key -> promise, while it is in flight
  const failed = new Set();

  let material = null;
  const atlasReady = loadAtlas(base).then((tex) => {
    material = cel({ map: tex, bands: 3, tint: 0x6c5f8c, flat: true });
    return material;
  });

  async function fetchOne(key) {
    await atlasReady;
    try {
      const gltf = await loader.loadAsync(`${SPECIES[key].file}.glb`);
      const proto = prepare(key, gltf, material);
      models.set(key, proto);
      return proto;
    } catch (err) {
      console.warn(`pets: ${SPECIES[key].file}.glb did not load`, err);
      failed.add(key);
      return null;
    } finally {
      pending.delete(key);
    }
  }

  const api = {
    /** Already here, or null.  The synchronous question the spawner asks. */
    peek: (key) => models.get(key) ?? null,
    get loaded() { return models.size; },
    get inFlight() { return pending.size; },
    get missing() { return failed.size; },

    /** Fetch one, or hand back the fetch already running for it. */
    get(key) {
      if (models.has(key)) return Promise.resolve(models.get(key));
      if (failed.has(key)) return Promise.resolve(null);
      if (!pending.has(key)) pending.set(key, fetchOne(key));
      return pending.get(key);
    },

    /**
     * The eager set, with progress.  Settled individually, never `Promise.all`
     * over the lot -- see rule 2 at the top of the file.
     */
    async preload(keys, onProgress = null) {
      let done = 0;
      await Promise.all(keys.map(async (key) => {
        await api.get(key);
        done++;
        onProgress?.(done / keys.length);
      }));
      onProgress?.(1);
    },

    /**
     * Everything else, dripped in on idle.
     *
     * Two at a time: enough that a full world arrives in under a minute on a
     * normal connection, few enough that it never competes with the frame for
     * bandwidth on a bad one.  `requestIdleCallback` where there is one and a
     * timer where there is not, because Safari only got it recently and the
     * fallback is one line.
     */
    idleQueue(keys, onEach = null) {
      const queue = keys.filter((k) => !models.has(k) && !failed.has(k));
      const idle = window.requestIdleCallback
        ? (fn) => window.requestIdleCallback(fn, { timeout: 2000 })
        : (fn) => setTimeout(fn, 300);
      const pump = () => {
        if (!queue.length) return;
        const batch = queue.splice(0, 2);
        Promise.all(batch.map((k) => api.get(k).then((m) => { if (m) onEach?.(k, m); })))
          .then(() => idle(pump));
      };
      idle(pump);
      return { get remaining() { return queue.length; } };
    },
  };
  return api;
}
