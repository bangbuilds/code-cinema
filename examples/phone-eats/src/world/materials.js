import * as THREE from 'three';

// "褪色"着色器：扫描线以上的部分变成灰白陶土色，扫描线处发出冷白光
// 每个物件一套 uniforms，所有材质共用同一个着色器程序

export function makeDrain() {
  return {
    uScanY: { value: 1e5 }, // 世界坐标 Y；高于它的部分已被"吃掉颜色"
    uScanW: { value: 0.03 },
    uGlow: { value: 0 },
    uDrain: { value: 0 }, // 整体强制褪色 0..1
    uBright: { value: 1 }, // 最终亮度（变成背景里的空壳时调暗）
    uClay: { value: new THREE.Color(0.6, 0.6, 0.62) },
    uGlowColor: { value: new THREE.Color(0.72, 0.9, 1.0) },
  };
}

export function applyDrain(material, U) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPosD;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvWPosD = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPosD;
        uniform float uScanY, uScanW, uGlow, uDrain, uBright;
        uniform vec3 uClay, uGlowColor;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float dg = max(uDrain, smoothstep(uScanY - uScanW, uScanY + uScanW, vWPosD.y));
        float lumD = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(diffuseColor.rgb, uClay * (0.86 + 0.3 * lumD), dg);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.78, dg);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.0, dg);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance *= (1.0 - dg);
        float glD = exp(-pow((vWPosD.y - uScanY) / (uScanW * 1.4), 2.0));
        totalEmissiveRadiance += uGlowColor * glD * uGlow;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        gl_FragColor.rgb *= uBright;`,
      );
  };
  material.customProgramCacheKey = () => 'drain-v1';
  return material;
}

// 材质工具：同一个物件的所有材质绑定同一套褪色 uniforms
export class MatKit {
  constructor(drain = makeDrain()) {
    this.drain = drain;
    this.list = [];
  }
  _reg(m) {
    applyDrain(m, this.drain);
    this.list.push(m);
    return m;
  }
  std(p) {
    return this._reg(new THREE.MeshStandardMaterial(p));
  }
  phys(p) {
    return this._reg(new THREE.MeshPhysicalMaterial(p));
  }
  plastic(color, roughness = 0.42) {
    return this.std({ color, roughness, metalness: 0 });
  }
  gloss(color, roughness = 0.25) {
    return this.phys({ color, roughness, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.32 });
  }
  matte(color, roughness = 0.85) {
    return this.std({ color, roughness, metalness: 0 });
  }
  metal(color = '#c9cbcf', roughness = 0.3) {
    return this.std({ color, roughness, metalness: 1 });
  }
  chrome() {
    return this.std({ color: '#eceef0', roughness: 0.14, metalness: 1 });
  }
  glass(color = '#0b1622') {
    return this.phys({ color, roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
  }
  tex(map, roughness = 0.6, metalness = 0) {
    return this.std({ map, roughness, metalness });
  }
  lit(map, intensity = 0.6, roughness = 0.35) {
    return this.std({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: intensity, roughness });
  }
  glow(color, intensity = 2) {
    return this.std({ color: '#000', emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
  }
  dispose() {
    this.list.forEach((m) => m.dispose());
  }
}
