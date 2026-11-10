# Cinematic promo

A 30–45 s vertical film (1080×1920) that looks shot, not animated: the real app, running on a phone that lies on a
table, filmed by one camera that never cuts away. The camera pushes in, falls into the phone's screen until the
product's output fills the frame, comes back out, and glides off onto the bare table for the name. Use it when the
ask says cinematic, promo, launch reel or trailer, or when a motion-graphics cut has been called generic, slop or
incoherent.

It differs from the other two formats in four ways: the footage is a screen recording of the real app (not screens
redrawn in canvas), the scene is a small 3D set with a keyed camera (not 2D scenes with `cam()`), the type belongs
to the film and never touches the screen, and the sound is one music bed plus physical foley (no synth hits).

Worked example, code only: `examples/grain-cinematic/` (Grain, 44.64 s, 125 BPM). Every number below comes from it.

## The rules

Each of these is a cut that was made and rejected. Don't relearn them.

1. **The film is about the product.** Name the app and its job in the first 3 s, open on the app's own home screen,
   leave the cover as the product's end card. A feature, template or theme is only an example of what the product
   makes. (A cut that opened with 8 s of a macOS-styled template and titled itself after it: "we're making a promo
   for Grain, not macOS".)
2. **Only UI that exists in the app.** Everything on the phone is the recording. The film adds a table, a camera,
   titles and cuts, and no interface: no drawn dialogs, cursors, progress bars, notifications or overlays that could
   be taken for the app's. (A cut with its own retro dialogs and pointer: "UI elements that's not in the app. So
   that's a fail.")
3. **The story is the product's core job, done start to finish.** Open the app, pick, add, let it work, share. Show
   how easy it is; eye candy alone "missed the whole point of the app".
4. **No generated video and no fake UGC.** AI clips of people or "living moments" read as AI at once. Real app
   footage, the app's own renders, and drawn props only.
5. **One continuous shot.** No camera shake, flash, whip, glitch or CRT. Motion comes from the camera path and from
   what the app does. Set `scanlines: 0, wobble: 0`, light grain, and leave `whips`, `flash` and `glitch` out.
6. **Film type only.** The brand's sans, sentence case, on the table above the phone, never on the screen. All-caps
   condensed display type reads as a stock reel.
7. **One bed, never spliced.** One continuous pass of one track, trimmed at the start so its arrangement meets the
   film. A new idea gets a newly generated bed; a bed the user approved stays when they ask for a variant.
8. **Physical foley only.** Sounds a hand, paper, glass or the device would make. No chime, clap, tick, riser,
   shimmer, whoosh, boom or end hit: the user hears those as "generic like Claude default sounds" and "AI slop".
9. **Showcase clips get time and a transition.** About 3 s each (6 beats at 125 BPM), played at no more than about
   1.7× the app's speed, and every change between two full-frame shots is a motion transition that lands on the
   beat. Sub-second cuts read as rushed ("a bit too fast"); a bare cut between unrelated full-frame clips reads as
   cheap ("deep cut without transition sucks").
10. **A redo is a new idea.** Swapping one element on a rejected skeleton reads as the same video. A change the
    user asked for on an approved cut is the opposite: change only that, keep everything else frame for frame.
11. **Never overwrite a delivered cut.** Each version lives in its own sibling folder (`reel/<name>/` with its own
    `comp.js`, `score.py`, `audio.wav`, outputs) with symlinks to the shared `clips fonts img music sfx`, and new
    sequences get new names in `img/`.

## Shape

The approved structure, in beats (B = 0.48 s at 125 BPM; 93 beats). Scale the beat counts, keep the order.

| Beats | Section | On screen | Title (on the table) |
|---|---|---|---|
| 0–9 | Name it | camera pushes in from further off to the phone showing the app's home | "This is Grain." / "Your photo dump, done in a minute." |
| 9–17 | Pick | two drags down the list, a tap on one item | "Pick a template." |
| 17–30 | Do the job | "+", twelve photos two a beat, Done | "Add your photos." / "Grain does the rest." |
| 30–32 | Dive | play is touched; the camera falls into the preview | none |
| 32–40 | The output | the story full frame as the band enters, something landing on every beat | none |
| 40–64 | Range | four more outputs full frame, 6 beats each, swiped in | none |
| 64–72 | All of it | pull back out of the last one into a wall of every output, which scrolls | "60+ animated templates." |
| 72–83 | Share | swipe back to the story, pull out to the phone; Share, Instagram | "Straight to Instagram." |
| 83–93 | End card | the camera glides off the phone onto bare table; icon, name, line, store pill; still for the last 2 s | the card itself |

Short version (31.68 s, 66 beats): drop Range and All of it, hold the output for 8 beats, and say the range in a
title over the pull-out. Keep any one output full frame under 4 s unless it is the hero.

Every claim in a title ("60+", "in a minute") must be true in the repo (count the templates, time the flow).

## Pipeline

Steps 2 and 3 of SKILL.md (facts, brand) come first and apply unchanged. Send the user a one-line status at each
step below; long silent stretches annoy them.

### 1. Music first, then the grid

Generate two or three takes, measure them, pick one, and only then write the beat table.

- With Sume connected (`generate_audio`, model `sume/music-1.0`, about $0.08 a take; quote dollars, check
  `dry_run` first): a genre with a human feel (funk, soul, bossa, piano pop) suits a product film better than a
  trailer score. Prompt the exact BPM, instruments, "no vocals", and a timed structure: sparse intro for the setup,
  full band at the second the output goes full frame, an ending that can fade. Otherwise use `fal_music.py`.
- `python3 <skill>/scripts/beat_grid.py music/*.mp3` gives BPM, beat phase and the loudness arc. Take the one whose
  tempo is exact and whose band comes in on a bar line. Put that bar on the dive: in the example `offset=0.06`
  trims the bed so the band enters on beat 32 = 15.36 s as the story fills the frame.
- End on a fade under the end card with `s.wash()` ringing the last bar on. No final hit.

### 2. Beat table

One table of named times, all multiples of the beat, shared by the film and the score:

```js
const B = 0.48;
const T = { drags: [9 * B, 11 * B], tile: 13 * B, add: 17 * B, picks: Array.from({ length: 12 }, (_, i) => (19 + i / 2) * B), done: 25.5 * B,
            playTap: 30 * B - 0.2, story: 30 * B, full: 32 * B, show: 40 * B, out: 72 * B, share: 76 * B, insta: 80 * B, off: 83 * B, card: 86 * B, dur: 93 * B };
```

Every touch sits on a beat or a half beat; section changes sit on bar lines (4 beats). A title must be gone before
the camera moves through where it sits.

### 3. Record one take of the real app

Use the booted simulator and argent (`argent-device-interact`, `argent-screen-recording`): `launch-app`, start the
recording, walk the whole flow with `gesture-tap` / `gesture-swipe` at an unhurried pace, stop the recording, copy
the file to `clips/`. Prepare first: demo photos in the simulator's library (`xcrun simctl addmedia`), onboarding
and paywalls skipped through the app's launch arguments, the content the film needs already in place.

What the take will contain, and what to do about it:
- The recorder's watermark in the bottom-left corner. Remove it in the extract step (`clean()` un-blends a mark
  measured over black) and, where a symmetric sheet covers the corner, mirror the sheet's right corner over it
  (`patchCorner`). Check stills of every sheet.
