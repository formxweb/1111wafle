/* Scroll state read once per frame: position, smoothed velocity, viewport.
   Native scrolling is kept on purpose — no scroll hijacking. */
import { onFrame } from './loop.js';
import { clamp, damp } from './env.js';

export const scroll = {
  y: window.scrollY,
  vel: 0,          // smoothed, normalised roughly to -1..1
  raw: 0,
  vw: window.innerWidth,
  vh: window.innerHeight,
};

let prev = window.scrollY;
const listeners = new Set();

function measure() {
  scroll.vw = window.innerWidth;
  scroll.vh = window.innerHeight;
}
window.addEventListener('resize', measure, { passive: true });

onFrame((_, dt) => {
  const y = window.scrollY;
  const delta = y - prev;
  prev = y;
  scroll.y = y;
  scroll.raw = delta;
  const target = clamp(delta / (dt * 4000), -1, 1);
  scroll.vel = damp(scroll.vel, target, 8, dt);
  if (Math.abs(scroll.vel) < 0.0005) scroll.vel = 0;
  for (const fn of listeners) fn(scroll, dt);
});

export function onScrollFrame(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 0 when the element's top hits the viewport bottom, 1 when its bottom leaves the top. */
export function viewProgress(rect, vh = scroll.vh) {
  return clamp((vh - rect.top) / (vh + rect.height));
}

/** Progress through a sticky/pinned wrapper: 0 at pin start, 1 at pin end. */
export function pinProgress(rect, vh = scroll.vh) {
  const span = rect.height - vh;
  return span <= 0 ? 0 : clamp(-rect.top / span);
}
