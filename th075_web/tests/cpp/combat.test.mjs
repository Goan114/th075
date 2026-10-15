import test from 'node:test';import assert from 'node:assert/strict';
import {core,oracle,memory,report} from './helpers.mjs';
test('Battle counters, story spell drain, health, spirit break and recovery match original updates',async()=>{
    const c=await core(),m=await oracle(),actors=[m.allocate(0x1000),m.allocate(0x1000)],frame=m.allocate(0x80),cp=c.core_alloc(0x1000);let rng=0x6928c641,checks=0,sounds=0;
    const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return rng>>>0;};
    m.replace(0x453d60,'original sound boundary',()=>{assert.equal(m.u32(m.reg('ESP')+4),47);sounds++;return 0;},1);
    const observed=[[0x82,8],[0x3cc,2],[0x490,4],[0x324,4],[0x368,8],[0x39c,1],[0x3a0,2],[0x3a4,8],[0x3b0,8],[0x3bc,2],[0x47c,4],[0x484,1],[0x538,1],[0x2d8,16],[0xef8,2]];
    try{for(let sample=0;sample<1600;sample++){
        const mode=sample%5,view=new Float32Array([((random()%20000)-10000)/16,(random()%10000)/8,(random()%10000)/16]);
        m.view(0x6714b4,1)[0]=mode;m.f32(0x671404,view[0]);m.f32(0x6713c4,view[1]);m.f32(0x6713dc,view[2]);
        const flags=(sample&1)?0x1000:0;m.u32(frame+0x3c,flags);
        for(let side=0;side<2;side++){
            const b=Buffer.alloc(0x1000),s16=(at,v)=>b.writeInt16LE(v,at),s32=(at,v)=>b.writeInt32LE(v,at),f32=(at,v)=>b.writeFloatLE(v,at);
            s16(0x60,[0,149,150,199,200,209,210,32767,-1][sample%9]);s16(0x82,random()%5-1);s16(0x3cc,random()%35-1);
            for(const at of [0x84,0x86,0x88,0x3bc])s16(at,random()%20-1);s16(0x3ba,sample%7===0?3:0);f32(0x490,random()%3);
            b[0x2cd]=sample&1;s16(0x324,random()%12000-200);s16(0x326,sample%71===0?-1:10000);
            f32(0x368,(random()%13000-500)/10);f32(0x36c,(random()%12000-1000)/10);b[0x39c]=(random()%7)===0?1:0;b[0x39d]=random()%12;
            s16(0x3a0,[0,1,2,3,4,5,29,150,300,-1][sample%10]);s32(0x3a4,random()%2000-1);s32(0x3a8,random()%25-1);for(let i=0;i<12;i++)s32(0x430+i*4,random()%100);
            s16(0x3b0,random()%1250-1);s16(0x3b2,sample%2?b.readInt16LE(0x3b0):random()%1250);s16(0x3b4,[-1,0,1,2,60][sample%5]);s16(0x3b6,[-1,0,1,2,3,4,20][sample%7]);
            s32(0x47c,random()%20-1);b[0x484]=random()%256;b[0x538]=random()%256;s16(0xef8,sample%11===0?32767:random()%32768);
            b.writeUInt32LE(flags,0x74);memory(c,cp,b.length).set(b);c.combat_load(side,cp);b.writeUInt32LE(frame,0x74);b.writeUInt32LE(actors[side^1],0x2e8);m.write(actors[side],b);
        }
        for(let tick=0;tick<18;tick++)for(let side=0;side<2;side++){
            const prior=sounds;m.call(0x452490,{ecx:actors[side]});assert.equal(c.combat_advance(side,mode===3?1:0,...view),sounds-prior,`sound sample ${sample} tick ${tick}`);
            for(let who=0;who<2;who++){const bytes=memory(c,c.combat_snapshot(who),0x1000);for(const [at,n] of observed)assert.deepEqual(Buffer.from(bytes.subarray(at,at+n)),Buffer.from(m.bytes(actors[who]+at,n)),`sample ${sample} tick ${tick} side ${side}/${who} field ${at.toString(16)}`);}checks++;
        }
    }report('combat-original',{passed:true,samples:1600,updates:checks,sounds});}finally{m.close();}
});
