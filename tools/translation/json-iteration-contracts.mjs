// Reusable operation description DATA. Actual source and private semantic
// issuers must independently bind every application call in both directions.
const rows=[
 ['json_filter',['shared-json'],'bool','owned-json-list',false],
 ['json_any',['shared-json'],'bool','bool',true],
 ['json_all',['shared-json'],'bool','bool',true],
 ['json_find',['shared-json'],'bool','owned-json-option',true],
 ['json_fold',['owned-json','shared-json'],'owned-json','owned-json',false],
];
export const JSON_ITERATION_CONTRACTS=Object.freeze(rows.map(([name,callbackParameters,callbackReturns,returns,shortCircuit])=>Object.freeze({
 id:'owned-json-iteration:'+name,rustName:name,javascriptName:'router_core_'+name,
 rustModule:'translation_collections_core',rustSource:'src/translation_collections_core.rs',
 runtimeModule:'json-iteration-runtime.mjs',declarationModule:'json-iteration-runtime.d.mts',
 parameters:Object.freeze(name==='json_fold'?['shared-json-list','owned-json','callback']:['shared-json-list','callback']),callbackParameters:Object.freeze(callbackParameters),callbackReturns,returns,
 ordering:'left-to-right',shortCircuit,sourceAuthority:false,semanticAuthority:false,
})));
export const jsonIterationContract=name=>JSON_ITERATION_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;
export function emitJsonIterationDeclarations(){
 const header="import type {JsonValue} from './json-macro-runtime.mjs';\ntype Maybe<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\ntype Predicate = (value:JsonValue)=>boolean;\n";
 const resultTypes={'owned-json-list':'readonly JsonValue[]',bool:'boolean','owned-json-option':'Maybe<JsonValue>','owned-json':'JsonValue'};
 return header+JSON_ITERATION_CONTRACTS.map(row=>'export declare function '+row.javascriptName+'(values:readonly JsonValue[],'+(row.rustName==='json_fold'?'initial:JsonValue,callback:(accumulator:JsonValue,value:JsonValue)=>JsonValue':'callback:Predicate')+'): '+resultTypes[row.returns]+';').join('\n')+'\n';
}
