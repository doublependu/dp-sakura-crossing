import { launchChrome, attach, sleep } from './cdp.mjs';
const URL = process.argv[2] ?? 'http://localhost:5178/';
const W = +(process.argv[3] ?? 1920), H = +(process.argv[4] ?? 1080);

const { proc, port } = await launchChrome({ width: W, height: H });
const cdp = await attach(port);
await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cdp.send('Page.navigate', { url: URL });
for (let i = 0; ; i++) { await sleep(500); if (await cdp.evaluate('!!window.__scene')) break; if (i > 120) throw new Error('no scene'); }
await sleep(6000);   // let the idle-loaded models (dragon, far pets) arrive

const fps = await cdp.evaluate(`new Promise((res) => { let n=0; const t=performance.now();
  const tick=()=>{n++; if(performance.now()-t<2000) requestAnimationFrame(tick); else res(+(n/((performance.now()-t)/1000)).toFixed(1));};
  requestAnimationFrame(tick); })`);
const t = Date.now();
for (let i = 0; i < 10; i++) await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
console.log(`${W}x${H}: free fps ${fps}, capture ${((Date.now() - t) / 10).toFixed(0)} ms/frame`);
console.log('canvas', await cdp.evaluate('[__scene.renderer.domElement.width, __scene.renderer.domElement.height]'));

console.log('--- world ---');
console.log(JSON.stringify(await cdp.evaluate(`(() => {
  const s = window.__scene;
  return {
    bounds: s.world.bounds,
    playerStart: { x: +s.player.pos.x.toFixed(1), z: +s.player.pos.z.toFixed(1), yaw: +s.player.yaw.toFixed(2) },
    dragon: s.dragon?.debug ?? null,
    petCount: s.pets.count, pending: s.pets.pending,
    petsNear: s.pets.pets.slice(0, 60).map((p) => ({ n: p.spec?.name, x: +p.x?.toFixed(1), z: +p.z?.toFixed(1), st: p.state })),
    interactables: s.world.interactables.map((i) => ({ l: i.label, x: +(i.hitbox?.x ?? i.x ?? 0).toFixed(1), z: +(i.hitbox?.z ?? i.z ?? 0).toFixed(1) })).slice(0, 80),
    nav: s.nav ? Object.keys(s.nav) : null,
    library: s.library ? Object.keys(s.library) : null,
  };
})()`), null, 1).slice(0, 6000));

cdp.close(); proc.kill();
