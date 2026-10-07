import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/600.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import * as THREE from 'three';
import { Post } from './engine/post.js';
import { HUD } from './engine/hud.js';
import { createFilm } from './film.js';

const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
const COVER = params.has('cover');
const FULL_W = 1080;
const FULL_H = 1920;
document.body.classList.toggle('export', EXPORT);

// 把源码里出现过的所有中文字符都预加载，保证逐帧导出时字体一定就绪
async function loadFonts() {
  const srcs = import.meta.glob('./**/*.js', { query: '?raw', import: 'default', eager: true });
  const set = new Set('0123456789:：，。·-—¥%#&@$*+=<>/|ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
  for (const s of Object.values(srcs)) for (const ch of s) if (/[　-鿿＀-￯]/.test(ch)) set.add(ch);
  const text = [...set].join('');
  const jobs = [];
  for (const w of [300, 400, 500, 600, 700, 900]) jobs.push(document.fonts.load(`${w} 40px "Noto Sans SC"`, text));
  for (const w of [300, 400, 500, 600, 700]) jobs.push(document.fonts.load(`${w} 40px "JetBrains Mono"`, text));
  for (const w of [400, 500, 600]) jobs.push(document.fonts.load(`${w} 40px "Inter"`, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?\'"“”‘’—–-()¥%&/…'));
  await Promise.all(jobs);
  await document.fonts.ready;
}

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  preserveDrawingBuffer: EXPORT,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
// 手动管理清屏：运动模糊要把多个子帧累加进同一个缓冲
renderer.autoClear = false;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

await loadFonts();

const hud = new HUD(FULL_W, FULL_H);
const film = createFilm(renderer);
let scale = EXPORT ? 1 : Number(params.get('res') || 0.5);
const post = new Post(renderer, Math.round(FULL_W * scale), Math.round(FULL_H * scale));
post.uniforms.uVignette.value = 0.85;
post.uniforms.uCA.value = 0.006;

function setRes(s) {
  scale = s;
  const w = Math.round(FULL_W * s);
  const h = Math.round(FULL_H * s);
  renderer.setSize(w, h, false);
  post.setSize(w, h);
}
setRes(scale);

function renderAt(t, sub = 1) {
  const shutter = 0.5 / 60;
  for (let k = 0; k < sub; k++) {
    const tt = sub > 1 ? t + (k / sub - 0.5) * shutter : t;
    film.update(tt, hud, post, { cover: COVER });
    post.renderSub(film.scene, film.camera, hud.texture, k, sub);
  }
  post.present(t, film.grain(t));
}

// 导出接口：Playwright 逐帧调用
window.__film = {
  duration: film.duration,
  fps: 60,
  events: film.events,
  frame(t, sub = 1, type = 'image/jpeg', q = 0.95) {
    renderAt(t, sub);
    return canvas.toDataURL(type, q).split(',')[1];
  },
  ready: true,
};

if (!EXPORT) {
  const ui = {
    play: document.getElementById('play'),
    scrub: document.getElementById('scrub'),
    time: document.getElementById('time'),
    res: document.getElementById('res'),
  };
  ui.scrub.max = String(film.duration);
  ui.res.value = String(scale);
  let t = Number(params.get('t') || 0);
  let playing = !params.has('pause');
  let last = performance.now();
  const setPlaying = (p) => {
    playing = p;
    ui.play.textContent = p ? '❚❚' : '▶';
  };
  setPlaying(playing);
  ui.play.onclick = () => setPlaying(!playing);
  ui.scrub.oninput = () => {
    t = Number(ui.scrub.value);
    setPlaying(false);
  };
  ui.res.onchange = () => setRes(Number(ui.res.value));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      setPlaying(!playing);
      e.preventDefault();
    }
    const step = e.shiftKey ? 1 : 1 / 60;
    if (e.code === 'ArrowRight') {
      t = Math.min(film.duration, t + step);
      setPlaying(false);
    }
    if (e.code === 'ArrowLeft') {
      t = Math.max(0, t - step);
      setPlaying(false);
    }
  });
  window.__seek = (v) => {
    t = v;
    setPlaying(false);
  };
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      t += dt;
      if (t > film.duration) t = 0;
    }
    renderAt(t);
    ui.scrub.value = String(t);
    ui.time.textContent = `${t.toFixed(2)}s`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
