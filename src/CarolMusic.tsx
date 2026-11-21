import { useEffect, useRef, useState } from 'react';

const preference = 'nungyeol.carols.off';
const station = 'https://tunein.com/embed/player/s187220/?autoplay=true&background=dark';

export default function CarolMusic() {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(preference) !== '1'; } catch { return true; }
  });
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  function switchRadio(on: boolean) {
    setEnabled(on);
    setConnected(on);
    setExpanded(on);
    try { localStorage.setItem(preference, on ? '0' : '1'); } catch { /* Keep the choice for this visit. */ }
  }

  useEffect(() => {
    if (!enabled || connected) return;
    // Wait for audio activation before loading the live player so the first gesture never restarts a playing station.
    let probe: AudioContext | undefined;
    const connect = () => setConnected(true);
    const key = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() !== 'm') connect();
    };
    try {
      probe = new AudioContext();
      if (probe.state === 'running') connect();
      else {
        probe.onstatechange = () => { if (probe?.state === 'running') connect(); };
        void probe.resume().catch(() => {});
      }
    } catch { connect(); }
    window.addEventListener('pointerup', connect);
    window.addEventListener('click', connect);
    window.addEventListener('keydown', key);
    return () => {
      if (probe) {
        probe.onstatechange = null;
        void probe.close().catch(() => {});
      }
      window.removeEventListener('pointerup', connect);
      window.removeEventListener('click', connect);
      window.removeEventListener('keydown', key);
    };
  }, [enabled, connected]);

  useEffect(() => {
    const control = button.current!;
    let timer = 0;
    function wake() {
      control.dataset.awake = '';
      clearTimeout(timer);
      timer = window.setTimeout(() => { delete control.dataset.awake; }, 3000);
    }
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.key.toLowerCase() === 'm') switchRadio(!enabled);
      if (event.key === 'Escape') setExpanded(false);
      wake();
    }
    wake();
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled]);

  const label = !enabled ? '팝 라디오 켜기' : expanded ? '팝 라디오 접기' : '팝 라디오 열기';
  return <div className="radio-dock" onPointerDown={e => e.stopPropagation()}
    onPointerMove={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}>
    <div id="radio-player" className="radio-panel" hidden={!expanded}>
      {enabled && connected && <iframe src={station} title="Christmas Hits Kerstradio 라이브 플레이어"
        allow="autoplay" referrerPolicy="strict-origin-when-cross-origin" />}
      <div className="radio-actions">
        <a href="https://player.christmashits.net/" target="_blank" rel="noopener noreferrer">방송국에서 듣기 ↗</a>
        <button type="button" onClick={() => { switchRadio(false); button.current?.focus(); }}>라디오 끄기</button>
      </div>
    </div>
    <button ref={button} type="button" className="carol-control" aria-expanded={expanded}
      aria-controls="radio-player" aria-label={label} title={label} data-playing={enabled}
      onClick={() => {
        if (!enabled) switchRadio(true);
        else { setConnected(true); setExpanded(!expanded); }
      }}>
      <span aria-hidden="true">♫</span>
    </button>
  </div>;
}
