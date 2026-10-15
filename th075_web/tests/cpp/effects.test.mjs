import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';
import {core,oracle,root,memory,report} from './helpers.mjs';import {archiveIndex,archiveRead} from '../../scripts/native/archive.mjs';
test('All effect frames and optional transforms equal original effect pattern loader',async()=>{
    const c=await core(),m=await oracle(),owner=m.allocate(0x100),slots=m.allocate(65536*4),lists=new Map();let source,position=0,count=0;
    for(const e of m.importMap.values())if(e.name==='ReadFile'){e.argc=5;e.handler=()=>{const sp=m.reg('ESP'),out=m.u32(sp+8),n=m.u32(sp+12);assert.ok(position+n<=source.length);m.write(out,source.subarray(position,position+n));position+=n;m.u32(m.u32(sp+16),n);return 1;};}
    m.replace(0x41cf00,'archive selection boundary',()=>owner);m.replace(0x41d750,'archive file boundary',()=>1,1);
    m.replace(0x5f8340,'pointer table size fixture',()=>0);m.replace(0x5f83e0,'pointer table clear fixture',()=>0);
    m.replace(0x5f83c0,'pointer table resize fixture',()=>{count=m.u32(m.reg('ESP')+4);m.view(slots,count*4).fill(0);return 0;},2);
    m.replace(0x5f8380,'pointer table element fixture',()=>slots+m.u32(m.reg('ESP')+4)*4,1);
    m.replace(0x458880,'temporary frame storage fixture',()=>{const p=m.reg('ECX');m.view(p,16).fill(0);return p;});m.replace(0x4588e0,'temporary frame destructor fixture',()=>0);
    m.replace(0x5f7f20,'effect sequence storage fixture',()=>m.reg('ECX'));
    m.replace(0x5f8000,'effect frame vector resize fixture',()=>{const p=m.reg('ECX'),n=m.u32(m.reg('ESP')+4),data=m.allocate(n*16);m.view(data,n*16).fill(0);lists.set(p,Array.from({length:n},(_,i)=>data+i*16));return 0;},2);
    m.replace(0x5f7fc0,'effect frame vector element fixture',()=>lists.get(m.reg('ECX'))[m.u32(m.reg('ESP')+4)],1);
    const results=[];let frames=0;try{for(const archive of ['th075.dat','th075b.dat','th075c.dat']){
        const file=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)',archive);for(const entry of archiveIndex(file).entries){if(entry.name!=='data/system/effect/effect.pat')continue;
            source=archiveRead(file,entry);const p=c.core_alloc(source.length);memory(c,p,source.length).set(source);assert.equal(c.effect_pattern_load(p,source.length),1);
            position=0;m.call(0x5f71f0,{ecx:owner,limit:10000000});assert.equal(position,source.length);assert.equal(c.effect_pattern_count(),count);let nFrames=0;
            for(let id=0;id<count;id++){const sequence=m.u32(slots+id*4);assert.equal(c.effect_pattern_present(id),sequence?1:0);if(!sequence)continue;const list=lists.get(sequence);assert.equal(c.effect_pattern_frames(id),list.length);
                for(let i=0;i<list.length;i++){const values=Buffer.alloc(52),basic=Buffer.from(m.bytes(list[i],16)),visual=m.u32(list[i]+8);basic.writeUInt32LE(0,8);basic.copy(values);if(visual)Buffer.from(m.bytes(visual,36)).copy(values,16);assert.equal(c.effect_pattern_visual(id,i),visual?1:0);assert.deepEqual(Buffer.from(memory(c,c.effect_pattern_frame(id,i),52)),values,`${archive} effect ${id} frame ${i}`);nFrames++;}
            }results.push({archive,name:entry.name,slots:count,frames:nFrames});frames+=nFrames;c.core_free(p);
        }
    }report('effect-patterns-original',{passed:true,frames,results});}finally{m.close();}
});
