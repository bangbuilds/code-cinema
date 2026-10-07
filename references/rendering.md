# Rendering, muxing, cover, QA

## Export script
`node scripts/export.mjs [--url=…] [--out=out/x.mp4] [--sub=8] [--fps=60] [--start=0 --end=12] [--frames=1.0,2.5 --dir=out/stills] [--events=out/events.json]`

- It launches the installed Google Chrome headless through `playwright-core` (`channel: 'chrome'`, ANGLE Metal on macOS, so it uses the real GPU), opens the page at 1080×1920, waits for `window.__film.ready`, then calls `__film.frame(t, sub)` per frame and pipes the JPEG frames (q 0.95) into ffmpeg (`libx264 -preset slow -crf 15 -pix_fmt yuv420p +faststart`).
- `--frames` writes stills for review instead of a video. `--events` dumps the timeline events as JSON for the soundtrack.
- URL values contain `=`; the argument parser splits only on the first `=`.

## Why a static build
`npm run render` runs `scripts/render.sh`: `vite build` → `python3 -m http.server` on `dist/` → export (video + events) → `audio.mjs` → mux with `loudnorm=I=-14:TP=-1.5:LRA=11` → cover → first-frame-cover version. The dev server reloads the page whenever a file changes, which destroys the execution context mid-render ("Execution context was destroyed"). The static build is frozen, so you can keep editing while it renders.

Environment variables: `NAME` (output file prefix), `COVER_T` (cover frame time), `SUB` (motion-blur sub-frames), `PORT`.

## Speed and size (Apple M4)
- Stills: about 0.5 s each including startup amortized.
- Video: about 0.1 s per frame at `SUB=8`, so a 90 s film at 60 fps (5,400 frames) takes about 9 minutes.
- Output: about 210 MB for 90 s at CRF 15. Platforms re-encode anyway.

## Contact sheets
`scripts/sheet.sh out/sheet.jpg <cols> <tileWidth> a.jpg b.jpg …` tiles stills with ffmpeg `xstack` (no labels, because many ffmpeg builds lack `drawtext`). Review sheets first, then single frames.

## Frames from the final video
```bash
for t in 7.3 20.3 45.1 78.5; do ffmpeg -loglevel error -y -ss $t -i out/film.mp4 -frames:v 1 -q:v 3 out/qa/q$t.jpg; done
```

## QA commands
```bash
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of compact out/film.mp4
ffmpeg -hide_banner -i out/film.mp4 -map 0:a -af "ebur128=peak=true" -f null - 2>&1 | grep -E " I:|Peak:"
ffmpeg -hide_banner -ss 82.5 -i out/film.mp4 -frames:v 1 -vf "signalstats,metadata=print" -f null - 2>&1 | grep YMAX
ffmpeg -hide_banner -ss 81.5 -t 2 -i out/film.mp4 -map 0:a -af volumedetect -f null - 2>&1 | grep max_volume
```

## Cover and first-frame cover
- The film implements `opts.cover`: draw big title text over a dramatic frame, set a strong top scrim, and return early. Export it with `--url="…?export=1&cover=1" --frames=<t> --sub=8`.
- Many platforms take frame 0 as the thumbnail. The render script prepends two cover frames (33 ms at 60 fps), delays the audio by the same 33 ms, and embeds the cover as `attached_pic`.
