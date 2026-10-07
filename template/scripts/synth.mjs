// 合成器音色库：全部用代码合成，不使用任何外部音频素材
// const S = createSynth(时长秒); S.kick(t) ...; S.render('out/music.wav', { gate })
import fs from 'node:fs';

const TAU = Math.PI * 2;
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createSynth(duration, SR = 48000, seed0 = 20261007) {
  const N = Math.ceil((duration + 0.3) * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const SL = new Float32Array(N);
  const SRv = new Float32Array(N);
  let seed = seed0;
  const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

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

  function osc({ t, dur, f, f2 = f, wave = 'sine', amp = 0.1, att = 0.005, rel = 0.08, pan = 0, send = 0.15, vib = 0, vibRate = 5.5, decay = 0 }) {
    const n0 = Math.round(t * SR);
    const n = Math.round((dur + rel) * SR);
    let ph = rnd();
    for (let k = 0; k < n; k++) {
      const tt = k / SR;
      let fr = f * Math.pow(f2 / f, Math.min(1, tt / dur));
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
    let b;
    if (type === 'lp') b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
    else if (type === 'hp') b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
    else b = [al, 0, -al];
    const a0 = 1 + al;
    return [b[0] / a0, b[1] / a0, b[2] / a0, (-2 * cw) / a0, (1 - al) / a0];
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

  function pad({ t, dur, notes, amp = 0.04, cutoff = 1300, att = 1.2, rel = 1.6, send = 0.55, wave = 'saw' }) {
    const n0 = Math.round(t * SR);
    const n = Math.round((dur + rel) * SR);
    const buf = new Float32Array(n);
    for (const m of notes)
      for (const d of [-0.09, 0, 0.09]) {
        const f = mtof(m + d);
        let ph = rnd();
        for (let k = 0; k < n; k++) {
          ph += f / SR;
          const p = ph - Math.floor(ph);
          buf[k] += wave === 'saw' ? 2 * p - 1 : p < 0.5 ? 0.7 : -0.7;
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
      put(n0 + k, (y * e * amp * (1 + 0.08 * Math.sin(TAU * 0.3 * tt))) / notes.length, Math.sin(tt * 0.7) * 0.2, send);
    }
  }

  const S = {
    SR,
    N,
    rnd,
    mtof,
    osc,
    fm,
    noise,
    pad,
    kick: (t, amp = 0.55) => {
      osc({ t, dur: 0.34, f: 140, f2: 42, amp, decay: 8.5, att: 0.001, rel: 0.02, send: 0.04 });
      noise({ t, dur: 0.012, amp: amp * 0.25, type: 'hp', f: 3000, send: 0 });
    },
    snare: (t, amp = 0.16) => {
      noise({ t, dur: 0.16, type: 'bp', f: 2000, q: 0.7, amp, decay: 22, send: 0.25 });
      osc({ t, dur: 0.09, f: 200, f2: 170, amp: amp * 0.7, decay: 26, send: 0.1 });
    },
    clap: (t, amp = 0.13) => {
      for (let i = 0; i < 3; i++) noise({ t: t + i * 0.011, dur: 0.02, type: 'bp', f: 1500, q: 1.2, amp, send: 0.3 });
      noise({ t: t + 0.033, dur: 0.12, type: 'bp', f: 1500, q: 1.0, amp: amp * 0.8, decay: 20, send: 0.35 });
    },
    hat: (t, amp = 0.035, open = false) =>
      noise({ t, dur: open ? 0.16 : 0.03, type: 'hp', f: 8000, amp, rel: 0.02, send: 0.04, decay: open ? 10 : 0, pan: 0.25 }),
    crash: (t, amp = 0.12) => noise({ t, dur: 1.8, type: 'hp', f: 5000, amp, decay: 2.2, send: 0.5 }),
    tick: (t, amp = 0.03, pan = 0) => noise({ t, dur: 0.006, type: 'hp', f: 4000, amp, rel: 0.004, send: 0.05, pan }),
    bass: (t, m, dur = 0.26, amp = 0.17) => {
      osc({ t, dur, f: mtof(m), wave: 'tri', amp, decay: 3, att: 0.004, rel: 0.05, send: 0.03 });
      osc({ t, dur, f: mtof(m - 12), amp: amp * 0.8, decay: 2, att: 0.004, rel: 0.05, send: 0 });
    },
    mbox: (t, m, amp = 0.05, pan = 0) => fm({ t, f: mtof(m), amp, ratio: 3.5, index: 2.2, idxDecay: 7, decay: 3.2, dur: 1.4, pan, send: 0.4 }),
    ep: (t, m, amp = 0.07, pan = 0, dur = 3.2) =>
      fm({ t, f: mtof(m), amp, ratio: 1, index: 1.4, idxDecay: 2.2, decay: 0.9, dur, pan, send: 0.45, att: 0.004, trem: 0.15 }),
    buzz: (t, amp = 0.1, dur = 0.16) => {
      const n0 = Math.round(t * SR);
      const n = Math.round(dur * SR);
      for (let k = 0; k < n; k++) {
        const tt = k / SR;
        const s = Math.sin(TAU * 158 * tt) + 0.35 * Math.sin(TAU * 474 * tt) + 0.15 * Math.sin(TAU * 790 * tt);
        const e = Math.min(1, tt / 0.01) * Math.min(1, (dur - tt) / 0.03);
        put(n0 + k, s * (0.55 + 0.45 * Math.sin(TAU * 31 * tt)) * e * amp, 0, 0.05);
      }
    },
  };

  function freeverb(inp, spread) {
    const sc = SR / 44100;
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * sc)), i: 0, f: 0 }));
    const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * sc)), i: 0 }));
    const out = new Float32Array(inp.length);
    for (let n = 0; n < inp.length; n++) {
      const x = inp[n] * 0.015;
      let s = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.f = y * 0.78 + c.f * 0.22;
        c.buf[c.i] = x + c.f * 0.86;
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

  // 混音、限幅、写 16-bit WAV。gate(t) 是总线音量曲线（用来做绝对静音段）
  S.render = (outPath, { wet = 3, gate = () => 1 } = {}) => {
    const WL = freeverb(SL, 0);
    const WR = freeverb(SRv, 23);
    const ML = new Float32Array(N);
    const MR = new Float32Array(N);
    let peak = 0;
    for (let n = 0; n < N; n++) {
      const g = gate(n / SR);
      ML[n] = (L[n] + WL[n] * wet) * g;
      MR[n] = (R[n] + WR[n] * wet) * g;
      peak = Math.max(peak, Math.abs(ML[n]), Math.abs(MR[n]));
    }
    const norm = 0.89 / (peak || 1);
    const sat = (x) => Math.tanh(1.3 * x) / Math.tanh(1.3);
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
    for (let n = 0; n < N; n++) {
      buf.writeInt16LE(Math.round(sat(ML[n] * norm) * 32000), 44 + n * 4);
      buf.writeInt16LE(Math.round(sat(MR[n] * norm) * 32000), 46 + n * 4);
    }
    fs.writeFileSync(outPath, buf);
    return { seconds: N / SR, norm };
  };
  return S;
}
