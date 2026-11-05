// Finite owned JSON library boundary; no general Iterator or mutation permit.
import {types} from 'node:util';
import {assertImmutableIterator} from './extensions/iterator-runtime.mjs';
import {json_macro_value,json_macro_array} from './json-macro-runtime.mjs';
const fail=message=>{throw new TypeError('Owned JSON iteration: '+message);};
function input(values,callback){
 if(types.isProxy(values)||!Array.isArray(values)||types.isProxy(callback)||typeof callback!=='function')fail('ordinary immutable array and callback required');
 assertImmutableIterator(values);if(values.length>4096)fail('original input bound exceeded');
 for(let index=0;index<values.length;index++)json_macro_value(values[index]);
}
function predicate(callback,value){const result=callback(value);if(typeof result!=='boolean')fail('predicate requires an actual boolean');return result;}
export function router_core_json_filter(values,callback){
 input(values,callback);const selected=[];for(let index=0;index<values.length;index++)if(predicate(callback,values[index]))selected.push(values[index]);
 return json_macro_array(Object.freeze(selected)).field0;
}
export function router_core_json_any(values,callback){
 input(values,callback);for(let index=0;index<values.length;index++)if(predicate(callback,values[index]))return true;return false;
}
export function router_core_json_all(values,callback){
 input(values,callback);for(let index=0;index<values.length;index++)if(!predicate(callback,values[index]))return false;return true;
}
export function router_core_json_find(values,callback){
 input(values,callback);for(let index=0;index<values.length;index++)if(predicate(callback,values[index]))return Object.freeze({$:'Some',field0:json_macro_value(values[index])});return Object.freeze({$:'None'});
}
export function router_core_json_fold(values,initial,callback){
 input(values,callback);let current=json_macro_value(initial);
 for(let index=0;index<values.length;index++)current=json_macro_value(callback(current,values[index]));
 return current;
}
