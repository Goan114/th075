// Offline recovery of named background drawing methods from reviewed 1.11
// control flow. Native addresses are confined to this script and test evidence.
import fs from 'node:fs';import {body,floatBits,assertReviewed} from './character-recovery-tools.mjs';
const root='th075_web/',dir=root+'artifacts/cpp/analysis/jp/functions/',rows=JSON.parse(fs.readFileSync(root+'reference/background-analysis.json')),constants=JSON.parse(fs.readFileSync(root+'reference/background-constants.json'));
function calls(s){const found=[];for(const m of s.matchAll(/\b(FUN_[0-9a-f]+|SetRect)\s*\(/g)){let depth=1,end=m.index+m[0].length;for(;end<s.length&&depth;end++){if(s[end]==='(')depth++;else if(s[end]===')')depth--;}if(depth)throw Error('unbalanced call');const inside=s.slice(m.index+m[0].length,end-1);let p=0,start=0,args=[];for(let i=0;i<inside.length;i++){if(inside[i]==='(')p++;else if(inside[i]===')')p--;else if(inside[i]===','&&!p){args.push(inside.slice(start,i).trim());start=i+1;}}if(inside.trim())args.push(inside.slice(start).trim());found.push({name:m[1],at:m.index,end,args});}return found;}
function stackTarget(asm,instruction){const index=asm.findIndex(s=>s.startsWith(instruction+' '));const prefix=asm.slice(Math.max(0,index-8),index).reverse();for(const s of prefix){const m=s.match(/LEA ECX,\[EBP \+ (0x[0-9a-f]+|-0x[0-9a-f]+)\]/);if(m){const val=m[1][0]==='-'?-parseInt(m[1].slice(1)):parseInt(m[1])|0;return 'local_'+(-val+4).toString(16);}}throw Error('no typed quad receiver '+instruction);}
function constantArgument(asm,instruction){const index=asm.findIndex(s=>s.startsWith(instruction+' '));for(const s of asm.slice(Math.max(0,index-6),index).reverse()){const m=s.match(/PUSH (0x[0-9a-f]+|-0x[0-9a-f]+)/);if(m)return m[1];}throw Error('no graphics state argument '+instruction);}
function convert(id,slot){let s=body(id),list=calls(s),meta=JSON.parse(fs.readFileSync(dir+id+'.calls.json','utf8')),asm=fs.readFileSync(dir+id+'.asm','utf8').trim().split('\n');
 const quads=new Map(),rects=new Map(),strips=new Map(),targets=new Map();let mi=0;
 for(const call of list){if(call.name==='SetRect'){rects.set(call.args[0].replace('&',''),`textureRect${rects.size}`);if(meta[mi]?.name!=='SetRect')throw Error('SetRect metadata');mi++;continue;}const m=meta[mi++];if(!m||m.name!==call.name)throw Error('call order '+id+' '+call.name+' '+JSON.stringify(m));call.instruction=m.instruction;
  if(['FUN_0040db50','FUN_0040da00','FUN_00411500','FUN_004115c0','FUN_004116f0'].includes(call.name)){const target=stackTarget(asm,m.instruction);if(!quads.has(target))quads.set(target,`layerQuad${quads.size}`);targets.set(call.at,target);}
  if(['FUN_0040ca20','FUN_0040c9a0'].includes(call.name)){const q=call.args[1].replace('&',''),r=call.args[2].replace('&','');if(!quads.has(q))quads.set(q,`layerQuad${quads.size}`);if(!rects.has(r))rects.set(r,`textureRect${rects.size}`);}
  if(call.name==='FUN_0040db50'){const r=call.args[0].replace('&','');if(!rects.has(r))rects.set(r,`textureRect${rects.size}`);}
  if(call.name==='FUN_0040c970'&&call.args[1].startsWith('&local'))strips.set(call.args[1].slice(1),{name:`stripVertices${strips.size}`,count:parseInt(call.args[2])});
 }
 if(mi!==meta.length)throw Error('unconsumed original calls '+id);
 const mapped=new Map();for(const [base,name]of quads){const at=parseInt(base.slice(6),16);for(let i=0;i<16;i++)mapped.set('local_'+(at-i*4).toString(16),`${name}[${i>>2}][${i&3}]`);}
 for(const [base,name]of rects){const at=parseInt(base.slice(6),16);['left','top','right','bottom'].forEach((v,i)=>mapped.set('local_'+(at-i*4).toString(16),`${name}.${v}`));}
 for(const [base,{name,count}]of strips){const at=parseInt(base.slice(6),16);for(let i=0;i<count;i++)['x','y','z','reciprocalW','color','u','v'].forEach((v,j)=>mapped.set('local_'+(at-i*28-j*4).toString(16),`${name}[${i}].${v}`));}
 let ftol=0;const fArgs=(args,indices)=>args.map((v,i)=>indices.includes(i)&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):indices.includes(i)&&/^uVar\d+$/.test(v)?`float_bits(${v})`:v);
 for(const call of [...list].reverse()){
  let result='',args=call.args,target=targets.get(call.at),q=target&&quads.get(target);switch(call.name){
   case 'SetRect':result=`${rects.get(args[0].replace('&',''))}={${args.slice(1).join(',')}}`;break;
   case 'FUN_006406ac':result='BACKGROUND_FTOL()';break;
   case 'FUN_00641804':result=`std::sin(${args[0]})`;break;
   case 'FUN_0040c7f0':result=`images.blend(SpriteBlend(${args[0]??constantArgument(asm,call.instruction)}))`;break;
   case 'FUN_0040c840':result=`g.depth(DepthMode(${args[0]??constantArgument(asm,call.instruction)}))`;break;
   case 'FUN_0040c860':result=`g.filter(Filter((${args[0]??constantArgument(asm,call.instruction)})-1))`;break;
   case 'FUN_0040ca80':result=`images.image(${fArgs(args,[1,2,4,5,6,7]).join(',')})`;break;
   case 'FUN_0040cef0':result=`images.image(${fArgs(args,[1,2,4,5,6,7]).join(',')})`;break;
   case 'FUN_0040d990':result='';break;
   case 'FUN_0040db50':{const r=rects.get(args[0].replace('&',''));result=`${q}=rectangle_quad(float(${r}.left),float(${r}.top),float(${r}.right),float(${r}.bottom))`;break;}
   case 'FUN_0040da00':result=`${q}=rectangle_quad(${fArgs(args,[0,1,2,3]).join(',')})`;break;
   case 'FUN_00411500':result=`translate_quad(${q},${fArgs(args,[0,1,2]).join(',')})`;break;
   case 'FUN_004115c0':result=`scale_quad(${q},${fArgs(args,[0,1,2,3,4,5]).join(',')})`;break;
   case 'FUN_004116f0':result=`rotate_quad(${q},${fArgs(args,[0,1,2,3,4,5]).join(',')})`;break;
   case 'FUN_0040ca20':result=`images.projected(${args[0]},${quads.get(args[1].replace('&',''))},${rects.get(args[2].replace('&',''))},${fArgs(args.slice(3),[0,1,2]).join(',')})`;break;
   case 'FUN_0040c9a0':result=`images.quad(${args[0]},${quads.get(args[1].replace('&',''))},${rects.get(args[2].replace('&',''))},${args[3]})`;break;
   case 'FUN_0040c970':{const strip=strips.get(args[1].replace('&',''));if(!strip)throw Error('special water strip '+id);result=`images.strip(${args[0]},${strip.name}.data(),${args[2]})`;break;}
   case 'FUN_00403910':result=`g.filled_rectangle(${rects.get(args[0].replace('&',''))},${args[1]})`;break;
   default:throw Error('unknown original helper '+call.name+' '+id);
  }
  s=s.slice(0,call.at)+result+s.slice(call.end);
 }
 const extraConversions={
  '0044e3d0':['i32((1536.0-double(timer)*0.4)/384.0)'],
  '0044e930':['i32(std::sin(double(secondaryTimer)*0.1+1.0)*5.0)','i32(std::sin(double(secondaryTimer)*0.1+2.0)*4.0)','i32(std::sin(double(secondaryTimer)*0.1+3.0)*5.0)','i32(std::sin(double(secondaryTimer)*0.1+4.0)*6.0)','i32((1536.0-double(timer)*0.4)/384.0)'],
  '00450420':['i32((3072.0-double(timer)*0.1)/768.0)']
 };
 const conversions=['i32(double(camera.x)+160.0)','i32(camera.y)',...(extraConversions[id]??[])];s=s.replaceAll('BACKGROUND_FTOL()',()=>{if(ftol>=conversions.length)throw Error('unreviewed implicit conversion '+id);return conversions[ftol++];});if(ftol&&ftol!==conversions.length)throw Error('conversion count '+id);
 // Decompiler dummy sine statements only transport the x87 result to ftol.
 s=s.replace(/^\s*std::sin\([^;]+\);/gm,'');
 // Replace explicit scalar state reads with ordinary typed fields.
 s=s.replace(/\*\((?:int|undefined4) \*\)\(param_1 \+ (0x68|0x6c|0x70)\)/g,(_,o)=>({0x68:'timer',0x6c:'animationFrame',0x70:'secondaryTimer'})[parseInt(o)]);
 s=s.replace(/\b(?:undefined1|undefined4|float|int|uint|float10|tagRECT)\s+(local_[0-9a-f]+)(?:\s*\[[0-9]+\])?;/g,(all,name)=>mapped.has(name)||quads.has(name)||rects.has(name)?'':all);
 s=s.replace(/\b(local_[0-9a-f]+)\s*=\s*(0x[0-9a-f]+|0);/g,(all,name,v)=>mapped.has(name)&&!mapped.get(name).includes('textureRect')&&!mapped.get(name).endsWith('.color')?`${name}=${floatBits(v)};`:all);
 s=s.replace(/\b(local_[0-9a-f]+)\b/g,(all,name)=>mapped.get(name)??name);
 // Float temporaries store to 32 bits, while the original x87 expressions use
 // double precision until their next explicit store or call parameter.
 const floatLocals=[...s.matchAll(/\bfloat\s+(fVar[0-9]+|local_[0-9a-f]+)\s*;/g)].map(m=>m[1]);
 s=s.replace(/\(float10\)/g,'(double)').replace(/\(float\)/g,'(double)');
 for(const v of floatLocals)s=s.replace(new RegExp(`\\b${v}\\b`,'g'),(all,at)=>/^\s*(?:=(?!=)|;)/.test(s.slice(at+all.length))?all:`double(${v})`);
 s=s.replace(/\bfloat10\b/g,'double').replace(/\bundefined4\b/g,'u32').replace(/\buint\b/g,'u32');
 s=s.replace(/\b[0-9]+\.[0-9]+\b/g,(text,at)=>{if(/[a-zA-Z0-9_]/.test(s[at-1]??'')||s[at+text.length]==='f')return text;const n=Number(text),found=(constants[id]??[]).filter(v=>Math.abs(Math.abs(v.value)-n)<=Math.max(n*1e-7,1e-12)).sort((a,b)=>Math.abs(Math.abs(a.value)-n)-Math.abs(Math.abs(b.value)-n))[0];const value=found?Math.abs(found.value):n;return value.toString()+(Number.isInteger(value)?'.0':'');});
 // Rectangle helpers take float parameters, with conversion at the boundary.
 
 assertReviewed(s);const declarations=[...quads.values()].map(q=>`QuadPoints ${q}{};`).concat([...rects.values()].map(r=>`CollisionRectangle ${r}{};`),[...strips.values()].map(v=>`std::array<ScreenVertex,${v.count}> ${v.name}{};`));
 const floatsGenerated=new Set([...quads.values()].flatMap(q=>Array.from({length:16},(_,i)=>`${q}[${i>>2}][${i&3}]`)));
 // Recover float reads from typed quad/strip fields in expressions.
 for(const [old,v]of mapped)if(floatsGenerated.has(v)||v.includes('stripVertices')&&!v.endsWith('.color')){const esc=v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');s=s.replace(new RegExp(esc,'g'),(all,at)=>/^\s*=(?!=)/.test(s.slice(at+all.length))?all:`double(${all})`);}
 return `\nvoid BackgroundStage::draw_${slot}_${rows.find(r=>r.methods.includes(id)).kind}(ImageRenderer& images,const CameraMotion& camera){\n auto& g=images.graphics;\n ${declarations.join('\n ')}\n${s}\n}\n`;
}
const headers=rows.flatMap(r=>['back','middle','front'].map(p=>`void draw_${p}_${r.kind}(ImageRenderer&,const CameraMotion&);`));
fs.writeFileSync(root+'cpp/game/BackgroundStage.hpp',`#pragma once\n#include "ImageRenderer.hpp"\n#include "CameraMotion.hpp"\nnamespace th075 {\nenum class BackgroundKind:u8 {${rows.map(r=>r.kind).join(',')}};\nclass BackgroundStage {\n${headers.join('\n')}\npublic:\n BackgroundKind kind=BackgroundKind::BG00a;\n i32 timer=0,animationFrame=0,secondaryTimer=0;\n std::array<float,3> shadowOrigin{};\n std::array<ScreenVertex,130> waterVertices{};\n void reset(BackgroundKind);\n void advance();\n void render_back(ImageRenderer&,const CameraMotion&);\n void render_middle(ImageRenderer&,const CameraMotion&);\n void render_front(ImageRenderer&,const CameraMotion&);\n ShadowStyle shadow_style()const;\n const char* resource_path()const;\n};\n}\n`);
let cpp='#include "BackgroundStage.hpp"\n#include <cmath>\nnamespace th075 {\nnamespace {float float_bits(u32 v){float f;std::memcpy(&f,&v,4);return f;}}\n';
for(const r of rows)for(const [p,n]of [['back',4],['middle',3],['front',2]]){if(r.kind==='BG09a'&&p==='back')continue;cpp+=convert(r.methods[n],p);}
cpp+='\nvoid BackgroundStage::reset(BackgroundKind value){kind=value;timer=animationFrame=secondaryTimer=0;waterVertices={};switch(kind){\n';
for(const r of rows){const ctor=body(r.constructor),v=[3,4,5].map(o=>ctor.match(new RegExp(`param_1\\[${o}\\] = (0x[0-9a-f]+|0);`))?.[1]??'0');cpp+=`case BackgroundKind::${r.kind}:shadowOrigin={${v.map(floatBits).join(',')}};break;\n`;}cpp+='}}\n';
cpp+='void BackgroundStage::advance(){switch(kind){\n';
for(const r of rows){let s=body(r.methods[1]);s=s.replace(/\*\((?:int|undefined4) \*\)\(param_1 \+ (0x68|0x6c|0x70)\)/g,(_,o)=>({0x68:'timer',0x6c:'animationFrame',0x70:'secondaryTimer'})[parseInt(o)]).replace(/(timer|animationFrame|secondaryTimer) = \1 \+ (1|-1);/g,(_,v,n)=>`${v}=increment_wrapped(${v},${n});`);assertReviewed(s);cpp+=`case BackgroundKind::${r.kind}:{${s}}break;\n`;}cpp+='}}\n';
for(const p of ['back','middle','front'])cpp+=`void BackgroundStage::render_${p}(ImageRenderer& images,const CameraMotion& camera){switch(kind){${rows.map(r=>`case BackgroundKind::${r.kind}:draw_${p}_${r.kind}(images,camera);break;`).join('\n')}}}\n`;
cpp+='const char* BackgroundStage::resource_path()const{switch(kind){'+rows.map(r=>`case BackgroundKind::${r.kind}:return "data/background/${r.kind}.dat";`).join('\n')+'}return "";}\n';
cpp+='ShadowStyle BackgroundStage::shadow_style()const{ShadowStyle s;s.projection=shadowOrigin;switch(kind){\n';
for(const r of rows){const s=body(r.methods[5]),color=s.match(/\*param_2 = (0x[0-9a-f]+);/)?.[1];const call=calls(s).find(c=>c.name==='FUN_004115c0');if(!color||!call)throw Error('shadow policy '+r.kind);cpp+=`case BackgroundKind::${r.kind}:s.scale={${call.args.slice(3).map(floatBits).join(',')}};s.color=${color};break;\n`;}cpp+='}return s;}\n}\n';
fs.writeFileSync(root+'cpp/game/BackgroundStage.cpp',cpp);console.log('reviewed 36 background controllers; water composition written separately');
