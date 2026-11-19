import { HERO_FIELD as field } from './hero-field.js';

const canvas = document.querySelector('.hero__background');
const context = canvas?.getContext('2d', { alpha: false });

const variations = [
  ['Original',1,1,true,.7], ['Whisper',.45,1,true,.7],
  ['Fine film',.8,.65,true,.7], ['Crisp grain',.85,1,false,.7],
  ['Soft film',1,1.6,true,.7], ['Rich grain',1.8,1,true,.7],
  ['Coarse film',1.4,2.4,true,.7], ['Sand',1.5,.8,false,.7],
  ['Even grain',.9,1,true,0], ['Deep texture',2.3,1.7,true,.4],
].map(([name,strength,size,soft,fade]) => ({name,strength,size,soft,fade}));
let selected = 0;
let renderedSettings = "";
let strength = 1;
let grainSize = 1;

// A seamless, repeatable monochrome grain. The 2x2 filter matches the
// reference's soft, one-pixel grain instead of adding sharp digital speckles.
function makeGrain(seed, size = 512, soft = true) {
  const white = new Float32Array(size * size);
  const filtered = new Float32Array(size * size);
  let state = seed >>> 0;
  for (let i = 0; i < white.length; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    white[i] = ((state >>> 0) / 4294967296 - 0.5) * Math.sqrt(12);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nextX = (x + 1) % size;
      const nextY = ((y + 1) % size) * size;
      filtered[y * size + x] = (
        white[y * size + x] + white[y * size + nextX]
        + white[nextY + x] + white[nextY + nextX]
      ) / 2;
    }
  }
  return { pixels: soft ? filtered : white, size };
}

function render() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;

  // Keep the grain the same size in CSS pixels on phones and retina screens.
  // A bounded backing store also keeps very large displays inexpensive.
  const scale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (width * height)));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const settingsKey = [selected, strength, grainSize].join(":");
  if (canvas.width === w && canvas.height === h && canvas.dataset.rendered && renderedSettings === settingsKey) return;
  canvas.width = w;
  canvas.height = h;

  const frame = context.createImageData(w, h);
  const pixels = frame.data;
  const { dark, periwinkle, mint, fade, glow, grain: grainSettings } = field;
  const variant = variations[selected];
  const grain = makeGrain(grainSettings.seed, 512, variant.soft);
  const noiseSize = grain.size;
  const stretchX = width / w;
  const stretchY = height / h;
  // Keep the reference artboard proportional. Smaller viewports reveal a
  // centered crop; larger viewports scale it uniformly, never stretch it.
  const artScale = Math.max(1, width / 795, height / 648);
  const artWidth = 795 * artScale;
  const artHeight = 648 * artScale;
  const cropX = (artWidth - width) / 2;
  const cropY = (artHeight - height) / 2;
  const xValues = new Float64Array(w);
  const glowXValues = new Float64Array(w);
  const noiseX = new Uint16Array(w);
  const noiseMixX = new Float32Array(w);

  for (let x = 0; x < w; x++) {
    const u = (x * stretchX + cropX) / (artWidth - artScale);
    xValues[x] = ((u - fade.x) * fade.aspect) ** 2;
    glowXValues[x] = ((u - glow.x) / glow.radiusX) ** 2;
    const nx = x * stretchX / grainSize;
    noiseX[x] = Math.floor(nx) % noiseSize;
    noiseMixX[x] = nx - Math.floor(nx);
  }

  for (let y = 0; y < h; y++) {
    const v = (y * stretchY + cropY) / (artHeight - artScale);
    const fadeY = (v - fade.y) ** 2;
    const glowY = ((v - glow.y) / glow.radiusY) ** 2;
    const ny = y * stretchY / grainSize;
    const row = Math.floor(ny) % noiseSize;
    const nextRow = ((row + 1) % noiseSize) * noiseSize;
    const rowOffset = row * noiseSize;
    const mixY = ny - Math.floor(ny);

    for (let x = 0; x < w; x++) {
      const blue = Math.max(0, Math.min(1,
        (Math.sqrt(xValues[x] + fadeY) - fade.inner) / (fade.outer - fade.inner)));
      const green = glow.opacity * Math.exp(-((glowXValues[x] + glowY) ** glow.falloff));
      const nx = noiseX[x];
      const nextX = (nx + 1) % noiseSize;
      const mixX = noiseMixX[x];
      const a = grain.pixels[rowOffset + nx] * (1 - mixX) + grain.pixels[rowOffset + nextX] * mixX;
      const b = grain.pixels[nextRow + nx] * (1 - mixX) + grain.pixels[nextRow + nextX] * mixX;
      const noise = (a * (1 - mixY) + b * mixY)
        * (grainSettings.deviation * ((1 - blue) ** variant.fade) + grainSettings.mint * green) * strength;
      const offset = (y * w + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const base = dark[channel] + (periwinkle[channel] - dark[channel]) * blue;
        pixels[offset + channel] = base * (1 - green) + mint[channel] * green + noise;
      }
      pixels[offset + 3] = 255;
    }
  }

  context.putImageData(frame, 0, 0);
  canvas.dataset.rendered = 'true';
  renderedSettings = settingsKey;
  canvas.dataset.settings = settingsKey;
  canvas.dataset.variation = String(selected);
}

