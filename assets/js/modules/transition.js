/* Page transition: a gold curtain fills the screen like a cup being filled,
   the next page opens from under it. Links opt in with [data-transition]. */
import { prefersReducedMotion } from '../core/env.js';

const KEY = 'cupistan:curtain';

function store(set) {
  try {
    if (set === undefined) {
      const v = sessionStorage.getItem(KEY);
      sessionStorage.removeItem(KEY);
      return v === '1';
    }
    sessionStorage.setItem(KEY, '1');
  } catch { /* storage unavailable: transition still works one way */ }
  return false;
}

export function initTransition() {
  const curtain = document.querySelector('.curtain');
  if (!curtain) return;

  // arriving from an internal transition: start covered, then open
  if (store()) {
    curtain.classList.add('is-cover');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add('is-out');
      curtain.classList.remove('is-cover');
      curtain.addEventListener('transitionend', () => curtain.classList.remove('is-out'), { once: true });
    }));
  }

  if (prefersReducedMotion()) return;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-transition]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || a.target === '_blank') return;
    if (url.pathname === location.pathname && url.hash) return; // same-page anchors scroll natively
    e.preventDefault();
    const word = curtain.querySelector('.curtain__word');
    if (word && a.dataset.transition) word.textContent = a.dataset.transition;
    store(true);
    curtain.classList.remove('is-out');
    curtain.classList.add('is-in');
    let done = false;
    const go = () => { if (!done) { done = true; location.href = url.href; } };
    curtain.addEventListener('transitionend', go, { once: true });
    setTimeout(go, 900);
  });

  // back/forward cache: never come back to a covered page
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) curtain.classList.remove('is-in', 'is-cover', 'is-out');
  });
}
