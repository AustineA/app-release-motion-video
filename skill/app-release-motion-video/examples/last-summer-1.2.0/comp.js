// Last Summer 1.2.0 — the reference composition. Loaded after engine/engine.js.
const ORANGE = '#FF8C00', ORANGE_SOFT = '#FFB35C', RED = '#D8452B', BG = '#1A1A1C', CREAM = '#F3EEE6', MUTED = '#AAA49B', GOLD = '#FFD27A';
const SUN = (() => { const c = document.createElement('canvas'); c.width = 900; c.height = 600; return c; })();
const ROLLS = ['home-video', 'gold-snap', 'red-darkroom', 'rewind', 'instant-fade', 'night-vision', 'date-99', 'mju-soft',
  '35-lux', 'classic-slr', 'lo-fi-pop', 'early-digital', 'plastic-lens', '2004', 'ascii'];
// ---------- precomputed textures
let REWIND;
function makeRewind() {
  const img = IMG.camcorder, c = mk(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data, src = new Uint8ClampedArray(p), w = c.width, r = rng(5);
  for (let y = 0; y < c.height; y++) {
    const drop = r() < 0.012 ? 70 : 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = (y * w + Math.max(0, x - 5)) * 4;
      const l = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      p[i] = 16 + 0.8 * (l * 0.6 + src[j] * 0.22) + drop;
      p[i + 1] = 22 + 0.84 * (l * 0.78 + src[i + 1] * 0.12) + drop;
      p[i + 2] = 48 + 0.86 * (l * 0.95 + src[j + 2] * 0.12) + drop;
    }
  }
  g.putImageData(d, 0, 0);
  REWIND = c;
}

// ASCII: same shot, same ramp and amber ink as services/filters/shaders/ascii.ts.
const ACOLS = 64, AROWS = 28, RAMP = ' .:-~+=oO*#M@';
let ASCII = [];
function makeAscii() {
  const c = mk(ACOLS, AROWS), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(IMG.camcorder, 0, 0, ACOLS, AROWS);
  const p = g.getImageData(0, 0, ACOLS, AROWS).data;
  const px = (x, y) => { x = clamp(x, 0, ACOLS - 1); y = clamp(y, 0, AROWS - 1); const i = (y * ACOLS + x) * 4; return [p[i] / 255, p[i + 1] / 255, p[i + 2] / 255]; };
  const luma = c3 => 0.2126 * c3[0] + 0.7152 * c3[1] + 0.0722 * c3[2];
  const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  for (let y = 0; y < AROWS; y++) for (let x = 0; x < ACOLS; x++) {
    const s = px(x, y), l = luma(s);
    const tone = ss(0.02, 0.82, Math.pow(l, 0.65));
    const ordered = ((x % 2) + 2 * (y % 2) - 1.5) / 3;
    let ch = RAMP[Math.floor(clamp(tone + ordered * 0.04, 0, 0.999) * 13)];
    const gx = luma(px(x + 1, y)) - luma(px(x - 1, y)), gy = luma(px(x, y + 1)) - luma(px(x, y - 1));
    if (Math.hypot(gx, gy) > 0.24 && tone > 0.12 && tone < 0.8) {
      ch = Math.abs(gx) > Math.abs(gy) * 1.8 ? '|' : Math.abs(gy) > Math.abs(gx) * 1.8 ? '-' : gx * gy > 0 ? '/' : '\\';
    }
    const peak = Math.max(s[0], s[1], s[2], 0.04), n = s.map(v => v / peak), ln = luma(n);
    const hue = n.map(v => clamp(lerp(ln, v, 1.35)));
    let ink = [1, 0.62, 0.3].map((v, k) => lerp(v, hue[k], 0.55));
    const hl = ss(0.7, 1, tone) * 0.45;
    ink = ink.map((v, k) => lerp(v, [1, 0.97, 0.9][k], hl) * (0.62 + 0.5 * tone) * 255);
    ASCII.push({ ch, color: `rgb(${ink[0] | 0},${ink[1] | 0},${ink[2] | 0})` });
  }
}

