// Motion affects the character only; Clever's pen route stays untouched.
export const clamp = t => Math.max(0, Math.min(1, t));
const smooth = t => { t = clamp(t); return t * t * t * (10 + t * (-15 + 6 * t)); };
// Frames: time, horizontal progress/drift, lift, vertical scale, rotation.
// Hermite interpolation carries momentum through interior poses, with resting endpoints.
export function poseAt(frames, time) {
  const t = clamp(time);
  if (t <= 0) return frames[0].slice(1);
  if (t >= 1) return frames.at(-1).slice(1);
  let i = 0;
  while (frames[i + 1][0] < t) i++;
  const a = frames[i], b = frames[i + 1], prev = frames[Math.max(0, i - 1)], next = frames[Math.min(frames.length - 1, i + 2)];
  const dt = b[0] - a[0], u = (t - a[0]) / dt;
  return a.slice(1).map((value, k) => {
    const j = k + 1;
    // Zero tangent at a reversal avoids overshooting the height or squash extrema.
    const slope = (p, q, r) => (q[j] - p[j]) * (r[j] - q[j]) <= 0 ? 0 : (r[j] - p[j]) / (r[0] - p[0]);
    const m0 = i === 0 ? 0 : slope(prev, a, b);
    const m1 = i + 1 === frames.length - 1 ? 0 : slope(a, b, next);
    return (2*u**3-3*u*u+1)*value+(u**3-2*u*u+u)*dt*m0+(-2*u**3+3*u*u)*b[j]+(u**3-u*u)*dt*m1;
  });
}
const landing = (name, touchdown, settle, stretch, tilt, drift, frames) => ({name, touchdown, settle, stretch, tilt, drift, frames});
export const bitVariations = {
  rubber: landing('Rubber bounce', .68, .85, .13, -3, 0, [[0,0,0,1.13,0],[.12,0,0,.77,-2],[.42,-1,-13,1.07,2],[.66,0,0,.93,-1],[.82,0,-2,1.02,0],[1,0,0,1,0]]),
  cartoon: landing('Cartoon plop', .6, .95, .19, 7, -4, [[0,0,0,1.19,0],[.15,0,0,.64,-4],[.43,-2,-19,1.13,6],[.7,0,0,.86,-3],[.86,0,-3,1.04,1],[1,0,0,1,0]]),
  jelly: landing('Jelly wobble', .74, 1.05, .1, -5, 2, [[0,0,0,1.1,0],[.13,1,0,.8,-7],[.3,-1,-4,1.08,6],[.48,0,0,.91,-4],[.65,0,-1,1.04,3],[.82,0,0,.98,-1],[1,0,0,1,0]]),
  heavy: landing('Heavy squish', .54, .9, .16, 0, 0, [[0,0,0,1.16,0],[.15,0,0,.66,0],[.33,0,0,.69,0],[.66,0,-3,1.03,0],[.84,0,0,.98,0],[1,0,0,1,0]]),
  superball: landing('Superball', .58, 1.15, .16, 3, -2, [[0,0,0,1.16,0],[.08,0,0,.79,-2],[.29,0,-26,1.09,4],[.49,0,0,.88,-2],[.64,0,-10,1.05,2],[.79,0,0,.96,-1],[.9,0,-2,1.01,0],[1,0,0,1,0]]),
  feather: landing('Feather bounce', .95, .75, .04, -8, -7, [[0,0,0,1.04,0],[.16,0,0,.94,-2],[.44,0,-5,1.02,2],[.75,0,0,.99,-.5],[1,0,0,1,0]]),
  pogo: landing('Pogo pop', .65, .85, .23, 0, 0, [[0,0,0,1.23,0],[.11,0,0,.76,0],[.34,0,-18,1.2,0],[.59,0,0,.91,0],[.77,0,-4,1.06,0],[1,0,0,1,0]]),
  wobble: landing('Wobbly knees', .72, 1, .09, 9, -5, [[0,0,0,1.09,0],[.14,-2,0,.83,-9],[.36,2,-6,1.03,8],[.55,-1,0,.96,-5],[.74,0,-1,1.02,3],[1,0,0,1,0]]),
  velvet: landing('Soft little boing', .8, .65, .06, -2, 0, [[0,0,0,1.06,0],[.15,0,0,.91,0],[.44,0,-6,1.03,0],[.74,0,0,.98,0],[1,0,0,1,0]]),
  cork: landing('Corkscrew settle', .73, .95, .12, -14, -6, [[0,0,0,1.12,0],[.12,-1,0,.84,-5],[.4,-3,-12,1.07,10],[.65,1,0,.93,-6],[.82,0,-2,1.02,2],[1,0,0,1,0]]),
};
const move = (name, duration, frames) => ({name, duration, frames});
export const moveVariations = {
  glance: move('Side glance', .9, [[0,0,0,1,0],[.45,.42,0,1,-2],[1,1,0,1,0]]),
  leap: move('Leap back', .84, [[0,0,0,1,0],[.12,-.015,0,.86,3],[.48,.55,-22,1.09,-9],[.79,1,0,.88,3],[1,1,0,1,0]]),
  spring: move('Spring back', .7, [[0,0,0,1,0],[.14,-.02,0,.8,4],[.51,.92,-9,1.1,-7],[.73,1.07,0,.92,3],[1,1,0,1,0]]),
  snap: move('Quick snap', .32, [[0,0,0,1,0],[.13,.03,0,1.03,-2],[.7,1.025,0,.98,1],[1,1,0,1,0]]),
  hop: move('Quick hop', .48, [[0,0,0,1,0],[.13,0,0,.91,2],[.48,.52,-9,1.04,-4],[.83,1,0,.95,1],[1,1,0,1,0]]),
  elastic: move('Elastic pullback', .92, [[0,0,0,1,0],[.16,-.02,0,.92,5],[.5,1.12,-2,1.05,-6],[.7,.96,0,.98,3],[.85,1.02,0,1.01,-1],[1,1,0,1,0]]),
  skid: move('Skid to a stop', .64, [[0,0,0,1,0],[.19,.17,0,.97,-7],[.59,1.06,0,1.02,8],[.8,.99,0,1,-3],[1,1,0,1,0]]),
  recoil: move('Wind-up release', .86, [[0,0,0,1,0],[.26,-.025,0,.78,6],[.55,.84,-14,1.12,-8],[.79,1.03,0,.9,3],[1,1,0,1,0]]),
  doubleHop: move('Two little hops', .98, [[0,0,0,1,0],[.1,0,0,.9,0],[.27,.38,-10,1.05,-5],[.44,.55,0,.88,2],[.66,.84,-6,1.03,-3],[.84,1,0,.95,1],[1,1,0,1,0]]),
  glide: move('Silky glide', .76, [[0,0,0,1,0],[.5,.5,0,1,0],[1,1,0,1,0]]),
};
export function landingPose(wall, style, distance) {
  const p = bitVariations[style], f = clamp(wall / p.touchdown);
  if (wall < p.touchdown) return [p.drift*(1-smooth(f)), -distance*(1-f**2.2), 1+p.stretch*Math.sin(f*Math.PI/2), p.tilt*(1-smooth(f))];
  return poseAt(p.frames, (wall-p.touchdown)/p.settle);
}
export const eyeStyles = {
  blink: 'Wake-up blink', doubleBlink: 'Double take', wink: 'Cheeky wink', peek: 'Sleepy peek',
  surprise: 'Wide-eyed hello', squeeze: 'Happy squint', bump: 'Cute bump', sideEye: 'Knowing glance',
  rubberBlink: 'Rubber blink', wiggle: 'Playful wiggle',
};
const pulse = (t,a,b) => t<=a||t>=b ? 0 : Math.sin(Math.PI*(t-a)/(b-a))**2;
export function eyePose(style, progress, index) {
  const t = clamp(progress), open = smooth(t/.3), alpha = smooth(t/.12);
  let sx=1, sy=.035+.965*open, dx=0, dy=0, angle=0;
  if (style==='blink') sy*=1-.95*pulse(t,.37,.72);
  if (style==='doubleBlink') sy*= (1-.94*pulse(t,.25,.48))*(1-.94*pulse(t,.6,.83));
  if (style==='wink') { sy*=1-(index===1?.96:.18)*pulse(t,.35,.8); angle=(index===1?-.12:.04)*pulse(t,.35,.8); }
  if (style==='peek') sy=.035+.965*smooth((t-.06)/.88)-.2*pulse(t,.42,.7);
  if (style==='surprise') { sy+=.2*pulse(t,.2,.7); sx+=.12*pulse(t,.2,.7); }
  if (style==='squeeze') { sy*=1-.68*pulse(t,.3,.77); sx+=.12*pulse(t,.3,.77); }
  if (style==='bump') { sx=1+.2*pulse(t,.15,.6); sy+=.2*pulse(t,.27,.7); dy=-2*pulse(t,.15,.7); }
  if (style==='sideEye') { dx=1.8*pulse(t,.23,.9); sy*=1-.35*pulse(t,.3,.8); }
  if (style==='rubberBlink') { sx+=.3*pulse(t,.25,.55); sy*=1-.92*pulse(t,.25,.55); sy+=.18*pulse(t,.55,.85); }
  if (style==='wiggle') { angle=Math.sin(t*Math.PI*5)*.3*(1-t)*open; sy*=1-.7*pulse(t,.38,.66); }
  return {sx,sy:Math.max(.025,sy),dx,dy,angle,alpha};
}
