// Independent native Promise/thenable type SOURCE. All cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourcePromiseTypeSources} from '../../prepare-http-resource-promise-type-sources.mjs';
const limits={timeout:60000};
const imports=`import {deferFilesystemFlow as defer,std_fs_read as read} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';
`;
const signedGuard='if(typeof value!=="bigint"||value< -9223372036854775808n||value>9223372036854775807n){throw new RangeError("Resource i64 input outside native range");}';
const source=imports+`type Native<T>=Promise<T>;
type Settled<T>=Awaited<Native<T>>;
type Thenable<T>=PromiseLike<T>;
export function ordinary(value:Settled<boolean>){return value;}
export function text(value:Awaited<Thenable<string>>){return value;}
export function scalar(value:Settled<ReturnType<typeof signed>>){${signedGuard}return value;}
export function cold():Thenable<Settled<boolean>>{return defer(async()=>{return true;});}
export function coldSigned():PromiseLike<ReturnType<typeof signed>>{return defer(async()=>{return 1n;});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual Awaited Promise and PromiseLike aliases retain settled domains and real cold caller boundaries',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));
 await verifyHttpResourceTargets(result,async api=>{assert.equal(api.ordinary(true),true);assert.equal(api.ordinary(false),false);assert.equal(api.text('é😀'),'é😀');assert.equal(api.scalar(-1n),-1n);assert.equal(await api.cold(),true);assert.equal(await api.coldSigned(),1n);});const rows=JSON.parse(result.meta).functions;assert.equal(rows.find(row=>row.name==='ordinary').lazy,false);assert.equal(rows.find(row=>row.name==='coldSigned').returns,'i64');assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('all complete native Promise/thenable alias inverses reproduce the actual original Rust syntax',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('type constructor spelling cannot admit eager promises stored futures mismatched return modes or global calls',limits,()=>{
 for(const body of [
  'export function bad():Promise<boolean>{return defer(async()=>{return true;});}',
  'export function bad():ReturnType<typeof read>{return defer(async()=>{return await read("file");});}',
  'export function bad(value:Promise<boolean>){return value;}',
  'export function bad(value:PromiseLike<boolean>){return value;}',
  'export function bad():PromiseLike<boolean>{return true;}',
  'export function bad(){return Promise.resolve(true);}',
  'type Future<T>=Promise<Promise<T>>;export function bad(value:Awaited<Future<boolean>>){return value;}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const conflicting=imports+"import {router_integer_u64_min as PromiseLike} from './runtime/integer-runtime.mjs';export function bad():PromiseLike<boolean>{return defer(async()=>{return true;});}";assert.throws(()=>translateHttpResourceCallerTypeScript(conflicting,input(conflicting)));
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='cold').lazy=false;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('an original same-spelled local type alias keeps its actual lexical meaning',limits,async()=>{
 const value='type PromiseLike<T>=T;export function ordinary(value:PromiseLike<boolean>){return value;}',result=translateHttpResourceCallerTypeScript(value,input(value));assert.equal(JSON.parse(result.meta).functions[0].lazy,false);await verifyHttpResourceTargets(result,api=>assert.equal(api.ordinary(true),true));
});
test('complete native Promise type originals retain both ordered source substitution inverses',limits,()=>{
 const plan=prepareHttpResourcePromiseTypeSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
