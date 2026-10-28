// Reusable lexical cast type-position selection DATA. No source/type authority.
// Callers must independently close the complete original body and namespace.
export function bareSourceCastTypeLeaves(rows,names){
 if(!Array.isArray(rows)||rows.length>200000||!Array.isArray(names)||names.length>64||names.some(name=>typeof name!=='string'))throw new TypeError('bounded cast source token/name inputs required');const selected=[],wanted=new Set(names);
 for(let at=0;at+1<rows.length;at++){
  if(rows[at].text!=='as')continue;const token=rows[at+1];if(token?.type!=='ident'||!wanted.has(token.text)||['::','<'].includes(rows[at+2]?.text))continue;
  selected.push({token,index:at+1,cast:rows[at],sourceAuthority:false,semanticAuthority:false});
 }
 return selected;
}
