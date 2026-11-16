// Reusable bounded language source DATA. Qualified syntax is no name/type proof.
const ident=row=>row?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(row.text);
export function readQualifiedSourceCallTokens(rows){
 if(!Array.isArray(rows)||rows.length<4||rows.length>128)return null;let at=0;const path=[];
 for(;;){if(!ident(rows[at])||path.length>=8)return null;path.push(rows[at++].text);if(rows[at]?.text!=='::')break;at++;}
 if(path.length<2||rows[at]?.text!=='('||rows.at(-1)?.text!==')')return null;const args=[],groups=[],open=at,start=at+1;let from=start;
 for(at=start;at<rows.length-1;at++){const word=rows[at].text;if(['(','[','{'].includes(word)){if(groups.length>=16)return null;groups.push({'(':')','[':']','{':'}'}[word]);}else if([')',']','}'].includes(word)){if(groups.pop()!==word)return null;}else if(word===','&&!groups.length){if(at===from)return null;args.push(rows.slice(from,at));if(args.length>16)return null;from=at+1;}}
 if(groups.length)return null;if(from<at)args.push(rows.slice(from,at));else if(from!==start)return null;if(args.length>16)return null;return {path,args,open,sourceAuthority:false,semanticAuthority:false};
}

// A complete lexical group only, not a type or borrow permission.
export function readParenthesizedSourceOperandTokens(rows){
 if(!Array.isArray(rows)||rows.length<3||rows.length>128||rows[0]?.text!=='('||rows.at(-1)?.text!==')')return null;const groups=[];
 for(let at=0;at<rows.length;at++){const word=rows[at].text;if(['(','[','{'].includes(word)){if(groups.length>=16)return null;groups.push({'(':')','[':']','{':'}'}[word]);}else if([')',']','}'].includes(word)){if(groups.pop()!==word||!groups.length&&at!==rows.length-1)return null;}}
 return groups.length?null:rows.slice(1,-1);
}
