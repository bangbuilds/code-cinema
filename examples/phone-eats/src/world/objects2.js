import * as THREE from 'three';
import { MatKit } from './materials.js';
import { canvasTex, clockFaceTex, lcdTex, cardTex as icCardTex } from './textures.js';
import { cached, rbox, cyl, circle, plane, torus, sphere, mk, finish, handsetGeo, coilAlong } from './objects.js';
import { FONT_CN, FONT_MONO } from '../engine/hud.js';
import { rng } from '../engine/util.js';

// 全片新增物件
const cn = (w, s) => `${w} ${s}px ${FONT_CN}`;
const mono = (w, s) => `${w} ${s}px ${FONT_MONO}`;
const ct = (c, text, x, y, font, color, align = 'center') => {
  c.font = font;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
};
const front = (k, map, side, rough = 0.6) => {
  const f = k.std({ map, roughness: rough });
  return [side, side, side, side, f, side];
};

// ───── 贴图 ─────
const telegramTex = () =>
  canvasTex('telegram', 1100, 760, (c, w, h) => {
    c.fillStyle = '#efe3c4';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c0392b';
    c.lineWidth = 6;
    c.strokeRect(30, 30, w - 60, h - 60);
    ct(c, '电      报', w / 2, 100, cn(900, 78), '#c0392b');
    ct(c, 'TELEGRAM', w / 2, 160, mono(600, 30), '#c0392b');
    c.strokeStyle = 'rgba(192,57,43,0.45)';
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(60, 230 + i * 90);
      c.lineTo(w - 60, 230 + i * 90);
      c.stroke();
    }
    c.fillStyle = '#fbf8ef';
    c.fillRect(110, 300, 880, 92);
    c.fillRect(110, 420, 620, 92);
    ct(c, '平安到达  勿念', 140, 346, cn(700, 60), '#222', 'left');
    ct(c, '1992.12.03  北京', 140, 466, mono(500, 44), '#333', 'left');
    c.strokeStyle = '#c0392b';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(w - 190, h - 170, 80, 0, Math.PI * 2);
    c.stroke();
    ct(c, '已发', w - 190, h - 170, cn(900, 52), '#c0392b');
  });

const notepadTex = () =>
  canvasTex('notepad', 800, 1000, (c, w, h) => {
    c.fillStyle = '#fffdf3';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#9cc3e6';
    c.lineWidth = 3;
    for (let y = 180; y < h; y += 70) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.strokeStyle = '#e57373';
    c.beginPath();
    c.moveTo(110, 0);
    c.lineTo(110, h);
    c.stroke();
    ['周三  开会', '买电池', '给妈妈打电话', '还书'].forEach((s, i) => ct(c, s, 140, 225 + i * 70, cn(500, 46), '#2b3a67', 'left'));
  });

const faxPanelTex = () =>
  canvasTex('faxpanel', 600, 400, (c, w, h) => {
    c.fillStyle = '#d9d6cf';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#9fc0a4';
    c.fillRect(40, 40, 300, 90);
    ct(c, 'FAX 09:41', 190, 85, mono(700, 40), '#14301d');
    for (let i = 0; i < 12; i++) {
      c.fillStyle = '#5b5e66';
      c.beginPath();
      c.roundRect(50 + (i % 3) * 90, 160 + Math.floor(i / 3) * 56, 70, 42, 8);
      c.fill();
    }
    c.fillStyle = '#2f9e44';
    c.beginPath();
    c.roundRect(400, 180, 150, 80, 14);
    c.fill();
    ct(c, '发送', 475, 220, cn(700, 40), '#fff');
  });

const faxPaperTex = () =>
  canvasTex('faxpaper', 600, 800, (c, w, h) => {
    c.fillStyle = '#fbfbf7';
    c.fillRect(0, 0, w, h);
    ct(c, 'FAX', 60, 80, mono(800, 64), '#222', 'left');
    c.fillStyle = '#b5b5b5';
    for (let i = 0; i < 12; i++) c.fillRect(60, 160 + i * 46, 480 - (i % 3) * 90, 14);
  });

