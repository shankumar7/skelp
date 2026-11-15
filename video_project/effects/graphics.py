"""Compositing primitives: ambient background, phone mockup, highlights, chips, touch indicator."""
from functools import lru_cache
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import config as C
from effects.animations import breathe, clamp

# ---------------------------------------------------------------- compositing

def comp(canvas, layer, x, y, alpha=1.0):
    """Alpha-composite `layer` onto `canvas` at (x, y) with clipping and an opacity multiplier."""
    if alpha <= 0.004:
        return
    x, y = int(round(x)), int(round(y))
    l, t = max(0, -x), max(0, -y)
    r, b = min(layer.width, canvas.width - x), min(layer.height, canvas.height - y)
    if r <= l or b <= t:
        return
    if (l, t, r, b) != (0, 0, layer.width, layer.height):
        layer = layer.crop((l, t, r, b))
    if alpha < 0.996:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
    canvas.alpha_composite(layer, (x + l, y + t))


def comp_center(canvas, layer, cx, cy, alpha=1.0):
    comp(canvas, layer, cx - layer.width / 2, cy - layer.height / 2, alpha)


# ---------------------------------------------------------------- background

_BW, _BH = 384, 216
_yy, _xx = np.mgrid[0:_BH, 0:_BW].astype(np.float32)
_xx /= _BW
_yy /= _BH
_rng = np.random.default_rng(11)
_DITHER = _rng.uniform(-1.6, 1.6, (C.H, C.W, 1)).astype(np.float32)   # hides banding in dark gradients
_vx, _vy = np.meshgrid(np.linspace(-1, 1, C.W, dtype=np.float32), np.linspace(-1, 1, C.H, dtype=np.float32))
_VIGNETTE = (1 - 0.07 * np.clip((_vx ** 2 * 0.8 + _vy ** 2) ** 0.9, 0, 1))[..., None]


def background(tg, energy=1.0, focus=None):
    """Slowly drifting pastel light on warm sand. `tg` is global film time so the background is
    continuous across scene cuts. `focus` = (x, y, strength) adds a periwinkle wash (0..1 coords)."""
    img = np.empty((_BH, _BW, 3), np.float32)
    img[:] = C.BG
    blobs = [
        (0.20 + 0.10 * breathe(tg, 23), 0.26 + 0.08 * breathe(tg, 17, 0.2), 0.34, C.WASH_PERI, 0.80),
        (0.82 + 0.08 * breathe(tg, 19, 0.5), 0.76 + 0.10 * breathe(tg, 27, 0.1), 0.30, C.WASH_MINT, 0.70),
        (0.64 + 0.12 * breathe(tg, 31, 0.7), 0.10 + 0.06 * breathe(tg, 13, 0.4), 0.26, C.WASH_LILAC, 0.60),
        (0.08 + 0.05 * breathe(tg, 29, 0.3), 0.94, 0.24, C.WASH_GOLD, 0.60),
    ]
    if focus:
        blobs.append((focus[0], focus[1], 0.30, C.WASH_PERI, 0.75 * focus[2]))
    for bx, by, rad, col, inten in blobs:
        g = (np.exp(-(((_xx - bx) * 16 / 9) ** 2 + (_yy - by) ** 2) / (2 * rad * rad)) * min(1.0, inten * energy))[..., None]
        img = img * (1 - g) + np.asarray(col, np.float32) * g
    big = np.asarray(Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((C.W, C.H), Image.BICUBIC), np.float32)
    big = big * _VIGNETTE + _DITHER
    return Image.fromarray(np.clip(big, 0, 255).astype(np.uint8)).convert("RGBA")


@lru_cache(maxsize=16)
def radial(size, color, strength=1.0):
    """Soft round light."""
    n = 96
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    d = np.sqrt((x - n / 2 + 0.5) ** 2 + (y - n / 2 + 0.5) ** 2) / (n / 2)
    a = np.clip(1 - d, 0, 1) ** 2.2 * 255 * strength
    arr = np.zeros((n, n, 4), np.uint8)
    arr[..., :3] = color
    arr[..., 3] = a.astype(np.uint8)
    return Image.fromarray(arr).resize((size, size), Image.BICUBIC)


