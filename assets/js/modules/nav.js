/* Navigation steps aside while you read downwards and returns as soon as you
   scroll up — present, never in the way. */
import { onScrollFrame } from '../core/scroll.js';

export function initNav() {
  const nav = document.querySelector('[data-nav]');
  if (!nav) return;
  let acc = 0;
  let hidden = false;
  onScrollFrame((s) => {
    if (s.y < 120) {
      if (hidden) { nav.classList.remove('is-hidden'); hidden = false; }
      acc = 0;
      return;
    }
    acc = Math.sign(s.raw) === Math.sign(acc) ? acc + s.raw : s.raw;
    if (acc > 60 && !hidden) { nav.classList.add('is-hidden'); hidden = true; }
    else if (acc < -30 && hidden) { nav.classList.remove('is-hidden'); hidden = false; }
  });
  nav.addEventListener('focusin', () => { nav.classList.remove('is-hidden'); hidden = false; });
}
