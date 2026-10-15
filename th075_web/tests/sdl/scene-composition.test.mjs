import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';import {writeFileSync} from 'node:fs';import {harness,images} from './harness.mjs';
test('real scene frames honor vertex alpha and erase previous menu/battle contents',{timeout:300000},async()=>harness(async({page,tick,state,errors})=>{
 await page.setViewportSize({width:660,height:500});
 const samples=await page.evaluate(()=>[0x00ffffff,0x80ffffff,0xffffffff].map(color=>{const p=game._th075_probe_alpha(color)>>>0;return [p&255,p>>>8&255,p>>>16&255,p>>>24];}));
 assert.deepEqual(samples[0],[0,0,255,255],'zero-alpha sprite must not cover red background');assert.deepEqual(samples[2],[255,255,255,255]);for(let i=0;i<3;i++)assert.ok(Math.abs(samples[1][i]-[128,128,255][i])<=1,'half-alpha sprite must blend');
 const scene=async n=>{assert.equal(await page.evaluate(n=>game.ccall('th075_probe_scene','number',['number'],[n],{async:true}),n),1);};
 const pixels=()=>page.evaluate(()=>{const p=game._th075_probe_pixels();return Array.from(game.HEAPU8.subarray(p,p+640*480*4));});
 await scene(2);await tick(110);const clean=Buffer.from(await pixels());await page.locator('canvas').screenshot({path:resolve(images,'fixed-title.png')});
 const press=async scan=>{await page.evaluate(scan=>game._th075_key(scan,1),scan);await tick(1);await page.evaluate(scan=>game._th075_key(scan,0),scan);await tick(1);};
 await press(0x2c);await tick(160);assert.equal((await state())[0],3);await page.locator('canvas').screenshot({path:resolve(images,'fixed-story-select.png')});
 await press(0xcd);await tick(30);await page.locator('canvas').screenshot({path:resolve(images,'fixed-story-marisa.png')});
 await press(0x2d);await tick(170);assert.equal((await state())[0],2,'cancel selection returns title');const returned=Buffer.from(await pixels());assert.deepEqual(returned,clean,'title pixels cannot retain the previous character selection');await page.locator('canvas').screenshot({path:resolve(images,'fixed-title-return.png')});
 for(const n of [9,12,14,5,13]){await scene(n);await tick(60);await scene(2);await tick(110);assert.deepEqual(Buffer.from(await pixels()),clean,'return from scene '+n);}
 assert.deepEqual(errors,[]);writeFileSync(resolve(images,'scene-composition.json'),JSON.stringify({passed:true,alphaSamples:samples,exactTitlePixels:640*480,returnedFrom:[3,9,12,14,5,13],scope:'actual shared SDL3/WebGL2; natural story entry/cancel; zero and half vertex alpha; entire framebuffer equality after six different scenes'},null,2));
}));
