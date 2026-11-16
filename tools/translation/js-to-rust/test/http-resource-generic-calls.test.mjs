// Independent original explicit generic-call SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceGenericCallSources} from '../../prepare-http-resource-generic-call-sources.mjs';
const limits={timeout:60000};
const imports="import {router_integer_i64_min as signed} from './runtime/integer-runtime.mjs';\nimport {json_macro_string as make} from './runtime/json-macro-runtime.mjs';\n";
const source=imports+`type Identity<T>=T;
type Signed=ReturnType<typeof signed>;
export function identity<T>(value:T):T{return value;}
export function boolean(){return identity<boolean>(true);}
export function text(){return identity<string>('é😀');}
export function borrowed(input:string){return identity<string>(input);}
export function signedValue(){return identity<Signed>(1n);}
export function alias(){return identity<Identity<boolean>>(true);}
export function owned(){return identity<ReturnType<typeof make>>(make('owned'));}
export function local(){const value:Signed=identity<Signed>((1n as bigint));return value;}
export function nested(){return identity<Signed>(identity<Signed>(1n));}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual explicit type arguments remain whole value obligations and preserve native domains after JS erasure',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.javascript,/@type/u);assert.doesNotMatch(result.javascript,/identity<Signed>|identity<boolean>/u);
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.boolean(),true);assert.equal(api.text(),'é😀');assert.equal(api.borrowed('é😀'),'é😀');assert.equal(api.signedValue(),1n);assert.equal(api.alias(),true);assert.equal(api.owned(),'owned');assert.equal(api.local(),1n);assert.equal(api.nested(),1n);});
 const rows=JSON.parse(result.meta).functions;for(const name of ['signedValue','local','nested'])assert.equal(rows.find(row=>row.name===name).returns,'i64');assert.deepEqual(rows.find(row=>row.name==='borrowed').flow.returnRoots,['input']);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete explicit generic-call source inverses reproduce the actual inferred native instantiations',limits,()=>{
 const translated=translateHttpResourceCallerTypeScript(source,input(source)),result=translateHttpResourceCallerRust(translated.rust,{...input(translated.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(translated.rust,result.rust));assert.equal(result.rustExecuted,false);
});
test('explicit generic arguments cannot change values native ranges owners or nongeneric operation arity',limits,()=>{
 for(const body of [
  'export function bad(){return identity<boolean>(1n);}',
  'export function bad(){return identity<ReturnType<typeof signed>>(9223372036854775808n);}',
  'export function bad(){return identity<boolean,bigint>(true);}',
  'export function bad(){return identity<any>(true);}',
  'export function bad(){return identity<unknown>(true);}',
  'export function bad(){return signed<bigint>(1n,2n);}',
  'export function bad(){const value=make("x");const moved=identity<ReturnType<typeof make>>(value);return [value,moved];}',
 ]){const value=imports+'function identity<T>(value:T):T{return value;}\n'+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='signedValue').flow.tail.value.args[0].type='u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('all explicit generic-call source originals retain language/repository order and complete inverses',limits,()=>{
 const plan=prepareHttpResourceGenericCallSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
