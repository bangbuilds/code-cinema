import * as THREE from 'three';
import { iconTexture } from '../world/icons.js';
import { FONT_CN, FONT_MONO } from '../engine/hud.js';
import { clamp, lerp, ease, seg, bezier2, hash1 } from '../engine/util.js';

// 新的吞噬者：一个发光的输入框。App 飞进光标，碎成一串 token

function pill(w, h, r) {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = -h / 2;
  const y1 = h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y0 + r, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

function normUV(geo, w, h) {
  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
}

export class AIBar {
  constructor(scene) {
    this.W = 2.0;
    this.H = 0.42;
    const { W, H } = this;
    this.group = new THREE.Group();
    const body = new THREE.ExtrudeGeometry(pill(W, H, H / 2), {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 4,
      curveSegments: 40,
    });
    body.translate(0, 0, -0.04);
    this.bodyMat = new THREE.MeshPhysicalMaterial({ color: '#0b0d14', roughness: 0.18, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });
    this.group.add(new THREE.Mesh(body, this.bodyMat));

    this.cw = 1024;
    this.ch = 216;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    const fw = W - 0.03;
    const fh = H - 0.03;
    const face = new THREE.ShapeGeometry(pill(fw, fh, fh / 2), 40);
    normUV(face, fw, fh);
    this.fw = fw;
    this.fh = fh;
    this.faceMat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true });
    this.face = new THREE.Mesh(face, this.faceMat);
    this.face.position.z = 0.0145;
    this.group.add(this.face);

    // 外圈发光
    const ring = pill(W + 0.05, H + 0.05, (H + 0.05) / 2);
    ring.holes.push(pill(W + 0.004, H + 0.004, (H + 0.004) / 2));
    this.glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 3.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.ShapeGeometry(ring, 40), this.glowMat);
    glow.position.z = 0.002;
    this.group.add(glow);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex(),
      color: new THREE.Color(0.5, 0.75, 1.0),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, H * 3.4), haloMat);
    this.halo.position.z = -0.06;
    this.group.add(this.halo);
    scene.add(this.group);
    this._sig = '';
    this.cursorPx = 80;
    this._v = new THREE.Vector3();
  }

  // st: { text, n(已打出的字数), placeholder, cursor(0/1), send(0..1), glow(0..1), red(0..1), power }
  draw(st) {
    const sig = JSON.stringify(st);
    if (sig === this._sig) return;
    this._sig = sig;
    const c = this.ctx;
    const W = this.cw;
    const H = this.ch;
    c.clearRect(0, 0, W, H);
    c.globalAlpha = st.power ?? 1;
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#171b26');
    g.addColorStop(1, '#0c0e15');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    const pad = 74;
    const avail = W - pad - 190;
    c.font = `500 74px ${FONT_CN}`;
    const fullW = c.measureText(st.text || '').width;
    const fs = fullW > avail ? Math.floor((74 * avail) / fullW) : 74;
    c.font = `500 ${fs}px ${FONT_CN}`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const shown = [...(st.text || '')].slice(0, st.n ?? 0).join('');
    if (!shown && st.placeholder) {
      c.fillStyle = 'rgba(255,255,255,0.32)';
      c.fillText(st.placeholder, pad + 18, H / 2 + 4);
    }
    c.fillStyle = '#ffffff';
    c.fillText(shown, pad, H / 2 + 4);
    this.cursorPx = pad + c.measureText(shown).width + 8;
    if (st.cursor) {
      c.fillStyle = '#9fd4ff';
      c.fillRect(this.cursorPx, H / 2 - 44, 9, 88);
    }
    const bx = W - 108;
    const s = 1 + 0.18 * (st.send || 0);
    c.save();
    c.translate(bx, H / 2);
    c.scale(s, s);
    c.fillStyle = st.send > 0 ? `rgba(255,255,255,${0.75 + 0.25 * st.send})` : 'rgba(255,255,255,0.78)';
    c.beginPath();
    c.arc(0, 0, 52, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#0c0e15';
    c.lineWidth = 11;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(0, 24);
    c.lineTo(0, -22);
    c.moveTo(-19, -3);
    c.lineTo(0, -22);
    c.lineTo(19, -3);
    c.stroke();
    c.restore();
    this.tex.needsUpdate = true;
  }

  setLook(glow, red) {
    const base = new THREE.Color(1.3, 1.9, 2.6).multiplyScalar(0.55 + 0.9 * glow);
    base.lerp(new THREE.Color(3.2, 0.5, 0.45), red);
    this.glowMat.color.copy(base);
    this.halo.material.color.setRGB(0.3 + 0.4 * glow + red * 0.6, 0.5 + 0.4 * glow - red * 0.3, 0.8 + 0.4 * glow - red * 0.5);
  }

  cursorWorld(out = new THREE.Vector3()) {
    const x = (this.cursorPx / this.cw - 0.5) * this.fw;
    return this.face.localToWorld(out.set(x + 0.01, 0, 0.02));
  }
}

