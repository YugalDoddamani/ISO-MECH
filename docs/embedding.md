# Embedding and hosting

## Host the studio

ISO-MECH is a static site. Publish the repository root, which contains `index.html`, `css/` and `js/`, on any static host; GitHub Pages works as-is. The page loads three.js r128 and cannon-es 0.20.0 from `cdn.jsdelivr.net` with Subresource Integrity, so visitors need access to that CDN. If it is blocked, the loading screen reports that the 3D or physics engine could not start.

No API keys, model downloads or build step are needed. All models and textures are procedural.

## Embed it in another page

Keep the folder structure together and point an iframe at `index.html`:

```html
<iframe
  src="https://yugaldoddamani.github.io/ISO-MECH/"
  title="Interactive IsoMech construction machinery studio"
  sandbox="allow-scripts"
  loading="lazy"
  style="display:block;width:100%;height:min(900px,90vh);min-height:640px;border:0;border-radius:16px"
></iframe>
```

The app works inside `sandbox="allow-scripts"`. The frame gets an opaque origin: the CDN libraries still load (jsDelivr sends permissive CORS headers), and the first-use keyboard coach mark simply is not remembered, because storage is unavailable. Click or tap inside the frame before using keyboard shortcuts.

Since V2 is split into separate files, it is no longer a single self-contained HTML file: an embed must load it by URL (as above), not by inlining the page with `srcdoc`.

## Controls and scope

See the [operator guide](operator-ui.md) for the full key map, mobile layout, fleet, yard behaviour and simulation limits. In short:

- **Camera:** drag, scroll or pinch to orbit and zoom; presets and auto orbit sit in the bottom bar.
- **Machines:** cycle machines and free explore with the switch button. Q/E, W/S, A/D and ←/→ drive the active machine's work functions, ↑/↓ and J/L drive and steer, and Space brakes.
- **Return to parking bay** resets the selected machine's travel and work pose if its bay is clear. **R** resets only the work pose, and **Reset Yard** restores props, soil and bore marks.
- **03 / Assembly** separates the EX–240 into 13 systems; **Reassemble & return** (or Esc) exits.

The yard is a procedural 90 × 68 m site with four fleet bays. Machine motion uses lightweight actuator and drive models stepped at a fixed 60 Hz. Soil is a volume-conserving heightfield, and loose props are cannon-es rigid bodies. These are presentation-grade interactions, not engineering analysis, certified hydraulic behaviour, or geotechnical or drilling physics. The cab interior, engine, pumps, valves and harness in the exploded view are illustrative, not service parts or CAD.

## Editable source

There is no build step: edit the files in `css/` and `js/` directly and reload. [Architecture](architecture.md) explains the module order and the rules that `npm run check` enforces.
