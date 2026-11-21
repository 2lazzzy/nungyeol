import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import Swarm from './Swarm';
import CarolMusic from './CarolMusic';
import { FIST_GREETING, handSelection, preview, type FieldInput } from './input';
import type { HandPose } from './hand';
import './style.css';

function Field() {
  const input = useRef<FieldInput>(preview(0));
  const hand = useRef<HandPose | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, used: -Infinity, down: false, dragging: false, releasedOpen: false });
  const keyboardFigure = useRef<number | null>(null);
  const handFigure = useRef(0);
  const camera = useRef<null | 'starting' | (() => void)>(null);

  useEffect(() => {
    let disposed = false;
    const p = pointer.current;
    const select = handSelection();
    async function enableCamera() {
      if (camera.current || !navigator.mediaDevices?.getUserMedia) return;
      camera.current = 'starting';
      try {
        const { startHandTracking } = await import('./hand');
        if (disposed) return;
        const stop = await startHandTracking(pose => {
          hand.current = pose;
          handFigure.current = select(pose, performance.now());
        });
        if (disposed) stop();
        else camera.current = stop;
      } catch {
        camera.current = null;
      }
    }
    function locate(e: PointerEvent) {
      p.x = e.clientX / window.innerWidth;
      p.y = e.clientY / window.innerHeight;
      p.used = performance.now();
    }
    let startX = 0, startY = 0;
    function down(e: PointerEvent) {
      if (!e.isPrimary || e.button !== 0) return;
      locate(e);
      keyboardFigure.current = null;
      startX = e.clientX;
      startY = e.clientY;
      p.down = true;
      p.dragging = false;
      p.releasedOpen = false;
      void enableCamera();
    }
    function move(e: PointerEvent) {
      if (!e.isPrimary || keyboardFigure.current !== null) return;
      locate(e);
      if (p.down && Math.hypot(e.clientX - startX, e.clientY - startY) > 10) p.dragging = true;
      p.releasedOpen = false;
    }
    function up(e: PointerEvent) {
      if (!e.isPrimary) return;
      locate(e);
      p.releasedOpen = !p.dragging;
      p.down = p.dragging = false;
    }
    function reset() {
      p.down = p.dragging = false;
      p.used = -Infinity;
      keyboardFigure.current = null;
    }
    function key(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'c') {
        keyboardFigure.current = null;
        void enableCamera();
      }
      if (e.key === 'Escape') reset();
      if (/^[1-5]$/.test(e.key)) {
        keyboardFigure.current = Number(e.key);
      }
    }
    function stopCamera() {
      disposed = true;
      if (typeof camera.current === 'function') camera.current();
      camera.current = null;
      hand.current = null;
    }
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', reset);
    window.addEventListener('blur', reset);
    window.addEventListener('keydown', key);
    window.addEventListener('pagehide', stopCamera);
    const restore = () => { disposed = false; };
    window.addEventListener('pageshow', restore);
    // Re-enter hands-free on browsers where the user already allowed the camera.
    navigator.permissions?.query({name: 'camera' as PermissionName}).then(permission => {
      if (!disposed && permission.state === 'granted') void enableCamera();
    }).catch(() => {});
    return () => {
      stopCamera();
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
      window.removeEventListener('keydown', key);
      window.removeEventListener('pagehide', stopCamera);
      window.removeEventListener('pageshow', restore);
    };
  }, []);

  useFrame(({clock}) => {
    const now = performance.now(), p = pointer.current;
    if (hand.current && keyboardFigure.current === null) {
      Object.assign(input.current, hand.current, {strength: 1, figure: handFigure.current});
    } else if (keyboardFigure.current !== null) {
      Object.assign(input.current, {x: .5, y: .5, gesture: 'stream', openness: .45, strength: 1, tips: undefined, figure: keyboardFigure.current});
    } else if (p.down || now - p.used < 6500) {
      const gesture = p.down && !p.dragging ? 'fist' : p.releasedOpen ? 'open' : 'stream';
      Object.assign(input.current, {x:p.x, y:p.y, gesture, openness: gesture === 'fist' ? 0 : gesture === 'open' ? 1 : 0.45, strength:1, tips:undefined, figure:gesture === 'fist' ? FIST_GREETING : 0});
    } else {
      Object.assign(input.current, preview(clock.elapsedTime));
    }
  }, -2);
  return <Swarm input={input}/>;
}

function App() {
  return <main aria-label="눈결 입자 공간">
    <p className="sr-only" id="instructions">숫자키로 1 눈사람, 2 트리, 3 루돌프, 4 선물 상자, 5 눈송이 별을 고릅니다. Escape로 선택을 풉니다. 화면을 누르고 카메라를 허용하면 펼친 손가락 수로도 고를 수 있습니다. 손을 반 초 멈추면 모양이 만들어집니다. 검지를 움직이면 눈이 손끝을 따라오고, 손바닥을 펼쳐 움직이면 고리로 퍼집니다. 주먹을 쥐거나 화면을 길게 누르면 눈 입자가 루돌프가 끄는 썰매에 탄 산타를 그리고, 그 위에 Merry Christmas를 씁니다.</p>
    <p id="music-help" className="sr-only">크리스마스 팝 라디오를 듣습니다. 음표 버튼으로 플레이어를 열고 접을 수 있습니다. 소리가 들리지 않으면 플레이어에서 재생을 누르세요. M 키로 방송을 켜고 끕니다.</p>
    <Canvas dpr={[1, 1.75]} gl={{alpha: false, antialias: false, powerPreference: 'high-performance'}} aria-label="손동작으로 움직이는 눈 입자" aria-describedby="instructions music-help" tabIndex={0} fallback={<span>WebGL 2를 지원하는 브라우저에서 열어 주세요.</span>}>
      <color attach="background" args={['#03070d']}/>
      <Field/>
    </Canvas>
    <CarolMusic/>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
