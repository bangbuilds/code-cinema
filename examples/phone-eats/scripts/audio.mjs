// 原创配乐 + 音效：全部用代码合成，不使用任何外部音频素材
// 用法：node scripts/audio.mjs out/events.json out/music.wav
import fs from 'node:fs';

const SR = 48000;
const TAU = Math.PI * 2;
const { duration: DUR, events: EV } = JSON.parse(fs.readFileSync(process.argv[2] || 'out/events.json', 'utf8'));
const OUT = process.argv[3] || 'out/music.wav';
const N = Math.ceil((DUR + 0.2) * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const SL = new Float32Array(N);
const SRv = new Float32Array(N);

let seed = 20261007;
const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function put(i, v, pan, send) {
  if (i < 0 || i >= N) return;
  const a = ((pan + 1) * Math.PI) / 4;
  const l = v * Math.cos(a);
  const r = v * Math.sin(a);
  L[i] += l;
  R[i] += r;
  if (send) {
    SL[i] += l * send;
    SRv[i] += r * send;
  }
}

// ── 音色 ──
function osc({ t, dur, f, f2 = f, wave = 'sine', amp = 0.1, att = 0.005, rel = 0.08, pan = 0, send = 0.15, vib = 0, vibRate = 5.5, decay = 0 }) {
  const n0 = Math.round(t * SR);
  const n = Math.round((dur + rel) * SR);
  let ph = rnd();
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const u = Math.min(1, tt / dur);
    let fr = f * Math.pow(f2 / f, u);
    if (vib) fr *= 1 + vib * Math.sin(TAU * vibRate * tt);
    ph += fr / SR;
    const p = ph - Math.floor(ph);
    let s;
    if (wave === 'sine') s = Math.sin(TAU * p);
    else if (wave === 'tri') s = 1 - 4 * Math.abs(p - 0.5);
    else if (wave === 'square') s = p < 0.5 ? 0.7 : -0.7;
    else if (wave === 'pulse') s = p < 0.25 ? 0.7 : -0.7;
    else s = 2 * p - 1;
    let e = tt < att ? tt / att : 1;
    if (decay) e *= Math.exp(-tt * decay);
    if (tt > dur) e *= Math.max(0, 1 - (tt - dur) / rel);
    put(n0 + k, s * e * amp, pan, send);
  }
}

function fm({ t, f, dur = 1.6, amp = 0.1, ratio = 3.5, index = 2.4, idxDecay = 6, decay = 3, pan = 0, send = 0.35, att = 0.002, trem = 0 }) {
  const n0 = Math.round(t * SR);
  const n = Math.round(dur * SR);
  const fade = Math.min(800, n);
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const I = index * Math.exp(-tt * idxDecay);
    let s = Math.sin(TAU * f * tt + I * Math.sin(TAU * f * ratio * tt));
    if (trem) s *= 1 - trem * (0.5 + 0.5 * Math.sin(TAU * 4.5 * tt));
    const e = Math.min(1, tt / att) * Math.exp(-tt * decay) * (k > n - fade ? (n - k) / fade : 1);
    put(n0 + k, s * e * amp, pan, send);
  }
}

function coefs(type, f, q) {
  const w = (TAU * Math.min(f, SR * 0.45)) / SR;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  let b0;
  let b1;
  let b2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
  else if (type === 'hp') [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  else [b0, b1, b2] = [al, 0, -al];
  const a0 = 1 + al;
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * cw) / a0, (1 - al) / a0];
}

function noise({ t, dur, amp = 0.1, type = 'lp', f = 1000, f2 = f, q = 0.7, att = 0.01, rel = 0.05, pan = 0, send = 0.2, decay = 0, swell = 0 }) {
  const n0 = Math.round(t * SR);
  const n = Math.round((dur + rel) * SR);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let c = coefs(type, f, q);
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    if (k % 32 === 0) c = coefs(type, f * Math.pow(f2 / f, Math.min(1, tt / dur)), q);
    const x = rnd() * 2 - 1;
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    let e = tt < att ? tt / att : 1;
    if (decay) e *= Math.exp(-tt * decay);
    if (swell) e *= Math.pow(Math.min(1, tt / dur), swell);
    if (tt > dur) e *= Math.max(0, 1 - (tt - dur) / rel);
    put(n0 + k, y * e * amp, pan, send);
  }
}

