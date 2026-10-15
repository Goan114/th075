import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';import {resolve} from 'node:path';
import {createHash} from 'node:crypto';import {WASI} from 'node:wasi';
import {NativeMachine} from '../../scripts/native/machine.mjs';
export const root=fileURLToPath(new URL('../../',import.meta.url));
export const target=JSON.parse(readFileSync(resolve(root,'target.json'),'utf8').replace(/^\uFEFF/,''));
export const sha=b=>createHash('sha256').update(b).digest('hex');
let executedCoreSha;export async function core(){const bytes=readFileSync(resolve(root,"artifacts/cpp/game-core-test.wasm"));executedCoreSha=sha(bytes);const wasi=new WASI({version:'preview1',args:[],env:{},preopens:{}});const {instance}=await WebAssembly.instantiate(bytes,{wasi_snapshot_preview1:wasi.wasiImport});wasi.initialize(instance);return instance.exports;}
export const memory=(c,p,n)=>new Uint8Array(c.memory.buffer,p,n);
export function string(c,p){const b=memory(c,p,Math.min(2048,c.memory.buffer.byteLength-p)),n=b.indexOf(0);return Buffer.from(b.subarray(0,n<0?b.length:n)).toString();}
export async function oracle(options={}){
    const bytes=readFileSync(resolve(root,target.executable));if(sha(bytes)!==target.sha256)throw Error('TH075 original identity mismatch');
    const m=await NativeMachine.create(bytes,{...options,wasmBinary:readFileSync(resolve(root,'reference/native/unicorn-bounded.wasm'))});m.resetThreadFPU();
    for(const address of [0x64159d,0x6416a2])m.replace(address,'oracle allocation',()=>m.allocate(m.u32(m.reg('ESP')+4)));
    for(const address of [0x642a61,0x64169d])m.replace(address,'oracle deallocation',()=>0);
    m.replace(0x640f20,'oracle memcpy',()=>{const sp=m.reg('ESP'),out=m.u32(sp+4),source=m.u32(sp+8),n=m.u32(sp+12);m.write(out,m.bytes(source,n));return out;});
    m.replace(0x640611,'original cookie success',()=>m.reg('EAX'));
    m.onImport=e=>{if(e.handler)m.ret(e.handler(),e.argc??0);else throw Error('Unimplemented original import '+e.dll+'!'+e.name);};return m;
}
export function report(name,details){const dir=resolve(root,'artifacts/cpp/verification');mkdirSync(dir,{recursive:true});writeFileSync(resolve(dir,name+'.json'),JSON.stringify({target,coreSha256:executedCoreSha??sha(readFileSync(resolve(root,'artifacts/cpp/game-core-test.wasm'))),...details},null,2)+'\n');}


