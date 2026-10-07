import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Phone } from './world/phone.js';
import './world/icons2.js';
import * as O from './world/objects.js';
import { SwallowBeat } from './world/beat.js';
import { makeDust } from './world/fx.js';
import { Timeline } from './engine/timeline.js';
import { makeCamPath } from './engine/campath.js';
import { FONT_CN, FONT_MONO, FONT_EN, bump } from './engine/hud.js';
import { lerp, seg, noise1, shake, clamp } from './engine/util.js';

// 12 秒 demo：一部手机依次吃掉闹钟、相机、随身听。
// 改这个文件就能做你自己的片子：换物件、换字幕、换时间点、加段落。
export const DURATION = 12;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createFilm(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  RectAreaLightUniformsLib.init();
  const camera = new THREE.PerspectiveCamera(38, 9 / 16, 0.05, 200);
  const key = new THREE.DirectionalLight('#fff2e2', 1.9);
  key.position.set(-4.5, 7.5, 5.5);
  const rim = new THREE.DirectionalLight('#cfe0ff', 2.0);
  rim.position.set(4.5, 5, -7);
  scene.add(key, rim, new THREE.HemisphereLight('#ffffff', '#101014', 0.12));
  const screenLight = new THREE.RectAreaLight('#eef6ff', 0, 0.69, 1.51);
  scene.add(screenLight);

  // 主角：手机（屏幕环境反射要单独压低，否则会被场景环境光冲成灰色）
  const phone = new Phone();
  scene.add(phone.group);
  phone.screenMat.envMap = scene.environment;
  phone.screenMat.envMapIntensity = 0.05;
  phone.screenMat.needsUpdate = true;
  phone.group.position.set(0, 0.95, 1.0);
  phone.group.rotation.x = -0.3;

  // 时间线：被吃掉的东西、年份、字幕、音效事件都登记在这里
  const tl = new Timeline();
  const slotAt = (index, t) => {
    const L = tl.layoutAt(t);
    const A = phone.layouts[L.a];
    const B = phone.layouts[L.b];
    const pa = A.pos(index);
    const pb = B.pos(index);
    return { x: lerp(pa.x, pb.x, L.mix), y: lerp(pa.y, pb.y, L.mix), size: lerp(A.size, B.size, L.mix), label: lerp(A.label, B.label, L.mix) };
  };
  const ctx = { scene, tl, phone, slotAt };
  tl.layout(0, 'beat', 0);

  // "吃一口"的固定语法：浮现 → 扫描褪色 → 剥下图标 → 飞进格子 → 空壳退场
  const beats = [
    new SwallowBeat(scene, ctx, { obj: O.alarm(), t0: 1.4, hold: V(0, 2.45, 1.15), scale: 0.62, icons: [{ icon: 'clock', label: '闹钟' }], huskTo: V(-2.4, 3.4, -5) }),
    new SwallowBeat(scene, ctx, { obj: O.camera(), t0: 4.6, speed: 0.8, hold: V(0, 2.45, 1.15), scale: 0.75, icons: [{ icon: 'camera', label: '相机' }], huskTo: V(2.4, 2.6, -6) }),
    new SwallowBeat(scene, ctx, { obj: O.walkman(), t0: 7.4, speed: 0.7, hold: V(0, 2.45, 1.15), scale: 0.8, icons: [{ icon: 'music', label: '随身听' }], huskTo: V(-2.0, 1.6, -6.5) }),
  ];
  tl.year(0, 1998, 0);
  tl.year(4.6, 2000, 0.5);
  tl.year(7.4, 2001, 0.4);
  tl.text({ t0: 0.3, t1: 4.4, cn: '闹钟', en: 'The alarm clock', sub: '每天叫醒你的，换成了手机', subEn: 'Your phone wakes you up now' });
  tl.text({ t0: 4.7, t1: 7.2, cn: '相机', en: 'The camera', sub: '11 万像素的拍照手机，没人当回事', subEn: 'A 0.11-megapixel camera phone. Nobody cared' });
  tl.text({ t0: 7.5, t1: 11.2, cn: '随身听', en: 'The Walkman', sub: '一首歌，从一盒磁带变成一个图标', subEn: 'A song went from a cassette to an icon' });
  tl.finalize();

  const cam = makeCamPath([
    { t: 0, p: [0.3, 2.4, 7.8], l: [0, 2.0, 1.0], f: 38 },
    { t: 6, p: [-0.2, 2.3, 7.4], l: [0, 2.0, 1.0], f: 38 },
    { t: 12, p: [0.1, 2.35, 7.1], l: [0, 2.0, 1.0], f: 38 },
  ]);
  const dust = makeDust();
  scene.add(dust.points);
  const tmp = V(0, 0, 0);

  function update(t, hud, post) {
    const k = cam(t);
    camera.position.set(k.p[0] + noise1(t * 0.35, 1) * 0.04, k.p[1] + noise1(t * 0.3, 2) * 0.03, k.p[2]);
    camera.fov = k.f;
    camera.updateProjectionMatrix();
    camera.lookAt(k.l[0], k.l[1], k.l[2]);
    camera.updateMatrixWorld(true);

    // 每吞一样，手机抖一下
    let sh = 0;
    for (const it of tl.items) if (t >= it.t && t - it.t < 0.3) sh += shake(t - it.t, 34, 0.3);
    phone.group.position.x = clamp(sh, -1, 1) * 0.01;
    phone.group.updateMatrixWorld(true);

    for (const b of beats) b.update(t, camera);

    // 屏幕光：扫描时把物体照亮
    phone.screenCenterWorld(tmp);
    screenLight.position.copy(tmp);
    screenLight.lookAt(tmp.x, tmp.y + 1.6, tmp.z + 0.3);
    let s = -1;
    for (const b of beats) s = Math.max(s, b.scanProgress(t));
    screenLight.intensity = 0.3 + (s >= 0 ? 0.8 * Math.sin(Math.PI * s) : 0);

    // 手机屏幕：已经吃进来的图标 + 还空着的虚线格
    const icons = [];
    let n = 0;
    for (const it of tl.items) {
      if (it.t > t) break;
      n++;
      const p = slotAt(it.index, t);
      const dt = t - it.t;
      icons.push({ icon: it.icon, label: it.label, x: p.x, y: p.y, size: p.size, labelSize: p.label, scale: bump(dt, 0.3, 0.18), flash: dt < 0.45 ? 1 - dt / 0.45 : 0 });
    }
    const lay = phone.layouts.beat;
    const empties = [];
    for (let i = n; i < lay.n; i++) {
      const p = lay.pos(i);
      empties.push({ x: p.x, y: p.y, size: lay.size });
    }
    phone.draw({ power: 1, clock: '07:00', icons, empties, scan: s >= 0 ? { amount: Math.sin(Math.PI * s), pos: s } : null });
    dust.update(t, renderer.domElement.height / 1920, 1);

    // 文字层：双语字幕 + 年份 + 计数器
    hud.begin(t);
    for (const c of tl.texts) hud.cue(c);
    hud.odometer({ value: tl.yearAt(t), digits: 4, x: 540, y: 200, font: `300 88px ${FONT_MONO}`, ls: 8, alpha: seg(t, 0, 0.3), glitch: tl.yearRolling(t) ? 0.5 : 0 });
    hud.fade({ text: '已吞 · EATEN', x: 1010, y: 160, font: `500 22px ${FONT_CN}`, color: '#8a8a8a', align: 'right' });
    let last = -10;
    for (const it of tl.items) if (it.t <= t) last = it.t;
    hud.odometer({ value: tl.count(t), digits: 3, x: 1010, y: 224, font: `500 56px ${FONT_MONO}`, align: 'right', scale: bump(t - last, 0.3, 0.22) });
    hud.fade({ text: 'made with code-cinema', x: 540, y: 1840, font: `500 26px ${FONT_EN}`, color: '#666', alpha: seg(t, 10.6, 11.2) });
    hud.end();

    post.uniforms.uScrim.value = 0.25;
    post.uniforms.uFade.value = seg(t, DURATION - 0.5, DURATION);
  }

  return { scene, camera, duration: DURATION, update, events: tl.events, grain: (t) => 0.028 * (1 - seg(t, DURATION - 0.5, DURATION)) };
}
