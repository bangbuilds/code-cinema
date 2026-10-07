import * as THREE from 'three';
import { rng } from '../engine/util.js';

// 特效：背景微尘、火花、光晕、扫描光圈

export function makeDust(count = 1800, seed = 9) {
  const r = rng(seed);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * 34;
    pos[i * 3 + 1] = (r() - 0.35) * 26;
    pos[i * 3 + 2] = -r() * 36 + 6;
    size[i] = 0.6 + Math.pow(r(), 3) * 2.6;
    phase[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase;
      uniform float uTime, uScale; varying float vA;
      void main(){
        vec3 p = position;
        p.y += uTime * (0.04 + aPhase * 0.05);
        p.x += sin(uTime * 0.21 + aPhase * 6.283) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale * 9.0 / max(0.5, -mv.z);
        vA = 0.25 + 0.75 * (0.5 + 0.5 * sin(uTime * 1.3 + aPhase * 40.0));
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * uOpacity * 0.55;
        gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return {
    points,
    update(t, scale, opacity = 1) {
      m.uniforms.uTime.value = t;
      m.uniforms.uScale.value = scale;
      m.uniforms.uOpacity.value = opacity;
    },
  };
}

export class Burst {
  constructor(count = 80, seed = 3, color = '#ffd6a0') {
    const r = rng(seed);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      const sp = 0.6 + r() * 2.2;
      vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
      vel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp * 0.9 + 0.3;
      vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      life[i] = 0.25 + r() * 0.6;
      size[i] = 1 + r() * 2.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    g.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uOrigin: { value: new THREE.Vector3() },
        uDt: { value: 0 },
        uScale: { value: 1 },
        uSpread: { value: 1 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aVel; attribute float aLife; attribute float aSize;
        uniform vec3 uOrigin; uniform float uDt, uScale, uSpread; varying float vA;
        void main(){
          float t = uDt;
          vec3 p = uOrigin + aVel * uSpread * t * (1.0 - 0.45 * t) + vec3(0.0, -1.4 * t * t, 0.0);
          vA = clamp(1.0 - t / aLife, 0.0, 1.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale * 13.0 * (0.35 + 0.65 * vA) / max(0.3, -mv.z);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA;
          gl_FragColor = vec4(uColor * (1.6 + 2.4 * vA) * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }
  set(origin, dt, scale, spread = 1) {
    this.points.visible = dt >= 0 && dt < 1.0;
    if (!this.points.visible) return;
    this.mat.uniforms.uOrigin.value.copy(origin);
    this.mat.uniforms.uDt.value = dt;
    this.mat.uniforms.uScale.value = scale;
    this.mat.uniforms.uSpread.value = spread;
  }
}

let glowTex = null;
function radialTex() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 256);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}

export function makeGlow(color = '#cfe8ff') {
  const m = new THREE.SpriteMaterial({
    map: radialTex(),
    color,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
  });
  const s = new THREE.Sprite(m);
  s.renderOrder = 10;
  s.visible = false;
  s.userData.base = new THREE.Color(color);
  s.set = (pos, scale, intensity) => {
    s.visible = intensity > 0.002;
    if (!s.visible) return;
    s.position.copy(pos);
    s.scale.setScalar(scale);
    m.color.copy(s.userData.base).multiplyScalar(intensity);
  };
  return s;
}

// 扫描光圈：水平的一片光，带亮边
export function makeScanRing() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 }, uColor: { value: new THREE.Color('#bfe3ff') } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uI; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float rim = exp(-pow((r - 0.94) / 0.035, 2.0));
        float fill = 0.07 * (1.0 - r);
        float a = (rim * 0.9 + fill) * smoothstep(1.0, 0.98, r) * uI;
        gl_FragColor = vec4(uColor * a * 2.2, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 96), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.renderOrder = 5;
  mesh.set = (pos, radius, intensity) => {
    mesh.visible = intensity > 0.002;
    if (!mesh.visible) return;
    mesh.position.copy(pos);
    mesh.scale.setScalar(radius);
    m.uniforms.uI.value = intensity;
  };
  return mesh;
}

export function makeFloor(radius = 16) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#9a9a9a');
  g.addColorStop(0.7, '#262626');
  g.addColorStop(1, '#000000');
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 512);
  const alpha = new THREE.CanvasTexture(cv);
  const m = new THREE.MeshStandardMaterial({
    color: '#1b1b20',
    roughness: 0.92,
    metalness: 0,
    transparent: true,
    alphaMap: alpha,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  return mesh;
}
