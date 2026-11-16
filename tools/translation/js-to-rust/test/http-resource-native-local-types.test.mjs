// Independent native written-local SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceShadowCallerRust} from '../http-resource-shadow-rust.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {requireHttpResourceNativeLocalTypes} from '../http-resource-native-local-types.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceNativeLocalTypeSources} from '../../prepare-http-resource-native-local-type-sources.mjs';
const limits={timeout:60000};
const source=`pub fn boolean(input: bool) -> bool { let input: bool = (!input); input }
pub fn natural() -> u64 { let value: u64 = 18446744073709551615_u64; value }
pub fn signed() -> bool { let value: i64 = 1_i64; (value > 0_i64) }
pub fn unused_signed() -> bool { let unused: i64 = 1_i64; true }
pub fn identity<T>(value: T) -> T { let value: T = value; value }
pub fn text<'a>(input: &'a str) -> &'a str { let input: &'a str = input; input }
pub fn octets() -> ::std::vec::Vec<u8> { let bytes: ::std::vec::Vec<u8> = ::std::vec![0_u8, 255_u8]; bytes }
`;
function input(value,sourcePath='src/caller.rs'){return {sourcePath,javascriptPath:'caller.mjs',...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('written native locals remain exact obligations over independently checked Boolean integer generic text and byte values',limits,async()=>{
 const result=translateHttpResourceShadowCallerRust(source,input(source)),history=result.httpResourceRustSourceHistory;assert.equal(result.originalRust,source);assert.equal(history.lexicalBindings.annotations.length,7);assert.equal(history.lexicalBindings.equation.inverse,source);assert.ok(sameRustSourceSyntax(history.normalizedSource,result.rust));assert.match(result.javascript,/@type/u);
 await verifyHttpResourceTargets(result,api=>{assert.equal(api.boolean(true),false);assert.equal(api.boolean(false),true);assert.equal(api.natural(),18446744073709551615n);assert.equal(api.signed(),true);assert.equal(api.unused_signed(),true);const original=Object.freeze({original:true});assert.strictEqual(api.identity(original),original);assert.equal(api.text('é😀'),'é😀');assert.deepEqual(api.octets(),[0n,255n]);});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const meta=JSON.parse(result.meta),signed=meta.functions.find(row=>row.name==='unused_signed');assert.equal(signed.flow.steps[0].value.type,'i64');
});
test('canonical native signed locals keep their original width even without an i64 return or later numeric operation',limits,async()=>{
 const native='pub fn selected() -> bool { let unused = 1_i64; true }\n',result=translateHttpResourceCallerRust(native,input(native));assert.ok(sameRustSourceSyntax(native,result.rust));assert.match(result.javascript,/@type/u);assert.equal(JSON.parse(result.meta).functions[0].flow.steps[0].value.type,'i64');await verifyHttpResourceTargets(result,api=>assert.equal(api.selected(),true));
});
test('the entire repeated typed-shadow family resolves each initializer before its new declaration',limits,async()=>{
 const native='pub fn parity(value: bool) -> bool { '+Array(128).fill('let value: bool = (!value);').join(' ')+' value }\n',result=translateHttpResourceShadowCallerRust(native,input(native));assert.equal(result.httpResourceRustSourceHistory.lexicalBindings.annotations.length,128);await verifyHttpResourceTargets(result,api=>{assert.equal(api.parity(true),true);assert.equal(api.parity(false),false);});assert.equal(result.httpResourceRustSourceHistory.equation.inverse,native);
});
test('written annotations cannot change actual primitive width generic slot owner borrowed roots or original meta',limits,()=>{
 for(const native of [
  'pub fn bad() -> bool { let value: bool = 1_u64; true }',
  'pub fn bad() -> bool { let value: u64 = 1_i64; true }',
  'pub fn bad() -> bool { let value: i64 = 1_u64; true }',
  'pub fn bad<T>(value: T) -> T { let value: bool = value; value }',
  'pub fn bad() -> bool { let value: Unknown = true; value }',
  "pub fn bad<'a>(value: &'a str) -> &'a str { let value: &'static str = value; value }",
  'pub fn bad(value: String) -> String { let value: String = value; let again: String = value; value }',
 ])assert.throws(()=>translateHttpResourceShadowCallerRust(native,input(native)),native);
 const result=translateHttpResourceShadowCallerRust(source,input(source)),normalization=result.httpResourceRustSourceHistory.lexicalBindings,meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='signed').flow.steps[0].value.type='u64';assert.throws(()=>requireHttpResourceNativeLocalTypes(JSON.stringify(meta),normalization));const stale=structuredClone(normalization);stale.annotations[0].target='missing_original_binding';assert.throws(()=>requireHttpResourceNativeLocalTypes(result.meta,stale));
});
test('all complete local-type reader binding projection and source histories retain the original two phases',limits,()=>{
 const plan=prepareHttpResourceNativeLocalTypeSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
