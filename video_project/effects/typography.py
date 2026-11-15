"""Text rendering: cached glyph runs and masked word-by-word reveals."""
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont
import config as C
from effects.animations import prog, ease_out_expo, ease_in_cubic
from effects.graphics import comp


@lru_cache(maxsize=None)
def font(key, size):
    return ImageFont.truetype(str(C.FONTS[key]), size)


GRAD = ("grad", (86, 92, 245), (160, 92, 236))        # periwinkle -> violet, for accent lines


@lru_cache(maxsize=512)
def text_img(text, key, size, color, tracking=0):
    """Text on a transparent strip whose height is the font's full line box (so words share a baseline).
    `color` is an RGB tuple, or ("grad", top_left, bottom_right) for a gradient fill."""
    if color and color[0] == "grad":
        mask = text_img(text, key, size, (255, 255, 255), tracking).getchannel("A")
        w, h = mask.size
        import numpy as np
        ramp = np.clip((np.linspace(0, 1, w)[None, :] * 0.75 + np.linspace(0, 1, h)[:, None] * 0.25), 0, 1)[..., None]
        rgb = (np.asarray(color[1]) * (1 - ramp) + np.asarray(color[2]) * ramp).astype("uint8")
        img = Image.fromarray(rgb, "RGB").convert("RGBA")
        img.putalpha(mask)
        return img
    f = font(key, size)
    asc, desc = f.getmetrics()
    if tracking:
        widths = [f.getlength(ch) + tracking for ch in text]
        w = int(sum(widths)) + 4
    else:
        w = int(f.getlength(text)) + 4
    img = Image.new("RGBA", (max(1, w), asc + desc + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if tracking:
        x = 0.0
        for ch, cw in zip(text, widths):
            d.text((x, 0), ch, font=f, fill=color)
            x += cw
    else:
        d.text((0, 0), text, font=f, fill=color)
    return img


def line_width(text, key, size, tracking=0):
    f = font(key, size)
    return sum(f.getlength(ch) + tracking for ch in text) if tracking else f.getlength(text)


def reveal(canvas, text, key, size, color, x, y, t, t_in, t_out=None, anchor="l", stagger=0.07, dur=0.75, alpha=1.0):
    """Words rise out of an invisible baseline mask one after another; optional staggered exit upward.
    (x, y) is the left / centre / right of the line box top, according to `anchor`."""
    words = text.split(" ")
    f = font(key, size)
    space = f.getlength(" ")
    widths = [f.getlength(w) for w in words]
    total = sum(widths) + space * (len(words) - 1)
    cx = x - total / 2 if anchor == "c" else x - total if anchor == "r" else x
    for i, (word, w) in enumerate(zip(words, widths)):
        p = prog(t, t_in + i * stagger, dur, ease_out_expo)
        a = p
        img = text_img(word, key, size, color)
        h = img.height
        dy = (1 - p) * h * 0.6
        if t_out is not None:
            q = prog(t, t_out + i * 0.025, 0.4, ease_in_cubic)
            a *= 1 - q
            dy -= q * h * 0.3
        if a > 0.004:
            visible = int(h - max(0, dy))          # the part still below the mask line stays hidden
            if visible > 0:
                comp(canvas, img.crop((0, 0, img.width, visible)) if dy > 0 else img, cx, y + dy, a * alpha)
        cx += w + space


def label(canvas, text, key, size, color, x, y, alpha=1.0, anchor="l", tracking=0):
    img = text_img(text, key, size, color, tracking)
    ox = x - img.width / 2 if anchor == "c" else x - img.width if anchor == "r" else x
    comp(canvas, img, ox, y, alpha)
    return img.width
