"""Build pen data from the approved Clever SVG silhouette.

First run `node tools/handwriting-qa.cjs outline` to rasterize the SVG at 8x.
The graph supplies stroke centres and widths. Explicit cubic bridges at
crossovers preserve the current pen stroke instead of following the union
of intersecting strokes. Contour recovery waits until the pen passes.
"""

from pathlib import Path
import heapq
import json
import re
import cv2
import numpy as np
from skimage.morphology import medial_axis
from scipy.spatial import cKDTree
from scipy.ndimage import gaussian_filter1d, map_coordinates
from handwriting_motion import natural_timing

ROOT = Path(__file__).resolve().parents[1]
S = 8
outline = cv2.imread(str(ROOT / ".local/clever-outline.png"), 0)
if outline is None:
    raise FileNotFoundError("Run node tools/handwriting-qa.cjs outline first.")
assert outline.shape == (1080, 2360), "The reference outline must be rendered at 8x."
mask = outline > 127
distance = cv2.distanceTransform(
    mask.astype("uint8"), cv2.DIST_L2, cv2.DIST_MASK_PRECISE
)
sk = medial_axis(mask, rng=0)
full_skeleton = sk.copy()


# Remove short leaf branches caused by the traced contour's tiny irregularities.
def neighbours(p):
    y, x = p
    return [
        (y + dy, x + dx)
        for dy in [-1, 0, 1]
        for dx in [-1, 0, 1]
        if (dy or dx)
        and 0 <= y + dy < sk.shape[0]
        and 0 <= x + dx < sk.shape[1]
        and sk[y + dy, x + dx]
    ]


for _ in range(3):
    ends = [tuple(p) for p in np.argwhere(sk) if len(neighbours(tuple(p))) == 1]
    for start in ends:
        chain = [start]
        prev = None
        p = start
        while len(chain) < S * 5:
            nxt = [q for q in neighbours(p) if q != prev]
            if len(nxt) != 1:
                break
            prev, p = p, nxt[0]
            chain.append(p)
        if len(chain) < S * 5 and len(neighbours(p)) >= 3:
            for q in chain[:-1]:
                sk[q] = False
pixels = np.argwhere(sk)
tree = cKDTree(pixels)
ids = {tuple(p): i for i, p in enumerate(pixels)}
graph = []
for p in pixels:
    graph.append(
        [(ids[q], np.linalg.norm(p - np.array(q))) for q in neighbours(tuple(p))]
    )


def route(start, end):
    if start == end:
        return [start]
    queue = [(0, start)]
    best = {start: 0}
    prior = {}
    while queue:
        cost, i = heapq.heappop(queue)
        if i == end:
            result = [i]
            while i != start:
                i = prior[i]
                result.append(i)
            return result[::-1]
        if cost > best[i]:
            continue
        for j, w in graph[i]:
            n = cost + w
            if n < best.get(j, 1e99):
                best[j] = n
                prior[j] = i
                heapq.heappush(queue, (n, j))
    raise RuntimeError("Disconnected skeleton")


