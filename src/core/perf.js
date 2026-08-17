import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 * Making a twenty-thousand-mesh district submit like a small one.
 *
 * The measurement that shapes this whole file: with the frame timed by
 * `gl.finish()`, the time spent *submitting* a frame and the time spent
 * *completing* one are the same number to two decimal places -- 87.7 ms
 * either way at the crossing.  The GPU is not the thing that is busy.  It is
 * idle, waiting on a main thread that is walking a scene graph and issuing
 * six thousand draw calls at about eight microseconds each.
 *
 * Halving the internal resolution changes nothing (91.5 ms against 91.8 ms),
 * pulling the far plane in to the fog wall changes nothing (two draw calls),
 * and a smaller shadow map changes nothing.  None of those are the cost.  The
 * count of things submitted is the cost, so all three passes below reduce a
 * count:
 *
 *   `dedupeMaterials`  3 979 material objects -> ~930.  Same draw calls, but
 *                      each one that shares its material with the last skips a
 *                      uniform upload and a state change.  Worth 12 ms, and it
 *                      is also what makes the merge below able to see that two
 *                      meshes in different districts are the same grey.
 *   `mergeStatic`      20 600 static meshes -> a few thousand, grouped by
 *                      material and by a spatial cell so frustum culling still
 *                      has something to throw away.  The colour pass and the
 *                      shadow pass both draw these, so both get shorter.
 *   `freezeStatic`     23 700 objects whose matrix is the identity and will
 *                      never change again, and which three re-derives on every
 *                      frame.  Worth 8-11 ms of pure main thread.
 *
 * All three run after `bakeToPlanet`, and they depend on what it leaves
 * behind: every static mesh has an identity transform with its geometry in
 * root space.  That is what makes a merge a concatenation rather than a
 * re-projection, and it is why none of this can move earlier in the build.
 * ------------------------------------------------------------------ */

/* ------------------------------ dedupe ------------------------------ */

/**
 * Everything about a material that changes how it draws.
 *
 * Two materials with the same signature are interchangeable, so all but one of
 * them can be dropped.  Anything not listed here is either not used in this
 * scene or does not affect the result; the price of missing something is a
 * visible bug, so the list is deliberately long rather than clever.
 */
function materialSignature(m) {
  const parts = [
    m.type, m.side, m.blending, m.transparent, m.opacity, m.alphaTest,
    m.depthTest, m.depthWrite, m.visible, m.vertexColors, m.flatShading,
    m.wireframe, m.toneMapped, m.fog, m.dithering, m.premultipliedAlpha,
    m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits,
    m.shadowSide, m.clipShadows, m.colorWrite, m.stencilWrite,
    m.color?.getHexString(), m.emissive?.getHexString(), m.emissiveIntensity,
    m.specular?.getHexString(), m.shininess, m.roughness, m.metalness,
    m.reflectivity, m.refractionRatio, m.sheen, m.clearcoat, m.iridescence,
    m.transmission, m.thickness, m.ior, m.bumpScale, m.displacementScale,
    m.displacementBias, m.aoMapIntensity, m.lightMapIntensity,
    m.normalScale?.x, m.normalScale?.y, m.sizeAttenuation, m.linewidth,
    m.combine, m.wireframeLinewidth, m.alphaToCoverage, m.forceSinglePass,
  ];
  // texture slots compare by identity: a shared texture is the common case
  for (const slot of [
    'map', 'gradientMap', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap',
    'emissiveMap', 'envMap', 'lightMap', 'metalnessMap', 'normalMap',
    'roughnessMap', 'specularMap', 'matcap', 'clearcoatMap', 'sheenColorMap',
    'transmissionMap', 'thicknessMap', 'iridescenceMap',
  ]) parts.push(m[slot]?.uuid ?? '-');

  /* A raw shader is its source plus the values it was given.  The outline
   * shells are 1 085 separate `ShaderMaterial`s built from one pair of
   * strings, differing only in thickness and colour, so without this they
   * would all look distinct and none of them would dedupe. */
  if (m.isShaderMaterial) {
    parts.push(m.vertexShader, m.fragmentShader, JSON.stringify(m.defines ?? null));
    const keys = Object.keys(m.uniforms ?? {}).sort();
    for (const k of keys) {
      const v = m.uniforms[k]?.value;
      /* `uResolution` is the viewport, identical in every one of them and
       * rewritten on resize through the registry in `outline.js`, so it must
       * not be allowed to make two otherwise identical shells differ. */
      if (k === 'uResolution') { parts.push(k); continue; }
      if (v == null) parts.push(k + ':-');
      else if (v.isColor) parts.push(k + ':' + v.getHexString());
      else if (v.isTexture) parts.push(k + ':' + v.uuid);
      else if (v.isVector2 || v.isVector3 || v.isVector4) parts.push(k + ':' + v.toArray().join(','));
      else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') parts.push(k + ':' + v);
      else parts.push(k + ':?' + m.uuid);   // unknown shape: refuse to share
    }
  }
  return parts.join('|');
}

