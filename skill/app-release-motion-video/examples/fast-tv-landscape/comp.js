// Fast TV — 45 s USP film, landscape 1920×1080 (window.FORMAT in index.html), 120 BPM (beat 0.5 s, bar 2 s).
// Cuts sit on the fal.ai bed's bar lines; the end card starts on its final chord at 40.0 s (beat_grid.py).
// Framing device: one red signal. It finds the TV, carries the movie, stays inside the house,
// and runs along the bottom of the frame as the story's progress line.
const BG = '#09090b', INK = '#f5f5f7', MUTED = '#aaaab2', DIM = '#55555c', RED = '#ff453a', SURF = '#141416', LINE = 'rgba(255,255,255,0.1)';
const CUT = [0, 6, 10, 18, 24, 30, 36, 40];
const DUR = 45;
const UI = 'system-ui, -apple-system, "Helvetica Neue", sans-serif';

// ---------- proportional type (brand font is the system sans, so glyphs are measured)
function setFont(size, weight = 700) { ctx.font = `${weight} ${size}px ${UI}`; }
function text(s, x, y, size, { weight = 700, align = 'center', color = INK, track = 0, glow = 0, glowColor = 'rgba(255,69,58,0.45)' } = {}) {
  setFont(size, weight);
  ctx.save();
  ctx.letterSpacing = track + 'px';
  const w = ctx.measureText(s).width - (s.length ? track : 0);
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  if (glow) { ctx.shadowColor = glowColor; ctx.shadowBlur = glow; }
  ctx.fillText(s, x0, y);
  ctx.restore();
  return { x0, total: w };
}
function measure(s, size, weight = 700, track = 0) { setFont(size, weight); ctx.save(); ctx.letterSpacing = track + 'px'; const w = ctx.measureText(s).width; ctx.restore(); return w; }
function fade(s, x, y, size, u, t0, { dur = 0.6, weight = 500, color = MUTED, align = 'center', dy = 14, track = 0 } = {}) {
  const p = E.outCubic(prog(u, t0, t0 + dur)); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p; text(s, x, y + (1 - p) * dy, size, { weight, color, align, track }); ctx.restore();
}
function kicker(s, x, y, u, t0, align = 'left') {
  const p = E.outExpo(prog(u, t0, t0 + 0.7)); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= p;
  const w = measure(s, 22, 650, 3.5);
  const x0 = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = RED; ctx.fillRect(x0, y - 1.5, 0, 3);
  ctx.beginPath(); ctx.arc(x0 + 5, y, 5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.rect(x0 + 20, y - 20, (w + 10) * p, 40); ctx.clip();
  text(s, x0 + 22, y + 1, 22, { weight: 650, color: RED, align: 'left', track: 3.5 });
  ctx.restore();
}

// ---------- props
function logo(x, y, s, alpha = 1, glow = 0.3) {
  const img = IMG.logo; if (!img || alpha <= 0 || s <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.shadowColor = 'rgba(255,69,58,0.55)'; ctx.shadowBlur = s * glow;
  ctx.drawImage(img, x - s / 2, y - s / 2, s, s); ctx.restore();
}
function scrim(x, y, w, h, a0, a1, horiz = false) {
  const g = horiz ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `rgba(9,9,11,${a0})`); g.addColorStop(1, `rgba(9,9,11,${a1})`);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function tv(x, y, w, h, draw, { stand = true, bezel = 14 } = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  ctx.fillStyle = '#18181b'; rrect(x - bezel, y - bezel, w + bezel * 2, h + bezel * 2, bezel * 1.2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 2; rrect(x - bezel, y - bezel, w + bezel * 2, h + bezel * 2, bezel * 1.2); ctx.stroke();
  if (stand) { ctx.fillStyle = '#18181b'; ctx.fillRect(x + w / 2 - w * 0.05, y + h + bezel, w * 0.1, h * 0.06); ctx.fillRect(x + w / 2 - w * 0.19, y + h + bezel + h * 0.055, w * 0.38, Math.max(6, h * 0.018)); }
  ctx.save(); rrect(x, y, w, h, 6); ctx.clip(); ctx.fillStyle = '#040405'; ctx.fillRect(x, y, w, h); draw(x, y, w, h); ctx.restore();
  const g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
}
// MacBook in line art; draw ∈ 0..1 strokes it on, fill ∈ 0..1 solidifies it.
function laptop(cx, cy, sw, { draw = 1, fill = 1, screen = null } = {}) {
  const sh = sw * 0.64, x = cx - sw / 2, y = cy - sh / 2, bw = sw * 1.2;
  ctx.save();
  if (fill > 0) {
    ctx.save(); ctx.globalAlpha *= fill;
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    ctx.fillStyle = '#1d1d21'; rrect(x - sw * 0.03, y - sw * 0.03, sw * 1.06, sh + sw * 0.06, sw * 0.035); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#26262b'; ctx.beginPath(); ctx.moveTo(cx - bw / 2, cy + sh / 2 + sw * 0.03); ctx.lineTo(cx + bw / 2, cy + sh / 2 + sw * 0.03);
    ctx.lineTo(cx + bw / 2 - sw * 0.02, cy + sh / 2 + sw * 0.075); ctx.lineTo(cx - bw / 2 + sw * 0.02, cy + sh / 2 + sw * 0.075); ctx.closePath(); ctx.fill();
    ctx.save(); rrect(x, y, sw, sh, sw * 0.012); ctx.clip(); ctx.fillStyle = '#060607'; ctx.fillRect(x, y, sw, sh); if (screen) screen(x, y, sw, sh); ctx.restore();
    ctx.restore();
  }
  if (draw > 0 && fill < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - fill;
    const L = (sw + sh) * 2.3 + bw * 2;
    ctx.setLineDash([L * draw, L]); ctx.strokeStyle = 'rgba(245,245,247,0.55)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.roundRect(x - sw * 0.03, y - sw * 0.03, sw * 1.06, sh + sw * 0.06, sw * 0.035);
    ctx.moveTo(cx - bw / 2, cy + sh / 2 + sw * 0.03); ctx.lineTo(cx + bw / 2, cy + sh / 2 + sw * 0.03); ctx.lineTo(cx + bw / 2 - sw * 0.02, cy + sh / 2 + sw * 0.075); ctx.lineTo(cx - bw / 2 + sw * 0.02, cy + sh / 2 + sw * 0.075); ctx.closePath();
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  return { x, y, w: sw, h: sh };
}
function tvLine(x, y, w, h, draw) {
  const L = (w + h) * 2 + w;
  ctx.save(); ctx.setLineDash([L * draw, L]); ctx.strokeStyle = 'rgba(245,245,247,0.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - 14, y - 14, w + 28, h + 28, 16);
  ctx.moveTo(x + w / 2, y + h + 14); ctx.lineTo(x + w / 2, y + h + 14 + h * 0.06); ctx.moveTo(x + w / 2 - w * 0.19, y + h + 14 + h * 0.06); ctx.lineTo(x + w / 2 + w * 0.19, y + h + 14 + h * 0.06);
  ctx.stroke(); ctx.restore();
}
function cursor(x, y, press = 0) {
  ctx.save(); ctx.translate(x, y); const s = 1 - press * 0.15; ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.fillStyle = INK; ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 40); ctx.lineTo(22, 37); ctx.lineTo(15, 24); ctx.lineTo(26, 23); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function fileCard(x, y, name, { rot = 0, sx = 1, sy = 1, alpha = 1, tag = 'MKV' } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy); ctx.globalAlpha *= alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#26262a'; rrect(-170, -40, 340, 80, 16); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; rrect(-170, -40, 340, 80, 16); ctx.stroke();
  ctx.save(); rrect(-154, -26, 72, 52, 8); ctx.clip(); cover(IMG.coast, -154, -26, 72, 52, 1.2); ctx.restore();
  text(name, -66, -8, 22, { weight: 600, align: 'left' });
  text(tag + ' · 1.4 GB', -66, 16, 16, { weight: 500, align: 'left', color: MUTED });
  ctx.restore();
}
function cloud(cx, cy, s) {
  ctx.beginPath(); ctx.arc(cx - s * 0.5, cy + s * 0.1, s * 0.42, 0, 7); ctx.arc(cx - s * 0.05, cy - s * 0.25, s * 0.55, 0, 7); ctx.arc(cx + s * 0.5, cy + s * 0.05, s * 0.45, 0, 7); ctx.rect(cx - s * 0.6, cy + s * 0.1, s * 1.2, s * 0.42);
}
function house(cx, cy, s) {
  ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.8); ctx.lineTo(cx - s, cy - s * 0.2); ctx.lineTo(cx, cy - s * 0.95); ctx.lineTo(cx + s, cy - s * 0.2); ctx.lineTo(cx + s, cy + s * 0.8); ctx.closePath();
}
function chip(s, x, y, p, { color = INK, fill = SURF, size = 24, dot = false } = {}) {
  if (p <= 0) return;
  const sc = E.outBack(clamp(p), 1.7), w = measure(s, size, 600) + 48 + (dot ? 22 : 0);
  ctx.save(); ctx.translate(x + w / 2, y); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 3);
  ctx.fillStyle = fill; ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; rrect(-w / 2, -size * 0.95, w, size * 1.9, size * 0.95); ctx.fill(); ctx.stroke();
  if (dot) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(-w / 2 + 28, 0, 5, 0, 7); ctx.fill(); }
  text(s, dot ? 11 : 0, 1, size, { weight: 600, color }); ctx.restore();
  return w;
}
// Glowing signal along a quadratic arc; a in 0..1 head, b tail.
function arcPt(p0, c, p1, s) { const q = 1 - s; return [q * q * p0[0] + 2 * q * s * c[0] + s * s * p1[0], q * q * p0[1] + 2 * q * s * c[1] + s * s * p1[1]]; }
function signal(p0, c, p1, head, tail = 0, { width = 6, dot = true, alpha = 1 } = {}) {
  if (head <= tail) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const s = lerp(tail, head, i / 40), [px, py] = arcPt(p0, c, p1, s); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.strokeStyle = 'rgba(255,69,58,0.35)'; ctx.lineWidth = width * 4; ctx.shadowColor = RED; ctx.shadowBlur = 40; ctx.stroke();
  ctx.strokeStyle = RED; ctx.lineWidth = width; ctx.shadowBlur = 20; ctx.stroke();
  ctx.strokeStyle = '#ffb4ae'; ctx.lineWidth = width * 0.35; ctx.shadowBlur = 0; ctx.stroke();
  if (dot) { const [hx, hy] = arcPt(p0, c, p1, head); ctx.fillStyle = '#fff'; ctx.shadowColor = RED; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(hx, hy, width * 1.4, 0, 7); ctx.fill(); }
  ctx.restore();
}
function dashedArc(p0, c, p1, draw, alpha = 0.25) {
  if (draw <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.setLineDash([6, 12]); ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const [px, py] = arcPt(p0, c, p1, draw * i / 40); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke(); ctx.restore();
}

// ---------- the Mac app window (matches the real layout: playlist left, Play on panel right)
function macApp(x, y, w, h, { rows = [], hot = -1, press = 0, playing = false, land = [] } = {}) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 30;
  ctx.fillStyle = '#1c1c1f'; rrect(x, y, w, h, 18); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.save(); rrect(x, y, w, h, 18); ctx.clip();
  ctx.fillStyle = '#232326'; ctx.fillRect(x, y, w, 58);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 28 + i * 24, y + 29, 7, 0, 7); ctx.fill(); });
  ctx.strokeStyle = RED; ctx.lineWidth = 2.5; rrect(x + 118, y + 20, 26, 17, 3); ctx.stroke();
  text('Fast TV', x + 156, y + 29, 20, { weight: 600, align: 'left', color: '#d6d6db' });
  ctx.fillStyle = '#34c759'; ctx.beginPath(); ctx.arc(x + w - 168, y + 29, 4, 0, 7); ctx.fill();
  text('Living Room TV', x + w - 24, y + 29, 17, { weight: 500, align: 'right', color: MUTED });
  const split = x + w * 0.64;
  ctx.fillStyle = '#19191c'; ctx.fillRect(x, y + 58, w, h - 58);
  ctx.fillStyle = '#151517'; ctx.fillRect(split, y + 58, x + w - split, h - 58);
  ctx.fillStyle = LINE; ctx.fillRect(split, y + 58, 1.5, h - 58);
  text('Playlist', x + 32, y + 106, 30, { weight: 700, align: 'left' });
  text(String(rows.length), x + 152, y + 108, 18, { weight: 500, align: 'left', color: MUTED });
  text('Your videos, ready to play.', x + 32, y + 140, 16, { weight: 500, align: 'left', color: MUTED });
  ctx.fillStyle = '#c0362c'; rrect(split - 168, y + 88, 140, 40, 9); ctx.fill();
  text('+  Add videos', split - 98, y + 108, 17, { weight: 600 });
  rows.forEach((r, i) => {
    const ry = y + 172 + i * 84, rw = split - x - 60, sel = i === hot, l = land[i] ?? 1;
    ctx.save(); ctx.globalAlpha *= clamp(l * 2);
    const sq = 1 + (1 - clamp(l)) * 0.05; ctx.translate(x + 30 + rw / 2, ry + 36); ctx.scale(sq, 2 - sq); ctx.translate(-(x + 30 + rw / 2), -(ry + 36));
    ctx.fillStyle = sel ? 'rgba(255,69,58,0.13)' : '#1f1f23'; rrect(x + 30, ry, rw, 72, 12); ctx.fill();
    ctx.strokeStyle = sel ? 'rgba(255,69,58,0.45)' : LINE; ctx.lineWidth = 1.5; rrect(x + 30, ry, rw, 72, 12); ctx.stroke();
    ctx.fillStyle = sel ? '#c0362c' : '#2c2c31'; rrect(x + 46, ry + 14, 44, 44, 9); ctx.fill();
    ctx.fillStyle = sel ? INK : MUTED; tri(x + 69, ry + 36, 16, 1);
    text(r.name, x + 106, ry + 26, 20, { weight: 600, align: 'left' });
    text((sel && playing ? 'Now playing · ' : '') + r.meta, x + 106, ry + 50, 15, { weight: 500, align: 'left', color: MUTED });
    ctx.restore();
  });
  text('Use your TV remote to browse', x + 32, y + h - 30, 15, { weight: 500, align: 'left', color: DIM });
  const ix = split + 26, iw = x + w - ix - 26;
  ctx.fillStyle = '#0d0d0f'; rrect(ix, y + 82, iw, iw * 0.56, 12); ctx.fill();
  if (rows.length && hot >= 0) { ctx.save(); rrect(ix, y + 82, iw, iw * 0.56, 12); ctx.clip(); cover(IMG.coast, ix, y + 82, iw, iw * 0.56, 1.05); ctx.restore(); }
  else logo(ix + iw / 2, y + 82 + iw * 0.28, iw * 0.42, 1, 0.15);
  text('Play on', ix, y + 82 + iw * 0.56 + 40, 16, { weight: 500, align: 'left', color: MUTED });
  const dy = y + 82 + iw * 0.56 + 60;
  ctx.fillStyle = 'rgba(255,69,58,0.12)'; rrect(ix, dy, iw, 62, 11); ctx.fill();
  ctx.strokeStyle = 'rgba(255,69,58,0.45)'; ctx.lineWidth = 1.5; rrect(ix, dy, iw, 62, 11); ctx.stroke();
  ctx.strokeStyle = MUTED; ctx.lineWidth = 2; rrect(ix + 16, dy + 20, 28, 18, 3); ctx.stroke();
  text('Living Room TV', ix + 58, dy + 22, 18, { weight: 600, align: 'left' });
  text('Fast TV receiver', ix + 58, dy + 43, 14, { weight: 500, align: 'left', color: MUTED });
  ctx.strokeStyle = '#34c759'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ix + iw - 34, dy + 31); ctx.lineTo(ix + iw - 26, dy + 39); ctx.lineTo(ix + iw - 14, dy + 23); ctx.stroke();
  const by = y + h - 92, s = 1 - press * 0.07;
  ctx.save(); ctx.translate(ix + iw / 2, by + 30); ctx.scale(s, s);
  ctx.fillStyle = playing ? '#2a2a2e' : RED; if (!playing) { ctx.shadowColor = 'rgba(255,69,58,0.6)'; ctx.shadowBlur = 10 + 30 * press; }
  rrect(-iw / 2, -30, iw, 60, 13); ctx.fill(); ctx.shadowColor = 'transparent';
  if (playing) { ctx.fillStyle = '#34c759'; ctx.beginPath(); ctx.arc(-iw / 2 + 30, 0, 5, 0, 7); ctx.fill(); text('Playing on TV', -iw / 2 + 46, 1, 20, { weight: 600, align: 'left' }); }
  else { ctx.fillStyle = BG; tri(-62, 0, 16, 1); text('Play on TV', -44, 1, 21, { weight: 650, align: 'left', color: BG }); }
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1.5; rrect(x, y, w, h, 18); ctx.stroke();
  ctx.restore();
  return { playX: ix + iw / 2, playY: by + 30, rowX: x + 30 + (split - x - 60) / 2, rowY: i => y + 172 + i * 84 + 36 };
}
function remote(x, y, s, { press = null, amt = 0 } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 20;
  const g = ctx.createLinearGradient(-70, 0, 70, 0); g.addColorStop(0, '#1c1c20'); g.addColorStop(0.5, '#29292e'); g.addColorStop(1, '#1c1c20');
  ctx.fillStyle = g; rrect(-70, -230, 140, 460, 62); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; rrect(-70, -230, 140, 460, 62); ctx.stroke();
  ctx.fillStyle = '#323238'; ctx.beginPath(); ctx.arc(0, -110, 56, 0, 7); ctx.fill();
  const dirs = { up: [0, -148], down: [0, -72], left: [-38, -110], right: [38, -110] };
  Object.entries(dirs).forEach(([k, [dx, dy]]) => {
    const on = press === k ? amt : 0;
    ctx.fillStyle = on > 0.05 ? RED : 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(dx, dy + on * 3, 7 + on * 4, 0, 7); ctx.fill();
  });
  const ok = press === 'ok' ? amt : 0;
  ctx.fillStyle = ok > 0.05 ? RED : '#45454c'; ctx.beginPath(); ctx.arc(0, -110 + ok * 3, 22 - ok * 2, 0, 7); ctx.fill();
  [[-32, 0], [32, 0], [-32, 60], [32, 60], [0, 130]].forEach(([bx, by]) => { ctx.fillStyle = '#323238'; ctx.beginPath(); ctx.arc(bx, by, 15, 0, 7); ctx.fill(); });
  ctx.restore();
}
// The Fast TV receiver playlist, redrawn from the store capture so the selection can move.
function tvPlaylist(x, y, w, h, hot, pulse) {
  const k = h / 1080, lw = w * 0.5625;
  cover(IMG.coast, x, y, lw, h, 1.05, -w * 0.05); ctx.fillStyle = 'rgba(9,9,11,0.45)'; ctx.fillRect(x, y, lw, h);
  ctx.fillStyle = '#121213'; ctx.fillRect(x + lw, y, w - lw, h);
  const px = x + lw + 48 * k * (w / h) / 1.78, pw = x + w - 72 * k - px;
  text('Playlist', px, y + 94 * k, 50 * k, { weight: 700, align: 'left' });
  text('3 movies', px, y + 164 * k, 24 * k, { weight: 500, align: 'left', color: MUTED });
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; rrect(x + w - 200 * k, y + 50 * k, 128 * k, 86 * k, 18 * k); ctx.stroke();
  text('Close', x + w - 136 * k, y + 93 * k, 26 * k, { weight: 500 });
  ['Evening-Coast', 'Tide Pools', 'Blue Hour'].forEach((n, i) => {
    const ry = y + (220 + i * 184) * k, rh = 164 * k, sel = i === hot, sc = sel ? 1 + 0.025 * pulse : 1;
    ctx.save(); ctx.translate(px + pw / 2, ry + rh / 2); ctx.scale(sc, sc); ctx.translate(-(px + pw / 2), -(ry + rh / 2));
    ctx.fillStyle = sel ? '#cc342c' : '#212124'; rrect(px, ry, pw, rh, 18 * k); ctx.fill();
    ctx.strokeStyle = sel ? INK : 'rgba(255,255,255,0.08)'; ctx.lineWidth = sel ? 5 * k : 2; rrect(px, ry, pw, rh, 18 * k); ctx.stroke();
    if (i === 0) text('Current', px + 36 * k, ry + 48 * k, 24 * k, { weight: 700, align: 'left' });
    text(n, px + 36 * k, ry + (i === 0 ? 104 : 84) * k, 40 * k, { weight: 500, align: 'left' });
    ctx.restore();
  });
  text('↑↓ Choose movie · OK Play · Back Return', px, y + 1016 * k, 23 * k, { weight: 500, align: 'left', color: MUTED });
}
function nowPlaying(x, y, w, h, title, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(0, y, 0, y + h * 0.25); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h * 0.25);
  ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(x + h * 0.06, y + h * 0.07, h * 0.014, 0, 7); ctx.fill();
  text(title, x + h * 0.09, y + h * 0.072, h * 0.042, { weight: 600, align: 'left' });
  ctx.restore();
}

