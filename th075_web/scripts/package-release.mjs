import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync,copyFileSync,cpSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),workspace=resolve(root,'..'),launcher=resolve(root,'launcher');
const source=resolve(root,process.env.TH075_OUTPUT||'artifacts/sdl3'),build=JSON.parse(readFileSync(resolve(source,'build.json'),'utf8'));
const development=process.argv.includes('--development');
const release=JSON.parse(readFileSync(resolve(root,'reference/web-release.json'),'utf8'));
if(!/^\d+\.\d+\.\d+$/.test(release.version)||!/^\d{4}-\d{2}-\d{2}$/.test(release.date))throw Error('Invalid web release version/date');
const changelog=readFileSync(resolve(root,'CHANGELOG.txt'),'utf8');
if(!changelog.startsWith(`[${release.date}] 萃梦想 WEB ${release.version}\n`))throw Error('Changelog does not match web release version/date');
if(!development&&!build.completeGame)throw Error('TH075 full reconstruction is incomplete. Final/public packaging is blocked; use --development for the isolated local architecture preview.');
const out=development?resolve(root,'artifacts/architecture-preview'):source,site=resolve(out,'site');
const sha=b=>createHash('sha256').update(b).digest('hex'),walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]);
const baseline=JSON.parse(readFileSync(resolve(root,'reference/architecture-baseline.json'),'utf8'));
const extensions=JSON.parse(readFileSync(resolve(root,'reference/shared-architecture-extensions.json'),'utf8'));
for(const {path,sha256} of baseline.sharedFiles){const extension=extensions.changes.find(f=>f.path===path);if(extension&&extension.baselineSha256!==sha256)throw Error('Shared extension baseline mismatch: '+path);if(sha(readFileSync(resolve(workspace,path)))!==(extension?.currentSha256||sha256))throw Error('Final shared architecture baseline drift: '+path);}
const moduleName=development?'th075-harness':'th075';
const wasm=readFileSync(resolve(source,moduleName+'.wasm')),loaderSource=readFileSync(resolve(source,moduleName+'.mjs'),'utf8');
if(!loaderSource.includes(moduleName+'.wasm'))throw Error('Runtime loader does not reference its compiled Wasm');
const loader=Buffer.from(loaderSource.replaceAll(moduleName+'.wasm','th075.wasm'));
if(!development&&moduleName!=='th075')throw Error('Production package cannot contain development harness exports');
if(build.sha256!==sha(wasm))throw Error('Build TH075 SDL3 release first');
for(const [p,hash] of Object.entries({...build.sources,...build.headers}))if(sha(readFileSync(resolve(workspace,p)))!==hash)throw Error('Stale runtime build: '+p);
execFileSync(process.execPath,[resolve(workspace,'tools/architecture/typescript/node_modules/typescript/bin/tsc'),'-p',resolve(launcher,'tsconfig.launcher.json'),'--pretty','false'],{stdio:'inherit',windowsHide:true});
const manifest={game:'th075',version:'',webVersion:release.version,releaseDate:release.date,sourceVersion:'Japanese 1.11',completeGame:build.completeGame,development,execution:{kind:'cpp-sdl3',entry:'/',architecture:build.architecture,wasm:'/runtime/th075/th075.wasm',loader:'/runtime/th075/th075.mjs',sha256:sha(wasm),loaderSha256:sha(loader)},launcher:{protocol:'eagler-touhou/1',source:'TH09 final common launcher / TH08+TH10 shared architecture',baseline:'final-baseline.json'},files:{}};
function put(name,b){if(!name||name.includes('..')||name.startsWith('/'))throw Error('Invalid package path');const p=resolve(site,name);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,b);manifest.files['/'+name]={path:name,bytes:b.length,sha256:sha(b),immutable:false};}
function copy(name,p){put(name,readFileSync(p));}
function json(name,v){put(name,Buffer.from(JSON.stringify(v)));}
const pending=['app.js','native-audio.js'],seen=new Set();function locate(n){for(const p of [resolve(launcher,'public',n),resolve(launcher,'.cache/build/browser',n),resolve(launcher,'src/browser-facades',n),resolve(launcher,n)])if(existsSync(p))return p;throw Error('Missing module '+n);}
while(pending.length){const n=pending.pop();if(seen.has(n))continue;if(n.startsWith('../'))throw Error('Import escape');seen.add(n);const text=readFileSync(locate(n),'utf8');if(/(?:from\s*|import\s*\()['"]node:/.test(text))throw Error('Node module');put(n,Buffer.from(text));for(const m of text.matchAll(/(?:\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?|\bimport\s*\()\s*['"](\.[^'"]+)['"]/g))pending.push(relative(site,resolve(site,dirname(n),m[1])).replaceAll('\\','/'));}
for(const p of walk(resolve(launcher,'public'))){const n=relative(resolve(launcher,'public'),p).replaceAll('\\','/');if(!/\.(js|mjs)$/.test(n)||n.startsWith('vendor/')){
 if(n==='index.html'&&!development)put(n,Buffer.from(readFileSync(p,'utf8').replace('萃梦想 WEB DEV',`萃梦想 WEB ${release.version}（${release.date}）`).replace('<span class="brand-version">DEV</span>',`<span class="brand-version" title="${release.date} 发布">${release.version}</span>`)));else copy(n,p);
}}
for(const [name,src] of [['th075.html','managed.html'],['managed.css','managed.css'],['keyboard.mjs','keyboard.mjs'],['display.mjs','display.mjs']])copy('runtime/th075/'+name,resolve(root,'sdl-runtime',src));
const buildMarker="/*TH075_BUILD_INFO*/{version:'development',completeGame:false}",managed=readFileSync(resolve(root,'sdl-runtime/managed.mjs'),'utf8');
if(!managed.includes(buildMarker))throw Error('Runtime build-info marker missing');
put('runtime/th075/managed.mjs',Buffer.from(managed.replace(buildMarker,JSON.stringify({version:(development?'development-':release.version+'-sdl3-')+build.sha256.slice(0,12),completeGame:!development&&build.completeGame}))));
put('runtime/th075/th075.mjs',loader);put('runtime/th075/th075.wasm',wasm);
const chunks=[],files=[];let size=0;function dataFile(filename,path){const bytes=readFileSync(path);chunks.push(bytes);files.push({filename,start:size,end:size+bytes.length});size+=bytes.length;}
dataFile('/fonts/original-glyphs.bin',resolve(root,'assets/fonts/original-glyphs.bin'));dataFile('/music/catalog.bin',resolve(root,'assets/music/catalog.bin'));
const catalog=JSON.parse(readFileSync(resolve(root,'assets/resources/catalog.json'),'utf8')),music=readdirSync(resolve(root,'assets/music')).filter(n=>n.endsWith('.ogg')).sort();
const resources=[...catalog.files.map(f=>'resources/'+f.edition+'/'+f.path+'.z'),'fonts/original-glyphs.bin','fonts/chinese-glyphs.bin','music/catalog.bin',...music.map(n=>'music/'+n)];
const data=Buffer.concat(chunks),index={files,remote_package_size:size,music,resources};put('packages/th075/th075.data',data);json('runtime/th075/th075.data.json',index);
const declarations={'game-data':{source:'th075.data',target:'/th075.data',bytes:size,revision:'sha256-'+sha(data)}};
// Keep the original boot DATA layout compatible with already-installed releases.
// Load this optional font through the same managed resource interface as scenes.
const chineseFont=readFileSync(resolve(root,'assets/fonts/chinese-glyphs.bin'));put('packages/th075/fonts/chinese-glyphs.bin',chineseFont);declarations['chinese-font']={source:'fonts/chinese-glyphs.bin',target:'/fonts/chinese-glyphs.bin',bytes:chineseFont.length,revision:'sha256-'+sha(chineseFont)};
for(const [i,f]of catalog.files.entries()){const n='resources/'+f.edition+'/'+f.path+'.z',bytes=readFileSync(resolve(root,'assets',n));put('packages/th075/'+n,bytes);declarations['resource-'+i]={source:n,target:'/'+n,bytes:bytes.length,revision:'sha256-'+sha(bytes)};}
for(const [i,n]of music.entries()){const bytes=readFileSync(resolve(root,'assets/music',n));put('packages/th075/music/'+n,bytes);declarations['music-'+i]={source:'music/'+n,target:'/music/'+n,bytes:bytes.length,revision:'sha256-'+sha(bytes)};}
const layout='sha256-'+sha(JSON.stringify(index)),revision='th075-'+sha(JSON.stringify(declarations)).slice(0,16);
json('packages/th075/package.json',{schema:'eagler-touhou/package/1',game:'th075',revision,files:declarations,base:{files:Object.keys(declarations)},components:{},runtimeRequirement:{protocol:'eagler-touhou/1',target:'th075',dataFile:'game-data',dataLayout:layout}});
json('release-catalog.json',{schema:'eagler-touhou/release-catalog/1',games:{th075:{revision,descriptor:'./packages/th075/package.json'}}});
json('host-manifest.json',{schema:'eagler-touhou/host-manifest/1',protocol:'eagler-touhou/1',profile:'th075-sdl3-native',shared:{resourceMode:'hosted',vanillaFont:'',unicodeFont:''},games:{th075:{runtime:'./runtime/th075/th075.html',gameData:{path:'th075.data',bytes:size,sha256:sha(data),version:'sha256-'+sha(data),layout},music:{midi:{files:[]}},languageOptions:[{id:'ja',title:'日本語（原版）',pack:null},{id:'lang_zh-hant',title:'中文（繁體，本地漢化）',pack:null}],features:{thprac:false,focusHitbox:false}}}});
copy('LICENSE-launcher.txt',resolve(launcher,'LICENSE'));put('THIRD-PARTY-NOTICES.txt',Buffer.from('Original game and assets: Twilight Frontier / Team Shanghai Alice.\nLauncher: YomotsuHisami/eagler-touhou, GPL-3.0-or-later, adapted from the local final TH08/TH10/TH09 launcher. See LICENSE-launcher.txt.\nSDL3: zlib. Emscripten: MIT / University of Illinois-NCSA.\n'));
copy('final-baseline.json',resolve(root,'reference/architecture-baseline.json'));
copy('shared-architecture-extensions.json',resolve(root,'reference/shared-architecture-extensions.json'));
put('app/th075.html',Buffer.from('<!doctype html><meta charset="utf-8"><title>东方萃梦想</title><script src="/app/redirect.mjs" type="module"></script><a href="/">打开萃梦想</a>'));
put('app/redirect.mjs',Buffer.from('location.replace(new URL("/",location.href));'));
put('CHANGELOG.txt',Buffer.from((development?'开发验证构建 · 仅供本地验证\n\n':'')+changelog));
const entries=[{url:'./',revision:manifest.files['/index.html'].sha256},...Object.keys(manifest.files).map(n=>n.slice(1)).filter(n=>!n.startsWith('packages/')&&!['app-shell-sw.js','index.html','version.json'].includes(n)).map(n=>({url:n,revision:manifest.files['/'+n].sha256}))];
const cacheBuild='th075-'+sha(JSON.stringify(entries)).slice(0,20);put('app-shell-sw.js',Buffer.from(readFileSync(resolve(launcher,'src/app-shell-sw.js'),'utf8').replaceAll('__APP_SHELL_BUILD_ID__',cacheBuild).replace('self.__WB_MANIFEST',JSON.stringify(entries))));
manifest.files['/']={...manifest.files['/index.html']};manifest.version=sha(JSON.stringify(manifest.files)).slice(0,24);json('version.json',{game:'th075',build:manifest.version,webVersion:release.version,releaseDate:release.date});writeFileSync(resolve(site,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
mkdirSync(resolve(out,'scripts'),{recursive:true});copyFileSync(resolve(workspace,'th09_web/scripts/release-server.mjs'),resolve(out,'scripts/serve.mjs'));copyFileSync(resolve(workspace,'th09_web/scripts/netplay-relay.mjs'),resolve(out,'scripts/netplay-relay.mjs'));cpSync(resolve(workspace,'th09_web/node_modules/ws'),resolve(out,'node_modules/ws'),{recursive:true});
writeFileSync(resolve(out,'package.json'),JSON.stringify({name:'th075-native-web',private:true,type:'module',scripts:{start:'node scripts/serve.mjs --port '+(development?'8115':'3007')}},null,2)+'\n');
console.log(JSON.stringify({site,version:manifest.version,modules:seen.size,completeGame:manifest.completeGame,development}));
