"""Scene 01 — the hook. Two bars of the track's intro: one line, landing word by word on the beat.
The film starts 0.25 s before the first downbeat, so local beat n is at PHASE + n * BEAT."""
import config as C
from effects.animations import prog, ease_out_cubic, ease_in_cubic, ease_out_expo, window
from effects.graphics import background, glow, hairline
from effects.typography import reveal, label, GRAD


def at(beat):
    return C.PHASE + beat * C.BEAT


OUT = at(6.6)


def render(t, tg):
    canvas = background(tg, energy=0.6 + 0.4 * prog(t, 0.0, 2.2, ease_out_cubic))
    glow(canvas, C.W / 2, 520, 1700, C.WASH_PERI, 0.85 * window(t, 0.2, at(8), 1.4, 0.7))
    label(canvas, "AUCTION NIGHT", "semi", 24, C.MINT, C.W / 2, 368, window(t, at(0), OUT + 0.3, 0.6, 0.4), "c", tracking=8)
    reveal(canvas, "Every fan thinks", "xbold", 118, C.INK, C.W / 2, 426, t, at(0) + 0.05, OUT, "c", stagger=C.BEAT / 3)
    reveal(canvas, "they'd win the auction.", "xbold", 118, GRAD, C.W / 2, 566, t, at(2), OUT + 0.08, "c", stagger=C.BEAT / 4)
    p = prog(t, at(4), 0.9, ease_out_expo) * (1 - prog(t, OUT, 0.4, ease_in_cubic))
    hairline(canvas, C.W / 2 - 240 * p, C.W / 2 + 240 * p, 742, 0.45 * p, C.INK)
    return canvas
