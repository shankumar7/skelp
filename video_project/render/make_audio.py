"""Original soundtrack and sound design, synthesised from scratch with NumPy (nothing sampled or licensed),
then mastered with FFmpeg. Timing comes from config.py, so sound follows picture.
Run:  python3 -m render.make_audio"""
import subprocess, wave
import numpy as np
import config as C

SR = 48000
N = int(SR * C.DURATION)
BEAT = 60.0 / C.BPM
rng = np.random.default_rng(5)
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name):
    return 440.0 * 2 ** ((NOTE[name[:-1]] + 12 * (int(name[-1]) + 1) - 69) / 12)


def env(n, a, r, hold=None, curve=1.0):
    """Attack / hold / release envelope over n samples (a, r in seconds)."""
    e = np.ones(n, np.float32)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na) ** curve
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


class Mix:
    def __init__(self):
        self.dry = np.zeros((N, 2), np.float32)
        self.wet = np.zeros((N, 2), np.float32)       # reverb send

    def add(self, sig, t, gain=1.0, pan=0.0, send=0.0):
        i = int(t * SR)
        if i >= N or i + len(sig) <= 0:
            return
        sig = sig[: N - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        st = np.stack([sig * l, sig * r], 1)
        self.dry[i:i + len(sig)] += st
        if send:
            self.wet[i:i + len(sig)] += st * send


def lowpass(x, cutoff, order=2):
    """Zero-phase FFT low-pass."""
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(np.fft.rfft(x) / (1 + (f / cutoff) ** (2 * order)), len(x)).astype(np.float32)


def highpass(x, cutoff, order=2):
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = (f / cutoff) ** (2 * order)
    return np.fft.irfft(np.fft.rfft(x) * g / (1 + g), len(x)).astype(np.float32)


# ------------------------------------------------------------------ instruments

def pad(freqs, dur, bright=1.0):
    """Warm detuned pad: a few soft harmonics per voice, slow attack and release."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n, np.float32)
    for f in freqs:
        for det in (-0.004, 0.0, 0.005):
            ph = rng.uniform(0, 6.28)
            for h, a in ((1, 1.0), (2, 0.34 * bright), (3, 0.16 * bright), (4, 0.07 * bright)):
                out += a * np.sin(2 * np.pi * f * (1 + det) * h * t + ph * h)
    out *= 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t)
    return out / (len(freqs) * 3) * env(n, min(1.2, dur * 0.35), min(1.6, dur * 0.4))


def pluck(f, dur=0.5, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (7 + 5 * h)) for h, a in ((1, 1.0), (2, 0.5 * bright), (3, 0.28 * bright), (5, 0.1 * bright)))
    return (out * env(n, 0.003, 0.05)).astype(np.float32)


def bell(f, dur=2.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in ((1, 1.0, 1.6), (2.76, 0.35, 3.5), (5.4, 0.18, 6.0), (0.5, 0.3, 1.2)))
    return (out * env(n, 0.002, 0.2)).astype(np.float32)


def bass(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 9)
    return (out * env(n, 0.006, min(0.12, dur * 0.4))).astype(np.float32)


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * (44 * t + (128 - 44) / 30 * (1 - np.exp(-t * 30)))
    return (np.sin(ph) * np.exp(-t * 9) * env(n, 0.001, 0.08)).astype(np.float32)


def hat(dur=0.05, tone=7000):
    n = int(dur * SR * 4)
    t = np.arange(n) / SR
    return (highpass(rng.standard_normal(n).astype(np.float32), tone) * np.exp(-t / dur)).astype(np.float32)


def rim():
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 410 * t) * np.exp(-t * 55)
    snap = lowpass(highpass(rng.standard_normal(n).astype(np.float32), 1500), 6500) * np.exp(-t * 38)
    return (0.6 * body + 0.9 * snap).astype(np.float32)


def whoosh(dur=0.9, peak=0.6, lo=500, hi=5200):
    """Breathy sweep: noise whose brightness and level rise to `peak` (0..1 of dur) and fall away."""
    n = int(dur * SR)
    x = rng.standard_normal(n).astype(np.float32)
    dark, bright = lowpass(x, lo), lowpass(highpass(x, lo), hi)
    p = np.linspace(0, 1, n)
    shape = np.where(p < peak, (p / peak) ** 2.2, ((1 - p) / (1 - peak)) ** 1.6).astype(np.float32)
    return (dark * 0.5 + bright * shape) * shape


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    tone = np.sin(2 * np.pi * np.cumsum(180 * 2 ** (p * 2.2)) / SR) * 0.25
    air = highpass(rng.standard_normal(n).astype(np.float32), 1800) * 0.35
    return ((tone + air) * p ** 2.4 * env(n, 0.01, 0.02)).astype(np.float32)


def impact():
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * (38 * t + 30 / 14 * (1 - np.exp(-t * 14)))) * np.exp(-t * 2.4)
    thud = lowpass(rng.standard_normal(n).astype(np.float32), 420) * np.exp(-t * 16) * 1.4
    return (sub + thud).astype(np.float32) * env(n, 0.002, 0.3)


def app_sfx(name):
    """The app's own (synthesised) interface sounds, resampled to 48 kHz."""
    with wave.open(str(C.APP_SFX[name])) as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    return np.interp(np.arange(int(len(raw) * SR / sr)) * sr / SR, np.arange(len(raw)), raw).astype(np.float32)


def reverb(x, seconds=2.8, tone=5200):
    """Stereo convolution reverb with a synthetic exponentially decaying noise impulse."""
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(x)
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    for ch in range(2):
        ir = lowpass(rng.standard_normal(n).astype(np.float32), tone) * np.exp(-t * 2.6)
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch], size) * np.fft.rfft(ir, size), size)[: len(x)]
    return out


