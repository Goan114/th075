import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{resolve}from'node:path';import{core,memory,report}from'./helpers.mjs';import{originalMatch,replayDir}from'./recorded-match.mjs';
test('held direction and attack buttons during a complete knockout recover at the same frame as the original',async()=>{
 const template=readFileSync(resolve(replayDir,readdirSync(replayDir).find(n=>n.endsWith('.rep')))),results=[];
 for(const story of [0,1])for(const character of process.env.TH075_KO_CHAR?[Number(process.env.TH075_KO_CHAR)]:Array.from({length:11},(_,i)=>i)){
  const bytes=Buffer.from(template);bytes[10]=character;bytes[60+bytes.readUInt32LE(20)]=(character+1)%11;
  const c=await core(),o=await originalMatch(c,bytes),m=o.m,a=o.actors[0];let frames=0;
  try{c.match_knockdown(0,story);if(story)m.view(0x6714b4,1)[0]=3;m.view(a+0x324,2).fill(0);m.view(a+0x39d,1)[0]=2;m.call(0x40fac0,{ecx:a,args:[97]});m.f32(a+0x48,40);m.f32(a+0x50,0);m.f32(a+0x54,-2);m.view(o.scene+24,1)[0]=1;m.i32(o.scene+12,0);
   let firstMovement=-1,active=-1,previousX=m.f32(a+0x44);const phases=[];
   for(;frames<650;frames++){
    c.match_next_input(242,0);const q=0x6718a4,head=m.u32(q+12),map=m.u32(q+4),size=m.u32(q+8);for(let side=0;side<2;side++)m.view(m.u32(map+(((head+side)>>4)%size)*4)+((head+side)%16),1)[0]=side?0:242;
    assert.equal(c.match_tick(),o.step(),'scene result '+character+'/'+frames);
    const state=Array.from(new Uint32Array(c.memory.buffer,c.match_state(),12));assert.equal(state[2],m.view(o.scene+24,1)[0],'phase '+character+'/'+frames);assert.equal(state[3],m.i32(o.scene+12),'countdown '+character+'/'+frames);
    for(let side=0;side<2;side++){const cpp=Buffer.from(memory(c,c.match_actor(side),0x1000)),native=Buffer.from(m.bytes(o.actors[side],0x1000));for(const [at,n]of [[0x44,0x25],[0x7c,44],[0x324,6],[0x366,1],[0x368,8],[0x39c,2],[0x3a0,64],[0x4c0,0x58],[0xef8,4]])assert.deepEqual(cpp.subarray(at,at+n),native.subarray(at,at+n),'character '+character+' frame '+frames+' side '+side+' offset '+at.toString(16));}
    if(!phases.length||phases.at(-1).phase!==state[2])phases.push({frame:frames,phase:state[2],countdown:state[3]});
    const x=m.f32(a+0x44);if(firstMovement<0&&Math.abs(x-previousX)>0.01)firstMovement=frames;previousX=x;
    if(state[2]===1){active=frames;break;}
   }
   assert.ok(active>0);results.push({story,character,frames:frames+1,firstMovement,active,phases});console.log(JSON.stringify(results.at(-1)));
  }finally{m.close();}
 }
 report('knockdown-flow-original',{passed:true,scope:'actual native battle loop with a final airborne hit fixture; same continuously held direction/A/B/C/D, positions, actions, damage flags, inputs and round phase at every frame',results});
});
