import * as THREE from 'three';
import { FONT_CN } from '../engine/hud.js';

// App 图标：每个被吞掉的东西都会被"压扁"成一个圆角方块图标
// 图案都是通用符号，不使用任何真实品牌的 logo

export function squircle(ctx, x, y, s, n = 5) {
  const r = s / 2;
  const cx = x + r;
  const cy = y + r;
  ctx.beginPath();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const px = cx + r * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const py = cy + r * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

const W = '#ffffff';

export const GLYPHS = {
  phone(c, s) {
    // 电话听筒：斜放的 U 形
    c.save();
    c.translate(s * 0.5, s * 0.5);
    c.rotate(-Math.PI * 0.22);
    c.strokeStyle = W;
    c.lineCap = 'round';
    c.lineWidth = s * 0.13;
    c.beginPath();
    c.arc(0, -s * 0.05, s * 0.22, Math.PI * 0.18, Math.PI * 0.82);
    c.stroke();
    c.fillStyle = W;
    for (const sgn of [-1, 1]) {
      c.save();
      const a = sgn > 0 ? Math.PI * 0.18 : Math.PI * 0.82;
      c.translate(Math.cos(a) * s * 0.22, -s * 0.05 + Math.sin(a) * s * 0.22);
      c.rotate(a + Math.PI / 2 + sgn * 0.25);
      rr(c, -s * 0.12, -s * 0.07, s * 0.24, s * 0.14, s * 0.06);
      c.fill();
      c.restore();
    }
    c.restore();
  },
  camera(c, s, bg) {
    c.fillStyle = W;
    rr(c, s * 0.2, s * 0.33, s * 0.6, s * 0.4, s * 0.07);
    c.fill();
    rr(c, s * 0.38, s * 0.26, s * 0.24, s * 0.1, s * 0.03);
    c.fill();
    c.fillStyle = bg[1];
    c.beginPath();
    c.arc(s * 0.5, s * 0.53, s * 0.135, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2b2f36';
    c.beginPath();
    c.arc(s * 0.5, s * 0.53, s * 0.095, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.arc(s * 0.47, s * 0.5, s * 0.025, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffcc33';
    c.beginPath();
    c.arc(s * 0.71, s * 0.4, s * 0.025, 0, Math.PI * 2);
    c.fill();
  },
  clock(c, s) {
    c.fillStyle = W;
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.36, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#111';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      c.lineWidth = i % 3 === 0 ? s * 0.022 : s * 0.012;
      c.beginPath();
      c.moveTo(s * 0.5 + Math.cos(a) * s * 0.3, s * 0.5 + Math.sin(a) * s * 0.3);
      c.lineTo(s * 0.5 + Math.cos(a) * s * 0.33, s * 0.5 + Math.sin(a) * s * 0.33);
      c.stroke();
    }
    c.lineCap = 'round';
    c.lineWidth = s * 0.03;
    c.beginPath();
    c.moveTo(s * 0.5, s * 0.5);
    c.lineTo(s * 0.5, s * 0.29);
    c.moveTo(s * 0.5, s * 0.5);
    c.lineTo(s * 0.64, s * 0.57);
    c.stroke();
    c.strokeStyle = '#ff9500';
    c.lineWidth = s * 0.012;
    c.beginPath();
    c.moveTo(s * 0.5, s * 0.5);
    c.lineTo(s * 0.37, s * 0.7);
    c.stroke();
  },
  music(c, s) {
    c.fillStyle = W;
    c.strokeStyle = W;
    c.lineWidth = s * 0.045;
    c.beginPath();
    c.moveTo(s * 0.41, s * 0.66);
    c.lineTo(s * 0.41, s * 0.3);
    c.lineTo(s * 0.71, s * 0.24);
    c.lineTo(s * 0.71, s * 0.6);
    c.stroke();
    c.fillRect(s * 0.39, s * 0.27, s * 0.34, s * 0.07);
    for (const [x, y] of [
      [0.35, 0.67],
      [0.65, 0.61],
    ]) {
      c.beginPath();
      c.ellipse(s * x, s * y, s * 0.085, s * 0.065, -0.4, 0, Math.PI * 2);
      c.fill();
    }
  },
  map(c, s) {
    const pts = [0.2, 0.4, 0.6, 0.8];
    for (let i = 0; i < 3; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.78)' : W;
      c.beginPath();
      const up = i % 2 === 0;
      c.moveTo(s * pts[i], s * (up ? 0.3 : 0.25));
      c.lineTo(s * pts[i + 1], s * (up ? 0.25 : 0.3));
      c.lineTo(s * pts[i + 1], s * (up ? 0.7 : 0.75));
      c.lineTo(s * pts[i], s * (up ? 0.75 : 0.7));
      c.closePath();
      c.fill();
    }
    c.strokeStyle = '#3BA7E0';
    c.lineWidth = s * 0.03;
    c.beginPath();
    c.moveTo(s * 0.24, s * 0.62);
    c.bezierCurveTo(s * 0.4, s * 0.5, s * 0.5, s * 0.68, s * 0.76, s * 0.45);
    c.stroke();
    c.fillStyle = '#ff3b30';
    c.beginPath();
    c.arc(s * 0.56, s * 0.38, s * 0.07, Math.PI, 0);
    c.lineTo(s * 0.56, s * 0.53);
    c.closePath();
    c.fill();
    c.fillStyle = W;
    c.beginPath();
    c.arc(s * 0.56, s * 0.38, s * 0.028, 0, Math.PI * 2);
    c.fill();
  },
  message(c, s) {
    c.fillStyle = W;
    c.beginPath();
    c.ellipse(s * 0.5, s * 0.47, s * 0.3, s * 0.24, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(s * 0.3, s * 0.6);
    c.lineTo(s * 0.24, s * 0.76);
    c.lineTo(s * 0.43, s * 0.68);
    c.closePath();
    c.fill();
  },
  calc(c, s) {
    const cols = ['#a5a5a5', '#a5a5a5', '#ff9f0a'];
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3; k++) {
        c.fillStyle = r === 0 && k < 2 ? '#d4d4d2' : k === 2 ? '#ff9f0a' : cols[k];
        if (r > 0 && k < 2) c.fillStyle = '#505050';
        c.beginPath();
        c.arc(s * (0.3 + k * 0.2), s * (0.3 + r * 0.2), s * 0.075, 0, Math.PI * 2);
        c.fill();
      }
  },
  radio(c, s) {
    c.strokeStyle = W;
    c.fillStyle = W;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.06, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = s * 0.045;
    for (const r of [0.15, 0.26]) {
      c.beginPath();
      c.arc(s * 0.5, s * 0.5, s * r, -Math.PI * 0.3, Math.PI * 0.3);
      c.stroke();
      c.beginPath();
      c.arc(s * 0.5, s * 0.5, s * r, Math.PI * 0.7, Math.PI * 1.3);
      c.stroke();
    }
  },
  wallet(c, s) {
    const cs = ['#3b82f6', '#f59e0b', '#22c55e'];
    cs.forEach((col, i) => {
      c.fillStyle = col;
      rr(c, s * 0.24, s * (0.24 + i * 0.07), s * 0.52, s * 0.3, s * 0.04);
      c.fill();
    });
    c.fillStyle = '#e8e8ea';
    rr(c, s * 0.2, s * 0.47, s * 0.6, s * 0.3, s * 0.06);
    c.fill();
  },
  key(c, s) {
    c.save();
    c.translate(s * 0.5, s * 0.5);
    c.rotate(-Math.PI / 4);
    c.fillStyle = W;
    c.beginPath();
    c.arc(-s * 0.17, 0, s * 0.14, 0, Math.PI * 2);
    c.fill();
    c.fillRect(-s * 0.05, -s * 0.035, s * 0.36, s * 0.07);
    c.fillRect(s * 0.18, 0, s * 0.05, s * 0.1);
    c.fillRect(s * 0.26, 0, s * 0.05, s * 0.07);
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(-s * 0.2, 0, s * 0.05, 0, Math.PI * 2);
    c.fill();
    c.restore();
  },
  news(c, s) {
    c.fillStyle = W;
    rr(c, s * 0.22, s * 0.22, s * 0.56, s * 0.58, s * 0.05);
    c.fill();
    c.fillStyle = '#d7263d';
    c.font = `900 ${s * 0.3}px ${FONT_CN}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('报', s * 0.5, s * 0.42);
    c.fillStyle = '#c8c8cc';
    for (let i = 0; i < 3; i++) c.fillRect(s * 0.3, s * (0.6 + i * 0.055), s * (i === 2 ? 0.25 : 0.4), s * 0.025);
  },
  redpacket(c, s) {
    c.fillStyle = '#e8352a';
    rr(c, s * 0.27, s * 0.2, s * 0.46, s * 0.62, s * 0.05);
    c.fill();
    c.fillStyle = '#c4121f';
    c.beginPath();
    c.moveTo(s * 0.27, s * 0.38);
    c.quadraticCurveTo(s * 0.5, s * 0.52, s * 0.73, s * 0.38);
    c.lineTo(s * 0.73, s * 0.25);
    c.quadraticCurveTo(s * 0.73, s * 0.2, s * 0.68, s * 0.2);
    c.lineTo(s * 0.32, s * 0.2);
    c.quadraticCurveTo(s * 0.27, s * 0.2, s * 0.27, s * 0.25);
    c.closePath();
    c.fill();
    const g = c.createLinearGradient(0, s * 0.38, 0, s * 0.54);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(1, '#e0a526');
    c.fillStyle = g;
    c.beginPath();
    c.arc(s * 0.5, s * 0.46, s * 0.08, 0, Math.PI * 2);
    c.fill();
  },
  train(c, s) {
    c.fillStyle = W;
    rr(c, s * 0.3, s * 0.2, s * 0.4, s * 0.48, s * 0.12);
    c.fill();
    c.fillStyle = '#1F6FEB';
    rr(c, s * 0.36, s * 0.28, s * 0.28, s * 0.16, s * 0.04);
    c.fill();
    c.beginPath();
    c.arc(s * 0.39, s * 0.56, s * 0.03, 0, Math.PI * 2);
    c.arc(s * 0.61, s * 0.56, s * 0.03, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = W;
    c.lineWidth = s * 0.035;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(s * 0.38, s * 0.72);
    c.lineTo(s * 0.3, s * 0.82);
    c.moveTo(s * 0.62, s * 0.72);
    c.lineTo(s * 0.7, s * 0.82);
    c.stroke();
  },
  flashlight(c, s) {
    c.save();
    c.translate(s * 0.5, s * 0.52);
    c.rotate(Math.PI / 4);
    c.fillStyle = W;
    rr(c, -s * 0.07, -s * 0.05, s * 0.14, s * 0.34, s * 0.03);
    c.fill();
    c.beginPath();
    c.moveTo(-s * 0.13, -s * 0.2);
    c.lineTo(s * 0.13, -s * 0.2);
    c.lineTo(s * 0.07, -s * 0.04);
    c.lineTo(-s * 0.07, -s * 0.04);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffe066';
    c.globalAlpha = 0.9;
    c.beginPath();
    c.moveTo(-s * 0.12, -s * 0.22);
    c.lineTo(s * 0.12, -s * 0.22);
    c.lineTo(s * 0.22, -s * 0.38);
    c.lineTo(-s * 0.22, -s * 0.38);
    c.closePath();
    c.fill();
    c.restore();
  },
  compass(c, s) {
    c.strokeStyle = W;
    c.lineWidth = s * 0.03;
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.33, 0, Math.PI * 2);
    c.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.lineWidth = i % 6 === 0 ? s * 0.02 : s * 0.008;
      c.beginPath();
      c.moveTo(s * 0.5 + Math.cos(a) * s * 0.26, s * 0.5 + Math.sin(a) * s * 0.26);
      c.lineTo(s * 0.5 + Math.cos(a) * s * 0.3, s * 0.5 + Math.sin(a) * s * 0.3);
      c.stroke();
    }
    c.save();
    c.translate(s * 0.5, s * 0.5);
    c.rotate(Math.PI / 4);
    c.fillStyle = '#ff3b30';
    c.beginPath();
    c.moveTo(0, -s * 0.22);
    c.lineTo(s * 0.05, 0);
    c.lineTo(-s * 0.05, 0);
    c.closePath();
    c.fill();
    c.fillStyle = W;
    c.beginPath();
    c.moveTo(0, s * 0.22);
    c.lineTo(s * 0.05, 0);
    c.lineTo(-s * 0.05, 0);
    c.closePath();
    c.fill();
    c.restore();
  },
  game(c, s, bg) {
    c.fillStyle = W;
    c.beginPath();
    c.roundRect(s * 0.18, s * 0.36, s * 0.64, s * 0.3, s * 0.15);
    c.fill();
    c.fillStyle = bg[1];
    c.fillRect(s * 0.28, s * 0.48, s * 0.12, s * 0.04);
    c.fillRect(s * 0.32, s * 0.44, s * 0.04, s * 0.12);
    c.beginPath();
    c.arc(s * 0.64, s * 0.46, s * 0.03, 0, Math.PI * 2);
    c.arc(s * 0.7, s * 0.53, s * 0.03, 0, Math.PI * 2);
    c.fill();
  },
  book(c, s) {
    c.fillStyle = W;
    c.beginPath();
    c.moveTo(s * 0.5, s * 0.3);
    c.quadraticCurveTo(s * 0.36, s * 0.24, s * 0.2, s * 0.28);
    c.lineTo(s * 0.2, s * 0.72);
    c.quadraticCurveTo(s * 0.36, s * 0.68, s * 0.5, s * 0.74);
    c.quadraticCurveTo(s * 0.64, s * 0.68, s * 0.8, s * 0.72);
    c.lineTo(s * 0.8, s * 0.28);
    c.quadraticCurveTo(s * 0.64, s * 0.24, s * 0.5, s * 0.3);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = s * 0.012;
    c.beginPath();
    c.moveTo(s * 0.5, s * 0.3);
    c.lineTo(s * 0.5, s * 0.74);
    c.stroke();
  },
  disc(c, s) {
    const g = c.createConicGradient(0.3, s * 0.5, s * 0.5);
    ['#ff6b6b', '#ffd93d', '#6bff95', '#6bc8ff', '#c56bff', '#ff6b6b'].forEach((col, i) =>
      g.addColorStop(i / 5, col),
    );
    c.fillStyle = g;
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.33, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.33, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#9AA3AE';
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.08, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = W;
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.035, 0, Math.PI * 2);
    c.fill();
  },
  tv(c, s, bg) {
    c.strokeStyle = W;
    c.lineWidth = s * 0.025;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(s * 0.5, s * 0.32);
    c.lineTo(s * 0.38, s * 0.18);
    c.moveTo(s * 0.5, s * 0.32);
    c.lineTo(s * 0.62, s * 0.18);
    c.stroke();
    c.fillStyle = W;
    rr(c, s * 0.2, s * 0.32, s * 0.6, s * 0.44, s * 0.07);
    c.fill();
    c.fillStyle = bg[1];
    c.beginPath();
    c.moveTo(s * 0.44, s * 0.44);
    c.lineTo(s * 0.6, s * 0.54);
    c.lineTo(s * 0.44, s * 0.64);
    c.closePath();
    c.fill();
  },
  watch(c, s) {
    c.fillStyle = '#8e8e93';
    rr(c, s * 0.38, s * 0.14, s * 0.24, s * 0.72, s * 0.06);
    c.fill();
    c.fillStyle = W;
    c.beginPath();
    c.arc(s * 0.5, s * 0.5, s * 0.2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#111';
    c.lineWidth = s * 0.025;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(s * 0.5, s * 0.5);
    c.lineTo(s * 0.5, s * 0.38);
    c.moveTo(s * 0.5, s * 0.5);
    c.lineTo(s * 0.59, s * 0.54);
    c.stroke();
  },
  calendar(c, s) {
    c.fillStyle = '#ff3b30';
    c.font = `600 ${s * 0.12}px ${FONT_CN}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('星期三', s * 0.5, s * 0.27);
    c.fillStyle = '#1c1c1e';
    c.font = `300 ${s * 0.42}px ${FONT_CN}`;
    c.fillText('17', s * 0.5, s * 0.58);
  },
  mail(c, s) {
    c.fillStyle = W;
    rr(c, s * 0.18, s * 0.3, s * 0.64, s * 0.42, s * 0.05);
    c.fill();
    c.strokeStyle = '#1E90FF';
    c.lineWidth = s * 0.03;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(s * 0.2, s * 0.33);
    c.lineTo(s * 0.5, s * 0.55);
    c.lineTo(s * 0.8, s * 0.33);
    c.stroke();
  },
  card(c, s) {
    c.fillStyle = W;
    rr(c, s * 0.17, s * 0.28, s * 0.66, s * 0.44, s * 0.06);
    c.fill();
    const g = c.createLinearGradient(0, s * 0.38, 0, s * 0.52);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(1, '#d6a02a');
    c.fillStyle = g;
    rr(c, s * 0.25, s * 0.38, s * 0.15, s * 0.12, s * 0.02);
    c.fill();
    c.fillStyle = '#c8ccd2';
    c.fillRect(s * 0.25, s * 0.58, s * 0.4, s * 0.04);
  },
  signal(c, s) {
    c.fillStyle = W;
    for (let i = 0; i < 4; i++) {
      const h = s * (0.12 + i * 0.1);
      rr(c, s * (0.26 + i * 0.13), s * 0.72 - h, s * 0.09, h, s * 0.02);
      c.fill();
    }
  },
  cassette(c, s, bg) {
    c.fillStyle = W;
    rr(c, s * 0.17, s * 0.3, s * 0.66, s * 0.42, s * 0.05);
    c.fill();
    c.fillStyle = bg[1];
    rr(c, s * 0.3, s * 0.4, s * 0.4, s * 0.15, s * 0.07);
    c.fill();
    c.fillStyle = W;
    c.beginPath();
    c.arc(s * 0.38, s * 0.475, s * 0.04, 0, Math.PI * 2);
    c.arc(s * 0.62, s * 0.475, s * 0.04, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = bg[1];
    c.beginPath();
    c.moveTo(s * 0.3, s * 0.72);
    c.lineTo(s * 0.35, s * 0.62);
    c.lineTo(s * 0.65, s * 0.62);
    c.lineTo(s * 0.7, s * 0.72);
    c.closePath();
    c.fill();
  },
  contacts(c, s) {
    c.fillStyle = W;
    c.beginPath();
    c.arc(s * 0.5, s * 0.4, s * 0.12, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(s * 0.5, s * 0.72, s * 0.24, s * 0.16, 0, Math.PI, 0);
    c.fill();
  },
};

export const ICON_STYLE = {
  phone: ['#6BE584', '#21B24A'],
  camera: ['#D5D9DE', '#7F858D'],
  clock: ['#3A3A3D', '#0E0E10'],
  music: ['#FF7088', '#EE2346'],
  map: ['#86DCAB', '#3AA2DD'],
  message: ['#72E883', '#26BE47'],
  calc: ['#3A3A3D', '#141416'],
  radio: ['#B585FF', '#6638E8'],
  wallet: ['#353538', '#0F0F11'],
  key: ['#FFD766', '#F49F1C'],
  news: ['#FF6266', '#D21F3A'],
  redpacket: ['#FFB199', '#F25A3C'],
  train: ['#64AEFF', '#1C6BE8'],
  flashlight: ['#34437A', '#121A33'],
  compass: ['#3A3A3D', '#0E0E10'],
  game: ['#8476FF', '#3A2BD6'],
  book: ['#FFB060', '#F26A06'],
  disc: ['#EEF0F4', '#A2AAB4'],
  tv: ['#FF5A5A', '#C1141B'],
  watch: ['#3A3A3D', '#151517'],
  calendar: ['#FFFFFF', '#E7E7EC'],
  mail: ['#66CDFB', '#1A88F5'],
  card: ['#33DACA', '#0C9A8A'],
  signal: ['#555A64', '#1D1F25'],
  cassette: ['#FF9550', '#E5530A'],
  contacts: ['#CDD2D9', '#8B929C'],
};

export const ICON_TYPES = Object.keys(ICON_STYLE);

export function registerIcon(type, colors, glyph) {
  ICON_STYLE[type] = colors;
  GLYPHS[type] = glyph;
}

const cache = new Map();
export function iconCanvas(type, s = 256) {
  const key = `${type}@${s}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const c = cv.getContext('2d');
  const bg = ICON_STYLE[type] || ICON_STYLE.contacts;
  const pad = s * 0.02;
  squircle(c, pad, pad, s - pad * 2);
  const g = c.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, bg[0]);
  g.addColorStop(1, bg[1]);
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  const hl = c.createLinearGradient(0, 0, 0, s * 0.5);
  hl.addColorStop(0, 'rgba(255,255,255,0.22)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = hl;
  c.fillRect(0, 0, s, s * 0.5);
  c.shadowColor = 'rgba(0,0,0,0.28)';
  c.shadowBlur = s * 0.03;
  c.shadowOffsetY = s * 0.012;
  (GLYPHS[type] || GLYPHS.contacts)(c, s, bg);
  c.restore();
  cache.set(key, cv);
  return cv;
}

const texCache = new Map();
export function iconTexture(type) {
  if (texCache.has(type)) return texCache.get(type);
  const tex = new THREE.CanvasTexture(iconCanvas(type, 256));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(type, tex);
  return tex;
}