# ------------------------------------------------------------------ the score

CH = {
    "Dm9": ["D3", "A3", "C4", "E4", "F4"], "Bb": ["A#2", "F3", "A3", "D4", "F4"], "Gm": ["G2", "D3", "A#3", "D4", "F4"],
    "F": ["F2", "C3", "A3", "C4", "F4"], "C": ["C3", "G3", "C4", "E4", "G4"], "Fadd9": ["F2", "C3", "G3", "A3", "C4", "F4", "A4"],
}
ROOT = {"Dm9": "D2", "Bb": "A#1", "Gm": "G1", "F": "F1", "C": "C2", "Fadd9": "F1"}


def score(m):
    bar = C.BAR
    # --- pads: one chord per region, overlapping so changes breathe
    plan = [(0, 5.4, "Dm9", 0.55), (5, 4.2, "Bb", 0.5), (8.75, 4.2, "Gm", 0.55), (12.5, 4.2, "F", 0.75), (16.25, 4.2, "C", 0.7)]
    cyc = ["Dm9", "Bb", "F", "C"]
    for b in range(9):
        plan.append((20 + b * bar, bar + 0.9, cyc[b % 4], 0.6))
    for b, ch in enumerate(["Bb", "C", "Dm9", "C"]):
        plan.append((42.5 + b * bar, bar + 0.9, ch, 0.7))
    plan.append((52.5, 7.5, "Fadd9", 0.95))
    for t, dur, ch, g in plan:
        fr = [hz(n) for n in CH[ch]]
        m.add(pad(fr, dur, 1.0), t, 0.30 * g, -0.25, 0.5)
        m.add(pad([f * 2 for f in fr[2:]], dur, 0.6), t, 0.11 * g, 0.3, 0.7)

    # --- sub drone under the opening and the problem
    n = int(12.5 * SR)
    tt = np.arange(n) / SR
    m.add((np.sin(2 * np.pi * hz("D1") * 2 * tt) * env(n, 2.0, 1.5)).astype(np.float32), 0, 0.16)

    # --- opening sparkle: a few bell notes
    for t, note in [(0.6, "A5"), (1.85, "F5"), (3.1, "E5"), (4.35, "D5")]:
        m.add(bell(hz(note), 2.6), t, 0.10, 0.2, 0.8)

    # --- the problem: a muted clock-like pulse that tightens
    for i in range(int(7.5 / (BEAT / 2))):
        t = 5 + i * BEAT / 2
        m.add(pluck(hz("D4") if i % 4 else hz("A4"), 0.25, 0.3), t, 0.05 + 0.05 * i / 24, -0.3 + 0.6 * (i % 2), 0.4)
    m.add(riser(2.4), 10.1, 0.5, 0, 0.5)
    m.add(whoosh(1.0, 0.85), 11.5, 0.5, 0, 0.4)

    # --- reveal: impact, bright chord, the arpeggio wakes up
    m.add(impact(), 12.5, 0.85, 0, 0.35)
    for i, note in enumerate(["F5", "A5", "C6", "F6"]):
        m.add(bell(hz(note), 3.0), 12.5 + i * 0.07, 0.11, -0.3 + i * 0.2, 0.9)

    def arp(t0, bars, chords, gain, bright=1.0):
        for b in range(bars):
            notes = [hz(x) * 2 for x in CH[chords[b % len(chords)]][1:5]]
            pattern = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2]
            for s, k in enumerate(pattern):
                t = t0 + b * bar + s * BEAT / 4
                m.add(pluck(notes[k], 0.45, bright), t, gain * (1.0 if s % 4 == 0 else 0.72), 0.45 * np.sin(s * 1.3), 0.45)

    arp(15.0, 2, ["F", "C"], 0.07, 0.6)

    # --- showcase: the groove
    kick_s, hat_s, hat_o, rim_s = kick(), hat(0.035), hat(0.11, 6000), rim()
    for b in range(9):
        t0 = 20 + b * bar
        ch = cyc[b % 4]
        full = b >= 1
        for beat in range(4):
            tb = t0 + beat * BEAT
            if beat in (0, 2) or (beat == 3 and b % 4 == 3):
                m.add(kick_s, tb, 0.62)
            if beat in (1, 3) and full:
                m.add(rim_s, tb, 0.20, 0.1, 0.25)
            for sub in range(2):
                m.add(hat_s, tb + sub * BEAT / 2, 0.055 if sub == 0 else 0.085, 0.35, 0.1)
            if full and beat == 3:
                m.add(hat_o, tb + BEAT / 2, 0.05, 0.35, 0.2)
            for sub in range(2):                                   # bass: off-beat eighths, octave lift on 4
                f = hz(ROOT[ch]) * (2 if (beat == 3 and sub == 1) else 1)
                m.add(bass(f, BEAT / 2 * 0.9), tb + sub * BEAT / 2, 0.30 if sub else 0.22)
    arp(20, 9, cyc, 0.085)

    # --- benefits: drums thin out, harmony lifts
    for b in range(4):
        t0 = 42.5 + b * bar
        m.add(kick_s, t0, 0.5)
        m.add(bass(hz(ROOT[["Bb", "C", "Dm9", "C"][b]]), bar * 0.9), t0, 0.26)
        for beat in range(4):
            m.add(hat_s, t0 + beat * BEAT + BEAT / 2, 0.05, 0.35, 0.15)
    arp(42.5, 4, ["Bb", "C", "Dm9", "C"], 0.07, 0.8)
    m.add(riser(2.2), 50.3, 0.45, 0, 0.5)

    # --- final brand moment: resolution on F
    m.add(impact(), 52.5, 0.8, 0, 0.35)
    for i, note in enumerate(["F4", "C5", "F5", "A5", "C6"]):
        m.add(bell(hz(note), 4.5), 52.5 + i * 0.09, 0.12, -0.4 + i * 0.2, 0.9)
    m.add(bass(hz("F1"), 5.0), 52.5, 0.3)
    m.add(bell(hz("F6"), 3.5), 54.2, 0.06, 0.3, 0.9)     # the call-to-action lands
    m.add(bell(hz("C6"), 3.5), 54.8, 0.05, -0.3, 0.9)


