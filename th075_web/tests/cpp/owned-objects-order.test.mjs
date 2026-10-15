import test from 'node:test';import assert from 'node:assert/strict';import {core,oracle,memory,report} from './helpers.mjs';import {loadCollisionPatterns} from './collision-fixture.mjs';
test('owned manager advances original layer snapshots, culls after each layer and preserves drawing order',async()=>{
 const c=await core(),m=await oracle();loadCollisionPatterns(c,m);const manager=m.allocate(84),table=m.allocate(20),maps=Array.from({length:4},()=>m.allocate(64)),blocks=Array.from({length:4},()=>Array.from({length:16},()=>m.allocate(16))),pool=Array.from({length:48},()=>m.allocate(0xe8)),rawPtr=c.core_alloc(48*12);let plans,objects,events,freed,seed=0x5518ef7a,checks=0;
 const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 const cells=layer=>manager+4+20*layer;
 const append=(layer,ptr)=>{const q=cells(layer),at=m.u32(q+12)+m.u32(q+16),b=(at>>>2)%m.u32(q+8);m.u32(m.u32(m.u32(q+4)+b*4)+(at%4)*4,ptr);m.u32(q+16,m.u32(q+16)+1);};
 const spawn=id=>{if(id<0||objects[id])return;const p=plans[id],ptr=pool[id];objects[id]=ptr;m.write(ptr,Buffer.alloc(0xe8));m.u32(ptr,table);m.u32(ptr+0x74,p.alive?1:0);m.write(ptr+0x67,Uint8Array.of(p.alternate,p.debug));m.u32(ptr+0xc8,id);append(p.layer,ptr);};
 const update=()=>{const id=m.u32(m.reg('ECX')+0xc8),p=plans[id];events.push(1,id);spawn(p.child);if(p.kill>=0&&objects[p.kill])m.u32(objects[p.kill]+0x74,0);if(p.revive>=0&&objects[p.revive])m.u32(objects[p.revive]+0x74,1);return 0;};
 for(const [off,address,kind]of [[4,0x46d2f0,1],[8,0x472450,2],[12,0x470e50,3],[16,0x472460,4]]){m.u32(table+off,address);m.replace(address,'test virtual object '+kind,kind===1?update:()=>{events.push(kind,m.u32(m.reg('ECX')+0xc8));return 0;});}
 m.replace(0x640f15,'object release observation',()=>{const ptr=m.u32(m.reg('ESP')+4);if(pool.includes(ptr))freed.push(m.u32(ptr+0xc8));return 0;});
 const actualEvents=()=>Array.from(new Int32Array(c.memory.buffer,c.owned_policy_events(),c.owned_policy_event_count()));
 const nativeIds=()=>{const ids=[];for(let layer=0;layer<4;layer++){const q=cells(layer),offset=m.u32(q+12),n=m.u32(q+16);for(let i=0;i<n;i++){const at=offset+i,ptr=m.u32(m.u32(m.u32(q+4)+((at>>>2)%m.u32(q+8))*4)+(at%4)*4);ids.push(layer,m.u32(ptr+0xc8),m.u32(ptr+0x74)!==0?1:0);}}return ids;};
 try{for(let sample=0;sample<1800;sample++){
  const initial=4+next()%12,count=initial*2,raw=Buffer.alloc(count*12);plans=[];objects=Array(count).fill(0);events=[];freed=[];
  for(let id=0;id<count;id++){const p={layer:next()%4,alternate:next()%4,debug:next()%3,alive:next()%5?1:0,child:id<initial?id+initial:-1,kill:-1,revive:-1};plans.push(p);}
  for(let id=0;id<count;id++){const p=plans[id];if(next()%4===0)p.child=-1;const eligible=Array.from({length:count},(_,i)=>i).filter(i=>plans[i].layer>=p.layer);if(next()%3===0)p.kill=eligible[next()%eligible.length];if(next()%4===0)p.revive=eligible[next()%eligible.length];raw[id*12]=p.layer;raw[id*12+1]=p.alternate;raw[id*12+2]=p.debug;raw[id*12+3]=p.alive;raw.writeInt16LE(p.child,id*12+4);raw.writeInt16LE(p.kill,id*12+6);raw.writeInt16LE(p.revive,id*12+8);}
  m.write(manager,Buffer.alloc(84));for(let layer=0;layer<4;layer++){const q=cells(layer);m.u32(q+4,maps[layer]);m.u32(q+8,16);for(let i=0;i<16;i++)m.u32(maps[layer]+i*4,blocks[layer][i]);}for(let id=0;id<initial;id++)spawn(id);memory(c,rawPtr,raw.length).set(raw);c.owned_policy_load(rawPtr,count,initial);
  m.call(0x45bdb0,{ecx:manager});c.owned_policy_advance();assert.deepEqual(actualEvents(),events,'update order '+sample);const ids=nativeIds(),cpp=Array.from(new Int32Array(c.memory.buffer,c.owned_policy_ids(),ids.length));assert.deepEqual(cpp,ids,'survivors '+sample);checks+=2;
  for(let layer=0;layer<4;layer++){m.call(0x45bc30,{ecx:manager,args:[layer]});c.owned_policy_draw(layer);}m.call(0x45bce0,{ecx:manager});c.owned_policy_shadows();assert.deepEqual(actualEvents(),events,'draw order '+sample);checks++;
  const aliveIds=ids.filter((_,i)=>i%3===1).sort((a,b)=>a-b);freed=[];m.call(0x45ba30,{ecx:manager});c.owned_objects_clear();assert.deepEqual(freed.sort((a,b)=>a-b),aliveIds,'clear lifetime '+sample);for(let layer=0;layer<4;layer++){assert.equal(m.u32(cells(layer)+16),0);assert.equal(c.owned_objects_size(layer),0);}checks+=9;
 }report('owned-objects-order-original',{passed:true,samples:1800,checks,scope:'actual original manager, native deque iteration/erase, all four layers; initial per-layer update snapshot, same/later-layer child timing, kill/revive before cleanup, normal/screen/shadow ordered draw and complete destruction'});
 }finally{m.close();}
});
