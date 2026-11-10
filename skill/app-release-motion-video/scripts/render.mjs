#!/usr/bin/env node
// Render a composition project frame by frame in headless Chromium.
//
//   node render.mjs <project> stills 0.5,2.1,7.5      -> <project>/stills/t*.png + stills/sheet.png
//   node render.mjs <project> video out.mp4 [--share] [--lufs -14] [--no-cover]
//        -> master (crf 14) [+ out-share.mp4, crf 21]. With audio.wav, the encoded loudness is measured
//           and corrected to --lufs (default -14; pass --lufs off to skip).
//        Cover: frame 0 shows the cover frame (COMP.cover seconds, default the last frame), which platforms
//        that use the first frame as the thumbnail pick up; it is also saved as <project>/cover.jpg and
//        embedded in every output as the MP4 cover art (attached_pic). COMP.cover = false or --no-cover: off.
//
// Frame size comes from window.FORMAT in the project's index.html (engine default 1080×1920).
// <project> holds index.html + comp.js (+ assets, optional audio.wav). /engine.js is served from
// this skill unless the project ships its own copy.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.join(HERE, '..', 'engine', 'engine.js');
const [projectArg, mode, arg, ...flags] = process.argv.slice(2);
if (!projectArg || !['stills', 'video'].includes(mode) || !arg) {
  console.error('usage: node render.mjs <project> stills <t,t,...> | video <out.mp4> [--share] [--lufs -14|off]');
  process.exit(2);
}
const PROJECT = path.resolve(projectArg);

function loadPlaywright() {
  const tries = [path.join(PROJECT, 'package.json'), path.join(HERE, 'package.json')];
  for (const from of tries) {
    for (const name of ['playwright-core', 'playwright']) {
      try { return createRequire(from)(name); } catch {}
    }
  }
  // Any global install, including ones nested inside other global packages.
  let root = '';
  try { root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
  if (root) {
    const found = execSync(`find "${root}" -maxdepth 5 -type d \\( -name playwright-core -o -name playwright \\) -path "*node_modules*" 2>/dev/null || true`).toString().split('\n').filter(Boolean);
    for (const dir of found) {
      try { return createRequire(path.join(dir, 'package.json'))(dir); } catch {}
    }
  }
  throw new Error('playwright not found. Run `npm i -g playwright-core` (or `npm i -D playwright-core` in the project).');
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const caches = [path.join(os.homedir(), 'Library/Caches/ms-playwright'), path.join(os.homedir(), '.cache/ms-playwright')];
  const hits = [];
  for (const c of caches) {
    if (!fs.existsSync(c)) continue;
    for (const d of fs.readdirSync(c).filter(n => /^chromium-\d+$/.test(n))) {
      const out = execSync(`find "${path.join(c, d)}" -maxdepth 5 -type f -perm +111 \\( -name "Google Chrome for Testing" -o -name Chromium -o -name chrome \\) 2>/dev/null || true`).toString().split('\n').filter(Boolean);
      hits.push(...out.map(p => [Number(d.split('-')[1]), p]));
    }
  }
  hits.sort((a, b) => b[0] - a[0]);
  if (hits.length) return hits[0][1];
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']) if (fs.existsSync(p)) return p;
  throw new Error('No Chromium found. Set CHROME_PATH or run `npx playwright install chromium`.');
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.svg': 'image/svg+xml' };
function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    let file = path.join(PROJECT, rel);
    if (!file.startsWith(PROJECT)) { res.writeHead(403).end(); return; }
    if (rel === 'engine.js' && !fs.existsSync(file)) file = ENGINE;
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' }).end(data);
    });
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

