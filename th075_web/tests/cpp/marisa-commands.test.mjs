import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {loadCollisionPatterns} from './collision-fixture.mjs';import {installFighterAnimationStorage} from './fighter-fixture.mjs';
const commands=[0,1,2,3,4,5,10,11,12,13,20,21,22,23,30,31,40,41,50,51,100,101,102,103,113,200,210,211,220,221,225,230];
test('Marisa command priority, cancels, input buffers and air dashes match original',async()=>{
 const c=await core(),m=await oracle(),frames=loadCollisionPatterns(c,m,"marisa"),storage=installFighterAnimationStorage(c,m,frames),actor=m.allocate(0x1000),opponent=m.allocate(0x1000),vtable=m.allocate(4),cf=c.core_alloc(0x1000),co=c.core_alloc(0x1000),ch=c.core_alloc(90);let seed=0xa770591e,history,checks=0;const outcomes=new Map();
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};const value=n=>Math.fround((next()%200001-100000)*n/100000);m.u32(vtable,0x453d80);
 // This is the vendor deque assign operation. The real original command
 // reset builds its held mask and calls this storage boundary unchanged.
 m.replace(0x455c40,'validated input-history deque storage assignment',()=>{const sp=m.reg('ESP'),length=m.u32(sp+4),p=m.u32(sp+8);assert.equal(length,90);history.fill(m.view(p,1)[0]);return 0;},2);
 try{for(let sample=0;sample<60000;sample++){
  const frame=frames[next()%frames.length],p=Buffer.from(Array.from({length:0x1000},()=>next()&255)),o=Buffer.alloc(0x1000);
  for(const at of [0x40,0x2cd,0x3be,0x3ce,0x3cf,0x464,0x465,0x6ef,0x6f8])p[at]=next()%2;
  p[0x66]=sample%2?1:255;p[0x366]=next()%4;p[0x39c]=next()%3===0?1:0;p[0x39d]=1+next()%2;p[0x511]=commands[sample%commands.length];p[0x3ad]=next()%3;p.writeInt16LE(next()%3,0x398);p.writeInt16LE(next()%3,0x39a);p.writeInt16LE(next()%3===0?0:120,0x3a0);p.writeInt16LE(next()%3===0?0:1000,0x3b0);p.writeInt16LE(next()%2,0xf12);p.writeInt16LE([0,4,6][next()%3],0xf14);p.writeInt32LE(next()%4,0x7c);
  for(const at of [0x44,0x50,0x54,0x58,0x5c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0x368,0x36c,0x3c0,0x488,0x48c,0x490])p.writeFloatLE(value(1000),at);
  p.writeFloatLE([0,1,59,60,100,300,-1][next()%7],0x48);p.writeFloatLE([0,99,100,101,500][next()%5],0x36c);
  for(const at of [0x4dc,0x4e0,0x4f8,0x4fc])p.writeInt32LE(next()%13-6,at);
  for(const at of [0x4e8,0x4ec,0x4f0,0x4f4,0x500,0x504,0x508,0x50c])p.writeInt32LE(next()%5===0?1:0,at);
  p.writeInt16LE(frame.action,0x60);p.writeInt16LE(frame.index,0x62);p.writeInt16LE(0,0x64);o.writeFloatLE(value(1000),0x44);
  history=Buffer.from(Array.from({length:90},()=>next()&255));memory(c,ch,90).set(history);m.write(actor,p);m.u32(actor,vtable);m.u32(actor+0x2e8,opponent);storage.bind(actor,frame);m.write(opponent,o);memory(c,cf,0x1000).set(m.bytes(actor,0x1000));memory(c,co,0x1000).set(o);c.marisa_load(cf,0x1000,sample%4);m.view(0x6714d0,1)[0]=sample%4;c.actor_history_load(ch);
  try{m.call(0x493470,{ecx:actor});}catch(error){throw new Error(`sample ${sample} action ${frame.action} frame ${frame.index} command ${p[0x511]}: ${error.message}`);}
  c.marisa_commands(co);const a=Buffer.from(memory(c,c.marisa_snapshot(),0x1000)),b=Buffer.from(m.bytes(actor,0x1000));
  for(const [start,end]of [[0,8],[12,21],[22,0x74],[0x7c,0x1000]])for(let offset=start;offset<end;offset++)if(a[offset]!==b[offset])assert.fail(`sample ${sample} initial ${frame.action}/${frame.index} command ${p[0x511]} field 0x${offset.toString(16)} CPP=${a.subarray(Math.max(0,offset-3),offset+5).toString('hex')} native=${b.subarray(Math.max(0,offset-3),offset+5).toString('hex')}`);
  assert.deepEqual(Buffer.from(memory(c,c.actor_history_snapshot(),90)),history,`history ${sample}`);const result=b.readInt16LE(0x60);outcomes.set(result,(outcomes.get(result)??0)+1);checks+=2;
 }
 report('marisa-commands-original',{passed:true,checks,updates:60000,commands,actions:[...outcomes].sort((a,b)=>a[0]-b[0]),scope:'real original Marisa command selector and native animation binding; only vendor input-history deque storage assignment replaced; existing pattern/cancel priorities, buffer quirks and ground/air attack ordering preserved'});
 }finally{m.close();}
});
