import * as THREE from 'three';
import { PAL } from './core/palette.js';
import { Pipeline } from './core/post.js';
import { buildSky } from './core/sky.js';
import { R, CENTER, basisAt, positionAt } from './world/planet.js';
import { setOutlineResolution } from './core/outline.js';
import { Player } from './core/player.js';
import { createHud } from './core/hud.js';
import { createMusic } from './core/audio.js';
import { createBoot } from './core/boot.js';
import { createTouchControls } from './core/touch.js';
import { buildWorld } from './world/index.js';
import { createEbike } from './world/ebike.js';
import { buildNavGraph, LANDMARKS } from './world/landmarks.js';
import { createPetLibrary, SPECIES_KEYS } from './world/petmodels.js';
import { createPets, EAGER } from './world/pets.js';
import { loadDragon } from './world/dragonmodel.js';
import { createDragon } from './world/dragon.js';
import { createCinderfall } from './world/cinderfall.js';
import { createShadowBudget, createFreezeAudit } from './core/perf.js';

/* ------------------------------------------------------------------ *
 * Sakura Crossing -- entry point.
 *
 * Lighting is the classic two-light anime setup: one warm quantised key
 * for the sun, one cool bounce fill from the opposite side, and a
 * hemisphere with a violet ground colour so nothing in shadow ever goes
 * black.  The shadow camera follows the player on a snapped grid to keep
 * cast shadows crisp without shimmering.
 *
 * Everything from the world build down lives inside `main()` and is
 * awaited.  The renderer, the lights and the sky are set up above it,
 * synchronously, because they are cheap and because the loading screen
 * wants a live renderer to warm shaders against; the build itself is a
 * second and a half of blocking work and has to be able to yield, so the
 * pieces that depend on it -- the player, the HUD, the pipeline, the frame
 * loop, `window.__scene` -- cannot be top-level constants any more.
 * ------------------------------------------------------------------ */

const canvas = document.getElementById('view');

/* ------------------------------------------------------------------ *
 * The phone profile.
 *
 * One question -- is the pointer coarse -- and three answers, because the
 * costs on a phone are not the costs here.  The notes are explicit that
 * this scene is draw-call bound and that halving the internal resolution
 * changed nothing measurable (19.3 -> 19.1 ms), so the resolution cap below
 * is not the fix and is not pretending to be: it is there because a phone
 * is also fill-rate poor and its screen is 400 px wide, where 2x supersampling
 * buys nothing anybody can see.  The shadow map is the one that matters --
 * halving it halves an entire extra pass over the scene's geometry.
 * ------------------------------------------------------------------ */
const COARSE = window.matchMedia?.('(pointer: coarse)').matches ?? false;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setClearColor(new THREE.Color(PAL.fog), 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fog, 44, 205);

const camera = new THREE.PerspectiveCamera(46, 1, 0.25, 600);
camera.rotation.order = 'YXZ';

/* --------------------------------- light --------------------------------- */
const sun = new THREE.DirectionalLight(PAL.sun, 2.25);
sun.position.set(-52, 62, 56);
sun.castShadow = true;
sun.shadow.mapSize.set(COARSE ? 1024 : 2048, COARSE ? 1024 : 2048);
/** Half-width of the shadow cascade on the ground; the orbit view widens it. */
const SHADOW_HALF = COARSE ? 24 : 34;
sun.shadow.camera.left = -SHADOW_HALF;
sun.shadow.camera.right = SHADOW_HALF;
sun.shadow.camera.top = SHADOW_HALF;
sun.shadow.camera.bottom = -SHADOW_HALF;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun);
scene.add(sun.target);

// Cool bounce from the opposite quarter.  This carries most of the shadow
// side of every surface, so it is deliberately strong: an anime background
// has *coloured* shadows, not dark ones.
const fill = new THREE.DirectionalLight(PAL.fill, 1.08);
fill.position.set(48, 26, -44);
scene.add(fill);
scene.add(fill.target);

// a second, weaker bounce from below-front stops undersides going flat black
const bounce = new THREE.DirectionalLight(0xd8cbe8, 0.34);
bounce.position.set(10, -18, 40);
scene.add(bounce);
scene.add(bounce.target);