// Prints: one shot, nine one-of-a-kind developments.
const PRINT_W = 656, PRINT_H = 560, PHOTO = { x: 28, y: 28, w: 600, h: 400 };
const PRINTS = [];
function makePrints() {
  for (let k = 0; k < 9; k++) {
    const r = rng(1000 + k * 37), c = mk(PRINT_W, PRINT_H), g = c.getContext('2d');
    g.fillStyle = `hsl(${38 + r() * 8}, ${18 + r() * 10}%, ${91 + r() * 3}%)`; g.fillRect(0, 0, PRINT_W, PRINT_H);
    g.save(); g.beginPath(); g.rect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h); g.clip();
    const img = IMG.disposable, z = 1.02 + r() * 0.08;
    g.drawImage(img, PHOTO.x - (PHOTO.w * z - PHOTO.w) * r(), PHOTO.y - (PHOTO.h * z - PHOTO.h) * r(), PHOTO.w * z, PHOTO.h * z);
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = `hsla(${r() < 0.5 ? 25 + r() * 20 : 190 + r() * 30}, 70%, ${40 + r() * 25}%, ${0.25 + r() * 0.3})`; g.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    // light leak from a random edge
    g.globalCompositeOperation = 'screen';
    const lx = PHOTO.x + (r() < 0.5 ? 0 : PHOTO.w), ly = PHOTO.y + r() * PHOTO.h;
    const lg = g.createRadialGradient(lx, ly, 0, lx, ly, 260 + r() * 200);
    lg.addColorStop(0, `rgba(255,${80 + r() * 90},${20 + r() * 30},${0.35 + r() * 0.4})`); lg.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = lg; g.fillRect(PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    // grain
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.28 + r() * 0.2;
    g.drawImage(NOISE[k % NOISE.length], PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    // chunky dust
    const n = 40 + r() * 60;
    for (let i = 0; i < n; i++) {
      const light = r() < 0.7; g.fillStyle = light ? `rgba(255,250,240,${0.55 + r() * 0.4})` : `rgba(10,8,6,${0.5 + r() * 0.4})`;
      const x = PHOTO.x + r() * PHOTO.w, y = PHOTO.y + r() * PHOTO.h, rad = 0.8 + Math.pow(r(), 3) * 4;
      g.beginPath();
      for (let b = 0; b < (rad > 2.5 ? 3 : 1); b++) g.arc(x + (r() - 0.5) * rad * 1.6, y + (r() - 0.5) * rad * 1.6, rad * (0.6 + r() * 0.5), 0, 7);
      g.fill();
    }
    // hairs
    g.lineCap = 'round';
    for (let i = 0, m = 2 + r() * 4; i < m; i++) {
      g.strokeStyle = `rgba(255,250,240,${0.45 + r() * 0.4})`; g.lineWidth = 0.8 + r() * 1.2;
      const x = PHOTO.x + r() * PHOTO.w, y = PHOTO.y + r() * PHOTO.h, L = 14 + r() * 40;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * L * 2, y + (r() - 0.5) * L * 2, x + (r() - 0.5) * L, y + (r() - 0.5) * L); g.stroke();
    }
    // vertical scratches
    for (let i = 0, m = r() < 0.6 ? 1 + (r() * 2 | 0) : 0; i < m; i++) {
      const x = PHOTO.x + r() * PHOTO.w; g.strokeStyle = `rgba(255,255,255,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 1.5;
      g.beginPath(); g.moveTo(x, PHOTO.y); for (let y = PHOTO.y; y <= PHOTO.y + PHOTO.h; y += 40) g.lineTo(x + (r() - 0.5) * 3, y); g.stroke();
    }
    g.restore();
    // serial + stamp on the border
    g.fillStyle = 'rgba(40,36,32,0.75)'; g.font = '40px VCR'; g.textBaseline = 'middle';
    g.fillText('Nº' + String(Math.floor(r() * 9000 + 1000)), 36, PRINT_H - 64);
    g.fillStyle = ORANGE; g.textAlign = 'right'; g.font = '30px VCR';
    g.fillText('1/1', PRINT_W - 36, PRINT_H - 64);
    const specks = [];
    for (let i = 0, m = 3 + (r() * 4 | 0); i < m; i++) specks.push({ x: PHOTO.x + 40 + r() * (PHOTO.w - 80), y: PHOTO.y + 30 + r() * (PHOTO.h - 60), ph: r() * 6.28, s: 0.6 + r() * 0.8 });
    PRINTS.push({ canvas: c, specks, rot: (r() - 0.5) * 0.16, ox: (r() - 0.5) * 30, oy: (r() - 0.5) * 30, order: 0 });
  }
  const ord = [4, 0, 8, 2, 6, 1, 7, 3, 5];
  ord.forEach((p, i) => (PRINTS[p].order = i));
}

// ---------- scenes
function s1(t) { // u == t for the first scene
  glowBg(W / 2, H * 0.6, H * 0.75, [[0, 'rgba(255,140,0,0.34)'], [0.45, 'rgba(216,69,43,0.10)'], [1, 'rgba(0,0,0,0)']], E.outCubic(prog(t, 0.3, 1.1)));
  const sa = 1 - prog(t, 0.25, 0.7);
  if (sa > 0) drawNoise(t, sa * 0.85);

  const exit = E.inExpo(prog(t, 1.28, 1.5));
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(1 + exit * 0.35, 1 + exit * 0.35); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = 1 - exit * 0.6;

  const lab = E.outCubic(prog(t, 0.4, 0.8));
  ctx.globalAlpha *= lab;
  mono("WHAT'S NEW", W / 2, 690 + (1 - lab) * 30, 46, { track: 14, color: MUTED });
  ctx.globalAlpha = 1 - exit * 0.6;

  const size = fitSize(6, 900, 210);
  const letters = ['LAST', 'SUMMER'];
  let idx = 0;
  letters.forEach((word, li) => {
    const y = 870 + li * size * 1.02;
    const start = idx;
    mono(word, W / 2, y, size, {
      glow: 40, glowColor: 'rgba(255,140,0,0.55)',
      per: i => {
        const at = 0.42 + (start + i) * 0.045, age = t - at;
        if (age < 0) return { alpha: 0 };
        const p = E.outExpo(clamp(age / 0.2));
        return { dy: (1 - p) * -30, ch: age < 0.07 ? GLYPHS[Math.floor(hash(start + i + Math.floor(t * 30)) * GLYPHS.length)] : undefined, color: age < 0.07 ? ORANGE : CREAM };
      },
    });
    idx += word.length;
  });
  // cursor rides the last typed letter
  const typedN = clamp(Math.floor((t - 0.42) / 0.045) + 1, 0, 10);
  if (t > 0.4 && (typedN < 10 || Math.floor(t * 4) % 2 === 0)) {
    const line = typedN <= 4 ? 0 : 1, col = typedN <= 4 ? typedN : typedN - 4, word = letters[line];
    const adv = size * ADV, x0 = W / 2 - (adv * word.length) / 2;
    ctx.fillStyle = ORANGE; ctx.fillRect(x0 + col * adv + 6, 870 + line * size * 1.02 - size * 0.42, adv * 0.8, size * 0.84);
  }
  // version pill
  const pp = prog(t, 0.95, 1.3);
  if (pp > 0) {
    const s = E.outBack(pp, 2.6), y = 870 + 2 * size * 1.02 + 30;
    ctx.save(); ctx.translate(W / 2, y); ctx.scale(s, s); ctx.rotate((1 - s) * 0.3 - 0.04);
    ctx.fillStyle = ORANGE; rrect(-170, -58, 340, 116, 58); ctx.fill();
    mono('1.2.0', 0, 4, 76, { color: BG });
    ctx.restore();
  }
  ctx.restore();
}

// S2 1.5–4.5: video mode switch.
function iconCamera(x, y, s, c) {
  ctx.fillStyle = c; rrect(x - s, y - s * 0.6, s * 2, s * 1.3, s * 0.25); ctx.fill();
  ctx.fillRect(x - s * 0.35, y - s * 0.8, s * 0.7, s * 0.3);
  ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y + s * 0.05, s * 0.42, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
}
function iconVideo(x, y, s, c) {
  ctx.fillStyle = c; rrect(x - s, y - s * 0.55, s * 1.35, s * 1.1, s * 0.22); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + s * 0.45, y - s * 0.15); ctx.lineTo(x + s, y - s * 0.5); ctx.lineTo(x + s, y + s * 0.5); ctx.lineTo(x + s * 0.45, y + s * 0.15); ctx.fill();
}
const knobAt = u => spring(u - 0.32, 2.2, 7.5);
function s2(u, t) {
  const cx = W / 2, cy = 960, travel = 150;
  const k = knobAt(u), kv = (k - knobAt(u - 1 / 30)) * 30;
  const kx = cx + lerp(-travel, travel, k);
  const reveal = E.inOutExpo(prog(u, 0.78, 1.25));
  const R = lerp(98, Math.hypot(W, H) * 1.05, reveal);

  if (reveal < 1) {
    // switch
    const enter = E.outBack(prog(u, 0, 0.32), 2.2);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(enter, enter); ctx.translate(-cx, -cy);
    ctx.globalAlpha = clamp(enter);
    mono('PHOTO', cx - travel, cy - 230, 48, { track: 6, color: k < 0.5 ? ORANGE : MUTED });
    mono('VIDEO', cx + travel, cy - 230, 48, { track: 6, color: k >= 0.5 ? ORANGE : MUTED });
    ctx.fillStyle = mixColor('2D2D31', 'E5322B', clamp(k)); rrect(cx - 280, cy - 125, 560, 250, 125); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3; ctx.stroke();
    iconCamera(cx - travel, cy, 44, `rgba(243,238,230,${0.35 * clamp(k * 2)})`);
    iconVideo(cx + travel, cy, 44, `rgba(243,238,230,${0.35 * clamp(1 - k * 2)})`);
    ctx.restore();
  }
  // knob -> iris of the next shot
  ctx.save();
  ctx.beginPath(); ctx.arc(kx, cy, R, 0, 7); ctx.clip();
  if (reveal <= 0) {
    const sx = 1 + Math.min(0.35, Math.abs(kv) * 0.12);
    ctx.translate(kx, cy); ctx.scale(sx, 1 / sx);
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(0, 0, 98, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
    const a = clamp(k * 1.6 - 0.3);
    ctx.globalAlpha = 1 - a; iconCamera(0, 0, 40, BG);
    ctx.globalAlpha = a; ctx.fillStyle = '#E5322B'; ctx.beginPath(); ctx.arc(0, 0, 34 + 6 * Math.sin(u * 14), 0, 7); ctx.fill();
  } else {
    videoShot(u);
  }
  ctx.restore();
  if (reveal > 0 && reveal < 1) {
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 10 * (1 - reveal); ctx.beginPath(); ctx.arc(kx, cy, R, 0, 7); ctx.stroke();
  }
}
function videoShot(u) {
  const stampT = 1.62, hit = decay(u, stampT, 0.09) * Math.sin((u - stampT) * 70) * 26;
  const sx = noise1(u * 1.6, 1) * 16 + hit, sy = noise1(u * 1.3, 2) * 12 + hit * 0.5, rot = noise1(u * 1.1, 3) * 0.008;
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2 + sx, H / 2 + sy); ctx.rotate(rot); ctx.translate(-W / 2, -H / 2);
  cover(IMG.hero, -40, -40, W + 80, H + 80, 1.16 - 0.1 * E.outCubic(prog(u, 0.8, 3)));
  ctx.restore();
  // rolling tracking band
  const by = ((u * 0.42) % 1) * (H + 300) - 150;
  ctx.save(); ctx.beginPath(); ctx.rect(0, by, W, 70); ctx.clip(); drawNoise(u + 3, 0.22, 'screen'); ctx.restore();
  // legibility
  const lg = ctx.createLinearGradient(0, 1150, 0, H); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.85)');
  ctx.fillStyle = lg; ctx.fillRect(0, 1150, W, H - 1150);
  // viewfinder brackets
  const b = E.outExpo(prog(u, 1.05, 1.5)), inset = lerp(-40, 70, b), L = 90;
  ctx.strokeStyle = `rgba(243,238,230,${0.9 * b})`; ctx.lineWidth = 6; ctx.lineCap = 'square';
  [[inset, 230, 1, 1], [W - inset, 230, -1, 1], [inset, H - 160, 1, -1], [W - inset, H - 160, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y); ctx.lineTo(x + dx * L, y); ctx.stroke();
  });
  ctx.globalAlpha = b * 0.7; ctx.fillStyle = CREAM;
  ctx.fillRect(W / 2 - 22, 890, 44, 4); ctx.fillRect(W / 2 - 2, 870, 4, 44); ctx.globalAlpha = 1;
  // PLAY stamp: slams center, then settles into its corner
  if (u > stampT) {
    const slam = E.outBack(prog(u, stampT, stampT + 0.22), 1.4);
    const settle = E.inOutCubic(prog(u, 2.15, 2.5));
    const s = lerp(2.3, 1, slam) * lerp(1, 0.42, settle);
    const x = lerp(W / 2, 250, settle), y = lerp(620, 330, settle);
    ctx.save(); ctx.translate(x, y); ctx.rotate(lerp(-0.09, -0.035, slam) * (1 - settle)); ctx.scale(s, s);
    ctx.globalAlpha = clamp(prog(u, stampT, stampT + 0.06));
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
    mono('PLAY', -40, 0, 150, { color: CREAM });
    ctx.fillStyle = CREAM; tri(210, -4, 110);
    ctx.restore();
  }
  rise('VIDEO MODE', W / 2, 1400, fitSize(10, 960, 150), u, 1.2, { glow: 30, glowColor: 'rgba(0,0,0,0.6)' });
  typed('any film. with sound.', 110, 1540, 50, u, 1.6, 0.028, { color: CREAM });
  // audio meter
  const env = E.outCubic(prog(u, 1.75, 2.1));
  for (let i = 0; i < 34; i++) {
    const x = 110 + i * 25.5;
    const a = Math.abs(Math.sin(u * 13 + i * 0.7) * 0.5 + Math.sin(u * 23 + i * 1.9) * 0.35 + noise1(u * 8 + i * 0.4, 9) * 0.4);
    const h = 8 + a * 90 * env;
    ctx.fillStyle = i / 34 < a * env ? ORANGE : 'rgba(243,238,230,0.35)';
    ctx.fillRect(x, 1670 - h / 2, 14, h);
  }
}

// S3 4.5–7.5: two new films. Rewind turns into ASCII on the same card.
const CARD = { x: 40, y: 540, w: 1000, h: 668 };
function s3(u, t) {
  const toAscii = E.inOutCubic(prog(u, 1.3, 1.9));
  // background: blue tape night -> terminal black
  ctx.fillStyle = mixColor('0B1233', '08080A', toAscii); ctx.fillRect(0, 0, W, H);
  glowBg(W / 2, 880, 900, [[0, toAscii < 0.5 ? 'rgba(60,110,255,0.25)' : 'rgba(255,140,0,0.12)'], [1, 'rgba(0,0,0,0)']]);

  // echo title behind: REWIND trails leftwards
  if (u < 1.7) {
    const a = 1 - prog(u, 1.3, 1.7);
    for (let e = 5; e >= 0; e--) {
      ctx.globalAlpha = a * (e === 0 ? 0.1 : 0.05);
      ctx.strokeStyle = '#8FB0FF'; ctx.lineWidth = 2; font(300); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const x = 1100 - ((u * 900 + e * 140) % 2400);
      ctx.strokeText('REWIND', x, 400 + e * 0);
      ctx.strokeText('REWIND', x - 400, 1420);
    }
    ctx.globalAlpha = 1;
  }

  // header
  const hy = 330;
  const two = E.outBack(prog(u, 0, 0.3), 2.2);
  ctx.save(); ctx.translate(170, hy); ctx.scale(two, two);
  mono('2', 0, 10, 300, { color: ORANGE, glow: 50, glowColor: 'rgba(255,140,0,0.5)' });
  ctx.restore();
  rise('NEW', 300, hy - 55, 96, u, 0.08, { align: 'left' });
  rise('FILMS', 300, hy + 55, 96, u, 0.14, { align: 'left' });

  // card enters from right with ghosting
  const ein = E.outExpo(prog(u, 0.05, 0.5));
  const cx = CARD.x + (1 - ein) * 1150, zoom = 1 + 0.06 * E.outCubic(prog(u, 1.9, 3));
  ctx.save();
  ctx.translate(W / 2, CARD.y + CARD.h / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -(CARD.y + CARD.h / 2));
  const ghosts = ein < 0.98 ? 4 : 0;
  for (let gI = ghosts; gI >= 0; gI--) {
    ctx.save();
    ctx.globalAlpha = gI === 0 ? 1 : 0.12;
    drawCard(cx + gI * 60 * (1 - ein), u, t, toAscii);
    ctx.restore();
  }
  ctx.restore();

  // film name: REWIND scrambles into ASCII
  const nameY = 1340;
  const nameP = prog(u, 1.35, 1.75);
  const name = u < 1.35 ? 'REWIND' : scramble('ASCII ', nameP, 11, t).trimEnd() || 'ASCII';
  if (u < 1.35) rise('REWIND', 90, nameY, 150, u, 0.3, { align: 'left', color: '#CFE0FF', glow: 40, glowColor: 'rgba(80,130,255,0.8)' });
  else mono(name, 90, nameY, 150, { align: 'left', color: nameP >= 1 ? ORANGE_SOFT : ORANGE, glow: 40, glowColor: 'rgba(255,140,0,0.6)' });
  if (u < 1.35) typed('a worn VHS tape. blue cast.', 94, 1460, 44, u, 0.5, 0.022, { color: '#AFC4FF', cursorColor: '#6F95FF' });
  else typed('> rebuilt in terminal type', 94, 1460, 44, u, 1.7, 0.022, { color: ORANGE_SOFT });

  // canister: flip from Rewind to ASCII
  const land = E.outBack(prog(u, 0.2, 0.62), 1.6);
  const flip = prog(u, 1.35, 1.65);
  const fx = Math.cos(flip * Math.PI);
  const rollImg = fx >= 0 ? IMG['roll-rewind'] : IMG['roll-ascii'];
  ctx.save();
  ctx.translate(lerp(1300, 880, land), lerp(1100, 1690, land) + Math.sin(u * 3) * 8);
  ctx.rotate(lerp(1.2, 0.14, land) + Math.sin(u * 2.2) * 0.03);
  ctx.scale(Math.abs(fx) * 1.6 || 0.001, 1.6);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
  ctx.drawImage(rollImg, -70, -103);
  ctx.restore();

  // roll counter 13 -> 14 -> 15
  const n = u < 0.55 ? 13 : u < 1.62 ? 14 : 15;
  const bumpS = 1 + 0.25 * (decay(u, 0.55, 0.08) + decay(u, 1.62, 0.08));
  mono('ROLLS', 94, 1620, 40, { align: 'left', color: MUTED, track: 8 });
  ctx.save(); ctx.translate(160, 1705); ctx.scale(bumpS, bumpS);
  mono(String(n), 0, 0, 110, { color: n === 15 ? ORANGE : CREAM });
  ctx.restore();
}
function drawCard(x, u, t, toAscii) {
  const { y, w, h } = CARD;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
  ctx.fillStyle = '#000'; ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // Rewind footage scrubbing backwards
  const pan = (1 - E.outCubic(prog(u, 0, 1.4))) * -120;
  const drawRewind = () => {
    ctx.drawImage(REWIND, x - 60 + pan, y - 40, w + 120, h + 80);
    // tracking tears
    for (let b = 0; b < 3; b++) {
      const by = y + ((-(u * (0.9 + b * 0.37)) % 1 + 1) % 1) * h, bh = 18 + b * 14, off = (hash(b + Math.floor(u * 24)) - 0.5) * 70;
      ctx.save(); ctx.beginPath(); ctx.rect(x, by, w, bh); ctx.clip();
      ctx.drawImage(REWIND, x - 60 + pan + off, y - 40, w + 120, h + 80);
      ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'screen'; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(NOISE[(Math.floor(u * 30) + b) % NOISE.length], x, by, w, bh);
      ctx.restore();
    }
    // REW OSD inside the tape
    if (Math.floor(u * 4) % 2 === 0) {
      ctx.fillStyle = '#E8EEFF'; tri(x + 70, y + 70, 36, -1); tri(x + 100, y + 70, 36, -1);
      mono('REW', x + 140, y + 72, 40, { align: 'left', color: '#E8EEFF' });
    }
  };
  const sweepY = y + E.inOutCubic(prog(u, 1.3, 1.85)) * h;
  if (sweepY < y + h) { ctx.save(); ctx.beginPath(); ctx.rect(x, sweepY, w, y + h - sweepY); ctx.clip(); drawRewind(); ctx.restore(); }
  if (sweepY > y) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, sweepY - y); ctx.clip();
    ctx.fillStyle = '#040405'; ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 0.16; ctx.drawImage(IMG.camcorder, x, y, w, h); ctx.globalAlpha = 1;
    const cw = w / ACOLS, ch = h / AROWS;
    font(Math.round(ch * 0.92)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < AROWS; r++) {
      const rowY = y + (r + 0.5) * ch;
      if (rowY > sweepY) break;
      const reached = 1.3 + ((r + 0.5) / AROWS) * 0.55;
      for (let c = 0; c < ACOLS; c++) {
        const cell = ASCII[r * ACOLS + c];
        const settle = reached + 0.1 + hash(r * 97 + c) * 0.35;
        if (u < settle) {
          ctx.fillStyle = ORANGE_SOFT;
          ctx.fillText(RAMP[1 + Math.floor(hash(r * 131 + c * 7 + Math.floor(t * 24)) * 12)], x + (c + 0.5) * cw, rowY);
        } else if (cell.ch !== ' ') {
          ctx.fillStyle = cell.color;
          ctx.fillText(cell.ch, x + (c + 0.5) * cw, rowY);
        }
      }
    }
    ctx.restore();
    if (sweepY < y + h) {
      ctx.fillStyle = ORANGE; ctx.shadowColor = ORANGE; ctx.shadowBlur = 30; ctx.fillRect(x, sweepY - 3, w, 6); ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
  ctx.strokeStyle = toAscii > 0.5 ? 'rgba(255,140,0,0.5)' : 'rgba(143,176,255,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
}

// S4 7.5–10.5: nine developments of one shot, then look closer.
function s4(u, t) {
  glowBg(W / 2, 1000, 1100, [[0, 'rgba(255,140,0,0.12)'], [1, 'rgba(0,0,0,0)']]);
  const SC = 0.5, pw = PRINT_W * SC, ph = PRINT_H * SC;
  const pos = i => ({ x: 190 + (i % 3) * 350, y: 735 + Math.floor(i / 3) * 300 });
  const zp = E.inOutExpo(prog(u, 1.45, 2.3));
  const focus = pos(4);
  const Z = lerp(1, 960 / pw, zp);
  const fx = lerp(W / 2, focus.x + PRINTS[4].ox, zp), fy = lerp(1035, focus.y + PRINTS[4].oy, zp);
  ctx.save();
  ctx.translate(W / 2, lerp(1035, 1010, zp)); ctx.scale(Z, Z); ctx.translate(-fx, -fy);
  const order = PRINTS.map((p, i) => i).sort((a, b) => (a === 4) - (b === 4) || PRINTS[a].order - PRINTS[b].order);
  for (const i of order) {
    const P = PRINTS[i], p0 = pos(i), st = 0.12 + P.order * 0.07;
    const d = prog(u, st, st + 0.4);
    if (d <= 0) continue;
    const e = E.outExpo(d), s = lerp(1.7, 1, e);
    const away = i === 4 ? 0 : E.inCubic(zp) * 1.4;
    if (i !== 4 && zp > 0.97) continue;
    ctx.save();
    ctx.translate(p0.x + P.ox + (p0.x - focus.x) * away, p0.y + P.oy + (p0.y - focus.y) * away);
    ctx.rotate(i === 4 ? lerp(P.rot, 0, zp) : P.rot + (1 - e) * 0.5 * (i % 2 ? 1 : -1));
    ctx.scale(s, s);
    ctx.globalAlpha = clamp(d * 3) * (i === 4 ? 1 : 1 - zp);
    ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 30 / Z; ctx.shadowOffsetY = 14 / Z;
    ctx.drawImage(P.canvas, -pw / 2, -ph / 2, pw, ph);
    ctx.shadowColor = 'transparent';
    // gold specks twinkle
    for (const sp of P.specks) {
      const tw = 0.5 + 0.5 * Math.sin(u * 7 + sp.ph);
      const gx = -pw / 2 + sp.x * SC, gy = -ph / 2 + sp.y * SC;
      ctx.fillStyle = GOLD; ctx.shadowColor = 'rgba(255,200,90,0.9)'; ctx.shadowBlur = 12 / Z;
      star(gx, gy, (2.4 + tw * 5 * zp) * sp.s, u * 1.5 + sp.ph);
      if (zp > 0.5) { ctx.globalAlpha = tw * zp * 0.8; ctx.fillRect(gx - 14 * sp.s, gy - 0.35, 28 * sp.s, 0.7); ctx.fillRect(gx - 0.35, gy - 14 * sp.s, 0.7, 28 * sp.s); ctx.globalAlpha = 1; }
      ctx.shadowColor = 'transparent';
    }
    ctx.restore();
  }
  ctx.restore();
  // headline
  rise('EVERY SHOT IS', W / 2, 300, 58, u, 0.05, { track: 6, color: MUTED });
  rise('ONE OF A KIND', W / 2, 400, fitSize(13, 980, 120), u, 0.15, { color: ORANGE, glow: 40, glowColor: 'rgba(255,140,0,0.45)' });
  // footer caption swaps at the zoom
  const capA = 1 - prog(u, 1.5, 1.7), capB = prog(u, 2.0, 2.25);
  if (capA > 0) { ctx.globalAlpha = capA * E.outCubic(prog(u, 0.6, 0.9)); mono('SAME SHOT. NEW DUST.', W / 2, 1660, 50, { track: 4, color: CREAM }); ctx.globalAlpha = 1; }
  if (capB > 0) {
    ctx.globalAlpha = capB;
    mono('LOOK CLOSER', W / 2, 1640, 58, { track: 10, color: GOLD, glow: 30, glowColor: 'rgba(255,200,90,0.6)' });
    ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 20;
    star(W / 2 - 250, 1640, 16 + 6 * Math.sin(u * 9), u * 2); star(W / 2 + 250, 1640, 16 + 6 * Math.cos(u * 9), -u * 2);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
}

// S5 10.5–12.5: whirring film carousel, then a shutter click closes the iris.
function carouselAngle(u) { return Math.PI * 2 * 1.35 * E.outCubic(prog(u, 0, 1.45)); }
function s5(u, t) {
  glowBg(W / 2, 1000, 900, [[0, 'rgba(255,140,0,0.2)'], [1, 'rgba(0,0,0,0)']]);
  const cx = W / 2, cy = 1000, rx = 420;
  const grow = E.outBack(prog(u, 0, 0.35), 1.4);
  const speed = Math.abs(carouselAngle(u) - carouselAngle(u - 1 / 30));
  const items = [];
  const hitK = decay(u, 1.45, 0.07);
  for (let i = 0; i < ROLLS.length; i++) {
    for (let gI = 0; gI < (speed > 0.08 ? 3 : 1); gI++) {
      const a = carouselAngle(u - gI * 0.012) + (i / ROLLS.length) * Math.PI * 2;
      const z = Math.cos(a);
      items.push({ i, gI, z, x: cx + Math.sin(a) * rx * grow, y: cy + z * 90 * grow, s: (0.75 + 0.55 * (z + 1) / 2) * 1.35 * grow });
    }
  }
  items.sort((a, b) => a.z - b.z || b.gI - a.gI);
  for (const it of items) {
    ctx.save(); ctx.translate(it.x, it.y); ctx.scale(it.s, it.s);
    ctx.globalAlpha = it.gI ? 0.18 : 1;
    ctx.drawImage(IMG['roll-' + ROLLS[it.i]], -70, -103);
    const dark = (1 - (it.z + 1) / 2) * 0.7;
    ctx.restore();
    if (!it.gI && dark > 0.02) { // dim far rolls
      ctx.save(); ctx.translate(it.x, it.y); ctx.scale(it.s, it.s);
      ctx.globalAlpha = dark; ctx.filter = 'brightness(0)'; ctx.drawImage(IMG['roll-' + ROLLS[it.i]], -70, -103); ctx.restore();
    }
  }
  rise('CAMERA', W / 2, 320, 150, u, 0.05);
  rise('SOUNDS', W / 2, 470, 150, u, 0.12, { color: ORANGE, glow: 40, glowColor: 'rgba(255,140,0,0.5)' });
  // whirr wobbles along a sine, then CLICK slams
  const wA = E.outCubic(prog(u, 0.2, 0.45)) * (1 - prog(u, 1.3, 1.45));
  if (wA > 0) {
    ctx.globalAlpha = wA;
    mono('whirrrr', W / 2, 1380, 100, { color: ORANGE_SOFT, per: i => ({ dy: Math.sin(u * 18 - i * 0.9) * 18, rot: Math.sin(u * 14 - i) * 0.12 }) });
    ctx.globalAlpha = 1;
  }
  if (u > 1.45) {
    const s = lerp(2.2, 1, E.outBack(prog(u, 1.45, 1.62), 2));
    ctx.save(); ctx.translate(W / 2 + hitK * 20 * Math.sin(u * 90), 1380); ctx.scale(s, s); ctx.rotate(-0.05);
    mono('CLICK.', 0, 0, 150, { color: CREAM, glow: 30, glowColor: 'rgba(255,255,255,0.4)' });
    ctx.restore();
  }
  // scope
  ctx.strokeStyle = ORANGE; ctx.lineWidth = 4; ctx.shadowColor = ORANGE; ctx.shadowBlur = 16;
  ctx.beginPath();
  for (let x = 60; x <= W - 60; x += 6) {
    const n = x / W;
    const whirr = Math.sin(n * 90 + u * 60) * 22 * Math.min(1, speed * 6) + Math.sin(n * 37 - u * 40) * 10 * Math.min(1, speed * 6);
    const click = hitK * Math.sin(n * 140) * 110 * Math.exp(-Math.pow((n - 0.5) * 3.5, 2));
    ctx.lineTo(x, 1580 + whirr + click);
  }
  ctx.stroke(); ctx.shadowBlur = 0;
  iris(1 - E.inExpo(prog(u, 1.62, 1.84)), u);
}
// open: 1 = fully open, 0 = closed
function s6(u, t) {
  const sunIn = E.outExpo(prog(u, 0.05, 0.9));
  const hz = 1010;
  glowBg(W / 2, hz, 1000, [[0, 'rgba(255,140,0,0.35)'], [0.5, 'rgba(216,69,43,0.1)'], [1, 'rgba(0,0,0,0)']], sunIn);
  // striped sun on its own layer so the stripes only cut the sun
  const R = 330, sy = hz + (1 - sunIn) * 360;
  const sc = SUN.getContext('2d');
  sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, SUN.width, SUN.height);
  const ox = W / 2 - R - 120, oy = sy - R - 120; // layer origin in screen space
  sc.translate(-ox, -oy);
  const sg = sc.createLinearGradient(0, sy - R, 0, sy);
  sg.addColorStop(0, '#FFD08A'); sg.addColorStop(0.5, ORANGE); sg.addColorStop(1, RED);
  sc.fillStyle = sg; sc.shadowColor = 'rgba(255,140,0,0.6)'; sc.shadowBlur = 80;
  sc.beginPath(); sc.arc(W / 2, sy, R, Math.PI, 0); sc.fill(); sc.shadowBlur = 0;
  sc.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 7; k++) {
    const f = (k + (u * 0.9) % 1) / 7, y = sy - R * 0.55 + f * R * 0.55;
    sc.fillRect(W / 2 - R - 2, y, R * 2 + 4, 3 + f * 20);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, hz); ctx.clip();
  ctx.drawImage(SUN, ox, oy);
  ctx.restore();
  // horizon + reflection
  ctx.fillStyle = `rgba(255,140,0,${0.8 * sunIn})`; ctx.fillRect(60, hz, W - 120, 3);
  for (let k = 0; k < 6; k++) {
    const w = (260 - k * 36) * sunIn, y = hz + 22 + k * 20;
    ctx.fillStyle = `rgba(255,${120 - k * 10},0,${0.35 - k * 0.05})`;
    ctx.fillRect(W / 2 - w / 2 + Math.sin(u * 5 + k) * 8, y, w, 4);
  }
  // all 15 rolls on the horizon
  const rs = 0.44, rw = 140 * rs, gap = (W - 110 - ROLLS.length * rw) / (ROLLS.length - 1);
  ROLLS.forEach((id, i) => {
    const d = prog(u, 0.35 + i * 0.028, 0.35 + i * 0.028 + 0.35);
    if (d <= 0) return;
    const e = E.outBack(d, 2.4);
    const x = 55 + i * (rw + gap) + rw / 2;
    const isNew = id === 'rewind' || id === 'ascii';
    ctx.save(); ctx.translate(x, hz - (206 * rs) / 2 - 4 + (1 - e) * 80); ctx.scale(rs * e, rs * e);
    ctx.globalAlpha = clamp(d * 4);
    ctx.drawImage(IMG['roll-' + id], -70, -103);
    ctx.restore();
    if (isNew && u > 0.9) {
      ctx.globalAlpha = E.outCubic(prog(u, 0.9, 1.1));
      ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(x, hz - 206 * rs - 22, 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
  });
  // logo
  const ls = fitSize(11, 960, 140);
  const lp = prog(u, 0.25, 0.75);
  if (lp > 0) mono(scramble('LAST SUMMER', lp, 21, t), W / 2, 1230, ls, { color: CREAM, glow: 40, glowColor: 'rgba(255,140,0,0.5)' });
  const pp = prog(u, 0.6, 0.9);
  if (pp > 0) {
    const s = E.outBack(pp, 2.4);
    ctx.save(); ctx.translate(W / 2, 1355); ctx.scale(s, s);
    ctx.fillStyle = ORANGE; rrect(-230, -44, 460, 88, 44); ctx.fill();
    mono('1.2.0  OUT NOW', 0, 3, 42, { color: BG });
    ctx.restore();
  }
  ['VIDEO MODE', 'REWIND + ASCII', 'ONE-OF-A-KIND GRAIN', 'CAMERA SOUNDS'].forEach((s, i) => {
    const d = E.outExpo(prog(u, 0.85 + i * 0.09, 1.3 + i * 0.09));
    if (d <= 0) return;
    const y = 1490 + i * 64;
    ctx.globalAlpha = d;
    ctx.fillStyle = ORANGE; ctx.fillRect(250 - 40 + (1 - d) * -60, y - 9, 18, 18);
    ctx.save(); ctx.beginPath(); ctx.rect(250, y - 30, 800, 60); ctx.clip();
    mono(s, 250 + (1 - d) * -300, y, 44, { align: 'left', color: CREAM });
    ctx.restore();
    ctx.globalAlpha = 1;
  });
  // orange date stamp
  if (u > 1.35 && (u < 1.5 || u > 1.6)) mono('27/09/2026', W - 70, H - 110, 52, { align: 'right', color: ORANGE, glow: 18, glowColor: 'rgba(255,140,0,0.9)' });
  iris(E.outCubic(prog(u, 0.02, 0.45)), u);
}

// ---------- HUD: tape-deck OSD across every scene
function tapeSeconds(t) {
  const seg = [[0, 4.5, 1], [4.5, 5.85, -9], [5.85, 10.5, 1], [10.5, 12.3, 6], [12.3, 15, 1]];
  let s = 23 * 60 + 14;
  for (const [a, b, v] of seg) s += (clamp(t, a, b) - a) * v;
  return s;
}
function hud(t) {
  if (t < 0.45 || t > 14.55) return;
  ctx.save();
  ctx.globalAlpha = E.outCubic(prog(t, 0.45, 0.7));
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
  let mode = 'PLAY';
  if (t >= 1.5 && t < 4.5) mode = 'REC';
  else if (t >= 4.5 && t < 5.85) mode = 'REW';
  else if (t >= 10.5 && t < 12.3) mode = 'FF';
  ctx.fillStyle = CREAM;
  const y = 120;
  if (mode === 'REC') {
    if (Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = '#FF3B30'; ctx.beginPath(); ctx.arc(88, y, 16, 0, 7); ctx.fill(); }
    mono('REC', 122, y + 2, 46, { align: 'left' });
  } else if (mode === 'REW') {
    tri(90, y, 34, -1); tri(118, y, 34, -1); mono('REW', 150, y + 2, 46, { align: 'left' });
  } else if (mode === 'FF') {
    tri(84, y, 34, 1); tri(112, y, 34, 1); mono('FF', 150, y + 2, 46, { align: 'left' });
  } else {
    mono('PLAY', 70, y + 2, 46, { align: 'left' }); tri(208, y, 34, 1);
  }
  const ch = t < 1.5 ? '' : t < 4.5 ? 'CH 01' : t < 7.5 ? 'CH 02' : t < 10.5 ? 'CH 03' : t < 12.5 ? 'CH 04' : '';
  if (ch) mono(ch, W - 70, y + 2, 46, { align: 'right' });
  const s = tapeSeconds(t), fr = Math.floor((s % 1) * 30);
  const hms = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s) % 60).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
  mono('SP', 70, H - 110, 40, { align: 'left', color: MUTED });
  mono(hms, 140, H - 110, 40, { align: 'left' });
  ctx.restore();
}


// ---------- composition
const COMP = {
  duration: 15, fps: 30,
  theme: { bg: BG, text: CREAM, accent: ORANGE, font: 'VCR' },
  fonts: [['VCR', 'vcr.woff2']],
  images: {
    hero: 'img/hero.webp', camcorder: 'img/look-camcorder.webp', disposable: 'img/look-disposable.webp',
    ...Object.fromEntries(ROLLS.map(id => ['roll-' + id, `img/rolls/${id}.png`])),
  },
  prepare() { makeRewind(); makeAscii(); makePrints(); },
  scenes: [[0, s1], [1.5, s2], [4.5, s3], [7.5, s4], [10.5, s5], [12.5, s6]],
  overlay: hud,
  crt: { on: true, off: 14.5 },
  // [time, amount, width] tape tears on every cut and hit
  glitch: [[1.5, 1], [4.5, 0.9], [5.85, 0.45], [7.5, 0.6], [10.5, 0.8], [3.12, 0.3], [12.36, 0.4]],
  glitchExtra: t => (t > 4.5 && t < 5.85 ? 0.1 + 0.35 * (hash(Math.floor(t * 12)) > 0.8) : 0),
  // [time, amount, decay] white flashes: shutter, stamp, iris open
  flash: [[7.5, 0.95, 0.1], [3.12, 0.35, 0.05], [12.52, 0.3, 0.12]],
  wobble: 0.0007, // tape wave: part of this piece's VHS look (engine default is 0)
};
