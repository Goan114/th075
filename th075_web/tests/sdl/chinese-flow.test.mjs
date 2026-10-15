import test from'node:test';import assert from'node:assert/strict';import{readFileSync,writeFileSync}from'node:fs';import{resolve}from'node:path';import{harness,images}from'./harness.mjs';
for(const language of ['ja','lang_zh-hant'])test('real menu, story dialogue, portraits and pause with '+language,{timeout:600000},async()=>harness(async({page,tick,state,errors,requests})=>{
 await page.setViewportSize({width:1280,height:960});const records=[];
 const probe=async(mode,first,other)=>{assert.equal(await page.evaluate(v=>game.ccall('th075_probe_battle','number',['number','number','number','number'],v,{async:true}),[mode,first,other,0]),1);};
 const key=async(scan,down)=>page.evaluate(({scan,down})=>game._th075_key(scan,+down),{scan,down});
 const until=async(fn,label,n=4000)=>{for(let i=0;i<n;i+=5){if(fn(await state()))return;await tick(5);}throw Error(label+' '+JSON.stringify(await state()));};
 for(const scene of [2,3,9,12,14]){assert.equal(await page.evaluate(scene=>game.ccall('th075_probe_scene','number',['number'],[scene],{async:true}),scene),1);await tick(30);assert.equal((await state())[0],scene);await page.locator('canvas').screenshot({path:resolve(images,'language-'+language+'-scene-'+scene+'.png')});records.push({scene});}
 for(let first=0;first<10;first++){
  await probe(3,first,(first+1)%10);await until(s=>s[0]===0,'story entry');await tick(40);await until(s=>s[19]===0,'first story dialogue');await tick(30);await page.locator('canvas').screenshot({path:resolve(images,'language-'+language+'-story-'+first+'.png')});records.push({character:first,phase:(await state())[2]});
  await key(0x1d,true);await until(s=>s[0]===0&&s[2]===1,'story begins');await key(0x1d,false);await tick(30);
  await key(1,true);await tick(3);await key(1,false);await tick(25);assert.equal((await state())[42],1);if(first===0)await page.locator('canvas').screenshot({path:resolve(images,'language-'+language+'-pause.png')});
 }
 // Actual hosted keyboard and touch both keep commands blocked throughout KO.
 for(const mode of [1,3])for(const touch of [false,true]){
  await page.evaluate(()=>game._th075_keys_clear());await probe(mode,0,1);await key(0x1d,true);await until(s=>s[0]===0&&s[2]===1,'active');await key(0x1d,false);await tick(30);
  assert.equal(await page.evaluate(()=>game._th075_probe_knockout(0,2)),1);
  if(touch)await page.evaluate(()=>{game._th075_touch_controls(1,1,1,1,1,0);game._th075_touch_stick(32767,0);});else for(const scan of[0xcd,0x2c,0x2d,0x2e,0x2f])await key(scan,true);
  let moved=false;for(let i=0;i<650;i++){const s=await state();if(s[2]===1)break;if([2,10].includes(s[2]))assert.equal(s[18],0,'KO blocks movement and attack');if([4,9].includes(s[2])){assert.equal(s[18]&0x70,0,'recovery blocks A/B/C');if(s[10]!==480000)moved=true;}await tick();}assert.equal((await state())[2],1);assert.ok(moved,'original permits positioning after getting up');await page.evaluate(()=>game._th075_keys_clear());records.push({mode,touch,knockdownPassed:true});
 }
 assert.deepEqual(errors,[]);if(language!=='ja'){assert.ok(requests.some(x=>x.endsWith('chinese-glyphs.bin')));assert.ok(requests.some(x=>x.includes('/resources/chinese/')&&x.endsWith('.sce.z')));}
 writeFileSync(resolve(images,'language-'+language+'-flow.json'),JSON.stringify({passed:true,language,records,requests,scope:'actual SDL3 browser menu/text/portrait and paused battle composition; keyboard and hosted touch in versus/story KO recovery. Desktop Chromium simulates touch, no physical phone FPS claim.'},null,2));
},{scale:2,language}));
