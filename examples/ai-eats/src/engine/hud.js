import * as THREE from 'three';
import { clamp, hash1, ease } from './util.js';

// 文字层：1080×1920 的 2D 画布，每帧按时间 t 重画，作为贴图合成到画面最上层
export const FONT_CN = '"Noto Sans SC", "PingFang SC", sans-serif';
export const FONT_MONO = '"JetBrains Mono", "SF Mono", monospace';
export const FONT_EN = '"Inter", "Noto Sans SC", sans-serif';

const SCRAMBLE = '#%&@$*+=<>/|01ABCDEFXYZ吞吃电话线机图钟光年口第一';

export class HUD {
  constructor(w = 1080, h = 1920) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.frame = 0;
  }

  begin(t) {
    this.t = t;
    this.frame = Math.floor(t * 60);
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  end() {
    this.texture.needsUpdate = true;
  }

  _setFont(font, ls = 0) {
    const c = this.ctx;
    c.font = font;
    c.letterSpacing = `${ls}px`;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
  }

  _prefix(chars, i) {
    return this.ctx.measureText(chars.slice(0, i).join('')).width;
  }

  // 打字机：逐字出现，最新的字先乱码一闪；可回删
  type(o) {
    const c = this.ctx;
    const t = this.t;
    const {
      text,
      x,
      y,
      font,
      color = '#fff',
      align = 'center',
      start,
      cps = 16,
      eraseStart = null,
      eraseCps = 48,
      scramble = 0.06,
      cursor = true,
      ls = 0,
      alpha = 1,
      highlight = null,
      glow = 0,
    } = o;
    if (t < start) return;
    const chars = [...text];
    const typedEnd = start + chars.length / cps;
    let n = Math.floor((t - start) * cps);
    let erasing = false;
    if (eraseStart !== null && t >= eraseStart) {
      erasing = true;
      n = Math.min(n, chars.length) - Math.floor((t - eraseStart) * eraseCps);
    }
    n = clamp(n, 0, chars.length);
    if (erasing && n <= 0) return;

    this._setFont(font, ls);
    const full = c.measureText(text).width;
    const x0 = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
    c.save();
    c.globalAlpha = alpha;
    if (glow > 0) {
      c.shadowColor = color;
      c.shadowBlur = glow;
    }
    for (let i = 0; i < n; i++) {
      let ch = chars[i];
      const age = t - (start + (i + 1) / cps);
      if (!erasing && age < scramble && ch.trim()) {
        const k = Math.floor(hash1(i * 13.1 + this.frame * 0.77) * SCRAMBLE.length);
        ch = SCRAMBLE[k];
      }
      c.fillStyle = highlight && i >= highlight.from && i < highlight.to ? highlight.color : color;
      c.fillText(ch, x0 + this._prefix(chars, i), y);
    }
    // 方块光标：打字中常亮，打完闪烁 0.6 秒后消失
    const showCursor =
      cursor && (erasing || t < typedEnd || (t < typedEnd + 0.6 && Math.floor((t - typedEnd) * 4) % 2 === 0));
    if (showCursor) {
      const m = c.measureText('M');
      const hgt = (m.actualBoundingBoxAscent || 40) * 1.05;
      const cx = x0 + this._prefix(chars, n) + 4;
      c.fillStyle = color;
      c.globalAlpha = alpha * 0.85;
      c.fillRect(cx, y - hgt, Math.max(6, hgt * 0.42), hgt * 1.12);
    }
    c.restore();
  }

  // 淡入淡出文字（副标题）
  fade(o) {
    const c = this.ctx;
    const { text, x, y, font, color = '#999', align = 'center', alpha = 1, dy = 0, ls = 0 } = o;
    if (alpha <= 0.001) return;
    this._setFont(font, ls);
    c.textAlign = align;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillText(text, x, y + dy);
    c.restore();
  }

  // 机械里程表数字：value 可以是小数，个位滚动带动高位进位
  odometer(o) {
    const c = this.ctx;
    const {
      value,
      digits = 4,
      x,
      y,
      font,
      color = '#eee',
      align = 'center',
      alpha = 1,
      ls = 0,
      scale = 1,
      glitch = 0,
    } = o;
    if (alpha <= 0.001) return;
    this._setFont(font, ls);
    const cw = c.measureText('0').width + ls;
    const m = c.measureText('0');
    const total = cw * digits;
    const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const v = Math.max(0, value);
    c.save();
    c.globalAlpha = alpha;
    c.translate(x0 + total / 2, y);
    c.scale(scale, scale);
    c.translate(-(x0 + total / 2), -y);
    const asc = m.actualBoundingBoxAscent || 60;
    const pitch = asc * 1.4;
    for (let k = 0; k < digits; k++) {
      const p = Math.pow(10, k);
      const d = Math.floor(v / p) % 10;
      const lower = v % p;
      const frac = k === 0 ? v - Math.floor(v) : lower > p - 1 ? lower - (p - 1) : 0;
      const cx = x0 + (digits - 1 - k) * cw;
      c.save();
      c.beginPath();
      c.rect(cx - 4, y - asc * 1.18, cw + 8, asc * 1.42);
      c.clip();
      const off = frac * pitch;
      c.fillStyle = color;
      c.globalAlpha = alpha * (1 - frac * 0.85);
      c.fillText(String(d), cx, y - off);
      if (frac > 0.001) {
        c.globalAlpha = alpha * (0.15 + frac * 0.85);
        c.fillText(String((d + 1) % 10), cx, y - off + pitch);
      }
      c.restore();
      // 滚动中的那一位偶尔闪一个方块（参考片里的"光标"质感）
      if (glitch > 0 && k === 0 && hash1(this.frame * 0.31) < glitch) {
        c.fillStyle = color;
        c.globalAlpha = alpha * 0.7;
        c.fillRect(cx + cw * 0.12, y - asc, cw * 0.62, asc * 1.1);
      }
    }
    c.restore();
  }
}

