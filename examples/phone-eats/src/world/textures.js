import * as THREE from 'three';
import { FONT_CN, FONT_MONO } from '../engine/hud.js';
import { rng } from '../engine/util.js';

// 物件表面的贴图全部用 2D 画布现画：表盘、液晶屏、地图、报纸、车票、红包……
const cache = new Map();

export function canvasTex(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  draw(c, w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

const cn = (w, size) => `${w} ${size}px ${FONT_CN}`;
const mono = (w, size) => `${w} ${size}px ${FONT_MONO}`;

function centerText(c, text, x, y, font, color) {
  c.font = font;
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, x, y);
}

export const clockFaceTex = (bg = '#f6f3ea') =>
  canvasTex(`clock-${bg}`, 512, 512, (c, w) => {
    const r = w / 2;
    c.fillStyle = bg;
    c.beginPath();
    c.arc(r, r, r, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(r, r, r * 0.6, r, r, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#1a1a1a';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      c.lineWidth = big ? 8 : 3;
      c.beginPath();
      c.moveTo(r + Math.cos(a) * r * (big ? 0.8 : 0.86), r + Math.sin(a) * r * (big ? 0.8 : 0.86));
      c.lineTo(r + Math.cos(a) * r * 0.92, r + Math.sin(a) * r * 0.92);
      c.stroke();
    }
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      centerText(c, String(i), r + Math.cos(a) * r * 0.64, r + Math.sin(a) * r * 0.64 + 4, cn(700, 54), '#1a1a1a');
    }
    const hand = (ang, len, wid, col) => {
      c.save();
      c.translate(r, r);
      c.rotate(ang);
      c.fillStyle = col;
      c.beginPath();
      c.roundRect(-wid / 2, -len, wid, len + 24, wid / 2);
      c.fill();
      c.restore();
    };
    hand((10 / 12) * Math.PI * 2 + 0.12, r * 0.45, 16, '#1a1a1a');
    hand((8 / 60) * Math.PI * 2, r * 0.68, 11, '#1a1a1a');
    hand(Math.PI * 1.17, r * 0.74, 4, '#d22');
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.arc(r, r, 14, 0, Math.PI * 2);
    c.fill();
  });

// 转盘电话的号码盘：数字沿 45°→315° 逆时针排列，与拨号轮的指孔对齐
export const DIAL_ANGLES = Array.from({ length: 10 }, (_, i) => ((45 + i * 30) * Math.PI) / 180);
export const dialPlateTex = () =>
  canvasTex('dialplate', 512, 512, (c, w) => {
    const R = w / 2;
    c.fillStyle = '#efe6d0';
    c.beginPath();
    c.arc(R, R, R, 0, Math.PI * 2);
    c.fill();
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    DIAL_ANGLES.forEach((a, i) => {
      const rr = R * (0.31 / 0.42);
      const px = R + Math.cos(a) * rr;
      const py = R - Math.sin(a) * rr;
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(px, py, R * 0.13, 0, Math.PI * 2);
      c.fill();
      centerText(c, labels[i], px, py + 3, cn(700, 50), '#222');
    });
    c.fillStyle = '#fbf7ee';
    c.beginPath();
    c.arc(R, R, R * 0.37, 0, Math.PI * 2);
    c.fill();
    centerText(c, '1973', R, R - 14, mono(500, 40), '#b22');
    centerText(c, '0571-8888', R, R + 30, mono(400, 26), '#555');
  });

export const lcdTex = (text, opt = {}) => {
  const { w = 512, h = 160, bg = '#a9b89a', fg = '#1f2a1d', size = 84, ghost = true } = opt;
  return canvasTex(`lcd-${text}-${bg}-${fg}-${w}x${h}`, w, h, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.18)');
    g.addColorStop(0.25, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.font = mono(600, size);
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    if (ghost) {
      c.fillStyle = 'rgba(0,0,0,0.06)';
      c.fillText('8'.repeat(text.length), w - 24, h / 2 + 4);
    }
    c.fillStyle = fg;
    c.fillText(text, w - 24, h / 2 + 4);
  });
};

