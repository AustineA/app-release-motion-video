# Grain cinematic promo (code only)

The approved 44.64 s, 1080×1920 launch film for Grain, an iOS app that makes monthly photo dump stories. It is the
worked example for `references/cinematic-promo.md`. The media is not here (2.3 GB of frame sequences, the take, the
bed, the foley, the fonts), so this folder does not render as it stands; read it and copy technique from it. The
full project is in the Grain repo at `appstore/creative/reel/grainfirst-mli-60-flow`.

| File | What it is |
|---|---|
| `comp.js` | the film: beat table `T`, frame-sequence loader, film time → take frame maps, the WebGL2 table and phone, the keyed camera, the screen canvas and touch dot, titles, end card, swipe and pull-back cuts with motion blur |
| `index.html` | the project page (`window.FORMAT` 1080×1920) |
| `extract_take.py` | cuts the screen recording into the JPEG sequences the phone screen plays; rebuilds the list drags the recorder stalled on; removes the recorder's watermark |
| `extract_story.py` | the story inside the editor's preview, cropped and retimed so a photo lands on every beat |
| `grab.sh` | drives the app's own debug renderer on the simulator for the full-frame templates (`step` = playback speed ÷ 30) |
| `wall.py` | lays every template's cover out as a wall and bakes its scroll, with motion blur, into frames |
| `sfx_gen.py` | generates the foley on ElevenLabs sound effects, two takes each (key from `ELEVENLABS_API_KEY`, never printed) |
| `score.py` | the soundtrack: one pass of the bed, foley placed on the frame each visual lands on, limiter at −2 dBFS |

Folders the scripts expect beside them in a real project: `clips/` (the takes), `img/` (sequences, `icon.png`,
`table.jpg`), `music/`, `sfx/`, `fonts/`.
