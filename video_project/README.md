# Skelp! — 60-second product film

A light-theme, motion-designed commercial for Skelp!, built entirely in code:
Python draws every frame, FFmpeg encodes, joins, mixes and masters.

**Output:** `output/final_promo.mp4` — 1920×1080, 30 fps, H.264 (yuv420p), AAC 48 kHz stereo, 60 s.

Everything on screen is the real app: the stills and the live-bidding sequence are captured from the
app's own web build, and the interface sounds in the auction shot are the app's own.
The soundtrack is original and synthesised by `render/make_audio.py`; nothing is sampled or licensed.

## Regenerate

Needs Python 3 with `numpy` and `Pillow`, and `ffmpeg` on the PATH.

```bash
cd video_project
```

```bash
python3 -m render.make_audio
```

```bash
python3 -m render.render_video
```

The full render takes about three minutes on four cores and ends with an automatic check of the
delivery spec (resolution, frame rate, codecs, duration, audio/video length).

Useful while editing:

```bash
python3 -m render.render_video --scene showcase
```

```bash
python3 -m render.preview 3.0 14.2 27.1 --sheet build/sheet.png
```

### Re-capturing the app (only if the app's UI changes)

Needs Node with Playwright, and the app's web build served locally:

```bash
npx expo export --platform web && (cd dist && python3 -m http.server 8099)
```

```bash
node video_project/capture/capture_app.js
```

The capture plays a real solo auction, so the players and prices differ each run. If the recording
changes, check `LIVE_REC0` / `HAMMER_REC0` in `config.py` (they map recording time onto the film).

## Structure

```
config.py              format, scene timeline (on a 96 BPM bar grid), palette, asset paths, copy
capture/               Playwright script that captures real screens and a live auction
assets/                logo, fonts (Inter, Luckiest Guy — both OFL), screenshots, recording, app sounds
effects/animations.py  easing curves, keyframes, opacity windows
effects/typography.py  cached text rendering and masked word-by-word reveals
effects/graphics.py    ambient background, phone mockup, focus ring, touch indicator, chips, logo
scenes/                one module per scene: opening, problem, product_reveal, showcase, benefits, outro
render/make_audio.py   score, sound design, mix, reverb, FFmpeg mastering
render/render_video.py parallel scene rendering -> FFmpeg concat, soundtrack, fades, final encode, verification
render/preview.py      single frames / contact sheets for art-direction checks
output/final_promo.mp4
```

## Timeline

| Time | Scene | What happens |
| --- | --- | --- |
| 0:00 – 0:05 | Opening | "Every fan thinks they'd win the auction." |
| 0:05 – 0:12.5 | Problem | Spreadsheet, group chat, arguments — struck out — "And it all stops when the internet does." |
| 0:12.5 – 0:20 | Reveal | Logo, name, tagline; the app rises into frame and opens |
| 0:20 – 0:42.5 | Experience | Host or join · live bidding (real recording) · scout and build · the final table |
| 0:42.5 – 0:52.5 | Value | No internet, no servers, no ads · up to 10 teams · free and open source |
| 0:52.5 – 1:00 | Brand | Logo, name, tagline, call to action, URL |
