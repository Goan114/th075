import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
test('Original normal/story damage scaling and scripted hit health and combo updates',async()=>{
    const c=await core(),m=await oracle(),owner=m.allocate(0x1000),defender=m.allocate(0x1000),source=m.allocate(0x1000),frame=m.allocate(0x80),cp=c.core_alloc(0x1000),scales=c.core_alloc(16),life=c.core_alloc(24);let rng=0x318aecd4,checks=0;
    const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;},s16=(p,at,value)=>{const b=m.view(p+at,2);new DataView(b.buffer,b.byteOffset,2).setInt16(0,value,true);};
    try{for(let sample=0;sample<15000;sample++){
        const scale=new Float32Array(Array.from({length:4},()=>((random()%4000)+1)/1600)),max=new Int16Array(Array.from({length:12},()=>random()%15000+1)),pressure=random()%20000,phase=random()%12,mode=sample%5,ai=sample&1,base=random()%4000-100;
        memory(c,scales,16).set(new Uint8Array(scale.buffer));memory(c,life,24).set(new Uint8Array(max.buffer));m.view(owner,0x1000).fill(0);m.view(defender,0x1000).fill(0);m.view(source,0x1000).fill(0);m.view(frame,0x80).fill(0);
        const hits=sample%59,damage=sample%25000;c.damage_load(scales,pressure,ai,phase,life,hits,damage);m.f32(source+0x9c,scale[0]);m.f32(source+0xa4,scale[1]);m.f32(owner+0xa0,scale[2]);m.f32(owner+0x3c0,scale[3]);m.u32(owner+0x2e8,defender);m.u32(source+0xac,frame);s16(frame,0x10,base);s16(defender,0x328,pressure);m.view(defender+0x2cd,1)[0]=ai;m.view(defender+0x39d,1)[0]=phase;m.write(defender+0x33e,new Uint8Array(max.buffer));m.view(0x6714b4,1)[0]=mode;
        const native=m.call(0x455640,{ecx:owner,args:[source]})&65535;assert.equal(c.damage_resolve(base,mode===3?1:0)&65535,native,`damage sample ${sample}`);checks++;
        m.f32(owner+0x9c,scale[0]);m.f32(owner+0xa4,scale[1]);s16(owner,0x3c4,hits);s16(owner,0x3c6,damage);
        const health=random()%30000-1,maximum=random()%30000+1,spirit=random()%1250-1,action=[0,49,50,142,143,209,300][sample%7],timer=sample%7-1,ended=sample%3===0?1:0,proration=random()%121,newHits=random()%4;
        s16(defender,0x324,health);s16(defender,0x326,maximum);s16(defender,0x3b0,spirit);s16(defender,0x60,action);s16(defender,0x3a0,timer);m.view(defender+0x39c,1)[0]=ended;
        memory(c,cp,0x1000).set(m.bytes(defender,0x1000));c.combat_load(1,cp);m.call(0x452c10,{ecx:owner,args:[base,proration,newHits]});c.damage_scripted(base,proration,newHits,1,mode===3?1:0);
        assert.deepEqual(Buffer.from(memory(c,c.damage_values(),8)),Buffer.concat([Buffer.from(m.bytes(owner+0x3c4,4)),Buffer.from(m.bytes(owner+0x3c0,4))]),`combo sample ${sample}`);assert.deepEqual(Buffer.from(memory(c,c.combat_snapshot(1)+0x324,4)),Buffer.from(m.bytes(defender+0x324,4)),`health sample ${sample} base=${base} scale=${Array.from(scale)} health=${health} max=${maximum} spirit=${spirit} action=${action} timer=${timer} ended=${ended} damage=${native}`);checks++;
    }report('damage-original',{passed:true,samples:15000,checks});}finally{m.close();}
});

