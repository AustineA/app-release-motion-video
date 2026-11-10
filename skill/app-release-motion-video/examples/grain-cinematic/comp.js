// Grain launch reel, Grain-first cut with "my life in" and the other templates, each given its time and swiped one to the next, 44.64 s, 1080×1920. What Grain is for: making the monthly
// photo dump easy. The film is about the app: it opens on Grain's own gallery and names it, picks one of its templates
// ("my life in", the month's grid), adds twelve photos, lets the story play, and posts it. Everything on the phone is
// the app itself; the film adds a table, a camera and its own titles, and no interface.
//   0.0  GRAIN     the gallery on the phone: "This is Grain." / "Your photo dump, done in a minute."
//   4.3  TEMPLATE  two drags down the Dumps, "my life in": "Pick a template."
//   8.2  PHOTOS    "+", twelve photos (two a beat), Done: "Add your photos." / "Grain does the rest."
//  14.2  PLAY      the camera falls into the preview as the story goes on
//  15.4  THE STORY full frame, a photo landing on every beat
//  19.2  TEMPLATES four more of the app's templates full frame, six beats each, swiped in like the next story:
//                  Minimize (macOS), Taskbar (its Windows twin), Photobooth, Month Receipt
//  30.7  ALL       the camera pulls back out of the receipt: it is one tile in a wall of every template's cover,
//                  which scrolls end to end: "60+ animated templates."
//  34.6  SHARE     a swipe back to the story and out to the phone as the grid fills; Share, Instagram: "Straight to Instagram."
//  39.8  END       the camera glides off the phone onto the table: the name
// The phone's screen is one take cut into frames by extract_take.py (img/mli_home, mli_edit, mli_pick,
// mli_resume, mli_share). From the play touch on, the story inside the editor's preview is the same take's preview,
// retimed by extract_story.py so its photos land on the beat (img/gfm_play), laid over the recording. The table is drawn by
// a small WebGL2 renderer. The other templates are the app's debug renderer played faster than the app plays them
// (grab.sh into img/t60f_min, t60f_task, t60f_booth, t60f_rcpt), and the wall is its cover sheets laid out and scrolled by
// wall.py (img/t60f_wall). The swipes and the pull-back between them are the film's own cuts, not the app's. 125 BPM: beats 0.48 s (B); every touch is on one, or on a half.

// ---------- brand: Grain's site tokens (site/styles.css) and type
const BG = '#0f0f10', PAPER = '#e4ded0', PRINT = '#fdfdfb', INK = '#121212', MUTED = '#a6a6a1';
const SANS = 'Montserrat';
const B = 0.48;
const T = { drags: [9 * B, 11 * B], tile: 13 * B, add: 17 * B, picks: Array.from({ length: 12 }, (_, i) => (19 + i / 2) * B), done: 25.5 * B,
            playTap: 30 * B - 0.2, story: 30 * B, full: 32 * B, show: 40 * B, out: 72 * B, share: 76 * B, insta: 80 * B, off: 83 * B, card: 86 * B, dur: 93 * B };
// the other templates, full frame from T.show to T.out: [from, sequence]. Each is swiped in over the SWIPE before
// its beat and lands on it, as the story is again at T.out; the wall is there after a pull-back (ZOOM) out of the receipt.
const SHOW = [[40 * B, 'min'], [46 * B, 'task'], [52 * B, 'booth'], [58 * B, 'rcpt'], [64 * B, 'wall']];
const WALL = SHOW[4][0], SWIPE = 0.75 * B, ZOOM = 1.25 * B;

// ---------- the recordings, as frame sequences loaded when needed (render.mjs awaits window.frame)
const SEQS = { home: 37, edit: 171, pick: 183, resume: 30, share: 228, play: 246, min: 101, task: 193, booth: 102, rcpt: 102, wall: 117 };
const DIR = { home: 'mli_home', edit: 'mli_edit', pick: 'mli_pick', resume: 'mli_resume', share: 'mli_share', play: 'gfm_play',
              min: 't60f_min', task: 't60f_task', booth: 't60f_booth', rcpt: 't60f_rcpt', wall: 't60f_wall' };
const SEQ = { cache: new Map(), order: [] };
const fkey = (key, i) => DIR[key] + '/' + String(clamp(Math.round(i), 0, SEQS[key] - 1)).padStart(4, '0');
const fimg = k => (k && SEQ.cache.get(k)) || null;
async function fetchFrame(k) {
  if (SEQ.cache.has(k)) return;
  for (let attempt = 0; attempt < 4; attempt++) {
    try { const img = new Image(); img.src = 'img/' + k + '.jpg' + (attempt ? '?r=' + attempt : ''); await img.decode(); SEQ.cache.set(k, img); SEQ.order.push(k); return; }
    catch (e) { await new Promise(r => setTimeout(r, 120)); }
  }
}
const engineFrame = window.frame;
window.frame = async t => {
  const f = framesAt(t), want = [f.app, f.app2, f.play, f.full, f.next, f.icon].filter(Boolean);
  await Promise.all(want.map(fetchFrame));
  while (SEQ.order.length > 60) { const k = SEQ.order.shift(); if (want.includes(k)) SEQ.order.push(k); else SEQ.cache.delete(k); }
  return engineFrame(t);
};

