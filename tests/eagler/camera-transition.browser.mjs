import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createReadStream,existsSync} from 'node:fs';import {resolve,extname} from 'node:path';
import puppeteer from '../../../eagler-touhou/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';import {findChromiumExecutable} from '../../../eagler-touhou/lib/chromium-executable.mjs';
const root=resolve(import.meta.dirname,'../../'),out=resolve(root,'th075_web/artifacts/sdl3'),assets=resolve(root,'th075_web/assets');
test('Story → title → Practice resets cinematic camera and matches a fresh Practice session',{timeout:180000},async()=>{
 const catalog=JSON.parse(await readFile(resolve(assets,'resources/catalog.json'),'utf8'));
 const files=[...catalog.files.map(f=>'resources/'+f.edition+'/'+f.path+'.z'),'fonts/original-glyphs.bin','music/catalog.bin'];
 const html=`<canvas id="canvas" width="640" height="480"></canvas><script type="module">import create from '/th075-harness.mjs';window.game=await create({canvas:document.querySelector('#canvas'),assetBase:'/assets',resourceFiles:new Set(${JSON.stringify(files)})});game._th075_music_enabled(0);window.ready=await game.ccall('th075_initialize','number',['number'],[1],{async:true});</script>`;
 const server=createServer((req,res)=>{const path=new URL(req.url,'http://test').pathname;if(path==='/'){res.setHeader('content-type','text/html');res.end(html);return;}const base=path.startsWith('/assets/')?assets:out,p=resolve(base,path.startsWith('/assets/')?path.slice(8):path.slice(1));if(!p.startsWith(base)||!existsSync(p)){res.writeHead(404).end();return;}res.setHeader('content-type',extname(p)==='.mjs'?'text/javascript':extname(p)==='.wasm'?'application/wasm':'application/octet-stream');createReadStream(p).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{browser=await puppeteer.launch({executablePath:await findChromiumExecutable(),headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready===1,{timeout:90000});
 const camera=()=>page.evaluate(()=>Array.from(new Float32Array(game.HEAPU8.buffer,game._th075_probe_camera(),8)));
 let timestamp=0;async function tick(n){await page.evaluate(async({n,time})=>{for(let i=0;i<n;i++)if(!await game.ccall('th075_tick','number',['number'],[time+i*1000/60],{async:true}))throw Error(game.UTF8ToString(game._th075_error()));},{n,time:timestamp});timestamp+=n*1000/60;}
 async function battle(mode){assert.equal(await page.evaluate(mode=>game.ccall('th075_probe_battle','number',['number','number','number','number'],[mode,0,1,0],{async:true}),mode),1);let loaded=false;for(let n=0;n<240;n++){await tick(1);const scene=await page.evaluate(()=>game._th075_scene());if(scene===1)loaded=true;if(scene===0&&loaded)return;}throw Error('Battle not entered');}
 await battle(5);await tick(240);const fresh=await camera();assert.equal(fresh[2],0);assert.equal(fresh[4],300);
 await battle(3);const story=await camera();assert.equal(story[2],1,'Story setup must still use cinematic framing');
 await page.evaluate(()=>game.ccall('th075_return_title','number',[],[],{async:true}));for(let n=0;n<120;n++){await tick(1);if(await page.evaluate(()=>game._th075_scene()===2))break;}
 const title=await camera();assert.equal(title[0],0,'Title must not retain the Story camera lock');
 await battle(5);await tick(240);const practice=await camera();assert.equal(practice[2],0);assert.deepEqual(practice.slice(2),fresh.slice(2));
 await page.screenshot({path:resolve(out,'practice-camera.png')});await mkdir(resolve(root,'artifacts/eagler'),{recursive:true});await writeFile(resolve(root,'artifacts/eagler/camera-regression.json'),JSON.stringify({fresh,story,title,practice,pass:true},null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