const featureScreenTex = () =>
  canvasTex('featscreen', 360, 300, (c, w, h) => {
    c.fillStyle = '#b8d8f0';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) c.fillRect(20 + i * 14, 40 - i * 8, 10, 8 + i * 8);
    c.fillStyle = '#1b2a3a';
    for (let i = 0; i < 4; i++) c.fillRect(20 + i * 14, 40 - i * 8, 10, 8 + i * 8);
    c.fillRect(w - 70, 22, 50, 22);
    ct(c, '12:08', w / 2, 140, mono(700, 70), '#1b2a3a');
    ct(c, '中国移动', w / 2, 220, cn(700, 40), '#1b2a3a');
  });

const keypadTex = () =>
  canvasTex('featkeys', 360, 520, (c, w, h) => {
    c.fillStyle = '#c9ccd1';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8eaed';
    c.beginPath();
    c.roundRect(110, 18, 140, 90, 40);
    c.fill();
    const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    k.forEach((s, i) => {
      const x = 30 + (i % 3) * 105;
      const y = 140 + Math.floor(i / 3) * 92;
      c.fillStyle = '#f4f5f6';
      c.beginPath();
      c.roundRect(x, y, 90, 72, 24);
      c.fill();
      ct(c, s, x + 45, y + 38, mono(700, 40), '#333');
    });
  });

const mp3ScreenTex = () =>
  canvasTex('mp3screen', 300, 240, (c, w, h) => {
    c.fillStyle = '#10151d';
    c.fillRect(0, 0, w, h);
    ct(c, 'MP3', 24, 34, mono(800, 30), '#7dd3fc', 'left');
    ct(c, 'Track 03', 24, 84, mono(500, 30), '#e5e7eb', 'left');
    for (let i = 0; i < 12; i++) {
      const bh = 20 + ((i * 37) % 70);
      c.fillStyle = '#38bdf8';
      c.fillRect(24 + i * 22, 210 - bh, 14, bh);
    }
  });

const desktopTex = () =>
  canvasTex('desktop', 1024, 768, (c, w, h) => {
    c.fillStyle = '#0f7f7f';
    c.fillRect(0, 0, w, h);
    ['我的电脑', '回收站', '网上邻居'].forEach((s, i) => {
      c.fillStyle = '#e8e8e8';
      c.fillRect(46, 40 + i * 150, 70, 60);
      ct(c, s, 81, 130 + i * 150, cn(500, 24), '#fff');
    });
    c.fillStyle = '#c0c0c0';
    c.fillRect(260, 120, 620, 420);
    c.fillStyle = '#000080';
    c.fillRect(266, 126, 608, 44);
    ct(c, '网上冲浪', 290, 149, cn(700, 28), '#fff', 'left');
    c.fillStyle = '#fff';
    c.fillRect(280, 186, 580, 336);
    ct(c, '正在连接……', 570, 300, cn(500, 40), '#333');
    c.fillStyle = '#000080';
    c.fillRect(330, 380, 330, 28);
    c.fillStyle = '#c0c0c0';
    c.fillRect(0, h - 56, w, 56);
    c.fillStyle = '#9a9a9a';
    c.fillRect(8, h - 48, 130, 40);
    ct(c, '开始', 73, h - 28, cn(700, 28), '#000');
  });

const kbTex = () =>
  canvasTex('keyboard', 1024, 340, (c, w, h) => {
    c.fillStyle = '#d8d1bf';
    c.fillRect(0, 0, w, h);
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 15; k++) {
        c.fillStyle = '#efe9db';
        c.beginPath();
        c.roundRect(30 + k * 64 + (r % 2) * 14, 24 + r * 62, 54, 50, 7);
        c.fill();
      }
  });

const navScreenTex = () =>
  canvasTex('navscreen', 900, 560, (c, w, h) => {
    c.fillStyle = '#e8ecef';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 34;
    c.beginPath();
    c.moveTo(-20, h * 0.75);
    c.lineTo(w * 0.55, h * 0.45);
    c.lineTo(w + 20, h * 0.1);
    c.stroke();
    c.strokeStyle = '#3b82f6';
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(w * 0.2, h * 0.67);
    c.lineTo(w * 0.55, h * 0.45);
    c.lineTo(w * 0.8, h * 0.22);
    c.stroke();
    c.fillStyle = '#1d4ed8';
    c.beginPath();
    c.moveTo(w * 0.2, h * 0.55);
    c.lineTo(w * 0.26, h * 0.75);
    c.lineTo(w * 0.2, h * 0.7);
    c.lineTo(w * 0.14, h * 0.75);
    c.closePath();
    c.fill();
    c.fillStyle = '#14532d';
    c.fillRect(0, 0, w, 110);
    ct(c, '300 米后 右转', 40, 56, cn(900, 56), '#fff', 'left');
  });

