import { createHandwritingPainter } from './handwriting-renderer.js';

const replay = document.querySelector('.hero__brand');
const logo = replay?.querySelector('.hero__logo');

if (logo) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__handwriting';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  replay.append(canvas);
  let paint, data, request = 0, started = 0, elapsed = 0;

  const finish = () => {
    cancelAnimationFrame(request);
    request = 0;
    canvas.hidden = true;
    replay.dataset.handwriting = 'complete';
  };
  const size = () => {
    const rect = logo.getBoundingClientRect();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      if (paint && !canvas.hidden) paint(elapsed);
    }
  };
  const tick = now => {
    elapsed = Math.min(data.duration, (now - started) / 1000);
    paint(elapsed);
    if (elapsed >= data.duration) finish();
    else request = requestAnimationFrame(tick);
  };
  const play = () => {
    if (reducedMotion.matches || !paint) return;
    cancelAnimationFrame(request);
    elapsed = 0;
    size();
    paint(0);
    canvas.hidden = false;
    replay.dataset.handwriting = 'playing';
    started = performance.now();
    request = requestAnimationFrame(tick);
  };
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finish();
  });
  replay.addEventListener('click', play);
  new ResizeObserver(size).observe(replay);
  if (reducedMotion.matches) finish();

  Promise.all([
    fetch(new URL('./bit-clever-logo-white.svg', import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Logo unavailable');
      return response.text();
    }),
    fetch(new URL('./handwriting-data.json', import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Handwriting unavailable');
      return response.json();
    }),
  ]).then(([svg, strokes]) => {
    data = strokes;
    paint = createHandwritingPainter(canvas, svg, data);
    if (reducedMotion.matches) finish();
    else play();
  }).catch(error => {
    finish();
    console.warn('Showing the static Bit Clever logo:', error);
  });
}
