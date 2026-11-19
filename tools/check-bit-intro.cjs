const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1000,height:720}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.testTime=0;window.testFrames=new Map();let id=0;performance.now=()=>testTime;window.requestAnimationFrame=fn=>{testFrames.set(++id,fn);return id};window.cancelAnimationFrame=id=>testFrames.delete(id);window.step=t=>{window.testTime=t;const jobs=[...testFrames.values()];testFrames.clear();jobs.forEach(fn=>fn(t))}});
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:4175');
  await page.waitForSelector('.hero__bit-intro');
  const config = await page.evaluate(async()=>{
   const m=await import('/assets/logo-motion.js');
   const issues=[];
   for(const [key,p] of Object.entries(m.bitVariations)) {
    for(let frame=0;frame<=240;frame++) {const pose=m.landingPose(frame/240*(p.touchdown+p.settle),key,300);if(pose.some(v=>!Number.isFinite(v))||pose[2]<=0||pose[1]>.001)issues.push(`landing ${key} ${frame}`)}
    if(JSON.stringify(m.landingPose(p.touchdown+p.settle+.01,key,300))!==JSON.stringify([0,0,1,0]))issues.push(`landing endpoint ${key}`);
   }
   for(const [key,p] of Object.entries(m.moveVariations)) {for(let frame=0;frame<=120;frame++){const pose=m.poseAt(p.frames,frame/120);if(pose.some(v=>!Number.isFinite(v))||pose[2]<=0||pose[1]>.001)issues.push(`move ${key}`)}if(JSON.stringify(m.poseAt(p.frames,1))!==JSON.stringify([1,0,1,0]))issues.push(`move endpoint ${key}`)}
   for(const key of Object.keys(m.eyeStyles))for(let eye=0;eye<2;eye++){for(let frame=0;frame<=60;frame++){const p=m.eyePose(key,frame/60,eye);if(Object.values(p).some(v=>!Number.isFinite(v))||p.sy<=0)issues.push(`eye ${key}`)}const p=m.eyePose(key,1,eye);if(Math.abs(p.sx-1)+Math.abs(p.sy-1)+Math.abs(p.dx)+Math.abs(p.dy)+Math.abs(p.angle)+Math.abs(p.alpha-1)>1e-8)issues.push(`eye endpoint ${key}`)}
   return {landings:m.bitVariations,moves:m.moveVariations,eyes:m.eyeStyles,issues};
  });
  assert.deepEqual(config.issues,[]);
  for(const id of ['bit-style','bit-move-style','eye-style'])assert.equal(await page.locator(`#${id} option`).count(),10);
  assert.equal(await page.locator('#bit-style').inputValue(),'rubber');
  await page.selectOption('#bit-move-speed','1',{force:true});
  let start=0; const records=[];
  const step=async t=>page.evaluate(t=>window.step(t),(start+t)*1000);
  const snap=async(group,key,n)=>{const rect=await page.locator('.hero__brand').boundingBox();const path=`.local/motion-${group}-${key}-${n}.png`;await page.screenshot({path,clip:{x:rect.x,y:rect.y-55,width:rect.width,height:rect.height+90}});records.push({group,key,n,path})};
  for(const [key,p] of Object.entries(config.landings)){
   await page.selectOption('#bit-style',key,{force:true});
   const reveal=p.touchdown+5/3+.7;
   for(const [n,t] of [p.touchdown*.94,p.touchdown+p.settle*.13,p.touchdown+p.settle*.4,p.touchdown+p.settle*.75].entries()){await step(t);assert.equal(await page.locator('.hidden-it').getAttribute('visibility'),'hidden');await snap('land',key,n)}
   await step(reveal+.92);assert.equal(await page.locator('.hero__brand').getAttribute('data-handwriting'),'complete');start+=reveal+.92;
  }
  await page.selectOption('#bit-style','rubber',{force:true});
  const reveal=config.landings.rubber.touchdown+5/3+.7;
  for(const [key,p] of Object.entries(config.moves)){
   await page.selectOption('#bit-move-style',key,{force:true});
   for(const [n,f] of [.13,.4,.65,.85].entries()){await step(reveal+p.duration*f);assert.equal(await page.locator('.falling-b').getAttribute('transform'),await page.locator('.b-occluder').getAttribute('transform'));assert.equal(await page.locator('.hidden-it').getAttribute('transform'),null);await snap('move',key,n)}
   await step(reveal+p.duration+.02);assert.equal(await page.locator('.hero__brand').getAttribute('data-handwriting'),'complete');start+=reveal+p.duration+.02;
  }
  for(const key of Object.keys(config.eyes)){
   await page.selectOption('#eye-style',key,{force:true});
   for(const [n,f] of [.16,.4,.57,.78].entries()){await step(config.landings.rubber.touchdown+5/3+.08+.62*f);assert.equal(await page.locator('.hidden-it').getAttribute('visibility'),'hidden');await snap('eyes',key,n)}
   await step(reveal+config.moves.glide.duration+.02);start+=reveal+config.moves.glide.duration+.02;
  }
  fs.writeFileSync('.local/motion-frames.json',JSON.stringify(records));
  await page.reload();await page.waitForSelector('.hero__bit-intro');assert.equal(await page.locator('#bit-move-style').inputValue(),'glide');assert.equal(await page.locator('#eye-style').inputValue(),'wiggle');
  await page.setViewportSize({width:320,height:640});await page.locator('.settings summary').click();const panel=await page.locator('.settings-panel').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=640);
  const reduced=await browser.newPage({reducedMotion:'reduce'});await reduced.goto(process.env.PREVIEW_URL||'http://127.0.0.1:4175');await reduced.waitForSelector('.hero__bit-intro',{state:'attached'});assert.equal(await reduced.locator('.hero__brand').getAttribute('data-handwriting'),'complete');assert.equal(await reduced.locator('.hero__bit-intro').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('PASS: 30 presets, per-frame finite motion and settled endpoints, phase ordering, fixed it, mask tracking, persistence, mobile menu, reduced motion. 120 review frames saved.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
