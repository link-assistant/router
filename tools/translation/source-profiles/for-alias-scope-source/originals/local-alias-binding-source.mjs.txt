// Complete original bounded alias census copy; never type/owner authority.
export function censusLocalAliasBindings(rows,parameters,{protectedNames=[],unicode=true}={}){
 if(!rows.some(row=>row.text==='let'))return {reason:null,count:0};if(rows.length>200000)return {reason:'complete local-binding token bound'};
 if(rows.some(row=>['match','for'].includes(row.text)))return {reason:'local-bearing pattern scope needs a separate source rule'};
 const names=new Set(parameters),protectedBindings=new Set(protectedNames);let count=0;
 for(let at=0;at<rows.length;at++)if(rows[at].text==='let'){
  const declaration=localAliasDeclaration(rows,at),name=declaration?.name;if(!declaration||!unicode&&!/^[A-Za-z_][A-Za-z_0-9]*$/u.test(name))return {reason:'one ordinary local identifier required'};
  if(names.has(name)||protectedBindings.has(name))return {reason:'local can shadow a concrete parameter or namespace'};if(++count>4096)return {reason:'complete local binding count bound'};names.add(name);
 }
 return {reason:null,count};
}

// Lexical source DATA only. Mutable declarations are never inferred aliases.
export function localAliasDeclaration(rows,at){
 if(rows[at]?.text!=='let')return null;const mutable=rows[at+1]?.text==='mut',index=at+(mutable?2:1),token=rows[index],next=rows[index+1];if(token?.type!=='ident'||!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text)||['mut','ref','self','Self','_'].includes(token.text)||!['=',':'].includes(next?.text))return null;return {name:token.text,token,mutable,next:index+1,initializerStart:next.text==='='?index+2:null};
}
