// Closed carrier operation DATA; current source/checker joins issue authority.
const rows=[
 ['json_ok',['shared-json'],'json-text-result'],
 ['json_err',['str'],'json-text-result'],
 ['json_result_copy',['json-text-result'],'json-text-result'],
 ['json_result_or',['json-text-result','shared-json'],'json'],
 ['json_option_to_result',['json-owned-option','str'],'json-text-result'],
 ['json_result_to_option',['json-text-result'],'json-owned-option'],
 ['json_some',['shared-json'],'json-owned-option'],
 ['json_none',[],'json-owned-option'],
 ['json_option_or',['json-owned-option','shared-json'],'json'],
];
export const OWNED_OUTCOME_CONTRACTS=Object.freeze(rows.map(([name,parameters,returns])=>Object.freeze({
 id:'owned-json-carrier:'+name,rustName:name,javascriptName:'router_carrier_'+name,parameters:Object.freeze(parameters),returns,
 rustPath:'crate::translation_carriers_core::'+name,ordering:'left-to-right',sourceAuthority:false,semanticAuthority:false,
})));
export const ownedOutcomeContract=name=>OWNED_OUTCOME_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null;
export function emitOwnedOutcomeDeclarations(){
 const types={'shared-json':'JsonValue',json:'JsonValue',str:'string','json-owned-option':'OwnedJsonOption','json-text-result':'OwnedJsonResult'};
 return "import type {JsonValue} from './json-macro-runtime.mjs';\nexport type OwnedJsonOption=Readonly<{$:'None'}>|Readonly<{$:'Some';field0:JsonValue}>;\nexport type OwnedJsonResult=Readonly<{$:'Ok';field0:JsonValue}>|Readonly<{$:'Err';field0:string}>;\n"+OWNED_OUTCOME_CONTRACTS.map(row=>'export declare function '+row.javascriptName+'('+row.parameters.map((role,index)=>'argument'+index+':'+types[role]).join(',')+'): '+types[row.returns]+';').join('\n')+'\n';
}
