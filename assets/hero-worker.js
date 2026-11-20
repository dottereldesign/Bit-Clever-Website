import { renderPixels } from './hero-raster.js';
self.onmessage = ({data}) => {
  const pixels = renderPixels(data);
  self.postMessage({id: data.id, w: data.w, h: data.h, pixels}, [pixels.buffer]);
};
