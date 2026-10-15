import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {originalGraphics,originalRectangles,bits} from './background-fixture.mjs';import {loadCollisionPatterns} from './collision-fixture.mjs';
test('story/fade/victory portraits and air-recovery markers match original',async()=>{
 const c=await core(),m=await oracle();loadCollisionPatterns(c,m);const actors=[m.allocate(0x1000),m.allocate(0x1000)],scene=m.allocate(0x180),flags=[m.allocate(80),m.allocate(80)],cp=c.core_alloc(0x1000),{draws}=originalGraphics(m);let seed=0x75070cc,checks=0,drawChecks=0;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};originalRectangles(m);c.background_reset(0);
 const compare=label=>{assert.equal(c.background_draw_count(),draws.length,label+' draw count');for(let i=0;i<draws.length;i++){const d=Array.from(new Uint32Array(c.memory.buffer,c.background_draw_meta(i),3));assert.equal(d[0],draws[i].texture,label+' texture');assert.deepEqual(Buffer.from(memory(c,c.background_draw_vertices(i),d[2]*28)),draws[i].vertices,label+' vertices '+i);drawChecks++;}checks++;};
 try{for(let sample=0;sample<2000;sample++){
  const x=Math.fround((next()%10000-5000)/16),y=Math.fround((next()%10000-5000)/16);m.f32(0x671404,x);m.f32(0x6713c4,y);
  for(let side=0;side<2;side++){
   const p=Buffer.alloc(0x1000),frameFlags=sample%3===0?0x100000:0;p[0x2cc]=side;p[0x6e7]=next()%11;p[0x6e9]=next()%256;p.writeInt16LE(next()%26,0x6ea);p.writeInt16LE(next()%6,0x6ec);p[0x538]=next()%256;p[0x539]=next()%15;
   p.writeFloatLE(Math.fround((next()%10000)/16),0x44);p.writeFloatLE(Math.fround((next()%20001-5000)/64),0x48);p[0x66]=sample%2?1:255;p.writeInt16LE([1,10000,0][sample%3],0x324);p.writeInt16LE(sample%160,0x60);p.writeInt16LE(next()%90-5,0x3c8);
   memory(c,cp,p.length).set(p);c.hud_actor_load(side,cp);c.hud_collision_flags(side,frameFlags);m.write(actors[side],p);m.u32(actors[side]+0x74,flags[side]);m.u32(flags[side]+0x3c,frameFlags);m.u32(scene+0x44+side*4,actors[side]);
   for(let op=0;op<3;op++){const slide=Math.fround((next()%10001-5000)/64),sy=Math.fround((next()%10001)/64),color=next(),image=next()%11;draws.length=0;m.call([0x454840,0x454aa0,0x4549c0][op],{ecx:actors[side],args:op===2?[image,bits(slide),bits(sy),color]:[]});c.hud_portrait_draw(side,op,image,slide,sy,color);compare('portrait '+sample+'/'+side+'/'+op);}
  }
  draws.length=0;m.call(0x4406c0,{ecx:scene});c.hud_recovery_draw(x,y);compare('markers '+sample);
 }report('battle-portraits-original',{passed:true,samples:2000,checks,drawChecks,scope:'original story/fade/victory portrait images, anchors and transparency; air-recovery gauge conditions/colors/geometry'});}finally{m.close();}
});
