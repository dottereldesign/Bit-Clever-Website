const replay = document.querySelector('.hero__brand');
const logo = replay?.querySelector('.hero__logo');

if (logo) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animatedSource = new URL('./bit-clever-logo-animated.svg', import.meta.url);
  const staticSource = new URL('./bit-clever-logo-white.svg', import.meta.url);
  const syncMotion = () => {
    logo.src = (reducedMotion.matches ? staticSource : animatedSource).href;
  };
  reducedMotion.addEventListener('change', syncMotion);
  if (reducedMotion.matches) syncMotion();
  // A fresh SVG image timeline restarts the one-shot CSS animation. The
  // native button supports touch, Enter and Space as well as mouse clicks.
  replay.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    const source = new URL(animatedSource);
    source.searchParams.set('replay', String(Date.now()));
    logo.src = source.href;
  });
}
