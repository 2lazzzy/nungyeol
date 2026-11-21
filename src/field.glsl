precision highp float;
precision highp int;
uniform sampler2D uPos, uVel, uFigureMap;
uniform vec2 uPointer, uMotion, uBounds;
uniform vec2 uTrail[32];
uniform vec4 uFingers[5];
uniform float uDt, uTime, uAspect, uRing, uFigure, uBuild, uOpenness, uHasTips;
layout(location=0) out vec4 nextPosition;
layout(location=1) out vec4 nextVelocity;

const float TAU = 6.2831853;
float hash(uint n) {
  n ^= n >> 16; n *= 2246822519u; n ^= n >> 13; n *= 3266489917u; n ^= n >> 16;
  return float(n) / 4294967296.0;
}
mat2 turn(float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)); }

// Gather nearby grains, move the guide, then let pigment appear as the grains arrive.
vec3 timing(float time, float start, float duration) {
  return vec3(smoothstep(start - .20, start + .03, time),
              smoothstep(start, start + duration, time),
              smoothstep(start + duration * .64, start + duration + .04, time));
}

void main() {
  ivec2 uv = ivec2(gl_FragCoord.xy);
  uint i = uint(uv.y * textureSize(uPos, 0).x + uv.x);
  float a = hash(i + 198u), b = hash(i + 18349u), c = hash(i + 75301u), d = hash(i + 934017u);
  vec4 previous = texelFetch(uPos, uv, 0);
  vec4 motion = texelFetch(uVel, uv, 0);
  vec3 p = previous.xyz, v = motion.xyz;
  float settled = previous.w;
  vec2 view = vec2(max(1., uAspect), max(1., 1./uAspect));
  vec2 hand = (uPointer - .5) * vec2(2., -2.) * view;
  float pace = .16 * (.74 + .48 * a);
  float travel = fract(hash(i + 281902u) - uTime * pace);
  if (uFigure > .5) {
    vec4 target = texelFetch(uFigureMap, uv, 0);
    vec3 snow = target.xyz;
    float height = clamp((snow.y - uBounds.x) / (uBounds.y - uBounds.x), 0., 1.);
    float build = uBuild / 2.1;
    float gathering, deposit;
    vec3 guide, flow = vec3(0.);

    bool greeting = uFigure == 6.;
    bool letter = greeting && i % 5u == 4u;
    float textWidth = min(2.15, 1.58 * view.x);
    float sceneWidth = min(2.65, 1.82 * view.x);
    float textBase = .21 * sceneWidth - .015;
    if (letter) {
      float across = snow.x + .5;
      snow.xy = vec2(snow.x * textWidth, textBase + snow.y * textWidth);
      vec3 phase = timing(build, .12 + .58 * across + .035 * a, .24);
      gathering = phase.x; deposit = phase.z;
      float wind = 1. - phase.y;
      guide = snow + wind * vec3(-.32 - .20 * b, -.33 + .09 * sin(TAU * (across + phase.y)), .10 * (c - .5));
    } else if (greeting) {
      float across = clamp(.5 + snow.x, 0., 1.);
      vec3 phase = timing(build, .04 + .40 * (1. - across) + .06 * b, .32);
      gathering = phase.x; deposit = phase.z;
      snow.xy *= sceneWidth;
      snow.y += -.11 + .018 * sin(uTime * 1.7);
      guide = snow + (1. - phase.y) * vec3(-.65 - .34 * a, -.18 + .19 * b, .18 * (c - .5));
    } else if (uFigure < 1.5) {
      const float turns = 3., startAngle = -.85;
      float azimuth = atan(snow.z, snow.x);
      float offset = fract((azimuth - startAngle) / TAU - turns * height + .5) - .5;
      float edge = smoothstep(0., .14, height) * (1. - smoothstep(.86, 1., height));
      float slot = clamp(height + .85 * edge * offset / turns + .012 * (d - .5), 0., 1.);
      float ahead = slot - build;
      gathering = 1. - smoothstep(.20, .42, ahead);
      deposit = 1. - smoothstep(-.03, .075, ahead);
      float tail = clamp(ahead / .42, 0., 1.);
      float y = mix(uBounds.x, uBounds.y, clamp(build - .30 * tail, 0., 1.)) - .07 * tail;
      float body = .38 * .38 - (y + .29) * (y + .29);
      float head = .255 * .255 - (y - .30) * (y - .30);
      float radius = sqrt(max(0., max(body,head))) + .055 + tail * (.26 + .09 * b);
      float angle = startAngle + TAU * (turns * build - .92 * tail) + .13 * (a - .5);
      vec2 outward = vec2(cos(angle), sin(angle));
      guide = vec3(outward.x * radius, y + .028 * (d - .5), outward.y * radius);
      flow = vec3(-outward.y * radius, .04, outward.x * radius) * (TAU * (turns + .92 / .42) / 2.1);
    } else if (uFigure < 2.5) {
      // Two sloping gusts stitch the boughs from the needle tips inward.
      float side = snow.x < 0. ? -1. : 1.;
      float layer = clamp(floor((snow.y + .54) / .23), 0., 3.);
      float inward = 1. - clamp(abs(snow.x) / max(.08, .53 - .37*height), 0., 1.);
      float start = .06 + .072*layer + .16*inward + .07*a;
      if (target.w == 6. || target.w == 8.) start = .42 + .22*height + .055*b;
      if (snow.y > .50) start = .76 + .05*b;
      vec3 phase = timing(build, start, .26);
      gathering = phase.x; deposit = phase.z;
      float wind = 1. - phase.y;
      guide = snow + vec3(side*(.58 + .29*b), .18 + .08*layer, .13*(c-.5)) * wind;
      guide.y += .075*sin(TAU*(phase.y*.8+a*.2))*wind;
    } else if (uFigure < 3.5) {
      // The portrait gathers into a face. Two independent trails grow out to the antler tips.
      float side = snow.x < 0. ? -1. : 1.;
      vec3 root = vec3(side*.135, .27, -.056);
      bool antler = target.w == 3. && snow.y > .324;
      float start = antler ? .46 + .40*clamp(distance(snow.xy, root.xy)/.55,0.,1.)
                           : .055 + .25*clamp(length((snow.xy-vec2(0.,.09))*vec2(1.,.82))/.52,0.,1.) + .06*a;
      vec3 phase = timing(build,start,antler ? .21 : .30);
      gathering = phase.x; deposit = phase.z;
      if (antler) {
        guide = mix(root, snow, phase.y);
        guide.y += .052*sin(3.14159*phase.y);
        guide.xz += (1.-phase.y)*vec2(.07*(a-.5),.065*(b-.5));
      } else {
        vec3 flurry = vec3(cos(TAU*b)*(.43+.30*c), sin(TAU*b)*.43, .28*(a-.5));
        guide = snow + flurry*(1.-phase.y);
      }
    } else if (uFigure < 4.5) {
      // Unrotate the present so its panels hinge on the actual edges of the box.
      float unpitchedZ = -.287*snow.y + .958*snow.z;
      vec3 box = vec3(.926*snow.x + .378*unpitchedZ, .958*snow.y + .287*snow.z,
                      -.378*snow.x + .926*unpitchedZ);
      bool lid = box.y > .20 && target.w == 1.;
      bool sidePanel = target.w == 10.;
      bool ribbon = target.w == 6.;
      float start = lid ? .38 : sidePanel ? .19 : .035;
      if (ribbon) start = box.y > .23 ? .79 : .54 + .13*clamp(.5+box.x+box.z, 0., 1.);
      vec3 phase = timing(build, start+.018*b, ribbon ? .22 : .33);
      gathering = phase.x; deposit = phase.z;
      float fold = (1.-phase.y)*1.46;
      if (ribbon) {
        box.y += (1.-phase.y)*(box.y > .23 ? .31 : .12);
        box.xz *= 1. + .55*(1.-phase.y);
      } else if (lid) {
        box.yz = vec2(.215,-.31) + turn(-fold)*(box.yz-vec2(.215,-.31));
      } else if (sidePanel) {
        box.xy = vec2(.405,-.425) + turn(-fold)*(box.xy-vec2(.405,-.425));
      } else {
        box.yz = vec2(-.425,.31) + turn(fold)*(box.yz-vec2(-.425,.31));
      }
      float depth = .378*box.x + .926*box.z;
      guide = vec3(.926*box.x-.378*box.z, .958*box.y-.287*depth, .287*box.y+.958*depth);
    } else {
      // Advance six frost fronts at once, extending the side twigs from their junctions.
      float angle = TAU/4. + round((atan(snow.y,snow.x)-TAU/4.)/(TAU/6.))*(TAU/6.);
      vec2 axis = vec2(cos(angle),sin(angle));
      float along = dot(snow.xy,axis);
      float lateral = length(snow.xy - axis*along);
      float joint = max(.04, along - lateral*.57735);
      float travel = clamp(build*.81 - .018*a,0.,.81);
      vec2 onArm = axis*min(joint,travel);
      float sprout = clamp((travel-joint)/max(.018, distance(snow.xy,axis*joint)), 0., 1.);
      guide = vec3(mix(onArm,snow.xy,sprout),snow.z);
      float arrival = (joint + distance(snow.xy,axis*joint))/.81;
      vec3 phase = timing(build, arrival-.19+.025*c, .22);
      gathering = phase.x; deposit = phase.z;
      guide.xy += (1.-phase.y)*vec2(a-.5,b-.5)*.095;
    }

    if (!greeting) {
      mat2 rotation = turn(.19 * sin(uTime * .68) + .085);
      snow.xz = rotation * snow.xz;
      guide.xz = rotation * guide.xz;
      flow.xz = rotation * flow.xz;
    }
    snow.xy += .0027 * vec2(sin(uTime * 1.6 + a * TAU), cos(uTime * 1.3 + c * TAU));
    vec2 margin = vec2(greeting ? .52 * sceneWidth + .035 : .72, .055);
    float top = greeting ? 1.1 * (textBase + .15 * textWidth) : 1.15 * uBounds.y;
    float bottom = greeting ? -1.1 * (.22 * sceneWidth + .14) : 1.15 * uBounds.x;
    vec2 lower = -view + margin - vec2(0., bottom);
    vec2 upper = view - margin - vec2(0., top);
    vec3 center = vec3(clamp(hand + vec2(0., .045), lower, max(lower,upper)), 0.);
    vec3 goal = center + 1.1 * mix(guide, snow, deposit);
    float response = mix(.95, mix(13., 17., a), gathering);
    v += ((goal - p) * response * response
          + flow * response * gathering * (1. - deposit)) * uDt;
    v /= 1. + 2. * response * uDt;
    p += v * uDt;
    float arrival = deposit * (1. - smoothstep(.025, .25, length(center + 1.1 * snow - p)));
    settled = mix(settled, deposit * mix(settled, 1., arrival), 1. - exp(-9. * uDt));
    nextPosition = vec4(p, settled);
    nextVelocity = vec4(v, mix(motion.w, mix(.30, 1., gathering), 1. - exp(-4. * uDt)));
    return;
  }
  float along = pow(travel, 1.48);
  float segment = along * 31.;
  int k = min(int(segment), 30);
  vec2 path = mix(uTrail[k], uTrail[k+1], fract(segment));
  vec2 heading = uTrail[k] - uTrail[k+1];
  heading /= max(.0001,length(heading));
  vec2 normal = vec2(-heading.y,heading.x);
  float strand = floor(a * 8.);
  float swell = smoothstep(0.,.22,along);
  float ribbon = (.016 + .090 * swell) * (c+d-1.)
               + swell * (.045*sin(along*17. - uTime*1.4 + strand*.75)
                        + .039*sin(along*9. + uTime*.7));
  vec3 stream = vec3(path + normal * ribbon, (.012 + .095*swell) * (a-.5));
  float front = exp(-along * 11.);
  vec3 feed = vec3(mix(heading * (.12+.23*along),uMotion,front),0.);

  // Moving radial waves keep refilling the same spokes, including while the hand is still.
  float ray = floor(a * 110.);
  float theta = (ray + .55 * (c - .5)) * TAU / 110. + .10 * sin(uTime * .6) + .04 * sin(ray * 1.6);
  float wave = .5 - .5 * cos(TAU * (b + uTime * (.135 + .055 * d)));
  float r = .255 + .455 * (.62 * wave + .38 * c);
  r *= (.94 + .08 * uOpenness) * (1. + .038 * sin(theta * 5. + uTime) + .022 * sin(theta * 13.));
  vec2 disc = vec2(cos(theta), sin(theta)) * r;
  float depth = (c - .5) * .052 + .024 * sin(theta * 2. + uTime * .6);
  vec3 target = vec3(hand + disc, depth);
  float formation = uRing;
  // Recycle at the faint tail, without a bright shortcut across a curved stroke.
  if (formation < .05 && settled < .015 && travel + pace * uDt >= 1.) {
    p = stream;
    v = feed;
  }
  vec3 error = mix(stream - p, target - p, formation);
  float spring = mix(34. + 410.*front, 50., formation);
  float drag = mix(9.5 + 24.5*front, 12.5, formation);
  vec2 radial = p.xy - hand;
  vec2 curl = vec2(radial.y, -radial.x) * .7;
  vec3 drive = mix(feed, vec3(curl, 0.), formation);
  vec2 impulse = vec2(0.);
  if (uHasTips > .5) {
    for (int j=0; j<5; j++) {
      vec2 delta = p.xy-uFingers[j].xy;
      impulse += uFingers[j].zw * exp(-dot(delta,delta)*17.);
    }
    impulse *= mix(1.8,9.,formation);
  }
  v += (spring * error + drive * drag * mix(.58, .17, formation) + vec3(impulse,0.)) * uDt;
  v /= 1. + drag * uDt;
  p += v * uDt;
  nextPosition = vec4(p, settled * exp(-7.5 * uDt));
  float trailLight = (.16 + .84 * (1. - smoothstep(.12,1.,along))) * (1. + .60*front);
  trailLight *= 1.-smoothstep(.90,1.,travel);
  float light = mix(trailLight,1.,formation);
  nextVelocity = vec4(v, mix(light, motion.w, settled * exp(-5. * uDt)));
}
