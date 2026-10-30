// Independent callback runtime regression SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as callback from '../primitive-option-callback-runtime.mjs';
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS,emitPrimitiveOptionCallbackDeclarations} from '../primitive-option-callback-contracts.mjs';
import {PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE} from '../primitive-option-callback-native-source.mjs';
import {preparePrimitiveOptionCallbackRuntime} from '../prepare-primitive-option-callback-runtime.mjs';
import {preparePrimitiveOptionCallbackCore} from '../prepare-primitive-option-callback-core.mjs';
import {preparePrimitiveOptionCallbackRootSources} from '../prepare-primitive-option-callback-root-sources.mjs';
import {preparePrimitiveOptionCore} from '../prepare-primitive-option-core.mjs';
const limits={timeout:60000},some=field0=>({$:'Some',field0}),none=()=>({$:'None'}),inputs={bool:true,u64:1n,i64:9223372036854775807n,str:'input😀'},outputs={bool:false,u64:18446744073709551615n,i64:-9223372036854775808n,str:''};
test('all sixteen mapping pairs invoke once for Some and preserve false zero-boundary and empty outputs',limits,()=>{
 for(const input of ['bool','u64','i64','str'])for(const output of ['bool','u64','i64','str']){const map=callback['router_option_callback_'+input+'_to_'+output+'_map'];let calls=0;const transform=value=>{calls++;assert.equal(value,inputs[input]);return outputs[output];};assert.deepEqual(map(some(inputs[input]),transform),some(outputs[output]));assert.equal(calls,1);assert.deepEqual(map(none(),transform),none());assert.equal(calls,1);}
});
test('all sixteen flat mapping pairs preserve returned absence and never invoke a None callback',limits,()=>{
 for(const input of ['bool','u64','i64','str'])for(const output of ['bool','u64','i64','str']){const bind=callback['router_option_callback_'+input+'_to_'+output+'_and_then'];let calls=0;assert.deepEqual(bind(some(inputs[input]),value=>{calls++;assert.equal(value,inputs[input]);return some(outputs[output]);}),some(outputs[output]));assert.deepEqual(bind(some(inputs[input]),()=>{calls++;return none();}),none());assert.deepEqual(bind(none(),()=>{calls++;throw Error('must not run');}),none());assert.equal(calls,2);}
});
test('lazy fallbacks retain actual Some discriminants and execute only a missing branch',limits,()=>{
 for(const [domain,value,fallback]of [['bool',false,true],['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],['str','','fallback😀']]){const choose=callback['router_option_callback_'+domain+'_unwrap_or_else'];let calls=0;assert.equal(choose(some(value),()=>{calls++;return fallback;}),value);assert.equal(calls,0);assert.equal(choose(none(),()=>{calls++;return fallback;}),fallback);assert.equal(calls,1);}
});
test('actual callback faults propagate and malformed results or callable proxies refuse without traps',limits,()=>{
 const marker=Error('callback failure');assert.throws(()=>callback.router_option_callback_u64_to_bool_map(some(0n),()=>{throw marker;}),error=>error===marker);assert.throws(()=>callback.router_option_callback_u64_to_bool_map(some(0n),()=>0),TypeError);assert.throws(()=>callback.router_option_callback_bool_to_u64_map(some(false),()=>-1n),TypeError);assert.throws(()=>callback.router_option_callback_bool_to_str_map(some(false),()=>'\ud800'),TypeError);assert.throws(()=>callback.router_option_callback_bool_to_str_map(some(false),()=>'é'.repeat(524289)),RangeError);assert.throws(()=>callback.router_option_callback_u64_to_bool_and_then(some(0n),()=>({$:'Some',field0:0})),TypeError);
 let traps=0;const proxy=new Proxy(()=>true,{apply(){traps++;throw Error('must not run');}});assert.throws(()=>callback.router_option_callback_u64_to_bool_map(none(),proxy),TypeError);assert.equal(traps,0);assert.throws(()=>callback.router_option_callback_u64_to_bool_map(none(),null),TypeError);let getters=0;const invalid=Object.defineProperty({$:'Some'},'field0',{enumerable:true,get(){getters++;throw Error('must not run');}});assert.throws(()=>callback.router_option_callback_u64_to_bool_and_then(some(0n),()=>invalid),TypeError);assert.equal(getters,0);
});
test('full runtime predecessor declarations native source and all root histories remain separate source data',limits,()=>{
 assert.equal(PRIMITIVE_OPTION_CALLBACK_CONTRACTS.length,59);assert.equal(readFileSync(new URL('../primitive-option-callback-runtime.d.mts',import.meta.url),'utf8'),emitPrimitiveOptionCallbackDeclarations());assert.equal(readFileSync(new URL('../../../rust/src/translation_primitive_option_callbacks_core.rs',import.meta.url),'utf8'),PRIMITIVE_OPTION_CALLBACK_NATIVE_SOURCE);for(const row of PRIMITIVE_OPTION_CALLBACK_CONTRACTS){assert.equal(typeof callback[row.javascriptName],'function');assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);}
 for(const plan of [preparePrimitiveOptionCallbackRuntime(),preparePrimitiveOptionCallbackCore(),preparePrimitiveOptionCallbackRootSources(),preparePrimitiveOptionCore()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(preparePrimitiveOptionCallbackCore().files[0].nativeRustGrammarChecked,false);
});
