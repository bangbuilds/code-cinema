# Soundtrack

## Synth API (`scripts/synth.mjs`)
`const S = createSynth(durationSeconds)` returns voices that all write into stereo dry and reverb-send buffers:
- `S.osc({ t, dur, f, f2, wave: 'sine'|'tri'|'square'|'pulse'|'saw', amp, att, rel, decay, vib, vibRate, pan, send })` — the pitch glides exponentially from `f` to `f2`.
- `S.fm({ t, f, dur, amp, ratio, index, idxDecay, decay, trem, pan, send })` — FM bell and keys. Music box is `ratio 3.5, index 2.2`; electric piano is `ratio 1, index 1.4, trem 0.15`.
- `S.noise({ t, dur, amp, type: 'lp'|'hp'|'bp', f, f2, q, att, rel, decay, swell, pan, send })` — filtered noise with a cutoff sweep (whooshes, risers, hats, rumbles, tape rewind).
- `S.pad({ t, dur, notes, amp, cutoff, att, rel, send, wave })` — detuned saws through a low-pass.
- Presets: `kick`, `snare`, `clap`, `hat`, `crash`, `tick`, `bass(t, midi)`, `mbox(t, midi)`, `ep(t, midi)`, `buzz(t)` (phone vibration).
- `S.render(path, { wet: 3, gate: (t) => 0..1 })` — Freeverb, bus gate, peak normalize, soft clip, 16-bit WAV.

## Scoring approach
1. Put a beat grid under the story (`BEAT ≈ 0.56–0.6 s`) starting where the chapters start.
2. Describe sections as layer sets (`pad`, `pulse`, `hat`, `arp8`, `arp16`, `kick`, `bass`, `bright`, `tension`) so each chapter adds a layer. Drop everything for a tension chapter (a heartbeat and a dissonant drone), then bring it back brighter.
3. Map events from `events.json` to sound effects: `land` → buzz plus a pentatonic pluck that rises as the phone fills (or falls as it empties); `scan` → a glassy sweep; `type`/`flash` → a tick per character at the cue's `cps`; `year` → odometer ticks; `snap`, `rumble`, `gadget`, `resist`, `join` → their own sounds.
4. When many events stack up (bursts), scale each one by `1/sqrt(density)` so the burst does not clip.
5. A risk worth taking: music that slows and stops (a winding-down music box) right where the picture stops.

## Measure, because you cannot listen
```python
import wave, numpy as np
w = wave.open('out/music.wav'); n = w.getnframes(); sr = w.getframerate()
m = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, 2).astype(np.float32).mean(axis=1) / 32768
for t0, t1, name in [(0, 5, 'hook'), (5, 25, 'act 1')]:
    s = m[int(t0*sr):int(t1*sr)]; print(name, round(20*np.log10(np.sqrt((s**2).mean())+1e-9), 1), 'dB')
```
Targets: quiet sections no more than about 6–7 dB below loud ones (phone speakers lose quiet passages); reverb about 10–12 dB below dry (print both if unsure); final −14 LUFS integrated, true peak −1.5 dB (done by the render script's `loudnorm`). Silence that matters (a black-screen ending) gets `gate(t) = 0`; verify with `volumedetect` (max under −90 dB after AAC).

Always say you verified by measurement and ask the user to listen. If they prefer platform music, deliver the silent video and the WAV separately as well.