// Film time -> frame. Every touch in the film sits on the frame the app reacts in; the stretches between are the take
// in real time, or a held frame where nothing moves. EPS keeps branches off the film's frames.
const EPS = 1 / 60;
const fr = (t, t0, i0, rate = 1) => i0 + (t - t0) * 30 * rate;
// The editor opens out of the card with the template's own demo playing, and "+" is touched in the take 4.6 s on
// (edit 141). The film gets there in four beats: [film frames after the card's touch, mli_edit frame]. The take's wait
// and the demo's holds go by fast; its two photos fly in at about 1.5×.
const DEMO = [[0, 4], [6, 10], [7, 24], [15, 34], [20, 48], [33, 66], [38, 94], [54, 120], [57.6, 141]];
function editFrame(t) {
  if (t >= T.add - EPS) return Math.min(fr(t, T.add, 141), 160);     // "+" touched: the story stops, the picker comes up
  const p = (t - T.tile) * 30; let i = 1; while (i < DEMO.length - 1 && p > DEMO[i][0]) i++;
  return lerp(DEMO[i - 1][1], DEMO[i][1], (p - DEMO[i - 1][0]) / (DEMO[i][0] - DEMO[i - 1][0]));
}
const PICKER = T.add + 19 / 30;                                       // the picker is up (edit 160); its photos come in
const PICK_IDX = [9, 18, 28, 36, 46, 55, 64, 73, 82, 91, 100, 110];   // mli_pick's touch-down frame of each pick
function pickFrame(t) {
  if (t >= T.done - EPS) return fr(t, T.done, 149);                   // Done; the picker slides away (159-182)
  if (t < T.picks[0] - EPS) return clamp(fr(t, T.picks[0], 9), 0, 8);
  let i = 11; while (t < T.picks[i] - EPS) i--;
  return Math.min(fr(t, T.picks[i], PICK_IDX[i]), i < 11 ? PICK_IDX[i + 1] - 1 : 148);
}
function shareFrame(t) {
  if (t < T.insta - EPS) return clamp(fr(t, T.share, 10), 7, 113);    // Share touched at 10, its sheet up by 34
  if (t < T.insta + 0.7 - EPS) return fr(t, T.insta, 117);            // Instagram touched; "Rendering…" from 129
  return Math.min(fr(t, T.insta + 0.7, 138, 89 / 69), 227);           // the render, which the sequence already has at 6×
}
// The other templates are rendered faster than the app plays them (Minimize 1.67×, the others 1.25×), from the start of
// their swipe in, so three of them go by a frame a frame; Taskbar eases a little after its second window so that all
// three land on a beat, as Minimize's do: [film frames after its beat, t60f_task frame].
const TASK = [[-10.8, 1.2], [43.2, 109.2], [72, 162], [86.4, 188.4]];
function clipFrame(key, t0, t) {
  if (key === 'wall') return fr(t, t0, 0);                            // held on its first frame through the pull-back
  if (key !== 'task') return fr(t, t0 - SWIPE, 0);
  const p = (t - t0) * 30; let i = 1; while (i < TASK.length - 1 && p > TASK[i][0]) i++;
  return lerp(TASK[i - 1][1], TASK[i][1], (p - TASK[i - 1][0]) / (TASK[i][0] - TASK[i - 1][0]));
}
// app: the screen; app2 over it by mix; play: the story's frame over the preview, with the app's play button when
// paused; icon: the frame the scrubber's pause icon comes from while the story plays on over a paused take; full: what
// fills the frame from T.full to T.out, the story and then the other templates; next: what is coming in over it, with
// cut: how ('swipe' or 'zoom') and from when to when. While the others are up the story plays on unseen: it comes back
// further along and finishes on the touch of Share.
function framesAt(t) {
  const back = t >= T.out - SWIPE - EPS;
  const playAt = t < T.show - EPS ? fr(t, T.story, 0) : !back ? fr(T.show, T.story, 0) : Math.min(fr(t, T.share, SEQS.play - 1), SEQS.play - 1);
  const play = t >= T.story - EPS ? fkey('play', playAt) : null, paused = t >= T.share + 0.133 - EPS;
  const clip = k => fkey(SHOW[k][1], clipFrame(SHOW[k][1], SHOW[k][0], t));
  const n = SHOW.findLastIndex(([t0]) => t >= t0 - EPS), m = SHOW.findLastIndex(([t0, key]) => t >= t0 - (key === 'wall' ? ZOOM : SWIPE) - EPS);
  let full = null, next = null, cut = null;
  if (t >= T.full - EPS && t < T.out - EPS) {
    full = n < 0 ? play : clip(n);
    if (back) { next = play; cut = ['swipe', T.out - SWIPE, T.out]; }
    else if (m > n) { next = clip(m); cut = SHOW[m][1] === 'wall' ? ['zoom', WALL - ZOOM, WALL] : ['swipe', SHOW[m][0] - SWIPE, SHOW[m][0]]; }
  }
  let app, app2 = null, mix = 0, icon = null;
  if (t < T.tile - EPS) app = fkey('home', t < T.drags[1] - EPS ? clamp(fr(t, T.drags[0], 0, 1.25), 0, 18) : Math.min(fr(t, T.drags[1], 18, 1.25), 36));
  else if (t < PICKER + 0.12 - EPS) {
    app = fkey('edit', editFrame(t));
    if (t > PICKER - 0.015) { app2 = fkey('pick', 0); mix = prog(t, PICKER - 0.015, PICKER + 0.12); }
  }
  else if (t < T.playTap - EPS) app = fkey('pick', pickFrame(t));
  else if (t < T.playTap + 1 - EPS) app = fkey('resume', fr(t, T.playTap, 0));      // play touched; the story is on again 6 frames later
  else { app = fkey('share', shareFrame(t)); if (!paused) icon = fkey('resume', 29); }
  return { app, app2, mix, play, full, next, cut, wall: n === 4, paused, icon };
}
const ICON = [58, 1536, 46, 50];                                      // the scrubber's play/pause icon, in screen-canvas px
// Share's sheet over the editor: its top edge in native px (mli_share 20-34, then "Rendering…"), and how much it dims
// the preview (20-30).
const SHEET = [2868, 2631, 2241, 2076, 1853, 1721, 1721, 1622, 1595, 1595, 1576, 1567, 1563, 1559, 1555];
const DIM = [1, 0.966, 0.914, 0.879, 0.845, 0.826, 0.823, 0.808, 0.806, 0.804, 0.802];
function sheetAt(t) {
  if (t < T.share) return { top: 2868, dim: 1 };
  const i = Math.round(shareFrame(t));
  return { top: i >= 129 ? 1322 : SHEET[clamp(i - 20, 0, 14)], dim: DIM[clamp(i - 20, 0, 10)] };
}
// ---------- type
function setFont(fam, size, weight = 400, track = 0, g = ctx) { g.font = `${weight} ${size}px ${fam}`; g.letterSpacing = track + 'px'; }
function measure(s, fam, size, weight = 400, track = 0) { ctx.save(); setFont(fam, size, weight, track); const w = ctx.measureText(s).width - (s.length ? track : 0); ctx.restore(); return w; }
function txt(s, x, y, size, { fam = SANS, weight = 400, color = PRINT, align = 'center', track = 0, shadow = 0 } = {}) {
  ctx.save(); setFont(fam, size, weight, track); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const w = ctx.measureText(s).width - (s.length ? track : 0);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  if (shadow) { ctx.shadowColor = `rgba(0,0,0,${shadow})`; ctx.shadowBlur = size * 0.4; ctx.shadowOffsetY = size * 0.04; }
  ctx.fillStyle = color; ctx.fillText(s, x0, y); ctx.restore();
  return { x0, w };
}
// ---------- the table, in centimetres: x right, y away from the viewer, z up. The phone lies at the origin.
const PHONE = { w: 7.8, h: 16.43, r: 1.3, thick: 0.8, sw: 7.36, sh: 15.99, sr: 1.08 };
const SW = 920, SH = 2000, CM = PHONE.sw / SW;                       // the screen canvas, and cm per screen px
// The editor's preview, just inside its rounded corners (x 160-1158, y 379-2153 of 1320×2868: the part gfm_play holds),
// in screen-canvas px, and on the table.
const PV = { x: 160 * SW / 1320, y: 379 * SH / 2868, w: 998 * SW / 1320, h: 1774 * SH / 2868 };
const PVC = { x: (PV.x + PV.w / 2 - SW / 2) * CM, y: (SH / 2 - PV.y - PV.h / 2) * CM, w: PV.w * CM, h: PV.h * CM };
const FOV = 34 * Math.PI / 180, FILL = PVC.h / (2 * Math.tan(FOV / 2));  // camera height at which the preview fills the frame

