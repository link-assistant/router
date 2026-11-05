// Fresh complete owned String vector literal wrapper inputs. These records are DATA, never owner,
// trait, caller or runtime permission. No result/source cache crosses calls.
import {openSync,closeSync,fstatSync,readSync,constants} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalSourceCryptoIntrinsicsUnchanged as originalDeriveHelperCryptoUnchanged} from './derive-footprints.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
const PINS=Object.freeze([{"file":"tools/translation/extensions/owned-text-vector-literal-runtime.mjs","bytes":301,"sha256":"96832d4d8edfaa5acac8a3b63264df43e3d1bc5a0b7978bb3393b816d913518e","sourcePath":"owned-text-vector-literal-runtime.mjs","language":"JavaScript"},{"file":"tools/translation/extensions/owned-text-vector-literal-runtime.d.mts","bytes":163,"sha256":"b450a43639d174e06b1b50cd6067115b026a7935a0699c37f53f139a77290e33","sourcePath":"owned-text-vector-literal-runtime.d.mts","language":"TypeScript"}]);
const URLS=Object.freeze([new URL("./extensions/owned-text-vector-literal-runtime.mjs",import.meta.url),new URL("./extensions/owned-text-vector-literal-runtime.d.mts",import.meta.url)]);
const fail=message=>{invalidateActiveSourceOperations();throw new TypeError('Fresh owned String vector literal wrapper inputs: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function originalHostGuard(){if(!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalLexingIntrinsicsUnchanged())fail('original source parser/DATA/crypto intrinsics changed');}
function readSourceBytes(path,pin){
 const descriptor=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{const first=fstatSync(descriptor);if(!first.isFile()||first.size!==pin.bytes)fail('complete pinned source input size differs');const bytes=Buffer.alloc(pin.bytes+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor);if(at!==pin.bytes||last.size!==first.size||last.dev!==first.dev||last.ino!==first.ino||last.mtimeMs!==first.mtimeMs||last.ctimeMs!==first.ctimeMs||hash(bytes.subarray(0,at))!==pin.sha256)fail('complete current owned String vector literal source input differs');return bytes.subarray(0,at);}finally{closeSync(descriptor);}
}
export function requireOwnedTextVectorLiteralSynchronous(value){if(types.isPromise(value)||types.isProxy(value)||value!==null&&(typeof value==='object'||typeof value==='function')&&Reflect.has(value,'then'))fail('synchronous ordinary result without then fields required');return value;}
/** The directory option is for DATA-reader fixtures, never private issuers. */
function originalFreshInputs(run,{directory=null}={}){
 if(typeof run!=='function'||types.isProxy(run)||types.isAsyncFunction(run)||directory!==null&&(typeof directory!=='string'||directory.length>4096||directory.includes(String.fromCharCode(0))))fail('synchronous callback and bounded optional DATA directory required');requireFreshOwnedTextVectorLiteralHost();
 const base=directory===null?null:resolve(directory),paths=PINS.map((pin,index)=>{if(base===null)return fileURLToPath(URLS[index]);const path=resolve(base,pin.file),local=relative(base,path);if(local==='..'||local.startsWith('..'+sep)||isAbsolute(local))fail('pinned fixture input escapes its root');return path;}),sources=[];
 return withCompleteSourceClosingFence(()=>{const inputs=withSourceInputValidation(()=>{for(let index=0;index<PINS.length;index++){const pin=PINS[index],packed=read(paths[index],pin);if(!pin.sourcePath)continue;const raw=packed;const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),concrete=transportConcreteSyntaxSource(source,{language:pin.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source||hash(source)!==pin.sha256)fail('complete owned String vector literal source CST inverse differs');sources.push(Object.freeze({path:pin.sourcePath,repositoryPath:pin.file,language:pin.language,source,bytes:pin.bytes,sha256:pin.sha256,concreteSyntax:concrete.meta,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false}));}requireFreshOwnedTextVectorLiteralHost();return Object.freeze({sources:Object.freeze([...sources]),inputFiles:Object.freeze(PINS.map(pin=>pin.file)),sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false});});return requireOwnedTextVectorLiteralSynchronous(run(inputs));},[...PINS.map((pin,index)=>()=>read(paths[index],pin)),requireFreshOwnedTextVectorLiteralHost,()=>{sources.length=0;}]);
}

import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';

function read(path,pin){return withSourceInputValidation(()=>readSourceBytes(path,pin));}
export function requireFreshOwnedTextVectorLiteralHost(){return withSourceInputValidation(originalHostGuard);}
export function withFreshOwnedTextVectorLiteralInputs(run,options){return withSourceFailureOperation(()=>originalFreshInputs(run,options));}
import {withSourceFailureOperation,withSourceInputValidation,invalidateActiveSourceOperations} from './source-failure-operations.mjs';
