// Independent owned-list/shared-slice regression SOURCE. All cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceJsonListSources} from '../../prepare-http-resource-json-list-sources.mjs';
import {projectHttpResourceUnitJavaScript} from '../../http-resource-unit-signatures.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_state_json_values_copy as copyValues,router_state_json_into_values as intoValues,router_state_json_from_values as fromValues,router_state_json_extend as extend,router_state_json_extend_owned as extendOwned} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {json_macro_array as array} from './runtime/json-macro-runtime.mjs';
`;
const source=imports+`/** @param {Parameters<typeof copyValues>[0]} values */ export function copied(values){return copyValues(values);}
/** @param {Parameters<typeof copyValues>[0]} values */ export function assembled(values){const owned=copyValues(values);return fromValues(owned);}
/** @param {Parameters<typeof copy>[0]} base */ export function extracted(base){return intoValues(copy(base));}
/** @param {Parameters<typeof copyValues>[0]} values */ export function extended(values){return extend(array([]),values);}
/** @param {Parameters<typeof copyValues>[0]} values */ export function moved(values){const owned=copyValues(values);return extendOwned(array([]),owned);}
/** @param {Parameters<typeof copyValues>[0]} values */ export function refreshed(values){let owned=copyValues(values);let pending=true;while(pending){owned=copyValues(owned);pending=false;}return owned;}
/** @param {Parameters<typeof copyValues>[0]} values */ export function borrowed(values){return shared(values);}
/** @param {Parameters<typeof copyValues>[0]} values */ function shared(values){return values;}
/** @param {Parameters<typeof copyValues>[0]} values */ export function localView(values){const owned=copyValues(values);const view=shared(owned);return copyValues(view);}
`;
function input(value,sourcePath='caller.mjs',extra=[]){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value},...extra])};}
test('actual owned Vec and shared slice operations preserve moves values loops and receiving types',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/::std::vec::Vec<crate::translation_core::Json>/u);assert.match(result.rust,/borrowed<'a>\(values: &'a \[crate::translation_core::Json\]\) -> &'a \[crate::translation_core::Json\]/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const values=Object.freeze([nil(),text('é😀')]),expected=array(values);await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.copied(values),values);assert.notStrictEqual(api.copied(values),values);assert.deepEqual(api.assembled(values),expected);assert.deepEqual(api.extracted(expected),values);assert.deepEqual(api.extended(values),expected);assert.deepEqual(api.moved(values),expected);assert.deepEqual(api.refreshed(values),values);assert.strictEqual(api.borrowed(values),values);assert.deepEqual(api.localView(values),values);assert.throws(()=>api.copied(new Proxy(values,{})),TypeError);});
});
test('native paired source annotation proposals retain actual slice domains instead of raw array shapes',limits,()=>{
 const prefix="import {router_state_json_values_copy as copyValues} from './runtime/json-state-runtime.mjs';\n",bare=prefix+'export function copied(values){return copyValues(values);}\n',typed=prefix+'export function copied(values:Parameters<typeof copyValues>[0]){return copyValues(values);}\n',options=input(bare,'caller.mjs',[{path:'caller.mts',source:typed}]),unit={paths:{JavaScript:'caller.mjs',TypeScript:'caller.mts'},runtimes:{JavaScript:'runtime',TypeScript:'runtime'}},proposal=projectHttpResourceUnitJavaScript(bare,{unit,current:{JavaScript:bare,TypeScript:typed},options});assert.equal(proposal.history.equation.inverse,bare);const updated={...options,files:options.files.map(row=>row.path==='caller.mjs'?{path:row.path,source:proposal.source}:row)},result=translateHttpResourceCallerJavaScript(proposal.source,updated);assert.equal(JSON.parse(result.meta).functions[0].parameters[0].type,'json-list-ref');
});
test('owned list reuse escaping local slices incompatible replacement and array-shape erasure refuse',limits,()=>{
 const helper='/** @param {Parameters<typeof copyValues>[0]} values */ function shared(values){return values;}';for(const body of [
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){const owned=copyValues(values);const first=fromValues(owned);return fromValues(owned);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){const owned=copyValues(values);return shared(owned);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){let owned=copyValues(values);const view=shared(owned);owned=copyValues(values);return copyValues(view);}',
  '/** @param {Parameters<typeof copyValues>[0]} values */ export function bad(values){let owned=copyValues(values);owned=array([]);return owned;}',
  '/** @param {readonly unknown[]} values */ export function bad(values){return copyValues(values);}',
 ]){const value=imports+helper+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='copied').returns='json';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('whole handwritten native qualified Vec and slice types reproduce every source token',limits,()=>{
 const native='pub fn copied(values: &[crate::translation_core::Json]) -> ::std::vec::Vec<crate::translation_core::Json> { crate::translation_state_core::json_values_copy(values) }\n',result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));
});
test('all complete original domains contracts flow native projection and source-unit copies retain both inverses',limits,()=>{
 const plan=prepareHttpResourceJsonListSources();assert.equal(plan.files.length,9);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