function pad({ t, dur, notes, amp = 0.04, cutoff = 1300, att = 1.2, rel = 1.6, send = 0.55 }) {
  const n0 = Math.round(t * SR);
  const n = Math.round((dur + rel) * SR);
  const buf = new Float32Array(n);
  for (const m of notes)
    for (const d of [-0.09, 0, 0.09]) {
      const f = mtof(m + d);
      let ph = rnd();
      for (let k = 0; k < n; k++) {
        ph += f / SR;
        buf[k] += 2 * (ph - Math.floor(ph)) - 1;
      }
    }
  const c = coefs('lp', cutoff, 0.6);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const x = buf[k];
    const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    let e = Math.min(1, tt / att);
    if (tt > dur) e *= Math.max(0, 1 - (tt - dur) / rel);
    const wob = 1 + 0.08 * Math.sin(TAU * 0.3 * tt);
    put(n0 + k, (y * e * amp * wob) / notes.length, Math.sin(tt * 0.7) * 0.2, send);
  }
}

const kick = (t, amp = 0.55) => {
  osc({ t, dur: 0.34, f: 140, f2: 42, amp, decay: 8.5, att: 0.001, rel: 0.02, send: 0.04 });
  noise({ t, dur: 0.012, amp: amp * 0.25, type: 'hp', f: 3000, send: 0 });
};
const snare = (t, amp = 0.16) => {
  noise({ t, dur: 0.16, type: 'bp', f: 2000, q: 0.7, amp, decay: 22, send: 0.25 });
  osc({ t, dur: 0.09, f: 200, f2: 170, amp: amp * 0.7, decay: 26, send: 0.1 });
};
const clap = (t, amp = 0.13) => {
  for (let i = 0; i < 3; i++) noise({ t: t + i * 0.011, dur: 0.02, type: 'bp', f: 1500, q: 1.2, amp, send: 0.3 });
  noise({ t: t + 0.033, dur: 0.12, type: 'bp', f: 1500, q: 1.0, amp: amp * 0.8, decay: 20, send: 0.35 });
};
const hat = (t, amp = 0.035, open = false) => noise({ t, dur: open ? 0.16 : 0.03, type: 'hp', f: 8000, amp, rel: 0.02, send: 0.04, decay: open ? 10 : 0, pan: 0.25 });
const crash = (t, amp = 0.12) => noise({ t, dur: 1.8, type: 'hp', f: 5000, amp, decay: 2.2, send: 0.5 });
const tick = (t, amp = 0.03, pan = 0) => noise({ t, dur: 0.006, type: 'hp', f: 4000, amp, rel: 0.004, send: 0.05, pan });
const bass = (t, m, dur = 0.26, amp = 0.17) => {
  osc({ t, dur, f: mtof(m), wave: 'tri', amp, decay: 3, att: 0.004, rel: 0.05, send: 0.03 });
  osc({ t, dur, f: mtof(m - 12), amp: amp * 0.8, decay: 2, att: 0.004, rel: 0.05, send: 0 });
};
const mbox = (t, m, amp = 0.05, pan = 0) => fm({ t, f: mtof(m), amp, ratio: 3.5, index: 2.2, idxDecay: 7, decay: 3.2, dur: 1.4, pan, send: 0.4 });
const ep = (t, m, amp = 0.07, pan = 0, dur = 3.2) => fm({ t, f: mtof(m), amp, ratio: 1, index: 1.4, idxDecay: 2.2, decay: 0.9, dur, pan, send: 0.45, att: 0.004, trem: 0.15 });
const buzz = (t, amp = 0.1, dur = 0.16) => {
  const n0 = Math.round(t * SR);
  const n = Math.round(dur * SR);
  for (let k = 0; k < n; k++) {
    const tt = k / SR;
    const s = Math.sin(TAU * 158 * tt) + 0.35 * Math.sin(TAU * 474 * tt) + 0.15 * Math.sin(TAU * 790 * tt);
    const am = 0.55 + 0.45 * Math.sin(TAU * 31 * tt);
    const e = Math.min(1, tt / 0.01) * Math.min(1, (dur - tt) / 0.03);
    put(n0 + k, s * am * e * amp, 0, 0.05);
  }
};

