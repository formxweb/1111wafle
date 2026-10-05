/* Adds .is-in to [data-reveal] / [data-reveal-group] once they enter the viewport. */

export function initReveal(root = document) {
  const els = root.querySelectorAll('[data-reveal], [data-reveal-group], .line[data-reveal-self]');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  els.forEach((el) => io.observe(el));
}
