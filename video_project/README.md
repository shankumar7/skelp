# Skelp! — 60-second product film

A light-theme, motion-designed commercial for Skelp!, built entirely in code:
Python draws every frame, FFmpeg encodes, joins, mixes and masters.

There are two cuts:

| File | Music | Notes |
| --- | --- | --- |
| `output/final_promo_music.mp4` | The supplied track (`assets/audio/music.mp3`) | The current cut. Every scene, text hit, tap and the SOLD hammer is placed on the track's beat grid (118.3 BPM). Not committed — see *Music* below. |
| `output/final_promo.mp4` | Original synthesised score | The first cut (committed). Its timing is in the git history; the scenes in this folder now follow the music grid. |

Both are 1920×1080, 30 fps, H.264 (yuv420p), AAC 48 kHz stereo, 60 s.

Everything on screen is the real app: the stills and the live-bidding sequence are captured from the
app's own web build, and the interface sounds in the auction shot are the app's own.

## Music

The 33-second track is laid out along the 60-second film by `render/music_bed.py`, joining only on bar
lines (`MUSIC_PLAN` in `config.py`): its intro opens the film, its main section re-enters on the product
reveal and again at the third feature, and its outro arrives with the final brand moment.

`assets/audio/music.mp3` and the cut that uses it are **git-ignored**. Make sure you hold a licence for
the track that covers this use before publishing the film or adding the file to a public repository.

## Regenerate

Needs Python 3 with `numpy` and `Pillow`, and `ffmpeg` on the PATH.

```bash
cd video_project
```

```bash
python3 -m render.music_bed
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
config.py              format, music grid (BPM, downbeat, bar plan), scene timeline in bars, palette, paths, copy
capture/               Playwright script that captures real screens and a live auction
assets/                logo, fonts (Inter, Luckiest Guy — both OFL), screenshots, recording, app sounds
effects/animations.py  easing curves, keyframes, opacity windows
effects/typography.py  cached text rendering and masked word-by-word reveals
effects/graphics.py    ambient background, phone mockup, focus ring, touch indicator, chips, logo
scenes/                one module per scene: opening, problem, product_reveal, showcase, benefits, outro
render/music_bed.py    lays the supplied track along the film on bar lines, adds app sounds, masters with FFmpeg
render/make_audio.py   the original synthesised score (first cut; 96 BPM, not aligned to the current grid)
render/render_video.py parallel scene rendering -> FFmpeg concat, soundtrack, fades, final encode, verification
render/preview.py      single frames / contact sheets for art-direction checks
output/final_promo.mp4
```

## Timeline (music cut)

One bar is 2.03 s; the film starts 0.25 s before the first downbeat.

| Bars | Time | Scene | What happens |
| --- | --- | --- | --- |
| 0 – 2 | 0:00 – 0:04.3 | Opening | "Every fan thinks they'd win the auction." over the track's intro |
| 2 – 6 | 0:04.3 – 0:12.4 | Problem | Three pains land on beats, are struck out one per eighth note, then the punchline |
| 6 – 10 | 0:12.4 – 0:20.5 | Reveal | The main section re-enters: logo, name, tagline; the phone swings in and the app opens on a downbeat |
| 10 – 22 | 0:20.5 – 0:44.9 | Experience | Host or join · live bidding (taps on beats, SOLD on a downbeat) · scout and build · the final table |
| 22 – 26 | 0:44.9 – 0:53.0 | Value | Three statements of 5, 5 and 6 beats |
| 26 – end | 0:53.0 – 1:00 | Brand | The track's outro: logo, name, tagline, call to action, URL |
