"""Scene 01 — the hook: a single confident line on a dark, breathing field of light."""
import config as C
from effects.animations import prog, ease_out_cubic, ease_in_cubic, ease_out_expo, window
from effects.graphics import background, glow, hairline
from effects.typography import reveal, label

OUT = 4.25


def render(t, tg):
    canvas = background(tg, energy=0.55 + 0.45 * prog(t, 0.0, 2.5, ease_out_cubic))
    # a soft light blooms behind the headline as it lands
    glow(canvas, C.W / 2, 520, 1700, C.WASH_PERI, 0.85 * window(t, 0.3, 4.8, 1.6, 0.8))
    label(canvas, "AUCTION NIGHT", "semi", 24, C.MINT, C.W / 2, 368, window(t, 0.25, OUT + 0.3, 0.8, 0.4), "c", tracking=8)
    reveal(canvas, "Every fan thinks", "xbold", 118, C.INK, C.W / 2, 426, t, 0.55, OUT, "c")
    reveal(canvas, "they'd win the auction.", "xbold", 118, C.PERI, C.W / 2, 566, t, 1.05, OUT + 0.08, "c")
    # a hairline draws out from the centre under the line, then retracts
    p = prog(t, 1.9, 1.0, ease_out_expo) * (1 - prog(t, OUT, 0.4, ease_in_cubic))
    hairline(canvas, C.W / 2 - 240 * p, C.W / 2 + 240 * p, 742, 0.45 * p, C.INK)
    return canvas
