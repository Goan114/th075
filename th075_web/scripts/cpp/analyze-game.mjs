import{readFileSync}from'node:fs';import{spawn}from'node:child_process';import{fileURLToPath}from'node:url';import{resolve}from'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));const entries=JSON.parse(readFileSync(resolve(root,'reference/function-map.json'),'utf8').replace(/^\uFEFF/,''));
const args=entries.filter(e=>!/^Graphics|^Texture|^Input/.test(e.module)).map(e=>e.address);
const child=spawn(process.execPath,[resolve(root,'scripts/cpp/analyze.mjs'),...args],{cwd:root,windowsHide:true,stdio:'inherit'});child.on('exit',code=>process.exitCode=code??1);
