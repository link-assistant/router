// Complete return operand source positions only. The caller must establish
// its own function/closure boundary and actual expected return type separately.
export function readReturnSourceOperandBounds(tokens,start,limit,{close}){
 if(!Array.isArray(tokens)||!Number.isSafeInteger(start)||!Number.isSafeInteger(limit)||start<0||limit>tokens.length||limit<=start||limit-start>200000||tokens[start]?.text!=='return')return null;let cursor=start+1,visited=0;
 for(;cursor<limit;cursor++){
  if(++visited>200000)throw new RangeError('Complete return operand source-cell bound');const word=tokens[cursor].text;
  if([';',',','}'].includes(word))break;
  if(['(','[','{'].includes(word)){const end=close(tokens,cursor);if(end<cursor||end>=limit)return null;visited+=end-cursor;if(visited>200000)throw new RangeError('Complete return operand source-cell bound');cursor=end;}
  else if([')',']'].includes(word))return null;
 }
 return cursor>start+1?{schema:'return-source-operand-bounds-v1',start:start+1,end:cursor,visited,sourceBindingProved:false,expectedTypeProved:false,enclosingFunctionProved:false,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}
