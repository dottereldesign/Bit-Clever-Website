let defaults = {preset: 1, strength: .45, size: 1, revision: 'minimal-v1'};
try {
  const response = await fetch(new URL('./noise-defaults.json', import.meta.url));
  if (response.ok) defaults = await response.json();
} catch {}
const canvas = document.querySelector('.hero__background');
const context = canvas?.getContext('2d', {alpha: false});

const variations = [
  ['Original',1,1,true,.7], ['Whisper',.45,1,true,.7],
  ['Fine film',.8,.65,true,.7], ['Crisp grain',.85,1,false,.7],
  ['Soft film',1,1.6,true,.7], ['Rich grain',1.8,1,true,.7],
  ['Coarse film',1.4,2.4,true,.7], ['Sand',1.5,.8,false,.7],
  ['Even grain',.9,1,true,0], ['Deep texture',2.3,1.7,true,.4],
].map(([name,strength,size,soft,fade]) => ({name,strength,size,soft,fade}));

if (context) {
  let selected = defaults.preset, strength = defaults.strength, grainSize = defaults.size;
  let requestedKey = '', latest, busy = false, sequence = 0, worker, fallback;
  const paint = ({id, w, h, pixels}) => {
    if (id !== latest?.id) return;
    canvas.width = w; canvas.height = h;
    context.putImageData(new ImageData(pixels, w, h), 0, 0);
    canvas.dataset.rendered = 'true';
    canvas.dataset.settings = [selected, strength, grainSize].join(':');
    canvas.dataset.variation = String(selected);
  };
  // One job at a time; rapid resize/preset changes replace the pending job.
  const dispatch = async () => {
    if (busy || !latest) return;
    busy = true;
    const job = latest;
    if (worker) { worker.postMessage(job); return; }
    try {
      fallback ||= import('./hero-raster.js');
      const {renderPixels} = await fallback;
      paint({...job, pixels: renderPixels(job)});
    } finally {
      busy = false;
      if (latest.id !== job.id) dispatch();
    }
  };
  try {
    worker = new Worker(new URL('./hero-worker.js', import.meta.url), {type: 'module'});
    worker.onmessage = ({data}) => {
      paint(data); busy = false;
      if (data.id !== latest.id) dispatch();
    };
    worker.onerror = event => { event.preventDefault(); worker.terminate(); worker = null; busy = false; dispatch(); };
  } catch { worker = null; }
  const render = () => {
    const {width, height} = canvas.getBoundingClientRect();
    if (!width || !height) return;
    // Preserve the existing pixel density, grain scale and four-million-pixel cap.
    const scale = Math.min(devicePixelRatio || 1, 2, Math.sqrt(4000000 / (width * height)));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    const key = [w,h,selected,strength,grainSize].join(':');
    if (key === requestedKey) return;
    requestedKey = key;
    latest = {id: ++sequence, width, height, w, h, variant: variations[selected], strength, grainSize};
    dispatch();
  };
  let pendingFrame;
  const scheduleRender = () => {
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(render);
  };
  new ResizeObserver(scheduleRender).observe(canvas);
  window.addEventListener('resize', scheduleRender, {passive: true});
  const select = document.querySelector('#noise-preset');
  try {
    const saved = JSON.parse(localStorage.getItem('hero-noise-tuning'));
    if (saved?.revision === defaults.revision && Number.isInteger(saved.preset) && variations[saved.preset]) {
      selected = saved.preset; strength = variations[selected].strength; grainSize = variations[selected].size;
    }
  } catch {}
  variations.forEach((variation, index) => select.add(new Option(variation.name, index)));
  select.value = selected;
  select.addEventListener('change', () => {
    selected = Number(select.value);
    strength = variations[selected].strength; grainSize = variations[selected].size;
    try { localStorage.setItem('hero-noise-tuning', JSON.stringify({preset: selected, strength, size: grainSize, revision: defaults.revision})); } catch {}
    scheduleRender();
  });
  scheduleRender();
}