export const mapTex = () =>
  canvasTex('map', 1024, 640, (c, w, h) => {
    const r = rng(7);
    c.fillStyle = '#f1e9d4';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#cfe6b6';
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.ellipse(r() * w, r() * h, 40 + r() * 70, 30 + r() * 50, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#9fcdec';
    c.lineWidth = 26;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-20, h * 0.7);
    c.bezierCurveTo(w * 0.3, h * 0.45, w * 0.55, h * 0.95, w + 20, h * 0.55);
    c.stroke();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 9;
    for (let x = 40; x < w; x += 70 + r() * 40) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + (r() - 0.5) * 60, h);
      c.stroke();
    }
    for (let y = 30; y < h; y += 60 + r() * 40) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y + (r() - 0.5) * 50);
      c.stroke();
    }
    c.strokeStyle = '#f2c94c';
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(0, h * 0.32);
    c.bezierCurveTo(w * 0.35, h * 0.28, w * 0.6, h * 0.42, w, h * 0.3);
    c.moveTo(w * 0.42, 0);
    c.lineTo(w * 0.47, h);
    c.stroke();
    const names = ['人民路', '解放路', '中山公园', '火车站', '新华书店', '百货大楼', '邮电局', '体育场'];
    c.fillStyle = '#4a4a4a';
    c.font = cn(700, 24);
    names.forEach((n, i) => c.fillText(n, 40 + ((i * 131) % (w - 160)), 60 + ((i * 197) % (h - 90))));
    c.fillStyle = '#d33';
    c.beginPath();
    c.arc(w * 0.47, h * 0.32, 10, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.12)';
    c.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo((w / 4) * i, 0);
      c.lineTo((w / 4) * i, h);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(w * 0.05, h * 0.82, 280, 70);
    c.fillStyle = '#222';
    c.font = cn(900, 40);
    c.fillText('城市交通图', w * 0.05 + 22, h * 0.82 + 50);
  });

export const newsTex = () =>
  canvasTex('news', 1024, 680, (c, w, h) => {
    const r = rng(11);
    c.fillStyle = '#eee8dc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#111';
    c.font = cn(900, 110);
    c.textBaseline = 'alphabetic';
    c.fillText('晨  报', 50, 130);
    c.font = cn(500, 26);
    c.fillText('1998年7月15日  星期三  第 4521 期', 400, 120);
    c.fillRect(40, 150, w - 80, 6);
    c.font = cn(900, 64);
    c.fillText('本市移动电话用户突破十万', 50, 240);
    c.fillStyle = '#9a958c';
    c.fillRect(50, 280, 380, 250);
    c.fillStyle = '#8a857c';
    for (let col = 0; col < 3; col++)
      for (let i = 0; i < 18; i++) {
        const x = 460 + col * 180;
        c.fillRect(x, 280 + i * 22, 150 - r() * 30, 9);
      }
    for (let i = 0; i < 5; i++) c.fillRect(50, 560 + i * 22, w - 120 - r() * 200, 9);
  });

export const ticketTex = () =>
  canvasTex('ticket', 860, 540, (c, w, h) => {
    c.fillStyle = '#b7d6ee';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,90,150,0.18)';
    c.lineWidth = 2;
    for (let i = -10; i < 40; i++) {
      c.beginPath();
      for (let x = 0; x <= w; x += 10) c.lineTo(x, i * 18 + Math.sin(x / 40 + i) * 8);
      c.stroke();
    }
    c.fillStyle = '#c62828';
    c.font = mono(700, 34);
    c.fillText('A 017342', 40, 60);
    c.fillStyle = '#1b1b1b';
    c.font = cn(900, 76);
    c.fillText('北京', 70, 200);
    c.fillText('上海', 560, 200);
    c.font = cn(500, 34);
    c.fillText('T21 次', 380, 160);
    c.fillText('————▶', 330, 205);
    c.font = cn(500, 36);
    c.fillText('1998年07月15日 14:20开', 70, 290);
    c.fillText('05车 012号', 560, 290);
    c.font = cn(700, 42);
    c.fillText('¥179.0元', 70, 370);
    c.font = cn(500, 34);
    c.fillText('硬座', 330, 370);
    c.fillStyle = '#3d3d3d';
    c.fillRect(40, 440, w - 80, 36);
  });

