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

A fullscreen hero with the Bit Clever identity and a background matching the supplied Apollo reference. Serve
this directory with any static web server; no build step or runtime dependencies
are needed. GitHub Pages serves `main` directly.

The background uses a measured petrol-to-periwinkle elliptical fade, a mint glow
at the right edge, and deterministic monochrome grain. The grain is softened by a
2×2 filter and fades with the colour field. It stays the same size in CSS pixels
across device resolutions. The canvas redraws when dimensions or noise settings change;
it has no animation loop. CSS gradients provide a fallback without JavaScript.

`assets/hero-field.js` contains the colour and grain controls, and
`assets/hero-background.js` coordinates a module worker (`hero-worker.js` / `hero-raster.js`) that renders them without blocking the logo animation. A main-thread fallback supports browsers without workers. The colour regions stay anchored to the hero: petrol at the top,
mint on the right, periwinkle at the bottom. Both axes of each gradient use the
same height-based scale, preserving its shape instead of stretching or cropping
away the right glow. A white header
contains the black Bit Clever logo and contact button (destination to be added).

## Appearance controls

The circular button sits 8px from the bottom and right. Its panel contains only
eight dropdowns: it size, B landing, B move style, B move speed, eye entrance, drawing speed, Coming soon entrance, and noise. Defaults are Playful
wiggle, 3x, and Whisper. All ten eye entrances, six drawing speeds, and ten noise presets
remain available. Choices persist in each browser. These new defaults replace
older saved preferences once; subsequent selections are remembered.

Noise defaults live in `assets/noise-defaults.json`. The former sliders and save
button are removed from the minimal panel.

## Hero handwriting

The hero's Clever lettering writes on once per page load. Click or keyboard-activate
the hero logo to replay it. The header logo stays static; B lands first and moves left after the writing and eye entrance. Pen travel starts
at the C's upper-right terminal, follows the C bowl into the l loop, then the e,
v, second e, and r exit. The C eyes appear after the last stroke. The sequence
takes about 3.6 seconds with the default landing, 3x drawing and 1.5x leap.
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

The optional offline tool fits the colours from 1,281 unobstructed 9×9 patches.
It excludes the person, lettering, cards, grid lines, and black left gutter. It
reports a separate 20% holdout result before fitting all patches. The original
reference image is not distributed in this repository. Hidden areas are a smooth
reconstruction, and the grain matches the texture rather than its random seed.

```powershell
python -m pip install -r tools/requirements.txt
python tools/calibrate-hero.py --reference "path/to/original-961x648.png" --output assets/hero-field.js
```

Pass `--render path/to/screenshot.png` to measure a 795×648 browser render against
the same exposed patches, and `--report path/to/report.json` to save the results.
The script's sampling mask is specific to this reference. If the fitted palette
changes substantially, also update the fallback gradients in `index.html`.

The motion menu has three independent sets of ten presets:

- **B landing:** Rubber bounce (default), Cartoon plop, Jelly wobble, Heavy squish,
  Superball, Feather bounce, Pogo pop, Wobbly knees, Soft little boing, Corkscrew settle.
- **C eyes:** Wake-up blink, Double take, Cheeky wink, Sleepy peek, Wide-eyed hello,
  Happy squint, Cute bump, Knowing glance, Rubber blink, Playful wiggle (default).
- **B move:** Side glance, Leap back (default), Spring back, Quick snap, Quick hop,
  Elastic pullback, Skid to a stop, Wind-up release, Two little hops, Silky glide.

Choices replay immediately and persist locally. B stretches during its accelerating
fall, compresses on contact and rebounds with diminishing motion. Clever starts on
first contact; its drawing path and pace are unchanged. Both C eyes start together
0.08 seconds after the last pen stroke, finishing their entrance 0.62 seconds later.
B then moves left, revealing the stationary it under the opaque B using SVG paint order.
All poses settle to the exact static artwork. Reduced motion shows the static logo.

“Coming soon” follows the B reveal. Its six entrance presets are Gentle rise,
Quiet fade, Focus in (default), Soft bounce, Typewriter, and Letter cascade.

The it size menu offers 65%, 70%, 75%, 80% (default), and 85%. Every size
keeps a 6-unit B–i gap and the original t–C spacing. The letters remain
stationary during the reveal; the selected size is remembered locally.
The bottom of it aligns precisely with the bottom of B at every size.

B lands six logo units farther left. Its independent move speed offers 1×,
1.25×, 1.5× (default), 2×, and 2.5×, without changing landing or handwriting timing.

`tools/check-bit-intro.cjs` samples each motion frame, validates all 30 presets and
sequence timing, and saves 120 review frames under `.local/`.

## Performance audit tools

The site has no runtime packages or build step. Audit tools are optional and use
headless Chrome; they do not control your mouse or existing tabs.

- `tools/run-lighthouse.ps1`: three sequential mobile and desktop runs against the
  live URL, writing JSON and HTML into `.local/`. Pass `-Stage stable-before` or
  `-Stage stable-after`. It accepts paths to Node, Lighthouse and Chrome.
- `tools/summarize-lighthouse.py`: generate the local HTML audit summary from those
  matched reports and `.local/responsive-after.json`.
- `tools/audit-responsive.cjs [url] [output.json]`: twelve viewport checks, including
  placeholder buttons, overflow, header spacing and the settings panel.
- `tools/check-background.cjs`: compare background pixels with the accepted
  pre-audit renderer and check the worker fallback.

Lighthouse 13.6.0 requires Node 22.19 or newer. This audit used an isolated Node
22.21.1 and Lighthouse install inside ignored `.local/audit-runtime`; no global
Node settings or production dependencies were changed. The Playwright checks use
`PLAYWRIGHT_MODULE` to resolve an existing install, or the `playwright` package.
The final scores are lab results, not field Core Web Vitals.

## Typography

All interface text uses self-hosted Inter (variable weight 100–900). The Latin
subset includes macrons, extended Latin characters, and punctuation. Its SIL Open
Font License is included in `assets/fonts/OFL.txt`. Source: https://rsms.me/inter/.
The SVG logos retain their custom lettering.

## Pages

`services.html`, `pricing.html`, `portfolio.html`, `about.html`, and `contact.html`
are static heading-only pages with the shared header and footer. All pages use
`assets/site.css` and `assets/site.js`. Request a Quote returns to the homepage
form with smooth scrolling, respecting reduced-motion preferences. Relative URLs
work both locally and under the GitHub Pages repository path.
