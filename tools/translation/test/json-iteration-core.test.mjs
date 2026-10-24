// Independent case source. All runtime/compiler execution remains deferred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {router_core_json_filter as filter,router_core_json_any as any,router_core_json_all as all,router_core_json_find as find,router_core_json_fold as fold} from '../json-iteration-runtime.mjs';
import {json_macro_null,json_macro_bool,json_macro_string,json_macro_object} from '../json-macro-runtime.mjs';
import {prepareJsonIterationCore} from '../prepare-json-iteration-core.mjs';
import {emitJsonIterationDeclarations} from '../json-iteration-contracts.mjs';
const limits={timeout:60_000};
test('owned filter preserves order and creates independent canonical JSON storage',limits,()=>{
 const a=json_macro_string('λ😀'),b=json_macro_bool(false),values=Object.freeze([json_macro_null(),a,b]),seen=[];
 const result=filter(values,value=>{seen.push(value.$);return value.$!=='Null';});assert.deepEqual(seen,['Null','String','Bool']);assert.deepEqual(result,[a,b]);assert.ok(Object.isFrozen(result));assert.notEqual(result[0],a);assert.deepEqual(values,[json_macro_null(),a,b]);
});
test('any all and find short circuit at their first decisive value',limits,()=>{
 const values=Object.freeze([json_macro_string('first'),json_macro_null(),json_macro_string('last')]);
 for(const [run,predicate,expected]of [[any,value=>value.$==='Null',true],[all,value=>value.$!=='Null',false],[find,value=>value.$==='Null',{$:'Some',field0:json_macro_null()}]]){
  const seen=[];assert.deepEqual(run(values,value=>{seen.push(value.$);return predicate(value);}),expected);assert.deepEqual(seen,['String','Null']);
 }
 assert.deepEqual(find(values,()=>false),{$:'None'});
});
test('empty predicate identities and owned initial fold value remain distinct',limits,()=>{
 const empty=Object.freeze([]),callback=()=>assert.fail('empty callback');assert.equal(any(empty,callback),false);assert.equal(all(empty,callback),true);assert.deepEqual(find(empty,callback),{$:'None'});assert.deepEqual(filter(empty,callback),[]);
 const initial=json_macro_object([['name',json_macro_string('initial')]]),result=fold(empty,initial,callback);assert.deepEqual(result,initial);assert.notEqual(result,initial);
});
test('fold retains left-to-right accumulator semantics including Null',limits,()=>{
 const values=Object.freeze([json_macro_string('a'),json_macro_null(),json_macro_bool(false)]),seen=[];
 const result=fold(values,json_macro_string('start'),(accumulator,value)=>{seen.push([accumulator.$,value.$]);return value;});assert.deepEqual(seen,[['String','String'],['String','Null'],['Null','Bool']]);assert.deepEqual(result,json_macro_bool(false));
});
test('predicate coercion effects and later callbacks never hide early errors',limits,()=>{
 const values=Object.freeze([json_macro_null(),json_macro_bool(true)]),sentinel=new Error('stop');
 for(const run of [filter,any,all,find]){let calls=0;assert.throws(()=>run(values,()=>{calls++;throw sentinel;}),value=>value===sentinel);assert.equal(calls,1);assert.throws(()=>run(values,()=>1),/actual boolean/);assert.throws(()=>run([...values],()=>true));}
 assert.throws(()=>fold(values,json_macro_null(),()=>undefined));
});
test('complete native module and host registrations retain both original source inverse sequences',limits,()=>{
 const plan=prepareJsonIterationCore();assert.equal(plan.files.length,2);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.files[0].nativeRustGrammarChecked,false);assert.equal(plan.rustExecuted,false);
 assert.equal(readFileSync(new URL('../json-iteration-runtime.d.mts',import.meta.url),'utf8'),emitJsonIterationDeclarations());
});
