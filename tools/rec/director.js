/* ===========================================================================
 * The demo director -- fifteen minutes of Sakura Crossing, played by hand.
 *
 * Evaluated as a classic script in the page, on top of `window.__scene`.  It
 * plays the game the way the keyboard does: it sets `player.keys`, turns
 * `player.yaw`, and presses `E` and `F` through the same handlers a person
 * would.  Nothing here reaches into the simulation to fake a result -- the one
 * exception is stage direction (`dragon.teleport`, `dragon.force`), which
 * puts the animal on its mark and is marked as such at every call.
 *
 * The recorder drives it: `__director.tick(dt)` once per frame, before the
 * page's own frame callback runs.
 * ======================================================================== */
window.__director = (function () {
  const s = window.__scene;
  const { player, world, pets, hud, camera } = s;
  const dragon = () => s.dragon;

  const R = 160;
  const CIRC = 2 * Math.PI * R;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrapDelta = (a, b) => {
    let d = a - b;
    while (d > CIRC / 2) d -= CIRC;
    while (d < -CIRC / 2) d += CIRC;
    return d;
  };
  const norm = (a) => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };

  /* ------------------------------- the hands ------------------------------- */

  const keys = player.keys;
  const hold = (...list) => {
    keys.clear();
    for (const k of list) if (k) keys.add(k);
  };

  /** The yaw that points the walker at a flat (x, z).  Forward is (-sin, -cos). */
  const bearing = (tx, tz) => Math.atan2(
    -wrapDelta(tx, player.pos.x), -(tz - player.pos.z)
  );

  /** Turn toward a yaw at a capped rate; returns how much is still to go. */
  function turnTo(yawT, dt, rate = 1.8) {
    const d = norm(yawT - player.yaw);
    player.yaw += clamp(d, -rate * dt, rate * dt);
    return Math.abs(d);
  }

  function pitchTo(pT, dt, rate = 0.9) {
    const d = clamp(pT, -1.3, 1.2) - player.pitch;
    player.pitch += clamp(d, -rate * dt, rate * dt);
    return Math.abs(d);
  }

  /** Pitch that looks at a point `h` metres above the ground at (x, z). */
  function pitchAt(tx, tz, h = 1.0) {
    const dx = wrapDelta(tx, player.pos.x), dz = tz - player.pos.z;
    const L = Math.max(0.4, Math.hypot(dx, dz));
    const eye = player.pos.y + (player.ride ? 0 : 1.62);
    const ty = world.heightAt(tx, tz) + h;
    // the surface falls away on a 160 m planet: half a degree per metre of arc
    return Math.atan2(ty - eye, L) - (L * L) / (2 * R * L || 1) * 0.5;
  }

  /* ------------------------------ getting about ------------------------------
   *
   * The walker does not go in straight lines, because the town does not have
   * any: it walks the same graph the animals lead you along.  `nav.path` is
   * thirty-nine landmarks and two thousand lattice nodes with edges that were
   * checked for clearance when they were derived, so a route out of it is a
   * route a person could take -- which the straight line between two waypoints
   * emphatically is not.  See `world/landmarks.js`.
   *
   * The stuck check underneath it is still needed, because a node-to-node edge
   * is a sampled straight line and the town is full of things a half-metre
   * sample steps over.  Sample twice a second, sidestep when nothing has
   * moved, and after four of those, ask the graph for a new route from
   * wherever we have ended up.
   */
  const NAV = s.nav;
  const GRID = world.colliderGrid;

  /* ---------------------------- a walker's graph ----------------------------
   *
   * `nav.path` is the animals' router, and an animal is not a person: its
   * edges were cleared for something the size of a cat.  The 商店街's north
   * side is fenced at 0.98 m along z = 17.4 from x = 31.8 to 43.6, which a cat
   * route crosses and a walker cannot -- `_resolveAt` refuses anything whose
   * `top` is more than a 0.38 m step above the feet.  A recording was lost to
   * exactly that fence: forty minutes of film with the camera pressed against
   * it from t = 400 to the end.
   *
   * So the nodes and the adjacency are borrowed and the *edges are re-tested*
   * against the same boxes the player collides with, through the same spatial
   * index (`colliderGrid.each`).  An A* over what is left is a route a person
   * can walk.  Results are cached: an edge's clearance cannot change, and the
   * router is asked again every couple of seconds while following an animal.
   */
  const STEP_UP = 0.38;     // `STEP` in player.js: what it can walk up

  /* Two tolerances, and the loose one is not optional.
   *
   * The tight test inflates every box by a little more than the walker's
   * radius, which is what you want for choosing between two ways round a
   * building.  Applied to the whole lattice it also rejects one edge in five
   * -- gateposts, a bicycle, the gap between a vending machine and a wall --
   * and an eighteen-per-cent haircut on a graph this sparse disconnects it:
   * the first A* over it could not find the school from the 商店街 at all, and
   * fell back to the animals' route straight into the fence.  So: plan on the
   * tight graph, and if that finds nothing, plan again on the loose one before
   * giving up and taking the animals' word for it. */
  const TIGHT = { body: 0.42, step: STEP_UP + 0.12 };
  const LOOSE = { body: 0.30, step: 1.2 };

  /* The one collider a route must be allowed to ignore.
   *
   * `world/index.js` keeps two boxes across the road at the level crossing and
   * gives them a `top` of 1.25 while the booms are down and -1 while they are
   * up -- so that the walker is held at the barrier rather than standing
   * inside a passing train.  They are the only colliders in this world whose
   * extents change, and an edge test that happens to run while a train is
   * coming caches "there is no way over the railway" for the rest of the film.
   * There is: it opens in about three seconds, and being made to wait at it is
   * the correct behaviour, not a routing problem. */
  const BOOMS = new Set(world.colliders.filter((c) => c.top !== undefined
    && Math.abs(c.z1 - c.z0) < 0.4
    && c.x1 - c.x0 > 6 && c.x1 - c.x0 < 9
    && Math.abs((c.z0 + c.z1) / 2) < 6));
  if (BOOMS.size !== 2) console.warn(`director: expected 2 boom blocks, found ${BOOMS.size}`);

  function blockedAt(x, z, o) {
    const feet = world.heightAt(x, z, 0);
    const r = o.body;
    return GRID.each(x, z, r, (c) => {
      if (BOOMS.has(c)) return false;
      if (c.top !== undefined && c.top <= feet + STEP_UP) return false;
      if (c.bottom !== undefined && c.bottom > feet + 1.9) return false;
      return x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r;
    }) === true;
  }

  /** Could the walker get from one flat point to another in a straight line? */
  function clearLine(ax, az, bx, bz, o = TIGHT) {
    const dx = wrapDelta(bx, ax), dz = bz - az;
    const len = Math.hypot(dx, dz);
    const n = Math.max(2, Math.ceil(len / 0.5));
    let prev = world.heightAt(ax, az, 0);
    for (let i = 1; i <= n; i++) {
      const x = ax + (dx * i) / n, z = az + (dz * i) / n;
      if (blockedAt(x, z, o)) return false;
      const h = world.heightAt(x, z, 0);
      if (h - prev > o.step) return false;   // a step it cannot take up
      prev = h;
    }
    return true;
  }

  const edgeCache = [new Map(), new Map()];
  function openEdge(i, j, loose = 0) {
    const k = i < j ? i * 10000 + j : j * 10000 + i;
    const cache = edgeCache[loose];
    let v = cache.get(k);
    if (v === undefined) {
      const a = XN[i], b = XN[j];
      v = clearLine(a.x, a.z, b.x, b.z, loose ? LOOSE : TIGHT);
      cache.set(k, v);
    }
    return v;
  }

  /* --------------------------- the roads, by hand ---------------------------
   *
   * The lattice's only way south is *along the railway*: nodes at (20, 1),
   * (15, 1), (5, 1) sit between the two lineside fences, which is a corridor
   * a cat may use and a person may not -- the first dry run spent four minutes
   * in the ballast trench getting there.  Everything else north of the tracks
   * between x = 5 and x = 84 is fenced off from them.
   *
   * So the two roads that actually cross the district are added to the graph
   * by hand, as chains of points off the shot list in `CLAUDE/CLAUDE_0.md` --
   * every one of them a place the author has stood a camera, which is a better
   * guarantee of walkable ground than anything derivable.  They are linked to
   * each other and to whatever lattice nodes they can see, so the router can
   * still get on and off them anywhere.
   */
  const ROADS = [
    // the 通学路: down the crossing and on to the school
    [[1.9, 13.6], [1.8, 9.0], [1.8, 4.6], [1.8, 0.5], [1.8, -4.0], [1.6, -10],
      [1.5, -16], [1.5, -22], [2.4, -29.5], [4.0, -36], [7.5, -43], [12.6, -49.5]],
    // the shopping street, back to the crossing corner
    [[22.2, 20], [17.5, 17.4], [13.5, 16.6], [9.0, 15.6], [6.5, 15.1], [1.9, 13.6]],
  ];

  const XN = NAV.nodes.map((n) => ({ x: n.x, z: n.z }));
  const XADJ = NAV.adj.map((a) => a.map((e) => ({ to: e.to, cost: e.cost })));
  const roadStats = { added: 0, chain: 0, tie: 0, blocked: [] };
  {
    const link = (i, j) => {
      const d = Math.hypot(wrapDelta(XN[i].x, XN[j].x), XN[i].z - XN[j].z);
      XADJ[i].push({ to: j, cost: d });
      XADJ[j].push({ to: i, cost: d });
    };
    for (const road of ROADS) {
      let prev = -1;
      for (const [x, z] of road) {
        const i = XN.length;
        XN.push({ x, z });
        XADJ.push([]);
        roadStats.added++;
        if (blockedAt(x, z, TIGHT)) roadStats.blocked.push([x, z]);
        if (prev >= 0) { link(prev, i); roadStats.chain++; }
        // and on and off the lattice wherever it can be seen
        for (let j = 0; j < NAV.nodes.length; j++) {
          const n = NAV.nodes[j];
          const d = Math.hypot(wrapDelta(n.x, x), n.z - z);
          if (d > 9) continue;
          if (n.y - world.heightAt(n.x, n.z, 0) > 1.5) continue;
          if (!clearLine(x, z, n.x, n.z)) continue;
          link(i, j);
          roadStats.tie++;
        }
        prev = i;
      }
    }
  }

  const heur = (i, j) => Math.hypot(
    wrapDelta(XN[i].x, XN[j].x), XN[i].z - XN[j].z);

  /** A* over the animals' nodes with only the edges a person could walk. */
  function walkPath(from, to, loose = 0) {
    if (from < 0 || to < 0) return null;
    if (from === to) return [from];
    const g = new Map([[from, 0]]);
    const came = new Map();
    const open = [from];
    const f = new Map([[from, heur(from, to)]]);
    const done = new Set();
    let guard = 0;
    while (open.length && guard++ < 9000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur === to) {
        const out = [cur];
        let c = cur;
        while (came.has(c)) { c = came.get(c); out.push(c); }
        return out.reverse();
      }
      done.add(cur);
      // `adj` holds { to, cost }, not bare indices -- see `world/landmarks.js`
      for (const e of XADJ[cur]) {
        const nb = e.to;
        if (done.has(nb) || !openEdge(cur, nb, loose)) continue;
        const cost = g.get(cur) + e.cost;
        if (g.has(nb) && cost >= g.get(nb)) continue;
        g.set(nb, cost);
        came.set(nb, cur);
        f.set(nb, cost + heur(nb, to));
        if (!open.includes(nb)) open.push(nb);
      }
    }
    return null;
  }

  /** The nearest node the walker could actually set off toward. */
  function reachableNode(x, z, far = 70) {
    const ranked = [];
    for (let i = 0; i < XN.length; i++) {
      const n = XN[i];
      const nav = NAV.nodes[i];
      if (nav && nav.y - world.heightAt(nav.x, nav.z, 0) > 1.5) continue;  // a deck, not the ground
      const d = Math.hypot(wrapDelta(n.x, x), n.z - z);
      if (d < far) ranked.push([d, i]);
    }
    ranked.sort((a, b) => a[0] - b[0]);
    for (const [d, i] of ranked.slice(0, 24)) {
      if (clearLine(x, z, XN[i].x, XN[i].z)) return i;
    }
    return ranked.length ? ranked[0][1] : -1;
  }
  const walk = { t: 0, x: 0, z: 0, strafeT: 0, side: 1, jumpT: 0, stuckN: 0, pressT: 0 };

  /* The last resort, above the level of any one route.
   *
   * The sidestep frees a doorway and the re-plan frees a bad waypoint, but
   * neither frees a walker whose *every* route runs through the same blocked
   * corner: it presses W into the same wall until the film ends.  So count the
   * seconds actually spent pressing forward, and if a dozen of them have
   * bought less than three metres, stop asking the route what to do -- turn
   * round, run, and throw the route away.  Cheap, ugly for three seconds, and
   * the difference between a film with a dragon in it and one without. */
  const escape = { since: 0, x: 0, z: 0, left: 0, yaw: 0, side: 1 };

  function unstick(dt) {
    if (escape.left > 0) {
      escape.left -= dt;
      turnTo(escape.yaw, dt, 3.0);
      hold('KeyW');
      if (escape.left > 2.6) tap('Space');
      return true;
    }
    if (walk.pressT - escape.since < 12) return false;
    const moved = Math.hypot(wrapDelta(player.pos.x, escape.x), player.pos.z - escape.z);
    escape.since = walk.pressT;
    escape.x = player.pos.x;
    escape.z = player.pos.z;
    if (moved >= 3) return false;
    escape.left = 3.4;
    escape.side = -escape.side;
    escape.yaw = player.yaw + Math.PI + escape.side * 0.7;
    S.go = null;                 // whatever it was following was a route into a wall
    S.guideGo = null;
    walk.stuckN = 0;
    return true;
  }

  /* ------------------------------ getting round ------------------------------
   *
   * A route is a list of points and the walk between two of them is a straight
   * line, which is fine until the walker is somewhere the route did not put
   * it -- shoved sideways by a doorway, or dropped into the pocket where the
   * 商店街's two fences meet.  From in there every waypoint is behind a fence,
   * and a walker that only knows how to face one and press W will stand in the
   * corner for the rest of the film.  (It did.  Twice.)
   *
   * So when the line to the waypoint is not clear, stop steering at it and
   * steer *around*: probe outward in a fan, take the open direction nearest to
   * the one wanted, and hold that choice for a second and a half so the
   * result is a walk along the wall rather than a shiver between two sides of
   * it.  The commitment is the part that matters -- picking afresh every frame
   * is how a walker paces a fence instead of following it to its end.
   */
  const dodge = { until: 0, yaw: 0 };

  function steerBearing(tx, tz, dt) {
    const want = bearing(tx, tz);
    if (clearLine(player.pos.x, player.pos.z, tx, tz, LOOSE)) {
      dodge.until = 0;
      return want;
    }
    dodge.until -= dt;
    if (dodge.until > 0) return dodge.yaw;
    for (let i = 1; i <= 11; i++) {
      for (const side of (Math.random() < 0.5 ? [1, -1] : [-1, 1])) {
        const a = want + side * i * (Math.PI / 12);
        const px = player.pos.x - Math.sin(a) * 3.2;
        const pz = player.pos.z - Math.cos(a) * 3.2;
        if (!clearLine(player.pos.x, player.pos.z, px, pz, LOOSE)) continue;
        dodge.yaw = a;
        dodge.until = 1.5;
        return a;
      }
    }
    return want;    // boxed in on every side: press on and let the escape have it
  }

  function walkTo(tx, tz, dt, o = {}) {
    const arrive = o.arrive ?? 1.8;
    const dx = wrapDelta(tx, player.pos.x), dz = tz - player.pos.z;
    const dist = Math.hypot(dx, dz);
    const off = turnTo(o.direct ? bearing(tx, tz) : steerBearing(tx, tz, dt), dt, o.turn ?? 2.2);
    if (o.pitch !== undefined) pitchTo(o.pitch, dt);
    if (dist <= arrive) {
      hold();
      walk.strafeT = 0;
      return { dist, arrived: true };
    }

    walk.t += dt;
    if (walk.t > 0.5) {
      const moved = Math.hypot(wrapDelta(player.pos.x, walk.x), player.pos.z - walk.z);
      if (moved < 0.22 && off < 1.0 && walk.strafeT <= 0) {
        walk.strafeT = 0.9;
        walk.side = -walk.side;
        walk.jumpT = 0.25;
        walk.stuckN++;
      } else if (moved > 0.8) {
        walk.stuckN = 0;
      }
      walk.t = 0;
      walk.x = player.pos.x;
      walk.z = player.pos.z;
    }

    const k = [];
    if (off < 1.25) { k.push('KeyW'); walk.pressT += dt; }
    if (o.run && off < 0.4 && walk.strafeT <= 0) k.push('ShiftLeft');
    if (walk.strafeT > 0) {
      walk.strafeT -= dt;
      k.push(walk.side > 0 ? 'KeyD' : 'KeyA');
      if (walk.jumpT > 0) { walk.jumpT -= dt; tap('Space'); }
    }
    hold(...k);
    return { dist, arrived: false };
  }

  /** A route to (x, z) as a list of flat points, off the town's own graph. */
  function plan(tx, tz, arrive = 2.0) {
    // straight there, if a straight line is honestly available
    let pts = [];
    if (!clearLine(player.pos.x, player.pos.z, tx, tz)) {
      const a = reachableNode(player.pos.x, player.pos.z);
      const b = reachableNode(tx, tz);
      // the animals' router is the last resort, and only it knows its own indices
      const nav = a >= 0 && b >= 0 && a < NAV.nodes.length && b < NAV.nodes.length;
      const p = walkPath(a, b) ?? walkPath(a, b, 1) ?? (nav ? NAV.path(a, b) : null);
      if (p && p.length > 1) pts = p.map((i) => [XN[i].x, XN[i].z]);
      /* Always set off for a node we can honestly see, even when the search
       * found nothing beyond it.  `reachableNode` picked it by straight line,
       * so this is the one waypoint the walker is guaranteed to be able to
       * reach -- and from the pocket between the 商店街's two fences it is the
       * difference between walking out of the corner and pressing W into it. */
      if (a >= 0) pts.unshift([XN[a].x, XN[a].z]);
    }
    pts.push([tx, tz]);
    /* Trim the node we are standing on -- but only while the one after it can
     * be walked to in a straight line.  Skipping it unconditionally is what
     * kept the walker pinned at x = 32: it stood two metres north of the
     * 商店街 fence, the route's first node was the one clear way round the end
     * of it, that node got trimmed for being close, and every step after that
     * was aimed at the node on the far side of the fence. */
    while (pts.length > 1
      && Math.hypot(wrapDelta(pts[0][0], player.pos.x), pts[0][1] - player.pos.z) < 3.5
      && clearLine(player.pos.x, player.pos.z, pts[1][0], pts[1][1])) pts.shift();
    walk.stuckN = 0;
    return { pts, i: 0, dest: [tx, tz], arrive };
  }

  /** Step a planned route; true once its last point is reached. */
  function journey(j, dt, o = {}) {
    if (!j || j.i >= j.pts.length) { hold(); return true; }
    if (walk.stuckN >= 4) {
      /* Four sidesteps and still nothing.  Alternate two answers: ask the
       * graph for a fresh route from where we have ended up, and -- when that
       * has already been tried -- give up on the waypoint itself and walk to
       * the next one, because a lattice node with something built across it
       * cannot be reached however it is approached. */
      j.tries = (j.tries ?? 0) + 1;
      if (j.tries % 2 === 0 && j.i < j.pts.length - 1) {
        j.i++;
      } else {
        const re = plan(j.dest[0], j.dest[1], j.arrive);
        j.pts = re.pts;
        j.i = 0;
      }
      walk.stuckN = 0;
    }
    /* Is the waypoint still something we could walk straight to?  Twice a
     * second is cheap, and without it the walker aims at a node on the far
     * side of a fence and leans on it until the beat ends. */
    j.check = (j.check ?? 0) - dt;
    if (j.check <= 0) {
      j.check = 0.7;
      const w = j.pts[j.i];
      if (!clearLine(player.pos.x, player.pos.z, w[0], w[1])) {
        const re = plan(j.dest[0], j.dest[1], j.arrive);
        j.pts = re.pts;
        j.i = 0;
      }
    }
    const last = j.i === j.pts.length - 1;
    const [x, z] = j.pts[j.i];
    const r = walkTo(x, z, dt, { ...o, arrive: last ? j.arrive : 2.8 });
    if (r.arrived) j.i++;
    return j.i >= j.pts.length;
  }

  /** A route through a list of waypoints, each leg planned off the graph. */
  function goVia(list, arrive = 2.0) {
    S.via = list;
    S.viaI = 0;
    S.viaArrive = arrive;
    S.go = plan(list[0][0], list[0][1], arrive);
  }

  /** Step the current via-route; true once its last waypoint is reached. */
  function journeyVia(dt, o = {}) {
    if (!S.via) return true;
    if (!S.go) S.go = plan(S.via[S.viaI][0], S.via[S.viaI][1], S.viaArrive);
    const done = journey(S.go, dt, o);
    if (done && S.viaI < S.via.length - 1) {
      S.viaI++;
      S.go = plan(S.via[S.viaI][0], S.via[S.viaI][1], S.viaArrive);
      return false;
    }
    return done;
  }

  /* --------------------------------- flying ---------------------------------
   *
   * A dragon at cruise crosses this planet in a minute, so "hold W and steer a
   * bit" is a flight to the far side of the world and fifteen minutes of
   * desert.  Everything in the air is flown as an **orbit of the district**
   * instead: aim at the point a fixed angle ahead of us on a circle round the
   * town, and the animal spends the whole flight over the thing worth looking
   * at.  Altitude is a bang-bang hold on `Space`, which is exactly how it is
   * flown by hand -- beat to climb, glide to sink.
   */
  const TOWN = [10, 0];

  function fly(dt, o = {}) {
    const d = dragon();
    const rad = o.rad ?? 90;
    const a = Math.atan2(wrapDelta(player.pos.x, TOWN[0]), player.pos.z - TOWN[1]);
    const lead = o.lead ?? 0.75;
    const tx = TOWN[0] + Math.sin(a + lead) * rad;
    const tz = TOWN[1] + Math.cos(a + lead) * rad;
    turnTo(bearing(tx, tz), dt, o.turn ?? 0.7);
    pitchTo(o.pitch ?? -0.15, dt, 0.35);
    const k = ['KeyW'];
    if (d && d.debug.alt < (o.alt ?? 55)) k.push('Space');
    if (o.boost) k.push('ShiftLeft');
    hold(...k);
  }

  /* --------------------------------- looking --------------------------------- */

  /** Idle head movement, so a standing shot is not a tripod. */
  function drift(t, amp = 0.22, rate = 0.35, base = 0) {
    player.yaw += Math.sin(t * rate) * amp * 0.02;
    player.pitch += Math.cos(t * rate * 0.83) * 0.05 * 0.02;
    player.pitch = clamp(player.pitch, base - 0.25, base + 0.25);
  }

  /* --------------------------------- the cast --------------------------------- */

  /**
   * The nearest wild animal within `far` that can actually take you somewhere.
   *
   * The last clause is the one that matters.  `lead` needs a node within 30 m
   * of the animal and an undiscovered landmark reachable from it, and an
   * animal that fails either test answers the offer with a shake of the head
   * -- which, in a film, is a minute of following something that is not going
   * anywhere.  Asking the graph first costs one bounded Dijkstra per candidate
   * and removes the whole failure.
   */
  function nearestWild(far = 40, exclude = []) {
    const ranked = [];
    for (const p of pets.pets) {
      if (!p.spec || exclude.includes(p)) continue;
      if (p.state === 'follow' || p.state === 'stay' || p.state === 'lead'
        || p.state === 'wait' || p.state === 'arrived') continue;
      if (p.air) continue;                   // bees and parrots do not lead well
      const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);
      // an animal on the other side of a fence is a minute spent on the fence
      if (d < far) ranked.push([d + (clearLine(player.pos.x, player.pos.z, p.x, p.z, LOOSE) ? 0 : 40), p]);
    }
    ranked.sort((a, b) => a[0] - b[0]);
    for (const [, p] of ranked) {
      const n = NAV.nearestNode(p.x, p.z, 30);
      if (n < 0) continue;
      if (!NAV.reachableLandmarks(n, { exclude: s.discovered }).length) continue;
      return p;
    }
    return ranked.length ? ranked[0][1] : null;
  }

  /** Is this animal in the middle of showing you somewhere? */
  const isGuiding = (p) => p.state === 'lead' || p.state === 'wait' || p.state === 'arrived';

  /** The nearest interactable whose label contains `sub`, in flat coordinates. */
  function nearestInteractable(sub) {
    let best = null, bd = 1e9;
    for (const it of world.interactables) {
      if (!it.label || !it.label.includes(sub) || !it.hitbox) continue;
      it.hitbox.updateMatrixWorld();
      const f = flatOf(it.hitbox.getWorldPosition(new s.THREE.Vector3()));
      const d = Math.hypot(wrapDelta(f.x, player.pos.x), f.z - player.pos.z);
      if (d < bd) { bd = d; best = { x: f.x, z: f.z, it }; }
    }
    return best;
  }

  /**
   * The most open spot about `want` metres from (x, z).
   *
   * Scored rather than found: sixteen bearings, and for each the distance to
   * the nearest collider corner, so what comes back is the middle of a car
   * park rather than the first gap in a hedge.  Somewhere to put a
   * seven-metre animal down where it can be walked round and seen.
   */
  function openGroundNear(x, z, want = 22, prefer) {
    let best = [x, z], bs = -1e9;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const px = x + Math.sin(a) * want, pz = z + Math.cos(a) * want;
      const gy = world.heightAt(px, pz);
      let clear = 40;
      for (const c of world.colliders) {
        if (c.top !== undefined && c.top <= gy + 0.4) continue;
        const dx = Math.max(c.x0 - px, 0, px - c.x1);
        const dz = Math.max(c.z0 - pz, 0, pz - c.z1);
        clear = Math.min(clear, Math.hypot(dx, dz));
        if (clear < 4) break;
      }
      // flat ground, too: a dragon on a hillside reads as a dragon in a hole
      const slope = Math.abs(gy - world.heightAt(x, z));
      // a bearing to lean toward, so "back off" does not mean "walk round it"
      const bias = prefer === undefined ? 0 : 7 * Math.cos(a - prefer);
      const score = clear - slope * 2 + bias;
      if (score > bs) { bs = score; best = [px, pz]; }
    }
    return best;
  }

  const distTo = (p) => Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);

  /**
   * Walk behind an animal that is showing you somewhere.
   *
   * Five metres back while it is walking, so the street it is leading you down
   * is in the shot -- and right up to it the moment it arrives, because the
   * arrival is only credited while **both** of you are inside the landmark
   * (`checkArrival` in `world/pets.js`).  Hanging back politely at the end is
   * how you follow an animal for a minute and go home without it.
   */
  function guide(p, dt) {
    if (!p) { hold(); return; }
    const d = distTo(p);
    const close = p.state === 'arrived' || p.state === 'wait';
    const arrive = close ? 2.2 : 5.0;
    /* Walking straight at it only works while it is in the same street.  An
     * animal that has gone round a corner is an animal on the far side of a
     * building, and following it by bearing alone puts the walker's face in
     * the wall for the rest of the beat -- which is exactly how a minute of
     * "following" turned into a minute of a wall.  Past nine metres, or the
     * moment the sidestep has fired twice, take the graph instead and re-plan
     * as it moves. */
    if (d > 9 || walk.stuckN >= 2) {
      S.guideT = (S.guideT ?? 0) - dt;
      if (!S.guideGo || S.guideT <= 0) {
        S.guideGo = plan(p.x, p.z, arrive);
        S.guideT = 2.5;
      }
      journey(S.guideGo, dt, { run: d > 12, turn: 2.4 });
    } else {
      S.guideGo = null;
      walkTo(p.x, p.z, dt, { arrive, run: d > (close ? 8 : 10), turn: 2.4 });
    }
    pitchTo(clamp(pitchAt(p.x, p.z, close ? 0.9 : 1.5), -0.24, 0.12), dt, 0.6);
  }

  /**
   * Keep the guide guiding.
   *
   * A lead is abandoned by the animal itself when the route beats it three
   * times or when you fall too far behind, and what is left is an animal
   * standing in a street.  Ask again -- and if this one has run out of places
   * it knows, take the offer to whichever one has not.
   */
  function keepGuiding(key, dt) {
    const p = S[key];
    if (!p) return;
    S[key + 'T'] = (S[key + 'T'] ?? 0) - dt;
    if (isGuiding(p) || p.state === 'follow' || p.state === 'stay') return;
    if (S[key + 'T'] > 0) return;
    S[key + 'T'] = 7;
    if (pets.lead(p)) return;
    const fresh = nearestWild(45, [S.pet1, S.pet2].filter(Boolean));
    if (fresh && pets.lead(fresh)) S[key] = fresh;
  }

  /** Aim at a thing and press E; true once the card is open or the deed is done. */
  function interactWith(tx, tz, h, dt) {
    turnTo(bearing(tx, tz), dt, 2.4);
    pitchTo(pitchAt(tx, tz, h), dt, 1.2);
    if (hud.choiceOpen) return true;
    if (player.hovered) { player.onInteract(player.hovered); return true; }
    return false;
  }

  /** Press a key through the page's own handlers, exactly as a keyboard does. */
  function tap(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true })), 60);
  }

  /* ================================ the show ================================ */

  /* The places, straight off the town's own landmark graph (`nav.nodes`), so
   * every one of them is somewhere the router can actually get to. */
  const P = {
    start:      [1.9, 13.6],
    crossing:   [1.8, 4.6],
    rest:       [12.9, 9.6],
    backalley:  [13.5, 16.6],
    shotengai:  [22.2, 20],
    showa:      [22.2, 34.2],
    park:       [33, 28],
    shrine:     [-27.9, 28],
    canal:      [-34, -20.6],
    kobato:     [2.4, -29.5],
    school:     [12.6, -49.5],
    schoolyard: [40, -44.2],
  };

  /* Where the dragon is put for its scene.  Stage direction, and the only one
   * in the file: the school ground is the one piece of open, flat, un-fenced
   * land big enough to walk a seven-metre animal round -- and it is where the
   * wild one roosts anyway, so this is a cue, not a cheat. */
  const DRAGON_MARK = [46, -48];

  const beats = [];
  const beat = (dur, name, step, enter) => beats.push({ dur, name, step, enter });
  const S = {};   // scratch shared between beats

  const goTo = (p, arrive) => goVia([p], arrive);

  /* ---- 1. the opening ---------------------------------------------------- */
  beat(20, 'opening', (t) => {
    hold();
    // a slow pan off the crossing and back, the way you look up on arriving
    const a = t / 20;
    player.yaw = 0.2 + Math.sin(a * Math.PI * 2) * 0.9;
    player.pitch = 0.04 + Math.sin(a * Math.PI * 4) * 0.05;
  }, () => {
    player.pos.set(P.start[0], player.pos.y, P.start[1]);
    player.pos.y = world.heightAt(P.start[0], P.start[1]);
    player.yaw = 0.2;
    player.pitch = 0.04;
  });

  /* ---- 2. the crossing, and a train ------------------------------------- */
  beat(28, 'the-crossing', (t, dt) => {
    if (t < 16) journeyVia(dt, { pitch: 0.02 });
    else {
      // the opening composition: the barrier, the rails, the town behind them
      hold();
      turnTo(0.16, dt, 0.7);
      pitchTo(0.02, dt, 0.5);
      drift(t, 0.3, 0.5);
    }
    // fetch a train so it trips the bells while we are standing here
    if (t > 9 && !S.trainCalled) { S.trainCalled = true; world.crossing.request?.(); }
  }, () => goTo(P.crossing, 1.6));

  beat(20, 'the-rails', (t, dt) => {
    hold();
    /* Follow the train across the frame.  Which way it is coming from is
     * `train.dir`, and the sign of the pan has to match it or the camera turns
     * away from the thing it is watching. */
    const way = Math.sign(world.train?.dir ?? 1) || 1;
    turnTo(0.16 - way * 0.5 + way * (t / 20) * 1.0, dt, 0.5);
    pitchTo(0.02, dt, 0.5);
  });

  /* ---- 3. a can from the machine ---------------------------------------- */
  beat(26, 'the-vending-machine', (t, dt) => {
    const v = S.vend ?? (S.vend = nearestInteractable('自動販売機'));
    if (!v) { hold(); drift(t); return; }
    if (t < 17) {
      const d = Math.hypot(wrapDelta(v.x, player.pos.x), v.z - player.pos.z);
      // 2.9 m: inside the 3 m the pick reaches, and far enough back that the
      // machine is a machine in a street rather than a wall of colour
      if (d > 2.9) walkTo(v.x, v.z, dt, { arrive: 2.8, turn: 2.4 });
      else if (!S.vended) {
        hold();
        if (interactWith(v.x, v.z, 1.4, dt)) S.vended = true;
      } else { hold(); pitchTo(-0.18, dt, 0.8); }
    } else { hold(); pitchTo(-0.12, dt, 0.6); drift(t, 0.15, 0.5); }
  });

  /* ---- 4. the shopping street -------------------------------------------- */
  beat(32, 'into-the-shotengai', (t, dt) => {
    journeyVia(dt, { pitch: 0.03 });
  }, () => goTo(P.shotengai, 2.0));

  /* North up the shopping street rather than east to the park.
   *
   * The park is on the far side of the 商店街's north fence -- the L where
   * x = 31.8 meets z = 17.4 -- and walking to it drops the walker into the
   * pocket inside that L.  Which would be survivable if the animals did not
   * *live* there: every encounter then starts in the corner, the guide walks
   * out through a gap the walker cannot use, and the follow becomes a minute
   * of a fence.  昭和 is up the same street, on the open side of it. */
  beat(24, 'along-the-street', (t, dt) => {
    journeyVia(dt);
    if (t > 18) pitchTo(0.06, dt, 0.5);
  }, () => goTo(P.showa, 2.0));

  /* ---- 5. the animals ----------------------------------------------------
   * Two encounters, played the way the game means them: say hello to the
   * first, and ask the second to show you somewhere.  The lead is the whole
   * mechanic -- the animal walks a route to a landmark it knows, you have to
   * keep up, and when you both arrive it is yours.
   */
  beat(34, 'hello', (t, dt) => {
    const p = S.pet1 ?? (S.pet1 = nearestWild(50));
    if (!p) { hold(); drift(t); return; }
    const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);
    if (d > 2.3 && !hud.choiceOpen) {
      walkTo(p.x, p.z, dt, { arrive: 2.1, run: d > 16, turn: 2.6 });
      pitchTo(pitchAt(p.x, p.z, 0.5), dt, 1.0);
    } else if (!S.said) {
      hold();
      if (interactWith(p.x, p.z, 0.5, dt) && hud.choiceOpen) { tap('Digit1'); S.said = true; }
    } else {
      hold();
      turnTo(bearing(p.x, p.z), dt, 2.0);
      pitchTo(pitchAt(p.x, p.z, 0.4), dt);
    }
  });

  beat(22, 'ask-the-way', (t, dt) => {
    const p = S.pet1;
    if (!p) { hold(); return; }
    const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);
    if (d > 2.3 && !hud.choiceOpen) walkTo(p.x, p.z, dt, { arrive: 2.1, turn: 2.6 });
    else if (!S.asked) {
      hold();
      if (interactWith(p.x, p.z, 0.5, dt) && hud.choiceOpen) { tap('Digit2'); S.asked = true; }
    } else {
      hold();
      turnTo(bearing(p.x, p.z), dt, 2.2);
      pitchTo(pitchAt(p.x, p.z, 0.4), dt);
    }
    // a lead that never started is a dead minute: start it by hand
    if (t > 17 && !isGuiding(p) && p.state !== 'follow') pets.lead(p);
  });

  beat(70, 'following', (t, dt) => {
    keepGuiding('pet1', dt);
    guide(S.pet1, dt);
  });

  beat(14, 'the-landmark', (t, dt) => {
    const p = S.pet1;
    // the first seconds are still the walk: the animal is dancing on a spot
    // you have to be standing on too before it is yours
    if (p && t < 7) { guide(p, dt); return; }
    hold();
    if (p && t < 10) {
      turnTo(bearing(p.x, p.z), dt, 1.6);
      pitchTo(pitchAt(p.x, p.z, 0.5), dt);
    } else {
      pitchTo(0.16, dt, 0.4);
      player.yaw += 0.17 * dt;      // look up at whatever it brought you to
    }
  });

  /* A second animal, and a second landmark, so the parade is a parade. */
  beat(30, 'another-one', (t, dt) => {
    const p = S.pet2 ?? (S.pet2 = nearestWild(70, [S.pet1]));
    if (!p) { hold(); drift(t); return; }
    const d = Math.hypot(wrapDelta(p.x, player.pos.x), p.z - player.pos.z);
    if (d > 2.3 && !hud.choiceOpen) walkTo(p.x, p.z, dt, { arrive: 2.1, run: d > 12, turn: 2.6 });
    else if (!S.asked2) {
      hold();
      if (interactWith(p.x, p.z, 0.5, dt) && hud.choiceOpen) { tap('Digit2'); S.asked2 = true; }
    } else { hold(); turnTo(bearing(p.x, p.z), dt, 2.2); }
    if (t > 24 && !isGuiding(p) && p.state !== 'follow') pets.lead(p);
  });

  beat(56, 'following-again', (t, dt) => {
    keepGuiding('pet2', dt);
    guide(S.pet2, dt);
  });

  beat(18, 'the-parade', (t, dt) => {
    /* An animal that has arrived and is dancing on the spot is still only
     * *offering*; it becomes yours when you are standing there too.  So the
     * first seconds of this beat are for walking the last few metres to
     * anything still waiting, and only then for turning round to look. */
    const waiting = [S.pet1, S.pet2].find((p) => p && (p.state === 'arrived' || p.state === 'wait'));
    if (waiting && t < 9 && distTo(waiting) > 2.4) { guide(waiting, dt); return; }
    hold();
    if (t < 14) { player.yaw += 1.05 * dt; pitchTo(-0.12, dt, 0.5); }
    else { pitchTo(0.04, dt, 0.5); drift(t, 0.2, 0.4); }
  });

  /* ---- 6. across town, to the school ------------------------------------- */
  /* Over the railway by the crossing and down the 通学路.  Left to the router
   * this leg goes east along the lineside, and the lineside is a platform edge
   * with a track bed under it: the graph's edges are sampled straight lines,
   * the walker steps off the platform, and the film spends four minutes in a
   * ballast trench.  The waypoints are the road. */
  beat(44, 'across-town', (t, dt) => {
    /* The one walk the film cannot do without, so it gets an insurance policy.
     *
     * Everything downstream -- the dragon, the fire, the flight -- happens on
     * the school ground, and this is the leg that gets there.  If ten seconds
     * of it have bought less than five metres the walker is in a corner it is
     * not going to talk its way out of in the time available, so press `R`:
     * the game's own "put me back at the opening view", which lands the player
     * at the crossing, at the top of a road chain that is known to go all the
     * way to the school.  It is a cut, and it is a cut the player could have
     * made themselves. */
    for (const [when, flag] of [[11, 'r1'], [26, 'r2']]) {
      if (t > when && !S[flag]) {
        S[flag] = true;
        const moved = Math.hypot(wrapDelta(player.pos.x, S.acrossX), player.pos.z - S.acrossZ);
        if (moved < 5) {
          tap('KeyR');
          S.go = null;
          goVia([P.crossing, P.kobato, P.school], 2.4);
        }
        S.acrossX = player.pos.x;
        S.acrossZ = player.pos.z;
      }
    }
    journeyVia(dt, { run: true });
  }, () => {
    S.acrossX = player.pos.x;
    S.acrossZ = player.pos.z;
    goVia([P.crossing, P.kobato, P.school], 2.4);
  });

  beat(28, 'the-school-ground', (t, dt) => {
    journeyVia(dt, { run: true });
  }, () => goTo(P.schoolyard, 2.4));

  /* ---- 7. the dragon ------------------------------------------------------ */
  beat(20, 'something-out-there', (t, dt) => {
    hold();
    const d = dragon();
    if (!d) { drift(t); return; }
    const g = d.debug;
    turnTo(bearing(g.x, g.z), dt, 0.8);
    pitchTo(pitchAt(g.x, g.z, 2.8), dt, 0.5);
  }, () => {
    /* Stage direction, and the only one in the file.  The mark is the school
     * ground; but a fifteen-minute walk across a town is not guaranteed to end
     * where it was aimed, and a dragon eighty metres away is not a scene.  If
     * the walk fell short, the animal comes to the walker instead -- onto the
     * most open ground within sight of wherever they actually are. */
    const d = dragon();
    if (!d) return;
    const far = Math.hypot(wrapDelta(DRAGON_MARK[0], player.pos.x),
      DRAGON_MARK[1] - player.pos.z);
    const mark = far < 45 ? DRAGON_MARK : openGroundNear(player.pos.x, player.pos.z, 22);
    d.teleport(mark[0], mark[1], 0);
    d.force('idle');
  });

  beat(26, 'closer', (t, dt) => {
    const d = dragon();
    if (!d) { hold(); return; }
    const g = d.debug;
    walkTo(g.x, g.z, dt, { arrive: 11.0, turn: 1.6 });
    pitchTo(pitchAt(g.x, g.z, 3.2), dt, 0.6);
    if (t > 8 && !S.roared) { S.roared = true; d.force('roar'); }
  });

  /* Thirty metres, and not one metre closer, because of where the fire goes.
   *
   * `pickTarget` throws at a bearing 0.55-1.35 rad *off the line to whoever is
   * watching*, eleven to twenty-one metres out -- deliberately beside you
   * rather than at you.  Stand at eleven metres and the geometry puts every
   * one of those landing points seventy degrees off the view axis: the jaw
   * opens on camera and the fireball is thrown clean out of frame.  At thirty
   * the same cone closes to about fifteen degrees and the whole arc, from jaw
   * to burst, is in one shot.
   */
  const FIRE_STAND = 21;

  beat(38, 'the-fire', (t, dt) => {
    const d = dragon();
    if (!d) { hold(); return; }
    const g = d.debug;
    if (t < 13 && S.fireSpot) {
      const r = walkTo(S.fireSpot[0], S.fireSpot[1], dt, { arrive: 2.2, run: true, turn: 2.6 });
      if (r.arrived) turnTo(bearing(g.x, g.z), dt, 1.6);
    } else {
      hold();
      turnTo(bearing(g.x, g.z), dt, 1.4);
    }
    pitchTo(pitchAt(g.x, g.z, 3.4), dt, 0.7);
    // two breaths, framed: the second while the first is still burning out
    if (t > 15 && !S.f1) { S.f1 = true; d.breathe(); }
    if (t > 30 && !S.f2) { S.f2 = true; d.breathe(); }
  }, () => {
    const d = dragon();
    if (!d) return;
    d.force('idle');
    /* Where to stand, chosen rather than reversed into: the clearest ground at
     * the right distance, leaning toward the side we are already on.  Backing
     * straight down the line we walked in on put a cherry tree in the middle
     * of the shot and the dragon in a gap between two houses. */
    const g = d.debug;
    /* On its mark, the seat is a fixed one: twenty metres west of the animal,
     * out on the school ground, with the whole yard behind it and the school
     * buildings well off to the side.  `openGroundNear` scores the clearance
     * *at* a spot and knows nothing about what will be behind the fireball, so
     * left to itself it took the lane between the gym and the fence -- a shot
     * of a dragon through a gap, with a cherry tree in the right third.  The
     * school ground is the rectangle x >= 36, z = -67..-43; twenty metres east
     * of the mark is inside it, in the open, with the school buildings behind
     * the animal.  Only
     * when the animal had to be brought to the walker instead is the spot
     * worth searching for. */
    const onMark = Math.hypot(wrapDelta(DRAGON_MARK[0], g.x), DRAGON_MARK[1] - g.z) < 6;
    if (onMark) {
      S.fireSpot = [g.x + FIRE_STAND, g.z + 2];
    } else {
      const toMe = Math.atan2(wrapDelta(player.pos.x, g.x), player.pos.z - g.z);
      S.fireSpot = openGroundNear(g.x, g.z, FIRE_STAND, toMe);
    }
  });

  beat(20, 'walk-round-it', (t, dt) => {
    const d = dragon();
    if (!d) { hold(); return; }
    const g = d.debug;
    // an arc round the animal, keeping it in frame
    const a = Math.atan2(wrapDelta(player.pos.x, g.x), player.pos.z - g.z) + 0.55 * dt;
    const rad = 9.5;
    walkTo(g.x + Math.sin(a) * rad, g.z + Math.cos(a) * rad, dt, { arrive: 0.8, turn: 2.6 });
    turnTo(bearing(g.x, g.z), dt, 1.6);
    pitchTo(pitchAt(g.x, g.z, 3.0), dt, 0.8);
  });

  /* ---- 8. climbing on ----------------------------------------------------- */
  beat(22, 'climb-on', (t, dt) => {
    const d = dragon();
    if (!d || d.riding) { hold(); return; }
    const g = d.debug;
    const dist = Math.hypot(wrapDelta(g.x, player.pos.x), g.z - player.pos.z);
    if (dist > 3.2) {
      walkTo(g.x, g.z, dt, { arrive: 3.0, turn: 2.4 });
      pitchTo(pitchAt(g.x, g.z, 2.2), dt);
    } else {
      hold();
      if (interactWith(g.x, g.z, 2.0, dt) && hud.choiceOpen) tap('Digit2');   // "climb on"
    }
    // the fallback is for a card that did not open, not for a dragon in the
    // next postcode: from out there, a mount is a jump cut
    if (t > 17 && !d.riding && dist < 12) d.mountRider();
  }, () => { const d = dragon(); if (d) d.force('idle'); });

  beat(20, 'walking-it', (t, dt) => {
    // on its back, on the ground: W walks the animal
    hold('KeyW');
    turnTo(bearing(30, -60), dt, 0.5);
    pitchTo(0.02, dt, 0.5);
  });

  /* ---- 9. flight ---------------------------------------------------------- */
  beat(26, 'take-off', (t, dt) => {
    hold('KeyW', 'Space');
    turnTo(bearing(16, -18), dt, 0.35);
    pitchTo(0.10, dt, 0.4);
  });

  beat(38, 'over-the-town', (t, dt) => {
    fly(dt, { rad: 78, alt: 46, pitch: -0.20 });
  });

  beat(30, 'boost', (t, dt) => {
    fly(dt, { rad: 92, alt: 42, pitch: -0.08, boost: true, lead: 0.6 });
  });

  beat(28, 'the-ceiling', (t, dt) => {
    fly(dt, { rad: 105, alt: 90, pitch: 0.20, boost: true, lead: 0.55 });
  });

  beat(24, 'the-horizon', (t, dt) => {
    fly(dt, { rad: 100, alt: 88, pitch: -0.02, lead: 0.9, turn: 0.55 });
  });

  beat(42, 'fire-from-the-air', (t, dt) => {
    // down to rooftop height over the district, and one at each pass
    fly(dt, { rad: 62, alt: 34, pitch: -0.34, lead: 0.85 });
    for (const [when, flag] of [[7, 'a1'], [17, 'a2'], [27, 'a3'], [36, 'a4']]) {
      if (t > when && !S[flag]) { S[flag] = true; tap('KeyF'); }
    }
  });

  beat(34, 'the-long-way-down', (t, dt) => {
    // off the orbit and onto the school ground, sinking all the way
    hold('KeyW');
    turnTo(bearing(P.schoolyard[0], P.schoolyard[1]), dt, 0.5);
    pitchTo(-0.26, dt, 0.25);
  });

  /* ---- 10. setting down --------------------------------------------------- */
  beat(36, 'setting-down', (t, dt) => {
    const d = dragon();
    hold();
    pitchTo(-0.06, dt, 0.3);
    if (t > 2 && !S.down) { S.down = true; tap('KeyE'); }              // "set me down"
    if (t > 28 && d && d.rideMode === 'ground' && !S.off) { S.off = true; tap('KeyE'); }
  });

  beat(20, 'off-and-away', (t, dt) => {
    const d = dragon();
    if (d && d.riding) { if (!S.off2) { S.off2 = true; tap('KeyE'); } hold(); return; }
    hold();
    if (d) {
      const g = d.debug;
      turnTo(bearing(g.x, g.z), dt, 1.2);
      pitchTo(pitchAt(g.x, g.z, 3.0), dt, 0.5);
    }
    drift(t, 0.2, 0.4);
  });

  /* ---- 11. the planet ------------------------------------------------------ */
  beat(10, 'orbit', () => { hold(); }, () => { tap('KeyP'); });

  /* ================================ the clock ================================ */

  let T = 0;
  let idx = -1;
  const trace = [];
  const film = [];      // a sample every ten seconds, for reading a run back
  const marks = [];
  let acc = 0;
  for (const b of beats) { marks.push([acc, acc + b.dur]); acc += b.dur; }
  const TOTAL = acc;

  function flatOf(worldPos) {
    const v = worldPos.clone().sub(new s.THREE.Vector3(0, -R, 0));
    const r = v.length() || 1;
    v.multiplyScalar(1 / r);
    return {
      x: R * Math.atan2(v.x, v.y),
      z: R * Math.asin(clamp(v.z, -1, 1)),
      y: r - R,
    };
  }

  function tick(dt) {
    if (T >= TOTAL) { hold(); return false; }
    T += dt;
    let i = idx;
    while (i + 1 < beats.length && T >= marks[i + 1][0]) i++;
    if (i < 0) i = 0;
    if (i !== idx) {
      idx = i;
      trace.push({
        t: Math.round(T), beat: beats[idx].name,
        x: +player.pos.x.toFixed(1), z: +player.pos.z.toFixed(1),
        pets: pets.companions.length,
        p1: S.pet1?.state ?? null, p2: S.pet2?.state ?? null,
        d: dragon() ? +Math.hypot(wrapDelta(dragon().debug.x, player.pos.x),
          dragon().debug.z - player.pos.z).toFixed(0) : null,
      });
      try { beats[idx].enter?.(); } catch (e) { console.warn('beat enter', beats[idx].name, e); }
    }
    if (Math.floor(T / 10) !== Math.floor((T - dt) / 10)) {
      film.push(`${Math.round(T)} ${beats[idx].name} (${player.pos.x.toFixed(0)},${player.pos.z.toFixed(0)})`
        + ` pets=${pets.companions.length}`
        + (S.pet1 ? ` p1=${S.pet1.state}@${distTo(S.pet1).toFixed(0)}` : '')
        + (S.pet2 ? ` p2=${S.pet2.state}@${distTo(S.pet2).toFixed(0)}` : ''));
    }
    if (!dragon()?.riding && unstick(dt)) return true;
    try { beats[idx].step(T - marks[idx][0], dt); } catch (e) { console.warn('beat', beats[idx].name, e); }
    return true;
  }

  return {
    tick,
    trace,
    film,
    /** DEV: what the router made of a destination, and why. */
    debugRoute(tx, tz) {
      const a = reachableNode(player.pos.x, player.pos.z);
      const b = reachableNode(tx, tz);
      const mine = walkPath(a, b);
      const loose = walkPath(a, b, 1);
      const theirs = a >= 0 && b >= 0 ? NAV.path(a, b) : null;
      let open = 0, shut = 0;
      for (let i = 0; i < NAV.nodes.length; i += 7) {
        for (const e of NAV.adj[i]) { if (openEdge(i, e.to)) open++; else shut++; }
      }
      return {
        from: a, to: b,
        directClear: clearLine(player.pos.x, player.pos.z, tx, tz),
        mine: mine ? mine.length : null,
        loose: loose ? loose.length : null,
        theirs: theirs ? theirs.length : null,
        sampledEdges: { open, shut },
        roads: roadStats,
        theirEdges: theirs ? theirs.slice(0, -1).map((n, i) => {
          const p = NAV.nodes[n], q = NAV.nodes[theirs[i + 1]];
          return `${p.x.toFixed(0)},${p.z.toFixed(0)} -> ${q.x.toFixed(0)},${q.z.toFixed(0)}`
            + ` ${clearLine(p.x, p.z, q.x, q.z) ? 'ok' : (clearLine(p.x, p.z, q.x, q.z, LOOSE) ? 'LOOSE' : 'SHUT')}`;
        }) : null,
        plan: plan(tx, tz).pts.slice(0, 8),
      };
    },
    /** DEV: the walker on its own, for testing a route without the film. */
    dev: {
      goVia,
      walkStep: (dt) => { if (!unstick(dt)) journeyVia(dt, { run: true }); },
      at: () => [+player.pos.x.toFixed(1), +player.pos.z.toFixed(1)],
      dbg: () => ({
        at: [+player.pos.x.toFixed(1), +player.pos.z.toFixed(1)],
        i: S.go?.i, n: S.go?.pts.length,
        next: S.go?.pts.slice(S.go.i, S.go.i + 3).map((p) => [+p[0].toFixed(1), +p[1].toFixed(1)]),
        clearNext: S.go && S.go.i < S.go.pts.length
          ? clearLine(player.pos.x, player.pos.z, S.go.pts[S.go.i][0], S.go.pts[S.go.i][1]) : null,
        esc: +escape.left.toFixed(1), pressT: +walk.pressT.toFixed(0),
      }),
      place: (x, z) => {
        player.pos.set(x, 0, z);
        player.pos.y = world.heightAt(x, z);
      },
    },
    get total() { return TOTAL; },
    get now() { return T; },
    get label() { return beats[Math.max(0, idx)]?.name ?? '-'; },
    plan: beats.map((b, i) => ({ at: marks[i][0], dur: b.dur, name: b.name })),
    state() {
      const d = dragon();
      return {
        t: +T.toFixed(1), beat: beats[Math.max(0, idx)]?.name,
        x: +player.pos.x.toFixed(1), z: +player.pos.z.toFixed(1), y: +player.pos.y.toFixed(1),
        yaw: +player.yaw.toFixed(2), pitch: +player.pitch.toFixed(2),
        keys: [...player.keys].join('+'),
        companions: pets.companions.length,
        p1: S.pet1 ? S.pet1.state + '@' + distTo(S.pet1).toFixed(0) : null,
        p2: S.pet2 ? S.pet2.state + '@' + distTo(S.pet2).toFixed(0) : null,
        ride: d ? { riding: d.riding, mode: d.rideMode, alt: d.debug.alt, speed: d.debug.speed } : null,
        dragon: d ? d.debug.state : null,
      };
    },
  };
})();
