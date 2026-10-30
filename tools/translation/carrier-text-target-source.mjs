// Written owning payload context and constructor positions are source DATA.
// Standard constructor/alias identity, type inference and ownership are separate.
import {readTextWrittenAliasDomain} from './text-local-argument-source.mjs';
import {readPrimitiveCoreParameterSourceRole} from './primitive-core-call-source.mjs';
export function isTextTargetSourceContext(context){return context==='text-owned'||context==='option:text-owned'||typeof context==='string'&&/^result:(?:text|str|bool|[iu](?:8|16|32|64|128))$/u.test(context);}
export function readTextTargetSourceContext(rows,scoped=null){
 if(!Array.isArray(rows)||!rows.length||rows.length>128)return null;const context=readTextWrittenAliasDomain(rows)==='text-owned'?'text-owned':readPrimitiveCoreParameterSourceRole(rows,scoped);return isTextTargetSourceContext(context)?context:null;
}
export function readCarrierTextConstructorTargetSource(tokens,start,end,context,{close}){
 if(!Array.isArray(tokens)||!isTextTargetSourceContext(context)||context==='text-owned'||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>tokens.length||end-start>256)return null;let open=start;for(;open<end&&tokens[open].text!=='(';open++)if(!['ident','punct'].includes(tokens[open].type))return null;if(open>=end||close(tokens,open)!==end-1||open+1===end-1)return null;
 let cursor=tokens[start]?.text==='::'?start+1:start;while(cursor<open){if(tokens[cursor]?.type!=='ident')return null;cursor++;if(cursor===open)break;if(tokens[cursor++]?.text!=='::'||cursor===open)return null;}const path=tokens.slice(start,open).map(row=>row.text).join(''),some=/^(?:(?:::)?(?:std|core)::option::Option::|Option::|crate::translation_core::Maybe::)?Some$/u.test(path),result=/^(?:(?:::)?(?:std|core)::result::Result::|Result::)?(Ok|Err)$/u.exec(path),selected=context==='option:text-owned'?some:!!result&&(result[1]==='Err'||context==='result:text');if(!selected)return null;
 let payloadEnd=end-1;if(tokens[payloadEnd-1]?.text===',')payloadEnd--;if(payloadEnd<=open+1)return null;for(let at=open+1;at<payloadEnd;at++){const word=tokens[at].text;if(['(','[','{'].includes(word)){const last=close(tokens,at);if(last<at||last>=payloadEnd)return null;at=last;}else if([',',';',')',']','}'].includes(word))return null;}
 return {schema:'carrier-owning-text-constructor-source-v1',start:open+1,end:payloadEnd,constructor:some?'Some':result[1],expectedDomain:'text-owned',constructorOwnerProved:false,actualPayloadTypeProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
