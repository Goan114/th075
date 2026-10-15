import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {bits,originalGraphics} from './background-fixture.mjs';
test('screen image anchors, scaling, rotation and flipping match original vertices',async()=>{
 const c=await core(),m=await oracle();let width=256,height=256,seed=0x61473558,checks=0;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};const value=range=>Math.fround((next()%40001-20000)*range/20000);const {draws}=originalGraphics(m,{imageSize:()=>({width,height})});
 try{for(let i=0;i<4000;i++){
  width=1+next()%1500;height=1+next()%900;const paddedW=2**Math.ceil(Math.log2(width)),paddedH=2**Math.ceil(Math.log2(height));
  c.image_configure(width,height);const x=value(1500),y=value(900),ax=value(width),ay=value(height),scale=[1,0.5,2,0,Math.fround(value(3))][i%5],rotation=i%3===0?value(720):0,color=next(),flags=i%2,centered=i%4>=2;
  c.graphics_configure(1,0,0,1,paddedW,paddedH);draws.length=0;m.call(centered?0x40cef0:0x40ca80,{ecx:0,args:[0,bits(x),bits(y),color,bits(ax),bits(ay),bits(scale),bits(rotation),flags,...(centered?[1]:[])]});
  c.image_draw(x,y,color,ax,ay,scale,rotation,flags,Number(centered));assert.equal(draws.length,1);assert.deepEqual(Buffer.from(memory(c,c.graphics_vertices(),112)),draws[0].vertices,`image ${i}: ${JSON.stringify({width,height,x,y,ax,ay,scale,rotation,flags,centered})}`);checks++;
 }report('scene-images-original',{passed:true,checks,scope:'screen image geometry for backgrounds, menus and HUD'});}finally{m.close();}
});