if (context) {
  let pendingFrame;
  const scheduleRender = () => {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(render);
  };
  new ResizeObserver(scheduleRender).observe(canvas);
  window.addEventListener('resize', scheduleRender, { passive: true });

  const picker = document.querySelector('.noise-picker');
  const options = picker.querySelector('.noise-presets');
  const name = document.querySelector('#noise-name');
  try {
    const saved = Number(localStorage.getItem('hero-noise-variation'));
    if (Number.isInteger(saved) && saved >= 0 && saved < variations.length) selected = saved;
  } catch {}

  strength = variations[selected].strength;
  grainSize = variations[selected].size;
  try {
    const saved = JSON.parse(localStorage.getItem('hero-noise-tuning'));
    if (saved && saved.preset === selected) {
      if (Number.isFinite(saved.strength)) strength = Math.max(0, Math.min(4, saved.strength));
      if (Number.isFinite(saved.size)) grainSize = Math.max(.25, Math.min(4, saved.size));
    }
  } catch {}
  const strengthInput = document.querySelector('#noise-strength');
  const sizeInput = document.querySelector('#noise-size');
  const syncControls = () => {
    strengthInput.value = strength;
    sizeInput.value = grainSize;
    document.querySelector('#strength-value').textContent = Math.round(strength * 100) + '%';
    document.querySelector('#size-value').textContent = grainSize.toFixed(2) + 'x';
    const modified = strength !== variations[selected].strength || grainSize !== variations[selected].size;
    name.textContent = variations[selected].name + (modified ? ' (custom)' : '');
  };
  const saveTuning = () => {
    try { localStorage.setItem('hero-noise-tuning', JSON.stringify({preset: selected, strength, size: grainSize})); } catch {}
  };
  [strengthInput, sizeInput].forEach(input => input.addEventListener('input', () => {
    strength = Number(strengthInput.value);
    grainSize = Number(sizeInput.value);
    syncControls();
    saveTuning();
    scheduleRender();
  }));
  const buttons = variations.map((variation, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = variation.name;
    button.setAttribute('aria-pressed', String(selected === index));
    button.addEventListener('click', () => {
      selected = index;
      strength = variation.strength;
      grainSize = variation.size;
      syncControls();
      saveTuning();
      buttons.forEach((item, i) => item.setAttribute('aria-pressed', String(i === index)));
      try { localStorage.setItem('hero-noise-variation', String(index)); } catch {}
      scheduleRender();
    });
    options.append(button);
    return button;
  });
  syncControls();
  picker.hidden = false;
  document.addEventListener('pointerdown', event => {
    if (!picker.contains(event.target)) picker.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && picker.open) {
      picker.open = false;
      picker.querySelector('summary').focus();
    }
  });
  scheduleRender();
}
