// Travel: hold-to-drive, track steering, the yard boundary and Return to parking bay.
const assert = require('node:assert/strict');
const { run, openApp } = require('./helpers.cjs');

const pose = () => ({
  position: excavator.groups.driveRoot.position.toArray(),
  heading: excavator.drive.heading,
  distance: excavator.drive.distance,
});

run('travel', async browser => {
  const { page, errors, advance, click } = await openApp(browser);
  await advance(1000);
  await page.evaluate(() => excavator.switchVehicle('excavator'));
  await advance(500);
  let p = await page.evaluate(pose);
  assert.deepEqual(p.position, [28, 0, -8]);

  // Straight travel follows the undercarriage heading (+X at heading 0).
  await page.evaluate(() => excavator.setDriveInput('forward', true));
  await advance(3000);
  await page.evaluate(() => excavator.setDriveInput('forward', false));
  await advance(2000);
  p = await page.evaluate(pose);
  assert(p.distance > 1.5, `travelled ${p.distance} m`);
  assert(p.position[0] > 29.5, `moved forward along +X: ${p.position}`);
  assert(Math.abs(p.position[2] + 8) < 0.01 && Math.abs(p.heading) < 1e-6, 'no drift while driving straight');
  assert.equal(
    await page.evaluate(() => excavator.drive.left === 0 && excavator.drive.right === 0),
    true,
    'tracks stop after release'
  );

  // Differential steering: forward + J turns left (positive heading).
  await page.keyboard.down('ArrowUp');
  await page.keyboard.down('KeyJ');
  await advance(2000);
  await page.keyboard.up('KeyJ');
  await page.keyboard.up('ArrowUp');
  await advance(2000);
  p = await page.evaluate(pose);
  assert(p.heading > 0.1, `heading changed to ${p.heading}`);

  // The east fence (x = 44.8 m) stops the chassis.
  await page.evaluate(() => excavator.returnToStart());
  await advance(500);
  await page.evaluate(() => excavator.setDriveInput('forward', true));
  await advance(40000);
  await page.evaluate(() => excavator.setDriveInput('forward', false));
  await advance(1500);
  p = await page.evaluate(pose);
  assert(p.position[0] > 38 && p.position[0] < 44.8, `stopped inside the yard at x=${p.position[0]}`);

  // Return to parking bay restores position, heading and travel distance.
  await click('#homeDrive');
  await advance(800);
  p = await page.evaluate(pose);
  assert.deepEqual(p.position, [28, 0, -8]);
  assert.equal(p.heading, 0);
  assert.equal(p.distance, 0);
  assert.deepEqual(errors, []);
});