const filmCanTex = () =>
  canvasTex('filmcan', 800, 400, (c, w, h) => {
    c.fillStyle = '#f2c230';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#d6312a';
    c.fillRect(0, h * 0.62, w, h * 0.22);
    ct(c, '135 胶卷', w * 0.3, h * 0.32, cn(900, 92), '#222');
    ct(c, '36 张  ·  ISO 200', w * 0.3, h * 0.73, mono(700, 44), '#fff');
  });

const filmStripTex = () =>
  canvasTex('filmstrip', 2048, 256, (c, w, h) => {
    const r = rng(19);
    c.fillStyle = '#3b2412';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a0f07';
    for (let x = 10; x < w; x += 48) {
      c.fillRect(x, 14, 26, 30);
      c.fillRect(x, h - 44, 26, 30);
    }
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 226;
      const g = c.createLinearGradient(x, 60, x + 200, 196);
      g.addColorStop(0, `hsl(${r() * 360},70%,${45 + r() * 20}%)`);
      g.addColorStop(1, `hsl(${r() * 360},60%,${30 + r() * 20}%)`);
      c.fillStyle = g;
      c.fillRect(x, 60, 200, 136);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath();
      c.arc(x + 60 + r() * 80, 110 + r() * 40, 22 + r() * 18, 0, Math.PI * 2);
      c.fill();
    }
  });

const nameCardTex = () =>
  canvasTex('namecard', 900, 540, (c, w, h) => {
    c.fillStyle = '#fbfbf8';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1e3a8a';
    c.fillRect(0, 0, 26, h);
    ct(c, '李  明', 80, 150, cn(900, 84), '#111', 'left');
    ct(c, '销售经理', 80, 245, cn(500, 40), '#555', 'left');
    ct(c, '手机：139 0000 0000', 80, 360, mono(500, 36), '#333', 'left');
    ct(c, '某某贸易有限公司', 80, 440, cn(500, 36), '#333', 'left');
  });

const menuTex = () =>
  canvasTex('menu', 700, 1000, (c, w, h) => {
    c.fillStyle = '#7f1d1d';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e8c06a';
    c.lineWidth = 10;
    c.strokeRect(40, 40, w - 80, h - 80);
    ct(c, '菜', w / 2, 360, cn(900, 220), '#e8c06a');
    ct(c, '单', w / 2, 620, cn(900, 220), '#e8c06a');
  });

const cashTex = () =>
  canvasTex('cash', 1000, 480, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f2a1a8');
    g.addColorStop(1, '#d9707c');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,30,40,0.35)';
    c.lineWidth = 3;
    for (let i = 0; i < 30; i++) {
      c.beginPath();
      c.ellipse(w * 0.66, h / 2, 40 + i * 9, 30 + i * 6, 0, 0, Math.PI * 2);
      c.stroke();
    }
    ct(c, '¥100', 60, 110, cn(900, 110), '#7a1f2b', 'left');
    ct(c, '100', w - 60, h - 80, mono(800, 90), '#7a1f2b', 'right');
  });

function shopTex(name, o) {
  return canvasTex(`shop-${name}`, 1024, 1024, (c, w, h) => {
    c.fillStyle = o.wall;
    c.fillRect(0, 0, w, h);
    const r = rng(name.length * 7);
    for (let i = 0; i < 600; i++) {
      c.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
      c.fillRect(r() * w, r() * h, 3, 3);
    }
    c.fillStyle = o.signBg;
    c.fillRect(60, 90, w - 120, 210);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 6;
    c.strokeRect(72, 102, w - 144, 186);
    ct(c, name, w / 2, 200, cn(900, name.length > 3 ? 120 : 150), o.signFg);
    c.fillStyle = '#16202b';
    c.fillRect(110, 400, w - 220, 560);
    c.fillStyle = 'rgba(170,200,230,0.35)';
    c.fillRect(130, 420, (w - 260) / 2 - 10, 520);
    c.fillRect(w / 2 + 10, 420, (w - 260) / 2 - 10, 520);
    (o.posters || []).forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(150 + i * 120, 450, 100, 140);
    });
    if (o.extra) ct(c, o.extra, w / 2, 660, cn(700, 60), 'rgba(255,255,255,0.85)');
  });
}

