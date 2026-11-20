"""Fit the hero's colour field to exposed patches of the supplied 961x648 reference.

This is an offline development tool. The site has no Python/build dependencies.
The person, typography, cards, grid lines, and black gutter are never sampled.
"""

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.optimize import least_squares


def sample_reference(image):
    mask_image = Image.new('L', (961, 648))
    draw = ImageDraw.Draw(mask_image)
    draw.polygon([
        (170, 184), (426, 184), (436, 208), (442, 235), (451, 266),
        (440, 284), (405, 305), (384, 332), (367, 362), (348, 409),
        (329, 454), (326, 490), (333, 519), (319, 546), (318, 575), (170, 575),
    ], fill=255)
    for box in [
        (170, 55, 958, 79), (706, 185, 958, 231), (865, 183, 958, 448),
        (944, 55, 958, 448), (931, 440, 958, 632), (851, 546, 958, 578),
        (840, 624, 958, 632), (170, 585, 291, 594), (170, 624, 291, 632),
    ]:
        draw.rectangle(box, fill=255)
    for y in [215, 408, 581, 637]:
        draw.rectangle((166, y - 4, 961, y + 4), fill=0)
    mask = np.asarray(mask_image) > 0
    points, colours, centres = [], [], []
    for y in range(6, 642, 9):
        for x in range(172, 956, 9):
            if mask[y - 4:y + 5, x - 4:x + 5].all():
                points.append([(x - 166) / 794, y / 647])
                colours.append(image[y - 4:y + 5, x - 4:x + 5].mean(axis=(0, 1)))
                centres.append((x - 166, y))
    return np.array(points), np.array(colours), centres


def colour_field(parameters, points):
    x, y = points.T
    dark, blue, green = parameters[0:3], parameters[3:6], parameters[6:9]
    cx, cy, aspect, inner, outer = parameters[9:14]
    distance = np.sqrt(((x - cx) * aspect) ** 2 + (y - cy) ** 2)
    fade = np.clip((distance - inner) / (outer - inner), 0, 1)
    base = dark + (blue - dark) * fade[:, None]
    gx, gy, rx, ry, opacity, exponent = parameters[14:20]
    radius = ((x - gx) / rx) ** 2 + ((y - gy) / ry) ** 2
    glow = opacity * np.exp(-radius ** exponent)
    return base * (1 - glow[:, None]) + green * glow[:, None]


def fit(points, colours, initial=None):
    if initial is None:
        initial = [18, 52, 51, 183, 199, 242, 30, 181, 136,
                   .3, .05, 1, .42, .99, 1.05, .33, .25, .25, .94, 1.4]
    lower = [0, 30, 30, 170, 190, 230, 0, 150, 100,
             -.5, -1, .1, 0, .81, .9, .1, .1, .05, .5, .5]
    upper = [35, 70, 75, 200, 215, 255, 110, 210, 180,
             .7, .3, 3, .8, 2, 1.4, .5, 1, .6, 1, 4]
    result = least_squares(
        lambda p: (colour_field(p, points) - colours).ravel(), initial,
        bounds=(lower, upper), loss='soft_l1', f_scale=2, max_nfev=1000,
    )
    if not result.success:
        raise RuntimeError(result.message)
    return result.x


def metrics(expected, actual):
    error = np.abs(expected - actual)
    return {
        'mean_absolute_rgb_error_out_of_255': round(float(error.mean()), 4),
        'root_mean_squared_rgb_error': round(float(np.sqrt((error ** 2).mean())), 4),
        '95th_percentile_patch_error': round(float(np.percentile(error.mean(axis=1), 95)), 4),
    }


def export_field(parameters, destination):
    p = np.round(parameters, 6).tolist()
    field = {
        'dark': p[0:3], 'periwinkle': p[3:6], 'mint': p[6:9],
        'fade': dict(zip(['x', 'y', 'aspect', 'inner', 'outer'], p[9:14])),
        'glow': dict(zip(['x', 'y', 'radiusX', 'radiusY', 'opacity', 'falloff'], p[14:20])),
        'grain': {'seed': 27011991, 'deviation': 3.3, 'mint': .35},
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        '// Measured from unobstructed background patches in the supplied reference.\n'
        '// Regenerate with tools/calibrate-hero.py; coordinates are relative to the hero.\n'
        f'export const HERO_FIELD = Object.freeze({json.dumps(field, indent=2)});\n',
        encoding='utf-8',
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', required=True, type=Path)
    parser.add_argument('--output', type=Path, help='Optional destination for hero-field.js')
    parser.add_argument('--render', type=Path, help='Optional 795x648 browser screenshot to measure')
    parser.add_argument('--report', type=Path, help='Optional JSON report destination')
    args = parser.parse_args()
    with Image.open(args.reference) as reference:
        if reference.size != (961, 648):
            parser.error('This sampling mask is for the original 961x648 reference.')
        image = np.asarray(reference.convert('RGB'), dtype=float)
    points, colours, centres = sample_reference(image)

    # Reserve every fifth patch to measure colours not used by the first fit.
    holdout = np.arange(len(points)) % 5 == 0
    parameters = fit(points[~holdout], colours[~holdout])
    report = {
        'sample_patches': len(points), 'holdout_patches': int(holdout.sum()),
        'holdout': metrics(colours[holdout], colour_field(parameters, points[holdout])),
    }
    parameters = fit(points, colours, parameters)
    report['full_fit'] = metrics(colours, colour_field(parameters, points))
    grain = image[225:270, 200:400]
    report['reference_dark_grain_rgb_std'] = np.round(grain.std(axis=(0, 1)), 4).tolist()
    report['reference_grain_neighbor_correlation'] = round(float(np.corrcoef(
        grain[:, :-1, 1].ravel(), grain[:, 1:, 1].ravel())[0, 1]), 4)

    if args.render:
        with Image.open(args.render) as rendered:
            if rendered.size != (795, 648):
                parser.error('--render must be a 795x648 screenshot at device scale 1.')
            rendered = np.asarray(rendered.convert('RGB'), dtype=float)
        samples = np.array([rendered[y - 4:y + 5, x - 4:x + 5].mean(axis=(0, 1))
                            for x, y in centres])
        report['browser_render'] = metrics(colours, samples)
        report['rendered_dark_grain_rgb_std'] = np.round(
            rendered[225:270, 34:234].std(axis=(0, 1)), 4).tolist()
    if args.output:
        export_field(parameters, args.output)
    formatted = json.dumps(report, indent=2)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(formatted + '\n', encoding='utf-8')
    print(formatted)


if __name__ == '__main__':
    main()
