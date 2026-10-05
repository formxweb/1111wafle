/* Screenshots the compositions in compose.html into social posts and the OG image.
 *   node tools/render/compose.mjs
 */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));

const JOBS = [
  ['post-01', 'assets/img/social', [600, 900]],
  ['post-02', 'assets/img/social', [600, 900]],
  ['reel-03', 'assets/img/social', [500, 800]],
  ['post-04', 'assets/img/social', [600, 900]],
  ['post-05', 'assets/img/social', [600, 900]],
  ['reel-06', 'assets/img/social', [500, 800]],
  ['post-07', 'assets/img/social', [600, 900]],
  ['og', 'assets/img/og', null],
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1500 }, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${server.address().port}/tools/render/compose.html`);
await page.waitForFunction(() => window.ready);
for (const [id, dir, widths] of JOBS) {
  const { w, h } = await page.evaluate((i) => window.show(i), id);
  const buf = await page.locator(`#${id}`).screenshot({ type: 'png' });
  await mkdir(join(ROOT, dir), { recursive: true });
  if (!widths) {
    await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toFile(join(ROOT, dir, 'cupistan-og.jpg'));
  } else {
    for (const width of widths) {
      await sharp(buf).resize(width).webp({ quality: 82, effort: 6 }).toFile(join(ROOT, dir, `${id}-${width}.webp`));
    }
  }
  console.log(id, w, h);
}
await browser.close();
server.close();
