import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MatKit } from './materials.js';
import * as T from './textures.js';
import { FONT_CN } from '../engine/hud.js';

// 程序化物件库：单位 1 = 10 厘米，尺寸按真实比例
// 每个物件返回 { group, inner, kit, drain, size, radius, icon, name, parts }

const geo = new Map();
export const cached = (key, fn) => {
  if (!geo.has(key)) geo.set(key, fn());
  return geo.get(key);
};
export const rbox = (w, h, d, r = 0.04, seg = 3) => {
  const rr = Math.max(0.0004, Math.min(r, Math.min(w, h, d) / 2 - 0.0004));
  return cached(`rb${w}_${h}_${d}_${rr}_${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, rr));
};
export const cyl = (rt, rb, h, s = 32) => cached(`cy${rt}_${rb}_${h}_${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const circle = (r, s = 48) => cached(`ci${r}_${s}`, () => new THREE.CircleGeometry(r, s));
export const plane = (w, h) => cached(`pl${w}_${h}`, () => new THREE.PlaneGeometry(w, h));
export const torus = (r, t, rs = 10, ts = 48, arc = Math.PI * 2) =>
  cached(`to${r}_${t}_${rs}_${ts}_${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
export const sphere = (r, ws = 24, hs = 16) => cached(`sp${r}`, () => new THREE.SphereGeometry(r, ws, hs));

export function mk(g, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function finish(name, inner, kit, icon, extra = {}) {
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  inner.position.sub(c);
  const group = new THREE.Group();
  group.add(inner);
  return { name, group, inner, kit, drain: kit.drain, size, radius: size.length() / 2, icon, parts: {}, ...extra };
}

const compassFaceTex = () =>
  T.canvasTex('compassface', 512, 512, (c, w) => {
    const R = w / 2;
    c.fillStyle = '#f3eee0';
    c.beginPath();
    c.arc(R, R, R, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#333';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      c.lineWidth = i % 9 === 0 ? 5 : 2;
      c.beginPath();
      c.moveTo(R + Math.cos(a) * R * 0.86, R + Math.sin(a) * R * 0.86);
      c.lineTo(R + Math.cos(a) * R * (i % 9 === 0 ? 0.74 : 0.8), R + Math.sin(a) * R * (i % 9 === 0 ? 0.74 : 0.8));
      c.stroke();
    }
    c.font = `900 70px ${FONT_CN}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    [
      ['N', 0, -1, '#c62828'],
      ['E', 1, 0, '#222'],
      ['S', 0, 1, '#222'],
      ['W', -1, 0, '#222'],
    ].forEach(([s, x, y, col]) => {
      c.fillStyle = col;
      c.fillText(s, R + x * R * 0.56, R + y * R * 0.56);
    });
  });

// ───────────────────────── 座机（转盘电话）─────────────────────────
export function handsetGeo() {
  return cached('handset', () => {
    const s = new THREE.Shape();
    s.moveTo(-1.1, 0.06);
    s.quadraticCurveTo(0, 0.24, 1.1, 0.06);
    s.lineTo(1.12, -0.18);
    s.quadraticCurveTo(1.1, -0.34, 0.92, -0.34);
    s.lineTo(0.74, -0.34);
    s.quadraticCurveTo(0.62, -0.33, 0.58, -0.22);
    s.quadraticCurveTo(0.5, -0.06, 0.3, -0.05);
    s.lineTo(-0.3, -0.05);
    s.quadraticCurveTo(-0.5, -0.06, -0.58, -0.22);
    s.quadraticCurveTo(-0.62, -0.33, -0.74, -0.34);
    s.lineTo(-0.92, -0.34);
    s.quadraticCurveTo(-1.1, -0.34, -1.12, -0.18);
    s.lineTo(-1.1, 0.06);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 5,
      curveSegments: 16,
    });
    g.translate(0, 0, -0.15);
    return g;
  });
}

function upperBodyGeo() {
  return cached('phoneupper', () => {
    const p = new THREE.Shape();
    p.moveTo(-0.9, 0.28);
    p.lineTo(0.98, 0.28);
    p.lineTo(0.48, 0.86);
    p.lineTo(-0.5, 0.96);
    p.lineTo(-0.9, 0.7);
    p.closePath();
    const g = new THREE.ExtrudeGeometry(p, {
      depth: 1.7,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.08,
      bevelSegments: 4,
      curveSegments: 6,
    });
    g.rotateY(-Math.PI / 2);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.translate(-(bb.min.x + bb.max.x) / 2, 0, 0);
    return g;
  });
}

