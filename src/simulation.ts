import * as THREE from "three";
import { FIELD_WIDTH, FIELD_HEIGHT, PARTICLE_COUNT } from "./seeds";

const fullscreenVertex = /* glsl */ `
  precision highp float;
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }
`;

export type Simulation = {
  uniforms: Record<string, THREE.IUniform>;
  step: () => void;
  positions: () => THREE.Texture;
  velocities: () => THREE.Texture;
  dispose: () => void;
};

export function seedTexture(data: Float32Array) {
  const texture = new THREE.DataTexture(data, FIELD_WIDTH, FIELD_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  return texture;
}

export function createSimulation(
  renderer: THREE.WebGLRenderer,
  fragmentSource: string,
  initialPosition: Float32Array,
  initialVelocity: Float32Array,
): Simulation {
  if (!renderer.capabilities.isWebGL2) {
    throw new Error("Particle simulation requires WebGL2");
  }
  if (!renderer.extensions.has("EXT_color_buffer_float") && !renderer.extensions.has("EXT_color_buffer_half_float")) {
    throw new Error("Particle simulation requires a float color buffer");
  }
  if (initialPosition.length !== PARTICLE_COUNT * 4 || initialVelocity.length !== PARTICLE_COUNT * 4) {
    throw new RangeError(`Each seed texture must contain ${PARTICLE_COUNT} RGBA particles`);
  }

  const targetOptions: THREE.RenderTargetOptions = {
    count: 2,
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  const targets = [new THREE.WebGLRenderTarget(FIELD_WIDTH, FIELD_HEIGHT, targetOptions), new THREE.WebGLRenderTarget(FIELD_WIDTH, FIELD_HEIGHT, targetOptions)];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
  geometry.setDrawRange(0, 3);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const seedPos = seedTexture(initialPosition);
  const seedVel = seedTexture(initialVelocity);
  const uniforms: Record<string, THREE.IUniform> = {
    uPos: { value: targets[0].textures[0] },
    uVel: { value: targets[0].textures[1] },
    uDt: { value: 1 / 60 },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uRing: { value: 0 },
    uFigure: { value: 0 },
    uBuild: { value: 0 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uMotion: { value: new THREE.Vector2() },
    uOpenness: { value: 0 },
    uReduced: { value: 0 },
    uFigureMap: { value: null },
  };
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader: fragmentSource,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  scene.add(quad);
  let front = 0;
  let initialized = false;
  let disposed = false;

  const step = () => {
    if (disposed) return;
    const back = 1 - front;
    uniforms.uPos.value = initialized ? targets[front].textures[0] : seedPos;
    uniforms.uVel.value = initialized ? targets[front].textures[1] : seedVel;
    const previous = renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(targets[back]);
      renderer.clear();
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(previous);
    }
    front = back;
    if (!initialized) {
      initialized = true;
      seedPos.dispose();
      seedVel.dispose();
    }
  };

  return {
    uniforms,
    step,
    positions: () => initialized ? targets[front].textures[0] : seedPos,
    velocities: () => initialized ? targets[front].textures[1] : seedVel,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
      targets.forEach(target => target.dispose());
      if (!initialized) {
        seedPos.dispose();
        seedVel.dispose();
      }
      scene.clear();
    },
  };
}

export default createSimulation;
