/* Fits [data-fit] text to the width of its parent (or data-fit-width px),
   so wordmarks can fill the viewport edge to edge regardless of font metrics.
   Each [data-fit-line] child inside a [data-fit="lines"] parent is fitted
   individually (stacked mobile wordmarks). */

const items = new Set();

function fitOne(el) {
  const lines = el.dataset.fit === 'lines' ? [...el.querySelectorAll('[data-fit-line]')] : [el];
  const parent = el.parentElement;
  const cs = getComputedStyle(parent);
  const inner = parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const pad = parseFloat(el.dataset.fitPad || 0);
  const target = Math.max(0, inner - pad * 2);
  for (const line of lines) {
    if (!line.offsetParent && getComputedStyle(line).display === 'none') continue;
    line.style.fontSize = '100px';
    // measure the text itself, not the block it sits in
    const prevW = line.style.width;
    line.style.width = 'max-content';
    const w = line.getBoundingClientRect().width;
    line.style.width = prevW;
    if (!w) continue;
    const max = parseFloat(el.dataset.fitMax || Infinity);
    line.style.fontSize = `${Math.min(max, (100 * target) / w)}px`;
  }
  el.classList.add('is-fitted');
}

let raf = 0;
function refit() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => items.forEach(fitOne));
}

export function initFit(root = document) {
  root.querySelectorAll('[data-fit]').forEach((el) => items.add(el));
  if (!items.size) return;
  refit();
  document.fonts && document.fonts.ready.then(refit);
  let w = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === w) return; // ignore mobile URL-bar height changes
    w = window.innerWidth;
    refit();
  }, { passive: true });
}

export { refit };