// Camera keys: time, target x y z, distance, pitch (0 = straight down), yaw, aperture (blur px at 2× focus). The path
// is a monotone cubic through them (Fritsch-Carlson), so it never overshoots and rests where two keys agree.
const ONPHONE = [0, 2.2, 0.8, 36, 14];                                // the phone low in the frame, the table above it left to the titles
const CAMKEYS = [
  [0.0, 0.6, 1.2, 0.8, 48, 25, -11, 30],                              // from further off and lower, in to the phone
  [2.6, ...ONPHONE, -3, 34],
  [18 * B, 0, 2.2, 0.8, 35.5, 14, -1.5, 34],
  [T.story, 0, 2.25, 0.8, 35, 13.5, 2, 34],
  [T.full, PVC.x, PVC.y, 0.81, FILL, 0, 0, 0],
  [T.out, PVC.x, PVC.y, 0.81, FILL, 0, 0, 0],
  [T.out + 2 * B, ...ONPHONE, 2.5, 34],
  [T.off, 0, 2.2, 0.8, 35.3, 14, 0.5, 34],
  [T.card, 0, 27, 8, 13, 0, 0, 40],                                   // bare table, out of focus, for the name
  [T.dur, 0, 27, 8, 13, 0, 0, 40],
];
function pchip(xs, ys) {
  const n = xs.length, h = [], dl = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; dl[i] = (ys[i + 1] - ys[i]) / h[i]; }
  m[0] = dl[0]; m[n - 1] = dl[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (dl[i - 1] * dl[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]); }
  }
  return x => {
    let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
    const s = clamp((x - xs[i]) / h[i], 0, 1), s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (3 * s2 - 2 * s3) * ys[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}
const CAMPATH = [1, 2, 3, 4, 5, 6, 7].map(k => pchip(CAMKEYS.map(r => r[0]), CAMKEYS.map(r => k === 4 ? Math.log(r[k]) : r[k])));
function camAt(t) {
  const v = CAMPATH.map(f => f(t));
  const c = { tx: v[0], ty: v[1], tz: v[2], d: Math.exp(v[3]), pitch: v[4] * Math.PI / 180, yaw: v[5] * Math.PI / 180, aper: Math.max(v[6], 0) };
  const sp = Math.sin(c.pitch), cp = Math.cos(c.pitch), sy = Math.sin(c.yaw), cy = Math.cos(c.yaw);
  const rz = (x, y, z) => [x * cy - y * sy, x * sy + y * cy, z];
  c.right = rz(1, 0, 0); c.up = rz(0, cp, sp); c.back = rz(0, -sp, cp);
  c.pos = [c.tx + c.d * c.back[0], c.ty + c.d * c.back[1], c.tz + c.d * c.back[2]];
  return c;
}

// ---------- matrices (column-major)
const M4 = {
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
  trans: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
  rotZ: a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
  rotX: a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
  rotY: a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
  persp(fovy, asp, n, f) { const k = 1 / Math.tan(fovy / 2); return [k / asp, 0, 0, 0, 0, k, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; },
  view(c) { const r = c.right, u = c.up, b = c.back, p = c.pos, d = v => -(v[0] * p[0] + v[1] * p[1] + v[2] * p[2]);
            return [r[0], u[0], b[0], 0, r[1], u[1], b[1], 0, r[2], u[2], b[2], 0, d(r), d(u), d(b), 1]; },
};
// ---------- WebGL2 renderer
const glc = mk(W, H);
const G = glc.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
const MAXB = 24;                                                      // largest blur radius, px
const VS_QUAD = `#version 300 es
layout(location=0) in vec2 a;
uniform mat4 uVP, uM; uniform vec2 uSize; uniform float uPad;
out vec2 vL; out vec3 vW;
void main(){ vL = a * (uSize + 2.0 * uPad); vec4 w = uM * vec4(vL, 0.0, 1.0); vW = w.xyz; gl_Position = uVP * w; }`;
// Modes: 0 table, 2 phone body, 3 phone glass, 4 shadow, 5 screen (emissive).
const FS_QUAD = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uMode;
uniform vec2 uSize; uniform float uRad, uSoft, uAlpha, uBright, uClip;
uniform vec4 uUV; uniform vec3 uColor, uCam, uN;
uniform vec3 uKeyCol, uAmb, uScrCol, uKey;
uniform vec4 uScr, uBox; uniform float uBoxZ, uBoxI, uFocus, uAper;
in vec2 vL; in vec3 vW;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float box(vec3 V, float soft){
  vec3 R = reflect(-V, uN); if (R.z < 0.02) return 0.0;
  vec2 h = vW.xy + R.xy * ((uBoxZ - vW.z) / R.z);
  vec2 e = abs(h - uBox.xy) - uBox.zw;
  return 1.0 - smoothstep(-soft, soft, max(e.x, e.y));
}
void main(){
  float d = sdRR(vL, uSize * 0.5, uRad);
  float dist = length(uCam - vW);
  float coc = clamp(uAper * abs(dist - uFocus) / dist, 0.0, ${MAXB}.0) / ${MAXB}.0;
  vec3 c = vec3(0.0); float a;
  if (uMode == 4) a = uAlpha * smoothstep(uSoft, -uSoft, d);
  else {
    a = uAlpha * clamp(0.5 - d / max(fwidth(d), 1e-5), 0.0, 1.0) * step(uClip, vL.y);
    vec3 V = normalize(uCam - vW); float nv = max(dot(uN, V), 0.0), fres = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
    float r = length(vW.xy - uKey.xy);
    vec2 q = abs(vW.xy - uScr.xy) - uScr.zw; float rs = length(max(q, 0.0));
    vec3 L = uAmb + uKeyCol * exp(-r * r / (uKey.z * uKey.z)) + uScrCol / (1.0 + rs * rs / 22.0);
    vec2 uv = mix(uUV.xy, uUV.zw, vec2(vL.x / uSize.x + 0.5, 0.5 - vL.y / uSize.y));
    if (uMode == 0) { c = texture(uTex, vW.xy / vec2(52.0, 92.0)).rgb * uColor * L; c += L * 0.05 * pow(1.0 - nv, 3.0); }
    else if (uMode == 2) c = uColor * (0.35 + L);
    else if (uMode == 3) c = uColor + uBoxI * 1.5 * fres * box(V, 4.0) * vec3(1.0, 0.98, 0.95);
    else c = texture(uTex, uv).rgb * uBright + uBoxI * 1.2 * fres * box(V, 4.0) * vec3(1.0, 0.98, 0.95);
  }
  o0 = vec4(c, a); o1 = vec4(coc, dist / 400.0, 0.0, a);
}`;
const VS_FULL = `#version 300 es
layout(location=0) in vec2 a; out vec2 uv; void main(){ uv = a + 0.5; gl_Position = vec4(a * 2.0, 0.0, 1.0); }`;
// Depth of field after Dennis Gustafsson: a golden-angle spiral; a tap behind the centre can't smear over it.
const FS_DOF = `#version 300 es
precision highp float;
uniform sampler2D uCol, uInfo; uniform vec2 uPx;
in vec2 uv; out vec4 o;
void main(){
  vec4 ci = texture(uInfo, uv); float cs = ci.r * ${MAXB}.0;
  vec3 col = textureLod(uCol, uv, 1.0).rgb; float acc = cs, tot = 1.0, radius = 3.2;
  for (float ang = 0.0; radius < ${MAXB}.0; ang += 2.39996323) {
    vec2 tc = uv + vec2(cos(ang), sin(ang)) * uPx * radius;
    vec4 si = texture(uInfo, tc); float ss = si.r * ${MAXB}.0;
    if (si.g > ci.g) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    col += mix(col / tot, textureLod(uCol, tc, 1.6).rgb, m);
    acc += mix(acc / tot, ss, m);
    tot += 1.0; radius += 3.2 / radius;
  }
  o = vec4(col / tot, acc / tot / ${MAXB}.0);
}`;
const FS_MIX = `#version 300 es
precision highp float;
uniform sampler2D uCol, uInfo, uBlur; uniform float uUse;
in vec2 uv; out vec4 o;
void main(){
  vec3 s = texture(uCol, uv).rgb; vec4 b = texture(uBlur, uv);
  float c = max(texture(uInfo, uv).r, b.a) * ${MAXB}.0;
  o = vec4(mix(s, b.rgb, uUse * smoothstep(0.7, 2.6, c)), 1.0);
}`;
const R = { tex: {} };
function glProgram(vs, fs) {
  const sh = (type, src) => { const s = G.createShader(type); G.shaderSource(s, src); G.compileShader(s); if (!G.getShaderParameter(s, G.COMPILE_STATUS)) throw new Error(G.getShaderInfoLog(s)); return s; };
  const p = G.createProgram(); G.attachShader(p, sh(G.VERTEX_SHADER, vs)); G.attachShader(p, sh(G.FRAGMENT_SHADER, fs)); G.linkProgram(p);
  if (!G.getProgramParameter(p, G.LINK_STATUS)) throw new Error(G.getProgramInfoLog(p));
  const u = {}; for (let i = 0, n = G.getProgramParameter(p, G.ACTIVE_UNIFORMS); i < n; i++) { const name = G.getActiveUniform(p, i).name; u[name] = G.getUniformLocation(p, name); }
  return { p, u };
}
function glTexture(src, { repeat = false, mips = true } = {}) {
  const t = G.createTexture(); G.bindTexture(G.TEXTURE_2D, t);
  G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, src);
  const wrap = repeat ? G.MIRRORED_REPEAT : G.CLAMP_TO_EDGE;
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, wrap); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, wrap);
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, mips ? G.LINEAR_MIPMAP_LINEAR : G.LINEAR);
  if (mips) G.generateMipmap(G.TEXTURE_2D);
  if (R.aniso) G.texParameterf(G.TEXTURE_2D, R.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  return t;
}
function glUpdate(t, src) { G.bindTexture(G.TEXTURE_2D, t); G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, src); G.generateMipmap(G.TEXTURE_2D); }
function glTarget(w, h, formats) {
  const fb = G.createFramebuffer(); G.bindFramebuffer(G.FRAMEBUFFER, fb);
  const texs = formats.map(([internal, type, mips], i) => {
    const t = G.createTexture(); G.bindTexture(G.TEXTURE_2D, t);
    G.texImage2D(G.TEXTURE_2D, 0, internal, w, h, 0, G.RGBA, type, null);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, mips ? G.LINEAR_MIPMAP_LINEAR : G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
    G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
    G.framebufferTexture2D(G.FRAMEBUFFER, G.COLOR_ATTACHMENT0 + i, G.TEXTURE_2D, t, 0);
    return t;
  });
  G.drawBuffers(formats.map((_, i) => G.COLOR_ATTACHMENT0 + i));
  if (G.checkFramebufferStatus(G.FRAMEBUFFER) !== G.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer incomplete');
  return { fb, texs };
}
function initScene() {
  if (!G.getExtension('EXT_color_buffer_float') && !G.getExtension('EXT_color_buffer_half_float')) throw new Error('no float render targets');
  R.aniso = G.getExtension('EXT_texture_filter_anisotropic');
  R.quad = glProgram(VS_QUAD, FS_QUAD); R.dof = glProgram(VS_FULL, FS_DOF); R.mix = glProgram(VS_FULL, FS_MIX);
  const b = G.createBuffer(); G.bindBuffer(G.ARRAY_BUFFER, b);
  G.bufferData(G.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), G.STATIC_DRAW);
  G.enableVertexAttribArray(0); G.vertexAttribPointer(0, 2, G.FLOAT, false, 0, 0);
  R.scene = glTarget(W, H, [[G.RGBA8, G.UNSIGNED_BYTE, true], [G.RGBA16F, G.HALF_FLOAT, false]]);
  R.half = glTarget(W / 2, H / 2, [[G.RGBA8, G.UNSIGNED_BYTE, false]]);
  R.tex.table = glTexture(IMG.table, { repeat: true });
  R.tex.white = glTexture(mk(2, 2));
  R.tex.screen = glTexture(scr); R.tex.play = glTexture(pv);
}
function drawQuad(o) {
  const u = R.quad.u;
  const M = M4.mul(M4.trans(o.x, o.y, o.z || 0), M4.mul(M4.rotZ(o.rot || 0), M4.mul(M4.rotX(o.tx || 0), M4.rotY(o.ty || 0))));
  G.uniformMatrix4fv(u.uM, false, M); G.uniform3f(u.uN, M[8], M[9], M[10]);
  G.uniform1i(u.uMode, o.mode); G.uniform2f(u.uSize, o.w, o.h);
  G.uniform1f(u.uPad, o.mode === 4 ? o.soft * 1.5 : o.mode === 0 ? 0 : 0.2);
  G.uniform1f(u.uRad, o.rad || 0); G.uniform1f(u.uSoft, o.soft || 0); G.uniform1f(u.uAlpha, o.alpha ?? 1);
  G.uniform1f(u.uBright, o.bright ?? 1); G.uniform1f(u.uClip, o.clip ?? -1e5);
  const uv = o.uv || [0, 0, 1, 1]; G.uniform4f(u.uUV, uv[0], uv[1], uv[2], uv[3]);
  const col = o.color || [1, 1, 1]; G.uniform3f(u.uColor, col[0], col[1], col[2]);
  G.bindTexture(G.TEXTURE_2D, o.tex || R.tex.white);
  G.drawArrays(G.TRIANGLE_STRIP, 0, 4);
}
function renderTable(t, look) {
  const c = camAt(t), u = R.quad.u;
  G.bindFramebuffer(G.FRAMEBUFFER, R.scene.fb); G.viewport(0, 0, W, H);
  G.clearBufferfv(G.COLOR, 0, [0, 0, 0, 1]); G.clearBufferfv(G.COLOR, 1, [1, 1, 0, 1]);
  G.enable(G.BLEND); G.blendFuncSeparate(G.SRC_ALPHA, G.ONE_MINUS_SRC_ALPHA, G.ONE, G.ONE_MINUS_SRC_ALPHA);
  G.useProgram(R.quad.p); G.activeTexture(G.TEXTURE0); G.uniform1i(u.uTex, 0);
  G.uniformMatrix4fv(u.uVP, false, M4.mul(M4.persp(FOV, W / H, 1, 900), M4.view(c)));
  G.uniform3f(u.uCam, c.pos[0], c.pos[1], c.pos[2]); G.uniform1f(u.uFocus, c.d); G.uniform1f(u.uAper, c.aper);
  const key = look.key; G.uniform3f(u.uKeyCol, 1.0 * key, 0.93 * key, 0.84 * key); G.uniform3f(u.uAmb, 0.085, 0.085, 0.1); G.uniform3f(u.uKey, -3, 5, 36);
  G.uniform4f(u.uScr, 0, 0, PHONE.sw / 2, PHONE.sh / 2); G.uniform3f(u.uScrCol, look.glow[0], look.glow[1], look.glow[2]);
  G.uniform4f(u.uBox, -42, 66, 26, 15); G.uniform1f(u.uBoxZ, 70); G.uniform1f(u.uBoxI, 2.6);

  drawQuad({ mode: 0, x: 0, y: 40, w: 700, h: 700, tex: R.tex.table, color: [0.2, 0.195, 0.19] });
  // phone: shadow, body (stacked for its thickness), glass, screen, and the story's render over the preview
  drawQuad({ mode: 4, x: 0.3, y: -0.35, z: 0.06, w: PHONE.w + 0.2, h: PHONE.h + 0.2, rad: PHONE.r, soft: 1.1, alpha: 0.7 });
  for (let k = 0; k < 8; k++) { const s = 0.5 + 0.5 * k / 7; drawQuad({ mode: 2, x: 0, y: 0, z: 0.07 + PHONE.thick * k / 8, w: PHONE.w, h: PHONE.h, rad: PHONE.r, color: [0.19 * s, 0.19 * s, 0.2 * s] }); }
  drawQuad({ mode: 3, x: 0, y: 0, z: PHONE.thick + 0.07, w: PHONE.w - 0.06, h: PHONE.h - 0.06, rad: PHONE.r - 0.03, color: [0.012, 0.012, 0.014] });
  drawQuad({ mode: 5, x: 0, y: 0, z: PHONE.thick + 0.075, w: PHONE.sw, h: PHONE.sh, rad: PHONE.sr, tex: look.screen, bright: look.bright });
  if (look.preview) {
    const cut = (look.sheet.top * SH / 2868 - PV.y) / PV.h;                         // a sheet covers the preview below this
    drawQuad({ mode: 5, x: PVC.x, y: PVC.y, z: PHONE.thick + 0.08, w: PVC.w, h: PVC.h, rad: 0.17 * look.round, tex: R.tex.play,
               bright: look.bright * look.sheet.dim, clip: PVC.h * (0.5 - cut) });
  }
  G.disable(G.BLEND);

  // depth of field, then to the canvas
  const useDof = c.aper > 0.01;
  G.bindTexture(G.TEXTURE_2D, R.scene.texs[0]); G.generateMipmap(G.TEXTURE_2D);
  if (useDof) {
    G.bindFramebuffer(G.FRAMEBUFFER, R.half.fb); G.viewport(0, 0, W / 2, H / 2); G.useProgram(R.dof.p);
    G.activeTexture(G.TEXTURE1); G.bindTexture(G.TEXTURE_2D, R.scene.texs[1]); G.activeTexture(G.TEXTURE0);
    G.uniform1i(R.dof.u.uCol, 0); G.uniform1i(R.dof.u.uInfo, 1); G.uniform2f(R.dof.u.uPx, 1 / W, 1 / H);
    G.drawArrays(G.TRIANGLE_STRIP, 0, 4);
  }
  G.bindFramebuffer(G.FRAMEBUFFER, null); G.viewport(0, 0, W, H); G.useProgram(R.mix.p);
  G.activeTexture(G.TEXTURE1); G.bindTexture(G.TEXTURE_2D, R.scene.texs[1]);
  G.activeTexture(G.TEXTURE2); G.bindTexture(G.TEXTURE_2D, R.half.texs[0]);
  G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, R.scene.texs[0]);
  G.uniform1i(R.mix.u.uCol, 0); G.uniform1i(R.mix.u.uInfo, 1); G.uniform1i(R.mix.u.uBlur, 2); G.uniform1f(R.mix.u.uUse, useDof ? 1 : 0);
  G.drawArrays(G.TRIANGLE_STRIP, 0, 4);
}

// ---------- the phone screen, a 920×2000 canvas fed by the take, with a touch dot; and the preview's own canvas
const scr = mk(SW, SH), sg = scr.getContext('2d');
const pv = mk(1080, 1920), pvg = pv.getContext('2d');
const probe = mk(8, 16), pg = probe.getContext('2d', { willReadFrequently: true });
function drawTouch(g, d, x, y, k) {
  g.save(); g.globalAlpha = d.a; g.translate(x, y); g.scale(d.s * k, d.s * k);
  g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 22 * k; g.fillStyle = 'rgba(150,150,156,0.5)'; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill();
  g.shadowColor = 'transparent'; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.stroke();
  g.restore();
}
// The story's frame, with what the screen has over it there: the editor's play button while the story is paused (a
// grey disc and a white triangle), and the touch dot (d).
function drawPreview(img, paused, d) {
  pvg.drawImage(img, 0, 0, 1080, 1920);
  if (paused) {
    pvg.fillStyle = 'rgba(84,84,86,0.62)'; pvg.beginPath(); pvg.arc(540, 960, 89, 0, Math.PI * 2); pvg.fill();
    pvg.fillStyle = '#fff'; pvg.strokeStyle = '#fff'; pvg.lineWidth = 12; pvg.lineJoin = 'round';
    pvg.beginPath(); pvg.moveTo(524, 934); pvg.lineTo(566, 960); pvg.lineTo(524, 986); pvg.closePath(); pvg.fill(); pvg.stroke();
  }
  if (d && d.a > 0) drawTouch(pvg, d, (d.x * SW - PV.x) * 1080 / PV.w, (d.y * SH - PV.y) * 1920 / PV.h, 1080 / PV.w);
}
// Touches: [down, up, x0, y0, x1, y1, a] in screen fractions. A tap goes down and up at once. A drag carries the finger
// along the scroll's ease-out; a is how far along it the finger lifts (1: it stays down to the end, as in the take).
// Touches closer than 0.8 s are one finger gliding between them.
const tap = (t, x, y) => [t, t, x, y, x, y, 1];
const TILES = [[0.166, 0.262], [0.5, 0.262], [0.835, 0.262], [0.835, 0.416], [0.5, 0.416], [0.166, 0.416],
               [0.166, 0.57], [0.5, 0.57], [0.835, 0.57], [0.835, 0.725], [0.5, 0.725], [0.166, 0.725]];
const TOUCHES = [...T.drags.map(t0 => [t0, t0 + B, 0.55, 0.71, 0.55, 0.179, 1]), tap(T.tile, 0.261, 0.5625), tap(T.add, 0.104, 0.845),
                 ...T.picks.map((at, i) => tap(at, ...TILES[i])), tap(T.done, 0.905, 0.145),
                 tap(T.playTap, 0.5, 0.441), tap(T.share, 0.866, 0.088), tap(T.insta, 0.279, 0.73)];
const STROKES = TOUCHES.reduce((g, c) => { const last = g[g.length - 1]; if (last && c[0] - last[last.length - 1][1] < 0.8) last.push(c); else g.push([c]); return g; }, []);
function touchAt(t) {
  for (const s of STROKES) {
    const t0 = s[0][0] - 0.34, t1 = s[s.length - 1][1] + 0.34;
    if (t < t0 || t > t1) continue;
    let x, y, press = 0;
    if (t <= s[0][0]) { const u = E.outCubic(prog(t, t0, s[0][0] - 0.06)); x = s[0][2] + 0.03 * (1 - u); y = s[0][3] + 0.045 * (1 - u); }
    else {
      let i = s.length - 1; while (t < s[i][0]) i--;
      const c = s[i], n = s[i + 1], ease = v => 1 - (1 - c[6] * v) ** 2;
      if (t <= c[1]) { const u = ease(prog(t, c[0], c[1])) / ease(1); x = lerp(c[2], c[4], u); y = lerp(c[3], c[5], u); }
      else if (n) { const u = E.inOutCubic(prog(t, c[1] + 0.04, n[0] - 0.04)); x = lerp(c[4], n[2], u); y = lerp(c[5], n[3], u); }
      else { x = c[4]; y = c[5]; }
    }
    for (const c of s) press = Math.max(press, c[1] > c[0] ? prog(t, c[0] - 0.03, c[0]) * (1 - prog(t, c[1], c[1] + 0.05)) : bump(t, c[0] + 0.02, 0.06));
    return { x, y, a: prog(t, t0, t0 + 0.16) * (1 - prog(t, t1 - 0.2, t1)), s: 1.12 - 0.3 * press };
  }
  return null;
}
// The recorder's watermark survives on the bottom-left corner of the sheets (the picker's while it loads, and
// Share's). They are symmetric, so the mirrored right corner goes over it, feathered at the top and the inner edge.
// While a sheet is on its way up or down, what crosses the corner isn't symmetric, so there (soft) it is blurred instead.
const wm = mk(336, 124), wg = wm.getContext('2d');
function patchCorner(img, soft) {
  wg.globalCompositeOperation = 'source-over'; wg.clearRect(0, 0, 336, 124);
  if (soft) { wg.drawImage(img, 0, SH - 124, 336, 124, 0, 0, 336, 124); wg.filter = 'blur(14px)'; wg.drawImage(img, 0, SH - 124, 336, 124, 0, 0, 336, 124); wg.filter = 'none'; }
  else { wg.save(); wg.scale(-1, 1); wg.drawImage(img, SW - 336, SH - 124, 336, 124, -336, 0, 336, 124); wg.restore(); }
  wg.globalCompositeOperation = 'destination-in';
  let m = wg.createLinearGradient(0, 0, 0, 20); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, '#000'); wg.fillStyle = m; wg.fillRect(0, 0, 336, 124);
  m = wg.createLinearGradient(312, 0, 336, 0); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); wg.fillStyle = m; wg.fillRect(0, 0, 336, 124);
  sg.drawImage(wm, 0, SH - 124);
}
function drawScreen(t, F) {
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalAlpha = 1; sg.fillStyle = '#000'; sg.fillRect(0, 0, SW, SH);
  const a = fimg(F.app), b = fimg(F.app2), icon = fimg(F.icon);
  if (a) {
    sg.drawImage(a, 0, 0, SW, SH);
    const top = sheetAt(t).top;
    if ((t > T.add + 0.36 && t < PICKER + 0.12) || top < 2650) patchCorner(a, top < 2650 && top > 1580);
  }
  if (b && F.mix > 0) { sg.globalAlpha = F.mix; sg.drawImage(b, 0, 0, SW, SH); sg.globalAlpha = 1; }
  if (icon) sg.drawImage(icon, ...ICON, ...ICON);
  const d = touchAt(t);
  if (d && d.a > 0) drawTouch(sg, d, d.x * SW, d.y * SH, 1);
}

// ---------- the film's own type: Montserrat on the table above the phone, never on its screen. [in, out, line, a line under it]
const TITLES = [[0.3, 5.3, 'This is Grain.', 'Your photo dump, done in a minute.'], [5.5, 8.3, 'Pick a template.'], [8.75, 11.65, 'Add your photos.'],
                [11.75, 14.75, 'Grain does the rest.'], [WALL + 0.14, T.out - SWIPE, '60+ animated templates.'], [T.share + 0.14, T.share + 3.14, 'Straight to Instagram.']];
const TITLE_Y = 300;                                                  // baseline of a title's last line
function titles(t) {
  for (const [t0, t1, line, under] of TITLES) {
    if (t < t0 || t >= t1) continue;
    const out = 1 - prog(t, t1 - 0.3, t1), rise = delay => E.outCubic(prog(t, t0 + delay, t0 + delay + 0.45));
    const size = Math.min(96, 96 * 900 / measure(line, SANS, 96, 700, -96 * 0.02));
    let u = rise(0); ctx.globalAlpha = u * out;
    txt(line, W / 2, TITLE_Y - (under ? 86 : 0) + 18 * (1 - u), size, { weight: 700, track: -size * 0.02, shadow: 0.55 });
    if (under) { u = rise(0.6); ctx.globalAlpha = u * out; txt(under, W / 2, TITLE_Y + 18 * (1 - u), 46, { weight: 500, color: PAPER, shadow: 0.55 }); }
    ctx.globalAlpha = 1;
  }
}
// The end card, on the bare table: icon, name, line, where to get it. Each part fades up in turn, then all of it rests.
const CARD0 = T.card - 0.5;
function endCard(t) {
  if (t < CARD0) return;
  const part = (delay, draw) => { const u = E.outCubic(prog(t, CARD0 + delay, CARD0 + delay + 0.6)); ctx.save(); ctx.globalAlpha = u; ctx.translate(0, 26 * (1 - u)); draw(); ctx.restore(); };
  ctx.fillStyle = `rgba(15,15,16,${0.28 * prog(t, CARD0, CARD0 + 0.8)})`; ctx.fillRect(0, 0, W, H);
  part(0, () => {
    const s = 230, x = W / 2 - s / 2, y = 590;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 22; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.225); ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.225); ctx.clip(); ctx.drawImage(IMG.icon, x, y, s, s); ctx.restore();
  });
  part(0.12, () => txt('Grain', W / 2, 1010, 150, { weight: 800, track: -4, shadow: 0.4 }));
  part(0.24, () => txt('Your month, in one story.', W / 2, 1096, 46, { weight: 500, color: PAPER, shadow: 0.4 }));
  part(0.42, () => {
    const w = measure('On the App Store', SANS, 38, 700) + 96, h = 92, y = 1250;
    ctx.fillStyle = PRINT; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    txt('On the App Store', W / 2, y + 13, 38, { weight: 700, color: INK });
  });
}

// ---------- the film's cuts between the full-frame templates
// A full-frame shot at x; the wall's top goes dark under the title.
function shot(g, img, x, shade) {
  g.drawImage(img, x, 0, W, H);
  if (!shade) return;
  const f = g.createLinearGradient(0, 0, 0, 760);
  f.addColorStop(0, `rgba(15,15,16,${0.92 * shade})`); f.addColorStop(0.45, `rgba(15,15,16,${0.78 * shade})`); f.addColorStop(1, 'rgba(15,15,16,0)');
  g.fillStyle = f; g.fillRect(x, 0, W, 760);
}
// The next one swiped in from the right, as stories are: both a little back from the frame, with rounded corners, while they move.
function swipe(g, a, b, u, shade) {
  const e = E.inOutCubic(u), k = Math.sin(Math.PI * e), s = 1 - 0.07 * k, pitch = W + 56;
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.scale(s, s); g.translate(-W / 2 - e * pitch, -H / 2);
  for (const [img, x, sh] of [[a, 0, shade], [b, pitch, 0]]) { g.save(); g.beginPath(); g.roundRect(x, 0, W, H, 44 * k); g.clip(); shot(g, img, x, sh); g.restore(); }
  g.restore();
}
// The camera pulls back out of the receipt, still playing, until it is one tile of the wall (wall.py puts it there).
const TILE = { x: 442, y: 744, w: 196, h: 348, r: 11 };
function pullBack(g, live, u) {
  const e = E.inOutCubic(u), s = Math.exp(Math.log(H / TILE.h) * (1 - e)), cx = TILE.x + TILE.w / 2, cy = TILE.y + TILE.h / 2;
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.save(); g.translate(lerp(W / 2, cx, e), lerp(H / 2, cy, e)); g.scale(s, s); g.translate(-cx, -cy);
  g.drawImage(IMG.wall0, 0, 0, W, H);
  g.beginPath(); g.roundRect(TILE.x, TILE.y, TILE.w, TILE.h, TILE.r * Math.min(1, 4 * e)); g.clip();
  g.drawImage(live, TILE.x, TILE.y, TILE.w, TILE.h);
  g.restore();
}
// Motion blur: n drawings over half a frame's time, averaged.
const cutc = mk(W, H), cutg = cutc.getContext('2d');
function shutter(n, draw) {
  for (let i = 0; i < n; i++) { draw(cutg, i / n / 60); ctx.globalAlpha = 1 / (i + 1); ctx.drawImage(cutc, 0, 0); }
  ctx.globalAlpha = 1;
}

// ---------- the film
function film(u, t) {
  const F = framesAt(t), play = fimg(F.play), full = fimg(F.full);
  const handoff = F.full ? prog(t, T.full, T.full + 0.1) : 0;         // 1: the story, or another template, alone
  if (handoff < 1) {
    drawScreen(t, F);
    pg.drawImage(scr, 0, 0, 8, 16); const px = pg.getImageData(0, 0, 8, 16).data; let r = 0, g = 0, b = 0;
    for (let i = 0; i < px.length; i += 4) { r += px[i]; g += px[i + 1]; b += px[i + 2]; }
    const k = 0.34 / (128 * 255);                                     // the screen lights the table with its own average colour
    glUpdate(R.tex.screen, scr);
    if (play) { drawPreview(play, F.paused, touchAt(t)); glUpdate(R.tex.play, pv); }
    renderTable(t, { key: 0.6, glow: [r * k, g * k, b * k], bright: 1, screen: R.tex.screen,
                     preview: !!play, sheet: sheetAt(t), round: t < T.full ? 1 - prog(t, T.full - 0.5, T.full) : prog(t, T.out, T.out + 0.5) });
    ctx.drawImage(glc, 0, 0);
  }
  if (handoff > 0 && full) {
    const next = fimg(F.next), shade = F.wall ? prog(t, WALL, WALL + 0.3) : 0;
    if (F.cut && next) {
      const [kind, t0, t1] = F.cut;
      shutter(kind === 'zoom' ? 10 : 16, (g, dt) => kind === 'zoom' ? pullBack(g, full, prog(t + dt, t0, t1)) : swipe(g, full, next, prog(t + dt, t0, t1), shade));
    }
    else { ctx.globalAlpha = handoff; shot(ctx, full, 0, shade); ctx.globalAlpha = 1; }
  }
  titles(t); endCard(t);
}

const COMP = {
  duration: T.dur, fps: 30,
  theme: { bg: BG, text: PRINT, accent: PRINT, sans: SANS },
  images: { icon: 'img/icon.png', table: 'img/table.jpg', wall0: 'img/t60f_wall0.jpg' },
  async prepare() {
    for (const weight of [500, 700, 800]) { const f = new FontFace(SANS, `url(fonts/Montserrat-${weight}.woff2)`, { weight: String(weight) }); await f.load(); document.fonts.add(f); }
    initScene();
  },
  scenes: [[0, film]],
  grain: 0.04, shift: 0.5, scanlines: 0, vignette: 0.42, wobble: 0,
};