// =====================================================================================
// S1 0–6 · HOOK: the movies are on the Mac. The TV is across the room.
const MAC1 = [500, 560], TV1 = { x: 1130, y: 330, w: 600, h: 338 };
const MACSCR = [500, 490], TVC = [TV1.x + TV1.w / 2, TV1.y + TV1.h / 2];
const ARC1 = [[735, 340], [960, 120], [TV1.x + 70, TV1.y + 130]];
function worldS1(u, { tvOn = 0, macFill = 1, macDraw = 1, tvDraw = 1, tvFill = 1, charge = 0 } = {}) {
  laptop(MAC1[0], MAC1[1] - 60, 440, {
    draw: macDraw, fill: macFill, screen: (x, y, w, h) => {
      ctx.fillStyle = '#101012'; ctx.fillRect(x, y, w, h);
      for (let i = 0; i < 6; i++) {
        const c = i % 3, r = Math.floor(i / 3), p = E.outBack(prog(u, 1.0 + i * 0.12, 1.5 + i * 0.12), 1.6);
        if (p <= 0) continue;
        const tw = w * 0.26, th = tw * 0.62, tx = x + w * 0.08 + c * (tw + w * 0.04), ty = y + h * 0.16 + r * (th + h * 0.14);
        ctx.save(); ctx.translate(tx + tw / 2, ty + th / 2); ctx.scale(p, p); ctx.translate(-(tx + tw / 2), -(ty + th / 2));
        ctx.save(); rrect(tx, ty, tw, th, 6); ctx.clip(); cover(IMG.coast, tx, ty, tw, th, 1.3 + i * 0.25, (i - 2) * 30, (i % 2) * 20);
        if (i % 2) { ctx.fillStyle = 'rgba(40,70,140,0.35)'; ctx.fillRect(tx, ty, tw, th); }
        ctx.restore();
        text(['Evening-Coast.mkv', 'Tide Pools.mp4', 'Blue Hour.mov', 'Harbour.mkv', 'Night Drive.mp4', 'Cliffs.mkv'][i], tx, ty + th + 14, 10, { weight: 500, align: 'left', color: MUTED });
        ctx.restore();
      }
      if (charge > 0) { ctx.save(); ctx.globalAlpha *= charge; ctx.fillStyle = 'rgba(255,69,58,0.18)'; ctx.fillRect(x, y, w, h); ctx.restore(); }
    },
  });
  if (tvDraw > 0 && tvFill < 1) { ctx.save(); ctx.globalAlpha *= 1 - tvFill; tvLine(TV1.x, TV1.y, TV1.w, TV1.h, tvDraw); ctx.restore(); }
  if (tvFill > 0) {
    ctx.save(); ctx.globalAlpha *= tvFill;
    tv(TV1.x, TV1.y, TV1.w, TV1.h, (x, y, w, h) => {
      if (tvOn < 1) text('No signal', x + w / 2, y + h / 2, 22, { weight: 500, color: `rgba(255,255,255,${0.22 * (1 - tvOn)})` });
      if (tvOn > 0) { glowBg(x + w / 2, y + h / 2, w * 0.7, [[0, `rgba(255,69,58,${0.5 * tvOn})`], [1, 'rgba(255,69,58,0)']]); }
    });
    ctx.restore();
  }
}
function s1(u, t) {
  glowBg(W / 2, H / 2, 1100, [[0, 'rgba(255,69,58,0.10)'], [1, 'rgba(0,0,0,0)']], E.outCubic(prog(u, 0.4, 2)));
  // camera: close on the Mac, then pull back and over to reveal the TV
  const pan = E.inOutCubic(prog(u, 2.5, 3.7));
  const cx = lerp(MAC1[0], W / 2, pan) + noise1(u * 0.4, 3) * 6, cy = lerp(MAC1[1] - 30, H / 2, pan), z = lerp(1.5, 1, pan) * (1 + 0.012 * u);
  ctx.save(); cam(cx, cy, z);
  const macDraw = E.inOutCubic(prog(u, 0.15, 1.0)), macFill = E.outCubic(prog(u, 0.75, 1.1));
  const tvDraw = E.inOutCubic(prog(u, 3.15, 3.9)), tvFill = E.outCubic(prog(u, 3.75, 4.1));
  const charge = bump(u, 5.75, 0.25);
  worldS1(u, { macDraw, macFill, tvDraw, tvFill, charge });
  dashedArc(...ARC1, E.inOutCubic(prog(u, 4.3, 5.1)), 0.3);
  // a question mark waits at the top of the gap
  const q = E.outBack(prog(u, 4.9, 5.3), 2.0) * (1 - prog(u, 5.75, 5.95));
  if (q > 0) { ctx.save(); ctx.translate(960, 220); ctx.scale(q, q); text('?', 0, 0, 64, { weight: 700, color: MUTED }); ctx.restore(); }
  ctx.restore();
  // captions live in screen space
  const out1 = E.inCubic(prog(u, 2.4, 2.75));
  ctx.save(); ctx.globalAlpha *= 1 - out1; ctx.translate(0, -out1 * 30);
  riseWords('Your movies live on your Mac.', W / 2, 935, 64, u, 1.2, { stagger: 0.07 });
  ctx.restore();
  const out2 = E.inCubic(prog(u, 5.55, 5.95));
  ctx.save(); ctx.globalAlpha *= 1 - out2; ctx.translate(0, -out2 * 30);
  riseWords('Your TV is across the room.', W / 2, 935, 64, u, 3.75, { stagger: 0.07 });
  ctx.restore();
}