function fingerWheelGeo() {
  return cached('fingerwheel', () => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.42, 0, Math.PI * 2, false);
    T.DIAL_ANGLES.forEach((a) => {
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0.062, 0, Math.PI * 2, true);
      s.holes.push(h);
    });
    const c = new THREE.Path();
    c.absarc(0, 0, 0.165, 0, Math.PI * 2, true);
    s.holes.push(c);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
      curveSegments: 40,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  });
}

export function coilAlong(curve, turns, coilR, wireR, segs = 900) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = curve.getPointAt(u);
    const th = u * turns * Math.PI * 2;
    const n = frames.normals[i];
    const b = frames.binormals[i];
    pts.push(p.add(n.clone().multiplyScalar(Math.cos(th) * coilR)).add(b.clone().multiplyScalar(Math.sin(th) * coilR)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), segs * 2, wireR, 6, false);
}

function subCurve(curve, a, b, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(a + ((b - a) * i) / n));
  return new THREE.CatmullRomCurve3(pts);
}

export function landline(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const col = o.color || '#b3302a';
  const body = k.gloss(col, 0.28);
  const cream = k.plastic('#efe6d0', 0.5);
  const chrome = k.chrome();

  g.add(mk(rbox(2.1, 0.32, 1.9, 0.1), body, 0, 0.16, 0));
  g.add(mk(upperBodyGeo(), body));

  // 号码盘：贴在前倾的斜面上，局部 +Y 指向斜面法线
  const dial = new THREE.Group();
  dial.position.set(0, 0.62, 0.8);
  dial.rotation.x = 0.859;
  dial.add(mk(cyl(0.44, 0.44, 0.03, 48), cream, 0, 0.015, 0));
  dial.add(mk(circle(0.44), k.tex(T.dialPlateTex(), 0.45), 0, 0.031, 0, -Math.PI / 2));
  dial.add(mk(fingerWheelGeo(), chrome, 0, 0.042, 0));
  const stopA = (-25 * Math.PI) / 180;
  dial.add(mk(rbox(0.05, 0.06, 0.12, 0.015), chrome, Math.cos(stopA) * 0.45, 0.07, -Math.sin(stopA) * 0.45, 0, stopA, 0));
  g.add(dial);

  // 叉簧
  g.add(mk(rbox(0.16, 0.36, 0.32, 0.06), body, -0.42, 1.1, -0.04));
  g.add(mk(rbox(0.16, 0.36, 0.32, 0.06), body, 0.42, 1.1, -0.04));
  g.add(mk(rbox(0.08, 0.12, 0.1, 0.02), cream, -0.24, 1.0, -0.04));
  g.add(mk(rbox(0.08, 0.12, 0.1, 0.02), cream, 0.24, 1.0, -0.04));

  // 听筒
  g.add(mk(handsetGeo(), body, 0, 1.4, -0.04));

  // 听筒卷线
  const coil = new THREE.CatmullRomCurve3(
    [
      [-0.98, 1.02, -0.04],
      [-1.25, 0.78, 0.18],
      [-1.46, 0.38, 0.44],
      [-1.38, 0.06, 0.62],
      [-1.16, 0.1, 0.5],
      [-1.07, 0.26, 0.32],
    ].map((p) => new THREE.Vector3(...p)),
  );
  g.add(mk(cached('coil', () => coilAlong(coil, 26, 0.05, 0.016)), body));

  const obj = finish('landline', g, k, 'phone');

  // 接墙的电话线：在居中之后再加，不影响包围盒；分成两段，用来"啪"地断开
  if (o.cord !== false) {
    const line = new THREE.CatmullRomCurve3(
      [
        [-0.6, 0.12, -0.97],
        [-0.78, -0.02, -1.32],
        [-1.4, -0.62, -1.62],
        [-2.6, -1.6, -1.5],
        [-4.6, -3.2, -1.0],
        [-7.5, -5.6, 0.0],
      ].map((p) => new THREE.Vector3(...p)),
    );
    const cordMat = k.plastic('#2b2b2f', 0.45);
    const snapU = 0.16;
    const near = mk(new THREE.TubeGeometry(subCurve(line, 0, snapU), 60, 0.024, 8, false), cordMat);
    const far = mk(new THREE.TubeGeometry(subCurve(line, snapU, 1, 60), 400, 0.024, 8, false), cordMat);
    const farPivot = new THREE.Group();
    const snapPoint = line.getPointAt(snapU);
    farPivot.position.copy(snapPoint);
    far.position.copy(snapPoint).multiplyScalar(-1);
    farPivot.add(far);
    obj.inner.add(near, farPivot);
    obj.parts = { near, far: farPivot, snapLocal: snapPoint.clone() };
  }
  return obj;
}

