"""Author a continuous pen-speed profile over the approved drawing route.

This is art-directed timing, not simulated handwriting or random jitter.
Only timestamps change. A positive speed field guarantees forward travel.
"""

import numpy as np
from scipy.ndimage import gaussian_filter1d


def natural_timing(centres, lengths, labels):
    # Measure direction on a uniform distance grid. Smoothing in logo units
    # removes the raster skeleton's tiny kinks from the timing calculation.
    distance = np.linspace(0, lengths[-1], 4097)
    spacing = distance[1] - distance[0]
    x = gaussian_filter1d(np.interp(distance, lengths, centres[:, 0]), 2.5 / spacing)
    y = gaussian_filter1d(np.interp(distance, lengths, centres[:, 1]), 2.5 / spacing)
    heading = np.unwrap(np.arctan2(np.gradient(y), np.gradient(x)))
    curvature = gaussian_filter1d(np.abs(np.gradient(heading, distance)), 3 / spacing)
    pace = (1 + 28 * curvature) ** -0.30

    # (position within letter, width within letter, log-speed impulse).
    # Wide impulses carry momentum through a stroke; narrow negative ones
    # prepare a tight turn. The two e loops deliberately have different accents.
    gestures = {
        "C": [(0.13, 0.07, -0.12), (0.48, 0.23, 0.38), (0.91, 0.12, 0.18)],
        "l": [
            (0.19, 0.12, 0.24),
            (0.39, 0.06, -0.22),
            (0.64, 0.12, 0.38),
            (0.80, 0.055, -0.12),
            (0.95, 0.09, 0.18),
        ],
        "e1": [
            (0.13, 0.10, 0.18),
            (0.31, 0.07, -0.15),
            (0.54, 0.11, 0.25),
            (0.91, 0.13, 0.30),
        ],
        "v": [
            (0.12, 0.07, 0.22),
            (0.205, 0.045, -0.23),
            (0.36, 0.09, 0.32),
            (0.51, 0.055, -0.12),
            (0.66, 0.09, 0.29),
            (0.80, 0.045, -0.20),
            (0.94, 0.08, 0.17),
        ],
        "e2": [
            (0.12, 0.09, 0.23),
            (0.28, 0.07, -0.12),
            (0.49, 0.11, 0.30),
            (0.72, 0.06, -0.10),
            (0.92, 0.12, 0.29),
        ],
        "r": [
            (0.10, 0.07, 0.16),
            (0.21, 0.055, -0.20),
            (0.39, 0.07, 0.12),
            (0.56, 0.10, 0.34),
            (0.74, 0.06, -0.12),
            (0.88, 0.07, 0.24),
        ],
    }
    accent = np.zeros_like(distance)
    for letter, pulses in gestures.items():
        indices = np.flatnonzero(np.asarray(labels) == letter)
        start, end = lengths[indices[0]], lengths[indices[-1]]
        span = end - start
        for position, width, strength in pulses:
            accent += strength * np.exp(
                -0.5 * ((distance - start - position * span) / (width * span)) ** 2
            )
    pace *= np.exp(accent)
    # Ease the initial set-down and final lift without stopping at letter joins.
    pace *= 1 - 0.66 * np.exp(-0.5 * (distance / 12) ** 2)
    pace *= 1 - 0.61 * np.exp(-0.5 * ((distance[-1] - distance) / 10) ** 2)
    pace = gaussian_filter1d(pace, 2.8 / spacing, mode="nearest")
    pace = np.clip(pace, 0.27, 1.8)

    # Integrate inverse speed, then normalize to the established 4.8-second
    # pen journey. Every speed preset scales this same rhythm as a whole.
    elapsed = np.r_[
        0, np.cumsum(np.diff(distance) * (1 / pace[:-1] + 1 / pace[1:]) / 2)
    ]
    elapsed *= 4.8 / elapsed[-1]
    times = 0.3 + np.interp(lengths, distance, elapsed)
    return times, {
        "style": "natural",
        "profile": [
            [round(float(t + 0.3), 4), round(float(s / distance[-1]), 5)]
            for t, s in zip(elapsed[::8], distance[::8])
        ],
    }
