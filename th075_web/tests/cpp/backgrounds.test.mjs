import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {core,oracle,memory,report,root} from './helpers.mjs';import {originalGraphics} from './background-fixture.mjs';import {archiveIndex,archiveRead} from '../../scripts/native/archive.mjs';
const backgrounds=JSON.parse(readFileSync(resolve(root,'reference/background-analysis.json')));
test('all stage background controllers and layered geometry match original',async()=>{
 const c=await core(),m=await oracle(),object=m.allocate(0x1200);let images=[];const {draws,state,sampler}=originalGraphics(m,{imageSize:i=>images[i]??{width:256,height:256}});let seed=0x075bee55,checks=0,vertices=0;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};const blend=v=>v-1,compare=v=>v-1;
 const setRect=[...m.importMap.values()].find(e=>e.name==='SetRect');setRect.argc=5;setRect.handler=()=>{const sp=m.reg('ESP'),p=m.u32(sp+4);for(let i=0;i<4;i++)m.u32(p+i*4,m.u32(sp+8+i*4));return 1;};
 m.call(0x41cae0);m.replace(0x449de0,'common background allocation boundary',()=>m.reg('ECX'));m.replace(0x40b1d0,'background image count boundary',()=>0,1);m.replace(0x40bb80,'background texture pack boundary',()=>1,2);
 try{for(let kind=0;kind<backgrounds.length;kind++){
   const bg=backgrounds[kind];state.clear();for(const pair of [[19,5],[20,6],[27,1],[15,1],[7,0],[14,1],[23,4]])state.set(...pair);sampler.set(16,1);sampler.set(17,1);c.background_reset(kind);m.view(object,0x1200).fill(0);m.call(parseInt(bg.constructor,16),{ecx:object});const policy=new Float32Array(c.memory.buffer,c.background_shadow(),9);for(let i=0;i<3;i++)assert.equal(policy[i+6],m.f32(object+12+i*4),'shadow origin '+bg.kind);
   const path='data/background/'+bg.kind+'.dat';let data;for(const fileName of ['th075.dat','th075b.dat','th075c.dat']){const file=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)',fileName),entry=archiveIndex(file).entries.find(e=>e.name===path);if(entry)data=archiveRead(file,entry);}assert.ok(data,path);const resource=c.core_alloc(data.length);memory(c,resource,data.length).set(data);assert.equal(c.texture_load(resource,data.length,1),1);images=Array.from({length:c.texture_count()},(_,i)=>{const v=Array.from(new Uint32Array(c.memory.buffer,c.texture_meta(i),5));c.background_image(i,v[0],v[1]);return {width:v[0],height:v[1]};});c.core_free(resource);
   const first=Array.from(new Int32Array(c.memory.buffer,c.background_values(),3));for(let i=0;i<3;i++)assert.equal(first[i],m.i32(object+0x68+i*4),`initial ${bg.kind} ${i}`);
   for(let sample=0;sample<48;sample++){
    const timer=[0,1,359,360,2500,3840,15359,15360][sample%8]+(sample>7?next()%20000:0),frame=next()%42,secondary=next()%32000;c.background_set(timer,frame,secondary);[timer,frame,secondary].forEach((v,i)=>m.i32(object+0x68+i*4,v));
    m.call(parseInt(bg.methods[1],16),{ecx:object});c.background_advance();assert.deepEqual(Array.from(new Int32Array(c.memory.buffer,c.background_values(),3)),Array.from({length:3},(_,i)=>m.i32(object+0x68+i*4)),`advance ${bg.kind} ${sample}`);checks++;
    const x=Math.fround((next()%6000-3000)/16),y=Math.fround((next()%5000-2500)/16);m.f32(0x671404,x);m.f32(0x6713c4,y);
    for(const [layer,n]of [[0,4],[1,3],[2,2]]){
      draws.length=0;m.call(parseInt(bg.methods[n],16),{ecx:object,limit:1_000_000});c.background_draw(layer,x,y);assert.equal(c.background_draw_count(),draws.length,`draw count ${bg.kind} ${layer} ${sample}`);
      for(let i=0;i<draws.length;i++){
        const meta=Array.from(new Uint32Array(c.memory.buffer,c.background_draw_meta(i),3)),expected=draws[i];assert.equal(meta[0],expected.texture,`texture ${bg.kind} ${layer} ${sample} ${i}`);assert.equal(meta[1]+1,expected.primitive,`primitive ${bg.kind} ${layer}`);
        assert.deepEqual(Buffer.from(memory(c,c.background_draw_vertices(i),meta[2]*28)),expected.vertices,`vertices ${bg.kind} ${layer} ${sample} ${i} timer ${timer} x ${x} y ${y}`);
        const p=expected.state,q=expected.sampler;assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,c.background_draw_state(i),8)),[blend(p[19]),blend(p[20]),p[7],p[14],compare(p[23]),q[17]-1,q[16]-1,p[15]],`states ${bg.kind} ${layer} ${sample} ${i}`);vertices+=meta[2];checks++;
      }
    }
   }
 }report('backgrounds-original',{passed:true,backgrounds:36,samples:48,checks,vertices,scope:'all background timers, shadow origins, back/middle/front layers and submitted vertices/state using actual shipped background image dimensions'});}finally{m.close();}
});
