import { createComingSoon } from './coming-soon.js';
import { createHandwritingPainter } from './handwriting-renderer.js';

const replay = document.querySelector('.hero__brand');
const logo = replay?.querySelector('.hero__logo');

if (logo) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const message = createComingSoon(reducedMotion, () => play());
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__handwriting';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  replay.append(canvas);
  let paint, data, request = 0, started = 0, elapsed = 0;
  const speeds = [1, 1.5, 2, 2.5, 3, 4];
  const storageKey = 'bit-clever-handwriting-speed-v2';
  let speed = 3;
  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (speeds.includes(saved)) speed = saved;
  } catch { /* The controls also work when browser storage is unavailable. */ }

  const finish = () => {
    cancelAnimationFrame(request);
    request = 0;
    canvas.hidden = true;
    replay.dataset.handwriting = 'complete';
    message.show();
  };
  const size = () => {
    const rect = logo.getBoundingClientRect();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * scale));
    const height = Math.max(1, Math.round(rect.height * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      if (paint && !canvas.hidden) draw();
    }
  };
  const eyeStyles = { bump: 'Cute bump', stagger: 'One, then the other', blink: 'Wake-up blink', rise: 'Float up', wiggle: 'Playful wiggle', fade: 'Soft fade' };
  let eyeStyle = 'wiggle';
  try { const saved = localStorage.getItem('bit-clever-eye-style-v2'); if (saved in eyeStyles) eyeStyle = saved; } catch {}
  let eyeProgress = 0;
  const draw = () => paint(elapsed, { eyeStyle, eyeProgress });
  const eyeSelect = document.querySelector('#eye-style');
  for (const [value, label] of Object.entries(eyeStyles)) {
    const option = document.createElement('option'); option.value = value; option.textContent = label;
    eyeSelect.append(option);
  }
  eyeSelect.value = eyeStyle;
  eyeSelect.addEventListener('change', () => {
    eyeStyle = eyeSelect.value;
    try { localStorage.setItem('bit-clever-eye-style-v2', eyeStyle); } catch {}
    play();
  });
  const tick = now => {
    const wall = (now - started) / 1000;
    elapsed = Math.min(data.inkEnd, wall * speed);
    eyeProgress = Math.max(0, Math.min(1, (wall - data.inkEnd / speed - .08) / .62));
    draw();
    if (eyeProgress >= 1) finish();
    else request = requestAnimationFrame(tick);
  };
  const play = () => {
    if (reducedMotion.matches || !paint) return;
    cancelAnimationFrame(request);
    message.reset();
    elapsed = 0;
    size();
    eyeProgress = 0;
    draw();
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

  function setupSpeedControls() {
    const select = document.querySelector('#drawing-speed');
    for (const value of speeds) {
      const option = document.createElement('option');
      option.value = value; option.textContent = `${value}\u00d7`;
      select.append(option);
    }
    select.value = speed;
    select.addEventListener('change', () => {
      speed = Number(select.value);
      try { localStorage.setItem(storageKey, String(speed)); } catch {}
      play();
    });
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
