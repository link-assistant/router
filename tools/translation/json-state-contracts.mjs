// One extensible operation description. Rows are DATA and issue no source,
// native binding, ownership or executable permission.
const rows=[
 ['json_with_index',['owned-json','u64','owned-json'],'owned-json'],
 ['json_append',['owned-json','owned-json'],'owned-json'],
 ['json_extend',['owned-json','shared-json-list'],'owned-json'],
 ['json_extend_owned',['owned-json','owned-json-list'],'owned-json'],
 ['json_from_values',['owned-json-list'],'owned-json'],
 ['json_values_copy',['shared-json-list'],'owned-json-list'],
 ['json_into_values',['owned-json'],'owned-json-list'],
 ['json_without_field',['owned-json','str'],'owned-json'],
 ['json_merge',['owned-json','shared-json'],'owned-json'],
 ['json_object_keys',['shared-json'],'owned-json'],
 ['json_array_len',['shared-json'],'u64'],
 ['json_object_has',['shared-json','str'],'bool'],
];
export const JSON_STATE_CONTRACTS=Object.freeze(rows.map(([name,parameters,returns])=>Object.freeze({
 id:'owned-json-state:'+name,rustName:name,javascriptName:'router_state_'+name,parameters:Object.freeze(parameters),returns,
 rustModule:'translation_state_core',rustSource:'src/translation_state_core.rs',runtimeModule:'json-state-runtime.mjs',declarationModule:'json-state-runtime.d.mts',
 ordering:'left-to-right',sourceAuthority:false,semanticAuthority:false,
})));
export const jsonStateContract=name=>JSON_STATE_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;
export function emitJsonStateDeclarations(){
 const types={'owned-json':'JsonValue','shared-json':'JsonValue','shared-json-list':'readonly JsonValue[]','owned-json-list':'readonly JsonValue[]',str:'string',u64:'bigint',bool:'boolean'};
 return "import type {JsonValue} from './json-macro-runtime.mjs';\n"+JSON_STATE_CONTRACTS.map(row=>'export declare function '+row.javascriptName+'('+row.parameters.map((role,index)=>'argument'+index+':'+types[role]).join(',')+'): '+types[row.returns]+';').join('\n')+'\n';
}
