const ns = 'http://www.w3.org/2000/svg';
export const bitVariations = {
  soft: { name: 'Soft landing', drop: 1.05, slide: .85, bounce: 2, tilt: 0 },
  spring: { name: 'Little rebound', drop: 1.2, slide: .95, bounce: 7, tilt: 0 },
  glance: { name: 'Side glance', drop: 1.15, slide: .9, bounce: 3, tilt: 3 },
  feather: { name: 'Feather drop', drop: 1.35, slide: 1.1, bounce: 1, tilt: -2 },
};
const smooth = t => t * t * t * (10 + t * (-15 + 6 * t));
export function createBitIntro(host, svgText) {
  const source = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const parts = source.querySelector('path').getAttribute('d').match(/M[^M]+/g);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '52 28 456 130');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hero__bit-intro');
  svg.innerHTML = `<defs><clipPath id="it-reveal" clipPathUnits="userSpaceOnUse"><rect x="210" y="28" width="0" height="130"/></clipPath></defs><path fill="white" fill-rule="evenodd" clip-path="url(#it-reveal)" d="${parts.slice(5).join(' ')}"/><g class="falling-b"><path fill="white" d="${parts[4]}"/></g>`;
  const b = svg.querySelector('.falling-b');
  [...source.querySelectorAll('svg > g')].slice(0, 2).forEach(eye => b.append(eye.cloneNode(true)));
  const clip = svg.querySelector('rect');
  host.append(svg);
  return {
    hide() { svg.style.display = 'none'; },
    paint(wall, revealStart, variation) {
      svg.style.display = 'block';
      const p = bitVariations[variation];
      const fall = Math.min(1, Math.max(0, wall / (p.drop * .64)));
      const settle = Math.min(1, Math.max(0, (wall - p.drop * .64) / (p.drop * .36)));
      const slide = Math.min(1, Math.max(0, (wall - revealStart) / p.slide));
      const shift = smooth(slide);
      const height = host.getBoundingClientRect().height;
      const distance = (host.closest('.hero').getBoundingClientRect().height / 2 + height) * 130 / height;
      const fallingY = -distance * (1 - fall * fall);
      const rebound = -p.bounce * Math.sin(Math.PI * settle) * (1 - settle);
      const squash = .065 * Math.sin(Math.PI * Math.min(1, settle * 2)) * (1 - settle);
      const angle = p.tilt * (1 - smooth(fall)) + (variation === 'glance' ? -2 * Math.sin(Math.PI * slide) : 0);
      const y = fall < 1 ? fallingY : rebound;
      b.setAttribute('transform', `translate(${76 * (1 - shift)} ${y}) translate(97 141) rotate(${angle}) scale(${1 + squash} ${1 - squash}) translate(-97 -141)`);
      // Reveal only beyond B's right edge; rounded corners must never leak hidden letters.
      const edge = 209.5 - 76 * shift;
      clip.setAttribute('x', edge);
      clip.setAttribute('width', Math.max(0, 205 - edge));
    },
  };
}
