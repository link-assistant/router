// Closed complete append statement source positions only. Actual String
// Add/AddAssign traits, ownership, loan/drop/effect equivalence are unproved.
export function readTextBuilderAppendStatementSource(tokens,start,{builder,close}){
 if(!Array.isArray(tokens)||tokens.length>200000||!Number.isSafeInteger(start)||start<1||start>=tokens.length||typeof builder!=='string'||tokens[start]?.type!=='ident'||tokens[start].text!==builder||!['{','}',';'].includes(tokens[start-1]?.text))return null;
 let rhsStart,operation;if(tokens[start+1]?.text==='+='){rhsStart=start+2;operation='builder:add-assign';}else if(tokens[start+1]?.text==='='&&tokens[start+2]?.type==='ident'&&tokens[start+2].text===builder&&tokens[start+3]?.text==='+'){rhsStart=start+4;operation='builder:assign-add';}else return null;let end=rhsStart,visited=0;
 for(;end<tokens.length;end++){
  if(++visited>200000)throw new RangeError('Complete String append statement source-cell bound');const word=tokens[end].text;if(word===';')break;
  if(['(','[','{'].includes(word)){const last=close(tokens,end);if(last<end||last>=tokens.length)return null;visited+=last-end;if(visited>200000)throw new RangeError('Complete String append statement source-cell bound');end=last;}else if([')',']','}'].includes(word))return null;
 }
 return end>rhsStart&&tokens[end]?.text===';'?{schema:'text-builder-append-statement-source-v1',rhsStart,rhsEnd:end,end,visited,operation,actualStringProved:false,originalOperatorOwnerProved:false,originalLoanDropEffectsProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}
