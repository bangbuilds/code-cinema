# Workflow details

## 1. Grabbing frames from a reference video

Most social sites stream video through MSE, so you can draw the playing `<video>` into canvases. Paint them into a fixed overlay on top of the page and take one screenshot per three frames. Drawing a tainted video still displays fine; you only need pixels on screen.

```js
window.__grab = async (times) => {
  const v = document.querySelector('video');
  v.pause(); v.muted = true;
  let ov = document.getElementById('__ov');
  if (!ov) {
    ov = document.createElement('div'); ov.id = '__ov';
    Object.assign(ov.style, { position: 'fixed', inset: '0', background: '#222', zIndex: '2147483647', display: 'flex', gap: '4px', alignItems: 'flex-start' });
    document.body.appendChild(ov);
  }
  ov.innerHTML = '';
  for (const t of times) {
    await new Promise((r) => { let d = false; const h = () => { if (d) return; d = true; v.removeEventListener('seeked', h); r(); }; v.addEventListener('seeked', h); setTimeout(h, 6000); v.currentTime = t; });
    let w = 0; while (v.readyState < 2 && w < 6000) { await new Promise((r) => setTimeout(r, 100)); w += 100; }
    await new Promise((r) => setTimeout(r, 400));
    const c = document.createElement('canvas'); c.width = 540; c.height = 960;
    const x = c.getContext('2d'); x.drawImage(v, 0, 0, 540, 960);
    x.fillStyle = 'red'; x.font = 'bold 44px sans-serif'; x.fillText(t.toFixed(1) + 's', 12, 948);
    Object.assign(c.style, { width: 'calc((100vw - 8px)/3)', height: 'auto' });
    ov.appendChild(c);
  }
};
await window.__grab([0, 2, 3.5]); // then take a screenshot
```

Remove the overlay when you are done (`document.getElementById('__ov')?.remove()`), because the user shares that browser pane.

## 2. Plan template (what to put in the chat reply)

1. **Teardown** — 4–6 devices the reference uses, one line each.
2. **Core idea** — one sentence, plus the single line of copy the whole film hinges on.
3. **Directions** — a table of 4–6 options (how it is shot / why it could spread / weakness) and a recommendation that combines the strongest pieces.
4. **Storyboard** — per chapter: time range, beat duration, year, what is on screen, title / subtitle.
5. **Reach mechanics** — hook, nostalgia density, local references, acceleration, a phone-native twist, comment prompts, loop, series.
6. **Production** — code-rendered pipeline, what is generated, what is not used (logos, original audio).
7. **Decisions** — two or three questions with a recommended default each.
8. **Sources** — links for every fact on screen.

## 3. Review checklist for every still

- Text: does any object, bubble or prop cross the subtitle block (about y < 540 px with two-line bilingual subtitles)? Is the year or counter covered?
- Light: blown-out highlights or bloom halos? Screen washed grey (envMap)? Hot specular streaks on bevels?
- Framing: is the hero cut off? Is anything flying past the camera so large that it dominates?
- Readability: can you read the icon labels where the story needs them?
- Story: does this frame say what the chapter is about without the subtitles?

Tile stills into sheets of 4–6 (`scripts/sheet.sh`), review the sheet, then open single frames at full resolution only where something looks off.

## 4. Delivery checklist

- `ffprobe` duration, 1080×1920, 60 fps, AAC 48 kHz.
- Integrated loudness about −14 LUFS (`ebur128`), true peak at or below −1 dB.
- Intended black frames: `signalstats` YMAX = 0; intended silence: `volumedetect` max under −90 dB.
- A sheet of 12–18 frames pulled from the final MP4 (not from the browser) looks right.
- Cover image plus the first-frame-cover version.
- Posting copy with real numbers, and a one-line making-of.
