import { HERO_FIELD as field } from './hero-field.js';

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

export function renderPixels({width, height, w, h, variant, strength, grainSize}) {
  const pixels = new Uint8ClampedArray(w * h * 4);
  const { dark, periwinkle, mint, fade, glow, grain: grainSettings } = field;
  const grain = makeGrain(grainSettings.seed, 512, variant.soft);
  const noiseSize = grain.size;
  const stretchX = width / w;
  const stretchY = height / h;
  // Anchor the colour regions to the hero, but measure both axes in the
  // same physical units so the gradient shapes never become skinny.
  const referenceWidth = height * 795 / 648;
  const xValues = new Float64Array(w);
  const glowXValues = new Float64Array(w);
  const noiseX = new Uint16Array(w);
  const noiseMixX = new Float32Array(w);

  for (let x = 0; x < w; x++) {
    const px = x * stretchX;
    const u = (px - width * fade.x) / referenceWidth + fade.x;
    xValues[x] = ((u - fade.x) * fade.aspect) ** 2;
    glowXValues[x] = ((px - width - (glow.x - 1) * referenceWidth) / (referenceWidth * glow.radiusX)) ** 2;
    const nx = x * stretchX / grainSize;
    noiseX[x] = Math.floor(nx) % noiseSize;
    noiseMixX[x] = nx - Math.floor(nx);
  }

  for (let y = 0; y < h; y++) {
    const v = y * stretchY / height;
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

  return pixels;
}
