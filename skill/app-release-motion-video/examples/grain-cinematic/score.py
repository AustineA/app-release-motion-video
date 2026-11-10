# Soundtrack of the Grain-first cut with "my life in" and the other templates: one continuous pass of a funk bed made on Sume
# (music/g5/funk.mp3, 125.0 BPM) and foley made on ElevenLabs (sfx_gen.py): fingers on glass, and prints set down
# on a table for the story's photos. Nothing tonal: no chimes, claps, ticks, risers or whooshes. Every cue sits on the
# frame its visual lands in comp.js. 125 BPM: beats on multiples of 0.48 s (B).
import os, sys, subprocess
import numpy as np
sys.path.insert(0, os.path.expanduser('~/.claude/skills/app-release-motion-video/scripts'))
from audio_kit import Score, SR

HERE = os.path.dirname(os.path.abspath(__file__))
B = 0.48
s = Score(93 * B, seed=9)
s.pm = 1
# Trimmed by 0.06 s the bed's beats fall on multiples of B, and its band comes in on beat 32 (15.36): the story
# filling the frame.
s.bed(os.path.join(HERE, 'music/g5/funk.mp3'), gain=0.92, offset=0.06)
ramp = lambda a, b: np.clip((s.t - a) / (b - a), 0, 1)
# the quiet intro up 3 dB; the band a little under the share steps
s.stereo_bed *= (1.4 - 0.4 * ramp(31 * B, 32 * B) - 0.15 * ramp(75 * B, 76 * B))[:, None]
# no final hit: the bar at beat 88 rings on under the end card while the band fades away
s.wash(88 * B, length=0.5, tail=3.0, gain=0.3)
s.stereo_bed *= (1 - ramp(88 * B, 93 * B - 0.1))[:, None] ** 1.5

_cache = {}
def place(name, at, gain=0.5, pan=0.0, rate=1.0, start=0.0, dur=None, decay=None, af=None):
    """Mix sfx/<name>.mp3 into the stereo bed at `at` seconds, its peak brought to 1 first. pan -1 left .. 1 right;
    rate > 1 is shorter and higher (tape-style), for variety when one sound repeats; start and dur cut an excerpt
    (seconds of the file after `rate`), faded at both ends; decay is the time constant of an extra exponential fade;
    af is an ffmpeg filter applied first."""
    key = (name, rate, af)
    if key not in _cache:
        f = ','.join(x for x in [af, None if rate == 1.0 else f'asetrate={int(SR * rate)},aresample={SR}'] if x)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'sfx', name + '.mp3'), *(['-af', f] if f else []),
                              '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        _cache[key] = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(float)
    x = _cache[key][int(start * SR):]
    if dur is not None: x = x[:int(dur * SR)]
    k = np.arange(len(x)) / SR
    x = x * (np.clip(k / 0.004, 0, 1) * np.clip((k[-1] - k) / 0.03, 0, 1) * (np.exp(-k / decay) if decay else 1))[:, None]
    x = x / (np.max(np.abs(x)) + 1e-9)
    i0 = int(at * SR); m = min(len(x), s.n - i0)
    if m <= 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s.stereo_bed[i0:i0 + m, 0] += x[:m, 0] * gain * l * 1.414
    s.stereo_bed[i0:i0 + m, 1] += x[:m, 1] * gain * r * 1.414

def touch(at, gain=0.5, pan=0.0, rate=1.0):
    """A fingertip on the glass: pad_2's dull thud (its rumble under 110 Hz removed) and the lightest papery edge."""
    place('pad_2', at, gain, pan, rate, dur=0.12, af='highpass=f=110')
    place('stack_1', at - 0.045 / (rate * 1.5), gain * 0.2, pan, rate * 1.5, dur=0.1)

def click(at, gain=0.5, pan=0.0):
    """A mouse button, down and up."""
    place('mouse_2', at, gain, pan, dur=0.12)
    place('mouse_1', at + 0.09, gain * 0.5, pan, start=0.09, dur=0.08)

def slide(at, gain=0.2, pan=0.0, rate=1.0, dur=0.42):
    """A fingertip dragged over the glass."""
    place('fingerslide_1', at, gain, pan, rate, dur=dur)

# 1. THE GALLERY: two drags down the Dumps, the "my life in" card
slide(9 * B, 0.2, 0.1, 1.0, 0.45)
slide(11 * B, 0.2, 0.1, 0.94, 0.45)
touch(13 * B, 0.55, -0.35)

# 2. THE PHOTOS: "+", twelve photos two a beat (each panned to its column in the picker), Done, play
touch(17 * B, 0.5, -0.6)
COLS = [0.166, 0.5, 0.835, 0.835, 0.5, 0.166, 0.166, 0.5, 0.835, 0.835, 0.5, 0.166]
for k, cx in enumerate(COLS):
    touch((19 + k / 2) * B, 0.4 if k % 2 else 0.46, (cx - 0.5) * 1.5, rate=[1.0, 1.07, 0.95, 1.04, 0.98, 1.09][k % 6])
touch(25.5 * B, 0.55, 0.6)
touch(30 * B - 0.2, 0.5, 0.0)

# 3. THE STORY: full frame on the band's first bar; a print set down on every beat, loud enough over the band
for k in range(9):
    place(['printland_1', 'printland_2', 'stack_2'][k % 3], (32 + k) * B - 0.02, 0.62, [-0.3, 0.25, -0.1, 0.3, -0.25, 0.1, -0.3, 0.2, 0.0][k],
          rate=[1.0, 1.06, 0.96][k % 3], dur=0.3)

# 4. THE OTHER TEMPLATES: a finger's swipe brings each one in and a print is set down as it lands (beat 40's is the
# story's last); lighter prints as Minimize's and Taskbar's windows go. The pull-back into the wall of all of them
# lands on a print too, a finger sets the wall scrolling, and a swipe brings the story back.
for k, beat in enumerate([40, 46, 52, 58, 72]):
    slide(beat * B - 0.36, 0.22, [0.3, -0.3, 0.3, -0.3, 0.3][k], [1.0, 1.05, 0.96, 1.02, 1.0][k], 0.36)
for k, (beat, gain) in enumerate([(41, 0.34), (43, 0.34), (45, 0.34), (46, 0.62), (47, 0.34), (49, 0.34), (51, 0.34), (52, 0.62), (58, 0.62), (64, 0.62), (72, 0.62)]):
    place(['printland_2', 'stack_2', 'printland_1'][k % 3], beat * B - 0.02 + (0.05 if gain < 0.5 else 0), gain,
          [0.25, -0.2, 0.2, -0.3, 0.2, -0.25, 0.25, 0.3, -0.25, 0.0, 0.0][k], rate=[1.06, 0.96, 1.0][k % 3], dur=0.3)
slide(64 * B + 0.1, 0.24, 0.0, 0.9, 0.6)

# 5. SHARE: Share, Instagram
touch(76 * B, 0.6, 0.55)
touch(80 * B, 0.6, -0.3)

OUT = os.path.join(HERE, 'audio.wav')
s.write(OUT, music_gain=0.9, lufs=-14)
# the prints and the solo piano peak above full scale at -14 LUFS: hold the peaks at -2 dBFS
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', OUT, '-af', 'alimiter=limit=0.8:attack=2:release=60:level=false', '-c:a', 'pcm_s24le', OUT + '.tmp.wav'], check=True)
os.replace(OUT + '.tmp.wav', OUT)
