import test from 'node:test';
import assert from 'node:assert/strict';
import { FIST_GREETING, preview, handSelection } from '../src/input.ts';

test('idle preview alternates free movement, open ring and all five complete formations', () => {
  for (let i=0; i<5; i++) {
    const start = i*7.5;
    assert.equal(preview(start).figure, 0);
    assert.equal(preview(start+2).gesture, 'open');
    assert.equal(preview(start+3).figure, i+1);
    assert.equal(preview(start+7.4).figure, i+1);
  }
  assert.equal(preview(40.5).figure, 1);
});

test('a held count chooses every figure, motion or tracking loss releases it, and a fist starts immediately', () => {
  const select = handSelection();
  for (const count of [1,2,3,4,5]) {
    const pose = {count, x:.5, y:.5, gesture: count >= 4 ? 'open' as const : 'stream' as const};
    const t = 1000*count;
    assert.equal(select(pose,t),0);
    assert.equal(select({...pose,x:.51},t+470),count);
    assert.equal(select({...pose,x:.56},t+500),0);
    assert.equal(select(null,t+550),0);
    assert.equal(select(pose,t+900),0);
  }
  assert.ok(FIST_GREETING > 5);
  assert.equal(select({count:0,x:.5,y:.5,gesture:'fist'},6000),FIST_GREETING);
  assert.equal(select({count:1,x:.5,y:.5,gesture:'stream'},6100),0);
  assert.equal(select({count:1,x:.5,y:.5,gesture:'stream'},6600),1);
});
