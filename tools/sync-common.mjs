import {readFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),dependency=JSON.parse(readFileSync(resolve(root,'dependencies.json'),'utf8'))['eagler-common'];
const common=resolve(process.env.EAGLER_COMMON_ROOT||resolve(root,'third_party/eagler-common'));
if(!existsSync(resolve(common,'CMakeLists.txt')))throw Error('Materialize eagler-common at '+dependency.revision+' and set EAGLER_COMMON_ROOT');
if(execFileSync('git',['-C',common,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==dependency.revision)throw Error('eagler-common pin mismatch');
execFileSync(process.execPath,[resolve(common,'tools/sync-directory-keyboard.mjs'),...(process.argv.includes('--check')?['--check']:[]),resolve(root,'th075_web/sdl-runtime/directory-keyboard.mjs')],{stdio:'inherit'});
const saveSource=resolve(common,'browser/save-sync.mjs'),saveTarget=resolve(root,'th075_web/sdl-runtime/save-sync.mjs');
if(process.argv.includes('--check')){if(!readFileSync(saveSource).equals(readFileSync(saveTarget)))throw Error('Shared save-sync drift');}
else copyFileSync(saveSource,saveTarget);
if(!process.argv.includes('--check'))copyFileSync(resolve(common,'LICENSE'),resolve(root,'portable/LICENSE.eagler-common'));
