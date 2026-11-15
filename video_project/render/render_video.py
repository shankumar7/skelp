"""Render pipeline: every scene is drawn frame by frame in Python and piped straight into FFmpeg,
scenes render in parallel, then FFmpeg joins them, adds the mastered soundtrack and encodes the final MP4.

    python3 -m render.render_video                # everything
    python3 -m render.render_video --scene outro  # re-render one scene, then re-assemble
    python3 -m render.render_video --assemble     # only re-assemble from existing scene files
"""
import argparse, importlib, json, subprocess, sys, time
from multiprocessing import Pool
import config as C


def scene_file(name):
    return C.BUILD / f"scene_{name}.mp4"


def render_scene(spec):
    """Draw one scene and encode it to a visually lossless intermediate."""
    name, start, end = spec
    mod = importlib.import_module(f"scenes.{name}")
    frames = round((end - start) * C.FPS)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{C.W}x{C.H}", "-r", str(C.FPS), "-i", "-",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "8", "-pix_fmt", "yuv444p", "-g", str(C.FPS), str(scene_file(name))]
    t0 = time.time()
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for i in range(frames):
            t = i / C.FPS
            ff.stdin.write(mod.render(t, start + t).convert("RGB").tobytes())
        ff.stdin.close()
    except BrokenPipeError:
        raise RuntimeError(f"FFmpeg stopped while encoding scene '{name}'")
    if ff.wait() != 0:
        raise RuntimeError(f"FFmpeg failed on scene '{name}'")
    return name, frames, time.time() - t0


def assemble():
    """Join the scenes, lay in the soundtrack, fade in/out and encode the delivery file with FFmpeg."""
    audio = C.BUILD / "soundtrack.wav"
    missing = [str(p) for p in [audio, *[scene_file(n) for n, _, _ in C.SCENES]] if not p.exists()]
    if missing:
        raise FileNotFoundError("Cannot assemble, missing:\n  " + "\n  ".join(missing))
    listing = C.BUILD / "scenes.txt"
    listing.write_text("".join(f"file '{scene_file(n).name}'\n" for n, _, _ in C.SCENES))
    C.OUTPUT.mkdir(exist_ok=True)
    out = C.OUTPUT / "final_promo.mp4"
    vf = f"fade=t=in:st=0:d=0.5:color=white,fade=t=out:st={C.DURATION - 0.9}:d=0.9:color=white,format=yuv420p"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing), "-i", str(audio),
           "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-profile:v", "high", "-level", "4.1", "-r", str(C.FPS),
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-t", str(C.DURATION), "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True, cwd=C.BUILD)
    return out


def verify(path):
    """Read the file back with ffprobe and check it against the delivery spec."""
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
                                      check=True, capture_output=True, text=True).stdout)
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    a = next(s for s in probe["streams"] if s["codec_type"] == "audio")
    dur = float(probe["format"]["duration"])
    checks = {
        "1920x1080": (v["width"], v["height"]) == (C.W, C.H),
        "30 fps": v["r_frame_rate"] == f"{C.FPS}/1",
        "H.264": v["codec_name"] == "h264",
        "yuv420p": v["pix_fmt"] == "yuv420p",
        "AAC 48 kHz stereo": a["codec_name"] == "aac" and a["sample_rate"] == "48000" and a["channels"] == 2,
        f"duration {dur:.2f}s": abs(dur - C.DURATION) < 0.15,
        "video/audio same length": abs(float(v["duration"]) - float(a["duration"])) < 0.1,
    }
    for label, ok in checks.items():
        print(("  ok   " if ok else "  FAIL ") + label)
    print(f"  size {int(probe['format']['size']) / 1e6:.1f} MB, video {int(v['bit_rate']) / 1e6:.1f} Mb/s, {v['nb_frames']} frames")
    return all(checks.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", action="append", help="render only this scene (repeatable)")
    ap.add_argument("--assemble", action="store_true", help="skip scene rendering")
    ap.add_argument("--jobs", type=int, default=4)
    args = ap.parse_args()
    C.verify_assets()
    C.BUILD.mkdir(exist_ok=True)
    if not args.assemble:
        todo = [s for s in C.SCENES if not args.scene or s[0] in args.scene]
        if args.scene and len(todo) != len(args.scene):
            sys.exit(f"Unknown scene. Choose from: {', '.join(n for n, _, _ in C.SCENES)}")
        with Pool(min(args.jobs, len(todo))) as pool:
            for name, frames, secs in pool.imap_unordered(render_scene, todo):
                print(f"  rendered {name:15s} {frames:4d} frames in {secs:5.1f}s ({frames / secs:.1f} fps)")
    if not (C.BUILD / "soundtrack.wav").exists():
        from render import make_audio
        make_audio.main()
    out = assemble()
    print("final:", out)
    if not verify(out):
        sys.exit("Delivery checks failed")


if __name__ == "__main__":
    main()
