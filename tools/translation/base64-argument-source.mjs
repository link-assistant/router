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
// Local-bearing and match-pattern inputs use the complete shared census.
// Inputs without either retain their original selectors and full source guards.
export function simpleBase64LocalBindings(rows,parameters){
 return censusLocalAliasBindings(rows,parameters.keys(),{unicode:false,protectedNames:['base64','String','Vec','str','u8','std','core','translation_core','Str','Text']});
}

import {censusLocalAliasBindings} from './local-alias-binding-source.mjs';
