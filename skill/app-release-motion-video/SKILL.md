---
name: app-release-motion-video
description: Make a motion-graphics video for an app or product, one of three kinds: a short vertical release/"what's new" reel (10–20s, TikTok/Reels/Shorts), a landscape 16:9 brand/USP film (30–60s, YouTube, site hero, keynote), or a cinematic promo (30–45s vertical: the real app screen-recorded and played on a phone in a 3D table scene with a keyed camera, film titles, one music bed and physical foley). Covers a coherent story arc, the product's own brand colours, fonts and assets, fal.ai-generated bed music measured to a beat grid, readable pacing, and SFX synced to every hit, rendered frame-perfect to MP4 from a canvas + WebGL composition in headless Chromium. Use when asked for a release video, a motion-graphics promo/reel/explainer, a USP or launch film, a cinematic promo/launch reel/trailer, or to "make a motion video about our app/latest changes". Not for a plain screen recording of the app (use argent-screen-recording) or AI-generated footage.
---

# App motion video

A composition is plain JavaScript: `scene(u, t)` functions draw one frame on a 2D canvas for a given time; the engine
adds post-processing in WebGL; `render.mjs` steps time frame by frame in headless Chromium and pipes PNGs to
ffmpeg. Everything is deterministic (seeded randomness, no timers), so any frame can be re-rendered and inspected.

```
<skill>/
  engine/engine.js        generic engine, served to every project as /engine.js
  scripts/render.mjs      stills + contact sheet, or full video (+ --share encode, loudness correction)
  scripts/fal_music.py    generate bed music on fal.ai (ElevenLabs / Stable Audio / MiniMax) in parallel
  scripts/beat_grid.py    measure a bed: BPM, beat phase, loudness arc, final hit
  scripts/audio_kit.py    score: load a bed, synth music + SFX primitives, mix, loudness-normalise (numpy)
  references/cinematic-promo.md   the cinematic promo subtype: rules, shape, pipeline (read it before starting one)
  template/               story skeleton (hook → reveal → features → CTA) that renders in either format
  examples/fast-tv-landscape/   45s 1920×1080 USP film: brand tokens, house/remote/Mac props, fal bed, SFX score
  examples/last-summer-1.2.0/   15s 1080×1920 release reel: VHS tape-deck device, synth score
  examples/grain-cinematic/     45s 1080×1920 cinematic promo, code only: real app take on a phone, WebGL table, keyed camera, foley score
```

`<skill>` is `~/.agents/skills/app-release-motion-video` (Codex and Claude Code both link here).

