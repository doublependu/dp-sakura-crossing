/**
 * The smallest DevTools-protocol client that will drive a recording.
 *
 * Node 24 has a global `WebSocket`, so this needs nothing installed -- which is
 * the whole reason the recording loop in `CLAUDE/CLAUDE_0.md` is written against
 * Chrome rather than against a browser-automation library.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchChrome({ port = 9222, width = 1280, height = 720, gpu = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'sakura-rec-'));
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--window-size=${width},${height}`,
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check',
    '--disable-gpu-vsync', '--disable-frame-rate-limit',
    '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars',
    'about:blank',
  ];
  if (!gpu) args.unshift('--enable-unsafe-swiftshader');
  else args.unshift('--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=gl-egl');
  const proc = spawn('google-chrome', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', (b) => { stderr += b; });
  for (let i = 0; i < 100; i++) {
    await sleep(150);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return { proc, port, profile };
    } catch { /* not up yet */ }
    if (proc.exitCode !== null) throw new Error(`chrome exited: ${stderr.slice(-800)}`);
  }
  throw new Error(`chrome did not open a debugging port: ${stderr.slice(-800)}`);
}

export async function attach(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id !== undefined) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (!p) return;
      if (msg.error) p.rej(new Error(`${p.method}: ${msg.error.message}`));
      else p.res(msg.result);
    } else {
      for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
    }
  });

  const send = (method, params = {}) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej, method });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
    return () => {
      const a = listeners.get(method);
      a.splice(a.indexOf(fn), 1);
    };
  };

  /** Run an expression in the page and get the value back, throwing on throw. */
  const evaluate = async (expression, { awaitPromise = true } = {}) => {
    const r = await send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise, allowUnsafeEvalBlockedByCSP: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`page: ${d.exception?.description || d.text}`);
    }
    return r.result.value;
  };

  return { send, on, evaluate, close: () => ws.close() };
}

export { sleep };
