export function createComingSoon(reducedMotion, replay) {
  const text = document.querySelector('.coming-soon');
  const select = document.querySelector('#coming-style');
  const styles = { rise: 'Gentle rise', fade: 'Quiet fade', blur: 'Focus in', pop: 'Soft bounce', type: 'Typewriter', cascade: 'Letter cascade' };
  let style = 'rise', shown = false;
  try { const saved = localStorage.getItem('bit-clever-coming-style'); if (saved in styles) style = saved; } catch {}
  for (const [value, label] of Object.entries(styles)) {
    const option = document.createElement('option');
    option.value = value; option.textContent = label; select.append(option);
  }
  select.value = style;
  select.addEventListener('change', () => {
    style = select.value;
    try { localStorage.setItem('bit-clever-coming-style', style); } catch {}
    reset();
    if (reducedMotion.matches) show(); else replay();
  });
  function reset() {
    for (const element of [text, ...text.children]) element.getAnimations().forEach(animation => animation.cancel());
    text.textContent = 'Coming soon';
    text.style.opacity = '0';
    shown = false;
  }
  function show() {
    if (shown && !reducedMotion.matches) return;
    reset(); shown = true; text.style.opacity = '1';
    if (reducedMotion.matches) return;
    const frames = {
      rise: [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      blur: [{ opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0)' }],
      pop: [{ opacity: 0, transform: 'scale(.75)' }, { opacity: 1, transform: 'scale(1.08)', offset: .65 }, { opacity: 1, transform: 'scale(1)' }],
      type: [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
    };
    if (style === 'cascade') {
      text.textContent = '';
      [...'Coming soon'].forEach((character, index) => {
        const span = document.createElement('span'); span.textContent = character; text.append(span);
        span.animate(frames.rise, { duration: 450, delay: index * 35, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    } else {
      text.animate(frames[style], { duration: style === 'type' ? 750 : 650, easing: style === 'type' ? 'steps(11,end)' : 'cubic-bezier(.2,.8,.2,1)' });
    }
  }
  return { reset, show };
}
