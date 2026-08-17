import { wrapX, wrapDelta } from './planet.js';

/* ------------------------------------------------------------------ *
 * しるべ -- the landmarks, and the graph that gets an animal to one.
 *
 * Two things live here, and they are the same subject seen twice.
 *
 * **The landmarks** are the thirty-nine places in this world worth arriving at.
 * Every coordinate below is a *documented camera position* out of
 * `CLAUDE_0.md` -- the establishing shot of some district -- which is the
 * same reason the pets' home anchors came from that list: a hand-picked
 * coordinate in a world built by forty modules is a coin flip between a
 * pavement and the inside of a wall, and these are places somebody has
 * already stood and photographed.  They are checked again at startup anyway.
 *
 * **The graph** exists because the animals steer rather than navigate.  A
 * reactive steerer crosses a suburb about as well as you would expect: it
 * finds the first wall, slides along it, and stops.  An animal that has
 * offered to take you somewhere and instead vibrates against a fence is
 * worse than no feature at all -- so the route is planned over a graph, and
 * the steering is left to do what it is good at, which is the last two
 * metres.
 *
 * The edges are **derived, not authored**.  Every pair of nodes within reach
 * is tested by walking the straight line between them half a metre at a time
 * and asking the world the same two questions a pet asks every frame: is there
 * room, and is the step up too big.  Hand-authored edges would be a second
 * copy of the town's layout, kept in step with forty builders by memory.
 * ------------------------------------------------------------------ */

/**
 * The collection.
 *
 * `r` is the arrival radius -- how close both the animal and the player have
 * to get before the place counts as found.  Big enough that a plaza is
 * arrived at rather than aimed for, small enough that walking past the end of
 * a street does not tick it off.
 */
