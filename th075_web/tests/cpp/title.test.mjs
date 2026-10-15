import test from 'node:test';import assert from 'node:assert/strict';
import {core,oracle,memory,report} from './helpers.mjs';
const globalAddresses=[0x6714b4,0x6714b8,0x671630,0x671633,0x67161d,0x6714c8,0x6714c9,0x671610,0x671611,0x6714cc,0x6714cd,0x6714ac,0x6714ad];
const globalSet=(m,g)=>globalAddresses.forEach((a,i)=>m.view(a,1)[0]=g[i]);
const globalGet=m=>Buffer.from(globalAddresses.map(a=>m.view(a,1)[0]));
test('title initialization, selection, sound and idle demonstrations match original',async()=>{
  const c=await core(),m=await oracle(),object=m.allocate(64),vtable=m.allocate(12),thread=m.allocate(0x100),fixture=c.core_alloc(64),globals=c.core_alloc(13),controls=c.core_alloc(48);
  let clock=0,escape=false,exit=false,events=[],checks=0,seed=0x803cf091;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const render=m.registerImport({dll:'scene platform boundary',name:'render boundary',argc:0,handler:()=>0});m.u32(vtable+8,render);
  for(const address of [0x4251c0,0x40ad80])m.replace(address,'resource base construction',()=>m.reg('ECX'));
  m.replace(0x40b1d0,'verified texture bank slot allocation',()=>0,1);m.replace(0x40bb80,'verified texture archive load',()=>1,2);
  for(const address of [0x403e50,0x403f40,0x406e80,0x4028f0])m.replace(address,'hardware polling/presentation boundary',()=>0);
  m.replace(0x407170,'keyboard boundary',()=>m.u32(m.reg('ESP')+4)===1&&escape?1:0,1);
  m.replace(0x4079c0,'sound observation',()=>{events.push(1,m.u32(m.reg('ESP')+4));return 0;},1);
  m.replace(0x407e60,'music fade observation',()=>{const sp=m.reg('ESP');events.push(2,...m.readWords(sp+4,4).map(x=>x|0));return 0;});
  m.replace(0x646196,'thread RNG state',()=>thread);m.view(0x66c238,1)[0]=0;
  for(const entry of m.importMap.values()){
    if(entry.name==='timeGetTime'){entry.argc=0;entry.handler=()=>clock;}
    if(entry.name==='DestroyWindow'){entry.argc=1;entry.handler=()=>{exit=true;return 1;};}
  }
  try{
    for(let menu=0;menu<10;menu++){
      clock=0xfffff000+menu*4;globalSet(m,Buffer.from([3,0,menu,0,1,2,3,0,0,0,0,0,0]));m.view(object,64).fill(0);m.call(0x43a020,{ecx:object});c.title_initialize(clock,clock,menu);
      assert.deepEqual(Buffer.from(memory(c,c.title_snapshot(),45)).subarray(12),Buffer.from(m.bytes(object+12,33)),'initialize '+menu);assert.deepEqual(Buffer.from(memory(c,c.title_selection(),13)),globalGet(m),'initial globals '+menu);checks+=2;
    }
    for(let sample=0;sample<7000;sample++){
      const f=Buffer.alloc(64),g=Buffer.from(Array.from({length:13},(_,i)=>i===0?next()%6+1:next()%6));g[2]=next()%10;g[3]=sample%2;g[1]=next()%2;
      f.writeUInt32LE([0,1,56999,57000,60000,60001,60002,0xffffffff][sample%8],12);f.writeUInt32LE(next(),16);f.writeInt32LE(sample%97===0?0x7fffffff:next()%3,28);
      for(let i=32;i<56;i++)f[i]=next()&255;f[56]=sample%10;
      const rng=next();m.write(object,f);m.u32(object,vtable);globalSet(m,g);m.u32(thread+0x14,rng);memory(c,fixture,64).set(f);memory(c,globals,13).set(g);c.title_fixture_load(fixture,globals,rng);
      const input=new Int32Array(12);for(let side=0;side<2;side++){input[side*6+1]=[-2,-1,0,1,2][next()%5];input[side*6+2]=next()%9===0?1:0;input[side*6+3]=next()%11===0?1:0;m.i32(0x671668+side*0x48,input[side*6+1]);m.i32(0x67166c+side*0x48,input[side*6+2]);m.i32(0x671670+side*0x48,input[side*6+3]);}
      memory(c,controls,48).set(new Uint8Array(input.buffer));clock=next();escape=next()%19===0;exit=false;events=[];
      const code=m.call(0x43a270,{ecx:object})&65535,transition=c.title_advance(controls,escape?1:0,clock);
      const expected=exit?8:({2:0,0x2203:1,0x2205:2,0x220c:3,0x220e:4,0x2209:5,0x2201:6,0x3304:7})[code];
      assert.equal(transition,expected,'transition '+sample);
      assert.deepEqual(Buffer.from(memory(c,c.title_snapshot()+12,45)),Buffer.from(m.bytes(object+12,45)),'title state '+sample);
      assert.deepEqual(Buffer.from(memory(c,c.title_selection(),13)),globalGet(m),'selection '+sample);
      assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.title_events(),c.title_event_count())),events,'sound '+sample);
      assert.equal(c.title_random_state()>>>0,m.u32(thread+0x14),'random '+sample);checks+=5;
    }
    report('title-state-original',{passed:true,checks,samples:7000,originalFunctions:['0x43a020','0x43a270','0x43abf0']});
  }finally{m.close();}
});
test('title scene submitted draw vertices equal original in every fade and selection',async()=>{
  const c=await core(),m=await oracle(),object=m.allocate(64),fixture=c.core_alloc(64),globals=c.core_alloc(13),device=m.allocate(4),vtable=m.allocate(0x130),textureTable=m.allocate(0x44),surface=m.allocate(4),surfaceTable=m.allocate(0x24),textures=Array.from({length:4},()=>m.allocate(4));
  const bank=m.allocate(80);m.view(bank,80).fill(0);const sizes=[[1024,512],[256,256],[512,256],[512,32]];let textureIndex=0,draws=[],checks=0;
  const method=(table,at,name,argc,handler)=>m.u32(table+at,m.registerImport({dll:'original drawing boundary',name,argc,handler}));
  m.u32(device,vtable);m.u32(0x671230,device);m.u32(surface,surfaceTable);textures.forEach(t=>m.u32(t,textureTable));
  method(textureTable,0x3c,'surface level',3,()=>{const sp=m.reg('ESP');textureIndex=textures.indexOf(m.u32(sp+4));assert.ok(textureIndex>=0);m.u32(m.u32(sp+12),surface);return 0;});
  method(surfaceTable,0x20,'texture dimensions',2,()=>{const p=m.u32(m.reg('ESP')+8);m.view(p,32).fill(0);m.u32(p+24,sizes[textureIndex][0]);m.u32(p+28,sizes[textureIndex][1]);return 0;});method(surfaceTable,8,'surface release',1,()=>0);
  method(vtable,0xf4,'bind texture',3,()=>{textureIndex=textures.indexOf(m.u32(m.reg('ESP')+12));return 0;});
  method(vtable,0x120,'capture vertices',5,()=>{const sp=m.reg('ESP');assert.equal(m.u32(sp+12),2);assert.equal(m.u32(sp+20),28);draws.push({texture:textureIndex,vertices:Buffer.from(m.bytes(m.u32(sp+16),112))});return 0;});
  method(vtable,0xc8,'pipeline state',3,()=>0);method(vtable,0xfc,'texture filter',4,()=>0);
  m.replace(0x402660,'begin frame',()=>1);m.replace(0x4027d0,'end frame',()=>0);m.replace(0x40c8c0,'texture bank lookup',()=>textures[m.u32(m.reg('ESP')+4)],1);
  for(const entry of m.importMap.values())if(entry.name==='SetRect'){entry.argc=5;entry.handler=()=>{const sp=m.reg('ESP');m.write(m.u32(sp+4),m.bytes(sp+8,16));return 1;};}
  m.f32(0x66c084,1);m.f32(0x66c080,1);m.f32(0x671220,0);m.f32(0x671224,0);m.call(0x41cae0);
  try{for(let sample=0;sample<160;sample++){
    const f=Buffer.alloc(64);for(let i=32;i<56;i++)f[i]=(sample*17+i*37)&255;f[56]=sample%10;m.write(object,f);m.u32(object+8,bank);memory(c,fixture,64).set(f);memory(c,globals,13).fill(0);c.title_fixture_load(fixture,globals,0);draws=[];
    m.call(0x43a7a0,{ecx:object});assert.equal(c.title_render(),23);assert.equal(draws.length,23);
    for(let i=0;i<draws.length;i++){const bytes=Buffer.from(memory(c,c.title_draw(i),116));assert.equal(bytes.readUInt32LE(0),draws[i].texture);assert.deepEqual(bytes.subarray(4),draws[i].vertices,'draw '+sample+'/'+i);checks++;}
  }report('title-draw-original',{passed:true,checks,scenes:160,drawsPerScene:23,originalFunction:'0x43a7a0'});}finally{m.close();}
});

