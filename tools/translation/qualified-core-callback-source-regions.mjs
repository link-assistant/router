// Repository callback scope candidates. No body is omitted from emitted source
// or the independent whole-function semantic and ownership checks.
import {readQualifiedSourceCallPrefixTokens} from './qualified-source-call-tokens.mjs';
import {readInlineClosureSourceTokens} from './inline-closure-source-tokens.mjs';
import {primitiveOptionCallbackContract} from './primitive-option-callback-contracts.mjs';
import {primitiveResultContract} from './primitive-result-contracts.mjs';
import {ownedResultContract} from './owned-result-contracts.mjs';
export function qualifiedCoreCallbackSourceRegions(rows){
 if(!Array.isArray(rows)||rows.length>200000)throw new TypeError('Complete bounded callback source scan required');const regions=[],pending=new Map();let work=0;
 for(let at=0;at<rows.length;at++){
  if(++work>200000)throw new TypeError('Complete callback source scan work bound');const excluded=pending.get(rows[at].start);if(excluded!==undefined){while(at<rows.length&&rows[at].end<excluded){if(++work>200000)throw new TypeError('Complete callback scope work bound');at++;}continue;}
  if(rows[at]?.text!=='crate'||['.','::'].includes(rows[at-1]?.text)||rows[at+1]?.text!=='::'||rows[at+3]?.text!=='::')continue;const module=rows[at+2]?.text,select=module==='translation_primitive_option_callbacks_core'?primitiveOptionCallbackContract:module==='translation_primitive_results_core'?primitiveResultContract:module==='translation_owned_results_core'?ownedResultContract:null;if(!select)continue;
  const row=select(rows[at+4]?.text);if(!row||row.parameters.length!==2||row.parameters[1]!=='callback')continue;const call=readQualifiedSourceCallPrefixTokens(rows,at);if(!call||call.call.path.length!==3||call.call.args.length!==2)continue;if((work+=call.tokens.length)>200000)throw new TypeError('Complete callback call work bound');const part=call.call.args[1],closure=readInlineClosureSourceTokens(part,{arity:row.callbackParameters.length});if(!closure)continue;
  const start=part[0].start,end=part.at(-1).end;if(pending.has(start))continue;if(regions.length>=4096)throw new TypeError('Complete callback scope count bound');pending.set(start,end);regions.push({start,end,module,operation:row.rustName,callbackBodyChecked:false,callbackTypesChecked:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false});
 }return regions.sort((a,b)=>a.start-b.start);
}
