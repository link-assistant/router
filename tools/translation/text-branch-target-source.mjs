// Expected source expression positions only. No inferred type/Into authority.
// Walk only complete expression blocks and if/else roots; never closure bodies.
export function createTextBranchTargetSource(tokens,{close}){
 const targets=new Map();let work=0;const tick=depth=>{if(++work>200000||depth>64)throw new TypeError('Complete owning text branch source bound');};
 function tail(open,end,depth,context){
  tick(depth);if(tokens[open]?.text!=='{'||close(tokens,open)!==end)return false;let start=open+1;
  for(let at=start;at<end;at++){tick(depth);if(['(','[','{'].includes(tokens[at].text)){const last=close(tokens,at);if(last<at||last>=end)return false;at=last;}else if(tokens[at].text===';')start=at+1;}
  if(start<end)expression(start,end,depth+1,context);return true;
 }
 function expression(start,end,depth,context){
  tick(depth);if(start>=end||!isTextTargetSourceContext(context))return false;const first=tokens[start]?.text;
  if(first==='{'&&close(tokens,start)===end-1)return tail(start,end-1,depth+1,context);
  if(first==='('&&close(tokens,start)===end-1)return expression(start+1,end-1,depth+1,context);
  if(first==='match'){const match=readClosedMatchArmSourceBounds(tokens,start,end,{close});if(!match)return false;work+=match.visited;tick(depth);for(const arm of match.arms)expression(arm.expressionStart,arm.expressionEnd,depth+1,context);return true;}
  if(first==='if'){
   let open=start+1;for(;open<end&&tokens[open].text!=='{';open++){tick(depth);if(['(','['].includes(tokens[open].text)){const last=close(tokens,open);if(last<open||last>=end)return false;open=last;}}
   const last=close(tokens,open);if(last<open||tokens[last+1]?.text!=='else')return false;const alternative=last+2;
   if(tokens[alternative]?.text==='{'){if(close(tokens,alternative)!==end-1)return false;tail(open,last,depth+1,context);tail(alternative,end-1,depth+1,context);return true;}
   if(tokens[alternative]?.text==='if'){if(!expression(alternative,end,depth+1,context))return false;tail(open,last,depth+1,context);return true;}return false;
  }
  if(['|','||','move','async','return','let','fn'].includes(first))return false;
  if(context!=='text-owned'){const payload=readCarrierTextConstructorTargetSource(tokens,start,end,context,{close});if(payload)expression(payload.start,payload.end,depth+1,'text-owned');return true;}
  targets.set(tokens[start].start,end);return true;
 }
 return {block(open,end,context='text-owned'){tail(open,end,0,context);},expression(start,end,context='text-owned'){expression(start,end,0,context);},matches(start,end){return targets.get(start)===end;},sourceCells(){return work;}};
}

import {readClosedMatchArmSourceBounds} from './match-arm-source.mjs';

import {isTextTargetSourceContext,readCarrierTextConstructorTargetSource} from './carrier-text-target-source.mjs';
