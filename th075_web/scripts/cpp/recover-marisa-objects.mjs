// Reviewed native policies, expanded into named C++ fields and object callbacks.
import {writeFileSync} from 'node:fs';
import {root,body,assertReviewed,floatBits} from './character-recovery-tools.mjs';
import {typedObject,calls} from './object-recovery-tools.mjs';
const fields=new Map([[0xf00,'state.actionTicks'],[0xf02,'state.actionStage'],[0xf04,'state.volleyIndex'],[0xf0a,'state.frame.blockEffectSent'],[0xf12,'state.chargeMode'],[0xf14,'state.chargeCount'],[0xf16,'state.chargeRemaining'],[0xf32,'state.frame.farRangeFrames'],[0x1006,'state.laser.visible'],[0x1008,'state.laser.x'],[0x100c,'state.laser.y'],[0x1010,'state.laser.width'],[0x1014,'state.laser.facing']]);
for(let i=0;i<3;i++)fields.set(0xf0c+i*2,'state.effectCounters['+i+']');for(let i=0;i<13;i++)fields.set(0xf18+i*2,'state.spellCounters['+i+']');
const objectConversions=['i32(double(p.timer)*double(0.98f))','i32(p.parameters[0])','i32(p.parameters[0])','i32(aimRadians/double(0.017453289f))','i32(double(p.timer)*double(0.98f))','i32(p.motion.x)','i32(p.motion.y)','i32(p.motion.x)','i32(p.motion.y)','i32(aimRadians/double(0.017453289f))','i32(aimRadians/double(0.017453289f))','i32(double(p.timer)*double(0.98f))','i32(double(p.timer)*double(0.98f))','i32(double(p.timer)*double(0.98f))','i32(double(p.parameters[0])-roll+20)','i32(aimRadians/double(0.017453289f))','i32(aimRadians/double(0.017453289f))','i32(aimRadians/double(0.017453289f))'];
const orbitConversions=Array.from({length:12},(_,i)=>'i32(p.motion.'+(i%2?'y':'x')+')').concat(['i32(aimRadians/double(0.017453289f))','i32(double(p.parameters[0])+state.effectCounters[2]-180)']);for(let i=0;i<3;i++)orbitConversions.push('i32(double(state.effectCounters[0])+p.motion.facing*double(p.motion.velocityX))','i32(double(state.effectCounters[1])+p.motion.velocityY)');
const prelude=String.raw`
    double aimRadians=0;
    const auto atan=[&](float y,float x){return std::atan2(double(y),double(x));};
    const auto channel=[&](u32 shift){return u8(p.pose.color>>shift);};
    const auto setChannel=[&](u32 shift,u8 value){p.pose.color=(p.pose.color&~(255u<<shift))|(u32(value)<<shift);};
    const auto owned=[&](i16 id,float x,float y,i8 facing,u8 layer){events.effect(FighterEffectSpace::Owned,id,x,y,facing,layer,owner.launchParameters);};
    const auto shared=[&](i16 id,float x,float y,i8 facing,u8 layer){events.effect(FighterEffectSpace::Shared,id,x,y,facing,layer,owner.launchParameters);};
`;
let all='';
for(const [id,name,conversions]of [['004a80f0','advance_marisa_orbit',orbitConversions],['0049c8f0','advance_marisa_object',objectConversions]]){
    let s=body(id),n=0;
    s=s.replaceAll('FUN_006406ac()',()=>conversions[n++]??(()=>{throw Error('Unreviewed implicit value');})());if(n!==conversions.length)throw Error('Changed conversion count '+id+':'+n);
    s=s.replaceAll('FUN_0040fbb0(','p.begin_pose(').replaceAll('FUN_0040fb70(','p.polar(')
    .replaceAll('FUN_0040fa30()','p.advance()').replaceAll('FUN_0040fb40(','p.frame(').replaceAll('FUN_0040fac0(','p.action(')
    .replaceAll('FUN_0045b830()','p.destroy()').replaceAll('FUN_00453a70(','owned(').replaceAll('FUN_00453c80(','shared(')
    .replaceAll('FUN_00455580(','random.range(').replaceAll('FUN_0045b860(','events.system_sound(').replaceAll('FUN_00453d40(','events.sound(')
    .replaceAll('FUN_004a80f0()','advance_marisa_orbit(p,owner,other,state,random,events)')
    .replaceAll('DAT_006714d0','state.difficulty');
    s=calls(s,'FUN_0045b850',args=>'static_cast<void>('+args[0]+')');
    s=calls(s,'FUN_00453e60',args=>'events.shake('+(/^(0x[0-9a-f]+|0)$/.test(args[0])?floatBits(args[0]):args[0])+')');
    for(const name of ['p.begin_pose','p.polar','owned','shared'])s=calls(s,name,args=>name+'('+args.map((v,i)=>(name==='p.begin_pose'||name==='p.polar'||i===1||i===2)&&/^(0x[0-9a-f]+|0)$/.test(v)?floatBits(v):v).join(',')+')');
    s=typedObject(s,fields);
    // These three coefficients are 64-bit constants in the original x87 code.
    s=s.replaceAll('(float)(int)i16(p.timer) * double(0.01f) +', '(float)(int)i16(p.timer) * 0.01 +');
    s=s.replaceAll('* double(0.07f)', '* 0.07').replaceAll('* double(0.03f)', '* 0.03').replaceAll('* double(0.005f)', '* 0.005');
    s=calls(s,'FUN_00483300',args=>'atan('+args.join(',')+')');
    s=s.replace(/(^\s*)atan\(/gm,'$1aimRadians = atan(');
    s=s.replace(/channel\((\d+),/g,'setChannel($1,');
    s=s.replace(/\buVar1\b/g,'byteValue').replace(/\buVar2\b/g,'wordValue').replace(/\bsVar3\b/g,'advancedFrame').replace(/\biVar4\b/g,'roll').replace(/\buVar5\b/g,'direction').replace(/\bfVar6\b/g,'angleRadians').replace(/\bfVar7\b/g,'position').replace(/\buVar8\b/g,'auxiliaryValue').replace(/\buVar9\b/g,'layer').replaceAll('local_300','direction0').replaceAll('local_320','direction1');
    // The original reuses a 32-bit stack argument for float speed and byte layer.
    s=s.replace('u32 auxiliaryValue;','float auxiliaryValue;').replaceAll('auxiliaryValue = 0x40000000;','auxiliaryValue = 2.0f;');
    if(id==='004a80f0')s=s.replace(/\bwordValue\b/g,'shortValue').replace(/\buVar1\b/g,'shortValue').replace(/\bsVar2\b/g,'advancedFrame').replace(/\biVar3\b/g,'coordinate');
    s=s.replaceAll('random.range(0,0x28);','roll = random.range(0,0x28);');
    assertReviewed(s);
    all+='void '+name+'(MarisaObject& p,FighterActor& owner,FighterActor& other,MarisaState& state,ReplayStreams& random,FighterActionEvents& events){\n'+prelude+s+'\n}\n';
}
writeFileSync(root+'cpp/game/MarisaObjects.cpp','#include "MarisaObjects.hpp"\n#include <cmath>\nnamespace th075 {\n'+all+'}\n');
console.log('Recovered Marisa object and orbit policies into typed C++');