let _halo = null;
function haloTex() {
  if (_halo) return _halo;
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(256, 128, 10, 256, 128, 250);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.save();
  c.scale(1, 0.5);
  c.fillRect(0, 0, 512, 512);
  c.restore();
  _halo = new THREE.CanvasTexture(cv);
  return _halo;
}

// 发出去的那句话：一个聊天气泡，飘在输入框右上方
export class Bubble {
  constructor(scene) {
    this.cv = document.createElement('canvas');
    this.cv.width = 1024;
    this.cv.height = 160;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.25), this.mat);
    this.mesh.renderOrder = 12;
    scene.add(this.mesh);
    this._text = null;
  }
  set(text, alpha) {
    this.mesh.visible = alpha > 0.01 && !!text;
    if (!this.mesh.visible) return;
    this.mat.opacity = alpha;
    if (text === this._text) return;
    this._text = text;
    const c = this.cv.getContext('2d');
    c.clearRect(0, 0, 1024, 160);
    c.font = `500 64px ${FONT_CN}`;
    const w = Math.min(1000, c.measureText(text).width + 90);
    const x = 1024 - w - 8;
    c.fillStyle = '#2f6df6';
    c.beginPath();
    c.roundRect(x, 18, w, 124, 62);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(text, x + 45, 83);
    this.tex.needsUpdate = true;
  }
}

// token 字形图集
const POOL = '的是我你吞吃词典计算器信贺卡相机胶卷电视歌视频天气地图导航票钱包卡号写画码问答01ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}<>[]()+=*/#@&%$';
let _atlas = null;
function atlas() {
  if (_atlas) return _atlas;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const c = cv.getContext('2d');
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const chars = [...POOL];
  for (let i = 0; i < 256; i++) {
    const ch = chars[i % chars.length];
    c.font = /[一-鿿]/.test(ch) ? `700 46px ${FONT_CN}` : `700 46px ${FONT_MONO}`;
    c.fillText(ch, (i % 16) * 64 + 32, Math.floor(i / 16) * 64 + 34);
  }
  _atlas = new THREE.CanvasTexture(cv);
  _atlas.minFilter = THREE.LinearFilter;
  _atlas.generateMipmaps = false;
  return _atlas;
}

const K = 34; // 每个 App 碎成多少个 token

