import * as THREE from 'three';
import * as O from '../world/objects.js';
import * as O2 from '../world/objects2.js';
import { seg, ease, lerp, clamp, rng, smoothstep, bezier2 } from '../engine/util.js';

// 硬菜：手机平躺在一条 90 年代的街上，先一样一样吃，再把整条街卷进去
export const STREET_C = new THREE.Vector3(0, 0.09, 0.9);

function makeRoad() {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const c = cv.getContext('2d');
  const r = rng(4);
  c.fillStyle = '#16171a';
  c.fillRect(0, 0, 512, 512);
  c.fillStyle = '#2a2b30';
  c.fillRect(148, 0, 216, 512);
  for (let i = 0; i < 3000; i++) {
    c.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
    c.fillRect(148 + r() * 216, r() * 512, 2, 2);
  }
  c.fillStyle = '#3d3d43';
  c.fillRect(102, 0, 46, 512);
  c.fillRect(364, 0, 46, 512);
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 2;
  for (let y = 0; y < 512; y += 32) {
    c.beginPath();
    c.moveTo(102, y);
    c.lineTo(148, y);
    c.moveTo(364, y);
    c.lineTo(410, y);
    c.stroke();
  }
  c.fillStyle = '#d8d2b8';
  for (let y = 10; y < 512; y += 128) c.fillRect(252, y, 8, 70);
  c.fillStyle = 'rgba(230,230,230,0.7)';
  c.fillRect(156, 0, 4, 512);
  c.fillRect(352, 0, 4, 512);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 3);
  map.anisotropy = 8;
  const av = document.createElement('canvas');
  av.width = av.height = 256;
  const a = av.getContext('2d');
  const g = a.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#000');
  g.addColorStop(0.35, '#fff');
  g.addColorStop(0.85, '#fff');
  g.addColorStop(1, '#000');
  a.fillStyle = g;
  a.fillRect(0, 0, 256, 256);
  const g2 = a.createLinearGradient(0, 0, 256, 0);
  g2.addColorStop(0, 'rgba(0,0,0,1)');
  g2.addColorStop(0.12, 'rgba(0,0,0,0)');
  g2.addColorStop(0.88, 'rgba(0,0,0,0)');
  g2.addColorStop(1, 'rgba(0,0,0,1)');
  a.fillStyle = g2;
  a.fillRect(0, 0, 256, 256);
  const alpha = new THREE.CanvasTexture(av);
  const m = new THREE.MeshStandardMaterial({ map, alphaMap: alpha, transparent: true, roughness: 0.92, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 24), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.001, -7);
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  return mesh;
}

