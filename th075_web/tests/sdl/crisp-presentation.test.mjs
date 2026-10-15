import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{resolve}from'node:path';import{harness,images}from'./harness.mjs';import{displayRectangle}from'../../sdl-runtime/display.mjs';
const displaySource=readFileSync(resolve('th075_web/sdl-runtime/display.mjs'),'utf8');
test('real Chinese selection pixels survive desktop integer presentation without another filtering pass',{timeout:180000},async()=>{
 const results=[];
 for(const scale of[1,2])await harness(async({page,tick,errors})=>{
  await page.setViewportSize({width:1920,height:1080});await page.addStyleTag({content:'html,body{margin:0;background:black}canvas{position:fixed;left:0;top:0;image-rendering:pixelated}'});
  await page.evaluate(()=>game.ccall('th075_probe_scene','number',['number'],[2],{async:true}));await tick(110);await page.evaluate(()=>game._th075_key(0x2c,1));await tick(1);await page.evaluate(()=>game._th075_key(0x2c,0));await tick(161);
  const native=await page.locator('canvas').screenshot();
  await page.addScriptTag({type:'module',content:displaySource+'\nwindow.displayMode="integer";window.updateDisplay=attachDisplay(document.querySelector("canvas"),()=>displayMode);'});
  await page.waitForFunction(()=>window.updateDisplay);
  const bounds=await page.locator('canvas').evaluate(c=>{const r=c.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};});assert.deepEqual(bounds,{x:320,y:60,width:1280,height:960});
  const actual=await page.locator('canvas').screenshot({path:resolve(images,'crisp-chinese-selection-'+scale+'.png')});
  const check=await page.evaluate(async({source,target})=>{
   const decode=async base64=>{const image=await createImageBitmap(await(await fetch('data:image/png;base64,'+base64)).blob()),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return{width:c.width,height:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};};
   const a=await decode(source),b=await decode(target),factor=b.width/a.width;let differences=0,maxError=0;
   for(let y=0;y<b.height;y++)for(let x=0;x<b.width;x++)for(let k=0;k<4;k++){const error=Math.abs(b.data[(y*b.width+x)*4+k]-a.data[(Math.floor(y/factor)*a.width+Math.floor(x/factor))*4+k]);if(error)differences++;maxError=Math.max(error,maxError);}
   return{source:[a.width,a.height],target:[b.width,b.height],factor,differences,maxError,channels:b.width*b.height*4};
  },{source:native.toString('base64'),target:actual.toString('base64')});
  assert.equal(check.differences,0,JSON.stringify(check));results.push({scale,bounds,...check});
  await page.evaluate(()=>{displayMode='fit';updateDisplay();});assert.equal(await page.locator('canvas').evaluate(c=>c.clientWidth),1440);
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>{displayMode='integer';updateDisplay();});assert.equal(await page.locator('canvas').evaluate(c=>c.clientWidth),640);assert.deepEqual(errors,[]);
 },{scale,language:'lang_zh-hant'});
 const devices=[];for(const [width,height,dpr]of[[1920,1080,1],[1536,864,1.25],[844,390,2.75],[390,844,2.75],[1440,900,2],[320,200,1]]){const r=displayRectangle(width,height,dpr);assert.ok(r.width<=width+1e-6&&r.height<=height+1e-6);assert.ok(Math.abs(r.left*dpr-Math.round(r.left*dpr))<1e-6);assert.ok(Math.abs(r.top*dpr-Math.round(r.top*dpr))<1e-6);assert.ok(Math.abs(r.width/r.height-4/3)<1e-6);if(Math.min(width*dpr/640,height*dpr/480)>=1)assert.equal(r.physicalScale,Math.floor(r.physicalScale));devices.push({width,height,dpr,...r});}
 const compact=displayRectangle(390,844,2.75,'integer',true);assert.ok(compact.width>389,'portrait phone cannot shrink to 232 CSS pixels');
 writeFileSync(resolve(images,'crisp-presentation.json'),JSON.stringify({passed:true,results,devices,scope:'actual shared SDL3/WebGL2 Chinese selection, 640/1280 render targets; full framebuffer color equality at integer display size, window resize, fit mode; device pixel alignment model for desktop and rotated phone'},null,2));
});
