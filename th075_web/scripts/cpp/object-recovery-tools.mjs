// Offline object reconstruction helper; never shipped as an execution backend.
import {readFileSync} from 'node:fs';
import {root,commonFields,floatBits} from './character-recovery-tools.mjs';
const fixtures=readFileSync(root+'tests/cpp/core-exports.cpp','utf8');
const section=fixtures.slice(fixtures.indexOf('static void object_fixture_fields'),fixtures.indexOf('API(reimu_object_load)'));
export const objectFields=new Map([...section.matchAll(/field\((0x[0-9a-f]+),a\.([^);]+)\)/g)].map(m=>[parseInt(m[1]),'p.'+m[2]]));
for(const [at,name,count,stride]of [[0x16,'pose.projection',3,2],[0x1c,'pose.scale',3,4],[0x28,'pose.rotation',3,4],[0x34,'pose.offset',3,4],[0xc8,'parameters',4,4],[0x84,'recoveryTimers',3,2]])for(let i=0;i<count;i++)objectFields.set(at+i*stride,'p.'+name+'['+i+']');
objectFields.set(0xe2,'p.auxiliary');objectFields.set(0x4c,'p.depth');
export function calls(s,name,fn){let at=0;while((at=s.indexOf(name+'(',at))>=0){const start=at+name.length+1;let depth=1,i=start,args=[],part=start;for(;i<s.length&&depth;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;if((s[i]===','&&depth===1)||!depth){args.push(s.slice(part,i).trim());part=i+1;}}const replacement=fn(args);s=s.slice(0,at)+replacement+s.slice(i);at+=replacement.length;}return s;}
const floatOffsets=new Set([0x4c,0x2d8,0x2dc,0x2e0,0x2e4,0x2fc,0x300,0x304,0x308,0x30c,0x310,0x1c,0x20,0x24,0x28,0x2c,0x30,0x34,0x38,0x3c,0x44,0x48,0x50,0x54,0x58,0x5c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xc8,0xcc,0xd0,0xd4,0x314,0x318,0x31c,0x320,0x368,0x36c,0x3c0,0x488,0x48c,0x490,0x1008,0x100c,0x1010]);
export function typedObject(s,characterFields){
    const ownerField=at=>characterFields.has(at)?characterFields.get(at):commonFields.has(at)?'owner.'+commonFields.get(at):(()=>{throw Error('Unreviewed owner field '+at.toString(16));})();
    const field=(at,who)=>who==='owner'?ownerField(at):who==='other'?(commonFields.has(at)?'other.'+commonFields.get(at):(()=>{throw Error('Unreviewed opponent field '+at.toString(16));})()):objectFields.has(at)?objectFields.get(at):(()=>{throw Error('Unreviewed object field '+at.toString(16));})();
    const accessor=(type,o,rest,who)=>{const at=parseInt(o),name=field(at,who);if(/^\s*=(?!=)/.test(rest))return name;if(type==='float'||type==='undefined4'&&floatOffsets.has(at))return 'double('+name+')';if(type==='char')return 'i8('+name+')';if(type==='byte'||type==='undefined1')return 'u8('+name+')';if(type==='short')return 'i16('+name+')';return name;};
    s=s.replace(/\b[0-9]+\.[0-9]+\b/g,v=>'double('+v+'f)');
    const opponent=/\*\(([^)]+) \*\)\(\*\(int \*\)\(\*\(int \*\)\(param_1 \+ 0xe4\) \+ 0x2e8\) \+\s*(0x[0-9a-f]+|[0-9]+)\s*\)/g;
    const owner=/\*\(([^)]+) \*\)\(\*\(int \*\)\(param_1 \+ 0xe4\) \+\s*(0x[0-9a-f]+|[0-9]+)\s*\)/g;
    const own=/\*\(([^)]+) \*\)\(param_1 \+ (0x[0-9a-f]+|[0-9]+)\s*\)/g;
    for(const [pattern,who]of [[opponent,'other'],[owner,'owner'],[own,'p']]){
        const stores=new RegExp(pattern.source+'\\s*=\\s*(0x[0-9a-f]+|0);','g');
        s=s.replace(stores,(all,t,o,b)=>t==='undefined4'&&floatOffsets.has(parseInt(o))?field(parseInt(o),who)+' = '+floatBits(b)+';':all);
        if(who==='p'){
            s=s.replace(/\*\((?:undefined1|char|byte) \*\)\(param_1 \+ (0x11|0x12|0x13|0x14)\)\s*=(?!=)\s*([^;]+);/g,(_,o,v)=>'channel('+((0x14-parseInt(o))*8)+',u8('+v+'));');
            s=s.replace(/\*\((undefined1|char|byte) \*\)\(param_1 \+ (0x11|0x12|0x13|0x14)\)/g,(_,t,o)=>(t==='char'?'i8':'u8')+'(channel('+((0x14-parseInt(o))*8)+'))');
        }
        s=s.replace(pattern,(all,t,o,at)=>accessor(t,o,s.slice(at+all.length),who));
    }
    s=s.replace(/\bfloat10\b/g,'double').replace(/\bchar\b/g,'i8').replace(/\bbyte\b/g,'u8').replace(/\bshort\b/g,'i16').replace(/\buint\b/g,'u32').replace(/\bundefined1\b/g,'u8').replace(/\bundefined2\b/g,'u16').replace(/\bundefined4\b/g,'u32');
    return s;
}
