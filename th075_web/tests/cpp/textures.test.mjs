import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,openSync,closeSync,readSync} from 'node:fs';import {resolve} from 'node:path';
import {core,oracle,root,memory,string,report,sha} from './helpers.mjs';
import {archiveIndex,archiveRead} from '../../scripts/native/archive.mjs';
function meta(c,i){return Array.from(new Uint32Array(c.memory.buffer,c.texture_meta(i),5));}
test('Every shipped texture record and palette equals the original texture-pack loader; decoded pixels equal the original bitmap routine',async()=>{
    const c=await core(),m=await oracle();let source,position,count,records=[];const bank=m.allocate(0x50),slots=m.allocate(0x10000),path=m.allocate(256),bitmap=m.allocate(0x40),colorBytes=m.allocate(512);m.write(path,Buffer.from('texture-fixture.dat\0'));m.view(bank,0x50).fill(0);const baseline=m.heap;
    for(const entry of m.importMap.values()){
        if(entry.name==='CreateFileA'){entry.argc=7;entry.handler=()=>{position=0;return 1;};}
        if(entry.name==='ReadFile'){entry.argc=5;entry.handler=()=>{const sp=m.reg('ESP'),dest=m.u32(sp+8),bytes=m.u32(sp+12);assert.ok(position+bytes<=source.length,'original read outside texture file');m.write(dest,source.subarray(position,position+bytes));position+=bytes;m.u32(m.u32(sp+16),bytes);return 1;};}
        if(entry.name==='SetFilePointer'){entry.argc=4;entry.handler=()=>{const sp=m.reg('ESP'),offset=m.i32(sp+8),origin=m.u32(sp+16);position=(origin===1?position:origin===2?source.length:0)+offset;assert.ok(position>=0&&position<=source.length);return position;};}
        if(entry.name==='CloseHandle'){entry.argc=1;entry.handler=()=>1;}
    }
    m.replace(0x40dd20,'texture slot count fixture',()=>count);m.replace(0x40dd60,'texture slot fixture',()=>slots+m.u32(m.reg('ESP')+4)*0x30,1);m.replace(0x40dee0,'texture handle fixture',()=>slots,1);
    m.replace(0x401c20,'GPU allocation boundary',()=>1);m.replace(0x40c590,'GPU upload boundary',()=>0,1);
    m.replace(0x41b2b0,'capture original serialized image',()=>{const at=m.u32(m.reg('ESP')+4),object=m.reg('ECX'),width=m.u32(at),height=m.u32(at+4),stride=m.u32(at+8),depth=m.view(at+12,1)[0],packed=m.u32(at+16),data=m.u32(at+20),bytes=packed||stride*height*(depth>=24?4:depth/8);records.push({meta:[width,height,stride,depth,packed],data:Buffer.from(m.bytes(data,bytes)),palette:Buffer.from(m.bytes(m.u32(object+20)||colorBytes,512))});m.view(object,1)[0]=depth;m.u32(object+4,width);m.u32(object+8,height);return 0;},1);
    const results=[],verifiedImages=new Set();let pixelChecks=0,totalPixels=0,duplicateImages=0;
    try{for(const archive of ['th075.dat','th075b.dat','th075c.dat']){
        const file=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)',archive);
        for(const entry of archiveIndex(file).entries){if(!entry.name.endsWith('.dat')||entry.name.endsWith('cardlist.dat')||entry.name==='musicroom.dat'||entry.name.startsWith('wave/'))continue;
            source=archiveRead(file,entry);const p=c.core_alloc(source.length);memory(c,p,source.length).set(source);
            for(const palette of source[0]?Array.from({length:source[0]},(_,i)=>i+1):[1]){
                assert.equal(c.texture_load(p,source.length,palette),1,`${archive}/${entry.name}: ${string(c,c.texture_error())}`);count=c.texture_count();assert.ok(count>0);
                records=[];m.heap=baseline;m.view(bank,0x50).fill(0);m.view(slots,0x10000).fill(0);m.call(0x40b7c0,{ecx:bank,args:[path,palette],limit:10000000});assert.equal(position,source.length,'original consumed entire pack');assert.equal(records.length,count);
                let pixels=0;
                for(let i=0;i<count;i++){
                    const values=meta(c,i),r=records[i];assert.deepEqual(values,r.meta,`${entry.name} record ${i}`);assert.deepEqual(Buffer.from(memory(c,c.texture_storage(i),c.texture_storage_size(i))),r.data);if(source[0])assert.deepEqual(Buffer.from(memory(c,c.texture_palette(i),512)),r.palette);
                    // The resource loader itself stays original. For CPU pixel
                    // comparison, call the original unpacker against captured bytes.
                    const imageKey=sha(Buffer.concat([Buffer.from(new Uint32Array(values).buffer),r.data,r.palette]));if(verifiedImages.has(imageKey)){pixels+=values[0]*values[1];duplicateImages++;continue;}const heap=m.heap,data=m.allocate(r.data.length),width=values[0],height=values[1],stride=width+(width&1),bytes=values[3]>=24?4:2,out=m.allocate(stride*height*bytes);
                    m.write(data,r.data);m.view(out,stride*height*bytes).fill(0);m.write(colorBytes,r.palette);m.view(bitmap,0x40).fill(0);m.view(bitmap,1)[0]=values[3];m.u32(bitmap+4,width);m.u32(bitmap+8,height);m.u32(bitmap+12,values[2]);m.u32(bitmap+16,values[4]);m.u32(bitmap+20,colorBytes);m.u32(bitmap+28,data);
                    m.call(0x41b990,{ecx:bitmap,args:[out,values[3],stride],limit:Math.max(1000000,width*height*160)});
                    const cpp=c.texture_decode(i,stride);assert.ok(cpp,`C++ decode ${entry.name}/${i}`);assert.equal(c.texture_decoded_size(),stride*height*bytes);assert.deepEqual(Buffer.from(memory(c,cpp,c.texture_decoded_size())),Buffer.from(m.bytes(out,stride*height*bytes)),`${archive}/${entry.name} palette ${palette} pixels ${i}`);
                    pixels+=width*height;pixelChecks++;verifiedImages.add(imageKey);m.heap=heap;
                }
                totalPixels+=pixels;results.push({archive,name:entry.name,palette,images:count,pixels,sha256:sha(source)});report("textures-original-progress",{passed:false,packs:results.length,uniqueImages:pixelChecks,duplicateImages,totalPixels,results});
            }c.core_free(p);if(results.length%20===0)console.log(`validated texture packs ${results.length}, images ${pixelChecks}`);
        }
    }report('textures-original',{passed:true,packs:results.length,uniqueImages:pixelChecks,duplicateImages,totalPixels,results});}finally{m.close();}
});

