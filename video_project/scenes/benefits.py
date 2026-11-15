"""Scene 05 — the value: three statements, each backed by something the app actually does."""
import math
from PIL import Image, ImageDraw
import config as C
from effects.animations import prog, window, ease_out_cubic, ease_out_expo, ease_in_out, ease_out_back
from effects.graphics import background, glow, comp, comp_center, hairline
from effects.typography import reveal, label, GRAD

B = C.BEAT
BEATS = [(0.02, 4.0 * B), (5 * B, 9.0 * B), (10 * B, 15.0 * B)]    # three statements: 5 + 5 + 6 beats


def network(canvas, t, t_in, t_out, cx, cy):
    """One host in the middle, nine phones around it, links drawing outward — the app's topology."""
    a = window(t, t_in, t_out, 0.5, 0.4)
    if a <= 0:
        return
    size, ss = 760, 2
    layer = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size * ss / 2
    for i in range(9):
        p = prog(t, t_in + 0.25 + i * 0.07, 0.7, ease_out_expo)
        ang = -math.pi / 2 + i * 2 * math.pi / 9 + (t - t_in) * 0.05
        r = 300 * ss
        x, y = c + math.cos(ang) * r * p, c + math.sin(ang) * r * p
        d.line((c, c, x, y), fill=C.PERI + (int(150 * p),), width=4)
        pulse = ((t - t_in) / (2 * C.BEAT) + i * 0.25) % 1.0                 # a bid travelling to the host
        px, py = c + math.cos(ang) * r * (1 - pulse), c + math.sin(ang) * r * (1 - pulse)
        d.ellipse((px - 9, py - 9, px + 9, py + 9), fill=C.GOLD + (int(255 * p * (1 - pulse)),))
        d.ellipse((x - 22, y - 22, x + 22, y + 22), fill=(255, 255, 255, 255), outline=C.PERI + (255,), width=6)
    hp = prog(t, t_in + 0.1, 0.7, ease_out_back)
    hr = 44 * ss * hp
    d.ellipse((c - hr, c - hr, c + hr, c + hr), fill=C.MINT + (255,))
    comp_center(canvas, layer.resize((size, size), Image.LANCZOS), cx, cy, a * 0.9)


def render(t, tg):
    canvas = background(tg, energy=0.85)
    glow(canvas, C.W / 2, 540, 1600, C.WASH_PERI, 0.6)
    # progress pips
    for i, (b0, b1) in enumerate(BEATS):
        on = 1.0 if b0 <= t < b1 + B else 0.0
        hairline(canvas, C.W / 2 - 66 + i * 48, C.W / 2 - 66 + i * 48 + 36, 912, (0.28 + 0.62 * on) * window(t, 0.1, 15.7 * B, 0.4, 0.3), C.INK, 4)

    b0, b1 = BEATS[0]
    label(canvas, "NOTHING TO SET UP", "semi", 24, C.MINT, C.W / 2, 352, window(t, b0, b1 + 0.2, 0.5, 0.3), "c", tracking=8)
    reveal(canvas, "No internet. No servers.", "xbold", 120, C.INK, C.W / 2, 410, t, b0, b1, "c", stagger=B / 2)
    reveal(canvas, "No ads.", "xbold", 120, C.MINT, C.W / 2, 548, t, b0 + 2 * B, b1 + 0.05, "c")
    reveal(canvas, "Everything stays on your phones.", "medium", 38, C.MUTED, C.W / 2, 716, t, b0 + 3 * B, b1 - 0.2, "c", stagger=0.03)

    b0, b1 = BEATS[1]
    network(canvas, t, b0, b1 + 0.45, 1400, 540)
    label(canvas, "PHONE TO PHONE", "semi", 24, C.GOLD, 170, 352, window(t, b0, b1 + 0.2, 0.5, 0.3), tracking=8)
    reveal(canvas, "Up to 10 teams.", "xbold", 120, C.INK, 170, 410, t, b0, b1)
    reveal(canvas, "One arena.", "xbold", 120, C.GOLD, 170, 548, t, b0 + B, b1 + 0.05)
    reveal(canvas, "Bots fill the empty seats.", "medium", 38, C.MUTED, 170, 716, t, b0 + 2 * B, b1 - 0.2, stagger=0.03)

    b0, b1 = BEATS[2]
    label(canvas, "YOURS TO KEEP", "semi", 24, C.PERI, C.W / 2, 352, window(t, b0, b1 + 0.2, 0.5, 0.3), "c", tracking=8)
    reveal(canvas, "Free.", "xbold", 120, C.INK, C.W / 2, 410, t, b0, b1, "c")
    reveal(canvas, "Open source.", "xbold", 120, GRAD, C.W / 2, 548, t, b0 + B, b1 + 0.05, "c")
    reveal(canvas, "MIT licensed on GitHub.", "medium", 38, C.MUTED, C.W / 2, 716, t, b0 + 2 * B, b1 - 0.2, "c", stagger=0.03)
    return canvas
