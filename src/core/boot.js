/* ------------------------------------------------------------------ *
 * The loading screen.
 *
 * The markup is in `index.html`, not here, and that is the whole design:
 * this module is loaded by the same script tag that pulls in three.js and
 * the forty world builders, so anything it *creates* appears only after the
 * wait it is meant to cover has already started.  What is in the document
 * paints on the first frame; this only drives it.
 *
 * The bar is monotonic on purpose.  Progress arrives from three sources with
 * different ideas of their own weight -- model downloads, the world build,
 * the shader warm-up -- and a bar that goes backwards reads as a fault even
 * when the number that caused it was the more accurate one.
 * ------------------------------------------------------------------ */

export function createBoot() {
  const root = document.getElementById('boot');
  const fill = document.getElementById('boot-fill');
  const label = document.getElementById('boot-label');
  const pct = document.getElementById('boot-pct');
  // the page can be opened with the loader stripped out; do not take it down
  if (!root) return { progress() {}, done() {}, fail() {}, present: false };

  let shown = 0;

  const api = {
    present: true,
    /**
     * @param fraction  0..1, clamped and never allowed to fall
     * @param text      what is being built, shown as-is
     */
    progress(fraction, text) {
      const f = Math.max(shown, Math.min(1, Math.max(0, fraction || 0)));
      shown = f;
      fill.style.width = `${(f * 100).toFixed(1)}%`;
      pct.value = pct.textContent = `${Math.round(f * 100)}%`;
      if (text !== undefined && text !== null && text !== '') label.textContent = text;
    },
    /** Fade it out.  Removed from the tree afterwards so it cannot take clicks. */
    done() {
      api.progress(1);
      root.classList.add('gone');
      setTimeout(() => root.remove(), 700);
    },
    /**
     * Stop on an error rather than leaving a bar sitting at 60 % forever.
     * The message is shown because the alternative -- a silent freeze -- is
     * indistinguishable from a slow phone.
     */
    fail(err) {
      root.classList.add('failed');
      label.textContent = String(err?.message || err || 'load failed');
      pct.value = pct.textContent = '×';
      console.error(err);
    },
  };
  return api;
}