// ── 乐谱 ──
const BEAT = 0.6;
const G0 = 5.0;
const beatT = (b) => G0 + b * BEAT;
const CH = {
  Dm: [62, 65, 69],
  Bb: [58, 62, 65],
  F: [65, 69, 72],
  C: [60, 64, 67],
  Am: [57, 60, 64],
  G: [55, 59, 62],
};
const PROG = ['Dm', 'Bb', 'F', 'C'];
const ARP = [0, 1, 2, 3, 2, 1, 0, 4];
const arpNote = (ch, k) => {
  const n = CH[ch];
  const seq = [n[0] + 12, n[1] + 12, n[2] + 12, n[0] + 24, n[2]];
  return seq[ARP[k % 8]];
};

// 开场：低音铺底 → 漩涡呼啸 → 一声闷响 → 磁带倒带
pad({ t: 0.0, dur: 4.0, notes: [38, 45, 50], amp: 0.05, cutoff: 600, att: 1.5, rel: 0.5, send: 0.4 });
mbox(0.4, 74, 0.04, -0.3);
mbox(1.0, 69, 0.035, 0.3);
mbox(1.55, 77, 0.035, -0.2);
noise({ t: 1.7, dur: 1.4, amp: 0.22, type: 'bp', f: 250, f2: 4500, q: 0.8, att: 0.3, rel: 0.08, swell: 1.4, send: 0.3 });
osc({ t: 1.7, dur: 1.38, f: 90, f2: 420, wave: 'saw', amp: 0.035, att: 0.4, rel: 0.05, send: 0.2 });
osc({ t: 3.06, dur: 0.6, f: 70, f2: 34, amp: 0.55, decay: 4, att: 0.002, rel: 0.1, send: 0.2 });
noise({ t: 3.06, dur: 0.4, amp: 0.12, type: 'lp', f: 900, decay: 6, send: 0.4 });
for (const [i, m] of [74, 78, 81].entries()) fm({ t: 3.15 + i * 0.05, f: mtof(m), amp: 0.045, ratio: 2, index: 1.5, decay: 1.3, dur: 2.2, send: 0.6, pan: (i - 1) * 0.4 });

// 前菜：音乐盒琶音 + 铺底（5.0 起）
for (let bar = 0; bar < 9; bar++) {
  const ch = PROG[bar % 4];
  const t0 = beatT(bar * 4);
  pad({ t: t0, dur: 2.4, notes: CH[ch].map((m) => m - 12), amp: 0.05, cutoff: 1100, att: 0.6, rel: 0.9 });
  for (let k = 0; k < 8; k++) {
    const t = t0 + k * 0.3;
    const duck = t > 18.5 && t < 21.85 ? 0.22 : 1;
    if (t < 26.9) mbox(t, arpNote(ch, k), 0.085 * duck * (k % 2 ? 0.75 : 1), k % 2 ? 0.3 : -0.3);
  }
}
// 1997 贪吃蛇：8-bit 芯片音乐
{
  const mel = [74, 77, 81, 86, 84, 81, 77, 76, 74, 77, 81, 84, 81, 79, 77, 76, 74, 81, 86, 81];
  mel.forEach((m, i) => osc({ t: 18.6 + i * 0.15, dur: 0.12, f: mtof(m), wave: 'square', amp: 0.045, att: 0.002, rel: 0.02, send: 0.08 }));
  [50, 50, 57, 57, 53, 53, 48, 48, 50, 50].forEach((m, i) => osc({ t: 18.6 + i * 0.3, dur: 0.24, f: mtof(m), wave: 'pulse', amp: 0.05, att: 0.002, rel: 0.02, send: 0.03 }));
}

