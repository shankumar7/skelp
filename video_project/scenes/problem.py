"""Scene 02 — the problem: what auction night with friends actually takes today."""
import config as C
from effects.animations import prog, ease_out_cubic, ease_in_cubic, ease_out_expo, ease_in_out, window
from effects.graphics import background, glow, hairline
from effects.typography import reveal, label, line_width

PAINS = ["A spreadsheet for the purses.", "A group chat for the bids.", "An argument over who bid first."]
STRIKE, CLEAR, PUNCH = 3.55, 4.55, 4.95


def render(t, tg):
    canvas = background(tg, energy=0.7)
    label(canvas, "TODAY, IT TAKES", "semi", 24, C.DIM, 250, 300, window(t, 0.15, CLEAR + 0.2, 0.6, 0.4), tracking=8)
    for i, pain in enumerate(PAINS):
        y = 356 + i * 124
        t_in = 0.35 + i * 0.85
        dim = 1 - 0.62 * prog(t, STRIKE + i * 0.14, 0.5, ease_out_cubic)      # greys out as it is struck
        reveal(canvas, pain, "bold", 84, C.INK, 250, y, t, t_in, CLEAR + i * 0.05, alpha=dim)
        # coral strike-through sweeps across each line
        w = line_width(pain, "bold", 84)
        p = prog(t, STRIKE + i * 0.14, 0.55, ease_in_out)
        a = 1 - prog(t, CLEAR + i * 0.05, 0.35, ease_in_cubic)
        hairline(canvas, 236, 236 + (w + 28) * p, y + 56, a, C.CORAL, 6)
    # the punchline
    glow(canvas, C.W / 2, 540, 1500, (255, 200, 196), 0.75 * window(t, PUNCH, 7.5, 1.0, 0.6))
    reveal(canvas, "And it all stops", "xbold", 112, C.INK, C.W / 2, 400, t, PUNCH, 6.85, "c")
    reveal(canvas, "when the internet does.", "xbold", 112, C.CORAL, C.W / 2, 534, t, PUNCH + 0.4, 6.92, "c")
    return canvas
