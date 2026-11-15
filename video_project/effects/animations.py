"""Easing curves and timing helpers. Everything takes and returns plain floats."""
import math


def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x


def lerp(a, b, p):
    return a + (b - a) * p


def ease_out_cubic(p):
    return 1 - (1 - p) ** 3


def ease_in_cubic(p):
    return p ** 3


def ease_in_out(p):
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def ease_out_expo(p):
    return 1.0 if p >= 1 else 1 - 2 ** (-10 * p)


def ease_out_back(p, s=1.4):
    return 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2


def prog(t, start, dur, ease=None):
    """0..1 progress of an animation that starts at `start` and lasts `dur`."""
    p = clamp((t - start) / dur) if dur > 0 else float(t >= start)
    return ease(p) if ease else p


def window(t, t_in, t_out, d_in=0.5, d_out=0.4):
    """Opacity envelope: eases in at t_in, eases out so that it is gone at t_out."""
    return prog(t, t_in, d_in, ease_out_cubic) * (1 - prog(t, t_out - d_out, d_out, ease_in_cubic))


def keyframes(t, keys, ease=ease_in_out):
    """Piecewise-eased interpolation through [(time, value), ...]."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            return lerp(v0, v1, ease(clamp((t - t0) / (t1 - t0)))) if t1 > t0 else v1
    return keys[-1][1]


def breathe(t, period=6.0, phase=0.0):
    return math.sin(2 * math.pi * (t / period + phase))
