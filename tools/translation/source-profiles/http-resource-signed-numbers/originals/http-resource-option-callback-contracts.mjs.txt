// Original primitive Option ABI DATA. Matching complete source and whole
// callback bodies must independently qualify every caller and operation.
import {PRIMITIVE_OPTION_CALLBACK_CONTRACTS} from '../primitive-option-callback-contracts.mjs';
const domains=Object.freeze({bool:'bool',u64:'u64',str:'str','text-owned':'text-owned','bool-option':'optional:bool','u64-option':'optional:u64','str-option-ref':'optional:str'});
export function httpResourceOptionCallbackContracts(){
 const rows=[];for(const original of PRIMITIVE_OPTION_CALLBACK_CONTRACTS){const parameters=original.callbackParameters.map(type=>domains[type]),ret=domains[original.returns],returns=domains[original.callbackReturns],input=domains[original.parameters[0]];if(parameters.some(type=>!type)||!ret||!returns||!input||ret==='str'||ret.endsWith(':str')||returns==='str'||returns.endsWith(':str'))continue;rows.push({...original,family:'option-callback',args:[input,'value-callback'],ret,async:false,borrowedResult:false,rootArgument:null,release:null,callbackContract:Object.freeze({args:Object.freeze(parameters),ret:returns}),sourceAuthority:false,semanticAuthority:false});}return rows;
}
