"""Check every captured ink frame for fragments, escape, and erased interior.

The alpha support of the finished vector is the containment reference.
Antialias changes within one pixel of its edge are not interior erasures.
Visual review in handwriting-inspector.html complements these checks: one
connected component by itself cannot rule out a bad crossover or pen order.
"""

from pathlib import Path
import json
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
folder = ROOT / ".local/handwriting-audit"
files = sorted(folder.glob("frame-*.png"))
assert len(files) == 340, f"Expected all 340 frames; got {len(files)}"
final_alpha = cv2.imread(str(files[-1]), cv2.IMREAD_UNCHANGED)[:, :, 3]
interior = cv2.erode((final_alpha > 127).astype("uint8"), np.ones((3, 3), "uint8")) > 0
failures, areas = [], []
previous = None
for number, file in enumerate(files):
    alpha = cv2.imread(str(file), cv2.IMREAD_UNCHANGED)[:, :, 3]
    ink = alpha > 127
    components = {}
    for threshold in (16, 127, 240):
        _, _, stats, _ = cv2.connectedComponentsWithStats(
            (alpha > threshold).astype("uint8")
        )
        fragments = sorted((int(row[4]) for row in stats[1:]), reverse=True)[1:]
        if fragments:
            components[str(threshold)] = fragments
    outside = int(np.count_nonzero((alpha > 16) & (final_alpha == 0)))
    erased = (
        0 if previous is None else int(np.count_nonzero(previous & ~ink & interior))
    )
    if components or outside or erased:
        failures.append(
            dict(frame=number, fragments=components, outside=outside, erased=erased)
        )
    areas.append(int(ink.sum()))
    previous = ink
report = dict(
    frames=len(files),
    fps=60,
    width=1824,
    height=520,
    failures=failures,
    finalArea=areas[-1],
    finalHandoffPixels=areas[318] - areas[317],
)
(folder / "report.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
assert not failures, "Frame audit failed; inspect report.json and the frame inspector."
