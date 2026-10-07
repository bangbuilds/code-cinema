// demo 配乐：铺底 + 音乐盒琶音 + 按事件对齐的音效（吞咽振动、扫描、打字、年份滚动）
// 用法：node scripts/audio.mjs out/events.json out/music.wav
import fs from 'node:fs';
import { createSynth, mtof } from './synth.mjs';

const { duration: DUR, events: EV } = JSON.parse(fs.readFileSync(process.argv[2] || 'out/events.json', 'utf8'));
const OUT = process.argv[3] || 'out/music.wav';
const S = createSynth(DUR);

// 音乐：Dm – Bb – F – C，每小节 2.4 秒
const CH = [
  [62, 65, 69],
  [58, 62, 65],
  [65, 69, 72],
  [60, 64, 67],
];
for (let bar = 0; bar * 2.4 < DUR; bar++) {
  const n = CH[bar % 4];
  const t0 = bar * 2.4;
  S.pad({ t: t0, dur: 2.4, notes: n.map((m) => m - 12), amp: 0.05, cutoff: 1100, att: 0.6, rel: 0.9 });
  [0, 1, 2, 1, 0, 2, 1, 2].forEach((k, i) => S.mbox(t0 + i * 0.3, n[k] + 12, 0.07 * (i % 2 ? 0.75 : 1), i % 2 ? 0.3 : -0.3));
}

// 音效
const lands = EV.filter((e) => e.type === 'land');
lands.forEach((e, i) => {
  S.buzz(e.t, 0.09, 0.16);
  S.fm({ t: e.t, f: mtof(74 + [0, 3, 5, 7, 10][i % 5]), amp: 0.06, ratio: 2, index: 1.2, idxDecay: 9, decay: 6, dur: 0.6, send: 0.3 });
});
for (const e of EV) {
  if (e.type === 'scan') {
    S.osc({ t: e.t, dur: e.dur, f: 2600, f2: 700, amp: 0.025, att: 0.05, rel: 0.1, send: 0.4 });
    S.noise({ t: e.t, dur: e.dur, amp: 0.035, type: 'bp', f: 6000, f2: 1500, q: 2, att: 0.05, rel: 0.1, send: 0.3 });
  }
  if (e.type === 'peel') S.osc({ t: e.t, dur: 0.07, f: 420, f2: 980, amp: 0.05, decay: 12, att: 0.002, rel: 0.03, send: 0.2 });
  if (e.type === 'type' || e.type === 'flash') for (let i = 0; i < [...(e.cn || '')].length; i++) S.tick(e.t + (i + 1) / e.cps, 0.02, i % 2 ? 0.2 : -0.2);
  if (e.type === 'year' && e.dur >= 0.25) for (let x = 0; x < e.dur; x += 1 / 34) S.tick(e.t + x, 0.016 * (1 - x / e.dur) + 0.006, 0.1);
}

const r = S.render(OUT, { wet: 3, gate: (t) => (t < DUR - 0.5 ? 1 : Math.max(0, (DUR - t) / 0.5)) });
console.log(`音轨 → ${OUT}  ${r.seconds.toFixed(1)}s`);
