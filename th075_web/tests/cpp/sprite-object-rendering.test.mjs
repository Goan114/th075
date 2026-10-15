import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';
const blend=n=>({1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:8,10:9,11:10})[n];
test('battle object pose, exact camera translation and projection equal native draws',async()=>{
 const c=await core(),m=await oracle(),actor=m.allocate(0x1000),frame=m.allocate(120),visual=m.allocate(36),bank=m.allocate(80),history=m.allocate(32),metadata=m.allocate(64),record=m.allocate(164),texture=m.allocate(4),textureTable=m.allocate(0x44),surface=m.allocate(4),surfaceTable=m.allocate(0x24),device=m.allocate(4),deviceTable=m.allocate(0x170),cf=c.core_alloc(120),ca=c.core_alloc(0x1000);
 let w=1,h=1,tw=1,th=1,draws=[],queue=[],seed=0xd03b5124,gray=false,checks=0,totalDraws=0;const states=new Map([[19,5],[20,6],[14,1]]);
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};const value=n=>Math.fround((next()%200001-100000)*n/100000);
 const method=(table,offset,name,argc,handler)=>m.u32(table+offset,m.registerImport({dll:'original sprite graphics boundary',name,argc,handler}));
 m.u32(device,deviceTable);m.u32(texture,textureTable);m.u32(surface,surfaceTable);m.u32(0x671230,device);m.view(0x6711f8,1)[0]=1;m.u32(0x66c1b8,1);
 method(textureTable,0x3c,'surface level',3,()=>{const sp=m.reg('ESP');m.u32(m.u32(sp+12),surface);return 0;});
 method(surfaceTable,0x20,'surface dimensions',2,()=>{const p=m.u32(m.reg('ESP')+8);m.view(p,32).fill(0);m.u32(p+24,tw);m.u32(p+28,th);return 0;});method(surfaceTable,8,'surface release',1,()=>0);
 method(deviceTable,0xf4,'bind texture',3,()=>0);method(deviceTable,0xc8,'render state',3,()=>{const sp=m.reg('ESP');states.set(m.u32(sp+8),m.u32(sp+12));return 0;});method(deviceTable,0x160,'monochrome shader',2,()=>{gray=m.u32(m.reg('ESP')+8)!==0;return 0;});
 method(deviceTable,0x120,'draw vertices',5,()=>{const sp=m.reg('ESP'),top=m.u32(sp+8),n=m.u32(sp+12)+2;assert.equal(m.u32(sp+20),28);draws.push({state:[77,top===5?4:5,blend(states.get(19)),blend(states.get(20)),states.get(14),+gray,n],vertices:Buffer.from(m.bytes(m.u32(sp+16),n*28))});return 0;});
 m.replace(0x40dd60,'original sprite metadata storage',()=>{m.u32(metadata+4,w);m.u32(metadata+8,h);return metadata;},1);m.replace(0x40c8c0,'original sprite texture storage',()=>texture,1);m.replace(0x40dd20,'original texture vector size',()=>1);
 m.replace(0x411d30,'original trail list append',()=>{queue.push(Buffer.from(m.bytes(m.u32(m.reg('ESP')+4),164)));return 0;},1);m.replace(0x411ce0,'original trail list size',()=>queue.length);m.replace(0x411d00,'original trail list pop',()=>{queue.shift();return 0;});
 m.replace(0x411c90,'original trail begin',()=>{const p=m.u32(m.reg('ESP')+4);m.u32(p,0);return p;},1);m.replace(0x411cc0,'original trail end',()=>{const p=m.u32(m.reg('ESP')+4);m.u32(p,queue.length);return p;},1);m.replace(0x411e50,'original trail iterator inequality',()=>m.u32(m.reg('ECX'))!==m.u32(m.u32(m.reg('ESP')+4))?1:0,1);
 m.replace(0x411e00,'original trail element storage',()=>{const i=m.u32(m.reg('ECX'));m.write(record,queue[i]);return record;});m.replace(0x411e20,'original trail iterator increment',()=>{const p=m.u32(m.reg('ESP')+4),iterator=m.reg('ECX'),i=m.u32(iterator);m.u32(p,i);m.u32(iterator,i+1);return p;},2);
 const compareDraws=label=>{assert.equal(c.sprite_draw_count(),draws.length,label+' count');for(let i=0;i<draws.length;i++){const p=c.sprite_draw_data(i);assert.deepEqual(Array.from(new Uint32Array(c.memory.buffer,p,7)),draws[i].state,label+' state '+i);assert.deepEqual(Buffer.from(memory(c,p+28,112)),draws[i].vertices,label+' vertices '+i);checks+=2;}totalDraws+=draws.length;};
 m.call(0x41cae0);m.view(history,32).fill(0);m.u32(history,bank);
 try{for(let sample=0;sample<5000;sample++){
   if(sample%20===0){queue=[];c.sprite_history_clear();}const maximum=1+next()%40,interval=[-1,0,1,2,3,4][sample%6],mask=next();m.view(history+0x10,1)[0]=interval&255;m.view(history+0x12,2).set(Buffer.from([maximum&255,maximum>>>8]));m.u32(history+0x14,mask);c.sprite_history_configure(interval,maximum,mask);
   w=1+next()%450;h=1+next()%450;tw=2**Math.ceil(Math.log2(w));th=2**Math.ceil(Math.log2(h));const scale=[0.5,1,2,0.75][sample%4],originX=value(200),originY=value(200),multiplier=[0.5,1,1.25][sample%3],cameraX=value(320),cameraY=value(300);
   c.sprite_configure(w,h,tw,th,scale,originX,originY,multiplier);m.f32(0x66c084,scale);m.f32(0x671220,originX);m.f32(0x671224,originY);m.f32(0x66c080,multiplier);m.f32(0x671404,cameraX);m.f32(0x6713c4,cameraY);
   const f=Buffer.alloc(120),p=Buffer.alloc(0x1000);f.writeInt16LE(next()%400-200,0);f.writeInt16LE(next()%400-200,2);f.writeUInt16LE(next()%1000,6);f[8]=sample%3===2?1:0;f[12]=sample%3===0?1:0;
   f[84]=next()%4;for(let i=85;i<89;i++)f[i]=next()&255;for(let i=0;i<3;i++){f.writeInt16LE(sample%5===0?0:i===2?3000:next()%640,90+i*2);f.writeFloatLE(value(2),96+i*4);f.writeFloatLE(sample%5===1?0:value(360),108+i*4);}
   p.writeFloatLE(value(600),0x44);p.writeFloatLE(value(600),0x48);p[0x66]=sample%2?1:255;p.writeInt16LE([0,49,50,149,150,201][sample%6],0x60);p.writeInt16LE(sample%4?next()%20:0,0x82);p[0x484]=[0,1,2,255][sample%4];p[0x40]=sample%2;p[0x10]=sample%4===1?128:0;for(let i=0;i<4;i++)p[0x11+i]=next()&255;
   for(let i=0;i<3;i++){p.writeInt16LE(sample%4===0?0:i===2?3000:next()%640,0x16+i*2);p.writeFloatLE(sample%8===1?1:value(3),0x1c+i*4);p.writeFloatLE(value(360),0x28+i*4);p.writeFloatLE(value(100),0x34+i*4);}p.writeInt32LE(sample%3-1,0x47c);
   const disabled=sample%7===0,trim=sample%5===0;memory(c,cf,120).set(f);memory(c,ca,0x1000).set(p);m.write(actor,p);m.u32(actor+4,bank);m.u32(actor+0x480,history);m.write(frame,f);if(f[8]){m.write(visual,f.subarray(84));m.u32(frame+8,visual);}m.u32(actor+8,frame);m.view(0x67161c,1)[0]=+disabled;m.view(0x66c237,1)[0]=+trim;
   draws=[];m.call(0x40fc70,{ecx:actor});c.sprite_object_draw(ca,cf,cameraX,cameraY);compareDraws('fighter '+sample);assert.equal(gray,false);
 }
 report('sprite-object-rendering-original',{passed:true,samples:5000,checks,draws:totalDraws,scope:'actual native object pose, scale, rotation, camera translation, world-relative perspective and grayscale; only texture storage and GPU device boundary observed',originalFunctions:['0x40fc70','0x40c7f0','0x4029f0','0x402d50']});
 }finally{m.close();}
});
