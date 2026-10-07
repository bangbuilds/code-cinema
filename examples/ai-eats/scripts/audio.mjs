// 《AI 进食史》配乐：偏暗的电子乐，每一章叠一层；反抗时只剩心跳；最后一口推到顶；结尾只剩光标
// 用法：node scripts/audio.mjs out/events.json out/music.wav
import fs from 'node:fs';
import { createSynth, mtof } from './synth.mjs';

const { duration: DUR, events: EV } = JSON.parse(fs.readFileSync(process.argv[2] || 'out/events.json', 'utf8'));
const OUT = process.argv[3] || 'out/music.wav';
const S = createSynth(DUR);
const BEAT = 0.56;
const G0 = 5.6;
const bt = (b) => G0 + b * BEAT;
const CH = { Am: [57, 60, 64], F: [53, 57, 60], C: [55, 60, 64], G: [55, 59, 62] };
const P1 = ['Am', 'F', 'C', 'G'];
const P2 = ['F', 'G', 'Am', 'C'];
const arp = (ch, k) => {
  const n = CH[ch];
  return [n[0] + 12, n[1] + 12, n[2] + 12, n[0] + 24, n[2] + 12, n[1] + 12, n[0] + 12, n[2]][k % 8];
};
const pluck = (t, m, amp = 0.045, pan = 0) => S.fm({ t, f: mtof(m), amp, ratio: 2, index: 2.6, idxDecay: 14, decay: 9, dur: 0.5, pan, send: 0.3 });

// ── 开场：第一集音乐盒的回声 → 光标出现 → 年份倒回 2022
[
  [0.3, 86],
  [0.95, 81],
  [1.7, 77],
  [2.55, 74],
].forEach(([t, m], i) => S.mbox(t, m, 0.09 * (1 - i * 0.15), i % 2 ? 0.25 : -0.25));
S.osc({ t: 3.0, dur: 1.6, f: 180, f2: 880, amp: 0.035, att: 0.3, rel: 0.4, send: 0.5 });
S.noise({ t: 3.0, dur: 1.6, amp: 0.04, type: 'bp', f: 3000, f2: 9000, q: 3, att: 0.4, rel: 0.4, send: 0.5 });
S.pad({ t: 3.0, dur: 2.4, notes: [33, 45], amp: 0.06, cutoff: 500, att: 1.2, rel: 0.6, send: 0.3 });
S.noise({ t: 5.0, dur: 0.6, amp: 0.1, type: 'bp', f: 3500, f2: 800, q: 1.5, att: 0.03, rel: 0.05, send: 0.2 });
S.osc({ t: 5.0, dur: 0.6, f: 1100, f2: 260, wave: 'tri', amp: 0.04, vib: 0.06, vibRate: 22, att: 0.03, rel: 0.05, send: 0.2 });

