import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {originalGraphics,originalRectangles,bits} from './background-fixture.mjs';
test('HUD digit styles, combo display and round banners match original',async()=>{
 const c=await core(),m=await oracle(),combo=m.allocate(20),scene=m.allocate(0x130),ported=c.core_alloc(20),{draws}=originalGraphics(m);let seed=0x07544333,checks=0;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};originalRectangles(m);c.background_reset(0);m.call(0x446590,{ecx:m.allocate(16),args:[0x1800010,0x1800080,0x1800090]});
 const compare=label=>{assert.equal(c.background_draw_count(),draws.length,label+' draws');for(let i=0;i<draws.length;i++){const d=Array.from(new Uint32Array(c.memory.buffer,c.background_draw_meta(i),3));assert.equal(d[0],draws[i].texture,label+' texture');assert.deepEqual(Buffer.from(memory(c,c.background_draw_vertices(i),d[2]*28)),draws[i].vertices,label+' vertices '+i);checks++;}};
 try{for(let sample=0;sample<3000;sample++){
   const x=Math.fround((next()%30001-15000)/16),y=Math.fround((next()%20001-10000)/16),color=next(),value=sample%11===0?-1:next()%2000000000,style=sample%14,count=sample%12===0?10:sample%6;
   draws.length=0;m.call(0x446b90,{args:[bits(x),bits(y),color,value,style,count]});c.hud_number(x,y,color,value,style,count);compare('number '+sample);
 }
 for(let sample=0;sample<3000;sample++){
   const input=Buffer.alloc(20);input.writeInt16LE(next()%120,4);input.writeInt16LE(next()%30000,6);input.writeInt16LE(next()%100,8);input[10]=[0,255,5,30,105][sample%5];input[11]=sample%2?1:255;input.writeInt16LE(next()%120-60,12);input.writeInt16LE(next()%100,14);input.writeFloatLE(Math.fround((next()%5000-2500)/8),16);memory(c,ported,20).set(input);c.hud_combo_load(ported);m.write(combo,input);m.u32(combo,0x1800000);
   const hits=next()%100,damage=next()%30000,rate=next()%100;m.call(0x43d4d0,{ecx:combo,args:[hits,damage,rate]});c.hud_combo_update(hits,damage,rate);assert.deepEqual(Buffer.from(memory(c,c.hud_combo_state(),20)).subarray(4),Buffer.from(m.bytes(combo,20)).subarray(4),'combo update '+sample);checks++;
   draws.length=0;m.call(0x43d570,{ecx:combo});c.hud_combo_draw();compare('combo '+sample);assert.deepEqual(Buffer.from(memory(c,c.hud_combo_state(),20)).subarray(4),Buffer.from(m.bytes(combo,20)).subarray(4),'combo draw state '+sample);checks++;
 }
 for(let sample=0;sample<200;sample++){const round=1+sample%12,timer=sample%100;m.i32(scene+0x68,round);m.i32(scene+0x6c,timer);draws.length=0;m.call(0x441ea0,{ecx:scene});c.hud_banner_draw(round,timer);compare('banner '+sample);}
 report('hud-digits-combo-original',{passed:true,checks,digitSamples:3000,comboSamples:3000,bannerSamples:200,scope:'all original HUD digit styles, variable/fixed digits, combo event/render state and round banner vertices'});
 }finally{m.close();}
});
