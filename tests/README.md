# Tests

```bash
npm install
npx playwright install chromium   # once, unless CHROMIUM_PATH points at an installed Chromium
npm test                          # unit tests + every browser check
```

`npm test` starts a local static server on a free port and runs the following:

| Check | Covers |
| --- | --- |
| `unit/*.test.cjs` | Node unit tests for the fixed-step accumulator and the volume-conserving soil model (digging, dumping, drilling, unloading the bucket, blade pushing); no browser needed (`npm run test:unit`) |
| `smoke.cjs` | Libraries and factories load, the four machines and the 90 × 68 m yard exist, the first frame renders, desktop and phone layouts |
| `cdn.cjs` | three.js, OrbitControls and cannon-es come from jsDelivr; outages, tampered files (Subresource Integrity) and missing WebGL show the right loading-screen message without follow-on errors |
| `vehicles.cjs` | The switch-button cycle, parking bays, free explore and Esc, and refusing to switch during assembly |
| `travel.cjs` | Hold-to-drive, differential steering, the yard fence and Return to parking bay |
| `excavator.cjs` | Guarded poses, keyboard hydraulics, Reset Machine Pose and the exploded assembly |
| `yard.cjs` | Drilling, dumper tipping, load recovery, Reset Yard, the EX–240 loading a parked dumper and the dozer blade pushing soil, all with conserved soil volume |
| `work.cjs` | Work mode: the crew loads, hauls, tips, spreads and bores for four simulated minutes with no overlapping footprints and conserved volume; follow and overview buttons; Esc hands back the operated machine; refused during assembly |
| `audio.cjs` | Site audio: silent until a gesture, engine voices for the operated machine or the whole crew, the followed machine loudest, an audible signal, and M / the SOUND button muting with the choice kept across a reload |
| `interface.cjs` | Help, the site-plan toggle, camera presets, auto orbit, keycap feedback and the phone gamepad and sheet |

Run selected browser checks with `node tests/run.cjs smoke travel`, or run one directly against a server you started yourself: `BASE_URL=http://127.0.0.1:8000/ node tests/travel.cjs`. Screenshots are written to the ignored `tests/artifacts/` directory.

## How the checks stay deterministic

- **Virtual clock.** The helpers in `helpers.cjs` replace `performance.now`, `requestAnimationFrame` and `setTimeout` before the page loads, so simulated time only advances when a check calls `advance(ms)`. Results do not depend on the machine's speed. Intermediate frames update world matrices but skip drawing, which keeps software-rendered CI fast.
- **Pinned libraries.** The jsDelivr URLs are answered from the pinned `three` and `cannon-es` packages in `node_modules`. These are byte-identical to the CDN files, so the browser still verifies the integrity hashes. Set `ISO_MECH_USE_CDN=1` to use the real CDN instead.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Use an existing server instead of starting one |
| `CHROMIUM_PATH` | Chromium executable to launch |
| `CHROMIUM_ARGS` | Extra space-separated Chromium flags, e.g. `--use-gl=angle --use-angle=swiftshader` for software WebGL |
| `ISO_MECH_USE_CDN` | `1` loads libraries from jsDelivr instead of `node_modules` |

`npm run check` complements the tests with static checks: the `index.html` manifest, load order between modules, and the CDN integrity hashes.