// ───────────────────────── 其他物件 ─────────────────────────
export function alarm(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.gloss(o.color || '#d6453d', 0.26);
  const ch = k.chrome();
  const dark = k.plastic('#222', 0.5);
  g.add(mk(cyl(0.5, 0.5, 0.34, 48), body, 0, 0, 0, Math.PI / 2));
  g.add(mk(torus(0.47, 0.035, 12, 64), ch, 0, 0, 0.17));
  g.add(mk(circle(0.45), k.tex(T.clockFaceTex(), 0.35), 0, 0, 0.172));
  const bell = cached('bell', () => new THREE.SphereGeometry(0.25, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2));
  g.add(mk(bell, ch, -0.3, 0.48, -0.02, 0, 0, 0.55));
  g.add(mk(bell, ch, 0.3, 0.48, -0.02, 0, 0, -0.55));
  g.add(mk(cyl(0.022, 0.022, 0.3, 12), ch, 0, 0.62, -0.02));
  g.add(mk(sphere(0.05), ch, 0, 0.78, -0.02));
  g.add(mk(cyl(0.05, 0.07, 0.2, 16), dark, -0.3, -0.52, 0, 0, 0, -0.5));
  g.add(mk(cyl(0.05, 0.07, 0.2, 16), dark, 0.3, -0.52, 0, 0, 0, 0.5));
  g.add(mk(cyl(0.08, 0.08, 0.06, 16), ch, 0, 0, -0.2, Math.PI / 2));
  return finish('alarm', g, k, 'clock');
}

export function camera() {
  const k = new MatKit();
  const g = new THREE.Group();
  const leather = k.matte('#1c1c1e', 0.9);
  const silver = k.metal('#cfd2d6', 0.28);
  const black = k.plastic('#121214', 0.35);
  const glass = k.glass('#0a1a2c');
  g.add(mk(rbox(1.36, 0.62, 0.5, 0.06), leather, 0, -0.05, 0));
  g.add(mk(rbox(1.38, 0.2, 0.52, 0.05), silver, 0, 0.33, 0));
  g.add(mk(rbox(1.38, 0.06, 0.52, 0.02), silver, 0, -0.38, 0));
  g.add(mk(cyl(0.3, 0.3, 0.08, 48), silver, 0.05, -0.05, 0.29, Math.PI / 2));
  g.add(mk(cyl(0.26, 0.27, 0.34, 48), black, 0.05, -0.05, 0.48, Math.PI / 2));
  g.add(mk(cyl(0.275, 0.275, 0.05, 48), silver, 0.05, -0.05, 0.52, Math.PI / 2));
  g.add(mk(circle(0.21), glass, 0.05, -0.05, 0.652));
  g.add(mk(torus(0.22, 0.02, 8, 48), black, 0.05, -0.05, 0.65));
  g.add(mk(rbox(0.26, 0.1, 0.02, 0.008), glass, -0.42, 0.34, 0.262));
  g.add(mk(rbox(0.12, 0.1, 0.02, 0.008), glass, 0.42, 0.34, 0.262));
  g.add(mk(cyl(0.11, 0.11, 0.07, 32), silver, 0.4, 0.47, 0));
  g.add(mk(cyl(0.09, 0.09, 0.08, 32), silver, -0.45, 0.47, 0));
  g.add(mk(cyl(0.04, 0.04, 0.06, 16), black, 0.6, 0.47, 0.1));
  g.add(mk(rbox(0.3, 0.03, 0.08, 0.01), black, 0.5, 0.45, -0.12, 0, 0.3, 0));
  return finish('camera', g, k, 'camera');
}

