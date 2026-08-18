/* ------------------------------------------------------------------ *
 * Touch controls.
 *
 * The reason this file exists at all is one line in `player.js`: every
 * input in the game is gated on `this.locked`, and `locked` is pointer
 * lock, which does not exist on a phone.  So the game loaded on a phone,
 * drew perfectly, and could not be played -- the start card took the tap,
 * the overlay went away, and nothing moved.
 *
 * The layout is the one every touch game has converged on because it is the
 * one that fits a pair of thumbs: the left half is a stick that appears
 * where the thumb lands, the right half is drag-to-look, and the buttons sit
 * where the right thumb already is.  Nothing is drawn until it is touched,
 * because this is a game about looking at a street and a permanent pair of
 * plastic pads in the corners is the fastest way to make it look like a
 * phone game instead.
 *
 * The stick is analogue and `player.js` was changed to honour it: the walk
 * speed follows how far the thumb has moved, and past three quarters of the
 * travel it is a run.  A separate run button would be a fifth thing to hit
 * with a thumb that is already busy.
 * ------------------------------------------------------------------ */

/** Stick travel, in CSS pixels, from the point the thumb landed. */
const REACH = 58;
/**
 * Past this fraction of the travel it is a run.
 *
 * High on purpose.  A thumb pushed to the edge of the ring is the resting
 * position for most people, so a threshold at three quarters means the game
 * is a run with a walk available to the careful -- and the title card says
 * "walk slowly".  At 0.9 the walk is everything up to the ring and the run is
 * a deliberate press into it.
 */
const RUN_AT = 0.9;
/** Radians per pixel dragged.  A touch drag is slower than a mouse flick and
 *  has a hard limit -- the screen -- so it needs to be worth more per pixel. */
const LOOK = 0.0042;

