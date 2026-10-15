import {readFileSync} from 'node:fs';import {root} from './character-recovery-tools.mjs';
export function callReceivers(id,callee){
 const sites=JSON.parse(readFileSync(root+'artifacts/cpp/analysis/jp/functions/'+id+'.calls.json','utf8'));
 const lines=readFileSync(root+'artifacts/cpp/analysis/jp/functions/'+id+'.asm','utf8').split(/\r?\n/);
 const indices=new Map(lines.map((line,i)=>[line.slice(0,8),i]));
 return sites.filter(site=>site.name===callee).map(site=>{const index=indices.get(site.instruction);if(index===undefined)throw Error('Unknown call instruction '+site.instruction);for(let at=index-1;at>=Math.max(0,index-16);at--){const line=lines[at];if(!/ MOV ECX,/.test(line))continue;if(/\+ 0x2e8\]/.test(line))return 'other';if(/\[EBP /.test(line))return 'a';throw Error('Unreviewed receiver '+line+' for '+site.instruction);}throw Error('Missing receiver '+site.instruction);});
}