export const hongbaoTex = () =>
  canvasTex('hongbao', 550, 950, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#e0242c');
    g.addColorStop(1, '#b5121b');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e8b64c';
    c.lineWidth = 10;
    c.strokeRect(30, 30, w - 60, h - 60);
    c.fillStyle = '#c4141c';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w, 260);
    c.quadraticCurveTo(w / 2, 400, 0, 260);
    c.closePath();
    c.fill();
    const gg = c.createLinearGradient(0, 260, 0, 440);
    gg.addColorStop(0, '#ffe08a');
    gg.addColorStop(1, '#d99b22');
    c.fillStyle = gg;
    c.beginPath();
    c.arc(w / 2, 340, 88, 0, Math.PI * 2);
    c.fill();
    centerText(c, '福', w / 2, 344, cn(900, 110), '#b5121b');
    c.fillStyle = '#f2c35b';
    c.font = cn(900, 74);
    c.textAlign = 'center';
    ['恭', '喜', '发', '财'].forEach((ch, i) => c.fillText(ch, w / 2, 560 + i * 92));
  });

export const calendarTex = () =>
  canvasTex('calendar', 800, 950, (c, w, h) => {
    c.fillStyle = '#fbf8f0';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, w, 150);
    centerText(c, '1998 年  七 月', w / 2, 80, cn(900, 64), '#fff');
    centerText(c, '15', w / 2, 450, cn(900, 400), '#c62828');
    centerText(c, '星期三', w / 2, 730, cn(700, 70), '#222');
    centerText(c, '农历六月廿二', w / 2, 820, cn(500, 44), '#777');
    centerText(c, '宜：出行  会友', w / 2, 895, cn(500, 36), '#999');
  });

export const envelopeTex = () =>
  canvasTex('envelope', 1100, 620, (c, w, h) => {
    c.fillStyle = '#f6f1e5';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d33';
    c.lineWidth = 4;
    const code = '310014';
    for (let i = 0; i < 6; i++) {
      c.strokeRect(50 + i * 72, 50, 58, 70);
      centerText(c, code[i], 79 + i * 72, 88, mono(500, 46), '#334');
    }
    c.fillStyle = '#fff';
    c.fillRect(w - 210, 40, 160, 190);
    c.fillStyle = '#2e7d5b';
    c.fillRect(w - 195, 55, 130, 160);
    c.fillStyle = '#f5d76e';
    c.beginPath();
    c.arc(w - 130, 120, 38, 0, Math.PI * 2);
    c.fill();
    centerText(c, '80分', w - 130, 190, cn(700, 30), '#fff');
    c.strokeStyle = 'rgba(80,80,80,0.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(w - 230 - i * 14, 150, 60, -0.6, 0.6);
      c.stroke();
    }
    c.fillStyle = '#2b2b3a';
    c.font = cn(500, 50);
    c.save();
    c.translate(120, 300);
    c.rotate(-0.02);
    c.fillText('浙江省杭州市西湖区', 0, 0);
    c.font = cn(700, 80);
    c.fillText('李 明  收', 160, 130);
    c.restore();
    c.font = cn(500, 36);
    c.fillStyle = '#555';
    c.fillText('北京  寄', w - 280, h - 60);
  });

