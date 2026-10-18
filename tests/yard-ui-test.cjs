const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { artifact } = require('./helpers.cjs');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:8000');
    await page.waitForFunction(() => window.excavator);
    await page.evaluate(() => {
      excavator.renderer.setPixelRatio(.25);
      excavator.renderer.shadowMap.enabled = false;
    });

    const yard = await page.evaluate(() => {
      const e = excavator, root = e.groups.driveRoot;
      const cone = e.yard.bodies.find(b => b.kind === 'cone');
      const pipe = e.yard.bodies.find(b => b.kind === 'pipe');
      // Put the chassis against a cone, then integrate with deterministic substeps.
      root.position.set(cone.home.x - 2.15, 0, cone.home.z);
      e.drive.heading = 0;
      for (let i = 0; i < 120; i++) e.yard.step(1 / 120);
      const tipped = cone.fall > 1 && cone.object.position.distanceTo(cone.home) > .1;
      root.position.set(pipe.home.x, 0, pipe.home.z - 1.6);
      for (let i = 0; i < 120; i++) e.yard.step(1 / 120);
      const rolled = pipe.active && pipe.object.position.distanceTo(pipe.home) > .1;
      const heap = e.yard.heaps[0];
      // Bring a bucket sample into the pile's upper ring, leaving the machine unchanged.
      const a = heap.geometry.attributes.position;
      const point = new e.THREE.Vector3(a.getX(40), a.getY(40), a.getZ(40)).add(heap.position);
      const saved = e.groups.bucket.position.clone();
      const tip = e.groups.bucket.localToWorld(new e.THREE.Vector3(-.8, -.65, 0));
      const parent = e.groups.bucket.parent;
      const localA = parent.worldToLocal(tip.clone()), localB = parent.worldToLocal(point.clone());
      e.groups.bucket.position.add(localB.sub(localA));
      const before = a.array.slice();
      for (let i = 0; i < 24; i++) e.yard.step(1 / 120);
      const deformed = a.array.some((v, i) => i % 3 === 1 && v < before[i]);
      const emitted = e.yard.particles.some(p => p.life > 0);
      e.groups.bucket.position.copy(saved);
      // An uncontacted pile must not change.
      const untouched = e.yard.heaps[2];
      const isolated = untouched.geometry.attributes.position.array.every((v, i) => v === untouched.userData.original[i]);
      e.yard.reset();
      const restored = e.yard.bodies.every(b => !b.active && b.object.position.equals(b.home)) &&
        e.yard.heaps.every(h => h.geometry.attributes.position.array.every((v, i) => v === h.userData.original[i]));
      e.returnToStart();
      return { tipped, rolled, deformed, emitted, isolated, restored, particleCap: e.yard.particles.length,
        staticWall: !!e.siteCollision(-15.5, 10.6, 0),
        noStaticCones: !e.site.obstacles.some(o => o.name === 'safety cone' || o.name === 'pipe storage') };
    });
    console.log('yard', yard);
    for (const [key, value] of Object.entries(yard)) if (key !== 'particleCap') assert.equal(value, true, key);
    assert.equal(yard.particleCap, 96);

    await page.keyboard.down('e');
    await page.waitForTimeout(500);
    assert(await page.locator('.key[data-code="KeyE"]').first().evaluate(e => e.classList.contains('is-held')));
    assert(await page.evaluate(() => excavator.angles.boom > 18));
    await page.keyboard.up('e');
    assert.equal(await page.locator('.key[data-code="KeyE"]').first().evaluate(e => e.classList.contains('is-held')), false);
    // Simultaneous joints and precision modify independent valve targets.
    const beforePrecision = await page.evaluate(() => excavator.hydraulicState.boom.target);
    await page.keyboard.down('z');
    await page.keyboard.down('e');
    await page.keyboard.down('d');
    await page.waitForTimeout(400);
    const fineDelta = await page.evaluate(before => excavator.hydraulicState.boom.target - before, beforePrecision);
    assert(fineDelta > 0 && fineDelta < 4);
    assert(await page.evaluate(() => excavator.hydraulicState.bucket.target > 75));
    await page.keyboard.up('e');
    await page.keyboard.up('d');
    await page.keyboard.up('z');
    const track = page.locator('[data-joint="boom"] .joint-track');
    const trackBox = await track.boundingBox();
    const targetBeforeClick = await page.evaluate(() => excavator.hydraulicState.boom.target);
    await page.mouse.click(trackBox.x + trackBox.width * .85, trackBox.y + trackBox.height / 2);
    assert(await page.evaluate(before => excavator.hydraulicState.boom.target > before, targetBeforeClick));
    await page.keyboard.press('Space');
    await page.waitForFunction(() => excavator.drive.braking);
    await page.keyboard.press('b');
    await page.waitForTimeout(100);
    assert(await page.evaluate(() => excavator.drive.braking)); // B release preserves latched brake.
    await page.keyboard.press('Space');
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(500);
    assert(await page.evaluate(() => excavator.drive.left > 0));
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(900);
    assert(await page.evaluate(() => Math.abs(excavator.drive.left) < .01));
    await page.keyboard.press('?');
    assert.equal(await page.locator('#helpbox').isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#helpbox').isVisible(), false);
    await page.keyboard.press('3');
    await page.waitForTimeout(1800);
    assert(await page.evaluate(() => excavator.assembly.mode));
    await page.locator('input[type=search]').fill('engine');
    assert(await page.locator('#systemList .system-row:visible').count() > 0);
    assert(await page.locator('#systemList .system-row:visible').count() < 13);
    await page.keyboard.press('Escape'); // Search keeps ordinary typing shortcuts scoped.
    await page.locator('#assemblyDone').click();
    await page.waitForTimeout(1800);

    await page.setViewportSize({ width: 390, height: 844 });
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('#stage').getBoundingClientRect();
      const pad = document.querySelector('#mobileGamepad').getBoundingClientRect();
      return { separate: stage.bottom <= pad.top, size: document.querySelector('#mobileGamepad [data-drive]').getBoundingClientRect().width };
    });
    assert(layout.separate);
    assert(layout.size >= 64);
    await page.locator('#moreControls').click();
    assert(await page.locator('#panel').isVisible());
    await page.locator('#mobileToggle').click();
    const forward = page.locator('#mobileGamepad [data-drive=forward]');
    const fb = await forward.boundingBox();
    await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(150);
    await forward.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    assert.equal(await forward.evaluate(e => e.classList.contains('held')), false);
    await page.screenshot({ path: artifact('yard-ui-mobile.png') });
    await page.setViewportSize({ width: 740, height: 390 });
    assert(await page.locator('#mobileGamepad').isVisible());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: artifact('yard-ui-landscape.png') });
    assert.deepEqual(errors, []);
    console.log('Yard and operator UI checks passed');
  } finally {
    await browser.close();
  }
})();
