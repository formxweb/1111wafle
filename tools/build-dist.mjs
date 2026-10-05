/**
 * Builds two deliverables from the source site:
 *
 *   dist/site/            Hosting package. JS bundled into one classic script,
 *                         so it also runs from a double-clicked index.html (file://).
 *   dist/CUPISTAN-site.zip   The same package, zipped for upload.
 *   dist/CUPISTAN.html    One self-contained file: home + menu, every font and
 *                         image embedded. Opens with a double click, no server.
 *
 *   npm install && node tools/build-dist.mjs
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = join(DIST, 'site');

const MIME = { '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

// ---------------------------------------------------------------- bundle JS
const bundle = await build({
  entryPoints: [join(ROOT, 'assets/js/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  write: false,
  legalComments: 'none',
});
const appJs = bundle.outputFiles[0].text;

// --------------------------------------------------------- hosting package
await rm(DIST, { recursive: true, force: true });
await mkdir(SITE, { recursive: true });
const COPY = ['index.html', 'menu.html', '404.html', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png',
  'site.webmanifest', 'robots.txt', 'sitemap.xml', '.htaccess', 'assets/css', 'assets/fonts', 'assets/img'];
for (const p of COPY) await cp(join(ROOT, p), join(SITE, p), { recursive: true });
await mkdir(join(SITE, 'assets/js'), { recursive: true });
await writeFile(join(SITE, 'assets/js/app.js'), appJs);

const toClassic = (html) => html
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  .replace('<script type="module" src="assets/js/main.js"></script>', '<script defer src="assets/js/app.js"></script>');

for (const page of ['index.html', 'menu.html']) {
  const p = join(SITE, page);
  await writeFile(p, toClassic(await readFile(p, 'utf8')));
}

await writeFile(join(SITE, 'BENI-OKU.txt'), `CUPISTAN — yayın paketi

Bu klasörün İÇİNDEKİLERİ sunucunuzun kök dizinine (Hostinger: public_html) yükleyin.
.htaccess dosyası gizli dosyadır; yüklendiğinden emin olun.

Bilgisayarda sunucusuz bakmak için bu klasörü değil, CUPISTAN.html dosyasını
çift tıklayarak açın (tarayıcılar file:// üzerinden ayrı font dosyalarını engeller).
`);
execFileSync('zip', ['-qr', '-X', join(DIST, 'CUPISTAN-site.zip'), '.'], { cwd: SITE });

// ------------------------------------------------------ single-file preview
const cache = new Map();
async function dataUri(rel, fromDir = ROOT) {
  const abs = resolve(fromDir, rel.split('#')[0].split('?')[0]);
  if (!cache.has(abs)) {
    const buf = await readFile(abs);
    cache.set(abs, `data:${MIME[extname(abs)] || 'application/octet-stream'};base64,${buf.toString('base64')}`);
  }
  return cache.get(abs);
}

async function replaceAsync(str, re, fn) {
  const jobs = [];
  str.replace(re, (...m) => { jobs.push(fn(...m)); return m[0]; });
  const out = await Promise.all(jobs);
  let i = 0;
  return str.replace(re, () => out[i++]);
}

async function inlineCss(file) {
  const css = await readFile(join(ROOT, file), 'utf8');
  const dir = dirname(join(ROOT, file));
  return replaceAsync(css, /url\("?([^")]+)"?\)/g, async (m, u) => (u.startsWith('data:') ? m : `url("${await dataUri(u, dir)}")`));
}

// one embedded size per image keeps the file small
function pickFromSrcset(srcset, target) {
  const list = srcset.split(',').map((s) => s.trim().split(/\s+/)).map(([u, w]) => [u, parseInt(w, 10)]).sort((a, b) => a[1] - b[1]);
  return (list.find(([, w]) => w >= target) || list[list.length - 1])[0];
}

async function singlePage(page) {
  let html = await readFile(join(ROOT, page), 'utf8');
  html = html
    .replace(/\s*<link rel="(preload|modulepreload|manifest|apple-touch-icon)"[^>]*>/g, '')
    .replace(/\s*<link rel="icon" href="favicon-32\.png"[^>]*>/g, '')
    .replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace('<script type="module" src="assets/js/main.js"></script>', () => `<script>${appJs.replace(/<\/script/gi, '<\\/script')}</script>`);
  html = await replaceAsync(html, /<link rel="stylesheet" href="([^"]+)">/g, async (m, href) => `<style>${await inlineCss(href)}</style>`);
  html = await replaceAsync(html, /<link rel="icon" href="([^"]+)" type="image\/svg\+xml">/g, async (m, href) => `<link rel="icon" href="${await dataUri(href)}" type="image/svg+xml">`);
  // <img src srcset sizes> → one embedded source
  html = await replaceAsync(html, /<img\b[^>]*>/g, async (tag) => {
    const srcset = tag.match(/\ssrcset="([^"]+)"/);
    const src = tag.match(/\ssrc="([^"]+)"/);
    const chosen = srcset ? pickFromSrcset(srcset[1], 800) : src && src[1];
    let out = tag.replace(/\s(srcset|sizes|fetchpriority)="[^"]*"/g, '');
    if (chosen && !chosen.startsWith('data:')) out = out.replace(/\ssrc="[^"]+"/, ` src="${await dataUri(chosen)}"`);
    return out;
  });
  html = await replaceAsync(html, /\s(data-follow-src|data-preview)="([^"]+)"/g, async (m, attr, u) => ` ${attr}="${await dataUri(u)}"`);
  return html;
}

const pages = { home: await singlePage('index.html'), menu: await singlePage('menu.html') };

// Each page runs in its own frame (its own JS realm). A tiny shim inside the
// page hands internal navigation to the shell instead of the file system.
const SHIM = `<script>
window.__cupHash=%HASH%;window.__cupArrive=%ARRIVE%;
window.__cupNavigate=function(h){parent.postMessage({cup:String(h)},'*')};
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href]');if(!a||e.defaultPrevented||a.target==='_blank')return;
  var h=a.getAttribute('href');
  if(h.charAt(0)==='#'){e.preventDefault();var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView({behavior:'smooth'});return;}
  if(/^(\\.\\/|\\/|index\\.html|menu\\.html)/.test(h)&&!a.hasAttribute('data-transition')){e.preventDefault();window.__cupNavigate(h);}
});
<\/script>`;

const json = (s) => JSON.stringify(s).replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const shell = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>CUPISTAN — Bir bardağa sığan ülke</title>
<meta name="theme-color" content="#0d0907">
<link rel="icon" href="${await dataUri('favicon.svg')}" type="image/svg+xml">
<style>html,body{margin:0;height:100%;background:#0d0907}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;display:block}</style>
</head>
<body>
<iframe id="view" title="CUPISTAN"></iframe>
<script>
var PAGES={home:${json(pages.home)},menu:${json(pages.menu)}};
var SHIM=${json(SHIM)};
var view=document.getElementById('view');
function show(name,hash,arrive){
  var shim=SHIM.replace('%HASH%',JSON.stringify(hash||'')).replace('%ARRIVE%',arrive?'true':'false');
  view.srcdoc=PAGES[name].replace('<head>','<head>'+shim);
  document.title=name==='menu'?'Menü — CUPISTAN':'CUPISTAN — Bir bardağa sığan ülke';
}
view.addEventListener('load',function(){try{view.contentWindow.focus()}catch(e){}});
addEventListener('message',function(e){
  if(e.source!==view.contentWindow||!e.data||typeof e.data.cup!=='string')return;
  var m=e.data.cup.match(/menu\\.html(?:#([\\w-]+))?/);
  show(m?'menu':'home',m&&m[1]?m[1]:'',true);
});
show(location.hash==='#menu'?'menu':'home','',false);
</script>
</body>
</html>
`;
await writeFile(join(DIST, 'CUPISTAN.html'), shell);

const size = async (p) => `${((await stat(p)).size / 1024 / 1024).toFixed(1)} MB`;
console.log(`dist/site/              hosting package (${(await readdir(SITE)).length} entries)`);
console.log(`dist/CUPISTAN-site.zip  ${await size(join(DIST, 'CUPISTAN-site.zip'))}`);
console.log(`dist/CUPISTAN.html      ${await size(join(DIST, 'CUPISTAN.html'))}`);
