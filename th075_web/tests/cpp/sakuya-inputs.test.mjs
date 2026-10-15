import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
const patterns=['236236D','421C','421B','421A','214D','214C','236C','623B','623A','623B','623A','214B','214A','236D','236B','236A','2N2D','2N2C','2N2B','2N2A','NRNR','NLNL','N29','N39','N19','N27','N37','N17','N28','N38','N18'];
test('Sakuya motion recognition uses exact original priority and time windows',async()=>{
 const c=await core(),m=await oracle(),actor=m.allocate(0x1000),map=m.allocate(32),chunks=m.allocate(128),history=c.core_alloc(90),outcomes=new Set();let seed=0x47852333,checks=0;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};m.view(actor,0x1000).fill(0);for(let i=0;i<8;i++)m.u32(map+i*4,chunks+i*16);m.u32(actor+0x51c,map);m.u32(actor+0x520,8);m.u32(actor+0x524,0);m.u32(actor+0x528,90);
 const tokens={'1':9,'2':8,'3':10,'4':1,'5':0,'6':2,'7':5,'8':4,'9':6,N:0,A:16,B:32,C:64,D:128};
 try{for(let sample=0;sample<15000;sample++){
  const facing=sample%2?1:-1,raw=Buffer.alloc(90);if(sample%3===0)for(let i=0;i<90;i++)raw[i]=next()&255;else{
   const pattern=patterns[sample%patterns.length],gap=sample%8,start=90-pattern.length*(gap+1);for(let i=0;i<pattern.length;i++)raw[start+i*(gap+1)]=pattern[i]==='L'?(facing>0?1:2):pattern[i]==='R'?(facing>0?2:1):tokens[pattern[i]];
   if(sample%3===2)for(let i=75;i<90;i++)if(next()%5===0)raw[i]=next()&255;
  }
  m.write(chunks,raw);memory(c,history,90).set(raw);m.view(actor+0x66,1)[0]=facing&255;m.view(actor+0x511,1)[0]=255;m.call(0x4c6700,{ecx:actor});const expected=m.view(actor+0x511,1)[0];assert.equal(c.sakuya_input_command(history,facing),expected,'sample '+sample);outcomes.add(expected);checks++;
 }
 assert.equal(outcomes.size,23,'all original command IDs exercised');report('sakuya-inputs-original',{passed:true,checks,updates:15000,commands:[...outcomes].sort((a,b)=>a-b),scope:'real original input-history scanner and Sakuya motion priority; exact time-window boundaries, facing and overlapping motions'});
 }finally{m.close();}
});
