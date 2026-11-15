"""Builds the 60-second soundtrack from the supplied track: lays its bars out along the film according to
config.MUSIC_PLAN (joining only on bar lines), adds the app's own interface sounds where they happen
in the live-auction shot, and masters the result with FFmpeg.
Run:  python3 -m render.music_bed"""
import subprocess, wave
import numpy as np
import config as C

SR = 48000


def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float32) / 32768


def app_sfx(name):
    with wave.open(str(C.APP_SFX[name])) as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        sr = w.getframerate()
    return np.interp(np.arange(int(len(raw) * SR / sr)) * sr / SR, np.arange(len(raw)), raw).astype(np.float32)


def lay_out(track):
    """Concatenate bar ranges of the track with short equal-power crossfades placed just before each downbeat."""
    n = int(C.DURATION * SR)
    out = np.zeros((n, 2), np.float32)
    fade = int(0.030 * SR)
    lead = int(0.012 * SR)                       # join slightly ahead of the downbeat so its transient stays intact
    bar_at = lambda b: int((C.PHASE + b * C.BAR) * SR)
    film_bar, joins = 0, []
    for i, (first, count) in enumerate(C.MUSIC_PLAN):
        src0 = 0 if i == 0 else bar_at(first) - lead - fade
        src1 = len(track) if count is None else bar_at(first + count) - lead
        dst0 = 0 if i == 0 else bar_at(film_bar) - lead - fade
        seg = track[src0:src1].copy()
        if i > 0:                                 # fade in over the tail of the previous segment
            seg[:fade] *= np.sin(np.linspace(0, np.pi / 2, fade))[:, None]
            out[dst0:dst0 + fade] *= np.cos(np.linspace(0, np.pi / 2, fade))[:, None]
            joins.append(round((dst0 + fade + lead) / SR, 3))
        seg = seg[: max(0, n - dst0)]
        out[dst0:dst0 + len(seg)] += seg
        film_bar += count or 0
    return out, joins


def main():
    C.verify_assets()
    C.BUILD.mkdir(exist_ok=True)
    music, joins = lay_out(load(C.MUSIC))
    sfx = np.zeros_like(music)

    def add(sig, t, gain, pan=0.0):
        i = int(t * SR)
        sig = sig[: max(0, len(sfx) - i)] * gain
        sfx[i:i + len(sig), 0] += sig * np.cos((pan + 1) * np.pi / 4)
        sfx[i:i + len(sig), 1] += sig * np.sin((pan + 1) * np.pi / 4)

    s0 = C.SHOWCASE_START
    bids, sold = C.live_events()
    for b in bids:                                # the app's own sounds, on the beats where the taps land
        add(app_sfx("bid"), s0 + b, 0.5, -0.3)
    add(app_sfx("sold"), s0 + sold, 0.55, -0.3)
    mix = music + sfx
    raw, master = C.BUILD / "mix_raw.wav", C.BUILD / "soundtrack.wav"
    with wave.open(str(raw), "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix * 0.8, -1, 1) * 32767).astype(np.int16).tobytes())
    # the track is already mastered: only match loudness, catch peaks and fade the ends
    chain = (f"loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=disabled,"
             f"afade=t=in:st=0:d=0.15,afade=t=out:st={C.DURATION - 1.2}:d=1.2")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", chain, "-ar", str(SR), "-c:a", "pcm_s16le", str(master)], check=True)
    print("soundtrack:", master, "| joins at", joins, "s")


if __name__ == "__main__":
    main()