def glow(canvas, cx, cy, size, color, alpha=1.0):
    q = max(32, int(size / 32) * 32)        # quantise so the cache stays small
    comp_center(canvas, radial(q, color), cx, cy, alpha)


# ---------------------------------------------------------------- phone mockup

SCR_W, SCR_H = 720, 1548          # hi-res screen (app captures are 400 x 860 points)
BEZEL = 20
PH_W, PH_H = SCR_W + 2 * BEZEL, SCR_H + 2 * BEZEL
_R_OUT, _R_SCR = 104, 86


def _rounded(size, radius, ss=2):
    m = Image.new("L", (size[0] * ss, size[1] * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] * ss - 1, size[1] * ss - 1), radius * ss, fill=255)
    return m.resize(size, Image.LANCZOS)


@lru_cache(maxsize=1)
def _phone_parts():
    body_mask = _rounded((PH_W, PH_H), _R_OUT)
    scr_mask = _rounded((SCR_W, SCR_H), _R_SCR)
    # body: near-black glass with a faint lighter rim
    rim = Image.new("RGBA", (PH_W, PH_H), (58, 54, 86, 255))
    inner = Image.new("RGBA", (PH_W - 6, PH_H - 6), (24, 22, 40, 255))
    rim.paste(inner, (3, 3), _rounded((PH_W - 6, PH_H - 6), _R_OUT - 3))
    rim.putalpha(body_mask)
    # soft drop shadow, stored small
    pad = 320
    sil = Image.new("L", (PH_W + 2 * pad, PH_H + 2 * pad), 0)
    sil.paste(body_mask, (pad, pad))
    small = sil.resize((sil.width // 8, sil.height // 8), Image.BILINEAR).filter(ImageFilter.GaussianBlur(11))
    shadow = Image.new("RGBA", small.size, (52, 44, 110, 255))
    shadow.putalpha(small)
    return rim, scr_mask, shadow, pad


@lru_cache(maxsize=24)
def screen_still(name):
    return Image.open(C.SHOTS[name]).convert("RGB").resize((SCR_W, SCR_H), Image.LANCZOS)


@lru_cache(maxsize=1)
def _rec_index():
    return C.recording_timeline()["frames"]


@lru_cache(maxsize=12)
def _rec_frame(file):
    return Image.open(C.RECORDING / file).convert("RGB").resize((SCR_W, SCR_H), Image.LANCZOS)


def screen_recording(rec_t):
    """The captured app frame that was on screen at recording time `rec_t`."""
    frames = _rec_index()
    best = frames[0]
    for f in frames:
        if f["t"] <= rec_t:
            best = f
        else:
            break
    return _rec_frame(best["file"])


_built = {}


def build_phone(screen, key=None):
    """Hi-res RGBA phone with `screen` (RGB, SCR_W x SCR_H) inside. `key` caches the result."""
    if key is not None and key in _built:
        return _built[key]
    rim, scr_mask, _, _ = _phone_parts()
    ph = rim.copy()
    ph.paste(screen, (BEZEL, BEZEL), scr_mask)
    if key is not None:
        if len(_built) > 14:
            _built.pop(next(iter(_built)))
        _built[key] = ph
    return ph


class Placed:
    """Where a phone ended up on the canvas; maps app coordinates (400 x 860 points) to canvas pixels."""

    def __init__(self, cx, cy, h):
        self.s = h / PH_H
        self.x0 = cx - PH_W * self.s / 2 + BEZEL * self.s
        self.y0 = cy - h / 2 + BEZEL * self.s
        self.k = SCR_W * self.s / 400.0

    def pt(self, u, v):
        return self.x0 + u * self.k, self.y0 + v * self.k


def draw_phone(canvas, phone, cx, cy, h, alpha=1.0, angle=0.0, shadow=0.6):
    """Draw a built phone at height `h` centred on (cx, cy). Returns a Placed mapper."""
    if alpha <= 0.004 or h < 8:
        return Placed(cx, cy, max(h, 8))
    s = h / PH_H
    if shadow > 0:
        _, _, sh, pad = _phone_parts()
        sw, shh = int((PH_W + 2 * pad) * s), int((PH_H + 2 * pad) * s)
        comp_center(canvas, sh.resize((sw, shh), Image.BILINEAR), cx, cy + 46 * s, alpha * shadow)
    img = phone.resize((max(1, int(PH_W * s)), max(1, int(h))), Image.LANCZOS if s < 0.75 else Image.BICUBIC)
    if abs(angle) > 0.05:
        img = img.rotate(angle, resample=Image.BICUBIC, expand=True)
    comp_center(canvas, img, cx, cy, alpha)
    return Placed(cx, cy, h)


# ---------------------------------------------------------------- UI accents

def focus_ring(canvas, placed, box, alpha=1.0, color=C.GOLD, radius=22, grow=0.0):
    """Glowing rounded outline around an app region `box` = (u0, v0, u1, v1) in app points."""
    if alpha <= 0.004:
        return
    x0, y0 = placed.pt(box[0], box[1])
    x1, y1 = placed.pt(box[2], box[3])
    g = 8 + grow
    x0, y0, x1, y1 = x0 - g, y0 - g, x1 + g, y1 + g
    pad = 40
    w, h = int(x1 - x0) + 2 * pad, int(y1 - y0) + 2 * pad
    if w <= 2 * pad or h <= 2 * pad:
        return
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    r = int(radius * placed.k) + int(g)
    ImageDraw.Draw(layer).rounded_rectangle((pad, pad, w - pad, h - pad), r, outline=color + (255,), width=5)
    halo = layer.filter(ImageFilter.GaussianBlur(12))
    comp(canvas, halo, x0 - pad, y0 - pad, alpha * 0.9)
    comp(canvas, layer, x0 - pad, y0 - pad, alpha)


def touch(canvas, x, y, alpha=1.0, ripple=None, scale=1.0):
    """A fingertip indicator; `ripple` in 0..1 draws an expanding tap ring."""
    if alpha <= 0.004:
        return
    r = int(30 * scale)
    size = r * 8
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size // 2
    if ripple is not None and 0 < ripple < 1:
        rr = r + ripple * r * 2.4
        d.ellipse((c - rr, c - rr, c + rr, c + rr), outline=C.PERI + (int(230 * (1 - ripple)),), width=max(2, int(5 * scale)))
    d.ellipse((c - r, c - r, c + r, c + r), fill=(38, 33, 66, 70), outline=(255, 255, 255, 245), width=max(2, int(4 * scale)))
    comp_center(canvas, layer, x, y, alpha)


@lru_cache(maxsize=32)
def _chip(text, color):
    from effects.typography import text_img
    t = text_img(text, "semi", 22, C.INK, 3)
    w, h = t.width + 64, 48
    ss = 2
    big = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    d.rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), h * ss // 2, fill=(255, 255, 255, 215), outline=(38, 33, 66, 34), width=2)
    d.ellipse((20 * ss, 18 * ss, 32 * ss, 30 * ss), fill=color + (255,))
    img = big.resize((w, h), Image.LANCZOS)
    img.alpha_composite(t, (44, (h - t.height) // 2 + 1))
    return img


def chip(canvas, text, x, y, alpha=1.0, color=C.MINT, anchor="l"):
    img = _chip(text, color)
    comp(canvas, img, x - (img.width / 2 if anchor == "c" else 0), y, alpha)


@lru_cache(maxsize=8)
def logo_disc(size):
    """The app's own logo on its white disc, as used in the app."""
    ss = 2
    big = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    ImageDraw.Draw(big).ellipse((0, 0, size * ss - 1, size * ss - 1), fill=(255, 255, 255, 255))
    disc = big.resize((size, size), Image.LANCZOS)
    logo = Image.open(C.LOGO).convert("RGBA")
    inner = int(size * 0.80)
    logo = logo.resize((inner, int(inner * logo.height / logo.width)), Image.LANCZOS)
    disc.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return disc


def draw_logo(canvas, cx, cy, size, alpha=1.0):
    if size < 4:
        return
    glow(canvas, cx, cy + size * 0.10, size * 2.1, (70, 64, 150), alpha * 0.34)   # soft drop shadow
    comp_center(canvas, logo_disc(int(size)), cx, cy, alpha)


def hairline(canvas, x0, x1, y, alpha=1.0, color=(38, 33, 66), thickness=2):
    if alpha <= 0.004 or x1 - x0 < 1:
        return
    layer = Image.new("RGBA", (int(x1 - x0), thickness), color + (255,))
    comp(canvas, layer, x0, y, alpha)
