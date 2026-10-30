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

// Native Formal AI Rust tokens attach the macro bang to an identifier. Split
// only this source-candidate view, retaining exact original UTF-16 coordinates.
export function splitRustMacroBangSourceTokens(rows,source=null){
 if(!Array.isArray(rows)||source!==null&&(typeof source!=='string'||source.length>2000000))throw new TypeError('Bounded original Rust macro token/source view required');if(rows.length>200000)return rows;let output=null;
 for(let index=0;index<rows.length;index++){
  const token=rows[index];if(token.type!=='ident'||typeof token.text!=='string'||!/^[_\p{ID_Start}][_\p{ID_Continue}]*!$/u.test(token.text)){if(output)output.push(token);continue;}
  if(!Number.isSafeInteger(token.start)||!Number.isSafeInteger(token.end)||token.start<0||token.end-token.start!==token.text.length||source!==null&&(token.end>source.length||source.slice(token.start,token.end)!==token.text))throw new TypeError('Exact original Rust macro identifier/bang span required');
  if(!output)output=rows.slice(0,index);output.push({...token,text:token.text.slice(0,-1),end:token.end-1},{type:'punct',text:'!',start:token.end-1,end:token.end});
 }return output??rows;
}
