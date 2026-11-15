"""Scene 06 — the brand moment: logo, name, tagline, call to action, and out."""
from PIL import Image, ImageDraw
from functools import lru_cache
import config as C
from effects.animations import prog, ease_out_back, ease_out_expo, ease_out_cubic, window, breathe
from effects.graphics import background, glow, draw_logo, comp, comp_center, radial
from effects.typography import reveal, label, text_img


@lru_cache(maxsize=1)
def cta():
    t = text_img("Download the free Android app", "bold", 34, (255, 255, 255))
    w, h, ss = t.width + 96, 84, 2
    big = Image.new("RGBA", (w * ss, h * ss), (0, 0, 0, 0))
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * ss - 1, h * ss - 1), h * ss // 2, fill=C.PERI_DEEP + (255,))
    img = big.resize((w, h), Image.LANCZOS)
    img.alpha_composite(t, (48, (h - t.height) // 2 + 1))
    return img


def render(t, tg):
    canvas = background(tg, energy=1.0, focus=(0.5, 0.42, 1.0))
    bloom = 1 - prog(t, 0.0, 1.8, ease_out_cubic)
    glow(canvas, C.W / 2, 400, 2400, C.PERI, 0.40 * bloom)
    ring = prog(t, 0.0, 1.4, ease_out_expo)
    comp_center(canvas, radial(int((300 + 1700 * ring) / 32) * 32, C.PERI), C.W / 2, 400, 0.28 * (1 - ring))
    glow(canvas, C.W / 2, 330, 760 + 40 * breathe(t, 4), C.WASH_PERI, 0.9 * prog(t, 0.2, 1.2, ease_out_cubic))

    s = prog(t, 0.1, 0.9, ease_out_back)
    draw_logo(canvas, C.W / 2, 300, 210 * s, min(1, s * 1.4))
    a = prog(t, 0.4, 0.7, ease_out_expo)
    name = text_img(C.PRODUCT, "brand", 176, C.PERI)
    comp(canvas, name, C.W / 2 - name.width / 2, 432 + (1 - a) * 40, a)
    reveal(canvas, "Auction night, fully offline.", "bold", 52, C.MUTED, C.W / 2, 632, t, 0.95, None, "c")

    c = prog(t, 1.7, 0.8, ease_out_back)
    if c > 0:
        img = cta()
        pulse = 1 + 0.012 * breathe(t, 2.2)
        w, h = int(img.width * (0.9 + 0.1 * c) * pulse), int(img.height * (0.9 + 0.1 * c) * pulse)
        glow(canvas, C.W / 2, 806, 560, C.PERI, 0.30 * min(1, c))
        comp_center(canvas, img.resize((w, h), Image.LANCZOS), C.W / 2, 790, min(1, c * 1.3))
    label(canvas, C.URL, "semi", 30, C.INK, C.W / 2, 874, prog(t, 2.3, 0.8, ease_out_cubic) * 0.92, "c", tracking=1)
    return canvas
