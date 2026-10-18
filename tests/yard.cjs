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
  assert.deepEqual(errors, []);
});
