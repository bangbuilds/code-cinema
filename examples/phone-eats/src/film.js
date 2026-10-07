import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { Phone } from './world/phone.js';
import './world/icons2.js';
import * as O from './world/objects.js';
import * as O2 from './world/objects2.js';
import { SwallowBeat, DEFAULT_T } from './world/beat.js';
import { makeDust, Burst, makeGlow, makeFloor } from './world/fx.js';
import { Hook, REW } from './seq/hook.js';
import { Snake } from './seq/snake.js';
import { SlotMerge } from './seq/slots.js';
import { Flood } from './seq/flood.js';
import { Street } from './seq/street.js';
import { phonebook, inkPaper, waitingPerson, Skills } from './seq/dessert.js';
import { Timeline } from './engine/timeline.js';
import { makeCamPath } from './engine/campath.js';
import { FONT_CN, FONT_MONO, FONT_EN, bump } from './engine/hud.js';
import { clamp, lerp, seg, ease, rng, noise1, smoothstep, shake } from './engine/util.js';

// 《一部手机，吞掉了多少东西？》全片 89.5 秒
export const DURATION = 89.5;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const HOLD = V(0, 2.45, 1.15);

const POSES = {
  FLAT: { pos: V(0, 0.0426, 0.9), rx: -Math.PI / 2 },
  BEAT: { pos: V(0, 0.95, 1.0), rx: -0.3 },
  FINAL: { pos: V(0, 1.4, 1.0), rx: -0.04 },
};
const POSE_KEYS = [
  [0, 'FLAT'],
  [4.12, 'FLAT'],
  [5.1, 'BEAT', 1],
  [40.9, 'BEAT'],
  [42.0, 'FLAT', 1],
  [56.2, 'FLAT'],
  [57.3, 'BEAT', 1],
  [72.0, 'BEAT'],
  [73.3, 'FINAL'],
];

