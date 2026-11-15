#!/usr/bin/env python3
"""Synthesises Skelp!'s sound effects from scratch (no samples, so nothing to license).
Run: python3 scripts/make-sounds.py"""
import math, os, random, struct, wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")
random.seed(7)

def tone(freq, dur, vol=0.5, decay=6.0, freq_end=None, harmonics=(1.0,)):
    n = int(RATE * dur); out = []; phase = 0.0
    for i in range(n):
        t = i / RATE
        f = freq + (freq_end - freq) * (i / n) if freq_end else freq
        phase += 2 * math.pi * f / RATE
        v = sum(a * math.sin(phase * (k + 1)) for k, a in enumerate(harmonics))
        env = math.exp(-decay * t) * min(1.0, i / (RATE * 0.004))  # short attack avoids clicks
        out.append(v * env * vol)
    return out

def noise(dur, vol=0.5, decay=40.0):
    n = int(RATE * dur); prev = 0.0; out = []
    for i in range(n):
        prev = 0.7 * prev + 0.3 * random.uniform(-1, 1)  # low-passed noise = woody knock
        out.append(prev * math.exp(-decay * i / RATE) * vol)
    return out

def mix(*layers):
    n = max(len(l) for l in layers)
    return [sum(l[i] for l in layers if i < len(l)) for i in range(n)]

def at(offset, samples):
    return [0.0] * int(RATE * offset) + samples

def save(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = min(1.0, 0.89 / peak)
    with wave.open(os.path.join(OUT, name + ".wav"), "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * scale)) * 32767)) for s in samples))

BELL = (1.0, 0.35, 0.12)
knock = lambda: mix(noise(0.09, 0.9, 45), tone(150, 0.16, 0.9, 22, freq_end=90))

save("tap", tone(820, 0.05, 0.4, 60))
save("bid", mix(tone(660, 0.09, 0.5, 18, harmonics=BELL), at(0.07, tone(990, 0.16, 0.5, 14, harmonics=BELL))))
save("rival", tone(520, 0.11, 0.35, 20, harmonics=BELL))
save("outbid", mix(tone(540, 0.14, 0.5, 12, harmonics=BELL), at(0.12, tone(380, 0.26, 0.5, 9, harmonics=BELL))))
save("tick", mix(noise(0.02, 0.5, 120), tone(1250, 0.05, 0.45, 55)))
save("lot", mix(tone(880, 0.35, 0.4, 7, harmonics=BELL), at(0.09, tone(1320, 0.4, 0.3, 7, harmonics=BELL))))
save("sold", mix(knock(), at(0.2, knock()), at(0.42, tone(784, 0.6, 0.35, 5, harmonics=BELL)), at(0.42, tone(1175, 0.6, 0.25, 5, harmonics=BELL))))
save("unsold", mix(knock(), at(0.2, tone(300, 0.45, 0.45, 5, freq_end=190, harmonics=BELL))))
save("win", mix(*[at(0.11 * i, tone(f, 0.5 if i < 3 else 0.9, 0.38, 5 if i < 3 else 3, harmonics=BELL)) for i, f in enumerate([523, 659, 784, 1047])], at(0.33, tone(1319, 0.9, 0.2, 3, harmonics=BELL))))
print("wrote", sorted(os.listdir(OUT)))
