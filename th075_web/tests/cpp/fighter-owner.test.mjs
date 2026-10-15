import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {loadCollisionPatterns} from './collision-fixture.mjs';
const read16=(m,p)=>Buffer.from(m.bytes(p,2)).readInt16LE();
test('named fighter owner preserves native reset, guarded commands and spell initialization',async()=>{
 const c=await core(),m=await oracle(),frames=loadCollisionPatterns(c,m),actor=m.allocate(0x1000),other=m.allocate(0x1000),vtable=m.allocate(0x40),cf=c.core_alloc(0x1000),motion=c.core_alloc(32),thread=m.allocate(0x100),sequenceCell=m.allocate(4),sequences=new Map(),frameLists=new Map();let seed=0x442579cd,events=[],actions=[],checks=0;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};const value=n=>Math.fround((next()%200001-100000)*n/100000);
 for(let action=0;action<c.pattern_count();action++)if(c.pattern_present(action)){
   const p=m.allocate(20),list=frames.filter(f=>f.action===action);m.view(p,20).fill(0);m.write(p+16,memory(c,c.pattern_header(action),4));sequences.set(action,p);frameLists.set(p,list);
 }
 m.replace(0x4420b0,'validated native pattern table element storage',()=>{const action=read16(m,m.reg('ESP')+4);assert.ok(sequences.has(action),'missing action '+action);m.u32(sequenceCell,sequences.get(action));return sequenceCell;},1);
 m.replace(0x442060,'validated native frame vector element storage',()=>{const list=frameLists.get(m.reg('ECX')),index=read16(m,m.reg('ESP')+4);assert.ok(list&&list[index],'frame '+index);return list[index].pointer;},1);
 m.replace(0x442120,'validated native frame vector size storage',()=>frameLists.get(m.reg('ECX')).length);
 m.replace(0x45ba30,'owned object lifetime boundary',()=>{events.push(1,m.view(actor+0x2cc,1)[0]);return 0;});
 const marker=m.registerImport({dll:'native fighter callback observation',name:'movement callback marker',argc:0,handler:()=>{actions.push(1);return 0;}}),move=m.allocate(12),wrapper=Buffer.from([0x51,0xe8,0,0,0,0,0x59,0xe9,0,0,0,0]);wrapper.writeInt32LE(marker-(move+6),2);wrapper.writeInt32LE(0x451eb0-(move+12),8);m.write(move,wrapper);
 const command=m.registerImport({dll:'native fighter callback observation',name:'attack command boundary',argc:0,handler:()=>{actions.push(2);return 0;}});
 m.u32(vtable,0x453d80);m.u32(vtable+0x20,move);m.u32(vtable+0x28,command);m.replace(0x646196,'native RNG thread storage',()=>thread);m.call(0x41cae0);
 const setup=(p,frame)=>{m.write(actor,p);m.u32(actor,vtable);m.u32(actor+0x2e8,other);m.u32(actor+8,frame.pointer);m.u32(actor+0x74,frame.pointer);m.u32(actor+0x78,sequences.get(frame.action));m.view(actor+0x70,2).set(Buffer.from([c.pattern_frames(frame.action)&255,c.pattern_frames(frame.action)>>>8]));m.view(actor+0x72,2).set(frame.bytes.subarray(4,6));memory(c,cf,0x1000).set(Buffer.from(m.bytes(actor,0x1000)));c.actor_load(cf,m.u32(thread+0x14));};
 const snapshot=()=>Buffer.from(memory(c,c.actor_snapshot(),0x1000));
 const compare=(label)=>{const a=snapshot(),b=Buffer.from(m.bytes(actor,0x1000));for(const [start,end] of [[0,8],[12,0x74],[0x7c,0x1000]])assert.deepEqual(a.subarray(start,end),b.subarray(start,end),label+' '+start.toString(16));checks++;};
 const bytes=frame=>{const p=Buffer.from(Array.from({length:0x1000},()=>next()&255));for(const at of [0x40,0x2cd,0x3be,0x3ce,0x3cf,0x464,0x6ef,0x6f8])p[at]=next()%2;p.writeInt16LE(frame.action,0x60);p.writeInt16LE(frame.index,0x62);p.writeInt16LE(next()%frame.bytes.readUInt16LE(4),0x64);p[0x2cc]=next()%2;p[0x66]=next()%2?1:255;for(const at of [0x44,0x48,0x50,0x54,0x58,0x5c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0x368,0x36c,0x3c0,0x488,0x48c,0x490])p.writeFloatLE(value(1000),at);return p;};
 try{
  for(let sample=0;sample<6000;sample++){
    const frame=frames[next()%frames.length],p=bytes(frame);events=[];setup(p,frame);m.call(0x457010,{ecx:actor});c.actor_reset_round();compare('reset '+sample);assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.actor_events(),c.actor_event_count())),events);checks++;
  }
  for(let sample=0;sample<6000;sample++){
    const frame=frames[next()%frames.length],p=bytes(frame),mode=1+next()%6,replayMode=next()%5,phase=next()%12;p[0x39d]=phase;for(let i=0;i<12;i++)p[0x384+i]=next()%128;p.writeFloatLE(value(4000),0x36c);p[0x2cd]=sample%2;m.view(0x6714b4,1)[0]=mode;m.view(0x66c238,1)[0]=replayMode;m.view(0x6883bc,1)[0]=0;
    setup(p,frame);m.call(0x452b30,{ecx:actor});c.actor_begin_spell(mode,replayMode);compare('spell '+sample);
    const expected=p[0x2cd]&&mode===3&&replayMode===1?[2,p[0x384+phase]]:[];assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.actor_events(),c.actor_event_count())),expected);checks++;
    const angle=value(3000),speed=value(200);const b=Buffer.alloc(8);b.writeFloatLE(angle);b.writeFloatLE(speed,4);m.call(0x40fb70,{ecx:actor,args:[b.readUInt32LE(),b.readUInt32LE(4)]});c.actor_polar_velocity(angle,speed);compare('polar velocity '+sample);
  }
  const movementFrames=frames.filter(f=>f.action<150);
  for(let sample=0;sample<9000;sample++){
    const frame=movementFrames[next()%movementFrames.length],p=bytes(frame),mode=1+next()%6,freeze=next()%3-1;p.writeInt16LE(next()%4-1,0x82);p.writeInt16LE(next()%4-1,0x3c8);p.writeInt16LE(next()%10001,0x324);p[0x52e]=next()%2;p.writeFloatLE(sample%2?0:value(500),0x48);for(const at of [0x4dc,0x4e0,0x4e8,0x4ec,0x4f0,0x4f4])p.writeInt32LE(next()%21-10,at);
    const o=new Float32Array([value(600),value(300),0,0,0,0,0,0]);memory(c,motion,32).set(new Uint8Array(o.buffer));c.motion_load(1,motion,-1,0,freeze);m.view(other,0x1000).fill(0);m.f32(other+0x44,o[0]);m.f32(other+0x48,o[1]);m.view(other+0x3b8,2).set(Buffer.from([freeze&255,(freeze>>8)&255]));m.view(0x6714b4,1)[0]=mode;m.u32(thread+0x14,next());setup(p,frame);actions=[];
    m.call(0x4521a0,{ecx:actor});c.actor_guarded_commands(mode,freeze);compare('guarded '+sample);assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.actor_actions(),c.actor_action_count())),actions);assert.equal(c.actor_random_state()>>>0,m.u32(thread+0x14));checks+=2;
  }
  report('fighter-owner-original',{passed:true,checks,resetSamples:6000,spellSamples:6000,velocitySamples:6000,guardedSamples:9000,scope:'native common reset, actual pattern binding, movement and aerial recovery, polar velocity and spell initialization; owned-object lifetime and character attack command boundary observed',originalFunctions:['0x457010','0x453d80','0x4521a0','0x452b30','0x40fb70','0x4071a0']});
 }finally{m.close();}
});
