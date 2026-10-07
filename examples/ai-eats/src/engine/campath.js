// 镜头关键帧：按时间做 Catmull-Rom 插值，速度连续，不会在关键帧处顿一下
// keys: [{ t, p:[x,y,z], l:[x,y,z], f: fov, stop?: true }]

const hermite = (p0, m0, p1, m1, u) => {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
};

export function makeCamPath(keys) {
  const n = keys.length;
  const zero = { p: [0, 0, 0], l: [0, 0, 0], f: 0 };
  const tan = keys.map((k, i) => {
    if (i === 0 || i === n - 1 || k.stop) return zero;
    const a = keys[i - 1];
    const b = keys[i + 1];
    const dt = b.t - a.t;
    return {
      p: k.p.map((_, j) => (b.p[j] - a.p[j]) / dt),
      l: k.l.map((_, j) => (b.l[j] - a.l[j]) / dt),
      f: (b.f - a.f) / dt,
    };
  });
  return (t) => {
    if (t <= keys[0].t) return keys[0];
    if (t >= keys[n - 1].t) return keys[n - 1];
    let i = 0;
    while (t > keys[i + 1].t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const h = b.t - a.t;
    const u = (t - a.t) / h;
    const ta = tan[i];
    const tb = tan[i + 1];
    return {
      p: a.p.map((_, j) => hermite(a.p[j], ta.p[j] * h, b.p[j], tb.p[j] * h, u)),
      l: a.l.map((_, j) => hermite(a.l[j], ta.l[j] * h, b.l[j], tb.l[j] * h, u)),
      f: hermite(a.f, ta.f * h, b.f, tb.f * h, u),
    };
  };
}
