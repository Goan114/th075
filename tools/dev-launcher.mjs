import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),launcher=resolve(process.env.EAGLER_LAUNCHER_ROOT||resolve(root,'../eagler-touhou'));
const content=resolve(process.env.EAGLER_TH075_CONTENT_DIR||resolve(root,'../th075/assets-ogg'));
if(!existsSync(resolve(root,'build-eagler-multiplayer/runtime-files.json'))||!existsSync(resolve(content,'th075.data')))throw Error('Build/package the Runtime and prepare content first');
const run=(file,args=[],env=process.env)=>new Promise((yes,no)=>{const child=spawn(process.execPath,[resolve(launcher,file),...args],{cwd:launcher,env,stdio:'inherit',windowsHide:true});child.on('error',no);child.on('exit',code=>code===0?yes():no(Error(file+' failed: '+code)));});
await run('scripts/build-launcher.mjs');
const relayUrl=process.env.EAGLER_TOUHOU_NETPLAY_RELAY||`ws://127.0.0.1:${process.env.EAGLER_NETPLAY_RELAY_PORT||18142}/`;
const relay=process.env.EAGLER_TOUHOU_NETPLAY_RELAY?null:spawn(process.execPath,[resolve(launcher,'server/netplay-relay.mjs')],{cwd:launcher,env:{...process.env,EAGLER_NETPLAY_RELAY_HOST:'127.0.0.1'},stdio:'inherit',windowsHide:true});
try{await run('scripts/serve.mjs',[process.env.EAGLER_TH075_PORT||'18175'],{...process.env,EAGLER_DEVELOPMENT_GAMES:'th075',EAGLER_TH075_CONTENT_DIR:content,EAGLER_TOUHOU_NETPLAY_RELAY:relayUrl});}finally{relay?.kill();}
