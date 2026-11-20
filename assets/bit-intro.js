import { moveVariations, landingPose, poseAt, clamp } from './logo-motion.js';
export { bitVariations, moveVariations } from './logo-motion.js';
const ns = 'http://www.w3.org/2000/svg';
export function createBitIntro(host, svgText) {
  const source = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  // Give the landing six extra logo units of space before C; final position stays fixed.
  const offset = Number(source.documentElement.getAttribute('data-bit-shift') || 76) - 6;
  const center = Number(source.documentElement.getAttribute('data-bit-center') || 97);
  const parts = source.querySelector('path').getAttribute('d').match(/M[^M]+/g);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '52 28 456 130');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hero__bit-intro');
  // SVG paint order does the occlusion: opaque B covers the stationary it.
  // An additional luminance mask duplicates this work and can stall cold GPUs.
  svg.innerHTML = `<path class="hidden-it" fill="white" fill-rule="evenodd" d="${parts.slice(5).join(' ')}"/><g class="falling-b"><path fill="white" d="${parts[4]}"/></g>`;
  const b = svg.querySelector('.falling-b');
  [...source.querySelectorAll('svg > g')].slice(0, 2).forEach(eye => b.append(eye.cloneNode(true)));
  const letters = svg.querySelector('.hidden-it');
  host.append(svg);
  let distance = 0;
  const measure = () => {
    const height = host.getBoundingClientRect().height;
    if (height) distance = (host.closest('.hero').getBoundingClientRect().height / 2 + height) * 130 / height;
  };
  const observer = new ResizeObserver(measure);
  observer.observe(host); observer.observe(host.closest('.hero'));
  measure();
  return {
    remove() { observer.disconnect(); svg.remove(); },
    hide() { svg.style.display = 'none'; },
    paint(wall, revealStart, variation, moveSpeed = 1, moveStyle = 'glance') {
      svg.style.display = 'block';
      const motion = moveVariations[moveStyle];
      const slide = clamp((wall - revealStart) * moveSpeed / motion.duration);
      const [drift, landingY, landingScale, landingAngle] = landingPose(wall, variation, distance);
      const [shift, moveY, moveScale, moveAngle] = poseAt(motion.frames, slide);
      const sy = landingScale * moveScale;
      // Compression bulges sideways; the gentler width response keeps letters legible.
      const sx = 1 / Math.sqrt(sy);
      const transform = `translate(${offset * (1 - shift) + drift} ${landingY + moveY}) translate(${center} 141) rotate(${landingAngle + moveAngle}) scale(${sx} ${sy}) translate(${-center} -141)`;
      b.setAttribute('transform', transform);
      // Letters use their final, fixed-size outlines. Only B moves across them.
      letters.setAttribute('visibility', slide > 0 ? 'visible' : 'hidden');
    },
  };
}
