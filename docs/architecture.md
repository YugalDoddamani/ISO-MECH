# Architecture

ISO-MECH V2 is a static site with no build step. `index.html` contains the page markup and loads, in order:

1. **13 stylesheets** from `css/`, linked in cascade order (later files override earlier ones).
2. **3 libraries** from the jsDelivr CDN, pinned with Subresource Integrity: three.js r128, its `OrbitControls`, and cannon-es 0.20.0.
3. **47 application scripts** from `js/`: classic scripts that share one global scope.

This layout started as a systematic split of the former single-file build (`ST.html`). That file inlined the three libraries, six standalone factory scripts, and one 138 KB application closure. The factories became one file each, unchanged. The closure was cut into the modules below at statement boundaries, keeping the original statement order. Its code was then formatted with Prettier, and the module is proven identical at the syntax-tree level (see [Provenance](#provenance-and-verification)).

## Why classic scripts that share a scope

The application closure was one function scope: about 360 top-level names (`scene`, `drive`, `config`, `switchVehicle`, …) that every part of the app reads and *reassigns* (`activeVehicle`, `exploreMode`, `angles`, …). Classic scripts reproduce that scope exactly: top-level `let`/`const` declarations are shared through the global lexical environment, and function declarations become globals. ES modules would have required turning every shared mutable variable into an exported object property and untangling circular imports, which is a rewrite rather than a split.

The consequences, enforced by `npm run check`:

- **Declare before use at load time.** While a module executes, it may only use names declared by itself (in statement order) or by modules loaded before it. The check also follows functions called at load time; for example, `camera.js` calls `resize()`, which calls `updateFrustum()`, which reads `site` from `state.js`. Event handlers, timers and the frame loop run after start-up and may use any module.
- **No duplicate top-level names**, since every module shares one namespace.
- **Strict mode everywhere.** Each application module starts with `'use strict'`, like the original closure.
- **Deferred scripts in document order.** All scripts are `defer` (cannon-es is an ES module, and modules are deferred), so everything runs after parsing in exactly the listed order.

Order also matters for **side effects**. Scene objects, materials, DOM elements and draws from the seeded random generator are created in their original order. This keeps the yard layout, draw order and DOM identical to `ST.html`. That is why the load order interleaves groups (for example, the EX–240 hydraulics load after the construction site): it is the original execution order.

## Load order and module map

| # | File | Contents |
| ---: | --- | --- |
| | **Standalone factories** | |
| 1 | `js/vehicles/pile-rig/model.js` | PR–180 procedural model and articulation (`window.createPileRig`) |
| 2 | `js/vehicles/bulldozer/model.js` | Crawler dozer procedural model and blade (`window.createBulldozer`) |
| 3 | `js/vehicles/dumper/model.js` | Off-highway dumper model, steering, tipping body, 3.28 m³ capacity and payload mound (`window.createDumper`) |
| 4 | `js/environment/soil-simulation.js` | Deterministic, volume-conserving earthworks heightfield: digging, dumping, unloading the bucket, blade pushing, drilling, relaxation (`window.createSoilSimulation`) |
| 5 | `js/physics/yard-physics.js` | cannon-es world for yard props and machine envelopes (`window.createYardPhysics`) |
| 6 | `js/physics/fixed-stepper.js` | Fixed 60 Hz step accumulator (`window.createFixedStepper`) |
| | **Core** | |
| 7 | `js/core/runtime.js` | Runtime: DOM helpers ($, $$), the start-up guard, the WebGL renderer, the scene and small math helpers. This is the first application module; every later module relies on the names declared here. |
| 8 | `js/core/state.js` | Shared application state: Active vehicle and free-explore flags, the site/overview state (including the 90 × 68 m yard bounds), the exploded-assembly state, the free-explore camera state, the work-mode state and the `cueSound()` queue of one-shot sound cues. |
| 9 | `js/ui/status.js` | Status toast: notify(message) shows a short-lived status message over the stage. |
| 10 | `js/core/camera.js` | Camera: Orthographic camera and OrbitControls, camera presets (ISO/FRONT/LEFT/RIGHT/REAR/TOP), auto orbit, resize handling and the frustum that blends between close-up, assembly and site-overview framing. |
| 11 | `js/core/lighting.js` | Lighting: Hemisphere sky light, the shadow-casting sun and a cool fill light. |
| 12 | `js/core/materials.js` | Materials: mat() material factory and the shared machine palette M. |
| 13 | `js/core/geometry.js` | Geometry helpers: Small builders used by the procedural models and the yard: group, mesh, box, cylinder, shape, extrude, outlined, rod and canvas-texture labels. |
| | **Vehicles** | |
| 14 | `js/vehicles/fleet.js` | Fleet: The active-vehicle drive root, parked carriers, the four machines (EX–240 excavator, PR–180 pile rig, crawler dozer, off-highway dumper), their parking-bay records, the physics world with machine envelopes, and the PR–180 deck branding. |
| 15 | `js/vehicles/excavator/undercarriage.js` | EX–240 excavator · undercarriage: Main chassis, both crawler tracks (instanced shoes on a stadium path) and the slewing bearing. |
| 16 | `js/vehicles/excavator/upper-body.js` | EX–240 excavator · upper body: Slewing upper structure, body housing and counterweight, service deck, operator cab and walkway. |
| 17 | `js/vehicles/excavator/arm.js` | EX–240 excavator · arm: Boom, stick and bucket (with the soil payload visual), hydraulic rams, bucket linkage and hoses. |
| 18 | `js/vehicles/excavator/internals.js` | EX–240 excavator · internals: Illustrative engine and pumps, reservoir and valves, electrical harness, the open cab frame and seat, and the separable roof and glazing used by the exploded assembly view. |
| 19 | `js/vehicles/excavator/assembly-parts.js` | EX–240 excavator · assembly parts: The 13 numbered systems of the exploded view and the extra parts that move with them. |
| | **Construction site** | |
| 20 | `js/environment/construction-site/ground.js` | Construction site · ground: Seeded random generator, site materials, procedural soil texture, ground planes, access lanes, metre ticks, the fleet apron with four parking bays, ground lettering and the static obstacle list. |
| 21 | `js/environment/construction-site/interactive-yard.js` | Construction site · interactive yard: Physics-backed props, loose soil particles, stockpile deformation, the per-step yard update, and the machine–soil helpers shared by manual play and work mode: bucket digging, loading the dumper and dumping (`stepBucketSoil`), blade pushing (`pushWithBlade`), compaction (`compactUnder`), terrain-following pose (`terrainPoseAt`), props (`stepYardProps`), relaxation (`settleSoil`) and Reset Yard. |
| 22 | `js/environment/construction-site/effects.js` | Construction site · effects: Instanced dust and exhaust-smoke particle pools, per-machine exhaust and travel dust (`emitMachineEffects`) and releasing the dumper's load (`releaseDumperLoad`). |
| 23 | `js/environment/construction-site/boreholes.js` | Construction site · bore marks: Shallow bore marks left by the PR–180 auger (up to eight are kept). |
| 24 | `js/environment/construction-site/foundation-and-stockpiles.js` | Construction site · foundation and stockpiles: Reinforced-concrete foundation bay and the faceted earth and aggregate stockpiles. |
| 25 | `js/environment/construction-site/soil-terrain.js` | Construction site · deformable soil: Creates the soil simulation (window.createSoilSimulation), the visible soil regions (including the work-mode fill pad) and the vertex-coloured terrain mesh, tinted by height, placed fill, cuts and loose soil, plus the excavator bucket payload visual. |
| 26 | `js/environment/construction-site/site-props.js` | Construction site · props: Aggregate bins, pallets and pipes, masonry, the site office, safety cones, fuel drums, barricades, perimeter fencing, the survey station and instanced gravel. |
| 27 | `js/environment/construction-site/finalize.js` | Construction site · finalise: Bakes static props by material, registers static obstacles with the physics world and adds the shadow-catcher ground plane. Runs after every static prop has been created. |
| 28 | `js/environment/construction-site/track-marks.js` | Construction site · track marks: Ring buffer of instanced tread and tyre impressions left in world space. |
| | **Vehicles** | |
| 29 | `js/vehicles/excavator/hydraulics.js` | EX–240 excavator · joints and hydraulics: Joint configuration and console rows, cylinder kinematics, the pump-limited damped actuator model, ground and body guards, manual/hold input, Reset Machine Pose and the arm demo. |
| | **Interface** | |
| 30 | `js/ui/panel.js` | Console sheet and help: Mobile console sheet toggle and the interaction guide dialog. |
| | **Systems** | |
| 31 | `js/systems/travel.js` | Travel: Drive state, console tabs, dynamics and speed settings, hold-to-drive buttons, Return to parking bay, the travel read-outs, tracked and wheeled drive integration, track belts and the follow camera. |
| 32 | `js/systems/assembly.js` | Exploded assembly: Reversible exploded view of the excavator: guide lines, numbered labels, system selection, highlighting, explode/reassemble tweening and model picking. |
| 33 | `js/systems/site-navigation.js` | Site navigation: Oriented footprint collision between machines, the yard and obstacles; ground-track printing; the bird’s-eye site overview and the live site plan. |
| | **Input** | |
| 34 | `js/input/keyboard.js` | Keyboard: One keyboard state drives continuous motion and the passive keycap hints; also the desktop joint sliders (drag, click to seek, focused arrow-key nudges). |
| 35 | `js/input/mobile-gamepad.js` | Mobile gamepad: Touch travel pad, boom/slew joystick, bucket/stick sliders, sheet gestures, long-press camera reset, mobile camera buttons and the MORE button. |
| | **Interface** | |
| 36 | `js/ui/console-extras.js` | Console extras: Reset Yard button and the assembly system search field. |
| | **Vehicles** | |
| 37 | `js/vehicles/pile-rig/controls.js` | PR–180 pile rig · controls: Pile-rig console panel, mobile sliders and auger button, help text, keyboard input and UI sync. |
| 38 | `js/vehicles/pile-rig/drilling.js` | PR–180 pile rig · drilling: Auger penetration into the layered soil model, stalling, spoil and bore-mark growth (`advanceDrilling`, shared with work mode). |
| 39 | `js/vehicles/bulldozer/controls.js` | Crawler dozer · controls: Blade console panel, mobile sliders, keyboard input and UI sync. |
| 40 | `js/vehicles/dumper/controls.js` | Off-highway dumper · controls: Tipping-body console panel, mobile slider, keyboard input and UI sync, and recovering the last dumped load when the body is reset. |
| | **Interface** | |
| 41 | `js/ui/studio-controls.js` | Studio controls: Vehicle / free-explore switch button, console hide and show, overview close button, speed HUD and the compact camera-view selector. |
| | **Systems** | |
| 42 | `js/systems/explore-mode.js` | Free explore: Free-explore mode: parks the selected machine and flies the camera with W/A/S/D, Q/E and Shift. |
| | **Application** | |
| 43 | `js/app/vehicle-switch.js` | Vehicle switching: switchVehicle() parks the outgoing machine on its carrier, restores the incoming machine and updates every vehicle-specific label; updateModeButton() keeps the switch button in step. |
| | **Systems** | |
| 44 | `js/systems/work-mode.js` | Work mode: the autonomous site demo. Stations, the EX–240 arm kinematics, one generator job per machine, the motion integrator, the haul-lane reservation, shifts and restocking, the ▶ WORK MODE button and the crew panel and phone pad. |
| 45 | `js/systems/site-audio.js` | Site audio: the procedural Web Audio engine (diesel voices, hydraulic whine, track clatter, reversing alarm, one-shot cues), placement relative to the camera, and the SOUND button. |
| | **Application** | |
| 46 | `js/app/main.js` | Main loop: Initial pose, the deterministic 60 Hz fixed-step simulation (with its work-mode branch), the render loop and start-up (selects the PR–180 and renders the first frame). |
| 47 | `js/app/api.js` | Public API: window.excavator: the automation and testing interface. Assigned last, after the first frame, so that its presence means the application has fully started. |

The six factories have no dependencies on the shared scope. Each defines one `window.create*` function, called by `fleet.js`, `soil-terrain.js` and `main.js`. The public API in `app/api.js` is assigned last, after the first frame, so `window.excavator` existing means start-up has finished.

### Start-up sequence

1. Libraries load; the inline module copies cannon-es onto `window.CANNON`.
2. `core/runtime.js` checks `THREE`, `CANNON` and WebGL, then creates the renderer and scene.
3. Shared state, camera, lights, materials and geometry helpers.
4. `fleet.js` creates the drive root, the parked carriers, the PR–180, dozer and dumper (from their factories), the vehicle records and the physics world. The EX–240 is built procedurally by the `excavator/` modules.
5. The construction site: ground, interactive props, effect pools, stockpiles, the soil simulation and terrain mesh, props, static batching and track marks.
6. Controls and systems: hydraulics, console, travel, assembly, site navigation, keyboard, mobile gamepad, per-vehicle panels, studio controls, free explore, vehicle switching, work mode and site audio.
7. `app/main.js` sets the initial pose, starts the fixed-step simulation and render loop, selects the PR–180 and draws the first frame; `app/api.js` exposes `window.excavator`.

## Work mode

`js/systems/work-mode.js` runs the whole fleet without an operator. While it is active, every machine sits on its own carrier (as in free explore), `workMode.active` is set, and `simulateFixedStep` calls `stepWorkMode(dt)` instead of the operator path. The pieces:

- **Stations** (`WORK_SITE`) are fixed poses chosen so that no two footprints overlap and none touches an obstacle or the fence: the EX–240 east of the earth stockpile, the dumper's loading spot beside it at the head of a straight haul lane, the fill pad at the lane's end, the dozer's waiting spot beside the pad, and the PR–180's pile row beside its bay. Entering work mode places each machine at its station.
- **Jobs** are generator functions, one per machine, stepped once per fixed step. A job sets targets (joint angles, tool positions, blade height) and the speed and turn rate for that step, then `yield`s. Small reusable steps compose them: `driveAlong`, `pivotTo`, `armTo`, `bodyTo`, `rigTool`, `pushTo`, `boreHole`.
- **The integrator** (`integrateAgent`) applies the commanded motion only if `siteCollision()` allows it, writes the pose to the carrier, follows the terrain (`terrainPoseAt`), animates tracks or wheels through each model's `update`, and compacts the soil, exactly like the operator path.
- **The EX–240** keeps its real hydraulics: `armTo` feeds joint targets (each cylinder target a few degrees ahead of the joint, like an operator feathering the levers) to `stepHydraulics`, and digging and loading go through the same `stepBucketSoil` as manual play. Poses come from an exact two-link inverse kinematics of the arm (`armPivotIK`, `armTipIK`), checked against the ground guard's bucket points.
- **Coordination** is one reservation (`crew.lane`) for the haul lane and fill pad: the dumper takes it before reversing to tip, and the dozer before spreading a heap. Each holds it for a bounded time, so there is no deadlock.
- **Shifts:** when no dig line has enough material within reach (or four passes in a row come back nearly empty), the excavator pours what is left and rests. Once the dumper and dozer have finished too, `restockShift()` calls `resetYard()` and starts new jobs.

Everything is deterministic: the jobs use only the fixed step and the seeded `rand()`, so `window.excavator.stepFixed(n)` reproduces a run exactly. `setWorkMode(false)` lowers the dump body, stops the auger and restores the previously operated machine through `switchVehicle(…, true, true)`.

## Site audio

`js/systems/site-audio.js` builds a Web Audio graph on the first pointer or key event: a voice per machine (sawtooth and square oscillators plus brown noise pulsed at the firing frequency, through a load-dependent low-pass filter; a triangle pump whine; band-passed noise gated at the track-link rate, or low tyre rumble; and a gated reversing alarm), a wind bed, a compressor and a master gain. Each frame, `updateSiteAudio()` maps every machine's activity (hydraulic pump utilisation, travel, auger torque, blade load, or a work-mode job's `load`) to engine revs, and its position to gain and stereo pan relative to the camera target and frustum size. One-shot cues are raised anywhere in the simulation with `cueSound(type, x, y, z, level)` and drained here. Muting fades the master gain and suspends the context; the preference is stored under `isomech-sound`.

## Libraries and integrity

| Library | Pinned URL | Integrity mechanism |
| --- | --- | --- |
| three.js r128 | `https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` | `integrity` on the deferred `<script>` |
| OrbitControls r128 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js` | `integrity` on the deferred `<script>` |
| cannon-es 0.20.0 | `https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js` | `integrity` on `<link rel="modulepreload">` |

These files are byte-identical to the copies `ST.html` inlined. cannon-es has no UMD/global build: its CommonJS build differs (it requires Node's `perf_hooks`), so the page imports the exact ESM build in a two-line inline module and copies the namespace onto `window.CANNON`, the plain object the application expects. The `modulepreload` link starts the download early and carries the integrity hash, which the browser enforces for the module import. Do not remove it.

**Upgrading a library.** Change the version in `index.html` and `package.json`, run `npm install`, then `npm run check`. The check compares each URL's integrity hash with the matching file in `node_modules` and prints the correct value if it differs. three.js `examples/js` builds only exist up to r147, and later versions change APIs, so test thoroughly.

### Start-up failures

If something the app depends on is missing, `runtime.js` writes the reason on the loading screen, logs one `IsoMech start-up halted: …` error, and stops. Later modules' follow-on errors are suppressed, so only the root cause is reported.

| Cause | Loading-screen message |
| --- | --- |
| three.js missing (offline, CDN blocked, integrity mismatch) | The 3D engine could not start. |
| cannon-es missing (same causes) | The physics engine could not start. |
| WebGL context cannot be created | WebGL is unavailable. Try a browser with hardware acceleration. |

## Extending the studio

### Adding a vehicle

The four machines are wired by id (`'excavator'`, `'drill'`, `'dozer'`, `'dumper'`) in several places. The dozer is the simplest template; search for `dozer` to find every touch point.

1. **Model**: `js/vehicles/<name>/model.js`, a factory `window.createX = function createX(THREE) { … }` returning at least `{ root, state, limits, speeds, set, update, reset, tracks, dimensions }`. Add it to the factory group in `index.html`.
2. **Fleet**: `js/vehicles/fleet.js` needs a parked carrier, a record in `vehicleFleet` (label, model, carrier, home bay, footprint) and an entry in `vehicleOrder`. The physics envelope is added by the `addMachine` loop. Also add a parking bay in `environment/construction-site/ground.js`.
3. **Controls**: `js/vehicles/<name>/controls.js` for the console panel, mobile controls, `stepXInput(dt)` and `syncXUI()`, loaded with the other per-vehicle controls.
4. **Hooks**:
   - `input/keyboard.js` (`stepKeyboard`)
   - `app/main.js` (`simulateFixedStep` update call, UI sync in `frame`)
   - `app/vehicle-switch.js` (labels, body class, heading text, coach marks)
   - `systems/site-navigation.js` (track systems, print offsets, site-plan marker)
   - `systems/travel.js` and `vehicles/excavator/hydraulics.js` (Return to parking bay / Reset)
   - `systems/explore-mode.js` (body class)
   - `environment/construction-site/interactive-yard.js` and `effects.js` (ground contact points in `TERRAIN_CONTACTS`, exhaust and dust)
   - `systems/work-mode.js` (a station, a job and its crew-panel row) and `systems/site-audio.js` (an `ENGINE_SPECS` entry)
5. **Styles**: a `.<name>-mode` body class rule set alongside the existing ones in `css/vehicle-studio.css` / `css/dumper-and-explore.css`, plus an extra marker in the site-plan SVG in `index.html`.

Run `npm run check` and `npm test` afterwards. A vehicle registry that removes these hooks would be a good next refactor; V2 keeps the original wiring so its behaviour stays identical to `ST.html`.

### Adding to the environment

The construction site lives in `js/environment/construction-site/`. New static props belong in `site-props.js` (or a new file loaded before `finalize.js`), parented to `siteProps` so they are batched by material. Call `obstacle(x, z, width, depth, name)` for anything the chassis must not drive through; `finalize.js` also registers these with the physics world. Dynamic props go under `yardRoot` and must be registered with `yardBody(object, kind)`. They must never be parented to `siteProps`, or they would be baked into static geometry. Note that the soil heightfield covers x −4…44 m and z −20…32 m.

A second, selectable environment would need a small environment interface, because the yard bounds (`state.js`), soil grid (`soil-terrain.js`) and site-plan SVG are currently specific to this yard.

## Public API

`window.excavator` (see `js/app/api.js`) is the automation interface used by the tests. It exposes:
- the active vehicle, `switchVehicle`, `setExploreMode`
- `setWorkMode` and `workMode` (active flag, shift, elapsed time, stats, lane holder and each crew machine's status and pose)
- `audio` (`supported`, `enabled`, `state`, `setEnabled`, and `levels()` for each voice)
- the scene, camera, controls and renderer
- arm angles, `setPose`, `poseValid`
- drive state and `setDriveInput`
- `stepFixed(n)` and `fixedStepCount` for deterministic stepping
- site, fleet, yard (bodies, soil, physics, boreholes, `materialVolume()`) and effects
- assembly controls (`inspectAssembly`, `setExplosion`, `selectSystem`, `exitAssembly`)

## Conventions

- Application modules are formatted with Prettier (`npm run format`, settings in `.prettierrc.json`). The six factories are kept exactly as written in `ST.html` and are listed in `.prettierignore`.
- Each application module starts with a header comment that describes its contents.
- Files use LF line endings and UTF-8.

## Changes since the V2 split

V2 itself was a behaviour-preserving split (below). These later changes alter behaviour on purpose:

| Change | Where | Why |
| --- | --- | --- |
| The bucket fills a dumper parked within reach; the dumper holds 3.28 m³ and re-arms after each tip | `interactive-yard.js`, `dumper/model.js` | Connects the earthworks steps |
| The dozer blade pushes soil | `soil-simulation.js` (`bladePush`), `interactive-yard.js` | The blade previously only compacted the ground |
| The hydraulic actuator follows the joint-angle error through the cylinder ratio instead of chasing the target cylinder length | `vehicles/excavator/hydraulics.js` | The bucket linkage reaches its shortest stroke near 90° and the stick its longest near −45°. Length-chasing stalled there, so the bucket could not open far enough to dump (holding D even curled it back to 34°) |
| A soil sweep keeps the strongest weight per cell, not only the weight from a lower sample | `soil-simulation.js` (`scoopSweep`) | Level drags caught far less than intended |
| Reset dump body keeps the body's current payload and adds the recovered load | `dumper/controls.js` | Material is conserved now that the payload can change |
| Soil colour shows placed fill, cuts and loose soil | `soil-terrain.js` | Earthworks were nearly invisible from above; untouched ground looks as before |
| Phones show only the selected machine's sliders | `css/mobile-overrides.css` | The dozer and dumper sliders showed, and moved the parked machines, while the PR–180 or EX–240 was selected |
| Work mode, site audio, the fill-pad soil region, the dumper payload read-out | new modules and styles | New features |

## Provenance and verification

V2 was generated mechanically from `ST.html`. Every line of the application closure is assigned to exactly one module, or deliberately dropped: the closure's own `'use strict'`, and an obsolete comment about `assemble.py`. Only these intentional changes were made:

| Change | Why |
| --- | --- |
| The closure's early `return`s became `haltStartup()` in `core/runtime.js`, with an added cannon-es check | `return` is not allowed at the top level of a classic script; cannon-es is now an external dependency too |
| The cab display mesh `screen` was renamed `cabScreen` | As a global it would shadow `window.screen` for every script. Inside the closure it already shadowed it, which silently disabled the MORE button's landscape-lock request. Supported browsers now receive that request as documented; it is usually honoured only in full screen and failures are ignored |
| `viewTween`, `currentView` and `auto` moved to `core/camera.js`; `statusTimer` to `ui/status.js` | Each lives with the module that owns it (same initial values) |
| A few function declarations moved to their owning module (`approach`, `updateFrustum`, `notify`, `stepHydraulics`, `stepEffects`, `stepDrilling`, …) | Cohesion; function declarations have no side effects when moved |
| Per-vehicle UI construction grouped per vehicle | The DOM produced is identical (verified) |

Verification performed when V2 was created:
- **Syntax trees:** formatting changed no syntax tree (all 45 files compared).
- **Statements:** the multiset of top-level statements matches the original closure, except for the changes listed above.
- **Load order:** the load-order analysis passes, and fails as expected on deliberately broken orders.
- **Behavioural parity:** both builds were driven through the same 26-step scenario under a virtual clock, at desktop, phone portrait and phone landscape sizes, with and without reduced motion. The scenario covered all four machines, drilling, digging, tipping, travel, assembly, free explore, cameras, overview, reset and help. Every snapshot was identical: state, physics bodies, soil volume, scene graph, DOM, 6,481 per-element computed styles and layouts, and pixel-identical screenshots.