const hemi = new THREE.HemisphereLight(PAL.hemiSky, PAL.hemiGround, 1.12);
scene.add(hemi);

const sky = buildSky(scene, 500);

/* ------------------------------------------------------------------ *
 * Loading.
 *
 * Three phases with hand-set weights, because they cannot measure
 * themselves against each other: the models are a download and are all
 * network, the build is all main thread, and the warm-up is neither.  The
 * split below is roughly what they cost on this machine, and being a little
 * wrong only makes the bar move unevenly.
 * ------------------------------------------------------------------ */
const boot = createBoot();
const ASSETS_END = 0.18;
const BUILD_END = 0.93;

async function main() {
  /* Only the animals living where the player is standing are waited for.  The
   * other seventeen species are 2.4 MB that nobody is within forty metres of,
   * and they arrive on idle over the following few seconds -- see the note on
   * `idleQueue` in `petmodels.js`. */
  const library = createPetLibrary();
  await library.preload(EAGER, (f) => boot.progress(f * ASSETS_END, '動物たち'));

  const world = await buildWorld(scene, (f, label) => {
    boot.progress(ASSETS_END + f * (BUILD_END - ASSETS_END), label);
  });

  const player = new Player(camera, canvas, world);
  const VOLUME_STORAGE_KEY = 'sakura-crossing-volume';
  let initialVolume = 0.34;
  try {
    const savedValue = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (savedValue !== null) {
      const savedVolume = Number(savedValue);
      if (Number.isFinite(savedVolume)) initialVolume = Math.max(0, Math.min(1, savedVolume));
    }
  } catch { /* storage is optional; the game works without it */ }

  /* The collection, restored as a *record* rather than as a party: the
   * landmarks stay found, and the animals are back where they live.  Which is
   * the point -- it keeps the walk worth taking twice. */
  const COLLECTION_KEY = 'sakura-crossing-collection';
  const discovered = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(COLLECTION_KEY) || '{}');
    if (Array.isArray(saved.landmarks)) {
      const known = new Set(LANDMARKS.map((l) => l.id));
      for (const id of saved.landmarks) if (known.has(id)) discovered.add(id);
    }
  } catch { /* storage is optional; the game works without it */ }
  const rememberCollection = () => {
    try {
      localStorage.setItem(COLLECTION_KEY, JSON.stringify({ landmarks: [...discovered] }));
    } catch { /* optional */ }
  };

  const hud = createHud({ volume: initialVolume, landmarks: LANDMARKS });
  const music = createMusic({ volume: initialVolume, fadeIn: 3.0 });
  hud.setMuted(music.muted);
  const rememberVolume = () => {
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(music.volume)); } catch { /* optional */ }
  };

  hud.onVolumeChange = (value) => {
    hud.setMuted(music.setVolume(value));
    rememberVolume();
  };

  /* The one machine you can ride.  Built here rather than in `buildWorld`
   * because it is placed *after* the planet bake -- see the note in the file. */
  const ebike = createEbike({ scene, world, player, hud });

  /* Where an animal can take you, and how it gets there.  Built here because
   * it reads the finished world -- every collider and every surface -- and
   * nothing before the bake could answer it.  A third of a second, under the
   * bar rather than after it. */
  boot.progress(BUILD_END, 'しるべ');
  const nav = buildNavGraph(world);

  /* The animals, for the same reason and by the same rules: they move, so they
   * cannot be baked, so they are seated on the sphere by hand every frame. */
  const pets = createPets({
    scene, world, player, nav, library, discovered,
    onDiscover: (lm, first) => {
      hud.announce(lm, first);
      if (first) rememberCollection();
      refreshCollection();
    },
    onCompanion: () => refreshCollection(),
  });
  const refreshCollection = () => hud.setCollection(discovered, pets.companions);
  refreshCollection();

  /* 灰の雨 and the thing that breathes it.
   *
   * Two objects and one dependency: `cinderfall` owns the effect and the rule
   * about where a cinder may land; the dragon decides *when*, on its own clock,
   * with no input from anybody.  There is nothing to press.
   *
   * The model waits.  It is 1.5 MB for an animal a hundred metres north behind
   * a three-storey block, and putting that in front of the loading bar is four
   * seconds of nothing on a phone -- the same argument `petmodels.js` makes
   * about the far species, and the same answer: after the bar, on idle.  The
   * school is simply empty until it lands. */
  const cinder = createCinderfall({ scene, world, player, camera });
  let dragon = null;
  loadDragon().then((model) => {
    if (!model) return;
    dragon = createDragon({ scene, world, player, cinder, model });
  });

  // the plate on the east footway asks the HUD to say who made the place
  world.onReadPlate = () => hud.flash('Adapted by Man & Bot  ·  animals: Kenney Cube Pets (CC0)  ·  dragon by Double Pendu', 4200);

  /* Everything eagerly loaded is placed now, before anybody has moved.  The
   * rest arrive over the next few seconds and place themselves, subject to
   * the "not in front of you" rule in `pets.materialise`. */
  for (const key of EAGER) {
    const model = library.peek(key);
    if (model) pets.materialise(key, model);
  }
  library.idleQueue(SPECIES_KEYS.filter((k) => !EAGER.includes(k)),
    (key, model) => pets.materialise(key, model));

  player.onInteract = (target) => {
    // on the machine, E is the way off it, whatever you happen to be looking at
    if (ebike.riding) { ebike.dismount(); return; }
    if (!target) return;
    /* Anything offering more than one thing to say opens the card; anything
     * that does not behaves exactly as it always has, which is what leaves
     * the cat on the garden wall untouched. */
    const options = target.options;
    if (options?.length > 1) {
      hud.openChoice(target.label.replace(/\s*·.*$/, ''), options);
    } else {
      target.action?.();
    }
  };

  /* ------------------------------- pipeline ------------------------------- */
  const pipeline = new Pipeline(renderer, scene, camera,
    COARSE ? { pixelBudget: 2.1e6, maxScale: 1.25 } : {});

  /* The shadow map, on a budget.  It is a second pass over ten thousand
   * casters and it was redrawing all of them on every frame to recentre a
   * 68 m cascade by however far a walker moves in one -- 23 ms of a 78 ms
   * frame.  `createShadowBudget` redraws it when the snapped centre changes
   * cells and at least every few frames, which is what keeps the train's
   * shadow moving while the player stands still and watches it pass. */
  const shadows = createShadowBudget(renderer, sun, { snap: 2.0, maxIdleFrames: 2 });

  function resize() {
    /* `visualViewport` rather than `innerHeight` where there is one: on a
     * phone the address bar slides in and out over the page and `innerHeight`
     * reports the tallest the viewport ever gets, so the bottom strip of the
     * canvas spends its life underneath the browser's own furniture. */
    const vv = window.visualViewport;
    const w = Math.round(vv?.width ?? window.innerWidth);
    const h = Math.round(vv?.height ?? window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pipeline.setSize(w, h);
    setOutlineResolution(pipeline.size.x, pipeline.size.y);
  }
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  /* --------------------------------- loop --------------------------------- */
  const clock = new THREE.Clock();
  const shadowTarget = new THREE.Vector3();
  const fillTarget = new THREE.Vector3();
  const sunOffset = new THREE.Vector3();
  /** Sun direction, expressed in the player's local surface frame. */
  const SUN_LOCAL = new THREE.Vector3(-52, 62, 56);
  const FILL_LOCAL = new THREE.Vector3(48, 26, -44);
  const BOUNCE_LOCAL = new THREE.Vector3(10, -18, 40);

  /** Move a light so its direction stays fixed relative to the local surface. */
  function seatLight(light, local, basis, origin) {
    sunOffset.set(0, 0, 0)
      .addScaledVector(basis.east, local.x)
      .addScaledVector(basis.up, local.y)
      .addScaledVector(basis.north, local.z);
    light.target.position.copy(origin);
    light.position.copy(origin).add(sunOffset);
  }

  /* ------------------------------ planet view ------------------------------ */
  let planetView = false;
  let orbit = 0.6;
  const orbitDir = new THREE.Vector3();
  const savedFog = scene.fog;
  const savedFar = camera.far;

  function setPlanetView(on) {
    planetView = on;
    scene.fog = on ? null : savedFog;
    camera.far = on ? 1600 : savedFar;
    camera.updateProjectionMatrix();
    const s = sun.shadow.camera;
    const half = on ? R * 1.15 : SHADOW_HALF;
    s.left = -half; s.right = half; s.top = half; s.bottom = -half;
    s.far = on ? R * 6 : 200;
    s.updateProjectionMatrix();
    // the cascade just changed size by a factor of twenty; nothing in the
    // existing map is reusable
    shadows.invalidate();
    hud.setPlanetView(on);
  }

  /* ------------------------------- the verbs -------------------------------
   * Pulled out of the key handler because there are two sets of fingers on
   * them now: M and the ♪ button do the same thing, and there is no version
   * of "the same thing" that survives being written twice. */
  const act = {
    music() {
      const off = music.toggle();
      hud.setMuted(off);
      hud.setVolume(music.volume);
      rememberVolume();
      if (music.available) hud.flash(off ? '♪  music off' : '♪  music on');
    },
    /* V summons the e-bike.  The orbit view moved to P to make room for it --
     * it is a thing you look at once, and this is a thing you use. */
    ebike() {
      if (planetView) {
        setPlanetView(false);
        hud.flash('back on the ground');
      } else {
        ebike.toggle();
      }
    },
    planet() {
      setPlanetView(!planetView);
      hud.flash(planetView ? 'orbit view  ·  P to return' : 'back on the ground');
    },
    interact() {
      // with the card up, the button confirms rather than re-opening it
      if (hud.choiceOpen) { hud.choiceKey('KeyE'); return; }
      player.onInteract?.(player.hovered);
    },
    jump() {
      player.jump();
    },
  };

  /* The card gets first refusal, in the *capture* phase.
   *
   * Which is the only way round the ordering: `player.js` binds its own
   * keydown in the constructor, long before this file binds anything, so a
   * bubble-phase listener here sees `E` after the walker has already handled
   * it and re-opened the card that was about to be confirmed.  A capture
   * listener on `window` is the first thing in the document to see the key. */
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (hud.choiceKey(e.code)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyM') act.music();
    if (e.code === 'KeyV') act.ebike();
    if (e.code === 'KeyP') act.planet();
    // two quiet toggles, handy for seeing what the ink and grade passes do
    if (e.code === 'KeyO') pipeline.enabled.ink = !pipeline.enabled.ink;
    if (e.code === 'KeyG') pipeline.enabled.grade = !pipeline.enabled.grade;
  });

  /* ------------------------------ starting play ------------------------------
   * Two ways in, and the difference between them is the whole reason the pad
   * exists: a desktop takes the pointer, a phone cannot and turns on the
   * thumbstick instead.  Both start the music, because autoplay needs a
   * gesture and this tap is the one.
   */
  const touch = createTouchControls({
    onMove: (x, y, run) => player.setMove(x, y, run),
    onLook: (dx, dy) => player.look(dx, dy),
    onAction: (name) => {
      if (name === 'pause') { pause(); return; }
      act[name]?.();
    },
  });

  function pause() {
    if (touch.engaged) {
      touch.disengage();
      player.touchMode = false;
      player.setMove(0, 0, false);
      hud.setLocked(false);
    } else {
      document.exitPointerLock?.();
    }
  }

  hud.onStart = () => {
    music.start();
    if (touch.available) {
      /* Fullscreen is asked for and not insisted on: iOS does not offer it
       * to a web page at all, and the game is perfectly playable with an
       * address bar over the top of the sky. */
      document.documentElement.requestFullscreen?.().catch(() => {});
      player.touchMode = true;
      touch.engage();
      hud.setLocked(true);
    } else {
      player.lock();
    }
  };

  player.onLockChange = (locked) => hud.setLocked(locked);
  canvas.addEventListener('click', () => {
    if (touch.available) return;   // a tap is a look drag, not a request to lock
    music.start();
    if (!player.locked) player.lock();
  });

  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 20);

    player.update(dt);
    ebike.update(dt);
    pets.update(dt);
    dragon?.update(dt);
    /* The camera goes in because every flame in there is a billboard and the
     * ember cloud is two hundred of them: the effect cannot place a single
     * quad without knowing where it is being looked at from. */
    cinder.update(dt, camera);
    world.update(dt);

    if (planetView) {
      orbit += dt * 0.09;
      // biased toward +Y so the district (which sits at the flat origin, the
      // top of the globe) stays in view while the camera drifts around it
      orbitDir.set(Math.sin(orbit) * 0.8, 1.0, Math.cos(orbit) * 0.8).normalize();
      camera.position.copy(CENTER).addScaledVector(orbitDir, R * 3.3);
      camera.up.set(0, 1, 0);
      camera.lookAt(CENTER);
      // a fixed sun so the whole globe is lit coherently from outside
      sun.target.position.copy(CENTER);
      sun.position.copy(CENTER).add(new THREE.Vector3(-1.05, 0.95, 0.75).multiplyScalar(R * 2.2));
      hemi.position.set(0, 1, 0);
      seatLight(fill, FILL_LOCAL, { east: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), north: new THREE.Vector3(0, 0, 1) }, CENTER);
      bounce.visible = false;
      shadows.update(CENTER);
    } else {
      bounce.visible = true;
      // Lighting is pinned to the local surface frame rather than to world
      // space: physically a cheat, but it keeps the district lit the same way
      // no matter how far round the planet you have walked.
      const b = basisAt(player.pos.x, player.pos.z);
      /* Snapped, at last.  The cascade centre is quantised to a 2 m grid in
       * authoring coordinates, which is both what stops the cast shadows
       * shimmering as you walk (the comment at the top of this file has
       * claimed it for a long time; the code did not do it) and what gives
       * the shadow budget something discrete to notice. */
      const snap = shadows.snap;
      const sx = Math.round(player.pos.x / snap) * snap;
      const sz = Math.round(player.pos.z / snap) * snap;
      positionAt(sx, 0, sz, shadowTarget);
      seatLight(sun, SUN_LOCAL, b, shadowTarget);
      /* The fill and the bounce cast nothing, so they can stay on the player
       * rather than on the grid. */
      positionAt(player.pos.x, 0, player.pos.z, fillTarget);
      seatLight(fill, FILL_LOCAL, b, fillTarget);
      seatLight(bounce, BOUNCE_LOCAL, b, fillTarget);
      hemi.position.copy(b.up);
      shadows.update(shadowTarget);
    }

    // the sky dome is centred on the flat origin, so it has to trail the camera
    sky.dome.position.copy(camera.position);
    sky.clouds.position.copy(camera.position);

    const hovered = !planetView && player.active ? player.pick(world.interactables) : null;
    hud.setPrompt(hovered ? `E  ·  ${hovered.label.replace(/^.*?·\s*/, '')}` : '');
    touch.setActionable(hovered || ebike.riding);
    hud.update(dt, player.active);
    // flat authoring coordinates, so what the readout says is what the code uses
    hud.setCoords(player.pos, player.yaw, player.pitch, dt);

    pipeline.render();
    requestAnimationFrame(frame);
  }

  /* Warm the shaders before the loader comes down.
   *
   * Every material in the scene compiles on the first frame it is visible, and
   * the first thirty seconds of walking used to hitch every time the view
   * turned onto something new.  `compileAsync` pays all of it here, where there
   * is already a progress bar to pay it under. */
  boot.progress(BUILD_END, 'シェーダー');
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  boot.done();

  frame();

  // expose a little for tuning from the console
  window.__scene = { scene, camera, renderer, pipeline, world, player, ebike, pets, cinder, get dragon() { return dragon; }, nav, library, discovered, music, hud, sun, fill, bounce, hemi, THREE };
  window.__setOutlineRes = setOutlineResolution;

  if (import.meta.env?.DEV) {
    /* Watch for a prop the build froze that something still animates -- the
     * failure is silent and looks like nothing at all, so it is worth a timer.
     * Two samples: one soon, for anything driven continuously, and one after
     * the train has been round and the gates have worked. */
    const audit = createFreezeAudit(world.perfStats?.freeze?.roots);
    const report = () => {
      const moved = audit.check();
      if (!moved.length) return;
      console.warn(`perf: ${moved.length} frozen object(s) are being animated and `
        + 'will not move on screen. Mark them `userData.noFreeze = true` (a prop) '
        + 'or `userData.planetRigid = true` (a rig):',
      moved.slice(0, 12).map((o) => o.name || `${o.type} in ${o.parent?.name || '?'}`));
    };
    setTimeout(report, 6000);
    setTimeout(report, 45000);

    /**
     * Dev capture: render one frame at a fixed size and post it to the dev
     * server, so framing and colour can be reviewed outside the browser.
     */
    window.__shot = async (name = 'shot', W = 1600, H = 900, opts = {}) => {
      if (opts.pos) player.pos.set(opts.pos[0], player.pos.y, opts.pos[2]);
      if (opts.y !== undefined) player.pos.y = opts.y;
      if (opts.yaw !== undefined) player.yaw = opts.yaw;
      if (opts.pitch !== undefined) player.pitch = opts.pitch;
      if (opts.orbit !== undefined) {
        // external view of the whole planet
        if (!planetView) setPlanetView(true);
        orbit = opts.orbit;
        orbitDir.set(Math.sin(orbit) * (opts.tilt ?? 0.8), 1.0, Math.cos(orbit) * (opts.tilt ?? 0.8)).normalize();
        camera.position.copy(CENTER).addScaledVector(orbitDir, R * (opts.dist ?? 3.3));
        camera.up.set(0, 1, 0);
        camera.lookAt(CENTER);
        sun.target.position.copy(CENTER);
        sun.position.copy(CENTER).add(new THREE.Vector3(-1.05, 0.95, 0.75).multiplyScalar(R * 2.2));
        hemi.position.set(0, 1, 0);
        bounce.visible = false;
      } else {
        if (planetView) setPlanetView(false);
        bounce.visible = true;
        // always resync the camera: the rAF loop is throttled when the page is
        // not compositing, so the camera cannot be assumed to match the player
        player.pos.y = world.heightAt(player.pos.x, player.pos.z);
        player.bob = 0;
        player.applyCamera(0);
      }
      /* The shadow map is on a budget in the loop and a capture is not in the
       * loop, so ask for one explicitly rather than shooting whatever cascade
       * the last real frame happened to leave behind. */
      shadows.invalidate();
      renderer.shadowMap.needsUpdate = true;
      sun.shadow.needsUpdate = true;
      if (opts.ink !== undefined) pipeline.enabled.ink = opts.ink;
      if (opts.grade !== undefined) pipeline.enabled.grade = opts.grade;
      pipeline.forceScale = opts.scale || 1;

      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      pipeline.setSize(W, H);
      setOutlineResolution(pipeline.size.x, pipeline.size.y);
      if (opts.orbit === undefined) {
        const b = basisAt(player.pos.x, player.pos.z);
        positionAt(player.pos.x, 0, player.pos.z, shadowTarget);
        seatLight(sun, SUN_LOCAL, b, shadowTarget);
        seatLight(fill, FILL_LOCAL, b, shadowTarget);
        seatLight(bounce, BOUNCE_LOCAL, b, shadowTarget);
        hemi.position.copy(b.up);
      }
      // in orbit the dome stays put so its gradient reads as a real sky
      if (!planetView) {
        sky.dome.position.copy(camera.position);
        sky.clouds.position.copy(camera.position);
      } else {
        sky.dome.position.set(0, 0, 0);
        sky.clouds.position.set(0, 0, 0);
      }
      pipeline.render();

      const off = document.createElement('canvas');
      const outW = opts.outW || W;
      off.width = outW;
      off.height = Math.round((outW * H) / W);
      off.getContext('2d').drawImage(canvas, 0, 0, off.width, off.height);
      const data = off.toDataURL('image/jpeg', opts.quality || 0.86);
      const r = await fetch('/__shot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, data }),
      });
      return r.json();
    };
  }
}

/* A failed build is a bar stuck at 60 %, which looks exactly like a slow
 * machine.  Say what happened on the loader instead. */
main().catch((err) => boot.fail(err));