// 主菜：2007 老虎机蓄力 → 30.2 鼓点炸开
noise({ t: 27.3, dur: 2.9, amp: 0.12, type: 'hp', f: 400, f2: 6000, att: 0.5, swell: 1.6, send: 0.3 });
osc({ t: 27.3, dur: 2.88, f: 110, f2: 440, wave: 'saw', amp: 0.03, att: 0.8, rel: 0.02, send: 0.2 });
crash(30.2, 0.13);
kick(30.2, 0.6);
for (let b = 42; b < 60; b++) {
  const t = beatT(b);
  const ch = PROG[Math.floor(b / 4) % 4];
  if (b > 42) kick(t, 0.42);
  if (b % 2 === 1) clap(t, 0.09);
  hat(t + 0.3, 0.035);
  bass(t + 0.3, CH[ch][0] - 24, 0.24, 0.15);
  if (b % 4 === 0) pad({ t, dur: 2.4, notes: CH[ch].map((m) => m - 12), amp: 0.04, cutoff: 1600, att: 0.2, rel: 0.6 });
  mbox(t, arpNote(ch, (b * 2) % 8) + 12, 0.035, -0.35);
  mbox(t + 0.3, arpNote(ch, (b * 2 + 1) % 8), 0.03, 0.35);
}
// 硬菜：过渡上扬 → 一条街的快节奏 → 整条街的大漩涡 → 56.0 砸下来
noise({ t: 40.6, dur: 1.6, amp: 0.13, type: 'bp', f: 300, f2: 5000, q: 0.9, att: 0.3, swell: 1.5, send: 0.3 });
for (let b = 62; b < 85; b++) {
  const t = beatT(b);
  const ch = PROG[Math.floor(b / 4) % 4];
  kick(t, 0.46);
  if (b % 2 === 1) clap(t, 0.1);
  for (let s = 0; s < 4; s++) hat(t + s * 0.15, s === 2 ? 0.045 : 0.026, s === 2);
  bass(t + 0.3, CH[ch][0] - 24, 0.2, 0.17);
  bass(t + 0.45, CH[ch][0] - 12, 0.1, 0.09);
  if (b % 4 === 0) pad({ t, dur: 2.4, notes: CH[ch].map((m) => m - 12), amp: 0.045, cutoff: 2200, att: 0.1, rel: 0.5 });
  mbox(t + 0.15, arpNote(ch, b % 8) + 12, 0.03, 0.3);
}
noise({ t: 53.2, dur: 2.8, amp: 0.2, type: 'bp', f: 200, f2: 7000, q: 0.7, att: 0.2, swell: 2.0, send: 0.35 });
osc({ t: 53.2, dur: 2.78, f: 80, f2: 640, wave: 'saw', amp: 0.04, att: 0.3, rel: 0.02, send: 0.3 });
for (let i = 0, t = 53.2; t < 55.95; i++) {
  snare(t, 0.05 + 0.1 * ((t - 53.2) / 2.8));
  t += t < 54.4 ? 0.3 : t < 55.3 ? 0.15 : 0.075;
}
crash(56.0, 0.16);
osc({ t: 56.0, dur: 1.2, f: 60, f2: 30, amp: 0.6, decay: 2.5, att: 0.002, rel: 0.2, send: 0.3 });

// 甜点：电钢琴，慢下来
const DES = [
  ['Am', 57.2],
  ['F', 62.0],
  ['C', 66.8],
  ['G', 71.6],
];
for (const [ch, t0] of DES) {
  const n = CH[ch];
  const low = ch === 'F' || ch === 'C' ? -12 : -12;
  pad({ t: t0, dur: 4.6, notes: n.map((m) => m + low), amp: 0.05, cutoff: 900, att: 1.0, rel: 1.4 });
  n.forEach((m, i) => ep(t0 + i * 0.06, m, 0.09, (i - 1) * 0.3));
  ep(t0, n[0] - 12, 0.1, 0);
  n.forEach((m, i) => ep(t0 + 2.4 + i * 0.07, m + (i === 2 ? 12 : 0), 0.07, (1 - i) * 0.3, 2.4));
}
[
  [58.4, 76],
  [59.6, 74],
  [61.0, 72],
  [63.2, 77],
  [64.4, 76],
  [65.6, 72],
  [67.4, 79],
  [68.6, 76],
].forEach(([t, m]) => ep(t, m, 0.075, 0.2, 2.6));
// 2026 本事：轻轻的心跳 + 闪光
for (let t = 68.6; t < 72.2; t += 0.6) osc({ t, dur: 0.25, f: 90, f2: 45, amp: 0.2, decay: 10, att: 0.002, rel: 0.02, send: 0.05 });

