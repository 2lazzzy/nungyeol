type Particle = readonly [number, number, number, number];
const TAU = 2 * Math.PI;

// Bottom, tip and bough radius for each overlapping layer.
const tiers = [[-.53, .01, .50], [-.30, .22, .395], [-.075, .385, .28], [.125, .50, .175]] as const;
function crownRadius(y: number) {
  return Math.max(...tiers.map(([base, top, radius]) => y >= base && y <= top ? radius * (top-y)/(top-base) : 0));
}

export function treePoint(next: () => number, slot: number): Particle {
  const angle = next() * TAU;
  if (slot < .035) {
    const wedge = Math.floor(next() * 10);
    const a = Math.PI / 2 + wedge * TAU / 10, b = a + TAU / 10;
    const r = wedge % 2 ? .043 : .100, s = .143 - r;
    const t = next(), fill = Math.sqrt(next());
    return [fill * ((1-t)*r*Math.cos(a) + t*s*Math.cos(b)), .554 + fill * ((1-t)*r*Math.sin(a) + t*s*Math.sin(b)), .03, 6];
  }
  if (slot < .06) return [.058*Math.cos(angle), -.635 + next()*.135, .048*Math.sin(angle), 3];
  if (slot < .82) {
    const tier = tiers[slot < .40 ? 0 : slot < .625 ? 1 : slot < .755 ? 2 : 3];
    const [base, top, radius] = tier;
    const depth = Math.sqrt(next());
    const edge = .93 + .05*Math.cos(13*angle) + .02*Math.cos(21*angle);
    const r = radius * depth * edge * (.84 + .16*next());
    const y = top + (base-top)*depth + .026*(1-Math.cos(13*angle))*depth*depth;
    return [r*Math.cos(angle), y, .67*r*Math.sin(angle), depth > .93 && next() < .5 ? 7 : 5];
  }
  if (slot < .90) {
    const t = next(), a = .25 + TAU*3.1*t, y = .41 - t*.895;
    const r = crownRadius(y) + .012;
    return [r*Math.cos(a), y + (next()-.5)*.012, r*.67*Math.sin(a), 6];
  }
  // Place baubles on the boughs, with front and side ornaments visible in silhouette.
  const j = Math.floor(next()*13);
  const y = -.44 + (j % 6)*.146, a = .16 + ((j*.381966) % 1)*Math.PI;
  const r = crownRadius(y) + .014;
  const z = 2*next()-1, bead = .020 + (j%3)*.004;
  const ring = Math.sqrt(1-z*z)*bead;
  return [r*Math.cos(a)+ring*Math.cos(angle), y+bead*z, .67*r*Math.sin(a)+ring*Math.sin(angle), j%4===1 ? 6 : 8];
}

export function giftPoint(next: () => number, slot: number): Particle {
  let x, y, z, material;
  if (slot < .86) {
    const width = .405, depth = .31, top = .215, bottom = -.425;
    x = (2*next()-1)*width;
    y = bottom + next()*(top-bottom);
    z = (2*next()-1)*depth;
    let ribbon: boolean;
    if (slot < .47) {
      z = depth;
      ribbon = Math.abs(x) < .054 || Math.abs(y+.075) < .045;
      material = 8;
    } else if (slot < .67) {
      x = width;
      ribbon = Math.abs(z) < .046 || Math.abs(y+.075) < .045;
      material = 10;
    } else {
      y = top;
      ribbon = Math.abs(x) < .054 || Math.abs(z) < .046;
      material = 1;
    }
    if (ribbon) material = 6;
  } else if (slot < .982) {
    const side = next() < .5 ? -1 : 1, a = next()*TAU;
    const along = (1-Math.cos(a))*.5;
    x = side * (.025 + .30*along);
    y = .25 + .16*along + .084*Math.sin(a);
    z = (next()-.5)*.095 + side*.035*along;
    material = 6;
  } else {
    const a = next()*TAU, h = next()*2-1, r = Math.sqrt(1-h*h);
    x = .060*r*Math.cos(a); y = .255+.057*h; z = .066*r*Math.sin(a);
    material = 6;
  }
  // A fixed three-quarter view keeps both the ribbon on the lid and the front cross legible.
  const sideX = .926*x - .378*z, depthZ = .378*x + .926*z;
  return [sideX, .958*y - .287*depthZ, .287*y + .958*depthZ, material];
}
