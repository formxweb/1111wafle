/* Camera choreography for the hero, shared by the live hero and the poster
   renderer. Pure data + math, no DOM. Angles in radians. */

export const POSTER = { fov: 0.6, light: [-0.7, 0.9, 0.35] };

export const KEYS = [
  { at: 0.0, pitch: 0.785, yaw: 0.0, dist: 3.11, ty: 0.0, wYaw: 0.5, wPitch: 0.0, drop: 0, rise: 0, cupYaw: 0 },
  { at: 0.3, pitch: 0.66, yaw: 0.32, dist: 1.85, ty: -0.02, wYaw: 0.62, wPitch: 0.0, drop: 0, rise: 0, cupYaw: 0 },
  { at: 0.58, pitch: 0.42, yaw: 0.62, dist: 1.9, ty: -0.04, wYaw: 0.78, wPitch: -0.5, drop: 0, rise: 0, cupYaw: 0 },
  { at: 0.8, pitch: 0.32, yaw: 0.42, dist: 3.15, ty: 0.06, wYaw: 0.78, wPitch: -0.5, drop: 0.3, rise: 0.78, cupYaw: -0.25 },
  { at: 1.0, pitch: 0.3, yaw: 0.28, dist: 3.25, ty: 0.1, wYaw: 0.78, wPitch: -0.5, drop: 1, rise: 1, cupYaw: 0.15 },
];

// final tilt of the waffle wedge standing in the cup
const TILT = -1.15;

const clamp = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

export function sample(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smooth(clamp((p - a.at) / (b.at - a.at)));
  const out = {};
  for (const k of Object.keys(a)) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}

export function camFromKey(k) {
  const cp = Math.cos(k.pitch);
  return {
    camPos: [Math.sin(k.yaw) * cp * k.dist, Math.sin(k.pitch) * k.dist + k.ty, Math.cos(k.yaw) * cp * k.dist],
    camTarget: [0, k.ty, 0],
  };
}

/** Uniform values for the hero shader at scroll progress p. */
export function heroUniforms(p) {
  const k = sample(p);
  return { ...camFromKey(k), p: [k.drop, k.wYaw, k.wPitch, k.rise], q: [1, k.cupYaw, TILT, 0] };
}
