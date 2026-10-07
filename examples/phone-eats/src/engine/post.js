import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// 手写后期管线：场景(MSAA) → 辉光 → 色调映射 → 合成文字层/暗角/色差 → 累积(运动模糊) → 颗粒 → 屏幕
const VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const compositeMat = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tHud: { value: null },
      uVignette: { value: 0.85 },
      uCA: { value: 0.006 },
      uFade: { value: 0 },
      uHudAlpha: { value: 1 },
      uScrim: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform sampler2D tHud;
      uniform float uVignette, uCA, uFade, uHudAlpha, uScrim;
      varying vec2 vUv;
      void main(){
        vec2 d = vUv - 0.5;
        float r = length(d * vec2(0.5625, 1.0)) * 1.9;
        vec2 off = d * uCA * r;
        vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        float vig = smoothstep(1.25, 0.25, r);
        col *= mix(1.0, vig, uVignette);
        col *= 1.0 - uScrim * smoothstep(0.66, 0.93, vUv.y);
        col *= (1.0 - uFade);
        vec4 h = texture2D(tHud, vUv);
        col = mix(col, h.rgb, h.a * uHudAlpha);
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });

const accumMat = () =>
  new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uWeight: { value: 1 } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uWeight; varying vec2 vUv;
      void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * uWeight, uWeight); }`,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendEquation: THREE.AddEquation,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

const finalMat = () =>
  new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.03 } },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uTime, uGrain; varying vec2 vUv;
      float hash(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      void main(){
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        float n = hash(vec3(gl_FragCoord.xy, floor(uTime * 60.0) + 1.0)) - 0.5;
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col += n * uGrain * (0.55 + 0.45 * (1.0 - abs(l - 0.45) * 1.8));
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });

export class Post {
  constructor(renderer, w, h) {
    this.renderer = renderer;
    const opt = { type: THREE.HalfFloatType, depthBuffer: false };
    this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    this.rtOut = new THREE.WebGLRenderTarget(w, h, opt);
    this.rtComp = new THREE.WebGLRenderTarget(w, h, opt);
    this.rtAccum = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: false });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.45, 1.2);
    this.output = new OutputPass();
    this.comp = new FullScreenQuad(compositeMat());
    this.accum = new FullScreenQuad(accumMat());
    this.final = new FullScreenQuad(finalMat());
    this.w = w;
    this.h = h;
  }

  setSize(w, h) {
    this.w = w;
    this.h = h;
    for (const rt of [this.rtScene, this.rtOut, this.rtComp, this.rtAccum]) rt.setSize(w, h);
    this.bloom.setSize(w, h);
  }

  get uniforms() {
    return this.comp.material.uniforms;
  }

  // 渲染一个子帧并累加；k=0 时清空累积缓冲
  renderSub(scene, camera, hudTex, k, n) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(scene, camera);
    this.bloom.render(r, null, this.rtScene, 0, false);
    this.output.render(r, this.rtOut, this.rtScene);

    const cu = this.comp.material.uniforms;
    cu.tDiffuse.value = this.rtOut.texture;
    cu.tHud.value = hudTex;
    r.setRenderTarget(this.rtComp);
    this.comp.render(r);

    r.setRenderTarget(this.rtAccum);
    if (k === 0) {
      r.setClearColor(0x000000, 0);
      r.clear();
    }
    this.accum.material.uniforms.tDiffuse.value = this.rtComp.texture;
    this.accum.material.uniforms.uWeight.value = 1 / n;
    this.accum.render(r);
  }

  present(t, grain = 0.03) {
    const r = this.renderer;
    const u = this.final.material.uniforms;
    u.tDiffuse.value = this.rtAccum.texture;
    u.uTime.value = t;
    u.uGrain.value = grain;
    r.setRenderTarget(null);
    this.final.render(r);
  }
}
