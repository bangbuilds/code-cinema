import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Phone } from './world/phone.js';
import './world/icons2.js';
import { makeDust, makeGlow } from './world/fx.js';
import { AIBar, Bubble, Eater } from './seq/ai.js';
import { EP1_ITEMS } from './data/ep1.js';
import { Timeline } from './engine/timeline.js';
import { makeCamPath } from './engine/campath.js';
import { FONT_CN, FONT_MONO, FONT_EN, bump } from './engine/hud.js';
import { clamp, lerp, seg, ease, noise1, hash1 } from './engine/util.js';

// 《AI 进食史》：手机吃掉了世界，AI 正在吃掉手机。约 82 秒
export const DURATION = 82;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const POSES = {
  FINAL: { pos: V(0, 1.4, 1.0), rx: -0.04 },
  BEAT: { pos: V(0, 0.95, 1.0), rx: -0.3 },
};
const BAR_HOLD = V(0, 2.3, 1.25);
const BAR_END = V(0, 1.95, 1.65);

export function createFilm(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;
  const camera = new THREE.PerspectiveCamera(38, 9 / 16, 0.05, 200);
  const key = new THREE.DirectionalLight('#fff2e2', 1.6);
  key.position.set(-4.5, 7.5, 5.5);
  const rim = new THREE.DirectionalLight('#cfe0ff', 2.0);
  rim.position.set(4.5, 5, -7);
  const hemi = new THREE.HemisphereLight('#ffffff', '#101014', 0.12);
  scene.add(key, rim, hemi);

  const phone = new Phone();
  scene.add(phone.group);
  phone.screenMat.envMap = scene.environment;
  phone.screenMat.envMapIntensity = 0.05;
  phone.screenMat.needsUpdate = true;
  const bar = new AIBar(scene);
  const bubble = new Bubble(scene);
  const dust = makeDust();
  const barFlash = makeGlow('#bfe0ff');
  scene.add(dust.points, barFlash);

  const tl = new Timeline();
  const slotOf = new Map(EP1_ITEMS.map(([, label], i) => [label, i]));
  const eats = [];
  const eat = (labels, t0, gap, style = 'fly', dur = 0.55) =>
    labels.forEach((l, k) => {
      const slot = slotOf.get(l);
      if (slot === undefined) throw new Error(`no slot: ${l}`);
      eats.push({ slot, icon: EP1_ITEMS[slot][0], label: l, t: t0 + k * gap, dur, style });
    });

  // ── 输入框里要它做的事（发出去后变成右上方的气泡）
  const PROMPTS = [
    { t0: 6.3, text: '这个词是什么意思？', cps: 8, send: 7.65, end: 15.2 },
    { t0: 15.9, text: '帮我写一封道歉信', cps: 8, send: 17.1, end: 23.8 },
    { t0: 24.4, text: '画一张教皇穿羽绒服的照片', cps: 9, send: 25.85, end: 30.8 },
    { t0: 31.4, text: '生成一分钟海边日落的视频', cps: 9, send: 32.85, end: 39.4 },
    { t0: 40.1, text: '明天会下雨吗？', cps: 8, send: 41.0, end: 45.8 },
    { t0: 46.6, text: '帮我回一下消息', cps: 8, send: 47.5, end: 53.6 },
    { t0: 54.4, text: '帮我点 40 杯奶茶', cps: 9, send: 55.3, end: 62.4 },
    { t0: 72.4, text: '你想做什么？', cps: 6, send: null, end: 75.1 },
    { t0: 75.4, text: '比如……再做一条这样的视频？', cps: 8, send: null, end: 99 },
  ];
  for (const p of PROMPTS) {
    tl.event(p.t0, 'prompt', { n: [...p.text].length, cps: p.cps });
    if (p.send) tl.event(p.send, 'send');
  }

  // ── 每一章吃掉的 App（全是第一集吃进手机的那 100 样）
  eat(['词典', '电子词典', '黄页', '导游图', '计算器', '算盘'], 8.1, 0.45);
  eat(['信', '贺卡', '记事本', '报纸', '杂志', '电报'], 17.5, 0.42);
  eat(['相机', '相册', '照相馆', '胶卷', '扫描仪'], 26.3, 0.42);
  eat(['电视', '录像带', '音像店', '磁带', 'CD', 'MP3', '收音机', 'KTV'], 33.25, 0.33);
  eat(['天气预报', '闹钟', '日历', '地图', '导航仪', '指南针', '秒表', '复读机', '背号码', '手写'], 41.4, 0.27);
  const RESIST = ['红包', '钱包', '名片', '打车', '银行卡', '现金', '公交卡', '菜单'];
  eat(RESIST, 55.75, 0.2, 'hop', 0.6);
  eat(['火车票', '机票', '电影票', '旅行社', '售票窗口', '收银台', 'POS 机', '银行网点', '存折', '缴费单', '发票', '彩票', '优惠券', '零钱'], 57.45, 0.2);
  const eaten = new Set(eats.map((e) => e.slot));
  const rest = EP1_ITEMS.map((_, i) => i).filter((i) => !eaten.has(i));
  rest.forEach((slot, k) => eats.push({ slot, icon: EP1_ITEMS[slot][0], label: EP1_ITEMS[slot][1], t: 63.6 + (k / rest.length) * 3.6, dur: 0.85, style: 'vortex' }));
  eats.sort((a, b) => a.t - b.t);
  const eatAt = new Map(eats.map((e) => [e.slot, e]));
  for (const e of eats) tl.event(e.t, 'eat', { style: e.style });
  const resistSlots = new Set(RESIST.map((l) => slotOf.get(l)));
  [48.3, 49.15, 50.0, 50.85].forEach((t) => tl.event(t, 'resist'));
  tl.event(47.9, 'shield');
  tl.event(55.4, 'join');
  tl.event(63.4, 'collapse', { dur: 4.2 });
  tl.event(68.8, 'phone', { dur: 1.8 });
  tl.event(77.6, 'credit');

  const eater = new Eater(scene, eats);

  // ── 年份
  tl.year(0, 2026, 0);
  tl.year(5.0, 2022, 0.6);
  tl.year(15.4, 2023, 0.4);
  tl.year(31.0, 2024, 0.4);
  tl.year(39.6, 2025, 0.4);
  tl.year(53.6, 2026, 0.4);

  // ── 字幕
  const text = (t0, t1, cn, en, sub, subEn, extra = {}) => tl.text({ t0, t1, cn, en, sub, subEn, ...extra });
  text(0.3, 2.9, '上一集，手机花了 53 年，', 'Last time, the phone spent 53 years', null, null, { y: 250 });
  text(1.25, 2.93, '吃掉了 100 样东西。', 'eating 100 things.', null, null, { y: 362, highlight: { from: 4, to: 7, color: '#8fd3ff' }, highlightEn: { from: 7, to: 10, color: '#8fd3ff' } });
  text(3.2, 5.45, '这一集，有东西在吃它。', 'This time, something is eating it.', null, null, { y: 290, cps: 13 });
  text(5.8, 15.2, '一个输入框', 'A text box', '2022 年 11 月，ChatGPT 上线，两个月用户破亿', 'Nov 2022: ChatGPT launches — 100 million users in two months');
  text(15.6, 23.8, '它会写了', 'It learned to write', '2023 年 3 月，GPT-4 发布：信、贺卡、周报，一句话写完', 'Mar 2023: GPT-4 arrives — letters, cards, reports in one sentence');
  text(24.2, 30.8, '它会画了', 'It learned to draw', '一张 AI 画的“教皇穿羽绒服”，骗过了全网', 'An AI image of the Pope in a puffer jacket fooled the internet');
  text(31.2, 39.4, '它会拍，也会唱', 'It learned to film — and sing', 'Sora 一句话生成一分钟视频，Suno 几秒写出两分钟的歌', 'Sora: a minute of video from one line. Suno: a two-minute song in seconds');
  text(39.8, 45.8, '人人都用得起了', 'Now everyone has one', ['2025 年 1 月，DeepSeek 冲上美国 App Store 第一', '英伟达一天蒸发 5930 亿美元'], ['Jan 2025: DeepSeek tops the US App Store', 'Nvidia loses $593 billion in a single day']);
  text(46.2, 53.6, '它想替你点，App 们反抗了', 'It tried to tap for you. The apps fought back.', ['2025 年 12 月，豆包手机助手上线', '微信、淘宝、支付宝等 App 联手设防'], ['Dec 2025: an AI phone agent launches', 'WeChat, Taobao, Alipay and others block it'], { size: 58 });
  text(54.0, 62.4, '打不过，就加入', "Can't beat it? Join it.", ['2026 年 1 月，淘宝、支付宝、高德等接入千问', '一句话点外卖、订机票，400 多项事它都能办'], ['Jan 2026: Taobao, Alipay, Amap and more plug into Qwen', 'Food, flights and 400+ errands from one sentence']);
  text(62.8, 70.2, '剩下的，一口吞掉', 'And the rest, in one bite', '手机花了 53 年吃进去的东西，AI 不到 4 年就清空了', 'What the phone ate in 53 years, AI emptied in under 4');
  tl.finalize();

  const K = (t, p, l, f = 38, stop) => ({ t, p, l, f, stop });
  const BEAT = { p: [0, 2.35, 7.6], l: [0, 2.0, 1.0] };
  const cam = makeCamPath([
    K(0.0, [0, 1.68, 4.1], [0, 1.62, 1.0]),
    K(2.8, [0, 1.75, 4.6], [0, 1.65, 1.0]),
    K(5.6, BEAT.p, BEAT.l),
    K(15.4, [0.25, 2.35, 7.4], BEAT.l),
    K(24.0, [-0.25, 2.3, 7.5], BEAT.l),
    K(31.0, [0, 2.4, 7.8], BEAT.l),
    K(39.6, [0.3, 2.35, 7.3], BEAT.l),
    K(46.2, [0, 2.3, 7.5], BEAT.l),
    K(47.6, [0, 1.74, 3.5], [0, 0.97, 1.04], 38, true),
    K(53.1, [0, 1.72, 3.6], [0, 0.97, 1.04], 38, true),
    K(54.4, [-0.2, 2.35, 7.4], BEAT.l),
    K(63.0, [0, 2.5, 8.2], BEAT.l),
    K(67.6, [0, 2.45, 7.7], [0, 2.05, 1.1]),
    K(70.6, [0, 2.2, 7.9], [0, 2.0, 1.4]),
    K(72.2, [0, 2.0, 8.0], [0, 1.95, 1.65], 38, true),
    K(82, [0, 2.0, 7.4], [0, 1.95, 1.65]),
  ]);

  const barScale = (t) => {
    const keys = [
      [3.0, 0.02],
      [5.5, 0.85],
      [15.4, 0.9],
      [24.0, 0.95],
      [31.0, 1.0],
      [39.6, 1.03],
      [53.6, 1.07],
      [63.0, 1.1],
      [70.6, 1.1],
      [72.0, 1.0],
    ];
    if (t < keys[0][0]) return 0;
    for (let i = 0; i < keys.length - 1; i++) {
      const [ta, a] = keys[i];
      const [tb, b] = keys[i + 1];
      if (t < tb) return lerp(a, b, (i === 0 ? ease.outBack : ease.inOutCubic)(clamp((t - ta) / (tb - ta))));
    }
    return keys[keys.length - 1][1];
  };

  const tmp = V(0, 0, 0);
  const tmpQ = new THREE.Quaternion();
  const left = (t) => {
    let c = 100;
    for (const e of eats) {
      if (t < e.t) break;
      c -= Math.min(1, (t - e.t) / 0.12);
    }
    return c;
  };
  const dense = phone.layouts.dense;

  function screenState(t) {
    const st = { power: 1 - seg(t, 68.6, 69.6), clock: '07:00', icons: [], empties: [] };
    const emptyA = 1 - seg(t, 67.6, 68.4);
    for (let i = 0; i < 100; i++) {
      const [icon, label] = EP1_ITEMS[i];
      const p = dense.pos(i);
      const e = eatAt.get(i);
      if (e && t >= e.t) {
        if (emptyA > 0) st.empties.push({ x: p.x, y: p.y, size: dense.size, alpha: emptyA * clamp((t - e.t) / 0.2) });
        continue;
      }
      let scale = 1;
      if (e && t > e.t - 0.14) scale = 1 + 0.3 * seg(t, e.t - 0.14, e.t, ease.outQuad);
      const ic = { icon, label, x: p.x, y: p.y, size: dense.size, labelSize: dense.label, scale };
      if (resistSlots.has(i)) {
        const k = [...resistSlots].indexOf(i);
        const up = seg(t, 47.95 + k * 0.1, 48.2 + k * 0.1, ease.outBack);
        const down = seg(t, 55.4 + k * 0.03, 55.7 + k * 0.03);
        ic.block = Math.max(0, up * (1 - down));
        let jig = 0;
        for (const r of [48.3, 49.15, 50.0, 50.85]) if (t > r && t < r + 0.35) jig = Math.sin((t - r) * 70) * (1 - (t - r) / 0.35);
        ic.dx = jig * 18 * ic.block;
      }
      st.icons.push(ic);
    }
    return st;
  }

  function barState(t) {
    let p = null;
    for (const q of PROMPTS) if (t >= q.t0 - 0.0001) p = q;
    const blink = Math.floor(t * 1.9) % 2 === 0;
    if (!p || t > p.end) return { text: '', n: 0, placeholder: '问我任何事……', cursor: blink ? 1 : 0, send: 0, power: 1 };
    const n = Math.floor((t - p.t0) * p.cps);
    const full = [...p.text].length;
    if (p.send && t >= p.send) {
      const s = 1 - clamp((t - p.send) / 0.3);
      return { text: '', n: 0, placeholder: '问我任何事……', cursor: blink ? 1 : 0, send: s, power: 1 };
    }
    return { text: p.text, n: Math.min(full, n), placeholder: '', cursor: n >= full ? (blink ? 1 : 0) : 1, send: 0, power: 1 };
  }

  function bubbleState(t) {
    for (const p of PROMPTS) {
      if (!p.send || t < p.send || t > p.end) continue;
      return { text: p.text, a: clamp((t - p.send) / 0.25) * (1 - clamp((t - (p.end - 0.35)) / 0.3)) };
    }
    return { text: null, a: 0 };
  }

  function update(t, hud, post, opts = {}) {
    const k = cam(t);
    camera.position.set(k.p[0], k.p[1], k.p[2]);
    camera.position.x += noise1(t * 0.35, 1) * 0.035;
    camera.position.y += noise1(t * 0.3, 2) * 0.025;
    camera.fov = k.f;
    camera.updateProjectionMatrix();
    camera.lookAt(k.l[0], k.l[1], k.l[2]);
    camera.updateMatrixWorld(true);

    // 手机：特写 → 起身 → 最后被吸进光标
    const up = seg(t, 2.8, 5.4, ease.inOutCubic);
    phone.group.position.lerpVectors(POSES.FINAL.pos, POSES.BEAT.pos, up);
    phone.group.position.y += Math.sin(Math.PI * up) * 0.12;
    phone.group.rotation.set(lerp(POSES.FINAL.rx, POSES.BEAT.rx, up), Math.sin(Math.PI * up) * 0.2, 0);
    let sh = 0;
    for (const e of eats) {
      if (e.t > t) break;
      if (t - e.t < 0.25) sh += Math.sin((t - e.t) * 200) * (1 - (t - e.t) / 0.25);
    }
    phone.group.position.x += clamp(sh, -1, 1) * 0.006;
    phone.group.scale.setScalar(1);
    phone.group.visible = true;

    // 输入框
    const bs = barScale(t);
    bar.group.visible = bs > 0.001;
    const endMove = seg(t, 70.6, 72.0, ease.inOutCubic);
    bar.group.position.lerpVectors(BAR_HOLD, BAR_END, endMove);
    bar.group.position.y += Math.sin(t * 1.1) * 0.015;
    bar.group.scale.setScalar(Math.max(0.001, bs));
    bar.group.rotation.set(0.04, 0, 0);
    bar.group.updateMatrixWorld(true);
    let red = 0;
    for (const r of [48.3, 49.15, 50.0, 50.85]) if (t > r - 0.05 && t < r + 0.4) red = Math.max(red, 1 - Math.abs(t - r - 0.1) / 0.3);
    let eatGlow = 0;
    for (const e of eats) {
      const d = t - (e.t + e.dur);
      if (d > -0.2 && d < 0.3) eatGlow = Math.max(eatGlow, 1 - Math.abs(d) / 0.3);
    }
    const coll = seg(t, 63.4, 64.2) * (1 - seg(t, 70.4, 71.2));
    bar.setLook(clamp(0.35 + 0.4 * eatGlow + 0.5 * coll), clamp(red));
    bar.draw(barState(t));
    const cur = bar.cursorWorld(V(0, 0, 0));
    barFlash.set(cur, 0.35 * bs, 0.6 * eatGlow + 0.8 * coll);

    // 手机被吃掉
    const pe = seg(t, 68.8, 70.6, ease.inCubic);
    if (pe > 0) {
      const from = POSES.BEAT.pos;
      phone.group.position.lerpVectors(from, cur, pe);
      phone.group.scale.setScalar(Math.max(0.001, 1 - pe));
      phone.group.rotation.set(POSES.BEAT.rx + pe * 1.2, pe * 4, pe * 0.8);
      phone.group.visible = pe < 0.999;
    }
    phone.group.updateMatrixWorld(true);
    eater.burst = { t: 68.9, dur: 1.5, center: phone.screenCenterWorld(V(0, 0, 0)), w: 0.6 * (1 - pe), h: 1.3 * (1 - pe) };

    // 气泡
    const bb = bubbleState(t);
    bubble.set(bb.text, bb.a);
    if (bubble.mesh.visible) {
      bubble.mesh.position.copy(bar.group.position).add(V(0.15, 0.38 + 0.06 * (1 - bb.a), 0.02).multiplyScalar(Math.max(0.6, bs)));
      bubble.mesh.quaternion.copy(camera.quaternion);
      bubble.mesh.scale.setScalar(bs);
    }

    // App 飞出去、碎成 token
    phone.group.getWorldQuaternion(tmpQ);
    eater.update(t, {
      slotWorld: (slot, out) => {
        const p = dense.pos(slot);
        return phone.canvasToWorld(p.x, p.y, out);
      },
      slotSize: phone.canvasSizeToWorld(dense.size) || 0.07,
      cursor: cur,
      camera,
      phoneQuat: tmpQ,
      scale: renderer.domElement.height / 1920,
    });

    phone.draw(screenState(t));
    dust.update(t, renderer.domElement.height / 1920, 0.8);

    // 文字层
    hud.begin(t);
    if (opts.cover) {
      hud.fade({ text: 'AI 进食史', x: 540, y: 330, font: `900 150px ${FONT_CN}`, color: '#ffffff' });
      hud.fade({ text: '手机吃掉了世界，AI 正在吃掉手机', x: 540, y: 450, font: `700 58px ${FONT_CN}`, color: '#ffffff' });
      hud.fade({ text: 'The phone ate the world. Now AI is eating the phone.', x: 540, y: 530, font: `600 36px ${FONT_EN}`, color: '#d9ecff' });
      hud.fade({ text: '2022 — 2026 · 100 → 0', x: 540, y: 1780, font: `700 46px ${FONT_MONO}`, color: '#8fd3ff' });
      hud.fade({ text: '《一部手机，吞掉了多少东西？》续集', x: 540, y: 1845, font: `500 32px ${FONT_CN}`, color: '#9aa4b2' });
      hud.end();
      post.uniforms.uScrim.value = 0.85;
      post.uniforms.uFade.value = 0;
      return;
    }
    for (const c of tl.texts) hud.cue(c);
    const yearA = seg(t, 4.85, 5.0) * (1 - seg(t, 70.2, 70.7));
    hud.odometer({ value: tl.yearAt(t), digits: 4, x: 540, y: 200, font: `300 88px ${FONT_MONO}`, ls: 8, alpha: yearA, glitch: tl.yearRolling(t) ? 0.5 : 0 });
    const cA = seg(t, 0.3, 0.6) * (1 - seg(t, 70.2, 70.7));
    let lastEat = -10;
    for (const e of eats) {
      if (e.t > t) break;
      lastEat = e.t;
    }
    hud.fade({ text: '剩余 · LEFT', x: 1010, y: 160, font: `500 22px ${FONT_CN}`, color: '#8a8a8a', align: 'right', alpha: cA });
    hud.odometer({ value: left(t), digits: 3, x: 1010, y: 224, font: `500 56px ${FONT_MONO}`, align: 'right', alpha: cA, scale: bump(t - lastEat, 0.25, 0.18) });
    const cr = seg(t, 77.6, 78.4) * (1 - seg(t, 81.0, 81.7));
    hud.fade({ text: '这条视频的画面、配乐、字幕，全部由 Claude Opus 5.5 写代码完成。', x: 540, y: 1560, font: `500 30px ${FONT_CN}`, color: '#a9a9a9', alpha: cr });
    hud.fade({ text: 'Every frame, note and subtitle in this video was coded by Claude Opus 5.5.', x: 540, y: 1606, font: `400 24px ${FONT_EN}`, color: '#8a8a8a', alpha: cr });
    hud.end();

    post.uniforms.uScrim.value = 0.6 * (1 - seg(t, 4.6, 5.6)) + 0.4 * seg(t, 47.2, 47.7) * (1 - seg(t, 53.2, 54.0)) + 0.25;
    post.uniforms.uFade.value = seg(t, DURATION - 0.6, DURATION);
  }

  window.__dbg = { phone, bar, scene, camera, tl, eats };
  return { scene, camera, duration: DURATION, update, events: tl.events, grain: (t) => 0.028 * (1 - seg(t, DURATION - 0.6, DURATION)) };
}
