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
 ['value_is_null',['json-ref'],'bool','is_null',null],
];
const operations=Object.freeze(rows.map(([name,args,ret,method,root])=>Object.freeze({name:'serde_json_'+name,args:Object.freeze(args),ret,method,root})));
export const ownedJsonReaderOperation=name=>operations.find(row=>row.name===name)??null;
const payloads=Object.freeze({'json-option-ref':'json-ref','str-option-ref':'str','bool-option':'bool','u64-option':'u64','i64-option':'i64'});
export const ownedJsonOptionalPayload=type=>Object.hasOwn(payloads,type)?payloads[type]:null;
export const ownedJsonBorrowed=type=>type==='json-option-ref'||type==='str-option-ref';
export const ownedJsonRustTypes=Object.freeze({'json-option-ref':"::std::option::Option<&'a crate::translation_core::Json>",'str-option-ref':"::std::option::Option<&'a str>",'bool-option':'::std::option::Option<bool>','u64-option':'::std::option::Option<u64>','i64-option':'::std::option::Option<i64>',u64:'u64',i64:'i64'});
const maybe=value=>"Readonly<{$:'None'}>|Readonly<{$:'Some';field0:"+value+'}>';
export const ownedJsonTypeScriptTypes=Object.freeze({'json-option-ref':maybe('JsonValue'),'str-option-ref':maybe('string'),'bool-option':maybe('boolean'),'u64-option':maybe('bigint'),'i64-option':maybe('bigint'),u64:'bigint',i64:'bigint'});
/** Arguments have already been independently bound exactly once, in source order. */
export function ownedJsonReaderRustCall(name,args){
 const op=ownedJsonReaderOperation(name);if(!op||!Array.isArray(args)||args.length!==op.args.length||args.some(name=>typeof name!=='string'||!/^__ro_arg_[0-9]+$/u.test(name)))throw TypeError('Owned reverse JSON: exact operation and bound operands required');
 if(name==='serde_json_value_get_usize')return 'match usize::try_from('+args[1]+') { Ok(index) => ::serde_json::Value::get('+args[0]+', index), Err(_) => None }';
 return '::serde_json::Value::'+op.method+'('+args.join(', ')+')';
}
