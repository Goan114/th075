import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const replayDir=resolve(root,'../[th075] 东方萃梦想 (汉化版+日文版)/replay');
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p));
const coreSha256=hash(readFileSync(resolve(root,'artifacts/cpp/game-core-test.wasm')));
const inputs=process.argv.slice(2);assert.ok(inputs.length,'Pass completed comparison report paths');
const reports=inputs.map(p=>read(resolve(p)));
const entries=new Map();
for(const report of reports)for(const result of report.results){
 assert.equal(result.passed,true,result.file);assert.equal(result.complete,true,result.file);
 assert.equal(result.exit,0x2205,result.file);assert.equal(result.coreSha256,coreSha256,result.file);
 if(entries.has(result.file))assert.deepEqual(result,entries.get(result.file),'Conflicting duplicate result');
 entries.set(result.file,result);
}
const files=readdirSync(replayDir).filter(f=>f.endsWith('.rep')).sort();
assert.deepEqual([...entries.keys()].sort(),files,'Every supplied replay must complete');
const results=files.map(file=>{const r=entries.get(file);assert.equal(r.sha256,hash(readFileSync(resolve(replayDir,file))),file);return {...r,frames:r.frames+1};});
const report={passed:true,verifiedAt:new Date().toISOString(),coreSha256,originalSha256:read(resolve(root,'target.json')).sha256,replayCount:results.length,frames:results.reduce((n,r)=>n+r.frames,0),scope:reports[0].scope,frameCounting:'Inclusive successful ticks through the native match exit, normalized from the zero-based last frame in individual reports',reports:inputs,results};
writeFileSync(resolve(root,'artifacts/cpp/verification/original-replays-full-original.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,replays:report.replayCount,frames:report.frames,coreSha256}));