def sound_design(m):
    s0 = C.SHOWCASE_START
    bids, sold = C.live_events()
    # scene transitions
    for t, g in [(4.3, 0.30), (9.45, 0.26), (19.4, 0.34), (25.2, 0.30), (33.1, 0.30), (37.6, 0.28), (41.9, 0.34), (45.6, 0.2), (48.9, 0.2)]:
        m.add(whoosh(0.9, 0.6), t, g, 0, 0.3)
    # strike-throughs in the problem scene
    for i in range(3):
        m.add(whoosh(0.35, 0.5, 800, 7000), 5 + 3.55 + i * 0.14, 0.22, -0.4 + i * 0.4, 0.2)
    # the phone rising into frame
    m.add(whoosh(1.2, 0.35, 300, 3800), 15.65, 0.34, 0.3, 0.4)
    # focus highlights on the dashboard
    for t in (s0 + 2.5, s0 + 3.95, s0 + 20.3):
        m.add(app_sfx("tap"), t, 0.5, 0.3, 0.3)
    # the live auction: the app's own sounds, exactly where they happen in the recording
    m.add(app_sfx("lot"), s0 + 6.0, 0.42, -0.3, 0.3)
    for b in bids:
        m.add(app_sfx("bid"), s0 + b, 0.6, -0.3, 0.25)
        m.add(app_sfx("rival"), s0 + b + 1.25, 0.34, -0.3, 0.25)
    if sold:
        m.add(app_sfx("sold"), s0 + sold, 0.7, -0.3, 0.35)
    # value statements land
    for t in (42.5 + 0.15, 42.5 + 3.55, 42.5 + 6.85):
        m.add(bell(hz("A5"), 1.8), t, 0.07, 0, 0.8)


def write_wav(path, x):
    with wave.open(str(path), "w") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def main():
    C.verify_assets()
    C.BUILD.mkdir(exist_ok=True)
    m = Mix()
    score(m)
    sound_design(m)
    x = m.dry + 0.34 * reverb(m.wet)
    x /= max(1.0, np.abs(x).max() / 0.92)            # headroom before mastering
    raw, master = C.BUILD / "mix_raw.wav", C.BUILD / "soundtrack.wav"
    write_wav(raw, x)
    # master: rumble filter, gentle glue compression, loudness normalisation, true-peak limiter, fades
    chain = ("highpass=f=28,acompressor=threshold=-18dB:ratio=2.2:attack=20:release=220:makeup=2,"
             "loudnorm=I=-15:TP=-1.5:LRA=9,alimiter=limit=0.84:level=disabled,"
             f"afade=t=in:st=0:d=0.5,afade=t=out:st={C.DURATION - 2.4}:d=2.4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", chain, "-ar", str(SR), "-c:a", "pcm_s16le", str(master)], check=True)
    print("soundtrack:", master)


if __name__ == "__main__":
    main()
