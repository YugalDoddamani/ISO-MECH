# Operator console and interactive yard

## Keyboard

| Action | Binding |
| --- | --- |
| Boom lower / raise | Hold Q / E |
| Stick fold / reach | Hold W / S |
| Bucket curl / open | Hold A / D |
| Upper-body slew | Hold ← / → |
| Travel forward / reverse | Hold ↑ / ↓ |
| Track steering | Hold J / L (independent of upper-body slew) |
| Brake | Space toggles; B holds momentarily |
| Precision arm motion | Hold Z for 0.25× speed |
| Reset arm | R |
| Dynamics | Shift |
| Arm / travel / assembly | 1 / 2 / 3 |
| Front / left / right / rear / top camera | F1–F5 |
| Auto orbit | O |
| Help / close | ? / Escape |

Multiple joint keys can be held simultaneously. Keycaps are passive hints and turn yellow
while their physical keys are held. The existing substepped animation loop drives motion,
not a separate timer. Key release cancels that joint's outstanding hydraulic target.
Focus in inputs does not operate the machine. Blur, hidden documents, and entering
assembly clear held inputs. Help suspends keyboard operation. Desktop joint tracks support
dragging, a 4° click nudge, and focused left/right keyboard nudges. A first-use coachmark
is dismissed by a recognized shortcut and remembered locally when storage is available.

## Mobile

The canvas and dedicated pad occupy separate regions. Portrait uses 50/50; landscape
uses 70/30 where space permits, with a 216px pad minimum to preserve 64px travel buttons.
The joystick controls boom and slew, with a central 12% dead zone. Bucket and stick have
48px-tall range controls, live angles, and 4° fine-step buttons. Travel and joystick can
be operated together. Pointer cancellation and lost capture release each control.

MORE opens the existing console as an 80dvh scrollable sheet with tabs, machine and yard
resets, dynamics, camera presets, and help. An upward swipe on the empty pad area opens
it, and a downward swipe on the sheet header closes it. Supported browsers are asked to
lock landscape after tapping MORE; unsupported browsers retain their normal orientation.
Safe-area insets and a portrait rotation hint are included. OrbitControls retains pinch
zoom; a stationary canvas long press restores the isometric camera.

## Yard behavior

- Ten safety cones tip and slide away from chassis contact.
- Five separately modeled pipes slide/roll when struck, falling from rack height to ground.
- Bucket contact and moving chassis edges lower nearby stockpile vertices and emit loose
  soil particles. Untouched stockpiles remain unchanged.
- A fixed 96-instance particle pool bounds memory and draw calls.
- Reset Yard restores cone/pipe transforms, soil geometry, and particles independently
  of machine pose and travel.
- Static buildings, foundations, walls, barriers, pile cores, and yard boundaries retain
  their chassis collision guards. Dynamic meshes are excluded from static material baking.
- Assembly mode pauses yard integration as well as operator motion.

These are deliberately lightweight interaction effects, **not** a rigid-body or granular
solver: props do not collide with one another, bucket/boom do not push cones or pipes,
pipe support is approximate, pile cores remain impassable, and soil is not conserved,
carried in the bucket, or deposited elsewhere. Dynamics toggles hydraulic/rocking feel;
yard interactions remain enabled in either setting.

## Scope of the supplied visual spec

This iteration ships the control architecture, dark tokens, keycap feedback, sliders,
mobile gamepad, sheet, help, assembly search, and yard interactions. It does not attempt
all presentation polish: animated number interpolation, noise texture, fully swipeable
tabs, and assembly camera fly-to/marker pulses remain follow-ups. Assembly selection
retains the existing part highlight and markers. Fonts remain local system sans/monospace
so the standalone deliverables stay offline-capable.

## Checks

Serve the repository at port 8000, then run:

```sh
node tests/yard-ui-test.cjs
node tests/site-test.cjs
node tests/assembly-verify.cjs
```

`CHROMIUM_PATH` optionally selects an installed Chromium executable. The focused yard/UI
check exercises deterministic contact substeps, deformation isolation, reset, particle
capacity, static guards, keyboard feedback, blur cleanup, assembly search, help, and
portrait/landscape layout. Rebuild with `python3 scripts/assemble.py` after source edits.
