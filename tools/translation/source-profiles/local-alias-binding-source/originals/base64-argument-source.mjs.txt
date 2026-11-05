// Candidate source selection DATA only. No owner, type or executable permit.
const ident=token=>token?.type==='ident'&&/^[A-Za-z_][A-Za-z_0-9]*$/u.test(token.text);
export function readConcreteBase64Argument(rows,bindings){
 if(rows.length===1&&ident(rows[0])&&bindings.has(rows[0].text))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 // Literal content is left verbatim. The independent native CST classified
 // one Rust string token; byte/raw/C strings are not inferred from spelling.
 if(rows.length===1&&rows[0].type==='string'&&/^"(?:[^"\\]|\\.)*"$/su.test(rows[0].text))return {kind:'text',binding:null};
 if(rows.length===5&&ident(rows[0])&&rows[1].text==='.'&&ident(rows[2])&&rows[3].text==='('&&rows[4].text===')'&&bindings.has(rows[0].text)){const input=bindings.get(rows[0].text),method=rows[2].text,kind=method==='as_bytes'&&['text','owned-text'].includes(input)?'bytes':method==='as_str'&&input==='owned-text'?'text':method==='as_slice'&&input==='owned-bytes'?'bytes':null;if(kind)return {kind,binding:rows[0].text,bridge:method,inputKind:input,argumentEvaluated:'once'};}
 return null;
}
// Only the newly admitted local-bearing lane uses this stricter census. Old
// no-let inputs retain their original selector/refusals and full source guards.
export function simpleBase64LocalBindings(rows,parameters){
 if(!rows.some(row=>row.text==='let'))return {reason:null,count:0};if(rows.length>200000)return {reason:'complete local-binding token bound'};
 if(rows.some(row=>['match','for'].includes(row.text)))return {reason:'local-bearing pattern scope needs a separate source rule'};
 const names=new Set(parameters.keys()),protectedNames=new Set(['base64','String','Vec','str','u8','std','core','translation_core','Str','Text']);let count=0;
 for(let at=0;at<rows.length;at++)if(rows[at].text==='let'){
  const name=rows[at+1],next=rows[at+2];if(!ident(name)||!['=',':'].includes(next?.text)||['mut','ref','self','Self','_'].includes(name.text))return {reason:'one ordinary immutable local identifier required'};
  if(names.has(name.text)||protectedNames.has(name.text))return {reason:'local can shadow a concrete parameter or namespace'};if(++count>4096)return {reason:'complete local binding count bound'};names.add(name.text);
 }
 return {reason:null,count};
}
