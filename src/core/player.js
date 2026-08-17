import * as THREE from 'three';
import { clamp } from './util.js';
import { R, basisAt, positionAt, wrapX } from '../world/planet.js';

/* ------------------------------------------------------------------ *
 * First-person walker.
 *
 * Pointer-lock look, accelerated WASD movement, axis-separated AABB
 * collision against the street's colliders, and a terrain height query so
 * the player steps up onto kerbs and follows the slope beyond the
 * crossing.  No crouch, no third person.
 *
 * It also jumps -- see `JUMP` below, and the one thing that block is really
 * about, which is everything a jump deliberately does *not* change.
 *
 * It also *rides*: `mount()` puts the walker on the e-bike, which swaps four
 * things and leaves everything else alone -- see `RIDE` below.  The vehicle
 * itself lives in `world/ebike.js`; the walker never looks inside it.
 * ------------------------------------------------------------------ */

const EYE = 1.62;
const RADIUS = 0.34;
const STEP = 0.38;

/**
 * The jump.
 *
 * `pos.y` is normally a pure follower -- it eases onto whatever
 * `world.heightAt` says the ground is -- and a jump is a *second regime*
 * rather than a modification of that one: while airborne the ease is off and
 * a velocity is integrated instead, and on landing it goes straight back to
 * what it always was.
 *
 * **A jump does not change collision, and that is the decision this block
 * exists to record.**  The tempting version passes the player's actual height
 * to `_resolve` while airborne, so a hop clears a low wall.  It cannot: a
 * garden wall has a collider and no `platform`, so clearing one drops the
 * player *inside* the garden -- or the house, or the world -- and there are
 * hundreds of them across forty modules, none of which was built with a lid.
 * So the horizontal simulation is untouched.  You go up; the town stays where
 * it was.
 *
 * The one thing that does open up is safe in the other direction: `heightAt`
 * is asked from `pos.y`, and a platform is eligible within 0.55 m of it, so a
 * jump reaches a low deck or a bridge-head step you cannot walk onto.  A
 * platform is by definition a surface somebody built to stand on, so that is a
 * feature and it comes free.
 *
 * `coyote` and `buffer` are four lines between a jump that feels made and a
 * jump that feels sampled: one lets you leave a kerb slightly late, the other
 * lets you press slightly early.
 */
export const JUMP = {
  v: 5.0,           // take-off speed: apex 0.78 m, 0.63 s in the air
  gravity: 16,
  coyote: 0.12,     // grace after walking off an edge
  buffer: 0.15,     // grace for pressing before landing
  land: 0.06,       // knee dip on touchdown, in metres
};

/**
 * Riding a machine.
 *
 * Four things change when the player is on the e-bike and deliberately only
 * four: the eye drops to the seat, the speed is a flat 1.5x a run, A and D
 * steer instead of strafing, and the collision footprint grows a nose.
 *
 * The nose is the one that is not cosmetic.  The scooter is 1.65 m long and
 * the rider sits over the seat, so 1.25 m of machine is *in front of* the
 * point the walker collides at -- ride into a wall with the walker's single
 * 0.34 m disc and the handlebars, which are the bottom third of the frame,
 * end up inside it.  A second probe at the front axle, pushed out and then
 * translated back into the body, keeps the whole machine out of the render.
 *
 * `seatFwd` is the other half of the same arithmetic and `ebike.js` reads it:
 * `makeScooter` authors its seat at local x = -0.46, so the machine has to be
 * drawn that far *ahead* of the player for the camera to be sitting on it.
 * Get the two out of step and the rider is either straddling the headstock or
 * floating behind the carrier.
 */
export const RIDE = {
  eye: 1.40,        // eye above the ground, seated: 0.62 m seat plus a torso
  seatFwd: 0.46,    // machine origin ahead of the rider
  nose: 0.92,       // second collision probe, ahead of the rider
  noseR: 0.30,
  reverse: 1.7,     // walking pace, backwards, which is what S is for
  steer: 1.75,      // rad/s on A / D
};

