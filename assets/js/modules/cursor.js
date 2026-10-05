/* Custom cursor: a dot that turns into a labelled disc on elements with
   [data-cursor="Label"] — it tells you what a click will do. */
import { onFrame } from '../core/loop.js';
import { damp, hasFinePointer, prefersReducedMotion } from '../core/env.js';

export function initCursor() {
  if (!hasFinePointer()) return;
  const el = document.createElement('div');
  el.className = 'cursor is-hidden';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="cursor__dot"></span><span class="cursor__ring"><span class="cursor__label"></span></span>';
  document.body.appendChild(el);
  document.documentElement.classList.add('has-cursor');
  const label = el.querySelector('.cursor__label');

  let x = -100, y = -100, cx = -100, cy = -100;
  const instant = prefersReducedMotion();

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    el.classList.remove('is-hidden');
  }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button, [role="tab"]');
    if (!t) {
      el.classList.remove('is-label', 'is-link');
      return;
    }
    const text = t.dataset.cursor;
    if (text) {
      label.textContent = text;
      el.classList.add('is-label');
      el.classList.remove('is-link');
    } else {
      el.classList.add('is-link');
      el.classList.remove('is-label');
    }
  });

  onFrame((_, dt) => {
    cx = instant ? x : damp(cx, x, 22, dt);
    cy = instant ? y : damp(cy, y, 22, dt);
    el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
  });
}
