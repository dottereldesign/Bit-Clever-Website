const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4175';
const output = path.resolve(__dirname, '../.local/handwriting-audit');

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'playing');
    await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(output, 'website-loop.png') });
    await page.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'complete');
    assert.equal(await page.locator('.hero__handwriting').isVisible(), false);
    assert.equal(await page.locator('.hero__logo').isVisible(), true);
    assert.equal(await page.locator('.hero__logo').getAttribute('src'), './assets/bit-clever-logo-white.svg');
    await page.screenshot({ path: path.join(output, 'website-finished.png') });

    assert.equal(await page.locator('#drawing-speed').textContent(), '2×');
    assert.equal(await page.locator('.speed-presets button').count(), 6);
    for (const speed of [1, 1.5, 2, 2.5, 3, 4]) {
      await page.locator('.speed-picker summary').click();
      const started = Date.now();
      await page.locator(`[data-speed="${speed}"]`).click();
      assert.equal(await page.locator('.speed-picker').getAttribute('open'), null);
      assert.equal(await page.locator('#drawing-speed').textContent(), `${speed}×`);
      assert.equal(await page.locator(`.speed-presets [aria-pressed="true"]`).getAttribute('data-speed'), String(speed));
      await page.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'complete');
      const duration = Date.now() - started;
      assert.ok(Math.abs(duration - (5300 / speed + 700)) < 600, `${speed}× took ${duration}ms`);
    }
    await page.reload();
    await page.waitForSelector('.speed-picker:not([hidden])');
    assert.equal(await page.locator('#drawing-speed').textContent(), '4×');
    await page.locator('.speed-picker summary').click();
    await page.locator('[data-speed="1.5"]').click();
    await page.waitForTimeout(200);
    await page.locator('.speed-picker summary').click();
    await page.locator('[data-speed="3"]').click();
    await page.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'complete');

    const button = page.getByRole('button', { name: 'Replay Bit Clever handwriting animation' });
    await button.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'playing');
    for (const [width, height] of [[390, 844], [320, 640], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      const layout = await page.evaluate(() => {
        const logo = document.querySelector('.hero__logo').getBoundingClientRect();
        const hero = document.querySelector('.hero').getBoundingClientRect();
        const canvas = document.querySelector('.hero__handwriting');
        return { contained: logo.left >= hero.left && logo.right <= hero.right && logo.top >= hero.top && logo.bottom <= hero.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth,
          sharp: canvas.width === Math.round(logo.width * 2) && canvas.height === Math.round(logo.height * 2) };
      });
      assert.deepEqual(layout, { contained: true, overflow: false, sharp: true });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.hero__handwriting').isVisible(), false);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.hero__brand').getAttribute('data-handwriting'), 'complete');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'complete');
    assert.equal(await page.locator('.hero__logo').isVisible(), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'website-mobile.png') });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.locator('.speed-picker summary').click();
    const menu = await page.locator('.speed-options').boundingBox();
    assert.ok(menu.x >= 8 && menu.x + menu.width <= 312 && menu.y >= 8);
    await page.screenshot({ path: path.join(output, 'speed-menu-mobile.png') });
    await page.locator('[data-speed="2.5"]').click();
    assert.equal(await page.locator('.hero__brand').getAttribute('data-handwriting'), 'complete');
    await page.locator('.speed-picker summary').click();
    await page.locator('.noise-picker summary').click();
    await page.waitForFunction(() => !document.querySelector('.speed-picker').open);
    await page.locator('.noise-picker summary').click();

    await page.goto(base + '/tools/handwriting-inspector.html');
    await page.waitForFunction(() => window.inspector);
    const pixels = await page.evaluate(() => {
      const { paint, canvas, data } = window.inspector;
      const ctx = canvas.getContext('2d');
      paint(0);
      const bit = Array.from(ctx.getImageData(0, 0, 620, 520).data);
      paint(4);
      const fixedBit = Array.from(ctx.getImageData(0, 0, 620, 520).data).every((v, i) => v === bit[i]);
      const eyeAlpha = [];
      for (const time of [5.3, 5.52, 5.65]) {
        paint(time);
        eyeAlpha.push(ctx.getImageData((270 - 52) * 4, (73 - 28) * 4, 1, 1).data[3]);
      }
      // Sample actual distance travelled in equal time intervals. Constant
      // timing fails this check even when the UI still offers six multipliers.
      let length = 0;
      const distances = data.route.map((point, index) => {
        if (index) length += Math.hypot(point[0] - data.route[index - 1][0], point[1] - data.route[index - 1][1]);
        return length;
      });
      const distanceAt = time => {
        const index = data.route.findIndex(point => point[3] > time);
        if (index < 0) return length;
        if (!index) return 0;
        const f = (time - data.route[index - 1][3]) / (data.route[index][3] - data.route[index - 1][3]);
        return distances[index - 1] + f * (distances[index] - distances[index - 1]);
      };
      const pace = Array.from({ length: 192 }, (_, i) =>
        (distanceAt(.3 + (i + 1) * .025) - distanceAt(.3 + i * .025)) / .025 / (length / 4.8));
      return { fixedBit, eyeAlpha, pace };
    });
    assert.equal(pixels.fixedBit, true);
    assert.equal(pixels.eyeAlpha[0], 0);
    assert.ok(pixels.eyeAlpha[1] > 0 && pixels.eyeAlpha[1] < 255);
    assert.equal(pixels.eyeAlpha[2], 255);
    assert.ok(Math.min(...pixels.pace) > .2, 'The pen must keep moving forward');
    assert.ok(Math.max(...pixels.pace) / Math.min(...pixels.pace) > 2, 'Pen pace should vary through the strokes');
    assert.ok(pixels.pace.slice(1).every((value, i) => Math.abs(value - pixels.pace[i]) < .5), 'Momentum should change smoothly');
    assert.deepEqual(errors, []);

    const noJS = await browser.newPage({ javaScriptEnabled: false });
    await noJS.goto(base);
    assert.equal(await noJS.locator('.hero__logo').evaluate(logo => getComputedStyle(logo).clipPath), 'none');
    await noJS.close();
    const failed = await browser.newPage();
    await failed.route('**/handwriting-data.json', route => route.abort());
    await failed.goto(base);
    await failed.waitForFunction(() => document.querySelector('.hero__brand').dataset.handwriting === 'complete');
    assert.equal(await failed.locator('.hero__logo').isVisible(), true);
    await failed.close();
    console.log('PASS: natural forward motion with smooth pace changes, all six speed timings, saved speed, changes during playback, mobile speed menu, playback, keyboard replay, resize at 3 sizes, reduced motion, static SVG handoff, fixed Bit, delayed C eyes, no-JS and fetch-error fallbacks.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
