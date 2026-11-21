import test from "node:test";
import assert from "node:assert/strict";
import { classifyHandGesture, mirroredTips, type Landmark } from "../src/hand.ts";

const point = (x: number, y: number, z = 0): Landmark => ({ x, y, z });

function makeHand(kind: "fist" | "open" | "index" | "thumb") {
  const hand = Array.from({ length: 21 }, () => point(0, 0));
  hand[9] = point(0, -0.2);
  hand[5] = point(-0.28, -0.12);
  hand[13] = point(0.18, -0.12);
  hand[17] = point(0.34, -0.1);
  const fingers = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
  fingers.forEach(([mcp, pip, dip, tip], i) => {
    const x = [-0.28, 0, 0.18, 0.34][i];
    const extended = kind === "open" || (kind === "index" && i === 0);
    hand[mcp] = point(x, -0.22);
    hand[pip] = extended ? point(x, -0.42) : point(x, -0.28);
    hand[dip] = extended ? point(x, -0.64) : point(x + 0.06, -0.23);
    hand[tip] = extended ? point(x, -0.84) : point(x + 0.1, -0.16);
  });
  if (kind === "open") {
    hand[2] = point(-0.46, -0.03); hand[3] = point(-0.62, 0); hand[4] = point(-0.76, 0.03);
  } else if (kind === "thumb") {
    hand[2] = point(-0.34, -0.08); hand[3] = point(-0.52, -0.08); hand[4] = point(-0.7, -0.08);
  } else {
    hand[2] = point(-0.12, -0.08); hand[3] = point(-0.06, -0.14); hand[4] = point(0, -0.16);
  }
  return hand;
}

function makeCount(count: number) {
  const hand = makeHand("fist");
  const fingers = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
  fingers.slice(0, Math.min(count, 4)).forEach(([mcp, pip, dip, tip], i) => {
    const x = [-0.28, 0, 0.18, 0.34][i];
    hand[mcp] = point(x, -0.22); hand[pip] = point(x, -0.42); hand[dip] = point(x, -0.64); hand[tip] = point(x, -0.84);
  });
  if (count === 5) {
    hand[2] = point(-0.46, -0.03); hand[3] = point(-0.62, 0); hand[4] = point(-0.76, 0.03);
  }
  return hand;
}

test("closed hand is a fist", () => assert.equal(classifyHandGesture(makeHand("fist")).gesture, "fist"));
test("one extended index is stream", () => assert.equal(classifyHandGesture(makeHand("index")).gesture, "stream"));
test("one extended thumb is stream", () => assert.equal(classifyHandGesture(makeHand("thumb")).gesture, "stream"));
test("five extended fingers are open", () => assert.equal(classifyHandGesture(makeHand("open")).gesture, "open"));
for (let count = 0; count <= 5; count += 1) {
  test(`classifies exactly ${count} extended fingers`, () => {
    assert.equal(classifyHandGesture(makeCount(count)).count, count);
  });
}
test("a thumb folded across the front knuckles still forms a fist", () => {
  const depth = makeHand("fist");
  depth[2] = point(-0.07, -0.16);
  depth[3] = point(-0.05, -0.23);
  depth[4] = point(-0.03, -0.31);
  const image = makeHand("fist");
  image[4] = point(-0.055, -0.18);
  assert.equal(classifyHandGesture(depth, image).gesture, "fist");
});
test("a moving index keeps the lead even with a stationary wrist and an extended thumb", () => {
  const hand = makeHand("index");
  const thumb = makeHand("thumb");
  for (const i of [2, 3, 4]) hand[i] = thumb[i];
  const projected = hand.map(p => point(.5 + p.x * .2, .65 + p.y * .2));
  const wrist = { ...projected[0] };
  const first = mirroredTips(projected)[1];
  projected[8] = point(.62, .35);
  const pose = classifyHandGesture(hand, projected);
  assert.equal(pose.gesture, "stream");
  assert.equal(pose.lead, 8);
  assert.notEqual(first.x, mirroredTips(projected)[1].x);
  assert.deepEqual(mirroredTips(projected)[1], { x: .38, y: .35 });
  assert.deepEqual(projected[0], wrist);
});

test("all five fingertips are mirrored in anatomical order and clipped to the screen", () => {
  const hand = makeHand("open");
  const projected = hand.map(p => point(.5 + p.x * .2, .65 + p.y * .2));
  projected[20] = point(1.02, .21);
  assert.equal(classifyHandGesture(hand, projected).gesture, "open");
  assert.deepEqual(mirroredTips(projected), [4,8,12,16,20].map(i => ({
    x: Math.max(0, 1-projected[i].x), y: projected[i].y,
  })));
});
