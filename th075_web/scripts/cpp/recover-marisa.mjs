// Reviewed offline reconstruction into game state and named callbacks.
import {writeFileSync} from 'node:fs';
import {root,body,typed,assertReviewed} from './character-recovery-tools.mjs';
const fields=new Map([[0xf12,'s.chargeMode'],[0xf14,'s.chargeCount']]);
let command=body('00493470');
command=command.replace(/\*\(uint\s*\*\)\(\*\(int\s*\*\)\(param_1\s*\+\s*0x74\)\s*\+\s*0x3c\s*\)/g,'a.animation.frame->flags[0]')
.replace(/\*\(short\s*\*\)\(\*\(int\s*\*\)\(param_1\s*\+\s*0x78\)\s*\+\s*0x12\s*\)/g,'priority')
.replace(/\*\(short \*\)\(\*piVar2 \+ 0x10\)/g,'targetPriority')
.replace(/piVar2\s*=\s*\(int \*\)FUN_004420b0\(/g,'targetPriority = mode(')
.replace('short sVar1;','i16 comparedPriority = 0;')
.replace('int *piVar2;','i16 targetPriority = 0;')
.replaceAll('sVar1','comparedPriority')
.replaceAll('FUN_00455b30()','a.reset_command_history()')
.replaceAll('FUN_0040fac0(','a.select_action(')
.replaceAll('FUN_00453a10()','a.controls.buffered.clear()')
.replaceAll('DAT_006714d0','s.difficulty');
command=typed(command,fields);assertReviewed(command);
const prelude='    if(!a.animation.pattern||!a.animation.frame)return;\n    const auto& sequences=a.animation.pattern->sequences;\n    const i16 action=a.animation.cursor.action;\n    if(action<0||u32(action)>=sequences.size())return;\n    const i16 priority=i16(sequences[action].next);\n    const auto mode=[&](i16 id){return id>=0&&u32(id)<sequences.size()&&sequences[id].present?i16(sequences[id].mode):i16(-32768);};\n';
writeFileSync(root+'cpp/game/MarisaCommands.cpp','#include "MarisaState.hpp"\nnamespace th075 {\nvoid select_marisa_commands(FighterActor& a,const FighterActor& other,const MarisaState& s){\n'+prelude+command+'\n}\n}\n');
let ai='';
for(const [id,name,walk]of [['00499030','duel','duelWalkFrames'],['0049b070','story','storyWalkFrames']]){
 let s=body(id);
 s=s.replace(/\*\(char \*\)\(param_1 \+ 0x370 \+ \(int\)\*\(char \*\)\(param_1 \+ 0x39d\)\)/g,'i8(a.phaseVariants[a.combat.spellPhase])');
 s=typed(s,fields).replaceAll('FUN_00412d90(','std::abs(float(');
 // Absolute value accepts one native float argument, so preserve its store boundary.
 s=s.replace(/std::abs\(float\(([^;]+)\);/g,'std::abs(float($1));');
 s=s.replaceAll('FUN_00454f90()','(other.animation.cursor.action>=50&&other.animation.cursor.action<=149)')
 .replaceAll('FUN_00455610(','random.range(').replaceAll('_rand()','random.next()')
 .replaceAll('DAT_006714d0','state.difficulty').replaceAll(name==='duel'?'DAT_0068d624':'DAT_0068d628','context.'+walk);
 s=s.replace(/\bfVar1\b/g,'dx').replace(/\bfVar2\b/g,'dy').replace(/\bcVar3\b/g,'hurt').replace(/\buVar4\b/g,'duration').replace(/\biVar5\b/g,'roll').replace(/\buVar6\b/g,'direction').replace(/\bfVar7\b/g,'distance');
 s=s.replaceAll('s.chargeCount','state.chargeCount');assertReviewed(s);
 ai+='void choose_marisa_'+name+'_input(FighterActor& a,const FighterActor& other,const MarisaState& state,ReplayRandom& random,CharacterAIContext& context){\n'+s+'\n}\n';
}
writeFileSync(root+'cpp/game/MarisaAI.cpp','#include "MarisaState.hpp"\n#include <cmath>\nnamespace th075 {\n'+ai+'}\n');
console.log('Marisa typed command selection and CPU decisions recovered');
