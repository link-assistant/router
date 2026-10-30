// Independent qualified generic library-call SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {requireHttpResourceNativeGenericArguments} from '../http-resource-native-generic-arguments.mjs';
import {httpResourceCallerContract} from '../http-resource-caller-contracts.mjs';
import {requireHttpResourceGenericLibraryOperation,indexHttpResourceGenericLibraryOperations} from '../http-resource-generic-library-calls.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceGenericLibraryCallSources} from '../../prepare-http-resource-generic-library-call-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_option_identity as option} from './runtime/primitive-option-runtime.mjs';
import {router_text_result_identity as result} from './runtime/owned-result-runtime.mjs';
`;
const source=imports+`type Optional<Payload> = ReturnType<typeof option<Payload>>;
type Outcome<Payload> = ReturnType<typeof result<Payload>>;
export function optional<T>(value:Optional<T>):Optional<T>{return option<T>(value);}
export function outcome<T>(value:Outcome<T>):Outcome<T>{const alias:Outcome<T>=result<T>(value);return result(alias);}
export function selected(value:Optional<boolean>){return option<boolean>(value);}
export function nested(value:Outcome<Optional<boolean>>){return result<Optional<boolean>>(value);}
export function constructed(){return option<boolean>({$: 'Some',field0:true});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
function nativeInput(value){return {...input(value,'src/caller.rs'),javascriptPath:'caller.mjs'};}
test('actual qualified shared identities retain precise generic and concrete payloads in JS strict TS meta and native output',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.equal(result.typescript,source);assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.rust,/crate::translation_primitive_option_core::option_identity\(value\)/u);assert.match(result.rust,/crate::translation_owned_results_core::text_result_identity\(value\)/u);for(const name of ['optional','outcome']){const fn=JSON.parse(result.meta).functions.find(row=>row.name===name),call=fn.flow.tail.value;assert.equal(call.local,false);assert.equal(call.genericIdentity,true);assert.equal(call.sourceGenericLibrary,true);}
 await verifyHttpResourceTargets(result,api=>{const opaque=new Proxy({},{get(){throw Error('opaque payload');},ownKeys(){throw Error('opaque payload');}});for(const value of [Object.freeze({$:'None'}),Object.freeze({$:'Some',field0:opaque})])assert.strictEqual(api.optional(value),value);for(const value of [Object.freeze({$:'Ok',field0:opaque}),Object.freeze({$:'Err',field0:'é😀'})])assert.strictEqual(api.outcome(value),value);for(const value of [{$:'Some',field0:false},{$:'Some',field0:true},{$:'None'}])assert.strictEqual(api.selected(value),value);for(const value of [{$:'Ok',field0:{$:'None'}},{$:'Ok',field0:{$:'Some',field0:true}},{$:'Err',field0:'expected'}])assert.strictEqual(api.nested(value),value);assert.deepEqual(api.constructed(),{$:'Some',field0:true});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('canonical native generic and concrete qualified library calls become actual imported JS calls',limits,async()=>{
 const native='pub fn optional<T>(value: Option<T>) -> Option<T> { crate::translation_primitive_option_core::option_identity(value) }\npub fn outcome<T>(value: Result<T,String>) -> Result<T,String> { crate::translation_owned_results_core::text_result_identity(value) }\npub fn selected(value: Option<bool>) -> Option<bool> { crate::translation_primitive_option_core::option_identity(value) }\npub fn nested(value: Result<Option<bool>,String>) -> Result<Option<bool>,String> { crate::translation_owned_results_core::text_result_identity(value) }\n',result=translateHttpResourceCallerRust(native,nativeInput(native));assert.ok(sameRustSourceSyntax(native,result.rust));assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);assert.match(result.javascript,/import \{ router_option_identity as http_operation_/u);await verifyHttpResourceTargets(result,api=>{const optional=Object.freeze({$:'Some',field0:true}),outcome=Object.freeze({$:'Ok',field0:optional});assert.strictEqual(api.optional(optional),optional);assert.strictEqual(api.selected(optional),optional);assert.strictEqual(api.outcome(outcome),outcome);assert.strictEqual(api.nested(outcome),outcome);});
});
test('original qualified turbofish calls rejoin inferred calls and lexical generic payloads through fresh library proofs',limits,async()=>{
 const native='pub fn outcome<T>(value: Result<T,String>) -> Result<T,String> { crate::translation_owned_results_core::text_result_identity::<T>(value) }\npub fn selected(value: Option<bool>) -> Option<bool> { crate::translation_primitive_option_core::option_identity::<bool>(crate::translation_primitive_option_core::option_identity(value)) }\npub fn nested(value: Result<Option<bool>,String>) -> Result<Option<bool>,String> { crate::translation_owned_results_core::text_result_identity::<Option<bool>>(value) }\n',result=translateHttpResourceShadowCallerRust(native,nativeInput(native)),history=result.httpResourceRustSourceHistory;assert.equal(history.lexicalBindings.genericCalls.length,3);assert.equal(history.lexicalBindings.genericCalls[1].ordinal,0);assert.equal(history.equation.inverse,native);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));await verifyHttpResourceTargets(result,api=>{const value=Object.freeze({$:'Some',field0:false}),nested=Object.freeze({$:'Ok',field0:value});assert.strictEqual(api.selected(value),value);assert.strictEqual(api.nested(nested),nested);assert.strictEqual(api.outcome(nested),nested);});
});
test('qualified identity retains actual borrowed payload roots through explicit source type arguments',limits,async()=>{
 const value=imports+"import {router_owned_result_str_ok as borrowed} from './runtime/owned-result-runtime.mjs';\nexport function selected(value:string){return result<string>(borrowed(value));}\n",result=translateHttpResourceCallerTypeScript(value,input(value));assert.deepEqual(JSON.parse(result.meta).functions[0].flow.returnRoots,['value']);assert.match(result.javascript,/@type \{ReturnType<typeof borrowed>\}/u);assert.match(result.rust,/fn selected<'a>/u);await verifyHttpResourceTargets(result,api=>assert.deepEqual(api.selected('é😀'),{$:'Ok',field0:'é😀'}));
});
test('library calls cannot bypass payload carrier move arity namespace or source-body obligations',limits,()=>{
 for(const body of [
  'export function bad(value:boolean){return option(value);}',
  'export function bad(value:ReturnType<typeof option<boolean>>){return result(value);}',
  'export function bad(value:ReturnType<typeof result<boolean>>){return option(value);}',
  'export function bad(value:ReturnType<typeof option<boolean>>){return option<bigint>(value);}',
  'export function bad<T>(value:T):T{return option(value);}',
  'export function bad<T>(value:ReturnType<typeof result<T>>):ReturnType<typeof result<T>>{return option(value);}',
  'export function bad(value:ReturnType<typeof option<boolean>>){return option(value,value);}',
  'export function bad(value:ReturnType<typeof option<boolean>>){const moved=option(value);return option(value);}',
  'export function bad(option:boolean){return option(option);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 for(const native of ['pub fn bad(value: Option<bool>) -> Option<bool> { crate::translation_primitive_option_core::option_identity::<u64>(value) }','pub fn bad<T>(value:T) -> T { crate::translation_primitive_option_core::option_identity(value) }','pub fn bad(value:bool) -> bool { crate::translation_owned_results_core::text_result_identity(value) }'])assert.throws(()=>translateHttpResourceShadowCallerRust(native,nativeInput(native)),native);
});
test('changed complete actual libraries and copied generic call flags cannot replace fresh source joins',limits,()=>{
 for(const path of ['src/translation_primitive_option_core.rs','runtime/primitive-option-runtime.mjs','runtime/primitive-option-runtime.d.mts','src/translation_owned_results_core.rs','runtime/owned-result-runtime.mjs','runtime/owned-result-runtime.d.mts']){const changed=input(source);changed.files=changed.files.map(row=>row.path===path?{...row,source:row.source+'\n'}:row);assert.throws(()=>translateHttpResourceCallerTypeScript(source,changed),path);}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='selected').flow.tail.value.local=true;assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));const operation=httpResourceCallerContract('router_option_identity');assert.throws(()=>requireHttpResourceGenericLibraryOperation(operation,null));assert.throws(()=>requireHttpResourceGenericLibraryOperation({...operation,rustPath:'unproved'},()=>{}));assert.throws(()=>indexHttpResourceGenericLibraryOperations([operation,operation]));
 const native='pub fn selected(value:Option<bool>) -> Option<bool> { crate::translation_primitive_option_core::option_identity::<bool>(value) }',fromNative=translateHttpResourceShadowCallerRust(native,nativeInput(native)),copied=JSON.parse(fromNative.meta);copied.functions[0].flow.tail.value.sourceGenericLibrary=false;assert.throws(()=>requireHttpResourceNativeGenericArguments(JSON.stringify(copied),fromNative.httpResourceRustSourceHistory.lexicalBindings));
});
test('an invocation-local operation index drafts 128 qualified calls without repeated whole-table source lookups',limits,async()=>{
 const native='pub fn selected(value: Option<bool>) -> Option<bool> { '+Array.from({length:128},(_,index)=>'let value = crate::translation_primitive_option_core::option_identity'+(index%2?'::<bool>':'')+'(value);').join(' ')+' value }',result=translateHttpResourceShadowCallerRust(native,nativeInput(native));assert.equal(result.httpResourceRustSourceHistory.lexicalBindings.genericCalls.length,64);assert.equal(result.crossInvocationCache,false);await verifyHttpResourceTargets(result,api=>{const value=Object.freeze({$:'Some',field0:true});assert.strictEqual(api.selected(value),value);});
});
test('nine complete generic library-call equations retain both sequences native owners and full source inverses',limits,()=>{
 const plan=prepareHttpResourceGenericLibraryCallSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
