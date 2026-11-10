// Starter composition: a coherent story skeleton that renders in either orientation (window.FORMAT).
// 1. Fill BRAND from the product itself (CSS custom properties, Tailwind config, app theme, logo file).
//    Never ship these placeholder colours. 2. Write STORY. 3. Replace each scene with a bespoke one that
//    *shows* the feature working (see SKILL.md "Craft bar"); this file is scaffolding, not the piece.
const BRAND = {
  name: 'Your App', tagline: 'What it is, in the landing page’s own words.',
  cta: 'Download free', url: 'example.com',
  bg: '#0b0b0d', surface: '#151518', text: '#f5f5f7', muted: '#a1a1aa', accent: '#6e56cf',
  sans: 'system-ui, -apple-system, "Helvetica Neue", sans-serif', // the product's UI font stack
  logo: null, // e.g. 'img/logo.png'
};
// One idea per scene. Hook = the viewer's problem; features = the USPs, most important first.
const STORY = {
  hook: ['Your problem, in your customer’s words.', 'The moment it bites.'],
  features: [
    { kicker: 'STEP ONE', title: 'Does the main thing.', line: 'Why that matters, in one line.', image: null },
    { kicker: 'PRIVATE', title: 'The differentiator.', line: 'The proof, in one line.', image: null },
    { kicker: 'PAY ONCE', title: 'The deal.', line: 'Price, terms, guarantee.', image: null },
  ],
};
// Beat grid: set BPM (and OFFSET = beat 1 of the bed) from beat_grid.py, then size scenes in bars.
const BPM = 120, OFFSET = 0, BAR = 4 * 60 / BPM;
const LEN = { hook: 3 * BAR, reveal: 2 * BAR, feature: 3 * BAR, cta: 2.5 * BAR };
const CUTS = [0, LEN.hook, LEN.hook + LEN.reveal];
STORY.features.forEach((_, i) => CUTS.push(CUTS[2] + (i + 1) * LEN.feature));
const DURATION = CUTS[CUTS.length - 1] + LEN.cta;

// Layout units: everything is placed relative to the frame so both formats work.
const M = Math.min(W, H) * 0.09;                 // safe margin
const HEAD = LANDSCAPE ? 88 : 104, BODY = LANDSCAPE ? 30 : 40, KICK = LANDSCAPE ? 22 : 30;
function glow(alpha = 1, y = H * 0.45) { glowBg(W / 2, y, Math.max(W, H) * 0.55, [[0, BRAND.accent + '40'], [1, 'rgba(0,0,0,0)']], alpha); }
function kicker(s, x, y, u, t0, align = 'left') {
  const p = E.outExpo(prog(u, t0, t0 + 0.7)); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p; ptext(s, x, y, KICK, { weight: 650, color: BRAND.accent, align, track: KICK * 0.16 }); ctx.restore();
}
// Largest size ≤ size at which s fits maxW (one line; split long copy into two scenes instead of wrapping).
const fit = (s, maxW, size, weight = 700) => Math.min(size, size * maxW / pmeasure(s, size, weight));
function logo(x, y, s, a = 1) { if (IMG.logo && a > 0) { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(IMG.logo, x - s / 2, y - s / 2, s, s); ctx.restore(); } }

