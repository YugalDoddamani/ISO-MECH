// Vehicle switching: the switch button cycles PR–180 → EX–240 → dozer → dumper → free explore, parked
// machines stay in their bays, and switching is refused during assembly inspection.
const assert = require('node:assert/strict');
const { run, openApp, artifact } = require('./helpers.cjs');

const state = () => ({
  active: excavator.activeVehicle,
  explore: excavator.exploreMode,
  title: document.querySelector('.heading h1').textContent,
  bodyClass: document.body.className.replace('site-overview', '').trim(),
  root: excavator.groups.driveRoot.position.toArray(),
  carriers: Object.fromEntries(
    Object.entries(excavator.fleet.vehicles).map(([id, v]) => [id, v.carrier.position.toArray()])
  ),
});

run('vehicles', async browser => {
  const { page, errors, advance, click } = await openApp(browser);
  await advance(1000);
  let s = await page.evaluate(state);
  assert.equal(s.active, 'drill');
  assert.equal(s.title, 'PR–180');
  assert.deepEqual(s.root, [28, 0, 4]);
  assert.deepEqual(s.carriers.excavator, [28, 0, -8]);
  assert.deepEqual(s.carriers.dozer, [28, 0, 16]);
  assert.deepEqual(s.carriers.dumper, [28, 0, 28]);

  const expected = [
    ['excavator', 'EX–240', '', [28, 0, -8]],
    ['dozer', null, 'dozer-mode', [28, 0, 16]],
    ['dumper', null, 'dumper-mode', [28, 0, 28]],
  ];
  for (const [active, title, bodyClass, root] of expected) {
    await click('#vehicleSwitch');
    await advance(800);
    s = await page.evaluate(state);
    assert.equal(s.active, active);
    if (title) assert.equal(s.title, title);
    assert.equal(s.bodyClass, bodyClass);
    assert.deepEqual(s.root, root, `${active} starts from its parking bay`);
    await page.screenshot({ path: artifact(`vehicle-${active}.png`) });
  }

  await click('#vehicleSwitch');
  await advance(800);
  s = await page.evaluate(state);
  assert.equal(s.active, 'explore');
  assert.equal(s.explore, true);
  assert.equal(s.bodyClass, 'explore-mode');

  await page.keyboard.press('Escape');
  await advance(800);
  s = await page.evaluate(state);
  assert.equal(s.active, 'dumper', 'Esc returns to the vehicle that was parked');

  await click('#vehicleSwitch');
  await advance(800);
  assert.equal(
    (await page.evaluate(state)).active,
    'drill',
    'after leaving free explore the next press skips it'
  );

  assert.equal(await page.evaluate(() => excavator.switchVehicle('excavator')), true);
  await advance(500);
  await page.evaluate(() => excavator.inspectAssembly());
  await advance(500);
  assert.equal(
    await page.evaluate(() => excavator.switchVehicle('dozer')),
    false,
    'no switching while the assembly is open'
  );
  assert.deepEqual(errors, []);
});
