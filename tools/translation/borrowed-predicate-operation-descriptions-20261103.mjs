// Shared operation DATA. These descriptions never issue native/type/body proof.
import {BORROWED_JSON_TOOL_PREDICATE as JSON_TOOL} from './borrowed-json-tool-20261103-contracts.mjs';
import {BORROWED_STANDARD_MAP_LITERAL_PREDICATE as TEXT_MAP} from './borrowed-standard-map-20261103-contracts.mjs';
const fail=message=>{throw TypeError('Borrowed predicate operation description: '+message);};
const roles=Object.freeze({
 'shared-canonical-serde-json-Value':Object.freeze({reverse:'borrowed-json-tool-input',typescript:'unknown'}),
 'shared-standard-text-map':Object.freeze({reverse:'standard-text-map-input',typescript:'ReadonlyMap<string, string>'}),
 'shared-str':Object.freeze({reverse:'str',typescript:'string'}),
 'literal-str-slice':Object.freeze({reverse:'literal-str-slice',typescript:'readonly string[]'}),
});
function describe(contract,names,header,layout){
 if(contract.returns!=='bool'||contract.returnedLoan!==false||contract.nativeParameterCount!==contract.parameters.length||names.length!==contract.parameters.length||contract.parameters.some(role=>!Object.hasOwn(roles,role)))fail('complete supported borrowed boolean signature required');
 if(contract.containerEntryLimit!==null||contract.valueByteLimit!==null)fail('unrestricted borrowed input domain must remain unchanged');
 const literalAt=contract.parameters.indexOf('literal-str-slice'),literalLimit=literalAt<0?null:contract.maximumLiteralCount;
 if(literalAt>=0&&(literalAt!==contract.parameters.length-1||!Number.isSafeInteger(literalLimit)||literalLimit<0))fail('original trailing bounded literal slice required');
 const parameters=Object.freeze(contract.parameters.map((role,index)=>Object.freeze({name:names[index],role,reverse:roles[role].reverse,typescript:roles[role].typescript,shared:true})));
 return Object.freeze({id:contract.id,javascriptName:contract.javascriptName,rustPath:contract.rustPath,parameters,returns:'bool',typescriptReturn:'boolean',nativeArity:parameters.length,
  loweredMinimum:literalAt<0?parameters.length:parameters.length-1,loweredMaximum:literalAt<0?parameters.length:parameters.length-1+literalLimit,
  maximumLiteralCount:literalLimit,header,layout,returnedLoan:false,containerEntryLimit:null,valueByteLimit:null,
  runtimeModule:contract.runtimeModule,declarationModule:contract.declarationModule,evaluationOrder:contract.evaluationOrder,
  sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false});
}
export const BORROWED_PREDICATE_OPERATION_DESCRIPTIONS=Object.freeze([
 describe(JSON_TOOL,['tool'],
  '// unknown supplies no JSON validity, ownership, or compiler permission.\n// Callers must already provide the canonical serde_json tagged source ABI.\n','inline'),
 describe(TEXT_MAP,['map','key','literals'],
  '/** Static literal predicate over the standard map abstraction. */\nexport declare const BORROWED_MAP_LITERAL_LIMIT: '+TEXT_MAP.maximumLiteralCount+';\n/** Translation requires genuine standard library type/source ownership.\n * No whole-container validation, loan, entry cap or value-byte cap is supplied.\n */\n','multiline'),
]);
export function borrowedPredicateOperationDescription(id){return BORROWED_PREDICATE_OPERATION_DESCRIPTIONS.find(row=>row.id===id)??null;}
function required(id){const row=borrowedPredicateOperationDescription(id);if(!row)fail('known original operation ID required');return row;}
export function borrowedPredicateNativeArity(id){return required(id).nativeArity;}
export function borrowedPredicateLoweredArity(id){const row=required(id);return Object.freeze({minimum:row.loweredMinimum,maximum:row.loweredMaximum});}
/** Original reverse analyzer role spelling, with a fresh ordinary DATA result. */
export function borrowedPredicateReverseDescription(id,name){
 const row=required(id);if(name!==row.javascriptName)return null;
 const result={id:row.id,javascriptName:row.javascriptName,rustPath:row.rustPath,parameters:row.parameters.map(parameter=>parameter.reverse),returns:row.returns,shared:row.parameters.map((_,index)=>index),consumed:[],returnedLoan:row.returnedLoan};
 if(row.maximumLiteralCount!==null)result.maxLiterals=row.maximumLiteralCount;
 return {...result,containerEntryLimit:row.containerEntryLimit,valueByteLimit:row.valueByteLimit,sourceAuthority:false,semanticAuthority:false};
}
/** Strict target declarations derive every role/name/count from the same DATA. */
export function emitBorrowedPredicateDeclaration(id){
 const row=required(id),parameters=row.parameters.map(parameter=>parameter.name+': '+parameter.typescript).join(', ');
 const signature=row.layout==='multiline'?'(\n  '+parameters+',\n)':'('+parameters+')';
 return row.header+'export declare function '+row.javascriptName+signature+': '+row.typescriptReturn+';\n';
}
