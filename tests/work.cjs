// Work mode: every machine runs its own job on the shared soil model. The EX–240 loads the dumper, the
// dumper reverses down the haul lane and tips on the fill pad, the dozer spreads the load and the PR–180
// bores piles. Footprints never overlap, material volume is conserved throughout, the camera can follow
// any machine, and stopping hands control back to the machine that was being operated.
const assert = require('node:assert/strict');
const { run, openApp, artifact } = require('./helpers.cjs');

const sample = () => {
  const w = excavator.workMode,
    soil = excavator.yard.soil,
    overlaps = [];
  if (w.crew)
    for (const [id, c] of Object.entries(w.crew)) {
      const hit = excavator.siteCollision(c.x, c.z, c.heading, id);
      if (hit) overlaps.push(`${id}: ${hit}`);
    }
  return {
    active: w.active,
    stats: w.stats,
    lane: w.lane,
    status: w.crew ? Object.fromEntries(Object.entries(w.crew).map(([id, c]) => [id, c.status])) : null,
    overlaps,
    volume: excavator.yard.materialVolume(),
    dumper: excavator.dumper.state.payloadVolume,
    bucket: soil.bucketPayload,
    pad: soil.volumeAbove(36, -15.6, 2.6),
    spread: soil.volumeAbove(36, -8, 4.5),
    finite: Object.values(excavator.angles).every(Number.isFinite),
  };
};

run('work', async browser => {
  const { page, errors, advance, click } = await openApp(browser);
  await advance(800);
  const initial = await page.evaluate(() => excavator.yard.materialVolume());
  const padBefore = await page.evaluate(() => excavator.yard.soil.volumeAbove(36, -8, 4.5));

  await click('#workModeToggle');
  await advance(600);
  const ui = await page.evaluate(() => ({
    active: excavator.activeVehicle,
    work: excavator.workMode.active,
    body: document.body.classList.contains('work-mode'),
    title: document.querySelector('.heading h1').textContent,
    button: document.querySelector('#workModeToggle').getAttribute('aria-pressed'),
    switchShown: getComputedStyle(document.querySelector('#vehicleSwitch')).display !== 'none',
    panelShown: getComputedStyle(document.querySelector('#workPanel')).display !== 'none',
    jointsShown: getComputedStyle(document.querySelector('#joints')).display !== 'none',
    rows: document.querySelectorAll('#workPanel [data-follow]').length,
    overview: excavator.site.overview,
  }));
  assert.deepEqual(ui, {
    active: 'drill',
    work: true,
    body: true,
    title: 'WORK MODE',
    button: 'true',
    switchShown: false,
    panelShown: true,
    jointsShown: false,
    rows: 4,
    overview: true,
  });

  // Run four simulated minutes in 5 s chunks, checking separation and conservation every chunk.
  let s,
    peakDumper = 0,
    peakPad = 0,
    tipped = false;
  for (let t = 0; t < 240; t += 5) {
    await page.evaluate(() => excavator.stepFixed(300));
    s = await page.evaluate(sample);
    assert.deepEqual(s.overlaps, [], `no machine overlaps another or an obstacle at ${t + 5} s`);
    assert(
      Math.abs(s.volume - initial) < 1e-6,
      `material volume conserved at ${t + 5} s: ${s.volume} vs ${initial}`
    );
    assert(s.finite, 'excavator joint angles stay finite');
    peakDumper = Math.max(peakDumper, s.dumper);
    peakPad = Math.max(peakPad, s.pad);
    tipped = tipped || s.stats.loads > 0;
  }
  assert(s.stats.passes >= 3, `the EX–240 made loading passes: ${s.stats.passes}`);
  assert(peakDumper > 3.2, `the dumper was filled to capacity: ${peakDumper}`);
  assert(tipped && s.stats.moved > 3, `the dumper hauled and tipped: ${JSON.stringify(s.stats)}`);
  assert(peakPad > 1, `a heap appeared on the fill pad: ${peakPad}`);
  assert(s.stats.spread >= 1, `the dozer spread a load: ${JSON.stringify(s.stats)}`);
  assert(s.spread > padBefore + 1, `spread soil reached the pad south of the lane: ${s.spread}`);
  assert(s.stats.piles >= 4, `the PR–180 bored piles: ${s.stats.piles}`);
  assert(
    await page.evaluate(() => excavator.yard.boreholes.every(b => b.depth > 1.5)),
    'every bore mark is deep'
  );

  // Follow buttons point the camera at one machine; the whole-site button returns to the overview.
  await click('#workPanel [data-follow="dozer"]');
  await advance(1200);
  assert.deepEqual(
    await page.evaluate(() => [
      excavator.workMode.follow,
      excavator.site.overview,
      document.querySelector('#workPanel [data-follow="dozer"]').getAttribute('aria-pressed'),
    ]),
    ['dozer', false, 'true']
  );
  await page.screenshot({ path: artifact('work-follow-dozer.png') });
  await click('#workPanel [data-work-overview]');
  await advance(1200);
  assert.equal(await page.evaluate(() => excavator.site.overview), true);
  await page.screenshot({ path: artifact('work-overview.png') });

  // Machine controls are inert while the crew works.
  assert.equal(await page.evaluate(() => excavator.switchVehicle('dozer')), false, 'switching is refused');

  // Esc stops work mode and hands the PR–180 back where the crew left it.
  const before = await page.evaluate(() => excavator.workMode.crew.drill);
  await page.keyboard.press('Escape');
  await advance(800);
  const after = await page.evaluate(() => ({
    work: excavator.workMode.active,
    active: excavator.activeVehicle,
    body: document.body.classList.contains('work-mode'),
    root: excavator.groups.driveRoot.position.toArray(),
    title: document.querySelector('.heading h1').textContent,
    switchShown: getComputedStyle(document.querySelector('#vehicleSwitch')).display !== 'none',
    volume: excavator.yard.materialVolume(),
  }));
  assert.equal(after.work, false);
  assert.equal(after.active, 'drill');
  assert.equal(after.body, false);
  assert.equal(after.title, 'PR–180');
  assert.equal(after.switchShown, true);
  assert(Math.abs(after.root[0] - before.x) < 1e-9 && Math.abs(after.root[2] - before.z) < 1e-9);
  assert(Math.abs(after.volume - initial) < 1e-6, 'volume conserved after stopping');
  assert.equal(
    await page.evaluate(() => excavator.switchVehicle('dumper', true)),
    true,
    'machines drive again'
  );

  // Work mode is refused while the excavator assembly is open.
  await page.evaluate(() => excavator.switchVehicle('excavator', true));
  await advance(400);
  await click('#assemblyTab');
  await advance(1500);
  assert.equal(await page.evaluate(() => excavator.setWorkMode(true)), false);
  assert.equal(await page.evaluate(() => excavator.workMode.active), false);
  assert.deepEqual(errors, []);
});