- The recorder stalls while content scrolls (it repeats a frame, then jumps). Rebuild each drag: find the frames in
  which the list moved and by how much (`shift()`), then write one frame per film frame along an ease-out, filling
  gaps by sliding the nearest recorded frame (`home()` and `slid()` in `extract_take.py`).
- Its own grey touch circle. Draw the film's touch dot over it at the same place (`TOUCHES`, `touchAt`).
- App latency: a sheet rises about 0.3 s after its touch, a badge appears 0.27 s after a pick, placeholders show
  for 0.25 s. Find the frame the app reacts in for every touch and anchor on that frame, not on wall-clock tap
  times.
- Two takes made at different times disagree on the status bar clock. Prefer one take; when joining two, paste the
  first take's clock onto the second.

### 4. Cut the take into frame sequences

`extract_take.py` decodes stretches of the take with ffmpeg at 30 fps and writes JPEG sequences
(`img/<name>/0000.jpg`, 920×2000 for the phone screen, `-q:v 3`): one per stretch of the flow (home, editor, picker,
resume, share). Waits with nothing happening are dropped or written at every 6th frame (rendering progress).
Pull a contact sheet of each sequence and note the index of every touch-down frame.

`extract_story.py` crops the product's output out of the take (the editor's preview, inside its rounded corners)
at 1080×1920 and retimes it with anchors `(film time, take time)` so that an arrival lands on each beat; frames are
blended when sped up and left untouched at the app's own speed. Squeezing pauses is fine; say at hand-over that
the story plays faster than the app plays it.

