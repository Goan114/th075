import test from 'node:test';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';import {resolve} from 'node:path';
import {launchBrowser} from '../../../th10_web/scripts/native/browser-launch.mjs';import {root} from '../cpp/helpers.mjs';import {releaseServer} from '../../artifacts/sdl3/scripts/serve.mjs';
test('bounded downloads preserve package ordering, reuse and failed-update atomicity',{timeout:60000},async()=>{
 const server=await releaseServer({port:0});let browser;
 try{browser=await launchBrowser();const page=await browser.newPage();await page.goto(server.url);
 const result=await page.evaluate(async()=>{
  const {installPackageFromAcquisition:install}=await import('/package/package-installer.mjs');
  const {readCurrentPackageGeneration,readPackageObject}=await import('/package/package-store.mjs');
  const ids=['game-data',...Array.from({length:7},(_,i)=>'resource-'+i)];
  const descriptor=revision=>({schema:'eagler-touhou/package/1',game:'th075',revision,files:Object.fromEntries(ids.map((id,i)=>[id,{source:id+'.bin',target:i?'/resources/'+id+'.bin':'/th075.data',bytes:4,revision:revision+'-'+id}])),base:{files:ids},components:{},runtimeRequirement:{protocol:'eagler-touhou/1',target:'th075',dataFile:'game-data',dataLayout:'package-install-test'}});
  let active=0,maximum=0;const started=[],finished=[],progress=[],rejections=[];
  const rejected=e=>{rejections.push(String(e.reason));e.preventDefault();};window.addEventListener('unhandledrejection',rejected);
  let unlock;const first=new Promise(resolve=>unlock=resolve);const expire=setTimeout(()=>unlock(),2000);
  const initial=await install({descriptor:descriptor('first'),desiredFileIds:ids,source:'remote',acquisitionConcurrency:4,acquire:async id=>{
   started.push(id);active++;maximum=Math.max(maximum,active);if(started.length===4)unlock();
   if(id===ids[0]){await first;await new Promise(r=>setTimeout(r,60));}else await new Promise(r=>setTimeout(r,5));
   active--;finished.push(id);return new Uint8Array([ids.indexOf(id),1,2,3]);
  },onProgress:p=>progress.push(p.fileId)});clearTimeout(expire);
  const current=await readCurrentPackageGeneration('th075');let failure=null;
  try{await install({descriptor:descriptor('broken'),desiredFileIds:ids,source:'remote',acquisitionConcurrency:4,acquire:async id=>{
   if(id===ids[2])throw Error('simulated late download failure');
   return id===ids[1]?new Uint8Array([9,9]):new Uint8Array([9,9,9,9]);
  }});}catch(e){failure=String(e);}
  await new Promise(r=>setTimeout(r,30));const afterFailure=await readCurrentPackageGeneration('th075');
  const stored=await readPackageObject(afterFailure.generation.files[ids[0]].objectId);
  const originalBytes=[...new Uint8Array(await stored.blob.arrayBuffer())];let reusedRequests=0;
  await install({descriptor:descriptor('first'),desiredFileIds:ids,source:'remote',acquisitionConcurrency:4,acquire:async()=>{reusedRequests++;throw Error('Installed resource was downloaded again');}});
  window.removeEventListener('unhandledrejection',rejected);
  return {ids,started,finished,progress,maximum,initialRevision:initial.generation.descriptor.revision,failure,rollback:current.generation.id===afterFailure.generation.id,pending:afterFailure.installation.pendingGeneration,originalBytes,reusedRequests,rejections};
 });
 assert.equal(result.maximum,4);assert.deepEqual(result.started,result.ids);assert.notEqual(result.finished[0],result.ids[0]);assert.deepEqual(result.progress,result.ids);
 assert.match(result.failure,/size mismatch/);assert.equal(result.rollback,true);assert.ok(!result.pending);assert.deepEqual(result.originalBytes,[0,1,2,3]);assert.equal(result.reusedRequests,0);assert.deepEqual(result.rejections,[]);
 writeFileSync(resolve(root,'artifacts/browser/package-install.json'),JSON.stringify({passed:true,...result,scope:'real Chromium IndexedDB package install: four bounded overlapping downloads finishing out of order, deterministic attachment order, failed update preserves previous generation, late download rejection handled, unchanged resources reused without requests'},null,2));
 }finally{await browser?.close();await new Promise(r=>server.server.close(r));}
});
