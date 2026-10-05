/**
 * Visual + technical QA:  node tools/qa.mjs [outDir]
 * Needs the preview server running (npm run serve).
 * - viewport screenshots at key scroll positions (desktop + mobile)
 * - console errors, page errors and failed requests (any 4xx/5xx = broken link)
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = process.argv[2] || 'tools/qa-out';
await mkdir(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const SHOTS = {
  '/': [
    ['hero-0', 0], ['hero-1', '#icerik .hero@0.18'], ['hero-2', '#icerik .hero@0.46'], ['hero-3', '#icerik .hero@0.72'], ['hero-4', '#icerik .hero@0.99'],
    ['p01', '.scene--waffle@0.35'], ['p02', '.scene--cup@0.3'], ['p02b', '.scene--cup@0.6'], ['p03', '.scene--scoops@0.4'],
    ['p04', '.scene--eclair@0.35'], ['p05', '.scene--drinks@0.4'], ['story', '.story@0.25'], ['story2', '.story@0.6'],
    ['regions', '.regions@0.5'], ['social', '.social@0.2'], ['social2', '.social@0.55'], ['finale', 'end'],
  ],
  '/menu.html': [['menu-0', 0], ['menu-1', 600], ['menu-end', 'end']],
  '/menu.html#dondurma': [['menu-dondurma', 0]],
  '/menu.html#tatli': [['menu-tatli', 0]],
  '/menu.html#icecek': [['menu-icecek', 0]],
  '/404.html': [['404', 0]],
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const problems = [];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const onlyVp = process.env.VP;

for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  if (onlyVp && onlyVp !== vpName) continue;
  for (const [path, shots] of Object.entries(SHOTS)) {
    const ctx = await browser.newContext(vp);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${vpName} ${path}] console.${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push(`[${vpName} ${path}] pageerror: ${e.message}`));
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/404.html')) problems.push(`[${vpName} ${path}] HTTP ${r.status()}: ${r.url()}`); });
    page.on('requestfailed', (r) => problems.push(`[${vpName} ${path}] failed: ${r.url()} ${r.failure()?.errorText}`));
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    for (const [name, pos] of shots) {
      if (only.length && !only.includes(name)) continue;
      const y = await page.evaluate((pos) => {
        if (typeof pos === 'number') return pos;
        if (pos === 'end') return document.documentElement.scrollHeight;
        const [sel, frac] = pos.split('@');
        const el = document.querySelector(sel.replace('#icerik ', ''));
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        const top = r.top + window.scrollY;
        const span = el.classList.contains('hero') ? r.height - innerHeight : r.height;
        return top + span * parseFloat(frac);
      }, pos);
      // scroll in steps so scroll-linked code sees motion
      await page.evaluate(async (target) => {
        const start = window.scrollY;
        const steps = 12;
        for (let i = 1; i <= steps; i++) {
          window.scrollTo(0, start + ((target - start) * i) / steps);
          await new Promise((r) => requestAnimationFrame(() => r()));
        }
      }, y);
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${OUT}/${vpName}-${name}.jpg`, type: 'jpeg', quality: 80 });
    }
    await ctx.close();
  }
}
await browser.close();
console.log(problems.length ? problems.join('\n') : 'No console errors, page errors or failed requests.');
