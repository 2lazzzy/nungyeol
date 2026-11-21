import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { FieldInput } from './input';
import { createSeeds, random, PARTICLE_COUNT } from './seeds';
import { createSimulation, seedTexture } from './simulation';
import { treePoint, giftPoint } from './tree-gift';
import { deerPoint, starPoint } from './deer-star';
import { createGreetingFigure } from './greeting';
import { FingerTrail } from './trail';
import evolve from './field.glsl?raw';
import vertex from './ice.vert.glsl?raw';
import fragment from './ice.frag.glsl?raw';

export default function Swarm({input}: {input: React.RefObject<FieldInput>}) {
  const gl = useThree(state => state.gl);
  const state = useRef({time:0, ring:0, source:'', aspect:0, hasTips:false});
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)'), []);
  const field = useMemo(() => {
    const seed = createSeeds();
    const sim = createSimulation(gl, evolve, seed.position, seed.velocity);
    const figures = [{ map: seedTexture(seed.figure), bounds: new THREE.Vector2(-.67, .555) }];
    for (const sample of [treePoint, deerPoint, giftPoint, starPoint]) {
      const next = random(0xc01d + figures.length);
      const data = new Float32Array(PARTICLE_COUNT * 4);
      let low = Infinity, high = -Infinity;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const point = sample(next, i / PARTICLE_COUNT);
        data.set(point, i * 4);
        low = Math.min(low, point[1]);
        high = Math.max(high, point[1]);
      }
      figures.push({ map: seedTexture(data), bounds: new THREE.Vector2(low, high) });
    }
    figures.push({ map: seedTexture(createGreetingFigure(PARTICLE_COUNT, random(0xdec25))), bounds: new THREE.Vector2(-.68, .58) });
    const u = sim.uniforms;
    const trail = new FingerTrail();
    const fingers = Array.from({length:5}, () => new THREE.Vector4());
    u.uFigureMap.value = figures[0].map;
    u.uBounds = {value: figures[0].bounds};
    u.uPreviousMap = {value: figures[0].map};
    u.uPaletteMix = {value: 1};
    u.uTrail = {value:trail.points};
    u.uFingers = {value:fingers};
    u.uHasTips = {value:0};
    const geom = new THREE.InstancedBufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute([-1,-1,0, 1,-1,0, 1,1,0, -1,1,0], 3));
    geom.setIndex([0,1,2, 0,2,3]);
    geom.instanceCount = PARTICLE_COUNT;
    const material = new THREE.RawShaderMaterial({
      vertexShader:vertex, fragmentShader:fragment, glslVersion:THREE.GLSL3,
      uniforms:{ ...u, uPos:{value:sim.positions()}, uVel:{value:sim.velocities()}, uDevice:{value:new THREE.Vector2()} },
      blending:THREE.AdditiveBlending, depthTest:false, depthWrite:false, transparent:true, toneMapped:false,
    });
    return {sim,figures,geom,material,trail,fingers};
  }, [gl]);
  useEffect(() => () => {
    field.sim.dispose();
    field.figures.forEach(figure => figure.map.dispose());
    field.geom.dispose();
    field.material.dispose();
  }, [field]);

  useFrame(({size}, elapsed) => {
    const s = state.current, pose = input.current, u = field.sim.uniforms;
    const frame = Math.min(.10, elapsed);
    const dt = frame * (reduced.matches ? .58 : 1);
    if (dt <= 0) return;
    const aspect = size.width / Math.max(1,size.height);
    const halfWidth = Math.max(1,aspect), halfHeight = Math.max(1,1/aspect);
    const source = pose.tips ? 'hand' : pose.strength ? 'pointer' : 'preview';
    const reset = source !== s.source || aspect !== s.aspect;
    s.source = source; s.aspect = aspect;
    const pointer = u.uPointer.value as THREE.Vector2;
    if (reset) pointer.set(pose.x,pose.y);
    const lag = 1-Math.exp(-32*dt);
    const dx = (pose.x-pointer.x) * lag;
    const dy = (pose.y-pointer.y) * lag;
    pointer.x += dx; pointer.y += dy;
    const motion = u.uMotion.value as THREE.Vector2;
    motion.set(2*halfWidth*dx/dt, -2*halfHeight*dy/dt).clampLength(0,6);
    field.trail.update(pointer.x,pointer.y,aspect,reset);
    const tips = pose.tips;
    u.uHasTips.value = tips?.length === 5 ? 1 : 0;
    if (tips?.length === 5) {
      field.fingers.forEach((finger,i) => {
        const x = (tips[i].x*2-1)*halfWidth, y = (1-tips[i].y*2)*halfHeight;
        const start = reset || !s.hasTips;
        const moveX = start ? 0 : (x-finger.x)*lag;
        const moveY = start ? 0 : (y-finger.y)*lag;
        finger.set(start ? x : finger.x+moveX, start ? y : finger.y+moveY,
          THREE.MathUtils.clamp(moveX/dt,-4,4), THREE.MathUtils.clamp(moveY/dt,-4,4));
      });
    }
    s.hasTips = !!u.uHasTips.value;
    const steps = Math.min(5,Math.ceil(dt/(1/55)));
    const step = dt / steps;
    const engage = !pose.figure && pose.gesture === 'open' ? 1 : 0;
    if (u.uFigure.value > 0) s.ring = engage;
    u.uFigure.value = pose.figure;
    const target = field.figures[pose.figure - 1];
    if (target && u.uFigureMap.value !== target.map) {
      u.uPreviousMap.value = u.uFigureMap.value;
      u.uFigureMap.value = target.map;
      u.uBounds.value = target.bounds;
      u.uBuild.value = 0;
      u.uPaletteMix.value = 0;
    }
    u.uPaletteMix.value = Math.min(1, u.uPaletteMix.value + dt * 2.8);
    for (let j=0; j<steps; j++) {
      u.uBuild.value = THREE.MathUtils.clamp(u.uBuild.value + step * (u.uFigure.value ? 1 : -2), 0, 2.6);
      s.ring = THREE.MathUtils.damp(s.ring, engage, 3.4, step);
      s.time += step;
      u.uDt.value = step;
      u.uTime.value = s.time;
      u.uAspect.value = aspect;
      u.uRing.value = s.ring;
      u.uOpenness.value = pose.openness;
      field.sim.step();
    }
    field.material.uniforms.uPos.value = field.sim.positions();
    field.material.uniforms.uVel.value = field.sim.velocities();
    gl.getDrawingBufferSize(field.material.uniforms.uDevice.value);
  });
  return <mesh geometry={field.geom} material={field.material} frustumCulled={false} dispose={null}/>;
}