function poseAt(t, out) {
  let i = 0;
  while (i < POSE_KEYS.length - 1 && POSE_KEYS[i + 1][0] <= t) i++;
  const [ta, ka] = POSE_KEYS[i];
  const next = POSE_KEYS[i + 1];
  const A = POSES[ka];
  if (!next) {
    out.pos.copy(A.pos);
    out.rx = A.rx;
    out.ry = 0;
    return out;
  }
  const [tb, kb, hop] = next;
  const B = POSES[kb];
  const u = ease.inOutCubic(clamp((t - ta) / (tb - ta)));
  out.pos.lerpVectors(A.pos, B.pos, u);
  const arc = hop ? Math.sin(Math.PI * u) : 0;
  out.pos.y += arc * 0.18;
  out.rx = lerp(A.rx, B.rx, u);
  out.ry = arc * 0.25;
  return out;
}

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
  key.target.position.set(0, 0, -2.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 34 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  const rim = new THREE.DirectionalLight('#cfe0ff', 2.0);
  rim.position.set(4.5, 5, -7);
  const rim2 = new THREE.DirectionalLight('#ffd9b5', 0.5);
  rim2.position.set(-6, 2.5, -5);
  const hemi = new THREE.HemisphereLight('#ffffff', '#101014', 0.12);
  const screenLight = new THREE.RectAreaLight('#eef6ff', 0, 0.69, 1.51);
  scene.add(key, key.target, rim, rim2, hemi, screenLight);

  const floor = makeFloor(16);
  floor.position.set(0, 0, -1.2);
  scene.add(floor);

  const phone = new Phone();
  scene.add(phone.group);
  phone.screenMat.envMap = scene.environment;
  phone.screenMat.envMapIntensity = 0.05;
  phone.screenMat.needsUpdate = true;

  const tl = new Timeline();
  const slotAt = (index, t) => {
    const L = tl.layoutAt(t);
    const A = phone.layouts[L.a];
    const B = phone.layouts[L.b];
    const pa = A.pos(index);
    const pb = B.pos(index);
    return {
      x: lerp(pa.x, pb.x, L.mix),
      y: lerp(pa.y, pb.y, L.mix),
      size: lerp(A.size, B.size, L.mix),
      label: lerp(A.label, B.label, L.mix),
    };
  };
  const ctx = { scene, tl, phone, slotAt };

  const gr = rng(55);
  const graveList = [];
  for (let i = 0; i < 40; i++) {
    const side = i % 2 ? 1 : -1;
    graveList.push(V(side * (1.9 + gr() * 1.9), 0.4 + gr() * 3.0, -3.6 - gr() * 6.5));
  }
  let gi = 0;
  const grave = () => graveList[gi++ % graveList.length];

  // ───────── 开场 ─────────
  const hook = new Hook(scene, ctx);
  tl.year(0, 2026, 0);
  tl.year(REW[0], 1973, REW[1] - REW[0]);
  tl.layout(0, 'beat', 0);

  tl.event(0.35, 'type', { cn: '这一屋子东西，', cps: 13 });
  tl.event(3.0, 'type', { cn: '现在只剩 200 克。', cps: 15 });

  // ───────── 前菜 ─────────
  const beats = [];
  const B = (o) => {
    const b = new SwallowBeat(scene, ctx, { huskTo: grave(), ...o });
    beats.push(b);
    return b;
  };
  const text = (t0, t1, cn, en, sub, subEn, extra = {}) => tl.text({ t0, t1, cn, en, sub, subEn, ...extra });

  const landline = O.landline();
  const SNAP = 6.25;
  B({
    obj: landline,
    t0: 5.0,
    hold: HOLD,
    from: V(-0.3, 2.8, 0.45),
    scale: 0.55,
    icons: [{ icon: 'phone', label: '座机' }],
    scanBelow: 0.95,
    T: { emerge: [0, 0.9], scan: [1.55, 2.4], peel: [2.4, 2.65], fly: [2.65, 3.15], husk: [2.5, 4.0] },
  });
  tl.event(SNAP, 'snap');
  text(5.15, 8.5, '第一口：电话线', 'First bite: the phone cord', '第一通手机电话，是打给竞争对手炫耀的', 'The first mobile call was made to brag to a rival');

  tl.year(8.55, 1987, 0.6);
  B({
    obj: O.brick(),
    t0: 8.55,
    speed: 0.8,
    hold: V(0, 2.42, 1.15),
    from: V(0, 3.05, 1.15),
    enterEase: ease.outBack,
    scale: 0.62,
    rot: new THREE.Euler(0.1, -0.35, 0.12),
    icons: [{ icon: 'signal', label: '大哥大' }],
  });
  text(8.65, 11.55, '大哥大', 'The "Big Brother" brick phone', '广州，2 万块加 6000 入网费：装不进口袋，装得下面子', "¥20,000 + ¥6,000 to connect. Didn't fit a pocket, but fit the ego");

  tl.year(11.6, 1992, 0.6);
  B({
    obj: O2.telegram(),
    t0: 11.6,
    speed: 0.75,
    hold: HOLD,
    scale: 0.85,
    rot: new THREE.Euler(0.25, -0.3, 0.05),
    icons: [{ icon: 'telegram', label: '电报' }],
  });
  text(11.7, 14.35, '电报', 'The telegram', '第一条短信只有两个词：Merry Christmas', 'The first text message was just two words: Merry Christmas');

  tl.year(14.4, 1994, 0.5);
  const five = [
    [O.calculator(), 'calc', '计算器', 0.32],
    [O.calendar(), 'calendar', '日历', 0.34],
    [O.book({ color: '#e1b422', title: '通讯录', icon: 'contacts' }), 'contacts', '通讯录', 0.3],
    [O2.notepad(), 'notes', '记事本', 0.32],
    [O2.fax(), 'fax', '传真机', 0.24],
  ];
  five.forEach(([obj, icon, label, sc], i) =>
    B({
      obj,
      t0: 14.4,
      speed: 0.75,
      hold: V((i - 2) * 0.5, 2.42, 1.15),
      scale: sc,
      rot: new THREE.Euler(0.2, -0.25 + i * 0.12, 0),
      swing: 0.12,
      icons: [{ icon, label }],
      iconSize: 0.3,
      T: { ...DEFAULT_T, fly: [2.75 + i * 0.19, 3.25 + i * 0.19] },
      peelOffset: V(0, 0, 0.25),
      arc: V(0.1 * (i - 2), 0.15, 0.4),
      seed: i,
    }),
  );
  text(14.5, 17.85, '一口吞了五样', 'Five in one bite', '第一部智能手机：计算器、日历、通讯录、记事本、传真机', 'The first smartphone: calculator, calendar, contacts, notepad, fax');

  tl.year(18.0, 1997, 0.5);
  const snake = new Snake(ctx, 18.0);
  text(19.4, 21.9, '从这天起，它学会了吃东西', 'From that day on, it learned to eat', '1997 年，贪吃蛇装进了手机', '1997: Snake arrives on the phone');

  tl.year(22.0, 1998, 0.4);
  B({ obj: O.pager(), t0: 22.0, speed: 0.7, hold: HOLD, scale: 0.95, rot: new THREE.Euler(0.2, -0.4, 0.05), icons: [{ icon: 'pager', label: 'BP机' }] });
  text(22.1, 24.5, 'BP 机', 'The pager', '这一年，中国有 6546 万 BP 机用户，全世界最多', '65.46 million pager users in China that year — the most in the world');

  // ───────── 主菜 ─────────
  tl.year(24.6, 2000, 0.4);
  B({ obj: O.camera(), t0: 24.6, speed: 0.6, hold: HOLD, scale: 0.75, icons: [{ icon: 'camera', label: '相机' }] });
  text(24.7, 26.8, '相机', 'The camera', '11 万像素的拍照手机，没人当回事', 'A 0.11-megapixel camera phone. Nobody took it seriously');

  tl.year(26.9, 2007, 0.5);
  const slots = new SlotMerge(scene, ctx, {
    t0: 26.9,
    hold: V(0, 2.42, 1.15),
    objs: [
      { obj: O2.mp3(), icon: 'music', label: 'MP3', scaleMul: 1.2 },
      { obj: O2.featurePhone(), icon: 'oldphone', label: '功能机', scaleMul: 1.0 },
      { obj: O2.crt(), icon: 'globe', label: '电脑', scaleMul: 0.6 },
    ],
    spacing: 0.95,
    scale: 0.5,
    graves: [grave(), grave(), grave()],
  });
  text(28.3, 30.75, '这不是三台设备，这是一台', 'Not three devices. One.', 'MP3、手机、上网设备，合成了一部手机', 'Music player, phone and internet — merged into one');

  tl.year(30.8, 2008, 0.35);
  const sz = O2.shanzhai();
  B({
    obj: sz,
    t0: 30.8,
    hold: V(0, 2.38, 1.15),
    scale: 0.62,
    rot: new THREE.Euler(0.12, -0.25, 0),
    swing: 0.1,
    icons: [
      { icon: 'radio', label: '收音机' },
      { icon: 'flashlight', label: '手电筒' },
      { icon: 'uv', label: '验钞机' },
      { icon: 'speaker', label: '音响' },
    ],
    stagger: 0.12,
    T: { emerge: [0, 0.35], scan: [1.35, 1.8], peel: [1.8, 1.95], fly: [1.95, 2.3], husk: [1.9, 3.2] },
    onUpdate: (t, lt) => {
      const P = sz.parts;
      P.ant[1].position.y = 0.38 * ease.outBack(seg(lt, 0.4, 0.58));
      P.ant[2].position.y = P.ant[1].position.y + 0.36 * ease.outBack(seg(lt, 0.52, 0.72));
      P.speakers.forEach((s, i) => s.scale.setScalar(Math.max(0.001, ease.outBack(seg(lt, 0.62 + i * 0.05, 0.8 + i * 0.05)))));
      P.uv.material.emissiveIntensity = seg(lt, 1.0, 1.06) * (2.6 + Math.sin(t * 60) * 0.4);
      P.led.material.emissiveIntensity = seg(lt, 1.18, 1.22) * 7;
    },
  });
  [0.4, 0.62, 1.0, 1.18].forEach((d) => tl.event(30.8 + d, 'gadget'));
  text(30.9, 33.6, '山寨机：能吞的全吞了', 'Shanzhai phones swallowed everything', '收音机、手电筒、验钞灯、八个喇叭', 'Radio, flashlight, counterfeit-note UV lamp, eight speakers');

  tl.layout(33.75, 'mid', 0.6);
  const flood = new Flood(scene, ctx, {
    t0: 33.7,
    first: 34.25,
    gap: 0.19,
    list: [
      { make: () => O.alarm({ color: '#2f8f9d' }), icon: 'clock', label: '闹钟' },
      { make: () => O.watch(), icon: 'watch', label: '手表' },
      { make: () => O2.stopwatch(), icon: 'stopwatch', label: '秒表' },
      { make: () => O2.recorder(), icon: 'mic', label: '录音机' },
      { make: () => O2.handMirror(), icon: 'mirror', label: '镜子' },
      { make: () => O2.magnifier(), icon: 'magnifier', label: '放大镜' },
      { make: () => O2.level(), icon: 'level', label: '水平仪' },
      { make: () => O.book({ color: '#1e4fa0', title: '英汉词典', icon: 'edict' }), icon: 'edict', label: '词典' },
    ],
  });
  text(33.8, 35.8, '从此，它什么都能吃', 'From then on, it could eat anything', 'App Store 开张那天，只有 500 个 App', 'The App Store opened with just 500 apps');

  tl.year(35.9, 2009, 0.35);
  const nav3 = [
    [O.foldmap(), 'map', '地图', 0.6],
    [O2.navigator(), 'nav', '导航仪', 0.6],
    [O.compass(), 'compass', '指南针', 0.75],
  ];
  nav3.forEach(([obj, icon, label, sc], i) =>
    B({
      obj,
      t0: 35.9,
      speed: 0.5,
      hold: V((i - 1) * 0.85, 2.42, 1.15),
      scale: sc,
      rot: new THREE.Euler(0.25, -0.3 + i * 0.3, 0),
      swing: 0.1,
      icons: [{ icon, label }],
      iconSize: 0.34,
      T: { ...DEFAULT_T, fly: [2.75 + i * 0.2, 3.25 + i * 0.2] },
      seed: i + 3,
    }),
  );
  text(36.0, 38.1, '导航', 'Navigation', '谷歌宣布导航免费，导航仪巨头 Garmin 当天跌了 17%', "Google made navigation free. Garmin's stock fell 17% that day");

  tl.year(38.2, 2012, 0.4);
  const film = O2.filmRoll();
  B({
    obj: film,
    t0: 38.2,
    hold: V(-0.25, 2.42, 1.15),
    scale: 0.55,
    rot: new THREE.Euler(0.15, -0.2, 0.1),
    swing: 0.08,
    icons: [
      { icon: 'film', label: '胶卷' },
      { icon: 'photos', label: '相册' },
    ],
    stagger: 0.12,
    T: { emerge: [0, 0.4], scan: [1.2, 1.65], peel: [1.65, 1.8], fly: [1.8, 2.15], husk: [1.75, 3.0] },
    onUpdate: (t, lt) => {
      film.parts.strip.scale.x = 0.15 + 0.85 * ease.outCubic(seg(lt, 0.15, 0.85));
      film.parts.stripMat.emissiveIntensity = 0.62 * seg(lt, 0.7, 1.1);
    },
  });
  tl.event(38.9, 'expose');
  text(38.3, 40.8, '胶卷', 'Film', '柯达破产。可数码相机，正是它自己发明的', 'Kodak went bankrupt — though it invented the digital camera');

  // ───────── 硬菜：整条街 ─────────
  tl.layout(41.0, 'dense', 0.8);
  const streetBeats = [
    { t: 42.3, year: 2011, make: () => O2.nameCard(), size: 0.9, icons: [{ icon: 'qr', label: '名片' }, { icon: 'greeting', label: '贺卡' }], cn: '名片', en: 'Business cards', sub: '加个微信吧', subEn: '"Just add me on WeChat"' },
    { t: 43.2, year: 2014, make: () => O.hongbao(), size: 0.9, icons: [{ icon: 'redpacket', label: '红包' }], cn: '红包', en: 'Red envelopes', sub: '马云叫它“珍珠港偷袭”', subEn: "Jack Ma called it a 'Pearl Harbor attack'" },
    { t: 44.1, year: 2014, make: () => O2.taxi(), size: 1.3, icons: [{ icon: 'taxi', label: '打车' }], cn: '打车', en: 'Hailing a cab', sub: '路边招手，变成屏幕上的一个小车', subEn: 'A wave at the curb became a tiny car on a screen' },
    { t: 45.0, year: 2016, make: () => O2.cashStack(), size: 1.0, banner: true, icons: [{ icon: 'wallet', label: '钱包' }, { icon: 'cash', label: '现金' }, { icon: 'coins', label: '零钱' }], cn: '钱包', en: 'Wallets', sub: '连乞讨都挂上了二维码', subEn: 'Even beggars put up QR codes' },
    { t: 45.9, year: 2016, make: () => O.tv(), size: 1.2, icons: [{ icon: 'tv', label: '电视' }, { icon: 'remote', label: '遥控器' }], cn: '电视', en: 'TV', sub: '你家电视，多久没开了？', subEn: 'When did you last turn on your TV?' },
    { t: 46.8, year: 2017, building: 'studio', icons: [{ icon: 'studio', label: '照相馆' }], cn: '照相馆', en: 'Photo studios' },
    { t: 47.7, year: 2018, building: 'kiosk', icons: [{ icon: 'kiosk', label: '报刊亭' }, { icon: 'news', label: '报纸' }, { icon: 'magazine', label: '杂志' }], cn: '报刊亭', en: 'Newsstands' },
    { t: 48.6, year: 2019, building: 'avshop', icons: [{ icon: 'avshop', label: '音像店' }, { icon: 'tape', label: '磁带' }, { icon: 'disc', label: 'CD' }, { icon: 'vhs', label: '录像带' }], cn: '音像店', en: 'Music & video stores' },
    { t: 49.5, year: 2020, make: () => O.keys(), size: 0.9, icons: [{ icon: 'key', label: '钥匙' }, { icon: 'doorcard', label: '门禁卡' }, { icon: 'buscard', label: '公交卡' }], cn: '钥匙', en: 'Keys', sub: '出门只带一部手机', subEn: 'Leave home with nothing but a phone' },
    { t: 50.4, year: 2021, make: () => O2.menuBook(), size: 0.9, icons: [{ icon: 'menu', label: '菜单' }], cn: '菜单', en: 'Menus', sub: '服务员，菜单呢？——扫桌上的码', subEn: '"Menu, please?" — "Scan the code on the table"' },
    { t: 51.3, year: 2022, building: 'bank', icons: [{ icon: 'bank', label: '银行网点' }, { icon: 'passbook', label: '存折' }, { icon: 'cardx', label: '银行卡' }], cn: '银行网点', en: 'Bank branches' },
    { t: 52.2, year: 2025, make: () => O.ticket(), size: 1.0, icons: [{ icon: 'train', label: '火车票' }, { icon: 'plane', label: '机票' }, { icon: 'movie', label: '电影票' }], cn: '火车票', en: 'Train tickets', sub: '2025 年 9 月 30 日，纸质报销凭证停发', subEn: 'Sept 30, 2025: the last paper train receipts' },
  ];
  const burstIcons = [
    ['booth', '电话亭'], ['post', '邮局'], ['netcafe', '网吧'], ['window', '售票窗口'], ['bookstore', '书店'], ['arcade', '游戏厅'],
    ['travel', '旅行社'], ['match', '婚介所'], ['ktv', 'KTV'], ['repeat', '复读机'], ['metro', '地铁票'], ['coupon', '优惠券'],
    ['flyer', '传单'], ['yellow', '黄页'], ['letter', '信'], ['stamp', '邮票'], ['postcard', '明信片'], ['piggy', '存钱罐'],
    ['steps', '计步器'], ['weather', '天气预报'], ['cashier', '收银台'], ['pos', 'POS 机'], ['guide', '导游图'], ['scanner', '扫描仪'],
    ['copyshop', '复印店'], ['thermo', '体温计'], ['ruler', '卷尺'], ['metronome', '节拍器'], ['scale', '秤'], ['calc2', '算盘'],
    ['receipt', '发票'], ['lottery', '彩票'], ['bill', '缴费单'], ['edict2', '电子词典'],
  ].map(([icon, label]) => ({ icon, label }));
  const street = new Street(scene, ctx, { on: [40.9, 57.0], burst: [53.2, 56.2], beats: streetBeats, burstIcons });
  let lastYear = 2012;
  for (const b of streetBeats) {
    if (b.year !== lastYear) tl.year(b.t - 0.6, b.year, 0.3);
    lastYear = b.year;
    text(b.t - 0.62, b.t + 0.26, b.cn, b.en, b.sub, b.subEn, { style: 'flash' });
  }
  text(53.3, 56.3, '整条街', 'The whole street', '电话亭、邮局、网吧、售票窗口、游戏厅……', 'Phone booths, post offices, internet cafés, ticket windows, arcades…', { cps: 24 });

  // ───────── 甜点：看不见的东西 ─────────
  const pb = phonebook();
  B({
    obj: pb,
    t0: 57.2,
    speed: 0.95,
    hold: V(0, 2.42, 1.2),
    scale: 0.95,
    rot: new THREE.Euler(0.15, 0, 0),
    swing: 0.08,
    icons: [{ icon: 'numbers', label: '背号码' }],
    T: { emerge: [0, 0.8], scan: [2.3, 3.0], peel: [3.0, 3.2], fly: [3.2, 3.65], husk: [3.1, 4.6] },
    onUpdate: (t, lt) => pb.parts.draw(seg(lt, 0.9, 2.3)),
  });
  text(57.4, 61.0, '你还背得出几个人的电话号码？', 'How many phone numbers do you still know by heart?', null, null, { size: 58 });

  const ip = inkPaper();
  B({
    obj: ip,
    t0: 61.0,
    speed: 0.9,
    hold: V(0, 2.42, 1.2),
    scale: 1.0,
    rot: new THREE.Euler(0.12, -0.15, 0),
    swing: 0.06,
    icons: [{ icon: 'pen', label: '手写' }],
    T: { emerge: [0, 0.7], scan: [2.1, 2.8], peel: [2.8, 3.0], fly: [3.0, 3.45], husk: [2.9, 4.3] },
    onUpdate: (t, lt) => (ip.parts.U.uP.value = seg(lt, 0.9, 2.0, ease.inOutSine)),
  });
  text(61.2, 64.4, '提笔忘字', 'Forgetting how to write', '“尴尬”两个字，你还会写吗？', 'Can you still write 尴尬 ("awkward") by hand?');

  const stop = O2.busStop();
  const person = waitingPerson(stop.kit);
  person.group.position.set(-0.15, 0, 0.05);
  stop.inner.add(person.group);
  const P = person.parts;
  B({
    obj: stop,
    t0: 64.4,
    hold: V(0, 2.3, 1.1),
    scale: 0.62,
    rot: new THREE.Euler(0.12, -0.35, 0),
    swing: 0.05,
    icons: [
      { icon: 'boring', label: '无聊' },
      { icon: 'bulb', label: '念头' },
    ],
    stagger: 0.15,
    T: { emerge: [0, 0.8], scan: [2.5, 3.2], peel: [3.2, 3.4], fly: [3.4, 3.85], husk: [3.3, 4.6] },
    onUpdate: (t, lt) => {
      const down = seg(lt, 1.2, 2.0, ease.inOutCubic);
      P.neck.rotation.x = lerp(-0.6, 0.55, down);
      P.armR.rotation.x = lerp(0, -0.9, down);
      P.armL.rotation.x = lerp(0, -0.9, down);
      P.phone.position.set(0, lerp(0.62, 0.8, down), lerp(0.28, 0.36, down));
      P.phone.rotation.x = lerp(-1.2, -0.5, down);
      P.glowMat.emissiveIntensity = 2.6 * seg(lt, 1.1, 1.5);
    },
  });
  text(64.6, 68.4, '它吞掉了无聊', 'It ate boredom', '也吞掉了无聊时才会冒出来的念头', "and the ideas that only come when you're bored");
  // 头顶冒出来的"念头"，最后被吸进手里的手机
  const thoughtGeo = new THREE.BufferGeometry();
  thoughtGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
  const thoughts = new THREE.Points(
    thoughtGeo,
    new THREE.PointsMaterial({ color: new THREE.Color(2.2, 2.0, 1.4), size: 0.06, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  thoughts.frustumCulled = false;
  scene.add(thoughts);

  tl.year(68.4, 2026, 0.6);
  const skills = new Skills(scene, ctx, {
    t0: 68.4,
    center: V(0, 2.42, 1.2),
    first: 69.9,
    gap: 0.42,
    words: [
      { cn: '翻译', en: 'Translate', icon: 'translate', label: '翻译' },
      { cn: '写作', en: 'Write', icon: 'write', label: '写作' },
      { cn: '画画', en: 'Draw', icon: 'palette', label: '画画' },
      { cn: '编程', en: 'Code', icon: 'code', label: '编程' },
    ],
  });
  text(68.6, 72.0, '现在，它开始吃“本事”', "Now it's eating skills", '翻译、写作、画画、编程', 'Translating, writing, drawing, coding');

  // ───────── 最后一道：你 ─────────
  text(76.8, 79.9, '还剩最后一格。', 'One slot left.', null, null);
  tl.event(80.7, 'black');
  tl.event(83.8, 'final');
  tl.finalize();

  // 最后一格的世界坐标（镜头最后推进去的地方）
  const tmpPose = { pos: V(0, 0, 0), rx: 0, ry: 0 };
  poseAt(80, tmpPose);
  phone.group.position.copy(tmpPose.pos);
  phone.group.rotation.set(tmpPose.rx, 0, 0);
  phone.group.updateMatrixWorld(true);
  const lastSlot = phone.layouts.dense.pos(100);
  const slotW = phone.canvasToWorld(lastSlot.x, lastSlot.y, V(0, 0, 0));
  const nrm = phone.screenNormalWorld(V(0, 0, 0));

  const BEAT_C = { p: [0, 2.35, 7.6], l: [0, 2.0, 1.0] };
  const K = (t, p, l, f = 38, stop) => ({ t, p, l, f, stop });
  const snakeCam = { p: [0, 1.615, 3.15], l: [0, 0.962, 1.038] };
  const cam = makeCamPath([
    K(0.0, [0, 3.75, 7.7], [0, 0.45, -1.2]),
    K(1.8, [0, 3.55, 7.1], [0, 0.38, -0.95]),
    K(3.0, [0, 3.7, 4.05], [0, 0.02, 0.75]),
    K(3.95, [0, 3.05, 3.35], [0, 0.04, 0.95]),
    K(5.15, BEAT_C.p, BEAT_C.l),
    K(8.5, [0.3, 2.35, 7.4], BEAT_C.l),
    K(11.5, [-0.3, 2.3, 7.5], BEAT_C.l),
    K(14.3, [0, 2.45, 8.3], [0, 2.0, 1.0]),
    K(17.7, [0, 2.45, 8.2], [0, 2.0, 1.0]),
    K(18.75, snakeCam.p, snakeCam.l, 38, true),
    K(21.0, snakeCam.p, snakeCam.l, 38, true),
    K(21.9, BEAT_C.p, BEAT_C.l),
    K(24.5, [0.25, 2.3, 7.3], BEAT_C.l),
    K(26.8, [0, 2.4, 8.3], [0, 2.0, 1.0]),
    K(30.6, [0, 2.4, 8.4], [0, 2.0, 1.0]),
    K(31.4, [-0.2, 2.3, 7.2], [0, 2.0, 1.0]),
    K(33.6, [0, 2.4, 7.4], [0, 1.95, 1.0]),
    K(34.4, [0, 2.6, 8.6], [0, 1.85, 1.0]),
    K(35.8, [0, 2.5, 8.4], [0, 1.95, 1.0]),
    K(38.2, [0.2, 2.35, 7.6], BEAT_C.l),
    K(40.8, [0, 2.4, 7.7], BEAT_C.l),
    K(42.2, [0, 5.8, 8.6], [0, 0.2, -3.0]),
    K(47.5, [0.5, 5.6, 8.0], [0, 0.2, -3.0]),
    K(52.7, [-0.3, 5.5, 7.7], [0, 0.15, -2.8]),
    K(53.7, [0, 8.6, 9.6], [0, 0.0, -3.2]),
    K(54.8, [0, 6.6, 7.4], [0, 0.05, -0.6]),
    K(55.9, [0, 3.8, 4.3], [0, 0.05, 0.9]),
    K(56.6, [0, 3.4, 4.6], [0, 0.4, 0.9]),
    K(57.6, BEAT_C.p, BEAT_C.l),
    K(61.0, [0.25, 2.3, 7.2], BEAT_C.l),
    K(64.4, [-0.2, 2.25, 7.0], [0, 1.9, 1.0]),
    K(68.4, [0, 2.35, 7.4], BEAT_C.l),
    K(72.0, [0, 2.3, 7.6], [0, 1.9, 1.0]),
    K(73.6, [0, 1.6, 6.3], [0, 1.43, 1.0]),
    K(79.3, [0, 1.68, 4.1], [0, 1.62, 1.0]),
    K(81.3, [slotW.x + nrm.x * 0.12, slotW.y + nrm.y * 0.12, slotW.z + nrm.z * 0.12], [slotW.x, slotW.y, slotW.z]),
    K(89.5, [slotW.x + nrm.x * 0.1, slotW.y + nrm.y * 0.1, slotW.z + nrm.z * 0.1], [slotW.x, slotW.y, slotW.z]),
  ]);

  const dust = makeDust();
  const spark = new Burst(150, 4, '#fff1d6');
  const snapFlash = makeGlow('#ffe2b8');
  const screenFlash = makeGlow('#cfe8ff');
  scene.add(dust.points, spark.points, snapFlash, screenFlash);

  const pose = { pos: V(0, 0, 0), rx: 0, ry: 0 };
  const tmpV = V(0, 0, 0);
  const tmpV2 = V(0, 0, 0);
  const preStreet = beats.filter((b) => b.t0 < 40);

  function screenState(t) {
    if (snake.active(t)) return { power: 1, snake: snake.state(t) };
    const st = { power: 1, clock: '07:00', lock: 1 - seg(t, 1.7, 2.1), icons: [], empties: [] };
    const mix = seg(t, 4.88, 5.15);
    if (t < 5.15) for (const ic of hook.screenIcons(t, phone)) st.icons.push({ ...ic, alpha: 1 - mix });
    if (t >= 4.88) {
      const a = t < 5.15 ? mix : 1;
      let n = 0;
      for (const it of tl.items) {
        if (it.t > t) break;
        n++;
        const p = slotAt(it.index, t);
        const dt = t - it.t;
        st.icons.push({
          icon: it.icon,
          label: it.label,
          x: p.x,
          y: p.y,
          size: p.size,
          labelSize: p.label,
          scale: bump(dt, 0.3, 0.18),
          flash: dt < 0.45 ? 1 - dt / 0.45 : 0,
          alpha: a,
        });
      }
      const L = tl.layoutAt(t);
      const name = L.mix < 0.5 ? L.a : L.b;
      const lay = phone.layouts[name];
      const la = L.a === L.b ? 1 : Math.abs(L.mix - 0.5) * 2;
      if (name !== 'dense') {
        for (let i = n; i < lay.n; i++) {
          const p = lay.pos(i);
          st.empties.push({ x: p.x, y: p.y, size: lay.size, alpha: a * la });
        }
      } else if (t > 71.3) {
        const p = lay.pos(100);
        st.empties.push({ x: p.x, y: p.y, size: lay.size, alpha: seg(t, 71.3, 72.2) * (1 + 0.5 * Math.sin(t * 5)) });
      }
    }
    for (const b of beats) {
      const sp = b.scanProgress(t);
      if (sp >= 0) st.scan = { amount: Math.sin(Math.PI * sp), pos: sp };
    }
    const wallet = streetBeats.find((b) => b.banner);
    const wb = seg(t, wallet.t - 0.1, wallet.t + 0.15) * (1 - seg(t, wallet.t + 0.75, wallet.t + 0.95));
    if (wb > 0) st.banner = { alpha: wb, icon: 'cash', title: '收款到账 100 元', text: '刚刚 · 扫码收款' };
    st.glow = floodGlow * 0.5;
    return st;
  }

  let floodGlow = 0;

  function update(t, hud, post, opts = {}) {
    // ── 镜头
    const k = cam(t);
    camera.position.set(k.p[0], k.p[1], k.p[2]);
    const calm = t > 79 ? 0.15 : 1;
    camera.position.x += noise1(t * 0.35, 1) * 0.04 * calm;
    camera.position.y += noise1(t * 0.3, 2) * 0.03 * calm;
    camera.fov = k.f;
    camera.updateProjectionMatrix();
    camera.lookAt(k.l[0], k.l[1], k.l[2]);
    camera.updateMatrixWorld(true);

    // ── 手机姿态 + 每吞一样抖一下
    poseAt(t, pose);
    phone.group.position.copy(pose.pos);
    phone.group.rotation.set(pose.rx, pose.ry, 0);
    let sh = 0;
    for (const it of tl.items) {
      if (it.t > t) break;
      if (t - it.t < 0.3) sh += shake(t - it.t, 34, 0.3);
    }
    sh = clamp(sh, -1.2, 1.2);
    phone.group.position.x += sh * 0.01;
    phone.group.rotation.z = sh * 0.018;
    phone.group.updateMatrixWorld(true);

    // ── 地面（开场）
    const floorA = 1 - seg(t, 4.2, 4.9);
    floor.visible = floorA > 0.001;
    floor.material.opacity = floorA;

    // ── 各段
    let flash = hook.update(t);
    for (const b of beats) b.update(t, camera);
    const hv = clamp(1 - seg(t, 40.9, 41.4) + seg(t, 56.9, 57.7));
    for (const b of preStreet) {
      if (t > b.t0 + 3) {
        b.obj.drain.uBright.value *= hv;
        b.obj.group.visible = b.obj.group.visible && hv > 0.01;
      }
    }
    slots.update(t, camera);
    for (const p of slots.parts) {
      if (t > 30) {
        p.obj.drain.uBright.value *= hv;
        p.obj.group.visible = p.obj.group.visible && hv > 0.01;
      }
    }
    floodGlow = flood.update(t);
    flash += street.update(t);
    skills.update(t, camera);

    // 电话线断开
    const Pp = landline.parts;
    const dt = t - SNAP;
    if (dt < 0) {
      Pp.far.position.copy(Pp.snapLocal);
      Pp.far.rotation.set(0, 0, 0);
      Pp.far.visible = true;
    } else {
      Pp.far.position.copy(Pp.snapLocal).add(tmpV2.set(-0.5 * dt, -3.2 * dt * dt, 0.3 * dt));
      Pp.far.rotation.set(0.6 * dt, 0, -1.1 * dt);
      Pp.far.visible = dt < 1.4;
    }
    landline.inner.updateMatrixWorld(true);
    const sp = landline.inner.localToWorld(tmpV2.copy(Pp.snapLocal));
    spark.set(sp, dt, renderer.domElement.height / 1920, 0.8);
    snapFlash.set(sp, 0.9, dt >= 0 && dt < 0.3 ? 2.2 * Math.pow(1 - dt / 0.3, 2) : 0);

    // 念头粒子
    const tl0 = t - 64.4;
    thoughts.visible = tl0 > 0.3 && tl0 < 2.6;
    if (thoughts.visible) {
      stop.inner.updateMatrixWorld(true);
      const head = P.neck.getWorldPosition(tmpV).clone();
      const ph = P.phone.getWorldPosition(V(0, 0, 0));
      const pos = thoughtGeo.attributes.position;
      const suck = seg(tl0, 1.85, 2.5, ease.inCubic);
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4 + tl0 * 0.8;
        const rise = ((tl0 * 0.18 + i * 0.07) % 0.6) + 0.08;
        const x = head.x + Math.cos(a) * 0.12 * (1 + rise);
        const y = head.y + 0.12 + rise;
        const z = head.z + Math.sin(a) * 0.12;
        pos.setXYZ(i, lerp(x, ph.x, suck), lerp(y, ph.y, suck), lerp(z, ph.z, suck));
      }
      pos.needsUpdate = true;
      thoughts.material.opacity = seg(tl0, 0.3, 0.7) * (1 - seg(tl0, 2.4, 2.6));
    }

    // ── 屏幕光、屏幕内容
    phone.screenCenterWorld(tmpV);
    screenFlash.set(tmpV, 0.45 + Math.min(flash, 3) * 0.1, Math.min(flash, 2.5) * 0.22);
    screenLight.position.copy(tmpV);
    const flat = t < 4.5 || (t > 41.5 && t < 56.6);
    if (flat) {
      screenLight.lookAt(tmpV.x, tmpV.y + 5, tmpV.z - 0.001);
      screenLight.intensity = 1.0 + Math.min(flash, 3) * 1.2;
    } else {
      screenLight.lookAt(tmpV.x, tmpV.y + 1.6, tmpV.z + 0.3);
      let s = -1;
      for (const b of beats) s = Math.max(s, b.scanProgress(t));
      screenLight.intensity = 0.3 + (s >= 0 ? 0.8 * Math.sin(Math.PI * s) : 0);
    }
    phone.draw(screenState(t));
    dust.update(t, renderer.domElement.height / 1920, (0.6 + 0.4 * seg(t, 4.3, 5.2)) * (1 - seg(t, 80.4, 81.2)));

    // ── 文字层
    hud.begin(t);
    if (opts.cover) {
      hud.fade({ text: '一部手机，', x: 540, y: 300, font: `900 118px ${FONT_CN}`, color: '#ffffff' });
      hud.fade({ text: '吞掉了多少东西？', x: 540, y: 450, font: `900 118px ${FONT_CN}`, color: '#ffffff' });
      hud.fade({ text: 'How much has one phone swallowed?', x: 540, y: 540, font: `600 44px ${FONT_EN}`, color: '#d9ecff' });
      hud.fade({ text: '1973 — 2026 · 100 样东西', x: 540, y: 1780, font: `700 44px ${FONT_CN}`, color: '#8fd3ff' });
      hud.fade({ text: 'A HISTORY OF WHAT IT ATE', x: 540, y: 1840, font: `500 30px ${FONT_EN}`, color: '#9aa4b2', ls: 4 });
      hud.end();
      post.uniforms.uScrim.value = 0.85;
      post.uniforms.uFade.value = 0;
      return;
    }
    hud.cue({ t0: 0.35, t1: 4.2, cn: '这一屋子东西，', en: 'A whole room of stuff,', y: 290, cps: 13 });
    hud.cue({
      t0: 3.0,
      t1: 4.23,
      cn: '现在只剩 200 克。',
      en: 'now weighs just 200 grams.',
      y: 410,
      cps: 15,
      highlight: { from: 5, to: 10, color: '#8fd3ff' },
      highlightEn: { from: 16, to: 25, color: '#8fd3ff' },
    });
    for (const c of tl.texts) hud.cue(c);

    const yearA = seg(t, 3.98, 4.12) * (1 - seg(t, 56.3, 56.6)) + seg(t, 68.3, 68.6) * (1 - seg(t, 72.0, 72.4));
    hud.odometer({
      value: tl.yearAt(t),
      digits: 4,
      x: 540,
      y: 200,
      font: `300 88px ${FONT_MONO}`,
      ls: 8,
      alpha: yearA,
      glitch: tl.yearRolling(t) ? 0.5 : 0,
    });
    const stA = seg(t, 56.6, 57.0) * (1 - seg(t, 68.0, 68.3));
    if (stA > 0) {
      const mins = Math.floor(lerp(192, 466, seg(t, 56.8, 68.2, ease.inQuad)));
      const hh = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
      hud.fade({ text: '今日屏幕使用时间 · SCREEN TIME TODAY', x: 540, y: 118, font: `500 24px ${FONT_CN}`, color: '#8a8a8a', alpha: stA });
      hud.fade({ text: hh, x: 540, y: 200, font: `300 88px ${FONT_MONO}`, color: '#eeeeee', alpha: stA, ls: 6 });
    }
    const cA = seg(t, 1.75, 2.0) * (1 - seg(t, 80.4, 80.9));
    const cv = t < 4.95 ? hook.counter(t) : tl.count(t);
    let lastLand = -10;
    for (const it of tl.items) {
      if (it.t > t) break;
      lastLand = it.t;
    }
    hud.fade({ text: '已吞 · EATEN', x: 1010, y: 160, font: `500 22px ${FONT_CN}`, color: '#8a8a8a', align: 'right', alpha: cA });
    hud.odometer({ value: cv, digits: 3, x: 1010, y: 224, font: `500 56px ${FONT_MONO}`, align: 'right', alpha: cA, scale: bump(t - lastLand, 0.3, 0.22) });
    const fA = seg(t, 83.8, 84.7) * (1 - seg(t, 87.3, 88.2));
    hud.fade({ text: '第 101 件。', x: 540, y: 955, font: `700 62px ${FONT_CN}`, color: '#8c8c8c', alpha: fA });
    hud.fade({ text: 'Item No. 101.', x: 540, y: 1015, font: `500 30px ${FONT_EN}`, color: '#6f6f6f', alpha: fA * 0.95 });
    const sA = seg(t, 85.0, 85.8) * (1 - seg(t, 88.6, 89.3));
    hud.fade({ text: 'by bangbuilds', x: 540, y: 1500, font: `500 34px ${FONT_EN}`, color: '#7d7d7d', alpha: sA });
    hud.end();

    // ── 后期
    const scrim =
      0.75 * (1 - seg(t, 4.0, 4.9)) +
      0.55 * seg(t, 18.4, 18.8) * (1 - seg(t, 21.2, 21.7)) +
      0.5 * seg(t, 41.2, 42.0) * (1 - seg(t, 56.2, 57.0)) +
      0.5 * seg(t, 76.4, 77.0) +
      0.2;
    post.uniforms.uScrim.value = Math.min(0.8, scrim);
    post.uniforms.uFade.value = seg(t, 80.7, 81.3);
  }

  window.__dbg = { phone, scene, camera, tl, beats };
  return {
    scene,
    camera,
    duration: DURATION,
    update,
    events: tl.events,
    grain: (t) => 0.028 * (1 - seg(t, 80.7, 81.3)),
  };
}
