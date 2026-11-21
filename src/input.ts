export const FIST_GREETING = 6;

export type FieldInput = {
  x: number;
  y: number;
  gesture: 'stream' | 'open' | 'fist';
  openness: number;
  strength: number;
  tips?: {x: number; y: number}[];
  figure: number;
};

export function handSelection() {
  let count = -1, anchorX = 0, anchorY = 0, since = 0;
  return (pose: {x: number; y: number; count: number; gesture: FieldInput['gesture']} | null, now: number) => {
    if (!pose) {
      count = -1;
      return 0;
    }
    if (pose.gesture === 'fist') {
      count = -1;
      return FIST_GREETING;
    }
    if (count !== pose.count || Math.hypot(pose.x - anchorX, pose.y - anchorY) > .038) {
      count = pose.count;
      anchorX = pose.x;
      anchorY = pose.y;
      since = now;
    }
    return now - since >= 450 ? count : 0;
  };
}

export function preview(t: number): FieldInput {
  const phase = t % 7.5;
  const gesture = phase < 1.8 ? 'stream' : phase < 2.7 ? 'open' : 'fist';
  return {
    x: gesture === 'stream' ? .5 + .34 * Math.sin(t * .84 + .42) : .5 + .045 * Math.sin(t * .64),
    y: gesture === 'stream' ? .5 + .19 * Math.sin(t * 1.38) : .5 + .030 * Math.sin(t * .73 + .4),
    gesture,
    tips: undefined,
    figure: gesture === 'fist' ? Math.floor(t / 7.5) % 5 + 1 : 0,
    openness: gesture === 'open' ? 1 : gesture === 'fist' ? 0 : 0.45,
    strength: 0,
  };
}
