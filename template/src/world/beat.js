import * as THREE from 'three';
import { iconTexture } from './icons.js';
import { makeGlow, makeScanRing } from './fx.js';
import { seg, ease, lerp, invLerp, smoothstep, bezier2 } from '../engine/util.js';

// "吃一口"的固定语法：
// 从黑暗里浮出（彩色）→ 扫描光扫过、颜色被吸走 → 剥下图标 → 图标飞进主屏幕格子 → 灰色空壳退进背景
export const DEFAULT_T = {
  emerge: [0, 1.0],
  scan: [1.6, 2.5],
  peel: [2.5, 2.75],
  fly: [2.75, 3.25],
  husk: [2.6, 4.2],
};

export class SwallowBeat {
  constructor(scene, ctx, o) {
    this.ctx = ctx;
    this.obj = o.obj;
    this.t0 = o.t0;
    const sp = o.speed ?? 1;
    const T = { ...DEFAULT_T, ...(o.T || {}) };
    this.T = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, v.map((x) => x * sp)]));
    this.hold = o.hold.clone();
    this.from = (o.from || o.hold.clone().add(new THREE.Vector3(-0.3, 0.3, -0.6))).clone();
    this.huskTo = (o.huskTo || new THREE.Vector3(-2, 3.5, -5)).clone();
    this.scale = o.scale ?? 0.55;
    this.rot = o.rot || new THREE.Euler(0.18, -0.55, 0);
    this.swing = o.swing ?? 0.2;
    this.scanBelow = o.scanBelow ?? 0.06;
    this.iconSize = o.iconSize ?? 0.42;
    this.peelOffset = o.peelOffset || new THREE.Vector3(0, -0.02, 0.32);
    this.arc = o.arc || new THREE.Vector3(0.38, 0.12, 0.45);
    this.seed = o.seed ?? 1;
    this.enterEase = o.enterEase || ease.outCubic;
    this.onUpdate = o.onUpdate || null;
    this.huskBright = o.huskBright ?? 0.22;

    const stagger = (o.stagger ?? 0.16) * sp;
    const list = o.icons || [{ icon: o.icon || this.obj.icon, label: o.label || '' }];
    this.icons = list.map((ic, k) => {
      const mat = new THREE.MeshBasicMaterial({
        map: iconTexture(ic.icon),
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.renderOrder = 20;
      mesh.visible = false;
      const halo = makeGlow('#d6ecff');
      scene.add(mesh, halo);
      const delay = k * stagger;
      const fan = list.length > 1 ? (k - (list.length - 1) / 2) * 0.34 : 0;
      return { ...ic, delay, fan, mesh, halo, item: ctx.tl.item(this.t0 + this.T.fly[1] + delay, ic.icon, ic.label) };
    });
    ctx.tl.event(this.t0 + this.T.scan[0], 'scan', { dur: this.T.scan[1] - this.T.scan[0] });
    ctx.tl.event(this.t0 + this.T.peel[0], 'peel', { n: list.length });

    this.ring = makeScanRing();
    scene.add(this.obj.group, this.ring);
    this.obj.group.visible = false;

    this._p = new THREE.Vector3();
    this._p0 = new THREE.Vector3();
    this._p1 = new THREE.Vector3();
    this._p2 = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
  }

  get land() {
    return this.icons[this.icons.length - 1].item.t;
  }

  scanProgress(t) {
    const lt = t - this.t0;
    if (lt < this.T.scan[0] || lt > this.T.scan[1]) return -1;
    return invLerp(this.T.scan[0], this.T.scan[1], lt);
  }

  update(t, camera) {
    const { obj, T } = this;
    const lt = t - this.t0;
    const D = obj.drain;
    obj.group.visible = lt >= T.emerge[0];
    if (!obj.group.visible) {
      for (const ic of this.icons) {
        ic.mesh.visible = false;
        ic.halo.visible = false;
      }
      this.ring.visible = false;
      return;
    }

    const e = seg(lt, T.emerge[0], T.emerge[1], this.enterEase);
    const h = seg(lt, T.husk[0], T.husk[1], ease.inOutCubic);
    const pos = this._p.copy(this.from).lerp(this.hold, e);
    pos.y += Math.sin(t * 1.3 + this.seed) * 0.02 * (1 - h);
    pos.lerp(this.huskTo, h);
    obj.group.position.copy(pos);
    obj.group.rotation.set(
      this.rot.x + h * 0.35,
      this.rot.y + this.swing * Math.sin(0.7 * lt + this.seed) + (1 - e) * 0.9 + h * 0.7,
      this.rot.z,
    );
    obj.group.scale.setScalar(this.scale * (1 - 0.3 * h));
    if (this.onUpdate) this.onUpdate(t, lt, this);
    obj.group.updateMatrixWorld(true);

    D.uBright.value =
      (0.02 + 0.98 * seg(lt, T.emerge[0], Math.max(0.05, T.emerge[1] * 0.85), ease.inQuad)) * (1 - (1 - this.huskBright) * h);

    const s = invLerp(T.scan[0], T.scan[1], lt);
    const scanning = lt >= T.scan[0] && lt <= T.scan[1];
    const hh = obj.size.y * 0.5 * this.scale;
    const cy = this.hold.y;
    D.uScanY.value = lt < T.scan[0] ? 1e5 : lerp(cy + hh + 0.06, cy - hh - this.scanBelow, ease.inOutSine(s));
    D.uDrain.value = seg(lt, T.scan[1] - 0.05, T.scan[1] + 0.3);
    const glow = scanning ? smoothstep(0, 0.08, s) * (1 - smoothstep(0.88, 1, s)) : 0;
    D.uGlow.value = 1.2 * glow;
    D.uScanW.value = 0.022;
    const inBody = smoothstep(cy - hh - 0.12, cy - hh + 0.05, D.uScanY.value);
    this.ring.set(this._v.set(pos.x, D.uScanY.value, pos.z), obj.radius * this.scale * 0.6, glow * inBody * 0.8);

    for (const ic of this.icons) {
      const a = T.peel[0] + ic.delay * 0.5;
      const f0 = T.fly[0] + ic.delay;
      const f1 = T.fly[1] + ic.delay;
      const vis = lt >= a && lt < f1;
      ic.mesh.visible = vis;
      if (!vis) {
        ic.halo.visible = false;
        continue;
      }
      const pe = seg(lt, a, a + (T.peel[1] - T.peel[0]), ease.outBack);
      const fl = seg(lt, f0, f1, ease.inOutCubic);
      const P0 = this._p0.copy(this.hold).add(this.peelOffset);
      P0.x += ic.fan;
      const slot = this.ctx.slotAt(ic.item.index, ic.item.t);
      const P2 = this.ctx.phone.canvasToWorld(slot.x, slot.y, this._p2);
      const P1 = this._p1.copy(P0).lerp(P2, 0.5).add(this.arc);
      bezier2(ic.mesh.position, P0, P1, P2, fl);
      const s1 = this.ctx.phone.canvasSizeToWorld(slot.size);
      const sc = lerp(this.iconSize * Math.max(0.001, pe), s1, ease.inQuad(fl));
      ic.mesh.scale.setScalar(sc);
      this.ctx.phone.group.getWorldQuaternion(this._q);
      ic.mesh.quaternion.copy(camera.quaternion).slerp(this._q, ease.inOutQuad(fl));
      ic.mesh.material.color.setScalar(1 + 0.6 * (1 - fl));
      ic.halo.set(ic.mesh.position, sc * 2.8, 0.75 * (1 - fl) * Math.min(1, pe));
    }
  }
}
