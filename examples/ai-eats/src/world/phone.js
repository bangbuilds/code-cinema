import * as THREE from 'three';
import { iconCanvas, squircle } from './icons.js';
import { FONT_CN, FONT_MONO } from '../engine/hud.js';

// 主角：一部没有品牌的黑色手机。屏幕是一张按状态重画的画布（状态没变就不重画）

function rrShape(w, h, r) {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = -h / 2;
  const y1 = h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function grid({ cols, rows, size, x0, x1, y0, y1, label = 0 }) {
  const px = (x1 - x0) / (cols - 1);
  const py = (y1 - y0) / (rows - 1);
  return {
    cols,
    rows,
    n: cols * rows,
    size,
    label,
    pos: (i) => ({ x: x0 + (i % cols) * px, y: y0 + Math.floor(i / cols) * py }),
  };
}

export class Phone {
  constructor() {
    const W = 0.74;
    const H = 1.56;
    const D = 0.085;
    const R = 0.115;
    const bev = 0.018;
    this.W = W;
    this.H = H;
    this.D = D;
    this.group = new THREE.Group();

    const bodyGeo = new THREE.ExtrudeGeometry(rrShape(W - bev * 2, H - bev * 2, R - bev), {
      depth: D - bev * 2,
      bevelEnabled: true,
      bevelThickness: bev,
      bevelSize: bev,
      bevelSegments: 6,
      curveSegments: 32,
    });
    bodyGeo.translate(0, 0, -(D - bev * 2) / 2);
    this.glassMat = new THREE.MeshPhysicalMaterial({
      color: '#060609',
      roughness: 0.16,
      metalness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    this.frameMat = new THREE.MeshStandardMaterial({ color: '#3b3d43', roughness: 0.28, metalness: 1 });
    this.body = new THREE.Mesh(bodyGeo, [this.glassMat, this.frameMat]);
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    const btnGeo = new THREE.BoxGeometry(0.012, 0.16, 0.03);
    for (const [x, y, h] of [
      [-W / 2 - 0.004, 0.36, 1],
      [-W / 2 - 0.004, 0.16, 1],
      [W / 2 + 0.004, 0.26, 1.4],
    ]) {
      const b = new THREE.Mesh(btnGeo, this.frameMat);
      b.position.set(x, y, 0);
      b.scale.y = h;
      this.group.add(b);
    }

    this.sw = W - 0.05;
    this.sh = H - 0.05;
    const sgeo = new THREE.ShapeGeometry(rrShape(this.sw, this.sh, R - 0.03), 32);
    const uv = sgeo.attributes.uv;
    const pos = sgeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / this.sw + 0.5, pos.getY(i) / this.sh + 0.5);
    this.cw = 1080;
    this.ch = Math.round((1080 * this.sh) / this.sw);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.screenMat = new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: '#ffffff',
      emissiveMap: this.tex,
      emissiveIntensity: 1.15,
      roughness: 0.16,
      metalness: 0,
    });
    this.screen = new THREE.Mesh(sgeo, this.screenMat);
    this.screen.position.z = D / 2 + 0.0015;
    this.group.add(this.screen);

    const cw = this.cw;
    const ch = this.ch;
    this.layouts = {
      beat: grid({ cols: 4, rows: 6, size: 192, x0: 180, x1: cw - 180, y0: 430, y1: 1900, label: 40 }),
      mid: grid({ cols: 5, rows: 8, size: 150, x0: 158, x1: cw - 158, y0: 380, y1: 2000, label: 32 }),
      dense: grid({ cols: 7, rows: 15, size: 108, x0: 112, x1: cw - 112, y0: 300, y1: ch - 150, label: 23 }),
    };
    this._v = new THREE.Vector3();
    this._sig = '';
  }

  // 画布坐标 → 世界坐标
  canvasToWorld(x, y, out = new THREE.Vector3()) {
    out.set((x / this.cw - 0.5) * this.sw, (0.5 - y / this.ch) * this.sh, 0.003);
    return this.screen.localToWorld(out);
  }

  canvasSizeToWorld(px) {
    return (px / this.cw) * this.sw * this.group.getWorldScale(this._v).x;
  }

  screenCenterWorld(out = new THREE.Vector3()) {
    return this.screen.localToWorld(out.set(0, 0, 0.01));
  }

  screenNormalWorld(out = new THREE.Vector3()) {
    const q = this.group.getWorldQuaternion(new THREE.Quaternion());
    return out.set(0, 0, 1).applyQuaternion(q);
  }

  draw(st) {
    const sig = JSON.stringify(st, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v));
    if (sig === this._sig) return;
    this._sig = sig;
    const c = this.ctx;
    c.globalAlpha = 1;
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.cw, this.ch);
    const power = st.power ?? 1;
    if (power > 0) {
      c.save();
      c.globalAlpha = power;
      if (st.snake) this._snake(st.snake);
      else this._home(st);
      c.restore();
    }
    this.tex.needsUpdate = true;
  }

  _home(st) {
    const c = this.ctx;
    const W = this.cw;
    const H = this.ch;
    const g = c.createRadialGradient(W * 0.5, H * 1.08, 60, W * 0.5, H * 0.95, H * 0.95);
    g.addColorStop(0, '#24305a');
    g.addColorStop(0.45, '#0c1124');
    g.addColorStop(1, '#04050a');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);

    c.fillStyle = '#ffffff';
    c.font = `600 50px ${FONT_MONO}`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText(st.clock || '07:00', 86, 96);
    for (let i = 0; i < 4; i++) c.fillRect(W - 252 + i * 20, 111 - (i + 1) * 10, 13, (i + 1) * 10);
    c.strokeStyle = '#fff';
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(W - 156, 76, 74, 38, 10);
    c.stroke();
    c.fillRect(W - 149, 83, 56, 24);
    c.fillRect(W - 76, 88, 6, 14);
    c.fillStyle = '#000';
    c.beginPath();
    c.arc(W / 2, 94, 25, 0, Math.PI * 2);
    c.fill();

    if (st.lock > 0) {
      c.save();
      c.globalAlpha *= st.lock;
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.font = `500 50px ${FONT_CN}`;
      c.fillText('10月6日 星期二', W / 2, 380);
      c.font = `300 315px ${FONT_MONO}`;
      c.fillText('07:00', W / 2, 690);
      c.restore();
    }

    for (const e of st.empties || []) {
      c.save();
      c.globalAlpha *= 0.32 * (e.alpha ?? 1);
      c.strokeStyle = '#ffffff';
      c.lineWidth = e.size * 0.022;
      c.setLineDash([e.size * 0.07, e.size * 0.07]);
      squircle(c, e.x - e.size / 2, e.y - e.size / 2, e.size);
      c.stroke();
      c.restore();
    }

    for (const s of st.icons || []) {
      const k = s.scale ?? 1;
      const S = s.size * k;
      const x = s.x + (s.dx || 0);
      c.save();
      c.globalAlpha *= s.alpha ?? 1;
      c.drawImage(iconCanvas(s.icon), x - S / 2, s.y - S / 2, S, S);
      if (s.labelSize > 4 && s.label) {
        c.fillStyle = 'rgba(255,255,255,0.92)';
        c.font = `500 ${s.labelSize}px ${FONT_CN}`;
        c.textAlign = 'center';
        c.textBaseline = 'top';
        c.fillText(s.label, x, s.y + s.size / 2 + s.labelSize * 0.32);
      }
      if (s.block > 0) {
        // 反抗：红色盾牌
        c.globalAlpha = 0.62 * s.block;
        c.fillStyle = '#e5383b';
        squircle(c, x - S / 2, s.y - S / 2, S);
        c.fill();
        c.globalAlpha = s.block;
        c.fillStyle = '#ffffff';
        const r = S * 0.24;
        c.beginPath();
        c.moveTo(x, s.y - r * 1.15);
        c.lineTo(x + r, s.y - r * 0.7);
        c.lineTo(x + r * 0.85, s.y + r * 0.35);
        c.quadraticCurveTo(x + r * 0.5, s.y + r * 1.0, x, s.y + r * 1.25);
        c.quadraticCurveTo(x - r * 0.5, s.y + r * 1.0, x - r * 0.85, s.y + r * 0.35);
        c.lineTo(x - r, s.y - r * 0.7);
        c.closePath();
        c.fill();
        c.strokeStyle = '#e5383b';
        c.lineWidth = S * 0.05;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x - r * 0.4, s.y - r * 0.25);
        c.lineTo(x + r * 0.4, s.y + r * 0.45);
        c.moveTo(x + r * 0.4, s.y - r * 0.25);
        c.lineTo(x - r * 0.4, s.y + r * 0.45);
        c.stroke();
      }
      if (s.flash > 0) {
        c.globalAlpha = s.flash * 0.9;
        c.fillStyle = '#ffffff';
        squircle(c, x - S / 2, s.y - S / 2, S);
        c.fill();
        c.globalAlpha = s.flash * 0.7;
        c.strokeStyle = '#dff1ff';
        c.lineWidth = s.size * 0.04;
        const rr = s.size * (0.6 + (1 - s.flash) * 0.9);
        squircle(c, x - rr, s.y - rr, rr * 2);
        c.stroke();
      }
      c.restore();
    }

    if (st.banner && st.banner.alpha > 0) {
      const b = st.banner;
      c.save();
      c.globalAlpha *= b.alpha;
      const y = 150 - (1 - b.alpha) * 60;
      c.fillStyle = 'rgba(40,44,56,0.94)';
      c.beginPath();
      c.roundRect(60, y, W - 120, 190, 44);
      c.fill();
      c.drawImage(iconCanvas(b.icon || 'cash'), 96, y + 35, 120, 120);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.font = `600 44px ${FONT_CN}`;
      c.fillText(b.title, 250, y + 70);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.font = `400 38px ${FONT_CN}`;
      c.fillText(b.text, 250, y + 128);
      c.restore();
    }

    if (st.scan && st.scan.amount > 0) {
      const a = st.scan.amount;
      c.save();
      c.globalAlpha *= a * 0.1;
      c.fillStyle = '#cfe8ff';
      c.fillRect(0, 0, W, H);
      const y = st.scan.pos * H;
      const sg = c.createLinearGradient(0, y - 130, 0, y + 130);
      sg.addColorStop(0, 'rgba(200,232,255,0)');
      sg.addColorStop(0.5, 'rgba(235,246,255,1)');
      sg.addColorStop(1, 'rgba(200,232,255,0)');
      c.globalAlpha = a;
      c.fillStyle = sg;
      c.fillRect(0, y - 130, W, 260);
      c.fillStyle = '#ffffff';
      c.fillRect(0, y - 4, W, 8);
      c.restore();
    }

    if (st.glow > 0) {
      c.save();
      const gg = c.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, H * 0.7);
      gg.addColorStop(0, `rgba(230,244,255,${0.9 * st.glow})`);
      gg.addColorStop(1, 'rgba(230,244,255,0)');
      c.fillStyle = gg;
      c.fillRect(0, 0, W, H);
      c.restore();
    }
  }

  // 1997：屏幕变成诺基亚式的绿色液晶，贪吃蛇在上面吃东西
  _snake(sn) {
    const c = this.ctx;
    const W = this.cw;
    const H = this.ch;
    const cell = sn.cell;
    c.fillStyle = '#9db88a';
    c.fillRect(0, 0, W, H);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0.10)');
    g.addColorStop(0.3, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(30,45,20,0.07)';
    for (let x = 0; x < sn.cols; x++)
      for (let y = 0; y < sn.rows; y++) c.fillRect(sn.ox + x * cell + 2, sn.oy + y * cell + 2, cell - 4, cell - 4);
    const ink = '#1d2a14';
    c.fillStyle = ink;
    c.strokeStyle = ink;
    c.lineWidth = 8;
    c.strokeRect(sn.ox - 14, sn.oy - 14, sn.cols * cell + 28, sn.rows * cell + 28);
    c.font = `700 70px ${FONT_MONO}`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText(String(sn.score).padStart(4, '0'), sn.ox, sn.oy - 70);
    if (sn.foodOn) for (const [x, y] of sn.food) c.fillRect(sn.ox + x * cell + 2, sn.oy + y * cell + 2, cell - 4, cell - 4);
    for (const [x, y] of sn.body) c.fillRect(sn.ox + x * cell + 1, sn.oy + y * cell + 1, cell - 2, cell - 2);
  }
}
