// Independent bounded native/JS library boundary source cases. ALL UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_vector_json_copy,router_vector_json_validate,router_vector_json_with_field,router_core_json_copy} from '../json-update-runtime.mjs';
import {json_macro_null,json_macro_string,json_macro_array,json_macro_object} from '../json-macro-runtime.mjs';
import {BOUNDED_JSON_CORE_SOURCE,BOUNDED_JSON_CORE_SHA256} from '../bounded-json-core-source-data.mjs';
import {createHash} from 'node:crypto';
import {prepareBoundedJsonCoreSources} from '../prepare-bounded-json-core-sources.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex'),blank=json_macro_null;
function nested(count){let value=blank();for(let at=0;at<count;at++)value={$:'Array',field0:[value]};return value;}
test('bounded validator and copy preserve canonical values and independent nested storage without changing the old copy export',limits,()=>{
 const value=json_macro_object([['Ω',json_macro_array([json_macro_string('😀'),blank()])]]);assert.equal(router_vector_json_validate(value),undefined);const copy=router_vector_json_copy(value);assert.deepEqual(copy,value);assert.notEqual(copy,value);assert.notEqual(copy.field0,value.field0);assert.notEqual(copy.field0.entries[0].value.field0,value.field0.entries[0].value.field0);assert.deepEqual(copy,router_core_json_copy(value));
});
test('root-inclusive node and depth limits retain their exact boundary counts',limits,()=>{
 const atLimit={$:'Array',field0:Array.from({length:4095},blank)},overLimit={$:'Array',field0:Array.from({length:4096},blank)};for(const operation of [router_vector_json_copy,router_vector_json_validate]){assert.doesNotThrow(()=>operation(atLimit));assert.throws(()=>operation(overLimit));assert.doesNotThrow(()=>operation(nested(32)));assert.throws(()=>operation(nested(33)));}
});
test('invalid canonical tags key order scalar strings accessors and proxy records cannot run arbitrary input hooks',limits,()=>{
 let touched=false;const getter={get $(){touched=true;throw Error('input getter');}},proxy=new Proxy({},{get(){touched=true;throw Error('input proxy');},ownKeys(){touched=true;throw Error('input proxy');}});for(const operation of [router_vector_json_copy,router_vector_json_validate])for(const value of [null,{},{$:'String',field0:'\ud800'},{$:'Other'},getter,proxy,{$:'Object',field0:{$:'Map',entries:[{$:'MapEntry',key:'z',value:blank()},{$:'MapEntry',key:'a',value:blank()}]}}])assert.throws(()=>operation(value));assert.equal(touched,false);
});
test('field update validates both inputs and the complete combined result budget',limits,()=>{
 const base=json_macro_object([['old',blank()]]),value=json_macro_array([json_macro_string('Ω😀')]),result=router_vector_json_with_field(base,'new',value);assert.equal(base.field0.entries.length,1);assert.equal(result.field0.entries.length,2);assert.notEqual(result.field0.entries[0].value,value);const array={$:'Array',field0:Array.from({length:2047},blank)},largeBase={$:'Object',field0:{$:'Map',entries:[{$:'MapEntry',key:'left',value:array}]}};assert.throws(()=>router_vector_json_with_field(largeBase,'right',array));assert.throws(()=>router_vector_json_with_field({$:'Bool',field0:false},'x',blank()));
});
test('complete bounded native helper root declaration and native history retain full source and CST inverses',limits,()=>{
 assert.equal(BOUNDED_JSON_CORE_SOURCE,readFileSync(new URL('../../../rust/src/translation_json_core.rs',import.meta.url),'utf8'));assert.equal(hash(BOUNDED_JSON_CORE_SOURCE),BOUNDED_JSON_CORE_SHA256);const plan=prepareBoundedJsonCoreSources();assert.equal(plan.files.length,5);assert.equal(plan.nativeHelpers.length,1);assert.equal(plan.nativeHelpers[0].path,'rust/src/translation_json_core.rs');assert.equal(plan.nativeHelpers[0].source,BOUNDED_JSON_CORE_SOURCE);assert.equal(plan.nativeInputs.files.length,17);assert.equal(plan.nativeInputs.files.reduce((count,row)=>count+row.historyChain.length,0),21);const root=plan.nativeInputs.files.find(row=>row.path==='rust/src/lib.rs');assert.ok(root.after.includes('pub mod translation_json_core;'));assert.equal(root.inverse,root.before);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
});
