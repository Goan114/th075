import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
test('Animation action/frame/duration counters, wrap and rebind order equal original',async()=>{
    const c=await core(),m=await oracle(),actor=m.allocate(0x100),vtable=m.allocate(16),cp=c.core_alloc(10),durations=c.core_alloc(512);let calls=0;const times=new Int16Array(256);
    for(let i=0;i<256;i++)times[i]=(i*73)%25-1;memory(c,durations,512).set(new Uint8Array(times.buffer));
    const rebound=m.registerImport({dll:'test',name:'frame binding boundary',argc:0,handler:()=>{calls++;const p=m.reg('ECX'),i=new DataView(m.view(p+0x62,2).buffer,m.view(p+0x62,2).byteOffset,2).getInt16(0,true);new DataView(m.view(p+0x72,2).buffer,m.view(p+0x72,2).byteOffset,2).setInt16(0,times[i&255],true);return 0;}});m.u32(vtable,rebound);let checks=0;
    const read=at=>{const b=m.view(actor+at,2);return new DataView(b.buffer,b.byteOffset,2).getInt16(0,true);};
    try{for(let sample=0;sample<1000;sample++){
        const values=new Int16Array([sample%999,(sample%7)-1,[0,1,32767,-1][sample%4],(sample%31)+1,(sample%19)-1]);memory(c,cp,10).set(new Uint8Array(values.buffer));c.animation_load(cp,durations);m.view(actor,0x100).fill(0);m.u32(actor,vtable);calls=0;
        [0x60,0x62,0x64,0x70,0x72].forEach((at,i)=>{const b=m.view(actor+at,2);new DataView(b.buffer,b.byteOffset,2).setInt16(0,values[i],true);});
        const check=()=>{assert.deepEqual(Array.from(new Int16Array(c.memory.buffer,c.animation_values(),5)),[0x60,0x62,0x64,0x70,0x72].map(read));assert.equal(c.animation_bindings(),calls);checks++;};
        if(sample%4===0){m.call(0x40fac0,{ecx:actor,args:[sample%500]});c.animation_reset(sample%500);check();}
        else if(sample%4===1){const args=[sample%500,sample%8,sample%31];m.call(0x40fb00,{ecx:actor,args});c.animation_set(...args);check();}
        else if(sample%4===2){m.call(0x40fb40,{ecx:actor,args:[sample%15]});c.animation_select(sample%15);check();}
        for(let i=0;i<80;i++){const native=m.call(0x40fa30,{ecx:actor})&65535;assert.equal(c.animation_advance()&65535,native);check();}
    }report('animation-original',{passed:true,samples:1000,updates:checks});}finally{m.close();}
});
