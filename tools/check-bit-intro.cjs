const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.testTime=0;window.testFrames=new Map();let id=0;performance.now=()=>window.testTime;window.requestAnimationFrame=fn=>{window.testFrames.set(++id,fn);return id};window.cancelAnimationFrame=id=>window.testFrames.delete(id);window.step=t=>{window.testTime=t;const jobs=[...window.testFrames.values()];window.testFrames.clear();jobs.forEach(fn=>fn(t))}});
 await p.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:4175'));await p.waitForSelector('.hero__bit-intro');
 assert.equal(await p.locator('#bit-style').inputValue(),'reboundGlance');
 const variants={reboundGlance:[1.2,.9],soft:[1.05,.85],spring:[1.2,.95],glance:[1.15,.9],feather:[1.35,1.1]};
 let start=0;
 for(const [v,[drop,slide]]of Object.entries(variants)){
 await p.selectOption('#bit-style',v,{force:true});const reveal=drop*.64+5/3+.7;
 const advance=async t=>p.evaluate(t=>window.step(t),(start+t)*1000);
 await advance(drop+.15);assert.equal(await p.locator('.hidden-it').getAttribute('visibility'),'hidden');
 await p.screenshot({path:`.local/bit-${v}-land.png`});
 await advance(reveal-.01);assert.equal(await p.locator('.hidden-it').getAttribute('visibility'),'hidden');
 await advance(reveal+slide*.55);assert.equal(await p.locator('.hidden-it').getAttribute('visibility'),'visible');assert.equal(await p.locator('.b-occluder').getAttribute('transform'),await p.locator('.falling-b').getAttribute('transform'));
 await p.screenshot({path:`.local/bit-${v}-reveal.png`});
 await advance(reveal+slide+.02);assert.equal(await p.locator('.hero__brand').getAttribute('data-handwriting'),'complete');
 start+=reveal+slide+.02;
 }
 await p.screenshot({path:'.local/bit-final.png'});
 await p.setViewportSize({width:375,height:812});await p.locator('.hero__brand').dispatchEvent('click');await p.evaluate(t=>window.step(t),(start+1.5)*1000);await p.screenshot({path:'.local/bit-mobile.png'});
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const reduced=await b.newPage({reducedMotion:'reduce'});await reduced.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:4175'));await reduced.waitForSelector('.hero__bit-intro',{state:'attached'});assert.equal(await reduced.locator('.hero__brand').getAttribute('data-handwriting'),'complete');assert.equal(await reduced.locator('.hero__bit-intro').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS all five phase sequences, hidden it, reveal, completion, mobile, reduced motion, no JS errors');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