const kioskTex = () =>
  canvasTex('kiosk', 1024, 768, (c, w, h) => {
    c.fillStyle = '#2f7d4f';
    c.fillRect(0, 0, w, h);
    ct(c, '报 刊 亭', w / 2, 90, cn(900, 110), '#fff');
    const r = rng(5);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = `hsl(${r() * 360},65%,${45 + r() * 25}%)`;
      const x = 40 + (i % 6) * 160;
      const y = 200 + Math.floor(i / 6) * 180;
      c.fillRect(x, y, 140, 165);
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fillRect(x + 10, y + 12, 120, 26);
    }
  });

// ───── 物件 ─────
export function telegram() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(1.1, 0.76, 0.012, 0.005), front(k, telegramTex(), k.matte('#e8dcbd'), 0.85)));
  return finish('telegram', g, k, 'message');
}

export function notepad() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.8, 1.0, 0.08, 0.02), front(k, notepadTex(), k.matte('#e8e4d6'), 0.85)));
  const wire = k.chrome();
  for (let i = 0; i < 9; i++) g.add(mk(torus(0.045, 0.008, 6, 16), wire, -0.32 + i * 0.08, 0.5, 0, 0, Math.PI / 2, 0));
  return finish('notepad', g, k, 'notes');
}

export function fax() {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.plastic('#d9d6cf', 0.5);
  g.add(mk(rbox(1.5, 0.42, 1.05, 0.08), body, 0, 0.21, 0));
  const panel = mk(plane(0.62, 0.4), k.tex(faxPanelTex(), 0.5), 0.3, 0.43, 0.18, -Math.PI / 2 + 0.25, 0, 0);
  g.add(panel);
  const paper = k.std({ map: faxPaperTex(), roughness: 0.9, side: THREE.DoubleSide });
  g.add(mk(plane(0.6, 0.8), paper, -0.15, 0.62, -0.62, -0.5, 0, 0));
  g.add(mk(plane(0.6, 0.5), paper, -0.15, 0.45, 0.66, -1.2, 0, 0));
  const hs = mk(handsetGeo(), body, -0.55, 0.55, 0.05, 0, Math.PI / 2, 0);
  hs.scale.setScalar(0.42);
  g.add(hs);
  g.add(mk(rbox(0.3, 0.12, 0.9, 0.04), k.plastic('#bcb8ae', 0.5), -0.55, 0.44, 0.05));
  return finish('fax', g, k, 'fax');
}

export function featurePhone() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.5, 1.12, 0.16, 0.07), k.gloss('#2f3a4a', 0.3)));
  g.add(mk(plane(0.36, 0.3), k.lit(featureScreenTex(), 0.5, 0.2), 0, 0.27, 0.081));
  g.add(mk(plane(0.38, 0.55), k.tex(keypadTex(), 0.45), 0, -0.2, 0.081));
  g.add(mk(rbox(0.12, 0.025, 0.01, 0.005), k.plastic('#111'), 0, 0.5, 0.08));
  return finish('feature', g, k, 'oldphone');
}

export function mp3() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.46, 0.82, 0.09, 0.06), k.gloss('#e9eaee', 0.22)));
  g.add(mk(plane(0.34, 0.27), k.lit(mp3ScreenTex(), 0.7, 0.15), 0, 0.2, 0.046));
  g.add(mk(cyl(0.14, 0.14, 0.012, 40), k.plastic('#c9ccd3', 0.35), 0, -0.17, 0.046, Math.PI / 2));
  g.add(mk(cyl(0.05, 0.05, 0.016, 32), k.plastic('#9ca3af', 0.35), 0, -0.17, 0.05, Math.PI / 2));
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.41, 0),
    new THREE.Vector3(0.2, 0.62, 0.05),
    new THREE.Vector3(0.05, 0.8, 0.1),
    new THREE.Vector3(-0.15, 0.7, 0.05),
  ]);
  g.add(mk(new THREE.TubeGeometry(cord, 40, 0.008, 6), k.plastic('#f5f5f5')));
  return finish('mp3', g, k, 'music');
}