/**
 * A material that something animates cannot be shared, because sharing it
 * means the animation reaches every mesh that happens to be the same colour.
 *
 * Three of them do: the bathhouse steam and the pool haze drive `opacity`, and
 * the crossing lamps drive `color`.  They say so themselves -- see
 * `markDynamicMaterial` -- and this only has to notice.
 */
function isShareable(m) {
  return !!m && !m.userData?.dynamicMaterial;
}

/** Say that something animates this material's uniforms, so it must stay its own. */
export function markDynamicMaterial(m) {
  if (!m) return m;
  (m.userData ||= {}).dynamicMaterial = true;
  return m;
}

/**
 * Point every mesh at one canonical material per signature.
 *
 * Nothing about the frame changes except how often the renderer has to rebind:
 * the draw call count is identical afterwards, and so is the image.
 */
export function dedupeMaterials(root) {
  const canon = new Map();
  /* Every material this pass ever saw, survivors included -- the ones to free
   * are the difference between this and what is still pointed at afterwards,
   * and a set of only the survivors cannot express that. */
  const everySeen = new Set();
  let repointed = 0, refs = 0;

  const pick = (m) => {
    everySeen.add(m);
    if (!isShareable(m)) return m;
    const key = materialSignature(m);
    const first = canon.get(key);
    if (!first) { canon.set(key, m); return m; }
    if (first !== m) repointed++;
    return first;
  };

  root.traverse((o) => {
    if (!o.isMesh && !o.isLine && !o.isPoints && !o.isSprite) return;
    if (!o.material) return;
    if (Array.isArray(o.material)) {
      refs += o.material.length;
      o.material = o.material.map(pick);
    } else {
      refs++;
      o.material = pick(o.material);
    }
  });

  /* Freeing the orphans is half the point of doing this at build time: a
   * duplicate that nothing points at still holds a GPU program and its uniform
   * blocks until it is disposed.  Only materials nothing references any more
   * are touched, and the live set is recomputed rather than inferred. */
  const live = new Set();
  root.traverse((o) => {
    if (!o.material) return;
    [].concat(o.material).forEach((m) => live.add(m));
  });
  let disposed = 0;
  for (const m of everySeen) {
    if (!live.has(m)) { m.dispose(); disposed++; }
  }

  return { refs, unique: everySeen.size, canonical: live.size, repointed, disposed };
}

/* ------------------------------- merge ------------------------------- */

/**
 * Which meshes may be concatenated with their neighbours.
 *
 * The rule is conservative on purpose. Anything that another system holds a
 * reference to, animates, sorts, or reads back has to survive as itself:
 *
 *  - **instanced** meshes are already one call for their whole cloud;
 *  - **rigid rigs** and their subtrees turn, slide and blink;
 *  - anything with **children** is somebody's parent -- an outline shell hangs
 *    off its mesh, and a vending machine hangs its `E` hitbox off its body;
 *  - **hitboxes** are what the interaction raycast reads, and it identifies
 *    what you are looking at by which mesh was hit;
 *  - **transparent** materials are depth-sorted per object, and a cell-sized
 *    blob sorts as one distance, so glass would start drawing through walls;
 *  - **morphed or skinned** geometry is animated per vertex;
 *  - anything **not frustum culled** was excluded from culling deliberately
 *    (the sky dome, the petal cloud) and is not district geometry at all.
 */
