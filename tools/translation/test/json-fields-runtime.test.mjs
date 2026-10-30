// Independent regression SOURCE only. Execution waits for the complete draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fields from '../json-fields-runtime.mjs';
import {emitJsonFieldDeclarations} from '../json-field-contracts.mjs';
import {readFileSync} from 'node:fs';
import {json_macro_null as nil,json_macro_bool as bool,json_macro_string as text,json_macro_array as array,json_macro_object as object,json_macro_u64 as unsigned,json_macro_i64 as signed} from '../json-macro-runtime.mjs';
const none={$:'None'},some=field0=>({$:'Some',field0}),limits={timeout:30_000};
test('presence null false zero empty strings and numeric domains stay distinct',limits,()=>{
 const value=object([['null',nil()],['false',bool(false)],['zero',unsigned(0n)],['empty',text('')],['max',unsigned(18446744073709551615n)],['negative',signed(-1n)],['__proto__',text('λ😀')]]);
 assert.deepEqual(fields.router_field_json_field(value,'missing'),none);assert.deepEqual(fields.router_field_json_field(value,'null'),some(nil()));assert.deepEqual(fields.router_field_json_bool_field(value,'false'),some(false));assert.deepEqual(fields.router_field_json_str_field(value,'empty'),some(''));assert.deepEqual(fields.router_field_json_str_field(value,'__proto__'),some('λ😀'));
 assert.deepEqual(fields.router_field_json_u64_field(value,'zero'),some(0n));assert.deepEqual(fields.router_field_json_i64_field(value,'zero'),some(0n));assert.deepEqual(fields.router_field_json_u64_field(value,'max'),some(18446744073709551615n));assert.deepEqual(fields.router_field_json_i64_field(value,'max'),none);assert.deepEqual(fields.router_field_json_i64_field(value,'negative'),some(-1n));assert.deepEqual(fields.router_field_json_u64_field(value,'negative'),none);assert.deepEqual(fields.router_field_json_bool_field(value,'null'),none);assert.deepEqual(fields.router_field_json_str_field(value,'false'),none);
});
test('index zero absent bounds foreign kinds and malformed inputs retain original reader refusals',limits,()=>{
 const value=array([nil(),text('λ😀')]);assert.deepEqual(fields.router_field_json_index(value,0n),some(nil()));assert.deepEqual(fields.router_field_json_index(value,1n),some(text('λ😀')));assert.deepEqual(fields.router_field_json_index(value,2n),none);assert.deepEqual(fields.router_field_json_index(value,18446744073709551615n),none);assert.deepEqual(fields.router_field_json_index(nil(),0n),none);assert.throws(()=>fields.router_field_json_index(value,-1n));
 let reads=0;const proxy=new Proxy(value,{get(){reads++;throw Error('get');},getPrototypeOf(){reads++;throw Error('prototype');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');}});assert.throws(()=>fields.router_field_json_field(proxy,'name'));assert.equal(reads,0);assert.throws(()=>fields.router_field_json_str_field(object([]),'\ud800'));
 assert.equal(readFileSync(new URL('../json-fields-runtime.d.mts',import.meta.url),'utf8'),emitJsonFieldDeclarations());
});
