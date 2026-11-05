// Existing matching native/runtime interface DATA, not executable permission.
import {TEXT_CONTRACTS} from '../text-contracts.mjs';
import {OWNED_RESULT_CONTRACTS} from '../owned-result-contracts.mjs';
import {OWNED_OUTCOME_CONTRACTS} from '../owned-outcome-contracts.mjs';
import {INTEGER_CONTRACTS} from '../integer-contracts.mjs';
import {PRIMITIVE_OPTION_CONTRACTS} from '../primitive-option-contracts.mjs';
import {JSON_STATE_CONTRACTS} from '../json-state-contracts.mjs';
const domains=Object.freeze({bool:'bool',u64:'u64',i64:'i64',str:'str','text-owned':'text-owned',json:'json','json-ref':'json-ref','json-option-ref':'optional:json-ref','owned-json':'json','shared-json':'json-ref','owned-json-list':'json-list-owned','shared-json-list':'json-list-ref','bool-text-result':'http-result:bool','u64-text-result':'http-result:u64','i64-text-result':'http-result:i64','str-text-result':'http-result:str','text-text-result':'http-result:text-owned','json-text-result':'http-result:json','bool-option':'optional:bool','u64-option':'optional:u64','i64-option':'optional:i64','str-option-ref':'optional:str','text-owned-option':'option-text','json-owned-option':'optional:json'});
export function httpResourceSynchronousContracts(){
 const result=[];
 for(const [family,rows,runtimeModule]of [['text',TEXT_CONTRACTS,'text-runtime.mjs'],['owned-result',OWNED_RESULT_CONTRACTS,'owned-result-runtime.mjs'],['json-carrier',OWNED_OUTCOME_CONTRACTS,'owned-outcome-runtime.mjs'],['integer',INTEGER_CONTRACTS,'integer-runtime.mjs'],['primitive-option',PRIMITIVE_OPTION_CONTRACTS,'primitive-option-runtime.mjs'],['json-state',JSON_STATE_CONTRACTS,'json-state-runtime.mjs'],['json-field',JSON_FIELD_CONTRACTS.map(row=>({...row,parameters:row.args,returns:row.ret})),'json-fields-runtime.mjs']]){
  for(const row of rows){
   // Wider numeric and callback domains keep their original separate checker.
   // No erased callback or guessed numeric type may enter this closed lane.
   if(!row.parameters.every(type=>Object.hasOwn(domains,type))||!Object.hasOwn(domains,row.returns))continue;
   result.push({...row,rustPath:row.rustPath??(family==='json-state'?'crate::translation_state_core::'+row.rustName:null),family,args:row.parameters.map(type=>domains[type]),ret:domains[row.returns],async:false,runtimeModule,borrowedResult:row.root!==null&&row.root!==undefined,rootArgument:row.root??null,release:null,sourceAuthority:false,semanticAuthority:false});
  }
 }
 return result;
}

import {JSON_FIELD_CONTRACTS} from '../json-field-contracts.mjs';
