// Original lexical binding Try payload candidates only. Actual standard type,
// binding, Try context, error conversion and ownership stay independently checked.
import {readParenthesizedSourceOperandTokens} from './qualified-source-call-tokens.mjs';
import {primitiveBitwiseType} from './primitive-bitwise-types.mjs';
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
export function readCarrierBindingTrySource(rows,scope){
 if(!Array.isArray(rows)||rows.length<2||rows.length>128)return null;
 function ungroup(part){for(let depth=0;depth<8;depth++){const body=readParenthesizedSourceOperandTokens(part);if(!body)return part;part=body;}return part[0]?.text==='('?null:part;}
 const suffix=ungroup(rows);if(!suffix||suffix.at(-1)?.text!=='?')return null;const operand=ungroup(suffix.slice(0,-1));if(!operand||operand.length!==1||!ident(operand[0]))return null;const binding=operand[0].text,role=scope.get(binding);if(!role||!['option','result'].includes(role.kind))return null;const domain=role.domain==='text'&&role.kind==='result'?'text-owned':role.domain;if(!primitiveBitwiseType(domain)&&!['bool','str','text-owned'].includes(domain))return null;
 return {kind:'payload',domain,binding,bridge:'complete-original-carrier-binding-try-source',tryProjection:true,tryInputKind:role.kind,tryTypeProved:false,sourceBindingProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
