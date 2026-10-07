# Gotchas — what went wrong and the fix

Rendering
1. **Grey, washed-out phone screen.** A `MeshStandardMaterial` with no `envMap` of its own picks up `scene.environment` with `scene.environmentIntensity` and ignores `material.envMapIntensity`. Set `screenMat.envMap = scene.environment; screenMat.envMapIntensity = 0.05; screenMat.needsUpdate = true`. To find which light causes a problem, turn lights off one at a time and read a pixel after `__film.frame(t)`.
2. **Video four times darker than the stills.** With motion-blur sub-frames, every full-screen pass calls `renderer.render`, and `autoClear` wipes the accumulation buffer each time. Set `renderer.autoClear = false` and clear manually.
3. **Render dies at frame ~200 with "Execution context was destroyed".** You saved a source file and Vite hot-reloaded the export page. Render from the static build (`npm run render`).
4. **Everything glows.** Bloom threshold 0.8 makes every lit white surface bloom. Use threshold 1.1–1.2 and strength around 0.42; keep emissive values above 1 only where glow is intended (screen, scan line, flashes).
5. **Neon streaks on bevels.** RoomEnvironment light panels reflect in glossy clearcoat. Use environment intensity around 0.22 and clearcoat 0.3 with roughness 0.32.
6. **Scan line too hot on flat white props** (maps, screens). Scan glow around 1.2; the scan ring only while the line is inside the object's body.
7. **The scan ring wrapped around the phone** when the scan extended below the object (to cover a dangling cord). Gate the ring by the body extents.
8. **Chromatic aberration softens the bottom rows in close-ups.** Fine for wide shots; lower `uCA` when the phone fills the frame and labels must be read.
9. **Hidden browser pane.** `requestAnimationFrame` stops, so the preview looks frozen. Call `window.__film.frame(t)` from the JS tool to render a specific time for inspection.
10. **Phone screen texture uploads are expensive** (a 1080×2363 canvas, per sub-frame). `Phone.draw` skips the redraw when the JSON signature of the state is unchanged.

Layout and typography
11. **Text collisions.** Two-line bilingual subtitles end at about y = 510 px; a chat bubble or prop above about 540 px will overlap. Lower the props, or move the camera back for that chapter.
12. **Things cut off at the frame edge** when the camera moves closer for a chapter. Recheck wide props (input boxes, bubbles) after every camera change.
13. **Typewriter jitter.** Measure the full string once and draw prefixes from a fixed left edge.
14. **Odometer ghost digits** under each digit. Clip each digit cell and draw the next digit only while it is rolling.
15. **Long text overflowing a UI box.** Auto-fit the font: `fs = min(base, base * available / measuredWidth)`.
16. **Glow text unreadable.** Additive text with color multipliers around 1.8 blooms into blobs; keep it at about 1.05–1.15 and add a soft halo sprite instead.
17. **Close-ups under subtitles.** When a chapter needs a close-up of the screen (the shields in the resist beat), add a top scrim of about 0.6 so the subtitles stay legible over icons.

Scene composition
18. **Pile objects in front of the hero.** Use an exclusion radius around the phone when scattering props.
19. **Vortex flyers near the camera look huge** (a red landline filling the frame). Spawn them mid-ground, keep their scale around 0.5–0.7 of real size, and only make them visible once they launch.
20. **Buildings out of frame during a street vortex.** Pull the camera up and back when the burst starts so the whole street is visible, then push in to the phone.
21. **A pole in front of a sign.** Separate z-positions; sign faces in front, structural parts behind.

Pipeline
22. **CLI URL arguments got truncated.** `--url=http://…?export=1&cover=1` contains `=`; split only on the first `=`.
23. **ffmpeg without `drawtext`.** Common in package-manager builds; make contact sheets without labels and keep the order in your head.
24. **Fonts in headless export.** Preload every CJK character found in the sources (the `import.meta.glob(..., { query: '?raw' })` trick in `main.js`) before creating textures. Strings in JSON are not scanned; keep them in `.js`.
25. **Pure black is not pure black.** Grain adds noise to black. Return 0 from `film.grain(t)` during black sections and check `YMAX=0`.

Content
26. **Facts.** Verify every date and number on screen and keep the sources. Write absolute dates. Paraphrase famous quotes in subtitles rather than using original audio.
27. **Brands.** Mentioning a product in text is fine; drawing its logo is not. Use generic glyphs (a handset, a note, a globe, a single Chinese character).
28. **Token numbers in posts.** The session context size is not a billing figure; say "context".
