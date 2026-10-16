import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=resolve(import.meta.dirname,'../../..'),launcher=resolve(process.env.EAGLER_LAUNCHER_ROOT||resolve(root,'../eagler-touhou'));
const require=createRequire(resolve(launcher,'package.json'));
const {default:puppeteer}=await import(pathToFileURL(require.resolve('puppeteer-core')));
const {findChromiumExecutable}=await import(pathToFileURL(resolve(launcher,'lib/chromium-executable.mjs')));
import {writeFile,mkdir} from 'node:fs/promises';
const output=resolve(process.env.EAGLER_TH075_PERF_OUTPUT||resolve(root,'th075_web/artifacts/rollback-performance'));await mkdir(output,{recursive:true});
const rollback=true;
const outputFile=name=>resolve(output,name),finishOnly=process.argv.includes('--finish-only'),disconnect=process.argv.includes('--disconnect'),spectatorFailure=process.argv.includes('--spectator-failure'),target=finishOnly||disconnect||spectatorFailure?400:1800;
const base=process.env.EAGLER_TH075_MP_TEST_RELAY||'ws://127.0.0.1:18376/',room='th075mp-'+String(1000+Math.floor(Math.random()*9000)),sockets=[];
const clients=[0,1,2].map(i=>'mp_test_'+room+'_'+i),members=clients.map(id=>'member_'+id);
function next(socket,predicate=()=>true){return new Promise((resolve,reject)=>{
 const cleanup=()=>{clearTimeout(timer);socket.removeEventListener('message',message);socket.removeEventListener('close',closed);socket.removeEventListener('error',closed);};
 const closed=()=>{cleanup();reject(Error('Lobby connection ended: '+socket.url));};
 const message=event=>{const m=JSON.parse(event.data);if(m.type==='error'){cleanup();reject(Error(m.error));}else if(predicate(m)){cleanup();resolve(m);}};
 const timer=setTimeout(()=>{cleanup();reject(Error('Lobby timeout: '+socket.url));},10000);
 socket.addEventListener('message',message);socket.addEventListener('close',closed);socket.addEventListener('error',closed);
});}

