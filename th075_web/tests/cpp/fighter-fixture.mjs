import assert from 'node:assert/strict';import {memory} from './helpers.mjs';
export function installFighterAnimationStorage(c,m,frames){
 const sequences=new Map(),frameLists=new Map(),cell=m.allocate(4);
 for(let action=0;action<c.pattern_count();action++)if(c.pattern_present(action)){
  const pointer=m.allocate(20),list=frames.filter(f=>f.action===action);m.view(pointer,20).fill(0);m.write(pointer+16,memory(c,c.pattern_header(action),4));sequences.set(action,pointer);frameLists.set(pointer,list);
 }
 const short=p=>Buffer.from(m.bytes(p,2)).readInt16LE();
 m.replace(0x4420b0,'validated native pattern storage',()=>{const action=short(m.reg('ESP')+4);assert.ok(sequences.has(action),'missing native animation action '+action);m.u32(cell,sequences.get(action));return cell;},1);
 m.replace(0x442060,'validated native frame storage',()=>{const list=frameLists.get(m.reg('ECX')),index=short(m.reg('ESP')+4);assert.ok(list&&list[index],'missing native animation frame '+index);return list[index].pointer;},1);
 m.replace(0x442120,'validated native frame count storage',()=>frameLists.get(m.reg('ECX')).length);
 return {sequences,frameLists,bind:(actor,frame)=>{m.u32(actor+8,frame.pointer);m.u32(actor+0x74,frame.pointer);m.u32(actor+0x78,sequences.get(frame.action));m.view(actor+0x70,2).set(Buffer.from([c.pattern_frames(frame.action)&255,c.pattern_frames(frame.action)>>>8]));m.view(actor+0x72,2).set(frame.bytes.subarray(4,6));}};
}
export function observeFighterActionEvents(m,events,drawFlags=false){
 const short=p=>Buffer.from(m.bytes(p,2)).readInt16LE(),signedByte=p=>{const n=m.view(p,1)[0];return n>=128?n-256:n;};
 m.replace(0x4079c0,'sound playback boundary',()=>{events().push(1,m.i32(m.reg('ESP')+4));return 0;},1);
 const spawn=(space,argc)=>()=>{const sp=m.reg('ESP');events().push(2,space,short(sp+4),m.i32(sp+8),m.i32(sp+12),signedByte(sp+16),m.view(sp+20,1)[0]);const parameters=m.u32(sp+32);for(let i=0;i<4;i++)events().push(m.i32(parameters+i*4));events().push(space===0?m.view(sp+40,1)[0]:0);
  const visual=space===0?m.u32(sp+36):0;if(visual){events().push(4,...m.bytes(visual,5));for(let i=0;i<3;i++)events().push(short(visual+6+i*2));for(let i=0;i<6;i++)events().push(m.i32(visual+12+i*4));}if(drawFlags&&space===0){const alternate=m.view(sp+24,1)[0],shadow=m.view(sp+28,1)[0];if(alternate||shadow)events().push(5,alternate,shadow);}return 0;};
 m.replace(0x45bb10,'owned effect creation boundary',spawn(0,10),10);m.replace(0x5f7aa0,'shared effect creation boundary',spawn(1,8),8);
 m.replace(0x412cb0,'camera shake observation',()=>{events().push(3,m.i32(m.reg('ESP')+4));return 0;},1);
}