// HOOK: two lines, one after the other, each held long enough to read (≥ 0.4 s per word + 1 s).
function hook(u) {
  glow(E.outCubic(prog(u, 0.3, 1.5)) * 0.6);
  STORY.hook.forEach((s, i) => {
    const a = 0.4 + i * LEN.hook / 2, out = E.inCubic(prog(u, a + LEN.hook / 2 - 0.55, a + LEN.hook / 2 - 0.2));
    if (u < a || out >= 1) return;
    ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(0, -out * 30);
    riseWords(s, W / 2, H / 2, fit(s, W - 2 * M, LANDSCAPE ? 64 : 72), u, a, { stagger: 0.07 });
    ctx.restore();
  });
}
// REVEAL: the brand lands on a downbeat.
function reveal(u) {
  glow(E.outCubic(prog(u, 0, 0.8)), H * 0.42);
  const ls = E.outExpo(prog(u, 0.1, 0.9)), out = E.inCubic(prog(u, LEN.reveal - 0.45, LEN.reveal));
  ctx.save(); ctx.globalAlpha *= 1 - out;
  logo(W / 2, H * 0.34, Math.min(W, H) * 0.24 * lerp(0.8, 1, ls), ls);
  riseWords(BRAND.name, W / 2, H * (IMG.logo ? 0.55 : 0.47), LANDSCAPE ? 140 : 150, u, 0.35, { stagger: 0.12, dur: 0.9 });
  fadeText(BRAND.tagline, W / 2, H * (IMG.logo ? 0.65 : 0.57), fit(BRAND.tagline, W - 2 * M, BODY + 4, 500), u, 0.9, { color: BRAND.muted });
  ctx.restore();
}
// FEATURE: text column + visual. Landscape: text left, visual right. Vertical: visual top, text bottom.
function feature(f, i) {
  return u => {
    glow(0.5, LANDSCAPE ? H * 0.5 : H * 0.3);
    ctx.save(); push(u, LEN.feature, { outDur: 0.45 });
    const box = LANDSCAPE ? { x: W * 0.5, y: H * 0.17, w: W * 0.42, h: W * 0.42 * 0.62 } : { x: M, y: H * 0.12, w: W - 2 * M, h: (W - 2 * M) * 0.9 };
    const ein = E.outExpo(prog(u, 0.1, 0.9));
    ctx.save(); ctx.translate(0, (1 - ein) * 60); ctx.globalAlpha *= ein;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
    ctx.fillStyle = BRAND.surface; rrect(box.x, box.y, box.w, box.h, 20); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.save(); rrect(box.x, box.y, box.w, box.h, 20); ctx.clip();
    const img = IMG['f' + i];
    if (img) cover(img, box.x, box.y, box.w, box.h, 1.1 - 0.06 * prog(u, 0, LEN.feature));
    else ptext(String(i + 1).padStart(2, '0'), box.x + box.w / 2, box.y + box.h / 2, box.h * 0.5, { weight: 800, color: BRAND.accent + '33' });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; rrect(box.x, box.y, box.w, box.h, 20); ctx.stroke();
    ctx.restore();
    const tx = LANDSCAPE ? W * 0.08 : M, ty = LANDSCAPE ? H * 0.36 : box.y + box.h + H * 0.08;
    const colW = LANDSCAPE ? W * 0.39 : W - 2 * M, hs = Math.min(HEAD, HEAD * colW / pmeasure(f.title, HEAD)); // fit the column
    kicker(f.kicker, tx, ty, u, 0.4);
    riseWords(f.title, tx, ty + HEAD * 1.1, hs, u, 0.5, { align: 'left', colors: f.title.split(' ').map((_, k, a) => (k === a.length - 1 ? BRAND.accent : BRAND.text)) });
    fadeText(f.line, tx, ty + HEAD * 1.1 + HEAD * 0.95, BODY, u, 1.1, { align: 'left', color: BRAND.muted });
    ctx.restore();
  };
}
// CTA: name, button, URL typed. Leave the last second still so it can be read.
function cta(u) {
  glow(E.outCubic(prog(u, 0, 0.8)), H * 0.4);
  const out = E.inCubic(prog(u, LEN.cta - 0.6, LEN.cta));
  ctx.save(); ctx.globalAlpha *= 1 - out;
  logo(W / 2, H * 0.27, Math.min(W, H) * 0.2, E.outExpo(prog(u, 0.05, 0.8)));
  riseWords(BRAND.name, W / 2, H * 0.46, LANDSCAPE ? 120 : 130, u, 0.25, { stagger: 0.12 });
  const pp = prog(u, 0.9, 1.3);
  if (pp > 0) {
    const s = E.outBack(pp, 1.7), w = pmeasure(BRAND.cta, BODY, 700) + BODY * 2.4;
    ctx.save(); ctx.translate(W / 2, H * 0.6); ctx.scale(s, s);
    ctx.fillStyle = BRAND.accent; rrect(-w / 2, -BODY * 1.25, w, BODY * 2.5, BODY * 1.25); ctx.fill();
    ptext(BRAND.cta, 0, 2, BODY, { weight: 700, color: BRAND.bg }); ctx.restore();
  }
  typedP(BRAND.url, W / 2, H * 0.72, BODY * 1.6, u, 1.4, 0.055);
  ctx.restore();
}

const COMP = {
  duration: DURATION, fps: 30,
  theme: { bg: BRAND.bg, text: BRAND.text, accent: BRAND.accent, font: 'sans', sans: BRAND.sans },
  fonts: [], // the product's own font files: [['Family', 'fonts/family-700.ttf', { weight: '700' }]], family first in BRAND.sans
  images: Object.assign(BRAND.logo ? { logo: BRAND.logo } : {}, Object.fromEntries(STORY.features.map((f, i) => [f, i]).filter(([f]) => f.image).map(([f, i]) => ['f' + i, f.image]))),
  scenes: [[0, hook], [CUTS[1], reveal], ...STORY.features.map((f, i) => [CUTS[2 + i], feature(f, i)]), [CUTS[CUTS.length - 1], cta]],
  whips: CUTS.slice(3, -1),       // smear between pushed feature scenes
  crt: { on: false },
  glitch: [],
  flash: [[CUTS[1], 0.25, 0.12]], // a soft flash as the brand lands
  grain: 0.022, shift: 0.6, scanlines: 0, vignette: 0.32, wobble: 0, // clean brand look
};
