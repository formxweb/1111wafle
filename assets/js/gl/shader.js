/*
 * CUPISTAN — product shader.
 *
 * Every product visual on the site is a signed-distance-field "sculpture"
 * lit like a studio packshot. The same shader renders the live hero and the
 * offline stills in /assets/img/products (see tools/render).
 *
 * Scenes are compiled separately (#define SCENE_x) so each program only
 * contains the geometry it needs.
 */

export const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const COMMON = /* glsl */ `
precision highp float;
out vec4 outColor;

uniform vec2  uRes;
uniform vec2  uOffset;      // sub-pixel / tile offset in pixels
uniform vec2  uFull;        // full virtual resolution (for tiling)
uniform vec3  uCamPos;
uniform vec3  uCamTarget;
uniform float uFov;
uniform vec3  uLight;       // direction towards key light
uniform float uTime;
uniform vec4  uP;           // scene parameters
uniform vec4  uQ;           // more scene parameters
uniform vec3  uColA;        // sRGB flavour colours
uniform vec3  uColB;
uniform vec3  uColC;
uniform float uGround;      // 1 = render a shadow catcher
uniform float uExposure;

#define PI 3.14159265

vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x),
                 mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
                 mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p = p * 2.03 + 1.7; a *= .5; } return s; }

float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }

float sdRoundBox(vec3 p, vec3 b, float r){ vec3 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float sdBox2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdCyl(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }

// Material ids
#define M_WAFFLE   1.
#define M_CHOC     2.
#define M_CREAM    3.   // ice cream, colour uColA
#define M_CUP      4.
#define M_WHIP     5.
#define M_CHOUX    6.
#define M_NUT      7.
#define M_WOOD     8.
#define M_CERAMIC  9.
#define M_COFFEE   10.
#define M_GLAZE    11.  // coloured glaze, colour uColB
#define M_SPRINKLE 12.
#define M_LOKUM    13.
#define M_FRUIT    14.  // colour uColC
#define M_CREAM2   15.  // second ice cream flavour, colour uColB
#define M_CREAM3   16.  // third ice cream flavour, colour uColC
#define M_STRAW    17.
#define M_BROWNIE  18.

vec2 opU(vec2 a, vec2 b){ return a.x < b.x ? a : b; }

// ---------------------------------------------------------------------------
// Waffle: rounded slab with a grid of pockets on both faces.
// hs = half size (xz), ht = half thickness, cells = pocket grid.
// ---------------------------------------------------------------------------
float waffle(vec3 p, vec2 hs, float ht, vec2 cells){
  float puff = (vnoise(p * 3.3) - .5) * .035 + (vnoise(p * 9.0) - .5) * .008;
  float top = ht + puff;
  float body = sdRoundBox(p - vec3(0., puff * .5, 0.), vec3(hs.x, top, hs.y), min(.075, top * .8));
  vec2 c = hs * 2. / cells;
  vec2 id = clamp(floor((p.xz + hs) / c), vec2(0.), cells - 1.);
  vec2 q = p.xz + hs - (id + .5) * c;
  vec2 ps = c * .5 - .038;
  float depth = top * .72;
  float wob = (hash12(id + 3.1) - .5) * .012;
  float topP = sdRoundBox(vec3(q.x, p.y - top - wob, q.y), vec3(ps.x, depth, ps.y), .05);
  float botP = sdRoundBox(vec3(q.x, p.y + top, q.y), vec3(ps.x, depth, ps.y), .05);
  return smax(body, -min(topP, botP), .028);
}

// 0 at ridge, 1 at the centre of a pocket (xz only)
float wafflePocket(vec2 pxz, vec2 hs, vec2 cells){
  vec2 c = hs * 2. / cells;
  vec2 id = clamp(floor((pxz + hs) / c), vec2(0.), cells - 1.);
  vec2 q = pxz + hs - (id + .5) * c;
  vec2 ps = c * .5 - .038;
  return 1. - smoothstep(-.09, .01, sdBox2(q, ps - .03));
}

// Chocolate drizzle draped over a waffle top
float drizzle(vec3 p, vec2 hs, float ht, vec2 cells, float seed){
  float d = 1e5;
  vec2 dir = normalize(vec2(1., .28));
  vec2 per = vec2(-dir.y, dir.x);
  float u = dot(p.xz, dir), v = dot(p.xz, per);
  float sag = wafflePocket(p.xz, hs, cells);
  for (int i = 0; i < 3; i++){
    float fi = float(i);
    float k = 5.2 + fi * 1.9;
    float A = .07 + .03 * sin(fi * 2.1 + seed);
    float ph = fi * 2.3 + seed;
    float wob = (vnoise(vec3(u * 3.1 + fi * 7., fi, seed)) - .5) * .09;
    float off = (fi - 1.) * hs.x * .62 + wob;
    float arg = k * u + ph;
    float cv = off + A * sin(arg) + .02 * sin(arg * 2.7);
    float slope = A * k * cos(arg) + .054 * k * cos(arg * 2.7);
    float dv = (v - cv) / sqrt(1. + slope * slope);
    float r = .021 + .008 * vnoise(vec3(u * 9. + fi * 3., seed, 0.));
    // follow the rounded rim and run over the edge
    float e = sdBox2(p.xz, hs);
    float rr = .07;
    float ex = clamp(e + rr, 0., rr);
    float rim = rr - sqrt(max(rr * rr - ex * ex, 0.));
    float yc = ht + .004 + r * .3 - sag * .028 * step(e, -rr) - rim;
    float dd = (length(vec2(dv * .8, (p.y - yc) * 1.35)) - r) * .6;
    float lim = e + .004 - .03 * vnoise(vec3(u * 6., fi * 3., seed));
    d = min(d, max(dd, lim));
  }
  // a few pockets flooded with chocolate
  vec2 c = hs * 2. / cells;
  vec2 id = clamp(floor((p.xz + hs) / c), vec2(0.), cells - 1.);
  vec2 q = p.xz + hs - (id + .5) * c;
  if (hash12(id * 1.7 + seed) > .72){
    float pool = max(sdBox2(q, c * .5 - .045) - .02, p.y - (ht - .03));
    d = smin(d, max(pool, -(p.y - .0)), .01);
  }
  return d;
}

// Scooped ice cream ball with the ruffled lip a scoop leaves behind
float scoop(vec3 p, float r, float seed){
  float k = r / .22;
  float n = fbm(p * 4.2 / k + seed) - .5;
  float d = length(p * vec3(1., 1.06, 1.)) - r;
  float ang = atan(p.z, p.x);
  // curled sheets left by the scoop
  float folds = sin(dot(p / k, vec3(.35, 1., .2)) * 34. + n * 9. + seed) * .007;
  float lip = smoothstep(-.15 * r, -.5 * r, p.y) * (1. - smoothstep(-.7 * r, -.9 * r, p.y));
  d -= (n * .05 + folds) * k;
  d -= lip * (.02 + .014 * sin(ang * 9. + seed * 3.)) * k;
  return max(d * .75, -p.y - r * .8);
}

// Sauce cap with drips on a sphere-like surface centred at origin
float sauceCap(vec3 p, float r, float level, float seed){
  float ang = atan(p.z, p.x);
  float drip = pow(max(sin(ang * 3. + seed), 0.), 14.) * .7
             + pow(max(sin(ang * 5. + seed * 2.3), 0.), 18.) * .45
             + pow(max(sin(ang * 7. + seed * 4.1), 0.), 24.) * .3;
  float edge = r * level + .03 * sin(ang * 6. + seed) - drip * r;
  float shell = length(p * vec3(1., 1.06, 1.)) - (r + .02 + .01 * vnoise(p * 12.));
  return smax(shell, edge - p.y, .025) * .9;
}

// Truncated cone (open cup) along +y, base at y=0
float cupShell(vec3 p, float rb, float rt, float h, float wall){
  float k = (rt - rb) / h;
  float rr = rb + k * clamp(p.y, 0., h);
  float side = (length(p.xz) - rr) / sqrt(1. + k * k);
  float outer = max(side, max(-p.y, p.y - h));
  float inner = max(side + wall, -(p.y - wall));
  float d = max(outer, -inner);
  d = min(d, sdTorus(p - vec3(0., h, 0.), vec2(rt + .002, .016)));
  return d;
}
`;