export function walkman(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.gloss(o.color || '#2f5da8', 0.3);
  const silver = k.metal('#c9ccd1', 0.3);
  const red = k.plastic('#e85d3a', 0.4);
  g.add(mk(rbox(1.1, 0.8, 0.3, 0.06), body));
  g.add(
    mk(
      rbox(0.9, 0.56, 0.02, 0.02),
      k.std({ map: T.cassetteTex('#f4d35e', 'SIDE A'), roughness: 0.15, metalness: 0.1 }),
      0,
      -0.04,
      0.152,
    ),
  );
  for (let i = 0; i < 4; i++) g.add(mk(rbox(0.16, 0.08, 0.14, 0.02), i === 1 ? red : silver, -0.33 + i * 0.22, 0.43, 0.02));
  g.add(mk(cyl(0.1, 0.1, 0.06, 24), silver, 0.56, 0.1, 0, 0, 0, Math.PI / 2));
  const hp = new THREE.Group();
  hp.add(mk(torus(0.42, 0.025, 10, 48, Math.PI), silver));
  const pad = k.matte('#f29a1f', 0.95);
  hp.add(mk(cyl(0.15, 0.15, 0.09, 32), pad, -0.42, -0.02, 0, 0, 0, Math.PI / 2));
  hp.add(mk(cyl(0.15, 0.15, 0.09, 32), pad, 0.42, -0.02, 0, 0, 0, Math.PI / 2));
  hp.position.set(0.1, 0.22, -0.32);
  hp.rotation.set(-1.2, 0.2, 0);
  g.add(hp);
  return finish('walkman', g, k, 'music');
}

export function cassette(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const side = k.plastic('#2a2a2e', 0.4);
  const front = k.std({ map: T.cassetteTex(o.label || '#f2c14e', o.text || 'MIX 1996 · A'), roughness: 0.35 });
  g.add(mk(rbox(1.0, 0.63, 0.11, 0.025), [side, side, side, side, front, side]));
  return finish('cassette', g, k, 'cassette');
}

export function foldmap() {
  const k = new MatKit();
  const g = new THREE.Group();
  const m = k.tex(T.mapTex(), 0.85);
  m.side = THREE.DoubleSide;
  const n = 4;
  const pw = 0.5;
  const ph = 0.95;
  const th = 0.42;
  const dx = pw * Math.cos(th);
  for (let i = 0; i < n; i++) {
    const pg = new THREE.PlaneGeometry(pw, ph);
    const uv = pg.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / n);
    const p = mk(pg, m, i * dx - ((n - 1) * dx) / 2, 0, 0, 0, i % 2 ? -th : th, 0);
    g.add(p);
  }
  return finish('map', g, k, 'map');
}

export function pager() {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.plastic('#1b1c1f', 0.45);
  const btn = k.plastic('#45474d', 0.4);
  g.add(mk(rbox(0.74, 0.46, 0.2, 0.07), body));
  g.add(mk(plane(0.46, 0.15), k.lit(T.lcdTex('6-8812', { bg: '#9fc0a4', fg: '#14301d' }), 0.35), -0.06, 0.06, 0.101));
  for (let i = 0; i < 3; i++) g.add(mk(rbox(0.1, 0.05, 0.04, 0.015), btn, -0.2 + i * 0.14, -0.13, 0.1));
  g.add(mk(rbox(0.06, 0.12, 0.06, 0.02), k.plastic('#c93b30'), 0.3, 0.04, 0.09));
  g.add(mk(rbox(0.46, 0.34, 0.03, 0.012), body, 0, 0, -0.12));
  return finish('pager', g, k, 'message');
}

export function calculator() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.82, 1.3, 0.1, 0.05), k.plastic('#2b2d31', 0.5)));
  g.add(mk(plane(0.64, 0.22), k.tex(T.lcdTex('3.1415926', { w: 640, h: 220, size: 110 }), 0.3), 0, 0.42, 0.051));
  g.add(mk(plane(0.3, 0.08), k.std({ color: '#3b2a24', roughness: 0.2, metalness: 0.3 }), 0.17, 0.58, 0.051));
  const bGeo = rbox(0.14, 0.1, 0.04, 0.02);
  const light = k.plastic('#d9dadc', 0.45);
  const orange = k.plastic('#f08a24', 0.4);
  const dk = k.plastic('#55575c', 0.45);
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 4; c++) g.add(mk(bGeo, c === 3 ? orange : r === 0 ? dk : light, -0.27 + c * 0.18, 0.18 - r * 0.15, 0.06));
  return finish('calculator', g, k, 'calc');
}

