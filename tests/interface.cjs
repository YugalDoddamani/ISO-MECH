// Interface: help dialog, camera presets, auto orbit, site overview, keycap feedback and the phone layout.
const assert = require('node:assert/strict');
const { run, openApp, artifact } = require('./helpers.cjs');

run('interface', async browser => {
  const { page, errors, advance, click } = await openApp(browser);
  await advance(1000);

  await page.keyboard.press('Shift+Slash');
  await advance(200);
  assert.equal(
    await page.evaluate(() => document.querySelector('#helpbox').hidden),
    false,
    '? opens the guide'
  );
  await page.keyboard.press('Escape');
  await advance(200);
  assert.equal(
    await page.evaluate(() => document.querySelector('#helpbox').hidden),
    true,
    'Esc closes the guide'
  );

  await click('#siteMapToggle');
  await advance(1500);
  assert.equal(
    await page.evaluate(() => excavator.site.overview),
    false,
    'the site plan toggles the overview off'
  );
  assert.equal(
    await page.evaluate(() => document.querySelector('#siteMapToggle').getAttribute('aria-pressed')),
    'false'
  );

  await page.keyboard.press('F5');
  await advance(1200);
  assert.equal(
    await page.evaluate(() => document.querySelector('[data-view="top"]').getAttribute('aria-pressed')),
    'true'
  );
  await page.keyboard.press('KeyO');
  await advance(500);
  assert.equal(await page.evaluate(() => excavator.controls.autoRotate), true, 'O starts auto orbit');
  await page.keyboard.press('KeyO');

  await page.keyboard.down('KeyQ');
  await advance(100);
  assert.equal(
    await page.evaluate(() => document.querySelector('.key[data-code="KeyQ"]').classList.contains('is-held')),
    true
  );
  await page.keyboard.up('KeyQ');
  await advance(100);
  assert.equal(
    await page.evaluate(() => document.querySelector('.key[data-code="KeyQ"]').classList.contains('is-held')),
    false
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await advance(600);
  const layout = await page.evaluate(() => ({
    pad: getComputedStyle(document.querySelector('#mobileGamepad')).display,
    panel: getComputedStyle(document.querySelector('#panel')).display,
  }));
  assert.deepEqual(layout, { pad: 'grid', panel: 'none' });
  await click('#moreControls');
  await advance(400);
  assert.equal(
    await page.evaluate(() => document.querySelector('#panel').classList.contains('open')),
    true,
    'MORE opens the console sheet'
  );
  await page.screenshot({ path: artifact('interface-mobile-sheet.png') });
  assert.deepEqual(errors, []);
});
