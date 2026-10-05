import { VERT, fragmentSource } from './shader.js';

/**
 * Minimal WebGL2 wrapper around the product shader.
 * Used by the live hero and by the offline still renderer (tools/render).
 */
export class ProductRenderer {
  constructor(canvas, scene, { steps, shadowSteps, label = false } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.program = this.#program(VERT, fragmentSource(scene, { steps, shadowSteps }));
    gl.useProgram(this.program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    const n = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(this.program, i);
      this.u[info.name] = gl.getUniformLocation(this.program, info.name);
    }

    this.state = {
      camPos: [0, 1.4, 2.6],
      camTarget: [0, 0, 0],
      fov: 0.6,
      light: [0.6, 0.8, 0.4],
      p: [0, 0, 0, 0],
      q: [1, 1, 0, 0],
      colA: [0.95, 0.9, 0.8],
      colB: [0.2, 0.1, 0.05],
      colC: [0.8, 0.2, 0.2],
      ground: 0,
      exposure: 1,
      time: 0,
    };

    if (label && this.u.uLabel) this.#labelTexture();
  }

  #shader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log);
    }
    return s;
  }

  #program(vs, fs) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, this.#shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this.#shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  /* Wordmark printed around the cup, drawn once into a texture. */
  #labelTexture() {
    const gl = this.gl;
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#000';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = '900 150px "Archivo", "Arial Black", sans-serif';
    if ('fontStretch' in x) x.fontStretch = 'condensed';
    x.fillText('CUPISTAN', c.width / 2, c.height / 2 + 6);
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u.uLabel, 0);
  }

  set(values) {
    Object.assign(this.state, values);
    return this;
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  render({ offset = [0, 0], full } = {}) {
    const gl = this.gl;
    const s = this.state;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const f = full || [w, h];
    gl.viewport(0, 0, w, h);
    const u = this.u;
    const set3 = (k, v) => u[k] && gl.uniform3fv(u[k], v);
    const set4 = (k, v) => u[k] && gl.uniform4fv(u[k], v);
    const set1 = (k, v) => u[k] && gl.uniform1f(u[k], v);
    u.uRes && gl.uniform2f(u.uRes, w, h);
    u.uOffset && gl.uniform2f(u.uOffset, offset[0], offset[1]);
    u.uFull && gl.uniform2f(u.uFull, f[0], f[1]);
    set3('uCamPos', s.camPos);
    set3('uCamTarget', s.camTarget);
    set1('uFov', s.fov);
    const l = s.light;
    const ll = Math.hypot(l[0], l[1], l[2]) || 1;
    set3('uLight', [l[0] / ll, l[1] / ll, l[2] / ll]);
    set1('uTime', s.time);
    set4('uP', s.p);
    set4('uQ', s.q);
    set3('uColA', s.colA);
    set3('uColB', s.colB);
    set3('uColC', s.colC);
    set1('uGround', s.ground);
    set1('uExposure', s.exposure);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const ext = this.gl.getExtension('WEBGL_lose_context');
    ext && ext.loseContext();
  }
}
