import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {loadCollisionPatterns} from './collision-fixture.mjs';import {installFighterAnimationStorage,observeFighterActionEvents} from './fighter-fixture.mjs';
const candidates=[700,701,702,703,704,705,706,707,720,721,722,723,731,735,736,741,751,761,771,772,795,796];
test('actual Reimu spells and story actions match original state, signals and random consumption',async()=>{
 const c=await core(),m=await oracle(),frames=loadCollisionPatterns(c,m),storage=installFighterAnimationStorage(c,m,frames),actor=m.allocate(0x1000),other=m.allocate(0x1000),vtable=m.allocate(8),trails=m.allocate(32),cf=c.core_alloc(0x1000),co=c.core_alloc(0x1000);const actions=candidates.filter(action=>c.pattern_present(action));let events=[],seed=0x883371dc,checks=0,updates=0;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},value=n=>Math.fround((next()%200001-100000)*n/100000);m.u32(vtable,0x453d80);observeFighterActionEvents(m,()=>events);const thread=m.allocate(0x100);m.replace(0x646196,"native RNG thread storage",()=>thread);m.view(0x66c238,1)[0]=0;
 const fixture=(chosen)=>{
  const p=Buffer.from(Array.from({length:0x1000},()=>next()&255));
  for(const at of [0x40,0x2cd,0x3be,0x3ce,0x3cf,0x464,0x6ef,0x6f8])p[at]=next()%2;
  for(const at of [0x1c,0x20,0x24,0x28,0x2c,0x30,0x34,0x38,0x3c,0x44,0x48,0x50,0x54,0x58,0x5c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0x368,0x36c,0x3c0,0x488,0x48c,0x490])p.writeFloatLE(value(at<0x3c?3:40),at);
  p.writeFloatLE(value(1400),0x44);p.writeFloatLE([0,1,-1,20,100,300][next()%6],0x48);p.writeInt16LE(next()%16===0?1:0,0x82);p[0x66]=next()%2?1:255;p[0x3ac]=next()%2;p[0x511]=next()%7;p[0x39d]=next()%12;p[0x2cc]=next()%2;
  for(const at of [0x4dc,0x4e0,0x4e8,0x4ec,0x4f0,0x4f4])p.writeInt32LE(next()%7-3,at);
  p.writeInt16LE(chosen.action,0x60);p.writeInt16LE(chosen.index,0x62);// Duration 9999 is an airborne hold: landing ends it long before expiry.
  p.writeInt16LE(next()%3===0?0:Math.min(chosen.bytes.readUInt16LE(4)-1,200),0x64);
  p.writeInt16LE(next()%1001,0x3b0);p.writeInt16LE(next()%3?0:1000,0x3b6);p.writeInt16LE(next()%8-2,0xf00);p.writeInt16LE(next()%5000-2500,0xf02);p.writeInt16LE(next()%2,0xf0c);p.writeInt16LE(next()%70,0xefa);for(let i=0;i<13;i++){p[0x370+i]=next()%7;p[0x32a+i]=next()%3;}return p;
 };
 try{for(const action of actions){assert.equal(c.pattern_present(action),1,'missing actual action '+action);const choices=frames.filter(f=>f.action===action);
  for(let sample=0;sample<500;sample++){
   const chosen=choices[next()%choices.length],p=fixture(chosen),o=Buffer.alloc(0x1000),mode=1+next()%6;o.writeFloatLE(value(1400),0x44);o.writeFloatLE(value(300),0x48);o.writeInt16LE(next()%2?0:400,0x60);o.writeInt16LE(next()%32===0?1:0,0x3ba);o.writeFloatLE(value(100),0x490);o.writeInt16LE(next()%10001,0x324);o.writeInt16LE(next()%3,0x62);o.writeInt16LE(next()%3===0?99:0,0x60);o[0x39d]=next()%3;o[0x3cf]=next()%2;const difficulty=next()%4;m.view(0x6714d0,1)[0]=difficulty;const interval=next()%5,maximum=32,mask=next();m.view(trails,32).fill(0);m.view(trails+16,1)[0]=interval;m.view(trails+18,2).set(Buffer.from([maximum,0]));m.u32(trails+20,mask);
   m.write(actor,p);m.u32(actor,vtable);m.u32(actor+0x2e8,other);m.u32(actor+0x480,trails);storage.bind(actor,chosen);m.write(other,o);m.u32(other,vtable);storage.bind(other,frames.find(f=>f.action===o.readInt16LE(0x60)&&f.index===o.readInt16LE(0x62)));o.set(m.bytes(other,0x1000));m.view(0x6714b4,1)[0]=mode;memory(c,cf,0x1000).set(Buffer.from(m.bytes(actor,0x1000)));memory(c,co,0x1000).set(o);const rngSeed=next();m.u32(thread+0x14,rngSeed);c.actor_load(cf,0);c.replay_stream_bind(0,0,rngSeed);c.reimu_recovery_load(cf,interval,maximum,mask);events=[];
   try{m.call(0x45dd70,{ecx:actor});}catch(error){throw new Error(`action ${action} sample ${sample} frame ${chosen.index} elapsed ${p.readInt16LE(0x64)} duration ${chosen.bytes.readUInt16LE(4)}: ${error.message}`);}assert.equal(c.reimu_spell_advance(co,mode,difficulty,0),1);
   const a=Buffer.from(memory(c,c.reimu_recovery_snapshot(),0x1000)),b=Buffer.from(m.bytes(actor,0x1000));
   // Pointer identity and native alignment padding are storage details. Every
   // meaningful state byte, including unchanged fields, must remain equal.
   for(const [start,end] of [[0,8],[12,21],[22,0x74],[0x7c,0x1000]]){
    for(let offset=start;offset<end;offset++)if(a[offset]!==b[offset])assert.fail('action '+action+' sample '+sample+' field 0x'+offset.toString(16)+' CPP='+a.subarray(Math.max(0,offset-3),offset+5).toString('hex')+' native='+b.subarray(Math.max(0,offset-3),offset+5).toString('hex'));
   }
   assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.reimu_recovery_events(),c.reimu_recovery_event_count())),events,'signals '+action+'/'+sample);
   assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,c.reimu_recovery_trails(),3)),[m.view(trails+16,1)[0],32,m.u32(trails+20)],'trail '+action+'/'+sample);assert.equal(c.replay_stream_state()>>>0,m.u32(thread+0x14),`random stream ${action}/${sample}`);const ca=Buffer.from(memory(c,c.reimu_attack_other(),0x1000)),cb=Buffer.from(m.bytes(other,0x1000));for(const [l,r]of [[0,8],[12,0x74],[0x7c,0x1000]])assert.deepEqual(ca.subarray(l,r),cb.subarray(l,r),`opponent ${action}/${sample}`);checks+=5;updates++;
  }
 }
 report('reimu-spells-original',{passed:true,checks,updates,actions,scope:'actual Reimu spell and story frame updates, original spell initialization, original RNG and full effect launch parameters; projectile update and world integration separate'});
 }finally{m.close();}
});
