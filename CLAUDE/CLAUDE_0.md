# CLAUDE.md

Sakura Crossing — a Japanese suburban neighbourhood on a small planet, built in
Three.js and rendered 3D-to-2D as a cel-shaded anime background. It began as one
level crossing and now has twenty-three districts: the crossing, a shopping street, a
shrine, a high school, a drainage channel that runs from one range to the other, a pedestrian
overbridge, a vending corner, a community library, a residential lane of five
building types, two back alleys, a summer-festival ground, an onsen street, and
**six residential blocks** — 一丁目 along the lineside, 二丁目 east of the
overbridge, 四丁目 north of the library, 公園前 round the children's park,
五丁目 behind the school road and 桜守裏町 behind the shrine — which are the
land *between* the set pieces rather than more set pieces, plus **学校前通り**,
the school route from the canal to the gate, and **川端の道**, the lane between
the canal and the school's back wall — both of which are streets rather than
places — **ひばり台六丁目**, the community-bus turnaround at the north-east
edge of the town, which is the first district laid out round a vehicle movement
rather than round a building — **ひばり台七丁目**, スーパー さかえ and its
roof car park on the field behind the onsen street, which is the first district
built round a *building* bigger than a house and the only one with a second
walkable level you can drive to — and **ひばり山**, forty-one thousand square metres
of low hill behind the school and round the east of the town, which is the first
district that is *land* rather than a place, the first walkable ground in this
world that is not a plane, and the reason the railway now goes through **two**
tunnels — ひばり山トンネル in the west arm and **東山トンネル** through the east
shoulder's col, both of which you can walk into.

**Only one thing circles the planet now.**  The railway still does; the drainage
channel does not.  It runs `CANAL_X0 = -98` to `CANAL_X1 = 106` in `landform.js`
— 204 m between the two arms of ひばり山 — and each end is a 暗渠 mouth set in the
toe of the closing range: 呑口 in the west with a raked 除塵スクリーン, a rake and
a maintenance platform, 吐口 in the east with a stone-faced arch, a mossy sill, a
stilling apron and a 量水標.  A watercourse cannot simply *have* an end, and that
is what the two headwalls are for.  Anything in this file or in `README.md` that
still says "two things circle the planet" is describing the world before that
change; the rule it states is still exactly right for the railway.

**And then the hillside itself was rebuilt, because it still read as flat cards.**
Four changes, in `hills.js`, and the order they are listed in is the order they
matter: a **cover field** (`coverAt`) that varies the ground tone at the 15–25 m
scale — without it 88 % of the belt behind the school was one tone, because that
belt is one slope with one aspect and every term in `faceTone` was constant over
it; the **lattice halved to `CELL = 1.5`** with a **third roughness octave**
(`ULTRA`) at the new facet size, since halving the cell on its own only buys
smaller flat cards; an **open-ground scatter** of tussocks, boulders and moss that
is biased *toward* the thin belts instead of hanging off the trees; and
**benching**, which cuts and fills every trail into the slope it crosses.  The
last one is a mechanism rather than a tuning: a path used to inherit the
cross-slope of whatever face it was painted on, and on a 1-in-2 bank that is not a
path.

**The hills grew a second tree species and the cuttings grew a face treatment.**
`trees.js`'s `buildCedar` and `hills.js`'s `STANDS` put five blocks of 杉林 on the
range — 307 stems on a 4 m grid inside rotated rectangles with a hard edge against
the broadleaf, and a sixth ground tone (`PAL.hillLitter`) under them; `tunnel.js`'s
`buildCribs` lays 法枠工 over every engineered face at both bores, which is what
the approach banks, the col's ridge and the two caps' flanks had instead of being
the only ground in the world with nothing at all on it.

**The school doubled with it.**  県立ひばり台高等学校 was x 10.6..56, z -41..-74
(1 498 m²); it is x 10.6..84, z -41..-86 (3 303 m², 2.2×) with a second teaching
block, a 管理棟 annex, a 渡り廊下 between them, a 中庭, an equipment store, a
relocated and larger gymnasium, a ground two and a half times the size, a staff
car park, a working back yard and a 裏門 that opens onto the hill.

**And then there was water on the other side of it.** **ひばり湖** is the
twenty-sixth district: 7 900 m² of lake in the closed basin *east* of the range's
east shoulder, with 20 900 m² of new rim round it — so the district's ground is
about 28 000 m² against the town's own 32 000, which is what "接近住宅区の面積"
came to. It is a **灌漑用ため池**, not a lowland lake, and everything about it
follows from that: the water stands 3.4 m *above* the town's datum, the shoreline
is the contour where the hill field crosses that level, and a 15 m earth
embankment closes the basin's north-west corner with the management road along its
crest and a 放水路 running down the valley to the 用水路's east 暗渠 headwall at
(106, −24) — which `canal.js` has always called "the reach's source". The lake
*is* that source.

**It is east rather than behind the hill, and that is arithmetic.** The obvious
place is south of the crest, and it cannot be: `player.js` clamps latitude to
±0.24 of a circumference, and long before that the equirectangular bake squeezes x
by `cos(z / R)` — 0.37 at z = −190, where a 4.4 m car is 1.6 m long. The east
shoulder (E1 at (118, −84), A8 at (124, −118)) is the divide instead, you come
over it on the 見晴台の道 from the 山裾の道, and the school's own outer road is
where the only vehicle route starts.

**Read `README.md` first.** It carries the design rationale that is not obvious
from the code: why the ink pass uses a second difference of depth, how the flat
world is projected onto the sphere, and which object placements are load-bearing
for the composition. This file is the operational layer on top of it.

**Then read `NEXT.md`.** It audits the brief requirement by requirement so you do
not rebuild finished work, and it records what each round of this project
actually found — which is almost always a bug that threw nothing, logged nothing
and looked fine in a screenshot. The connectivity flood fill described in it is
the single most valuable tool here; run it before you believe any new route.

**Language:** the user writes in Chinese — reply in Chinese. All code, comments,
commit messages and docs stay in English.

---

## Run it

```bash
npm run dev      # dev server + HMR, port 5178   <- use this while working
npm run play     # build + serve production, port 5179
npm run build    # build only
```

Node 18 or newer. This project has spent its whole life in directories with
**spaces and CJK characters** in the path, so everything here is written to
survive that: always quote paths, and note that `cmd` invoked from a Bash tool
mangles CJK filenames. To run a Windows command against such a path, use a
PowerShell tool with an absolute path *and* set
`[Environment]::CurrentDirectory` — PowerShell's `Set-Location` does not
propagate to child processes.

---

## Verifying visual changes — read this before touching anything visual

**`computer{action:"screenshot"}` does not work here.** The Browser pane does not
composite, so screenshots time out and `requestAnimationFrame` never fires. Do
not waste turns on it.

Instead there is a dev-only capture endpoint. `npm run dev` mounts
`POST /__shot`, and `window.__shot()` renders one frame and writes it to
`.shots/`:

```js
// via mcp__Claude_Browser__javascript_tool
await __shot('name', 1600, 900, { pos: [1.85, 0, 13.6], yaw: 0.2, pitch: -0.01 })
await __shot('planet', 1300, 1300, { orbit: 0.6, dist: 3.4, tilt: 0.85 })  // orbit view
await __shot('raw', 1600, 900, { ink: false })                             // pass toggles
```

Then `Read` the file at `.shots/name.jpg`. `__shot` resyncs the camera from the
player itself, so `player.reset()` followed by `__shot('x', 1600, 900, {})`
always gives the opening frame. It is gated behind `import.meta.env.DEV`, so its
absence is a reliable signal you are on the production build.

**Because rAF does not fire, nothing animates on its own.** To test sequences,
step the world by hand:

```js
const w = window.__scene.world;
for (let i = 0; i < 60 * 120; i++) w.update(1 / 60);   // 120 simulated seconds
```

An `E` interaction is the same thing — fire it, then step it, then shoot. The
vending can is in the tray after about 24 frames and gone after 156:

```js
const s = window.__scene;
s.world.interactables.find((i) => i.label.includes('自動販売機')).action();
for (let i = 0; i < 24; i++) s.world.update(1 / 60);
await __shot('vend', 1300, 780, { pos: [14, 0, 7.6], yaw: -1.5708, pitch: -0.30 })
```

**"Can this be seen?" is a raycast, not a screenshot** — and it can be asked with
no browser at all, which matters because the capture endpoint is the one tool
here with no fallback. Import a builder in Node with `document` stubbed by a
proxy that no-ops every Canvas2D call (none of the geometry depends on what the
canvas contains), step the animation, and fire a ray from a plausible eye to the
thing, stopping just short of it: what comes back is *which mesh* is in the way
and for how many frames. That is what found the vending can's 0.9 s visible
window and turned it into 1.9.

**`__shot` does not know about the e-bike**, and it has to be stepped by hand for
the same reason nothing else animates: `__shot` moves the player and re-derives
`pos.y`, but only `ebike.update()` moves the machine onto it. Set the pose
first, then step it, then shoot with an empty options object so `__shot` does not
move the player out from under it again:

```js
const s = window.__scene, p = s.player;
p.pos.set(1.6, 0, 30); p.pos.y = s.world.heightAt(1.6, 30); p.yaw = 0; p.pitch = -0.02;
s.ebike.summon(); s.ebike.mount(); s.ebike.update();
await __shot('ride', 1200, 700, {})          // <- no `pos`, no `yaw`
```

Riding also has no keyboard in a headless page, so a ride is simulated by setting
`player.locked = true`, adding to `player.keys`, and stepping
`player.update(1/60)` and `ebike.update()` together — which is also the only way
to measure the top speed or watch the bank build.

`window.__scene` exposes `{ scene, camera, renderer, pipeline, world, player,
ebike, music, hud, sun, fill, bounce, hemi, THREE }`. If it is `undefined`, the dev server
has probably died — restart it with `preview_start` (config in
`.claude/launch.json`). It has died mid-session more than once.

**Camera positions worth keeping.** These are the establishing shot of each
district; use them before and after any change that could touch them.

```js
await __shot('open',    1400, 790, {})                                            // the opening frame
await __shot('hill',    1400, 790, { pos: [1.5, 0, -22], yaw: -0.14, pitch: 0.02 })   // up the 通学路
await __shot('gate',    1400, 790, { pos: [12.6, 0, -49.5], yaw: -1.42, pitch: 0.1 }) // the 昇降口
await __shot('yard',    1400, 790, { pos: [39, 0, -45], yaw: -0.7, pitch: 0.03 })     // the school ground
await __shot('alley',   1400, 790, { pos: [6.5, 0, 15.1], yaw: -1.5708, pitch: 0.06 })// into the shotengai
await __shot('shoten',  1400, 790, { pos: [22.2, 0, 20], yaw: 3.1416, pitch: 0.04 })  // the shopping street
await __shot('torii',   1400, 790, { pos: [-27.9, 0, 14], yaw: 3.1416, pitch: 0.1 })  // the shrine steps
await __shot('hall',    1400, 790, { pos: [-27.9, 0, 28], yaw: 3.1416, pitch: 0.1 })  // 社殿
await __shot('sento',   1400, 900, { pos: [16.4, 0, 39.4], yaw: -1.5708, pitch: 0.2 }) // the 富士 board
await __shot('alleyway',1000, 570, { pos: [-25.9, 0, 4.5], yaw: 1.79, pitch: 0.0 })    // the shrine alley mouth
await __shot('canal',   1400, 790, { pos: [-34, 0, -20.6], yaw: 1.62, pitch: -0.07 }) // along the water
await __shot('bridge',  1400, 790, { pos: [-22.5, 0, -24], yaw: 2.55, pitch: 0.0 })   // the slot view of the railway
await __shot('park',    1400, 790, { pos: [33, 0, 28], yaw: -1.9, pitch: 0.0 })       // 児童公園
await __shot('obdeck',  1400, 790, { pos: [41, 7.2, 0], yaw: 1.5708, pitch: -0.16 })  // down the track from the 跨線橋
await __shot('obpost',  1400, 790, { pos: [41, 0, 20.5], yaw: 0.02, pitch: 0.2 })     // the near stair tower
await __shot('rest',    1300, 800, { pos: [12.9, 0, 9.6], yaw: -2.05, pitch: -0.02 }) // the vending corner
await __shot('restm',   1300, 780, { pos: [14, 0, 7.2], yaw: -1.5708, pitch: 0.04 })  // the three machines
// added with the twelve-district round
await __shot('kobato',  1400, 790, { pos: [2.4, 0, -29.5], yaw: 3.1416, pitch: -0.01 })  // over こばと橋 to the crossing
await __shot('canalE',  1400, 790, { pos: [11, 0, -27.6], yaw: -1.5708, pitch: 0 })      // the channel running east
await __shot('sluice',  1400, 790, { pos: [29.5, 0, -21], yaw: 0, pitch: -0.06 })        // 第二分水門
await __shot('libwide', 1400, 790, { pos: [13.4, 0, 44.4], yaw: 3.05, pitch: 0.1 })      // into the library porch
await __shot('libflank',1400, 790, { pos: [4, 0, 45.6], yaw: -1.05, pitch: 0.05 })       // its sunlit west flank
await __shot('booth',   1150, 800, { pos: [1.6, 0, 45.4], yaw: 3.75, pitch: 0.06 })      // the phone box
await __shot('nblane',  1400, 790, { pos: [32.4, 0, 47.2], yaw: 3.09, pitch: 0.06 })     // down the residential lane
await __shot('terrace', 1400, 790, { pos: [33.4, 0, 63.4], yaw: -2.11, pitch: 0.06 })    // the terrace and its carport
await __shot('showa',   1400, 790, { pos: [22.2, 0, 34.2], yaw: 2.65, pitch: 0.06 })     // レコード / 電器
await __shot('backalley',1300, 780,{ pos: [13.5, 0, 16.6], yaw: 3.10, pitch: 0.02 })     // さくら坂裏路地
await __shot('stnalley',1300, 780, { pos: [15.1, 0, -18.4], yaw: 0, pitch: 0.02 })       // 駅裏の小径
await __shot('matsuri', 1400, 790, { pos: [-30.6, 0, 18.4], yaw: 1.47, pitch: 0.05 })    // the festival ground
// 湯の坂, the onsen street behind the shrine
await __shot('yugate',  1400, 790, { pos: [-22.5, 0, 36.5], yaw: 3.1416, pitch: 0.06 })  // the back gate, from the precinct
await __shot('yustreet',1400, 790, { pos: [-20.4, 0, 48.8], yaw: 1.5708, pitch: 0.02 })  // west down the street
await __shot('yueast',  1400, 790, { pos: [-45.4, 0, 48.8], yaw: -1.5708, pitch: 0.02 }) // east, from the 常夜灯
await __shot('yuryokan',1400, 790, { pos: [-40.0, 0, 48.4], yaw: 3.1416, pitch: 0.10 })  // 湯乃屋's porch and court
await __shot('yubath',  1400, 790, { pos: [-42.1, 0, 49.4], yaw: 0.0, pitch: 0.05 })     // 蓬莱湯's noren and lobby
await __shot('yuashiyu',1300, 800, { pos: [-36.4, 0, 49.6], yaw: 0.05, pitch: -0.10 })   // the footbath
await __shot('yubridge',1300, 800, { pos: [-34.2, 0, 47.0], yaw: 3.1416, pitch: -0.26 }) // up the channel from the bridge
await __shot('yudeckW', 1400, 790, { pos: [-21.6, 0, 55.4], yaw: 1.25, pitch: -0.06 })   // the deck, west over the roofs
await __shot('yudeckS', 1400, 790, { pos: [-21.6, 0, 55.4], yaw: 0.18, pitch: -0.05 })   // the deck, south toward the town
// the six residential blocks
await __shot('ichomeE', 1400, 790, { pos: [-13.2, 0, -6.9], yaw: 1.5708, pitch: 0.02 })  // west down 線路裏の道
await __shot('ichomeW', 1400, 790, { pos: [-58.0, 0, -6.9], yaw: -1.5708, pitch: 0.02 }) // back east, out of the closed slot
await __shot('nispine', 1400, 790, { pos: [49.2, 0, 12.0], yaw: 3.1416, pitch: 0.04 })   // 二丁目通り: the clinic, the pharmacy, the 不動産
await __shot('nishido', 1400, 790, { pos: [52.6, 0, 31.0], yaw: -1.5708, pitch: 0.02 })  // the 私道: 連棟 against 狭小住宅
await __shot('nicar',   1400, 790, { pos: [50.6, 0, 8.6], yaw: -1.5708, pitch: 0.02 })   // the 月極 park under the railway wall
await __shot('yonmouth',1400, 790, { pos: [-3.4, 0, 53.0], yaw: 3.1416, pitch: 0.05 })   // the main road's head and its barrier
await __shot('yonarm',  1400, 790, { pos: [7.0, 0, 56.9], yaw: 1.5708, pitch: 0.02 })    // west down 四丁目's arm to the T
await __shot('tsulane', 1400, 790, { pos: [-21.8, 0, -58.0], yaw: 3.1416, pitch: 0.03 }) // 五丁目's lane, shop backs to the east
await __shot('tsunuke', 1400, 790, { pos: [-18.0, 0, -53.8], yaw: -1.5708, pitch: 0.02 })// the 抜け道 between マート and こむぎ
await __shot('uralane', 1400, 790, { pos: [-10.3, 0, 51.6], yaw: 3.1416, pitch: 0.04 })  // 桜守裏町, north past the 祠
await __shot('uraarm',  1400, 790, { pos: [-2.0, 0, 64.8], yaw: 1.5708, pitch: 0.05 })   // under the 長屋's eave
await __shot('uragap',  1400, 790, { pos: [-1.6, 0, 57.4], yaw: 3.1416, pitch: 0.05 })   // through the hedge gap from the road head
// 学校前通り, the 通学路 dressed from こばと橋 to the school gate
await __shot('kobatoS', 1400, 790, { pos: [7.9, 0, -35.4], yaw: -0.5, pitch: 0.0 })      // こばと橋南詰, the bridge-head square
await __shot('towpath', 1200, 720, { pos: [9.2, 0, -28.4], yaw: 0, pitch: 0.05 })        // up the new flight from the canal path
await __shot('schoolS', 1400, 790, { pos: [3.0, 0, -44.0], yaw: 0, pitch: 0.02 })        // south to the gate, bike park on the left
await __shot('verge',   1400, 790, { pos: [8.9, 0, -64.0], yaw: 3.1416, pitch: 0.02 })   // north through the bicycle shelters
await __shot('bungu',   1400, 790, { pos: [0.4, 0, -58.6], yaw: 0.74, pitch: 0.03 })     // 文具 ひばり堂 and its gachapon
await __shot('ringyo',  1400, 790, { pos: [-21.2, 0, -55.4], yaw: -0.89, pitch: 0.03 })  // ひばり輪業, off 五丁目's lane
// 川端の道, between the canal and the school's back wall
await __shot('kwWest',  1400, 790, { pos: [21.0, 0, -32.2], yaw: -1.5708, pitch: 0.03 })  // east down the lane from its mouth
await __shot('kwEast',  1400, 790, { pos: [54.0, 0, -32.2], yaw: 1.5708, pitch: 0.03 })   // back west, the whole row against the water
await __shot('kwRamp',  1300, 780, { pos: [53.6, 0, -29.6], yaw: 1.5708, pitch: 0.02 })   // the ramp down to the towpath
await __shot('kwFar',   1400, 790, { pos: [34.0, 0, -26.0], yaw: 0, pitch: 0.04 })        // the row seen from the far bank
// added with the motor vehicles
await __shot('busstop', 1400, 790, { pos: [-4.0, 0, 33.0], yaw: 3.1416, pitch: 0.03 })   // ふれあい号 at 図書館前
await __shot('coinbay', 1400, 790, { pos: [25.5, 0, 44.2], yaw: -2.2, pitch: 0.05 })     // into ひばり駐車場
await __shot('tsukibay',1400, 790, { pos: [50.5, 0, 15.0], yaw: -1.15, pitch: 0.02 })    // the 月極 park's four bays
await __shot('hallbay', 1400, 790, { pos: [20.2, 0, 71.8], yaw: 0, pitch: 0.03 })        // the 町内会館's two, and the gap between them
await __shot('kobato2', 1400, 790, { pos: [4.8, 0, -29.0], yaw: 0.55, pitch: 0.02 })     // the 土地改良区's 軽トラ at こばと橋
await __shot('martdel', 1400, 790, { pos: [2.5, 0, -36.5], yaw: 0, pitch: 0.02 })        // the lorry on ひばりマート's apron, 徐行 on the road
await __shot('terrbay', 1400, 790, { pos: [32.6, 0, 65.6], yaw: -0.62, pitch: 0.03 })    // 三丁目's carport and its neighbour
// ひばり台六丁目, the bus turnaround.  `busstop` above still frames the stop at
// 図書館前 but the bus is no longer standing at it -- it lays over at its own
// terminus now, which is `rokuBus` below.
await __shot('rokuA',    1400, 790, { pos: [52.6, 0, 53.4], yaw: -1.45, pitch: 0.03 })   // east down 六丁目通り into the circle
await __shot('rokuBack', 1400, 790, { pos: [64.2, 0, 52.2], yaw: 1.5708, pitch: 0.02 })  // back west from the throat, the two shops lit
await __shot('rokuBus',  1400, 790, { pos: [65.4, 0, 47.4], yaw: -2.45, pitch: 0.05 })   // ふれあい号 in its yellow box on the 転回場
await __shot('rokuIsle', 1300, 800, { pos: [61.6, 0, 57.6], yaw: -1.76, pitch: 0.02 })   // the shelter, the stop and the route board
await __shot('rokuLane', 1400, 790, { pos: [51.15, 0, 55.6], yaw: 3.1416, pitch: 0.03 }) // 六丁目 北の道: the walk-up against the 長屋's eave
await __shot('rokuPark', 1400, 790, { pos: [56.4, 0, 51.4], yaw: 3.1416, pitch: 0.05 })  // the 月極's three bays and コーポ ひがし
await __shot('rokuTerr', 1400, 790, { pos: [72.4, 0, 54.2], yaw: -2.95, pitch: 0.08 })   // 連棟 三戸 over the circle's north rim
await __shot('rokuCorn', 1300, 780, { pos: [64.6, 0, 48.9], yaw: 1.62, pitch: 0.0 })     // the corner node: machine, board, bench, cherry
await __shot('rokuHill', 1400, 790, { pos: [51.0, 0, 58.6], yaw: -2.45, pitch: 0.10 })   // the gallery, the 擁壁 and the cut slope behind it
// ひばり台七丁目 -- スーパー さかえ and its roof car park
await __shot('n7front',   1400, 790, { pos: [-37.0, 0, 92.4], yaw: 0, pitch: 0.12 })      // the frontage and the 前場, from the road
await __shot('n7frontNE', 1400, 790, { pos: [-28.0, 0, 92.0], yaw: 0.838, pitch: 0.03 })  // the elevation angled, with the crossing and the 駐車場 board
await __shot('n7door',    1400, 790, { pos: [-37.4, 0, 83.4], yaw: 0, pitch: 0.02 })      // the automatic doors and the interior behind them
await __shot('n7recess',  1300, 780, { pos: [-40.0, 0, 81.9], yaw: -0.9, pitch: 0.0 })    // *inside* the recess -- the one spot there the deck platform does not cover
await __shot('n7court',   1400, 790, { pos: [-42.0, 0, 85.6], yaw: 1.4, pitch: 0.10 })    // the trolley bay's lean-to, west along the apron
await __shot('n7rampfoot',1400, 790, { pos: [-24.7, 0, 86.6], yaw: 0, pitch: 0.06 })      // the ramp mouth, under the 制限高 gantry
await __shot('n7rampcnr', 1400, 790, { pos: [-24.7, 0, 66.0], yaw: 0.5, pitch: 0.02 })    // from the flight, over 湯の坂's retaining wall into the onsen street
await __shot('n7ramptop', 1400, 790, { pos: [-38.0, 0, 63.4], yaw: 1.5708, pitch: 0.04 }) // up leg 2, the store's sunlit south flank on the right
await __shot('n7deckE',   1400, 790, { pos: [-29.6, 0, 74.0], yaw: 1.5708, pitch: 0.03 }) // the deck's aisle, west
await __shot('n7deckW',   1400, 790, { pos: [-46.4, 0, 74.0], yaw: -1.5708, pitch: 0.03 })// and back east
await __shot('n7bays',    1400, 790, { pos: [-33.0, 0, 71.0], yaw: 1.90, pitch: -0.30 })  // the bay markings, the wheel stops and the service block
await __shot('n7over',    1400, 790, { pos: [-33.0, 0, 81.3], yaw: 2.75, pitch: -0.55 }) // over the north parapet: the crossing, the coin park, blossom in the near corner
await __shot('n7yardNE',  1300, 760, { pos: [-55.2, 0, 68.0], yaw: -2.57, pitch: 0.05 })  // the 荷捌き場: shutter, dock, the 2 t lorry
await __shot('n7dock',    1400, 790, { pos: [-54.4, 0, 78.0], yaw: -0.9, pitch: 0.03 })   // the 荷捌き中 plate at the dock's north end
await __shot('n7coin',    1300, 760, { pos: [-38.0, 0, 97.4], yaw: 0.6, pitch: 0.03 })    // the coin park opposite, looking back at the store
await __shot('n7spur',    1300, 760, { pos: [-16.1, 0, 78.0], yaw: 3.1416, pitch: 0.02 }) // 七丁目通り's south leg and コーポ さかえ
await __shot('n7steps',   1300, 760, { pos: [-20.8, 0, 67.5], yaw: 0, pitch: 0.06 })      // the fourteen steps up to 湯の坂, through the gap in its wall
await __shot('n7pass',    1300, 760, { pos: [-20.7, 0, 80.0], yaw: 0, pitch: 0.02 })      // the service passage down the east side
// ひばり山 -- the back hills, the expanded school and the railway tunnel
await __shot('schGate',  1400, 790, { pos: [12.6, 0, -49.5], yaw: -1.42, pitch: 0.1 })   // the 昇降口, unchanged
await __shot('schCourt', 1500, 840, { pos: [35.6, 0, -69.6], yaw: -0.72, pitch: 0.05 })  // the 中庭, 第二校舎 across it
await __shot('schGnd',   1500, 840, { pos: [40.0, 0, -44.2], yaw: -2.39, pitch: 0.04 })  // the ground, the ball net, the gym
await __shot('schBack',  1400, 790, { pos: [18.0, 0, -90.5], yaw: -0.85, pitch: 0.06 })  // the north wall, from the 裾道
await __shot('uraRoad',  1500, 840, { pos: [12.0, 0, -89.6], yaw: -1.565, pitch: 0.02 }) // east down the hill-foot road
await __shot('uraHead',  1500, 840, { pos: [18.0, 0, -89.5], yaw: -0.087, pitch: 0.06 }) // the trail head and the maintenance yard
await __shot('uraHokora',1400, 800, { pos: [-32.0, 0, -111.2], yaw: 1.37, pitch: 0.02 }) // 山ノ神
await __shot('uraGlade', 1400, 800, { pos: [-14.0, 0, -122.0], yaw: 0.46, pitch: 0.04 }) // the 林間広場
// three of these were 180 degrees out -- see the note under the table
await __shot('uraDeck',  1500, 840, { pos: [31.0, 0, -139.0], yaw: -2.83, pitch: 0.06 }) // the 展望台, from the crest walk
await __shot('uraDeckUp',1500, 840, { pos: [35.8, 0, -128.2], yaw: -3.042, pitch: -0.30 })// **from it**, north over the school
await __shot('tunW',     1500, 840, { pos: [-150, 0, -12], yaw: -2.12, pitch: 0.06 })    // the lit west portal, a train going in
// ひばり山トンネル -- re-shot this round, because the bore can be walked into now
await __shot('tunE',     1400, 790, { pos: [-89, 0, -9], yaw: 2.481, pitch: 0.06 })      // the east portal from the railside spot
await __shot('tunO',     1400, 790, { pos: [-86, 0, 12], yaw: 0.695, pitch: -0.20 })     // the overlook, down onto that portal
await __shot('tunGate',  1300, 780, { pos: [-84.5, 0, -6.6], yaw: 2.018, pitch: 0.02 })  // the 保守用通路 gate, south side
await __shot('tunBore',  1400, 790, { pos: [-114, 0, -2.55], yaw: 1.5708, pitch: 0.03 }) // inside, west toward the far arch
// 東山トンネル -- the second bore, through the east shoulder's col
await __shot('higW',     1400, 790, { pos: [91, 0, 7.2], yaw: -1.170, pitch: 0.05 })     // the lit west portal, from the railside spot
await __shot('higE',     1400, 790, { pos: [150, 0, 8.2], yaw: 0.971, pitch: 0.05 })     // the shaded east portal
await __shot('higGate',  1300, 780, { pos: [85, 0, 6.4], yaw: -1.243, pitch: 0.02 })     // the gate and the whole approach
await __shot('higBoreE', 1400, 790, { pos: [112, 0, 2.55], yaw: -1.5708, pitch: 0.03 })  // inside, east
await __shot('higBoreW', 1400, 790, { pos: [134, 0, 2.55], yaw: 1.5708, pitch: 0.03 })   // and back west
await __shot('higRef',   1400, 790, { pos: [115.6, 0, 3.85], yaw: -0.819, pitch: 0.02 }) // **from inside a 待避所** -- see below
await __shot('higOver',  1400, 790, { pos: [104, 0, -12], yaw: -2.820, pitch: -0.22 })   // the overlook on the south ridge
await __shot('higCol',   1300, 1300, { orbit: 1.571, dist: 1.75, tilt: 0.97 })           // straight down on the col
// 杉林 and 法枠工 -- added with the second visual round
await __shot('cedarCrest',1200, 675, { pos: [8.0, 0, -138.4], yaw: 0.0, pitch: 0.05 })   // stand A's edge, from the crest glade
await __shot('cedarGlade',1200, 675, { pos: [-14.0, 0, -122.0], yaw: 0.46, pitch: 0.04 })// stand B closing the 林間広場 -- same as uraGlade
await __shot('cribWN',   1200, 675, { pos: [-139, 0, -9.5], yaw: 3.1416, pitch: 0.20 })  // ひばり山's north bank, the frame head-on
await __shot('cribES',   1200, 675, { pos: [100, 0, 9.5], yaw: 0.0, pitch: 0.20 })       // 東山's south bank, across the line
// ひばり湖 -- the lake district.  `look` is pasted in first and every yaw below is
// derived from it, per the note under the table.
await __shot('lkDeck',   1400, 790, { pos: [122.6, 0, -106.6], yaw: look([122.6,-106.6],[200,-96]), pitch: -0.20 })  // the 見晴台, east down the basin
await __shot('lkPark',   1400, 790, { pos: [133.0, 0, -74.0],  yaw: look([133,-74],[176,-88]),      pitch: -0.09 })  // the park's plaza and the 桟橋
await __shot('lkPier',   1400, 790, { pos: [166.0, 0, -80.0],  yaw: look([166,-80],[200,-98]),      pitch: -0.05 })  // **from the 桟橋's head** -- the money shot
await __shot('lkCafe',   1400, 790, { pos: [178.6, 0, -140.0], yaw: look([178.6,-140],[172,-112]),  pitch: -0.02 })  // 喫茶 みなも's terrace, north over the water
await __shot('lkBoat',   1400, 790, { pos: [143.0, 0, -92.0],  yaw: look([143,-92],[147,-103]),     pitch: -0.05 })  // the boat station and its fleet
await __shot('lkDam',    1400, 790, { pos: [150.0, 0, -40.6],  yaw: look([150,-40.6],[143,-46]),    pitch: -0.03 })  // along the embankment's crest
await __shot('lkRoad',   1400, 790, { pos: [130.0, 0, -33.6],  yaw: look([130,-33.6],[150,-35]),    pitch: 0.02 })   // 湖畔道路 in its cutting
await __shot('lkReed',   1400, 790, { pos: [216.4, 0, -143.4], yaw: look([216.4,-143.4],[206,-132]),pitch: 0.0 })    // the reed bay's boardwalk
await __shot('lkHide',   1400, 790, { pos: [214.0, 0, -138.2], yaw: look([214,-138.2],[200,-126]),  pitch: -0.02 })  // **from inside the hide**, through the slots
await __shot('lkCamp',   1400, 790, { pos: [200.0, 0, -146.0], yaw: look([200,-146],[212,-150]),    pitch: 0.0 })    // the campsite's pitches
await __shot('lkSuijin', 1400, 790, { pos: [251.6, 0, -95.0],  yaw: look([251.6,-95],[246,-88]),    pitch: -0.06 })  // 水神様 on the far shore
```

