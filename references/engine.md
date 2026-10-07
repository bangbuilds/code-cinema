# Engine reference

All modules live in `template/src`. Units are real-world: 1 = 10 cm. The phone is 0.74 × 1.56.

## main.js
- Creates the `WebGLRenderer` (NeutralToneMapping, sRGB output, PCF shadows, `autoClear = false`), preloads fonts, calls `createFilm(renderer)`, and builds `Post`.
- `renderAt(t, sub)`: for `k` in `0..sub-1` it calls `film.update(t + jitter, hud, post, { cover })` then `post.renderSub(...)`; finally `post.present(t, film.grain(t))`. Shutter is 180° (half a frame).
- `window.__film = { duration, fps, events, frame(t, sub, type, q), ready }`. `frame()` returns a base64 JPEG of the full 1080×1920 canvas.
- URL params: `?export=1` (full resolution, no UI), `?cover=1` (film draws its cover HUD), `?t=12.5&pause`, `?res=1` for full-res preview.

## engine/util.js
`clamp`, `lerp`, `invLerp`, `smoothstep`, `ease.*` (inOutSine, in/out/inOut Quad/Cubic/Quart/Expo, outBack, inBack), `seg(t, a, b, ease)` (0..1 progress with easing), `rng(seed)`, `hash1(n)`, `noise1(x, seed)` (smooth 1D noise for camera breathing), `bezier2(out, a, b, c, t)`, `shake(dt, freq, dur)` (decaying vibration).

## engine/timeline.js — `Timeline`
- `item(t, icon, label)` — something lands on the phone at `t`. Items get an `index` after `finalize()` (their slot order). Also logs a `land` event.
- `year(t, year, dur)` — the odometer rolls to `year` starting at `t`.
- `layout(t, name, dur)` — the home-screen grid changes (`beat` 4×6, `mid` 5×8, `dense` 7×15); icons glide between layouts.
- `text({ t0, t1, cn, en, sub, subEn, style, cps, size, y, highlight, highlightEn })` — a bilingual subtitle cue (`style: 'flash'` for one-second beats; `sub` and `subEn` may be arrays for two lines).
- `event(t, type, data)` — anything the soundtrack should hit (`snap`, `scan`, `peel`, `rumble`, …).
- `finalize()`; queries `count(t)` (counter with a 0.14 s roll), `yearAt(t)`, `yearRolling(t)`, `layoutAt(t)`.

## engine/campath.js
`makeCamPath([{ t, p: [x,y,z], l: [x,y,z], f: fov, stop }])` returns `cam(t) → { p, l, f }`. Time-scaled Catmull-Rom, so velocity is continuous through keys; `stop: true` forces a zero tangent (a hold). Add small `noise1` offsets for handheld breathing.

## engine/hud.js — `HUD` (1080×1920 canvas, composited last)
- `begin(t)` … `end()` each frame.
- `type({ text, x, y, font, start, cps, eraseStart, eraseCps, scramble, cursor, highlight, … })` — typewriter: the newest glyph shows a random character for about 0.06 s, a block cursor while typing, backspace erase. It measures the full string once and draws from the left edge, so centered text does not jitter.
- `fade({ text, x, y, font, color, alpha, dy, align, ls })`.
- `odometer({ value, digits, x, y, font, align, alpha, scale, glitch })` — a mechanical counter; fractional values roll, higher digits carry.
- `cue(c)` — the bilingual block: CN title (typed) → EN title (typed in sync) → CN subtitle → EN subtitle (fade). Layout: title at `y`, EN at `y + 0.74·size`, subtitles from `y + 1.62·size`, 40 px per CN line and 32 px per EN line.
- Fonts: `FONT_CN` (Noto Sans SC), `FONT_MONO` (JetBrains Mono), `FONT_EN` (Inter, falling back to Noto Sans SC for mixed text).

## engine/post.js — `Post`
Scene into an MSAA HalfFloat target → `UnrealBloomPass` (0.42, 0.45, threshold 1.2) → `OutputPass` (tone map + sRGB) → composite (chromatic aberration `uCA`, vignette, top `uScrim` for text legibility, `uFade` to black, HUD over) → additive accumulation into a Float target (motion blur) → `present()` adds grain. Set `post.uniforms.uScrim.value` and `uFade.value` from `film.update`.

