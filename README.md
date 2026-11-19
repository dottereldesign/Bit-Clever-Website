# Bit Clever

A fullscreen, background-only hero matching the supplied Apollo reference. Serve
this directory with any static web server; no build step or runtime dependencies
are needed. GitHub Pages serves `main` directly.

The background uses a measured petrol-to-periwinkle elliptical fade, a mint glow
at the right edge, and deterministic monochrome grain. The grain is softened by a
2Ã—2 filter and fades with the colour field. It stays the same size in CSS pixels
across device resolutions. The canvas redraws only when its dimensions change;
it has no animation loop. CSS gradients provide a fallback without JavaScript.

`assets/hero-field.js` contains the colour and grain controls, and
`assets/hero-background.js` renders them. The artwork uses a 795 x 648 reference artboard, uniformly scaled to cover the
hero and center-cropped on smaller screens without stretching. A white header
contains a placeholder wordmark and contact button (destination to be added).

## Reference calibration

The optional offline tool fits the colours from 1,281 unobstructed 9Ã—9 patches.
It excludes the person, lettering, cards, grid lines, and black left gutter. It
reports a separate 20% holdout result before fitting all patches. The original
reference image is not distributed in this repository. Hidden areas are a smooth
reconstruction, and the grain matches the texture rather than its random seed.

```powershell
python -m pip install -r tools/requirements.txt
python tools/calibrate-hero.py --reference "path/to/original-961x648.png" --output assets/hero-field.js
```

Pass `--render path/to/screenshot.png` to measure a 795Ã—648 browser render against
the same exposed patches, and `--report path/to/report.json` to save the results.
The script's sampling mask is specific to this reference. If the fitted palette
changes substantially, also update the fallback gradients in `index.html`.