export const cardTex = () =>
  canvasTex('iccard', 860, 540, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ff9a5a');
    g.addColorStop(0.55, '#ffd27a');
    g.addColorStop(0.56, '#3f6e8c');
    g.addColorStop(1, '#1d3b52');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff3b0';
    c.beginPath();
    c.arc(w * 0.68, h * 0.5, 70, Math.PI, 0);
    c.fill();
    c.fillStyle = '#26445c';
    c.beginPath();
    c.moveTo(0, h * 0.58);
    c.lineTo(w * 0.25, h * 0.38);
    c.lineTo(w * 0.45, h * 0.56);
    c.lineTo(w * 0.62, h * 0.44);
    c.lineTo(w, h * 0.6);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    const gg = c.createLinearGradient(0, 180, 0, 300);
    gg.addColorStop(0, '#ffe7a0');
    gg.addColorStop(1, '#c8962a');
    c.fillStyle = gg;
    c.beginPath();
    c.roundRect(70, 180, 130, 110, 14);
    c.fill();
    c.strokeStyle = 'rgba(120,80,20,0.6)';
    c.lineWidth = 3;
    c.strokeRect(100, 200, 70, 70);
    c.fillStyle = '#fff';
    c.font = cn(900, 64);
    c.fillText('IC 电话卡', 60, 110);
    c.font = mono(700, 60);
    c.fillText('¥30', w - 200, h - 50);
  });

export const cassetteTex = (label = '#f2c14e', text = 'MIX 1996 · A') =>
  canvasTex(`cassette-${label}-${text}`, 1000, 630, (c, w, h) => {
    c.fillStyle = '#26262a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = label;
    c.beginPath();
    c.roundRect(50, 40, w - 100, h - 170, 18);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(50, 120, w - 100, 14);
    c.fillRect(50, 150, w - 100, 6);
    c.fillStyle = '#222';
    c.font = cn(700, 56);
    c.fillText(text, 90, 105);
    c.fillStyle = '#3a2a22';
    c.beginPath();
    c.roundRect(250, 210, 500, 150, 70);
    c.fill();
    for (const x of [360, 640]) {
      c.fillStyle = '#5a3d2b';
      c.beginPath();
      c.arc(x, 285, 62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#eee';
      c.beginPath();
      c.arc(x, 285, 30, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#26262a';
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        c.fillRect(x + Math.cos(a) * 18 - 5, 285 + Math.sin(a) * 18 - 5, 10, 10);
      }
    }
    c.fillStyle = '#1b1b1e';
    c.beginPath();
    c.moveTo(220, h);
    c.lineTo(280, h - 110);
    c.lineTo(w - 280, h - 110);
    c.lineTo(w - 220, h);
    c.fill();
  });

export const grilleTex = () =>
  canvasTex('grille', 512, 512, (c, w) => {
    const g = c.createLinearGradient(0, 0, w, w);
    g.addColorStop(0, '#d9d9d9');
    g.addColorStop(1, '#8e8e8e');
    c.fillStyle = g;
    c.fillRect(0, 0, w, w);
    c.fillStyle = '#1b1b1b';
    for (let y = 16; y < w; y += 26)
      for (let x = 16 + ((y / 26) % 2) * 13; x < w; x += 26) {
        c.beginPath();
        c.arc(x, y, 7, 0, Math.PI * 2);
        c.fill();
      }
  });

export const radioDialTex = () =>
  canvasTex('radiodial', 640, 260, (c, w, h) => {
    c.fillStyle = '#191c22';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e8e0c8';
    c.fillStyle = '#e8e0c8';
    c.lineWidth = 2;
    const fm = ['88', '92', '96', '100', '104', '108'];
    fm.forEach((n, i) => {
      const x = 50 + i * 108;
      c.font = mono(500, 28);
      c.textAlign = 'center';
      c.fillText(n, x, 70);
      c.beginPath();
      c.moveTo(x, 84);
      c.lineTo(x, 104);
      c.stroke();
    });
    const am = ['530', '700', '900', '1200', '1600'];
    am.forEach((n, i) => {
      const x = 60 + i * 130;
      c.font = mono(400, 24);
      c.fillText(n, x, 200);
      c.beginPath();
      c.moveTo(x, 150);
      c.lineTo(x, 172);
      c.stroke();
    });
    c.font = mono(700, 22);
    c.fillText('FM  MHz', 560, 30);
    c.fillText('AM  kHz', 560, 245);
    c.fillStyle = '#ff3b30';
    c.fillRect(372, 20, 6, 220);
  });

export const keypadTex = () =>
  canvasTex('keypad', 400, 720, (c, w, h) => {
    c.fillStyle = '#1d1e22';
    c.fillRect(0, 0, w, h);
    const keys = ['RCL', 'CLR', 'STO', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#', 'SND', 'FCN', 'END'];
    keys.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 20 + col * 125;
      const y = 20 + row * 115;
      c.fillStyle = row === 5 ? (col === 0 ? '#2f7d3a' : col === 2 ? '#a3302a' : '#4a4c52') : '#4a4c52';
      c.beginPath();
      c.roundRect(x, y, 110, 95, 18);
      c.fill();
      centerText(c, k, x + 55, y + 50, k.length > 1 ? mono(700, 26) : mono(700, 46), '#f2f2f2');
    });
  });

