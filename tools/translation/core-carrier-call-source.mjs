// Repository core call source roles. Full source/type/ownership checks follow.
import {readQualifiedSourceCallTokens,readParenthesizedSourceOperandTokens} from './qualified-source-call-tokens.mjs';
import {primitiveOptionContract} from './primitive-option-contracts.mjs';
import {integerContract} from './integer-contracts.mjs';
import {textContract} from './text-contracts.mjs';
import {primitiveResultContract} from './primitive-result-contracts.mjs';
import {ownedResultContract} from './owned-result-contracts.mjs';
import {readFixedIntegerLiteralSource} from './native-integer-literal-source.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
const role=domain=>domain.endsWith('-text-result')&&['bool','u64','i64','str','text'].includes(domain.slice(0,-12))?{kind:'result',domain:domain.slice(0,-12)}:domain==='str-option-ref'?{kind:'option',domain:'str'}:domain==='text-owned-option'?{kind:'option',domain:'text-owned'}:domain.endsWith('-option')&&primitiveBitwiseType(domain.slice(0,-7))?{kind:'option',domain:domain.slice(0,-7)}:domain==='bool-option'?{kind:'option',domain:'bool'}:['str','text-owned','bool'].includes(domain)||primitiveBitwiseType(domain)?{kind:'payload',domain}:null;
const same=(a,b)=>!!a&&!!b&&a.kind===b.kind&&a.domain===b.domain;
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
export function readCoreCarrierCallSource(rows,bindings){
 const formatting=readCoreFormattingMacroSource(rows);if(formatting)return formatting;
 let work=0;
 function operand(part,wanted,depth){
  if(++work>256||depth>8||!part.length)return false;const formatting=readCoreFormattingMacroSource(part);if(formatting)return same(formatting,wanted);const first=part[0],known=part.length===1&&ident(first)?bindings.get(first.text):null;if(same(known,wanted))return true;const group=readParenthesizedSourceOperandTokens(part);if(group)return operand(group,wanted,depth+1);if(wanted.kind==='payload'&&wanted.domain==='str'&&part[0]?.text==='&')return operand(part.slice(1),{kind:'payload',domain:'text-owned'},depth+1);
  if(wanted.kind==='payload'){
   if(wanted.domain==='text-owned'&&part.length===5&&part[0].type==='string'&&/^(?:"|r#{0,255}")/u.test(part[0].text)&&part[1].text==='.'&&['to_owned','to_string'].includes(part[2].text)&&part[3].text==='('&&part[4].text===')')return true;
   if(wanted.domain==='str'){
    if(part.length===1&&first.type==='string'&&/^(?:"|r#{0,255}")/u.test(first.text))return true;
    if(part.length===2&&first.text==='&'&&ident(part[1])&&same(bindings.get(part[1].text),{kind:'payload',domain:'text-owned'}))return true;
    if(part.length===5&&ident(first)&&same(bindings.get(first.text),{kind:'payload',domain:'text-owned'})&&['.','as_str','(',')'].every((word,index)=>part[index+1]?.text===word))return true;
   }
   if(wanted.domain==='bool'&&part.length===1&&['true','false'].includes(first.text))return true;
   if(primitiveBitwiseType(wanted.domain)&&readFixedIntegerLiteralSource(part,wanted.domain))return true;
  }
  if(wanted.kind==='option'){
   const text=part.map(row=>row.text).join('');if(/^(?:(?:::)?(?:std|core)::option::Option::|Option::)?None$/u.test(text))return true;const open=part.findIndex(row=>row.text==='(');if(open>0&&part.at(-1)?.text===')'&&/^(?:(?:::)?(?:std|core)::option::Option::|Option::)?Some$/u.test(part.slice(0,open).map(row=>row.text).join(''))&&operand(part.slice(open+1,-1),{kind:'payload',domain:wanted.domain},depth+1))return true;
  }
  if(wanted.kind==='result'){const open=part.findIndex(row=>row.text==='('),constructor=open>0&&part.at(-1)?.text===')'?/^(?:(?:::)?(?:std|core)::result::Result::|Result::)?(Ok|Err)$/u.exec(part.slice(0,open).map(row=>row.text).join(''))?.[1]:null;if(constructor&&operand(part.slice(open+1,-1),{kind:'payload',domain:constructor==='Err'||wanted.domain==='text'?'text-owned':wanted.domain},depth+1))return true;}
  return same(call(part,depth+1),wanted);
 }
 function call(part,depth){
  if(++work>256||depth>8||!part.length)return null;const tried=part.at(-1)?.text==='?',plain=tried?part.slice(0,-1):part,parsed=readQualifiedSourceCallTokens(plain);if(!parsed||parsed.path.length!==3||parsed.path[0]!=='crate')return null;const [,module,name]=parsed.path,row=module==='translation_primitive_option_core'?primitiveOptionContract(name):module==='translation_integer_core'?integerContract(name):module==='translation_text_core'?textContract(name):module==='translation_primitive_results_core'?primitiveResultContract(name):module==='translation_owned_results_core'?ownedResultContract(name):null;if(!row||row.parameters.length!==parsed.args.length)return null;const wanted=row.parameters.map(role);if(wanted.some(row=>!row)||parsed.args.some((part,index)=>!operand(part,wanted[index],depth+1)))return null;let result=role(row.returns);if(!result)return null;if(tried){if(!['option','result'].includes(result.kind))return null;result={kind:'payload',domain:result.domain==='text'?'text-owned':result.domain};}return {...result,operation:row.rustName,module,tryProjection:tried,tryTypeProved:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
 }
 return call(rows,0);
}

import {readCoreFormattingMacroSource} from './core-formatting-macro-source.mjs';

// Closed declared ABI role DATA, not a source binding or semantic certificate.
export function readCoreCarrierContractSourceRole(domain){return typeof domain==='string'?role(domain):null;}