guides = [
    (
        "C",
        "M291 83 C304 79 310 59 299 47 C279 30 251 48 235 72 C221 92 216 119 233 133 C251 149 280 138 298 127",
    ),
    (
        "l",
        "M298 127 C310 120 330 102 335 86 C340 73 329 74 324 82 C315 93 306 115 310 128 C314 141 331 134 341 120",
    ),
    (
        "e1",
        "M341 120 C351 119 367 106 362 99 C351 87 334 109 342 127 C350 142 368 130 373 121",
    ),
    (
        "v",
        "M373 121 C375 113 377 104 377 99 C374 114 374 134 385 132 C397 129 405 104 403 97 C400 89 394 101 403 110 C408 117 414 117 418 116",
    ),
    (
        "e2",
        "M418 116 C431 116 444 105 437 98 C426 87 414 110 420 125 C428 143 448 128 458 110",
    ),
    (
        "r",
        "M458 110 C460 104 466 85 458 82 C451 80 455 96 465 94 C483 87 483 100 476 110 C455 139 477 145 494 116",
    ),
]
result = []
last = None
for label, d in guides:
    commands = re.findall(r"([MC])([^MC]+)", d)
    samples = []
    for cmd, v in commands:
        nums = np.array(list(map(float, v.split()))).reshape(-1, 2)
        if cmd == "M":
            point = nums[0]
            samples.append(point)
            continue
        p1, p2, p3 = nums
        t = np.linspace(0, 1, 100)[:, None]
        b = (
            (1 - t) ** 3 * point
            + 3 * (1 - t) ** 2 * t * p1
            + 3 * (1 - t) * t * t * p2
            + t**3 * p3
        )
        samples.extend(b[1:])
        point = p3
    sampleids = tree.query([(np.array(p) - [210, 25])[::-1] * S for p in samples])[1]
    ordered = []
    for node in sampleids:
        if last is None:
            ordered.append(int(node))
        else:
            ordered.extend(route(last, int(node))[1:])
        last = int(node)
    coords = pixels[ordered][:, ::-1] / S + [210, 25]
    # Average the raster skeleton gently; width is recomputed inside the true outline.
    coords = gaussian_filter1d(coords, 3, axis=0, mode="nearest")
    rs = (
        map_coordinates(
            distance, [(coords[:, 1] - 25) * S, (coords[:, 0] - 210) * S], order=1
        )
        / S
    )
    for p, r in zip(coords, rs):
        result.append([*p, max(0.05, r + 0.18), label])
out = []
for p in result:
    if not out or np.linalg.norm(np.array(p[:2]) - np.array(out[-1][:2])) > 0.23:
        out.append(p)
# At crossings the medial axis follows the union of BOTH strokes. A pen must
# instead continue smoothly along its current stroke, without visiting the
# junction branches or widening to the combined stroke's inscribed circle.
base = np.array([p[:2] for p in out])
base_lengths = np.r_[0, np.cumsum(np.linalg.norm(np.diff(base, axis=0), axis=1))]
base_times = 0.3 + base_lengths / base_lengths[-1] * 4.8
crossings = [
    (1.55, 1.75, [302, 123], [314, 116]),
    (2.13, 2.27, [307, 113], [305, 121]),
    (2.40, 2.53, [339, 122], [349, 118]),
    (2.77, 2.89, [340, 116], [339, 123]),
    (3.02, 3.14, [376, 117], [379.5, 112]),
    (3.20, 3.35, [378.5, 114], [377.5, 120]),
    (3.64, 3.73, [405, 108], [407, 111]),
    (3.73, 3.85, [417, 113], [424, 113]),
    (4.11, 4.22, [417, 112], [416.5, 120]),
]
for start, end, c1, c2 in reversed(crossings):
    a = int(np.argmin(abs(base_times - start)))
    b = int(np.argmin(abs(base_times - end)))
    p0 = np.array(out[a][:2])
    p3 = np.array(out[b][:2])
    r0 = out[a][2]
    r3 = out[b][2]
    ts = np.linspace(0, 1, max(2, round((end - start) * 800)))
    replacement = []
    for t in ts:
        p = (
            (1 - t) ** 3 * p0
            + 3 * (1 - t) ** 2 * t * np.array(c1)
            + 3 * (1 - t) * t * t * np.array(c2)
            + t**3 * p3
        )
        radius = (1 - t) * r0 + t * r3
        inside = (
            map_coordinates(distance, [[(p[1] - 25) * S], [(p[0] - 210) * S]], order=1)[
                0
            ]
            / S
            + 0.18
        )
        label = out[min(b, a + round(t * (b - a)))][3]
        replacement.append([*p, min(radius, inside), label])
    out[a : b + 1] = replacement
# The v reverses direction at its rounded terminal, rather than stopping at
# the short branch pruned from the skeleton and letting a detail disk grow
# a second bump there later.
tip = min(
    (i for i, p in enumerate(out) if p[3] == "v" and p[0] < 390),
    key=lambda i: out[i][1],
)
origin = np.array(out[tip][:2])
terminal = np.array([381.25, 94.375])
turn = []
for f in np.r_[np.linspace(0, 1, 28), np.linspace(1, 0, 28)[1:]]:
    p = origin * (1 - f) + terminal * f
    r = (
        map_coordinates(distance, [[(p[1] - 25) * S], [(p[0] - 210) * S]], order=1)[0]
        / S
        + 0.18
    )
    turn.append([*p, r, "v"])
