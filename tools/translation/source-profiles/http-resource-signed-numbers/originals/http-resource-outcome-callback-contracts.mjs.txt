// Existing original Result library ABI DATA. Actual native/source and every
// complete callback body must be checked again before a whole caller is issued.
import {OWNED_RESULT_CONTRACTS} from '../owned-result-contracts.mjs';
const domains=Object.freeze({bool:'bool',u64:'u64',str:'str','text-owned':'text-owned','bool-text-result':'http-result:bool','u64-text-result':'http-result:u64','str-text-result':'http-result:str','text-text-result':'http-result:text-owned','bool-option':'optional:bool','u64-option':'optional:u64','str-option-ref':'optional:str','text-owned-option':'option-text'});
const hasLoan=type=>type==='str'||type?.endsWith(':str');
export function httpResourceOutcomeCallbackContracts(){
 const rows=[];
 for(const original of OWNED_RESULT_CONTRACTS){
  if(!original.parameters.includes('callback'))continue;const args=original.parameters.map(type=>type==='callback'?'value-callback':domains[type]),parameters=original.callbackParameters.map(type=>domains[type]),returns=domains[original.callbackReturns],ret=domains[original.returns];
  if(args.some(type=>!type)||parameters.some(type=>!type)||!returns||!ret||hasLoan(returns)||hasLoan(ret))continue;
  rows.push({...original,family:'result-callback',args,ret,async:false,borrowedResult:false,rootArgument:null,release:null,callbackContract:Object.freeze({args:Object.freeze(parameters),ret:returns}),sourceAuthority:false,semanticAuthority:false});
 }
 return rows;
}