export function crt() {
  const k = new MatKit();
  const g = new THREE.Group();
  const beige = k.plastic('#d8d1bf', 0.55);
  g.add(mk(rbox(1.5, 1.25, 0.32, 0.06), beige, 0, 0.75, 0));
  const back = cached('crtback', () => {
    const b = new THREE.CylinderGeometry(0.5, 0.78, 0.8, 4, 1);
    b.rotateY(Math.PI / 4);
    b.rotateX(-Math.PI / 2);
    return b;
  });
  g.add(mk(back, beige, 0, 0.75, -0.55));
  g.add(mk(plane(1.12, 0.86), k.lit(desktopTex(), 0.85, 0.15), 0, 0.79, 0.165));
  g.add(mk(rbox(0.5, 0.1, 0.5, 0.03), beige, 0, 0.07, -0.1));
  g.add(mk(rbox(0.16, 0.18, 0.16, 0.03), beige, 0, 0.17, -0.1));
  g.add(mk(rbox(1.4, 0.07, 0.45, 0.025), front(k, kbTex(), beige, 0.6), 0, 0.03, 0.75, -Math.PI / 2 + 0.1, 0, 0));
  return finish('crt', g, k, 'globe');
}

export function shanzhai() {
  const k = new MatKit();
  const g = new THREE.Group();
  const gold = k.metal('#d4a93c', 0.25);
  g.add(mk(rbox(0.62, 1.3, 0.22, 0.08), k.gloss('#18181b', 0.25)));
  g.add(mk(rbox(0.66, 1.34, 0.14, 0.06), gold));
  g.add(mk(plane(0.48, 0.42), k.lit(featureScreenTex(), 0.55, 0.2), 0, 0.3, 0.111));
  g.add(mk(plane(0.48, 0.5), k.tex(keypadTex(), 0.4), 0, -0.25, 0.111));
  const parts = {};
  // 电视天线（三节伸缩）
  const ant = new THREE.Group();
  ant.position.set(0.22, 0.65, -0.05);
  const segs = [0.024, 0.018, 0.013].map((r, i) => {
    const m = mk(cyl(r, r, 0.42, 10), k.chrome(), 0, 0.21, 0);
    const p = new THREE.Group();
    p.add(m);
    ant.add(p);
    return p;
  });
  g.add(ant);
  parts.ant = segs;
  // 八个喇叭
  const spk = k.std({ color: '#2a2a2e', roughness: 0.6, metalness: 0.3 });
  parts.speakers = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Group();
    s.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.82, -0.04);
    s.add(mk(cyl(0.09, 0.09, 0.05, 24), spk, 0, 0, 0, Math.PI / 2));
    s.add(mk(torus(0.09, 0.012, 6, 24), gold, 0, 0, 0.026));
    g.add(s);
    parts.speakers.push(s);
  }
  // 验钞灯与手电
  parts.uv = mk(rbox(0.14, 0.05, 0.06, 0.02), k.glow('#a855f7', 0), -0.15, 0.67, 0.02);
  parts.led = mk(cyl(0.035, 0.035, 0.02, 16), k.glow('#ffffff', 0), 0.02, 0.67, 0.08, Math.PI / 2);
  g.add(parts.uv, parts.led);
  return finish('shanzhai', g, k, 'radio', { parts });
}

export function stopwatch() {
  const k = new MatKit();
  const g = new THREE.Group();
  const steel = k.metal('#d1d5db', 0.2);
  g.add(mk(cyl(0.34, 0.34, 0.12, 48), steel, 0, 0, 0, Math.PI / 2));
  g.add(mk(circle(0.3), k.tex(clockFaceTex('#fdfcf8'), 0.3), 0, 0, 0.061));
  g.add(mk(cyl(0.05, 0.05, 0.12, 16), steel, 0, 0.42, 0));
  g.add(mk(torus(0.07, 0.015, 8, 24), steel, 0, 0.52, 0));
  return finish('stopwatch', g, k, 'stopwatch');
}

