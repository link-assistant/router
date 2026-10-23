// Drafted independent behavior/refusal cases. Do not execute during bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareFilesystemEffects} from '../prepare-filesystem-effects.mjs';
import {EFFECT_CONTRACTS} from '../extensions/effects-contracts.mjs';
import {FILESYSTEM_EFFECT_CONTRACTS,FILESYSTEM_EFFECT_OPERATION_IDS} from '../extensions/filesystem-effects-contracts.mjs';
import * as runtime from '../extensions/filesystem-effects-runtime.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {translateSource} from '../translate.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {translateFilesystemEffectJavaScript,translateFilesystemEffectTypeScript,readFilesystemEffectMeta} from '../js-to-rust/filesystem-effects.mjs';

const limits={timeout:60000},io=code=>Object.assign(new Error('independent '+code),{code});
const runtimeSource=()=>readFileSync(new URL('../extensions/filesystem-effects-runtime.mjs',import.meta.url),'utf8');
const input=()=>({sourcePath:'caller.mjs',runtimePath:'runtime/effects.mjs',runtimeSource:runtimeSource()});
test('full source draft retains original runtime and lazy-future implementation with both complete CST inverses',limits,()=>{
 const plan=prepareFilesystemEffects();assert.equal(plan.files.length,5);assert.equal(plan.originalRuntimeModuleChanged,false);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.receivingExecuted,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);assert.equal(transportConcreteSyntaxMeta(row.stages[0].beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.stages[1].afterMeta).source,row.after);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 const copy=plan.files.find(row=>row.path.endsWith('/filesystem-effects-runtime.mjs'));assert.ok(copy.after.startsWith(copy.before));assert.ok(copy.after.includes(copy.originalFutureSourceSelection.source));assert.equal(plan.originalInputs.find(row=>row.path.endsWith('/effects-runtime.mjs')).source,readFileSync(new URL('../extensions/effects-runtime.mjs',import.meta.url),'utf8'));
});
test('the original eleven descriptors remain exact and every new filesystem export exists',limits,()=>{
 assert.deepEqual(FILESYSTEM_EFFECT_CONTRACTS.slice(0,11),EFFECT_CONTRACTS);assert.equal(FILESYSTEM_EFFECT_OPERATION_IDS.length,12);assert.equal(FILESYSTEM_EFFECT_CONTRACTS.length,23);
 for(const id of FILESYSTEM_EFFECT_OPERATION_IDS){const row=FILESYSTEM_EFFECT_CONTRACTS.find(row=>row.id===id);assert.ok(row);assert.equal(typeof runtime[id],'function');assert.equal(Object.isFrozen(row),true);assert.deepEqual(row.rustPath.slice(1,2),['fs']);}
});
test('binary reads retain all byte values independently of the strict UTF8 string reader',limits,()=>{
 const bytes=Uint8Array.from([0,127,128,255,239,187,191]),capability={fs:{sync:{readFileSync:()=>bytes}}};
 const result=runtime.std_fs_read('binary',capability);assert.deepEqual(result,{$:'Ok',field0:[0n,127n,128n,255n,239n,187n,191n]});assert.ok(Object.isFrozen(result.field0));bytes[0]=33;assert.equal(result.field0[0],0n);
 assert.equal(runtime.std_fs_read_to_string('binary',capability).field0.kind,'InvalidData');
 assert.throws(()=>runtime.std_fs_read('bad',{fs:{sync:{readFileSync:()=>[0,255]}}}),/must return bytes/);
});
test('synchronous directory rename and hard-link effects keep source argument order and reject invalid roots',limits,()=>{
 const tape=[],capability={fs:{sync:{mkdirSync:(...args)=>tape.push(['mkdir',...args]),renameSync:(...args)=>tape.push(['rename',...args]),rmdirSync:(...args)=>tape.push(['rmdir',...args]),linkSync:(...args)=>tape.push(['link',...args]),lstatSync:path=>({isDirectory:()=>path==='directory',isSymbolicLink:()=>path==='link'}),rmSync:(...args)=>tape.push(['rm',...args])}}};
 assert.deepEqual(runtime.std_fs_create_dir('dir',capability),{$:'Ok',field0:null});assert.deepEqual(runtime.std_fs_rename('old','new',capability),{$:'Ok',field0:null});assert.deepEqual(runtime.std_fs_hard_link('target','alias',capability),{$:'Ok',field0:null});assert.deepEqual(runtime.std_fs_remove_dir('empty',capability),{$:'Ok',field0:null});
 assert.deepEqual(tape,[['mkdir','dir'],['rename','old','new'],['link','target','alias'],['rmdir','empty']]);
 assert.equal(runtime.std_fs_remove_dir_all('regular',capability).field0.kind,'NotADirectory');assert.equal(tape.length,4);assert.deepEqual(runtime.std_fs_remove_dir_all('link',capability),{$:'Ok',field0:null});assert.deepEqual(tape[4],['rm','link',{recursive:true,force:false,maxRetries:0}]);
 assert.equal(runtime.std_fs_rename('old','bad\0path',capability).field0.kind,'InvalidInput');assert.equal(tape.length,5);
});
test('OS failures retain Rust Result errors while adapter defects remain exceptions',limits,()=>{
 let reads=0;const capability={fs:{sync:{readFileSync:()=>{if(++reads===1)throw io('EINTR');return Uint8Array.of(255);},renameSync:()=>{throw io('EXDEV');},rmdirSync:()=>{throw io('ENOTEMPTY');}}}};
 assert.deepEqual(runtime.std_fs_read('file',capability),{$:'Ok',field0:[255n]});assert.equal(reads,2);assert.equal(runtime.std_fs_rename('a','b',capability).field0.kind,'CrossesDevices');assert.equal(runtime.std_fs_remove_dir('dir',capability).field0.kind,'DirectoryNotEmpty');
 assert.throws(()=>runtime.std_fs_rename('a','b',{fs:{sync:{renameSync:()=>{throw new TypeError('independent adapter fault');}}}}),/independent adapter fault/);
});
test('lazy async wrappers start only on polling and preserve scoped capabilities across concurrent futures',limits,async()=>{
 const tape=[],capability={fs:{async:{readFile:async path=>{tape.push(['read',path]);return Uint8Array.of(255,0);},rename:async(a,b)=>{tape.push(['rename',a,b]);}}}};
 const future=runtime.deferFilesystemEffect('tokio_fs_read',['file'],capability);assert.deepEqual(tape,[]);assert.deepEqual(await future,{$:'Ok',field0:[255n,0n]});assert.deepEqual(await future,{$:'Ok',field0:[255n,0n]});assert.deepEqual(tape,[['read','file']]);
 await runtime.withEffectCapabilities(capability,async()=>{const next=runtime.deferFilesystemEffect('tokio_fs_rename',['old','new']);assert.deepEqual(tape,[['read','file']]);assert.deepEqual(await next,{$:'Ok',field0:null});});assert.deepEqual(tape,[['read','file'],['rename','old','new']]);
 assert.throws(()=>runtime.deferFilesystemEffect('std_fs_read',['file']),/declared asynchronous/);assert.throws(()=>runtime.deferFilesystemEffect('tokio_fs_rename',['one']),/count/);
});
test('native JS and TS effect wrappers retain serialized meta source associations and full target inverses',limits,()=>{
 const javascript='import {std_fs_read as read,deferFilesystemEffect as later} from "./runtime/effects.mjs";\n/** @param {string} path */\nexport function bytes(path){return read(path);}\n/** @param {string} from @param {string} to */\nexport function moved(from,to){return later("tokio_fs_rename",[from,to]);}\n';
 const result=translateFilesystemEffectJavaScript(javascript,input());assert.match(result.rust,/fn bytes\(path: &str\) -> std::io::Result<Vec<u8>>/);assert.match(result.rust,/async fn moved\(from: &str, to: &str\)/);assert.match(result.rust,/tokio::fs::rename\(from, to\).await/);assert.equal(result.javascript,javascript);assert.match(result.typescript,/bytes\(path: string\)/);assert.equal(readFilesystemEffectMeta(result.meta,javascript,input()).functions.length,2);assert.equal(result.targetSourceEquations.every(row=>row.inverse===javascript),true);
 const typed=translateFilesystemEffectTypeScript('import {std_fs_remove_dir as remove} from "./runtime/effects.mjs"; export function empty(path: string){return remove(path);}',input());assert.match(typed.javascript,/empty\(path\)/);assert.equal(typed.javascript.includes(': string'),false);assert.match(typed.rust,/std::fs::remove_dir\(path\)/);
 assert.throws(()=>readFilesystemEffectMeta(result.meta.replace('bytes','forged'),javascript,input()),/source and semantic meta/);assert.throws(()=>translateFilesystemEffectJavaScript(javascript,{...input(),runtimeSource:runtimeSource()+'\n'}),/runtime source differs/);
});
test('reverse wrappers refuse eager async timing shadowing indirect calls missing types and unrelated source modules',limits,()=>{
 const sources=[
  'import {tokio_fs_read as read} from "./runtime/effects.mjs"; /** @param {string} path */ export async function bytes(path){return await read(path);}',
  'import {std_fs_read as read} from "./runtime/effects.mjs"; /** @param {string} read */ export function bytes(read){return read(read);}',
  'import {std_fs_read as read} from "./runtime/effects.mjs"; export function bytes(path){return read(path);}',
  'import {std_fs_read as read} from "./other.mjs"; /** @param {string} path */ export function bytes(path){return read(path);}',
  'import {std_fs_read as read} from "./runtime/effects.mjs"; /** @param {string} path */ export function bytes(path){return read(path + "suffix");}',
 ];for(const source of sources)assert.throws(()=>translateFilesystemEffectJavaScript(source,input()),TypeError);
});
test('new qualified sync and async Rust filesystem callers execute complete generated JS and strict TypeScript',limits,async()=>{
 const source='fn bytes(path: &str) -> std::io::Result<Vec<u8>> { std::fs::read(path) } async fn moved(from: &str, to: &str) -> std::io::Result<()> { tokio::fs::rename(from, to).await }';
 const result=translateSource(source,'input.rs');assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items));
 await verifyTypedTargets(result,async(api,_result,_module,{effects})=>{const tape=[],capability={fs:{sync:{readFileSync:()=>Uint8Array.of(0,255)},async:{rename:async(from,to)=>{tape.push([from,to]);}}}};assert.deepEqual(effects.withEffectCapabilities(capability,()=>api.bytes('file')),{$:'Ok',field0:[0n,255n]});const pending=api.moved('old','new');assert.deepEqual(tape,[]);assert.deepEqual(await effects.withEffectCapabilities(capability,()=>Promise.resolve(pending)),{$:'Ok',field0:null});assert.deepEqual(tape,[['old','new']]);},{childTimeoutMs:20000});
});
