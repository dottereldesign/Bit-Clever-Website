// Headless only: this never opens or controls the user's browser or mouse.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.local/handwriting-audit');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4175';

async function outline(browser) {
  const svg = await fs.readFile(path.join(root, 'assets/bit-clever-logo-white.svg'), 'utf8');
  const parts = svg.match(/<path[^>]*d="([^"]+)"/)[1].match(/M[^M]+/g);
  const page = await browser.newPage({ viewport: { width: 2360, height: 1080 } });
  await page.setContent('<style>body{margin:0;background:black}svg{display:block}</style>' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="2360" height="1080" viewBox="210 25 295 135">' +
    '<path fill="white" fill-rule="evenodd" d="' + parts.slice(0, 4).join(' ') + '"/></svg>');
  await page.screenshot({ path: path.join(root, '.local/clever-outline.png') });
  await page.close();
  console.log('Rendered the approved Clever outline at 8x.');
}

async function frames(browser) {
  const page = await browser.newPage({ viewport: { width: 1900, height: 900 } });
  await page.goto(base + '/tools/handwriting-inspector.html');
  await page.waitForFunction(() => window.inspector);
  for (let frame = 0; frame <= 339; frame++) {
    const png = await page.evaluate(frame => {
      window.inspector.paint(frame / 60, { inkOnly: true });
      return window.inspector.canvas.toDataURL().split(',')[1];
    }, frame);
    await fs.writeFile(path.join(output, `frame-${String(frame).padStart(3, '0')}.png`), Buffer.from(png, 'base64'));
  }
  await page.close();
  console.log('Captured all 340 frames at 60 fps, at 4x logo resolution.');
}

async function sheets(browser) {
  const groups = [['C', 0, 95, [210, 25, 110, 135]], ['l', 96, 148, [280, 65, 70, 85]],
    ['e1', 149, 183, [328, 85, 52, 60]], ['v', 184, 226, [365, 85, 60, 60]],
    ['e2', 227, 267, [407, 85, 48, 60]], ['r', 268, 306, [445, 70, 60, 75]],
    ['finish', 307, 339, [210, 25, 295, 135]]];
  for (const [name, start, end, box] of groups) {
    const scale = Math.min(220 / box[2], 160 / box[3]);
    let cards = '';
    for (let frame = start; frame <= end; frame++) {
      cards += `<div><label>${frame} / ${(frame / 60).toFixed(3)}s</label><section>` +
        `<img src="frame-${String(frame).padStart(3, '0')}.png" style="width:${456 * scale}px;` +
        `left:${(240 - box[2] * scale) / 2 - (box[0] - 52) * scale}px;` +
        `top:${(170 - box[3] * scale) / 2 - (box[1] - 28) * scale}px"></section></div>`;
    }
    const html = '<style>body{margin:0;padding:20px;background:#081d1b;color:white;font:14px Arial}' +
      '.grid{display:grid;grid-template-columns:repeat(8,240px);gap:8px}' +
      'section{height:170px;position:relative;overflow:hidden;background:#123433}' +
      'label{display:block;padding:4px}img{position:absolute}</style>' +
      `<h1>${name} — every frame</h1><div class="grid">${cards}</div>`;
    const file = path.join(output, name + '.html');
    await fs.writeFile(file, html);
    const page = await browser.newPage({ viewport: { width: 2020, height: 900 } });
    await page.goto(pathToFileURL(file).href);
    await page.screenshot({ path: path.join(output, name + '-sheet.png'), fullPage: true });
    await page.close();
  }
  console.log('Built contact sheets covering every captured frame.');
}

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const mode = process.argv[2] || 'frames';
    if (mode === 'outline') await outline(browser);
    else if (mode === 'frames') { await frames(browser); await sheets(browser); }
    else if (mode === 'sheets') await sheets(browser);
    else throw new Error('Use outline, frames, or sheets.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
