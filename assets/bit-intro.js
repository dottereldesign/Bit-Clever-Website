const ns = 'http://www.w3.org/2000/svg';
export const bitVariations = {
  reboundGlance: { name: 'Rebound + glance', drop: 1.2, slide: .9, bounce: 7, tilt: 0, glance: true },
  soft: { name: 'Soft landing', drop: 1.05, slide: .85, bounce: 2, tilt: 0 },
  spring: { name: 'Little rebound', drop: 1.2, slide: .95, bounce: 7, tilt: 0 },
  glance: { name: 'Side glance', drop: 1.15, slide: .9, bounce: 3, tilt: 3, glance: true },
  feather: { name: 'Feather drop', drop: 1.35, slide: 1.1, bounce: 1, tilt: -2 },
};
const smooth = t => t * t * t * (10 + t * (-15 + 6 * t));
export function createBitIntro(host, svgText) {
  const source = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const offset = Number(source.documentElement.getAttribute('data-bit-shift') || 76);
  const center = Number(source.documentElement.getAttribute('data-bit-center') || 97);
  const parts = source.querySelector('path').getAttribute('d').match(/M[^M]+/g);
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '52 28 456 130');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('hero__bit-intro');
  // The counter-shape tracks B exactly, including its curved waist and rotation.
  svg.innerHTML = `<defs><mask id="it-reveal" maskUnits="userSpaceOnUse" x="52" y="28" width="456" height="130" style="mask-type:luminance"><rect x="52" y="28" width="456" height="130" fill="white"/><path class="b-occluder" fill="black" stroke="white" stroke-width="0.3" d="${parts[4]}"/></mask></defs><g mask="url(#it-reveal)"><path class="hidden-it" fill="white" fill-rule="evenodd" d="${parts.slice(5).join(' ')}"/></g><g class="falling-b"><path fill="white" d="${parts[4]}"/></g>`;
  const b = svg.querySelector('.falling-b');
  [...source.querySelectorAll('svg > g')].slice(0, 2).forEach(eye => b.append(eye.cloneNode(true)));
  const occluder = svg.querySelector('.b-occluder');
  const letters = svg.querySelector('.hidden-it');
  host.append(svg);
  return {
    remove() { svg.remove(); },
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
      const angle = p.tilt * (1 - smooth(fall)) + (p.glance ? -2 * Math.sin(Math.PI * slide) : 0);
      const y = fall < 1 ? fallingY : rebound;
      const transform = `translate(${offset * (1 - shift)} ${y}) translate(${center} 141) rotate(${angle}) scale(${1 + squash} ${1 - squash}) translate(${-center} -141)`;
      b.setAttribute('transform', transform);
      occluder.setAttribute('transform', transform);
      // Letters use their final, fixed-size outlines. Only B moves across them.
      letters.setAttribute('visibility', slide > 0 ? 'visible' : 'hidden');
    },
  };
}