export function radio(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.gloss(o.color || '#c4473a', 0.3);
  const chrome = k.chrome();
  g.add(mk(rbox(1.6, 0.95, 0.5, 0.08), body));
  g.add(mk(circle(0.36), k.std({ map: T.grilleTex(), roughness: 0.35, metalness: 0.6 }), -0.36, -0.03, 0.251));
  g.add(mk(torus(0.37, 0.02, 8, 48), chrome, -0.36, -0.03, 0.252));
  g.add(mk(plane(0.62, 0.25), k.lit(T.radioDialTex(), 0.25, 0.2), 0.4, 0.17, 0.251));
  g.add(mk(cyl(0.09, 0.09, 0.08, 32), chrome, 0.24, -0.22, 0.27, Math.PI / 2));
  g.add(mk(cyl(0.09, 0.09, 0.08, 32), chrome, 0.56, -0.22, 0.27, Math.PI / 2));
  g.add(mk(torus(0.45, 0.04, 10, 40, Math.PI), k.plastic('#1d1d1f', 0.5), 0, 0.47, 0));
  g.add(mk(cyl(0.012, 0.016, 1.2, 8), chrome, 1.01, 0.98, -0.15, 0, 0, -0.55));
  return finish('radio', g, k, 'radio');
}

export function wallet() {
  const k = new MatKit();
  const g = new THREE.Group();
  const lth = k.std({ map: T.leatherTex('#6b4226'), roughness: 0.75 });
  const side = k.matte('#4f2f1a');
  g.add(mk(rbox(1.0, 0.72, 0.13, 0.05), [side, side, side, side, lth, lth]));
  g.add(mk(rbox(0.82, 0.5, 0.012, 0.005), k.plastic('#2f6fd6', 0.3), 0.2, 0.08, 0.02, 0, 0, -0.08));
  const bill = k.matte('#d9534f', 0.9);
  bill.side = THREE.DoubleSide;
  g.add(mk(plane(0.9, 0.3), bill, -0.05, 0.42, 0, 0, 0, 0.04));
  return finish('wallet', g, k, 'wallet');
}

function keyGeos() {
  return cached('keygeos', () => {
    const bow = new THREE.Shape();
    bow.absarc(0, 0, 0.11, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(-0.03, 0, 0.035, 0, Math.PI * 2, true);
    bow.holes.push(hole);
    const blade = new THREE.Shape();
    const pts = [
      [0.08, 0.035],
      [0.6, 0.035],
      [0.62, 0],
      [0.6, -0.035],
      [0.55, -0.035],
      [0.53, -0.07],
      [0.49, -0.07],
      [0.47, -0.035],
      [0.43, -0.035],
      [0.41, -0.08],
      [0.36, -0.08],
      [0.34, -0.035],
      [0.29, -0.035],
      [0.27, -0.065],
      [0.23, -0.065],
      [0.21, -0.035],
      [0.08, -0.035],
    ];
    pts.forEach(([x, y], i) => (i ? blade.lineTo(x, y) : blade.moveTo(x, y)));
    const opt = { depth: 0.02, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 24 };
    return [new THREE.ExtrudeGeometry(bow, opt), new THREE.ExtrudeGeometry(blade, opt)];
  });
}

export function keys() {
  const k = new MatKit();
  const g = new THREE.Group();
  const brass = k.metal('#c9a14a', 0.32);
  const steel = k.metal('#b9bdc4', 0.25);
  const [bowG, bladeG] = keyGeos();
  g.add(mk(torus(0.16, 0.013, 8, 40), k.chrome()));
  [-0.6, 0.35, 1.25].forEach((a, i) => {
    const kg = new THREE.Group();
    const m = i === 1 ? steel : brass;
    kg.add(mk(bowG, m), mk(bladeG, m));
    kg.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, (i - 1) * 0.03);
    kg.rotation.z = a;
    g.add(kg);
  });
  g.add(mk(rbox(0.24, 0.13, 0.02, 0.008), k.plastic('#e94e3c'), -0.2, -0.24, 0, 0, 0, 0.6));
  return finish('keys', g, k, 'key');
}

