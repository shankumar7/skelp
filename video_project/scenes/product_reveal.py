"""Scene 03 — the reveal. The music's main section re-enters on this downbeat: logo, name, tagline,
then the phone swings up into frame in 3D and the app opens."""
from PIL import Image
import config as C
from effects.animations import prog, lerp, ease_out_cubic, ease_in_out, ease_out_back, ease_out_expo, breathe
from effects.graphics import background, glow, draw_logo, build_phone, draw_phone, screen_still, comp_center, radial, comp
from effects.typography import reveal, label, text_img, GRAD

B = C.BEAT
MOVE = 6 * B           # the lock-up docks left
PHONE_IN = 7 * B       # the phone rises (lands on the downbeat of bar 3)
OPEN = 12 * B          # welcome -> dashboard, on the downbeat of bar 4
HERO = dict(cx=1400, cy=560, h=940)


def lockup(canvas, t, p):
    cx = lerp(C.W / 2, 500, p)
    s = prog(t, 0.0, 0.8, ease_out_back)
    draw_logo(canvas, cx, lerp(350, 330, p), lerp(230, 150, p) * s, min(1, s * 1.5))
    name = text_img(C.PRODUCT, "brand", int(lerp(196, 150, p) / 2) * 2, GRAD)
    a = prog(t, B, 0.6, ease_out_expo)
    comp(canvas, name, cx - name.width / 2, lerp(500, 440, p) + (1 - a) * 44, a)


def render(t, tg):
    p = prog(t, MOVE, 2 * B, ease_in_out)
    canvas = background(tg, energy=1.0, focus=(lerp(0.5, 0.73, p), 0.5, 0.5 + 0.5 * p))
    bloom = 1 - prog(t, 0.0, 1.5, ease_out_cubic)
    glow(canvas, C.W / 2, 440, 2200, C.PERI, 0.42 * bloom)
    ring = prog(t, 0.0, 1.2, ease_out_expo)
    comp_center(canvas, radial(int((300 + 1500 * ring) / 32) * 32, C.PERI), C.W / 2, 440, 0.30 * (1 - ring))

    q = prog(t, PHONE_IN, 2.2 * B, ease_out_expo)
    if q > 0:
        mix = prog(t, OPEN - 0.12, 0.3, ease_in_out)
        if mix <= 0:
            phone = build_phone(screen_still("welcome"), "welcome")
        elif mix >= 1:
            phone = build_phone(screen_still("dashboard"), "dashboard")
        else:
            phone = build_phone(Image.blend(screen_still("welcome"), screen_still("dashboard"), mix))
        y = HERO["cy"] + (1 - q) * 900
        h = HERO["h"] * lerp(0.86, 1.0, q)
        # swings in turned away, settles, then squares up to the camera for the hand-over
        tilt = lerp(-34, -13, q) * (1 - prog(t, 13.4 * B, 2 * B, ease_in_out)) + 1.5 * breathe(t, 6)
        for k, ghost in ((2, 0.10), (1, 0.18)):
            if q < 0.9:
                draw_phone(canvas, phone, HERO["cx"], y + k * 46 * (1 - q), h, ghost * (1 - q), shadow=0, tilt=tilt)
        draw_phone(canvas, phone, HERO["cx"], y + 5 * breathe(t, 5), h, min(1, q * 2), tilt=tilt,
                   sheen=prog(t, PHONE_IN + 0.5 * B, 3 * B))

    lockup(canvas, t, p)
    reveal(canvas, "The player auction", "bold", 54, C.INK, lerp(C.W / 2, 500, p), lerp(716, 624, p), t, 2 * B, None, "c", stagger=B / 4)
    reveal(canvas, "you play with friends.", "bold", 54, C.MUTED, lerp(C.W / 2, 500, p), lerp(784, 692, p), t, 3 * B, None, "c", stagger=B / 4)
    label(canvas, "FULLY OFFLINE  ·  ANDROID  ·  FREE", "semi", 22, C.MUTED, 500, 800, prog(t, 8 * B, 0.6, ease_out_cubic), "c", tracking=5)
    out = prog(t, 14.6 * B, 1.2 * B, ease_in_out)
    if out > 0:
        veil = background(tg, energy=1.0, focus=(0.73, 0.5, 1.0)).crop((0, 0, 1000, C.H))
        comp(canvas, veil, 0, 0, out)
    return canvas
