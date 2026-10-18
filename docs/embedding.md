# Embedding and simulation scope

## Embed the standalone model

`excavator.html` contains the app, vendored Three.js libraries, styles, and procedural textures. It can be hosted as a single static file or embedded in another page:

```html
<iframe
  src="./excavator.html"
  title="Interactive EX–240 excavator"
  sandbox="allow-scripts"
  loading="lazy"
  style="display:block;width:100%;height:min(900px,90vh);min-height:640px;border:0;border-radius:16px"
></iframe>
```

No external models, image assets, API keys, or network requests are required at runtime.

## Controls

- Drag / scroll / pinch: orbit and zoom.
- Arm: hold Q/E for boom, W/S for stick, A/D for bucket, and ←/→ for slew. On mobile use the joystick and sliders.
- Travel: hold **↑ / ↓** to move and **J / L** to steer; release to decelerate. **Space** toggles the brake; **B** holds it temporarily.
- **Return to start** resets the travel position, heading, track phase, and arm pose. **R** resets the arm only.
- Switch to **03 / Assembly** to separate the machine systems. Use the slider, select a numbered marker or system index, and choose **Reassemble & return** (or press **Esc**) to exit.

Click or tap inside an embedded frame before using keyboard shortcuts. Travel follows the undercarriage heading, not the upper body's slew angle.

## Modeling notes and limits

- The construction yard is procedural, approximately **46 × 34 metres**, and includes access lanes, survey markings, foundations, material stacks, stockpiles, barriers, fencing, and an office.
- A live site plan and chassis-footprint checks keep the tracked base within the yard and away from modeled obstacles. The yard is flat; track marks are visual. Cones tip, loose pipes move, and stockpiles deform locally with particles. There is no uneven-terrain solver, soil conservation, prop-to-prop solver, or full boom-to-obstacle collision system. See [interaction scope](operator-ui.md).
- The arm uses a lightweight damped-actuator model for startup lag, settling, and joint limits. It is intended for interactive presentation, not engineering analysis or certified hydraulic behavior.
- The exploded view contains 13 system-level assemblies. The cab interior, engine/pumps, reservoir/valves, and electrical harness are illustrative models—not exact service parts, a bill of materials, or engineering CAD.

## Editable source

`excavator-app.js` contains the model, interactions, camera, and dynamics. `page-shell.html` contains the UI and styles. Run `python3 scripts/assemble.py` to regenerate `index.html` and the self-contained `excavator.html`.

An earlier assembly build is kept in [`previous-assembly-version/`](../previous-assembly-version/).
