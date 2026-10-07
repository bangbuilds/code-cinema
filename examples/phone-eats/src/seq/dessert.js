import * as THREE from 'three';
import { MatKit } from '../world/materials.js';
import { canvasTex } from '../world/textures.js';
import { cached, rbox, cyl, sphere, mk, finish } from '../world/objects.js';
import { iconTexture } from '../world/icons.js';
import { makeGlow } from '../world/fx.js';
import { FONT_CN, FONT_MONO, FONT_EN } from '../engine/hud.js';
import { seg, ease, lerp, clamp, rng, bezier2, hash1 } from '../engine/util.js';

// 甜点：看不见的东西——记号码的本事、手写、无聊、技能

// ── 手写电话本：号码一位一位消失，只剩名字 ──
export function phonebook() {
  const k = new MatKit();
  const g = new THREE.Group();
  const cv = document.createElement('canvas');
  cv.width = 1400;
  cv.height = 900;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const entries = [
    ['妈妈', '139 1234 5678'],
    ['家里', '0571-8888 6666'],
    ['阿杰', '135 2468 1357'],
    ['小芳', '186 1122 3344'],
    ['王老师', '021-6543 2100'],
    ['外婆', '0574-8765 4321'],
  ];
  let last = -1;
  const draw = (p) => {
    const q = Math.round(p * 60) / 60;
    if (q === last) return;
    last = q;
    const c = cv.getContext('2d');
    c.fillStyle = '#f6f0dc';
    c.fillRect(0, 0, 1400, 900);
    c.fillStyle = 'rgba(0,0,0,0.06)';
    c.fillRect(690, 0, 20, 900);
    c.strokeStyle = 'rgba(80,110,170,0.35)';
    c.lineWidth = 2;
    for (let y = 150; y < 900; y += 110) {
      c.beginPath();
      c.moveTo(40, y);
      c.lineTo(660, y);
      c.moveTo(740, y);
      c.lineTo(1360, y);
      c.stroke();
    }
    c.textBaseline = 'alphabetic';
    entries.forEach(([name, num], i) => {
      const x0 = i < 3 ? 60 : 760;
      const y = 135 + (i % 3) * 220 + 80;
      c.fillStyle = '#23345e';
      c.font = `700 64px ${FONT_CN}`;
      c.textAlign = 'left';
      c.fillText(name, x0, y - 70);
      c.font = `500 56px ${FONT_MONO}`;
      let x = x0;
      [...num].forEach((ch, j) => {
        const th = hash1(i * 17 + j * 3.1);
        const a = clamp(1 - (q * 1.35 - th * 0.6) * 3);
        c.fillStyle = `rgba(35,52,94,${a})`;
        c.fillText(ch, x, y + 20);
        x += 34;
      });
    });
  };
  draw(0);
  const page = k.std({ map: tex, roughness: 0.85 });
  const edge = k.matte('#e6dcc0', 0.9);
  const geoL = new THREE.PlaneGeometry(0.7, 0.9);
  const uvL = geoL.attributes.uv;
  for (let i = 0; i < uvL.count; i++) uvL.setX(i, uvL.getX(i) * 0.5);
  const geoR = new THREE.PlaneGeometry(0.7, 0.9);
  const uvR = geoR.attributes.uv;
  for (let i = 0; i < uvR.count; i++) uvR.setX(i, 0.5 + uvR.getX(i) * 0.5);
  const L = mk(geoL, page, -0.34, 0, 0.06, 0, 0.28, 0);
  const R = mk(geoR, page, 0.34, 0, 0.06, 0, -0.28, 0);
  g.add(L, R);
  g.add(mk(rbox(0.72, 0.92, 0.04, 0.01), k.matte('#7a2e2e', 0.7), -0.35, 0, 0.02, 0, 0.28, 0));
  g.add(mk(rbox(0.72, 0.92, 0.04, 0.01), k.matte('#7a2e2e', 0.7), 0.35, 0, 0.02, 0, -0.28, 0));
  void edge;
  return finish('phonebook', g, k, 'numbers', { parts: { draw } });
}

