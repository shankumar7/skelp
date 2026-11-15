"""Central configuration: format, timeline, palette and asset paths for the Skelp! film."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUTPUT = ROOT / "output"
BUILD = ROOT / "build"

W, H, FPS = 1920, 1080, 30
DURATION = 60.0
BPM = 96                      # one bar = 2.5 s; every scene starts on a bar line
BAR = 4 * 60 / BPM

# (module name, start, end) in seconds
SCENES = [
    ("opening", 0.0, 5.0),
    ("problem", 5.0, 12.5),
    ("product_reveal", 12.5, 20.0),
    ("showcase", 20.0, 42.5),
    ("benefits", 42.5, 52.5),
    ("outro", 52.5, 60.0),
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

PRODUCT = "SKELP!"
TAGLINE = "The player auction you play with friends."
URL = "github.com/shankumar7/skelp"

# ---- the live-auction shot: how recording time maps onto the showcase scene ----
SHOWCASE_START = 20.0
LIVE_IN, LIVE_REC0 = 5.9, 0.5          # scene-local time at which recording time 0.5 s is shown
HAMMER_IN, HAMMER_REC0 = 11.1, 48.3    # second window: the run-up to SOLD


def recording_timeline():
    return json.loads((RECORDING / "timeline.json").read_text())


def live_events():
    """Bid taps and the SOLD moment, as scene-local times in the showcase scene."""
    ev = recording_timeline()["events"]
    bids = [LIVE_IN + (e["t"] - LIVE_REC0) for e in ev if e["type"] == "bid" and e["t"] < 6.0]
    sold = [HAMMER_IN + (e["t"] - HAMMER_REC0) for e in ev if e["type"] == "sold"]
    return bids, (sold[0] if sold else None)


def verify_assets():
    missing = [str(p) for p in [*FONTS.values(), LOGO, *SHOTS.values(), *APP_SFX.values(), RECORDING / "timeline.json"] if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing assets (run capture/capture_app.js first):\n  " + "\n  ".join(missing))