Requirements: Node 18+, ffmpeg, Python 3 + numpy, `playwright-core` (any global install is found; else
`npm i -g playwright-core`), a Chromium (Playwright's cache, Chrome, or `CHROME_PATH`), and `FAL_KEY` for music. A cinematic promo also needs
argent with a booted simulator (the take), Pillow, `ELEVENLABS_API_KEY` (foley), and Sume or `FAL_KEY` for the bed.

## Workflow

### 1. Pick the format and length
| Ask | Format (`window.FORMAT`) | Length | Scenes |
|---|---|---|---|
| release / what's new reel, TikTok, Reels, Shorts | 1080×1920 | 10–20 s | 2–3 s each |
| USP / launch / brand film, YouTube, site hero, keynote, "landscape", "1080p" | 1920×1080 | 30–60 s | 4–8 s each |
| cinematic promo / launch reel / trailer, "cinematic", "not generic", X, Reels | 1080×1920 | 30–45 s | one continuous shot |

Set it in the project's `index.html` before `engine.js`: `<script>window.FORMAT = { width: 1920, height: 1080 };</script>`.
The engine exposes `W`, `H` and `LANDSCAPE`; lay everything out relative to them.

**Cinematic promo** is a different way of working, not just a format: the real app is screen-recorded and played
on a phone lying on a table, one keyed camera carries the whole film, and the sound is one music bed plus physical
foley. Steps 2, 3, 5 and 11 below still apply; for everything else read `references/cinematic-promo.md` first and
follow its rules, shape and pipeline, copying technique from `examples/grain-cinematic/`. Its hard limits: the
product is the subject, only UI that exists in the app, no generated video, no shakes or flashes, no chimes, claps,
ticks, risers or whooshes, and no bare cuts between full-frame clips.

### 2. Find the facts
Read the source of truth, not your memory. For a release reel: `git log -n 10 --stat`, release notes
(`fastlane/metadata/*/release_notes.txt`, `whats_new*.json`, CHANGELOG). For a USP film: the landing page copy
(hero, features, privacy, pricing, FAQ), README, store listing. Write down the exact claims, price, limits,
requirements and URLs; every on-screen claim must trace back to one of them. Check project memory for
product decisions (removed features, renamed things) before you script a scene about them.

### 3. Extract the brand and never use the skill's colours
The engine defaults (orange, VCR mono, VHS post) belong to the Last Summer example, not to your product.
- **Colours**: CSS custom properties (`grep -o -- '--[a-z-]*:#[0-9a-f]*' landing/**/styles.css`), Tailwind config,
  app theme files (`colors.ts`, `Color+Brand.swift`, `colors.xml`). Take bg, surface, text, muted and one accent.
  Use them as tokens (`const BG = …, RED = …`) and derive tints with alpha, not new hues.
- **Type**: the product's UI font. System-sans brands use `THEME.sans` with the proportional helpers
  (`ptext`, `riseWords`, `fadeText`, `typedP`). Load a webfont through `COMP.fonts` and put it first in `THEME.sans`.
  Monospace display fonts suit `mono`/`rise`/`typed`.
- **Look**: a clean brand (Apple-like, SaaS) gets `scanlines: 0, wobble: 0, grain ≈ 0.02, shift ≤ 0.6,
  vignette ≈ 0.3`, with no glitch or CRT. Use VHS/glitch only when it's the product's own aesthetic.
- **Assets**: the logo file, real screenshots and real product output (`landing/public/assets`, `store/captures`,
  `fastlane/metadata`). Look at every image before using it. When the UI needs to move (a selection changes,
  a button gets pressed), redraw that screen in canvas to match the capture rather than animating a flat image.

### 4. Write a coherent story
One story, one framing device, one idea per scene. A shape that works for a USP film:

| Beat | Job | Fast TV example |
|---|---|---|
| Hook (≈ 10–15%) | the viewer's situation, in their words | "Your movies live on your Mac." / "Your TV is across the room." |
| Reveal | the product resolves it; brand lands on a downbeat | the signal arcs to the TV, the camera dives into the screen, logo + tagline |
| How it works | 2–3 steps, shown working, not named | Drop. Pair. Play. with the file landing, PIN typed, TV lighting up |
| USPs (2–3) | the differentiators, most important first | nothing uploaded (house holds the signal) · shared playlist (remote) · formats |
| Deal / proof | price, guarantee, social proof | $19.99, "/month" struck out, "Pay once. Keep watching." |
| CTA (≈ 10%) | name, button, URL; hold still to read | logo, "Free download for Mac", myfastv.com typed |

A release reel compresses this: cold open → one scene per change → end card.
- **Framing device**: one visual idea that carries the piece (a signal that travels Mac → TV and later
  runs along the bottom as a progress line; a tape deck whose counter reads REC/REW/FF). Generic slides don't count.
- **Continuity**: link the scenes. Use match cuts (the TV screen becomes the title background) and carry the camera
  across cuts: the camera `cam(x, y, z)` at the end of scene A must equal the start of scene B, or the frame jumps.
  Pushes (`push()`) pair with `COMP.whips` at the cut.

### 5. Pace it so it can be read
- Hold any line for at least **0.4 s per word + 1 s** after it finishes animating in. A 6-word headline needs
  about 3.4 s on screen.
- Use one headline + one support line per scene. Never animate the thing the eye should read while it is
  being read: move the headline in, then let the props move.
- Text sizes at 1080p landscape: headline 72–100 px, support 26–36 px, labels ≥ 20 px. In vertical, about 1.2×
  that. Keep a margin of about 9% of the short side. Fit long lines (shrink to the column) rather than letting them run.
- Stagger: words 70–120 ms, letters 35–45 ms. Exits ease in and finish before the cut; entries ease out.
- Leave the CTA still for the last 1.5–2 s.

### 6. Storyboard on the beat grid
Write a table before any code: time range, scene, the one idea, its motion, its transition out, and its sound.
Cuts go on bar lines (`phase + n · 4 · 60/BPM`); hits go on beats or eighths. 120 BPM (beat 0.5 s, bar 2 s) is
an easy default and the generators hit it exactly.

### 7. Music: generate on fal.ai, measure, then cut to it
```bash
python3 <skill>/scripts/fal_music.py music 46 "<prompt>"          # eleven + stable + minimax in parallel
python3 <skill>/scripts/beat_grid.py music/*.mp3 music/*.wav
```
Prompt with the genre suited to the product, the exact BPM and key, instrumentation, mood, "no vocals", and a
timed structure that mirrors the storyboard ("0–4s sparse intro, kick enters at 4s, full groove from 8s,
breakdown 30–34s, final lift 36s, clean ending chord at 44s"). Request about 1 s more than the film.
Choose the take by: tempo exactly on the grid, an energy arc (dB/s) that matches the story, and a **final hit**
you can put the end card on. Then lock the storyboard to the measured grid: shift with `Score.bed(offset=…)`,
or move cuts. If the bed ends before the film does, `Score.wash(final_hit)` rings its last chord on under the end card.
Model notes: ElevenLabs Music follows BPM and a timed structure best, and tends to resolve a few seconds before
the requested end (plan the end card there). Stable Audio 2.5 is accurate but ambient. MiniMax v2 caps around 35 s.
Without `FAL_KEY`, score with the synth primitives (see the Last Summer `score.py`).

### 8. Build the composition
```bash
cp -R <skill>/template ~/path/to/project/motion && cd ~/path/to/project/motion
```
Fill `BRAND` and `STORY`, set `BPM`/`OFFSET` from beat_grid.py, then replace each scene with a bespoke one
that *demonstrates* the feature. Copy technique from the examples (the Fast TV one for landscape product UI:
Mac window, TV with bezel, remote, house, signal arcs, kinetic type wall).

`COMP` contract (defined in `comp.js`, which loads after `engine.js`):

| field | meaning |
|---|---|
| `duration`, `fps` | seconds, default 30 fps |
| `theme` | `{ bg, text, accent, font, sans }`: `font` for the mono helpers, `sans` family stack for the proportional ones |
| `fonts` | `[[family, url]]` loaded before start |
| `images` | `{ key: url }` → `IMG[key]` (retries on flaky loads) |
| `prepare()` | build offscreen textures once (grades, ASCII grids, prints…) |
| `scenes` | `[[start, fn(u, t)]]`, where `u` is time within the scene and `t` is absolute |
| `overlay(t)` | drawn over every scene (HUD, progress line, captions) |
| `whips` | `[t…]`: horizontal smear of the frame around each push cut |
| `crt` | `{ on: true, off: <start of 0.5s power-off> }` |
| `glitch` | `[[t, amount, width?]]` tape tears + chroma split, and `glitchExtra(t)` for sustained ones |
| `flash` | `[[t, amount, decay]]` white flashes (impacts, reveals) |
| `grain`, `shift` | post grain (0.09) and base chroma shift px (2.5) |
| `scanlines`, `vignette`, `wobble` | 0.07, 0.5, **0** by default. `wobble` is the tape wave (0.0007 for VHS); on clean films people see it as "wavy" |
| `cover` | seconds of the frame used as the cover (default: the last frame, the CTA); `false` turns it off. See step 11 |

Engine helpers (all global): `W`, `H`, `LANDSCAPE`; `E.*` easings (`outExpo`, `inOutExpo`, `outBack(t, s)`, …),
`spring(x, freq, damp)`, `prog(t, a, b)`, `lerp`, `clamp`, `bump`, `decay`, `rng(seed)`, `hash(n)`, `noise1(x, seed)`.
- **Text masks**: `glyphBand(fontStr, baseline, size)` → `{top, bottom}` offsets of the band the font's glyphs
  really occupy (accents and descenders included, plus padding). Size **every** clip that holds text from it; see
  "Never clip glyphs" below.
- **Proportional type**: `ptext(s, x, y, size, {weight, align, color, track, glow})`, `pmeasure`,
  `riseWords(s, x, y, size, u, t0, {stagger, colors})` (words rise out of a mask; `colors` accents single words),
  `fadeText`, `typedP` (typewriter with accent cursor).
- **Mono type**: `mono(s, x, y, size, {per: i => ({dy, alpha, ch, color, rot, sx})})`, `rise`, `typed`,
  `scramble(target, p, seed, t)`, `fitSize`.
- **Camera/motion**: `cam(x, y, z)` world camera, `push(u, len, opts)` horizontal push in/out, `shake(t, hits, amp)`,
  `ring(x, y, u, at)` press feedback.
- **Drawing**: `cover(img, x, y, w, h, zoom, ox, oy)`, `rrect`, `tri`, `star`, `glowBg`, `drawNoise`, `iris(open, u, cx, cy)`,
  `mixColor('RRGGBB', 'RRGGBB', t)`, `mk(w, h)` offscreen canvas, `ctx` (the 2D frame).

### 9. Review with stills: every scene, every cut
```bash
node <skill>/scripts/render.mjs . stills 1.0,3.4,5.9,6.1,9.9,10.1,…
```
Open `stills/sheet.png` (cells in the order given: one row for vertical, a 3-column grid for landscape). Always check:
frames 0.05–0.1 s either side of each cut (jumps in scale, position or background glow), the peak of every
zoom, text against busy imagery, text near the frame edges, and the last frame. Take one still of every headline
*after it has settled* and check its descenders (g, j, p, q, y) and accents are whole; a cut-off tail is the
most common miss. Iterate until each still would work as a poster.

### 10. Score the SFX
Copy the example `score.py` closest to your piece (Fast TV: bed + SFX; Last Summer: full synth) and rewrite the
cue list. Put every sound on the time its visual lands: a whoosh across each camera move and whip, thumps on
landings and slams, clicks per typed character or button press, ticks on counters, chimes on reveals.
`Score(duration)` must equal `COMP.duration` (the mux uses `-shortest`). `s.write('audio.wav', lufs=-14)`.
A cinematic promo takes none of those synth cues: its sounds are generated physical foley, placed the same way
(`references/cinematic-promo.md`, step 8).

### 11. Render and verify
```bash
node <skill>/scripts/render.mjs . video film.mp4 --share     # master crf 14 + film-share.mp4 crf 21, loudness → -14 LUFS
for s in 3.0 7.8 15.6; do ffmpeg -y -loglevel error -ss $s -i film-share.mp4 -frames:v 1 check_$s.png; done
```
Rendering takes about 0.15–0.25 s per frame (about 4 min for 45 s at 1080p). Look at frames pulled from the
*encoded* file.

**Cover (always on).** Social platforms take the first frame as the default thumbnail, so `render.mjs` replaces
frame 0 with the cover frame (`COMP.cover`, default the last frame: the still CTA). It is one frame, so timing and
audio sync don't move; design the hook so its first visible frame is frame 1. The same image is saved as
`<project>/cover.jpg` and embedded in the master and the share encode as MP4 cover art (`attached_pic`), which
Finder, Photos and QuickTime show. Most platforms ignore embedded art, so hand over `cover.jpg` for the custom
thumbnail upload (YouTube, Instagram, TikTok). Verify: `ffmpeg -i film-share.mp4 -frames:v 1 f0.png` is the end
card, and `ffprobe` lists an `mjpeg` stream with `attached_pic=1`. `--no-cover` or `cover: false` turns it off.

Deliver the share encode, the master, `cover.jpg` and the project folder. Say plainly what you verified
(stills, not real-time playback) and that you haven't heard the audio.

## Craft bar

- **Show each feature working rather than naming it.** The file lands in the playlist with a squash; the PIN is
  typed digit by digit; the cloud's line is cut at the roof; the remote's press moves the highlight.
- **Match cuts over fades.** An element from one scene becomes the next (the TV screen becomes the title card;
  the playing TV pulls back into the house).
- **Physical motion.** Springs with overshoot, squash-and-stretch, staggered words, impacts that shake the frame,
  ease-in exits so nothing just disappears.
- **Every beat lands three times:** a visual hit, a post hit (flash, whip or shake) and a sound, all on the same frame.
- **Legibility first.** Text in clear bands or columns, scrims under type on photos, neighbours pushed away during zooms.
- **Never clip glyphs.** Every mask, write-on clip or reveal rect that holds text is sized from `glyphBand()`, never
  from a guessed fraction of the font size: handwritten and display fonts (Noteworthy, script faces) have descenders
  that fall well below `0.3 × size`. A rise animation may start below the mask line, but once settled the whole
  word, tails and accents, sits inside it.
- **Brand-true.** The product's colours, font, logo, real screens and real copy. Nothing from the skill's palette.

## Gotchas

- Serve over http (the renderer does this). `file://` taints canvases, so `getImageData` fails.
- `destination-out` on the main canvas punches holes to black. Cut shapes on an offscreen layer.
- `mono`/`rise`/`typed` assume a monospace `theme.font` (`ADV` is measured once from "0"). Use the `p*` helpers otherwise.
- Balance every `ctx.save()` with a `restore()`; a leaked clip or alpha breaks every later scene.
- Clip rects written as `rect(x, y - 20, w, size * 1.3)` cut the tails off g/j/p/q/y (it happened on the Couples
  Retro film: "Open it together.", "Zero warning."). Use `glyphBand(g.font, g.textBaseline, size)` for the band.
- Writing files with non-ASCII characters (`‑`, `’`, `·`) stores the real character. Later `sed`/Python replaces
  that spell `‑` won't match, so edit by line or with the real character.
- A camera move that drifts through a scene (`z = 1 + 0.012 * u`) has to be continued by the next scene.
- Many ffmpeg builds lack `drawtext`, so the contact sheet has no labels and cells follow the order you passed.
- `swiftshader` WebGL is used for headless rendering. If `window.READY` reports an error, the renderer prints its stack.
