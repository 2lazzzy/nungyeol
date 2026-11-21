import { pigment } from './pigment';
import { drawSantaSleigh } from './santa';
import { drawFlyingDeer } from './sleigh-deer';

function greetingMask(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot sample the greeting without a 2D canvas');
  paint(ctx);

  const pixels = ctx.getImageData(0, 0, width, height).data;
  const ink: number[] = [];
  let left = width, right = 0, bottom = 0;
  for (let i = 0; i < width * height; i++) {
    if (pixels[i * 4 + 3] < 128) continue;
    ink.push(i);
    left = Math.min(left, i % width);
    right = Math.max(right, i % width);
    bottom = Math.floor(i / width);
  }
  return { pixels, ink, width, left, right, bottom };
}

export function createGreetingFigure(count: number, next: () => number) {
  const text = greetingMask(1500, 240, ctx => {
    ctx.font = "italic 700 128px Georgia, 'Times New Roman', serif";
    ctx.fillStyle = pigment(13);
    ctx.fillText('Merry Christmas', 18, 174);
  });
  const scene = greetingMask(1000, 480, ctx => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawFlyingDeer(ctx);
    ctx.strokeStyle = pigment(6);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(367, 172);
    ctx.bezierCurveTo(490, 219, 665, 214, 824, 173);
    ctx.moveTo(367, 170);
    ctx.bezierCurveTo(517, 199, 686, 192, 822, 170);
    ctx.stroke();
    drawSantaSleigh(ctx);
  });

  const data = new Float32Array(count * 4);
  const letters = Math.floor(count / 5);
  let sceneIndex = 0, textIndex = 0;
  for (let i = 0; i < count; i++) {
    const letter = i % 5 === 4;
    const mask = letter ? text : scene;
    const fraction = letter ? (textIndex++ + next()) / letters : (sceneIndex++ + next()) / (count - letters);
    const pixel = mask.ink[Math.floor(fraction * mask.ink.length)];
    const x = pixel % mask.width, y = Math.floor(pixel / mask.width);
    const width = letter ? text.right - text.left + 1 : scene.width;
    data[i * 4] = (x - (letter ? (text.left + text.right) / 2 : 500)) / width;
    data[i * 4 + 1] = ((letter ? text.bottom : 215) - y) / width;
    data[i * 4 + 2] = (next() - .5) * .008;
    data[i * 4 + 3] = letter ? 13 : Math.round(scene.pixels[pixel * 4] / 12);
  }
  return data;
}
