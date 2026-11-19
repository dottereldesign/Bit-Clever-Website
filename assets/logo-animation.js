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
  const speeds = [1, 1.5, 2, 2.5, 3, 4];
  const storageKey = 'bit-clever-handwriting-speed-v1';
  const picker = document.querySelector('.speed-picker');
  const noisePicker = document.querySelector('.noise-picker');
  let speed = 2;
  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (speeds.includes(saved)) speed = saved;
  } catch { /* The controls also work when browser storage is unavailable. */ }

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
    elapsed = Math.min(data.duration, (now - started) * speed / 1000);
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
    updateSpeedControls();
  });
  replay.addEventListener('click', play);
  new ResizeObserver(size).observe(replay);
  if (reducedMotion.matches) finish();

  function updateSpeedControls() {
    if (!picker) return;
    picker.querySelector('#drawing-speed').textContent = `${speed}×`;
    picker.querySelector('#speed-help').textContent = reducedMotion.matches
      ? 'Reduced motion is on; the logo stays still.'
      : 'Natural pen rhythm · choose a speed to replay.';
    for (const button of picker.querySelectorAll('[data-speed]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === speed));
    }
  }

  function setupSpeedControls() {
    if (!picker) return;
    const presets = picker.querySelector('.speed-presets');
    for (const value of speeds) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.speed = value;
      const label = document.createElement('span');
      label.textContent = value === 1 ? '1× · Unhurried' : `${value}×`;
      const duration = document.createElement('span');
      duration.className = 'speed-duration';
      duration.textContent = `${(data.duration / value).toFixed(1)}s`;
      button.append(label, duration);
      button.addEventListener('click', () => {
        speed = value;
        try { localStorage.setItem(storageKey, String(speed)); } catch { /* Optional persistence. */ }
        updateSpeedControls();
        picker.open = false;
        picker.querySelector('summary').focus({ preventScroll: true });
        play();
      });
      presets.append(button);
    }
    // Only one tuning menu is open at a time so they don't cover each other.
    picker.addEventListener('toggle', () => {
      if (picker.open && noisePicker) noisePicker.open = false;
    });
    noisePicker?.addEventListener('toggle', () => {
      if (noisePicker.open) picker.open = false;
    });
    picker.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        picker.open = false;
        picker.querySelector('summary').focus();
      }
    });
    updateSpeedControls();
    picker.hidden = false;
  }

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
    setupSpeedControls();
    if (reducedMotion.matches) finish();
    else play();
  }).catch(error => {
    finish();
    console.warn('Showing the static Bit Clever logo:', error);
  });
}
