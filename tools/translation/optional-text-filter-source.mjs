// Closed optional text predicate source DATA. No callback/type/owner permission.
export function readOptionalTextFilterSource(rows){
 if(!Array.isArray(rows)||rows.length>18||rows[0]?.text!=='|'||rows[1]?.type!=='ident'||rows[1].text==='_'||rows[2]?.text!=='|')return null;let tail=rows.slice(3);if(tail[0]?.text==='{'&&tail.at(-1)?.text==='}')tail=tail.slice(1,-1);if(tail[0]?.text!=='!'||tail[1]?.text!==rows[1].text)return null;const text=tail.slice(2).map(row=>row.text).join('');return text==='.is_empty()'?{trimWhitespace:false,sourceAuthority:false,semanticAuthority:false}:text==='.trim().is_empty()'?{trimWhitespace:true,sourceAuthority:false,semanticAuthority:false}:null;
}
