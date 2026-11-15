"""Scene 03 — the reveal: logo, name and tagline, then the app itself rises into frame."""
import config as C
from effects.animations import prog, lerp, ease_out_cubic, ease_in_out, ease_out_back, ease_out_expo, window, breathe
from effects.graphics import background, glow, draw_logo, build_phone, draw_phone, screen_still, comp_center, radial
from effects.typography import reveal, label, text_img
from effects.graphics import comp
from PIL import Image

MOVE = 2.7          # the lock-up slides left and the phone comes in
HERO = dict(cx=1400, cy=560, h=940)


def lockup(canvas, t, p):
    """Logo + name + tagline. p = 0 centred hero lock-up, p = 1 docked on the left."""
    cx = lerp(C.W / 2, 500, p)
    logo_size = lerp(230, 150, p)
    logo_y = lerp(360, 330, p)
    s = prog(t, 0.12, 0.9, ease_out_back)
    draw_logo(canvas, cx, logo_y, logo_size * s, min(1, s * 1.4))
    name_size = int(lerp(190, 150, p) / 2) * 2
    name = text_img(C.PRODUCT, "brand", name_size, C.PERI)
    a = prog(t, 0.45, 0.7, ease_out_expo)
    comp(canvas, name, cx - name.width / 2, lerp(506, 440, p) + (1 - a) * 40, a)


def render(t, tg):
    p = prog(t, MOVE, 1.3, ease_in_out)
    canvas = background(tg, energy=1.0, focus=(lerp(0.5, 0.73, p), 0.5, 0.5 + 0.5 * p))
    # impact bloom on the downbeat
    bloom = 1 - prog(t, 0.0, 1.6, ease_out_cubic)
    glow(canvas, C.W / 2, 440, 2200, C.PERI, 0.42 * bloom)
    ring = prog(t, 0.0, 1.3, ease_out_expo)
    comp_center(canvas, radial(int((300 + 1500 * ring) / 32) * 32, C.PERI), C.W / 2, 440, 0.30 * (1 - ring))

    # phone rises from below with a touch of motion trail
    q = prog(t, MOVE + 0.6, 1.3, ease_out_expo)       # after the lock-up has cleared the right half
    if q > 0:
        mix = prog(t, 5.15, 0.6, ease_in_out)          # the app "opens": welcome -> dashboard
        if mix <= 0:
            phone = build_phone(screen_still("welcome"), "welcome")
        elif mix >= 1:
            phone = build_phone(screen_still("dashboard"), "dashboard")
        else:
            phone = build_phone(Image.blend(screen_still("welcome"), screen_still("dashboard"), mix))
        y = HERO["cy"] + (1 - q) * 900
        h = HERO["h"] * lerp(0.86, 1.0, q)
        for k, ghost in ((2, 0.10), (1, 0.18)):            # motion trail while it is moving fast
            if q < 0.9:
                draw_phone(canvas, phone, HERO["cx"], y + k * 46 * (1 - q), h, ghost * (1 - q), shadow=0)
        draw_phone(canvas, phone, HERO["cx"], y + 5 * breathe(t, 5), h, min(1, q * 2))

    lockup(canvas, t, p)
    reveal(canvas, "The player auction", "bold", 54, C.INK, lerp(C.W / 2, 500, p), lerp(716, 624, p), t, 1.15, None, "c")
    reveal(canvas, "you play with friends.", "bold", 54, C.MUTED, lerp(C.W / 2, 500, p), lerp(784, 692, p), t, 1.4, None, "c")
    a = prog(t, MOVE + 1.0, 0.7, ease_out_cubic)
    label(canvas, "FULLY OFFLINE  ·  ANDROID  ·  FREE", "semi", 22, C.MUTED, 500, 800, a, "c", tracking=5)
    # hand over to the showcase: the lock-up clears, the phone stays
    out = prog(t, 6.9, 0.55, ease_in_out)
    if out > 0:
        veil = background(tg, energy=1.0, focus=(0.73, 0.5, 1.0)).crop((0, 0, 1000, C.H))
        comp(canvas, veil, 0, 0, out)
    return canvas
