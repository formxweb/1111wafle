/* Scroll parallax and pointer tilt for art-directed product scenes.
   [data-parallax="0.2"]  translateY by speed × distance from viewport centre
   [data-rotate="8"]      rotate (deg) across the same range
   [data-scale="0.1"]     scale up as the element passes the centre
   [data-tilt="10"]       3D tilt towards the pointer (fine pointers only)    */
import { onScrollFrame, scroll } from '../core/scroll.js';
import { onFrame } from '../core/loop.js';
import { clamp, damp, hasFinePointer, prefersReducedMotion } from '../core/env.js';

export function initParallax(root = document) {
  if (prefersReducedMotion()) return;
  const items = [...root.querySelectorAll('[data-parallax], [data-rotate], [data-scale]')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax || 0),
    rot: parseFloat(el.dataset.rotate || 0),
    scale: parseFloat(el.dataset.scale || 0),
    visible: false,
    top: 0,
    h: 0,
  }));
  if (!items.length) return;

  const measure = () => {
    for (const it of items) {
      const prev = it.el.style.transform;
      it.el.style.transform = 'none';
      const r = it.el.getBoundingClientRect();
      it.top = r.top + window.scrollY;
      it.h = r.height;
      it.el.style.transform = prev;
    }
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const it = items.find((i) => i.el === e.target);
      if (it) it.visible = e.isIntersecting;
    }
  }, { rootMargin: '20% 0px' });
  items.forEach((it) => io.observe(it.el));

  onScrollFrame((s) => {
    for (const it of items) {
      if (!it.visible) continue;
      const centre = it.top + it.h / 2 - s.y - s.vh / 2;
      const n = clamp(centre / (s.vh / 2 + it.h / 2), -1, 1); // -1 above … 1 below
      const ty = n * it.speed * s.vh * 0.5;
      const rz = n * it.rot;
      const sc = 1 + (1 - Math.abs(n)) * it.scale;
      it.el.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) rotate(${rz.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    }
  });
}

export function initTilt(root = document) {
  if (!hasFinePointer() || prefersReducedMotion()) return;
  root.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = parseFloat(el.dataset.tilt) || 8;
    const area = el.closest('[data-tilt-area]') || el.parentElement;
    let tx = 0, ty = 0, x = 0, y = 0, active = false, stop = null;
    const loop = (_, dt) => {
      x = damp(x, tx, 6, dt);
      y = damp(y, ty, 6, dt);
      el.style.transform = `perspective(1200px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
      el.style.setProperty('--lx', `${(50 + x * 40).toFixed(1)}%`);
      el.style.setProperty('--ly', `${(50 + y * 40).toFixed(1)}%`);
      if (!active && Math.abs(x) < 0.001 && Math.abs(y) < 0.001 && stop) { stop(); stop = null; }
    };
    area.addEventListener('pointermove', (e) => {
      const r = area.getBoundingClientRect();
      tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      active = true;
      if (!stop) stop = onFrame(loop);
    });
    area.addEventListener('pointerleave', () => { tx = 0; ty = 0; active = false; });
  });
}

export { scroll };
