"""Scene 02 — the problem. Four bars: three pains land on beats 0 / 2 / 4, are struck out on beat 7,
and the punchline arrives on the downbeat of the third bar."""
import config as C
from effects.animations import prog, ease_out_cubic, ease_in_cubic, ease_in_out, window
from effects.graphics import background, glow, hairline
from effects.typography import reveal, label, line_width

B = C.BEAT
PAINS = ["A spreadsheet for the purses.", "A group chat for the bids.", "An argument over who bid first."]
STRIKE, CLEAR, PUNCH, OUT = 6 * B, 7.5 * B, 8 * B, 14.4 * B


def render(t, tg):
    canvas = background(tg, energy=0.75)
    label(canvas, "TODAY, IT TAKES", "semi", 24, C.DIM, 250, 300, window(t, 0.05, CLEAR + 0.2, 0.5, 0.35), tracking=8)
    for i, pain in enumerate(PAINS):
        y = 356 + i * 124
        hit = STRIKE + i * B / 2                                   # one strike per eighth note
        dim = 1 - 0.62 * prog(t, hit, 0.4, ease_out_cubic)
        reveal(canvas, pain, "bold", 84, C.INK, 250, y, t, 0.05 + i * 2 * B, CLEAR + i * 0.04, alpha=dim, stagger=0.06)
        w = line_width(pain, "bold", 84)
        p = prog(t, hit, 0.36, ease_in_out)
        a = 1 - prog(t, CLEAR + i * 0.04, 0.3, ease_in_cubic)
        hairline(canvas, 236, 236 + (w + 28) * p, y + 56, a, C.CORAL, 6)
    glow(canvas, C.W / 2, 540, 1500, (255, 200, 196), 0.75 * window(t, PUNCH, 16 * B, 0.8, 0.6))
    reveal(canvas, "And it all stops", "xbold", 112, C.INK, C.W / 2, 400, t, PUNCH, OUT, "c", stagger=B / 4)
    reveal(canvas, "when the internet does.", "xbold", 112, C.CORAL, C.W / 2, 534, t, PUNCH + 2 * B, OUT + 0.07, "c", stagger=B / 4)
    return canvas
