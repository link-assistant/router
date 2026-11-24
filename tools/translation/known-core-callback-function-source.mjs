// Reify exact known qualified core function items through the SAME function
// path. No standard spelling or declared signature is a binding/type certificate.
import {readQualifiedSourcePathTokens} from './qualified-source-call-tokens.mjs';
import {textContract} from './text-contracts.mjs';
import {integerContract} from './integer-contracts.mjs';
import {primitiveOptionContract} from './primitive-option-contracts.mjs';
import {primitiveResultContract} from './primitive-result-contracts.mjs';
import {ownedResultContract} from './owned-result-contracts.mjs';
import {readCoreCarrierContractSourceRole} from './core-carrier-call-source.mjs';
import {applyLayeredCoreAdoptionSource} from './layered-core-adoption-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
export function createKnownCoreCallbackFunctionSource(source,tokens,names=new Set()){
 let allocated=null;
 return (piece,inputs)=>{
  if(!Array.isArray(inputs)||inputs.length>1)return null;const syntax=readQualifiedSourcePathTokens(piece);if(!syntax||syntax.path.length!==3||syntax.path[0]!=='crate')return null;const [,module,name]=syntax.path,select=module==='translation_text_core'?textContract:module==='translation_integer_core'?integerContract:module==='translation_primitive_option_core'?primitiveOptionContract:module==='translation_primitive_results_core'?primitiveResultContract:module==='translation_owned_results_core'?ownedResultContract:null;if(!select)return null;const row=select(name);if(!row||row.rustName!==name||row.parameters.length!==inputs.length||row.parameters.some((domain,at)=>{const role=readCoreCarrierContractSourceRole(domain);return role?.kind!=='payload'||role.domain!==inputs[at];}))return null;const output=readCoreCarrierContractSourceRole(row.returns);if(!output)return null;
  if(typeof source!=='string'||source.length>2000000||!Array.isArray(tokens)||tokens.length>200000||piece.some(row=>!Number.isSafeInteger(row.start)||!Number.isSafeInteger(row.end)||row.start<0||row.end<=row.start||row.end>source.length||source.slice(row.start,row.end)!==row.text))throw new TypeError('Complete bounded original callback function item source required');
  let argument=null;if(inputs.length){if(!allocated){allocated=new Set(tokens.filter(row=>row.type==='ident').map(row=>row.text));if(names instanceof Set)for(const value of names)allocated.add(value);}argument='__router_callback_argument';let suffix=0;while(allocated.has(argument)){if(++suffix>4096)return null;argument='__router_callback_argument_'+suffix;}allocated.add(argument);}
  const original=source.slice(piece[0].start,piece.at(-1).end),replacement=(argument?'|'+argument+'|':'||')+original+'('+(argument??'')+')',history=applyLayeredCoreAdoptionSource(original,[{span:[0,original.length],expected:original,replacement}],{languageRule:'callback-function-item:retain-exact-original-function-path',repositoryRule:'router-core:reify-closed-callback-function-item-with-fresh-parameter',bindings:[{native:'crate::'+module+'::',neutral:'::translation_compatibility_'+module.replace(/^translation_/u,'').replace(/_core$/u,'')+'::'}]}),wrapperSource='pub fn __router_callback_function_item_source(){'+original+'}',wrapper=transportConcreteSyntaxSource(wrapperSource,{language:'Rust'});if(transportConcreteSyntaxMeta(wrapper.meta).source!==wrapperSource||history.after.source!==replacement)throw new TypeError('Complete callback function item source inverse differs');
  return {role:output,replacement,sourceHistory:{...history,wrapper:{source:wrapperSource,concreteSyntax:wrapper.meta,functionOwnerProved:false,temporaryTypesAreSourceData:true},functionItem:{path:syntax.path,original,argument,sameFunctionPathRetained:true,sourceBindingProved:false,callbackTypesChecked:false},bodySourceHistories:[],sourceAuthority:false,semanticAuthority:false,executableAdmission:false}};
 };
}
