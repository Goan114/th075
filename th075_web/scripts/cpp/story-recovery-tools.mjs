import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {root,body,typed,commonFields,floatBits,assertReviewed} from './character-recovery-tools.mjs';
import {calls} from './object-recovery-tools.mjs';
import {callReceivers} from './callsite-recovery-tools.mjs';
export function recoverStory({character,opponentId,setupId,advanceId,xOffset,yOffset,alphaOffset,captionAddresses,extraFields=[]}) {
 const name=character.toLowerCase(),fields=new Map([[0x6e4,'s.step'],[0x6e5,'s.opponent'],[0x713,'s.nextStage'],[0xefc,'wait'],...extraFields]);
 for(let i=0;i<4;i++){fields.set(xOffset+4*i,'s.x['+i+']');fields.set(yOffset+4*i,'s.y['+i+']');fields.set(alphaOffset+i,'s.alpha['+i+']');}
 const floatFields=new Set([0x44,0x48,0x50,0x54,0x58,0x5c]);
 function convertFields(s) {
  s=s.replace(/\*\(undefined4 \*\)\(param_1 \+ (0x[0-9a-f]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(all,o,b)=>{const n=parseInt(o);return (n>=xOffset&&n<xOffset+16||n>=yOffset&&n<yOffset+16)?fields.get(n)+' = '+floatBits(b)+';':all;});
  s=s.replace(/\*\(undefined4 \*\)\(\*\(int \*\)\(param_1 \+ 0x2e8\) \+\s*(0x[0-9a-f]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(all,o,b)=>floatFields.has(parseInt(o))?'other.'+commonFields.get(parseInt(o))+' = '+floatBits(b)+';':all);
  return typed(s,fields);
 }
 function callbacks(s,id,story) {
  const asm=readFileSync(root+'artifacts/cpp/analysis/jp/functions/'+id+'.asm','utf8').split(/\r?\n/),targets=new Map();
  for(let i=0;i<asm.length;i++){const m=asm[i].match(/CALL 0x(0040fac0|0045d6f0|0045d6a0|0045d710)$/);if(!m)continue;const n='FUN_'+m[1];if(!targets.has(n))targets.set(n,[]);targets.get(n).push(asm.slice(i-5,i).some(v=>/MOV ECX,dword ptr \[\w+ \+ 0x2e8\]/.test(v))?'other':'a');}
  for(const [n,legacy]of targets){const list=existsSync(root+'artifacts/cpp/analysis/jp/functions/'+id+'.calls.json')?callReceivers(id,n):legacy;let index=0;s=calls(s,n,args=>{const actor=list[index++];return n==='FUN_0040fac0'?actor+'.select_action('+args.join(',')+')':n==='FUN_0045d6f0'?'events.hide_portrait('+actor+')':n==='FUN_0045d6a0'?'events.show_portrait('+actor+','+args.join(',')+')':'events.advance_portrait('+actor+')';});if(index!==list.length)throw Error('Changed callback count '+n+' '+index+'/'+list.length);}
  s=calls(s,'FUN_00412cc0',args=>'env.camera.override_view('+args.map((v,i)=>i&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):v).join(',')+')');
  s=s.replaceAll('FUN_00412cf0()','env.camera.snap()');
  s=calls(s,'FUN_004574d0',args=>'set_story_phase(other,'+args.join(',')+')');
  s=calls(s,'CONCAT31',args=>args[1]);
  for(const [from,to]of Object.entries({'DAT_0067161e':'env.stage','DAT_006714d0':'env.difficulty','_DAT_0067149c':'env.fadeColor','DAT_006714d1':'env.fadeAlpha','DAT_0067161d':'env.background','DAT_00671622':'env.completedStages','DAT_00671623':'env.route','DAT_0066c239':'env.hudAlpha[0]','DAT_0066c23a':'env.hudAlpha[1]'}))s=s.replaceAll(from,to);
  if(story){s=calls(s,'FUN_0045cd50',args=>'s.step = u8('+args[0]+')');s=s.replaceAll('FUN_0045cdc0(','events.begin_dialogue(').replaceAll('FUN_0045ce10()','events.advance_dialogue()').replaceAll('FUN_0045d650(','events.show_dialogue(').replaceAll('FUN_004183d0()','events.reload_stage(env.background)').replaceAll('FUN_00419cb0(','events.select_music(').replaceAll('FUN_00419df0()','events.start_music()').replaceAll('FUN_00407d70()','events.stop_music()').replaceAll('FUN_00453d60(','events.sound(');s=calls(s,'FUN_00413460',args=>{if(!captionAddresses.includes(args[0]))throw Error('Unknown caption '+args[0]);return 'events.replace_text('+String(args[0]===captionAddresses[1])+')';});}
  s=convertFields(s).replaceAll('cVar1','dialogueReady');assertReviewed(s);return s;
 }
 const setup=callbacks(body(setupId),setupId,false),opponent=callbacks(body(opponentId),opponentId,false).replace(/return;\s*$/,''),advance=callbacks(body(advanceId),advanceId,true);
 writeFileSync(root+'cpp/game/'+character+'Story.hpp','#pragma once\n#include "StorySequence.hpp"\nnamespace th075 {\nvoid initialize_'+name+'_story(FighterActor&,FighterActor&,StoryCutscene&,StoryEnvironment&);\nvoid advance_'+name+'_story(FighterActor&,FighterActor&,StoryCutscene&,i16&,StoryEnvironment&,StoryEvents&);\n}\n');
 writeFileSync(root+'cpp/game/'+character+'StorySetup.cpp','#include "'+character+'Story.hpp"\nnamespace th075 {\nvoid initialize_'+name+'_story(FighterActor& a,FighterActor& other,StoryCutscene& s,StoryEnvironment& env){{\n'+opponent+'\n}{\n'+setup+'\n}}\n}\n');
 writeFileSync(root+'cpp/game/'+character+'Story.cpp','#include "'+character+'Story.hpp"\nnamespace th075 {\nvoid advance_'+name+'_story(FighterActor& a,FighterActor& other,StoryCutscene& s,i16& wait,StoryEnvironment& env,StoryEvents& events){\n'+advance+'\n}\n}\n');
 console.log('Recovered '+character+' story setup and original cutscene callbacks');
}