function ffmpeg(args, stdin = 'ignore') {
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: [stdin, 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  return { p, done };
}

const server = await serve();
const { chromium } = loadPlaywright();
const browser = await chromium.launch({ executablePath: findChrome(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', m => { const s = m.text(); if (!/GPU stall|favicon/.test(s)) console.log('page:', s); });
  page.on('pageerror', e => console.error('PAGE ERROR', e));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction('window.READY !== undefined', null, { timeout: 120000 });
  const ready = await page.evaluate('window.READY');
  if (ready !== true) throw new Error(String(ready));
  const meta = await page.evaluate('window.META()');
  await page.setViewportSize({ width: meta.width, height: meta.height });
  const grab = async t => Buffer.from((await page.evaluate(t => window.frame(t), t)).split(',')[1], 'base64');

  if (mode === 'stills') {
    const dir = path.join(PROJECT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const files = [];
    for (const t of arg.split(',').map(Number)) {
      const f = path.join(dir, `t${t.toFixed(2)}.png`);
      fs.writeFileSync(f, await grab(t));
      files.push(f);
    }
    // contact sheet in the order given (drawtext is often missing from ffmpeg builds, so no labels).
    // Vertical: one row of 360px-wide cells. Landscape: a 3-column grid of 640px-wide cells.
    const inputs = files.flatMap(f => ['-i', f]);
    const land = meta.width > meta.height, cw = land ? 640 : 360, ch = Math.round(cw * meta.height / meta.width / 2) * 2;
    const cells = files.map((f, i) => `[${i}:v]scale=${cw}:${ch},pad=${cw + 4}:${ch + 4}:2:2:white[c${i}]`).join(';');
    const cols = land ? Math.min(3, files.length) : files.length;
    const layout = files.map((_, i) => `${(i % cols) * (cw + 4)}_${Math.floor(i / cols) * (ch + 4)}`).join('|');
    const stack = files.length > 1 ? `${files.map((_, i) => `[c${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=white` : '[c0]null';
    await ffmpeg([...inputs, '-filter_complex', `${cells};${stack}`, '-frames:v', '1', path.join(dir, 'sheet.png')]).done;
    console.log('wrote', path.join(dir, 'sheet.png'), 'cells:', files.map(f => path.basename(f, '.png')).join(' '));
  } else {
    const outFile = path.resolve(arg);
    const audio = path.join(PROJECT, 'audio.wav');
    const hasAudio = fs.existsSync(audio);
    const { p, done } = ffmpeg(['-f', 'image2pipe', '-framerate', String(meta.fps), '-i', '-',
      ...(hasAudio ? ['-i', audio, '-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile], 'pipe');
    const total = Math.round(meta.duration * meta.fps), t0 = Date.now();
    const coverOn = meta.cover !== false && !flags.includes('--no-cover');
    const coverT = typeof meta.cover === 'number' ? meta.cover : (total - 1) / meta.fps;
    const coverPng = path.join(PROJECT, 'cover.png');
    for (let f = 0; f < total; f++) {
      // frame 0 is replaced by the cover frame (one frame, so timing and audio sync are unchanged)
      const png = await grab(f === 0 && coverOn ? coverT : f / meta.fps);
      if (f === 0 && coverOn) fs.writeFileSync(coverPng, png);
      if (!p.stdin.write(png)) await new Promise(r => p.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    p.stdin.end();
    await done;
    console.log('wrote', outFile, hasAudio ? '(with audio.wav)' : '(silent: no audio.wav)');
    const li = flags.indexOf('--lufs'), target = li >= 0 ? flags[li + 1] : '-14';
    if (hasAudio && target !== 'off') {
      // AAC encoding shifts loudness by ~1 dB, so measure the encoded file and correct its audio only.
      const measure = f => { const m = execSync(`ffmpeg -nostats -i "${f}" -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | tail -1`).toString().match(/(-?[\d.]+) LUFS/); return m ? Number(m[1]) : null; };
      const got = measure(outFile), gain = got == null ? 0 : Number(target) - got;
      if (Math.abs(gain) > 0.3) {
        const fixed = outFile.replace(/\.mp4$/, '') + '.lufs.mp4';
        await ffmpeg(['-i', outFile, '-c:v', 'copy', '-af', `volume=${gain.toFixed(2)}dB`, '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', fixed]).done;
        fs.renameSync(fixed, outFile);
      }
      console.log(`loudness ${got} LUFS -> ${got == null ? '?' : (got + gain).toFixed(1)} LUFS (target ${target})`);
    }
    if (flags.includes('--share')) {
      const share = outFile.replace(/\.mp4$/, '') + '-share.mp4';
      await ffmpeg(['-i', outFile, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', share]).done;
      console.log('wrote', share);
    }
    if (coverOn) {
      const jpg = path.join(PROJECT, 'cover.jpg');
      await ffmpeg(['-i', coverPng, '-q:v', '2', jpg]).done;
      fs.rmSync(coverPng, { force: true });
      const outs = [outFile, ...(flags.includes('--share') ? [outFile.replace(/\.mp4$/, '') + '-share.mp4'] : [])];
      for (const f of outs) {
        const tmpOut = f.replace(/\.mp4$/, '') + '.cover.mp4';
        await ffmpeg(['-i', f, '-i', jpg, '-map', '0', '-map', '1', '-c', 'copy', '-c:v:1', 'mjpeg', '-disposition:v:1', 'attached_pic', '-movflags', '+faststart', tmpOut]).done;
        fs.renameSync(tmpOut, f);
      }
      console.log(`cover: frame 0 = t ${coverT.toFixed(2)}s, embedded in ${outs.length} file(s), saved ${jpg}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
