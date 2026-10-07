import * as THREE from 'three';
import { seg, ease, lerp, bezier2, rng, clamp } from '../engine/util.js';

// 2008 App Store：闸门打开，一串小东西从四面八方涌进屏幕，各自缩成一个图标落进格子
export class Flood {
  constructor(scene, ctx, o) {
    this.ctx = ctx;
    this.t0 = o.t0;
    const r = rng(o.seed ?? 77);
    const n = o.list.length;
    this.parts = o.list.map((p, i) => {
      const obj = p.make();
      obj.group.visible = false;
      scene.add(obj.group);
      const a = Math.PI * (0.15 + 0.7 * (i / Math.max(1, n - 1))) + (r() - 0.5) * 0.2;
      const side = i % 2 ? 1 : -1;
      const start = new THREE.Vector3(Math.cos(a) * 1.5 * side, 2.0 + Math.sin(a) * 1.0, 1.4 + r() * 0.6);
      const land = o.first + i * o.gap;
      const fit = 0.72 / Math.max(obj.size.x, obj.size.y, obj.size.z);
      return {
        ...p,
        obj,
        start,
        land,
        appear: land - 0.85,
        fit,
        spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
        item: ctx.tl.item(land, p.icon, p.label),
      };
    });
    ctx.tl.event(this.parts[0].appear, 'flood', { dur: this.parts[n - 1].land - this.parts[0].appear });
    this._p1 = new THREE.Vector3();
    this._p2 = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  update(t) {
    let glow = 0;
    for (const p of this.parts) {
      const g = p.obj.group;
      const u = clamp((t - p.appear) / (p.land - p.appear));
      g.visible = t >= p.appear && t < p.land;
      const since = t - p.land;
      if (since >= 0 && since < 0.3) glow += 1 - since / 0.3;
      if (!g.visible) continue;
      const slot = this.ctx.slotAt(p.item.index, p.item.t);
      const P2 = this.ctx.phone.canvasToWorld(slot.x, slot.y, this._p2);
      const P1 = this._p1.copy(p.start).lerp(P2, 0.45).add(new THREE.Vector3(-p.start.x * 0.35, 0.5, 0.4));
      const e = ease.inQuad(u);
      bezier2(g.position, p.start, P1, P2, e);
      const pop = ease.outBack(clamp(u / 0.25));
      const endSize = this.ctx.phone.canvasSizeToWorld(slot.size) / 0.72;
      g.scale.setScalar(p.fit * pop * lerp(1, endSize, ease.inQuad(u)));
      this._q.setFromAxisAngle(p.spin, u * 5);
      g.quaternion.copy(this._q);
      p.obj.drain.uBright.value = 0.3 + 0.7 * clamp(u * 3);
    }
    return Math.min(1, glow);
  }
}