async function send(s,m,p){const wait=next(s,p);s.send(JSON.stringify(m));return wait;}
let browser;
try{
 for(let i=0;i<3;i++){const s=new WebSocket(base+'?room='+room+'&lobby='+clients[i]+'&member='+members[i]+(i===0?'&intent=create':''));sockets.push(s);await next(s,m=>m.type==='state');if(i<2)await send(s,{type:'take-seat',seat:i,loadout:i===0?0:18},m=>m.room?.seats[i]?.clientId===clients[i]);else await send(s,{type:'spectate'},m=>m.type==='state');}
 for(const s of sockets.slice(0,2))await send(s,{type:'set-ready',ready:true},m=>m.type==='state');
 const start=await send(sockets[0],{type:'start',adonisMode:rollback?0:1,predictionLimit:rollback?8:undefined,inputDelay:rollback?0:2,inputDelayAuto:false},m=>m.type==='start');console.log('room started',start.serial,start.room.seed);
 browser=await puppeteer.launch({executablePath:await findChromiumExecutable(),headless:true,args:[...(process.env.EAGLER_TH075_PERF_GPU==='hardware'?['--use-angle=d3d11']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']),'--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const pages=await Promise.all([0,1].map(async i=>{const c=await browser.createBrowserContext(),p=await c.newPage();if(process.argv.includes('--relay'))await p.evaluateOnNewDocument(()=>{globalThis.RTCPeerConnection=undefined;});p.on('console',m=>{if(m.type()==='error')console.log('browser',i,m.text());});p.on('pageerror',e=>console.log('pageerror',i,e.message));await p.goto(process.env.EAGLER_TH075_MP_TEST_URL||'http://127.0.0.1:18375/');await p.waitForFunction(()=>host.events.some(e=>e.event==='ready')||host.error(),{timeout:120000});return p;}));
 await Promise.all(pages.map((p,i)=>p.evaluate(async({i,run,seed,room,relay,client,member,rollback})=>{if(host.error())throw Error(JSON.stringify(host.error()));await host.request('configure',{language:'ja',music:'none',options:{netplayMode:'lan',netplayUrl:`${relay}?room=${room}&run=${run}&${i===2?'spectator='+client:'player='+i}&players=2&member=${member}`,netplaySpectator:i===2,netplaySpectatorId:i===2?client:'',netplaySpectatorCount:1,netplayPlayer:i===2?null:i,netplayPlayerCount:2,netplaySeed:seed,netplayDifficulty:1,netplayAdonisMode:rollback?0:1,netplayPredictionLimit:rollback?8:0,netplayInputDelay:rollback?0:2,netplayInputDelayAuto:false,netplayLoadouts:[{character:0,shot:0},{character:2,shot:0}],netplayIceServers:[],multiplayerLocalPlayerVisibility:true}});await host.request('launch');},{i,run:start.serial,seed:1947,room,relay:base,client:clients[i],member:members[i],rollback})));

 const latency=Number(process.env.EAGLER_TH075_PERF_LATENCY||80);
 await Promise.all(pages.map((p,i)=>p.evaluate(({latency,i})=>{
  const w=document.querySelector('iframe').contentWindow,t=w.__eaglerPeerTransport,receive=t.receiveBinary.bind(t);
  t.receiveBinary=function(data){const b=(data instanceof ArrayBuffer||data instanceof w.ArrayBuffer)?new Uint8Array(data):ArrayBuffer.isView(data)?new Uint8Array(data.buffer,data.byteOffset,data.byteLength):null;
   if(b&&b[4]===4&&b[5]===1)setTimeout(()=>receive(data),latency);else receive(data);};
  host.cpu=[];const nativeTick=w.Module._th075_tick;w.Module._th075_tick=function(...args){const before=performance.now();try{return nativeTick.apply(this,args);}finally{host.cpu.push(performance.now()-before);}};
  host.perf=[];host.confirmed=new Map();let started=0,lastTime=0,lastFrame=0,maxFreeze=0;
  const loop=()=>{const s=host.state(),now=performance.now();if(s&&s[1]===3){
   if(!started){started=now;lastTime=now;lastFrame=s[2];}
   if(s[2]!==lastFrame){maxFreeze=Math.max(maxFreeze,now-lastTime);lastFrame=s[2];lastTime=now;}
   if(s[53]!==0xffffffff)host.confirmed.set(s[53],s[54]);
   const f=s[2];
   // Sustained direction + held attacks must predict unchanged, rather than
   // manufacturing button-up edges after two missing remote frames.
   const keys=[i?203:205,44,45,46,47];
   for(let n=0;n<keys.length;n++)w.Module._th075_key(keys[n],n===0||Math.floor(f/45)%4===n-1?1:0);
   host.perf.push([now-started,s[2],s[9],s[48],s[49],s[50],s[53],s[54]]);
   host.maxFreeze=maxFreeze;
  }requestAnimationFrame(loop);};requestAnimationFrame(loop);
 },{latency,i})));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>host.perf?.at(-1)?.[0]>20000||host.error(),{timeout:60000})));
 const result=await Promise.all(pages.map(p=>p.evaluate(()=>({samples:host.perf,cpu:host.cpu,state:host.state(),error:host.error(),maxFreeze:host.maxFreeze,confirmed:[...host.confirmed]}))));
 const summary=result.map(r=>{assert.equal(r.error,null);const active=r.samples.filter(s=>s[2]===1),a=active[0],b=active.at(-1);const cpu=r.cpu.slice().sort((a,b)=>a-b);return {cpuP95:cpu[Math.floor(cpu.length*.95)],cpuMax:cpu.at(-1),introMs:a?.[0],frames:r.state[2],fps:a&&b&&b[0]>a[0]?(b[1]-a[1])*1000/(b[0]-a[0]):null,maxFreeze:r.maxFreeze,rollbacks:r.state[48],resimulated:r.state[49],maxPending:Math.max(...r.samples.map(s=>s[5]))};});
 const maps=result.map(r=>new Map(r.confirmed));let compared=0;for(const [f,h] of maps[0])if(maps[1].has(f)){assert.equal(maps[1].get(f),h,'confirmed hash '+f);compared++;}
 await writeFile(outputFile('performance.json'),JSON.stringify({latency,summary,compared,result},null,2));console.log(JSON.stringify({latency,summary,compared},null,2));
 if(process.argv.includes('--accept')){assert.ok(compared>=5);for(const r of summary){assert.ok(r.introMs<4500,'opening stalled at network speed');assert.ok(r.fps>=55,'rollback cannot sustain near 60Hz');assert.ok(r.maxFreeze<300,'unbounded rendering stall');assert.ok(r.maxPending>=4,'latency did not exercise the prediction window');}}
}finally{for(const s of sockets)s.close();await browser?.close();}
