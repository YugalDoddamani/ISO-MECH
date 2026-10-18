# Browser checks

The scripts in this directory are Playwright browser checks. They expect the repository root to be served at `http://127.0.0.1:8000/`, and save any generated screenshots under the ignored `tests/artifacts/` directory.

## Prerequisites

- Node.js
- Playwright and its Chromium browser
- Python 3 (for the local static server)

Install the test-only browser dependency if it is not already available:

```bash
npm install --no-save playwright
npx playwright install chromium
```

Start the server from the repository root in one terminal:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then run a check from another terminal, for example:

```bash
node tests/yard-ui-test.cjs
node tests/assembly-verify.cjs
node tests/site-test.cjs
node tests/fleet-test.cjs
```

To run every check in sequence:

```bash
for test in tests/yard-ui-test.cjs tests/assembly-test.cjs tests/assembly-verify.cjs tests/check-motion.cjs tests/final-check.cjs tests/interaction-test.cjs tests/motion-test.cjs tests/site-test.cjs tests/fleet-test.cjs tests/test.cjs tests/validation-v2.cjs; do
  node "$test" || break
done
```

The browser checks support `CHROMIUM_PATH`
for a custom installed browser executable. See `docs/operator-ui.md` for the updated key map.