// ── 田字格纸上的"尴尬"：笔画像记忆一样一点点溶掉 ──
export function inkPaper() {
  const k = new MatKit();
  const g = new THREE.Group();
  const paperTex = canvasTex('tianzige', 1024, 640, (c, w, h) => {
    c.fillStyle = '#f7f1e3';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d0453b';
    c.lineWidth = 6;
    for (const x0 of [92, 532]) {
      c.strokeRect(x0, 120, 400, 400);
      c.setLineDash([16, 14]);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0 + 200, 120);
      c.lineTo(x0 + 200, 520);
      c.moveTo(x0, 320);
      c.lineTo(x0 + 400, 320);
      c.moveTo(x0, 120);
      c.lineTo(x0 + 400, 520);
      c.moveTo(x0 + 400, 120);
      c.lineTo(x0, 520);
      c.stroke();
      c.setLineDash([]);
      c.lineWidth = 6;
    }
  });
  const inkTex = canvasTex('ganga', 1024, 640, (c, w) => {
    c.clearRect(0, 0, w, 640);
    c.fillStyle = '#111';
    c.font = `900 330px ${FONT_CN}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('尴', 292, 330);
    c.fillText('尬', 732, 330);
  });
  inkTex.colorSpace = THREE.SRGBColorSpace;
  g.add(mk(rbox(1.2, 0.75, 0.01, 0.004), [k.matte('#efe7d4'), k.matte('#efe7d4'), k.matte('#efe7d4'), k.matte('#efe7d4'), k.tex(paperTex, 0.9), k.matte('#efe7d4')]));
  const U = { uP: { value: 0 }, uBright: k.drain.uBright, map: { value: inkTex } };
  const ink = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uP, uBright; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec4 c = texture2D(map, vUv);
        float nn = 0.65 * n(vUv * vec2(40.0, 25.0)) + 0.35 * n(vUv * vec2(120.0, 75.0));
        float keep = smoothstep(uP * 1.25 - 0.08, uP * 1.25, nn);
        gl_FragColor = vec4(vec3(0.05) * uBright, c.a * keep);
      }`,
  });
  const inkMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), ink);
  inkMesh.position.z = 0.0065;
  g.add(inkMesh);
  return finish('ink', g, k, 'pen', { parts: { U } });
}

// ── 公交站：一个人坐着抬头看天，然后低头看手机 ──
export function waitingPerson(k = new MatKit()) {
  const g = new THREE.Group();
  const jacket = k.plastic('#c0392b', 0.6);
  const pants = k.plastic('#2c3e66', 0.7);
  const skin = k.plastic('#e8c6a6', 0.6);
  const shoe = k.plastic('#222', 0.6);
  const cap = (r, l) => cached(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 12));
  g.add(mk(cap(0.17, 0.36), jacket, 0, 0.88, 0));
  for (const s of [-1, 1]) {
    g.add(mk(cap(0.075, 0.38), pants, s * 0.1, 0.56, 0.2, Math.PI / 2, 0, 0));
    g.add(mk(cap(0.068, 0.36), pants, s * 0.1, 0.3, 0.42));
    g.add(mk(rbox(0.11, 0.07, 0.2, 0.03), shoe, s * 0.1, 0.06, 0.48));
  }
  const neck = new THREE.Group();
  neck.position.set(0, 1.12, 0.02);
  const head = mk(sphere(0.13, 24, 16), skin, 0, 0.13, 0.02);
  const hair = mk(cached('hair', () => new THREE.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)), k.plastic('#1b1b1b', 0.7), 0, 0.15, 0.0);
  neck.add(head, hair);
  g.add(neck);
  const armL = new THREE.Group();
  armL.position.set(-0.2, 1.0, 0.02);
  armL.add(mk(cap(0.055, 0.3), jacket, 0, -0.18, 0.08, 0.5, 0, 0));
  const armR = new THREE.Group();
  armR.position.set(0.2, 1.0, 0.02);
  armR.add(mk(cap(0.055, 0.3), jacket, 0, -0.18, 0.08, 0.5, 0, 0));
  g.add(armL, armR);
  const phone = new THREE.Group();
  phone.position.set(0, 0.74, 0.34);
  phone.add(mk(rbox(0.11, 0.2, 0.012, 0.01), k.plastic('#111', 0.3)));
  const glowMat = k.glow('#bfe0ff', 0);
  const scr = mk(new THREE.PlaneGeometry(0.095, 0.18), glowMat, 0, 0, 0.007);
  phone.add(scr);
  g.add(phone);
  return { group: g, kit: k, parts: { neck, armL, armR, phone, glowMat } };
}

