# Soundtrack for the Last Summer 1.2.0 piece. Times match the visual hits in comp.js.
import os, sys
sys.path.insert(0, os.path.expanduser('~/.agents/skills/app-release-motion-video/scripts'))
import numpy as np
from audio_kit import Score

s = Score(15.0)
chords = [(1.5, 3.5, [53, 57, 60, 64]), (3.5, 5.5, [52, 55, 59, 62]), (5.5, 7.5, [50, 53, 57, 60]),
          (7.5, 9.5, [48, 52, 55, 59]), (9.5, 11.5, [53, 57, 60, 64]), (11.5, 12.35, [55, 59, 62, 64])]
s.pitch_wobble(4.5, 5.85)                         # music sags while the tape rewinds
s.pad(chords + [(12.5, 14.55, [48, 55, 59, 62, 64])])
s.bass(chords)
s.drums(1.5, 12.3, bpm=120)

s.static(0.1); s.thump(0.02, gain=0.6, low=60)    # power on
for i in range(10): s.tick(0.42 + i * 0.045)      # title types in
s.pop(1.25)                                       # version pill
s.click(1.82)                                     # photo/video switch
s.whoosh(2.25, 2.7)                               # knob opens into the shot
s.thump(3.12)                                     # PLAY stamp
s.squeal(4.5, 5.85); s.whoosh(4.5, 4.85, gain=0.3, lo=300, hi=4000)
s.blip(5.05, 1320, gain=0.07, length=0.12); s.blip(6.12, 1320, gain=0.07, length=0.12)  # roll counter
r = np.random.default_rng(3)
for at in np.arange(5.85, 6.7, 0.035): s.blip(at, r.choice([660, 880, 990, 1320, 1760]), gain=0.05)  # ascii resolve
s.shutter(7.47)
for k in range(9): s.tick(7.7 + k * 0.07, gain=0.25)  # prints land
s.whoosh(8.95, 9.8, gain=0.2, lo=300, hi=2500)        # zoom
for at, f in ((9.85, 2637), (10.02, 3136), (10.2, 3951)): s.chime(at, f)  # gold specks
s.motor(10.5, 11.95)
s.shutter(11.93, 0.8); s.shutter(12.3, 1.2)            # CLICK. + iris closes
s.whoosh(12.52, 13.0, gain=0.25, lo=500, hi=5000)      # iris opens
for i in range(15): s.chime(12.97 + i * 0.028, 1200 + i * 60, gain=0.06, length=0.03)  # rolls pop up
s.chime(13.4, 1568, length=0.9); s.chime(13.55, 2093, length=0.9)
s.zap(14.5)
s.write(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio.wav'), end_cut=14.95)
