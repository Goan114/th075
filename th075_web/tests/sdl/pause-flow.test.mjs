import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {harness,images} from './harness.mjs';

for(const scale of [1,2])test('actual pauses across battle modes and all portraits at render scale '+scale,{timeout:600000},async()=>harness(async({page,tick,state,errors})=>{
 await page.setViewportSize({width:640*scale,height:480*scale});
 const records=[];
 const until=async(fn,label,max=4000)=>{for(let i=0;i<max;i+=5){const s=await state();if(fn(s))return s;await tick(5);}throw Error(label+' '+JSON.stringify(await state()));};
 const key=async(scan,on)=>page.evaluate(({scan,on})=>game._th075_key(scan,+on),{scan,on});
 const press=async scan=>{await key(scan,true);await tick(scan===1?3:1);await key(scan,false);await tick(2);};
 const load=async(mode,first=0,other=1,bg=0)=>{
  await page.evaluate(()=>game._th075_keys_clear());
  assert.equal(await page.evaluate(v=>game.ccall('th075_probe_battle','number',['number','number','number','number'],v,{async:true}),[mode,first,other,bg]),1);
  await key(0x1d,true);await until(s=>s[0]===0&&s[2]===1,'battle active');await key(0x1d,false);await tick(45);
 };
 const freeze=s=>[s[9],...s.slice(10,15),...s.slice(26,31)];
 const pause=async(label,training=false)=>{
  await press(1);const paused=await until(s=>s[42]===1&&s[43]>50,'pause fade');
  await tick(20);assert.deepEqual(freeze(await state()),freeze(paused),'paused combat freezes '+label);
  const canvas=await page.locator('canvas').evaluate(c=>({width:c.width,height:c.height}));assert.deepEqual(canvas,{width:640*scale,height:480*scale});assert.equal((await state())[47],scale);
  await page.locator('canvas').screenshot({path:resolve(images,'pause-'+scale+'-'+label+'.png')});
  await press(0xd0);assert.equal((await state())[44],1,'pause selection');await press(0xc8);assert.equal((await state())[44],0);
  if(training){await press(0xcd);await press(0x2d);}else await press(0x2c);
  await until(s=>!s[42]&&!s[43],'resume fade');records.push({label,canvas,pauseFade:paused[43],state:(await state()).slice(42)});
 };
 for(const mode of [1,2,3,4,5]){await load(mode);await pause('mode-'+mode,mode===5);}
 // Every character has its own last portrait. Never alias these to battle.dat.
 for(let first=0;first<11;first++){await load(5,first,(first+1)%11,first%6);await pause('character-'+first,true);}
 // Original imported replay, with the reduced two-item menu and no player portraits.
 const file=resolve('[th075] 东方萃梦想 (汉化版+日文版)/replay/20260929150034 xun(Sak) - Player 1(Rei) (237s).rep');
 await page.evaluate(b=>{game._th075_return_title();game.FS.writeFile('/save/replay/pause-original.rep',new Uint8Array(b));},Array.from(readFileSync(file)));
 await page.evaluate(()=>game.ccall('th075_probe_scene','number',['number'],[5],{async:true}));await tick(100);await press(0x2c);await until(s=>s[0]===0&&s[2]===1,'original replay');await pause('original-replay');
 // Story defeat/continue shows the player portrait, then correctly resumes.
 await load(3);await key(0x1d,true);
 for(let i=0;i<3;i++){await until(s=>s[2]===1,'stocked life');assert.equal(await page.evaluate(()=>game._th075_probe_knockout(0)),1);await tick(1);}
 await until(s=>s[2]===12&&s[42]&&s[43]>50,'continue prompt');await key(0x1d,false);await tick(10);
 await page.locator('canvas').screenshot({path:resolve(images,'pause-'+scale+'-continue.png')});await press(0x2c);await until(s=>s[2]===1&&!s[42],'continued');
 await key(0x1d,true);await tick(10);assert.equal(await page.evaluate(()=>game._th075_probe_knockout(1)),1);await until(s=>s[0]===6,'result screen');await key(0x1d,false);await tick(120);
 assert.equal((await state())[45],0,'result restores nearest texture filtering');assert.equal((await state())[46],0);
 await page.locator('canvas').screenshot({path:resolve(images,'pause-'+scale+'-result.png')});
 await page.evaluate(()=>game._th075_return_title());await tick(150);assert.equal((await state())[0],2);assert.equal((await state())[45],0,'title does not inherit result smoothing');
 await page.locator('canvas').screenshot({path:resolve(images,'pause-'+scale+'-return.png')});
 assert.deepEqual(errors,[]);
 writeFileSync(resolve(images,'pause-flow-'+scale+'.json'),JSON.stringify({passed:true,scale,records,continue:true,result:true,originalReplay:true,scope:'actual keyboard Escape, frozen combat, pause selection/resume in five interactive battle modes, all eleven character portrait packs, original imported replay, story defeat/continue/result/return and physical canvas dimensions'},null,2));
},{scale}));
