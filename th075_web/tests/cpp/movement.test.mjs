import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
test('common ground movement and aerial recovery choose original actions',async()=>{
  const c=await core(),m=await oracle(),actor=m.allocate(0x1000),opponent=m.allocate(0x1000),frame=m.allocate(120),thread=m.allocate(0x100),fixture=c.core_alloc(0x1000);let seed=0x821649ab,checks=0;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  m.replace(0x40fac0,'animation binding boundary previously compared independently',()=>{const action=m.u32(m.reg('ESP')+4)&65535,p=m.reg('ECX');m.view(p+0x60,6).fill(0);new DataView(m.view(p+0x60,2).buffer,m.view(p+0x60,2).byteOffset,2).setUint16(0,action,true);return 0;},1);
  m.replace(0x646196,'thread RNG state',()=>thread);m.view(0x66c238,1)[0]=0;
  const compare=(f,label)=>{const out=Buffer.from(memory(c,c.movement_snapshot(),0x1000)),original=Buffer.from(m.bytes(actor,0x1000));for(const [at,size] of [[0x60,7],[0x3ad,2],[0x3c8,2]])assert.deepEqual(out.subarray(at,at+size),original.subarray(at,at+size),label+' field '+at.toString(16));assert.equal(c.movement_random_state()>>>0,m.u32(thread+0x14),label+' RNG');};
  try{for(let sample=0;sample<16000;sample++){
    const f=Buffer.alloc(0x1000);f.writeFloatLE((next()%12800)/10,0x44);f.writeFloatLE([-1,0,0.01,1,50][sample%5],0x48);f.writeFloatLE((next()%12800)/10,0x2e8);f.writeInt16LE([0,1,2,3,4,5,6,7,8,9,10,50,143,180,200,201,204,205,206,300][sample%20],0x60);f.writeInt16LE(next()%30,0x62);f.writeInt16LE(next()%30,0x64);f[0x66]=(next()&1)?1:255;f[0x3ad]=next()%4;f[0x3ae]=next()%4;f[0x2cd]=sample%2;f[0x52e]=sample%3?0:1;f.writeInt16LE((next()%10001)-100,0x324);f.writeInt16LE((next()%10)-3,0x3c8);f.writeInt32LE((next()%9)-4,0x4dc);f.writeInt32LE((next()%9)-4,0x4e0);for(let i=0;i<4;i++)f.writeInt32LE(next()%3?0:next()%30+1,0x4e8+i*4);
    const random=next();memory(c,fixture,0x1000).set(f);c.movement_load(fixture,random);m.write(actor,f);m.f32(opponent+0x44,f.readFloatLE(0x2e8));m.u32(actor+0x2e8,opponent);m.u32(thread+0x14,random);
    m.call(0x451eb0,{ecx:actor});c.movement_select();compare(f,'move '+sample);checks++;
    const flags=sample%4===0?0x100000:0,training=sample%3===0;m.u32(frame+0x3c,flags);m.u32(actor+0x74,frame);m.view(0x6714b4,1)[0]=training?5:1;
    m.call(0x452360,{ecx:actor});c.movement_recover(flags,training?1:0);compare(f,'tech '+sample);checks++;
  }report('movement-original',{passed:true,checks,samples:16000,originalFunctions:['0x451eb0','0x452360']});}finally{m.close();}
});
