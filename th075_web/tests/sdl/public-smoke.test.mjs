import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {launchBrowser} from '../../../th10_web/scripts/native/browser-launch.mjs';
import {root} from '../cpp/helpers.mjs';
import {releaseServer} from '../../artifacts/sdl3/scripts/serve.mjs';
import {startLauncherPage,runtimeFrame,rpc} from './launcher-fixture.mjs';
test('production HTTPS/origin first installation reaches an actual battle',{timeout:1200000},async()=>{
 let server,browser,page;const errors=[],failedRequests=[],httpErrors=[],progress=[];let passed=false;
 const label=process.env.TH075_BROWSER_URL?'public':'origin';const language=process.env.TH075_GAME_LANGUAGE||'ja';
 const file=name=>resolve(root,'artifacts/browser/'+label+'-'+name);
 try {
  if(!process.env.TH075_BROWSER_URL)server=await releaseServer({port:0});
  const url=process.env.TH075_BROWSER_URL||server.url;
  browser=await launchBrowser();page=await startLauncherPage(browser,{viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
  page.on('requestfailed',r=>failedRequests.push({path:new URL(r.url()).pathname,error:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)httpErrors.push({path:new URL(r.url()).pathname,status:r.status()});});
  await page.addInitScript(()=>{window.runtimeEvents=[];window.addEventListener('message',e=>{if(e.data?.protocol==='eagler-touhou/1'&&e.data.game==='th075'&&e.data.event)runtimeEvents.push(e.data);});localStorage.setItem('eagler-touhou-game-options-v1-th075',JSON.stringify({music:'midi',musicPreferenceExplicit:true,options:{touchEnabled:true,touchMovementMode:'joystick',touchFocusMode:'hold-button',renderScale:2}}));});
  await page.goto(url);await page.locator('#changelogConfirm').click();await page.locator('button[data-game="th075"]').click();if(language!=='ja')await page.locator('#languageSelect').selectOption(language,{force:true});await page.locator('#launch').click();
  let first=false;
  for(let i=0;i<36&&!first;i++){
   try{await page.waitForFunction(()=>runtimeEvents.some(e=>e.event==='first-frame'),null,{timeout:30000});first=true;}
   catch(e){if(e.name!=='TimeoutError')throw e;}
   const snapshot=await page.evaluate(()=>({text:document.body.innerText.slice(-3000),events:runtimeEvents.slice(-6),frames:[...document.querySelectorAll('iframe')].map(f=>f.src)}));
   progress.push(snapshot);console.log('PROGRESS',JSON.stringify({attempt:i+1,...snapshot,errors,httpErrors,failedRequests}));
   await page.screenshot({path:file('smoke-progress.png')});
   if(!first&&/(?:安装失败|下载失败|启动失败|加载失败|游戏错误)/.test(snapshot.text))throw Error('Launcher reported failed startup');
  }
  assert.ok(first,'production first-frame not reached');
  if(await page.locator('#touchHelpClose').isVisible())await page.locator('#touchHelpClose').click();
  const runtime=runtimeFrame(page);assert.ok(runtime);assert.equal(await runtime.evaluate(()=>Module.gameLanguage),language);
  const wait=async n=>{const f=await runtime.evaluate(()=>Module._th075_frame());await runtime.waitForFunction(v=>Module._th075_frame()>=v,f+n,{timeout:30000});};
  const key=async code=>{await rpc(page,'keyboard',{code,down:true});await wait(3);await rpc(page,'keyboard',{code,down:false});await wait(3);};
  for(let i=0;i<6;i++){if(await runtime.evaluate(()=>Module._th075_scene())===2)break;await key('KeyZ');await wait(35);}
  await runtime.waitForFunction(()=>Module._th075_scene()===2);for(let i=0;i<4;i++)await key('ArrowDown');await key('KeyZ');
  await runtime.waitForFunction(()=>Module._th075_scene()===3);await wait(40);for(let i=0;i<8;i++){if(await runtime.evaluate(()=>Module._th075_scene())!==3)break;await key('KeyZ');await wait(15);}
  await runtime.waitForFunction(()=>Module._th075_scene()===0);await wait(120);
  assert.equal(await runtime.evaluate(()=>Module.UTF8ToString(Module._th075_error())),'');assert.equal(await runtime.evaluate(()=>typeof Module._th075_probe_state),'undefined');
  await page.screenshot({path:file('smoke-battle.png')});await key('Escape');await wait(30);assert.equal(await runtime.evaluate(()=>Module._th075_phase()),2);assert.deepEqual(await runtime.evaluate(()=>[Module.canvas.width,Module.canvas.height]),[1280,960]);assert.equal(await runtime.locator('canvas').evaluate(c=>getComputedStyle(c).imageRendering),'pixelated');await page.screenshot({path:file('smoke-pause.png')});await key('Escape');await wait(35);assert.equal(await runtime.evaluate(()=>Module._th075_phase()),1);assert.deepEqual(errors,[]);passed=true;
  await rpc(page,'exit');
 }finally{
  const text=page&&!page.isClosed()?await page.evaluate(()=>document.body.innerText.slice(-5000)).catch(()=>null):null;
  writeFileSync(file('smoke.json'),JSON.stringify({passed,language,url:process.env.TH075_BROWSER_URL||server?.url,errors,httpErrors,failedRequests,progress,text,scope:'actual production HTTP/HTTPS origin with server CSP and isolation headers; first installation, title, selection, training battle, actual Escape pause/resume and pixelated 1280x960 canvas in mobile viewport; phone hardware not measured'},null,2));
  await browser?.close();if(server)await new Promise(r=>server.server.close(r));
 }
});
