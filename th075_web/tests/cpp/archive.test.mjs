import test from 'node:test';import assert from 'node:assert/strict';
import {openSync,readSync,closeSync,statSync,readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {core,oracle,root,memory,string,report} from './helpers.mjs';
test('Original 1.11 archive directory: every Japanese, patch, BGM and Chinese entry',async()=>{
    const c=await core(),m=await oracle(),archive=m.allocate(0x30);let index,position,nativeEntries=[];
    for(const entry of m.importMap.values()){
        if(entry.name==='CreateFileA'){entry.argc=7;entry.handler=()=>{position=0;return 1;};}
        if(entry.name==='ReadFile'){entry.argc=5;entry.handler=()=>{const sp=m.reg('ESP'),dest=m.u32(sp+8),count=m.u32(sp+12),result=m.u32(sp+16);assert.ok(position+count<=index.length);m.write(dest,index.subarray(position,position+count));position+=count;m.u32(result,count);return 1;};}
        if(entry.name==='CloseHandle'){entry.argc=1;entry.handler=()=>1;}
    }
    m.replace(0x41d9c0,'capture original archive record',()=>{const record=m.u32(m.reg('ESP')+4),bytes=Buffer.from(m.bytes(record,108)),name=bytes.subarray(0,100),end=name.indexOf(0);nativeEntries.push({name:name.subarray(0,end).toString().replaceAll('\\','/'),size:bytes.readUInt32LE(100),offset:bytes.readUInt32LE(104)});return 0;},1);
    const path=m.allocate(256);m.write(path,Buffer.from('original-fixture.dat\0'));
    const results=[];
    try{for(const name of ['th075.dat','th075b.dat','th075bgm.dat','th075c.dat']){
        const file=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)',name),fd=openSync(file,'r');let count;
        try{const header=Buffer.alloc(2);assert.equal(readSync(fd,header,0,2,0),2);count=header.readUInt16LE();index=Buffer.alloc(2+count*108);assert.equal(readSync(fd,index,0,index.length,0),index.length);}finally{closeSync(fd);}
        nativeEntries=[];m.view(archive,0x30).fill(0);m.call(0x41d510,{ecx:archive,args:[path]});assert.equal(nativeEntries.length,count);
        const p=c.core_alloc(index.length);memory(c,p,index.length).set(index);assert.equal(c.archive_read_index(p,index.length,statSync(file).size),1,string(c,c.archive_error()));assert.equal(c.archive_count(),count);
        const actual=Array.from({length:count},(_,i)=>({name:string(c,c.archive_name(i)),size:c.archive_size(i),offset:c.archive_offset(i)}));assert.deepEqual(actual,nativeEntries,name);
        results.push({archive:name,entries:count});c.core_free(p);
    }report('archive-original',{passed:true,results});}finally{m.close();}
});
test('Malformed archive paths and truncated indices are rejected',async()=>{
    const c=await core(),index=Buffer.alloc(110);index.writeUInt16LE(1);index.write('../outside.dat',2);index.writeUInt32LE(1,102);index.writeUInt32LE(110,106);let key=100,step=100;for(let i=2;i<110;i++){index[i]^=key;key=(key+step)&255;step=(step+77)&255;}
    const p=c.core_alloc(index.length);memory(c,p,index.length).set(index);assert.equal(c.archive_read_index(p,index.length,111),0);assert.equal(c.archive_count(),0);assert.equal(c.archive_read_index(p,20,111),0);c.core_free(p);
});