export function recorder() {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.plastic('#30343b', 0.45);
  g.add(mk(rbox(1.3, 0.75, 0.32, 0.06), body));
  g.add(mk(circle(0.22), k.std({ color: '#1b1d22', roughness: 0.7, metalness: 0.3 }), -0.35, 0, 0.161));
  g.add(mk(rbox(0.5, 0.32, 0.02, 0.02), k.glass('#141922'), 0.3, 0.05, 0.16));
  for (let i = 0; i < 5; i++) g.add(mk(rbox(0.12, 0.06, 0.1, 0.02), k.plastic(i === 0 ? '#d64545' : '#b8bcc4'), -0.4 + i * 0.2, 0.41, 0));
  g.add(mk(torus(0.42, 0.03, 8, 30, Math.PI), k.plastic('#1d1f24'), 0, 0.38, 0));
  return finish('recorder', g, k, 'mic');
}

export function handMirror() {
  const k = new MatKit();
  const g = new THREE.Group();
  const frame = k.gloss('#e8a0b4', 0.3);
  g.add(mk(cyl(0.4, 0.4, 0.06, 48), frame, 0, 0.3, 0, Math.PI / 2));
  g.add(mk(circle(0.34), k.std({ color: '#dfe7ee', roughness: 0.04, metalness: 1 }), 0, 0.3, 0.031));
  g.add(mk(rbox(0.1, 0.55, 0.06, 0.03), frame, 0, -0.32, 0));
  return finish('mirror', g, k, 'mirror');
}

export function magnifier() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(torus(0.3, 0.04, 12, 48), k.metal('#c9a24a', 0.3), 0, 0.25, 0));
  g.add(mk(circle(0.29), k.phys({ color: '#d7eef7', roughness: 0.05, metalness: 0, transmission: 0, clearcoat: 1 }), 0, 0.25, 0));
  g.add(mk(cyl(0.05, 0.06, 0.6, 16), k.plastic('#4a2c1a', 0.6), 0, -0.36, 0));
  return finish('magnifier', g, k, 'magnifier');
}

export function level() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(1.3, 0.16, 0.12, 0.03), k.metal('#f2c230', 0.35)));
  g.add(mk(rbox(0.32, 0.1, 0.13, 0.04), k.phys({ color: '#7ee0a0', roughness: 0.1, clearcoat: 1 }), 0, 0, 0));
  g.add(mk(sphere(0.03), k.plastic('#ffffff', 0.2), 0.03, 0.02, 0.06));
  return finish('level', g, k, 'level');
}

export function navigator() {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.plastic('#1f2328', 0.4);
  g.add(mk(rbox(0.95, 0.62, 0.12, 0.05), body));
  g.add(mk(plane(0.82, 0.5), k.lit(navScreenTex(), 0.7, 0.15), 0, 0, 0.061));
  g.add(mk(cyl(0.025, 0.025, 0.4, 10), k.plastic('#333'), 0, -0.2, -0.22, 0.9, 0, 0));
  g.add(mk(cyl(0.13, 0.15, 0.04, 24), k.plastic('#222', 0.3), 0, -0.36, -0.4, 0.9, 0, 0));
  return finish('navigator', g, k, 'nav');
}

export function filmRoll() {
  const k = new MatKit();
  const g = new THREE.Group();
  const can = cyl(0.24, 0.24, 0.6, 40);
  g.add(mk(can, [k.tex(filmCanTex(), 0.4), k.metal('#c9ccd1', 0.25), k.metal('#c9ccd1', 0.25)], 0, 0, 0));
  g.add(mk(cyl(0.07, 0.07, 0.12, 16), k.plastic('#1f1f1f'), 0, 0.36, 0));
  // 拉出来的胶片（用于"曝光"）
  const stripMat = k.std({ map: filmStripTex(), roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0 });
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    pts.push(new THREE.Vector3(0.24 + u * 1.6, -0.05 + Math.sin(u * 3.2) * 0.18, 0.05 + Math.sin(u * 6) * 0.08));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const sg = new THREE.PlaneGeometry(1, 0.36, 80, 1);
  const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5;
    const p = curve.getPointAt(u);
    pos.setXYZ(i, p.x, p.y + pos.getY(i), p.z);
  }
  sg.computeVertexNormals();
  const strip = mk(sg, stripMat);
  g.add(strip);
  return finish('film', g, k, 'film', { parts: { strip, stripMat } });
}

