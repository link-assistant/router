// Fresh complete owned String vector join kernel inputs. These records are DATA, never owner,
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
const PINS=Object.freeze([{"file":"tools/translation/extensions/owned-text-vector-join-runtime.mjs","bytes":2404,"sha256":"bfdf50a836460da466b7d85e954b7b601aeff89177754004c49a06797d1e89b4","sourcePath":"owned-text-vector-join-runtime.mjs","language":"JavaScript"},{"file":"tools/translation/extensions/owned-text-vector-join-runtime.d.mts","bytes":174,"sha256":"652b1ce899d2a5c96dc228ae10c8a884b278d48ae5c6cf6980e1f16b71967ac5","sourcePath":"owned-text-vector-join-runtime.d.mts","language":"TypeScript"},{"file":"tools/translation/owned-text-vector-join-helper-sources.mjs","bytes":5056,"sha256":"f014ddac3d2ee697a6ba9df3b0f63927fc18ea6b9beba5277c407a5b53d326df","sourcePath":"owned-text-vector-join-helper-sources.mjs","language":"JavaScript"},{"file":"tools/translation/owned-text-vector-join-contracts.mjs","bytes":4415,"sha256":"4dd064884a2acb4117cd8eb85f25ef6204466605cba00e86f1e4363f9c70123f","sourcePath":"owned-text-vector-join-contracts.mjs","language":"JavaScript"}]);
const URLS=Object.freeze([new URL("./extensions/owned-text-vector-join-runtime.mjs",import.meta.url),new URL("./extensions/owned-text-vector-join-runtime.d.mts",import.meta.url),new URL("./owned-text-vector-join-helper-sources.mjs",import.meta.url),new URL("./owned-text-vector-join-contracts.mjs",import.meta.url)]);
const fail=message=>{invalidateActiveSourceOperations();throw new TypeError('Fresh owned String vector join kernel inputs: '+message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
function originalHostGuard(){if(!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalDeriveHelperCryptoUnchanged()||!originalLexingIntrinsicsUnchanged())fail('original source parser/DATA/crypto intrinsics changed');}
function readSourceBytes(path,pin){
 const descriptor=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));try{const first=fstatSync(descriptor);if(!first.isFile()||first.size!==pin.bytes)fail('complete pinned source input size differs');const bytes=Buffer.alloc(pin.bytes+1);let at=0;while(at<bytes.length){const count=readSync(descriptor,bytes,at,bytes.length-at,at);if(!count)break;at+=count;}const last=fstatSync(descriptor);if(at!==pin.bytes||last.size!==first.size||last.dev!==first.dev||last.ino!==first.ino||last.mtimeMs!==first.mtimeMs||last.ctimeMs!==first.ctimeMs||hash(bytes.subarray(0,at))!==pin.sha256)fail('complete current owned String vector join kernel source input differs');return bytes.subarray(0,at);}finally{closeSync(descriptor);}
}
export function requireOwnedTextVectorJoinSynchronous(value){if(types.isPromise(value)||types.isProxy(value)||value!==null&&(typeof value==='object'||typeof value==='function')&&Reflect.has(value,'then'))fail('synchronous ordinary result without then fields required');return value;}
/** The directory option is for DATA-reader fixtures, never private issuers. */
function originalFreshInputs(run,{directory=null}={}){
 if(typeof run!=='function'||types.isProxy(run)||types.isAsyncFunction(run)||directory!==null&&(typeof directory!=='string'||directory.length>4096||directory.includes(String.fromCharCode(0))))fail('synchronous callback and bounded optional DATA directory required');requireFreshOwnedTextVectorJoinHost();
 const base=directory===null?null:resolve(directory),paths=PINS.map((pin,index)=>{if(base===null)return fileURLToPath(URLS[index]);const path=resolve(base,pin.file),local=relative(base,path);if(local==='..'||local.startsWith('..'+sep)||isAbsolute(local))fail('pinned fixture input escapes its root');return path;}),sources=[];
 return withCompleteSourceClosingFence(()=>{const inputs=withSourceInputValidation(()=>{for(let index=0;index<PINS.length;index++){const pin=PINS[index],packed=read(paths[index],pin);if(!pin.sourcePath)continue;const raw=packed;const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),concrete=transportConcreteSyntaxSource(source,{language:pin.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source||hash(source)!==pin.sha256)fail('complete owned String vector join kernel source CST inverse differs');sources.push(Object.freeze({path:pin.sourcePath,repositoryPath:pin.file,language:pin.language,source,bytes:pin.bytes,sha256:pin.sha256,concreteSyntax:concrete.meta,sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false}));}requireFreshOwnedTextVectorJoinHost();return Object.freeze({sources:Object.freeze([...sources]),inputFiles:Object.freeze(PINS.map(pin=>pin.file)),sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false,crossInvocationCache:false});});return requireOwnedTextVectorJoinSynchronous(run(inputs));},[...PINS.map((pin,index)=>()=>read(paths[index],pin)),requireFreshOwnedTextVectorJoinHost,()=>{sources.length=0;}]);
}

import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';

function read(path,pin){return withSourceInputValidation(()=>readSourceBytes(path,pin));}
export function requireFreshOwnedTextVectorJoinHost(){return withSourceInputValidation(originalHostGuard);}
export function withFreshOwnedTextVectorJoinInputs(run,options){return withSourceFailureOperation(()=>originalFreshInputs(run,options));}
import {withSourceFailureOperation,withSourceInputValidation,invalidateActiveSourceOperations} from './source-failure-operations.mjs';
