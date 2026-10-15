import {writeFileSync,readFileSync} from 'node:fs';
import {root,body,typed,commonFields,floatBits,assertReviewed} from './character-recovery-tools.mjs';
import {calls} from './object-recovery-tools.mjs';
const id='004a9050',asm=readFileSync(root+'artifacts/cpp/analysis/jp/functions/'+id+'.asm','utf8').split(/\r?\n/),targets=new Map();
for(let i=0;i<asm.length;i++){const m=asm[i].match(/CALL 0x(0040fac0|0045d6f0|0045d6a0|0045d710)$/);if(!m)continue;const name='FUN_'+m[1];if(!targets.has(name))targets.set(name,[]);targets.get(name).push(asm.slice(i-5,i).some(v=>/MOV ECX,dword ptr \[\w+ \+ 0x2e8\]/.test(v))?'other':'a');}
let s=body(id);
for(const [name,list]of targets){let n=0;s=calls(s,name,args=>{const actor=list[n++];return name==='FUN_0040fac0'?actor+'.select_action('+args.join(',')+')':name==='FUN_0045d6f0'?'events.hide_portrait('+actor+')':name==='FUN_0045d6a0'?'events.show_portrait('+actor+','+args.join(',')+')':'events.advance_portrait('+actor+')';});if(n!==list.length)throw Error('Changed callback count '+name+' '+n+'/'+list.length);}
s=calls(s,'FUN_00412cc0',args=>'env.camera.override_view('+args.map((v,i)=>i&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):v).join(',')+')');
s=calls(s,'FUN_0045cd50',args=>'s.step = u8('+args[0]+')');
s=s.replaceAll('FUN_0045cdc0(','events.begin_dialogue(').replaceAll('FUN_0045ce10()','events.advance_dialogue()').replaceAll('FUN_0045d650(','events.show_dialogue(').replaceAll('FUN_004183d0()','events.reload_stage(env.background)').replaceAll('FUN_00419cb0(','events.select_music(').replaceAll('FUN_00419df0()','events.start_music()').replaceAll('FUN_00407d70()','events.stop_music()').replaceAll('FUN_00453d60(','events.sound(');
s=calls(s,'FUN_00413460',args=>'events.replace_text('+String(args[0]==='&DAT_00659459')+')');
for(const [from,to]of Object.entries({'_DAT_0067149c':'env.fadeColor','DAT_006714d1':'env.fadeAlpha','DAT_0067161d':'env.background','DAT_00671622':'env.completedStages','DAT_00671623':'env.route'}))s=s.replaceAll(from,to);
const fields=new Map([[0x6e4,'s.step'],[0x713,'s.nextStage'],[0xefc,'wait']]);for(let i=0;i<4;i++){fields.set(0xf34+4*i,'s.x['+i+']');fields.set(0xf5c+4*i,'s.y['+i+']');fields.set(0xffc+i,'s.alpha['+i+']');}
s=s.replace(/\*\(undefined4 \*\)\(param_1 \+ (0x[0-9a-f]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(all,o,b)=>parseInt(o)>=0xf34&&parseInt(o)<=0xf68?fields.get(parseInt(o))+' = '+floatBits(b)+';':all);
s=s.replace(/\*\(undefined4 \*\)\(\*\(int \*\)\(param_1 \+ 0x2e8\) \+\s*(0x[0-9a-f]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(_,o,b)=>'other.'+commonFields.get(parseInt(o))+' = '+floatBits(b)+';');
s=typed(s,fields).replaceAll('cVar1','dialogueReady');assertReviewed(s);
writeFileSync(root+'cpp/game/MarisaStory.cpp','#include "MarisaStory.hpp"\nnamespace th075 {\nvoid advance_marisa_story(FighterActor& a,FighterActor& other,StoryCutscene& s,i16& wait,StoryEnvironment& env,StoryEvents& events){\n'+s+'\n}\n}\n');
const seq=readFileSync(root+'cpp/game/StorySequence.cpp','utf8'),start=seq.indexOf('void initialize_reimu_story'),end=seq.indexOf('void StoryCutscene::render');let setup=seq.slice(start,end).replace('initialize_reimu_story','initialize_marisa_story').replace('{1,3,5,2,6,8,9,9,9,9}','{3,2,4,6,0,8,9,9,9,9}').replace('{1,13,0,6,6,20,9}','{3,10,4,6,0,20,9}').replace('normal(3,stage==3?5000:6000);spell(2,1,1);spell(1,2,2);','normal(3,6000);spell(2,1,1);spell(1,2,2,stage==4?7500:5000);');
// Stage seven also clears the original fade state explicitly.
setup=setup.replace('if(stage<=6){env.fadeColor=0;env.fadeAlpha=255;}','env.fadeColor=0;env.fadeAlpha=stage<=6?255:0;');
writeFileSync(root+'cpp/game/MarisaStorySetup.cpp','#include "MarisaStory.hpp"\nnamespace th075 {\n'+setup+'}\n');
writeFileSync(root+'cpp/game/MarisaStory.hpp','#pragma once\n#include "StorySequence.hpp"\nnamespace th075 {\nvoid initialize_marisa_story(FighterActor&,FighterActor&,StoryCutscene&,StoryEnvironment&);\nvoid advance_marisa_story(FighterActor&,FighterActor&,StoryCutscene&,i16&,StoryEnvironment&,StoryEvents&);\n}\n');
console.log('Recovered named Marisa story setup and cutscene callbacks');
