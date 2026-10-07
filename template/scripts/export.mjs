// 逐帧导出：本机 Chrome 无头渲染 → JPEG 帧管道 → ffmpeg 编码 H.264
// 用法：
//   node scripts/export.mjs --out=out/sample.mp4 [--sub=6] [--start=0 --end=10.4]
//   node scripts/export.mjs --frames=0.9,2.4,3.5 --dir=out/stills      （导出静帧检查）
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const s = a.replace(/^--/, '');
    const i = s.indexOf('=');
    return i < 0 ? [s, 'true'] : [s.slice(0, i), s.slice(i + 1)];
  }),
);
const url = args.url || 'http://localhost:5173/?export=1';
const fps = Number(args.fps || 60);
const sub = Number(args.sub || 1);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text());
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url);
await page.waitForFunction(() => window.__film && window.__film.ready, null, { timeout: 180000 });
const info = await page.evaluate(() => {
  const gl = document.getElementById('c').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return { duration: window.__film.duration, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown' };
});
console.log(`GPU: ${info.gpu}`);

if (args.events) {
  const ev = await page.evaluate(() => window.__film.events);
  fs.mkdirSync(path.dirname(args.events), { recursive: true });
  fs.writeFileSync(args.events, JSON.stringify({ duration: info.duration, events: ev }, null, 1));
  console.log(`events → ${args.events} (${ev.length})`);
}

const grab = (t, q) => page.evaluate(([t, s, q]) => window.__film.frame(t, s, 'image/jpeg', q), [t, sub, q]);

if (args.frames) {
  const dir = args.dir || 'out/stills';
  fs.mkdirSync(dir, { recursive: true });
  for (const t of args.frames.split(',').map(Number)) {
    const b64 = await grab(t, 0.92);
    fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.jpg`), Buffer.from(b64, 'base64'));
  }
  console.log(`stills → ${dir}`);
} else {
  const out = args.out || 'out/sample.mp4';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const start = Number(args.start || 0);
  const end = Number(args.end || info.duration);
  const n = Math.round((end - start) * fps);
  const ff = spawn(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'image2pipe',
      '-framerate',
      String(fps),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '15',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const b64 = await grab(start + i / fps, 0.95);
    if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await once(ff.stdin, 'drain');
    if (i % 30 === 0) process.stdout.write(`\r${i}/${n} 帧  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await once(ff, 'close');
  console.log(`\n完成：${out}（${((Date.now() - t0) / 1000).toFixed(0)}s）`);
}
await browser.close();
