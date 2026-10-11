// Registered serde_json 1.0.151 Value instantiations, not Router function copies.
import {BOOL,STRING,UNIT,FLOAT,fixed,array} from '../vendor/meta-language/translation/types.js';
import {monomorphicTypeName} from '../monomorphic.mjs';
import {SOURCE_STR,SOURCE_STRING,sourceShared,sourceVector} from './source-contract-types.mjs';
const named=(...path)=>({kind:'named',path}),span={start:0,end:0};
const field=(name,type)=>({name,type}),ctor=(name,type)=>({name,fields:type?[field('field0',type)]:[]});
const declaration=(name,ctors,standardGeneric)=>({k:'data',name,ctors,span,generated:'router-json-contract',...(standardGeneric?{standardGeneric}:{})});
function freeze(value){if(value && typeof value === 'object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
export const JSON_TYPES=freeze({value:named('serde_json','Value'),number:named('serde_json','Number'),map:named('serde_json','Map_String_Value'),entry:named('serde_json','MapEntry'),error:named('serde_json','Error'),category:named('serde_json','error','Category')});
const {value:VALUE,number:NUMBER,map:MAP,entry:ENTRY,error:ERROR,category:CATEGORY}=JSON_TYPES;
const U64={...fixed(64,false),rustPrimitiveName:'u64'},I64={...fixed(64,true),rustPrimitiveName:'i64'},USIZE={...fixed(64,false),rustPrimitiveName:'usize'},BYTES=sourceVector({...fixed(8,false),rustPrimitiveName:'u8'}),VALUES=sourceVector(VALUE);
const SHARED_VALUE=sourceShared(VALUE),SHARED_NUMBER=sourceShared(NUMBER),SHARED_MAP=sourceShared(MAP),SHARED_VALUES=sourceShared(VALUES);
const BORROWED_BYTES={...sourceShared({...array({...fixed(8,false),rustPrimitiveName:'u8'}),rustOwnership:{kind:'borrowed',source:'slice'}}),rustOwnership:{kind:'borrowed',source:'slice'}};
const option=type=>({...named(monomorphicTypeName('Option',[type])),rustStandardGeneric:{kind:'Option',arguments:[type]}});
const result=type=>({...named(monomorphicTypeName('Result',[type,ERROR])),rustStandardGeneric:{kind:'Result',arguments:[type,ERROR]}});
const optionTypes=[VALUE,NUMBER,MAP,SOURCE_STR,BOOL,U64,I64,FLOAT,UNIT,VALUES,SHARED_VALUE,SHARED_NUMBER,SHARED_MAP,SHARED_VALUES];
const resultTypes=[VALUE,SOURCE_STRING,BYTES];
export const JSON_DATA=freeze([
  {k:'module',name:'serde_json',span,generated:'router-json-contract',items:[
    declaration('Value',[ctor('Null'),ctor('Bool',BOOL),ctor('Number',NUMBER),ctor('String',SOURCE_STRING),ctor('Array',VALUES),ctor('Object',MAP)]),
    declaration('Number',[ctor('PosInt',U64),ctor('NegInt',I64),ctor('Float',FLOAT)]),
    declaration('MapEntry',[{name:'MapEntry',fields:[field('key',SOURCE_STRING),field('value',VALUE)]}]),
    declaration('Map_String_Value',[{name:'Map',fields:[field('entries',array(ENTRY))]}]),
    declaration('Error',[{name:'JsonError',fields:[field('category',CATEGORY),field('line',USIZE),field('column',USIZE),field('message',STRING)]}]),
    {k:'module',name:'error',span,generated:'router-json-contract',items:[declaration('Category',['Io','Syntax','Data','Eof'].map(name=>ctor(name)))]},
  ]},
  ...optionTypes.map(type=>declaration(monomorphicTypeName('Option',[type]),[ctor('None'),ctor('Some',type)],{kind:'Option',arguments:[type]})),
  ...resultTypes.map(type=>declaration(monomorphicTypeName('Result',[type,ERROR]),[ctor('Ok',type),ctor('Err',ERROR)],{kind:'Result',arguments:[type,ERROR]})),
]);
const assumptions=[
  'Registered overloads instantiate serde_json::Value only; arbitrary Deserialize/Serialize derives require separately checked layouts.',
  'The pinned default feature profile has no preserve_order, arbitrary_precision or float_roundtrip; a different profile requires another capability.',
  'Value is an immutable checked recursive algebraic value, not an untyped JavaScript object; mutable borrows remain frontend obligations.',
  'Numbers preserve i64/u64 BigInt and finite binary64 independently; invalid typed values abort rather than being coerced to JSON null.',
  'Default decimal decoding follows the pinned source u64 accumulator and rounded binary64 scaling, including truncated overflowing fractional digits.',
  'Object keys follow Rust UTF-8 byte order, duplicate input keys retain their last value, and JSON strings contain Unicode scalar values.',
  'Rust differential execution remains gated on the full JavaScript checks; source-derived numeric and syntax fixtures do not establish whole-program parity.',
];
const contract=(id,rustPath,params,ret,extra={})=>({id,jsExport:id,rustPath:rustPath.split('::'),async:false,params,ret,assumptions,...extra});
const method=(id,owner,method,args,ret,extra={})=>contract(`serde_json_${id}`,`serde_json::${owner}::${method}`,[owner === 'Value'?VALUE:owner === 'Number'?NUMBER:owner === 'Error'?ERROR:MAP,...args],ret,{kind:'method',receiver:owner === 'Value'?VALUE:owner === 'Number'?NUMBER:owner === 'Error'?ERROR:MAP,...extra});
export const JSON_CONTRACTS=freeze([
  contract('serde_json_from_str','serde_json::from_str',[SOURCE_STR],result(VALUE),{kind:'function',instantiation:VALUE,rustSignature:'from_str::<Value>(&str) -> Result<Value, Error>'}),
  contract('serde_json_from_slice','serde_json::from_slice',[BORROWED_BYTES],result(VALUE),{kind:'function',instantiation:VALUE,rustSignature:'from_slice::<Value>(&[u8]) -> Result<Value, Error>'}),
  ...['to_string','to_string_pretty','to_vec','to_vec_pretty'].map(name=>contract(`serde_json_${name}`,`serde_json::${name}`,[VALUE],result(name.startsWith('to_vec')?BYTES:SOURCE_STRING),{kind:'function',instantiation:VALUE})),
  method('value_get_string','Value','get',[SOURCE_STR],option(SHARED_VALUE),{overload:'string'}),
  method('value_get_usize','Value','get',[USIZE],option(SHARED_VALUE),{overload:'usize'}),
  method('value_index_string','Value','index',[SOURCE_STR],SHARED_VALUE,{overload:'string',kind:'index'}),
  method('value_index_usize','Value','index',[USIZE],SHARED_VALUE,{overload:'usize',kind:'index'}),
  method('value_pointer','Value','pointer',[SOURCE_STR],option(SHARED_VALUE)),
  ...[['str',SOURCE_STR],['bool',BOOL],['u64',U64],['i64',I64],['f64',FLOAT],['null',UNIT],['number',SHARED_NUMBER],['array',SHARED_VALUES],['object',SHARED_MAP]].map(([name,type])=>method(`value_as_${name}`,'Value',`as_${name}`,[],option(type))),
  ...['null','boolean','number','string','array','object','u64','i64','f64'].map(name=>method(`value_is_${name}`,'Value',`is_${name}`,[],BOOL)),
  ...[['u64',U64],['i64',I64],['f64',FLOAT]].map(([name,type])=>method(`number_as_${name}`,'Number',`as_${name}`,[],option(type))),
  ...['u64','i64','f64'].map(name=>method(`number_is_${name}`,'Number',`is_${name}`,[],BOOL)),
  contract('serde_json_number_from_u64','serde_json::Number::from',[U64],NUMBER,{kind:'function',overload:'u64'}),
  contract('serde_json_number_from_i64','serde_json::Number::from',[I64],NUMBER,{kind:'function',overload:'i64'}),
  contract('serde_json_number_from_f64','serde_json::Number::from_f64',[FLOAT],option(NUMBER),{kind:'function'}),
  method('map_get','Map','get',[SOURCE_STR],option(SHARED_VALUE)),method('map_values','Map','values',[],{...VALUES,rustGenericIdentityUnresolved:true}),method('map_keys','Map','keys',[],{...array(SOURCE_STRING),rustGenericIdentityUnresolved:true}),method('map_len','Map','len',[],USIZE),method('map_is_empty','Map','is_empty',[],BOOL),
  method('error_classify','Error','classify',[],CATEGORY),method('error_line','Error','line',[],USIZE),method('error_column','Error','column',[],USIZE),method('error_to_string','Error','to_string',[],SOURCE_STRING),
  ...['io','syntax','data','eof'].map(name=>method(`error_is_${name}`,'Error',`is_${name}`,[],BOOL)),
]);
export const jsonContracts=rustPath=>JSON_CONTRACTS.filter(contract=>contract.rustPath.join('::') === (Array.isArray(rustPath)?rustPath.join('::'):rustPath));
