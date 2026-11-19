import { HERO_FIELD as field } from './hero-field.js';

const canvas = document.querySelector('.hero__background');
const context = canvas?.getContext('2d', { alpha: false });

// A seamless, repeatable monochrome grain. The 2x2 filter matches the
// reference's soft, one-pixel grain instead of adding sharp digital speckles.
function makeGrain(seed, size = 512) {
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
  return { pixels: filtered, size };
}

function render() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;

  // Keep the grain the same size in CSS pixels on phones and retina screens.
  // A bounded backing store also keeps very large displays inexpensive.
  const scale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (width * height)));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  if (canvas.width === w && canvas.height === h && canvas.dataset.rendered) return;
  canvas.width = w;
  canvas.height = h;

  const frame = context.createImageData(w, h);
  const pixels = frame.data;
  const { dark, periwinkle, mint, fade, glow, grain: grainSettings } = field;
  const grain = makeGrain(grainSettings.seed);
  const noiseSize = grain.size;
  const stretchX = width / w;
  const stretchY = height / h;
  const xValues = new Float64Array(w);
  const glowXValues = new Float64Array(w);
  const noiseX = new Uint16Array(w);
  const noiseMixX = new Float32Array(w);

  for (let x = 0; x < w; x++) {
    const u = w > 1 ? x / (w - 1) : 0;
    xValues[x] = ((u - fade.x) * fade.aspect) ** 2;
    glowXValues[x] = ((u - glow.x) / glow.radiusX) ** 2;
    const nx = x * stretchX;
    noiseX[x] = Math.floor(nx) % noiseSize;
    noiseMixX[x] = nx - Math.floor(nx);
  }

  for (let y = 0; y < h; y++) {
    const v = h > 1 ? y / (h - 1) : 0;
    const fadeY = (v - fade.y) ** 2;
    const glowY = ((v - glow.y) / glow.radiusY) ** 2;
    const ny = y * stretchY;
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
        * (grainSettings.deviation * ((1 - blue) ** grainSettings.fadePower) + grainSettings.mint * green);
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
}

if (context) {
  let pendingFrame;
  const scheduleRender = () => {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(render);
  };
  new ResizeObserver(scheduleRender).observe(canvas);
  window.addEventListener('resize', scheduleRender, { passive: true });
  scheduleRender();
}
