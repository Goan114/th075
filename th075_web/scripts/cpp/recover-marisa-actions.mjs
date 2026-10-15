// Offline recovery. All runtime access uses named C++ state and callbacks.
import {writeFileSync} from 'node:fs';
import {root,body,typed,assertReviewed,floatBits} from './character-recovery-tools.mjs';
function calls(s,name,fn){let at=0;while((at=s.indexOf(name+'(',at))>=0){const start=at+name.length+1;let depth=1,i=start,args=[],part=start;for(;i<s.length&&depth;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;if((s[i]===','&&depth===1)||!depth){args.push(s.slice(part,i).trim());part=i+1;}}const replacement=fn(args);s=s.slice(0,at)+replacement+s.slice(i);at+=replacement.length;}return s;}
let s=body('00486550');
s=calls(s,'CONCAT31',args=>args[1]);
s=s.replaceAll('undefined2 extraout_var;','');
const fields=new Map([[0xf00,'state.actionTicks'],[0xf02,'state.actionStage'],[0xf04,'state.volleyIndex'],[0xf14,'state.chargeCount'],[0xf16,'state.chargeRemaining'],[0xf18,'state.spellCounters[0]']]);
let conversions=0;s=s.replace(/FUN_006406ac\(\)(?=;\s*\*\(undefined2 \*\)\(param_1 \+ (0xf00|0xf02)\)\s*=)/g,(_,at)=>{conversions++;return 'i16(i32(double(a.motion.'+(at==='0xf00'?'velocityX':'velocityY')+')*100.0))';});if(conversions!==18)throw Error('Changed impact stores '+conversions);
s=s.replaceAll('(*(code *)**(undefined4 **)param_1)()','a.animation.set(a.animation.cursor.action,a.animation.cursor.index,a.animation.cursor.elapsed)')
.replaceAll('Concurrency::details::ContextBase::ClearCancel(param_1)','a.motion.clear()')
.replaceAll('FUN_00454ee0()','a.motion.horizontal_limit(other.motion)')
.replaceAll('FUN_0040fa30()','a.animation.advance()')
.replaceAll('FUN_0040fac0(','a.select_action(')
.replaceAll('FUN_0040fb40(','selectFrame(')
.replaceAll('FUN_00453d60(','events.system_sound(').replaceAll('FUN_00453d40(','events.sound(')
.replaceAll('FUN_0040fbb0(','a.begin_pose(').replaceAll('FUN_0040fc50()','(a.pose.active=false)')
.replaceAll('FUN_00453a70(','owned(').replaceAll('FUN_00453c80(','shared(')
.replaceAll('FUN_0046d000(','consumeSpirit(').replaceAll('FUN_00454bc0(','trail(')
.replaceAll('FUN_00455580(','random.range(').replaceAll('FUN_00453e80(','hitFreeze(')
.replaceAll('FUN_00453b50(','ownedVisual(').replaceAll('FUN_00454a70(','fade(')
.replaceAll('FUN_00452b30()','a.begin_spell(mode,replayMode,core)')
.replaceAll('DAT_006714d0','state.difficulty').replaceAll("DAT_006714b4 == '\x03'","mode==GameMode::Story");
s=calls(s,'FUN_00453e60',args=>'events.shake('+(/^(0x[0-9a-f]+|0)$/.test(args[0])?floatBits(args[0]):args[0])+')');
for(const name of ['a.begin_pose','owned','shared','ownedVisual'])s=calls(s,name,args=>name+'('+args.map((v,i)=>(name==='a.begin_pose'||i===1||i===2)&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):v).join(',')+')');
s=typed(s,fields);s=s.replace(/\biVar5\b/g,'step').replace(/\bsVar4\b/g,'advancedFrame').replace(/\buVar3\b/g,'impactWord').replace(/\bcVar2\b/g,'boundary').replace(/\bfVar1\b/g,'position').replace(/\bfVar7\b/g,'effectY').replace(/\buVar6\b/g,'direction').replace(/\buVar8\b/g,'layer').replace(/\blocal_18\b/g,'emission').replace(/\blocal_14\b/g,'volley').replace(/\blocal_10\b/g,'spark').replace(/\blocal_c\b/g,'burst').replace(/\blocal_8\b/g,'dust');
s=s.replaceAll('(position + double(30.0f)) - (float)step','double(float(double(position)+30.0))-step').replaceAll('(float)step + position + double(40.0f)','double(step)+float(double(position)+40.0)');
s=s.replaceAll('switchD_004865aa_default','idleAction').replaceAll('DAT_006714b4','u8(mode)').replaceAll('param_1[(i8)u8(a.combat.spellPhase) + 0x32a]','a.phaseKinds[a.combat.spellPhase]');assertReviewed(s);
const prelude=String.raw`
    const auto selectFrame=[&](i16 frame){a.animation.set(a.animation.cursor.action,frame,0);};
    const auto owned=[&](i16 id,float x,float y,i8 facing,u8 layer){events.effect(FighterEffectSpace::Owned,id,x,y,facing,layer,a.launchParameters);};
    const auto shared=[&](i16 id,float x,float y,i8 facing,u8 layer){events.effect(FighterEffectSpace::Shared,id,x,y,facing,layer,a.launchParameters);};
    const auto ownedVisual=[&](i16 id,float x,float y,i8 facing,u8 layer,u8 visual,u8 order){events.effect(FighterEffectSpace::Owned,id,x,y,facing,layer,a.launchParameters,order,visual?&a.effectVisual:nullptr);};
    const auto consumeSpirit=[&](i16 amount){if(a.combat.spiritBreak<1){a.combat.spirit=i16(u16(a.combat.spirit)-u16(amount));if(a.combat.spirit<1&&a.combat.spiritBreak<1){events.system_sound(43);a.combat.spirit=0;a.combat.spiritBreak=1000;}}else a.combat.spiritBreak=1000;};
    const auto trail=[&](i32 frames,i8 interval,u32 mask){a.combat.noticeTimer=frames;a.trails.interval=interval;a.trails.colorMask=mask;};
    const auto hitFreeze=[&](i16 frames){if(frames>=0)a.motion.hitFreeze=frames;};
    const auto fade=[&](u8 kind){a.combat.fade=240;a.fadeKind=kind;};
`;
writeFileSync(root+'cpp/game/MarisaActions.cpp','#include "MarisaState.hpp"\nnamespace th075 {\nvoid advance_marisa_action(FighterActor& a,FighterActor& other,MarisaState& state,GameMode mode,ReplayStreams& random,u8 replayMode,FighterCoreEvents& core,FighterActionEvents& events){\n'+prelude+s+'\n}\n}\n');
console.log('Recovered complete Marisa actions with '+conversions+' explicit impact conversions');
