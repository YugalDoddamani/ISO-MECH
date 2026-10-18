const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const artifactDirectory = path.join(__dirname, 'artifacts');
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8000/';

fs.mkdirSync(artifactDirectory, { recursive: true });

function artifact(name) {
  return path.join(artifactDirectory, name);
}

function projectFile(name) {
  return path.join(repoRoot, name);
}

function fileUrl(name) {
  return pathToFileURL(projectFile(name)).href;
}

/** Launches Chromium. CHROMIUM_PATH selects a browser binary; CHROMIUM_ARGS adds space-separated flags. */
function launch(chromium) {
  const extra = (process.env.CHROMIUM_ARGS || '').split(/\s+/).filter(Boolean);
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader', ...extra],
  });
}

// index.html loads three.js and cannon-es from jsDelivr. Unless ISO_MECH_USE_CDN=1, those exact URLs are
// answered from the pinned npm copies in node_modules. The files are byte-identical to the CDN copies, so
// the Subresource Integrity hashes in index.html are still enforced by the browser.
const CDN_URL = /^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.+)$/;

function vendorFile(url) {
  const match = url.match(CDN_URL);
  if (!match) return null;
  const [, pkg, version, file] = match;
  const dir = path.join(repoRoot, 'node_modules', pkg);
  try {
    if (JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version !== version) return null;
    return fs.readFileSync(path.join(dir, file));
  } catch {
    return null;
  }
}

async function routeVendor(target, { block = null, tamper = null } = {}) {
  if (process.env.ISO_MECH_USE_CDN === '1' && !block && !tamper) return;
  await target.route(CDN_URL, route => {
    const url = route.request().url();
    if (block && url.includes(block)) return route.abort();
    let body = vendorFile(url);
    if (!body) return route.continue();
    if (tamper && url.includes(tamper)) body = Buffer.concat([body, Buffer.from('\n// modified')]);
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/javascript; charset=utf-8', 'access-control-allow-origin': '*' },
      body,
    });
  });
}

// Virtual time: performance.now(), requestAnimationFrame and setTimeout only advance when a test calls
// advance(ms), so simulation results are deterministic. CSS transitions still run on real time.
const VIRTUAL_CLOCK = `(() => {
  let now = 0, timerId = 1;
  const frames = [], timers = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (callback, ms = 0, ...args) => {
    const id = timerId++;
    timers.set(id, { at: now + (Number(ms) || 0), callback, args });
    return id;
  };
  window.clearTimeout = id => { timers.delete(id); };
  window.__isoMechClock = {
    advance(ms, step = 1000 / 60) {
      const end = now + ms;
      while (now < end - 1e-9) {
        now = Math.min(end, now + step);
        for (const [id, t] of [...timers].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])) {
          if (t.at <= now && timers.has(id)) { timers.delete(id); if (typeof t.callback === 'function') t.callback(...t.args); }
        }
        for (const callback of frames.splice(0)) callback(now);
      }
    },
  };
})();`;

async function waitFor(page, predicate, timeout = 60000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(predicate)) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`Timed out waiting for ${predicate}`);
}

/**
 * Opens the app and waits for window.excavator. With the virtual clock (default), advance(ms) runs the
 * app's frame loop for that much simulated time; intermediate frames update world matrices exactly as
 * render() would but only the final frame is drawn, which keeps software-rendered CI fast.
 */
async function openApp(
  browser,
  {
    url = BASE_URL,
    viewport = { width: 1440, height: 960 },
    virtualClock = true,
    vendor = {},
    ...contextOptions
  } = {}
) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`page error: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
  });
  await routeVendor(context, vendor);
  if (virtualClock) await page.addInitScript(VIRTUAL_CLOCK);
  await page.goto(url);
  await waitFor(page, () => !!window.excavator);
  if (virtualClock) {
    await page.evaluate(() => {
      const renderer = window.excavator.renderer;
      const draw = renderer.render.bind(renderer);
      window.__isoMechDraw = true;
      renderer.render = (scene, camera) => {
        if (window.__isoMechDraw) return draw(scene, camera);
        if (scene.autoUpdate === true) scene.updateMatrixWorld();
        if (camera.parent === null) camera.updateMatrixWorld();
      };
    });
  }
  const advance = ms =>
    page.evaluate(ms => {
      const step = 1000 / 60;
      window.__isoMechDraw = false;
      if (ms > step) window.__isoMechClock.advance(ms - step);
      window.__isoMechDraw = true;
      window.__isoMechClock.advance(Math.min(ms, step));
    }, ms);
  const click = selector => page.evaluate(selector => document.querySelector(selector).click(), selector);
  const hold = async (key, ms) => {
    await page.keyboard.down(key);
    await advance(ms);
    await page.keyboard.up(key);
  };
  return { page, context, errors, advance, click, hold };
}

/** Runs an async test body with a browser, closing it afterwards and exiting non-zero on failure. */
function run(name, body) {
  const { chromium } = require('playwright');
  (async () => {
    const browser = await launch(chromium);
    try {
      await body(browser);
      console.log(`✓ ${name}`);
    } finally {
      await browser.close();
    }
  })().catch(error => {
    console.error(`✗ ${name}\n`, error);
    process.exit(1);
  });
}

module.exports = { BASE_URL, artifact, projectFile, fileUrl, launch, routeVendor, openApp, waitFor, run };