export const LANDMARKS = [
  /* ------------------------------ the town ------------------------------ */
  { id: 'crossing',   jp: '桜踏切',           en: 'Sakura Crossing',      x: 1.8,   z: 4.6,    r: 8 },
  { id: 'backalley',  jp: 'さくら坂裏路地',   en: 'Sakurazaka Back Lane', x: 13.5,  z: 16.6,   r: 6 },
  { id: 'rest',       jp: '自販機の休み処',   en: 'The Vending Corner',   x: 12.9,  z: 9.6,    r: 6 },
  { id: 'shotengai',  jp: 'さくら坂商店街',   en: 'Sakurazaka Shops',     x: 22.2,  z: 20.0,   r: 9 },
  { id: 'showa',      jp: 'レコードと電器',   en: 'Records & Electrics',  x: 22.2,  z: 34.2,   r: 7 },
  { id: 'park',       jp: '児童公園',         en: 'The Playground',       x: 33.0,  z: 28.0,   r: 9 },
  { id: 'library',    jp: 'ひばり台図書館',   en: 'Hibaridai Library',    x: 13.4,  z: 44.4,   r: 9 },
  { id: 'busstop',    jp: '図書館前バス停',   en: 'Library Bus Stop',     x: -4.0,  z: 33.0,   r: 6 },
  { id: 'overbridge', jp: '跨線橋',           en: 'The Footbridge',       x: 41.0,  z: 20.5,   r: 7 },
  { id: 'shrine',     jp: '桜守神社',         en: 'Sakuramori Shrine',    x: -27.9, z: 28.0,   r: 9 },
  { id: 'matsuri',    jp: '夏まつりの広場',   en: 'The Festival Ground',  x: -30.6, z: 18.4,   r: 8 },
  { id: 'onsen',      jp: '湯の坂の足湯',     en: 'Yunosaka Footbath',    x: -36.4, z: 49.6,   r: 8 },
  { id: 'uramachi',   jp: '桜守裏町',         en: 'Sakuramori Backstreet', x: -10.3, z: 51.6,  r: 7 },
  { id: 'northblock', jp: 'ひばり台三丁目',   en: 'Hibaridai 3-chome',    x: 32.4,  z: 47.2,   r: 8 },
  { id: 'rokuchome',  jp: '六丁目の転回場',   en: 'The Turning Circle',   x: 61.6,  z: 57.6,   r: 8 },
  { id: 'nichome',    jp: '二丁目通り',       en: 'Nichome Street',       x: 49.2,  z: 12.0,   r: 8 },
  { id: 'nanachome',  jp: 'スーパー さかえ',  en: 'Sakae Supermarket',    x: -37.0, z: 92.4,   r: 9 },
  { id: 'hall',       jp: '町内会館',         en: 'The Meeting Hall',     x: 20.2,  z: 71.8,   r: 8 },

  /* ---------------------------- across the line ---------------------------- */
  { id: 'ichome',     jp: '線路裏の道',       en: 'The Trackside Lane',   x: -13.2, z: -6.9,   r: 7 },
  { id: 'canal',      jp: '用水路',           en: 'The Irrigation Canal', x: -34.0, z: -20.6,  r: 8 },
  { id: 'kobato',     jp: 'こばと橋',         en: 'Kobato Bridge',        x: 2.4,   z: -29.5,  r: 7 },
  { id: 'kawabata',   jp: '川端の道',         en: 'The Riverside Row',    x: 34.0,  z: -26.0,  r: 8 },
  { id: 'sluice',     jp: '第二分水門',       en: 'The Second Sluice',    x: 29.5,  z: -21.0,  r: 7 },
  { id: 'tsugakuro',  jp: 'ひばり台五丁目',   en: 'Hibaridai 5-chome',    x: -21.8, z: -58.0,  r: 7 },
  { id: 'bungu',      jp: '文具 ひばり堂',    en: 'Hibarido Stationers',  x: 0.4,   z: -58.6,  r: 7 },
  { id: 'school',     jp: '県立ひばり台高校', en: 'Hibaridai High School', x: 12.6, z: -49.5,  r: 8 },
  { id: 'schoolyard', jp: '校庭',             en: 'The School Ground',    x: 40.0,  z: -44.2,  r: 10 },

  /* ------------------------------ the hills ------------------------------ */
  { id: 'glade',      jp: '林間広場',         en: 'The Forest Clearing',  x: -14.0, z: -122.0, r: 10 },
  { id: 'hokora',     jp: '山ノ神',           en: 'The Mountain Shrine',  x: -32.0, z: -111.2, r: 8 },
  { id: 'lookout',    jp: '展望台',           en: 'The Lookout',          x: 31.0,  z: -139.0, r: 9 },
  { id: 'tunnel',     jp: '東山トンネル',     en: 'Higashiyama Tunnel',   x: 91.0,  z: 7.2,    r: 8 },

  /* ------------------------------- the lake ------------------------------- */
  { id: 'lakepark',   jp: 'ひばり湖畔公園',   en: 'Lakeside Park',        x: 133.0, z: -74.0,  r: 10 },
  { id: 'pier',       jp: '見晴らし桟橋',     en: 'Miharashi Pier',       x: 166.0, z: -80.0,  r: 8 },
  { id: 'boats',      jp: '貸ボート ひばり',  en: 'The Boat Hire',        x: 143.0, z: -92.0,  r: 8 },
  { id: 'lakecafe',   jp: '喫茶 みなも',      en: 'Cafe Minamo',          x: 178.6, z: -140.0, r: 8 },
  { id: 'camp',       jp: 'ひばり湖 キャンプ場', en: 'The Campsite',      x: 200.0, z: -146.0, r: 9 },
  { id: 'hide',       jp: '野鳥観察小屋',     en: 'The Bird Hide',        x: 214.0, z: -138.2, r: 7 },
  { id: 'suijin',     jp: '水神様',           en: 'The Water Shrine',     x: 251.6, z: -95.0,  r: 8 },
  { id: 'dam',        jp: 'ひばり湖 堰堤',    en: 'The Embankment',       x: 150.0, z: -40.6,  r: 8 },
];

