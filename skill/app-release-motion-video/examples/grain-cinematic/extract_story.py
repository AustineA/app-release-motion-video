# Cuts the story of the "my life in" cut: the editor's preview in clips/mli_take3.mp4 (the take the rest of the screen
# comes from, img/mli_*, cut by extract_take.py), retimed so every photo lands on a beat, as img/gfm_play
# (1080×1920, frame 0 = comp.js's T.story).
# In the take the story resumes at 47.6 s (4.4 s into its 23.2) and a photo flies in about every 1.8 s. Here the first
# arrival runs at the app's own speed and lands on beat 32; the next eight land a beat apart (each flight in 0.4 s, the
# hold before it in 0.08 s); the last photo joins the grid at the app's speed; and the finished grid drifts on, slowed,
# until Share. The story loops at 66.33 s; the cut stops short of it.
import os, subprocess
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
CLIP = os.path.join(HERE, 'clips/mli_take3.mp4')
B = 0.48
CROP = (160, 379, 998, 1774)                                       # the preview, inside its rounded corners
FLIGHTS = [(49.53, 50.47), (51.33, 52.13), (53.17, 54.0), (54.93, 55.83), (56.67, 57.6), (58.53, 59.4), (60.33, 61.2), (62.1, 62.97)]
# Anchors (film, take), in seconds.
PLAY = [(30 * B, 47.6), (32 * B, 48.56)]
for k, (a, b) in enumerate(FLIGHTS): PLAY += [((32 + k) * B + 0.08, a), ((33 + k) * B, b)]
PLAY += [(40 * B + 0.08, 63.9), (40 * B + 0.78, 64.6), (47 * B, 66.27)]

def frames(t0, t1):
    """The preview in the take's frames from t0 to t1 at 30 fps, as (index, rgb array)."""
    x, y, w, h = CROP
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(t1 - t0), '-i', CLIP, '-vf', f'fps=30,crop={w}:{h}:{x}:{y}',
                            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    i = 0
    while True:
        raw = dec.stdout.read(w * h * 3)
        if len(raw) < w * h * 3: break
        yield i, np.frombuffer(raw, np.uint8).reshape(h, w, 3)
        i += 1
    dec.wait()

def play():
    fa = np.array([p[0] for p in PLAY]); sa = np.array([p[1] for p in PLAY]); T0 = sa[0]
    out = os.path.join(HERE, 'img', 'gfm_play'); os.makedirs(out, exist_ok=True)
    for f in os.listdir(out): os.remove(os.path.join(out, f))
    _, _, w, h = CROP
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-',
                            '-vf', 'scale=1080:1920:flags=lanczos', '-q:v', '3', '-start_number', '0', os.path.join(out, '%04d.jpg')], stdin=subprocess.PIPE)
    n = round((fa[-1] - fa[0]) * 30) + 1
    src = frames(T0, sa[-1] + 0.2); buf = {}
    for j in range(n):
        t = fa[0] + j / 30; pos = (np.interp(t, fa, sa) - T0) * 30                # in take frames
        slow = t > fa[-2] + 1e-6                                                  # the grid, slowed: neighbouring frames blended
        k0 = int(np.floor(pos)) if slow else int(round(pos)); k1 = k0 + 1 if slow else k0
        while max(buf, default=-1) < k1:
            i, f = next(src); buf[i] = f
        for k in [k for k in buf if k < k0]: del buf[k]
        u = pos - k0
        frame = buf[k0] if k0 == k1 or u < 1e-3 else (buf[k0].astype(np.float32) * (1 - u) + buf[k1].astype(np.float32) * u).astype(np.uint8)
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
    enc.stdin.close(); enc.wait(); print('gfm_play', n, 'frames')

play()
