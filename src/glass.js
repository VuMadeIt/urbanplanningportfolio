// Vitrolite: the structural glass the 1954 TTC stations were tiled in.
// A tile wall drawn in WebGL: each tile is its own slab of glass that bends the station name behind it,
// catches light on its bevel and carries a glossy sheen that follows the pointer.

const VERT = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;      // canvas size in device px
uniform vec2 uLight;    // light position in device px (top-left origin)
uniform vec2 uTile;     // main tile size in device px
uniform float uTrim;    // trim band height in device px
uniform float uDpr;
uniform float uReveal;  // 0..1 tiles assembling
uniform float uTime;
uniform vec3 uGrout;
varying vec2 v;

float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float hash(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 px = vec2(v.x, 1. - v.y) * uRes;
  bool trim = px.y < uTrim;
  vec2 ts = trim ? vec2(uTrim * 0.75, uTrim) : uTile;
  vec2 origin = trim ? vec2(0.) : vec2(0., uTrim);
  vec2 q = px - origin;
  vec2 cell = floor(q / ts);
  vec2 centre = origin + cell * ts + ts * .5;
  vec2 local = px - centre;
  float gap = 2.5 * uDpr;
  vec2 halfSize = ts * .5 - gap * .5;
  float r = 5. * uDpr;
  float d = sdBox(local, halfSize, r);
  float h = hash(cell + (trim ? 91. : 0.));

  // tiles assemble in a diagonal wave
  float delay = (cell.x * 0.018 + cell.y * 0.05) + h * 0.08;
  float p = clamp((uReveal * 1.6 - delay) / 0.45, 0., 1.);
  p = 1. - pow(1. - p, 3.);
  vec2 lp = local / max(p, 0.001);
  float dp = sdBox(lp, halfSize, r);

  vec3 grout = uGrout;
  if (dp > 0. || p <= 0.001) { gl_FragColor = vec4(grout, 1.); return; }

  // bevel normal from the rounded box field
  float bevel = min(11. * uDpr, ts.y * 0.16);
  float e = clamp(-dp / bevel, 0., 1.);
  float slope = 1. - e;
  vec2 g = vec2(sdBox(lp + vec2(1., 0.), halfSize, r) - sdBox(lp - vec2(1., 0.), halfSize, r),
                sdBox(lp + vec2(0., 1.), halfSize, r) - sdBox(lp - vec2(0., 1.), halfSize, r));
  g = normalize(g + 1e-5);
  vec2 lc = lp / halfSize;

  // refraction: the bevel bends inward, the face magnifies a little like a thick lens
  vec2 refr = -g * pow(slope, 3.) * bevel * 0.32;
  vec2 uv = (px + refr) / uRes;
  float ca = pow(slope, 3.) * 0.9 * uDpr / uRes.x;
  vec3 col;
  col.r = texture2D(uTex, uv + vec2(ca, 0.)).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv - vec2(ca, 0.)).b;

  // each slab is a slightly different pour
  col *= 0.965 + h * 0.06;

  // light
  vec2 ld = normalize(uLight - centre + 1e-4);
  float facing = dot(g, ld);
  float rim = pow(max(facing, 0.), 2.) * pow(slope, 1.6);
  float shade = max(-facing, 0.) * pow(slope, 1.4);
  col += rim * 0.55;
  col *= 1. - shade * 0.32;

  // glossy sheen: a soft band across the face, sliding with the light
  float lx = clamp((uLight.x - centre.x) / (uRes.x * .5), -1.2, 1.2);
  float band = dot(lc, normalize(vec2(1., -.75))) + lx * 0.9 - 0.15;
  float sheen = smoothstep(0.9, 0.0, abs(band)) * 0.07;
  float dist = length(uLight - centre) / max(uRes.x, uRes.y);
  sheen *= 1.25 - clamp(dist, 0., 1.);
  col += sheen * e;

  // a hot spot where the light would reflect
  vec2 hs = lc - ld * 0.45;
  col += exp(-dot(hs, hs) * 6.) * 0.07 * e * (1.1 - clamp(dist, 0., 1.));

  // depth at the inner lip
  col *= 1. - smoothstep(0.0, 0.25, e) * (1. - smoothstep(0.25, 0.6, e)) * 0.06;

  // tiles fade up from the grout as they arrive
  col = mix(grout, col, smoothstep(0., 0.35, p));
  gl_FragColor = vec4(col, 1.);
}`;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, t) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

export class GlassWall {
  /**
   * @param {HTMLElement} wall  the .wall element; its .wall-name is drawn into the glass
   * @param {object} o  { tile, trim, wall, trimColour, name, small, columns }
   */
  constructor(wall, o) {
    this.wall = wall;
    this.o = o;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'glass';
    this.canvas.setAttribute('aria-hidden', 'true');
    const gl = this.canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) { this.failed = true; return; }
    this.gl = gl;
    this.tex2d = document.createElement('canvas');
    this.light = { x: 0, y: 0, tx: 0, ty: 0 };
    this.reveal = 1;
    this.visible = false;
    this.t0 = performance.now();
    this.idle = true;
    if (!this.setup()) { this.failed = true; return; }
    wall.classList.add('has-glass');
    wall.prepend(this.canvas);
    this.onPointer = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.light.tx = (e.clientX - r.left) * this.dpr;
      this.light.ty = (e.clientY - r.top) * this.dpr;
      this.idle = false;
      clearTimeout(this.idleT);
      this.idleT = setTimeout(() => (this.idle = true), 2500);
    };
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    this.io = new IntersectionObserver(([en]) => { this.visible = en.isIntersecting; if (this.visible) this.loop(); }, { threshold: 0 });
    this.io.observe(this.canvas);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(wall);
  }

  setup() {
    const gl = this.gl;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ['uTex', 'uRes', 'uLight', 'uTile', 'uTrim', 'uDpr', 'uReveal', 'uTime', 'uGrout'].forEach((n) => (this.u[n] = gl.getUniformLocation(pr, n)));
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return true;
  }

  /** Paint the wall, the trim with its small repeated names, and the big name, into a texture */
  paint() {
    const { wall, o } = this;
    const W = this.canvas.width, H = this.canvas.height, d = this.dpr;
    const c = this.tex2d; c.width = W; c.height = H;
    const x = c.getContext('2d');
    const base = hexToRgb(o.wall), trimC = hexToRgb(o.trimColour);
    x.fillStyle = css(base); x.fillRect(0, 0, W, H);
    const trimH = this.trimH;
    x.fillStyle = css(trimC); x.fillRect(0, 0, W, trimH);
    // the station name in small letters along the trim, in the wall colour (as on the 1954 walls)
    if (o.small) {
      x.fillStyle = css(mix(base, trimC, 0.12));
      x.font = `500 ${Math.round(13 * d)}px "Jost Variable", Jost, sans-serif`;
      x.textBaseline = 'middle';
      const step = 360 * d;
      for (let sx = 120 * d; sx < W; sx += step) x.fillText(o.small.toUpperCase(), sx, trimH * 0.72);
    }
    // Museum-style columns drawn in front of the wall
    if (o.columns) this.paintColumns(x, W, H, d);
    // the big name, exactly where the DOM heading sits
    const name = wall.querySelector('.wall-name');
    if (name) {
      const wr = wall.getBoundingClientRect();
      const cs = getComputedStyle(name);
      x.fillStyle = cs.color;
      x.textBaseline = 'alphabetic';
      const size = parseFloat(cs.fontSize) * d;
      x.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      if ('letterSpacing' in x) x.letterSpacing = `${parseFloat(cs.letterSpacing) * d || 0}px`;
      const words = name.querySelectorAll('.wall-word');
      const lines = words.length ? [...words] : [name];
      const range = document.createRange();
      lines.forEach((el) => {
        range.selectNodeContents(el.classList?.contains('wall-word') ? el : el.firstChild || el);
        const rects = [...range.getClientRects()].filter((rr) => rr.width > 2);
        const rr = rects[0] || el.getBoundingClientRect();
        const text = (el.classList?.contains('wall-word') ? el.textContent : (el.firstChild?.textContent || el.textContent)).toUpperCase();
        const m = x.measureText(text);
        const asc = m.actualBoundingBoxAscent || size * 0.7;
        const desc = m.actualBoundingBoxDescent || 0;
        const ls = parseFloat(cs.letterSpacing) * d || 0;
        const left = (W - m.width - ls) / 2;
        const midY = (rr.top - wr.top + rr.height / 2) * d;
        x.fillText(text, left, midY + (asc - desc) / 2);
      });
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
    this.grout = mix(base, [40, 38, 36], 0.42).map((v) => v / 255);
  }

  paintColumns(x, W, H, d) {
    const trimH = this.trimH;
    const colW = Math.min(W * 0.075, 120 * d);
    const top = trimH + 10 * d;
    const shade = 'rgba(60, 40, 10, 0.16)';
    const draw = (cx, kind) => {
      x.save();
      x.fillStyle = kind === 'doric' ? '#efe7d2' : '#e9d7a8';
      if (kind === 'doric') {
        x.fillRect(cx - colW * 0.62, top, colW * 1.24, colW * 0.22);
        x.fillRect(cx - colW * 0.55, top + colW * 0.22, colW * 1.1, colW * 0.14);
        x.beginPath(); x.moveTo(cx - colW * 0.42, top + colW * 0.36); x.lineTo(cx + colW * 0.42, top + colW * 0.36); x.lineTo(cx + colW * 0.5, H); x.lineTo(cx - colW * 0.5, H); x.fill();
        x.fillStyle = shade;
        for (let i = -3; i <= 3; i++) x.fillRect(cx + i * colW * 0.12 - colW * 0.02, top + colW * 0.4, colW * 0.04, H);
      } else {
        // a papyrus-bundle column with a flared capital
        x.beginPath(); x.moveTo(cx - colW * 0.75, top); x.quadraticCurveTo(cx, top + colW * 0.9, cx + colW * 0.75, top); x.lineTo(cx + colW * 0.42, top + colW * 0.7); x.lineTo(cx - colW * 0.42, top + colW * 0.7); x.fill();
        x.fillRect(cx - colW * 0.42, top + colW * 0.7, colW * 0.84, H);
        x.fillStyle = '#2a4f8f';
        for (let i = 0; i < 4; i++) x.fillRect(cx - colW * 0.42, top + colW * (1 + i * 0.16), colW * 0.84, colW * 0.06);
        x.fillStyle = shade;
        for (let i = -2; i <= 2; i++) x.fillRect(cx + i * colW * 0.16 - colW * 0.02, top + colW * 1.7, colW * 0.04, H);
      }
      x.restore();
    };
    draw(W * 0.06, 'papyrus');
    draw(W * 0.94, 'doric');
  }

  resize() {
    if (this.failed) return;
    const r = this.wall.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const W = Math.round(r.width * this.dpr), H = Math.round(r.height * this.dpr);
    this.canvas.width = W; this.canvas.height = H;
    this.gl.viewport(0, 0, W, H);
    const small = r.width < 760;
    const th = (this.o.tile || (small ? 38 : 58)) * this.dpr;
    this.tile = [th * 2, th];
    this.trimH = (this.o.trim ?? 64) * this.dpr;
    if (!this.light.x) { this.light.x = this.light.tx = W * 0.3; this.light.y = this.light.ty = H * 0.15; }
    this.paint();
    this.draw();
  }

  /** Let something else hold the light, e.g. a train's headlight */
  setLight(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    this.light.tx = (clientX - r.left) * this.dpr;
    this.light.ty = (clientY - r.top) * this.dpr;
    this.idle = false;
    clearTimeout(this.idleT);
    this.idleT = setTimeout(() => (this.idle = true), 1500);
  }

  assemble(duration = 1.3) {
    if (this.failed) return;
    this.reveal = 0;
    this.revealStart = performance.now();
    this.revealDur = duration * 1000;
    this.loop();
  }

  draw() {
    const gl = this.gl, u = this.u;
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.uLight, this.light.x, this.light.y);
    gl.uniform2f(u.uTile, this.tile[0], this.tile[1]);
    gl.uniform1f(u.uTrim, this.trimH);
    gl.uniform1f(u.uDpr, this.dpr);
    gl.uniform1f(u.uReveal, this.reveal);
    gl.uniform1f(u.uTime, (performance.now() - this.t0) / 1000);
    gl.uniform3f(u.uGrout, ...this.grout);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  loop() {
    if (this.raf || this.failed) return;
    const tick = () => {
      this.raf = null;
      if (!this.visible || document.hidden) return;
      const now = performance.now();
      if (this.revealStart) {
        this.reveal = Math.min(1, (now - this.revealStart) / this.revealDur);
        if (this.reveal >= 1) this.revealStart = 0;
      }
      if (this.idle && !this.still) {
        const t = (now - this.t0) / 1000;
        const W = this.canvas.width, H = this.canvas.height;
        this.light.tx = W * (0.5 + Math.cos(t * 0.35) * 0.42);
        this.light.ty = H * (0.25 + Math.sin(t * 0.5) * 0.2);
      }
      const k = this.idle ? 0.03 : 0.14;
      this.light.x += (this.light.tx - this.light.x) * k;
      this.light.y += (this.light.ty - this.light.y) * k;
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onPointer);
    this.io?.disconnect(); this.ro?.disconnect();
    this.canvas.remove();
    this.wall.classList.remove('has-glass');
    this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