// S2 6–10 · THE SIGNAL: it finds the TV, the camera dives into the screen, the brand appears.
function s2(u, t) {
  const fire = E.inOutCubic(prog(u, 0, 0.5));
  const dive = E.inOutExpo(prog(u, 0.75, 1.6));
  // camera: hold wide, then dive into the TV screen centre until the screen covers the frame
  // starts exactly where S1's slow push left the camera
  const z0 = 1 + 0.012 * (u + 6), x0 = W / 2 + noise1((u + 6) * 0.4, 3) * 6;
  const z = lerp(z0, 3.6, dive), cx = lerp(x0, TVC[0], E.outCubic(dive)), cy = lerp(H / 2, TVC[1], E.outCubic(dive));
  if (dive < 1) {
    glowBg(W / 2, H / 2, 1100, [[0, 'rgba(255,69,58,0.10)'], [1, 'rgba(0,0,0,0)']], 1 - dive);
    ctx.save(); cam(cx, cy, z);
    worldS1(u + 6, { tvOn: E.outCubic(prog(u, 0.5, 0.8)), charge: bump(u + 6, 5.75, 0.25) });
    dashedArc(...ARC1, 1, 0.3 * (1 - fire));
    signal(...ARC1, fire, E.inCubic(prog(u, 0.45, 0.85)), { width: 6 });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = E.inCubic(prog(dive, 0.55, 1)); ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // inside the screen: brand
  glowBg(W / 2, 430, 900, [[0, 'rgba(255,69,58,0.32)'], [1, 'rgba(255,69,58,0)']], dive * (1 - 0.3 * prog(u, 2, 4)));
  const ls = E.outExpo(prog(u, 1.15, 2.0));
  const out = E.inCubic(prog(u, 3.55, 4.0));
  ctx.save(); ctx.globalAlpha *= 1 - out; ctx.translate(W / 2, 470); const zo = 1 + out * 0.35; ctx.scale(zo, zo); ctx.translate(-W / 2, -470);
  logo(W / 2, lerp(540, 360, E.inOutCubic(prog(u, 1.3, 2.1))), lerp(80, 300, ls), ls, 0.35);
  riseWords('Fast TV', W / 2, 600, 150, u, 1.55, { stagger: 0.12, dur: 0.9 });
  fade('Local video streaming. From Mac to Google TV.', W / 2, 720, 36, u, 2.1, { dur: 0.7, color: '#c8c8ce' });
  ctx.restore();
}

// S3 10–18 · DROP. PAIR. PLAY.
const M3 = { x: 100, y: 200, w: 1000, h: 640 }, T3 = { x: 1230, y: 330, w: 600, h: 338 };
function steps(u) {
  const labels = ['Drop.', 'Pair.', 'Play.'], at = [0.6, 2.5, 4.6], xs = [700, 960, 1220];
  labels.forEach((s, i) => {
    const appear = E.outExpo(prog(u, 0.25 + i * 0.08, 0.95 + i * 0.08)), active = u >= at[i] && (i === 2 || u < at[i + 1]), done = u >= (at[i + 1] ?? 99);
    const on = E.outCubic(prog(u, at[i], at[i] + 0.25));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 70, W, 120); ctx.clip();
    const col = active ? INK : done ? '#8a8a92' : '#3b3b41';
    text(s, xs[i], 118 + (1 - appear) * 80, 56, { weight: 700, color: col, track: -1.5 });
    ctx.restore();
    if (on > 0) { const w = measure(s, 56, 700, -1.5) * (active ? on : 1); ctx.fillStyle = active ? RED : 'rgba(255,69,58,0.3)'; ctx.fillRect(xs[i] - w / 2, 158, w, 4); }
  });
}
function s3(u, t) {
  glowBg(1500, 500, 900, [[0, 'rgba(255,69,58,0.10)'], [1, 'rgba(0,0,0,0)']], 1);
  ctx.save(); push(u, 8, { outDur: 0.45 });
  const zoom = E.inOutCubic(prog(u, 5.6, 7.6));
  ctx.translate(T3.x + T3.w / 2, T3.y + T3.h / 2); const zz = 1 + zoom * 0.06; ctx.scale(zz, zz); ctx.translate(-(T3.x + T3.w / 2), -(T3.y + T3.h / 2));
  steps(u);
  // DROP: three files arc in and land on the playlist on eighth-notes
  const lands = [1.5, 1.75, 2.0], names = ['Evening-Coast', 'Tide Pools', 'Blue Hour'], tags = ['MKV', 'MP4', 'MOV'];
  const landP = lands.map(l => u < l ? 0 : clamp(spring(u - l, 3, 9)));
  const rows = names.map((n, i) => ({ name: n, meta: tags[i] + ' · ' + ['1.4 GB', '820 MB', '2.1 GB'][i] })).filter((_, i) => u >= lands[i]);
  const pin = prog(u, 2.4, 4.6), played = u >= 5.25;
  const press = bump(u, 4.95, 0.08);
  const m = macApp(M3.x, M3.y + (1 - E.outExpo(prog(u, 0, 0.8))) * 200, M3.w, M3.h, { rows, hot: rows.length ? 0 : -1, press, playing: played, land: landP });
  lands.forEach((l, i) => {
    const a = l - 0.75, p = prog(u, a, l);
    if (p <= 0 || p >= 1) return;
    const e = E.inOutCubic(p), tx = m.rowX, ty = m.rowY(i);
    const fx = lerp(-200, tx, e), fy = lerp(H + 80, ty, e) - Math.sin(e * Math.PI) * 260;
    fileCard(fx, fy, names[i] + '.' + tags[i].toLowerCase(), { rot: (1 - e) * -0.4, alpha: 1 - prog(u, l - 0.08, l), tag: tags[i] });
  });
  // PAIR: TV shows a code; the Mac sheet types it in
  const code = '482913';
  const tvIn = E.outExpo(prog(u, 0.15, 0.9)), lit = E.outCubic(prog(u, 5.25, 5.6));
  ctx.save(); ctx.translate((1 - tvIn) * 300, 0); ctx.globalAlpha *= tvIn;
  tv(T3.x, T3.y, T3.w, T3.h, (x, y, w, h) => {
    if (lit < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - lit;
      ctx.fillStyle = '#0e0e10'; ctx.fillRect(x, y, w, h);
      logo(x + w / 2, y + h * 0.22, 56, 1, 0.2);
      text('Pair with your Mac', x + w / 2, y + h * 0.42, 22, { weight: 600 });
      const cp = prog(u, 2.55, 3.15);
      if (u > 2.5) {
        const str = scramble(code, cp, 7, u);
        [...str].forEach((ch, i) => {
          const bx = x + w / 2 - 3 * 60 + i * 60 + (i > 2 ? 14 : 0) - 7;
          ctx.fillStyle = '#1c1c20'; rrect(bx, y + h * 0.53, 50, 66, 10); ctx.fill();
          text(ch, bx + 25, y + h * 0.53 + 34, 38, { weight: 700, color: cp >= 1 ? INK : '#77777f' });
        });
      }
      text('Enter this code on your Mac', x + w / 2, y + h * 0.86, 16, { weight: 500, color: MUTED });
      ctx.restore();
    }
    if (lit > 0) { ctx.save(); ctx.globalAlpha *= lit; cover(IMG.coast, x, y, w, h, 1.12 - 0.06 * prog(u, 5.25, 8)); nowPlaying(x, y, w, h, 'Evening-Coast', prog(u, 5.7, 6.0)); ctx.restore(); }
  });
  ctx.restore();
  // Mac PIN sheet
  const sheet = E.outBack(prog(u, 3.1, 3.45), 1.4) * (1 - E.inCubic(prog(u, 4.35, 4.6)));
  if (sheet > 0.01) {
    const sx = M3.x + M3.w * 0.32, sy = M3.y + 300;
    ctx.save(); ctx.fillStyle = `rgba(0,0,0,${0.45 * clamp(sheet)})`; rrect(M3.x, M3.y + 58, M3.w, M3.h - 58, 0); ctx.fill();
    ctx.translate(sx, sy); ctx.scale(sheet, sheet);
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40; ctx.fillStyle = '#232327'; rrect(-260, -110, 520, 220, 18); ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; rrect(-260, -110, 520, 220, 18); ctx.stroke();
    text('Enter the code on your TV', 0, -66, 22, { weight: 650 });
    for (let i = 0; i < 6; i++) {
      const bx = -195 + i * 62 + (i > 2 ? 18 : 0), typedOn = u >= 3.55 + i * 0.12;
      ctx.fillStyle = '#141416'; ctx.strokeStyle = typedOn ? 'rgba(255,69,58,0.6)' : 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; rrect(bx, -26, 50, 64, 10); ctx.fill(); ctx.stroke();
      if (typedOn) { const pp = E.outBack(prog(u, 3.55 + i * 0.12, 3.7 + i * 0.12), 2); ctx.save(); ctx.translate(bx + 25, 7); ctx.scale(pp, pp); text(code[i], 0, 0, 34, { weight: 700 }); ctx.restore(); }
    }
    const ok = E.outBack(prog(u, 4.3, 4.45), 2);
    if (ok > 0) { ctx.save(); ctx.translate(0, 76); ctx.scale(ok, ok); ctx.strokeStyle = '#34c759'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-3, 9); ctx.lineTo(14, -9); ctx.stroke(); ctx.restore(); }
    ctx.restore();
  }
  // PLAY: cursor to the button, click, the signal carries the movie to the TV
  if (u > 4.3 && u < 5.6) {
    const cp = E.inOutCubic(prog(u, 4.35, 4.9));
    cursor(lerp(m.rowX + 160, m.playX + 40, cp), lerp(m.rowY(1), m.playY + 6, cp), press);
  }
  ring(m.playX, m.playY, u, 4.95, { r1: 160 });
  const P0 = [m.playX, m.playY - 30], P1 = [T3.x + T3.w / 2, T3.y + T3.h / 2], C = [(P0[0] + P1[0]) / 2, 120];
  signal(P0, C, P1, E.inOutCubic(prog(u, 4.95, 5.3)), E.inCubic(prog(u, 5.2, 5.6)), { width: 5 });
  ring(P1[0], P1[1], u, 5.28, { r1: 420, dur: 0.8, width: 6 });
  // caption under the TV
  const cap = [['Drop in your videos.', 0.9, 2.45], ['Pair once with a code.', 2.6, 4.55], ['Press play. It’s on the TV.', 5.35, 8]];
  cap.forEach(([s, a, b]) => { const o = E.inCubic(prog(u, b - 0.2, b)); if (u < a || o >= 1) return; ctx.save(); ctx.globalAlpha *= 1 - o; riseWords(s, T3.x + T3.w / 2, 790, 34, u, a, { weight: 600, color: '#d8d8dd', stagger: 0.05, dur: 0.6 }); ctx.restore(); });
  ctx.restore();
}