// 最后一道：音乐盒越转越慢，停住
pad({ t: 72.2, dur: 7.6, notes: [50, 57, 62, 64, 69], amp: 0.075, cutoff: 1200, att: 1.5, rel: 0.8, send: 0.6 });
{
  const seq = [86, 81, 77, 74, 81, 77, 74, 69, 74, 69, 65, 62];
  let t = 72.3;
  let gap = 0.32;
  for (let i = 0; i < seq.length && t < 79.9; i++) {
    mbox(t, seq[i], 0.085 * (1 - i / 20), i % 2 ? 0.25 : -0.25);
    t += gap;
    gap *= 1.17;
  }
}

// ── 音效：按画面事件一一对齐 ──
const SCALE = [0, 3, 5, 7, 10];
const lands = EV.filter((e) => e.type === 'land').map((e) => e.t);
lands.forEach((t, i) => {
  let dens = 0;
  for (const u of lands) if (Math.abs(u - t) < 0.2) dens++;
  const k = 1 / Math.sqrt(dens);
  buzz(t, 0.09 * k, dens > 3 ? 0.09 : 0.16);
  const m = 62 + SCALE[i % 5] + 12 * (Math.floor(i / 5) % 3);
  fm({ t, f: mtof(m), amp: 0.06 * k, ratio: 2, index: 1.2, idxDecay: 9, decay: 6, dur: 0.6, pan: ((i % 5) - 2) * 0.2, send: 0.3 });
});
for (const e of EV) {
  const t = e.t;
  switch (e.type) {
    case 'type':
    case 'flash': {
      const n = [...(e.cn || '')].length;
      for (let i = 0; i < n; i++) tick(t + (i + 1) / e.cps, 0.022, (i % 2 ? 0.2 : -0.2));
      break;
    }
    case 'year':
      if (e.dur >= 0.25) for (let x = 0; x < e.dur; x += 1 / 34) tick(t + x, 0.016 * (1 - x / e.dur) + 0.006, 0.1);
      break;
    case 'scan':
      osc({ t, dur: e.dur, f: 2600, f2: 700, amp: 0.025, att: 0.05, rel: 0.1, send: 0.4 });
      noise({ t, dur: e.dur, amp: 0.035, type: 'bp', f: 6000, f2: 1500, q: 2, att: 0.05, rel: 0.1, send: 0.3 });
      break;
    case 'peel':
      osc({ t, dur: 0.07, f: 420, f2: 980, amp: 0.05, decay: 12, att: 0.002, rel: 0.03, send: 0.2 });
      break;
    case 'snap':
      noise({ t, dur: 0.05, amp: 0.3, type: 'bp', f: 2600, q: 0.9, decay: 30, send: 0.3 });
      for (let i = 0; i < 18; i++) tick(t + rnd() * 0.45, 0.05 * rnd(), rnd() * 2 - 1);
      break;
    case 'rewind':
      noise({ t, dur: e.dur, amp: 0.12, type: 'bp', f: 3500, f2: 700, q: 1.5, att: 0.05, rel: 0.05, send: 0.2 });
      osc({ t, dur: e.dur, f: 1100, f2: 220, wave: 'tri', amp: 0.04, vib: 0.06, vibRate: 22, att: 0.05, rel: 0.05, send: 0.2 });
      break;
    case 'chomp':
      for (let x = 0; x < e.dur + 0.1; x += 0.07) osc({ t: t + x, dur: 0.05, f: 700, f2: 260, wave: 'square', amp: 0.04, att: 0.002, rel: 0.01, send: 0.05 });
      break;
    case 'slots':
      for (const stop of e.stops) {
        let x = t;
        let g = 0.035;
        while (x < stop) {
          tick(x, 0.03, 0.3);
          x += g;
          g *= 1.06;
        }
        fm({ t: stop, f: 1568, amp: 0.05, ratio: 3.01, index: 1.6, decay: 4, dur: 1.0, send: 0.35 });
      }
      break;
    case 'gadget':
      osc({ t, dur: 0.22, f: 180, f2: 620, amp: 0.06, vib: 0.08, vibRate: 18, decay: 6, att: 0.003, rel: 0.05, send: 0.25 });
      break;
    case 'flood':
      for (let i = 0; i < 8; i++)
        noise({ t: t + (i * e.dur) / 8, dur: 0.5, amp: 0.06, type: 'bp', f: 500, f2: 3500, q: 1.2, att: 0.2, swell: 1.2, rel: 0.05, pan: i % 2 ? 0.6 : -0.6, send: 0.25 });
      break;
    case 'expose':
      noise({ t, dur: 0.7, amp: 0.07, type: 'hp', f: 2000, f2: 8000, att: 0.3, rel: 0.3, send: 0.4 });
      break;
    case 'pop':
      osc({ t, dur: 0.08, f: 300, f2: 720, amp: 0.05, decay: 10, att: 0.002, rel: 0.03, send: 0.15 });
      break;
    case 'rumble':
      noise({ t, dur: 0.35, amp: 0.2, type: 'lp', f: 140, q: 0.9, att: 0.05, rel: 0.1, send: 0.1 });
      break;
    case 'skills':
      for (let i = 0; i < 10; i++) fm({ t: t + 0.3 + i * 0.12, f: mtof(86 + SCALE[i % 5]), amp: 0.025, ratio: 3.5, index: 1.5, decay: 5, dur: 0.8, pan: rnd() * 1.2 - 0.6, send: 0.5 });
      break;
    default:
  }
}