export function newspaper() {
  const k = new MatKit();
  const g = new THREE.Group();
  const pg = cached('newsgeo', () => {
    const p = new THREE.PlaneGeometry(1.3, 0.86, 18, 1);
    const pos = p.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.cos(pos.getX(i) * 2.2) * 0.05);
    p.computeVertexNormals();
    return p;
  });
  const m = k.std({ map: T.newsTex(), roughness: 0.9, side: THREE.DoubleSide });
  g.add(mk(pg, m));
  const m2 = k.matte('#e6e0d2', 0.95);
  m2.side = THREE.DoubleSide;
  g.add(mk(pg, m2, 0, 0, -0.012), mk(pg, m2, 0, 0, -0.024));
  return finish('newspaper', g, k, 'news');
}

export function hongbao() {
  const k = new MatKit();
  const g = new THREE.Group();
  const side = k.plastic('#b5121b', 0.5);
  const front = k.std({ map: T.hongbaoTex(), roughness: 0.4, metalness: 0.05 });
  g.add(mk(rbox(0.55, 0.95, 0.03, 0.012), [side, side, side, side, front, side]));
  return finish('hongbao', g, k, 'redpacket');
}

export function ticket() {
  const k = new MatKit();
  const g = new THREE.Group();
  const side = k.matte('#a9c9e2', 0.8);
  const front = k.std({ map: T.ticketTex(), roughness: 0.7 });
  g.add(mk(rbox(0.86, 0.54, 0.008, 0.003), [side, side, side, side, front, side]));
  return finish('ticket', g, k, 'train');
}

export function flashlight(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.metal(o.color || '#3a3d44', 0.35);
  const rubber = k.matte('#141414');
  g.add(mk(cyl(0.12, 0.12, 0.8, 32), body));
  g.add(mk(cyl(0.2, 0.13, 0.26, 32), body, 0, 0.52, 0));
  g.add(mk(circle(0.18), k.glow('#fff1c4', 0.8), 0, 0.651, 0, -Math.PI / 2));
  g.add(mk(torus(0.19, 0.02, 8, 40), k.chrome(), 0, 0.65, 0, Math.PI / 2));
  g.add(mk(rbox(0.08, 0.14, 0.06, 0.02), rubber, 0, 0.1, 0.12));
  g.add(mk(cyl(0.125, 0.125, 0.08, 32), rubber, 0, -0.36, 0));
  return finish('flashlight', g, k, 'flashlight');
}

export function compass() {
  const k = new MatKit();
  const g = new THREE.Group();
  const brass = k.metal('#c8a24f', 0.3);
  g.add(mk(cyl(0.42, 0.44, 0.12, 48), brass));
  g.add(mk(circle(0.36), k.tex(compassFaceTex(), 0.4), 0, 0.061, 0, -Math.PI / 2));
  const needle = cyl(0, 0.04, 0.26, 4);
  g.add(mk(needle, k.plastic('#d33', 0.35), 0, 0.08, -0.13, -Math.PI / 2));
  g.add(mk(needle, k.plastic('#f0f0f0', 0.35), 0, 0.08, 0.13, Math.PI / 2));
  g.add(mk(torus(0.43, 0.025, 8, 48), brass, 0, 0.06, 0, Math.PI / 2));
  g.add(mk(torus(0.06, 0.015, 8, 20), brass, 0, 0, -0.5, 0, Math.PI / 2, 0));
  return finish('compass', g, k, 'compass');
}

export function gameboy() {
  const k = new MatKit();
  const g = new THREE.Group();
  const shell = k.plastic('#cac7bf', 0.5);
  const dk = k.plastic('#26262a', 0.45);
  const btn = k.plastic('#9c2a55', 0.35);
  const grey = k.plastic('#8b8c90');
  g.add(mk(rbox(0.9, 1.45, 0.28, 0.07), shell));
  g.add(mk(rbox(0.74, 0.62, 0.02, 0.04), k.plastic('#555b66', 0.4), 0, 0.33, 0.14));
  g.add(mk(plane(0.46, 0.42), k.lit(T.gameScreenTex(), 0.25, 0.3), 0.02, 0.33, 0.152));
  g.add(mk(rbox(0.26, 0.085, 0.06, 0.02), dk, -0.22, -0.25, 0.15));
  g.add(mk(rbox(0.085, 0.26, 0.06, 0.02), dk, -0.22, -0.25, 0.15));
  g.add(mk(cyl(0.065, 0.065, 0.05, 24), btn, 0.2, -0.29, 0.15, Math.PI / 2));
  g.add(mk(cyl(0.065, 0.065, 0.05, 24), btn, 0.34, -0.2, 0.15, Math.PI / 2));
  g.add(mk(rbox(0.12, 0.035, 0.03, 0.012), grey, -0.08, -0.5, 0.145, 0, 0, 0.45));
  g.add(mk(rbox(0.12, 0.035, 0.03, 0.012), grey, 0.08, -0.5, 0.145, 0, 0, 0.45));
  return finish('gameboy', g, k, 'game');
}

