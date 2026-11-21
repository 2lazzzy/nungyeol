precision highp float;
precision highp int;
in vec3 position;
uniform sampler2D uPos, uVel, uFigureMap, uPreviousMap;
uniform vec2 uPointer, uDevice;
uniform float uAspect, uRing, uPaletteMix, uFigure;
out vec2 vBrush;
out vec3 vTint;
out float vLight;

float hash(uint n) {
  n ^= n >> 16; n *= 2246822519u; n ^= n >> 13; n *= 3266489917u; n ^= n >> 16;
  return float(n) / 4294967296.0;
}
vec2 unit(vec2 a) { return a / max(.0001,length(a)); }

vec4 frost(vec4 target, float grain) {
  vec3 tint = vec3(.67,.82,.91);
  if (target.w == 1.) tint = vec3(1.,.23,.12);
  if (target.w == 2.) tint = vec3(.18,.50,.75);
  if (target.w == 3.) tint = vec3(.84,.64,.43);
  if (target.w == 4.) tint = vec3(1.,.49,.12);
  if (target.w == 5.) tint = vec3(.07,.56,.30);
  if (target.w == 6.) tint = vec3(1.,.61,.19);
  if (target.w == 7.) tint = vec3(.88,.96,1.);
  if (target.w == 8.) tint = vec3(.84,.066,.12);
  if (target.w == 9.) tint = vec3(.31,.70,1.);
  if (target.w == 10.) tint = vec3(.43,.032,.065);
  if (target.w == 11.) tint = vec3(.69,.35,.16);
  if (target.w == 12.) tint = vec3(.16,.09,.068);
  if (target.w == 13.) tint = vec3(1.,.83,.57);
  if (target.w == 14.) tint = vec3(.98,.62,.43);
  if (target.w == 15.) tint = vec3(.16,.10,.085);
  if (target.w == 16.) tint = vec3(.94,.055,.085);
  if (target.w == 17.) tint = vec3(1.,.94,.83);
  if (target.w == 18.) tint = vec3(.98,.40,.33);
  float front = .35 + .65 * smoothstep(-.16,.23,target.z);
  float light = (.34 + .60 * grain) * (front + .28);
  if (target.w > .5 && target.w < 4.5) light = .78 + .35 * grain;
  if (target.w == 9.) light *= .65;
  if (target.w == 13.) light = .76 + .40 * grain;
  else if (uFigure == 6.) light = .93 + .55 * grain;
  return vec4(tint,light);
}

void main() {
  uint i = uint(gl_InstanceID);
  int width = textureSize(uPos, 0).x;
  ivec2 uv = ivec2(gl_InstanceID % width, gl_InstanceID / width);
  vec4 particle = texelFetch(uPos,uv,0);
  vec3 p = particle.xyz;
  float settled = particle.w;
  vec4 motion = texelFetch(uVel,uv,0);
  vec3 vel = motion.xyz;
  float a = hash(i + 198u), b = hash(i + 18349u), c = hash(i + 75301u);
  vec2 view = vec2(max(1.,uAspect),max(1.,1./uAspect));
  vec2 hand = (uPointer-.5) * vec2(2.,-2.) * view;
  vec2 radial = unit(p.xy-hand);
  vec2 tangent = vec2(radial.y,-radial.x);
  float inFormation = max(uRing,settled);
  vec2 streamDir = unit(vel.xy + vec2(.0003,.0001));
  vec2 ringDir = unit(radial + tangent * (.07 + .12 * b));
  vec2 dir = unit(mix(streamDir, ringDir, uRing));
  dir = unit(mix(dir, vec2(cos(a*6.283), sin(a*6.283)), settled));
  float perspective = 3.5 / (3.5 - p.z);
  vec2 pos = p.xy * perspective / view;
  float glint = pow(b, 5.);
  float lengthWorld = (.004 + .016 * c + .023 * glint) * mix(1.,1.28,inFormation);
  lengthWorld *= mix(1.,.25 + .17*c,settled);
  float pixels = min(uDevice.x,uDevice.y);
  float halfLength = max(.98, lengthWorld * .25 * pixels * perspective);
  float halfWidth = (.49 + .39*c + .70*glint) * clamp(pixels/820.,.78,1.8);
  halfWidth *= mix(1., 1.18, settled);
  vec2 extent = dir*position.x*halfLength + vec2(-dir.y,dir.x)*position.y*halfWidth*1.9;
  gl_Position = vec4(pos + 2.*extent/uDevice, 0., 1.);
  vBrush = position.xy;
  float rare = smoothstep(.84,1.,b);
  vTint = mix(vec3(.32,.65,.81), vec3(.86,.94,1.), .20+.80*a);
  vTint = mix(vTint, vec3(.97,.9,.74), rare * .72);
  vLight = (.022 + .13 * c*c + .60 * pow(b, 7.)) * mix(.76,1.13,clamp(.5+p.z*2.,0.,1.));
  // Brighter front-facing frost makes the figure's round volume visible.
  if (settled > .001) {
    vec4 color = frost(texelFetch(uFigureMap,uv,0),c);
    if (uPaletteMix < 1.) color = mix(frost(texelFetch(uPreviousMap,uv,0),c),color,uPaletteMix);
    vTint = mix(vTint,color.rgb,settled);
    vLight = mix(vLight,color.a,settled);
  }
  vLight *= 1. - smoothstep(.98,1.06,abs(pos.x));
  vLight *= motion.w * .20;
}