/**
 * Where the connecting nodes are looked for.
 *
 * A landmark is somewhere to arrive; the rest of the graph is the road
 * between two of them, and it is **found rather than written down**.  The
 * first version of this file listed sixty hand-placed junctions off the
 * documented camera positions, and it did not work: the town is a hundred and
 * fifty metres across, a junction every thirty metres leaves every edge
 * leaping a whole district in one straight line, and a straight line across a
 * district hits a house.  The result was thirty-eight islands, and the repair
 * for each one was another coordinate typed in by hand -- a second copy of
 * the town's layout, kept in step with forty builders by memory.
 *
 * So instead: lay a lattice over the ground at walking scale, keep every
 * point with room to stand on it, and join the neighbours.  It is a coarse
 * navigation mesh, it costs one sweep at startup, and it does not have to be
 * maintained at all -- move a building and the nodes it now covers simply
 * stop existing.
 *
 * The rectangles are only there to keep the sweep off the empty half of a
 * planet: 1005 x 480 m of ocean-blank ground at this spacing is thirteen
 * thousand nodes, of which four in five are grass nobody will ever ask about.
 */
const REGIONS = [
  { x0: -70, z0: -74, x1: 84, z1: 108 },     // the town, its blocks and the shore road
  { x0: -50, z0: -150, x1: 50, z1: -68 },    // the school's back hills
  { x0: 104, z0: -158, x1: 264, z1: -26 },   // ひばり湖 and its basin
  { x0: 68, z0: -22, x1: 120, z1: 26 },      // the railway east, out to the tunnel
];
/** Lattice pitch.  A little wider than a footway, a little under a lane. */
const SPACING = 5;
/** How far a lattice node will reach for a neighbour ... */
const LINK = SPACING * 1.55;
/** ... and how far a landmark will reach to join the network at all. */
const LANDMARK_LINK = 16;

/* ------------------------------------------------------------------ *
 * The graph
 * ------------------------------------------------------------------ */

/**
 * How often the line is sampled along its length.
 *
 * Half a metre rather than one, and the reason is the rise test below: at one
 * metre a *slope* and a *step* are the same reading, so a limit loose enough
 * for the hillside behind the school is also loose enough to walk up the side
 * of a retaining wall, and one tight enough for the wall rejects every edge in
 * the hills and around the lake basin.  Halving the sample separates them --
 * a hillside still climbs 0.3 m in half a metre, a wall still jumps a metre in
 * one sample -- at the cost of twice the probes, which the grid pays for.
 */
const STEP = 0.5;
/** Body half-width the corridor has to admit. */
const CLEARANCE = 0.35;
/** Per sample: 0.45 m in half a metre is a 42 degree bank, or any wall. */
const MAX_RISE = 0.45;
/**
 * How much of an edge is allowed to be blocked, and how much of it in a row.
 *
 * The first version of this demanded a clear tube the whole way and produced
 * fifty-five edges out of fifteen hundred candidates -- seventy-one islands,
 * twenty-five landmarks with no route in or out, and a straight line *down the
 * middle of the street* rejected because a kei truck is parked on it.  Which
 * is the correct answer to the question it was asking and the wrong question.
 *
 * A pet does not need a clear tube.  It needs a corridor that is broadly open,
 * because the last two metres are exactly what its obstacle probe is for --
 * that probe steers round a parked car perfectly well, and always has.  What
 * it cannot do is find its way round a *building*, and a building is not two
 * blocked samples, it is thirty.  So: a fraction of the line may be occupied,
 * and no more than a couple of metres of it consecutively.
 */
const BLOCKED_FRACTION = 0.30;
const BLOCKED_RUN = 4;
/** Three samples of clutter is a fence post, whatever the edge's length. */
const BLOCKED_FLOOR = 3;

/**
 * Build the navigation graph over a finished world.
 *
 * Runs once, after the build, and costs a few thousand collider probes --
 * which is affordable only because they go through `world.colliderGrid`.
 * Against the flat collider list this would be tens of millions of box tests
 * and a visible stall on the loading bar.
 */
