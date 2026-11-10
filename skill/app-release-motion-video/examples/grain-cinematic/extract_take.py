# Cuts clips/mli_take3.mp4 (one take of the whole "my life in" flow on the iPhone 18 Pro Max simulator) into the
# JPEG sequences comp.js plays on the phone screen (img/mli_*), and takes the recorder's watermark out of the
# bottom-left corner (clips/wa.npy: the mark over black, clips/A.npy: its alpha). Times are seconds in the take.
import os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
CLIP = os.path.join(HERE, 'clips/mli_take3.mp4')
W, H = 1320, 2868
Y0, X1 = 2690, 470
wa = np.load(os.path.join(HERE, 'clips/wa.npy')); A = np.load(os.path.join(HERE, 'clips/A.npy'))[..., None]

def frames(t0, t1):
    """The take's frames from t0 to t1 at 30 fps, as (index, rgb array)."""
    dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(t1 - t0), '-i', CLIP, '-vf', 'fps=30', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    i = 0
    while True:
        raw = dec.stdout.read(W * H * 3)
        if len(raw) < W * H * 3: break
        yield i, np.frombuffer(raw, np.uint8).reshape(H, W, 3)
        i += 1
    dec.wait()
def clean(f):
    f = f.copy(); r = f[Y0:, :X1].astype(np.float32)
    f[Y0:, :X1] = np.clip((r - wa) / (1 - A), 0, 255).astype(np.uint8)
    return f
class Writer:
    def __init__(self, key, w=W, h=H, size='920:2000'):
        out = os.path.join(HERE, 'img', key); os.makedirs(out, exist_ok=True)
        for f in os.listdir(out): os.remove(os.path.join(out, f))
        self.key, self.n = key, 0
        self.enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-',
                                     '-vf', f'scale={size}:flags=lanczos', '-q:v', '3', '-start_number', '0', os.path.join(out, '%04d.jpg')], stdin=subprocess.PIPE)
    def add(self, f): self.enc.stdin.write(np.ascontiguousarray(f).tobytes()); self.n += 1
    def close(self, note=''): self.enc.stdin.close(); self.enc.wait(); print(self.key, self.n, 'frames', note)

def shift(a, b):
    """How far (in px of a 4x-reduced frame) the list scrolled up between two frames, read on a strip left of the finger."""
    p, q = (x[::4, 80:600:4].mean(axis=2).astype(np.float32) for x in (a, b))
    best = (1e9, 0)
    for s in range(0, 330):
        e = np.abs(p[120 + s:600] - q[120:600 - s]).mean() if s else np.abs(p[120:600] - q[120:600]).mean()
        if e < best[0] - 0.4: best = (e, s)
    return best[1]

DRAG = 18                                                          # film frames per drag (one beat)
def slid(K, F, total, d, top):
    """The list between two recorded frames: K scrolled up by d of the `total` px that separate it from F. The rows K
    doesn't have come from F; the bars (status and title above `top`, the tab bar) don't scroll and are cross-faded."""
    K, F = K.astype(np.float32), F.astype(np.float32); SAFE = 2480; cut = SAFE - d
    out = np.empty_like(K); out[:cut] = K[d:d + cut]; out[cut:] = F[cut - (total - d):H - (total - d)]
    y = np.arange(H, dtype=np.float32); m = np.maximum(np.clip((top - y) / 60, 0, 1), np.clip((y - SAFE) / 60, 0, 1))[:, None, None]
    return (out * (1 - m) + (K + (F - K) * (d / total)) * m).astype(np.uint8)
def home():
    # Two drags up the template list. The recorder stalls while the list moves (it repeats a frame, then catches up
    # in one step), so each drag is rebuilt: the frames in which the list moved, with how far it had moved by then,
    # and from those one frame per film frame along an ease-out, the gaps filled by sliding the nearest recorded frame.
    w = Writer('mli_home'); ends = []
    for n, (t0, t1) in enumerate([(2.9, 4.2), (5.6, 6.7)]):
        real = []
        for i, f in frames(t0, t1):
            if not real: real.append((0, f.copy())); continue
            s = shift(real[-1][1], f)
            if s > 0: real.append((real[-1][0] + s, f.copy()))
        if n == 0: w.add(clean(real[0][1]))
        total = real[-1][0]; ends.append(round(total * 4 / H, 4))
        for k in range(1, DRAG + 1):
            c = total * (1 - (1 - k / DRAG) ** 2); i = max(j for j in range(len(real)) if real[j][0] <= c + 1e-6)
            if i == len(real) - 1: w.add(clean(real[i][1])); continue
            d, tot = round((c - real[i][0]) * 4), (real[i + 1][0] - real[i][0]) * 4
            w.add(clean(real[i][1] if d == 0 else real[i + 1][1] if d >= tot else slid(real[i][1], real[i + 1][1], tot, d, 190 if n == 0 and i == 0 else 380)))
    w.close('list travel per drag (screen heights): ' + repr(ends))

