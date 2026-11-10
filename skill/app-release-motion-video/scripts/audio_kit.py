"""Synth primitives for motion-piece soundtracks. numpy only.

A score script does:
    import sys; sys.path.insert(0, '<skill>/scripts'); from audio_kit import *
    s = Score(15.0)
    s.drums(1.5, 12.3, bpm=120)
    s.shutter(7.47)
    s.write('audio.wav')

Every placement is in seconds; put each hit on the frame its visual lands (see SKILL.md "Sync").

With a generated bed (fal_music.py) instead of synth music:
    s = Score(45.0)
    s.bed('music/eleven.mp3', gain=0.9)     # stereo, trimmed/padded to the score length
    s.wash(40.0)                            # ring the final chord on under the end card
    s.whoosh(9.8, 10.25); s.thump(15.28)    # SFX on the visual hits
    s.write('audio.wav', lufs=-14)
"""
import os
import subprocess
import tempfile
import wave
import numpy as np

SR = 48000


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


class Score:
    def __init__(self, duration, seed=7):
        self.n = int(SR * duration)
        self.duration = duration
        self.t = np.arange(self.n) / SR
        self.noise = np.random.default_rng(seed).standard_normal(self.n)
        self.music = np.zeros(self.n)
        self.sfx = np.zeros(self.n)
        self.pm = 1 + 0.0025 * np.sin(2 * np.pi * 0.6 * self.t)  # tape wow on all pitched music; set to 1 for clean
        self.stereo_bed = None  # (n, 2) from bed()

    # ---------- building blocks
    def env(self, start, length, attack=0.004, rel=None):
        e = np.zeros(self.n)
        i0 = int(start * SR)
        i1 = min(self.n, i0 + int(length * SR))
        if i1 <= i0:
            return e
        tt = np.arange(i1 - i0) / SR
        e[i0:i1] = np.clip(tt / attack, 0, 1) * np.exp(-tt / (rel or length / 4))
        return e

    def window(self, a, b, fade=0.08):
        t = self.t
        return np.clip((t - a) / fade, 0, 1) * np.clip((b - t) / fade, 0, 1)

    def lp(self, x, cutoff, order=2):
        X = np.fft.rfft(x)
        f = np.fft.rfftfreq(len(x), 1 / SR)
        X *= 1 / (1 + (f / cutoff) ** (2 * order))
        return np.fft.irfft(X, len(x))

    def hp(self, x, cutoff):
        X = np.fft.rfft(x)
        f = np.fft.rfftfreq(len(x), 1 / SR)
        X *= 1 - 1 / (1 + (f / cutoff) ** 4)
        return np.fft.irfft(X, len(x))

    def bp(self, x, lo, hi):
        return self.hp(self.lp(x, hi), lo)

    def osc(self, freq, shape='sine'):
        """freq: scalar or per-sample array (Hz)."""
        ph = np.cumsum(np.broadcast_to(freq, self.t.shape) / SR)
        if shape == 'saw':
            return 2 * (ph % 1) - 1
        if shape == 'square':
            return np.sign(np.sin(2 * np.pi * ph))
        return np.sin(2 * np.pi * ph)

    def pitch_wobble(self, a, b, depth=0.06, rate=7):
        """Tape-rewind style pitch dip + warble on the music between a and b."""
        m = (self.t > a) & (self.t < b)
        self.pm = np.where(m, 1 - depth + depth * 0.66 * np.sin(2 * np.pi * rate * self.t), self.pm)

    # ---------- music
    def pad(self, chords, gain=0.9, cutoff=1500):
        """chords: [(start, end, [midi notes])]. Detuned saws, low-passed."""
        out = np.zeros(self.n)
        for a, b, notes in chords:
            g = self.window(a, b, 0.1)
            for m in notes:
                for det in (-0.07, 0.0, 0.07):
                    out += g * self.osc(midi(m + det) * self.pm, 'saw') * 0.05
        self.music += self.lp(out, cutoff) * gain

    def bass(self, chords, step=0.25, gain=0.16):
        for a, b, notes in chords:
            for s in np.arange(a, b - 0.01, step):
                self.music += self.env(s, step * 0.96, 0.005, 0.1) * np.tanh(2 * self.osc(midi(notes[0] - 12) * self.pm)) * gain

    def drums(self, a, b, bpm=120, kick=0.6, snare=0.35, hat=0.18):
        beat = 60 / bpm
        k = np.zeros(self.n)
        for i, s in enumerate(np.arange(a, b, beat)):
            e = self.env(s, 0.35, 0.002, 0.09)
            k += e * self.osc(45 + 90 * np.exp(-(self.t - s).clip(0) / 0.03)) * (0.9 if i % 2 == 0 else 0.75)
            if i % 2 == 1:
                self.music += self.env(s, 0.25, 0.002, 0.06) * self.bp(self.noise, 900, 5000) * snare
            self.music += self.env(s + beat / 2, 0.06, 0.001, 0.015) * self.hp(self.noise, 7000) * hat
        self.music += np.tanh(k * 1.4) * kick

    def chime(self, at, freq, gain=0.07, length=0.6):
        self.sfx += self.env(at, length, 0.002, length / 3.3) * (self.osc(freq) + 0.3 * self.osc(freq * 2.01)) * gain

    # ---------- sfx
    def static(self, at, length=0.8, gain=0.35):
        self.sfx += self.env(at, length, 0.01, length / 3) * self.bp(self.noise, 800, 9000) * gain

    def thump(self, at, gain=0.8, low=70):
        self.sfx += self.env(at, 0.4, 0.002, 0.12) * self.osc(low + 60 * np.exp(-(self.t - at).clip(0) / 0.02)) * gain
        self.sfx += self.env(at, 0.15, 0.001, 0.04) * self.bp(self.noise, 200, 3000) * gain * 0.5

    def tick(self, at, gain=0.35):
        self.sfx += self.env(at, 0.04, 0.0005, 0.008) * self.hp(self.noise, 3000) * gain

    def click(self, at, gain=0.7):
        self.sfx += self.env(at, 0.03, 0.0005, 0.006) * self.hp(self.noise, 2000) * gain
        self.sfx += self.env(at + 0.02, 0.05, 0.0005, 0.01) * self.osc(1800) * gain * 0.3

    def blip(self, at, freq, gain=0.06, length=0.03):
        self.sfx += self.env(at, length, 0.001, length / 3) * self.osc(freq, 'square') * gain

    def pop(self, at, freq=880, gain=0.18):
        self.sfx += self.env(at, 0.25, 0.002, 0.05) * self.osc(freq) * gain

    def whoosh(self, a, b, gain=0.25, lo=400, hi=3000):
        w = np.sin(np.pi * np.clip((self.t - a) / (b - a), 0, 1)) * ((self.t > a) & (self.t < b))
        self.sfx += w * self.bp(self.noise, lo, hi) * gain

    def shutter(self, at, gain=1.0):
        self.sfx += self.env(at, 0.02, 0.0003, 0.004) * self.hp(self.noise, 1500) * 0.9 * gain
        self.sfx += self.env(at + 0.045, 0.06, 0.0005, 0.012) * self.bp(self.noise, 500, 6000) * 0.7 * gain
        self.sfx += self.env(at + 0.045, 0.08, 0.001, 0.02) * self.osc(180) * 0.4 * gain

    def squeal(self, a, b, gain=0.8):
        """VHS rewind: warbling rising whine + hiss."""
        w = self.window(a, b, 0.1)
        f = 900 + 700 * ((self.t - a).clip(0) / (b - a)) + 120 * np.sin(2 * np.pi * 9 * self.t)
        self.sfx += w * (self.osc(f) * 0.12 + self.bp(self.noise, 2000, 6000) * 0.12) * gain

    def motor(self, a, b, gain=0.22):
        """Film-advance whirr whose pitch spins down over [a, b]."""
        u = (self.t - a).clip(0)
        spd = np.clip(1 - u / (b - a), 0, 1) ** 2
        m = ((self.t > a) & (self.t < b)) * np.clip(u / 0.08, 0, 1)
        body = self.osc(70 + 160 * spd, 'saw') * 0.6 + self.bp(self.noise, 800, 3000) * 0.3
        self.sfx += m * (0.25 + 0.75 * spd) * body * (0.8 + 0.2 * np.sin(2 * np.pi * 30 * self.t)) * gain

    def zap(self, at, gain=0.35, length=0.4):
        """CRT power-off: fast falling sine."""
        m = (self.t > at) & (self.t < at + length)
        f = 2400 * np.exp(-(self.t - at).clip(0) / 0.08) + 60
        self.sfx += m * np.exp(-(self.t - at).clip(0) / 0.12) * self.osc(f) * gain

    # ---------- generated bed
    def bed(self, path, gain=0.9, offset=0.0):
        """Load a music file as the stereo bed. offset > 0 trims its start (move its beat grid earlier),
        offset < 0 delays it. Synth music() and sfx are mixed on top."""
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(max(0.0, offset)), '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                             capture_output=True, check=True).stdout
        b = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(float)
        if offset < 0:
            b = np.pad(b, ((int(-offset * SR), 0), (0, 0)))
        self.stereo_bed = np.pad(b, ((0, max(0, self.n - len(b))), (0, 0)))[:self.n] * gain

    def wash(self, at, length=0.6, tail=4.5, gain=0.16, end=None, seed=3):
        """Reverb wash of bed[at, at+length]: lets a final chord ring on under an end card when the
        generated track stops early. Fades out by `end` (default: score end)."""
        if self.stereo_bed is None:
            raise ValueError('wash() needs bed() first')
        rng = np.random.default_rng(seed)
        it = np.arange(int(tail * SR)) / SR
        seg = self.stereo_bed[int(at * SR):int((at + length) * SR)]
        i0, room = int(at * SR), self.n - int(at * SR)
        w = np.zeros_like(self.stereo_bed)
        for ch in range(2):
            ir = rng.standard_normal(len(it)) * np.exp(-it / (tail / 3.5))
            ir = self.lp(np.pad(ir, (0, max(0, self.n - len(ir))))[:self.n], 3500)[:len(it)]
            y = np.convolve(seg[:, ch], ir)[:room]
            w[i0:i0 + len(y), ch] = y
        w /= np.max(np.abs(w)) + 1e-9
        end = self.duration - 0.1 if end is None else end
        self.stereo_bed += w * (gain * np.clip((self.t - at - 0.05) / 0.4, 0, 1) * np.clip((end - self.t) / 1.2, 0, 1))[:, None]

    # ---------- output
    def write(self, path, music_gain=0.8, end_cut=None, lufs=None):
        """lufs: e.g. -14 to loudness-normalise with ffmpeg (render.mjs re-checks after AAC encoding)."""
        mono = self.music * music_gain + self.sfx
        st = np.stack([mono, np.roll(mono, int(0.0006 * SR))], 1)
        if self.stereo_bed is not None:
            st = st + self.stereo_bed
        if end_cut is not None:
            st *= np.clip((end_cut - self.t) / 0.05, 0, 1)[:, None]
        st *= np.clip((self.duration - self.t) / 0.3, 0, 1)[:, None]  # never end on a click
        st = np.tanh(st * 1.2)
        st /= np.max(np.abs(st)) / 0.9
        target = path if lufs is None else tempfile.mktemp(suffix='.wav')
        with wave.open(target, 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((st * 32767).astype('<i2').tobytes())
        if lufs is not None:
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', target, '-af', f'loudnorm=I={lufs}:TP=-1.5:LRA=11', '-ar', str(SR), path], check=True)
            os.remove(target)
        print('wrote', path, f'{self.duration:.2f}s')
