// Finite ABI equations only. Private original source/symbol checks issue items.
// These immutable rows grant neither serde trait dispatch nor caller authority.
const rows=[
 ['value_get_string',['json-ref','str'],'json-option-ref','get',0],
 ['value_get_usize',['json-ref','usize'],'json-option-ref','get',0],
 ['value_pointer',['json-ref','str'],'json-option-ref','pointer',0],
 ['value_as_str',['json-ref'],'str-option-ref','as_str',0],
 ['value_as_bool',['json-ref'],'bool-option','as_bool',null],
 ['value_as_u64',['json-ref'],'u64-option','as_u64',null],
 ['value_as_i64',['json-ref'],'i64-option','as_i64',null],
 ['value_as_f64',['json-ref'],'f64-option','as_f64',null],
 ['value_as_null',['json-ref'],'unit-option','as_null',null],
 ['value_as_number',['json-ref'],'number-option-ref','as_number',0],
 ['value_as_array',['json-ref'],'array-option-ref','as_array',0],
 ['value_as_object',['json-ref'],'map-option-ref','as_object',0],
 ['value_is_null',['json-ref'],'bool','is_null',null],
 ...JSON_VALUE_PREDICATES.filter(method=>method!=='is_null').map(method=>['value_'+method,['json-ref'],'bool',method,null]),
];
const operations=Object.freeze(rows.map(([name,args,ret,method,root])=>Object.freeze({name:'serde_json_'+name,args:Object.freeze(args),ret,method,root})));
export const ownedJsonReaderOperation=name=>operations.find(row=>row.name===name)??null;
const payloads=Object.freeze({'json-option-ref':'json-ref','str-option-ref':'str','bool-option':'bool','u64-option':'u64','i64-option':'i64','f64-option':'f64','unit-option':'unit','number-option-ref':'json-number-ref','array-option-ref':'json-array-ref','map-option-ref':'map-ref'});
export const ownedJsonOptionalPayload=type=>Object.hasOwn(payloads,type)?payloads[type]:null;
export const ownedJsonBorrowed=type=>type==='json-option-ref'||type==='str-option-ref'||type==='str-text-result'||['number-option-ref','array-option-ref','map-option-ref','json-number-ref','json-array-ref'].includes(type);
export const ownedJsonRustTypes=Object.freeze({'json-option-ref':"::std::option::Option<&'a crate::translation_core::Json>",'str-option-ref':"::std::option::Option<&'a str>",'bool-option':'::std::option::Option<bool>','u64-option':'::std::option::Option<u64>','i64-option':'::std::option::Option<i64>','f64-option':'::std::option::Option<f64>','unit-option':'::std::option::Option<()>','number-option-ref':"::std::option::Option<&'a ::serde_json::Number>",'array-option-ref':"::std::option::Option<&'a ::std::vec::Vec<crate::translation_core::Json>>",'map-option-ref':"::std::option::Option<&'a ::serde_json::Map<::std::string::String,crate::translation_core::Json>>",'json-number-ref':"&'a ::serde_json::Number",'json-array-ref':"&'a ::std::vec::Vec<crate::translation_core::Json>",f64:'f64',unit:'()',u64:'u64',i64:'i64'});
const maybe=value=>"Readonly<{$:'None'}>|Readonly<{$:'Some';field0:"+value+'}>';
export const ownedJsonTypeScriptTypes=Object.freeze({'json-option-ref':maybe('JsonValue'),'str-option-ref':maybe('string'),'bool-option':maybe('boolean'),'u64-option':maybe('bigint'),'i64-option':maybe('bigint'),'f64-option':maybe('number'),'unit-option':maybe('null'),'number-option-ref':maybe("Extract<JsonValue,{readonly $:'Number'}>['field0']"),'array-option-ref':maybe("Extract<JsonValue,{readonly $:'Array'}>['field0']"),'map-option-ref':maybe("Extract<JsonValue,{readonly $:'Object'}>['field0']"),'json-number-ref':"Extract<JsonValue,{readonly $:'Number'}>['field0']",'json-array-ref':"Extract<JsonValue,{readonly $:'Array'}>['field0']",f64:'number',unit:'null',u64:'bigint',i64:'bigint'});
/** Arguments have already been independently bound exactly once, in source order. */
export function ownedJsonReaderRustCall(name,args){
 const op=ownedJsonReaderOperation(name);if(!op||!Array.isArray(args)||args.length!==op.args.length||args.some(name=>typeof name!=='string'||!/^__ro_arg_[0-9]+$/u.test(name)))throw TypeError('Owned reverse JSON: exact operation and bound operands required');
 if(name==='serde_json_value_get_usize')return 'match usize::try_from('+args[1]+') { Ok(index) => ::serde_json::Value::get('+args[0]+', index), Err(_) => None }';
 return '::serde_json::Value::'+op.method+'('+args.join(', ')+')';
}

// Separate NEW checked-carrier operation; the original eight readers are exact.
const optionalInputOperations=Object.freeze(operations.filter(row=>row.name.startsWith('serde_json_value_as_')&&row.args.length===1&&row.args[0]==='json-ref'&&ownedJsonOptionalPayload(row.ret)!==null).map(row=>Object.freeze({name:'router_core_json_option_'+row.method,member:row.method,input:'json-option-input',ret:row.ret,root:row.root})));
export const ownedJsonOptionalReaderOperation=name=>optionalInputOperations.find(row=>row.name===name)??null;
export function ownedJsonOptionalReaderRustCall(name,argument){const row=ownedJsonOptionalReaderOperation(name);if(!row||typeof argument!=='string'||!/^__ro_arg_[0-9]+$/u.test(argument))throw TypeError('Owned optional JSON: fixed operation and bound input required');return 'match '+argument+' { Some(value) => ::serde_json::Value::'+row.member+'(value), None => None }';}
export function ownedJsonReaderTypeWitness(type){return typeof type==='string'&&ownedJsonOptionalPayload(type)?operations.find(row=>row.ret===type)?.name??null:null;}

import {JSON_VALUE_PREDICATES} from '../json-value-predicates.mjs';

// Source DATA rendering only. The caller reissues the original complete function;
// fresh native forward checking still owns namespace, signature and loan proof.
export function nativeJsonPredicateSource(name,argument){
 const op=ownedJsonReaderOperation(name);if(!op||op.ret!=='bool'||op.args.length!==1||op.args[0]!=='json-ref'||op.root!==null||typeof argument!=='string'||!/^&?(?:[a-z][a-z0-9_]*|__ro_arg_[0-9]+)$/u.test(argument))throw new TypeError('Native JSON predicate requires the exact registered scalar operation and a checked emitted binder');
 return '::serde_json::Value::'+op.method+'('+argument+')';
}
