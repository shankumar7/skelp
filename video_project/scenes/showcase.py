"""Scene 04 — the product experience: the real app, in four beats of the film, twelve bars of music.
A  Host / join      (dashboard)          beats  0 – 12
B  Live bidding     (screen recording)   beats 12 – 28   taps on beats 14 and 20, SOLD on beat 24
C  Scout & squads   (two phones)         beats 28 – 36   (the music's main section re-enters here)
D  The final table  (results)            beats 36 – 48
A "hero" phone carries through A -> B. Camera moves are keyframed on its centre, height and 3D tilt."""
from PIL import Image
import config as C
from effects.animations import prog, lerp, keyframes, window, ease_out_cubic, ease_in_out, ease_out_expo, ease_in_cubic, breathe
from effects.graphics import background, build_phone, draw_phone, screen_still, screen_recording, focus_ring, touch, chip, comp, hairline
from effects.typography import reveal, label, GRAD, line_width

B = C.BEAT
BIDS, SOLD = C.live_events()
A_OUT, B_IN, B_OUT, C_IN, C_OUT, D_IN, D_OUT = 9.3 * B, 12.4 * B, 26.2 * B, 28 * B, 35 * B, 36 * B, 46 * B
CUT_LIVE, CUT_HAMMER = 11.6 * B, C.HAMMER_CUT_BEAT * B

K = lambda pairs: [(b * B, v) for b, v in pairs]       # keyframes written in beats
CX = K([(0, 1400), (10.4, 1400), (12.4, 520), (26, 520)])
H = K([(0, 940), (3, 940), (6, 1290), (9.8, 1290), (12.4, 960), (12.6, 960), (13.7, 1250), (20.8, 1250), (22.2, 1180), (26, 1180)])
CY = K([(0, 560), (3, 560), (6, 842), (7.2, 842), (8, 716), (9.8, 716), (12.4, 560), (12.6, 560), (13.7, 150), (20.8, 150), (22.2, 838), (26, 838)])
# 3D tilt: square to camera while something on screen is being pointed at, turned slightly otherwise
TILT = K([(0, 0), (9.8, 0), (11.2, 12), (12.6, 9), (13.4, 0), (21, 0), (22.2, 7), (26, 9)])

NAV = [("Host", 0, 12), ("Bid", 12, 28), ("Scout", 28, 36), ("Win", 36, 48)]


def navigator(canvas, t):
    """A slim chapter bar under the copy column: where we are in the tour, filling in time with the music.
    It sits on whichever side the text is on, so it never touches the phone."""
    right = 11 * B <= t < 27 * B                       # during the bidding beat the copy is on the right
    a = window(t, 0.6 * B, 10.2 * B, 0.5, 0.4) + window(t, 12.6 * B, 26.4 * B, 0.5, 0.4) + window(t, 28.2 * B, 46.4 * B, 0.5, 0.4)
    if a <= 0:
        return
    x = 1010 if right else 150
    for name, b0, b1 in NAV:
        active = b0 * B <= t < b1 * B
        done = t >= b1 * B
        w = 132
        hairline(canvas, x, x + w, 900, a * 0.16, C.INK, 3)
        fill = 1.0 if done else prog(t, b0 * B, (b1 - b0) * B) if active else 0.0
        hairline(canvas, x, x + w * fill, 900, a, C.PERI, 3)
        label(canvas, name.upper(), "semi", 19, C.INK if active else C.DIM, x, 914, a * (1.0 if active else 0.8), tracking=4)
        x += 152


def copy_block(canvas, t, x, t_in, t_out, tag, color, lines, sub):
    chip(canvas, tag, x, 318, window(t, t_in, t_out + 0.25, 0.45, 0.35), color)
    for i, (text, col) in enumerate(lines):
        reveal(canvas, text, "xbold", 88, col, x, 396 + i * 104, t, t_in + 0.1 + i * B / 2, t_out + i * 0.04, stagger=0.06)
    for i, text in enumerate(sub):
        reveal(canvas, text, "medium", 34, C.MUTED, x, 632 + i * 50, t, t_in + B + i * 0.1, t_out + 0.08, stagger=0.025, dur=0.6)


def hero_screen(t):
    """What the hero phone shows: dashboard -> live recording -> the hammer."""
    if t < CUT_LIVE:
        return build_phone(screen_still("dashboard"), "dashboard")
    live_t = C.rec_time_live(t)
    live = screen_recording(live_t)
    if t < CUT_LIVE + 0.2:
        return build_phone(Image.blend(screen_still("dashboard"), live, prog(t, CUT_LIVE, 0.2, ease_in_out)))
    if t < CUT_HAMMER - 0.1:
        return build_phone(live, ("rec", round(live_t * 8)))
    hammer_t = C.rec_time_hammer(t)
    hammer = screen_recording(hammer_t)
    if t < CUT_HAMMER + 0.1:
        return build_phone(Image.blend(live, hammer, prog(t, CUT_HAMMER - 0.1, 0.2)))
    return build_phone(hammer, ("rec", round(hammer_t * 8)))


