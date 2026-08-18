# tools/rec — recording a film of the game

Fifteen minutes of Sakura Crossing, played by a script and rendered to an
`.mp4`, with nothing installed: Chrome is already on the machine, Node 24 has a
global `WebSocket` so the DevTools protocol needs no client library, and the
frames go to `ffmpeg` as a pipe.

    npm run build
    npx vite preview --port 5179 &
    node tools/rec/record.mjs --url http://127.0.0.1:5179/

Out come two files: `sakura-crossing-15min-silent.mp4`, which is the master, and
`sakura-crossing-15min.mp4`, which is the same picture with the game's music
laid over it.  They are separate because a re-mux is seconds where a re-record
is forty minutes — and because the track in `public/audio/` is stock music that
the repository's licence note excludes, so the silent one is the one that is
unambiguously the project's.

## How it holds together

**`cdp.mjs`** launches headless Chrome and speaks the DevTools protocol to it.
Headless gets the real GPU here (`ANGLE (NVIDIA GeForce RTX 3060)`), which is
the whole reason this is practical: `Page.captureScreenshot` costs about 90 ms a
frame at 1080p instead of the eight seconds SwiftShader charges.

**`record.mjs`** takes the frame loop away from the browser.  It replaces
`requestAnimationFrame` with a queue it drains by hand, pins
`THREE.Clock.getDelta` to 1/30, and puts `setTimeout` on the film's clock as
well — without that last one a toast meant to hold for 1.4 seconds holds for
twelve frames and the choice card shuts before it can be read.  So thirty steps
make exactly one second of film however long the machine takes over them, and
the frame count in the finished file is the frame count that was asked for.

Two flags make it usable:

  - `--fast` steps the simulation without drawing it.  The whole fifteen
    minutes takes **fifteen seconds**, which is the difference between debugging
    a route and not debugging it.  It prints a position sample every ten
    seconds of film and a trace of every beat.
  - `--warp N` simulates the first N seconds that way and renders the rest, for
    looking at one scene without sitting through the fourteen minutes in front
    of it.

**`director.js`** is the performance.  It plays the game the way a keyboard
does — sets `player.keys`, turns `player.yaw`, presses `E` and `F` through the
page's own handlers — as a list of timed beats totalling 900 seconds.

## Three things that were not obvious

**Walk the town's own graph, not straight lines.**  `nav.path` is what the
animals use to lead you somewhere, and its edges were checked for clearance
when they were derived.  Steering at a bearing instead puts the walker into the
station platform's track bed, where it stays: two dry runs were lost in a
ballast trench before the router went in.  The stuck check on top of it is
still needed, because those edges are sampled straight lines.

**Fly an orbit, not a heading.**  A dragon at cruise crosses this planet in a
minute, so "hold W and steer a bit" is a flight to the far side of the world and
several minutes of desert.  Every airborne beat aims at a point a fixed angle
ahead on a circle round the district instead.

**Stand back from the fire.**  `pickTarget` throws at a bearing 0.55–1.35 rad
*off the line to whoever is watching* — beside you, deliberately.  At eleven
metres that geometry puts every landing point some seventy degrees off the view
axis: the jaw opens on camera and the fireball is thrown clean out of frame.  At
about twenty the same cone closes to something a 16:9 frame holds.
