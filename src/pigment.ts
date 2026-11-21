// Store the shader's material number in the red channel of the particle target mask.
export const pigment = (material: number) => `rgb(${material * 12}, 0, 0)`;

export function particleBrush(ctx: CanvasRenderingContext2D) {
  const fill = (color: number, path: string) => {
    ctx.fillStyle = pigment(color);
    ctx.fill(new Path2D(path));
  };
  const stroke = (color: number, width: number, path: string) => {
    ctx.strokeStyle = pigment(color);
    ctx.lineWidth = width;
    ctx.stroke(new Path2D(path));
  };
  const dot = (color: number, x: number, y: number, r: number) => {
    ctx.fillStyle = pigment(color);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  return { fill, stroke, dot };
}
