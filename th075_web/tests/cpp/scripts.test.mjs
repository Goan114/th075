import test from 'node:test';import assert from 'node:assert/strict';import {resolve} from 'node:path';
import {core,oracle,root,memory,string,report} from './helpers.mjs';import {archiveIndex,archiveRead} from '../../scripts/native/archive.mjs';
test('All original, patched and Chinese story scripts decrypt and parse identically to the original',async()=>{
    const c=await core(),m=await oracle(),script=m.allocate(0x810);let source,position=0,blocks=[],records=new Map();const baseline=m.heap;
    for(const e of m.importMap.values())if(e.name==='ReadFile'){e.argc=5;e.handler=()=>{const sp=m.reg('ESP'),out=m.u32(sp+8),n=m.u32(sp+12);assert.ok(position+n<=source.length);m.write(out,source.subarray(position,position+n));position+=n;m.u32(m.u32(sp+16),n);return 1;};}
    m.replace(0x41cf00,'script archive catalog fixture',()=>script);m.replace(0x41d800,'script archive read fixture',()=>{m.u32(m.u32(m.reg('ESP')+8),source.length);return 1;},2);
    m.replace(0x421250,'block vector constructor fixture',()=>m.reg('ECX'));m.replace(0x4212a0,'block vector destructor fixture',()=>0);
    m.replace(0x4215f0,'block vector append fixture',()=>{const p=m.allocate(16);m.view(p,16).fill(0);blocks.push(p);records.set(p,[]);return 0;},1);
    m.replace(0x421550,'block vector count fixture',()=>blocks.length);m.replace(0x4215c0,'block vector back fixture',()=>{assert.ok(blocks.length);return blocks.at(-1);});
    m.replace(0x4213e0,'record vector append fixture',()=>{const p=m.reg('ECX'),at=m.allocate(8);m.write(at,m.bytes(m.u32(m.reg('ESP')+4),8));records.get(p).push(at);return 0;},1);
    m.replace(0x4213b0,'record vector back fixture',()=>{const list=records.get(m.reg('ECX'));assert.ok(list?.length);return list.at(-1);});
    const results=[];let total=0;
    try{for(const archive of ['th075.dat','th075b.dat','th075c.dat']){const file=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)',archive);for(const entry of archiveIndex(file).entries){if(!entry.name.endsWith('.sce'))continue;
        source=archiveRead(file,entry);position=0;blocks=[];records=new Map();m.heap=baseline;m.view(script,0x810).fill(0);m.view(script,2000).fill(255);m.call(0x4205f0,{ecx:script,args:[0,0],limit:10000000});assert.equal(position,source.length);
        const p=c.core_alloc(source.length);memory(c,p,source.length).set(source);assert.equal(c.script_load(p,source.length),1,`${entry.name}: ${string(c,c.script_error())}`);assert.equal(c.script_blocks(),blocks.length);assert.deepEqual(Buffer.from(memory(c,c.script_labels(),2000)),Buffer.from(m.bytes(script,2000)));
        let count=0;for(let b=0;b<blocks.length;b++){const list=records.get(blocks[b]);assert.equal(c.script_records(b),list.length);for(let i=0;i<list.length;i++){const r=list[i],kind=m.view(r,1)[0],arg=new DataView(m.bytes(r+2,2).buffer).getInt16(0,true);assert.equal(c.script_record_kind(b,i),kind);assert.equal(c.script_record_argument(b,i),arg,`${entry.name} block ${b} record ${i} argument`);const text=m.u32(r+4);let actual=Buffer.alloc(0);if(text){const bytes=m.bytes(text,2048),end=bytes.indexOf(0);assert.ok(end>=0);actual=Buffer.from(bytes.subarray(0,end));}assert.deepEqual(Buffer.from(memory(c,c.script_record_text(b,i),c.script_record_text_size(b,i))),actual,`${entry.name} text ${b}/${i}`);count++;}}
        total+=count;results.push({archive,name:entry.name,blocks:blocks.length,records:count});c.core_free(p);
    }}report('scripts-original',{passed:true,records:total,results});}finally{m.close();}
});
