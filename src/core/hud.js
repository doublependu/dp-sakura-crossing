/* ------------------------------------------------------------------ *
 * Minimal HUD: a start card, a small crosshair, an interaction prompt
 * and a hint line that fades itself out.  Nothing else -- the frame is
 * the point.
 *
 * Two things have been added to that since the animals learned to take you
 * places, and both were held to the same rule:
 *
 *   - **the choice card**, because "hello" is no longer the only thing you
 *     can say to a cat.  It is a list under the crosshair, driven by the
 *     keyboard, and it is *not modal* -- see the note above `openChoice`.
 *   - **the collection**, which lives inside the pause screen rather than on
 *     the frame.  A counter in the corner of a game about looking at a street
 *     is a counter you look at instead of the street.
 * ------------------------------------------------------------------ */

/** Where the repository lives -- the pause screen links to it. */
const REPO_URL = 'https://github.com/doublependu/dp-sakura-crossing';

export function createHud({ volume = 0.34, landmarks = [] } = {}) {
  const el = (tag, cls, parent, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    (parent || document.body).appendChild(n);
    return n;
  };

  const root = el('div', 'hud');

  const crosshair = el('div', 'crosshair', root);
  const prompt = el('div', 'prompt', root, '');
  const choice = el('div', 'choice', root, '');
  const toast = el('div', 'toast', root, '');
  const discovery = el('div', 'discovery', root, '');
  const hint = el('div', 'hint', root,
    `<b>WASD</b> walk &nbsp;·&nbsp; <b>Shift</b> run &nbsp;·&nbsp; <b>Space</b> jump
     &nbsp;·&nbsp; <b>Mouse</b> look &nbsp;·&nbsp; <b>E</b> interact
     &nbsp;·&nbsp; <b>F</b> breathe fire <i>(riding)</i>
     &nbsp;·&nbsp; <b>V</b> e-bike &nbsp;·&nbsp; <b>P</b> see the planet
     &nbsp;·&nbsp; <b>M</b> music &nbsp;·&nbsp; <b>C</b> coordinates
     &nbsp;·&nbsp; <b>R</b> opening view &nbsp;·&nbsp; <b>Esc</b> release`);

  /* Coordinate readout, off by default and toggled with C.
   *
   * It reports the *flat authoring* position, not the position on the sphere,
   * because that is the only coordinate system any of the builders, colliders
   * or camera calls use -- the planet projection is applied after everything is
   * placed.  The third line is a ready-made `__shot` argument, so a spot can be
   * quoted straight into a camera call or a bug report. */
  const coords = el('div', 'coords', root, '');
  let lastLine = '';

  const overlay = el('div', 'overlay', root);
  overlay.dataset.mode = 'start';
  overlay.innerHTML = `
    <section class="menu-panel" role="dialog" aria-labelledby="menu-title">
      <div class="menu-art" aria-hidden="true">
        <div class="art-index">Nihonmachi · 05:42 PM</div>
        <div class="art-kanji">春の日本街</div>
        <div class="crossing-mark">
          <i class="bar"></i><i class="bar"></i>
          <span class="signal"><i></i><i></i></span>
        </div>
        <div class="art-caption">
          <span>Walk slowly</span>
          <strong>桜の季節</strong>
        </div>
      </div>
      <div class="menu-copy">
        <div class="menu-kicker">
          <span class="start-only">A quiet spring walk</span>
          <span class="pause-only">Intermission · Paused</span>
        </div>
        <h1 id="menu-title">Sakura <span>Crossing</span></h1>
        <div class="menu-jp">桜踏切 <small>SAKURA CROSSING</small></div>
        <p class="menu-description start-only">
          沿着樱花盛开的日本街慢慢散步。穿过铁道、商店街与河岸，
          看一座三渲二小镇在黄昏里醒来。
        </p>
        <p class="menu-description pause-only">
          The scene is waiting where you left it. Adjust the music volume,
          then continue your walk when you're ready.
        </p>
        <div class="control-strip keys-only">
          <span><b>WASD</b> Move</span>
          <span><b>Mouse</b> Look</span>
          <span><b>E</b> Interact</span>
          <span><b>Shift</b> Run</span>
          <span><b>Space</b> Jump</span>
          <span><b>V</b> E-Bike</span>
          <span><b>F</b> Breathe <small>riding</small></span>
          <span><b>M</b> Music</span>
          <span><b>C</b> Coordinates</span>
        </div>
        <!-- Swapped for the one above by a coarse-pointer query.  A phone
             being told to press Shift is the same class of mistake as a phone
             being handed a pointer lock. -->
        <div class="control-strip touch-only">
          <span><b>◀▶</b> Left thumb walks</span>
          <span><b>↕</b> Push far to run</span>
          <span><b>◎</b> Right thumb looks</span>
          <span><b>E</b> Interact</span>
          <span><b>J</b> Jump</span>
          <span><b>V</b> E-Bike</span>
          <span><b>☰</b> Pause</span>
        </div>
        <!-- The collection.  Pause-only: a tally on the frame is a thing you
             look at instead of the town, and the town is the point. -->
        <div class="collection pause-only pause-stack">
          <span class="collection-head">
            <span>しるべ · Landmarks</span>
            <output class="collection-count">0 / 0</output>
          </span>
          <div class="collection-list"></div>
          <div class="collection-pets"></div>
        </div>
        <label class="audio-control pause-only pause-stack">
          <span class="audio-head">
            <span>Background Music</span>
            <output for="music-volume">34%</output>
          </span>
          <input id="music-volume" class="volume-slider" type="range"
            min="0" max="100" step="1" value="34" aria-label="Background music volume" />
        </label>
        <button class="menu-action" type="button">
          <span class="start-only">进入日本街</span>
          <span class="pause-only">Resume Walk</span>
          <i aria-hidden="true">→</i>
        </button>
        <!-- Its own row rather than a third item in .menu-foot, which is
             display:none under 520 px: a link that does not exist on a
             phone is not a link. -->
        <div class="menu-links">
          <a class="menu-link" href="${REPO_URL}" target="_blank" rel="noopener noreferrer">
            Fork me on GitHub <i aria-hidden="true">↗</i>
          </a>
        </div>
        <div class="menu-foot">
          <span>3D scene · 2D animation spirit</span>
          <span class="start-only">CLICK TO BEGIN</span>
          <span class="pause-only">ESC TO PAUSE</span>
        </div>
      </div>
    </section>`;

  const actionButton = overlay.querySelector('.menu-action');
  const audioControl = overlay.querySelector('.audio-control');
  const volumeSlider = overlay.querySelector('.volume-slider');
  const volumeOutput = overlay.querySelector('.audio-head output');
  const setVolumeReadout = (value) => {
    const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
    volumeSlider.value = String(percent);
    volumeSlider.style.setProperty('--volume', `${percent}%`);
    volumeOutput.value = `${percent}%`;
    volumeOutput.textContent = `${percent}%`;
    volumeSlider.setAttribute('aria-valuetext', `${percent}%`);
  };
  setVolumeReadout(volume);

  const collectionCount = overlay.querySelector('.collection-count');
  const collectionList = overlay.querySelector('.collection-list');
  const collectionPets = overlay.querySelector('.collection-pets');

  let hintTimer = 0;
  let hintVisible = true;
  let toastTimer = null;
  let discoveryTimer = null;
  let coordsOn = false;
  let coordsAcc = 0;
  let startedOnce = false;

  /* ------------------------------ the choice card ------------------------------ *
   * Open state lives here rather than in `main.js` because the card owns its own
   * keys: `1` and `2` pick outright, `W`/`S` move the highlight, `E` takes the
   * highlighted one and `Esc` closes.  On a phone the rows are simply tapped,
   * which is the whole reason this is DOM and not something drawn into the
   * frame -- a pointer-locked desktop cannot click it and a phone cannot
   * press `1`.
   */
  let choiceOpen = null;   // { options, index, timer }

  function renderChoice() {
    if (!choiceOpen) return;
    choiceOpen.options.forEach((o, i) => {
      const row = choice.children[i];
      if (row) row.classList.toggle('on', i === choiceOpen.index);
    });
  }

  function closeChoice() {
    if (!choiceOpen) return;
    clearTimeout(choiceOpen.timer);
    choiceOpen = null;
    choice.classList.remove('on');
    choice.innerHTML = '';
  }

  function pickChoice(i) {
    if (!choiceOpen) return;
    const opt = choiceOpen.options[i];
    closeChoice();
    opt?.action?.();
  }

  const api = {
    root,
    overlay,
    onStart: null,
    onVolumeChange: null,
    /** Brief centre-screen note that fades itself out. */
    flash(text, ms = 1400) {
      toast.textContent = text;
      toast.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('on'), ms);
    },
    setPrompt(text) {
      if (text) {
        prompt.textContent = text;
        prompt.classList.add('on');
      } else {
        prompt.classList.remove('on');
      }
    },

    get choiceOpen() { return !!choiceOpen; },

    /**
     * Offer a short list of things to say to whatever is under the crosshair.
     *
     * **Not modal**, on purpose.  The obvious version freezes the player while
     * the card is up, and the obvious version is wrong here: the thing you are
     * talking to is an animal, and an animal that wanders off mid-decision is
     * the normal case.  A card that pins you in place while a cat leaves is a
     * bad joke, so the walk carries on underneath and the card times out.
     */
    openChoice(title, options) {
      closeChoice();
      if (!options?.length) return;
      choice.innerHTML =
        `<div class="choice-title"></div>`
        + options.map((o, i) =>
          `<button class="choice-row" type="button" data-i="${i}">`
          + `<b>${i + 1}</b><span></span></button>`).join('');
      choice.querySelector('.choice-title').textContent = title;
      options.forEach((o, i) => {
        choice.children[i + 1].querySelector('span').textContent = o.label;
      });
      choiceOpen = { options, index: 0, timer: setTimeout(closeChoice, 6000) };
      choice.classList.add('on');
      renderChoice();
    },
    closeChoice,
    /**
     * The keys the card owns, answered before anything else sees them.
     *
     * Deliberately **not** W and S.  A list wants arrow keys, and this list
     * cannot have them: the card does not stop the walk, so W while it is open
     * has to keep meaning "walk forward" -- swallowing it would leave the
     * player standing still in front of an animal for no reason they could
     * see.  Two options need two digits and a confirm, and that is all this
     * has.
     */
    choiceKey(code) {
      if (!choiceOpen) return false;
      if (code === 'Digit1') { pickChoice(0); return true; }
      if (code === 'Digit2') { pickChoice(1); return true; }
      if (code === 'Digit3') { pickChoice(2); return true; }
      if (code === 'KeyE' || code === 'Enter') { pickChoice(choiceOpen.index); return true; }
      if (code === 'Escape') { closeChoice(); return true; }
      return false;
    },

    /**
     * A landmark, found.
     *
     * Its own element rather than the ordinary toast: this is the one moment
     * in the game that is a reward, and a line that fades in the same corner
     * as "music off" does not read as one.
     */
    announce(lm, first = true) {
      discovery.innerHTML =
        `<span class="discovery-kicker">${first ? 'new landmark discovered' : 'you know this place'}</span>`
        + `<strong></strong><em></em>`;
      discovery.querySelector('strong').textContent = lm.en;
      discovery.querySelector('em').textContent = lm.jp;
      discovery.classList.add('on');
      clearTimeout(discoveryTimer);
      discoveryTimer = setTimeout(() => discovery.classList.remove('on'), first ? 4200 : 2600);
    },

    /**
     * Redraw the pause screen's collection.  Cheap; called when it changes.
     *
     * Only what has been found is listed.  Thirty-nine rows of `———` is not a
     * collection, it is a checklist with three ticks on it, and it turns a
     * quiet walk into a completion task -- the remainder gets one muted line
     * saying how many are still out there, which is all the information a
     * blank row carried anyway.
     */
    setCollection(found, companions = []) {
      const all = landmarks;
      const got = all.filter((lm) => found.has(lm.id));
      collectionCount.value = collectionCount.textContent = `${got.length} / ${all.length}`;
      collectionList.innerHTML = got.length
        ? got.map(() => '<span class="found"><b></b><i></i></span>').join('')
        : '<span class="unfound">follow an animal and see where it takes you</span>';
      // textContent rather than interpolation: these names come from a table,
      // but the habit is what keeps the one that does not, later, from biting
      const rows = collectionList.querySelectorAll('.found');
      got.forEach((lm, i) => {
        rows[i].querySelector('b').textContent = lm.jp;
        rows[i].querySelector('i').textContent = lm.en;
      });
      if (got.length && got.length < all.length) {
        const rest = document.createElement('span');
        rest.className = 'unfound';
        rest.textContent = `+ ${all.length - got.length} still out there`;
        collectionList.appendChild(rest);
      }
      collectionPets.textContent = companions.length
        ? `つれ · ${companions.join('  ')}`
        : '';
    },
    setPlanetView(on) {
      crosshair.classList.toggle('hidden', on);
    },
    setLocked(locked) {
      if (locked) startedOnce = true;
      // a card left open behind the pause screen takes the next `1` you press
      if (!locked) closeChoice();
      overlay.dataset.mode = startedOnce ? 'paused' : 'start';
      overlay.classList.toggle('hidden', locked);
      overlay.setAttribute('aria-hidden', locked ? 'true' : 'false');
      crosshair.classList.toggle('on', locked);
      if (locked) {
        hintTimer = 0;
        hintVisible = true;
        hint.classList.remove('faded');
      } else {
        requestAnimationFrame(() => actionButton.focus({ preventScroll: true }));
      }
    },
    setVolume(value) {
      setVolumeReadout(value);
    },
    setMuted(muted) {
      audioControl.classList.toggle('muted', muted);
    },
    toggleHint() {
      hintVisible = !hintVisible;
      hint.classList.toggle('faded', !hintVisible);
      hintTimer = hintVisible ? 0 : 1e9;
    },
    toggleCoords() {
      coordsOn = !coordsOn;
      coords.classList.toggle('on', coordsOn);
      coordsAcc = 1e9;
      return coordsOn;
    },
    get coordsVisible() { return coordsOn; },
    /**
     * @param p  the player's flat position (x, y = ground/feet height, z)
     * @param yaw,pitch  the look direction, in the same units `__shot` takes
     */
    setCoords(p, yaw, pitch, dt = 0) {
      if (!coordsOn) return;
      // ten updates a second: at frame rate the digits are unreadable
      coordsAcc += dt;
      if (coordsAcc < 0.1) return;
      coordsAcc = 0;
      const n = (v, d = 2) => v.toFixed(d);
      // fold the yaw into (-PI, PI] so it matches what the camera calls use
      let y = yaw % (Math.PI * 2);
      if (y > Math.PI) y -= Math.PI * 2;
      if (y <= -Math.PI) y += Math.PI * 2;
      /* Which way that yaw is actually looking.
       *
       * `forward = (-sin yaw, 0, -cos yaw)`, so yaw 0 faces -z and yaw grows
       * *clockwise* through -x: the index has to count down the table, not up.
       * Counting up gets every direction except north and south exactly
       * mirrored, which is worse than having no compass at all. */
      const DIRS = ['north +z', 'north-west', 'west -x', 'south-west',
        'south -z', 'south-east', 'east +x', 'north-east'];
      const compass = DIRS[(((4 - Math.round((y / (Math.PI * 2)) * 8)) % 8) + 8) % 8];
      lastLine = `{ pos: [${n(p.x, 1)}, 0, ${n(p.z, 1)}], yaw: ${n(y)}, pitch: ${n(pitch)} }`;
      coords.innerHTML =
        `<span class="k">x</span>${n(p.x)} <span class="k">z</span>${n(p.z)} `
        + `<span class="k">y</span>${n(p.y)}<br>`
        + `<span class="k">yaw</span>${n(y)} <span class="k">pitch</span>${n(pitch)}`
        + ` <span class="d">${compass}</span><br>`
        + `<span class="s">${lastLine}</span>`
        + `<br><span class="d">click or Shift+C to copy</span>`;
    },
    /**
     * Copy the current position to the clipboard.
     *
     * Two routes because neither is reliable on its own: `navigator.clipboard`
     * needs a secure context and a user gesture, and a pointer-locked canvas
     * swallows the click.  The textarea fallback works in both cases.
     */
    copyCoords() {
      if (!lastLine) return false;
      const done = () => { api.flash('copied  ·  ' + lastLine, 2200); return true; };
      try {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(lastLine).then(done, () => api.copyFallback(lastLine));
          return true;
        }
      } catch { /* fall through to the textarea */ }
      return api.copyFallback(lastLine) ? done() : false;
    },
    copyFallback(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    },
    update(dt, locked) {
      if (!locked || !hintVisible) return;
      hintTimer += dt;
      if (hintTimer > 11) {
        hint.classList.add('faded');
        hintVisible = false;
      }
    },
  };

  actionButton.addEventListener('click', (e) => {
    e.stopPropagation();
    api.onStart?.();
  });
  /* The overlay resumes the walk on any click that is not a control.  The
   * GitHub link has to be on that list too, or following it resumes the game
   * behind the new tab -- and on a phone, where the tab opens over the top,
   * you come back to a walk you did not know had started. */
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('.audio-control, .menu-links, .collection')) return;
    api.onStart?.();
  });
  for (const event of ['click', 'pointerdown', 'pointerup']) {
    overlay.querySelector('.menu-links').addEventListener(event, (e) => e.stopPropagation());
  }

  /* The card's rows, tapped.  `pointerdown` rather than `click` for the same
   * reason the touch buttons use it: the look-drag zone is underneath. */
  choice.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.choice-row');
    if (!row) return;
    e.preventDefault();
    e.stopPropagation();
    pickChoice(Number(row.dataset.i));
  });
  for (const event of ['click', 'pointerdown', 'pointerup']) {
    audioControl.addEventListener(event, (e) => e.stopPropagation());
  }
  volumeSlider.addEventListener('input', () => {
    const next = Number(volumeSlider.value) / 100;
    setVolumeReadout(next);
    api.onVolumeChange?.(next);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') api.toggleHint();
    if (e.code === 'KeyC') {
      // Shift+C copies the position; plain C toggles the readout
      if (e.shiftKey) {
        if (coordsOn) api.copyCoords();
      } else {
        api.flash(api.toggleCoords() ? 'coordinates on' : 'coordinates off', 900);
      }
    }
  });

  // the readout is clickable too, for when the pointer is not locked
  coords.style.pointerEvents = 'auto';
  coords.style.cursor = 'copy';
  coords.addEventListener('click', (e) => {
    e.stopPropagation();
    api.copyCoords();
  });

  return api;
}