function mergeableMesh(o, skip) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return false;
  if (skip.has(o)) return false;
  if (o.children.length) return false;
  if (!o.frustumCulled) return false;
  if (o.userData.noMerge || o.userData.planetRigid) return false;
  if (o.morphTargetInfluences?.length) return false;
  if (!o.geometry || !o.geometry.attributes.position) return false;
  if (o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) return false;
  /* Note what is deliberately *not* checked here: `geometry.groups`.  Every
   * `BoxGeometry` in three carries six of them, one per face, and this town is
   * mostly boxes -- refusing them cost 11 704 of the 20 600 candidates, which
   * was most of the win.  Groups only ever reach the renderer through an array
   * material, and an array material is refused on the next line, so for
   * everything that gets past it the groups are already dead weight and
   * `mergeGeometries(…, false)` is right to drop them. */
  const m = o.material;
  if (!m || Array.isArray(m)) return false;
  if (m.transparent) return false;
  return true;
}

const _c = new THREE.Vector3();

/**
 * Concatenate static geometry per material, per cell of a coarse grid.
 *
 * Merging by material alone would be fewer draw calls still -- 4 290 meshes
 * become one per material -- and would be *slower*, because each of those
 * spans the district and so no longer culls: the crossing would draw all of
 * them instead of the 1 325 it can see.  The grid is what keeps both
 * properties, and 32 m is where the two curves cross on this world (measured:
 * 1 187 calls at 50 m, 1 325 at 32 m, 1 727 at 20 m, but the 50 m cells drag
 * in geometry from two streets away).
 *
 * The group key carries everything that would otherwise be lost by fusing two
 * meshes into one: both shadow flags, the render order, the layer mask, the
 * visibility, whether the geometry is indexed, and its exact attribute set --
 * that last one because merging a geometry that has UVs with one that does not
 * means dropping UVs from both, which unwraps every texture in the group.
 */
export function mergeStatic(root, { cell = 32, skip = new Set() } = {}) {
  const groups = new Map();
  const stats = { candidates: 0, merged: 0, produced: 0, groups: 0, skipped: 0 };

  /* About three hundred meshes here share a geometry with another mesh.  A
   * merged group may therefore hold only *some* of the users of the buffer it
   * is about to concatenate, and freeing it would empty a mesh that is still
   * standing somewhere.  So count the users first and free only the buffers
   * whose every user is being merged away. */
  const users = new Map();
  root.traverse((o) => {
    if (!o.isMesh && !o.isLine && !o.isPoints) return;
    if (o.geometry) users.set(o.geometry, (users.get(o.geometry) || 0) + 1);
  });

  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!mergeableMesh(o, skip)) { stats.skipped++; return; }
    stats.candidates++;
    const g = o.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _c.copy(g.boundingSphere.center);
    /* Item size and not just the name: a `color` attribute is three floats in
     * some of these builders and four in others, and `mergeGeometries` rejects
     * the mix -- which would silently drop the whole group. */
    const attrs = Object.keys(g.attributes).sort()
      .map((n) => `${n}:${g.attributes[n].itemSize}`).join(',');
    const key = [
      o.material.uuid, attrs, !!g.index,
      o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0,
      o.renderOrder, o.layers.mask, o.visible ? 1 : 0,
      Math.floor(_c.x / cell), Math.floor(_c.y / cell), Math.floor(_c.z / cell),
    ].join('|');
    let bucket = groups.get(key);
    if (!bucket) groups.set(key, (bucket = []));
    bucket.push(o);
  });

  stats.groups = groups.size;

  for (const bucket of groups.values()) {
    // a group of one is already the cheapest it can be; leave it alone
    if (bucket.length < 2) continue;
    const first = bucket[0];
    const geos = bucket.map((o) => o.geometry);
    let merged;
    try {
      merged = mergeGeometries(geos, false);
    } catch {
      merged = null;
    }
    if (!merged) continue;

    const mesh = new THREE.Mesh(merged, first.material);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.renderOrder = first.renderOrder;
    mesh.layers.mask = first.layers.mask;
    mesh.visible = first.visible;
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.name = `merged:${first.name || first.material.type}`;
    mesh.userData.mergedFrom = bucket.length;
    /* The bake left every one of these with an identity transform and its
     * geometry in root space, so the concatenation is already in root space
     * too and the merged mesh needs no transform of its own.  Its bounding
     * sphere is therefore a world-space bound, which is what keeps the frustum
     * test on it exact. */
    mesh.updateMatrix();
    root.add(mesh);

    for (const o of bucket) {
      o.removeFromParent();
      const left = (users.get(o.geometry) || 1) - 1;
      users.set(o.geometry, left);
      if (left <= 0) o.geometry.dispose();
    }
    stats.merged += bucket.length;
    stats.produced++;
  }

  return stats;
}

