// Motion engine: deterministic canvas compositions rendered frame by frame.
// A composition file (loaded after this one) defines `COMP` — see SKILL.md. Nothing here is brand-specific.
// Frame size comes from `window.FORMAT` (set in index.html before this script). Default: vertical 9:16.
//   <script>window.FORMAT = { width: 1920, height: 1080 }</script>   → landscape 16:9
const W = (window.FORMAT && window.FORMAT.width) || 1080, H = (window.FORMAT && window.FORMAT.height) || 1920;
const LANDSCAPE = W > H;
// COMP.theme overrides. `font` drives mono()/rise()/typed(); `sans` is the family stack for ptext()/riseWords().
const THEME = { bg: '#1A1A1C', text: '#F3EEE6', accent: '#FF8C00', font: 'VCR', sans: 'system-ui, -apple-system, "Helvetica Neue", sans-serif' };

// ---------- math
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
};
// Damped spring from 0 to 1; x in seconds since release.
const spring = (x, freq = 2.4, damp = 8) => (x <= 0 ? 0 : 1 - Math.exp(-damp * x) * Math.cos(2 * Math.PI * freq * x));
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = n => rng(Math.floor(n) * 7919 + 17)();
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 1013), hash(i + 1 + seed * 1013), u) * 2 - 1;
}
const bump = (t, c, w) => Math.exp(-Math.pow((t - c) / w, 2));
const decay = (t, c, k) => (t < c ? 0 : Math.exp(-(t - c) / k));

// ---------- canvases
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const ctx = buf.getContext('2d');
const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
const tctx = tmp.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const IMG = {};
async function loadImg(key, src) {
  for (let attempt = 0; ; attempt++) {
    try { const i = new Image(); i.src = src + (attempt ? '?r=' + attempt : ''); await i.decode(); IMG[key] = i; return; }
    catch (e) { if (attempt >= 5) throw e; await new Promise(r => setTimeout(r, 150)); }
  }
}