## world/phone.js — `Phone`
- `group`, `screen`, `screenMat` (emissive canvas texture; assign `envMap` yourself, see gotchas), a 1080×2363 screen canvas.
- `layouts.beat | mid | dense` with `pos(i)`, `size`, `label`.
- `draw(st)` — a signature-cached redraw. `st = { power, clock, lock, icons: [{ icon, label, x, y, size, labelSize, scale, alpha, flash, dx, block }], empties: [{ x, y, size, alpha }], scan: { amount, pos }, banner: { alpha, icon, title, text }, glow, snake }`. `dx` shakes an icon; `block` draws a red shield (episode 2).
- `canvasToWorld(x, y)`, `canvasSizeToWorld(px)`, `screenCenterWorld()`, `screenNormalWorld()`.

## world/beat.js — `SwallowBeat`
`new SwallowBeat(scene, ctx, { obj, t0, speed, hold, from, huskTo, scale, rot, swing, icons: [{ icon, label }], stagger, iconSize, peelOffset, arc, enterEase, scanBelow, T, onUpdate })`
- `ctx = { scene, tl, phone, slotAt(index, t) }`.
- Default timing `T` (multiplied by `speed`): emerge [0, 1], scan [1.6, 2.5], peel [2.5, 2.75], fly [2.75, 3.25], husk [2.6, 4.2]. It registers one `item` per icon at its landing time, plus `scan` and `peel` events.
- `onUpdate(t, lt, beat)` lets an object animate its own parts (a cord snapping, gadgets popping out, film unspooling).

## world/materials.js
`MatKit(drain)` creates materials sharing one set of drain uniforms: `uScanY` (world Y above which the color is drained), `uScanW`, `uGlow` (scan-line emissive), `uDrain` (force all grey), `uBright` (dim for husks). Helpers: `plastic`, `gloss`, `matte`, `metal`, `chrome`, `glass`, `tex`, `lit`, `glow`.

## world/objects.js, objects2.js
Builders return `{ group, inner, kit, drain, size, radius, icon, parts }`. Use `rbox`, `cyl`, `circle`, `plane`, `torus`, `sphere`, `mk`, `cached`, `finish` (which recenters the group). Objects include the landline, alarm clock, film camera, Walkman, cassette, folded map, pager, calculator, radio, wallet, keys, newspaper, red envelope, train ticket, flashlight, compass, handheld console, brick phone, book, CD, CRT TV, watch, tear-off calendar, envelope, IC card, telegram, notepad, fax, feature phone, MP3 player, CRT PC, shanzhai phone (with gadgets), stopwatch, recorder, mirror, magnifier, level, GPS navigator, film roll, business card, taxi, cash, remote, menu, shops, kiosk, phone booth and bus stop. Surface art is drawn on canvases in `textures.js`.

## world/icons.js, icons2.js
`iconCanvas(type)` and `iconTexture(type)`. `registerIcon(type, [c1, c2], glyph(ctx, size, bg))` adds pictogram or single-character icons. More than 100 icons are defined.

## world/fx.js
`makeDust()` (background motes), `Burst` (sparks), `makeGlow(color)` (an additive sprite with `set(pos, scale, intensity)`), `makeScanRing()`, `makeFloor()` (a floor that fades into the void).

## Example sequences (in examples/)
- `phone-eats/src/seq`: `hook.js` (a 100-object pile spiralling into a phone), `snake.js` (the camera dives into the screen; a pixel snake eats a handheld), `slots.js` (three icons spin like a slot machine), `flood.js` (objects pour in from all sides), `street.js` (shops ripped up and whirled in), `dessert.js` (phone book digits fade, a character dissolves, a person at a bus stop, glowing skill words).
- `ai-eats/src/seq/ai.js`: `AIBar` (a glowing input box with typed prompts, auto-fitting text, a send button, and a red tint when blocked), `Bubble` (the sent message), `Eater` (icons fly from slots into the cursor and burst into glyph-token particles; there are `vortex` and `hop` styles and a whole-phone burst).
