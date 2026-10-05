/* Variant switcher (e.g. éclair glazes). Buttons [data-variant="key"] inside
   [data-variants]; slides [data-variant-slide="key"]; text [data-variant-text].
   Touch: swipe horizontally on the stage to cycle. */

export function initVariants(root = document) {
  root.querySelectorAll('[data-variants]').forEach((box) => {
    const buttons = [...box.querySelectorAll('[data-variant]')];
    const slides = [...box.querySelectorAll('[data-variant-slide]')];
    const texts = [...box.querySelectorAll('[data-variant-text]')];
    const keys = buttons.map((b) => b.dataset.variant);
    let index = Math.max(0, buttons.findIndex((b) => b.getAttribute('aria-pressed') === 'true'));

    const show = (i, dir = 1) => {
      index = (i + keys.length) % keys.length;
      const key = keys[index];
      box.style.setProperty('--dir', dir);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.variant === key)));
      slides.forEach((s) => {
        const on = s.dataset.variantSlide === key;
        s.classList.toggle('is-active', on);
        s.toggleAttribute('inert', !on);
        s.setAttribute('aria-hidden', String(!on));
      });
      texts.forEach((t) => (t.hidden = t.dataset.variantText !== key));
      box.dataset.active = key;
    };

    buttons.forEach((b, i) => b.addEventListener('click', () => show(i, i >= index ? 1 : -1)));

    const stage = box.querySelector('[data-variant-stage]');
    if (stage) {
      let sx = 0, sy = 0, tracking = false;
      stage.addEventListener('touchstart', (e) => {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
      }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    show(index);
  });
}
