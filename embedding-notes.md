# Excavator component — embedding

Upload `excavator.html` alongside your construction-company demo page. It is self-contained: the model, Three.js, styles, controls, and textures are embedded. No build step, model downloads, or API keys are needed.

```html
<section aria-label="Explore our excavator">
  <iframe
    src="./excavator.html"
    title="Interactive excavator — arm and travel controls"
    sandbox="allow-scripts"
    loading="lazy"
    style="display:block;width:100%;height: min(900px, 90vh);min-height:640px;border:0;border-radius:16px;"
  ></iframe>
</section>
```

## Controls
- Drag / scroll / pinch: orbit and zoom.
- Arm: hold the on-screen arrows, or select a joint and use arrow keys.
- Travel: hold Forward / Reverse, or W / S. Release to decelerate.
- A / D or Left / Right: differential track steering, including pivot turns.
- Space or Brake: stronger braking. Space also pauses the arm demo when not travelling.
- Return to start: reset travel position, heading, track phase, and arm pose.
- R / Reset machine pose: reset the arm only.
- Dynamics: toggle hydraulic settling and secondary body motion. Defaults off for reduced-motion preferences.

Click or tap inside the iframe before using keyboard shortcuts. Travel follows the undercarriage's heading, not the upper body's slew angle. The camera follows translation, while orbit remains available.

## Construction site
The original circular display platform is now a self-contained, procedural 46 × 34 metre construction yard. Its muted low-poly surfaces and props match the excavator. The yard includes dirt access lanes, survey markings, foundations, material stacks, stockpiles, safety barriers, fencing and a site office.

- The **Site plan** button on the stage, or **Site overview** in Travel controls, switches between the full yard and following the excavator. Driving also works in overview mode.
- The live plan shows position and undercarriage heading.
- Travel leaves world-space track impressions. **Clear track marks** removes them; returning the machine to its start does not erase them.
- Basic planar chassis-clearance checks stop travel at obstacles and the perimeter. Reverse or steer away after a stop.
- The yard is flat and drivable. Surface texture and track impressions are visual; there is no soil deformation, excavation, suspension-terrain solver, or full boom/obstacle collision system.
- All textures are generated in code. No external images, terrain models, or network calls are needed.

The earlier assembly edition is preserved in `previous-assembly-version/excavator.html`.

## Assembly / exploded view
- Open **03 / Assembly** to smoothly separate 13 major systems.
- Use **Separation** (0–100%) or the Explode / Reassemble button.
- Select an index entry, a numbered marker, or a visible component to highlight its system and read its description.
- Toggle **Part labels** and **Guide lines** independently.
- **Reassemble & return**, **Esc**, or switching back to Arm / Travel restores the previous arm pose. Position and heading are preserved. Travel remains stopped until new input; a previous arm demo does not resume automatically.
- Arm and track commands are locked throughout inspection, including when the separation slider is at 0%.

The new cab interior, engine/pumps, reservoir/valves and electrical harness are illustrative system-level models inspired by the supplied reference—not exact service parts, a certified bill of materials, or engineering CAD.

The pre-assembly, drivable version is preserved at `previous-motion-version/excavator.html`.

## Motion model
A lightweight damped-actuator model supplies startup lag, slight overshoot/settling, and joint-limit stops. Track travel uses acceleration, deceleration, stronger braking, and differential steering. Track shoes and roller rotation are tied to signed travel distance. Small load-response rocking is cosmetic and disabled at low bucket clearance.

This is an interactive presentation component, not an engineering-grade rigid-body/hydraulic simulator. It does not simulate soil excavation, uneven-terrain contact, or full articulated-machine/obstacle collisions. The yard occupies ±23 metres in X and ±17 metres in Z. Chassis clearance keeps the machine inside the fence and clear of the modeled obstacles.

## Editable source
`excavator-app.js` holds the model, interactions, and dynamics. `page-shell.html` holds the UI and styles. Run `python assemble.py` to rebuild the self-contained `excavator.html` and the live-preview `index.html` after source changes.

The original stationary version is preserved in `previous-version/excavator.html`.
