/* CUPISTAN — entry point. Each page declares what it needs through data
   attributes; modules are only loaded when their markup is present. */
import { initFit } from './modules/fit.js';
import { initReveal } from './modules/reveal.js';
import { initCursor } from './modules/cursor.js';
import { initMagnetic } from './modules/magnetic.js';
import { initVelocity } from './modules/velocity.js';
import { initParallax, initTilt } from './modules/parallax.js';
import { initTransition } from './modules/transition.js';
import { initNav } from './modules/nav.js';

const $ = (s) => document.querySelector(s);

function boot() {
  initTransition();
  initFit();
  initReveal();
  initNav();
  initCursor();
  initMagnetic();
  initVelocity();
  initParallax();
  initTilt();

  const hero = $('[data-hero]');
  if (hero) import('./modules/hero.js').then((m) => m.initHero(hero));

  if ($('[data-follow]')) import('./modules/follow.js').then((m) => m.initFollow());
  if ($('[data-variants]')) import('./modules/variants.js').then((m) => m.initVariants());
  if ($('[data-melt]')) import('./modules/melt.js').then((m) => m.initMelt());
  if ($('[data-menu]')) import('./modules/menu.js').then((m) => m.initMenu($('[data-menu]')));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