export class Eater {
  // events: [{ slot, icon, t (离开格子的时刻), dur, style: 'fly'|'vortex'|'hop' }]
  constructor(scene, events) {
    this.events = events;
    for (const e of events) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ map: iconTexture(e.icon), transparent: true, depthWrite: false, depthTest: false }),
      );
      m.renderOrder = 18;
      m.visible = false;
      scene.add(m);
      e.mesh = m;
    }
    const cap = events.length * K + 400;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(cap * 3);
    this.alpha = new Float32Array(cap);
    this.glyph = new Float32Array(cap);
    this.size = new Float32Array(cap);
    for (let i = 0; i < cap; i++) {
      this.glyph[i] = Math.floor(hash1(i * 3.7) * 256);
      this.size[i] = 28 + hash1(i * 1.3) * 22;
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aGlyph', new THREE.BufferAttribute(this.glyph, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlas() }, uScale: { value: 1 }, uColor: { value: new THREE.Color(1.6, 2.2, 2.8) } },
      vertexShader: /* glsl */ `
        attribute float aAlpha; attribute float aGlyph; attribute float aSize;
        uniform float uScale; varying float vA; varying float vG;
        void main(){ vA = aAlpha; vG = aGlyph;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale * (0.4 + 0.6 * aAlpha); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas; uniform vec3 uColor; varying float vA; varying float vG;
        void main(){
          float col = mod(vG, 16.0); float row = floor(vG / 16.0);
          vec2 uv = vec2((col + gl_PointCoord.x) / 16.0, 1.0 - (row + gl_PointCoord.y) / 16.0);
          float a = texture2D(uAtlas, uv).a * vA;
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 19;
    scene.add(this.points);
    this.burst = null;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  // 飞行轨迹：从格子到光标
  path(e, u, A, B, out) {
    const c = this._c.copy(A).lerp(B, 0.5);
    c.y += 0.55;
    c.x += (A.x - B.x) * 0.25 + (e.slot % 2 ? 0.2 : -0.2);
    c.z += 0.35;
    if (e.style === 'vortex') {
      const ang = (1 - u) * 2.6 * (e.slot % 2 ? 1 : -1);
      const r = A.distanceTo(B) * (1 - u) * 0.55;
      bezier2(out, A, c, B, ease.inCubic(u));
      out.x += Math.cos(ang + e.slot) * r * Math.sin(Math.PI * u);
      out.z += Math.sin(ang + e.slot) * r * Math.sin(Math.PI * u) * 0.6;
      return out;
    }
    return bezier2(out, A, c, B, ease.inCubic(u));
  }

  // ctx: { slotWorld(slot, out), slotSize, cursor (Vector3), camera, phoneQuat, scale }
  update(t, ctx) {
    let n = 0;
    const B = ctx.cursor;
    for (const e of this.events) {
      const u = (t - e.t) / e.dur;
      const m = e.mesh;
      const live = u >= 0 && u < 1;
      m.visible = live;
      const A = ctx.slotWorld(e.slot, this._a);
      if (live) {
        this.path(e, u, A, B, m.position);
        const pop = e.style === 'hop' ? 1 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 3)) : 1 + 0.9 * Math.sin(Math.PI * Math.min(1, u * 2.2));
        const sc = ctx.slotSize * pop * (1 - 0.75 * ease.inQuad(u));
        m.scale.setScalar(sc);
        m.quaternion.copy(ctx.phoneQuat).slerp(ctx.camera.quaternion, Math.min(1, u * 2.5));
        m.material.opacity = 1 - ease.inQuad(clamp((u - 0.6) / 0.4));
        m.material.color.setScalar(1 + 0.5 * Math.sin(Math.PI * u));
      }
      // 碎成 token
      for (let k = 0; k < K; k++) {
        const te = e.t + e.dur * (0.5 + (0.5 * k) / K);
        const v = (t - te) / 0.42;
        if (v < 0 || v >= 1) continue;
        const uu = (te - e.t) / e.dur;
        const O = this.path(e, Math.min(0.999, uu), A, B, this._p);
        const s = hash1(e.slot * 31 + k * 7.3);
        const w = ease.inCubic(v);
        const sw = Math.sin(Math.PI * v) * (0.08 + 0.14 * s);
        const ang = s * 6.283 + v * 5;
        this.pos[n * 3] = lerp(O.x, B.x, w) + Math.cos(ang) * sw;
        this.pos[n * 3 + 1] = lerp(O.y, B.y, w) + Math.sin(ang) * sw;
        this.pos[n * 3 + 2] = lerp(O.z, B.z, w);
        this.alpha[n] = Math.sin(Math.PI * Math.min(1, v * 1.4)) * (1 - v * 0.5);
        this.glyph[n] = Math.floor(hash1(e.slot * 17 + k) * 256);
        n++;
      }
    }
    // 手机被吃掉时的大爆发
    if (this.burst) {
      const bt = this.burst;
      for (let k = 0; k < 400; k++) {
        const te = bt.t + (k / 400) * bt.dur;
        const v = (t - te) / 0.6;
        if (v < 0 || v >= 1) continue;
        const s1 = hash1(k * 1.7);
        const s2 = hash1(k * 2.9);
        const s3 = hash1(k * 4.1);
        const O = this._p.set(bt.center.x + (s1 - 0.5) * bt.w, bt.center.y + (s2 - 0.5) * bt.h, bt.center.z + (s3 - 0.5) * 0.1);
        const w = ease.inCubic(v);
        const sw = Math.sin(Math.PI * v) * (0.1 + 0.25 * s1);
        const ang = s2 * 6.283 + v * 6;
        this.pos[n * 3] = lerp(O.x, B.x, w) + Math.cos(ang) * sw;
        this.pos[n * 3 + 1] = lerp(O.y, B.y, w) + Math.sin(ang) * sw;
        this.pos[n * 3 + 2] = lerp(O.z, B.z, w);
        this.alpha[n] = Math.sin(Math.PI * Math.min(1, v * 1.4)) * (1 - v * 0.5);
        this.glyph[n] = Math.floor(s3 * 256);
        n++;
      }
    }
    this.geo.setDrawRange(0, n);
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aGlyph.needsUpdate = true;
    this.mat.uniforms.uScale.value = ctx.scale;
  }
}
