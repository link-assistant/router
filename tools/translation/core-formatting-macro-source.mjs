// Canonical existing core format! source result candidate only. Its complete
// source/native binding and every real argument still require independent checks.
import {readQualifiedSourceMacroTokens} from './qualified-source-call-tokens.mjs';
export function readCoreFormattingMacroSource(rows){
 rows=Array.isArray(rows)?splitRustMacroBangSourceTokens(rows):rows;
 if(!Array.isArray(rows)||rows.length<8||rows.length>256||rows[0]?.text!=='crate'||rows[1]?.text!=='::'||rows[2]?.text!=='translation_core'||rows[3]?.text!=='::'||rows[4]?.text!=='format'||rows[5]?.text!=='!')return null;
 const macro=readQualifiedSourceMacroTokens(rows);if(!macro||macro.path.length!==3||macro.path[0]!=='crate'||macro.path[1]!=='translation_core'||macro.path[2]!=='format'||macro.body[0]?.type!=='string'||!/^(?:"|r#{0,255}")/u.test(macro.body[0].text)||macro.body.length>1&&macro.body[1].text!==',')return null;
 return {kind:'payload',domain:'text-owned',binding:null,bridge:'complete-canonical-format-macro-source',macro,macroOwnerProved:false,formatArgumentsChecked:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}

// Return original bang-token positions only. Arguments remain in every source
// scan; no parser/owner/macro-expansion or type permission is issued.
export function coreFormattingMacroSourceHeaders(rows){
 rows=Array.isArray(rows)?splitRustMacroBangSourceTokens(rows):rows;
 const found=new Set();if(!Array.isArray(rows)||rows.length>200000)return found;let work=0;
 for(let at=0;at<rows.length;at++){
  if(++work>200000)return new Set();if(rows[at]?.text!=='crate'||['.','::'].includes(rows[at-1]?.text)||rows[at+1]?.text!=='::'||rows[at+2]?.text!=='translation_core'||rows[at+3]?.text!=='::'||rows[at+4]?.text!=='format'||rows[at+5]?.text!=='!'||rows[at+6]?.text!=='(')continue;
  const stack=[];let end=at+6;for(;end<rows.length&&end-at<256;end++){if(++work>200000)return new Set();const word=rows[end].text;if(['(','[','{'].includes(word)){if(stack.length>=16)break;stack.push({'(':')','[':']','{':'}'}[word]);}else if([')',']','}'].includes(word)){if(stack.pop()!==word)break;if(!stack.length){const candidate=readCoreFormattingMacroSource(rows.slice(at,end+1));if(candidate)found.add(rows[at+5].start);break;}}}
 }return found;
}

import {splitRustMacroBangSourceTokens} from './rust-macro-token-source.mjs';
