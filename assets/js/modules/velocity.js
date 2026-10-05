/* Scroll velocity → CSS. Writes --vel (-1..1) on :root and drives marquees.
   Dondurma stretches like Maraş ice cream: fast scrolling literally pulls the
   type ([data-stretch]) wider through the font's width axis. */
import { onScrollFrame } from '../core/scroll.js';
import { prefersReducedMotion, clamp } from '../core/env.js';

export function initVelocity(root = document) {
  const rootStyle = document.documentElement.style;
  const reduce = prefersReducedMotion();
  const marquees = [...root.querySelectorAll('[data-marquee]')].map((el) => {
    const track = el.querySelector('.marquee__track');
    return { el, track, x: 0, speed: parseFloat(el.dataset.marquee) || 1, visible: false, width: 0 };
  });
  const stretchers = [...root.querySelectorAll('[data-stretch]')];

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const m = marquees.find((mm) => mm.el === e.target);
        if (m) m.visible = e.isIntersecting;
      }
    });
    marquees.forEach((m) => io.observe(m.el));
  } else marquees.forEach((m) => (m.visible = true));

  const measure = () => marquees.forEach((m) => { m.width = m.track ? m.track.scrollWidth / 2 : 0; });
  measure();
  window.addEventListener('resize', measure, { passive: true });
  document.fonts && document.fonts.ready.then(measure);

  let lastVel = 0;
  let lastStretch = 100;
  onScrollFrame((s, dt) => {
    const v = reduce ? 0 : s.vel;
    if (Math.abs(v - lastVel) > 0.002) {
      rootStyle.setProperty('--vel', v.toFixed(3));
      lastVel = v;
    }
    for (const m of marquees) {
      if (!m.visible || !m.track || !m.width) continue;
      const base = reduce ? 0 : 40 * m.speed;
      m.x -= (base + v * 900 * Math.sign(m.speed || 1)) * dt;
      m.x = -((((-m.x) % m.width) + m.width) % m.width);
      m.track.style.transform = `translate3d(${m.x}px,0,0)`;
    }
    if (!reduce && stretchers.length) {
      const w = Math.round(clamp(100 + Math.abs(v) * 70, 100, 125));
      if (w !== lastStretch) {
        lastStretch = w;
        for (const el of stretchers) el.style.fontStretch = `${w}%`;
      }
    }
  });
}
