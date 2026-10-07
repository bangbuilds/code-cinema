import { registerIcon } from './icons.js';
import { FONT_CN, FONT_MONO } from '../engine/hud.js';

// 全片新增的图标：一部分是通用符号，一部分是单字图标（和"报"字图标同一套风格）
const W = '#ffffff';
const rr = (c, x, y, w, h, r) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};
const dot = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};

const P = {
  pager: [
    ['#4B5563', '#1F2937'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.2, s * 0.3, s * 0.6, s * 0.42, s * 0.08);
      c.fill();
      c.fillStyle = '#9fc0a4';
      rr(c, s * 0.27, s * 0.37, s * 0.46, s * 0.16, s * 0.03);
      c.fill();
      c.fillStyle = '#14301d';
      c.font = `700 ${s * 0.1}px ${FONT_MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('8812', s * 0.5, s * 0.455);
      c.fillStyle = '#9aa1ab';
      for (let i = 0; i < 3; i++) dot(c, s * (0.36 + i * 0.14), s * 0.62, s * 0.03);
    },
  ],
  notes: [
    ['#FFE27A', '#F7B928'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.24, s * 0.2, s * 0.52, s * 0.6, s * 0.05);
      c.fill();
      c.fillStyle = '#F7B928';
      c.fillRect(s * 0.24, s * 0.2, s * 0.52, s * 0.1);
      c.fillStyle = '#d4d4d8';
      for (let i = 0; i < 5; i++) c.fillRect(s * 0.3, s * (0.38 + i * 0.075), s * 0.4, s * 0.018);
    },
  ],
  fax: [
    ['#E5E7EB', '#9CA3AF'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.32, s * 0.2, s * 0.36, s * 0.3, s * 0.02);
      c.fill();
      c.fillStyle = '#9CA3AF';
      for (let i = 0; i < 3; i++) c.fillRect(s * 0.37, s * (0.27 + i * 0.06), s * 0.26, s * 0.02);
      c.fillStyle = '#374151';
      rr(c, s * 0.2, s * 0.44, s * 0.6, s * 0.3, s * 0.06);
      c.fill();
      c.fillStyle = W;
      for (let i = 0; i < 6; i++) dot(c, s * (0.32 + (i % 3) * 0.08), s * (0.55 + Math.floor(i / 3) * 0.08), s * 0.02);
      c.fillStyle = '#9fc0a4';
      c.fillRect(s * 0.58, s * 0.52, s * 0.14, s * 0.08);
    },
  ],
  globe: [
    ['#5EB3FF', '#1D6FE0'],
    (c, s) => {
      c.strokeStyle = W;
      c.lineWidth = s * 0.035;
      c.beginPath();
      c.arc(s * 0.5, s * 0.5, s * 0.3, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.ellipse(s * 0.5, s * 0.5, s * 0.13, s * 0.3, 0, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(s * 0.2, s * 0.5);
      c.lineTo(s * 0.8, s * 0.5);
      c.moveTo(s * 0.5, s * 0.2);
      c.lineTo(s * 0.5, s * 0.8);
      c.stroke();
      c.lineWidth = s * 0.025;
      c.beginPath();
      c.moveTo(s * 0.25, s * 0.36);
      c.lineTo(s * 0.75, s * 0.36);
      c.moveTo(s * 0.25, s * 0.64);
      c.lineTo(s * 0.75, s * 0.64);
      c.stroke();
    },
  ],
  oldphone: [
    ['#7DD3FC', '#0284C7'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.34, s * 0.16, s * 0.32, s * 0.68, s * 0.08);
      c.fill();
      c.fillStyle = '#0284C7';
      rr(c, s * 0.39, s * 0.24, s * 0.22, s * 0.18, s * 0.02);
      c.fill();
      for (let i = 0; i < 9; i++) dot(c, s * (0.42 + (i % 3) * 0.08), s * (0.52 + Math.floor(i / 3) * 0.08), s * 0.022);
    },
  ],
  uv: [
    ['#A78BFA', '#6D28D9'],
    (c, s) => {
      c.strokeStyle = 'rgba(255,255,255,0.75)';
      c.lineWidth = s * 0.025;
      c.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (0.2 + i * 0.15);
        c.beginPath();
        c.moveTo(s * 0.5 - Math.cos(a) * s * 0.16, s * 0.42 - Math.sin(a) * s * 0.16);
        c.lineTo(s * 0.5 - Math.cos(a) * s * 0.28, s * 0.42 - Math.sin(a) * s * 0.28);
        c.stroke();
      }
      c.fillStyle = W;
      rr(c, s * 0.2, s * 0.46, s * 0.6, s * 0.3, s * 0.03);
      c.fill();
      c.fillStyle = '#6D28D9';
      c.font = `900 ${s * 0.2}px ${FONT_CN}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('¥', s * 0.5, s * 0.62);
    },
  ],
  speaker: [
    ['#FB7185', '#E11D48'],
    (c, s) => {
      c.fillStyle = W;
      c.beginPath();
      c.moveTo(s * 0.22, s * 0.42);
      c.lineTo(s * 0.34, s * 0.42);
      c.lineTo(s * 0.5, s * 0.28);
      c.lineTo(s * 0.5, s * 0.72);
      c.lineTo(s * 0.34, s * 0.58);
      c.lineTo(s * 0.22, s * 0.58);
      c.closePath();
      c.fill();
      c.strokeStyle = W;
      c.lineWidth = s * 0.04;
      c.lineCap = 'round';
      for (const r of [0.12, 0.22]) {
        c.beginPath();
        c.arc(s * 0.52, s * 0.5, s * r, -0.7, 0.7);
        c.stroke();
      }
    },
  ],
  stopwatch: [
    ['#FDBA74', '#EA580C'],
    (c, s) => {
      c.fillStyle = W;
      c.fillRect(s * 0.45, s * 0.16, s * 0.1, s * 0.08);
      c.strokeStyle = W;
      c.lineWidth = s * 0.045;
      c.beginPath();
      c.arc(s * 0.5, s * 0.55, s * 0.26, 0, Math.PI * 2);
      c.stroke();
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(s * 0.5, s * 0.55);
      c.lineTo(s * 0.6, s * 0.42);
      c.stroke();
    },
  ],
  mic: [
    ['#F472B6', '#BE185D'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.4, s * 0.18, s * 0.2, s * 0.38, s * 0.1);
      c.fill();
      c.strokeStyle = W;
      c.lineWidth = s * 0.04;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(s * 0.5, s * 0.45, s * 0.18, 0.2, Math.PI - 0.2);
      c.moveTo(s * 0.5, s * 0.63);
      c.lineTo(s * 0.5, s * 0.78);
      c.moveTo(s * 0.4, s * 0.79);
      c.lineTo(s * 0.6, s * 0.79);
      c.stroke();
    },
  ],
  mirror: [
    ['#C4B5FD', '#7C3AED'],
    (c, s) => {
      c.fillStyle = W;
      c.fillRect(s * 0.46, s * 0.62, s * 0.08, s * 0.22);
      c.beginPath();
      c.ellipse(s * 0.5, s * 0.42, s * 0.2, s * 0.24, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ddd6fe';
      c.beginPath();
      c.ellipse(s * 0.5, s * 0.42, s * 0.15, s * 0.19, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = W;
      c.lineWidth = s * 0.025;
      c.beginPath();
      c.moveTo(s * 0.42, s * 0.36);
      c.lineTo(s * 0.5, s * 0.28);
      c.stroke();
    },
  ],
  magnifier: [
    ['#67E8F9', '#0891B2'],
    (c, s) => {
      c.strokeStyle = W;
      c.lineWidth = s * 0.06;
      c.lineCap = 'round';
      c.beginPath();
      c.arc(s * 0.44, s * 0.44, s * 0.18, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = s * 0.08;
      c.beginPath();
      c.moveTo(s * 0.57, s * 0.57);
      c.lineTo(s * 0.74, s * 0.74);
      c.stroke();
    },
  ],
  level: [
    ['#FDE047', '#CA8A04'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.16, s * 0.42, s * 0.68, s * 0.16, s * 0.04);
      c.fill();
      c.fillStyle = '#86efac';
      rr(c, s * 0.38, s * 0.45, s * 0.24, s * 0.1, s * 0.05);
      c.fill();
      c.fillStyle = W;
      dot(c, s * 0.5, s * 0.5, s * 0.03);
      c.fillStyle = '#CA8A04';
      c.fillRect(s * 0.44, s * 0.45, s * 0.012, s * 0.1);
      c.fillRect(s * 0.55, s * 0.45, s * 0.012, s * 0.1);
    },
  ],
  nav: [
    ['#4ADE80', '#15803D'],
    (c, s) => {
      c.fillStyle = W;
      c.beginPath();
      c.moveTo(s * 0.5, s * 0.2);
      c.lineTo(s * 0.74, s * 0.78);
      c.lineTo(s * 0.5, s * 0.64);
      c.lineTo(s * 0.26, s * 0.78);
      c.closePath();
      c.fill();
    },
  ],
  photos: [
    ['#FBCFE8', '#F472B6'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.18, s * 0.26, s * 0.64, s * 0.48, s * 0.05);
      c.fill();
      c.fillStyle = '#93c5fd';
      rr(c, s * 0.22, s * 0.3, s * 0.56, s * 0.4, s * 0.03);
      c.fill();
      c.fillStyle = '#fde047';
      dot(c, s * 0.64, s * 0.4, s * 0.05);
      c.fillStyle = '#22c55e';
      c.beginPath();
      c.moveTo(s * 0.22, s * 0.7);
      c.lineTo(s * 0.38, s * 0.48);
      c.lineTo(s * 0.5, s * 0.62);
      c.lineTo(s * 0.6, s * 0.54);
      c.lineTo(s * 0.78, s * 0.7);
      c.closePath();
      c.fill();
    },
  ],
  film: [
    ['#FCD34D', '#D97706'],
    (c, s) => {
      c.fillStyle = '#1f2937';
      rr(c, s * 0.18, s * 0.3, s * 0.64, s * 0.4, s * 0.03);
      c.fill();
      c.fillStyle = W;
      for (let i = 0; i < 6; i++) {
        c.fillRect(s * (0.22 + i * 0.1), s * 0.33, s * 0.05, s * 0.04);
        c.fillRect(s * (0.22 + i * 0.1), s * 0.63, s * 0.05, s * 0.04);
      }
      c.fillStyle = '#fbbf24';
      c.fillRect(s * 0.24, s * 0.4, s * 0.24, s * 0.2);
      c.fillStyle = '#60a5fa';
      c.fillRect(s * 0.52, s * 0.4, s * 0.24, s * 0.2);
    },
  ],
  qr: [
    ['#4ADE80', '#16A34A'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.2, s * 0.2, s * 0.6, s * 0.6, s * 0.06);
      c.fill();
      c.fillStyle = '#16A34A';
      const m = s * 0.6 / 9;
      const pat = ['111010111', '101011101', '111001111', '000110010', '101101011', '010010100', '111011010', '101010111', '111001101'];
      pat.forEach((row, y) => [...row].forEach((v, x) => v === '1' && c.fillRect(s * 0.2 + x * m + 1, s * 0.2 + y * m + 1, m - 1, m - 1)));
    },
  ],
  taxi: [
    ['#FDE047', '#EAB308'],
    (c, s) => {
      c.fillStyle = '#1f2937';
      rr(c, s * 0.42, s * 0.2, s * 0.16, s * 0.08, s * 0.02);
      c.fill();
      c.fillStyle = W;
      c.beginPath();
      c.moveTo(s * 0.28, s * 0.48);
      c.lineTo(s * 0.36, s * 0.3);
      c.lineTo(s * 0.64, s * 0.3);
      c.lineTo(s * 0.72, s * 0.48);
      c.closePath();
      c.fill();
      rr(c, s * 0.18, s * 0.46, s * 0.64, s * 0.2, s * 0.05);
      c.fill();
      c.fillStyle = '#1f2937';
      dot(c, s * 0.3, s * 0.7, s * 0.07);
      dot(c, s * 0.7, s * 0.7, s * 0.07);
      c.fillStyle = '#EAB308';
      dot(c, s * 0.27, s * 0.55, s * 0.03);
      dot(c, s * 0.73, s * 0.55, s * 0.03);
    },
  ],
  cash: [
    ['#34D399', '#059669'],
    (c, s) => {
      c.fillStyle = W;
      c.font = `900 ${s * 0.46}px ${FONT_CN}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('¥', s * 0.5, s * 0.53);
    },
  ],
  remote: [
    ['#94A3B8', '#475569'],
    (c, s) => {
      c.fillStyle = W;
      rr(c, s * 0.38, s * 0.16, s * 0.24, s * 0.68, s * 0.08);
      c.fill();
      c.fillStyle = '#ef4444';
      dot(c, s * 0.5, s * 0.27, s * 0.035);
      c.fillStyle = '#475569';
      for (let i = 0; i < 8; i++) dot(c, s * (0.45 + (i % 2) * 0.1), s * (0.4 + Math.floor(i / 2) * 0.09), s * 0.022);
    },
  ],
  weather: [
    ['#7DD3FC', '#0EA5E9'],
    (c, s) => {
      c.fillStyle = '#fde047';
      dot(c, s * 0.42, s * 0.4, s * 0.15);
      c.fillStyle = W;
      dot(c, s * 0.5, s * 0.6, s * 0.12);
      dot(c, s * 0.64, s * 0.55, s * 0.14);
      dot(c, s * 0.36, s * 0.64, s * 0.09);
      rr(c, s * 0.3, s * 0.6, s * 0.48, s * 0.13, s * 0.06);
      c.fill();
    },
  ],
  pen: [
    ['#FCA5A5', '#DC2626'],
    (c, s) => {
      c.save();
      c.translate(s * 0.5, s * 0.5);
      c.rotate(Math.PI / 4);
      c.fillStyle = W;
      rr(c, -s * 0.06, -s * 0.3, s * 0.12, s * 0.46, s * 0.03);
      c.fill();
      c.beginPath();
      c.moveTo(-s * 0.06, s * 0.17);
      c.lineTo(s * 0.06, s * 0.17);
      c.lineTo(0, s * 0.3);
      c.closePath();
      c.fill();
      c.restore();
    },
  ],
  cloud: [
    ['#CBD5E1', '#64748B'],
    (c, s) => {
      c.fillStyle = W;
      dot(c, s * 0.38, s * 0.52, s * 0.13);
      dot(c, s * 0.54, s * 0.44, s * 0.17);
      dot(c, s * 0.67, s * 0.55, s * 0.12);
      rr(c, s * 0.26, s * 0.52, s * 0.52, s * 0.14, s * 0.07);
      c.fill();
    },
  ],
  bulb: [
    ['#FEF08A', '#EAB308'],
    (c, s) => {
      c.fillStyle = W;
      dot(c, s * 0.5, s * 0.42, s * 0.19);
      rr(c, s * 0.42, s * 0.56, s * 0.16, s * 0.14, s * 0.03);
      c.fill();
      c.fillStyle = '#a3a3a3';
      c.fillRect(s * 0.43, s * 0.72, s * 0.14, s * 0.035);
      c.fillRect(s * 0.44, s * 0.77, s * 0.12, s * 0.035);
    },
  ],
  palette: [
    ['#F9A8D4', '#DB2777'],
    (c, s) => {
      c.fillStyle = W;
      c.beginPath();
      c.ellipse(s * 0.5, s * 0.5, s * 0.3, s * 0.25, -0.2, 0, Math.PI * 2);
      c.fill();
      ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'].forEach((col, i) => {
        c.fillStyle = col;
        dot(c, s * (0.36 + i * 0.09), s * (0.42 + (i % 2) * 0.04), s * 0.04);
      });
      c.fillStyle = '#DB2777';
      dot(c, s * 0.6, s * 0.6, s * 0.05);
    },
  ],
  code: [
    ['#334155', '#0F172A'],
    (c, s) => {
      c.fillStyle = '#7dd3fc';
      c.font = `700 ${s * 0.28}px ${FONT_MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('</>', s * 0.5, s * 0.52);
    },
  ],
  numbers: [
    ['#A5B4FC', '#4F46E5'],
    (c, s) => {
      c.fillStyle = W;
      c.font = `700 ${s * 0.13}px ${FONT_MONO}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const d = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      d.forEach((n, i) => c.fillText(n, s * (0.33 + (i % 3) * 0.17), s * (0.33 + Math.floor(i / 3) * 0.17)));
    },
  ],
  translate: [
    ['#60A5FA', '#2563EB'],
    (c, s) => {
      c.fillStyle = W;
      c.font = `900 ${s * 0.3}px ${FONT_CN}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('译', s * 0.38, s * 0.42);
      c.font = `800 ${s * 0.24}px Inter, sans-serif`;
      c.fillText('A', s * 0.66, s * 0.66);
    },
  ],
};

