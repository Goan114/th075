import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';import {memory,root} from './helpers.mjs';
export function installSharedEffectStorage(c,m){
 const asset=readFileSync(resolve(root,'reference/assets/th075.dat/data/system/effect/effect.pat')),p=c.core_alloc(asset.length),cell=m.allocate(4),lists=new Map(),sequences=new Map();memory(c,p,asset.length).set(asset);assert.equal(c.effect_pattern_load(p,asset.length),1);c.core_free(p);
 const short=p=>Buffer.from(m.bytes(p,2)).readInt16LE();
 for(let action=0;action<c.effect_pattern_count();action++)if(c.effect_pattern_present(action)){const sequence=m.allocate(20),frames=[];for(let index=0;index<c.effect_pattern_frames(action);index++){const bytes=Buffer.from(memory(c,c.effect_pattern_frame(action,index),52)),ptr=m.allocate(16);m.write(ptr,bytes.subarray(0,16));if(c.effect_pattern_visual(action,index)){const v=m.allocate(36);m.write(v,bytes.subarray(16));m.u32(ptr+8,v);}frames.push({ptr,bytes});}sequences.set(action,sequence);lists.set(sequence,frames);}
 const neutral=Buffer.alloc(0x94);neutral.fill(255,0x11,0x15);for(let i=0;i<3;i++)neutral.writeFloatLE(1,0x1c+i*4);
 for(const address of [0x64159d,0x6416a2])m.replace(address,'explicit neutral native allocation',()=>{const n=m.u32(m.reg('ESP')+4),p=m.allocate(n);if(n===0x94)m.write(p,neutral);return p;});m.replace(0x640f15,'effect deallocation boundary',()=>0);
 m.replace(0x5f8380,'validated manager pattern lookup',()=>{const id=m.i32(m.reg('ESP')+4);m.u32(cell,sequences.get(id)??0);return cell;},1);m.replace(0x5fad20,'validated effect sequence storage',()=>{const action=short(m.reg('ESP')+4);assert.ok(sequences.has(action),'effect sequence '+action);m.u32(cell,sequences.get(action));return cell;},1);m.replace(0x5facd0,'validated effect frame storage',()=>{const index=short(m.reg('ESP')+4),list=lists.get(m.reg('ECX'));assert.ok(list&&list[index]);return list[index].ptr;},1);m.replace(0x5f9e90,'validated effect frame count',()=>lists.get(m.reg('ECX')).length);
 return {lists,sequences};
}
export function nativePointerQueue(m,address,mapSize=32){
 const map=m.allocate(mapSize*4);
 return {reset(){m.view(address,20).fill(0);m.view(map,mapSize*4).fill(0);m.u32(address+4,map);m.u32(address+8,mapSize);},pointers(){const offset=m.u32(address+12),n=m.u32(address+16),out=[];for(let i=0;i<n;i++){const at=offset+i;out.push(m.u32(m.u32(m.u32(address+4)+((at>>>2)%m.u32(address+8))*4)+(at%4)*4));}return out;}};
}
