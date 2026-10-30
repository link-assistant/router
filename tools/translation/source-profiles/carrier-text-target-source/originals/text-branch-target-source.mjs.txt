// Expected source expression positions only. No inferred type/Into authority.
// Walk only complete expression blocks and if/else roots; never closure bodies.
export function createTextBranchTargetSource(tokens,{close}){
 const targets=new Map();let work=0;const tick=depth=>{if(++work>200000||depth>64)throw new TypeError('Complete owning text branch source bound');};
 function tail(open,end,depth){
  tick(depth);if(tokens[open]?.text!=='{'||close(tokens,open)!==end)return;let start=open+1;
  for(let at=start;at<end;at++){tick(depth);if(['(','[','{'].includes(tokens[at].text)){const last=close(tokens,at);if(last<at||last>=end)return;at=last;}else if(tokens[at].text===';')start=at+1;}
  if(start<end)expression(start,end,depth+1);
 }
 function expression(start,end,depth){
  tick(depth);if(start>=end)return;const first=tokens[start]?.text;
  if(first==='{'&&close(tokens,start)===end-1){tail(start,end-1,depth+1);return;}
  if(first==='('&&close(tokens,start)===end-1){expression(start+1,end-1,depth+1);return;}
  if(first==='match'){const match=readClosedMatchArmSourceBounds(tokens,start,end,{close});if(!match)return;work+=match.visited;tick(depth);for(const arm of match.arms)expression(arm.expressionStart,arm.expressionEnd,depth+1);return;}
  if(first==='if'){
   let open=start+1;for(;open<end&&tokens[open].text!=='{';open++){tick(depth);if(['(','['].includes(tokens[open].text)){const last=close(tokens,open);if(last<open||last>=end)return;open=last;}}
   const last=close(tokens,open);if(last<open||tokens[last+1]?.text!=='else')return;const alternative=last+2;
   if(tokens[alternative]?.text==='{'){if(close(tokens,alternative)!==end-1)return;tail(open,last,depth+1);tail(alternative,end-1,depth+1);return;}
   if(tokens[alternative]?.text==='if'){// Record only after the complete else-if root is checked.
    const pending=new Map(targets);expression(alternative,end,depth+1);if(targets.size===pending.size)return;tail(open,last,depth+1);return;
   }return;
  }
  // Source candidates must consume their exact whole expected expression.
  // An opaque producer/macro/closure never gains context through this record.
  if(['|','||','move','async','return','let','fn'].includes(first))return;
  targets.set(tokens[start].start,end);
 }
 return {block(open,end){tail(open,end,0);},expression(start,end){expression(start,end,0);},matches(start,end){return targets.get(start)===end;}};
}

import {readClosedMatchArmSourceBounds} from './match-arm-source.mjs';
