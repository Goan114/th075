import {releaseServer} from '../th075_web/artifacts/sdl3/scripts/serve.mjs';
import {fileURLToPath} from 'node:url';
const port=Number(process.env.PORT||3007),host=process.env.HOST||'127.0.0.1';
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const result=await releaseServer({root:fileURLToPath(new URL('../th075_web/artifacts/sdl3/site',import.meta.url)),port,host});
console.log('TH075 '+result.manifest.webVersion+' '+result.manifest.version+' '+result.url);