export class Street {
  constructor(scene, ctx, o) {
    this.ctx = ctx;
    this.on = o.on;
    this.road = makeRoad();
    scene.add(this.road);
    const ry = Math.PI / 2 - 0.4;
    const mkB = (obj, x, z, rot) => {
      obj.group.position.set(x, 0, z);
      obj.group.rotation.y = rot;
      obj.group.visible = false;
      scene.add(obj.group);
      return { obj, base: obj.group.position.clone(), rot, ate: Infinity };
    };
    const S = (name, opt) => O2.shop(name, opt);
    this.B = {
      studio: mkB(S('照相馆', { wall: '#d9cbb2', signBg: '#be185d', h: 2.8, posters: ['#f9a8d4', '#fde68a', '#93c5fd'], extra: '冲印 · 证件照' }), -3.2, -0.6, ry),
      avshop: mkB(S('音像店', { wall: '#c7b9a3', signBg: '#6d28d9', h: 3.0, posters: ['#f87171', '#60a5fa', '#34d399', '#fbbf24'] }), -3.2, -3.3, ry),
      post: mkB(S('邮局', { wall: '#d6d3c4', signBg: '#047857', h: 3.2 }), -3.2, -6.0, ry),
      bookstore: mkB(S('书店', { wall: '#cfc2a8', signBg: '#9a3412', h: 2.9 }), -3.2, -8.7, ry),
      bank: mkB(S('银行', { wall: '#e2ddd2', signBg: '#b45309', h: 3.4, extra: '储蓄所' }), 3.2, -1.6, -ry),
      netcafe: mkB(S('网吧', { wall: '#bdb6aa', signBg: '#3730a3', h: 2.8, extra: '上网 3元/小时' }), 3.2, -4.3, -ry),
      window: mkB(S('售票处', { wall: '#d8cfbf', signBg: '#b91c1c', h: 2.7, extra: '火车票 · 飞机票' }), 3.2, -7.0, -ry),
      arcade: mkB(S('游戏厅', { wall: '#c9bfae', signBg: '#7e22ce', h: 2.9, posters: ['#a78bfa', '#f472b6'] }), 3.2, -9.7, -ry),
      kiosk: mkB(O2.kiosk(), -1.95, -1.9, Math.PI / 2 - 0.3),
      booth: mkB(O2.booth(), 1.95, -2.9, -Math.PI / 2 + 0.3),
    };

    // 一样一样吃的快节奏
    this.quick = o.beats.map((b, i) => {
      const side = i % 2 ? 1 : -1;
      const rec = { ...b };
      if (b.building) {
        rec.b = this.B[b.building];
        rec.b.ate = b.t;
      } else {
        rec.obj = b.make();
        rec.obj.group.visible = false;
        scene.add(rec.obj.group);
        rec.fit = (b.size ?? 0.9) / Math.max(rec.obj.size.x, rec.obj.size.y, rec.obj.size.z);
        rec.rest = new THREE.Vector3(side * (0.95 + (i % 3) * 0.15), 0, 1.75 - (i % 2) * 0.5);
      }
      rec.items = b.icons.map((ic, k) => ctx.tl.item(b.t + k * 0.07, ic.icon, ic.label));
      ctx.tl.event(b.t - (b.building ? 0.75 : 0.62), b.building ? 'rumble' : 'pop');
      return rec;
    });

    // 最后一口：剩下的楼和一堆小东西卷成漩涡
    const r = rng(91);
    const flyers = [];
    for (const key of ['booth', 'post', 'netcafe', 'window', 'bookstore', 'arcade']) flyers.push({ b: this.B[key] });
    for (let i = 0; i < 46; i++) {
      const obj = O.PILE_KINDS[(i * 7 + 3) % O.PILE_KINDS.length]();
      obj.group.visible = false;
      scene.add(obj.group);
      const side = i % 2 ? 1 : -1;
      const p = new THREE.Vector3(side * (0.4 + r() * 2.0), 0.3 + r() * 0.6, 0.5 - r() * 10.5);
      flyers.push({ obj, p0: p, q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)), s0: 0.68 });
    }
    const [b0, b1] = o.burst;
    flyers.forEach((f, i) => {
      const p0 = f.b ? f.b.base.clone().add(new THREE.Vector3(0, 1.2, 0)) : f.p0;
      const dx = p0.x - STREET_C.x;
      const dz = p0.z - STREET_C.z;
      f.r0 = Math.hypot(dx, dz);
      f.th0 = Math.atan2(dz, dx);
      f.h0 = p0.y - STREET_C.y;
      f.tl = b0 + 0.25 + (i / flyers.length) * (b1 - b0 - 1.5) + (r() - 0.5) * 0.1;
      f.d = 0.95 + 0.4 * r() + (f.b ? 0.2 : 0);
      f.ta = f.tl + f.d;
      f.swirl = 2.6 + r() * 0.8;
      f.axis = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      if (f.b) f.b.ate = f.ta;
    });
    this.flyers = flyers.sort((a, b) => a.ta - b.ta);
    const arr = this.flyers.map((f) => f.ta);
    this.burstItems = o.burstIcons.map((ic, k) => {
      const u = k / (o.burstIcons.length - 1);
      const idx = Math.min(arr.length - 1, Math.floor(u * (arr.length - 1)));
      return ctx.tl.item(arr[idx] + (k % 2) * 0.04, ic.icon, ic.label);
    });
    ctx.tl.event(b0, 'burst', { dur: b1 - b0 });
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._c = new THREE.Vector3();
  }

  update(t) {
    const [on0, on1] = this.on;
    const vis = t > on0 && t < on1;
    const fadeIn = seg(t, on0, on0 + 1.1, ease.outCubic);
    const fadeOut = 1 - seg(t, on1 - 0.8, on1);
    this.road.visible = vis;
    this.road.material.opacity = fadeIn * fadeOut;
    let flash = 0;

    for (const B of Object.values(this.B)) {
      const g = B.obj.group;
      g.visible = vis && t < B.ate;
      if (!g.visible) continue;
      g.position.copy(B.base);
      g.position.y = -1.2 * (1 - fadeIn);
      g.rotation.set(0, B.rot, 0);
      g.scale.setScalar(1);
      B.obj.drain.uBright.value = 0.15 + 0.85 * fadeIn;
    }

    for (const q of this.quick) {
      const since = t - q.t;
      if (since >= 0 && since < 0.3) flash += 1 - since / 0.3;
      if (q.b) {
        const g = q.b.obj.group;
        if (t >= q.t || t < q.t - 0.75 || !vis) continue;
        g.visible = true;
        const rum = seg(t, q.t - 0.75, q.t - 0.45);
        const fl = seg(t, q.t - 0.45, q.t, ease.inCubic);
        const jig = Math.sin(t * 90) * 0.035 * rum * (1 - fl);
        const p = this._v.copy(q.b.base);
        p.x += jig;
        p.y += Math.max(0, Math.sin(t * 70)) * 0.02 * rum;
        const ctrl = this._c.copy(q.b.base).lerp(STREET_C, 0.5).add(new THREE.Vector3(0, 2.2, 0));
        bezier2(g.position, p, ctrl, STREET_C, fl);
        g.rotation.set(fl * 0.9, q.b.rot + fl * 2.2, fl * 0.6);
        g.scale.setScalar(Math.max(0.001, 1 - ease.inQuad(fl) * 0.98));
        continue;
      }
      const g = q.obj.group;
      const a = q.t - 0.62;
      g.visible = vis && t >= a && t < q.t;
      if (!g.visible) continue;
      const pop = ease.outBack(seg(t, a, a + 0.22));
      const fl = seg(t, q.t - 0.3, q.t, ease.inCubic);
      const rest = this._v.copy(q.rest);
      rest.y = q.obj.size.y * q.fit * 0.5 + 0.05 + (1 - pop) * -0.3;
      const ctrl = this._c.copy(rest).lerp(STREET_C, 0.5).add(new THREE.Vector3(0, 0.9, 0));
      bezier2(g.position, rest, ctrl, STREET_C, fl);
      g.rotation.set(-0.5 + fl * 2, 0.6 * Math.sin(t * 2 + q.t) + fl * 3, 0);
      g.scale.setScalar(Math.max(0.001, q.fit * pop * (1 - fl * 0.97)));
    }

    for (const f of this.flyers) {
      const g = f.b ? f.b.obj.group : f.obj.group;
      if (t >= f.ta) {
        if (!f.b) g.visible = false;
        const dt = t - f.ta;
        if (dt >= 0 && dt < 0.35) flash += 0.6 * (1 - dt / 0.35);
        continue;
      }
      const u = clamp((t - f.tl) / f.d);
      if (u <= 0) {
        if (!f.b) g.visible = false;
        continue;
      }
      g.visible = true;
      const e = Math.pow(u, 2.0);
      const rr = f.r0 * Math.pow(1 - e, 1.2);
      const th = f.th0 + f.swirl * e;
      const y = lerp(f.h0, 0, e) + Math.sin(Math.PI * Math.min(1, u * 1.3)) * 1.2 * (1 - e);
      g.position.set(STREET_C.x + Math.cos(th) * rr, STREET_C.y + y, STREET_C.z + Math.sin(th) * rr);
      if (f.b) g.rotation.set(e * 1.4, f.b.rot + e * 3, e);
      else {
        this._q.setFromAxisAngle(f.axis, e * 6);
        g.quaternion.copy(f.q0).multiply(this._q);
      }
      g.scale.setScalar(Math.max(0.001, (f.b ? 1 : f.s0) * Math.pow(1 - e, 0.8) * (1 - smoothstep(0.85, 1, u))));
    }
    return Math.min(2.5, flash);
  }
}
