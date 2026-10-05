/**
 * Renders the product stills in /assets/img/products from tools/render/stills.mjs.
 *
 *   npm i -D playwright-core sharp
 *   node tools/render/render.mjs [name ...]
 *
 * Set CHROMIUM_PATH if Chromium is not at the default Playwright location.
 */
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { STILLS } from './stills.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.goto(`http://localhost:${port}/tools/render/index.html`);
await page.waitForFunction(() => window.ready === true);

const only = process.argv.slice(2);
const list = STILLS.filter((s) => !only.length || only.includes(s.name));
for (const s of list) {
  const t0 = Date.now();
  const { w, h, data } = await page.evaluate((spec) => window.renderStill(spec), s);
  const raw = Buffer.from(data, 'base64');
  const outDir = join(ROOT, s.dir || 'assets/img/products');
  await mkdir(outDir, { recursive: true });
  const base = sharp(raw, { raw: { width: w, height: h, channels: 4 } })
    .resize(s.size[0], s.size[1], { kernel: 'lanczos3' });
  if (s.debug) await base.clone().png().toFile(join(outDir, `${s.name}.png`));
  for (const width of s.widths || [s.size[0]]) {
    const img = base.clone().resize(width);
    await img.clone().webp({ quality: 86, alphaQuality: 90, effort: 6, smartSubsample: true })
      .toFile(join(outDir, `${s.name}-${width}.webp`));
  }
  console.log(`${s.name}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
server.close();
