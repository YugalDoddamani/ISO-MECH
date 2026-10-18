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
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto('http://127.0.0.1:8000/');
    await page.waitForFunction(() => window.excavator);
    await page.waitForTimeout(900);

    const initial = await page.evaluate(() => {
      const e = excavator;
      const ex = e.fleet.vehicles.excavator;
      const drill = e.fleet.vehicles.drill;
      return {
        active: e.activeVehicle,
        overview: e.site.overview,
        visible: e.machine.visible && e.pileRig.root.visible,
        activeRoot: e.pileRig.root.parent === e.groups.driveRoot,
        inactiveCarrier: e.machine.parent === ex.carrier,
        fleetParent: ex.carrier.parent === e.fleet.root && drill.carrier.parent === e.fleet.root,
        exBay: ex.carrier.position.toArray(),
        drillBay: e.groups.driveRoot.position.toArray(),
        mapBounds: document.querySelector('#siteMapToggle .map-title').textContent,
        inactiveMapMarker: document.querySelector('#mapInactiveMachine').getAttribute('transform'),
        viewWidth: e.camera.right - e.camera.left,
        dimensions: e.site.bounds,
      };
    });
    console.log('initial fleet', initial);
    assert.equal(initial.active, 'drill');
    assert.equal(initial.overview, true);
    assert(initial.visible && initial.activeRoot && initial.inactiveCarrier && initial.fleetParent);
    assert.deepEqual(initial.exBay, [28, 0, -8]);
    assert.deepEqual(initial.drillBay, [28, 0, 4]);
    assert.equal(initial.mapBounds, 'SITE PLAN 90 × 68 M');
    assert.match(initial.inactiveMapMarker, /translate\(28\.00 -8\.00\)/);
    assert(initial.viewWidth >= 90);
    assert.deepEqual(initial.dimensions, { width: 90, depth: 68, halfWidth: 45, halfDepth: 34 });
    await page.screenshot({ path: artifact('fleet-overview.png') });

    // Switching stores the outgoing pose and reattaches the parked machine at its own pose.
    await page.evaluate(() => {
      const e = excavator;
      e.groups.driveRoot.position.set(31, 0, 5);
      e.drive.heading = Math.PI / 6;
      e.groups.driveRoot.rotation.y = e.drive.heading;
      e.drive.distance = 12.75;
    });
    assert.equal(await page.evaluate(() => excavator.switchVehicle('excavator')), true);
    const onExcavator = await page.evaluate(() => {
      const e = excavator, ex = e.fleet.vehicles.excavator, drill = e.fleet.vehicles.drill;
      return {
        active: e.activeVehicle,
        position: e.groups.driveRoot.position.toArray(),
        heading: e.drive.heading,
        distance: e.drive.distance,
        exActive: e.machine.parent === e.groups.driveRoot,
        drillParked: e.pileRig.root.parent === drill.carrier,
        drillPosition: drill.carrier.position.toArray(),
        drillHeading: drill.carrier.rotation.y,
        drillDistance: drill.distance,
        bothVisible: e.machine.visible && e.pileRig.root.visible,
      };
    });
    assert.equal(onExcavator.active, 'excavator');
    assert.deepEqual(onExcavator.position, [28, 0, -8]);
    assert.equal(onExcavator.distance, 0);
    assert(onExcavator.exActive && onExcavator.drillParked && onExcavator.bothVisible);
    assert.deepEqual(onExcavator.drillPosition, [31, 0, 5]);
    assert(Math.abs(onExcavator.drillHeading - Math.PI / 6) < 1e-10);
    assert.equal(onExcavator.drillDistance, 12.75);

    await page.evaluate(() => {
      const e = excavator;
      e.groups.driveRoot.position.set(33, 0, -6);
      e.drive.heading = -Math.PI / 4;
      e.groups.driveRoot.rotation.y = e.drive.heading;
      e.drive.distance = 4.25;
    });
    assert.equal(await page.evaluate(() => excavator.switchVehicle('drill')), true);
    const restored = await page.evaluate(() => {
      const e = excavator, ex = e.fleet.vehicles.excavator, drill = e.fleet.vehicles.drill;
      return {
        active: e.activeVehicle,
        position: e.groups.driveRoot.position.toArray(),
        heading: e.drive.heading,
        distance: e.drive.distance,
        exPosition: ex.carrier.position.toArray(),
        exHeading: ex.carrier.rotation.y,
        exDistance: ex.distance,
        parent: e.machine.parent === ex.carrier,
        visible: e.machine.visible && e.pileRig.root.visible,
      };
    });
    assert.equal(restored.active, 'drill');
    assert.deepEqual(restored.position, [31, 0, 5]);
    assert(Math.abs(restored.heading - Math.PI / 6) < 1e-10);
    assert.equal(restored.distance, 12.75);
    assert.deepEqual(restored.exPosition, [33, 0, -6]);
    assert(Math.abs(restored.exHeading + Math.PI / 4) < 1e-10);
    assert.equal(restored.exDistance, 4.25);
    assert(restored.parent && restored.visible);

    // Invalid and blocked switches must leave the active vehicle and its pose intact.
    const switchGuards = await page.evaluate(() => {
      const e = excavator, ex = e.fleet.vehicles.excavator;
      const snapshot = () => ({
        active: e.activeVehicle,
        position: e.groups.driveRoot.position.toArray(),
        heading: e.drive.heading,
        distance: e.drive.distance,
        drillActive: e.pileRig.root.parent === e.groups.driveRoot,
        excavatorParked: e.machine.parent === ex.carrier,
      });
      const before = snapshot();
      const invalid = e.switchVehicle('loader');
      const afterInvalid = snapshot();
      ex.carrier.position.copy(e.groups.driveRoot.position);
      ex.carrier.rotation.y = e.drive.heading;
      const blocked = e.switchVehicle('excavator');
      const afterBlocked = snapshot();
      // Restore the parked excavator bay for the remaining collision checks.
      ex.carrier.position.set(33, 0, -6);
      ex.carrier.rotation.y = -Math.PI / 4;
      return { invalid, blocked, before, afterInvalid, afterBlocked };
    });
    assert.equal(switchGuards.invalid, false);
    assert.equal(switchGuards.blocked, false);
    assert.deepEqual(switchGuards.afterInvalid, switchGuards.before);
    assert.deepEqual(switchGuards.afterBlocked, switchGuards.before);

    // SAT collision checks account for the parked chassis even at different headings.
    const collisions = await page.evaluate(() => {
      const e = excavator;
      const parked = e.fleet.vehicles.excavator.carrier;
      return {
        sameHeading: e.siteCollision(parked.position.x, parked.position.z, parked.rotation.y, 'drill'),
        crossingHeading: e.siteCollision(parked.position.x, parked.position.z, parked.rotation.y + Math.PI / 2, 'drill'),
        safe: e.siteCollision(41, 20, 0, 'drill'),
        boundary: e.siteCollision(42, 20, 0, 'drill'),
      };
    });
    assert.equal(collisions.sameHeading, 'EX–240 parked');
    assert.equal(collisions.crossingHeading, 'EX–240 parked');
    assert.equal(collisions.safe, null);
    assert.equal(collisions.boundary, 'Site boundary');

    // The inactive excavator stays frozen while the piling rig travels.
    const parkedBefore = await page.evaluate(() => ({
      position: excavator.machine.position.toArray(),
      rotation: excavator.machine.rotation.toArray(),
      tracks: excavator.trackSystems.map(track => [track.distance, track.phase]),
      carrier: excavator.fleet.vehicles.excavator.carrier.position.toArray(),
    }));
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(650);
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(300);
    const parkedAfter = await page.evaluate(() => ({
      position: excavator.machine.position.toArray(),
      rotation: excavator.machine.rotation.toArray(),
      tracks: excavator.trackSystems.map(track => [track.distance, track.phase]),
      carrier: excavator.fleet.vehicles.excavator.carrier.position.toArray(),
    }));
    assert.deepEqual(parkedAfter, parkedBefore);

    // A blocked return cannot teleport the selected machine onto the other rig.
    const blockedReturn = await page.evaluate(() => {
      const e = excavator, carrier = e.fleet.vehicles.excavator.carrier;
      e.groups.driveRoot.position.set(35, 0, 20);
      e.drive.heading = 0;
      e.groups.driveRoot.rotation.y = 0;
      e.drive.distance = 4;
      carrier.position.set(28, 0, 4);
      carrier.rotation.y = 0;
      const returned = e.returnToStart();
      const remaining = e.groups.driveRoot.position.toArray();
      carrier.position.set(33, 0, -6);
      carrier.rotation.y = -Math.PI / 4;
      return { returned, remaining };
    });
    assert.equal(blockedReturn.returned, false);
    assert.deepEqual(blockedReturn.remaining, [35, 0, 20]);

    assert.deepEqual(errors, []);
    console.log('Fleet parking checks passed');
  } finally {
    await browser.close();
  }
})();
