import test from 'node:test';import assert from 'node:assert/strict';
import {core,oracle,memory,report} from './helpers.mjs';
test('body separation preserves corner ownership, ties and exact float storage',async()=>{
 const c=await core(),m=await oracle(),scene=m.allocate(0x80),actors=[m.allocate(0x800),m.allocate(0x800)],frames=[m.allocate(120),m.allocate(120)],values=c.core_alloc(32),rects=c.core_alloc(32);let seed=0xf82ca6c1,checks=0;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 m.u32(scene+0x44,actors[0]);m.u32(scene+0x48,actors[1]);
 try{for(let sample=0;sample<12000;sample++){
  const bounds=new Int32Array(8);for(let side=0;side<2;side++){let x=((next()%140000)-10000)/100,y=((next()%80000)-10000)/100;if(sample%4===0)x=[40,1240,640,1000,0,1280][Math.floor(sample/4)%6];if(side===1&&sample%7===0){x=m.f32(actors[0]+0x44);y=m.f32(actors[0]+0x48);}
   const face=(next()&1)?1:-1,v=new Float32Array([x,y,((next()%40000)-20000)/997,0,0,0,5,0]);memory(c,values,32).set(new Uint8Array(v.buffer));c.motion_load(side,values,face,0,0);m.view(actors[side],0x800).fill(0);m.f32(actors[side]+0x44,v[0]);m.f32(actors[side]+0x48,v[1]);m.f32(actors[side]+0x50,v[2]);m.f32(actors[side]+0x488,5);m.view(actors[side]+0x66,1)[0]=face&255;m.u32(actors[side]+0x2e8,actors[side^1]);m.u32(actors[side]+0x74,frames[side]);
   bounds.set([-20-next()%120,-next()%200,20+next()%120,10+next()%250],side*4);if(sample%7===0&&side===1)bounds.set(bounds.slice(0,4),4);m.write(frames[side]+0x44,new Uint8Array(bounds.buffer,side*16,16));
  }
  memory(c,rects,32).set(new Uint8Array(bounds.buffer));const left=[-1,0,1][next()%3],right=[-1,0,1][next()%3];c.body_separation_reset(left,right);m.view(0x66c24c,1)[0]=left&255;m.view(0x66c24d,1)[0]=right&255;m.call(0x449310,{ecx:scene});c.body_separation_advance(rects);
  for(let side=0;side<2;side++){const out=Buffer.from(memory(c,c.motion_values(side),32));assert.deepEqual(out.subarray(0,8),Buffer.from(m.bytes(actors[side]+0x44,8)),`position ${sample}/${side}`);assert.deepEqual(out.subarray(24,28),Buffer.from(m.bytes(actors[side]+0x488,4)),`push ${sample}/${side}`);checks+=2;}
  assert.equal(c.body_separation_occupants(),m.view(0x66c24c,1)[0]|(m.view(0x66c24d,1)[0]<<8));checks++;
 }report('body-separation-original',{passed:true,samples:12000,checks,originalFunction:'0x449310',scope:'real native geometry and corner/body push logic'});
 }finally{m.close();}
});
