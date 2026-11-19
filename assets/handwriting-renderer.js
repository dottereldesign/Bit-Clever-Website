import { eyePose } from './logo-motion.js';
// The site and frame inspector share this pen route and painter.
export function createHandwritingPainter(canvas, svgText, data) {
  const source = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const parts = source.querySelector('path').getAttribute('d').match(/M[^M]+/g);
  const bit = new Path2D(parts.slice(4).join(' '));
  const clever = new Path2D(parts.slice(0, 4).join(' '));
  const context = canvas.getContext('2d');
  const trail = document.createElement('canvas');
  const brush = trail.getContext('2d');
  let previousTime = -1, painted = 0, previousLanding = 0;
  const detailProgress = new Float32Array(data.details.length);
  const eyes = [...source.querySelectorAll('svg > g')].map(group => {
    const numbers = group.getAttribute('transform').match(/[\d.]+/g).map(Number);
    const oval = group.querySelector('ellipse');
    return { x: numbers[0], y: numbers[1], scale: numbers[2],
      rx: Number(oval.getAttribute('rx')), ry: Number(oval.getAttribute('ry')),
      color: group.getAttribute('fill') };
  });
  const disk = (x, y, radius) => {
    if (radius <= 0) return;
    brush.moveTo(x + radius, y);
    brush.arc(x, y, radius, 0, Math.PI * 2);
  };
  // The convex hull of consecutive disks includes every interpolated pen
  // position. It prevents subpixel gaps or retreat between sampled positions.
  const bridge = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length <= Math.abs(a[2] - b[2])) return;
    const k = (a[2] - b[2]) / length;
    const h = Math.sqrt(1 - k * k);
    const ux = dx / length, uy = dy / length;
    const nx = k * ux - h * uy, ny = k * uy + h * ux;
    const mx = k * ux + h * uy, my = k * uy - h * ux;
    brush.moveTo(a[0] + a[2] * nx, a[1] + a[2] * ny);
    brush.lineTo(a[0] + a[2] * mx, a[1] + a[2] * my);
    brush.lineTo(b[0] + b[2] * mx, b[1] + b[2] * my);
    brush.lineTo(b[0] + b[2] * nx, b[1] + b[2] * ny);
    brush.closePath();
  };
  return function paint(time, { outline = false, inkOnly = false, eyeStyle = "fade", eyeProgress, hideBit = false } = {}) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(canvas.width / 456, 0, 0, canvas.height / 130,
      -52 * canvas.width / 456, -28 * canvas.height / 130);
    if (!inkOnly && !hideBit) {
      context.fillStyle = '#fff';
      context.fill(bit, 'evenodd');
      for (const eye of eyes.slice(0, 2)) {
        context.fillStyle = eye.color;
        context.beginPath();
        context.ellipse(eye.x, eye.y, eye.rx * eye.scale, eye.ry * eye.scale, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.save();
    // The outline is a containment guard. Crossovers have their own narrow
    // routes; only isolated terminals slightly overscan their source contour.
    context.fillStyle = '#fff';
    if (time >= data.inkEnd) {
      context.fill(clever, 'evenodd');
    } else {
      context.clip(clever, 'evenodd');
      const landing = Math.max(0, Math.min(1, (time - .3) / .08));
      if (time < previousTime || trail.width !== canvas.width || trail.height !== canvas.height || previousLanding < 1) {
        trail.width = canvas.width;
        trail.height = canvas.height;
        painted = 0;
        detailProgress.fill(0);
        brush.setTransform(canvas.width / 456, 0, 0, canvas.height / 130,
          -52 * canvas.width / 456, -28 * canvas.height / 130);
        brush.fillStyle = '#fff';
      }
      brush.beginPath();
      let previous = data.route[painted - 1], batch = 0;
      for (let index = painted; index < data.route.length; index++) {
        const point = data.route[index];
        const [x, y, r, at] = point;
        if (at > time) {
          if (previous) {
            const f = (time - previous[3]) / (at - previous[3]);
            const tip = [previous[0] + (x - previous[0]) * f,
              previous[1] + (y - previous[1]) * f,
              (previous[2] + (r - previous[2]) * f) * landing];
            disk(...tip);
            bridge([previous[0], previous[1], previous[2] * landing], tip);
          }
          break;
        }
        disk(x, y, r * landing);
        if (previous) bridge([previous[0], previous[1], previous[2] * landing], [x, y, r * landing]);
        previous = point;
        painted = index + 1;
        if (++batch % 32 === 0) { brush.fill(); brush.beginPath(); }
      }
      for (let index = 0; index < data.details.length; index++) {
        const [x, y, r, at] = data.details[index];
        const f = Math.max(0, Math.min(1, (time - Math.max(.38, at)) / .12));
        if (f > detailProgress[index]) {
          disk(x, y, r * f);
          detailProgress[index] = f;
          if (++batch % 32 === 0) { brush.fill(); brush.beginPath(); }
        }
      }
      brush.fill();
      previousLanding = landing;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(trail, 0, 0);
    }
    context.restore();
    previousTime = time;
    if (!inkOnly) {
      const progress = eyeProgress ?? (time - data.inkEnd - .08) / .27;
      for (const [index, eye] of eyes.slice(2).entries()) {
        if (progress <= 0) continue;
        const {sx, sy, dx, dy, angle, alpha} = eyePose(eyeStyle, progress, index);
        context.globalAlpha = alpha;
        context.save();
        context.translate(eye.x + dx, eye.y + dy);
        context.rotate(angle);
        context.fillStyle = eye.color;
        context.beginPath();
        context.ellipse(0, 0, eye.rx * eye.scale * sx, eye.ry * eye.scale * sy, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
      context.globalAlpha = 1;
    }
    if (outline) {
      context.strokeStyle = '#f2a3ff';
      context.lineWidth = .25;
      context.stroke(clever);
    }
  };
}