export function nameCard() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.9, 0.54, 0.01, 0.004), front(k, nameCardTex(), k.matte('#f2f2ee'))));
  return finish('namecard', g, k, 'qr');
}

export function taxi() {
  const k = new MatKit();
  const g = new THREE.Group();
  const body = k.gloss('#f2c230', 0.3);
  const dark = k.plastic('#1b1b1e', 0.5);
  const glass = k.glass('#1a2738');
  g.add(mk(rbox(1.9, 0.42, 0.9, 0.12), body, 0, 0.35, 0));
  g.add(mk(rbox(1.05, 0.38, 0.82, 0.12), body, -0.05, 0.72, 0));
  g.add(mk(rbox(1.0, 0.3, 0.84, 0.08), glass, -0.05, 0.73, 0));
  for (const [x, z] of [
    [-0.6, 0.45],
    [0.6, 0.45],
    [-0.6, -0.45],
    [0.6, -0.45],
  ])
    g.add(mk(cyl(0.19, 0.19, 0.14, 24), dark, x, 0.19, z, Math.PI / 2));
  g.add(mk(rbox(0.36, 0.14, 0.2, 0.04), k.glow('#fff4c4', 1.2), -0.05, 0.98, 0));
  g.add(mk(rbox(0.06, 0.08, 0.16, 0.02), k.glow('#fff8e0', 1.6), 0.95, 0.38, 0.28));
  g.add(mk(rbox(0.06, 0.08, 0.16, 0.02), k.glow('#fff8e0', 1.6), 0.95, 0.38, -0.28));
  return finish('taxi', g, k, 'taxi');
}

export function cashStack() {
  const k = new MatKit();
  const g = new THREE.Group();
  const note = front(k, cashTex(), k.matte('#e7a3ab'), 0.8);
  for (let i = 0; i < 4; i++) g.add(mk(rbox(1.0, 0.48, 0.01, 0.004), note, (i % 2) * 0.05, i * 0.012, i * 0.012, 0, 0, (i - 1.5) * 0.06));
  const gold = k.metal('#d9b44a', 0.3);
  const silver = k.metal('#c9ccd1', 0.3);
  for (let i = 0; i < 5; i++) g.add(mk(cyl(0.11, 0.11, 0.02, 32), i % 2 ? gold : silver, 0.55 + (i % 3) * 0.06, -0.2 + i * 0.022, 0.12, Math.PI / 2));
  return finish('cash', g, k, 'cash');
}

export function remote() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.3, 1.1, 0.1, 0.05), k.plastic('#2b2d31', 0.5)));
  g.add(mk(cyl(0.035, 0.035, 0.03, 16), k.plastic('#d33'), 0, 0.42, 0.05, Math.PI / 2));
  const b = k.plastic('#9aa0a8', 0.45);
  for (let i = 0; i < 12; i++) g.add(mk(cyl(0.03, 0.03, 0.025, 12), b, -0.07 + (i % 3) * 0.07, 0.22 - Math.floor(i / 3) * 0.12, 0.05, Math.PI / 2));
  return finish('remote', g, k, 'remote');
}

export function menuBook() {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.7, 1.0, 0.05, 0.02), front(k, menuTex(), k.matte('#5f1414'), 0.6)));
  return finish('menu', g, k, 'menu');
}

export function flatCard(name, texFn, icon, side = '#e9e9ec') {
  const k = new MatKit();
  const g = new THREE.Group();
  g.add(mk(rbox(0.86, 0.54, 0.008, 0.003), front(k, texFn(), k.matte(side), 0.4)));
  return finish(name, g, k, icon);
}

export const doorCardTex = () =>
  canvasTex('doorcard', 860, 540, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#5eead4');
    g.addColorStop(1, '#0f766e');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    ct(c, '门禁卡', 60, 120, cn(900, 90), '#fff', 'left');
    ct(c, '幸福小区 3 栋', 60, 420, cn(500, 50), 'rgba(255,255,255,0.85)', 'left');
  });
export const busCardTex = () =>
  canvasTex('buscard', 860, 540, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#93c5fd');
    g.addColorStop(1, '#1d4ed8');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    ct(c, '公交卡', 60, 120, cn(900, 90), '#fff', 'left');
    ct(c, 'IC  ·  一卡通', 60, 420, cn(500, 50), 'rgba(255,255,255,0.85)', 'left');
  });