### 5. Render the product's other outputs

If the app has a deterministic renderer (Grain's `DebugRenders`, driven by `grab.sh`), render showcase clips with
it at full film resolution rather than recording them: `grab.sh <template> <outdir> <step> <scale> [from] [to]`
with `scale 3` = 1080×1920 and `step` = speed ÷ 30, so the sequence plays one frame per film frame at that speed
(1.25× → 0.04167). Start `from` early enough that the clip's own events land on beats, counting the transition in
(a clip is on screen from the start of its swipe). Without such a renderer, record each output and crop it as in
step 4.

A "wall of everything" shot: render every item's settled cover, lay them out in a grid (`wall.py`: 5 columns,
rounded tiles, no two of a category adjacent), and bake the scroll into frames with sub-frame motion blur
(8 samples over a half-open shutter). Start the scroll from rest when a move lands on the wall.

### 6. The composition

One scene, `scenes: [[0, film]]`. Parts of `comp.js`, in order:

- **Sequences on demand.** Thousands of JPEGs can't go through `COMP.images`. Wrap `window.frame` (which
  `render.mjs` awaits) to fetch exactly the frames this film frame needs, with a small cache:
  ```js
  const engineFrame = window.frame;
  window.frame = async t => {
    const f = framesAt(t), want = [f.app, f.app2, f.play, f.full, f.next, f.icon].filter(Boolean);
    await Promise.all(want.map(fetchFrame));
    while (SEQ.order.length > 60) { const k = SEQ.order.shift(); if (want.includes(k)) SEQ.order.push(k); else SEQ.cache.delete(k); }
    return engineFrame(t);
  };
  ```
- **Film time → take frame.** `framesAt(t)` is the single place that decides what every layer shows.
  `fr(t, t0, i0, rate) = i0 + (t - t0) * 30 * rate` plays a sequence from frame `i0` at film time `t0`; key tables
  (`DEMO`, `PICK_IDX`, `TASK`: `[film frames after the touch, sequence frame]`) pin each touch-down frame to its
  beat, run waits fast and hold frames where nothing moves. Compare times with an `EPS` of half a frame so a
  branch never flips between two renders of the same frame.
- **The set.** A WebGL2 renderer inside `comp.js`, composited onto the engine's 2D `ctx`: world units are
  centimetres, the phone lies at the origin on a dark table (a tiling texture), with a body, glass, soft shadow and
  an emissive screen quad. The screen is a 920×2000 canvas (`drawScreen`) uploaded as a texture each frame, and the
  table is lit by the screen's own average colour, which is what makes it look shot. Depth of field is a
  golden-angle spiral blur driven by a per-key aperture.
- **The camera.** Keys of `[time, target x y z, distance, pitch, yaw, aperture]`, interpolated per channel by a
  monotone cubic (Fritsch–Carlson `pchip`, distance in log space), so the path never overshoots and rests wherever
  two neighbouring keys agree. The moves: in from further off and lower to the phone, low in frame with the table
  above it left for titles; a slow drift while the app is used; the fall into the preview, ending exactly at
  `FILL = previewHeight / (2 · tan(FOV / 2))` with pitch, yaw and aperture 0, so the 3D preview and the full-frame
  sequence coincide and a 0.1 s hand-off is invisible; back out; off the phone to bare table, out of focus, for
  the end card.
- **Titles.** `TITLES = [[in, out, line, under]]`: weight 700 at 96 px shrunk to a 900 px column, a 500-weight
  46 px line under it, each rising 18 px while fading in over 0.45 s and fading out over 0.3 s, with a soft shadow.
  Hold for 0.4 s per word + 1 s.