out[tip : tip + 1] = turn
# Continue to the actual r terminal, including the short tapered leaf that
# graph pruning deliberately removes from the body of the stroke.
origin = np.array(out[-1][:2])
terminal = np.array([497.375, 113])
for f in np.linspace(0, 1, 24)[1:]:
    p = origin * (1 - f) + terminal * f
    r = (
        map_coordinates(distance, [[(p[1] - 25) * S], [(p[0] - 210) * S]], order=1)[0]
        / S
        + 0.18
    )
    out.append([*p, r, "r"])
# Rounded/tapered terminals are slightly noncircular in the source. A small,
# smoothly tapered overscan reaches those contours; the vector clip keeps
# them exact. These isolated caps cannot expose a neighboring stroke.
caps = [
    (294.4, 85.5, 0.9, 5),
    (381.25, 94.375, 0.45, 4),
    (403.8, 96, 0.65, 5),
    (458, 84.5, 0.7, 5),
    (497.375, 113, 0.6, 3),
]
for p in out:
    p[2] += sum(
        pad * np.exp(-((p[0] - x) ** 2 + (p[1] - y) ** 2) / (2 * spread**2))
        for x, y, pad, spread in caps
    )
# Draw the full disk union and measure coverage.
raster = np.zeros(mask.shape, "uint8")
for x, y, r, _ in out:
    cv2.circle(
        raster,
        (round((x - 210) * S), round((y - 25) * S)),
        max(1, round(r * S)),
        255,
        -1,
    )
print(
    "skeleton",
    len(pixels),
    "path",
    len(out),
    "coverage",
    np.sum((raster > 0) & mask) / mask.sum(),
    "overscan pixels before SVG clipping",
    np.sum((raster > 0) & ~mask),
)
# Supplemental medial disks recover contour details without broad masks.
# Their centres are already inside the main trail, so growing them cannot
# produce detached components. Crossovers use the LAST covering stroke.
full_points = np.argwhere(full_skeleton)
centres = np.array([p[:2] for p in out])
radii = np.array([p[2] for p in out])
lengths = np.r_[0, np.cumsum(np.linalg.norm(np.diff(centres, axis=0), axis=1))]
times, motion = natural_timing(centres, lengths, [p[3] for p in out])
extra = []
index = cKDTree(centres)
for y, x in full_points[::2]:
    point = np.array([x / S + 210, y / S + 25])
    r = max(0.01, float(distance[y, x] / S) + 0.18)
    candidates = index.query_ball_point(point, float(radii.max() + r))
    covers = [
        i for i in candidates if np.linalg.norm(centres[i] - point) < radii[i] - 0.12
    ]
    if not covers:
        continue
    # Skip disks already covered by a main disk; they add no new outline.
    if any(np.linalg.norm(centres[i] - point) + r < radii[i] + 0.12 for i in covers):
        continue
    overlapping = [
        i for i in candidates if np.linalg.norm(centres[i] - point) < radii[i] + r
    ]
    start = float(times[max(overlapping)])
    extra.append([float(point[0]), float(point[1]), r, start])
data = {
    "route": [
        [round(float(x), 3), round(float(y), 3), round(float(r), 3), round(float(t), 4)]
        for (x, y, r, _), t in zip(out, times)
    ],
    "details": [[round(v, 4) for v in p] for p in extra],
    "duration": 5.65,
    "inkEnd": 5.3,
    "motion": motion,
    "letters": {
        label: [
            float(times[[p[3] for p in out].index(label)]),
            float(times[len(out) - 1 - [p[3] for p in out][::-1].index(label)]),
        ]
        for label, _ in guides
    },
}
(ROOT / "assets/handwriting-data.json").write_text(
    json.dumps(data, separators=(",", ":"))
)
print("details", len(extra), "route length", lengths[-1], data["letters"])
cv2.imwrite(str(ROOT / ".local/disk-coverage.png"), raster)
