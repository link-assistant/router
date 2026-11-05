// Syntax DATA only. The original resolver still issues every namespace scope.
import {originalEnumNamespaceSourcePlan,requireOriginalEnumNamespaceSourcePlan} from './derive-ancestor-attribute-scope.mjs';
export {originalEnumNamespaceSourcePlan} from './derive-ancestor-attribute-scope.mjs';
const fail=message=>{throw new TypeError('Original enum namespace header: '+message);};
export function enumNamespaceBody(tokens,keyword,sourcePlan=null){
 if(!Array.isArray(tokens)||tokens.length>200000||!Number.isSafeInteger(keyword)||keyword<0||tokens[keyword]?.text!=='enum'||tokens[keyword+1]?.type!=='ident')fail('complete original named enum token selection required');
 const plan=requireOriginalEnumNamespaceSourcePlan(sourcePlan??originalEnumNamespaceSourcePlan());let at=keyword+2,cells=0;
 const tick=()=>{if(++cells>100000)fail('header source budget exceeded');};
 // A macro, attribute, block/default expression or item delimiter in a header
 // can require expansion or a different source partition. Keep it unresolved.
 const forbidden=new Set(['!','#','{','}',';','=>','...']);
 function sequence(until,{angles=false}={}){
  const stack=[],pairs={'(':')','[':']'},start=at;let depth=angles?1:0;
  for(;at<tokens.length;at++){
   tick();const text=tokens[at].text;
   if(!angles&&!stack.length&&depth===0&&until.includes(text))return;
   if(forbidden.has(text))fail('expanded or block-valued header needs an independent source rule');
   if(pairs[text]){stack.push(pairs[text]);if(stack.length>64)fail('header delimiter depth exceeded');continue;}
   if([')',']'].includes(text)){if(stack.pop()!==text)fail('header delimiter differs');continue;}
   if(!stack.length){if(text==='<'){depth++;if(depth>64)fail('generic header depth exceeded');}else if(text==='>')depth--;else if(text==='>>')depth-=2;if(depth<0)fail('generic header angle differs');if(angles&&depth===0)return;}
   if(tokens[at].type==='string'||tokens[at].type==='comment')fail('header requires significant macro-free type syntax');
  }
  fail('complete enum header terminator is missing at '+start+(angles?' in generics':''));
 }
 if(tokens[at]?.text==='<'){
  at++;const start=at;sequence(['>'],{angles:true});if(at===start)fail('empty generic parameter list');at++;
 }
 if(tokens[at]?.text==='where'){at++;const start=at;sequence(['{']);if(at===start)fail('empty where predicate list');}
 if(tokens[at]?.text!=='{')fail('actual complete enum body required');
 requireOriginalEnumNamespaceSourcePlan(plan);return at;
}
