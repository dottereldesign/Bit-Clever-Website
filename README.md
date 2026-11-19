# Bit Clever

## Local preview

On this Windows machine, double-click **Bit Clever - Website** on the desktop.
The shortcut runs `tools/start-preview.ps1`, starts a hidden local Node server if
needed, and opens http://127.0.0.1:4175 in your default browser. HTML, CSS,
JavaScript, and asset edits automatically reload the page; noise settings remain
saved in the browser. No package installation or build step is required.

Alternatively, run `node tools/preview-server.cjs` and open that URL. The server
binds only to this computer, and the shortcut reuses it on subsequent launches.
This is full-page live reload, not framework component hot replacement.

A fullscreen, background-only hero matching the supplied Apollo reference. Serve
this directory with any static web server; no build step or runtime dependencies
are needed. GitHub Pages serves `main` directly.

The background uses a measured petrol-to-periwinkle elliptical fade, a mint glow
at the right edge, and deterministic monochrome grain. The grain is softened by a
2Ã—2 filter and fades with the colour field. It stays the same size in CSS pixels
across device resolutions. The canvas redraws when dimensions or noise settings change;
it has no animation loop. CSS gradients provide a fallback without JavaScript.

`assets/hero-field.js` contains the colour and grain controls, and
`assets/hero-background.js` renders them. The colour regions stay anchored to the hero: petrol at the top,
mint on the right, periwinkle at the bottom. Both axes of each gradient use the
same height-based scale, preserving its shape instead of stretching or cropping
away the right glow. A white header
contains the black Bit Clever logo and contact button (destination to be added).

## Appearance controls

The circular button sits 8px from the bottom and right. Its panel contains only
five dropdowns: Bit entrance, eye entrance, drawing speed, Coming soon entrance, and noise. Defaults are Playful
wiggle, 3x, and Whisper. All six eye entrances, six speeds, and ten noise presets
remain available. Choices persist in each browser. These new defaults replace
older saved preferences once; subsequent selections are remembered.

Noise defaults live in `assets/noise-defaults.json`. The former sliders and save
button are removed from the minimal panel.

## Hero handwriting

The hero's Clever lettering writes on once per page load. Click or keyboard-activate
the hero logo to replay it. Bit and the header logo stay static. Pen travel starts
at the C's upper-right terminal, follows the C bowl into the l loop, then the e,
v, second e, and r exit. The C eyes appear after the last stroke. The sequence
takes about 2.5 seconds at the default 3x speed, including the eye entrance.
Changing the eye or speed dropdown replays it immediately. Reduced-motion
preferences show the completed logo immediately.

All six speeds use the same natural pen rhythm. The C builds into a broad sweep,
tight loop turns ease back, downstrokes and exits pick up momentum, and the r
finishes with a softer lift. `tools/handwriting_motion.py` combines smoothed path
curvature with authored speed impulses for each stroke, then normalizes the
timing to preserve the preset durations. It changes timing only; ink geometry
and the order of the strokes are unchanged. Speed always stays positive.

The painter follows a variable-width pen route derived from the approved SVG.
Each loop has a continuous rising stroke, turn, descending stroke, and exit.
At intersections, explicit curves prevent the pen from following the wrong
branch or swelling to the width of both strokes. Contour details appear only
after the pen passes them. A final SVG clip keeps all ink inside the approved
lettering. The rendered trail is cached, so each frame draws only new ink.
The completed logo is the original static SVG.

Open `http://127.0.0.1:4175/tools/handwriting-inspector.html` to step through all
340 frames at 60 fps, scrub the timeline, play at quarter speed, or overlay the
approved outline. The inspector uses the same painter as the website.

Optional development tools require Python packages in `tools/requirements.txt`
and Playwright with Chromium. Set `PLAYWRIGHT_MODULE` to an existing Playwright
module path if it is not installed in this checkout. All browser checks are
headless and do not interact with your mouse or browser windows.

```powershell
node tools/handwriting-qa.cjs outline
python tools/build-handwriting.py
node tools/handwriting-qa.cjs frames
python tools/audit-handwriting.py
node tools/check-handwriting.cjs
```

The generator writes `assets/handwriting-data.json`. The frame tool saves all
340 frames at 4x logo resolution and contact sheets under `.local/handwriting-audit`.
The pixel audit checks disconnected ink at three alpha thresholds, ink outside
the final outline, and erased interior pixels. Review the contact sheets as well:
pixel checks alone cannot establish natural pen order or a good-looking join.

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

The eye dropdown offers Cute bump, One then the other, Wake-up blink, Float up, Playful wiggle, and Soft fade. Choices replay immediately and persist in the browser. Eyes enter only after the writing finishes, with a separate 0.7-second finish at every drawing speed. Reduced motion keeps the completed logo still.

“Coming soon” sits below the hero logo and enters after the C eyes finish. Its six entrance presets are Gentle rise, Quiet fade, Focus in (default), Soft bounce, Typewriter, and Letter cascade. Selection replays the full sequence and is remembered. Reduced motion shows the message immediately.

The Bit entrance offers Soft landing (default), Little rebound, Side glance, and
Feather drop. B lands beside C before the unchanged handwriting begins. After
Clever and its eyes finish, B slides left to uncover the clipped “it”. Coming
soon follows the reveal. Reduced motion shows the complete static logo.