// ── 混响 ──
function freeverb(inp, spread) {
  const sc = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * sc)), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * sc)), i: 0 }));
  const out = new Float32Array(inp.length);
  const fb = 0.86;
  const damp = 0.22;
  for (let n = 0; n < inp.length; n++) {
    const x = inp[n] * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * (1 - damp) + c.f * damp;
      c.buf[c.i] = x + c.f * fb;
      if (++c.i >= c.buf.length) c.i = 0;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      const y = -s + b;
      a.buf[a.i] = s + b * 0.5;
      if (++a.i >= a.buf.length) a.i = 0;
      s = y;
    }
    out[n] = s;
  }
  return out;
}
const WL = freeverb(SL, 0);
const WR = freeverb(SRv, 23);
const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
const WET = Number(process.env.WET || 3);
console.log(`干声 ${(20 * Math.log10(rms(L))).toFixed(1)} dB  混响 ${(20 * Math.log10(rms(WL) * WET)).toFixed(1)} dB`);

// ── 总线：黑屏前收干净，"第 101 件"时只留一个低音和两下振动 ──
const MIX_L = new Float32Array(N);
const MIX_R = new Float32Array(N);
const gate = (t) => (t < 80.35 ? 1 : t < 80.95 ? 1 - (t - 80.35) / 0.6 : 0);
for (let n = 0; n < N; n++) {
  const g = gate(n / SR);
  MIX_L[n] = (L[n] + WL[n] * WET) * g;
  MIX_R[n] = (R[n] + WR[n] * WET) * g;
}
// 结尾：一个很轻的低音 + 手机振动两下
{
  const keepL = L;
  keepL.fill(0);
  R.fill(0);
  SL.fill(0);
  SRv.fill(0);
  ep(83.85, 50, 0.12, 0, 3.4);
  ep(83.85, 62, 0.04, 0, 3.4);
  buzz(84.6, 0.08, 0.18);
  buzz(84.95, 0.08, 0.18);
  const wl = freeverb(SL, 0);
  const wr = freeverb(SRv, 23);
  for (let n = Math.round(83.5 * SR); n < N; n++) {
    MIX_L[n] += L[n] + wl[n];
    MIX_R[n] += R[n] + wr[n];
  }
}

let peak = 0;
for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(MIX_L[n]), Math.abs(MIX_R[n]));
const norm = 0.89 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 4, 40);
const sat = (x) => Math.tanh(1.3 * x) / Math.tanh(1.3);
for (let n = 0; n < N; n++) {
  buf.writeInt16LE(Math.round(sat(MIX_L[n] * norm) * 32000), 44 + n * 4);
  buf.writeInt16LE(Math.round(sat(MIX_R[n] * norm) * 32000), 46 + n * 4);
}
fs.writeFileSync(OUT, buf);
console.log(`音轨 → ${OUT}  ${(N / SR).toFixed(1)}s  峰值归一 ${norm.toFixed(2)}`);
