// Independent original typed-arrow regression SOURCE. Every case remains unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceTypedCallbackSources} from '../../prepare-http-resource-typed-callback-sources.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_object as object,json_macro_array as array} from '../../json-macro-runtime.mjs';
const limits={timeout:60000},imports=`import {router_state_json_values_copy as copyValues,router_state_json_from_values as fromValues,router_state_json_append as append,router_state_json_object_has as has} from './runtime/json-state-runtime.mjs';
import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';
import {router_core_json_map as map} from './runtime/json-collections-runtime.mjs';
import {router_core_json_filter as filter,router_core_json_fold as fold} from './runtime/json-iteration-runtime.mjs';
import {json_macro_array as array} from './runtime/json-macro-runtime.mjs';
import {router_http_transport_open as open} from './runtime/http-transport-runtime.mjs';
`;
const source=imports+`export function mapped(values:Parameters<typeof copyValues>[0]){return map(values,(value:Parameters<typeof copyValues>[0][number]):ReturnType<typeof copy>=>copy(value));}
export function selected(values:Parameters<typeof copyValues>[0]){return filter(values,(value:Parameters<Parameters<typeof filter>[1]>[0]):boolean=>has(value,'keep'));}
export function folded(values:Parameters<typeof copyValues>[0]){return fold(values,array([]),(acc:Parameters<Parameters<typeof fold>[2]>[0],value:Parameters<Parameters<typeof fold>[2]>[1]):ReturnType<Parameters<typeof fold>[2]>=>append(acc,copy(value)));}
export function nested(values:Parameters<typeof copyValues>[0],choice:boolean){let result=array([]);if(choice){const retained=filter(values,(value:Parameters<typeof has>[0]):boolean=>has(value,'keep'));result=fromValues(retained);}return result;}
export function looped(values:Parameters<typeof copyValues>[0]){let pending=true;let result=array([]);while(pending){const items=map(values,(value:Parameters<typeof has>[0]):ReturnType<typeof copy>=>copy(value));result=fromValues(items);pending=false;}return result;}
`;
function input(value,sourcePath='caller.mts'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual nested native operation types govern typed arrow domains and complete JS erasure inverses',limits,async()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source));assert.equal(result.typescript,source);assert.ok(result.targetSourceEquations.every(row=>row.inverse===source));assert.doesNotMatch(result.javascript,/\bvalue\s*:/u);const javascript=translateHttpResourceCallerJavaScript(result.javascript,input(result.javascript,'caller.mjs'));assert.ok(sameRustSourceSyntax(result.rust,javascript.rust));assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 const first=object([['keep',bool(true)]]),second=object([['other',nil()]]),values=Object.freeze([first,second]);await verifyHttpResourceTargets(result,async api=>{assert.deepEqual(api.mapped(values),values);assert.deepEqual(api.selected(values),Object.freeze([first]));assert.deepEqual(api.folded(values),array(values));assert.deepEqual(api.nested(values,true),array([first]));assert.deepEqual(api.nested(values,false),array([]));assert.deepEqual(api.looped(values),array(values));});
});
test('wrong callback domains async ReturnType wrappers unknown aliases captures and invalid indices refuse',limits,()=>{
 for(const body of [
  'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,(value:boolean):boolean=>true);}',
  'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,(value:Parameters<typeof has>[0]):ReturnType<typeof copy>=>has(value,\'keep\'));}',
  'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,(value:Parameters<typeof has>[0]):ReturnType<typeof open>=>has(value,\'keep\'));}',
  'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,(value:JsonValue):boolean=>true);}',
  'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,(value:Parameters<Parameters<typeof filter>[1]>[2]):boolean=>true);}',
  'export function bad(values:Parameters<typeof copyValues>[0],fallback:boolean){return filter(values,(value:Parameters<typeof has>[0]):boolean=>fallback);}',
  'export function bad(values:Parameters<typeof copyValues>[0]){return filter(values,<T>(value:T):boolean=>true);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerTypeScript(value,input(value)),body);}
});
test('written types are obligations and forged typed callback meta cannot replace original source',limits,()=>{
 const result=translateHttpResourceCallerTypeScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='folded').flow.tail.value.args[2].parameters[0].type='json-ref';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source),{language:'TypeScript'}));
 const changed=source.replace('ReturnType<typeof copy>=>copy(value)','boolean=>copy(value)');assert.throws(()=>translateHttpResourceCallerTypeScript(changed,input(changed)));
});
test('complete original flow source capture and source histories keep both ordered native inverses',limits,()=>{
 const plan=prepareHttpResourceTypedCallbackSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