def plain(key, t0, t1, also=None):
    w = Writer(key)
    for i, f in frames(t0, t1): w.add(clean(f))
    n = w.n
    if also:                                                       # a sped-up tail: every `step`th frame
        a0, a1, step = also
        for i, f in frames(a0, a1):
            if i % step == 0: w.add(clean(f))
    w.close(f'({n} in real time)')

def pick():
    # 38.5 - 44.6: the twelve picks, Done, and the picker sliding away. While it slides the app still shows the
    # template's demo story behind it for a few frames, so those frames are rebuilt: the picker (as it stands at
    # 43.70) slides down over the editor as it is once the picks are in (44.2).
    T0, TOP, RAD = 38.5, 186, 88
    P = next(f for i, f in frames(43.70, 43.75)).astype(np.float32); E = next(f for i, f in frames(44.20, 44.25)).astype(np.float32)
    yy, xx = np.mgrid[0:RAD, 0:RAD]; corner = np.clip(RAD - np.hypot(RAD - xx - 0.5, RAD - yy - 0.5) + 0.5, 0, 1)
    mask = np.ones((H - TOP, W), np.float32); mask[:RAD, :RAD] = corner; mask[:RAD, W - RAD:] = corner[:, ::-1]
    SLIDE = [0.10, 0.18, 0.36, 0.62, 0.80, 0.90, 0.955, 0.985]     # the picker's top edge, in screen heights, frame by frame
    first = round((43.80 - T0) * 30)
    w = Writer('mli_pick')
    for i, f in frames(T0, 44.6):
        k = i - first
        if 0 <= k < len(SLIDE):
            top = round(SLIDE[k] * H); n = H - top
            out = E * (0.82 + 0.18 * (k + 1) / (len(SLIDE) + 1)); m = mask[:n, :, None]
            out[top:] = out[top:] * (1 - m) + P[TOP:TOP + n] * m
            f = out.astype(np.uint8)
        elif k >= len(SLIDE) and i < round((44.2 - T0) * 30): f = E.astype(np.uint8)
        w.add(clean(f))
    w.close(f'(slide rebuilt from frame {first})')

# Film time -> take time for the story, so every photo lands on a beat: the app's own playback from where it resumes
# (story 4.4 s at 47.6), photos two beats apart, then one, then the finished pile. Anchors: (film, take).
PLAY = [(23.4, 47.6), (24.0, 48.2), (25.2, 49.987), (26.4, 51.703), (27.6, 53.577), (28.8, 55.391), (29.4, 57.145), (30.0, 58.940),
        (30.6, 60.731), (31.2, 62.561), (31.8, 64.318), (33.6, 66.25)]
CROP = (160, 379, 998, 1774)                                       # the editor's preview, inside its rounded corners
def play():
    fa = np.array([p[0] for p in PLAY]); sa = np.array([p[1] for p in PLAY])
    n = round((fa[-1] - fa[0]) * 30); T0 = sa[0]
    edges = (np.interp(fa[0] + np.arange(n + 1) / 30, fa, sa) - T0) * 30   # in take frames
    x, y, cw, ch = CROP
    w = Writer('mli_play', cw, ch, '1080:1920'); buf = {}
    src = frames(T0, sa[-1] + 0.2)
    for j in range(n):
        a, b = edges[j], max(edges[j + 1], edges[j] + 1e-6)
        if b - a < 1.02: a = b = round(a)                          # at the app's own speed: the nearest frame, untouched
        k0, k1 = int(np.floor(a)), int(np.floor(b - 1e-6)) if b > a else int(a)
        while max(buf, default=-1) < k1:
            i, f = next(src); buf[i] = f[y:y + ch, x:x + cw].astype(np.float32)
        for k in [k for k in buf if k < k0]: del buf[k]
        if k0 == k1: out = buf[k0]
        else:
            ws = np.array([min(b, k + 1) - max(a, k) for k in range(k0, k1 + 1)]); ws /= ws.sum()
            out = sum(wk * buf[k] for wk, k in zip(ws, range(k0, k1 + 1)))
        w.add(out.astype(np.uint8))
    w.close()

SEQS = {
    'home': home,
    'edit': lambda: plain('mli_edit', 13.7, 19.4),                 # the card tap, the editor with the template's demo, "+", the sheet
    'pick': pick,
    'resume': lambda: plain('mli_resume', 47.4, 48.4),             # the editor around its preview as playback resumes
    'play': play,
    'share': lambda: plain('mli_share', 112.9, 117.5, (117.5, 135.4, 6)),   # Share, the sheet, Instagram, then rendering at 6x
}
for key in (sys.argv[1:] or SEQS): SEQS[key]()
