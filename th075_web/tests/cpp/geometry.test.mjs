import test from 'node:test';import assert from 'node:assert/strict';
import {core,oracle,memory,report} from './helpers.mjs';
test('Motion, facing, bounds transformation, overlap and intersection equal original instructions',async()=>{
    const c=await core(),m=await oracle(),actors=[m.allocate(0x800),m.allocate(0x800)],cpValues=c.core_alloc(32),cpRects=c.core_alloc(48),rects=m.allocate(48),out=m.allocate(16),bounds=m.allocate(0x80);
    let seed=0x891ce873,checks=0;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
    const set=(side,v,facing,freeze,hitFreeze)=>{memory(c,cpValues,32).set(new Uint8Array(v.buffer));c.motion_load(side,cpValues,facing,freeze,hitFreeze);const p=actors[side];m.view(p,0x800).fill(0);for(let j=0;j<6;j++)m.f32(p+[0x44,0x48,0x50,0x54,0x58,0x5c][j],v[j]);m.f32(p+0x488,v[6]);m.f32(p+0x490,v[7]);m.view(p+0x66,1)[0]=facing&255;new DataView(m.view(p+0x82,2).buffer,m.view(p+0x82,2).byteOffset,2).setInt16(0,freeze,true);new DataView(m.view(p+0x3b8,2).buffer,m.view(p+0x3b8,2).byteOffset,2).setInt16(0,hitFreeze,true);m.u32(p+0x2e8,actors[side^1]);};
    try{for(let sample=0;sample<6000;sample++){
        for(let side=0;side<2;side++){const v=new Float32Array([((random()%15000)-1000)/10,((random()%10000)-500)/10,((random()%10000)-5000)/1024,((random()%10000)-5000)/1024,0,0,((random()%10000)-5000)/4096,((random()%10000)-5000)/4096]);if(sample<12)v[0]=[0,39.99,40,40.01,399.99,400,879.99,880,1239.99,1240,1240.01,1300][sample];set(side,v,(random()&1)?1:-1,sample%11===0?1:0,sample%13===0?7:0);}
        for(let side=0;side<2;side++){const native=m.call(0x454ee0,{ecx:actors[side]})&255;assert.equal(c.motion_limit(side),native>=128?native-256:native);m.call(0x452230,{ecx:actors[side]});c.motion_advance(side);assert.deepEqual(Buffer.from(memory(c,c.motion_values(side),24)),Buffer.concat([Buffer.from(m.bytes(actors[side]+0x44,8)),Buffer.from(m.bytes(actors[side]+0x50,16))]),`motion ${sample}/${side}`);const changed=m.call(0x4550b0,{ecx:actors[side]})&255;assert.equal(c.motion_update_facing(side),changed?1:0);assert.equal(c.motion_facing(side),m.view(actors[side]+0x66,1)[0]===255?-1:1);checks+=3;}
        const r=new Int32Array(Array.from({length:12},()=>((random()%1200)-600)));memory(c,cpRects,48).set(new Uint8Array(r.buffer));m.write(rects,new Uint8Array(r.buffer));
        for(let side=0;side<2;side++){m.call(0x4491e0,{args:[out,rects,actors[side]]});assert.deepEqual(Buffer.from(memory(c,c.bounds_transform(cpRects,side),16)),Buffer.from(m.bytes(out,16)),`bounds ${sample}`);checks++;}
        const overlap=m.call(0x4492c0,{args:[rects,rects+16]});assert.equal(c.bounds_overlap(cpRects,cpRects+16),overlap?1:0);m.write(bounds+0x34,m.bytes(rects+32,16));m.call(0x442400,{ecx:bounds,args:[rects,rects+16]});assert.deepEqual(Buffer.from(memory(c,c.bounds_include(cpRects+32,cpRects,cpRects+16),16)),Buffer.from(m.bytes(bounds+0x34,16)));checks+=2;
    }report('geometry-original',{passed:true,checks,samples:6000});}finally{m.close();}
});
test('Replay random state and integer ranges match the original VC7.1 generator',async()=>{
    const c=await core(),m=await oracle(),thread=m.allocate(0x100);m.replace(0x646196,'per-thread random state fixture',()=>thread);m.view(0x66c238,1)[0]=0;let checks=0;
    try{for(const seed of [0,1,0xffffffff,0x80000000,0x12345678,0xc80e94c3]){
        c.random_seed(seed);m.call(0x64189e,{args:[seed]});for(let i=0;i<2000;i++){const expected=m.call(0x6418ab);assert.equal(c.random_next(),expected);assert.equal(c.random_state()>>>0,m.u32(thread+0x14));checks++;}
        for(let i=0;i<1500;i++){const low=(i*73)%3000-1500,high=low+(i*431)%1800;m.call(0x455580,{ecx:thread,args:[low,high]});const expected=m.reg('EAX')|0;assert.equal(c.random_range(low,high),expected);assert.equal(c.random_state()>>>0,m.u32(thread+0x14));checks++;}
    }report('random-original',{passed:true,checks,seeds:6});}finally{m.close();}
});


