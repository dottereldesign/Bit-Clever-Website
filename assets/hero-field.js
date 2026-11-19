// Measured from unobstructed background patches in the supplied reference.
// Regenerate with tools/calibrate-hero.py; coordinates are relative to the hero.
export const HERO_FIELD = Object.freeze({
  dark: [18.130637, 52.283003, 51.061419],
  periwinkle: [183.784579, 198.599435, 242.101468],
  mint: [23.376517, 177.212683, 130.096887],
  fade: {
    x: 0.327591, y: 0.013574, aspect: 1.113856,
    inner: 0.488138, outer: 0.964097,
  },
  glow: {
    x: 1.136491, y: 0.335515,
    radiusX: 0.295590, radiusY: 0.276292,
    opacity: 0.853161, falloff: 1.825499,
  },
  grain: { seed: 27011991, deviation: 3.3, fadePower: 0.7, mint: 0.35 },
});