// ── 乐段：bar 0 起于 5.6s，每小节 2.24s
const SECTIONS = [
  { from: 0, to: 4, prog: P1, layers: ['pad', 'pulse'] }, // 2022 一个输入框
  { from: 4, to: 8, prog: P1, layers: ['pad', 'pulse', 'hat', 'arp8'] }, // 2023 会写
  { from: 8, to: 11, prog: P1, layers: ['pad', 'pulse', 'hat', 'arp16'] }, // 2023 会画
  { from: 11, to: 15, prog: P1, layers: ['pad', 'pulse', 'hat', 'arp16', 'kick'] }, // 2024 会拍会唱
  { from: 15, to: 18, prog: P1, layers: ['pad', 'pulse', 'hat', 'arp16', 'kick', 'bass'] }, // 2025 人人都有
  { from: 18, to: 22, prog: null, layers: ['tension'] }, // 2025.12 反抗
  { from: 22, to: 26, prog: P2, layers: ['pad', 'pulse', 'hat', 'arp16', 'kick', 'bass', 'bright'] }, // 2026.01 加入
  { from: 26, to: 28, prog: P2, layers: ['pad', 'pulse', 'hat', 'arp16', 'kick', 'bass', 'bright'] }, // 一口吞掉
];
for (const sec of SECTIONS) {
  for (let bar = sec.from; bar < sec.to; bar++) {
    const t0 = bt(bar * 4);
    const L = new Set(sec.layers);
    if (L.has('tension')) {
      S.pad({ t: t0, dur: 2.24, notes: [33, 34, 45], amp: 0.06, cutoff: 420, att: 0.6, rel: 0.6, send: 0.35 });
      for (const b of [0, 2]) {
        S.osc({ t: t0 + b * BEAT, dur: 0.22, f: 80, f2: 42, amp: 0.32, decay: 10, att: 0.002, rel: 0.02, send: 0.05 });
        S.osc({ t: t0 + b * BEAT + 0.2, dur: 0.18, f: 72, f2: 40, amp: 0.2, decay: 12, att: 0.002, rel: 0.02, send: 0.05 });
      }
      continue;
    }
    const ch = sec.prog[bar % 4];
    const bright = L.has('bright') ? 12 : 0;
    const early = sec.from < 11 ? 1.6 : 1;
    if (L.has('pad')) S.pad({ t: t0, dur: 2.24, notes: CH[ch].map((m) => m - 12), amp: 0.05 * early, cutoff: L.has('bright') ? 2000 : 1100, att: 0.4, rel: 0.7 });
    for (let b = 0; b < 4; b++) {
      const t = t0 + b * BEAT;
      if (L.has('pulse')) for (const h of [0.28, 0.42]) S.osc({ t: t + h, dur: 0.12, f: mtof(CH[ch][0] - 24), wave: 'saw', amp: 0.05 * early, att: 0.01, decay: 8, rel: 0.03, send: 0.05 });
      if (L.has('kick')) S.kick(t, 0.42);
      if (L.has('kick') && b % 2 === 1) S.clap(t, 0.09);
      if (L.has('hat')) {
        S.hat(t + 0.28, 0.03);
        if (L.has('bass')) S.hat(t + 0.14, 0.018), S.hat(t + 0.42, 0.018);
      }
      if (L.has('bass')) S.bass(t + 0.28, CH[ch][0] - 24, 0.2, 0.14);
      if (L.has('arp8')) pluck(t, arp(ch, b * 2) + bright, 0.04, -0.3), pluck(t + 0.28, arp(ch, b * 2 + 1) + bright, 0.035, 0.3);
      if (L.has('arp16')) for (let s = 0; s < 4; s++) pluck(t + s * 0.14, arp(ch, b * 4 + s) + bright, 0.032 * (s % 2 ? 0.7 : 1), s % 2 ? 0.35 : -0.35);
    }
  }
}

// ── 最后一口：上扬 + 军鼓越滚越密 → 手机被吸走 → 一声低音砸下来
S.noise({ t: 63.4, dur: 4.2, amp: 0.2, type: 'bp', f: 200, f2: 7000, q: 0.7, att: 0.3, swell: 2.0, send: 0.35 });
S.osc({ t: 63.4, dur: 4.18, f: 70, f2: 700, wave: 'saw', amp: 0.04, att: 0.4, rel: 0.02, send: 0.3 });
for (let t = 64.0; t < 67.55; ) {
  S.snare(t, 0.05 + 0.1 * ((t - 64) / 3.6));
  t += t < 65.2 ? 0.28 : t < 66.4 ? 0.14 : 0.07;
}
S.noise({ t: 68.8, dur: 1.8, amp: 0.16, type: 'lp', f: 6000, f2: 200, q: 0.8, att: 0.1, rel: 0.05, send: 0.3 });
S.osc({ t: 68.8, dur: 1.8, f: 400, f2: 50, wave: 'saw', amp: 0.04, att: 0.2, rel: 0.05, send: 0.2 });
S.osc({ t: 70.6, dur: 1.4, f: 58, f2: 28, amp: 0.65, decay: 2.2, att: 0.002, rel: 0.2, send: 0.35 });
S.crash(70.6, 0.14);

