import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),launcher=resolve(process.env.EAGLER_LAUNCHER_ROOT||resolve(root,'../eagler-touhou'));
if(!existsSync(resolve(root,'build-eagler/runtime-files.json'))||!existsSync(resolve(root,'assets-ogg/th075.data')))throw Error('Build/package the Runtime and prepare content first');
const run=(file,args=[],env=process.env)=>new Promise((yes,no)=>{const child=spawn(process.execPath,[resolve(launcher,file),...args],{cwd:launcher,env,stdio:'inherit',windowsHide:true});child.on('error',no);child.on('exit',code=>code===0?yes():no(Error(file+' failed: '+code)));});
await run('scripts/build-launcher.mjs');
await run('scripts/serve.mjs',[process.env.EAGLER_TH075_PORT||'18175'],{...process.env,EAGLER_DEVELOPMENT_GAMES:'th075'});
