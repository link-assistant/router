// Complete local const declaration syntax DATA. No source/type/owner authority.
const fail=message=>{throw new TypeError('Local constant type source: '+message);};
function close(rows,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<rows.length;at++){const word=rows[at].text;if(pairs[word]){if(stack.length>=64)fail('delimiter depth bound');stack.push(pairs[word]);}else if([')',']','}'].includes(word)){if(stack.pop()!==word)fail('delimiter mismatch');if(!stack.length)return at;}}return fail('complete delimiter required');}
export function localSourceConstantDeclarations(rows){
 if(!Array.isArray(rows)||rows.length>200000)fail('bounded complete body tokens required');const entries=[];
 for(let at=0;at<rows.length;at++){
  if(rows[at].text!=='const')continue;const start=at,name=rows[at+1];if(name?.type!=='ident'||!/^[_\p{ID_Start}][\p{ID_Continue}_]*$/u.test(name.text)||['self','Self','mut','ref'].includes(name.text)||rows[at+2]?.text!==':')fail('complete named or anonymous nongeneric constant required');let end=at+3,angle=0;
  for(;end<rows.length;end++){const word=rows[end].text;if(['(','[','{'].includes(word)){end=close(rows,end);continue;}if(word==='<')angle++;else if(word==='>')angle--;else if(word==='>>')angle-=2;if(angle<0||angle>64)fail('type argument delimiter bound');if(!angle&&word==='=')break;if(!angle&&[';','else'].includes(word))fail('complete type initializer required');}
  if(rows[end]?.text!=='='||end===at+3||angle)fail('initialized original type required');const typeRows=rows.slice(at+3,end);let finish=end+1;
  for(;finish<rows.length;finish++){const word=rows[finish].text;if(['(','[','{'].includes(word)){finish=close(rows,finish);continue;}if(word===';')break;}
  if(rows[finish]?.text!==';'||finish===end+1)fail('complete nonempty initializer and terminator required');if(entries.length>=4096)fail('declaration count bound');entries.push({name:name.text,keyword:rows[start],typeRows,startIndex:start,endIndex:finish,span:[rows[start].start,rows[finish].end],sourceAuthority:false,semanticAuthority:false});at=finish;
 }
 return entries;
}
