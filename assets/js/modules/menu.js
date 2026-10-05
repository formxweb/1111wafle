/* Menu — four regions living on the four edges of the screen.
 * Progressive enhancement: without JS the regions are anchor links and all
 * categories are listed one after another. With JS they become ARIA tabs and
 * a category change swaps content, image and typography without a reload.
 * Hash + history keep every category linkable (menu.html#dondurma).
 */
import { prefersReducedMotion, hasFinePointer } from '../core/env.js';
import { refit } from './fit.js';

const OUT_MS = 420;

export function initMenu(root) {
  const compass = root.querySelector('[data-compass]');
  const tabs = [...compass.querySelectorAll('[data-tab]')];
  const panels = [...root.querySelectorAll('[data-panel]')];
  const ids = tabs.map((t) => t.dataset.tab);
  const reduce = prefersReducedMotion();
  const panelsWrap = root.querySelector('[data-panels]');

  compass.setAttribute('role', 'tablist');
  tabs.forEach((t) => {
    t.setAttribute('role', 'tab');
    t.id = `tab-${t.dataset.tab}`;
    t.setAttribute('aria-controls', t.dataset.tab);
  });
  panels.forEach((p) => {
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', `tab-${p.dataset.panel}`);
    p.tabIndex = 0;
    p.hidden = true;
  });
  root.classList.add('is-tabs');

  let current = null;
  let timer = 0;

  const fromHash = () => {
    const h = decodeURIComponent(location.hash.replace('#', ''));
    return ids.includes(h) ? h : null;
  };

  function select(id, { push = true, focus = false, instant = false } = {}) {
    if (!ids.includes(id) || id === current) return;
    const prev = panels.find((p) => p.dataset.panel === current);
    const next = panels.find((p) => p.dataset.panel === id);
    const dir = current ? Math.sign(ids.indexOf(id) - ids.indexOf(current)) || 1 : 1;
    current = id;

    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    root.dataset.active = id;
    root.style.setProperty('--dir', dir);
    if (focus) tabs[ids.indexOf(id)].focus();
    if (push) history.pushState({ id }, '', `#${id}`);

    clearTimeout(timer);
    const enter = () => {
      panels.forEach((p) => {
        if (p !== next) { p.hidden = true; p.classList.remove('is-in', 'is-out'); }
      });
      next.hidden = false;
      next.classList.remove('is-out');
      // restart the entrance choreography
      next.classList.remove('is-in');
      void next.offsetWidth;
      next.classList.add('is-in');
      refit();
      if (window.scrollY > panelsWrap.offsetTop) {
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
    };
    if (prev && !instant && !reduce) {
      prev.classList.add('is-out');
      timer = setTimeout(enter, OUT_MS);
    } else enter();
  }

  // clicks on regions
  compass.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    e.preventDefault();
    select(t.dataset.tab);
  });

  // keyboard: arrows move between regions, Home/End jump
  compass.addEventListener('keydown', (e) => {
    const i = ids.indexOf(current);
    let n = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = ids.length - 1;
    if (n === null) return;
    e.preventDefault();
    select(ids[n], { focus: true });
  });

  // touch: swipe sideways on the content to travel to the next region
  let sx = 0, sy = 0, st = 0;
  panelsWrap.addEventListener('touchstart', (e) => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = performance.now();
  }, { passive: true });
  panelsWrap.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (performance.now() - st > 700) return;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = ids.indexOf(current);
    select(ids[(i + (dx < 0 ? 1 : -1) + ids.length) % ids.length]);
  }, { passive: true });

  // pointing at a dish puts it on the stage — the list stays pure typography
  if (hasFinePointer()) {
    panels.forEach((p) => {
      const stage = p.querySelector('[data-stage]');
      const img = stage && stage.querySelector('img');
      if (!img) return;
      let shown = img.currentSrc || img.src;
      p.addEventListener('pointerover', (e) => {
        const row = e.target.closest('[data-preview]');
        if (!row) return;
        p.querySelectorAll('.is-hot').forEach((r) => r.classList.remove('is-hot'));
        row.classList.add('is-hot');
        const src = new URL(row.dataset.preview, location.href).href;
        if (src === shown) return;
        shown = src;
        const pre = new Image();
        pre.src = src;
        const swap = () => {
          if (shown !== src) return;
          stage.classList.remove('is-swap');
          void stage.offsetWidth;
          img.removeAttribute('srcset');
          img.src = src;
          img.alt = row.dataset.previewAlt || '';
          stage.classList.add('is-swap');
        };
        pre.decode ? pre.decode().then(swap, swap) : (pre.onload = swap);
      });
      p.addEventListener('pointerleave', () => p.querySelectorAll('.is-hot').forEach((r) => r.classList.remove('is-hot')));
    });
  }

  window.addEventListener('popstate', () => select(fromHash() || ids[0], { push: false }));

  // the compass steps back when the finale takes the stage
  const footer = document.querySelector('.finale');
  if (footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => root.classList.toggle('is-past', e.isIntersecting), { rootMargin: '0px 0px -30% 0px' }).observe(footer);
  }

  const initial = fromHash() || ids[0];
  if (fromHash()) {
    // stop the browser from jumping to the anchored panel
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }
  select(initial, { push: false, instant: true });
  history.replaceState({ id: initial }, '', location.hash ? `#${initial}` : location.pathname + location.search);
}
