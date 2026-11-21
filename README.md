# 눈결

웹캠에 비친 손가락으로 눈 입자를 움직이는 크리스마스 인터랙티브 아트입니다.

- 데모: https://nungyeol.2lazzzy.com
- 손 추적: MediaPipe Hand Landmarker (`public/hand_landmarker.task`)
- 눈 입자 10만 개: WebGL 2, GLSL 셰이더로 매 프레임 위치와 속도 계산 (`src/field.glsl`, `src/simulation.ts`)
- 화면: React, TypeScript, Three.js, React Three Fiber

## 실행

```bash
npm install
npm run dev
```

http://127.0.0.1:8138 을 열고 카메라를 허용하세요. 영상은 브라우저 안에서만 처리되고 어디에도 보내지 않습니다.

```bash
npm test
npm run build
```

## 라이선스

MIT
