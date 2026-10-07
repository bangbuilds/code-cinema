import * as THREE from 'three';
import { iconTexture } from '../world/icons.js';
import { makeGlow, makeScanRing } from '../world/fx.js';
import { seg, ease, lerp, invLerp, smoothstep, bezier2, hash1 } from '../engine/util.js';

// 2007：MP3、功能机、电脑三样一起被扫，三个图标像老虎机一样转，停稳后一起飞进手机
const POOL = ['music', 'oldphone', 'globe', 'camera', 'clock', 'map', 'calc', 'radio', 'game', 'mail', 'tv', 'book'];

export class SlotMerge {
  constructor(scene, ctx, o) {
    this.ctx = ctx;
    this.t0 = o.t0;
    this.hold = o.hold.clone();
    this.T = { emerge: [0, 0.6], scan: [0.7, 1.25], peel: [1.25, 1.45], row: [1.45, 1.75], spin: 1.5, husk: [1.4, 2.9] };
    this.parts = o.objs.map((p, i) => {
      const obj = p.obj;
      obj.group.visible = false;
      scene.add(obj.group);
      const pivot = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: iconTexture(p.icon), transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }),
      );
      mesh.renderOrder = 20;
      pivot.add(mesh);
      pivot.visible = false;
      const halo = makeGlow('#d6ecff');
      const ring = makeScanRing();
      scene.add(pivot, halo, ring);
      const stop = 2.05 + i * 0.28;
      const land = 3.3 + i * 0.06;
      return {
        ...p,
        i,
        pivot,
        mesh,
        halo,
        ring,
        stop,
        turns: 5 + i,
        x: (i - 1) * (o.spacing ?? 0.95),
        huskTo: o.graves[i],
        item: ctx.tl.item(this.t0 + land, p.icon, p.label),
        land,
        cur: p.icon,
      };
    });
    ctx.tl.event(this.t0 + this.T.scan[0], 'scan', { dur: 0.55 });
    ctx.tl.event(this.t0 + this.T.spin, 'slots', { stops: this.parts.map((p) => this.t0 + p.stop) });
    this.scale = o.scale ?? 0.36;
    this._p = new THREE.Vector3();
    this._p0 = new THREE.Vector3();
    this._p1 = new THREE.Vector3();
    this._p2 = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  update(t, camera) {
    const lt = t - this.t0;
    const T = this.T;
    for (const p of this.parts) {
      const g = p.obj.group;
      const D = p.obj.drain;
      g.visible = lt >= 0;
      if (!g.visible) {
        p.pivot.visible = false;
        p.halo.visible = false;
        p.ring.visible = false;
        continue;
      }
      const e = seg(lt, T.emerge[0], T.emerge[1], ease.outCubic);
      const h = seg(lt, T.husk[0], T.husk[1], ease.inOutCubic);
      const pos = this._p.set(this.hold.x + p.x, this.hold.y + (1 - e) * 0.3, this.hold.z - (1 - e) * 0.5);
      pos.y += Math.sin(t * 1.4 + p.i) * 0.02;
      pos.lerp(p.huskTo, h);
      g.position.copy(pos);
      g.rotation.set(0.15 + h * 0.3, -0.35 + p.i * 0.35 + 0.15 * Math.sin(0.8 * lt + p.i) + h * 0.6, 0);
      g.scale.setScalar(this.scale * (p.scaleMul ?? 1) * (1 - 0.3 * h));
      g.updateMatrixWorld(true);
      D.uBright.value = (0.02 + 0.98 * seg(lt, 0, 0.5, ease.inQuad)) * (1 - 0.72 * h);
      const s = invLerp(T.scan[0], T.scan[1], lt);
      const scanning = lt >= T.scan[0] && lt <= T.scan[1];
      const hh = p.obj.size.y * 0.5 * this.scale * (p.scaleMul ?? 1);
      D.uScanY.value = lt < T.scan[0] ? 1e5 : lerp(this.hold.y + hh + 0.05, this.hold.y - hh - 0.05, ease.inOutSine(s));
      D.uDrain.value = seg(lt, T.scan[1] - 0.05, T.scan[1] + 0.25);
      const glow = scanning ? smoothstep(0, 0.1, s) * (1 - smoothstep(0.85, 1, s)) : 0;
      D.uGlow.value = 1.2 * glow;
      p.ring.set(this._p0.set(pos.x, D.uScanY.value, pos.z), p.obj.radius * this.scale * 0.6, glow);

      // 图标：剥下 → 排成一排 → 转 → 停 → 飞
      const vis = lt >= T.peel[0] && lt < p.land;
      p.pivot.visible = vis;
      if (!vis) {
        p.halo.visible = false;
        continue;
      }
      const pe = seg(lt, T.peel[0], T.peel[1], ease.outBack);
      const ro = seg(lt, T.row[0], T.row[1], ease.inOutCubic);
      const rowPos = this._p1.set(this.hold.x + p.x * 0.66, this.hold.y + 0.08, this.hold.z + 0.75);
      const start = this._p0.set(this.hold.x + p.x, this.hold.y, this.hold.z + 0.3);
      const fly0 = p.land - 0.42;
      const fl = seg(lt, fly0, p.land, ease.inOutCubic);
      const slot = this.ctx.slotAt(p.item.index, p.item.t);
      const P2 = this.ctx.phone.canvasToWorld(slot.x, slot.y, this._p2);
      const base = start.lerp(rowPos, ro);
      const ctrl = base.clone().lerp(P2, 0.5).add(new THREE.Vector3(0, 0.25, 0.3));
      bezier2(p.pivot.position, base, ctrl, P2, fl);
      const size = lerp(0.46 * Math.max(0.001, pe), this.ctx.phone.canvasSizeToWorld(slot.size), ease.inQuad(fl));
      p.pivot.scale.setScalar(size);
      this.ctx.phone.group.getWorldQuaternion(this._q);
      p.pivot.quaternion.copy(camera.quaternion).slerp(this._q, ease.inOutQuad(fl));

      // 老虎机转动：每转半圈换一次图案，最后停在自己的图标上
      let th = 0;
      if (lt > T.spin && lt < p.stop + 0.2) {
        const u = Math.min(1, (lt - T.spin) / (p.stop - T.spin));
        th = Math.PI * 2 * p.turns * (1 - Math.pow(1 - u, 3));
        if (lt > p.stop) th = Math.sin((lt - p.stop) * 30) * 0.18 * (1 - (lt - p.stop) / 0.2);
      }
      p.mesh.rotation.x = th;
      const half = Math.floor((th + Math.PI / 2) / Math.PI);
      const finalHalf = p.turns * 2;
      const want = lt > T.spin && lt < p.stop && half !== finalHalf ? POOL[Math.floor(hash1(p.i * 31 + half) * POOL.length)] : p.icon;
      if (want !== p.cur) {
        p.mesh.material.map = iconTexture(want);
        p.cur = want;
      }
      p.mesh.material.color.setScalar(1 + 0.5 * (1 - fl));
      p.halo.set(p.pivot.position, size * 2.6, 0.6 * (1 - fl) * Math.min(1, pe));
    }
  }
}