export { icCardTex };

// 街边的店：有招牌、橱窗、空调外机
export function shop(name, o = {}) {
  const k = new MatKit();
  const g = new THREE.Group();
  const w = o.w ?? 2.2;
  const h = o.h ?? 2.6;
  const d = o.d ?? 1.8;
  const wall = k.matte(o.wall || '#cbbfa8', 0.85);
  const f = k.std({ map: shopTex(name, { wall: o.wall || '#cbbfa8', signBg: o.signBg || '#b91c1c', signFg: o.signFg || '#fff', posters: o.posters, extra: o.extra }), roughness: 0.8 });
  g.add(mk(rbox(w, h, d, 0.04), [wall, wall, wall, wall, f, wall], 0, h / 2, 0));
  g.add(mk(rbox(w + 0.1, 0.1, d + 0.1, 0.03), k.matte('#8d8478'), 0, h + 0.05, 0));
  if (o.awning) {
    const aw = mk(rbox(w * 0.9, 0.05, 0.5, 0.02), k.plastic(o.awning, 0.6), 0, h * 0.62, d / 2 + 0.22, 0.35, 0, 0);
    g.add(aw);
  }
  g.add(mk(rbox(0.42, 0.3, 0.22, 0.03), k.plastic('#e5e5e5', 0.5), w * 0.3, h * 0.82, d / 2 + 0.11));
  return finish(name, g, k, o.icon || 'bank');
}

export function kiosk() {
  const k = new MatKit();
  const g = new THREE.Group();
  const green = k.plastic('#2f7d4f', 0.5);
  const f = k.std({ map: kioskTex(), roughness: 0.7 });
  g.add(mk(rbox(1.6, 1.7, 1.2, 0.04), [green, green, green, green, f, green], 0, 0.85, 0));
  g.add(mk(rbox(1.9, 0.08, 1.5, 0.03), green, 0, 1.78, 0.1, 0.12, 0, 0));
  return finish('kiosk', g, k, 'kiosk');
}

export function booth() {
  const k = new MatKit();
  const g = new THREE.Group();
  const orange = k.gloss('#ef7d22', 0.35);
  g.add(mk(cyl(0.05, 0.05, 2.1, 12), k.metal('#9ca3af', 0.4), 0, 1.05, -0.2));
  const hood = cached('boothhood', () => new THREE.SphereGeometry(0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2));
  const hm = mk(hood, orange, 0, 1.6, 0.05);
  hm.scale.set(1, 0.9, 0.85);
  g.add(hm);
  g.add(mk(rbox(0.5, 0.62, 0.22, 0.04), k.plastic('#d4d7dc', 0.45), 0, 1.4, 0.05));
  const hs = mk(handsetGeo(), k.plastic('#2b2d31', 0.5), -0.18, 1.42, 0.2, 0, 0, Math.PI / 2);
  hs.scale.setScalar(0.22);
  g.add(hs);
  return finish('booth', g, k, 'booth');
}

export function busStop() {
  const k = new MatKit();
  const g = new THREE.Group();
  const metal = k.metal('#8a8f98', 0.4);
  g.add(mk(cyl(0.035, 0.035, 2.4, 10), metal, 1.1, 1.2, -0.34));
  const signTex = canvasTex('busstop', 512, 512, (c, w, h) => {
    c.fillStyle = '#1d4ed8';
    c.fillRect(0, 0, w, h);
    ct(c, '公交站', w / 2, 150, cn(900, 110), '#fff');
    ct(c, '12路 · 36路', w / 2, 330, cn(700, 64), '#fff');
  });
  g.add(mk(rbox(0.7, 0.7, 0.04, 0.02), front(k, signTex, k.plastic('#1d4ed8')), 1.1, 2.2, -0.265));
  g.add(mk(rbox(1.6, 0.08, 0.5, 0.02), k.plastic('#6b4f3a', 0.7), 0, 0.5, 0));
  for (const x of [-0.65, 0.65]) g.add(mk(rbox(0.06, 0.5, 0.4, 0.01), metal, x, 0.25, 0));
  return finish('busstop', g, k, 'boring');
}
