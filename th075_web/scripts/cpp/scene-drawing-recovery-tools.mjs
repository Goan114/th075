// Reviewed scene drawing recovery. The generated game uses named states and
// typed image/quad interfaces, never original memory layouts or addresses.
import fs from 'node:fs';import {body,floatBits,assertReviewed,commonFields} from './character-recovery-tools.mjs';
export function calls(s){const out=[];for(const m of s.matchAll(/\b(FUN_[0-9a-f]+|SetRect)\s*\(/g)){let d=1,end=m.index+m[0].length;for(;end<s.length&&d;end++){if(s[end]==='(')d++;else if(s[end]===')')d--;}let inner=s.slice(m.index+m[0].length,end-1),depth=0,start=0,args=[];for(let i=0;i<inner.length;i++){if(inner[i]==='(')depth++;else if(inner[i]===')')depth--;else if(inner[i]===','&&depth===0){args.push(inner.slice(start,i).trim());start=i+1;}}if(inner.trim())args.push(inner.slice(start).trim());out.push({name:m[1],at:m.index,end,args});}return out;}
export function recoverSceneDrawing(id,{fields=new Map(),globals={},actorFields=new Map(),custom=()=>null,ftol=[],post=s=>s}={}){
 const dir='th075_web/artifacts/cpp/analysis/jp/functions/',asm=fs.readFileSync(dir+id+'.asm','utf8').trim().split('\n'),meta=JSON.parse(fs.readFileSync(dir+id+'.calls.json','utf8'));
 let s=body(id),list=calls(s);if(list.length!==meta.length)throw Error('scene call metadata count '+id);
 const quadNames=new Map(),rectNames=new Map();const atCall=instruction=>asm.findIndex(l=>l.startsWith(instruction+' '));
 const prefix=instruction=>asm.slice(Math.max(0,atCall(instruction)-16),atCall(instruction));
 const receiver=instruction=>{for(const l of prefix(instruction).reverse()){const m=l.match(/LEA ECX,\[EBP \+ (0x[0-9a-f]+|-0x[0-9a-f]+)\]/);if(m){const off=m[1][0]==='-'?-parseInt(m[1].slice(1)):parseInt(m[1])|0;return 'local_'+(-off+4).toString(16);}}throw Error('scene quad receiver '+instruction);};
 const side=instruction=>{const p=prefix(instruction);for(const l of p.slice().reverse()){const m=l.match(/MOV (?:ECX|EDX|EAX),dword ptr \[(?:ECX|EDX|EAX) \+ (0x44|0x48)\]/);if(m)return m[1]==='0x44'?0:1;}throw Error('actor scene receiver '+instruction);};
 const resource=instruction=>{const p=prefix(instruction);if(/MOV ECX,dword ptr \[(?:ECX|EDX|EAX) \+ 0x4\]/.test(p[p.length-1]))return side(instruction)===0?'firstImages':'secondImages';return 'images';};
 for(let i=0;i<list.length;i++){const c=list[i],m=meta[i];if(c.name!==m.name)throw Error('scene C token call metadata '+id+' '+c.name);c.instruction=m.instruction;if(['FUN_0040d990','FUN_0040db50','FUN_00411400','FUN_00427500','FUN_00411500','FUN_004115c0','FUN_004116f0'].includes(c.name)){c.quad=receiver(c.instruction);if(!quadNames.has(c.quad))quadNames.set(c.quad,'quad'+quadNames.size);}if(c.name==='SetRect'){const r=c.args[0].replace('&','');if(!rectNames.has(r))rectNames.set(r,'bounds'+rectNames.size);}}
 const fargs=(args,indices)=>args.map((v,i)=>indices.includes(i)&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):v);
 const getQ=n=>{const v=quadNames.get(n.replace('&',''));if(!v)throw Error('unreviewed quad '+n+' '+id);return v;},getR=n=>{const v=rectNames.get(n.replace('&',''));if(!v)throw Error('unreviewed rectangle '+n+' '+id);return v;};
 for(const c of list.slice().reverse()){
  const a=c.args,q=c.quad&&getQ(c.quad);let t=custom(c,{side,resource,prefix,fargs,getQ,getR});if(t===null)switch(c.name){
   case 'SetRect':t=`${getR(a[0])}={${a.slice(1).map(v=>'i32('+v+')').join(',')}}`;break;
   case 'FUN_0040d990':t=`${q}={}`;break;
   case 'FUN_0040db50':
   case 'FUN_00411400':{const r=getR(a[0]);t=`${q}=rectangle_quad(float(${r}.left),float(${r}.top),float(${r}.right),float(${r}.bottom))`;break;}
   case 'FUN_00427500':t=`${q}=rectangle_quad(${fargs(a,[0,1,2,3]).join(',')})`;break;
   case 'FUN_00411500':t=`translate_quad(${q},${fargs(a,[0,1,2]).join(',')})`;break;
   case 'FUN_004115c0':t=`scale_quad(${q},${fargs(a,[0,1,2,3,4,5]).join(',')})`;break;
   case 'FUN_004116f0':t=`rotate_quad(${q},${fargs(a,[0,1,2,3,4,5]).join(',')})`;break;
   case 'FUN_0040c7f0':t=`images.blend(SpriteBlend(${a[0]}))`;break;
   case 'FUN_0040c840':t=`images.graphics.depth(DepthMode(${a[0]}))`;break;
   case 'FUN_00403910':t=`images.graphics.filled_rectangle(${getR(a[0])},${a[1]})`;break;
   case 'FUN_0040c9a0':t=`${resource(c.instruction)}.quad(${a[0]},${getQ(a[1])},${getR(a[2])},${a[3]})`;break;
   case 'FUN_00446b60':if(a.length!==5)throw Error('scene missing digit style '+c.instruction);t=`number(images,${fargs(a,[0,1]).join(',')})`;break;
   case 'FUN_00446b90':t=`number(images,${fargs(a,[0,1]).join(',')})`;break;
   case 'FUN_006406ac':t='SCENE_FTOL()';break;
   default:throw Error('unreviewed scene helper '+id+' '+c.name);
  }
  s=s.slice(0,c.at)+t+s.slice(c.end);
 }
 let fi=0;s=s.replaceAll('SCENE_FTOL()',()=>{if(fi>=ftol.length)throw Error('unreviewed scene ftol '+id);return ftol[fi++];});if(fi!==ftol.length)throw Error('scene ftol count '+id);
 s=post(s);
 // Actor array accesses with a dynamic phase index.
 s=s.replace(/\*\((?:char|byte) \*\)\(\*\(int \*\)\(param_1 \+ (0x44|0x48)\) \+ (0x32a|0x370) \+\s*\(int\)\*\(char \*\)\(\*\(int \*\)\(param_1 \+ \1\) \+ 0x39d\)\)/g,(_,which,off)=>{const owner=which==='0x44'?'first':'second',field=off==='0x32a'?'phaseKinds':'phaseVariants';return 'i8('+owner+'.'+field+'[i8('+owner+'.combat.spellPhase)])';});
 s=s.replace(/\*\(short \*\)\(\*\(int \*\)\(param_1 \+ (0x44|0x48)\) \+ 0x33e \+\s*([^;]*?) \* 2\)/g,(_,which,index)=>`${which==='0x44'?'first':'second'}.phaseMaximum[${index}]`);
 for(let repeat=0;repeat<4;repeat++)s=s.replace(/\*\(([^)]+) \*\)\(\*\(int \*\)\(param_1 \+ (0x44|0x48)\) \+\s*(0x[0-9a-f]+|[0-9]+)\)/g,(all,type,which,offset)=>{const owner=which==='0x44'?'first':'second',n=parseInt(offset),field=actorFields.get(n)??commonFields.get(n);if(!field)throw Error('unreviewed actor HUD field '+offset);if(type==='float')return `double(${owner}.${field})`;if(type==='char')return `i8(${owner}.${field})`;if(type==='byte'||type==='undefined1')return `u8(${owner}.${field})`;if(type==='ushort')return `u16(${owner}.${field})`;return `${owner}.${field}`;});
 s=s.replace(/\*\(([^)]+) \*\)\(param_1 \+ (0x[0-9a-f]+|[0-9]+)\)/g,(all,type,off)=>{const field=fields.get(parseInt(off));if(!field)throw Error('unreviewed scene own field '+off);return type==='float'?`double(${field})`:type==='char'?`i8(${field})`:field;});
 for(const [key,value]of Object.entries(globals))s=s.replaceAll(key,value);
 const floating=[...s.matchAll(/\bfloat\s+(local_[0-9a-f]+|fVar\d+);/g)].map(m=>m[1]);
 for(const v of floating)s=s.replace(new RegExp(`\\b${v}\\b`,'g'),(all,at)=>/^\s*(?:;|=(?!=))/.test(s.slice(at+all.length))?all:`double(${all})`);
 for(const [old,q]of quadNames)s=s.replace(new RegExp(`\\bundefined1\\s+${old} \\[\\d+\\];`),'').replace(new RegExp(`\\b${old}\\b`,'g'),q);
 for(const [old,r]of rectNames)s=s.replace(new RegExp(`\\btagRECT\\s+${old};`),'').replace(new RegExp(`\\b${old}\\b`,'g'),r);
 s=s.replace(/\bbyte\b/g,'u8').replace(/\(float\)/g,'(double)').replace(/\buint\b/g,'u32').replace(/\bundefined4\b/g,'u32').replace(/\bundefined1\b/g,'u8').replace(/\bfloat10\b/g,'double').replace(/\bushort\b/g,'u16').replace(/\bshort\b/g,'i16').replace(/\bchar\b/g,'i8');
 assertReviewed(s);
 return [...quadNames.values()].map(q=>`QuadPoints ${q}{};`).concat([...rectNames.values()].map(r=>`CollisionRectangle ${r}{};`)).join('\n')+'\n'+s;
}
