precision highp float;
in vec2 vBrush;
in vec3 vTint;
in float vLight;
out vec4 outColor;
void main() {
  float along = abs(vBrush.x);
  float breadth = mix(.22,1.,1.-along*along);
  float edge = abs(vBrush.y) / breadth;
  float core = exp(-edge*edge*7.) + .20*exp(-edge*edge*1.6);
  float ends = 1. - smoothstep(.67,1.,along);
  outColor = vec4(vTint, clamp(vLight * core * ends, 0., .98));
}
