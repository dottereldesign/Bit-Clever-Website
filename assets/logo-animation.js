import { createBitIntro, bitVariations } from './bit-intro.js';
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
  let itSize = 80;
  const itSizes = [65, 70, 75, 80, 85];
  try { const saved = Number(localStorage.getItem('bit-clever-it-size-v2')); if (itSizes.includes(saved)) itSize = saved; } catch {}
  const itSelect = document.querySelector('#it-size');
  itSizes.forEach(value => itSelect.add(new Option(`it ${value}%`, value)));
  itSelect.value = itSize;
  let sizeRequest = 0;
  const setArtwork = (svg) => {
    intro?.remove();
    paint = createHandwritingPainter(canvas, svg, data);
    intro = createBitIntro(replay, svg);
    logo.src = `./assets/bit-clever-logo-white-${itSize}.svg`;
    document.querySelector('.site-logo img').src = `./assets/bit-clever-logo-black-${itSize}.svg`;
  };
  itSelect.addEventListener('change', async () => {
    const token = ++sizeRequest;
    const selected = Number(itSelect.value);
    try {
      const response = await fetch(new URL(`./bit-clever-logo-white-${selected}.svg`, import.meta.url));
      if (!response.ok) throw new Error('Logo unavailable');
      const svg = await response.text();
      if (token !== sizeRequest) return;
      itSize = selected;
      try { localStorage.setItem('bit-clever-it-size-v2', String(itSize)); } catch {}
      setArtwork(svg);
      if (reducedMotion.matches) finish(); else play();
    } catch { itSelect.value = itSize; }
  });
  const moveSpeeds = [1, 1.25, 1.5, 2, 2.5];
  let moveSpeed = 1.5;
  try { const saved = Number(localStorage.getItem('bit-clever-move-speed')); if (moveSpeeds.includes(saved)) moveSpeed = saved; } catch {}
  const moveSelect = document.querySelector('#bit-move-speed');
  moveSpeeds.forEach(value => moveSelect.add(new Option(`B move ${value}\u00d7`, value)));
  moveSelect.value = moveSpeed;
  moveSelect.addEventListener('change', () => {
    moveSpeed = Number(moveSelect.value);
    try { localStorage.setItem('bit-clever-move-speed', String(moveSpeed)); } catch {}
    play();
  });
  let intro, wall = 0, variation = 'reboundGlance';
  try { const saved = localStorage.getItem('bit-clever-intro-v2'); if (saved in bitVariations) variation = saved; } catch {}
  const introSelect = document.querySelector('#bit-style');
  for (const [value, item] of Object.entries(bitVariations)) { const option = document.createElement('option'); option.value = value; option.textContent = item.name; introSelect.append(option); }
  introSelect.value = variation;
  introSelect.addEventListener('change', () => { variation = introSelect.value; try { localStorage.setItem('bit-clever-intro-v2', variation); } catch {} play(); });
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
    intro?.hide();
    replay.dataset.handwriting = 'complete';
    message.show();
  };
  const size = () => {
    const rect = logo.getBoundingClientRect();
    // Match high-density phones instead of upscaling a capped 2x bitmap.
    const scale = Math.max(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.ceil(rect.width * scale));
    const height = Math.max(1, Math.ceil(rect.height * scale));
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
  const writingDuration = () => (data.inkEnd - data.route[0][3]) / speed;
  const revealAt = () => bitVariations[variation].drop * .64 + writingDuration() + .7;
  const draw = () => {
    paint(elapsed, { eyeStyle, eyeProgress, hideBit: true });
    intro.paint(wall, revealAt(), variation, moveSpeed);
  };
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
    wall = (now - started) / 1000;
    const writing = Math.max(0, wall - bitVariations[variation].drop * .64);
    elapsed = wall < bitVariations[variation].drop * .64 ? 0 : Math.min(data.inkEnd, data.route[0][3] + writing * speed);
    eyeProgress = Math.max(0, Math.min(1, (writing - writingDuration() - .08) / .62));
    draw();
    if (wall >= revealAt() + bitVariations[variation].slide / moveSpeed) finish();
    else request = requestAnimationFrame(tick);
  };
  const play = () => {
    if (reducedMotion.matches || !paint) return;
    cancelAnimationFrame(request);
    message.reset();
    elapsed = 0;
    wall = 0;
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
  // A monitor/zoom change can alter pixel density without changing CSS size.
  let densityQuery;
  const watchDensity = () => {
    densityQuery?.removeEventListener('change', densityChanged);
    densityQuery = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    densityQuery.addEventListener('change', densityChanged);
  };
  const densityChanged = () => { size(); watchDensity(); };
  watchDensity();
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
    fetch(new URL(`./bit-clever-logo-white-${itSize}.svg`, import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Logo unavailable');
      return response.text();
    }),
    fetch(new URL('./handwriting-data.json', import.meta.url)).then(response => {
      if (!response.ok) throw new Error('Handwriting unavailable');
      return response.json();
    }),
  ]).then(([svg, strokes]) => {
    data = strokes;
    setArtwork(svg);
    setupSpeedControls();
    if (reducedMotion.matches) finish();
    else play();
  }).catch(error => {
    finish();
    console.warn('Showing the static Bit Clever logo:', error);
  });
}