export class Player {
  constructor(camera, domElement, world, opts = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.world = world;

    this.spawn = {
      pos: new THREE.Vector3(1.85, 0, 13.6),
      yaw: opts.yaw ?? 0.20,
      pitch: opts.pitch ?? -0.008,
    };
    if (opts.pos) this.spawn.pos.copy(opts.pos);

    this.pos = this.spawn.pos.clone();
    this.yaw = this.spawn.yaw;
    this.pitch = this.spawn.pitch;
    this.vel = new THREE.Vector3();
    this.bob = 0;
    this.locked = false;
    /**
     * Touch input, filled by `core/touch.js`.
     *
     * `touchMode` is the second way to be *playing*: the whole input path
     * used to be gated on `locked`, which is pointer lock, which no phone
     * has -- so on a phone the game started and then ignored everything.
     * Every gate below asks `active` instead, and `active` is either.
     *
     * `x` and `y` are the stick, -1 to 1, and they are analogue: a thumb
     * half way out walks at half pace.
     */
    this.touchMode = false;
    this.touch = { x: 0, y: 0, run: false };
    this.keys = new Set();
    this.walkSpeed = 2.55;
    this.runSpeed = 5.1;
    /** On the machine: a flat 1.5x a run, 7.65 m/s -- about 27 km/h. */
    this.rideSpeed = this.runSpeed * 1.5;
    this.sensitivity = 0.0022;

    /* Jump state.  `airborne` is what switches `pos.y` from the ground-follower
     * to the integrator; `coyote` counts down from the last frame on the
     * ground and `buffered` counts down from the last unserved press. */
    this.vy = 0;
    this.airborne = false;
    this.coyote = 0;
    this.buffered = 0;
    this.landDip = 0;

    /* Riding state.  `ride` is whatever was handed to `mount()` -- the walker
     * never looks inside it, it only asks whether it is there. */
    this.ride = null;
    this.roll = 0;        // camera bank, driven by the turn rate
    this.yawRate = 0;     // smoothed: the mouse delivers yaw in spikes
    this._prevYaw = this.yaw;

    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._wish = new THREE.Vector3();
    this._probe = new THREE.Vector3();

    // scratch for the spherical camera frame
    this._up = new THREE.Vector3();
    this._east = new THREE.Vector3();
    this._north = new THREE.Vector3();
    this._basis = new THREE.Matrix4();
    this._surfaceQ = new THREE.Quaternion();
    this._localQ = new THREE.Quaternion();
    this._localE = new THREE.Euler();

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3.0;
    this.hovered = null;
    this.onInteract = null;
    this.onLockChange = null;

    this._bind();
    this.applyCamera(0);
  }

  _bind() {
    const onMove = (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = clamp(this.pitch, -1.15, 1.05);
    };
    document.addEventListener('mousemove', onMove);

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const c = e.code;
      this.keys.add(c);
      if (c === 'KeyE' && this.locked) this.onInteract?.(this.hovered);
      if (c === 'Space' && this.locked) this.jump();
      if (c === 'KeyR' && this.locked) this.reset();
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(c) && this.locked) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Playing, by either route: pointer lock on a desktop, the pad on a phone. */
  get active() {
    return this.locked || this.touchMode;
  }

  lock() {
    this.dom.requestPointerLock?.();
  }