export function buildNavGraph(world) {
  const grid = world.colliderGrid;

  /** Is there room for a body of radius `r` at a point, feet at `feetY`? */
  const free = (x, z, r, feetY) => !grid.each(x, z, r + 0.1, (c) => {
    if (c.top !== undefined && c.top <= feetY + 0.25) return false;
    if (c.bottom !== undefined && c.bottom > feetY + 1.4) return false;
    return x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r;
  });

  /** Somewhere near a point with room to stand, or null if there is nowhere. */
  function settle(x, z) {
    const y0 = world.heightAt(x, z);
    if (free(x, z, CLEARANCE, y0)) return { x: wrapX(x), z, y: y0 };
    for (const d of [1.2, 2.4, 4.0, 6.0]) {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const px = wrapX(x + Math.cos(a) * d);
        const pz = z + Math.sin(a) * d;
        const py = world.heightAt(px, pz);
        if (Math.abs(py - y0) < 0.8 && free(px, pz, CLEARANCE, py)) {
          return { x: px, z: pz, y: py };
        }
      }
    }
    return null;
  }

  /* ------------------------------- the nodes ------------------------------- */
  const t0 = performance.now();
  const nodes = [];
  const byLandmark = new Map();
  const homeless = [];

  /* Landmarks first, so their indices are small and stable and a saved
   * collection cannot be invalidated by the lattice moving under it. */
  for (const lm of LANDMARKS) {
    const spot = settle(lm.x, lm.z);
    if (!spot) { homeless.push(lm.id); continue; }
    byLandmark.set(lm.id, nodes.length);
    nodes.push({ ...spot, landmark: lm });
  }

  const lattice0 = nodes.length;
  for (const reg of REGIONS) {
    for (let x = reg.x0; x <= reg.x1; x += SPACING) {
      for (let z = reg.z0; z <= reg.z1; z += SPACING) {
        const y = world.heightAt(x, z);
        if (!free(x, z, CLEARANCE, y)) continue;
        nodes.push({ x: wrapX(x), z, y, landmark: null });
      }
    }
  }

  /* ------------------------------- the edges ------------------------------- */

  /**
   * Can something walk from a to b in a straight line?
   *
   * The height is carried forward from sample to sample rather than queried
   * fresh from the ground, which is what makes this the same question the
   * player's own feet ask: `heightAt` offers a platform only within a step of
   * where the query is made *from*, so a walk under the footbridge stays under
   * it instead of teleporting onto the deck halfway across.
   */
  /** Set by `walkable` when it refuses, so the DEV hook can say why. */
  let lastRefusal = null;

  function walkable(a, b) {
    /* `wrapDelta(a, b)` is **a - b**, not b - a.
     *
     * Written out because getting it backwards is silent and was: the corridor
     * walked away from its target instead of toward it, every edge was tested
     * against a mirror image of the ground it was supposed to cross, and the
     * result was a graph of seventy islands that looked exactly like a world
     * too cluttered to navigate.  The distances were right the whole time,
     * because a hypotenuse does not care about signs. */
    const dx = wrapDelta(b.x, a.x);
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const n = Math.max(2, Math.ceil(len / STEP));
    lastRefusal = null;
    let y = a.y;
    let blocked = 0, run = 0;
    const allowed = Math.max(BLOCKED_FLOOR, Math.floor(n * BLOCKED_FRACTION));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = wrapX(a.x + dx * t);
      const z = a.z + dz * t;
      /* Carried forward rather than queried fresh, which is what makes this
       * the same question the player's own feet ask: `heightAt` offers a
       * platform only within a step of where the query is made *from*, so a
       * walk under the footbridge stays under it instead of teleporting onto
       * the deck halfway across. */
      const h = world.heightAt(x, z, y);
      // the rise is not negotiable: a wall is a wall and a channel is a channel
      if (Math.abs(h - y) > MAX_RISE) {
        lastRefusal = { why: 'rise', x: +x.toFixed(1), z: +z.toFixed(1), d: +(h - y).toFixed(2) };
        return false;
      }
      if (free(x, z, CLEARANCE, h)) {
        run = 0;
      } else {
        blocked++;
        run++;
        if (run >= BLOCKED_RUN) {
          lastRefusal = { why: 'wall', x: +x.toFixed(1), z: +z.toFixed(1) };
          return false;
        }
        if (blocked > allowed) {
          lastRefusal = { why: 'clutter', blocked, allowed, len: +len.toFixed(1) };
          return false;
        }
      }
      y = h;
    }
    return true;
  }

  /* Candidates come out of a bucket of the nodes themselves rather than out of
   * every pair: a thousand nodes is half a million pairs, and all but eight of
   * each node's are further away than it can reach anyway. */
  const BUCKET = LANDMARK_LINK;
  const buckets = new Map();
  const bkey = (x, z) => `${Math.floor(wrapX(x) / BUCKET)},${Math.floor(z / BUCKET)}`;
  nodes.forEach((n, i) => {
    const k = bkey(n.x, n.z);
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = []));
    b.push(i);
  });

  const adj = nodes.map(() => []);
  let tested = 0;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    // a landmark reaches further, because it is placed where a place is and
    // not where the lattice happens to have a point
    const reach = a.landmark ? LANDMARK_LINK : LINK;
    const cx = Math.floor(wrapX(a.x) / BUCKET), cz = Math.floor(a.z / BUCKET);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        const b = buckets.get(`${cx + ox},${cz + oz}`);
        if (!b) continue;
        for (const j of b) {
          if (j <= i) continue;
          const other = nodes[j];
          const d = Math.hypot(wrapDelta(a.x, other.x), a.z - other.z);
          if (d > Math.max(reach, other.landmark ? LANDMARK_LINK : LINK)) continue;
          tested++;
          if (!walkable(a, other)) continue;
          adj[i].push({ to: j, cost: d });
          adj[j].push({ to: i, cost: d });
        }
      }
    }
  }

  /* --------------------------- connected components --------------------------- */
  const comp = new Array(nodes.length).fill(-1);
  let components = 0;
  for (let s = 0; s < nodes.length; s++) {
    if (comp[s] >= 0) continue;
    const stack = [s];
    comp[s] = components;
    while (stack.length) {
      const n = stack.pop();
      for (const e of adj[n]) if (comp[e.to] < 0) { comp[e.to] = components; stack.push(e.to); }
    }
    components++;
  }

  /* -------------------------------- the search -------------------------------- */

  /** Straight-line cost, which is admissible because every edge is a straight line. */
  const heur = (a, b) => Math.hypot(wrapDelta(nodes[a].x, nodes[b].x), nodes[a].z - nodes[b].z);

  /**
   * A* between two node indices.  Forty nodes and a hundred edges, so the
   * open set is an array and the sort is a linear scan -- a binary heap here
   * would be more code than the search it accelerates.
   */
  function path(from, to) {
    if (from === to) return [from];
    if (comp[from] !== comp[to]) return null;
    const g = new Map([[from, 0]]);
    const cameFrom = new Map();
    const open = [from];
    const f = new Map([[from, heur(from, to)]]);
    const closed = new Set();

    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === to) {
        const out = [cur];
        let n = cur;
        while (cameFrom.has(n)) { n = cameFrom.get(n); out.push(n); }
        return out.reverse();
      }
      closed.add(cur);
      for (const e of adj[cur]) {
        if (closed.has(e.to)) continue;
        const tentative = g.get(cur) + e.cost;
        if (g.has(e.to) && tentative >= g.get(e.to)) continue;
        g.set(e.to, tentative);
        cameFrom.set(e.to, cur);
        f.set(e.to, tentative + heur(e.to, to));
        if (!open.includes(e.to)) open.push(e.to);
      }
    }
    return null;
  }

  /** The node an animal standing at (x, z) should join the network at. */
  function nearestNode(x, z, maxDist = 40) {
    let best = -1, bestD = maxDist;
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(wrapDelta(x, nodes[i].x), z - nodes[i].z);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  const api = {
    nodes,
    adj,
    components,
    /** Which component a node is in -- "can this animal even get there". */
    componentOf: (i) => comp[i],
    landmarkNode: (id) => byLandmark.get(id) ?? -1,
    path,
    nearestNode,
    /**
     * Landmarks this animal could actually lead somebody to, nearest first.
     *
     * The distance that matters is the **route**, not the straight line, and
     * the two come apart badly: the shrine is thirty-eight metres from the
     * crossing and a hundred and ninety-eight metres' walk from it, because
     * the alley between them is not a corridor the graph will accept.  Sorted
     * on the straight line, that is the first thing a cat offers to show you,
     * and what it actually does is set off round the far side of the town.
     *
     * One bounded Dijkstra from where the animal is standing answers it for
     * every landmark at once -- an A* per candidate would be thirty-nine
     * searches on a keypress.  `exclude` is the set already discovered: a
     * guide should be taking you somewhere new while there is anywhere new.
     */
    reachableLandmarks(fromNode, { min = 22, max = 135, exclude = null } = {}) {
      if (fromNode < 0) return [];
      const dist = new Map([[fromNode, 0]]);
      const seen = new Set();
      const queue = [fromNode];
      while (queue.length) {
        let bi = 0;
        for (let i = 1; i < queue.length; i++) {
          if (dist.get(queue[i]) < dist.get(queue[bi])) bi = i;
        }
        const cur = queue.splice(bi, 1)[0];
        if (seen.has(cur)) continue;
        seen.add(cur);
        const base = dist.get(cur);
        if (base > max) continue;
        for (const e of adj[cur]) {
          const next = base + e.cost;
          if (next > max) continue;
          if (dist.has(e.to) && dist.get(e.to) <= next) continue;
          dist.set(e.to, next);
          queue.push(e.to);
        }
      }

      const out = [];
      for (const lm of LANDMARKS) {
        const node = byLandmark.get(lm.id);
        if (node === undefined || node === fromNode) continue;
        const cost = dist.get(node);
        if (cost === undefined || cost < min || cost > max) continue;
        out.push({ lm, node, dist: cost, known: !!exclude?.has(lm.id) });
      }
      // somewhere new first, then whichever of those is the shortest walk
      out.sort((a, b) => (a.known - b.known) || (a.dist - b.dist));
      return out;
    },
    /**
     * Why an edge exists, or does not.
     *
     * Tuning this graph is entirely a matter of asking the world questions
     * about ground nobody can see from the console, and the alternative to
     * this hook is reimplementing `walkable` in a scratch script and then
     * debugging the *reimplementation* -- which is exactly how an afternoon
     * gets spent.  Takes node indices, landmark ids, or an {x, z}.
     */
    explain(a, b) {
      const resolve = (v) => {
        if (typeof v === 'number') return nodes[v];
        if (typeof v === 'string') return nodes[byLandmark.get(v) ?? -1];
        return { x: v.x, z: v.z, y: world.heightAt(v.x, v.z) };
      };
      const na = resolve(a), nb = resolve(b);
      if (!na || !nb) return { why: 'no such node' };
      const d = Math.hypot(wrapDelta(na.x, nb.x), na.z - nb.z);
      return walkable(na, nb)
        ? { why: 'ok', d: +d.toFixed(1) }
        : { ...lastRefusal, d: +d.toFixed(1) };
    },
    stats: {
      nodes: nodes.length,
      lattice: nodes.length - lattice0,
      landmarks: byLandmark.size,
      edges: adj.reduce((a, l) => a + l.length, 0) / 2,
      tested,
      components,
      ms: Math.round(performance.now() - t0),
      homeless,
      isolated: nodes
        .map((n, i) => (adj[i].length === 0 && n.landmark ? n.landmark.id : null))
        .filter(Boolean),
      /**
       * How many landmarks share the biggest component -- the one number that
       * says whether an animal can actually take anybody anywhere.
       */
      get reachable() {
        const size = new Map();
        for (let i = 0; i < nodes.length; i++) {
          size.set(comp[i], (size.get(comp[i]) ?? 0) + 1);
        }
        let bigC = -1, bigN = -1;
        for (const [c, n] of size) if (n > bigN) { bigN = n; bigC = c; }
        return nodes.filter((n, i) => n.landmark && comp[i] === bigC).length;
      },
    },
  };

  if (import.meta.env?.DEV) {
    const s = api.stats;
    console.info(`landmarks: ${s.landmarks}/${LANDMARKS.length} placed, `
      + `${s.lattice} lattice nodes, ${s.edges} edges from ${s.tested} candidates, `
      + `${s.components} components, ${s.reachable} landmarks on the main one, ${s.ms} ms`);
    if (s.homeless.length) console.warn('landmarks: nowhere to stand at', s.homeless);
    if (s.isolated.length) console.warn('landmarks: no route in or out of', s.isolated);
  }
  return api;
}
