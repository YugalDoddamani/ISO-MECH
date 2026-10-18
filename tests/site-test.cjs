const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { artifact } = require('./helpers.cjs');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('ERROR', error.message);
  });

  try {
    await page.goto('http://127.0.0.1:8000/');
    await page.waitForFunction(() => window.excavator);
    await page.waitForTimeout(900);
    const initial = await page.evaluate(() => ({
      active: excavator.activeVehicle,
      overview: excavator.site.overview,
      bounds: excavator.site.bounds,
      viewWidth: excavator.camera.right - excavator.camera.left,
      bothVisible: excavator.machine.visible && excavator.pileRig.root.visible,
      carriers: {
        excavator: excavator.fleet.vehicles.excavator.carrier.position.toArray(),
        drill: excavator.fleet.vehicles.drill.carrier.position.toArray(),
      },
      parents: {
        excavatorParked: excavator.machine.parent === excavator.fleet.vehicles.excavator.carrier,
        drillActive: excavator.pileRig.root.parent === excavator.groups.driveRoot,
      },
    }));
    console.log('initial fleet overview', initial);
    assert.equal(initial.active, 'drill');
    assert.equal(initial.overview, true);
    assert.deepEqual(initial.bounds, { width: 90, depth: 68, halfWidth: 45, halfDepth: 34 });
    assert(initial.viewWidth >= 90);
    assert(initial.bothVisible);
    assert(initial.parents.excavatorParked && initial.parents.drillActive);
    assert.equal(await page.locator('#siteMapToggle').getAttribute('aria-pressed'), 'true');
    await page.screenshot({ path: artifact('site-overview.png') });

    // Follow the active rig, select the excavator, and verify its track impressions.
    await page.locator('#siteMapToggle').click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => excavator.switchVehicle('excavator'));
    await page.evaluate(() => {
      excavator.renderer.setPixelRatio(.4);
      excavator.renderer.shadowMap.enabled = false;
    });
    await page.locator('#travelTab').click();
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(5200);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(800);
    const moving = await page.evaluate(() => ({
      x: excavator.groups.driveRoot.position.x,
      marks: excavator.trailMesh.count,
      distance: excavator.drive.distance,
      phase: excavator.trackSystems.map(track => track.phase),
    }));
    console.log('moving', moving);
    assert(moving.x > 28.5);
    assert(moving.marks > 8);
    assert(Math.abs(moving.x - 28 - moving.distance) < .05);
    assert(moving.phase.every(value => value > 0));
    await page.evaluate(() => {
      excavator.renderer.setPixelRatio(1);
      excavator.renderer.shadowMap.enabled = true;
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: artifact('site-travel.png') });
    await page.locator('#clearTracks').click();
    assert.equal(await page.evaluate(() => excavator.trailMesh.count), 0);

    // The expanded perimeter and existing pile cores still stop the chassis.
    await page.evaluate(() => {
      excavator.renderer.setPixelRatio(.4);
      excavator.renderer.shadowMap.enabled = false;
      excavator.groups.driveRoot.position.set(41.7, 0, 0);
      excavator.drive.heading = 0;
      excavator.groups.driveRoot.rotation.y = 0;
      excavator.drive.left = excavator.drive.right = 0;
    });
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1600);
    await page.keyboard.up('ArrowUp');
    const limit = await page.evaluate(() => ({
      x: excavator.groups.driveRoot.position.x,
      velocity: excavator.drive.left,
      boundary: excavator.siteCollision(44, 0, 0),
      pile: excavator.siteCollision(11.5, -9.2, 0),
    }));
    console.log('boundary', limit);
    assert(limit.x < 42.4);
    assert.equal(limit.velocity, 0);
    assert.equal(limit.boundary, 'Site boundary');
    assert.equal(limit.pile, 'earth stockpile');

    await page.locator('#homeDrive').click();
    const home = await page.evaluate(() => ({
      position: excavator.groups.driveRoot.position.toArray(),
      heading: excavator.drive.heading,
      distance: excavator.drive.distance,
    }));
    assert.deepEqual(home.position, [28, 0, -8]);
    assert.equal(home.heading, 0);
    assert.equal(home.distance, 0);

    // Overview remains usable on a machine-specific bay and closes cleanly for assembly.
    await page.locator('#siteMapToggle').click();
    await page.waitForTimeout(1800);
    await page.locator('#assemblyTab').click();
    await page.waitForTimeout(2200);
    assert.equal(await page.evaluate(() => excavator.site.overview), false);
    assert.equal(await page.evaluate(() => excavator.assembly.value), 1);
    await page.locator('#assemblyDone').click();
    await page.waitForTimeout(1800);
    assert(await page.evaluate(() => excavator.poseValid()));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#moreControls').click();
    await page.locator('#travelTab').click();
    await page.locator('#travelMapButton').click();
    await page.evaluate(() => {
      excavator.renderer.setPixelRatio(.4);
      excavator.renderer.shadowMap.enabled = false;
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: artifact('site-mobile-map.png') });
    const mobile = await page.evaluate(() => ({
      map: document.querySelector('#siteMapToggle').getBoundingClientRect().toJSON(),
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    console.log('mobile map', mobile);
    assert(mobile.map.width > 0);
    assert.equal(mobile.width, mobile.viewport);
    assert.deepEqual(errors, []);
    console.log('Site checks passed');
  } finally {
    await browser.close();
  }
})();
