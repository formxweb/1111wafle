/* Cursor-follow preview: hovering a list item shows its product floating at
   the pointer, so the list stays pure typography until you ask for the image.
   Root: [data-follow]; items: [data-follow-src] (+ optional data-follow-srcset). */
import { onFrame } from '../core/loop.js';
import { damp, hasFinePointer, prefersReducedMotion } from '../core/env.js';

export function initFollow(root = document) {
  if (!hasFinePointer()) return;
  root.querySelectorAll('[data-follow]').forEach((area) => {
    const fig = document.createElement('div');
    fig.className = 'follow';
    fig.setAttribute('aria-hidden', 'true');
    fig.innerHTML = '<div class="follow__inner"><img alt="" decoding="async"></div>';
    document.body.appendChild(fig);
    const img = fig.querySelector('img');
    const reduce = prefersReducedMotion();
    let x = 0, y = 0, cx = 0, cy = 0, vx = 0, stop = null, current = null;

    const loop = (_, dt) => {
      const px = cx;
      cx = reduce ? x : damp(cx, x, 9, dt);
      cy = reduce ? y : damp(cy, y, 9, dt);
      vx = damp(vx, (cx - px) / Math.max(dt, 0.001), 10, dt);
      const rot = Math.max(-14, Math.min(14, vx * 0.012));
      fig.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotate(${rot.toFixed(2)}deg)`;
    };

    area.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      const item = e.target.closest('[data-follow-src]');
      if (item !== current) {
        current = item;
        if (item) {
          if (item.dataset.followSrcset) img.srcset = item.dataset.followSrcset;
          img.src = item.dataset.followSrc;
          img.sizes = '320px';
          fig.classList.add('is-on');
          fig.dataset.tone = item.dataset.followTone || '';
        } else fig.classList.remove('is-on');
      }
      if (!stop) { cx = x; cy = y; stop = onFrame(loop); }
    });
    area.addEventListener('pointerleave', () => {
      current = null;
      fig.classList.remove('is-on');
      if (stop) { stop(); stop = null; }
    });
  });
}
