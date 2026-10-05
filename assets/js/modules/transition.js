/* Page transition: a gold curtain fills the screen like a cup being filled,
   the next page opens from under it. Links opt in with [data-transition]. */
import { prefersReducedMotion } from '../core/env.js';

const KEY = 'cupistan:curtain';

// The single-file preview (tools/build-dist.mjs) hosts each page in a frame
// and provides its own navigation; everywhere else this is plain location.
const navigate = (href) => (window.__cupNavigate ? window.__cupNavigate(href) : (location.href = href));

function store(set) {
  if (set === undefined && window.__cupArrive) return true;
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
      const clear = (ev) => {
        if (ev.target !== curtain) return;
        curtain.removeEventListener('transitionend', clear);
        curtain.classList.remove('is-out');
      };
      curtain.addEventListener('transitionend', clear);
    }));
  }

  if (prefersReducedMotion()) return;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-transition]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const raw = a.getAttribute('href') || '';
    if (raw.startsWith('#') || a.target === '_blank') return; // same-page anchors scroll natively
    const url = new URL(a.href, location.href);
    // relative links are internal by definition; this also holds on file://
    // where URL origins serialise inconsistently ("null" vs "file://")
    const absolute = /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(raw);
    if (absolute && url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    const word = curtain.querySelector('.curtain__word');
    if (word && a.dataset.transition) word.textContent = a.dataset.transition;
    store(true);
    curtain.classList.remove('is-out');
    curtain.classList.add('is-in');
    let done = false;
    const go = () => { if (!done) { done = true; navigate(url.href); } };
    const onEnd = (ev) => {
      if (ev.target !== curtain || ev.propertyName !== 'clip-path') return;
      curtain.removeEventListener('transitionend', onEnd);
      go();
    };
    curtain.addEventListener('transitionend', onEnd);
    setTimeout(go, 900);
  });

  // back/forward cache: never come back to a covered page
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) curtain.classList.remove('is-in', 'is-cover', 'is-out');
  });
}
