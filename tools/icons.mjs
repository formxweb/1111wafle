/* Raster icons from favicon.svg:  node tools/icons.mjs */
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(join(ROOT, 'favicon.svg'));
const out = [
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['assets/img/brand/icon-192.png', 192],
  ['assets/img/brand/icon-512.png', 512],
  ['assets/img/brand/cupistan-logo.png', 512],
];
for (const [file, size] of out) {
  await sharp(svg, { density: Math.ceil((72 * size) / 64) * 2 }).resize(size, size).png({ compressionLevel: 9 }).toFile(join(ROOT, file));
  console.log(file);
}
