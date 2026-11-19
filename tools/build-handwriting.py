"""Build the hero's handwriting SVG from the approved static logo.

The stroke masks follow pen travel, not the outer contour of the filled letters.
Clipping each stroke to its own joining region prevents neighboring letters
from appearing early when the broad brush passes a crossover.
"""
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
source = ET.fromstring((ROOT / 'assets/bit-clever-logo-white.svg').read_text(encoding='utf-8'))
paths = source.findall('{http://www.w3.org/2000/svg}path')
parts = re.findall(r'M[^M]+', paths[0].attrib['d'])
# Approved source: Clever outline and counters, then B, i dot, t, i stem.
assert len(parts) == 8
clever = ' '.join(parts[:4])
bit = ' '.join(parts[4:])
# First two eye groups belong to B; the last two to C.
groups = source.findall('{http://www.w3.org/2000/svg}g')
assert len(groups) == 4
def eye_markup(groups):
    return ''.join(ET.tostring(g, encoding='unicode').replace('ns0:', '').replace(':ns0', '') for g in groups)

# name, pen centreline, brush width, clipping limits, delay, duration (seconds).
strokes = [
    ('C', 'M291 83 C304 79 314 59 299 47 C279 30 251 48 235 72 C221 92 216 119 233 133 C245 144 261 142 277 137', 30, 210, 315, .35, 1.13),
    ('C-exit', 'M277 137 C286 134 295 129 302 125', 10, 210, 315, 1.48, .17),
    # l is a counterclockwise loop: thin rising entry on the right, curl
    # over the apex, then a heavier descending stem and exit on the left.
    ('l-up', 'M298 127 C310 120 330 102 335 86 C340 73 329 74 324 82', 9, 298, 343, 1.65, .40),
    ('l-down', 'M324 82 C315 93 306 115 310 128 C314 141 331 134 341 120', 24, 300, 343, 2.05, .26),
    ('e-first', 'M340 120 C351 119 367 106 362 99 C351 87 334 109 342 127 C350 142 368 130 373 121', 23, 338, 374, 2.31, .51),
    ('v', 'M373 121 C375 113 377 104 377 99 C374 114 374 134 385 132 C397 129 405 104 403 97 C400 89 394 101 403 110 C408 117 414 117 418 116', 25, 372, 417, 2.82, .57),
    ('e-second', 'M418 116 C431 116 444 105 437 98 C426 87 414 110 420 125 C428 143 448 128 458 110', 23, 415, 450, 3.39, .51),
    ('r', 'M451 118 C460 104 466 85 458 82 C451 80 455 96 465 94 C483 87 483 100 476 110 C455 139 477 145 494 116', 20, 448, 503, 3.90, .72),
]
definitions = []
mask_paths = []
entry_paths = []
for name, d, width, left, right, delay, duration in strokes:
    boundary = f'<rect x="{left}" y="25" width="{right-left}" height="135"/>'
    definitions.append(f'<clipPath id="clip-{name}">{boundary}</clipPath>')
    if name in ('C-exit', 'l-up'):
        # A real pen ribbon at the crossover avoids prematurely exposing the
        # shared downstroke's outline. It is replaced by the exact filled
        # joining region as the descending stroke completes.
        entry_width = 12 if name == 'C-exit' else 10.5
        entry_paths.append(f'<path class="pen entry" data-letter="{name}" pathLength="1" d="{d}" stroke-width="{entry_width}" style="--delay:{delay}s;--duration:{duration}s"/>')
    else:
        mask_paths.append(f'<path class="pen" data-letter="{name}" pathLength="1" d="{d}" stroke-width="{width}" clip-path="url(#clip-{name})" style="--delay:{delay}s;--duration:{duration}s"/>')
definitions.append('<clipPath id="finished-loop"><path d="M210 25H344V97L332 114L340 134V160H210Z"/></clipPath>')
mask_paths.append('<g class="loop-finish" clip-path="url(#finished-loop)"><rect x="210" y="25" width="134" height="135" fill="white"/></g>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="52 28 456 130" fill="none" role="img" aria-labelledby="logo-title">
<title id="logo-title">Bit Clever</title>
<desc>Clever writes on from the top-right tip of C through the connected letters to the r. Its eyes appear after the writing.</desc>
<style>
  .pen {{ fill:none;stroke:white;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1.01;stroke-dashoffset:1;opacity:0;animation:write var(--duration) linear calc(var(--delay) - var(--seek, 0s)) forwards; }}
  .entries {{ animation:hide-entry .01s linear calc(2.32s - var(--seek, 0s)) forwards; }}
  .loop-finish {{ opacity:0;animation:complete-loop .01s linear calc(2.31s - var(--seek, 0s)) forwards; }}
  @keyframes hide-entry {{ to {{opacity:0}} }}
  @keyframes complete-loop {{ to {{opacity:1}} }}
  .script {{ animation:finish .01s linear calc(4.64s - var(--seek, 0s)) forwards; }}
  .eyes {{ opacity:0;transform-box:fill-box;transform-origin:center;animation:eyes .38s cubic-bezier(.2,.8,.2,1) calc(4.82s - var(--seek, 0s)) forwards; }}
  @keyframes write {{ 0% {{opacity:1;stroke-dashoffset:1}} 100% {{opacity:1;stroke-dashoffset:0}} }}
  @keyframes finish {{ to {{mask:none}} }}
  @keyframes eyes {{ from {{opacity:0;transform:translateY(2px) scale(.8)}} to {{opacity:1;transform:translateY(0) scale(1)}} }}
  @media (prefers-reduced-motion:reduce) {{ .script {{mask:none;animation:none}} .eyes {{opacity:1;animation:none}} .pen {{animation:none}} .entries {{display:none}} }}
</style>
<defs>
{''.join(definitions)}
<mask id="handwriting" maskUnits="userSpaceOnUse" x="210" y="25" width="295" height="135" style="mask-type:luminance">
{''.join(mask_paths)}
</mask>
</defs>
<path fill="#fff" fill-rule="evenodd" d="{bit}"/>
{eye_markup(groups[:2])}
<path class="script" mask="url(#handwriting)" fill="#fff" fill-rule="evenodd" d="{clever}"/>
<g class="entries">{''.join(entry_paths)}</g>
<g class="eyes">{eye_markup(groups[2:])}</g>
</svg>
'''
(ROOT / 'assets/bit-clever-logo-animated.svg').write_text(svg, encoding='utf-8')
print('Built handwriting animation: C > l > e > v > e > r > eyes (5.2 seconds).')
