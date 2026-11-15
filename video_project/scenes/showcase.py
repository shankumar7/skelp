"""Scene 04 — the product experience: the real app, in four beats.
A  Host / join      (dashboard)          0.0 –  5.6
B  Live bidding     (screen recording)   5.6 – 13.5
C  Scout & squads   (two phones)        13.5 – 18.0
D  Results          (final table)       18.0 – 22.5
One "hero" phone carries through A -> B; the camera moves are keyframed on its centre and height."""
from PIL import Image
import config as C
from effects.animations import prog, lerp, keyframes, window, ease_out_cubic, ease_in_out, ease_out_expo, ease_in_cubic, breathe
from effects.graphics import (background, build_phone, draw_phone, screen_still, screen_recording, focus_ring, touch, chip, glow)
from effects.typography import reveal, label

BIDS, SOLD = C.live_events()
A_OUT, B_IN, B_OUT, C_IN, C_OUT, D_IN = 4.7, 6.0, 13.2, 13.7, 17.7, 18.1

# hero phone camera: (time, value)
CX = [(0, 1400), (5.25, 1400), (6.3, 520), (13.1, 520), (13.8, 300)]
H = [(0, 940), (1.3, 940), (2.8, 1290), (5.0, 1290), (6.3, 960), (6.5, 960), (7.1, 1250), (10.5, 1250), (11.2, 1180), (13.1, 1180)]
CY = [(0, 560), (1.3, 560), (2.8, 842), (3.4, 842), (4.1, 716), (5.0, 716), (6.3, 560), (6.5, 560), (7.1, 150), (10.5, 150), (11.2, 838), (13.1, 838)]


def copy_block(canvas, t, x, t_in, t_out, tag, color, lines, sub):
    """Chip + two-line headline + supporting lines, with staggered entrance and exit."""
    chip(canvas, tag, x, 318, window(t, t_in, t_out + 0.25, 0.5, 0.35), color)
    for i, (text, col) in enumerate(lines):
        reveal(canvas, text, "xbold", 88, col, x, 396 + i * 104, t, t_in + 0.12 + i * 0.14, t_out + i * 0.04)
    for i, text in enumerate(sub):
        reveal(canvas, text, "medium", 34, C.MUTED, x, 632 + i * 50, t, t_in + 0.5 + i * 0.1, t_out + 0.08, stagger=0.025, dur=0.6)


def hero_screen(t):
    """What the hero phone shows: dashboard -> live recording -> the hammer."""
    if t < 5.7:
        return build_phone(screen_still("dashboard"), "dashboard")
    live = screen_recording(max(0.3, C.LIVE_REC0 + (t - C.LIVE_IN)))
    if t < 5.92:
        return build_phone(Image.blend(screen_still("dashboard"), live, prog(t, 5.7, 0.22, ease_in_out)))
    if t < C.HAMMER_IN - 0.12:
        rec_t = max(0.3, C.LIVE_REC0 + (t - C.LIVE_IN))
        return build_phone(screen_recording(rec_t), ("rec", round(rec_t * 8)))
    hammer = screen_recording(C.HAMMER_REC0 + (t - C.HAMMER_IN))
    if t < C.HAMMER_IN + 0.12:
        return build_phone(Image.blend(live, hammer, prog(t, C.HAMMER_IN - 0.12, 0.24)))
    rec_t = C.HAMMER_REC0 + (t - C.HAMMER_IN)
    return build_phone(hammer, ("rec", round(rec_t * 8)))


