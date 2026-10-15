import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';import {memory,root} from './helpers.mjs';
export function loadCollisionPatterns(c,m,character="reimu",additional=[]){
 const asset=readFileSync(resolve(root,'reference/assets/th075b.dat/data/character/'+character+'/'+character+'.pat')),p=c.core_alloc(asset.length);memory(c,p,asset.length).set(asset);assert.equal(c.pattern_load(p,asset.length),1);c.core_free(p);for(const {character:other,action}of additional){const a=readFileSync(resolve(root,'reference/assets/th075b.dat/data/character/'+other+'/'+other+'.pat')),q=c.core_alloc(a.length);memory(c,q,a.length).set(a);assert.equal(c.pattern_import_action(q,a.length,action),1);c.core_free(q);}const frames=[],vectors=new Map();
 for(let action=0;action<c.pattern_count();action++)if(c.pattern_present(action))for(let index=0;index<c.pattern_frames(action);index++){
  const bytes=Buffer.from(memory(c,c.pattern_frame(action,index),120)),pointer=m.allocate(120),body=[],attack=[];m.write(pointer,bytes);
  for(let kind=0;kind<2;kind++){const count=c.pattern_rectangles(action,index,kind),data=Buffer.from(memory(c,c.pattern_rectangle_data(action,index,kind),count*16)),rects=kind?attack:body;for(let i=0;i<count;i++){const rect=m.allocate(16);m.write(rect,data.subarray(i*16,i*16+16));rects.push(rect);}vectors.set(pointer+(kind?0x64:0x54),rects);}
  frames.push({action,index,bytes,pointer,body,attack});
 }
 m.replace(0x4452d0,'validated rectangle vector size boundary',()=>{const v=vectors.get(m.reg('ECX'));assert.ok(v);return v.length;});
 m.replace(0x445310,'validated rectangle vector element boundary',()=>{const v=vectors.get(m.reg('ECX')),i=m.u32(m.reg('ESP')+4);assert.ok(v&&i<v.length);return v[i];},1);
 frames.writeCopy=(pointer,frame,prefix=frame.bytes)=>{m.write(pointer,prefix);vectors.set(pointer+0x54,frame.body);vectors.set(pointer+0x64,frame.attack);};
 return frames;
}
export function observeCollisionSignals(m,events,records){
 const short=p=>{const b=Buffer.from(m.bytes(p,2));return b.readInt16LE();};
 m.replace(0x40fac0,'separately verified animation bind boundary',()=>{const p=m.reg('ECX'),a=m.u32(m.reg('ESP')+4)&65535;m.view(p+0x60,6).fill(0);new DataView(m.view(p+0x60,2).buffer,m.view(p+0x60,2).byteOffset,2).setUint16(0,a,true);return 0;},1);
 m.replace(0x4424e0,'contact effect observation',()=>{const sp=m.reg('ESP');events().push(2,short(sp+4),m.view(sp+8,1)[0]>=128?m.view(sp+8,1)[0]-256:m.view(sp+8,1)[0]);return 0;},2);
 m.replace(0x4079c0,'sound observation',()=>{events().push(1,m.i32(m.reg('ESP')+4));return 0;},1);
 m.replace(0x43d4d0,'combo HUD observation',()=>{const sp=m.reg('ESP');events().push(3,short(sp+4),short(sp+8),m.i32(sp+12));return 0;},3);
 m.replace(0x445290,'profile maximum damage read boundary',()=>records()[0]);m.replace(0x445250,'profile maximum hits read boundary',()=>records()[1]);
 m.replace(0x445210,'profile maximum damage write boundary',()=>{records()[0]=m.i32(m.reg('ESP')+4);return 0;},1);m.replace(0x4451d0,'profile maximum hits write boundary',()=>{records()[1]=m.i32(m.reg('ESP')+4);return 0;},1);
}