def render(t, tg):
    fx = keyframes(t, K([(0, 0.73), (10.4, 0.73), (12.4, 0.27), (26.4, 0.27), (28.4, 0.74), (48, 0.74)]))
    canvas = background(tg, energy=1.0, focus=(fx, 0.5, 1.0))

    # ------------------------------------------------ hero phone (A and B)
    hero_a = 1 - prog(t, B_OUT, 1.2 * B, ease_in_cubic)
    if hero_a > 0:
        cx, cy, h = keyframes(t, CX), keyframes(t, CY), keyframes(t, H)
        kick = 1 + 0.012 * max(0.0, 1 - (t - SOLD) / 0.35) * (t >= SOLD)          # a small bump as the hammer falls
        placed = draw_phone(canvas, hero_screen(t), cx, cy + 4 * breathe(t, 5), h * kick, hero_a, tilt=keyframes(t, TILT))
        focus_ring(canvas, placed, (24, 168, 376, 266), window(t, 5.6 * B, 7.4 * B, 0.3, 0.3), C.GOLD, 24)
        focus_ring(canvas, placed, (40, 322, 139, 368), window(t, 7.9 * B, 9.6 * B, 0.3, 0.3), C.GOLD, 16)
        bx, by = placed.pt(200, 808)
        ta = window(t, 12.9 * B, 21 * B, 0.3, 0.3)
        if ta > 0:
            slide = prog(t, 12.9 * B, 0.5, ease_out_cubic)
            ripple, press = None, 1.0
            for b in BIDS:
                if 0 <= t - b < 0.5:
                    ripple = (t - b) / 0.5
                    press = 0.86 + 0.14 * ripple
            touch(canvas, bx + (1 - slide) * 170, by + (1 - slide) * 120, ta, ripple, placed.k / 1.9 * press)

    copy_block(canvas, t, 150, 0.5 * B, A_OUT, "01   HOST OR JOIN", C.MINT,
               [("One phone hosts.", C.INK), ("Everyone joins.", GRAD)],
               ["Over Wi-Fi or a mobile hotspot.", "Scan a QR code and you're in."])
    copy_block(canvas, t, 1010, B_IN, B_OUT, "02   LIVE BIDDING", C.GOLD,
               [("Real auction rules.", C.INK), ("Real tension.", C.GOLD)],
               ["Base prices, bid increments and a clock", "that resets on every bid."])

    # ------------------------------------------------ C: two phones facing each other, drifting
    ca = window(t, C_IN - 0.15, C_OUT + 0.5, 0.6, 0.45)
    if ca > 0:
        e = prog(t, C_IN - 0.15, 1.1, ease_out_expo)
        drift = (t - C_IN) * 9
        draw_phone(canvas, build_phone(screen_still("squads"), "squads"), 1650 + (1 - e) * 460, 600 + drift, 800, ca * 0.97,
                   shadow=0.5, tilt=lerp(34, 20, e) + (t - C_IN) * 0.8)
        draw_phone(canvas, build_phone(screen_still("pool"), "pool"), 1270 + (1 - e) * 320, 590 - drift, 930, ca,
                   tilt=lerp(-30, -14, e) - (t - C_IN) * 0.8, sheen=prog(t, C_IN + 0.3, 3 * B))
    copy_block(canvas, t, 150, C_IN, C_OUT, "03   SCOUT AND BUILD", C.PERI,
               [("137 players.", C.INK), ("One purse.", GRAD)],
               ["Search the pool, track every sale", "and build your squad."])

    # ------------------------------------------------ D: the final table
    da = prog(t, D_IN - 0.1, 0.6, ease_out_cubic)
    if da > 0:
        h = keyframes(t, K([(36, 860), (37.6, 940), (39, 940), (41, 1240), (48, 1270)]))
        cy = keyframes(t, K([(36, 600), (37.6, 560), (39, 560), (41, 800), (43, 800), (45.4, 610)]))
        tilt = keyframes(t, K([(36, -24), (38.6, -9), (40.4, 0), (48, 0)]))
        placed = draw_phone(canvas, build_phone(screen_still("results"), "results"), 1400, cy + 4 * breathe(t, 5), h, da, tilt=tilt)
        focus_ring(canvas, placed, (20, 97, 380, 237), window(t, 40.8 * B, 43 * B, 0.3, 0.3), C.GOLD, 30)
    copy_block(canvas, t, 150, D_IN, D_OUT, "04   THE FINAL TABLE", C.GOLD,
               [("Best eleven", C.INK), ("takes the title.", C.GOLD)],
               ["Squads ranked by power.", "Share the result in one tap."])

    navigator(canvas, t)
    if t > 46.6 * B:                                   # clear the stage for the next scene
        comp(canvas, background(tg, energy=1.0, focus=(fx, 0.5, 1.0)), 0, 0, prog(t, 46.6 * B, 1.3 * B, ease_in_out))
    return canvas