export function createTouchControls({ onMove, onLook, onAction } = {}) {
  const el = (tag, cls, parent, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    (parent || document.body).appendChild(n);
    return n;
  };

  /* Coarse pointer is the question worth asking -- not "is there a
   * touchscreen", which every laptop with a digitiser answers yes to.  The
   * `touchstart` fallback is there because the query is a hint and a real
   * finger on the glass is evidence: if one arrives before the start card is
   * tapped, the pad is what that tap should turn on. */
  let available = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  window.addEventListener('touchstart', () => { available = true; }, { capture: true, once: true });

  const root = el('div', 'touch');
  const stick = el('div', 'touch-stick', root, '<i></i>');
  const buttons = el('div', 'touch-buttons', root);
  const corner = el('div', 'touch-corner', root);

  /* `walk` or `ride`: which verbs the three buttons under the right thumb
   * currently are.  See `setMode`. */
  let current = 'walk';

  const button = (parent, cls, label, action) => {
    const b = el('button', `touch-btn ${cls}`, parent, label);
    b.type = 'button';
    b.dataset.action = action;
    b.setAttribute('aria-label', action);
    // `pointerdown`, not `click`: the look zone is underneath and a click
    // arrives after a 300 ms wait on some browsers that never got the memo
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('down');
      // `dataset`, not the closed-over argument: a button can be relabelled
      onAction?.(b.dataset.action);
    });
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    return b;
  };

  /* V first so E, the one that is pressed constantly, ends up outermost --
   * under the thumb rather than a reach past another button.  J sits between
   * them: pressed far more than the machine and far less than E.
   *
   * V drops to the small size to make room for it.  Three full-size buttons
   * and their gaps are 300 px, which on a 390 px phone reaches back past the
   * middle of the screen and puts a dead patch under the *left* thumb, where
   * the stick is supposed to appear.  The machine is summoned once in a
   * while; the jump is pressed over every kerb. */
  const vBtn = button(buttons, 'small', 'V', 'ebike');
  const jBtn = button(buttons, '', 'J', 'jump');
  const eBtn = button(buttons, 'primary', 'E', 'interact');
  button(corner, 'small', '☰', 'pause');
  button(corner, 'small', 'P', 'planet');
  button(corner, 'small', '♪', 'music');

  let engaged = false;
  /** Pointer ids, so a look drag and a walk can happen at the same time. */
  let moveId = null;
  let lookId = null;
  let originX = 0, originY = 0;
  let lookX = 0, lookY = 0;

  const release = () => {
    moveId = null;
    stick.classList.remove('on', 'running');
    onMove?.(0, 0, false);
  };

  /* One set of handlers on the window rather than two zones with their own.
   * A thumb that starts on the left half and slides past the middle is still
   * walking, and a look drag that ends over a button must not press it -- both
   * of which come free if the pointer id decides what a touch is doing, and
   * neither of which does if the *element under the finger* decides. */
  const onDown = (e) => {
    if (!engaged || e.pointerType === 'mouse') return;
    if (e.target.closest('.touch-btn')) return;
    const left = e.clientX < window.innerWidth * 0.45;
    if (left && moveId === null) {
      moveId = e.pointerId;
      originX = e.clientX;
      originY = e.clientY;
      stick.style.left = `${originX}px`;
      stick.style.top = `${originY}px`;
      stick.classList.add('on');
      stick.firstChild.style.transform = 'translate(-50%, -50%)';
    } else if (lookId === null) {
      lookId = e.pointerId;
      lookX = e.clientX;
      lookY = e.clientY;
    }
  };

  const onMoveEvent = (e) => {
    if (!engaged) return;
    if (e.pointerId === moveId) {
      let dx = e.clientX - originX;
      let dy = e.clientY - originY;
      const d = Math.hypot(dx, dy);
      /* Past the ring the origin is dragged along behind the thumb, so a
       * finger that has wandered up the screen still steers instead of being
       * pinned at full deflection in a direction it left ten seconds ago. */
      if (d > REACH) {
        originX += dx * (1 - REACH / d);
        originY += dy * (1 - REACH / d);
        dx *= REACH / d;
        dy *= REACH / d;
        stick.style.left = `${originX}px`;
        stick.style.top = `${originY}px`;
      }
      stick.firstChild.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const mag = Math.min(1, Math.hypot(dx, dy) / REACH);
      const run = mag > RUN_AT;
      stick.classList.toggle('running', run);
      // screen-down is forward: y grows downward, and the player's +forward is
      // "away from you", so the sign flips here and nowhere else
      onMove?.(dx / REACH, -dy / REACH, run);
    } else if (e.pointerId === lookId) {
      onLook?.((e.clientX - lookX) * LOOK, (e.clientY - lookY) * LOOK);
      lookX = e.clientX;
      lookY = e.clientY;
    }
  };

  const onUp = (e) => {
    if (e.pointerId === moveId) release();
    if (e.pointerId === lookId) lookId = null;
  };

  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointermove', onMoveEvent, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  // a long press on the canvas otherwise offers to save the image
  window.addEventListener('contextmenu', (e) => { if (engaged) e.preventDefault(); });

  return {
    get available() { return available; },
    get engaged() { return engaged; },
    root,
    /** Show the pad and start reading touches. */
    engage() {
      engaged = true;
      root.classList.add('on');
    },
    /** Put it away -- the pause card is up, or the game was never started. */
    disengage() {
      engaged = false;
      root.classList.remove('on');
      release();
      lookId = null;
    },
    /** Light the interact button when the crosshair is on something. */
    setActionable(on) {
      eBtn.classList.toggle('live', !!on);
    },
    /**
     * Which set of verbs the three buttons are.
     *
     * A thumb has room for three and the ride needs a different three, so they
     * are relabelled rather than added to -- a fourth would reach back past the
     * middle of a 390 px screen and put a dead patch under the *left* thumb,
     * which is the argument the row was laid out with in the first place.
     *
     * `V` becomes the fire, because the machine cannot be summoned from the
     * back of a dragon anyway.  `J` stays where it is and means the same thing
     * it always did -- leave the ground -- which on a flyer is the climb, and
     * `player.jump()` already routes it there.  `E` never moves.
     */
    setMode(mode) {
      if (mode === current) return;
      current = mode;
      const ride = mode === 'ride';
      vBtn.textContent = ride ? '火' : 'V';
      vBtn.dataset.action = ride ? 'breathe' : 'ebike';
      vBtn.setAttribute('aria-label', ride ? 'breathe fire' : 'ebike');
      jBtn.textContent = ride ? '▲' : 'J';
      jBtn.setAttribute('aria-label', ride ? 'climb' : 'jump');
    },
  };
}
