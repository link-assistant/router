// Finite operation DATA. Real source/type/loan checks issue all caller facts.
const rows=[
 ['json_field','str','json-option-ref',0],
 ['json_index','u64','json-option-ref',0],
 ['json_str_field','str','str-option-ref',0],
 ['json_str_field_or_empty','str','str',0],
 ['json_bool_field','str','bool-option',null],
 ['json_u64_field','str','u64-option',null],
 ['json_i64_field','str','i64-option',null],
];
export const JSON_FIELD_CONTRACTS=Object.freeze(rows.map(([rustName,key,returns,root])=>Object.freeze({rustName,javascriptName:'router_field_'+rustName,args:Object.freeze(['json-ref',key]),ret:returns,root,rustPath:'crate::translation_json_fields_core::'+rustName,runtimeModule:'json-fields-runtime.mjs',nativeSource:'src/translation_json_fields_core.rs',parameters:Object.freeze(['shared-json',key]),sourceAuthority:false,semanticAuthority:false})));
export const jsonFieldContract=name=>JSON_FIELD_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;
export function emitJsonFieldDeclarations(){
 const returns={'json-option-ref':'JsonValue','str-option-ref':'string','bool-option':'boolean','u64-option':'bigint','i64-option':'bigint'};
 return "import type {JsonValue} from './json-macro-runtime.mjs';\ntype Maybe<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\n"+JSON_FIELD_CONTRACTS.map(row=>'export declare function '+row.javascriptName+'(value:JsonValue,key:'+(row.args[1]==='str'?'string':'bigint')+'): '+(row.ret==='str'?'string':'Maybe<'+returns[row.ret]+'>')+';').join('\n')+'\n';
}
