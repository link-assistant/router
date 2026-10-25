// Independent owned JSON list literal SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceListLiteralSources} from '../../prepare-http-resource-list-literal-sources.mjs';
import {json_macro_null as nil,json_macro_string as text,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {json_macro_null as nil,json_macro_string as text,json_macro_array as array} from './runtime/json-macro-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_state_json_from_values as fromValues} from './runtime/json-state-runtime.mjs';
`;
const source=imports+`export function values(input:string){return [nil(),text(input)];}
export function assembled(input:string){return fromValues([nil(),text(input)]);}
export function moved(value:ReturnType<typeof copy>){return [value];}
export function selected(input:string){const values=[nil(),text(input)];let selected=nil();for(const item of values){selected=copy(item);}return selected;}
export function empty(){return [];}
export function originalEmpty(){return array([]);}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('owned list literals compose original values moves collection calls and shared iteration',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.typescript,source);assert.match(result.rust,/::std::vec!\[/u);await verifyHttpResourceTargets(result,async api=>{for(const value of ['', 'é😀']){assert.deepEqual(api.values(value),[nil(),text(value)]);assert.deepEqual(api.assembled(value),array([nil(),text(value)]));assert.deepEqual(api.selected(value),text(value));}assert.deepEqual(api.moved(nil()),[nil()]);assert.deepEqual(api.empty(),[]);assert.deepEqual(api.originalEmpty(),array([]));});assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
});
test('complete fully qualified native vector syntax reproduces every original list and source inverse',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),native=translateHttpResourceCallerRust(result.rust,{...input(result.rust,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(result.rust,native.rust));for(const equation of result.targetSourceEquations)assert.equal(equation.inverse,source);
 const unknown='pub fn values() -> ::std::vec::Vec<crate::translation_core::Json> { vec![] }\n';assert.throws(()=>translateHttpResourceCallerRust(unknown,{...input(unknown,'src/caller.rs'),javascriptPath:'caller.mjs'}));
});
test('holes spreads non-JSON elements oversized constructors and repeated moves retain explicit refusals',limits,()=>{
 for(const body of [
  'export function bad(){return [,nil()];}',
  'export function bad(){const values=[nil()];return [...values];}',
  'export function bad(){return [true];}',
  'export function bad(){return [\'text\'];}',
  'export function bad(input:Parameters<typeof copy>[0]){return [input];}',
  'export function bad(input:ReturnType<typeof copy>){return [input,input];}',
  'export function bad(input:ReturnType<typeof copy>){return [input,copy(input)];}',
  'export function bad(){return ['+Array(4097).fill('nil()').join(',')+'];}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body.slice(0,120));}
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='values').flow.tail.value.elements[0].type='str';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
});
test('complete original literal checker reader and projection retain all inverse rule phases',limits,()=>{
 const plan=prepareHttpResourceListLiteralSources();assert.equal(plan.files.length,5);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
