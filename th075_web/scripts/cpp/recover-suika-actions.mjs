// Offline recovery. All runtime access uses named C++ state and callbacks.
import {readFileSync,writeFileSync} from 'node:fs';
import {root,body,typed,assertReviewed,floatBits} from './character-recovery-tools.mjs';
import {callReceivers} from './callsite-recovery-tools.mjs';
function calls(s,name,fn){let at=0;while((at=s.indexOf(name+'(',at))>=0){const start=at+name.length+1;let depth=1,i=start,args=[],part=start;for(;i<s.length&&depth;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;if((s[i]===','&&depth===1)||!depth){args.push(s.slice(part,i).trim());part=i+1;}}const replacement=fn(args);s=s.slice(0,at)+replacement+s.slice(i);at+=replacement.length;}return s;}
let s=body('005aeec0');
s=calls(s,'CONCAT31',args=>args[1]);
const receivers=callReceivers('005aeec0','FUN_0040fbb0');let receiver=0;s=calls(s,'FUN_0040fbb0',args=>receivers[receiver++]+'.begin_pose('+args.join(',')+')');if(receiver!==receivers.length)throw Error('Changed pose receiver count');
s=s.replaceAll('undefined2 extraout_var;','');
const actionTargets=callReceivers('005aeec0','FUN_0040fac0');let actionTarget=0;s=calls(s,'FUN_0040fac0',args=>actionTargets[actionTarget++]+'.select_action('+args.join(',')+')');if(actionTarget!==actionTargets.length)throw Error('Changed action receiver count');
const names=["impactX","impactY","spellLoops","guardEffectSent"];const extra=["summonTimer","giantMode","giantTicks","anchorX","anchorY","farRangeFrames"];const fields=new Map([...names.map((n,i)=>[0xf00+i*2,'state.'+n]),...extra.map((n,i)=>[0xf1c+i*2,'state.'+n]),[0xf28,'state.story.phaseTimer'],[0xf2a,'state.endWait'],[0xefc,'state.introWait'],[0xefe,'state.captionWait']]);
const anchors=[[0,140],[44,128],[50,85],[25,65],[-20,50],[-60,90],[-45,145],[0,150],[44,128],[44,110],[80,85],[80,85]];let conversions=0;s=s.replaceAll('FUN_006406ac()',()=>{const n=conversions++;if(n<18)return 'i16(i32(double(a.motion.'+(n%2?'velocityY':'velocityX')+')*100.0))';const pair=anchors[Math.floor((n-18)/2)];return 'i16(i32(double(a.motion.'+(n%2?'y)+':'x)+double(a.motion.facing)*')+(n%2?pair[1]:pair[0])+'))';});if(conversions!==42)throw Error('Changed original conversion count '+conversions);
s=s.replaceAll('(*(code *)**(undefined4 **)param_1)()','a.animation.set(a.animation.cursor.action,a.animation.cursor.index,a.animation.cursor.elapsed)')
.replaceAll('Concurrency::details::ContextBase::ClearCancel(*(ContextBase **)(param_1 + 0x2e8))','other.motion.clear()').replaceAll('Concurrency::details::ContextBase::ClearCancel(param_1)','a.motion.clear()')
.replaceAll('FUN_00454ee0()','a.motion.horizontal_limit(other.motion)')
.replaceAll('FUN_0040fa30()','a.animation.advance()')
.replaceAll('FUN_0040fac0(','a.select_action(')
.replaceAll('FUN_0040fb40(','selectFrame(')
.replaceAll('FUN_00453d60(','events.system_sound(').replaceAll('FUN_00453d40(','events.sound(')
.replaceAll('FUN_0040fb70(','a.set_polar_velocity(').replaceAll('FUN_0040fc50()','(a.pose.active=false)')
.replaceAll('FUN_00453a70(','owned(').replaceAll('FUN_00453c80(','shared(')
.replaceAll('FUN_0046d000(','consumeSpirit(').replaceAll('FUN_00454bc0(','trail(')
.replaceAll('FUN_00455580(','random.range(').replaceAll('FUN_00453e80(','hitFreeze(')
.replaceAll('FUN_00453be0(','ownedWithDraw(').replaceAll('FUN_00452c10(','scriptedDamage(').replaceAll('FUN_00453eb0(','biasCamera(').replaceAll('DAT_0066c239','hudAlpha[0]').replaceAll('DAT_0066c23a','hudAlpha[1]').replaceAll('DAT_00671622','completedStages').replaceAll('DAT_00671623','route').replaceAll('FUN_00453b50(','ownedVisual(').replaceAll('FUN_00454a70(','fade(')
.replaceAll('FUN_00455b30()','a.reset_command_history()').replaceAll('FUN_00452b30()','a.begin_spell(mode,replayMode,core)')
.replaceAll('DAT_006714d0','state.difficulty').replaceAll("DAT_006714b4 == '\x03'","mode==GameMode::Story");
const consumers=callReceivers('005aeec0','FUN_0046d000');let consumer=0;s=calls(s,'consumeSpirit',args=>'consumeSpirit('+consumers[consumer++]+','+args.join(',')+')');
s=calls(s,'FUN_00453e60',args=>'events.shake('+(/^(0x[0-9a-f]+|0)$/.test(args[0])?floatBits(args[0]):args[0])+')');
for(const name of ['a.begin_pose','other.begin_pose','a.set_polar_velocity','owned','shared','ownedVisual','ownedWithDraw'])s=calls(s,name,args=>name+'('+args.map((v,i)=>(name.endsWith('begin_pose')||name==='a.set_polar_velocity'||i===1||i===2)&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):v).join(',')+')');
s=typed(s,fields).replaceAll("* double(0.1f)","* 0.1");s=calls(s,'FUN_00483300',args=>'(aimRadians = atan('+args.join(',')+'))');s=s.replace(/\biVar4\b/g,'step').replace(/\bsVar3\b/g,'advancedFrame').replace(/\buVar2\b/g,'impactWord').replace(/\bcVar1\b/g,'boundary').replace(/\bfVar6\b/g,'effectY').replace(/\bfVar7\b/g,'position').replace(/\buVar5\b/g,'direction').replace(/\buVar8\b/g,'layer').replace(/\blocal_18\b/g,'emission').replace(/\blocal_14\b/g,'volley').replace(/\blocal_10\b/g,'spark').replace(/\blocal_c\b/g,'burst').replace(/\blocal_8\b/g,'dust');
for(const width of [240,280])s=s.replaceAll('(position + double('+width+'.0f)) - (float)step','double(float(double(position)+'+width+'.0))-step');
s=s.replaceAll('(position + double(30.0f)) - (float)step','double(float(double(position)+30.0))-step').replaceAll('(float)step + position + double(40.0f)','double(step)+float(double(position)+40.0)');
s=s.replaceAll('switchD_004d7eca_default','idleAction').replaceAll('DAT_006714b4','u8(mode)').replaceAll('param_1[(i8)u8(a.combat.spellPhase) + 0x32a]','a.phaseKinds[a.combat.spellPhase]').replaceAll('param_1[(i8)u8(a.combat.spellPhase) + 0x370]','a.phaseVariants[a.combat.spellPhase]');s=s.replaceAll('(fVar1 + double(70.0f)) - (float)iVar5','double(float(double(fVar1)+70.0))-iVar5');s=s.replaceAll('(fVar1 + double(30.0f)) - (float)iVar5','double(float(double(fVar1)+30.0))-iVar5').replaceAll('(float)iVar5 + fVar1 + double(40.0f)','double(iVar5)+float(double(fVar1)+40.0)');s=calls(s,'FUN_00412d90',args=>'std::abs(float('+args[0]+'))');for(const width of [100,200])s=s.replaceAll('(position + double('+width+'.0f)) - (float)step','double(float(double(position)+'+width+'.0))-step');s=s.replaceAll('(float)-(int)i16(state.introWait) * 0.1','-double(state.introWait)*double(0.1f)');s=s.replaceAll('u32 uVar9;','float particleCoordinateOrLayer;').replace(/\buVar9\b/g,'particleCoordinateOrLayer');s=s.replace(/\((effectY|position) \+ double\(([0-9]+\.[0-9]+)f\)\) - \(float\)step/g,(_,f,n)=>'double(float(double('+f+')+'+n+'))-step');{const start=s.indexOf('case 0x2f0:'),end=s.indexOf('case ',start+5);if(start<0||end<0)throw Error('Missing Suika flight spell');s=s.slice(0,start)+s.slice(start,end).replaceAll('* 0.1','* double(0.1f)')+s.slice(end);}assertReviewed(s);
const prelude=String.raw`
    auto& hudAlpha=events.hud_alpha();auto& completedStages=events.completed_stages();auto& route=events.route();
    const auto biasCamera=[&](u8 reverse){a.bias_camera(other,reverse!=0,events.camera());};
    const auto scriptedDamage=[&](i16 damage,i16 proration,i16 hits){other.combat.action=other.animation.cursor.action;DamageTarget target{other.combat.storyOpponent,other.collisionHealth,other.combat.spellPhase,other.phaseMaximum};a.damage.apply_scripted(damage,proration,hits,other.combat,target,mode==GameMode::Story);};
    const auto ownedWithDraw=[&](i16 id,float x,float y,i8 facing,u8 layer,u8 alternate,u8 shadow,u8 visual){events.effect(FighterEffectSpace::Owned,id,x,y,facing,layer,a.launchParameters,0,visual?&a.effectVisual:nullptr,alternate,shadow);};
    double aimRadians=0;const auto atan=[](float y,float x){return std::atan2(double(y),double(x));};
    const auto selectFrame=[&](i16 frame){a.animation.set(a.animation.cursor.action,frame,0);};
    const auto owned=[&](i16 id,float x,float y,i8 facing,u8 layer){events.effect(FighterEffectSpace::Owned,id,x,y,facing,layer,a.launchParameters);};
    const auto shared=[&](i16 id,float x,float y,i8 facing,u8 layer){events.effect(FighterEffectSpace::Shared,id,x,y,facing,layer,a.launchParameters);};
    const auto ownedVisual=[&](i16 id,float x,float y,i8 facing,u8 layer,u8 visual,u8 order){events.effect(FighterEffectSpace::Owned,id,x,y,facing,layer,a.launchParameters,order,visual?&a.effectVisual:nullptr);};
    const auto consumeSpirit=[&](FighterActor& receiver,i16 amount){auto& a=receiver;if(a.combat.spiritBreak<1){a.combat.spirit=i16(u16(a.combat.spirit)-u16(amount));if(a.combat.spirit<1&&a.combat.spiritBreak<1){events.system_sound(43);a.combat.spirit=0;a.combat.spiritBreak=1000;}}else a.combat.spiritBreak=1000;};
    const auto trail=[&](i32 frames,i8 interval,u32 mask){a.combat.noticeTimer=frames;a.trails.interval=interval;a.trails.colorMask=mask;};
    const auto hitFreeze=[&](i16 frames){if(frames>=0)a.motion.hitFreeze=frames;};
    const auto fade=[&](u8 kind){a.combat.fade=240;a.fadeKind=kind;};
`;
writeFileSync(root+'cpp/game/SuikaActions.cpp','#include "SuikaState.hpp"\n#include <cmath>\nnamespace th075 {\nvoid advance_suika_action(FighterActor& a,FighterActor& other,SuikaState& state,GameMode mode,ReplayStreams& random,u8 replayMode,FighterCoreEvents& core,FighterActionEvents& events){\n'+prelude+s+'\n}\n}\n');
console.log('Recovered complete Suika actions with '+conversions+' explicit impact conversions');
