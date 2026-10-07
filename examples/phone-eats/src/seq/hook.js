import * as THREE from 'three';
import * as O from '../world/objects.js';
import { clamp, lerp, seg, ease, rng, smoothstep } from '../engine/util.js';

// 开场：一屋子旧物 → 漩涡吸进平躺的手机 → 倒拨回 1973
export const VORTEX_C = new THREE.Vector3(0, 0.09, 0.9);
export const REW = [4.15, 4.95];

export class Hook {
  constructor(scene, ctx, n = 100, seed = 20261006) {
    this.ctx = ctx;
    const r = rng(seed);
    const C = new THREE.Vector3(0, 0, -2.3);
    const R = 3.7;
    const Hm = 2.5;
    const placed = [];
    this.items = [];
    for (let i = 0; i < n; i++) {
      const obj = O.PILE_KINDS[i % O.PILE_KINDS.length]();
      const rad = Math.min(obj.radius, 1.1);
      let best = null;
      for (let k = 0; k < 80; k++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * R;
        const x = C.x + Math.cos(a) * rr * 1.3;
        const z = C.z + Math.sin(a) * rr * 0.85;
        const surf = Hm * Math.pow(Math.max(0, 1 - (rr / R) ** 2), 0.85);
        const y = Math.max(rad * 0.5, surf - r() * 0.55);
        if (Math.hypot(x - VORTEX_C.x, z - VORTEX_C.z) < 1.25 + rad * 0.5) continue;
        const p = new THREE.Vector3(x, y, z);
        if (!best) best = p;
        let ok = true;
        for (const q of placed)
          if (q.p.distanceTo(p) < (q.r + rad) * 0.6) {
            ok = false;
            break;
          }
        if (ok) {
          best = p;
          break;
        }
      }
      placed.push({ p: best, r: rad });
      const q0 = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-0.55 + (r() - 0.5) * 1.3, (r() - 0.5) * 1.6, (r() - 0.5) * 1.1),
      );
      obj.group.position.copy(best);
      obj.group.quaternion.copy(q0);
      scene.add(obj.group);
      const dx = best.x - VORTEX_C.x;
      const dz = best.z - VORTEX_C.z;
      this.items.push({
        obj,
        p0: best.clone(),
        q0,
        r0: Math.hypot(dx, dz),
        th0: Math.atan2(dz, dx),
        h0: best.y - VORTEX_C.y,
        dist: best.distanceTo(VORTEX_C),
        axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
        spin: 2 + r() * 4,
        swirl: 2.3 + r() * 0.8,
        lift: 0.5 + r() * 0.8,
        jit: (r() - 0.5) * 0.06,
      });
    }
    const sorted = [...this.items].sort((a, b) => a.dist - b.dist);
    const maxD = sorted[sorted.length - 1].dist;
    sorted.forEach((it, rank) => {
      it.tl = 1.75 + 0.78 * Math.pow(rank / (n - 1), 1.15) + it.jit;
      it.d = 0.34 + 0.2 * (it.dist / maxD);
      it.ta = it.tl + it.d;
    });
    this.arrivals = [...this.items].sort((a, b) => a.ta - b.ta);
    this.arrivals.forEach((it, i) => (it.slot = i));
    this.arrT = this.arrivals.map((it) => it.ta);
    ctx.tl.event(1.75, 'vortex', { dur: this.arrT[this.arrT.length - 1] - 1.75 });
    ctx.tl.event(REW[0], 'rewind', { dur: REW[1] - REW[0] });
    this._q = new THREE.Quaternion();
  }

  arrived(t) {
    const A = this.arrT;
    if (t < A[0]) return 0;
    let i = 0;
    while (i < A.length - 1 && A[i + 1] <= t) i++;
    if (i >= A.length - 1) return A.length;
    return i + 1 + (t - A[i]) / (A[i + 1] - A[i]);
  }

  counter(t) {
    if (t < REW[0]) return Math.min(100, this.arrived(t));
    return 100 * (1 - seg(t, REW[0], REW[1], ease.inOutCubic));
  }

  // 返回最近到达带来的闪光强度
  update(t) {
    let flash = 0;
    const done = t > 5.2;
    for (const it of this.items) {
      const g = it.obj.group;
      if (done || t >= it.ta) {
        g.visible = false;
        const dt = t - it.ta;
        if (!done && dt < 0.4) flash += Math.exp(-dt * 11);
        continue;
      }
      g.visible = true;
      const u = clamp((t - it.tl) / it.d);
      if (u <= 0) {
        g.position.copy(it.p0);
        g.quaternion.copy(it.q0);
        g.scale.setScalar(1);
        continue;
      }
      const e = Math.pow(u, 2.1);
      const r = it.r0 * Math.pow(1 - e, 1.25);
      const th = it.th0 + it.swirl * e;
      const y = lerp(it.h0, 0, e) + Math.sin(Math.PI * Math.min(1, u * 1.4)) * 0.6 * (1 - e) * it.lift;
      g.position.set(VORTEX_C.x + Math.cos(th) * r, VORTEX_C.y + y, VORTEX_C.z + Math.sin(th) * r);
      this._q.setFromAxisAngle(it.axis, it.spin * e);
      g.quaternion.copy(it.q0).multiply(this._q);
      g.scale.setScalar(Math.max(0.001, Math.pow(1 - e, 0.65) * (1 - smoothstep(0.86, 1, u))));
    }
    return flash;
  }

  // 开场期间手机屏幕上的图标（7×15 密排，不带名字）
  screenIcons(t, phone) {
    const L = phone.layouts.dense;
    const cv = this.counter(t);
    const icons = [];
    for (const it of this.arrivals) {
      let sc;
      if (t < REW[0]) {
        if (t < it.ta) continue;
        sc = ease.outBack(seg(t, it.ta, it.ta + 0.2));
      } else {
        if (it.slot >= cv - 0.001) continue;
        sc = ease.outQuad(clamp(cv - it.slot));
      }
      const p = L.pos(it.slot);
      icons.push({ icon: it.obj.icon, x: p.x, y: p.y, size: L.size, scale: sc, labelSize: 0 });
    }
    return icons;
  }
}
