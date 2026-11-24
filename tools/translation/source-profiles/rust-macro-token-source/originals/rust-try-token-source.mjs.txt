// Scoped Rust substitution-candidate DATA, never the authoritative CST.
// Keep the shared lexer and every original token/source byte unchanged.
export function splitRustTryDotSourceTokens(rows,source){
 if(!Array.isArray(rows)||typeof source!=='string'||source.length>2000000)throw new TypeError('Complete bounded original Rust token/source view required');
 // Existing callers preserve/refuse oversized functions using their old guard.
 // Splitting can produce at most twice the original bounded token count.
 if(rows.length>200000)return rows;let output=null;
 for(let index=0;index<rows.length;index++){
  const token=rows[index];if(token.text!=='?.'){if(output)output.push(token);continue;}
  if(token.type!=='punct'||!Number.isSafeInteger(token.start)||!Number.isSafeInteger(token.end)||token.start<0||token.end!==token.start+2||token.end>source.length||source.slice(token.start,token.end)!=='?.')throw new TypeError('Exact original Rust Try/dot punctuation span required');
  if(!output)output=rows.slice(0,index);output.push({...token,text:'?',end:token.start+1},{...token,text:'.',start:token.start+1});
 }
 return output??rows;
}
