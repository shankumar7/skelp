"""Render single frames for art-direction checks:  python3 -m render.preview 3.0 8.2 14.5 [--sheet out.png]"""
import sys, importlib
from PIL import Image
import config as C


def frame_at(tg):
    for name, start, end in C.SCENES:
        if start <= tg < end or (name == C.SCENES[-1][0] and tg >= end):
            return importlib.import_module(f"scenes.{name}").render(tg - start, tg).convert("RGB")
    raise ValueError(tg)


if __name__ == "__main__":
    C.verify_assets()
    args = sys.argv[1:]
    sheet = args[args.index("--sheet") + 1] if "--sheet" in args else None
    times = [float(a) for a in args if a.replace(".", "", 1).isdigit()]
    frames = [frame_at(t) for t in times]
    C.BUILD.mkdir(exist_ok=True)
    if sheet:
        cols = 3
        rows = (len(frames) + cols - 1) // cols
        tw, th = 640, 360
        out = Image.new("RGB", (cols * tw, rows * th))
        for i, f in enumerate(frames):
            out.paste(f.resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
        out.save(sheet)
    else:
        for t, f in zip(times, frames):
            f.save(C.BUILD / f"frame_{t:06.2f}.png")
