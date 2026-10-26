// Independent original generic constructor-context SOURCE. All cases unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {readHttpResourceRustFunction} from '../http-resource-rust-syntax.mjs';
import {readHttpResourceNativeGenericArgumentType,requireHttpResourceNativeGenericArguments} from '../http-resource-native-generic-arguments.mjs';
import {indexHttpResourceNativeGenericCallHints} from '../http-resource-native-generic-call-hints.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {rustTokens} from '../../rust-structure.mjs';
import {prepareHttpResourceGenericConstructorContextSources} from '../../prepare-http-resource-generic-constructor-context-sources.mjs';
const limits={timeout:60000};
const imports=`import {router_option_identity as option} from './runtime/primitive-option-runtime.mjs';
import {router_text_result_identity as result} from './runtime/owned-result-runtime.mjs';
import {router_text_repeat as text} from './runtime/text-runtime.mjs';
`;
const source=imports+`type Optional<T> = ReturnType<typeof option<T>>;
type Outcome<T> = ReturnType<typeof result<T>>;
function raw<T>(value:T):T{return value;}
export function absent(){return option<boolean>({$:'None'});}
export function nested(){return raw<Optional<Optional<boolean>>>({$:'Some',field0:{$:'None'}});}
export function success(){return result<Optional<boolean>>({$:'Ok',field0:{$:'None'}});}
export function failure(error:ReturnType<typeof text>){return result<boolean>({$:'Err',field0:error});}
export function inferred():Optional<boolean>{return option({$:'None'});}
export function selected(flag:boolean){return option<boolean>(flag?{$:'None'}:{$:'Some',field0:true});}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
function nativeInput(value){return {...input(value,'src/caller.rs'),javascriptPath:'caller.mjs'};}
test('actual explicit and enclosing generic contexts type absent nested success and error constructors in JS and strict TS',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.match(result.javascript,/@type \{ReturnType<typeof option<boolean>>\}/u);assert.match(result.rust,/Result<Option<bool>, String>/u);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.absent(),{$:'None'});assert.deepEqual(api.nested(),{$:'Some',field0:{$:'None'}});assert.deepEqual(api.success(),{$:'Ok',field0:{$:'None'}});for(const message of ['','é😀','\0'])assert.deepEqual(api.failure(message),{$:'Err',field0:message});assert.deepEqual(api.inferred(),{$:'None'});assert.deepEqual(api.selected(true),{$:'None'});assert.deepEqual(api.selected(false),{$:'Some',field0:true});});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('original Rust explicit constructor hints select actual call nodes and remain independently checked obligations',limits,async()=>{
 const native='fn raw<T>(value:T) -> T { value }\nfn option<T>(value:Option<T>) -> Option<T> { value }\npub fn absent() -> Option<bool> { let value = raw::<Option<bool>>(None); value }\npub fn nested() -> Option<Option<bool>> { let value = option::<Option<bool>>(Some(None)); value }\npub fn success() -> Result<Option<bool>,String> { let value = crate::translation_owned_results_core::text_result_identity::<Option<bool>>(Ok(None)); value }\npub fn failure(error:String) -> Result<bool,String> { let value = crate::translation_owned_results_core::text_result_identity::<bool>(Err(error)); value }\npub fn nested_calls() -> Option<bool> { let value = raw::<Option<bool>>(raw(None)); value }\npub fn inferred() -> Option<bool> { raw(None) }\n',result=translateHttpResourceShadowCallerRust(native,nativeInput(native)),history=result.httpResourceRustSourceHistory;assert.equal(history.lexicalBindings.genericCalls.length,5);assert.equal(history.equation.inverse,native);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.match(result.javascript,/@type/u);await verifyHttpResourceTargets(result,api=>{assert.deepEqual(api.absent(),{$:'None'});assert.deepEqual(api.nested(),{$:'Some',field0:{$:'None'}});assert.deepEqual(api.success(),{$:'Ok',field0:{$:'None'}});assert.deepEqual(api.failure('é😀'),{$:'Err',field0:'é😀'});assert.deepEqual(api.nested_calls(),{$:'None'});assert.deepEqual(api.inferred(),{$:'None'});});
});
test('constructor hints cannot override actual scalar width payload carrier error ownership or explicit native tokens',limits,()=>{
 for(const body of [
  'export function bad(){return option<boolean>({$:"Some",field0:1n});}',
  'export function bad(){return result<boolean>({$:"Ok",field0:1n});}',
  'export function bad(){return result<boolean>({$:"Err",field0:"borrowed"});}',
  'export function bad(){return option<boolean>({$:"Ok",field0:true});}',
  'export function bad(){return result<boolean>({$:"None"});}',
  'export function bad(){return option({$:"None"});}',
  'export function bad(){return raw<Optional<boolean>>({$:"Some",field0:1n});}',
 ]){const value=imports+'function raw<T>(value:T):T{return value;}\n'+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
 for(const native of ['fn raw<T>(value:T) -> T { value } pub fn bad() -> Option<bool> { let value = raw::<Option<u64>>(Some(true)); value }','fn raw<T>(value:T) -> T { value } pub fn bad() -> Option<bool> { let value = raw::<O p t i o n<bool>>(None); value }','pub fn bad(error:&str) -> Result<bool,String> { crate::translation_owned_results_core::text_result_identity::<bool>(Err(error)) }'])assert.throws(()=>translateHttpResourceShadowCallerRust(native,nativeInput(native)),native);
});
test('the source type parser preserves exact token boundaries inference and actual lexical generic slots',limits,()=>{
 assert.equal(readHttpResourceNativeGenericArgumentType(rustTokens('Option<Result<bool,String>>')),'optional:http-result:bool');assert.equal(readHttpResourceNativeGenericArgumentType(rustTokens('Result<T,String>'),{slot:'T'}),'http-result:generic:T');assert.equal(readHttpResourceNativeGenericArgumentType(rustTokens('_')),null);for(const text of ['b o o l','Option<Unknown>','Option<_>',"&'static str",'Unknown','Result<bool,Unknown>'])assert.throws(()=>readHttpResourceNativeGenericArgumentType(rustTokens(text)),text);
 const fn=readHttpResourceRustFunction('fn value() -> bool { true }');assert.ok(indexHttpResourceNativeGenericCallHints([fn],[],new Map()) instanceof WeakMap);assert.throws(()=>indexHttpResourceNativeGenericCallHints([fn],[{function:'value',operation:'absent',ordinal:0,typeArguments:[rustTokens('bool')]}],new Map()));
});
test('source-derived constructor proposals do not authorize changed original type selections or copied semantic meta',limits,()=>{
 const native='fn raw<T>(value:T) -> T { value } pub fn absent() -> Option<bool> { let value = raw::<Option<bool>>(None); value }',result=translateHttpResourceShadowCallerRust(native,nativeInput(native)),normalization=structuredClone(result.httpResourceRustSourceHistory.lexicalBindings);normalization.genericCalls[0].typeArguments[0]=rustTokens('Option<u64>');assert.throws(()=>requireHttpResourceNativeGenericArguments(result.meta,normalization));const meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='absent').flow.steps[0].value.type='optional:u64';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),result.javascript,input(result.javascript,'caller.mjs')));const changed=input(result.javascript,'caller.mjs');changed.files=changed.files.map(row=>row.path==='runtime/primitive-option-runtime.mjs'?{...row,source:row.source+'\n'}:row);assert.throws(()=>translateHttpResourceCallerJavaScript(result.javascript,changed));
});
test('seven complete constructor context equations retain language repository and complete original source inverses',limits,()=>{
 const plan=prepareHttpResourceGenericConstructorContextSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
