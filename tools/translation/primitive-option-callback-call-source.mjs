// Declared return-role candidates for actual qualified callback call syntax.
// Whole callback bodies, captures, types, library bindings and Try stay unchecked.
import {readQualifiedSourceCallTokens} from './qualified-source-call-tokens.mjs';
import {primitiveOptionCallbackContract} from './primitive-option-callback-contracts.mjs';
import {readCoreCarrierCallSource,readCoreCarrierContractSourceRole} from './core-carrier-call-source.mjs';
import {readJsonFieldCallSource} from './json-field-call-source.mjs';
const same=(left,right)=>!!left&&!!right&&left.kind===right.kind&&left.domain===right.domain;
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
export function readPrimitiveOptionCallbackCallSource(rows,scope){
 if(!Array.isArray(rows)||rows.length<9||rows.length>129||rows[0]?.text!=='crate'||rows[1]?.text!=='::'||rows[2]?.text!=='translation_primitive_option_callbacks_core'||rows[3]?.text!=='::')return null;let work=0;
 function call(part,depth){
  if(++work>512||depth>8||!part.length)return null;const tried=part.at(-1)?.text==='?',plain=tried?part.slice(0,-1):part,syntax=readQualifiedSourceCallTokens(plain);if(!syntax||syntax.path.length!==3||syntax.path[0]!=='crate'||syntax.path[1]!=='translation_primitive_option_callbacks_core'||syntax.args.length!==2)return null;
  const row=primitiveOptionCallbackContract(syntax.path[2]);if(!row||!readInlineClosureSourceTokens(syntax.args[1],{arity:row.callbackParameters.length}))return null;const wanted=readCoreCarrierContractSourceRole(row.parameters[0]),argument=syntax.args[0];let actual=argument.length===1&&ident(argument[0])?scope.get(argument[0].text):null;
  if(!actual)actual=readCoreCarrierCallSource(argument,scope)??readJsonFieldCallSource(argument,{get(name){const value=scope.get(name);return value?.kind==='json'?'json-reference':value?.kind==='payload'?value.domain:null;}})??call(argument,depth+1);
  if(!same(actual,wanted))return null;let result=readCoreCarrierContractSourceRole(row.returns);if(!result)return null;
  if(tried){if(result.kind!=='result')return null;result={kind:'payload',domain:result.domain==='text'?'text-owned':result.domain};}
  return {...result,binding:null,operation:row.rustName,bridge:'complete-declared-callback-call-source',tryProjection:tried,tryTypeProved:false,callbackBodyChecked:false,callbackTypesChecked:false,sourceBindingProved:false,semanticAuthority:false,sourceAuthority:false,executableAdmission:false};
 }
 return call(rows,0);
}

import {readInlineClosureSourceTokens} from './inline-closure-source-tokens.mjs';