// ---------------------------------------------------------------------------
// Scene definitions. Each returns vec2(distance, material).
// ---------------------------------------------------------------------------
const SCENES = {
  /* Belgian waffle quarter — hero object. uP.x = drizzle amount,
     uP.y = yaw, uP.z = pitch, uP.w = roll */
  waffle: /* glsl */ `
  #define HAS_SUGAR 1
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    p.yz *= rot(uP.z);
    p.xy *= rot(uP.w);
    vec2 hs = vec2(.5), cells = vec2(4.);
    float ht = .115;
    vec2 res = vec2(waffle(p, hs, ht, cells), M_WAFFLE);
    if (uP.x > 0.){
      float dz = drizzle(p, hs, ht, cells, 1.3 + uQ.w);
      res = opU(res, vec2(dz, M_GLAZE));
    }
    if (uQ.z > 0.){
      // crushed nuts / biscuit crumbs scattered over the top
      vec2 cell = vec2(.055);
      vec2 id = floor(p.xz / cell);
      float nd = 1e5;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
        vec2 cid = id + vec2(i, j);
        float h = hash12(cid + 11.);
        if (h < .42) continue;
        vec2 cp = (cid + .5 + (vec2(hash12(cid + 1.), hash12(cid + 2.)) - .5) * .7) * cell;
        if (max(abs(cp.x), abs(cp.y)) > hs.x - .06) continue;
        vec3 np = p - vec3(cp.x, ht + .018 - wafflePocket(cp, hs, cells) * .05, cp.y);
        np.xz *= rot(h * 6.);
        np.xy *= rot(h * 3. - 1.);
        np.yz *= rot(h * 5.);
        float sz = .45 + h * .55;
        vec3 rad = vec3(.016, .008, .012) * sz;
        float nb = (length(np / rad) - 1.) * min(rad.y, min(rad.x, rad.z));
        nb += (vnoise(np * 120. + h * 10.) - .5) * .004;
        nd = min(nd, nb * .8);
      }
      res = opU(res, vec2(nd, M_NUT));
    }
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); p.yz *= rot(uP.z); p.xy *= rot(uP.w); return p; }
  `,

  /* Hero sequence: waffle piece + Cupistan cup.
     uP.x = drop progress (0 waffle hero, 1 inside cup), uP.y = yaw,
     uP.z = pitch, uP.w = cup rise (0 hidden below, 1 in place) */
  hero: /* glsl */ `
  #define HAS_SUGAR 1
  #define HAS_LABEL 1
  vec3 heroLocal(vec3 p){
    float t = smoothstep(0., 1., uP.x);
    vec3 q = p - mix(vec3(0.), vec3(.04, .56, -.06), t);
    q /= mix(1., .62, t);
    q.xz *= rot(mix(uP.y, .2, t));
    q.yz *= rot(mix(uP.z, uQ.z, t));
    return q;
  }
  vec2 map(vec3 p){
    float t = smoothstep(0., 1., uP.x);
    float s = mix(1., .62, t);
    vec3 q = heroLocal(p);
    vec2 hs = vec2(.5), cells = vec2(4.);
    float ht = .115;
    vec2 res = vec2(waffle(q, hs, ht, cells) * s, M_WAFFLE);
    res = opU(res, vec2(drizzle(q, hs, ht, cells, 1.3) * s, M_GLAZE));
    // the cup rises from below the frame
    float rise = uP.w;
    if (rise > .001){
      vec3 c = p - vec3(0., mix(-3.4, -.6, rise), 0.);
      c.xz *= rot(uQ.y);
      float cup = cupShell(c, .30, .42, .92, .014);
      res = opU(res, vec2(cup, M_CUP));
      float fill = max(length(c.xz) - .4, abs(c.y - .84) - .03);
      fill = smin(fill, length(c - vec3(-.08, .84, .1)) - .1, .12);
      res = opU(res, vec2(fill, M_GLAZE));
    }
    return res;
  }
  vec3 localPos(vec3 p, float m){
    if (m == M_CUP){
      vec3 c = p - vec3(0., mix(-3.4, -.6, uP.w), 0.);
      c.xz *= rot(uQ.y);
      return c;
    }
    return heroLocal(p);
  }
  `,

  /* The Cupistan Cup — waffle bites, a scoop, chocolate.
     uColA = scoop colour */
  cup: /* glsl */ `
  #define HAS_SUGAR 1
  #define HAS_LABEL 1
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    vec3 c = p - vec3(0., -.75, 0.);
    vec2 res = vec2(cupShell(c, .30, .42, .92, .014), M_CUP);
    // two waffle wedges standing behind the scoop like a crown
    for (int i = 0; i < 2; i++){
      float side = float(i) * 2. - 1.;
      vec3 q = c - vec3(side * .16, 1.2, -.12);
      q.xz *= rot(side * .35);
      q.xy *= rot(side * .42);
      q.yz *= rot(1.32);
      res = opU(res, vec2(waffle(q, vec2(.15, .25), .055, vec2(2., 3.)), M_WAFFLE));
    }
    // bites resting on the rim
    for (int i = 0; i < 3; i++){
      float fi = float(i);
      float a = fi * 2.4 + .9;
      vec3 q = c - vec3(cos(a) * .3, .95, sin(a) * .22 - .02);
      q.xz *= rot(fi * 1.3 + .4);
      q.xy *= rot(.45 * sin(fi * 2.7));
      res = opU(res, vec2(waffle(q, vec2(.09), .05, vec2(2.)), M_WAFFLE));
    }
    // scoop
    vec3 sp = c - vec3(-.01, 1.17, .07);
    res = opU(res, vec2(scoop(sp, .24, 2.), M_CREAM));
    res = opU(res, vec2(sauceCap(sp, .24, .42, 1.), M_CHOC));
    // nuts on top
    float nd = 1e5;
    for (int i = 0; i < 7; i++){
      float fi = float(i);
      vec3 np = sp - normalize(vec3(sin(fi * 2.1) * .7, 1.2, cos(fi * 2.1) * .7 + .1)) * .262;
      np.xy *= rot(fi);
      nd = min(nd, sdRoundBox(np, vec3(.022, .012, .016), .008));
    }
    res = opU(res, vec2(nd, M_NUT));
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); return p - vec3(0., -.75, 0.); }
  `,

  /* Scoops in a cup. uColA/B/C = flavours, uP.z = count (1..3), uP.x = sauce */
  scoops: /* glsl */ `
  #define HAS_LABEL 1
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    vec3 c = p - vec3(0., -.85, 0.);
    vec2 res = vec2(cupShell(c, .27, .38, .70, .014), M_CUP);
    float n = uP.z;
    vec3 top;
    if (n < 1.5){
      vec3 s1 = c - vec3(0., .9, .02);
      res = opU(res, vec2(scoop(s1, .3, 3.), M_CREAM));
      top = s1;
      if (uP.x > 0.) res = opU(res, vec2(sauceCap(s1, .3, .45, 2.), M_CHOC));
    } else if (n < 2.5){
      vec3 s1 = c - vec3(-.12, .84, .02);
      vec3 s2 = c - vec3(.1, 1.08, -.02);
      res = opU(res, vec2(scoop(s1, .25, 1.), M_CREAM));
      res = opU(res, vec2(scoop(s2, .24, 5.), M_CREAM2));
      if (uP.x > 0.) res = opU(res, vec2(sauceCap(s2, .24, .5, 2.), M_CHOC));
    } else {
      vec3 s1 = c - vec3(-.13, .86, .06);
      vec3 s2 = c - vec3(.15, .83, -.04);
      vec3 s3 = c - vec3(.01, 1.16, .0);
      res = opU(res, vec2(scoop(s1, .23, 1.), M_CREAM));
      res = opU(res, vec2(scoop(s2, .225, 4.), M_CREAM2));
      res = opU(res, vec2(scoop(s3, .225, 7.), M_CREAM3));
      if (uP.x > 0.) res = opU(res, vec2(sauceCap(s3, .225, .5, 2.), M_CHOC));
    }
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); return p - vec3(0., -.85, 0.); }
  `,

  /* Profiteroles in a cup under chocolate. */
  profiterole: /* glsl */ `
  #define HAS_LABEL 1
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    vec3 c = p - vec3(0., -.85, 0.);
    vec2 res = vec2(cupShell(c, .27, .38, .70, .014), M_CUP);
    float pd = 1e5;
    float sd = 1e5;
    for (int i = 0; i < 4; i++){
      float fi = float(i);
      vec3 o = i < 3 ? vec3(cos(fi * 2.09 + .3) * .17, .8, sin(fi * 2.09 + .3) * .17) : vec3(0., 1.04, .0);
      vec3 q = c - o;
      float r = .17;
      float b = length(q * vec3(1., 1.12, 1.)) - r - (fbm(q * 9. + fi) - .5) * .04;
      pd = min(pd, b * .8);
      sd = min(sd, sauceCap(q, r, i < 3 ? .35 : .1, fi * 1.7));
    }
    res = opU(res, vec2(pd, M_CHOUX));
    res = opU(res, vec2(sd, M_GLAZE));
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); return p - vec3(0., -.85, 0.); }
  `,

  /* Brownie square with a crackled top and a scoop. */
  brownie: /* glsl */ `
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    vec3 b = p - vec3(0., -.25, 0.);
    float crack = (fbm(b * 7.) - .5) * .05;
    float body = sdRoundBox(b, vec3(.42, .16 + crack * .4, .42), .05) ;
    vec2 res = vec2(body * .85, M_BROWNIE);
    vec3 s1 = b - vec3(.05, .38, .02);
    if (uP.x > 0.) {
      res = opU(res, vec2(scoop(s1, .22, 2.), M_CREAM));
      res = opU(res, vec2(sauceCap(s1, .22, .5, 4.), M_GLAZE));
    }
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); return p - vec3(0., -.25, 0.); }
  `,

  /* Éclair. uColB = glaze colour, uP.x = nuts amount */
  eclair: /* glsl */ `
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    p.yz *= rot(uP.z);
    float L = .62, R = .2;
    vec3 q = p;
    float lump = (fbm(q * 5.5) - .5) * .05 + sin(q.x * 18.) * .006;
    float body = sdCapsule(q, vec3(-L, 0., 0.), vec3(L, 0., 0.), R + lump);
    body = smax(body, -q.y - .1, .05);
    vec2 res = vec2(body * .85, M_CHOUX);
    float wav = .025 * sin(q.x * 9. + 1.) + .015 * sin(q.x * 23.);
    float glaze = sdCapsule(q, vec3(-L + .02, 0., 0.), vec3(L - .02, 0., 0.), R + .022 + lump * .9);
    glaze = smax(glaze, (.02 + wav) - q.y, .02);
    res = opU(res, vec2(glaze * .85, M_GLAZE));
    if (uP.x > 0.){
      // crushed nuts along the ridge
      vec2 cell = vec2(.07, .07);
      vec2 id = floor(q.xz / cell);
      float nd = 1e5;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
        vec2 cid = id + vec2(i, j);
        float h = hash12(cid);
        if (h < .45) continue;
        vec2 cp = (cid + .5 + (vec2(hash12(cid + 1.), hash12(cid + 2.)) - .5) * .6) * cell;
        if (abs(cp.x) > L - .02 || abs(cp.y) > .1) continue;
        float y = sqrt(max(R * R - cp.y * cp.y, 0.)) + .03;
        vec3 np = q - vec3(cp.x, y, cp.y);
        np.xz *= rot(h * 6.);
        np.xy *= rot(h * 3.);
        np.yz *= rot(h * 4.);
        float sz = .6 + h * .6;
        vec3 rad = vec3(.016, .008, .012) * sz;
        float nb = (length(np / rad) - 1.) * min(rad.y, min(rad.x, rad.z)) + (vnoise(np * 120. + h * 7.) - .5) * .004;
        nd = min(nd, nb * .8);
      }
      res = opU(res, vec2(nd, M_NUT));
    }
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); p.yz *= rot(uP.z); return p; }
  `,

  /* Milkshake in a tall cup. uColA = cup liquid tint, uColB = drizzle */
  shake: /* glsl */ `
  #define HAS_LABEL 1
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    vec3 c = p - vec3(0., -1.0, 0.);
    float H = 1.15;
    vec2 res = vec2(cupShell(c, .27, .36, H, .014), M_CUP);
    // dome of whipped cream, star piped
    vec3 w = c - vec3(0., H - .02, 0.);
    float ang = atan(w.z, w.x);
    float hc = .42;
    float y = clamp(w.y / hc, 0., 1.);
    float rmax = .37 * pow(1. - y, .75) * (1. + .07 * cos(ang * 8. + w.y * 14.));
    float wd = (length(w.xz) - rmax) * .55;
    wd = max(wd, -w.y);
    wd = smax(wd, w.y - hc, .05);
    res = opU(res, vec2(wd, M_WHIP));
    // drizzle spiral over the cream
    float sp = abs(sin(ang * 1. + w.y * 26.)) - .12;
    float dz = max(wd - .012, sp * .05);
    dz = max(dz, -(wd + .004));
    res = opU(res, vec2(dz, M_GLAZE));
    // straw
    vec3 sa = vec3(.06, H + .1, .05), sb = vec3(.2, H + .75, -.02);
    float straw = sdCapsule(c, sa, sb, .03);
    res = opU(res, vec2(straw, M_STRAW));
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); return p - vec3(0., -1.0, 0.); }
  `,

  /* Waffle on a stick, half dipped. uColB = coating colour */
  stick: /* glsl */ `
  #define HAS_SUGAR 0
  vec2 map(vec3 p){
    p.xy *= rot(uP.w);
    p.xz *= rot(uP.y);
    p.yz *= rot(uP.z);
    vec2 hs = vec2(.24, .55), cells = vec2(2., 5.);
    float ht = .085;
    vec3 q = p.xzy; // stand upright: waffle plane = xy
    q = vec3(p.x, p.z, p.y);
    float w = waffle(q, hs, ht, cells);
    vec2 res = vec2(w, M_WAFFLE);
    float edge = .02 + .05 * sin(p.x * 14. + 1.) + .1 * pow(max(sin(p.x * 9. + 2.), 0.), 8.);
    float coat = smax(w - .016, edge - p.y, .02);
    res = opU(res, vec2(coat, M_GLAZE));
    // sprinkles on the coating
    if (uP.x > 0.){
      vec3 sq = q;
      vec2 cell = vec2(.06);
      vec2 id = floor(sq.xy / cell);
      float nd = 1e5;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
        vec2 cid = id + vec2(i, j);
        float h = hash12(cid + 7.);
        if (h < .5) continue;
        vec2 cp = (cid + .5 + (vec2(hash12(cid + 1.), hash12(cid + 2.)) - .5) * .6) * cell;
        if (abs(cp.x) > hs.x - .03 || cp.y < .12 || cp.y > hs.y - .03) continue;
        vec3 np = sq - vec3(cp, ht + .03);
        np.xy *= rot(h * 9.);
        nd = min(nd, sdCapsule(np, vec3(-.016, 0., 0.), vec3(.016, 0., 0.), .007));
      }
      res = opU(res, vec2(nd, M_SPRINKLE));
    }
    float stick = sdRoundBox(p - vec3(0., -hs.y - .3, 0.), vec3(.035, .4, .012), .01);
    res = opU(res, vec2(stick, M_WOOD));
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xy *= rot(uP.w); p.xz *= rot(uP.y); p.yz *= rot(uP.z); return vec3(p.x, p.z, p.y); }
  `,

  /* Turkish coffee with lokum. */
  coffee: /* glsl */ `
  vec2 map(vec3 p){
    p.xz *= rot(uP.y);
    vec3 c = p - vec3(0., -.42, 0.);
    // saucer
    float sau = sdCyl(c - vec3(0., .02, 0.), .5, .012) - .012;
    sau = smax(sau, -(sdCyl(c - vec3(0., .05, 0.), .36, .02)), .05);
    vec2 res = vec2(sau, M_CERAMIC);
    // cup body
    vec3 k = c - vec3(0., .06, 0.);
    float H = .42;
    float rr = .19 + .02 * smoothstep(0., H, k.y) - .02 * smoothstep(.0, .08, -k.y + .08);
    float side = length(k.xz) - rr;
    float outer = max(side, max(-k.y, k.y - H));
    float inner = max(side + .016, -(k.y - .03));
    float cup = smax(outer, -inner, .008);
    cup = min(cup, sdTorus(k - vec3(0., H, 0.), vec2(rr + .0, .01)));
    // handle
    vec3 hp = k - vec3(rr + .06, H * .55, 0.);
    hp = hp.xzy;
    float handle = sdTorus(hp, vec2(.075, .02));
    handle = max(handle, -(k.x - rr + .005));
    cup = min(cup, handle);
    res = opU(res, vec2(cup, M_CERAMIC));
    // coffee surface with foam
    float surf = max(length(k.xz) - rr + .01, abs(k.y - (H - .045)) - .008);
    res = opU(res, vec2(surf, M_COFFEE));
    if (uP.z > 0.){
      // lokum on the saucer
      vec3 lp = c - vec3(-.31, .1, .2);
      lp.xz *= rot(.6);
      res = opU(res, vec2(sdRoundBox(lp, vec3(.06, .055, .06), .022), M_LOKUM));
    }
    return res;
  }
  vec3 localPos(vec3 p, float m){ p.xz *= rot(uP.y); return p - vec3(0., -.42, 0.); }
  `,
};

