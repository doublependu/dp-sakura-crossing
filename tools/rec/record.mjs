/* ===========================================================================
 * Record the director's fifteen minutes to an .mp4.
 *
 * One simulation step per encoded frame, driven from here rather than by the
 * browser's clock: the page's rAF queue is drained by hand and `getDelta` is
 * pinned, so thirty steps make exactly one second of film however long the
 * machine takes over it.  See `CLAUDE/CLAUDE_0.md` -- and note the warning
 * there about `MediaRecorder`, which is why the frames go to ffmpeg instead.
 *
 *   node tools/rec/record.mjs [--url U] [--out F] [--fps 30] [--w 1920] [--h 1080]
 *                             [--dry] [--seconds N] [--from N]
 * ======================================================================== */
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { launchChrome, attach, sleep } from './cdp.mjs';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 ? dflt : argv[i + 1];
};
const flag = (name) => argv.includes(`--${name}`);

const URL_ = arg('url', 'http://localhost:5179/');
const FPS = +arg('fps', 30);
const W = +arg('w', 1920), H = +arg('h', 1080);
const OUT = arg('out', '.shots/sakura-crossing-15min.mp4');
const AUDIO = arg('audio', 'public/audio/bfcmusic-divine-sakura-garden-fairytale-music-283353.mp3');
const DRY = flag('dry');
const FAST = flag('fast');
const WARP = +arg('warp', 0);   // simulate the first N seconds of film without drawing them   // simulate without rendering: route debugging, seconds not minutes
const STILL_EVERY = +arg('still', DRY ? 5 : 30);          // seconds of film per still
const DIR = arg('stills', '/tmp/sakura-rec-stills');
const LOG = arg('log', '/tmp/sakura-rec.log');
const DT = 1 / FPS;

