// Offline recovery of reviewed fields. Browser code never reads native addresses.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export const source=id=>readFileSync(root+'artifacts/cpp/analysis/jp/functions/'+id+'.c','utf8').replaceAll('\r','');
const fixture=readFileSync(root+'tests/cpp/core-exports.cpp','utf8');
const section=fixture.slice(fixture.indexOf('static void actor_fixture_fields'),fixture.indexOf('API(actor_load)'));
export const commonFields=new Map([...section.matchAll(/(?:field|flag)\((0x[0-9a-f]+),a\.([^);]+)\)/g)].map(m=>[parseInt(m[1]),m[2]]));
const arrays=[[0x2d8,'combat.screenBounds',4,4],[0x16,'pose.projection',3,2],[0x1c,'pose.scale',3,4],[0x28,'pose.rotation',3,4],[0x34,'pose.offset',3,4],[0x2f6,'effectVisual.projection',3,2],[0x2fc,'effectVisual.scale',3,4],[0x308,'effectVisual.rotation',3,4],[0x314,'launchParameters',4,4],[0x398,'spellChoices',2,2],[0x4e8,'controls.current.buttons',4,4],[0x512,'commandTimers',3,2],[0x4f8,'controls.buffered',0,4]];
for(const [at,name,count,stride]of arrays)for(let i=0;i<count;i++)commonFields.set(at+i*stride,name+'['+i+']');
for(let i=0;i<4;i++)commonFields.set(0x11+i,'pose.channel('+((3-i)*8)+')');
commonFields.set(0x4f8,'controls.buffered.horizontal');commonFields.set(0x4fc,'controls.buffered.vertical');for(let i=0;i<4;i++)commonFields.set(0x500+i*4,'controls.buffered.buttons['+i+']');
const floats=new Set([0x1c,0x20,0x24,0x28,0x2c,0x30,0x34,0x38,0x3c,0x44,0x48,0x50,0x54,0x58,0x5c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0x2fc,0x300,0x304,0x308,0x30c,0x310,0x314,0x318,0x31c,0x320,0x368,0x36c,0x3c0,0x488,0x48c,0x490]);
export function body(id){const s=source(id);return s.slice(s.indexOf('{')+1,s.lastIndexOf('}')).replace(/(0x[0-9a-f]+)\s+\)/g,'$1)').replace(/param_1\s*\+\s*(0x[0-9a-f]+|[0-9]+)/g,'param_1 + $1').replace(/\)\s*\+\s*(0x[0-9a-f]+|[0-9]+)/g,') + $1');}
export function floatBits(v){const b=Buffer.alloc(4);b.writeUInt32LE(parseInt(v));return b.readFloatLE().toString()+(Number.isInteger(b.readFloatLE())?'.0f':'f');}
export function typed(s,extra=new Map()){
 const field=(o,owner='a')=>extra.has(o)&&owner==='a'?extra.get(o):commonFields.has(o)?owner+'.'+commonFields.get(o):(()=>{throw Error('Unreviewed '+owner+' field 0x'+o.toString(16));})();
 const access=(type,offset,following,owner='a')=>{const at=parseInt(offset),v=field(at,owner);if(/^\s*=(?!=)/.test(following))return v;if(type==='float'||floats.has(at)&&type==='undefined4')return 'double('+v+')';if(type==='char')return 'i8('+v+')';if(type==='byte'||type==='undefined1')return 'u8('+v+')';if(type==='short')return 'i16('+v+')';return v;};
 s=s.replace(/param_1\[(0x11|0x12|0x13|0x14)\]\s*=(?!=)\s*([^;]+);/g,(_,o,v)=>'a.pose.set_channel('+((0x14-parseInt(o))*8)+',u8('+v+'));');
 s=s.replace(/\*\((?:undefined1|char|byte) \*\)\(param_1 \+ (0x11|0x12|0x13|0x14)\)\s*=(?!=)\s*([^;]+);/g,(_,o,v)=>'a.pose.set_channel('+((0x14-parseInt(o))*8)+',u8('+v+'));');
 s=s.replace(/\b[0-9]+\.[0-9]+\b/g,v=>'double('+v+'f)');
 s=s.replace(/\*\(undefined4 \*\)\(param_1 \+ (0x[0-9a-f]+|[0-9]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(all,o,b)=>floats.has(parseInt(o))?field(parseInt(o))+' = '+floatBits(b)+';':all);
 s=s.replace(/\*\(undefined4 \*\)\(\*\(int \*\)\(param_1 \+ 0x2e8\) \+\s*(0x[0-9a-f]+|[0-9]+)\)\s*=\s*(0x[0-9a-f]+|0);/g,(all,o,b)=>floats.has(parseInt(o))?field(parseInt(o),'other')+' = '+floatBits(b)+';':all);
 s=s.replace(/\*\(([^)]+) \*\)\(\*\(int \*\)\(param_1 \+ 0x2e8\) \+\s*(0x[0-9a-f]+|[0-9]+)\)/g,(all,t,o,at)=>access(t,o,s.slice(at+all.length),'other'));
 s=s.replace(/\*\(([^)]+) \*\)\(param_1 \+ (0x[0-9a-f]+|[0-9]+)\)/g,(all,t,o,at)=>access(t,o,s.slice(at+all.length)));
 s=s.replace(/param_1\[(0x[0-9a-f]+|[0-9]+)\]/g,(all,o,at)=>/^\s*=(?!=)/.test(s.slice(at+all.length))?field(parseInt(o)):'u8('+field(parseInt(o))+')');
 s=s.replace(/\bfloat10\b/g,'double').replace(/\bchar\b/g,'i8').replace(/\bbyte\b/g,'u8').replace(/\bshort\b/g,'i16').replace(/\buint\b/g,'u32').replace(/\bundefined1\b/g,'u8').replace(/\bundefined2\b/g,'u16').replace(/\bundefined4\b/g,'u32').replace(/\(ContextBase\)/g,'(u8)');
 return s;
}
export function assertReviewed(s){if(/FUN_|param_[0-9]|undefined|DAT_|extraout|CONCAT|ContextBase|code \*/.test(s))throw Error('Unreviewed recovery expression: '+s.split('\n').filter(l=>/FUN_|param_|undefined|DAT_|extraout|CONCAT|ContextBase|code \*/.test(l)).join('\n'));}
