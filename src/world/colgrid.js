import { CIRCUMFERENCE, wrapX } from './planet.js';

/* ------------------------------------------------------------------ *
 * A spatial index over `world.colliders`.
 *
 * `world.colliders` is one flat array, and everything that has ever asked it
 * a question -- the player's `_resolve`, the e-bike's summon search -- has
 * walked the whole thing.  That was fine while the askers were one walker
 * and one scooter.  It stopped being fine here: thirty-odd animals fire
 * three obstacle probes each per frame, and the landmark graph tests forty
 * thousand points along its candidate edges at startup, both against a list
 * that forty district builders have been pushing onto since the crossing was
 * the whole world.
 *
 * So the boxes go into a uniform grid once, after the build, and a probe
 * visits the dozen boxes that could possibly contain it instead of all of
 * them.  Nothing in the world mutates a collider's extents after the build
 * (the crossing's boom blocks move their `top`, which is a field this index
 * does not sort on), so it can be built once and trusted.
 *
 * x wraps and z does not, which is the same asymmetry every other file here
 * lives with: the column index is taken modulo the circumference, the row
 * index is clamped into the world's latitude bounds.
 * ------------------------------------------------------------------ */

/** Grid pitch, in metres.  Most colliders here are a house or smaller. */
const CELL = 4;
const COLS = Math.ceil(CIRCUMFERENCE / CELL);

export function buildColliderGrid(colliders, bounds) {
  const z0 = bounds?.z0 ?? -CIRCUMFERENCE * 0.25;
  const z1 = bounds?.z1 ?? CIRCUMFERENCE * 0.25;
  const rows = Math.max(1, Math.ceil((z1 - z0) / CELL) + 1);

  const col = (x) => ((Math.floor(wrapX(x) / CELL) % COLS) + COLS) % COLS;
  const row = (z) => Math.min(rows - 1, Math.max(0, Math.floor((z - z0) / CELL)));

  /** Sparse: most of a 250 x 250 grid over a planet is empty ground. */
  const cells = new Map();
  const key = (c, r) => r * COLS + c;

  const push = (c, r, box) => {
    const k = key(c, r);
    let bucket = cells.get(k);
    if (!bucket) cells.set(k, (bucket = []));
    bucket.push(box);
  };

  let spans = 0;
  for (const b of colliders) {
    const r0 = row(b.z0), r1 = row(b.z1);
    /* A box that straddles the seam has a start column greater than its end
     * column.  Rather than special-case it, walk forward from the start and
     * let the column index wrap -- the count is what matters, not the bound. */
    const c0 = col(b.x0);
    const nCols = Math.min(COLS, Math.floor((b.x1 - b.x0) / CELL) + 2);
    for (let r = r0; r <= r1; r++) {
      for (let i = 0; i < nCols; i++) {
        push((c0 + i) % COLS, r, b);
        spans++;
      }
    }
  }

  const _seen = new Set();

  /* Colliders that arrived after the index was built.
   *
   * There is exactly one source of them today -- `ebike.js` pushes a box when
   * the machine is parked and splices it out when it is ridden -- and one is
   * enough to matter: a bicycle-sized hole in the index is a hole a cat walks
   * through in full view.  Rather than making the grid mutable for a single
   * client, anything not in the original set is kept in a short list that
   * every query also walks, and the list is only recomputed when the array's
   * length changes.  A length comparison per query is nothing; a rescan on
   * summon is nothing either, because summoning is a keypress. */
  const indexed = new Set(colliders);
  let extras = [];
  let seenLen = colliders.length;
  const sync = () => {
    if (colliders.length === seenLen) return;
    seenLen = colliders.length;
    extras = colliders.filter((b) => !indexed.has(b));
  };

  return {
    cells,
    count: colliders.length,
    get dynamic() { return extras.length; },
    /** How many (cell, box) pairs the index holds -- a fanout sanity check. */
    spans,

    /**
     * Every collider that could overlap the square of half-width `r` about a
     * point, handed to `fn` one at a time.  Return `true` from `fn` to stop --
     * `each` returns whatever the last call returned, so a "is anything in the
     * way" test is one call and stops at the first wall rather than counting
     * them all.
     *
     * A callback rather than an array because this runs several thousand times
     * a second and the array would be garbage every time.  Boxes that span
     * more than one cell are visited more than once, so the dedupe set is not
     * optional -- a house counted four times is a probe doing four times the
     * work and, in a push-out, a displacement applied four times.
     */
    each(x, z, r, fn) {
      sync();
      for (const b of extras) if (fn(b) === true) return true;
      const cA = col(x - r), cB = col(x + r);
      const rA = row(z - r), rB = row(z + r);
      // as above: walk forward from the low column so the seam takes care of
      // itself, and never more than the whole ring
      const nCols = Math.min(COLS, ((cB - cA + COLS) % COLS) + 1);
      _seen.clear();
      for (let rr = rA; rr <= rB; rr++) {
        for (let i = 0; i < nCols; i++) {
          const bucket = cells.get(key((cA + i) % COLS, rr));
          if (!bucket) continue;
          for (const b of bucket) {
            if (_seen.has(b)) continue;
            _seen.add(b);
            if (fn(b) === true) return true;
          }
        }
      }
      return false;
    },
  };
}