- **End card.** On the bare table: app icon, name (800 weight), the one-line promise, a light pill reading "On the
  App Store". Parts fade up in turn over about a second, then nothing moves. It is also the cover (frame 0).
- **Cuts between full-frame shots.** A swipe (0.75 beat, ending on the beat): the next shot comes in from the
  right, both scaled back 7% with rounded corners while they move, `E.inOutCubic`. A pull-back (1.25 beats,
  exponential zoom): the live clip shrinks into its own tile of the wall; bake that tile from the clip's last
  frame so there is no seam. Both go through `shutter(n, draw)`, which averages 10–16 drawings spread over half a
  frame's time: motion blur is what stops a fast move from strobing.

`COMP` for this look: `grain: 0.04, shift: 0.5, scanlines: 0, vignette: 0.42, wobble: 0`.

### 7. Stills

`node <skill>/scripts/render.mjs . stills <t,…>` for: every title once settled, every touch (the dot on its
target, the app reacting), three or four frames inside every transition and one either side of it, the two frames
around the hand-off into and out of the screen, every sheet's bottom-left corner, and the end card. Fix what you
see before rendering the film.

### 8. Sound

Generate foley with `sfx_gen.py` (ElevenLabs `POST /v1/sound-generation`, two takes each, 0.5 s minimum; the key
comes from `ELEVENLABS_API_KEY` and is never printed or written to a file). Prompts that work name one physical
event, the microphone and the room, and what must not be there: "A fingertip pad gently touching a glass phone
screen once: a very soft dull muted thud, close microphone, dry, no click, no beep, no tone". You can't hear
them, so check each take's length, peak and envelope (one clean event, no tail of noise, nothing tonal) and keep
the usable take numbers in a comment.

Pick one family of sounds that belongs to the product's world and use it throughout (Grain: fingertips on glass,
photo prints set down on a table). In `score.py`:
- `place(name, at, gain, pan, rate, start, dur, decay, af)` mixes one sound at the time its visual lands;
  `touch()` for each tap (panned to where the finger is), `slide()` under each drag and swipe, a print set down
  for each arrival in the output and on each landing of a transition, lighter ones for smaller events.
- Vary `rate` (0.94–1.09) and pan when one sound repeats, so it never machine-guns.
- Bed levels: the quiet intro up about 3 dB, the band slightly down under the share steps.
- `s.write(OUT, lufs=-14)`, then an ffmpeg `alimiter=limit=0.8` pass: the mix peaks above full scale otherwise.
- `Score(T.dur)` must equal `COMP.duration`.

### 9. Render, verify, deliver

```bash
node <skill>/scripts/render.mjs . video <name>.mp4 --share      # in the background: about 0.37 s per frame for this scene
ffmpeg -i <name>.mp4 -c:v libx264 -preset slow -crf 23.5 -c:a aac -b:a 192k -movflags +faststart <name>-send.mp4
```

The share encode of a film this detailed is about 40 MB; make the send copy when the chat's file limit is 30 MB.
Verify on the encoded file: resolution, frame count and duration, integrated loudness and peak, frame 0 is the end
card, and a sheet of frames pulled at about 20 times across the film. Send the video in the conversation
(SendUserFile where available), with two or three lines: what it is, what was verified (frames, not real-time
playback; the audio was not heard), and any known flaw left in. Then record the user's reaction in project memory,
in their words, with what it means for the next cut.

## Gotchas

- Emoji render monochrome in headless Chromium; keep them out of anything drawn.
- A dissolve between two different photos reads as a double exposure. Cut on a frame where the app itself changes.
- Measure layout (the preview's rect, a tile's rect) on the full-resolution frame the film uses, not on a reduced one.
- A greyed-out button or placeholder in the take may be the app's real state (a disabled row while rendering).
  Check the app before patching it out.
- An app missing on the simulator (Instagram) makes the real app show a warning row after sharing. End the shot
  before it appears rather than painting over it.
- `preserveDrawingBuffer: true` on the WebGL2 context, or the 2D composite reads an empty buffer.
- Don't `rm` sequence folders through shell variables; write new sequences to new folder names.