// 双语字幕块：中文标题（打字机）+ 英文标题（同步打出）+ 中文副标题 + 英文副标题（淡入）
HUD.prototype.cue = function (c) {
  const t = this.t;
  if (t < c.t0 - 0.01 || t > c.t1 + 0.05) return;
  const flash = c.style === 'flash';
  const cps = c.cps ?? (flash ? 40 : 14);
  const typeDur = [...c.cn].length / cps;
  const eraseAt = c.t1 - (flash ? 0.12 : 0.28);
  const Y = c.y ?? 290;
  const size = c.size ?? 64;
  this.type({
    text: c.cn,
    x: 540,
    y: Y,
    font: `700 ${size}px ${FONT_CN}`,
    start: c.t0,
    cps,
    eraseStart: eraseAt,
    eraseCps: flash ? 120 : 80,
    scramble: flash ? 0.03 : 0.06,
    highlight: c.highlight,
    color: c.color || '#ffffff',
    cursor: c.cursor ?? true,
  });
  if (c.en) {
    const cpsEn = Math.max(cps * 2.2, c.en.length / Math.max(0.18, typeDur));
    this.type({
      text: c.en,
      x: 540,
      y: Y + Math.round(size * 0.74),
      font: `500 ${Math.round(size * 0.47)}px ${FONT_EN}`,
      color: 'rgba(236,236,236,0.92)',
      start: c.t0 + 0.06,
      cps: cpsEn,
      eraseStart: eraseAt,
      eraseCps: 220,
      scramble: 0.03,
      cursor: false,
      ls: 0.3,
      highlight: c.highlightEn,
    });
  }
  if (c.sub) {
    const s0 = c.subT ?? c.t0 + typeDur + (flash ? 0.05 : 0.15);
    const fin = clamp((t - (c.t1 - 0.32)) / 0.26);
    const a = clamp((t - s0) / 0.35) * (1 - fin);
    const dy = (1 - ease.outCubic(clamp((t - s0) / 0.35))) * 10;
    const subs = Array.isArray(c.sub) ? c.sub : [c.sub];
    let y = Y + Math.round(size * 1.62);
    for (const line of subs) {
      this.fade({ text: line, x: 540, y, font: `400 31px ${FONT_CN}`, color: '#a9a9a9', alpha: a, dy });
      y += 40;
    }
    if (c.subEn) {
      const a2 = clamp((t - s0 - 0.08) / 0.35) * (1 - fin);
      const ens = Array.isArray(c.subEn) ? c.subEn : [c.subEn];
      for (const line of ens) {
        this.fade({ text: line, x: 540, y: y - 2, font: `400 24px ${FONT_EN}`, color: '#8d8d8d', alpha: a2, dy });
        y += 32;
      }
    }
  }
};

export const bump = (dt, dur = 0.35, amp = 0.28) => (dt < 0 || dt > dur ? 1 : 1 + amp * (1 - ease.outCubic(dt / dur)));
