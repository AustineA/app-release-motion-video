# Fast TV 45 s film soundtrack: a fal.ai ElevenLabs Music bed + synthesized SFX on every visual hit.
# Bed: scripts/fal_music.py (prompt below), measured with beat_grid.py → 120.0 BPM, beat 1 at 0.000 s,
# final hit at 40.00 s. So cuts sit on whole even seconds and the end card starts at 40.
#   "Instrumental bed for a premium Mac app launch film. Modern cinematic electronic, 120 BPM, 4/4, key of
#    D minor moving to F major. Warm analog synth arpeggio pulse, deep clean sub bass, crisp tight minimal
#    drums with soft claps, airy wide pads, subtle glassy plucks. Confident, warm, optimistic, sleek,
#    Apple-keynote feel. Structure: 0-4s sparse intro of pad and pulse, kick enters at 4s, full groove from
#    8s, small lift at 20s, gentle breakdown at 30-34s, big final lift at 36s, resolves to a clean ending
#    chord at 44s then silence. No vocals."   (46 s requested; it resolved at 40 s, which fit the story)
import os, sys
sys.path.insert(0, os.path.expanduser('~/.agents/skills/app-release-motion-video/scripts'))
from audio_kit import Score

HERE = os.path.dirname(os.path.abspath(__file__))
s = Score(45.0, seed=11)
s.pm = 1                                    # no tape wow: clean brand film
s.bed(os.path.join(HERE, 'music/eleven.mp3'), gain=0.9)
s.wash(40.0)                                # the bed stops at 40 s; ring its final chord under the end card

# ---------- sfx (times are absolute seconds; each matches a visual in comp.js)
S1, S2, S3, S4, S5, S6, S7, S8 = 0, 6, 10, 18, 24, 30, 36, 40
pent = [880, 988, 1175, 1319, 1480, 1760]
s.whoosh(S1 + 0.1, S1 + 1.1, gain=0.05, lo=200, hi=1200)               # laptop draws on
for i in range(6): s.pop(S1 + 1.0 + i * 0.12 + 0.08, pent[i], 0.05)    # thumbnails pop in
s.whoosh(S1 + 2.5, S1 + 3.8, gain=0.09, lo=300, hi=2000)               # camera pans to the TV
s.thump(S1 + 3.8, 0.25, low=60)                                        # TV solidifies
s.pop(S1 + 5.0, 660, 0.07)                                             # "?"
s.whoosh(S2 + 0.0, S2 + 0.5, gain=0.2, lo=800, hi=6000)                # signal fires
s.thump(S2 + 0.5, 0.75, low=55); s.chime(S2 + 0.5, 1760, 0.05, 1.2)    # signal hits the TV
s.whoosh(S2 + 0.75, S2 + 1.65, gain=0.22, lo=200, hi=4000)             # dive into the screen
s.chime(S2 + 1.2, 1319, 0.05, 1.6); s.chime(S2 + 1.55, 1760, 0.04, 1.6)  # logo + title
for c in [10, 18, 24, 30, 36]: s.whoosh(c - 0.22, c + 0.25, gain=0.2, lo=500, hi=5000)  # whip pushes
for i, l in enumerate([11.5, 11.75, 12.0]):                            # files fly in and land
    s.whoosh(l - 0.7, l, gain=0.06, lo=600, hi=3500); s.thump(l, 0.35, low=95); s.pop(l, pent[i + 1], 0.04)
for k in range(15): s.tick(12.55 + k * 0.04, 0.12)                     # TV code scrambles
s.pop(13.15, 1175, 0.06)
s.whoosh(13.1, 13.45, gain=0.06, lo=800, hi=4000)                      # PIN sheet springs up
for i in range(6): s.click(13.55 + i * 0.12, 0.35)                     # code typed on the Mac
s.chime(14.3, 1319, 0.06, 0.5); s.chime(14.38, 1760, 0.05, 0.6)        # paired
s.click(14.95, 0.8)                                                    # Play on TV
s.whoosh(14.95, 15.3, gain=0.18, lo=900, hi=6000)                      # signal to the TV
s.thump(15.28, 0.7, low=55); s.chime(15.28, 1480, 0.04, 1.0)           # TV lights up
s.whoosh(18.2, 19.3, gain=0.06, lo=200, hi=1500)                       # house draws
s.pop(19.5, 520, 0.08)                                                 # cloud appears
for k in range(9): s.tick(19.9 + k * 0.095, 0.08)                      # dashed line reaches
s.zap(20.8, 0.12, 0.25); s.thump(20.8, 0.6, low=50); s.shutter(20.8, 0.5)  # cut off at the roof
for i, a in enumerate([21.15, 21.4, 21.65]): s.pop(a + 0.06, pent[i + 2], 0.06)  # chips
for a in [25.5, 26.0]: s.click(a, 0.7); s.blip(a + 0.03, 1320, 0.025)  # remote: down, down
s.click(27.0, 0.8); s.whoosh(27.05, 27.5, gain=0.12, lo=700, hi=5000)  # OK → wipe to Blue Hour
for a in [30.25, 30.75, 31.25, 31.75, 32.25, 32.75]: s.thump(a, 0.75, low=50); s.shutter(a, 0.35)  # format slams
s.whoosh(33.1, 33.75, gain=0.16, lo=300, hi=4000)                      # words collapse into the TV
s.pop(33.5, 880, 0.07)
for k in range(29): s.tick(34.05 + k * 0.035, 0.05)                    # subtitle typed
s.pop(33.9, 1319, 0.05)                                                # CC badge
for k in range(18): s.tick(36.25 + 0.9 * (k / 18) ** 0.6, 0.1)         # price counts up
s.chime(37.15, 1760, 0.05, 0.6)
s.pop(37.2, 440, 0.06)                                                 # "/month" arrives
s.shutter(37.6, 0.6); s.zap(37.6, 0.08, 0.2)                           # struck through
s.whoosh(38.0, 38.6, gain=0.08, lo=200, hi=1200)                       # falls away
s.chime(40.05, 1760, 0.05, 2.5); s.chime(40.35, 2637, 0.03, 2.5)       # end card logo shimmer
s.pop(41.25, 880, 0.07)                                                # download pill
for k in range(11): s.click(41.75 + k * 0.055, 0.25)                   # myfastv.com typed

s.write(os.path.join(HERE, 'audio.wav'), music_gain=0.9, lufs=-14)