const RENDER = /* glsl */ `
#ifndef HAS_SUGAR
#define HAS_SUGAR 0
#endif
#ifndef HAS_LABEL
#define HAS_LABEL 0
#endif

#ifndef STEPS
#define STEPS 140
#endif
#ifndef SHADOW_STEPS
#define SHADOW_STEPS 40
#endif

vec3 calcNormal(vec3 p, float t){
  float e = .0008 + t * .0002;
  vec2 k = vec2(1, -1);
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x +
                   k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

float softShadow(vec3 ro, vec3 rd, float k){
  float res = 1., t = .02;
  for (int i = 0; i < SHADOW_STEPS; i++){
    float h = map(ro + rd * t).x;
    res = min(res, k * h / t);
    t += clamp(h, .012, .2);
    if (res < .002 || t > 4.) break;
  }
  return clamp(res, 0., 1.);
}

float calcAO(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for (int i = 0; i < 5; i++){
    float h = .012 + .07 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= .75;
  }
  return clamp(1. - 2.2 * o, 0., 1.);
}

// soft studio environment used for reflections
vec3 env(vec3 r, vec3 L, vec3 Rl){
  vec3 key = vec3(1., .82, .62);
  float box = pow(max(dot(r, L), 0.), 18.) * 2.6 + pow(max(dot(r, L), 0.), 200.) * 6.;
  float rim = pow(max(dot(r, Rl), 0.), 12.) * 1.1;
  float top = smoothstep(.2, 1., r.y) * .18;
  return key * box + vec3(1., .93, .85) * rim + vec3(.9, .8, .7) * top + vec3(.012, .008, .006);
}

#if HAS_LABEL
uniform sampler2D uLabel;
#endif

struct Mat { vec3 alb; float rough; float spec; float sss; vec3 nOff; };

Mat material(float m, vec3 p, vec3 lp, vec3 n){
  Mat M;
  M.alb = vec3(.5); M.rough = .6; M.spec = .04; M.sss = 0.; M.nOff = vec3(0.);
  if (m == M_WAFFLE){
    float h = fbm(lp * 6.);
    float fine = vnoise(lp * 34.);
    // top of the ridges touched the iron longest: deeper colour
    float topness = smoothstep(.03, .11, lp.y);
    float edge = smoothstep(.36, .5, max(abs(lp.x), abs(lp.z)));
    vec3 pale  = toLin(vec3(.90, .64, .30));
    vec3 gold  = toLin(vec3(.78, .47, .17));
    vec3 deep  = toLin(vec3(.52, .25, .08));
    vec3 burnt = toLin(vec3(.30, .13, .05));
    vec3 c = mix(pale, gold, smoothstep(.25, .7, h));
    c = mix(c, deep, clamp(topness * .75 + edge * .35 + (h - .5) * .6, 0., 1.));
    c = mix(c, burnt, smoothstep(.66, .9, h) * topness * .55);
    c *= .88 + fine * .22;
    M.alb = c; M.rough = .5; M.spec = .045; M.sss = .3;
    M.nOff = (vec3(vnoise(lp * 46.), vnoise(lp * 46. + 9.), vnoise(lp * 46. + 17.)) - .5) * .5;
#if HAS_SUGAR
    float dust = smoothstep(.62, .95, fbm(lp * 22. + 4.)) * smoothstep(.6, .95, n.y);
    float grain = step(.82, hash13(floor(lp * 340.))) * smoothstep(.5, .95, n.y) * smoothstep(.4, .7, fbm(lp * 9.));
    M.alb = mix(M.alb, vec3(.9, .88, .85), clamp(dust * .85 + grain * .8, 0., 1.) * uQ.x);
#endif
  } else if (m == M_CHOC){
    M.alb = toLin(vec3(.2, .09, .045)); M.rough = .1; M.spec = .07; M.sss = .05;
  } else if (m == M_CREAM || m == M_CREAM2 || m == M_CREAM3){
    vec3 col = m == M_CREAM ? uColA : (m == M_CREAM2 ? uColB : uColC);
    float speck = step(.93, hash13(floor(lp * 120.)));
    M.alb = toLin(col) * (.92 + .16 * vnoise(lp * 20.));
    M.alb = mix(M.alb, M.alb * .45, speck * uQ.y);
    M.rough = .55; M.spec = .03; M.sss = .85;
  } else if (m == M_CUP){
    // matte black paper cup with a cream wordmark band
    M.alb = toLin(vec3(.075, .065, .06)); M.rough = .7; M.spec = .03;
#if HAS_LABEL
    float a = atan(lp.z, lp.x) / (2. * PI) + .5;
    float yy = lp.y;
    vec2 uv = vec2(1. - fract(a * 2. + .02), 1. - clamp((yy - .18) / .5, 0., 1.));
    float lab = (yy > .18 && yy < .68) ? texture(uLabel, uv).r : 0.;
    M.alb = mix(M.alb, toLin(vec3(.95, .9, .82)), lab);
    float band = smoothstep(.005, 0., abs(yy - .12) - .012);
    M.alb = mix(M.alb, toLin(vec3(.91, .64, .23)), band);
#endif
  } else if (m == M_WHIP){
    M.alb = toLin(vec3(.97, .94, .88)); M.rough = .5; M.spec = .03; M.sss = .7;
  } else if (m == M_CHOUX){
    float h = fbm(lp * 9.);
    M.alb = mix(toLin(vec3(.86, .58, .28)), toLin(vec3(.6, .32, .12)), smoothstep(.3, .75, h));
    M.rough = .6; M.spec = .03; M.sss = .2;
    M.nOff = (vec3(vnoise(lp * 30.), vnoise(lp * 30. + 9.), vnoise(lp * 30. + 17.)) - .5) * .5;
  } else if (m == M_NUT){
    float fl = vnoise(lp * 260.);
    M.alb = toLin(mix(uColC, uColC * vec3(1.25, 1.12, .9), hash13(floor(lp * 40.)) * .8));
    M.alb = mix(M.alb, toLin(uColC * vec3(.75, .45, .4)), smoothstep(.62, .8, fl) * .8);
    M.rough = .5; M.spec = .04; M.sss = .3;
  } else if (m == M_WOOD){
    M.alb = toLin(vec3(.85, .72, .52)) * (.85 + .15 * sin(lp.y * 120. + vnoise(lp * 20.) * 4.));
    M.rough = .7;
  } else if (m == M_CERAMIC){
    M.alb = toLin(vec3(.93, .9, .85)); M.rough = .15; M.spec = .05;
    float a = atan(lp.z, lp.x);
    float rim = smoothstep(.004, 0., abs(lp.y - .44) - .006);
    M.alb = mix(M.alb, toLin(vec3(.85, .6, .22)), rim);
  } else if (m == M_COFFEE){
    float f = fbm(lp * 26.);
    M.alb = mix(toLin(vec3(.25, .13, .06)), toLin(vec3(.52, .33, .17)), smoothstep(.35, .7, f));
    if (uP.x > 0.) M.alb = mix(toLin(vec3(.22, .1, .05)), toLin(vec3(.36, .18, .09)), smoothstep(.3, .8, f));
    M.rough = .35; M.spec = .04;
  } else if (m == M_STRAW){
    M.alb = toLin(vec3(.91, .64, .23)); M.rough = .25; M.spec = .05;
  } else if (m == M_BROWNIE){
    float h = fbm(lp * 10.);
    float top = smoothstep(.08, .16, lp.y);
    M.alb = mix(toLin(vec3(.2, .1, .055)), toLin(vec3(.33, .18, .1)), smoothstep(.3, .7, h));
    M.alb = mix(M.alb, toLin(vec3(.4, .24, .14)), top * smoothstep(.55, .75, h));
    M.rough = mix(.75, .35, top); M.spec = .04; M.sss = .05;
    M.nOff = (vec3(vnoise(lp * 30.), vnoise(lp * 30. + 9.), vnoise(lp * 30. + 17.)) - .5) * .8;
  } else if (m == M_GLAZE){
    M.alb = toLin(uColB); M.rough = .1; M.spec = .06; M.sss = .1;
  } else if (m == M_SPRINKLE){
    float h = hash13(floor(lp * 16.6));
    vec3 c = h < .33 ? vec3(.95, .9, .82) : (h < .66 ? vec3(.91, .64, .23) : vec3(.62, .74, .25));
    M.alb = toLin(c); M.rough = .3; M.spec = .05;
  } else if (m == M_LOKUM){
    M.alb = toLin(vec3(.96, .95, .93)) * (.9 + .1 * vnoise(lp * 80.)); M.rough = .9; M.sss = .4;
  } else if (m == M_FRUIT){
    M.alb = toLin(uColC); M.rough = .2; M.spec = .05; M.sss = .6;
  }
  return M;
}

vec3 shade(vec3 p, vec3 n, vec3 rd, float m, vec3 lp){
  Mat M = material(m, p, lp, n);
  n = normalize(n + M.nOff * .12);
  vec3 L = normalize(uLight);
  vec3 V = -rd;
  vec3 camF = normalize(uCamTarget - uCamPos);
  vec3 Rl = normalize(-camF + vec3(0., .6, 0.) - L * .3);
  vec3 H = normalize(L + V);
  float ndl = dot(n, L);
  float dif = clamp(ndl, 0., 1.);
  float wrap = clamp((ndl + M.sss * .6) / (1. + M.sss * .6), 0., 1.);
  float sh = softShadow(p + n * .004, L, 10.);
  float ao = calcAO(p, n);
  vec3 keyC = vec3(1., .84, .66) * 3.2;
  vec3 rimC = vec3(1., .9, .8) * 1.4;
  vec3 fillC = vec3(.55, .45, .4) * .35;

  float shininess = 2. / max(M.rough * M.rough, .002);
  float fres = M.spec + (1. - M.spec) * pow(1. - clamp(dot(n, V), 0., 1.), 5.);
  float spec = pow(clamp(dot(n, H), 0., 1.), shininess) * (shininess + 8.) / 40.;

  vec3 col = vec3(0.);
  col += M.alb * keyC * mix(dif, wrap, M.sss) * mix(sh, 1., M.sss * .35);
  // subsurface tint in the terminator
  col += M.alb * M.alb * keyC * .35 * M.sss * smoothstep(-.4, .2, ndl) * (1. - dif);
  col += M.alb * fillC * (.5 + .5 * n.y) * ao;
  float rim = pow(1. - clamp(dot(n, V), 0., 1.), 3.) * clamp(dot(n, Rl) + .2, 0., 1.);
  col += rimC * rim * .55 * ao * mix(vec3(1.), M.alb * 2., .5);
  col += keyC * spec * fres * sh * (1. - M.rough * .6);
  vec3 r = reflect(rd, n);
  col += env(r, L, Rl) * fres * (1. - M.rough) * ao * .9;
  return col * ao;
}

vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

void main(){
  vec2 frag = gl_FragCoord.xy + uOffset;
  vec2 uv = (2. * frag - uFull) / uFull.y;
  vec3 ro = uCamPos;
  vec3 f = normalize(uCamTarget - ro);
  vec3 r = normalize(cross(f, vec3(0., 1., 0.)));
  vec3 u = cross(r, f);
  float fl = 1. / tan(uFov * .5);
  vec3 rd = normalize(uv.x * r + uv.y * u + fl * f);

  // bounding sphere
  float tmin = 0., tmax = 12.;
  float b = dot(ro, rd), c = dot(ro, ro) - 2.6 * 2.6;
  float disc = b * b - c;
  vec4 outc = vec4(0.);
  if (disc > 0.){
    float sq = sqrt(disc);
    tmin = max(0., -b - sq); tmax = -b + sq;
    float t = tmin;
    vec2 h = vec2(1e5, 0.);
    bool hit = false;
    for (int i = 0; i < STEPS; i++){
      vec3 p = ro + rd * t;
      h = map(p);
      if (abs(h.x) < .0005 * t){ hit = true; break; }
      t += h.x;
      if (t > tmax) break;
    }
    if (hit){
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p, t);
      vec3 col = shade(p, n, rd, h.y, localPos(p, h.y));
      col = aces(col * uExposure);
      col = pow(col, vec3(1. / 2.2));
      outc = vec4(col, 1.);
    } else if (uGround > 0.){
      // shadow catcher on the floor plane
      float gy = -uGround;
      float tg = (gy - ro.y) / rd.y;
      if (tg > 0.){
        vec3 p = ro + rd * tg;
        float sh = softShadow(p + vec3(0., .002, 0.), normalize(uLight + vec3(0., .8, 0.)), 4.);
        float ao = calcAO(p, vec3(0., 1., 0.));
        float a = (1. - sh * ao) * .75 * smoothstep(2.2, .6, length(p.xz));
        outc = vec4(0., 0., 0., a);
      }
    }
  }
  // tiny dither against banding
  outc.rgb += (hash12(frag + uTime) - .5) / 255.;
  outColor = outc;
}
`;

export const SCENE_NAMES = Object.keys(SCENES);

export function fragmentSource(scene, { steps = 140, shadowSteps = 40 } = {}) {
  if (!SCENES[scene]) throw new Error(`Unknown scene: ${scene}`);
  return `#version 300 es
#define STEPS ${steps}
#define SHADOW_STEPS ${shadowSteps}
${COMMON}
${SCENES[scene]}
${RENDER}`;
}