**Never put a lake camera at a spot without checking `heightAt` against the water
surface.** `__shot` re-derives the feet from `world.heightAt`, and inside ひばり湖
that is the **bed** — so a position two metres out from the shore seats the camera
0.5 to 2.6 m *under* the surface, and because `flat()` is single-sided the water is
invisible from below. The frame comes back as a huge flat pale-green area with the
scene floating above it and no clue why. `waterY(z)` is 4.435 over the whole lake;
if `world.heightAt(x, z)` is under that, the spot is in the water. Two of the first
six positions here were, including one that produced exactly that frame.

**Three of the ひばり山 camera lines were 180° out and two of them had never been
looked at.**  `yaw` is `atan2(-dx, -dz)`; all three were written with
`atan2(+dx, +dz)`, which is the same number reflected through the origin, so each
one pointed at the back of whatever it was named after.  `uraDeckUp` — "north over
the school" — was looking *south* at its own stair and 眺望案内 panel; `uraDeck` —
"the 展望台, from the crest walk" — was looking away from the deck into the
hillside; and `tunW` was aimed at an empty field north-east of a portal that is
west of it.  A wrong yaw does not look wrong: it returns a perfectly composed
frame of something else.  **Paste the `look` helper in and derive it** rather than
writing the number, and if a frame does not contain the thing its comment names,
suspect the sign before suspecting the world.

**`higRef` is the best frame in either tunnel and it needs a train in it.**  Nothing
animates on its own here, so step the world first — the train is beside that refuge
after about 300 simulated frames from a fresh load:

```js
const w = window.__scene.world;
for (let i = 0; i < 300; i++) w.update(1 / 60);
await __shot('higRef', 1400, 790, { pos: [115.6, 0, 3.85], yaw: -0.819, pitch: 0.02 })
```

A player standing in a refuge is at |z| ≥ 2.29 after their own radius, against a
train body half-width of 1.43 — so the train passes 0.86 m away and *does not* go
through them.  That clearance is the reason the walkway is 1.35 m and not 0.62.

**An orbit camera is aimed with the planet's own mapping, not by guesswork.**
`orbitDir` is `(sin(orbit)·tilt, 1, cos(orbit)·tilt)` normalised, so to look
straight down on a flat point take its direction and read the two off it:

```js
const P = await import('/src/world/planet.js');
const v = new THREE.Vector3(); P.positionAt(123, 0, 0, v);
const d = v.clone().sub(P.CENTER).normalize();
// orbit = atan2(d.x, d.z);  tilt = hypot(d.x, d.z) / d.y
```

For the east col that is `orbit 1.571, tilt 0.97`; for ひばり山トンネル,
`orbit -1.571, tilt 0.86`.  Guessed values put the camera over the town both times.

**The 展望台 is the most expensive view in the world now** — about 13 600 draw
calls against 5 800 at the crossing and 7 000 on the overbridge deck.  You are
18.3 m above the datum with a 76 m ground horizon, so the school, the ground, the
gym, the hill-foot road, most of the massif's planting and a good deal of the town
are all in frame and almost nothing is culled.  Worth knowing before blaming a
change for a frame-time regression measured up there.

**Two of those positions were thrown away before they were written down**, both
for reasons already in the trap table: `tunE` was first taken from (-74, -18),
which is 1.15 m outside a ひばり台一丁目 building and came back as a wall filling
half the frame; and the overlook was first at (-94, 18), which is *behind* the
crest of the cutting's bank, so the sight line went into the hillside and the
frame came back a uniform violet with a vignette.  On the hills, check a new
position against `world.colliders` **and** against `hillAt` along the sight line —
the second one is new, and it is the one that costs a turn.

**And it cost two more on 東山's overlook**, which is worth writing down as a
recipe rather than as an anecdote.  The first position (104, −13.6) is 1.6 m
*south* of the ridge's crest, so the whole frame was hillside; the sight line
check is four lines and it finds this in one call:

```js
const sees = (x, z, tx, tz, ty) => {                 // eye 1.7 over the platform
  const y0 = hillAt(x, z) + 0.22 + 1.7;
  for (let t = 0.05; t < 1; t += 0.03) {
    const px = x + (tx - x) * t, pz = z + (tz - z) * t;
    if (hillAt(px, pz) > y0 + (ty - y0) * t - 0.4) return false;
  }
  return true;
};
```

Run it over the whole ridge and take the highest point that passes.  75 of them
did; (104, −12) is the best, and no amount of looking at renders would have said
so.

**七丁目 has a trap the other twenty-two do not.**  `__shot` re-derives the feet
from `world.heightAt(x, z)` **with no `fromY`**, which is the max over every
platform — so anywhere inside スーパー さかえ's footprint it seats the camera on
the **roof deck, 5.75 m above where you asked for**.  `n7recess` works only
because the outer 0.3 m of the entrance recess is the one part of it that the
deck's own platform does not reach.  If a camera in this district comes back
looking at parked cars when you asked for a shopfront, that is what happened.

**Every one of those was walked into before it was written down.**  `__shot`
re-derives the feet from `world.heightAt` and does not care whether the spot is
inside anything, so a camera position picked off a plan lands *inside* a shop, a
vending machine or a parked van about half the time — and the frame that comes
back is a wall with a ceiling on it and no clue why.  Check a new position
against `world.colliders` first, or expect to throw the first three away.

**Verify a change without a screenshot first.** A world that throws inside
`buildWorld` leaves `window.__scene` **undefined and the console empty** — the
error is swallowed and every `__shot` call then fails with a message that says
nothing about the cause. Build it headless in the page and read the stack:

```js
// via mcp__Claude_Browser__javascript_tool
try {
  const w = await import('/src/world/index.js?t=' + Date.now());
  w.buildWorld({ add() {}, children: [], traverse() {} });
  'built OK';
} catch (e) { 'THROW: ' + e.stack; }
```

`buildWorld` only ever calls `scene.add`, so a three-method stub is enough. This
turns "the page is blank and there is nothing in the console" into a file and a
line number, and it is the first thing to run after any edit.

**`yaw` is `atan2(-dx, -dz)`**, i.e. 0 looks along −z, `+π/2` along −x and `π`
along +z. Working it out by hand each time wastes turns; paste this in first and
use it:

```js
window.look = (from, to) => Math.atan2(-(to[0] - from[0]), -(to[1] - from[1]));
await __shot('x', 1400, 790, { pos: [13.4, 0, 44.4], yaw: look([13.4, 44.4], [15.8, 51.5]), pitch: 0.1 })
```

**`__shot` ignores `pos[1]`** — it always re-derives the feet from
`world.heightAt`, so the bridge deck needs no special handling: `pos: [41, 0, 0]`
lands you on it because the deck is a registered platform. The deck is the most
expensive view in the world (~5500 draw calls against ~4700 at the crossing)
because almost nothing is culled from up there.

**Press `C` in the running game for a coordinate readout** (bottom right, off by
default). It reports the *flat authoring* position — the only coordinate system
any builder, collider or camera call uses — plus the yaw as a compass direction,
and a ready-made `{ pos: […], yaw, pitch }` line. **`Shift+C`, or clicking the
readout, copies that line to the clipboard**, so a spot can be pasted straight
into `__shot` or into a bug report. That is the fastest way to be told exactly
where something is wrong.

**Wall-clock frame time on this machine drifts 33-42 ms run to run** with nothing
changed, so it cannot resolve anything smaller than about 8 ms. Compare **draw
calls** when judging a change, and only trust a timing difference you can
reproduce across several alternating A/B runs in one page session.

**Raycasting to identify something odd in a frame** is the fastest way to find
what a mystery shape is — but `Raycaster.setFromCamera` reads `camera.matrixWorld`,
which `__shot` does not flush. Render the frame first, then call
`camera.updateMatrixWorld(true)`, or the ray fires from wherever the camera was
two shots ago and you will chase a bug that is not there.

**This project's bugs are visual, not exceptions.** Every significant bug found
so far threw nothing and logged nothing — terrain sampled at the wrong z covering
the road, window frames winning the depth test over the glass behind them,
vending machine stock buried inside an opaque body, rails the same tonal value as
the concrete they cross, a planet shadowing its own surface. A clean console
means nothing. Render a frame and look at it.

---

## Conventions

- **Author on the flat XZ plane.** Every builder, collider and height query works
  in flat coordinates. `src/world/planet.js` projects the finished world onto the
  sphere in a single `bakeToPlanet()` pass at the end of `buildWorld()`. Add new
  content the flat way and the bake handles it — do not write spherical
  placement by hand.
- **One thing circles the planet, and it used to be two.** The railway is
  authored as a straight line at `z = 0` spanning exactly one `CIRCUMFERENCE` in
  `x`, so the equirectangular bake closes it with no seam, and it follows one
  rule: **the structure runs the whole way round and the dressing does not.**
  Track, ballast and rails go all the way; fencing, the station, the masking
  walls, planting, furniture and signage stop at the district — or at a bore,
  which is why every longitude test in `railway.js` takes the union over
  `TUNNELS`.
  The drainage channel **was** the second and is not any more: it is bounded to
  `CANAL_X0..CANAL_X1` (−98 … 106) and closed at each end by a 暗渠 headwall, so
  the range can cross `z = -24` instead of a flat 28 m corridor being sawn
  through both arms of it. Everything downstream of that reads the same two
  constants — `landform.js`'s trench, `hills.js`'s `chanHere` and `inKeepOut`,
  `canal.js`'s `X_MIN`/`X_MAX` — so the water, the hole it needs in both ground
  surfaces, and the ground the hills may not touch cannot drift apart.
  Both still have a corridor in `reliefAt` for the hill that used to come up
  through them — **`RELIEF` is 0 now and the planet is a true sphere**, so those
  corridors are inert and kept only as the record of which latitudes must stay
  flat if it is ever turned back on. The channel's *keep-out* corridor in
  `hills.js` is a different thing and is very much live.
