#!/usr/bin/env python3
"""Measure a music bed so the storyboard can be cut to it. numpy + ffmpeg only.

    python3 beat_grid.py take1.mp3 [take2.wav ...]

For each file prints: duration, tempo (searched 85–135 BPM in 0.1 steps; half/double tempo is
listed too), beat phase (time of the first beat; downbeats every 4 beats from there), loudness per
second (the arc: intro, build, peak, breakdown), rough low-end onsets per second, and the "final hit"
(last loud moment before a sustained drop) — the natural place for the end card. Pick the take whose grid and arc fit the story,
then trim/offset so cuts land on beats: cut_time = phase + n * 60 / bpm.
"""
import subprocess, sys
import numpy as np

SR = 22050


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(float)


def analyse(path):
    x = load(path)
    hop, win = 128, 1024
    nf = len(x) // hop - win // hop
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop][:nf]
    S = np.abs(np.fft.rfft(frames * np.hanning(win), axis=1))
    fps = SR / hop
    flux = np.maximum(0, np.diff(np.log1p(S * 10), axis=0)).sum(1)
    # < ~250 Hz onsets, squared so kick hits dominate sustained bass movement (unsquared, phase drifts to the bassline)
    low = np.maximum(0, np.diff(np.log1p(S[:, :12].sum(1) * 10))) ** 2

    def comb(f, bpm):
        per, best = 60 / bpm, (0, 0)
        for ph in np.arange(0, per, 0.005):
            idx = (np.arange(ph, len(f) / fps - 0.1, per) * fps).astype(int)
            v = f[idx].mean()
            if v > best[0]:
                best = (v, ph)
        return best

    scores = sorted(((comb(flux, b)[0], b) for b in np.arange(85, 135.01, 0.1)), reverse=True)
    bpm = round(scores[0][1], 1)
    _, phase = comb(low, bpm)
    sec = [x[int(i * SR):int((i + 1) * SR)] for i in range(int(len(x) / SR))]
    db = [20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9) for s in sec]
    # drum energy per second: on-beat kick onsets only, scaled 0–9 against the loudest stretch
    beats = np.arange(phase, len(x) / SR - 0.05, 60 / bpm)
    kick = np.zeros(len(sec))
    for b in beats:
        i = int(b * fps)
        if int(b) < len(sec):
            kick[int(b)] += low[max(0, i - 2):i + 3].max()
    kick = np.clip(np.round(9 * kick / (np.percentile(kick, 90) + 1e-9)), 0, 9).astype(int)
    # final hit: last 0.25 s window within 3 dB of the loud level, followed by a ≥ 12 dB fall
    q = int(SR / 4)
    qdb = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + q] ** 2)) + 1e-9) for i in range(0, len(x) - q, q)])
    loud = np.percentile(qdb, 90)
    final = None
    for i in range(len(qdb) - 4, 0, -1):
        if qdb[i] > loud - 3 and qdb[i + 2:i + 6].max() < qdb[i] - 12:
            final = i / 4
            break
    print(f'\n{path}\n  duration {len(x) / SR:.2f}s   tempo {bpm} BPM (half {bpm / 2:.1f}, double {bpm * 2:.1f})'
          f'   beat 1 at {phase:.3f}s   beat = {60 / bpm:.3f}s')
    print('  ' + (f'final hit ~{final:.2f}s (end card here)' if final is not None else 'no clear final hit (fades or runs out)'))
    print('  dB/s:   ' + ' '.join(f'{v:.0f}' for v in db))
    print('  low/s:  ' + ' '.join(f'{v:3d}' for v in kick) + '   (rough on-beat low-end onsets, 0–9; read with your ears)')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        analyse(p)
