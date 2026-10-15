import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {core,oracle,memory,report,root} from './helpers.mjs';
test('all contact responses preserve original damage, side effects and order',async()=>{
 const c=await core(),m=await oracle(),actors=Array.from({length:3},()=>m.allocate(0x1000)),frame=m.allocate(120),targetFrame=m.allocate(120),scene=m.allocate(0x80),fixtures=Array.from({length:3},()=>c.core_alloc(0x1000)),patternPointer=c.core_alloc(120);const recordsPointer=c.core_alloc(16);let seed=0x54fefdc1,events=[],guard=0,checks=0,records=[0,0,0,0];
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const short=(p,at)=>{const b=Buffer.from(m.bytes(p+at,2));return b.readInt16LE();};
 m.replace(0x40fac0,'animation binding boundary verified in animation tests',()=>{const p=m.reg('ECX'),a=m.u32(m.reg('ESP')+4)&65535;m.view(p+0x60,6).fill(0);new DataView(m.view(p+0x60,2).buffer,m.view(p+0x60,2).byteOffset,2).setUint16(0,a,true);return 0;},1);
 m.replace(0x424e0,'unused wrong short address',()=>0);
 m.replace(0x4424e0,'contact effect observation',()=>{const sp=m.reg('ESP');events.push(2,short(sp,4),m.view(sp+8,1)[0]>=128?m.view(sp+8,1)[0]-256:m.view(sp+8,1)[0]);return 0;},2);
 m.replace(0x4079c0,'sound observation',()=>{events.push(1,m.i32(m.reg('ESP')+4));return 0;},1);
 m.replace(0x43d4d0,'combo counter observation',()=>{const sp=m.reg('ESP');events.push(3,short(sp,4),short(sp,8),m.i32(sp+12));return 0;},3);
 m.replace(0x455140,'independently verified guard decision',()=>guard,1);
 m.replace(0x445290,'profile maximum damage read boundary',()=>records[0]);
 m.replace(0x445250,'profile maximum hits read boundary',()=>records[1]);
 m.replace(0x445210,'profile maximum damage write boundary',()=>{records[0]=m.i32(m.reg('ESP')+4);return 0;},1);
 m.replace(0x4451d0,'profile maximum hits write boundary',()=>{records[1]=m.i32(m.reg('ESP')+4);return 0;},1);
 const asset=readFileSync(resolve(root,'reference/assets/th075b.dat/data/character/reimu/reimu.pat')),assetPointer=c.core_alloc(asset.length);memory(c,assetPointer,asset.length).set(asset);assert.equal(c.pattern_load(assetPointer,asset.length),1);
 const frames=[];for(let a=0;a<c.pattern_count();a++)if(c.pattern_present(a))for(let i=0;i<c.pattern_frames(a);i++)frames.push(Buffer.from(memory(c,c.pattern_frame(a,i),120)));
 const observed=[[0x40,1],[0x2d0,4],[0x60,7],[0x7c,8],[0x94,8],[0x324,4],[0x368,8],[0x3b0,2],[0x3b6,2],[0x3c0,14],[0x484,1]];
 const addresses=[0x444fc0,0x444770,0x443e90,0x4450e0,0x443fc0,0x4443b0,0x444020,0x4439a0,0x4431d0,0x444850,0x444650];
 try{for(let sample=0;sample<3500;sample++){
   const raw=actors.map((_,side)=>{const f=Buffer.alloc(0x1000);f[0x40]=1;f.writeFloatLE(next()%1280,0x44);f.writeFloatLE([0,-0.1,2,30][(sample+side)%4],0x48);f.writeInt16LE([0,49,50,71,73,84,140,142,143,149,150,300][(sample+side)%12],0x60);f.writeInt16LE(next()%20,0x62);f.writeInt16LE(next()%20,0x64);f[0x66]=(next()&1)?1:255;f.writeInt32LE(next()%8,0x7c);f.writeInt16LE(sample%13===0?-32768:next()%10,0x80);f.writeInt16LE(next()%15,0x82);f.writeInt16LE(sample%3?0:5,0x88);f.writeFloatLE((next()%1000)/100,0x94);f.writeFloatLE((next()%1000)/100,0x98);f.writeFloatLE([0.5,1,1.25][next()%3],0x9c);f.writeFloatLE([0.5,1,1.25][next()%3],0xa0);f.writeFloatLE([0.5,1,1.25][next()%3],0xa4);f[0x2cc]=(sample>>1)%2;f[0x2cd]=sample%2;f.writeUInt32LE(next(),0x2d0);f.writeInt16LE([0,1,10,-1][sample%4],0x3ca);f.writeInt16LE(sample%3===0?0:7,0x3cc);f[0x484]=next()%127;f.writeInt16LE([0,-1,1,100,5000,10000][(sample+side)%6],0x324);f.writeInt16LE(next()%10001,0x326);f.writeInt16LE(next()%10001,0x328);f[0x39d]=next()%3;for(let j=0;j<12;j++)f.writeInt16LE(1000+next()%20000,0x33e+j*2);f.writeFloatLE((next()%21000)/10,0x368);f.writeFloatLE((next()%9500)/10,0x36c);f[0x39c]=sample%9===0?1:0;f.writeInt16LE(sample%5===0?20:0,0x3a0);f.writeInt16LE([0,1,100,500,1000][sample%5],0x3b0);f.writeInt16LE(next()%1000,0x3b6);f[0x3ce]=sample%11===0?1:0;f[0x3be]=sample%3===0?1:0;f.writeFloatLE([0.1,0.3333,0.5,0.75,1][next()%5],0x3c0);f.writeInt16LE(next()%50,0x3c4);f.writeInt16LE(next()%10000,0x3c6);f.writeInt16LE(next()%100,0x3c8);return f;});
   const pat=Buffer.from(frames[next()%frames.length]);const targetFlags=[0,1,2,4,0x40,0x80,0x100,0xc0,0x140,0x200,0x400,0x4000,0x8000,0x10000,0x20000,0x20004][sample%16];pat.writeUInt32LE(pat.readUInt32LE(0x40)|[0,1,2,4,0x20,0x100,0x400,0x2000,0x4000,0x8000,0x100000,0x100400][Math.floor(sample/16)%12],0x40);if(sample%3===0){pat.writeInt16LE(next()%4000,0x10);pat.writeFloatLE([0.5,0.75,0.9,1][next()%4],0x14);pat.writeInt16LE(next()%200,0x18);}
   guard=[0,11,12,13,21,22,23,31,41][sample%9];const story=sample%2,active=sample%2,action=143+sample%3;
   for(let operation=0;operation<11;operation++){
     for(let side=0;side<3;side++){memory(c,fixtures[side],0x1000).set(raw[side]);c.impact_load(side,fixtures[side],side===2?targetFlags:0);m.write(actors[side],raw[side]);m.u32(actors[side]+0x2e8,actors[side===2?1:2]);m.u32(actors[side]+0xac,side===2?targetFrame:frame);}
     records=[next()%10001,next()%50,next()%50,next()];new Int32Array(c.memory.buffer,recordsPointer,4).set(records);c.impact_records_load(recordsPointer);new DataView(m.view(0x6714c0,2).buffer,m.view(0x6714c0,2).byteOffset,2).setInt16(0,records[2],true);m.u32(0x6714b0,records[3]);
     memory(c,patternPointer,120).set(pat);c.impact_pattern(patternPointer);m.write(frame,pat);m.u32(targetFrame+0x3c,targetFlags);m.view(scene+0x18,1)[0]=active;m.view(0x6714b4,1)[0]=story?3:1;events=[];
     const returned=m.call(addresses[operation],{ecx:scene,args:operation===4?[actors[2],action]:actors});const result=c.impact_apply(operation,guard,story,active,action);
     if([0,1,3,6,7,9].includes(operation))assert.equal(result,returned&255,'return '+sample+'/'+operation);
     for(let side=0;side<3;side++){const out=Buffer.from(memory(c,c.impact_snapshot(side),0x1000)),original=Buffer.from(m.bytes(actors[side],0x1000));for(const [at,size] of observed)assert.deepEqual(out.subarray(at,at+size),original.subarray(at,at+size),'state '+sample+'/'+operation+'/'+side+' @'+at.toString(16));}
     assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.impact_events(),c.impact_event_count())),events,'events '+sample+'/'+operation);assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,c.impact_records_values(),4)),[records[0]>>>0,records[1]>>>0,short(0x6714c0,0)>>>0,m.u32(0x6714b0)],'records '+sample+'/'+operation);checks++;
   }
 }report('collision-response-original',{passed:true,samples:3500,checks,originalFunctions:addresses.map(a=>'0x'+a.toString(16)),sourcePattern:'patch Reimu PAT',scope:'typed contact side effects, actual damage calculation and ordered sound/effect/HUD observations'});
 }finally{m.close();}
});