- **`makeHouse` is the detached-house generator; `housing.js` has the other
  three.** `makeAtticHouse` (二階半, a dormer out of a steep roof),
  `makeWalkup` (a three-storey block: gallery, open stair, one balcony detail
  repeated) and `makeTerrace` (連棟, N narrow units sharing party walls). All
  three are authored facing +Z and rotated by `face`, the `makeShop`
  convention — much less error-prone than branching on an axis inside every
  measurement. A terrace's variety is *per unit and material-free*: same wall,
  same roof, same window, different door colour, different clutter, one shutter
  down. Vary its walls and it stops being a terrace.
- **A swept solid, not a run of boxes, wherever the road is involved.** The road
  drifts in `x` and falls in `y` at the same time, so a run of short boxes steps
  both ways and reads as a pile of separate slabs with the ink pass outlining
  every one. `canal.js`'s `sweptSolid` builds a continuous casting out of
  `makeStrip` quad strips instead — used for こばと橋's fill, deck, parapets and
  edge upstands, and worth reusing for anything else that has to follow
  `centerX` and `groundY` together.
- **A ramp is a staircase to the walker and a solid to the eye — build both.**
  `heightAt` is a max over axis-aligned boxes and cannot express a slope, so the
  feet need a run of stepped `ctx.platform` calls; but the ink pass fires on
  every box's silhouette, so *drawing* that run is eight pale slabs with a black
  line between each. 川端の道's towpath ramp registers eight platforms and draws
  **one** box raked by `atan2(rise, run)` — and a box along X turned by `rz`
  about Z sends its +x end *up*, so the sign is negative for a ramp that falls
  east. That derivation is the one the overbridge stringers got wrong in both
  directions.
- **`ctx.collide(x0, z0, x1, z1, top, bottom)` — the sixth argument is new.**
  `bottom` makes a collider start at a height: anything whose feet are more than
  1.9 m below it walks straight through. It exists for barriers whose job is only
  up in the air — スーパー さかえ's roof parapet has to stop a walker on the deck
  and must not be a wall across the shop doorway five metres below. Everything
  else leaves it undefined, which is the behaviour the whole world was built on.
- **The ground is a *plane* everywhere except ひばり山, and the hills are a third
  surface on top of the other two.**  `hills.js` does not touch the terrain grid
  or the planet sphere — the relief that used to displace the sphere is still 0
  and must stay that way.  Instead `hillAt(x, z)` is added to `streetHeight` by
  `world.heightAt` and `ctx.groundAt` (in `index.js`, **not** inside `reliefAt`,
  because `buildPlanet` samples that one and its 5.4 m facets would chord across
  the lattice and poke through the hill mesh), and the drawn hill is its own
  faceted mesh at `groundY(z) + fieldAt(x, z) − TERRAIN_DROP`.  Where the field
  is positive the mesh is above the flat grid and hides it; where it is negative
  the mesh is buried and the grid is the ground.  The two meet along the contour
  `field = 0`, which is a line and not an area, so there is nothing to z-fight
  over.  **Anything standing on the hill is seated with `ctx.groundAt` exactly
  like anything else in the world**, and anything that *is* the hill's surface
  uses `hillMeshY`.
- **`hillAt` is exactly 0 over every square metre of built ground, and that is
  checked rather than believed.**  `hillSafety(world)` samples every collider and
  platform whose centre is inside a keep-out and reports the worst height it
  finds; it must read 0.00.  Run it after adding a summit, moving a keep-out
  rectangle, or building anything within twenty metres of the hills.
- **A hillside's gentleness is enforced, not hoped for.**  The lattice is passed
  through a slope limiter that repeatedly *lowers* any node standing more than
  `maxSlope · CELL` above a neighbour.  It only lowers, so the keep-outs and the
  buried apron survive it.  0.52 everywhere except inside the two ring corridors,
  where it is 1.9 — a railway cutting is steep on purpose and a wooded hillside is
  not.  Two consequences worth knowing: a limiter pinned along a *straight* line
  produces a perfectly uniform ramp with no oblique route up it (see the note in
  `hills.js`), and the limiter has to run **before** the roughness or it flattens
  the very thing the roughness is for.
- **A path on a slope is a surface treatment, not a platform.**  `ctx.platform` is
  an axis-aligned box and cannot express a slope, so nothing on the hills
  registers one: what carries the player is `hillAt` itself.  `hillPath` sweeps a
  ribbon that follows the field and hands back the measured gradient of every leg,
  and the district lays 丸太階段 where *that* says rather than where a list says.
  Steep is fine — the walker has no slope limit — but a leg over about 0.28 has to
  look like a stair or the path reads as unmaintained.
- **Water above the datum is a contour; water below it is a hole.** The 用水路 is
  a hole — faces removed from the terrain grid *and* the planet sphere, sealed by
  its own concrete, with a `ctx.cut` so the height query follows the excavation.
  That is three cooperating layers and a cut edge to seal all the way round, which
  is fine for a 5 m channel and absurd for a 110 m lake. **ひばり湖 is the other
  way up**: the surface is flat at `groundY + LEVEL − TERRAIN_DROP` and it is
  hidden wherever the ground is higher, which is the *same* trick the hill mesh
  already uses against the terrain grid. Three things fall out of it — the
  shoreline is a contour and so is irregular for free, depth is `LEVEL − field` and
  is therefore available to everything downstream (`lakeDepthAt`), and **nothing in
  `street.js`, `planet.js` or `landform.js` had to change**. The price is that the
  lake is perched, which is what a ため池 is.
- **The lake's shape lives in `lakeform.js` and it is not a district.** Same
  relationship `landform.js` has to `canal.js`: it describes the hole with no
  materials, no props and no import that could come back to it, because `hills.js`
  reads it *while building its lattice*. The shoreline is 37 vertices with five
  attributes each (`bank`, `dr`, `dm`, `cr`, `fa`) and every vertex sits on the
  range's own `LEVEL` contour, read off a `naturalAt` survey rather than drawn.
- **`naturalAt(x, z)` is what the range would do before the lake touches it.**
  Exported for surveying, not for building: once `lakeGround` is folded into the
  lattice there is no way to ask "where is the valley mouth" from `fieldAt`, because
  the answer already has an embankment standing in it. Every number in `DAMS` and
  `CHANNELS` was read off a map dumped from it.
- **A route may carry a designed longitudinal profile, and a road has to.**
  `ROUTES` in `hills.js` is `TRAILS` with a bench half-width and an optional third
  number per vertex. Where the number is there the bench cuts and fills to *it*;
  where it is not, the profile is sampled. 湖畔道路 needs it (the natural line is
  0.0 for eighteen metres and then 3.1 m in the next twelve — a 0.26 pitch in the
  middle of a level lane); the 遊歩道 must not have it (a stepped hill path should
  follow the ground, and any profile gentle enough to feel graded implies a
  seven-metre cutting). Sampled routes want their vertices 4–6 m apart, because the
  bench interpolates *between* them and two far-apart samples fill new hillside.
- **A new district is a module that returns its planting.** Give it a
  `build<Name>(ctx)` in `src/world/`, add it to the `districts` array in
  `index.js`, and have it return `{ sakura, shrubs, grove, bamboo, petals }`
  spots plus an optional `update(dt)`. The tree and petal builders merge the
  whole world into a handful of instanced meshes, so they must run once, at the
  end — planting inside a district multiplies the draw calls by the number of
  districts. **A module nobody imports builds nothing**, silently: three
  finished blocks sat complete and unreferenced in `src/world/` for a whole
  round because the `districts` array was never touched.
- **Order in the `districts` array is `ctx.groundAt` order.** A block that sits
  against another district's surfaces has to run after them (一丁目 needs the
  canal's verge pad to derive its step rises, 四丁目 arrives off the library's
  corner pad, 公園前 measures itself off the overbridge) and all of them run
  before `buildDistrict`, so the housing sweep seats its clutter on the lanes
  they lay rather than on the bare grade.
- **Start a new block by measuring the land, not by remembering it.** Query
  `world.colliders` over the envelope and `streetHeight + reliefAt` on a grid
  before choosing a single coordinate, and write the result into the module's
  header as a list of what the parcel is already spoken for. Every block here
  has that list; the one time it was written from memory it left out a
  building and the lane went through it.
- **Reuse `ground.js` for civil works** — `pad`, `lane`, `steps`, `wallRun`,
  `meshFence`, `railing`, `dapple`. `steps` is the one to know: it emits tread
  geometry *and* one `ctx.platform` per tread, which is what walks the player up.
  A collider would just be a wall, because its top always sits above the feet.
- **Every shop comes from `makeShop`** (`shops.js`). Nine tenants, one
  construction. If a new building needs a glazed frontage, use it rather than
  writing another one — it already gets the recess right.
- **Every motor vehicle comes from `makeVehicle`** (`vehicles.js`), and every
  *placed* one from `parkVehicle`, which registers the collider for it. A kind
  is a row in `SPEC`, not a function. Vehicles are authored **along +x with the
  nose at +x**, the same convention as `makeBicycle`, `makeScooter` and
  `makeKeiTruck`, so `ry` is the direction the nose faces: `0` is +x, `PI/2` is
  −z, `PI` is −x, `-PI/2` is +z. Japan drives on the left, so a car at the east
  kerb of a north–south street noses −z and one at the west kerb noses +z —
  which is both correct and half of what makes a row of parked cars read as a
  street. `traffic.js` holds every one of them with the reason it is there.
- **Anything that moves *and* is placed after the bake is a runtime module, not
  a district.** `planetRigid` covers the things that animate in place — a boom,
  a shutter, a cat — because the bake can re-seat them once and leave the rig
  intact. It cannot cover something that is *somewhere else* on the next frame:
  the e-bike is summoned at an arbitrary point and then driven, so it is built
  in `main.js` after `buildWorld` and re-seats itself every frame with
  `basisAt` / `positionAt`. Anything it registers — a collider, an
  interactable — is pushed onto and spliced out of `world.colliders` and
  `world.interactables` by hand, and the way to check that is the *count*: park
  it, ride it, put it away, and the two lists must come back to where they
  started.
- **Anything animated needs `userData.planetRigid = true`** on its group,
  including the cloth in `details.js`. The bake bends geometry into world space
  and clears container transforms, which destroys pivots.
- **All materials go through `cel()` or `flat()`** from `src/core/toon.js`. Never
  construct a `MeshStandardMaterial` / `MeshToonMaterial` directly: `cel()`
  applies the gradient ramp and the patched shadow-tint shader that the whole
  look depends on. Colours come from `PAL` in `src/core/palette.js`.
- **Textures are drawn procedurally** with Canvas2D in `src/core/textures.js`.
  The music playlist contains the only binary assets. Keep it that way — signage,
  paint and masks are all generated, and the art direction explicitly rules out
  high-frequency texture detail.
- **Use the seeded RNG** (`rngKit` in `src/core/util.js`) for anything random, so
  the street is identical on every load.
- Merge static geometry with `bake()` (`util.js`) and instance repeated props.
  **The scene is draw-call bound**, measured: ~20 ms at the crossing (the
  heaviest view, ~3050 calls in the colour pass), ~11 ms in the shopping street
  (~1400 calls), 585k triangles, ~5000 meshes. Halving the internal resolution
  changes nothing (19.3 → 19.1 ms) and shrinking the shadow cascade from ±34 m to
  ±22 m barely helps (19.7 → 18.4 ms) — so if a frame time regresses, do not go
  looking at fill rate or shadows. Count draw calls.
  The known remaining cost is prop groups that are a dozen separate meshes and
  get placed dozens of times — `makePlanter` is eleven meshes, `makeBicycle`
  fourteen. `makeBikeRack` shows the fix: bake one item into three geometries by
  material, then instance the three. Applying that to the planters and loose
  bicycles is the obvious next win, worth roughly a thousand calls.
- **Anything planet-scale is never frustum-culled**, because after the bake its
  bounding sphere is the whole planet. That was the price of two rings: the
  railway and the canal between them submitted about 900k triangles on *every*
  frame no matter where the camera pointed (measured: 926k standing in the
  library forecourt with almost nothing in view). **Only the railway does that
  now** — the channel is bounded to a 204 m reach, so its whole structure is
  ordinary district-scale geometry that culls like everything else — but the
  reasoning below still applies to the railway and to anything else that ever
  goes right round. It is vertex work with no shading and it has never shown up
  in a timing, but it is the reason the canal
  ran its coping, service paths and retaining kerb only over the dressed
  stretch — moving those three layers off the remote ring saved 134k triangles,
  a fifth of the whole scene, and nobody can see the difference.

---

## Traps that have already bitten