export function brick() {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.plastic('#26272b', 0.45);
  const blk = k.plastic('#111', 0.4);
  g.add(mk(rbox(0.5, 1.7, 0.36, 0.08), body));
  g.add(mk(cyl(0.024, 0.024, 0.5, 12), blk, 0.16, 1.1, 0));
  g.add(mk(cyl(0.04, 0.04, 0.08, 16), blk, 0.16, 1.36, 0));
  g.add(
    mk(
      plane(0.34, 0.12),
      k.lit(T.lcdTex('8888', { w: 340, h: 120, bg: '#1a0606', fg: '#ff3b30', size: 80, ghost: false }), 1.2),
      0,
      0.5,
      0.181,
    ),
  );
  g.add(mk(plane(0.38, 0.68), k.tex(T.keypadTex(), 0.5), 0, -0.1, 0.181));
  g.add(mk(rbox(0.22, 0.06, 0.02, 0.01), blk, 0, 0.72, 0.18));
  return finish('brick', g, k, 'signal');
}

export function book(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const color = o.color || '#b8322a';
  const cover = k.std({ map: T.bookCoverTex(color, o.title || '汉语词典', o.sub || ''), roughness: 0.6 });
  const spine = k.matte(color, 0.6);
  const pages = k.std({ map: T.pageEdgeTex(), roughness: 0.9 });
  g.add(mk(rbox(0.9, 1.25, 0.24, 0.02), [pages, spine, pages, pages, cover, spine]));
  return finish('book', g, k, o.icon || 'book');
}

export function cd() {
  const k = new MatKit();
  const g = new THREE.Group();
  const dg = cached('cd', () => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.6, 0, Math.PI * 2, false);
    const h = new THREE.Path();
    h.absarc(0, 0, 0.075, 0, Math.PI * 2, true);
    s.holes.push(h);
    return new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 64 });
  });
  const m = k.phys({
    color: '#dfe3ea',
    metalness: 1,
    roughness: 0.16,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [250, 700],
  });
  g.add(mk(dg, m));
  return finish('cd', g, k, 'disc');
}

export function tv(o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const shell = k.gloss(o.color || '#7a5a40', 0.4);
  const chrome = k.chrome();
  g.add(mk(rbox(1.7, 1.35, 0.4, 0.08), shell));
  const back = cached('tvback', () => {
    const b = new THREE.CylinderGeometry(0.62, 0.9, 0.85, 4, 1);
    b.rotateY(Math.PI / 4);
    b.rotateX(-Math.PI / 2);
    return b;
  });
  g.add(mk(back, shell, 0, 0, -0.62));
  const sg = cached('tvscreen', () => {
    const p = new THREE.PlaneGeometry(1.15, 0.9, 12, 12);
    const pos = p.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / 0.6;
      const y = pos.getY(i) / 0.47;
      pos.setZ(i, 0.05 * (1 - x * x) * (1 - y * y));
    }
    p.computeVertexNormals();
    return p;
  });
  g.add(mk(rbox(1.25, 1.0, 0.03, 0.06), k.plastic('#1a1a1a', 0.4), -0.18, 0.02, 0.18));
  g.add(mk(sg, k.lit(T.tvTex(), 0.9, 0.12), -0.18, 0.02, 0.2));
  g.add(mk(cyl(0.07, 0.07, 0.06, 24), chrome, 0.62, 0.3, 0.22, Math.PI / 2));
  g.add(mk(cyl(0.07, 0.07, 0.06, 24), chrome, 0.62, 0.05, 0.22, Math.PI / 2));
  g.add(mk(plane(0.22, 0.3), k.std({ map: T.grilleTex(), roughness: 0.5, metalness: 0.4 }), 0.62, -0.35, 0.201));
  g.add(mk(sphere(0.09), k.plastic('#222'), 0, 0.72, -0.3));
  g.add(mk(cyl(0.01, 0.012, 1.1, 8), chrome, -0.26, 1.2, -0.3, 0, 0, 0.5));
  g.add(mk(cyl(0.01, 0.012, 1.1, 8), chrome, 0.26, 1.2, -0.3, 0, 0, -0.5));
  return finish('tv', g, k, 'tv');
}

