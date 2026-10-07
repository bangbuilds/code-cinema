import { clamp, ease, lerp } from './util.js';

// 全片时间线：被吞的物件（计数器、主屏幕格子都从这里推出来）、年份、版式、字幕、音效事件
export class Timeline {
  constructor() {
    this.items = [];
    this.years = [];
    this.layouts = [];
    this.texts = [];
    this.events = [];
  }

  item(t, icon, label) {
    const it = { t, icon, label, index: -1 };
    this.items.push(it);
    this.event(t, 'land', { label });
    return it;
  }

  year(t, year, dur = 0.7) {
    this.years.push({ t, year, dur });
    this.event(t, 'year', { year, dur });
  }

  layout(t, name, dur = 0.6) {
    this.layouts.push({ t, name, dur });
  }

  // 字幕：中文标题 + 英文标题 + 中文副标题 + 英文副标题
  text(o) {
    this.texts.push({ style: 'beat', ...o });
    this.event(o.t0, o.style === 'flash' ? 'flash' : 'type', { cn: o.cn, cps: o.cps ?? (o.style === 'flash' ? 40 : 14) });
  }

  event(t, type, data = {}) {
    this.events.push({ t, type, ...data });
  }

  finalize() {
    this.items.sort((a, b) => a.t - b.t);
    this.items.forEach((it, i) => (it.index = i));
    this.years.sort((a, b) => a.t - b.t);
    this.layouts.sort((a, b) => a.t - b.t);
    this.events.sort((a, b) => a.t - b.t);
  }

  // 计数器：每落地一件 +1，带 0.14 秒滚动
  count(t) {
    let c = 0;
    for (const it of this.items) {
      if (t < it.t) break;
      c += Math.min(1, (t - it.t) / 0.14);
    }
    return c;
  }

  yearAt(t) {
    const Y = this.years;
    if (!Y.length) return 0;
    if (t < Y[0].t) return Y[0].year;
    let i = 0;
    while (i < Y.length - 1 && Y[i + 1].t <= t) i++;
    const cur = Y[i];
    const prev = i > 0 ? Y[i - 1].year : cur.year;
    return lerp(prev, cur.year, ease.inOutCubic(clamp((t - cur.t) / cur.dur)));
  }

  yearRolling(t) {
    return this.years.some((y) => t > y.t && t < y.t + y.dur);
  }

  layoutAt(t) {
    const L = this.layouts;
    if (!L.length) return { a: 'beat', b: 'beat', mix: 1 };
    if (t < L[0].t) return { a: L[0].name, b: L[0].name, mix: 1 };
    let i = 0;
    while (i < L.length - 1 && L[i + 1].t <= t) i++;
    const cur = L[i];
    const prev = i > 0 ? L[i - 1].name : cur.name;
    return { a: prev, b: cur.name, mix: ease.inOutCubic(clamp((t - cur.t) / cur.dur)) };
  }
}
