import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
test('standing, crouching, air, training and recorded CPU defense choose original responses',async()=>{
  const c=await core(),m=await oracle(),actor=m.allocate(0x1000),opponent=m.allocate(0x1000),frame=m.allocate(120),thread=m.allocate(0x100),byte=m.allocate(1),fixture=c.core_alloc(0x1000);let seed=0x398abc01,recorded=[],playback=0,checks=0;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  m.replace(0x646196,'thread RNG',()=>thread);m.replace(0x414450,'CPU defense recording observation',()=>{assert.equal(m.reg('ECX'),0x6718cc);recorded.push(m.view(m.u32(m.reg('ESP')+4),1)[0]);return 0;},1);
  m.replace(0x454d50,'recorded defense queue front',()=>{m.view(byte,1)[0]=playback;return byte;});m.replace(0x454d70,'recorded defense queue pop',()=>0);
  try{for(let sample=0;sample<40000;sample++){
    const f=Buffer.alloc(0x1000);f.writeFloatLE((next()%12000)/10,0x44);f.writeFloatLE(sample%3===0?0:(next()%4000)/10,0x48);f.writeFloatLE((next()%12000)/10,0x2e8);f.writeInt16LE([0,50,149,150,151,198,199,200,300][sample%9],0x60);f[0x2cd]=(sample>>1)&1;f[0x465]=sample%7===0?1:0;f[0x52f]=sample%4;f.writeInt16LE(sample%9===0?5:0,0x3bc);f.writeInt16LE([0,1,500,1000,-1][sample%5],0x3b0);f.writeInt32LE((next()%7)-3,0x4dc);f.writeInt32LE((next()%7)-3,0x4e0);
    const flags=(sample%13===0?0:0x10)|(sample%11===0?4:0),attack=[0,2,4,8,10,12,0x10,0x200000,0x200002,0x200004][sample%10],mode=sample%3,random=next(),training=sample%5===0,difficulty=sample%4;playback=sample%20;recorded=[];
    m.write(actor,f);m.f32(opponent+0x44,f.readFloatLE(0x2e8));m.u32(actor+0x2e8,opponent);m.u32(actor+0xac,frame);m.u32(frame+0x3c,flags);m.u32(thread+0x14,random);m.view(0x66c238,1)[0]=mode;m.view(0x6714b4,1)[0]=training?5:1;m.view(0x6714d0,1)[0]=difficulty;
    memory(c,fixture,0x1000).set(f);c.guard_load(fixture,flags,mode,random,playback);const expected=m.call(0x455140,{ecx:actor,args:[attack]})&255;
    assert.equal(c.guard_select(attack,training?1:0,difficulty),expected,'response '+sample);assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.guard_counts(),2)),[m.i32(actor+0x4dc),m.i32(actor+0x4e0)],'input '+sample);assert.equal(c.guard_random_state()>>>0,m.u32(thread+0x14),'RNG '+sample);assert.equal(c.guard_record_count(),recorded.length,'record count '+sample);if(recorded.length)assert.equal(c.guard_record_value(),recorded[0]);checks+=4;
  }report('guard-selector-original',{passed:true,samples:40000,checks,originalFunction:'0x455140',modes:['live','recorded','playback','training']});}finally{m.close();}
});
