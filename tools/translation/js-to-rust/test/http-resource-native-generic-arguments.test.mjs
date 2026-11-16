// Independent original turbofish SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {normalizeHttpResourceRustBindings} from '../http-resource-native-bindings.mjs';
import {readHttpResourceBindingRustFunction} from '../http-resource-binding-rust-syntax.mjs';
import {requireHttpResourceNativeGenericArguments} from '../http-resource-native-generic-arguments.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeGenericArgumentSources} from '../../prepare-http-resource-native-generic-argument-sources.mjs';
const limits={timeout:60000};
const helpers=`pub fn raw<T>(value: T) -> T { value }
pub fn option<T>(value: Option<T>) -> Option<T> { value }
pub fn result<T>(value: Result<T,String>) -> Result<T,String> { value }
`;
const source=helpers+`pub fn booleans(value: bool) -> bool { raw::<bool>(raw(value)) }
pub fn inferred(value: bool) -> bool { raw::<_>(raw::<bool>(value)) }
pub fn commented(value: bool) -> bool { raw::</* retain full original */ bool,>(value) }
pub fn natural(value: u64) -> u64 { raw::<u64>(value) }
pub fn signed(value: i64) -> i64 { raw::<i64>(value) }
pub fn optional(value: Option<bool>) -> Option<bool> { option::<bool>(value) }
pub fn outcome(value: Result<bool,String>) -> Result<bool,String> { result::<bool>(value) }
pub fn nested(value: Result<Option<bool>,String>) -> Result<Option<bool>,String> { result::<Option<bool>>(value) }
pub fn forwarded<T>(value: Result<T,String>) -> Result<T,String> { raw::<Result<T,String>>(result::<T>(value)) }
pub fn text<'a>(value: &'a str) -> &'a str { raw::<&str>(value) }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('original explicit local generic arguments rejoin whole checked JS TS meta and complete native inverses',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory,normalization=history.lexicalBindings;assert.equal(result.originalRust,source);assert.equal(normalization.genericCalls.length,12);assert.equal(normalization.equation.inverse,source);assert.equal(history.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.match(source,/retain full original/u);assert.doesNotMatch(history.normalizedSource,/::<bool>/u);const ordinal=normalization.genericCalls.find(row=>row.function==='booleans');assert.equal(ordinal.ordinal,0);assert.deepEqual(normalization.genericCalls.filter(row=>row.function==='inferred').map(row=>row.ordinal),[0,1]);
 const javascript=translateHttpResourceCallerJavaScript(result.javascript,{sourcePath:'caller.mjs',...httpResourceReceivingData([{path:'caller.mjs',source:result.javascript}])}),typescript=translateHttpResourceCallerTypeScript(result.typescript,{sourcePath:'caller.mts',...httpResourceReceivingData([{path:'caller.mts',source:result.typescript}])});assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.ok(sameRustSourceSyntax(result.rust,typescript.rust));
 await verifyHttpResourceTargets(result,api=>{for(const value of [false,true])for(const name of ['booleans','inferred','commented'])assert.equal(api[name](value),value);assert.equal(api.natural(18446744073709551615n),18446744073709551615n);assert.equal(api.signed(-9223372036854775808n),-9223372036854775808n);assert.equal(api.text('é😀'),'é😀');for(const value of [{$:'None'},{$:'Some',field0:false},{$:'Some',field0:true}])assert.strictEqual(api.optional(value),value);for(const value of [{$:'Ok',field0:false},{$:'Ok',field0:true},{$:'Err',field0:'é😀'}])assert.strictEqual(api.outcome(value),value);for(const value of [{$:'Ok',field0:{$:'Some',field0:true}},{$:'Err',field0:'expected'}])assert.strictEqual(api.nested(value),value);const opaque=new Proxy({},{get(){throw Error('opaque');},ownKeys(){throw Error('opaque');}}),value=Object.freeze({$:'Ok',field0:opaque});assert.strictEqual(api.forwarded(value),value);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('original native generic suffix reader preserves token boundaries nested closes comments and exact suffix spans',limits,()=>{
 const native='fn selected(value: Result<Option<bool>,String>) -> Result<Option<bool>,String> { raw::<Result<Option<bool>,String>>(value) }',fn=readHttpResourceBindingRustFunction(native),call=fn.body.tail;assert.equal(call.path,'raw');assert.equal(call.typeArguments.length,1);assert.equal(call.typeArguments[0].map(row=>row.text).join(''),'Result<Option<bool>,String>');assert.equal(native.slice(call.typeArgumentsSpan.start,call.typeArgumentsSpan.end),'::<Result<Option<bool>,String>>');assert.equal(native.slice(call.nameSpan.start,call.nameSpan.end),'raw');
 for(const native of ['fn bad() -> bool { raw::<>(true) }','fn bad() -> bool { raw::<bool(true) }','fn bad() -> bool { raw::<bool]>(true) }','fn bad() -> bool { None::<bool> }','fn bad() -> bool { vec!::<bool>(true) }'])assert.throws(()=>readHttpResourceBindingRustFunction(native),native);
});
test('concrete caller type arguments cannot alter widths carrier slots lexical slots or unqualified operations',limits,()=>{
 for(const body of [
  'pub fn bad(value: bool) -> bool { raw::<u64>(value) }',
  'pub fn bad(value: u64) -> u64 { raw::<i64>(value) }',
  'pub fn bad(value: Option<bool>) -> Option<bool> { option::<u64>(value) }',
  'pub fn bad(value: Result<bool,String>) -> Result<bool,String> { result::<u64>(value) }',
  'pub fn bad<T>(value: Result<T,String>) -> Result<T,String> { raw::<T>(value) }',
  'pub fn bad<T>(value: Result<T,String>) -> Result<T,String> { result::<Result<T,String>>(value) }',
  'pub fn bad(value: bool) -> bool { raw::<b o o l>(value) }',
  'pub fn bad(value: bool) -> bool { raw::<r#bool>(value) }',
  'pub fn bad(value: bool) -> bool { raw::<bool,bool>(value) }',
  "pub fn bad(value: bool) -> bool { raw::<'a>(value) }",
  'pub fn bad(value: bool) -> bool { missing::<bool>(value) }',
  'pub fn bad(value: bool) -> Option<bool> { Some::<bool>(value) }',
  'pub fn bad<T>(value: Option<T>) -> Option<T> { let Some(inner) = value else { return None; }; Some::<bool>(inner) }',
  'pub fn plain(value: bool) -> bool { value } pub fn bad(value: bool) -> bool { plain::<bool>(value) }',
  'pub fn bad(value: bool) -> bool { let raw = value; raw::<bool>(value) }',
 ]){const native=helpers+body;assert.throws(()=>translateHttpResourceShadowCallerRust(native,input(native)),body);}
});
test('a typed discarded Result arm cannot disappear into propagation without an original type proof',limits,()=>{
 const native=helpers+'pub fn bad(value: Result<bool,String>) -> Result<bool,String> { let inner = match value { Ok(inner) => inner, Err(error) => return Err::<bool,String>(error) }; Ok(inner) }';assert.throws(()=>normalizeHttpResourceRustBindings(native));assert.throws(()=>translateHttpResourceShadowCallerRust(native,input(native)));
});
test('original generic obligations refuse changed calls duplicate selections and forged source/meta',limits,()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),normalization=result.httpResourceRustSourceHistory.lexicalBindings,meta=JSON.parse(result.meta),changed=structuredClone(normalization);changed.genericCalls[0].typeArguments[0][0].text='u64';assert.throws(()=>requireHttpResourceNativeGenericArguments(result.meta,changed));const duplicated=structuredClone(normalization);duplicated.genericCalls.push(duplicated.genericCalls[0]);assert.throws(()=>requireHttpResourceNativeGenericArguments(result.meta,duplicated));const absent=structuredClone(normalization);absent.genericCalls[0].ordinal=1000;assert.throws(()=>requireHttpResourceNativeGenericArguments(result.meta,absent));meta.functions.find(row=>row.name==='booleans').flow.tail.value.args[0].type='u64';assert.throws(()=>requireHttpResourceNativeGenericArguments(JSON.stringify(meta),normalization));assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),result.javascript,{sourcePath:'caller.mjs',...httpResourceReceivingData([{path:'caller.mjs',source:result.javascript}])}));
 const stale=source.replace('raw::<bool>(raw(value))','raw::<u64>(raw(value))');assert.throws(()=>translateHttpResourceShadowCallerRust(stale,input(stale)));
});
test('the original generic binding sequence drafts repeated typed and inferred calls without saved verdicts',limits,async()=>{
 const native=helpers+'pub fn selected(value: bool) -> bool { '+Array.from({length:128},(_,index)=>'let value = raw'+(index%2?'::<bool>':'')+'(value);').join(' ')+' value }',result=translateHttpResourceShadowCallerRust(native,input(native));assert.equal(result.httpResourceRustSourceHistory.lexicalBindings.genericCalls.length,64);assert.deepEqual(result.httpResourceRustSourceHistory.lexicalBindings.genericCalls.map(row=>row.ordinal),Array.from({length:64},(_,index)=>index*2+1));assert.equal(result.httpResourceRustSourceHistory.lexicalBindings.crossInvocationCache,false);await verifyHttpResourceTargets(result,api=>{assert.equal(api.selected(true),true);assert.equal(api.selected(false),false);});
});
test('six complete original generic argument equations retain native owners both phases and full inverses',limits,()=>{
 const plan=prepareHttpResourceNativeGenericArgumentSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
