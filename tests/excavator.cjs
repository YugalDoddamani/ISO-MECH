// EX–240: guarded poses, keyboard hydraulics, Reset Machine Pose and the exploded assembly view.
const assert = require('node:assert/strict');
const { run, openApp, artifact } = require('./helpers.cjs');

const HOME = { boom: 18, stick: -100, bucket: 75, slew: 0 };
const near = (a, b, tolerance = 1e-6) => Object.keys(b).every(k => Math.abs(a[k] - b[k]) <= tolerance);

run('excavator', async browser => {
  const { page, errors, advance, click, hold } = await openApp(browser);
  await advance(1000);
  await page.evaluate(() => excavator.switchVehicle('excavator'));
  await advance(800);

  const pose = { boom: 30, stick: -80, bucket: 60, slew: 20 };
  assert.equal(await page.evaluate(p => excavator.setPose(p), pose), true);
  assert(near(await page.evaluate(() => excavator.angles), pose), 'setPose applies a valid pose');
  assert.equal(
    await page.evaluate(() => excavator.setPose({ boom: -5, stick: -30, bucket: 40 })),
    false,
    'ground guard rejects a buried bucket'
  );
  assert(near(await page.evaluate(() => excavator.angles), pose), 'a rejected pose leaves the arm unchanged');

  const before = await page.evaluate(() => excavator.angles.boom);
  await hold('KeyE', 1000);
  await advance(800);
  const after = await page.evaluate(() => excavator.angles.boom);
  assert(after > before + 3, `E raises the boom (${before} → ${after})`);
  assert.equal(
    await page.evaluate(() => document.querySelector('.key[data-code="KeyE"]').classList.contains('is-held')),
    false
  );

  await click('#reset');
  await advance(1600);
  assert(near(await page.evaluate(() => excavator.angles), HOME, 0.5), 'Reset Machine Pose returns home');

  // Exploded assembly: 13 systems, explode, select, reassemble and restore the pose.
  await page.evaluate(p => excavator.setPose(p), pose);
  await page.evaluate(() => excavator.inspectAssembly());
  await advance(1500);
  assert.equal(await page.evaluate(() => excavator.explodedParts.length), 13);
  assert.equal(await page.evaluate(() => document.body.classList.contains('assembly-console')), true);
  await page.evaluate(() => excavator.setExplosion(1));
  await advance(2000);
  assert(await page.evaluate(() => excavator.assembly.value > 0.99), 'fully exploded');
  await page.evaluate(() => excavator.selectSystem('05'));
  await advance(300);
  assert.equal(await page.evaluate(() => excavator.assembly.selected), '05');
  assert.equal(
    await page.evaluate(() => document.querySelector('#systemDetailTitle').textContent),
    '05 / Main boom'
  );
  await page.screenshot({ path: artifact('assembly.png') });
  await page.evaluate(() => excavator.exitAssembly(false));
  await advance(2500);
  assert.equal(await page.evaluate(() => excavator.assembly.mode), false);
  assert(
    near(await page.evaluate(() => excavator.angles), pose, 0.5),
    'reassembly restores the previous pose'
  );
  assert.deepEqual(errors, []);
});
