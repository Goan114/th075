import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';
import {core,oracle,memory,root,sha} from './helpers.mjs';
import {installSharedEffectStorage,nativePointerQueue} from './effect-fixture.mjs';import {installPhantomHistory} from './phantom-history-fixture.mjs';
const names=['reimu','marisa','sakuya','alice','patchouli','youmu','remilia','yuyuko','yukari','suika','meiling'];
const constructors=[0x46d080,0x492fb0,0x4c0820,0x4e2c90,0x5021c0,0x52cee0,0x551980,0x574100,0x597380,0x5c0ab0,0x5e2090];
export const replayDir=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)/replay');
export function decode(bytes){let at=60+bytes.readUInt32LE(20);const meta=bytes.subarray(at,at+14);at+=14;const queues=[];for(const w of [1,2,1,4]){const n=bytes.readUInt32LE(at);at+=4;queues.push(bytes.subarray(at,at+n*w));at+=n*w;}return {meta,queues,ids:[bytes[10],meta[0]]};}
export async function originalMatch(c,bytes){
 const m=await oracle(),{ids,queues}=decode(bytes),actors=[m.allocate(0x2000),m.allocate(0x2000)],managers=[m.allocate(84),m.allocate(84)],huds=[m.allocate(256),m.allocate(256)],scene=m.allocate(0x180),sceneTable=m.allocate(12),stage=m.allocate(4),stageTable=m.allocate(8),thread=m.allocate(256),cell=m.allocate(4),sequences=new Map(),frameLists=new Map(),vectors=new Map(),tables=new Map();
 const short=p=>Buffer.from(m.bytes(p,2)).readInt16LE();
 for(let side=0;side<2;side++){
  const b=readFileSync(resolve(root,'reference/assets/th075b.dat/data/character/'+names[ids[side]]+'/'+names[ids[side]]+'.pat')),p=c.core_alloc(b.length);memory(c,p,b.length).set(b);assert.equal(c.pattern_load(p,b.length),1);assert.equal(c.match_pattern(side,p,b.length),1);c.core_free(p);const actions=new Map();
  for(let action=0;action<c.pattern_count();action++)if(c.pattern_present(action)){
   const seq=m.allocate(20),list=[];m.write(seq+16,memory(c,c.pattern_header(action),4));actions.set(action,seq);frameLists.set(seq,list);
   for(let index=0;index<c.pattern_frames(action);index++){
    const ptr=m.allocate(120),raw=Buffer.from(memory(c,c.pattern_frame(action,index),120));m.write(ptr,raw);list.push(ptr);
    for(let kind=0;kind<2;kind++){const n=c.pattern_rectangles(action,index,kind),data=Buffer.from(memory(c,c.pattern_rectangle_data(action,index,kind),n*16)),rects=[];for(let i=0;i<n;i++){const r=m.allocate(16);m.write(r,data.subarray(i*16,i*16+16));rects.push(r);}vectors.set(ptr+(kind?0x64:0x54),rects);}
   }
  }tables.set(actors[side]+0x468,actions);sequences.set(side,actions);
 }
 m.replace(0x4452d0,'native rectangle vector size',()=>{const v=vectors.get(m.reg('ECX'));assert.ok(v,'rect size '+m.reg('ECX').toString(16));return v.length;});
 m.replace(0x445310,'native rectangle vector element',()=>{const v=vectors.get(m.reg('ECX')),i=m.u32(m.reg('ESP')+4);assert.ok(v&&i<v.length);return v[i];},1);
 m.replace(0x4420b0,'native animation sequence lookup',()=>{const table=tables.get(m.reg('ECX')),action=short(m.reg('ESP')+4);assert.ok(table&&table.has(action),'sequence table '+m.reg('ECX').toString(16)+' action '+action);m.u32(cell,table.get(action));return cell;},1);
 m.replace(0x442060,'native animation frame lookup',()=>{const list=frameLists.get(m.reg('ECX')),i=short(m.reg('ESP')+4);assert.ok(list&&list[i],'frame '+i);return list[i];},1);
 m.replace(0x442120,'native sequence frame count',()=>frameLists.get(m.reg('ECX')).length);
 installSharedEffectStorage(c,m);
 const cp=c.core_alloc(bytes.length);memory(c,cp,bytes.length).set(bytes);assert.equal(c.match_begin(cp,bytes.length),1);c.core_free(cp);
 m.replace(0x4567b0,'base constructor separately checked',()=>m.reg('ECX'));m.replace(0x41cc50,'debug log',()=>0);m.replace(0x646196,'CRT RNG',()=>thread);m.call(0x41cae0);
 for(const [address,argc]of [[0x4079c0,1],[0x43d4d0,3],[0x445290,0],[0x445250,0],[0x445210,1],[0x4451d0,1],[0x4456f0,0],[0x43b5d0,0],[0x419df0,0],[0x446d60,1],[0x407e60,0],[0x419cb0,0],[0x446d80,0]])m.replace(address,'non-gameplay host boundary',()=>0,argc);
 // Original objects, histories and contacts run unchanged; only external storage is supplied.
 for(let side=0;side<2;side++){
  m.call(constructors[ids[side]],{ecx:actors[side]});const vt=m.u32(actors[side]);m.write(actors[side],memory(c,c.match_actor(side),0x1000));m.u32(actors[side],vt);m.u32(actors[side]+0x2e8,actors[1-side]);m.u32(actors[side]+0x2ec,managers[side]);m.u32(managers[side],actors[side]);for(let layer=0;layer<4;layer++)nativePointerQueue(m,managers[side]+4+20*layer).reset();
  const trails=m.allocate(32);m.u32(actors[side]+0x480,trails);m.view(trails+16,1)[0]=1;m.view(trails+18,2).set([32,0]);m.u32(trails+20,0xffffff);
  const q=actors[side]+0x518,map=m.allocate(64),blocks=m.allocate(256);m.u32(q+4,map);m.u32(q+8,16);m.u32(q+16,90);for(let i=0;i<16;i++)m.u32(map+i*4,blocks+i*16);
  if(ids[side]===5)installPhantomHistory(m,actors[side]);
  const seq=sequences.get(side).get(0),frame=frameLists.get(seq)[0];m.u32(actors[side]+8,frame);m.u32(actors[side]+0x74,frame);m.u32(actors[side]+0x78,seq);
  m.u32(scene+0x44+side*4,actors[side]);m.u32(scene+0x50+side*4,huds[side]);m.u32(0x671418+side*4,actors[side]);
 }
 for(let layer=0;layer<2;layer++)nativePointerQueue(m,0x6716c8+20*layer).reset();
 // The actual VC7 deque representation allows the original replay consumer and history logic to run.
 queues.forEach((data,k)=>{const width=[1,2,1,4][k],q=0x6718a4+k*20,n=data.length/width,blocks=Math.max(16,Math.ceil(data.length/16)+2),map=m.allocate(blocks*4),storage=m.allocate(blocks*16);m.u32(q+4,map);m.u32(q+8,blocks);m.u32(q+16,n);m.write(storage,data);for(let i=0;i<blocks;i++)m.u32(map+i*4,storage+i*16);});
 m.u32(scene,sceneTable);m.i32(scene+12,200);m.f32(scene+0x90,-300);m.f32(scene+0x9c,0);m.view(scene+0x98,2).fill(0);m.view(0x66c24c,2).fill(255);m.view(0x6714b4,1)[0]=2;m.view(0x6714d0,1)[0]=1;m.view(0x66c238,1)[0]=2;m.view(0x671430,1)[0]=1;m.view(0x67161e,1)[0]=1;m.view(0x671866,1)[0]=1;
 m.u32(thread+20,1);m.call(0x412620);m.call(0x412660,{args:[actors[0]+0x44,actors[0]+0x48,actors[1]+0x44,actors[1]+0x48]});
 // Camera advances at the original pre-frame render boundary; rasterization is excluded.
 m.u32(sceneTable+8,m.registerImport({dll:'render callback',name:'presentation excluded',argc:0,handler:()=>0}));m.u32(stage,stageTable);m.u32(0x671424,stage);m.u32(stageTable+4,m.registerImport({dll:'stage animation',name:'visual only',argc:0,handler:()=>0}));
 return {m,actors,scene,queues,step(){m.call(0x4126c0,{limit:0});m.view(0x66c237,1)[0]=0;return m.call(0x43b1b0,{ecx:scene,limit:0})&65535;},cursors(){return queues.map((b,i)=>b.length/[1,2,1,4][i]-m.u32(0x6718a4+i*20+16));}};
}
export async function compareMatch(filename,limit=Infinity){const bytes=readFileSync(resolve(replayDir,filename)),c=await core(),o=await originalMatch(c,bytes),m=o.m;let frames=0;const result={file:filename,sha256:sha(bytes),coreSha256:sha(readFileSync(resolve(root,"artifacts/cpp/game-core-test.wasm"))),passed:false,frames:0};
 const fields=[[0x44,0x25],[0x7c,44],[0x2cc,2],[0x324,6],[0x366,1],[0x368,8],[0x39c,2],[0x3a0,64],[0x4c0,0x58],[0xef8,4]];
 try{for(;frames<Math.min(limit,o.queues[0].length/2+500);frames++){
  const native=o.step(),ported=c.match_tick();
  for(let side=0;side<2;side++){const actual=Buffer.from(memory(c,c.match_actor(side),0x1000)),expected=Buffer.from(m.bytes(o.actors[side],0x1000));for(const [at,n]of fields)if(!actual.subarray(at,at+n).equals(expected.subarray(at,at+n))){let j=at;while(actual[j]===expected[j])j++;throw Error('frame '+frames+' side '+side+' field 0x'+j.toString(16)+' C++ '+actual.subarray(Math.max(0,j-4),j+8).toString('hex')+' native '+expected.subarray(Math.max(0,j-4),j+8).toString('hex'));}}
  const state=Array.from(new Uint32Array(c.memory.buffer,c.match_state(),12));assert.deepEqual(state.slice(4,8),o.cursors(),'stream cursors frame '+frames);assert.equal(state[2],m.view(o.scene+24,1)[0],'battle phase frame '+frames);assert.equal(state[3],m.u32(o.scene+12),'countdown frame '+frames);assert.equal(ported,native,'scene exit '+frames);if(frames%500===0)console.log(filename.slice(0,14),frames,state.slice(2,6));if(native){result.exit=native;result.complete=true;break;}
 }result.passed=true;result.frames=frames;return result;}catch(e){result.frames=frames;result.error=e.message;return result;}finally{m.close();}}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename)){const files=readdirSync(replayDir).filter(n=>n.endsWith('.rep')&&(!process.env.TH075_REPLAY_FILTER||n.includes(process.env.TH075_REPLAY_FILTER)));const shard=process.env.TH075_REPLAY_SHARD?.split('/').map(Number);const selected=shard?files.filter((f,i)=>i%shard[1]===shard[0]):files;const results=[];for(const file of selected){const result=await compareMatch(file,Number(process.env.TH075_REPLAY_LIMIT||Infinity));results.push(result);console.log(JSON.stringify(result));writeFileSync(resolve(root,'artifacts/browser/'+(process.env.TH075_REPLAY_REPORT||'original-match-comparison')+'.json'),JSON.stringify({scope:'full original main battle loop versus named C++ scene, real recorded inputs/random stream; rendering and audio excluded; neutral initial actor fields supplied from C++ and original constructors verified separately',results},null,2));if(!result.passed)process.exitCode=1;}}
