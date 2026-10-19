// Site audio: nothing plays before a user gesture; the first click starts the procedural engine; only the
// operated machine's engine runs in normal play while every crew machine runs in work mode; the machine
// the camera follows is loudest; M and the speaker button mute, and the choice survives a reload.
const assert = require('node:assert/strict');
const { run, openApp, waitFor } = require('./helpers.cjs');

const levels = () =>
  Object.fromEntries(
    Object.entries(excavator.audio.levels()).map(([id, v]) => [id, { rpm: v.rpm, out: v.out }])
  );
// Signal level at the master output, measured with an analyser over real (audio-thread) time.
async function loudness(page) {
  await page.evaluate(() => {
    window.__analyser = siteAudio.ctx.createAnalyser();
    window.__analyser.fftSize = 4096;
    siteAudio.master.connect(window.__analyser);
  });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const buffer = new Float32Array(window.__analyser.fftSize);
    window.__analyser.getFloatTimeDomainData(buffer);
    siteAudio.master.disconnect(window.__analyser);
    return Math.sqrt(buffer.reduce((sum, v) => sum + v * v, 0) / buffer.length);
  });
}

run('audio', async browser => {
  const { page, errors, advance } = await openApp(browser);
  await advance(800);
  assert.equal(await page.evaluate(() => excavator.audio.state), 'not started', 'silent before any gesture');
  assert.equal(
    await page.evaluate(() => document.querySelector('#soundToggle').getAttribute('aria-pressed')),
    'true'
  );

  await page.mouse.click(500, 500);
  await advance(1500);
  assert.equal(await page.evaluate(() => excavator.audio.state), 'running', 'the first click starts audio');
  let l = await page.evaluate(levels);
  assert(l.drill.rpm > 600 && l.drill.out > 0, 'the operated PR–180 engine runs');
  for (const id of ['excavator', 'dozer', 'dumper']) assert.equal(l[id].rpm, 0, `${id} is parked and silent`);

  await page.evaluate(() => excavator.setWorkMode(true));
  for (let i = 0; i < 6; i++) await advance(1000);
  l = await page.evaluate(levels);
  for (const id of ['excavator', 'drill', 'dozer', 'dumper'])
    assert(l[id].rpm > 600, `${id} runs in work mode`);
  await page.evaluate(() => document.querySelector('#workPanel [data-follow="excavator"]').click());
  for (let i = 0; i < 3; i++) await advance(1000);
  l = await page.evaluate(levels);
  assert(l.excavator.out > l.dozer.out && l.excavator.out > l.drill.out, 'the followed machine is loudest');
  assert((await loudness(page)) > 0.001, 'the engine is audible');

  await page.keyboard.press('KeyM');
  await advance(300);
  assert.deepEqual(
    await page.evaluate(() => [
      excavator.audio.enabled,
      localStorage.getItem('isomech-sound'),
      document.querySelector('#soundToggle').getAttribute('aria-pressed'),
    ]),
    [false, '0', 'false'],
    'M mutes and remembers'
  );

  // The muted choice survives a reload: the first click no longer starts audio.
  await page.reload();
  await waitFor(page, () => !!window.excavator);
  await page.mouse.click(500, 500);
  await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => [excavator.audio.enabled, excavator.audio.state]), [
    false,
    'not started',
  ]);
  await page.click('#soundToggle');
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => [excavator.audio.enabled, excavator.audio.state]), [
    true,
    'running',
  ]);
  assert.deepEqual(errors, []);
});