export const gameScreenTex = () =>
  canvasTex('gamescreen', 460, 420, (c, w, h) => {
    const pal = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
    c.fillStyle = pal[3];
    c.fillRect(0, 0, w, h);
    const px = 20;
    c.fillStyle = pal[0];
    const snake = [
      [3, 14],
      [4, 14],
      [5, 14],
      [6, 14],
      [7, 14],
      [7, 13],
      [7, 12],
      [8, 12],
      [9, 12],
      [10, 12],
      [11, 12],
      [11, 11],
      [11, 10],
    ];
    snake.forEach(([x, y]) => c.fillRect(x * px + 2, y * px + 2, px - 4, px - 4));
    c.fillStyle = pal[1];
    c.fillRect(15 * px + 4, 6 * px + 4, px - 8, px - 8);
    c.fillStyle = pal[0];
    c.font = mono(700, 30);
    c.fillText('0120', 20, 46);
    c.fillRect(0, 62, w, 4);
  });

export const tvTex = () =>
  canvasTex('tvbars', 1024, 768, (c, w, h) => {
    const cols = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    cols.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect((w / 7) * i, 0, w / 7 + 1, h * 0.68);
    });
    const low = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
    low.forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect((w / 7) * i, h * 0.68, w / 7 + 1, h * 0.08);
    });
    c.fillStyle = '#0a0a0a';
    c.fillRect(0, h * 0.76, w, h * 0.24);
    c.fillStyle = '#fff';
    c.fillRect(w * 0.18, h * 0.8, w * 0.16, h * 0.16);
    centerText(c, '再见', w * 0.7, h * 0.88, cn(900, 90), '#eee');
  });

export const bookCoverTex = (bg, title, sub = '') =>
  canvasTex(`book-${bg}-${title}`, 900, 1250, (c, w, h) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,240,200,0.8)';
    c.lineWidth = 10;
    c.strokeRect(50, 50, w - 100, h - 100);
    c.lineWidth = 3;
    c.strokeRect(70, 70, w - 140, h - 140);
    const chars = [...title];
    const size = chars.length > 4 ? 120 : 150;
    chars.forEach((ch, i) => centerText(c, ch, w / 2, 260 + i * (size * 1.15), cn(900, size), '#fff4d6'));
    if (sub) centerText(c, sub, w / 2, h - 150, cn(500, 48), 'rgba(255,244,214,0.85)');
  });

export const pageEdgeTex = () =>
  canvasTex('pageedge', 256, 256, (c, w, h) => {
    c.fillStyle = '#f3ecd9';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,100,70,0.25)';
    c.lineWidth = 1;
    for (let y = 0; y < h; y += 3) {
      c.beginPath();
      c.moveTo(0, y + 0.5);
      c.lineTo(w, y + 0.5);
      c.stroke();
    }
    for (let x = 0; x < w; x += 3) {
      c.beginPath();
      c.moveTo(x + 0.5, 0);
      c.lineTo(x + 0.5, h);
      c.stroke();
    }
  });

export const leatherTex = (bg = '#6b4226') =>
  canvasTex(`leather-${bg}`, 512, 384, (c, w, h) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 2500; i++) {
      c.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
      c.fillRect(r() * w, r() * h, 2, 2);
    }
    c.strokeStyle = 'rgba(240,210,160,0.7)';
    c.lineWidth = 4;
    c.setLineDash([14, 10]);
    c.strokeRect(22, 22, w - 44, h - 44);
  });
