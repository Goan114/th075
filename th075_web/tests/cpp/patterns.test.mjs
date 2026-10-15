import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';
import {core,oracle,root,memory,string,report} from './helpers.mjs';import {archiveIndex,archiveRead} from '../../scripts/native/archive.mjs';
test('Every original and 1.11 patched character pattern frame, visual value and collision rectangle',async()=>{
    const c=await core(),m=await oracle();let fixtureName,source,position=0,count=0,actions=new Map(),rectangles=new Map(),frameLists=new Map();const fighter=m.allocate(0x800),pointers=m.allocate(65536*4),baseline=m.heap;
    for(const e of m.importMap.values())if(e.name==='ReadFile'){e.argc=5;e.handler=()=>{const sp=m.reg('ESP'),out=m.u32(sp+8),n=m.u32(sp+12);assert.ok(position+n<=source.length,`original pattern read ${fixtureName} offset ${position} size ${n} of ${source.length}`);m.write(out,source.subarray(position,position+n));position+=n;m.u32(m.u32(sp+16),n);return 1;};}
    m.replace(0x6404f0,'pattern fixture pathname',()=>{const sp=m.reg('ESP'),out=m.u32(sp+4);m.write(out,Buffer.from('data\\character\\fixture\\fixture.pat\0'));return 40;});
    m.replace(0x41cf00,'archive catalog fixture',()=>fighter);m.replace(0x41d750,'archive file fixture',()=>1,1);
    m.replace(0x4421e0,'pointer table size fixture',()=>0);
    m.replace(0x458c20,'pointer table clear fixture',()=>0);m.replace(0x458c00,'pointer table resize fixture',()=>{count=m.u32(m.reg('ESP')+4);m.view(pointers,count*4).fill(0);return 0;},2);
    m.replace(0x458bc0,'pattern table element fixture',()=>pointers+m.u32(m.reg('ESP')+4)*4,1);
    // Replace only vendor storage construction/access. File reads, all field
    // conversions and control flow remain the original LoadPattern function.
    m.replace(0x4587e0,'temporary frame storage fixture',()=>{const p=m.reg('ECX');m.view(p,0x78).fill(0);return p;});m.replace(0x4588e0,'temporary frame destruction fixture',()=>0);
    m.replace(0x458960,'sequence storage fixture',()=>{const p=m.reg('ECX');m.view(p,20).fill(0);return p;});
    m.replace(0x458b30,'frame vector resize fixture',()=>{const p=m.reg('ECX'),n=m.u32(m.reg('ESP')+4),data=m.allocate(n*0x78);m.view(data,n*0x78).fill(0);frameLists.set(p,Array.from({length:n},(_,i)=>data+i*0x78));return 0;},2);
    m.replace(0x458af0,'frame vector element fixture',()=>{const list=frameLists.get(m.reg('ECX')),i=m.u32(m.reg('ESP')+4);assert.ok(list&&i<list.length);return list[i];},1);
    m.replace(0x458a10,'rectangle vector append fixture',()=>{const p=m.reg('ECX'),r=m.u32(m.reg('ESP')+4);if(!rectangles.has(p))rectangles.set(p,[]);rectangles.get(p).push(Buffer.from(m.bytes(r,16)));return 0;},1);
    m.replace(0x640490,'oracle memset',()=>{const sp=m.reg('ESP'),p=m.u32(sp+4);m.view(p,m.u32(sp+12)).fill(m.u32(sp+8)&255);return p;});
    const results=[];let frames=0,rects=0;
    try{for(const archive of ['th075.dat','th075b.dat']){const file=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)',archive);for(const entry of archiveIndex(file).entries){if(!entry.name.startsWith('data/character/')||!entry.name.endsWith('.pat'))continue;
        fixtureName=archive+"/"+entry.name;source=archiveRead(file,entry);position=0;console.log("pattern",fixtureName);frameLists.clear();rectangles.clear();m.heap=baseline;m.view(fighter,0x800).fill(0);m.call(0x457660,{ecx:fighter,limit:50000000});assert.equal(position,source.length);
        const p=c.core_alloc(source.length);memory(c,p,source.length).set(source);assert.equal(c.pattern_load(p,source.length),1,`${entry.name}: ${string(c,c.pattern_error())}`);assert.equal(c.pattern_count(),count);let nFrames=0,nRects=0,nSequences=0;
        for(let id=0;id<count;id++){const sequence=m.u32(pointers+id*4);assert.equal(c.pattern_present(id),sequence?1:0);if(!sequence)continue;nSequences++;
            assert.deepEqual(Buffer.from(memory(c,c.pattern_header(id),4)),Buffer.from(m.bytes(sequence+16,4)));const list=frameLists.get(sequence);assert.equal(c.pattern_frames(id),list.length);
            for(let i=0;i<list.length;i++){const native=list[i],values=Buffer.alloc(120),basic=Buffer.from(m.bytes(native,84)),visual=m.u32(native+8);basic.writeUInt32LE(0,8);basic.copy(values);if(visual)Buffer.from(m.bytes(visual,36)).copy(values,84);assert.equal(c.pattern_visual_present(id,i),visual?1:0);assert.deepEqual(Buffer.from(memory(c,c.pattern_frame(id,i),120)),values,`${entry.name} sequence ${id} frame ${i}`);
                for(let attack=0;attack<2;attack++){const r=rectangles.get(native+(attack?0x64:0x54))??[];assert.equal(c.pattern_rectangles(id,i,attack),r.length);assert.deepEqual(Buffer.from(memory(c,c.pattern_rectangle_data(id,i,attack),r.length*16)),Buffer.concat(r));nRects+=r.length;}nFrames++;
            }
        }frames+=nFrames;rects+=nRects;results.push({archive,name:entry.name,sequences:nSequences,frames:nFrames,rectangles:nRects});c.core_free(p);
    }}report('patterns-original',{passed:true,frames,rectangles:rects,results});}finally{m.close();}
});


