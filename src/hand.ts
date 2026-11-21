import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

export type HandPose = {
  x: number;
  y: number;
  openness: number;
  gesture: "stream" | "open" | "fist";
  tips: SteeringPoint[];
  count: number;
};

export type SteeringPoint = { x: number; y: number };

export type Landmark = { x: number; y: number; z?: number };
type HandResult = {
  landmarks?: Landmark[][];
  worldLandmarks?: Landmark[][];
};

const WASM_PATH = "/vision/wasm";
const MODEL_PATH = "/hand_landmarker.task";
const TIP_INDICES = [4, 8, 12, 16, 20] as const;

const distance3 = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
const distance2 = (a: Landmark, b: Landmark, aspect = 1) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
const angle = (a: Landmark, vertex: Landmark, b: Landmark) => {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const az = (a.z ?? 0) - (vertex.z ?? 0);
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;
  const bz = (b.z ?? 0) - (vertex.z ?? 0);
  const denominator = Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz);
  if (!denominator) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by + az * bz) / denominator)));
};

function fingerIsExtended(hand: Landmark[], tip: number, pip: number, mcp: number) {
  const wrist = hand[0];
  const palm = Math.max(distance3(wrist, hand[9]), 0.001);
  return distance3(wrist, hand[tip]) > distance3(wrist, hand[pip]) * 1.08
    && distance3(hand[mcp], hand[tip]) > palm * 0.34;
}

function thumbIsExtended(hand: Landmark[], projected = hand, aspect = 1) {
  const palm = Math.max(distance3(hand[0], hand[9]), 0.001);
  const spatial = distance3(hand[4], hand[0]) > distance3(hand[3], hand[0]) * 1.12
    && distance3(hand[4], hand[9]) > palm * 1.15
    && angle(hand[2], hand[3], hand[4]) > 2.18;
  if (spatial) return true;
  // In an edge-on view, check whether the thumb clears both projected knuckles.
  const projectedPalm = Math.max(distance2(projected[0], projected[9], aspect), 0.001);
  return distance2(projected[4], projected[0], aspect) > projectedPalm * 1.05
    && distance2(projected[4], projected[5], aspect) > projectedPalm * 0.70
    && distance2(projected[4], projected[9], aspect) > projectedPalm * 0.62;
}

const unit = (n: number) => Math.max(0, Math.min(1, n));
const mirror = (p: Landmark): SteeringPoint => ({x: unit(1 - p.x), y: unit(p.y)});

export function mirroredTips(hand: Landmark[]): SteeringPoint[] {
  return TIP_INDICES.map(index => mirror(hand[index]));
}

export function classifyHandGesture(hand: Landmark[], projected = hand, aspect = 1) {
  const extended = TIP_INDICES.map(tip => tip === 4
    ? thumbIsExtended(hand, projected, aspect)
    : fingerIsExtended(hand, tip, tip - 2, tip - 3));
  const count = extended.filter(Boolean).length;
  const gesture: HandPose["gesture"] = count >= 4 ? "open" : count === 0 ? "fist" : "stream";
  const lead = extended[1] ? 8 : TIP_INDICES.find((_, i) => extended[i]) ?? 8;
  return { openness: count / extended.length, gesture, lead, count };
}

/** Start camera hand tracking and return a function that stops it. */
export async function startHandTracking(onHand: (pose: HandPose | null) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px";
  document.body.append(video);
  video.srcObject = stream;
  let cancelled = false;
  const cancelDuringStartup = () => {
    cancelled = true;
    stream.getTracks().forEach(track => track.stop());
    video.remove();
  };
  window.addEventListener("pagehide", cancelDuringStartup, { once: true });

  let landmarker: HandLandmarker | undefined;
  try {
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    const options = {
      runningMode: "VIDEO" as const,
      numHands: 1,
      minHandDetectionConfidence: 0.45,
      minHandPresenceConfidence: 0.4,
      minTrackingConfidence: 0.45,
    };
    try {
      landmarker = await HandLandmarker.createFromOptions(fileset, {
        ...options, baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
      });
    } catch {
      landmarker = await HandLandmarker.createFromOptions(fileset, {
        ...options, baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
      });
    }
    if (cancelled) throw new DOMException("Hand tracking cancelled", "AbortError");
    await video.play();
  } catch (error) {
    stream.getTracks().forEach(track => track.stop());
    video.remove();
    landmarker?.close();
    throw error;
  }
  window.removeEventListener("pagehide", cancelDuringStartup);

  let stopped = false;
  let frame = 0;
  let lastVideoTime = -1;
  let lastDetection = -Infinity;
  let lastSeen = performance.now();
  let lastFrameTime = performance.now();
  let x = 0.5;
  let y = 0.5;
  let stable: HandPose["gesture"] = "stream";
  let pending: HandPose["gesture"] = stable;
  let pendingFrames = 0;
  let stableCount = 0;
  let pendingCount = 0;
  let pendingCountFrames = 0;
  let lead = 8;
  let missingNotified = false;
  let cleanup: () => void;

  const loop = (now: number) => {
    if (stopped) return;
    frame = requestAnimationFrame(loop);
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.currentTime === lastVideoTime || now - lastDetection < 1000 / 24) return;
    lastVideoTime = video.currentTime;
    lastDetection = now;
    let result: HandResult;
    try {
      result = landmarker!.detectForVideo(video, now) as HandResult;
    } catch {
      cleanup();
      return;
    }
    const hand = result.landmarks?.[0];
    if (!hand) {
      if (now - lastSeen > 260 && !missingNotified) {
        missingNotified = true;
        onHand(null);
      }
      return;
    }
    lastSeen = now;
    missingNotified = false;
    const aspect = video.videoWidth / Math.max(video.videoHeight, 1) || 1;
    const measurement = classifyHandGesture(result.worldLandmarks?.[0] ?? hand, hand, aspect);
    const next = measurement.gesture;
    if (next === "stream") lead = measurement.lead;
    if (next === pending) pendingFrames += 1;
    else {
      pending = next;
      pendingFrames = 1;
    }
    const required = next === "fist" ? 2 : 3;
    if (pendingFrames >= required) stable = pending;
    if (measurement.count === pendingCount) pendingCountFrames += 1;
    else {
      pendingCount = measurement.count;
      pendingCountFrames = 1;
    }
    if (pendingCountFrames >= required) stableCount = pendingCount;

    const anchor = mirror(hand[stable === "stream" ? lead : 9]);
    const tips = mirroredTips(hand);
    const dt = Math.min(0.08, Math.max(0.008, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    const smoothing = 1 - Math.exp(-dt * (stable === "stream" ? 30 : 16));
    x += (anchor.x - x) * smoothing;
    y += (anchor.y - y) * smoothing;
    onHand({ x, y, openness: measurement.openness, gesture: stable, tips, count: stableCount });
  };
  frame = requestAnimationFrame(loop);

  cleanup = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    stream.getTracks().forEach(track => track.stop());
    landmarker!.close();
    video.remove();
    onHand(null);
  };
  return cleanup;
}