// ---------- text helpers
let ADV = 0.6; // THEME.font advance per px of font size, measured at boot (assumes a monospace display font)
function font(size, fam = THEME.font) {
  ctx.font = fam === 'sans' ? `600 ${size}px ${THEME.sans}` : `${size}px "${fam}"`;
}
// Monospace line with per-letter control: fn(i) -> {dy, alpha, ch, color, sx}
function mono(s, x, y, size, { align = 'center', track = 0, color = THEME.text, per = null, glow = 0, glowColor = THEME.accent } = {}) {
  font(size);
  const adv = size * ADV + track;
  const total = adv * s.length - track;
  let x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let i = 0; i < s.length; i++) {
    const o = per ? per(i) : {};
    if (o.alpha === 0) continue;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.fillStyle = o.color || color;
    if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; }
    const cx = x0 + i * adv + adv / 2 - track / 2;
    ctx.translate(cx, y + (o.dy || 0));
    if (o.sx) ctx.scale(o.sx, o.sy || 1);
    if (o.rot) ctx.rotate(o.rot);
    ctx.textAlign = 'center';
    ctx.fillText(o.ch ?? s[i], 0, 0);
    ctx.restore();
  }
  return { x0, total, adv };
}
const fitSize = (len, maxW, maxSize) => Math.min(maxSize, maxW / (len * ADV));
const GLYPHS = '#@%&*$?!/\\<>=+01';
function scramble(target, p, seed, t) {
  // p in 0..1: letters settle left-to-right with jitter; unsettled ones cycle glyphs.
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const at = (i / target.length) * 0.65 + hash(seed + i) * 0.35;
    if (target[i] === ' ' || p >= at) out += target[i];
    else out += GLYPHS[Math.floor(hash(seed * 31 + i * 7 + Math.floor(t * 20)) * GLYPHS.length)];
  }
  return out;
}
// The vertical band a line of text really occupies, from the font's own glyph bounds, so masks and
// write-on clips never cut accents (É) or descenders (g, j, p, q, y). Offsets are relative to the text's y
// for the given textBaseline. Use it for every clip that holds text:
//   const b = glyphBand(hand(84), 'alphabetic', 84); g.rect(x, y + b.top, w, b.bottom - b.top)
const BAND_PROBE = 'ÁÉÍÔÜÇgjpqy|()';
function glyphBand(fontStr, baseline = 'middle', size = 100, pad = 0.12) {
  ctx.save(); ctx.font = fontStr; ctx.textBaseline = baseline;
  const m = ctx.measureText(BAND_PROBE); ctx.restore();
  return { top: -m.actualBoundingBoxAscent - size * pad, bottom: m.actualBoundingBoxDescent + size * pad };
}
// Letters rising out of a mask line.
function rise(s, x, y, size, u, t0, { stagger = 0.035, dur = 0.55, color = THEME.text, align = 'center', track = 0, glow = 0 } = {}) {
  ctx.save();
  font(size); const b = glyphBand(ctx.font, 'middle', size);
  ctx.beginPath(); ctx.rect(0, y + b.top, W, b.bottom - b.top); ctx.clip();
  mono(s, x, y, size, {
    align, track, color, glow,
    per: i => { const p = E.outExpo(prog(u, t0 + i * stagger, t0 + i * stagger + dur)); return { dy: (1 - p) * size * 1.15, alpha: p > 0 ? 1 : 0 }; },
  });
  ctx.restore();
}
function typed(s, x, y, size, u, t0, rate, opts = {}) {
  const n = Math.floor(clamp((u - t0) / rate, 0, s.length));
  if (u < t0) return;
  const r = mono(s.slice(0, n), x, y, size, { ...opts, align: 'left' });
  if (opts.cursor !== false && (n < s.length || Math.floor(u * 3) % 2 === 0)) {
    ctx.fillStyle = opts.cursorColor || THEME.accent;
    ctx.fillRect(r.x0 + n * r.adv, y - size * 0.45, size * ADV * 0.9, size * 0.9);
  }
}
// ---------- proportional type (brand fonts are rarely monospace; these measure real glyph widths)
function setSans(size, weight = 700) { ctx.font = `${weight} ${size}px ${THEME.sans}`; }
function pmeasure(s, size, weight = 700, track = 0) {
  setSans(size, weight); ctx.save(); ctx.letterSpacing = track + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function ptext(s, x, y, size, { weight = 700, align = 'center', color = THEME.text, track = 0, glow = 0, glowColor = THEME.accent } = {}) {
  setSans(size, weight);
  ctx.save(); ctx.letterSpacing = track + 'px';
  const w = ctx.measureText(s).width - (s.length ? track : 0);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; }
  ctx.fillText(s, x0, y); ctx.restore();
  return { x0, total: w };
}
// Words rise out of a mask line one at a time. colors: per-word colour array (e.g. accent the last word).
function riseWords(s, x, y, size, u, t0, { stagger = 0.09, dur = 0.8, weight = 700, color = THEME.text, align = 'center', track = -size * 0.035, colors = null } = {}) {
  const words = s.split(' '), space = pmeasure(' ', size, weight), ws = words.map(w => pmeasure(w, size, weight, track));
  const total = ws.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  setSans(size, weight); const band = glyphBand(ctx.font, 'middle', size);
  ctx.save(); ctx.beginPath(); ctx.rect(0, y + band.top, W, band.bottom - band.top); ctx.clip();
  words.forEach((w, i) => {
    const p = E.outExpo(prog(u, t0 + i * stagger, t0 + i * stagger + dur));
    if (p > 0) { ctx.save(); ctx.globalAlpha *= clamp(p * 1.5); ptext(w, cx, y + (1 - p) * size * 1.15, size, { weight, color: colors ? colors[i] : color, align: 'left', track }); ctx.restore(); }
    cx += ws[i] + space;
  });
  ctx.restore();
}
function fadeText(s, x, y, size, u, t0, { dur = 0.6, weight = 500, color = THEME.text, align = 'center', dy = 14, track = 0 } = {}) {
  const p = E.outCubic(prog(u, t0, t0 + dur)); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p; ptext(s, x, y + (1 - p) * dy, size, { weight, color, align, track }); ctx.restore();
}
function typedP(s, x, y, size, u, t0, rate, { weight = 600, color = THEME.text, align = 'center', cursor = THEME.accent } = {}) {
  if (u < t0) return;
  const n = Math.floor(clamp((u - t0) / rate, 0, s.length)), total = pmeasure(s, size, weight);
  const x0 = align === 'center' ? x - total / 2 : x;
  const r = ptext(s.slice(0, n), x0, y, size, { weight, color, align: 'left' });
  if (n < s.length || Math.floor(u * 2) % 2 === 0) { ctx.fillStyle = cursor; ctx.fillRect(x0 + r.total + 6, y - size * 0.45, Math.max(3, size * 0.07), size * 0.9); }
}

