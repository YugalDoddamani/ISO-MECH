// Interactive yard: drilling leaves a bore mark, tipping releases the dumper load, and the soil model
// conserves material volume throughout; Return to parking bay and Reset Yard restore the yard.
const assert = require('node:assert/strict');
const { run, openApp, artifact } = require('./helpers.cjs');

run('yard', async browser => {
  const { page, errors, advance, click, hold } = await openApp(browser);
  await advance(1000);
  const initial = await page.evaluate(() => excavator.yard.materialVolume());
  const conserved = async label => {
    const volume = await page.evaluate(() => excavator.yard.materialVolume());
    assert(Math.abs(volume - initial) < 1e-6, `${label}: material volume ${volume} vs ${initial}`);
  };

  // PR–180: spin the auger and feed the rotary head down.
  await click('#rigSpin');
  await hold('KeyW', 3000);
  await advance(500);
  const bores = await page.evaluate(() => excavator.yard.boreholes.map(b => b.depth));
  assert.equal(bores.length, 1);
  assert(bores[0] > 0.5, `bore depth ${bores[0]}`);
  await conserved('after drilling');
  await click('#rigSpin');

  // Dumper: hold E to tip the body until the load is released.
  await page.evaluate(() => excavator.switchVehicle('dumper'));
  await advance(800);
  assert(await page.evaluate(() => excavator.dumper.state.payloadVolume > 0.8), 'the dumper starts loaded');
  await hold('KeyE', 3500);
  await advance(1500);
  assert.equal(await page.evaluate(() => excavator.dumper.state.dumped), true);
  assert.equal(await page.evaluate(() => excavator.dumper.state.payloadVolume), 0);
  await conserved('after tipping');
  await page.screenshot({ path: artifact('yard-dumper.png') });

  // Returning to the bay recovers the load; Reset Yard clears bore marks.
  await click('#homeDrive');
  await advance(800);
  assert(await page.evaluate(() => excavator.dumper.state.payloadVolume > 0.8), 'load recovered');
  await conserved('after return to bay');
  await click('#resetYard');
  await advance(300);
  assert.equal(await page.evaluate(() => excavator.yard.boreholes.length), 0);
  await conserved('after Reset Yard');

  // EX–240 loads a dumper parked alongside: hold D to open a full bucket over the dump body.
  await page.evaluate(() => excavator.switchVehicle('excavator', true));
  await advance(500);
  const loading = await page.evaluate(() => {
    const record = excavator.fleet.vehicles.dumper;
    record.carrier.position.set(28.83, 0, -12.6);
    record.carrier.rotation.set(0, 0, 0);
    record.position.copy(record.carrier.position);
    record.heading = 0;
    record.carrier.updateMatrixWorld(true);
    const soil = excavator.yard.soil;
    soil.scoopSweep({ x: 9.5, y: 0.25, z: -9.2 }, { x: 13.5, y: 0.25, z: -9.2 });
    const rim = 4.36;
    const ok = excavator.setPose({ ...armPivotIK(4.6, rim + 1.35), bucket: -15, slew: 87.6 });
    return { ok, bucket: soil.bucketPayload, dumper: excavator.dumper.state.payloadVolume };
  });
  assert.equal(loading.ok, true, 'the bucket can hang over the dump body');
  assert(loading.bucket > 0.5, `the bucket holds soil: ${loading.bucket}`);
  await page.keyboard.down('KeyD');
  await advance(5500);
  await page.keyboard.up('KeyD');
  await advance(300);
  const loaded = await page.evaluate(() => ({
    bucket: excavator.yard.soil.bucketPayload,
    dumper: excavator.dumper.state.payloadVolume,
    angle: excavator.angles.bucket,
  }));
  assert(loaded.angle >= 128, `the bucket opens fully: ${loaded.angle}`);
  assert(loaded.bucket < 1e-9, `the bucket emptied: ${loaded.bucket}`);
  assert(
    Math.abs(loaded.dumper - (loading.dumper + loading.bucket)) < 1e-9,
    'the dump body received the load'
  );
  await conserved('after loading the dumper');
  await page.screenshot({ path: artifact('yard-loading.png') });

  // Dozer: drive forward with the blade down through a heap; the blade carries the soil ahead.
  await page.evaluate(() => excavator.switchVehicle('dozer', true));
  await advance(500);
  const heap = await page.evaluate(() => {
    const soil = excavator.yard.soil,
      taken = soil.withdraw(11.5, -9.2, 2.2);
    soil.deposit(34, 16, taken, 1.3);
    return { taken, at: soil.volumeAbove(34, 16, 1.6), ahead: soil.volumeAbove(39, 16, 2.4) };
  });
  await conserved('after moving a heap in front of the dozer');
  await page.keyboard.down('ArrowUp');
  await advance(9000);
  await page.keyboard.up('ArrowUp');
  await advance(800);
  const pushed = await page.evaluate(() => ({
    x: excavator.groups.driveRoot.position.x,
    at: excavator.yard.soil.volumeAbove(34, 16, 1.6),
    ahead: excavator.yard.soil.volumeAbove(39, 16, 2.4),
  }));
  assert(pushed.x > 32, `the dozer drove through the heap: x ${pushed.x}`);
  assert(pushed.at < heap.at * 0.5, `the blade cleared the heap: ${pushed.at} of ${heap.at}`);
  assert(pushed.ahead > heap.ahead + 0.5, `the soil was carried ahead: ${pushed.ahead}`);
  await conserved('after dozing');
  assert.deepEqual(errors, []);
});
