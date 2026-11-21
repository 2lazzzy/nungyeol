export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 250;
export const PARTICLE_COUNT = FIELD_WIDTH * FIELD_HEIGHT;

// A small deterministic generator keeps the stream and the snowman stable between reloads.
export function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function spherePoint(next: () => number, centerY: number, radius: number) {
  const z = next() * 2 - 1;
  const angle = next() * Math.PI * 2;
  const ring = Math.sqrt(Math.max(0, 1 - z * z));
  return [Math.cos(angle) * ring * radius, centerY + z * radius, Math.sin(angle) * ring * radius] as const;
}

function linePoint(next: () => number, ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const t = next();
  const jitter = (next() - 0.5) * 0.018;
  return [ax + (bx - ax) * t + jitter, ay + (by - ay) * t + jitter, az + (bz - az) * t + jitter] as const;
}

/** Stable initial stream, velocity, and target snowman positions for the GPU. */
export function createSeeds(): { position: Float32Array; velocity: Float32Array; figure: Float32Array } {
  const position = new Float32Array(PARTICLE_COUNT * 4);
  const velocity = new Float32Array(PARTICLE_COUNT * 4);
  const figure = new Float32Array(PARTICLE_COUNT * 4);
  const next = random(0x5eedcafe);

  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const x = -1.85 + (i / (PARTICLE_COUNT - 1)) * 3.7 + (next() - 0.5) * 0.025;
    const y = 0.15 * Math.sin(x * 3) + 0.07 * Math.sin(x * 7) + (next() - 0.5) * 0.17;
    const z = (next() - 0.5) * 0.26;
    const k = i * 4;
    position[k] = x; position[k + 1] = y; position[k + 2] = z; position[k + 3] = 0;
    velocity[k] = 0.4 + next() * 0.14;
    velocity[k + 1] = 0.025 * Math.cos(x * 3) + (next() - 0.5) * 0.025;
    velocity[k + 2] = (next() - 0.5) * 0.035;
    velocity[k + 3] = 1;

    let target: readonly [number, number, number];
    let group = 0;
    const slot = i / PARTICLE_COUNT;
    if (slot < 0.625) {
      target = spherePoint(next, -0.29, 0.38);
    } else if (slot < 0.875) {
      target = spherePoint(next, 0.30, 0.255);
    } else if (slot < 0.942) {
      group = 1;
      const a = next() * Math.PI * 2;
      const y = 0.074 + Math.cos(a) * .015 + (next() - .5) * .053;
      target = [Math.cos(a) * .195, y, Math.sin(a) * .192] as const;
      if (next() < .31) {
        const t = next();
        target = [.095 + .10*t + (next()-.5)*.042, .083 - .265*t, .149 + .19*t] as const;
      }
    } else if (slot < 0.975) {
      group = 3;
      const side = next() < 0.5 ? -1 : 1;
      target = linePoint(next, side * 0.27, -0.08, 0, side * 0.68, 0.09, 0);
      if (next() > 0.55) target = linePoint(next, side * 0.48, 0.01, 0, side * 0.68, 0.24, 0);
    } else if (slot < 0.99) {
      group = 2;
      const face = next() < 0.58;
      if (face) {
        const side = next() < 0.5 ? -1 : 1;
        target = [side * 0.085 + (next() - .5)*.026, 0.345 + (next() - 0.5) * 0.030, 0.242 + (next() - 0.5) * 0.015] as const;
      } else {
        const y = -.31 + Math.floor(next()*3)*.10 + (next()-.5)*.028;
        target = [(next()-.5)*.03, y, Math.sqrt(.38**2-(y+.29)**2)] as const;
      }
    } else {
      group = 4;
      const t = next();
      target = [.012 + t*.085, .275 + .02*t + (next()-.5)*.044*(1.-t), .252+.09*t] as const;
    }
    figure[k] = target[0]; figure[k + 1] = target[1]; figure[k + 2] = target[2]; figure[k + 3] = group;
  }
  return { position, velocity, figure };
}

