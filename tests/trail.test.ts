import test from 'node:test';
import assert from 'node:assert/strict';
import { FingerTrail } from '../src/trail.ts';

test('snow follows a corner in screen space and retains the path when the tip rests', () => {
  const trail = new FingerTrail();
  trail.update(.20, .70, 1.5);
  trail.update(.70, .70, 1.5);
  trail.update(.70, .30, 1.5);
  const points = trail.points.map(p => [p.x, p.y]);
  assert.ok(Math.abs(points[0][0] - .60) < 1e-6 && Math.abs(points[0][1] - .40) < 1e-6);
  assert.ok(points.slice(0, 8).every(([x]) => Math.abs(x - .60) < .04));
  assert.ok(points.slice(13, 24).every(([,y]) => Math.abs(y + .40) < .04));
  trail.update(.70, .30, 1.5);
  assert.deepEqual(trail.points.map(p => [p.x,p.y]), points);
});

test('portrait gestures reach the true fingertip on both edges', () => {
  const trail = new FingerTrail();
  trail.update(.12, .95, .5);
  assert.ok(Math.abs(trail.points[0].x + .76) < 1e-6);
  assert.ok(Math.abs(trail.points[0].y + 1.8) < 1e-6);
  trail.update(.90, .05, .5, true);
  assert.ok(Math.abs(trail.points[0].x - .8) < 1e-6);
  assert.ok(Math.abs(trail.points[0].y - 1.8) < 1e-6);
});