// ---------- camera + motion
// World camera: put world point (x, y) at frame centre at zoom z. Carry the same values across a cut
// (end of scene A == start of scene B) or the frame visibly jumps.
function cam(x, y, z) { ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-x, -y); }
// Horizontal push: fast in from the right, fast out to the left. Pair the cut time with COMP.whips.
function push(u, len, { inDur = 0.55, outDur = 0.4, dist = W * 0.27, noIn = false, noOut = false } = {}) {
  const i = noIn ? 0 : 1 - E.outExpo(prog(u, 0, inDur));
  const o = noOut ? 0 : E.inExpo(prog(u, len - outDur, len));
  ctx.translate(i * dist - o * dist, 0);
  ctx.globalAlpha *= clamp(1 - i * 1.2) * clamp(1 - o * 1.1);
}
// Impact shake: hits are times (same clock as t) that each kick the frame.
function shake(t, hits, amp = 10) {
  let dx = 0, dy = 0;
  hits.forEach(h => { const d = decay(t, h, 0.09); dx += noise1(t * 60, h * 3) * amp * d; dy += noise1(t * 60, h * 3 + 1) * amp * d; });
  ctx.translate(dx, dy);
}
// Expanding ring: tap/press feedback.
function ring(x, y, u, at, { r0 = 20, r1 = 220, dur = 0.6, color = THEME.accent, width = 4 } = {}) {
  const r = prog(u, at, at + dur); if (r <= 0 || r >= 1) return;
  ctx.save(); ctx.globalAlpha *= (1 - r) * 0.8; ctx.strokeStyle = color; ctx.lineWidth = width * (1 - r) + 1;
  ctx.beginPath(); ctx.arc(x, y, lerp(r0, r1, E.outCubic(r)), 0, 7); ctx.stroke(); ctx.restore();
}
// Whip smear of the finished frame around each time in COMP.whips (horizontal motion blur).
function whip(t) {
  let a = 0; (COMP.whips || []).forEach(c => (a += bump(t, c, 0.11)));
  if (a < 0.03) return;
  tctx.clearRect(0, 0, W, H); tctx.drawImage(buf, 0, 0);
  ctx.save(); ctx.globalAlpha = 0.16;
  for (let k = 1; k <= 6; k++) { ctx.drawImage(tmp, -k * W * 0.0135 * a, 0); ctx.drawImage(tmp, k * W * 0.0135 * a, 0); }
  ctx.restore();
}

function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
function tri(x, y, s, dir = 1) { // play triangle, dir 1 right / -1 left
  ctx.beginPath(); ctx.moveTo(x - dir * s * 0.45, y - s * 0.55); ctx.lineTo(x + dir * s * 0.55, y); ctx.lineTo(x - dir * s * 0.45, y + s * 0.55); ctx.closePath(); ctx.fill();
}
function cover(img, x, y, w, h, zoom = 1, ox = 0, oy = 0) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2 + ox, y + (h - dh) / 2 + oy, dw, dh);
}

