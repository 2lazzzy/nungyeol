type ParticlePoint = readonly [number, number, number, number];

const TAU = Math.PI * 2;

function sphere(next: () => number, center: readonly [number, number, number], radius: readonly [number, number, number], material: number): ParticlePoint {
  const z = next() * 2 - 1;
  const angle = next() * TAU;
  const ring = Math.sqrt(Math.max(0, 1 - z * z));
  return [
    center[0] + Math.cos(angle) * ring * radius[0],
    center[1] + z * radius[1],
    center[2] + Math.sin(angle) * ring * radius[2],
    material,
  ];
}

// Each antler has a bent main beam and three separate tines.
const antler = [
  [.135,.27,.20,.425], [.20,.425,.32,.51], [.32,.51,.45,.56], [.45,.56,.54,.68],
  [.20,.425,.18,.58], [.32,.51,.32,.68], [.45,.56,.47,.71],
] as const;

export function deerPoint(next: () => number, slot: number): ParticlePoint {
  const side = next() < .5 ? -1 : 1;
  if (slot < .44) {
    const [x,y,z] = sphere(next, [0,.055,0], [.29,.30,.19], 3);
    const taper = .72 + .28 * (y+.245)/.60;
    return [x*taper, y, z, 11];
  }
  if (slot < .58) {
    const [x,y,z] = sphere(next, [0,-.315,-.035], [.195,.225,.14], 3);
    return [x, y, z, z > .055 && Math.abs(x) < .12*(y+.56)/.35 ? 7 : 11];
  }
  if (slot < .73) {
    const stick = antler[Math.floor(next()*antler.length)];
    const [x0,y0,x1,y1] = stick, t = next();
    const w = (.017 - .009*t) * (next()*2-1);
    return [side * (x0+(x1-x0)*t+w), y0+(y1-y0)*t, -.056+w*.6, 3];
  }
  if (slot < .825) {
    const t = next(), w = (2*next()-1)*.067*Math.sin(Math.PI*t);
    return [side*(.165+.245*t-.32*w), .188+.144*t+w, .018+.032*Math.sin(Math.PI*t),
      Math.abs(w)<.018 && t>.17 && t<.82 ? 3 : 11];
  }
  if (slot < .89) return sphere(next,[0,-.070,.158],[.136,.095,.090],7);
  if (slot < .934) return sphere(next,[0,-.045,.238],[.070,.054,.054],8);
  if (slot < .957) {
    const glint = next() < .09;
    return sphere(next,[side*.127+(glint?-.01:0),.117+(glint?.012:0),.183],
      glint ? [.008,.008,.005] : [.026,.033,.014],glint ? 7 : 12);
  }
  if (slot < .985) {
    const a = next()*TAU;
    return [.177*Math.cos(a),-.20+.020*Math.sin(a)+(next()-.5)*.05,.15*Math.sin(a),8];
  }
  return sphere(next,[0,-.256,.151],[.031,.034,.024],6);
}

/** A sixfold snow crystal with three tiers of side branches. */
export function starPoint(next: () => number, slot: number): ParticlePoint {
  const angle = Math.PI/2 + Math.floor(next()*6)*TAU/6;
  const t = next(), side = next() < .5 ? -1 : 1;
  let along, across;
  if (slot < .13) {
    // The six inner edges leave a small open hexagon in the heart of the crystal.
    const r = .115 + (next()-.5)*.021;
    along = r*(1-.5*t);
    across = r*Math.sin(Math.PI/3)*t;
  } else if (slot < .49) {
    along = .10 + .53*t;
    across = (next()*2-1)*(.018+.013*Math.sin(Math.PI*t))*(1-.85*t*t);
  } else {
    const tier = Math.floor(next()*3);
    const twig = (.192-.036*tier)*t;
    along = .155 + .145*tier + twig*.5;
    across = side*twig*Math.sin(Math.PI/3);
    const width = (next()*2-1)*.013*(1-.72*t);
    along -= width*Math.sin(Math.PI/3);
    across += side*width*.5;
  }
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c*along-s*across, s*along+c*across, (next()-.5)*.032,
    next()<.21 ? 7 : 9];
}
