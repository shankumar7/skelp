"""Central configuration: format, timeline, palette and asset paths for the Skelp! film."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "output"
BUILD = ROOT / "build"

W, H, FPS = 1920, 1080, 30
DURATION = 60.0

# ---- the music grid: everything in the film is timed against the supplied track ----
MUSIC = ASSETS / "audio" / "music.mp3"
BPM = 118.3                   # measured from the track
BEAT = 60.0 / BPM             # 0.507 s
BAR = 4 * BEAT                # 2.029 s
PHASE = 0.2485                # time of the first downbeat in the track (and in the film)
# How the 33 s track is laid out to fill the film: (first bar, bar count) taken from the track.
# Bars 0-1 are its intro, 2-12 its main section, 13+ its outro. The main section re-enters at film
# bar 6 (the product reveal) and again at bar 17; the outro arrives with the final brand moment.
MUSIC_PLAN = [(0, 6), (2, 11), (4, 9), (13, None)]


def bar_time(n):
    """Film time of the downbeat of bar n, snapped to a frame."""
    return round((PHASE + n * BAR) * FPS) / FPS


# (module name, start, end) in seconds — every scene starts on a bar line
SCENES = [
    ("opening", 0.0, bar_time(2)),
    ("problem", bar_time(2), bar_time(6)),
    ("product_reveal", bar_time(6), bar_time(10)),
    ("showcase", bar_time(10), bar_time(22)),
    ("benefits", bar_time(22), bar_time(26)),
    ("outro", bar_time(26), DURATION),
]

# ---- palette: the app's own light clay look — warm sand, plum ink, periwinkle ----
BG = (251, 247, 240)
INK = (38, 33, 66)
MUTED = (104, 98, 132)
DIM = (150, 144, 172)
PERI = (91, 95, 239)          # brand periwinkle
PERI_DEEP = (91, 95, 239)
MINT = (22, 160, 126)
CORAL = (236, 82, 82)
GOLD = (222, 138, 18)         # amber, dark enough to read on sand
# pastel washes for the ambient background light
WASH_PERI = (196, 198, 255)
WASH_MINT = (186, 238, 222)
WASH_LILAC = (232, 206, 255)
WASH_GOLD = (255, 226, 176)

FONTS = {
    "medium": ASSETS / "fonts" / "Inter_500Medium.ttf",
    "semi": ASSETS / "fonts" / "Inter_600SemiBold.ttf",
    "bold": ASSETS / "fonts" / "Inter_700Bold.ttf",
    "xbold": ASSETS / "fonts" / "Inter_800ExtraBold.ttf",
    "brand": ASSETS / "fonts" / "LuckiestGuy_400Regular.ttf",
}
LOGO = ASSETS / "logo" / "circlelogo.png"
SHOTS = {n: ASSETS / "screenshots" / f"{n}.png" for n in ["welcome", "dashboard", "pool", "lobby", "sold", "squads", "results"]}
RECORDING = ASSETS / "recording"
APP_SFX = {n: ASSETS / "audio" / f"{n}.wav" for n in ["bid", "rival", "sold", "lot", "tap"]}

OUTPUT_NAME = "final_promo_music.mp4"     # the cut set to the supplied track
PRODUCT = "SKELP!"
TAGLINE = "The player auction you play with friends."
URL = "github.com/shankumar7/skelp"

# ---- the live-auction shot: the recording is placed so that taps and the hammer land on beats ----
SHOWCASE_START = bar_time(10)
REC_BID1, REC_BID2, REC_SOLD = 1.716, 4.582, 49.496       # moments in the captured recording
LIVE_BID1_BEAT, LIVE_BID2_BEAT, HAMMER_CUT_BEAT, SOLD_BEAT = 14, 20, 22, 24   # showcase-local beats
LIVE_SPEED = (REC_BID2 - REC_BID1) / ((LIVE_BID2_BEAT - LIVE_BID1_BEAT) * BEAT)  # ~0.94x, so both taps hit beats


def rec_time_live(t):
    """Recording time shown at showcase-local time t during the bidding shot."""
    return max(0.3, REC_BID1 + (t - LIVE_BID1_BEAT * BEAT) * LIVE_SPEED)


def rec_time_hammer(t):
    """Recording time shown during the run-up to SOLD (the hammer falls on a downbeat)."""
    return REC_SOLD + (t - SOLD_BEAT * BEAT)


def recording_timeline():
    return json.loads((RECORDING / "timeline.json").read_text())


def live_events():
    """Bid taps and the SOLD moment, as scene-local times in the showcase scene."""
    return [LIVE_BID1_BEAT * BEAT, LIVE_BID2_BEAT * BEAT], SOLD_BEAT * BEAT


def verify_assets():
    missing = [str(p) for p in [*FONTS.values(), LOGO, MUSIC, *SHOTS.values(), *APP_SFX.values(), RECORDING / "timeline.json"] if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing assets (run capture/capture_app.js first):\n  " + "\n  ".join(missing))