// 单字图标
const CH = {
  telegram: ['电', '#F87171', '#B91C1C'],
  feature: ['机', '#38BDF8', '#0369A1'],
  studio: ['照', '#F9A8D4', '#BE185D'],
  kiosk: ['亭', '#4ADE80', '#15803D'],
  avshop: ['碟', '#C084FC', '#7E22CE'],
  bank: ['银', '#FCD34D', '#B45309'],
  passbook: ['折', '#FB923C', '#C2410C'],
  doorcard: ['门', '#5EEAD4', '#0F766E'],
  buscard: ['公', '#93C5FD', '#1D4ED8'],
  menu: ['菜', '#FDBA74', '#C2410C'],
  plane: ['机', '#7DD3FC', '#0369A1'],
  movie: ['影', '#F87171', '#991B1B'],
  booth: ['话', '#FB923C', '#9A3412'],
  post: ['邮', '#34D399', '#047857'],
  netcafe: ['网', '#818CF8', '#3730A3'],
  window: ['售', '#FCA5A5', '#B91C1C'],
  travel: ['旅', '#5EEAD4', '#0D9488'],
  match: ['媒', '#F9A8D4', '#DB2777'],
  arcade: ['游', '#A78BFA', '#6D28D9'],
  ktv: ['唱', '#F472B6', '#9D174D'],
  bookstore: ['书', '#FDBA74', '#9A3412'],
  repeat: ['读', '#86EFAC', '#15803D'],
  edict: ['典', '#FDE68A', '#B45309'],
  metro: ['铁', '#93C5FD', '#1E40AF'],
  coupon: ['券', '#FCA5A5', '#DC2626'],
  flyer: ['单', '#FDE047', '#A16207'],
  yellow: ['黄', '#FDE047', '#CA8A04'],
  stamp: ['邮', '#F87171', '#7F1D1D'],
  postcard: ['片', '#A5F3FC', '#0E7490'],
  piggy: ['储', '#F9A8D4', '#BE185D'],
  steps: ['步', '#86EFAC', '#166534'],
  cashier: ['收', '#FCD34D', '#92400E'],
  pos: ['刷', '#C4B5FD', '#5B21B6'],
  guide: ['导', '#6EE7B7', '#047857'],
  scanner: ['扫', '#CBD5E1', '#475569'],
  copyshop: ['印', '#D1D5DB', '#4B5563'],
  vhs: ['带', '#78716C', '#292524'],
  tape: ['磁', '#FB923C', '#7C2D12'],
  cardx: ['卡', '#5EEAD4', '#115E59'],
  coins: ['零', '#FDE68A', '#A16207'],
  greeting: ['贺', '#FCA5A5', '#B91C1C'],
  magazine: ['刊', '#F0ABFC', '#A21CAF'],
  boring: ['闲', '#CBD5E1', '#475569'],
  write: ['写', '#FDBA74', '#C2410C'],
  thermo: ['温', '#FCA5A5', '#B91C1C'],
  ruler: ['尺', '#FDE047', '#A16207'],
  metronome: ['拍', '#C4B5FD', '#6D28D9'],
  scale: ['秤', '#D6D3D1', '#57534E'],
  letter: ['信', '#FDE68A', '#B45309'],
  calc2: ['算', '#9CA3AF', '#374151'],
  receipt: ['票', '#93C5FD', '#1E3A8A'],
  lottery: ['彩', '#FCA5A5', '#B91C1C'],
  bill: ['费', '#A7F3D0', '#047857'],
  edict2: ['辞', '#FDE68A', '#92400E'],
};

for (const [k, [colors, glyph]] of Object.entries(P)) registerIcon(k, colors, glyph);
for (const [k, [ch, c1, c2]] of Object.entries(CH))
  registerIcon(k, [c1, c2], (c, s) => {
    c.fillStyle = W;
    c.font = `900 ${s * 0.46}px ${FONT_CN}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(ch, s * 0.5, s * 0.53);
  });
