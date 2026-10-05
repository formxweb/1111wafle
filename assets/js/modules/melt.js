/* Ice cream melts a little when you touch it. A shared SVG displacement
   filter (#melt) is applied only while the wobble plays, then removed so
   it costs nothing at rest. */
import { onFrame } from '../core/loop.js';
import { prefersReducedMotion } from '../core/env.js';

export function initMelt(root = document) {
  if (prefersReducedMotion()) return;
  const map = document.querySelector('#melt feDisplacementMap');
  if (!map) return;
  let busy = false;

  const play = (el) => {
    if (busy) return;
    busy = true;
    const target = el.querySelector('img') || el;
    target.style.filter = 'url(#melt)';
    const t0 = performance.now();
    const D = 1400;
    const stop = onFrame((now) => {
      const t = Math.min(1, (now - t0) / D);
      // quick swell, slow settle — like a scoop slumping then holding
      const s = Math.sin(Math.PI * Math.pow(t, 0.6)) * 22 * (1 - t * 0.3);
      map.setAttribute('scale', s.toFixed(2));
      if (t >= 1) {
        stop();
        map.setAttribute('scale', '0');
        target.style.filter = '';
        busy = false;
      }
    });
  };

  root.querySelectorAll('[data-melt]').forEach((el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') play(el); });
    el.addEventListener('touchstart', () => play(el), { passive: true });
  });
}
