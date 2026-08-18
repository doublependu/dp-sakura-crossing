import { launchChrome, attach, sleep } from './cdp.mjs';

const URL = process.argv[2] ?? 'http://localhost:5178/';
const W = 1280, H = 720;

const { proc, port } = await launchChrome({ width: W, height: H });
const cdp = await attach(port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: W, height: H, deviceScaleFactor: 1, mobile: false,
});
cdp.on('Runtime.consoleAPICalled', (p) => {
  if (p.type === 'error' || p.type === 'warning') {
    console.log('  [page]', p.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200));
  }
});

console.log('navigating to', URL);
const t0 = Date.now();
await cdp.send('Page.navigate', { url: URL });

for (let i = 0; ; i++) {
  await sleep(500);
  const ready = await cdp.evaluate('!!window.__scene');
  if (ready) break;
  if (i > 120) throw new Error('__scene never appeared');
}
console.log(`__scene up after ${((Date.now() - t0) / 1000).toFixed(1)}s`);

console.log(await cdp.evaluate(`(() => {
  const gl = window.__scene.renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    canvas: [window.__scene.renderer.domElement.width, window.__scene.renderer.domElement.height],
    pixelRatio: window.devicePixelRatio,
    dragon: !!window.__scene.dragon,
    pets: window.__scene.pets.count,
  };
})()`));

// how fast does the page render on its own?
const fps = await cdp.evaluate(`new Promise((res) => {
  let n = 0; const t = performance.now();
  const tick = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(tick);
    else res(+(n / ((performance.now() - t) / 1000)).toFixed(1)); };
  requestAnimationFrame(tick);
})`);
console.log('free-running fps:', fps);

// how fast is a capture?
for (const format of ['jpeg', 'png']) {
  const t = Date.now();
  const N = 20;
  let bytes = 0;
  for (let i = 0; i < N; i++) {
    const r = await cdp.send('Page.captureScreenshot', { format, quality: 92, optimizeForSpeed: true });
    bytes += r.data.length;
  }
  console.log(`${format}: ${((Date.now() - t) / N).toFixed(1)} ms/frame, ${(bytes / N / 1024 * 0.75).toFixed(0)} KB/frame`);
}

cdp.close();
proc.kill();