// ---------- precomputed textures
const NOISE = [];
function makeNoise() {
  for (let k = 0; k < 8; k++) {
    const nw = Math.round(W / 4), nh = Math.round(H / 4);
    const c = mk(nw, nh), g = c.getContext('2d'), d = g.createImageData(nw, nh), r = rng(99 + k);
    for (let y = 0; y < nh; y++) {
      const line = r() < 0.04 ? 90 : 0;
      for (let x = 0; x < nw; x++) {
        const v = Math.min(255, r() * 255 + line), i = (y * nw + x) * 4;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
      }
    }
    g.putImageData(d, 0, 0); NOISE.push(c);
  }
}

// Rewind: the camcorder shot pushed through a worn blue VHS cast.
// ---------- shared drawing
function glowBg(cx, cy, r, stops, alpha = 1) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function drawNoise(t, alpha, comp = 'source-over') {
  ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = comp; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(NOISE[Math.floor(t * 30) % NOISE.length], 0, 0, W, H); ctx.restore();
}

// S1 0–1.5: power on, title.
function mixColor(a, b, t) {
  const pa = a.match(/\w\w/g).map(h => parseInt(h, 16)), pb = b.match(/\w\w/g).map(h => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`;
}
function star(x, y, s, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.22 : s; const a = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
// Camera aperture. open: 1 = fully open, 0 = closed. Centre defaults to (W/2, 1000).
function iris(open, u, cx = W / 2, cy = H * 0.52) {
  if (open >= 1) return;
  const R = open * Math.hypot(W, H) * 0.56, N = 8, spin = (1 - open) * 1.4 + u * 0.2;
  const pts = [];
  for (let i = 0; i < N; i++) { const a = spin + (i / N) * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
  ctx.save();
  ctx.fillStyle = '#0C0C0D';
  ctx.beginPath(); ctx.rect(0, 0, W, H);
  if (R > 0.5) { ctx.moveTo(...pts[0]); pts.forEach(p => ctx.lineTo(...p)); ctx.closePath(); }
  ctx.fill('evenodd');
  // blade edges
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 3;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % N], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - (dx / L) * 2400, p[1] - (dy / L) * 2400); ctx.stroke();
  });
  ctx.restore();
}

// S6 12.5–15: sunset, the whole collection, end card.
// ---------- CRT power on (COMP.crt.on) / off (COMP.crt.off = start time, lasts 0.5s)
function crt(t) {
  const C = COMP.crt || {};
  let sx = 1, sy = 1, bright = 0, dot = 0;
  const off = C.off ?? Infinity;
  if (C.on && t < 0.42) {
    sx = E.outExpo(prog(t, 0.02, 0.14)); sy = lerp(0.003, 1, E.outExpo(prog(t, 0.14, 0.42)));
    bright = 1 - prog(t, 0.14, 0.5);
  } else if (t > off) {
    sy = lerp(1, 0.003, E.inExpo(prog(t, off, off + 0.18)));
    sx = lerp(1, 0.004, E.inExpo(prog(t, off + 0.18, off + 0.32)));
    bright = prog(t, off, off + 0.18);
    dot = t > off + 0.3 ? 1 - prog(t, off + 0.3, off + 0.5) : 0;
  } else return;
  tctx.clearRect(0, 0, W, H); tctx.drawImage(buf, 0, 0);
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const w = W * sx, h = Math.max(3, H * sy), x = (W - w) / 2, y = (H - h) / 2;
  if (sx > 0.001) {
    ctx.drawImage(tmp, x, y, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,244,228,${bright})`; ctx.fillRect(x, y, w, h);
  }
  if (dot > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 60);
    g.addColorStop(0, `rgba(255,250,240,${dot})`); g.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// ---------- WebGL post: tape tearing (COMP.glitch), chroma split, scanlines, grain, vignette, flash (COMP.flash)
const out = document.getElementById('out');
const gl = out.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
let prog_, uni = {};
function initGL() {
  const vs = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0, 1); }`;
  const fs = `#version 300 es
