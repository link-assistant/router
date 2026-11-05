// Independent SOURCE cases; execution is deferred until complete bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as carrier from '../owned-outcome-runtime.mjs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_object as object} from '../json-macro-runtime.mjs';
const limits={timeout:10_000};
test('Some null is distinct from None and Err text remains distinct from JSON values',limits,()=>{
 const value=object([['λ😀',nil()],['disabled',bool(false)]]),ok=carrier.router_carrier_json_ok(value),error=carrier.router_carrier_json_err('λ😀\u0000');assert.deepEqual(ok,{$:'Ok',field0:value});assert.notEqual(ok.field0,value);assert.deepEqual(error,{$:'Err',field0:'λ😀\u0000'});
 assert.deepEqual(carrier.router_carrier_json_option_to_result(carrier.router_carrier_json_some(nil()),'missing'),{$:'Ok',field0:nil()});assert.deepEqual(carrier.router_carrier_json_option_to_result(carrier.router_carrier_json_none(),'missing'),{$:'Err',field0:'missing'});assert.deepEqual(carrier.router_carrier_json_result_to_option(error),{$:'None'});assert.deepEqual(carrier.router_carrier_json_result_to_option(ok),{$:'Some',field0:value});
 assert.deepEqual(carrier.router_carrier_json_result_or(error,text('fallback')),text('fallback'));assert.deepEqual(carrier.router_carrier_json_option_or(carrier.router_carrier_json_none(),bool(false)),bool(false));assert.deepEqual(carrier.router_carrier_json_option_or(carrier.router_carrier_json_some(nil()),bool(false)),nil());assert.notEqual(carrier.router_carrier_json_result_copy(ok),ok);
});
test('malformed proxies accessor payloads and unknown fields refuse before invoking them',limits,()=>{
 let reads=0;const accessor={$:'Ok',get field0(){reads++;return nil();}},proxy=new Proxy({$:'Ok',field0:nil()},{get(){reads++;throw new Error('trap');}});
 for(const value of [null,{$:'Ok'},{$:'Err',field0:nil()},{$:'Other',field0:nil()},{$:'Ok',field0:nil(),extra:true},accessor,proxy])assert.throws(()=>carrier.router_carrier_json_result_copy(value));assert.equal(reads,0);
 for(const value of [{$:'None',field0:nil()},{$:'Some'},{$:'Some',field0:undefined}])assert.throws(()=>carrier.router_carrier_json_option_or(value,nil()));assert.throws(()=>carrier.router_carrier_json_err('\ud800'));
});
test('the caller evaluates all operands once left to right and eager fallback validation remains observable',limits,()=>{
 const calls=[],operand=(name,value)=>{calls.push(name);return value;};assert.deepEqual(carrier.router_carrier_json_result_or(operand('result',{$:'Ok',field0:nil()}),operand('fallback',text('unused'))),nil());assert.deepEqual(calls,['result','fallback']);assert.throws(()=>carrier.router_carrier_json_result_or({$:'Ok',field0:nil()},undefined));assert.throws(()=>carrier.router_carrier_json_option_to_result({$:'Some',field0:nil()},'\ud800'));
});