/* --------------------------- instanced culling --------------------------- */

/**
 * Give the instance clouds a real bound, and let them cull like everything else.
 *
 * `bakeToPlanet` turns culling *off* for every `InstancedMesh` on the grounds
 * that a bound would have to come from the instance cloud rather than from the
 * source geometry.  Which is true, and is also the whole method: three's
 * `InstancedMesh.computeBoundingSphere` walks the instance matrices and
 * produces exactly that bound, and `Frustum.intersectsObject` prefers an
 * object's own `boundingSphere` over its geometry's when there is one.  So the
 * test is exact, not approximate.
 *
 * The reason it was worth doing is that these are 362 of the 2 281 things
 * drawn at the crossing and 4.4 of its 5.5 million triangles, in both the
 * colour pass and the shadow pass, and 218 of them are behind the camera or a
 * district away.
 *
 * Two kinds stay unculled.  A cloud that really does span the district (the
 * sleepers run the whole railway) has a bound the size of its span, and
 * testing it only costs time to answer yes -- `maxRadius` drops those.  And a
 * cloud whose matrices are rewritten every frame has a bound that goes stale
 * the moment it is computed; the petals are the case, and they say so by
 * marking their instance matrix `DynamicDrawUsage`, which is a far better
 * signal than a name.
 */
export function cullInstanced(root, { maxRadius = 120 } = {}) {
  const stats = { total: 0, culled: 0, dynamic: 0, spanning: 0 };
  root.traverse((o) => {
    if (!o.isInstancedMesh) return;
    stats.total++;
    if (o.userData.noCull) { stats.dynamic++; return; }
    if (o.instanceMatrix?.usage === THREE.DynamicDrawUsage) { stats.dynamic++; return; }
    o.computeBoundingSphere();
    const r = o.boundingSphere?.radius ?? Infinity;
    if (!(r <= maxRadius)) { stats.spanning++; return; }
    o.frustumCulled = true;
    stats.culled++;
  });
  return stats;
}

/* ------------------------------- freeze ------------------------------- */

/**
 * Stop three re-deriving matrices that will never change again.
 *
 * `matrixAutoUpdate = false` on its own buys nothing measurable (8.39 ms
 * against 8.65 ms), because it only skips composing the local matrix -- the
 * renderer still walks into every one of twenty-three thousand objects to ask.
 * `matrixWorldAutoUpdate = false` is the one that pays: `updateMatrixWorld`
 * skips a child entirely rather than descending into it, so clearing it on the
 * leaves removes the visit as well as the arithmetic.
 *
 * Which is safe here for exactly one reason: after the bake a static mesh's
 * world matrix *is* the identity, and it has no children to carry a stale
 * transform down to.  Anything that moves is either a rigid rig, a light, a
 * camera, or was added after this ran, and none of those are touched.
 */
export function freezeStatic(root, { skip = new Set() } = {}) {
  // one honest pass first, so every matrixWorld below is correct before it is frozen
  root.updateMatrixWorld(true);

  /* Anything a rig can reach is live: the rig turns, and its children have to
   * be re-derived when it does.  Interaction hitboxes are live for the same
   * reason -- the ones that matter hang off something that moves. */
  const dynamic = new Set(skip);
  root.traverse((o) => {
    if (o.userData.planetRigid || o.userData.noFreeze) {
      o.traverse((c) => dynamic.add(c));
      for (let p = o.parent; p && p !== root.parent; p = p.parent) dynamic.add(p);
    }
    if (o.isLight || o.isCamera) {
      dynamic.add(o);
      for (let p = o.parent; p && p !== root.parent; p = p.parent) dynamic.add(p);
    }
  });
  for (const o of skip) {
    for (let p = o.parent; p && p !== root.parent; p = p.parent) dynamic.add(p);
  }

  /* Frozen highest up, not per leaf.  `updateMatrixWorld` skips a child whose
   * `matrixWorldAutoUpdate` is clear *without descending into it*, so clearing
   * the flag on a container that holds nothing live removes its whole subtree
   * from every future traversal in one go -- including the containers the merge
   * pass has just emptied. */
  let frozen = 0, subtrees = 0;
  const freeze = (o) => {
    o.matrixAutoUpdate = false;
    o.matrixWorldAutoUpdate = false;
    frozen++;
  };
  /** @returns true when nothing in this subtree needs re-deriving ever again. */
  const walk = (o) => {
    if (dynamic.has(o)) return false;
    let allStatic = true;
    for (const c of o.children) if (!walk(c)) allStatic = false;
    if (!allStatic) return false;
    if (o !== root) {
      // the subtree is inert; freeze at this node and let the children keep
      // their own flags, which no traversal will ever read again
      freeze(o);
      o.traverse((c) => { if (c !== o) frozen++; });
      subtrees++;
    }
    return true;
  };
  for (const c of root.children) walk(c);

  return { frozen, subtrees, dynamic: dynamic.size };
}

