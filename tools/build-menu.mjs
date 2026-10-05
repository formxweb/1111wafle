/**
 * Builds the menu from data/menu.json:
 *   - category panels inside menu.html   (between <!-- menu:start --> / <!-- menu:end -->)
 *   - Menu JSON-LD inside menu.html       (between <!-- menu-ld:start --> / <!-- menu-ld:end -->)
 *   - prices on the home page             (elements with data-item="<item id>")
 *
 *   node tools/build-menu.mjs
 *
 * No dependencies. Image srcsets are built from the files that actually exist
 * in assets/img/products, so a missing size can never become a broken link.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://cupistan.com';
const IMG_DIR = 'assets/img/products';

const data = JSON.parse(await readFile(join(ROOT, 'data/menu.json'), 'utf8'));
const files = await readdir(join(ROOT, IMG_DIR));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = (n) => String(n).padStart(2, '0');
const price = (n) => `${n} ₺`;

function widths(name) {
  const re = new RegExp(`^${name}-(\\d+)\\.webp$`);
  const list = files.map((f) => f.match(re)).filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b);
  if (!list.length) throw new Error(`No image files for "${name}" in ${IMG_DIR}`);
  return list;
}
function srcset(name) {
  return widths(name).map((w) => `${IMG_DIR}/${name}-${w}.webp ${w}w`).join(', ');
}
function pick(name, target) {
  const ws = widths(name);
  return `${IMG_DIR}/${name}-${ws.find((w) => w >= target) || ws[ws.length - 1]}.webp`;
}

function item(it, i) {
  return `
          <li class="item" style="--i:${i}" data-preview="${pick(it.image, 900)}" data-preview-alt="${esc(it.name)}">
            <span class="item__no t-num" aria-hidden="true">${pad(i + 1)}</span>
            <span class="item__thumb" aria-hidden="true"><img src="${pick(it.image, 400)}" alt="" width="96" height="96" loading="lazy" decoding="async"></span>
            <h3 class="item__name">${esc(it.name)}${it.tag ? ` <em class="item__tag">${esc(it.tag)}</em>` : ''}</h3>
            <p class="item__desc">${esc(it.desc)}</p>
            <p class="item__price price" data-item="${it.id}"><data value="${it.price}">${price(it.price)}</data></p>
          </li>`;
}

function panel(cat, index) {
  const count = cat.flavours ? `${pad(cat.flavours.length)} aroma` : `${pad(cat.items.length)} çeşit`;
  const hero = cat.image;
  const heroItem = cat.items.find((it) => it.image === hero);
  const heroAlt = heroItem ? heroItem.name : cat.name;
  const flavours = cat.flavours
    ? `
        <div class="panel__flavours">
          <h3 class="panel__sub t-micro">Aromalar <span>— her bardakta seçilir</span></h3>
          <ul class="flavours">${cat.flavours
            .map((f, i) => `
            <li class="flavour" style="--i:${i}" data-preview="${pick(f.image, 900)}" data-preview-alt="${esc(f.name)} dondurma"><img class="flavour__img" src="${pick(f.image, 400)}" alt="" width="64" height="80" loading="lazy" decoding="async"><span>${esc(f.name)}</span></li>`)
            .join('')}
          </ul>
        </div>`
    : '';
  return `
      <section class="panel panel--${cat.id}" id="${cat.id}" data-panel="${cat.id}" aria-labelledby="${cat.id}-title">
        <header class="panel__head">
          <p class="panel__meta t-micro"><span>${cat.compass} — ${esc(cat.region)}</span><span>${count}</span></p>
          <h2 id="${cat.id}-title" class="panel__title"><span class="line"><span data-fit data-fit-max="300">${esc(cat.name)}</span></span></h2>
          <p class="panel__intro t-serif">${esc(cat.intro)}</p>
        </header>
        <figure class="panel__hero" data-stage>
          <picture class="slot">
            <img src="${pick(hero, 900)}" srcset="${srcset(hero)}" sizes="(max-width: 767px) 80vw, 36vw" alt="${esc(heroAlt)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
          </picture>
        </figure>
        <ol class="panel__list">${cat.items.map(item).join('')}
        </ol>${flavours}
      </section>`;
}

function jsonLd() {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Menu',
        '@id': `${SITE}/menu.html#menu`,
        name: 'CUPISTAN Menü',
        url: `${SITE}/menu.html`,
        inLanguage: 'tr-TR',
        hasMenuSection: data.categories.map((cat) => ({
          '@type': 'MenuSection',
          name: cat.name,
          description: cat.intro,
          url: `${SITE}/menu.html#${cat.id}`,
          hasMenuItem: cat.items.map((it) => ({
            '@type': 'MenuItem',
            name: it.name,
            description: it.desc,
            image: `${SITE}/${pick(it.image, 800)}`,
            offers: { '@type': 'Offer', price: String(it.price), priceCurrency: data.currency },
          })),
        })),
      },
      {
        '@type': ['FoodEstablishment', 'IceCreamShop'],
        '@id': `${SITE}/#isletme`,
        name: 'CUPISTAN',
        url: `${SITE}/`,
        hasMenu: { '@id': `${SITE}/menu.html#menu` },
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'İlyas Uzuner Cd. No:15/A',
          addressLocality: 'Gebze',
          addressRegion: 'Kocaeli',
          addressCountry: 'TR',
        },
      },
    ],
  };
  return `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n  </script>`;
}

function between(src, start, end, content) {
  const a = src.indexOf(start);
  const b = src.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`Markers ${start} … ${end} not found`);
  return src.slice(0, a + start.length) + content + src.slice(b);
}

// menu.html
const menuPath = join(ROOT, 'menu.html');
let menu = await readFile(menuPath, 'utf8');
menu = between(menu, '<!-- menu:start -->', '<!-- menu:end -->', `${data.categories.map(panel).join('\n')}\n      `);
menu = between(menu, '<!-- menu-ld:start -->', '<!-- menu-ld:end -->', `\n  ${jsonLd()}\n  `);
await writeFile(menuPath, menu);

// prices on the home page
const homePath = join(ROOT, 'index.html');
let home = await readFile(homePath, 'utf8');
const all = new Map(data.categories.flatMap((c) => c.items.map((it) => [it.id, it.price])));
let updated = 0;
home = home.replace(/data-item="([a-z0-9-]+)"([^>]*)><data value="\d+">[^<]*<\/data>/g, (m, id, rest) => {
  if (!all.has(id)) return m;
  updated++;
  return `data-item="${id}"${rest}><data value="${all.get(id)}">${price(all.get(id))}</data>`;
});
await writeFile(homePath, home);

console.log(`menu.html: ${data.categories.length} kategori, ${all.size} ürün · index.html: ${updated} fiyat`);
