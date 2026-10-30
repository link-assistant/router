// Per-function loop scope DATA checks only. No helper, scope spelling, symbol
// token or frame issues executable IR; complete original caller reissue remains
// mandatory. No state survives its function's source checking operation.
import {ownedPrimitiveVectorElement} from '../primitive-owned-vector-call-shape.mjs';
export function createOwnedPrimitiveVectorLoopState(fail){
 const frames=[];
 const verify=(frame,scope)=>{for(const row of frame){const value=scope.get(row.name);if(!value||value.symbol!==row.symbol||value.type!==row.type||value.mutable!==row.mutable||value.moved)fail('outer owned vector must retain its actual available binding at every loop condition, backedge, break and continue');}};
 return Object.freeze({
  run(scope,work,selected=()=>scope){if(frames.length>=32)fail('bounded owned vector source loop nesting');const frame=[...scope].flatMap(([name,value])=>ownedPrimitiveVectorElement(value.type)&&!value.moved?[{name,symbol:value.symbol,type:value.type,mutable:value.mutable}]:[]);frames.push(frame);try{const result=work();verify(frame,selected(result));return result;}finally{frames.pop();}},
  boundary(scope){const frame=frames.at(-1);if(frame)verify(frame,scope);},
 });
}
