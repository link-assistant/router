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

// Consume one complete qualified call from a larger expression. Delimiter and
// call grammar retain the exact complete-call reader's original closed limits.
export function readQualifiedSourceCallPrefixTokens(rows,start=0){
 if(!Array.isArray(rows)||!Number.isSafeInteger(start)||start<0||start>=rows.length||!ident(rows[start]))return null;let at=start,segments=0;
 for(;;){if(!ident(rows[at])||++segments>8)return null;at++;if(rows[at]?.text!=='::')break;at++;}
 if(segments<2||rows[at]?.text!=='(')return null;const groups=[],pairs={'(':')','[':']','{':'}'};
 for(;at<rows.length&&at-start<128;at++){
  const word=rows[at].text;if(pairs[word]){if(groups.length>=17)return null;groups.push(pairs[word]);}else if([')',']','}'].includes(word)){if(groups.pop()!==word)return null;if(!groups.length){const end=at+1,tokens=rows.slice(start,end),call=readQualifiedSourceCallTokens(tokens);return call?{start,end,tokens,call,sourceAuthority:false,semanticAuthority:false}:null;}}
 }return null;
}

// Generic complete qualified macro token-tree syntax only. Macro argument
// grammar, hygiene, owner and return type are separate actual checker duties.
export function readQualifiedSourceMacroTokens(rows){
 if(!Array.isArray(rows)||rows.length<6||rows.length>256)return null;let at=0;const path=[];
 for(;;){if(!ident(rows[at])||path.length>=8)return null;path.push(rows[at++].text);if(rows[at]?.text!=='::')break;at++;}
 const pairs={'(':')','[':']','{':'}'};if(path.length<2||rows[at++]?.text!=='!'||!pairs[rows[at]?.text])return null;const open=at,delimiter=rows[at].text,groups=[];
 for(;at<rows.length;at++){
  const word=rows[at].text;if(pairs[word]){if(groups.length>=16)return null;groups.push(pairs[word]);}else if([')',']','}'].includes(word)){if(groups.pop()!==word)return null;if(!groups.length){if(at!==rows.length-1)return null;return {path,delimiter,open,body:rows.slice(open+1,at),macroOwnerProved:false,macroArgumentsChecked:false,sourceAuthority:false,semanticAuthority:false};}}
 }return null;
}
