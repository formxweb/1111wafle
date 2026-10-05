/* Magnetic buttons. Markup: <span class="magnet" data-magnetic><a class="btn">…</a></span>
   The wrapper is a larger invisible field; inside it the button leans
   towards the pointer and its label follows a little further. */
import { hasFinePointer, prefersReducedMotion } from '../core/env.js';

export function initMagnetic(root = document) {
  if (!hasFinePointer() || prefersReducedMotion()) return;
  root.querySelectorAll('[data-magnetic]').forEach((field) => {
    const el = field.firstElementChild;
    if (!el) return;
    const strength = parseFloat(field.dataset.magnetic) || 0.4;
    const label = el.querySelector('.btn__label');
    let raf = 0;
    field.addEventListener('pointermove', (e) => {
      const r = field.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)';
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
        if (label) label.style.transform = `translate3d(${dx * strength * 0.3}px, ${dy * strength * 0.3}px, 0)`;
      });
    });
    field.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      el.style.transition = 'transform .9s cubic-bezier(.34,1.4,.64,1)';
      el.style.transform = '';
      if (label) label.style.transform = '';
    });
  });
}
