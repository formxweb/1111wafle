/*
 * Product stills. Each entry renders one transparent WebP set into
 * assets/img/products (or `dir`). Camera units: the waffle is 1.0 wide.
 * To replace a render with a photograph keep the file name, aspect ratio
 * and widths — see README "Görsel slotları".
 */
import { heroUniforms, POSTER } from '../../assets/js/modules/hero-keys.js';

const CHOC = [0.2, 0.09, 0.045];
const PISTACHIO = [0.58, 0.6, 0.36];
const PISTACHIO_NUT = [0.5, 0.58, 0.28];
const CARAMEL = [0.8, 0.5, 0.2];
const CARAMEL_GLAZE = [0.5, 0.24, 0.07];
const BISCUIT = [0.74, 0.5, 0.27];
const STRAWBERRY = [0.86, 0.36, 0.42];
const VANILLA = [0.96, 0.92, 0.83];
const L = [-0.7, 0.9, 0.35];

const base = { ss: 2, light: L, exposure: 0.85, q: [0, 0, 0, 0], colC: PISTACHIO_NUT };

const scoop = (name, col, specks) => ({
  ...base, name, scene: 'scoops', size: [800, 1000], widths: [400, 800],
  cam: [0, 0.5, 2.95], target: [0, -0.24, 0], fov: 0.52, p: [0, -0.35, 1, 0], q: [0, specks, 0, 0], colA: col,
});
const shake = (name, col) => ({
  ...base, name, scene: 'shake', size: [1100, 1650], widths: [500, 800, 1100],
  cam: [0, 0.45, 4.05], target: [0, -0.06, 0], fov: 0.55, p: [0, -0.35, 0, 0], colB: col,
});
const eclair = (name, col, nuts) => ({
  ...base, name, scene: 'eclair', size: [1600, 900], widths: [800, 1200, 1600],
  cam: [0, 0.85, 2.25], target: [0, -0.03, 0], fov: 0.5, p: [nuts, 0.16, 0, 0], colB: col,
  light: [-0.5, 1.0, 0.6],
});

function heroFrame(name, p, extra = {}) {
  const u = heroUniforms(p);
  return { ...base, name, scene: 'hero', size: [1400, 1400], fov: POSTER.fov, light: POSTER.light,
    cam: u.camPos, target: u.camTarget, p: u.p, q: u.q, colB: CHOC, ...extra };
}

export const STILLS = [
  heroFrame('hero-poster', 0, { widths: [700, 1000, 1400] }),

  // Product scenes
  { ...base, name: 'waffle-fistik', scene: 'waffle', size: [1600, 1600], widths: [400, 800, 1200, 1600],
    cam: [0.35, 1.55, 2.05], target: [0, -0.06, 0], fov: 0.55, p: [1, 0.72, 0.12, 0], q: [0.25, 0, 1, 0.6], colB: CHOC },
  { ...base, name: 'cup-imza', scene: 'cup', size: [1200, 1500], widths: [400, 600, 900, 1200],
    cam: [0, 0.95, 3.45], target: [0, 0.06, 0], fov: 0.55, p: [0, -0.33, 0, 0], q: [1, 1, 0, 0], colA: VANILLA },
  { ...base, name: 'dondurma-uclu', scene: 'scoops', size: [1200, 1500], widths: [400, 600, 900, 1200],
    cam: [0, 0.85, 3.4], target: [0, 0.04, 0], fov: 0.52, p: [1, -0.35, 3, 0], q: [0, 1, 0, 0],
    colA: [0.68, 0.73, 0.43], colB: [0.36, 0.19, 0.1], colC: VANILLA },
  eclair('ekler-cikolata', CHOC, 0),
  eclair('ekler-fistik', PISTACHIO, 1),
  eclair('ekler-karamel', CARAMEL_GLAZE, 0),
  shake('shake-cikolata', CHOC),
  { ...base, name: 'kahve-turk', scene: 'coffee', size: [800, 800], widths: [400, 500, 800],
    cam: [0, 1.25, 2.3], target: [0, -0.2, 0], fov: 0.55, p: [0, 0.4, 1, 0] },

  // Menu items
  { ...base, name: 'waffle-klasik', scene: 'waffle', size: [800, 800], widths: [400, 800],
    cam: [0, 1.9, 1.9], target: [0, -0.05, 0], fov: 0.62, p: [1, 0.5, 0, 0], q: [1, 0, 0, 0], colB: CHOC },
  { ...base, name: 'waffle-karamel', scene: 'waffle', size: [800, 800], widths: [400, 800],
    cam: [0, 1.9, 1.9], target: [0, -0.05, 0], fov: 0.62, p: [1, 0.9, 0, 0], q: [0.2, 0, 1, 2.1], colB: CARAMEL, colC: BISCUIT },
  { ...base, name: 'cubuk-waffle', scene: 'stick', size: [800, 1000], widths: [400, 800],
    cam: [0, 0.2, 3.2], target: [0, -0.12, 0], fov: 0.55, p: [1, 0.35, -0.15, 0.15], colB: CHOC },
  scoop('dondurma-sade', VANILLA, 1),
  scoop('dondurma-fistik', [0.68, 0.73, 0.43], 1),
  scoop('dondurma-bitter', [0.33, 0.17, 0.09], 0),
  scoop('dondurma-cilek', [0.93, 0.62, 0.66], 0.6),
  scoop('dondurma-limon', [0.97, 0.92, 0.62], 0),
  { ...base, name: 'dondurma-cift', scene: 'scoops', size: [800, 1000], widths: [400, 800],
    cam: [0, 0.6, 3.15], target: [0, -0.12, 0], fov: 0.52, p: [1, -0.35, 2, 0], q: [0, 1, 0, 0],
    colA: VANILLA, colB: [0.36, 0.19, 0.1] },
  { ...base, name: 'profiterol', scene: 'profiterole', size: [800, 800], widths: [400, 800],
    cam: [0, 0.75, 3.1], target: [0, -0.12, 0], fov: 0.55, p: [0, -0.35, 0, 0], colB: CHOC },
  { ...base, name: 'brownie', scene: 'brownie', size: [800, 800], widths: [400, 800],
    cam: [0, 1.3, 2.5], target: [0, -0.08, 0], fov: 0.58, p: [1, 0.5, 0, 0], colA: VANILLA, colB: CHOC },
  shake('shake-karamel', CARAMEL),
  shake('shake-cilek', STRAWBERRY),
  { ...base, name: 'sicak-cikolata', scene: 'coffee', size: [800, 800], widths: [400, 800],
    cam: [0, 1.25, 2.3], target: [0, -0.2, 0], fov: 0.55, p: [1, 0.4, 0, 0] },
];
