/* One requestAnimationFrame loop for the whole site. Subscribers receive
   (time, dt in seconds). The loop sleeps when nothing is subscribed. */

const subscribers = new Set();
let running = false;
let last = 0;

function tick(now) {
  const dt = Math.min(0.064, (now - last) / 1000 || 0.016);
  last = now;
  for (const fn of subscribers) fn(now, dt);
  if (subscribers.size) requestAnimationFrame(tick);
  else running = false;
}

export function onFrame(fn) {
  subscribers.add(fn);
  if (!running) {
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
  return () => subscribers.delete(fn);
}