/**
 * Catch the one way `freezeStatic` can be wrong.
 *
 * A frozen object has its matrix updates switched off, so if some updater still
 * writes its position the write lands in the object and never reaches its
 * matrix: it stops moving, and nothing says so.  The canal's train reflection
 * was exactly that -- two transparent panels, driven every frame, not marked --
 * and it took a diff of two screenshots to notice.
 *
 * So dev builds watch for it.  Snapshot every frozen object's local transform,
 * let the world run, and anything whose transform has changed is either a rig
 * that wants `userData.planetRigid` or a prop that wants `userData.noFreeze`.
 */
export function createFreezeAudit(root) {
  const snap = [];
  root.traverse((o) => {
    if (o.matrixAutoUpdate === false || o.matrixWorldAutoUpdate === false) {
      snap.push({ o, p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() });
    }
  });
  return {
    watched: snap.length,
    /** @returns the frozen objects something has moved since the snapshot. */
    check() {
      const moved = [];
      for (const { o, p, q, s } of snap) {
        if (o.position.distanceTo(p) > 1e-6
          || Math.abs(o.quaternion.dot(q)) < 1 - 1e-6
          || o.scale.distanceTo(s) > 1e-6) moved.push(o);
      }
      return moved;
    },
  };
}

/* ---------------------------- shadow budget ---------------------------- */

/**
 * The shadow map is a second pass over the same geometry, and it was costing
 * 23 ms of the 78 ms frame at the crossing: ten thousand casters, five and a
 * half million triangles, every frame, to move a cascade that is 68 m wide by
 * however far a walker travelled in 16 ms.
 *
 * So it is redrawn on a snapped grid instead -- which is what the comment in
 * `main.js` always claimed happened and what the code never did.  Two things
 * force it: the cascade's centre moving into a new cell, and a frame budget,
 * because the train, the gate booms and thirty animals all cast and their
 * shadows must not freeze while the player stands still and watches.
 *
 * Between updates the light's own `shadow.matrix` goes stale along with the
 * map, and that is the point: they stay consistent with each other, so the
 * shadows stay anchored to the world instead of sliding with the camera.
 */
export function createShadowBudget(renderer, light, {
  snap = 2.0,
  maxIdleFrames = 2,
} = {}) {
  renderer.shadowMap.autoUpdate = false;
  let lastKey = null;
  let idle = 1e9;

  return {
    /** Call once per frame, after the light has been seated. */
    update(centre) {
      const key = `${Math.round(centre.x / snap)},${Math.round(centre.y / snap)},${Math.round(centre.z / snap)}`;
      idle++;
      if (key !== lastKey || idle >= maxIdleFrames) {
        lastKey = key;
        idle = 0;
        /* Both flags, and the renderer's one is the one that matters.
         * `WebGLShadowMap.render` opens with
         *
         *   if ( scope.autoUpdate === false && scope.needsUpdate === false ) return;
         *
         * where `scope` is the shadow map itself, so with `autoUpdate` off a
         * per-light `needsUpdate` never gets a chance to be read -- the pass
         * returns before it reaches the light loop.  Setting only the light's
         * flag does not throttle the shadows, it removes them, and it does it
         * silently and while making the frame rate look wonderful. */
        renderer.shadowMap.needsUpdate = true;
        light.shadow.needsUpdate = true;
      }
    },
    /** After anything that invalidates the whole cascade -- the orbit view. */
    invalidate() { lastKey = null; idle = 1e9; },
    get snap() { return snap; },
  };
}
