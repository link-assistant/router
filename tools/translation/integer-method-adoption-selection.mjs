// Explicit adoption candidates only. A fresh whole-function check is mandatory.
import {integerContract} from './integer-contracts.mjs';
import {createPrimitiveLocalArgumentSource,readPrimitiveWrittenAliasDomain,readPrimitiveAliasOperand} from './primitive-local-argument-source.mjs';
export function selectIntegerMethodAdoption(source,item,scoped,modulePath,_names,helpers){
 const {originalDeclarationHeader,close,split,ident}=helpers,tokens=splitRustMacroBangSourceTokens(splitRustTryDotSourceTokens(item.tokens.filter(row=>row.type!=='comment'),source),source),header=originalDeclarationHeader(item,modulePath),name=tokens.findIndex(row=>row.start===header?.nameSpan?.start),edits=[],selections=[],skipped=[];
 const result=reason=>({edits,selections,skipped:reason?[...skipped,{function:item.name,reason}]:skipped});if(name<0||tokens.length>200000||tokens[name+1]?.text!=='(')return result('complete ordinary nongeneric numeric function required');
 if(tokens.slice(0,name).some(row=>['unsafe','async','const','extern'].includes(row.text)))return result('ordinary synchronous source function required');const endParameters=close(tokens,name+1);if(endParameters<0)return result('complete original input list required');let body=endParameters+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body>=tokens.length||close(tokens,body)!==tokens.length-1)return result('complete original native function body required');
 const domains=new Map(),parameters=new Set();for(const row of split(tokens.slice(name+2,endParameters))){if(!ident(row[0])||row[1]?.text!==':'||parameters.has(row[0].text))return result('distinct immutable original parameters required');parameters.add(row[0].text);const domain=readPrimitiveCoreParameterSourceRole(row.slice(2),scoped);if(domain)domains.set(row[0].text,domain);}
 const formattingHeaders=coreFormattingMacroSourceHeaders(tokens);
 const opaqueRegions=coreCarrierCallbackSourceRegions(tokens.slice(body+1,-1)),opaqueTokenEnds=opaqueSourceTokenEnds(tokens,opaqueRegions);
 let work=0;for(let at=body+1;at<tokens.length-1;at++){
  const excluded=opaqueTokenEnds.get(at);if(excluded!==undefined){at=excluded-1;continue;}const word=tokens[at].text;if(++work>200000)return result('complete source scan bound exceeded');
  if(word==='#'||['unsafe','async','await','yield','loop','fn','mod','use','extern','macro_rules','trait','impl','struct','enum','union','type','const','static','move','|','||'].includes(word)||word.endsWith('!')||word==='!'&&ident(tokens[at-1])&&['(','[','{'].includes(tokens[at+1]?.text)&&!formattingHeaders.has(tokens[at].start))return result('local producer closure or unknown macro uncertainty');
  if(word==='let'||word==='for'){let end=at+1;for(;end<tokens.length&&!['=',':',';','in','{','}'].includes(tokens[end].text);end++){if(++work>200000)return result('complete binding scan bound exceeded');if(domains.has(tokens[end].text))return result('local pattern shadows an actual primitive input');}}
 }
 const localArguments=createPrimitiveLocalArgumentSource(tokens.slice(body+1,-1),domains,parameters,{opaqueRegions});
 function argument(row,domain,bindings=domains){const value=readPrimitiveLocalExpression(row,bindings,{readAtom:readPrimitiveAliasOperand,declared:domain});return value?.kind===domain?source.slice(row[0].start,row.at(-1).end):null;}
 for(let at=body+1;at<tokens.length-1;at++){
  const excluded=opaqueTokenEnds.get(at);if(excluded!==undefined){at=excluded-1;continue;}const receiver=tokens[at];if((!ident(receiver)&&receiver.text!=='('&&receiver.type!=='number')||['.','::'].includes(tokens[at-1]?.text))continue;const bindings=localArguments?.at(receiver.start)??domains;let domain=bindings.get(receiver.text)??(['true','false'].includes(receiver.text)?'bool':null),receiverEnd=at+1,receiverSource=receiver.text;if(receiver.type==='number'){const selected=readPrimitiveAliasOperand([receiver],bindings);if(!selected)continue;domain=selected.kind;}if(receiver.text==='('){const last=close(tokens,at),after=last+1+(tokens[last+1]?.text==='?'?1:0),selected=last>=0&&after-at<=256?readPrimitiveLocalExpression(tokens.slice(at,after),bindings,{readAtom:readPrimitiveAliasOperand}):null;if(!selected)continue;domain=selected.kind;receiverEnd=after;receiverSource=source.slice(receiver.start,tokens[after-1].end);}if(receiver.text==='crate'&&tokens[at+1]?.text==='::'&&tokens[at+3]?.text==='::'&&tokens[at+5]?.text==='('){const last=close(tokens,at+5),after=last+1+(tokens[last+1]?.text==='?'?1:0),selected=last>=0&&after-at<=128?readPrimitiveCoreCallSource(tokens.slice(at,after),bindings):null;if(!selected)continue;domain=selected.kind;receiverEnd=after;receiverSource=source.slice(receiver.start,tokens[after-1].end);}if(tokens[receiverEnd]?.text==='?'){const selected=readPrimitiveCoreCallSource(tokens.slice(at,receiverEnd+1),bindings);if(!selected)continue;domain=selected.kind;receiverEnd++;receiverSource=source.slice(receiver.start,tokens[receiverEnd-1].end);}if(!primitiveBitwiseType(domain)&&domain!=='bool')continue;let after=receiverEnd,replacement=receiverSource,final=null;const operations=[],methods=[];
  for(let link=0;link<64;link++){
   if(tokens[after]?.text!=='.'||!ident(tokens[after+1])||tokens[after+2]?.text!=='(')break;const method=tokens[after+1].text;if(method==='to_string'&&tokens[after+3]?.text===')'){
    if((work+=4)>200000)return result('complete primitive Display source bound exceeded');replacement='crate::translation_core::format!("{}", '+replacement+')';after+=4;const row={rustName:'primitive-display:'+domain,returns:'text-owned',macroOwnerProved:false,displayTraitProved:false};operations.push(row.rustName);methods.push(method);final={row,method};break;
   }const row=integerContract(domain+'_'+method);if(!row)break;const end=close(tokens,after+2);if(end<0)return result('complete native method argument list required');if((work+=end-after+1)>200000)return result('complete method argument scan bound exceeded');const pieces=split(tokens.slice(after+3,end));if(pieces.length!==row.parameters.length-1)break;const args=pieces.map(piece=>argument(piece,domain,bindings));if(args.some(value=>value===null))break;
   replacement=row.rustPath+'('+[replacement,...args].join(', ')+')';after=end+1;operations.push(row.rustName);methods.push(method);final={row,method};if(row.returns!==domain)break;
  }
  if(!final)continue;if(operations.length===64&&final.row.returns===domain&&tokens[after]?.text==='.'&&ident(tokens[after+1])&&(integerContract(domain+'_'+tokens[after+1].text)||tokens[after+1].text==='to_string'&&tokens[after+2]?.text==='('&&tokens[after+3]?.text===')'))return {edits:[],selections:[],skipped:[...skipped,{function:item.name,reason:'complete integer method chain exceeds64 links'}]};
  const span=[receiver.start,tokens[after-1].end],localReceiverSource=localArguments?.evidence(receiver.text)??null;localArguments?.selectedCall({span,terminator:tokens[after],operation:final.row.rustName,returnsKind:final.row.returns});edits.push({span,expected:source.slice(...span),replacement});selections.push({function:item.name,functionSpan:[item.start,item.end],span,operation:final.row.rustName,operations,receiver:receiver.text,method:final.method,methods,domain,oldTraitDispatchProved:false,oldDropTimingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false,evaluationOrder:['actual-copy-primitive-receiver-once','original-copy-arguments-once-left-to-right-in-each-chain-link'],...(localReceiverSource?{localReceiverSource}:{})});at=after-1;
 }
 return result(edits.length?null:'no source-selected closed primitive method');
}

import {readPrimitiveCoreCallSource,readPrimitiveCoreParameterSourceRole} from './primitive-core-call-source.mjs';

import {readPrimitiveLocalExpression} from './primitive-local-expression-source.mjs';

import {splitRustTryDotSourceTokens} from './rust-try-token-source.mjs';

import {coreCarrierCallbackSourceRegions} from './core-carrier-callback-source-regions.mjs';
import {opaqueSourceTokenEnds} from './opaque-source-token-regions.mjs';

import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';

import {coreFormattingMacroSourceHeaders} from './core-formatting-macro-source.mjs';

import {splitRustMacroBangSourceTokens} from './rust-macro-token-source.mjs';
