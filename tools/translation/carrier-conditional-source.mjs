// Complete conditional expression source DATA. Both branches remain original.
import {readPrimitiveLocalBooleanSource} from './primitive-local-boolean-source.mjs';
export function readCarrierConditionalSource(rows,scope,wanted,{readExpression,readBranch=null}={}){
 if(!Array.isArray(rows)||rows.length<7||rows.length>256||rows[0]?.text!=='if'||typeof readExpression!=='function'||readBranch!==null&&typeof readBranch!=='function')return null;let work=0;const tick=()=>++work<=2048,pairs={'(':')','[':']','{':'}'};
 function close(at){const stack=[];for(let index=at;index<rows.length;index++){if(!tick())return -1;const word=rows[index].text;if(pairs[word]){if(stack.length>=64)return -1;stack.push(pairs[word]);}else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return index;}}return -1;}
 let open=-1;for(let at=1;at<rows.length;at++){
  if(!tick())return null;const word=rows[at].text;if(word==='{'){open=at;break;}if(word==='('||word==='['){const last=close(at);if(last<0)return null;at=last;}else if(['}',';',')',']','let'].includes(word))return null;
 }
 if(open<2)return null;const thenEnd=close(open);if(thenEnd<0||rows[thenEnd+1]?.text!=='else')return null;const next=thenEnd+2;let right;
 if(rows[next]?.text==='{'){const end=close(next);if(end!==rows.length-1)return null;right=rows.slice(next+1,end);}else if(rows[next]?.text==='if')right=rows.slice(next);else return null;
 const condition=readPrimitiveLocalBooleanSource(rows.slice(1,open),scope);if(!condition)return null;
 function tail(part){if(!part.length)return null;const stack=[];for(const row of part){if(!tick())return null;const word=row.text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return null;}else if(!stack.length&&[';','return','let'].includes(word))return null;}return stack.length?null:part;}
 const lhs=readBranch?rows.slice(open+1,thenEnd):tail(rows.slice(open+1,thenEnd)),rhs=readBranch?right:tail(right);if(!lhs||!rhs)return null;
 const same=(left,right)=>!!left&&!!right&&['payload','option','result'].includes(left.kind)&&typeof left.domain==='string'&&left.domain.length>0&&left.domain.length<=32&&left.kind===right.kind&&left.domain===right.domain;const branch=readBranch??readExpression;let left=branch(lhs,wanted),rightRole=branch(rhs,wanted??left);if(!left&&rightRole)left=branch(lhs,wanted??rightRole);if(!same(left,rightRole)||wanted&&!same(wanted,left))return null;
 return {kind:left.kind,domain:left.domain,binding:null,bridge:'complete-matching-conditional-source',conditionUnevaluated:true,branchesUnevaluated:true,sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
