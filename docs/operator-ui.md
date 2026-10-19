# Operator guide

## Machines and modes

The switch button (top left) cycles **PR–180 → EX–240 → crawler dozer → off-highway dumper → free explore**. After you leave free explore, the next press skips it once and continues with the machines. Each machine has a marked bay on the east-side fleet apron. Parked machines stay where you left them and keep their heading and travel distance. Switching is refused while the excavator assembly is open, or if the incoming machine's parked position is blocked.

The console's first tab is the machine's work tab (**01 / DRILL**, **01 / ARM**, **01 / BLADE** or **01 / DUMP BODY**), followed by **02 / TRAVEL** and **03 / ASSEMBLY** (EX–240 only).

**▶ WORK MODE** (next to the switch button) hands the whole site to an autonomous crew; see [Work mode](#work-mode).

## Keyboard

| Action | Binding |
| --- | --- |
| **EX–240** boom lower / raise · stick fold / reach · bucket curl / open · upper-body slew | Hold Q / E · W / S · A / D · ← / → |
| **PR–180** mast rake · rotary-head feed · Kelly retract / extend · body slew | Hold Q / E · W / S · A / D · ← / → |
| **Dozer** blade lift · blade angle | Hold Q / E · A / D |
| **Dumper** lower / raise the tipping body | Hold Q / E |
| Travel forward / reverse | Hold ↑ / ↓ |
| Track steering (independent of upper-body slew) | Hold J / L |
| Brake | Space toggles; B holds momentarily |
| Precision (quarter-speed machine motion) | Hold Z |
| Reset the active work pose | R |
| Dynamics on / off (outside free explore) | Shift |
| Work / travel / assembly tab | 1 / 2 / 3 |
| Front / left / right / rear / top camera | F1–F5 |
| Auto orbit | O |
| Help / close · leave free explore, assembly or work mode | ? / Escape |
| Sound on / off | M |

**Free explore:** W / S move forward and back, A / D move sideways, Q / E descend and rise, hold Shift to move faster, and drag to look. No machine is controlled; press Esc or the switch button to return to the parked machine.

**Work mode:** no machine is under operator control. F1–F5, O and dragging still move the camera; Esc stops work mode.

Multiple keys can be held at once. Keycaps in the console are passive hints that turn yellow while their physical keys are held. Releasing a joint key cancels that joint's outstanding hydraulic target. Focus in inputs does not operate the machine. Blurring the window, hiding the document and entering assembly clear held inputs, and the help dialog suspends keyboard operation. Desktop joint tracks support dragging, a 4° click nudge, and left/right arrow nudges when focused. A first-use coach mark is dismissed by a recognised shortcut and remembered locally when storage is available.

## Mobile

On phones, the canvas and a dedicated gamepad occupy separate regions: 50/50 in portrait, and 70/30 in landscape where space permits (the pad is never narrower than 216 px, which keeps the 64 px travel buttons). The joystick operates **boom / slew** on the EX–240, **mast / slew** on the PR–180, **blade / angle** on the dozer and the **dump body** on the dumper, with a central 12% dead zone. Machine-specific sliders sit beside it: bucket and stick (with 4° step buttons), rotary head and Kelly, blade lift and angle, or the dump body; only the selected machine's sliders are shown. The PR–180 adds an auger button. The travel pad and joystick can be used together. Pointer cancellation and lost capture release each control. In work mode the pad shows the crew list instead, with follow, site and stop buttons.

**MORE** opens the full console as a scrollable 80dvh sheet with tabs, resets, dynamics, camera presets and help. An upward swipe on the empty pad area opens it, and a downward swipe on the sheet header closes it. After you tap MORE, supported browsers are asked to lock landscape orientation (usually honoured only in full screen); others keep their normal orientation. Safe-area insets and a portrait rotation hint are included. OrbitControls keeps pinch zoom, and a stationary long press on the canvas restores the isometric camera.

## Fleet, travel and the site plan

The site opens in a bird's-eye overview of the **90 × 68 m** yard, with all four machines in their bays (in apron order: EX–240, PR–180, dozer, dumper). The live site plan shows the active machine (or the free explorer) and the parked machines, and toggles between the overview and the follow camera.

Tracked machines steer differentially; the dumper steers its front wheels. Travel follows the undercarriage heading, not the upper body's slew. Machines pitch and roll with the terrain, slow down on soft soil and slopes, and leave track or tyre impressions (**Clear track marks** removes them). Oriented chassis footprints keep each machine inside the fence and away from buildings, foundations, walls, pile cores and the other machines. **Return to parking bay** returns the selected machine to its bay and resets its travel distance, heading and work pose. It is refused while the bay is occupied.

## Yard behaviour

- **Props:** ten safety cones and four fuel drums tip and slide on contact, and five loose steel pipes roll when pushed. These are cannon-es rigid bodies pushed by the machine envelopes.
- **Soil:** a 0.5 m heightfield that conserves material volume. The excavator bucket cuts and carries soil (shown as a payload in the bucket) and dumps it when the bucket is opened past 128°. Slopes relax towards the angle of repose, and tracks and tyres compact the ground they cross. Moved soil is tinted like a gentle cut-and-fill map: placed fill is a darker brown, dug faces a warmer brown, and freshly moved, loose soil a little darker again.
- **Loading the dumper:** park the dumper alongside the EX–240 (the body within the arm's reach) and switch to the excavator. Fill the bucket, swing it over the dump body and open it (hold D): the load pours into the body instead of onto the ground. The body holds **3.28 m³, four bucket passes**, and starts part-loaded with 0.82 m³; the payload is shown in the dump-body console and as a mound that grows in the body. Over a full body the rest stays in the bucket.
- **Dozing:** drive the dozer forward with the blade lowered and its cutting edge pushes loose soil ahead of it. A berm builds in front of the blade, low ground it passes over is filled to the edge height, and raising the blade leaves the berm behind. Angling the blade moves soil towards its trailing end. The blade does not cut into native ground.
- **Drilling:** a spinning PR–180 auger lowered to the ground, with the machine stationary, bores a shallow mark (up to 3 m) through layered soil: topsoil, compacted fill, dense clay, then weathered gravel. Spoil is placed beside the bore. Drilling only progresses while the mast is within its vertical tolerance; penetration slows in harder layers, where the auger can stall. Up to eight bore marks are kept.
- **Dumper:** sustained tipping releases its load behind the tailgate (a bigger load spreads wider). Lowered and loaded again, the body is ready for the next tip. **Reset dump body** or Return to parking bay recovers the last released load, without changing what the body already carries.
- **Effects:** exhaust smoke, travel and impact dust, and drilling and dumping dust come from fixed particle pools (128 dust, 72 smoke and 96 soil particles).
- **Reset Yard** restores props, soil and bore marks without touching the machines. Assembly mode pauses yard simulation as well as operator motion.

These are deliberately lightweight, presentation-oriented interactions, **not** an engineering, geotechnical or drilling simulation. The arm and boom do not collide with props, there is no full boom-to-obstacle collision, and Dynamics only changes hydraulic lag, settling and body response.

## Work mode

**▶ WORK MODE** turns the yard into a working site. The operated machine joins the crew, every machine moves to its station, and the camera switches to the bird's-eye overview:

| Machine | Job |
| --- | --- |
| **EX–240** | Digs the earth stockpile from its east side, choosing the richest line across the face, and loads the dumper pass by pass |
| **Dumper** | Waits under the excavator until it is full, reverses down the haul lane (with its alarm) to the fill pad, tips, and drives back |
| **Dozer** | Waits beside the pad; after each load it drives behind the heap, spreads it with a grade-controlled blade pass, backs up and trims the pad, then clears the lane |
| **PR–180** | Bores a staggered pile grid beside its bay: travels, slews the mast over each mark, spins the auger down through the soil layers and extracts it |

The console shows the shift, elapsed time, loads hauled, soil moved and piles bored, and each machine's current task. Select a machine to follow it (each has a camera angle that looks over the PR–180 mast), or **↗ WHOLE SITE** for the overview. On phones the same crew list replaces the gamepad.

The haul lane and fill pad are shared by the dumper and the dozer, which take turns through a single reservation, and every move is also checked against the site's footprint collision. Everything runs on the same fixed-step soil model as manual play, so material volume is conserved and a run repeats exactly. When the reachable part of the stockpile has been moved (two or three loads), the shift ends: the yard is restocked and the next shift starts.

**■ STOP WORK MODE** (or Esc) leaves each machine where it is, lowers the dump body, stops the auger and hands control back to the machine you were operating. Work mode is refused while the excavator assembly is open, and the switch button is hidden while it runs.

## Sound

Engines, hydraulics and soil are synthesised live with the Web Audio API; there are no sound files. Each machine has a diesel voice whose revs and load follow what it is doing (hydraulic demand, travel, auger torque, blade load), plus hydraulic whine, track clatter or tyre rumble and the reversing alarm. Digging, loading the dump body, tipping, auger stalls and props being hit have their own cues. Sources are panned and get quieter with distance from what the camera is looking at, so the site overview is a distant hum and a followed machine is close up. In normal play only the operated machine's engine runs; in work mode every machine does.

Browsers allow audio only after a user gesture, so sound starts with your first click or key press. **SOUND** in the top bar or **M** mutes it; the choice is remembered when storage is available.

## Exploded assembly (EX–240)

**03 / ASSEMBLY** separates the excavator into 13 numbered systems: cab and interior, body and counterweight, engine and pumps, reservoir and valves, main boom, stick, bucket and linkage, hydraulic rams, slewing bearing, both crawlers, main chassis and electrical harness. Use the separation slider or **Explode systems**, then select a numbered marker, a row in the system index (with search), or the model itself to read a system's role. **Reassemble & return** (or Esc) restores the previous pose and camera. The cab interior, engine, pumps, valves and harness are illustrative, not service parts or CAD.

## Checks

See [tests/README.md](../tests/README.md). `npm test` runs the unit tests and the browser checks covering start-up, the CDN and failure messages, vehicle switching, travel, the excavator and assembly, the yard and soil (including loading the dumper and dozing), work mode, sound, and the interface on desktop and phone layouts.