const say = (...a) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${a.join(' ')}`;
  console.log(line);
  try { appendFileSync(LOG, line + '\n'); } catch { /* best effort */ }
};

mkdirSync(DIR, { recursive: true });

/* ------------------------------- the browser ------------------------------- */
const { proc, port } = await launchChrome({ width: W, height: H });
const cdp = await attach(port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 1, mobile: false,
});
cdp.on('Runtime.exceptionThrown', (p) =>
  say('  page error:', (p.exceptionDetails.exception?.description || p.exceptionDetails.text || '').slice(0, 300)));

say('loading', URL_, `at ${W}x${H}`);
await cdp.send('Page.navigate', { url: URL_ });
for (let i = 0; ; i++) {
  await sleep(500);
  if (await cdp.evaluate('!!window.__scene')) break;
  if (i > 180) throw new Error('__scene never appeared');
}
// the dragon and the far pets arrive on idle, seconds after the bar comes down
for (let i = 0; ; i++) {
  await sleep(1000);
  if (await cdp.evaluate('!!window.__scene.dragon && window.__scene.pets.count > 30')) break;
  if (i > 60) { say('warning: dragon or pets never arrived'); break; }
}
say('scene ready:', JSON.stringify(await cdp.evaluate(
  '({ pets: __scene.pets.count, dragon: !!__scene.dragon, canvas: [__scene.renderer.domElement.width, __scene.renderer.domElement.height] })')));

/* ------------------------------- the harness -------------------------------
 * Three things, in this order: take the walk off the pause screen, put the
 * page's timers on the film's clock, and take the frame loop away from the
 * browser.  After this nothing in the page moves until `__frame()` is called.
 */
await cdp.evaluate(`(() => {
  const s = window.__scene;
  const DT = ${DT};

  // 1. playing, not paused -- pointer lock is not available to a headless page
  s.player.locked = true;
  s.player.touchMode = false;
  s.hud.setLocked(true);

  // 2. the page's timers, on the film's clock.  Without this a toast that is
  //    meant to hold for 1.4 s holds for 1.4 s of *wall* time -- twelve frames
  //    of film -- and the choice card shuts before it can be read.
  const realTimeout = window.setTimeout.bind(window);
  let vnow = 0, seq = 1;
  const timers = new Map();
  window.setTimeout = (fn, ms = 0) => {
    const id = seq++;
    timers.set(id, { at: vnow + Math.max(0, ms) / 1000, fn, every: 0 });
    return id;
  };
  window.setInterval = (fn, ms = 0) => {
    const id = seq++;
    const p = Math.max(1, ms) / 1000;
    timers.set(id, { at: vnow + p, fn, every: p });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => timers.delete(id);
  window.__pumpTimers = (dt) => {
    vnow += dt;
    for (const [id, t] of [...timers]) {
      if (t.at > vnow) continue;
      if (t.every) t.at += t.every; else timers.delete(id);
      try { t.fn(); } catch (e) { console.warn('timer', e); }
    }
  };

  // 3. the frame loop, by hand
  const queue = [];
  window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
  window.cancelAnimationFrame = () => {};
  let vt = 0;
  window.__frame = () => {
    vt += DT * 1000;
    const due = queue.splice(0, queue.length);
    for (const cb of due) {
      try { cb(vt); } catch (e) { console.warn('frame', e); }
    }
    return due.length;
  };

  // 4. one fixed step per frame, whatever the wall clock says
  s.THREE.Clock.prototype.getDelta = () => DT;

  /* 5. the same step with no picture: everything main's frame loop drives,
   *    minus the render and the lighting.  A route that goes wrong takes eight
   *    minutes to find at thirty rendered frames a second and about fifteen
   *    seconds like this. */
  window.__simstep = (dt) => {
    s.player.update(dt);
    s.ebike.update(dt);
    s.pets.update(dt);
    s.dragon?.update(dt);
    s.cinder.update(dt, s.camera);
    s.world.update(dt);
    if (s.player.active && !(s.dragon?.riding)) s.player.pick(s.world.interactables);
    else s.player.hovered = null;
  };
  return true;
})()`);

// the loop's own pending callback is still with the browser: let it land in the
// queue before anything is stepped by hand
await sleep(400);
say('harness installed, queued callbacks:', await cdp.evaluate('window.__frame()'));

await cdp.evaluate(readFileSync(new URL('./director.js', import.meta.url), 'utf8'));
const plan = await cdp.evaluate('__director.plan');
say(`director: ${plan.length} beats, ${(await cdp.evaluate('__director.total'))} s`);

/* ------------------------------- route probe -------------------------------
 * `--walk "x,z>tx,tz[>tx,tz...]"` drives the walker alone, with no film around
 * it, and says whether it got there.  Twenty seconds a route instead of forty
 * minutes and a lost recording. */
const WALK = arg('walk', null);
if (WALK) {
  const pts = WALK.split('>').map((p) => p.split(',').map(Number));
  const [from, ...to] = pts;
  await cdp.evaluate(`(() => {
    __director.dev.place(${from[0]}, ${from[1]});
    __director.dev.goVia(${JSON.stringify(to)}, 2.4);
  })()`);
  const LIMIT = +arg('limit', 150);
  for (let i = 0; i < LIMIT * FPS; i += 15) {
    await cdp.evaluate(`(() => { for (let k = 0; k < 15; k++) {`
      + ` window.__pumpTimers(${DT}); __director.dev.walkStep(${DT}); window.__simstep(${DT}); } })()`);
    if (i % (FPS * 10) < 15) {
      const at = await cdp.evaluate('__director.dev.at()');
      say('    ' + JSON.stringify(await cdp.evaluate('__director.dev.dbg()')));
      const goal = to[to.length - 1];
      const d = Math.hypot(at[0] - goal[0], at[1] - goal[1]);
      say(`  ${(i / FPS).toFixed(0)}s at (${at}) ${d.toFixed(1)} m to go`);
      if (d < 4) { say('ARRIVED'); break; }
    }
  }
  cdp.close();
  proc.kill();
  process.exit(0);
}

/* --------------------------------- ffmpeg --------------------------------- */
const SECONDS = +arg('seconds', await cdp.evaluate('__director.total'));
const FRAMES = Math.round(SECONDS * FPS);
/* The picture is encoded on its own and the music is laid over it afterwards,
 * rather than muxed in one pass.  Two reasons, and the second is the real one:
 * a re-mux is seconds where a re-record is forty minutes, and the track this
 * game ships is stock music that the repository's own licence note excludes --
 * so the silent master is the one that is unambiguously the project's, and the
 * scored version is a copy anyone can re-make, replace or drop. */
const SILENT = OUT.replace(/\.mp4$/, '') + '-silent.mp4';
let ff = null;
if (!DRY) {
  mkdirSync(OUT.replace(/\/[^/]*$/, '') || '.', { recursive: true });
  ff = spawn('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-an', '-movflags', '+faststart',
    SILENT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('exit', (c) => say('ffmpeg exited', c));
}

const write = (buf) => new Promise((res) => {
  if (ff.stdin.write(buf)) res();
  else ff.stdin.once('drain', res);
});

/* ------------------------------- the recording ------------------------------- */
say(`recording ${FRAMES} frames (${(SECONDS / 60).toFixed(2)} min of film)`);
const t0 = Date.now();
let lastSay = 0;

for (let f = 0; f < FRAMES; ) {
  const warping = f < WARP * FPS;
  const step = (FAST || warping) ? 'window.__simstep' : 'window.__frame';
  const batch = (FAST || warping) ? 15 : 1;   // a round trip per call, so bunch them
  await cdp.evaluate(`(() => { for (let i = 0; i < ${batch}; i++) {`
    + ` window.__pumpTimers(${DT}); __director.tick(${DT}); ${step}(${DT}); } })()`);
  f += batch;
  if (warping) continue;

  if (!DRY) {
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 95, optimizeForSpeed: true,
    });
    await write(Buffer.from(shot.data, 'base64'));
  }

  const filmT = f / FPS;
  if (!FAST && STILL_EVERY && f % Math.round(STILL_EVERY * FPS) === 0) {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, optimizeForSpeed: true });
    writeFileSync(`${DIR}/${String(Math.round(filmT)).padStart(4, '0')}.jpg`, Buffer.from(shot.data, 'base64'));
  }

  if (Date.now() - lastSay > (FAST ? 4000 : 20000)) {
    lastSay = Date.now();
    const st = await cdp.evaluate('__director.state()');
    const done = (f + 1) / FRAMES;
    const eta = ((Date.now() - t0) / done * (1 - done)) / 60000;
    say(`${(done * 100).toFixed(1)}%  film ${(filmT / 60).toFixed(2)}min  eta ${eta.toFixed(0)}min  ${JSON.stringify(st)}`);
  }
}

if (FAST) for (const l of await cdp.evaluate('__director.film')) say('  ' + l);
say('trace: ' + JSON.stringify(await cdp.evaluate('__director.trace')));
say('done stepping; closing the encoder');
if (ff) {
  ff.stdin.end();
  await new Promise((res) => ff.on('exit', res));
}
cdp.close();
proc.kill();

if (!DRY && AUDIO && existsSync(AUDIO)) {
  const fade = Math.max(0, SECONDS - 6);
  say('laying the music over it');
  const r = spawnSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', SILENT,
    '-stream_loop', '-1', '-i', AUDIO,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-af', `volume=0.5,afade=t=in:st=0:d=3,afade=t=out:st=${fade}:d=6`,
    '-shortest', '-movflags', '+faststart',
    OUT,
  ], { stdio: 'inherit' });
  say('mux exited', r.status);
}
say(`finished in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