export function watch() {
  const k = new MatKit();
  const g = new THREE.Group();
  const steel = k.metal('#c9ccd1', 0.22);
  const strap = k.std({ map: T.leatherTex('#4a2c1a'), roughness: 0.8 });
  g.add(mk(cyl(0.22, 0.22, 0.09, 48), steel, 0, 0, 0, Math.PI / 2));
  g.add(mk(circle(0.19), k.tex(T.clockFaceTex('#f4f1e8'), 0.3), 0, 0, 0.046));
  g.add(mk(rbox(0.19, 0.48, 0.035, 0.015), strap, 0, 0.42, -0.04, 0.35, 0, 0));
  g.add(mk(rbox(0.19, 0.48, 0.035, 0.015), strap, 0, -0.42, -0.04, -0.35, 0, 0));
  g.add(mk(cyl(0.03, 0.03, 0.05, 12), steel, 0.24, 0, 0, 0, 0, Math.PI / 2));
  return finish('watch', g, k, 'watch');
}

export function calendar() {
  const k = new MatKit();
  const g = new THREE.Group();
  const pages = k.std({ map: T.pageEdgeTex(), roughness: 0.9 });
  const front = k.std({ map: T.calendarTex(), roughness: 0.85 });
  g.add(mk(rbox(0.8, 0.95, 0.24, 0.015), [pages, pages, pages, pages, front, pages]));
  g.add(mk(rbox(0.84, 0.09, 0.27, 0.02), k.plastic('#8c1d1d', 0.5), 0, 0.5, 0));
  return finish('calendar', g, k, 'calendar');
}

export function envelope() {
  const k = new MatKit();
  const g = new THREE.Group();
  const side = k.matte('#efe8d8', 0.9);
  const front = k.std({ map: T.envelopeTex(), roughness: 0.85 });
  g.add(mk(rbox(1.1, 0.62, 0.015, 0.006), [side, side, side, side, front, side]));
  return finish('envelope', g, k, 'mail');
}

export function iccard() {
  const k = new MatKit();
  const g = new THREE.Group();
  const side = k.matte('#e9e9ec', 0.6);
  const front = k.std({ map: T.cardTex(), roughness: 0.35 });
  g.add(mk(rbox(0.86, 0.54, 0.008, 0.003), [side, side, side, side, front, side]));
  return finish('iccard', g, k, 'card');
}

// 开场那堆东西的花名册（会循环取用，带颜色变体）
export const PILE_KINDS = [
  () => landline({ cord: false }),
  () => alarm({ color: '#d6453d' }),
  () => camera(),
  () => walkman(),
  () => foldmap(),
  () => pager(),
  () => cassette({ label: '#f2c14e' }),
  () => radio(),
  () => hongbao(),
  () => calculator(),
  () => book({ color: '#e1b422', title: '电话号码簿', icon: 'contacts' }),
  () => wallet(),
  () => ticket(),
  () => gameboy(),
  () => alarm({ color: '#2f8f9d' }),
  () => newspaper(),
  () => brick(),
  () => keys(),
  () => cd(),
  () => calendar(),
  () => tv(),
  () => compass(),
  () => envelope(),
  () => flashlight(),
  () => watch(),
  () => iccard(),
  () => landline({ cord: false, color: '#e9e1cf' }),
  () => book({ color: '#2b5c9e', title: '唐诗三百首' }),
  () => cassette({ label: '#7fc8a9', text: '英语听力 · 1' }),
  () => radio({ color: '#e6dcc5' }),
  () => walkman({ color: '#b8bcc4' }),
  () => alarm({ color: '#e8b923' }),
  () => book({ color: '#2e7d4f', title: '地图册', icon: 'map' }),
  () => hongbao(),
];
