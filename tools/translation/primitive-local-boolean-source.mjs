// Closed boolean source composition. No operand is executed or coerced.
import {readCoreCarrierCallSource} from './core-carrier-call-source.mjs';
import {readPrimitiveLocalComparisonSource} from './primitive-local-comparison-source.mjs';
import {readPrimitiveAliasOperand} from './primitive-local-argument-source.mjs';
export function readPrimitiveLocalBooleanSource(rows,scope){
 if(!Array.isArray(rows)||!rows.length||rows.length>256)return null;let work=0;const tick=()=>++work<=4096,pairs={'(':')','[':']','{':'}'},primitive={get(name){const role=scope.get(name);if(!role)return undefined;if(role.kind==='payload')return role.domain;if(role.kind==='json')return 'json-reference';return role.kind+':'+role.domain;}};
 function selected(start,end,depth){
  if(!tick()||depth>64||start>=end)return false;const groups=[],or=[],and=[];let outerEnd=-1;
  for(let at=start;at<end;at++){
   if(!tick())return false;const row=rows[at],word=row.text;if(row.type!=='punct')continue;
   if(pairs[word]){if(groups.length>=64)return false;groups.push(pairs[word]);}
   else if([')',']','}'].includes(word)){if(groups.pop()!==word)return false;if(!groups.length&&outerEnd<0)outerEnd=at;}
   else if(!groups.length&&word==='||')or.push(at);
   else if(!groups.length&&word==='&&')and.push(at);
  }
  if(groups.length)return false;const operators=or.length?or:and;
  if(operators.length){let from=start;for(const at of operators){if(!selected(from,at,depth+1))return false;from=at+1;}return selected(from,end,depth+1);}
  if(rows[start].text==='!')return selected(start+1,end,depth+1);
  if(rows[start].text==='('&&outerEnd===end-1)return selected(start+1,end-1,depth+1);
  const part=rows.slice(start,end);
  if(part.length===1){if(['true','false'].includes(part[0].text))return true;const role=scope.get(part[0].text);return role?.kind==='payload'&&role.domain==='bool';}
  const core=readCoreCarrierCallSource(part,scope);if(core?.kind==='payload'&&core.domain==='bool')return true;
  return readPrimitiveLocalComparisonSource(part,primitive,{readAtom:readPrimitiveAliasOperand})!==null||readScalarEqualitySource(part,scope)!==null;
 }
 return selected(0,rows.length,0)?{kind:'payload',domain:'bool',binding:rows.length===1&&scope.get(rows[0].text)?.kind==='payload'&&scope.get(rows[0].text).domain==='bool'?rows[0].text:null,bridge:'complete-native-boolean-expression-source',operandsUnevaluated:true,shortCircuitSourceRetained:true,sourceAuthority:false,semanticAuthority:false,executableAdmission:false}:null;
}

import {readScalarEqualitySource} from './scalar-equality-source.mjs';
