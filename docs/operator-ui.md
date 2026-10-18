# Operator guide

## Machines and modes

The switch button (top left) cycles **PR–180 → EX–240 → crawler dozer → off-highway dumper → free explore**. After you leave free explore, the next press skips it once and continues with the machines. Each machine has a marked bay on the east-side fleet apron. Parked machines stay where you left them and keep their heading and travel distance. Switching is refused while the excavator assembly is open, or if the incoming machine's parked position is blocked.

The console's first tab is the machine's work tab (**01 / DRILL**, **01 / ARM**, **01 / BLADE** or **01 / DUMP BODY**), followed by **02 / TRAVEL** and **03 / ASSEMBLY** (EX–240 only).

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
| Help / close · leave free explore or assembly | ? / Escape |

**Free explore:** W / S move forward and back, A / D move sideways, Q / E descend and rise, hold Shift to move faster, and drag to look. No machine is controlled; press Esc or the switch button to return to the parked machine.

Multiple keys can be held at once. Keycaps in the console are passive hints that turn yellow while their physical keys are held. Releasing a joint key cancels that joint's outstanding hydraulic target. Focus in inputs does not operate the machine. Blurring the window, hiding the document and entering assembly clear held inputs, and the help dialog suspends keyboard operation. Desktop joint tracks support dragging, a 4° click nudge, and left/right arrow nudges when focused. A first-use coach mark is dismissed by a recognised shortcut and remembered locally when storage is available.

## Mobile

On phones, the canvas and a dedicated gamepad occupy separate regions: 50/50 in portrait, and 70/30 in landscape where space permits (the pad is never narrower than 216 px, which keeps the 64 px travel buttons). The joystick operates **boom / slew** on the EX–240, **mast / slew** on the PR–180, **blade / angle** on the dozer and the **dump body** on the dumper, with a central 12% dead zone. Machine-specific sliders sit beside it: bucket and stick (with 4° step buttons), rotary head and Kelly, blade lift and angle, or the dump body. The PR–180 adds an auger button. The travel pad and joystick can be used together. Pointer cancellation and lost capture release each control.

**MORE** opens the full console as a scrollable 80dvh sheet with tabs, resets, dynamics, camera presets and help. An upward swipe on the empty pad area opens it, and a downward swipe on the sheet header closes it. After you tap MORE, supported browsers are asked to lock landscape orientation (usually honoured only in full screen); others keep their normal orientation. Safe-area insets and a portrait rotation hint are included. OrbitControls keeps pinch zoom, and a stationary long press on the canvas restores the isometric camera.

## Fleet, travel and the site plan

The site opens in a bird's-eye overview of the **90 × 68 m** yard, with all four machines in their bays (in apron order: EX–240, PR–180, dozer, dumper). The live site plan shows the active machine (or the free explorer) and the parked machines, and toggles between the overview and the follow camera.

Tracked machines steer differentially; the dumper steers its front wheels. Travel follows the undercarriage heading, not the upper body's slew. Machines pitch and roll with the terrain, slow down on soft soil and slopes, and leave track or tyre impressions (**Clear track marks** removes them). Oriented chassis footprints keep each machine inside the fence and away from buildings, foundations, walls, pile cores and the other machines. **Return to parking bay** returns the selected machine to its bay and resets its travel distance, heading and work pose. It is refused while the bay is occupied.

## Yard behaviour

- **Props:** ten safety cones and four fuel drums tip and slide on contact, and five loose steel pipes roll when pushed. These are cannon-es rigid bodies pushed by the machine envelopes.
- **Soil:** a 0.5 m heightfield that conserves material volume. The excavator bucket cuts and carries soil (shown as a payload in the bucket) and dumps it when the bucket is opened. Slopes relax towards the angle of repose, and tracks and tyres compact the ground they cross.
- **Drilling:** a spinning PR–180 auger lowered to the ground, with the machine stationary, bores a shallow mark (up to 3 m) through layered soil: topsoil, compacted fill, dense clay, then weathered gravel. Spoil is placed beside the bore. Drilling only progresses while the mast is within its vertical tolerance; penetration slows in harder layers, where the auger can stall. Up to eight bore marks are kept.
- **Dumper:** sustained tipping releases its load onto the ground; **Reset dump body** or Return to parking bay recovers it.
- **Effects:** exhaust smoke, travel and impact dust, and drilling and dumping dust come from fixed particle pools (128 dust, 72 smoke and 96 soil particles).
- **Reset Yard** restores props, soil and bore marks without touching the machines. Assembly mode pauses yard simulation as well as operator motion.

These are deliberately lightweight, presentation-oriented interactions, **not** an engineering, geotechnical or drilling simulation. The arm and boom do not collide with props, there is no full boom-to-obstacle collision, and Dynamics only changes hydraulic lag, settling and body response.

## Exploded assembly (EX–240)

**03 / ASSEMBLY** separates the excavator into 13 numbered systems: cab and interior, body and counterweight, engine and pumps, reservoir and valves, main boom, stick, bucket and linkage, hydraulic rams, slewing bearing, both crawlers, main chassis and electrical harness. Use the separation slider or **Explode systems**, then select a numbered marker, a row in the system index (with search), or the model itself to read a system's role. **Reassemble & return** (or Esc) restores the previous pose and camera. The cab interior, engine, pumps, valves and harness are illustrative, not service parts or CAD.

## Checks

See [tests/README.md](../tests/README.md). `npm test` runs the unit tests and the browser checks covering start-up, the CDN and failure messages, vehicle switching, travel, the excavator and assembly, the yard and soil, and the interface on desktop and phone layouts.
