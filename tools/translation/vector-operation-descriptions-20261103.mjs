// Candidate/source-generation DATA. Actual native, caller, type and move/loan
// qualification remains with the original independent private issuers.
import {OWNED_TEXT_VECTOR_CONTRACTS} from './owned-text-vector-contracts.mjs';
import {primitiveOwnedVectorContract} from './primitive-owned-vector-contracts.mjs';
import {PRIMITIVE_COLLECTION_DOMAINS,primitiveCollectionDeclarationType} from './primitive-collection-operation-descriptions-20261103.mjs';
export const VECTOR_LITERAL_MAX_SOURCE_ARGUMENTS=64;
const families=Object.freeze(['owned-text-vector','primitive-literal','owned-text-literal']);
const fail=message=>{throw TypeError('Vector operation descriptions: '+message);};
function family(value){if(typeof value!=='string'||!families.includes(value))fail('known original vector family required');return value;}
function textContract(name){return typeof name==='string'?OWNED_TEXT_VECTOR_CONTRACTS.find(row=>row.rustName===name||row.javascriptName===name)??null:null;}
/** Preserve each original candidate API's own exact field set and fresh arrays. */
export function vectorOperationShape(kind,name,count=0){
 family(kind);if(typeof name!=='string')return null;
 if(kind==='owned-text-vector'){
  const row=textContract(name);if(!row)return null;
  return {operation:row.operation,rustName:row.rustName,javascriptName:row.javascriptName,rustPath:row.rustPath,parameters:[...row.parameters],returns:row.returns,sourceAuthority:false,semanticAuthority:false};
 }
 if(!Number.isInteger(count)||count<0||count>VECTOR_LITERAL_MAX_SOURCE_ARGUMENTS)return null;
 const primitive=kind==='primitive-literal',domain=primitive?PRIMITIVE_COLLECTION_DOMAINS.find(domain=>name==='router_vec_'+domain+'_literal'):name==='router_owned_text_vec_literal'?'text-owned':null;
 if(!domain)return null;
 const row=primitive?primitiveOwnedVectorContract('vec_'+domain+'_from_slice'):textContract('vec_text_from_slice');
 if(!row||row.parameters.length!==1||row.parameters[0]!==domain+'-list-ref'||row.returnedLoan!==false)fail('original shared slice copy contract required');
 if(primitive)return {schema:'primitive-vector-literal-shape-v1',domain,javascriptName:name,rustName:row.rustName,rustPath:row.rustPath,parameters:Array(count).fill(domain),returns:row.returns,sourceArity:count,maxSourceArguments:VECTOR_LITERAL_MAX_SOURCE_ARGUMENTS,maxValues:row.maxValues,runtimeModule:'primitive-vector-literal-runtime.mjs',declarationModule:'primitive-vector-literal-runtime.d.mts',evaluationOrder:'left-to-right',returnedLoan:row.returnedLoan,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,receivingExecuted:false};
 return {domain,operation:'literal',javascriptName:name,rustName:row.rustName,rustPath:row.rustPath,parameters:Array(count).fill(domain),returns:row.returns,sourceArity:count,maxSourceArguments:VECTOR_LITERAL_MAX_SOURCE_ARGUMENTS,maxValues:row.maxValues,clonesOwnedText:row.clonesOwnedText,returnedLoan:row.returnedLoan,runtimeModule:'owned-text-vector-literal-runtime.mjs',declarationModule:'owned-text-vector-literal-runtime.d.mts',sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,privateCallerBindingQualified:false,receivingExecuted:false};
}
function textType(role){
 const result={'vec:text-owned':'OwnedTextVector','vec:text-owned-ref':'OwnedTextVector','text-owned-list-ref':'readonly string[]','text-owned':'string','text-owned-option':'OwnedTextVectorOption',u64:'RustU64'};
 if(typeof role!=='string'||!Object.hasOwn(result,role))fail('original owned text declaration role required');return result[role];
}
function parameterNames(row){
 if(row.operation==='append')return ['left','right'];
 return row.parameters.map((role,index)=>index===0?'values':role==='u64'?(row.operation==='truncate'?'length':'index'):'value');
}
/** Repository declaration spelling stays separate from language role/move data.
 * The original variadic .d.mts signature does not itself prove the64-operand
 * source-checking bound or permit an owning String to inherit primitive Copy. */
export function emitVectorOperationDeclarations(kind){
 family(kind);
 if(kind==='owned-text-vector'){
  const header="import type {RustU64} from './primitive-operator-runtime.mjs';\n// Type spelling is DATA. The source checker must prove native linear ownership.\nexport type OwnedTextVector = readonly string[];\nexport type OwnedTextVectorOption = Readonly<{$:'None'}> | Readonly<{$:'Some';field0:string}>;\n";
  return header+OWNED_TEXT_VECTOR_CONTRACTS.map(row=>{const names=parameterNames(row);return 'export declare function '+row.javascriptName+'('+row.parameters.map((role,index)=>names[index]+': '+textType(role)).join(', ')+'): '+textType(row.returns)+';';}).join('\n')+'\n';
 }
 if(kind==='owned-text-literal'){
  const row=vectorOperationShape(kind,'router_owned_text_vec_literal',1);
  return "import type {OwnedTextVector} from './owned-text-vector-runtime.mjs';\nexport declare function "+row.javascriptName+'(...values: '+textType(row.parameters[0])+'[]): '+textType(row.returns)+';\n';
 }
 const scalar=domain=>primitiveCollectionDeclarationType('owned-vector',domain),brands=PRIMITIVE_COLLECTION_DOMAINS.filter(domain=>domain!=='bool').map(scalar);
 const header="import type {PrimitiveOwnedVector} from './primitive-owned-vector-runtime.mjs';\nimport type {"+brands.join(', ')+"} from './primitive-operator-runtime.mjs';\n";
 return header+PRIMITIVE_COLLECTION_DOMAINS.map(domain=>{const row=vectorOperationShape(kind,'router_vec_'+domain+'_literal'),type=scalar(domain);return 'export declare function '+row.javascriptName+'(...values: '+type+'[]): PrimitiveOwnedVector<'+type+'>;';}).join('\n')+'\n';
}
