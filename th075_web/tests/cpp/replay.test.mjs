import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report,string} from './helpers.mjs';
test('original replay records write and load all four independent queues byte for byte',async()=>{
  const c=await core(),m=await oracle(),object=m.allocate(0x1a4),scratch=m.allocate(4),headerPointer=c.core_alloc(60),metadataPointer=c.core_alloc(14),buffers=[c.core_alloc(512),c.core_alloc(512),c.core_alloc(512),c.core_alloc(512)],inputFile=c.core_alloc(20000);let file=Buffer.alloc(0),position=0,seed=0xa2c97ed1,checks=0;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  for(const entry of m.importMap.values()){
    if(entry.name==='SetFilePointer'){entry.argc=4;entry.handler=()=>{const sp=m.reg('ESP'),delta=m.i32(sp+8),origin=m.u32(sp+16);position=(origin===0?0:origin===1?position:file.length)+delta;return position;};}
    if(entry.name==='WriteFile'){entry.argc=5;entry.handler=()=>{const sp=m.reg('ESP'),bytes=Buffer.from(m.bytes(m.u32(sp+8),m.u32(sp+12)));if(position+bytes.length>file.length){const larger=Buffer.alloc(position+bytes.length);file.copy(larger);file=larger;}bytes.copy(file,position);position+=bytes.length;m.u32(m.u32(sp+16),bytes.length);return 1;};}
    if(entry.name==='CreateFileA'){entry.argc=7;entry.handler=()=>{position=0;return 1;};}
    if(entry.name==='ReadFile'){entry.argc=5;entry.handler=()=>{const sp=m.reg('ESP'),n=m.u32(sp+12),p=m.u32(sp+8),bytes=file.subarray(position,position+n);m.write(p,bytes);position+=bytes.length;m.u32(m.u32(sp+16),bytes.length);assert.equal(bytes.length,n,'original replay read within file');return 1;};}
    if(entry.name==='CloseHandle'){entry.argc=1;entry.handler=()=>1;}
  }
  try{for(let sample=0;sample<80;sample++){
    m.view(object,0x1a4).fill(0);m.call(0x413650,{ecx:object});m.u32(object,1);const header=Buffer.from(Array.from({length:60},()=>next()&255));header[14]=0;m.write(object+0x108,header);memory(c,headerPointer,60).set(header);c.replay_new(headerPointer);file=Buffer.alloc(0);position=0;
    const rounds=1+sample%8,expected=[];
    for(let round=0;round<rounds;round++){
      const meta=Buffer.from(Array.from({length:14},()=>next()&255));meta.copy(Buffer.from(m.view(object+0x144,7).buffer,m.view(object+0x144,7).byteOffset,7),0,0,7);m.write(object+0x14c,meta.subarray(7,10));m.write(object+0x150,meta.subarray(10,14));memory(c,metadataPointer,14).set(meta);
      const counts=[next()%200,next()%120,next()%160,next()%100],widths=[1,2,1,4],data=counts.map((n,i)=>Buffer.from(Array.from({length:n*widths[i]},()=>next()&255)));
      const offsets=[0x154,0x168,0x17c,0x190],append=[0x414450,0x414640,0x414450,0x414830];
      for(let type=0;type<4;type++){memory(c,buffers[type],data[type].length).set(data[type]);for(let i=0;i<counts[type];i++){m.write(scratch,data[type].subarray(i*widths[type],(i+1)*widths[type]));m.call(append[type],{ecx:object+offsets[type],args:[scratch]});}}
      c.replay_append(metadataPointer,buffers[0],counts[0],buffers[1],counts[1],buffers[2],counts[2],buffers[3],counts[3]);m.call(0x413de0,{ecx:object});expected.push({meta,data,counts});
    }
    const original=Buffer.concat([Buffer.from(m.bytes(object+0x108,60)),file]);assert.equal(c.replay_encode(),1);const ported=Buffer.from(memory(c,c.replay_data(),c.replay_size()));assert.deepEqual(ported,original,'serialized replay '+sample);checks++;
    assert.ok(original.length<20000);memory(c,inputFile,original.length).set(original);assert.equal(c.replay_load(inputFile,original.length),1,string(c,c.replay_error()));assert.equal(c.replay_round_count(),rounds);file=original;
    for(let round=0;round<rounds;round++){
      m.call(0x413ac0,{ecx:object,args:[round]});const nativeMeta=Buffer.concat([Buffer.from(m.bytes(object+0x144,7)),Buffer.from(m.bytes(object+0x14c,3)),Buffer.from(m.bytes(object+0x150,4))]);assert.deepEqual(nativeMeta,expected[round].meta);
      const widths=[1,2,1,4],offsets=[0x154,0x168,0x17c,0x190],front=[0x454d50,0x454e10,0x454d50,0x4464c0],pop=[0x454d70,0x454e30,0x454d70,0x4464e0];
      for(let type=0;type<4;type++){
        assert.equal(c.replay_queue_count(round,type),expected[round].counts[type]);const actual=Buffer.alloc(expected[round].data[type].length);
        for(let i=0;i<expected[round].counts[type];i++){const p=m.call(front[type],{ecx:object+offsets[type]});actual.set(m.bytes(p,widths[type]),i*widths[type]);m.call(pop[type],{ecx:object+offsets[type]});}
        assert.deepEqual(Buffer.from(memory(c,c.replay_queue_data(round,type),actual.length)),actual,'decoded queue '+sample+'/'+round+'/'+type);checks++;
      }
    }
  }
  // Reject impossible counts before allocating a queue from untrusted imported bytes.
  const bad=Buffer.alloc(90);bad[14]=1;bad.writeUInt32LE(0xffffffff,74);memory(c,inputFile,bad.length).set(bad);assert.equal(c.replay_load(inputFile,bad.length),0);assert.equal(c.replay_round_count(),0);
  report('replay-file-original',{passed:true,checks,files:80,originalFunctions:['0x413de0','0x413ac0'],queueOrder:['held inputs','recorded signed random words','auxiliary commands and guard choices','frame/event pairs']});
  }finally{m.close();}
});
test('recorded random values replace live generator calls during playback',async()=>{
  const c=await core(),m=await oracle(),thread=m.allocate(0x100),word=m.allocate(2),header=c.core_alloc(60),metadata=c.core_alloc(14),data=c.core_alloc(10000);let queue=[],recorded=[],seed=0x09183654,checks=0;
  memory(c,header,60).fill(0);memory(c,metadata,14).fill(0);c.replay_new(header);c.replay_append(metadata,data,0,data,0,data,0,data,0);c.replay_stream_bind(1,0,seed);
  m.replace(0x646196,'thread state',()=>thread);m.u32(thread+0x14,seed);m.view(0x66c238,1)[0]=1;
  m.replace(0x414640,'random recording observation',()=>{recorded.push(Buffer.from(m.bytes(m.u32(m.reg('ESP')+4),2)).readInt16LE());return 0;},1);
  m.replace(0x414620,'random queue length',()=>queue.length);m.replace(0x454e10,'random queue front',()=>{new DataView(m.view(word,2).buffer,m.view(word,2).byteOffset,2).setInt16(0,queue[0],true);return word;});m.replace(0x454e30,'random queue pop',()=>{queue.shift();return 0;});
  try{for(let i=0;i<5000;i++){const low=(i*17)%3000-1000,high=low+(i*43)%1000;assert.equal(c.replay_stream_range(low,high),m.call(0x455580,{args:[low,high]})|0);assert.equal(c.replay_stream_state()>>>0,m.u32(thread+0x14));checks++;}
    assert.equal(c.replay_queue_count(0,1),5000);const values=Buffer.from(memory(c,c.replay_queue_data(0,1),10000));assert.deepEqual(Array.from({length:5000},(_,i)=>values.readInt16LE(i*2)),recorded);
    queue=recorded.slice();m.view(0x66c238,1)[0]=2;c.replay_stream_bind(2,0,seed);
    for(let i=0;i<5050;i++){const low=(i*23)%3000-1500,high=low+(i*31)%3000;assert.equal(c.replay_stream_range(low,high),m.call(0x455580,{args:[low,high]})|0);assert.equal(c.replay_stream_state()>>>0,seed);checks++;}
    report('replay-random-original',{passed:true,checks,recorded:5000,playback:5050,originalFunction:'0x455580'});
  }finally{m.close();}
});
