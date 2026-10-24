// Independent behavioral/refusal source. Execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as state from '../json-state-runtime.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object} from '../json-macro-runtime.mjs';
import {emitJsonStateDeclarations} from '../json-state-contracts.mjs';
import {prepareJsonStateCore} from '../prepare-json-state-core.mjs';
import {prepareJsonStateSources} from '../prepare-json-state-sources.mjs';
import {prepareJsonIterationCore} from '../prepare-json-iteration-core.mjs';
import {prepareForwardJsonIteration} from '../prepare-forward-json-iteration.mjs';
const limits={timeout:60_000};
test('array replacement append and both extensions keep original owned inputs independent',limits,()=>{
 const original=array([bool(false)]),value=text('λ😀');
 assert.deepEqual(state.router_state_json_with_index(original,0n,value),array([value]));assert.deepEqual(state.router_state_json_append(original,value),array([bool(false),value]));
 for(const extend of [state.router_state_json_extend,state.router_state_json_extend_owned])assert.deepEqual(extend(original,Object.freeze([value,nil()])),array([bool(false),value,nil()]));
 assert.deepEqual(original,array([bool(false)]));assert.deepEqual(value,text('λ😀'));assert.notEqual(state.router_state_json_append(original,value).field0[1],value);
});
test('owned vector bridges preserve order empty values and independent canonical storage',limits,()=>{
 const values=Object.freeze([nil(),text('λ😀'),bool(false)]),copy=state.router_state_json_values_copy(values),encoded=state.router_state_json_from_values(values),decoded=state.router_state_json_into_values(encoded);
 assert.deepEqual(copy,values);assert.notEqual(copy,values);assert.ok(Object.isFrozen(copy));assert.notEqual(copy[1],values[1]);assert.deepEqual(decoded,values);assert.deepEqual(state.router_state_json_from_values(Object.freeze([])),array([]));assert.deepEqual(state.router_state_json_into_values(array([])),[]);
});
test('object updates retain null semantics collisions and native Unicode key order',limits,()=>{
 const original=object([['old',bool(false)],['😀',text('supplementary')],['\ue000',text('bmp')]]),patch=object([['old',text('changed')],['new',nil()]]);
 assert.deepEqual(state.router_state_json_without_field(original,'old'),object([['😀',text('supplementary')],['\ue000',text('bmp')]]));assert.deepEqual(state.router_state_json_without_field(nil(),'absent'),nil());
 const merged=state.router_state_json_merge(original,patch);assert.deepEqual(merged,object([['old',text('changed')],['new',nil()],['😀',text('supplementary')],['\ue000',text('bmp')]]));assert.deepEqual(state.router_state_json_merge(nil(),object([])),object([]));
 assert.deepEqual(state.router_state_json_object_keys(original),array([text('old'),text('\ue000'),text('😀')]));assert.deepEqual(original,object([['old',bool(false)],['😀',text('supplementary')],['\ue000',text('bmp')]]));
 assert.equal(state.router_state_json_array_len(array([nil(),bool(false)])),2n);assert.equal(state.router_state_json_object_has(original,'old'),true);for(const value of [nil(),bool(false),array([])])assert.equal(state.router_state_json_object_has(value,'old'),false);
});
test('wrong kinds bounds mutation and malformed ABI values remain explicit refusals',limits,()=>{
 for(const value of [nil(),bool(false),object([])]){assert.throws(()=>state.router_state_json_append(value,nil()));assert.throws(()=>state.router_state_json_array_len(value));assert.throws(()=>state.router_state_json_into_values(value));}
 for(const index of [-1n,1n,18446744073709551615n,18446744073709551616n,0])assert.throws(()=>state.router_state_json_with_index(array([nil()]),index,nil()));
 assert.throws(()=>state.router_state_json_extend(array([]),[nil()]));assert.throws(()=>state.router_state_json_values_copy(Object.freeze(new Array(1))));assert.throws(()=>state.router_state_json_merge(object([]),nil()));assert.throws(()=>state.router_state_json_object_keys(array([])));assert.throws(()=>state.router_state_json_without_field(array([]),'x'));
 let traps=0;const proxy=new Proxy({}, {get(){traps++;throw new Error('trap');}});assert.throws(()=>state.router_state_json_append(proxy,nil()));assert.equal(traps,0);
});
test('all new native root and JS source layers preserve full earlier successor histories',limits,()=>{
 const native=prepareJsonStateCore(),sources=prepareJsonStateSources();assert.equal(native.files.length,1);assert.equal(sources.files.length,6);for(const row of [...native.files,...sources.files]){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}
 const parent=prepareJsonIterationCore().files.find(row=>row.path==='rust/src/lib.rs');assert.equal(parent.current,parent.currentAfter);assert.equal(parent.currentAfter,native.files[0].after);assert.equal(parent.laterHistories[0].before,parent.after);
 for(const row of prepareForwardJsonIteration().files)assert.equal(row.current,row.currentAfter);
 assert.equal(readFileSync(new URL('../json-state-runtime.d.mts',import.meta.url),'utf8'),emitJsonStateDeclarations());
});
