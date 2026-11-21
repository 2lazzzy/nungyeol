import { Vector2 } from 'three';

const SAMPLES = 32;

// Distance sampling keeps a quick turn in the wake after the fingertip stops.
export class FingerTrail {
  readonly points = Array.from({length: SAMPLES}, () => new Vector2());
  private readonly anchors = Array.from({length: SAMPLES}, () => new Vector2());
  private readonly tip = new Vector2();
  private spacing = 0;
  private remainder = 0;

  update(x: number, y: number, aspect: number, reset = false) {
    const halfWidth = Math.max(1, aspect);
    const halfHeight = Math.max(1, 1 / aspect);
    const worldX = (2 * x - 1) * halfWidth;
    const worldY = (1 - 2 * y) * halfHeight;
    const spacing = Math.min(3.2, halfWidth * 1.75) / (SAMPLES - 1);
    if (reset || spacing !== this.spacing) {
      this.spacing = spacing;
      this.remainder = 0;
      this.tip.set(worldX,worldY);
      const side = x < 0.4 ? 1 : -1;
      this.anchors.forEach((p, i) => {
        const offset = i * spacing;
        p.set(this.tip.x + side * offset, this.tip.y + .07 * Math.sin(3.1 * offset));
      });
    }
    const dx = worldX-this.tip.x, dy = worldY-this.tip.y;
    const distance = Math.hypot(dx,dy);
    for (let offset = spacing-this.remainder; offset <= distance && distance > 0; offset += spacing) {
      const next = this.anchors.pop()!;
      next.set(this.tip.x + dx * offset / distance, this.tip.y + dy * offset / distance);
      this.anchors.unshift(next);
    }
    this.remainder = (this.remainder + distance) % spacing;
    this.tip.set(worldX,worldY);
    this.points[0].copy(this.tip);
    for (let i = 1; i < SAMPLES; i++) {
      this.points[i].copy(this.anchors[i]).lerp(this.anchors[i - 1], this.remainder / spacing);
    }
  }
}
