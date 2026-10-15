import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
test('Directional and button commands scan the original chronological input window',async()=>{
    const c=await core(),m=await oracle(),actor=m.allocate(0x1000),map=m.allocate(8*4),chunks=m.allocate(8*16),pattern=m.allocate(32),cp=c.core_alloc(32),history=c.core_alloc(90),counts=c.core_alloc(24);let seed=0x12f64ed9,checks=0;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};const tokens='123456789NABCDLRX',patterns=['236A','214B','623C','22D','66','44','236236X','LRX','NAX','DB','X','AB'];
    m.view(actor,0x1000).fill(0);for(let i=0;i<8;i++)m.u32(map+i*4,chunks+i*16);m.u32(actor+0x51c,map);m.u32(actor+0x520,8);m.u32(actor+0x524,0);m.u32(actor+0x528,90);memory(c,counts,24).fill(0);
    try{for(let sample=0;sample<10000;sample++){
        const raw=Buffer.from(Array.from({length:90},()=>random()%256));if(sample%4===0){raw.fill(0);raw.set([8,8,10,10,2,18,2,2,8,8,10,2,66],77);}m.write(chunks,raw);memory(c,history,90).set(raw);c.controls_reset(counts,history);
        const text=sample<patterns.length?patterns[sample]:sample%3===0?patterns[sample%patterns.length]:Array.from({length:1+random()%8},()=>tokens[random()%tokens.length]).join('');const bytes=Buffer.from(text+'\0');m.write(pattern,bytes);memory(c,cp,bytes.length).set(bytes);
        const window=1+random()%90,facing=sample&1?1:-1;m.view(actor+0x66,1)[0]=facing&255;const expected=m.call(0x455800,{ecx:actor,args:[pattern,text.length,window]})&255;assert.equal(c.controls_match(cp,text.length,window,facing),expected,`${text} window ${window}`);checks++;
    }report('commands-original',{passed:true,checks,samples:10000});}finally{m.close();}
});
test('Player held counters, attack edge history and ten-frame action input buffering equal original',async()=>{
    const c=await core(),m=await oracle(),actor=m.allocate(0x1000),vtable=m.allocate(0x40),history=c.core_alloc(90),counts=c.core_alloc(24),queue=Array(90).fill(0);let raw=[0,0,0,0,0,0],checks=0,choiceCalls=0;
    m.view(actor,0x1000).fill(0);memory(c,history,90).fill(0);memory(c,counts,24).fill(0);c.controls_reset(counts,history);m.u32(actor,vtable);m.u32(vtable+0x34,m.registerImport({dll:'test',name:'character command callback',argc:0,handler:()=>{choiceCalls++;return 0;}}));m.view(0x66c238,1)[0]=0;
    m.replace(0x406e80,'verified input-device boundary',()=>{for(let i=0;i<6;i++)m.i32(actor+0x4c0+i*4,raw[i]);return 0;});
    m.replace(0x414450,'history append fixture',()=>{queue.push(m.view(m.u32(m.reg('ESP')+4),1)[0]);return 0;},1);m.replace(0x454d70,'history remove front fixture',()=>{queue.shift();return 0;});
    const observed=[0x4c0,0x4c4,0x4c8,0x4cc,0x4d0,0x4d4,0x4dc,0x4e0,0x4e8,0x4ec,0x4f0,0x4f4,0x4f8,0x4fc,0x500,0x504,0x508,0x50c];
    try{for(let tick=0;tick<8000;tick++){
        const facing=tick%211<105?1:-1,action=tick%139<69?0:300;raw=[tick%41<20?-(tick%20+1):tick%17,tick%31<16?tick%16:-(tick%16),tick%13,tick%17===0?1:0,tick%11,tick%7];
        new Int32Array(c.memory.buffer,counts,6).set(raw);m.view(actor+0x66,1)[0]=facing&255;const b=m.view(actor+0x60,2);new DataView(b.buffer,b.byteOffset,2).setInt16(0,action,true);
        m.call(0x452f10,{ecx:actor});c.controls_player(counts,facing,action);const actual=Array.from(new Int32Array(c.memory.buffer,c.controls_values(),19));assert.deepEqual(actual.slice(0,18),observed.map(at=>m.i32(actor+at)),`controls tick ${tick}`);assert.equal(actual[18],m.view(actor+0x510,1)[0]);assert.deepEqual(Array.from(memory(c,c.controls_history(),90)),queue);checks++;
    }assert.equal(choiceCalls,8000);report('player-controls-original',{passed:true,checks,choiceCallbacks:choiceCalls});}finally{m.close();}
});
