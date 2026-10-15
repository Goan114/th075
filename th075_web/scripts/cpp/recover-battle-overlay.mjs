import fs from 'node:fs';import {body,floatBits,assertReviewed} from './character-recovery-tools.mjs';import {recoverSceneDrawing} from './scene-drawing-recovery-tools.mjs';
const fields=new Map([[0x60,'timer'],[0x10,'frame'],[0x64,'kind'],[0x70,'horizontal'],[0x74,'vertical'],[0x78,'label'],[0x7c,'secondaryLabel'],[0x80,'pulse'],[0x84,'pulseVelocity'],[0x88,'ring']]);
let s=body('00446d80');
s=s.replace(/\*\(undefined4 \*\)\(param_1 \+ (0x[0-9a-f]+|[0-9]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(all,o,v)=>{if(parseInt(o)<0x70)throw Error('unreviewed overlay constant');return fields.get(parseInt(o))+'='+floatBits(v)+';';});
s=s.replace(/\*\(([^)]+) \*\)\(param_1 \+ (0x[0-9a-f]+|[0-9]+)\)/g,(all,type,o,at)=>{const name=fields.get(parseInt(o));if(!name)throw Error('unreviewed overlay field');return type==='float'&&!/^\s*=(?!=)/.test(s.slice(at+all.length))?'double('+name+')':name;});
s=s.replace(/\b(?:0\.3|0\.15|0\.2|0\.05)\b/g,v=>'double('+v+'f)');assertReviewed(s);
let cpp='#include "BattleOverlay.hpp"\nnamespace th075 {\nvoid BattleOverlay::advance(){\n'+s+'\n}\n';
cpp+='void BattleOverlay::render(ImageRenderer& images){\n'+recoverSceneDrawing('00447340',{fields,ftol:['u32(i32(double(pulse)*40.0))','u32(i32(double(ring)*60.0))','u32(i32(double(ring)*60.0))'],post:s=>s.replace(/\b1\.2\b/g,'double(1.2f)')})+'\n}\n}\n';
fs.writeFileSync('th075_web/cpp/game/BattleOverlay.cpp',cpp);
