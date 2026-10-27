// Closed written constructor syntax DATA only. Whole original owner/type/
// trait and drop checks remain separate; these fields issue no permission.
export function readTextConstructorSourcePrefix(tokens,start,close){
 const prefixes=[['String'],['std','::','string','::','String'],['::','std','::','string','::','String']];
 for(const prefix of prefixes){
  if(!prefix.every((word,index)=>tokens[start+index]?.text===word))continue;const ownerEnd=start+prefix.length,method=tokens[ownerEnd+1]?.text,open=ownerEnd+2;
  if(tokens[ownerEnd]?.text!=='::'||!['new','from'].includes(method)||tokens[open]?.text!=='(')continue;const end=close(tokens,open);if(end<open||end-open>128)return null;
  if(method==='new'&&end!==open+1)return null;return {method,open,end,sourceBindingProved:false,traitOwnerProved:false,semanticAuthority:false,executableAdmission:false};
 }return null;
}
