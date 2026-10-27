// Bounded qualified-call source DATA. No binding, type or executable permit.
import {jsonFieldContract} from './json-field-contracts.mjs';
import {readFixedIntegerLiteralSource} from './native-integer-literal-source.mjs';
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
export function readJsonFieldReferenceSourceRole(rows,scoped=null){
 if(rows[0]?.text!=='&')return null;const start=rows[1]?.type==='char'?2:1,name=rows.slice(start).map(row=>row.text).join('');return ['crate::translation_core::Json','serde_json::Value','::serde_json::Value'].includes(name)||scoped?.jsonNames?.has(name)?'json-reference':null;
}
// The argument grammar admits only already evaluated input/local bindings,
// closed native literals and exact borrowed String views. It never evaluates.
export function readJsonFieldCallSource(rows,bindings){
 if(!Array.isArray(rows)||rows.length>33)return null;const optionTry=rows.at(-1)?.text==='?';if(optionTry)rows=rows.slice(0,-1);
 if(rows.length<8||rows.length>32||rows[0].text!=='crate'||rows[1].text!=='::'||rows[2].text!=='translation_json_fields_core'||rows[3].text!=='::'||rows[5]?.text!=='('||rows.at(-1).text!==')')return null;const row=jsonFieldContract(rows[4].text);if(!row)return null;const args=[];let start=6;
 for(let at=6;at<rows.length;at++)if(rows[at].text===','||at===rows.length-1){args.push(rows.slice(start,at));start=at+1;}if(args.length!==row.args.length)return null;
 function argument(part,role){
  const token=part[0];if(!part.length)return false;const known=part.length===1&&ident(token)?bindings.get(token.text):null;if(role==='json-ref')return known==='json-reference'||part.length===2&&token.text==='&'&&ident(part[1])&&bindings.get(part[1].text)==='json-owned';if(role==='str'){
   if(known==='str'||part.length===1&&token.type==='string'&&/^(?:"|r#{0,255}")/u.test(token.text))return true;
   if(part.length===2&&token.text==='&'&&ident(part[1])&&bindings.get(part[1].text)==='text-owned')return true;
   return part.length===5&&ident(token)&&bindings.get(token.text)==='text-owned'&&['.','as_str','(',')'].every((word,index)=>part[index+1]?.text===word);
  }
  if(known===role)return true;if(role==='bool')return part.length===1&&['true','false'].includes(token.text);return ['u64','i64'].includes(role)&&readFixedIntegerLiteralSource(part,role)!==null;
 }
 if(args.some((part,index)=>!argument(part,row.args[index])))return null;const result=row.ret==='str-option-ref'?{kind:'option',domain:'str'}:row.ret==='bool-option'?{kind:'option',domain:'bool'}:row.ret==='u64-option'?{kind:'option',domain:'u64'}:row.ret==='i64-option'?{kind:'option',domain:'i64'}:['str','bool','u64','i64'].includes(row.ret)?{kind:'payload',domain:row.ret}:null;if(!result||optionTry&&result.kind!=='option')return null;return {...result,...(optionTry?{kind:'payload',optionTryProjection:true}:{}),operation:row.rustName,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
