// CDN loading: the pinned libraries load with Subresource Integrity, and every way start-up can fail
// (outage, tampered file, no WebGL) shows a message on the loading screen without follow-on errors.
const assert = require('node:assert/strict');
const { run, BASE_URL, routeVendor } = require('./helpers.cjs');

async function start(browser, { vendor = {}, init } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await routeVendor(context, vendor);
  if (init) await page.addInitScript(init);
  await page.goto(BASE_URL);
  await page.waitForFunction(
    () =>
      window.excavator || /could not|unavailable/.test(document.querySelector('#loading')?.textContent || ''),
    null,
    { timeout: 60000 }
  );
  const result = await page.evaluate(() => ({
    started: !!window.excavator,
    message: document.querySelector('#loading')?.textContent || '',
    cdn: performance
      .getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(name => name.includes('cdn.jsdelivr.net')),
  }));
  await context.close();
  return { ...result, errors };
}

run('cdn', async browser => {
  let r = await start(browser);
  assert.equal(r.started, true);
  assert.deepEqual(r.errors, []);
  for (const file of [
    'three@0.128.0/build/three.min.js',
    'three@0.128.0/examples/js/controls/OrbitControls.js',
    'cannon-es@0.20.0/dist/cannon-es.js',
  ])
    assert(
      r.cdn.some(url => url.endsWith(file)),
      `${file} is loaded from jsDelivr`
    );

  r = await start(browser, { vendor: { block: 'three.min.js' } });
  assert.equal(r.started, false);
  assert.equal(r.message, 'The 3D engine could not start.');
  assert(
    r.errors.every(message => /THREE is not defined/.test(message)),
    `only the vendor OrbitControls script may fail: ${r.errors}`
  );

  r = await start(browser, { vendor: { block: 'cannon-es' } });
  assert.equal(r.message, 'The physics engine could not start.');
  assert.deepEqual(r.errors, []);

  r = await start(browser, { vendor: { tamper: 'three.min.js' } });
  assert.equal(
    r.message,
    'The 3D engine could not start.',
    'a modified three.js is rejected by its integrity hash'
  );

  r = await start(browser, { vendor: { tamper: 'cannon-es' } });
  assert.equal(
    r.message,
    'The physics engine could not start.',
    'a modified cannon-es is rejected by the modulepreload hash'
  );

  r = await start(browser, {
    init: () => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : getContext.call(this, type, ...rest);
      };
    },
  });
  assert.equal(r.message, 'WebGL is unavailable. Try a browser with hardware acceleration.');
  assert.deepEqual(r.errors, []);
});
