import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {loadCollisionPatterns} from './collision-fixture.mjs';import {installFighterAnimationStorage,observeFighterActionEvents} from './fighter-fixture.mjs';
test('Marisa guard visual template, one-shot effect and ranged-distance timer equal original',async()=>{
 const c=await core(),m=await oracle(),frames=loadCollisionPatterns(c,m,"marisa"),storage=installFighterAnimationStorage(c,m,frames),actor=m.allocate(0x1000),other=m.allocate(0x1000),vtable=m.allocate(4),cf=c.core_alloc(0x1000),co=c.core_alloc(0x1000);let events=[],seed=0x74645111,checks=0;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};m.u32(vtable,0x453d80);observeFighterActionEvents(m,()=>events);
 try{for(let sample=0;sample<12000;sample++){
  const chosen=frames[next()%frames.length],p=Buffer.from(Array.from({length:0x1000},()=>next()&255)),o=Buffer.alloc(0x1000);p[0x66]=sample%2?1:255;p.writeInt16LE(chosen.action,0x60);p.writeInt16LE(chosen.index,0x62);p.writeInt16LE(0,0x64);
  for(const at of [0x1c,0x20,0x24,0x28,0x2c,0x30,0x34,0x38,0x3c,0x44,0x48,0x50,0x54,0x58,0x5c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0x2fc,0x300,0x304,0x308,0x30c,0x310,0x314,0x318,0x31c,0x320,0x368,0x36c,0x3c0,0x488,0x48c,0x490])p.writeFloatLE(Math.fround((next()%200001-100000)*.01),at);
  p.writeFloatLE(sample%3?0:1,0x50);p.writeFloatLE([320,-320,540,-540,320.00003,-320.00003,540.00006,-540.00006,700,-700][sample%10],0x44);o.writeFloatLE(sample%7===0?.00001:0,0x44);p.writeInt16LE(sample%4===0?1:0,0xf0a);p.writeInt16LE([0,59,60,61,32767,-32768,-1][sample%7],0xf32);
  for(const at of [0x40,0x2cd,0x3be,0x3ce,0x3cf,0x464,0x465,0x6ef,0x6f8])p[at]=next()%2;
  m.write(actor,p);m.u32(actor,vtable);m.u32(actor+0x2e8,other);storage.bind(actor,chosen);m.write(other,o);memory(c,cf,0x1000).set(m.bytes(actor,0x1000));memory(c,co,0x1000).set(o);c.actor_load(cf,0);c.marisa_load(cf,0x1000,0);events=[];
  m.call(0x496c60,{ecx:actor});c.marisa_frame_advance(co);const actual=Buffer.from(memory(c,c.marisa_snapshot(),0x1000)),expected=Buffer.from(m.bytes(actor,0x1000));
  for(const [start,end]of [[0,8],[12,21],[22,0x74],[0x7c,0x1000]])for(let offset=start;offset<end;offset++)if(actual[offset]!==expected[offset])assert.fail('sample '+sample+' action '+chosen.action+' field 0x'+offset.toString(16)+' cpp '+actual.subarray(offset,offset+4).toString('hex')+' native '+expected.subarray(offset,offset+4).toString('hex'));
  assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.reimu_recovery_events(),c.reimu_recovery_event_count())),events,'effect '+sample);checks+=2;
 }
 report('marisa-frame-original',{passed:true,checks,updates:12000,scope:'actual original guard visual update and distance counter; full inherited visual template and effect launch parameters captured'});
 }finally{m.close();}
});
