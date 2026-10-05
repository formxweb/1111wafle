/* Hero — the origin of Cupistan told in one continuous shot.
 *
 *   01  the waffle, lit by a light you move   (camera dollies into macro)
 *   02  the chocolate fills pockets, runs over the edge  (camera drops low)
 *   03  the waffle leaves the plate for the cup  (cup rises, camera pulls back)
 *
 * The WebGL render takes over from a pixel-matched poster image once the
 * shader is compiled, so the first paint never waits for the GPU.
 */
import { onFrame } from '../core/loop.js';
import { scroll, pinProgress } from '../core/scroll.js';
import { clamp, damp, isMobile, prefersReducedMotion, saveData, onIdle } from '../core/env.js';

import { POSTER, heroUniforms } from './hero-keys.js';

export async function initHero(root) {
  const stage = root.querySelector('.hero__stage');
  const canvas = root.querySelector('.hero__canvas');
  const beats = [...root.querySelectorAll('[data-beat]')];
  const passes = [...root.querySelectorAll('[data-pass]')];
  const count = root.querySelector('.hero__count');
  const reduce = prefersReducedMotion();

  let p = 0;
  let beat = -1;

  // ---- type & caption choreography (runs with or without WebGL) ----------
  const updateDom = () => {
    root.style.setProperty('--p', p.toFixed(4));
    const next = p < 0.3 ? 0 : p < 0.66 ? 1 : 2;
    if (next !== beat) {
      beat = next;
      beats.forEach((b, i) => b.classList.toggle('is-active', i === beat));
      if (count) count.textContent = String(beat + 1).padStart(2, '0');
    }
    // each front word crosses the screen inside its own window
    const windows = [[0.02, 0.34], [0.3, 0.68], [0.62, 1.02]];
    passes.forEach((el, i) => {
      const [a, b] = windows[i];
      el.style.setProperty('--t', clamp((p - a) / (b - a)).toFixed(4));
    });
  };

  // ---- WebGL --------------------------------------------------------------
  let renderer = null;
  const canUseGL = !reduce && !saveData() && 'WebGL2RenderingContext' in window;

  const light = { x: 0, y: 0, tx: 0, ty: 0 };
  let scale = isMobile() ? 0.5 : 0.72;
  const maxScale = scale;
  let slow = 0, fast = 0;
  let visible = true;
  let size = { w: 0, h: 0, s: 1 };
  let first = true;

  const measure = () => {
    const r = stage.getBoundingClientRect();
    size = { w: r.width, h: r.height, s: Math.min(r.height, r.width * 1.25) };
    if (renderer) {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5) * scale;
      renderer.resize(Math.round(size.w * dpr), Math.round(size.h * dpr));
    }
  };

  const draw = (time) => {
    const u = heroUniforms(p);
    // the poster is a square of side S rendered with POSTER.fov; keep the
    // object the same size in a canvas of any aspect ratio
    const tanHalf = Math.tan(POSTER.fov / 2) * (size.h / size.s);
    const sway = Math.sin(time * 0.00035) * 0.18;
    const L = POSTER.light;
    renderer.set({
      ...u,
      fov: 2 * Math.atan(tanHalf),
      light: [L[0] + light.x * 1.6 + sway, L[1] - light.y * 0.5, L[2] + Math.abs(light.x) * 0.2 + sway * 0.4],
      colB: [0.2, 0.09, 0.045],
      exposure: 0.85,
      time: first ? 0 : time * 0.001,
    });
    renderer.render();
  };

  const start = async () => {
    try {
      const { ProductRenderer } = await import('../gl/renderer.js');
      await (document.fonts ? document.fonts.load('900 150px "Archivo"') : Promise.resolve());
      renderer = new ProductRenderer(canvas, 'hero', { steps: isMobile() ? 72 : 96, shadowSteps: isMobile() ? 16 : 24, label: true });
    } catch (err) {
      root.classList.add('is-static');
      return;
    }
    measure();
    window.addEventListener('resize', measure, { passive: true });

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(stage);

    onFrame((time, dt) => {
      if (!visible || document.hidden) return;
      light.x = damp(light.x, light.tx, 3, dt);
      light.y = damp(light.y, light.ty, 3, dt);
      draw(time);
      if (first) {
        first = false;
        // two frames later the canvas is on screen: crossfade from the poster
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-live')));
      }
      // adaptive resolution: keep the frame budget, never sacrifice scroll
      if (dt > 0.024) { slow++; fast = 0; } else if (dt < 0.0175) { fast++; slow = 0; }
      if (slow > 20 && scale > 0.34) { scale = Math.max(0.34, scale - 0.08); slow = 0; measure(); }
      if (fast > 240 && scale < maxScale) { scale = Math.min(maxScale, scale + 0.04); fast = 0; measure(); }
    });

    const point = (x, y) => {
      light.tx = clamp((x / size.w) * 2 - 1, -1, 1);
      light.ty = clamp((y / size.h) * 2 - 1, -1, 1);
    };
    stage.addEventListener('pointermove', (e) => point(e.clientX, e.clientY), { passive: true });
    stage.addEventListener('pointerleave', () => { light.tx = 0; light.ty = 0; });
    // touch: drag a finger across the waffle to move the light
    stage.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) point(t.clientX, t.clientY);
    }, { passive: true });
  };

  // CSS-only light on the stage background, for every device
  const glow = root.querySelector('.hero__light');
  stage.addEventListener('pointermove', (e) => {
    if (!glow) return;
    glow.style.setProperty('--gx', `${e.clientX.toFixed(0)}px`);
    glow.style.setProperty('--gy', `${e.clientY.toFixed(0)}px`);
  }, { passive: true });

  const rectCache = { top: 0, height: 0 };
  const measureRoot = () => {
    const r = root.getBoundingClientRect();
    rectCache.top = r.top + window.scrollY;
    rectCache.height = r.height;
    if (!renderer) {
      const sr = stage.getBoundingClientRect();
      size = { w: sr.width, h: sr.height, s: Math.min(sr.height, sr.width * 1.25) };
    }
  };
  measureRoot();
  window.addEventListener('resize', measureRoot, { passive: true });
  window.addEventListener('load', measureRoot);

  onFrame(() => {
    const top = rectCache.top - scroll.y;
    const np = pinProgress({ top, height: rectCache.height }, scroll.vh);
    if (Math.abs(np - p) > 0.0001 || beat < 0) {
      p = np;
      updateDom();
    }
  });

  if (canUseGL) {
    // compile after first paint so the poster is the LCP, not the shader
    onIdle(start, 600);
  } else {
    root.classList.add('is-static');
  }
}