precision highp float;
uniform sampler2D tex; uniform vec2 res; uniform float time, glitch, shift, flash, grain, wobble, scan, vig;
in vec2 uv; out vec4 o;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 p = uv;
  float f = floor(time * 30.0);
  float band = floor(p.y * 46.0 + h(vec2(f, 3.0)) * 5.0);
  float on = step(1.0 - glitch * 0.6, h(vec2(band, f)));
  p.x += on * (h(vec2(band, f + 7.0)) - 0.5) * 0.24 * glitch;
  p.x += sin(p.y * 38.0 + time * 9.0) * wobble;
  float s = (shift + glitch * 26.0) / res.x;
  vec3 c = vec3(texture(tex, p + vec2(s, 0.0)).r, texture(tex, p).g, texture(tex, p - vec2(s, 0.0)).b);
  c += on * glitch * 0.08;
  c *= 1.0 - scan + scan * sin(uv.y * res.y * 1.5708);
  c += (h(uv * res + fract(time * 7.13) * 91.0) - 0.5) * grain;
  vec2 v = uv - 0.5;
  c *= 1.0 - vig * pow(length(v * vec2(1.0, 0.85)) * 1.3, 2.6);
  c = mix(c, vec3(1.0, 0.97, 0.92), clamp(flash, 0.0, 1.0));
  o = vec4(c, 1.0);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
  prog_ = gl.createProgram();
  gl.attachShader(prog_, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog_, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog_);
  gl.useProgram(prog_);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog_, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  ['res', 'time', 'glitch', 'shift', 'flash', 'grain', 'wobble', 'scan', 'vig'].forEach(n => (uni[n] = gl.getUniformLocation(prog_, n)));
}
function glitchAt(t) {
  let g = 0;
  (COMP.glitch || []).forEach(([c, a, w = 0.055]) => (g += a * bump(t, c, w)));
  if (COMP.glitchExtra) g += COMP.glitchExtra(t);
  if (COMP.crt?.on && t < 0.45) g += 0.5 * (1 - prog(t, 0.2, 0.45));
  return Math.min(1, g);
}
function post(t) {
  gl.viewport(0, 0, W, H);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  gl.uniform2f(uni.res, W, H); gl.uniform1f(uni.time, t); gl.uniform1f(uni.glitch, glitchAt(t));
  gl.uniform1f(uni.shift, COMP.shift ?? 2.5);
  gl.uniform1f(uni.flash, (COMP.flash || []).reduce((s, [c, a, k = 0.1]) => s + a * decay(t, c, k), 0));
  gl.uniform1f(uni.grain, COMP.grain ?? 0.09);
  gl.uniform1f(uni.wobble, COMP.wobble ?? 0); // tape wave; 0.0007 for a VHS look. Reads as 'wavy' on clean brand films
  gl.uniform1f(uni.scan, COMP.scanlines ?? 0.07);
  gl.uniform1f(uni.vig, COMP.vignette ?? 0.5);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = THEME.bg; ctx.fillRect(0, 0, W, H);
  const scenes = COMP.scenes;
  let i = scenes.length - 1;
  while (i > 0 && t < scenes[i][0]) i--;
  scenes[i][1](t - scenes[i][0], t);
  whip(t);
  if (COMP.overlay) COMP.overlay(t);
  crt(t);
  post(t);
}

window.frame = t => { render(t); return out.toDataURL('image/png'); };
window.show = t => render(t);
// cover: the time render.mjs puts on frame 0 and embeds as the MP4 cover (default: the last frame). false = off.
window.META = () => ({ duration: COMP.duration, fps: COMP.fps || 30, width: W, height: H, cover: COMP.cover });

window.addEventListener('load', () => (async () => {
  out.width = W; out.height = H;
  Object.assign(THEME, COMP.theme || {});
  for (const [family, url] of COMP.fonts || []) { const f = new FontFace(family, `url(${url})`); await f.load(); document.fonts.add(f); }
  await Promise.all(Object.entries(COMP.images || {}).map(([k, src]) => loadImg(k, src)));
  font(100); ADV = ctx.measureText('0').width / 100;
  makeNoise();
  if (COMP.prepare) await COMP.prepare();
  initGL();
  render(0);
  window.READY = true;
})().catch(e => { console.error('init failed', e); window.READY = 'error: ' + (e && e.stack || e); }));
