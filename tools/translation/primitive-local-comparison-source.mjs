// Native integer relation source DATA. Numeric operands remain unevaluated.
import {readPrimitiveLocalExpression} from './primitive-local-expression-source.mjs';
export function readPrimitiveLocalComparisonSource(rows,bindings,{readAtom}={}){
 if(!Array.isArray(rows)||rows.length<3||rows.length>256||typeof readAtom!=='function')return null;const groups=[],pairs={'(':')','[':']','{':'}'},relations=new Set(['==','!=','<','<=','>','>=']);let comparison=-1;
 for(let at=0;at<rows.length;at++){
  const row=rows[at],word=row.text;if(row.type!=='punct')continue;
  if(pairs[word]){if(groups.length>=64)return null;groups.push(pairs[word]);}
  else if([')',']','}'].includes(word)){if(groups.pop()!==word)return null;}
  else if(!groups.length&&relations.has(word)){if(comparison!==-1)return null;comparison=at;}
 }
 if(groups.length||comparison<=0||comparison===rows.length-1)return null;const lhs=rows.slice(0,comparison),rhs=rows.slice(comparison+1);let left=readPrimitiveLocalExpression(lhs,bindings,{readAtom}),right=readPrimitiveLocalExpression(rhs,bindings,{readAtom,declared:left?.kind??null});if(!left&&right)left=readPrimitiveLocalExpression(lhs,bindings,{readAtom,declared:right.kind});if(!left||!right||left.kind!==right.kind)return null;
 return {kind:'bool',binding:null,numericDomain:left.kind,operator:rows[comparison].text,bridge:'complete-native-primitive-comparison-source',sourceAuthority:false,semanticAuthority:false,executableAdmission:false};
}