// ── 发光的词：翻译 / 写作 / 画画 / 编程 ──
export function glowWord(cn, en) {
  const tex = canvasTex(`word-${cn}`, 512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 130px ${FONT_CN}`;
    c.fillText(cn, w / 2, 110);
    c.font = `500 44px ${FONT_EN}`;
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fillText(en, w / 2, 210);
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(1.05, 1.08, 1.15) });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), m);
  mesh.renderOrder = 15;
  return mesh;
}

// 本事：四个词绕着转，然后一个一个被吸进格子
export class Skills {
  constructor(scene, ctx, o) {
    this.ctx = ctx;
    this.t0 = o.t0;
    this.center = o.center.clone();
    this.words = o.words.map((w, i) => {
      const mesh = glowWord(w.cn, w.en);
      mesh.visible = false;
      scene.add(mesh);
      const halo = makeGlow('#cfe6ff');
      scene.add(halo);
      const land = o.first + i * o.gap;
      return { ...w, mesh, halo, i, land, item: ctx.tl.item(land, w.icon, w.label), iconTex: iconTexture(w.icon), wordTex: mesh.material.map };
    });
    ctx.tl.event(this.t0, 'skills', { dur: o.first + o.gap * 3 - this.t0 });
    this._p0 = new THREE.Vector3();
    this._p1 = new THREE.Vector3();
    this._p2 = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  update(t, camera) {
    for (const w of this.words) {
      const lt = t - this.t0;
      const vis = lt > w.i * 0.18 && t < w.land;
      w.mesh.visible = vis;
      if (!vis) {
        w.halo.visible = false;
        continue;
      }
      const ap = ease.outBack(seg(lt, w.i * 0.18, w.i * 0.18 + 0.5));
      const a = (w.i / 4) * Math.PI * 2 + lt * 0.7;
      const orbit = this._p0.set(this.center.x + Math.cos(a) * 0.85, this.center.y + Math.sin(a * 1.3) * 0.25 + (w.i % 2 ? 0.2 : -0.2), this.center.z + Math.sin(a) * 0.35);
      const f0 = w.land - 0.55;
      const fl = seg(t, f0, w.land, ease.inOutCubic);
      const slot = this.ctx.slotAt(w.item.index, w.item.t);
      const P2 = this.ctx.phone.canvasToWorld(slot.x, slot.y, this._p2);
      const P1 = this._p1.copy(orbit).lerp(P2, 0.5).add(new THREE.Vector3(0.3, 0.3, 0.3));
      bezier2(w.mesh.position, orbit, P1, P2, fl);
      const s1 = this.ctx.phone.canvasSizeToWorld(slot.size);
      w.mesh.scale.set(lerp(ap, s1 / 0.9, ease.inQuad(fl)), lerp(ap, s1 / 0.45, ease.inQuad(fl)), 1);
      this.ctx.phone.group.getWorldQuaternion(this._q);
      w.mesh.quaternion.copy(camera.quaternion).slerp(this._q, fl);
      if (fl > 0.55 && w.mesh.material.map !== w.iconTex) {
        w.mesh.material.map = w.iconTex;
        w.mesh.material.color.setRGB(1.2, 1.2, 1.2);
      }
      if (fl <= 0.55 && w.mesh.material.map === w.iconTex) {
        w.mesh.material.map = w.wordTex;
        w.mesh.material.color.setRGB(1.05, 1.08, 1.15);
      }
      w.halo.set(w.mesh.position, 1.2 * ap * (1 - fl) + 0.2, 0.18 * (1 - fl));
    }
  }
}