| Thing | Why |
|---|---|
| Planet sphere must have `castShadow = false` | It is a closed surface; its far hemisphere renders into the shadow map and drops the **entire world** into its own shadow. Symptom: everything uniformly dark for no visible reason. |
| Animated rigs need `userData.planetRigid = true` | The bake bends geometry into world space and clears container transforms, which destroys animation pivots. Marked groups get re-seated on the surface with their rig intact. Currently: crossing corners, shop shutter, all vending machines, the cat, the eight cloth hangs in `details.js`, and the twenty-four train wheel hubs — 49 rigid entries in `bakeStats`. If you add something that moves and it is not in that count, it is not rigid and it will fly. |
| **A multi-material mesh must keep its `geometry.groups` through the bake** | `subdivideLongEdges` rebuilds the geometry from scratch, and `toNonIndexed()` drops groups too, so they have to be carried across explicitly — which `planet.js` now does. Get this wrong and a mesh with a material *array* and no groups **is not drawn at all**: it does not fall back to `material[0]`, it contributes nothing to the render list. Every sign in this world is a box with one mapped face, so it took out all fifty-four of them at once and looked like an art choice. Symptom: a district where nobody has put their sign up. |
| **Never animate a transform on a mesh the bake has folded** | The bake puts a mesh's geometry into root space and resets its `position`/`quaternion` to the identity. So any `rotation.*` written afterwards no longer turns the part about itself — it swings root-space geometry about the **world origin**. The train wheels were bare meshes with `position` set and `rotation.z` spun: after the bake that became twenty-four dark 0.86 m discs orbiting the world origin on a 7.4 m radius at nine revolutions a second, travelling with the train. Anything that moves needs a `planetRigid` hub (so the bake re-seats it instead of folding it) with an inner group for the animation — hub, axle, mesh. Symptom: discs or panels flying in the sky, keeping pace with whatever they belong to. |
| **Never drive `rotation.x/y/z` on a group the bake has re-seated** | A re-seated rig carries its placement as a *quaternion*, and Euler is kept in sync with it — so for anything turned a quarter turn the Euler X is about ±90°, and writing `rotation.x = flutter` throws that away and rolls the object about its own normal. Put an inner pivot group under the rigid group and animate that; the bake skips it (`underRigid`) and it stays the identity. Symptom: a horizontal noren hanging as a vertical banner with its lettering on its side — and only for the units rotated to face across the street. |
| Check a texture's aspect against the face it lands on | `alleyPlate` is 512 × 128 and was mapped onto a 0.24 × 1.5 m post face: a 25-fold horizontal crush that renders as an unreadable vertical smear, not as an error. If a decal is a blur, compare the two aspect ratios before you touch anything else. |
| `X_MIN/X_MAX = ±CIRCUMFERENCE/2` in `railway.js` | This is what makes the rail loop close seamlessly. Change it and the track no longer meets itself. |
| Long geometry relies on `subdivideLongEdges` | A 1005 m rail is authored as a 2-vertex box; without subdivision it chords straight through the planet. Anything planet-scale must survive that pass. |
| Transparent materials must not cast shadows | `shadowify()` skips them. A glazed vending display casting a hard shadow onto its own stock is what made the bottles look muddy. |
| Thin/transparent meshes want `depthWrite: false` | The ink pass reads the depth buffer, so petals and wires would otherwise get outlined into speckle. |
| **Any `.bat` added here must be CRLF** | There is no launcher in the repo any more, but the rule outlived it and `.gitattributes` still enforces it: cmd.exe silently aborts an LF-only batch file at the first multi-line `if ( ... )` block, and the symptom is a double-click that appears to do nothing at all. Write the tests as single-line `if ... goto` so the script survives a re-mangling. |
| Don't drive audio/UI envelopes from `requestAnimationFrame` | rAF can be suspended entirely; a stalled fade leaves music playing at volume 0 with `paused === false`. `src/core/audio.js` uses timers plus a trailing snap that guarantees the end state. |
| Radius trades against visible depth | Ground horizon is `√(2Rh)` ≈ 23 m at `R = 160`. Shrinking `R` pulls the horizon in and hides more of the district; growing it flattens the planet. One constant, top of `planet.js`. |
| **The world has two ground surfaces and they must share every displacement** | `buildPlanet`'s sphere and `street.js`'s terrain grid sit 65 mm apart and cover the same ground. `reliefAt` was applied to the sphere and *not* to the grid, so wherever the relief passed 65 mm the sphere came up **through** the grid — and through the road, the lanes, the pads, the kerbs and the tyres of anything parked on them. Measured before it was switched off: 7 346 m² of the walkable bounds above the grid and 21 colliders standing on it, worst 1.68 m. `RELIEF` is 0 now. **Anything that displaces one of those two surfaces has to displace the other by the same amount, or it is this bug again.** |
| **`IcosahedronGeometry` detail is `d + 1` subdivisions, not `2^d`** | So detail 6 at `R = 160` is a **24 m** facet, and a facet's centre sags about `e²/(6R)` — 0.60 m — below the true sphere. Under the terrain grid that is invisible; out past the grid, where the sphere *is* the ground under the far half of both rings, it is half a metre of ground falling away between one vertex and the next. Detail 30 is a 5.4 m facet sagging 30 mm, well inside the 65 mm the grid clears by, and costs 18 k triangles in one draw call that is never culled anyway. |
| **`computeVertexNormals()` on a non-indexed geometry *is* flat shading** | `PolyhedronGeometry` is non-indexed and `cutSphereTrench` rebuilds it as a bare position list, so every vertex of a triangle gets the face normal and `flat: false` on the material changes nothing. On the planet that quantised the toon ramp per facet and drew the terminator as a staircase of triangles. The sphere's normals are now taken radially, which is one loop and exact. **And re-read `geometry.attributes.position` after any pass that replaces it** — writing the normal buffer from the pre-cut attribute gives a shorter array, which three.js does not complain about; it just shades the tail of the mesh with whatever is in memory. |
| **No tree canopy may `receiveShadow` — blossom *or* green** | A ramp only shapes *direct* light, so once the shadow map zeroes the sun a blob falls back to ambient. A big tree self-shadows heavily, so what you get is a handful of *isolated* blobs on one canopy going dark while the rest of the tree looks fine. Symptom: **round dark circles hanging in the sky** next to a tree that is fine. It was fixed on the blossom and left on the green for a long time afterwards, where it is much worse: the deepest grove tone starts at `#3f6b52`, and ambient on that under a violet tint is very nearly black — which is how it gets reported, as black circles rather than as shade. Worst against clear sky, so check the grove rings east of the bridge, behind the school's east wall and along the canal. `buildBamboo` never set it and is fine; shrubs keep it on deliberately, because they sit on the ground where being in a building's shade reads correctly. |
| Baked meshes are frustum culled | The bake leaves an identity transform and root-space geometry, so the geometry bounding sphere is already a world bound and the test is exact. Turning it off costs ~8 ms — most of a frame at 5000 meshes. Instanced meshes stay unculled on purpose. |
| Thin overhanging copings must not cast | A 60 mm overhang is about two shadow-map texels at this cascade size, so its own shadow lands as a row of sawtooth triangles along the wall face rather than as a line. `wallRun` sets `castShadow = false` on the cap for exactly this reason. |
| `makeStrip` assumes **ascending** z | Sweeping `z0 > z1` reverses the winding and the strip ends up facing into the ground — invisible, no error. The green belt and `lane()` both learned this the hard way. |
| The canal is a hole, not an object | A sunken channel needs faces *removed* from both the terrain grid and the planet sphere (`landform.js`). Displacing them down does not work at 2.5 m tessellation. If you widen `FOOTPRINT_HALF` past the concrete that seals it, you get a view through the planet. |
| Platform boxes must **overlap**, not meet | `heightAt` takes the max over platforms. A few centimetres of gap between the top stair tread and the terrace it lands on is a hole the player falls through. |
| A terrace needs a parapet, not a flush wall | `_resolve` skips any collider whose top is within one step of the player's feet, so a retaining wall level with the terrace lets you stroll off a two-metre drop. The shrine's wall stands 0.5 m proud for that reason alone. |
| Cel materials on very thin geometry need `flat: false` | At reed thickness you only ever see one facet, and a flat-shaded facet turned away from the sun is nearly black. The first reeds came out as a bundle of dark skewers. |
| A translucent sheet is not a mesh fence | A flat panel at low opacity reads as tinted glass. `chainLinkTex` draws the lattice with genuinely transparent gaps, and mipmapping softens it to a pale wash at distance instead of aliasing. |
| **Two-sided signs must NOT use `mirrored()`** | This table used to say the opposite, and it was wrong. `BoxGeometry` builds each face with its own `udir` and already reverses it on the negative face of every axis, so one map reads correctly from *both* sides of a plate. Adding `mirrored()` is what produces the mirror writing it was supposed to prevent — it was on every blade sign, the alley arch, the bathhouse board and every `makeSignPost({ double: true })`, i.e. the reverse of every two-sided sign in the world. Verified by rendering the same plate from both sides. `mirrored()` is still exported but nothing should need it. |
| Check which way pavement clutter faces | Props outside a shop are placed in world space but built facing +Z, so a unit whose frontage looks −x needs `ry = -PI/2` on everything stood outside it. Getting it backwards leaves the gachapon showing the street three blank coloured panels. |
| **A part rotated about its own centre does not end where its length says** | `trees.js` computed the trunk tip as `x + sin(leanDir)·lean·trunkH·0.9`, but the trunk is a cylinder rotated about its *centre*, so the tip is centre + R·(0, trunkH/2, 0) — which to first order is `x + (trunkH/2)·lean·cos(leanDir)`. Sin and cos swapped, and 0.9·trunkH where the half-height belongs. Every limb and every blossom blob in the world was planted ~0.4 m from a trunk top 0.17 m across, at ninety degrees to the lean, in a different direction per tree. Apply the rotation to the offset with `applyEuler` instead of hand-deriving it. |
| Build assemblies from joints, not from part positions | Both copies of `makeBicycle` placed five cylinders by eye: the fork stopped 0.3 m short of the front hub and behind it, the seat stay was centred on the rear hub so it ran out through the far side of the wheel, and there were no chain stays. Rebuilt as named joints (`BB`, `SC`, `HB`, `HT`, hubs) with every member drawn *between two points*, so a shared end is shared by construction. Same rule for anything with more than three connected members — **and for anything with two**: both of the gymnasium's canopies had their stays written as a 1.2 m box at a centre and an angle, which put one end at the canopy and the other in mid-air a metre clear of the wall it was bracing. `school.js`'s `strut(g, mat, x, a, b)` takes the two joints and derives the length and the rake, which cannot do that. |
| The no-people rule was being broken by the train | `addGlass` in `train.js` drew "painted silhouettes of standing passengers" in every window — a plane for the body, a `CircleGeometry` for the head. It survived because it was small, distant and described as glass detail. What gave it away was the head z-fighting the glass at 6 mm and flickering as the train moved. If you find yourself putting a figure anywhere for scale or life, that is the rule, not an exception to it: use the interior instead (rail, seat backs, ceiling strip). |
| A raked assembly needs its tilt derived, not guessed | The overbridge stringers, soffit and bicycle channel used `-slope·dir` for a flight running along z and `+slope·dir` for one along x. Both are inverted: a box along Z rotated by t about X sends its +z end *down*, a box along X rotated by t about Z sends its +x end *up*. The handrails, computed a few lines away, had it right — so the stair's underside climbed away from the treads it was carrying. One `rake` constant now serves both. |
| **`world.heightAt(x, z, fromY)` — pass the third argument for anything that walks** | With `fromY` it only offers a platform within 0.55 m of the height you are already at, which is what lets an elevated deck be walked *under* as well as on. Omit it and you get the old max-over-everything answer, which teleports anybody who steps beneath the overbridge straight onto it — the reason the undercroft used to be walled off with colliders. Builders seating props on the ground should keep omitting it. Two walkable levels still cannot share a footprint *at the same height*, so a switchback whose flights stack in plan is still out; both bridge towers are quarter turns. |
| A flood fill with one `seen` bit per cell cannot verify a staircase | It claims the step cells at ground height from the side before the climb reaches them, then refuses to revisit, so the top of any flight reports unreachable even when it is fine. Either key the visited set on (cell, height) or verify a climb with a linear trace along it, carrying the feet height forward the way the player does. The station platform "failed" for two rounds because of this and was climbable the whole time. |
| A sign plate must be thicker than the post it is bolted to | `makeSignPost`'s plate was 0.04 thick sitting 0.03 forward of a 0.09 post, so the post came through the printed face and took characters out of every two-sided plate in the world. Two-sided plates are now 0.12 and centred on the post; single-sided ones sit in front of it, which is how one is actually clamped on. |
| A prop under 0.3 m will read as a dot, not as itself | The crows on the wires were a 0.15 m sphere with a 0.045 m head, seen from eight to twenty metres: three black circles hanging over the train, and the first thing anybody asked about. Small dark props need the one or two features that carry their silhouette at distance — for a perched crow, the wedge tail held up off the wire and the beak clear of a flat head — or they should not be there. |
| Steps without `ctx.platform` are scenery, not stairs | The station platform's six concrete steps were pure geometry for as long as the station existed, so `heightAt` never saw them and the deck could not be walked onto from any side. Nothing throws, nothing looks wrong, and you only notice when something else — an overbridge landing behind it — depends on getting up there. `steps()` in `ground.js` registers them for you; hand-rolled treads do not. |
| A pale translucent sheet against a pale sky is invisible | The overbridge canopy started at `0xdfeaf2` / 0.42 opacity and simply was not there in any frame, because every view of it is from below against the brightest part of the picture. Tint glazing cool and push the opacity past ~0.55 so it reads *as* glazing. |
| A deck 7 m up is inside the blossom, not above it | The overbridge sight line west was closed by one cherry standing five metres off the deck end: at that height you are in the canopy layer, so a single tree screens the whole distance. Same rule as the school gate axis — the row has to skip the axis you want to see along. |
| Walk the routes, do not assume them | Four of the six districts were unreachable on the first pass — a closed gate, a shed on the footpath, a retaining wall across a link, two vending machines across a lane, bridge railings across both banks, and a row of tree trunks down the middle of a 3.4 m path. None of it throws, and none of it shows in a screenshot. Flood-fill the walkable area instead: BFS on a 0.35 m grid from the spawn, testing `world.colliders` with the player's own `RADIUS = 0.34` / `STEP = 0.38` and `world.heightAt` for the feet. Hand-picked waypoints test what you already believe; a flood fill does not. |
| Something standing *on* a 2 m path is a hole in the picture, not clutter | The link out to the canal had a warning plate a quarter of a metre inside it, so walking west the whole view through the gap was the blank back of a sign at eye height. Props belong on the verge. Anything at eye height in a narrow passage has to be checked from *both* directions. |
| A wall must end in a pier | The railway masking runs stopped dead at `x = ±30`, and at this tonal range 2.2 m of concrete terminating in nothing reads as a grey card standing on the paving. Same for any long `wallRun` whose end lands in frame. |
| **`heightAt` cannot express an excavation — use `ctx.cut`** | Platforms only ever raise the ground (`heightAt` takes the max), so for the twelve years the canal existed the height query answered with the *natural* grade over its whole footprint. On the north bank the made ground is 0.34 m *below* natural, so the player walked the main service path floating over it, and stepping off the coping put them standing on air above the water rather than in it. `ctx.cut({x0,x1,z0,z1,top})` lowers the ground first, then platforms raise it — so the bank is cut to `Y0` and the 60 mm path slab laid on it puts them back on the slab. Gap the cut wherever a road crosses, or the bridge deck gets cut too. | **The same applies to a flight of steps cut into a bank**: the treads on 学校前通り's towpath flight are at 0.81 and 0.97 against a natural grade of 1.02, so every one below the top was buried and you walked over the flight on flat ground. Cut the pocket first, then let the treads raise it back.
| **A collider whose top is within a step of the feet does nothing** | `_resolve` skips it, by design, so the player can walk up stairs. The canal's channel-edge barrier stood at `Y0 + 0.3` above a path at `Y0 + 0.06`: a 0.24 m difference against a 0.38 m step, i.e. skipped outright. What had actually been keeping anybody out of the water for all that time was the *railing*. If a collider is meant to be a barrier it has to clear the feet by more than `STEP` — 0.95 m is the number now — and if it is meant to be a kerb you can step over, fine, but do not also believe it is a fence. |
| **Anything standing in a lane blocks the lane, and the collider is bigger than the object** | Three separate times in one round: a 1.4 m notice board across the mouth of a 2.1 m alley, two garden walls inside a 3.2 m residential lane, and a pre-existing grove tree (which collides with a 1.42 m box at scale 1.75) squarely across a new 3.4 m carriageway. The player's own `RADIUS = 0.34` is added to *every* side of a collider, so a 1.4 m board occupies 2.08 m of a 2.1 m alley. Boards belong bolted flat to a wall, buildings on a narrow lane need 1.5 m of setback for their boundary, and **the flood fill is the only thing that finds any of it** — all three looked perfectly fine in a screenshot. |
| A plate behind its own reveal is invisible | `library.js`'s window helper put a 0.14 m reveal box centred on the wall face and the painted interior 5 mm behind it, so the plate was *inside* the reveal and every window on the building came out as a flat grey panel with a cross on it. Order matters: reveal set into the wall, interior on the face of it, glass in front of that, mullions in front of that. |
| **A `PlaneGeometry` faces +z and `flat()` is single-sided** | So every painted interior, curtain, notice and poster on a frontage that looks *down* −z has to be turned to face out, or it is back-face culled and simply absent. `rotation.y = atan2(nx, nz)` for an outward normal `(nx, nz)`. The library lost all of its glimpsed interiors to this at the same time as it lost them to the reveal, which is how one symptom hid two bugs. Note `shops.js` gets away without it only because every shop is authored facing +z. |
| A slot on one face and the lettering on the other is a box with no front | The library's book-drop had its posting slot on −z and its name plate on +z, which is a prop you cannot tell the front of. Whatever face a prop is *used* from carries the slot, the plate, the keypad and the handle — all of them. |
| A prop's pavement clutter faces the way the shop does | Restated because it bit again on the north block: props outside a frontage are placed in world space but built facing +z, so a unit whose frontage looks −x needs `ry = -π/2` on everything stood outside it — and everything in a forecourt approached from −z needs `ry ≈ π`. The library's guide board, notice board, recycling box and book-drop were all initially addressing the building instead of the street. |
| **A bicycle is 1.73 m long and it is parked *along* the wall** | It is 0.55 m wide, so placing one by its clearance to the wall — the number you would use for a bin — buries 0.86 m of it in the render. Thirty-seven of the eighty-seven bicycles in the world were doing exactly that, and none of it shows in a frame because the buried half is behind the wall it is buried in. The rule has two halves: a bike *propped* against a wall is parallel to it and stands off by half a handlebar (~0.35 m); a bike in a *rack* is nose-in, so what has to clear the render is half a wheelbase (~0.95 m), not half a handlebar. `makeBikeRack`'s row runs perpendicular to the bikes, so a four-bike row is 2 m of frontage and its ends need checking against the building too — three separate racks had their end bikes inside one. Check bike-against-bike as well: two under the same shelter at ry ≈ 0 were 0.8 m apart down their own length, i.e. inside each other. |
| **`makeAircon`'s grille is on +z, so `ry` is the wall's outward normal** | `atan2(nx, nz)`, the same expression the name plates use. Half the outdoor units in the world were a half turn out — fan pointing into the render they were bolted to — because the housing sweep used `frontIsX ? PI/2 : 0`, which is right only for the houses facing +x and +z. And **the back face has to touch the wall**: they were at 0.2–1.3 m off it, one of them with nothing behind it at all, and a `feet: false` unit at that distance is a box hanging in the air with its own shadow on the wall. `makeAircon` draws bracket arms for wall units now, spanning `standoff` (default 90 mm) — so the caller's job is to put the origin at `wall ± (d/2 + standoff)` along the normal. Verify by firing a ray out of the back of every unit; do **not** verify by starting the ray behind the wall and coming forward, because inside a building it hits an interior face and reports a metre of clearance that is not there. |
| **`groundY(z)` is not the surface — `ctx.groundAt(x, z)` is** | `groundY` is the street profile. By the time a district runs, plenty is sitting on top of it: a 0.135 m footway, a 0.09 m lane, a forecourt slab, and the canal's north bank *cut* 0.34 m below the natural grade. A prop seated from `groundY` alone is buried or floating by exactly that much — which is how a bicycle outside a house came to be sunk to its axles in the pavement, another one a third of a metre in the air over the canal bank, and a whole apartment forecourt (rack, bins, post box, umbrella stand, planter) 0.24 m under the lane it stands on. `ctx.groundAt` gives the same answer `world.heightAt` does with no `fromY`. It is only meaningful once whatever laid that surface has run, which is why the housing sweep is last but one. |
| **…and the reference plane is not the rendered ground either — check the mesh, not the query** | The companion to the row above, and it went unnoticed far longer. `ctx.groundAt` answers with `groundY + reliefAt`, but the terrain mesh in `street.js` was drawn at `groundY − 0.075`, so **everything standing on bare ground floated 78 mm** — bicycles, poles, bins, crates, planters, pads, the background houses. Props on the road looked right because the asphalt is drawn 12 mm *above* the plane instead. Nothing is authored against the terrain surface, so the 75 mm was never a convention, just an unexamined clearance; two other modules had grown numbers to match it (`canal.js`'s bridge `GRADE`, the planet sphere's −0.14) and both now derive from `TERRAIN_DROP`, which is 15 mm. The way to find this class of bug is to fire a radial ray down onto the terrain mesh and compare the hit with `groundAt` — the query agreeing with itself proves nothing. Measured over 2409 samples of the district: mean 19.3 mm, worst 25.0 mm, all of it `TERRAIN_DROP` plus the grid's own bake sag. |
| A grid that chords a curve bulges *above* it | Half the terrain budget, and the reason 15 mm is enough: the grid samples `groundY` at its rows and interpolates straight lines between them, and a chord across the convex half of a smoothstep runs `f''h²/8` above the curve — 9 mm at 2 m rows on the climb past the crossing. Dropping each row by its own chord excess (measured at the midpoints either side) is four lines and puts the *interpolated* surface under the plane rather than only the vertices. Rows at 2.0 m rather than 2.5 m are also **cheaper**: the 2.5 m cell diagonal is 3.54 m, over the bake's 3.0 m limit, so `subdivideLongEdges` bisected every triangle in the grid and 32k arrived as 65k. |
| **A translucent card is not a net** | Same trap as the mesh fence, and it had been sitting next to every refuse point in the world: `makeBins` drew its crow net as a 1.6 × 0.7 plane at 0.3 opacity, tilted, standing *in front of* the bins rather than over them. With no geometry behind it to explain the shape it reads as an unidentified green rectangle beside them — which is exactly how it got reported. It is a shallow open box over the three lids now, mapped with `chainLinkTex` so the gaps are genuinely holes. |
| **Two colliders 0.7 m apart leave nothing between them** | Every collider is inflated by the player's `RADIUS = 0.34` on **each** side, so two of them facing each other need 0.68 m of clear ground before a single cell between them is walkable. こばと橋's parapet ended at z = −20.6 and the house behind it started at −19.9: 0.08 m of clear ground, and both flights of steps off the bridge onto the canal bank had been sealed since the day they went in — on both sides of the road. Nothing throws, the steps render perfectly, and a screenshot from the road shows a usable flight. Only the flood fill finds it, and only if you probe the *top* of the flight rather than the bottom. |
| A gap between two wall panels is read as a way through | The retaining wall west of the road was three 3.2 m panels, and the 0.2 m joints between them landed in the middle of the 2 m passage between two houses — the only route from that back land onto the street. From the alley it looks like an opening; it is a fifth of what a body needs. Either close the run properly or leave a real gap, and end each run in a pier so the opening reads as deliberate rather than as concrete stopping in mid-air. |
| **You cannot carve a recess into a box** | Every building volume here is a solid `BoxGeometry`, so a panel written *behind* the wall face to look recessed is simply inside the render. Every 格子 screen on the onsen street went in at `front − 0.04` and not one of them was drawn — five frontages of blank plaster, and it does not throw. Build depth *outward* instead: backing board at +0.04, battens at +0.12, sill and posts at +0.08 so they are deeper than both and frame it. Where a caller genuinely needs a room behind the opening (the bathhouse's lockers, scale and bench), the volume itself has to be cut back — `makeOnsenUnit`'s `hollow` — with returns either side of the opening and a header over it, or the lattice stands in front of nothing. |
| Two coplanar sheets are a coin toss, not a layer | 蓬莱湯's 男湯/女湯 noren went at the frontage line +0.06 and the unit's own doorway board's face lands at exactly +0.06: the bathhouse entrance came out as a flat black rectangle with no cloth in it, and it *had* rendered correctly from a slightly different camera an hour earlier, which is the tell. Anything hung over a doorway wants a clear 0.1 m, and the way to find it is to fire a ray at the wall and read the hit list — coincident faces show up as two hits at the same z. |
| `doorAt` and every other in-unit offset is in the *unit's* frame | The generator authors facing +Z and the group is rotated by `face`, so on a `z-` frontage a positive offset moves west on the street. 湯乃屋's door was specified 1.4 m east of centre and its porch built 1.4 m east in world space, which put the canopy, the steps, the mat, the geta rack and both lamps beside the doorway — with one lamp hanging in it. |
| A canopy hung off the eaves is not a lantern *across* the street | Restated as a difference rather than a bug: さくら坂 strings its lanterns on wires over the middle of the road, which is right for a 6 m shopping street and wrong for a 4.8 m stone one — over that width a wire run closes the sky and the street stops reading as a slot you can see the end of. 湯の坂 brackets them off the eaves instead, and keeps the middle of the picture clear for the 常夜灯 at the head of the run. |
| **`isSidewalk` was not bounded in z** | It is a *lateral* test, so `streetHeight` answered `groundY + 0.135` for the two 1.55 m footway bands at **every** z in the world — including the open fields north of `Z_MAX = 52` and south of `Z_MIN = -66`, where there is no road. Two invisible kerb-height ledges running to the horizon: the player steps up onto one, and every prop seated with `ctx.groundAt` inside the band floats by exactly a kerb. It never showed because until the six residential blocks nothing was ever built out there. Measured at (-7.4, 75): 0.585 against a ground of 0.450. Now bounded; anything legitimately continuing a footway past the ends lays a real `pad`, which registers a platform. |
| **A list of what the land is spoken for is worth nothing if it is not complete** | 四丁目's header enumerated the library, its forecourt, the corner cluster, ひばり台コーポ and the coin parking, and left out 米・酒 なかの (x 1.95..7.05, z 49.15..54.65). So its lane was laid through the shop for six metres, its lamp pole stood in the shop floor, its boundary hedge went in the 0.65 m slot between the shop and the road, and the whole block's only connection to the world was a 0.49 m pinch between a grove tree and a hedge. Every frame of it looked right. **Enumerate by querying `world.colliders` over the envelope, not by remembering.** |
| **`plotWall`'s gate posts carry no collider** | So a gate's usable opening is exactly `w` minus twice the player's 0.34 m radius. At the 1.1–1.2 m that reads well on the page that is 0.42–0.52 m: a gate you can see through and not walk through. Three of them went in that way in one round (an allotment, a 木造平屋's yard, a front garden). **1.8 m is the working minimum**, and the flood fill is the only thing that finds it. |
| **Read the generator for anything that sticks out of its own footprint** | `makeWalkup` builds its open stair at local x `-w/2-1.6 .. -w/2` and local z `d/2-1.55 .. d/2+0.3` — *outside* the mass, so outside `plotCollide`'s box, and on a `face: 'x-'` block that is 1.8 m off the **south** end where nobody expects it. Guessed at, it put a 5 m collider across a forecourt in one block and dropped a real staircase into another block's 私道. Same for `makeNagaya`'s 0.92 m eave and `makeWalkup`'s balconies. Derive the extent from the generator's own numbers and write them in the comment. |
| **A pole is a 0.4 m box, and the radius is added to every side of it** | 1.08 m of clear ground gone. One placed on 二丁目's west verge at (46.55, 31.4) sealed 公園前's east link — a 1.4 m squeeze in a *different district*, built by a different module, that had been fine for two rounds. Nothing throws, both districts render perfectly, and only a flood fill over the whole world finds it. **Re-run the fill with every block's waypoints after adding furniture, not just the block you are working on.** |
| Anything on the axis of a deliberate opening defeats the opening | 桜守裏町's footpath comes down through a 1.8 m gap in the road head's hedge, and the gap exists to show the 長屋 through it. A utility pole 0.2 m off that centre line, and then a grove tree 0.4 m off it, each filled the whole opening. If a gap is cut for a view, nothing goes within about a metre of its axis for the first ten. |
| A prop's stand-off must be taken along the prop's *own* normal | `laneSign` offset its plate `o.z + 0.03` in world z and then rotated the plate about its own centre, so it only cleared the post at `ry ≈ 0`; at a quarter turn the 0.045 m post came through the printed face. Fixed by rotating the offset with the plate — the same shape of bug as `makeAircon`'s `ry` and `makeSignPost`'s plate thickness. |
| **A pane laid along a raked panel's centreline is inside it** | Every windscreen and backlight in `vehicles.js` is a thin glass panel over a thicker body wedge, and written the obvious way — same two end points, smaller thickness — the glass is *entirely within* the wedge. Every car in the world came out with a body-coloured windscreen, and the only tell is that the screen is the same value as the bonnet. The glass has to be offset along the wedge's **outward normal**, and which of the two normals is outward has to be *derived* (take the one pointing away from the cabin centre), not assumed — the front screen's points forward and up, the rear one's backward and up. Exactly the same failure as the onsen street's 格子 panels and the library's window plates: **depth is built outward**. |
| **A parked vehicle takes 5.1 × 2.4 m out of the ground, not 4.4 × 1.7** | The player's `RADIUS = 0.34` is added to every side, so a car is 0.7 m bigger than it looks in both axes. A 3.4 m lane with a car in the middle leaves 0.28 m and is a wall; the same car parked hard against one edge leaves 1.08 m and is fine. Both look identical in a rendered frame. `traffic.js` now parks nothing at all on a lane under 3.6 m, and `parkVehicle` derives the rotated AABB once so it cannot be eyeballed eighteen times. |
| **Probing a new prop against `world.colliders` does not see the other new props** | Every vehicle position was tested against the collider list before it was written down, and every one passed — because none of the *other* vehicles in the same sweep exists as a collider until the sweep runs. Two hatchbacks 1.6 m apart with 4.05 m of body each were driven straight through one another for a whole round, and from every angle one of them hides the join. Any pass that places many of one thing needs a **pairwise check over its own list**; `buildTraffic` runs one in dev on every load. |
| **Two cars at opposite kerbs make a road look impassable** | Not a collision bug — a composition one, and the first thing a viewer says. A 6.3 m carriageway with a 1.7 m car at each kerb is 2.9 m between them, and the eye reads that as a slot. Nothing in `traffic.js` overlaps in the along-street axis with anything on the far kerb of the same street. The same instinct is why only eight of the eighteen are on a carriageway at all: **kerbside vehicles are the expensive ones**, visually — one in a frame is life, two is congestion. |
| Two cars centred in adjacent bays leave nothing between them | 町内会館's two bays are at 2.1 m centres; two 1.475 m keis centred in them are 0.62 m apart, which after two radii is zero. Parked to the *outside* of their own lines instead — 18.85 and 21.55 — the walk-through is 1.22 m and both are still inside their markings. Same arithmetic as こばと橋's parapet, one tenth the scale. |
| **A waypoint inside a bay stops being reachable when you park in the bay** | Two district `FLOODFILL` lists named the middle of a 送迎 bay and the middle of a carport, and both went unreachable the moment a vehicle stood in them. That is correct behaviour, not a blockage — the fix is to move the probe to the ground you can actually stand on and say so in the header, which `tsugakuro.js` and `yonchome.js` now do. The way to tell the difference is to re-run the fill with the new colliders spliced out: if the baseline reads the same, it was never a route. |
| A body colour dark enough to read as "dark green" reads as black in shade | The sun is at `(-52, 62, 56)`, so a parked car's tail is always the face turned away from it, and the cel ramp's bottom band on a true bottle green takes it to within a few per cent of the ink colour — glazing, seams and shut lines all stop existing. Same note as the grove canopies at `#3f6b52`. `CAR.forest` and `CAR.navy` are lifted for exactly this, and the one car that stands in *permanent* shade — the bay under the overbridge — is white. |
| A saturated lamp is the one part of a vehicle that has to be small | The first tail lamps were 0.26 × 0.20 in flat red and were the loudest thing in any frame with a car park in it. 0.21 × 0.155, deeper, and split by the housing bar every real cluster has. Same class as the first reeds and the first crows: a prop read at the wrong scale. |
| **A 0.11 m post cannot carry a collider on a 1.55 m footway** | Any collider is inflated by 0.34 m on each side, so a box round the bus-stop pole leaves 0.44 m of pavement — a wall. `street.js`'s utility poles do exactly that and the footway *is* sealed at each of them. Slim frangible street furniture — delineator wands, stop poles — goes in without one, the way `makeCone` already does. |
| **A curved paved area is one polygon, not a rectangle plus a disc** | 六丁目's street and its turning circle are the same surface. Overlapping two slabs at one height z-fights across the most important fifteen metres in the district; butting them leaves two crescent slivers of grass at the throat, because a circle's edge curves away from a straight one. A `THREE.Shape` — rectangle, `absarc` the long way round, back along the far edge — extruded and `rotateX(-PI/2)`'d is one seamless surface. Shape space is `(x, -z)`: the rotation maps `(sx, sy, sz) -> (sx, sz, -sy)`, so the extrusion becomes height and the shape's y is **negated** z, which is also why the arc is swept *clockwise*. |
| **A kerb is invisible to every check this project has** | It carries no collider anywhere here, so the flood fill walks over it and a rendered frame from the road does not show it edge-on. 六丁目's north kerb ran straight from the lane mouth to the throat, i.e. 0.105 m of concrete across the entrance of a car park with two cars in it, and nothing found it. **Split a kerb wherever something drives over it** — every side road, every car park, every apron — and drop it (40 mm rather than 105) across the ones a vehicle crosses. |
| **A collider round an open-fronted structure seals it** | A box round the bus shelter is a bus shelter you cannot stand in: the flood fill read the waiting island 1.05 m unreachable and the shelter looked perfect in every frame. Only the **back panel** carries a collider; the two 0.06 m cheeks and the four 0.09 m posts go without one, the same call already made for the stop pole and the delineators. |
| **On a curve, the collider and the geometry have to be derived from the same angles** | 六丁目's guardrail was drawn as five arc-following sections and collided as one AABB along the chord. The two did not agree: the top section fenced the terrace off from its own street *visually* while the fill walked straight through it, so the mistake was invisible to both tools at once. One collider per section, each the AABB of its own rotated box. |
| **`bayPaint` and `makeWheelStops` both nose in from local +z** | So a bay entered from the *low* z end needs `ry: PI` on **both**, or the head line lands across the mouth of the bay and the numbered stake turns to face the wall behind it. Neither shows in a frame taken from the road. |
| **A swept barrier needs a swept collider** | こばと橋's deck upstands are drawn with `topAt: GRADE(z) + 0.6`, following a road that climbs 0.53 m across the crossing — and collided with **one flat box** topped at the height they reach in the middle of the bridge. At the south end that top stood 0.276 m over the footway, inside the 0.38 m step, so `_resolve` skipped it and the upstand was not a barrier there at all. It was invisible for as long as the parapet stood in front of it, and it surfaced the moment the parapet came out. Anything whose *geometry* follows a grade needs one collider per segment, each taking the profile at its own **low** end. |
| **`dressPlot` places the aircon without asking the slot allocator** | Every other prop it puts out goes through `take()`, which walks outward from a preferred offset and never reuses a slot. The outdoor unit does not: it goes at `±(halfW - 0.75)` and only *then* pushes its slot into `used`. So it can land on the door, in the gate opening, or — on 川端の道's 二階半 — squarely in the front step, buried to its middle in the concrete. If a plot's frontage is not clear at that offset, pass `airconAt` explicitly, and `airconUp` to put it on the wall where it probably belongs anyway. |
| **Two placement constraints can cross, and then there is no position at all** | The planters on the house at (-8.2, -16.4) had to be east of a retaining wall's face (x > -4.11 for the foliage) and west of `dressHousing`'s carriageway cull (x < -4.23). Nothing satisfies both, so nudging `planterOut` either buried them or deleted them and both looked like the fix had failed. The band opens further along the frontage, because the road drifts: the answer was `planterAlong`, not a bigger `planterOut`. **When an offset in one axis cannot be made to work, check whether the constraint is a function of the other axis before assuming the prop has to go.** |
| A car 0.06 m off a kerb takes the whole of a narrow shop frontage | お弁当 のはら's doorstep strip is 0.74 m, and the delivery van first parked opposite it left 0.44 m of that — open, but the whole frontage was behind a van. A flood-fill **scan line across the frontage** is what shows it; the waypoint reads "reached" either way. |
| **A change to a material that changes nothing means the mesh is not being drawn** | スーパー さかえ's roof deck read as pale render rather than as a car park, and every white line on it vanished in sunlight. The slab went `concrete` → `concreteMid` → `asphaltWorn`, a fifth darker and then a third darker, and the rendered frame was *pixel-identical* every time. That is the whole diagnosis: the store's mass was built to `DECK` and the deck slab laid at `DECK`, so their top faces were **coplanar** — a coin toss the render was winning. The mass stops 0.10 m short now and the slab closes the top of the building. Same family as the onsen street's coplanar noren; the tell is different and worth knowing — a material edit with *no* visual effect is never a subtle material problem. |
| **A collider has no underside unless you give it one** | `ctx.collide` took five arguments for the whole life of the project and `_resolve` has always honoured a sixth, `bottom` — nothing set it, so every barrier blocked at every height. A roof parapet is the case that needs it: topped at the deck it stops a walker up there, and *from the ground* it was a 21.6 m wall standing 0.34 m in front of the shop doors, which sealed the entrance recess, its tiled floor, its platform, the mat and the doorway. Pass `bottom` for anything whose job is only at height; leave it undefined and the behaviour is exactly what it always was. |
| **An entrance recess needs its own colliders, not the building's** | Restated from the library, because the supermarket made the same mistake in a form that was harder to see: one box over the whole footprint. The recess was tiled, its platform registered, its mat and basket stacks placed — and none of it reachable, with nothing anywhere reporting a problem. Three boxes (rear, west block, east block) leave the recess open. If a builder registers a platform nobody can stand on, that is the symptom. |
| **A `CylinderGeometry`'s axis is +y — a rail along z needs `rx = PI/2`** | The trolley bay's two guide rails were written `trs(x, 0.92, z, 0, 0, 0)`, so instead of capping the 4.4 m upstands they *were* 4.4 m columns standing on them: 0.74 m into the ground and 1.36 m out through the lean-to's roof. Two poles through a canopy, in a corner of the apron nobody had rendered yet. Anything drawn as a cylinder along the ground needs its rotation derived the way `railing()` and the bicycle members do. |
| **A prop written relative to a face you have not measured lands anywhere** | Three in one district, all from arithmetic done in the head: the two roof condensers at `sz - 2.46 + dz - 0.2` (one 1.11 m out in the aisle with nothing behind it, one entirely inside the plant hut), the basket stacks at `REC_X1 + 0.9` (0.9 m *east* of the recess is the middle of the solid block, not the reveal), and a 1.1 × 3.6 m flower bed at `SX1 - 0.9` (inside the building, because `SX1` is also where the ramp starts and there is no strip between them). None threw, none showed. The cheap detector: build the module against a stub `ctx`, then test every added group's origin against the AABBs of the district's own solid masses. |
| **A height field cannot have a hole in it** | Take faces out of one and you get a canyon from the crest to the floor, open to the sky — not a tunnel — and you cannot make one vertical either, so there is no way to express a portal face in it. The mountain the railway goes through is therefore *authored*: `hills.js` cuts a 36 × 39 m rectangle out of itself (`NOTCH`, every edge on a lattice line) and `tunnel.js` fills it with a swept cap, two portals, a bore liner and the cuttings. The cap samples `fieldAt` along all four notch edges, which the boundary test leaves intact, so the two surfaces meet exactly. Get that wrong and it does not throw: it leaves a hairline of sky along a ridge, forty metres long. |
| **A cap over a hole must *continue* the terrain, not stand on it** | The first tunnel cap blended from its crest line out to `hillAt` at the notch's two z edges, which meant that at the *portal planes* it was still 9.6 m up across the whole 39 m width while the hillside three metres outside was 2.3 m. What had to be closed at each end was a lens 39 m wide and 11 m tall, and 39 m of concrete 11 m tall is not a portal, it is a dam — which is exactly what it rendered as. A bilinear **Coons patch** from the four boundary curves interpolates all of them exactly, so along both portal planes the cap *is* the hillside's own edge and the lens collapses to the knoll's excess over the terrain: 22 m wide, and zero wherever the mountain is not actually standing above the ground beside it. |
| **A 坑門 is a wall with a horizontal top and a slope above it** | Running the portal's concrete all the way up to the cap's edge — which is a bell — produced a 13 m grey tent, a shape no portal has ever had. Two extrusions from the same two profiles, split at the coping line: concrete below, the hillside's own green above, with the 笠石 between them. And size the coping to where the wall actually *reaches* that line, sampled at 0.4 m: quantised to the face's own 2 m spacing it overhung by up to two metres and read as a diving board. |
| **A smooth analytic surface under a cel material has no shading on it** | A sum of wide ellipses under a slope limiter is very nearly coplanar over tens of metres, and a cel ramp quantises direct light per facet — so the first massif rendered as one flat area of green with a hard straight edge where the tone changed, with no shape at all. The fix is geometry, not tone. **And it cannot be a sine**: two octaves of `sin(ax+bz)·cos(cz−dx)` gave every ridge the same bearing and the ink pass drew three perfectly straight lines down the hillside. 170 scattered small bumps, a third of them hollows, applied after the limiter. |
| **A facet's tone must key off the facet's own gradient** | Not off the biggest drop across its three edges: on a uniform ramp the diagonal edge falls twice as far as either side, so the test reported 1.04 for a 0.52 slope and painted the whole toe of the massif as bare earth — a hundred square metres of tan on a green hillside. `hypot(dh/dx, dh/dz)`, taken from the triangle's own plane. |
| **Split a heightfield's cells on alternating diagonals** | Splitting them all the same way gives the whole hillside a diagonal grain: long parallel creases marching across the slope, which the depth-difference ink pass then draws as a set of straight lines. It is the most artificial thing a heightfield can do and it costs one bit to fix — but the query has to use the same rule as the mesh, or they stop being the same surface. |
| **A viewpoint needs a corridor kept clear, not a cone** | A sector from a point is arbitrarily narrow at its apex, so a 32° fan out of the 展望台 left a 4 m gap five metres in front of it, which is where a cedar went — and a cedar five metres from a viewing platform is the whole view. The keep-out is a half-width that starts at 9 m and opens with distance. Same family as the overbridge's sight line and the school gate's axis, and it bit again in the same round. |
| **`+z` is the direction the deck *looks*, so anything at `+dz` is in the picture** | The 展望台's stair, its rail gap, its 眺望案内 panel and four of its five trees all went in on the `+z` side, i.e. across the view north to the school. The flood fill found the stair (three blocked cells) before a render found the trees. The panel also needs its map on the board's **−z** face: tilted +0.42 about X, a `+z` face looks up and *north*, which is legible only from outside the deck over the drop. |
| **Key a flood fill's visited set on (cell, height bucket) — a tolerance is not enough** | A one-bit-per-cell fill cannot verify a staircase, which is already in this table; a fill that revisits whenever the height differs by more than a tolerance **ping-pongs forever on a slope**. Measured on the first run over the hills: 53.6 million visits for 770 k cells, and it never finished. `seen.add(cell * 64 + round(y / 0.3))` converges in 12 M. |
| **The fill is too big for one tool call now** | 340 × 330 m at 0.35 m is 900 k cells and about 40 seconds of JavaScript, which is past every timeout in the toolchain — and a synchronous run that overruns leaves the page wedged so hard that even `location.reload()` times out and the dev server has to be restarted. Run it in `setTimeout` chunks of ~200 k visits, stash the state on `window.__fill`, and poll it. |
| **Widen the flood fill's bounds when the town grows** | The documented window was x −95…85, z −85…95 and 七丁目 reaches z ≈ 105, so the first fill of the round reported the coin park, both houses on the spur and every grove tree behind them unreachable — a clean, confident, entirely false result, because the BFS grid simply stopped at z = 95. Print the bounds with the number, and check them against the new district's envelope before believing a single probe. |
| **A cross-section written from the arch's *radius* instead of its springing is silent** | `boreProfile` read `T.spring - T.half + sin(a)·T.arch`, so the arch's centre landed at −0.1 rather than at the springing line: the crown was at **3.20 m**, the side walls had a height of minus ten centimetres, and the train's roof, its pantograph and both catenary wires ran through solid rock — the messenger wire by 2.78 m. It survived the entire life of the first bore because a tunnel with a train in it is a dark hole with a dark shape moving in it, and because everything hung off `CROWN` was computed from the *constants* (6.5) and therefore floated 2.75 m above the ceiling, inside the mountain, where nothing can be seen. `buildPortal`'s arch hole had the identical expression. **Check a section numerically against the thing that has to fit through it** — `boreClearance()` in `tunnel.js` is that check, and it is the only one that would ever have found this. |
| **A `TUNNEL`-shaped constant becomes four scattered longitude tests** | `hills.js` exported one object and `railway.js` read `TUNNEL.x0`/`x1` in three places — the lineside fence runs, the masking walls and the catenary mast skip — plus `nearBore` here. Adding a second bore that way means finding all four by hand, and **the mast one is silent**: a 6.6 m mast standing inside a lining cannot be seen from anywhere outside the mountain. `TUNNELS` is an array and every consumer takes the union; the fence runs go through a `trimRun` that subtracts every bore *and* every gate opening. |
| **`plantRange` will not touch any face steeper than 0.9, and every engineered face is steeper than that** | Cutting banks, a tunnel cap's flanks and the ridge in a col are all 1.3–1.9 by construction — that is what `slopeLimitAt` allows inside the ring corridors, on purpose. So every one of them renders as a large unbroken area of the bare-earth tone: measured off three frames, 45 % of the overlook's, 60 % of the gate's and a third of the railside spot's. It is not a tone problem, it is a *nothing on it* problem. `tunnel.js`'s `dressFaces` scatters scrub, boulders and tussocks over exactly the ground the range's own planting rejects. |
| **`hillMeshY` answers with the flat grade inside a notch** | Which is correct — the field is cut out there — and it means the rock and tuft builders seat anything meant for a tunnel's cap fifteen metres *under* it, invisible. Both take an optional `yAt` now; the cap passes its own surface. Same class as `groundY(z)` not being the ground. |
| **A viewing platform's railings decide which side it can be entered from, and the answer is not the same twice** | 東山's overlook came back unreachable from the flood fill with the ground one cell outside it fully walkable: its two side rails and its back rail enclosed it, and the only open side faced a 1.5 slope the fill will not climb. A railing 0.09 m thick takes 0.86 m of ground once the player's radius is on both sides, which is the entire width of a ridge top. **Work out where the ground actually lets you walk up first, and leave that side open** — for a bank that is the back, for a ridge it is along the crest. Nothing about a rendered frame distinguishes the two. |
| **The overlook's rail must be on the side it looks at** | Written `V.z - look·1.25` it lands across the arrival side and leaves the deck standing open over the drop. It renders identically either way: a railed platform with a rail on it. |
| **A masking wall 1.6 m behind a new viewpoint is the viewpoint** | `railway.js`'s east masking runs reached x = 92, and 東山's gate (85) and railside spot (91) both went in behind them. From the spot the wall filled the frame and read as a blank tan hillside — three separate renders were mis-diagnosed as a bare cutting bank before a ray hit `parent: 'railway'` at 1.96 m. The only route to the gate was a one-metre gap between the wall's end and the cutting's kerb, which the flood fill found and no human would. **When something new goes on the lineside, check what `railway.js` already has at that longitude.** |
| **A pale surface filling half a frame is worth one raycast, not three guesses** | Every instance above was diagnosed in one call by rendering, `camera.updateMatrixWorld(true)`, and firing a ray at the middle of it — which returns the mesh's name, its parent and its distance. Guessing from the shape of it was wrong three times out of three. To turn a hit back into flat coordinates, minimise `positionAt(x, 0, z).distanceTo(hit)` over a coarse-to-fine sweep — four passes at 4 / 1 / 0.25 / 0.05 m converge in milliseconds, and it is exact for anything on the ground. |
| **A hole coincident with its shape's outer contour makes `ExtrudeGeometry` fill it** | `ShapeUtils.triangulateShape` cannot separate the two, and what it emits is a handful of enormous triangles spanning the opening. Both tunnel portals' arch holes had their base on exactly the same line as the shape's bottom edge — `base = bot(0)` and `bot` was flat at that value right across the corridor — so all four faces had a wedge of concrete across the mouth. **Hold the contour clear of every hole by a real margin** (0.45 m here) rather than letting them touch. It is nearly invisible from outside and fills half the frame from inside. |
| **Depth built by tilting a panel about its own centre puts half of it behind the frame** | `makeGuideBoard` leaned its map 0.12 rad "for depth": on a 1.05 m board that swings the bottom edge 63 mm back — *inside* the two 0.09 m posts it is bolted to — and the top edge out past the hood. Every 街区案内図 in the world had its own frame growing through its map. Same family as the onsen street's 格子 panels and the vehicles' windscreens: **depth is built outward.** A tilt is for a hood, which overhangs nothing. |
| **A bench's `ry` is a function of where it stands, not a constant** | `makeBench` puts its back at local −z, so `ry: 0` faces +z — and *which* way that should be depends on which side of the space the bench is on. Written as one constant for a pair it is guaranteed wrong for one of them: the 中庭's two benches both sat you a metre from a wall looking at it, and the 展望台's two both faced away from the view the deck exists for, under a comment saying "two benches facing the view". Say which side of the centre it is on, then derive. |
| **"Outward" on a building flank is a sign, and getting it wrong buries the prop** | 学校前通り dresses the blank east flank of the house at (−5.4, −33.5) — wall face x = −1.40, street at +x. The ivy went in at −1.34, correctly; the pot shelf, the water meter, the notice board and the cat box went in at −1.44, −1.50, −1.55 and −1.60, and every one of them was inside the render, along with the collider meant to keep people off the board. The tell from the street is three terracotta pots with no backs. **Work out which side the street is on before placing the first one**, and check the last one against the same number. |
| **A T junction paved to the two centre lines leaves a quadrant unpaved** | 七丁目's spur ended at the link's centre line and the link began at the spur's, so 2.5 × 1.8 m of the junction was bare grass 0.11 m below two roads, with a notched corner in the middle of the frame. A junction takes three different numbers, not one: the carriageway runs to the far kerb line of the road it meets, the footways stop at the near one, and the minor arm **butts** against the major one's kerb line — two coplanar slabs at the same height are a coin toss. |
| **A quad's winding cannot be written down once for a surface that has four orientations** | The 法枠工's cells were wound by hand with the bank side and the approach direction folded into one comparison, and the comparison was inverted — so every cell in the world faced *into* the hillside, and `cel()` is single-sided. The frame rendered, the beams rendered, and what showed between them was the `hillEarth` the cells existed to cover: a crib laid on bare tan, which is *almost* what a crib on grass looks like. A raycast on a cell returned `hillEarth` and settled it in one call. `quadTo(…, refX, refY, refZ)` takes the cross product and picks the order, which is four lines and cannot be got backwards. Same family as `makeStrip` assuming ascending z. |
| **A face treatment does not start where the caller says the face starts** | `cribColumn` began at a nominal toe — a fixed offset outside the retaining kerb on an approach, the notch's own edge on a cap flank — and broke out the moment the gradient there measured under the threshold, which on a cap flank it does by 0.02. Result: **twenty-six triangles** of crib across two flanks, which in a rendered frame is indistinguishable from the feature not existing at all. The column seeks forward up to 6 m for ground that is actually steep before it lays anything, and a column that never finds any is not a face. |
| **The mountain over a bore is not part of the hill field, so nothing that dresses the hills touches it** | Restated because it bit again from the other side. `plantRange` refuses slopes over 0.9 and `buildCap` paints anything over 1.05 bare, and a knoll has to rise eleven metres in the fifteen between the track and the notch edge — so both flanks of both caps were over the threshold for their whole length and had never been planted, toned or dressed by anything. It read as 40 % of the `higOver` frame in one flat tan, and the shape of it was not the shape of a cutting. The ray that identified it returned `tunnelCapE2`; three guesses before that were all wrong. |
| **A viewpoint stands on the crest of the face you are about to treat** | Both tunnel overlooks sit on top of a cut bank — which is the whole idea — so both are inside the footprint the crib works out for itself, and 東山's zigzag approach traverses the very face the frame goes on. `buildViewpoints` hands back its own footprint and the crib runs *after* it and reads it. The general rule: anything that covers a measured area rather than a written rectangle has to be told what is already standing in it, and the module that put it there is the only thing that knows. |
| **A whorl of conifer written as one cone on the stem is a lampshade** | Seven-sided, square to the axis, one radius: the rim reads as a disc and the tree as a stack of them. Fine at forty metres, mechanical at five — and the 林間広場 and the crest walk both put you at five. A per-tier ellipse (0.84–1.18) and two or three degrees of tilt cost nothing in the instance matrix and break every rim out of the horizontal. |
| **On a slope with one aspect, an aspect term is a constant** | `faceTone` keys off slope, height and aspect, and on the 28 m belt behind the school all three are constant: `lit` measured p10 0.42 / p50 0.73 / p90 0.89, the height term spans 0.16 over the whole belt, and **88 % of it came out in one tone with 0 % in the deep one**. Forty metres of hillside as a single sheet of pale green. No amount of roughness fixes it either — the normal turns 7.0° per facet pair at the median and a three-band cel ramp needs about 35. What was missing was a term that is *not* derived from the terrain at all: a cover field, because a hillside's vegetation is where the last fire was and what was cleared forty years ago, not a function of its shape. |
| **A scattered-blob field that is summed and clamped is a constant** | The cover field went in as a sum-and-clamp, like `MICRO` and `FINE` — which is right for those, because they are *displacements* and displacements add. 460 blobs cover the window twice over, so the sum passes ±1 nearly everywhere and the clamp flattens it: measured p25 0.35, p50 0.77, **p75 and p95 both exactly 1.00**. The belt went from 88 % one tone to 89 % the same tone. Divide by the accumulated weight instead and it is a blend of the blobs actually overlapping the point, which stays in range however many pile up. |
| **Halving the lattice on its own buys smaller flat cards** | The normal turn per facet is set by the roughness's wavelength against the cell, so halving `CELL` halves it: `FINE` measured 7.0° per pair at 3 m and would be 3.5 at 1.5. A finer lattice is only worth having with a roughness octave at the new size — `ULTRA`, r 1.4–3.4 and h 0.10–0.30, which is `1.54·h/r` = 0.13 of gradient built over one facet. And a **node jitter has no length scale of its own**, so it is the one term that must be halved with the cell or it turns into per-node fizz. |
| **A cap's stations have to be lattice nodes** | A tunnel cap samples `fieldAt` along its notch edges — exact where it samples, a chord in between — so it meets the hill mesh only where its stations land on nodes. The z spacing was `round(depth / 2.0)`, giving 1.95 m against a 3 m lattice: never on a node except by accident. Measured after halving the cell, **1.69 m of gap** along 東山's south edge, open to the sky for thirty metres. Both counts come off `CELL` now and all eight edges read 0.0000. This is why the lattice may only ever be *halved*: −15 is a multiple of 1.5 and not of 2.0. |
| **A path laid on a slope inherits the slope's cross-fall, and that is not a path** | `hillPath` sweeps a ribbon over whatever the field does. On a bank held at the ring corridors' 1.9 allowance every 0.35 m axial step is a rise of 0.63–0.78, so the flood fill can never climb it in any direction, on any route — measured on two. The walker can, because it has no slope limit, which is exactly why nobody noticed for three rounds. A mountain path on a 1-in-2 slope is a **cut bench**; benching the field to the trail's own longitudinal profile took the worst axial rise from 0.742 to 0.375. **Cut alone is not enough** — it takes the uphill shoulder off and leaves every hollow, and what stops a fill is climbing *out* of one. |
| **An axis-aligned platform cannot express a diagonal tread** | The obvious fix for a steep flight is `ctx.platform` per log, per the trap two rows up about steps being scenery. It does not work on a diagonal: a 0.2 m tread's AABB is a metre deep, five of them overlap any point, `heightAt` takes the max, and the "staircase" is the same ramp shifted half a metre up-slope. Either run the flight along an axis or grade the ground under it. |
| **A block of 11 m conifer is not a scatter, and `SITES`' keep-out radii were sized for a scatter** | `SITES.deck` holds planting 10 m off the 展望台, which was ample while the crest carried scattered broadleaf. A plantation stand reaching to within 1.5 m of the ridge walk filled the twelve metres between the crest and the deck solid, and the establishing shot of the 展望台 came back as a wall of cedar. What keeps a line of sight through a block is a **corridor** in `VIEWS`, not a bigger disc — the same conclusion the deck's own view fan reached, for the same reason. |
| **A body of water fails *globally*, and nothing renders the failure** | Every other bug in this table is local. Water is not: it finds the lowest point on a 400 m rim, and a 0.3 m notch anywhere in it drains the basin **without changing a single pixel**, because the surface is a flat mesh and simply keeps going. ひばり湖's first rim was seven new elliptical summits, and measured round the shoreline **twenty of the thirty-two stretches had ground below the water level within two metres of the shore**, worst 4.7 m. Not a leak — no lake at all. A quartic bump is at 56 % of its height half a radius out and the 2.6 m pedestal takes most of the rest, so a continuous rim out of ellipses means thirty of them and any later change to any one drains it. The rim is derived from the shoreline instead (`rimAt`), which makes no-spill *structural*: within `crest/bank` of the water the ground is exactly `LEVEL + bank·s`. And `lakeLeakCheck` — a flood fill on `field < LEVEL` from a seed in the basin — is the only test that means anything; per-point freeboard passes while a gully twenty metres out drains the lot. |
| **A fill term whose baseline is not zero cannot be multiplied by the keep-out mask** | Every summit in `hills.js` goes through `shapeAt · keepAt − PED`, so a masked hill fades to the pedestal and then to the skirt. The lake's rim and its embankment are heights *above `LEVEL`*, and `LEVEL` is 3.4 — so scaling them by the mask fades them to **zero, which is 3.4 m under the water**. The lake's north rim reaches the railway's flat trough, so masked that way it would have been a spillway at the one longitude the range crosses the line. Fade toward `-SKIRT` instead: `FLOOR + (v − FLOOR) · keep`. |
| **A railed platform is a solid object from underneath, so no path may pass under one** | The 見晴台's balustrade colliders carry `bottom = DY − 0.6`, and `bottom` only skips somebody whose feet are more than 1.9 m *below* it — so a walker on the ground 1.1 m under the deck is inside all four rails. `ROUTES.mikaharashi` ran straight over the deck's centre and the flood fill reported the viewpoint unreachable with the ground one cell away fully walkable. There is no `bottom` value that fixes it (the rail's own base is the deck). Route the path *past* the deck and put the flight and the gap in the rail on that side. |
| **Three parallel linear features and a building need twenty metres, and the walk was inside the wall** | The south shore has a shoreline, a 湖畔遊歩道 and a 湖畔道路 running parallel, and 喫茶 みなも between them with a terrace toward the water. At the first placement the road ran 2–3 m **lakeward of the footpath** — a carriageway between a promenade and the water — and the cafe's collider (9.4 × 6.6 m) sat on top of both the walk and the brick rest area 40 m along it. The walk did not stop at a wall in any frame; it just went into the building. The section only works in one order going inland — water, walk, terrace, building, car park, road — and that is 20 m, so the road swings 14 m further out than it first did. The only thing that found it was one FAIL on a waypoint in a completely different part of the district. |
| **A camera seated by `heightAt` inside a lake is under the water, and single-sided water is invisible from below** | See the note under the shot table. The frame is a large flat pale area with everything floating above it and nothing to diagnose from. |
| **A blob canopy at one size cannot be two species** | The 柳 was written as `buildGrove` with the blob bias inverted — 40 blobs at `0.5·S`, hanging instead of piled. What came out was six pale lozenges a metre across floating beside the water: at that size a blob *is* a canopy, so a curtain of them is a cloud, and in the palest green in the palette it was the loudest thing in the park. A frond has to be small enough that the eye reads the mass rather than the unit, which at four metres is about 0.3 m — and filling the same volume with 0.3 m units takes 120 of them, not 40. The limbs went from 2.1·S to 1.35·S at the same time: at the longer reach the fronds hung *inside* them and the tree read as five bare dark spokes. |
| **A cone under 0.04 m radius is a dark skewer and one over 0.05 is a spike** | The reeds, and it is the third time this project has hit it (the channel's first reeds, the crows on the wires). At 0.03 m a blade is one facet wide, so it is either edge-on or turned from the sun and nearly black; at 0.055 it is 11 cm at the base and reads as a tent peg. 0.038 with five facets, `bands: 'soft'` so the shadow band bottoms out at 70 %, and 9–16 blades in a 0.34 m radius so a clump reads as a tuft rather than as individual blades. |
| **A pale dash on water reads as road paint** | 150 sky-reflection panels of 2.2–7.0 × 0.22–0.6 m came out, from twenty metres, as a hundred short pale ticks in rows — indistinguishable from lane markings, and worse next to the glint bands. A reflection of sky is a broad soft area: 96 panels at 0.5–1.5 m across. |
| **A run of kerb units must overlap and must be at the edge of the metalling** | The embankment's crest kerbs went in at 3.05 m from the centreline — a metre outside a 4.0 m carriageway — as 1.2 m units at 1.12 m centres. Twice wrong: two rows of separate concrete blocks sitting on the grass either side of the road. 2.15 m and 1.35 m units at 1.04 m centres. |
| **Where one district's platform stops, the next one's has to start — and a *shrine* is a district** | `shrine.js`'s precinct ends at `TER.z1 = 40.0` and `onsen.js`'s back-gate flight starts at `Z0 = 40.6`, so 0.6 m of the threshold had no platform at all and `heightAt` fell straight through to the natural grade — **1.79 m below the precinct**, and once down there the 2.09 slab is outside the 0.55 m `fromY` reach, so the player stays under it. 0.45 m of it was not drawn either: bare terrain in the middle of the opening, invisible only because the gate posts frame it. Two modules each ended their own work correctly and nobody owned the joint. The only tool that finds it is a **linear trace along the route carrying the feet height forward** — a walk from z 45 to 39 at 0.15 m prints the fall in one line. |
| **A printed panel is not an opening, and a can dropped behind one is inside the machine** | `vending.js`'s 取出口 was a texture on the front face — a plate with a painted black bar — and `dispense()` released the can at `front - 0.14`, which is 0.14 m inside a solid `BoxGeometry`. So the most-used interaction in the world (nineteen machines) played a perfectly correct animation *entirely within opaque geometry*: no throw, no log, and pressing `E` did nothing anybody could see. **An interaction that appears to do nothing is not necessarily broken logic — check where the thing it moves actually is.** The body is five boxes with a notch out of the front now, merged into one mesh because `hullOutline` draws a contour per mesh and five of them would ink every seam. The two rows below are what it then took to make the can actually *readable* — the hole was the easy half. |
| **A pocket is only visible along a sight line shallower than `atan(height / depth)`** | Which is the number that decides a 取出口, and it is not obvious: the first one was 0.135 m tall and 0.17 m deep — 38° — and a vending machine's collider stops the player 0.54 m from its face, where the eye looks down at 70°. So the can was invisible *from the only place you can stand to press `E`*: the same symptom as the bug being fixed, one row up, from a completely different cause. 0.165 over 0.11 is 56.3°, so the mouth is open to a standing eye from about a metre out, and a translucent flap covers everything nearer. **Anything the player is meant to see inside a recess has to be checked against the angle they will actually be standing at**, not against a convenient render. |
| **…and at that depth a hinged flap has nowhere to go** | 0.11 m of pocket against a 0.066 m can: a top-hinged flap long enough to cover the opening sweeps the whole cavity and ends up either through the back liner or through the drink, and deepening the pocket to make room breaks the row above. Fixed and translucent instead — which is what the real thing is made of, and it means the can reads from any distance rather than only from far enough back to see past the head. **When two constraints on a moving part cross, the part probably should not move.** |
| **A thing in an unlit recess is on the cel ramp's bottom band, and so is everything around it** | The can in the port and the dark liner behind it came out within a few per cent of each other under the violet shadow tint — a light drink colour bought nothing, because the ramp's floor is the ramp's floor. `emissive` at 0.42 lifts the value while keeping the cylinder's shading, the same trick the lit selection buttons use. Same family as the grove canopies at `#3f6b52` and the parked cars' bottle green: **choosing a lighter colour does not help when the surface is getting no direct light at all.** |
| **…and what was standing on top of the panel had been invisible just as long** | The selection buttons were at y 0.16–0.35 across x −0.45…0.59 and the port panel at y 0.10–0.34 across x −0.51…0.11 — **the same plane**, overlapping, so three of the five buttons in each row were behind it and had been since the machine was built. Nobody notices a missing button on a machine that has ten of them. Two coplanar sheets are a coin toss (the onsen street's noren records the same thing); when one of them is 0.62 m wide, the coin toss is a cover-up. |
| **A prop authored to be read from outside has no inside** | Every scooter in this world is seen from about eight metres, and `makeScooter`'s own comments say so — the silhouette carries it. Sit *on* one and you are 0.8 m behind it looking at three blank faces: the bar cowl, the back of the legshield and two mirrors. Nothing is missing as far as the model is concerned; it is just that nobody had ever looked at that side. `cockpit: true` adds the speedometer, the levers, the ignition barrel and the 荷物フック, opt-in so the twelve parked ones pay nothing. **Before making any prop enterable, ridable or otherwise close-range, render it from the new viewpoint first** — the fault will not be a bug, it will be an absence. |
| **…and the first thing added to it went inside the cowl** | The brake levers were written from the bar at `|z| = 0.15` — which is exactly the half-width of the 0.30 m bar cowl they sit behind, so both of them were *inside* it and the machine had no brakes from the only seat that can see them. Same trap as the onsen street's 格子 screens and the vehicles' windscreens, for the third time: **you cannot carve a recess into a box, and depth is built outward.** |
| **A single collision disc cannot represent a machine you sit in the middle of** | The walker is a 0.34 m disc at the eye, which is the whole body. A rider on a 1.65 m scooter has 1.25 m of machine *in front of* that disc, so riding into a wall puts the handlebars — the bottom third of the frame — inside it. `RIDE.nose` is a second probe at the front axle: resolved with its own radius, and the push translated back into the body rather than turned into a pivot, because a slide is stable in a corner and a rotation is not. |
| **`rotation.z` on the camera is positive-to-the-left, and it is worth deriving once** | The camera's +Z points *backward*, so a positive roll takes its right axis up and the horizon down on the right — which is a head tilted **left**. Yaw also grows to the left, so a bank driven straight off the turn rate needs no sign flip; the *machine*, whose local +z is the rider's right, needs one. Both signs were checked by steering left and right and reading the numbers back, not by looking at a render — a banked frame looks plausible either way round. |
| **`heightAt`'s platform test is exclusive on all four sides, so treads that *meet* are a knife edge** | `steps()` emitted `z0 = run*i`, `z1 = run*(i+1)` for every tread, so a query landing exactly on a joint matched **neither** platform and returned the grade. A player's z is a float and will practically never sit on one, which is why it never showed in play — but a flood fill on a 0.35 m grid lands on one *every time*, so the tool that exists to find holes was manufacturing them: the onsen street read 426 cells reachable from the shrine with the whole street beyond it, and the flight was fine. The treads overlap by 40 mm now (`PAD` in `ground.js`), which is the rule this file already stated and `steps()` was the last place breaking it. Symptom: a fill that stops dead partway up a staircase a linear trace walks without complaint. |

---

## State

Working: cel/ink/grade pipeline, the planet with an exact 1005 m rail loop,
seamless walk-around (radial gravity, x wraps), a train circling forever with the
crossing gates driven by its position on the ring, falling and fallen blossom,
looping background music, **orbit view on `P` — it was `V` and `V` is the
e-bike now**, and
**22 `E` interactions** — nineteen vending machines (two of them スーパー さかえ's),
the shutter, the cat and the relay box. Counted from `world.interactables`; this
line said "twelve" for several rounds after it stopped being true.  The e-bike
makes a twenty-third while it is standing out, and takes it away again when it
is put away or ridden — so a count taken at the wrong moment is 23, not a leak.

**電動バイク — the one thing in this world with wheels that moves.**
`world/ebike.js`, and it is a runtime module rather than a district for exactly
one reason: it is built and placed **after `bakeToPlanet`**, which folds every
mesh into root space and clears the container transforms.  A machine summoned at
an arbitrary point and then driven around cannot be baked at all, so it goes
straight onto the scene and is re-seated every frame the way the bake re-seats a
`planetRigid` rig — `basisAt` for the tangent frame, `positionAt` for the
position.  `V` calls it up, `E` gets on and off, `W` runs it at **1.5 x a run
(7.65 m/s)**, and `core/player.js`'s `RIDE` block holds the three numbers the two
files share: where the rider sits on the machine, how far its nose reaches past
them, and how high the eye is.

Twenty-six districts, all walkable and connected — verified by flood fill on a
0.35 m grid with a step-height limit, so it cannot cheat by teleporting up a
wall. The bridge is climbable end to
end, the station platform can be walked onto (and now has a back path straight
to its steps), all four canal crossings can be crossed, the 太鼓台 on the
festival ground can be stood on, **ひばり山's 展望台 can be climbed** — 117 m
of 遊歩道 from the school's 裏門, two flights of 丸太階段 and fifteen treads — and
**both railway tunnels can be walked into**, through a 保守用通路 gate in the
lineside fence, along the cess and up three treads onto a 1.35 m walkway.

**The hills are 67 478 m² of walkable slope and the highest point is 18.37 m**,
at (28.5, -148.5) — `hillStats()`.  42 471 of that is ひばり山 and the balance is
ひばり湖's rim; the summit is unchanged, because the lake added *rim*, not height.
That is more than twice the town's own built
area and it is the first ground in this world that is not flat: `hillAt` is added
to every height query, so the player walks it with no platforms anywhere in it. It
is exactly 0 over every square metre of built ground — 1 476 colliders and
platforms sampled at 13 577 points, worst reading **0.00** — and **0.00 three
metres outside the keep-outs as well** now the lattice is fine enough to resolve
the mask's ramp (it was 0.267 at (−87, 7) on the 3 m lattice). Every signed box in
the world renders, the strung lanterns come on shop by shop over about a hundred
seconds, and the cloth hangs the right way round.

**The hill surface is eight tone meshes now**, the six of the ladder plus
`lakeBed` and `lakeShore` — the lake's bed and the pale drawdown margin above its
waterline, both decided **once per cell at the cell centre** for the same reason
`hillLitter` is: a waterline is a boundary the eye reads as a line, and `hash` is
handed to a cell's two triangles with opposite signs, so a jittered one comes out as
a zip of alternating triangles. The margin is 0.85 m of *field* rather than a
distance along the ground, which is correct: the width of a drawdown margin is the
level's fall divided by the slope, so the reed flat gets eight metres of it and the
boat house's revetment gets none.

The pre-lake split was **42 876 triangles in six meshes**, at 18.0 / 29.1 / 30.0
/ 7.5 / 5.2 / 10.2 per cent for sun / turf / deep / bracken / earth / litter —
nothing over a third, which is the target the ladder was built to. It was 22 343
on the 3 m lattice; halving the cell quadrupled the facets but only doubled the
triangles, because a 2.12 m diagonal is under `subdivideLongEdges`' threshold and
nothing is split on the way to the sphere any more.

**Both tunnel caps meet the hill mesh exactly, and that is now checked.** A cap
samples `fieldAt` along its notch edges and chords in between, so the two surfaces
agree only where its stations land on lattice nodes — and the z spacing was
`round(depth / 2.0)`, which never did. Measured at 1.5 m: **1.69 m of gap** at
東山's south edge. Both counts come off `CELL` now and all eight edges read
0.0000.

**Both bores clear the train by 0.524 m at the worst point**, which is the
messenger wire at 5.976 against a crown at 6.500. Run `boreClearance()` from
`tunnel.js` — it checks the lining against the body, the roof pods, the
pantograph and both wires and returns the worst gap and where it is. Before it
existed the same check read **−2.78 m**: the arch's centre was on the wrong line
and the crown was at 3.20.

**And `cribClearance()` is the same kind of check for the 法枠工**: the worst
height the hillside reaches above the cell laid over it, which the lift has to
beat or the terrain comes up through the frame. It reads **0.056 (W) / 0.002 (E)
against a lift of 0.11** — better than the 0.080 / 0.084 it read on the 3 m
lattice, because a finer lattice means shorter chords under the same cells. One
quad per cell read 0.446 and rendered as a crib with `hillEarth` showing through
every cell, which looks very nearly correct.

**800 159 cells reachable from the spawn over x −170…170, z −200…130**, and every
one of 28 waypoints reached, including both bore midpoints, all four portal
mouths, all four 待避所, both gates, all four tunnel viewpoints, the 展望台, the
supermarket's roof deck, the overbridge deck and the bus terminus. The window has
to reach x ±170 and z −200…130. Quote the bounds and the tool with any figure here
and **re-derive rather than compare**; the check that means anything is the
waypoint list, not the total.

**The lake needs its own window and its own seed: 261 870 cells over x 84…300,
z −172…−8 from a seed on the school's outer road at (89, −60), with all 31 of
ひばり湖's waypoints reached** — the road's climb and its layby, the embankment's
crest, the 余水吐 bridge, the management yard, the 斜樋's catwalk, the park's plaza
and its 東屋 and its toilet block, the 桟橋's root, middle and head, the boat
station's apron, shed and floating dock, the cafe's terrace, door and car park, the
brick rest area, the campsite's hut, a pitch, the 炊事棚 and its car park, the reed
bay's boardwalk, the hide's deck, the 水神様's pad and its steps down to the water,
the walk's east end, and the 見晴台 with its rest platform and its east descent.
It runs in about 9 s.

**Bucket the colliders before running it.** There are 2 731 now, and a fill that
walks all of them per neighbour test is 3 × 10⁹ operations — the first attempt
wedged the page so hard that `location.reload()` timed out and the tab had to be
reloaded from outside. An 8 m grid of collider lists is ten lines and takes it to
9 s. Chunk it in `setTimeout` at ~220 k visits and stash the state on
`window.__fill`.

**Two of the district's own waypoints failed the first time and both were real.**
The 見晴台 was sealed by its own balustrade (a railed platform is solid from
underneath, so the trail could not pass under it) and the brick rest area was
inside 喫茶 みなも's collider, because the shore walk ran through the cafe. Neither
showed in any frame. Both are in the trap table.

The fill takes about 22 s now and the tool calling it times out at 30, so **run
the two windows in separate calls** — and yield every ~250 k visits rather than
every BFS layer, or the `setTimeout` clamp alone adds eight seconds of nothing.

**The hill window on its own reads 178 228** over x −70…110, z −192…−60 from a
seed at (3, −86), with all nineteen of `urayama.js`'s waypoints reached.

**With ひばり湖: 18 751 wrapped meshes and 1 876 610 triangles**, i.e. +118 k over
the pre-lake figure below. The water's five layers are about 12 k of that in five
draw calls, the hill surface's two new tone meshes (`lakeBed`, `lakeShore`) are two
more, and the 62 k-node lattice (I1 112 → 200) is +18 k. `buildWorld` is ~6.1 s
against 4.7, of which the lattice is ~0.9 s at module load, `buildLake` 42 ms,
`buildLakeRoad` 177 ms and `buildKohan` 275 ms. Colliders 2 731, platforms 588.

**Scene scale, the round before: 19 065 meshes and 1 758 498 triangles.** The hill
surface is +20 k of that (the 1.5 m lattice), the 杉林 +77 k (307 baked stems,
which `subdivideLongEdges` triples on the way to the sphere because an 11 m trunk
is authored with two vertices along its length, plus 3 080 crown instances in
three draw calls) and the 法枠工 +30 k in four. All of it is baked and
frustum-culled, and this scene is draw-call bound by a wide margin — the railway
alone submits hundreds of thousands of triangles every frame regardless of where
the camera points — so **count draw calls, not triangles**.

**The lattice costs about 0.5 s at module load** (45 225 nodes against 11 413, four
passes, three scattered-bump grids). `buildWorld` is ~4.7 s in all and almost none
of that is the hills: `buildHills` is 115 ms, `buildTunnel` 117 and `buildUrayama`
48. If a load feels slow, measure those three before blaming them.

The figures below are the earlier windows, kept because they are what the
pre-hill numbers were measured in.  **None of them is comparable to the two
above** — the bounds tripled with the hills and the channel stopped circling —
and they are here as the record of how the check has been run, not as a baseline:

**221 484 cells reachable from the spawn — and mind the bounds.**  They were
x −95…85, **z −85…115**: the window every earlier round quoted stopped at
z = 95 and ひばり台七丁目 reaches z ≈ 105, so the first fill of that round declared
its coin park, both its houses and the whole north verge unreachable.  Nothing
was wrong with the district; the grid stopped short.  In the old z ≤ 95 window
the same world reads 193 711 against 196 905 before the supermarket, and 198 117
was the figure two rounds ago with a slightly more permissive fill — so quote the
bounds *and* the tool with any number here, and re-derive rather than compare.

The useful figure is the *check*, not the total.  For 七丁目, measured in one page
session: the world reads **221 484** with it and **226 203** without it and its
twelve vehicles, so the district costs 4 719 cells — 3 358 of them its own 87
colliders (splice them out and the fill reads 224 842), 972 the vehicles, the
rest its sixteen trees.  Nothing was sealed; the loss is the building.  Re-derive
it the same way for anything new — run the fill, splice the new colliders out,
run it again — and for 六丁目 the same procedure read 3 870 out and about 1 800
handed back, because grading a 2.4 m shoulder turns ground the step limit used to
refuse into ground you can walk on.

**ひばり湖 adds seven motor vehicles and two scooters, and not one of them stands
on a carriageway.** Three in the cafe's bays, two in the campsite's, one in the
embankment's management yard and one in the layby at the top of the climb; the two
scooters at the cafe and the park. The 湖畔道路 itself is 4.0 m of mountain road
with a 10 % grade and blind bends, and a car parked on it would be the only thing
in the frame from the 見晴台. The brief for the district asked for K-cars, a
minivan, a delivery van, a management truck and a camp service vehicle and then
said "不要让湖区变成停车场"; those are the same instruction.

**Thirty-seven motor vehicles and twelve scooters** (count the rows in `parked()`
and `scooters()` — the figure has been wrong in this file before), distributed
over the whole map by `traffic.js` rather than clustered anywhere — and **only
eleven of the thirty-two stand on a carriageway**, one of which is the bus that the whole of
六丁目's circle exists for.  七丁目 alone holds twelve of them and that does not
break the rule: six are on the roof deck, two in the coin park opposite, one in
the delivery yard, one on the service drive, one in a short-stay bay on the
store's own apron, and exactly one at the kerb of 七丁目通り.  A supermarket is
where a suburb's cars *are* at four in the afternoon, which is the whole reason
the district can carry that many without reading as a car park.  The first pass
put thirty-six in, twenty of
them at a kerb, and it read as a car park with houses round it: every view down
a street had a vehicle in it and two of the roads looked too narrow to drive.
Two thirds of what is left is in parking that a district module had already
marked out — the 月極 park, the coin park, the 町内会館, three carports, the
conbini apron, the 送迎 bay — and **no two vehicles anywhere face each other
across a road**; the closest opposite pair is 5.1 m clear end to end.  If a
later round adds more, add them off the road.

Four places have none on purpose — 桜守神社, 湯の坂, 夏まつり準備中 and 川端の道
cannot be reached by anything with four wheels — and ひばり台一丁目's one marked
bay is left empty because `ichome.js` argues it should be.

**The five added with ひばり山 are all off the carriageway**, so the count standing
on a road is still eleven: two in the school's staff bays (with the middle bay
empty between them), the 小型面包車 on the 器材倉庫's apron, the maintenance 軽トラ
on the gravel yard above the trail head, and one 軽 in the turning head at the top
of the school's outer road.  **The 裾道 itself is left completely clear** — it is
the only road in the world with a hill on one side and a school wall on the other,
and a parked car in the middle of that view would be the only thing in it.

**ひばり台ふれあい号 moved.**  It stood at 図書館前 because that was the only stop
in the world and there was nowhere for it to turn round; 六丁目 builds the end of
its route, and a 一日四便 service lays over at its terminus rather than halfway
along.  図書館前 keeps its pole and its timetable, which is the better frame
anyway — a stop with no bus at it says the bus is somewhere else, and now it is
somewhere you can walk to.

- **the crossing** — 青空商店, the gates, the kei truck, the jizo, the cat
- **県立ひばり台高等学校, doubled** — see the header of `school.js` for what moved
  and why.  Unchanged: the gate, the 本校舎 and the 昇降口, because those three
  are the entire approach sequence.  New: **第二校舎** (2 floors, 22 × 8.5, six
  different special-classroom interiors cycled through its sixteen bays), the
  **管理棟** annex, the **渡り廊下** between them at two levels, the **中庭** with
  its tree pits and memorial stone, the **器材倉庫**, a **relocated 20 × 14
  gymnasium** with a back door and extract fans, a **968 m² ground** with six
  sprint lanes, a marked pitch, two football goals, three flagpoles, an 8 m 防球網
  and two drinking points, a **staff car park**, a **working back yard** (tool
  store, switch room, refuse point) and two openings in the new north wall: the
  **裏門** at x = 18 onto the hill and a 4.2 m service gate at x = 50
- **さくら坂商店街** — eight shopfronts including そうざい ひなた, three of them
  with lit sign boxes, strung lanterns that switch on, brooms and buckets by the
  doors, 松の湯 with its chimney and its 富士 board, coin parking, reached through
  a 2.4 m alley
- **桜守神社** — torii, eleven stone steps up to a 2.1 m terrace, 社殿, 手水舎 with
  water in it, ema rack, omikuji, fox statues, bamboo, a roped 御神木
- **県立ひばり台高等学校** — three-storey block with glimpsed classrooms, 昇降口
  with shoe lockers, gym, clay ground with a backstop and equipment, bike shed
  with 25 parked bicycles, roof railing and bell
- **用水路** — **a 204 m reach between the two arms of ひばり山**, not a ring any
  more: concrete revetment at `z = -24` from `CANAL_X0 = -98` to
  `CANAL_X1 = 106`, block-colour water with a train streak, and four crossings —
  ひばり橋 the footbridge, こばと橋 where the street goes over it, なかて橋 a
  plain field slab, and 第二分水門 the sluice gate with its handwheel and
  walkway. Reeds, a lone vending machine beside two benches, and a works store of
  spare channel sections out on the east arm. Each end is a **暗渠** in the toe of
  the closing range and the two are deliberately different structures, for the
  same reason the two tunnel portals are: 呑口 in the west is the inlet — square,
  recent, with a raked 除塵スクリーン, a rake stood beside it, a maintenance
  platform and a gauge board — and 吐口 in the east is the outlet and the reach's
  source, older work, a stone-faced arch with a mossy sill, a stilling apron and
  a 量水標, and nothing across the mouth, because a screen on an outlet is
  nonsense
- **ひばり台図書館** — a two-storey branch library between the housing and the
  shopping street: a three-part frontage, a 0.28 m cornice, a glazed entrance
  bay hollow for two metres behind its doors with real shelving and a counter in
  it, ramp *and* steps up to a terrace under a canopy, a book drop, a notice
  board, bike parking and a forecourt with two street cherries standing in it
- **the corner** — 公衆電話ボックス, the 街区案内図 board and the residents'
  recycling box, on the triangle where the north lane meets the main road. The
  phone box is built like a hero prop: frame, glazing, light box, the
  instrument, its handset on the hook, the directory rack and the plinth
- **ひばり台三丁目** — a 3.2 m residential lane off the north end of the
  shopping street with one of each type on it: 米・酒 なかの (a corner shop with
  the family's flat over it), the relocated coin parking, 二階半の家 with a
  dormer, ひばり台コーポ (a three-storey walk-up), 連棟 三戸 with a bay each and
  one carport, and 片流れの平屋 under a single falling roof
- **さくら坂裏路地 / 駅裏の小径** — two back streets, 2.1 m and 2.6 m. The first
  runs behind the shopping street's west row past five shop backs — service
  doors, extract fans, gas meters, pipe stacks — and opens into a drying ground.
  The second links the canal's south bank straight to the station platform steps
- **夏まつり準備中** — the festival ground west of the shrine forecourt, two days
  out: five folding stalls up and empty (two canopies still rolled), a 太鼓台
  with its drum, lantern runs strung off the posts and the trees, a flag line,
  a programme board, cable to a distribution box, rope on stakes and chalked
  pitch lines
- **ひばり台こ線橋** — the pedestrian overbridge at `x = 41`, deck 7.2 m up
  clearing the catenary, a quarter-turn stair tower on each bank with bike push
  ramps, a translucent canopy, girders and piers, a fenced undercroft with
  ballast and equipment boxes, and the new east-side lineside footpath that
  connects it back to the crossing. The district's only vertical viewpoint.
- **さくら坂いっぷく処** — the vending corner in the pocket behind 青空商店:
  three machines under a corrugated lean-to, a slatted bench facing the track,
  a slotted drain, a low concrete wall, and the shop's back wall dressed with
  its meter, pipes and unremoved posters. The one place the player stands two
  metres from everything, so the detail level is set by that.
- **湯の坂** — the onsen street, on the shelf behind the shrine and a flight
  above it, reached through a new back gate in the precinct's north wall or up
  fifteen steps from the field on the east. Four and a half metres of stone
  slab between two timber rows: 湯乃屋 (the ryokan — court, bamboo screen,
  stepping stones, porch, pond, 石灯籠, clipped pines, glimpsed tatami through
  every window), 蓬莱湯 (the bath — 唐破風, its own 富士 board, 男湯/女湯 noren,
  a lobby two metres deep with shoe lockers, a scale and a bench in it, and a
  10.5 m chimney), 甘味処 さくら庵, 純喫茶 ゆのか and みやげ こけし堂. Between
  them a hot channel runs down the hill under a cambered timber bridge, with a
  free 足湯 off the street beside it and three steps down to the water. The
  viewing deck at the east end stands 4.2 m over the street and looks west
  along it into the sun. Everything warm on it — nineteen lanterns, the door
  lamps, the stone lantern, the tatami rooms — comes up on one staggered ramp
  at dusk, the same one さくら坂 uses
- **the housing** — children's park, ひばり荘 walk-up, a timber house below the
  shrine, three kinds of garden fence (concrete-and-mesh, 板塀, ブロック塀 with a
  透かし course), plus washing, post boxes, name plates and refuse points on
  every house

### The six residential blocks

Not set pieces. These are the land *between* the set pieces, and the point of
all six is density and connection rather than another thing to look at. The kit
they are built from is shared and lives in three files: `blocks.js`
(`makeGarageHouse`, `makeTimberHouse`, `makeNagaya`, `makeHall`), `plots.js`
(`plotBox`/`plotCollide`/`plotWall`/`dressPlot`/`hedgeRun`/`laneGutter`/
`bollardRow`/`laneSign`/`poleRun`/`refusePoint`/`stepStones`) and
`streetprops.js` (the gomi house, locker bank, scooter, kitchen garden, kid's
bicycle, drying rack, ball box, wheel stops, gas and water meters, chalk marks).

- **ひばり台一丁目** (`ichome.js`) — 63 m of 2.4 m lane west of the crossing,
  between the railway's masking wall and eight frontages: a walk-up, a 長屋, a
  連棟 and the five old houses. The wall runs out at x = −30 halfway along, so
  the closed slot opens to the lineside fence with the crossing at the end of
  it. Four passages cut south to the canal and one of them is honestly a dead
  end.
- **ひばり台二丁目** (`nichome.js`) — the *planned* block, and the only one with
  a kerbed through street: 38 m of spine from 公園前's link to the north lane's
  east arm, with the four services a residential district has and a shopping
  street does not (ひばり台内科, くすり さかい, コインランドリー ひばり,
  ひばり不動産 — fascias `textures.js` had carried unused since さくら坂 was
  built), a 3-storey コーポ みなみ, a 連棟 三戸 and a 狭小住宅 facing each other
  across a 2.0 m 私道, a 月極駐車場 against the railway wall with the new half's
  one vending machine on it, and 貸農園 where the estate stops.
- **ひばり台四丁目** (`yonchome.js`) — the 町内会館, the pocket park and the
  north row, plus **the main road's head**: `street.js` stops the carriageway at
  `Z_MAX = 52` and it used to end in a field, so the block carries it 6.4 m
  further, turns both footways round it, closes it with a guard barrier and a
  plate, and takes its own lane off the T just before the end.
- **公園前** (`koenmae.js`) — the connective one: a footway north off the
  lineside path past the overbridge's piers and east along the park's railing,
  a pocket square between the park and ひばり荘, and a service strip up the
  flats' back to the north lane. Turns a line of districts into a loop.
- **ひばり台五丁目** (`tsugakuro.js`) — the school's own neighbourhood behind the
  通学路: グリーンハイツ the staff block, a 二階半, a detached house with a
  carport and chalk on its apron, a 連棟 二戸, a 送迎 bay at the link's mouth,
  the backs of ひばりマート and パン工房こむぎ, and a 2.0 m **抜け道** between
  those two shops that comes out on the painted crossing at the school gate.
- **桜守裏町** (`uramachi.js`) — the oldest thing in the new work and the
  smallest block: a 2.4 m slot off the main road, a 祠 on the corner, a lane
  behind the onsen street's tree screen, a 長屋 四戸 whose eave overhangs half
  the arm, one 木造平屋, a shared drying ground, and a gap cut in the road
  head's hedge so the end of the main road has a footpath going on out of it.

### 学校前通り — the school route itself

`gakkomae.js`, and the only district in the world that is a *street* rather than
a place: the 35 m of 通学路 between こばと橋 and the school gate. Both sides were
nearly full when it started — ひばりマート, パン工房こむぎ, two houses, 五丁目's
link, bay and 抜け道 on the west; the school's own wall on the east — so it is
mostly street furniture, which is what the brief wanted anyway.

- **こばと橋南詰** — the bridge-head square on the east verge, with the world's
  only way down to the canal's towpath at this end: a three-tread flight through
  a new 2.5 m opening in `canal.js`'s retaining kerb. Machine (the district's
  interaction), two benches facing the water, a bed, a direction post, guardrail.
- **the school verge** — 24 m of 2.77 m between the footway and the wall: two
  bicycle shelters and four racks (sixteen machines, nose-in to the wall), the
  association board, three more 通学路 plates, beds, benches, a gutter with its
  gullies, and a mirror on the gate corner. The verge is *full* on purpose — the
  road's own 1.55 m footway is the route past it, which is what a Japanese school
  frontage actually looks like.
- **文具 ひばり堂** — the stationery shop on the last road frontage there was
  (P4, x −7.8..−3.0 / z −64.5..−60.9), fifteen metres from the gate, with a
  gachapon row, an umbrella stand and a full bike rack outside it.
- **ひばり輪業** — the bicycle shop, on 五丁目's lane where the land was, with
  eight machines along its apron and its workshop side dressed as one.
- and the street: gutters and covers down both footways, the conbini's apron and
  the bakery's frontage dressed for the first time, ivy and a poster board on the
  one blank flank, road patches, parked bicycles and fallen blossom.

**`SHOPS` in `textures.js` gained `bungu` and `ringyo`.** The nearest existing
tenants were ほしの (文具とゲーム) and たかの (電器) — both on さくら坂 — and
reusing them would have put the same two shops on a second street 400 m away.
The table is append-only: `wall:`/`kind:` indices into it are baked into every
frontage already standing. `laneNamePlate` gained 川端の道 the same way.

### 川端の道 — the lane between the canal and the school

`kawabata.js`. The largest single piece of empty ground left near the middle of
the map — 36 m by 10.6 m at x 19.4…55.6, dead flat at 1.05, with water down one
side and 2.35 m of school wall down the other. It had never been built on
because it is behind everything, and **nothing with four wheels can reach it**:
the only ways in are the 1.5 m and 1.62 m slots either side of the house at
(14.4, −35.5), which are 0.82 m and 0.94 m of walkable ground.

That decides the whole street. It is a lane, its buildings are the five types
that never needed a car — 長屋 三戸, 木造平屋, 連棟 二戸, 二階半, 木造二階建 —
and all five face **+z, into the canal**, which out here is also into the sun.
Five sunlit frontages with the channel in front of them and a blank wall behind
you is a section nothing else in this world has.

Three things are load-bearing:

- **The railing is the first thing built here.** `canal.js`'s retaining kerb
  tops out at 1.27 against a lane at 1.10 — 0.17 m, less than the 0.38 m step,
  so `_resolve` skips it — and **east of x = 44 the kerb is not there at all**,
  because the canal runs its structure over the whole reach and its dressing only
  over x −58…44. So 36 m of lane had an unguarded 0.4 m edge onto the channel.
- **The way down to the water is a 1:11 ramp**, at the east end where there is
  no kerb to cut through. It is the only bicycle-friendly way onto the towpath
  in the world, and it is built as eight platform boxes the walker feels and
  **one raked solid the eye sees** — see the note in the conventions.
- **The row breaks round `canal.js`'s grove tree at (28.6, −34.2)**, which is
  staying: it is the south bank's own mass and the only thing stopping 36 m of
  roof line running unbroken. The break is the street's green pocket.

### ひばり台六丁目 — the community-bus turnaround

`rokuchome.js`, and the first district in the world laid out round a **vehicle
movement** rather than round a building.  ひばり台ふれあい号 had a stop outside
the library and nowhere to turn round; this is the end of its route.

It is deliberately **not a terminus**.  A Japanese コミュニティバス折返場 on the
edge of an estate is a widened piece of residential road with a stop pole, a
shelter, a bay or two and a mirror — no stands, no interchange, no building.
What makes it read is the ordinariness of everything round it.

- **六丁目通り and the 転回場** — 5.0 m of kerbed carriageway from a connector off
  二丁目's north T, running 15 m east into a **12.4 m turning circle** centred
  (70.60, 52.20).  That radius is a decision: `SPEC.minibus` is 6.30 × 2.08 and
  its outer front corner sweeps a shade over 6 m, so 6.20 m of paving is one
  切り返し — which is what a driver does four times a day.  A circle the bus
  could take in one sweep is 16 m across and stops being a widened road.
  Street and circle are **one extruded polygon**; see the trap table.
- **the stop** — a yellow 停車位置 box, a raised waiting island, a 2.9 × 1.4 m
  shelter with a 路線図 in it, `busStopPlate` variant 1 (終点), two benches, a
  lamp on the rim, a 転回場 plate and a 駐車禁止 disc at the throat, three
  delineators and a guardrail on the outer arc.
- **月極駐車場** — three bays nose-in off the north kerb, 4.6 m deep, so they are
  軽 bays and the two cars in them say so.  Bay 2 is left empty between them.
- **the housing** — コーポ ひがし (3-storey walk-up, gallery on the street,
  balconies on the sunlit north side), 第二 さくら荘 (a two-storey 外廊下 block on
  the circle's north rim), 連棟 三戸 whose three aprons open straight onto the
  circle, a 長屋 二戸 with its eave over 北の道, and one 一戸建て with a garden,
  reached through a gate off the circle's south rim.
- **お弁当 のはら and 雑貨 まるみ** — the two shops, on the street's *south* side
  because +z is the sunlit elevation here and a 弁当屋 in permanent shade is a
  弁当屋 nobody can see the food in.
- **the corner node** — a machine (the district's interaction), a notice board, a
  bench, a bed, a cherry in a tree pit and bollards, in the 4.6 × 2.8 m pocket
  between the shops, the kerb and the circle's south-west arc.
- **the back edge** — a 1.15 m 擁壁 with a 転落防止柵 on it, a line of grove trees
  on the cut slope behind, and the ground climbing to 2.4 m by z = 72.  That
  bank is the reason the town ends: `planet.js`'s new pad at (62, 55) stops
  short of the block on purpose.

`textures.js` gained `SHOPS.bento` / `SHOPS.zakka`, `norenTex('bento')`,
`warningPlate(3)` (転回場), `busStopPlate(variant)`, `busRouteBoard`, `bayNumber`,
three `blockPlate` names and two `laneNamePlate` names — all **appended**, because
every `kind:`, `plate:` and `variant:` in the world is an index into those tables.

### ひばり台七丁目 — スーパー さかえ and its roof car park

`nanachome.js`, and the first district built round a **building bigger than a
house**.  Everything up to here is at the scale of a shop, a hall or a school
block; a 地域スーパー is the one thing a Japanese suburb has that is genuinely
large and genuinely ordinary, and the whole problem is to make 350 m² of shed read
as somewhere people call in on the way home rather than as a box on a field.

Three things do that, and none of them is the building.

- **the 前場** — the apron between the doors and the road, which is where a
  Japanese supermarket actually lives: a lean-to trolley bay with ten trolleys in
  it, the basket stacks inside the recess, two machines, a bin, two recycling
  boxes, a drinks cage, the crates and carton trays outside the door, an umbrella
  stand, a 本日特価 A-board, three short-stay bays, a cherry in a tree pit, two
  beds, benches, bollards, guide lines and 徐行 painted on the slab.  It is
  dressed harder than any frontage in the world except the vending corner, and
  for the same reason: you stand two metres from all of it.
- **the 屋上駐車場** — twelve bays on the roof at **6.20**, level with 湯の坂's
  shelf, reached by a 34.5 m ramp that wraps the store's east and south flanks.
  The second walkable level in the world after the overbridge and the only one you
  can drive to.  **The building is the length of its own ramp**: 1/6 is the
  steepest a self-parking ramp may be, so a 5.75 m rise needs 34.5 m of run, and
  16.4 m down the east flank + a 4.6 m corner landing + 15.9 m west along the
  south flank is the only shape that fits the parcel.  Hence 21.6 × 16.4 and not
  some rounder number.
- **the 荷捌き場** — the delivery yard behind the west gable, screened by a 2.1 m
  wall with a 4.2 m gateway, so you find it rather than are shown it: a 1.05 m
  dock with a roll-up shutter, bumpers, canopy and steps, the cold-store plant,
  pallets, roll cages, cartons, the waste bay, and the 2 t lorry nosed at the gate.

And the ordinary street furniture that makes it a place rather than a site:
**七丁目通り** (6.0 m, a shade wider than any residential lane here and a shade
narrower than the main road), a coin park of six bays opposite, a residential spur
with コーポ さかえ and two houses on it, the 3.6 m link east to 四丁目's lane, a
3.2 m service passage down the east side, and **the fourteen steps up to 湯の坂**
through the 7.4 m gap `onsen.js` left in its terrace's retaining wall — a 2.75 m
drop that had no wall, no railing and no way down, because until this district
there was nothing on that side to fall onto.

Six of `onsen.js`'s grove trees came out to make room, which is what the brief
asked for; the store's south flank does the job they were doing for 湯の坂's back
and does it better.  `textures.js` gained eleven generators for it
(`superFascia`, `superBoxSign`, `superHours`, `superBanner`, `superPoster`,
`superDeal`, `superInterior`, `parkPlate` ×7, `parkGuide`, `deckBay`,
`coinParkPlate`, `deliveryPlate`), all appended.

### ひばり山 — the back hills and the two tunnels

`hills.js` makes the ground, `urayama.js` is the district on it, `tunnel.js` is
the railway through it.  Read the header of `hills.js` first: the height field is
the only genuinely new *mechanism* this project has added since the planet.

- **42 471 m² of low hill**, highest point 18.37 m at (28.5, −148.5), in three
  groups (`hillStats()`; it was 41 508 before the channel stopped circling, 42 813
  after, and moved again when the lattice halved — a finer lattice samples a
  different set of points and the third octave adds up to 0.30 m, so **re-derive
  this rather than compare it**).  The **south
  massif** is the 後山 proper — the land behind the school, and the only part with
  paths on it.  The **west arm** runs north from it, crosses the drainage
  channel's valley and then the railway, which tunnels through a spur centred 16 m
  *north* of the track.  The **east shoulder** carries the col the second tunnel
  goes through, and it is the only longitude on the planet where the range has
  mass on **both** sides of the line: E2 at (124, −48) south of it and E3 at
  (122, 20) north, with E2b between the railway and the channel.
- **裾道** — 89 m of hill-foot road behind the school plus a leg up its east side,
  taken off the 通学路's former dead end.  `approach.js`'s railing across that
  carriageway is gone and two of its six screen trees with it; the bollards stay
  as the taper into the narrower lane.
- **every trail is benched into the slope it crosses** (`BENCH_FLAT` in
  `hills.js`), and this is the one genuinely new mechanism of the round.
  `hillPath` lays a ribbon on whatever the field does, so a path across a steep
  face inherited that face's **cross**-slope — a strip of gravel painted on a
  1-in-2 bank.  Nothing caught it, because the walker has no slope limit and
  simply follows the height query.  The flood fill does: it steps 0.35 m along an
  axis and refuses a rise over 0.38, and on ground held at the rail corridor's own
  1.9 allowance every such step is a rise of 0.63–0.78.  Pass 4 of the lattice cuts
  and fills the ground to the trail's own longitudinal profile within 1.1 m of the
  centreline, fading out by 2.7.  Measured on the worst route (ひばり山's overlook):
  worst axial rise **0.742 → 0.375**, and the per-metre gradient dropped to exactly
  the route's own designed 1.10.  The **fill half is refused inside any keep-out**
  — `main`'s trail head is inside the school's rectangle and raising there would
  take `hillSafety` off 0.00.
- **the 遊歩道** — 117 m of main climb from the 裏門 in twelve legs (1 in 7.6
  overall, and **two** pitches with 丸太階段 on them rather than the four there
  used to be: benching graded the 祠 spur and one of the main flights out of
  existence, which is what a graded path does), a 43 m crest walk,
  three spurs and a level 74 m 山裾の道 that makes the walk a circuit.  Boardwalk
  on the wet shelf, two plank bridges over gullies, timber rails where the ground
  falls away, fingerposts with real distances at every junction.
- **ひばり山 展望台** — 13.9 m of hill plus a 2.8 m timber deck on nine posts, on
  the massif's north shoulder: eye 18.3 m above the datum, 76 m of ground horizon,
  which reaches the school's north wall at 42 m and the gym at 62.  The 眺望案内
  panel's bearings are the real ones, measured off the world.
- **山ノ神** — a 石祠 the size of a letterbox, a 1.5 m timber 鳥居, two small
  石灯籠, an offering shelf with a cup on it, three stone treads and a 注連縄 on
  the tree beside it.  Fifteen square metres, which is the point: 桜守神社 is the
  shrine in this world and this is what the mountain has instead.
- **林間広場** — the clearing on the flattest ground on the hill (slope 0.04),
  with the biology club's observation board, a stone table and five log seats;
  and a smaller one on the crest with a fire ring nobody is allowed to use.
- **the 杉林** — five plantation blocks, `STANDS` in `hills.js`, and the second
  tree form this world has ever had.  Everything green on the range came out of
  `buildGrove`, which has exactly one canopy: a cloud of blobs.  A hundred and
  fifty metres of that is a field of identical bubbles with a smooth green arc
  for a skyline, and no object on it of known size.  `buildCedar` is a stack of
  six to eight 7-sided cones over a bare pruned stem — narrow, dark, plumb, and
  therefore the thing that gives a slope its scale and a ridge its saw edge.
  A stand is a **rotated rectangle with a hard edge**, not a scatter: 307 stems on
  a 4 m grid, no broadleaf and no understorey inside one, and a sixth ground tone
  (`PAL.hillLitter`, the only one darker than `hillGrassDeep`) for the needle
  floor.  Both readers go through `standAt`, and two of the five cross a tunnel
  notch on purpose so `tunnel.js`'s cap planting continues the same compartment
  across the mountain the railway goes through.
  A block of 11 m conifer is **not** a scatter, and the keep-out radii in `SITES`
  were sized for a scatter: what holds a line of sight open through one is a
  corridor in `VIEWS`, which is why there is now one for the 展望台's own approach
  along the crest.
- **法枠工 on every engineered face** — `buildCribs` in `tunnel.js`.  `plantRange`
  refuses ground steeper than 0.9 and every cut face here is 1.3–1.9 by
  construction, so the approach banks, the col's ridge and both caps' flanks were
  the only ground in the world with nothing whatever on them: 45 % of the
  overlook's frame, 60 % of the gate's, one flat tan.  A 2 m concrete grid with
  seeded cells fixes it because it supplies the two things the face was missing,
  a module the eye can count and the mark of somebody having built it.  Rows are
  spaced **along the slope** by an arc-length march from the toe, so the grid does
  not stretch as the bank deepens and simply stops where the bank dies; a member's
  plan half-width is divided by `hypot(1, g·n)` so it is 0.34 m on the ground
  whichever way it runs; and `cribClearance()` reports the one number that matters
  — the worst height the hillside reaches above the cells, 0.084 m against a lift
  of 0.11.
- **two tunnels, and they are mirrors of each other.**  `TUNNELS` in `hills.js`
  is a table with a row each; `nearBore`, the notch list, the fence runs, the
  masking walls and the catenary mast skip all take the union over it.

  | | ひばり山トンネル | 東山トンネル |
  |---|---|---|
  | where | the west arm, x −132…−96 | the east col, x 108…138 |
  | form | a spur — mass north only | a col — hill on both sides |
  | approach | 片切り: bank north, open south | cut on both banks |
  | bore | 36 m, walkway **south** | 30 m, walkway **north** |
  | 保守用通路 gate | south, x −84.5 | north, x 85 |
  | railside spot | south, at the east (shaded) mouth | north, at the west (lit) mouth |
  | overlook | on the north bank, 9.6 m up | on the south ridge, 7.7 m up |

  Both: crown at 6.5 m (set by the messenger wire at 5.95, **not** by the train),
  6.6 m wide, two 坑門 with 扁額, arch rings, coping, pilasters, wing walls and
  weep holes; a lined bore whose rings alternate 65 mm in and out so every joint
  is a real swept face; a 1.35 m walkway with a kerb, a handrail broken at the
  refuges and three treads down to the cess at each end; **two 待避所 built as one
  lining ring set back 0.9 m**; wall lamps every 6 m on alternating sides with a
  pool of light on the ground under each; cable ducting and a drainage channel on
  the far wall; 距離標, 覆工番号 and 保守用通路 plates sized to be read from two
  metres; cantilever brackets carrying the messenger; approach cuttings with a
  retaining kerb, a channel, cable troughing and a crest fence; a colour-light
  signal, cabinets and the works plate.  The train is 60.3 m long, so neither bore
  ever holds all of it — which is the better picture.
- **東山's col needed one mechanism the west bore did not.**  The drainage
  channel's corridor held the ground flat from z = −30.5 out to −10 at *every*
  longitude, so the 24 m between the two rings measured **0.0 m of hill on both
  sides of the planet** and no range could ever have crossed the line.  A bore
  with `narrowChannel: true` closes that corridor to 11 m over its own longitude,
  which lets E2b stand between the railway and the water.  Re-run `hillSafety`
  after touching it.
  The corridor is also **bounded in x now** (`chanHere`, off `CANAL_X0`/`CANAL_X1`
  so it cannot drift from the channel it exists for), which is the other half of
  the same story: while it circled the planet it sawed a flat 28 m corridor clean
  through both arms of the range — 9.3 m of hill at z = −46, **zero from −34 to
  −15**, then the tunnel cap.  Outside the channel's own reach `shapeAt` now
  carries the range across `z = −24` on its own: 2.36 m at (−116, −24) and 2.25 m
  at (124, −24) with 9–10 m either side, which is a saddle with a watercourse in
  the bottom of it rather than a ditch across a plain.

### ひばり湖 — the lake, and the eight rooms on its shores

`lakeform.js` is the shape of the basin (and is *not* a district — `hills.js` reads
it while building its lattice), `lake.js` is the water, `lakeroad.js` is the civil
engineering and `kohan.js` is the places. Read `lakeform.js`'s header first: the
"water above the datum" decision is the only genuinely new mechanism since the
height field itself.

**7 916 m² of water, 2.6 m at its deepest, contained** — `lakeLeakCheck` walks out
2.7 m past the shoreline and stops. 2 216 m² of it is under 0.9 m and 4 149 m² over
1.9, which is what gives the surface its three tone bands. 424 reed clumps,
11 lily flowers, four 水鳥, 455 floating petals and a 114-box shore barrier.

- **the water** is five flat layers and a contour, all generated by marching
  squares on the **depth field** rather than drawn: the body, a green shallow band
  at 0.06–0.85 m, a blue-violet deep band past 1.75, hard-edged sky panels, and
  *block reflections* laid from each stretch of shore toward the middle of the lake,
  because that is which way a reflection points. On top of that three wind lanes
  and six ripple rings, each a `planetRigid` hub with an inner pivot — a fifth of
  the way round the planet, `mesh.position.x` on a baked mesh moves sideways *and
  down through the surface*, which is why `canal.js`'s train-streak trick does not
  generalise.
- **堰堤** — the embankment across the basin's north-west corner, where the survey
  says the barrier is thinnest (4.6 m against a 1.3 m saddle beyond it). 1.2 m of
  fill over the natural sill, and a 3.3 m face because the 放水路 cut immediately
  downstream takes the ground to 3.0. Riprap on the upstream slope, the management
  road along the crest, a **dry** 余水吐 (a 満水位 weir is 0.15 m in the air in
  April, and what actually discharges is the 底樋), a 斜樋 standing in the water with
  a catwalk and a chained gate, a 量水標, the outlet works and its stilling basin,
  and a management hut with a 軽トラ in its yard.
- **湖畔道路** — 4.0 m from the top of the school's outer road, up the outfall valley
  beside the 放水路, through 2 m of cutting with a retaining kerb and a channel, over
  the crest and south along the west shore to the campsite. White edges, a broken
  yellow centre on the climb, 急カーブ and 落石注意, two convex mirrors, ten
  delineators, guardrail on both bends, and a two-space layby at the top where the
  water first comes into view.
- **ひばり湖畔公園** — the arrival, on the west shore's 15 m graded shelf: a terraced
  plaza with steps *and* a ramp, a four-post 東屋, two picnic tables, beds, planters,
  a drinking point, a toilet block (exterior only), bins, two machines, a 街区案内図
  and a notice board. The lawn is the **hill surface**, not a green pad: a flat card
  30 m across on ground that is 1-in-5 is the failure the tone ladder exists to
  avoid.
- **見晴らし桟橋** — 26 m out on six bays of piles with a 5.6 × 4.8 head, and the
  26 is measured: from a 1.7 m eye the water is visible for 23 m, so the whole near
  basin is inside the horizon and the peninsula's tip sits exactly on it. Benches,
  four mooring bollards, a life ring, a rules board, two lamps and a 量水標.
- **貸ボート ひばり** — a shed with its east gable open (three colliders, not one),
  a ticket window, a price board, an oar rack, a life-jacket rail, a floating dock
  and five boats: four hire boats moored bow-on and one on trestles for a repair.
  The red hull is number three, in the middle, because that is where the eye lands.
- **喫茶 みなも** — the only building at the lake with glass in it, on the **south**
  shore facing north over the water, which is the one bearing that is both lit and
  looking at the lake. Three interiors behind three tall windows (reveal, painted
  interior, glass, mullions — in that order), a dormer, a warm awning, a timber
  terrace with three tables, a light box, a menu board, a machine, an aircon, a
  delivery door and three bays.
- **ひばり湖 キャンプ場** — six terraced timber pitches (the shelf is 1-in-4, so a
  platform is the only way to get a level tent out of it), three low-saturation
  canvas tents, a 管理棟, an open 炊事棚 with two hobs, a 洗い場 with three taps, a
  薪小屋 with the logs' cut ends showing, a fire ring on every second pitch, bollard
  lamps and two bays.
- **野鳥観察小屋 かいつぶり** — on piles **in** the reed flat at the end of a 22 m
  boardwalk, which is the whole design: a hide on the bank looks over the reeds, one
  in the water looks *through* them. Three horizontal slots (a hide has no glass), an
  elbow shelf, a bench, a 鳥類図鑑, an ecology board and an empty telescope mount.
- **水神様** — fifteen square metres at the end of the walk's unmaintained half: a
  stone 鳥居 you duck under, a 石祠 the size of a letterbox, one 石灯籠, an offering
  shelf with a cup, a 注連縄 with 紙垂 on the tree beside it, and four treads down to
  a mossy sill at the water.
- **湖畔遊歩道** — **not a ring**, which is the brief's own instruction: it covers the
  developed half and then narrows to a 1.15 m dirt trace up the east shore and stops.
  Five surfaces, seven benches, six lamps, four life rings, four depth boards, four
  fingerposts with real distances, a brick rest pocket and a 落石注意 where it runs
  under the rim's cut face.
- **ひばり湖 見晴台** — 11.5 m of shoulder plus a 1.1 m platform, on the divide
  between the lake and the school. Eye 14.3 m up, 68 m of ground horizon, and the
  peninsula's tip is at 66. Reached by 見晴台の道: 21 legs off the 山裾の道, eight
  flights of 丸太階段 where the *ground* says rather than where a list says, timber
  rails on the two exposed traverses, and a rest platform on the middle shelf.

Deliberately absent: the old long-depth background (distant town, hills, far tree
line) — at this radius it was all over the horizon, and ひばり山 is what replaces
it, at a distance you can walk to. **And no people anywhere**,
including on posters, ema and shop signage. That is a hard constraint, not an
omission: the environment carries the narrative.

Open thread: the user wants to import a `.glb` model. The plan agreed was —
drop it in `public/models/`, load with `GLTFLoader`, then **walk the loaded scene
and replace every material with `cel()`**, preserving base colour and map. That
material swap is not optional: an untouched PBR asset renders as a photoreal
object pasted onto a hand-painted scene. Then `shadowify()`, `hullOutline()` for
hero props, normalise scale/orientation (glTF is Y-up metres, but exports are
often cm or Z-up), seat it with `world.heightAt()`, and register a collider via
`ctx.collide()`. Low-poly assets suit the art direction; scanned/high-poly ones
will fight it.