// S4 18–24 · LOCAL: the house holds the signal; the cloud is cut out.
function s4(u, t) {
  glowBg(1330, 560, 800, [[0, 'rgba(255,69,58,0.12)'], [1, 'rgba(0,0,0,0)']], 1);
  ctx.save(); push(u, 6, { noIn: true, outDur: 0.45 });
  // pull back from the playing TV into the house
  const pull = E.outExpo(prog(u, 0, 1.1));
  const cx = 1330, cy = 560, s = 330;
  const draw = E.inOutCubic(prog(u, 0.2, 1.3));
  const wallGlow = bump(u, 2.85, 0.35);
  ctx.save(); ctx.translate(cx, cy); const pz = lerp(2.4, 1, pull); ctx.scale(pz, pz); ctx.translate(-cx, -cy);
  ctx.save(); ctx.setLineDash([2600 * draw, 2600]); ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgba(255,255,255,${0.28 + wallGlow * 0.3})`; ctx.lineWidth = 5; if (wallGlow > 0.05) { ctx.shadowColor = RED; ctx.shadowBlur = 40 * wallGlow; ctx.strokeStyle = mixColor('5a5a60', 'ff453a', wallGlow); }
  house(cx, cy, s); ctx.stroke(); ctx.restore();
  tv(cx - 170, cy - 160, 340, 191, (x, y, w, h) => cover(IMG.coast, x, y, w, h, 1.1), { stand: false, bezel: 9 });
  laptop(cx, cy + 170, 200, { screen: (x, y, w, h) => { ctx.fillStyle = '#121214'; ctx.fillRect(x, y, w, h); logo(x + w / 2, y + h / 2, 56, 1, 0.2); } });
  // packets flow Mac → TV, inside
  ctx.save(); ctx.globalAlpha *= E.outCubic(prog(u, 1.0, 1.4));
  ctx.strokeStyle = 'rgba(255,69,58,0.3)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy + 95); ctx.lineTo(cx, cy + 50); ctx.stroke();
  for (let i = 0; i < 3; i++) { const p = ((u * 0.9) + i / 3) % 1; ctx.fillStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(cx, lerp(cy + 95, cy + 45, p), 5, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.restore();
  // the cloud reaches for it and is cut off at the roof
  const cIn = E.outBack(prog(u, 1.5, 1.9), 1.6), reach = E.inOutCubic(prog(u, 1.9, 2.75)), cut = E.outExpo(prog(u, 2.8, 3.05)), gone = E.inCubic(prog(u, 3.5, 3.9));
  if (cIn > 0 && gone < 1) {
    const ccx = 1730, ccy = 170;
    ctx.save(); ctx.globalAlpha *= clamp(cIn) * (1 - gone); ctx.translate(ccx, ccy); ctx.scale(cIn * (1 - gone * 0.3), cIn * (1 - gone * 0.3)); ctx.translate(-ccx, -ccy);
    const retract = cut > 0 ? 1 - cut : 1, hx = lerp(ccx - 60, cx + 150, reach * retract), hy = lerp(ccy + 50, cy - s * 0.62, reach * retract);
    ctx.setLineDash([7, 10]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ccx - 60, ccy + 50); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#2a2a2e'; cloud(ccx, ccy, 66); ctx.fill();
    text('Cloud', ccx, ccy + 75, 16, { weight: 600, color: MUTED });
    if (cut > 0) { ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.beginPath(); ctx.moveTo(ccx - 95, ccy + 75); ctx.lineTo(lerp(ccx - 95, ccx + 95, cut), lerp(ccy + 75, ccy - 85, cut)); ctx.stroke(); }
    ctx.restore();
  }
  // copy
  kicker('NOTHING UPLOADED', 150, 360, u, 0.5);
  riseWords('Your videos', 150, 455, 96, u, 0.65, { align: 'left' });
  riseWords('never leave home.', 150, 560, 96, u, 0.8, { align: 'left', colors: [INK, INK, RED] });
  fade('Fast TV streams over your own Wi‑Fi, straight from Mac to TV.', 150, 660, 28, u, 1.5, { align: 'left' });
  let cxp = 150;
  [['No cloud', 3.15], ['No account', 3.4], ['No upload', 3.65]].forEach(([s2_, at]) => { const w = chip(s2_, cxp, 750, prog(u, at, at + 0.45), { dot: true }); cxp += (w || measure(s2_, 24, 600) + 70) + 14; });
  ctx.restore();
}

// S5 24–30 · ONE PLAYLIST, BOTH SCREENS: the remote moves the selection, OK plays Blue Hour.
const T5 = { x: 110, y: 160, w: 1060, h: 596 };
function s5(u, t) {
  glowBg(600, 460, 900, [[0, 'rgba(255,69,58,0.10)'], [1, 'rgba(0,0,0,0)']], 1);
  ctx.save(); push(u, 6, { outDur: 0.45 });
  const presses = [1.5, 2.0, 3.0];
  let hot = 0; presses.slice(0, 2).forEach(p => { if (u >= p) hot++; });
  let pulse = 0; presses.forEach(p => (pulse += bump(u, p + 0.06, 0.12)));
  const tvIn = E.outExpo(prog(u, 0, 0.8));
  ctx.save(); ctx.translate(0, (1 - tvIn) * 60);
  tv(T5.x, T5.y, T5.w, T5.h, (x, y, w, h) => {
    const sw = E.inOutCubic(prog(u, 3.05, 3.5));
    if (sw < 1) tvPlaylist(x, y, w, h, hot, pulse);
    if (sw > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x + w * (1 - sw), y, w * sw, h); ctx.clip();
      ctx.drawImage(IMG.blue, x, y, w, h); nowPlaying(x, y, w, h, 'Blue Hour', prog(u, 3.5, 3.8));
      ctx.restore();
      if (sw < 1) { ctx.fillStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.fillRect(x + w * (1 - sw) - 3, y, 6, h); ctx.shadowColor = 'transparent'; }
    }
  });
  ctx.restore();
  // remote
  const rIn = E.outExpo(prog(u, 0.35, 1.1));
  let press = null, amt = 0;
  presses.forEach((p, i) => { const b = bump(u, p, 0.09); if (b > amt) { amt = b; press = i < 2 ? 'down' : 'ok'; } });
  const RX = 1560, RY = 790 + (1 - rIn) * 400;
  ctx.save(); ctx.translate(RX, RY); ctx.rotate(-0.12 + noise1(u * 0.5, 9) * 0.02); remote(0, 0, 0.72, { press, amt }); ctx.restore();
  presses.forEach(p => ring(RX - 14, RY - 80, u, p, { r1: 150, dur: 0.5 }));
  kicker('ONE PLAYLIST · BOTH SCREENS', 1270, 205, u, 0.5);
  riseWords('Pick the next', 1270, 290, 72, u, 0.6, { align: 'left' });
  riseWords('movie from', 1270, 370, 72, u, 0.72, { align: 'left' });
  riseWords('the sofa.', 1270, 450, 72, u, 0.84, { align: 'left', colors: [INK, RED] });
  ctx.restore();
}

// S6 30–36 · FORMATS: six formats slam in on the beat, then collapse into the TV with subtitles.
const FMT = [['MP4', 470, 340], ['MKV', 960, 340], ['MOV', 1450, 340], ['E‑AC‑3', 450, 670], ['SRT', 960, 670], ['WebVTT', 1460, 670]];
const SLAM = [0.25, 0.75, 1.25, 1.75, 2.25, 2.75];
const T6 = { x: 880, y: 250, w: 880, h: 495 };
function s6(u, t) {
  glowBg(W / 2, H / 2, 1100, [[0, 'rgba(255,69,58,0.12)'], [1, 'rgba(0,0,0,0)']], 1);
  ctx.save(); push(u, 6, { outDur: 0.45 });
  shake(u, SLAM, 9);
  const collapse = E.inOutExpo(prog(u, 3.1, 3.75));
  FMT.forEach(([s, x, y], i) => {
    const p = prog(u, SLAM[i], SLAM[i] + 0.35); if (p <= 0 || collapse >= 1) return;
    const sc = lerp(1.9, 1, E.outExpo(p)) * lerp(1, 0.12, collapse);
    const tx = lerp(x, T6.x + T6.w / 2, collapse), ty = lerp(y, T6.y + T6.h / 2, collapse);
    ctx.save(); ctx.translate(tx, ty); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(p * 4) * (1 - collapse * 0.6);
    const latest = i === SLAM.filter(a => u >= a).length - 1 && u < 3.1;
    text(s, 0, 0, i < 3 ? 180 : 140, { weight: 800, color: latest ? RED : INK, track: -6, glow: latest ? 40 : 0 });
    ctx.restore();
  });
  // labels under each pair of rows
  if (u > 0.4 && collapse < 1) { ctx.save(); ctx.globalAlpha *= 1 - collapse; fade('VIDEO', W / 2, 475, 22, u, 0.4, { weight: 650, track: 5, color: '#77777f' }); fade('SOUND  +  SUBTITLES', W / 2, 795, 22, u, 1.9, { weight: 650, track: 5, color: '#77777f' }); ctx.restore(); }
  // TV with subtitles
  const tvIn = E.outExpo(prog(u, 3.45, 4.1));
  if (tvIn > 0) {
    ctx.save(); ctx.globalAlpha *= clamp(tvIn * 1.4); ctx.translate(T6.x + T6.w / 2, T6.y + T6.h / 2); const ts = lerp(0.85, 1, tvIn); ctx.scale(ts, ts); ctx.translate(-(T6.x + T6.w / 2), -(T6.y + T6.h / 2));
    tv(T6.x, T6.y, T6.w, T6.h, (x, y, w, h) => {
      cover(IMG.coast, x, y, w, h, 1.04 + 0.03 * prog(u, 3.5, 6));
      const line = 'A quiet evening on the coast.';
      const n = Math.floor(clamp((u - 4.05) / 0.035, 0, line.length));
      if (n > 0) { const tw = measure(line.slice(0, n), 30, 500); ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(x + w / 2 - tw / 2 - 14, y + h - 78, tw + 28, 46); text(line.slice(0, n), x + w / 2, y + h - 55, 30, { weight: 500 }); }
      const cc = E.outBack(prog(u, 3.85, 4.15), 1.8);
      if (cc > 0) { ctx.save(); ctx.translate(x + w - 56, y + 40); ctx.scale(cc, cc); ctx.fillStyle = RED; rrect(-34, -20, 68, 40, 8); ctx.fill(); text('CC', 0, 1, 22, { weight: 800, color: BG }); ctx.restore(); }
    });
    ctx.restore();
    kicker('FORMATS · SUBTITLES', 150, 380, u, 3.6);
    riseWords('Plays what', 150, 470, 92, u, 3.7, { align: 'left' });
    riseWords('you’ve got.', 150, 570, 92, u, 3.82, { align: 'left', colors: [RED, INK] });
    fade('MKV and surround sound play direct.', 150, 665, 26, u, 4.3, { align: 'left' });
    fade('Subtitles switch from the remote.', 150, 705, 26, u, 4.45, { align: 'left' });
  }
  ctx.restore();
}

// S7 36–40 · PAY ONCE.
function s7(u, t) {
  glowBg(W / 2, 470, 1000, [[0, 'rgba(255,69,58,0.22)'], [1, 'rgba(0,0,0,0)']], E.outCubic(prog(u, 0, 0.6)));
  ctx.save(); push(u, 4, { noOut: true });
  const out = E.inCubic(prog(u, 3.55, 4.0)); ctx.globalAlpha *= 1 - out; ctx.translate(W / 2, H / 2); ctx.scale(1 - out * 0.08, 1 - out * 0.08); ctx.translate(-W / 2, -H / 2);
  kicker('ONE-TIME LICENSE', W / 2 - 8, 250, u, 0.15, 'center');
  const pp = E.outExpo(prog(u, 0.25, 1.15));
  const price = '$' + (19.99 * pp).toFixed(2);
  const pw = measure('$19.99', 230, 800, -8);
  text(price, W / 2 - pw / 2, 430, 230, { weight: 800, align: 'left', track: -8, glow: 60 });
  // "/month" arrives, gets struck, falls away
  const mp = E.outExpo(prog(u, 1.15, 1.45)), strike = E.outExpo(prog(u, 1.6, 1.85)), drop = prog(u, 2.0, 2.6);
  if (mp > 0 && drop < 1) {
    const mx = W / 2 + pw / 2 + 24, my = 470;
    ctx.save(); ctx.globalAlpha *= mp * (1 - E.inCubic(drop)); ctx.translate(mx, my + E.inCubic(drop) * 380); ctx.rotate(E.inCubic(drop) * 0.6);
    const r = text('/month', 0, 0, 60, { weight: 500, color: MUTED, align: 'left' });
    if (strike > 0) { ctx.strokeStyle = RED; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-10 + (r.total + 20) * strike, -4); ctx.stroke(); }
    ctx.restore();
  }
  riseWords('Pay once. Keep watching.', W / 2, 640, 80, u, 2.2, { stagger: 0.08, colors: [INK, INK, RED, RED] });
  fade('Up to two Macs  ·  No subscription  ·  Full refund within 14 days', W / 2, 745, 28, u, 2.75, { color: '#c4c4ca' });
  ctx.restore();
}

// S8 40–45 · END CARD.
function s8(u, t) {
  glowBg(W / 2, 400, 1000, [[0, 'rgba(255,69,58,0.30)'], [1, 'rgba(0,0,0,0)']], E.outCubic(prog(u, 0, 0.8)));
  const out = E.inCubic(prog(u, 4.3, 4.95));
  ctx.save(); ctx.globalAlpha *= 1 - out;
  const ls = E.outExpo(prog(u, 0.05, 0.9));
  logo(W / 2, 285, lerp(120, 250, ls), ls, 0.4);
  riseWords('Fast TV', W / 2, 490, 130, u, 0.3, { stagger: 0.12, dur: 0.9 });
  fade('Your Mac’s movies on Google TV.', W / 2, 590, 34, u, 0.75, { color: '#c8c8ce' });
  const pp = prog(u, 1.2, 1.6);
  if (pp > 0) { const s = E.outBack(pp, 1.7); ctx.save(); ctx.translate(W / 2, 700); ctx.scale(s, s); ctx.fillStyle = RED; ctx.shadowColor = 'rgba(255,69,58,0.5)'; ctx.shadowBlur = 30; rrect(-230, -38, 460, 76, 38); ctx.fill(); ctx.shadowColor = 'transparent'; text('Free download for Mac', 0, 2, 28, { weight: 700, color: BG }); ctx.restore(); }
  typedP('myfastv.com', W / 2, 815, 52, u, 1.75, 0.055);
  fade('TV app on Google Play  ·  Apple silicon, macOS 13+', W / 2, 905, 22, u, 2.5, { color: '#8f8f98', weight: 500 });
  ctx.restore();
}

// ---------- overlay: the progress signal along the bottom (whip smears at pushes come from COMP.whips)
function overlay(t) {
  // progress line: Mac glyph → TV glyph, filled red as the story goes
  const vis = prog(t, 10.3, 11.0) * (1 - prog(t, 39.6, 40.0));
  if (vis <= 0) return;
  ctx.save(); ctx.globalAlpha = vis * 0.85;
  const x0 = 210, x1 = W - 210, y = 1018, p = prog(t, 10, 40), hx = lerp(x0, x1, p);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, y - 1, x1 - x0, 2);
  ctx.fillStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 12; ctx.fillRect(x0, y - 1.5, hx - x0, 3);
  ctx.beginPath(); ctx.arc(hx, y, 4.5, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = MUTED; ctx.lineWidth = 2;
  rrect(x0 - 52, y - 11, 28, 18, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0 - 58, y + 11); ctx.lineTo(x0 - 18, y + 11); ctx.stroke();
  rrect(x1 + 22, y - 12, 32, 20, 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x1 + 30, y + 13); ctx.lineTo(x1 + 46, y + 13); ctx.stroke();
  ctx.restore();
}

const COMP = {
  duration: DUR, fps: 30,
  theme: { bg: BG, text: INK, accent: RED, font: 'sans', sans: UI },
  fonts: [],
  images: { logo: 'img/logo.png', coast: 'img/coast.jpg' },
  prepare() {
    // Blue Hour: the coast frame graded cold, used as the third playlist movie
    const c = mk(1060, 596), g = c.getContext('2d');
    const s = Math.max(1060 / IMG.coast.width, 596 / IMG.coast.height) * 1.25;
    g.drawImage(IMG.coast, (1060 - IMG.coast.width * s) / 2 - 120, (596 - IMG.coast.height * s) / 2, IMG.coast.width * s, IMG.coast.height * s);
    g.globalCompositeOperation = 'color'; g.fillStyle = '#2b4f9e'; g.globalAlpha = 0.5; g.fillRect(0, 0, 1060, 596);
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.3; g.fillStyle = '#9ab8ff'; g.fillRect(0, 0, 1060, 596);
    IMG.blue = c;
  },
  scenes: [[0, s1], [CUT[1], s2], [CUT[2], s3], [CUT[3], s4], [CUT[4], s5], [CUT[5], s6], [CUT[6], s7], [CUT[7], s8]],
  overlay,
  whips: [10, 18, 24, 30, 36],   // horizontal smear at each push cut
  crt: { on: false },
  glitch: [],
  flash: [[6.5, 0.35, 0.12], [11.5, 0.05, 0.08], [15.28, 0.18, 0.12], [20.8, 0.12, 0.1], [33.1, 0.1, 0.1], [37.6, 0.12, 0.1]],
  grain: 0.022, shift: 0.6, scanlines: 0, vignette: 0.32, // clean brand look: no wobble, no scanlines
};
