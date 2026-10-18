// Start-up: libraries, factories, the four machines, the yard, first render, desktop + phone screenshots.
const assert = require('node:assert/strict');
const { run, openApp, artifact } = require('./helpers.cjs');

run('smoke', async browser => {
  const { page, errors, advance } = await openApp(browser);
  await advance(1200);
  const info = await page.evaluate(() => ({
    three: THREE.REVISION,
    orbitControls: typeof THREE.OrbitControls,
    cannon: typeof CANNON.World,
    factories: [
      'createPileRig',
      'createBulldozer',
      'createDumper',
      'createSoilSimulation',
      'createYardPhysics',
      'createFixedStepper',
    ].filter(name => typeof window[name] !== 'function'),
    loadingRemoved: !document.querySelector('#loading'),
    canvas: !!document.querySelector('#stage canvas'),
    active: excavator.activeVehicle,
    vehicles: Object.keys(excavator.fleet.vehicles).sort(),
    bounds: excavator.site.bounds,
    overview: excavator.site.overview,
    bodyClass: document.body.className,
    drawCalls: excavator.renderer.info.render.calls,
    poseValid: excavator.poseValid(),
    soil: excavator.yard.materialVolume(),
  }));
  console.log(info);
  assert.equal(info.three, '128');
  assert.equal(info.orbitControls, 'function');
  assert.equal(info.cannon, 'function');
  assert.deepEqual(info.factories, [], 'every window.create* factory is defined');
  assert(info.loadingRemoved && info.canvas, 'first frame rendered and loading screen removed');
  assert.equal(info.active, 'drill');
  assert.deepEqual(info.vehicles, ['dozer', 'drill', 'dumper', 'excavator']);
  assert.equal(info.bounds.width, 90);
  assert.equal(info.bounds.depth, 68);
  assert.equal(info.overview, true);
  assert.equal(info.bodyClass, 'site-overview drill-mode');
  assert(info.drawCalls > 50, 'the yard and machines are drawn');
  assert(info.poseValid);
  assert(Math.abs(info.soil - 31.639286) < 1e-5, `initial soil volume ${info.soil}`);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: artifact('smoke-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await advance(600);
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.querySelector('#mobileGamepad')).display),
    'grid'
  );
  await page.screenshot({ path: artifact('smoke-mobile.png') });
  assert.deepEqual(errors, []);
});
