/* Environment & small math helpers shared by every module. */

const mq = (q) => window.matchMedia(q);

export const media = {
  reduceMotion: mq('(prefers-reduced-motion: reduce)'),
  finePointer: mq('(hover: hover) and (pointer: fine)'),
  mobile: mq('(max-width: 767px)'),
};

export const prefersReducedMotion = () => media.reduceMotion.matches;
export const hasFinePointer = () => media.finePointer.matches;
export const isMobile = () => media.mobile.matches;

export const saveData = () => Boolean(navigator.connection && navigator.connection.saveData);

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function onIdle(fn, timeout = 1200) {
  if ('requestIdleCallback' in window) return window.requestIdleCallback(fn, { timeout });
  return window.setTimeout(fn, 1);
}