// ── 结尾：只剩光标一闪一闪
for (let t = 71.2; t < 77.4; t += 1 / 1.9) S.tick(t, 0.012, 0);
S.pad({ t: 77.6, dur: 3.6, notes: [57, 64, 71, 76], amp: 0.09, cutoff: 1400, att: 1.4, rel: 0.9, send: 0.6 });
S.ep(77.6, 45, 0.08, 0, 4.0);

// ── 音效：按画面事件对齐
const SC = [0, 3, 5, 7, 10];
const eats = EV.filter((e) => e.type === 'eat').map((e) => e.t);
eats.forEach((t, i) => {
  let dens = 0;
  for (const u of eats) if (Math.abs(u - t) < 0.2) dens++;
  const k = 1 / Math.sqrt(dens);
  S.osc({ t, dur: 0.09, f: 1900, f2: 420, amp: 0.05 * k, decay: 10, att: 0.002, rel: 0.02, send: 0.25, pan: ((i % 5) - 2) * 0.2 });
  for (let g = 0; g < 3; g++) S.tick(t + 0.35 + g * 0.045, 0.02 * k, (g - 1) * 0.4);
  const m = 81 - SC[i % 5] - 12 * (Math.floor(i / 5) % 2);
  S.fm({ t: t + 0.4, f: mtof(m), amp: 0.045 * k, ratio: 2, index: 1.2, idxDecay: 9, decay: 6, dur: 0.6, pan: ((i % 5) - 2) * 0.25, send: 0.3 });
});
for (const e of EV) {
  const t = e.t;
  switch (e.type) {
    case 'type': {
      const n = [...(e.cn || '')].length;
      for (let i = 0; i < n; i++) S.tick(t + (i + 1) / e.cps, 0.016, i % 2 ? 0.2 : -0.2);
      break;
    }
    case 'prompt':
      for (let i = 0; i < e.n; i++) S.noise({ t: t + (i + 1) / e.cps, dur: 0.008, type: 'bp', f: 2600, q: 1.2, amp: 0.05, rel: 0.006, send: 0.08, pan: 0.1 });
      break;
    case 'send':
      S.noise({ t, dur: 0.25, amp: 0.06, type: 'bp', f: 800, f2: 4500, q: 1.1, att: 0.05, rel: 0.05, send: 0.25 });
      S.osc({ t, dur: 0.07, f: 600, f2: 980, amp: 0.04, decay: 12, att: 0.002, rel: 0.02, send: 0.2 });
      break;
    case 'year':
      if (e.dur >= 0.25) for (let x = 0; x < e.dur; x += 1 / 34) S.tick(t + x, 0.016 * (1 - x / e.dur) + 0.006, 0.1);
      break;
    case 'resist':
      for (const d of [0, 0.17]) S.osc({ t: t + d, dur: 0.13, f: d ? 98 : 120, wave: 'square', amp: 0.06, att: 0.004, rel: 0.03, send: 0.1 });
      break;
    case 'shield':
      for (let i = 0; i < 8; i++) S.fm({ t: t + 0.05 + i * 0.1, f: mtof(76 - (i % 3) * 2), amp: 0.04, ratio: 1.41, index: 3, idxDecay: 8, decay: 9, dur: 0.4, pan: (i % 2 ? 0.4 : -0.4), send: 0.3 });
      break;
    case 'join':
      [69, 72, 76, 81, 84].forEach((m, i) => S.fm({ t: t + i * 0.06, f: mtof(m), amp: 0.045, ratio: 2, index: 1.5, decay: 5, dur: 0.6, send: 0.4 }));
      break;
    default:
  }
}

const r = S.render(OUT, { wet: 3, gate: (t) => (t < DUR - 0.6 ? 1 : Math.max(0, (DUR - t) / 0.6)) });
console.log(`音轨 → ${OUT}  ${r.seconds.toFixed(1)}s`);