  /** Look, in radians -- what a touch drag produces instead of mouse counts. */
  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = clamp(this.pitch - dy, -1.15, 1.05);
  }

  /** The stick.  Called on every change, including the release to (0, 0). */
  setMove(x, y, run) {
    this.touch.x = x;
    this.touch.y = y;
    this.touch.run = !!run;
  }

  /**
   * Ask to leave the ground.
   *
   * Buffered rather than refused when it cannot be served: pressing a fifth of
   * a second before landing is what a player *means* by jumping twice, and
   * dropping the press because the feet were still 40 mm off the pavement is
   * the single thing that makes a jump feel like it is ignoring you.
   */
  jump() {
    if (!this.active || this.ride) return;
    this.buffered = JUMP.buffer;
  }

  reset() {
    this.pos.copy(this.spawn.pos);
    this.yaw = this.spawn.yaw;
    this.pitch = this.spawn.pitch;
    this.vel.set(0, 0, 0);
    this.bob = 0;
    this.vy = 0;
    this.airborne = false;
    this.landDip = 0;
  }

  /** Get on / off a vehicle.  See the `RIDE` block at the top of the file. */
  mount(vehicle) {
    this.ride = vehicle;
    this.vel.set(0, 0, 0);
    this.bob = 0;
    // a machine does not hop, and a jump left half-served would land the rider
    // through the seat
    this.vy = 0;
    this.airborne = false;
    this.buffered = 0;
    this._prevYaw = this.yaw;
  }

  unmount() {
    this.ride = null;
    this.vel.set(0, 0, 0);
    this.roll = 0;
    this.yawRate = 0;
    this._prevYaw = this.yaw;
  }

  /** Push the player out of any collider it overlaps, one axis at a time. */
  _resolve(colliders, feetY) {
    this._resolveAt(this.pos, colliders, feetY, RADIUS);
  }

  /**
   * The same push-out for an arbitrary point and radius, which is what the
   * machine's nose probe needs -- see `RIDE`.
   */
  _resolveAt(p, colliders, feetY, r) {
    for (const c of colliders) {
      if (c.top !== undefined && c.top <= feetY + STEP) continue;
      if (c.bottom !== undefined && c.bottom > feetY + 1.9) continue;
      const x0 = c.x0 - r, x1 = c.x1 + r;
      const z0 = c.z0 - r, z1 = c.z1 + r;
      if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;
      // smallest push-out wins
      const dxL = p.x - x0, dxR = x1 - p.x;
      const dzL = p.z - z0, dzR = z1 - p.z;
      const m = Math.min(dxL, dxR, dzL, dzR);
      if (m === dxL) p.x = x0;
      else if (m === dxR) p.x = x1;
      else if (m === dzL) p.z = z0;
      else p.z = z1;
    }
  }

  update(dt) {
    const k = this.keys;
    const riding = this.ride !== null;
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight') || this.touch.run;
    const speed = riding ? this.rideSpeed : (sprint ? this.runSpeed : this.walkSpeed);

    let fwd = 0, side = 0;
    if (this.active) {
      if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) side += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) side -= 1;
      fwd = clamp(fwd + this.touch.y, -1, 1);
      side = clamp(side + this.touch.x, -1, 1);
    }

    /* On the machine A and D steer rather than strafe.  A scooter that slides
     * sideways at 7.65 m/s is the one artifact a first-person ride cannot get
     * away with: the machine is *in* the frame, so it is unmissable -- and the
     * heading is the yaw, so there is nowhere to hide it either.  The mouse
     * still steers; this is the second way, for turning without swinging the
     * whole view round. */
    if (riding && side) this.yaw -= side * RIDE.steer * dt;

    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    if (riding) {
      // no lateral component at all: the machine only goes where it points
      this._wish.copy(this._forward)
        .multiplyScalar(fwd > 0 ? speed : fwd < 0 ? -RIDE.reverse : 0);
    } else {
      this._wish
        .copy(this._forward).multiplyScalar(fwd)
        .addScaledVector(this._right, side);
      /* Clamped rather than normalised, which is the change the analogue
       * stick needed: normalising sends a thumb a third of the way out at
       * full walking pace, and there is nothing else in the game that gives
       * you a slow walk.  Two keys still make a diagonal of length root two
       * and still come out at exactly `speed`, so nothing about the keyboard
       * moves. */
      const len = this._wish.length();
      if (len > 1e-3) this._wish.multiplyScalar((speed * Math.min(1, len)) / len);
    }

    /* Critically-damped approach to the wish velocity: responsive but never
     * twitchy.  The walker's 13 would take the machine to 27 km/h in about a
     * tenth of a second, which is a teleport rather than a throttle, so riding
     * ramps far more gently -- and brakes harder than it coasts, because S has
     * to be able to stop you before the thing you are looking at. */
    const accel = riding
      ? (fwd > 0 ? 5.0 : fwd < 0 ? 9.0 : 3.6)
      : (this._wish.lengthSq() > 1e-6 ? 13 : 16);
    const a = 1 - Math.exp(-accel * dt);
    this.vel.x += (this._wish.x - this.vel.x) * a;
    this.vel.z += (this._wish.z - this.vel.z) * a;

    const feetY = this.world.heightAt(this.pos.x, this.pos.z);
    const colliders = this.world.colliders;

    // Longitude lines converge toward the poles, so a metre of x is only
    // cos(lat) metres of ground. Scale it back up to keep walking speed even.
    const lonScale = 1 / Math.max(0.25, Math.cos(this.pos.z / R));
    const stepX = this.vel.x * dt * lonScale;
    const stepZ = this.vel.z * dt;
    // sub-step so fast sprinting can't tunnel through thin walls
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(stepX), Math.abs(stepZ)) / 0.18));
    for (let i = 0; i < n; i++) {
      this.pos.x += stepX / n;
      this._resolve(colliders, feetY);
      this.pos.z += stepZ / n;
      this._resolve(colliders, feetY);
    }

    /* The machine's nose.  Pushed out of anything the seat is already clear
     * of, and the push translated back into the body -- a slide, not a pivot,
     * which is stable where turning the machine out of a corner would not be.
     * The seat is then re-resolved, because moving it can have put it back
     * inside something. */
    if (riding) {
      const p = this._probe.copy(this.pos).addScaledVector(this._forward, RIDE.nose);
      const px = p.x, pz = p.z;
      this._resolveAt(p, colliders, feetY, RIDE.noseR);
      this.pos.x += p.x - px;
      this.pos.z += p.z - pz;
      this._resolve(colliders, feetY);
    }

    // x wraps forever: walk far enough east and you come back to the crossing
    this.pos.x = wrapX(this.pos.x);
    const bounds = this.world.bounds;
    this.pos.z = clamp(this.pos.z, bounds.z0, bounds.z1);

    /* Passing the current feet height is what lets an elevated platform be
     * walked under as well as on: `heightAt` only offers a platform within a
     * step of where you already are.  Airborne, it is also what lets a jump
     * reach a low deck the walk could not step onto -- the query is made from
     * the height the player has actually got to. */
    const targetY = this.world.heightAt(this.pos.x, this.pos.z, this.pos.y);

    this.coyote = this.airborne ? 0 : Math.max(0, this.coyote - dt);
    this.buffered = Math.max(0, this.buffered - dt);
    // on the ground, or close enough to it that the difference is the ease
    const grounded = !this.airborne && this.pos.y - targetY < 0.12;
    if (grounded) this.coyote = JUMP.coyote;

    if (this.buffered > 0 && !riding && (grounded || this.coyote > 0)) {
      this.vy = JUMP.v;
      this.airborne = true;
      this.buffered = 0;
      this.coyote = 0;
    }

    if (this.airborne) {
      this.vy -= JUMP.gravity * dt;
      this.pos.y += this.vy * dt;
      /* Land only on the way down.  Coming up through the reach of a platform
       * -- the deck you are jumping onto -- must not count as touching it, or
       * the take-off frame lands you back on the pavement you left. */
      if (this.vy <= 0 && this.pos.y <= targetY) {
        this.pos.y = targetY;
        this.vy = 0;
        this.airborne = false;
        this.landDip = JUMP.land;
      }
    } else {
      this.pos.y += (targetY - this.pos.y) * (1 - Math.exp(-18 * dt));
    }
    // the knee, easing back out under the eye height below
    this.landDip *= Math.exp(-14 * dt);

    const moving = Math.hypot(this.vel.x, this.vel.z);

    /* Bank into the turn.
     *
     * `rotation.z` on the camera is a rotation about its own backward axis, so
     * a positive one tilts the head *left* -- and yaw grows to the left too,
     * which is why the sign here is not inverted.  Smoothed, because the mouse
     * arrives in spikes and an unsmoothed bank flickers; scaled by how fast the
     * machine is actually going, because leaning while stationary is a stunt.
     * `ebike.js` reads `roll` back off the player to lean the machine with it. */
    const raw = (this.yaw - this._prevYaw) / Math.max(dt, 1e-4);
    this._prevYaw = this.yaw;
    this.yawRate += (raw - this.yawRate) * (1 - Math.exp(-9 * dt));
    const bank = riding
      ? clamp(this.yawRate, -2.6, 2.6) * 0.05 * Math.min(moving / this.rideSpeed, 1)
      : 0;
    this.roll += (bank - this.roll) * (1 - Math.exp(-7 * dt));

    // feet off the ground make no footsteps
    if (!this.airborne) this.bob += dt * moving * (sprint ? 8.2 : 6.4);
    this.applyCamera(this.airborne ? 0 : moving);
  }

  /**
   * Place the camera on the planet surface.
   *
   * The simulation stays in flat (x, z) authoring space -- collision, height
   * queries and the street centreline all work unchanged. Only the presentation
   * is spherical: the flat point becomes a surface point, and the tangent frame
   * becomes the camera's basis, so "up" is always away from the planet centre.
   */
  applyCamera(moving) {
    /* No head bob on the machine: the walk cycle is a walk cycle, and at three
     * times walking pace it reads as a lurch rather than as footsteps. */
    const riding = this.ride !== null;
    const amp = riding ? 0 : Math.min(moving / this.walkSpeed, 1) * 0.014;
    const eye = this.pos.y + (riding ? RIDE.eye : EYE)
      + Math.sin(this.bob) * amp - this.landDip;

    const b = basisAt(this.pos.x, this.pos.z, this._up, this._east, this._north);
    this._basis.makeBasis(this._east, this._up, this._north);
    this._surfaceQ.setFromRotationMatrix(this._basis);

    this._localE.set(this.pitch, this.yaw, this.roll + Math.sin(this.bob * 0.5) * amp * 0.35, 'YXZ');
    this._localQ.setFromEuler(this._localE);

    positionAt(this.pos.x, eye, this.pos.z, this.camera.position);
    this.camera.quaternion.copy(this._surfaceQ).multiply(this._localQ);
    // up follows the surface, so the whole frame rolls as you walk round
    this.camera.up.copy(b.up);
  }

  /** Ray-test the interactable list; returns the closest one in range. */
  pick(interactables) {
    if (!interactables.length) {
      this.hovered = null;
      return null;
    }
    this.raycaster.set(
      this.camera.position,
      this._forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion)
    );
    const meshes = interactables.map((i) => i.hitbox);
    const hits = this.raycaster.intersectObjects(meshes, false);
    this.hovered = hits.length ? interactables[meshes.indexOf(hits[0].object)] : null;
    return this.hovered;
  }
}