def render(t, tg):
    fx = keyframes(t, [(0, 0.73), (5.1, 0.73), (6.3, 0.27), (13.3, 0.27), (14.2, 0.74), (22.5, 0.74)])
    canvas = background(tg, energy=1.0, focus=(fx, 0.5, 1.0))

    # ------------------------------------------------ hero phone (beats A and B)
    hero_a = 1 - prog(t, B_OUT, 0.6, ease_in_cubic)
    if hero_a > 0:
        cx, cy, h = keyframes(t, CX), keyframes(t, CY), keyframes(t, H)
        placed = draw_phone(canvas, hero_screen(t), cx, cy + 4 * breathe(t, 5), h, hero_a)
        # A: focus moves from "Find nearby arenas" to "Scan QR"
        focus_ring(canvas, placed, (24, 168, 376, 266), window(t, 2.5, 3.6, 0.35, 0.3), C.GOLD, 24)
        focus_ring(canvas, placed, (40, 322, 139, 368), window(t, 3.95, 4.85, 0.3, 0.3), C.GOLD, 16)
        # B: a fingertip taps BID in time with the recording
        bx, by = placed.pt(200, 808)
        ta = window(t, 6.75, 10.55, 0.35, 0.35)
        if ta > 0:
            slide = prog(t, 6.75, 0.5, ease_out_cubic)
            ripple = None
            press = 1.0
            for b in BIDS:
                if 0 <= t - b < 0.5:
                    ripple = (t - b) / 0.5
                    press = 0.86 + 0.14 * ripple
            touch(canvas, bx + (1 - slide) * 170, by + (1 - slide) * 120, ta, ripple, placed.k / 1.9 * press)

    copy_block(canvas, t, 150, 0.35, A_OUT, "01   HOST OR JOIN", C.MINT,
               [("One phone hosts.", C.INK), ("Everyone joins.", C.PERI)],
               ["Over Wi-Fi or a mobile hotspot.", "Scan a QR code and you're in."])
    copy_block(canvas, t, 1010, B_IN + 0.3, B_OUT, "02   LIVE BIDDING", C.GOLD,
               [("Real auction rules.", C.INK), ("Real tension.", C.GOLD)],
               ["Base prices, bid increments and a clock", "that resets on every bid."])

    # ------------------------------------------------ beat C: two phones drift in parallax
    ca = window(t, C_IN, C_OUT + 0.45, 0.7, 0.45)
    if ca > 0:
        e = prog(t, C_IN, 1.1, ease_out_expo)
        drift = (t - C_IN) * 9
        draw_phone(canvas, build_phone(screen_still("squads"), "squads"), 1660 + (1 - e) * 420, 600 + drift, 800, ca * 0.96, angle=5, shadow=0.5)
        draw_phone(canvas, build_phone(screen_still("pool"), "pool"), 1280 + (1 - e) * 300, 590 - drift, 930, ca, angle=-4)
    copy_block(canvas, t, 150, C_IN + 0.15, C_OUT, "03   SCOUT AND BUILD", C.PERI,
               [("137 players.", C.INK), ("One purse.", C.PERI)],
               ["Search the pool, track every sale", "and build your squad."])

    # ------------------------------------------------ beat D: the final table
    da = prog(t, D_IN, 0.7, ease_out_cubic)
    if da > 0:
        h = keyframes(t, [(D_IN, 860), (D_IN + 0.9, 940), (19.4, 940), (20.5, 1240), (22.5, 1270)])
        cy = keyframes(t, [(D_IN, 600), (D_IN + 0.9, 560), (19.4, 560), (20.5, 800), (21.2, 800), (22.3, 610)])
        placed = draw_phone(canvas, build_phone(screen_still("results"), "results"), 1400, cy + 4 * breathe(t, 5), h, da)
        focus_ring(canvas, placed, (20, 97, 380, 237), window(t, 20.3, 21.3, 0.3, 0.3), C.GOLD, 30)
    copy_block(canvas, t, 150, D_IN + 0.2, 22.05, "04   THE FINAL TABLE", C.GOLD,
               [("Best eleven", C.INK), ("takes the title.", C.GOLD)],
               ["Squads ranked by power.", "Share the result in one tap."])
    # clear the stage for the next scene
    if t > 21.9:
        veil = background(tg, energy=1.0, focus=(fx, 0.5, 1.0))
        from effects.graphics import comp
        comp(canvas, veil, 0, 0, prog(t, 21.9, 0.55, ease_in_out))
    return canvas
