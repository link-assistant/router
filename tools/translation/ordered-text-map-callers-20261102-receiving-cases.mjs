// Independent source cases for future complete-profile receiving. UNRUN.
// These are whole functions, not operation-count or header-acceptance evidence.
const map='crate::translation_ordered_text_map_core::OrderedTextMap',core='crate::translation_ordered_text_map_core::text_map_';
export const ORDERED_MAP_FORWARD_ACCEPTANCE_SOURCES=Object.freeze([
 `pub fn make()->${map}{${core}new()}`,
 `pub fn input_count(map:&${map})->u64{${core}len(map)}`,
 `pub fn input_contains(map:&${map})->bool{${core}contains(map,"stream")}`,
 `pub fn input_value(map:&${map})->Option<&str>{${core}get(map,"stream")}`,
 `pub fn stream_query(map:&${map})->bool{match ${core}get(map,"stream"){Some(value)=>value=="true"||value=="1",None=>false}}`,
 `pub fn inserted(map:${map},key:String,value:String)->${map}{${core}insert(map,key,value)}`,
 `pub fn removed(map:${map},key:&str)->${map}{${core}remove(map,key)}`,
 `pub fn copied(map:&${map})->${map}{${core}copy(map)}`,
]);
export const ORDERED_MAP_FORWARD_REFUSAL_SOURCES=Object.freeze([
 `pub fn reused(map:${map},key:String,value:String)->u64{let moved=${core}insert(map,key,value);${core}len(&map)}`,
 `pub fn escaped()->Option<&str>{let map=${core}new();${core}get(&map,"stream")}`,
 `pub fn written_alias(map:&${map})->u64{let alias=map;${core}len(alias)}`,
 `pub fn copied_twice(map:${map})->${map}{let first=map;map}`,
 `pub fn lexical_loan(map:${map})->${map}{let loan=${core}get(&map,"stream");${core}remove(map,"stream")}`,
 `pub fn pairs(map:&${map})->Vec<(String,String)>{${core}pairs(map)}`,
]);
export const ORDERED_MAP_REVERSE_ACCEPTANCE_SOURCE=`
import {router_text_map_new as empty,router_text_map_len as len,router_text_map_contains as contains,router_text_map_get as get,router_text_map_insert as insert} from './runtime/ordered-text-map-20261102-runtime.mjs';
export function make():ReturnType<typeof empty>{return empty();}
export function count(map:Parameters<typeof len>[0]):ReturnType<typeof len>{return len(map);}
export function member(map:Parameters<typeof contains>[0]):boolean{return contains(map,'stream');}
export function value(map:Parameters<typeof get>[0]):ReturnType<typeof get>{return get(map,'stream');}
export function updated(map:Parameters<typeof insert>[0],key:string,value:string):ReturnType<typeof empty>{return insert(map,key,value);}
`;
export const ORDERED_MAP_REVERSE_REFUSAL_SOURCES=Object.freeze([
 `export function forged(map:Readonly<{$:'OrderedTextMap';entries:readonly (readonly [string,string])[]}>):bigint{return 0n;}`,
 `import {router_text_map_get as get} from './unregistered-runtime.mjs';export function replaced(map:Parameters<typeof get>[0]):ReturnType<typeof get>{return get(map,'stream');}`,
 `import {router_text_map_new as empty,router_text_map_get as get} from './runtime/ordered-text-map-20261102-runtime.mjs';export function escaped():ReturnType<typeof get>{const map=empty();return get(map,'stream');}`,
]);
export const ORDERED_MAP_REVERSE_ACCEPTANCE_JAVASCRIPT=`
import {router_text_map_new as empty,router_text_map_len as len,router_text_map_contains as contains,router_text_map_get as get,router_text_map_insert as insert} from './runtime/ordered-text-map-20261102-runtime.mjs';
export function make(){return empty();}
export function count(map){return len(map);}
export function member(map){return contains(map,'stream');}
export function value(map){return get(map,'stream');}
export function updated(map,key,value){return insert(map,key,value);}
`;

export const ORDERED_MAP_KEYS_FORWARD_ACCEPTANCE_SOURCES=Object.freeze([
 `pub fn projected_keys(map:&${map})->Vec<String>{${core}keys(map)}`,
 `pub fn keys_after_update(map:${map},key:String,value:String)->Vec<String>{let keys=${core}keys(&map);let updated=${core}insert(map,key,value);keys}`,
]);
export const ORDERED_MAP_KEYS_FORWARD_REFUSAL_SOURCES=Object.freeze([
 `pub fn reused_keys(map:&${map})->Vec<String>{let keys=${core}keys(map);let moved=keys;keys}`,
 `pub fn external_vector(map:&${map},keys:Vec<String>)->Vec<String>{keys}`,
]);
export const ORDERED_MAP_KEYS_REVERSE_ACCEPTANCE_SOURCE=`
import {router_text_map_keys as keys} from './runtime/ordered-text-map-20261102-runtime.mjs';
export function projectedKeys(map:Parameters<typeof keys>[0]):ReturnType<typeof keys>{return keys(map);}
`;
export const ORDERED_MAP_KEYS_REVERSE_ACCEPTANCE_JAVASCRIPT=`
import {router_text_map_keys as keys} from './runtime/ordered-text-map-20261102-runtime.mjs';
export function projectedKeys(map){return keys(map);}
`;
export const ORDERED_MAP_LOAN_HEADER_TYPESCRIPT=`
import {router_text_map_get as get} from './runtime/ordered-text-map-20261102-runtime.mjs';
export function independentlyBorrowed(map:Parameters<typeof get>[0],key:Parameters<typeof get>[1],unused:Parameters<typeof get>[0]):ReturnType<typeof get>{return get(map,key);}
`;
export const ORDERED_MAP_LOAN_HEADER_JAVASCRIPT=`
import {router_text_map_get as get} from './runtime/ordered-text-map-20261102-runtime.mjs';
export function independentlyBorrowed(map,key,unused){return get(map,key);}
`;
